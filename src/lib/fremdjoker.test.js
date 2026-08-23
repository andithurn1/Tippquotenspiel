import { describe, it, expect } from "vitest";
import {
  aktiveArten, familieAn, familieSchalten, beschreibeFremdjoker,
  zulaessigeZiele, trefferWahrscheinlichkeit, tippGetroffen, gegenwetteVorschau,
  fremdEinsaetze, eingriffFenster, offeneEingriffe, zieleJeArt, sperrGrund,
  konflikte, zweiPhasenHinweis,
} from "@/lib/fremdjoker";
import { DEFAULT_EINGRIFFE } from "@/lib/eingriffe";
import { DEFAULT_DUELL } from "@/lib/duellJoker";
import { DEFAULT_RULES, brauchtVerlauf } from "@/lib/engine";

// Ein ausgeglichenes Spiel, dasselbe Raster wie in `ergebnisMatrix.test.js` —
// dieselbe Quelle für Wahrscheinlichkeiten, also auch dieselbe Vorlage.
const SNAP = {
  matchId: "m1",
  winner: { home: 2.6, draw: 3.3, away: 2.7 },
  correctScore: [
    [9, 11, 18, 42, 110, 300],
    [8, 7, 12, 30, 90, 260],
    [13, 11, 17, 44, 130, 400],
    [30, 26, 40, 100, 300, 900],
    [90, 80, 130, 320, 900, 2000],
    [300, 260, 400, 1000, 2000, 5000],
  ],
};

const R = (teil = {}) => ({ ...DEFAULT_RULES, ...teil });
const mitDuell = (teil = {}) => R({ duell: { ...DEFAULT_DUELL, enabled: true, ...teil } });

// ── 1) Die EINE Auskunft ────────────────────────────────────
describe("aktiveArten — die eine Stelle, an der die Familie Auskunft gibt", () => {
  it("in der Vorgabe läuft kein Fremdjoker, obwohl das Dach offen steht", () => {
    expect(DEFAULT_RULES.eingriffe.enabled).toBe(true);
    expect(aktiveArten(DEFAULT_RULES)).toEqual([]);
    expect(familieAn(DEFAULT_RULES)).toBe(false);
  });

  it("liest Klau und Block aus `duell`, nicht aus `eingriffe`", () => {
    expect(aktiveArten(mitDuell({ typen: ["klau"] }))).toEqual(["klau"]);
    expect(aktiveArten(mitDuell({ typen: ["block"] }))).toEqual(["block"]);
    // Reihenfolge folgt dem Katalog, nicht der Eingabe.
    expect(aktiveArten(mitDuell({ typen: ["klau", "block"] }))).toEqual(["block", "klau"]);
  });

  it("liest Trittbrettfahrer und Gegenwette aus `eingriffe`", () => {
    const r = R({ eingriffe: { ...DEFAULT_EINGRIFFE, trittbrett: { ...DEFAULT_EINGRIFFE.trittbrett, enabled: true } } });
    expect(aktiveArten(r)).toEqual(["trittbrett"]);
  });

  // 🔴 JK7 — der Kern: EIN Feld schaltet alles ab, ohne dass an `duell` etwas
  // verstellt werden muss.
  it("das Dach nimmt weg: `eingriffe.enabled: false` löscht die ganze Liste", () => {
    const an = R({
      duell: { ...DEFAULT_DUELL, enabled: true, typen: ["klau", "block"] },
      eingriffe: {
        ...DEFAULT_EINGRIFFE,
        trittbrett: { ...DEFAULT_EINGRIFFE.trittbrett, enabled: true },
        gegenwette: { ...DEFAULT_EINGRIFFE.gegenwette, enabled: true },
      },
    });
    expect(aktiveArten(an)).toHaveLength(4);
    expect(aktiveArten({ ...an, eingriffe: { ...an.eingriffe, enabled: false } })).toEqual([]);
    // …und `duell` bleibt dabei unangetastet, damit das Wiedereinschalten
    // die alten Einstellungen zurückgibt.
    expect(an.duell.typen).toEqual(["klau", "block"]);
  });

  it("das Dach gibt nichts dazu: offen und trotzdem alles aus bleibt aus", () => {
    expect(aktiveArten(R({ eingriffe: { ...DEFAULT_EINGRIFFE, enabled: true } }))).toEqual([]);
  });

  // 🔴 Die Sperrklinke gegen die doppelte Wahrheit. `engine.js` kann
  // `aktiveArten` nicht importieren (Zyklus über `ergebnisMatrix`) und hält
  // deshalb eine eigene Kurzform (`fremdjokerAktiv`). Dieser Test bindet
  // beide aneinander — läuft eine der beiden davon, fällt es hier auf und
  // nicht erst, wenn ein Endstand an einer Art vorbeirechnet.
  it("`brauchtVerlauf` und `familieAn` sind sich über alle Kombinationen einig", () => {
    const faelle = [
      DEFAULT_RULES,
      mitDuell({ typen: ["klau"] }),
      mitDuell({ typen: ["block"] }),
      R({ eingriffe: { ...DEFAULT_EINGRIFFE, trittbrett: { ...DEFAULT_EINGRIFFE.trittbrett, enabled: true } } }),
      R({ eingriffe: { ...DEFAULT_EINGRIFFE, gegenwette: { ...DEFAULT_EINGRIFFE.gegenwette, enabled: true } } }),
      R({ ...mitDuell({ typen: ["klau"] }), eingriffe: { ...DEFAULT_EINGRIFFE, enabled: false } }),
    ];
    // In der Vorgabe braucht der Endstand den Verlauf NICHT (Saisonform flach,
    // keine Streicher, kein Aufhol-Bonus) — die Gleichung ist damit sauber.
    expect(brauchtVerlauf(DEFAULT_RULES)).toBe(false);
    for (const r of faelle) expect(brauchtVerlauf(r)).toBe(familieAn(r));
  });
});

