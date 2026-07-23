// ============================================================
//  BUNDESLIGA-STATISTIK — grobe, an realen Saison-Verteilungen
//  orientierte Richtwerte (gerundet, KEINE tagesaktuelle Statistik).
//  Dient nur als Kontext, um zu zeigen, wie oft welche Spielart real
//  vorkommt — und darauf aufbauend, wie „underdog-freundlich" ein
//  Regelwerk ist (presetRating.js). Reine Daten, kein UI.
//
//  Quellen-Größenordnung (langjährige Bundesliga-Mittel):
//   Heimsieg ~44 %, Remis ~24 %, Auswärtssieg ~32 %.
//   ~3,1 Tore/Spiel (Heim ~1,78, Auswärts ~1,46).
//  Bewusst gerundet, damit klar ist: Richtwert, kein exakter Datensatz.
// ============================================================

// Ausgangs-Verteilung (Sieger).
export const OUTCOME_SPLIT = { heimsieg: 0.44, remis: 0.24, auswaertssieg: 0.32 };
export const AVG_GOALS = 3.1;

// Häufigkeit der Spielarten (Keys = rulePreview-Archetypen), grob geschätzt an
// den realen Verteilungen. Summe = 1. Der Außenseiter-Anteil (~13 %) liegt im
// oft zitierten Korridor „außergewöhnliche Ergebnisse".
export const ARCHETYPE_FREQ = {
  favorit: 0.30,       // klarer Favorit setzt sich durch
  "wenig-tore": 0.20,  // enges, torarmes Spiel
  torfestival: 0.17,   // viele Tore
  aussenseiter: 0.13,  // Außenseiter gewinnt (Überraschung)
  remis: 0.20,         // unentschieden
};

export const ARCHETYPE_LABEL = {
  favorit: "Favorit dominant",
  "wenig-tore": "Enges, torarmes Spiel",
  torfestival: "Torfestival",
  aussenseiter: "Außenseiter siegt",
  remis: "Remis",
};

// Als Liste, absteigend nach Häufigkeit — praktisch fürs Balken-Rendering.
export function archetypeDistribution() {
  return Object.entries(ARCHETYPE_FREQ)
    .map(([key, freq]) => ({ key, label: ARCHETYPE_LABEL[key], freq }))
    .sort((a, b) => b.freq - a.freq);
}
