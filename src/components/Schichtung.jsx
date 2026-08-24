"use client";

import { C, MONO, RUND } from "@/lib/theme";
import { ASPEKTE } from "@/lib/presetMerge";

// ============================================================
//  SCHICHTUNG — was liegt in welcher Reihenfolge auf dieser Runde?
//
//  🔴 Andi, 24.08.2026 (nach eigener Angabe „hab ich schon oft gesagt“):
//
//    „erst Big-Game-Code und dann meine Betippungsauswahl-Teilbibcode für
//     bspw. nur Bundesliga Premier League besten 5 plus CL, und dann pass ich
//     eigens noch an, dass Abstiegskampf die letzten 5 … schön untereinander
//     in der Reihe kombinierbar“
//
//  ⚠️ **Die Mechanik dafür trug schon, nur sah man sie nicht.** Nachgemessen
//  am selben Tag an genau diesem Ablauf: Vorgabe 1943 Spiele → + Modifikator-
//  Code → + Spielauswahl-Code = 104 → + eigene Änderung = 162. Jede Schicht
//  überlebt die nächste, weil `wendeTeilCodeAn` nur die Felder SEINES Aspekts
//  ersetzt. Was fehlte, war die Auskunft: der Screen zeigte das Ergebnis und
//  verschwieg, woraus es entstanden ist.
//
//  🔴 **Warum eine LISTE und keine Map.** `geladeneCodes` in der
//  Spielerstellung ist `{ aspekt: code }` — damit weiß man, WAS gilt, aber
//  nicht, in welcher REIHENFOLGE es aufgelegt wurde. Genau die Reihenfolge ist
//  Andis Punkt: zwei Codes können dieselbe Ebene berühren, und dann gewinnt
//  der spätere. Eine Map kann das nicht erzählen.
//
//  ⚠️ Ein zweiter Code desselben Aspekts rutscht ans ENDE der Liste statt an
//  seiner alten Stelle zu bleiben. Er hat zuletzt gewirkt, also gehört er
//  nach unten — sonst behauptet die Reihe eine Wirkung, die überschrieben ist.
// ============================================================

const ASPEKT_LABEL = Object.fromEntries(ASPEKTE.map((a) => [a.key, a.label ?? a.key]));

export default function Schichtung({ basis, schichten = [], handAngepasst }) {
  // Nichts aufgelegt und nichts von Hand geändert: dann gibt es auch nichts zu
  // erzählen. Eine leere Liste mit Überschrift wäre nur Lärm.
  if (!basis && schichten.length === 0 && !handAngepasst) return null;

  const zeilen = [];
  if (basis) zeilen.push({ art: "basis", text: basis });
  for (const s of schichten) {
    zeilen.push({ art: "code", text: ASPEKT_LABEL[s.aspekt] ?? s.aspekt, code: s.code });
  }
  if (handAngepasst) zeilen.push({ art: "hand", text: "von Hand angepasst" });

  return (
    <div style={{
      marginTop: 12, background: C.ink2, border: `1px solid ${C.line}`,
      borderRadius: RUND.karte, padding: "11px 13px",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: C.muted,
        textTransform: "uppercase", marginBottom: 8,
      }}>Darauf liegt gerade</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {zeilen.map((z, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{
              fontFamily: MONO, fontSize: 11, color: C.muted,
              minWidth: 16, textAlign: "right", flexShrink: 0,
            }}>{i + 1}</span>
            <span style={{ fontSize: 14, flex: 1, minWidth: 0 }}>
              <span style={{ color: z.art === "hand" ? C.muted : C.text, fontWeight: z.art === "basis" ? 700 : 500 }}>
                {z.text}
              </span>
              {z.code && (
                <span style={{
                  fontFamily: MONO, fontSize: 11, color: C.muted, marginLeft: 7,
                  wordBreak: "break-all",
                }}>{z.code.slice(0, 18)}…</span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* ⚠️ Der Satz gehört dazu, nicht als Fußnote: ohne ihn liest sich die
          Liste wie eine Verlaufs-Historie („war mal so“) statt wie das, was
          sie ist — die Schichten, die JETZT gelten. */}
      <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
        Später Aufgelegtes gewinnt — aber nur in seinem eigenen Bereich. Alles
        andere bleibt stehen.
      </div>
    </div>
  );
}
