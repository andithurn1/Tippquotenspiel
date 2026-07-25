// ============================================================
//  NAHE ERGEBNISSE — „was zahlt mein Tipp, wenn es knapp anders ausgeht?"
//
//  Reine Anzeige-Hilfe für die Orientierung beim Tippen. Rechnet NICHT selbst,
//  sondern fragt die Engine (`scoreTip`) für jedes benachbarte Ergebnis:
//  „wenn DIESER Endstand fällt — was bringt mir mein Tipp dann?"
//
//  Zwei Nachbarschaften, wie beim Tippen gedacht wird:
//   • GLEICHER ABSTAND  — 2:1 → 3:2, 1:0 (Sieghöhe stimmt, Tore anders)
//   • EIN TOR MEHR/WENIGER je Team — 2:1 → 3:1, 1:1, 2:2, 2:0
//
//  Anker bleibt konsequent das ANGENOMMENE REALE Ergebnis (Architektur-Regel 4
//  in CLAUDE.md): jede Zeile fragt „wenn es so ausgeht", nie „wenn ich so tippe".
//  Deshalb ist das hier ehrliche Aussicht und nicht farmbar.
//
//  Engine-frei im Sinne von: liest nur, verändert nichts. UI-frei.
// ============================================================

import { scoreTip, DEFAULT_RULES } from "./engine";

// Quoten-Raster ist 6×6 (0…5 Tore) — außerhalb gibt es keine Quote.
export const MAX_GOALS = 5;

const inGrid = (h, a) => h >= 0 && a >= 0 && h <= MAX_GOALS && a <= MAX_GOALS;
const key = (h, a) => `${h}:${a}`;

// Die Nachbar-Endstände rund um einen getippten Endstand.
// `kind`: "exakt" | "abstand" (gleiche Sieghöhe) | "heim" | "gast" (ein Tor mehr/weniger).
export function nearScorelines(tip) {
  const h = Number(tip?.home ?? 0), a = Number(tip?.away ?? 0);
  const out = [];
  const seen = new Set();
  const add = (hh, aa, kind) => {
    if (!inGrid(hh, aa) || seen.has(key(hh, aa))) return;
    seen.add(key(hh, aa));
    out.push({ home: hh, away: aa, kind });
  };

  add(h, a, "exakt");
  // Gleicher Abstand: beide Teams ein Tor mehr bzw. weniger.
  add(h + 1, a + 1, "abstand");
  add(h - 1, a - 1, "abstand");
  // Ein Tor mehr/weniger — jeweils nur ein Team (die Gegner-Frage des Nutzers).
  add(h + 1, a, "heim");
  add(h - 1, a, "heim");
  add(h, a + 1, "gast");
  add(h, a - 1, "gast");

  return out;
}

// Für jeden Nachbar-Endstand: was zahlt DIESER Tipp, wenn es so ausgeht?
// Rückgabe je Zeile: { home, away, kind, points, quote, ebene, isTip }
// `points` in Anzeige-Skala (wie überall in der UI), `quote` = Exakt-Quote des
// jeweiligen Endstands (nicht des Tipps) — dieselbe Zahl, die die Auszahlung trägt.
export function nearPayouts(tip, snap, rules = DEFAULT_RULES) {
  if (!tip || !snap) return [];
  return nearScorelines(tip).map((sl) => {
    const actual = { home: sl.home, away: sl.away, playerGoals: null };
    const s = scoreTip(tip, actual, snap, rules);
    return {
      ...sl,
      points: s.total,
      quote: snap.correctScore?.[sl.home]?.[sl.away] ?? null,
      ebene: s.ebene,
      isTip: sl.kind === "exakt",
    };
  });
}

// Kompakte Übersicht für Listen (z. B. Spielwahl): die auffälligsten Endstände
// eines Spiels — was würde ein exakter Tipp darauf zahlen? Ohne eigenen Tipp,
// rein als Orientierung „wo liegt bei diesem Spiel überhaupt Geld".
// Sortiert nach Auszahlung absteigend, `limit` Zeilen.
export function topScorelines(snap, rules = DEFAULT_RULES, limit = 3) {
  if (!snap?.correctScore) return [];
  const rows = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const quote = snap.correctScore?.[h]?.[a];
      if (quote == null) continue;
      // Ein exakter Tipp auf diesen Endstand (ohne Torschützen).
      const tip = { home: h, away: a, goals: { home: [], away: [] } };
      const s = scoreTip(tip, { home: h, away: a, playerGoals: null }, snap, rules);
      rows.push({ home: h, away: a, quote, points: s.total });
    }
  }
  rows.sort((x, y) => y.points - x.points);
  return rows.slice(0, limit);
}

// Die wahrscheinlichsten Endstände (niedrigste Quote = wahrscheinlichster),
// als Gegenstück zu topScorelines: „womit ist zu rechnen" statt „wo zahlt es".
export function likelyScorelines(snap, rules = DEFAULT_RULES, limit = 3) {
  if (!snap?.correctScore) return [];
  const rows = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const quote = snap.correctScore?.[h]?.[a];
      if (quote == null) continue;
      const tip = { home: h, away: a, goals: { home: [], away: [] } };
      const s = scoreTip(tip, { home: h, away: a, playerGoals: null }, snap, rules);
      rows.push({ home: h, away: a, quote, points: s.total });
    }
  }
  rows.sort((x, y) => x.quote - y.quote);
  return rows.slice(0, limit);
}
