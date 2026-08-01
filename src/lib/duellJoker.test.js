import { describe, it, expect } from "vitest";
import {
  DUELL_TYPEN, PHASEN, ZIELWAHL, UMFANG, ANSAGE,
  DUELL_LIMITS, DEFAULT_DUELL, EMPFEHLUNG,
  sanitizeDuellJoker, fensterVon, duellPlan, zulaessigeZiele,
  applyDuellJoker, beschreibeDuell, konflikte, waehleSpiele,
} from "./duellJoker";

// ── Kataloge ────────────────────────────────────────────────

describe("Kataloge", () => {
  it("jeder Katalog-Eintrag hat key, label und desc", () => {
    for (const liste of [DUELL_TYPEN, PHASEN, ZIELWAHL, UMFANG, ANSAGE]) {
      for (const e of liste) expect(e.key && e.label && e.desc).toBeTruthy();
      expect(new Set(liste.map((e) => e.key)).size).toBe(liste.length);
    }
  });
});

describe("sanitizeDuellJoker", () => {
  it("ohne Angaben ist die Vorgabe DEFAULT_DUELL", () => {
    expect(sanitizeDuellJoker()).toEqual(DEFAULT_DUELL);
    expect(sanitizeDuellJoker({})).toEqual(DEFAULT_DUELL);
  });

  it("Unsinn fällt auf die Vorgabe zurück", () => {
    const r = sanitizeDuellJoker({ phase: "quatsch", zielWahl: "quatsch", umfang: "quatsch", ansage: "quatsch", typen: ["quatsch"] });
    expect(r.phase).toBe(DEFAULT_DUELL.phase);
    expect(r.zielWahl).toBe(DEFAULT_DUELL.zielWahl);
    expect(r.umfang).toBe(DEFAULT_DUELL.umfang);
    expect(r.ansage).toBe(DEFAULT_DUELL.ansage);
    expect(r.typen).toEqual(DEFAULT_DUELL.typen);
  });

  it("Zahlen werden auf DUELL_LIMITS beschnitten", () => {
    const r = sanitizeDuellJoker({ anzahl: 99, klau: { anteil: 5 }, block: { restanteil: 5 }, maxProSaison: -1 });
    expect(r.anzahl).toBe(DUELL_LIMITS.anzahl.max);
    expect(r.klau.anteil).toBe(DUELL_LIMITS.klauAnteil.max);
    expect(r.block.restanteil).toBe(DUELL_LIMITS.blockRestanteil.max);
    expect(r.maxProSaison).toBe(DUELL_LIMITS.maxProSaison.min);
  });

  it("nur ein ausdrückliches false schaltet nurGewinn ab (wie nurGetippte)", () => {
    expect(sanitizeDuellJoker({}).block.nurGewinn).toBe(true);
    expect(sanitizeDuellJoker({ block: { nurGewinn: false } }).block.nurGewinn).toBe(false);
    expect(sanitizeDuellJoker({ block: { nurGewinn: "nein" } }).block.nurGewinn).toBe(true);
  });

  // ── Korrektur 1 (Abschnitt 8b (a)) ─────────────────────────
  it("1c.1 abSpieltag/bisSpieltag bleiben null, statt zu 1 zu werden", () => {
    const r = sanitizeDuellJoker(DEFAULT_DUELL);
    expect(r.abSpieltag).toBeNull();
    expect(r.bisSpieltag).toBeNull();
  });

  it("null und undefined gelten beide als keine Vorgabe, 0 bleibt ungültig", () => {
    expect(sanitizeDuellJoker({ abSpieltag: null, bisSpieltag: null }).abSpieltag).toBeNull();
    expect(sanitizeDuellJoker({ abSpieltag: undefined, bisSpieltag: undefined }).bisSpieltag).toBeNull();
    expect(sanitizeDuellJoker({ abSpieltag: 0, bisSpieltag: 0 }).abSpieltag).toBeNull();
    expect(sanitizeDuellJoker({ abSpieltag: 0, bisSpieltag: 0 }).bisSpieltag).toBeNull();
    expect(sanitizeDuellJoker({ abSpieltag: 10, bisSpieltag: 20 })).toMatchObject({ abSpieltag: 10, bisSpieltag: 20 });
  });
});

