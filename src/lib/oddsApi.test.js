import { describe, it, expect } from "vitest";
import {
  impliedProbabilities, outcomeProbs, fitLambdas, snapshotFromOdds,
  parseTheOddsApiEvent, snapshotsFromTheOddsApi, RHO, rasterAusMarkt, longshotK, spielerAusMarkt,
  fitLambdasMitTotal, torschnittAusRaster, torschnittAusTotals, totalsAusEvent,
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

// ── Gebundener Fit: Torschnitt aus dem Markt ────────────────
// Der freie Fit hat zwei Freiheiten für zwei Vorgaben und trifft die 1X2
// deshalb fast exakt — der Torschnitt fällt dabei ungeprüft mit ab. Wird er
// vorgegeben, bleibt ρ als einzige Unbekannte übrig und ist damit gemessen
// statt geraten.
describe("fitLambdasMitTotal", () => {
  const AUSGEGLICHEN = { home: 2.6, draw: 3.3, away: 2.7 };
  const EINSEITIG = { home: 1.27, draw: 6.4, away: 7.5 };

  it("hält den vorgegebenen Torschnitt exakt ein", () => {
    const p = impliedProbabilities(AUSGEGLICHEN);
    const fit = fitLambdasMitTotal(p, 2.9);
    expect(fit.lamH + fit.lamA).toBeCloseTo(2.9, 2);
  });

  it("trifft die 1X2 des Marktes trotzdem", () => {
    const p = impliedProbabilities(AUSGEGLICHEN);
    const fit = fitLambdasMitTotal(p, 2.9);
    const nach = outcomeProbs(fit.lamH, fit.lamA, 12, fit.rho);
    // Der freie Fit liegt bei ~0,1 pp; die Bindung kostet gemessen 0,05 pp mehr.
    expect(Math.abs(nach.home - p.home)).toBeLessThan(0.005);
    expect(Math.abs(nach.draw - p.draw)).toBeLessThan(0.005);
    expect(Math.abs(nach.away - p.away)).toBeLessThan(0.005);
  });

  // Der eigentliche Befund: die Unabhängigkeits-Annahme liefert in
  // AUSGEGLICHENEN Spielen zu wenig Remis. Genau dort muss ρ deutlich negativ
  // werden, in einseitigen dagegen kaum. Gemessen an den neun echten
  // Bundesliga-Spielen: -0,158 bis -0,013.
  it("misst ρ — negativ, und in ausgeglichenen Spielen stärker", () => {
    const aus = fitLambdasMitTotal(impliedProbabilities(AUSGEGLICHEN), 2.9);
    const ein = fitLambdasMitTotal(impliedProbabilities(EINSEITIG), 4.07);
    expect(aus.rho).toBeLessThan(0);
    expect(Math.abs(aus.rho)).toBeGreaterThan(Math.abs(ein.rho));
  });

  // Negative Dixon-Coles-Faktoren wären negative Wahrscheinlichkeiten.
  it("bleibt in den Schranken, in denen ρ überhaupt zulässig ist", () => {
    for (const total of [1.5, 2.5, 3.5, 5.0]) {
      const fit = fitLambdasMitTotal(impliedProbabilities(AUSGEGLICHEN), total);
      expect(1 - fit.lamH * fit.lamA * fit.rho).toBeGreaterThan(0);
      expect(1 + fit.lamH * fit.rho).toBeGreaterThan(0);
      expect(1 + fit.lamA * fit.rho).toBeGreaterThan(0);
      expect(1 - fit.rho).toBeGreaterThan(0);
    }
  });

  it("ohne brauchbaren Torschnitt gibt es keinen gebundenen Fit", () => {
    expect(fitLambdasMitTotal(impliedProbabilities(AUSGEGLICHEN), 0)).toBeNull();
    expect(fitLambdasMitTotal(null, 3)).toBeNull();
  });

  describe("torschnittAusRaster", () => {
    const buchMit = (lamH, lamA) => {
      const pois = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
      const m = {};
      for (let h = 0; h < 8; h++) for (let a = 0; a < 8; a++) m[`${h}:${a}`] = 1 / (pois(lamH, h) * pois(lamA, a));
      return m;
    };

    it("liest den Torschnitt aus einem sauberen Buch zurück", () => {
      expect(torschnittAusRaster(buchMit(1.7, 1.3), 1)).toBeCloseTo(3.0, 1);
    });

    // Ohne Eichung ist die Zahl zu hoch, weil die Marge auf den torreichen
    // Außenseitern liegt: gemessen 4,74 statt 4,28 für Bayern–Stuttgart.
    it("die Longshot-Eichung senkt den Torschnitt", () => {
      const b = buchMit(1.7, 1.3);
      expect(torschnittAusRaster(b, 1.3)).toBeLessThan(torschnittAusRaster(b, 1));
    });

    it("ein halbes Buch ist kein Torschnitt", () => {
      expect(torschnittAusRaster({ "0:0": 12, "1:1": 8 }, 1)).toBeNull();
    });
  });

  // Die billigste und direkteste Messung: `totals` kommt in derselben
  // Liga-Anfrage wie 1X2 (1 Credit für die ganze Liga), das Ergebnis-Buch
  // kostet 1 Credit JE SPIEL.
  describe("torschnittAusTotals", () => {
    // Ein Buch, das exakt zu einem bekannten λ passt — dann muss die Funktion
    // genau dieses λ zurückliefern.
    const linienFuer = (lam, punkte = [2.5, 3.5], marge = 1.05) => {
      const pUeber = (l, linie) => {
        let kum = 0, term = Math.exp(-l);
        for (let k = 0; k <= Math.floor(linie); k++) { kum += term; term *= l / (k + 1); }
        return 1 - kum;
      };
      return punkte.map((linie) => {
        const p = pUeber(lam, linie);
        return { linie, ueber: 1 / (p * marge), unter: 1 / ((1 - p) * marge) };
      });
    };

    it("liest den Torschnitt zurück, mit dem das Buch gebaut wurde", () => {
      expect(torschnittAusTotals(linienFuer(3.1))).toBeCloseTo(3.1, 1);
      expect(torschnittAusTotals(linienFuer(2.4))).toBeCloseTo(2.4, 1);
      expect(torschnittAusTotals(linienFuer(4.07))).toBeCloseTo(4.07, 1);
    });

    it("eine einzelne Linie genügt", () => {
      expect(torschnittAusTotals(linienFuer(3.0, [2.5]))).toBeCloseTo(3.0, 1);
    });

    it("die Marge fällt heraus — sie darf den Torschnitt nicht verschieben", () => {
      const schmal = torschnittAusTotals(linienFuer(3.2, [2.5, 3.5], 1.02));
      const breit = torschnittAusTotals(linienFuer(3.2, [2.5, 3.5], 1.15));
      expect(schmal).toBeCloseTo(breit, 1);
    });

    it("unbrauchbare Linien liefern nichts statt einer erfundenen Zahl", () => {
      expect(torschnittAusTotals([])).toBeNull();
      expect(torschnittAusTotals(null)).toBeNull();
      // Nur eine Seite bepreist: ohne Gegenseite ist die Marge nicht bestimmbar.
      expect(torschnittAusTotals([{ linie: 2.5, ueber: 1.9 }])).toBeNull();
    });

    it("passt zum gebundenen Fit", () => {
      const lam = torschnittAusTotals(linienFuer(3.3));
      const fit = fitLambdasMitTotal(impliedProbabilities({ home: 2.1, draw: 3.5, away: 3.4 }), lam);
      expect(fit.lamH + fit.lamA).toBeCloseTo(3.3, 1);
    });
  });

  describe("totalsAusEvent", () => {
    const event = (bookmakers) => ({ bookmakers });
    const buch = (ueber, unter, linie = 2.5) => ({
      markets: [{
        key: "totals",
        outcomes: [
          { name: "Over", point: linie, price: ueber },
          { name: "Under", point: linie, price: unter },
        ],
      }],
    });

    it("nimmt den Median je Linie über alle Buchmacher", () => {
      const l = totalsAusEvent(event([buch(1.8, 2.0), buch(1.9, 1.95), buch(2.0, 1.9)]));
      expect(l).toHaveLength(1);
      expect(l[0].linie).toBe(2.5);
      expect(l[0].ueber).toBe(1.9);
    });

    it("hält mehrere Linien auseinander und sortiert sie", () => {
      const l = totalsAusEvent(event([
        { markets: [{ key: "totals", outcomes: [
          { name: "Over", point: 3.5, price: 2.6 }, { name: "Under", point: 3.5, price: 1.5 },
          { name: "Over", point: 2.5, price: 1.8 }, { name: "Under", point: 2.5, price: 2.0 },
        ] }] },
      ]));
      expect(l.map((x) => x.linie)).toEqual([2.5, 3.5]);
    });

    it("verwirft einseitig bepreiste Linien", () => {
      const l = totalsAusEvent(event([
        { markets: [{ key: "totals", outcomes: [{ name: "Over", point: 2.5, price: 1.8 }] }] },
      ]));
      expect(l).toEqual([]);
    });

    it("ignoriert fremde Märkte", () => {
      const l = totalsAusEvent(event([
        { markets: [{ key: "h2h", outcomes: [{ name: "A", price: 1.8 }] }] },
      ]));
      expect(l).toEqual([]);
      expect(totalsAusEvent(null)).toEqual([]);
    });
  });

  describe("snapshotFromOdds nennt die Herkunft des Torschnitts", () => {
    const basis = { matchId: "x", home: "A", away: "B", kickoff: "2026-08-28T18:30:00Z", odds: FAVORIT };
    const vollesBuch = () => {
      const m = {};
      for (let h = 0; h < 6; h++) for (let a = 0; a < 6; a++) m[`${h}:${a}`] = 10 + h * 3 + a * 4;
      return m;
    };

    it("ohne alles: geschätzt", () => {
      expect(snapshotFromOdds(basis).torschnittQuelle).toBe("geschaetzt");
    });

    it("mit echtem Raster: aus dem Raster", () => {
      const snap = snapshotFromOdds({ ...basis, correctScore: vollesBuch() });
      expect(snap.torschnittQuelle).toBe("raster");
      expect(snap.torschnitt).toBeGreaterThan(0);
    });

    // Eine echte Über/Unter-Linie ist die direktere Messung und schlägt das
    // Ergebnis-Buch, das dafür erst geeicht werden muss.
    it("eine echte Über/Unter-Linie schlägt das Raster", () => {
      const snap = snapshotFromOdds({ ...basis, correctScore: vollesBuch(), total: 3.4 });
      expect(snap.torschnittQuelle).toBe("totals");
      expect(snap.torschnitt).toBeCloseTo(3.4, 1);
    });

    // Der Punkt, an dem es sonst still auseinanderliefe: das echte Raster
    // ersetzt `correctScore`, während `margin`/`teamGoals` aus dem Fit kommen.
    // Mit unterschiedlichem Torschnitt trüge dasselbe Spiel zwei Tor-
    // Erwartungen — ein Widerspruch mitten in der Wertung.
    it("Raster und abgeleitete Märkte teilen denselben Torschnitt", () => {
      const snap = snapshotFromOdds({ ...basis, correctScore: vollesBuch() });
      const k = longshotK(vollesBuch(), impliedProbabilities(FAVORIT));
      expect(snap.torschnitt).toBeCloseTo(torschnittAusRaster(vollesBuch(), k), 1);
    });
  });
});

// ── Echtes Ergebnis-Raster aus dem Markt ────────────────────
describe("rasterAusMarkt", () => {
  // Ein vollständiges Buch über 0..5 plus ein paar hohe Ergebnisse, wie es der
  // echte Markt liefert (dort sind es 66 Ausgänge).
  const buch = () => {
    const m = {};
    for (let h = 0; h < 6; h++) for (let a = 0; a < 6; a++) m[`${h}:${a}`] = 10 + h * 3 + a * 4;
    m["6:0"] = 90; m["6:1"] = 110; m["0:6"] = 260;   // außerhalb unseres Rasters
    return m;
  };

  it("liefert ein 6×6-Raster", () => {
    const r = rasterAusMarkt(buch());
    expect(r).toHaveLength(6);
    expect(r[0]).toHaveLength(6);
  });

  // Der Kern: die Marge des Ergebnis-Marktes (gemessen 65 %) darf nicht
  // durchschlagen, sonst zahlte ein echtes Raster halb so viel wie ein
  // abgeleitetes — zwei Spiele derselben Runde wären ungleich viel wert.
  it("rechnet die Marge des Buches heraus und legt UNSERE an", () => {
    const r = rasterAusMarkt(buch(), { overround: 1.07 });
    const summe = r.flat().reduce((s, q) => s + 1 / q, 0);
    // Die 36 Zellen tragen nicht die volle Masse (6+ Tore fehlen), aber die
    // Marge muss bei ~7 % liegen und nicht bei den 65 % des Buches.
    expect(summe).toBeGreaterThan(0.9);
    expect(summe).toBeLessThan(1.08);
  });

  it("die Reihenfolge des Marktes bleibt erhalten", () => {
    const r = rasterAusMarkt(buch());
    // Im Testbuch ist 0:0 am billigsten, also am wahrscheinlichsten.
    expect(r[0][0]).toBeLessThan(r[5][5]);
  });

  it("ein lückenhaftes Buch wird verworfen statt halb übernommen", () => {
    // Lücken blieben sonst als Höchstquote stehen und wären die
    // bestbezahlte Wette überhaupt.
    const halb = { "0:0": 12, "1:0": 9, "1:1": 8, "2:1": 10 };
    expect(rasterAusMarkt(halb)).toBeNull();
    expect(rasterAusMarkt(null)).toBeNull();
    expect(rasterAusMarkt({})).toBeNull();
  });

  // ── Longshot-Bias ─────────────────────────────────────────
  // Der teuerste Fehler an dieser Stelle ist nicht die HÖHE der Marge (die wird
  // oben herausgerechnet), sondern ihre SCHIEFE: 65 % Overround liegen nicht
  // gleichmäßig auf allen 66 Ausgängen, sondern auf den Außenseitern.
  describe("longshotK — die Schieflage des Buches messen", () => {
    // Ein Buch, dessen Marge bewusst auf den Außenseitern liegt: die wahren
    // Wahrscheinlichkeiten werden mit (1/o)^k erzeugt, k = 1/1.3.
    const schiefesBuch = (wahr, aufschlag = 1.3) => {
      const m = {};
      for (const [s, p] of Object.entries(wahr)) {
        m[s] = 1 / Math.pow(p, 1 / aufschlag);
      }
      return m;
    };
    // Eine plausible, vollständige Verteilung über 0..5 Tore je Seite.
    const wahreVerteilung = (lamH, lamA) => {
      const pois = (l, k) => { let p = Math.exp(-l); for (let i = 1; i <= k; i++) p *= l / i; return p; };
      const w = {}; let summe = 0;
      for (let h = 0; h < 6; h++) for (let a = 0; a < 6; a++) { w[`${h}:${a}`] = pois(lamH, h) * pois(lamA, a); summe += w[`${h}:${a}`]; }
      for (const s of Object.keys(w)) w[s] /= summe;
      return w;
    };
    const zu1x2 = (w) => {
      let home = 0, draw = 0, away = 0;
      for (const [s, p] of Object.entries(w)) {
        const [h, a] = s.split(":").map(Number);
        if (h > a) home += p; else if (h < a) away += p; else draw += p;
      }
      return { home, draw, away };
    };

    it("findet die Schieflage zurück, mit der das Buch gebaut wurde", () => {
      const wahr = wahreVerteilung(1.7, 1.2);
      const k = longshotK(schiefesBuch(wahr, 1.3), zu1x2(wahr));
      expect(k).toBeGreaterThan(1.2);
      expect(k).toBeLessThan(1.4);
    });

    it("ein faires Buch braucht keine Korrektur", () => {
      const wahr = wahreVerteilung(1.5, 1.3);
      // Gleichmäßige Marge auf allen Ausgängen — k muss bei 1 landen.
      const fair = {};
      for (const [s, p] of Object.entries(wahr)) fair[s] = 1 / (p / 1.2);
      expect(longshotK(fair, zu1x2(wahr))).toBeCloseTo(1, 1);
    });

    it("ohne 1X2-Anker wird NICHT geraten", () => {
      // Lieber unkorrigiert als mit einem erfundenen Wert korrigiert.
      expect(longshotK(buch(), null)).toBe(1);
      expect(longshotK(null, { home: 0.4, draw: 0.3, away: 0.3 })).toBe(1);
    });

    it("das korrigierte Raster trifft die 1X2 des Marktes besser als das naive", () => {
      const wahr = wahreVerteilung(1.9, 1.1);
      const ziel = zu1x2(wahr);
      const markt = schiefesBuch(wahr, 1.3);
      const abstand = (r) => {
        let home = 0, draw = 0, away = 0, summe = 0;
        for (let h = 0; h < 6; h++) for (let a = 0; a < 6; a++) {
          const p = 1 / r[h][a]; summe += p;
          if (h > a) home += p; else if (h < a) away += p; else draw += p;
        }
        return Math.abs(home / summe - ziel.home) + Math.abs(draw / summe - ziel.draw) + Math.abs(away / summe - ziel.away);
      };
      const naiv = rasterAusMarkt(markt, { k: 1 });
      const korr = rasterAusMarkt(markt, { k: longshotK(markt, ziel) });
      expect(abstand(korr)).toBeLessThan(abstand(naiv));
    });

    // Die Richtung ist der eigentliche Befund: die naive Normierung zahlte für
    // die WAHRSCHEINLICHEN Ergebnisse zu viel — und genau die treten ein.
    it("korrigiert nach unten, wo es wahrscheinlich ist", () => {
      const wahr = wahreVerteilung(1.8, 1.1);
      const markt = schiefesBuch(wahr, 1.3);
      const naiv = rasterAusMarkt(markt, { k: 1 });
      const korr = rasterAusMarkt(markt, { k: longshotK(markt, zu1x2(wahr)) });
      expect(korr[2][1]).toBeLessThan(naiv[2][1]);   // wahrscheinlich → billiger
      // Bewusst NICHT 5:5 — das steht in beiden Rastern am Deckel (200) und
      // wäre als Messpunkt untauglich, nicht als Gegenbeweis.
      expect(korr[3][3]).toBeGreaterThan(naiv[3][3]); // unwahrscheinlich → teurer
      expect(naiv[3][3]).toBeLessThan(200);
    });

    it("snapshotFromOdds hält den Korrekturwert fest", () => {
      const snap = snapshotFromOdds({
        matchId: "x", home: "A", away: "B", kickoff: "2026-08-28T18:30:00Z",
        odds: FAVORIT, correctScore: buch(),
      });
      expect(snap.rasterK).toBeGreaterThan(0.5);
      expect(snap.rasterK).toBeLessThan(2.0);
    });
  });

  it("snapshotFromOdds nimmt es und sagt, woher das Raster kommt", () => {
    const ohne = snapshotFromOdds({ matchId: "x", home: "A", away: "B", kickoff: "2026-08-28T18:30:00Z", odds: FAVORIT });
    expect(ohne.rasterQuelle).toBe("abgeleitet");
    const mit = snapshotFromOdds({
      matchId: "x", home: "A", away: "B", kickoff: "2026-08-28T18:30:00Z",
      odds: FAVORIT, correctScore: buch(),
    });
    expect(mit.rasterQuelle).toBe("markt");
    expect(mit.correctScore).not.toEqual(ohne.correctScore);
    // Die 1X2-Quoten bleiben in jedem Fall die echten.
    expect(mit.winner).toEqual({ home: 1.4, draw: 5.0, away: 7.0 });
  });
});

// ── Echte Torschützen ───────────────────────────────────────
describe("spielerAusMarkt", () => {
  const torschuetzen = { Magno: 2.15, Wolf: 3.2, Osorio: 6.25, Kerr: 4.2 };
  const zuordnung = { Magno: "NYC", Wolf: "NYC", Osorio: "TOR", Kerr: "TOR" };
  const args = { torschuetzen, home: "NYC", away: "TOR", zuordnung };

  it("trennt die Spieler nach Mannschaft", () => {
    const s = spielerAusMarkt(args);
    expect(Object.keys(s.home).sort()).toEqual(["Magno", "Wolf"]);
    expect(Object.keys(s.away).sort()).toEqual(["Kerr", "Osorio"]);
  });

  // Der Punkt, auf den es ankommt: die Anytime-Quote ist der Marktpreis,
  // unverändert. Die Marge-Annahme wirkt sich NUR auf den Doppelpack aus.
  it("übernimmt die Anytime-Quote exakt vom Markt", () => {
    const s = spielerAusMarkt(args);
    expect(s.home.Magno.anytime).toBe(2.15);
    expect(s.away.Osorio.anytime).toBe(6.25);
  });

  it("leitet den Doppelpack ab — immer teurer als ein Tor", () => {
    const s = spielerAusMarkt(args);
    for (const seite of ["home", "away"]) {
      for (const p of Object.values(s[seite])) expect(p.double).toBeGreaterThan(p.anytime);
    }
  });

  it("der wahrscheinlichere Schütze ist auch beim Doppelpack billiger", () => {
    const s = spielerAusMarkt(args);
    expect(s.home.Magno.double).toBeLessThan(s.home.Wolf.double);
  });

  // Eine Mannschaft ohne wählbare Schützen wäre im Tipp-Screen eine leere
  // Fläche — dann lieber der ganze erfundene Kader.
  it("gibt null zurück, wenn eine Seite zu wenige zugeordnete Spieler hat", () => {
    expect(spielerAusMarkt({ ...args, zuordnung: { Magno: "NYC", Wolf: "NYC" } })).toBeNull();
    expect(spielerAusMarkt({ ...args, zuordnung: {} })).toBeNull();
    expect(spielerAusMarkt({ ...args, torschuetzen: null })).toBeNull();
  });

  it("zählt die noch nicht zugeordneten Spieler mit", () => {
    const s = spielerAusMarkt({ ...args, torschuetzen: { ...torschuetzen, Neuer: 5.0 } });
    expect(s.unbekannt).toEqual(["Neuer"]);
  });

  it("snapshotFromOdds setzt sie ein und nennt die Herkunft", () => {
    const basis = {
      matchId: "x", home: "NYC", away: "TOR",
      kickoff: "2026-08-01T01:30:00Z", odds: FAVORIT,
    };
    const ohne = snapshotFromOdds(basis);
    expect(ohne.spielerQuelle).toBe("erfunden");
    const mit = snapshotFromOdds({ ...basis, torschuetzen, kaderZuordnung: zuordnung });
    expect(mit.spielerQuelle).toBe("markt");
    expect(Object.keys(mit.players.home).sort()).toEqual(["Magno", "Wolf"]);
  });
});

// ── Die Route liefert dieselbe Qualität wie der Offline-Weg ─
// `/api/odds` holt seit 30.07. `h2h,totals`. Ohne die Weitergabe in
// `snapshotsFromTheOddsApi` blieb der Torschnitt trotzdem geschätzt — dieselbe
// App hätte dann zwei Qualitätsstufen gehabt, je nachdem woher die Quoten kamen.
describe("snapshotsFromTheOddsApi nimmt die Über/Unter-Linie mit", () => {
  const event = (mitTotals) => ({
    id: "evt1", home_team: "Bayern Munich", away_team: "VfB Stuttgart",
    commence_time: "2026-08-28T18:30:00Z",
    bookmakers: [{
      markets: [
        { key: "h2h", outcomes: [
          { name: "Bayern Munich", price: 1.27 },
          { name: "Draw", price: 6.4 },
          { name: "VfB Stuttgart", price: 7.5 },
        ] },
        ...(mitTotals ? [{ key: "totals", outcomes: [
          { name: "Over", point: 4.5, price: 2.1 },
          { name: "Under", point: 4.5, price: 1.75 },
        ] }] : []),
      ],
    }],
  });

  it("ohne totals bleibt der Torschnitt geschätzt — wie bisher", () => {
    const [s] = snapshotsFromTheOddsApi([event(false)]);
    expect(s.snapshot.torschnittQuelle).toBe("geschaetzt");
  });

  it("mit totals ist er gemessen", () => {
    const [s] = snapshotsFromTheOddsApi([event(true)]);
    expect(s.snapshot.torschnittQuelle).toBe("totals");
    expect(s.total).toBeGreaterThan(0);
    expect(s.snapshot.torschnitt).toBeCloseTo(s.total, 1);
  });

  it("die echten 1X2-Quoten bleiben in beiden Fällen unangetastet", () => {
    for (const mit of [true, false]) {
      const [s] = snapshotsFromTheOddsApi([event(mit)]);
      expect(s.snapshot.winner.home).toBeCloseTo(1.27, 5);
      expect(s.snapshot.winner.away).toBeCloseTo(7.5, 5);
    }
  });
});
