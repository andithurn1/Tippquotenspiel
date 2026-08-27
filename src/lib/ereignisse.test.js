import { describe, it, expect } from "vitest";
import {
  EREIGNIS_TYPEN, EREIGNIS, EREIGNIS_LIMITS, DEFAULT_EREIGNISSE, AUSWERTBARE_TYPEN,
  istAuswertbar, sanitizeEreignisse, auswerten, konflikte, beschreibeEreignisse,
  EREIGNIS_PRESETS, sanitizeAuswahl, beschreibeAuswahl,
  wirkungsVorgaenge, jackpotLage,
} from "@/lib/ereignisse";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";
import { CHARAKTERE } from "@/lib/charaktere";
import { REGLER, anwenden, erkenneStufe } from "@/lib/einfachRegler";

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
    // Die WAS-Achse (07.08.) ebenso: ohne Angabe „so viele Joker wie
    // `belohnung`" — dadurch ändert kein bestehender Creator-Code seine
    // Bedeutung. Für die WANN- und die WIE-LANGE-Achse gilt dasselbe: „immer"
    // und „sofort" sind genau das bisherige Verhalten.
    expect(rules.ereignisse.aktive[0]).toEqual({
      key: "serie", anzahl: 4, belohnung: 2, abstand: 0, maxProSaison: 0,
      wirkung: { typ: "joker", n: 2 }, ausloeser: { typ: "immer" },
      geltung: { typ: "sofort" },
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

// ── Die drei Komplexitätsstufen ─────────────────────────────
// 🔴 Bis 06.08.2026 kam `rules.ereignisse` NUR in der Profi-Ansicht vor: kein
// Charakter setzte sie, kein Regler in Stufe 2 erreichte sie. Genau das
// schließt der Baukasten-Grundsatz aus — „eine Einstellung, die nur in Stufe 3
// auftaucht, ist nicht fertig". Diese Tests halten den Zustand fest, damit er
// nicht beim nächsten Umbau wieder zurückfällt.
describe("Ereignisse sind auf allen drei Stufen erreichbar", () => {
  it("Stufe 1: jeder Charakter TRIFFT eine Entscheidung — auch „aus“ ist eine", () => {
    for (const c of CHARAKTERE) {
      expect(c.rules.ereignisse).toBeTruthy();
      // Und sie muss ein gültiges Regelwerk ergeben, nicht ein halbes.
      expect(sanitizeEreignisse(c.rules.ereignisse)).toEqual(c.rules.ereignisse);
    }
  });

  it("Stufe 1: mindestens ein Charakter hat sie an — sonst wäre die Ebene dort unsichtbar", () => {
    expect(CHARAKTERE.some((c) => c.rules.ereignisse.enabled)).toBe(true);
  });

  it("Stufe 2: der Regler „nebenbei“ deckt die Bibliothek ab und wird wiedererkannt", () => {
    const regler = REGLER.find((r) => r.key === "nebenbei");
    expect(regler).toBeTruthy();
    for (const stufe of regler.stufen) {
      const r = anwenden(DEFAULT_RULES, "nebenbei", stufe.key);
      expect(erkenneStufe(r, "nebenbei")).toBe(stufe.key);
    }
  });

  it("Stufe 2: die Stufen unterscheiden sich WIRKLICH, nicht nur im Namen", () => {
    const regler = REGLER.find((r) => r.key === "nebenbei");
    const fassungen = regler.stufen.map((s) => JSON.stringify(anwenden(DEFAULT_RULES, "nebenbei", s.key).ereignisse));
    expect(new Set(fassungen).size).toBe(regler.stufen.length);
  });

  it("Stufe 3: jedes Bibliotheks-Bündel ist ein gültiges Regelwerk und schaltet etwas ein", () => {
    for (const p of EREIGNIS_PRESETS) {
      const c = sanitizeEreignisse(p.ereignisse);
      // 🔴 Geprüft wird, dass nichts VERWORFEN wird — nicht, dass nichts
      // dazukommt. Die Bereinigung ergänzt fehlende Felder mit ihrer Vorgabe
      // (seit dem 27.08.2026 etwa `messlatte`/`schwelle` des Abstands-Modus),
      // und das ist ihre Aufgabe. Ein `toEqual` verlangte dagegen, dass jede
      // neue Vorgabe in JEDES Bündel der Bibliothek nachgetragen wird — dann
      // stünde in zehn Bündeln ein Wert, den dort niemand braucht.
      expect(c).toMatchObject(p.ereignisse);    // nichts wird stillschweigend verworfen
      expect(sanitizeEreignisse(c)).toEqual(c); // und zweimal säubern ändert nichts mehr
      expect(c.enabled).toBe(p.key !== "aus");  // nur „aus“ ist aus
      // ⚠️ Jeder aktive Eintrag muss AUSWERTBAR sein — ein Bündel mit einem
      // vorbereiteten Typ (Quiz, Duell) sähe eingeschaltet aus und täte nichts.
      for (const a of c.aktive) expect(istAuswertbar(a.key)).toBe(true);
    }
  });

  it("kein Bündel der Bibliothek erzeugt einen Konflikt mit dem Anschluss-Bonus …", () => {
    // … außer den ausdrücklich ausgleichenden, und DIE sollen ihn melden:
    // Trost-Joker bzw. Pechsträhne und Anschluss-Bonus belohnen beide das
    // Zurückliegen.
    //
    // ⚠️ Die Erwartung wird aus dem INHALT des Bündels abgeleitet, nicht aus
    // einer Liste von Schlüsseln. Mit einer festen Liste hätte der Test beim
    // nächsten Eintrag der Bibliothek angeschlagen, ohne dass etwas kaputt
    // gewesen wäre — und beim übernächsten hätte ihn jemand entschärft.
    const mitAufholen = { aufholen: { enabled: true, staerke: "mittel", schwelle: 0.05 } };
    for (const p of EREIGNIS_PRESETS) {
      const ausgleichend = sanitizeEreignisse(p.ereignisse).aktive.filter((a) =>
        EREIGNIS[a.key]?.doppeltMit === "aufholen" && (!a.auswahl || a.auswahl.ende === "unten"));
      const n = konflikte({ ...mitAufholen, ereignisse: p.ereignisse }).length;
      expect(n).toBe(ausgleichend.length);
    }
    // Gegenprobe, damit die abgeleitete Erwartung nicht einfach immer 0 ist:
    // mindestens ein Bündel MUSS melden, sonst prüft die Zeile nichts.
    expect(EREIGNIS_PRESETS.some((p) =>
      konflikte({ ...mitAufholen, ereignisse: p.ereignisse }).length > 0)).toBe(true);
  });

  it("die Wirkrichtung ist als ABGELEITET gekennzeichnet, nicht als gemessen", () => {
    // Solange keine Simulation dahintersteht, darf kein Eintrag behaupten,
    // seine Wirkrichtung sei belegt — das ist die Hausregel „die Herkunft wird
    // abgelesen, nicht behauptet".
    for (const p of EREIGNIS_PRESETS) expect(p.gemessen).toBe(false);
  });
});

// ── Die WEN-Achse (`auswahl.js`) ────────────────────────────
// 🔴 Vierter Fund derselben Sorte am 06.08.2026: `auswahl.js` hatte achtzehn
// Auswahl-Modi, eigene Tests und einen Export — und **niemand rief es auf**.
// Die zweite der vier Fragen jeder Mechanik (WANN · WEN · WAS · WIE LANGE)
// existierte nur auf dem Papier.
//
// Hier hängt sie jetzt: derselbe Ereignis-Eintrag ist Trost-Joker ODER
// Spieltags-Krone, je nach `auswahl.ende`. Gemessen über 54 Spiele und fünf
// Spieler (Gutschriften je Spieler):
//   der Letzte des Spieltags      6   {du:1, lena:0, kemal:2, max:2, jonas:1}
//   der Beste des Spieltags       6   {du:1, lena:1, kemal:2, max:0, jonas:2}
//   die 2 Letzten                12
//   das untere Fünftel (40 %)    12
//   das mittlere Feld            18
// Fünf Einstellungen, fünf verschiedene Verteilungen — und „der Beste" trifft
// andere Leute als „der Letzte" (max: 2 gegen 0).

describe("WEN trifft es — die Auswahl-Achse hängt dran", () => {
  const BASIS = { home: 1, away: 0, goals: { home: [], away: [] } };
  const punkte = (userId, matchday, p) => ({ userId, wettbewerb: "bl", matchday, punkte: p });
  // Fünf Spieler, ein Spieltag, klare Rangfolge ohne Gleichstand.
  const STAND = [
    punkte("a", 1, 100), punkte("b", 1, 80), punkte("c", 1, 60),
    punkte("d", 1, 40), punkte("e", 1, 20),
  ];
  const eintrag = (userId) => ({
    userId, name: userId, matchday: 1, matchId: "m1", wettbewerb: "bl",
    tip: BASIS, result: { home: 1, away: 0 },
    snapshot: { matchId: "m1", winner: { home: 2, draw: 3.4, away: 3 } },
  });
  const ALLE = ["a", "b", "c", "d", "e"].map(eintrag);

  const trifft = (auswahl) => ["a", "b", "c", "d", "e"].filter((u) => auswerten({
    eintraege: [eintrag(u)], alleEintraege: ALLE, spieltagsPunkte: STAND,
    ereignisse: { enabled: true, maxErspielt: 15, aktive: [{ key: "letzter-am-spieltag", belohnung: 1, auswahl }] },
  }).gutschriften.length > 0);

  it("`unten` trifft den Letzten, `oben` den Besten — derselbe Eintrag", () => {
    expect(trifft({ modus: "rang", ende: "unten", n: 1 })).toEqual(["e"]);
    expect(trifft({ modus: "rang", ende: "oben", n: 1 })).toEqual(["a"]);
  });

  it("`n` weitet die Auswahl", () => {
    expect(trifft({ modus: "rang", ende: "unten", n: 2 })).toEqual(["d", "e"]);
  });

  it("`perzentil` wächst mit der Rundengröße statt mit einer festen Zahl", () => {
    // 40 % von fünf sind zwei.
    expect(trifft({ modus: "perzentil", ende: "unten", prozent: 40 })).toEqual(["d", "e"]);
  });

  it("`mitte` trifft, wer weder vorn noch hinten steht", () => {
    expect(trifft({ modus: "mitte", prozent: 20 })).toEqual(["b", "c", "d"]);
  });

  it("die Vorgabe ist das bisherige Verhalten — kein stiller Regelwechsel", () => {
    const ohneFeld = ["a", "b", "c", "d", "e"].filter((u) => auswerten({
      eintraege: [eintrag(u)], alleEintraege: ALLE, spieltagsPunkte: STAND,
      ereignisse: { enabled: true, maxErspielt: 15, aktive: [{ key: "letzter-am-spieltag", belohnung: 1 }] },
    }).gutschriften.length > 0);
    expect(ohneFeld).toEqual(["e"]);
  });

  it("bei Gleichstand AN DER KANTE bekommt niemand etwas", () => {
    // 🔴 Das ist KEINE Doppelung von `auswahl.js`. `waehleBetroffene` löst
    // einen Gleichstand deterministisch über den Namen auf — für eine AUSWAHL
    // richtig (sie muss reproduzierbar sein), für eine BELOHNUNG an der Kante
    // nicht: wer den Joker bekäme, hinge dann am Alphabet.
    const gleich = [punkte("a", 1, 100), punkte("b", 1, 20), punkte("c", 1, 20)];
    const wer = ["a", "b", "c"].filter((u) => auswerten({
      eintraege: [eintrag(u)], alleEintraege: ALLE, spieltagsPunkte: gleich,
      ereignisse: { enabled: true, maxErspielt: 15, aktive: [{ key: "letzter-am-spieltag", belohnung: 1 }] },
    }).gutschriften.length > 0);
    expect(wer).toEqual([]);
  });

  it("die Doppelbelohnungs-Warnung gilt nur nach UNTEN", () => {
    const mitAufholen = { aufholen: { enabled: true, staerke: "mittel", schwelle: 0.05 } };
    const mit = (ende) => konflikte({
      ...mitAufholen,
      ereignisse: { enabled: true, maxErspielt: 5,
        aktive: [{ key: "letzter-am-spieltag", belohnung: 1, auswahl: { modus: "rang", ende, n: 1 } }] },
    }).length;
    expect(mit("unten")).toBe(1);
    // Eine Spieltags-Krone verdoppelt gar nichts — sie tut das Gegenteil.
    expect(mit("oben")).toBe(0);
  });

  it("`beschreibeAuswahl` sagt es in einem Satz, nicht in Feldnamen", () => {
    expect(beschreibeAuswahl({ modus: "rang", ende: "unten", n: 1 })).toContain("Letzte");
    expect(beschreibeAuswahl({ modus: "rang", ende: "oben", n: 1 })).toContain("Beste");
    expect(beschreibeAuswahl({ modus: "rang", ende: "unten", n: 3 })).toContain("3");
    expect(beschreibeAuswahl({ modus: "mitte", prozent: 20 })).toContain("mittlere");
  });

  it("ein unbekannter Modus fällt auf die Vorgabe zurück, statt niemanden zu treffen", () => {
    // Ein Modus, dessen Daten hier fehlen, lieferte sonst stillschweigend eine
    // leere Auswahl — und das sähe für den Admin aus wie ein totes Ereignis.
    expect(sanitizeAuswahl({ modus: "los", n: 3 }).modus).toBe("rang");
  });
});

// ── WAS passiert dann — die Wirkungs-Achse hängt dran ───────
// 🔴 Der Beweis, dass `wirkung.js` nicht das nächste tote Modul ist. Bis
// 07.08.2026 war die Wirkung eines Ereignisses IMMER „n Joker"; die Achse
// ist neu, und diese Tests halten fest, dass sie hier wirklich ankommt —
// und dass sie das bisherige Verhalten nicht stillschweigend ändert.
describe("WAS passiert dann — die Wirkungs-Achse hängt dran", () => {
  const eintraege = [1, 2, 3, 4].map((md) => e("u1", md, `m${md}`, { home: 1, away: 0 }, null));
  const serie = (extra = {}) => AN([{ key: "serie", anzahl: 2, belohnung: 1, ...extra }]);

  it("ohne Angabe bleibt es bei „so viele Joker wie `belohnung`“", () => {
    const r = auswerten({ eintraege, ereignisse: serie() });
    expect(r.gutschriften.length).toBeGreaterThan(0);
    for (const g of r.gutschriften) {
      expect(g.wirkung).toEqual({ typ: "joker", n: 1 });
      expect(g.belohnung).toBe(1);
    }
  });

  it("jede Gutschrift trägt ihre Wirkung im Klartext", () => {
    const r = auswerten({ eintraege, ereignisse: serie({ belohnung: 2 }) });
    expect(r.gutschriften[0].wirkungText).toContain("Joker");
  });

  // 🔴 Der Topf-Vertrag: `maxErspielt` ist ein JOKER-Deckel. Eine
  // Punkte-Gutschrift darf ihn nicht aufzehren — sie bringt ihren eigenen mit.
  it("eine Nicht-Joker-Wirkung zehrt den Joker-Deckel nicht auf", () => {
    const r = auswerten({
      eintraege,
      ereignisse: {
        enabled: true, maxErspielt: 1,
        aktive: [{ key: "serie", anzahl: 2, belohnung: 1, wirkung: { typ: "punkte", betrag: 100 } }],
      },
    });
    // Mit Joker-Wirkung wäre nach der ersten Gutschrift Schluss (Test oben,
    // „gedeckelt wird chronologisch"). Als Punkte-Wirkung laufen alle durch.
    expect(r.gutschriften.length).toBeGreaterThan(1);
    expect(r.gesamt).toBe(0);
    expect(r.gedeckelt).toBe(false);
    for (const g of r.gutschriften) expect(g.wirkung.typ).toBe("punkte");
  });

  it("`belohnung` und `wirkung` können nicht auseinanderlaufen", () => {
    // Zwei Zahlen für dieselbe Sache wären die zweite Wahrheit. `belohnung`
    // wird deshalb AUS der Wirkung abgeleitet, nicht daneben gepflegt.
    const r = auswerten({
      eintraege,
      ereignisse: AN([{ key: "serie", anzahl: 2, belohnung: 3, wirkung: { typ: "joker", n: 2 } }]),
    });
    for (const g of r.gutschriften) expect(g.belohnung).toBe(g.wirkung.n);
  });

  it("eine unfertige Wirkung fällt auf Joker zurück, statt folgenlos zu bleiben", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      ereignisse: AN([{ key: "serie", anzahl: 2, belohnung: 1, wirkung: { typ: "sonderspiel" } }]),
    });
    expect(rules.ereignisse.aktive[0].wirkung.typ).toBe("joker");
  });

  it("übersteht den Creator-Code unverändert", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      ereignisse: AN([{ key: "serie", anzahl: 2, wirkung: { typ: "punkte", betrag: 100, maxProSaison: 300 } }]),
    });
    expect(sanitizeRules(rules)).toEqual(rules);
    expect(rules.ereignisse.aktive[0].wirkung)
      .toEqual({ typ: "punkte", betrag: 100, maxProSaison: 300 });
    expect(rules.ereignisse.aktive[0].ausloeser).toEqual({ typ: "immer" });
  });
});

