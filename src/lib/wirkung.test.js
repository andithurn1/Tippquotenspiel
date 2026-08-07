import { describe, it, expect } from "vitest";
import {
  WIRKUNG_TYPEN, WIRKUNG, WIRKUNG_LIMITS, DEFAULT_WIRKUNG, RICHTUNGEN,
  AUSWERTBARE_WIRKUNGEN, istAuswertbar,
  sanitizeWirkung, beschreibeWirkung, wendeAn, konflikte,
} from "@/lib/wirkung";

const IDS = ["a", "b", "c", "d"];

describe("Katalog", () => {
  it("jeder Eintrag ist vollständig und eindeutig", () => {
    for (const w of WIRKUNG_TYPEN) {
      expect(w.key && w.label && w.text && w.topf).toBeTruthy();
      expect(RICHTUNGEN).toContain(w.richtung);
      expect(Array.isArray(w.braucht)).toBe(true);
      expect(Array.isArray(w.parameter)).toBe(true);
    }
    expect(new Set(WIRKUNG_TYPEN.map((w) => w.key)).size).toBe(WIRKUNG_TYPEN.length);
  });

  it("jeder Parameter hat eine Vorgabe im `standard`", () => {
    for (const w of WIRKUNG_TYPEN) {
      for (const p of w.parameter) expect(w.standard[p]).toBeDefined();
    }
  });

  it("alle drei Richtungen kommen vor", () => {
    for (const r of RICHTUNGEN) {
      expect(WIRKUNG_TYPEN.some((w) => w.richtung === r)).toBe(true);
    }
  });

  // Dieselbe Regel wie bei den Ereignissen und den Saison-Wetten: was keine
  // Grundlage hat, steht im Katalog und lässt sich nicht einstellen.
  it("nicht auswertbare Wirkungen sind als solche erkennbar", () => {
    expect(istAuswertbar("joker")).toBe(true);
    expect(istAuswertbar("umverteilung")).toBe(true);
    expect(istAuswertbar("rolle")).toBe(false);
    expect(istAuswertbar("sonderspiel")).toBe(false);
    expect(istAuswertbar("sperre")).toBe(false);
    expect(istAuswertbar("gibtsNicht")).toBe(false);
    expect(AUSWERTBARE_WIRKUNGEN.length).toBeLessThan(WIRKUNG_TYPEN.length);
  });
});

describe("sanitizeWirkung", () => {
  it("Unbekanntes und Unfertiges fällt auf die Vorgabe zurück", () => {
    expect(sanitizeWirkung({ typ: "gibtsNicht" }).typ).toBe(DEFAULT_WIRKUNG.typ);
    expect(sanitizeWirkung({ typ: "rolle" }).typ).toBe(DEFAULT_WIRKUNG.typ);
    expect(sanitizeWirkung(null).typ).toBe(DEFAULT_WIRKUNG.typ);
  });

  it("beschneidet Zahlen auf die Grenzen", () => {
    expect(sanitizeWirkung({ typ: "joker", n: 99 }).n).toBe(WIRKUNG_LIMITS.n.max);
    expect(sanitizeWirkung({ typ: "bonus", prozent: 0 }).prozent).toBe(WIRKUNG_LIMITS.prozent.min);
    expect(sanitizeWirkung({ typ: "punkte", betrag: 99999 }).betrag).toBe(WIRKUNG_LIMITS.betrag.max);
  });

  // Ein Feld, das nichts tut, wird beim nächsten Lesen für eine Einstellung
  // gehalten — dieselbe Begründung wie bei `abSpieltag` in `duellJoker.js`.
  it("setzt nur die Parameter des jeweiligen Typs", () => {
    const j = sanitizeWirkung({ typ: "joker", n: 2, prozent: 40, betrag: 100 });
    expect(j).toEqual({ typ: "joker", n: 2 });
    const b = sanitizeWirkung({ typ: "bonus", prozent: 30, n: 3 });
    expect(b).toEqual({ typ: "bonus", prozent: 30 });
  });

  // 🔴 Der eine Kanal, den `modCap` nicht sieht.
  it("`punkte` bekommt immer einen Saison-Deckel, und nicht 0", () => {
    const p = sanitizeWirkung({ typ: "punkte" });
    expect(p.maxProSaison).toBeGreaterThan(0);
    expect(sanitizeWirkung({ typ: "punkte", maxProSaison: 0 }).maxProSaison).toBe(0);
    expect(sanitizeWirkung({ typ: "joker" }).maxProSaison).toBeUndefined();
  });

  it("ist stabil: zweimal säubern ändert nichts mehr", () => {
    for (const w of AUSWERTBARE_WIRKUNGEN) {
      const einmal = sanitizeWirkung({ typ: w.key });
      expect(sanitizeWirkung(einmal)).toEqual(einmal);
    }
  });
});

