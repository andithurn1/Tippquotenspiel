import { describe, it, expect } from "vitest";
import {
  EREIGNIS_TYPEN, EREIGNIS, EREIGNIS_LIMITS, DEFAULT_EREIGNISSE, AUSWERTBARE_TYPEN,
  istAuswertbar, sanitizeEreignisse, auswerten, konflikte, beschreibeEreignisse,
} from "@/lib/ereignisse";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";

// Ein Eintrag, wie ihn `getRoundEntries` liefert.
const e = (userId, matchday, matchId, tip, result, quote = { home: 2, away: 3 }) => ({
  userId, name: userId, matchday, matchId, tip, result,
  snapshot: { matchId, winner: { home: quote.home, draw: 3.4, away: quote.away } },
});

const AN = (aktive, extra = {}) => ({ enabled: true, maxErspielt: 99, aktive, ...extra });

describe("Katalog", () => {
  it("jeder Typ ist vollständig beschrieben", () => {
    for (const t of EREIGNIS_TYPEN) {
      expect(t.key && t.label && t.hint && t.kategorie).toBeTruthy();
      expect(Array.isArray(t.braucht)).toBe(true);
      expect(t.standard.belohnung).toBeGreaterThanOrEqual(EREIGNIS_LIMITS.belohnung.min);
    }
    expect(new Set(EREIGNIS_TYPEN.map((t) => t.key)).size).toBe(EREIGNIS_TYPEN.length);
  });

  it("Herausforderungen sind vorbereitet, aber (noch) nicht auswertbar", () => {
    // Gleiches Muster wie Karten/Fouls bei den Saison-Wetten: im Katalog
    // sichtbar, aber nicht aktivierbar — statt still nie auszulösen.
    expect(istAuswertbar("quiz")).toBe(false);
    expect(istAuswertbar("duell")).toBe(false);
    expect(AUSWERTBARE_TYPEN.some((t) => t.kategorie === "herausforderung")).toBe(false);
    expect(AUSWERTBARE_TYPEN.length).toBeGreaterThan(0);
  });
});

describe("Bereinigung", () => {
  it("Unsinn wird auf den Standard zurückgeholt", () => {
    expect(sanitizeEreignisse({ enabled: "ja", aktive: "nein" })).toEqual(DEFAULT_EREIGNISSE);
    expect(sanitizeEreignisse()).toEqual(DEFAULT_EREIGNISSE);
  });

  it("nicht auswertbare Ereignisse lassen sich gar nicht aktivieren", () => {
    const s = sanitizeEreignisse(AN([{ key: "quiz" }, { key: "serie" }]));
    expect(s.aktive.map((a) => a.key)).toEqual(["serie"]);
  });

  it("ohne aktives Ereignis ist es aus — sonst wäre es eine stumme Regel", () => {
    expect(sanitizeEreignisse({ enabled: true, aktive: [] }).enabled).toBe(false);
  });

  it("Dubletten und Grenzwerte werden behandelt", () => {
    const s = sanitizeEreignisse(AN([
      { key: "serie", anzahl: 99, belohnung: 99 },
      { key: "serie", anzahl: 3 },
    ], { maxErspielt: 999 }));
    expect(s.aktive).toHaveLength(1);
    expect(s.aktive[0].anzahl).toBe(EREIGNIS_LIMITS.anzahl.max);
    expect(s.aktive[0].belohnung).toBe(EREIGNIS_LIMITS.belohnung.max);
    expect(s.maxErspielt).toBe(EREIGNIS_LIMITS.maxErspielt.max);
  });

  it("fehlende Werte kommen aus dem Standard des Typs", () => {
    const s = sanitizeEreignisse(AN([{ key: "aussenseiter" }]));
    expect(s.aktive[0].abQuote).toBe(EREIGNIS.aussenseiter.standard.abQuote);
  });
});

