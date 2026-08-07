import { describe, it, expect } from "vitest";
import {
  GELTUNG_TYPEN, GELTUNG, GELTUNG_LIMITS, DEFAULT_GELTUNG,
  AUSWERTBARE_GELTUNGEN, istAuswertbar,
  sanitizeGeltung, geltungsfenster, giltAn, wirkSpieltage,
  jackpotFaktor, jackpotVerlauf, jackpotDeckelNach,
  beschreibeGeltung, reichweite, konflikte,
} from "@/lib/geltung";

describe("Katalog", () => {
  it("jeder Eintrag ist vollständig und eindeutig", () => {
    for (const g of GELTUNG_TYPEN) {
      expect(g.key && g.label && g.text).toBeTruthy();
      expect(Array.isArray(g.braucht)).toBe(true);
      expect(typeof g.einmalig).toBe("boolean");
      for (const p of g.parameter) {
        expect(g.standard[p]).toBeDefined();
        expect(GELTUNG_LIMITS[p]).toBeDefined();
      }
    }
    expect(new Set(GELTUNG_TYPEN.map((g) => g.key)).size).toBe(GELTUNG_TYPEN.length);
  });

  it("was keine Grundlage hat, lässt sich nicht einstellen", () => {
    expect(istAuswertbar("sofort")).toBe(true);
    expect(istAuswertbar("jackpot")).toBe(true);
    expect(istAuswertbar("handelbar")).toBe(false);
    expect(istAuswertbar("bisWiderruf")).toBe(false);
    expect(AUSWERTBARE_GELTUNGEN.length).toBeLessThan(GELTUNG_TYPEN.length);
  });

  // 🔴 Die Pflicht-Obergrenze aus der Roadmap: „jackpot braucht eine
  // Obergrenze, sonst entscheidet ein einzelner Spieltag die Saison." Ein
  // `min: 0` wäre der Aus-Schalter, den es hier bewusst nicht gibt.
  it("`maxFaktor` lässt sich nicht abschalten", () => {
    expect(GELTUNG_LIMITS.maxFaktor.min).toBeGreaterThan(1);
    expect(sanitizeGeltung({ typ: "jackpot", maxFaktor: 0 }).maxFaktor)
      .toBe(GELTUNG_LIMITS.maxFaktor.min);
  });
});

describe("sanitizeGeltung", () => {
  it("Unbekanntes und Unfertiges wird zu „sofort“", () => {
    expect(sanitizeGeltung({ typ: "gibtsNicht" })).toEqual(DEFAULT_GELTUNG);
    expect(sanitizeGeltung({ typ: "handelbar" })).toEqual(DEFAULT_GELTUNG);
    expect(sanitizeGeltung(null)).toEqual(DEFAULT_GELTUNG);
  });

  it("beschneidet Zahlen und setzt nur die eigenen Parameter", () => {
    expect(sanitizeGeltung({ typ: "fenster", n: 99 })).toEqual({ typ: "fenster", n: GELTUNG_LIMITS.n.max });
    expect(sanitizeGeltung({ typ: "fenster", n: 3, zuwachs: 40 })).toEqual({ typ: "fenster", n: 3 });
    expect(sanitizeGeltung({ typ: "jackpot" })).toEqual({ typ: "jackpot", zuwachs: 25, maxFaktor: 3 });
  });

  it("ist stabil: zweimal säubern ändert nichts mehr", () => {
    for (const g of AUSWERTBARE_GELTUNGEN) {
      const einmal = sanitizeGeltung({ typ: g.key });
      expect(sanitizeGeltung(einmal)).toEqual(einmal);
    }
  });
});

