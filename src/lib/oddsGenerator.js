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

const GOAL_GRID = 6;           // Raster 0..5 Tore, wie im JOR-ESP-Vorbild
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

// Quote aus Wahrscheinlichkeit + Buchmacher-Marge (overround); nach unten auf
// 1.01 begrenzt, nach oben gedeckelt (reale Buchmacher gehen selten höher).
function oddsFrom(p, overround, cap = 1000) {
  if (!(p > 0)) return cap;
  return Math.min(cap, Math.max(1.01, +(1 / (p * overround)).toFixed(2)));
}

// Erwartete Tore je Team aus Angriff/Abwehr-Stärke (1.0 = Liga-Durchschnitt).
export function expectedGoals({ homeAttack, homeDefense, awayAttack, awayDefense }) {
  return {
    home: LEAGUE_AVG_GOALS * homeAttack * awayDefense * HOME_ADVANTAGE,
    away: LEAGUE_AVG_GOALS * awayAttack * homeDefense,
  };
}

// Namens-Pool für den Torschützen-Markt: bewusst FIKTIVE Spielernamen (keine
// echten Kader — die wechseln zu schnell, um sie verlässlich zu pflegen).
// Deterministisch aus dem Seed gezogen, damit Tests reproduzierbar bleiben.
const FIRST_NAMES = ["Finn", "Luca", "Noah", "Elias", "Jonas", "Milan", "Theo", "Bent", "Aras", "Kofi", "Enzo", "Iker"];
const LAST_NAMES = ["Brandt", "Kessler", "Vural", "Adeyemi", "Nowak", "Sörensen", "Baumann", "Yıldız", "Costa", "Marek", "Lindgren", "Okafor"];

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

// 5 Angriffsspieler je Team, jeder trägt einen Anteil an der Team-Tor-Erwartung.
const SCORER_SHARES = [0.30, 0.22, 0.18, 0.12, 0.09];

function makeSquad(rng, teamLambda, cap) {
  const used = new Set();
  const squad = {};
  for (const share of SCORER_SHARES) {
    let name;
    do { name = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`; } while (used.has(name));
    used.add(name);
    const playerLambda = teamLambda * share;
    const pAnytime = 1 - Math.exp(-playerLambda);
    const pDouble = Math.max(1 - Math.exp(-playerLambda) - playerLambda * Math.exp(-playerLambda), 0.0005);
    squad[name] = { anytime: oddsFrom(pAnytime, 1.15, cap), double: oddsFrom(pDouble, 1.15, cap) };
  }
  return squad;
}

// Haupt-Erzeugungsfunktion: ein vollständiger Match-Snapshot. `cap` deckelt
// alle Quoten (Standard 200 — reale Buchmacher gehen bei Correct-Score/Torschützen-
// Außenseitern selten höher; ein zu hoher Deckel lässt seltene Ereignisse auch bei
// bloßer NÄHE unrealistisch viele Punkte zahlen, siehe balanceCheck.js).
export function generateMatchOdds({
  matchId, home, away, kickoff, seed = matchId,
  homeAttack, homeDefense, awayAttack, awayDefense,
  overround = 1.07, cap = 200,
}) {
  const { home: lamH, away: lamA } = expectedGoals({ homeAttack, homeDefense, awayAttack, awayDefense });
  const rng = rngFromSeed(seed);

  const pHome = []; const pAway = [];
  for (let i = 0; i < GOAL_GRID; i++) { pHome.push(poissonPmf(lamH, i)); pAway.push(poissonPmf(lamA, i)); }
  const correctScore = pHome.map((ph) => pAway.map((pa) => oddsFrom(ph * pa, overround, cap)));

  // Sieger + Abstand: über ein größeres Raster summieren (Wahrscheinlichkeits-
  // masse jenseits von GOAL_GRID fließt in Sieger/Remis mit ein).
  const TAIL = 12;
  let pH = 0, pD = 0, pA = 0;
  const marginHomeP = Array(GOAL_GRID).fill(0);
  const marginAwayP = Array(GOAL_GRID).fill(0);
  for (let h = 0; h < TAIL; h++) {
    for (let a = 0; a < TAIL; a++) {
      const p = poissonPmf(lamH, h) * poissonPmf(lamA, a);
      if (h > a) { pH += p; if (h - a < GOAL_GRID) marginHomeP[h - a] += p; }
      else if (h < a) { pA += p; if (a - h < GOAL_GRID) marginAwayP[a - h] += p; }
      else pD += p;
    }
  }

  return {
    matchId, home, away, kickoff,
    frozenAt: new Date(new Date(kickoff).getTime() - 45 * 60 * 1000).toISOString(),
    winner: { home: oddsFrom(pH, overround, cap), draw: oddsFrom(pD, overround, cap), away: oddsFrom(pA, overround, cap) },
    margin: {
      home: marginHomeP.map((p, i) => (i === 0 ? 0 : oddsFrom(p, overround, cap))),
      away: marginAwayP.map((p, i) => (i === 0 ? 0 : oddsFrom(p, overround, cap))),
    },
    correctScore,
    teamGoals: { home: pHome.map((p) => oddsFrom(p, overround, cap)), away: pAway.map((p) => oddsFrom(p, overround, cap)) },
    players: { home: makeSquad(rng, lamH, cap), away: makeSquad(rng, lamA, cap) },
  };
}

// Ergebnis-Simulation: zieht einen plausiblen Endstand aus demselben Poisson-
// Modell (für Demo-/Testzwecke — nie fairness-relevant, das bleibt Anker am
// realen Ergebnis in der Engine).
export function simulateResult(snap, { homeAttack, homeDefense, awayAttack, awayDefense }, seed = `${snap.matchId}-result`) {
  const { home: lamH, away: lamA } = expectedGoals({ homeAttack, homeDefense, awayAttack, awayDefense });
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
