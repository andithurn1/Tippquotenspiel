// ── Geteilte Status-Berechnung: wie viele Spiele sind offen/getippt ──
// Matches sind aktuell rundenübergreifend derselbe globale Katalog (siehe
// CLAUDE.md Architekturregel 2 zur austauschbaren Quoten-/Daten-Quelle) — jede
// Runde "sieht" also dieselben Matches. Von RundenHub, Hauptmenu
// (Rundenübersicht) und Spielwahl genutzt, damit „X Spiele · Y offen · Z
// getippt" überall gleich berechnet wird statt an drei Stellen zu drifted.

import { filterSpiele, sanitizeSpiele } from "./spielauswahl";

// Team-Filter einer Runde: null/leer = alle Spiele. Sonst nur Spiele, an
// denen MINDESTENS eines der ausgewählten Teams beteiligt ist (Heim ODER
// Gast) — so bleiben z.B. auch Spiele gegen ein nicht ausgewähltes Team
// sichtbar, solange die andere Seite ausgewählt ist.
export function filterMatchesByTeams(matches, teamFilter) {
  if (!teamFilter || !teamFilter.length) return matches;
  const set = new Set(teamFilter);
  return matches.filter((m) => set.has(m.home) || set.has(m.away));
}

// ── 🔴 Welche Spiele gehören zu DIESER Runde? EINE Stelle. ──
//
// Der teuerste Befund vom 09.08.2026: bis dahin entschied das allein
// `team_filter` — eine flache Vereinsliste. Alles andere aus `rules.spiele`
// verdampfte beim Anlegen. Gemessen: „nur Bundesliga" ergab 1943 statt 306
// Spiele, „nur CL ab Achtelfinale" 1943 statt 15. Die Spielerstellung zeigte
// die richtige Zahl (`filterSpiele`), der Store rechnete anders — beide Seiten
// für sich korrekt, und genau deshalb fiel es niemandem auf.
//
// ⚠️ Warum die Auswahl auf der RUNDE liegt und nicht live aus `round.rules`
// gelesen wird: eine Runde kann ihr Regelwerk per Abstimmung ändern
// (`design/abstimmung-verfassung.md`). Läse man `rules.spiele` bei jedem
// Aufruf neu, änderte ein Beschluss RÜCKWIRKEND, welche Spiele je dazugehört
// haben — samt aller schon abgegebenen Tipps. Deshalb wird die Auswahl beim
// ANLEGEN eingefroren, genauso wie der Quoten-Snapshot beim Anpfiff.
//
// ⚠️ `team_filter` bleibt für Runden aus der Zeit davor der Rückfall. Ohne
// diesen Zweig verlören alle bestehenden Runden ihre Vereins-Einschränkung.
export function rundenSpiele(matches, round) {
  if (round?.spiele) return filterSpiele(matches, round.spiele);
  return filterMatchesByTeams(matches, round?.team_filter);
}

// ── Was beim ANLEGEN eingefroren wird ───────────────────────
// Beide Stores müssen hier dasselbe rechnen, sonst legt der Mock andere Runden
// an als die Datenbank. Deshalb eine Funktion und nicht zwei Zeilen.
//
// 🔴 Ein ausdrücklich übergebener `teamFilter` GEWINNT über die Vereinsliste
// im Regelwerk. Das ist CLAUDE.md, wörtlich: „`rules.spiele` schlägt vor,
// `rounds.team_filter` hält fest, was beim Anlegen daraus wurde — die Runde
// gewinnt." Alle ÜBRIGEN Dimensionen (Wettbewerbe, Phasen, Zeitraum, feste
// Liste, Liga-Sonderregeln) kommen aus dem Regelwerk mit; genau die gingen
// bis zum 09.08.2026 verloren.
//
// ⚠️ Beim ersten Anlauf hat diese Zusammenführung gefehlt, und der übergebene
// `teamFilter` wurde von der (leeren) Auswahl im Regelwerk überstimmt — neun
// Tests haben es gemeldet. Wer hier etwas ändert, prüft beide Richtungen.
export function rundenAuswahl({ spiele, teamFilter } = {}) {
  const basis = sanitizeSpiele(spiele);
  if (!Array.isArray(teamFilter) || teamFilter.length < 2) return basis;
  return sanitizeSpiele({ ...basis, modus: "teams", teams: teamFilter });
}

export function computeMatchStatus(matches, now = new Date()) {
  const open = matches.filter((m) => new Date(m.kickoff) > now).length;
  return { total: matches.length, open, closed: matches.length - open };
}

export function countTippedByUser(tips, userId) {
  if (!userId) return 0;
  return new Set(tips.filter((t) => t.user_id === userId).map((t) => t.match_id)).size;
}
