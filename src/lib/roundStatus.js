// ── Geteilte Status-Berechnung: wie viele Spiele sind offen/getippt ──
// Matches sind aktuell rundenübergreifend derselbe globale Katalog (siehe
// CLAUDE.md Architekturregel 2 zur austauschbaren Quoten-/Daten-Quelle) — jede
// Runde "sieht" also dieselben Matches. Von RundenHub, Hauptmenu
// (Rundenübersicht) und Spielwahl genutzt, damit „X Spiele · Y offen · Z
// getippt" überall gleich berechnet wird statt an drei Stellen zu drifted.

export function computeMatchStatus(matches, now = new Date()) {
  const open = matches.filter((m) => new Date(m.kickoff) > now).length;
  return { total: matches.length, open, closed: matches.length - open };
}

export function countTippedByUser(tips, userId) {
  if (!userId) return 0;
  return new Set(tips.filter((t) => t.user_id === userId).map((t) => t.match_id)).size;
}
