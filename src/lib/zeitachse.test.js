import { describe, it, expect } from "vitest";
import {
  zeitachse, sanitizeZeitachse, ankerWettbewerb, achsenLabel, rundenSpieltagVon,
  rundenSchluessel, warnungen, verlaufNachRundenSpieltag, DEFAULT_ZEITACHSE, ZEITACHSE_LIMITS,
  SPIELTAG_ENDE,
} from "./zeitachse";
import { wochentagIndex, tagesBeginn } from "./zonenzeit";
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
//
// 🔴 **Diese Zusage gilt seit dem 28.08.2026 für `zuordnung: "spieltag"`** und
// steht deshalb an jedem Aufruf hier ausdrücklich dabei. Sie ist NICHT
// weggefallen — sie hat einen Namen bekommen. Die Vorgabe ist inzwischen
// `"datum"`, und was die leistet, steht im Block darunter.
//
// ⚠️ Diese Tests wurden bewusst nicht auf die neue Rechnung umgeschrieben. Ein
// Test, den man anpasst, damit er wieder grün wird, hat vorher nichts bewiesen
// — hier wird die alte Zusage weiter geprüft, nur eben dort, wo sie gilt.
describe("Ein Liga-Spieltag bleibt ganz (zuordnung: spieltag)", () => {
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
    const achse = zeitachse(GETEILT, { modus: "anker", anker: "pd", zuordnung: "spieltag" });
    const nummern = ["bl1-fr", "bl1-so"].map((id) =>
      achse.find((e) => e.spiele.some((m) => m.id === id))?.nummer);
    expect(nummern[0]).toBe(nummern[1]);
  });

  it("er fällt dorthin, wo sein ERSTES Spiel liegt — nicht in den späteren", () => {
    const achse = zeitachse(GETEILT, { modus: "anker", anker: "pd", zuordnung: "spieltag" });
    expect(achse[0].ligen).toEqual({ bl: [1], pd: [1] });   // Freitag zieht den Sonntag mit
    expect(achse[1].ligen).toEqual({ pd: [2] });
  });

  it("kein Liga-Spieltag steht in zwei Runden-Spieltagen", () => {
    const achse = zeitachse(MATCHES, { modus: "anker", anker: "pd", zuordnung: "spieltag" });
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
    const achse = zeitachse(GETEILT, { modus: "anker", anker: "pd", zuordnung: "spieltag" });
    const [fr, so] = ["bl1-fr", "bl1-so"].map((id) => GETEILT.find((m) => m.id === id));
    expect(rundenSpieltagVon(achse, so)).toBe(rundenSpieltagVon(achse, fr));
    expect(rundenSpieltagVon(achse, so)).toBe(1);
  });

  it("auch der Wochen-Modus zerschneidet kein Wochenende", () => {
    const achse = zeitachse(GETEILT, { modus: "woche", tage: 3, zuordnung: "spieltag" });
    const nummern = ["bl1-fr", "bl1-so"].map((id) =>
      achse.find((e) => e.spiele.some((m) => m.id === id))?.nummer);
    expect(nummern[0]).toBe(nummern[1]);
  });
});

