import { describe, it, expect } from "vitest";
import { simulateBalance, bewerten, formFaktor, PROFILE } from "./balanceSim";
import { DEFAULT_RULES, sanitizeRules } from "./engine";
import { PRESETS } from "./presets";

// Klein halten, damit die Tests flott bleiben — die Aussagen sind dieselben.
const KLEIN = { seasons: 25, matchdays: 9, perMatchday: 9, seed: 7 };

describe("Tipp-Einfluss — die Regel bestraft Herdenverhalten", () => {
  const OPT = { seasons: 30, matchdays: 17, perMatchday: 9, seed: 4242, mitglieder: 12 };
  const mit = (staerke) => sanitizeRules({
    ...PRESETS[0].rules,
    tippEinfluss: { staerke, marktTiefe: 200, minTipper: 8 },
  });

  // ⚠️ Die AUSSAGE „bestraft Herdenverhalten" steht bewusst NICHT hier,
  // sondern in `npm run balance`. Sie braucht 3 Saatzahlen × 40 Saisons; bei
  // 30 Saisons dreht sich das Vorzeichen, und der Lauf kostete 16 Sekunden in
  // jeder Testrunde. Dieselbe Arbeitsteilung wie beim Rest: die Testsuite
  // sichert INVARIANTEN, der Balance-Lauf MISST.
  // Gemessen (Standard-Preset, stärke 0.15): Favorit 14,2 % → 9,2 %,
  // Kenner 56,7 % → 71,7 %, Solide 12,5 % → 8,3 %.

  it("die Regel kommt im Simulator überhaupt an", () => {
    // Der eigentliche Blindstellen-Test: vorher war der Mischanteil IMMER 0,
    // weil fünf Archetypen unter `minTipper` (8) liegen. Ändert sich nichts,
    // ist der Simulator wieder blind — egal in welche Richtung.
    const aus = simulateBalance(mit(0), OPT);
    const an = simulateBalance(mit(0.4), OPT);
    expect(an.profile.map((p) => p.siegquote))
      .not.toEqual(aus.profile.map((p) => p.siegquote));
  });

  it("bei ausgeschalteter Regel ändert sich GAR nichts", () => {
    // Der Standard ist „aus" — dort darf der neue Pfad die Zahlen nicht
    // anfassen, sonst wären alle bisherigen Messungen entwertet.
    const a = simulateBalance(mit(0), OPT);
    const b = simulateBalance(sanitizeRules(PRESETS[0].rules), OPT);
    expect(a.profile.map((p) => p.siegquote)).toEqual(b.profile.map((p) => p.siegquote));
  });
});

describe("Formkurven — niemand ist eine Saison lang gleich stark", () => {
  it("die Kurve schwingt über die Saison und bleibt um 1 herum", () => {
    const werte = Array.from({ length: 34 }, (_, md) => formFaktor(0.2, 0.7, md, 34));
    expect(Math.max(...werte)).toBeGreaterThan(1.1);
    expect(Math.min(...werte)).toBeLessThan(0.9);
    // Kein Ausreißer, der die Trefferquote ins Absurde zieht.
    expect(Math.max(...werte)).toBeLessThan(1.6);
    expect(Math.min(...werte)).toBeGreaterThan(0.4);
  });

  it("verschiedene Phasen laufen NICHT im Gleichtakt", () => {
    // Wären alle Tipper gleichzeitig gut drauf, höbe sich die Form gegenseitig
    // auf und wäre wieder unsichtbar — genau der Fehler, den sie beheben soll.
    const a = Array.from({ length: 34 }, (_, md) => formFaktor(0.0, 0.1, md, 34));
    const b = Array.from({ length: 34 }, (_, md) => formFaktor(0.5, 0.9, md, 34));
    const abstand = a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0) / a.length;
    expect(abstand).toBeGreaterThan(0.15);
  });

  it("die beiden Messinstrumente tragen KEINE Form", () => {
    // „Tippt immer den Favoriten" und „setzt stur auf Außenseiter" halten je
    // einen Rand fest. Ein Instrument, das mal besser misst, verbiegt die Skala.
    const instrumente = PROFILE.filter((p) => p.key === "favorit" || p.key === "zocker");
    expect(instrumente).toHaveLength(2);
    for (const p of instrumente) expect(p.form).toBe(false);
    // Und alle übrigen tragen sie.
    for (const p of PROFILE.filter((x) => !["favorit", "zocker"].includes(x.key))) {
      expect(p.form).toBe(true);
    }
  });

  it("beim Kenner schmilzt in schwacher Form die UNTERSCHEIDUNG", () => {
    // Der Punkt ist nicht „er wagt weniger", sondern „er wagt an den falschen
    // Stellen": bei Form 0 ist seine Quote bei Überraschung dieselbe wie ohne.
    const kenner = PROFILE.find((p) => p.key === "kenner");
    const quote = (u, f) => {
      let treffer = 0;
      for (let i = 0; i < 2000; i++) {
        const werte = [(i + 0.5) / 2000];
        if (kenner.aussenseiter(u, () => werte[0], f)) treffer++;
      }
      return treffer / 2000;
    };
    // Volle Form: klarer Unterschied zwischen Überraschung und nicht.
    expect(quote(true, 1) - quote(false, 1)).toBeGreaterThan(0.15);
    // Keine Form: kein Unterschied mehr.
    expect(Math.abs(quote(true, 0) - quote(false, 0))).toBeLessThan(0.01);
  });
});

