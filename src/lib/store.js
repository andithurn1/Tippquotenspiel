// ── Daten-Schicht: EINE Stelle, an der Mock ↔ Supabase getauscht wird ──
// Analog zur austauschbaren Quoten-Quelle: solange keine Supabase-Env
// gesetzt ist, läuft die App auf dem In-Memory-Mock. Sobald
// NEXT_PUBLIC_SUPABASE_URL + _ANON_KEY existieren, kommt der echte Store.
//
// Beide Stores teilen dieselbe Schnittstelle:
//   listMatches() · getMatch(id)
//   getRound(id) · getRoundByCode(code) · listMembers(roundId)
//   listRoundsForUser(userId)   ← alle Runden, in denen der User Mitglied ist
//   saveTip({roundId,matchId,userId,tip,snapshot}) · listTips({roundId,matchId})
//   getLeaderboard(roundId) · getLeaderboardHistory(roundId)   ← rechnen über die Engine

import { hasSupabaseEnv } from "./supabaseClient";
import { createMockStore } from "./store.mock";
import { createSupabaseStore } from "./store.supabase";

let store = null;

export function getStore() {
  if (!store) store = hasSupabaseEnv ? createSupabaseStore() : createMockStore();
  return store;
}

// Für Tests/SSR: expliziter Zugriff ohne Singleton.
export { createMockStore, createSupabaseStore };
export const usingSupabase = hasSupabaseEnv;
