import { describe, it, expect } from "vitest";
import { sanitizePrefs, DEFAULT_PREFS, LEVELS, START_SCREENS } from "./prefs";

describe("sanitizePrefs", () => {
  it("leeres/kaputtes Objekt ergibt Defaults", () => {
    expect(sanitizePrefs()).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs({ abrechnung: "quatsch", vorschau: 5 })).toEqual(DEFAULT_PREFS);
  });

  it("gültige Stufen bleiben erhalten", () => {
    for (const lv of LEVELS) {
      expect(sanitizePrefs({ abrechnung: lv, vorschau: lv })).toEqual({ abrechnung: lv, vorschau: lv, startScreen: "menu" });
    }
  });

  it("verwirft Fremdschlüssel", () => {
    const p = sanitizePrefs({ abrechnung: "aus", hack: true });
    expect(p.hack).toBeUndefined();
    expect(p.abrechnung).toBe("aus");
  });

  it("startScreen: Standard ist 'menu', ungültige Werte fallen darauf zurück", () => {
    expect(sanitizePrefs({}).startScreen).toBe("menu");
    expect(sanitizePrefs({ startScreen: "quatsch" }).startScreen).toBe("menu");
    for (const s of START_SCREENS) expect(sanitizePrefs({ startScreen: s }).startScreen).toBe(s);
  });
});
