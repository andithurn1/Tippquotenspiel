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

// Der Team-Topf bündelt drei verschiedene Aussagen (Verein/Derby, Spiel des
// Spieltags, Wettbewerbs-Gewicht). In der Wertung ist das richtig — additiv
// unter demselben Deckel. In der AUFSCHLÜSSELUNG darf es nicht zusammenfallen:
// „Team / Derby +0,5" bei einem Spiel ohne Derby schickt den Spieler auf die
// falsche Spur.
describe("Der Team-Topf wird aufgeschlüsselt, nicht zusammengeworfen", () => {
  const mitBigGame = sanitizeRules({
    ...DEFAULT_RULES, bigGame: { enabled: true, aufschlag: 0.5, minSpannung: 0.3 },
  });
  const snapTop = { ...SNAP, bigGameWert: 0.7, bigGameGrund: "Platz 1 gegen Platz 2, direkte Nachbarn" };

  it("das Spiel des Spieltags bekommt seine eigene Zeile — mit der eingefrorenen Begründung", () => {
    const b = breakdown(tipp(5, 1), RESULT, snapTop, mitBigGame);
    const zeile = b.posten.find((p) => p.key === "mod-biggame");
    expect(zeile).toBeDefined();
    expect(zeile.art).toBe("info");
    expect(zeile.wert).toBeCloseTo(0.5, 5);
    expect(zeile.hinweis).toContain("Platz 1 gegen Platz 2");
    // Kein Derby im Spiel → auch keine irreführende Team-Zeile.
    expect(b.posten.some((p) => p.key === "mod-team")).toBe(false);
  });

  it("Derby und Topspiel stehen nebeneinander, ohne sich zu verschlucken", () => {
    const rules = sanitizeRules({
      ...mitBigGame, teamMods: { derbyFaktor: 1.3, teams: {} },
    });
    const b = breakdown(tipp(5, 1), RESULT, { ...snapTop, derby: "Testderby" }, rules);
    const derby = b.posten.find((p) => p.key === "mod-team");
    const top = b.posten.find((p) => p.key === "mod-biggame");
    expect(derby.wert).toBeCloseTo(0.3, 5);
    expect(top.wert).toBeCloseTo(0.5, 5);
  });

  it("das Wettbewerbs-Gewicht wird benannt statt unter Team zu verschwinden", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      wettbewerbe: { enabled: true, aufschlaege: { cl: 0.4 }, phasenStufe: 0.2 },
    });
    const snapCl = { ...SNAP, wettbewerb: "cl", phase: "halbfinale" };
    const b = breakdown(tipp(5, 1), RESULT, snapCl, rules);
    const zeile = b.posten.find((p) => p.key === "mod-wettbewerb");
    expect(zeile).toBeDefined();
    expect(zeile.hinweis).toContain("Champions League");
    expect(zeile.hinweis).toContain("Halbfinale");
    expect(b.posten.some((p) => p.key === "mod-team")).toBe(false);
  });

  it("ohne aktives Big Game bleibt der Snapshot-Wert wirkungslos (die Runde entscheidet)", () => {
    const b = breakdown(tipp(5, 1), RESULT, snapTop, DEFAULT_RULES);
    expect(b.posten.some((p) => p.key === "mod-biggame")).toBe(false);
  });

  it("unter der Schwelle der Runde gibt es keine Topspiel-Zeile", () => {
    const streng = sanitizeRules({
      ...DEFAULT_RULES, bigGame: { enabled: true, aufschlag: 0.5, minSpannung: 0.8 },
    });
    const b = breakdown(tipp(5, 1), RESULT, snapTop, streng);
    expect(b.posten.some((p) => p.key === "mod-biggame")).toBe(false);
  });
});

