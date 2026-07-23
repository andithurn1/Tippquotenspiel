// ============================================================
//  TIPPSPIEL – ENGINE ("das Gehirn")  ·  v2
//  Reine Logik, kein UI. Eine Quelle für Tippabgabe,
//  Abrechnung und Auszahlungs-Explorer.
// ============================================================


// ── 1) QUOTEN-QUELLE (austauschbar: Mock → später echte API) ─
export function createMockOddsSource() {
  const snap = {
    matchId: "JOR-ESP", home: "Jordanien", away: "Spanien",
    kickoff: "2026-06-20T18:45:00Z",             // Anpfiff (UTC)
    frozenAt: "2026-06-20T18:00:00Z",            // Snapshot: gilt bis Anpfiff
    winner: { home: 9.0, draw: 6.5, away: 1.28 },
    margin: { home: [0, 7, 14, 28, 70, 180], away: [0, 2.6, 4.0, 7, 15, 38] },
    correctScore: [
      [ 11,  6.5,  6.0,  8.0,  15,  34],
      [  9,  7.5,  8.5,   13,  26,  60],
      [ 15,   12,   16,   26,  55, 130],
      [ 30,   21,   34,   60, 140, 320],
      [ 70,   41,   80,  150, 340, 700],
      [160,   96,  180,  340, 750,1500],
    ],
    teamGoals: { home: [2.1, 3.0, 6.0, 11, 24, 55], away: [4.5, 3.0, 3.4, 5.5, 10, 22] },
    players: {
      home: { "Al-Naimat": { anytime: 3.2, double: 11 }, "Olwan": { anytime: 4.1, double: 15 },
        "Al-Tamari": { anytime: 3.6, double: 13 }, "Al-Rashdan": { anytime: 5.5, double: 21 }, "Haddad": { anytime: 7.0, double: 30 } },
      away: { "Yamal": { anytime: 1.9, double: 5.5 }, "Oyarzabal": { anytime: 2.6, double: 8.0 },
        "Merino": { anytime: 3.4, double: 12 }, "Williams": { anytime: 3.0, double: 10 }, "Olmo": { anytime: 3.8, double: 14 } },
    },
    startingXI: ["Al-Naimat", "Olwan", "Yamal", "Oyarzabal", "Merino", "Williams"],
  };
  return {
    getSnapshot: (id) => (id === "JOR-ESP" ? snap : null),
    getResult: (id) => (id === "JOR-ESP"
      ? { home: 5, away: 1, playerGoals: { "Al-Naimat": 2, "Yamal": 1 } } : null),
  };
}


// ── 2) REGELWERK (Admin bei Spielerstellung · per Code teilbar) ─
export const DEFAULT_RULES = {
  name: "Standard",
  k: 0.7,              // Steilheit Ergebnis-Nähe (Underdog-Regler)
  m: 0.5,              // Steilheit Team-Tore-Nähe
  minPayout: 1.0,      // Cutoff: Nähe-Boni darunter zählen nicht
  winnerFloor: true,
  wrongPenalty: 0,     // Minus bei komplett falsch (opt-in, z.B. -1)
  combo: { tendenz: 1.15, abstand: 1.5, exakt: 2.3 },
  displayScale: 15,    // roh × 15 → schöne hohe Zahlen (Fairness/Rang unberührt)
  perGameCap: null,    // optionaler harter Deckel pro Spiel (z.B. 1000), null = offen
  markets: { result: true, goals: { enabled: true, picksPerTeam: 2, allowDouble: true, allowBackups: true } },
  oddsMode: "snapshot",
  // Underdog-Boost: zusätzlicher Multiplikator auf den Ergebnis-Teil, wenn das
  // REALE Ergebnis ein Außenseiter-Sieg war (Sieger-Quote als Maßstab). Boost=1
  // ist ein neutrales No-op (Standard) — die Quote selbst belohnt Außenseiter
  // schon von sich aus, das hier ist ein zusätzlicher, expliziter Admin-Regler.
  // Fließender Übergang zwischen Ramp-Start/-Ende statt hartem Cutoff.
  underdogBoost: 1,
  underdogRampStart: 3,
  underdogRampEnd: 8,
};

