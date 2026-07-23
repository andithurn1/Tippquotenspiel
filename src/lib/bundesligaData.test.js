import { describe, it, expect } from "vitest";
import { getBundesligaMatches, createBundesligaOddsSource, TEAM_RATINGS } from "./bundesligaData";
import { scoreTip, DEFAULT_RULES } from "./engine";

describe("Bundesliga-Fixtures — Integrität Spieltag 1–3", () => {
  const matches = getBundesligaMatches();

  it("27 Matches (3 Spieltage × 9), alle matchIds eindeutig", () => {
    expect(matches).toHaveLength(27);
    expect(new Set(matches.map((m) => m.matchId)).size).toBe(27);
  });

  it("jeder der 18 Klubs tritt pro Spieltag genau einmal an", () => {
    for (const md of [1, 2, 3]) {
      const teams = matches.filter((m) => m.matchday === md).flatMap((m) => [m.home, m.away]);
      expect(teams).toHaveLength(18);
      expect(new Set(teams).size).toBe(18);
    }
  });

  it("jeder Klub tritt über die 3 Spieltage genau 3× an (einmal je Spieltag)", () => {
    const clubs = Object.keys(TEAM_RATINGS);
    for (const club of clubs) {
      const appearances = matches.filter((m) => m.home === club || m.away === club);
      expect(appearances).toHaveLength(3);
    }
  });

  it("keine Paarung wiederholt sich über die 3 Spieltage", () => {
    const pairKey = (m) => [m.home, m.away].sort().join(" vs ");
    const keys = matches.map(pairKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("Anpfiff-Zeiten liegen im jeweils richtigen Spieltag-Fenster", () => {
    const windows = {
      1: ["2026-08-28", "2026-08-31"],
      2: ["2026-09-04", "2026-09-07"],
      3: ["2026-09-11", "2026-09-14"],
    };
    for (const m of matches) {
      const [from, to] = windows[m.matchday];
      expect(m.kickoff >= from).toBe(true);
      expect(m.kickoff < to).toBe(true);
    }
  });

  it("nur reale Klubnamen aus TEAM_RATINGS werden verwendet", () => {
    const known = new Set(Object.keys(TEAM_RATINGS));
    for (const m of matches) {
      expect(known.has(m.home)).toBe(true);
      expect(known.has(m.away)).toBe(true);
    }
  });
});

describe("createBundesligaOddsSource — gleiche Schnittstelle wie createMockOddsSource", () => {
  it("liefert Snapshot & Ergebnis für bekannte Matches, null für unbekannte", () => {
    const source = createBundesligaOddsSource();
    const [first] = getBundesligaMatches();
    expect(source.getSnapshot(first.matchId).home).toBe(first.home);
    expect(source.getResult(first.matchId)).toEqual(first.result);
    expect(source.getSnapshot("nicht-vorhanden")).toBeNull();
    expect(source.getResult("nicht-vorhanden")).toBeNull();
  });
});

describe("Bundesliga-Matches durch die echte Scoring-Engine (Kompatibilitäts-Fuzzing)", () => {
  it("jedes der 27 Matches lässt sich mit mehreren Tipp-Varianten fehlerfrei auswerten", () => {
    for (const m of getBundesligaMatches()) {
      const varianten = [
        { home: m.result.home, away: m.result.away, goals: { home: [], away: [] } }, // exakt
        { home: 1, away: 1, goals: { home: [], away: [] } },
        { home: 0, away: 0, goals: { home: [], away: [] } },
        { home: m.result.home + 2, away: m.result.away, goals: { home: [], away: [] } }, // seltenes Ergebnis
      ];
      for (const tip of varianten) {
        const r = scoreTip(tip, m.result, m.snapshot, DEFAULT_RULES);
        expect(Number.isFinite(r.total)).toBe(true);
        expect(r.total).toBeGreaterThanOrEqual(0); // wrongPenalty ist per Default 0
        expect(["exakt", "abstand", "tendenz", "keiner"]).toContain(r.ebene);
      }
    }
  });

  it("exakter Tipp erzielt für jedes Match die höchste Punktzahl unter den getesteten Varianten", () => {
    for (const m of getBundesligaMatches()) {
      const exakt = scoreTip({ home: m.result.home, away: m.result.away, goals: { home: [], away: [] } }, m.result, m.snapshot);
      const daneben = scoreTip({ home: m.result.home + 3, away: m.result.away + 1, goals: { home: [], away: [] } }, m.result, m.snapshot);
      expect(exakt.total).toBeGreaterThanOrEqual(daneben.total);
    }
  });
});
