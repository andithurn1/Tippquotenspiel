"use client";

import { useMemo, useState } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { PHASEN, wettbewerbVon, wettbewerbLabel, phaseVon } from "@/lib/wettbewerbe";
import { TAPZIEL } from "@/lib/tapziel";
import { filterSpiele } from "@/lib/spielauswahl";

// ============================================================
//  K.-O.-RUNDEN je Wettbewerb — „ab welcher Runde wird getippt?"
//
//  🔴 Andi, 24.08.2026: „sollte dann als Liste noch einstellbar sein, bei den
//  verschiedenen Liga-Cups, dass ab Viertelfinale auch betippt wird."
//
//  ⚠️ **Die Mechanik gab es schon** — `jeWettbewerb` trägt `phasen` je
//  Wettbewerb (`ABWEICHUNGS_FELDER` in spielauswahl.js), und `auswahlFuer`
//  wendet sie beim Filtern an. Gefehlt hat nur die Bedienung.
//
//  ── 🔴 Warum „AB einer Runde" und nicht fünf einzelne Haken ──
//  Andi hat um Übersicht gebeten, und hier entscheidet sie sich. Fünf Phasen
//  einzeln anzuhaken ergäbe 32 mögliche Zustände, von denen 27 unsinnig sind
//  („Achtelfinale ja, Viertelfinale nein, Halbfinale ja"). Ein Pokal läuft
//  linear — also ist die einzige Frage, die jemand wirklich hat: **ab wann?**
//  Fünf Knöpfe, fünf sinnvolle Zustände, kein Zustand mehr.
//
//  `rang` aus `PHASEN` liefert die Ordnung, ohne dass hier Strings verglichen
//  werden. Kommt eine Runde dazu (Sechzehntelfinale), reiht sie sich von
//  selbst ein.
//
//  ── 🔴 Die Feinheit dahinter (SA2): „nur wenn Barça dabei ist" ──
//  Andi, 24.08.2026: „mit Option, dass das nur gilt, sobald die und die
//  Mannschaft beteiligt ist … halt alles erstmal auswählbar bei gewissen Cups,
//  wo jetzt Begegnungen noch nicht feststehen."
//
//  ⚠️ **Dafür war KEINE neue Mechanik nötig** — nachgemessen am 24.08.2026,
//  bevor etwas gebaut wurde: `teams` steht längst in `ABWEICHUNGS_FELDER`,
//  also trägt `jeWettbewerb.cl` neben `phasen` auch eine eigene Vereinsliste,
//  und `auswahlFuer` wendet beides an. Gemessen: CL ab Viertelfinale = 7
//  Spiele, dieselbe Auswahl mit „nur Barça/Real" = 5.
//
//  Nach Andis Regel vom selben Tag („erstmal die gängigsten Sachen, und mit
//  einem Detailfenster noch die Feinheiten") steht die Vereins-Bedingung
//  deshalb HINTER einem Klick: die Frage „ab wann?" hat jeder, die Frage
//  „nur wenn wer?" haben wenige.
//
//  ⚠️ **Die Zahl ist dann eine Schätzung.** Wer eine Vereins-Bedingung auf
//  eine K.-o.-Runde legt, deren Auslosung noch aussteht, bekommt eine Zahl,
//  die sich mit der Auslosung ändert. Das gehört dazugesagt — eine Zahl, die
//  Festigkeit vortäuscht, ist schlimmer als eine Spanne.
//
//  ── ⚠️ Nur Wettbewerbe MIT K.-o.-Runden ──
//  Eine Bundesliga hat keine, und eine Zeile „Bundesliga: ab Viertelfinale"
//  wäre eine Einstellung ins Leere. Der Block bleibt ganz weg, wenn kein
//  einziger Wettbewerb der Runde K.-o.-Spiele hat — dieselbe Regel wie bei den
//  Phasen-Chips nebenan.
// ============================================================

const KO = PHASEN.filter((p) => p.ko).sort((a, b) => a.rang - b.rang);

// Aus „ab Viertelfinale" wird die Liste der Phasen, die dann zählen. Die
// LIGAPHASE gehört ausdrücklich NICHT dazu: wer „ab Viertelfinale" sagt, meint
// die K.-o.-Runden — sonst hätte er nichts eingeschränkt.
function phasenAb(rang) {
  if (rang === null) return [];              // keine Einschränkung
  return PHASEN.filter((p) => p.ko && p.rang >= rang).map((p) => p.key);
}

// Und zurück: welche Stufe steht gerade? `null` = alles dabei.
function rangVon(phasen) {
  if (!phasen?.length) return null;
  const raenge = phasen.map((k) => PHASEN.find((p) => p.key === k)?.rang).filter((r) => Number.isFinite(r));
  if (!raenge.length) return null;
  // Enthält die Auswahl die Ligaphase, ist es keine „ab"-Stufe — dann zeigt
  // die Zeile „alle", statt eine Stufe zu behaupten, die nicht gemeint war.
  if (phasen.includes("liga")) return null;
  return Math.min(...raenge);
}

