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
import { zeitachse, rundenSpieltagVon, verlaufNachRundenSpieltag } from "./zeitachse";

// Reine Logik, keine UI. Rückgabe `null`, wenn es nichts anzuzeigen gibt —
// siehe Kopfkommentar und design/waehrungen.md 4.
//
// `stand` = `getStore().getLeaderboardHistory(roundId)`, `[{ matchday, board
// }]` — für die Budget-Quellen `rueckstand`/`platzierung` (jokerBudget.js).
// Er kommt in LIGA-Spieltagen herein und wird hier umgeschlüsselt (siehe
// unten). Ohne `stand` liefern diese beiden Quellen 0 statt zu raten
// (`standAmTag` in jokerBudget.js) — der Aufrufer sollte ihn deshalb reichen,
// wenn er verfügbar ist.
//
// 🔴 GERECHNET WIRD IN RUNDEN-SPIELTAGEN — genau wie in `Tippabgabe.jsx`.
//
// Diese Datei hat bis 05.08.2026 dreimal den LIGA-Spieltag benutzt (die Tipps,
// den Leaderboard-Verlauf und die Suche nach dem eigenen Eintrag) und
// `kontoVerlauf` ohne `spieltage` aufgerufen, also über die feste 34. Der
// Runden-Hub zeigte damit einen ANDEREN Narren-Kontostand als die Tippabgabe,
// die denselben Wert korrekt rechnet — derselbe Betrag, zwei Zahlen.
//
// `zusatz` sind die Narren vom Glücksrad (`getStore().getDrehradBelohnungen`).
// Ohne sie zahlte ein Rad-Feld „30 Narren" im Hub nichts aus, in der
// Tippabgabe schon.
export function narrenStand({ rules, matches = [], tips = [], userId, stand = null, zusatz = [], jetzt = new Date() }) {
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

  // Die Achse EINMAL bauen — sie schlüsselt Tipps, Verlauf und den eigenen
  // Spieltag um.
  const achse = zeitachse(matches, rules?.zeitachse);
  const jetztRunde = rundenSpieltagVon(achse, fruehstesOffenes) ?? spieltag.matchday;

  // Roh-Tipps ALLER Spieler um `matchday` anreichern — dieselbe Anreicherung
  // wie in Tippabgabe.jsx (Suchbegriff `infoOf`), hier für den ganzen
  // Match-Katalog statt nur den aktuellen Spieltag, weil `kontoVerlauf` die
  // komplette Kaufhistorie braucht.
  const matchVon = new Map(matches.map((m) => [m.id, m]));
  const tipps = tips.map((t) => {
    const m = matchVon.get(t.match_id);
    return {
      userId: t.user_id,
      matchday: m ? (rundenSpieltagVon(achse, m) ?? m.matchday ?? null) : null,
      gewicht: t.tip?.gewicht,
      joker: t.tip?.joker === true,
    };
  });

  const alleUserIds = [...new Set(tips.map((t) => t.user_id).filter(Boolean).concat(userId))];

  const { proSpieler } = kontoVerlauf({
    rules, tipps, userIds: alleUserIds,
    spieltage: achse.length || undefined,
    stand: verlaufNachRundenSpieltag(stand ?? [], achse),
    zusatz,
  });
  const verlauf = proSpieler[userId];
  if (!verlauf) return null;
  const eintrag = verlauf.find((v) => v.matchday === jetztRunde);
  if (!eintrag) return null;

  // `spieltag` bleibt der LIGA-Spieltag: er wird ANGEZEIGT („Spieltag 20,
  // Bundesliga"), und das ist die Zahl, die ein Spieler kennt. Gerechnet wurde
  // in Runden-Spieltagen — beides nebeneinander ist hier richtig, solange man
  // sie nicht verwechselt.
  return { spieltag, kontostand: eintrag.kontostand };
}