// Domain-Grenzen der Regler — EINE Quelle für die UI-Slider (Spielerstellung)
// und die Import-Sanitisierung. UI liest min/max/step hieraus, statt sie zu duplizieren.
export const RULE_LIMITS = {
  k:            { min: 0.2, max: 1.6,  step: 0.05 },
  m:            { min: 0.2, max: 1.6,  step: 0.05 },
  minPayout:    { min: 0,   max: 5,    step: 0.5  },
  wrongPenalty: { min: -5,  max: 0,    step: 0.5  },
  displayScale: { min: 1,   max: 50,   step: 1    },
  perGameCap:   { min: 50,  max: 5000, step: 50   },
  combo: {
    tendenz: { min: 1, max: 2, step: 0.05 },
    abstand: { min: 1, max: 3, step: 0.05 },
    exakt:   { min: 1, max: 4, step: 0.1  },
  },
  picksPerTeam: { min: 1, max: 3, step: 1 },
  underdogBoost:     { min: 1,   max: 3,  step: 0.1 },
  underdogRampStart: { min: 1.2, max: 15, step: 0.1 },
  underdogRampEnd:   { min: 2,   max: 30, step: 0.5 },
};

// Nimmt ein (evtl. aus einem Creator-Code importiertes) Teil-Regelwerk und macht
// daraus ein vollständiges, gültiges Regelwerk: fehlende Felder aus DEFAULT_RULES,
// Zahlen auf die RULE_LIMITS beschnitten, Fremdschlüssel verworfen.
export function sanitizeRules(partial = {}) {
  const L = RULE_LIMITS;
  const src = partial && typeof partial === "object" ? partial : {};
  const c = src.combo || {};
  const mk = src.markets || {};
  const g = mk.goals || {};
  const num = (v, d) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : d;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(+v)) return +v;
    return d;   // null, undefined, "", Booleans, Unsinn → Default
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const D = DEFAULT_RULES;
  return {
    name: (typeof src.name === "string" && src.name.trim()) ? src.name.trim().slice(0, 40) : D.name,
    k: clamp(num(src.k, D.k), L.k.min, L.k.max),
    m: clamp(num(src.m, D.m), L.m.min, L.m.max),
    minPayout: clamp(num(src.minPayout, D.minPayout), L.minPayout.min, L.minPayout.max),
    winnerFloor: src.winnerFloor !== false,
    wrongPenalty: clamp(num(src.wrongPenalty, D.wrongPenalty), L.wrongPenalty.min, L.wrongPenalty.max),
    combo: {
      tendenz: clamp(num(c.tendenz, D.combo.tendenz), L.combo.tendenz.min, L.combo.tendenz.max),
      abstand: clamp(num(c.abstand, D.combo.abstand), L.combo.abstand.min, L.combo.abstand.max),
      exakt:   clamp(num(c.exakt,   D.combo.exakt),   L.combo.exakt.min,   L.combo.exakt.max),
    },
    displayScale: clamp(num(src.displayScale, D.displayScale), L.displayScale.min, L.displayScale.max),
    perGameCap: src.perGameCap == null ? null : clamp(num(src.perGameCap, 0), L.perGameCap.min, L.perGameCap.max),
    markets: {
      result: mk.result !== false,
      goals: {
        enabled: g.enabled !== false,
        picksPerTeam: clamp(Math.round(num(g.picksPerTeam, D.markets.goals.picksPerTeam)), L.picksPerTeam.min, L.picksPerTeam.max),
        allowDouble: g.allowDouble !== false,
        allowBackups: g.allowBackups !== false,
      },
    },
    oddsMode: src.oddsMode === "average" ? "average" : "snapshot",
    underdogBoost: clamp(num(src.underdogBoost, D.underdogBoost), L.underdogBoost.min, L.underdogBoost.max),
    underdogRampStart: clamp(num(src.underdogRampStart, D.underdogRampStart), L.underdogRampStart.min, L.underdogRampStart.max),
    underdogRampEnd: clamp(num(src.underdogRampEnd, D.underdogRampEnd), L.underdogRampEnd.min, L.underdogRampEnd.max),
  };
}


