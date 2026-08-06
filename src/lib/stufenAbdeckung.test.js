import { describe, it, expect } from "vitest";
import { abdeckung, luecken, ueberholteBegruendungen, NUR_PROFI, regelFelder } from "@/lib/stufenAbdeckung";

// 🔴 Diese Tests prüfen keine Rechnung, sondern eine Hausregel: kommt ein
// Admin an jede Einstellung heran, ohne in die Profi-Ansicht zu gehen — und
// wenn nicht, steht dann WENIGSTENS eine Begründung da?
//
// Der Anlass: `rules.ereignisse` war gebaut, wirksam und überall richtig
// angezeigt — und trotzdem unfertig, weil kein Charakter und kein einfacher
// Regler sie je erwähnte. Weder `npm run greift` noch `npm run anzeige` können
// das sehen; beide fragen etwas anderes.

// Der Stand bei Einführung der Messung (06.08.2026). Die Zahl steht hier als
// SPERRKLINKE: sie darf sinken, aber nicht steigen. Ein neuer Regelblock, der
// nur in der Profi-Ansicht landet, lässt diesen Test auffallen — genau das war
// bei `ereignisse` monatelang niemandem aufgefallen.
const LUECKEN_BEI_EINFUEHRUNG = 1;

describe("Stufen-Abdeckung", () => {
  it("jedes Regel-Feld taucht genau einmal auf", () => {
    const a = abdeckung();
    expect(a.map((x) => x.feld).sort()).toEqual(regelFelder().sort());
    expect(new Set(a.map((x) => x.feld)).size).toBe(a.length);
  });

  it("die Zahl der Lücken wächst NICHT", () => {
    const offen = luecken();
    expect(offen.length).toBeLessThanOrEqual(LUECKEN_BEI_EINFUEHRUNG);
  });

  it("die eine verbliebene Lücke ist `wettbewerbe` — und die ist bewusst vertagt", () => {
    // Die Wettbewerbs-Gewichte gehören in den Gewichtungs-Durchgang am Ende
    // (Nutzer-Reihenfolge Punkt 4, „bewusst grob, 2-/5-Prozent-Stufen"). Sie
    // hier vorher mit erfundenen Stufen zu belegen, hiesse Balance-Arbeit an
    // der falschen Stelle. Der Test hält fest, dass es GENAU diese eine ist —
    // eine zweite wäre ein neuer Befund.
    expect(luecken()).toEqual(["wettbewerbe"]);
  });

  it("keine Begründung ist überholt", () => {
    // Ein Feld, das inzwischen auf Stufe 1/2 erreichbar ist, darf keinen
    // `NUR_PROFI`-Eintrag mehr haben — sonst steht dort eine Behauptung, die
    // das Gegenteil beschreibt, und beim nächsten Durchgang glaubt sie jemand.
    expect(ueberholteBegruendungen()).toEqual([]);
  });

  it("jede Begründung ist ein SATZ, kein Platzhalter", () => {
    for (const [feld, text] of Object.entries(NUR_PROFI)) {
      expect(typeof text, feld).toBe("string");
      // Kurz genug zum Hinschreiben, lang genug zum Vertreten.
      expect(text.length, feld).toBeGreaterThan(60);
    }
  });

  it("jedes begründete Feld existiert überhaupt", () => {
    // Ein Eintrag für ein Feld, das es nicht mehr gibt, verdeckt die Zählung:
    // die Liste sähe gepflegt aus und deckte nichts ab.
    for (const feld of Object.keys(NUR_PROFI)) {
      expect(regelFelder(), feld).toContain(feld);
    }
  });

  it("die Ereignisse sind auf allen drei Stufen erreichbar — der Anlass der Messung", () => {
    const e = abdeckung().find((a) => a.feld === "ereignisse");
    expect(e.stufe1).toBe(true);
    expect(e.stufe2).toBe(true);
  });
});