describe("geltungsfenster", () => {
  // ⚠️ Die Vorgabe ist das heutige Verhalten — sonst änderte jedes bestehende
  // Regelwerk stillschweigend seine Bedeutung.
  it("„sofort“ ist genau der Spieltag selbst", () => {
    expect(geltungsfenster({ geltung: { typ: "sofort" }, position: 5, spieltageGesamt: 34 }))
      .toEqual({ von: 5, bis: 5, dauer: 1, offen: false });
    expect(geltungsfenster({ geltung: null, position: 5 }))
      .toEqual({ von: 5, bis: 5, dauer: 1, offen: false });
  });

  it("„nächster Spieltag“ verschiebt um genau einen", () => {
    expect(geltungsfenster({ geltung: { typ: "naechsterSpieltag" }, position: 5, spieltageGesamt: 34 }))
      .toEqual({ von: 6, bis: 6, dauer: 1, offen: false });
  });

  // 🔴 Der letzte Spieltag hat keinen nächsten. Ohne diesen Fall bekäme ein
  // Pechvogel-Bonus am Saisonende stillschweigend die Wirkung von „sofort“.
  it("am letzten Spieltag ist „nächster Spieltag“ LEER, nicht „sofort“", () => {
    const f = geltungsfenster({ geltung: { typ: "naechsterSpieltag" }, position: 34, spieltageGesamt: 34 });
    expect(f.von).toBe(null);
    expect(f.dauer).toBe(0);
  });

  it("das Fenster deckt n Spieltage und endet am Saisonende", () => {
    expect(geltungsfenster({ geltung: { typ: "fenster", n: 3 }, position: 5, spieltageGesamt: 34 }))
      .toEqual({ von: 5, bis: 7, dauer: 3, offen: false });
    // Über das Saisonende hinaus wird abgeschnitten, nicht verlängert.
    expect(geltungsfenster({ geltung: { typ: "fenster", n: 5 }, position: 33, spieltageGesamt: 34 }))
      .toEqual({ von: 33, bis: 34, dauer: 2, offen: false });
  });

  it("„rest“ hängt daran, wann es entsteht", () => {
    expect(geltungsfenster({ geltung: { typ: "rest" }, position: 30, spieltageGesamt: 34 }).dauer).toBe(5);
    expect(geltungsfenster({ geltung: { typ: "rest" }, position: 2, spieltageGesamt: 34 }).dauer).toBe(33);
  });

  it("„bis eingelöst“ ist offen — was es beendet, weiß nur der Store", () => {
    const f = geltungsfenster({ geltung: { typ: "bisAusgeloest" }, position: 5, spieltageGesamt: 34 });
    expect(f.offen).toBe(true);
    expect(f.bis).toBe(34);
  });

  // 🔴 Dieselbe Falle wie bei `feuert`: `Number(null) === 0`, und ein Fenster
  // ab Spieltag 0 sähe aus wie eines, das von Anfang an gilt.
  it("ohne Position gibt es KEIN Fenster", () => {
    expect(geltungsfenster({ geltung: { typ: "fenster", n: 3 } })).toBe(null);
    expect(geltungsfenster({ geltung: { typ: "fenster", n: 3 }, position: null })).toBe(null);
    expect(geltungsfenster({ geltung: { typ: "fenster", n: 3 }, position: 0 })).toBe(null);
  });

  it("ohne Saisonlänge bleibt ein offenes Fenster offen statt geraten", () => {
    const f = geltungsfenster({ geltung: { typ: "rest" }, position: 5 });
    expect(f.bis).toBe(null);
    expect(f.offen).toBe(true);
  });
});

describe("giltAn", () => {
  const gesamt = 34;
  it("trifft genau die Spieltage des Fensters", () => {
    const gilt = (geltung, erworbenAn) => [...Array(gesamt).keys()].map((i) => i + 1)
      .filter((position) => giltAn({ geltung, erworbenAn, position, spieltageGesamt: gesamt }));
    expect(gilt({ typ: "sofort" }, 10)).toEqual([10]);
    expect(gilt({ typ: "naechsterSpieltag" }, 10)).toEqual([11]);
    expect(gilt({ typ: "fenster", n: 3 }, 10)).toEqual([10, 11, 12]);
    expect(gilt({ typ: "rest" }, 32)).toEqual([32, 33, 34]);
  });

  it("vor dem Beginn gilt es nicht", () => {
    expect(giltAn({ geltung: { typ: "naechsterSpieltag" }, erworbenAn: 10, position: 10, spieltageGesamt: gesamt }))
      .toBe(false);
  });
});