// ── 3) SCORING ──────────────────────────────────────────────
const sgn = (h, a) => (h > a ? 1 : h < a ? -1 : 0);

// Underdog-Boost: Multiplikator auf den Ergebnis-Teil, wenn das REALE Ergebnis
// (nicht der Tipp!) ein Außenseiter-Ausgang war — gemessen an dessen Sieger-
// Quote. Fließender Übergang zwischen rampStart/-Ende statt hartem Cutoff;
// unterhalb rampStart bleibt der Multiplikator 1 (kein Effekt). boost=1 ist
// per Default ein reines No-op, unabhängig von den Ramp-Werten.
function underdogMultiplier(actual, snap, rules) {
  const boost = rules.underdogBoost ?? 1;
  if (boost === 1) return 1;
  const winnerQuote = sgn(actual.home, actual.away) === 1 ? snap.winner.home
    : sgn(actual.home, actual.away) === -1 ? snap.winner.away : snap.winner.draw;
  const start = rules.underdogRampStart ?? Infinity;
  const end = rules.underdogRampEnd ?? Infinity;
  if (winnerQuote == null || !(end > start)) return 1;
  const t = Math.min(1, Math.max(0, (winnerQuote - start) / (end - start)));
  return 1 + (boost - 1) * t;
}

// Ergebnis-Tipp → Ebenen, Maximum gewinnt. Team-Tore-Nähe ist siegerunabhängig.
export function scoreResult(tip, actual, snap, rules = DEFAULT_RULES) {
  const dist = Math.abs(tip.home - actual.home) + Math.abs(tip.away - actual.away);
  const winnerRight = sgn(tip.home, tip.away) === sgn(actual.home, actual.away);
  const marginRight = winnerRight && Math.abs(tip.home - tip.away) === Math.abs(actual.home - actual.away);

  const tendBoden = winnerRight && rules.winnerFloor
    ? (sgn(actual.home, actual.away) === 1 ? snap.winner.home
      : sgn(actual.home, actual.away) === -1 ? snap.winner.away : snap.winner.draw) - 1 : 0;
  // Alle Quoten-Zugriffe gegen Ergebnisse außerhalb des Rasters (z. B. 6+ Tore,
  // seltene Endstände) absichern — fehlt eine Quote, zahlt der Teil 0.
  const marginArr = sgn(actual.home, actual.away) === 1 ? snap.margin.home : snap.margin.away;
  const marginRaw = marginArr[Math.abs(actual.home - actual.away)];
  const abstand = marginRight && marginRaw != null ? marginRaw - 1 : 0;
  const csRaw = snap.correctScore?.[actual.home]?.[actual.away];
  const ergNaehe = csRaw != null ? Math.exp(-rules.k * dist) * csRaw : 0;
  const teamTore =
      Math.exp(-rules.m * Math.abs(tip.home - actual.home)) * (snap.teamGoals.home[actual.home] ?? 0)
    + Math.exp(-rules.m * Math.abs(tip.away - actual.away)) * (snap.teamGoals.away[actual.away] ?? 0);

  let nearParts = Math.max(ergNaehe, teamTore);
  if (nearParts < rules.minPayout) nearParts = 0;

  let resultPart = Math.max(tendBoden, abstand, nearParts);
  let underdogMult = 1;
  if (!winnerRight && resultPart === 0) {
    resultPart = rules.wrongPenalty;
  } else if (resultPart > 0) {
    underdogMult = underdogMultiplier(actual, snap, rules);
    resultPart *= underdogMult;
  }

  const ebene = dist === 0 ? "exakt" : marginRight ? "abstand" : winnerRight ? "tendenz" : "keiner";
  return { resultPart, ebene, dist, winnerRight, underdogMult, parts: { tendBoden, abstand, ergNaehe, teamTore } };
}

