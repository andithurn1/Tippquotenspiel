import { describe, it, expect } from "vitest";
import {
  impliedProbabilities, outcomeProbs, fitLambdas, snapshotFromOdds,
  parseTheOddsApiEvent, snapshotsFromTheOddsApi, RHO,
} from "@/lib/oddsApi";
import { dixonColes } from "@/lib/oddsGenerator";
import { scoreTip, DEFAULT_RULES } from "@/lib/engine";

// Typische Bundesliga-Quoten: klarer Favorit zuhause.
const FAVORIT = { home: 1.4, draw: 5.0, away: 7.0 };
const AUSGEGLICHEN = { home: 2.5, draw: 3.4, away: 2.8 };

describe("impliedProbabilities", () => {
  it("rechnet die Buchmacher-Marge heraus (Summe = 1)", () => {
    const p = impliedProbabilities(FAVORIT);
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 6);
    expect(p.overround).toBeGreaterThan(1); // Buchmacher verdient mit
  });

  it("der Favorit hat die höchste Wahrscheinlichkeit", () => {
    const p = impliedProbabilities(FAVORIT);
    expect(p.home).toBeGreaterThan(p.away);
    expect(p.home).toBeGreaterThan(p.draw);
  });

  it("unbrauchbare Eingaben ergeben null", () => {
    expect(impliedProbabilities({})).toBeNull();
    expect(impliedProbabilities({ home: 0, draw: 0, away: 0 })).toBeNull();
  });
});

describe("fitLambdas", () => {
  it("findet Tor-Erwartungen, die die Quoten reproduzieren", () => {
    const p = impliedProbabilities(FAVORIT);
    const { lamH, lamA } = fitLambdas(p);
    const zurueck = outcomeProbs(lamH, lamA);
    expect(zurueck.home).toBeCloseTo(p.home, 2);
    expect(zurueck.draw).toBeCloseTo(p.draw, 2);
    expect(zurueck.away).toBeCloseTo(p.away, 2);
  });

  it("beim Favoriten liegt die Heim-Tor-Erwartung höher", () => {
    const { lamH, lamA } = fitLambdas(impliedProbabilities(FAVORIT));
    expect(lamH).toBeGreaterThan(lamA);
  });

  it("bei ausgeglichenem Spiel liegen die Erwartungen nah beieinander", () => {
    const { lamH, lamA } = fitLambdas(impliedProbabilities(AUSGEGLICHEN));
    expect(Math.abs(lamH - lamA)).toBeLessThan(0.6);
  });

  it("bleibt in realistischen Grenzen (kein 8:0-Modell)", () => {
    for (const o of [FAVORIT, AUSGEGLICHEN, { home: 12, draw: 7, away: 1.2 }]) {
      const { lamH, lamA } = fitLambdas(impliedProbabilities(o));
      expect(lamH).toBeGreaterThan(0);
      expect(lamH).toBeLessThan(5);
      expect(lamA).toBeLessThan(5);
    }
  });
});

describe("snapshotFromOdds", () => {
  const snap = snapshotFromOdds({
    matchId: "api-1", home: "FC Alpha", away: "SV Beta",
    kickoff: "2026-08-28T18:30:00Z", odds: FAVORIT,
  });

  it("hat die Form, die die Engine erwartet", () => {
    for (const feld of ["winner", "margin", "correctScore", "teamGoals", "players", "frozenAt"]) {
      expect(snap[feld]).toBeDefined();
    }
    expect(snap.correctScore).toHaveLength(6);
    expect(snap.correctScore[0]).toHaveLength(6);
  });

  it("übernimmt die ECHTEN 1X2-Quoten unverändert", () => {
    expect(snap.winner).toEqual({ home: 1.4, draw: 5.0, away: 7.0 });
  });

  it("kennzeichnet die Herkunft und die Marge", () => {
    expect(snap.quelle).toBe("api");
    expect(snap.marge).toBeGreaterThan(1);
  });

  it("die abgeleiteten Ergebnis-Quoten sind plausibel geordnet", () => {
    // Ein Heimsieg 2:0 muss beim Favoriten günstiger sein als ein 0:2.
    expect(snap.correctScore[2][0]).toBeLessThan(snap.correctScore[0][2]);
  });

  it("die Engine kann damit ganz normal werten", () => {
    const tip = { home: 2, away: 0, goals: { home: [], away: [] } };
    const punkte = scoreTip(tip, { home: 2, away: 0, playerGoals: null }, snap, DEFAULT_RULES);
    expect(punkte.total).toBeGreaterThan(0);
  });

  it("ohne verwertbare Quoten null statt Absturz", () => {
    expect(snapshotFromOdds({ matchId: "x", odds: {} })).toBeNull();
  });
});

