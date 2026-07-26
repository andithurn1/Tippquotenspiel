// ============================================================
//  LIGEN-REGISTRY — die EINE Liste aller bespielbaren Wettbewerbe
//
//  Ohne sie stünde die Aufzählung an vier Stellen: Mock-Store, Seed-Skript,
//  Vereinsfilter der Spielerstellung und Quoten-Quelle. Vier Listen laufen
//  auseinander, sobald eine Liga dazukommt — dieselbe Falle wie bei den zwei
//  Kopien von `withSaisonPunkte`.
//
//  Alles hier sind DATEN. Die Engine kennt weiterhin keine Ligennamen; sie
//  liest nur `wettbewerb`/`phase` am Match (Architektur-Regel 3).
// ============================================================

import { getBundesligaMatches, TEAM_RATINGS as BL_RATINGS } from "./bundesligaData";
import { getPremierLeagueMatches, PL_TEAM_RATINGS } from "./premierLeagueData";
import { getLaLigaMatches, PD_TEAM_RATINGS } from "./laLigaData";
import { getSerieAMatches, SA_TEAM_RATINGS } from "./serieAData";
import { getChampionsLeagueMatches, CL_TEAM_RATINGS } from "./championsLeagueData";

// Reihenfolge = Anzeigereihenfolge. Die Champions League steht hinten, weil sie
// keine eigene Klub-Heimat ist, sondern Teams aus den Ligen zusammenzieht.
export const LIGEN = [
  { key: "bl", matches: getBundesligaMatches,     ratings: BL_RATINGS },
  { key: "pl", matches: getPremierLeagueMatches,  ratings: PL_TEAM_RATINGS },
  { key: "pd", matches: getLaLigaMatches,         ratings: PD_TEAM_RATINGS },
  { key: "sa", matches: getSerieAMatches,         ratings: SA_TEAM_RATINGS },
  { key: "cl", matches: getChampionsLeagueMatches, ratings: CL_TEAM_RATINGS },
];

// Alle Spiele aller Wettbewerbe in EINEM Katalog — so, wie der Store sie hält.
export function alleMatches() {
  return LIGEN.flatMap((l) => l.matches());
}

// Alle Vereine, alphabetisch und ohne Dubletten (ein Klub kann in Liga UND
// Champions League antreten). Speist den Vereins-Filter der Spielerstellung:
// nur so lässt sich eine Runde „meine Lieblingsklubs quer durch Europa" bauen.
export function alleVereine() {
  const namen = new Set();
  for (const l of LIGEN) for (const t of Object.keys(l.ratings)) namen.add(t);
  return [...namen].sort((a, b) => a.localeCompare(b, "de"));
}

// Vereine EINES Wettbewerbs — für eine nach Ligen gruppierte Auswahl.
export function vereineVon(key) {
  const liga = LIGEN.find((l) => l.key === key);
  return liga ? Object.keys(liga.ratings).sort((a, b) => a.localeCompare(b, "de")) : [];
}
