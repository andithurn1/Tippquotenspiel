// ── Saison-Wetten aufs Leaderboard ──────────────────────────
// EINE Quelle für beide Stores. Vorher lag dieselbe Funktion zweimal da (Mock
// und Supabase) und war schon leicht auseinandergelaufen — der Mock filterte
// die Saison-Tipps nach Runde, der Supabase-Store nicht (dort kommen sie schon
// gefiltert an). Jetzt reichen beide bereits gefilterte Tipps herein.
//
// Zwei Dinge passieren hier:
//
// 1. **Punkte additiv aufs Board** — als eigene `saison`-Zeile UND in `total`,
//    danach neu sortiert/gerankt. Ist die Saison aus, bleibt das Board
//    byte-gleich: kein stillschweigendes Einrechnen, und kein `saison`-Feld,
//    an dem die Anzeige eine Zeile aufhängen würde.
//
// 2. **Reine Saison-Tipper kommen überhaupt erst ins Board.** Das Leaderboard
//    wird aus MATCH-Tipps gebaut — wer nur „Meister" getippt hat, fehlte darin
//    komplett, obwohl er Punkte hat. Die Regel lautet jetzt einheitlich: im
//    Board steht, wer etwas abgegeben hat (Match-Tipp ODER Saison-Wette). Ein
//    Mitglied ohne jeden Tipp bleibt draußen — es gibt nichts zu ranken.

import { scoreSaison } from "./saisonwetten";

export function withSaisonPunkte({ board = [], rules, matches = [], seasonTips = [], nameOf } = {}) {
  if (!rules?.saison?.enabled) return board;

  const benenne = (id) => String((typeof nameOf === "function" ? nameOf(id) : null) ?? id);

  // Reine Saison-Tipper als Null-Einträge ergänzen, DAMIT sie unten ihre
  // Saison-Punkte bekommen. Bewusst erst hier und nicht im Verlauf: ein
  // Anschluss-Bonus (catchup.js) hängt am Rückstand je Spieltag, und wer keinen
  // Spieltag mitgetippt hat, soll dafür auch nicht entschädigt werden.
  const imBoard = new Set(board.map((e) => e.userId));
  const nurSaison = [...new Set(seasonTips.map((s) => s.user_id))]
    .filter((id) => !imBoard.has(id))
    .map((id) => ({ userId: id, name: benenne(id), total: 0, tips: 0, gewertet: 0 }));

  return [...board, ...nurSaison]
    .map((e) => {
      const tipps = Object.fromEntries(
        seasonTips.filter((s) => s.user_id === e.userId).map((s) => [s.wetten_id, s.wert])
      );
      const s = scoreSaison({ matches, tipps, saison: rules.saison });
      return { ...e, saison: s.gesamt, total: e.total + s.gesamt };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .map((e, i) => ({ ...e, rank: i + 1 }));
}
