// ============================================================
//  BUNDESLIGA — Saison 2026/27, ECHTER Spielplan, simulierte Ergebnisse.
//
//  Echt sind: die 18 Klubs, alle 306 Begegnungen und ihre Anstoßzeiten
//  (`spielplaene/bl-2026.json`, importiert von OpenLigaDB — neu holen mit
//  `npm run import:spielplan -- bl`).
//
//  Weiterhin SIMULIERT sind: Quoten, Ergebnisse und Torschützen (Poisson-Modell
//  in `oddsGenerator.js`), dazu die Team-Stärken — grobe, plausible
//  Einschätzungen, kein echtes Rating. Auch die SPIELERNAMEN sind erfunden:
//  Kader ändern sich mit jedem Transferfenster, und erfundene Daten dürfen nicht
//  wie echte aussehen. Genau diese Trennung hält `echterSpielplan` am Match
//  fest, damit die Oberfläche nicht mehr behauptet, als stimmt.
//
//  Fehlt die Spielplan-Datei, fällt die Liga auf die Circle-Methode zurück
//  (`saisonStart`/`slotFuer` weiter unten) — lieber eine erzeugte Saison als
//  gar keine.
// ============================================================

import { baueLiga, findeDerby, alsQuotenQuelle } from "./ligaGenerator";
import { SPIELPLAENE } from "./spielplaene";

// attack/defense: 1.0 = Liga-Durchschnitt. attack hoch = torgefährlich,
// defense hoch = anfällig (wirkt als Faktor auf die gegnerische Tor-Erwartung).
export const TEAM_RATINGS = {
  "FC Bayern München":        { code: "FCB", attack: 1.85, defense: 0.60 },
  "Bayer 04 Leverkusen":      { code: "B04", attack: 1.55, defense: 0.70 },
  "RB Leipzig":               { code: "RBL", attack: 1.45, defense: 0.75 },
  "Borussia Dortmund":        { code: "BVB", attack: 1.50, defense: 0.80 },
  "Eintracht Frankfurt":      { code: "SGE", attack: 1.25, defense: 0.90 },
  "VfB Stuttgart":            { code: "VFB", attack: 1.30, defense: 0.85 },
  "SC Freiburg":              { code: "SCF", attack: 1.05, defense: 0.95 },
  "TSG Hoffenheim":           { code: "TSG", attack: 1.10, defense: 1.05 },
  "SV Werder Bremen":         { code: "SVW", attack: 1.05, defense: 1.05 },
  "Borussia Mönchengladbach": { code: "BMG", attack: 1.05, defense: 1.10 },
  "FC Augsburg":              { code: "FCA", attack: 0.90, defense: 1.00 },
  "1. FSV Mainz 05":          { code: "M05", attack: 0.95, defense: 0.95 },
  "1. FC Union Berlin":       { code: "FCU", attack: 0.90, defense: 0.95 },
  "Hamburger SV":             { code: "HSV", attack: 0.80, defense: 1.20 },
  "1. FC Köln":               { code: "KOE", attack: 0.85, defense: 1.25 },
  "FC Schalke 04":            { code: "S04", attack: 0.75, defense: 1.30 },
  "SV Elversberg":            { code: "SVE", attack: 0.70, defense: 1.35 },
  "SC Paderborn 07":          { code: "SCP", attack: 0.72, defense: 1.30 },
};

// ── Derbys ──────────────────────────────────────────────────
// Traditionsduelle unter den Vereinen oben. Reine Daten (kein Scoring) — das
// Regelwerk kann daraus einen eigenen Faktor machen („Derby zählt mehr").
// Reihenfolge der Teams egal, die Prüfung ist richtungsunabhängig.
export const DERBYS = [
  { a: "Borussia Dortmund",        b: "FC Schalke 04",            label: "Revierderby" },
  { a: "FC Bayern München",        b: "Borussia Dortmund",        label: "Der Klassiker" },
  { a: "1. FC Köln",               b: "Borussia Mönchengladbach", label: "Rheinisches Derby" },
  { a: "1. FC Köln",               b: "Bayer 04 Leverkusen",      label: "Rheinisches Derby" },
  { a: "Bayer 04 Leverkusen",      b: "Borussia Mönchengladbach", label: "Rheinisches Derby" },
  { a: "Hamburger SV",             b: "SV Werder Bremen",         label: "Nordderby" },
  { a: "1. FSV Mainz 05",          b: "Eintracht Frankfurt",      label: "Rhein-Main-Derby" },
  { a: "VfB Stuttgart",            b: "TSG Hoffenheim",           label: "Baden-Württemberg-Derby" },
  { a: "VfB Stuttgart",            b: "SC Freiburg",              label: "Baden-Württemberg-Derby" },
  { a: "SC Freiburg",              b: "TSG Hoffenheim",           label: "Baden-Württemberg-Derby" },
  { a: "FC Bayern München",        b: "FC Augsburg",              label: "Bayerisches Derby" },
];

// Ist diese Begegnung ein Derby? Richtungsunabhängig. Gibt den Eintrag zurück
// (mit Label, für die Anzeige) oder null.
export function findDerby(home, away) {
  return findeDerby(DERBYS, home, away);
}

// Anstöße: Spieltag 1 am 28.08.2026, danach im Wochentakt; innerhalb eines
// Spieltags Fr/Sa/So gestaffelt (Ortszeit, MESZ = UTC+2). Alles in der Zukunft
// → die ganze Saison ist ab jetzt betippbar.
const SEASON_START = Date.UTC(2026, 7, 28);

function slotFuer(i) {
  if (i === 0)     return { tag: 0, hh: 20, mm: 30 };   // Fr 20:30
  if (i <= 6)      return { tag: 1, hh: 15, mm: 30 };   // Sa 15:30
  if (i === 7)     return { tag: 1, hh: 18, mm: 30 };   // Sa 18:30
  return { tag: 2, hh: 17, mm: 30 };                    // So 17:30
}

let _cache = null;
// Einmalig aufgebaut (Poisson-Berechnung ist reine Funktion, kein I/O) und
// für die Dauer des Prozesses gecacht.
//
// Der SPIELPLAN ist echt (`spielplaene/bl-2026.json`, importiert von OpenLigaDB
// über `npm run import:spielplan`). `saisonStart`/`slotFuer` stehen weiter da,
// greifen aber nur, wenn die Datei fehlt — dann fällt die Liga auf die
// Circle-Methode zurück, statt ohne Spiele dazustehen. Quoten, Ergebnisse und
// Torschützen bleiben erzeugt; `echterSpielplan` am Match hält die Trennung
// fest, damit die Oberfläche nichts Falsches behauptet.
export function getBundesligaMatches() {
  if (!_cache) {
    _cache = baueLiga({
      wettbewerb: "bl", idPrefix: "bl26", ratings: TEAM_RATINGS, derbys: DERBYS,
      saisonStart: SEASON_START, utcOffset: 2, slotFuer,
      spielplan: SPIELPLAENE.bl ?? null,
    });
  }
  return _cache;
}

// Gleiche Schnittstelle wie createMockOddsSource() (engine.js) — austauschbare
// Quoten-Quelle, nur mit der ganzen simulierten Saison statt einem Match.
export function createBundesligaOddsSource() {
  return alsQuotenQuelle(getBundesligaMatches());
}