describe("The-Odds-API-Format", () => {
  const event = {
    id: "abc123",
    home_team: "FC Alpha",
    away_team: "SV Beta",
    commence_time: "2026-08-28T18:30:00Z",
    bookmakers: [
      { markets: [{ key: "h2h", outcomes: [
        { name: "FC Alpha", price: 1.40 }, { name: "Draw", price: 5.00 }, { name: "SV Beta", price: 7.00 },
      ] }] },
      { markets: [{ key: "h2h", outcomes: [
        { name: "FC Alpha", price: 1.50 }, { name: "Draw", price: 4.60 }, { name: "SV Beta", price: 6.50 },
      ] }] },
      { markets: [{ key: "h2h", outcomes: [
        { name: "FC Alpha", price: 1.45 }, { name: "Draw", price: 4.80 }, { name: "SV Beta", price: 6.80 },
      ] }] },
    ],
  };

  it("nimmt den Median über die Buchmacher (robust gegen Ausreißer)", () => {
    const p = parseTheOddsApiEvent(event);
    expect(p.odds.home).toBe(1.45);
    expect(p.odds.draw).toBe(4.80);
    expect(p.odds.away).toBe(6.80);
  });

  it("übernimmt Teams, Anpfiff und baut eine eindeutige Id", () => {
    const p = parseTheOddsApiEvent(event);
    expect(p.home).toBe("FC Alpha");
    expect(p.kickoff).toBe("2026-08-28T18:30:00Z");
    expect(p.matchId).toContain("abc123");
  });

  it("überspringt Spiele ohne 1X2-Markt", () => {
    expect(parseTheOddsApiEvent({ ...event, bookmakers: [] })).toBeNull();
    expect(parseTheOddsApiEvent({})).toBeNull();
  });

  it("baut aus einer Antwort direkt fertige Snapshots", () => {
    const res = snapshotsFromTheOddsApi([event, {}, { ...event, id: "def456" }]);
    expect(res).toHaveLength(2); // das kaputte Event fliegt raus
    expect(res[0].snapshot.quelle).toBe("api");
    expect(res[0].snapshot.players.home).toBeDefined();
  });
});

// ── Niedrig-Ergebnis-Korrektur (Dixon–Coles) ────────────────
// Steht bereit, ist aber AUS (RHO = 0), bis der Torschnitt aus dem
// `totals`-Markt kommt statt aus einer Annahme. Die Tests sichern beides:
// dass sie nichts tut, solange sie aus ist, und dass sie richtig herum wirkt.
describe("dixonColes", () => {
  it("ist ohne rho exakt neutral — die erzeugten Ligen bleiben unberührt", () => {
    for (let h = 0; h < 4; h++) for (let a = 0; a < 4; a++) {
      expect(dixonColes(h, a, 1.5, 1.2, 0)).toBe(1);
    }
  });

  it("hebt 0:0 und 1:1, senkt 1:0 und 0:1 — und nur diese vier", () => {
    const rho = -0.1;
    expect(dixonColes(0, 0, 1.5, 1.2, rho)).toBeGreaterThan(1);
    expect(dixonColes(1, 1, 1.5, 1.2, rho)).toBeGreaterThan(1);
    expect(dixonColes(1, 0, 1.5, 1.2, rho)).toBeLessThan(1);
    expect(dixonColes(0, 1, 1.5, 1.2, rho)).toBeLessThan(1);
    expect(dixonColes(2, 1, 1.5, 1.2, rho)).toBe(1);
    expect(dixonColes(3, 3, 1.5, 1.2, rho)).toBe(1);
  });

  it("mehr Remis bei negativem rho — die Richtung, um die es geht", () => {
    const ohne = outcomeProbs(1.5, 1.3, 12, 0);
    const mit = outcomeProbs(1.5, 1.3, 12, -0.1);
    expect(mit.draw).toBeGreaterThan(ohne.draw);
  });

  it("RHO steht auf 0 — ein geratener Wert wäre schlechter als keiner", () => {
    // Wird bewusst festgehalten: die Kalibrierung auf den Liga-Torschnitt war
    // widerlegt (die Über/Unter-Linie des Marktes sagt für Bayern–Stuttgart
    // 4,07 Tore, nicht 3,1). Wer RHO ändert, muss vorher gegen `totals` messen.
    expect(RHO).toBe(0);
    expect(fitLambdas(impliedProbabilities(FAVORIT), { rho: RHO }))
      .toEqual(fitLambdas(impliedProbabilities(FAVORIT)));
  });
});