// ── Die WIE-LANGE-Achse (`geltung.js`) ──────────────────────
// 🔴 Die vierte und letzte der vier Fragen jeder Mechanik. Sie erzeugt nichts,
// sondern verschiebt und streckt, was die Wirkung liefert — und genau das ist
// der Teil, den ein grüner Modul-Test NICHT beweist: `geltung.js` kann fehlerfrei
// rechnen und trotzdem von niemandem gefragt werden. Diese Fälle prüfen das
// Fragen.
describe("WIE LANGE gilt es — die Geltungs-Achse hängt dran", () => {
  // Vier Spieltage, zwei Spieler. u1 ist an Spieltag 1 und 3 Letzter.
  const alle = [1, 2, 3, 4].flatMap((md) => [
    e("u1", md, `m${md}`, { home: 1, away: 0 }, null),
    e("u2", md, `m${md}`, { home: 2, away: 0 }, null),
  ]);
  const punkte = [
    { matchday: 1, userId: "u1", punkte: 10 }, { matchday: 1, userId: "u2", punkte: 100 },
    { matchday: 2, userId: "u1", punkte: 100 }, { matchday: 2, userId: "u2", punkte: 10 },
    { matchday: 3, userId: "u1", punkte: 10 }, { matchday: 3, userId: "u2", punkte: 100 },
    { matchday: 4, userId: "u1", punkte: 100 }, { matchday: 4, userId: "u2", punkte: 10 },
  ];
  const trost = (geltung, wirkung = { typ: "punkte", betrag: 50, maxProSaison: 0 }) =>
    AN([{ key: "letzter-am-spieltag", belohnung: 1, wirkung, geltung }]);

  it("die Vorgabe ist „sofort“ — jede Gutschrift trägt ihr Fenster", () => {
    const r = auswerten({
      eintraege: alle.filter((x) => x.userId === "u1"), alleEintraege: alle,
      ereignisse: AN([{ key: "letzter-am-spieltag", belohnung: 1 }]), spieltagsPunkte: punkte,
    });
    expect(r.gutschriften.length).toBeGreaterThan(0);
    for (const g of r.gutschriften) {
      expect(g.geltung).toEqual({ typ: "sofort" });
      expect(g.gilt).toEqual({ von: g.position, bis: g.position, dauer: 1, offen: false });
    }
  });

  // 🔴 Der Pechvogel-Bonus aus der Roadmap: „+20 % am NÄCHSTEN Spieltag".
  // Ohne diese Achse ist er unbaubar.
  it("„nächster Spieltag“ verschiebt die Wirkung um einen Spieltag", () => {
    const sofort = wirkungsVorgaenge({
      alleEintraege: alle, ereignisse: trost({ typ: "sofort" }), spieltagsPunkte: punkte,
      mitglieder: ["u1", "u2"],
    });
    const spaeter = wirkungsVorgaenge({
      alleEintraege: alle, ereignisse: trost({ typ: "naechsterSpieltag" }), spieltagsPunkte: punkte,
      mitglieder: ["u1", "u2"],
    });
    const tage = (v) => [...new Set(v.filter((x) => x.userId === "u1").map((x) => x.matchday))].sort();
    expect(tage(sofort)).toEqual([1, 3]);
    expect(tage(spaeter)).toEqual([2, 4]);
  });

  // 🔴 Der Vertrag mit `wirkung.js`: über ein Fenster läuft nur ein FAKTOR.
  // Eine feste Gutschrift n-mal auszuzahlen wäre der eine Punkte-Kanal, den die
  // Wirkungs-Achse ausschließt.
  it("ein Fenster streckt einen Aufschlag — aber vervielfacht keine Gutschrift", () => {
    const faktor = (geltung) => wirkungsVorgaenge({
      alleEintraege: alle, ereignisse: trost(geltung, { typ: "bonus", prozent: 20 }),
      spieltagsPunkte: punkte, mitglieder: ["u1", "u2"],
    }).filter((v) => v.userId === "u1").length;
    const summe = (geltung) => wirkungsVorgaenge({
      alleEintraege: alle, ereignisse: trost(geltung), spieltagsPunkte: punkte,
      mitglieder: ["u1", "u2"],
    }).filter((v) => v.userId === "u1").reduce((s, v) => s + v.punkte, 0);

    expect(faktor({ typ: "fenster", n: 3 })).toBeGreaterThan(faktor({ typ: "sofort" }));
    expect(summe({ typ: "fenster", n: 3 })).toBe(summe({ typ: "sofort" }));
  });

  // ⚠️ Am letzten Spieltag gibt es keinen nächsten. Ohne diesen Fall bekäme
  // ein Pechvogel-Bonus dort stillschweigend die Wirkung von „sofort".
  it("was hinter das Saisonende fällt, wirkt nirgends", () => {
    const v = wirkungsVorgaenge({
      alleEintraege: alle.filter((x) => x.matchday <= 3),
      ereignisse: trost({ typ: "naechsterSpieltag" }),
      spieltagsPunkte: punkte.filter((p) => p.matchday <= 3), mitglieder: ["u1", "u2"],
    });
    // u1 ist an Spieltag 1 und 3 Letzter; der Bonus für Spieltag 3 hat keinen
    // Landeplatz mehr und verfällt, statt auf Spieltag 3 zurückzufallen.
    expect([...new Set(v.filter((x) => x.userId === "u1").map((x) => x.matchday))]).toEqual([2]);
  });
});

