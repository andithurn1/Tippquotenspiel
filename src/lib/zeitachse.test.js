import { describe, it, expect } from "vitest";
import {
  zeitachse, sanitizeZeitachse, ankerWettbewerb, achsenLabel, rundenSpieltagVon,
  rundenSchluessel, warnungen, verlaufNachRundenSpieltag, DEFAULT_ZEITACHSE, ZEITACHSE_LIMITS,
} from "./zeitachse";
import { invalidJokerMatchdays, invalidWeightMatchdays, weightUsageForMatchday } from "./engine";
import { sanitizeRules } from "./engine";
import { kontoVerlauf } from "./jokerBudget";

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

// Hier wird aus der Anzeige eine Fairness-Frage: „einmal pro Spieltag" muss den
// Spieltag DER RUNDE meinen, sonst gibt es ihn einmal pro LIGA.
describe("rundenSchluessel — der Schlüssel für „einmal pro Spieltag\"", () => {
  const achse = zeitachse(MATCHES, { modus: "anker", anker: "pd" });

  it("Spiele verschiedener Ligen im selben Runden-Spieltag teilen den Schlüssel", () => {
    const s = rundenSchluessel(achse);
    // La Liga 3 und Bundesliga 1 fallen zusammen (siehe Achsen-Test oben).
    expect(s({ wettbewerb: "pd", matchday: 3 })).toBe(s({ wettbewerb: "bl", matchday: 1 }));
  });

  it("verschiedene Runden-Spieltage bekommen verschiedene Schlüssel", () => {
    const s = rundenSchluessel(achse);
    expect(s({ wettbewerb: "pd", matchday: 3 })).not.toBe(s({ wettbewerb: "pd", matchday: 4 }));
  });

  // Ein Tipp trägt Wettbewerb und Spieltag, aber keinen Anpfiff — genau der
  // Fall, den die Joker-Prüfung braucht.
  it("funktioniert für einen TIPP ohne Anstoßzeit", () => {
    const s = rundenSchluessel(achse);
    expect(s({ match_id: "x", wettbewerb: "bl", matchday: 1, gewicht: 2 })).toBe("runde#3");
  });

  it("was nicht zur Achse gehört, behält seinen eigenen Schlüssel", () => {
    const s = rundenSchluessel(achse);
    // Das Demo-Spiel darf nicht mit irgendeinem Runden-Spieltag verschmelzen.
    expect(s({ wettbewerb: "demo", matchday: 14 })).toBe("demo#14");
  });

  it("ohne Achse gibt es null — der Aufrufer bleibt beim Liga-Spieltag", () => {
    expect(rundenSchluessel([])).toBe(null);
  });

  // Bei einem einzigen Wettbewerb ist der Runden-Spieltag der Liga-Spieltag.
  // Die Umstellung darf dort nichts verändern.
  it("bei nur einer Liga bleibt die Zuordnung eins zu eins", () => {
    const nurPd = MATCHES.filter((m) => m.wettbewerb === "pd");
    const s = rundenSchluessel(zeitachse(nurPd, { modus: "anker", anker: "pd" }));
    const keys = [1, 2, 3, 4, 5].map((md) => s({ wettbewerb: "pd", matchday: md }));
    expect(new Set(keys).size).toBe(5);
  });
});

