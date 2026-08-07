import { describe, it, expect } from "vitest";
import {
  AUSLOESER_TYPEN, AUSLOESER, AUSLOESER_LIMITS, DEFAULT_AUSLOESER,
  AUSWERTBARE_AUSLOESER, istAuswertbar,
  sanitizeAusloeser, feuert, beschreibeAusloeser, haeufigkeit,
} from "@/lib/ausloeser";

const stand = (...totals) => totals.map((total, i) => ({ userId: `p${i}`, total }));
const spiel = (home, away, quoteHeim = 2, quoteGast = 3) => ({
  result: { home, away },
  snapshot: { winner: { home: quoteHeim, draw: 3.4, away: quoteGast } },
});
const tipp = (tip, result) => ({ userId: "u1", tip, result });

describe("Katalog", () => {
  it("jeder Eintrag ist vollständig und eindeutig", () => {
    for (const a of AUSLOESER_TYPEN) {
      expect(a.key && a.label && a.text).toBeTruthy();
      expect(Array.isArray(a.braucht)).toBe(true);
      for (const p of a.parameter) {
        expect(a.standard[p]).toBeDefined();
        expect(AUSLOESER_LIMITS[p]).toBeDefined();
      }
    }
    expect(new Set(AUSLOESER_TYPEN.map((a) => a.key)).size).toBe(AUSLOESER_TYPEN.length);
  });

  it("was keine Grundlage hat, lässt sich nicht einstellen", () => {
    expect(istAuswertbar("rhythmus")).toBe(true);
    expect(istAuswertbar("gruppenereignis")).toBe(true);
    expect(istAuswertbar("lotterie")).toBe(false);
    expect(istAuswertbar("abstimmung")).toBe(false);
    expect(istAuswertbar("kaskade")).toBe(false);
    expect(AUSWERTBARE_AUSLOESER.length).toBeLessThan(AUSLOESER_TYPEN.length);
  });
});

describe("sanitizeAusloeser", () => {
  it("Unbekanntes und Unfertiges wird zu „immer“", () => {
    expect(sanitizeAusloeser({ typ: "gibtsNicht" })).toEqual(DEFAULT_AUSLOESER);
    expect(sanitizeAusloeser({ typ: "lotterie" })).toEqual(DEFAULT_AUSLOESER);
    expect(sanitizeAusloeser(null)).toEqual(DEFAULT_AUSLOESER);
  });

  it("beschneidet Zahlen und setzt nur die eigenen Parameter", () => {
    expect(sanitizeAusloeser({ typ: "rhythmus", n: 99 })).toEqual({ typ: "rhythmus", n: AUSLOESER_LIMITS.n.max });
    expect(sanitizeAusloeser({ typ: "rhythmus", n: 3, prozent: 40 })).toEqual({ typ: "rhythmus", n: 3 });
  });

  it("ist stabil: zweimal säubern ändert nichts mehr", () => {
    for (const a of AUSWERTBARE_AUSLOESER) {
      const einmal = sanitizeAusloeser({ typ: a.key });
      expect(sanitizeAusloeser(einmal)).toEqual(einmal);
    }
  });
});

describe("feuert — die Vorgabe ändert nichts", () => {
  it("„immer“ ist immer offen, auch ganz ohne Daten", () => {
    expect(feuert({ ausloeser: { typ: "immer" } })).toBe(true);
    expect(feuert({})).toBe(true);
  });

  // 🔴 Die Regel, an der ein Gatter steht oder fällt.
  it("fehlende Daten heißen NEIN, nicht ja", () => {
    expect(feuert({ ausloeser: { typ: "rhythmus", n: 4 } })).toBe(false);
    expect(feuert({ ausloeser: { typ: "saisonende", letzte: 3 }, position: 30 })).toBe(false);
    expect(feuert({ ausloeser: { typ: "enge", prozent: 15 }, position: 5 })).toBe(false);
    expect(feuert({ ausloeser: { typ: "gruppenereignis" }, position: 5 })).toBe(false);
    expect(feuert({ ausloeser: { typ: "quotenereignis", abQuote: 6 }, position: 5 })).toBe(false);
  });
});

