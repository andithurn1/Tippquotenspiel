import { describe, it, expect } from "vitest";
import { PRESETS } from "./presets";
import { simulateBalance } from "./balanceSim";

// ── Balance-Regression ──────────────────────────────────────
// Sichert zu, dass KEIN mitgeliefertes Preset zum Zocker-Spiel wird. Ohne
// diesen Test rutscht ein unausgewogenes Preset unbemerkt in den Launch —
// genau das soll nicht passieren.
//
// Bewusst mit fester Saatzahl und moderater Saison-Zahl: reproduzierbar und
// schnell genug für jeden Testlauf.
const OPT = { seasons: 30, matchdays: 17, perMatchday: 9, seed: 4242 };

describe("Presets — Balance", () => {
  for (const preset of PRESETS) {
    describe(preset.label, () => {
      const r = simulateBalance(preset.rules, OPT);
      const quote = (key) => r.profile.find((p) => p.key === key).siegquote;

      it("der Dauerzocker gewinnt nicht die Runde", () => {
        expect(r.gewinner).not.toBe("zocker");
        expect(quote("zocker")).toBeLessThan(0.4);
      });

      it("wer immer nur den Favoriten tippt, gewinnt auch nicht", () => {
        expect(r.gewinner).not.toBe("favorit");
      });

      it("gezieltes Wagen zahlt sich aus — der Kenner liegt vorn", () => {
        expect(quote("kenner")).toBeGreaterThan(quote("zocker"));
        expect(quote("kenner")).toBeGreaterThan(quote("favorit"));
      });

      it("Ampel steht nicht auf rot", () => {
        expect(r.ampel.stufe).not.toBe("rot");
      });
    });
  }
});

describe("Presets — Struktur", () => {
  it("die Dämpfung ist überall vorhanden (sonst kippt die Balance)", () => {
    for (const p of PRESETS) {
      expect(p.rules.wrongPenalty, `${p.label}: Fehltipps müssen etwas kosten`).toBeLessThan(0);
      expect(p.rules.minPayout, `${p.label}: Nähe-Cutoff nötig`).toBeGreaterThan(0);
    }
  });
});
