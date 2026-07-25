// ============================================================
//  CHAMPIONS-LEAGUE-DEMODATEN — zweiter Wettbewerb (Etappe a)
//
//  Gleiche Bauweise wie bundesligaData.js: echte Klubs, aber SIMULIERT —
//  generierter Spielplan, fiktive Quoten aus dem Poisson-Modell
//  (oddsGenerator.js) und simulierte Ergebnisse/Torschützen. Kein echter
//  Spielausgang.
//
//  Warum überhaupt ein zweiter Wettbewerb: erst dadurch bekommen die neuen
//  Felder `wettbewerb`/`phase` echten Inhalt — mit nur einer Liga wäre das
//  Datenmodell nicht überprüfbar.
//
//  Format wie die heutige CL: 36 Teams, Ligaphase mit 8 Spielen je Team
//  (kein Hin-/Rückspiel), danach K.-o.-Runden. Die K.-o.-Paarungen entstehen
//  AUS den simulierten Ligaphase-Ergebnissen (Tabelle → Top 16 → Baum), damit
//  die Daten in sich stimmig sind statt geraten.
//  K.-o.-Regel: Unentschieden → der in der Ligaphase besser Platzierte kommt
//  weiter. Bewusst simpel und nachvollziehbar statt Verlängerung/Elfmeter zu
//  simulieren, die es in den Ergebnisdaten ohnehin nicht gibt.
// ============================================================

import { generateMatchOdds, simulateResult } from "./oddsGenerator";
import { TEAM_RATINGS as BL_RATINGS } from "./bundesligaData";
import { tabelle } from "./saisonwetten";

// Europäische Klubs (fiktive Stärken, kein echtes Rating). Die deutschen
// Teilnehmer übernehmen ihre Werte aus der Bundesliga-Datei, damit ein Klub
// nicht in zwei Wettbewerben unterschiedlich stark ist.
const EUROPA = {
  "Real Madrid":         { code: "RMA", attack: 1.90, defense: 0.62 },
  "Manchester City":     { code: "MCI", attack: 1.88, defense: 0.60 },
  "FC Barcelona":        { code: "BAR", attack: 1.80, defense: 0.72 },
  "Paris Saint-Germain": { code: "PSG", attack: 1.75, defense: 0.70 },
  "FC Liverpool":        { code: "LIV", attack: 1.72, defense: 0.68 },
  "Inter Mailand":       { code: "INT", attack: 1.55, defense: 0.62 },
  "FC Arsenal":          { code: "ARS", attack: 1.62, defense: 0.65 },
  "Atlético Madrid":     { code: "ATM", attack: 1.40, defense: 0.62 },
  "AC Mailand":          { code: "MIL", attack: 1.45, defense: 0.80 },
  "Juventus Turin":      { code: "JUV", attack: 1.38, defense: 0.72 },
  "FC Chelsea":          { code: "CHE", attack: 1.50, defense: 0.82 },
  "SSC Neapel":          { code: "NAP", attack: 1.48, defense: 0.78 },
  "FC Porto":            { code: "POR", attack: 1.30, defense: 0.85 },
  "Benfica Lissabon":    { code: "BEN", attack: 1.35, defense: 0.85 },
  "Sporting Lissabon":   { code: "SPO", attack: 1.32, defense: 0.88 },
  "Ajax Amsterdam":      { code: "AJA", attack: 1.25, defense: 0.95 },
  "PSV Eindhoven":       { code: "PSV", attack: 1.30, defense: 0.98 },
  "Feyenoord Rotterdam": { code: "FEY", attack: 1.18, defense: 1.02 },
  "Atalanta Bergamo":    { code: "ATA", attack: 1.42, defense: 0.90 },
  "AS Monaco":           { code: "MON", attack: 1.28, defense: 0.95 },
  "Olympique Marseille": { code: "OM",  attack: 1.22, defense: 1.00 },
  "Celtic Glasgow":      { code: "CEL", attack: 1.10, defense: 1.10 },
  "Galatasaray":         { code: "GAL", attack: 1.15, defense: 1.05 },
  "Roter Stern Belgrad": { code: "RSB", attack: 0.95, defense: 1.20 },
  "Schachtar Donezk":    { code: "SHA", attack: 1.00, defense: 1.15 },
  "FC Brügge":           { code: "BRU", attack: 1.05, defense: 1.10 },
  "Sparta Prag":         { code: "SPA", attack: 0.92, defense: 1.22 },
  "Young Boys Bern":     { code: "YB",  attack: 0.88, defense: 1.28 },
  "Slovan Bratislava":   { code: "SLO", attack: 0.75, defense: 1.38 },
  "Girona FC":           { code: "GIR", attack: 1.08, defense: 1.05 },
  "Aston Villa":         { code: "AVL", attack: 1.30, defense: 0.92 },
  "Bologna FC":          { code: "BOL", attack: 1.05, defense: 1.00 },
};

// Deutsche Teilnehmer: Werte aus der Bundesliga übernehmen (4 Startplätze).
const DEUTSCHE_TEILNEHMER = [
  "FC Bayern München", "Bayer 04 Leverkusen", "Borussia Dortmund", "RB Leipzig",
];

export const CL_TEAM_RATINGS = {
  ...EUROPA,
  ...Object.fromEntries(DEUTSCHE_TEILNEHMER.map((t) => [t, BL_RATINGS[t]])),
};

const TEAMS = Object.keys(CL_TEAM_RATINGS);   // 36
const LIGAPHASE_SPIELTAGE = 8;

const staerkenVon = (home, away) => ({
  homeAttack: CL_TEAM_RATINGS[home].attack, homeDefense: CL_TEAM_RATINGS[home].defense,
  awayAttack: CL_TEAM_RATINGS[away].attack, awayDefense: CL_TEAM_RATINGS[away].defense,
});

