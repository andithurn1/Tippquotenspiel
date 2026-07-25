// Sichert den VERTRAG, auf den die Ranking-Anzeige baut: bei aktivem
// Aufhol-Mechanismus tragen die Leaderboard-Einträge ein Feld `bonus`
// (kumulierter Anschluss-Bonus), das im `total` bereits enthalten ist.
// Ohne Aufholen darf KEIN Bonus auftauchen — sonst zeigte die UI Geisterwerte.
import { describe, it, expect } from "vitest";
import { createMockOddsSource, DEFAULT_RULES, sanitizeRules, scoreLeaderboardHistory, scoreLeaderboard } from "@/lib/engine";

const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const RESULT = odds.getResult("JOR-ESP");

// Zwei Spieltage: „Fuchs" trifft stark, „Pech" liegt zurück → am 2. Spieltag
// hat Pech einen Rückstand, auf den der Anschluss-Bonus greifen kann.
const treffer = { home: 5, away: 1, goals: { home: [], away: [] } };
const daneben = { home: 0, away: 4, goals: { home: [], away: [] } };

const entries = [
  { userId: "u-fuchs", name: "Fuchs", tip: treffer, snapshot: SNAP, result: RESULT, matchday: 1 },
  { userId: "u-pech", name: "Pech", tip: daneben, snapshot: SNAP, result: RESULT, matchday: 1 },
  { userId: "u-fuchs", name: "Fuchs", tip: treffer, snapshot: SNAP, result: RESULT, matchday: 2 },
  { userId: "u-pech", name: "Pech", tip: daneben, snapshot: SNAP, result: RESULT, matchday: 2 },
];

const mitAufholen = sanitizeRules({
  ...DEFAULT_RULES,
  aufholen: { ...DEFAULT_RULES.aufholen, enabled: true },
});

describe("Anschluss-Bonus im Ranking (Anzeige-Vertrag)", () => {
  it("ohne Aufhol-Mechanismus trägt kein Eintrag einen Bonus", () => {
    const board = scoreLeaderboard(entries, DEFAULT_RULES);
    expect(board.length).toBeGreaterThan(0);
    for (const b of board) expect(b.bonus ?? 0).toBe(0);
  });

  it("mit Aufhol-Mechanismus trägt der Zurückliegende einen Bonus > 0", () => {
    const history = scoreLeaderboardHistory(entries, mitAufholen);
    const board = history[history.length - 1].board;
    const pech = board.find((b) => b.userId === "u-pech");
    expect(pech.bonus).toBeGreaterThan(0);
  });

  it("der Führende bekommt keinen Anschluss-Bonus", () => {
    const history = scoreLeaderboardHistory(entries, mitAufholen);
    const board = history[history.length - 1].board;
    const fuchs = board.find((b) => b.userId === "u-fuchs");
    expect(fuchs.bonus ?? 0).toBe(0);
  });

  it("Aufholen ≠ Überholen: der Bonus dreht die Führung nicht um", () => {
    const history = scoreLeaderboardHistory(entries, mitAufholen);
    const board = history[history.length - 1].board;
    const fuchs = board.find((b) => b.userId === "u-fuchs");
    const pech = board.find((b) => b.userId === "u-pech");
    expect(fuchs.total).toBeGreaterThan(pech.total);
  });
});
