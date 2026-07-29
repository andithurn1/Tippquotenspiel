// ============================================================
//  LA LIGA — simulierte Saison 2026/27 (20 Klubs, 38 Spieltage)
//
//  Gebaut mit `ligaGenerator.js`. Echt sind die Klubs und die üblichen
//  Anstoßzeiten; Spielplan, Quoten, Ergebnisse und Torschützen sind SIMULIERT.
//  Kein offizieller Kalender.
//
//  Stärken der Klubs, die auch in der Champions League antreten, sind mit
//  `championsLeagueData.js` abgestimmt.
//
//  Spanische Ortszeit = MESZ (UTC+2), also dieselbe Uhr wie die Bundesliga —
//  die Staffelung macht hier der Spieltag: La Liga spielt bis 21:00, die
//  Bundesliga hört um 17:30 auf.
// ============================================================

import { baueLiga, findeDerby, alsQuotenQuelle, NAMENSPOOLS } from "./ligaGenerator";
import { QUOTEN } from "./quoten";

export const PD_TEAM_RATINGS = {
  "Real Madrid":         { code: "RMA", attack: 1.90, defense: 0.62 },
  "FC Barcelona":        { code: "BAR", attack: 1.80, defense: 0.72 },
  "Atlético Madrid":     { code: "ATM", attack: 1.40, defense: 0.62 },
  "Villarreal CF":       { code: "VIL", attack: 1.30, defense: 0.95 },
  "Athletic Bilbao":     { code: "ATH", attack: 1.20, defense: 0.85 },
  "Real Betis":          { code: "BET", attack: 1.18, defense: 0.98 },
  "Real Sociedad":       { code: "RSO", attack: 1.12, defense: 0.95 },
  "FC Sevilla":          { code: "SEV", attack: 1.05, defense: 1.02 },
  "Celta Vigo":          { code: "CTA", attack: 1.05, defense: 1.08 },
  "FC Valencia":         { code: "VAL", attack: 1.00, defense: 1.05 },
  "Rayo Vallecano":      { code: "RAY", attack: 0.95, defense: 1.05 },
  "CA Osasuna":          { code: "OSA", attack: 0.92, defense: 1.02 },
  "Espanyol Barcelona":  { code: "ESP", attack: 0.88, defense: 1.10 },
  "FC Getafe":           { code: "GET", attack: 0.85, defense: 0.95 },
  "Deportivo Alavés":    { code: "ALA", attack: 0.85, defense: 1.08 },
  "FC Elche":            { code: "ELC", attack: 0.82, defense: 1.15 },
  "UD Levante":          { code: "LEV", attack: 0.80, defense: 1.20 },
  // ── Aufsteiger 2026/27 ────────────────────────────────────
  // Ersetzen Girona, Mallorca und Oviedo. Girona lag im Mittelfeld (1,08);
  // sein Platz geht an Málaga, damit die Liga oben nicht ausdünnt und die
  // Spreizung erhalten bleibt, gegen die die Balance vermessen ist.
  "Málaga":              { code: "MAL", attack: 1.00, defense: 1.08 },
  "Deportivo La Coruña": { code: "DEP", attack: 0.90, defense: 1.05 },
  "Racing Santander":    { code: "RAC", attack: 0.78, defense: 1.22 },
};

export const PD_DERBYS = [
  { a: "Real Madrid",       b: "FC Barcelona",       label: "El Clásico" },
  { a: "Real Madrid",       b: "Atlético Madrid",    label: "Madrider Derby" },
  { a: "FC Sevilla",        b: "Real Betis",         label: "Derbi Sevillano" },
  { a: "FC Barcelona",      b: "Espanyol Barcelona", label: "Katalanisches Derby" },
  { a: "Athletic Bilbao",   b: "Real Sociedad",      label: "Baskenderby" },
  { a: "Atlético Madrid",   b: "FC Getafe",          label: "Madrider Stadtduell" },
  { a: "FC Valencia",       b: "UD Levante",         label: "Derbi Valenciano" },
];

export function findPdDerby(home, away) {
  return findeDerby(PD_DERBYS, home, away);
}

// Saisonstart Fr. 14.08.2026 — Slot 0 ist der Freitagabend.
const SEASON_START = Date.UTC(2026, 7, 14);

// 10 Partien je Spieltag, Fr–Mo, spanisch spät.
function slotFuer(i) {
  if (i === 0) return { tag: 0, hh: 21, mm: 0 };    // Fr 21:00
  if (i === 1) return { tag: 1, hh: 14, mm: 0 };    // Sa 14:00
  if (i === 2) return { tag: 1, hh: 16, mm: 15 };   // Sa 16:15
  if (i === 3) return { tag: 1, hh: 18, mm: 30 };   // Sa 18:30
  if (i === 4) return { tag: 1, hh: 21, mm: 0 };    // Sa 21:00
  if (i === 5) return { tag: 2, hh: 14, mm: 0 };    // So 14:00
  if (i === 6) return { tag: 2, hh: 16, mm: 15 };   // So 16:15
  if (i === 7) return { tag: 2, hh: 18, mm: 30 };   // So 18:30
  if (i === 8) return { tag: 2, hh: 21, mm: 0 };    // So 21:00
  return { tag: 3, hh: 21, mm: 0 };                 // Mo 21:00
}

let _cache = null;
export function getLaLigaMatches() {
  if (!_cache) {
    _cache = baueLiga({
      wettbewerb: "pd", idPrefix: "pd26", ratings: PD_TEAM_RATINGS, derbys: PD_DERBYS,
      saisonStart: SEASON_START, utcOffset: 2, slotFuer, namensPool: NAMENSPOOLS.es,
      quoten: QUOTEN.pd ?? null,
    });
  }
  return _cache;
}

export function createLaLigaOddsSource() {
  return alsQuotenQuelle(getLaLigaMatches());
}
