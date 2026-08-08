// ============================================================
//  2. BUNDESLIGA — ECHTE 1X2-QUOTEN
//
//  ERZEUGTE DATEI — nicht von Hand bearbeiten.
//  Neu holen:  npm run odds:holen -- bl2   (kostet 2 Credits)
//
//  Quelle:   the-odds-api.com, Median über die EU-Buchmacher
//  Geholt:   2026-08-08T15:56:12.780Z
//  Umfang:   6 Spiele (nur ANSTEHENDE — die API liefert keine
//            ganze Saison im Voraus)
//
//  Klubnamen sind bereits auf unseren Katalog übersetzt (klubnamen.js).
//  Ergebnis-Raster: 0 von 6 Spielen
//  (`correctScore` = ECHTE Marktpreise je Endstand. Wo es fehlt, leitet
//   oddsApi.snapshotFromOdds() das Raster wie bisher aus 1X2 ab.)
//  Torschnitt:      6 von 6 Spielen
//  (`total` = erwartete Gesamt-Tore aus der echten Über/Unter-Linie. Damit
//   ist der Torschnitt gemessen statt geschätzt — und ρ mit ihm.)
// ============================================================

// Der Zeitstempel steht auch als DATEN da, nicht nur im Kopf: nur so kann
// die App merken, dass ihre Quoten alt sind (siehe quotenAlter in spielplan.js).

export const GEHOLT = "2026-08-08T15:56:12.783Z";

export default [
 {
  "home": "VfL Wolfsburg",
  "away": "1. FC Kaiserslautern",
  "kickoff": "2026-08-08T18:30:00Z",
  "odds": {
   "home": 1.57,
   "draw": 4.33,
   "away": 4.83
  },
  "total": 3.545
 },
 {
  "home": "1. FC Nürnberg",
  "away": "Dynamo Dresden",
  "kickoff": "2026-08-09T11:30:00Z",
  "odds": {
   "home": 2.19,
   "draw": 3.45,
   "away": 3.04
  },
  "total": 2.8
 },
 {
  "home": "Energie Cottbus",
  "away": "Hannover 96",
  "kickoff": "2026-08-09T11:30:00Z",
  "odds": {
   "home": 3.15,
   "draw": 3.6,
   "away": 2.08
  },
  "total": 3.33
 },
 {
  "home": "FC St. Pauli",
  "away": "SpVgg Greuther Fürth",
  "kickoff": "2026-08-09T11:30:00Z",
  "odds": {
   "home": 1.85,
   "draw": 3.78,
   "away": 3.79
  },
  "total": 3.145
 },
 {
  "home": "Eintracht Braunschweig",
  "away": "VfL Bochum",
  "kickoff": "2026-08-14T16:30:00Z",
  "odds": {
   "home": 2.58,
   "draw": 3.17,
   "away": 2.6
  },
  "total": 2.675
 },
 {
  "home": "SpVgg Greuther Fürth",
  "away": "1. FC Nürnberg",
  "kickoff": "2026-08-15T11:00:00Z",
  "odds": {
   "home": 2.4,
   "draw": 3.52,
   "away": 2.45
  },
  "total": 3.52
 }
];
