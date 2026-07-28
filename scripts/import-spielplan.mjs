// ============================================================
//  SPIELPLAN-IMPORT — echte Kalender holen statt sie zu erzeugen
//
//  Der Launch am 28.08.2026 hängt daran: alle Spiele im Katalog sind erzeugt
//  (Circle-Methode), für den Betrieb brauchen die Ligen ihre ECHTEN Termine.
//
//  Aufruf:  npm run import:spielplan            (alle konfigurierten Ligen)
//           npm run import:spielplan -- bl      (nur eine)
//           npm run import:spielplan -- bl --pruefen   (nur prüfen, nichts schreiben)
//
//  Geschrieben wird `src/lib/spielplaene/<key>-2026.js` — reine Daten,
//  eingelesen von der jeweiligen Ligadatei. Der Generator bleibt unangetastet:
//  liegt eine Datei, übernimmt `baueLiga` sie unverändert; liegt keine, wird
//  wie bisher erzeugt. Dadurch ist der Tausch reversibel und Liga für Liga
//  möglich — was nötig ist, weil die Champions League erst Ende August
//  ausgelost wird.
//
//  ⚠️ Was dieses Skript NICHT tut: Quoten, Ergebnisse oder Torschützen holen.
//  Die bleiben erzeugt, bis die Quoten-API angebunden ist. Jedes so gebaute
//  Match trägt `echterSpielplan: true`, und die Oberfläche liest das ab —
//  ein Katalog, der halb echt ist, darf sich nicht ganz echt nennen.
//
//  ── Zur Quelle ──
//  OpenLigaDB (api.openligadb.de) ist frei, ohne Schlüssel, und liefert die
//  Bundesliga-Termine. Für die ausländischen Ligen hat sie keine Daten; die
//  bekommen denselben Weg über eine hereingereichte JSON-Datei
//  (`--datei <pfad>`), damit der Rest der Kette — Prüfung, Namensabgleich,
//  Ablage — für alle Ligen dieselbe ist und nicht viermal existiert.
// ============================================================
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalisiereSpielplan, pruefeSpielplan } from "../src/lib/spielplan.js";
import { TEAM_RATINGS } from "../src/lib/bundesligaData.js";
import { PL_TEAM_RATINGS } from "../src/lib/premierLeagueData.js";
import { PD_TEAM_RATINGS } from "../src/lib/laLigaData.js";
import { SA_TEAM_RATINGS } from "../src/lib/serieAData.js";

const HIER = dirname(fileURLToPath(import.meta.url));
const ZIEL = resolve(HIER, "../src/lib/spielplaene");
const SAISON = 2026;

// Abweichende Schreibweisen zwischen Quelle und Klubliste. Bewusst eine
// EXPLIZITE Liste und keine Ähnlichkeitssuche: ein automatisch geratener Klub
// fällt nirgends mehr auf, ein unbekannter Name dagegen bricht den Import ab.
// Wächst diese Liste stark, stimmt die Klubliste nicht mehr — dann gehört sie
// korrigiert, nicht der Alias.
const ALIASE = {
  bl: { "SV 07 Elversberg": "SV Elversberg" },
  pl: {},
  pd: {},
  sa: {},
};

const LIGEN = {
  bl: { label: "Bundesliga", ratings: TEAM_RATINGS, openliga: "bl1" },
  pl: { label: "Premier League", ratings: PL_TEAM_RATINGS, openliga: null },
  pd: { label: "La Liga", ratings: PD_TEAM_RATINGS, openliga: null },
  sa: { label: "Serie A", ratings: SA_TEAM_RATINGS, openliga: null },
};

const alias = (key, name) => ALIASE[key]?.[name] ?? name;

async function ausOpenLigaDB(key, liga) {
  const url = `https://api.openligadb.de/getmatchdata/${liga.openliga}/${SAISON}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenLigaDB antwortete mit ${res.status}`);
  const roh = await res.json();
  if (!Array.isArray(roh) || !roh.length) throw new Error("OpenLigaDB lieferte keine Spiele");
  return roh.map((m) => ({
    matchday: m.group?.groupOrderID,
    home: alias(key, m.team1?.teamName),
    away: alias(key, m.team2?.teamName),
    kickoff: m.matchDateTimeUTC,
  }));
}

// Der zweite Weg: eine bereits vorliegende JSON-Datei im Zielformat
// [{ matchday, home, away, kickoff }]. Für die Ligen, die OpenLigaDB nicht hat.
function ausDatei(key, pfad) {
  const roh = JSON.parse(readFileSync(resolve(process.cwd(), pfad), "utf8"));
  const liste = Array.isArray(roh) ? roh : roh.spiele;
  if (!Array.isArray(liste)) throw new Error("Datei enthält keine Spiel-Liste");
  return liste.map((m) => ({ ...m, home: alias(key, m.home), away: alias(key, m.away) }));
}

