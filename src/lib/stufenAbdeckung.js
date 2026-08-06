// ============================================================
//  STUFEN-ABDECKUNG — welche Einstellung ist auf welcher Stufe erreichbar?
//
//  🔴 Der Baukasten-Grundsatz stellt drei Fragen an JEDE neue Einstellung
//  (CLAUDE.md, „Tiefe UND Einfachheit"), und die letzte lautet:
//
//    „Eine Einstellung, die nur in Stufe 3 auftaucht und in Stufe 1/2 gar
//     nicht vorkommt, ist nicht fertig. Gehört sie wirklich nur ins
//     Profi-Gehäuse, ist das ausdrücklich zu BEGRÜNDEN, statt sie
//     stillschweigend dort abzulegen."
//
//  Diese Datei macht daraus eine ZAHL. Gemessen am 06.08.2026 waren 21 von 37
//  Regel-Feldern nur in der Profi-Ansicht erreichbar — und niemand konnte
//  sagen, welche davon dort hingehören und welche vergessen wurden. Genau das
//  ist der Unterschied zwischen einer Lücke und einer Entscheidung.
//
//  ── Wie „erreichbar" gemessen wird ──
//  Stufe 1: mindestens ein Runden-Charakter setzt das Feld anders als die
//           Vorgabe. (Ein Charakter, der überall die Vorgabe lässt, hat zu dem
//           Feld nichts gesagt.)
//  Stufe 2: mindestens eine Regler-Stufe in `einfachRegler.js` setzt es.
//
//  ⚠️ Das ist eine STRUKTUR-Messung, keine Wertungs-Messung. Ob eine
//  Einstellung etwas BEWIRKT, misst `npm run greift`; ob sie ERREICHBAR ist,
//  misst diese hier. Beide Fragen sind schon einzeln falsch beantwortet worden.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { DEFAULT_RULES, sanitizeRules } from "./engine";
import { CHARAKTERE } from "./charaktere";
import { REGLER } from "./einfachRegler";

// ── Die ausdrücklichen Begründungen ─────────────────────────
// Ein Feld darf nur dann allein in der Profi-Ansicht stehen, wenn hier ein
// Satz dazu steht. Ein Feld ohne Eintrag und ohne Stufe-1/2-Anbindung ist eine
// LÜCKE — genau das war `ereignisse` bis zum 06.08.2026.
//
// ⚠️ Diese Liste ist keine Ausnahmeliste zum Vollmachen. Wer ein Feld hier
// einträgt, statt es anzubinden, muss den Satz auch vertreten können.
export const NUR_PROFI = {
  displayScale:
    "Reine Anzeige-Skalierung, nie Fairness — und sie wird ohnehin empfohlen "
    + "(`recommendedDisplayScale`). Auf Stufe 1/2 gäbe es nichts zu entscheiden.",
  reglerFeinheit:
    "Eine Einstellung DER PROFI-ANSICHT selbst (wie fein die Regler rasten). "
    + "Auf Stufe 1/2 gibt es keine Regler, an denen sie etwas ändern könnte.",
  oddsMode:
    "Woher die Quoten kommen — eine Infrastruktur-Frage der Runde, kein "
    + "Spielgefühl. Sie gehört zum Anlegen, nicht zum Charakter.",
  modFloor:
    "Untere Leitplanke des additiven Modifikator-Topfs. Kein Wunsch, sondern "
    + "die Folge dessen, was eingeschaltet ist — die Bündel halten sie stimmig.",
  zeitachse:
    "Was „Spieltag 5“ in einer Runde über mehrere Ligen heißt. Struktur, keine "
    + "Wertung: sie folgt aus der Spielauswahl und hat auf Stufe 1/2 keine "
    + "Frage, die ein Admin beantworten könnte.",
  spiele:
    "Welche Spiele zur Runde gehören, wird beim ANLEGEN gewählt (eigene "
    + "Oberfläche mit Wettbewerben, Vereinen und Spieltag-Bereich) und nicht "
    + "über einen Charakter — sonst gäbe es zwei Wege zur selben Auswahl.",
};

// Alle Regel-Felder, über die überhaupt geredet wird. `name` ist der
// Runden-Name und keine Einstellung.
export function regelFelder() {
  return Object.keys(sanitizeRules(DEFAULT_RULES)).filter((k) => k !== "name");
}

// Setzt irgendein Charakter dieses Feld anders als die Vorgabe?
function stufe1Felder() {
  const basis = sanitizeRules(DEFAULT_RULES);
  const out = new Set();
  for (const c of CHARAKTERE) {
    for (const f of regelFelder()) {
      if (JSON.stringify(c.rules?.[f]) !== JSON.stringify(basis[f])) out.add(f);
    }
  }
  return out;
}

// Setzt irgendeine Regler-Stufe dieses Feld?
function stufe2Felder() {
  const out = new Set();
  for (const r of REGLER) for (const s of r.stufen) for (const f of Object.keys(s.werte)) out.add(f);
  return out;
}

export function abdeckung() {
  const s1 = stufe1Felder();
  const s2 = stufe2Felder();
  return regelFelder().map((feld) => ({
    feld,
    stufe1: s1.has(feld),
    stufe2: s2.has(feld),
    begruendung: NUR_PROFI[feld] ?? null,
  }));
}

// Die Lücken: nur in der Profi-Ansicht und ohne Begründung.
export function luecken() {
  return abdeckung().filter((a) => !a.stufe1 && !a.stufe2 && !a.begruendung).map((a) => a.feld);
}

// ⚠️ Der umgekehrte Fehler, der genauso zählt: eine Begründung, die gar nicht
// mehr stimmt. Wer ein Feld nachträglich an Stufe 1 oder 2 hängt und den
// Eintrag stehen lässt, hinterlässt eine Behauptung, die das Gegenteil
// beschreibt — und beim nächsten Durchgang glaubt ihr jemand.
export function ueberholteBegruendungen() {
  return abdeckung().filter((a) => a.begruendung && (a.stufe1 || a.stufe2)).map((a) => a.feld);
}
