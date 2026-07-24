// ── Joker-Abstimmung ────────────────────────────────────────
// Reine Auszähl-Logik (kein UI, kein I/O). Wenn eine Runde die Abstimmung
// aktiviert hat (rules.joker.abstimmung, Premium), entscheiden die Mitglieder
// gemeinsam, an WELCHEN Spieltagen es einen Joker gibt — statt „an jedem".
//
// Ein Votum: { matchday, user_id, ja: boolean }. Pro Nutzer und Spieltag zählt
// die letzte Stimme (der Store hält nur eine je Nutzer/Spieltag).
//
// Beschluss-Regel (bewusst einfach, ohne Mitgliederzahl): Ein Spieltag wird zum
// Joker-Spieltag, wenn mehr Ja- als Nein-Stimmen abgegeben wurden. Gleichstand
// oder keine Stimmen → kein Joker. Das ist absichtlich eine Mehrheit der
// ABGEGEBENEN Stimmen — wer nicht abstimmt, blockiert nichts.

// Zählt die Stimmen je Spieltag aus. Rückgabe aufsteigend nach Spieltag:
// { matchday, ja, nein, total, beschlossen }.
export function tallyVotes(votes = []) {
  const perDay = new Map();   // matchday → { ja, nein }
  for (const v of votes) {
    const md = v?.matchday ?? null;
    if (md == null) continue;
    const cur = perDay.get(md) || { ja: 0, nein: 0 };
    if (v.ja === true) cur.ja += 1;
    else if (v.ja === false) cur.nein += 1;
    perDay.set(md, cur);
  }
  return [...perDay.entries()]
    .map(([matchday, c]) => ({
      matchday, ja: c.ja, nein: c.nein, total: c.ja + c.nein,
      beschlossen: c.ja > c.nein,
    }))
    .sort((a, b) => a.matchday - b.matchday);
}

// Menge der Spieltage, an denen der Joker per Abstimmung beschlossen ist.
export function jokerMatchdaysFromVotes(votes = []) {
  return new Set(tallyVotes(votes).filter((d) => d.beschlossen).map((d) => d.matchday));
}

// Gilt der Joker an DIESEM Spieltag? Zentrale Frage für Tippabgabe/Spielwahl.
// - Abstimmung aus  → Joker gilt überall (wie bisher): true.
// - Abstimmung an   → nur, wenn der Spieltag per Mehrheit beschlossen wurde.
// Ohne aktiven Joker im Regelwerk immer false.
export function jokerGiltFuerSpieltag(rules, matchday, votes = []) {
  if (!rules?.joker?.enabled) return false;
  if (!rules.joker.abstimmung) return true;
  return jokerMatchdaysFromVotes(votes).has(matchday);
}

// Die eigene Stimme eines Nutzers zu einem Spieltag (oder null).
export function eigeneStimme(votes = [], userId, matchday) {
  const v = votes.find((x) => x.user_id === userId && (x.matchday ?? null) === matchday);
  return v ? v.ja === true : null;   // true = ja, false = nein, null = noch nicht abgestimmt
}