// Ligaphase: Circle-Methode über 36 Teams, aber nur die ersten 8 Runden —
// dadurch spielt jeder 8-mal gegen 8 VERSCHIEDENE Gegner, ohne Rückspiel.
function ligaphasenPlan() {
  const n = TEAMS.length;
  let arr = TEAMS.slice();
  const runden = [];
  for (let r = 0; r < LIGAPHASE_SPIELTAGE; r++) {
    const runde = [];
    for (let i = 0; i < n / 2; i++) {
      let home = arr[i], away = arr[n - 1 - i];
      if ((r + i) % 2 === 1) [home, away] = [away, home];   // Heimrecht ausbalancieren
      runde.push([home, away]);
    }
    runden.push(runde);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return runden;
}

// Anstöße: Ligaphase dienstags/mittwochs 21:00 (MESZ = UTC+2), alle zwei Wochen
// ab Mitte September 2026 — also nach dem Bundesliga-Start und in der Zukunft.
const CL_START = Date.UTC(2026, 8, 15);            // 15.09.2026 (Dienstag)
const ZWEI_WOCHEN = 14 * 24 * 3600 * 1000;
function ligaKickoff(spieltag, i) {
  const tagVersatz = i % 2;                        // Di / Mi
  const ms = CL_START + (spieltag - 1) * ZWEI_WOCHEN + tagVersatz * 24 * 3600 * 1000
           + (21 - 2) * 3600 * 1000;
  return new Date(ms).toISOString();
}
// K.-o.-Runden im Frühjahr, je Phase ein fester Termin.
const KO_START = Date.UTC(2027, 1, 16);            // 16.02.2027
function koKickoff(phasenIndex, i) {
  const ms = KO_START + phasenIndex * 28 * 24 * 3600 * 1000
           + (i % 2) * 24 * 3600 * 1000 + (21 - 2) * 3600 * 1000;
  return new Date(ms).toISOString();
}

// Ein einzelnes Match erzeugen (Quoten + simuliertes Ergebnis).
function baueMatch({ matchId, home, away, kickoff, matchday, phase }) {
  const strengths = staerkenVon(home, away);
  const snapshot = generateMatchOdds({ matchId, home, away, kickoff, seed: matchId, ...strengths });
  const result = simulateResult(snapshot, strengths, `${matchId}-result`);
  return { matchId, matchday, home, away, kickoff, snapshot, result, wettbewerb: "cl", phase };
}

// Sieger einer K.-o.-Begegnung. Unentschieden → besser platziertes Team der
// Ligaphase (deterministisch, ohne Verlängerung zu erfinden).
function koSieger(match, platzVon) {
  const { home, away } = match;
  if (match.result.home > match.result.away) return home;
  if (match.result.home < match.result.away) return away;
  return platzVon.get(home) <= platzVon.get(away) ? home : away;
}

function buildMatches() {
  const matches = [];

  // 1) Ligaphase
  ligaphasenPlan().forEach((runde, ri) => {
    const matchday = ri + 1;
    runde.forEach(([home, away], i) => {
      matches.push(baueMatch({
        matchId: `cl26-md${matchday}-${CL_TEAM_RATINGS[home].code}-${CL_TEAM_RATINGS[away].code}`.toLowerCase(),
        home, away, kickoff: ligaKickoff(matchday, i), matchday, phase: "liga",
      }));
    });
  });

  // 2) Tabelle der Ligaphase → Top 16 (Punkte, dann Tordifferenz, dann Tore)
  const tab = tabelle(matches)
    .sort((a, b) => b.punkte - a.punkte
      || (b.tore - b.gegentore) - (a.tore - a.gegentore)
      || b.tore - a.tore
      || a.team.localeCompare(b.team));
  const platzVon = new Map(tab.map((t, i) => [t.team, i + 1]));
  let runde = tab.slice(0, 16).map((t) => t.team);

  // 3) K.-o.-Baum: 1 gegen 16, 2 gegen 15 … Sieger steigen auf.
  const phasen = ["achtelfinale", "viertelfinale", "halbfinale", "finale"];
  phasen.forEach((phase, pi) => {
    const paarungen = [];
    for (let i = 0; i < runde.length / 2; i++) {
      paarungen.push([runde[i], runde[runde.length - 1 - i]]);   // besser Platzierter hat Heimrecht
    }
    const sieger = [];
    paarungen.forEach(([home, away], i) => {
      const m = baueMatch({
        matchId: `cl26-${phase}-${CL_TEAM_RATINGS[home].code}-${CL_TEAM_RATINGS[away].code}`.toLowerCase(),
        home, away, kickoff: koKickoff(pi, i),
        matchday: LIGAPHASE_SPIELTAGE + pi + 1,   // fortlaufend, damit Spieltags-Logik greift
        phase,
      });
      matches.push(m);
      sieger.push(koSieger(m, platzVon));
    });
    // Sieger nach Ligaphase-Platz sortiert in die nächste Runde
    runde = sieger.sort((a, b) => platzVon.get(a) - platzVon.get(b));
  });

  return matches;
}

let _cache = null;
export function getChampionsLeagueMatches() {
  if (!_cache) _cache = buildMatches();
  return _cache;
}

// Gleiche Schnittstelle wie die übrigen Quoten-Quellen.
export function createChampionsLeagueOddsSource() {
  const byId = new Map(getChampionsLeagueMatches().map((m) => [m.matchId, m]));
  return {
    getSnapshot: (id) => byId.get(id)?.snapshot ?? null,
    getResult: (id) => byId.get(id)?.result ?? null,
  };
}
