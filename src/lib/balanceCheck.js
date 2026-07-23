// ============================================================
//  BALANCE-CHECK — testet, ob das Regelwerk die richtige Spannung
//  zwischen "Favorit tippen ist der solide Standard" und "ein
//  richtig vorhergesagter Ausreißer zahlt sich richtig aus" trifft.
//  Kein UI, kein Teil der App-Laufzeit — Analyse-Werkzeug wie
//  demo() in engine.js, nur für die Regelwerk-Balance statt für
//  ein einzelnes Beispiel.
// ============================================================

import { generateMatchOdds } from "./oddsGenerator";
import { scoreTip, DEFAULT_RULES } from "./engine";

// Immer gleiche zwei Tipp-Strategien, nur das Ergebnis wird verglichen
// (keine Torschützen — die sind ein separater, orthogonaler Bonus-Layer).
const FAV_TIP = { home: 2, away: 0, goals: { home: [], away: [] } };   // "ich tippe brav den Favoriten"
const DOG_TIP = { home: 1, away: 2, goals: { home: [], away: [] } };   // "ich tippe mutig den Außenseiter-Sieg"

// 25 handkuratierte Spiele, FESTE Ergebnisse (nicht zufällig simuliert, damit
// der Vergleich über Regelwerk-Varianten hinweg exakt reproduzierbar bleibt):
//  - 17 "chalk": klarer Favorit gewinnt wie erwartet
//  -  5 "close": ausgeglichene Stärke, Remis oder knapper Ausgang
//  -  3 "upset": klarer Favorit verliert trotzdem → 3/25 = 12%, der
//    angefragte "10–15%-außergewöhnliche-Ergebnisse"-Bereich.
const FIXTURES = [
  // bucket, [Heim-Angriff, Heim-Abwehr], [Gast-Angriff, Gast-Abwehr], [Heim-Tore, Gast-Tore]
  { bucket: "chalk", h: [1.85, 0.60], a: [0.70, 1.35], res: [3, 0] },
  { bucket: "chalk", h: [1.55, 0.70], a: [0.75, 1.30], res: [2, 0] },
  { bucket: "chalk", h: [1.50, 0.80], a: [0.80, 1.20], res: [2, 0] },
  { bucket: "chalk", h: [1.45, 0.75], a: [0.85, 1.25], res: [3, 1] },
  { bucket: "chalk", h: [1.30, 0.85], a: [0.90, 1.00], res: [1, 0] },
  { bucket: "chalk", h: [1.85, 0.60], a: [0.72, 1.30], res: [2, 0] },
  { bucket: "chalk", h: [1.55, 0.70], a: [0.90, 0.95], res: [2, 1] },
  { bucket: "chalk", h: [1.50, 0.80], a: [0.80, 1.20], res: [3, 0] },
  { bucket: "chalk", h: [1.45, 0.75], a: [0.85, 1.25], res: [2, 0] },
  { bucket: "chalk", h: [1.30, 0.85], a: [0.95, 0.95], res: [1, 0] },
  { bucket: "chalk", h: [1.85, 0.60], a: [0.75, 1.30], res: [4, 1] },
  { bucket: "chalk", h: [1.55, 0.70], a: [0.85, 1.25], res: [2, 0] },
  { bucket: "chalk", h: [1.50, 0.80], a: [0.90, 1.00], res: [2, 1] },
  { bucket: "chalk", h: [1.45, 0.75], a: [0.80, 1.20], res: [3, 0] },
  { bucket: "chalk", h: [1.30, 0.85], a: [0.90, 0.95], res: [1, 0] },
  { bucket: "chalk", h: [1.55, 0.70], a: [0.72, 1.30], res: [2, 0] },
  { bucket: "chalk", h: [1.50, 0.80], a: [0.85, 1.25], res: [3, 1] },

  { bucket: "close", h: [1.10, 1.05], a: [1.05, 1.05], res: [1, 1] },
  { bucket: "close", h: [1.05, 0.95], a: [1.05, 0.95], res: [1, 1] },
  { bucket: "close", h: [1.05, 1.10], a: [1.00, 1.05], res: [2, 1] },
  { bucket: "close", h: [0.95, 0.95], a: [0.95, 0.95], res: [0, 0] },
  { bucket: "close", h: [1.10, 1.00], a: [1.05, 1.00], res: [0, 2] },

  // Ergebnisse bewusst NICHT alle identisch zum fixen DOG_TIP (1:2) — sonst
  // bekäme die Außenseiter-Strategie einen künstlich hohen Trefferanteil in
  // diesem Bucket, während die Favorit-Strategie im chalk-Bucket (oben) über
  // viele verschiedene Endstände realistisch nur ~35% exakt trifft. Gleicher
  // Maßstab für beide Strategien = fairer Vergleich.
  { bucket: "upset", h: [1.55, 0.70], a: [0.80, 1.20], res: [1, 2] },
  { bucket: "upset", h: [1.45, 0.75], a: [0.85, 1.25], res: [0, 1] },
  { bucket: "upset", h: [1.50, 0.80], a: [0.90, 1.00], res: [1, 3] },
];

