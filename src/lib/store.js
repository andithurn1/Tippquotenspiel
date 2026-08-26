// ── Daten-Schicht: EINE Stelle, an der Mock ↔ Supabase getauscht wird ──
// Analog zur austauschbaren Quoten-Quelle: solange keine Supabase-Env
// gesetzt ist, läuft die App auf dem In-Memory-Mock. Sobald
// NEXT_PUBLIC_SUPABASE_URL + _ANON_KEY existieren, kommt der echte Store.
//
// Beide Stores teilen dieselbe Schnittstelle:
//   listMatches() · getMatch(id)
//   getProfile(userId) · updateProfile(userId, {displayName, avatar})
//   getRound(id) · getRoundByCode(code) · listMembers(roundId)
//   listRoundsForUser(userId)   ← alle Runden, in denen der User Mitglied ist
//   publishPreset({name,rules,creatorId}) · getPresetByCode(code)   ← Kurzcode-Presets
//   saveTip({roundId,matchId,userId,tip,snapshot}) · listTips({roundId,matchId})
//   saveVote({roundId,matchday,userId,ja}) · listVotes({roundId})   ← Joker-Abstimmung
//   createAntrag({roundId,userId,aspekt,werte,gestelltAm,laeuftBis})
//   listAntraege({roundId,status?}) · saveAntragStimme({antragId,userId,ja})
//   setAntragStatus({antragId,status,veto})   ← Regel-Abstimmung (andere Frage!)
//   saveSeasonTip({roundId,userId,wettenId,wert}) · listSeasonTips({roundId,userId?})  ← Saison-Wetten
//   getLeaderboard(roundId) · getLeaderboardHistory(roundId)   ← rechnen über die Engine
//   getRoundEntries(roundId) ← Roh-Einträge, neu bewertbar unter jedem Regelwerk

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

// ⛔ Hier stand `export const usingSupabase = hasSupabaseEnv;` — gelöscht am
// 26.08.2026, weil es eine ZWEITE Antwort auf eine schon beantwortete Frage
// war und nie jemand danach fragte (`npm run tot`, Gruppe 1).
// Die eine Antwort auf „Mock oder echte Datenbank?" heißt `isMock` und kommt
// aus `useAuth()` — benutzt von `AuthBar`, `Konto` und `ThemeProvider`.
// Wer sie serverseitig braucht, nimmt `hasSupabaseEnv` direkt aus
// `supabaseClient.js`. Zwei Namen für denselben Wert laufen irgendwann
// auseinander; genau dieses Muster hat am 05.08. siebzehn Funde erzeugt.
