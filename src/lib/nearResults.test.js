import { describe, it, expect } from "vitest";
import { createMockOddsSource, DEFAULT_RULES } from "@/lib/engine";
import { nearScorelines, nearPayouts, topScorelines, likelyScorelines, MAX_GOALS } from "@/lib/nearResults";

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

  it("bleibt im Quoten-Raster (keine negativen, keine über MAX_GOALS)", () => {
    for (const r of nearScorelines({ home: 0, away: 0 })) {
      expect(r.home).toBeGreaterThanOrEqual(0);
      expect(r.away).toBeGreaterThanOrEqual(0);
    }
    for (const r of nearScorelines({ home: MAX_GOALS, away: MAX_GOALS })) {
      expect(r.home).toBeLessThanOrEqual(MAX_GOALS);
      expect(r.away).toBeLessThanOrEqual(MAX_GOALS);
    }
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