// ── Pflichtfall 1 ───────────────────────────────────────────

describe("applyDuellJoker — Grundverhalten", () => {
  const verlauf = [
    { wettbewerb: "BL", matchday: 1, board: [
      { userId: "a", name: "A", total: 10 },
      { userId: "b", name: "B", total: 40 },
    ] },
  ];

  it("1. Standardregelwerk: dieselbe Referenz", () => {
    expect(applyDuellJoker(verlauf, {}, [])).toBe(verlauf);
    expect(applyDuellJoker(verlauf, { duell: DEFAULT_DUELL }, [
      { spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "klau" },
    ])).toBe(verlauf);
  });

  it("leere Einsätze bei aktiver Regel: ebenfalls dieselbe Referenz", () => {
    const rules = { duell: { ...DEFAULT_DUELL, enabled: true } };
    expect(applyDuellJoker(verlauf, rules, [])).toBe(verlauf);
  });
});

// ── Pflichtfall 2 ───────────────────────────────────────────

describe("applyDuellJoker — Klau, nullsumme", () => {
  const verlauf = [
    { wettbewerb: "BL", matchday: 1, board: [
      { userId: "a", name: "A", total: 10 },
      { userId: "b", name: "B", total: 40 },
    ] },
    { wettbewerb: "BL", matchday: 2, board: [
      { userId: "a", name: "A", total: 25 },
      { userId: "b", name: "B", total: 70 },
    ] },
  ];
  const rules = { duell: { ...DEFAULT_DUELL, enabled: true, klau: { anteil: 0.35, modus: "nullsumme" } } };
  const einsaetze = [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "klau" }];

  it("2. die Summe über alle Spieler bleibt an jedem Spieltag unverändert", () => {
    const r = applyDuellJoker(verlauf, rules, einsaetze);
    for (let i = 0; i < verlauf.length; i++) {
      const vorher = verlauf[i].board.reduce((s, z) => s + z.total, 0);
      const nachher = r[i].board.reduce((s, z) => s + z.total, 0);
      expect(nachher).toBeCloseTo(vorher, 6);
    }
  });

  it("die Übertragung entspricht dem eingestellten Anteil", () => {
    const r = applyDuellJoker(verlauf, rules, einsaetze);
    const a = r[0].board.find((z) => z.userId === "a");
    const b = r[0].board.find((z) => z.userId === "b");
    expect(a.total).toBeCloseTo(10 + 40 * 0.35, 6);
    expect(b.total).toBeCloseTo(40 - 40 * 0.35, 6);
  });
});

// ── Pflichtfall 3 ───────────────────────────────────────────

describe("applyDuellJoker — Klau auf negative Punkte", () => {
  it("3. aus einem Minus lässt sich nichts klauen", () => {
    const verlauf = [
      { wettbewerb: "BL", matchday: 1, board: [
        { userId: "a", name: "A", total: 10 },
        { userId: "b", name: "B", total: -5 },
      ] },
    ];
    const rules = { duell: { ...DEFAULT_DUELL, enabled: true } };
    const r = applyDuellJoker(verlauf, rules, [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "klau" }]);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(10);
    expect(r[0].board.find((z) => z.userId === "b").total).toBe(-5);
  });
});

// ── Pflichtfall 4 ───────────────────────────────────────────