// ── Der Jackpot ist eine Aussage über die RUNDE ─────────────
// 🔴 Der Fehler, der hier nahe lag: „holt es niemand" aus der Sicht EINES
// Spielers gelesen. Bei „der Letzte des Spieltags" ist an jedem Spieltag jemand
// Letzter — aus Sicht der Runde wächst da nie etwas, aus Sicht eines einzelnen
// Spielers dagegen fast immer. Ein Ein-Nutzer-Lauf hätte aus einer Auszeichnung
// still eine Verdreifachung für den gemacht, der selten hinten steht.
describe("Jackpot", () => {
  const alle = [1, 2, 3, 4].flatMap((md) => [
    e("u1", md, `m${md}`, { home: 1, away: 0 }, null),
    e("u2", md, `m${md}`, { home: 2, away: 0 }, null),
  ]);
  const punkte = [
    { matchday: 1, userId: "u1", punkte: 10 }, { matchday: 1, userId: "u2", punkte: 100 },
    { matchday: 2, userId: "u1", punkte: 100 }, { matchday: 2, userId: "u2", punkte: 10 },
    { matchday: 3, userId: "u1", punkte: 10 }, { matchday: 3, userId: "u2", punkte: 100 },
    { matchday: 4, userId: "u1", punkte: 100 }, { matchday: 4, userId: "u2", punkte: 10 },
  ];
  const mitJackpot = AN([{
    key: "letzter-am-spieltag", belohnung: 1,
    wirkung: { typ: "punkte", betrag: 50, maxProSaison: 0 },
    geltung: { typ: "jackpot", zuwachs: 50, maxFaktor: 3 },
  }]);

  it("an jedem Spieltag ausgeschüttet heißt: der Topf wächst nie", () => {
    const lage = jackpotLage({ alleEintraege: alle, ereignisse: mitJackpot, spieltagsPunkte: punkte });
    expect([...lage.get("letzter-am-spieltag").values()]).toEqual([1, 1, 1, 1]);
  });

  it("fällt eine Ausschüttung aus, wächst der Topf für die nächste", () => {
    // Spieltag 2 und 3 gleichauf: dort ist niemand Letzter, also holt es
    // niemand — und Spieltag 4 zahlt entsprechend mehr.
    const gleich = punkte.map((p) => (p.matchday === 2 || p.matchday === 3 ? { ...p, punkte: 50 } : p));
    const lage = jackpotLage({ alleEintraege: alle, ereignisse: mitJackpot, spieltagsPunkte: gleich });
    const faktoren = lage.get("letzter-am-spieltag");
    expect(faktoren.get(1)).toBe(1);
    expect(faktoren.get(4)).toBe(2);   // zwei leere Spieltage × 50 %
  });

  it("ohne eingestellten Jackpot kostet der Durchlauf gar nichts", () => {
    expect(jackpotLage({ alleEintraege: alle, ereignisse: AN([{ key: "letzter-am-spieltag" }]) })).toBe(null);
  });

  it("der Faktor kommt in der Wertung an — und nur der Aufschlag wächst", () => {
    const gleich = punkte.map((p) => (p.matchday === 2 || p.matchday === 3 ? { ...p, punkte: 50 } : p));
    const ohne = wirkungsVorgaenge({
      alleEintraege: alle, spieltagsPunkte: gleich, mitglieder: ["u1", "u2"],
      ereignisse: AN([{ key: "letzter-am-spieltag", belohnung: 1,
        wirkung: { typ: "punkte", betrag: 50, maxProSaison: 0 } }]),
    });
    const mit = wirkungsVorgaenge({
      alleEintraege: alle, ereignisse: mitJackpot, spieltagsPunkte: gleich, mitglieder: ["u1", "u2"],
    });
    const anSpieltag4 = (v) => v.filter((x) => x.matchday === 4 && x.punkte > 0)
      .reduce((s, x) => s + x.punkte, 0);
    expect(anSpieltag4(ohne)).toBe(50);
    expect(anSpieltag4(mit)).toBe(100);
  });
});