// Der eigentliche Zweck: die Engine-Prüfungen zählen jetzt richtig.
describe("Wirkung auf die Joker-Regeln", () => {
  const achse = zeitachse(MATCHES, { modus: "anker", anker: "pd" });
  const s = rundenSchluessel(achse);
  const RULES = { joker: { faktoren: [2, 1.5, 1.2, 1] } };

  // Zwei Joker in derselben Woche, nur in verschiedenen Ligen.
  const zweiJoker = [
    { match_id: "a", wettbewerb: "pd", matchday: 3, joker: true },
    { match_id: "b", wettbewerb: "bl", matchday: 1, joker: true },
  ];

  it("ohne Achse gilt weiter der Liga-Spieltag — zwei Joker sind erlaubt", () => {
    expect(invalidJokerMatchdays(zweiJoker)).toEqual([]);
  });

  it("mit der Achse ist es EIN Runden-Spieltag und damit ein Joker zu viel", () => {
    expect(invalidJokerMatchdays(zweiJoker, s)).toHaveLength(1);
  });

  it("dasselbe für den Ranglisten-Pool: ein Faktor nur einmal pro Runden-Spieltag", () => {
    const zweimalZwei = [
      { match_id: "a", wettbewerb: "pd", matchday: 3, gewicht: 2 },
      { match_id: "b", wettbewerb: "bl", matchday: 1, gewicht: 2 },
    ];
    expect(invalidWeightMatchdays(zweimalZwei, RULES)).toEqual([]);
    expect(invalidWeightMatchdays(zweimalZwei, RULES, s)).toHaveLength(1);
  });

  it("die Belegungs-Anzeige sieht das Gewicht der anderen Liga als vergeben", () => {
    const tips = [{ match_id: "b", wettbewerb: "bl", matchday: 1, gewicht: 2 }];
    const ziel = { wettbewerb: "pd", matchday: 3 };
    expect(weightUsageForMatchday(tips, ziel, RULES).frei).toContain(2);
    expect(weightUsageForMatchday(tips, ziel, RULES, null, s).frei).not.toContain(2);
  });

  it("verschiedene Runden-Spieltage bleiben unabhängig", () => {
    const tips = [{ match_id: "b", wettbewerb: "pd", matchday: 5, gewicht: 2 }];
    expect(weightUsageForMatchday(tips, { wettbewerb: "pd", matchday: 3 }, RULES, null, s).frei)
      .toContain(2);
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

// 🔴 Aus einer eigenen Messung am echten Katalog, nicht aus einem grünen Test.
// Der automatische Taktgeber ist die Liga, die ZUERST anfängt — im Katalog war
// das die MLS mit drei Spieltagen. Danach gab es keinen Ankerpunkt mehr, und
// die restlichen acht Monate über fünf Wettbewerbe fielen in EINEN
// Runden-Spieltag: die ganze Achse hatte drei Einträge.
//
// Das ist keine Anzeige-Frage. „Einmal pro Runden-Spieltag" gilt für den
// Joker, den Ranglisten-Pool, den Münz-Takt und die Regel-Beschlüsse — ein
// Tipper hätte drei Joker pro Saison bekommen statt achtunddreißig.
describe("Ein kurzer Taktgeber darf nicht die halbe Saison verschlucken", () => {
  // Taktgeber „kurz": drei Wochen. Danach läuft „lang" noch ein halbes Jahr.
  const KURZ_UND_LANG = [
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `k${i}`, wettbewerb: "mls", matchday: i + 1,
      kickoff: new Date(Date.UTC(2026, 6, 31) + i * 7 * 24 * 3600 * 1000).toISOString(),
    })),
    ...Array.from({ length: 26 }, (_, i) => ({
      id: `l${i}`, wettbewerb: "bl", matchday: i + 1,
      kickoff: new Date(Date.UTC(2026, 7, 28) + i * 7 * 24 * 3600 * 1000).toISOString(),
    })),
  ];

  it("der Rhythmus läuft weiter, bis das letzte Spiel gespielt ist", () => {
    const achse = zeitachse(KURZ_UND_LANG, { modus: "anker", pause: "auffuellen" });
    // Von Hand: drei Ankerpunkte des Taktgebers, danach 26 Wochen bis zum
    // letzten Spiel — die Achse muss deutlich mehr als eine Handvoll Einträge
    // haben, nicht drei.
    expect(achse.length).toBeGreaterThan(20);
  });

  it("späte Spieltage landen NICHT alle im selben Runden-Spieltag", () => {
    const achse = zeitachse(KURZ_UND_LANG, { modus: "anker", pause: "auffuellen" });
    const frueh = rundenSpieltagVon(achse, { wettbewerb: "bl", matchday: 1 });
    const spaet = rundenSpieltagVon(achse, { wettbewerb: "bl", matchday: 26 });
    expect(spaet).toBeGreaterThan(frueh);
  });

  it("„anhängen“ behält bewusst das alte Verhalten", () => {
    // Wer Lücken ausdrücklich stehen lassen will, bekommt sie auch am Ende.
    const achse = zeitachse(KURZ_UND_LANG, { modus: "anker", pause: "anhaengen" });
    expect(achse.length).toBe(3);
  });
});

// 🔴 `standAmTag` (jokerBudget.js) vergleicht Spieltags-ZAHLEN. Bekommt es
// einen Verlauf mit LIGA-Spieltagen und eine Anfrage in RUNDEN-Spieltagen,
// sind das zwei Skalen — und über mehrere Wettbewerbe kollidieren die Zahlen
// zusätzlich. Diese Umschlüsselung ist die Antwort darauf.
describe("verlaufNachRundenSpieltag", () => {
  const WOCHE = 7 * 24 * 3600 * 1000;
  const START = Date.UTC(2026, 7, 28);
  const MATCHES = [
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `b${i}`, wettbewerb: "bl", matchday: i + 1,
      kickoff: new Date(START + i * WOCHE).toISOString(),
    })),
    // Ein CL-Spieltag MITTEN in der Bundesliga-Woche 3 — dieselbe Zahl wie
    // BL-Spieltag 3, aber ein anderer Tag.
    { id: "c3", wettbewerb: "cl", matchday: 3, kickoff: new Date(START + 2 * WOCHE + 2 * 24 * 3600 * 1000).toISOString() },
  ];

  const verlauf = [
    { wettbewerb: "bl", matchday: 1, board: [{ userId: "a", total: 10 }] },
    { wettbewerb: "bl", matchday: 3, board: [{ userId: "a", total: 30 }] },
    { wettbewerb: "cl", matchday: 3, board: [{ userId: "a", total: 45 }] },
    { wettbewerb: "bl", matchday: 5, board: [{ userId: "a", total: 70 }] },
  ];

  it("schlüsselt auf Runden-Spieltage um und macht die Zahlen eindeutig", () => {
    const achse = zeitachse(MATCHES, { modus: "anker" });
    const neu = verlaufNachRundenSpieltag(verlauf, achse);
    // Die zwei „Spieltag 3" fallen jetzt nicht mehr zusammen, weil beide über
    // ihren Runden-Spieltag laufen — die Zahlen sind aufsteigend und eindeutig.
    const nummern = neu.map((v) => v.matchday);
    expect(new Set(nummern).size).toBe(nummern.length);
    expect([...nummern].sort((a, b) => a - b)).toEqual(nummern);
  });

  it("bei mehreren Liga-Spieltagen im selben Runden-Spieltag gewinnt der LETZTE", () => {
    // Der Verlauf ist kumulativ: der Stand nach dem letzten Spiel des Tages
    // ist der Stand dieses Tages, der erste wäre ein Zwischenstand.
    const achse = zeitachse(MATCHES, { modus: "anker" });
    const neu = verlaufNachRundenSpieltag(verlauf, achse);
    const zusammen = neu.filter((v) => v.ligaSpieltag === 3);
    for (const v of zusammen) {
      const kandidaten = verlauf.filter((x) => rundenSpieltagVon(achse, x) === v.matchday);
      expect(v.board[0].total).toBe(kandidaten[kandidaten.length - 1].board[0].total);
    }
  });

  it("ohne Achse kommt der Verlauf unverändert zurück", () => {
    expect(verlaufNachRundenSpieltag(verlauf, [])).toBe(verlauf);
  });

  // 🔴 Warum das überhaupt gebaut wurde, an einer echten Auswirkung gemessen:
  // die Budget-Quelle „Rückstand" fragt `standAmTag(stand, t)` mit t als
  // Spieltag 1…N. Trägt `stand` LIGA-Spieltage, findet sie bei t=4 den
  // Bundesliga-Spieltag 3 — der in Runden-Spieltagen aber erst bei 6 liegt.
  // Sie zahlte also einen Rückstands-Bonus auf Basis eines Tabellenstands,
  // den es zu diesem Zeitpunkt noch gar nicht gab: Zukunftswissen, genau das,
  // was der Kopfkommentar von `standAmTag` ausschließen will.
  it("verhindert, dass eine Budget-Quelle auf einen künftigen Stand zahlt", () => {
    // Eigene Spiele: ein KURZER Taktgeber, der zwei Wochen früher anfängt —
    // dadurch fallen Liga- und Runden-Spieltag auseinander, und genau darum
    // geht es hier. (Im echten Katalog macht das die MLS.)
    const mitVorlauf = [
      ...Array.from({ length: 2 }, (_, i) => ({
        id: `v${i}`, wettbewerb: "mls", matchday: i + 1,
        kickoff: new Date(START - (2 - i) * WOCHE).toISOString(),
      })),
      ...MATCHES,
    ];
    const achse = zeitachse(mitVorlauf, { modus: "anker" });
    const rules = sanitizeRules({
      budget: {
        enabled: true, takt: "spieltag",
        quellen: [{ typ: "rueckstand", proPunktRueckstand: 0.1, deckel: 0 }],
      },
    });
    // Der früheste Eintrag des Verlaufs liegt auf einem späteren
    // Runden-Spieltag, als seine Liga-Zahl vermuten lässt.
    const frueheste = rundenSpieltagVon(achse, verlauf[0]);
    expect(frueheste).toBeGreaterThan(verlauf[0].matchday);

    const kontoBei = (stand, t) => kontoVerlauf({
      rules, tipps: [], spieltage: achse.length, stand, userIds: ["a", "b"],
    }).proSpieler.b.find((v) => v.matchday === t)?.kontostand ?? 0;

    // VOR dem ersten wirklichen Stand darf nichts fließen.
    const davor = verlauf[0].matchday + 1;
    expect(davor).toBeLessThan(frueheste);
    expect(kontoBei(verlaufNachRundenSpieltag(verlauf, achse), davor)).toBe(0);
    // Mit dem rohen Verlauf floss dort bereits etwas — das ist der Fehler.
    expect(kontoBei(verlauf, davor)).toBeGreaterThan(0);
  });

});
