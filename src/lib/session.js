"use client";

// ── Login-Platzhalter ───────────────────────────────────────
// Bis der echte Supabase-Login angebunden ist, ist im Mock-Betrieb
// immer der Demo-Nutzer „Du" eingeloggt. Sobald Supabase-Env gesetzt
// ist, kommt der echte Nutzer aus supabase.auth. EINE Stelle zum
// Umstellen — analog zur Daten-Schicht (getStore).

import { hasSupabaseEnv, getSupabaseBrowserClient } from "./supabaseClient";

// Demo-Runde aus dem Mock-Store (store.mock.js).
export const DEMO_ROUND_ID = "r-demo";
export const DEMO_USER = { id: "u-du", name: "Du" };

// Aktueller Nutzer oder null (nicht eingeloggt). Async, weil Supabase
// die Session asynchron liefert.
export async function getCurrentUser() {
  if (!hasSupabaseEnv) return DEMO_USER;
  const sb = getSupabaseBrowserClient();
  const { data } = await sb.auth.getUser();
  if (!data?.user) return null;
  return { id: data.user.id, name: data.user.email ?? "Ich" };
}
