import { describe, it, expect } from "vitest";
import { previewArchetypes, recommendedDisplayScale } from "./rulePreview";
import { DEFAULT_RULES, RULE_LIMITS, sanitizeRules } from "./engine";

describe("previewArchetypes — Live-Vorschau der Spielarten", () => {
  const rows = previewArchetypes(DEFAULT_RULES);

  it("liefert alle typischen Spielarten mit Tipps und Punkten", () => {
    expect(rows.map((r) => r.key)).toEqual([
      "favorit", "wenig-tore", "torfestival", "aussenseiter", "remis",
    ]);
    for (const r of rows) {
      expect(r.tips.length).toBeGreaterThanOrEqual(2);
      for (const t of r.tips) expect(Number.isFinite(t.points)).toBe(true);
      expect(r.winnerQuote).toBeGreaterThanOrEqual(1);
    }
  });

  it("der exakte Tipp ist je Spielart nie schlechter als die nahen Alternativen", () => {
    for (const r of rows) {
      const exakt = r.tips.find((t) => t.kind === "exakt");
      if (!exakt) continue;
      for (const t of r.tips) expect(exakt.points).toBeGreaterThanOrEqual(t.points);
    }
  });

  it("Außenseiter-Sieg hat eine deutlich höhere Sieger-Quote als der dominante Favorit", () => {
    const fav = rows.find((r) => r.key === "favorit");
    const dog = rows.find((r) => r.key === "aussenseiter");
    expect(dog.winnerQuote).toBeGreaterThan(fav.winnerQuote);
  });

  it("Underdog-Boost hebt gezielt die Außenseiter-Spielart, nicht den Favoriten", () => {
    const boosted = { ...DEFAULT_RULES, underdogBoost: 2.5, underdogRampStart: 2, underdogRampEnd: 6 };
    const base = previewArchetypes(DEFAULT_RULES);
    const withBoost = previewArchetypes(boosted);

    const favBase = base.find((r) => r.key === "favorit").best;
    const favBoost = withBoost.find((r) => r.key === "favorit").best;
    const dogBase = base.find((r) => r.key === "aussenseiter").best;
    const dogBoost = withBoost.find((r) => r.key === "aussenseiter").best;

    expect(dogBoost).toBeGreaterThan(dogBase);          // Außenseiter zahlt mehr
    expect(favBoost).toBe(favBase);                     // Favorit unberührt (Quote unter Ramp)
  });
});

describe("previewArchetypes — Joker in der Beispielauswertung", () => {
  const mitJoker = sanitizeRules({ ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 2 } });

  it("ohne Joker bleibt die Spalte leer (UI blendet sie aus)", () => {
    for (const r of previewArchetypes(DEFAULT_RULES)) {
      expect(r.jokerFaktorMax).toBe(1);
      for (const t of r.tips) expect(t.pointsJoker).toBeNull();
    }
  });

  it("mit Joker zeigt jede Spielart zusätzlich den gewichteten Wert", () => {
    for (const r of previewArchetypes(mitJoker)) {
      expect(r.jokerFaktorMax).toBe(2);
      for (const t of r.tips) {
        expect(Number.isFinite(t.pointsJoker)).toBe(true);
        if (t.points > 0) expect(t.pointsJoker).toBeGreaterThan(t.points);
      }
    }
  });

  it("Ranking-Modus nutzt den größten Pool-Wert für die Vorschau", () => {
    const rank = sanitizeRules({ ...DEFAULT_RULES, joker: { enabled: true, modus: "ranking", faktoren: [1.5, 1.2, 1] } });
    for (const r of previewArchetypes(rank)) expect(r.jokerFaktorMax).toBe(1.5);
  });
});

describe("recommendedDisplayScale — Empfehlung für angenehme Werte", () => {
  it("liegt innerhalb der Regler-Grenzen", () => {
    const s = recommendedDisplayScale(DEFAULT_RULES);
    expect(s).toBeGreaterThanOrEqual(RULE_LIMITS.displayScale.min);
    expect(s).toBeLessThanOrEqual(RULE_LIMITS.displayScale.max);
  });

  it("bringt exakte Tipps grob in die Nähe des Zielwerts", () => {
    const ziel = 500;
    const skala = recommendedDisplayScale(DEFAULT_RULES, ziel);
    const rows = previewArchetypes({ ...DEFAULT_RULES, displayScale: skala, perGameCap: null });
    const exakte = rows.map((r) => r.tips.find((t) => t.kind === "exakt")?.points).filter(Number.isFinite);
    const schnitt = exakte.reduce((s, v) => s + v, 0) / exakte.length;
    expect(schnitt).toBeGreaterThan(ziel * 0.5);
    expect(schnitt).toBeLessThan(ziel * 2);
  });

  it("aktiver Joker senkt die Empfehlung — Spitzenwerte bleiben im Rahmen", () => {
    const ohne = recommendedDisplayScale(DEFAULT_RULES);
    const mit = recommendedDisplayScale(sanitizeRules({
      ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 2 },
    }));
    expect(mit).toBeLessThan(ohne);
  });
});
