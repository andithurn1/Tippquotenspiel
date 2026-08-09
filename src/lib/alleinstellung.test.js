import { describe, it, expect } from "vitest";
import {
  DEFAULT_ALLEINSTELLUNG, sanitizeAlleinstellung, ebeneErreicht, grenzeFuer,
  alleinstellungBoni, beschreibeAlleinstellung,
} from "@/lib/alleinstellung";
import { DEFAULT_RULES, sanitizeRules, encodePreset, decodePreset } from "@/lib/engine";

// Fünf Tipper auf dasselbe Spiel; nur „u1" trifft den Abstand.
const eintraege = (ueberschreiben = []) => {
  const basis = [
    { key: "a", userId: "u1", matchId: "m1", ebene: "abstand", wert: 300, ersatz: false },
    { key: "b", userId: "u2", matchId: "m1", ebene: "tendenz", wert: 100, ersatz: false },
    { key: "c", userId: "u3", matchId: "m1", ebene: "keiner", wert: 0, ersatz: false },
    { key: "d", userId: "u4", matchId: "m1", ebene: "keiner", wert: 0, ersatz: false },
    { key: "e", userId: "u5", matchId: "m1", ebene: "tendenz", wert: 90, ersatz: false },
  ];
  return basis.map((b, i) => ({ ...b, ...(ueberschreiben[i] ?? {}) }));
};
const mit = (a) => ({ alleinstellung: { ...DEFAULT_ALLEINSTELLUNG, enabled: true, ...a } });

