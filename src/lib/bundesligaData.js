// ============================================================
//  BUNDESLIGA-DEMODATEN — Spieltage 1–3, Saison 2026/27.
//  Echte Klubs, fiktive Quoten (siehe CLAUDE.md-Roadmap: "glaubwürdige
//  Bundesliga-Quoten für 3 Spieltage"). Die Quoten selbst entstehen aus
//  oddsGenerator.js (Poisson-Modell), nicht aus Handeingaben — Team-
//  Stärken hier sind grobe, plausible Einschätzungen, kein echtes Rating.
//
//  Paarungen Spieltag 1 (komplett) sowie die zwei mit * markierten
//  Spiele in Spieltag 2 stammen aus dem echten DFL-Rahmenterminkalender
//  (Stand Juli 2026). Alle übrigen Paarungen sind ein plausibler
//  Round-Robin-Füller — kein Anspruch auf exakte Übereinstimmung mit dem
//  echten Spielplan, aber jedes Team tritt pro Spieltag genau einmal an
//  und trifft über die drei Spieltage hinweg nie zweimal auf denselben Gegner.
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

// [heim, gast, datum, anstoß (MESZ, UTC+2)]
const FIXTURES = {
  1: [
    ["FC Bayern München", "VfB Stuttgart", "2026-08-28", "20:30"],
    ["SV Elversberg", "Bayer 04 Leverkusen", "2026-08-29", "15:30"],
    ["RB Leipzig", "Borussia Mönchengladbach", "2026-08-29", "15:30"],
    ["1. FSV Mainz 05", "SC Paderborn 07", "2026-08-29", "15:30"],
    ["1. FC Union Berlin", "Eintracht Frankfurt", "2026-08-29", "15:30"],
    ["1. FC Köln", "TSG Hoffenheim", "2026-08-29", "15:30"],
    ["Borussia Dortmund", "Hamburger SV", "2026-08-29", "18:30"],
    ["SC Freiburg", "SV Werder Bremen", "2026-08-30", "15:30"],
    ["FC Augsburg", "FC Schalke 04", "2026-08-30", "17:30"],
  ],
  2: [
    ["VfB Stuttgart", "1. FC Köln", "2026-09-04", "20:30"],           // *
    ["Borussia Dortmund", "1. FC Union Berlin", "2026-09-05", "15:30"],
    ["RB Leipzig", "SV Elversberg", "2026-09-05", "15:30"],
    ["Bayer 04 Leverkusen", "SC Paderborn 07", "2026-09-05", "15:30"],
    ["Eintracht Frankfurt", "FC Augsburg", "2026-09-05", "15:30"],
    ["TSG Hoffenheim", "Borussia Mönchengladbach", "2026-09-05", "15:30"],
    ["FC Schalke 04", "FC Bayern München", "2026-09-05", "18:30"],    // *
    ["SC Freiburg", "1. FSV Mainz 05", "2026-09-06", "15:30"],
    ["SV Werder Bremen", "Hamburger SV", "2026-09-06", "17:30"],
  ],
  3: [
    ["FC Bayern München", "Borussia Mönchengladbach", "2026-09-11", "20:30"],
    ["VfB Stuttgart", "SV Elversberg", "2026-09-12", "15:30"],
    ["Borussia Dortmund", "SC Paderborn 07", "2026-09-12", "15:30"],
    ["RB Leipzig", "1. FC Köln", "2026-09-12", "15:30"],
    ["Bayer 04 Leverkusen", "1. FSV Mainz 05", "2026-09-12", "15:30"],
    ["TSG Hoffenheim", "FC Schalke 04", "2026-09-12", "15:30"],
    ["Eintracht Frankfurt", "Hamburger SV", "2026-09-12", "18:30"],
    ["SC Freiburg", "1. FC Union Berlin", "2026-09-13", "15:30"],
    ["SV Werder Bremen", "FC Augsburg", "2026-09-13", "17:30"],
  ],
};

function kickoffIso(date, hhmmCEST) {
  const [hh, mm] = hhmmCEST.split(":").map(Number);
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCHours(hh - 2, mm); // Aug/Sep: MESZ = UTC+2, fest gerechnet reicht für Testdaten
  return d.toISOString();
}

function buildMatches() {
  const matches = [];
  for (const [matchday, list] of Object.entries(FIXTURES)) {
    for (const [home, away, date, time] of list) {
      const kickoff = kickoffIso(date, time);
      const matchId = `bl26-md${matchday}-${TEAM_RATINGS[home].code}-${TEAM_RATINGS[away].code}`.toLowerCase();
      const hr = TEAM_RATINGS[home]; const ar = TEAM_RATINGS[away];
      const strengths = { homeAttack: hr.attack, homeDefense: hr.defense, awayAttack: ar.attack, awayDefense: ar.defense };
      const snapshot = generateMatchOdds({ matchId, home, away, kickoff, seed: matchId, ...strengths });
      // Derby-Label auf den Snapshot: die Engine kennt keine Vereins-Paarungen
      // und bleibt so sportart-neutral — sie liest nur `snap.derby`.
      const derby = findDerby(home, away);
      if (derby) snapshot.derby = derby.label;
      const result = simulateResult(snapshot, strengths, `${matchId}-result`);
      matches.push({ matchId, matchday: Number(matchday), home, away, kickoff, snapshot, result });
    }
  }
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
// Quoten-Quelle, nur mit 27 statt einem Match.
export function createBundesligaOddsSource() {
  const byId = new Map(getBundesligaMatches().map((m) => [m.matchId, m]));
  return {
    getSnapshot: (id) => byId.get(id)?.snapshot ?? null,
    getResult: (id) => byId.get(id)?.result ?? null,
  };
}
