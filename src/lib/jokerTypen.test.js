import { describe, it, expect } from "vitest";
import {
  createMockOddsSource, DEFAULT_RULES, sanitizeRules, RULE_LIMITS,
  JOKER_TYPEN, jokerAufschlaege, jokerFactor, totalModifier, scoreTip,
} from "@/lib/engine";

const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");   // Spanien Favorit (1.28), Jordanien Außenseiter (9.0)
const RESULT = odds.getResult("JOR-ESP");

const regeln = (joker) => sanitizeRules({ ...DEFAULT_RULES, joker: { enabled: true, ...joker } });
const tipp = (extra = {}) => ({ home: 2, away: 1, goals: { home: [], away: [] }, ...extra });

describe("Katalog", () => {
  it("jeder Typ ist vollständig beschrieben", () => {
    for (const t of JOKER_TYPEN) {
      expect(t.key && t.label && t.hint).toBeTruthy();
      expect(typeof t.aufschlag).toBe("function");
    }
  });

  it("Schlüssel sind eindeutig", () => {
    const keys = JOKER_TYPEN.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ist der Joker aus, greift KEIN Typ", () => {
    const r = sanitizeRules({ ...DEFAULT_RULES, joker: { enabled: false, heimat: { enabled: true, faktor: 1.2 } } });
    expect(jokerAufschlaege(tipp({ verein: "Jordanien" }), SNAP, r)).toEqual([]);
    expect(jokerFactor(tipp({ verein: "Jordanien" }), r, SNAP)).toBe(1);
  });
});

describe("Typ „aktiv“ — bisheriges Verhalten bleibt", () => {
  it("einzel: nur ein markierter Tipp bekommt den Faktor", () => {
    const r = regeln({ modus: "einzel", faktor: 1.5 });
    expect(jokerFactor(tipp({ joker: true }), r, SNAP)).toBeCloseTo(1.5, 2);
    expect(jokerFactor(tipp(), r, SNAP)).toBe(1);
  });

  it("ranking: nur Gewichte aus dem Pool zählen", () => {
    const r = regeln({ modus: "ranking", faktoren: [2, 1.5, 1.2, 1] });
    expect(jokerFactor(tipp({ gewicht: 2 }), r, SNAP)).toBeCloseTo(2, 2);
    expect(jokerFactor(tipp({ gewicht: 9.9 }), r, SNAP)).toBe(1);  // Fantasie-Wert
  });
});

describe("Typ „heimat“ — passiv, ohne Entscheidung", () => {
  const r = regeln({ modus: "einzel", heimat: { enabled: true, faktor: 1.2 } });

  it("greift bei einem Spiel des eigenen Vereins", () => {
    expect(jokerFactor(tipp({ verein: "Jordanien" }), r, SNAP)).toBeCloseTo(1.2, 2);
    expect(jokerFactor(tipp({ verein: "Spanien" }), r, SNAP)).toBeCloseTo(1.2, 2);
  });

  it("greift NICHT bei fremden Begegnungen", () => {
    expect(jokerFactor(tipp({ verein: "FC Woanders" }), r, SNAP)).toBe(1);
  });

  it("greift nicht ohne gewählten Verein", () => {
    expect(jokerFactor(tipp(), r, SNAP)).toBe(1);
  });

  it("ist der Typ aus, passiert nichts", () => {
    const aus = regeln({ modus: "einzel", heimat: { enabled: false, faktor: 1.2 } });
    expect(jokerFactor(tipp({ verein: "Jordanien" }), aus, SNAP)).toBe(1);
  });
});

describe("Typ „mut“ — nur gegen den Favoriten", () => {
  const r = regeln({ modus: "einzel", mut: { enabled: true, faktor: 1.2 } });
  const heimSieg = { home: 5, away: 1 };      // Aussenseiter Jordanien gewinnt
  const gastSieg = { home: 0, away: 2 };      // Favorit Spanien gewinnt

  it("greift, wenn der Mut gegen den Favoriten AUFGEHT", () => {
    expect(jokerFactor(tipp({ home: 2, away: 1 }), r, SNAP, heimSieg)).toBeCloseTo(1.2, 2);
  });

  it("greift NICHT, wenn der mutige Tipp danebengeht", () => {
    // Gegen den Favoriten getippt, aber der Favorit hat gewonnen.
    expect(jokerFactor(tipp({ home: 2, away: 1 }), r, SNAP, gastSieg)).toBe(1);
  });

  it("greift NICHT beim Tipp auf den Favoriten", () => {
    expect(jokerFactor(tipp({ home: 0, away: 2 }), r, SNAP, gastSieg)).toBe(1);
  });

  it("ein Remis-Tipp ist kein Mut gegen den Favoriten", () => {
    expect(jokerFactor(tipp({ home: 1, away: 1 }), r, SNAP, heimSieg)).toBe(1);
  });

  it("wird NICHT enger begrenzt als der gesetzte Joker", () => {
    // Regressionstest zu einer alten Verwechslung: die Messung („ab ×1,15
    // schmilzt der Vorsprung des Könners") war einmal als engere HARTE Grenze
    // gelandet. Damit endete der Regler kurz hinter der Empfehlung, und ein
    // Admin konnte gar nicht ausprobieren, wie sich ein wilder Wert anfühlt.
    // Eine Messung gehört ins Empfehlungsband (reglerWarnung.js), nie in
    // RULE_LIMITS — sonst wird aus jeder Messung ein Verbot.
    expect(RULE_LIMITS.joker.mutFaktor.max).toBeGreaterThanOrEqual(RULE_LIMITS.joker.faktor.max);
  });

  it("beschneidet trotzdem auf die harte Grenze", () => {
    const zuHoch = regeln({ modus: "einzel", mut: { enabled: true, faktor: 9 } });
    expect(zuHoch.joker.mut.faktor).toBe(RULE_LIMITS.joker.mutFaktor.max);
  });
});