describe("simulateBalance — der Ranking-Joker bleibt messbar", () => {
  // Regression zu einem stillen Messfehler: der Simulator setzte als Gewicht
  // `maxTotalModifier` — die Obergrenze ALLER Ebenen. Im Ranking-Modus nimmt die
  // Engine aber nur Werte AUS DEM POOL (Schutz gegen eingeschleuste Faktoren).
  // Sobald eine zweite Ebene aktiv war, lag der Wert nicht mehr im Pool, der
  // Aufschlag war still 0, und der Joker wurde gar nicht mehr gemessen.
  const ranking = sanitizeRules({
    ...DEFAULT_RULES,
    joker: { ...DEFAULT_RULES.joker, enabled: true, modus: "ranking", faktoren: [2, 1.5, 1.2, 1] },
  });

  it("misst einen Modifikator-Anteil, wenn der Ranking-Joker an ist", () => {
    expect(simulateBalance(ranking, KLEIN).modifikatorAnteil).toBeGreaterThan(0);
  });

  it("verliert ihn NICHT, sobald eine zweite Modifikator-Ebene dazukommt", () => {
    const mitBigGame = sanitizeRules({
      ...ranking,
      bigGame: { enabled: true, aufschlag: 0.5, minSpannung: 0.3 },
    });
    const r = simulateBalance(mitBigGame, KLEIN);
    expect(r.modifikatorAnteil).toBeGreaterThan(0);
    // Und der Maximalfall darf nicht auf den Wert OHNE Joker zurückfallen.
    expect(r.maximalfall).toBeGreaterThan(simulateBalance(DEFAULT_RULES, KLEIN).maximalfall);
  });
});

describe("simulateBalance — Grundverhalten", () => {
  it("liefert plausible Kennzahlen im gültigen Bereich", () => {
    const r = simulateBalance(DEFAULT_RULES, KLEIN);
    // Die Siegquoten aller Typen ergeben zusammen 1 (jede Saison hat genau
    // einen Sieger).
    const summe = r.profile.reduce((s, p) => s + p.siegquote, 0);
    expect(summe).toBeCloseTo(1, 2);
    expect(r.profile).toHaveLength(5);
    expect(r.punkteVerhaeltnis).toBeGreaterThan(0);
    expect(r.modifikatorAnteil).toBeGreaterThanOrEqual(0);
    expect(r.maximalfall).toBeGreaterThan(0);
    expect(["gruen", "gelb", "rot"]).toContain(r.ampel.stufe);
  });

  it("der Kenner erwischt rund jede vierte Überraschung (Modell-Richtwert)", () => {
    const r = simulateBalance(DEFAULT_RULES, KLEIN);
    const anteil = (k) => r.profile.find((p) => p.key === k).ueberraschungsAnteil;
    expect(anteil("favorit")).toBe(0);          // tippt nie den Außenseiter
    expect(anteil("zocker")).toBe(1);           // ist bei jeder dabei
    expect(anteil("kenner")).toBeGreaterThan(0.15);
    expect(anteil("kenner")).toBeLessThan(0.45);
  });

  it("ist deterministisch — gleicher Seed, gleiches Ergebnis", () => {
    expect(simulateBalance(DEFAULT_RULES, KLEIN)).toEqual(simulateBalance(DEFAULT_RULES, KLEIN));
  });

  it("ohne aktiven Joker ist der Modifikator-Anteil 0", () => {
    expect(DEFAULT_RULES.joker.enabled).toBe(false);
    expect(simulateBalance(DEFAULT_RULES, KLEIN).modifikatorAnteil).toBe(0);
  });

  it("ohne aktives Aufholen ist die Kipp-Quote 0", () => {
    expect(simulateBalance(DEFAULT_RULES, KLEIN).aufholFlipQuote).toBe(0);
  });
});

describe("simulateBalance — Aufhol-Mechanismus", () => {
  const mitAufholen = (patch) => simulateBalance(
    sanitizeRules({ ...DEFAULT_RULES, aufholen: { enabled: true, ...patch } }), KLEIN);

  it("stärkeres Aufholen kippt öfter den Sieger", () => {
    const sanft = mitAufholen({ staerke: 0.1, schwelle: 0.3, betrifft: "letzter" });
    const stark = mitAufholen({ staerke: 0.45, schwelle: 0, betrifft: "unter-schnitt" });
    expect(stark.aufholFlipQuote).toBeGreaterThan(sanft.aufholFlipQuote);
  });

  it("ein extremer Ausgleich wird von der Ampel als rot erkannt", () => {
    // Auf dem Standard-Preset (mit Dämpfung): die Punkte streuen realistischer,
    // dadurch baut sich über eine volle Saison genug Abstand auf, den ein
    // maximaler Bonus regelmäßig umdreht.
    const extrem = simulateBalance(sanitizeRules({
      ...PRESETS[0].rules, aufholen: { enabled: true, staerke: 0.5, schwelle: 0, betrifft: "unter-schnitt" },
    }), { seasons: 60, matchdays: 17, perMatchday: 9, seed: 4242 });
    expect(extrem.aufholFlipQuote).toBeGreaterThan(0.35);
    expect(extrem.ampel.stufe).toBe("rot");
  });
});