describe("feuert — Zeitpunkte", () => {
  const wann = (ausloeser, opt = {}) => [...Array(20).keys()]
    .map((i) => i + 1)
    .filter((position) => feuert({ ausloeser, position, ...opt }));

  it("`rhythmus` trifft jeden n-ten", () => {
    expect(wann({ typ: "rhythmus", n: 4 })).toEqual([4, 8, 12, 16, 20]);
  });

  it("`termin` genau einmal", () => {
    expect(wann({ typ: "termin", spieltag: 7 })).toEqual([7]);
  });

  it("`saisonende` zählt vom Ende her", () => {
    expect(wann({ typ: "saisonende", letzte: 3 }, { spieltageGesamt: 20 })).toEqual([18, 19, 20]);
  });

  // ⚠️ Die Falle, die dieses Projekt bei `jokerPlan` schon einmal behoben hat:
  // reiner Zufall bündelt. Blockweise heißt: je Block genau einer.
  it("`zufall` feuert je Block genau einmal — nie gebündelt", () => {
    for (const rundenId of ["r1", "r2", "r3", "runde-xyz"]) {
      const tage = wann({ typ: "zufall", frequenz: 5 }, { rundenId });
      expect(tage.length).toBe(4);
      // Je Fünfer-Block genau einer.
      for (const block of [0, 1, 2, 3]) {
        expect(tage.filter((t) => Math.floor((t - 1) / 5) === block).length).toBe(1);
      }
    }
  });

  it("`zufall` ist deterministisch — dieselbe Runde, dieselben Spieltage", () => {
    const a = wann({ typ: "zufall", frequenz: 4 }, { rundenId: "r-fest" });
    const b = wann({ typ: "zufall", frequenz: 4 }, { rundenId: "r-fest" });
    expect(a).toEqual(b);
  });

  it("verschiedene Runden losen verschieden", () => {
    const ergebnisse = new Set(["r1", "r2", "r3", "r4", "r5", "r6"].map((rundenId) =>
      JSON.stringify(wann({ typ: "zufall", frequenz: 5 }, { rundenId }))));
    expect(ergebnisse.size).toBeGreaterThan(1);
  });
});

describe("feuert — Tabellenlage", () => {
  it("`enge` und `abstand` sind Gegenstücke", () => {
    const eng = stand(1000, 960, 950);      // 5 % Spanne
    const weit = stand(1000, 700, 400);     // 60 % Spanne
    expect(feuert({ ausloeser: { typ: "enge", prozent: 15 }, position: 5, stand: eng })).toBe(true);
    expect(feuert({ ausloeser: { typ: "enge", prozent: 15 }, position: 5, stand: weit })).toBe(false);
    expect(feuert({ ausloeser: { typ: "abstand", prozent: 30 }, position: 5, stand: weit })).toBe(true);
    expect(feuert({ ausloeser: { typ: "abstand", prozent: 30 }, position: 5, stand: eng })).toBe(false);
  });

  // Gemessen wird RELATIV: 200 Punkte sind am 3. Spieltag alles und am 30.
  // nichts — dieselbe Begründung wie bei `catchup.schwelle`.
  it("die Spanne wird relativ zur Spitze gemessen, nicht absolut", () => {
    const frueh = stand(300, 240);      // 20 % Spanne, 60 Punkte
    const spaet = stand(3000, 2400);    // 20 % Spanne, 600 Punkte
    const regel = { typ: "enge", prozent: 25 };
    expect(feuert({ ausloeser: regel, position: 3, stand: frueh })).toBe(true);
    expect(feuert({ ausloeser: regel, position: 30, stand: spaet })).toBe(true);
  });

  it("ein einzelner Spieler ist keine Tabelle", () => {
    expect(feuert({ ausloeser: { typ: "enge" }, position: 5, stand: stand(500) })).toBe(false);
  });
});

