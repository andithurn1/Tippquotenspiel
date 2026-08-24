"use client";

import { C, MONO, RUND } from "@/lib/theme";
import { band } from "@/lib/reglerWarnung";
import { TAPZIEL_QUADRAT } from "@/lib/tapziel";

// ============================================================
//  EINGABEN — die geteilten Bedien-Bausteine
//
//  Angefangen hat die Datei mit der Zahleneingabe (unten), inzwischen liegen
//  hier alle Bausteine, die MEHR ALS EIN Screen braucht: Regler, Schalter,
//  Feld, Stepper und die große aufklappbare Zeile. Sie lagen bis zum
//  22.08.2026 lokal in `Spielerstellung.jsx` — solange sie nur dort gebraucht
//  wurden, war das richtig. Mit dem Joker-Sondermenü sind sie es nicht mehr,
//  und eine Kopie wäre genau die Drift, die im Kopf der Zahleneingabe steht.
// ============================================================

// ── Regler mit Empfehlungsband ──────────────────────────────
// `pfad` schaltet das Empfehlungsband frei: der Bereich, den die vermessenen
// Presets belegen, wird als Streifen unter dem Regler markiert und der Wert
// färbt sich, sobald er ihn verlässt. Bewusst direkt am Regler — der
// Zusammenhang zwischen Handgriff und Folge muss unmittelbar sein.
export function Slider({ label, hint, value, min, max, step, onChange, fmt, pfad }) {
  const b = pfad ? band(pfad) : null;
  const draussen = b && (value < b.von || value > b.bis);
  const anteil = (v) => `${Math.max(0, Math.min(100, ((v - min) / (max - min || 1)) * 100))}%`;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: "0.8125rem" }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: "0.8125rem", color: draussen ? C.coral : C.akzent }}>
          {fmt ? fmt(value) : value.toFixed(2)}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: draussen ? C.coral : C.akzent, cursor: "pointer" }} />
      {b && (
        <div title="erprobter Bereich" style={{
          position: "relative", height: 3, borderRadius: RUND.pille, background: C.line, marginTop: 1,
        }}>
          <div style={{
            position: "absolute", top: 0, bottom: 0, borderRadius: RUND.pille, background: `${C.mint}99`,
            left: anteil(b.von), right: `calc(100% - ${anteil(b.bis)})`,
          }} />
        </div>
      )}
      {hint && <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

export function Toggle({ label, on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%",
      textAlign: "left", gap: 12, marginBottom: 8, cursor: "pointer", color: C.text,
      background: C.surface, border: `1px solid ${on ? C.mint + "55" : C.line}`,
      borderRadius: RUND.karte, padding: "10px 14px", fontSize: "0.8125rem", fontFamily: "inherit",
      // 44 pt (Apple) / 48 dp (Google) — gilt für jeden Schalter.
      minHeight: 44, boxSizing: "border-box",
    }}>
      <span>{label}</span>
      <span style={{
        flexShrink: 0, width: 38, height: 22, borderRadius: RUND.pille,
        background: on ? C.mint : C.surface2, position: "relative", transition: "background .2s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18,
          borderRadius: RUND.pille, background: "#fff", transition: "left .2s",
        }} />
      </span>
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: "0.75rem", color: C.muted, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

export function Stepper({ value, min, max, onStep }) {
  // ⚠️ Hier reicht `TAPZIEL` NICHT: `min-height` schlägt `height`, aus dem
  // 30×30-Quadrat würde ein 30 breiter, 44 hoher Streifen. Quadratische
  // Knöpfe brauchen beide Maße — dafür gibt es die zweite Konstante.
  const b = (dis) => ({
    ...TAPZIEL_QUADRAT, borderRadius: RUND.karte, cursor: dis ? "default" : "pointer",
    background: C.surface2, color: dis ? C.muted : C.text, border: `1px solid ${C.line}`,
    fontSize: "1.25rem", lineHeight: 1,
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={() => onStep(-1)} disabled={value <= min} style={b(value <= min)}>−</button>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: "1.25rem", color: C.akzent, width: 18, textAlign: "center" }}>{value}</span>
      <button onClick={() => onStep(1)} disabled={value >= max} style={b(value >= max)}>+</button>
    </div>
  );
}

// ── Die große Zeile: eine Überschrift, ein Stand, ein Aufklappen ──
//
// Drei Dinge stecken darin, die nicht wegoptimiert werden dürfen:
// 1. **Mindestens 56 px hoch.** Das ist der eigentliche Grund für dieses
//    Layout: Apple verlangt 44 pt, Google 48 dp, und auf diesem Screen lagen
//    18 Tippziele darunter. Ein großes Ziel entsteht hier von selbst.
// 2. **Der Stand steht rechts, im zugeklappten Zustand.** Eine Zeile, die
//    ihren Stand erst nach dem Öffnen zeigt, verlagert das Problem nur.
// 3. **Aufklappen statt Unterseite.** Der eingestellte Wert und seine Wirkung
//    bleiben auf demselben Screen.
export function GrosseZeile({ icon, titel, unter, wert, offen, onClick, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <button onClick={onClick} style={{
        width: "100%", minHeight: 56, boxSizing: "border-box",
        display: "flex", alignItems: "center", gap: 12,
        textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: C.text,
        background: offen ? C.ink2 : C.surface,
        border: `1px solid ${offen ? C.mint + "55" : C.line}`,
        borderRadius: RUND.karte, padding: "12px 14px",
      }}>
        {icon && <span style={{ fontSize: "1.25rem", flexShrink: 0, lineHeight: 1 }}>{icon}</span>}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "0.9375rem", fontWeight: 700 }}>{titel}</span>
          {unter && (
            <span style={{ display: "block", fontSize: "0.75rem", color: C.muted, marginTop: 2 }}>{unter}</span>
          )}
        </span>
        {wert && (
          <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: C.akzent, flexShrink: 0 }}>{wert}</span>
        )}
        <span style={{
          fontSize: "1.25rem", color: C.muted, flexShrink: 0, lineHeight: 1,
          transform: offen ? "rotate(90deg)" : "none", transition: "transform .15s",
        }}>›</span>
      </button>
      {offen && <div style={{ padding: "2px 2px 10px" }}>{children}</div>}
    </div>
  );
}

// ============================================================
//  ZAHLENEINGABE — der Baustein, einmal statt fünfmal
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
    <label style={{ fontSize: "0.6875rem", color: C.muted, flex: `1 1 ${breite}px`, display: "block", marginTop }}>
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
          borderRadius: RUND.karte, padding: "7px 9px", fontSize: "0.8125rem", fontFamily: MONO, outline: "none",
        }} />
    </label>
  );
}
