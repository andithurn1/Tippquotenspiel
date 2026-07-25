// ============================================================
//  SPIELTAG ÖFFNEN — den Zustand eines Spieltags EINFRIEREN
//
//  `bigGame.js` rechnet aus, welches Spiel das brisanteste ist. Diese Datei
//  beantwortet die andere, ebenso wichtige Frage: WANN wird das entschieden —
//  und wie stellen wir sicher, dass es sich danach nie wieder ändert.
//
//  ── Warum das nicht beim Auswerten passieren darf ──
//  Der Spannungswert hängt am Tabellenstand. Der ändert sich jede Woche. Würde
//  man das Big Game beim Abrechnen bestimmen, hätte ein bereits abgegebener
//  Tipp plötzlich einen anderen Wert als beim Tippen — dieselbe Falle wie eine
//  nachträglich veränderte Quote. Deshalb: einmal beim ÖFFNEN des Spieltags
//  bestimmen, in die Snapshots schreiben, fertig.
//
//  ── Der feine Punkt: „geprüft" einfrieren, nicht nur „ist Big Game" ──
//  Ein Spieltag kann durchaus KEIN Big Game haben (kein Spiel reißt die
//  Schwelle). Würde man nur `bigGame: true` speichern, wäre so ein Spieltag
//  vom ungeöffneten nicht zu unterscheiden — und bekäme beim nächsten Aufruf
//  mit einem inzwischen gewachsenen Tabellenstand doch noch eines. Deshalb
//  trägt JEDER Snapshot eines geöffneten Spieltags `bigGameGeprueft: true`.
//  Das ist die eigentliche Sperre; `bigGame: true` trägt nur der Gewinner.
//
//  Reine Funktionen. Das Speichern ist Sache des Stores — diese Datei
//  berechnet nur, WAS gespeichert werden soll.
// ============================================================

import { bigGameFuer } from "./bigGame";
import { rangliste } from "./saisonwetten";

// Ist dieser Spieltag schon geöffnet worden?
export function istGeoeffnet(matches = []) {
  return matches.some((m) => m?.snapshot?.bigGameGeprueft === true);
}

// Spieltag öffnen: bestimmt das Big Game aus dem HEUTIGEN Tabellenstand und
// gibt die neuen Snapshots zurück. Ein zweiter Aufruf ändert nichts mehr.
//
//  matches   — die Spiele DIESES Spieltags (je mit `snapshot`)
//  gespielt  — alle bereits ausgewerteten Spiele der Saison (für die Tabelle)
export function spieltagOeffnen({
  spieltag, matches = [], gespielt = [], rules, gesamtSpieltage = 34,
} = {}) {
  if (!matches.length) {
    return { schonOffen: false, veraendert: false, bigGame: null, snapshots: {} };
  }
  if (istGeoeffnet(matches)) {
    // Schon eingefroren — der bestehende Stand gilt, auch wenn eine neue
    // Rechnung heute ein anderes Spiel wählen würde.
    const alter = matches.find((m) => m.snapshot?.bigGame === true);
    return {
      schonOffen: true, veraendert: false,
      bigGame: alter ? { matchId: alter.id ?? alter.snapshot?.matchId } : null,
      snapshots: {},
    };
  }

  const tabelle = rangliste(gespielt);
  const gewaehlt = bigGameFuer(matches.map((m) => m.snapshot), {
    tabelle, spieltag, gesamtSpieltage, bigGame: rules?.bigGame,
  });

  const snapshots = {};
  for (const m of matches) {
    const id = m.id ?? m.snapshot?.matchId;
    snapshots[id] = {
      ...m.snapshot,
      bigGameGeprueft: true,
      ...(gewaehlt && gewaehlt.matchId === id
        ? { bigGame: true, bigGameGrund: gewaehlt.begruendung }
        : {}),
    };
  }
  return { schonOffen: false, veraendert: true, bigGame: gewaehlt, snapshots };
}
