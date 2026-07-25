// ============================================================
//  BUNDESLIGA-DEMODATEN — komplette SIMULIERTE Saison 2026/27.
//  Echte Klubs (18), aber generierter Spielplan (volle Hin-/Rückrunde,
//  34 Spieltage) und FIKTIVE, aus einem Poisson-Modell (oddsGenerator.js)
//  erzeugte Quoten, Ergebnisse und Torschützen. KEINE echten Resultate —
//  bewusst simuliert, damit man sofort eine ganze Saison durchspielen kann.
//  Team-Stärken sind grobe, plausible Einschätzungen, kein echtes Rating.
//
//  Spielplan per Circle-Methode: jeder Klub spielt gegen jeden zweimal
//  (Heim + Auswärts), pro Spieltag genau einmal, keine Paarung doppelt
//  innerhalb einer Halbserie. Anstöße im Wochentakt ab dem echten
//  Saisonstart (28.08.2026), Fr/Sa/So gestaffelt — alle in der Zukunft,
//  also die ganze Saison ab jetzt betippbar.
// ============================================================

import { generateMatchOdds, simulateResult } from "./oddsGenerator";

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
  return DERBYS.find((d) => (d.a === home && d.b === away) || (d.a === away && d.b === home)) ?? null;
}

const TEAMS = Object.keys(TEAM_RATINGS); // 18 Klubs, feste Reihenfolge → deterministisch

// Vollständiger Spielplan (34 Spieltage) per Circle-Methode: ein Team bleibt
// fest, die übrigen rotieren im Kreis. Ergibt eine gültige Hinrunde (17
// Spieltage), die Rückrunde ist dieselbe mit getauschtem Heimrecht.
function buildSchedule() {
  const n = TEAMS.length;                    // 18
  let arr = TEAMS.slice();
  const hinrunde = [];
  for (let r = 0; r < n - 1; r++) {          // 17 Spieltage
    const round = [];
    for (let i = 0; i < n / 2; i++) {        // 9 Paarungen
      let home = arr[i], away = arr[n - 1 - i];
      if ((r + i) % 2 === 1) [home, away] = [away, home]; // Heim/Auswärts ausbalancieren
      round.push([home, away]);
    }
    hinrunde.push(round);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];   // Circle-Rotation
  }
  const rueckrunde = hinrunde.map((round) => round.map(([h, a]) => [a, h])); // Heimrecht getauscht
  return [...hinrunde, ...rueckrunde];       // 34 Spieltage × 9 Spiele = 306
}

// Anstoß: Spieltag 1 am 28.08.2026, danach im Wochentakt; innerhalb eines
// Spieltags Fr/Sa/So gestaffelt. Alles in der Zukunft → ganze Saison betippbar.
const SEASON_START = Date.UTC(2026, 7, 28); // 28.08.2026 (MESZ = UTC+2)
const WEEK = 7 * 24 * 3600 * 1000;
function kickoffFor(matchday, i) {
  let dayOffset, hh, mm;
  if (i === 0)      { dayOffset = 0; hh = 20; mm = 30; }  // Fr 20:30
  else if (i <= 6)  { dayOffset = 1; hh = 15; mm = 30; }  // Sa 15:30
  else if (i === 7) { dayOffset = 1; hh = 18; mm = 30; }  // Sa 18:30
  else              { dayOffset = 2; hh = 17; mm = 30; }  // So 17:30
  const ms = SEASON_START + (matchday - 1) * WEEK + dayOffset * 24 * 3600 * 1000
           + (hh - 2) * 3600 * 1000 + mm * 60 * 1000;
  return new Date(ms).toISOString();
}

function buildMatches() {
  const matches = [];
  buildSchedule().forEach((round, ri) => {
    const matchday = ri + 1;
    round.forEach(([home, away], i) => {
      const kickoff = kickoffFor(matchday, i);
      const matchId = `bl26-md${matchday}-${TEAM_RATINGS[home].code}-${TEAM_RATINGS[away].code}`.toLowerCase();
      const hr = TEAM_RATINGS[home]; const ar = TEAM_RATINGS[away];
      const strengths = { homeAttack: hr.attack, homeDefense: hr.defense, awayAttack: ar.attack, awayDefense: ar.defense };
      const snapshot = generateMatchOdds({ matchId, home, away, kickoff, seed: matchId, ...strengths });
      // Derby-Label auf den Snapshot: die Engine kennt keine Vereins-Paarungen
      // und bleibt so sportart-neutral — sie liest nur `snap.derby`.
      const derby = findDerby(home, away);
      if (derby) snapshot.derby = derby.label;
      const result = simulateResult(snapshot, strengths, `${matchId}-result`);
      // wettbewerb/phase: Datenmodell für mehrere Wettbewerbe (wettbewerbe.js).
      // Die Engine kennt keine Ligennamen — sie liest nur diese Felder.
      matches.push({ matchId, matchday, home, away, kickoff, snapshot, result, wettbewerb: "bl", phase: "liga" });
    });
  });
  return matches;
}

let _cache = null;
// Einmalig aufgebaut (Poisson-Berechnung ist reine Funktion, kein I/O) und
// für die Dauer des Prozesses gecacht.
export function getBundesligaMatches() {
  if (!_cache) _cache = buildMatches();
  return _cache;
}

// Gleiche Schnittstelle wie createMockOddsSource() (engine.js) — austauschbare
// Quoten-Quelle, nur mit der ganzen simulierten Saison statt einem Match.
export function createBundesligaOddsSource() {
  const byId = new Map(getBundesligaMatches().map((m) => [m.matchId, m]));
  return {
    getSnapshot: (id) => byId.get(id)?.snapshot ?? null,
    getResult: (id) => byId.get(id)?.result ?? null,
  };
}