// ── 2) JK7: der Griff in beide Richtungen ───────────────────
describe("familieSchalten — der eine Griff", () => {
  it("aus schaltet das Dach zu und lässt alles andere stehen", () => {
    const vorher = mitDuell({ typen: ["klau", "block"], anzahl: 5 });
    const nachher = familieSchalten(vorher, false);
    expect(familieAn(nachher)).toBe(false);
    expect(nachher.duell.anzahl).toBe(5);
    expect(nachher.duell.typen).toEqual(["klau", "block"]);
  });

  // ⚠️ Ohne diesen zweiten Schritt wäre „ein Klick zu" ein Klick, der nichts
  // tut: das Dach allein schaltet keine Art ein.
  it("an gibt der leeren Runde die Grundausstattung, damit der Klick etwas bewirkt", () => {
    const nachher = familieSchalten(DEFAULT_RULES, true);
    expect(aktiveArten(nachher)).toEqual(["block", "klau"]);
  });

  it("an rührt eine Runde, die schon Fremdjoker hat, nicht an", () => {
    const vorher = mitDuell({ typen: ["block"], anzahl: 4 });
    const nachher = familieSchalten(familieSchalten(vorher, false), true);
    expect(aktiveArten(nachher)).toEqual(["block"]);
    expect(nachher.duell.anzahl).toBe(4);
  });

  it("aus und wieder an ist verlustfrei", () => {
    const vorher = mitDuell({ typen: ["klau"], zielWahl: "nurTop3", maxProZiel: 5 });
    const zurueck = familieSchalten(familieSchalten(vorher, false), true);
    expect(zurueck.duell).toEqual(vorher.duell);
  });

  it("beschreibt sich in einem Satz — auch im ausgeschalteten Fall", () => {
    expect(beschreibeFremdjoker(DEFAULT_RULES)).toMatch(/Keine Fremdjoker/);
    expect(beschreibeFremdjoker(familieSchalten(DEFAULT_RULES, false))).toMatch(/abgeschaltet/);
    expect(beschreibeFremdjoker(familieSchalten(DEFAULT_RULES, true))).toMatch(/Block und Klau/);
  });
});

