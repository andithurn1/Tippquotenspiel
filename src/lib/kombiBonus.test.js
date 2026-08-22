import { describe, it, expect } from "vitest";
import {
  KOMBI_STUFEN, KOMBI_LIMITS, DEFAULT_KOMBI,
  sanitizeKombi, kombiAufschlag, beschreibeKombi,
} from "@/lib/kombiBonus";
import { applyCombo, scoreTip, sanitizeRules, DEFAULT_RULES } from "@/lib/engine";

const an = (extra = {}) => ({ kombi: { ...DEFAULT_KOMBI, enabled: true, ...extra } });

// Zwei Schützen, wie sie aus `scoreGoals` kommen: der sichere Stürmer und der
// Innenverteidiger — genau Andis Beispiel.
const STUERMER = { side: "home", player: "Kane", type: "single", anytime: 1.5, scored: null };
const VERTEIDIGER = { side: "home", player: "Upamecano", type: "single", anytime: 15, scored: null };

describe("Katalog und Bereinigung", () => {
  it("jede Stufe ist vollständig beschrieben", () => {
    for (const s of KOMBI_STUFEN) {
      expect(s.key && s.label && s.desc).toBeTruthy();
      expect(s.desc.length).toBeGreaterThan(15);
    }
  });

  it("Unsinn fällt auf die Vorgabe zurück", () => {
    expect(sanitizeKombi({ stufe: "gibtsnicht" }).stufe).toBe(DEFAULT_KOMBI.stufe);
    expect(sanitizeKombi()).toEqual(DEFAULT_KOMBI);
  });

  it("Werte werden beschnitten", () => {
    const c = sanitizeKombi({ staerke: 99, maxAufschlag: -5, mindestSchuetzen: 99 });
    expect(c.staerke).toBe(KOMBI_LIMITS.staerke.max);
    expect(c.maxAufschlag).toBe(KOMBI_LIMITS.maxAufschlag.min);
    expect(c.mindestSchuetzen).toBe(KOMBI_LIMITS.mindestSchuetzen.max);
  });

  it("die Vorgabe ist AUS — ein neuer Block ändert keine laufende Runde", () => {
    expect(DEFAULT_KOMBI.enabled).toBe(false);
    expect(kombiAufschlag("exakt", [STUERMER], {})).toBe(0);
  });

  it("reist über sanitizeRules mit", () => {
    const r = sanitizeRules({ ...DEFAULT_RULES, kombi: { enabled: true, staerke: 0.3 } });
    expect(r.kombi.enabled).toBe(true);
    expect(r.kombi.staerke).toBe(0.3);
    expect(sanitizeRules(r)).toEqual(r);
  });
});

describe("🔴 Der seltene Schütze zählt mehr — der ganze Punkt", () => {
  it("der Innenverteidiger bringt mehr als der Torjäger", () => {
    const klein = kombiAufschlag("exakt", [STUERMER], an());
    const gross = kombiAufschlag("exakt", [VERTEIDIGER], an());
    expect(gross).toBeGreaterThan(klein);
    expect(klein).toBeGreaterThan(0);
  });

  // ⚠️ Der Grund für den Logarithmus: linear wäre der Verteidiger das
  // 28-Fache und würde alles andere erschlagen.
  it("das Verhältnis bleibt proportioniert, nicht erschlagend", () => {
    const klein = kombiAufschlag("exakt", [STUERMER], an());
    const gross = kombiAufschlag("exakt", [VERTEIDIGER], an({ maxAufschlag: 3 }));
    expect(gross / klein).toBeLessThan(10);     // linear wären es 28
    expect(gross / klein).toBeGreaterThan(3);
  });

  it("zwei Schützen zählen zusammen mehr als einer", () => {
    const einer = kombiAufschlag("exakt", [STUERMER], an({ maxAufschlag: 3 }));
    const zwei = kombiAufschlag("exakt", [STUERMER, VERTEIDIGER], an({ maxAufschlag: 3 }));
    expect(zwei).toBeGreaterThan(einer);
  });

  it("ein Doppelpack zählt mit seiner eigenen, höheren Quote", () => {
    const single = kombiAufschlag("exakt", [{ ...STUERMER, type: "single", anytime: 1.5 }], an({ maxAufschlag: 3 }));
    const doppel = kombiAufschlag("exakt", [{ side: "home", player: "Kane", type: "double", single: 1.5, double: 4.5, scored: null }], an({ maxAufschlag: 3 }));
    expect(doppel).toBeGreaterThan(single);
  });

  it("der Deckel hält", () => {
    const r = kombiAufschlag("exakt", [VERTEIDIGER, VERTEIDIGER, VERTEIDIGER], an({ maxAufschlag: 0.5 }));
    expect(r).toBe(0.5);
  });
});