// Tore: gleicher Spieler 2× = Doppelpack. 2 Tore → double, 1 Tor → anytime (Floor), 0 → nichts.
export function scoreGoals(picks, snap, rules = DEFAULT_RULES, playerGoals = null) {
  let net = 0; const detail = [];
  for (const side of ["home", "away"]) {
    const counts = {};
    for (const p of picks[side] || []) if (p) counts[p] = (counts[p] || 0) + 1;
    for (const [p, c] of Object.entries(counts)) {
      const P = snap.players[side][p]; if (!P) continue;
      const scored = playerGoals ? (playerGoals[p] || 0) : null;   // null = "angenommen es trifft"
      if (c >= 2) {
        const goals2 = scored == null ? 2 : scored;                // Auswertung: echte Toranzahl
        const q = goals2 >= 2 ? P.double : goals2 === 1 ? P.anytime : 1;
        if (goals2 >= 1) net += q - 1;
        detail.push({ side, player: p, type: "double", single: P.anytime, double: P.double, scored });
      } else {
        const hit = scored == null ? true : scored >= 1;
        if (hit) net += P.anytime - 1;
        detail.push({ side, player: p, type: "single", anytime: P.anytime, scored });
      }
    }
  }
  return { net, detail };
}

// Anzeige-Skalierung: intern wird roh gerechnet, erst hier hochskaliert.
export function toDisplay(raw, rules = DEFAULT_RULES) {
  let v = raw * (rules.displayScale ?? 1);
  if (rules.perGameCap != null) v = Math.min(v, rules.perGameCap);
  return Math.round(v);
}

// Kombi-Regel: Tor-Gewinne verstärken das Ergebnis nur bei richtiger Tendenz.
export function applyCombo(resultPart, ebene, goalsNet, rules = DEFAULT_RULES) {
  if (goalsNet <= 0) return resultPart;
  return ebene === "keiner" ? resultPart + goalsNet : (resultPart + goalsNet) * rules.combo[ebene];
}

// Gesamtwertung eines Tipps inkl. Kombi-Multiplikator.
export function scoreTip(tip, actual, snap, rules = DEFAULT_RULES) {
  const res = scoreResult(tip, actual, snap, rules);
  const goals = scoreGoals(tip.goals || { home: [], away: [] }, snap, rules, actual.playerGoals);
  const raw = applyCombo(res.resultPart, res.ebene, goals.net, rules);
  return { total: toDisplay(raw, rules), raw: +raw.toFixed(1), ...res, goals };
}


// Vorschau beim Tippen: was BRINGT der Tipp, wenn er exakt so eintrifft?
// Anker ist hier bewusst das GETIPPTE Ergebnis — reine Aussicht, nicht die
// echte Wertung (die ankert immer am realen Ergebnis). playerGoals=null heißt
// „angenommen, die getippten Schützen treffen". Nur Anzeige, nie Fairness.
export function projectTip(tip, snap, rules = DEFAULT_RULES) {
  const actual = { home: tip.home, away: tip.away, playerGoals: null };
  const s = scoreTip(tip, actual, snap, rules);
  return {
    points: s.total,                                        // mögliche Punkte (Display-Skala)
    exaktQuote: snap.correctScore?.[tip.home]?.[tip.away] ?? null,
    goalsNet: s.goals.net,                                  // roher Tor-Beitrag
    ergNaehe: s.parts.ergNaehe,                             // roher Ergebnis-Nähe-Anteil
    combo: rules.combo.exakt,
  };
}

