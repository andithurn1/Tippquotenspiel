// ============================================================
//  SPOTT-POST — Spott, der in der Auswertung des Anderen ankommt (SP1)
//
//  Andi, 29.08.2026, zuerst als Wunsch:
//    „wenn man selbst sehr gut getippt hat, jemand anderem der schlecht
//     getippt hat eine Nachricht zu hinterlassen bzw. auch aus einer
//     Vorauswahl zu wählen welcher QT Fanclip ihm eingespielt wird"
//
//  Und dann die Fassung, die den Bau überhaupt möglich gemacht hat:
//    „soll ihm in der Auswertung angezeigt werden samt dem QT Kurzclip, wenn
//     der schlechtere Tipper nach dem guten Tipper die App bzw Auswertung
//     öffnet … egtl macht das immer nur nach der Gesamtspieltagsabrechnung
//     Sinn"
//
//  ── 🔴 Warum genau DAS die Sache baubar macht ──
//  „Ihm eingespielt" klang nach ZUSTELLEN: Push, Benachrichtigungsrechte,
//  Betriebssystem, Zustellquittung — und damit hing SP1 an der nativen App.
//  Andis Fassung ist ein ABHOLEN: der Spott liegt bereit und wird gezeigt,
//  wenn der Getroffene die Auswertung öffnet. Dafür braucht es eine Tabelle
//  und einen Ort. Sonst nichts.
//
//  ⚠️ `taunts.js` gibt es schon und bleibt, wie es ist: dort geht Spott in
//  JEDE Richtung und wird geteilt. Hier ist etwas anderes — er wird
//  HINTERLEGT, in eine Richtung, und nur wer gut war, darf.
//
//  ── 🔴 Die drei Regeln, die das von „Nachrichten schreiben" unterscheiden ──
//
//  **① Erst nach der Spieltagsabrechnung.** Vorher weiß niemand, wer gut oder
//  schlecht lag — ein Spott davor wäre geraten. Andis Zeitpunkt: „Montag
//  23:59 oder Donnerstag 23:59", also wenn der Spieltag durch ist.
//
//  **② Nur nach unten, und nur von oben.** Wer selbst gut war, darf jemanden
//  aufziehen, der schlecht lag. Das ist eine Wertungsfrage und Andis
//  ausdrückliche: Spott als BELOHNUNG statt als Dauerrecht.
//
//  **③ Einer je Ziel und Spieltag.** Dieselbe Grenze wie bei `taunts.js`
//  (`MAX_PRO_ZIEL_UND_SPIELTAG`) — sonst wird aus einer Pointe eine
//  Belästigung, und zwar in genau dem Moment, in dem jemand ohnehin schlecht
//  dasteht.
//
//  ⏳ **Die Schwellen sind PLATZHALTER** (Balancing = Endphase): ab wann
//  jemand „sehr gut" und „schlecht" getippt hat, ist eine Balance-Frage.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { spieltagKey } from "./spieltag";

// ============================================================
//  🔴 DIE ADMIN-EINSTELLUNG (Andi, 29.08.2026)
//
//    „ich würde das ganze mit der Benachrichtigung ohnehin als optional vom
//     Admin einstellen, wobei das schon erstmal standardausgewählt ist …
//     gibt halt auch empfindliche Leute"
//
//  ⚠️ **Standard AN, und das ist eine bewusste Asymmetrie.** Eine Funktion,
//  die niemand findet, gibt es nicht — sie muss also erst einmal da sein.
//  Aber sie muss sich mit EINEM Griff abschalten lassen, ohne dass jemand
//  begründen muss, warum ihm das zu viel ist.
//
//  🔴 Und zwar für die GANZE Runde, nicht je Person. Eine Runde, in der
//  einige spotten dürfen und andere nicht, erklärt niemandem, warum er nichts
//  bekommt — und wer sich ausklinkt, macht das öffentlich. Der Admin
//  entscheidet für alle, so wie bei den Fremdjokern (`eingriffe.enabled`).
//
//  ⏳ Eine PERSÖNLICHE Abschaltung wäre die feinere Lösung und ist offen:
//  sie gehört zu den Anzeige-Stufen, nicht ins Regelwerk der Runde.
// ============================================================
export const DEFAULT_SPOTT = {
  enabled: true,
  // ⚠️ Auch der Clip einzeln abschaltbar: ein Text ist etwas anderes als ein
  // eingespieltes Video, und manche Runde will das eine ohne das andere.
  clips: true,
};

export function sanitizeSpott(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  return {
    enabled: p.enabled !== false,
    clips: p.clips !== false,
  };
}

// ⏳ PLATZHALTER. „Sehr gut" heißt: im oberen Drittel des Spieltags.
// „Schlecht": im unteren Drittel. An EINER Stelle, damit die Endphase sie an
// einer Stelle festzurrt.
export const SPOTT_SCHWELLEN = {
  senderAnteil: 1 / 3,     // oberes Drittel darf spotten
  zielAnteil: 1 / 3,       // unteres Drittel darf gespottet werden
  minSpieler: 4,           // darunter ist „oberes Drittel" eine Person
  proZielUndSpieltag: 1,   // dieselbe Grenze wie bei taunts.js
  haltbarTage: 14,         // danach verschwindet der Spott von selbst
};

// ============================================================
//  Wer stand wo? — aus dem Spieltags-Board, nicht selbst gerechnet
//
//  ⚠️ `board` ist die Punkteliste DIESES Spieltags, wie die Auswertung sie
//  ohnehin hat: `[{ userId, total }]`. Sie wird hier nur sortiert, nicht neu
//  berechnet — die Wertung ist die eine Wahrheit über „wer war gut".
// ============================================================
function raenge(board = []) {
  const sauber = (board ?? []).filter((z) => z && z.userId != null);
  const sortiert = [...sauber].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
  return { sortiert, n: sortiert.length };
}

