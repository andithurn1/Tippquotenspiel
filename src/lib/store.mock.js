// ── Mock-Store: In-Memory-Daten, damit die App ohne Backend läuft ──
// Gleiche Schnittstelle wie der Supabase-Store. Seed: die Demo-Runde
// „Freundeskreis" auf dem Match JOR-ESP (real 5:1). Zurücksetzen bei
// jedem Prozessstart — bewusst, es ist nur eine Attrappe.

import { createMockOddsSource, DEFAULT_RULES, scoreLeaderboard, scoreLeaderboardHistory, sanitizeRules } from "./engine";
import { DEMO_ROUND_ID, DEMO_JOIN_CODE } from "./constants";
import { generateJoinCode } from "./joinCode";
import { getBundesligaMatches } from "./bundesligaData";

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

const ROUND_ID = DEMO_ROUND_ID;

export function createMockStore() {
  // frische Kopien pro Store, damit Schreibvorgänge isoliert sind
  const matches = new Map([
    [SNAP.matchId, {
      id: SNAP.matchId, home: SNAP.home, away: SNAP.away,
      kickoff: SNAP.kickoff, matchday: 14, snapshot: SNAP, result: RESULT,
    }],
    ...getBundesligaMatches().map((m) => [m.matchId, {
      id: m.matchId, home: m.home, away: m.away,
      kickoff: m.kickoff, matchday: m.matchday, snapshot: m.snapshot, result: m.result,
    }]),
  ]);
  const rounds = new Map([[ROUND_ID, {
    id: ROUND_ID, name: "Freundeskreis", admin_id: "u-du",
    rules: DEFAULT_RULES, join_code: DEMO_JOIN_CODE,
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
    async listRoundsForUser(userId) {
      const roundIds = new Set(members.filter((m) => m.user_id === userId).map((m) => m.round_id));
      return [...rounds.values()].filter((r) => roundIds.has(r.id));
    },
    async joinRound({ roundId, userId, name }) {
      if (!members.some((m) => m.round_id === roundId && m.user_id === userId)) {
        members.push({ round_id: roundId, user_id: userId, name: name ?? userId });
      }
      return { round_id: roundId, user_id: userId };
    },
    async createRound({ name, adminId, adminName, rules, teamFilter }) {
      let joinCode = generateJoinCode();
      while ([...rounds.values()].some((r) => r.join_code === joinCode)) joinCode = generateJoinCode();
      const round = {
        id: `r-${joinCode.toLowerCase()}`,
        name: (name ?? "").trim() || "Neue Runde",
        admin_id: adminId,
        rules: sanitizeRules(rules),
        join_code: joinCode,
      };
      rounds.set(round.id, round);
      members.push({ round_id: round.id, user_id: adminId, name: adminName ?? adminId });
      return round;
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

    // Ranking-Verlauf: gleiche Rohdaten wie getLeaderboard, zusätzlich mit matchday
    // je Tipp angereichert, damit die Engine kumulativ je Spieltag rechnen kann.
    async getLeaderboardHistory(roundId) {
      const round = rounds.get(roundId);
      const roundTips = tips.filter((t) => t.round_id === roundId);
      const entries = roundTips.map((t) => ({
        userId: t.user_id, name: nameOf(t.user_id),
        tip: t.tip, snapshot: t.snapshot,
        result: matches.get(t.match_id)?.result ?? null,
        matchday: matches.get(t.match_id)?.matchday ?? null,
      }));
      return scoreLeaderboardHistory(entries, round?.rules ?? DEFAULT_RULES);
    },
  };
}
