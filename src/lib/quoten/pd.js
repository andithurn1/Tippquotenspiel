// ============================================================
//  LA LIGA — ECHTE 1X2-QUOTEN
//
//  ERZEUGTE DATEI — nicht von Hand bearbeiten.
//  Neu holen:  npm run odds:holen -- pd   (kostet 2 Credits)
//
//  Quelle:   the-odds-api.com, Median über die EU-Buchmacher
//  Geholt:   2026-07-29T23:28:38.160Z
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

export const GEHOLT = "2026-07-29T23:28:38.160Z";

export default [
 {
  "home": "Deportivo Alavés",
  "away": "FC Getafe",
  "kickoff": "2026-08-15T17:30:00Z",
  "odds": {
   "home": 2.39,
   "draw": 2.8,
   "away": 3.5
  },
  "total": 1.825
 },
 {
  "home": "FC Sevilla",
  "away": "Rayo Vallecano",
  "kickoff": "2026-08-15T19:30:00Z",
  "odds": {
   "home": 2.21,
   "draw": 3.2,
   "away": 3.35
  },
  "total": 2.625
 },
 {
  "home": "Racing Santander",
  "away": "Villarreal CF",
  "kickoff": "2026-08-16T15:00:00Z",
  "odds": {
   "home": 3.27,
   "draw": 3.48,
   "away": 2.11
  },
  "total": 2.655
 },
 {
  "home": "Espanyol Barcelona",
  "away": "UD Levante",
  "kickoff": "2026-08-16T17:00:00Z",
  "odds": {
   "home": 2.02,
   "draw": 3.29,
   "away": 3.85
  },
  "total": 2.51
 },
 {
  "home": "Celta Vigo",
  "away": "CA Osasuna",
  "kickoff": "2026-08-16T19:30:00Z",
  "odds": {
   "home": 2.02,
   "draw": 3.4,
   "away": 3.7
  },
  "total": 2.6
 },
 {
  "home": "Deportivo La Coruña",
  "away": "FC Elche",
  "kickoff": "2026-08-17T19:00:00Z",
  "odds": {
   "home": 2.28,
   "draw": 3.17,
   "away": 3.25
  },
  "total": 2.615
 },
 {
  "home": "Atlético Madrid",
  "away": "Málaga",
  "kickoff": "2026-08-19T19:00:00Z",
  "odds": {
   "home": 1.31,
   "draw": 5.38,
   "away": 10.45
  },
  "total": 2.825
 },
 {
  "home": "FC Valencia",
  "away": "Real Betis",
  "kickoff": "2026-08-25T19:00:00Z",
  "odds": {
   "home": 2.7,
   "draw": 3.22,
   "away": 2.7
  },
  "total": 2.57
 },
 {
  "home": "Real Madrid",
  "away": "Real Sociedad",
  "kickoff": "2026-08-26T19:00:00Z",
  "odds": {
   "home": 1.4,
   "draw": 4.98,
   "away": 6.89
  },
  "total": 3.405
 },
 {
  "home": "FC Barcelona",
  "away": "Athletic Bilbao",
  "kickoff": "2026-08-27T19:00:00Z",
  "odds": {
   "home": 1.4,
   "draw": 4.85,
   "away": 6.83
  },
  "total": 3.53
 }
];
