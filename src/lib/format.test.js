import { describe, it, expect } from "vitest";
import { zahl, fmtFaktor, fmtFaktorOderAus } from "./format";
import { RULE_LIMITS } from "./engine";

// Der Regressionstest zu dem Fehler, aus dem dieses Modul entstanden ist:
// die Multiplikator-Regler stehen auf dem 0,05-Raster (und über
// `reglerFeinheit` auf bis zu 0,01), die Anzeige rundete aber auf eine
// Nachkommastelle. 1,15 wurde als „×1.2" ausgewiesen.
describe("Zahlen-Anzeige", () => {
  it("zeigt zwei Nachkommastellen, wo sie etwas sagen", () => {
    expect(zahl(1.15)).toBe("1,15");
    expect(zahl(2.45)).toBe("2,45");
    expect(zahl(0.75)).toBe("0,75");
  });

  it("lässt überflüssige Nullen weg", () => {
    expect(zahl(1.5)).toBe("1,5");
    expect(zahl(2)).toBe("2");
    expect(zahl(1.0)).toBe("1");
  });

  it("benutzt das deutsche Komma", () => {
    expect(zahl(1.25)).not.toContain(".");
    expect(fmtFaktor(1.25)).toBe("×1,25");
  });

  it("verträgt Unsinn, ohne etwas zu erfinden", () => {
    expect(zahl(undefined)).toBe("—");
    expect(zahl(NaN)).toBe("—");
    expect(zahl("viel")).toBe("—");
  });

  // ⚠️ Der Kern: JEDER Wert auf dem feinsten erlaubten Raster muss sich
  // unverändert wiederfinden. Wäre die Anzeige gröber als der Regler, sähe
  // der Nutzer eine Zahl, die er nie eingestellt hat.
  it("keine Rundung: jeder Wert auf dem 0,01-Raster bleibt erhalten", () => {
    for (let v = 100; v <= 250; v += 1) {
      const wert = +(v / 100).toFixed(2);
      expect(zahl(wert)).toBe(String(wert).replace(".", ","));
    }
  });

  it("„aus“ gilt NUR bei genau 1 — ein Dämpfer ist nicht aus", () => {
    expect(fmtFaktorOderAus(1)).toBe("aus");
    expect(fmtFaktorOderAus(0.75)).toBe("×0,75");
    expect(fmtFaktorOderAus(0.5)).toBe("×0,5");
    expect(fmtFaktorOderAus(1.25)).toBe("×1,25");
  });

  it("deckt die Spanne der Vereins-Faktoren ab, Dämpfer eingeschlossen", () => {
    const L = RULE_LIMITS.teamMods.teamFaktor;
    expect(L.min).toBeLessThan(1);          // Dämpfer sind möglich
    expect(fmtFaktorOderAus(L.min)).toBe(fmtFaktor(L.min));
    expect(fmtFaktorOderAus(L.max)).toBe(fmtFaktor(L.max));
  });
});
