"use client";

import { useMemo } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { PHASEN, wettbewerbVon, wettbewerbLabel, phaseVon } from "@/lib/wettbewerbe";
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

  if (mitKo.length === 0) return null;

  const setzeAb = (w, rang) => {
    const karte = { ...(spiele?.jeWettbewerb ?? {}) };
    if (rang === null) delete karte[w];
    else karte[w] = { ...(karte[w] ?? {}), phasen: phasenAb(rang) };
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
          // Die Zahl je Zeile: wie viele Spiele bleiben mit DIESER Stufe übrig?
          // Gerechnet über dieselbe `filterSpiele`, die auch die Runde füllt —
          // eine eigene Rechnung wäre die zweite Wahrheit.
          const zahl = (rang) => {
            const karte = { ...(spiele?.jeWettbewerb ?? {}) };
            if (rang === null) delete karte[w];
            else karte[w] = { ...(karte[w] ?? {}), phasen: phasenAb(rang) };
            return filterSpiele(alle, { ...spiele, jeWettbewerb: karte })
              .filter((m) => wettbewerbVon(m) === w).length;
          };
          return (
            <div key={w}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{wettbewerbLabel(w)}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>
                  {zahl(ab)} Spiele
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