describe("beschreibeWirkung", () => {
  it("nennt das Ergebnis, nicht den Feldnamen", () => {
    expect(beschreibeWirkung({ typ: "joker", n: 1 })).toBe("ein Joker");
    expect(beschreibeWirkung({ typ: "joker", n: 2 })).toBe("2 Joker");
    expect(beschreibeWirkung({ typ: "bonus", prozent: 20 })).toContain("+20 %");
    expect(beschreibeWirkung({ typ: "malus", prozent: 20 })).toContain("−20 %");
    expect(beschreibeWirkung({ typ: "nichts" })).toContain("Auszeichnung");
  });

  it("jede auswertbare Wirkung hat einen Satz", () => {
    for (const w of AUSWERTBARE_WIRKUNGEN) {
      expect(beschreibeWirkung({ typ: w.key }).length).toBeGreaterThan(3);
    }
  });
});

describe("wendeAn — die Grundform", () => {
  it("ohne Betroffene passiert nichts", () => {
    expect(wendeAn({ wirkung: { typ: "joker" }, betroffene: [] })).toEqual([]);
  });

  // „Nie halb gesetzt": ein Aufrufer soll nicht raten müssen, welches Feld
  // gemeint war.
  it("jeder Vorgang trägt alle drei Felder", () => {
    for (const w of AUSWERTBARE_WIRKUNGEN) {
      const v = wendeAn({
        wirkung: { typ: w.key }, betroffene: ["a"], mitglieder: IDS,
        spieltagsPunkte: { a: 100, b: 50, c: 40, d: 10 },
      });
      for (const x of v) {
        expect(typeof x.joker).toBe("number");
        expect(typeof x.punkte).toBe("number");
        expect(typeof x.faktor).toBe("number");
      }
    }
  });

  it("Joker und Entzug haben umgekehrte Vorzeichen", () => {
    expect(wendeAn({ wirkung: { typ: "joker", n: 2 }, betroffene: ["a"] })[0].joker).toBe(2);
    expect(wendeAn({ wirkung: { typ: "jokerEntzug", n: 2 }, betroffene: ["a"] })[0].joker).toBe(-2);
  });

  it("Aufschlag und Abzug liegen symmetrisch um 1", () => {
    const auf = wendeAn({ wirkung: { typ: "bonus", prozent: 20 }, betroffene: ["a"] })[0];
    const ab = wendeAn({ wirkung: { typ: "malus", prozent: 20 }, betroffene: ["a"] })[0];
    expect(auf.faktor).toBeCloseTo(1.2, 6);
    expect(ab.faktor).toBeCloseTo(0.8, 6);
  });

  it("`nichts` verrechnet nichts", () => {
    const v = wendeAn({ wirkung: { typ: "nichts" }, betroffene: IDS });
    expect(v.length).toBe(IDS.length);
    expect(v.every((x) => x.joker === 0 && x.punkte === 0 && x.faktor === 1)).toBe(true);
  });
});

describe("wendeAn — der Deckel für `punkte`", () => {
  it("greift über die ganze Saison, nicht je Aufruf", () => {
    const wirkung = { typ: "punkte", betrag: 100, maxProSaison: 250 };
    const v = wendeAn({ wirkung, betroffene: IDS });
    const summe = v.reduce((s, x) => s + x.punkte, 0);
    expect(summe).toBe(250);
    // Der vierte geht leer aus, statt auf 0 Punkte gesetzt zu werden.
    expect(v.length).toBe(3);
  });

  it("`bisherPunkte` verbraucht den Deckel mit", () => {
    const wirkung = { typ: "punkte", betrag: 100, maxProSaison: 250 };
    const v = wendeAn({ wirkung, betroffene: IDS, bisherPunkte: 200 });
    expect(v.reduce((s, x) => s + x.punkte, 0)).toBe(50);
  });

  it("`maxProSaison: 0` heißt kein Deckel", () => {
    const wirkung = { typ: "punkte", betrag: 100, maxProSaison: 0 };
    expect(wendeAn({ wirkung, betroffene: IDS }).reduce((s, x) => s + x.punkte, 0)).toBe(400);
  });
});

