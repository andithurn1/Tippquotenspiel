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
import { C, MONO } from "@/lib/theme";
import { getStore } from "@/lib/store";
import { AUSWAHL_LIMITS } from "@/lib/spielauswahl";

// Unsere Voreinstellung für den Abstiegskampf. Keine Balance-Aussage — eine
// Bequemlichkeit: die Zahlen sind sofort verstellbar.
export const ABSTIEGSKAMPF = { von: 14, bis: 18, abSpieltag: 30 };

export default function LigaSonderregeln({ wettbewerb, label, spiele, onChange }) {
  const [matches, setMatches] = useState(null);

  const ab = spiele?.jeWettbewerb?.[wettbewerb] ?? null;
  const zonen = ab?.zonen ?? [];
  const zone = zonen[0] ?? null;
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

  const abstiegAn = Boolean(zone);
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
      borderRadius: 12, padding: "12px 12px 10px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Sonderregeln — {label}</div>
      <p style={{ fontSize: 11.5, color: C.muted, margin: "0 0 10px", lineHeight: 1.45 }}>
        Gelten nur für diese Liga. Alles Übrige bleibt bei der Einstellung der Runde.
      </p>

      {/* ── Abstiegskampf ───────────────────────────────── */}
      <Schalter
        an={abstiegAn}
        titel="Abstiegskampf"
        unter="Endspurt im unteren Tabellendrittel"
        onChange={(an) => setzeAb(an
          ? { zonen: [{ von: ABSTIEGSKAMPF.von, bis: ABSTIEGSKAMPF.bis }], spieltagVon: ABSTIEGSKAMPF.abSpieltag }
          : { zonen: undefined, spieltagVon: undefined })}
      />
      {abstiegAn && (
        <div style={{ padding: "8px 2px 2px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Zahl label="Platz ab" value={zone.von} min={AUSWAHL_LIMITS.platz.min} max={AUSWAHL_LIMITS.platz.max}
              onChange={(v) => setzeAb({ zonen: [{ von: v, bis: zone.bis }] })} />
            <Zahl label="bis Platz" value={zone.bis} min={AUSWAHL_LIMITS.platz.min} max={AUSWAHL_LIMITS.platz.max}
              onChange={(v) => setzeAb({ zonen: [{ von: zone.von, bis: v }] })} />
            <Zahl label="ab Spieltag" value={ab?.spieltagVon ?? ABSTIEGSKAMPF.abSpieltag}
              min={AUSWAHL_LIMITS.spieltag.min} max={AUSWAHL_LIMITS.spieltag.max}
              onChange={(v) => setzeAb({ spieltagVon: v })} />
          </div>
          {/* Die Betreuung, die eine nackte Zahl nicht leistet — dieselbe
              Rolle wie `anteile()` bei den Wettbewerbs-Gewichten. */}
          <p style={{ fontSize: 11, color: C.akzent, margin: "8px 0 0", lineHeight: 1.45 }}>
            Getippt wird, wer auf den Plätzen {zone.von}–{zone.bis} steht — abgelesen am
            Tabellenstand beim Öffnen des Spieltags, nicht zwischen zwei Spielen desselben
            Spieltags.
          </p>
          {/* 🔴 Der Satz muss stehen bleiben. Der Tabellenstand entsteht erst
              beim Öffnen eines Spieltags; VORHER kennt keine Vorschau ihn, und
              die Spielzahl weiter oben zeigt diese Liga deshalb mit null
              Spielen. Ohne diese Erklärung sieht eine korrekt greifende
              Einstellung wie ein kaputter Filter aus — und der nächste
              Durchgang „repariert" sie. */}
          <p style={{ fontSize: 11, color: C.muted, margin: "6px 0 0", lineHeight: 1.45 }}>
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
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
              Unsere Empfehlung, frei änderbar — einzelne Begegnungen ab- oder dazuwählen.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {derbys.map((d) => {
                const on = matchIds.includes(d.id);
                return (
                  <button key={d.id} onClick={() => derbyEinzeln(d.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    minHeight: 44, boxSizing: "border-box", textAlign: "left",
                    cursor: "pointer", fontFamily: "inherit", padding: "8px 10px", borderRadius: 10,
                    background: on ? `${C.mint}18` : C.surface, color: on ? C.text : C.muted,
                    border: `1px solid ${on ? C.mint + "55" : C.line}`,
                  }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 700 }}>{d.paarung}</span>
                      <span style={{ display: "block", fontSize: 11, color: C.muted }}>{d.label}</span>
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted, flexShrink: 0 }}>
                      ST {d.spieltag}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: C.mint, marginTop: 8 }}>
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
          cursor: "pointer", fontFamily: "inherit", fontSize: 12,
          background: "transparent", color: C.muted,
          border: `1px dashed ${C.line}`, borderRadius: 10,
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
      cursor: "pointer", fontFamily: "inherit", padding: "8px 11px", borderRadius: 11,
      background: an ? `${C.mint}14` : C.surface, color: C.text,
      border: `1px solid ${an ? C.mint + "55" : C.line}`,
    }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{titel}</span>
        <span style={{ display: "block", fontSize: 11, color: C.muted, marginTop: 1 }}>{unter}</span>
      </span>
      <span style={{
        flexShrink: 0, width: 34, height: 20, borderRadius: 999,
        background: an ? C.mint : C.surface2, position: "relative",
      }}>
        <span style={{
          position: "absolute", top: 2, left: an ? 16 : 2, width: 16, height: 16,
          borderRadius: 999, background: "#fff", transition: "left .15s",
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
      <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
      <input type="number" min={min} max={max} value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
        style={{
          width: 72, minHeight: 44, boxSizing: "border-box",
          background: C.surface, color: C.text, border: `1px solid ${C.line}`,
          borderRadius: 10, padding: "8px 10px", fontSize: 14, fontFamily: MONO, outline: "none",
        }} />
    </label>
  );
}
