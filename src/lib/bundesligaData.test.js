import { describe, it, expect } from "vitest";
import { getBundesligaMatches, createBundesligaOddsSource, TEAM_RATINGS } from "./bundesligaData";
import { scoreTip, DEFAULT_RULES } from "./engine";

describe("Bundesliga-Fixtures — Integrität der vollen Saison (34 Spieltage)", () => {
  const matches = getBundesligaMatches();

  it("306 Matches (34 Spieltage × 9), alle matchIds eindeutig", () => {
    expect(matches).toHaveLength(306);
    expect(new Set(matches.map((m) => m.matchId)).size).toBe(306);
  });

  it("jeder der 18 Klubs tritt an JEDEM Spieltag genau einmal an", () => {
    for (let md = 1; md <= 34; md++) {
      const teams = matches.filter((m) => m.matchday === md).flatMap((m) => [m.home, m.away]);
      expect(teams).toHaveLength(18);
      expect(new Set(teams).size).toBe(18);
    }
  });

  it("jeder Klub spielt über die Saison 34× (einmal je Spieltag)", () => {
    for (const club of Object.keys(TEAM_RATINGS)) {
      const appearances = matches.filter((m) => m.home === club || m.away === club);
      expect(appearances).toHaveLength(34);
    }
  });

  it("volle Hin-/Rückrunde: jede Paarung genau 2× (einmal je Heimrecht)", () => {
    // ungeordnetes Paar: über die Saison genau 2×
    const pairCount = {};
    for (const m of matches) {
      const key = [m.home, m.away].sort().join(" vs ");
      pairCount[key] = (pairCount[key] || 0) + 1;
    }
    const counts = Object.values(pairCount);
    expect(counts).toHaveLength((18 * 17) / 2); // 153 Paarungen
    expect(counts.every((c) => c === 2)).toBe(true);
    // geordnetes Paar (Heim→Gast) genau 1× — jeder spielt gegen jeden einmal daheim
    const dirCount = {};
    for (const m of matches) dirCount[`${m.home}→${m.away}`] = (dirCount[`${m.home}→${m.away}`] || 0) + 1;
    expect(Object.values(dirCount).every((c) => c === 1)).toBe(true);
  });

  it("innerhalb einer Halbserie wiederholt sich keine Paarung", () => {
    for (const [von, bis] of [[1, 17], [18, 34]]) {
      const half = matches.filter((m) => m.matchday >= von && m.matchday <= bis);
      const keys = half.map((m) => [m.home, m.away].sort().join(" vs "));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("alle Anpfiffe liegen in der Zukunft (Saison ab 28.08.2026) und steigen mit dem Spieltag", () => {
    expect(matches.every((m) => m.kickoff >= "2026-08-28")).toBe(true);
    const md1 = matches.filter((m) => m.matchday === 1).map((m) => m.kickoff).sort();
    const md34 = matches.filter((m) => m.matchday === 34).map((m) => m.kickoff).sort();
    expect(md1[0] < md34[0]).toBe(true);
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