// ── 3) JK5: die Sperrfrist je Ziel ──────────────────────────
describe("zulaessigeZiele — JK5, drei Ebenen tief", () => {
  const board = [
    { userId: "a", name: "A", total: 10 },
    { userId: "b", name: "B", total: 10 },
    { userId: "c", name: "C", total: 10 },
  ];
  const basis = (sperrfrist, typen = ["klau", "block"]) => R({
    duell: { ...DEFAULT_DUELL, enabled: true, typen, zielWahl: "frei", maxProZiel: 6, immun: 0 },
    eingriffe: { ...DEFAULT_EINGRIFFE, ...(sperrfrist ? { sperrfrist } : {}) },
  });
  const treffer = (spieltag, typ = "klau", von = "a") =>
    ({ spieltag, vonUserId: von, aufUserId: "b", typ });

  it("ohne Sperrfrist (Vorgabe 0) ändert sich nichts", () => {
    expect(zulaessigeZiele(board, "a", basis(null), {
      bisherigeEinsaetze: [treffer(8)], aktuellerSpieltag: 9, art: "klau",
    })).toContain("b");
  });

  // 🔴 Der Kern von JK5: DERSELBE darf nicht wieder, ein ANDERER schon.
  it("sperrt nur das Paar — ein anderer Angreifer darf dasselbe Ziel weiter treffen", () => {
    const rules = basis({ standard: { spieltage: 3 } });
    const args = { bisherigeEinsaetze: [treffer(8)], aktuellerSpieltag: 9, art: "klau" };
    expect(zulaessigeZiele(board, "a", rules, args)).not.toContain("b");
    expect(zulaessigeZiele(board, "c", rules, args)).toContain("b");
  });

  it("nach Ablauf der Frist ist dasselbe Ziel wieder erlaubt", () => {
    const rules = basis({ standard: { spieltage: 3 } });
    expect(zulaessigeZiele(board, "a", rules, {
      bisherigeEinsaetze: [treffer(8)], aktuellerSpieltag: 11, art: "klau",
    })).toContain("b");
  });

  // ── Ebene 2: je Fremdjoker eine eigene Zahl (Andi, 23.08.2026) ──
  it("der Block kann gesperrt sein, während der Trittbrettfahrer frei ist", () => {
    const rules = R({
      duell: { ...DEFAULT_DUELL, enabled: true, typen: ["block"], zielWahl: "frei", maxProZiel: 6, immun: 0 },
      eingriffe: {
        ...DEFAULT_EINGRIFFE,
        trittbrett: { ...DEFAULT_EINGRIFFE.trittbrett, enabled: true },
        sperrfrist: { standard: { spieltage: 0 }, block: { spieltage: 4 } },
      },
    });
    const args = { bisherigeEinsaetze: [treffer(8, "block")], aktuellerSpieltag: 9 };
    expect(zulaessigeZiele(board, "a", rules, { ...args, art: "block" })).not.toContain("b");
    expect(zulaessigeZiele(board, "a", rules, { ...args, art: "trittbrett" })).toContain("b");
    // Und dieselbe Auskunft in EINEM Aufruf, für die Oberfläche:
    const jeArt = zieleJeArt(board, "a", rules, args);
    expect(jeArt.block).not.toContain("b");
    expect(jeArt.trittbrett).toContain("b");
  });

  it("ein Block-Treffer sperrt den Klau nicht — jede Art zählt ihre eigenen", () => {
    const rules = basis({ standard: { spieltage: 4 } });
    const args = { bisherigeEinsaetze: [treffer(8, "block")], aktuellerSpieltag: 9 };
    expect(zulaessigeZiele(board, "a", rules, { ...args, art: "block" })).not.toContain("b");
    expect(zulaessigeZiele(board, "a", rules, { ...args, art: "klau" })).toContain("b");
  });

  // ── Ebene 3: der wachsende Cooldown, Andis eigenes Beispiel ──
  it("kein Verbot beim zweiten Mal — aber danach wächst die Wartezeit", () => {
    const rules = basis({ standard: { spieltage: 0, aufschlag: 2 } });
    const art = "klau";
    // Einmal getroffen (Spieltag 8) → direkt am nächsten Spieltag wieder frei.
    expect(zulaessigeZiele(board, "a", rules, {
      bisherigeEinsaetze: [treffer(8)], aktuellerSpieltag: 9, art,
    })).toContain("b");
    // Zweimal getroffen (8 und 9) → jetzt greift die gewachsene Sperre.
    const zweimal = [treffer(8), treffer(9)];
    expect(zulaessigeZiele(board, "a", rules, {
      bisherigeEinsaetze: zweimal, aktuellerSpieltag: 10, art,
    })).not.toContain("b");
    // Zwei Spieltage später ist er wieder frei.
    expect(zulaessigeZiele(board, "a", rules, {
      bisherigeEinsaetze: zweimal, aktuellerSpieltag: 11, art,
    })).toContain("b");
  });

  // 🔴 Ein „geht nicht" ohne Grund liest sich wie ein Fehler.
  it("`sperrGrund` sagt, WARUM gesperrt ist und BIS WANN", () => {
    const rules = basis({ standard: { spieltage: 0, aufschlag: 2 } });
    const grund = sperrGrund(rules, {
      art: "klau", vonUserId: "a", aufUserId: "b",
      bisherigeEinsaetze: [treffer(8), treffer(9)], aktuellerSpieltag: 10,
    });
    expect(grund.dauer).toBe(2);
    expect(grund.frei).toBe(11);
    expect(grund.text).toContain("gewachsen");
    // Wo nichts gesperrt ist, gibt es auch keinen Grund.
    expect(sperrGrund(rules, {
      art: "klau", vonUserId: "a", aufUserId: "c",
      bisherigeEinsaetze: [treffer(8)], aktuellerSpieltag: 10,
    })).toBeNull();
  });

  // 🔴 BEFUND vom 23.08.2026, hier festgehalten: `maxProZiel` und `immun`
  // zählten bis dahin nur die EIGENEN Einsätze — obwohl ihre Karte „Schutz
  // der Getroffenen" heißt und der Hinweis darunter verspricht, dass sich
  // nicht die ganze RUNDE auf eine Person einschießt.
  it("`maxProZiel` schützt das Ziel vor der RUNDE, nicht nur vor einem Angreifer", () => {
    const rules = R({
      duell: { ...DEFAULT_DUELL, enabled: true, zielWahl: "frei", maxProZiel: 2, immun: 0 },
    });
    const bisherigeEinsaetze = [treffer(5, "klau", "c"), treffer(6, "klau", "d")];
    expect(zulaessigeZiele(board, "a", rules, { bisherigeEinsaetze, aktuellerSpieltag: 9 }))
      .not.toContain("b");
  });

  it("`immun` ist die Erholung nach EINEM Treffer, egal von wem", () => {
    const rules = R({
      duell: { ...DEFAULT_DUELL, enabled: true, zielWahl: "frei", maxProZiel: 6, immun: 3 },
    });
    const bisherigeEinsaetze = [treffer(8, "klau", "c")];
    expect(zulaessigeZiele(board, "a", rules, { bisherigeEinsaetze, aktuellerSpieltag: 9 }))
      .not.toContain("b");
    expect(zulaessigeZiele(board, "a", rules, { bisherigeEinsaetze, aktuellerSpieltag: 12 }))
      .toContain("b");
  });
});

