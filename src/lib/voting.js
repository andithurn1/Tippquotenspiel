import { spieltagKey } from "./engine";

// ── Joker-Abstimmung ────────────────────────────────────────
// Reine Auszähl-Logik (kein UI, kein I/O). Wenn eine Runde die Abstimmung
// aktiviert hat (rules.joker.abstimmung, Premium), entscheiden die Mitglieder
// gemeinsam, an WELCHEN Spieltagen es einen Joker gibt — statt „an jedem".
//
// Ein Votum: { wettbewerb?, matchday, user_id, ja: boolean }. Pro Nutzer und
// Spieltag zählt die letzte Stimme (der Store hält nur eine je Nutzer/Spieltag).
//
// ⚠️ Ein Spieltag ist erst mit dem WETTBEWERB eindeutig — Bundesliga-Spieltag 1
// und Champions-League-Spieltag 1 sind zwei verschiedene Spieltage. Gezählt
// wird deshalb über `spieltagKey` aus der Engine; `wettbewerb` darf fehlen,
// dann verhält sich alles wie vorher (Runden mit nur einem Wettbewerb).
//
// Beschluss-Regel (bewusst einfach, ohne Mitgliederzahl): Ein Spieltag wird zum
// Joker-Spieltag, wenn mehr Ja- als Nein-Stimmen abgegeben wurden. Gleichstand
// oder keine Stimmen → kein Joker. Das ist absichtlich eine Mehrheit der
// ABGEGEBENEN Stimmen — wer nicht abstimmt, blockiert nichts.

// Zählt die Stimmen je Spieltag aus. Rückgabe aufsteigend nach Spieltag:
// { matchday, ja, nein, total, beschlossen }.
export function tallyVotes(votes = []) {
  const perDay = new Map();   // Spieltag-Schlüssel → { wettbewerb, matchday, ja, nein }
  for (const v of votes) {
    const md = v?.matchday ?? null;
    if (md == null) continue;
    const key = spieltagKey(v);
    const cur = perDay.get(key)
      || { wettbewerb: v.wettbewerb ?? null, matchday: md, ja: 0, nein: 0 };
    if (v.ja === true) cur.ja += 1;
    else if (v.ja === false) cur.nein += 1;
    perDay.set(key, cur);
  }
  return [...perDay.values()]
    .map((c) => ({
      wettbewerb: c.wettbewerb, matchday: c.matchday,
      ja: c.ja, nein: c.nein, total: c.ja + c.nein,
      beschlossen: c.ja > c.nein,
    }))
    .sort((a, b) =>
      String(a.wettbewerb ?? "").localeCompare(String(b.wettbewerb ?? "")) || a.matchday - b.matchday);
}

// Menge der beschlossenen Spieltage — als SCHLÜSSEL, nicht als Zahlen.
export function jokerMatchdaysFromVotes(votes = []) {
  return new Set(tallyVotes(votes).filter((d) => d.beschlossen).map((d) => spieltagKey(d)));
}

// Gilt der Joker an DIESEM Spieltag? Zentrale Frage für Tippabgabe/Spielwahl.
// - Abstimmung aus  → Joker gilt überall (wie bisher): true.
// - Abstimmung an   → nur, wenn der Spieltag per Mehrheit beschlossen wurde.
// Ohne aktiven Joker im Regelwerk immer false.
// `spieltag` ist ein Objekt { wettbewerb, matchday } oder — für Runden mit nur
// einem Wettbewerb — weiterhin eine nackte Zahl.
export function jokerGiltFuerSpieltag(rules, spieltag, votes = []) {
  if (!rules?.joker?.enabled) return false;
  if (!rules.joker.abstimmung) return true;
  return jokerMatchdaysFromVotes(votes).has(alsKey(spieltag));
}

// Die eigene Stimme eines Nutzers zu einem Spieltag (oder null).
export function eigeneStimme(votes = [], userId, spieltag) {
  const ziel = alsKey(spieltag);
  const v = votes.find((x) => x.user_id === userId && spieltagKey(x) === ziel);
  return v ? v.ja === true : null;   // true = ja, false = nein, null = noch nicht abgestimmt
}

function alsKey(spieltag) {
  return (spieltag && typeof spieltag === "object")
    ? spieltagKey(spieltag)
    : spieltagKey({ matchday: spieltag });
}
