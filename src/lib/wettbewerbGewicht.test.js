import { describe, it, expect } from "vitest";
import {
  DEFAULT_WETTBEWERBE, WETTBEWERB_LIMITS, sanitizeWettbewerbe,
  wettbewerbAufschlag, anteile, anteilHinweis, maxWettbewerbAufschlag,
  beschreibeWettbewerbe,
} from "@/lib/wettbewerbGewicht";
import { DEFAULT_RULES, sanitizeRules, totalModifier, maxTotalModifier } from "@/lib/engine";

const AN = (extra = {}) => sanitizeRules({
  ...DEFAULT_RULES, modCap: 4,
  wettbewerbe: { enabled: true, aufschlaege: { cl: 0.4 }, phasenStufe: 0.1, ...extra },
});

const spiel = (wettbewerb, phase = "liga", n = 1) =>
  Array.from({ length: n }, (_, i) => ({ matchId: `${wettbewerb}-${phase}-${i}`, wettbewerb, phase }));

describe("Bereinigung", () => {
  it("Unsinn wird auf den Standard zurückgeholt", () => {
    expect(sanitizeWettbewerbe({ enabled: "ja", aufschlaege: 5 })).toEqual(DEFAULT_WETTBEWERBE);
    expect(sanitizeWettbewerbe()).toEqual(DEFAULT_WETTBEWERBE);
  });

  it("neutrale Einträge fliegen raus — das Regelwerk bleibt klein", () => {
    const s = sanitizeWettbewerbe({ enabled: true, aufschlaege: { bl: 0, cl: 0.3 } });
    expect(s.aufschlaege).toEqual({ cl: 0.3 });
  });

  it("ohne irgendein Gewicht ist es aus, statt eine stumme Regel zu sein", () => {
    expect(sanitizeWettbewerbe({ enabled: true, aufschlaege: {}, phasenStufe: 0 }).enabled).toBe(false);
    expect(sanitizeWettbewerbe({ enabled: true, phasenStufe: 0.1 }).enabled).toBe(true);
  });

  it("Werte werden auf die Grenzen beschnitten", () => {
    const s = sanitizeWettbewerbe({ enabled: true, aufschlaege: { cl: 99 }, phasenStufe: 99 });
    expect(s.aufschlaege.cl).toBe(WETTBEWERB_LIMITS.aufschlag.max);
    expect(s.phasenStufe).toBe(WETTBEWERB_LIMITS.phasenStufe.max);
  });

  it("unbekannte Wettbewerbe werden nicht übernommen", () => {
    expect(sanitizeWettbewerbe({ enabled: true, aufschlaege: { erfunden: 0.5, cl: 0.2 } }).aufschlaege)
      .toEqual({ cl: 0.2 });
  });
});

describe("Aufschlag eines Spiels", () => {
  const rules = AN();

  it("Wettbewerb und K.-o.-Runde addieren sich", () => {
    expect(wettbewerbAufschlag({ wettbewerb: "cl", phase: "liga" }, rules)).toBeCloseTo(0.4, 3);
    expect(wettbewerbAufschlag({ wettbewerb: "cl", phase: "viertelfinale" }, rules)).toBeCloseTo(0.6, 3);
    expect(wettbewerbAufschlag({ wettbewerb: "cl", phase: "finale" }, rules)).toBeCloseTo(0.8, 3);
  });

  it("je höher die Runde, desto mehr — ohne dass jede einzeln eingestellt wird", () => {
    const stufen = ["achtelfinale", "viertelfinale", "halbfinale", "finale"]
      .map((phase) => wettbewerbAufschlag({ wettbewerb: "cl", phase }, rules));
    for (let i = 1; i < stufen.length; i++) expect(stufen[i]).toBeGreaterThan(stufen[i - 1]);
  });

  it("ein Wettbewerb ohne Aufschlag bleibt neutral", () => {
    expect(wettbewerbAufschlag({ wettbewerb: "bl", phase: "liga" }, rules)).toBe(0);
  });

  it("ausgeschaltet ist ein No-op", () => {
    expect(wettbewerbAufschlag({ wettbewerb: "cl", phase: "finale" }, DEFAULT_RULES)).toBe(0);
  });
});

