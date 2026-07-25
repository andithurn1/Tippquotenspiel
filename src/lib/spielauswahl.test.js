import { describe, it, expect } from "vitest";
import {
  AUSWAHL_MODI, AUSWAHL_LIMITS, DEFAULT_SPIELE,
  sanitizeSpiele, passtSpiel, filterSpiele, zusammenfassung, beschreibeAuswahl,
  spieleProSpieltag,
} from "@/lib/spielauswahl";
import { DEFAULT_RULES, sanitizeRules, encodePreset, decodePreset } from "@/lib/engine";

// Ein kleiner Spielplan: 3 Spieltage à 3 Spiele.
const SPIELE = [
  { matchId: "m1", home: "A", away: "B", matchday: 1 },
  { matchId: "m2", home: "C", away: "D", matchday: 1 },
  { matchId: "m3", home: "E", away: "F", matchday: 1 },
  { matchId: "m4", home: "B", away: "C", matchday: 2 },
  { matchId: "m5", home: "D", away: "E", matchday: 2 },
  { matchId: "m6", home: "F", away: "A", matchday: 2 },
  { matchId: "m7", home: "A", away: "C", matchday: 3 },
  { matchId: "m8", home: "B", away: "D", matchday: 3 },
  { matchId: "m9", home: "E", away: "F", matchday: 3 },
];

describe("Katalog & Bereinigung", () => {
  it("die Modi sind vollständig beschrieben", () => {
    for (const m of AUSWAHL_MODI) expect(m.key && m.label && m.desc).toBeTruthy();
    expect(new Set(AUSWAHL_MODI.map((m) => m.key)).size).toBe(AUSWAHL_MODI.length);
  });

  it("Unsinn wird auf die Standardauswahl zurückgeholt", () => {
    expect(sanitizeSpiele({ modus: "hack", teams: "nein", matchIds: 5 })).toEqual(DEFAULT_SPIELE);
    expect(sanitizeSpiele()).toEqual(DEFAULT_SPIELE);
  });

  it("ein Modus ohne seine Daten fällt auf „alle“ zurück", () => {
    // Sonst wäre die Auswahl eine, die JEDES Spiel wegfiltert — das ist nie
    // gewollt und würde die Runde still leer laufen lassen.
    expect(sanitizeSpiele({ modus: "teams", teams: ["A"] }).modus).toBe("alle");
    expect(sanitizeSpiele({ modus: "liste", matchIds: [] }).modus).toBe("alle");
    expect(sanitizeSpiele({ modus: "teams", teams: ["A", "B"] }).modus).toBe("teams");
  });

  it("Vereine werden entdoppelt, getrimmt und begrenzt", () => {
    const s = sanitizeSpiele({ modus: "teams", teams: [" A ", "A", "B", "", null, 7] });
    expect(s.teams).toEqual(["A", "B"]);
    const viele = sanitizeSpiele({
      modus: "teams",
      teams: Array.from({ length: 99 }, (_, i) => `T${i}`),
    });
    expect(viele.teams.length).toBe(AUSWAHL_LIMITS.maxTeams);
  });

  it("vertauschte Spieltag-Grenzen werden gedreht, nicht verworfen", () => {
    const s = sanitizeSpiele({ spieltagVon: 20, spieltagBis: 5 });
    expect(s.spieltagVon).toBe(5);
    expect(s.spieltagBis).toBe(20);
  });

  it("„nicht gesetzt“ bleibt null und wird nicht zu Spieltag 1", () => {
    // Number(null) ist 0 und würde auf den Mindestwert hochgeklemmt — aus
    // „keine Grenze“ wäre „ab Spieltag 1“ geworden.
    const s = sanitizeSpiele({ spieltagVon: null, spieltagBis: undefined });
    expect(s.spieltagVon).toBeNull();
    expect(s.spieltagBis).toBeNull();
  });
});

