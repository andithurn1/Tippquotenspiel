// ============================================================
//  SPIEL-FOLGE — was kommt vor und was nach diesem Spiel?
//  (Andi, KT5, 25.08.2026)
//
//  Wörtlich: „zum nächsten Spiel bzw Tippabgabe kommt man dann mit Swipen
//  oder runterscrollen was immer so Fensterbasiert ist bzw immer so
//  einzelspielstrukturiert".
//
//  ── 🔴 Warum das eine eigene Datei ist und nicht drei Zeilen im Screen ──
//  „Das nächste Spiel" ist eine Frage der RUNDEN-SCHICHT (CLAUDE.md), und
//  zwar gleich in zwei der vier Punkte:
//
//   1. WELCHE Spiele gehören überhaupt dazu? Nicht `listMatches()` — der
//      Katalog trägt sieben Wettbewerbe und 1942 Spiele. Wer darüber
//      blättert, landet nach dem Bundesliga-Spiel in der MLS. Die Antwort
//      ist `listRoundMatches(roundId)`, und sie kommt von außen herein.
//   2. In WELCHER Reihenfolge? Nicht die Reihenfolge der Datenbank, sondern
//      die Zeit — und bei gleicher Anstoßzeit muss eine feste zweite Stufe
//      her, sonst steht dasselbe Spiel beim nächsten Laden woanders.
//
//  ⚠️ Der Screen darf keine dieser beiden Fragen selbst beantworten. Er gibt
//  die Rundenspiele herein und bekommt Nachbarn heraus.
//
//  Reine Funktionen, UI-frei, keine Store-Abhängigkeit.
// ============================================================

const zeitVon = (m) => {
  const roh = m?.snapshot?.kickoff ?? m?.kickoff ?? null;
  const t = roh ? new Date(roh).getTime() : NaN;
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
};
const idVon = (m) => m?.matchId ?? m?.id ?? null;

// 🔴 Anstoßzeit, dann matchId. Die zweite Stufe ist keine Kosmetik: an einem
// Samstag stoßen neun Bundesliga-Spiele gleichzeitig an. Ohne festen zweiten
// Schlüssel hinge ihre Reihenfolge davon ab, wie die Datenbank sie gerade
// liefert — und „das nächste Spiel" wäre nach dem Neuladen ein anderes.
export function sortiereFolge(spiele = []) {
  return [...(spiele ?? [])]
    .filter((m) => idVon(m) != null)
    .sort((a, b) => {
      const d = zeitVon(a) - zeitVon(b);
      if (d !== 0) return d;
      return String(idVon(a)).localeCompare(String(idVon(b)));
    });
}

// Die Nachbarschaft eines Spiels innerhalb SEINER Runde.
//
// `filter` ist bewusst ein Parameter und keine eingebaute Regel: beim Tippen
// will man nur durch die noch tippbaren Spiele blättern, in der Abrechnung
// durch alle. Wer die Regel hier einbaut, hat sie an der falschen Stelle.
//
// ⚠️ Das aktuelle Spiel bleibt IMMER in der Liste, auch wenn der Filter es
// aussortieren würde — sonst verschwindet der Blätter-Balken genau in dem
// Moment, in dem ein Spiel angepfiffen wird und man noch darauf schaut.
export function nachbarn(spiele = [], matchId, { filter = null } = {}) {
  const alle = sortiereFolge(spiele);
  const liste = typeof filter === "function"
    ? alle.filter((m) => filter(m) || String(idVon(m)) === String(matchId))
    : alle;

  const index = liste.findIndex((m) => String(idVon(m)) === String(matchId));
  if (index < 0) {
    return { vorher: null, nachher: null, index: -1, anzahl: liste.length, liste };
  }
  return {
    vorher: index > 0 ? liste[index - 1] : null,
    nachher: index < liste.length - 1 ? liste[index + 1] : null,
    index,
    anzahl: liste.length,
    liste,
  };
}

// „3 von 12" — die Position, wie ein Mensch sie zählt (ab 1).
// ⚠️ Gibt `null` statt „0 von 0", wenn das Spiel nicht in der Runde liegt:
// eine Zählung, die sich selbst nicht findet, gehört nicht angezeigt.
export function positionText(spiele = [], matchId, optionen = {}) {
  const { index, anzahl } = nachbarn(spiele, matchId, optionen);
  if (index < 0 || anzahl === 0) return null;
  return `${index + 1} von ${anzahl}`;
}
