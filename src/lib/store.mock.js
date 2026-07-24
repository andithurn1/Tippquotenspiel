// ── Mock-Store: In-Memory-Daten, damit die App ohne Backend läuft ──
// Gleiche Schnittstelle wie der Supabase-Store. Seed: die Demo-Runde
// „Freundeskreis" auf dem Match JOR-ESP (real 5:1). Zurücksetzen bei
// jedem Prozessstart — bewusst, es ist nur eine Attrappe.

import { createMockOddsSource, DEFAULT_RULES, scoreLeaderboard, scoreLeaderboardHistory, sanitizeRules } from "./engine";
import { DEMO_ROUND_ID, DEMO_JOIN_CODE } from "./constants";
import { generateJoinCode } from "./joinCode";
import { getBundesligaMatches } from "./bundesligaData";
import { sanitizeDisplayName, sanitizeAvatar, DEFAULT_AVATAR } from "./avatars";
import { isPremium, applyEntitlements } from "./premium";

const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const RESULT = odds.getResult("JOR-ESP");

// Demo-Mitspieler mit ihren (bereits abgegebenen) Tipps auf JOR-ESP.
const DEMO_TIPS = [
  { userId: "u-du",    name: "Du",    avatar: "fan-schal",   tip: { home: 4, away: 1, goals: { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal", ""] } } },
  { userId: "u-lena",  name: "Lena",  avatar: "fan-rakete",  tip: { home: 2, away: 1, goals: { home: [], away: ["Yamal", ""] } } },
  { userId: "u-kemal", name: "Kemal", avatar: "fan-trommel", tip: { home: 1, away: 1, goals: { home: [], away: ["Yamal", ""] } } },
  { userId: "u-max",   name: "Max",   avatar: "fan-bier",    tip: { home: 2, away: 1, goals: { home: [], away: [] } } },
  { userId: "u-jonas", name: "Jonas", avatar: "fan-clown",   tip: { home: 0, away: 2, goals: { home: [], away: ["Oyarzabal", ""] } } },
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
  const presets = new Map();  // Kurzcode → geteiltes Regelwerk (Content-Creator-Codes)
  const members = DEMO_TIPS.map((t) => ({ round_id: ROUND_ID, user_id: t.userId, name: t.name, avatar: t.avatar }));
  // Profile getrennt von der Mitgliedschaft halten — wie in der DB (profiles).
  // Der Demo-Nutzer „Du" hat Premium, damit die Premium-Funktionen beim
  // Entwickeln ohne Backend sichtbar sind; die übrigen bewusst nicht, damit
  // auch der gesperrte Zustand testbar bleibt.
  const profiles = new Map(DEMO_TIPS.map((t) => [t.userId, {
    id: t.userId, display_name: t.name, avatar: t.avatar,
    premium_until: t.userId === "u-du" ? "2099-12-31T00:00:00Z" : null,
  }]));
  const tips = DEMO_TIPS.map((t) => ({
    id: `tip-${t.userId}`, round_id: ROUND_ID, match_id: SNAP.matchId,
    user_id: t.userId, tip: t.tip, snapshot: SNAP,
  }));
  const votes = [];   // Joker-Abstimmung: { round_id, matchday, user_id, ja }

  const nameOf = (userId) => members.find((m) => m.user_id === userId)?.name ?? userId;

  return {
    async listMatches() { return [...matches.values()]; },
    async getMatch(id) { return matches.get(id) ?? null; },

    // ── Profil (Anzeigename + Avatar) ───────────────────────
    async getProfile(userId) {
      return profiles.get(userId) ?? null;
    },
    // Nur die übergebenen Felder ändern; beide werden gesäubert, damit weder
    // ein leerer Name noch eine unbekannte Avatar-id im Profil landet.
    async updateProfile(userId, { displayName, avatar } = {}) {
      const vorher = profiles.get(userId) ?? { id: userId, display_name: userId, avatar: DEFAULT_AVATAR };
      const name = displayName === undefined ? vorher.display_name : (sanitizeDisplayName(displayName) ?? vorher.display_name);
      const bild = avatar === undefined ? vorher.avatar : sanitizeAvatar(avatar);
      const neu = { ...vorher, display_name: name, avatar: bild };
      profiles.set(userId, neu);
      // Mitglieder-Liste mitziehen, damit Leaderboard/Runde sofort stimmen.
      for (const m of members) if (m.user_id === userId) { m.name = name; m.avatar = bild; }
      return neu;
    },

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

    // Kurzcode-Presets (Content-Creator-Codes): Regelwerk unter einem kurzen,
    // teilbaren Code speichern statt als langem Text-Creator-Code.
    async publishPreset({ name, rules, creatorId }) {
      let code = generateJoinCode();
      while (presets.has(code)) code = generateJoinCode();
      const row = {
        code, name: (name ?? "").trim() || "Regelwerk",
        rules: sanitizeRules(rules), creator_id: creatorId ?? null,
      };
      presets.set(code, row);
      return row;
    },
    async getPresetByCode(code) {
      return presets.get((code ?? "").trim().toUpperCase()) ?? null;
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
      // Premium-Durchsetzung: Premium-Bestandteile des Regelwerks greifen nur,
      // wenn der ADMIN berechtigt ist. Hier — nicht erst in der UI, die ist
      // umgehbar.
      const admin = profiles.get(adminId) ?? null;
      const round = {
        id: `r-${joinCode.toLowerCase()}`,
        name: (name ?? "").trim() || "Neue Runde",
        admin_id: adminId,
        rules: applyEntitlements(sanitizeRules(rules), { premium: isPremium(admin) }),
        join_code: joinCode,
        team_filter: Array.isArray(teamFilter) && teamFilter.length >= 2 ? teamFilter : null,
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

    // ── Joker-Abstimmung ────────────────────────────────────
    // Eine Stimme je Nutzer/Runde/Spieltag; erneutes Abstimmen überschreibt.
    async saveVote({ roundId, matchday, userId, ja }) {
      const existing = votes.find((v) => v.round_id === roundId && v.matchday === matchday && v.user_id === userId);
      if (existing) { existing.ja = ja === true; return existing; }
      const row = { round_id: roundId, matchday, user_id: userId, ja: ja === true };
      votes.push(row);
      return row;
    },
    async listVotes({ roundId }) {
      return votes.filter((v) => v.round_id === roundId);
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
