import { describe, it, expect } from "vitest";
import { createMockOddsSource, DEFAULT_RULES, sanitizeRules, scoreTip } from "@/lib/engine";
import { breakdown, istWiderspruechlich } from "@/lib/breakdown";

const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");     // Spanien ist klarer Favorit (1.28)
const RESULT = odds.getResult("JOR-ESP");     // real 5:1 für Jordanien → Favorit verliert

const tipp = (home, away, goals = { home: [], away: [] }) => ({ home, away, goals });

describe("Die Kette geht auf", () => {
  const faelle = [
    ["Volltreffer mit Torschützen", tipp(5, 1, { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal"] })],
    ["knapp daneben", tipp(4, 1)],
    ["Tendenz getroffen", tipp(2, 0)],
    ["komplett daneben", tipp(0, 3)],
  ];

  for (const [name, t] of faelle) {
    it(`rechnet sich nach: ${name}`, () => {
      const b = breakdown(t, RESULT, SNAP, DEFAULT_RULES);
      expect(b.gesamt).toBe(scoreTip(t, RESULT, SNAP, DEFAULT_RULES).total);
      expect(b.stimmt).toBe(true);
    });
  }
});

describe("Grundwert: der größte Teil gewinnt, die anderen sind nur Kontext", () => {
  it("es gibt genau EINEN Grundwert-Posten", () => {
    const b = breakdown(tipp(4, 1), RESULT, SNAP, DEFAULT_RULES);
    expect(b.posten.filter((p) => p.key === "grund")).toHaveLength(1);
  });

  it("unterlegene Teile sind als Info markiert und zählen nicht mit", () => {
    const b = breakdown(tipp(4, 1), RESULT, SNAP, DEFAULT_RULES);
    const infos = b.posten.filter((p) => p.key.startsWith("alt-"));
    for (const i of infos) {
      expect(i.art).toBe("info");
      expect(i.hinweis).toContain("zählt nicht");
    }
  });

  it("der Grundwert ist mindestens so groß wie jede Alternative", () => {
    const b = breakdown(tipp(4, 1), RESULT, SNAP, DEFAULT_RULES);
    const grund = b.posten.find((p) => p.key === "grund");
    for (const alt of b.posten.filter((p) => p.key.startsWith("alt-"))) {
      expect(grund.wert).toBeGreaterThanOrEqual(alt.wert);
    }
  });
});

describe("Kein Widerspruch: Sieger-Boden und Favoriten-Malus schließen sich aus", () => {
  const mitMalus = sanitizeRules({ ...DEFAULT_RULES, favFlopPenalty: 3 });

  it("wer auf den Favoriten setzte und verlor, hat KEINEN Sieger-Boden", () => {
    // Spanien war Favorit und hat real verloren → Malus greift.
    const b = breakdown(tipp(0, 2), RESULT, SNAP, mitMalus);
    expect(b.posten.some((p) => p.key === "favflop")).toBe(true);
    expect(istWiderspruechlich(b.posten)).toBe(false);
  });

  it("wer den Sieger traf, bekommt keinen Malus", () => {
    const b = breakdown(tipp(3, 1), RESULT, SNAP, mitMalus);
    expect(b.posten.some((p) => p.key === "favflop")).toBe(false);
  });

  it("über viele Tipps hinweg entsteht nie eine widersprüchliche Liste", () => {
    for (let h = 0; h <= 5; h++) {
      for (let a = 0; a <= 5; a++) {
        const b = breakdown(tipp(h, a), RESULT, SNAP, mitMalus);
        expect(istWiderspruechlich(b.posten)).toBe(false);
      }
    }
  });
});

describe("Torschützen", () => {
  const mitToren = tipp(5, 1, { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal"] });

  it("jeder Treffer bekommt eine eigene Zeile mit Quote", () => {
    const b = breakdown(mitToren, RESULT, SNAP, DEFAULT_RULES);
    const tore = b.posten.filter((p) => p.key.startsWith("tor-"));
    expect(tore.length).toBeGreaterThan(0);
    for (const t of tore) {
      expect(t.art).toBe("summe");
      expect(t.hinweis).toContain("Quote");
    }
  });

  it("ein Doppelpack wird als solcher benannt", () => {
    const b = breakdown(mitToren, RESULT, SNAP, DEFAULT_RULES);
    expect(b.posten.some((p) => p.label.startsWith("Doppelpack"))).toBe(true);
  });

  it("ohne Torschützen gibt es weder Tor- noch Kombi-Zeile", () => {
    const b = breakdown(tipp(5, 1), RESULT, SNAP, DEFAULT_RULES);
    expect(b.posten.some((p) => p.key.startsWith("tor-"))).toBe(false);
    expect(b.posten.some((p) => p.key === "kombi")).toBe(false);
  });

  it("die Kombi ist ein Faktor, kein Summenposten", () => {
    const b = breakdown(mitToren, RESULT, SNAP, DEFAULT_RULES);
    const kombi = b.posten.find((p) => p.key === "kombi");
    expect(kombi.art).toBe("faktor");
    expect(kombi.hinweis).toContain("Ergebnis UND Tore");
  });
});

describe("Modifikatoren", () => {
  it("ein gesetzter Joker erscheint als eigener Faktor", () => {
    const rules = sanitizeRules({ ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 1.5 } });
    const b = breakdown({ ...tipp(5, 1), joker: true }, RESULT, SNAP, rules);
    const mod = b.posten.find((p) => p.key === "modifikator");
    expect(mod.art).toBe("faktor");
    expect(mod.wert).toBeCloseTo(1.5, 1);
  });

  it("mehrere Joker-Typen ergeben EINE Faktor-Zeile plus Info-Zeilen", () => {
    // Additiv: 1 + 0.5 (gesetzt) + 0.2 (Heimat) = 1.7 — NICHT 1.5 x 1.2 = 1.8.
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      joker: { enabled: true, modus: "einzel", faktor: 1.5, heimat: { enabled: true, faktor: 1.2 } },
    });
    const b = breakdown({ ...tipp(5, 1), joker: true, verein: "Jordanien" }, RESULT, SNAP, rules);
    const faktoren = b.posten.filter((p) => p.art === "faktor" && p.key === "modifikator");
    expect(faktoren).toHaveLength(1);
    expect(faktoren[0].wert).toBeCloseTo(1.7, 1);
    const infos = b.posten.filter((p) => p.key.startsWith("mod-"));
    expect(infos.map((i) => i.key).sort()).toEqual(["mod-aktiv", "mod-heimat"]);
    for (const i of infos) expect(i.art).toBe("info");   // zaehlen nicht mit
  });

  it("ohne Modifikator gibt es keine Zeile", () => {
    const b = breakdown(tipp(5, 1), RESULT, SNAP, DEFAULT_RULES);
    expect(b.posten.some((p) => p.key === "modifikator")).toBe(false);
  });

  it("die Deckelung wird erklärt, wenn sie greift", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES, modCap: 1.2,
      joker: { enabled: true, modus: "einzel", faktor: 2 },
    });
    const b = breakdown({ ...tipp(5, 1), joker: true }, RESULT, SNAP, rules);
    const mod = b.posten.find((p) => p.key === "modifikator");
    expect(mod.hinweis.toLowerCase()).toContain("gedeckelt");
  });
});