describe("Meilensteine", () => {
  it("Serie löst bei jedem vollen Durchlauf erneut aus", () => {
    const eintraege = [1, 2, 3, 4, 5, 6].map((md) => e("u1", md, `m${md}`, { home: 1, away: 0 }, null));
    const r = auswerten({ eintraege, ereignisse: AN([{ key: "serie", anzahl: 3, belohnung: 1 }]) });
    expect(r.gutschriften.filter((g) => g.key === "serie")).toHaveLength(2);
  });

  it("eine Lücke setzt die Serie zurück", () => {
    const meine = [1, 2, 4, 5].map((md) => e("u1", md, `m${md}`, { home: 1, away: 0 }, null));
    const alle = [...meine, e("u2", 3, "m3", { home: 1, away: 0 }, null)];
    const r = auswerten({
      eintraege: meine, alleEintraege: alle,
      ereignisse: AN([{ key: "serie", anzahl: 3, belohnung: 1 }]),
    });
    expect(r.gutschriften).toHaveLength(0);
  });

  it("der erste exakte Treffer zählt genau einmal", () => {
    const eintraege = [
      e("u1", 1, "m1", { home: 2, away: 1 }, { home: 2, away: 1 }),
      e("u1", 2, "m2", { home: 0, away: 0 }, { home: 0, away: 0 }),
    ];
    const r = auswerten({ eintraege, ereignisse: AN([{ key: "erster-exakter", belohnung: 1 }]) });
    expect(r.gutschriften).toHaveLength(1);
    expect(r.gutschriften[0].matchday).toBe(1);
  });

  it("Außenseiter zählt nur, wenn der Tipp AUFGEHT", () => {
    // Sonst würde blindes Dagegenhalten belohnt — dieselbe Regel wie beim
    // Mut-Joker in der Engine.
    const richtig = e("u1", 1, "m1", { home: 0, away: 2 }, { home: 0, away: 2 }, { home: 1.3, away: 8 });
    const falsch = e("u1", 2, "m2", { home: 0, away: 2 }, { home: 3, away: 0 }, { home: 1.3, away: 8 });
    const r = auswerten({
      eintraege: [richtig, falsch],
      ereignisse: AN([{ key: "aussenseiter", abQuote: 5, belohnung: 1 }]),
    });
    expect(r.gutschriften).toHaveLength(1);
    expect(r.gutschriften[0].matchday).toBe(1);
  });

  it("ein Favoritensieg ist kein Außenseiter-Treffer", () => {
    const favorit = e("u1", 1, "m1", { home: 2, away: 0 }, { home: 2, away: 0 }, { home: 1.3, away: 8 });
    const r = auswerten({
      eintraege: [favorit],
      ereignisse: AN([{ key: "aussenseiter", abQuote: 5, belohnung: 1 }]),
    });
    expect(r.gutschriften).toHaveLength(0);
  });

  it("„alle Spiele getippt“ vergleicht mit dem, was die Runde getippt hat", () => {
    const alle = [
      e("u1", 1, "a", { home: 1, away: 0 }, null),
      e("u1", 1, "b", { home: 1, away: 0 }, null),
      e("u2", 1, "c", { home: 1, away: 0 }, null),
    ];
    const meine = alle.filter((x) => x.userId === "u1");
    const r = auswerten({
      eintraege: meine, alleEintraege: alle,
      ereignisse: AN([{ key: "spieltag-komplett", belohnung: 1 }]),
    });
    expect(r.gutschriften).toHaveLength(0);   // Spiel „c" fehlt

    const vollstaendig = [...meine, e("u1", 1, "c", { home: 2, away: 2 }, null)];
    const r2 = auswerten({
      eintraege: vollstaendig, alleEintraege: [...alle, vollstaendig[2]],
      ereignisse: AN([{ key: "spieltag-komplett", belohnung: 1 }]),
    });
    expect(r2.gutschriften).toHaveLength(1);
  });
});

