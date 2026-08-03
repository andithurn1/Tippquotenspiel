"use client";

import { C, MONO } from "@/lib/theme";

// ============================================================
//  EINGABEN — der Baustein „Zahleneingabe", einmal statt fünfmal
//
//  Der Baukasten-Grundsatz (CLAUDE.md: „Regler UND Zahleneingabe bei jeder
//  Einstellung") verlangt dieses Feld überall — entsprechend lag es fünfmal
//  fast wortgleich kopiert in Drehrad.jsx, Ereignisse.jsx, JokerGrundform.jsx
//  (dort `ZahlInput`), JokerOekonomie.jsx und LimitKlassen.jsx. Im Browser
//  nachgemessen sind die fünf Kopien dabei leise auseinandergelaufen:
//  Ereignisse.jsx, JokerOekonomie.jsx und LimitKlassen.jsx kannten kein
//  `leerErlaubt` und machten ein geleertes Feld über `Number("")` zu 0,
//  statt es leer zu lassen wie in Drehrad.jsx und JokerGrundform.jsx.
//  Ereignisse.jsx fehlte außerdem `display: block` am Label. Gleicher
//  Baustein, verschiedenes Verhalten — nicht Absicht, sondern Drift.
//
//  Neue Zahleneingaben kommen ab jetzt von HIER.
//
//  ⚠️ `leerErlaubt: false` (die Vorgabe) macht ein geleertes Feld weiterhin
//  zu 0 (`Number("")` ist 0) — das ist die oben gemessene Drift und wird
//  hier NICHT repariert. Ob ein Feld leer sein darf, ist eine fachliche
//  Frage je Aufrufstelle (heißt „leer" dort „keine Grenze"? „Vorgabe"? oder
//  gibt es dort gar keinen sinnvollen leeren Zustand?), die sich nicht
//  pauschal für alle Aufrufstellen beantworten lässt. Jede Aufrufstelle
//  entscheidet das einzeln über `leerErlaubt`.
// ============================================================
export function Zahl({
  label, wert, limits, onChange,
  leerErlaubt = false, leerText = "keine", breite = 130, marginTop = 0,
}) {
  return (
    <label style={{ fontSize: 11, color: C.muted, flex: `1 1 ${breite}px`, display: "block", marginTop }}>
      {label}
      <input type="number" value={wert ?? ""}
        min={limits.min} max={limits.max} step={limits.step}
        placeholder={leerErlaubt ? leerText : undefined}
        onChange={(e) => {
          const roh = e.target.value;
          if (leerErlaubt && roh === "") { onChange(undefined); return; }
          onChange(Number(roh));
        }}
        style={{
          display: "block", width: "100%", boxSizing: "border-box", marginTop: 3,
          background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
          borderRadius: 10, padding: "7px 9px", fontSize: 13, fontFamily: MONO, outline: "none",
        }} />
    </label>
  );
}