// ============================================================
//  🔴 DIE ZUORDNUNG NACH DATUM — die Vorgabe seit dem 28.08.2026
//
//  Andi: „ja rein nach datum, nur so haben wir ja auch quoten"
//
//  Das ist keine Anzeige-Frage. Die ganze Wertung hängt an der Quote des REALEN
//  Ergebnisses; ein im Februar nachgeholtes Spiel hat eine Februar-Quote. Fiele
//  es in den Oktober-Spieltag zurück, würde es mit einer Quote gewertet, die es
//  nie gab — und der Spieltag ist da längst abgerechnet.
// ============================================================
describe("Zuordnung nach Datum (Vorgabe)", () => {
  // Andis Beispiel aus dem Auftrag, eins zu eins: Premier League, Spieltag 10,
  // zwei Spiele im Oktober und eines vier Monate später nachgeholt.
  const OKT = Date.UTC(2026, 9, 24, 14);
  const FEB = Date.UTC(2027, 1, 17, 19);
  const NACHHOLER = [
    { id: "pl10-a", wettbewerb: "pl", matchday: 10, kickoff: new Date(OKT).toISOString() },
    { id: "pl10-b", wettbewerb: "pl", matchday: 10, kickoff: new Date(OKT + 2 * 3600 * 1000).toISOString() },
    { id: "pl10-nach", wettbewerb: "pl", matchday: 10, kickoff: new Date(FEB).toISOString() },
  ];

  it("ist die Vorgabe — niemand muss sie einschalten", () => {
    expect(DEFAULT_ZEITACHSE.zuordnung).toBe("datum");
  });

  it("das Nachholspiel landet im Februar, nicht im Oktober", () => {
    const achse = zeitachse(NACHHOLER, { modus: "woche", tage: 7, endeTag: "do" });
    const nummer = (id) => achse.find((e) => e.spiele.some((m) => m.id === id))?.nummer;
    expect(nummer("pl10-a")).toBe(nummer("pl10-b"));
    expect(nummer("pl10-nach")).toBeGreaterThan(nummer("pl10-a"));
  });

  it("🔴 rundenSpieltagVon folgt mit — sonst käme der Fehler eine Ebene tiefer zurück", () => {
    // Diese Zeile ist der eigentliche Fund beim Bauen: die Suche ging ZUERST
    // über den Liga-Spieltag. Alle drei Spiele tragen `pl#10`, also hätte das
    // Februar-Spiel wieder die Oktober-Nummer bekommen — die Achse richtig, die
    // Auskunft darüber falsch.
    const achse = zeitachse(NACHHOLER, { modus: "woche", tage: 7, endeTag: "do" });
    const okt = rundenSpieltagVon(achse, NACHHOLER[0]);
    const feb = rundenSpieltagVon(achse, NACHHOLER[2]);
    expect(feb).not.toBe(okt);
    expect(feb).toBeGreaterThan(okt);
  });

  it("🔴 und rundenSchluessel ebenso — der Merkzettel darf nicht danebengreifen", () => {
    // `rundenSchluessel` merkt sich Antworten. Auf den Liga-Spieltag geschlüsselt
    // bekäme das zweite Spiel still die Antwort des ersten.
    const achse = zeitachse(NACHHOLER, { modus: "woche", tage: 7, endeTag: "do" });
    const s = rundenSchluessel(achse);
    expect(s(NACHHOLER[0])).toBe(s(NACHHOLER[1]));      // gleicher Tag → gleicher Schlüssel
    expect(s(NACHHOLER[2])).not.toBe(s(NACHHOLER[0]));  // vier Monate später → anderer
  });

  it("mit \"spieltag\" fällt es weiterhin in den Oktober — die Wahl bleibt", () => {
    const achse = zeitachse(NACHHOLER, { modus: "woche", tage: 7, endeTag: "do", zuordnung: "spieltag" });
    const nummer = (id) => achse.find((e) => e.spiele.some((m) => m.id === id))?.nummer;
    expect(nummer("pl10-nach")).toBe(nummer("pl10-a"));
  });

  it("warnungen() meldet genau diese Kombination — und nur sie", () => {
    const cfg = { modus: "woche", tage: 7, endeTag: "do", zuordnung: "spieltag" };
    const achse = zeitachse(NACHHOLER, cfg);
    const w = warnungen(achse, cfg).find((h) => h.art === "zerrissen");
    expect(w).toBeTruthy();
    expect(w.text).toContain("Premier League 10");

    // Nach Datum gibt es nichts zu melden: dann liegt jedes Spiel dort, wo es
    // gespielt wird. Eine Warnung wäre hier ein Fehlalarm.
    const nachDatum = { ...cfg, zuordnung: "datum" };
    expect(warnungen(zeitachse(NACHHOLER, nachDatum), nachDatum).some((h) => h.art === "zerrissen")).toBe(false);
  });

  it("ohne Nachholspiel schweigt die Warnung auch bei \"spieltag\"", () => {
    // ⚠️ Gemessen am echten Katalog zerreißt eine Grenze auf festem Wochentag
    // KEINEN der 198 Liga-Spieltage. Die Warnung darf deshalb nicht an der
    // Einstellung hängen, sondern nur an den Daten.
    const cfg = { modus: "woche", tage: 7, endeTag: "do", zuordnung: "spieltag" };
    const achse = zeitachse(MATCHES, cfg);
    expect(warnungen(achse, cfg).some((h) => h.art === "zerrissen")).toBe(false);
  });

  it("sanitizeZeitachse bereinigt einen unbekannten Wert auf die Vorgabe", () => {
    expect(sanitizeZeitachse({ zuordnung: "quatsch" }).zuordnung).toBe("datum");
    expect(sanitizeZeitachse({ zuordnung: null }).zuordnung).toBe("datum");
    expect(sanitizeZeitachse({ zuordnung: "spieltag" }).zuordnung).toBe("spieltag");
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

describe("🔴 Der Wochentag, an dem ein Spieltag VORBEI ist (Andi, 28.08.2026)", () => {
  // Seine Ansage, in der Fassung, die zaehlt: „Donnerstag 23:59 ist spieltag
  // vorbei mein ich, bzw. Kann admin auch einstellen dass es halt Montag 23:59
  // auch gehen kann, aber tendenziell macht Donnerstag mehr sinn."
  //
  // 🔴 Das ist die Umkehrung der ersten Lesart: nicht „ab Donnerstag beginnt
  // der neue", sondern „Donnerstag ist der alte zu Ende". Der naechste beginnt
  // also FREITAG. Genau darum heisst das Feld `endeTag` und nicht `startTag` —
  // ein Feld, das „Anfang" heisst, waehrend der Admin in Enden denkt, ist die
  // zweite Wahrheit, aus der in diesem Projekt schon 17 Fehler an einem Tag
  // entstanden sind.
  //
  // 🔴 Nachgemessen an der Creator-Testrunde, BEVOR es die Einstellung gab:
  // die Champions League war in 2 von 12 Runden-Spieltagen das letzte Spiel.
  // Danach in 12 von 12. Genau dieser Unterschied wird hier festgehalten —
  // nicht die Zahl 12, sondern die Eigenschaft.

  // Ein Spielplan wie in Wirklichkeit: Liga am Wochenende, Europapokal Di/Mi.
  // Alle Zeiten als UTC-Millisekunden, damit der Test auf jedem Rechner
  // dasselbe misst.
  const woche = (nr) => {
    const mo = Date.UTC(2026, 8, 7) + nr * 7 * TAG;   // Montag, 07.09.2026
    return [
      spiel("bl", nr, mo + 4 * TAG + 18.5 * 3600e3, `bl-fr-${nr}`),  // Freitag 20:30
      spiel("bl", nr, mo + 5 * TAG + 13.5 * 3600e3, `bl-sa-${nr}`),  // Samstag 15:30
      spiel("pd", nr, mo + 6 * TAG + 19 * 3600e3, `pd-so-${nr}`),    // Sonntag 21:00
      spiel("cl", nr, mo + 8 * TAG + 19 * 3600e3, `cl-di-${nr}`),    // Dienstag 21:00
      spiel("cl", nr, mo + 9 * TAG + 19 * 3600e3, `cl-mi-${nr}`),    // Mittwoch 21:00
    ];
  };
  // ⚠️ Und eine Liga, die frueher und an einem SONNTAG beginnt — La Liga tut
  // in Wirklichkeit genau das (16.08.2026, 17:00). Daran haengen die Fenster
  // ohne feste Grenze, und deshalb lag der Europapokal bisher mitten drin.
  const frueh = [
    spiel("pd", 90, Date.UTC(2026, 7, 16) + 15 * 3600e3, "pd-frueh-1"),
    spiel("pd", 91, Date.UTC(2026, 7, 23) + 15 * 3600e3, "pd-frueh-2"),
    spiel("pd", 92, Date.UTC(2026, 7, 30) + 15 * 3600e3, "pd-frueh-3"),
  ];
  const matches = [...frueh, ...[0, 1, 2, 3].flatMap((n) => woche(n))];
  const letztes = (e) => e.spiele.at(-1);

  it("🔴 endet der Spieltag donnerstags, steht der Europapokal an seinem ENDE", () => {
    const achse = zeitachse(matches, { modus: "woche", tage: 7, endeTag: "do" })
      .filter((e) => e.spiele.length);
    const mitCl = achse.filter((e) => e.spiele.some((m) => m.wettbewerb === "cl"));
    expect(mitCl.length).toBeGreaterThan(1);
    for (const e of mitCl) {
      expect(letztes(e).wettbewerb, `Spieltag ${e.nummer}`).toBe("cl");
    }
    // Und die Liga eröffnet ihn — Andis „dann gehts Freitag wieder mit Liga los".
    for (const e of mitCl) {
      expect(e.spiele[0].wettbewerb, `Spieltag ${e.nummer}`).not.toBe("cl");
    }
  });

  it("⚠️ ohne Grenze zerfällt genau das — der Zustand bis zum 28.08.2026", () => {
    // Die Fenster hängen am ersten Anpfiff (hier Freitagabend), also liegt der
    // Europapokal MITTEN im Spieltag statt an seinem Ende.
    const achse = zeitachse(matches, { modus: "woche", tage: 7, endeTag: null })
      .filter((e) => e.spiele.length);
    const mitCl = achse.filter((e) => e.spiele.some((m) => m.wettbewerb === "cl"));
    expect(mitCl.some((e) => letztes(e).wettbewerb !== "cl")).toBe(true);
  });

  it("🔴 die Grenze liegt auf FREITAG 00:00 — dem Tag NACH dem Ende", () => {
    const achse = zeitachse(matches, { modus: "woche", tage: 7, endeTag: "do" });
    // Der erste Eintrag beginnt bewusst im Unendlichen (alles davor gehört zu
    // ihm) — geprüft werden die echten Grenzen dahinter.
    // ⚠️ 5 = Freitag. Stuende hier 4, waere die Ende-Lesart wieder zur
    // Anfang-Lesart geworden — und der Donnerstagsabend faenge den neuen
    // Spieltag an, statt den alten zu beschliessen.
    for (const e of achse.slice(1)) {
      expect(wochentagIndex(e.von), new Date(e.von).toISOString()).toBe(5);
    }
  });

  it("🔴 die Grenze bleibt an der Zeitumstellung stehen", () => {
    // Der Fund vom 28.08.2026, gemessen an der echten Creator-Runde: mit
    // reinen Millisekunden-Schritten landete die Grenze nach dem 25.10. auf
    // **Donnerstag 23:00** statt Freitag 00:00 — sieben mal 24 Stunden sind im
    // Oktober acht Tage minus einer Stunde. Der Spieltag haette damit eine
    // Stunde VOR seinem Ende begonnen, und ein Donnerstagsspiel um 23:30 waere
    // in den falschen gefallen.
    const ueberDieUmstellung = [];
    for (let w = 0; w < 10; w++) {
      const sa = Date.UTC(2026, 9, 3) + w * 7 * TAG;   // Samstag, 03.10.2026
      ueberDieUmstellung.push(spiel("bl", 100 + w, sa + 13.5 * 3600e3, `u-bl-${w}`));
      ueberDieUmstellung.push(spiel("cl", 100 + w, sa + 3 * TAG + 19 * 3600e3, `u-cl-${w}`));
    }
    const achse = zeitachse(ueberDieUmstellung, { modus: "woche", tage: 7, endeTag: "do" });
    // 5 = Freitag, ausnahmslos — vor wie nach dem letzten Oktober-Sonntag.
    for (const e of achse.slice(1)) {
      expect(wochentagIndex(e.von), new Date(e.von).toISOString()).toBe(5);
    }
    // Und die Uhrzeit ist wirklich Mitternacht, nicht 23:00 des Vortags.
    for (const e of achse.slice(1)) {
      expect(e.von - tagesBeginn(e.von), new Date(e.von).toISOString()).toBe(0);
    }
  });

  it("⚠️ kein Liga-Spieltag wird von der Grenze zerschnitten", () => {
    // Das ist die Zusage, die über allem steht: zugeordnet wird der GANZE
    // Liga-Spieltag. Eine neue Grenze darf sie nicht aushebeln.
    const achse = zeitachse(matches, { modus: "woche", tage: 7, endeTag: "do" });
    const wo = new Map();
    achse.forEach((e, i) => {
      for (const m of e.spiele) {
        const k = `${m.wettbewerb}-${m.matchday}`;
        if (!wo.has(k)) wo.set(k, new Set());
        wo.get(k).add(i);
      }
    });
    for (const [k, orte] of wo) expect(orte.size, k).toBe(1);
  });

  it("die Einstellung überlebt das Bereinigen — `null` eingeschlossen", () => {
    expect(sanitizeZeitachse({ endeTag: "mo" }).endeTag).toBe("mo");
    // ⚠️ `null` ist ein GÜLTIGER Wert („ab dem ersten Anpfiff"), kein
    // fehlender. Fiele er auf die Vorgabe zurück, käme eine Runde nie wieder
    // zur alten Rechnung.
    expect(sanitizeZeitachse({ endeTag: null }).endeTag).toBe(null);
    expect(sanitizeZeitachse({ endeTag: "quatsch" }).endeTag).toBe(DEFAULT_ZEITACHSE.endeTag);
    expect(sanitizeZeitachse({}).endeTag).toBe("do");
    // Andis zweites Beispiel, woertlich: „dass es halt Montag 23:59 auch gehen
    // kann". Die Grenze liegt dann auf Dienstag 00:00.
    expect(sanitizeZeitachse({ endeTag: "mo" }).endeTag).toBe("mo");
  });

  it("die Auswahlliste bietet alle sieben Tage plus die alte Rechnung", () => {
    expect(SPIELTAG_ENDE).toHaveLength(8);
    expect(SPIELTAG_ENDE[0].key).toBe(null);
    // Der Text nennt die Uhrzeit — „Donnerstag 23:59", nicht „Donnerstag".
    expect(SPIELTAG_ENDE.find((w) => w.key === "do").label).toBe("Donnerstag 23:59");
    expect(SPIELTAG_ENDE.map((w) => w.key)).toContain("do");
    for (const w of SPIELTAG_ENDE) expect(w.label.length, w.key).toBeGreaterThan(3);
  });

  // 🔴 **Dieser Test stand bis zum 28.08.2026 andersherum da** und schrieb fest,
  // dass die Vorgabe `anker` ist. Genau darin lag der Fehler: `endeTag` wirkt
  // NUR im Wochen-Modus, also bekam eine neu angelegte Runde Andis
  // Donnerstagsgrenze überhaupt nicht — die Einstellung war gebaut, angezeigt
  // und wirkungslos.
  //
  // ⚠️ Die Zusage, die der alte Test eigentlich schützen wollte („bestehende
  // Runden ändern sich nicht"), gilt unverändert und steht jetzt im zweiten
  // Test darunter: eine Runde speichert ihre Achse, und eine gespeicherte
  // `anker`-Achse rechnet exakt wie vorher.
  it("🔴 die Vorgabe ist der Wochen-Modus — sonst greift der Donnerstag nie", () => {
    expect(DEFAULT_ZEITACHSE.modus).toBe("woche");
    expect(DEFAULT_ZEITACHSE.endeTag).toBe("do");
    // Und die Vorgabe muss die Grenze auch wirklich auf Freitag legen.
    const achse = zeitachse(matches, DEFAULT_ZEITACHSE);
    const grenzen = achse.slice(1).map((e) => wochentagIndex(e.von));
    for (const tag of grenzen) expect(tag).toBe(wochentagIndex(tagesBeginn(Date.UTC(2026, 7, 28))));
  });

  it("⚠️ eine gespeicherte Anker-Achse rechnet unverändert wie vorher", () => {
    // Bestehende Runden tragen ihr Regelwerk bei sich — die neue Vorgabe holt
    // sie nicht ein. `endeTag` bleibt dort ohne Wirkung, und das ist richtig:
    // im Anker-Modus gibt der Taktgeber die Grenze vor.
    const gespeichert = { ...DEFAULT_ZEITACHSE, modus: "anker" };
    const vorher = zeitachse(matches, { ...gespeichert, endeTag: null });
    const nachher = zeitachse(matches, gespeichert);
    expect(nachher.map((e) => e.spiele.length)).toEqual(vorher.map((e) => e.spiele.length));
  });
});
