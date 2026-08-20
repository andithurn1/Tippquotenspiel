// ============================================================
//  GEPLANTE FUNKTION — ruft täglich die Spieltag-Automatik auf
//
//  Das Gegenstück zu `vercel.json` auf Netlify. Sie rechnet NICHTS selbst,
//  sondern ruft `/api/matchday/auto` auf — dieselbe Route, die auch Vercels
//  Cron aufruft.
//
//  🔴 Warum aufrufen statt hier zu rechnen: sonst gäbe es die Logik zweimal,
//  einmal für jeden Anbieter. Genau die Sorte zweiter Wahrheit, an der dieses
//  Projekt schon mehrfach hing. So bleibt der Anbieter austauschbar — dieselbe
//  Haltung wie bei der Quoten-Quelle und beim Store.
//
//  ⚠️ `CRON_SECRET` muss in Netlify unter Site configuration → Environment
//  variables stehen, sonst antwortet die Route mit 401.
//
//  ⚠️ Der Zeitplan steht HIER und nicht in `netlify.toml` — zwei Stellen für
//  dieselbe Zahl laufen auseinander.
// ============================================================
export default async () => {
  const basis = process.env.URL || process.env.DEPLOY_URL;
  if (!basis) return new Response("URL nicht gesetzt", { status: 500 });

  // ⚠️ GET, nicht POST: die Route exportiert nur GET. Mit POST kaeme 405 —
  // und die Automatik liefe still ins Leere, was hier der teuerste Fehlerfall ist.
  const res = await fetch(`${basis}/api/matchday/auto`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
  });
  const text = await res.text();
  // Die Antwort ins Log — ein stiller Fehlschlag ist bei einer Automatik
  // schlimmer als ein lauter (siehe der 10-Sekunden-Befund in der Roadmap).
  console.log(`Spieltag-Automatik: ${res.status} ${text.slice(0, 300)}`);
  return new Response(text, { status: res.status });
};

// 03:00 UTC, wie zuvor bei Vercel.
export const config = { schedule: "0 3 * * *" };
