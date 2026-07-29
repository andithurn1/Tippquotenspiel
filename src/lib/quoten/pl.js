// ============================================================
//  PREMIER LEAGUE — ECHTE 1X2-QUOTEN
//
//  ERZEUGTE DATEI — nicht von Hand bearbeiten.
//  Neu holen:  npm run odds:holen -- pl   (kostet 2 Credits)
//
//  Quelle:   the-odds-api.com, Median über die EU-Buchmacher
//  Geholt:   2026-07-29T23:28:37.835Z
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

export const GEHOLT = "2026-07-29T23:28:37.836Z";

export default [
 {
  "home": "FC Arsenal",
  "away": "Coventry City",
  "kickoff": "2026-08-21T19:00:00Z",
  "odds": {
   "home": 1.17,
   "draw": 7.25,
   "away": 16
  },
  "total": 3.35
 },
 {
  "home": "Hull City",
  "away": "Manchester United",
  "kickoff": "2026-08-22T11:30:00Z",
  "odds": {
   "home": 7.05,
   "draw": 4.45,
   "away": 1.44
  },
  "total": 2.735
 },
 {
  "home": "FC Everton",
  "away": "Crystal Palace",
  "kickoff": "2026-08-22T14:00:00Z",
  "odds": {
   "home": 2.15,
   "draw": 3.41,
   "away": 3.42
  },
  "total": 2.68
 },
 {
  "home": "Ipswich Town",
  "away": "AFC Sunderland",
  "kickoff": "2026-08-22T14:00:00Z",
  "odds": {
   "home": 2.74,
   "draw": 3.3,
   "away": 2.6
  },
  "total": 2.63
 },
 {
  "home": "Nottingham Forest",
  "away": "Leeds United",
  "kickoff": "2026-08-22T14:00:00Z",
  "odds": {
   "home": 2.21,
   "draw": 3.35,
   "away": 3.2
  },
  "total": 2.675
 },
 {
  "home": "FC Brentford",
  "away": "Tottenham Hotspur",
  "kickoff": "2026-08-22T16:30:00Z",
  "odds": {
   "home": 2.33,
   "draw": 3.6,
   "away": 2.84
  },
  "total": 3.1
 },
 {
  "home": "Brighton & Hove Albion",
  "away": "Aston Villa",
  "kickoff": "2026-08-23T13:00:00Z",
  "odds": {
   "home": 2.26,
   "draw": 3.65,
   "away": 2.92
  },
  "total": 3.355
 },
 {
  "home": "Manchester City",
  "away": "AFC Bournemouth",
  "kickoff": "2026-08-23T13:00:00Z",
  "odds": {
   "home": 1.44,
   "draw": 5,
   "away": 6.3
  },
  "total": 3.605
 },
 {
  "home": "Newcastle United",
  "away": "FC Liverpool",
  "kickoff": "2026-08-23T15:30:00Z",
  "odds": {
   "home": 2.95,
   "draw": 3.8,
   "away": 2.2
  },
  "total": 3.53
 },
 {
  "home": "FC Fulham",
  "away": "FC Chelsea",
  "kickoff": "2026-08-24T19:00:00Z",
  "odds": {
   "home": 3.15,
   "draw": 3.7,
   "away": 2.17
  },
  "total": 3.31
 }
];
