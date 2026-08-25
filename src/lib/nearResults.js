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
import { ergebnisQuote } from "./randquoten";

// 🔴 ZWEI Grenzen, und sie sind nicht dieselbe — bis zum 25.08.2026 gab es
// hier nur EINE, und die beantwortete beides zugleich:
//
//  • `MAX_GOALS` — wie weit das QUOTEN-RASTER reicht (Katalog: 6×6, also
//    0…5). Sie begrenzt `topScorelines`/`likelyScorelines`, die aufzählen,
//    „womit ist zu rechnen": außerhalb des Rasters ist per Definition nichts
//    zu erwarten, und eine fortgeschriebene 9:9 stünde sonst in JEDEM Spiel
//    ganz oben und machte die Liste wertlos.
//
//  • `MAX_TIPP` — wie weit der STEPPER der Tippabgabe reicht (0…9,
//    `Tippabgabe.jsx`). Sie begrenzt die Nachbarschaft: solange ein Tipp
//    abgegeben werden KANN, muss auch seine Nachbarschaft existieren.
//
// Der Fehler daraus: wer 6:0 tippte, bekam von `nearScorelines` gar keine
// Zeile zurück (auch nicht die eigene) — `NaheErgebnisse` rendert dann `null`,
// und der ganze Block „wenn es knapp anders ausgeht" verschwand wortlos. Und
// wer 5:1 tippte, sah 4:1 und 5:0, aber nie 6:1. Seit `randquoten.js`
// (22.08.2026) ZAHLT die Wertung außerhalb des Rasters — nur diese Datei
// wusste es nicht.
export const MAX_GOALS = 5;
export const MAX_TIPP = 9;

const inGrid = (h, a) => h >= 0 && a >= 0 && h <= MAX_TIPP && a <= MAX_TIPP;
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
// Rückgabe je Zeile: { home, away, kind, points, quote, geschaetzt, ebene, isTip }
// `points` in Anzeige-Skala (wie überall in der UI), `quote` = Exakt-Quote des
// jeweiligen Endstands (nicht des Tipps) — dieselbe Zahl, die die Auszahlung trägt.
export function nearPayouts(tip, snap, rules = DEFAULT_RULES) {
  if (!tip || !snap) return [];
  return nearScorelines(tip).map((sl) => {
    const actual = { home: sl.home, away: sl.away, playerGoals: null };
    const s = scoreTip(tip, actual, snap, rules);
    const eq = ergebnisQuote(snap, sl.home, sl.away);
    return {
      ...sl,
      points: s.total,
      // ⚠️ NICHT `snap.correctScore[h][a]` — dieselbe Quelle wie die Wertung
      // (engine.js liest `ergebnisQuote`), sonst steht hier „—" neben einer
      // Punktzahl, die sehr wohl aus einer Quote kommt.
      quote: eq.quote,
      geschaetzt: eq.geschaetzt,
      ebene: s.ebene,
      isTip: sl.kind === "exakt",
    };
  });
}

// Kompakte Übersicht für Listen (z. B. Spielwahl): die auffälligsten Endstände
// eines Spiels — was würde ein exakter Tipp darauf zahlen? Ohne eigenen Tipp,
// rein als Orientierung „wo liegt bei diesem Spiel überhaupt Geld".
// Sortiert nach Auszahlung absteigend, `limit` Zeilen.
// ⚠️ Bleibt bewusst bei `MAX_GOALS` (Raster), nicht bei `MAX_TIPP`: mit
// Fortschreibung gewönne der höchste Endstand immer, in jedem Spiel dieselbe
// Zeile. Diese Liste soll orientieren, nicht die Kante vorführen.
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
