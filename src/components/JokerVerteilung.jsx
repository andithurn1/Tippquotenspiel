"use client";

import { useMemo } from "react";
import { C, MONO } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import {
  VERTEIL_MODI, SICHTBARKEIT, VERTEILUNG_LIMITS,
  sanitizeVerteilung, jokerPlan, kontingent, beschreibeVerteilung,
} from "@/lib/jokerPlan";

const SPIELTAGE = 34;
// Beispiel-Spieler nur für die Vorschau — der echte Plan entsteht später aus
// den Mitgliedern der Runde und ihrer Id.
const BEISPIEL = ["du", "spieler-2", "spieler-3"];

// ── Wann gibt es überhaupt einen Joker? ─────────────────────
// Der Admin stellt eine FREQUENZ ein statt 34 Spieltage anzuklicken. Die
// Vorschau-Leiste darunter ist der eigentliche Punkt: eine Zahl wie „jeder
// 4." sagt wenig, die Leiste zeigt sofort, wie dicht das wirklich ist.
export default function JokerVerteilung({ verteilung, onChange }) {
  const v = sanitizeVerteilung(verteilung);
  const plan = useMemo(
    () => jokerPlan({ spieltage: SPIELTAGE, verteilung: v, seed: "vorschau", userIds: BEISPIEL }),
    [v.modus, v.frequenz],   // eslint-disable-line react-hooks/exhaustive-deps
  );
  const patch = (p) => onChange(sanitizeVerteilung({ ...v, ...p }));

  return (
    <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>Wann gibt es einen Joker?</div>
      <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 9px", lineHeight: 1.45 }}>
        {beschreibeVerteilung(v, SPIELTAGE)}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {VERTEIL_MODI.map((m) => {
          const an = v.modus === m.key;
          return (
            <button key={m.key} onClick={() => patch({ modus: m.key })} style={{
              textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
              background: an ? `${C.akzent}18` : C.surface,
              border: `1px solid ${an ? C.akzent + "66" : C.line}`,
              borderRadius: 12, padding: "9px 12px",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: an ? C.akzent : C.text }}>{m.label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{m.desc}</div>
            </button>
          );
        })}
      </div>

      {v.modus !== "frei" && (
        <>
          <div style={{ marginTop: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ fontSize: 13 }}>Etwa jeder {v.frequenz}. Spieltag</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: C.akzent }}>
                {kontingent(SPIELTAGE, v.frequenz)} Joker
              </span>
            </div>
            <input type="range" value={v.frequenz}
              min={VERTEILUNG_LIMITS.frequenz.min} max={VERTEILUNG_LIMITS.frequenz.max}
              step={VERTEILUNG_LIMITS.frequenz.step}
              onChange={(e) => patch({ frequenz: +e.target.value })}
              style={{ width: "100%", accentColor: C.akzent, cursor: "pointer" }} />
          </div>

          {/* Vorschau-Kalender: 34 Spieltage auf einen Blick */}
          <Leiste titel={v.modus === "gleich" ? "Joker-Spieltage der Runde" : "So sähe ein Spieler aus"}
            tage={v.modus === "gleich" ? plan.alle : plan.proSpieler[BEISPIEL[0]]} />

          {v.modus === "kontingent" && (
            <>
              <Leiste titel="…und ein anderer" tage={plan.proSpieler[BEISPIEL[1]]} gedimmt />
              <p style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
                Gleich viele Joker für jeden, nur zu anderen Zeitpunkten. Mitten in
                der Saison hat deshalb nicht jeder gleich viele gehabt — angezeigt
                wird darum immer der Fortschritt („3 von {plan.anzahl}"), nie eine
                nackte Zahl.
              </p>
            </>
          )}

          <div style={{ marginTop: 13 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Wer sieht die Spieltage?</div>
            <div style={{ display: "flex", gap: 6 }}>
              {SICHTBARKEIT.map((s) => {
                const an = v.sichtbarkeit === s.key;
                return (
                  <button key={s.key} onClick={() => patch({ sichtbarkeit: s.key })} style={{
                    ...TAPZIEL, flex: 1, cursor: "pointer", fontFamily: "inherit", padding: "8px 6px",
                    borderRadius: 11, fontSize: 12, fontWeight: 700,
                    background: an ? `${C.akzent}22` : C.surface,
                    color: an ? C.akzent : C.muted,
                    border: `1px solid ${an ? C.akzent + "66" : C.line}`,
                  }}>{s.label}</button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
              {SICHTBARKEIT.find((s) => s.key === v.sichtbarkeit)?.desc}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// 34 Kästchen — die Joker-Spieltage leuchten. Zahlen nur an jedem fünften,
// sonst wird die Leiste auf dem Handy unlesbar.
function Leiste({ titel, tage = [], gedimmt = false }) {
  const set = new Set(tage);
  return (
    <div style={{ marginTop: 11 }}>
      <div style={{
        fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: C.muted,
        textTransform: "uppercase", marginBottom: 5,
      }}>{titel}</div>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: SPIELTAGE }, (_, i) => i + 1).map((md) => {
          const an = set.has(md);
          return (
            <div key={md} title={`Spieltag ${md}`} style={{
              flex: 1, height: 18, borderRadius: 3,
              background: an ? (gedimmt ? `${C.akzent}77` : C.akzent) : C.surface2,
              border: `1px solid ${an ? "transparent" : C.line}`,
            }} />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        {[1, 9, 17, 25, 34].map((md) => (
          <span key={md} style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{md}</span>
        ))}
      </div>
    </div>
  );
}
