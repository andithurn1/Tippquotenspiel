import { createClient } from "@supabase/supabase-js";

// ── Verbindung zur Supabase-Datenbank ───────────────────────
// URL + öffentlicher Key sind fürs Frontend gedacht (durch Row Level
// Security geschützt) und dürfen daher NEXT_PUBLIC_ heißen.
// Der geheime Admin-Key gehört NIE ins Frontend — nur serverseitig
// (Env ohne NEXT_PUBLIC_, z. B. für Quoten-/Ergebnis-Jobs).
//
// ZWEI NAMENSSCHEMATA werden unterstützt, weil Supabase seine Keys
// umbenannt hat und die Vercel-Integration die neuen Namen setzt:
//   alt: anon key        / service_role key
//   neu: publishable key / secret key
// Beide Schreibweisen werden akzeptiert — dadurch läuft die App sowohl
// mit selbst eingetragenen als auch mit automatisch erzeugten Variablen.
// (process.env.X muss ausgeschrieben stehen: Next.js ersetzt NEXT_PUBLIC_*
// beim Bauen textuell, dynamische Zugriffe würden leer bleiben.)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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

// Der geheime Admin-Key (umgeht RLS). Beide Namensschemata, siehe oben.
// NUR serverseitig lesen — steht bewusst in einer Funktion, damit der Wert
// nie versehentlich in ein Client-Bundle wandert.
export function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || null;
}

// Serverseitiger Client mit erhöhten Rechten — nur in API-Routen/Server-Code
// verwenden, wo der Key sicher liegt.
export function getSupabaseServiceClient() {
  const key = getServiceKey();
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}
