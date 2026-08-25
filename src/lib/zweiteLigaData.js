// ============================================================
//  2. BUNDESLIGA — Saison 2026/27, simulierte Ergebnisse.
//
//  Aufgebaut wie `bundesligaData.js`, mit denselben Trennungen:
//  ECHT sind die 18 Klubs; SIMULIERT sind Quoten, Ergebnisse, Torschützen und
//  die Team-Stärken (grobe, plausible Einschätzungen, kein echtes Rating).
//  Auch die Spielernamen bleiben erfunden — Kader ändern sich mit jedem
//  Transferfenster, und erfundene Daten dürfen nicht wie echte aussehen.
//
//  ⚠️ **Der Spielplan ist noch ERZEUGT** (Circle-Methode über `saisonStart`
//  und `slotFuer`). Echt wird er mit
//  `npm run import:spielplan -- bl2` — OpenLigaDB führt die 2. Bundesliga.
//  Danach `npm run seed:matches`. Bis dahin sagt `herkunftLabel` korrekt, dass
//  dieser Wettbewerb erzeugt ist; behauptet wird nichts.
//
//  🔴 Die Klubnamen hier müssen EXAKT denen der Quelle entsprechen, sonst
//  bricht `pruefeSpielplan` den Import hart ab. Das ist Absicht: ein Klubname
//  mit anderer Schreibweise erzeugte sonst still eine halbe Saison, und das
//  fiele erst auf, wenn jemand auf ein Spiel tippt, das es nicht gibt.
//
//  ── Warum die Stärken enger beieinander liegen als in der Bundesliga ──
//  Die 2. Liga ist ausgeglichener; es gibt keinen Klub, der wie Bayern über
//  allen steht. Die Spanne ist deshalb schmaler (attack 0,85–1,35 statt
//  0,75–1,85). Das ist keine Balance-Frage, sondern eine Eigenschaft der Liga
//  — und sie macht die Quoten enger, was das Tippen dort schwerer macht.
// ============================================================

import { baueLiga } from "./ligaGenerator";
import { SPIELPLAENE } from "./spielplaene";
import { QUOTEN } from "./quoten";

// attack/defense: 1.0 = Liga-Durchschnitt. attack hoch = torgefährlich,
// defense hoch = anfällig (wirkt als Faktor auf die gegnerische Tor-Erwartung).
// 🔴 Diese 18 Namen sind NICHT geraten, sondern am 07.08.2026 aus der Quelle
// geholt (`getavailableteams/bl2/2026` bei OpenLigaDB) — genau in deren
// Schreibweise. Der erste Anlauf stand auf einer erfundenen Liste, und der
// Import hat ihn hart abgebrochen: vier Klubs spielen in der 1. Liga, vier
// andere fehlten ganz. Genau dafür ist `pruefeSpielplan` gebaut.
//
// ⚠️ Wer hier einen Namen ändert, prüft ihn gegen die Quelle — sonst bricht
// der nächste Import ab (im besseren Fall) oder ein Alias verdeckt still,
// dass die Liste veraltet ist.
export const BL2_TEAM_RATINGS = {
  "FC St. Pauli":             { code: "STP", attack: 1.30, defense: 0.85 },
  "VfL Wolfsburg":            { code: "WOB", attack: 1.28, defense: 0.85 },
  "1. FC Heidenheim 1846":    { code: "FCH", attack: 1.22, defense: 0.90 },
  "Hertha BSC":               { code: "BSC", attack: 1.20, defense: 0.92 },
  "DSC Arminia Bielefeld":    { code: "DSC", attack: 1.15, defense: 0.95 },
  "1. FC Kaiserslautern":     { code: "FCK", attack: 1.12, defense: 0.95 },
  "Hannover 96":              { code: "H96", attack: 1.10, defense: 0.98 },
  "1. FC Nürnberg":           { code: "FCN", attack: 1.08, defense: 1.00 },
  "SV Darmstadt 98":          { code: "SVD", attack: 1.05, defense: 1.02 },
  "Karlsruher SC":            { code: "KSC", attack: 1.05, defense: 1.02 },
  "Dynamo Dresden":           { code: "SGD", attack: 1.00, defense: 1.05 },
  "SpVgg Greuther Fürth":     { code: "SGF", attack: 1.00, defense: 1.08 },
  "Eintracht Braunschweig":   { code: "EBS", attack: 0.95, defense: 1.10 },
  "1. FC Magdeburg":          { code: "FCM", attack: 0.95, defense: 1.08 },
  "Holstein Kiel":            { code: "KSV", attack: 0.95, defense: 1.10 },
  "VfL Osnabrück":            { code: "OSN", attack: 0.90, defense: 1.12 },
  "Energie Cottbus":          { code: "FCE", attack: 0.88, defense: 1.15 },
  "VfL Bochum":               { code: "BOC", attack: 0.85, defense: 1.18 },
};

