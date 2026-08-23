"use client";

import { useState } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { CHARAKTERE, merkmale } from "@/lib/charaktere";

// ── Stufe 1: eine Runde in einem Klick ──────────────────────
// Keine Regler, keine Zahlen — vier Runden-IDEEN plus die Möglichkeit, den
// Code eines anderen zu laden. Wer mehr will, wechselt danach die Stufe;
// dieselben Regeln, nur mehr Details sichtbar.
//
// Die Code-Eingabe steht bewusst gleichberechtigt neben den Charakteren:
// geteilte Codes sollen der normale Weg sein, nicht eine versteckte Funktion.
export default function RundenCharaktere({ gewaehlt, onWaehlen, onCodeLaden, codeFehler }) {
  const [code, setCode] = useState("");
  const [codeOffen, setCodeOffen] = useState(false);

  return (
    <div>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 14px", lineHeight: 1.5 }}>
        Such dir aus, wie eure Runde sich anfühlen soll. Alles andere stellen wir
        passend ein — ändern kannst du es später jederzeit.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CHARAKTERE.map((ch) => {
          const aktiv = gewaehlt === ch.key;
          return (
            <button key={ch.key} onClick={() => onWaehlen(ch)} style={{
              textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
              background: aktiv
                ? `radial-gradient(120% 120% at 50% -20%, ${C.akzent}22 0%, ${C.surface} 100%)`
                : `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${aktiv ? C.akzent + "77" : C.line}`,
              borderRadius: RUND.karte, padding: "15px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{ch.emoji}</span>
                <span style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>{ch.label}</span>
                {aktiv && (
                  <span style={{
                    fontFamily: MONO, fontSize: 11, color: C.akzent, border: `1px solid ${C.akzent}66`,
                    borderRadius: RUND.pille, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 1,
                  }}>gewählt</span>
                )}
              </div>

              <div style={{ fontSize: 13, color: C.akzent, marginTop: 5, fontStyle: "italic" }}>
                {ch.tagline}
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                {ch.desc}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
                {merkmale(ch).map((m) => (
                  <span key={m} style={{
                    fontFamily: MONO, fontSize: 11, color: C.muted,
                    border: `1px solid ${C.line}`, borderRadius: RUND.pille, padding: "2px 8px",
                  }}>{m}</span>
                ))}
              </div>

              <div style={{ fontSize: 11, color: C.muted, marginTop: 8, opacity: 0.8 }}>
                Für {ch.fuer}
              </div>
            </button>
          );
        })}

        {/* Gleichberechtigt: den Code von jemand anderem übernehmen */}
        <div style={{
          background: C.ink2, border: `1px dashed ${C.sky}55`, borderRadius: RUND.karte, padding: "14px 16px",
        }}>
          <button onClick={() => setCodeOffen((o) => !o)} style={{
            width: "100%", textAlign: "left", cursor: "pointer", background: "transparent",
            border: "none", padding: 0, fontFamily: "inherit", color: C.text,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>🔗</span>
              <span style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>…oder Code eingeben</span>
              <span style={{ color: C.sky, fontSize: 15 }}>{codeOffen ? "▾" : "▸"}</span>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
              Jemand hat euch seine Runden-Einstellung geschickt? Hier einsetzen —
              du bekommst genau dieselbe Runde und kannst sie trotzdem anpassen.
            </div>
          </button>

          {codeOffen && (
            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
              <input value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="Code einsetzen" style={{
                  flex: 1, minWidth: 0, background: C.surface, color: C.text,
                  border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "9px 11px",
                  fontSize: 13, fontFamily: MONO, outline: "none",
                }} />
              <button onClick={() => onCodeLaden(code)} disabled={!code.trim()} style={{
                cursor: code.trim() ? "pointer" : "default",
                background: code.trim() ? C.sky : C.surface,
                color: code.trim() ? C.ink : C.muted,
                fontWeight: 700, fontSize: 13, border: `1px solid ${code.trim() ? C.sky : C.line}`,
                borderRadius: RUND.karte, padding: "0 15px", fontFamily: "inherit",
              }}>Laden</button>
            </div>
          )}
          {codeFehler && (
            <div style={{ fontSize: 12, color: C.coral, marginTop: 7 }}>{codeFehler}</div>
          )}
        </div>
      </div>
    </div>
  );
}
