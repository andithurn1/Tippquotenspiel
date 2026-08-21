import { describe, it, expect } from "vitest";
import {
  DEFAULT_TABELLENBONUS, sanitizeTabellenBonus, aussenseiterNachTabelle,
  tabellenBonusAufschlag, beschreibeTabellenBonus,
} from "./tabellenBonus";
import { totalModifier, DEFAULT_RULES, sanitizeRules } from "./engine";

// Heim steht auf Platz 16, Gast auf Platz 2 — Heim ist der Außenseiter.
const SNAP = {
  matchId: "A-B", home: "A", away: "B", matchday: 20,
  tabellenPlatz: { home: 16, away: 2 },
  tabellenPunkte: { home: 14, away: 44 },
  tabellenTeams: 18,
  winner: { home: 6.5, draw: 4.2, away: 1.5 },
};
const AN = { ...DEFAULT_TABELLENBONUS, enabled: true };
const regeln = (teil) => ({ ...DEFAULT_RULES, tabellenBonus: { ...AN, ...teil } });

describe("sanitizeTabellenBonus", () => {
  it("startet aus und mit Andis Größenordnung", () => {
    const c = sanitizeTabellenBonus();
    expect(c.enabled).toBe(false);
    expect(c.aufschlag).toBe(0.2);
    expect(c.nurWennRichtig).toBe(true);
  });

  it("hält den Aufschlag in seinen Grenzen", () => {
    expect(sanitizeTabellenBonus({ aufschlag: 99 }).aufschlag).toBe(1.5);
    expect(sanitizeTabellenBonus({ aufschlag: -5 }).aufschlag).toBe(0);
  });

  // 🔴 Die Spanne hängt am Bezug: 18 PLÄTZE sind viel, 18 PUNKTE im Frühjahr
  // nicht. Ein gemeinsamer Deckel würde den Punkt-Bezug unbrauchbar machen.
  it("erlaubt beim Punkte-Bezug größere Abstände als beim Platz", () => {
    expect(sanitizeTabellenBonus({ bezug: "punkte", abAbstand: 40 }).abAbstand).toBe(40);
    expect(sanitizeTabellenBonus({ bezug: "platz", abAbstand: 40 }).abAbstand).toBe(25);
  });

  it("nimmt nur bekannte Werte für bezug, richtung und fallback", () => {
    const c = sanitizeTabellenBonus({ bezug: "quatsch", richtung: "quatsch", fallback: "quatsch" });
    expect(c.bezug).toBe("platz");
    expect(c.richtung).toBe("nurAussenseiter");
    expect(c.fallback).toBe("quote");
  });
});

describe("aussenseiterNachTabelle", () => {
  it("erkennt den schlechter platzierten als Außenseiter", () => {
    expect(aussenseiterNachTabelle(SNAP, sanitizeTabellenBonus(AN))).toBe(1);
  });

  // ⚠️ Beim PLATZ ist die größere Zahl schlechter, bei PUNKTEN die kleinere.
  // Ein Vorzeichenfehler gäbe den Bonus dem Favoriten.
  it("dreht das Vorzeichen beim Punkte-Bezug nicht um", () => {
    const cfg = sanitizeTabellenBonus({ ...AN, bezug: "punkte", abAbstand: 10 });
    expect(aussenseiterNachTabelle(SNAP, cfg)).toBe(1);
  });

  it("gibt 0 bei zu geringem Abstand — aber null ohne Tabelle", () => {
    const eng = { ...SNAP, tabellenPlatz: { home: 8, away: 6 } };
    expect(aussenseiterNachTabelle(eng, sanitizeTabellenBonus(AN))).toBe(0);
    const ohne = { ...SNAP, tabellenPlatz: undefined };
    expect(aussenseiterNachTabelle(ohne, sanitizeTabellenBonus(AN))).toBeNull();
  });
});

