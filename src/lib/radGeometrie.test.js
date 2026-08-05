import { describe, it, expect } from "vitest";
import { segmente, zielWinkel, segmentUnterZeiger, VOLLE_UMDREHUNGEN } from "./radGeometrie";
import { wahrscheinlichkeiten } from "./drehrad";

const FELDER = [
  { id: "f1", label: "Nichts", gewicht: 3 },
  { id: "f2", label: "Joker", gewicht: 1 },
  { id: "f3", label: "Punkte", gewicht: 4 },
];

describe("segmente", () => {
  it("die Winkel schließen den Kreis lückenlos", () => {
    const s = segmente(FELDER, wahrscheinlichkeiten(FELDER));
    expect(s[0].von).toBe(0);
    expect(s[s.length - 1].bis).toBeCloseTo(360, 9);
    for (let i = 1; i < s.length; i++) expect(s[i].von).toBeCloseTo(s[i - 1].bis, 9);
  });

  // 🔴 Der Kern der Spec: die FLÄCHE ist die Wahrscheinlichkeit. Von Hand:
  // Gewichte 3/1/4 auf Summe 8 → 135° / 45° / 180°.
  it("die Fläche entspricht dem Gewicht, nachgerechnet", () => {
    const s = segmente(FELDER, wahrscheinlichkeiten(FELDER));
    expect(s[0].bis - s[0].von).toBeCloseTo(135, 9);
    expect(s[1].bis - s[1].von).toBeCloseTo(45, 9);
    expect(s[2].bis - s[2].von).toBeCloseTo(180, 9);
  });

  it("ein Feld ohne Gewicht taucht gar nicht auf", () => {
    const felder = [...FELDER, { id: "f4", label: "Nie", gewicht: 0 }];
    const s = segmente(felder, wahrscheinlichkeiten(felder));
    expect(s.map((x) => x.id)).toEqual(["f1", "f2", "f3"]);
  });

  it("ein einzelnes Feld füllt den ganzen Kreis", () => {
    const eins = [{ id: "f1", label: "Immer", gewicht: 5 }];
    const s = segmente(eins, wahrscheinlichkeiten(eins));
    expect(s).toHaveLength(1);
    expect(s[0].von).toBe(0);
    expect(s[0].bis).toBeCloseTo(360, 9);
  });

  it("ohne jedes Gewicht gibt es keine Segmente", () => {
    const leer = [{ id: "f1", label: "A", gewicht: 0 }, { id: "f2", label: "B", gewicht: 0 }];
    expect(segmente(leer, wahrscheinlichkeiten(leer))).toEqual([]);
    expect(segmente([], [])).toEqual([]);
  });
});

describe("zielWinkel und segmentUnterZeiger — zeigt das Rad wirklich auf das gezogene Feld?", () => {
  const s = segmente(FELDER, wahrscheinlichkeiten(FELDER));

  // 🔴 Der wichtigste Test der Datei. Ohne ihn fällt ein vertauschtes
  // Vorzeichen erst auf, wenn jemand fragt, warum die Auszahlung nicht zum
  // Bild passt — das Rad zeigte dann systematisch das gespiegelte Feld.
  it("für JEDES Segment landet genau dieses unter dem Zeiger", () => {
    for (const ziel of s) {
      const w = zielWinkel(ziel);
      expect(segmentUnterZeiger(s, w).id, ziel.id).toBe(ziel.id);
    }
  });

  it("das gilt auch ohne die vollen Umdrehungen", () => {
    for (const ziel of s) {
      const w = zielWinkel(ziel, { reduziert: true });
      expect(segmentUnterZeiger(s, w).id, ziel.id).toBe(ziel.id);
    }
  });

  it("weniger Bewegung heißt: kein Vollkreis, gleiches Ergebnis", () => {
    const ziel = s[1];
    // Von Hand: Mitte von f2 liegt bei 135 + 45/2 = 157,5°.
    expect(ziel.mitte).toBeCloseTo(157.5, 9);
    expect(zielWinkel(ziel, { reduziert: true })).toBeCloseTo(-157.5, 9);
    expect(zielWinkel(ziel)).toBeCloseTo(VOLLE_UMDREHUNGEN * 360 - 157.5, 9);
    // Beide Winkel zeigen auf dasselbe Feld — die Umdrehungen sind Schmuck.
    expect(segmentUnterZeiger(s, zielWinkel(ziel)).id)
      .toBe(segmentUnterZeiger(s, zielWinkel(ziel, { reduziert: true })).id);
  });

  it("verträgt Unfug", () => {
    expect(zielWinkel(null)).toBe(0);
    expect(zielWinkel({})).toBe(0);
    expect(segmentUnterZeiger([], 0)).toBeNull();
  });

  // Ein sehr schmales Feld ist der Fall, bei dem eine ungenaue Rechnung
  // danebengreift — hier soll sie es beweisbar nicht tun.
  it("trifft auch ein sehr schmales Segment", () => {
    const felder = [
      { id: "gross", label: "Groß", gewicht: 999 },
      { id: "schmal", label: "Schmal", gewicht: 1 },
    ];
    const segs = segmente(felder, wahrscheinlichkeiten(felder));
    const schmal = segs.find((x) => x.id === "schmal");
    // Von Hand: 1 von 1000 → 0,36°.
    expect(schmal.bis - schmal.von).toBeCloseTo(0.36, 9);
    expect(segmentUnterZeiger(segs, zielWinkel(schmal)).id).toBe("schmal");
  });
});
