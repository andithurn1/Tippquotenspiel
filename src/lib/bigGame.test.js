import { describe, it, expect } from "vitest";
import {
  DEFAULT_BIGGAME, BIGGAME_LIMITS, sanitizeBigGame,
  zonenWert, spannungsWert, bigGameFuer, bigGameAufschlag,
} from "@/lib/bigGame";
import { rangliste } from "@/lib/saisonwetten";
import { DEFAULT_RULES, sanitizeRules, totalModifier, maxTotalModifier } from "@/lib/engine";

// ── Eine kleine Liga bauen ──────────────────────────────────
// 18 Teams, T01 gewinnt am meisten, T18 am wenigsten — dadurch ist der Rang
// eines Teams direkt aus seinem Namen ablesbar und die Tests bleiben lesbar.
const TEAMS = Array.from({ length: 18 }, (_, i) => `T${String(i + 1).padStart(2, "0")}`);

function ligaMitTabelle() {
  const matches = [];
  // Jeder spielt gegen jeden einmal; das Team mit der kleineren Nummer gewinnt.
  for (let i = 0; i < TEAMS.length; i++) {
    for (let j = i + 1; j < TEAMS.length; j++) {
      matches.push({ home: TEAMS[i], away: TEAMS[j], result: { home: 2, away: 0 } });
    }
  }
  return rangliste(matches);
}
const TAB = ligaMitTabelle();

const snap = (home, away, { h = 2.5, a = 2.5, derby = false } = {}) => ({
  matchId: `${home}-${away}`, home, away, derby,
  winner: { home: h, draw: 3.4, away: a },
});

describe("Tabelle", () => {
  it("die Rangliste ist durchnummeriert und sortiert", () => {
    expect(TAB.length).toBe(18);
    expect(TAB[0].team).toBe("T01");
    expect(TAB[17].team).toBe("T18");
    expect(TAB.map((t) => t.rang)).toEqual(TAB.map((_, i) => i + 1));
  });
});

describe("Zonenwert", () => {
  it("oben und unten steht viel auf dem Spiel, in der Mitte nichts", () => {
    expect(zonenWert(1, 18)).toBe(1);
    expect(zonenWert(18, 18)).toBe(1);
    expect(zonenWert(9, 18)).toBe(0);
    expect(zonenWert(10, 18)).toBe(0);
  });

  it("er fällt von oben nach unten monoton, bis der Abstiegskampf beginnt", () => {
    for (let r = 1; r < 8; r++) {
      expect(zonenWert(r, 18)).toBeGreaterThanOrEqual(zonenWert(r + 1, 18));
    }
    for (let r = 12; r < 18; r++) {
      expect(zonenWert(r, 18)).toBeLessThanOrEqual(zonenWert(r + 1, 18));
    }
  });

  it("die Formel arbeitet mit Anteilen, gilt also auch für andere Ligagrößen", () => {
    expect(zonenWert(1, 20)).toBe(1);
    expect(zonenWert(20, 20)).toBe(1);
    expect(zonenWert(10, 20)).toBe(0);
  });

  it("Unsinn ergibt 0 statt NaN", () => {
    expect(zonenWert(undefined, 18)).toBe(0);
    expect(zonenWert(1, 1)).toBe(0);
  });
});

describe("Spannungswert", () => {
  const ctx = { tabelle: TAB, spieltag: 30, gesamtSpieltage: 34 };

  it("Spitzenspiel schlägt Mittelfeld — auch wenn das Mittelfeld ausgeglichener ist", () => {
    // Genau der Fehler, den die naive Loesung macht: 9. gegen 10. ist maximal
    // ausgeglichen und trotzdem belanglos.
    const spitze = spannungsWert({ snap: snap("T01", "T02", { h: 2.1, a: 3.4 }), ...ctx });
    const mitte = spannungsWert({ snap: snap("T09", "T10", { h: 2.5, a: 2.5 }), ...ctx });
    expect(spitze.wert).toBeGreaterThan(mitte.wert);
    expect(mitte.teile.quoten).toBeGreaterThan(spitze.teile.quoten);
  });

  it("Kellerduell zählt genauso wie Spitzenspiel — auch unten geht es um alles", () => {
    const keller = spannungsWert({ snap: snap("T17", "T18"), ...ctx });
    const mitte = spannungsWert({ snap: snap("T09", "T10"), ...ctx });
    expect(keller.wert).toBeGreaterThan(mitte.wert);
  });

  it("das Derby ist ein Zuschlag, kein Freifahrtschein", () => {
    const derbyMitte = spannungsWert({ snap: snap("T09", "T10", { derby: true }), ...ctx });
    const ohne = spannungsWert({ snap: snap("T09", "T10"), ...ctx });
    const spitze = spannungsWert({ snap: snap("T01", "T02"), ...ctx });
    expect(derbyMitte.wert).toBeGreaterThan(ohne.wert);
    expect(derbyMitte.wert).toBeLessThan(spitze.wert);
  });

  it("später in der Saison zählt dasselbe Spiel mehr", () => {
    const frueh = spannungsWert({ snap: snap("T01", "T02"), tabelle: TAB, spieltag: 3, gesamtSpieltage: 34 });
    const spaet = spannungsWert({ snap: snap("T01", "T02"), tabelle: TAB, spieltag: 33, gesamtSpieltage: 34 });
    expect(spaet.wert).toBeGreaterThan(frueh.wert);
    expect(spaet.roh).toBe(frueh.roh);   // der Zeitpunkt ist ein FAKTOR, kein Signal
  });

  it("ohne Tabelle bleibt nur die Quoten-Ausgeglichenheit", () => {
    const s = spannungsWert({ snap: snap("X", "Y", { h: 2.5, a: 2.5 }), tabelle: [] });
    expect(s.teile.zone).toBe(0);
    expect(s.teile.quoten).toBeGreaterThan(0.9);
    expect(s.wert).toBeGreaterThan(0);
  });
});

