// ============================================================
//  REGELWERK-VORSCHAU — „so wirken deine Einstellungen".
//  Rechnet für ein paar typische Spielarten (Favorit dominant,
//  enges Spiel, Torfestival, Außenseiter-Sieg, Remis) durch, was
//  verschiedene NAHE Tipps mit dem aktuellen Regelwerk zahlen —
//  damit der Admin live sieht, wie k / Underdog-Boost & Co. die
//  Spielarten im Kontrast zueinander belohnen.
//  Reine Berechnung (kein UI), Snapshots deterministisch aus dem
//  Quoten-Generator, Scoring über die Engine. Wie balanceCheck.js,
//  nur fürs Live-Feedback in der Spielerstellung.
// ============================================================

import { generateMatchOdds } from "./oddsGenerator";
import { scoreTip, maxJokerFactor, DEFAULT_RULES, RULE_LIMITS } from "./engine";

// Jede Spielart: Team-Stärken (für den Generator), ein plausibles REALES
// Ergebnis (Anker der Wertung) und 2–3 nahe Tipps zum Vergleich.
// tip.kind nur als kurzes Label („exakt" / „nah" / „mutig" …).
const ARCHETYPES = [
  {
    key: "favorit", label: "Favorit dominant", hint: "Klarer Favorit, souveräner Sieg",
    strengths: { homeAttack: 1.85, homeDefense: 0.60, awayAttack: 0.70, awayDefense: 1.35 },
    real: { home: 3, away: 0 },
    tips: [
      { kind: "exakt",  tip: { home: 3, away: 0 } },
      { kind: "nah",    tip: { home: 2, away: 0 } },
      { kind: "mutig",  tip: { home: 4, away: 1 } },
    ],
  },
  {
    key: "wenig-tore", label: "Enges 1:0", hint: "Wenig Tore, knapper Ausgang",
    strengths: { homeAttack: 1.0, homeDefense: 0.9, awayAttack: 1.0, awayDefense: 0.9 },
    real: { home: 1, away: 0 },
    tips: [
      { kind: "exakt",  tip: { home: 1, away: 0 } },
      { kind: "remis",  tip: { home: 0, away: 0 } },
      { kind: "höher",  tip: { home: 2, away: 0 } },
    ],
  },
  {
    key: "torfestival", label: "Torfestival", hint: "Zwei Offensivteams, viele Tore",
    strengths: { homeAttack: 1.6, homeDefense: 1.1, awayAttack: 1.5, awayDefense: 1.1 },
    real: { home: 3, away: 2 },
    tips: [
      { kind: "exakt",  tip: { home: 3, away: 2 } },
      { kind: "nah",    tip: { home: 2, away: 1 } },
      { kind: "mutig",  tip: { home: 4, away: 2 } },
    ],
  },
  {
    key: "aussenseiter", label: "Außenseiter siegt", hint: "Der Favorit verliert überraschend",
    strengths: { homeAttack: 1.5, homeDefense: 0.7, awayAttack: 0.85, awayDefense: 1.25 },
    real: { home: 1, away: 2 },
    tips: [
      { kind: "Favorit", tip: { home: 2, away: 0 } },
      { kind: "exakt",   tip: { home: 1, away: 2 } },
      { kind: "Remis",   tip: { home: 1, away: 1 } },
    ],
  },
  {
    key: "remis", label: "Remis-Kandidat", hint: "Ausgeglichen, endet unentschieden",
    strengths: { homeAttack: 1.05, homeDefense: 0.95, awayAttack: 1.05, awayDefense: 0.95 },
    real: { home: 1, away: 1 },
    tips: [
      { kind: "exakt",  tip: { home: 1, away: 1 } },
      { kind: "Sieg",   tip: { home: 2, away: 1 } },
      { kind: "nah",    tip: { home: 0, away: 0 } },
    ],
  },
];