describe("feuert — was auf dem Platz passiert ist", () => {
  it("`gruppenereignis`: nur wenn NIEMAND exakt getroffen hat", () => {
    const daneben = [
      tipp({ home: 1, away: 0 }, { home: 2, away: 2 }),
      tipp({ home: 3, away: 1 }, { home: 0, away: 0 }),
    ];
    const einTreffer = [...daneben, tipp({ home: 2, away: 1 }, { home: 2, away: 1 })];
    expect(feuert({ ausloeser: { typ: "gruppenereignis" }, position: 5, eintraege: daneben })).toBe(true);
    expect(feuert({ ausloeser: { typ: "gruppenereignis" }, position: 5, eintraege: einTreffer })).toBe(false);
  });

  it("`quotenereignis`: nur ein Sieg über der Quote zählt", () => {
    const regel = { typ: "quotenereignis", abQuote: 6 };
    // Gast gewinnt bei Quote 8 → ja.
    expect(feuert({ ausloeser: regel, position: 1, spiele: [spiel(0, 2, 1.3, 8)] })).toBe(true);
    // Favorit gewinnt → nein.
    expect(feuert({ ausloeser: regel, position: 1, spiele: [spiel(2, 0, 1.3, 8)] })).toBe(false);
    // Remis → nein, auch bei hoher Quote.
    expect(feuert({ ausloeser: regel, position: 1, spiele: [spiel(1, 1, 1.3, 8)] })).toBe(false);
    // Unter der Schwelle → nein.
    expect(feuert({ ausloeser: regel, position: 1, spiele: [spiel(0, 2, 1.3, 4)] })).toBe(false);
  });

  it("`torlos`: mindestens ein 0:0", () => {
    expect(feuert({ ausloeser: { typ: "torlos" }, position: 1, spiele: [spiel(1, 0), spiel(0, 0)] })).toBe(true);
    expect(feuert({ ausloeser: { typ: "torlos" }, position: 1, spiele: [spiel(1, 0), spiel(2, 2)] })).toBe(false);
  });
});

describe("Beschreibung und Vorschau", () => {
  it("jeder auswertbare Auslöser hat einen Satz im Klartext", () => {
    for (const a of AUSWERTBARE_AUSLOESER) {
      const satz = beschreibeAusloeser({ typ: a.key });
      expect(satz.length).toBeGreaterThan(5);
      expect(satz).not.toContain(a.key === "immer" ? "$$" : "$$");
    }
  });

  it("nennt die Bedingung, nicht den Feldnamen", () => {
    expect(beschreibeAusloeser({ typ: "rhythmus", n: 4 })).toContain("4. Spieltag");
    expect(beschreibeAusloeser({ typ: "zufall", frequenz: 6 })).toContain("unangekündigt");
    expect(beschreibeAusloeser({ typ: "gruppenereignis" })).toContain("niemand");
  });

  // 🔴 „Jeder 4. Spieltag" klingt nach wenig und sind über eine Saison acht
  // Auslösungen — dieselbe Falle wie bei den Wettbewerbs-Gewichten.
  it("`haeufigkeit` macht aus der Einstellung eine Zahl", () => {
    expect(haeufigkeit({ typ: "immer" }, 34)).toBe(34);
    expect(haeufigkeit({ typ: "rhythmus", n: 4 }, 34)).toBe(8);
    expect(haeufigkeit({ typ: "termin", spieltag: 17 }, 34)).toBe(1);
    expect(haeufigkeit({ typ: "termin", spieltag: 38 }, 34)).toBe(0);
    expect(haeufigkeit({ typ: "saisonende", letzte: 3 }, 34)).toBe(3);
  });

  it("was an unbekannten Daten hängt, sagt lieber nichts als zu raten", () => {
    expect(haeufigkeit({ typ: "enge" }, 34)).toBe(null);
    expect(haeufigkeit({ typ: "gruppenereignis" }, 34)).toBe(null);
  });

  // Gegenprobe zur Vorschau: die Schätzung muss zur Wirklichkeit passen,
  // sonst stellt ein Admin etwas ein und bekommt etwas anderes.
  it("die Vorschau trifft, was `feuert` wirklich tut", () => {
    for (const [ausloeser, n] of [
      [{ typ: "rhythmus", n: 3 }, 24],
      [{ typ: "zufall", frequenz: 4 }, 24],
      [{ typ: "saisonende", letzte: 2 }, 24],
    ]) {
      const wirklich = [...Array(n).keys()].map((i) => i + 1)
        .filter((position) => feuert({ ausloeser, position, spieltageGesamt: n, rundenId: "r" })).length;
      expect(wirklich).toBe(haeufigkeit(ausloeser, n));
    }
  });
});
