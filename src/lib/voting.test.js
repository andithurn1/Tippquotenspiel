import { describe, it, expect } from "vitest";
import { tallyVotes, jokerMatchdaysFromVotes, jokerGiltFuerSpieltag, eigeneStimme } from "./voting";
import { DEFAULT_RULES, sanitizeRules } from "./engine";

const MIT_ABSTIMMUNG = sanitizeRules({
  ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 2, abstimmung: true },
});
const OHNE_ABSTIMMUNG = sanitizeRules({
  ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 2, abstimmung: false },
});

const VOTES = [
  { matchday: 1, user_id: "a", ja: true },
  { matchday: 1, user_id: "b", ja: true },
  { matchday: 1, user_id: "c", ja: false },   // Spieltag 1: 2 ja, 1 nein → beschlossen
  { matchday: 2, user_id: "a", ja: false },
  { matchday: 2, user_id: "b", ja: true },     // Spieltag 2: 1:1 → nicht beschlossen
  { matchday: 3, user_id: "a", ja: false },    // Spieltag 3: 0 ja, 1 nein → nicht beschlossen
];

describe("tallyVotes", () => {
  it("zählt ja/nein je Spieltag, aufsteigend sortiert", () => {
    const t = tallyVotes(VOTES);
    expect(t.map((d) => d.matchday)).toEqual([1, 2, 3]);
    expect(t[0]).toEqual({ matchday: 1, ja: 2, nein: 1, total: 3, beschlossen: true });
    expect(t[1]).toEqual({ matchday: 2, ja: 1, nein: 1, total: 2, beschlossen: false });
    expect(t[2]).toEqual({ matchday: 3, ja: 0, nein: 1, total: 1, beschlossen: false });
  });

  it("Gleichstand gilt als nicht beschlossen", () => {
    expect(tallyVotes([
      { matchday: 5, user_id: "a", ja: true }, { matchday: 5, user_id: "b", ja: false },
    ])[0].beschlossen).toBe(false);
  });

  it("leere Eingabe → leeres Ergebnis", () => {
    expect(tallyVotes([])).toEqual([]);
  });
});

describe("jokerMatchdaysFromVotes", () => {
  it("liefert nur die beschlossenen Spieltage", () => {
    const set = jokerMatchdaysFromVotes(VOTES);
    expect([...set]).toEqual([1]);
  });
});

describe("jokerGiltFuerSpieltag", () => {
  it("ohne aktiven Joker immer false", () => {
    expect(jokerGiltFuerSpieltag(DEFAULT_RULES, 1, VOTES)).toBe(false);
  });

  it("Joker an, Abstimmung aus → gilt an jedem Spieltag", () => {
    expect(jokerGiltFuerSpieltag(OHNE_ABSTIMMUNG, 1, [])).toBe(true);
    expect(jokerGiltFuerSpieltag(OHNE_ABSTIMMUNG, 99, [])).toBe(true);
  });

  it("Abstimmung an → nur beschlossene Spieltage", () => {
    expect(jokerGiltFuerSpieltag(MIT_ABSTIMMUNG, 1, VOTES)).toBe(true);
    expect(jokerGiltFuerSpieltag(MIT_ABSTIMMUNG, 2, VOTES)).toBe(false);
    expect(jokerGiltFuerSpieltag(MIT_ABSTIMMUNG, 3, VOTES)).toBe(false);
  });
});

describe("eigeneStimme", () => {
  it("liest die Stimme eines Nutzers, sonst null", () => {
    expect(eigeneStimme(VOTES, "a", 1)).toBe(true);
    expect(eigeneStimme(VOTES, "c", 1)).toBe(false);
    expect(eigeneStimme(VOTES, "a", 99)).toBeNull();
    expect(eigeneStimme(VOTES, "z", 1)).toBeNull();
  });
});