describe("Filtern", () => {
  it("„alle“ lässt alles durch", () => {
    expect(filterSpiele(SPIELE, DEFAULT_SPIELE)).toHaveLength(SPIELE.length);
  });

  it("Vereins-Auswahl: ein Spiel zählt, sobald EINER der Vereine dabei ist", () => {
    const gewaehlt = filterSpiele(SPIELE, { modus: "teams", teams: ["A", "B"] });
    expect(gewaehlt.map((m) => m.matchId)).toEqual(["m1", "m4", "m6", "m7", "m8"]);
  });

  it("Liste: genau die genannten Begegnungen", () => {
    const gewaehlt = filterSpiele(SPIELE, { modus: "liste", matchIds: ["m2", "m9"] });
    expect(gewaehlt.map((m) => m.matchId)).toEqual(["m2", "m9"]);
  });

  it("der Spieltag-Bereich gilt zusätzlich, in JEDEM Modus", () => {
    const nurST2 = filterSpiele(SPIELE, { spieltagVon: 2, spieltagBis: 2 });
    expect(nurST2).toHaveLength(3);
    const kombiniert = filterSpiele(SPIELE, {
      modus: "teams", teams: ["A", "B"], spieltagVon: 3,
    });
    expect(kombiniert.map((m) => m.matchId)).toEqual(["m7", "m8"]);
  });

  it("kein Spiel ist kein gültiges Spiel", () => {
    expect(passtSpiel(null)).toBe(false);
  });
});

describe("Zusammenfassung — Zahlen statt Behauptungen", () => {
  it("zählt Spiele und Spieltage", () => {
    const z = zusammenfassung(SPIELE, DEFAULT_SPIELE);
    expect(z.spiele).toBe(9);
    expect(z.spieltage).toBe(3);
    expect(z.proSpieltag).toBe(3);
    expect(z.leer).toBe(false);
    expect(z.duenn).toBe(false);
  });

  it("warnt, wenn pro Spieltag kaum etwas übrig bleibt", () => {
    // Genau der Fall, den man beim Einstellen nicht bemerkt: „nur die Top 2"
    // lässt oft nur ein Spiel je Spieltag stehen.
    const z = zusammenfassung(SPIELE, { modus: "teams", teams: ["A", "C"] });
    expect(z.duenn).toBe(true);
  });

  it("erkennt eine Auswahl, die nichts übrig lässt", () => {
    const z = zusammenfassung(SPIELE, { modus: "liste", matchIds: ["gibtsnicht"] });
    expect(z.leer).toBe(true);
    expect(z.spiele).toBe(0);
  });
});

describe("Spiele je Spieltag — die Spanne statt einer erfundenen Zahl", () => {
  it("alle 18 Vereine ergeben die vollen 9 Spiele", () => {
    expect(spieleProSpieltag(18, 18)).toEqual({ min: 9, max: 9 });
  });

  it("zwei Vereine ergeben 1 bis 2 Spiele — sichtbar zu dünn", () => {
    expect(spieleProSpieltag(2, 18)).toEqual({ min: 1, max: 2 });
  });

  it("die Obergrenze kann nie mehr sein als der Spieltag hergibt", () => {
    expect(spieleProSpieltag(14, 18).max).toBe(9);
  });

  it("keine Auswahl, keine Spiele", () => {
    expect(spieleProSpieltag(0, 18)).toEqual({ min: 0, max: 0 });
  });
});

describe("Beschreibung", () => {
  it("nennt Modus und Zeitraum", () => {
    expect(beschreibeAuswahl({ modus: "teams", teams: ["A", "B"], spieltagVon: 5, spieltagBis: 12 }))
      .toBe("nur Spiele von 2 Vereinen, Spieltag 5 bis 12");
    expect(beschreibeAuswahl(DEFAULT_SPIELE)).toBe("alle Spiele");
  });
});

describe("Die Auswahl reist im Creator-Code mit", () => {
  it("ist Teil des Regelwerks", () => {
    expect(DEFAULT_RULES.spiele).toEqual(DEFAULT_SPIELE);
  });

  it("übersteht encode → decode → sanitize unverändert", () => {
    // Das ist der eigentliche Zweck: ein Creator teilt nicht nur seine
    // Wertung, sondern seine ganze Runden-Idee.
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      spiele: { modus: "teams", teams: ["Bayern", "Dortmund", "Leipzig"], spieltagVon: 1, spieltagBis: 17 },
    });
    expect(sanitizeRules(decodePreset(encodePreset(rules)))).toEqual(rules);
  });
});
