import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabaseClient";

// ── Konto-Löschung (Recht auf Löschung, Art. 17 DSGVO) ──────
// Läuft SERVERSEITIG, weil das Entfernen eines auth.users-Eintrags den
// service_role-Key braucht (der NIE ins Frontend darf). Der Nutzer schickt
// sein Access-Token mit; wir prüfen damit, WER er ist, und löschen exakt
// dieses Konto. Das DB-Schema (ON DELETE CASCADE) räumt Profil, Tipps und
// Mitgliedschaften automatisch mit ab.
export async function POST(request) {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !service) {
    return Response.json({ error: "Server nicht konfiguriert." }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  // Token gegen Supabase prüfen → verlässliche Nutzer-Id (nicht vom Client geglaubt).
  const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: whoErr } = await asUser.auth.getUser();
  if (whoErr || !user) {
    return Response.json({ error: "Sitzung ungültig." }, { status: 401 });
  }

  // Mit erhöhten Rechten das eigene Konto löschen (Cascade räumt den Rest).
  const admin = createClient(SUPABASE_URL, service, { auth: { persistSession: false } });
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return Response.json({ error: delErr.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
