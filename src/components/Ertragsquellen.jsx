"use client";

import { C, MONO } from "@/lib/theme";
import { breakdown } from "@/lib/breakdown";

// ── „Woher kamen meine Punkte?" ─────────────────────────────
// Wie ein Kassenbon: Posten, Betrag, unten die Summe. Bewusst auch mit den
// Abzügen — eine Abrechnung, die nur Gutschriften zeigt, wirkt unehrlich.
//
// Drei Posten-Arten (aus breakdown.js):
//   summe  — addiert sich (Grundwert, Torschützen, Malus)
//   faktor — multipliziert (Kombi, Joker, Außenseiter-Bonus)
//   info   — zählt NICHT, erklärt nur (unterlegene Teile, Deckel)
//
// `stufe` kommt aus prefs.abrechnung: "voll" zeigt alles inkl. Kontext,
// "dezent" nur die Posten, die wirklich zählen.
export default function Ertragsquellen({ tip, actual, snap, rules, stufe = "voll" }) {
  if (!tip || !actual || !snap) return null;
  const b = breakdown(tip, actual, snap, rules);
  const zeilen = stufe === "voll" ? b.posten : b.posten.filter((p) => p.art !== "info");
  if (!zeilen.length) return null;

  return (
    <div style={{
      marginTop: 14, background: C.ink2, border: `1px solid ${C.line}`,
      borderRadius: 14, padding: "14px 15px",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, color: C.muted,
        textTransform: "uppercase", marginBottom: 10,
      }}>
        Woher deine Punkte kamen
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {zeilen.map((p) => <Zeile key={p.key} p={p} zeigeHinweis={stufe === "voll"} />)}
      </div>

      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        borderTop: `1px solid ${C.line}`, marginTop: 8, paddingTop: 9,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Gesamt</span>
        <span style={{
          fontFamily: MONO, fontSize: 20, fontWeight: 700,
          color: b.gesamt < 0 ? C.coral : C.gold,
        }}>
          {b.gesamt > 0 ? `+${b.gesamt}` : b.gesamt}
        </span>
      </div>
    </div>
  );
}

function Zeile({ p, zeigeHinweis }) {
  const istInfo = p.art === "info";
  const istFaktor = p.art === "faktor";
  const negativ = p.art === "summe" && p.wert < 0;

  const farbe = istInfo ? C.muted : negativ ? C.coral : istFaktor ? C.sky : C.text;
  const text = istFaktor
    ? `×${p.wert}`
    : p.wert > 0 ? `+${p.wert}` : String(p.wert);

  return (
    <div style={{ padding: "5px 0", opacity: istInfo ? 0.55 : 1 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{
          flex: 1, minWidth: 0, fontSize: 12.5,
          color: istInfo ? C.muted : C.text,
          textDecoration: istInfo ? "line-through" : "none",
        }}>{p.label}</span>
        <span style={{
          fontFamily: MONO, fontSize: 13, fontWeight: istFaktor ? 400 : 700,
          color: farbe, fontVariantNumeric: "tabular-nums",
        }}>{text}</span>
      </div>
      {zeigeHinweis && p.hinweis && (
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1, lineHeight: 1.4 }}>
          {p.hinweis}
        </div>
      )}
    </div>
  );
}
