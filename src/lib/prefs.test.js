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
      expect(sanitizePrefs({ abrechnung: lv, vorschau: lv, zwischenabrechnung: lv }))
        .toEqual({ abrechnung: lv, vorschau: lv, zwischenabrechnung: lv, startScreen: "menu", vergleich: {} });
    }
  });

  // ⚠️ Eine Anzeige-Stufe, die `sanitizePrefs` nicht mitschreibt, fällt beim
  // nächsten Speichern still auf die Vorgabe zurück: der Nutzer stellt die
  // Einblendung ab, und beim übernächsten Öffnen ist sie wieder da. Deshalb
  // hier über ALLE Stufen aus `DEFAULT_PREFS` statt über eine Aufzählung —
  // die nächste vergisst sonst wieder jemand.
  it("keine Stufe fällt beim Säubern hinten runter", () => {
    // Nur die ANZEIGE-Stufen: `startScreen` und `vergleich` sind eigene
    // Wertebereiche und haben ihre eigenen Fälle. Über die Vorgabe erkannt
    // statt aufgezählt — die nächste Stufe vergisst sonst wieder jemand.
    const stufen = Object.keys(DEFAULT_PREFS).filter((k) => LEVELS.includes(DEFAULT_PREFS[k]));
    expect(stufen.length).toBeGreaterThan(2);
    const alleAus = Object.fromEntries(stufen.map((k) => [k, "aus"]));
    const s = sanitizePrefs(alleAus);
    for (const k of stufen) expect(s[k]).toBe("aus");
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
