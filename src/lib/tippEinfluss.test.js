import { describe, it, expect } from "vitest";
import {
  TIPPEINFLUSS_LIMITS, DEFAULT_TIPPEINFLUSS, sanitizeTippEinfluss,
  mischAnteil, gruppenVerteilung, mischeRaster, beschreibeTippEinfluss,
} from "@/lib/tippEinfluss";
import { DEFAULT_RULES, sanitizeRules, scoreLeaderboard } from "@/lib/engine";

// Ein neutrales 6×6-Raster: alle 36 Ergebnisse gleich wahrscheinlich. Dadurch
// ist jede Verschiebung eindeutig der Gruppe zuzuordnen.
// ⚠️ Die Quote ist 36/1.07, nicht 36×1.07 — bei Overround 1,07 muss die Summe
// der Kehrwerte 1,07 ergeben. (Beim ersten Anlauf stand hier das Gegenteil, und
// der Test schlug völlig zu Recht an.)
const OVERROUND = 1.07;
const flachesRaster = () =>
  Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => +(36 / OVERROUND).toFixed(2)));

const tipp = (userId, home, away) => ({ userId, tip: { home, away } });
const vieleTipps = (n, home, away) =>
  Array.from({ length: n }, (_, i) => tipp(`u${i}`, home, away));

describe("Bereinigung", () => {
  it("Unsinn fällt auf den Standard zurück", () => {
    expect(sanitizeTippEinfluss()).toEqual(DEFAULT_TIPPEINFLUSS);
    expect(sanitizeTippEinfluss({ staerke: "viel" })).toEqual(DEFAULT_TIPPEINFLUSS);
  });

  it("Werte werden beschnitten", () => {
    const c = sanitizeTippEinfluss({ staerke: 99, marktTiefe: 1, minTipper: 999 });
    expect(c.staerke).toBe(TIPPEINFLUSS_LIMITS.staerke.max);
    expect(c.marktTiefe).toBe(TIPPEINFLUSS_LIMITS.marktTiefe.min);
    expect(c.minTipper).toBe(TIPPEINFLUSS_LIMITS.minTipper.max);
  });

  it("die Vorgabe ist AUS", () => {
    expect(DEFAULT_TIPPEINFLUSS.staerke).toBe(0);
    expect(mischAnteil(100, DEFAULT_TIPPEINFLUSS)).toBe(0);
  });
});

// Der Kern: „im normalen Markt wäre ein Tippender marginal."
describe("Kalibrierung — marktTiefe entscheidet über Würze oder Chaos", () => {
  const an = (marktTiefe) => ({ staerke: 1, marktTiefe, minTipper: 3 });

  it("bei großer Markttiefe ist eine kleine Runde marginal", () => {
    expect(mischAnteil(12, an(200))).toBeLessThan(0.06);
  });

  it("bei kleiner Markttiefe wird dieselbe Runde spürbar", () => {
    expect(mischAnteil(12, an(10))).toBeGreaterThan(0.5);
  });

  it("mehr Tipper heißt mehr Gewicht — aber gedeckelt durch die Stärke", () => {
    const c = { staerke: 0.4, marktTiefe: 50, minTipper: 3 };
    expect(mischAnteil(10, c)).toBeLessThan(mischAnteil(100, c));
    expect(mischAnteil(100000, c)).toBeLessThanOrEqual(0.4);
  });

  it("unter minTipper greift gar nichts — Rauschen ist keine Marktmeinung", () => {
    const c = { staerke: 1, marktTiefe: 10, minTipper: 8 };
    expect(mischAnteil(7, c)).toBe(0);
    expect(mischAnteil(8, c)).toBeGreaterThan(0);
  });
});

describe("gruppenVerteilung", () => {
  it("zählt die Tipps je Endstand", () => {
    const { zaehler, gesamt } = gruppenVerteilung([
      tipp("a", 2, 1), tipp("b", 2, 1), tipp("c", 0, 0),
    ]);
    expect(zaehler.get("2:1")).toBe(2);
    expect(zaehler.get("0:0")).toBe(1);
    expect(gesamt).toBe(3);
  });

  it("Tipps außerhalb des Rasters fallen weg statt die Normierung zu verzerren", () => {
    const { gesamt } = gruppenVerteilung([tipp("a", 7, 2), tipp("b", 1, 1), tipp("c", -1, 0)]);
    expect(gesamt).toBe(1);
  });

  it("unvollständige Tipps werden ignoriert", () => {
    expect(gruppenVerteilung([{ userId: "a" }, { userId: "b", tip: {} }]).gesamt).toBe(0);
  });
});