describe("Mehrere Wettbewerbe — ein Spieltag ist erst mit dem Wettbewerb eindeutig", () => {
  // Ein Eintrag mit Wettbewerb und Anpfiff, wie ihn `getRoundEntries` liefert.
  const ew = (userId, wettbewerb, matchday, matchId, kickoff) => ({
    userId, name: userId, wettbewerb, matchday, matchId, kickoff,
    tip: { home: 1, away: 0 }, result: null,
    snapshot: { matchId, winner: { home: 2, draw: 3.4, away: 3 } },
  });

  it("„alle Spiele des Spieltags“ zählt je Wettbewerb, nicht über alle zusammen", () => {
    // Der teuerste Fall der ganzen Fehlerklasse: über die nackte Zahl gruppiert
    // verlangte „Spieltag 1 vollständig" die Spiele ALLER fünf Ligen — und
    // löste damit nie wieder aus.
    const alle = [
      ew("u1", "bl", 1, "bl-a", "2026-08-28T18:30:00Z"),
      ew("u1", "bl", 1, "bl-b", "2026-08-29T13:30:00Z"),
      ew("u2", "cl", 1, "cl-a", "2026-09-15T19:00:00Z"),
    ];
    const meine = alle.filter((x) => x.userId === "u1");   // beide BL-Spiele
    const r = auswerten({
      eintraege: meine, alleEintraege: alle,
      ereignisse: AN([{ key: "spieltag-komplett", belohnung: 1 }]),
    });
    expect(r.gutschriften).toHaveLength(1);
    expect(r.gutschriften[0].wettbewerb).toBe("bl");
    expect(r.gutschriften[0].matchday).toBe(1);
  });

  it("die Serie zählt Spieltage chronologisch über Wettbewerbe hinweg", () => {
    // Dranbleiben heißt: keinen Spieltag auslassen, der überhaupt anstand —
    // auch keinen aus dem zweiten Wettbewerb.
    const alle = [
      ew("u1", "bl", 1, "bl-1", "2026-08-28T18:30:00Z"),
      ew("u1", "cl", 1, "cl-1", "2026-09-15T19:00:00Z"),
      ew("u1", "bl", 2, "bl-2", "2026-09-20T15:30:00Z"),
    ];
    const r = auswerten({
      eintraege: alle, alleEintraege: alle,
      ereignisse: AN([{ key: "serie", anzahl: 3, belohnung: 1 }]),
    });
    expect(r.gutschriften).toHaveLength(1);
    // Ausgelöst am zuletzt gespielten Spieltag der Serie.
    expect(r.gutschriften[0].wettbewerb).toBe("bl");
    expect(r.gutschriften[0].matchday).toBe(2);
  });

  it("eine Lücke in einem Wettbewerb unterbricht die Serie", () => {
    const alle = [
      ew("u1", "bl", 1, "bl-1", "2026-08-28T18:30:00Z"),
      ew("u2", "cl", 1, "cl-1", "2026-09-15T19:00:00Z"),   // u1 hat nicht getippt
      ew("u1", "bl", 2, "bl-2", "2026-09-20T15:30:00Z"),
    ];
    const r = auswerten({
      eintraege: alle.filter((x) => x.userId === "u1"), alleEintraege: alle,
      ereignisse: AN([{ key: "serie", anzahl: 2, belohnung: 1 }]),
    });
    expect(r.gutschriften).toHaveLength(0);
  });

  it("der Trost-Joker sucht den Letzten je Wettbewerbs-Spieltag", () => {
    const alle = [ew("u1", "bl", 1, "bl-1", "2026-08-28T18:30:00Z")];
    const r = auswerten({
      eintraege: alle, alleEintraege: alle,
      ereignisse: AN([{ key: "letzter-am-spieltag", belohnung: 1 }]),
      spieltagsPunkte: [
        { wettbewerb: "bl", matchday: 1, userId: "u1", punkte: 10 },
        { wettbewerb: "bl", matchday: 1, userId: "u2", punkte: 50 },
        // Im CL-Spieltag 1 ist u1 NICHT Letzter — über die nackte Zahl
        // zusammengeworfen wäre der Vergleich ein anderer gewesen.
        { wettbewerb: "cl", matchday: 1, userId: "u1", punkte: 80 },
        { wettbewerb: "cl", matchday: 1, userId: "u2", punkte: 20 },
      ],
    });
    expect(r.gutschriften).toHaveLength(1);
    expect(r.gutschriften[0].wettbewerb).toBe("bl");
  });
});

