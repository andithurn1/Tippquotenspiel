"use client";

import { useState } from "react";
import { getGlossary } from "@/lib/glossary";

const C = {
  ink2: "#12172E", surface2: "#232A50", line: "rgba(255,255,255,0.14)",
  text: "#EDEEF6", muted: "#8A90B4", gold: "#F5C451",
};

// Inline-Fachbegriff: das Wort ist angetippt (gepunktete Linie + ⓘ) und klappt
// beim Tippen eine kurze Erklärung aus dem Glossar auf. Tippt man erneut oder
// aufs ×, schließt es. Bewusst tap-to-toggle, damit es auch auf dem Handy geht.
// children überschreibt den Anzeigetext, sonst wird der Glossar-Begriff gezeigt.
export default function Begriff({ term, children }) {
  const [open, setOpen] = useState(false);
  const entry = getGlossary(term);
  if (!entry) return <>{children ?? term}</>;

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          font: "inherit", color: C.gold, cursor: "pointer", background: "none", border: "none",
          padding: 0, borderBottom: `1px dotted ${C.gold}88`, lineHeight: "inherit",
        }}
        aria-expanded={open}
      >
        {children ?? entry.term}
        <span style={{ fontSize: "0.72em", verticalAlign: "super", marginLeft: 1 }}>ⓘ</span>
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute", left: 0, top: "100%", marginTop: 6, zIndex: 20,
            width: "min(260px, 78vw)", background: C.surface2, color: C.text,
            border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px",
            boxShadow: "0 18px 40px -18px rgba(0,0,0,0.85)", fontSize: 12.5, lineHeight: 1.5,
            fontWeight: 400, textAlign: "left", cursor: "auto",
          }}
        >
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <strong style={{ color: C.gold, fontSize: 12 }}>{entry.term}</strong>
            <button onClick={() => setOpen(false)} style={{
              background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1,
            }} aria-label="schließen">×</button>
          </span>
          {entry.text}
        </span>
      )}
    </span>
  );
}
