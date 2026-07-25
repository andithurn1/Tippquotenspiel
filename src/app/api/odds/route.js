import { snapshotsFromTheOddsApi } from "@/lib/oddsApi";

// ── Quoten-Proxy (serverseitig) ─────────────────────────────
// Holt echte 1X2-Quoten bei The Odds API und gibt fertige Snapshots im
// Format der Mock-Quelle zurück. Der API-Schlüssel bleibt hier — er darf NIE
// ins Frontend (deshalb kein NEXT_PUBLIC_).
//
// Ohne gesetzten Schlüssel antwortet die Route bewusst mit 503 statt zu raten:
// die App läuft dann einfach weiter auf den generierten Quoten.
//
// Aufruf:  GET /api/odds            → Bundesliga, kommende Spiele
//          GET /api/odds?liga=soccer_epl
//
// Kostenbremse: Der Gratis-Tarif hat 500 Anfragen/Monat. Deshalb wird die
// Antwort serverseitig zwischengespeichert (Standard 30 Minuten) — Quoten
// bewegen sich nicht im Sekundentakt, und ein offener Tab darf nicht das
// Monatskontingent verbrennen.
const CACHE_MINUTEN = 30;
const cache = new Map(); // liga → { ts, data }

const BASIS = "https://api.the-odds-api.com/v4/sports";

export async function GET(request) {
  const key = process.env.ODDS_API_KEY;
  if (!key) {
    return Response.json(
      { error: "Keine Quoten-API konfiguriert.", hinweis: "ODDS_API_KEY serverseitig setzen." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const liga = searchParams.get("liga") || "soccer_germany_bundesliga";

  const jetzt = Date.now();
  const gecacht = cache.get(liga);
  if (gecacht && jetzt - gecacht.ts < CACHE_MINUTEN * 60000) {
    return Response.json({ ...gecacht.data, gecacht: true });
  }

  const url = `${BASIS}/${encodeURIComponent(liga)}/odds`
    + `?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      // 401 = falscher Schluessel, 429 = Kontingent aufgebraucht.
      return Response.json(
        { error: "Quoten-Anbieter antwortete mit " + res.status },
        { status: res.status === 429 ? 429 : 502 }
      );
    }
    const events = await res.json();
    const spiele = snapshotsFromTheOddsApi(events, { idPrefix: liga.replace("soccer_", "") });

    const data = {
      liga,
      abgerufen: new Date(jetzt).toISOString(),
      // Wie viele Anfragen der Tarif noch hergibt — hilft beim Haushalten.
      verbleibend: res.headers.get("x-requests-remaining"),
      anzahl: spiele.length,
      spiele,
    };
    cache.set(liga, { ts: jetzt, data });
    return Response.json(data);
  } catch {
    return Response.json({ error: "Quoten konnten nicht geladen werden." }, { status: 502 });
  }
}