describe("mischeRaster", () => {
  const cfgAn = { staerke: 1, marktTiefe: 10, minTipper: 3 };

  it("ohne Wirkung kommt das Original ZURÜCK, nicht eine Kopie", () => {
    const r = flachesRaster();
    expect(mischeRaster({ raster: r, tipps: vieleTipps(20, 2, 1) })).toBe(r);   // Stärke 0
    expect(mischeRaster({ raster: r, tipps: [], cfg: cfgAn })).toBe(r);         // keine Tipps
    expect(mischeRaster({ raster: r, tipps: vieleTipps(2, 2, 1), cfg: cfgAn })).toBe(r); // zu wenige
  });

  // Das eigentliche Versprechen: wer tippt, was alle tippen, bekommt weniger.
  it("ein beliebter Endstand wird teurer bezahlt — also billiger", () => {
    const vorher = flachesRaster();
    const nachher = mischeRaster({ raster: vorher, tipps: vieleTipps(20, 2, 1), cfg: cfgAn });
    expect(nachher[2][1]).toBeLessThan(vorher[2][1]);
  });

  it("ein ungetippter Endstand wird besser bezahlt", () => {
    const vorher = flachesRaster();
    const nachher = mischeRaster({ raster: vorher, tipps: vieleTipps(20, 2, 1), cfg: cfgAn });
    expect(nachher[5][5]).toBeGreaterThan(vorher[5][5]);
  });

  it("das Preisniveau bleibt — verschoben wird die Verteilung, nicht die Marge", () => {
    // Sonst wäre eine Runde mit Tipp-Einfluss insgesamt mehr oder weniger wert
    // als eine ohne, und die beiden ließen sich nicht mehr vergleichen.
    const vorher = flachesRaster();
    const nachher = mischeRaster({ raster: vorher, tipps: vieleTipps(20, 2, 1), cfg: cfgAn });
    const summe = (r) => r.flat().reduce((s, q) => s + 1 / q, 0);
    expect(summe(vorher)).toBeCloseTo(OVERROUND, 2);
    expect(summe(nachher)).toBeCloseTo(OVERROUND, 2);
  });

  // Regel 2 aus dem Modulkopf.
  it("die eigene Stimme drückt die eigene Quote nicht", () => {
    const raster = flachesRaster();
    const tipps = [...vieleTipps(9, 2, 1), tipp("ich", 2, 1)];
    const mitMir = mischeRaster({ raster, tipps, cfg: cfgAn });
    const ohneMich = mischeRaster({ raster, tipps, cfg: cfgAn, ohneUserId: "ich" });
    expect(ohneMich[2][1]).toBeGreaterThan(mitMir[2][1]);
  });

  it("zwei Spieler mit demselben Tipp bekommen exakt denselben Preis", () => {
    // Das ist der Grund, warum die Leave-one-out-Regel fair ist und nicht
    // etwa jedem eine eigene Quote gibt.
    const raster = flachesRaster();
    const tipps = [...vieleTipps(8, 1, 1), tipp("a", 2, 1), tipp("b", 2, 1)];
    const fuerA = mischeRaster({ raster, tipps, cfg: cfgAn, ohneUserId: "a" });
    const fuerB = mischeRaster({ raster, tipps, cfg: cfgAn, ohneUserId: "b" });
    expect(fuerA[2][1]).toBe(fuerB[2][1]);
  });

  it("stärkere Mischung verschiebt weiter", () => {
    const raster = flachesRaster();
    const schwach = mischeRaster({ raster, tipps: vieleTipps(20, 2, 1), cfg: { staerke: 0.2, marktTiefe: 10, minTipper: 3 } });
    const stark = mischeRaster({ raster, tipps: vieleTipps(20, 2, 1), cfg: cfgAn });
    expect(stark[2][1]).toBeLessThan(schwach[2][1]);
  });

  it("kommt mit kaputten Eingaben klar", () => {
    expect(mischeRaster({ raster: null })).toBeNull();
    expect(mischeRaster({})).toBeUndefined();
    expect(mischeRaster({ raster: [], cfg: cfgAn })).toEqual([]);
  });
});

