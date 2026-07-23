import { describe, it, expect } from "vitest";
import { generateMatchOdds, simulateResult, expectedGoals, rngFromSeed } from "./oddsGenerator";

const favUnderdog = {
  matchId: "test-fav", home: "Favorit", away: "Außenseiter", kickoff: "2026-08-29T13:30:00Z",
  homeAttack: 1.85, homeDefense: 0.60, awayAttack: 0.70, awayDefense: 1.35,
};
const evenMatch = {
  matchId: "test-even", home: "Team A", away: "Team B", kickoff: "2026-08-29T13:30:00Z",
  homeAttack: 1.05, homeDefense: 0.95, awayAttack: 1.05, awayDefense: 0.95,
};

describe("rngFromSeed", () => {
  it("ist deterministisch: gleicher Seed → identische Folge", () => {
    const a = rngFromSeed("abc"); const b = rngFromSeed("abc");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("unterschiedliche Seeds streuen (keine Kollision im Kurztest)", () => {
    const a = rngFromSeed("seed-1")(); const b = rngFromSeed("seed-2")();
    expect(a).not.toBeCloseTo(b, 5);
  });
});

describe("generateMatchOdds — Determinismus & Variation", () => {
  it("gleicher Input + Seed → bit-identischer Snapshot", () => {
    const s1 = generateMatchOdds(favUnderdog);
    const s2 = generateMatchOdds(favUnderdog);
    expect(s2).toEqual(s1);
  });

  it("anderer Seed → andere Spielernamen, aber gleiche Quoten-Struktur", () => {
    const s1 = generateMatchOdds({ ...favUnderdog, seed: "seed-a" });
    const s2 = generateMatchOdds({ ...favUnderdog, seed: "seed-b" });
    expect(Object.keys(s1.players.home)).not.toEqual(Object.keys(s2.players.home));
    expect(s1.winner).toEqual(s2.winner); // Quoten hängen nur von den Stärken ab, nicht vom Seed
  });

  it("stärkeres Team hat niedrigere Sieger-Quote als das schwächere", () => {
    const snap = generateMatchOdds(favUnderdog);
    expect(snap.winner.home).toBeLessThan(snap.winner.away);
  });

  it("ausgeglichenes Duell: Heim- und Auswärtsquote liegen nah beieinander", () => {
    const snap = generateMatchOdds(evenMatch);
    expect(Math.abs(snap.winner.home - snap.winner.away)).toBeLessThan(snap.winner.home * 0.35);
  });

  it("Buchmacher-Marge: Summe der impliziten Sieger-Wahrscheinlichkeiten ≈ overround", () => {
    const overround = 1.07;
    const snap = generateMatchOdds({ ...evenMatch, overround });
    const implied = 1 / snap.winner.home + 1 / snap.winner.draw + 1 / snap.winner.away;
    expect(implied).toBeGreaterThan(1);
    expect(implied).toBeCloseTo(overround, 1);
  });
});

describe("generateMatchOdds — Form der erzeugten Snapshots", () => {
  it.each([favUnderdog, evenMatch])("Ergebnis-Raster ist 6×6, alle Quoten ≥ 1.01 ($home vs $away)", (input) => {
    const snap = generateMatchOdds(input);
    expect(snap.correctScore).toHaveLength(6);
    for (const row of snap.correctScore) {
      expect(row).toHaveLength(6);
      for (const q of row) expect(q).toBeGreaterThanOrEqual(1.01);
    }
  });

  it("margin[0] ist der ungenutzte Platzhalter 0 (Abstand 0 kann kein Sieg sein)", () => {
    const snap = generateMatchOdds(favUnderdog);
    expect(snap.margin.home[0]).toBe(0);
    expect(snap.margin.away[0]).toBe(0);
  });

  it("teamGoals hat 6 Einträge je Seite, alles gültige Quoten", () => {
    const snap = generateMatchOdds(favUnderdog);
    expect(snap.teamGoals.home).toHaveLength(6);
    expect(snap.teamGoals.away).toHaveLength(6);
    [...snap.teamGoals.home, ...snap.teamGoals.away].forEach((q) => expect(q).toBeGreaterThanOrEqual(1.01));
  });

  it("5 Spieler je Team, Doppelpack-Quote nie günstiger als Einzel-Quote", () => {
    const snap = generateMatchOdds(favUnderdog);
    for (const side of ["home", "away"]) {
      const players = Object.values(snap.players[side]);
      expect(players).toHaveLength(5);
      for (const p of players) expect(p.double).toBeGreaterThanOrEqual(p.anytime);
    }
  });

  it("Spieler des stärkeren Teams treffen im Schnitt wahrscheinlicher (niedrigere Anytime-Quote)", () => {
    const snap = generateMatchOdds(favUnderdog);
    const avg = (obj) => Object.values(obj).reduce((s, p) => s + p.anytime, 0) / Object.values(obj).length;
    expect(avg(snap.players.home)).toBeLessThan(avg(snap.players.away));
  });
});

describe("Variation über viele Stärke-Kombinationen (Fuzzing)", () => {
  const rng = rngFromSeed("fuzz-strengths");
  const cases = Array.from({ length: 40 }, (_, i) => ({
    matchId: `fuzz-${i}`, home: "H", away: "A", kickoff: "2026-08-29T13:30:00Z",
    homeAttack: 0.6 + rng() * 1.4, homeDefense: 0.5 + rng() * 1.0,
    awayAttack: 0.6 + rng() * 1.4, awayDefense: 0.5 + rng() * 1.0,
  }));

  it("liefert für jede zufällige Stärke-Kombination ein gültiges, endliches Ergebnis", () => {
    for (const c of cases) {
      const snap = generateMatchOdds(c);
      expect(Number.isFinite(snap.winner.home)).toBe(true);
      expect(Number.isFinite(snap.winner.draw)).toBe(true);
      expect(Number.isFinite(snap.winner.away)).toBe(true);
      const result = simulateResult(snap, c);
      expect(Number.isInteger(result.home)).toBe(true);
      expect(Number.isInteger(result.away)).toBe(true);
      expect(result.home).toBeGreaterThanOrEqual(0);
      expect(result.away).toBeGreaterThanOrEqual(0);
    }
  });

  it("stärkeres Angriffs-/Abwehr-Profil ergibt konsistent die niedrigere Sieger-Quote", () => {
    for (const c of cases) {
      const { home: lamH, away: lamA } = expectedGoals(c);
      const snap = generateMatchOdds(c);
      if (lamH > lamA * 1.15) expect(snap.winner.home).toBeLessThan(snap.winner.away);
      if (lamA > lamH * 1.15) expect(snap.winner.away).toBeLessThan(snap.winner.home);
    }
  });
});

describe("simulateResult", () => {
  it("ist deterministisch für denselben Seed", () => {
    const snap = generateMatchOdds(favUnderdog);
    const r1 = simulateResult(snap, favUnderdog, "same-seed");
    const r2 = simulateResult(snap, favUnderdog, "same-seed");
    expect(r2).toEqual(r1);
  });

  it("playerGoals summieren sich auf home+away Tore", () => {
    const snap = generateMatchOdds(favUnderdog);
    const r = simulateResult(snap, favUnderdog);
    const summe = Object.values(r.playerGoals).reduce((s, n) => s + n, 0);
    expect(summe).toBe(r.home + r.away);
  });
});