// 🔴 Der Vertrag mit `wirkung.js`: ein Fenster streckt einen FAKTOR und
// vervielfacht keine Gutschrift. Andersherum wäre das Fenster eine
// Multiplikation — und damit genau der Punkte-Kanal, den `wirkung.js`
// ausschließt.
describe("wirkSpieltage — einmalig oder durchgehend", () => {
  it("ein Faktor läuft über das ganze Fenster", () => {
    expect(wirkSpieltage({ geltung: { typ: "fenster", n: 3 }, position: 5, spieltageGesamt: 34, istFaktor: true }))
      .toEqual([5, 6, 7]);
  });

  it("eine feste Gutschrift wird EINMAL gezahlt, am Beginn des Fensters", () => {
    expect(wirkSpieltage({ geltung: { typ: "fenster", n: 3 }, position: 5, spieltageGesamt: 34, istFaktor: false }))
      .toEqual([5]);
    expect(wirkSpieltage({ geltung: { typ: "rest" }, position: 5, spieltageGesamt: 34, istFaktor: false }))
      .toEqual([5]);
  });

  it("einmalige Geltungen bleiben einmalig, auch als Faktor", () => {
    expect(wirkSpieltage({ geltung: { typ: "naechsterSpieltag" }, position: 5, spieltageGesamt: 34, istFaktor: true }))
      .toEqual([6]);
    expect(wirkSpieltage({ geltung: { typ: "bisAusgeloest" }, position: 5, spieltageGesamt: 34, istFaktor: true }))
      .toEqual([5]);
  });

  it("ein leeres Fenster wirkt nirgends", () => {
    expect(wirkSpieltage({ geltung: { typ: "naechsterSpieltag" }, position: 34, spieltageGesamt: 34 })).toEqual([]);
  });
});

describe("Jackpot", () => {
  const j = { typ: "jackpot", zuwachs: 25, maxFaktor: 3 };

  it("wächst je Spieltag ohne Ausschüttung", () => {
    expect(jackpotFaktor(j, 0)).toBe(1);
    expect(jackpotFaktor(j, 2)).toBe(1.5);
    expect(jackpotFaktor(j, 4)).toBe(2);
  });

  // 🔴 Die Pflicht-Obergrenze. Ohne sie entscheidet ein einzelner Spieltag die
  // Saison — steht so in der Roadmap, und dieser Test hält es fest.
  it("hört bei `maxFaktor` auf, egal wie lange nichts passiert", () => {
    expect(jackpotFaktor(j, 20)).toBe(3);
    expect(jackpotFaktor(j, 200)).toBe(3);
    expect(jackpotFaktor({ ...j, maxFaktor: 1.5 }, 100)).toBe(1.5);
  });

  it("andere Geltungen haben keinen Jackpot-Faktor", () => {
    expect(jackpotFaktor({ typ: "sofort" }, 10)).toBe(1);
    expect(jackpotFaktor({ typ: "fenster", n: 3 }, 10)).toBe(1);
  });

  // 🔴 Die Lücke zählt ab der letzten AUSSCHÜTTUNG. Ab Saisonstart gezählt
  // wäre die zweite Ausschüttung größer als die erste, obwohl nichts liegen
  // geblieben ist.
  it("der Verlauf misst ab der letzten Ausschüttung", () => {
    const v = jackpotVerlauf(j, [3, 4, 10]);
    expect(v.map((x) => x.luecke)).toEqual([2, 0, 5]);
    expect(v.map((x) => x.faktor)).toEqual([1.5, 1, 2.25]);
  });

  it("der Verlauf ist sortiert und ohne Doppelte", () => {
    expect(jackpotVerlauf(j, [10, 3, 3, null, 0]).map((x) => x.position)).toEqual([3, 10]);
  });

  it("`jackpotDeckelNach` sagt, ab wann nichts mehr wächst", () => {
    expect(jackpotDeckelNach(j)).toBe(8);
    expect(jackpotFaktor(j, jackpotDeckelNach(j))).toBe(j.maxFaktor);
    expect(jackpotDeckelNach({ typ: "sofort" })).toBe(null);
  });
});

