import { describe, it, expect } from "vitest";
import { matchdayDeltas, matchdayWinners, computeRecords } from "./records";

// Kumulativer Verlauf: Spieltag 1 und 2, drei Spieler.
const HISTORY = [
  { matchday: 1, board: [
    { userId: "a", name: "Anna", rank: 1, total: 100 },
    { userId: "b", name: "Bea",  rank: 2, total: 60 },
    { userId: "c", name: "Cem",  rank: 3, total: 40 },
  ] },
  { matchday: 2, board: [
    { userId: "b", name: "Bea",  rank: 1, total: 170 },   // +110 diesen Spieltag → Spieltagssieger, klettert 2→1
    { userId: "a", name: "Anna", rank: 2, total: 130 },   // +30
    { userId: "c", name: "Cem",  rank: 3, total: 90 },    // +50
  ] },
];

const SCORED = [
  { userId: "a", name: "Anna", matchday: 1, total: 100, ebene: "exakt" },
  { userId: "a", name: "Anna", matchday: 2, total: 30,  ebene: "tendenz" },
  { userId: "b", name: "Bea",  matchday: 1, total: 60,  ebene: "abstand" },
  { userId: "b", name: "Bea",  matchday: 2, total: 110, ebene: "exakt" },
  { userId: "c", name: "Cem",  matchday: 2, total: 50,  ebene: "exakt" },
];

describe("matchdayDeltas", () => {
  it("rechnet aus kumulativen Ständen die Punkte je Spieltag", () => {
    const d = matchdayDeltas(HISTORY);
    expect(d[0].perUser.get("a").delta).toBe(100);       // erster Spieltag = voller Stand
    expect(d[1].perUser.get("b").delta).toBe(110);        // 170 − 60
    expect(d[1].perUser.get("a").delta).toBe(30);         // 130 − 100
  });
});

describe("matchdayWinners", () => {
  it("kürt je Spieltag den mit den meisten Punkten DIESES Spieltags", () => {
    const w = matchdayWinners(HISTORY);
    expect(w).toEqual([
      { matchday: 1, userId: "a", name: "Anna", punkte: 100 },
      { matchday: 2, userId: "b", name: "Bea",  punkte: 110 },
    ]);
  });

  it("Spieltage ohne Punktzuwachs haben keinen Sieger", () => {
    const flach = [
      { matchday: 1, board: [{ userId: "a", name: "Anna", rank: 1, total: 0 }] },
    ];
    expect(matchdayWinners(flach)).toEqual([]);
  });
});

describe("computeRecords", () => {
  const rec = computeRecords(HISTORY, SCORED);
  const byKey = (k) => rec.find((r) => r.key === k);

  it("Spitzenreiter = Rang 1 im letzten Stand", () => {
    expect(byKey("spitzenreiter").holder).toEqual({ userId: "b", name: "Bea" });
    expect(byKey("spitzenreiter").value).toBe(170);
  });

  it("Spieltagssiege korrekt gezählt (hier je 1 für Anna und Bea → Anna alphabetisch)", () => {
    // Anna und Bea haben je einen Spieltagssieg; bei Gleichstand gewinnt der kleinere Name.
    expect(byKey("spieltagssiege").holder.name).toBe("Anna");
    expect(byKey("spieltagssiege").value).toBe(1);
  });

  it("Größter Rang-Sprung = Bea (2 → 1)", () => {
    expect(byKey("sprung").holder).toEqual({ userId: "b", name: "Bea" });
    expect(byKey("sprung").value).toBe(1);
  });

  it("Bester Einzeltipp = höchste Einzelpunktzahl (Bea, 110)", () => {
    expect(byKey("besterTipp").holder.name).toBe("Bea");
    expect(byKey("besterTipp").value).toBe(110);
  });

  it("Meiste Volltreffer: Anna 1, Bea 1, Cem 1 → Anna (alphabetisch)", () => {
    expect(byKey("exakt").holder.name).toBe("Anna");
    expect(byKey("exakt").value).toBe(1);
  });

  it("leere Daten → keine Auszeichnungen", () => {
    expect(computeRecords([], [])).toEqual([]);
  });
});
