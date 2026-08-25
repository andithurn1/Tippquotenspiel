import { describe, it, expect } from "vitest";
import {
  MATRIX_STUFEN, DEFAULT_MATRIX_STUFE, stufeVon, rasterMasse, wahrscheinlichkeiten,
  matrixMasse, abdeckungVon, matrixFelder, beschreibeMatrix, nutzbareStufen,
} from "@/lib/ergebnisMatrix";
import { DEFAULT_RULES } from "@/lib/engine";

// Ein ausgeglichenes Spiel: beide Seiten treffen ähnlich oft.
const AUSGEGLICHEN = {
  matchId: "m1",
  winner: { home: 2.6, draw: 3.3, away: 2.7 },
  correctScore: [
    [9, 11, 18, 42, 110, 300],
    [8, 7, 12, 30, 90, 260],
    [13, 11, 17, 44, 130, 400],
    [30, 26, 40, 100, 300, 900],
    [90, 80, 130, 320, 900, 2000],
    [300, 260, 400, 1000, 2000, 5000],
  ],
  teamGoals: { home: [2, 3, 6], away: [2, 3, 6] },
  margin: { home: [0, 3, 7], away: [0, 3, 7] },
};

// Ein klarer Favorit zu Hause: der Gast trifft fast nie mehr als zwei Tore,
// der Favorit dagegen regelmäßig vier und fünf.
const FAVORIT = {
  matchId: "m2",
  winner: { home: 1.2, draw: 7, away: 15 },
  correctScore: [
    [26, 60, 220, 900, 3000, 9000],
    [12, 22, 80, 340, 1200, 4000],
    [9, 15, 55, 240, 900, 3000],
    [9, 16, 60, 260, 1000, 3500],
    [12, 22, 85, 380, 1500, 5000],
    [20, 38, 150, 700, 2600, 9000],
  ],
  teamGoals: { home: [3, 5, 9], away: [1.5, 2.5, 5] },
  margin: { home: [0, 3, 7], away: [0, 3, 7] },
};

describe("Katalog", () => {
  it("jede Stufe ist vollständig beschrieben", () => {
    for (const s of MATRIX_STUFEN) {
      expect(s.key && s.label && s.desc).toBeTruthy();
      expect(s.desc.length).toBeGreaterThan(15);
    }
    expect(new Set(MATRIX_STUFEN.map((s) => s.key)).size).toBe(MATRIX_STUFEN.length);
  });

  it("eine unbekannte Stufe fällt auf die Vorgabe zurück", () => {
    expect(stufeVon("gibtsnicht").key).toBe(DEFAULT_MATRIX_STUFE);
    expect(stufeVon().key).toBe(DEFAULT_MATRIX_STUFE);
  });
});

describe("Das Raster wird abgelesen, nicht geraten", () => {
  it("erkennt die Größe des Quoten-Rasters", () => {
    expect(rasterMasse(AUSGEGLICHEN)).toEqual({ maxHeim: 5, maxGast: 5 });
  });

  it("kommt ohne Raster klar", () => {
    expect(rasterMasse({})).toEqual({ maxHeim: 0, maxGast: 0 });
    expect(rasterMasse(null)).toEqual({ maxHeim: 0, maxGast: 0 });
  });

  // ⚠️ Wächst die Quotenquelle, wächst die Matrix mit — ohne Codeänderung.
  it("ein größeres Raster wird auch größer gemessen", () => {
    const gross = { correctScore: Array.from({ length: 8 }, () => Array(7).fill(50)) };
    expect(rasterMasse(gross)).toEqual({ maxHeim: 7, maxGast: 6 });
  });
});

describe("Wahrscheinlichkeiten", () => {
  it("summieren sich auf 1 — die Marge ist herausgerechnet", () => {
    const p = wahrscheinlichkeiten(AUSGEGLICHEN);
    const summe = p.flat().reduce((s, x) => s + x, 0);
    expect(summe).toBeCloseTo(1, 6);
  });

  it("das wahrscheinlichste Feld ist das mit der kleinsten Quote", () => {
    const p = wahrscheinlichkeiten(AUSGEGLICHEN);
    let best = { p: -1 };
    p.forEach((zeile, h) => zeile.forEach((x, a) => { if (x > best.p) best = { p: x, h, a }; }));
    expect([best.h, best.a]).toEqual([1, 1]);   // Quote 7, die kleinste im Raster
  });
});

