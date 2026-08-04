import { describe, it, expect } from "vitest";
import { muenzStand } from "./muenzstand";
import { sanitizeRules } from "./engine";

// Zwei Spieltage derselben Liga: Spieltag 1 ist längst angepfiffen (Anpfiff
// in der Vergangenheit), Spieltag 2 liegt noch vor uns.
const JETZT = new Date("2026-08-10T00:00:00Z");

const spiel = (matchday, kickoffIso, id = `bl${matchday}-${kickoffIso}`) => ({
  id, wettbewerb: "bl", matchday, kickoff: kickoffIso, home: "A", away: "B",
});

const MATCHES = [
  // Spieltag 1 — vorbei, unbetippt gelassen (soll trotzdem ignoriert werden).
  spiel(1, "2026-08-01T18:00:00Z", "m1a"),
  spiel(1, "2026-08-02T18:00:00Z", "m1b"),
  // Spieltag 2 — noch offen, drei Spiele.
  spiel(2, "2026-08-15T18:00:00Z", "m2a"),
  spiel(2, "2026-08-16T18:00:00Z", "m2b"),
  spiel(2, "2026-08-17T18:00:00Z", "m2c"),
];

const RULES_EINSATZ = sanitizeRules({
  joker: { enabled: true, modus: "einsatz", einsatzProSpieltag: 100, minAnteilProSpiel: 0, maxAnteilProSpiel: 0.4 },
});

describe("muenzStand — null-Fälle", () => {
  it("Joker ausgeschaltet → null", () => {
    const rules = sanitizeRules({ joker: { enabled: false, modus: "einsatz" } });
    expect(muenzStand({ rules, matches: MATCHES, tips: [], userId: "u1", jetzt: JETZT })).toBeNull();
  });

  it("Modus einzel → null", () => {
    const rules = sanitizeRules({ joker: { enabled: true, modus: "einzel" } });
    expect(muenzStand({ rules, matches: MATCHES, tips: [], userId: "u1", jetzt: JETZT })).toBeNull();
  });

  it("Modus ranking → null", () => {
    const rules = sanitizeRules({ joker: { enabled: true, modus: "ranking" } });
    expect(muenzStand({ rules, matches: MATCHES, tips: [], userId: "u1", jetzt: JETZT })).toBeNull();
  });

  it("kein Spiel mehr offen (alle Anpfiffe in der Vergangenheit) → null", () => {
    const vorbei = new Date("2026-09-01T00:00:00Z"); // nach allen Anpfiffen
    expect(muenzStand({ rules: RULES_EINSATZ, matches: MATCHES, tips: [], userId: "u1", jetzt: vorbei })).toBeNull();
  });

  it("keine Spiele überhaupt → null", () => {
    expect(muenzStand({ rules: RULES_EINSATZ, matches: [], tips: [], userId: "u1", jetzt: JETZT })).toBeNull();
  });
});

describe("muenzStand — der gefundene Spieltag", () => {
  it("nimmt den Spieltag des frühesten OFFENEN Spiels, auch wenn ein früherer noch ungetippt ist", () => {
    const stand = muenzStand({ rules: RULES_EINSATZ, matches: MATCHES, tips: [], userId: "u1", jetzt: JETZT });
    expect(stand).not.toBeNull();
    expect(stand.spieltag).toEqual({ wettbewerb: "bl", matchday: 2 });
    expect(stand.spieleInPeriode).toBe(3);
  });
});

describe("muenzStand — verteilt zählt nur DIESEN Spieltag", () => {
  it("Tipps aus einem anderen Spieltag/anderer Runde fließen NICHT ein", () => {
    const tips = [
      // Spieltag 2 (der aktuelle) — dieser zählt.
      { user_id: "u1", match_id: "m2a", tip: { gewicht: 2 } },
      // Spieltag 1 (vorbei) — darf NICHT mitgezählt werden.
      { user_id: "u1", match_id: "m1a", tip: { gewicht: 5 } },
      // anderer Nutzer — darf NICHT mitgezählt werden.
      { user_id: "u2", match_id: "m2b", tip: { gewicht: 3 } },
    ];
    const stand = muenzStand({ rules: RULES_EINSATZ, matches: MATCHES, tips, userId: "u1", jetzt: JETZT });
    // Neutraler Einsatz bei 3 Spielen und 100 Münzen: 100/3. Gewicht 2 → 2 * 100/3.
    // `einsatzPlanung` rundet `verteilt` auf 2 Nachkommastellen.
    expect(stand.verteilt).toBeCloseTo((2 * 100) / 3, 2);
  });

  it("frei = budget − verteilt, nie negativ", () => {
    const tips = [
      { user_id: "u1", match_id: "m2a", tip: { gewicht: 10 } }, // weit über dem Budget
    ];
    const stand = muenzStand({ rules: RULES_EINSATZ, matches: MATCHES, tips, userId: "u1", jetzt: JETZT });
    expect(stand.budget).toBe(100);
    expect(stand.frei).toBeGreaterThanOrEqual(0);
    expect(stand.frei).toBe(Math.max(0, stand.budget - stand.verteilt));
  });

  it("ohne Tipps ist nichts verteilt", () => {
    const stand = muenzStand({ rules: RULES_EINSATZ, matches: MATCHES, tips: [], userId: "u1", jetzt: JETZT });
    expect(stand.verteilt).toBe(0);
    expect(stand.frei).toBe(stand.budget);
  });
});

