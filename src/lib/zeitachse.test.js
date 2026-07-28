import { describe, it, expect } from "vitest";
import {
  zeitachse, sanitizeZeitachse, ankerWettbewerb, achsenLabel, rundenSpieltagVon,
  warnungen, DEFAULT_ZEITACHSE, ZEITACHSE_LIMITS,
} from "./zeitachse";

const TAG = 24 * 3600 * 1000;
const WOCHE = 7 * TAG;

// Zwei Ligen mit versetztem Start — genau der Fall, um den es geht:
// La Liga beginnt zwei Wochen vor der Bundesliga.
const spiel = (wettbewerb, matchday, ms, id = `${wettbewerb}${matchday}`) => ({
  id, wettbewerb, matchday, kickoff: new Date(ms).toISOString(), home: "A", away: "B",
});

const PD_START = Date.UTC(2026, 7, 14);
const BL_START = Date.UTC(2026, 7, 28);

const MATCHES = [
  // La Liga: Spieltage 1–5, wöchentlich ab 14.08.
  ...[1, 2, 3, 4, 5].map((md) => spiel("pd", md, PD_START + (md - 1) * WOCHE)),
  // Bundesliga: Spieltage 1–3, wöchentlich ab 28.08.
  ...[1, 2, 3].map((md) => spiel("bl", md, BL_START + (md - 1) * WOCHE)),
];

describe("Taktgeber", () => {
  it("nimmt ohne Vorgabe die Liga, die zuerst anfängt", () => {
    expect(ankerWettbewerb(MATCHES)).toBe("pd");
  });

  it("folgt der Vorgabe des Admins, wenn die Liga in der Runde vorkommt", () => {
    expect(ankerWettbewerb(MATCHES, "bl")).toBe("bl");
  });

  it("ignoriert eine Vorgabe, die es in dieser Runde gar nicht gibt", () => {
    expect(ankerWettbewerb(MATCHES, "sa")).toBe("pd");
  });

  it("das Demo-Spiel wird nie Taktgeber (es gehört zu keiner Saison)", () => {
    const mitDemo = [spiel("demo", 14, PD_START - 30 * TAG), ...MATCHES];
    expect(ankerWettbewerb(mitDemo)).toBe("pd");
  });
});

describe("Übersetzung Runden-Spieltag → Liga-Spieltag", () => {
  it("ordnet jedem Runden-Spieltag die Liga-Spieltage zu", () => {
    const achse = zeitachse(MATCHES, { modus: "anker", anker: "pd" });
    expect(achse).toHaveLength(5);
    // Spieltag 3 der Runde (= La Liga 3) fällt mit Bundesliga 1 zusammen.
    expect(achse[2].ligen).toEqual({ bl: [1], pd: [3] });
    expect(achsenLabel(achse[2])).toBe("Spieltag 3 · Bundesliga 1 · La Liga 3");
  });

  it("die Kurzform passt in eine Kopfzeile", () => {
    const achse = zeitachse(MATCHES, { modus: "anker", anker: "pd" });
    expect(achsenLabel(achse[2], { kurz: true })).toBe("Spieltag 3 · BL 1 · PD 3");
  });

  it("sagt für ein einzelnes Spiel, in welchen Runden-Spieltag es fällt", () => {
    const achse = zeitachse(MATCHES, { modus: "anker", anker: "pd" });
    const blErster = MATCHES.find((m) => m.wettbewerb === "bl" && m.matchday === 1);
    expect(rundenSpieltagVon(achse, blErster)).toBe(3);
  });
});