describe("wendeAn — Umverteilung", () => {
  const punkte = { a: 200, b: 100, c: 100, d: 0 };

  // 🔴 Die Eigenschaft, wegen der es diese Wirkung gibt.
  it("ist auf den Punkt genau summenneutral", () => {
    const v = wendeAn({
      wirkung: { typ: "umverteilung", prozent: 30 },
      betroffene: ["a"], mitglieder: IDS, spieltagsPunkte: punkte,
    });
    expect(v.reduce((s, x) => s + x.punkte, 0)).toBeCloseTo(0, 10);
  });

  it("der Geber verliert, alle anderen bekommen gleich viel", () => {
    const v = wendeAn({
      wirkung: { typ: "umverteilung", prozent: 30 },
      betroffene: ["a"], mitglieder: IDS, spieltagsPunkte: punkte,
    });
    const geber = v.find((x) => x.userId === "a");
    expect(geber.punkte).toBeCloseTo(-60, 6);
    const empfaenger = v.filter((x) => x.userId !== "a");
    expect(empfaenger.length).toBe(3);
    for (const e of empfaenger) expect(e.punkte).toBeCloseTo(20, 6);
  });

  // ⚠️ Dieselbe Falle wie `block.nurGewinn` in `duellJoker.js`.
  it("aus einem Minus lässt sich nichts nehmen", () => {
    const v = wendeAn({
      wirkung: { typ: "umverteilung", prozent: 30 },
      betroffene: ["a"], mitglieder: IDS, spieltagsPunkte: { ...punkte, a: -50 },
    });
    expect(v).toEqual([]);
  });

  it("ohne Spieltagspunkte passiert nichts, statt mit 0 zu rechnen", () => {
    expect(wendeAn({
      wirkung: { typ: "umverteilung" }, betroffene: ["a"], mitglieder: IDS,
    })).toEqual([]);
  });

  it("ohne Empfänger passiert nichts", () => {
    expect(wendeAn({
      wirkung: { typ: "umverteilung" }, betroffene: IDS, mitglieder: IDS,
      spieltagsPunkte: punkte,
    })).toEqual([]);
  });

  // UNGERUNDET weitergereicht: die Wertung addiert die rohen Werte und rundet
  // einmal am Ende (dieselbe Regel wie bei den Duell-Vorgängen).
  it("reicht ungerundet weiter", () => {
    const v = wendeAn({
      wirkung: { typ: "umverteilung", prozent: 10 },
      betroffene: ["a"], mitglieder: ["a", "b", "c"], spieltagsPunkte: { a: 100, b: 0, c: 0 },
    });
    expect(v.find((x) => x.userId === "b").punkte).toBeCloseTo(5, 10);
  });
});

describe("konflikte", () => {
  it("meldet eine Punkte-Gutschrift ohne Deckel", () => {
    const k = konflikte({ typ: "punkte", maxProSaison: 0 });
    expect(k.some((x) => x.key === "punkte-ohne-deckel")).toBe(true);
    expect(konflikte({ typ: "punkte", maxProSaison: 500 })).toEqual([]);
  });

  it("empfiehlt Umverteilung statt Abzug — aber ohne zu verbieten", () => {
    const k = konflikte({ typ: "malus", prozent: 20 });
    expect(k.length).toBe(1);
    expect(k[0].korrigieren).toBe(false);
  });

  it("jede Meldung nennt ihre Korrektur", () => {
    for (const w of AUSWERTBARE_WIRKUNGEN) {
      for (const k of konflikte({ typ: w.key, maxProSaison: 0 })) {
        expect(k.key && k.text).toBeTruthy();
        expect(k.text.length).toBeGreaterThan(40);
      }
    }
  });
});

describe("Der Topf-Vertrag", () => {
  // 🔴 Die Regel aus dem Kopfkommentar, als Test: keine Wirkung darf
  // gleichzeitig in zwei Töpfe fallen — sonst greift die Deckelung des einen
  // an der des anderen vorbei.
  it("keine auswertbare Wirkung bedient zwei Töpfe auf einmal", () => {
    for (const w of AUSWERTBARE_WIRKUNGEN) {
      const v = wendeAn({
        wirkung: { typ: w.key }, betroffene: ["a"], mitglieder: IDS,
        spieltagsPunkte: { a: 100, b: 50, c: 40, d: 10 },
      });
      for (const x of v) {
        const toepfe = [x.joker !== 0, x.punkte !== 0, x.faktor !== 1].filter(Boolean).length;
        expect(toepfe).toBeLessThanOrEqual(1);
      }
    }
  });

  it("jede auswertbare Wirkung nennt ihren Topf", () => {
    for (const w of AUSWERTBARE_WIRKUNGEN) {
      expect(WIRKUNG[w.key].topf.length).toBeGreaterThan(5);
    }
  });
});