describe("🔴 Die Matrix ist ASYMMETRISCH — das ist der ganze Punkt", () => {
  it("beim klaren Favoriten wird die starke Seite weiter aufgezogen als die schwache", () => {
    const m = matrixMasse(FAVORIT, "auto");
    expect(m.maxHeim).toBeGreaterThan(m.maxGast);
  });

  it("im ausgeglichenen Spiel sind beide Seiten gleich groß", () => {
    const m = matrixMasse(AUSGEGLICHEN, "auto");
    expect(m.maxHeim).toBe(m.maxGast);
  });

  // 🔴 Der eigentliche Befund aus Andis Ansage, präzise formuliert: der
  // asymmetrische Zuschnitt erreicht seine Abdeckung mit WENIGER Feldern als
  // jedes Quadrat, das dasselbe schafft.
  //
  // ⚠️ Die erste Fassung dieses Tests verglich gegen ein festes 5×5-Quadrat und
  // behauptete „weniger Felder UND mehr Abdeckung". Das ist Unsinn: ein
  // kleineres Quadrat hat trivial weniger Felder. Der Test hat es beim ersten
  // Lauf gemeldet (30 statt ≤ 25) — die Behauptung war falsch, nicht der Code.
  it("erreicht seine Abdeckung mit weniger Feldern als jedes Quadrat", () => {
    const auto = matrixMasse(FAVORIT, "auto");
    const felderAuto = (auto.maxHeim + 1) * (auto.maxGast + 1);
    // Das KLEINSTE Quadrat, das mindestens dieselbe Abdeckung schafft.
    let kleinstesQuadrat = null;
    for (let n = 0; n <= 5; n++) {
      if (abdeckungVon(FAVORIT, n, n) >= auto.abgedeckt) { kleinstesQuadrat = (n + 1) ** 2; break; }
    }
    expect(kleinstesQuadrat).not.toBeNull();
    expect(felderAuto).toBeLessThan(kleinstesQuadrat);
  });

  // ⚠️ Hier stand ein Vergleich auto-vs-autoPlus. Die Stufe ist gestrichen
  // (Kopf der Datei: sie konnte mit einem 6x6-Raster nie etwas anderes
  // zeigen), und ein Test, der zweimal dasselbe vergleicht, prueft nichts.
  it("eine unbekannte Stufe faellt auf automatisch zurueck statt zu brechen", () => {
    expect(matrixMasse(FAVORIT, "autoPlus")).toEqual(matrixMasse(FAVORIT, "auto"));
  });

  it("mindestens 3×3 — eine Matrix aus zwei Feldern ist keine", () => {
    // Ein Spiel, in dem 0:0 fast sicher wäre: die Abdeckung stünde nach einem
    // Feld, die Matrix wäre trotzdem unbrauchbar.
    const stumpf = { correctScore: [[1.01, 900, 900], [900, 900, 900], [900, 900, 900]] };
    const m = matrixMasse(stumpf, "auto");
    expect(m.maxHeim).toBeGreaterThanOrEqual(2);
    expect(m.maxGast).toBeGreaterThanOrEqual(2);
  });
});

describe("Feste Stufen", () => {
  it("halten genau ihre Größe", () => {
    const m = matrixMasse(AUSGEGLICHEN, "3");
    expect(m).toMatchObject({ maxHeim: 3, maxGast: 3 });
  });

  // ⚠️ Die Datengrenze: das Raster ist 6×6. Eine Stufe darüber hinaus kann
  // die Matrix nicht anbieten — sie sagt es, statt leere Felder zu zeigen.
  it("werden vom Raster begrenzt, und das steht dran", () => {
    const klein = { correctScore: Array.from({ length: 4 }, () => Array(4).fill(20)) };
    const m = matrixMasse(klein, "5");
    expect(m.maxHeim).toBe(3);
    expect(m.begrenztVomRaster).toBe(true);
    expect(beschreibeMatrix(klein, "5").text).toMatch(/größer geht nicht/);
  });
});

