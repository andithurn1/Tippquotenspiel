"use client";

import { C, MONO } from "@/lib/theme";
import { zahl } from "@/lib/format";

// ── Münzen-Anzeige — EINE Stelle für die Münzen-Währung ─────
//
// Zeigt den Münzstand (`src/lib/muenzstand.js`), zwei Größen:
//   <Waehrungen stand={…} kompakt />   Schnellmenü: eine Zeile je Runde
//   <Waehrungen stand={…} />           Hub/Tippen: mit Balken
//
// `stand === null` (kein Joker im Modus „einsatz" oder kein offener Spieltag,
// design/waehrungen.md 4) → diese Komponente rendert NULL, keine leere Hülle.
// Eine leere Fläche wäre noch ehrlich; ein „0 von 0" sähe nach einer Auskunft
// aus, die es nicht gibt.
//
// 🔴 Narren (der Shop-Kontostand, `rules.budget`) werden hier bewusst NICHT
// angezeigt. `kannBezahlen`/`budgetVerlauf` haben laut design/kontaktstellen.md
// NULL Aufrufer im Spielbetrieb — es gibt heute keinen echten Narren-
// Kontostand, nur ein Regelwerk, das beschreibt, wie er entstünde. Ein „0"
// oder ein ausgegrautes Feld sähe aus wie eine Auskunft und wäre keine
// (design/waehrungen.md 4). Sobald `budget.enabled` UND die Verkabelung aus
// kontaktstellen.md stehen, kommt hier ein zweites Feld dazu — vorher nicht.
export default function Waehrungen({ stand, kompakt = false }) {
  if (!stand) return null;

  if (kompakt) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        fontFamily: MONO, fontSize: 11, color: C.muted,
      }}>
        <span>🪙</span>
        <span style={{ color: C.gold, fontWeight: 700 }}>{zahl(stand.frei)}</span>
        <span>von {zahl(stand.budget)}</span>
      </div>
    );
  }

  const anteil = stand.budget > 0 ? Math.max(0, Math.min(100, (stand.verteilt / stand.budget) * 100)) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
          🪙 Münzen — Spieltag {stand.spieltag?.matchday ?? "?"}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.gold }}>
          {zahl(stand.frei)} frei
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>
        {zahl(stand.verteilt)} von {zahl(stand.budget)} Münzen verteilt
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 999, background: C.line, marginTop: 5 }}>
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 999, background: C.gold,
          width: `${anteil}%`,
        }} />
      </div>
    </div>
  );
}