// ── Die Ereignis-Bibliothek: Scharfschütze und Pechvogel ────
// Beide stehen seit dem 29.07. als Wunsch in der Roadmap-Tabelle der
// Regel-Grammatik. Mit den vier Achsen sind sie je ein Eintrag — der Pechvogel
// allerdings erst seit der WIE-LANGE-Achse: „+20 % am NÄCHSTEN Spieltag" ist
// sein ganzer Witz. „Sofort" hieße rückwirkend auf Punkte, die schon feststehen.
describe("Serien mit Ergebnis-Bezug", () => {
  // Vier Spieltage. u1 trifft an 1 und 2 exakt, an 3 und 4 nicht.
  const treffer = (md, exakt) =>
    e("u1", md, `m${md}`, { home: 1, away: 0 }, exakt ? { home: 1, away: 0 } : { home: 3, away: 3 });

  it("Scharfschütze zählt Spieltage in Folge mit einem exakten Treffer", () => {
    const eintraege = [treffer(1, true), treffer(2, true), treffer(3, false), treffer(4, true)];
    const r = auswerten({ eintraege, ereignisse: AN([{ key: "treffer-serie", anzahl: 2, belohnung: 1 }]) });
    expect(r.gutschriften.map((g) => g.matchday)).toEqual([2]);
  });

  it("ein Fehlschlag setzt die Serie zurück", () => {
    const eintraege = [treffer(1, true), treffer(2, false), treffer(3, true), treffer(4, false)];
    const r = auswerten({ eintraege, ereignisse: AN([{ key: "treffer-serie", anzahl: 2, belohnung: 1 }]) });
    expect(r.gutschriften).toHaveLength(0);
  });

  it("Pechsträhne zählt Spieltage in Folge OHNE exakten Treffer", () => {
    const eintraege = [treffer(1, false), treffer(2, false), treffer(3, true), treffer(4, false)];
    const r = auswerten({ eintraege, ereignisse: AN([{ key: "pechstraehne", anzahl: 2, belohnung: 1 }]) });
    expect(r.gutschriften.map((g) => g.matchday)).toEqual([2]);
  });

  // 🔴 Die teuerste Falle dieses Ereignisses: „kein exakter Treffer" ist für
  // jemanden, der GAR NICHT getippt hat, immer wahr. Ohne die Bedingung
  // „getippt und Ergebnis lag vor" wäre der Pechvogel-Bonus die einzige
  // Mechanik im ganzen Regelwerk, bei der Wegbleiben zahlt.
  it("wer gar nicht tippt, ist kein Pechvogel", () => {
    const alle = [1, 2, 3, 4].map((md) => e("u2", md, `m${md}`, { home: 1, away: 0 }, { home: 2, away: 2 }));
    const r = auswerten({
      eintraege: [], alleEintraege: alle,
      ereignisse: AN([{ key: "pechstraehne", anzahl: 2, belohnung: 1 }]),
    });
    expect(r.gutschriften).toHaveLength(0);
  });

  it("ein ausgelassener Spieltag setzt die Strähne zurück, statt sie fortzuschreiben", () => {
    // u1 tippt an 1 und 4 (je daneben), lässt 2 und 3 aus. Ohne die Regel wären
    // das vier Pech-Spieltage in Folge und damit zwei Gutschriften.
    const meine = [treffer(1, false), treffer(4, false)];
    const alle = [...meine, ...[2, 3].map((md) => e("u2", md, `m${md}`, { home: 1, away: 0 }, { home: 2, away: 2 }))];
    const r = auswerten({
      eintraege: meine, alleEintraege: alle,
      ereignisse: AN([{ key: "pechstraehne", anzahl: 2, belohnung: 1 }]),
    });
    expect(r.gutschriften).toHaveLength(0);
  });

  it("ohne Ergebnisse zählt kein Spieltag mit — weder für noch gegen", () => {
    const offen = [1, 2, 3].map((md) => e("u1", md, `m${md}`, { home: 1, away: 0 }, null));
    for (const key of ["treffer-serie", "pechstraehne"]) {
      const r = auswerten({ eintraege: offen, ereignisse: AN([{ key, anzahl: 2, belohnung: 1 }]) });
      expect(r.gutschriften).toHaveLength(0);
    }
  });
});

