import { describe, it, expect } from "vitest";
import {
  tipScenario, rankReaction, matchDrama, reactionSrc,
  TIP_SCENARIOS, RANK_REACTIONS,
} from "./reactions";

describe("tipScenario — spezifischstes GIF zum eigenen Tipp", () => {
  it("exakter Tipp gewinnt vor allem anderen", () => {
    expect(tipScenario({ ebene: "exakt", dist: 0, winnerRight: true, goals: { net: 5 } }).key).toBe("exakt");
  });

  it("richtiger Sieger, nur 1 Tor daneben → Hauchdünn", () => {
    expect(tipScenario({ ebene: "tendenz", dist: 1, winnerRight: true, goals: { net: 0 } }).key).toBe("hauchduenn");
  });

  it("richtiger Abstand (nicht exakt) → Abstand getroffen", () => {
    expect(tipScenario({ ebene: "abstand", dist: 2, winnerRight: true, goals: { net: 0 } }).key).toBe("abstand");
  });

  it("nur Tendenz, aber Torschütze getroffen → Tendenz + Torschütze", () => {
    expect(tipScenario({ ebene: "tendenz", dist: 3, winnerRight: true, goals: { net: 2 } }).key).toBe("tendenz-tore");
  });

  it("Sieger falsch, aber Torschütze getroffen → Trostpreis", () => {
    expect(tipScenario({ ebene: "keiner", dist: 4, winnerRight: false, goals: { net: 1.5 } }).key).toBe("tore-trostpreis");
  });

  it("komplett daneben → Fallback 'daneben'", () => {
    expect(tipScenario({ ebene: "keiner", dist: 6, winnerRight: false, goals: { net: 0 } }).key).toBe("daneben");
  });

  it("robuster Fallback bei leerer/kaputter Wertung", () => {
    expect(tipScenario(undefined).key).toBe("daneben");
    expect(tipScenario({}).key).toBe("daneben");
  });

  it("akzeptiert goalsNet auch flach (nicht nur unter goals.net)", () => {
    expect(tipScenario({ ebene: "keiner", winnerRight: false, goalsNet: 2 }).key).toBe("tore-trostpreis");
  });
});

describe("rankReaction — Rollen-GIF nach Platzierung", () => {
  it("Rang 1 Sieger, letzter Rang Rote Laterne, dazwischen Mittelfeld", () => {
    expect(rankReaction(1, 5).key).toBe("sieger");
    expect(rankReaction(5, 5).key).toBe("letzter");
    expect(rankReaction(3, 5).key).toBe("mittelfeld");
  });

  it("Einzelspieler zählt als Sieger; ungewertet → null", () => {
    expect(rankReaction(1, 1).key).toBe("sieger");
    expect(rankReaction(null, 5)).toBeNull();
    expect(rankReaction(1, 0)).toBeNull();
  });
});

describe("matchDrama — Spielverlauf-Szenarien (noch ohne Timeline-Daten)", () => {
  it("ohne Timeline gibt es (noch) kein Drama-GIF", () => {
    expect(matchDrama(null)).toBeNull();
    expect(matchDrama(undefined)).toBeNull();
  });
});

describe("reactionSrc & Reaktions-Metadaten", () => {
  it("baut den öffentlichen /reactions-Pfad", () => {
    expect(reactionSrc("exakt")).toBe("/reactions/exakt.mp4");
  });

  it("jedes Szenario hat eindeutigen key, Label, Emoji und Tone", () => {
    const all = [...TIP_SCENARIOS, ...Object.values(RANK_REACTIONS)];
    expect(new Set(all.map((r) => r.key)).size).toBe(all.length);
    for (const r of all) {
      expect(r.label.length).toBeGreaterThan(0);
      expect(r.emoji.length).toBeGreaterThan(0);
      expect(r.tone).toMatch(/^#/);
    }
  });

  it("die Tipp-Szenario-Liste endet mit einem garantierten Fallback", () => {
    expect(TIP_SCENARIOS[TIP_SCENARIOS.length - 1].test({})).toBe(true);
  });
});
