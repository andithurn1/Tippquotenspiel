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

  // ── Die vier Wertungs-Leitplanken ─────────────────────────
  // ⚠️ Gemeinsame Begründung, und sie ist eine MESSUNG: alle sechs vermessenen
  // Presets tragen bei diesen vier denselben Wert (winnerFloor true,
  // perGameCap null, favFlopPenalty 0, modCap 2,5). Eine Stufe-2-Stufe, die
  // davon abweicht, wäre also ein Regelwerk, das niemand vermessen hat —
  // genau das, wovor `naeheFelder()` in einfachRegler.js warnt („ein selbst
  // gewähltes k liess im Simulator sofort den Zocker mit 97 % gewinnen").
  // Sie bleiben deshalb in der Profi-Ansicht, wo `reglerWarnung.js` das
  // Empfehlungsband dazu zeigt.
  winnerFloor:
    "Sieger-Boden: in ALLEN sechs vermessenen Presets an. Ihn abzuschalten "
    + "ergibt ein Regelwerk, das niemand vermessen hat — dafür gibt es die "
    + "Profi-Ansicht mit ihrem Empfehlungsband.",
  perGameCap:
    "Deckel je Spiel: in allen Presets aus (`null`). Er ist eine Notbremse "
    + "gegen Ausreißer, keine Geschmacksfrage — auf Stufe 1/2 gäbe es keine "
    + "Antwort, die ein Admin ohne Messung geben könnte.",
  favFlopPenalty:
    "Favoriten-Malus: in allen Presets 0. Er greift nur in einem sehr engen "
    + "Fall (Favorit getippt, Favorit verliert) und ist damit eine "
    + "Feinjustierung, keine Runden-Idee.",
  modCap:
    "Obere Leitplanke des additiven Modifikator-Topfs, in allen Presets 2,5. "
    + "Kein Wunsch, sondern die Folge dessen, was eingeschaltet ist — die "
    + "Bündel von Stufe 1 und 2 halten sie stimmig, siehe `modFloor`.",

  // ── Der Joker-Unterbau ────────────────────────────────────
  // Diese drei beschreiben, WIE Joker verwaltet werden, nicht wie sich die
  // Runde anfühlt. Ein Admin auf Stufe 1/2 wählt „ein Joker pro Spieltag"
  // oder „Münzen verteilen" — er fragt nicht nach einer Währung.
  jokerBasis:
    "Die Grundform, die JEDER Joker trägt (wer darf, wer sieht es, wann "
    + "verfällt er). Stufe 1 und 2 setzen den Joker-MODUS; die Grundform "
    + "kommt in beiden Fällen aus dem Standard und braucht keine eigene Frage.",
  budget:
    "Eine gemeinsame Währung, in der Joker etwas KOSTEN — ein Unterbau für "
    + "Runden, die mehrere Joker-Arten gegeneinander abwägen wollen. Auf "
    + "Stufe 1/2 gibt es dafür den Wettmodus („Münzen verteilen“), der "
    + "dieselbe Frage in einer Form stellt, die ohne Vorwissen beantwortbar ist.",
  limitKlassen:
    "Benannte Gruppen von Joker-Arten mit gemeinsamem Kontingent — sie "
    + "greifen quer über mehrere Ebenen und setzen voraus, dass man diese "
    + "Ebenen schon kennt. Die Bündel von Stufe 1/2 deckeln jede Art einzeln.",

  tippfenster:
    "Wann ein Spiel tippbar wird, hängt daran, wann echte Quoten vorliegen "
    + "(wenige Tage vorher) — eine Betriebsfrage der Runde, kein Spielgefühl. "
    + "Die Vorgabe von einer Woche passt zu jedem Charakter.",

  // ⚠️ Der einzige Eintrag hier, der ein KANDIDAT für Stufe 2 ist, sobald er
  // vermessen ist. Er steht bewusst als Begründung und nicht als Lücke da,
  // weil der Nutzer ihn ausdrücklich als Admin-Option entschieden hat
  // (30.07.) — mit Standard AUS.
  tippEinfluss:
    "Ob die Gruppe die Quoten mitbewegt. Der eigentliche Regler ist die "
    + "MARKTTIEFE („gegen wie viele virtuelle Mitspieler tretet ihr an“), und "
    + "die ist eine Kalibrierungszahl, keine Geschmacksfrage. Kandidat für "
    + "Stufe 2, sobald ein Balance-Durchgang sie vermessen hat.",
};

// ── Teil 2: hat die PROFI-Ansicht das Feld überhaupt? ───────
//
// 🔴 Die Lücke in Teil 1, und sie hat am 06.08.2026 einen echten Fund
// durchgelassen: `tippfenster` steht mit Begründung in `NUR_PROFI`, also galt
// es als „erreichbar in Stufe 3". Nachgesehen hatte das niemand — und die
// Profi-Ansicht zeigte nur die Vorlaufzeit. Der ANKER („öffnet der Spieltag
// als Block?") war im Regelwerk, im Creator-Code, in `sanitizeRules` — und in
// keiner Oberfläche. Schlimmer: der Vorlauf-Knopf ersetzte das ganze Objekt
// und löschte ihn dabei.
//
// Gemessen wird auf BLATT-Ebene, nicht auf Block-Ebene. Über den Block
// gerechnet wäre `tippfenster` „vorhanden" gewesen, weil `vorlaufStunden`
// vorkommt — genau der blinde Fleck.
//
// ⚠️ Textsuche über die Komponenten, keine Render-Analyse. Sie kann ein Feld
// übersehen, das nur über eine Variable angesprochen wird; dafür kostet sie
// nichts. Ein Verdacht, den man in zehn Sekunden prüft, ist mehr wert als eine
// perfekte Analyse, die niemand startet — dieselbe Abwägung wie bei
// `npm run tot`.
//
// Der Aufrufer reicht den QUELLTEXT herein (Skript und Test lesen ihn je
// selbst): so bleibt diese Datei frei von `node:fs` und damit bundlebar.
export const OHNE_OBERFLAECHE = {
  oddsMode:
    "Woher die Quoten kommen, entscheidet der Betrieb und nicht der Admin — "
    + "das Feld existiert für den späteren Umschalter auf die echte API.",
  modFloor:
    "Untere Leitplanke des Modifikator-Topfs. Sie wird nicht eingestellt, "
    + "sondern folgt aus dem, was eingeschaltet ist — siehe `NUR_PROFI`.",
};

// Alle BLATT-Pfade des Regelwerks: `duell.block.restanteil` statt `duell`.
export function blattFelder() {
  const out = [];
  const geh = (obj, pfad) => {
    for (const [k, v] of Object.entries(obj ?? {})) {
      const p = pfad ? `${pfad}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) geh(v, p);
      else out.push(p);
    }
  };
  geh(sanitizeRules(DEFAULT_RULES), "");
  return out.filter((p) => p !== "name");
}

// Welche Blätter kommen im übergebenen Oberflächen-Quelltext NICHT vor?
export function fehlendeOberflaeche(uiQuelltext = "") {
  return blattFelder().filter((p) => {
    const name = p.split(".").pop();
    if (OHNE_OBERFLAECHE[name] || OHNE_OBERFLAECHE[p]) return false;
    return !new RegExp(`\\b${name}\\b`).test(uiQuelltext);
  });
}

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