describe("Derselbe additive Topf wie Derby und Big Game", () => {
  it("wird ADDIERT, nicht multipliziert", () => {
    const rules = sanitizeRules({
      ...AN(),
      teamMods: { derbyFaktor: 1.5, teams: {} },
      bigGame: { enabled: true, aufschlag: 0.5, minSpannung: 0.35 },
    });
    const snap = { home: "A", away: "B", wettbewerb: "cl", phase: "halbfinale", derby: true, bigGameWert: 0.9 };
    // 1 + 0,5 (Derby) + 0,5 (Big Game) + 0,7 (CL 0,4 + 3×0,1) = 2,7
    // multiplikativ wären es 1,5 × 1,5 × 1,7 = 3,83
    expect(totalModifier({}, snap, rules).faktor).toBeCloseTo(2.7, 2);
  });

  it("der Deckel greift auch hier", () => {
    const rules = sanitizeRules({ ...AN({ aufschlaege: { cl: 1.5 } }), modCap: 1.5 });
    const t = totalModifier({}, { wettbewerb: "cl", phase: "finale" }, rules);
    expect(t.faktor).toBeCloseTo(1.5, 2);
    expect(t.gedeckelt).toBe(true);
  });

  it("der Maximalfall rechnet ihn mit ein", () => {
    expect(maxTotalModifier(AN())).toBeGreaterThan(maxTotalModifier(sanitizeRules({ ...DEFAULT_RULES, modCap: 4 })));
    expect(maxWettbewerbAufschlag(AN())).toBeCloseTo(0.8, 2);   // 0,4 + 4×0,1
    expect(maxWettbewerbAufschlag(DEFAULT_RULES)).toBe(0);
  });
});

describe("Anteile — die eigentliche Rückmeldung", () => {
  // 306 Bundesliga-Spiele gegen 144 CL-Spiele: genau der Fall, in dem der
  // Faktor etwas anderes suggeriert als das Ergebnis.
  const matches = [...spiel("bl", "liga", 306), ...spiel("cl", "liga", 144)];

  it("ohne Gewichte entspricht der Anteil der Spielmenge", () => {
    const a = anteile(matches, DEFAULT_RULES);
    const bl = a.find((x) => x.key === "bl");
    expect(bl.anteil).toBeCloseTo(bl.anteilRoh, 5);
    expect(bl.anteil).toBeCloseTo(306 / 450, 3);
  });

  it("„×1,5 auf die CL“ macht sie trotzdem NICHT zur wichtigeren Hälfte", () => {
    // Das ist die Falle, wegen der es diese Funktion gibt.
    const rules = AN({ aufschlaege: { cl: 0.5 }, phasenStufe: 0 });
    const a = anteile(matches, rules);
    const cl = a.find((x) => x.key === "cl");
    const bl = a.find((x) => x.key === "bl");
    expect(cl.schnittFaktor).toBeCloseTo(1.5, 2);
    expect(cl.anteil).toBeLessThan(0.5);
    expect(bl.anteil).toBeGreaterThan(cl.anteil);
  });

  it("das Gewicht verschiebt den Anteil, aber nachvollziehbar", () => {
    const rules = AN({ aufschlaege: { cl: 0.5 }, phasenStufe: 0 });
    const cl = anteile(matches, rules).find((x) => x.key === "cl");
    const clRoh = anteile(matches, DEFAULT_RULES).find((x) => x.key === "cl");
    expect(cl.anteil).toBeGreaterThan(clRoh.anteil);
  });

  it("Anteile summieren sich auf 1", () => {
    const summe = anteile(matches, AN()).reduce((s, x) => s + x.anteil, 0);
    expect(summe).toBeCloseTo(1, 6);
  });

  it("K.-o.-Spiele im selben Wettbewerb heben dessen Schnitt", () => {
    // Der Vergleich gegen eine reine Ligaphase ist die Aussage — der absolute
    // Schnitt bewegt sich bei 100 Ligaspielen plus EINEM Finale kaum.
    const nurLiga = anteile(spiel("cl", "liga", 10), AN()).find((x) => x.key === "cl");
    const mitKo = anteile(
      [...spiel("cl", "liga", 10), ...spiel("cl", "finale", 2)], AN(),
    ).find((x) => x.key === "cl");
    expect(mitKo.schnittFaktor).toBeGreaterThan(nurLiga.schnittFaktor);
  });

  it("leere Eingabe ergibt eine leere Liste", () => {
    expect(anteile([], AN())).toEqual([]);
  });
});