export default function KoRunden({ spiele, alle = [], onChange }) {
  // Welcher Pokal hat sein Detail gerade offen? Bewusst nur EINER — zwei
  // offene Vereinslisten schieben auf 390 px alles andere aus dem Bild.
  const [detailOffen, setDetailOffen] = useState(null);

  // Welche Wettbewerbe dieser Runde haben überhaupt K.-o.-Spiele?
  const mitKo = useMemo(() => {
    const m = new Map();
    for (const x of alle) {
      const p = phaseVon(x);
      if (!KO.some((k) => k.key === p)) continue;
      const w = wettbewerbVon(x);
      m.set(w, (m.get(w) ?? 0) + 1);
    }
    // Nur die, die auch in der Wettbewerbs-Auswahl stehen (oder alle, wenn
    // nichts eingeschränkt ist) — sonst stellt man etwas ein, das ohnehin
    // nicht zur Runde gehört.
    const gewaehlt = spiele?.wettbewerbe ?? [];
    return [...m.keys()].filter((w) => !gewaehlt.length || gewaehlt.includes(w));
  }, [alle, spiele?.wettbewerbe]);

  // Die Vereine je Pokal — nur die, die dort wirklich spielen. Eine Liste aus
  // allen 90 Vereinen wäre für „wer muss dabei sein?" unbrauchbar.
  const vereineJe = useMemo(() => {
    const m = new Map();
    for (const x of alle) {
      const w = wettbewerbVon(x);
      if (!m.has(w)) m.set(w, new Set());
      m.get(w).add(x.home);
      m.get(w).add(x.away);
    }
    return m;
  }, [alle]);

  if (mitKo.length === 0) return null;

  // 🔴 EINE Stelle, die aus „ab welcher Runde" eine Karte macht — benutzt
  // vom Klick UND von der Zahl daneben.
  //
  // ⚠️ Der Grund steht in CLAUDE.md („Runden-Schicht"): vorher baute die
  // Vorschau ihre eigene Karte und LÖSCHTE bei „alle" den ganzen Eintrag,
  // während der Klick nur die Phasen zurücknahm. Gemessen am 24.08.2026:
  // Die Zeile versprach 159 Spiele, tatsächlich blieben 23 — die
  // Vereins-Bedingung galt weiter, die Vorschau wusste nichts davon.
  const karteMit = (w, rang) => {
    const karte = { ...(spiele?.jeWettbewerb ?? {}) };
    if (rang === null) {
      // „alle" nimmt nur die Phasen-Einschränkung zurück. Eine gesetzte
      // Vereins-Bedingung bleibt — sie ist eine eigene Entscheidung, und sie
      // still mitzulöschen wäre die unangenehme Sorte Überraschung.
      const rest = { ...(karte[w] ?? {}) };
      delete rest.phasen;
      if (Object.keys(rest).length) karte[w] = rest; else delete karte[w];
    } else {
      karte[w] = { ...(karte[w] ?? {}), phasen: phasenAb(rang) };
    }
    return karte;
  };

  const setzeAb = (w, rang) => onChange({ jeWettbewerb: karteMit(w, rang) });

  // 🔴 Die Feinheit (SA2): welche Vereine müssen beteiligt sein?
  // ⚠️ `modus` und `teamModus` gehören MIT in die Abweichung — ohne sie wäre
  // die Liste da und würde nicht filtern (`sanitizeSpiele` setzt `modus` auf
  // „alle" zurück, sobald unter zwei Vereine dastehen).
  const setzeVerein = (w, verein) => {
    const karte = { ...(spiele?.jeWettbewerb ?? {}) };
    const jetzt = karte[w]?.teams ?? [];
    const neu = jetzt.includes(verein) ? jetzt.filter((v) => v !== verein) : [...jetzt, verein];
    const rest = { ...(karte[w] ?? {}) };
    if (neu.length === 0) {
      // Nichts mehr gewählt: die Bedingung ganz entfernen. Bleibt sonst nichts
      // vom Eintrag übrig, fliegt er mit.
      delete rest.modus; delete rest.teamModus; delete rest.teams;
      if (Object.keys(rest).length) karte[w] = rest; else delete karte[w];
    } else {
      // 🔴 **Der erste Verein wird MITGESPEICHERT, obwohl er allein nichts
      // bewirkt.** Genau daran ist der erste Anlauf gescheitert (24.08.2026):
      // Er löschte die Liste, solange weniger als zwei Vereine dastanden —
      // und damit fing jeder zweite Klick wieder bei null an. Zwei Vereine
      // waren nicht erreichbar, und im Browser sah es aus, als täte der Knopf
      // nichts.
      //
      // ⚠️ `modus` steht deshalb AUSDRÜCKLICH auf „alle", solange einer fehlt:
      // die Wahl bleibt sichtbar, greift aber nicht. Ohne das eigene „alle"
      // erbte die Abweichung den globalen Modus — und eine Runde, die ohnehin
      // auf Vereine eingeschränkt ist, ließe die Bedingung dann schon mit
      // EINEM Verein greifen. Zwei Wege zu einer Regel, wieder einmal.
      karte[w] = {
        ...rest, teams: neu, teamModus: "einer",
        modus: neu.length >= 2 ? "teams" : "alle",
      };
    }
    onChange({ jeWettbewerb: karte });
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: C.muted,
        textTransform: "uppercase", marginBottom: 6,
      }}>K.-o.-Runden</div>
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 9px", lineHeight: 1.45 }}>
        Ab welcher Runde zählt ein Pokal mit? „Alle“ nimmt auch die Ligaphase dazu.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {mitKo.map((w) => {
          const ab = rangVon(spiele?.jeWettbewerb?.[w]?.phasen);
          const offen = detailOffen === w;
          const gewaehlteVereine = spiele?.jeWettbewerb?.[w]?.teams ?? [];
          // Die Zahl je Zeile: wie viele Spiele bleiben mit DIESER Stufe übrig?
          // Gerechnet über dieselbe `filterSpiele`, die auch die Runde füllt —
          // eine eigene Rechnung wäre die zweite Wahrheit.
          const zahl = (rang) => filterSpiele(alle, { ...spiele, jeWettbewerb: karteMit(w, rang) })
            .filter((m) => wettbewerbVon(m) === w).length;
          return (
            <div key={w}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{wettbewerbLabel(w)}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>
                  {/* ⚠️ „etwa", sobald eine Vereins-Bedingung auf einer noch
                      nicht ausgelosten Runde liegt — siehe Kopfkommentar. */}
                  {gewaehlteVereine.length >= 2 && ab !== null ? "etwa " : ""}{zahl(ab)} Spiele
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                <Stufe an={ab === null} label="alle" onClick={() => setzeAb(w, null)} />
                {KO.map((p) => (
                  <Stufe key={p.key} an={ab === p.rang}
                    label={p.rang === 4 ? "nur Finale" : `ab ${p.kurz}`}
                    onClick={() => setzeAb(w, p.rang)} />
                ))}
              </div>

              {/* 🔴 Andis Regel: gängigstes oben, Feinheiten hinter einem Klick. */}
              <button onClick={() => setDetailOffen(offen ? null : w)} style={{
                marginTop: 6, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                background: "transparent", border: "none", padding: 0,
                fontSize: 13, color: C.sky, ...TAPZIEL,
              }}>
                {offen ? "▾" : "▸"} Nur wenn bestimmte Vereine dabei sind
                {gewaehlteVereine.length > 0 && (
                  <span style={{
                    fontFamily: MONO, fontSize: 11, marginLeft: 6,
                    color: gewaehlteVereine.length >= 2 ? C.muted : C.coral,
                  }}>
                    {/* ⚠️ Bei genau einem Verein steht dort NICHT „1 gewählt",
                        sondern was fehlt — sonst sieht eine Einstellung, die
                        noch nicht greift, aus wie eine, die greift. */}
                    {gewaehlteVereine.length >= 2
                      ? `${gewaehlteVereine.length} gewählt`
                      : "noch einer fehlt"}
                  </span>
                )}
              </button>

              {offen && (
                <div style={{
                  marginTop: 6, background: C.ink, border: `1px solid ${C.line}`,
                  borderRadius: RUND.karte, padding: "10px 11px",
                }}>
                  <p style={{ fontSize: 12, color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
                    Mindestens 2 Vereine — die Runde zählt dann nur, wenn einer von
                    ihnen beteiligt ist. Bei Pokalen ohne Auslosung ist die Zahl
                    darüber deshalb eine Schätzung.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {[...(vereineJe.get(w) ?? [])].sort().map((v) => (
                      <Stufe key={v} an={gewaehlteVereine.includes(v)} label={v}
                        onClick={() => setzeVerein(w, v)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ⚠️ `minHeight: 44` ist Vorgabe, kein Geschmack (Apple 44 pt, Google 48 dp) —
// dieselbe Regel wie bei den Chips nebenan.
function Stufe({ an, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: "6px 13px",
      minHeight: 44, boxSizing: "border-box", borderRadius: RUND.pille,
      background: an ? `${C.mint}22` : C.surface,
      color: an ? C.mint : C.muted,
      fontWeight: an ? 700 : 500,
      border: `1px solid ${an ? C.mint + "66" : C.line}`,
    }}>{label}</button>
  );
}
