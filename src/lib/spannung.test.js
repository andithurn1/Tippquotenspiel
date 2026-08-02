import { describe, it, expect } from "vitest";
import {
  SPANNUNG_BEZUG, SPANNUNG_ART, SPANNUNG_LIMITS, DEFAULT_SPANNUNG,
  sanitizeSpannung, spannungVon, beschreibeSpannung,
} from "./spannung";

// ── Kataloge ────────────────────────────────────────────────

describe("Kataloge", () => {
  it("jeder Katalog-Eintrag hat key, label und desc, Keys sind eindeutig", () => {
    for (const liste of [SPANNUNG_BEZUG, SPANNUNG_ART]) {
      for (const e of liste) expect(e.key && e.label && e.desc).toBeTruthy();
      expect(new Set(liste.map((e) => e.key)).size).toBe(liste.length);
    }
  });

  it("Abschnitt 2b nennt genau vier bezug-Werte", () => {
    expect(SPANNUNG_BEZUG.map((b) => b.key).sort()).toEqual([
      "ersterLetzter", "ersterZweiter", "feld", "spitzengruppe",
    ]);
  });

  it("Abschnitt 2b nennt genau zwei art-Werte, relativ ist die Vorgabe", () => {
    expect(SPANNUNG_ART.map((a) => a.key).sort()).toEqual(["absolut", "relativ"]);
    expect(DEFAULT_SPANNUNG.art).toBe("relativ");
  });
});

// ── sanitizeSpannung ────────────────────────────────────────

describe("sanitizeSpannung", () => {
  it("liefert die Vorgabe bei Unsinn", () => {
    expect(sanitizeSpannung(undefined)).toEqual(DEFAULT_SPANNUNG);
    expect(sanitizeSpannung(null)).toEqual(DEFAULT_SPANNUNG);
    expect(sanitizeSpannung("quatsch")).toEqual(DEFAULT_SPANNUNG);
    expect(sanitizeSpannung({})).toEqual(DEFAULT_SPANNUNG);
  });

  it("unbekannter bezug/art fällt auf die Vorgabe zurück", () => {
    const r = sanitizeSpannung({ bezug: "voodoo", art: "voodoo" });
    expect(r.bezug).toBe(DEFAULT_SPANNUNG.bezug);
    expect(r.art).toBe(DEFAULT_SPANNUNG.art);
  });

  it("gewichtung und plaetze werden auf SPANNUNG_LIMITS beschnitten", () => {
    const r = sanitizeSpannung({ gewichtung: 99, plaetze: 999 });
    expect(r.gewichtung).toBe(SPANNUNG_LIMITS.gewichtung.max);
    expect(r.plaetze).toBe(SPANNUNG_LIMITS.plaetze.max);
  });

  it("gültige Werte bleiben erhalten", () => {
    const r = sanitizeSpannung({ bezug: "feld", art: "absolut", gewichtung: 0.3, plaetze: 5 });
    expect(r).toEqual({ bezug: "feld", art: "absolut", gewichtung: 0.3, plaetze: 5 });
  });
});

// ── spannungVon ──────────────────────────────────────────────

