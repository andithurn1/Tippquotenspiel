import { describe, it, expect } from "vitest";
import { simulateBalance, bewerten } from "./balanceSim";
import { DEFAULT_RULES, sanitizeRules } from "./engine";

// Klein halten, damit die Tests flott bleiben — die Aussagen sind dieselben.
const KLEIN = { seasons: 25, matchdays: 9, perMatchday: 9, seed: 7 };

describe("simulateBalance — Grundverhalten", () => {
  it("liefert plausible Kennzahlen im gültigen Bereich", () => {
    const r = simulateBalance(DEFAULT_RULES, KLEIN);
    expect(r.koennerQuote + r.zockerQuote + r.unentschieden).toBeCloseTo(1, 2);
    expect(r.punkteVerhaeltnis).toBeGreaterThan(0);
    expect(r.modifikatorAnteil).toBeGreaterThanOrEqual(0);
    expect(r.maximalfall).toBeGreaterThan(0);
    expect(["gruen", "gelb", "rot"]).toContain(r.ampel.stufe);
  });

  it("ist deterministisch — gleicher Seed, gleiches Ergebnis", () => {
    expect(simulateBalance(DEFAULT_RULES, KLEIN)).toEqual(simulateBalance(DEFAULT_RULES, KLEIN));
  });

  it("ohne aktiven Joker ist der Modifikator-Anteil 0", () => {
    expect(DEFAULT_RULES.joker.enabled).toBe(false);
    expect(simulateBalance(DEFAULT_RULES, KLEIN).modifikatorAnteil).toBe(0);
  });
});

describe("simulateBalance — erkennt die Kipp-Punkte", () => {
  // Das Punkte-Verhältnis ist die aussagekräftige Kennzahl: die Siegquote
  // sättigt über viele Spiele schon bei winzigem Vorteil bei 100 %.
  it("starker Underdog-Boost verschiebt das Verhältnis zum Zocker", () => {
    const zahm = simulateBalance(DEFAULT_RULES, KLEIN);
    const wild = simulateBalance(sanitizeRules({
      ...DEFAULT_RULES, underdogBoost: 3, underdogRampStart: 1.5, underdogRampEnd: 4,
    }), KLEIN);
    expect(wild.punkteVerhaeltnis).toBeGreaterThan(zahm.punkteVerhaeltnis);
  });

  it("dämpfende Regler holen das Verhältnis zurück Richtung Favorit", () => {
    const standard = simulateBalance(DEFAULT_RULES, KLEIN);
    const gedaempft = simulateBalance(sanitizeRules({
      ...DEFAULT_RULES, winnerFloor: false, wrongPenalty: -5, minPayout: 5, k: 1.2,
    }), KLEIN);
    expect(gedaempft.punkteVerhaeltnis).toBeLessThan(standard.punkteVerhaeltnis);
  });

  it("aktiver Joker hebt den Modifikator-Anteil über 0", () => {
    const r = simulateBalance(sanitizeRules({
      ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 2 },
    }), KLEIN);
    expect(r.modifikatorAnteil).toBeGreaterThan(0);
  });

  it("größerer Joker-Faktor erhöht Modifikator-Anteil und Maximalfall", () => {
    const klein = simulateBalance(sanitizeRules({
      ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 1.2 },
    }), KLEIN);
    const gross = simulateBalance(sanitizeRules({
      ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 2 },
    }), KLEIN);
    expect(gross.modifikatorAnteil).toBeGreaterThan(klein.modifikatorAnteil);
    expect(gross.maximalfall).toBeGreaterThan(klein.maximalfall);
  });
});

describe("bewerten — Ampel über das Punkte-Verhältnis", () => {
  it("ausgewogen, wenn beide Strategien etwa gleichauf liegen", () => {
    expect(bewerten(1.0, 0.05).stufe).toBe("gruen");
    expect(bewerten(1.15, 0.1).stufe).toBe("gruen");
  });

  it("gelb, wenn Außenseiter-Setzen spürbar mehr bringt", () => {
    expect(bewerten(1.25, 0.05).stufe).toBe("gelb");
  });

  it("gelb auch bei zu hohem Modifikator-Anteil", () => {
    expect(bewerten(1.0, 0.28).stufe).toBe("gelb");
  });

  it("gelb, wenn Überraschungen gar nicht mehr zahlen", () => {
    const r = bewerten(0.6, 0.05);
    expect(r.stufe).toBe("gelb");
    expect(r.titel).toMatch(/favoritenlastig/);
  });

  it("rot, wenn Glück das Können klar schlägt", () => {
    const r = bewerten(1.6, 0.05);
    expect(r.stufe).toBe("rot");
    expect(r.titel).toMatch(/Glück/);
  });

  it("rot, wenn Modifikatoren dominieren", () => {
    const r = bewerten(1.0, 0.4);
    expect(r.stufe).toBe("rot");
    expect(r.titel).toMatch(/Modifikatoren/);
  });

  it("jede Stufe hat Titel und Klartext", () => {
    for (const [v, m] of [[1.0, 0.05], [1.25, 0.05], [1.6, 0.05], [1.0, 0.4], [0.6, 0.05]]) {
      const r = bewerten(v, m);
      expect(r.titel).toBeTruthy();
      expect(r.text.length).toBeGreaterThan(20);
    }
  });
});