describe("Deckel je Spiel", () => {
  // ⚠️ Der Deckel ist ein ABZUG, keine Fußnote: als `info`-Zeile stand er neben
  // einer Kette, die weiter auf den ungedeckelten Wert zeigte.
  it("kürzt die Kette auf den Deckel und benennt den Ausgangswert", () => {
    const rules = sanitizeRules({ ...DEFAULT_RULES, perGameCap: 50 });
    const b = breakdown(tipp(5, 1, { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal"] }), RESULT, SNAP, rules);
    const deckel = b.posten.find((p) => p.key === "deckel");
    expect(deckel).toBeDefined();
    expect(deckel.art).toBe("summe");
    expect(deckel.wert).toBeLessThan(0);
    expect(deckel.hinweis).toContain("ohne Deckel wären es");
    expect(b.gesamt).toBe(50);
    expect(b.stimmt).toBe(true);
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

// 🔴 Der eigentliche Wahrheitsgehalt der Aufschlüsselung: kommt der Spieler,
// der die Spalte von oben nach unten addiert, unten bei `Gesamt` an?
//
// Bis 05.08.2026 nicht. Gemessen mit `npm run anzeige` über 1600 Tipps je
// Regelwerk: 16–39 % der Aufschlüsselungen liefen an ihrer eigenen Endsumme
// vorbei, bei „Underdog-Party" um bis zu 273 Punkte. Kein Test hat das
// gemeldet, weil `stimmt` 3 % Toleranz hatte — und 273 von 9000 sind 3 %.
// Deshalb ist die Prüfung hier EXAKT und rechnet die Kette selbst nach,
// statt `stimmt` zu glauben.
describe("Die angezeigte Spalte addiert sich auf die angezeigte Summe", () => {
  const kette = (posten) => {
    let w = 0;
    for (const p of posten) {
      if (p.art === "summe") w += p.wert;
      else if (p.art === "faktor") w *= p.wert;
    }
    return w;
  };

  const regelwerke = [
    ["Vorgabe", DEFAULT_RULES],
    ["mit Deckel", sanitizeRules({ ...DEFAULT_RULES, perGameCap: 50 })],
    ["große Anzeige-Skala", sanitizeRules({ ...DEFAULT_RULES, displayScale: 50 })],
  ];

  for (const [name, rules] of regelwerke) {
    it(`geht bei jedem Endstand auf: ${name}`, () => {
      for (let h = 0; h <= 5; h++) {
        for (let a = 0; a <= 5; a++) {
          const t = tipp(h, a, { home: ["Al-Naimat"], away: ["Yamal"] });
          const b = breakdown(t, RESULT, SNAP, rules);
          expect(Math.round(kette(b.posten))).toBe(b.gesamt);
          expect(b.stimmt).toBe(true);
        }
      }
    });
  }

  it("weist den Rundungsrest aus, statt ihn zu verschlucken", () => {
    // Ein Fall mit Torschützen UND Kombi — dort vervielfacht der Faktor den
    // Rundungsrest der Summen-Posten, und genau dann entsteht die Zeile.
    const t = tipp(5, 1, { home: ["Al-Naimat"], away: [] });
    const b = breakdown(t, RESULT, SNAP, DEFAULT_RULES);
    const rundung = b.posten.find((p) => p.key === "rundung");
    if (rundung) {
      expect(rundung.art).toBe("summe");
      expect(Math.abs(rundung.wert)).toBeLessThan(3);
      expect(rundung.hinweis).toContain("gerundet");
    }
    expect(Math.round(kette(b.posten))).toBe(b.gesamt);
  });
});

// ============================================================
//  DER FAVORITEN-MALUS steht in der Aufschluesselung
//
//  🔴 Ohne diesen Test waere der Malus die klassische zweite Wahrheit: die
//  Wertung zoege ihn ab, die Aufschluesselung zeigte den vollen Gewinn, und
//  die Summe stuende daneben. Genau die Fehlerklasse der 17 Funde vom
//  05.08.2026 -- keiner davon war ein Rechenfehler.
// ============================================================
describe("Favoriten-Malus in der Aufschluesselung", () => {
  const mitToren = tipp(5, 1, { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal"] });
  const abwerten = sanitizeRules({
    ...DEFAULT_RULES,
    sperre: { enabled: true, wirkung: "abwerten", modus: "quote", mindestQuote: 99, malusProzent: 40 },
  });

  it("die Kette geht auch MIT Malus auf", () => {
    const b = breakdown(mitToren, RESULT, SNAP, abwerten);
    expect(b.gesamt).toBe(scoreTip(mitToren, RESULT, SNAP, abwerten).total);
    expect(b.stimmt).toBe(true);
  });

  it("der Malus steht am Torschuetzen dran, nicht irgendwo", () => {
    const b = breakdown(mitToren, RESULT, SNAP, abwerten);
    const tore = b.posten.filter((p) => p.key.startsWith("tor-"));
    expect(tore.length).toBeGreaterThan(0);
    for (const t of tore) expect(t.hinweis).toContain("−40 %");
  });

  it("mit Malus kommt weniger heraus als ohne -- die Gegenprobe", () => {
    const ohne = scoreTip(mitToren, RESULT, SNAP, DEFAULT_RULES).raw;
    const mit = scoreTip(mitToren, RESULT, SNAP, abwerten).raw;
    expect(mit).toBeLessThan(ohne);
  });

  it("der Freischalt-Joker hebt ihn auf -- auch in der WERTUNG", () => {
    // ⚠️ Der Knopf heisst „Sperre fuer dieses Spiel aufheben". Wer ihn drueckt
    // und trotzdem weniger bekommt, haelt die App fuer kaputt.
    const frei = { ...mitToren, frei: true };
    expect(scoreTip(frei, RESULT, SNAP, abwerten).raw)
      .toBe(scoreTip(mitToren, RESULT, SNAP, DEFAULT_RULES).raw);
  });

  it("ohne die Regel aendert sich an der Aufschluesselung gar nichts", () => {
    const aus = sanitizeRules({ ...DEFAULT_RULES, sperre: { enabled: false, wirkung: "abwerten" } });
    expect(breakdown(mitToren, RESULT, SNAP, aus).posten)
      .toEqual(breakdown(mitToren, RESULT, SNAP, DEFAULT_RULES).posten);
  });
});
