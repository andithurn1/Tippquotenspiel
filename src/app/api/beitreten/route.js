import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, getServiceKey } from "@/lib/supabaseClient";

// ── Beitritt per Code — SERVERSEITIG (LV4, 27.08.2026) ──────
//
// 🔴 Der Befund, der diese Route nötig macht: `join_code` steht als Spalte in
// `rounds`, und `rounds_read` gilt `for select to authenticated using (true)`.
// **Jeder Angemeldete konnte damit alle Runden samt Beitritts-Code lesen** —
// und jeder Runde beitreten.
//
// ⚠️ Der Schema-Kommentar behauptete das Gegenteil: „der Code selbst ist die
// Zugangsschranke, nicht die Sichtbarkeit". Eine Schranke, deren Schlüssel
// offen daneben liegt, ist keine.
//
// ── Warum eine Route und keine Policy ──
// Postgres-RLS filtert ZEILEN, nicht Spalten. Drei Wege standen zur Wahl:
//   (a) Spalten-Rechte (`revoke select (join_code)`) — bricht den Beitritt:
//       wer eine Spalte nicht lesen darf, darf auch nicht nach ihr filtern.
//   (b) `join_code` in eine eigene Tabelle — verschiebt das Problem nur.
//   (c) Beitritt über eine Server-Route.
//
// **(c), und der Grund ist mehr als Sauberkeit:** nur hier lässt sich das
// DURCHPROBIEREN bremsen. Ein 6-stelliger Code hat rund 2 Milliarden
// Möglichkeiten — im Browser kann man sie in Ruhe durchgehen, hier nicht.
//
// ⚠️ Was diese Route NICHT tut: sie gibt den Code nie zurück. Die Antwort
// enthält Runden-Id und Name, sonst nichts.

// Wie viele Versuche je Sitzung und Minute. Bewusst klein: wer einen Code
// bekommen hat, tippt ihn einmal — wer rät, braucht Tausende.
const VERSUCHE_PRO_MINUTE = 8;
const FENSTER_MS = 60_000;
const versuche = new Map();   // userId → [Zeitstempel]

// ⚠️ Bei jedem Aufruf aufräumen statt per Timer: eine Route in einer
// serverlosen Umgebung wird eingefroren, ein `setInterval` läuft dort nicht
// zuverlässig — und ein Speicher, der nur wächst, ist ein Leck mit Anlauf.
function zuVieleVersuche(userId) {
  const jetzt = Date.now();
  const alt = (versuche.get(userId) ?? []).filter((t) => jetzt - t < FENSTER_MS);
  alt.push(jetzt);
  versuche.set(userId, alt);
  if (versuche.size > 5000) {
    for (const [k, v] of versuche) if (!v.some((t) => jetzt - t < FENSTER_MS)) versuche.delete(k);
  }
  return alt.length > VERSUCHE_PRO_MINUTE;
}

export async function POST(request) {
  const service = getServiceKey();
  if (!SUPABASE_URL || !service) {
    return Response.json({ error: "Server nicht konfiguriert." }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  // Token gegen Supabase prüfen → verlässliche Nutzer-Id. ⚠️ Niemals die vom
  // Client mitgeschickte Id glauben: sonst tritt man in fremdem Namen bei.
  const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: whoErr } = await asUser.auth.getUser();
  if (whoErr || !user) return Response.json({ error: "Sitzung ungültig." }, { status: 401 });

  if (zuVieleVersuche(user.id)) {
    return Response.json({ error: "Zu viele Versuche. Warte kurz." }, { status: 429 });
  }

  let code = null;
  try {
    ({ code } = await request.json());
  } catch {
    return Response.json({ error: "Kein Code übergeben." }, { status: 400 });
  }
  const sauber = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!sauber) return Response.json({ error: "Kein Code übergeben." }, { status: 400 });

  const admin = createClient(SUPABASE_URL, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: runde, error } = await admin
    .from("rounds").select("id, name").eq("join_code", sauber).maybeSingle();
  if (error) return Response.json({ error: "Beitritt fehlgeschlagen." }, { status: 500 });
  // ⚠️ Dieselbe Antwort für „gibt es nicht" wie für jeden anderen Fehlgriff —
  // ein Unterschied im Wortlaut wäre schon die halbe Auskunft für jemanden,
  // der Codes durchprobiert.
  if (!runde) return Response.json({ error: "Diesen Code gibt es nicht." }, { status: 404 });

  const { error: mErr } = await admin
    .from("round_members")
    .upsert({ round_id: runde.id, user_id: user.id },
      { onConflict: "round_id,user_id", ignoreDuplicates: true });
  if (mErr) return Response.json({ error: "Beitritt fehlgeschlagen." }, { status: 500 });

  // 🔴 Ohne `join_code`. Die Route ist die einzige Stelle, die ihn je sieht.
  return Response.json({ id: runde.id, name: runde.name });
}
