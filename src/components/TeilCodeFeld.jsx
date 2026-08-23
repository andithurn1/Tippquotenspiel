"use client";

import { useState } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import { ASPEKTE } from "@/lib/presetMerge";
import { istTeilCode, zerlegeTeilCode, wendeTeilCodeAn, bildeTeilCode } from "@/lib/teilbibliothek";

// ============================================================
//  TEIL-CODE JE EBENE — laden und teilen, dort wo die Ebene sitzt
//
//  🔴 Andi am 21.08.2026: „bei jedem Punkt vor der Bibliothek ein eigenes
//  Codefeld, um exakt nur für diesen Teilabschnitt eine Anpassung zu laden."
//
//  Sein Ablauf: erst ein Code für das GESAMTE Spiel — damit stehen alle
//  Admin-Teilebenen (ATE) — dann Ebene für Ebene mit Teil-Codes überschreiben,
//  die auch von anderen Creatorn stammen dürfen.
//
//  ⚠️ Das Feld gehört an die EBENE, nicht in ein zentrales Import-Feld. Beides
//  würde funktionieren; nur sieht man im zentralen Feld nicht, dass sich bloß
//  ein Abschnitt ändert. Genau darum ging es ihm.
//
//  ⚠️ **Ein fremder Teil-Code wird ABGEWIESEN.** Wer einen Joker-Code ins Feld
//  der Ereignisse tippt, bekäme sonst still eine ganz andere Ebene überschrieben
//  — und würde den Fehler erst Wochen später bemerken.
//
//  ⚠️ „Zuletzt geladen" ist keine Zierde. Zwei Codes derselben Ebene
//  überschreiben einander; ohne diese Anzeige wirkt der zweite Ladevorgang wie
//  ein Fehlschlag des ersten.
// ============================================================

export default function TeilCodeFeld({ aspekt, rules, onChange, geladen, onGeladen }) {
  const [wert, setWert] = useState("");
  const [fehler, setFehler] = useState("");
  const [kopiert, setKopiert] = useState(false);

  const info = ASPEKTE.find((a) => a.key === aspekt);
  const label = info?.label ?? aspekt;

  const laden = () => {
    const code = wert.trim();
    setFehler("");
    if (!code) return;
    if (!istTeilCode(code)) {
      setFehler("Das ist kein Teil-Code. Ein Gesamt-Code gehört ganz nach oben.");
      return;
    }
    const zerlegt = zerlegeTeilCode(code);
    if (!zerlegt) { setFehler("Der Code lässt sich nicht lesen."); return; }
    if (zerlegt.aspekt !== aspekt) {
      const fremd = ASPEKTE.find((a) => a.key === zerlegt.aspekt)?.label ?? zerlegt.aspekt;
      setFehler(`Dieser Code gehört zu „${fremd}“, nicht zu „${label}“.`);
      return;
    }
    try {
      onChange(wendeTeilCodeAn(rules, code));
      onGeladen?.(aspekt, code);
      setWert("");
    } catch {
      setFehler("Der Code ließ sich nicht anwenden.");
    }
  };

  const teilen = async () => {
    try {
      await navigator.clipboard.writeText(bildeTeilCode(rules, aspekt));
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1500);
    } catch { /* ohne Zwischenablage bleibt der Knopf wirkungslos */ }
  };

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.line}`,
      borderRadius: RUND.karte, padding: "10px 11px", marginBottom: 12,
    }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
        Teil-Code für <b style={{ color: C.text }}>{label}</b> — ändert nur diesen
        Abschnitt, alles andere bleibt
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input
          value={wert}
          onChange={(e) => setWert(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") laden(); }}
          placeholder="TS2A-…"
          style={{
            flex: 1, minWidth: 140, ...TAPZIEL, padding: "0 12px", borderRadius: RUND.karte,
            border: `1px solid ${C.line}`, background: C.ink, color: C.text,
            fontSize: 13, fontFamily: MONO, outline: "none",
          }}
        />
        <button type="button" onClick={laden} disabled={!wert.trim()} style={{
          ...TAPZIEL, padding: "0 16px", borderRadius: RUND.karte, border: "none",
          background: wert.trim() ? C.akzent : C.surface2,
          color: wert.trim() ? C.ink : C.muted,
          fontWeight: 700, fontSize: 13, fontFamily: "inherit",
          cursor: wert.trim() ? "pointer" : "default",
        }}>laden</button>
        <button type="button" onClick={teilen} style={{
          ...TAPZIEL, padding: "0 14px", borderRadius: RUND.karte,
          border: `1px solid ${C.line}`, background: C.surface, color: C.muted,
          fontSize: 12, fontFamily: "inherit", cursor: "pointer",
        }}>{kopiert ? "kopiert" : "teilen"}</button>
      </div>

      {fehler && (
        <div style={{ fontSize: 12, color: C.coral, marginTop: 6, lineHeight: 1.45 }}>{fehler}</div>
      )}

      {geladen && !fehler && (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, fontFamily: MONO }}>
          zuletzt geladen: {geladen.slice(0, 26)}…
        </div>
      )}
    </div>
  );
}