describe("applyDuellJoker — Block mit nurGewinn: true auf negative Punkte", () => {
  it("4. das Ziel bleibt unverändert", () => {
    const verlauf = [
      { wettbewerb: "BL", matchday: 1, board: [
        { userId: "a", name: "A", total: 0 },
        { userId: "b", name: "B", total: -20 },
      ] },
    ];
    const rules = { duell: { ...DEFAULT_DUELL, enabled: true, block: { restanteil: 0.5, nurGewinn: true, beute: 0 } } };
    const r = applyDuellJoker(verlauf, rules, [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "block" }]);
    expect(r[0].board.find((z) => z.userId === "b").total).toBe(-20);
  });
});

// ── Pflichtfall 5 ───────────────────────────────────────────

describe("applyDuellJoker — Block mit nurGewinn: false auf negative Punkte", () => {
  it("5. der Verlust wird gedämpft (bewusst erlaubt, siehe Kopfkommentar)", () => {
    const verlauf = [
      { wettbewerb: "BL", matchday: 1, board: [
        { userId: "a", name: "A", total: 0 },
        { userId: "b", name: "B", total: -20 },
      ] },
    ];
    const rules = { duell: { ...DEFAULT_DUELL, enabled: true, block: { restanteil: 0.5, nurGewinn: false, beute: 0 } } };
    const r = applyDuellJoker(verlauf, rules, [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "block" }]);
    // -20 * restanteil(0.5) = -10 — weniger negativ als vorher.
    expect(r[0].board.find((z) => z.userId === "b").total).toBeCloseTo(-10, 6);
  });
});

// ── Pflichtfall 6 ───────────────────────────────────────────

describe("applyDuellJoker — maxProSaison deckelt chronologisch", () => {
  it("6. der vierte Einsatz bringt nichts mehr, wenn der Deckel erreicht ist", () => {
    // a klaut an 4 Spieltagen je 10 Punkte von b, Deckel bei 30.
    const verlauf = [1, 2, 3, 4].map((md) => ({
      wettbewerb: "BL", matchday: md, board: [
        { userId: "a", name: "A", total: 0 },
        { userId: "b", name: "B", total: md * 10 },
      ],
    }));
    const rules = { duell: { ...DEFAULT_DUELL, enabled: true, klau: { anteil: 1.0, modus: "nullsumme" }, maxProSaison: 30 } };
    const einsaetze = [1, 2, 3, 4].map((spieltag) => ({ spieltag, vonUserId: "a", aufUserId: "b", typ: "klau" }));
    const r = applyDuellJoker(verlauf, rules, einsaetze);

    const letzterStand = r[r.length - 1].board;
    expect(letzterStand.find((z) => z.userId === "a").total).toBeCloseTo(30, 6);   // gedeckelt, nicht 40
    expect(letzterStand.find((z) => z.userId === "b").total).toBeCloseTo(10, 6);   // 4. Spieltag unangetastet

    // Am 3. Spieltag ist der Deckel schon exakt erreicht.
    const dritterStand = r[2].board;
    expect(dritterStand.find((z) => z.userId === "a").total).toBeCloseTo(30, 6);
  });
});

// ── Pflichtfall 7 ───────────────────────────────────────────

describe("zulaessigeZiele — nurVorne", () => {
  const board = [
    { userId: "c", name: "C", total: 100 },
    { userId: "b", name: "B", total: 50 },
    { userId: "a", name: "A", total: 20 },
    { userId: "d", name: "D", total: 5 },
  ];
  const duell = { ...DEFAULT_DUELL, zielWahl: "nurVorne" };

  it("7. nie der eigene Name, nie jemand dahinter", () => {
    const ziele = zulaessigeZiele(board, "b", duell);
    expect(ziele).toEqual(["c"]);
    expect(ziele).not.toContain("b");
    expect(ziele).not.toContain("a");
    expect(ziele).not.toContain("d");
  });

  it("ganz vorne gibt es kein erlaubtes Ziel", () => {
    expect(zulaessigeZiele(board, "c", duell)).toEqual([]);
  });
});

// ── Pflichtfall 8 ───────────────────────────────────────────

