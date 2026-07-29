import { describe, it, expect } from "vitest";
import { ausApiName, unbekannteKlubs, KLUB_ALIASE } from "./klubnamen";
import { vereineVon } from "./ligen";

describe("ausApiName", () => {
  it("übersetzt eine bekannte Abweichung", () => {
    expect(ausApiName("bl", "Bayern Munich")).toBe("FC Bayern München");
  });

  it("lässt einen Namen, der schon passt, unverändert", () => {
    expect(ausApiName("bl", "VfB Stuttgart")).toBe("VfB Stuttgart");
  });

  // Ein stillschweigend geratener Klub wäre der teuerste Fehler: die Quoten
  // lägen dann am falschen Spiel, und auffallen würde es niemandem.
  it("gibt einen unbekannten Namen UNVERÄNDERT zurück, statt zu raten", () => {
    expect(ausApiName("bl", "Irgendein FC")).toBe("Irgendein FC");
    expect(ausApiName("xx", "Bayern Munich")).toBe("Bayern Munich");
  });
});

describe("unbekannteKlubs", () => {
  it("meldet nichts, wenn alle Namen nach der Übersetzung passen", () => {
    const b = unbekannteKlubs(["Bayern Munich", "VfB Stuttgart"], ["FC Bayern München", "VfB Stuttgart"], "bl");
    expect(b.ok).toBe(true);
    expect(b.unbekannt).toEqual([]);
    expect(b.fehlend).toEqual([]);
  });

  it("nennt beide Richtungen getrennt", () => {
    const b = unbekannteKlubs(["Hull City"], ["FC Burnley"], "pl");
    expect(b.ok).toBe(false);
    expect(b.unbekannt).toEqual(["Hull City"]);
    expect(b.fehlend).toEqual(["FC Burnley"]);
  });

  it("zählt einen doppelt genannten Klub nur einmal", () => {
    const b = unbekannteKlubs(["Hull City", "Hull City"], [], "pl");
    expect(b.unbekannt).toEqual(["Hull City"]);
  });
});

// Die Bundesliga ist die Liga, deren Klubliste nachweislich stimmt (der
// Spielplan kam von OpenLigaDB mit denselben 18 Vereinen). Bricht dieser Test,
// hat sich entweder der Katalog oder die Alias-Liste bewegt.
describe("Bundesliga — die Abbildung ist vollständig", () => {
  it("jedes Alias zeigt auf einen Klub, den es bei uns wirklich gibt", () => {
    const unsere = new Set(vereineVon("bl"));
    for (const ziel of Object.values(KLUB_ALIASE.bl)) {
      expect(unsere.has(ziel), `„${ziel}" steht in keinem Katalog`).toBe(true);
    }
  });

  it("kein Alias ist überflüssig — es übersetzt wirklich eine Abweichung", () => {
    for (const [api, ziel] of Object.entries(KLUB_ALIASE.bl)) {
      expect(api, `„${api}" ist identisch mit dem Ziel`).not.toBe(ziel);
    }
  });
});