describe("Klartext für die Spielerstellung", () => {
  it("sagt im Aus-Zustand, dass allein der Markt gilt", () => {
    expect(beschreibeTippEinfluss(DEFAULT_TIPPEINFLUSS)).toMatch(/Aus/);
  });

  it("nennt, was EIN einzelner Tipp bewegt — die eigentliche Frage", () => {
    const t = beschreibeTippEinfluss({ staerke: 1, marktTiefe: 200, minTipper: 8 }, 12);
    expect(t).toMatch(/ein einzelner Tipp/);
    expect(t).toMatch(/%/);
  });

  it("warnt, solange die Runde zu klein ist", () => {
    const t = beschreibeTippEinfluss({ staerke: 1, marktTiefe: 50, minTipper: 8 }, 4);
    expect(t).toMatch(/Rauschen/);
  });
});

// ── Verdrahtung in der Engine ───────────────────────────────
// Der Beweis, dass die Mischung in der WERTUNG ankommt und nicht nur als Modul
// danebenliegt. Genau die Lücke, die heute schon dreimal unbemerkt geblieben
// ist (Quoten-Index, Ligadateien, brauchtVerlauf).
describe("scoreLeaderboard nimmt den Tipp-Einfluss an", () => {
  const snapshot = () => ({
    matchId: "m1",
    winner: { home: 2.5, draw: 3.4, away: 2.8 },
    correctScore: Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 33.64)),
    teamGoals: { home: [2, 3, 6, 11, 24, 55], away: [2, 3, 6, 11, 24, 55] },
    margin: { home: [0, 4, 8, 16, 32, 64], away: [0, 4, 8, 16, 32, 64] },
    players: { home: {}, away: {} },
    marge: 1.07,
  });

  // 10 Tipper: neun tippen 2:1, einer 0:3. Alle liegen mit 2:1 richtig.
  const eintraege = () => [
    ...Array.from({ length: 9 }, (_, i) => ({
      userId: `u${i}`, name: `u${i}`, matchId: "m1", matchday: 1, wettbewerb: "bl",
      tip: { home: 2, away: 1 }, result: { home: 2, away: 1 }, snapshot: snapshot(),
    })),
    {
      userId: "solo", name: "solo", matchId: "m1", matchday: 1, wettbewerb: "bl",
      tip: { home: 0, away: 3 }, result: { home: 2, away: 1 }, snapshot: snapshot(),
    },
  ];

  const regeln = (tippEinfluss) => sanitizeRules({ ...DEFAULT_RULES, tippEinfluss });

  it("ist die Regel aus, ändert sich nichts", () => {
    const ohne = scoreLeaderboard(eintraege(), DEFAULT_RULES);
    const mitAus = scoreLeaderboard(eintraege(), regeln({ staerke: 0 }));
    expect(mitAus).toEqual(ohne);
  });

  // Das Versprechen des Features: wer tippt, was alle tippen, bekommt weniger.
  it("der beliebte Tipp zahlt weniger, sobald die Regel greift", () => {
    const ohne = scoreLeaderboard(eintraege(), DEFAULT_RULES);
    const mit = scoreLeaderboard(eintraege(), regeln({ staerke: 1, marktTiefe: 10, minTipper: 3 }));
    const punkte = (b, id) => b.find((z) => z.userId === id).total;
    expect(punkte(mit, "u0")).toBeLessThan(punkte(ohne, "u0"));
  });

  it("alle mit demselben Tipp bekommen exakt gleich viel", () => {
    const mit = scoreLeaderboard(eintraege(), regeln({ staerke: 1, marktTiefe: 10, minTipper: 3 }));
    const neun = mit.filter((z) => z.userId.startsWith("u")).map((z) => z.total);
    expect(new Set(neun).size).toBe(1);
  });

  it("die Regel reist über sanitizeRules mit", () => {
    const r = sanitizeRules({ ...DEFAULT_RULES, tippEinfluss: { staerke: 0.5, marktTiefe: 9999 } });
    expect(r.tippEinfluss.staerke).toBe(0.5);
    expect(r.tippEinfluss.marktTiefe).toBe(TIPPEINFLUSS_LIMITS.marktTiefe.max);
    expect(sanitizeRules(r)).toEqual(r);
  });
});
