// ============================================================
//  🔴 TORSCHÜTZEN-GEWICHT — der Regler, den es nur nach unten gab
//
//  Andi, 29.08.2026, als Frage: ob „richtiger Torschütze mehr wert" schon
//  einstellbar sei. War es nicht: der Wert eines Schützen kam direkt aus der
//  Marktquote, und der einzige Griff daran (`schuetzenMalus`) wertet AB.
//
//  ⚠️ Die Zahlen hier sind bewusst keine Balance-Aussage. Geprüft wird die
//  MECHANIK: dass 1 wirklich nichts tut, dass der Faktor nur die Torschützen
//  trifft, und dass er an genau einer Stelle greift.
// ============================================================
import { describe, it, expect } from "vitest";
import {
  DEFAULT_RULES, RULE_LIMITS, sanitizeRules, scoreGoals, scoreResult, scoreTip,
  createMockOddsSource,
} from "./engine";

// ⚠️ Der ECHTE Schnappschuss aus der Mock-Quelle, kein handgebauter. Meine
// erste Fassung hat einen zusammengesteckt und zwei Felder vergessen, die
// `scoreResult` braucht — der Test scheiterte an meiner Attrappe, nicht am
// Code. Die Quelle kennt ihre eigene Form besser als ich.
const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const SCHUETZEN = [
  ...Object.keys(SNAP.players.home).slice(0, 1),
  ...Object.keys(SNAP.players.away).slice(0, 1),
];
const mitGewicht = (g) => sanitizeRules({
  ...DEFAULT_RULES,
  markets: { ...DEFAULT_RULES.markets, goals: { ...DEFAULT_RULES.markets.goals, gewicht: g } },
});

const PICKS = { home: [SCHUETZEN[0]], away: [SCHUETZEN[1]] };
const TORE = { [SCHUETZEN[0]]: 1, [SCHUETZEN[1]]: 1 };

describe("Die Vorgabe", () => {
  // 🔴 Die wichtigste Zusicherung überhaupt: ein neu angelegter Regler, der
  // in seiner Vorgabe etwas verändert, verschiebt jede bestehende Runde still.
  it("🔴 1 ist ein echtes No-op — bestehende Runden ändern sich nicht", () => {
    expect(DEFAULT_RULES.markets.goals.gewicht).toBe(1);
    const a = scoreGoals(PICKS, SNAP, DEFAULT_RULES, TORE);
    expect(a.net).toBeCloseTo(a.netRoh, 10);
  });

  it("überlebt das Säubern und liegt in seinen Grenzen", () => {
    expect(sanitizeRules(DEFAULT_RULES).markets.goals.gewicht).toBe(1);
    expect(mitGewicht(99).markets.goals.gewicht).toBe(RULE_LIMITS.goalsGewicht.max);
    expect(mitGewicht(0).markets.goals.gewicht).toBe(RULE_LIMITS.goalsGewicht.min);
    expect(mitGewicht("quatsch").markets.goals.gewicht).toBe(1);
  });

  // ⚠️ Nach unten nur bis 0,5: darunter wären Torschützen praktisch
  // abgeschafft, und dafür gibt es den ehrlicheren Schalter `enabled`.
  it("lässt sich nicht bis zur Bedeutungslosigkeit drehen", () => {
    expect(RULE_LIMITS.goalsGewicht.min).toBeGreaterThan(0);
  });
});

describe("Die Wirkung", () => {
  it("verdoppelt den Torschützen-Anteil bei 2", () => {
    const eins = scoreGoals(PICKS, SNAP, mitGewicht(1), TORE);
    const zwei = scoreGoals(PICKS, SNAP, mitGewicht(2), TORE);
    expect(zwei.net).toBeCloseTo(eins.net * 2, 10);
    // Die ROHE Summe bleibt gleich — nur so kann eine Aufschlüsselung
    // „12,4 × 2" zeigen statt nur das Ergebnis.
    expect(zwei.netRoh).toBeCloseTo(eins.netRoh, 10);
    expect(zwei.gewicht).toBe(2);
  });

  it("wertet ab, wenn es unter 1 steht", () => {
    const halb = scoreGoals(PICKS, SNAP, mitGewicht(0.5), TORE);
    const eins = scoreGoals(PICKS, SNAP, mitGewicht(1), TORE);
    expect(halb.net).toBeCloseTo(eins.net * 0.5, 10);
  });

  // 🔴 Der Regler wiegt den MARKT, nicht das Spiel. Fasst er den
  // Ergebnis-Teil an, wäre er ein verkappter Modifikator — und einer, den
  // `modCap` nicht sieht.
  it("🔴 fasst den Ergebnis-Teil NICHT an", () => {
    const tipp = { home: 2, away: 1 };
    const echt = { home: 2, away: 1 };
    const a = scoreResult(tipp, echt, SNAP, mitGewicht(1));
    const b = scoreResult(tipp, echt, SNAP, mitGewicht(3));
    expect(b.resultPart).toBeCloseTo(a.resultPart, 10);
  });

  it("ohne getroffene Schützen bleibt alles bei null", () => {
    const keiner = { [SCHUETZEN[0]]: 0, [SCHUETZEN[1]]: 0 };
    expect(scoreGoals(PICKS, SNAP, mitGewicht(3), keiner).net).toBe(0);
  });

  // ⚠️ Der Weg durch die ganze Wertung: ein höheres Gewicht darf die
  // Gesamtpunkte nur ERHÖHEN, nie senken. Klingt selbstverständlich und ist
  // genau die Art Zusicherung, die bei einem Vorzeichenfehler bricht.
  it("⚠️ ein höheres Gewicht senkt die Gesamtwertung nie", () => {
    const tipp = { home: 2, away: 1, goals: PICKS };
    const echt = { home: 2, away: 1, goals: TORE };
    let vorher = -Infinity;
    for (const g of [0.5, 1, 1.5, 2, 3]) {
      const r = scoreTip(tipp, echt, SNAP, mitGewicht(g));
      expect(r.raw, `Gewicht ${g}`).toBeGreaterThanOrEqual(vorher);
      vorher = r.raw;
    }
  });
});