describe("Trost-Joker", () => {
  const punkte = [
    { matchday: 1, userId: "u1", punkte: 10 },
    { matchday: 1, userId: "u2", punkte: 50 },
    { matchday: 2, userId: "u1", punkte: 90 },
    { matchday: 2, userId: "u2", punkte: 20 },
  ];
  const meine = [1, 2].map((md) => e("u1", md, `m${md}`, { home: 1, away: 0 }, null));

  it("greift nur am wirklich letzten Platz", () => {
    const r = auswerten({
      eintraege: meine, ereignisse: AN([{ key: "letzter-am-spieltag", belohnung: 1 }]),
      spieltagsPunkte: punkte,
    });
    expect(r.gutschriften).toHaveLength(1);
    expect(r.gutschriften[0].matchday).toBe(1);
  });

  it("bei Gleichstand gibt es nichts", () => {
    // Ein gemeinsamer schwacher Spieltag ist kein Missgeschick.
    const gleich = [
      { matchday: 1, userId: "u1", punkte: 10 },
      { matchday: 1, userId: "u2", punkte: 10 },
    ];
    const r = auswerten({
      eintraege: meine, ereignisse: AN([{ key: "letzter-am-spieltag", belohnung: 1 }]),
      spieltagsPunkte: gleich,
    });
    expect(r.gutschriften).toHaveLength(0);
  });

  it("ohne Spieltagspunkte wird es einfach nicht ausgewertet", () => {
    const r = auswerten({ eintraege: meine, ereignisse: AN([{ key: "letzter-am-spieltag", belohnung: 1 }]) });
    expect(r.gutschriften).toHaveLength(0);
  });
});

describe("Der Deckel ist die Fairness-Sicherung", () => {
  it("mehr als maxErspielt gibt es nicht", () => {
    const eintraege = Array.from({ length: 12 }, (_, i) =>
      e("u1", i + 1, `m${i}`, { home: 1, away: 0 }, null));
    const r = auswerten({
      eintraege,
      ereignisse: { enabled: true, maxErspielt: 2, aktive: [{ key: "serie", anzahl: 2, belohnung: 1 }] },
    });
    expect(r.gesamt).toBe(2);
    expect(r.gedeckelt).toBe(true);
    expect(r.verworfen).toBeGreaterThan(0);
  });

  it("gedeckelt wird chronologisch — die FRÜHEN zählen", () => {
    const eintraege = [1, 2, 3, 4].map((md) => e("u1", md, `m${md}`, { home: 1, away: 0 }, null));
    const r = auswerten({
      eintraege,
      ereignisse: { enabled: true, maxErspielt: 1, aktive: [{ key: "serie", anzahl: 2, belohnung: 1 }] },
    });
    expect(r.gutschriften).toHaveLength(1);
    expect(r.gutschriften[0].matchday).toBe(2);
  });

  it("ausgeschaltet ist ein No-op", () => {
    const r = auswerten({ eintraege: [], ereignisse: DEFAULT_EREIGNISSE });
    expect(r).toEqual({ gutschriften: [], gesamt: 0, gedeckelt: false, verworfen: 0 });
  });
});

describe("Konflikte mit bestehenden Regeln", () => {
  it("Trost-Joker plus Anschluss-Bonus wird gemeldet", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      aufholen: { ...DEFAULT_RULES.aufholen, enabled: true },
      ereignisse: AN([{ key: "letzter-am-spieltag", belohnung: 1 }]),
    });
    const k = konflikte(rules);
    expect(k).toHaveLength(1);
    expect(k[0].text.toLowerCase()).toContain("doppelt");
  });

  it("ohne Anschluss-Bonus ist der Trost-Joker unauffällig", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      ereignisse: AN([{ key: "letzter-am-spieltag", belohnung: 1 }]),
    });
    expect(konflikte(rules)).toEqual([]);
  });
});