describe("Deckel je Spiel", () => {
  it("wird als Info gezeigt, wenn er greift", () => {
    const rules = sanitizeRules({ ...DEFAULT_RULES, perGameCap: 50 });
    const b = breakdown(tipp(5, 1, { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal"] }), RESULT, SNAP, rules);
    const deckel = b.posten.find((p) => p.key === "deckel");
    expect(deckel).toBeDefined();
    expect(deckel.hinweis).toContain("Ohne Deckel");
    expect(b.gesamt).toBe(50);
  });

  it("fehlt, wenn er nicht greift", () => {
    const b = breakdown(tipp(0, 3), RESULT, SNAP, DEFAULT_RULES);
    expect(b.posten.some((p) => p.key === "deckel")).toBe(false);
  });
});

describe("Robustheit", () => {
  it("jeder Posten ist vollständig beschrieben", () => {
    const b = breakdown(tipp(5, 1, { home: ["Al-Naimat"], away: [] }), RESULT, SNAP, DEFAULT_RULES);
    for (const p of b.posten) {
      expect(p.key && p.label).toBeTruthy();
      expect(["summe", "faktor", "info"]).toContain(p.art);
      expect(typeof p.wert).toBe("number");
      expect(Number.isFinite(p.wert)).toBe(true);
    }
  });

  it("die Endsumme entspricht immer scoreTip", () => {
    for (let h = 0; h <= 5; h++) {
      for (let a = 0; a <= 5; a++) {
        const t = tipp(h, a);
        expect(breakdown(t, RESULT, SNAP, DEFAULT_RULES).gesamt)
          .toBe(scoreTip(t, RESULT, SNAP, DEFAULT_RULES).total);
      }
    }
  });
});