async function importiere(key, { datei = null, nurPruefen = false } = {}) {
  const liga = LIGEN[key];
  if (!liga) throw new Error(`Unbekannte Liga „${key}" (bekannt: ${Object.keys(LIGEN).join(", ")})`);

  const roh = datei
    ? ausDatei(key, datei)
    : liga.openliga
      ? await ausOpenLigaDB(key, liga)
      : null;

  if (!roh) {
    console.log(`⏭  ${liga.label}: keine Quelle konfiguriert — mit --datei <pfad> einlesen.`);
    return { key, uebersprungen: true };
  }

  const plan = normalisiereSpielplan(roh);
  const teams = Object.keys(liga.ratings);
  const { ok, fehler, warnungen } = pruefeSpielplan(plan, teams);

  console.log(`\n── ${liga.label} (${key}) ──`);
  console.log(`   ${plan.length} Spiele, ${new Set(plan.map((s) => s.matchday)).size} Spieltage`);
  console.log(`   erster Anpfiff: ${plan[0]?.kickoff}`);
  for (const w of warnungen) console.log(`   ⚠️  ${w}`);
  for (const f of fehler) console.log(`   ❌ ${f}`);

  if (!ok) {
    console.log(`   → NICHT geschrieben. Erst die Fehler beheben (meist ein Klubname in ALIASE).`);
    return { key, ok: false };
  }
  if (nurPruefen) {
    console.log(`   → nur geprüft, nichts geschrieben.`);
    return { key, ok: true };
  }

  mkdirSync(ZIEL, { recursive: true });
  // Als JS-Modul und nicht als JSON: so trägt die Datei ihre eigene Herkunft im
  // Kopf. Bei einem Spielplan ist das keine Kosmetik — wer in einem halben Jahr
  // hineinsieht, muss ohne Umweg wissen, woher die Termine stammen und wann
  // sie geholt wurden, sonst weiß niemand, ob sie noch aktuell sind.
  const pfad = resolve(ZIEL, `${key}-${SAISON}.js`);
  const kopf = [
    `// ============================================================`,
    `//  ${liga.label.toUpperCase()} — ECHTER SPIELPLAN ${SAISON}/${String(SAISON + 1).slice(2)}`,
    `//`,
    `//  ERZEUGTE DATEI — nicht von Hand bearbeiten.`,
    `//  Neu holen:  npm run import:spielplan -- ${key}`,
    `//`,
    `//  Quelle:     ${datei ? `Datei ${datei}` : `OpenLigaDB (${liga.openliga}/${SAISON})`}`,
    `//  Geholt:     ${new Date().toISOString().slice(0, 10)}`,
    `//  Umfang:     ${plan.length} Spiele, ${new Set(plan.map((s) => s.matchday)).size} Spieltage`,
    `//  Erster Anpfiff: ${plan[0]?.kickoff}`,
    `//`,
    `//  Echt sind Paarungen, Spieltage und Anstoßzeiten. Quoten, Ergebnisse und`,
    `//  Torschützen bleiben erzeugt — siehe ligaGenerator.js.`,
    `// ============================================================`,
    ``,
    `export default `,
  ].join("\n");
  writeFileSync(pfad, kopf + JSON.stringify(plan, null, 1) + ";\n", "utf8");
  console.log(`   → geschrieben: ${pfad}`);
  return { key, ok: true, pfad };
}

const args = process.argv.slice(2);
const nurPruefen = args.includes("--pruefen");
const dateiIdx = args.indexOf("--datei");
const datei = dateiIdx >= 0 ? args[dateiIdx + 1] : null;
const keys = args.filter((a) => !a.startsWith("--") && a !== datei);
const zuTun = keys.length ? keys : Object.keys(LIGEN);

const ergebnisse = [];
for (const key of zuTun) {
  try {
    ergebnisse.push(await importiere(key, { datei: keys.length === 1 ? datei : null, nurPruefen }));
  } catch (e) {
    console.log(`\n── ${key} ──\n   ❌ ${e.message}`);
    ergebnisse.push({ key, ok: false });
  }
}

// Der Index wird aus dem NACHGESEHEN, was wirklich im Ordner liegt — nicht aus
// dem, was dieser Lauf geschrieben hat. Sonst verlöre ein Lauf über eine
// einzelne Liga die Einträge der anderen.
function schreibeIndex() {
  const vorhanden = Object.keys(LIGEN).filter((k) => existsSync(resolve(ZIEL, `${k}-${SAISON}.js`)));
  const zeilen = [
    `// ============================================================`,
    `//  SPIELPLÄNE — die eine Einstiegsstelle für echte Kalender`,
    `//`,
    `//  ERZEUGTE DATEI — wird von \`npm run import:spielplan\` neu geschrieben.`,
    `//`,
    `//  Warum dieses Zwischenmodul überhaupt existiert: die Ligadateien dürfen die`,
    `//  Plan-Dateien nicht direkt importieren. Der Importer braucht die Klublisten`,
    `//  AUS den Ligadateien, um den geholten Plan zu prüfen — importierte die`,
    `//  Ligadatei ihrerseits eine Plan-Datei, die es beim ersten Lauf noch gar nicht`,
    `//  gibt, ließe sich der Import nie starten. Über diesen Index ist die Kette`,
    `//  aufgelöst: hier steht nur, was WIRKLICH schon da ist.`,
    `//`,
    `//  Fehlt ein Wettbewerb hier, fällt seine Liga auf die Circle-Methode zurück`,
    `//  (\`ligaGenerator.js\`) — lieber eine erzeugte Saison als gar keine.`,
    `// ============================================================`,
    ``,
    ...vorhanden.map((k) => `import ${k} from "./${k}-${SAISON}";`),
    ``,
    `export const SPIELPLAENE = { ${vorhanden.join(", ")} };`,
    ``,
  ];
  writeFileSync(resolve(ZIEL, "index.js"), zeilen.join("\n"), "utf8");
  console.log(`   Index: ${vorhanden.length ? vorhanden.join(", ") : "leer"}`);
}

if (!nurPruefen && ergebnisse.some((r) => r.ok)) schreibeIndex();

const gescheitert = ergebnisse.filter((r) => r.ok === false);
console.log(`\n${gescheitert.length ? "❌" : "✅"} ${ergebnisse.filter((r) => r.ok).length} von ${zuTun.length} Ligen bereit.`);
if (existsSync(ZIEL)) console.log(`   Ablage: ${ZIEL}`);
// `process.exitCode` statt `process.exit()`: unter vite-node reißt der harte
// Abbruch offene Handles mit und quittiert das mit einer libuv-Assertion.
process.exitCode = gescheitert.length ? 1 : 0;
