// ============================================================
//  NARRENSTAND — der Kontostand für die Anzeige, Geschwister von
//  muenzstand.js für die zweite Währung (design/waehrungen.md).
//
//  Runden-Hub und Schnellmenü zeigen denselben Wert wie Tippabgabe.jsx:
//  den Narren-Kontostand DIESES Spielers am aktuellen Spieltag. Die
//  eigentliche Buchführung liefert `kontoVerlauf` (jokerBudget.js,
//  design/kontaktstellen.md Abschnitt 5 Punkt 2) — diese Datei ist nur der
//  Vorbau davor: „welcher Spieltag ist jetzt, welchen Kontostand hat DIESER
//  Spieler dort". Reine Logik, UI-frei.
//
//  🔴 Narren gibt es nur in den Modi „einzel"/„ranking" — im Modus „einsatz"
//  ist `tip.gewicht` ein Münz-Einsatz, kein Narren-Kauf
//  (design/waehrungen.md Abschnitt 1); `kontoVerlauf` verbucht dort ohnehin
//  nie Ausgaben. Ohne aktiviertes Budget (`rules.budget.enabled`) gibt es
//  ebenfalls nichts anzuzeigen — design/waehrungen.md Abschnitt 4: „Eine
//  Währung wird nur angezeigt, wenn ihr Stand aus echten Daten stammt."
// ============================================================

import { kontoVerlauf } from "./jokerBudget";
import { naechstesOffenesSpiel } from "./muenzstand";
import { wettbewerbVon } from "./wettbewerbe";

// Reine Logik, keine UI. Rückgabe `null`, wenn es nichts anzuzeigen gibt —
// siehe Kopfkommentar und design/waehrungen.md 4.
//
// `stand` = `getStore().getLeaderboardHistory(roundId)`, `[{ matchday, board
// }]` — für die Budget-Quellen `rueckstand`/`platzierung` (jokerBudget.js).
// Das zusätzliche `wettbewerb`-Feld in jedem Eintrag stört `kontoVerlauf`
// nicht, es liest nur `matchday`/`board`. Ohne `stand` liefern diese beiden
// Quellen 0 statt zu raten (`standAmTag` in jokerBudget.js) — der Aufrufer
// sollte ihn deshalb reichen, wenn er verfügbar ist.
export function narrenStand({ rules, matches = [], tips = [], userId, stand = null, jetzt = new Date() }) {
  if (rules?.joker?.enabled !== true) return null;
  if (rules?.joker?.modus === "einsatz") return null;
  if (rules?.budget?.enabled !== true) return null;
  if (!userId) return null;

  // Derselbe „aktuelle Spieltag" wie bei den Münzen — keine zweite
  // Berechnung daneben.
  const fruehstesOffenes = naechstesOffenesSpiel(matches, jetzt);
  if (!fruehstesOffenes) return null;

  const spieltag = {
    wettbewerb: wettbewerbVon(fruehstesOffenes),
    matchday: fruehstesOffenes.matchday ?? null,
  };
  if (!Number.isFinite(spieltag.matchday)) return null;

  // Roh-Tipps ALLER Spieler um `matchday` anreichern — dieselbe Anreicherung
  // wie in Tippabgabe.jsx (Suchbegriff `infoOf`), hier für den ganzen
  // Match-Katalog statt nur den aktuellen Spieltag, weil `kontoVerlauf` die
  // komplette Kaufhistorie braucht.
  const infoOf = new Map(matches.map((m) => [m.id, { matchday: m.matchday ?? null }]));
  const tipps = tips.map((t) => ({
    userId: t.user_id,
    matchday: infoOf.get(t.match_id)?.matchday ?? null,
    gewicht: t.tip?.gewicht,
    joker: t.tip?.joker === true,
  }));

  const alleUserIds = [...new Set(tips.map((t) => t.user_id).filter(Boolean).concat(userId))];

  const { proSpieler } = kontoVerlauf({ rules, tipps, stand, userIds: alleUserIds });
  const verlauf = proSpieler[userId];
  if (!verlauf) return null;
  const eintrag = verlauf.find((v) => v.matchday === spieltag.matchday);
  if (!eintrag) return null;

  return { spieltag, kontostand: eintrag.kontostand };
}
