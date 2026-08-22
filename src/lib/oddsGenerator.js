// ============================================================
//  QUOTEN-GENERATOR — deterministisch aus Team-Stärke + Seed.
//  Erzeugt einen vollständigen Match-Snapshot (Sieger, Abstand,
//  Ergebnis-Raster, Team-Tore, Torschützen) aus einem einzigen
//  Poisson-Tormodell, statt jede Zahl von Hand einzutippen. Damit
//  lässt sich Testdaten-Variation (Favorit/Außenseiter, Kantersieg,
//  Remis-Kandidat, …) einfach über Angriffs-/Abwehr-Stärke + Seed
//  erzeugen. Reine Erzeugung, kein UI, keine Engine-Abhängigkeit —
//  die erzeugte Form ist ident zu createMockOddsSource() (engine.js).
// ============================================================

// 🔴 Raster 0..8 Tore je Seite (seit 22.08.2026, vorher 0..5 „wie im
// JOR-ESP-Vorbild").
//
// Gemessen über den Katalog: **1,65 % der Spiele** enden außerhalb von 0–5,
// und dort fiel die ganze Ergebnis-Ebene aus — `scoreResult` findet keine
// Quote und rechnet den Nähe-Teil als 0. Ein exakt getipptes 6:0 zahlte
// dadurch **47** Punkte, ein exakt getipptes 5:1 **1440**: der seltenere
// Treffer war der billigere, und es fiel niemandem auf, weil es aussah wie ein
// schlechter Tipp (design/randquoten.md).
//
// ⚠️ Es kostet fast nichts: 81 statt 36 Zahlen je Snapshot, aus demselben
// Poisson-Fit. Die Grenze bei 8 ist Andis Ansage („9x9") und deckt den
// Katalog vollständig ab — höhere Endstände kommen dort nicht vor.
const GOAL_GRID = 9;           // Raster 0..8 Tore je Seite
const LEAGUE_AVG_GOALS = 1.35; // Bundesliga-typischer Torschnitt je Team/Spiel
const HOME_ADVANTAGE = 1.12;   // Heimvorteil-Faktor auf die Heim-Tor-Erwartung

