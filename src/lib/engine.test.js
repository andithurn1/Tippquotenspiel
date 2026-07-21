import { describe, it, expect } from "vitest";
import {
  createMockOddsSource, DEFAULT_RULES,
  scoreResult, scoreGoals, scoreTip, applyCombo, toDisplay,
  encodePreset, decodePreset,
} from "./engine";

const odds = createMockOddsSource();
const snap = odds.getSnapshot("JOR-ESP");
const result = odds.getResult("JOR-ESP"); // real 5:1, Al-Naimat 2×, Yamal 1×

describe("Mock-Quoten-Quelle", () => {
  it("liefert Snapshot und Ergebnis nur für bekannte Matches", () => {
    expect(snap.home).toBe("Jordanien");
    expect(result).toEqual({ home: 5, away: 1, playerGoals: { "Al-Naimat": 2, "Yamal": 1 } });
    expect(odds.getSnapshot("XXX")).toBeNull();
    expect(odds.getResult("XXX")).toBeNull();
  });
});

describe("scoreResult — Ebenen", () => {
  it("exakter Tipp: Ebene exakt, Distanz 0, volle Exakt-Quote als Nähe", () => {
    const r = scoreResult({ home: 5, away: 1 }, result, snap);
    expect(r.ebene).toBe("exakt");
    expect(r.dist).toBe(0);
    expect(r.parts.ergNaehe).toBeCloseTo(snap.correctScore[5][1], 5); // decay(0) = 1
  });

  it("richtiger Abstand (nicht exakt): Ebene abstand", () => {
    // real 5:1 → Differenz 4; Tipp 4:0 hat gleiche Differenz + Sieger
    const r = scoreResult({ home: 4, away: 0 }, result, snap);
    expect(r.ebene).toBe("abstand");
    expect(r.parts.abstand).toBeCloseTo(snap.margin.home[4] - 1, 5);
  });

  it("nur Sieger richtig: Ebene tendenz, Boden = Sieger-Quote − 1", () => {
    const r = scoreResult({ home: 1, away: 0 }, result, snap);
    expect(r.ebene).toBe("tendenz");
    expect(r.winnerRight).toBe(true);
    expect(r.parts.tendBoden).toBeCloseTo(snap.winner.home - 1, 5);
  });

  it("Sieger falsch: Ebene keiner, aber Team-Tore-Nähe kann trotzdem zahlen", () => {
    // Tipp 1:1 (Unentschieden) bei real 5:1: Sieger falsch, Auswärtstore exakt
    const r = scoreResult({ home: 1, away: 1 }, result, snap);
    expect(r.ebene).toBe("keiner");
    expect(r.winnerRight).toBe(false);
    expect(r.parts.teamTore).toBeGreaterThan(0);
  });

  it("Nähe-Beispiel aus dem README: Tipp 4:1 bei real 5:1 → decay(1) × 96 ≈ 47.7", () => {
    const r = scoreResult({ home: 4, away: 1 }, result, snap);
    expect(r.dist).toBe(1);
    expect(r.parts.ergNaehe).toBeCloseTo(Math.exp(-0.7) * 96, 3);
    expect(Math.round(r.resultPart)).toBe(48);
  });

  it("minPayout-Cutoff: kleine Nähe-Boni zählen nicht", () => {
    const rules = { ...DEFAULT_RULES, minPayout: 1000 };
    const r = scoreResult({ home: 0, away: 5 }, result, snap, rules);
    expect(r.parts.tendBoden).toBe(0);
    expect(r.resultPart).toBe(0);
  });

  it("wrongPenalty: Minus bei komplett falsch, wenn aktiviert", () => {
    const rules = { ...DEFAULT_RULES, wrongPenalty: -1, minPayout: 1000 };
    const r = scoreResult({ home: 0, away: 5 }, result, snap, rules);
    expect(r.resultPart).toBe(-1);
  });
});