// ── Der Zeitraum: „der Beste ÜBER DIE DREI" ─────────────────
// 🔴 Die Vokabel, an der die Dreier-Wertung aus der Roadmap bis zum 07.08.2026
// hängen blieb. Wichtig ist der Unterschied zu „der Beste jedes dritten
// Spieltags": das wäre derselbe Aufwand in der Oberfläche und ein ANDERER
// Anreiz — ein Glückstag statt drei Wochen Konstanz.
describe("Wertung über einen Zeitraum statt über einen Spieltag", () => {
  // Vier Spieltage, zwei Spieler. u1 gewinnt Spieltag 1 knapp und verliert 2
  // und 3 deutlich — über die drei zusammen liegt u2 vorn.
  const alle = [1, 2, 3].flatMap((md) => [
    e("u1", md, `m${md}`, { home: 1, away: 0 }, null),
    e("u2", md, `m${md}`, { home: 2, away: 0 }, null),
  ]);
  const punkte = [
    { matchday: 1, userId: "u1", punkte: 60 }, { matchday: 1, userId: "u2", punkte: 40 },
    { matchday: 2, userId: "u1", punkte: 10 }, { matchday: 2, userId: "u2", punkte: 90 },
    { matchday: 3, userId: "u1", punkte: 10 }, { matchday: 3, userId: "u2", punkte: 90 },
  ];
  const krone = (zeitraum) => AN([{
    key: "letzter-am-spieltag", belohnung: 1, zeitraum,
    auswahl: { modus: "rang", ende: "oben", n: 1, prozent: 20 },
  }]);
  const fuer = (userId, zeitraum) => auswerten({
    eintraege: alle.filter((x) => x.userId === userId), alleEintraege: alle,
    ereignisse: krone(zeitraum), spieltagsPunkte: punkte,
  }).gutschriften;

  it("je Spieltag gewinnt u1 einmal — über drei Spieltage gar nicht", () => {
    // Der eigentliche Beweis: dieselben Punkte, dieselbe Auswahl, anderes
    // Ergebnis. Ohne diesen Unterschied wäre `zeitraum` eine Einstellung, die
    // ins Leere läuft.
    expect(fuer("u1", 1)).toHaveLength(1);
    expect(fuer("u1", 3)).toHaveLength(0);
    // Und die Gegenprobe: u2 gewinnt beide Male etwas, über den Block aber
    // nur EINMAL statt zweimal.
    expect(fuer("u2", 1)).toHaveLength(2);
    expect(fuer("u2", 3)).toHaveLength(1);
  });

  // 🔴 Entschieden ist die Wertung erst, wenn der Block vorbei ist. Am ersten
  // Spieltag verbucht stünde die Auszeichnung im Verlauf VOR den Punkten, die
  // sie begründen — und eine Geltung „nächster Spieltag" läge mitten im Block.
  it("die Auszeichnung hängt am LETZTEN Spieltag des Blocks", () => {
    expect(fuer("u2", 3)[0].matchday).toBe(3);
  });

  it("die Vorgabe ist 1 und ändert nichts am bisherigen Verhalten", () => {
    const ohne = auswerten({
      eintraege: alle.filter((x) => x.userId === "u2"), alleEintraege: alle,
      ereignisse: AN([{ key: "letzter-am-spieltag", belohnung: 1,
        auswahl: { modus: "rang", ende: "oben", n: 1, prozent: 20 } }]),
      spieltagsPunkte: punkte,
    }).gutschriften;
    expect(ohne).toHaveLength(fuer("u2", 1).length);
  });

  it("der Text nennt den Zeitraum, statt „am Spieltag“ zu behaupten", () => {
    expect(fuer("u2", 3)[0].text).toContain("3 Spieltage");
    expect(fuer("u2", 1)[0].text).not.toContain("Spieltage über");
  });

  it("übersteht den Creator-Code unverändert", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      ereignisse: AN([{ key: "letzter-am-spieltag", belohnung: 1, zeitraum: 3 }]),
    });
    expect(rules.ereignisse.aktive[0].zeitraum).toBe(3);
    expect(sanitizeRules(rules)).toEqual(rules);
  });
});

