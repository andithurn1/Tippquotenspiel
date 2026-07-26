import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, getServiceKey } from "@/lib/supabaseClient";
import { spieltagOeffnen } from "@/lib/spieltagOeffnen";
import { faelligeSpieltage, maxVorlaufStunden } from "@/lib/autoOeffnen";
import { wettbewerbVon } from "@/lib/wettbewerbe";

// ── Spieltage automatisch öffnen (Big Game einfrieren) ──────
//
// Das Gegenstück zum Admin-Knopf in der Spielwahl. Der Knopf bleibt, aber er
// ist ab jetzt die Ausnahme, nicht der Normalfall: hing das Einfrieren am
// Admin, verpuffte die Funktion still, sobald er es vergaß.
//
// ── Warum das eine eigene Route ist und nicht /api/matchday/open ──
// Die bestehende Route ist NUTZER-authentifiziert und rundenbezogen: sie prüft
// `rounds.admin_id` gegen das Bearer-Token. Ein Cron hat keine Sitzung und
// keine Runde. Hier wird deshalb gegen ein separates Geheimnis geprüft.
//
// ── Warum ohne Runde gerechnet wird ──
// Eingefroren wird der objektive Spannungswert, NICHT das Urteil einer Runde
// (siehe spieltagOeffnen.js). Das Öffnen ist damit eine globale Operation —
// `spieltagOeffnen` nimmt `rules` zwar entgegen, benutzt es aber nicht. Die
// Runden werden trotzdem gelesen, aber nur für EINE Frage: wie früh geht das
// Tipp-Fenster der frühesten Runde auf (siehe autoOeffnen.js).
//
// ── Fehlschläge sind einzeln ──
// Ein Spieltag, der nicht geschrieben werden kann, bricht nicht den ganzen
// Lauf ab. Sonst hinge die Automatik für alle an einer kaputten Zeile, und der
// nächste Lauf liefe in denselben Fehler.
export const dynamic = "force-dynamic";

function erlaubt(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return { ok: false, status: 500, error: "CRON_SECRET nicht gesetzt." };
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== secret) {
    return { ok: false, status: 401, error: "Nicht berechtigt." };
  }
  return { ok: true };
}

// Ein Spieltag in der Antwort — knapp, aber eindeutig (die Zahl allein wäre es
// seit den fünf Wettbewerben nicht mehr).
const kurz = (s) => ({ wettbewerb: s.wettbewerb, matchday: s.matchday });

export async function GET(request) {
  const darf = erlaubt(request);
  if (!darf.ok) return Response.json({ error: darf.error }, { status: darf.status });

  const service = getServiceKey();
  if (!SUPABASE_URL || !service) {
    return Response.json({ error: "Server nicht konfiguriert." }, { status: 500 });
  }
  const admin = createClient(SUPABASE_URL, service, { auth: { persistSession: false } });

  const [{ data: rounds, error: rErr }, { data: alle, error: mErr }] = await Promise.all([
    admin.from("rounds").select("id, rules"),
    admin.from("matches").select("id, home, away, kickoff, matchday, wettbewerb, phase, snapshot, result"),
  ]);
  if (rErr) return Response.json({ error: rErr.message }, { status: 500 });
  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });

  const jetzt = Date.now();
  const vorlaufStunden = maxVorlaufStunden(rounds ?? []);
  const faellig = faelligeSpieltage({ matches: alle ?? [], vorlaufStunden, jetzt });

  const geoeffnet = [];
  const fehler = [];

  for (const s of faellig) {
    const imWettbewerb = (m) => wettbewerbVon(m) === wettbewerbVon(s);
    const ergebnis = spieltagOeffnen({
      spieltag: s.matchday,
      matches: s.spiele,
      // Tabelle NUR aus demselben Wettbewerb — sonst mischt die Spannungs-
      // Rechnung zwei Ligen zu einer Tabelle (derselbe Fund wie im Mock).
      // Und nur, was WIRKLICH schon gespielt ist: `result` allein reicht nicht,
      // solange die simulierten Daten alle Ergebnisse vorab tragen.
      gespielt: (alle ?? []).filter((m) => m.result && imWettbewerb(m)
        && new Date(m.kickoff).getTime() <= jetzt),
    });
    if (!ergebnis.veraendert) continue;

    let ok = true;
    for (const [id, snapshot] of Object.entries(ergebnis.snapshots)) {
      const { error } = await admin.from("matches").update({ snapshot }).eq("id", id);
      if (error) { fehler.push({ ...kurz(s), error: error.message }); ok = false; break; }
    }
    if (ok) geoeffnet.push({ ...kurz(s), bigGame: ergebnis.bigGame?.matchId ?? null });
  }

  return Response.json({
    ok: fehler.length === 0,
    vorlaufStunden,
    geprueft: faellig.length,
    geoeffnet,
    fehler,
  });
}