describe("scoreGoals — Torschützen", () => {
  it("Einzel-Pick trifft: anytime − 1", () => {
    const g = scoreGoals({ home: ["Al-Naimat"], away: [] }, snap, DEFAULT_RULES, result.playerGoals);
    expect(g.net).toBeCloseTo(snap.players.home["Al-Naimat"].anytime - 1, 5);
  });

  it("Doppel-Pick + 2 echte Tore: Doppelpack-Quote", () => {
    const g = scoreGoals({ home: ["Al-Naimat", "Al-Naimat"], away: [] }, snap, DEFAULT_RULES, result.playerGoals);
    expect(g.net).toBeCloseTo(snap.players.home["Al-Naimat"].double - 1, 5);
  });

  it("Doppel-Pick, aber nur 1 Tor: Einzelquote als Floor", () => {
    const g = scoreGoals({ home: [], away: ["Yamal", "Yamal"] }, snap, DEFAULT_RULES, result.playerGoals);
    expect(g.net).toBeCloseTo(snap.players.away["Yamal"].anytime - 1, 5);
  });

  it("Pick trifft nicht: 0, kein Minus", () => {
    const g = scoreGoals({ home: ["Olwan"], away: [] }, snap, DEFAULT_RULES, result.playerGoals);
    expect(g.net).toBe(0);
  });

  it("ohne echte Tordaten (Explorer-Modus): Doppel-Pick als Doppelpack angenommen", () => {
    const g = scoreGoals({ home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal"] }, snap, DEFAULT_RULES, null);
    expect(g.net).toBeCloseTo(
      snap.players.home["Al-Naimat"].double - 1 + snap.players.away["Yamal"].anytime - 1, 5);
  });

  it("leere Picks und unbekannte Spieler werden ignoriert", () => {
    const g = scoreGoals({ home: ["", "Unbekannt"], away: [] }, snap, DEFAULT_RULES, result.playerGoals);
    expect(g.net).toBe(0);
    expect(g.detail).toEqual([]);
  });
});

describe("applyCombo & scoreTip — Kombi-Regel", () => {
  it("ohne Tor-Gewinn bleibt resultPart unverändert", () => {
    expect(applyCombo(10, "tendenz", 0)).toBe(10);
    expect(applyCombo(10, "exakt", -2)).toBe(10);
  });

  it("mit Tor-Gewinn: Ebene keiner addiert nur, sonst multipliziert der Kombi-Faktor", () => {
    expect(applyCombo(10, "keiner", 2)).toBe(12);
    expect(applyCombo(10, "tendenz", 2)).toBeCloseTo(12 * 1.15, 5);
    expect(applyCombo(10, "exakt", 2)).toBeCloseTo(12 * 2.3, 5);
  });

  it("README-Beispiel: 4:1 + Al-Naimat-Doppelpack + Yamal bei real 5:1", () => {
    const tipp = { home: 4, away: 1, goals: { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal", ""] } };
    const r = scoreTip(tipp, result, snap);
    expect(r.ebene).toBe("tendenz");
    const naehe = Math.exp(-0.7) * 96;                       // decay(1) × Exakt-Quote
    const tore = (11 - 1) + (1.9 - 1);                       // Doppelpack + anytime
    const roh = (naehe + tore) * DEFAULT_RULES.combo.tendenz;
    expect(r.raw).toBeCloseTo(roh, 1);
    expect(r.total).toBe(Math.round(roh * DEFAULT_RULES.displayScale));
  });
});

describe("toDisplay — Skalierung & Deckel", () => {
  it("skaliert mit displayScale und rundet", () => {
    expect(toDisplay(3.2)).toBe(48);
  });
  it("perGameCap deckelt", () => {
    expect(toDisplay(100, { ...DEFAULT_RULES, perGameCap: 500 })).toBe(500);
  });
});

describe("Creator-Codes", () => {
  it("Regelwerk übersteht encode → decode verlustfrei", () => {
    const rules = { ...DEFAULT_RULES, name: "Hardcore", k: 1.1 };
    const code = encodePreset(rules);
    expect(code.startsWith("TS1-")).toBe(true);
    expect(decodePreset(code)).toEqual(rules);
  });
  it("ungültige Codes werfen einen Fehler", () => {
    expect(() => decodePreset("QUATSCH")).toThrow();
    expect(() => decodePreset(null)).toThrow();
  });
});