// ── Die Kennzahl: WONACH gewertet wird ──────────────────────
// 🔴 Die letzte Stellschraube der „Jokerjagd" aus der Roadmap. Das Wort
// SONDERSPIEL sah nach einem Minispiel aus — es ist aber ein Wettbewerb über
// ein Fenster nach einer Kennzahl, und Fenster, Zeitpunkt und Preis gab es
// schon. Gefehlt hat allein, etwas anderes als Punkte zählen zu können.
describe("Wertung nach einer anderen Kennzahl", () => {
  // u1 trifft an Spieltag 1 und 2 exakt, u2 nie — u2 holt aber deutlich mehr
  // PUNKTE. Nach Punkten gewinnt u2, nach Treffern u1: dieselbe Runde, zwei
  // Sieger. Ohne diesen Unterschied wäre `metrik` eine tote Einstellung.
  const treffer = (userId, md, exakt) =>
    e(userId, md, `m${md}`, { home: 1, away: 0 }, exakt ? { home: 1, away: 0 } : { home: 4, away: 4 });
  const alle = [
    treffer("u1", 1, true), treffer("u2", 1, false),
    treffer("u1", 2, true), treffer("u2", 2, false),
  ];
  const punkte = [
    { matchday: 1, userId: "u1", punkte: 10 }, { matchday: 1, userId: "u2", punkte: 90 },
    { matchday: 2, userId: "u1", punkte: 10 }, { matchday: 2, userId: "u2", punkte: 90 },
  ];
  const bester = (metrik) => AN([{
    key: "letzter-am-spieltag", belohnung: 1, zeitraum: 2, metrik,
    auswahl: { modus: "rang", ende: "oben", n: 1, prozent: 20 },
  }]);
  const fuer = (userId, metrik) => auswerten({
    eintraege: alle.filter((x) => x.userId === userId), alleEintraege: alle,
    ereignisse: bester(metrik), spieltagsPunkte: punkte,
  }).gutschriften;

  it("nach Punkten gewinnt der eine, nach Treffern der andere", () => {
    expect(fuer("u2", "punkte")).toHaveLength(1);
    expect(fuer("u1", "punkte")).toHaveLength(0);
    expect(fuer("u1", "exakteTreffer")).toHaveLength(1);
    expect(fuer("u2", "exakteTreffer")).toHaveLength(0);
  });

  // 🔴 Der Punkt, der ohne Erklärung wie ein Fehler aussieht: trifft niemand,
  // sind alle gleichauf — und bei Gleichstand an der Kante gewinnt niemand.
  // Eine Jagd ohne Beute hat keinen Sieger. Gewollt, aber es muss dastehen.
  it("trifft niemand, gewinnt niemand", () => {
    const ohneTreffer = [treffer("u1", 1, false), treffer("u2", 1, false)];
    for (const u of ["u1", "u2"]) {
      expect(auswerten({
        eintraege: ohneTreffer.filter((x) => x.userId === u), alleEintraege: ohneTreffer,
        ereignisse: bester("exakteTreffer"), spieltagsPunkte: punkte,
      }).gutschriften).toHaveLength(0);
    }
  });

  // Die anderen Kennzahlen brauchen die Spieltagspunkte NICHT — sie zählen aus
  // den Tipps. Wer weiter stur auf sie prüft, lässt ein Sonderspiel nie
  // auslösen.
  it("ohne Spieltagspunkte wertet die Kennzahl trotzdem", () => {
    const r = auswerten({
      eintraege: alle.filter((x) => x.userId === "u1"), alleEintraege: alle,
      ereignisse: bester("exakteTreffer"),
    });
    expect(r.gutschriften).toHaveLength(1);
  });

  it("der Text nennt die Kennzahl, statt „der Beste“ zu behaupten", () => {
    expect(fuer("u1", "exakteTreffer")[0].text).toContain("Exakte Treffer");
    expect(fuer("u2", "punkte")[0].text).not.toContain("nach ");
  });

  it("eine unbekannte Kennzahl fällt auf Punkte zurück", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      ereignisse: AN([{ key: "letzter-am-spieltag", belohnung: 1, metrik: "gibtsNicht" }]),
    });
    expect(rules.ereignisse.aktive[0].metrik).toBe("punkte");
  });
});
