"use client";

// ============================================================
//  SONDERREGELN JE LIGA — Schritt 3 des Oberflächen-Umbaus
//  (Andis Konzept vom 07.08.2026, Spec: design/spielauswahl-je-liga.md)
//
//  Unter den Mannschaften einer Liga sitzt ein Knopf, der dieses Unterfenster
//  öffnet. Was hier eingestellt wird, gilt NUR für diese Liga und landet als
//  Abweichung in `rules.spiele.jeWettbewerb[key]`.
//
//  🔴 Die eine Regel, die dieses Fenster nicht brechen darf: gemischt wird in
//  `auswahlFuer` (spielauswahl.js), nicht hier. Diese Datei schreibt nur die
//  Abweichung — welche Spiele daraus folgen, beantwortet weiterhin
//  `passtSpiel`. Sonst gäbe es zwei Wahrheiten darüber, welche Spiele zur
//  Runde gehören, und genau davor warnt die Runden-Schicht in CLAUDE.md.
//
//  ── Warum die Derbys nicht aus einer Vereinsliste kommen ──
//  Jedes erzeugte Spiel trägt sein Derby-Label schon im Snapshot
//  (`snapshot.derby`, gesetzt in `ligaGenerator.js` aus den gepflegten
//  DERBYS-Listen). Die Empfehlung liest also den Katalog statt eine zweite
//  Paarungsliste zu führen, die auseinanderlaufen könnte.
//
//  ── Warum „Abstiegskampf" zwei Felder setzt ──
//  Plätze 14–18 allein wären die ganze Saison über eine Zone. Andi hat es als
//  ENDSPURT beschrieben: letzte Spieltage UND unteres Tabellendrittel. Beides
//  bleibt einzeln verstellbar (Baukasten-Grundsatz: Regler und Zahlenfeld,
//  nie nur der Knopf).
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { getStore } from "@/lib/store";
import { AUSWAHL_LIMITS, TEAM_MODI } from "@/lib/spielauswahl";
import { TAPZIEL } from "@/lib/tapziel";
import Feinheiten from "@/components/Feinheiten";
import { WETTBEWERB_LIMITS, sanitizeWettbewerbe, anteile } from "@/lib/wettbewerbGewicht";
import { teamFaktor, naechsteStufe } from "@/lib/teamGewicht";
import { vereineVon } from "@/lib/ligen";
import { fmtFaktorOderAus } from "@/lib/format";

// Unsere Voreinstellung für den Abstiegskampf. Keine Balance-Aussage — eine
// Bequemlichkeit: die Zahlen sind sofort verstellbar.
export const ABSTIEGSKAMPF = { von: 14, bis: 18, abSpieltag: 30 };

// 🔴 MEHRERE Zonen seit 21.08.2026. Andi: „noch mehrere Zwischenintervalle,
// sodass halt auch Platz 14–18 und noch 1–4 betippt werden kann … bisher nur
// Abstiegskampf möglich."
//
// Das Datenmodell konnte das die ganze Zeit — `zonen` ist eine LISTE (siehe
// spielauswahl.js) — nur die Oberfläche schrieb ausschließlich `zonen[0]`.
// Ein Spiel zählt, sobald EINE Seite in EINER der Zonen steht.
//
// ⚠️ Die Vorlagen sind Bequemlichkeit, keine Balance-Aussage: jede Zahl bleibt
// danach frei verstellbar (Baukasten-Grundsatz: Knopf UND Zahlenfeld).
export const ZONEN_VORLAGEN = [
  { key: "spitze", label: "Spitze", unter: "Meisterschaft und Europa", von: 1, bis: 4 },
  { key: "europa", label: "Europapokal-Ränge", unter: "erweitertes oberes Drittel", von: 1, bis: 7 },
  { key: "mittelfeld", label: "Mittelfeld", unter: "wo es um nichts mehr geht", von: 8, bis: 13 },
  { key: "abstieg", label: "Abstiegskampf", unter: "unteres Tabellendrittel", von: 14, bis: 18 },
];

