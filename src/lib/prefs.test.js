import { describe, it, expect } from "vitest";
import {
  sanitizePrefs, DEFAULT_PREFS, LEVELS, START_SCREENS,
  BEWEGUNG_STUFEN, BEWEGUNG_LABEL, BEWEGUNG_HINWEIS,
  RASTER_WEITEN, RASTER_WEITE_LABEL, RASTER_WEITE_HINWEIS,
} from "./prefs";

describe("sanitizePrefs", () => {
  it("leeres/kaputtes Objekt ergibt Defaults", () => {
    expect(sanitizePrefs()).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs({ abrechnung: "quatsch", vorschau: 5 })).toEqual(DEFAULT_PREFS);
  });

  it("gültige Stufen bleiben erhalten", () => {
    for (const lv of LEVELS) {
      expect(sanitizePrefs({ abrechnung: lv, vorschau: lv, zwischenabrechnung: lv }))
        .toEqual({ abrechnung: lv, vorschau: lv, zwischenabrechnung: lv, startScreen: "menu", vergleich: {}, bewegung: "voll", rasterWeite: "raster" });
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

// 🔴 Andi, 25.08.2026: „kann man auch in den account einstellungen verfügbar
// machen, dass jeder individuell solche performanceteuren sachen ausstellen
// kann… aber im normalfall sollts schon klappen."
describe("Bewegungs-Stufe", () => {
  it("die Vorgabe ist VOLL — die Einstellung ist ein Ventil, keine Warnung", () => {
    expect(DEFAULT_PREFS.bewegung).toBe("voll");
    expect(sanitizePrefs({}).bewegung).toBe("voll");
  });

  it("alle drei Stufen kommen durch", () => {
    for (const b of BEWEGUNG_STUFEN) {
      expect(sanitizePrefs({ bewegung: b }).bewegung, b).toBe(b);
    }
  });

  it("Unsinn fällt auf die Vorgabe zurück, statt die App lahmzulegen", () => {
    for (const x of ["irgendwas", 42, null, undefined, {}]) {
      expect(sanitizePrefs({ bewegung: x }).bewegung, String(x)).toBe("voll");
    }
  });

  it("jede Stufe hat eine Beschriftung und einen Hinweis", () => {
    for (const b of BEWEGUNG_STUFEN) {
      expect(BEWEGUNG_LABEL[b], b).toBeTruthy();
      expect(BEWEGUNG_HINWEIS[b]?.length ?? 0, b).toBeGreaterThan(20);
    }
  });
});

// 🔴 Andi, 25.08.2026: „können wir die option zu 1 einstellbar machen? vllt
// auch im account unter den ganzen persönlichen anzeigemöglichkeiten".
describe("Weite des Ergebnis-Rasters", () => {
  it("die Vorgabe bleibt beim Quoten-Raster", () => {
    expect(DEFAULT_PREFS.rasterWeite).toBe("raster");
    expect(sanitizePrefs({}).rasterWeite).toBe("raster");
  });

  it("beide Weiten kommen durch", () => {
    for (const w of RASTER_WEITEN) {
      expect(sanitizePrefs({ rasterWeite: w }).rasterWeite, w).toBe(w);
    }
  });

  it("Unsinn fällt auf die Vorgabe zurück", () => {
    for (const x of ["breit", 9, null, {}]) {
      expect(sanitizePrefs({ rasterWeite: x }).rasterWeite, String(x)).toBe("raster");
    }
  });

  it("jede Weite hat Beschriftung und Hinweis", () => {
    for (const w of RASTER_WEITEN) {
      expect(RASTER_WEITE_LABEL[w], w).toBeTruthy();
      expect(RASTER_WEITE_HINWEIS[w]?.length ?? 0, w).toBeGreaterThan(20);
    }
  });
});
