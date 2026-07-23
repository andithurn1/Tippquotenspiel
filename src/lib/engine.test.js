import { describe, it, expect } from "vitest";
import {
  createMockOddsSource, DEFAULT_RULES, RULE_LIMITS,
  scoreResult, scoreGoals, scoreTip, applyCombo, toDisplay,
  encodePreset, decodePreset, sanitizeRules, scoreLeaderboard, scoreLeaderboardHistory, projectTip,
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

describe("scoreResult — Underdog-Boost", () => {
  // JOR-ESP: reales Ergebnis 5:1, Sieger Jordanien mit winner.home = 9.0 (der
  // krasse Außenseiter hat gewonnen) — ideal, um den Boost zu testen.
  it("Standard (boost=1) ist ein No-op: identisch zu ohne Boost-Feldern", () => {
    const r = scoreResult({ home: 1, away: 0 }, result, snap, DEFAULT_RULES);
    expect(r.underdogMult).toBe(1);
  });

  it("Sieger-Quote über dem Ramp-Ende → voller Boost", () => {
    const rules = { ...DEFAULT_RULES, underdogBoost: 2, underdogRampStart: 3, underdogRampEnd: 8 };
    const ohneBoost = scoreResult({ home: 1, away: 0 }, result, snap, DEFAULT_RULES);
    const mitBoost = scoreResult({ home: 1, away: 0 }, result, snap, rules);
    expect(mitBoost.underdogMult).toBe(2); // winner.home = 9.0 ≥ rampEnd 8 → volle Stärke
    expect(mitBoost.resultPart).toBeCloseTo(ohneBoost.resultPart * 2, 5);
  });

  it("fließender Übergang: Quote genau in der Mitte von Ramp-Start/-Ende → halber Boost", () => {
    const rules = { ...DEFAULT_RULES, underdogBoost: 2, underdogRampStart: 5, underdogRampEnd: 13 };
    const r = scoreResult({ home: 1, away: 0 }, result, snap, rules); // winner.home=9 → Mitte von [5,13]
    expect(r.underdogMult).toBeCloseTo(1.5, 5);
  });

  it("Sieger-Quote unter Ramp-Start → kein Effekt, auch bei hohem Boost", () => {
    const rules = { ...DEFAULT_RULES, underdogBoost: 3, underdogRampStart: 10, underdogRampEnd: 20 };
    const r = scoreResult({ home: 1, away: 0 }, result, snap, rules); // winner.home=9 < 10
    expect(r.underdogMult).toBe(1);
  });

  it("wrongPenalty wird NICHT vom Boost verstärkt (bleibt exakt der konfigurierte Wert)", () => {
    const rules = { ...DEFAULT_RULES, wrongPenalty: -1, minPayout: 1000, underdogBoost: 3, underdogRampStart: 1.2, underdogRampEnd: 2 };
    const r = scoreResult({ home: 0, away: 5 }, result, snap, rules);
    expect(r.resultPart).toBe(-1);
    expect(r.underdogMult).toBe(1);
  });
});

describe("scoreTip — Favoriten-Reinfall-Malus", () => {
  // JOR-ESP: real 5:1, HEIM (Jordanien) gewinnt — der Außenseiter (winner.home=9.0).
  // Spanien (away, winner.away=1.28) ist der Favorit. Wer Spanien-Sieg tippt und
  // real verliert der Favorit → Malus greift. backFav = Tipp auf Favoriten-Sieg.
  const backFav = { home: 0, away: 2, goals: { home: [], away: [] } };

  it("Standard (favFlopPenalty=0) ist ein No-op", () => {
    expect(scoreTip(backFav, result, snap, DEFAULT_RULES).favFlop).toBe(0);
  });

  it("greift, wenn man den Favoriten tippt und der real verliert", () => {
    const ohne = scoreTip(backFav, result, snap, DEFAULT_RULES);
    const mit = scoreTip(backFav, result, snap, { ...DEFAULT_RULES, favFlopPenalty: 20 });
    expect(mit.favFlop).toBeGreaterThan(0);
    expect(mit.total).toBeLessThan(ohne.total);
  });

  it("deckelt bei 0 — kein tiefes Minus", () => {
    const mit = scoreTip(backFav, result, snap, { ...DEFAULT_RULES, favFlopPenalty: 20 });
    expect(mit.total).toBeGreaterThanOrEqual(0);
    expect(mit.raw).toBeGreaterThanOrEqual(0);
    expect(mit.total).toBe(0); // 20 reicht, um dieses Spiel auf null zu ziehen
  });

  it("graduell: kleiner Malus lässt mehr übrig als großer", () => {
    const klein = scoreTip(backFav, result, snap, { ...DEFAULT_RULES, favFlopPenalty: 1 });
    const gross = scoreTip(backFav, result, snap, { ...DEFAULT_RULES, favFlopPenalty: 20 });
    expect(klein.total).toBeGreaterThan(gross.total);
  });

  it("kein Malus, wenn man den Außenseiter RICHTIG getippt hat", () => {
    const backDog = { home: 2, away: 0, goals: { home: [], away: [] } }; // Heim/Außenseiter-Sieg
    expect(scoreTip(backDog, result, snap, { ...DEFAULT_RULES, favFlopPenalty: 20 }).favFlop).toBe(0);
  });

  it("kein Malus bei Remis-Tipp", () => {
    expect(scoreTip({ home: 1, away: 1, goals: { home: [], away: [] } }, result, snap,
      { ...DEFAULT_RULES, favFlopPenalty: 20 }).favFlop).toBe(0);
  });

  it("quotenabhängig: unter Ramp-Start kein Malus (Sieger galt nicht als Außenseiter)", () => {
    const rules = { ...DEFAULT_RULES, favFlopPenalty: 20, underdogRampStart: 10, underdogRampEnd: 20 };
    expect(scoreTip(backFav, result, snap, rules).favFlop).toBe(0); // winner.home 9.0 < 10
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

describe("sanitizeRules — Import & Regler-Grenzen", () => {
  it("leeres Objekt ergibt das Standard-Regelwerk", () => {
    expect(sanitizeRules({})).toEqual(DEFAULT_RULES);
    expect(sanitizeRules()).toEqual(DEFAULT_RULES);
  });

  it("beschneidet Zahlen auf die RULE_LIMITS", () => {
    const r = sanitizeRules({ k: 99, m: -5, displayScale: 9999, combo: { exakt: 100 } });
    expect(r.k).toBe(RULE_LIMITS.k.max);
    expect(r.m).toBe(RULE_LIMITS.m.min);
    expect(r.displayScale).toBe(RULE_LIMITS.displayScale.max);
    expect(r.combo.exakt).toBe(RULE_LIMITS.combo.exakt.max);
  });

  it("verwirft Fremdschlüssel und ersetzt Unsinn durch Defaults", () => {
    const r = sanitizeRules({ hack: true, k: "abc", combo: { tendenz: null } });
    expect(r.hack).toBeUndefined();
    expect(r.k).toBe(DEFAULT_RULES.k);
    expect(r.combo.tendenz).toBe(DEFAULT_RULES.combo.tendenz);
  });

  it("perGameCap: null bleibt null, Zahl wird beschnitten", () => {
    expect(sanitizeRules({ perGameCap: null }).perGameCap).toBeNull();
    expect(sanitizeRules({ perGameCap: 999999 }).perGameCap).toBe(RULE_LIMITS.perGameCap.max);
  });

  it("Name wird getrimmt und auf 40 Zeichen begrenzt", () => {
    expect(sanitizeRules({ name: "  Hardcore  " }).name).toBe("Hardcore");
    expect(sanitizeRules({ name: "x".repeat(80) }).name.length).toBe(40);
    expect(sanitizeRules({ name: "   " }).name).toBe(DEFAULT_RULES.name);
  });

  it("Märkte: picksPerTeam gerundet & beschnitten, Booleans normalisiert", () => {
    const r = sanitizeRules({ markets: { result: false, goals: { picksPerTeam: 9, allowDouble: false } } });
    expect(r.markets.result).toBe(false);
    expect(r.markets.goals.picksPerTeam).toBe(RULE_LIMITS.picksPerTeam.max);
    expect(r.markets.goals.allowDouble).toBe(false);
    expect(r.markets.goals.enabled).toBe(true);
  });

  it("Runde durch Creator-Code: encode → decode → sanitize ist stabil", () => {
    const rules = sanitizeRules({ name: "Zocker-Modus", k: 1.2, combo: { exakt: 3.5 } });
    expect(sanitizeRules(decodePreset(encodePreset(rules)))).toEqual(rules);
  });
});

describe("projectTip — Tipp-Vorschau (Potenzial)", () => {
  it("exaktes Ergebnis ohne Tore: Punkte = skalierte Exakt-Quote, plus Quote", () => {
    const p = projectTip({ home: 5, away: 1, goals: { home: [], away: [] } }, snap);
    expect(p.exaktQuote).toBe(snap.correctScore[5][1]);
    expect(p.points).toBe(toDisplay(snap.correctScore[5][1])); // ebene exakt, decay(0)=1
    expect(p.goalsNet).toBe(0);
  });

  it("getippte Schützen heben das Potenzial (Kombi greift auf Ebene exakt)", () => {
    const ohne = projectTip({ home: 5, away: 1, goals: { home: [], away: [] } }, snap);
    const mit = projectTip({ home: 5, away: 1, goals: { home: ["Al-Naimat"], away: [] } }, snap);
    expect(mit.points).toBeGreaterThan(ohne.points);
    expect(mit.goalsNet).toBeCloseTo(snap.players.home["Al-Naimat"].anytime - 1, 5);
  });

  it("seltenes Ergebnis ohne Correct-Score-Quote: exaktQuote null", () => {
    const p = projectTip({ home: 9, away: 9, goals: { home: [], away: [] } }, snap);
    expect(p.exaktQuote).toBeNull();
  });
});

describe("scoreLeaderboard — Aggregation & Rang", () => {
  const base = { snapshot: snap, result, rules: DEFAULT_RULES };

  it("summiert Punkte je Nutzer und sortiert absteigend mit Rang", () => {
    const board = scoreLeaderboard([
      { userId: "u1", name: "Du", tip: { home: 4, away: 1 }, ...base },   // Nähe-Treffer
      { userId: "u2", name: "Max", tip: { home: 2, away: 1 }, ...base },  // nur Tendenz
    ]);
    expect(board[0].rank).toBe(1);
    expect(board[0].userId).toBe("u1");
    expect(board[0].total).toBeGreaterThan(board[1].total);
    expect(board.map((b) => b.rank)).toEqual([1, 2]);
  });

  it("mehrere Tipps eines Nutzers werden aufsummiert", () => {
    const board = scoreLeaderboard([
      { userId: "u1", name: "Du", tip: { home: 2, away: 1 }, ...base },
      { userId: "u1", name: "Du", tip: { home: 4, away: 1 }, ...base },
    ]);
    expect(board).toHaveLength(1);
    expect(board[0].tips).toBe(2);
    expect(board[0].gewertet).toBe(2);
    const einzeln = scoreTip({ home: 2, away: 1 }, result, snap).total
      + scoreTip({ home: 4, away: 1 }, result, snap).total;
    expect(board[0].total).toBe(einzeln);
  });

  it("Tipps ohne Ergebnis zählen 0, werden aber als abgegeben gezählt", () => {
    const board = scoreLeaderboard([
      { userId: "u1", name: "Du", tip: { home: 3, away: 0 }, snapshot: snap, result: null },
    ]);
    expect(board[0].total).toBe(0);
    expect(board[0].tips).toBe(1);
    expect(board[0].gewertet).toBe(0);
  });
});

describe("scoreLeaderboardHistory — kumulativer Rang-Verlauf je Spieltag", () => {
  const base = { snapshot: snap, result, rules: DEFAULT_RULES };

  it("ein Eintrag je vorkommendem Spieltag, aufsteigend sortiert", () => {
    const history = scoreLeaderboardHistory([
      { userId: "u1", name: "Du", tip: { home: 4, away: 1 }, matchday: 2, ...base },
      { userId: "u1", name: "Du", tip: { home: 2, away: 1 }, matchday: 1, ...base },
    ]);
    expect(history.map((h) => h.matchday)).toEqual([1, 2]);
  });

  it("Spieltag N enthält kumulativ alle Tipps bis einschließlich N", () => {
    const history = scoreLeaderboardHistory([
      { userId: "u1", name: "Du", tip: { home: 2, away: 1 }, matchday: 1, ...base },
      { userId: "u1", name: "Du", tip: { home: 4, away: 1 }, matchday: 2, ...base },
    ]);
    const nachMd1 = history.find((h) => h.matchday === 1).board[0];
    const nachMd2 = history.find((h) => h.matchday === 2).board[0];
    expect(nachMd1.gewertet).toBe(1);
    expect(nachMd2.gewertet).toBe(2);
    expect(nachMd2.total).toBeGreaterThan(nachMd1.total);
  });

  it("Einträge ohne matchday werden ignoriert (keine Historie ohne Zuordnung)", () => {
    const history = scoreLeaderboardHistory([{ userId: "u1", name: "Du", tip: { home: 1, away: 0 }, ...base }]);
    expect(history).toEqual([]);
  });
});