describe("Die Felder", () => {
  it("jedes Feld trägt Endstand, Quote, Wahrscheinlichkeit und Punkte", () => {
    const m = matrixMasse(AUSGEGLICHEN, "3");
    const felder = matrixFelder(AUSGEGLICHEN, DEFAULT_RULES, m);
    expect(felder).toHaveLength(16);
    for (const f of felder) {
      expect(Number.isInteger(f.home)).toBe(true);
      expect(typeof f.quote).toBe("number");
      expect(f.punkte).toBeGreaterThan(0);
    }
  });

  // 🔴 Die Falle: in jedem Feld muss die Auszahlung DIESES Feldes stehen,
  // nicht die des gerade getippten Ergebnisses.
  it("jedes Feld zeigt seine EIGENE Auszahlung", () => {
    const m = matrixMasse(AUSGEGLICHEN, "3");
    const felder = matrixFelder(AUSGEGLICHEN, DEFAULT_RULES, m, { home: 1, away: 1 });
    const punkte = new Set(felder.map((f) => f.punkte));
    expect(punkte.size).toBeGreaterThan(4);
  });

  // Ein unwahrscheinlicher Endstand zahlt mehr als ein wahrscheinlicher —
  // sonst wäre die Matrix als Entscheidungshilfe wertlos.
  it("das seltenere Feld zahlt mehr", () => {
    const felder = matrixFelder(AUSGEGLICHEN, DEFAULT_RULES, matrixMasse(AUSGEGLICHEN, "3"));
    const haeufig = felder.find((f) => f.home === 1 && f.away === 1);
    const selten = felder.find((f) => f.home === 3 && f.away === 3);
    expect(selten.punkte).toBeGreaterThan(haeufig.punkte);
  });

  it("kommt ohne Snapshot klar", () => {
    expect(matrixFelder(null)).toEqual([]);
  });
});

describe("Klartext", () => {
  it("nennt Größe und Abdeckung", () => {
    const t = beschreibeMatrix(AUSGEGLICHEN, "3").text;
    expect(t).toMatch(/4×4/);
    expect(t).toMatch(/%/);
  });

  it("sagt es dazu, wenn die Matrix ungleich zugeschnitten ist", () => {
    expect(beschreibeMatrix(FAVORIT, "auto").text).toMatch(/ungleich/);
  });

  it("die Abdeckung stimmt mit `abdeckungVon` überein — eine Quelle", () => {
    const m = matrixMasse(AUSGEGLICHEN, "4");
    expect(m.abgedeckt).toBe(abdeckungVon(AUSGEGLICHEN, 4, 4));
  });
});

// ⚠️ Zwei Aussagen der Matrix-Beschriftung, die beide zu viel versprachen —
// gefunden am 25.08.2026 im Browser, beim Tipp auf 9:1.
describe("beschreibeMatrix sagt nicht mehr, als das Raster hält", () => {
  it("rundet nicht auf 100 % auf, solange etwas fehlt", () => {
    for (const stufe of MATRIX_STUFEN) {
      const m = matrixMasse(FAVORIT, stufe.key);
      const b = beschreibeMatrix(FAVORIT, stufe.key);
      if (m.abgedeckt < 0.9995) expect(b.prozent, stufe.key).toBeLessThan(100);
    }
  });

  it("100 steht nur bei voller Abdeckung", () => {
    for (const stufe of MATRIX_STUFEN) {
      const m = matrixMasse(AUSGEGLICHEN, stufe.key);
      const b = beschreibeMatrix(AUSGEGLICHEN, stufe.key);
      if (b.prozent === 100) expect(m.abgedeckt, stufe.key).toBeGreaterThanOrEqual(0.9995);
    }
  });

  // 🔴 Der Satz behauptete, es gebe für höhere Endstände keine Quote. Seit
  // `randquoten.js` (22.08.2026) gibt es sie — und sie zahlt.
  it("behauptet am Rasterrand nicht mehr, es gebe dort keine Quote", () => {
    for (const snap of [FAVORIT, AUSGEGLICHEN]) {
      for (const stufe of MATRIX_STUFEN) {
        const b = beschreibeMatrix(snap, stufe.key);
        expect(b.text).not.toContain("keine Quote");
      }
    }
  });
});

