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
import { seeded } from "./seeded";
import { schuetzenSperre } from "./favoritenSperre";
import { DEFAULT_RULES, RULE_LIMITS, sanitizeRules } from "./engine";

// ── Was passiert bei einem Versäumnis? Der ADMIN entscheidet ──
// Drei Strategien, bewusst mit unterschiedlichem Charakter:
//  • "wahrscheinlich" — der zahmste Tipp laut Quoten. Fair, langweilig, sicher.
//  • "schnitt"        — der Durchschnitt der Mitspieler-Tipps. „Du hättest
//                       mitgemacht wie alle" — sozial, braucht fremde Tipps.
//  • "zufall"         — ein zufälliger plausibler Endstand aus den Top-Quoten.
//                       Mehr Drama, aber nie ein Freifahrtschein.
// Dazu ein MALUS in Prozent: der Auto-Tipp darf sich nicht wie ein eigener
// anfühlen. 0 % = reine Kulanz, 100 % = wie gar nicht getippt.
export const VERSAEUMNIS_STRATEGIEN = ["wahrscheinlich", "schnitt", "zufall"];

export const VERSAEUMNIS_LABEL = {
  wahrscheinlich: "Wahrscheinlichstes Ergebnis",
  schnitt: "Schnitt der Mitspieler",
  zufall: "Zufällig aus den plausiblen",
};

export const VERSAEUMNIS_HINT = {
  wahrscheinlich: "Der zahmste Tipp laut Quoten — sicher, aber zahlt wenig.",
  schnitt: "Was die anderen im Mittel getippt haben. Fällt zurück auf das wahrscheinlichste Ergebnis, wenn niemand sonst getippt hat.",
  zufall: "Ein zufälliger plausibler Endstand — mehr Drama, gleiche Fairness.",
};

// Die Regel selbst lebt im Regelwerk (engine.js: DEFAULT_RULES.versaeumnis,
// RULE_LIMITS.versaeumnis, sanitizeRules) — hier nur bequeme Namen darauf,
// damit es keine zweite Wahrheit gibt.
export const DEFAULT_VERSAEUMNIS = DEFAULT_RULES.versaeumnis;
export const VERSAEUMNIS_LIMITS = RULE_LIMITS.versaeumnis;

// Macht aus einer (evtl. importierten) Teil-Einstellung eine gültige —
// über dieselbe Prüfung wie das gesamte Regelwerk.
export function sanitizeVersaeumnis(partial = {}) {
  return sanitizeRules({ versaeumnis: partial }).versaeumnis;
}

// Faktor, mit dem die Wertung eines Auto-Tipps multipliziert wird.
// Greift GANZ ZULETZT auf das fertige Spiel-Ergebnis — wie der Joker, damit
// sich nichts multiplikativ aufschaukelt.
export function malusFaktor(versaeumnis = DEFAULT_VERSAEUMNIS) {
  const v = sanitizeVersaeumnis(versaeumnis);
  return 1 - v.malusProzent / 100;
}

// Die n wahrscheinlichsten Torschützen einer Seite (kleinste anytime-Quote).
//
// 🔴 OHNE die von der Favoriten-Sperre zugehaltenen Namen (26.08.2026). Sonst
// benennt ausgerechnet der Ersatz-Tipp den Spieler, den kein Mensch dieser
// Runde tippen darf — und der Versäumnis-Tipp wäre der einzige, der die Regel
// bricht. Das ist derselbe Fund wie am 06.08.: die Rechnung stimmte, gefragt
// hat sie niemand.
function likelyScorers(snap, side, n, rules) {
  const players = snap?.players?.[side];
  if (!players || n <= 0) return [];
  const zu = new Set(schuetzenSperre(snap, rules).filter((o) => o.gesperrt).map((o) => o.id));
  return Object.entries(players)
    .filter(([name, p]) => typeof p?.anytime === "number" && !zu.has(name))
    .sort((a, b) => a[1].anytime - b[1].anytime)
    .slice(0, n)
    .map(([name]) => name);
}

// Deterministischer Zufall aus einem Text — gleiche Eingabe, gleicher Wert.
// Wichtig, damit ein Auto-Tipp reproduzierbar ist und nicht bei jedem Aufruf
// anders aussieht (sonst wäre er nicht überprüfbar).
// (Deterministischer Zufall liegt jetzt in `seeded.js` — eine Quelle für
//  jokerPlan, autoTip und auswahl.)