describe("Hinweis, wenn Faktor und Anteil auseinanderlaufen", () => {
  it("nennt die Falle beim Namen", () => {
    const matches = [...spiel("bl", "liga", 306), ...spiel("cl", "liga", 144)];
    const text = anteilHinweis(anteile(matches, AN({ aufschlaege: { cl: 0.5 }, phasenStufe: 0 })));
    expect(text).toContain("Champions League");
    expect(text).toContain("mehr Spiele");
  });

  it("schweigt, wenn der stärkste auch der größte ist", () => {
    const matches = [...spiel("bl", "liga", 300), ...spiel("cl", "liga", 10)];
    expect(anteilHinweis(anteile(matches, AN({ aufschlaege: { bl: 0.5 }, phasenStufe: 0 })))).toBe("");
  });

  it("schweigt bei nur einem Wettbewerb", () => {
    expect(anteilHinweis(anteile(spiel("bl", "liga", 10), AN()))).toBe("");
  });
});

describe("Im Regelwerk und im Creator-Code", () => {
  it("ist Teil des Regelwerks", () => {
    expect(DEFAULT_RULES.wettbewerbe).toEqual(DEFAULT_WETTBEWERBE);
  });

  it("übersteht sanitizeRules unverändert", () => {
    const r = AN();
    expect(sanitizeRules(r)).toEqual(r);
  });

  it("beschreibt sich in einem Satz", () => {
    expect(beschreibeWettbewerbe(DEFAULT_RULES)).toContain("gleich");
    expect(beschreibeWettbewerbe(AN())).toContain("CL");
  });
});

// ── L5: Dämpfer statt nur Aufschlag ──
// Vorher schaltete sich die ganze Ebene lautlos ab, sobald der einzige
// eingestellte Wert ein Dämpfer (negativ) war — `v > 0` warf ihn aus
// `aufschlaege` raus, `enabled` sah dann eine leere Liste und wurde `false`.
describe("Dämpfer (negativer Aufschlag)", () => {
  it("a) ein reiner Dämpfer bleibt erhalten und hält die Ebene AN", () => {
    const s = sanitizeWettbewerbe({ enabled: true, aufschlaege: { bl: -0.5 } });
    expect(s.enabled).toBe(true);
    expect(s.aufschlaege.bl).toBe(-0.5);
  });

  it("b) gemischt: Aufschlag und Dämpfer überleben beide", () => {
    const s = sanitizeWettbewerbe({ enabled: true, aufschlaege: { cl: 1.0, bl: -0.4 } });
    expect(s.aufschlaege).toEqual({ cl: 1.0, bl: -0.4 });
  });

  it("c) genau 0 fliegt weiterhin raus", () => {
    const s = sanitizeWettbewerbe({ enabled: true, aufschlaege: { bl: 0, cl: -0.3 } });
    expect(s.aufschlaege).toEqual({ cl: -0.3 });
  });

  it("d) unter dem Minimum wird auf -0,75 beschnitten", () => {
    const s = sanitizeWettbewerbe({ enabled: true, aufschlaege: { bl: -2 } });
    expect(s.aufschlaege.bl).toBe(-0.75);
  });

  it("e) ein Dämpfer drückt den Faktor, aber nie unter modFloor", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES, modCap: 4, modFloor: 0.5,
      wettbewerbe: { enabled: true, aufschlaege: { cl: -0.75 }, phasenStufe: 0 },
    });
    const snap = { wettbewerb: "cl", phase: "liga" };
    expect(wettbewerbAufschlag(snap, rules)).toBeCloseTo(-0.75, 3);
    const t = totalModifier({}, snap, rules);
    expect(t.faktor).toBeCloseTo(0.5, 3);
    expect(t.faktor).toBeGreaterThanOrEqual(rules.modFloor);
    expect(t.gedaempft).toBe(true);
  });

  it("f) maxWettbewerbAufschlag ist 0, wenn ausschließlich Dämpfer eingestellt sind", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      wettbewerbe: { enabled: true, aufschlaege: { cl: -0.5, bl: -0.3 }, phasenStufe: 0 },
    });
    expect(maxWettbewerbAufschlag(rules)).toBe(0);
  });

  it("g) anteile(): der gedämpfte Wettbewerb bekommt einen kleineren Anteil als seinen Rohanteil", () => {
    const matches = [...spiel("bl", "liga", 306), ...spiel("cl", "liga", 144)];
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      wettbewerbe: { enabled: true, aufschlaege: { cl: -0.5 }, phasenStufe: 0 },
    });
    const a = anteile(matches, rules).find((x) => x.key === "cl");
    expect(a.anteil).toBeLessThan(a.anteilRoh);
  });

  it("h) beschreibeWettbewerbe nennt einen Dämpfer ohne Dezimalpunkt", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      wettbewerbe: { enabled: true, aufschlaege: { bl: -0.4 }, phasenStufe: 0 },
    });
    const text = beschreibeWettbewerbe(rules);
    expect(text).toContain("BL");
    expect(text).not.toMatch(/×\d+\.\d/);
  });
});