describe("Im Regelwerk und im Creator-Code", () => {
  it("ist Teil des Regelwerks", () => {
    expect(DEFAULT_RULES.ereignisse).toEqual(DEFAULT_EREIGNISSE);
  });

  it("übersteht sanitizeRules unverändert", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      ereignisse: AN([{ key: "serie", anzahl: 4, belohnung: 2 }], { maxErspielt: 6 }),
    });
    // Die Begrenzer stehen seit 30.07. an JEDEM Eintrag, Vorgabe 0 = aus.
    expect(rules.ereignisse.aktive[0]).toEqual({
      key: "serie", anzahl: 4, belohnung: 2, abstand: 0, maxProSaison: 0,
    });
    expect(sanitizeRules(rules)).toEqual(rules);
  });

  it("beschreibt sich in einem Satz", () => {
    expect(beschreibeEreignisse(DEFAULT_EREIGNISSE)).toContain("nur vom Admin");
    expect(beschreibeEreignisse(AN([{ key: "serie" }], { maxErspielt: 4 }))).toContain("4");
  });
});

// ── Begrenzer: der zweite Wert zu jeder Option ──────────────
// `maxErspielt` deckelt die SUMME und sagt nichts darüber, wie oft ein
// EINZELNES Ereignis feuert. Genau dort sitzt die farmbare Serie.
describe("Begrenzer je Ereignis", () => {
  // Zwölf Spieltage am Stück getippt: „3 in Folge" löst ohne Bremse viermal aus.
  const zwoelf = Array.from({ length: 12 }, (_, i) =>
    e("ich", i + 1, `m${i + 1}`, { home: 1, away: 0 }, { home: 1, away: 0 }));

  it("ohne Begrenzer bleibt alles wie bisher", () => {
    const r = auswerten({ eintraege: zwoelf, ereignisse: AN([{ key: "serie", anzahl: 3, belohnung: 1 }]) });
    expect(r.gutschriften).toHaveLength(4);
    expect(r.gebremst).toBe(0);
  });

  it("abstand bremst die Wiederholung — das Gegenmittel gegen farmbare Serien", () => {
    const r = auswerten({
      eintraege: zwoelf,
      ereignisse: AN([{ key: "serie", anzahl: 3, belohnung: 1, abstand: 5 }]),
    });
    expect(r.gutschriften.length).toBeLessThan(4);
    expect(r.gebremst).toBeGreaterThan(0);
  });

  it("maxProSaison kappt die Anzahl hart", () => {
    const r = auswerten({
      eintraege: zwoelf,
      ereignisse: AN([{ key: "serie", anzahl: 3, belohnung: 1, maxProSaison: 2 }]),
    });
    expect(r.gutschriften).toHaveLength(2);
    expect(r.gebremst).toBe(2);
  });

  it("gebremst und verworfen bleiben getrennt", () => {
    // Sonst kann man dem Admin nicht sagen, an welcher Schraube er drehen muss:
    // das eine ist eine Regel des Ereignisses, das andere der Gesamtdeckel.
    const r = auswerten({
      eintraege: zwoelf,
      ereignisse: AN([{ key: "serie", anzahl: 3, belohnung: 1, maxProSaison: 3 }], { maxErspielt: 2 }),
    });
    expect(r.gebremst).toBe(1);      // der vierte Treffer wurde gebremst
    expect(r.verworfen).toBe(1);     // vom Rest fiel einer unter den Deckel
    expect(r.gutschriften).toHaveLength(2);
  });

  it("die frühen zählen — gebremst wird chronologisch", () => {
    const r = auswerten({
      eintraege: zwoelf,
      ereignisse: AN([{ key: "serie", anzahl: 3, belohnung: 1, maxProSaison: 1 }]),
    });
    expect(r.gutschriften[0].matchday).toBe(3);
  });

  it("die Begrenzer laufen durch sanitize und werden beschnitten", () => {
    const c = sanitizeEreignisse(AN([{ key: "serie", abstand: 99, maxProSaison: -5 }]));
    expect(c.aktive[0].abstand).toBe(EREIGNIS_LIMITS.abstand.max);
    expect(c.aktive[0].maxProSaison).toBe(0);
  });
});
