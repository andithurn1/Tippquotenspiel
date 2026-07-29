// ============================================================
//  QUOTEN HOLEN — einmal bezahlen, beliebig oft testen
//
//  Aufruf:  npm run odds:pruefen        (KOSTENLOS — nur Klubnamen abgleichen)
//           npm run odds:holen          (kostet 1 Credit JE LIGA)
//           npm run odds:holen -- bl    (nur eine Liga)
//
//  ── Warum es dieses Skript gibt ──
//  Der Gratis-Tarif hat 500 Anfragen im MONAT. Die Route `/api/odds` hat zwar
//  einen 30-Minuten-Zwischenspeicher, der aber im Arbeitsspeicher liegt: jeder
//  Neustart des Dev-Servers fängt von vorn an. Beim Entwickeln startet man den
//  Server zwanzigmal am Tag — so ist das Monatskontingent in einer Woche weg.
//
//  Deshalb: EINMAL holen, als Datei ablegen, danach beliebig oft abspielen.
//  Vier Ligen kosten vier Credits; 500 Credits reichen damit für gut 120
//  vollständige Auffrischungen. Mehrere Gratis-Zugänge zu kombinieren wäre
//  nicht nur gegen die Nutzungsbedingungen, es löst auch das falsche Problem —
//  die Kosten entstehen durch WIEDERHOLTES Holen, nicht durch die Menge.
//
//  ⚠️ Der `/events`-Endpunkt ist KOSTENLOS, `/odds` nicht. Deshalb macht der
//  Prüflauf alles, was ohne Quoten geht: Klubnamen abgleichen. Wer erst prüft
//  und dann holt, verbrennt keinen Credit an einer Liga, deren Namen ohnehin
//  nicht passen.
// ============================================================
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTheOddsApiEvent } from "../src/lib/oddsApi.js";
import { ausApiName, unbekannteKlubs } from "../src/lib/klubnamen.js";
import { vereineVon } from "../src/lib/ligen.js";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = resolve(HIER, "..");
const ZIEL = resolve(WURZEL, "src/lib/quoten");

const LIGEN = {
  bl: { label: "Bundesliga", sport: "soccer_germany_bundesliga" },
  pl: { label: "Premier League", sport: "soccer_epl" },
  pd: { label: "La Liga", sport: "soccer_spain_la_liga" },
  sa: { label: "Serie A", sport: "soccer_italy_serie_a" },
  mls: { label: "MLS", sport: "soccer_usa_mls" },
};

// Der Schlüssel steht in `.env.local` (nicht im Repo) oder in der Umgebung.
// Bewusst nicht als Kommandozeilen-Argument: Argumente landen in der
// Shell-Historie und in Prozesslisten.
function schluessel() {
  if (process.env.ODDS_API_KEY) return process.env.ODDS_API_KEY.trim();
  const datei = resolve(WURZEL, ".env.local");
  if (existsSync(datei)) {
    const t = readFileSync(datei, "utf8").match(/^ODDS_API_KEY=(.+)$/m);
    if (t) return t[1].trim();
  }
  return null;
}

