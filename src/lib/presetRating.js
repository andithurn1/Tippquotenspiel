// ============================================================
//  PRESET-RATING — wie „underdog-freundlich" ein Regelwerk ist.
//  Leitet aus der Spielart-Vorschau (echte Engine-Punkte) zwei
//  Kennzahlen ab und verdichtet sie zu einer Underdog-Neigung 0–100:
//   1) Überraschungs-Prämie: zahlt ein korrekt getippter Außenseiter-
//      Sieg mehr als ein korrekt getippter Favoritensieg? (Verhältnis)
//   2) Favoriten-Risiko: wie stark bricht der Favoriten-Tipp ein, wenn
//      der Favorit patzt? (0 = gar nicht … 1 = auf null)
//  Reine Berechnung, kein UI. Aktualisiert sich mit jedem Regler.
// ============================================================

import { previewArchetypes } from "./rulePreview";

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Punkte des „exakt"-Tipps einer Spielart (korrekt vorhergesagt).
function exaktPoints(rows, key) {
  const row = rows.find((r) => r.key === key);
  return row?.tips.find((t) => t.kind === "exakt")?.points ?? 0;
}

export function ratePreset(rules) {
  const rows = previewArchetypes(rules);
  const rowsNoFlop = previewArchetypes({ ...rules, favFlopPenalty: 0 });

  // 1) Überraschungs-Prämie: Außenseiter-Sieg exakt vs. Favoritensieg exakt.
  const favExakt = exaktPoints(rows, "favorit");
  const dogExakt = exaktPoints(rows, "aussenseiter");
  const surprisePremium = favExakt > 0 ? dogExakt / favExakt : (dogExakt > 0 ? Infinity : 1);

  // 2) Favoriten-Risiko: Einbruch des Favoriten-Tipps im Außenseiter-Spiel.
  const dogRow = rows.find((r) => r.key === "aussenseiter");
  const dogRowBase = rowsNoFlop.find((r) => r.key === "aussenseiter");
  const favTip = dogRow?.tips.find((t) => t.kind === "Favorit")?.points ?? 0;
  const favTipBase = dogRowBase?.tips.find((t) => t.kind === "Favorit")?.points ?? 0;
  const favFlopEffect = favTipBase > 0 ? clamp01(1 - favTip / favTipBase) : 0;

  // Prämie 1× (Außenseiter zahlt wie Favorit) → 0, 6×+ → 1.
  const premiumScore = clamp01((Math.min(surprisePremium, 6) - 1) / (6 - 1));
  const underdogLean = Math.round(100 * (0.7 * premiumScore + 0.3 * favFlopEffect));

  const label =
    underdogLean >= 66 ? "stark underdog-lastig" :
    underdogLean >= 45 ? "underdog-freundlich" :
    underdogLean >= 25 ? "ausgewogen" : "favoritenfreundlich";

  return {
    surprisePremium: surprisePremium === Infinity ? Infinity : +surprisePremium.toFixed(1),
    favFlopEffect: +(favFlopEffect * 100).toFixed(0), // in Prozent
    underdogLean,
    label,
  };
}
