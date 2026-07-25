"use client";

import { C, MONO } from "@/lib/theme";
import { REGLER, anwenden, erkenneStufe, beispiele, naeheSatz } from "@/lib/einfachRegler";

// ── Stufe 2 „Anpassen" ──────────────────────────────────────
// Vier Fragen statt zwanzig Regler. Jede Stufe setzt ein Bündel geprüfter
// Werte; daneben stehen ECHTE Beispielzahlen aus der Engine, damit man sieht,
// was man einstellt — statt eine abstrakte Zahl zu verschieben.
export default function EinfacheRegler({ rules, onChange }) {
  const zeilen = beispiele(rules);

  return (
    <div>
      <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 16px", lineHeight: 1.5 }}>
        Vier Fragen genügen. Unten siehst du jederzeit, was deine Antworten
        konkret für die Punkte bedeuten — alle weiteren Einzelheiten stehen in
        der Profi-Stufe.
      </p>

      {REGLER.map((regler) => {
        const aktiv = erkenneStufe(rules, regler.key);
        return (
          <div key={regler.key} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{regler.label}</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>
              {regler.hint}
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
              {regler.stufen.map((stufe) => {
                const an = aktiv === stufe.key;
                return (
                  <button key={stufe.key}
                    onClick={() => onChange(anwenden(rules, regler.key, stufe.key))}
                    style={{
                      flex: 1, cursor: "pointer", fontFamily: "inherit", padding: "9px 6px",
                      borderRadius: 11, fontSize: 12.5, fontWeight: 700,
                      background: an ? `${C.gold}22` : C.surface,
                      color: an ? C.gold : C.muted,
                      border: `1px solid ${an ? C.gold + "66" : C.line}`,
                    }}>{stufe.label}</button>
                );
              })}
            </div>

            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.45, minHeight: 32 }}>
              {aktiv
                ? regler.stufen.find((s) => s.key === aktiv)?.beschreibung
                : "Eigene Einstellung aus der Profi-Stufe — wähle hier etwas aus, um sie zu ersetzen."}
            </div>
          </div>
        );
      })}

      {/* Beispielrechnung: das Herzstück dieser Stufe */}
      <div style={{
        background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 14,
        padding: "13px 15px", marginTop: 4,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: C.muted,
          textTransform: "uppercase", marginBottom: 9,
        }}>
          Was das für die Punkte heißt
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.45 }}>
          Beispiel-Spiel: Außenseiter gewinnt 3:1 gegen den Favoriten.
        </div>

        {zeilen.map((z) => (
          <div key={z.key} style={{
            display: "flex", alignItems: "baseline", justifyContent: "space-between",
            gap: 10, padding: "4px 0",
          }}>
            <span style={{ fontSize: 12.5, color: C.text, flex: 1, minWidth: 0 }}>{z.text}</span>
            <span style={{
              fontFamily: MONO, fontSize: 13, fontWeight: 700,
              color: z.wert > 0 ? C.gold : z.wert < 0 ? C.coral : C.muted,
              fontVariantNumeric: "tabular-nums",
            }}>{z.wert > 0 ? `+${z.wert}` : z.wert}</span>
          </div>
        ))}

        <div style={{
          fontSize: 11.5, color: C.mint, marginTop: 10, paddingTop: 9,
          borderTop: `1px solid ${C.line}`, lineHeight: 1.45,
        }}>
          {naeheSatz(rules)}
        </div>
      </div>
    </div>
  );
}