// 🔴 Andi, 25.08.2026: „können wir die option zu 1 einstellbar machen?" —
// das Raster darf über die Quotenquelle hinaus, bis zur Grenze des Steppers.
describe("Volles Raster bis zum Stepper (bisTipp)", () => {
  it("ohne die Option bleibt alles beim Alten", () => {
    const a = matrixMasse(FAVORIT, "auto");
    const b = matrixMasse(FAVORIT, "auto", { bisTipp: false });
    expect(b).toEqual(a);
  });

  // 🔴 DER FUND beim Prüfen im Browser: in der Stufe „automatisch" wirkte die
  // Option zuerst GAR NICHT. Die Randverteilung ist so lang wie das RASTER;
  // jenseits davon steht `undefined`, die Summe wächst nicht mehr, und der
  // Zuschnitt gab die Rasterkante zurück. Die Einstellung sah gesetzt aus und
  // tat nichts.
  it("mit der Option reicht auch die Stufe automatisch bis 9", () => {
    const m = matrixMasse(FAVORIT, "auto", { bisTipp: true });
    expect(m.maxHeim).toBe(9);
    expect(m.maxGast).toBe(9);
    expect(m.ueberRaster).toBe(true);
  });

  it("die festen Stufen bleiben feste Quadrate", () => {
    const m = matrixMasse(FAVORIT, "5", { bisTipp: true });
    expect(m.maxHeim).toBe(5);
    expect(m.maxGast).toBe(5);
  });

  it("jenseits des Rasters kommt eine markierte Quote statt gar keiner", () => {
    const masse = matrixMasse(FAVORIT, "auto", { bisTipp: true });
    const felder = matrixFelder(FAVORIT, DEFAULT_RULES, masse);
    const weit = felder.find((f) => f.home === 8 && f.away === 0);
    expect(weit).toBeTruthy();
    expect(weit.quote).toBeGreaterThan(0);
    expect(weit.geschaetzt).toBe(true);
    expect(weit.punkte).toBeGreaterThan(0);
  });

  it("innerhalb des Rasters bleibt die Quote unmarkiert", () => {
    const masse = matrixMasse(FAVORIT, "auto", { bisTipp: true });
    const felder = matrixFelder(FAVORIT, DEFAULT_RULES, masse);
    const nah = felder.find((f) => f.home === 1 && f.away === 1);
    expect(nah.geschaetzt).toBe(false);
  });

  // ⚠️ Ohne den Satz sähen die vielen gleichen Höchstwerte am Rand wie ein
  // Fehler aus statt wie der Deckel.
  it("die Beschriftung sagt, dass geschätzt wird", () => {
    const text = beschreibeMatrix(FAVORIT, "auto", { bisTipp: true }).text;
    expect(text).toMatch(/geschätzt/);
    expect(text).toMatch(/Deckel/);
    expect(beschreibeMatrix(FAVORIT, "auto").text).not.toMatch(/Deckel/);
  });
});

// 🔴 Andis TI2 („viele Stufen für die Matrixgröße, bis 10"), nachgeholt am
// 25.08.2026. Sie stand aus, weil das Quoten-Raster 6×6 ist und eine Stufe
// darüber von „5" nicht zu unterscheiden gewesen wäre — Dekoration. Der Grund
// ist entfallen: `randquoten.js` schreibt fort, und „volles Raster" reicht bis
// an die Grenze des Steppers.
describe("Stufen der Matrixgröße (TI2)", () => {
  it("es gibt eine Stufe bis 9 — das 10×10-Raster, das Andi meint", () => {
    const st = MATRIX_STUFEN.find((s) => s.key === "9");
    expect(st).toBeTruthy();
    expect(st.feste).toBe(9);
  });

  // ⚠️ Der Kern: eine Stufe, die dasselbe zeigt wie eine kleinere, ist keine
  // Stufe. Bei einem 6×6-Raster fallen „6", „8" und „9" alle auf 6×6 zurück.
  it("blendet Stufen aus, die auf dasselbe Raster zusammenfallen", () => {
    const eng = nutzbareStufen(FAVORIT, { bisTipp: false });
    const groessen = eng
      .filter((s) => s.feste != null)
      .map((s) => {
        const m = matrixMasse(FAVORIT, s.key, { bisTipp: false });
        return `${m.maxHeim}x${m.maxGast}`;
      });
    expect(new Set(groessen).size).toBe(groessen.length);
  });

  it("mit vollem Raster sind alle Stufen unterscheidbar", () => {
    const alle = nutzbareStufen(FAVORIT, { bisTipp: true });
    expect(alle.length).toBe(MATRIX_STUFEN.length);
    const groessen = alle
      .filter((s) => s.feste != null)
      .map((s) => {
        const m = matrixMasse(FAVORIT, s.key, { bisTipp: true });
        return `${m.maxHeim}x${m.maxGast}`;
      });
    expect(new Set(groessen).size).toBe(groessen.length);
  });

  // „automatisch" beantwortet eine andere Frage und muss immer wählbar sein.
  it("automatisch bleibt in jedem Fall dabei", () => {
    for (const bisTipp of [false, true]) {
      const st = nutzbareStufen(FAVORIT, { bisTipp });
      expect(st.some((s) => s.key === "auto"), String(bisTipp)).toBe(true);
    }
  });

  it("die Stufe 9 ergibt wirklich 10×10 Felder", () => {
    const m = matrixMasse(FAVORIT, "9", { bisTipp: true });
    expect(m.maxHeim).toBe(9);
    expect(m.maxGast).toBe(9);
    expect(matrixFelder(FAVORIT, DEFAULT_RULES, m)).toHaveLength(100);
  });
});
