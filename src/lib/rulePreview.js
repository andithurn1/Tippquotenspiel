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
import { scoreTip } from "./engine";

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

// Für ein Regelwerk: je Spielart die nahen Tipps mit ihren angezeigten Punkten,
// plus die Sieger-Quote des realen Ausgangs (macht den Underdog-Boost greifbar).
export function previewArchetypes(rules) {
  return snapshots().map((a) => {
    const sgn = a.real.home > a.real.away ? "home" : a.real.home < a.real.away ? "away" : "draw";
    const winnerQuote = a.snap.winner[sgn];
    const tips = a.tips.map((t) => ({
      kind: t.kind,
      tip: t.tip,
      points: scoreTip({ ...t.tip, goals: { home: [], away: [] } }, a.real, a.snap, rules).total,
    }));
    // Höchster Tipp der Spielart, damit die UI den Spitzenwert hervorheben kann.
    const best = Math.max(...tips.map((t) => t.points));
    return {
      key: a.key, label: a.label, hint: a.hint,
      real: a.real, winnerQuote: +winnerQuote.toFixed(1), tips, best,
    };
  });
}
