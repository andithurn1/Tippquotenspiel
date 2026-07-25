import { describe, it, expect } from "vitest";
import {
  kontingent, darfJokerSetzen, erspielteJoker, standText,
} from "@/lib/jokerKontingent";
import { jokerPlan } from "@/lib/jokerPlan";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";

const SPIELER = ["u1", "u2"];
const PLAN = jokerPlan({
  spieltage: 34, verteilung: { modus: "gleich", frequenz: 4 },
  seed: "runde-1", userIds: SPIELER,
});
const PLANTAGE = PLAN.alle;                    // Spieltage MIT zugeteiltem Joker
const OHNE = [...Array(34).keys()].map((i) => i + 1).filter((md) => !PLANTAGE.includes(md));

const gut = (matchday, belohnung = 1) => ({ key: "serie", matchday, belohnung, text: "" });
const tipp = (matchday, joker = true, wettbewerb = null) => ({ matchday, joker, wettbewerb });

describe("Kontingent-Stand", () => {
  it("zählt beide Töpfe getrennt", () => {
    const s = kontingent({
      plan: PLAN, userId: "u1", gutschriften: [gut(3), gut(9)],
      tipps: [tipp(PLANTAGE[0])],
    });
    expect(s.zugeteilt.gesamt).toBe(PLAN.anzahl);
    expect(s.zugeteilt.verbraucht).toBe(1);
    expect(s.erspielt.gesamt).toBe(2);
    expect(s.erspielt.verbraucht).toBe(0);
  });

  it("`bisSpieltag` schneidet beide Töpfe ab", () => {
    const s = kontingent({
      plan: PLAN, userId: "u1", gutschriften: [gut(3), gut(30)], bisSpieltag: 10,
    });
    expect(s.erspielt.gesamt).toBe(1);
    expect(s.zugeteilt.gesamt).toBe(PLANTAGE.filter((md) => md <= 10).length);
  });

  it("im Modus „frei“ ist der zugeteilte Topf unbegrenzt", () => {
    const frei = jokerPlan({ spieltage: 34, verteilung: { modus: "frei" }, seed: "x", userIds: SPIELER });
    const s = kontingent({ plan: frei, userId: "u1" });
    expect(s.unbegrenzt).toBe(true);
    expect(s.zugeteilt.gesamt).toBeNull();
    expect(s.offen).toBeNull();
  });
});

describe("Verbraucht wird zuerst der zugeteilte Topf", () => {
  it("ein Joker am Plan-Spieltag geht NICHT vom erspielten Vorrat ab", () => {
    // Andersherum wäre der mühsam erspielte Vorrat nach zwei Spieltagen weg,
    // ohne dass der Spieler je eine Wahl hatte.
    const s = kontingent({
      plan: PLAN, userId: "u1", gutschriften: [gut(1)],
      tipps: [tipp(PLANTAGE[0]), tipp(PLANTAGE[1])],
    });
    expect(s.zugeteilt.verbraucht).toBe(2);
    expect(s.erspielt.verbraucht).toBe(0);
    expect(s.erspielt.offen).toBe(1);
  });

  it("ein Joker ausserhalb der Plan-Spieltage geht vom erspielten Vorrat ab", () => {
    const s = kontingent({
      plan: PLAN, userId: "u1", gutschriften: [gut(1), gut(2)],
      tipps: [tipp(OHNE[0])],
    });
    expect(s.zugeteilt.verbraucht).toBe(0);
    expect(s.erspielt.verbraucht).toBe(1);
    expect(s.erspielt.offen).toBe(1);
  });
});

