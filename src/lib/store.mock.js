// ── Mock-Store: In-Memory-Daten, damit die App ohne Backend läuft ──
// Gleiche Schnittstelle wie der Supabase-Store. Seed: die Demo-Runde
// „Freundeskreis" auf dem Match JOR-ESP (real 5:1). Zurücksetzen bei
// jedem Prozessstart — bewusst, es ist nur eine Attrappe.

import { createMockOddsSource, DEFAULT_RULES, scoreLeaderboard } from "./engine";

const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const RESULT = odds.getResult("JOR-ESP");

// Demo-Mitspieler mit ihren (bereits abgegebenen) Tipps auf JOR-ESP.
const DEMO_TIPS = [
  { userId: "u-du",    name: "Du",    tip: { home: 4, away: 1, goals: { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal", ""] } } },
  { userId: "u-lena",  name: "Lena",  tip: { home: 2, away: 1, goals: { home: [], away: ["Yamal", ""] } } },
  { userId: "u-kemal", name: "Kemal", tip: { home: 1, away: 1, goals: { home: [], away: ["Yamal", ""] } } },
  { userId: "u-max",   name: "Max",   tip: { home: 2, away: 1, goals: { home: [], away: [] } } },
  { userId: "u-jonas", name: "Jonas", tip: { home: 0, away: 2, goals: { home: [], away: ["Oyarzabal", ""] } } },
];

const ROUND_ID = "r-demo";

export function createMockStore() {
  // frische Kopien pro Store, damit Schreibvorgänge isoliert sind
  const matches = new Map([[SNAP.matchId, {
    id: SNAP.matchId, home: SNAP.home, away: SNAP.away,
    kickoff: SNAP.kickoff, matchday: 14, snapshot: SNAP, result: RESULT,
  }]]);
  const rounds = new Map([[ROUND_ID, {
    id: ROUND_ID, name: "Freundeskreis", admin_id: "u-du",
    rules: DEFAULT_RULES, join_code: "DEMO",
  }]]);
  const members = DEMO_TIPS.map((t) => ({ round_id: ROUND_ID, user_id: t.userId, name: t.name }));
  const tips = DEMO_TIPS.map((t) => ({
    id: `tip-${t.userId}`, round_id: ROUND_ID, match_id: SNAP.matchId,
    user_id: t.userId, tip: t.tip, snapshot: SNAP,
  }));

  const nameOf = (userId) => members.find((m) => m.user_id === userId)?.name ?? userId;

  return {
    async listMatches() { return [...matches.values()]; },
    async getMatch(id) { return matches.get(id) ?? null; },

    async getRound(id) { return rounds.get(id) ?? null; },
    async getRoundByCode(code) {
      return [...rounds.values()].find((r) => r.join_code === code) ?? null;
    },
    async listMembers(roundId) {
      return members.filter((m) => m.round_id === roundId);
    },

    async saveTip({ roundId, matchId, userId, tip, snapshot }) {
      const existing = tips.find((t) => t.round_id === roundId && t.match_id === matchId && t.user_id === userId);
      if (existing) { existing.tip = tip; existing.snapshot = snapshot; return existing; }
      const row = { id: `tip-${userId}-${matchId}`, round_id: roundId, match_id: matchId, user_id: userId, tip, snapshot };
      tips.push(row);
      return row;
    },
    async listTips({ roundId, matchId }) {
      return tips.filter((t) => t.round_id === roundId && (!matchId || t.match_id === matchId));
    },

    // Leaderboard: Rohdaten sammeln, Engine rechnet.
    async getLeaderboard(roundId) {
      const round = rounds.get(roundId);
      const roundTips = tips.filter((t) => t.round_id === roundId);
      const entries = roundTips.map((t) => ({
        userId: t.user_id, name: nameOf(t.user_id),
        tip: t.tip, snapshot: t.snapshot,
        result: matches.get(t.match_id)?.result ?? null,
      }));
      return scoreLeaderboard(entries, round?.rules ?? DEFAULT_RULES);
    },
  };
}