function buildMatches() {
  return FIXTURES.map((f, i) => ({
    bucket: f.bucket,
    actual: { home: f.res[0], away: f.res[1] },
    snap: generateMatchOdds({
      matchId: `bal-${i}`, home: "Favorit", away: "Außenseiter", kickoff: "2026-01-01T15:30:00Z",
      seed: `bal-seed-${i}`, homeAttack: f.h[0], homeDefense: f.h[1], awayAttack: f.a[0], awayDefense: f.a[1],
    }),
  }));
}

// Reine Berechnung, keine Ausgabe — testbar. Läuft die zwei festen Strategien
// (Favorit brav vs. Außenseiter mutig) über den festen Datensatz mit dem
// übergebenen Regelwerk und bricht das Ergebnis nach Bucket auf.
export function runBalanceCheck(rules = DEFAULT_RULES) {
  const matches = buildMatches();
  const sums = {
    chalk: { fav: 0, dog: 0, n: 0 },
    close: { fav: 0, dog: 0, n: 0 },
    upset: { fav: 0, dog: 0, n: 0 },
  };
  const favExactChalk = [];
  const dogExactUpset = [];

  for (const m of matches) {
    const fav = scoreTip(FAV_TIP, m.actual, m.snap, rules).total;
    const dog = scoreTip(DOG_TIP, m.actual, m.snap, rules).total;
    const b = sums[m.bucket];
    b.fav += fav; b.dog += dog; b.n += 1;
    if (m.bucket === "chalk" && m.actual.home === 2 && m.actual.away === 0) favExactChalk.push(fav);
    if (m.bucket === "upset" && m.actual.home === 1 && m.actual.away === 2) dogExactUpset.push(dog);
  }

  const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  const total = (side) => sums.chalk[side] + sums.close[side] + sums.upset[side];

  return {
    totalFav: total("fav"),
    totalDog: total("dog"),
    byBucket: sums,
    avgFavExactChalk: avg(favExactChalk),
    avgDogExactUpset: avg(dogExactUpset),
    upsetShare: sums.upset.n / matches.length,
  };
}

// Regelwerk-Varianten zum Durchrechnen — k ist der "Underdog-Regler"
// (Steilheit der Ergebnis-Nähe): niedriger = Fast-Treffer zahlen noch relativ
// viel, höher = nur Exakt zählt wirklich etwas.
export const RULE_VARIANTS = {
  Standard: DEFAULT_RULES,
  Mutig: { ...DEFAULT_RULES, k: 0.4, combo: { ...DEFAULT_RULES.combo, exakt: 3.0 } },
  Streng: { ...DEFAULT_RULES, k: 1.3, wrongPenalty: -1 },
};

// Demo-Ausgabe für die Konsole (wie demo() in engine.js) — kein Teil der
// App-Laufzeit, nur zum manuellen Durchrechnen/Vergleichen von Regelwerken.
export function printBalanceReport() {
  console.log(`Testdatensatz: 25 Spiele — 17 chalk, 5 close, 3 upset (12% Ausreißer)\n`);
  for (const [name, rules] of Object.entries(RULE_VARIANTS)) {
    const r = runBalanceCheck(rules);
    console.log(`── ${name} ──`);
    console.log(`  Saison gesamt:  Favorit-Tipper ${Math.round(r.totalFav)}  vs.  Außenseiter-Tipper ${Math.round(r.totalDog)}`);
    console.log(`  Ø je Bucket (Favorit / Außenseiter):`);
    for (const b of ["chalk", "close", "upset"]) {
      const s = r.byBucket[b];
      console.log(`    ${b.padEnd(6)}  ${(s.fav / s.n).toFixed(1).padStart(7)}  /  ${(s.dog / s.n).toFixed(1).padStart(7)}   (n=${s.n})`);
    }
    console.log(`  Korrekter Favorit-Exakttreffer (chalk):    Ø ${r.avgFavExactChalk?.toFixed(1)}`);
    console.log(`  Korrekter Außenseiter-Exakttreffer (upset): Ø ${r.avgDogExactUpset?.toFixed(1)}`);
    console.log("");
  }
}