async function hole(url) {
  const res = await fetch(url);
  const rest = res.headers.get("x-requests-remaining");
  const daten = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${daten?.message ?? "unbekannt"}`);
  return { daten, rest };
}

// KOSTENLOS: Klubnamen gegen unseren Katalog abgleichen.
async function pruefe(key, kurz, liga) {
  const { daten, rest } = await hole(`https://api.the-odds-api.com/v4/sports/${liga.sport}/events?apiKey=${key}`);
  const apiNamen = [...new Set(daten.flatMap((e) => [e.home_team, e.away_team]))];
  const befund = unbekannteKlubs(apiNamen, vereineVon(kurz), kurz);

  console.log(`\n── ${liga.label} (${kurz}) ── ${daten.length} anstehende Spiele · ${apiNamen.length} Klubs · ${rest} Credits übrig`);
  if (befund.ok) { console.log("   ✅ alle Klubnamen passen"); return { kurz, ok: true }; }

  console.log(`   ❌ ${befund.unbekannt.length} Klub(s) kennt unser Katalog nicht:`);
  console.log(`      ${befund.unbekannt.join(" · ")}`);
  if (befund.fehlend.length) {
    console.log(`   ↔  bei uns, aber nicht bei der API:`);
    console.log(`      ${befund.fehlend.join(" · ")}`);
  }
  console.log("   → Jeder Name oben ist ENTWEDER eine fehlende Schreibweise (dann nach\n"
    + "      KLUB_ALIASE in src/lib/klubnamen.js) ODER ein Klub, der in dieser Liga\n"
    + "      gar nicht (mehr) spielt (dann gehört die Klubliste korrigiert, und ein\n"
    + "      Alias würde den Fehler nur verdecken). Das entscheidet ein Blick auf die\n"
    + "      beiden Listen — automatisch geraten wird hier nichts.");
  return { kurz, ok: false };
}

// Das ECHTE Ergebnis-Raster eines Spiels holen (`correct_score`).
//
// ⚠️ Bewusst `regions=us`: den Markt führen nur US-Buchmacher, in `eu` ist er
// leer. Das ist unkritisch — margenbereinigt weichen die beiden Regionen über
// neun Bundesliga-Spiele um 0,47 Prozentpunkte voneinander ab. Für `h2h`
// bleiben wir trotzdem bei `eu`, dort liefern 19–20 Büros statt 6–8 und der
// Median ist damit robuster.
//
// Kostet 1 Credit JE SPIEL — der Markt gibt es nur über den Einzelspiel-Endpunkt.
async function holeRaster(key, liga, eventId) {
  const url = `https://api.the-odds-api.com/v4/sports/${liga.sport}/events/${eventId}/odds`
    + `?regions=us&markets=correct_score&oddsFormat=decimal&apiKey=${key}`;
  try {
    const { daten } = await hole(url);
    const proErgebnis = new Map();
    for (const b of daten.bookmakers || []) {
      for (const m of b.markets || []) {
        for (const o of m.outcomes || []) {
          // Format: "Heimteam:2|Gastteam:1"
          const t = String(o.name).match(/:(\d+)\|.*:(\d+)/);
          if (!t) continue;
          const k = `${t[1]}:${t[2]}`;
          if (!proErgebnis.has(k)) proErgebnis.set(k, []);
          proErgebnis.get(k).push(Number(o.price));
        }
      }
    }
    if (!proErgebnis.size) return null;
    return Object.fromEntries([...proErgebnis].map(([k, v]) => [k, median(v)]));
  } catch {
    return null;   // ein fehlendes Raster ist kein Grund, die Liga zu verlieren
  }
}

const median = (a) => {
  const s = a.filter((v) => v > 1).sort((x, y) => x - y);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : +((s[m - 1] + s[m]) / 2).toFixed(2);
};

