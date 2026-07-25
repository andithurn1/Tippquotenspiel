import { describe, it, expect } from "vitest";
import { DEFAULT_RULES, sanitizeRules, RULE_LIMITS } from "@/lib/engine";
import { PRESETS } from "@/lib/presets";
import {
  ASPEKTE, ASPEKT_KEYS, defaultAuswahl, sanitizeAuswahl,
  mergePresets, unterschiede, beschreibeMix,
} from "@/lib/presetMerge";

const byKey = (k) => PRESETS.find((p) => p.key === k).rules;
const STANDARD = byKey("standard");
const HARDCORE = byKey("hardcore");

describe("Aspekte decken das Regelwerk ab", () => {
  it("jeder Aspekt hat Label, Hinweis und Felder", () => {
    for (const a of ASPEKTE) {
      expect(a.key && a.label && a.hint).toBeTruthy();
      expect(a.keys.length).toBeGreaterThan(0);
    }
  });

  it("kein Regel-Feld gehört zu zwei Aspekten", () => {
    const alle = ASPEKTE.flatMap((a) => a.keys);
    expect(new Set(alle).size).toBe(alle.length);
  });

  it("die Aspekte erfassen alle Regel-Felder außer dem Namen", () => {
    const abgedeckt = new Set(ASPEKTE.flatMap((a) => a.keys));
    const fehlend = Object.keys(DEFAULT_RULES).filter((k) => k !== "name" && !abgedeckt.has(k));
    expect(fehlend).toEqual([]);
  });
});

describe("mergePresets", () => {
  it("alles von A ergibt exakt A (nur der Name wechselt)", () => {
    const mix = mergePresets(STANDARD, HARDCORE, defaultAuswahl("a"));
    expect({ ...mix, name: null }).toEqual({ ...sanitizeRules(STANDARD), name: null });
  });

  it("alles von B ergibt exakt B", () => {
    const mix = mergePresets(STANDARD, HARDCORE, defaultAuswahl("b"));
    expect({ ...mix, name: null }).toEqual({ ...sanitizeRules(HARDCORE), name: null });
  });

  it("nimmt je Aspekt genau die gewählte Seite", () => {
    const mix = mergePresets(STANDARD, HARDCORE, { ...defaultAuswahl("a"), naehe: "b" });
    expect(mix.k).toBe(sanitizeRules(HARDCORE).k);          // Nähe von B
    expect(mix.combo).toEqual(sanitizeRules(STANDARD).combo); // Kombi von A
  });

  it("hält zusammengehörige Werte zusammen (Underdog samt Rampe)", () => {
    const mix = mergePresets(STANDARD, byKey("underdog-party"), { ...defaultAuswahl("a"), underdog: "b" });
    const B = sanitizeRules(byKey("underdog-party"));
    expect(mix.underdogBoost).toBe(B.underdogBoost);
    expect(mix.underdogRampStart).toBe(B.underdogRampStart);
    expect(mix.underdogRampEnd).toBe(B.underdogRampEnd);
  });

  it("das Ergebnis ist immer ein gültiges Regelwerk", () => {
    const mix = mergePresets({ k: 999, hack: true }, { combo: "kaputt" }, defaultAuswahl("a"));
    expect(mix.k).toBeLessThanOrEqual(RULE_LIMITS.k.max);
    expect(mix.hack).toBeUndefined();
    expect(typeof mix.combo).toBe("object");
  });

  it("übernimmt einen eigenen Namen, sonst „A × B“", () => {
    expect(mergePresets(STANDARD, HARDCORE, {}, "Mein Mix").name).toBe("Mein Mix");
    expect(mergePresets(STANDARD, HARDCORE, {}).name).toContain("×");
  });

  it("verträgt fehlende Eingaben", () => {
    const mix = mergePresets(null, undefined, null);
    expect(mix.k).toBe(DEFAULT_RULES.k);
  });
});

describe("sanitizeAuswahl", () => {
  it("kennt nur „a“ und „b“ und nur bekannte Aspekte", () => {
    const w = sanitizeAuswahl({ naehe: "b", kombi: "x", quatsch: "b" });
    expect(w.naehe).toBe("b");
    expect(w.kombi).toBe("a");
    expect(w.quatsch).toBeUndefined();
    expect(Object.keys(w).sort()).toEqual([...ASPEKT_KEYS].sort());
  });
});

describe("unterschiede / beschreibeMix", () => {
  it("gleiche Presets haben keine Unterschiede", () => {
    expect(unterschiede(STANDARD, STANDARD)).toEqual([]);
  });

  it("verschiedene Presets unterscheiden sich mindestens in der Nähe", () => {
    expect(unterschiede(STANDARD, HARDCORE)).toContain("naehe");
  });

  it("beschreibt nur die Aspekte, bei denen die Wahl etwas ändert", () => {
    const beschreibung = beschreibeMix(STANDARD, HARDCORE, { ...defaultAuswahl("a"), naehe: "b" });
    const keys = beschreibung.map((b) => b.key);
    expect(keys).toEqual(unterschiede(STANDARD, HARDCORE));
    const naehe = beschreibung.find((b) => b.key === "naehe");
    expect(naehe.von).toBe(sanitizeRules(HARDCORE).name);
  });

  it("bei identischen Presets ist nichts zu entscheiden", () => {
    expect(beschreibeMix(STANDARD, STANDARD, defaultAuswahl("a"))).toEqual([]);
  });
});
