import { describe, it, expect } from "vitest";
import { CAP, zerfallAusQuoten, reihenQuote, ergebnisQuote, istGeschaetzt } from "@/lib/randquoten";
import { scoreTip, DEFAULT_RULES } from "@/lib/engine";

// Ein 6×6-Raster, wie es aus dem MARKT kommt — dort bleibt es klein, weil kein
// Buchmacher 81 Endstände quotiert.
const MARKT = {
  matchId: "m1",
  home: "Heim", away: "Gast",
  winner: { home: 1.4, draw: 5, away: 8 },
  correctScore: [
    [26, 60, 220, 900, 3000, 9000],
    [12, 22, 80, 340, 1200, 4000],
    [9, 15, 55, 240, 900, 3000],
    [9, 16, 60, 260, 1000, 3500],
    [12, 22, 85, 380, 1500, 5000],
    [20, 38, 150, 700, 2600, 9000],
  ],
  teamGoals: { home: [3, 2.2, 2.6, 4.5, 9, 20], away: [1.6, 2.1, 4.2, 11, 30, 80] },
  margin: { home: [0, 3, 4.5, 8, 16, 40], away: [0, 4, 9, 22, 60, 150] },
};

describe("Zerfall wird ohne die Rasterkante geschätzt", () => {
  // 🔴 Der gemessene Befund: auf der letzten Stufe staut sich, was darüber
  // hinausgeht. Wer von dort extrapoliert, hält den Stau für den Schwanz.
  it("überspringt die letzte Stufe", () => {
    // Sauberer Zerfall 0,5 — die letzte Stufe ist künstlich aufgestaut.
    const quoten = [2, 4, 8, 16, 17];     // p: 0,5 0,25 0,125 0,0625 0,059
    const r = zerfallAusQuoten(quoten);
    expect(r).toBeCloseTo(0.5, 2);        // nicht 0,94 (= die Kante)
  });

  it("kappt einen Zerfall über 0,9 — sonst dreht sich die Reihe um", () => {
    expect(zerfallAusQuoten([10, 10, 10, 10])).toBeLessThanOrEqual(0.9);
  });

  it("fällt bei zu wenigen Stützstellen auf einen vorsichtigen Standard zurück", () => {
    const r = zerfallAusQuoten([5, 9]);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(1);
  });
});

describe("Eine Reihe fortschreiben (Team-Tore, Abstand)", () => {
  it("innerhalb der Reihe kommt die ECHTE Quote, unmarkiert", () => {
    const r = reihenQuote(MARKT.teamGoals.home, 2);
    expect(r).toEqual({ quote: 2.6, geschaetzt: false });
  });

  it("außerhalb kommt eine markierte Schätzung", () => {
    const r = reihenQuote(MARKT.teamGoals.home, 6);
    expect(r.geschaetzt).toBe(true);
    expect(r.quote).toBeGreaterThan(20);        // mehr als die letzte echte
  });

  it("die Reihe bleibt monoton — 7 Tore zahlen mehr als 6", () => {
    const sechs = reihenQuote(MARKT.teamGoals.home, 6).quote;
    const sieben = reihenQuote(MARKT.teamGoals.home, 7).quote;
    expect(sieben).toBeGreaterThanOrEqual(sechs);
  });

  it("kommt ohne Reihe klar", () => {
    expect(reihenQuote(null, 3).quote).toBeNull();
    expect(reihenQuote([], 3).quote).toBeNull();
  });
});

describe("Das Ergebnis-Raster fortschreiben", () => {
  it("innerhalb des Rasters ändert sich NICHTS", () => {
    expect(ergebnisQuote(MARKT, 2, 1)).toEqual({ quote: 15, geschaetzt: false });
    expect(istGeschaetzt(MARKT, 2, 1)).toBe(false);
  });

  it("außerhalb kommt eine markierte Quote statt gar keiner", () => {
    const r = ergebnisQuote(MARKT, 6, 0);
    expect(r.geschaetzt).toBe(true);
    expect(r.quote).toBeGreaterThan(0);
  });

  // 🔴 Das eigentliche Versprechen: der seltenere Endstand zahlt mehr.
  it("6:0 ist teurer als 5:0, 7:0 teurer als 6:0", () => {
    const fuenf = ergebnisQuote(MARKT, 5, 0).quote;
    const sechs = ergebnisQuote(MARKT, 6, 0).quote;
    const sieben = ergebnisQuote(MARKT, 7, 0).quote;
    expect(sechs).toBeGreaterThan(fuenf);
    expect(sieben).toBeGreaterThanOrEqual(sechs);
  });

  it("läuft nicht ins Unendliche — der Deckel hält", () => {
    const q = ergebnisQuote(MARKT, 9, 9).quote;
    const hoechsteEchte = Math.max(...MARKT.correctScore.flat());
    expect(q).toBeLessThanOrEqual(Math.max(CAP, hoechsteEchte));
  });

  it("kommt ohne Raster klar", () => {
    expect(ergebnisQuote({}, 6, 0).quote).toBeNull();
    expect(ergebnisQuote(null, 6, 0).quote).toBeNull();
  });
});

// ── Die Naht zur Wertung ────────────────────────────────────
// Der Beweis, dass die Fortschreibung in `scoreTip` ankommt — genau die Lücke,
// die vorher niemandem auffiel, weil sie wie ein schlechter Tipp aussah.
describe("In der Wertung angekommen", () => {
  const tipAuf = (h, a) => ({ home: h, away: a, goals: { home: [], away: [] } });

  it("ein exakt getipptes 6:0 zahlt jetzt mehr als ein exakt getipptes 3:0", () => {
    const weit = scoreTip(tipAuf(6, 0), { home: 6, away: 0, playerGoals: null }, MARKT, DEFAULT_RULES);
    const nah = scoreTip(tipAuf(3, 0), { home: 3, away: 0, playerGoals: null }, MARKT, DEFAULT_RULES);
    expect(weit.total).toBeGreaterThan(nah.total);
  });

  it("und es zahlt überhaupt etwas — vorher war der Nähe-Teil 0", () => {
    const s = scoreTip(tipAuf(7, 1), { home: 7, away: 1, playerGoals: null }, MARKT, DEFAULT_RULES);
    expect(s.parts.ergNaehe).toBeGreaterThan(0);
  });

  it("innerhalb des Rasters bleibt die Wertung unverändert", () => {
    // Die Sicherung darf nur greifen, wo vorher nichts stand.
    const s = scoreTip(tipAuf(2, 1), { home: 2, away: 1, playerGoals: null }, MARKT, DEFAULT_RULES);
    expect(s.parts.ergNaehe).toBeCloseTo(15, 5);
  });
});