// ── 4) JK4: die Gegenwette ──────────────────────────────────
describe("trefferWahrscheinlichkeit und tippGetroffen", () => {
  it("dieselbe Stufe entscheidet vorher wie nachher", () => {
    const tip = { home: 1, away: 1 };
    expect(tippGetroffen(tip, { home: 1, away: 1 }, "exakt")).toBe(true);
    expect(tippGetroffen(tip, { home: 2, away: 2 }, "exakt")).toBe(false);
    expect(tippGetroffen(tip, { home: 2, away: 2 }, "abstand")).toBe(true);
    expect(tippGetroffen(tip, { home: 2, away: 2 }, "tendenz")).toBe(true);
    expect(tippGetroffen(tip, { home: 2, away: 0 }, "tendenz")).toBe(false);
  });

  it("je enger die Stufe, desto unwahrscheinlicher der Treffer", () => {
    const tip = { home: 1, away: 1 };
    const tendenz = trefferWahrscheinlichkeit(tip, SNAP, "tendenz");
    const abstand = trefferWahrscheinlichkeit(tip, SNAP, "abstand");
    const exakt = trefferWahrscheinlichkeit(tip, SNAP, "exakt");
    expect(exakt).toBeLessThan(abstand);
    expect(abstand).toBeLessThanOrEqual(tendenz);
    expect(tendenz).toBeGreaterThan(0);
    expect(tendenz).toBeLessThan(1);
  });

  it("ohne brauchbares Raster oder ohne Tipp gibt es keine Zahl", () => {
    expect(trefferWahrscheinlichkeit({ home: 1, away: 1 }, {})).toBeNull();
    expect(trefferWahrscheinlichkeit({}, SNAP)).toBeNull();
    expect(tippGetroffen({ home: 1, away: 1 }, null)).toBeNull();
  });

  // 🔴 Das Modell aus Teil E, an echten Rasterzahlen: gegen ein exaktes
  // Ergebnis zu wetten zahlt viel schlechter als gegen die Tendenz.
  it("die Vorschau zeigt: gegen das Sichere zu wetten bringt fast nichts", () => {
    const tip = { home: 1, away: 1 };
    const gegenTendenz = gegenwetteVorschau(tip, SNAP, R({
      eingriffe: { ...DEFAULT_EINGRIFFE, gegenwette: { ...DEFAULT_EINGRIFFE.gegenwette, stufe: "tendenz" } },
    }));
    const gegenExakt = gegenwetteVorschau(tip, SNAP, R({
      eingriffe: { ...DEFAULT_EINGRIFFE, gegenwette: { ...DEFAULT_EINGRIFFE.gegenwette, stufe: "exakt" } },
    }));
    expect(gegenTendenz.quote).toBeGreaterThan(gegenExakt.quote);
    expect(gegenExakt.gewinn).toBeLessThan(gegenTendenz.gewinn);
    // Der Verlust ist in beiden Fällen derselbe — das ist die ganze Bremse.
    expect(gegenExakt.verlust).toBe(gegenTendenz.verlust);
  });
});