// ── seeded PRNG (mulberry32), aus einem beliebigen String-Seed ──
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}
export function rngFromSeed(seed) {
  let a = hashSeed(String(seed));
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poissonPmf(lambda, k) {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

// ── Niedrig-Ergebnis-Korrektur (Dixon–Coles) ────────────────
// Zwei unabhängige Poisson-Verteilungen sind für Fußball nachweislich falsch,
// und zwar an einer Stelle, die uns direkt trifft: sie treffen die REMIS-Quote
// nicht. Gemessen an elf echten Bundesliga-Marktquoten (bei realistischem
// Torschnitt 3,1) liefert das unabhängige Modell in ausgeglichenen Spielen
// 2–3,6 Prozentpunkte ZU WENIG Remis und in einseitigen bis zu 2,7 zu viele.
//
// Warum das mehr ist als Statistik-Kosmetik: `fitLambdas` MUSS die
// Marktquoten treffen. Fehlen ihm Remis, kann er sie nur über den TORSCHNITT
// beschaffen — er drückt ihn in ausgeglichenen Spielen auf 2,43 und zieht ihn
// in einseitigen auf 4,14. Damit verbiegt sich das ganze Exakt-Raster, und
// genau daran hängt die Nähe-Wertung (`scoreResult` liest `correctScore`).
//
// Die Korrektur greift nur an den vier niedrigsten Ergebnissen — dort steckt
// die Abhängigkeit. `rho < 0` hebt 0:0 und 1:1 und senkt 1:0 und 0:1.
// Standard ist 0, also AUS: die erzeugten Ligen bleiben dadurch unverändert,
// und ihre Balance ist weiter die vermessene. Eingeschaltet wird sie nur, wo
// echte Marktquoten hereinkommen (`oddsApi.js`).
export function dixonColes(h, a, lamH, lamA, rho = 0) {
  if (!rho) return 1;
  if (h === 0 && a === 0) return 1 - lamH * lamA * rho;
  if (h === 0 && a === 1) return 1 + lamH * rho;
  if (h === 1 && a === 0) return 1 + lamA * rho;
  if (h === 1 && a === 1) return 1 - rho;
  return 1;
}

// Quote aus Wahrscheinlichkeit + Buchmacher-Marge (overround); nach unten auf
// 1.01 begrenzt, nach oben gedeckelt (reale Buchmacher gehen selten höher).
function oddsFrom(p, overround, cap = 1000) {
  if (!(p > 0)) return cap;
  return Math.min(cap, Math.max(1.01, +(1 / (p * overround)).toFixed(2)));
}

// ── Unsicherheit: Stärken Richtung Liga-Mittel ziehen ───────
// Ohne diesen Term stand Bayern gegen Elversberg bei Quote **1.02** und Man
// City gegen Burnley bei 1.05 — real liegen die kürzesten Preise bei 1.10–1.25.
// Der Grund ist nicht die Streuung der Ratings, sondern dass das Poisson-Modell
// sie für BARE MÜNZE nimmt: ein Buchmacher kennt die wahre Tor-Erwartung auch
// nicht genau, und diese Unsicherheit zieht extreme Wahrscheinlichkeiten zur
// Mitte. Genau das leistet Shrinkage — mathematisch das, was ein Bayes-Posterior
// mit einer unsicheren Schätzung macht.
//
// 0.70 ist GEMESSEN, nicht geraten (`scripts`-Lauf über alle Paarungen aller
// fünf Ligen): die extremste Begegnung landet damit bei 1.14, das 1. Perzentil
// bei 1.23. Entscheidend war die zweite Zahl — das 95. Perzentil wandert nur
// von 2.37 auf 2.40. Die Korrektur trifft also die Ausreißer und lässt
// ausgeglichene Spiele in Ruhe; ein stärkerer Wert würde Bayern gegen Paderborn
// zum Münzwurf machen, was in die andere Richtung falsch wäre.
//
// ⚠️ Greift NUR auf generierte Daten. Echte Quoten kommen über `buildSnapshot`
// mit fertigen Tor-Erwartungen herein (`oddsApi.js`) — dort steckt die
// Unsicherheit des Buchmachers schon im Preis, ein zweites Mal zu schrumpfen
// wäre falsch.
export const RATING_SHRINK = 0.70;

const gezogen = (r) => 1 + (r - 1) * RATING_SHRINK;

// Erwartete Tore je Team aus Angriff/Abwehr-Stärke (1.0 = Liga-Durchschnitt).
export function expectedGoals({ homeAttack, homeDefense, awayAttack, awayDefense }) {
  return {
    home: LEAGUE_AVG_GOALS * gezogen(homeAttack) * gezogen(awayDefense) * HOME_ADVANTAGE,
    away: LEAGUE_AVG_GOALS * gezogen(awayAttack) * gezogen(homeDefense),
  };
}

// Namens-Pool für den Torschützen-Markt: bewusst FIKTIVE Spielernamen (keine
// echten Kader — die wechseln zu schnell, um sie verlässlich zu pflegen).
// Deterministisch aus dem Seed gezogen, damit Tests reproduzierbar bleiben.
const FIRST_NAMES = ["Finn", "Luca", "Noah", "Elias", "Jonas", "Milan", "Theo", "Bent", "Aras", "Kofi", "Enzo", "Iker"];
const LAST_NAMES = ["Brandt", "Kessler", "Vural", "Adeyemi", "Nowak", "Sörensen", "Baumann", "Yıldız", "Costa", "Marek", "Lindgren", "Okafor"];

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// 5 Angriffsspieler je Team, jeder trägt einen Anteil an der Team-Tor-Erwartung.
// Exportiert, weil `oddsApi.js` dieselbe Verteilung für ECHTE Namen ohne
// Marktpreis braucht — zwei Kopien liefen sonst auseinander.
export const SCORER_SHARES = [0.30, 0.22, 0.18, 0.12, 0.09];

// Der Kader eines Vereins ist über die SAISON STABIL — er wird deshalb aus dem
// VEREINSNAMEN gezogen, nicht aus dem Spiel. Sonst hieße Bayerns Torjäger an
// jedem Spieltag anders, und „Wer trifft?" wäre sinnlos. Nur die QUOTEN der
// Spieler ändern sich von Spiel zu Spiel (sie hängen an der Tor-Erwartung
// gegen den jeweiligen Gegner).
// Kleiner Cache, damit derselbe Verein nicht 34-mal neu ausgewürfelt wird.
const squadCache = new Map();

// `pool` erlaubt der Daten-Schicht, LANDESTYPISCHE Namen mitzugeben: ein
// „Iker Brandt" in der Premier League reißt einen sofort raus. Ohne Pool bleibt
// es beim Standard — dadurch ändern sich bestehende Daten (Bundesliga, CL)
// nicht. Die Namen sind ERFUNDEN, bewusst: echte Spieler-Kader wären nach
// jedem Transferfenster falsch und würden simulierte Daten wie echte aussehen
// lassen. Die Klubs sind echt, die Kader nicht.
export function squadNames(teamName, pool = null) {
  const key = pool ? `${pool.key}:${teamName}` : teamName;
  if (squadCache.has(key)) return squadCache.get(key);
  const vornamen = pool?.vornamen ?? FIRST_NAMES;
  const nachnamen = pool?.nachnamen ?? LAST_NAMES;
  const rng = rngFromSeed(`squad:${key}`);
  const used = new Set();
  const namen = [];
  for (let i = 0; i < SCORER_SHARES.length; i++) {
    let name;
    do { name = `${pick(rng, vornamen)} ${pick(rng, nachnamen)}`; } while (used.has(name));
    used.add(name);
    namen.push(name);
  }
  squadCache.set(key, namen);
  return namen;
}

function makeSquad(teamName, teamLambda, cap, pool = null) {
  const squad = {};
  squadNames(teamName, pool).forEach((name, i) => {
    const playerLambda = teamLambda * SCORER_SHARES[i];
    const pAnytime = 1 - Math.exp(-playerLambda);
    const pDouble = Math.max(1 - Math.exp(-playerLambda) - playerLambda * Math.exp(-playerLambda), 0.0005);
    squad[name] = { anytime: oddsFrom(pAnytime, 1.15, cap), double: oddsFrom(pDouble, 1.15, cap) };
  });
  return squad;
}

// Haupt-Erzeugungsfunktion: ein vollständiger Match-Snapshot. `cap` deckelt
// alle Quoten (Standard 200 — reale Buchmacher gehen bei Correct-Score/Torschützen-
// Außenseitern selten höher; ein zu hoher Deckel lässt seltene Ereignisse auch bei
// bloßer NÄHE unrealistisch viele Punkte zahlen, siehe balanceCheck.js).
export function generateMatchOdds({
  matchId, home, away, kickoff, seed = matchId,
  homeAttack, homeDefense, awayAttack, awayDefense,
  overround = 1.07, cap = 200, namensPool = null,
}) {
  const { home: lamH, away: lamA } = expectedGoals({ homeAttack, homeDefense, awayAttack, awayDefense });
  return buildSnapshot({ matchId, home, away, kickoff, lamH, lamA, overround, cap, namensPool });
}

// Denselben Snapshot direkt aus TOR-ERWARTUNGEN bauen. Trennt die Frage
// „wie stark sind die Teams?" von „wie sieht ein Snapshot aus?".
// Damit kann eine ECHTE Quoten-API andocken: sie liefert nur 1X2, daraus
// werden die Tor-Erwartungen geschätzt (siehe oddsApi.js), und alles Weitere
// — Ergebnis-Raster, Team-Tore, Torschützen — entsteht konsistent hier.
export function buildSnapshot({
  matchId, home, away, kickoff, lamH, lamA, overround = 1.07, cap = 200, namensPool = null,
  rho = 0,
}) {
  const pHome = []; const pAway = [];
  for (let i = 0; i < GOAL_GRID; i++) { pHome.push(poissonPmf(lamH, i)); pAway.push(poissonPmf(lamA, i)); }
  // Das Raster trägt die Niedrig-Ergebnis-Korrektur; die Rand-Verteilungen
  // (`teamGoals`) bewusst NICHT — dort ist die Abhängigkeit zwischen den Teams
  // gar nicht ausgedrückt, und ein halb korrigierter Rand wäre schlechter als
  // ein unkorrigierter.
  const correctScore = pHome.map((ph, h) =>
    pAway.map((pa, a) => oddsFrom(ph * pa * dixonColes(h, a, lamH, lamA, rho), overround, cap)));

  // Sieger + Abstand: über ein größeres Raster summieren (Wahrscheinlichkeits-
  // masse jenseits von GOAL_GRID fließt in Sieger/Remis mit ein).
  const TAIL = 12;
  let pH = 0, pD = 0, pA = 0;
  const marginHomeP = Array(GOAL_GRID).fill(0);
  const marginAwayP = Array(GOAL_GRID).fill(0);
  for (let h = 0; h < TAIL; h++) {
    for (let a = 0; a < TAIL; a++) {
      const p = poissonPmf(lamH, h) * poissonPmf(lamA, a) * dixonColes(h, a, lamH, lamA, rho);
      if (h > a) { pH += p; if (h - a < GOAL_GRID) marginHomeP[h - a] += p; }
      else if (h < a) { pA += p; if (a - h < GOAL_GRID) marginAwayP[a - h] += p; }
      else pD += p;
    }
  }

  return {
    matchId, home, away, kickoff,
    // Die Tor-Erwartungen wandern MIT. Sie sind die Grundlage des ganzen
    // Rasters, und `simulateResult` braucht genau sie — bei echten Quoten sind
    // es die des Marktes, bei erzeugten die aus den Team-Stärken.
    lamH, lamA,
    frozenAt: new Date(new Date(kickoff).getTime() - 45 * 60 * 1000).toISOString(),
    winner: { home: oddsFrom(pH, overround, cap), draw: oddsFrom(pD, overround, cap), away: oddsFrom(pA, overround, cap) },
    margin: {
      home: marginHomeP.map((p, i) => (i === 0 ? 0 : oddsFrom(p, overround, cap))),
      away: marginAwayP.map((p, i) => (i === 0 ? 0 : oddsFrom(p, overround, cap))),
    },
    correctScore,
    teamGoals: { home: pHome.map((p) => oddsFrom(p, overround, cap)), away: pAway.map((p) => oddsFrom(p, overround, cap)) },
    players: { home: makeSquad(home, lamH, cap, namensPool), away: makeSquad(away, lamA, cap, namensPool) },
  };
}

// Ergebnis-Simulation: zieht einen plausiblen Endstand aus demselben Poisson-
// Modell (für Demo-/Testzwecke — nie fairness-relevant, das bleibt Anker am
// realen Ergebnis in der Engine).
export function simulateResult(snap, { homeAttack, homeDefense, awayAttack, awayDefense } = {}, seed = `${snap.matchId}-result`) {
  // ⚠️ Der Snapshot hat Vorrang vor den Team-Stärken. Sobald ECHTE Marktquoten
  // im Spiel sind, stehen dort die Tor-Erwartungen des Marktes — aus den
  // Ratings gezogen bekäme ein klarer Favorit reihenweise Ergebnisse, die
  // seinen eigenen Quoten widersprechen. Für erzeugte Spiele ändert sich
  // nichts: dort stammen `snap.lamH/lamA` aus genau diesen Stärken.
  const ausSnap = Number.isFinite(snap?.lamH) && Number.isFinite(snap?.lamA);
  const { home: lamH, away: lamA } = ausSnap
    ? { home: snap.lamH, away: snap.lamA }
    : expectedGoals({ homeAttack, homeDefense, awayAttack, awayDefense });
  const rng = rngFromSeed(seed);
  const drawPoisson = (lambda) => {
    const u = rng(); let cum = 0;
    for (let k = 0; k < 14; k++) { cum += poissonPmf(lambda, k); if (u < cum) return k; }
    return 14;
  };
  const home = drawPoisson(lamH);
  const away = drawPoisson(lamA);
  const playerGoals = {};
  const assign = (n, pool) => {
    for (let i = 0; i < n; i++) { const p = pick(rng, pool); playerGoals[p] = (playerGoals[p] || 0) + 1; }
  };
  assign(home, Object.keys(snap.players.home));
  assign(away, Object.keys(snap.players.away));
  return { home, away, playerGoals };
}