describe("Auswahl des Big Game", () => {
  const spieltag = [
    snap("T09", "T10", { h: 2.5, a: 2.5 }),
    snap("T01", "T02", { h: 2.2, a: 3.1 }),
    snap("T05", "T14"),
  ];
  const opt = { tabelle: TAB, spieltag: 30, gesamtSpieltage: 34, bigGame: { ...DEFAULT_BIGGAME, enabled: true } };

  it("wählt das Spitzenspiel", () => {
    expect(bigGameFuer(spieltag, opt).matchId).toBe("T01-T02");
  });

  it("liefert eine Begründung in Fußball-Sprache", () => {
    const b = bigGameFuer(spieltag, opt).begruendung;
    expect(b).toContain("Platz 1 gegen Platz 2");
    expect(b).toContain("Nachbarn");
  });

  it("ist ausgeschaltet ein No-op", () => {
    expect(bigGameFuer(spieltag, { ...opt, bigGame: DEFAULT_BIGGAME })).toBeNull();
  });

  it("kein Big Game, wenn kein Spiel die Schwelle reißt", () => {
    const langweilig = [snap("T08", "T11"), snap("T09", "T12")];
    expect(bigGameFuer(langweilig, { ...opt, spieltag: 2 })).toBeNull();
  });

  it("bei Gleichstand entscheidet die matchId, nicht die Ladereihenfolge", () => {
    const a = [snap("T01", "T02"), snap("T02", "T01")];
    const erste = bigGameFuer(a, opt).matchId;
    const zweite = bigGameFuer([...a].reverse(), opt).matchId;
    expect(erste).toBe(zweite);
  });

  it("derselbe Tabellenstand ergibt immer dasselbe Big Game", () => {
    expect(bigGameFuer(spieltag, opt)).toEqual(bigGameFuer(spieltag, opt));
  });
});

describe("Regelwerk & Modifikator", () => {
  it("Unsinn wird auf die Standardwerte zurückgeholt", () => {
    expect(sanitizeBigGame({ enabled: "ja", aufschlag: 99, minSpannung: -5 }))
      .toEqual({ enabled: false, aufschlag: BIGGAME_LIMITS.aufschlag.max, minSpannung: BIGGAME_LIMITS.minSpannung.min });
    expect(sanitizeBigGame()).toEqual(DEFAULT_BIGGAME);
  });

  it("das Regelwerk trägt es mit — also auch der Creator-Code", () => {
    expect(DEFAULT_RULES.bigGame).toEqual(DEFAULT_BIGGAME);
    const r = sanitizeRules({ ...DEFAULT_RULES, bigGame: { enabled: true, aufschlag: 0.4, minSpannung: 0.5 } });
    expect(r.bigGame).toEqual({ enabled: true, aufschlag: 0.4, minSpannung: 0.5 });
    expect(sanitizeRules(r)).toEqual(r);
  });

  it("der Aufschlag greift nur am markierten Spiel", () => {
    const rules = sanitizeRules({ ...DEFAULT_RULES, bigGame: { enabled: true, aufschlag: 0.5 } });
    expect(bigGameAufschlag({ bigGame: true }, rules)).toBe(0.5);
    expect(bigGameAufschlag({ bigGame: false }, rules)).toBe(0);
    expect(bigGameAufschlag({ bigGame: true }, DEFAULT_RULES)).toBe(0);
  });

  it("er landet im SELBEN additiven Topf wie Derby — nicht daneben", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES, modCap: 4,
      bigGame: { enabled: true, aufschlag: 0.5 },
      teamMods: { derbyFaktor: 1.5, teams: {} },
      joker: { ...DEFAULT_RULES.joker, enabled: true, modus: "einzel", faktor: 2 },
    });
    const s = { home: "A", away: "B", derby: true, bigGame: true };
    // 1 + 1,0 (Joker) + 0,5 (Derby) + 0,5 (Big Game) = 3,0 — additiv,
    // multiplikativ waeren es 2 × 1,5 × 1,5 = 4,5.
    expect(totalModifier({ joker: true }, s, rules).faktor).toBeCloseTo(3, 2);
  });

  it("der Deckel greift auch über das Big Game", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES, modCap: 1.3,
      bigGame: { enabled: true, aufschlag: 0.5 },
    });
    const t = totalModifier({}, { home: "A", away: "B", bigGame: true }, rules);
    expect(t.faktor).toBeCloseTo(1.3, 2);
    expect(t.gedeckelt).toBe(true);
  });

  it("die Skalierungs-Empfehlung rechnet ihn mit ein", () => {
    const ohne = sanitizeRules({ ...DEFAULT_RULES, modCap: 4 });
    const mit = sanitizeRules({ ...ohne, bigGame: { enabled: true, aufschlag: 0.5 } });
    expect(maxTotalModifier(mit)).toBeGreaterThan(maxTotalModifier(ohne));
  });
});