// Snapshots einmal bauen (reine Funktion, kein I/O) und cachen — sie hängen
// nur von den Stärken ab, nicht vom Regelwerk.
let _snaps = null;
function snapshots() {
  if (_snaps) return _snaps;
  _snaps = ARCHETYPES.map((a) => ({
    ...a,
    snap: generateMatchOdds({
      matchId: `preview-${a.key}`, home: "Favorit", away: "Außenseiter",
      kickoff: "2026-01-01T15:30:00Z", seed: `preview-${a.key}`, ...a.strengths,
    }),
  }));
  return _snaps;
}

// Die Spielart-Snapshots nach außen — EINE Quelle dafür, „wie sieht ein
// typisches Spiel aus". Der Balance-Simulator baut darauf auf, statt eigene
// Archetypen zu duplizieren.
export function archetypeSnapshots() {
  return snapshots();
}

// Für ein Regelwerk: je Spielart die nahen Tipps mit ihren angezeigten Punkten,
// plus die Sieger-Quote des realen Ausgangs (macht den Underdog-Boost greifbar).
export function previewArchetypes(rules) {
  // Höchstes verfügbares Gewicht — damit die Vorschau die Spitzenwirkung des
  // Jokers zeigt („was, wenn ich AUSGERECHNET dieses Spiel hochgewichte?").
  const jokerMax = maxJokerFactor(rules);
  return snapshots().map((a) => {
    const sgn = a.real.home > a.real.away ? "home" : a.real.home < a.real.away ? "away" : "draw";
    const winnerQuote = a.snap.winner[sgn];
    const tips = a.tips.map((t) => {
      const basis = { ...t.tip, goals: { home: [], away: [] } };
      return {
        kind: t.kind,
        tip: t.tip,
        points: scoreTip(basis, a.real, a.snap, rules).total,
        // null = Joker im Regelwerk aus (die UI blendet die Spalte dann aus).
        pointsJoker: jokerMax > 1
          ? scoreTip({ ...basis, joker: true, gewicht: jokerMax }, a.real, a.snap, rules).total
          : null,
      };
    });
    // Höchster Tipp der Spielart, damit die UI den Spitzenwert hervorheben kann.
    const best = Math.max(...tips.map((t) => t.points));
    return {
      key: a.key, label: a.label, hint: a.hint,
      real: a.real, winnerQuote: +winnerQuote.toFixed(1), tips, best,
      jokerFaktorMax: jokerMax,
    };
  });
}

// Empfohlene Anzeige-Skalierung: so gewählt, dass ein exakter Tipp im Schnitt
// über alle Spielarten ungefähr `ziel` Punkte zeigt — der höchste Joker-Faktor
// eingerechnet, damit die Spitzenwerte nicht aus dem angenehmen Bereich laufen.
// (Schaltet der Admin also 2× ein, sinkt die Empfehlung etwa auf die Hälfte.)
// Reine Empfehlung für die UI — Fairness und Rang bleiben davon unberührt,
// displayScale skaliert nur die Anzeige.
export function recommendedDisplayScale(rules, ziel = 500) {
  const L = RULE_LIMITS.displayScale;
  const roh = snapshots()
    .map((a) => {
      const exakt = a.tips.find((t) => t.kind === "exakt") || a.tips[0];
      // Roh rechnen: ohne Skalierung und ohne Deckel, sonst misst man sich selbst.
      return scoreTip({ ...exakt.tip, goals: { home: [], away: [] } }, a.real, a.snap,
        { ...rules, displayScale: 1, perGameCap: null }).raw;
    })
    .filter((v) => v > 0);
  if (!roh.length) return DEFAULT_RULES.displayScale;
  const schnitt = roh.reduce((s, v) => s + v, 0) / roh.length;
  const spitze = schnitt * maxJokerFactor(rules);
  return Math.min(L.max, Math.max(L.min, Math.round(ziel / spitze)));
}
