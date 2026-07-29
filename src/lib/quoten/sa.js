// ============================================================
//  SERIE A — ECHTE 1X2-QUOTEN
//
//  ERZEUGTE DATEI — nicht von Hand bearbeiten.
//  Neu holen:  npm run odds:holen -- sa   (kostet 2 Credits)
//
//  Quelle:   the-odds-api.com, Median über die EU-Buchmacher
//  Geholt:   2026-07-29T23:28:38.495Z
//  Umfang:   10 Spiele (nur ANSTEHENDE — die API liefert keine
//            ganze Saison im Voraus)
//
//  Klubnamen sind bereits auf unseren Katalog übersetzt (klubnamen.js).
//  Ergebnis-Raster: 0 von 10 Spielen
//  (`correctScore` = ECHTE Marktpreise je Endstand. Wo es fehlt, leitet
//   oddsApi.snapshotFromOdds() das Raster wie bisher aus 1X2 ab.)
//  Torschnitt:      10 von 10 Spielen
//  (`total` = erwartete Gesamt-Tore aus der echten Über/Unter-Linie. Damit
//   ist der Torschnitt gemessen statt geschätzt — und ρ mit ihm.)
// ============================================================

// Der Zeitstempel steht auch als DATEN da, nicht nur im Kopf: nur so kann
// die App merken, dass ihre Quoten alt sind (siehe quotenAlter in spielplan.js).

export const GEHOLT = "2026-07-29T23:28:38.495Z";

export default [
 {
  "home": "Udinese Calcio",
  "away": "Como 1907",
  "kickoff": "2026-08-22T16:30:00Z",
  "odds": {
   "home": 4.43,
   "draw": 3.45,
   "away": 1.81
  },
  "total": 2.54
 },
 {
  "home": "Inter Mailand",
  "away": "AC Monza",
  "kickoff": "2026-08-22T16:30:00Z",
  "odds": {
   "home": 1.22,
   "draw": 6.25,
   "away": 12.13
  },
  "total": 3.08
 },
 {
  "home": "Parma Calcio",
  "away": "Cagliari Calcio",
  "kickoff": "2026-08-22T18:45:00Z",
  "odds": {
   "home": 2.63,
   "draw": 3.05,
   "away": 2.86
  },
  "total": 2.57
 },
 {
  "home": "CFC Genua",
  "away": "SSC Neapel",
  "kickoff": "2026-08-22T18:45:00Z",
  "odds": {
   "home": 4.6,
   "draw": 3.25,
   "away": 1.85
  },
  "total": 2.63
 },
 {
  "home": "Frosinone Calcio",
  "away": "Juventus Turin",
  "kickoff": "2026-08-23T16:30:00Z",
  "odds": {
   "home": 6.75,
   "draw": 4.4,
   "away": 1.46
  },
  "total": 2.745
 },
 {
  "home": "Venezia FC",
  "away": "US Lecce",
  "kickoff": "2026-08-23T16:30:00Z",
  "odds": {
   "home": 2.34,
   "draw": 3.21,
   "away": 3.1
  },
  "total": 2.53
 },
 {
  "home": "FC Turin",
  "away": "AC Mailand",
  "kickoff": "2026-08-23T18:45:00Z",
  "odds": {
   "home": 4.44,
   "draw": 3.67,
   "away": 1.78
  },
  "total": 2.69
 },
 {
  "home": "Atalanta Bergamo",
  "away": "US Sassuolo",
  "kickoff": "2026-08-23T18:45:00Z",
  "odds": {
   "home": 1.53,
   "draw": 4.3,
   "away": 5.8
  },
  "total": 3.03
 },
 {
  "home": "Bologna FC",
  "away": "Lazio Rom",
  "kickoff": "2026-08-24T16:30:00Z",
  "odds": {
   "home": 2.13,
   "draw": 3.23,
   "away": 3.55
  },
  "total": 2.55
 },
 {
  "home": "AS Rom",
  "away": "AC Florenz",
  "kickoff": "2026-08-24T18:45:00Z",
  "odds": {
   "home": 1.54,
   "draw": 4.05,
   "away": 5.9
  },
  "total": 2.695
 }
];