describe("fremdEinsaetze", () => {
  const tipps = [
    {
      userId: "a", matchday: 3, matchId: "m1", kickoff: "2026-09-01T15:00:00Z",
      tip: { home: 2, away: 0, duell: { auf: "b", typ: "gegenwette" } },
      snapshot: SNAP, result: { home: 1, away: 1 },
    },
    {
      userId: "b", matchday: 3, matchId: "m1", kickoff: "2026-09-01T15:00:00Z",
      tip: { home: 1, away: 1 }, snapshot: SNAP, result: { home: 1, away: 1 },
    },
  ];

  it("reichert eine Gegenwette mit Wahrscheinlichkeit und Ausgang an — aus dem Tipp des ZIELS", () => {
    const [e] = fremdEinsaetze(tipps, DEFAULT_RULES);
    expect(e.typ).toBe("gegenwette");
    expect(e.matchId).toBe("m1");
    // Das Ziel hat 1:1 getippt und 1:1 ist gefallen → die Wette dagegen ist verloren.
    expect(e.getroffen).toBe(true);
    expect(e.p).toBeGreaterThan(0);
    // Und zwar SEIN p, nicht das des Angreifers (der hat 2:0 getippt).
    expect(e.p).toBeCloseTo(trefferWahrscheinlichkeit({ home: 1, away: 1 }, SNAP, "tendenz"), 6);
  });

  it("ohne Tipp des Ziels auf diesem Spiel bleibt der Einsatz unangereichert", () => {
    const [e] = fremdEinsaetze([tipps[0]], DEFAULT_RULES);
    expect(e.p).toBeUndefined();
    expect(e.getroffen).toBeUndefined();
  });

  it("Klau und Block gehen unverändert durch", () => {
    const klau = [{ ...tipps[0], tip: { ...tipps[0].tip, duell: { auf: "b", typ: "klau" } } }];
    expect(fremdEinsaetze(klau, DEFAULT_RULES)[0]).toEqual({
      spieltag: 3, vonUserId: "a", aufUserId: "b", typ: "klau", matchId: "m1",
    });
  });
});

