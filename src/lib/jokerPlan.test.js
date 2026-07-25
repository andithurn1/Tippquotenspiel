import { describe, it, expect } from "vitest";
import {
  VERTEIL_MODI, SICHTBARKEIT, DEFAULT_VERTEILUNG, VERTEILUNG_LIMITS,
  sanitizeVerteilung, kontingent, jokerPlan, hatJoker, fortschritt,
  uebersicht, sichtbareSpieltage, beschreibeVerteilung,
} from "@/lib/jokerPlan";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";

const SPIELER = ["u1", "u2", "u3", "u4", "u5"];
const plan = (verteilung, extra = {}) =>
  jokerPlan({ spieltage: 34, verteilung, seed: "runde-42", userIds: SPIELER, ...extra });

describe("Katalog & Bereinigung", () => {
  it("Modi und Sichtbarkeiten sind vollständig beschrieben", () => {
    for (const liste of [VERTEIL_MODI, SICHTBARKEIT]) {
      for (const e of liste) expect(e.key && e.label && e.desc).toBeTruthy();
      expect(new Set(liste.map((e) => e.key)).size).toBe(liste.length);
    }
  });

  it("Unsinn wird auf die Standardwerte zurückgeholt", () => {
    expect(sanitizeVerteilung({ modus: "hack", frequenz: "viel", sichtbarkeit: 7 }))
      .toEqual(DEFAULT_VERTEILUNG);
    expect(sanitizeVerteilung()).toEqual(DEFAULT_VERTEILUNG);
  });

  it("die Frequenz wird auf ihre Grenzen beschnitten", () => {
    expect(sanitizeVerteilung({ frequenz: 99 }).frequenz).toBe(VERTEILUNG_LIMITS.frequenz.max);
    expect(sanitizeVerteilung({ frequenz: 0 }).frequenz).toBe(VERTEILUNG_LIMITS.frequenz.min);
    expect(sanitizeVerteilung({ frequenz: 3.4 }).frequenz).toBe(3);
  });

  it("das Regelwerk trägt die Verteilung mit — auch aus einem Creator-Code", () => {
    expect(DEFAULT_RULES.joker.verteilung).toEqual(DEFAULT_VERTEILUNG);
    const r = sanitizeRules({
      ...DEFAULT_RULES,
      joker: { ...DEFAULT_RULES.joker, verteilung: { modus: "kontingent", frequenz: 3, sichtbarkeit: "offen" } },
    });
    expect(r.joker.verteilung).toEqual({ modus: "kontingent", frequenz: 3, sichtbarkeit: "offen" });
    expect(sanitizeRules(r)).toEqual(r);
  });
});

describe("Kontingent", () => {
  it("jeder 4. von 34 Spieltagen sind rund 9 Joker", () => {
    expect(kontingent(34, 4)).toBe(9);
    expect(kontingent(34, 1)).toBe(34);
    expect(kontingent(34, 8)).toBe(4);
  });

  it("nie null — eine Saison ohne Joker wäre eine stumme Regel", () => {
    expect(kontingent(3, 8)).toBe(1);
  });
});

describe("Modus „frei“", () => {
  it("erlaubt jeden Spieltag", () => {
    const p = plan({ modus: "frei" });
    for (const md of [1, 17, 34]) expect(hatJoker(p, "u1", md)).toBe(true);
  });

  it("ohne Plan ist ebenfalls alles erlaubt", () => {
    expect(hatJoker(null, "u1", 5)).toBe(true);
  });
});

describe("Modus „gleich für alle“", () => {
  const p = plan({ modus: "gleich", frequenz: 4 });

  it("alle Spieler haben exakt dieselben Joker-Spieltage", () => {
    for (const id of SPIELER) expect(p.proSpieler[id]).toEqual(p.alle);
  });

  it("die Anzahl entspricht dem Kontingent", () => {
    expect(p.alle.length).toBe(kontingent(34, 4));
  });

  it("die Joker verteilen sich über die ganze Saison, nicht in Klumpen", () => {
    // Blockweise Verteilung: je Block genau einer, also ist der Abstand
    // zwischen zwei Jokern nie größer als zwei Blockbreiten.
    const tage = [...p.alle].sort((a, b) => a - b);
    const breite = 34 / p.anzahl;
    for (let i = 1; i < tage.length; i++) {
      expect(tage[i] - tage[i - 1]).toBeLessThanOrEqual(Math.ceil(breite * 2));
    }
    expect(Math.min(...tage)).toBeLessThanOrEqual(Math.ceil(breite));
    expect(Math.max(...tage)).toBeGreaterThanOrEqual(34 - Math.ceil(breite));
  });
});