// Endstand nach gewählter Strategie.
// ⚠️ Hier stand bis zum 26.08.2026 eine Prüfung, ob der gewählte ENDSTAND für
// die Runde gesperrt ist. Sie ist weg, weil es die Endstand-Sperre nicht mehr
// gibt (Andi: „ich will keinen block ermöglichen bei ergebnissen, nur
// Torschützen"). Die Schützen-Prüfung in `likelyScorers` bleibt — dort ist der
// Fall echt: der Versäumte bekäme sonst, was der Anwesende nicht darf.
function pickScoreline(snap, rules, strategie, { fremdeTipps = [], seed = "" } = {}) {
  if (strategie === "schnitt" && fremdeTipps.length > 0) {
    // Mittelwert der Mitspieler-Tipps, kaufmännisch gerundet.
    const n = fremdeTipps.length;
    const home = Math.round(fremdeTipps.reduce((s, t) => s + (Number(t?.home) || 0), 0) / n);
    const away = Math.round(fremdeTipps.reduce((s, t) => s + (Number(t?.away) || 0), 0) / n);
    return { home, away };
  }
  if (strategie === "zufall") {
    // Aus den fünf plausibelsten Endständen einen ziehen — nie ein Freilos,
    // aber mehr Abwechslung als immer derselbe Standard.
    const kandidaten = likelyScorelines(snap, rules, 5);
    if (kandidaten.length) return kandidaten[Math.floor(seeded(seed) * kandidaten.length)];
  }
  // Fallback für alle Fälle (auch „schnitt" ohne fremde Tipps): das
  // wahrscheinlichste Ergebnis.
  const [best] = likelyScorelines(snap, rules, 1);
  return best ?? null;
}

// Der Standard-Tipp für ein Spiel. `strategie` bestimmt den Endstand (siehe
// VERSAEUMNIS_STRATEGIEN), die Schützen sind immer die wahrscheinlichsten
// (jeder höchstens EINMAL → kein Doppelpack).
// Gibt null zurück, wenn der Snapshot keine Quoten hergibt.
export function buildAutoTip(snap, rules = DEFAULT_RULES, opts = {}) {
  if (!snap) return null;
  const strategie = VERSAEUMNIS_STRATEGIEN.includes(opts.strategie)
    ? opts.strategie : "wahrscheinlich";
  const best = pickScoreline(snap, rules, strategie, {
    fremdeTipps: opts.fremdeTipps ?? [],
    seed: opts.seed ?? snap.matchId ?? "",
  });
  if (!best) return null;

  const goalsMarkt = rules?.markets?.goals;
  // Im Modus `proSpiel` gilt eine Anzahl fürs GANZE Spiel, nicht je Mannschaft.
  // Ohne diese Unterscheidung benennte der Ersatz-Tipp doppelt so viele
  // Schützen wie erlaubt — und der Versäumnis-Tipp soll der zahmste sein, nicht
  // der großzügigste.
  const proSpiel = goalsMarkt?.modus === "proSpiel";
  const picks = !goalsMarkt?.enabled ? 0
    : proSpiel ? (goalsMarkt.picksProSpiel ?? 0)
      : (goalsMarkt.picksPerTeam ?? 0);

  // Nur so viele Schützen benennen, wie das getippte Ergebnis Tore hergibt —
  // ein Schütze für ein Team ohne Tor wäre erkennbar unsinnig.
  // Im Spiel-Modus teilt sich das Kontingent auf beide Mannschaften auf; die
  // Heimseite bekommt zuerst, was ihre Tore hergeben, der Rest geht an den Gast.
  const homeN = Math.min(picks, best.home);
  const awayN = proSpiel
    ? Math.min(Math.max(0, picks - homeN), best.away)
    : Math.min(picks, best.away);

  return {
    home: best.home,
    away: best.away,
    goals: {
      home: likelyScorers(snap, "home", homeN, rules),
      away: likelyScorers(snap, "away", awayN, rules),
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

// Auto-Tipps für alle Versäumnisse eines Nutzers — nach dem REGELWERK der
// Runde (der Admin bestimmt Strategie, Malus und Kontingent).
//
// `bisherGenutzt` = wie oft die Kulanz für diesen Spieler in der Saison schon
// gegriffen hat (Store/UI zählen mit). Ist das Kontingent aufgebraucht, gibt es
// KEINE Auto-Tipps mehr — sonst könnte man dauerhaft aussetzen.
//
// Rückgabe: [{ matchId, tip, snapshot, malusFaktor }] — direkt speicherbar.
// Ob und wann gespeichert wird, entscheiden Store/UI (wie beim Quoten-Snapshot);
// der `malusFaktor` gehört an die Wertung dieses Tipps.
export function autoTipsFor({
  matches = [], tips = [], userId, rules = DEFAULT_RULES,
  versaeumnis = DEFAULT_VERSAEUMNIS, bisherGenutzt = 0,
}) {
  const v = sanitizeVersaeumnis(versaeumnis);
  if (!v.enabled) return [];
  if (v.maxProSaison > 0 && bisherGenutzt >= v.maxProSaison) return [];

  const faktor = malusFaktor(v);
  const out = [];
  for (const m of missingMatches(matches, tips, userId)) {
    const matchId = m.matchId ?? m.id;
    const snap = m.snapshot ?? m.snap;
    // Für „schnitt": die Tipps der ANDEREN auf genau dieses Spiel.
    const fremdeTipps = tips
      .filter((t) => (t.match_id ?? t.matchId) === matchId && (t.user_id ?? t.userId) !== userId)
      .map((t) => t.tip ?? t);
    const tip = buildAutoTip(snap, rules, {
      strategie: v.strategie,
      fremdeTipps,
      seed: `${matchId}-${userId}`,
    });
    if (tip) out.push({ matchId, tip, snapshot: snap, malusFaktor: faktor });
  }
  return out;
}