// ── 5) JK6: sichtbar und zurücknehmbar ──────────────────────
describe("eingriffFenster — JK6", () => {
  const ANPFIFF = Date.parse("2026-09-05T18:30:00Z");
  const match = { matchday: 3, wettbewerb: "bl", kickoff: new Date(ANPFIFF).toISOString() };
  const std = 3600_000;
  const zweiPhasen = (teil = {}) => R({
    duell: { ...DEFAULT_DUELL, enabled: true },
    eingriffe: { ...DEFAULT_EINGRIFFE, ...teil },
    tippfenster: { vorlaufStunden: 168, anker: "spieltag", schlussStunden: 24 },
  });

  it("die zweite Phase ist der Abschnitt, in dem Fremdjoker gesetzt werden", () => {
    const rules = zweiPhasen();
    const starts = new Map([["bl#3", ANPFIFF]]);
    // Zwei Tage vorher: Phase 1, es wird getippt.
    expect(eingriffFenster(match, rules, ANPFIFF - 48 * std, starts).phase).toBe("tippen");
    // Zwölf Stunden vorher: Tippschluss durch, Anpfiff noch nicht.
    const p2 = eingriffFenster(match, rules, ANPFIFF - 12 * std, starts);
    expect(p2.phase).toBe("eingriffe");
    expect(p2.setzbar).toBe(true);
    expect(p2.zweiPhasen).toBe(true);
    // Nach Anpfiff ist Schluss.
    expect(eingriffFenster(match, rules, ANPFIFF + std, starts).setzbar).toBe(false);
  });

  // ⚠️ Der benannte Übergang: ohne gemeinsamen Tippschluss gibt es keine
  // zweite Phase — dann wird der Eingriff wie heute beim Tippen gesetzt.
  it("ohne Tippschluss bleibt es beim heutigen Verhalten, statt nie aufzugehen", () => {
    const rules = R({ duell: { ...DEFAULT_DUELL, enabled: true } });
    const f = eingriffFenster(match, rules, ANPFIFF - 48 * std);
    expect(f.zweiPhasen).toBe(false);
    expect(f.phase).toBe("tippen");
    expect(f.setzbar).toBe(true);
  });

  // 🔴 Die Rücknahme kommt aus der GRUNDFORM (`jokerBasis.widerruf`), nicht aus
  // einem eigenen Familien-Feld — und zwar aus DERSELBEN Funktion, die auch
  // die Tippabgabe beim Speichern fragt. Ein zweites Feld daneben hätte
  // anzeigen können, was das Speichern verweigert.
  it("die Rücknahme folgt der Joker-Grundform, je Art", () => {
    const starts = new Map([["bl#3", ANPFIFF]]);
    const mitBasis = (basis) => ({
      ...zweiPhasen(),
      duell: { ...DEFAULT_DUELL, enabled: true, typen: ["block"] },
      jokerBasis: { standard: basis },
    });
    const jetzt = ANPFIFF - 12 * std;
    // Vorgabe „bis Anpfiff": in Phase 2 noch offen.
    expect(eingriffFenster(match, mitBasis({}), jetzt, starts).ruecknehmbar).toBe(true);
    // „sofort verbindlich": gesetzt ist gesetzt.
    expect(eingriffFenster(match, mitBasis({ widerruf: "sofortVerbindlich" }), jetzt, starts).ruecknehmbar)
      .toBe(false);
    // „bis 24 Std. vorher": zwölf Stunden davor ist die Frist durch.
    expect(eingriffFenster(match, mitBasis({ widerruf: "bisStunden", widerrufStunden: 24 }), jetzt, starts)
      .ruecknehmbar).toBe(false);
  });

  it("ohne benannte Art gilt die STRENGSTE der laufenden — unter-versprechen ist harmlos", () => {
    const starts = new Map([["bl#3", ANPFIFF]]);
    const rules = {
      ...zweiPhasen(),
      duell: { ...DEFAULT_DUELL, enabled: true, typen: ["klau", "block"] },
      jokerBasis: {
        standard: {},
        "duell.block": { widerruf: "sofortVerbindlich" },
      },
    };
    const jetzt = ANPFIFF - 12 * std;
    // Der Klau wäre widerrufbar, der Block nicht → ohne Art: nein.
    expect(eingriffFenster(match, rules, jetzt, starts).ruecknehmbar).toBe(false);
    expect(eingriffFenster(match, rules, jetzt, starts, "klau").ruecknehmbar).toBe(true);
    expect(eingriffFenster(match, rules, jetzt, starts, "block").ruecknehmbar).toBe(false);
  });

  it("„verborgen“ versteckt den Eingriff bis nach dem Anpfiff — je Art", () => {
    const starts = new Map([["bl#3", ANPFIFF]]);
    const jetzt = ANPFIFF - 12 * std;
    expect(eingriffFenster(match, zweiPhasen(), jetzt, starts).sichtbar).toBe(true);
    expect(eingriffFenster(match, zweiPhasen({ sichtbar: { standard: false } }), jetzt, starts).sichtbar)
      .toBe(false);

    // Je Art getrennt: der Block liegt offen, die Gegenwette nicht.
    const gemischt = zweiPhasen({
      sichtbar: { standard: true, gegenwette: false },
      gegenwette: { ...DEFAULT_EINGRIFFE.gegenwette, enabled: true },
    });
    expect(eingriffFenster(match, gemischt, jetzt, starts, "block").sichtbar).toBe(true);
    expect(eingriffFenster(match, gemischt, jetzt, starts, "gegenwette").sichtbar).toBe(false);
    // Ohne benannte Art gilt die verschwiegenste — unter-versprechen ist harmlos.
    expect(eingriffFenster(match, gemischt, jetzt, starts).sichtbar).toBe(false);
  });
});