describe("spannungVon", () => {
  // Beispiel-Board für Pflichttest 1: gleichmäßig gestaffelt, 100/80/60/40.
  const board = [
    { userId: "a", total: 100 },
    { userId: "b", total: 80 },
    { userId: "c", total: 60 },
    { userId: "d", total: 40 },
  ];

  it("Pflichttest 1 — alle vier bezug-Werte, relativ und absolut", () => {
    for (const bezug of SPANNUNG_BEZUG.map((b) => b.key)) {
      for (const art of SPANNUNG_ART.map((a) => a.key)) {
        const wert = spannungVon(board, { bezug, art });
        expect(Number.isFinite(wert), `${bezug}/${art}`).toBe(true);
        if (art === "relativ") {
          expect(wert, `${bezug}/relativ liegt in [0,1]`).toBeGreaterThanOrEqual(0);
          expect(wert, `${bezug}/relativ liegt in [0,1]`).toBeLessThanOrEqual(1);
        } else {
          expect(wert, `${bezug}/absolut ist nicht negativ`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("ersterZweiter: relativ ist exakt der Anteil, absolut exakt der Punkte-Abstand", () => {
    expect(spannungVon(board, { bezug: "ersterZweiter", art: "relativ" })).toBeCloseTo(0.8, 10);
    expect(spannungVon(board, { bezug: "ersterZweiter", art: "absolut" })).toBe(20);
  });

  it("ersterLetzter: relativ ist exakt der Anteil, absolut exakt der Punkte-Abstand", () => {
    expect(spannungVon(board, { bezug: "ersterLetzter", art: "relativ" })).toBeCloseTo(0.4, 10);
    expect(spannungVon(board, { bezug: "ersterLetzter", art: "absolut" })).toBe(60);
  });

  it("Pflichttest 2 — gewichtung 0 gegen 1 ergibt messbar verschiedene Werte (feld)", () => {
    // Asymmetrisches Board: Platz 2 liegt nah an der Spitze, der Rest weit
    // weg — nur so schlägt eine Verschiebung des Gewichts zur Spitze durch.
    const asymm = [
      { userId: "a", total: 100 },
      { userId: "b", total: 95 },
      { userId: "c", total: 50 },
      { userId: "d", total: 10 },
    ];
    const ohneGewichtung = spannungVon(asymm, { bezug: "feld", art: "relativ", gewichtung: 0 });
    const volleGewichtung = spannungVon(asymm, { bezug: "feld", art: "relativ", gewichtung: 1 });
    expect(Math.abs(volleGewichtung - ohneGewichtung)).toBeGreaterThan(0.01);
    // Volle Gewichtung hängt sich stärker an Platz 2 (nah an der Spitze) —
    // deshalb höher als die ungewichtete Mittelung über das ganze Feld.
    expect(volleGewichtung).toBeGreaterThan(ohneGewichtung);
  });

  it("gewichtung hat bei ersterZweiter/ersterLetzter keinen Einfluss (nur ein anderer Spieler)", () => {
    const g0 = spannungVon(board, { bezug: "ersterZweiter", art: "relativ", gewichtung: 0 });
    const g1 = spannungVon(board, { bezug: "ersterZweiter", art: "relativ", gewichtung: 1 });
    expect(g0).toBe(g1);
  });

  it("Pflichttest 3 — ein enges Feld ergibt eine höhere Spannung als ein weites (relativ)", () => {
    const eng = [
      { userId: "a", total: 100 },
      { userId: "b", total: 96 },
      { userId: "c", total: 92 },
      { userId: "d", total: 90 },
    ];
    const weit = [
      { userId: "a", total: 100 },
      { userId: "b", total: 60 },
      { userId: "c", total: 20 },
      { userId: "d", total: 5 },
    ];
    const spannungEng = spannungVon(eng, { bezug: "feld", art: "relativ" });
    const spannungWeit = spannungVon(weit, { bezug: "feld", art: "relativ" });
    expect(spannungEng).toBeGreaterThan(spannungWeit);
  });

  it("Pflichttest 4 — leeres Board liefert den dokumentierten Wert, nicht NaN", () => {
    expect(spannungVon([], { art: "relativ" })).toBe(1);
    expect(spannungVon([], { art: "absolut" })).toBe(0);
    expect(spannungVon(undefined, { art: "relativ" })).toBe(1);
  });

  it("Pflichttest 4 — einelementiges Board liefert den dokumentierten Wert, nicht NaN", () => {
    const einer = [{ userId: "a", total: 42 }];
    expect(spannungVon(einer, { art: "relativ" })).toBe(1);
    expect(spannungVon(einer, { art: "absolut" })).toBe(0);
  });

  it("spitzengruppe ohne 'anderen' Spieler (plaetze: 2, aber nur ein Nicht-Erster) liefert denselben definierten Wert", () => {
    // plaetze wird auf SPANNUNG_LIMITS.plaetze.min = 2 beschnitten — mit nur
    // zwei Spielern insgesamt bleibt trotzdem genau einer als „anderer" übrig,
    // das ist regulär (kein Degenerationsfall). Der echte Degenerationsfall
    // ist ein leeres/einelementiges Board (siehe Pflichttest 4).
    const zwei = [{ userId: "a", total: 10 }, { userId: "b", total: 5 }];
    expect(Number.isFinite(spannungVon(zwei, { bezug: "spitzengruppe", plaetze: 2, art: "relativ" }))).toBe(true);
  });
});

// ── beschreibeSpannung ──────────────────────────────────────

describe("beschreibeSpannung", () => {
  it("liefert einen nicht-leeren Satz", () => {
    const text = beschreibeSpannung({ bezug: "ersterZweiter", art: "relativ" });
    expect(typeof text).toBe("string");
    expect(text.trim()).not.toBe("");
  });

  it("nennt das Label des bezug", () => {
    const text = beschreibeSpannung({ bezug: "feld" });
    expect(text).toContain("Ganzes Feld");
  });
});