// Traditionsduelle der 2. Liga. Wie in der Bundesliga richtungsunabhängig —
// die Engine kennt keine Vereinsnamen, das Label setzt die Daten-Schicht.
// ⚠️ Jeder Name hier MUSS in `BL2_TEAM_RATINGS` stehen. Ein Derby auf einen
// Klub, den es in dieser Liga nicht gibt, ist kein Fehler, der auffällt — es
// greift schlicht nie, und der Aufschlag bleibt still aus. Beim ersten Anlauf
// standen hier vier Klubs, die in der 1. Liga spielen.
export const BL2_DERBYS = [
  { a: "VfL Bochum",             b: "DSC Arminia Bielefeld", label: "Westfalen-Derby" },
  { a: "1. FC Nürnberg",         b: "SpVgg Greuther Fürth",  label: "Frankenderby" },
  { a: "Hannover 96",            b: "Eintracht Braunschweig", label: "Niedersachsen-Derby" },
  { a: "Hannover 96",            b: "VfL Wolfsburg",         label: "Niedersachsen-Derby" },
  { a: "VfL Wolfsburg",          b: "Eintracht Braunschweig", label: "Niedersachsen-Derby" },
  { a: "Dynamo Dresden",         b: "1. FC Magdeburg",       label: "Ostderby" },
  { a: "Dynamo Dresden",         b: "Energie Cottbus",       label: "Ostderby" },
  { a: "Energie Cottbus",        b: "Hertha BSC",            label: "Ostderby" },
  { a: "1. FC Kaiserslautern",   b: "SV Darmstadt 98",       label: "Südwest-Duell" },
  { a: "Karlsruher SC",          b: "1. FC Heidenheim 1846", label: "Süddeutsches Duell" },
];

// ⚠️ `findBl2Derby(home, away)` stand hier bis zum 25.08.2026 — ein zweiter Weg
// zu einer Frage, die der Generator längst am Spiel beantwortet: `baueLiga`
// schreibt `snapshot.derby` (ligaGenerator.js), und genau das liest die
// Wertung. Niemand rief die Funktion auf; ein Aufrufer hätte nur die
// Chance eröffnet, dass beide Wege auseinanderlaufen. `BL2_DERBYS` bleibt —
// die Liste IST die Quelle, sie geht unten als `derbys:` in den Generator.

// Anstöße: dieselbe Woche wie die Bundesliga, aber auf die klassischen
// Zweitliga-Termine gelegt (Fr 18:30, Sa 13:00, So 13:30). Ortszeit,
// MESZ = UTC+2.
//
// ⚠️ Bewusst ANDERE Uhrzeiten als in der 1. Liga: fielen beide auf dieselben
// Slots, lägen in einer Runde über beide Wettbewerbe die Spieltage exakt
// übereinander — die Zeitachse könnte sie dann nicht mehr staffeln, und
// „Spieltag 5 der Runde" träfe 18 Spiele auf einmal.
const SEASON_START = Date.UTC(2026, 7, 28);

function slotFuer(i) {
  if (i === 0)     return { tag: 0, hh: 18, mm: 30 };   // Fr 18:30
  if (i <= 3)      return { tag: 1, hh: 13, mm: 0 };    // Sa 13:00
  if (i <= 6)      return { tag: 1, hh: 20, mm: 30 };   // Sa 20:30
  return { tag: 2, hh: 13, mm: 30 };                    // So 13:30
}

let _cache = null;
export function getZweiteLigaMatches() {
  if (!_cache) {
    _cache = baueLiga({
      wettbewerb: "bl2", idPrefix: "bl226", ratings: BL2_TEAM_RATINGS, derbys: BL2_DERBYS,
      saisonStart: SEASON_START, utcOffset: 2, slotFuer,
      // Noch keine Spielplan-Datei — `baueLiga` fällt dann auf die
      // Circle-Methode zurück. Sobald `npm run import:spielplan -- bl2`
      // gelaufen ist, greift der echte Plan hier automatisch.
      spielplan: SPIELPLAENE.bl2 ?? null,
      quoten: QUOTEN.bl2 ?? null,
    });
  }
  return _cache;
}

