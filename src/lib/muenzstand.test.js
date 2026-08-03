import { describe, it, expect } from "vitest";
import { muenzStand } from "./muenzstand";
import { sanitizeRules } from "./engine";

// Zwei Spieltage derselben Liga: Spieltag 1 ist längst angepfiffen (Anpfiff
// in der Vergangenheit), Spieltag 2 liegt noch vor uns.
const JETZT = new Date("2026-08-10T00:00:00Z");

const spiel = (matchday, kickoffIso, id = `bl${matchday}-${kickoffIso}`) => ({
  id, wettbewerb: "bl", matchday, kickoff: kickoffIso, home: "A", away: "B",
});

const MATCHES = [
  // Spieltag 1 — vorbei, unbetippt gelassen (soll trotzdem ignoriert werden).
  spiel(1, "2026-08-01T18:00:00Z", "m1a"),
  spiel(1, "2026-08-02T18:00:00Z", "m1b"),
  // Spieltag 2 — noch offen, drei Spiele.
  spiel(2, "2026-08-15T18:00:00Z", "m2a"),
  spiel(2, "2026-08-16T18:00:00Z", "m2b"),
  spiel(2, "2026-08-17T18:00:00Z", "m2c"),
];

const RULES_EINSATZ = sanitizeRules({
  joker: { enabled: true, modus: "einsatz", einsatzProSpieltag: 100, minAnteilProSpiel: 0, maxAnteilProSpiel: 0.4 },
});

describe("muenzStand — null-Fälle", () => {
  it("Joker ausgeschaltet → null", () => {
    const rules = sanitizeRules({ joker: { enabled: false, modus: "einsatz" } });
    expect(muenzStand({ rules, matches: MATCHES, tips: [], userId: "u1", jetzt: JETZT })).toBeNull();
  });

  it("Modus einzel → null", () => {
    const rules = sanitizeRules({ joker: { enabled: true, modus: "einzel" } });
    expect(muenzStand({ rules, matches: MATCHES, tips: [], userId: "u1", jetzt: JETZT })).toBeNull();
  });

  it("Modus ranking → null", () => {
    const rules = sanitizeRules({ joker: { enabled: true, modus: "ranking" } });
    expect(muenzStand({ rules, matches: MATCHES, tips: [], userId: "u1", jetzt: JETZT })).toBeNull();
  });

  it("kein Spiel mehr offen (alle Anpfiffe in der Vergangenheit) → null", () => {
    const vorbei = new Date("2026-09-01T00:00:00Z"); // nach allen Anpfiffen
    expect(muenzStand({ rules: RULES_EINSATZ, matches: MATCHES, tips: [], userId: "u1", jetzt: vorbei })).toBeNull();
  });

  it("keine Spiele überhaupt → null", () => {
    expect(muenzStand({ rules: RULES_EINSATZ, matches: [], tips: [], userId: "u1", jetzt: JETZT })).toBeNull();
  });
});

describe("muenzStand — der gefundene Spieltag", () => {
  it("nimmt den Spieltag des frühesten OFFENEN Spiels, auch wenn ein früherer noch ungetippt ist", () => {
    const stand = muenzStand({ rules: RULES_EINSATZ, matches: MATCHES, tips: [], userId: "u1", jetzt: JETZT });
    expect(stand).not.toBeNull();
    expect(stand.spieltag).toEqual({ wettbewerb: "bl", matchday: 2 });
    expect(stand.spieleImSpieltag).toBe(3);
  });
});

describe("muenzStand — verteilt zählt nur DIESEN Spieltag", () => {
  it("Tipps aus einem anderen Spieltag/anderer Runde fließen NICHT ein", () => {
    const tips = [
      // Spieltag 2 (der aktuelle) — dieser zählt.
      { user_id: "u1", match_id: "m2a", tip: { gewicht: 2 } },
      // Spieltag 1 (vorbei) — darf NICHT mitgezählt werden.
      { user_id: "u1", match_id: "m1a", tip: { gewicht: 5 } },
      // anderer Nutzer — darf NICHT mitgezählt werden.
      { user_id: "u2", match_id: "m2b", tip: { gewicht: 3 } },
    ];
    const stand = muenzStand({ rules: RULES_EINSATZ, matches: MATCHES, tips, userId: "u1", jetzt: JETZT });
    // Neutraler Einsatz bei 3 Spielen und 100 Münzen: 100/3. Gewicht 2 → 2 * 100/3.
    // `einsatzPlanung` rundet `verteilt` auf 2 Nachkommastellen.
    expect(stand.verteilt).toBeCloseTo((2 * 100) / 3, 2);
  });

  it("frei = budget − verteilt, nie negativ", () => {
    const tips = [
      { user_id: "u1", match_id: "m2a", tip: { gewicht: 10 } }, // weit über dem Budget
    ];
    const stand = muenzStand({ rules: RULES_EINSATZ, matches: MATCHES, tips, userId: "u1", jetzt: JETZT });
    expect(stand.budget).toBe(100);
    expect(stand.frei).toBeGreaterThanOrEqual(0);
    expect(stand.frei).toBe(Math.max(0, stand.budget - stand.verteilt));
  });

  it("ohne Tipps ist nichts verteilt", () => {
    const stand = muenzStand({ rules: RULES_EINSATZ, matches: MATCHES, tips: [], userId: "u1", jetzt: JETZT });
    expect(stand.verteilt).toBe(0);
    expect(stand.frei).toBe(stand.budget);
  });
});
