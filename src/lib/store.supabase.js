// ── Supabase-Store: dieselbe Schnittstelle wie der Mock, aber gegen
//    die echte Datenbank. Aktiv, sobald NEXT_PUBLIC_SUPABASE_* gesetzt
//    sind (siehe store.js). Scoring bleibt in der Engine — hier werden
//    nur Rohdaten geladen/geschrieben.

import { DEFAULT_RULES, scoreLeaderboard } from "./engine";
import { getSupabaseBrowserClient } from "./supabaseClient";

// Match-Zeile (DB) → Store-Form
const mapMatch = (m) => m && ({
  id: m.id, home: m.home, away: m.away, kickoff: m.kickoff,
  matchday: m.matchday, snapshot: m.snapshot, result: m.result,
});

export function createSupabaseStore() {
  const sb = getSupabaseBrowserClient();
  if (!sb) throw new Error("Supabase-Client nicht verfügbar (Env-Variablen fehlen).");

  const orThrow = ({ data, error }) => { if (error) throw error; return data; };

  return {
    async listMatches() {
      const data = orThrow(await sb.from("matches").select("*").order("kickoff"));
      return data.map(mapMatch);
    },
    async getMatch(id) {
      const data = orThrow(await sb.from("matches").select("*").eq("id", id).maybeSingle());
      return mapMatch(data);
    },

    async getRound(id) {
      return orThrow(await sb.from("rounds").select("*").eq("id", id).maybeSingle());
    },
    async getRoundByCode(code) {
      return orThrow(await sb.from("rounds").select("*").eq("join_code", code).maybeSingle());
    },
    async listMembers(roundId) {
      // Join auf profiles für den Anzeigenamen
      const data = orThrow(await sb
        .from("round_members")
        .select("round_id, user_id, profiles(display_name)")
        .eq("round_id", roundId));
      return data.map((m) => ({ round_id: m.round_id, user_id: m.user_id, name: m.profiles?.display_name ?? m.user_id }));
    },
    async joinRound({ roundId, userId }) {
      // idempotent: bereits Mitglied → nichts tun
      return orThrow(await sb
        .from("round_members")
        .upsert({ round_id: roundId, user_id: userId }, { onConflict: "round_id,user_id", ignoreDuplicates: true })
        .select());
    },

    async saveTip({ roundId, matchId, userId, tip, snapshot }) {
      // ein Tipp je (round, match, user) → upsert auf dem Unique-Key
      const data = orThrow(await sb
        .from("tips")
        .upsert(
          { round_id: roundId, match_id: matchId, user_id: userId, tip, snapshot },
          { onConflict: "round_id,match_id,user_id" }
        )
        .select()
        .single());
      return data;
    },
    async listTips({ roundId, matchId }) {
      let q = sb.from("tips").select("*").eq("round_id", roundId);
      if (matchId) q = q.eq("match_id", matchId);
      return orThrow(await q);
    },

    async getLeaderboard(roundId) {
      const [round, members, tips, matches] = await Promise.all([
        this.getRound(roundId),
        this.listMembers(roundId),
        this.listTips({ roundId }),
        this.listMatches(),
      ]);
      const nameOf = (id) => members.find((m) => m.user_id === id)?.name ?? id;
      const resultOf = (mid) => matches.find((m) => m.id === mid)?.result ?? null;
      const entries = tips.map((t) => ({
        userId: t.user_id, name: nameOf(t.user_id),
        tip: t.tip, snapshot: t.snapshot, result: resultOf(t.match_id),
      }));
      return scoreLeaderboard(entries, round?.rules ?? DEFAULT_RULES);
    },
  };
}
