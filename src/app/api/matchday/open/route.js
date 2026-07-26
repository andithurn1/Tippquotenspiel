import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, getServiceKey } from "@/lib/supabaseClient";
import { spieltagOeffnen } from "@/lib/spieltagOeffnen";
import { sanitizeRules } from "@/lib/engine";
import { wettbewerbVon, DEFAULT_WETTBEWERB } from "@/lib/wettbewerbe";

// ── Spieltag öffnen (Big Game einfrieren) ───────────────────
// Läuft SERVERSEITIG, und zwar aus zwei getrennten Gründen:
//
//  1. `matches` ist per RLS für Clients nur LESBAR (siehe schema.sql) —
//     Schreiben geht nur mit dem service_role-Key, der nie ins Frontend darf.
//  2. Wer öffnen darf, ist eine Fairness-Frage, keine Bequemlichkeit. Die
//     Auswahl des Big Game hängt am Tabellenstand ZUM ZEITPUNKT des Öffnens.
//     Dürfte jeder Mitspieler öffnen, könnte er den Moment wählen, der ihm
//     passt. Deshalb: nur der Admin der Runde.
//
// Die Rechnung selbst steht in `spieltagOeffnen.js` und ist idempotent — ein
// zweiter Aufruf lässt alles, wie es ist.
export async function POST(request) {
  const service = getServiceKey();
  if (!SUPABASE_URL || !service) {
    return Response.json({ error: "Server nicht konfiguriert." }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { body = null; }
  const roundId = body?.roundId;
  const matchday = Number(body?.matchday);
  // Ohne Angabe der Standard-Wettbewerb — NICHT „alle". Quer über Wettbewerbe
  // zu öffnen wäre genau der Fehler, den Andre im Mock gefunden hat: das Big
  // Game käme dann aus 36 statt 18 Spielen.
  const wettbewerb = typeof body?.wettbewerb === "string" && body.wettbewerb
    ? body.wettbewerb : DEFAULT_WETTBEWERB;
  if (!roundId || !Number.isFinite(matchday)) {
    return Response.json({ error: "roundId und matchday erforderlich." }, { status: 400 });
  }

  // Token gegen Supabase prüfen → verlässliche Nutzer-Id (nicht vom Client geglaubt).
  const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: whoErr } = await asUser.auth.getUser();
  if (whoErr || !user) return Response.json({ error: "Sitzung ungültig." }, { status: 401 });

  const admin = createClient(SUPABASE_URL, service, { auth: { persistSession: false } });

  const { data: round, error: roundErr } = await admin
    .from("rounds").select("id, admin_id, rules").eq("id", roundId).single();
  if (roundErr || !round) return Response.json({ error: "Runde nicht gefunden." }, { status: 404 });
  if (round.admin_id !== user.id) {
    return Response.json({ error: "Nur der Admin der Runde darf einen Spieltag öffnen." }, { status: 403 });
  }

  const { data: alle, error: mErr } = await admin
    .from("matches").select("id, home, away, kickoff, matchday, wettbewerb, phase, snapshot, result");
  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  // Spieltag ist erst mit dem Wettbewerb eindeutig — dieselbe Regel wie beim
  // Joker (siehe spieltagKey in der Engine).
  const desSpieltags = (alle ?? []).filter((m) =>
    m.matchday === matchday && wettbewerbVon(m) === wettbewerb);

  const ergebnis = spieltagOeffnen({
    spieltag: matchday,
    matches: desSpieltags.map((m) => ({ ...m, snapshot: m.snapshot })),
    // Tabelle NUR aus demselben Wettbewerb — sonst mischt die Spannungs-
    // Rechnung zwei Ligen zu einer Tabelle (derselbe Fund wie im Mock).
    gespielt: (alle ?? []).filter((m) => m.result && wettbewerbVon(m) === wettbewerb),
    rules: sanitizeRules(round.rules ?? {}),
  });

  // Nichts zu tun (schon offen) → früh raus, ohne Schreibzugriff.
  if (!ergebnis.veraendert) {
    return Response.json({ ok: true, schonOffen: ergebnis.schonOffen, bigGame: ergebnis.bigGame });
  }

  for (const [id, snapshot] of Object.entries(ergebnis.snapshots)) {
    const { error } = await admin.from("matches").update({ snapshot }).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    ok: true, schonOffen: false,
    bigGame: ergebnis.bigGame, geschrieben: Object.keys(ergebnis.snapshots).length,
  });
}
