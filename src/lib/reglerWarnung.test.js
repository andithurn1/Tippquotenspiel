import { describe, it, expect } from "vitest";
import {
  BAND_FELDER, band, pruefe, korrigieren, zusammenfassung, rohModifikator,
} from "@/lib/reglerWarnung";
import { DEFAULT_RULES, sanitizeRules, RULE_LIMITS, maxTotalModifier } from "@/lib/engine";
import { PRESETS } from "@/lib/presets";
import { CHARAKTERE } from "@/lib/charaktere";

const BASIS = PRESETS[0].rules;

describe("Bänder", () => {
  it("jedes Band liegt innerhalb der harten Regler-Grenzen", () => {
    for (const feld of BAND_FELDER) {
      const b = band(feld.pfad);
      expect(b.von).toBeGreaterThanOrEqual(b.min);
      expect(b.bis).toBeLessThanOrEqual(b.max);
      expect(b.von).toBeLessThanOrEqual(b.bis);
    }
  });

  it("jedes Feld hat einen Text in mindestens eine Richtung", () => {
    for (const feld of BAND_FELDER) {
      expect(feld.label.length).toBeGreaterThan(3);
      expect((feld.hoch || "") + (feld.tief || "")).not.toBe("");
    }
  });

  it("unbekannte Felder haben kein Band", () => {
    expect(band("gibtsnicht")).toBeNull();
  });
});

describe("Die erprobten Regelwerke lösen keine Warnung aus", () => {
  // Das ist der eigentliche Sinn: Was durchgemessen ist, gilt als in Ordnung.
  // Schlägt dieser Test an, ist entweder ein Preset aus der Balance gelaufen
  // oder ein Band zu eng — beides will man wissen.
  for (const p of PRESETS) {
    it(`Preset „${p.label}“ ist warnungsfrei`, () => {
      const warnungen = pruefe(p.rules).filter((w) => w.stufe === "warnung");
      expect(warnungen).toEqual([]);
    });
  }

  for (const ch of CHARAKTERE) {
    it(`Charakter „${ch.label}“ ist warnungsfrei`, () => {
      const warnungen = pruefe(ch.rules).filter((w) => w.stufe === "warnung");
      expect(warnungen).toEqual([]);
    });
  }
});

describe("Extreme Werte werden erkannt", () => {
  it("der nackte Fallback fällt auf — er ist ungedämpft", () => {
    // DEFAULT_RULES ist der technische Ausgangspunkt, nicht ein Vorschlag:
    // ohne Abzug und ohne Cutoff gewinnt der Dauerzocker (siehe presets.js).
    const w = pruefe(DEFAULT_RULES);
    expect(w.some((x) => x.id === "gratis-lose")).toBe(true);
  });

  it("ein Joker weit über dem Deckel meldet den Modifikator-Turm", () => {
    const r = sanitizeRules({
      ...BASIS, modCap: 4,
      joker: { enabled: true, modus: "einzel", faktor: 2, heimat: { enabled: true, faktor: 2 }, mut: { enabled: true, faktor: 1.2 } },
      teamMods: { derbyFaktor: 2, teams: {} },
    });
    const w = pruefe(r);
    expect(w.some((x) => x.id === "modifikator-turm")).toBe(true);
    expect(maxTotalModifier(r)).toBeGreaterThanOrEqual(3);
  });

  it("ein zu tiefer Deckel meldet, dass er abschneidet", () => {
    const r = sanitizeRules({
      ...BASIS, modCap: 1.2,
      joker: { enabled: true, modus: "einzel", faktor: 2 },
    });
    expect(pruefe(r).some((x) => x.id === "deckel-beisst")).toBe(true);
  });

  it("exakt ≈ abstand meldet den fehlenden Reiz", () => {
    const r = sanitizeRules({ ...BASIS, combo: { tendenz: 1.15, abstand: 1.5, exakt: 1.6 } });
    expect(pruefe(r).some((x) => x.id === "kein-unterschied")).toBe(true);
  });

  it("Versäumnis ohne Abzug wird angemerkt", () => {
    const r = sanitizeRules({
      ...BASIS,
      versaeumnis: { enabled: true, strategie: "wahrscheinlich", malusProzent: 0, maxProSaison: 3 },
    });
    expect(pruefe(r).some((x) => x.id === "versaeumnis-lohnt")).toBe(true);
  });

  it("ein Regler am oberen Anschlag ist eine Warnung, kein Hinweis", () => {
    const r = sanitizeRules({ ...BASIS, underdogBoost: RULE_LIMITS.underdogBoost.max });
    const w = pruefe(r).find((x) => x.id === "underdogBoost");
    expect(w).toBeTruthy();
    expect(w.stufe).toBe("warnung");
    expect(w.richtung).toBe("hoch");
  });

  it("abgeschaltete Ebenen erzeugen keine Warnung", () => {
    // Ein extremer Heimatbonus ist egal, solange der Joker aus ist.
    const r = sanitizeRules({
      ...BASIS,
      joker: { enabled: false, heimat: { enabled: true, faktor: 2 } },
    });
    expect(pruefe(r).some((x) => x.id === "joker.heimat.faktor")).toBe(false);
  });
});