describe("Darf ich hier einen Joker setzen?", () => {
  it("am Plan-Spieltag: ja, aus dem zugeteilten Topf", () => {
    const r = darfJokerSetzen({ plan: PLAN, userId: "u1", spieltag: PLANTAGE[2] });
    expect(r.erlaubt).toBe(true);
    expect(r.quelle).toBe("zugeteilt");
  });

  it("ausserhalb: nur mit erspieltem Vorrat", () => {
    const ohneVorrat = darfJokerSetzen({ plan: PLAN, userId: "u1", spieltag: OHNE[5] });
    expect(ohneVorrat.erlaubt).toBe(false);

    const mitVorrat = darfJokerSetzen({
      plan: PLAN, userId: "u1", spieltag: OHNE[5], gutschriften: [gut(1)],
    });
    expect(mitVorrat.erlaubt).toBe(true);
    expect(mitVorrat.quelle).toBe("erspielt");
  });

  it("ein erspielter Joker wirkt NICHT rückwirkend", () => {
    // Sonst liesse sich ein spät verdienter Joker auf einen längst gespielten
    // Spieltag legen und die Wertung nachträglich ändern.
    const spaeterVerdient = [gut(30)];
    const frueherSpieltag = OHNE.find((md) => md < 10);
    expect(darfJokerSetzen({
      plan: PLAN, userId: "u1", spieltag: frueherSpieltag, gutschriften: spaeterVerdient,
    }).erlaubt).toBe(false);
    expect(darfJokerSetzen({
      plan: PLAN, userId: "u1", spieltag: 31, gutschriften: spaeterVerdient,
    }).erlaubt).toBe(true);
  });

  it("zweimal am selben Spieltag geht nicht", () => {
    const r = darfJokerSetzen({
      plan: PLAN, userId: "u1", spieltag: PLANTAGE[0],
      tipps: [tipp(PLANTAGE[0])],
    });
    expect(r.erlaubt).toBe(false);
    expect(r.grund).toContain("schon einen Joker");
  });

  it("derselbe Spieltag in einem ANDEREN Wettbewerb ist frei", () => {
    // Der Fund aus der Wettbewerbs-Etappe, hier auf Kontingent-Ebene.
    const r = darfJokerSetzen({
      plan: PLAN, userId: "u1",
      spieltag: { wettbewerb: "cl", matchday: PLANTAGE[0] },
      tipps: [tipp(PLANTAGE[0], true, "bl")],
    });
    expect(r.erlaubt).toBe(true);
  });

  it("ohne Plan ist alles erlaubt (bisheriges Verhalten)", () => {
    expect(darfJokerSetzen({ plan: null, userId: "u1", spieltag: 5 }).erlaubt).toBe(true);
  });
});

describe("Aus den Ereignissen ins Kontingent", () => {
  it("erspielteJoker liest die Gutschriften aus dem Regelwerk", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      ereignisse: { enabled: true, maxErspielt: 5, aktive: [{ key: "serie", anzahl: 2, belohnung: 1 }] },
    });
    const eintraege = [1, 2, 3, 4].map((md) => ({
      userId: "u1", matchday: md, matchId: `m${md}`, tip: { home: 1, away: 0 }, result: null,
      snapshot: { matchId: `m${md}`, winner: { home: 2, draw: 3, away: 3 } },
    }));
    const g = erspielteJoker({ eintraege, rules });
    expect(g.length).toBe(2);
    expect(g.every((x) => x.belohnung === 1)).toBe(true);
  });

  it("ohne Ereignisse gibt es nichts zu erspielen", () => {
    expect(erspielteJoker({ eintraege: [], rules: DEFAULT_RULES })).toEqual([]);
  });
});

describe("Anzeige", () => {
  it("nennt immer den Fortschritt, nie eine nackte Zahl", () => {
    const s = kontingent({
      plan: PLAN, userId: "u1", gutschriften: [gut(1), gut(2)],
      tipps: [tipp(PLANTAGE[0])],
    });
    const t = standText(s);
    expect(t).toContain(`1 von ${PLAN.anzahl}`);
    expect(t).toContain("erspielten");
  });

  it("im Modus „frei“ ohne Zahlenspiel", () => {
    const frei = jokerPlan({ spieltage: 34, verteilung: { modus: "frei" }, seed: "x", userIds: SPIELER });
    expect(standText(kontingent({ plan: frei, userId: "u1" }))).toContain("jedem Spieltag");
  });
});