describe("simulateBalance — erkennt die Kipp-Punkte", () => {
  // Das Punkte-Verhältnis ist die aussagekräftige Kennzahl: die Siegquote
  // sättigt über viele Spiele schon bei winzigem Vorteil bei 100 %.
  it("starker Underdog-Boost verschiebt das Verhältnis zum Zocker", () => {
    const zahm = simulateBalance(DEFAULT_RULES, KLEIN);
    const wild = simulateBalance(sanitizeRules({
      ...DEFAULT_RULES, underdogBoost: 3, underdogRampStart: 1.5, underdogRampEnd: 4,
    }), KLEIN);
    expect(wild.punkteVerhaeltnis).toBeGreaterThan(zahm.punkteVerhaeltnis);
  });

  it("dämpfende Regler holen das Verhältnis zurück Richtung Favorit", () => {
    const standard = simulateBalance(DEFAULT_RULES, KLEIN);
    const gedaempft = simulateBalance(sanitizeRules({
      ...DEFAULT_RULES, winnerFloor: false, wrongPenalty: -5, minPayout: 5, k: 1.2,
    }), KLEIN);
    expect(gedaempft.punkteVerhaeltnis).toBeLessThan(standard.punkteVerhaeltnis);
  });

  it("aktiver Joker hebt den Modifikator-Anteil über 0", () => {
    const r = simulateBalance(sanitizeRules({
      ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 2 },
    }), KLEIN);
    expect(r.modifikatorAnteil).toBeGreaterThan(0);
  });

  it("größerer Joker-Faktor erhöht Modifikator-Anteil und Maximalfall", () => {
    const klein = simulateBalance(sanitizeRules({
      ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 1.2 },
    }), KLEIN);
    const gross = simulateBalance(sanitizeRules({
      ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 2 },
    }), KLEIN);
    expect(gross.modifikatorAnteil).toBeGreaterThan(klein.modifikatorAnteil);
    expect(gross.maximalfall).toBeGreaterThan(klein.maximalfall);
  });
});

describe("bewerten — Ampel danach, WER gewinnt", () => {
  const lage = (patch) => bewerten({
    gewinner: "kenner", kennerQuote: 0.6, zockerQuote: 0.1,
    favoritQuote: 0.05, modifikatorAnteil: 0.05, ...patch,
  });

  it("grün, wenn der Kenner die Runde gewinnt", () => {
    expect(lage({}).stufe).toBe("gruen");
  });

  it("gelb, wenn der Aufhol-Bonus spürbar Sieger kippt", () => {
    const r = lage({ aufholFlipQuote: 0.25 });
    expect(r.stufe).toBe("gelb");
    expect(r.titel).toMatch(/Aufholen/);
  });

  it("rot, wenn der Aufhol-Bonus zu oft den besten Tipper entthront", () => {
    const r = lage({ aufholFlipQuote: 0.4 });
    expect(r.stufe).toBe("rot");
    expect(r.titel).toMatch(/entwertet/);
  });

  it("grün auch, wenn der solide Tipper vorn liegt", () => {
    expect(lage({ gewinner: "solide" }).stufe).toBe("gruen");
  });

  it("rot, wenn der Dauerzocker gewinnt", () => {
    const r = lage({ gewinner: "zocker", zockerQuote: 0.6 });
    expect(r.stufe).toBe("rot");
    expect(r.titel).toMatch(/Glück/);
  });

  it("gelb, wenn nur der Favoriten-Tipper gewinnt (Mut lohnt nicht)", () => {
    const r = lage({ gewinner: "favorit", favoritQuote: 0.6 });
    expect(r.stufe).toBe("gelb");
    expect(r.titel).toMatch(/Mut/);
  });

  it("gelb, wenn wildes Tippen sich durchsetzt", () => {
    expect(lage({ gewinner: "mutig" }).stufe).toBe("gelb");
  });

  it("rot, wenn Modifikatoren dominieren — unabhängig vom Sieger", () => {
    const r = lage({ modifikatorAnteil: 0.4 });
    expect(r.stufe).toBe("rot");
    expect(r.titel).toMatch(/Modifikatoren/);
  });

  it("jede Lage hat Titel und Klartext", () => {
    for (const patch of [{}, { gewinner: "zocker", zockerQuote: 0.6 }, { gewinner: "favorit", favoritQuote: 0.6 },
                         { gewinner: "mutig" }, { modifikatorAnteil: 0.4 }]) {
      const r = lage(patch);
      expect(r.titel).toBeTruthy();
      expect(r.text.length).toBeGreaterThan(20);
    }
  });
});
