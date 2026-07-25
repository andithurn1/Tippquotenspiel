import { describe, it, expect } from "vitest";
import { createMockOddsSource, DEFAULT_RULES, scoreTip, sanitizeRules } from "@/lib/engine";
import { buildAutoTip, missingMatches, autoTipsFor } from "@/lib/autoTip";
import { likelyScorelines } from "@/lib/nearResults";

const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const RESULT = odds.getResult("JOR-ESP");

describe("buildAutoTip", () => {
  it("tippt den wahrscheinlichsten Endstand", () => {
    const [best] = likelyScorelines(SNAP, DEFAULT_RULES, 1);
    const tip = buildAutoTip(SNAP, DEFAULT_RULES);
    expect(tip.home).toBe(best.home);
    expect(tip.away).toBe(best.away);
    expect(tip.auto).toBe(true);
  });

  it("benennt keinen Schützen für ein Team ohne getipptes Tor", () => {
    const tip = buildAutoTip(SNAP, DEFAULT_RULES);
    if (tip.home === 0) expect(tip.goals.home).toHaveLength(0);
    if (tip.away === 0) expect(tip.goals.away).toHaveLength(0);
  });

  it("nennt jeden Schützen höchstens einmal (nie ein Doppelpack)", () => {
    const tip = buildAutoTip(SNAP, DEFAULT_RULES);
    for (const side of ["home", "away"]) {
      const list = tip.goals[side];
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("setzt weder Joker noch Gewicht (verbraucht kein Kontingent)", () => {
    const tip = buildAutoTip(SNAP, DEFAULT_RULES);
    expect(tip.joker).toBeUndefined();
    expect(tip.gewicht).toBeUndefined();
  });

  it("ohne Torschützen-Markt bleiben die Listen leer", () => {
    const ohneTore = sanitizeRules({
      ...DEFAULT_RULES,
      markets: { result: true, goals: { ...DEFAULT_RULES.markets.goals, enabled: false } },
    });
    const tip = buildAutoTip(SNAP, ohneTore);
    expect(tip.goals.home).toHaveLength(0);
    expect(tip.goals.away).toHaveLength(0);
  });

  it("ohne Snapshot null statt Absturz", () => {
    expect(buildAutoTip(null)).toBeNull();
    expect(buildAutoTip({})).toBeNull();
  });
});

describe("Fairness: Nichtstun darf sich nie lohnen", () => {
  it("der Auto-Tipp ist der zahmste — ein mutiger Tipp zahlt bei Treffer mehr", () => {
    const auto = buildAutoTip(SNAP, DEFAULT_RULES);
    // Mutiger Tipp = das real eingetretene 5:1 (hohe Quote).
    const mutig = { home: 5, away: 1, goals: { home: [], away: [] } };
    const autoBeiTreffer = scoreTip(auto, { home: auto.home, away: auto.away, playerGoals: null }, SNAP, DEFAULT_RULES);
    const mutigBeiTreffer = scoreTip(mutig, { home: 5, away: 1, playerGoals: null }, SNAP, DEFAULT_RULES);
    expect(mutigBeiTreffer.total).toBeGreaterThan(autoBeiTreffer.total);
  });

  it("gegen das echte Ergebnis zahlt der Auto-Tipp weniger als der Volltreffer", () => {
    const auto = buildAutoTip(SNAP, DEFAULT_RULES);
    const treffer = { home: 5, away: 1, goals: { home: [], away: [] } };
    const a = scoreTip(auto, RESULT, SNAP, DEFAULT_RULES).total;
    const t = scoreTip(treffer, RESULT, SNAP, DEFAULT_RULES).total;
    expect(t).toBeGreaterThan(a);
  });

  it("aber er rettet vor der Null — er zahlt mehr als gar kein Tipp", () => {
    const auto = buildAutoTip(SNAP, DEFAULT_RULES);
    expect(scoreTip(auto, RESULT, SNAP, DEFAULT_RULES).total).toBeGreaterThan(0);
  });
});

describe("missingMatches / autoTipsFor", () => {
  const matches = [
    { matchId: "m1", snapshot: SNAP },
    { matchId: "m2", snapshot: SNAP },
    { matchId: "m3", snapshot: SNAP },
  ];
  const tips = [
    { match_id: "m1", user_id: "u-du" },
    { match_id: "m2", user_id: "u-anders" },
  ];

  it("findet nur die Spiele ohne eigenen Tipp", () => {
    const fehlend = missingMatches(matches, tips, "u-du").map((m) => m.matchId);
    expect(fehlend).toEqual(["m2", "m3"]);
  });

  it("erzeugt je Versäumnis einen speicherbaren Eintrag mit eingefrorenem Snapshot", () => {
    const autos = autoTipsFor({ matches, tips, userId: "u-du", rules: DEFAULT_RULES });
    expect(autos).toHaveLength(2);
    for (const a of autos) {
      expect(a.snapshot).toBe(SNAP);
      expect(a.tip.auto).toBe(true);
    }
  });

  it("wer alles getippt hat, bekommt nichts dazu", () => {
    const alle = matches.map((m) => ({ match_id: m.matchId, user_id: "u-du" }));
    expect(autoTipsFor({ matches, tips: alle, userId: "u-du" })).toEqual([]);
  });
});
