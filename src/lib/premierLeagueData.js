// ============================================================
//  PREMIER LEAGUE — simulierte Saison 2026/27 (20 Klubs, 38 Spieltage)
//
//  Gebaut mit `ligaGenerator.js` — dieselbe Mechanik wie Bundesliga, La Liga
//  und Serie A. Echt sind die Klubs und die üblichen Anstoßzeiten; Spielplan,
//  Quoten, Ergebnisse und Torschützen sind SIMULIERT (siehe Kopf des
//  Generators). Kein offizieller Kalender.
//
//  Stärken der Klubs, die auch in der Champions League antreten, sind mit
//  `championsLeagueData.js` abgestimmt — ein Klub darf nicht in zwei
//  Wettbewerben unterschiedlich stark sein.
//
//  ⚠️ Anstoßzeiten in ENGLISCHER Ortszeit (Sommer = UTC+1). Genau daran hängt,
//  dass sich die Ligen zeitlich ineinanderschieben statt übereinanderzuliegen:
//  samstags 13:30 deutscher Zeit spielt nur England.
// ============================================================

import { baueLiga, findeDerby, alsQuotenQuelle, NAMENSPOOLS } from "./ligaGenerator";

export const PL_TEAM_RATINGS = {
  "Manchester City":          { code: "MCI", attack: 1.88, defense: 0.60 },
  "FC Liverpool":             { code: "LIV", attack: 1.72, defense: 0.68 },
  "FC Arsenal":               { code: "ARS", attack: 1.62, defense: 0.65 },
  "FC Chelsea":               { code: "CHE", attack: 1.50, defense: 0.82 },
  "Tottenham Hotspur":        { code: "TOT", attack: 1.35, defense: 1.00 },
  "Newcastle United":         { code: "NEW", attack: 1.32, defense: 0.90 },
  "Aston Villa":              { code: "AVL", attack: 1.30, defense: 0.92 },
  "Manchester United":        { code: "MUN", attack: 1.30, defense: 1.02 },
  "Brighton & Hove Albion":   { code: "BHA", attack: 1.20, defense: 1.00 },
  "Nottingham Forest":        { code: "NFO", attack: 1.10, defense: 0.95 },
  "FC Brentford":             { code: "BRE", attack: 1.10, defense: 1.05 },
  "AFC Bournemouth":          { code: "BOU", attack: 1.08, defense: 1.05 },
  "Crystal Palace":           { code: "CRY", attack: 1.05, defense: 0.95 },
  "FC Fulham":                { code: "FUL", attack: 1.05, defense: 1.00 },
  "FC Everton":               { code: "EVE", attack: 0.90, defense: 1.05 },
  "Leeds United":             { code: "LEE", attack: 0.85, defense: 1.18 },
  // ── Aufsteiger 2026/27 ────────────────────────────────────
  // Ersetzen Burnley, West Ham und Wolverhampton. Die drei bekommen bewusst
  // DIESELBEN Rating-Plätze wie die Abgestiegenen (0,80–0,85 Angriff,
  // 1,18–1,25 Abwehr): die Spreizung der Liga bleibt damit unverändert, und
  // die Balance ist gegen genau diese Spreizung vermessen.
  "Ipswich Town":             { code: "IPS", attack: 0.85, defense: 1.15 },
  "AFC Sunderland":           { code: "SUN", attack: 0.82, defense: 1.22 },
  "Hull City":                { code: "HUL", attack: 0.82, defense: 1.20 },
  "Coventry City":            { code: "COV", attack: 0.80, defense: 1.25 },
};

export const PL_DERBYS = [
  { a: "Manchester City",   b: "Manchester United", label: "Manchester-Derby" },
  { a: "FC Arsenal",        b: "Tottenham Hotspur", label: "Nord-London-Derby" },
  { a: "FC Liverpool",      b: "FC Everton",        label: "Merseyside-Derby" },
  { a: "Newcastle United",  b: "AFC Sunderland",    label: "Tyne-Wear-Derby" },
  { a: "FC Chelsea",        b: "FC Fulham",         label: "West-London-Derby" },
  { a: "Leeds United",      b: "Manchester United", label: "Rosenkrieg" },
  { a: "FC Liverpool",      b: "Manchester United", label: "Nordwest-Duell" },
];

export function findPlDerby(home, away) {
  return findeDerby(PL_DERBYS, home, away);
}

// Saisonstart Sa. 15.08.2026 — zwei Wochen vor der Bundesliga, wie üblich.
const SEASON_START = Date.UTC(2026, 7, 15);

// 10 Partien je Spieltag, über Sa/So/Mo verteilt (englische Ortszeit).
function slotFuer(i) {
  if (i === 0) return { tag: 0, hh: 12, mm: 30 };   // Sa 12:30
  if (i <= 5)  return { tag: 0, hh: 15, mm: 0 };    // Sa 15:00
  if (i === 6) return { tag: 0, hh: 17, mm: 30 };   // Sa 17:30
  if (i === 7) return { tag: 1, hh: 14, mm: 0 };    // So 14:00
  if (i === 8) return { tag: 1, hh: 16, mm: 30 };   // So 16:30
  return { tag: 2, hh: 20, mm: 0 };                 // Mo 20:00
}

let _cache = null;
export function getPremierLeagueMatches() {
  if (!_cache) {
    _cache = baueLiga({
      wettbewerb: "pl", idPrefix: "pl26", ratings: PL_TEAM_RATINGS, derbys: PL_DERBYS,
      saisonStart: SEASON_START, utcOffset: 1, slotFuer, namensPool: NAMENSPOOLS.en,
    });
  }
  return _cache;
}

export function createPremierLeagueOddsSource() {
  return alsQuotenQuelle(getPremierLeagueMatches());
}
