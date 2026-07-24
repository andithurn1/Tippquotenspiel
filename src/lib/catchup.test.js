import { describe, it, expect } from "vitest";
import { applyCatchup, catchupLeaderboard, BETRIFFT, STAERKE_STUFEN } from "./catchup";
import { DEFAULT_RULES, sanitizeRules } from "./engine";

// Drei Spieler, klarer Abstand: Anna zieht davon, Cem hängt hinten.
const HISTORY = [
  { matchday: 1, board: [
    { userId: "a", name: "Anna", rank: 1, total: 1000 },
    { userId: "b", name: "Bea",  rank: 2, total: 700 },
    { userId: "c", name: "Cem",  rank: 3, total: 400 },
  ] },
  { matchday: 2, board: [
    { userId: "a", name: "Anna", rank: 1, total: 2000 },
    { userId: "b", name: "Bea",  rank: 2, total: 1400 },
    { userId: "c", name: "Cem",  rank: 3, total: 800 },
  ] },
];

const regeln = (p) => sanitizeRules({ ...DEFAULT_RULES, aufholen: { enabled: true, ...p } });

describe("applyCatchup — Grundverhalten", () => {
  it("ausgeschaltet lässt den Verlauf unverändert", () => {
    expect(applyCatchup(HISTORY, DEFAULT_RULES)).toBe(HISTORY);
    // Stärke 0 hier bewusst ROH (nicht sanitisiert) — sanitizeRules klemmt sie
    // auf das Minimum von 0,05 hoch, die Schutzklausel wäre sonst nicht prüfbar.
    expect(applyCatchup(HISTORY, { aufholen: { enabled: true, staerke: 0 } })).toBe(HISTORY);
  });

  it("am ersten Spieltag gibt es noch keinen Bonus (kein Rückstand davor)", () => {
    const r = applyCatchup(HISTORY, regeln({ staerke: 0.3, schwelle: 0, betrifft: "unter-schnitt" }));
    for (const e of r[0].board) expect(e.bonus).toBe(0);
  });

  it("Zurückliegende bekommen ab Spieltag 2 einen Bonus, der Führende nicht", () => {
    const r = applyCatchup(HISTORY, regeln({ staerke: 0.3, schwelle: 0, betrifft: "unter-schnitt" }));
    const md2 = Object.fromEntries(r[1].board.map((e) => [e.userId, e]));
    expect(md2.a.bonus).toBe(0);                 // Spitze geht leer aus
    expect(md2.c.bonus).toBeGreaterThan(0);      // Letzter bekommt am meisten
    expect(md2.c.bonus).toBeGreaterThan(md2.b.bonus ?? 0);
  });

  it("der Bonus ist ein ANTEIL des Rückstands, nie der volle Abstand", () => {
    // Stand nach MD1: Spitze 1000, Cem 400 → Rückstand 600, Stärke 0.3 → 180
    const r = applyCatchup(HISTORY, regeln({ staerke: 0.3, schwelle: 0, betrifft: "letzter" }));
    const cem = r[1].board.find((e) => e.userId === "c");
    expect(cem.bonus).toBe(180);
    expect(cem.total).toBe(800 + 180);
    // Der Führende bleibt trotzdem vorn — Aufholen heißt nicht Überholen.
    expect(r[1].board[0].userId).toBe("a");
  });

  it("die Schwelle verhindert Boni bei kleinem Rückstand", () => {
    // Bea liegt 300 von 1000 zurück = 30 %. Schwelle 40 % → kein Bonus.
    const r = applyCatchup(HISTORY, regeln({ staerke: 0.3, schwelle: 0.4, betrifft: "unter-schnitt" }));
    const bea = r[1].board.find((e) => e.userId === "b");
    expect(bea.bonus).toBe(0);
    // Cem liegt 60 % zurück → bekommt trotzdem etwas.
    expect(r[1].board.find((e) => e.userId === "c").bonus).toBeGreaterThan(0);
  });

  it("Ränge werden nach dem Bonus neu vergeben", () => {
    const eng = [
      { matchday: 1, board: [
        { userId: "a", name: "Anna", rank: 1, total: 1000 },
        { userId: "b", name: "Bea",  rank: 2, total: 300 },
      ] },
      { matchday: 2, board: [
        { userId: "a", name: "Anna", rank: 1, total: 1000 },
        { userId: "b", name: "Bea",  rank: 2, total: 900 },
      ] },
    ];
    // Rückstand 700, Stärke 0.5 → +350 → Bea überholt (900+350 > 1000)
    const r = applyCatchup(eng, regeln({ staerke: 0.5, schwelle: 0, betrifft: "letzter" }));
    expect(r[1].board[0].userId).toBe("b");
    expect(r[1].board[0].rank).toBe(1);
  });
});

