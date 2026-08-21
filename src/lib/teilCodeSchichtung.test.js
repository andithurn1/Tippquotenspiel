import { describe, it, expect } from "vitest";
import { DEFAULT_RULES, sanitizeRules, encodePreset, decodePreset } from "./engine";
import { bildeTeilCode, wendeTeilCodeAn, zerlegeTeilCode } from "./teilbibliothek";

// ============================================================
//  SCHICHTUNG DER CODES — Andis Ablauf vom 21.08.2026
//
//  „Erstmal nen Code für das Gesamtspiel … dann kann man nach und nach die
//  Teilebenen einzeln durch die jeweiligen Teilcodes abändern."
//
//  Dazu seine Regel: der übergeordnete Gesamt-Code überschreibt auch jede
//  vorherige Teil-Anpassung — die Teilebenen untereinander berühren sich aber
//  NICHT.
// ============================================================

const regelwerk = (teil) => sanitizeRules({ ...DEFAULT_RULES, ...teil });

describe("Schichtung: Gesamt-Code, dann Teilebenen", () => {
  it("ein Teil-Code ändert NUR seine Ebene", () => {
    const basis = regelwerk({ k: 1.4, joker: { ...DEFAULT_RULES.joker, enabled: true, faktor: 1.9 } });
    // Ein fremdes Regelwerk, das sich in BEIDEN Ebenen unterscheidet.
    const anderes = regelwerk({ k: 2.2, joker: { ...DEFAULT_RULES.joker, enabled: true, faktor: 1.2 } });
    const nurModifikatoren = bildeTeilCode(anderes, "modifikatoren");

    const ergebnis = wendeTeilCodeAn(basis, nurModifikatoren);
    expect(ergebnis.joker.faktor).toBe(1.2);   // Ebene übernommen
    expect(ergebnis.k).toBe(1.4);              // alles andere unberührt
  });

  // 🔴 Der Kern von Andis Ablauf: zwei Teil-Codes verschiedener Ebenen dürfen
  // sich nicht in die Quere kommen, egal in welcher Reihenfolge sie kommen.
  it("zwei verschiedene Ebenen berühren einander nicht", () => {
    const basis = regelwerk({});
    const a = regelwerk({ joker: { ...DEFAULT_RULES.joker, enabled: true, faktor: 1.8 } });
    const b = regelwerk({ saison: { ...DEFAULT_RULES.saison, enabled: true, gewicht: 3 } });

    const erst = wendeTeilCodeAn(basis, bildeTeilCode(a, "modifikatoren"));
    const dann = wendeTeilCodeAn(erst, bildeTeilCode(b, "saison"));

    expect(dann.joker.faktor).toBe(1.8);
    expect(dann.saison.gewicht).toBe(3);

    // Andere Reihenfolge, gleiches Ergebnis.
    const umgekehrt = wendeTeilCodeAn(
      wendeTeilCodeAn(basis, bildeTeilCode(b, "saison")),
      bildeTeilCode(a, "modifikatoren"),
    );
    expect(umgekehrt.joker.faktor).toBe(1.8);
    expect(umgekehrt.saison.gewicht).toBe(3);
  });

  // ⚠️ Dieselbe Ebene zweimal: der ZWEITE gewinnt. Das ist kein Fehler, aber
  // ohne Anzeige in der Oberfläche sieht es wie einer aus — deshalb merkt sich
  // die Spielerstellung, welcher Code je Ebene zuletzt geladen wurde.
  it("dieselbe Ebene zweimal — der zuletzt geladene gewinnt", () => {
    const basis = regelwerk({});
    const a = regelwerk({ joker: { ...DEFAULT_RULES.joker, enabled: true, faktor: 1.8 } });
    const b = regelwerk({ joker: { ...DEFAULT_RULES.joker, enabled: true, faktor: 1.3 } });
    const ergebnis = wendeTeilCodeAn(wendeTeilCodeAn(basis, bildeTeilCode(a, "modifikatoren")),
      bildeTeilCode(b, "modifikatoren"));
    expect(ergebnis.joker.faktor).toBe(1.3);
  });

  // 🔴 Andis Regel: „wenn der übergeordnetste Gesamt-Gamecode geändert wird,
  // wird natürlich auch die vorherige Anpassung überschrieben."
  it("der Gesamt-Code überschreibt auch vorherige Teil-Anpassungen", () => {
    const basis = regelwerk({});
    const teil = regelwerk({ joker: { ...DEFAULT_RULES.joker, enabled: true, faktor: 1.9 } });
    const mitTeil = wendeTeilCodeAn(basis, bildeTeilCode(teil, "modifikatoren"));
    expect(mitTeil.joker.faktor).toBe(1.9);

    // ⚠️ k liegt bei 1,2 und nicht höher: `sanitizeRules` deckelt es bei 1,6.
    // Ein Testwert außerhalb der Grenzen prüft die Grenze, nicht die Schichtung.
    const gesamt = regelwerk({ k: 1.2, joker: { ...DEFAULT_RULES.joker, enabled: true, faktor: 1.1 } });
    const nachGesamt = sanitizeRules(decodePreset(encodePreset(gesamt)));

    expect(nachGesamt.joker.faktor).toBe(1.1);   // die Teil-Anpassung ist weg
    expect(nachGesamt.k).toBe(1.2);
  });

  it("ein Teil-Code trägt seine Ebene im Code — Verwechslung ist erkennbar", () => {
    const code = bildeTeilCode(regelwerk({}), "saison");
    expect(zerlegeTeilCode(code).aspekt).toBe("saison");
    expect(zerlegeTeilCode(code).aspekt).not.toBe("modifikatoren");
  });
});