describe("offeneEingriffe — man sieht, WER es war", () => {
  const rules = mitDuell({ typen: ["klau", "block"] });
  const einsaetze = [
    { spieltag: 3, vonUserId: "a", aufUserId: "b", typ: "block", matchId: "m1" },
    { spieltag: 3, vonUserId: "c", aufUserId: "d", typ: "klau", matchId: "m2" },
  ];

  it("zeigt dem Betroffenen den Angreifer beim Namen", () => {
    const [e] = offeneEingriffe(einsaetze, rules, { userId: "b" });
    expect(e.vonUserId).toBe("a");
    expect(e.art.label).toBe("Block");
    expect(e.sichtbar).toBe(true);
  });

  it("wer nicht beteiligt ist, sieht nichts", () => {
    expect(offeneEingriffe(einsaetze, rules, { userId: "z" })).toEqual([]);
  });

  // ⚠️ Ohne Fenster keine Zusage: „bis wann zurücknehmbar" hängt am Anpfiff
  // und an der Grundform, und beide kennt nur der Aufrufer. Lieber ein
  // „geht nicht" zu viel als eine Zusage, die das Speichern kassiert.
  it("nur der Setzende darf zurücknehmen — und nur, wenn das Fenster es hergibt", () => {
    const offen = () => ({ ruecknehmbar: true, sichtbar: true, phase: "eingriffe" });
    expect(offeneEingriffe(einsaetze, rules, { userId: "a", fensterFuer: offen })[0].ruecknehmbar).toBe(true);
    expect(offeneEingriffe(einsaetze, rules, { userId: "b", fensterFuer: offen })[0].ruecknehmbar).toBe(false);
    // Ohne `fensterFuer` wird nichts versprochen.
    expect(offeneEingriffe(einsaetze, rules, { userId: "a" })[0].ruecknehmbar).toBe(false);
  });

  it("eine abgeschaltete Art taucht gar nicht mehr auf", () => {
    const nurBlock = mitDuell({ typen: ["block"] });
    expect(offeneEingriffe(einsaetze, nurBlock, { userId: "d" })).toEqual([]);
  });

  // ⚠️ `sichtbarVorFrist: false` blendet den Eintrag beim Betroffenen ganz aus
  // — kein Mittelding „jemand blockt eines deiner Spiele". Ob das die bessere
  // Form wäre, ist in Teil D eine offene Frage von Andi; ein dritter Zustand
  // auf Verdacht wäre ein erfundener Regler.
  it("ohne Sichtbarkeit vor der Frist sieht der Betroffene nichts — der Setzende schon", () => {
    const verdeckt = { ...rules, eingriffe: { ...DEFAULT_EINGRIFFE, sichtbar: { standard: false } } };
    expect(offeneEingriffe(einsaetze, verdeckt, { userId: "b" })).toEqual([]);
    // Der eigene Einsatz bleibt einem selbst immer offen — man hat ihn gesetzt.
    const [meiner] = offeneEingriffe(einsaetze, verdeckt, { userId: "a" });
    expect(meiner.eigener).toBe(true);
    expect(meiner.sichtbar).toBe(true);
  });

});

// ── 6) Was eine Runde einstellen MUSS ───────────────────────
describe("konflikte und der ehrliche Hinweis", () => {
  it("ohne Fremdjoker gibt es nichts zu melden", () => {
    expect(konflikte(DEFAULT_RULES)).toEqual([]);
    expect(zweiPhasenHinweis(DEFAULT_RULES)).toBeNull();
  });

  // 🔴 Andi: „Das muss halt vom Admin klar so eingestellt werden, weil sonst
  // geht's nicht auf." Gemeldet, nicht still korrigiert.
  it("meldet den fehlenden Tippschluss, sobald ein Fremdjoker läuft", () => {
    const keys = konflikte(mitDuell()).map((k) => k.key);
    expect(keys).toContain("fremdjoker-ohne-tippschluss");
  });

  it("meldet den fehlenden Anker, wenn der Tippschluss steht", () => {
    const rules = R({
      duell: { ...DEFAULT_DUELL, enabled: true },
      tippfenster: { vorlaufStunden: 168, anker: "spiel", schlussStunden: 24 },
    });
    expect(konflikte(rules).map((k) => k.key)).toContain("fremdjoker-ohne-anker");
  });

  // 🔴 Die Konflikte der Familie kommen aus EINEM Aufruf. `duellJoker.konflikte`
  // war bis zum 23.08.2026 von keiner Oberfläche aufgerufen — die Meldung
  // „mitverdienen ohne Deckel" stand gebaut und ungesehen da.
  it("bündelt auch die Konflikte aus `duell` — sonst sieht sie niemand", () => {
    const rules = R({
      duell: { ...DEFAULT_DUELL, enabled: true, klau: { anteil: 0.35, modus: "mitverdienen" }, maxProSaison: 0 },
      tippfenster: { vorlaufStunden: 168, anker: "spieltag", schlussStunden: 24 },
    });
    expect(konflikte(rules).map((k) => k.key)).toContain("duell-mitverdienen-ohne-deckel");
  });

  it("meldet den Trittbrettfahrer ohne Deckel als das, was er ist: ein zweiter Punkte-Kanal", () => {
    const rules = R({
      duell: { ...DEFAULT_DUELL, maxProSaison: 0 },
      eingriffe: {
        ...DEFAULT_EINGRIFFE,
        trittbrett: { ...DEFAULT_EINGRIFFE.trittbrett, enabled: true },
      },
      tippfenster: { vorlaufStunden: 168, anker: "spieltag", schlussStunden: 24 },
    });
    expect(konflikte(rules).map((k) => k.key)).toContain("trittbrett-ohne-deckel");
  });

  it("eine vollständig eingestellte Runde meldet nichts mehr", () => {
    const rules = R({
      duell: { ...DEFAULT_DUELL, enabled: true },
      tippfenster: { vorlaufStunden: 168, anker: "spieltag", schlussStunden: 24 },
    });
    expect(konflikte(rules)).toEqual([]);
  });

  it("meldet „sofort verbindlich“ auf einem Fremdjoker — das hebt den Zweck der Familie auf", () => {
    const rules = R({
      duell: { ...DEFAULT_DUELL, enabled: true, typen: ["klau"] },
      jokerBasis: { standard: { widerruf: "sofortVerbindlich" } },
      tippfenster: { vorlaufStunden: 168, anker: "spieltag", schlussStunden: 24 },
    });
    const fund = konflikte(rules).find((k) => k.key === "fremdjoker-ohne-ruecknahme");
    expect(fund).toBeTruthy();
    // Und die Meldung sagt, WELCHE Art es betrifft — sonst sucht der Admin.
    expect(fund.text).toContain("Klau");
  });

  // JK19 — in Andis Sprache, nicht als Systemmeldung.
  it("der Hinweis sagt, was die Runde erwartet: zweimal reinschauen", () => {
    const rules = R({
      duell: { ...DEFAULT_DUELL, enabled: true },
      tippfenster: { vorlaufStunden: 168, anker: "spieltag", schlussStunden: 24 },
    });
    const text = zweiPhasenHinweis(rules);
    expect(text).toMatch(/zweimal pro Spieltag/);
    expect(text).toMatch(/1 Tag später/);
    expect(text).toMatch(/Büro-Runde/);
  });
});

