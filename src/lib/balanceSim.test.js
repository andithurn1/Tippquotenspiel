import { describe, it, expect } from "vitest";
import { simulateBalance, bewerten } from "./balanceSim";
import { DEFAULT_RULES, sanitizeRules } from "./engine";

// Klein halten, damit die Tests flott bleiben — die Aussagen sind dieselben.
const KLEIN = { seasons: 25, matchdays: 9, perMatchday: 9, seed: 7 };

describe("simulateBalance — Grundverhalten", () => {
  it("liefert plausible Kennzahlen im gültigen Bereich", () => {
    const r = simulateBalance(DEFAULT_RULES, KLEIN);
    // Die Siegquoten aller Typen ergeben zusammen 1 (jede Saison hat genau
    // einen Sieger).
    const summe = r.profile.reduce((s, p) => s + p.siegquote, 0);
    expect(summe).toBeCloseTo(1, 2);
    expect(r.profile).toHaveLength(5);
    expect(r.punkteVerhaeltnis).toBeGreaterThan(0);
    expect(r.modifikatorAnteil).toBeGreaterThanOrEqual(0);
    expect(r.maximalfall).toBeGreaterThan(0);
    expect(["gruen", "gelb", "rot"]).toContain(r.ampel.stufe);
  });

  it("der Kenner erwischt rund jede vierte Überraschung (Modell-Richtwert)", () => {
    const r = simulateBalance(DEFAULT_RULES, KLEIN);
    const anteil = (k) => r.profile.find((p) => p.key === k).ueberraschungsAnteil;
    expect(anteil("favorit")).toBe(0);          // tippt nie den Außenseiter
    expect(anteil("zocker")).toBe(1);           // ist bei jeder dabei
    expect(anteil("kenner")).toBeGreaterThan(0.15);
    expect(anteil("kenner")).toBeLessThan(0.45);
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

describe("bewerten — Ampel danach, WER gewinnt", () => {
  const lage = (patch) => bewerten({
    gewinner: "kenner", kennerQuote: 0.6, zockerQuote: 0.1,
    favoritQuote: 0.05, modifikatorAnteil: 0.05, ...patch,
  });

  it("grün, wenn der Kenner die Runde gewinnt", () => {
    expect(lage({}).stufe).toBe("gruen");
  });

  it("grün auch, wenn der solide Tipper vorn liegt", () => {
    expect(lage({ gewinner: "solide" }).stufe).toBe("gruen");
  });

  it("rot, wenn der Dauerzocker gewinnt", () => {
    const r = lage({ gewinner: "zocker", zockerQuote: 0.6 });
    expect(r.stufe).toBe("rot");
    expect(r.titel).toMatch(/Glück/);
  });

  it("gelb, wenn nur der Favoriten-Tipper gewinnt (Mut lohnt nicht)", () => {
    const r = lage({ gewinner: "favorit", favoritQuote: 0.6 });
    expect(r.stufe).toBe("gelb");
    expect(r.titel).toMatch(/Mut/);
  });

  it("gelb, wenn wildes Tippen sich durchsetzt", () => {
    expect(lage({ gewinner: "mutig" }).stufe).toBe("gelb");
  });

  it("rot, wenn Modifikatoren dominieren — unabhängig vom Sieger", () => {
    const r = lage({ modifikatorAnteil: 0.4 });
    expect(r.stufe).toBe("rot");
    expect(r.titel).toMatch(/Modifikatoren/);
  });

  it("jede Lage hat Titel und Klartext", () => {
    for (const patch of [{}, { gewinner: "zocker", zockerQuote: 0.6 }, { gewinner: "favorit", favoritQuote: 0.6 },
                         { gewinner: "mutig" }, { modifikatorAnteil: 0.4 }]) {
      const r = lage(patch);
      expect(r.titel).toBeTruthy();
      expect(r.text.length).toBeGreaterThan(20);
    }
  });
});
