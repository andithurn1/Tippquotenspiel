import { describe, it, expect } from "vitest";
import {
  DEFAULT_WEITERKOMMEN, WEITERKOMMEN_LIMITS, sanitizeWeiterkommen,
  tippbar, braucht90MinutenHinweis, HINWEIS_90, scoreWeiterkommen,
} from "./weiterkommen";
import { DEFAULT_RULES } from "./engine";

const AN = {
  ...DEFAULT_RULES,
  markets: { ...DEFAULT_RULES.markets, weiterkommen: { enabled: true, gewicht: 1 } },
};
const SNAP = { qualify: { home: 1.4, away: 2.9 } };
const KO = { phase: "halbfinale" };
const LIGA = { phase: "liga" };

describe("Die Einstellung", () => {
  // 🔴 Ein neuer Markt, der in seiner Vorgabe AN wäre, verschiebt jede
  // bestehende Runde still — und zwar in der Wertung.
  it("🔴 ist standardmäßig AUS", () => {
    expect(DEFAULT_WEITERKOMMEN.enabled).toBe(false);
  });

  it("säubert Unsinn und hält die Grenzen", () => {
    expect(sanitizeWeiterkommen(null)).toEqual(DEFAULT_WEITERKOMMEN);
    expect(sanitizeWeiterkommen({ enabled: "ja" }).enabled).toBe(false);
    expect(sanitizeWeiterkommen({ gewicht: 99 }).gewicht).toBe(WEITERKOMMEN_LIMITS.gewicht.max);
    expect(sanitizeWeiterkommen({ gewicht: "viel" }).gewicht).toBe(1);
  });
});

describe("Gibt es den Tipp für dieses Spiel?", () => {
  it("bei eingeschaltetem Markt, K.-o.-Spiel und vorhandener Quote: ja", () => {
    expect(tippbar(KO, SNAP, AN)).toBe(true);
  });

  it("in einem Ligaspiel nicht", () => {
    expect(tippbar(LIGA, SNAP, AN)).toBe(false);
  });

  it("bei ausgeschaltetem Markt nicht", () => {
    expect(tippbar(KO, SNAP, DEFAULT_RULES)).toBe(false);
  });

  // 🔴 Der wichtigste Fall. „Wer kommt weiter" schließt das Elfmeterschießen
  // immer ein — eine selbst gebastelte Quote dafür gäbe es nirgends zu
  // kaufen, und geschätzt wäre sie eine erfundene Zahl in einer Wertung, die
  // sonst nur Marktpreise benutzt.
  it("🔴 ohne Marktquote gibt es den Tipp NICHT — kein Rückfall, keine Schätzung", () => {
    expect(tippbar(KO, {}, AN)).toBe(false);
    expect(tippbar(KO, { qualify: {} }, AN)).toBe(false);
    expect(tippbar(KO, { qualify: { home: 1.4 } }, AN)).toBe(false);
    // Eine Quote von 1 oder darunter ist kein Preis, sondern ein Fehler.
    expect(tippbar(KO, { qualify: { home: 1, away: 1 } }, AN)).toBe(false);
  });

  it("verträgt fehlende Angaben", () => {
    expect(tippbar(null, null, null)).toBe(false);
  });
});

describe("Der 90-Minuten-Hinweis", () => {
  // ⚠️ Andis ausdrückliche Bedingung: bei Nicht-K.-o.-Spielen steht er NICHT
  // da. Ein Satz „gilt nach 90 Minuten" an einem Bundesligaspiel erklärt
  // nichts und macht nur misstrauisch — dort gibt es keine Verlängerung.
  it("⚠️ steht nur bei K.-o.-Spielen", () => {
    expect(braucht90MinutenHinweis(KO)).toBe(true);
    expect(braucht90MinutenHinweis(LIGA)).toBe(false);
    expect(braucht90MinutenHinweis({})).toBe(false);
  });

  it("nennt beides: Verlängerung UND Elfmeterschießen", () => {
    expect(HINWEIS_90).toMatch(/90/);
    expect(HINWEIS_90).toMatch(/Verlängerung/);
    expect(HINWEIS_90).toMatch(/Elfmeter/);
  });
});

describe("Die Wertung", () => {
  it("zahlt den Gewinn bei richtiger Seite", () => {
    expect(scoreWeiterkommen({ weiter: "home" }, { weiter: "home" }, SNAP, AN))
      .toBeCloseTo(0.4, 10);
    expect(scoreWeiterkommen({ weiter: "away" }, { weiter: "away" }, SNAP, AN))
      .toBeCloseTo(1.9, 10);
  });

  // ⚠️ Kein Abzug bei falsch: der Ergebnis-Teil hat dafür schon
  // `wrongPenalty`. Ein zweiter Abzug an derselben Partie wäre eine doppelte
  // Strafe für einen Tipp.
  it("⚠️ falsch getippt kostet nichts extra", () => {
    expect(scoreWeiterkommen({ weiter: "home" }, { weiter: "away" }, SNAP, AN)).toBe(0);
  });

  it("ohne Tipp oder ohne Ergebnis gibt es nichts", () => {
    expect(scoreWeiterkommen({}, { weiter: "home" }, SNAP, AN)).toBe(0);
    expect(scoreWeiterkommen({ weiter: "home" }, {}, SNAP, AN)).toBe(0);
    expect(scoreWeiterkommen({ weiter: "beide" }, { weiter: "home" }, SNAP, AN)).toBe(0);
  });

  it("bei ausgeschaltetem Markt zahlt nichts", () => {
    expect(scoreWeiterkommen({ weiter: "home" }, { weiter: "home" }, SNAP, DEFAULT_RULES)).toBe(0);
  });

  it("das Gewicht wirkt", () => {
    const doppelt = {
      ...AN,
      markets: { ...AN.markets, weiterkommen: { enabled: true, gewicht: 2 } },
    };
    expect(scoreWeiterkommen({ weiter: "home" }, { weiter: "home" }, SNAP, doppelt))
      .toBeCloseTo(0.8, 10);
  });

  it("stürzt bei Unsinn nicht ab", () => {
    expect(() => scoreWeiterkommen(null, null, null, null)).not.toThrow();
    expect(scoreWeiterkommen(null, null, null, null)).toBe(0);
  });
});
