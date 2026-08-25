import { describe, it, expect } from "vitest";
import { tippKurz, tippSchuetzen, tippLang } from "@/lib/format";

// 🔴 Andi, KT6: „auch um bisher eingetragenes noch anzupassen" — dafür muss in
// der Übersicht stehen, WAS eingetragen ist, nicht nur DASS.
describe("Dein Tipp, kurz", () => {
  it("Endstand als Zahl", () => {
    expect(tippKurz({ home: 2, away: 1 })).toBe("2:1");
    expect(tippKurz({ home: 0, away: 0 })).toBe("0:0");
  });

  it("kein Tipp ergibt null, nicht einen Strich oder 0:0", () => {
    for (const x of [null, undefined, {}, { home: 2 }, { home: "a", away: 1 }]) {
      expect(tippKurz(x), JSON.stringify(x)).toBeNull();
    }
  });

  it("negative Zahlen sind kein Endstand", () => {
    expect(tippKurz({ home: -1, away: 2 })).toBeNull();
  });
});

describe("Torschützen zählen", () => {
  it("beide Mannschaften zusammen", () => {
    expect(tippSchuetzen({ goals: { home: ["a"], away: ["b", "c"] } })).toBe(3);
  });

  // ⚠️ `goals` trägt Lücken, wenn jemand nur einen von drei Plätzen füllt.
  it("leere Plätze zählen nicht mit", () => {
    expect(tippSchuetzen({ goals: { home: ["a", null, undefined], away: [] } })).toBe(1);
  });

  it("ohne goals: 0 statt Absturz", () => {
    expect(tippSchuetzen({})).toBe(0);
    expect(tippSchuetzen(null)).toBe(0);
    expect(tippSchuetzen({ goals: { home: "quatsch" } })).toBe(0);
  });
});

describe("Der ganze Satz", () => {
  it("nennt die Torschützen, wenn es welche gibt", () => {
    expect(tippLang({ home: 2, away: 1, goals: { home: ["a"], away: ["b"] } }))
      .toBe("2:1 · 2 Torschützen");
  });

  it("Einzahl bleibt Einzahl", () => {
    expect(tippLang({ home: 1, away: 0, goals: { home: ["a"], away: [] } }))
      .toBe("1:0 · 1 Torschütze");
  });

  // Ein „· 0 Torschützen" wäre eine Aussage über nichts.
  it("ohne Torschützen bleibt es bei der Zahl", () => {
    expect(tippLang({ home: 3, away: 0 })).toBe("3:0");
    expect(tippLang({ home: 3, away: 0, goals: { home: [], away: [] } })).toBe("3:0");
  });

  it("kein Tipp bleibt null", () => {
    expect(tippLang(null)).toBeNull();
  });
});