describe("Beschreibung und Vorschau", () => {
  it("jede auswertbare Geltung hat einen Satz im Klartext", () => {
    for (const g of AUSWERTBARE_GELTUNGEN) {
      const satz = beschreibeGeltung({ typ: g.key });
      expect(satz.length).toBeGreaterThan(5);
      expect(satz).not.toContain(g.key);
    }
  });

  it("nennt die Wirkung, nicht den Feldnamen", () => {
    expect(beschreibeGeltung({ typ: "fenster", n: 4 })).toContain("4 Spieltage");
    expect(beschreibeGeltung({ typ: "jackpot", zuwachs: 25, maxFaktor: 3 })).toContain("25 %");
  });

  it("`reichweite` macht aus der Einstellung eine Zahl", () => {
    expect(reichweite({ typ: "sofort" }, 34)).toBe(1);
    expect(reichweite({ typ: "fenster", n: 3 }, 34)).toBe(3);
    expect(reichweite({ typ: "naechsterSpieltag" }, 34)).toBe(1);
    // `rest` hängt am Zeitpunkt — deshalb ein genannter Beispiel-Spieltag.
    expect(reichweite({ typ: "rest" }, 34, 30)).toBe(5);
    expect(reichweite({ typ: "rest" }, 34)).toBe(18);
  });

  // Gegenprobe zur Vorschau: die Schätzung muss zur Wirklichkeit passen, sonst
  // stellt ein Admin etwas ein und bekommt etwas anderes.
  it("die Vorschau trifft, was `giltAn` wirklich tut", () => {
    for (const geltung of [{ typ: "sofort" }, { typ: "fenster", n: 4 }, { typ: "rest" }]) {
      const erworbenAn = 12;
      const wirklich = [...Array(34).keys()].map((i) => i + 1)
        .filter((position) => giltAn({ geltung, erworbenAn, position, spieltageGesamt: 34 })).length;
      expect(wirklich).toBe(reichweite(geltung, 34, erworbenAn));
    }
  });
});

describe("konflikte", () => {
  it("ein Aufschlag ohne Ende wird zur zweiten Wertungsregel", () => {
    const k = konflikte({ typ: "rest" }, { typ: "bonus", prozent: 20 });
    expect(k.some((x) => x.key === "faktor-ohne-ende" && x.korrigieren)).toBe(true);
    expect(konflikte({ typ: "rest" }, { typ: "punkte", betrag: 50 })
      .some((x) => x.key === "faktor-ohne-ende")).toBe(false);
  });

  it("sagt, dass eine Gutschrift über ein Fenster trotzdem einmal zahlt", () => {
    expect(konflikte({ typ: "fenster", n: 3 }, { typ: "punkte", betrag: 50 })
      .some((x) => x.key === "fenster-ohne-faktor")).toBe(true);
    expect(konflikte({ typ: "fenster", n: 3 }, { typ: "bonus", prozent: 20 })
      .some((x) => x.key === "fenster-ohne-faktor")).toBe(false);
  });

  it("die Vorgabe meldet nichts", () => {
    expect(konflikte({ typ: "sofort" }, { typ: "joker", n: 1 })).toEqual([]);
    expect(konflikte(null)).toEqual([]);
  });

  it("jede Meldung nennt ihre Korrektur", () => {
    for (const k of [
      ...konflikte({ typ: "rest" }, { typ: "bonus", prozent: 20 }),
      ...konflikte({ typ: "fenster", n: 3 }, { typ: "punkte", betrag: 50 }),
      ...konflikte({ typ: "jackpot" }, { typ: "joker", n: 1 }),
    ]) {
      expect(k.text.length).toBeGreaterThan(40);
      expect(typeof k.korrigieren).toBe("boolean");
    }
  });
});