// KOSTET CREDITS: 1 für die 1X2-Quoten der ganzen Liga, plus 1 je Spiel für
// das Ergebnis-Raster (nur mit `--raster`).
async function holeQuoten(key, kurz, liga, { raster = false } = {}) {
  const url = `https://api.the-odds-api.com/v4/sports/${liga.sport}/odds`
    + `?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${key}`;
  const { daten, rest } = await hole(url);

  const spiele = [];
  const gesehen = new Set();
  for (const e of daten) {
    const p = parseTheOddsApiEvent(e, { idPrefix: kurz });
    if (!p) continue;
    // Die API listet dieselbe Begegnung gelegentlich zweimal mit
    // verschiedenen Event-Ids. Ungefiltert holten wir für den Zwilling ein
    // zweites Ergebnis-Raster — ein bezahlter Credit für nichts.
    const paar = `${p.home}|${p.away}`;
    if (gesehen.has(paar)) continue;
    gesehen.add(paar);
    // Auf UNSERE Namen übersetzen, damit die Datei ohne weitere Übersetzung
    // gegen den Katalog passt.
    const eintrag = {
      home: ausApiName(kurz, p.home),
      away: ausApiName(kurz, p.away),
      kickoff: p.kickoff,
      odds: p.odds,
    };
    if (raster) {
      const r = await holeRaster(key, liga, e.id);
      if (r) eintrag.correctScore = r;
    }
    spiele.push(eintrag);
  }
  if (raster) {
    const mit = spiele.filter((s) => s.correctScore).length;
    console.log(`   Ergebnis-Raster: ${mit} von ${spiele.length} Spielen`);
  }

  mkdirSync(ZIEL, { recursive: true });
  const pfad = resolve(ZIEL, `${kurz}.js`);
  const kopf = [
    "// ============================================================",
    `//  ${liga.label.toUpperCase()} — ECHTE 1X2-QUOTEN`,
    "//",
    "//  ERZEUGTE DATEI — nicht von Hand bearbeiten.",
    `//  Neu holen:  npm run odds:holen -- ${kurz}   (kostet 1 Credit)`,
    "//",
    "//  Quelle:   the-odds-api.com, Median über die EU-Buchmacher",
    `//  Geholt:   ${new Date().toISOString()}`,
    `//  Umfang:   ${spiele.length} Spiele (nur ANSTEHENDE — die API liefert keine`,
    "//            ganze Saison im Voraus)",
    "//",
    "//  Klubnamen sind bereits auf unseren Katalog übersetzt (klubnamen.js).",
    `//  Ergebnis-Raster: ${spiele.filter((s) => s.correctScore).length} von ${spiele.length} Spielen`,
    "//  (`correctScore` = ECHTE Marktpreise je Endstand. Wo es fehlt, leitet",
    "//   oddsApi.snapshotFromOdds() das Raster wie bisher aus 1X2 ab.)",
    "// ============================================================",
    "",
    "export default ",
  ].join("\n");
  writeFileSync(pfad, kopf + JSON.stringify(spiele, null, 1) + ";\n", "utf8");
  console.log(`\n── ${liga.label} (${kurz}) ── ${spiele.length} Spiele → ${pfad}`);
  console.log(`   ${rest} Credits übrig`);
  return { kurz, ok: true, anzahl: spiele.length };
}

const args = process.argv.slice(2);
const nurPruefen = args.includes("--pruefen");
const mitRaster = args.includes("--raster");
const keys = args.filter((a) => !a.startsWith("--"));
const zuTun = keys.length ? keys : Object.keys(LIGEN);

const key = schluessel();
if (!key) {
  console.log("❌ Kein ODDS_API_KEY — in .env.local eintragen (nicht ins Repo).");
  process.exitCode = 1;
} else {
  const out = [];
  for (const kurz of zuTun) {
    const liga = LIGEN[kurz];
    if (!liga) { console.log(`\n❌ Unbekannte Liga „${kurz}"`); out.push({ kurz, ok: false }); continue; }
    try {
      out.push(nurPruefen
        ? await pruefe(key, kurz, liga)
        : await holeQuoten(key, kurz, liga, { raster: mitRaster }));
    } catch (e) {
      console.log(`\n── ${liga.label} (${kurz}) ──\n   ❌ ${e.message}`);
      out.push({ kurz, ok: false });
    }
  }
  const schlecht = out.filter((r) => !r.ok);
  console.log(`\n${schlecht.length ? "❌" : "✅"} ${out.length - schlecht.length} von ${zuTun.length} Ligen in Ordnung.`);
  if (nurPruefen) console.log("   (Prüflauf — keine Credits verbraucht, nichts geschrieben.)");
  process.exitCode = schlecht.length ? 1 : 0;
}