describe("Modus „gleich viele, verteilt“", () => {
  const p = plan({ modus: "kontingent", frequenz: 4 });

  it("JEDER bekommt gleich viele Joker — das ist die Fairness-Zusage", () => {
    const anzahlen = SPIELER.map((id) => p.proSpieler[id].length);
    expect(new Set(anzahlen).size).toBe(1);
    expect(anzahlen[0]).toBe(kontingent(34, 4));
  });

  it("…aber nicht alle an denselben Spieltagen", () => {
    const listen = SPIELER.map((id) => p.proSpieler[id].join(","));
    expect(new Set(listen).size).toBeGreaterThan(1);
  });

  it("jeder Spieltag liegt im gültigen Bereich", () => {
    for (const id of SPIELER) {
      for (const t of p.proSpieler[id]) {
        expect(t).toBeGreaterThanOrEqual(1);
        expect(t).toBeLessThanOrEqual(34);
      }
    }
  });

  it("kein Spieler bekommt zweimal denselben Spieltag", () => {
    for (const id of SPIELER) {
      expect(new Set(p.proSpieler[id]).size).toBe(p.proSpieler[id].length);
    }
  });
});

describe("Deterministisch", () => {
  it("gleiche Runde, gleicher Plan — sonst wäre er nicht nachprüfbar", () => {
    expect(plan({ modus: "kontingent" })).toEqual(plan({ modus: "kontingent" }));
  });

  it("andere Runde, anderer Plan", () => {
    const a = jokerPlan({ spieltage: 34, verteilung: { modus: "gleich" }, seed: "runde-a", userIds: SPIELER });
    const b = jokerPlan({ spieltage: 34, verteilung: { modus: "gleich" }, seed: "runde-b", userIds: SPIELER });
    expect(a.alle).not.toEqual(b.alle);
  });
});

describe("Fortschritt statt nackter Zahl", () => {
  const p = plan({ modus: "kontingent", frequenz: 4 });

  it("zeigt immer den Bezug zum Gesamt-Kontingent", () => {
    const f = fortschritt(p, "u1", 17);
    expect(f.text).toBe(`${f.gehabt} von ${f.gesamt}`);
    expect(f.gesamt).toBe(p.anzahl);
  });

  it("am Saisonende haben ALLE ihr volles Kontingent", () => {
    // Der Kern der Zusage: ein ungleicher Zwischenstand ist systembedingt,
    // am Ende steht jeder gleich da.
    for (const id of SPIELER) {
      expect(fortschritt(p, id, 34).gehabt).toBe(p.anzahl);
    }
  });

  it("die Mitspieler-Übersicht deckt alle ab", () => {
    const u = uebersicht(p, 10, SPIELER);
    expect(u.map((x) => x.userId)).toEqual(SPIELER);
    for (const x of u) expect(x.gesamt).toBe(p.anzahl);
  });

  it("im Modus „frei“ gibt es kein Kontingent zu zählen", () => {
    expect(fortschritt(plan({ modus: "frei" }), "u1", 5).text).toBe("an jedem Spieltag");
  });
});

describe("Sichtbarkeit", () => {
  const v = { modus: "kontingent", frequenz: 4 };
  const p = plan(v);

  it("verdeckt: nur die bereits gespielten Joker-Spieltage sind zu sehen", () => {
    const sicht = sichtbareSpieltage(p, "u1", { ...v, sichtbarkeit: "verdeckt" }, 12);
    expect(sicht.every((t) => t <= 12)).toBe(true);
    expect(sicht.length).toBeLessThan(p.proSpieler.u1.length);
  });

  it("offen: der ganze Kalender liegt vor", () => {
    const sicht = sichtbareSpieltage(p, "u1", { ...v, sichtbarkeit: "offen" }, 12);
    expect(sicht).toEqual(p.proSpieler.u1);
  });

  it("frei: keine Einschränkung", () => {
    expect(sichtbareSpieltage(plan({ modus: "frei" }), "u1", { modus: "frei" }, 12)).toBeNull();
  });
});

describe("Beschreibung", () => {
  it("nennt Anzahl und Sichtbarkeit", () => {
    const t = beschreibeVerteilung({ modus: "kontingent", frequenz: 4, sichtbarkeit: "verdeckt" });
    expect(t).toMatch(/9/);
    expect(t.toLowerCase()).toContain("verdeckt");
  });

  it("beschreibt „frei“ ohne Zahlen", () => {
    expect(beschreibeVerteilung({ modus: "frei" })).toContain("jedem Spieltag");
  });
});