describe("Die Kante, die der naive Entwurf verliert", () => {
  // Anker Bundesliga: die La-Liga-Spieltage 1 und 2 liegen VOR dem ersten
  // Ankerpunkt. Ohne Sonderregel wären sie in keinem Runden-Spieltag.
  it("Spiele vor dem ersten Ankerpunkt fallen in Runden-Spieltag 1 statt zu verschwinden", () => {
    const achse = zeitachse(MATCHES, { modus: "anker", anker: "bl" });
    expect(achse).toHaveLength(3);
    const alle = achse.flatMap((e) => e.spiele);
    expect(alle).toHaveLength(MATCHES.length);          // nichts verloren
    expect(achse[0].ligen).toEqual({ bl: [1], pd: [1, 2, 3] });
  });

  it("das Demo-Spiel bleibt draußen — es gehört zu keiner Saison", () => {
    const demo = spiel("demo", 14, PD_START - 60 * TAG, "demo1");
    const achse = zeitachse([demo, ...MATCHES], { modus: "anker", anker: "pd" });
    expect(achse.flatMap((e) => e.spiele.map((m) => m.id))).not.toContain("demo1");
    expect(achse[0].ligen.demo).toBeUndefined();
    expect(rundenSpieltagVon(achse, demo)).toBe(null);
  });

  it("kein Spiel liegt in zwei Runden-Spieltagen", () => {
    const achse = zeitachse(MATCHES, { modus: "anker", anker: "pd" });
    const ids = achse.flatMap((e) => e.spiele.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// Der Fall aus dem Browser: ein Bundesliga-Spieltag läuft Freitag bis Sonntag,
// der La-Liga-Ankerpunkt liegt am Samstag dazwischen. Spielweise zugeordnet
// zerfiele der Spieltag auf zwei Runden-Spieltage.
describe("Ein Liga-Spieltag bleibt ganz", () => {
  const FR = Date.UTC(2026, 7, 28, 18);      // BL 1, Freitagabend
  const SA = Date.UTC(2026, 7, 29, 13);      // Ankerpunkt der La Liga
  const SO = Date.UTC(2026, 7, 30, 15);      // BL 1, Sonntag — hinter dem Anker

  const GETEILT = [
    { id: "bl1-fr", wettbewerb: "bl", matchday: 1, kickoff: new Date(FR).toISOString() },
    { id: "bl1-so", wettbewerb: "bl", matchday: 1, kickoff: new Date(SO).toISOString() },
    { id: "pd1", wettbewerb: "pd", matchday: 1, kickoff: new Date(Date.UTC(2026, 7, 21)).toISOString() },
    { id: "pd2", wettbewerb: "pd", matchday: 2, kickoff: new Date(SA).toISOString() },
  ];

  it("beide Spiele des Spieltags landen im selben Runden-Spieltag", () => {
    const achse = zeitachse(GETEILT, { modus: "anker", anker: "pd" });
    const nummern = ["bl1-fr", "bl1-so"].map((id) =>
      achse.find((e) => e.spiele.some((m) => m.id === id))?.nummer);
    expect(nummern[0]).toBe(nummern[1]);
  });

  it("er fällt dorthin, wo sein ERSTES Spiel liegt — nicht in den späteren", () => {
    const achse = zeitachse(GETEILT, { modus: "anker", anker: "pd" });
    expect(achse[0].ligen).toEqual({ bl: [1], pd: [1] });   // Freitag zieht den Sonntag mit
    expect(achse[1].ligen).toEqual({ pd: [2] });
  });

  it("kein Liga-Spieltag steht in zwei Runden-Spieltagen", () => {
    const achse = zeitachse(MATCHES, { modus: "anker", anker: "pd" });
    const gesehen = new Map();
    for (const e of achse) {
      for (const key of Object.keys(e.ligen)) {
        for (const md of e.ligen[key]) {
          const k = `${key}#${md}`;
          expect(gesehen.has(k)).toBe(false);
          gesehen.set(k, e.nummer);
        }
      }
    }
  });

  it("rundenSpieltagVon sagt für BEIDE Spiele dieselbe Nummer", () => {
    const achse = zeitachse(GETEILT, { modus: "anker", anker: "pd" });
    const [fr, so] = ["bl1-fr", "bl1-so"].map((id) => GETEILT.find((m) => m.id === id));
    expect(rundenSpieltagVon(achse, so)).toBe(rundenSpieltagVon(achse, fr));
    expect(rundenSpieltagVon(achse, so)).toBe(1);
  });

  it("auch der Wochen-Modus zerschneidet kein Wochenende", () => {
    const achse = zeitachse(GETEILT, { modus: "woche", tage: 3 });
    const nummern = ["bl1-fr", "bl1-so"].map((id) =>
      achse.find((e) => e.spiele.some((m) => m.id === id))?.nummer);
    expect(nummern[0]).toBe(nummern[1]);
  });
});

describe("Skalierung: mehrere Anker-Spieltage bündeln", () => {
  it("bündeln: 2 halbiert die Zahl der Runden-Spieltage", () => {
    const achse = zeitachse(MATCHES, { modus: "anker", anker: "pd", buendeln: 2 });
    expect(achse).toHaveLength(3);                      // 5 Anker-Spieltage → 3 Blöcke
    expect(achse[0].ligen.pd).toEqual([1, 2]);
  });
});

describe("Wochen-Modus", () => {
  it("teilt streng nach Zeitfenstern, unabhängig von jeder Liga", () => {
    const achse = zeitachse(MATCHES, { modus: "woche", tage: 7 });
    expect(achse.length).toBeGreaterThan(1);
    expect(achse.flatMap((e) => e.spiele)).toHaveLength(MATCHES.length);
  });
});

describe("Warnungen vor dem Anlegen", () => {
  it("meldet einen überfüllten Runden-Spieltag (Pause im Taktgeber)", () => {
    // Anker pausiert nach Spieltag 1 für Monate, die andere Liga spielt weiter.
    const viele = [
      spiel("bl", 1, BL_START),
      spiel("bl", 2, BL_START + 120 * TAG),
      ...Array.from({ length: ZEITACHSE_LIMITS.warnAbSpielen }, (_, i) =>
        spiel("pd", i + 1, BL_START + (i + 1) * TAG, `pd-${i}`)),
    ];
    // Mit „Anhängen" bleibt die Pause EIN Spieltag — genau dann muss gewarnt werden.
    const cfg = { modus: "anker", anker: "bl", pause: "anhaengen" };
    const achse = zeitachse(viele, cfg);
    const w = warnungen(achse, cfg);
    expect(w.some((x) => x.art === "ueberfuellt")).toBe(true);
    expect(w[0].hilfe).toContain("Auffüllen");
  });

  it("meldet einen aufgeblähten ersten Spieltag, wenn der Taktgeber später startet", () => {
    const achse = zeitachse(MATCHES, { modus: "anker", anker: "bl" });
    const w = warnungen(achse, { modus: "anker", anker: "bl" });
    expect(w.some((x) => x.art === "vorlauf")).toBe(true);
  });

  // Der Fehlalarm, den eine FESTE Schwelle erzeugte: über vier Ligen sind 39
  // Spiele eine normale Woche, mit Champions League 57. Eine Schwelle von 40
  // hätte jede CL-Woche als „Pause im Taktgeber" gemeldet — auf der
  // Standard-Einstellung, und mit falscher Begründung.
  it("viele Ligen in einer Woche sind kein überfüllter Spieltag", () => {
    const woche = (nr, tage) => [
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => spiel("bl", nr, BL_START + tage * TAG, `bl${nr}-${i}`)),
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => spiel("pd", nr, BL_START + tage * TAG, `pd${nr}-${i}`)),
    ];
    // Vier normale Wochen, in der dritten kommt die Champions League dazu.
    const viele = [
      ...woche(1, 0), ...woche(2, 7), ...woche(3, 14), ...woche(4, 21),
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((i) =>
        spiel("cl", 1, BL_START + 15 * TAG, `cl1-${i}`)),
    ];
    const cfg = { modus: "anker", anker: "bl" };
    const w = warnungen(zeitachse(viele, cfg), cfg);
    expect(w.some((x) => x.art === "ueberfuellt")).toBe(false);
  });

  it("bei passendem Taktgeber gibt es nichts zu warnen", () => {
    const achse = zeitachse(MATCHES, { modus: "anker", anker: "pd" });
    expect(warnungen(achse, { modus: "anker", anker: "pd" })).toEqual([]);
  });
});

// Der Taktgeber pausiert (Winterpause), die andere Liga spielt weiter.
describe("Pause im Taktgeber", () => {
  const PAUSE = [
    spiel("bl", 1, BL_START),
    spiel("bl", 2, BL_START + WOCHE),
    spiel("bl", 3, BL_START + 35 * TAG),          // 4 Wochen Lücke nach Spieltag 2
    // La Liga spielt in der Lücke weiter (drei Spieltage dazwischen).
    ...[0, 1, 2].map((i) => spiel("pd", 10 + i, BL_START + WOCHE + (i + 1) * WOCHE, `pd-p${i}`)),
  ];

  it("Auffüllen: jede Woche der Pause wird ein eigener Runden-Spieltag", () => {
    const achse = zeitachse(PAUSE, { modus: "anker", anker: "bl", pause: "auffuellen" });
    expect(achse.length).toBeGreaterThan(3);
    // In den aufgefüllten Spieltagen taucht der Taktgeber nicht auf — er pausiert.
    const ohneAnker = achse.filter((e) => !e.ligen.bl);
    expect(ohneAnker.length).toBeGreaterThan(0);
    expect(ohneAnker.every((e) => e.spiele.length > 0)).toBe(true);
  });

  it("Anhängen: die Pause bleibt ein einziger, dicker Spieltag", () => {
    const achse = zeitachse(PAUSE, { modus: "anker", anker: "bl", pause: "anhaengen" });
    expect(achse).toHaveLength(3);                 // genau die drei Anker-Spieltage
    expect(achse[1].spiele.length).toBe(4);        // BL 2 + drei La-Liga-Spieltage
  });

  it("beide Varianten verlieren kein einziges Spiel", () => {
    for (const pause of ["auffuellen", "anhaengen"]) {
      const achse = zeitachse(PAUSE, { modus: "anker", anker: "bl", pause });
      expect(achse.flatMap((e) => e.spiele)).toHaveLength(PAUSE.length);
    }
  });

  it("ein normaler Wochenrhythmus löst die Pausen-Regel nie aus", () => {
    const achse = zeitachse(MATCHES, { modus: "anker", anker: "pd", pause: "auffuellen" });
    expect(achse).toHaveLength(5);                 // exakt die fünf Anker-Spieltage
  });
});

describe("sanitizeZeitachse", () => {
  it("beschneidet Unfug und fällt auf den Standard zurück", () => {
    const z = sanitizeZeitachse({ modus: "quatsch", anker: "xx", buendeln: 99, tage: 0 });
    expect(z.modus).toBe(DEFAULT_ZEITACHSE.modus);
    expect(z.anker).toBe(null);                          // unbekannte Liga → automatisch
    expect(z.buendeln).toBe(ZEITACHSE_LIMITS.buendeln.max);
    expect(z.tage).toBe(ZEITACHSE_LIMITS.tage.min);
  });

  it("leere Match-Liste ergibt eine leere Achse statt eines Fehlers", () => {
    expect(zeitachse([], DEFAULT_ZEITACHSE)).toEqual([]);
  });
});