export function stehtOben(board, userId, anteil = SPOTT_SCHWELLEN.senderAnteil) {
  const { sortiert, n } = raenge(board);
  if (n < SPOTT_SCHWELLEN.minSpieler) return false;
  const i = sortiert.findIndex((z) => z.userId === userId);
  return i >= 0 && i < Math.max(1, Math.floor(n * anteil));
}

export function stehtUnten(board, userId, anteil = SPOTT_SCHWELLEN.zielAnteil) {
  const { sortiert, n } = raenge(board);
  if (n < SPOTT_SCHWELLEN.minSpieler) return false;
  const i = sortiert.findIndex((z) => z.userId === userId);
  return i >= 0 && i >= n - Math.max(1, Math.floor(n * anteil));
}

// ============================================================
//  Darf ich diesen Spott hinterlegen?
//
//  🔴 Gibt IMMER einen Grund zurück, wenn nein — ein Knopf, der nichts tut
//  und nicht sagt warum, wirkt kaputt.
// ============================================================
export function darfSpotten({
  board = [], vonId, aufId, spieltag, bereitsGesendet = [], abgerechnet = false, spott = null,
} = {}) {
  // 🔴 Die Runde zuerst. Ist Spott dort aus, gibt es nichts weiter zu prüfen —
  // und die Antwort muss das auch sagen, statt eine der anderen Regeln
  // vorzuschieben.
  if (spott && sanitizeSpott(spott).enabled === false) {
    return { erlaubt: false, grund: "In dieser Runde ist Spott abgeschaltet." };
  }
  if (!vonId || !aufId) return { erlaubt: false, grund: "Absender oder Ziel fehlt." };
  if (vonId === aufId) return { erlaubt: false, grund: "Sich selbst kann man nicht aufziehen." };

  // ① Erst nach der Abrechnung. Vorher wäre jeder Spott geraten.
  if (!abgerechnet) {
    return { erlaubt: false, grund: "Der Spieltag ist noch nicht abgerechnet — warte die Auswertung ab." };
  }

  const { n } = raenge(board);
  if (n < SPOTT_SCHWELLEN.minSpieler) {
    // ⚠️ In einer Runde zu dritt ist „oberes Drittel" eine Person, und der
    // Spott träfe zwangsläufig immer dieselbe. Das ist kein Spiel mehr.
    return { erlaubt: false, grund: "Dafür seid ihr zu wenige in der Runde." };
  }

  // ② Nur von oben nach unten.
  if (!stehtOben(board, vonId)) {
    return { erlaubt: false, grund: "Dafür musst du an diesem Spieltag selbst weit vorn liegen." };
  }
  if (!stehtUnten(board, aufId)) {
    return { erlaubt: false, grund: "Diese Person lag an diesem Spieltag nicht weit genug hinten." };
  }

  // ③ Einer je Ziel und Spieltag.
  const key = spieltagKey(spieltag);
  const schon = (bereitsGesendet ?? []).filter(
    (s) => s?.auf_id === aufId && spieltagKey(s) === key).length;
  if (schon >= SPOTT_SCHWELLEN.proZielUndSpieltag) {
    return { erlaubt: false, grund: "Für diesen Spieltag hast du diese Person schon aufgezogen." };
  }

  return { erlaubt: true, grund: null };
}

// ============================================================
//  Was liegt für MICH bereit?
//
//  ⚠️ Ungesehenes zuerst, Ältestes zuerst — und nur, was noch haltbar ist.
//  Ein Spott von vor drei Monaten ist kein Spott mehr, sondern eine
//  Merkwürdigkeit.
// ============================================================
export function offenerSpott(post = [], meId, jetzt = Date.now()) {
  const grenze = jetzt - SPOTT_SCHWELLEN.haltbarTage * 24 * 3600e3;
  return (post ?? [])
    .filter((s) => s?.auf_id === meId && !s.gesehen_am)
    .filter((s) => {
      const t = Date.parse(s.erstellt_am ?? "");
      // ⚠️ Ohne lesbaren Zeitstempel NICHT wegwerfen: lieber einmal zu viel
      // zeigen als etwas verschlucken, das jemand abgeschickt hat.
      return !Number.isFinite(t) || t >= grenze;
    })
    .sort((a, b) => String(a.erstellt_am ?? "").localeCompare(String(b.erstellt_am ?? "")));
}

// ============================================================
//  Der fertige Eintrag
//
//  ⚠️ `spruch` ODER `clip` — mindestens eines. Ein leerer Spott ist ein
//  Stups ohne Inhalt, und genau das will Andis Funktion nicht sein.
// ============================================================
export function baueSpott({
  vonId, aufId, roundId, spieltag, spruch = "", clip = null, jetzt = Date.now(),
} = {}) {
  const text = String(spruch ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  if (!text && !clip) {
    return { ok: false, grund: "Wähle einen Spruch oder einen Clip.", spott: null };
  }
  return {
    ok: true,
    grund: null,
    spott: {
      von_id: vonId,
      auf_id: aufId,
      round_id: roundId ?? null,
      matchday: spieltag?.matchday ?? null,
      wettbewerb: spieltag?.wettbewerb ?? null,
      spruch: text || null,
      clip: clip ?? null,
      erstellt_am: new Date(jetzt).toISOString(),
      gesehen_am: null,
    },
  };
}
