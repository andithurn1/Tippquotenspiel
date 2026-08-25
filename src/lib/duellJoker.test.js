import { describe, it, expect } from "vitest";
import {
  DUELL_TYPEN, PHASEN, ZIELWAHL,
  DUELL_LIMITS, DEFAULT_DUELL, EMPFEHLUNG,
  sanitizeDuellJoker, fensterVon, duellPlan, zulaessigeZiele,
  applyDuellJoker, beschreibeDuell, konflikte, waehleSpiele,
  einsaetzeAusTipps,
} from "./duellJoker";
import { scoreLeaderboardHistory, DEFAULT_RULES, createMockOddsSource } from "./engine";

// ── Kataloge ────────────────────────────────────────────────

describe("Kataloge", () => {
  it("jeder Katalog-Eintrag hat key, label und desc", () => {
    for (const liste of [DUELL_TYPEN, PHASEN, ZIELWAHL]) {
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
    const r = sanitizeDuellJoker({ phase: "quatsch", zielWahl: "quatsch", typen: ["quatsch"] });
    expect(r.phase).toBe(DEFAULT_DUELL.phase);
    expect(r.zielWahl).toBe(DEFAULT_DUELL.zielWahl);
    expect(r.typen).toEqual(DEFAULT_DUELL.typen);
  });

  // ── Umfang/Wahl/spieleProEinsatz/abstand wandern in jokerBasis ─
  it("liefert umfang, spieleProEinsatz, wahl und abstand nicht mehr zurück (design/joker-grundform.md 5.4/5.5)", () => {
    const r = sanitizeDuellJoker({ umfang: "spieltag", spieleProEinsatz: 3, wahl: "bestes", abstand: 5 });
    expect(r).not.toHaveProperty("umfang");
    expect(r).not.toHaveProperty("spieleProEinsatz");
    expect(r).not.toHaveProperty("wahl");
    expect(r).not.toHaveProperty("abstand");
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
    const rules = { duell: { ...DEFAULT_DUELL, enabled: true, typen: ["block"], block: { restanteil: 0.5, nurGewinn: true, beute: 0 } } };
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
    const rules = { duell: { ...DEFAULT_DUELL, enabled: true, typen: ["block"], block: { restanteil: 0.5, nurGewinn: false, beute: 0 } } };
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

// ── konter ──────────────────────────────────────────────────
// 🔴 `konter` stand bis 06.08.2026 im Regelwerk, wurde gesäubert, reiste im
// Creator-Code mit — und keine Zeile fragte es ab. Diese Tests halten die
// Bedeutung fest, nicht nur die Wirkung: der Konter ist eine Ausnahme von der
// ZIELWAHL, nicht von den Schutzregeln.
describe("zulaessigeZiele — konter", () => {
  const board = [
    { userId: "c", name: "C", total: 100 },
    { userId: "b", name: "B", total: 50 },
    { userId: "a", name: "A", total: 20 },
  ];
  // „nur nach vorne": a darf normalerweise nur b und c treffen — und wird
  // von c getroffen. Ohne Ausnahme kann b, den a nicht treffen darf, nie
  // gekontert werden.
  const getroffenVon = (von, spieltag = 7) => [
    { spieltag, vonUserId: von, aufUserId: "a", typ: "klau" },
  ];

  it("aus ist die Vorgabe: ein Treffer ändert nichts an der Zielwahl", () => {
    const cfg = { ...DEFAULT_DUELL, zielWahl: "nurVorne", konter: false, immun: 0 };
    const ziele = zulaessigeZiele(board, "a", cfg, {
      bisherigeEinsaetze: getroffenVon("b"), aktuellerSpieltag: 7,
    });
    expect(ziele.sort()).toEqual(["b", "c"]);
  });

  it("der Fall, für den es `konter` gibt: ein Angreifer HINTER mir", () => {
    // Im Test darüber steht b VOR a und ist ohnehin ein erlaubtes Ziel — dort
    // zeigt `konter` gar nichts. Erst hier wird die Zielwahl gebrochen, und
    // genau darin liegt der Sinn: bei „nur nach vorne" steht der Angreifer
    // per Definition hinter dem Getroffenen.
    const board2 = [
      { userId: "a", name: "A", total: 100 },
      { userId: "b", name: "B", total: 50 },
    ];
    const aus = { ...DEFAULT_DUELL, zielWahl: "nurVorne", konter: false, immun: 0 };
    const an = { ...aus, konter: true };
    const args = { bisherigeEinsaetze: getroffenVon("b"), aktuellerSpieltag: 7 };
    expect(zulaessigeZiele(board2, "a", aus, args)).toEqual([]);
    expect(zulaessigeZiele(board2, "a", an, args)).toEqual(["b"]);
  });

  it("nur DERSELBE Spieltag zählt", () => {
    const board2 = [
      { userId: "a", name: "A", total: 100 },
      { userId: "b", name: "B", total: 50 },
    ];
    const an = { ...DEFAULT_DUELL, zielWahl: "nurVorne", konter: true, immun: 0 };
    expect(zulaessigeZiele(board2, "a", an, {
      bisherigeEinsaetze: getroffenVon("b", 6), aktuellerSpieltag: 7,
    })).toEqual([]);
  });

  it("nur der ANGREIFER, nicht jemand Drittes", () => {
    const board2 = [
      { userId: "a", name: "A", total: 100 },
      { userId: "b", name: "B", total: 50 },
      { userId: "d", name: "D", total: 30 },
    ];
    const an = { ...DEFAULT_DUELL, zielWahl: "nurVorne", konter: true, immun: 0 };
    expect(zulaessigeZiele(board2, "a", an, {
      bisherigeEinsaetze: getroffenVon("b"), aktuellerSpieltag: 7,
    })).toEqual(["b"]);
  });

  it("auch bei „nur Top 3“ und „nicht den Letzten“", () => {
    const gross = [1, 2, 3, 4, 5].map((i) => ({ userId: `p${i}`, name: `P${i}`, total: 100 - i * 10 }));
    const einsaetze = [{ spieltag: 7, vonUserId: "p5", aufUserId: "p4", typ: "klau" }];
    const args = { bisherigeEinsaetze: einsaetze, aktuellerSpieltag: 7 };

    const top3Aus = { ...DEFAULT_DUELL, zielWahl: "nurTop3", konter: false, immun: 0 };
    expect(zulaessigeZiele(gross, "p4", top3Aus, args)).not.toContain("p5");
    expect(zulaessigeZiele(gross, "p4", { ...top3Aus, konter: true }, args)).toContain("p5");

    const letzterAus = { ...DEFAULT_DUELL, zielWahl: "nichtLetzter", konter: false, immun: 0 };
    expect(zulaessigeZiele(gross, "p4", letzterAus, args)).not.toContain("p5");
    expect(zulaessigeZiele(gross, "p4", { ...letzterAus, konter: true }, args)).toContain("p5");
  });

  // ⚠️ Der Punkt, an dem ein Konter sonst zum Freifahrtschein würde.
  it("hebt maxProZiel NICHT auf", () => {
    const board2 = [
      { userId: "a", name: "A", total: 100 },
      { userId: "b", name: "B", total: 50 },
    ];
    const an = { ...DEFAULT_DUELL, zielWahl: "nurVorne", konter: true, immun: 0, maxProZiel: 1 };
    const bisherigeEinsaetze = [
      { spieltag: 7, vonUserId: "b", aufUserId: "a", typ: "klau" },  // b trifft a
      { spieltag: 3, vonUserId: "a", aufUserId: "b", typ: "klau" },  // a hat b schon einmal getroffen
    ];
    expect(zulaessigeZiele(board2, "a", an, { bisherigeEinsaetze, aktuellerSpieltag: 7 })).toEqual([]);
  });

  it("hebt immun NICHT auf", () => {
    const board2 = [
      { userId: "a", name: "A", total: 100 },
      { userId: "b", name: "B", total: 50 },
    ];
    const an = { ...DEFAULT_DUELL, zielWahl: "nurVorne", konter: true, immun: 3, maxProZiel: 6 };
    const bisherigeEinsaetze = [
      { spieltag: 7, vonUserId: "b", aufUserId: "a", typ: "klau" },
      { spieltag: 6, vonUserId: "a", aufUserId: "b", typ: "klau" },  // erst einen Spieltag her
    ];
    expect(zulaessigeZiele(board2, "a", an, { bisherigeEinsaetze, aktuellerSpieltag: 7 })).toEqual([]);
  });

  it("ohne `aktuellerSpieltag` gibt es keinen Konter", () => {
    const board2 = [
      { userId: "a", name: "A", total: 100 },
      { userId: "b", name: "B", total: 50 },
    ];
    const an = { ...DEFAULT_DUELL, zielWahl: "nurVorne", konter: true, immun: 0 };
    expect(zulaessigeZiele(board2, "a", an, { bisherigeEinsaetze: getroffenVon("b") })).toEqual([]);
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
  it("10. hält den Abstand aus basis.abklingzeit ein und legt keinen Joker außerhalb des Fensters", () => {
    const duell = { ...DEFAULT_DUELL, enabled: true, phase: "letztesDrittel", anzahl: 3, proSpieltag: 1 };
    const basis = { abklingzeit: 2 };
    const p = duellPlan({ spieltage: 34, duell, basis, seed: "runde-test", userIds: ["u1", "u2", "u3"] });

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
        expect(sortiert[i] - sortiert[i - 1]).toBeGreaterThanOrEqual(basis.abklingzeit);
      }
    }
  });

  it("ausgeschaltet oder ohne Spieler liefert leere Pläne", () => {
    const aus = duellPlan({ spieltage: 34, duell: { ...DEFAULT_DUELL, enabled: false }, seed: "x", userIds: ["u1"] });
    expect(aus.proSpieler.u1).toEqual([]);
  });

  it("ohne basis läuft ohne Abstand durch, statt abzustürzen", () => {
    const duell = { ...DEFAULT_DUELL, enabled: true, phase: "letztesDrittel", anzahl: 3, proSpieltag: 1 };
    expect(() => duellPlan({ spieltage: 34, duell, seed: "y", userIds: ["u1", "u2"] })).not.toThrow();
    const p = duellPlan({ spieltage: 34, duell, seed: "y", userIds: ["u1", "u2"] });
    expect(p.von).toBe(23);
    expect(p.bis).toBe(34);
  });
});

// ── Korrektur 2 (Abschnitt 8b (b)) ─────────────────────────

describe("waehleSpiele", () => {
  // `waehleSpiele` bekommt seit design/joker-grundform.md 5.4 das fertig
  // gemergte `basis`-Objekt aus jokerBasis.basisFuer() als zweiten Parameter,
  // nicht mehr `duell` — hier als schlichtes Literal nachgebaut, damit dieser
  // Test nicht von jokerBasis.js abhängt (Importzyklus-Vermeidung, siehe
  // Kopfkommentar in duellJoker.js).
  const spiele = [
    { spielId: "s1", punkte: 3 },
    { spielId: "s2", punkte: 8 },
    { spielId: "s3", punkte: 8 },
    { spielId: "s4", punkte: -2 },
  ];

  it("umfang: spieltag liefert alle Ids", () => {
    expect(waehleSpiele(spiele, { umfang: "spieltag" })).toEqual(["s1", "s2", "s3", "s4"]);
  });

  it("umfang: einSpiel, wahl: bestes liefert das ertragreichste Spiel (Gleichstand -> kleinere spielId)", () => {
    const r = waehleSpiele(spiele, { umfang: "einSpiel", wahl: "bestes" });
    expect(r).toEqual(["s2"]); // s2 und s3 sind gleichauf bei 8, s2 < s3
  });

  it("umfang: einSpiel, wahl: selbst liefert die erste gültige gewählte Id", () => {
    const r = waehleSpiele(spiele, { umfang: "einSpiel", wahl: "selbst" }, ["nichtVorhanden", "s3", "s1"]);
    expect(r).toEqual(["s3"]);
  });

  it("umfang: nSpiele, wahl: bestes liefert die spieleProEinsatz ertragreichsten Spiele", () => {
    const r = waehleSpiele(spiele, { umfang: "nSpiele", wahl: "bestes", spieleProEinsatz: 2 });
    expect(r).toEqual(["s2", "s3"]);
  });

  it("umfang: nSpiele, wahl: selbst liefert die ersten spieleProEinsatz gültigen gewählten Ids", () => {
    const r = waehleSpiele(spiele, { umfang: "nSpiele", wahl: "selbst", spieleProEinsatz: 2 }, ["s4", "unbekannt", "s1", "s2"]);
    expect(r).toEqual(["s4", "s1"]);
  });

  it("unbekannte Ids werden verworfen — kein Treffer auf ein nicht getipptes Spiel", () => {
    const r = waehleSpiele(spiele, { umfang: "einSpiel", wahl: "selbst" }, ["unbekannt", "auchUnbekannt"]);
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
    // ⚠️ GERUNDET seit 06.08.2026: der Klau-Anteil ist ein Bruch, und der Wert
    // landet direkt im Ranking — dort stand „3339.6" in einer Tabelle, in der
    // jede andere Zahl ganzzahlig ist. Gerundet wird in `applyDuellJoker`,
    // dieselbe Stelle wie in `applySaisonform`.
    expect(a.total).toBe(Math.round(10 + 50 * 0.35));
    expect(b.total).toBe(Math.round(50 - 50 * 0.35));
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

// ── einsaetzeAusTipps (design/kontaktstellen.md Abschnitt 5 Punkt 4) ──

describe("einsaetzeAusTipps", () => {
  const kickoffFrueh = "2026-08-01T15:00:00Z";
  const kickoffSpaet = "2026-08-01T18:00:00Z";

  it("findet einen gültigen Einsatz aus einer Liste roher Tipps", () => {
    const tipps = [
      { userId: "a", matchday: 3, kickoff: kickoffFrueh, tip: { duell: { auf: "b", typ: "klau" } } },
    ];
    expect(einsaetzeAusTipps(tipps)).toEqual([
      { spieltag: 3, vonUserId: "a", aufUserId: "b", typ: "klau", matchId: null },
    ]);
  });

  it("ungültige Einträge werden verworfen: kein tip.duell.auf, unbekannter typ, Selbstziel", () => {
    const tipps = [
      { userId: "a", matchday: 1, kickoff: kickoffFrueh, tip: {} }, // kein duell
      { userId: "a", matchday: 2, kickoff: kickoffFrueh, tip: { duell: { auf: "b" } } }, // kein typ
      { userId: "a", matchday: 3, kickoff: kickoffFrueh, tip: { duell: { auf: "b", typ: "quatsch" } } }, // unbekannter typ
      { userId: "a", matchday: 4, kickoff: kickoffFrueh, tip: { duell: { auf: "a", typ: "klau" } } }, // Selbstziel
      { userId: "a", matchday: 5, kickoff: kickoffFrueh, tip: { duell: { auf: "b", typ: "block" } } }, // gültig
    ];
    expect(einsaetzeAusTipps(tipps)).toEqual([
      { spieltag: 5, vonUserId: "a", aufUserId: "b", typ: "block", matchId: null },
    ]);
  });

  it("zwei Duelle desselben Spielers am selben Spieltag: nur EINES bleibt übrig — das mit dem frühesten kickoff", () => {
    // Bewusst NICHT „der erste Eintrag in der Liste gewinnt": zwei
    // Bundesliga-Spiele desselben Spieltags pfeifen oft zeitgleich an — wessen
    // Datensatz zuerst aus der Datenbank kommt, ist Zufall, darf das Ergebnis
    // also nicht bestimmen. Deshalb hier auch die Gegenprobe mit gedrehter
    // Eingabereihenfolge.
    const frueh = { userId: "a", matchday: 5, matchId: 20, kickoff: kickoffFrueh, tip: { duell: { auf: "b", typ: "klau" } } };
    const spaet = { userId: "a", matchday: 5, matchId: 10, kickoff: kickoffSpaet, tip: { duell: { auf: "c", typ: "block" } } };

    const r1 = einsaetzeAusTipps([frueh, spaet]);
    const r2 = einsaetzeAusTipps([spaet, frueh]); // gedrehte Eingabereihenfolge

    const erwartet = [{ spieltag: 5, vonUserId: "a", aufUserId: "b", typ: "klau", matchId: 20 }];
    expect(r1).toEqual(erwartet);
    expect(r2).toEqual(erwartet); // Reihenfolge der Eingabe ändert nichts am Ergebnis
  });

  it("Rückgabe ist chronologisch nach spieltag sortiert", () => {
    const tipps = [
      { userId: "a", matchday: 10, kickoff: kickoffFrueh, tip: { duell: { auf: "b", typ: "klau" } } },
      { userId: "a", matchday: 2, kickoff: kickoffFrueh, tip: { duell: { auf: "b", typ: "klau" } } },
      { userId: "a", matchday: 6, kickoff: kickoffFrueh, tip: { duell: { auf: "b", typ: "klau" } } },
    ];
    expect(einsaetzeAusTipps(tipps).map((e) => e.spieltag)).toEqual([2, 6, 10]);
  });

  // ── Gegenprobe (design/kontaktstellen.md Abschnitt 5) ──────
  // Beweis, dass `applyDuellJoker` in der ECHTEN Kette kein No-op mehr ist,
  // sobald echte Tipp-Daten durchgereicht werden: derselbe Verlauf, einmal
  // MIT den aus `einsaetzeAusTipps` abgeleiteten Einsätzen gerechnet, einmal
  // OHNE (Parameter weggelassen) — die Endstände der beteiligten Spieler
  // müssen sich messbar unterscheiden.
  it("Gegenprobe: scoreLeaderboardHistory liefert mit echten Einsätzen andere Endstände als ohne", () => {
    const odds = createMockOddsSource();
    const snap = odds.getSnapshot("JOR-ESP");
    const result = odds.getResult("JOR-ESP");
    const entries = [
      // a setzt einen Klau-Joker auf b, beide tippen exakt (positive Punkte
      // bei b nötig — aus einem Minus lässt sich nichts klauen).
      { userId: "a", name: "A", tip: { home: 5, away: 1, duell: { auf: "b", typ: "klau" } }, snapshot: snap, result, matchday: 1 },
      { userId: "b", name: "B", tip: { home: 5, away: 1 }, snapshot: snap, result, matchday: 1 },
    ];
    const rules = {
      ...DEFAULT_RULES,
      duell: { ...DEFAULT_DUELL, enabled: true, klau: { anteil: 0.5, modus: "nullsumme" } },
    };

    const ohne = scoreLeaderboardHistory(entries, rules); // dritter Parameter weggelassen -> No-op
    const mitEinsaetzen = scoreLeaderboardHistory(entries, rules, einsaetzeAusTipps(entries));

    const totalIn = (history, userId) => history[history.length - 1].board.find((z) => z.userId === userId).total;

    expect(totalIn(mitEinsaetzen, "a")).toBeGreaterThan(totalIn(ohne, "a"));
    expect(totalIn(mitEinsaetzen, "b")).toBeLessThan(totalIn(ohne, "b"));
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

// ── Fremdjoker rechnen auf dem GRUNDWERT eines EINZELSPIELS ──
// Andi, 22.08.2026: alle Fremdjoker treffen einzelne Spiele — und die
// rundenweiten Gewichte (CL, Derby, Big Game) dürfen den Wert eines Ziels
// nicht bestimmen, sonst ist das schwerste Spiel immer das lohnendste und die
// Zielwahl keine Entscheidung mehr.
describe("Fremdjoker: Einzelspiel statt Spieltag", () => {
  const verlauf = [
    {
      wettbewerb: "bl", matchday: 1,
      board: [
        { userId: "a", name: "A", total: 0, tips: 1, gewertet: 1 },
        { userId: "b", name: "B", total: 300, tips: 3, gewertet: 3 },
      ],
    },
  ];
  const rules = {
    // ⚠️ `maxProSaison: 0` = kein Punkte-Deckel. Ohne das misst dieser Block
    // nicht die Rechengrundlage, sondern die Vorgabe 60 — der Deckel greift
    // hier bei jedem der Fälle und macht sie ununterscheidbar.
    duell: { ...DEFAULT_DUELL, enabled: true, typen: ["klau"], maxProSaison: 0, klau: { anteil: 0.5, modus: "nullsumme" } },
  };

  it("ohne Spiel-Angabe bleibt es beim ganzen Spieltag (Übergang)", () => {
    const r = applyDuellJoker(verlauf, rules, [
      { spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "klau" },
    ]);
    // 50 % von 300 Spieltagspunkten.
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(150);
  });

  it("mit Spiel-Angabe zählt nur DIESES Spiel", () => {
    const spielPunkte = [
      { userId: "b", key: "bl#1", matchId: "m1", wert: 200, grundwert: 200, ersatz: false },
      { userId: "b", key: "bl#1", matchId: "m2", wert: 100, grundwert: 100, ersatz: false },
    ];
    const r = applyDuellJoker(verlauf, rules, [
      { spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "klau", matchId: "m2" },
    ], null, spielPunkte);
    // 50 % von 100 — nicht von 300.
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(50);
  });

  it("🔴 das rundenweite GEWICHT des Spiels zählt nicht mit", () => {
    // Dasselbe Spiel, einmal als CL-Spiel mit Aufschlag (wert 300 bei Faktor
    // 1,5) und einmal ohne. Für den Angreifer muss beides dasselbe wert sein —
    // sonst geht jeder auf das schwerste Spiel.
    const mitGewicht = [
      { userId: "b", key: "bl#1", matchId: "m1", wert: 300, grundwert: 200, ersatz: false },
    ];
    const ohneGewicht = [
      { userId: "b", key: "bl#1", matchId: "m1", wert: 200, grundwert: 200, ersatz: false },
    ];
    const einsatz = [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "klau", matchId: "m1" }];
    const schwer = applyDuellJoker(verlauf, rules, einsatz, null, mitGewicht);
    const leicht = applyDuellJoker(verlauf, rules, einsatz, null, ohneGewicht);
    expect(schwer[0].board.find((z) => z.userId === "a").total)
      .toBe(leicht[0].board.find((z) => z.userId === "a").total);
    expect(schwer[0].board.find((z) => z.userId === "a").total).toBe(100);
  });

  it("ein ausdrückliches `basis` schlägt beides", () => {
    const spielPunkte = [
      { userId: "b", key: "bl#1", matchId: "m1", wert: 200, grundwert: 200, ersatz: false },
    ];
    const r = applyDuellJoker(verlauf, rules, [
      { spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "klau", matchId: "m1", basis: 40 },
    ], null, spielPunkte);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(20);
  });

  it("ein Spiel, das das Ziel gar nicht getippt hat, fällt auf den Spieltag zurück", () => {
    // Sonst verschluckte ein Tippfehler in der Spiel-Id den Einsatz stumm.
    const spielPunkte = [
      { userId: "b", key: "bl#1", matchId: "m1", wert: 200, grundwert: 200, ersatz: false },
    ];
    const r = applyDuellJoker(verlauf, rules, [
      { spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "klau", matchId: "gibtsnicht" },
    ], null, spielPunkte);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(150);
  });
});

// ════════════════════════════════════════════════════════════
//  FREMDJOKER — die zwei neuen Arten und das Dach (JK4/JK7, 23.08.2026)
//
//  🔴 Sie rechnen in DIESER Funktion mit, und das ist eine Entscheidung: der
//  Deckel (`maxProSaison`), die chronologische Reihenfolge, der Nullsummen-
//  Modus und die Rundung am Ende gelten für alle vier Arten gemeinsam. Eine
//  zweite Fassung dieses Transfers in `fremdjoker.js` wäre die doppelte
//  Wahrheit, aus der die 17 Funde vom 05.08. kamen.
// ════════════════════════════════════════════════════════════

import { DEFAULT_EINGRIFFE } from "@/lib/eingriffe";

const VERLAUF = () => [
  { wettbewerb: "BL", matchday: 1, board: [
    { userId: "a", name: "A", total: 0 },
    { userId: "b", name: "B", total: 100 },
  ] },
];

describe("applyDuellJoker — Trittbrettfahrer", () => {
  const rules = (teil = {}) => ({
    duell: { ...DEFAULT_DUELL, maxProSaison: 0 },
    eingriffe: {
      ...DEFAULT_EINGRIFFE,
      trittbrett: { ...DEFAULT_EINGRIFFE.trittbrett, enabled: true, ...teil },
    },
  });
  const einsatz = [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "trittbrett" }];

  it("der Kopierer bekommt seinen Anteil, der Kopierte verliert nichts", () => {
    const r = applyDuellJoker(VERLAUF(), rules({ anteil: 0.3 }), einsatz);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(30);
    expect(r[0].board.find((z) => z.userId === "b").total).toBe(100);
  });

  // 🔴 „Es muss wehtun" (J4). Der Preis steckt im Anteil unter 100 % — und
  // `kopierterBekommt` dreht die Richtung um: wer kopiert wird, bekommt etwas
  // dafür.
  it("`kopierterBekommt` gibt dem Kopierten einen Aufschlag", () => {
    const r = applyDuellJoker(VERLAUF(), rules({ anteil: 0.3, kopierterBekommt: 0.5 }), einsatz);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(30);
    expect(r[0].board.find((z) => z.userId === "b").total).toBe(115);
  });

  // ⚠️ Dieselbe Kante wie beim Klau: aus einem Minus lässt sich nichts
  // mitnehmen. Ohne sie wäre der Trittbrettfahrer auf einen schlechten Tipp
  // ein GEWINN für den Kopierer.
  it("aus einem Minus nimmt niemand etwas mit", () => {
    const verlauf = [{ wettbewerb: "BL", matchday: 1, board: [
      { userId: "a", name: "A", total: 0 },
      { userId: "b", name: "B", total: -40 },
    ] }];
    const r = applyDuellJoker(verlauf, rules({ anteil: 0.5 }), einsatz);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(0);
    expect(r[0].board.find((z) => z.userId === "b").total).toBe(-40);
  });

  it("der Saison-Deckel gilt für ihn wie für alle anderen", () => {
    const mitDeckel = {
      ...rules({ anteil: 0.3 }),
      duell: { ...DEFAULT_DUELL, maxProSaison: 10 },
    };
    const r = applyDuellJoker(VERLAUF(), mitDeckel, einsatz);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(10);
  });
});

describe("applyDuellJoker — Gegenwette", () => {
  const rules = (teil = {}) => ({
    duell: { ...DEFAULT_DUELL, maxProSaison: 0 },
    eingriffe: {
      ...DEFAULT_EINGRIFFE,
      gegenwette: { ...DEFAULT_EINGRIFFE.gegenwette, enabled: true, einsatz: 25, ...teil },
    },
  });
  // p = 2/3 → Gegenquote 3,00 → Reingewinn 25 × 2 = 50.
  const daneben = [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "gegenwette", p: 2 / 3, getroffen: false }];
  const aufgegangen = [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "gegenwette", p: 2 / 3, getroffen: true }];

  it("geht der fremde Tipp daneben, zahlt die Gegenquote", () => {
    const r = applyDuellJoker(VERLAUF(), rules(), daneben);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(50);
    // `topf` ist die Vorgabe: der Getippte verliert nichts.
    expect(r[0].board.find((z) => z.userId === "b").total).toBe(100);
  });

  it("geht er auf, ist der Einsatz weg — auch das steht im Verlauf", () => {
    const r = applyDuellJoker(VERLAUF(), rules(), aufgegangen);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(-25);
  });

  it("`nullsumme` nimmt dem Getippten, was der Wettende gewinnt", () => {
    const r = applyDuellJoker(VERLAUF(), rules({ modus: "nullsumme" }), daneben);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(50);
    expect(r[0].board.find((z) => z.userId === "b").total).toBe(50);
  });

  // ⚠️ Kein stiller Rückfall auf die Spieltagspunkte. Eine Gegenwette, die
  // plötzlich wie ein Klau rechnete, wäre die schlimmere Sorte Fehler: sie
  // fiele niemandem auf.
  it("ohne angereichertes `p` verpufft der Einsatz, statt etwas anderes zu rechnen", () => {
    const ohne = [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "gegenwette" }];
    const r = applyDuellJoker(VERLAUF(), rules(), ohne);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(0);
    expect(r[0].board.find((z) => z.userId === "b").total).toBe(100);
  });

  // 🔴 JK16: der Wert eines Fremdjokers hängt nicht am Gewicht des Spiels.
  // Bei der Gegenwette ist das eingebaut — Einsatz und Gegenquote kennen die
  // Spieltagspunkte des Ziels gar nicht.
  it("das Ziel-Ergebnis ändert nichts am Ertrag — nur die Quote zählt", () => {
    const fett = [{ wettbewerb: "BL", matchday: 1, board: [
      { userId: "a", name: "A", total: 0 },
      { userId: "b", name: "B", total: 5000 },
    ] }];
    const r = applyDuellJoker(fett, rules(), daneben);
    expect(r[0].board.find((z) => z.userId === "a").total).toBe(50);
  });
});

describe("applyDuellJoker — das Dach (JK7) und die Arten-Prüfung", () => {
  const einsatz = [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "klau" }];
  const an = { duell: { ...DEFAULT_DUELL, enabled: true, typen: ["klau"] } };

  it("`eingriffe.enabled: false` schaltet die Wertung ab, ohne `duell` anzufassen", () => {
    const zu = { ...an, eingriffe: { ...DEFAULT_EINGRIFFE, enabled: false } };
    expect(applyDuellJoker(VERLAUF(), zu, einsatz)).toEqual(VERLAUF());
    // Zur Gegenprobe: mit offenem Dach rechnet derselbe Einsatz.
    expect(applyDuellJoker(VERLAUF(), an, einsatz)[0].board.find((z) => z.userId === "a").total)
      .toBeGreaterThan(0);
  });

  // 🔴 BEFUND vom 23.08.2026: bis dahin fragte diese Funktion nur
  // `duell.enabled` und ignorierte `typen`. Eine Runde mit `typen: ["block"]`
  // hat den Klau-Joker nicht — ein Klau-Einsatz rechnete trotzdem mit.
  it("eine Art, die die Runde gar nicht hat, rechnet nicht mit", () => {
    const nurBlock = { duell: { ...DEFAULT_DUELL, enabled: true, typen: ["block"] } };
    expect(applyDuellJoker(VERLAUF(), nurBlock, einsatz)).toEqual(VERLAUF());
  });
});

// ============================================================
//  BLOCK-WIRKUNG â was ein Block TUT, entscheidet der Admin
//
//  ð´ Andi am 25.08.2026: âBlockiert = mach einstellbar was hier passiert, das
//  soll der Admin selbst wÃ¤hlen kÃ¶nnen â¦ kannst dir auch denken, dass eben die
//  Wirkung unterschiedlich ausfallen kann."
//
//  â ï¸ Die beiden Wirkungen sind wirklich VERSCHIEDEN und nicht zwei Zahlen
//  derselben Sache: âPunkte dÃ¤mpfen" merkt man in der Abrechnung, âgesperrt"
//  merkt man beim Tippen. Deshalb prÃ¼ft dieser Block die WERTUNG â die
//  Eingabe-Sperre steht in `fremdjoker.test.js` bei `tippSperre`.
// ============================================================
describe("Block-Wirkung", () => {
  // Derselbe Verlaufs-Zuschnitt wie in den PflichtfÃ¤llen oben: kumulative
  // StÃ¤nde je Spieltag, nicht flache Punktzeilen.
  const verlaufFuer = () => ([
    { wettbewerb: "BL", matchday: 1, board: [
      { userId: "a", name: "A", total: 100 },
      { userId: "b", name: "B", total: 200 },
    ] },
  ]);
  const regelnMit = (block) => ({
    duell: {
      ...DEFAULT_DUELL, enabled: true, typen: ["block"],
      block: { ...DEFAULT_DUELL.block, ...block },
    },
  });
  const einsatz = [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "block" }];
  const punkteVon = (r, id) => r[0].board.find((z) => z.userId === id).total;

  it("Vorgabe ist „punkte“ — das bisherige Verhalten bleibt", () => {
    // ð´ Wichtig, weil eine andere Vorgabe jede BESTEHENDE Runde rÃ¼ckwirkend
    // umgeschrieben hÃ¤tte: derselbe Creator-Code, plÃ¶tzlich anderes Spiel.
    expect(DEFAULT_DUELL.block.wirkung).toBe("punkte");
  });

  it("„punkte“ dämpft auf den Restanteil", () => {
    const r = applyDuellJoker(verlaufFuer(), regelnMit({ wirkung: "punkte", restanteil: 0.5 }), einsatz);
    expect(punkteVon(r, "b")).toBe(100);   // 200 â die HÃ¤lfte
  });

  it("„gesperrt“ nimmt das Spiel ganz weg, wenn der Tipp verfällt", () => {
    const r = applyDuellJoker(verlaufFuer(), regelnMit({ wirkung: "gesperrt", verfaellt: true }), einsatz);
    expect(punkteVon(r, "b")).toBe(0);
  });

  it("„gesperrt“ mit `verfaellt: false` lässt einen abgegebenen Tipp stehen", () => {
    // Die Sperre galt nur fÃ¼r das, was noch nicht getippt war â wer schneller
    // war, behÃ¤lt seine Punkte. Der Block lohnt sich dann nur frÃ¼h.
    const r = applyDuellJoker(verlaufFuer(), regelnMit({ wirkung: "gesperrt", verfaellt: false }), einsatz);
    expect(punkteVon(r, "b")).toBe(200);
  });

  it("Sperren ist kein Beutezug — der Blockende bekommt nichts", () => {
    // â ï¸ Auch dann nicht, wenn `beute` gesetzt ist: âbeute" gehÃ¶rt zum
    // DÃ¤mpfen. Wer sperrt, nimmt die Gelegenheit, nicht die Punkte.
    const r = applyDuellJoker(verlaufFuer(),
      regelnMit({ wirkung: "gesperrt", verfaellt: true, beute: 0.5 }), einsatz);
    expect(punkteVon(r, "a")).toBe(100);   // unverÃ¤ndert
  });

  it("nimmt auch beim Sperren nichts aus einem Minus", () => {
    const verlauf = [
      { wettbewerb: "BL", matchday: 1, board: [
        { userId: "a", name: "A", total: 100 },
        { userId: "b", name: "B", total: -50 },
      ] },
    ];
    const r = applyDuellJoker(verlauf, regelnMit({ wirkung: "gesperrt", verfaellt: true }), einsatz);
    expect(punkteVon(r, "b")).toBe(-50);
  });

  it("verwirft eine unbekannte Wirkung auf die Vorgabe", () => {
    const g = sanitizeDuellJoker({ ...DEFAULT_DUELL, block: { ...DEFAULT_DUELL.block, wirkung: "erfunden" } });
    expect(g.block.wirkung).toBe("punkte");
  });
});
