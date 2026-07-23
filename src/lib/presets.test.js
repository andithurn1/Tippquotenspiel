import { describe, it, expect } from "vitest";
import { PRESETS } from "./presets";
import { sanitizeRules } from "./engine";

describe("Presets-Bibliothek", () => {
  it("eindeutige keys, jedes Preset hat Label, Beschreibung und Regelwerk", () => {
    expect(new Set(PRESETS.map((p) => p.key)).size).toBe(PRESETS.length);
    for (const p of PRESETS) {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.desc.length).toBeGreaterThan(0);
      expect(p.rules).toBeTruthy();
    }
  });

  it("jedes Preset ist bereits ein gültiges, sanitizeRules-stabiles Regelwerk (idempotent)", () => {
    for (const p of PRESETS) {
      expect(sanitizeRules(p.rules)).toEqual(p.rules);
    }
  });

  it("'Underdog-Party' hat tatsächlich einen aktiven Boost, 'Standard' keinen", () => {
    const standard = PRESETS.find((p) => p.key === "standard");
    const party = PRESETS.find((p) => p.key === "underdog-party");
    expect(standard.rules.underdogBoost).toBe(1);
    expect(party.rules.underdogBoost).toBeGreaterThan(1);
  });
});
