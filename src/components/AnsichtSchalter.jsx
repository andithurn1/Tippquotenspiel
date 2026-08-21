"use client";

import { C, MONO } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";

// ============================================================
//  ANSICHTS-SCHALTER — Einfach ⇄ Profi
//
//  🔴 Andi am 20.08.2026: „integriere da bitte auch oben rechts genauso wie
//  bei Menü zurück nen Switchschalter der immer da ist."
//
//  Seine Begründung trägt die Bauweise: man will MITTENDRIN wechseln, wenn
//  beim achten Regler auffällt, dass einer fehlt — nicht nur am Anfang.
//  Deshalb ist er klein, sitzt in der klebenden Kopfzeile und nicht im
//  Fließtext, und deshalb sind es ZWEI Zustände statt dreier: ein Schalter
//  mit drei Stellungen ist keiner mehr.
//
//  ⚠️ Beide Hälften sind IMMER beschriftet, auch die inaktive. Ein Schalter,
//  der nur den aktuellen Zustand zeigt, zwingt zum Raten, was beim Drücken
//  passiert — bei „Profi“ besonders unangenehm, weil man dort Dinge sieht,
//  die man vielleicht gar nicht sehen will.
//
//  ⚠️ Die 44 px stecken in der FLÄCHE (`TAPZIEL`), nicht in der Schrift.
//  Größerer Text allein vergrößert das Tippziel nicht.
// ============================================================

export const ANSICHTEN = [
  ["einfach", "Einfach"],
  ["profi", "Profi"],
];

export default function AnsichtSchalter({ stufe, onWechsel }) {
  return (
    <div
      role="group"
      aria-label="Ansicht"
      style={{
        display: "flex", gap: 2, flexShrink: 0,
        background: C.surface, border: `1px solid ${C.line}`,
        // R2 (12 px) — Andis bevorzugter Radius. Innen 10, damit die Hälften
        // nicht über die Außenkante hinausstehen.
        borderRadius: 12, padding: 2,
      }}
    >
      {ANSICHTEN.map(([key, label]) => {
        const an = stufe === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={an}
            onClick={() => onWechsel(key)}
            style={{
              ...TAPZIEL,
              cursor: "pointer", fontFamily: MONO, fontSize: 12,
              fontWeight: an ? 700 : 400,
              padding: "0 12px", borderRadius: 10, border: "none",
              background: an ? C.akzent : "transparent",
              color: an ? C.ink : C.muted,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
