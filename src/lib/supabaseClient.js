import { createClient } from "@supabase/supabase-js";

// ── Verbindung zur Supabase-Datenbank ───────────────────────
// URL + anon-Key sind für das Frontend gedacht (durch Row Level
// Security geschützt) und dürfen daher NEXT_PUBLIC_ heißen.
// Der service_role-Key gehört NIE ins Frontend — nur serverseitig
// (Env ohne NEXT_PUBLIC_, z. B. für Quoten-/Ergebnis-Jobs).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// True, sobald beide Werte gesetzt sind — steuert die Store-Auswahl.
export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let browserClient = null;

// Ein einzelner Browser-Client (Singleton), erst bei Bedarf erzeugt.
export function getSupabaseBrowserClient() {
  if (!hasSupabaseEnv) return null;
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return browserClient;
}

// Serverseitiger Client mit erhöhten Rechten (service_role) — nur in
// API-Routen/Server-Code verwenden, wo der Key sicher liegt.
export function getSupabaseServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}
