// ============================================================
//  SAISON-FENSTER — darf diese Wette JETZT noch abgegeben werden?
//
//  🔴 Der Befund vom 06.08.2026: das Freischalt-Fenster war ein
//  `disabled`-Attribut. `SaisonTipps.jsx` zeigte den Zustand richtig an und
//  sperrte das Auswahlfeld — der STORE nahm jede Wette zu jeder Zeit entgegen.
//  Eine Regel, die nur in der Oberfläche steht, ist eine Vereinbarung, keine
//  Regel; genau derselbe Satz steht in der Roadmap schon über den
//  Quoten-Snapshot.
//
//  Warum das mehr ist als Formsache: die Fenster tragen eine FAIRNESS-Aussage.
//  „Wer gewinnt die Champions League?" vor dem 1. Spieltag ist Raten; wer
//  später tippen darf, weiß mehr bei gleicher Punktzahl. Deshalb gibt es
//  immer ein Fenster und nie nur einen Startpunkt (siehe saisonwetten.js).
//
//  ⚠️ Das ist eine CLIENT-seitige Sperre und ersetzt keine Server-Prüfung.
//  Sie schließt die Lücke zwischen Anzeige und Speicherung, nicht die zwischen
//  Client und Datenbank — dafür braucht es einen Trigger bzw. eine API-Route
//  (siehe „RLS-Durchgang" in der Roadmap). Aber sie sorgt dafür, dass die
//  Regel EINMAL formuliert ist und nicht zweimal: in der Anzeige und in der
//  Speicherung dieselbe Funktion.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { freigabeStatus, sanitizeSaison, wettenId } from "./saisonwetten";
import { saisonLage } from "./wettbewerbe";

// Der Zustand EINER Wette, aus den Spielen DIESER Runde. Beide Fälle in einer
// Funktion, damit die Oberfläche und der Store nicht auseinanderlaufen können:
//
//   mit Fenster  → `freigabeStatus` (Spieltag DES WETTBEWERBS der Wette)
//   ohne Fenster → offen, solange die Saison der Runde nicht angefangen hat
export function wettenStatus({ wette, matches = [], jetzt = Date.now() } = {}) {
  const { gestartet, stand } = saisonLage(matches, jetzt);
  if (wette?.abSpieltag == null) {
    return gestartet
      ? { offen: false, zustand: "vorbei", text: "Saison läuft — vor dem 1. Spieltag abzugeben" }
      : { offen: true, zustand: "immer", text: "jederzeit abgebbar" };
  }
  return freigabeStatus(wette, stand);
}

// Darf gespeichert werden? Gibt `null` zurück, wenn ja — sonst den GRUND als
// Satz. Ein `false` allein reicht nicht: der Store muss dem Spieler sagen
// können, ob er zu früh oder zu spät dran ist, sonst rät er.
//
// ⚠️ Eine Wette, die es im Regelwerk gar nicht gibt, wird ebenfalls abgelehnt.
// Ohne diese Zeile ließe sich eine beliebige `wettenId` ablegen; sie zählte
// nie, stünde aber für immer in der Tabelle.
export function darfSaisonTippen({ rules, id, matches = [], jetzt = Date.now() } = {}) {
  const saison = sanitizeSaison(rules?.saison);
  if (!saison.enabled) return "In dieser Runde gibt es keine Saison-Wetten.";
  // ⚠️ `wettenId()` und nicht `w.key`: eine Wette mit `ausser: [...]` ist eine
  // EIGENE Wette („bester Schütze außer Bayern") und trägt deshalb eine
  // eigene Id. Über den Typ-Schlüssel verglichen träfe die Sperre die
  // falsche Variante.
  const wette = saison.wetten.find((w) => wettenId(w) === id);
  if (!wette) return "Diese Wette gehört nicht zu dieser Runde.";
  const status = wettenStatus({ wette, matches, jetzt });
  return status.offen ? null : `Nicht abgebbar: ${status.text}.`;
}