describe("Mehrere Typen: ADDITIV, nicht multiplikativ", () => {
  const r = regeln({
    modus: "einzel", faktor: 1.5,
    heimat: { enabled: true, faktor: 1.2 },
    mut: { enabled: true, faktor: 1.2 },
  });
  const heimSieg = { home: 5, away: 1 };

  it("die Aufschläge addieren sich", () => {
    // 1 + 0.5 (gesetzt) + 0.2 (Heimat) + 0.2 (Mut) = 1.9 — multiplikativ wären es 2.16.
    const f = jokerFactor(tipp({ joker: true, verein: "Jordanien" }), r, SNAP, heimSieg);
    expect(f).toBeCloseTo(1.9, 2);
    expect(f).toBeLessThan(1.5 * 1.2 * 1.2);
  });

  it("die Aufschlüsselung nennt jeden greifenden Typ einzeln", () => {
    const teile = jokerAufschlaege(tipp({ joker: true, verein: "Jordanien" }), SNAP, r, heimSieg);
    expect(teile.map((t) => t.key).sort()).toEqual(["aktiv", "heimat", "mut"]);
    for (const t of teile) {
      expect(t.aufschlag).toBeGreaterThan(0);
      expect(t.faktor).toBeCloseTo(1 + t.aufschlag, 3);
    }
  });

  it("nicht greifende Typen tauchen gar nicht auf", () => {
    const teile = jokerAufschlaege(tipp({ verein: "FC Woanders", home: 0, away: 3 }), SNAP, r, heimSieg);
    expect(teile).toEqual([]);
  });
});

describe("Der Deckel hält — auch mit allen Typen", () => {
  it("vier Aufschläge zusammen sprengen modCap nicht", () => {
    const r = sanitizeRules({
      ...DEFAULT_RULES, modCap: 2.5,
      teamMods: { derbyFaktor: 1.5, teams: { Jordanien: 1.4 } },
      joker: {
        enabled: true, modus: "einzel", faktor: RULE_LIMITS.joker.faktor.max,
        heimat: { enabled: true, faktor: RULE_LIMITS.joker.faktor.max },
        mut: { enabled: true, faktor: RULE_LIMITS.joker.faktor.max },
      },
    });
    const mod = totalModifier(tipp({ joker: true, verein: "Jordanien" }), SNAP, r);
    expect(mod.faktor).toBeLessThanOrEqual(2.5);
    expect(mod.gedeckelt).toBe(true);
  });

  it("ein einzelner Typ bleibt in den Regler-Grenzen", () => {
    const r = regeln({ modus: "einzel", heimat: { enabled: true, faktor: 99 } });
    expect(r.joker.heimat.faktor).toBeLessThanOrEqual(RULE_LIMITS.joker.faktor.max);
  });
});

describe("Symmetrie: Typen wirken auch auf Minuspunkte", () => {
  it("ein Malus wird durch den Heimatbonus ebenfalls verstärkt", () => {
    // Sehr steile Naehe-Kurven (k/m am Maximum), damit bei diesem weit
    // danebenliegenden Tipp WIRKLICH nichts mehr zahlt — sonst rettet die
    // Team-Tore-Naehe ihn ins Plus und es gaebe keinen Malus zu verstaerken.
    const streng = { ...DEFAULT_RULES, wrongPenalty: -2, k: 1.6, m: 1.6 };
    const basis = sanitizeRules(streng);
    const mitHeimat = sanitizeRules({
      ...streng,
      joker: { enabled: true, modus: "einzel", heimat: { enabled: true, faktor: 1.5 } },
    });
    const daneben = tipp({ home: 0, away: 4, verein: "Jordanien" });
    const ohne = scoreTip(daneben, RESULT, SNAP, basis).total;
    const mit = scoreTip(daneben, RESULT, SNAP, mitHeimat).total;
    expect(ohne).toBeLessThan(0);
    expect(mit).toBeLessThan(ohne);   // stärker im Minus — kein Gratis-Aufschlag
  });
});

describe("Abwärtskompatibilität", () => {
  it("ein altes Regelwerk ohne die neuen Typen läuft unverändert", () => {
    const alt = sanitizeRules({
      ...DEFAULT_RULES,
      joker: { enabled: true, modus: "einzel", faktor: 1.5, faktoren: [2, 1.5, 1.2, 1] },
    });
    expect(alt.joker.heimat.enabled).toBe(false);
    expect(alt.joker.mut.enabled).toBe(false);
    expect(jokerFactor(tipp({ joker: true }), alt, SNAP)).toBeCloseTo(1.5, 2);
  });

  it("jokerFactor funktioniert auch ohne Snapshot (alte Aufrufer)", () => {
    const r = regeln({ modus: "einzel", faktor: 1.5, heimat: { enabled: true, faktor: 1.2 } });
    expect(jokerFactor(tipp({ joker: true, verein: "Jordanien" }), r)).toBeCloseTo(1.5, 2);
  });
});