describe("zulaessigeZiele — maxProZiel und immun", () => {
  const board = [
    { userId: "a", name: "A", total: 10 },
    { userId: "b", name: "B", total: 10 },
    { userId: "c", name: "C", total: 10 },
  ];
  const duell = { ...DEFAULT_DUELL, zielWahl: "frei" };

  it("8a. maxProZiel schließt ein bereits ausgeschöpftes Ziel aus", () => {
    const cfg = { ...duell, maxProZiel: 2 };
    const bisherigeEinsaetze = [
      { spieltag: 5, vonUserId: "a", aufUserId: "b", typ: "klau" },
      { spieltag: 8, vonUserId: "a", aufUserId: "b", typ: "klau" },
    ];
    const ziele = zulaessigeZiele(board, "a", cfg, { bisherigeEinsaetze });
    expect(ziele).not.toContain("b");
    expect(ziele).toContain("c");
  });

  it("8b. immun schließt ein frisch getroffenes Ziel für die Schonfrist aus", () => {
    const cfg = { ...duell, maxProZiel: 6, immun: 3 };
    const bisherigeEinsaetze = [{ spieltag: 8, vonUserId: "a", aufUserId: "b", typ: "klau" }];
    // Noch in der Schonfrist (Differenz 1 < 3).
    expect(zulaessigeZiele(board, "a", cfg, { bisherigeEinsaetze, aktuellerSpieltag: 9 })).not.toContain("b");
    // Schonfrist vorbei (Differenz 4 >= 3).
    expect(zulaessigeZiele(board, "a", cfg, { bisherigeEinsaetze, aktuellerSpieltag: 12 })).toContain("b");
  });
});

// ── Pflichtfall 9 ───────────────────────────────────────────

describe("fensterVon — alle Phasen bei 34 Spieltagen", () => {
  it("9. jede Phase liefert das erwartete Intervall", () => {
    expect(fensterVon({ ...DEFAULT_DUELL, phase: "ganze" }, 34)).toEqual({ von: 1, bis: 34 });
    expect(fensterVon({ ...DEFAULT_DUELL, phase: "rueckrunde" }, 34)).toEqual({ von: 18, bis: 34 });
    expect(fensterVon({ ...DEFAULT_DUELL, phase: "letztesDrittel" }, 34)).toEqual({ von: 23, bis: 34 });
    expect(fensterVon({ ...DEFAULT_DUELL, phase: "schlussspurt", schlussLaenge: 4 }, 34)).toEqual({ von: 31, bis: 34 });
    expect(fensterVon({ ...DEFAULT_DUELL, phase: "manuell", abSpieltag: 10, bisSpieltag: 20 }, 34)).toEqual({ von: 10, bis: 20 });
  });

  // ── Korrektur 1 (Abschnitt 8b (a)) ─────────────────────────
  it("1c.2 manuell ohne gesetzte Grenzen fällt auf das letzte Drittel zurück, nicht die ganze Saison", () => {
    const manuell = fensterVon({ ...DEFAULT_DUELL, phase: "manuell" }, 34);
    const letztesDrittel = fensterVon({ ...DEFAULT_DUELL, phase: "letztesDrittel" }, 34);
    expect(manuell).toEqual(letztesDrittel);
    expect(manuell).not.toEqual({ von: 1, bis: 34 });
  });
});

// ── Pflichtfall 10 ──────────────────────────────────────────

