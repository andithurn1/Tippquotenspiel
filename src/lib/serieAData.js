// ============================================================
//  SERIE A — simulierte Saison 2026/27 (20 Klubs, 38 Spieltage)
//
//  Gebaut mit `ligaGenerator.js`. Echt sind die Klubs und die üblichen
//  Anstoßzeiten; Spielplan, Quoten, Ergebnisse und Torschützen sind SIMULIERT.
//  Kein offizieller Kalender.
//
//  Stärken der Klubs, die auch in der Champions League antreten, sind mit
//  `championsLeagueData.js` abgestimmt.
//
//  Italienische Ortszeit = MESZ (UTC+2). Die Serie A beginnt erst um 12:30 und
//  spielt bis 20:45 — dadurch liegt sie zeitlich zwischen Bundesliga und
//  La Liga, was die wettbewerbsübergreifende Runde erst interessant macht.
// ============================================================

import { baueLiga, NAMENSPOOLS } from "./ligaGenerator";
import { QUOTEN } from "./quoten";
import { SPIELPLAENE } from "./spielplaene";

export const SA_TEAM_RATINGS = {
  "Inter Mailand":     { code: "INT", attack: 1.55, defense: 0.62 },
  "SSC Neapel":        { code: "NAP", attack: 1.48, defense: 0.78 },
  "AC Mailand":        { code: "MIL", attack: 1.45, defense: 0.80 },
  "Atalanta Bergamo":  { code: "ATA", attack: 1.42, defense: 0.90 },
  "Juventus Turin":    { code: "JUV", attack: 1.38, defense: 0.72 },
  "AS Rom":            { code: "ROM", attack: 1.25, defense: 0.85 },
  "Lazio Rom":         { code: "LAZ", attack: 1.20, defense: 0.92 },
  "AC Florenz":        { code: "FIO", attack: 1.15, defense: 0.98 },
  "Bologna FC":        { code: "BOL", attack: 1.05, defense: 1.00 },
  "Como 1907":         { code: "COM", attack: 1.00, defense: 1.05 },
  "FC Turin":          { code: "TOR", attack: 0.95, defense: 1.00 },
  "Udinese Calcio":    { code: "UDI", attack: 0.92, defense: 1.05 },
  "US Sassuolo":       { code: "SAS", attack: 0.88, defense: 1.15 },
  "Cagliari Calcio":   { code: "CAG", attack: 0.85, defense: 1.12 },
  "CFC Genua":         { code: "GEN", attack: 0.85, defense: 1.08 },
  "Parma Calcio":      { code: "PAR", attack: 0.82, defense: 1.15 },
  "US Lecce":          { code: "LEC", attack: 0.78, defense: 1.20 },
  // ── Aufsteiger 2026/27 ────────────────────────────────────
  // Ersetzen Hellas Verona, Cremonese und Pisa — dieselben Rating-Plätze,
  // damit die Spreizung der Liga unverändert bleibt.
  "AC Monza":          { code: "MZA", attack: 0.80, defense: 1.18 },
  "Venezia FC":        { code: "VEN", attack: 0.76, defense: 1.20 },
  "Frosinone Calcio":  { code: "FRO", attack: 0.75, defense: 1.22 },
};

export const SA_DERBYS = [
  { a: "Inter Mailand",  b: "AC Mailand",   label: "Derby della Madonnina" },
  { a: "Inter Mailand",  b: "Juventus Turin", label: "Derby d'Italia" },
  { a: "AS Rom",         b: "Lazio Rom",    label: "Derby della Capitale" },
  { a: "Juventus Turin", b: "FC Turin",     label: "Turiner Derby" },
  { a: "Bologna FC",     b: "AC Florenz",   label: "Derby dell'Appennino" },
  { a: "SSC Neapel",     b: "AS Rom",       label: "Derby del Sole" },
];

// ⚠️ `findSaDerby(home, away)` stand hier bis zum 25.08.2026 — ein zweiter Weg
// zu einer Frage, die der Generator längst am Spiel beantwortet: `baueLiga`
// schreibt `snapshot.derby` (ligaGenerator.js), und genau das liest die
// Wertung. Niemand rief die Funktion auf; ein Aufrufer hätte nur die
// Chance eröffnet, dass beide Wege auseinanderlaufen. `SA_DERBYS` bleibt —
// die Liste IST die Quelle, sie geht unten als `derbys:` in den Generator.

// Saisonstart Sa. 22.08.2026 — eine Woche vor der Bundesliga.
const SEASON_START = Date.UTC(2026, 7, 22);

// 10 Partien je Spieltag, Sa–Mo, mit dem typischen Sonntagsprogramm.
function slotFuer(i) {
  if (i === 0) return { tag: 0, hh: 15, mm: 0 };    // Sa 15:00
  if (i === 1) return { tag: 0, hh: 18, mm: 0 };    // Sa 18:00
  if (i === 2) return { tag: 0, hh: 20, mm: 45 };   // Sa 20:45
  if (i === 3) return { tag: 1, hh: 12, mm: 30 };   // So 12:30
  if (i <= 5)  return { tag: 1, hh: 15, mm: 0 };    // So 15:00
  if (i === 6) return { tag: 1, hh: 18, mm: 0 };    // So 18:00
  if (i === 7) return { tag: 1, hh: 20, mm: 45 };   // So 20:45
  if (i === 8) return { tag: 2, hh: 18, mm: 30 };   // Mo 18:30
  return { tag: 2, hh: 20, mm: 45 };                // Mo 20:45
}

let _cache = null;
export function getSerieAMatches() {
  if (!_cache) {
    _cache = baueLiga({
      wettbewerb: "sa", idPrefix: "sa26", ratings: SA_TEAM_RATINGS, derbys: SA_DERBYS,
      saisonStart: SEASON_START, utcOffset: 2, slotFuer, namensPool: NAMENSPOOLS.it,
      // 🔴 Der ECHTE Kalender, seit 09.08.2026 (openfootball, frei).
      // Fehlt die Datei, faellt die Liga auf die Circle-Methode zurueck —
      // lieber eine erzeugte Saison als gar keine. Quoten, Ergebnisse und
      // Torschuetzen bleiben erzeugt; `echterSpielplan` am Match haelt die
      // Trennung fest, damit die Oberflaeche nichts Falsches behauptet.
      spielplan: SPIELPLAENE.sa ?? null,
      quoten: QUOTEN.sa ?? null,
    });
  }
  return _cache;
}

