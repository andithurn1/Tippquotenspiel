"use client";

import { useMemo, useState } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { pruefe, korrigieren, zusammenfassung } from "@/lib/reglerWarnung";
import { TAPZIEL } from "@/lib/tapziel";

// ── Leitplanken der Profi-Stufe ─────────────────────────────
// Die Profi-Stufe gibt jeden Regler frei — deshalb braucht sie eine Stimme,
// die sagt, wann ein Wert das Spiel kippt. Zwei Entscheidungen dahinter:
//
//  • Der Kasten steht IMMER da, auch wenn alles in Ordnung ist. Eine Warnung,
//    die nur im Fehlerfall auftaucht, übersieht man; ein Feld, das grün ist
//    und plötzlich rot wird, nicht.
//  • Jede Meldung trägt ihre eigene Korrektur. Ein Hinweis, den man nur lesen,
//    aber nicht auflösen kann, ist eine Belehrung — kein Werkzeug.
export default function ProfiWarnungen({ rules, onChange }) {
  const [offen, setOffen] = useState(true);
  const warnungen = useMemo(() => pruefe(rules), [rules]);
  const z = useMemo(() => zusammenfassung(rules), [rules]);

  const farbe = z.stufe === "warnung" ? C.coral : z.stufe === "hinweis" ? C.akzent : C.mint;

  return (
    <div style={{
      background: `${farbe}0e`, border: `1px solid ${farbe}44`, borderRadius: RUND.karte,
      padding: "13px 15px", marginTop: 14, marginBottom: 4,
    }}>
      <button onClick={() => setOffen((o) => !o)} disabled={!warnungen.length} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 9, textAlign: "left",
        ...TAPZIEL, background: "transparent", border: "none", padding: 0, fontFamily: "inherit",
        cursor: warnungen.length ? "pointer" : "default",
      }}>
        <span style={{ color: farbe, fontSize: "0.9375rem" }}>{z.stufe === "ok" ? "✓" : "!"}</span>
        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: farbe, flex: 1 }}>
          {z.stufe === "ok" ? "Im erprobten Bereich" : "Ungewöhnliche Einstellungen"}
        </span>
        {warnungen.length > 0 && (
          <span style={{ color: farbe, fontSize: "0.8125rem" }}>{offen ? "▾" : "▸"}</span>
        )}
      </button>

      <p style={{ fontSize: "0.75rem", color: C.muted, margin: "6px 0 0", lineHeight: 1.5 }}>
        {z.text}{" "}
        {z.stufe === "ok"
          ? "Die Grenzwerte der Regler sind bewusst weiter als das, was sich in der Simulation bewährt hat."
          : "Erlaubt ist es trotzdem — du solltest nur wissen, was es tut."}
      </p>

      <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "6px 0 0", lineHeight: 1.45, opacity: 0.85 }}>
        <span style={{
          display: "inline-block", width: 16, height: 3, borderRadius: RUND.pille,
          background: `${C.mint}99`, marginRight: 6, verticalAlign: "middle",
        }} />
        Der Streifen unter jedem Regler markiert den erprobten Bereich.
      </p>

      {offen && warnungen.map((w) => (
        <div key={w.id} style={{
          marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}`,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <span style={{
              fontFamily: MONO, fontSize: "0.6875rem", letterSpacing: 1, textTransform: "uppercase",
              color: w.stufe === "warnung" ? C.coral : C.akzent,
              border: `1px solid ${(w.stufe === "warnung" ? C.coral : C.akzent)}55`,
              borderRadius: RUND.pille, padding: "1px 7px", flexShrink: 0,
            }}>{w.stufe === "warnung" ? "kippt" : "unrund"}</span>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.text }}>{w.titel}</span>
          </div>

          <p style={{ fontSize: "0.75rem", color: C.muted, margin: "5px 0 0", lineHeight: 1.5 }}>
            {w.text}
          </p>

          {w.band && (
            <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 5, fontFamily: MONO }}>
              dein Wert {fmt(w.wert)} · erprobt {fmt(w.band.von)}–{fmt(w.band.bis)}
            </div>
          )}

          <button onClick={() => onChange(korrigieren(rules, w.id))} style={{
            marginTop: 8, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 700,
            background: "transparent", color: C.sky, border: `1px solid ${C.sky}55`,
            borderRadius: RUND.pille, padding: "5px 12px",
          }}>{w.fix}</button>
        </div>
      ))}
    </div>
  );
}

const fmt = (v) =>
  Number.isInteger(v) ? String(v) : String(+Number(v).toFixed(2)).replace(".", ",");