describe("duellPlan", () => {
  it("10. hält abstand ein und legt keinen Joker außerhalb des Fensters", () => {
    const duell = { ...DEFAULT_DUELL, enabled: true, phase: "letztesDrittel", anzahl: 3, abstand: 2, proSpieltag: 1 };
    const p = duellPlan({ spieltage: 34, duell, seed: "runde-test", userIds: ["u1", "u2", "u3"] });

    expect(p.von).toBe(23);
    expect(p.bis).toBe(34);

    for (const id of ["u1", "u2", "u3"]) {
      const tage = p.proSpieler[id];
      for (const t of tage) {
        expect(t).toBeGreaterThanOrEqual(p.von);
        expect(t).toBeLessThanOrEqual(p.bis);
      }
      const sortiert = [...tage].sort((a, b) => a - b);
      for (let i = 1; i < sortiert.length; i++) {
        expect(sortiert[i] - sortiert[i - 1]).toBeGreaterThanOrEqual(duell.abstand);
      }
    }
  });

  it("ausgeschaltet oder ohne Spieler liefert leere Pläne", () => {
    const aus = duellPlan({ spieltage: 34, duell: { ...DEFAULT_DUELL, enabled: false }, seed: "x", userIds: ["u1"] });
    expect(aus.proSpieler.u1).toEqual([]);
  });
});

// ── Korrektur 2 (Abschnitt 8b (b)) ─────────────────────────

describe("waehleSpiele", () => {
  const spiele = [
    { spielId: "s1", punkte: 3 },
    { spielId: "s2", punkte: 8 },
    { spielId: "s3", punkte: 8 },
    { spielId: "s4", punkte: -2 },
  ];

  it("umfang: spieltag liefert alle Ids", () => {
    expect(waehleSpiele(spiele, { ...DEFAULT_DUELL, umfang: "spieltag" })).toEqual(["s1", "s2", "s3", "s4"]);
  });

  it("umfang: einSpiel, wahl: bestes liefert das ertragreichste Spiel (Gleichstand -> kleinere spielId)", () => {
    const r = waehleSpiele(spiele, { ...DEFAULT_DUELL, umfang: "einSpiel", wahl: "bestes" });
    expect(r).toEqual(["s2"]); // s2 und s3 sind gleichauf bei 8, s2 < s3
  });

  it("umfang: einSpiel, wahl: selbst liefert die erste gültige gewählte Id", () => {
    const r = waehleSpiele(spiele, { ...DEFAULT_DUELL, umfang: "einSpiel", wahl: "selbst" }, ["nichtVorhanden", "s3", "s1"]);
    expect(r).toEqual(["s3"]);
  });

  it("umfang: nSpiele, wahl: bestes liefert die spieleProEinsatz ertragreichsten Spiele", () => {
    const r = waehleSpiele(spiele, { ...DEFAULT_DUELL, umfang: "nSpiele", wahl: "bestes", spieleProEinsatz: 2 });
    expect(r).toEqual(["s2", "s3"]);
  });

  it("umfang: nSpiele, wahl: selbst liefert die ersten spieleProEinsatz gültigen gewählten Ids", () => {
    const r = waehleSpiele(spiele, { ...DEFAULT_DUELL, umfang: "nSpiele", wahl: "selbst", spieleProEinsatz: 2 }, ["s4", "unbekannt", "s1", "s2"]);
    expect(r).toEqual(["s4", "s1"]);
  });

  it("unbekannte Ids werden verworfen — kein Treffer auf ein nicht getipptes Spiel", () => {
    const r = waehleSpiele(spiele, { ...DEFAULT_DUELL, umfang: "einSpiel", wahl: "selbst" }, ["unbekannt", "auchUnbekannt"]);
    expect(r).toEqual([]);
  });
});

// ── Korrektur 2 (Abschnitt 8b (b)) ─────────────────────────

