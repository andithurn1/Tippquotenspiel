import { describe, it, expect } from "vitest";
import { previewArchetypes } from "./rulePreview";
import { DEFAULT_RULES } from "./engine";

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