export default function LigaSonderregeln({
  wettbewerb, label, spiele, onChange,
  // 🔴 MOD5 (Andi): „Ligen und Mannschaften einzeln höher gewichten" — die
  // Mechanik gab es längst (`wettbewerbe.aufschlaege`), sie lag nur in einem
  // eigenen Abschnitt weit unten. Sein Punkt war die STELLE: wer gerade die
  // Bundesliga aufhat, will ihr Gewicht hier setzen, nicht drei Bildschirme
  // weiter.
  //
  // ⚠️ Beide Zugänge schreiben DASSELBE Feld — `rules.wettbewerbe.aufschlaege`.
  // Es gibt keine Kopie und keinen zweiten Regler; `WettbewerbGewichte` bleibt
  // als Gesamtübersicht bestehen, weil erst dort die Anteile ALLER Wettbewerbe
  // nebeneinander stehen. Fehlt `onAufschlag`, verschwindet der Block einfach.
  rules = null, onAufschlag = null,
  // Der zweite Halbsatz von MOD5: einzelne VEREINE dieser Liga gewichten.
  // ⚠️ Wieder dasselbe Feld wie im Modifikatoren-Sondermenü
  // (`rules.teamMods.teams`) und dieselbe Stufenleiter (`lib/teamGewicht.js`).
  teamMods = null, onTeams = null,
}) {
  const [matches, setMatches] = useState(null);

  const ab = spiele?.jeWettbewerb?.[wettbewerb] ?? null;
  const zonen = ab?.zonen ?? [];
  // Eine Zonenliste schreiben. Leere Liste heißt „keine Einschränkung“ — dafür
  // muss `undefined` gesetzt werden, nicht `[]`: eine leere Liste wäre eine
  // Abweichung, die nichts abweicht, und bliebe im Creator-Code stehen.
  const setzeZonen = (liste) => setzeAb({ zonen: liste.length ? liste : undefined });
  const matchIds = ab?.matchIds ?? [];

  // Der Katalog wird nur für die Derby-Empfehlung gebraucht — deshalb erst
  // laden, wenn das Fenster offen ist (es rendert nur dann).
  useEffect(() => {
    let live = true;
    getStore().listMatches()
      .then((ms) => { if (live) setMatches(ms ?? []); })
      .catch(() => { if (live) setMatches([]); });
    return () => { live = false; };
  }, []);

  // ── Das Gewicht DIESER Liga (MOD5) ────────────────────────
  // ⚠️ Der Anteil wird mit derselben Funktion gerechnet wie in der
  // Gesamtübersicht (`anteile` aus `wettbewerbGewicht.js`). Ein eigener
  // Dreisatz hier wäre die zweite Wahrheit über dieselbe Zahl.
  //
  // 🔴 Und er MUSS dabeistehen: „×1,5" klingt nach doppelt so wichtig, ist bei
  // 144 gegen 306 Spielen aber weiterhin die kleinere Hälfte. Genau davor
  // warnt der Kopfkommentar von `WettbewerbGewichte` — ein nackter Regler an
  // dieser Stelle hätte den Fehler zurückgeholt.
  const gewichte = onAufschlag ? sanitizeWettbewerbe(rules?.wettbewerbe) : null;
  const aufschlag = gewichte ? (gewichte.aufschlaege[wettbewerb] ?? 0) : 0;
  const anteil = useMemo(() => {
    if (!gewichte || !matches?.length) return null;
    return anteile(matches, { ...rules, wettbewerbe: gewichte })
      .find((x) => x.key === wettbewerb) ?? null;
  }, [matches, rules, gewichte, wettbewerb]);

  // Die Vereine DIESER Liga — aus derselben Quelle wie die Auswahl darüber.
  const vereine = useMemo(() => (onTeams ? vereineVon(wettbewerb) : []), [onTeams, wettbewerb]);
  // Gezählt wird nur, was zu DIESER Liga gehört: die Standzeile soll nicht
  // Vereine mitzählen, die in einer anderen Liga gewichtet wurden.
  const gewichtet = useMemo(
    () => vereine.filter((v) => teamFaktor(teamMods?.teams, v) !== 1).length,
    [vereine, teamMods],
  );

  const derbys = useMemo(() => (matches ?? [])
    .filter((m) => m.wettbewerb === wettbewerb && m.snapshot?.derby)
    .map((m) => ({
      id: String(m.matchId ?? m.id),
      label: m.snapshot.derby,
      paarung: `${m.home} – ${m.away}`,
      spieltag: m.matchday,
    })), [matches, wettbewerb]);

  // Eine Abweichung schreiben: Felder mit `undefined` fallen raus, damit die
  // Vorgabe für sie wieder gilt. Bleibt nichts übrig, verschwindet der ganze
  // Eintrag — eine leere Karte bläht sonst jeden Creator-Code auf.
  const setzeAb = (teil) => {
    const neu = { ...(ab ?? {}), ...teil };
    for (const k of Object.keys(neu)) if (neu[k] === undefined) delete neu[k];
    const karte = { ...(spiele?.jeWettbewerb ?? {}) };
    if (Object.keys(neu).length === 0) delete karte[wettbewerb];
    else karte[wettbewerb] = neu;
    onChange({ jeWettbewerb: karte });
  };

  const derbysAn = matchIds.length > 0 && ab?.modus === "liste";

  const derbyUmschalten = (an) => setzeAb(an
    ? { modus: "liste", matchIds: derbys.map((d) => d.id).slice(0, AUSWAHL_LIMITS.maxSpiele) }
    : { modus: undefined, matchIds: undefined });

  const derbyEinzeln = (id) => {
    const drin = matchIds.includes(id);
    const neu = drin ? matchIds.filter((x) => x !== id) : [...matchIds, id];
    setzeAb(neu.length
      ? { modus: "liste", matchIds: neu.slice(0, AUSWAHL_LIMITS.maxSpiele) }
      : { modus: undefined, matchIds: undefined });
  };

  return (
    <div style={{
      marginTop: 8, background: C.ink2, border: `1px solid ${C.line}`,
      borderRadius: RUND.karte, padding: "12px 12px 10px",
    }}>
      <div style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 2 }}>Sonderregeln — {label}</div>
      <p style={{ fontSize: "0.75rem", color: C.muted, margin: "0 0 10px", lineHeight: 1.45 }}>
        Gelten nur für diese Liga. Alles Übrige bleibt bei der Einstellung der Runde.
      </p>

      {/* ── Was diese Liga zählt (MOD5) ───────────────────────
          Steht GANZ OBEN, weil es die gröbste Entscheidung über eine Liga ist:
          zählt sie mehr, weniger oder normal. Alles darunter schneidet zu,
          diese Zeile gewichtet. */}
      {onAufschlag && (
        <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>Was {label} zählt</span>
            <span
              title={aufschlag > 0 ? "zählt mehr" : aufschlag < 0 ? "zählt weniger" : "kein Aufschlag"}
              style={{
                fontFamily: MONO, fontSize: "0.8125rem",
                color: aufschlag > 0 ? C.akzent : aufschlag < 0 ? C.indigo : C.muted,
              }}>
              {fmtFaktorOderAus(1 + aufschlag)}
            </span>
          </div>
          <input
            type="range" value={aufschlag}
            min={WETTBEWERB_LIMITS.aufschlag.min}
            max={WETTBEWERB_LIMITS.aufschlag.max}
            step={WETTBEWERB_LIMITS.aufschlag.step}
            onChange={(e) => onAufschlag(+e.target.value)}
            style={{ width: "100%", accentColor: C.akzent, cursor: "pointer" }}
          />
          {anteil ? (
            <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 3, lineHeight: 1.45 }}>
              {anteil.spiele} {anteil.spiele === 1 ? "Spiel" : "Spiele"} ·{" "}
              <strong style={{ color: C.text }}>{Math.round(anteil.anteil * 100)} % der Wertung</strong>
              {" "}— ohne Gewichte wären es {Math.round(anteil.anteilRoh * 100)} %
            </div>
          ) : (
            <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 3 }}>
              Der Anteil steht, sobald der Spielplan geladen ist.
            </div>
          )}
          <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
            Der Aufschlag fällt in denselben Topf wie Derby und Topspiel —
            addiert, nicht multipliziert, und vom Deckel begrenzt. Alle
            Wettbewerbe nebeneinander siehst du unter „Wettbewerbe gewichten“.
          </div>
        </div>
      )}

      {/* ── Einzelne Vereine dieser Liga (MOD5, zweiter Halbsatz) ──────
          🔴 **Bewusst eine EIGENE Liste und kein zweiter Modus auf den
          Auswahl-Chips darüber.** Dieselben Knöpfe je nach Zustand einmal
          „auswählen" und einmal „gewichten" zu lassen, ist die Sorte
          Bedienung, bei der man den Modus übersieht und sich die Runde
          zerschießt — auf dem Handy erst recht.

          ⚠️ Hinter `Feinheiten`, weil Auswählen das Gängige ist und
          Gewichten die Feinheit (Andis SA6). */}
      {onTeams && vereine.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <Feinheiten
            titel={`Feinheiten: einzelne Vereine aus ${label} gewichten`}
            zusammenfassung={gewichtet ? `${gewichtet} gewichtet` : "keiner"}
            abweichend={gewichtet > 0}
          >
            <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "2px 0 8px", lineHeight: 1.45 }}>
              Ein Klick schaltet weiter: ×1,25 · ×1,5 · ×2 · ×0,75 · ×0,5 · aus.
              Gilt für <strong>alle</strong> in der Runde und fällt in denselben
              Topf wie Derby und Topspiel.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {vereine.map((v) => {
                const f = teamFaktor(teamMods?.teams, v);
                const an = f !== 1;
                return (
                  <button
                    key={v}
                    onClick={() => onTeams(naechsteStufe(teamMods?.teams ?? {}, v))}
                    title={an ? `zählt ${fmtFaktorOderAus(f)}` : "kein Aufschlag"}
                    style={{
                      ...TAPZIEL, cursor: "pointer", fontFamily: "inherit",
                      fontSize: "0.75rem", padding: "6px 10px", borderRadius: RUND.pille,
                      background: an ? `${C.akzent}22` : C.surface,
                      color: an ? C.akzent : C.muted,
                      border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                    }}
                  >
                    {v}
                    {an && (
                      <span style={{ fontFamily: MONO, marginLeft: 6 }}>{fmtFaktorOderAus(f)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Feinheiten>
        </div>
      )}

      {/* ── Einer oder beide? je Liga (Andi, 23.08.2026) ────
          🔴 Genau der Fall aus seiner Ansage: „so soll bspw. El Clásico auch
          betippt werden, und nicht alle Spiele von Barça und Real in der
          Liga." In der Liga also nur das Duell, in der Champions League
          weiterhin jedes Spiel — das geht nur je Wettbewerb.

          ⚠️ Zeigt sich nur bei aktiver Vereinsauswahl: ohne gewählte Vereine
          hätte der Schalter nichts, worauf er wirken könnte, und wäre genau
          die Einstellung, die ins Leere läuft (CLAUDE.md, Baukasten). */}
      {(spiele?.modus === "teams" || (spiele?.teams?.length ?? 0) > 0) && (
        <>
          <div style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 2 }}>Gewählte Vereine</div>
          <p style={{ fontSize: "0.75rem", color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
            Zählt jedes Spiel der gewählten Vereine, oder nur die Duelle untereinander?
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {TEAM_MODI.map((m) => {
              // Die Vorgabe der Runde gilt, solange diese Liga nichts eigenes sagt.
              const geerbt = spiele?.teamModus ?? "einer";
              const an = (ab?.teamModus ?? geerbt) === m.key;
              const eigen = ab?.teamModus != null;
              return (
                <button key={m.key} title={m.desc}
                  onClick={() => setzeAb({
                    // Zurück auf den Wert der Runde heißt: die Abweichung
                    // LÖSCHEN, nicht denselben Wert doppelt hinschreiben.
                    teamModus: m.key === geerbt ? undefined : m.key,
                  })}
                  style={{
                    ...TAPZIEL, flex: 1, cursor: "pointer", fontFamily: "inherit",
                    fontSize: "0.75rem", fontWeight: an ? 700 : 400, padding: "8px 10px",
                    textAlign: "left", borderRadius: RUND.karte,
                    background: an ? `${C.mint}22` : C.surface,
                    color: an ? C.mint : C.muted,
                    border: `1px solid ${an ? C.mint + "66" : C.line}`,
                  }}>
                  {m.label}
                  {an && !eigen && (
                    <span style={{ display: "block", fontSize: "0.6875rem", color: C.muted, fontWeight: 400 }}>
                      von der Runde
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Tabellenzonen ───────────────────────────────────
          🔴 Seit 21.08.2026 MEHRERE. Vorher gab es genau einen Schalter
          („Abstiegskampf"), der `zonen[0]` schrieb — Andi wollte 14–18 UND
          1–4 gleichzeitig betippen können. Die Liste konnte das immer, nur
          diese Anzeige nicht. */}
      <div style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: 2 }}>Tabellenzonen</div>
      <p style={{ fontSize: "0.75rem", color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
        Getippt wird, wer in EINER der Zonen steht. Ohne Zone gilt die ganze Liga.
      </p>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {ZONEN_VORLAGEN.map((v) => {
          const drin = zonen.some((z) => z.von === v.von && z.bis === v.bis);
          return (
            <button
              key={v.key}
              type="button"
              title={v.unter}
              aria-pressed={drin}
              onClick={() => setzeZonen(drin
                ? zonen.filter((z) => !(z.von === v.von && z.bis === v.bis))
                : [...zonen, { von: v.von, bis: v.bis }])}
              style={{
                ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem",
                padding: "0 12px", borderRadius: RUND.karte,
                background: drin ? `${C.akzent}1A` : C.surface,
                color: drin ? C.akzent : C.muted,
                border: `1px solid ${drin ? C.akzent : C.line}`,
              }}
            >
              {drin ? "✓ " : "+ "}{v.label} {v.von}–{v.bis}
            </button>
          );
        })}
      </div>

      {zonen.length > 0 && (
        <div style={{ padding: "2px 2px 2px" }}>
          {zonen.map((z, i) => (
            <div key={`${z.von}-${z.bis}-${i}`}
              style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 8 }}>
              {/* 🔴 `wert` + `limits` (24.08.2026). Mit `value`/`min`/`max`
                  zerlegte die Zone die Seite, sobald jemand eine anlegte —
                  `Zahl` aus `Eingaben.jsx` liest `limits.min`. Derselbe Fehler
                  stand in `TabellenBonus`; beide gefunden beim Durchklicken,
                  von keinem Test und keinem Lint. */}
              <Zahl label="Platz ab" wert={z.von}
                limits={AUSWAHL_LIMITS.platz}
                onChange={(v) => setzeZonen(zonen.map((alt, k) => (k === i ? { ...alt, von: v } : alt)))} />
              <Zahl label="bis Platz" wert={z.bis}
                limits={AUSWAHL_LIMITS.platz}
                onChange={(v) => setzeZonen(zonen.map((alt, k) => (k === i ? { ...alt, bis: v } : alt)))} />
              <button
                type="button"
                onClick={() => setzeZonen(zonen.filter((_, k) => k !== i))}
                style={{
                  ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem",
                  padding: "0 12px", borderRadius: RUND.karte, background: C.surface,
                  color: C.muted, border: `1px solid ${C.line}`,
                }}
              >
                entfernen
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setzeZonen([...zonen, { von: 1, bis: 4 }])}
            style={{
              ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem",
              padding: "0 12px", borderRadius: RUND.karte, background: C.surface,
              color: C.text, border: `1px dashed ${C.line}`, marginBottom: 6,
            }}
          >
            + eigene Zone
          </button>

          {/* 🔴 Andis Detail-Regel (SA6): die vier Zonen-Knöpfe oben decken
              ab, was fast jeder will („nur der Abstiegskampf"). Ab WELCHEM
              Spieltag die Tabelle zählt, stellt fast niemand um — und die
              Vorgabe 30 ist die begründete (vorher ist die Tabelle noch nicht
              aussagekräftig). */}
          <Feinheiten
            titel="Feinheiten: ab welchem Spieltag die Tabelle zählt"
            zusammenfassung={`ab Spieltag ${ab?.spieltagVon ?? ABSTIEGSKAMPF.abSpieltag}`}
            abweichend={(ab?.spieltagVon ?? ABSTIEGSKAMPF.abSpieltag) !== ABSTIEGSKAMPF.abSpieltag}
          >
            <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
              Früher als Spieltag {ABSTIEGSKAMPF.abSpieltag} sagt eine Tabelle wenig —
              nach fünf Spieltagen steht ein Aufsteiger schon mal auf Platz 3.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Zahl label="ab Spieltag" wert={ab?.spieltagVon ?? ABSTIEGSKAMPF.abSpieltag}
                limits={AUSWAHL_LIMITS.spieltag}
                onChange={(v) => setzeAb({ spieltagVon: v })} />
            </div>
          </Feinheiten>

          {/* Die Betreuung, die eine nackte Zahl nicht leistet — dieselbe
              Rolle wie `anteile()` bei den Wettbewerbs-Gewichten. */}
          <p style={{ fontSize: "0.6875rem", color: C.akzent, margin: "8px 0 0", lineHeight: 1.45 }}>
            Getippt wird, wer auf {zonen.map((z) => `${z.von}–${z.bis}`).join(" oder ")} steht
            — abgelesen am Tabellenstand beim Öffnen des Spieltags, nicht zwischen zwei
            Spielen desselben Spieltags.
          </p>
          {/* 🔴 Der Satz muss stehen bleiben. Der Tabellenstand entsteht erst
              beim Öffnen eines Spieltags; VORHER kennt keine Vorschau ihn, und
              die Spielzahl weiter oben zeigt diese Liga deshalb mit null
              Spielen. Ohne diese Erklärung sieht eine korrekt greifende
              Einstellung wie ein kaputter Filter aus — und der nächste
              Durchgang „repariert" sie. */}
          <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "6px 0 0", lineHeight: 1.45 }}>
            Die Vorschau kann das noch nicht zeigen: die Tabelle steht erst, wenn der
            erste Spieltag geöffnet ist. Diese Liga erscheint bis dahin mit 0 Spielen.
          </p>
        </div>
      )}

      {/* ── Derbys ──────────────────────────────────────── */}
      <div style={{ marginTop: 8 }}>
        <Schalter
          an={derbysAn}
          titel="Nur Derbys"
          unter={matches === null ? "wird geladen …" : `${derbys.length} Begegnungen im Spielplan`}
          onChange={derbyUmschalten}
        />
        {derbysAn && (
          <div style={{ padding: "8px 2px 2px" }}>
            <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
              Unsere Empfehlung, frei änderbar — einzelne Begegnungen ab- oder dazuwählen.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {derbys.map((d) => {
                const on = matchIds.includes(d.id);
                return (
                  <button key={d.id} onClick={() => derbyEinzeln(d.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    minHeight: 44, boxSizing: "border-box", textAlign: "left",
                    cursor: "pointer", fontFamily: "inherit", padding: "8px 10px", borderRadius: RUND.karte,
                    background: on ? `${C.mint}18` : C.surface, color: on ? C.text : C.muted,
                    border: `1px solid ${on ? C.mint + "55" : C.line}`,
                  }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700 }}>{d.paarung}</span>
                      <span style={{ display: "block", fontSize: "0.6875rem", color: C.muted }}>{d.label}</span>
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: "0.6875rem", color: C.muted, flexShrink: 0 }}>
                      ST {d.spieltag}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: "0.6875rem", color: C.mint, marginTop: 8 }}>
              {matchIds.length} Begegnung{matchIds.length === 1 ? "" : "en"} gewählt.
            </div>
          </div>
        )}
      </div>

      {ab && (
        <button onClick={() => onChange({
          jeWettbewerb: Object.fromEntries(
            Object.entries(spiele?.jeWettbewerb ?? {}).filter(([k]) => k !== wettbewerb)),
        })} style={{
          marginTop: 10, width: "100%", minHeight: 44, boxSizing: "border-box",
          cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem",
          background: "transparent", color: C.muted,
          border: `1px dashed ${C.line}`, borderRadius: RUND.karte,
        }}>Sonderregeln dieser Liga entfernen</button>
      )}
    </div>
  );
}

function Schalter({ an, titel, unter, onChange }) {
  return (
    <button onClick={() => onChange(!an)} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      minHeight: 48, boxSizing: "border-box", textAlign: "left",
      cursor: "pointer", fontFamily: "inherit", padding: "8px 11px", borderRadius: RUND.karte,
      background: an ? `${C.mint}14` : C.surface, color: C.text,
      border: `1px solid ${an ? C.mint + "55" : C.line}`,
    }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700 }}>{titel}</span>
        <span style={{ display: "block", fontSize: "0.6875rem", color: C.muted, marginTop: 1 }}>{unter}</span>
      </span>
      <span style={{
        flexShrink: 0, width: 34, height: 20, borderRadius: RUND.pille,
        background: an ? C.mint : C.surface2, position: "relative",
      }}>
        <span style={{
          position: "absolute", top: 2, left: an ? 16 : 2, width: 16, height: 16,
          borderRadius: RUND.pille, background: "#fff", transition: "left .15s",
        }} />
      </span>
    </button>
  );
}

// Zahlenfeld statt Regler: Plätze und Spieltage sind Treffer-Werte, keine
// Gefühlssache. Der Baukasten-Grundsatz verlangt beides nur dort, wo ein
// Regler überhaupt etwas fühlbar macht.
function Zahl({ label, value, min, max, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "0.6875rem", color: C.muted }}>{label}</span>
      <input type="number" min={min} max={max} value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
        style={{
          width: 72, minHeight: 44, boxSizing: "border-box",
          background: C.surface, color: C.text, border: `1px solid ${C.line}`,
          borderRadius: RUND.karte, padding: "8px 10px", fontSize: "0.9375rem", fontFamily: MONO, outline: "none",
        }} />
    </label>
  );
}