describe("applyDuellJoker — basis ersetzt die Rechengrundlage", () => {
  const verlauf = [
    { wettbewerb: "BL", matchday: 1, board: [
      { userId: "a", name: "A", total: 10 },
      { userId: "b", name: "B", total: 50 },
    ] },
  ];
  const rules = { duell: { ...DEFAULT_DUELL, enabled: true, klau: { anteil: 0.35, modus: "nullsumme" } } };

  it("basis ersetzt die Spieltagspunkte als Rechengrundlage, der Abzug wirkt trotzdem auf die vollen Spieltagspunkte", () => {
    // Ziel holt aus einem Spiel 20 Punkte, hat am Spieltag insgesamt 50 —
    // bei Klau mit Anteil 0,35 verliert es 7 von seinen 50 (Beispiel aus
    // Abschnitt 8b (b)).
    const einsaetze = [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "klau", basis: 20 }];
    const r = applyDuellJoker(verlauf, rules, einsaetze);
    const a = r[0].board.find((z) => z.userId === "a");
    const b = r[0].board.find((z) => z.userId === "b");
    expect(a.total).toBeCloseTo(10 + 20 * 0.35, 6); // 17
    expect(b.total).toBeCloseTo(50 - 20 * 0.35, 6); // 43
  });

  it("ohne basis (undefined) gilt weiterhin der ganze Spieltag — altes Verhalten", () => {
    const einsaetze = [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "klau" }];
    const r = applyDuellJoker(verlauf, rules, einsaetze);
    const a = r[0].board.find((z) => z.userId === "a");
    const b = r[0].board.find((z) => z.userId === "b");
    expect(a.total).toBeCloseTo(10 + 50 * 0.35, 6);
    expect(b.total).toBeCloseTo(50 - 50 * 0.35, 6);
  });
});

// ── Konflikte & Beschreibung ────────────────────────────────

describe("konflikte", () => {
  it("mitverdienen ohne Deckel wird gemeldet", () => {
    const rules = { duell: { ...DEFAULT_DUELL, enabled: true, klau: { anteil: 0.35, modus: "mitverdienen" }, maxProSaison: 0 } };
    const k = konflikte(rules);
    expect(k.length).toBe(1);
    expect(k[0].korrigieren).toBe(true);
  });

  it("mit Deckel oder nullsumme gibt es keine Meldung", () => {
    expect(konflikte({ duell: { ...DEFAULT_DUELL, enabled: true, klau: { anteil: 0.35, modus: "mitverdienen" }, maxProSaison: 60 } })).toEqual([]);
    expect(konflikte({ duell: { ...DEFAULT_DUELL, enabled: true, klau: { anteil: 0.35, modus: "nullsumme" }, maxProSaison: 0 } })).toEqual([]);
  });

  it("bei ausgeschalteter Regel gibt es nie eine Meldung", () => {
    expect(konflikte({ duell: { ...DEFAULT_DUELL, enabled: false, klau: { modus: "mitverdienen" }, maxProSaison: 0 } })).toEqual([]);
  });
});

describe("beschreibeDuell", () => {
  it("nennt Typ, Anzahl und Fenster", () => {
    const t = beschreibeDuell({ ...DEFAULT_DUELL, enabled: true }, 34);
    expect(t).toContain("Klau-Joker");
    expect(t).toMatch(/23/);
    expect(t).toMatch(/34/);
  });

  it("ausgeschaltet: klarer Hinweistext", () => {
    expect(beschreibeDuell({ ...DEFAULT_DUELL, enabled: false })).toBe("Keine Duell-Joker in dieser Runde.");
  });
});

describe("EMPFEHLUNG", () => {
  it("liegt innerhalb der DUELL_LIMITS (verengt nie darüber hinaus)", () => {
    expect(EMPFEHLUNG.anzahl.min).toBeGreaterThanOrEqual(DUELL_LIMITS.anzahl.min);
    expect(EMPFEHLUNG.anzahl.max).toBeLessThanOrEqual(DUELL_LIMITS.anzahl.max);
    expect(EMPFEHLUNG.klauAnteil.min).toBeGreaterThanOrEqual(DUELL_LIMITS.klauAnteil.min);
    expect(EMPFEHLUNG.klauAnteil.max).toBeLessThanOrEqual(DUELL_LIMITS.klauAnteil.max);
    expect(EMPFEHLUNG.blockRestanteil.min).toBeGreaterThanOrEqual(DUELL_LIMITS.blockRestanteil.min);
    expect(EMPFEHLUNG.blockRestanteil.max).toBeLessThanOrEqual(DUELL_LIMITS.blockRestanteil.max);
  });
});