describe("Korrigieren", () => {
  it("jede gemeldete Warnung lässt sich auflösen", () => {
    const kaputt = sanitizeRules({
      ...DEFAULT_RULES, modCap: 4, underdogBoost: 3, favFlopPenalty: 20,
      joker: { enabled: true, modus: "einzel", faktor: 2, heimat: { enabled: true, faktor: 2 }, mut: { enabled: true, faktor: 1.2 } },
      teamMods: { derbyFaktor: 2, teams: {} },
      combo: { tendenz: 1.15, abstand: 1.5, exakt: 1.6 },
    });
    let r = kaputt;
    // Immer die erste Meldung auflösen, bis nichts mehr kommt. Endlich muss
    // das sein — sonst dreht sich die UI im Kreis.
    for (let i = 0; i < 40 && pruefe(r).length; i++) {
      r = korrigieren(r, pruefe(r)[0].id);
    }
    expect(pruefe(r)).toEqual([]);
  });

  it("das Ergebnis bleibt ein gültiges Regelwerk", () => {
    const r = korrigieren(DEFAULT_RULES, "gratis-lose");
    expect(sanitizeRules(r)).toEqual(r);
    expect(pruefe(r).some((x) => x.id === "gratis-lose")).toBe(false);
  });

  it("unbekannte IDs ändern nichts", () => {
    expect(korrigieren(BASIS, "gibtsnicht")).toEqual(sanitizeRules(BASIS));
  });

  it("eine Feld-Korrektur rührt die anderen Felder nicht an", () => {
    const r = sanitizeRules({ ...BASIS, underdogBoost: 3 });
    const fix = korrigieren(r, "underdogBoost");
    expect(fix.underdogBoost).toBeLessThan(3);
    expect(fix.k).toBe(r.k);
    expect(fix.minPayout).toBe(r.minPayout);
  });
});

describe("rohModifikator", () => {
  it("addiert die Aufschläge, ohne zu deckeln", () => {
    const r = sanitizeRules({
      ...BASIS, modCap: 1.5,
      joker: { enabled: true, modus: "einzel", faktor: 2 },
      teamMods: { derbyFaktor: 1.5, teams: {} },
    });
    expect(rohModifikator(r)).toBeCloseTo(2.5, 2);      // 1 + 1,0 + 0,5
    expect(maxTotalModifier(r)).toBeCloseTo(1.5, 2);    // gedeckelt
  });

  it("ohne Modifikatoren ist er neutral", () => {
    expect(rohModifikator(sanitizeRules(BASIS))).toBe(1);
  });
});

describe("Zusammenfassung", () => {
  it("meldet für ein erprobtes Preset Entwarnung", () => {
    const z = zusammenfassung(BASIS);
    expect(z.stufe).toBe("ok");
    expect(z.anzahl).toBe(0);
  });

  it("meldet Warnungen deutlicher als Hinweise", () => {
    expect(zusammenfassung(DEFAULT_RULES).stufe).toBe("warnung");
    const nurHinweis = sanitizeRules({ ...BASIS, combo: { tendenz: 1.15, abstand: 1.5, exakt: 1.6 } });
    expect(zusammenfassung(nurHinweis).stufe).toBe("hinweis");
  });
});
