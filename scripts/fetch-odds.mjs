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
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseTheOddsApiEvent, totalsAusEvent, torschnittAusTotals } from "../src/lib/oddsApi.js";
import { ausApiName, unbekannteKlubs } from "../src/lib/klubnamen.js";
import { vereineVon } from "../src/lib/ligen.js";
import { zuordne, verschmelze, fortschritt } from "../src/lib/kader.js";

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = resolve(HIER, "..");
const ZIEL = resolve(WURZEL, "src/lib/quoten");
const KADER = resolve(WURZEL, "src/lib/kader");

// `beobachtung` sind Wettbewerbe, die wir NICHT anbieten, aus denen wir aber
// Kader-Beobachtungen ziehen. Der Grund ist ein Startproblem, das sonst genau
// zum Launch aufflöge:
//
//   Die Vereinszuordnung braucht ZWEI Spiele je Klub. Am 1. Spieltag hat jeder
//   Klub genau eines — es wäre also kein einziger Spieler zugeordnet, und
//   ausgerechnet zum Start ginge der Torschützen-Tipp je Mannschaft nicht.
//
// Der DFB-Pokal läuft ab dem 21.08., die Bundesliga startet am 28.08. Die erste
// Runde liefert damit die erste Beobachtung, der 1. Spieltag die zweite — und
// zum Launch steht die Zuordnung. Dass die Pokal-Gegner Drittligisten sind,
// stört nicht: für die Schnittmenge zählt nur, dass der eigene Verein in beiden
// Paaren vorkommt.
const LIGEN = {
  bl: { label: "Bundesliga", sport: "soccer_germany_bundesliga", beobachtung: ["soccer_germany_dfb_pokal"] },
  pl: { label: "Premier League", sport: "soccer_epl", beobachtung: ["soccer_england_efl_cup", "soccer_fa_cup"] },
  pd: { label: "La Liga", sport: "soccer_spain_la_liga", beobachtung: [] },
  sa: { label: "Serie A", sport: "soccer_italy_serie_a", beobachtung: [] },
  mls: { label: "MLS", sport: "soccer_usa_mls", beobachtung: ["soccer_concacaf_leagues_cup"] },
  // Die CL fehlte hier, obwohl sie im Match-Katalog steht — `odds:holen -- cl`
  // brach mit „Unbekannte Liga" ab. Aufgefallen beim Durchmessen am 29.07.
  // ⚠️ Bis zur Auslosung Ende August liefert der Endpunkt NULL Spiele, und das
  // ist richtig so: eine leere Antwort kostet keinen Credit. Der Eintrag muss
  // trotzdem hier stehen, sonst merkt niemand, wann die Auslosung durch ist.
  cl: { label: "Champions League", sport: "soccer_uefa_champs_league", beobachtung: [] },
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

// Die TORSCHÜTZEN eines Spiels. Liefert nur Namen mit Quote — der Markt sagt
// nicht, zu welcher Mannschaft ein Spieler gehört; das leitet `kader.js` aus
// mehreren Spielen ab.
//
// ⚠️ `regions=us`: nur dort wird der Markt gestellt. Und er wird erst 1–7 Tage
// vor Anpfiff geöffnet — für ein Spiel in vier Wochen kommt garantiert nichts
// zurück, das ist kein Fehler. Leere Antworten kosten auch keinen Credit.
async function holeTorschuetzen(key, liga, eventId) {
  const url = `https://api.the-odds-api.com/v4/sports/${liga.sport}/events/${eventId}/odds`
    + `?regions=us&markets=player_goal_scorer_anytime&oddsFormat=decimal&apiKey=${key}`;
  try {
    const { daten } = await hole(url);
    const proSpieler = new Map();
    for (const b of daten.bookmakers || []) {
      for (const m of b.markets || []) {
        for (const o of m.outcomes || []) {
          // `name` ist "Yes"/"No", der Spieler steht in `description`.
          if (o.name !== "Yes" || !o.description) continue;
          const n = String(o.description).trim();
          if (!proSpieler.has(n)) proSpieler.set(n, []);
          proSpieler.get(n).push(Number(o.price));
        }
      }
    }
    if (!proSpieler.size) return null;
    return Object.fromEntries([...proSpieler].map(([n, v]) => [n, median(v)]));
  } catch {
    return null;
  }
}

const median = (a) => {
  const s = a.filter((v) => v > 1).sort((x, y) => x - y);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : +((s[m - 1] + s[m]) / 2).toFixed(2);
};

// KOSTET CREDITS: 2 für die ganze Liga (1X2 + Über/Unter), plus 1 je Spiel für
// das Ergebnis-Raster (nur mit `--raster`).
//
// Die Über/Unter-Linie kommt bewusst in DERSELBEN Anfrage mit: der Anbieter
// rechnet Märkte × Regionen, ein zweiter Markt kostet also 1 Credit für die
// ganze Liga — das Ergebnis-Buch kostet 1 Credit JE SPIEL. Sie ist damit die
// mit Abstand billigste Torschnitt-Messung, und sie ist Wochen vor Anpfiff
// schon da, während `correct_score` erst kurz davor auftaucht.
async function holeQuoten(key, kurz, liga, { raster = false, schuetzen = false } = {}) {
  const url = `https://api.the-odds-api.com/v4/sports/${liga.sport}/odds`
    + `?regions=eu&markets=h2h,totals&oddsFormat=decimal&apiKey=${key}`;
  const { daten, rest } = await hole(url);

  // ⚠️ Ein Auffrischen der 1X2-Quoten darf die teuer geholten Ergebnis-Raster
  // nicht wegwerfen. Sie kosten 1 Credit JE SPIEL — bei der MLS also 31 für
  // einen Lauf, den man aus Versehen mit `odds:holen -- mls` überschreibt.
  // (Genau das ist mir beim Bauen passiert.) Ohne `--raster` werden vorhandene
  // Raster deshalb übernommen und ihr Alter genannt, statt still zu
  // verschwinden.
  const altePfad = resolve(ZIEL, `${kurz}.js`);
  let alteRaster = new Map(); let alteSchuetzen = new Map(); let alteZeit = null;
  if ((!raster || !schuetzen) && existsSync(altePfad)) {
    try {
      const alt = await import(pathToFileURL(altePfad).href + `?t=${Date.now()}`);
      alteZeit = alt.GEHOLT ?? null;
      const vorher = alt.default ?? [];
      alteRaster = new Map(vorher.filter((s) => s.correctScore)
        .map((s) => [`${s.home}|${s.away}`, s.correctScore]));
      alteSchuetzen = new Map(vorher.filter((s) => s.torschuetzen)
        .map((s) => [`${s.home}|${s.away}`, s.torschuetzen]));
    } catch { /* kaputte Altdatei: dann eben ohne */ }
  }

  const spiele = [];
  const gesehen = new Set();
  for (const e of daten) {
    const p = parseTheOddsApiEvent(e, { idPrefix: kurz });
    if (!p) continue;
    // ⚠️ ZUERST übersetzen, dann erst als Schlüssel benutzen. Die Datei
    // speichert unsere Namen; wer mit den API-Namen nachschlägt, findet nur die
    // Klubs, die zufällig gleich heißen — bei der Bundesliga waren das 2 von 9,
    // und die übrigen sieben Raster gingen beim Auffrischen verloren.
    const home = ausApiName(kurz, p.home);
    const away = ausApiName(kurz, p.away);
    // Die API listet dieselbe Begegnung gelegentlich zweimal mit
    // verschiedenen Event-Ids. Ungefiltert holten wir für den Zwilling ein
    // zweites Ergebnis-Raster — ein bezahlter Credit für nichts.
    const paar = `${home}|${away}`;
    if (gesehen.has(paar)) continue;
    gesehen.add(paar);
    const eintrag = { home, away, kickoff: p.kickoff, odds: p.odds };
    // Der gemessene Torschnitt. Kommt gratis in derselben Antwort mit; fehlt
    // er, liest ihn `snapshotFromOdds` aus dem Ergebnis-Buch oder schätzt ihn
    // wie bisher.
    const total = torschnittAusTotals(totalsAusEvent(e));
    if (total) eintrag.total = total;
    if (raster) {
      const r = await holeRaster(key, liga, e.id);
      if (r) eintrag.correctScore = r;
    } else {
      const alt = alteRaster.get(paar);
      if (alt) eintrag.correctScore = alt;
    }
    if (schuetzen) {
      const s = await holeTorschuetzen(key, liga, e.id);
      if (s) eintrag.torschuetzen = s;
    } else {
      const alt = alteSchuetzen.get(paar);
      if (alt) eintrag.torschuetzen = alt;
    }
    spiele.push(eintrag);
  }
  const mit = spiele.filter((s) => s.correctScore).length;
  const mitTotal = spiele.filter((s) => s.total).length;
  console.log(`   Torschnitt gemessen: ${mitTotal} von ${spiele.length} Spielen`
    + (mitTotal ? ` (Ø ${(spiele.reduce((s, x) => s + (x.total || 0), 0) / mitTotal).toFixed(2)} Tore)` : ""));
  if (raster) {
    console.log(`   Ergebnis-Raster: ${mit} von ${spiele.length} Spielen`);
  } else if (mit) {
    console.log(`   Ergebnis-Raster: ${mit} übernommen aus dem vorigen Lauf`
      + (alteZeit ? ` (${alteZeit.slice(0, 16).replace("T", " ")} UTC)` : "")
      + " — mit --raster neu holen.");
  }

  mkdirSync(ZIEL, { recursive: true });
  const pfad = resolve(ZIEL, `${kurz}.js`);
  const kopf = [
    "// ============================================================",
    `//  ${liga.label.toUpperCase()} — ECHTE 1X2-QUOTEN`,
    "//",
    "//  ERZEUGTE DATEI — nicht von Hand bearbeiten.",
    `//  Neu holen:  npm run odds:holen -- ${kurz}   (kostet 2 Credits)`,
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
    `//  Torschnitt:      ${spiele.filter((s) => s.total).length} von ${spiele.length} Spielen`,
    "//  (`total` = erwartete Gesamt-Tore aus der echten Über/Unter-Linie. Damit",
    "//   ist der Torschnitt gemessen statt geschätzt — und ρ mit ihm.)",
    "// ============================================================",
    "",
    "// Der Zeitstempel steht auch als DATEN da, nicht nur im Kopf: nur so kann",
    "// die App merken, dass ihre Quoten alt sind (siehe quotenAlter in spielplan.js).",
    "",
    `export const GEHOLT = "${new Date().toISOString()}";`,
    "",
    "export default ",
  ].join("\n");
  writeFileSync(pfad, kopf + JSON.stringify(spiele, null, 1) + ";\n", "utf8");
  await schreibeKader(kurz, liga, spiele, key, schuetzen);
  console.log(`\n── ${liga.label} (${kurz}) ── ${spiele.length} Spiele → ${pfad}`);
  console.log(`   ${rest} Credits übrig`);
  return { kurz, ok: true, anzahl: spiele.length };
}

// ── Kader mitschreiben ──────────────────────────────────────
// Die Torschützen-Quoten nennen keinen Verein. `kader.js` leitet ihn aus der
// SCHNITTMENGE mehrerer Spiele ab — dafür muss über Läufe hinweg gesammelt
// werden, denn ein einzelner Abruf zeigt jeden Verein meist nur einmal.
// (Gemessen: 15 MLS-Spiele = 30 Klub-Auftritte bei 30 Vereinen, also null
// Schnittmengen. Erst der Abruf der nächsten Runde löst auf.)
async function schreibeKader(kurz, liga, spiele, key, mitBeobachtung = false) {
  const neu = spiele.filter((s) => s.torschuetzen).map((s) => ({
    home: s.home, away: s.away, kickoff: s.kickoff,
    spieler: Object.keys(s.torschuetzen),
  }));

  // Zusätzliche Beobachtungen aus Wettbewerben, die wir nicht anbieten
  // (Pokal). Sie landen NUR im Kader, nie in den Quoten-Dateien — getippt wird
  // darauf nicht.
  if (mitBeobachtung) {
    for (const sport of liga.beobachtung ?? []) {
      try {
        const { daten } = await hole(`https://api.the-odds-api.com/v4/sports/${sport}/events?apiKey=${key}`);
        if (!Array.isArray(daten)) continue;
        let gefunden = 0;
        for (const e of daten) {
          const s = await holeTorschuetzen(key, { sport }, e.id);
          if (!s) continue;
          neu.push({
            home: ausApiName(kurz, e.home_team), away: ausApiName(kurz, e.away_team),
            kickoff: e.commence_time, spieler: Object.keys(s),
          });
          gefunden++;
        }
        if (gefunden) console.log(`   + ${gefunden} Beobachtungen aus ${sport}`);
      } catch { /* ein fehlender Nebenwettbewerb ist kein Grund abzubrechen */ }
    }
  }

  if (!neu.length) return;

  const pfad = resolve(KADER, `${kurz}.js`);
  let alt = []; let vorher = {};
  if (existsSync(pfad)) {
    try {
      const m = await import(pathToFileURL(pfad).href + `?t=${Date.now()}`);
      alt = m.BEOBACHTUNGEN ?? [];
      // ⚠️ Die bisherige Zuordnung MUSS mit hinein. Beobachtungen werden
      // gedeckelt; ein zwei Monate verletzter Spieler fiele sonst aus den Daten
      // und wäre nach seinem Comeback wieder unbekannt — ausgerechnet der
      // zurückkehrende Stürmer nicht tippbar.
      vorher = m.ZUORDNUNG ?? {};
    } catch { /* kaputte Altdatei: dann eben von vorn */ }
  }
  const alle = verschmelze(alt, neu);
  const erg = zuordne(alle, vorher);
  const f = fortschritt(erg);
  const behalten = Object.keys(erg.zuordnung).filter((s) => vorher[s] && !alle.some(
    (b) => (b.spieler ?? []).includes(s))).length;

  mkdirSync(KADER, { recursive: true });
  const kopf = [
    "// ============================================================",
    `//  ${liga.label.toUpperCase()} — KADER, abgeleitet aus den Torschützen-Quoten`,
    "//",
    "//  ERZEUGTE DATEI — nicht von Hand bearbeiten.",
    `//  Wächst mit:  npm run odds:holen -- ${kurz} --schuetzen`,
    "//",
    `//  Stand:       ${new Date().toISOString()}`,
    `//  Beobachtete Spiele: ${alle.length}`,
    `//  Zugeordnet:  ${f.zugeordnet} von ${f.gesamt} Spielern (${Math.round(f.anteil * 100)} %)`,
    "//",
    "//  Es gibt KEINE Kaderquelle. Die Quoten sind der Kader: ein Buchmacher",
    "//  bepreist keinen Verletzten. Der Verein steckt in der Schnittmenge —",
    "//  wer in zwei Spielen desselben Klubs mit verschiedenen Gegnern",
    "//  vorkommt, ist eindeutig. Bis dahin bleibt er offen und wird nicht",
    "//  angeboten: ein Spieler bei der falschen Mannschaft wäre ein stiller",
    "//  Fehler, der erst bei der Abrechnung auffällt.",
    "// ============================================================",
    "",
    `export const ZUORDNUNG = ${JSON.stringify(erg.zuordnung, null, 1)};`,
    "",
    `export const BEOBACHTUNGEN = ${JSON.stringify(alle, null, 1)};`,
    "",
  ].join("\n");
  writeFileSync(pfad, kopf, "utf8");
  console.log(`   Kader: ${f.zugeordnet}/${f.gesamt} Spieler zugeordnet (${Math.round(f.anteil * 100)} %) aus ${alle.length} Spielen`);
  if (behalten) {
    console.log(`      davon ${behalten} aus dem Gedächtnis — gerade nicht im Markt`);
    console.log("        (verletzt, gesperrt, nicht im Kader). Sie bleiben tippbar.");
  }
  if (f.zugeordnet === 0 && alle.length) {
    console.log("      → Noch keine Schnittmenge. Jeder Verein kam bisher nur einmal vor;");
    console.log("        der Abruf der NÄCHSTEN Spielrunde löst das auf.");
  }
}

// Der Index über alle vorhandenen Quoten-Dateien. Liest das Verzeichnis, statt
// dem laufenden Aufruf zu glauben — nur so bleibt er vollständig, wenn jemand
// eine einzelne Liga auffrischt.
function schreibeQuotenIndex() {
  const keys = readdirSync(ZIEL)
    .filter((f) => f.endsWith(".js") && f !== "index.js")
    .map((f) => f.replace(/\.js$/, ""))
    .filter((k) => LIGEN[k])          // was keiner Liga entspricht, gehört nicht hinein
    .sort();
  const inhalt = [
    "// ============================================================",
    "//  QUOTEN — die eine Einstiegsstelle für echte Marktquoten",
    "//",
    "//  ERZEUGTE DATEI — wird von `npm run odds:holen` neu geschrieben.",
    "//  Abgelesen aus dem Verzeichnis: hier steht, was WIRKLICH da liegt.",
    "//",
    "//  Dieselbe Auflösung wie bei `spielplaene/index.js`: die Ligadateien dürfen",
    "//  die Quoten-Dateien nicht direkt importieren, weil der Abruf seinerseits die",
    "//  Klublisten AUS den Ligadateien braucht.",
    "//",
    "//  Fehlt ein Wettbewerb, bleiben seine Quoten erzeugt (Poisson-Modell in",
    "//  `oddsGenerator.js`). Das ist der Normalfall für alles, was weiter als ein",
    "//  paar Tage in der Zukunft liegt — kein Buchmacher bepreist eine ganze Saison.",
    "// ============================================================",
    "",
    ...keys.map((k) => `import ${k} from "./${k}";`),
    "",
    `export const QUOTEN = { ${keys.join(", ")} };`,
    "",
  ].join("\n");
  writeFileSync(resolve(ZIEL, "index.js"), inhalt, "utf8");
  console.log(`\n   Quoten-Index: ${keys.length} Ligen (${keys.join(", ") || "keine"})`);
}

const args = process.argv.slice(2);
const nurPruefen = args.includes("--pruefen");
const mitRaster = args.includes("--raster");
const mitSchuetzen = args.includes("--schuetzen");
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
        : await holeQuoten(key, kurz, liga, { raster: mitRaster, schuetzen: mitSchuetzen }));
    } catch (e) {
      console.log(`\n── ${liga.label} (${kurz}) ──\n   ❌ ${e.message}`);
      out.push({ kurz, ok: false });
    }
  }
  // ⚠️ Ohne diesen Schritt war der ganze Abruf WIRKUNGSLOS für neue Ligen.
  // `quoten/index.js` behauptete in seinem Kopf, erzeugt zu werden — nur schrieb
  // sie niemand. Wer `odds:holen -- pl` laufen ließ, bekam eine korrekte
  // `quoten/pl.js` und im Katalog trotzdem weiter erzeugte Quoten, ohne
  // Fehlermeldung. Aufgefallen am 29.07. beim Durchmessen aller Ligen.
  //
  // Der Index wird ABGELESEN (welche Dateien liegen wirklich da), nicht aus dem
  // aktuellen Lauf abgeleitet — sonst verlöre ein Lauf für eine einzelne Liga
  // die Quoten aller anderen.
  if (!nurPruefen) schreibeQuotenIndex();

  const schlecht = out.filter((r) => !r.ok);
  console.log(`\n${schlecht.length ? "❌" : "✅"} ${out.length - schlecht.length} von ${zuTun.length} Ligen in Ordnung.`);
  if (nurPruefen) console.log("   (Prüflauf — keine Credits verbraucht, nichts geschrieben.)");
  process.exitCode = schlecht.length ? 1 : 0;
}