describe("tabellenBonusAufschlag", () => {
  const tippAussenseiter = { home: 2, away: 1 };
  const tippFavorit = { home: 0, away: 2 };

  it("zahlt nur, wenn der Außenseiter-Tipp AUFGEHT", () => {
    const r = regeln();
    expect(tabellenBonusAufschlag(tippAussenseiter, SNAP, r, { home: 2, away: 1 })).toBe(0.2);
    expect(tabellenBonusAufschlag(tippAussenseiter, SNAP, r, { home: 0, away: 3 })).toBe(0);
  });

  // 🔴 Dieselbe Lehre wie beim Mut-Bonus: ohne Erfolgskopplung gewinnt, wer
  // IMMER den Schlechteren tippt — der Aufschlag wäre garantiert.
  it("zahlt ohne Ergebnis nichts, solange nurWennRichtig gilt", () => {
    expect(tabellenBonusAufschlag(tippAussenseiter, SNAP, regeln(), null)).toBe(0);
  });

  it("wird zum Spielgewicht, wenn nurWennRichtig aus ist", () => {
    const r = regeln({ nurWennRichtig: false });
    expect(tabellenBonusAufschlag(tippAussenseiter, SNAP, r, null)).toBe(0.2);
  });

  it("gibt für den Favoriten-Tipp nichts — und dämpft nur auf Ansage", () => {
    expect(tabellenBonusAufschlag(tippFavorit, SNAP, regeln(), { home: 0, away: 2 })).toBe(0);
    const r = regeln({ richtung: "auchFavorit" });
    expect(tabellenBonusAufschlag(tippFavorit, SNAP, r, { home: 0, away: 2 })).toBe(-0.2);
  });

  it("wertet einen Remis-Tipp nicht als Mut", () => {
    expect(tabellenBonusAufschlag({ home: 1, away: 1 }, SNAP, regeln(), { home: 1, away: 1 })).toBe(0);
  });

  it("greift vor abSpieltag nicht über die Tabelle", () => {
    const frueh = { ...SNAP, matchday: 2 };
    // Fallback „aus": gar nichts.
    const r = regeln({ fallback: "aus" });
    expect(tabellenBonusAufschlag({ home: 2, away: 1 }, frueh, r, { home: 2, away: 1 })).toBe(0);
  });

  // 🔴 Der Fallback ist der Grund, warum der Modifikator an Spieltag 1 nicht
  // still verschwindet. Heim-Quote 6,5 gegen Auswärts-Quote 1,5 = klarer
  // Außenseiter, auch ohne jede Tabelle.
  it("fällt ohne Tabelle auf die Quote zurück", () => {
    const ohne = { ...SNAP, matchday: 1, tabellenPlatz: undefined, tabellenPunkte: undefined };
    expect(tabellenBonusAufschlag({ home: 2, away: 1 }, ohne, regeln(), { home: 2, away: 1 })).toBe(0.2);
  });

  it("bleibt still, wenn er aus ist", () => {
    const aus = { ...DEFAULT_RULES, tabellenBonus: DEFAULT_TABELLENBONUS };
    expect(tabellenBonusAufschlag({ home: 2, away: 1 }, SNAP, aus, { home: 2, away: 1 })).toBe(0);
  });
});

describe("Zusammenspiel mit totalModifier", () => {
  // ⚠️ Der Kern der Bauentscheidung: der Bonus muss auch OHNE Joker wirken.
  // Läge er in `jokerAufschlaege`, wäre er hier still, weil joker.enabled aus ist.
  it("wirkt, obwohl keine Joker eingeschaltet sind", () => {
    const r = sanitizeRules(regeln());
    expect(r.joker.enabled).toBe(false);
    const m = totalModifier({ home: 2, away: 1 }, SNAP, r, { home: 2, away: 1 });
    expect(m.tabelle).toBe(0.2);
    expect(m.faktor).toBeCloseTo(1.2, 3);
  });

  it("bleibt unter dem Deckel modCap", () => {
    const r = sanitizeRules({ ...regeln({ aufschlag: 1.5 }), modCap: 1.3 });
    const m = totalModifier({ home: 2, away: 1 }, SNAP, r, { home: 2, away: 1 });
    expect(m.faktor).toBe(1.3);
    expect(m.gedeckelt).toBe(true);
  });

  // Ein Dämpfer darf das Vorzeichen der Wertung nie umdrehen.
  it("dreht mit dem Favoriten-Dämpfer nie ins Negative", () => {
    const r = sanitizeRules(regeln({ richtung: "auchFavorit", aufschlag: 1.5 }));
    const m = totalModifier({ home: 0, away: 2 }, SNAP, r, { home: 0, away: 2 });
    expect(m.faktor).toBeGreaterThanOrEqual(0);
  });
});

describe("beschreibeTabellenBonus", () => {
  it("sagt aus, wenn er aus ist", () => {
    expect(beschreibeTabellenBonus({ tabellenBonus: DEFAULT_TABELLENBONUS })).toBe("aus");
  });

  it("nennt Abstand, Höhe und Bedingung im Klartext", () => {
    const t = beschreibeTabellenBonus(regeln({ abAbstand: 6 }));
    expect(t).toContain("6 Plätze");
    expect(t).toContain("+20 %");
    expect(t).toContain("nur bei richtigem Tipp");
  });
});