describe("Alleinstellung — wer allein richtig lag", () => {
  it("ist standardmäßig AUS und ändert dann gar nichts", () => {
    expect(DEFAULT_ALLEINSTELLUNG.enabled).toBe(false);
    expect(alleinstellungBoni(eintraege(), { alleinstellung: DEFAULT_ALLEINSTELLUNG }).size).toBe(0);
  });

  it("belohnt genau den, der als Einziger die Ebene erreicht", () => {
    const boni = alleinstellungBoni(eintraege(), mit({ ebene: "abstand", anteil: 1 }));
    expect([...boni.keys()]).toEqual(["a"]);
    expect(boni.get("a").zuschlag).toBe(300);   // Anteil 1 = Punkte noch einmal
  });

  it("zahlt nicht, wenn zwei dieselbe Ebene erreichen", () => {
    // 🔴 Der Kern der Mechanik: „allein" heißt allein.
    const zwei = eintraege([{}, { ebene: "abstand", wert: 200 }]);
    expect(alleinstellungBoni(zwei, mit({ ebene: "abstand" })).size).toBe(0);
  });

  it("Modus `wenige` lässt eine feste Zahl von Treffern zu", () => {
    const zwei = eintraege([{}, { ebene: "abstand", wert: 200 }]);
    const boni = alleinstellungBoni(zwei, mit({ ebene: "abstand", modus: "wenige", maxTipper: 2 }));
    expect([...boni.keys()].sort()).toEqual(["a", "b"]);
  });

  it("Modus `anteil` wächst mit der Rundengröße mit", () => {
    // 5 Tipper, 25 % → Grenze 1. Bei 20 Tippern wären es 5.
    expect(grenzeFuer(5, sanitizeAlleinstellung({ modus: "anteil", maxAnteil: 0.25 }))).toBe(1);
    expect(grenzeFuer(20, sanitizeAlleinstellung({ modus: "anteil", maxAnteil: 0.25 }))).toBe(5);
    // Nie 0 — sonst könnte in kleinen Runden NIEMAND den Bonus bekommen und
    // die Einstellung liefe still ins Leere.
    expect(grenzeFuer(2, sanitizeAlleinstellung({ modus: "anteil", maxAnteil: 0.05 }))).toBe(1);
  });

  it("🔴 greift erst ab `minTipper` — zu zweit ist man immer allein", () => {
    const zweiLeute = [
      { key: "a", userId: "u1", matchId: "m1", ebene: "abstand", wert: 300, ersatz: false },
      { key: "b", userId: "u2", matchId: "m1", ebene: "keiner", wert: 0, ersatz: false },
    ];
    expect(alleinstellungBoni(zweiLeute, mit({ minTipper: 3 })).size).toBe(0);
    expect(alleinstellungBoni(zweiLeute, mit({ minTipper: 2 })).size).toBe(1);
  });

  it("Ersatz-Tipps zählen standardmäßig weder als Treffer noch als Mitbewerber", () => {
    // Ein Ersatz-Tipp, der zufällig auch den Abstand trifft, darf den Bonus
    // eines anderen nicht kassieren — sonst entschiede die Kulanz der Runde.
    const mitErsatz = eintraege([{}, { ebene: "abstand", wert: 200, ersatz: true }]);
    const aus = alleinstellungBoni(mitErsatz, mit({ ebene: "abstand" }));
    expect([...aus.keys()]).toEqual(["a"]);
    const an = alleinstellungBoni(mitErsatz, mit({ ebene: "abstand", ersatzZaehlt: true }));
    expect(an.size).toBe(0);
  });

  it("feste Punkte statt Anteil", () => {
    const boni = alleinstellungBoni(eintraege(), mit({ art: "punkte", punkte: 150 }));
    expect(boni.get("a").zuschlag).toBe(150);
  });

  it("🔴 der eigene Deckel greift — sonst hebelt die Ebene `modCap` aus", () => {
    const boni = alleinstellungBoni(eintraege(), mit({ anteil: 3, maxZuschlag: 400 }));
    expect(boni.get("a").zuschlag).toBe(400);   // 900 wären es ungedeckelt
  });

  it("`maxProSaison` deckelt chronologisch, nicht zufällig", () => {
    const zweiSpiele = [
      ...eintraege(),
      { key: "f", userId: "u1", matchId: "m2", ebene: "abstand", wert: 500, ersatz: false },
      { key: "g", userId: "u2", matchId: "m2", ebene: "keiner", wert: 0, ersatz: false },
      { key: "h", userId: "u3", matchId: "m2", ebene: "keiner", wert: 0, ersatz: false },
    ];
    const boni = alleinstellungBoni(zweiSpiele, mit({ maxProSaison: 1 }));
    // Das FRÜHERE Spiel gewinnt, obwohl das spätere mehr gezahlt hätte.
    expect([...boni.keys()]).toEqual(["a"]);
  });

  it("feinere Ebene erfüllt die gröbere Anforderung", () => {
    expect(ebeneErreicht("exakt", "tendenz")).toBe(true);
    expect(ebeneErreicht("tendenz", "exakt")).toBe(false);
    expect(ebeneErreicht("keiner", "tendenz")).toBe(false);
  });
});

describe("Alleinstellung — Werte und Code", () => {
  it("beschneidet unsinnige Eingaben auf die Grenzen", () => {
    const a = sanitizeAlleinstellung({ enabled: true, anteil: 99, minTipper: 0, modus: "quatsch" });
    expect(a.anteil).toBeLessThanOrEqual(3);
    expect(a.minTipper).toBeGreaterThanOrEqual(2);
    expect(a.modus).toBe(DEFAULT_ALLEINSTELLUNG.modus);
  });

  it("reist im Creator-Code mit", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      alleinstellung: { enabled: true, ebene: "exakt", art: "punkte", punkte: 500, minTipper: 5 },
    });
    expect(sanitizeRules(decodePreset(encodePreset(rules)))).toEqual(rules);
  });

  it("die Vorschau rechnet in Punkte um, nicht in Fachbegriffe", () => {
    const text = beschreibeAlleinstellung(mit({ anteil: 1 }), 300);
    expect(text).toContain("aus 300 werden 600");
    expect(beschreibeAlleinstellung({ alleinstellung: DEFAULT_ALLEINSTELLUNG })).toContain("Aus");
  });
});
