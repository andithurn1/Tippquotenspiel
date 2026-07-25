// ============================================================
//  AUTO-TIPP — wer einen Spieltag verpasst, fliegt nicht raus
//
//  Problem aus der Roadmap: Wer einmal nicht tippt, bekommt null Punkte,
//  verliert den Anschluss und steigt aus. Der Auto-Tipp füllt eine
//  Versäumnis mit einem PLAUSIBLEN Standard-Tipp statt mit nichts.
//
//  Leitplanken (bewusst so, damit es fair bleibt):
//   • Der Auto-Tipp ist das WAHRSCHEINLICHSTE Ergebnis laut Quoten — also
//     der zahmste Tipp, den es gibt. Er zahlt am wenigsten. Wer selbst
//     tippt, ist IMMER besser dran; Nichtstun wird nie belohnt.
//   • Torschützen: die wahrscheinlichsten Schützen (niedrigste anytime-Quote),
//     nie ein Doppelpack — auch hier die risikoärmste Variante.
//   • Kein Joker, kein Gewicht: der Auto-Tipp verbraucht NIE ein Kontingent,
//     das dem Spieler später fehlen würde.
//
//  Reine Funktionen, UI-frei. Liest die Engine nur (über nearResults).
//  Ob/wann automatisch getippt wird, entscheiden Store/UI — genau wie beim
//  Einfrieren der Quoten.
// ============================================================

import { likelyScorelines } from "./nearResults";
import { DEFAULT_RULES } from "./engine";

// Die n wahrscheinlichsten Torschützen einer Seite (kleinste anytime-Quote).
function likelyScorers(snap, side, n) {
  const players = snap?.players?.[side];
  if (!players || n <= 0) return [];
  return Object.entries(players)
    .filter(([, p]) => typeof p?.anytime === "number")
    .sort((a, b) => a[1].anytime - b[1].anytime)
    .slice(0, n)
    .map(([name]) => name);
}

// Der Standard-Tipp für ein Spiel: wahrscheinlichster Endstand + die
// wahrscheinlichsten Schützen (jeder höchstens EINMAL → kein Doppelpack).
// Gibt null zurück, wenn der Snapshot keine Quoten hergibt.
export function buildAutoTip(snap, rules = DEFAULT_RULES) {
  if (!snap) return null;
  const [best] = likelyScorelines(snap, rules, 1);
  if (!best) return null;

  const goalsMarkt = rules?.markets?.goals;
  const picks = goalsMarkt?.enabled ? (goalsMarkt.picksPerTeam ?? 0) : 0;

  // Nur so viele Schützen benennen, wie das getippte Ergebnis Tore hergibt —
  // ein Schütze für ein Team ohne Tor wäre erkennbar unsinnig.
  const homeN = Math.min(picks, best.home);
  const awayN = Math.min(picks, best.away);

  return {
    home: best.home,
    away: best.away,
    goals: {
      home: likelyScorers(snap, "home", homeN),
      away: likelyScorers(snap, "away", awayN),
    },
    auto: true, // Kennzeichen für UI/Abrechnung: nicht selbst getippt
  };
}

// Für einen Spieltag: welche Spiele hat dieser Nutzer NICHT getippt?
// matches: [{ matchId|id, snapshot, kickoff }], tips: [{ match_id|matchId, user_id|userId }]
export function missingMatches(matches = [], tips = [], userId) {
  const getMatchId = (m) => m?.matchId ?? m?.id;
  const tipped = new Set(
    tips
      .filter((t) => (t.user_id ?? t.userId) === userId)
      .map((t) => t.match_id ?? t.matchId)
  );
  return matches.filter((m) => !tipped.has(getMatchId(m)));
}

// Auto-Tipps für alle Versäumnisse eines Nutzers.
// Rückgabe: [{ matchId, tip, snapshot }] — direkt speicherbar (Store/UI
// entscheiden, ob und wann; der Snapshot friert die Quote wie üblich ein).
export function autoTipsFor({ matches = [], tips = [], userId, rules = DEFAULT_RULES }) {
  const out = [];
  for (const m of missingMatches(matches, tips, userId)) {
    const snap = m.snapshot ?? m.snap;
    const tip = buildAutoTip(snap, rules);
    if (tip) out.push({ matchId: m.matchId ?? m.id, tip, snapshot: snap });
  }
  return out;
}