describe("Wann er greift", () => {
  it("nicht unterhalb der verlangten Ergebnis-Ebene", () => {
    expect(kombiAufschlag("tendenz", [VERTEIDIGER], an({ stufe: "exakt" }))).toBe(0);
    expect(kombiAufschlag("exakt", [VERTEIDIGER], an({ stufe: "exakt" }))).toBeGreaterThan(0);
  });

  it("eine mildere Stufe lässt auch gröbere Treffer zu", () => {
    expect(kombiAufschlag("tendenz", [VERTEIDIGER], an({ stufe: "tendenz" }))).toBeGreaterThan(0);
    expect(kombiAufschlag("abstand", [VERTEIDIGER], an({ stufe: "tendenz" }))).toBeGreaterThan(0);
  });

  it("nicht unter der Mindestzahl von Schützen", () => {
    expect(kombiAufschlag("exakt", [VERTEIDIGER], an({ mindestSchuetzen: 2 }))).toBe(0);
    expect(kombiAufschlag("exakt", [VERTEIDIGER, STUERMER], an({ mindestSchuetzen: 2 }))).toBeGreaterThan(0);
  });

  // Bei der AUSWERTUNG steht in `scored` die echte Toranzahl. Wer nicht
  // getroffen hat, zählt auch nicht als seltener Treffer.
  it("ein Schütze, der NICHT getroffen hat, zählt nicht", () => {
    const daneben = { ...VERTEIDIGER, scored: 0 };
    expect(kombiAufschlag("exakt", [daneben], an())).toBe(0);
    expect(kombiAufschlag("exakt", [{ ...VERTEIDIGER, scored: 1 }], an())).toBeGreaterThan(0);
  });
});

describe("In der Wertung angekommen", () => {
  it("`applyCombo` ohne Detail-Liste rechnet wie bisher", () => {
    const ohne = applyCombo(100, "exakt", 50, DEFAULT_RULES);
    expect(ohne).toBe(150 * DEFAULT_RULES.combo.exakt);
  });

  it("mit eingeschaltetem Bonus zahlt derselbe Tipp mehr", () => {
    const regeln = sanitizeRules({ ...DEFAULT_RULES, ...an() });
    const ohne = applyCombo(100, "exakt", 50, DEFAULT_RULES, [VERTEIDIGER]);
    const mit = applyCombo(100, "exakt", 50, regeln, [VERTEIDIGER]);
    expect(mit).toBeGreaterThan(ohne);
  });

  it("ohne Tor-Gewinn ändert er nichts — es gibt keine Kombination", () => {
    const regeln = sanitizeRules({ ...DEFAULT_RULES, ...an() });
    expect(applyCombo(100, "exakt", 0, regeln, [VERTEIDIGER])).toBe(100);
  });
});

describe("Klartext", () => {
  it("sagt im Aus-Zustand, dass sich nichts ändert", () => {
    expect(beschreibeKombi({})).toMatch(/Aus/);
  });

  it("nennt beide Beispiele mit gerechneten Zahlen", () => {
    const t = beschreibeKombi(an());
    expect(t).toMatch(/1,5|1\.5/);
    expect(t).toMatch(/15/);
    expect(t).toMatch(/gedeckelt/);
  });
});
