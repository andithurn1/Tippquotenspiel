"use client";

import { useState } from "react";
import { C, MONO } from "@/lib/theme";
import { ASPEKTE } from "@/lib/presetMerge";
import { bildeTeilCode, zerlegeTeilCode } from "@/lib/teilbibliothek";
import { TAPZIEL } from "@/lib/tapziel";

// ── Bausteine — Teil-Codes je Aspekt erzeugen ──────────────────
// „Nicht nur ganze Regelwerke teilen, sondern einzelne Bausteine" (design/
// teilbibliotheken.md). Ein Teil-Code trägt IMMER einen ganzen Aspekt aus
// `presetMerge.ASPEKTE`, nie einzelne Felder daraus (ebd. Abschnitt 1) — genau
// das bildet diese Liste ab: pro Aspekt, wie weit das aktuelle Regelwerk von
// der Vorgabe abweicht, und ein Knopf, der den Code erzeugt und kopiert.
//
// Reines Erzeugen — angewendet wird ein Teil-Code über das Einlesefeld in
// Spielerstellung.jsx (istTeilCode → wendeTeilCodeAn).
export default function Bausteine({ rules }) {
  const [kopiert, setKopiert] = useState(null);
  // Code je Aspekt, wenn die Zwischenablage fehlschlug — dann steht er hier
  // zum Markieren, statt dass der Klick still folgenlos bleibt (Muster:
  // `copy` in Spielerstellung.jsx).
  const [fallback, setFallback] = useState({});

  const kopieren = async (aspektKey, code) => {
    try {
      await navigator.clipboard.writeText(code);
      setKopiert(aspektKey);
      setFallback((f) => {
        if (!(aspektKey in f)) return f;
        const n = { ...f };
        delete n[aspektKey];
        return n;
      });
      setTimeout(() => setKopiert((k) => (k === aspektKey ? null : k)), 1500);
    } catch {
      setFallback((f) => ({ ...f, [aspektKey]: code }));
    }
  };

  return (
    <div>
      <p style={{ fontSize: 12, color: C.muted, marginTop: -6, marginBottom: 10, lineHeight: 1.4 }}>
        Teile nur EINEN Bereich eures Regelwerks — z. B. „nimm mein Drehrad" —
        statt des ganzen Regelwerks. Wer den Code lädt, übernimmt genau diesen
        Bereich; alles andere bleibt bei ihm unverändert.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ASPEKTE.map((aspekt) => {
          const code = bildeTeilCode(rules, aspekt.key);
          const zerlegt = zerlegeTeilCode(code);
          const anzahl = zerlegt ? Object.keys(zerlegt.werte).length : 0;
          // Kein Baustein ohne Abweichung ausblenden — sonst wirkt es, als
          // gäbe es ihn nicht. Er trägt nur exakt die Vorgabe, ist aber ein
          // gültiger, teilbarer Code.
          const unveraendert = anzahl === 0;
          const istKopiert = kopiert === aspekt.key;
          const fallbackCode = fallback[aspekt.key];

          return (
            <div key={aspekt.key} style={{
              background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
              padding: "10px 12px", opacity: unveraendert ? 0.6 : 1,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{aspekt.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: unveraendert ? C.muted : C.akzent, whiteSpace: "nowrap" }}>
                  {unveraendert ? "unverändert" : `${anzahl} ${anzahl === 1 ? "abweichendes Feld" : "abweichende Felder"}`}
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{aspekt.hint}</div>
              {unveraendert && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>
                  Der Code enthält nur die Vorgabe — hier ist noch nichts geändert.
                </div>
              )}
              <button onClick={() => kopieren(aspekt.key, code)} style={{
                marginTop: 8, width: "100%", cursor: "pointer",
                background: istKopiert ? C.mint : C.surface2, color: istKopiert ? C.ink : C.text,
                fontWeight: 700, fontSize: 12, fontFamily: "inherit",
                ...TAPZIEL, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 0",
              }}>{istKopiert ? "✓ kopiert" : "Code kopieren"}</button>
              {fallbackCode && (
                <div style={{
                  marginTop: 8, background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 10,
                  padding: "8px 10px",
                }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, lineHeight: 1.4 }}>
                    Zwischenablage nicht verfügbar — Code markieren und kopieren:
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.akzent, wordBreak: "break-all", lineHeight: 1.5 }}>
                    {fallbackCode}
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
