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

// ── Die Modifikator-Ebenen mitmessen ────────────────────────
// Bis zum Abschluss-Durchgang war der Simulator für Big Game BLIND: kein
// Snapshot trug einen `bigGameWert`, also lieferten „aus" und „stark" dieselben
// Zahlen. Ein Preset mit aggressivem Big Game hätte grün ausgesehen, ohne je
// geprüft worden zu sein. Diese Tests sind die Sperre dagegen — sie prüfen die
// Presets im UNGÜNSTIGSTEN Fall, den ein Admin einstellen kann.
const MAXIMUM = { enabled: true, aufschlag: 1.0, minSpannung: 0 };

describe("Presets — halten auch mit maximalem Big Game", () => {
  for (const preset of PRESETS) {
    describe(preset.label, () => {
      const r = simulateBalance({ ...preset.rules, bigGame: MAXIMUM }, OPT);
      const quote = (key) => r.profile.find((p) => p.key === key).siegquote;

      it("der Kenner bleibt vor Zocker und Favorit", () => {
        expect(quote("kenner")).toBeGreaterThan(quote("zocker"));
        expect(quote("kenner")).toBeGreaterThan(quote("favorit"));
      });

      it("die Ampel steht nicht auf rot", () => {
        expect(r.ampel.stufe).not.toBe("rot");
      });

      it("Big Game wird überhaupt gemessen (Blindstellen-Regression)", () => {
        // Der Modifikator-Anteil MUSS steigen, wenn die Ebene aktiv ist.
        // Bliebe er gleich, wäre der Simulator wieder blind — genau der Fehler,
        // der die Ebene monatelang ungeprüft gelassen hat.
        const ohne = simulateBalance(preset.rules, OPT);
        expect(r.modifikatorAnteil).toBeGreaterThan(ohne.modifikatorAnteil);
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