describe("muenzStand — Münz-Takt (design/wettmodus.md 3)", () => {
  it("Vorgabe-Takt: aktiv, aber periodeLabel null — die Oberfläche zeigt weiter den Spieltag", () => {
    const stand = muenzStand({ rules: RULES_EINSATZ, matches: MATCHES, tips: [], userId: "u1", jetzt: JETZT });
    expect(stand.aktiv).toBe(true);
    expect(stand.periodeLabel).toBeNull();
    expect(stand.grund).toBeNull();
  });

  it("Takt 'alle 2 Spieltage': spieleInPeriode ist die Summe zweier Spieltage, Budget bleibt unverändert", () => {
    // Drei künftige Spieltage mit unterschiedlicher Spielzahl — bei n=2
    // fasst die erste Periode die ersten beiden zusammen (design/wettmodus.md
    // 3: „die Münzen müssen für zwei Spieltage reichen", das Budget selbst
    // ändert sich NICHT, nur wofür es reichen muss).
    const matches3 = [
      spiel(10, "2026-08-15T18:00:00Z", "p10a"),
      spiel(10, "2026-08-15T19:00:00Z", "p10b"),
      spiel(10, "2026-08-15T20:00:00Z", "p10c"),
      spiel(11, "2026-08-22T18:00:00Z", "p11a"),
      spiel(11, "2026-08-22T19:00:00Z", "p11b"),
      spiel(12, "2026-08-29T18:00:00Z", "p12a"),
      spiel(12, "2026-08-29T19:00:00Z", "p12b"),
      spiel(12, "2026-08-29T20:00:00Z", "p12c"),
      spiel(12, "2026-08-29T21:00:00Z", "p12d"),
    ];
    const rules = sanitizeRules({
      joker: {
        enabled: true, modus: "einsatz", einsatzTakt: "alleNSpieltage", einsatzTaktN: 2,
        einsatzProSpieltag: 100, minAnteilProSpiel: 0, maxAnteilProSpiel: 0.4,
      },
    });
    const stand = muenzStand({ rules, matches: matches3, tips: [], userId: "u1", jetzt: JETZT });
    expect(stand.aktiv).toBe(true);
    expect(stand.spieleInPeriode).toBe(5); // Spieltag 10 (3) + Spieltag 11 (2)
    expect(stand.periodeLabel).not.toBeNull();
    expect(stand.budget).toBe(100); // Budget bleibt das EINGESTELLTE — es muss nur weiter reichen.
  });

  it("Takt 'Saison-Fenster' mit dem gefundenen Spieltag außerhalb: aktiv false, Grund vorhanden, Budget 0", () => {
    // Drei künftige Spieltage, Fenster deckt nur den LETZTEN — der früheste
    // offene (Spieltag 10) liegt außerhalb.
    const matches3 = [
      spiel(10, "2026-08-15T18:00:00Z", "f10a"),
      spiel(11, "2026-08-22T18:00:00Z", "f11a"),
      spiel(12, "2026-08-29T18:00:00Z", "f12a"),
    ];
    const rules = sanitizeRules({
      joker: {
        enabled: true, modus: "einsatz", einsatzTakt: "phase",
        einsatzFenster: { phase: "schlussspurt", schlussLaenge: 1 },
        einsatzProSpieltag: 100,
      },
    });
    const stand = muenzStand({ rules, matches: matches3, tips: [], userId: "u1", jetzt: JETZT });
    expect(stand.aktiv).toBe(false);
    expect(typeof stand.grund).toBe("string");
    expect(stand.grund.length).toBeGreaterThan(0);
    expect(stand.budget).toBe(0);
    expect(stand.periodeLabel).toBeNull();
  });
});
