// ============================================================
//  REAKTIONS-SCHICHT — welches GIF nach der Abrechnung erscheint.
//  Reine Zuordnung (kein UI, kein I/O), damit sie testbar ist und
//  an EINER Stelle lebt — analog zur Quoten-Quelle/Daten-Schicht.
//
//  Drei Achsen, bewusst kombinierbar:
//   1) Tipp-Szenario  — das spezifischste passende GIF zum eigenen Tipp
//      (priorisierte Liste, erste Übereinstimmung gewinnt, sonst Fallback).
//   2) Rolle im Ranking — Sieger / Mittelfeld / Letzter des Spieltags.
//   3) (später) Spielverlauf — „späte Drama"-Szenarien wie Nachspielzeit-
//      Gegentreffer. Braucht Torminuten/Timeline, die das Ergebnis-Modell
//      noch nicht liefert; Andockpunkt siehe MATCH_DRAMA unten.
//
//  Die GIF-Dateien liegen unter public/reactions/<key>.gif (siehe README dort).
//  Fehlt eine Datei, zeigt die UI den Emoji-Platzhalter — die App funktioniert
//  also schon vor dem ersten echten GIF, und neue Szenarien sind einfach:
//  eine Regel hier + eine GIF-Datei, kein UI-Umbau.
// ============================================================

const GOLD = "#F5C451";
const MINT = "#54E0A0";
const CORAL = "#FF5470";
const MUTED = "#8A90B4";

// ── 1) Tipp-Szenarien ───────────────────────────────────────
// Priorisierte Liste: das erste Szenario, dessen test(ctx) zutrifft, gewinnt.
// ctx = { ebene, dist, winnerRight, goalsNet } — alles aus scoreTip().
// Reihenfolge = spezifisch → allgemein. Der letzte Eintrag hat test () => true
// und ist damit der garantierte Fallback.
export const TIP_SCENARIOS = [
  { key: "exakt",         label: "Volltreffer",          emoji: "🎯", tone: GOLD,  test: (c) => c.ebene === "exakt" },
  { key: "hauchduenn",    label: "Hauchdünn daneben",     emoji: "😤", tone: GOLD,  test: (c) => c.winnerRight && c.dist === 1 },
  { key: "abstand",       label: "Abstand getroffen",     emoji: "💪", tone: MINT,  test: (c) => c.ebene === "abstand" },
  { key: "tendenz-tore",  label: "Tendenz + Torschütze",  emoji: "🙌", tone: MINT,  test: (c) => c.ebene === "tendenz" && c.goalsNet > 0 },
  { key: "tendenz",       label: "Richtige Tendenz",       emoji: "👍", tone: MUTED, test: (c) => c.ebene === "tendenz" },
  { key: "tore-trostpreis", label: "Sieger weg, Tor getroffen", emoji: "😅", tone: MUTED, test: (c) => !c.winnerRight && c.goalsNet > 0 },
  { key: "daneben",       label: "Voll daneben",          emoji: "🤡", tone: CORAL, test: () => true },
];

// ── 2) Rollen-Reaktionen nach Platzierung ───────────────────
export const RANK_REACTIONS = {
  sieger:     { key: "sieger",     label: "Spieltags-Sieger", emoji: "👑", tone: GOLD },
  mittelfeld: { key: "mittelfeld", label: "Mittelfeld",       emoji: "😐", tone: MUTED },
  letzter:    { key: "letzter",    label: "Rote Laterne",     emoji: "🪦", tone: CORAL },
};

// ── 3) Spielverlauf-Drama (Andockpunkt, noch ohne Daten) ────
// Sobald das Ergebnis eine Timeline (Torminuten) trägt, greifen hier Szenarien
// wie „Führung in der Nachspielzeit verspielt". Bis dahin liefert der Resolver
// null, und die UI nutzt nur Tipp-Szenario + Rolle. Struktur wie TIP_SCENARIOS:
// { key, label, emoji, tone, test(timelineCtx) }.
export const MATCH_DRAMA = [
  // Beispiel-Platzhalter (inaktiv, weil noch keine Timeline vorhanden):
  // { key: "nachspielzeit-drama", label: "90.+ Gegentreffer", emoji: "💔", tone: CORAL,
  //   test: (t) => t?.lateSwing === true },
];

// Welches Tipp-Szenario? Erwartet die scoreTip()-Wertung (oder ein Objekt mit
// denselben Feldern). Gibt immer eine Reaktion zurück (Fallback „daneben").
export function tipScenario(scored) {
  const c = {
    ebene: scored?.ebene ?? "keiner",
    dist: scored?.dist ?? Infinity,
    winnerRight: !!scored?.winnerRight,
    goalsNet: scored?.goals?.net ?? scored?.goalsNet ?? 0,
  };
  return TIP_SCENARIOS.find((s) => s.test(c)) ?? TIP_SCENARIOS[TIP_SCENARIOS.length - 1];
}

// Rolle im Ranking: rank 1 = Sieger, rank === total = Letzter, sonst Mittelfeld.
// Ohne gültigen Rang (Match noch nicht gewertet) gibt es keine Rollen-Reaktion.
export function rankReaction(rank, total) {
  if (rank == null || total == null || total < 1) return null;
  if (rank === 1) return RANK_REACTIONS.sieger;
  if (rank === total) return RANK_REACTIONS.letzter;
  return RANK_REACTIONS.mittelfeld;
}

// Spielverlauf-Drama: erste passende Regel oder null (solange keine Timeline).
export function matchDrama(timelineCtx) {
  if (!timelineCtx) return null;
  return MATCH_DRAMA.find((s) => s.test(timelineCtx)) ?? null;
}

// Öffentlicher Pfad zum Reaktions-Clip (Next.js serviert /public am Root).
// Format: kurzes stummes MP4 (siehe ReactionGif + README).
export function reactionSrc(key) {
  return `/reactions/${key}.mp4`;
}
