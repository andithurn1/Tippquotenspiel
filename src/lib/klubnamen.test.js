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

// Ein Alias, das ins Leere zeigt, ist schlimmer als keines: der Name sieht
// übersetzt aus und passt trotzdem auf kein Match.
describe("Die Alias-Tabellen zeigen auf echte Klubs", () => {
  for (const liga of ["bl", "pl", "pd", "sa", "mls"]) {
    it(`${liga}: jedes Ziel steht wirklich im Katalog`, () => {
      const unsere = new Set(vereineVon(liga));
      for (const ziel of Object.values(KLUB_ALIASE[liga])) {
        expect(unsere.has(ziel), `„${ziel}" steht nicht in ${liga}`).toBe(true);
      }
    });

    it(`${liga}: kein Alias ist überflüssig`, () => {
      for (const [api, ziel] of Object.entries(KLUB_ALIASE[liga])) {
        expect(api, `„${api}" ist identisch mit dem Ziel`).not.toBe(ziel);
      }
    });
  }
});

// Jede Liga hat genau so viele Klubs, wie sie haben soll — der Fehler, der uns
// bei drei Ligen unterlaufen ist, wäre hier NICHT aufgefallen (die Anzahl
// stimmte ja), aber ein versehentlich gelöschter Klub schon.
describe("Liga-Besetzungen", () => {
  it("Bundesliga 18, die anderen drei je 20", () => {
    expect(vereineVon("bl")).toHaveLength(18);
    for (const liga of ["pl", "pd", "sa"]) expect(vereineVon(liga)).toHaveLength(20);
  });

  it("kein Klub steht doppelt in derselben Liga", () => {
    for (const liga of ["bl", "pl", "pd", "sa", "mls"]) {
      const v = vereineVon(liga);
      expect(new Set(v).size, `Dublette in ${liga}`).toBe(v.length);
    }
  });

  // Ein Klub in der Champions League, den keine Liga führt, ist ein
  // Widerspruch im Katalog — genau das war Girona, nachdem er aus La Liga
  // abgestiegen ist.
  it("jeder CL-Teilnehmer aus unseren vier Ligen steht auch in seiner Liga", () => {
    const ligaKlubs = new Set(["bl", "pl", "pd", "sa"].flatMap((l) => vereineVon(l)));
    const verwaist = vereineVon("cl").filter((k) => {
      // Nur prüfen, was aussieht wie ein Klub unserer vier Ligen: alle anderen
      // (Porto, Ajax, Celtic …) haben bei uns bewusst keine Liga.
      return ligaKlubs.has(k) === false && KLUB_LIGEN_VERDACHT.has(k);
    });
    expect(verwaist).toEqual([]);
  });
});

// Klubs, die in einer UNSERER vier Ligen spielen müssten, wenn sie in der CL
// stehen. Bewusst eine kurze, explizite Liste: die CL enthält absichtlich
// Teilnehmer aus Ligen, die wir gar nicht führen.
const KLUB_LIGEN_VERDACHT = new Set(["Girona FC", "RCD Mallorca", "Real Oviedo", "AC Pisa", "Hellas Verona", "US Cremonese", "FC Burnley", "West Ham United", "Wolverhampton Wanderers"]);