// ── JK15/Q2: mehrere Fremdjoker an EINEM Spieltag ───────────
// 🔴 Andis Entscheidung vom 23.08.2026: mehrere ja, aber auf VERSCHIEDENE
// Spiele. Vorher war `duell.proSpieltag` (1–3) wirkungslos — gemessen ergaben
// 1, 2 und 3 dreimal dasselbe, weil hier hart „ein Einsatz je Spieler und
// Spieltag" stand.
describe("fremdEinsaetze — wie viele je Spieltag", () => {
  const tipp = (matchId, kickoff, typ, auf) => ({
    userId: "a", matchday: 5, matchId, kickoff,
    tip: { home: 1, away: 1, duell: { auf, typ } },
  });
  const zwei = [
    tipp("m2", "2026-09-05T18:30:00Z", "gegenwette", "c"),
    tipp("m1", "2026-09-05T15:30:00Z", "block", "b"),
  ];
  const mitArten = (proSpieltag) => ({
    ...DEFAULT_RULES,
    duell: { ...DEFAULT_DUELL, enabled: true, typen: ["klau", "block"], proSpieltag },
    eingriffe: {
      ...DEFAULT_EINGRIFFE,
      gegenwette: { ...DEFAULT_EINGRIFFE.gegenwette, enabled: true },
    },
  });

  it("bei `proSpieltag: 1` kommt genau einer durch — der mit dem frühesten Anpfiff", () => {
    const raus = fremdEinsaetze(zwei, mitArten(1));
    expect(raus).toHaveLength(1);
    expect(raus[0].matchId).toBe("m1");
  });

  // 🔴 Der Fall, der vorher still verschwand: blocken UND gegenwetten am
  // selben Spieltag, auf zwei verschiedenen Spielen.
  it("bei `proSpieltag: 2` kommen beide durch — auf verschiedenen Spielen", () => {
    const raus = fremdEinsaetze(zwei, mitArten(2));
    expect(raus).toHaveLength(2);
    expect(raus.map((e) => e.matchId).sort()).toEqual(["m1", "m2"]);
    expect(raus.map((e) => e.typ).sort()).toEqual(["block", "gegenwette"]);
  });

  it("die Reihenfolge der Eingabe ändert nichts am Ergebnis", () => {
    const vorwaerts = fremdEinsaetze(zwei, mitArten(1));
    const rueckwaerts = fremdEinsaetze([...zwei].reverse(), mitArten(1));
    expect(rueckwaerts).toEqual(vorwaerts);
  });

  it("verschiedene Spieltage sind ohnehin unabhängig", () => {
    const ueberZweiTage = [
      tipp("m1", "2026-09-05T15:30:00Z", "block", "b"),
      { ...tipp("m9", "2026-09-12T15:30:00Z", "block", "b"), matchday: 6 },
    ];
    expect(fremdEinsaetze(ueberZweiTage, mitArten(1))).toHaveLength(2);
  });
});