describe("applyCatchup — wen es betrifft", () => {
  const vier = [
    { matchday: 1, board: [
      { userId: "a", name: "A", rank: 1, total: 1000 },
      { userId: "b", name: "B", rank: 2, total: 800 },
      { userId: "c", name: "C", rank: 3, total: 500 },
      { userId: "d", name: "D", rank: 4, total: 200 },
    ] },
    { matchday: 2, board: [
      { userId: "a", name: "A", rank: 1, total: 1100 },
      { userId: "b", name: "B", rank: 2, total: 900 },
      { userId: "c", name: "C", rank: 3, total: 600 },
      { userId: "d", name: "D", rank: 4, total: 300 },
    ] },
  ];
  const bonusVon = (betrifft) => {
    const r = applyCatchup(vier, regeln({ staerke: 0.2, schwelle: 0, betrifft }));
    return Object.fromEntries(r[1].board.map((e) => [e.userId, e.bonus]));
  };

  it("Stufe letzter trifft nur den Letzten", () => {
    const b = bonusVon("letzter");
    expect(b.d).toBeGreaterThan(0);
    expect(b.c).toBe(0);
    expect(b.b).toBe(0);
  });

  it("Stufe unteres-drittel trifft das schwächste Drittel", () => {
    const b = bonusVon("unteres-drittel");
    expect(b.d).toBeGreaterThan(0);
    expect(b.a).toBe(0);
  });

  it("Stufe unter-schnitt trifft alle unter dem Durchschnitt", () => {
    const b = bonusVon("unter-schnitt");   // Schnitt = 625 → C und D
    expect(b.c).toBeGreaterThan(0);
    expect(b.d).toBeGreaterThan(0);
    expect(b.b).toBe(0);
  });
});

describe("catchupLeaderboard", () => {
  it("gibt null zurück, wenn die Regel aus ist", () => {
    expect(catchupLeaderboard(HISTORY, DEFAULT_RULES)).toBeNull();
  });

  it("liefert den letzten Stand inklusive Boni", () => {
    const board = catchupLeaderboard(HISTORY, regeln({ staerke: 0.3, schwelle: 0, betrifft: "letzter" }));
    expect(board).toHaveLength(3);
    expect(board.find((e) => e.userId === "c").bonus).toBe(180);
  });
});

describe("Voreinstellungen", () => {
  it("die drei Stärke-Stufen sind aufsteigend und haben Erklärtexte", () => {
    expect(STAERKE_STUFEN.map((s) => s.key)).toEqual(["sanft", "mittel", "stark"]);
    for (let i = 1; i < STAERKE_STUFEN.length; i++) {
      expect(STAERKE_STUFEN[i].staerke).toBeGreaterThan(STAERKE_STUFEN[i - 1].staerke);
      expect(STAERKE_STUFEN[i].schwelle).toBeLessThan(STAERKE_STUFEN[i - 1].schwelle);
    }
    for (const s of STAERKE_STUFEN) expect(s.hint.length).toBeGreaterThan(15);
  });

  it("jede Betroffenen-Stufe hat Label und Beschreibung", () => {
    for (const v of Object.values(BETRIFFT)) {
      expect(v.label).toBeTruthy();
      expect(v.desc).toBeTruthy();
    }
  });
});

describe("sanitizeRules — Aufholen", () => {
  it("Standard ist aus", () => {
    expect(DEFAULT_RULES.aufholen.enabled).toBe(false);
  });

  it("beschneidet Werte und verwirft unbekannte Betroffenen-Stufen", () => {
    const r = sanitizeRules({ aufholen: { enabled: "ja", staerke: 9, schwelle: -1, betrifft: "quatsch" } });
    expect(r.aufholen.enabled).toBe(false);            // nur echtes true zählt
    expect(r.aufholen.staerke).toBe(0.5);
    expect(r.aufholen.schwelle).toBe(0);
    expect(r.aufholen.betrifft).toBe(DEFAULT_RULES.aufholen.betrifft);
  });
});