// Leaderboard: aggregiert die angezeigten Punkte je Nutzer über mehrere Tipps.
// entries: [{ userId, name, tip, snapshot, result, rules? }]. Tipps ohne Ergebnis
// (Match noch nicht ausgewertet) zählen 0. Rückgabe absteigend sortiert mit Rang.
export function scoreLeaderboard(entries = [], rules = DEFAULT_RULES) {
  const byUser = new Map();
  for (const e of entries) {
    const cur = byUser.get(e.userId) || { userId: e.userId, name: e.name, total: 0, tips: 0, gewertet: 0 };
    cur.tips += 1;
    if (e.result) {
      cur.total += scoreTip(e.tip, e.result, e.snapshot, e.rules || rules).total;
      cur.gewertet += 1;
    }
    byUser.set(e.userId, cur);
  }
  return [...byUser.values()]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

// Ranking-Verlauf: wie scoreLeaderboard, aber je Spieltag ein kumulatives Zwischenstand-
// Ranking (Spieltag N = alle Tipps mit matchday <= N). entries brauchen zusätzlich
// `matchday`. Kein neuer Scoring-Code — ruft scoreLeaderboard je Cutoff wieder auf.
export function scoreLeaderboardHistory(entries = [], rules = DEFAULT_RULES) {
  const matchdays = [...new Set(entries.map((e) => e.matchday).filter((m) => m != null))].sort((a, b) => a - b);
  return matchdays.map((matchday) => ({
    matchday,
    board: scoreLeaderboard(entries.filter((e) => e.matchday <= matchday), rules),
  }));
}


// ── 4) CREATOR-CODES (Modi teilen & anpassen) ───────────────
export function encodePreset(rules) {
  const j = JSON.stringify(rules);
  const b64 = typeof btoa !== "undefined" ? btoa(unescape(encodeURIComponent(j))) : Buffer.from(j, "utf8").toString("base64");
  return "TS1-" + b64.replace(/=+$/, "");
}
export function decodePreset(code) {
  if (!code?.startsWith("TS1-")) throw new Error("Ungültiger Creator-Code");
  const b = code.slice(4);
  const j = typeof atob !== "undefined" ? decodeURIComponent(escape(atob(b))) : Buffer.from(b, "base64").toString("utf8");
  return JSON.parse(j);
}


// ── 5) DEMO ─────────────────────────────────────────────────
export function demo() {
  const odds = createMockOddsSource();
  const snap = odds.getSnapshot("JOR-ESP");
  const result = odds.getResult("JOR-ESP");   // real 5:1, Al-Naimat 2, Yamal 1
  const S = DEFAULT_RULES.displayScale;

  const tipp = { home: 4, away: 1, goals: { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal", ""] } };
  const r = scoreTip(tipp, result, snap);
  console.log("Voll-Tipp 4:1 + Al-Naimat-Doppelpack + Yamal → real 5:1:");
  console.log(`  roh ${r.raw}  →  angezeigt ${r.total} Punkte  (Ebene: ${r.ebene})`);
  console.log("  Aufschlüsselung (skaliert):",
    `Nähebonus ${Math.round(r.parts.ergNaehe * S)} · Tore +${Math.round(r.goals.net * S)} · Kombi ×${DEFAULT_RULES.combo[r.ebene]}`);

  console.log("\nSkalen-Gefühl (angezeigte Punkte):");
  for (const [h, a] of [[2, 1], [4, 1], [5, 1]]) {
    const t = scoreTip({ home: h, away: a, goals: { home: [], away: [] } }, result, snap);
    console.log(`  Tipp ${h}:${a} (nur Ergebnis) → ${t.total}`);
  }

  const code = encodePreset({ ...DEFAULT_RULES, name: "Hardcore", k: 1.1 });
  console.log("\nCreator-Code:", code.slice(0, 24) + "…", "→", decodePreset(code).name);
}
