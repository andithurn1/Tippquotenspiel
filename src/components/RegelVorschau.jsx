"use client";

import { useMemo } from "react";
import { previewArchetypes } from "@/lib/rulePreview";
import { C, MONO } from "@/lib/theme";


// Live-Vorschau: für typische Spielarten, was verschiedene nahe Tipps mit dem
// aktuellen Regelwerk zahlen. Rechnet bei jeder Regeländerung neu (previewArchetypes
// → Engine). Der beste Tipp je Spielart wird hervorgehoben, damit man den Kontrast
// (mutig vs. brav, Favorit vs. Außenseiter) sofort sieht.
export default function RegelVorschau({ rules }) {
  const rows = useMemo(() => previewArchetypes(rules), [rules]);
  const jokerMax = rows[0]?.jokerFaktorMax ?? 1;

  return (
    <div style={{
      marginTop: 18, background: `${C.gold}10`, border: `1px solid ${C.gold}33`,
      borderRadius: 14, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 11, color: C.gold, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
        Live-Vorschau · typische Spielarten
      </div>
      <p style={{ fontSize: 10.5, color: C.muted, margin: "0 0 12px", lineHeight: 1.4 }}>
        Punkte, die verschiedene nahe Tipps mit deinen aktuellen Reglern gäben. Dreh an
        k / Underdog-Boost / Favoriten-Malus und beobachte, wie sich die Spielarten spreizen.
        {jokerMax > 1 && (
          <> Der zweite Wert zeigt, was dasselbe Spiel mit dem höchsten Gewicht
          (×{jokerMax.toFixed(1)}) bringt.</>
        )}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r) => (
          <div key={r.key}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: C.muted }}>
                {r.real.home}:{r.real.away} · Sieger-Quote {r.winnerQuote}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {r.tips.map((t, i) => {
                const best = t.points === r.best && r.best > 0;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "baseline", gap: 6, padding: "5px 9px", borderRadius: 10,
                    background: best ? `${C.gold}18` : C.surface,
                    border: `1px solid ${best ? C.gold + "55" : C.line}`,
                  }}>
                    <span style={{ fontSize: 11, color: C.muted }}>{t.kind}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted }}>
                      {t.tip.home}:{t.tip.away}
                    </span>
                    <span style={{
                      fontFamily: MONO, fontSize: 13, fontWeight: 700,
                      color: t.points > 0 ? (best ? C.gold : C.text) : C.coral,
                    }}>{t.points}</span>
                    {t.pointsJoker != null && (
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.mint }}
                        title={`mit Gewicht ×${jokerMax.toFixed(1)}`}>
                        →{t.pointsJoker}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{r.hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
