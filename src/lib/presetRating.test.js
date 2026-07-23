import { describe, it, expect } from "vitest";
import { ratePreset } from "./presetRating";
import { archetypeDistribution, ARCHETYPE_FREQ } from "./bundesligaStats";
import { DEFAULT_RULES } from "./engine";

describe("bundesligaStats — Verteilung", () => {
  it("die Spielart-Häufigkeiten summieren sich auf 1", () => {
    const sum = Object.values(ARCHETYPE_FREQ).reduce((s, v) => s + v, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("archetypeDistribution ist absteigend nach Häufigkeit sortiert", () => {
    const d = archetypeDistribution();
    for (let i = 1; i < d.length; i++) expect(d[i - 1].freq).toBeGreaterThanOrEqual(d[i].freq);
  });
});

describe("ratePreset — Underdog-Neigung", () => {
  it("Standard-Regelwerk liefert eine gültige Kennzahl 0–100 mit Label", () => {
    const r = ratePreset(DEFAULT_RULES);
    expect(r.underdogLean).toBeGreaterThanOrEqual(0);
    expect(r.underdogLean).toBeLessThanOrEqual(100);
    expect(typeof r.label).toBe("string");
    expect(r.surprisePremium).toBeGreaterThan(1); // Außenseiter zahlt mehr als Favorit
  });

  it("Underdog-Boost erhöht die Neigung, Favoriten-Malus ebenfalls", () => {
    const base = ratePreset(DEFAULT_RULES).underdogLean;
    const boosted = ratePreset({ ...DEFAULT_RULES, underdogBoost: 2.5, underdogRampStart: 2, underdogRampEnd: 6 }).underdogLean;
    const withMalus = ratePreset({ ...DEFAULT_RULES, favFlopPenalty: 15 }).underdogLean;
    expect(boosted).toBeGreaterThan(base);
    expect(withMalus).toBeGreaterThan(base);
  });

  it("Favoriten-Malus schlägt sich im Favoriten-Risiko nieder (Prozent > 0)", () => {
    expect(ratePreset({ ...DEFAULT_RULES, favFlopPenalty: 15 }).favFlopEffect).toBeGreaterThan(0);
    expect(ratePreset(DEFAULT_RULES).favFlopEffect).toBe(0);
  });
});
