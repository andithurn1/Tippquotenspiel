import { describe, it, expect } from "vitest";

// ============================================================
//  SICHTBARE TEXTE — die Wächter für Kataloge
//
//  Jedes Modul hier führt Kataloge aus `{ key, label, desc }`, und die
//  Oberfläche zeigt `label`/`desc` UNGEPRÜFT an. Genau deshalb rutschen dort
//  Dinge durch, die kein Test bemerkt: am 31.07.2026 standen im
//  Spielerstellungs-Screen der Dateiname „ereignisse.js" und der
//  Code-Bezeichner „nurGegenFuehrende" mitten in einem Satz — gefunden erst
//  im Browser-Durchgang, bei 1421 grünen Tests.
//
//  Diese Datei prüft nicht, ob ein Text GUT ist. Sie prüft nur, dass er nicht
//  aus dem Code herausblutet.
// ============================================================

import { BUDGET_QUELLEN, TAKTE, VERFALL_TYPEN, PREISMODI, JOKER_ARTEN } from "./jokerBudget";
import { KOMBINATIONEN, NEIGUNGEN, DICHTEN, SCHAERFEN, ACHSEN } from "./jokerBibliothek";
import { WER, SICHT, VERFALL, WIDERRUF, SYMMETRIE, UMFANG } from "./jokerBasis";
import { AKTIVIERUNG_TYPEN, PRO_ZEITRAUM, WIRKUNGEN } from "./limitKlassen";
import { SPANNUNG_BEZUG, SPANNUNG_ART } from "./spannung";
import { BELOHNUNGS_TYPEN } from "./drehrad";
import { DUELL_TYPEN, PHASEN, ZIELWAHL, ANSAGE } from "./duellJoker";
import { AUFWAND_STUFEN } from "./aufwand";
import { REGLER_FEINHEITEN } from "./engine";
import { TEILBIBLIOTHEKEN } from "./teilbibliothek";

const KATALOGE = {
  BUDGET_QUELLEN, TAKTE, VERFALL_TYPEN, PREISMODI, JOKER_ARTEN,
  KOMBINATIONEN, NEIGUNGEN, DICHTEN, SCHAERFEN, ACHSEN,
  WER, SICHT, VERFALL, WIDERRUF, SYMMETRIE, UMFANG,
  AKTIVIERUNG_TYPEN, PRO_ZEITRAUM, WIRKUNGEN,
  SPANNUNG_BEZUG, SPANNUNG_ART,
  BELOHNUNGS_TYPEN,
  DUELL_TYPEN, PHASEN, ZIELWAHL, ANSAGE,
  AUFWAND_STUFEN,
  REGLER_FEINHEITEN,
};

// 🔴 Zwei-Währungen-Regel (design/waehrungen.md Abschnitt 2, ersetzt
// joker-ausloeser.md Abschnitt 0): der Shop-Topf heißt „Narren", der
// Wetteinsatz je Spiel heißt „Münzen". Absichtlich eine BENANNTE Liste statt
// eines Filters über alle Kataloge — die Einsatz-Texte (nicht in dieser
// Datei geprüft, siehe `engine.js`) SOLLEN „Münzen" sagen, nur die
// Shop-Kataloge nicht. `BELOHNUNGS_TYPEN` (drehrad.js) gehört dazu: geprüft
// am 03.08., der einzige Eintrag, der überhaupt eine Währung auszahlt
// (`budget`), zahlt auf den Shop-Topf — der Katalog ist NICHT gemischt. Ein
// neuer Shop-Katalog muss hier von Hand eingetragen werden, sonst prüft ihn
// niemand.
const SHOP_KATALOGE = { BUDGET_QUELLEN, TAKTE, VERFALL_TYPEN, PREISMODI, BELOHNUNGS_TYPEN };

// Sichtbare Texte aus einer Katalog-Map als [Herkunft, Text].
function sichtbareTexteAus(kataloge) {
  const out = [];
  for (const [name, liste] of Object.entries(kataloge)) {
    if (!Array.isArray(liste)) continue;
    for (const e of liste) {
      for (const feld of ["label", "desc"]) {
        if (typeof e?.[feld] === "string") out.push([`${name}.${e.key}.${feld}`, e[feld]]);
      }
    }
  }
  return out;
}

// Alle sichtbaren Texte als [Herkunft, Text].
function sichtbareTexte() {
  const out = sichtbareTexteAus(KATALOGE);
  // TEILBIBLIOTHEKEN ist verschachtelt ([{ aspekt, eintraege: [{key,label,desc}] }]),
  // passt also nicht in die flache KATALOGE-Map — hier zusätzlich einsammeln,
  // mit derselben Herkunfts-Form wie oben, nur um den Aspekt erweitert.
  for (const bibliothek of TEILBIBLIOTHEKEN) {
    for (const e of bibliothek.eintraege) {
      for (const feld of ["label", "desc"]) {
        if (typeof e?.[feld] === "string") {
          out.push([`TEILBIBLIOTHEKEN.${bibliothek.aspekt}.${e.key}.${feld}`, e[feld]]);
        }
      }
    }
  }
  return out;
}

describe("Sichtbare Katalog-Texte", () => {
  it("es gibt überhaupt welche zu prüfen", () => {
    expect(sichtbareTexte().length).toBeGreaterThan(60);
  });

  // Sprachregelung: design/waehrungen.md Abschnitt 2. Die Code-Bezeichner
  // heißen weiter `budget` — die Oberfläche sagt „Narren".
  it("sagen nie „Budget“", () => {
    const treffer = sichtbareTexte().filter(([, t]) => /Budget/i.test(t));
    expect(treffer.map(([wo, t]) => `${wo}: ${t}`)).toEqual([]);
  });

  // Zwei-Währungen-Regel, zweite Richtung: die Shop-Kataloge dürfen „Münzen"
  // nicht sagen — sonst laufen die beiden Wortwelten wieder auseinander,
  // sobald jemand einen Katalog ergänzt (design/waehrungen.md Abschnitt 2).
  it("Shop-Kataloge sagen „Narren“, nie „Münzen“", () => {
    const treffer = sichtbareTexteAus(SHOP_KATALOGE).filter(([, t]) => /Münzen/.test(t));
    expect(treffer.map(([wo, t]) => `${wo}: ${t}`)).toEqual([]);
  });

  it("enthalten keine Dateinamen", () => {
    const treffer = sichtbareTexte().filter(([, t]) => /\.(js|jsx|mjs|sql)\b/.test(t));
    expect(treffer.map(([wo, t]) => `${wo}: ${t}`)).toEqual([]);
  });

  // camelCase kommt im Deutschen nicht vor — ein Treffer ist immer ein
  // durchgerutschter Bezeichner (`nurGegenFuehrende`, `maxProSaison`, …).
  it("enthalten keine camelCase-Bezeichner", () => {
    const treffer = sichtbareTexte().filter(([, t]) => /\b[a-zäöüß]+[A-ZÄÖÜ][a-zA-ZäöüßÄÖÜ]*\b/.test(t));
    expect(treffer.map(([wo, t]) => `${wo}: ${t}`)).toEqual([]);
  });

  it("sind nicht leer und nicht abgeschnitten", () => {
    for (const [wo, t] of sichtbareTexte()) {
      expect(t.trim(), wo).not.toBe("");
      expect(t.trim().endsWith("…"), wo).toBe(false);
    }
  });
});
