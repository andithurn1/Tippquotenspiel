import { describe, it, expect } from "vitest";
import { createMockOddsSource, DEFAULT_RULES } from "@/lib/engine";
import { nearScorelines, nearPayouts, topScorelines, likelyScorelines, MAX_GOALS, MAX_TIPP } from "@/lib/nearResults";

const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const TIP = { home: 2, away: 1, goals: { home: [], away: [] } };

describe("nearScorelines", () => {
  it("enthält den Tipp selbst als „exakt“", () => {
    const rows = nearScorelines(TIP);
    expect(rows[0]).toMatchObject({ home: 2, away: 1, kind: "exakt" });
  });

  it("liefert gleichen Abstand (beide ±1) und ein Tor mehr/weniger je Team", () => {
    const set = new Set(nearScorelines(TIP).map((r) => `${r.home}:${r.away}`));
    expect(set).toContain("3:2"); // gleicher Abstand, ein Tor mehr
    expect(set).toContain("1:0"); // gleicher Abstand, ein Tor weniger
    expect(set).toContain("3:1"); // Heim ein Tor mehr
    expect(set).toContain("1:1"); // Heim ein Tor weniger
    expect(set).toContain("2:2"); // Gast ein Tor mehr
    expect(set).toContain("2:0"); // Gast ein Tor weniger
  });

  it("bleibt im TIPP-Bereich (keine negativen, keine über MAX_TIPP)", () => {
    for (const r of nearScorelines({ home: 0, away: 0 })) {
      expect(r.home).toBeGreaterThanOrEqual(0);
      expect(r.away).toBeGreaterThanOrEqual(0);
    }
    for (const r of nearScorelines({ home: MAX_TIPP, away: MAX_TIPP })) {
      expect(r.home).toBeLessThanOrEqual(MAX_TIPP);
      expect(r.away).toBeLessThanOrEqual(MAX_TIPP);
    }
  });

  // 🔴 Der Fund vom 25.08.2026: die Grenze stand auf dem RASTER (0…5),
  // der Stepper lässt aber 0…9 zu. Wer 6:0 tippte, bekam gar keine Zeile
  // zurück — auch nicht die eigene — und der ganze Block verschwand.
  it("liefert auch über dem Raster noch Nachbarn — samt dem Tipp selbst", () => {
    const rows = nearScorelines({ home: 6, away: 0 });
    expect(rows[0]).toMatchObject({ home: 6, away: 0, kind: "exakt" });
    const set = new Set(rows.map((r) => `${r.home}:${r.away}`));
    expect(set).toContain("7:1");
    expect(set).toContain("5:0");
    expect(set).toContain("7:0");
  });

  it("MAX_TIPP folgt dem Stepper, MAX_GOALS dem Raster — zwei Zahlen", () => {
    expect(MAX_GOALS).toBe(5);
    expect(MAX_TIPP).toBe(9);
  });

  it("enthält keine Dubletten", () => {
    const rows = nearScorelines({ home: 0, away: 0 });
    const set = new Set(rows.map((r) => `${r.home}:${r.away}`));
    expect(set.size).toBe(rows.length);
  });
});

describe("nearPayouts", () => {
  it("gibt für jede Nachbarschaft Punkte und Quote zurück", () => {
    const rows = nearPayouts(TIP, SNAP, DEFAULT_RULES);
    expect(rows.length).toBeGreaterThan(4);
    for (const r of rows) {
      expect(typeof r.points).toBe("number");
      expect(r.points).toBeGreaterThanOrEqual(0);
      expect(r.quote == null || r.quote > 0).toBe(true);
    }
  });

  // ⚠️ Vorher stand hier `quote: null` neben einer Punktzahl, die sehr wohl
  // aus einer Quote kam — die Wertung schreibt den Rand fort, die Anzeige
  // wusste es nicht.
  it("außerhalb des Rasters kommt eine fortgeschriebene Quote, markiert", () => {
    const rows = nearPayouts({ home: 7, away: 0, goals: { home: [], away: [] } }, SNAP, DEFAULT_RULES);
    const exakt = rows.find((r) => r.isTip);
    expect(exakt.quote).toBeGreaterThan(0);
    expect(exakt.geschaetzt).toBe(true);
    expect(exakt.points).toBeGreaterThan(0);
  });

  it("innerhalb des Rasters bleibt die Quote unmarkiert", () => {
    const rows = nearPayouts(TIP, SNAP, DEFAULT_RULES);
    const exakt = rows.find((r) => r.isTip);
    expect(exakt.quote).toBe(SNAP.correctScore[2][1]);
    expect(exakt.geschaetzt).toBe(false);
  });

  it("das exakt getroffene Ergebnis zahlt am meisten", () => {
    const rows = nearPayouts(TIP, SNAP, DEFAULT_RULES);
    const exakt = rows.find((r) => r.isTip);
    const others = rows.filter((r) => !r.isTip);
    for (const o of others) expect(exakt.points).toBeGreaterThanOrEqual(o.points);
  });

  it("markiert die Ebene korrekt (gleicher Abstand → „abstand“)", () => {
    const rows = nearPayouts(TIP, SNAP, DEFAULT_RULES);
    const dreiZwei = rows.find((r) => r.home === 3 && r.away === 2);
    expect(dreiZwei.ebene).toBe("abstand");
  });

  it("verträgt fehlende Eingaben", () => {
    expect(nearPayouts(null, SNAP)).toEqual([]);
    expect(nearPayouts(TIP, null)).toEqual([]);
  });
});

describe("topScorelines / likelyScorelines", () => {
  it("top = höchste Auszahlung zuerst", () => {
    const rows = topScorelines(SNAP, DEFAULT_RULES, 3);
    expect(rows).toHaveLength(3);
    expect(rows[0].points).toBeGreaterThanOrEqual(rows[1].points);
    expect(rows[1].points).toBeGreaterThanOrEqual(rows[2].points);
  });

  it("likely = niedrigste Quote (wahrscheinlichstes Ergebnis) zuerst", () => {
    const rows = likelyScorelines(SNAP, DEFAULT_RULES, 3);
    expect(rows).toHaveLength(3);
    expect(rows[0].quote).toBeLessThanOrEqual(rows[1].quote);
    expect(rows[1].quote).toBeLessThanOrEqual(rows[2].quote);
  });

  it("ohne Snapshot leer statt Absturz", () => {
    expect(topScorelines(null)).toEqual([]);
    expect(likelyScorelines(undefined)).toEqual([]);
  });
});
