import { describe, it, expect } from "vitest";
import {
  aktiveArten, familieAn, familieSchalten, beschreibeFremdjoker,
  zulaessigeZiele, trefferWahrscheinlichkeit, tippGetroffen, gegenwetteVorschau,
  fremdEinsaetze, eingriffFenster, offeneEingriffe, zieleJeArt, sperrGrund,
  losZiele, meinLos, geschuetzteSpiele, schutzStand, konflikte, zweiPhasenHinweis,
  tippSperre,
  grosseRundeHinweis, RUNDE_KLEIN_BIS,
} from "@/lib/fremdjoker";
import { DEFAULT_EINGRIFFE } from "@/lib/eingriffe";
import { DEFAULT_DUELL, applyDuellJoker } from "@/lib/duellJoker";
import { DEFAULT_RULES, brauchtVerlauf, sanitizeRules } from "@/lib/engine";
import { verlaufPositionen } from "@/lib/spieltag";

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

  // 🔴 UMGEDREHT AM 25.08.2026. Hier wurde geprüft, dass der fehlende
  // Tippschluss GEMELDET wird — die App verlangte ihn (`korrigieren: true`).
  //
  // Andi: „will nicht so nen engen Zeitplan bei Tippabgabe und Jokereinsatz
  // verpflichtend machen." Der Eintrag ist weg; `zweiPhasenHinweis` sagt
  // dasselbe in derselben Komponente, nur ohne Vorwurf.
  //
  // ⚠️ Der Test bleibt und sichert jetzt das Gegenteil — sonst käme die
  // Pflicht beim nächsten Umbau unbemerkt zurück.
  it("verlangt KEINEN Tippschluss mehr", () => {
    const keys = konflikte(mitDuell()).map((k) => k.key);
    expect(keys).not.toContain("fremdjoker-ohne-tippschluss");
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
  //
  // 🔴 UMGESCHRIEBEN AM 25.08.2026. Der Text sagte vorher in BEIDEN Fällen
  // „muss zweimal reinschauen" — auch ohne Tippschluss, wo es gar nicht
  // stimmte. Andi: „will nicht so nen engen Zeitplan … verpflichtend machen."
  it("bei getrennter Fahrweise: sagt, was die Runde erwartet", () => {
    const rules = R({
      duell: { ...DEFAULT_DUELL, enabled: true },
      tippfenster: { vorlaufStunden: 168, anker: "spieltag", schlussStunden: 24 },
    });
    const h = zweiPhasenHinweis(rules);
    expect(h.ton).toBe("warnung");
    expect(h.text).toMatch(/zweimal pro Spieltag/);
    expect(h.text).toMatch(/1 Tag später/);
    expect(h.text).toMatch(/Benachrichtigungen/);
    expect(h.text).toMatch(/Büro-Runde/);
  });

  it("ohne Tippschluss: beruhigt, statt zu mahnen", () => {
    // 🔴 Der Normalfall. Ein roter Kasten hätte den Admin zu einer
    // Einstellung gedrängt, die er gar nicht braucht.
    const h = zweiPhasenHinweis(mitDuell());
    expect(h.ton).toBe("info");
    expect(h.text).toMatch(/einmal reinschauen/);
    expect(h.text).toMatch(/verpufft/);
    expect(h.text).not.toMatch(/muss/);
  });

  it("meldet den fehlenden Anker weiter — das IST ein Fehler", () => {
    // ⚠️ Die Gegenprobe: nicht jede Meldung ist weggefallen. Wer einen
    // Tippschluss SETZT, braucht dazu den passenden Anker, sonst geht ein
    // spätes Spiel erst auf, wenn der Schluss vorbei ist.
    const rules = R({
      duell: { ...DEFAULT_DUELL, enabled: true },
      tippfenster: { vorlaufStunden: 168, anker: "spiel", schlussStunden: 24 },
    });
    const fund = konflikte(rules).find((k) => k.key === "fremdjoker-ohne-anker");
    expect(fund).toBeTruthy();
    expect(fund.korrigieren).toBe(true);
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

// ── JK12: das ausgeloste Ziel ───────────────────────────────
// 🔴 Andi, 22.08.2026: „dass man eine fest ausgeloste Person bekommt … man
// kann sich also sein Opfer nicht genau aussuchen, aber muss eben bei seiner
// Tippabgabe schauen, bei welchem Einzelspiel man den jeweiligen Joker
// einsetzt." Alle fünf Fragen dazu sind am 23.08.2026 zu Einstellungen
// geworden — diese Tests halten fest, was jede von ihnen bewirkt.
describe("losZiele — die Auslosung", () => {
  const ids = ["a", "b", "c", "d", "e"];
  const los = (teil = {}) => ({ takt: "spieltag", paare: "einseitig", sichtbar: "eigenes", jeArt: false, ...teil });

  // 🔴 Der Grund, warum es eine Permutation ist und keine unabhängige
  // Ziehung: sonst könnten drei denselben ziehen — und das Rudelbilden, das
  // das Los verhindern soll, wäre wieder da, nur mit Zufall statt Absicht.
  it("jeder zieht genau einen und wird genau einmal gezogen", () => {
    const z = losZiele({ userIds: ids, spieltag: 3, seed: "r1", los: los() });
    expect(z.size).toBe(ids.length);
    expect([...z.values()].sort()).toEqual([...ids].sort());
    for (const [von, auf] of z) expect(von).not.toBe(auf);
  });

  it("dieselbe Runde bekommt immer dasselbe Los", () => {
    const a = losZiele({ userIds: ids, spieltag: 3, seed: "r1", los: los() });
    const b = losZiele({ userIds: [...ids].reverse(), spieltag: 3, seed: "r1", los: los() });
    expect([...b.entries()].sort()).toEqual([...a.entries()].sort());
  });

  // Frage 1: wie oft neu auslosen?
  it("`takt: spieltag` lost neu, `takt: saison` nicht", () => {
    const t3 = losZiele({ userIds: ids, spieltag: 3, seed: "r1", los: los() });
    const t4 = losZiele({ userIds: ids, spieltag: 4, seed: "r1", los: los() });
    expect([...t4.entries()]).not.toEqual([...t3.entries()]);

    const s3 = losZiele({ userIds: ids, spieltag: 3, seed: "r1", los: los({ takt: "saison" }) });
    const s9 = losZiele({ userIds: ids, spieltag: 9, seed: "r1", los: los({ takt: "saison" }) });
    expect([...s9.entries()]).toEqual([...s3.entries()]);
  });

  it("`takt: einsatz` wechselt erst, wenn jemand eingesetzt hat", () => {
    const cfg = { userIds: ids, spieltag: 3, seed: "r1", los: los({ takt: "einsatz" }) };
    const ohne = losZiele({ ...cfg, einsaetzeJeSpieler: new Map() });
    const nachEinem = losZiele({ ...cfg, einsaetzeJeSpieler: new Map([["a", 1]]) });
    expect(nachEinem.get("a")).not.toBe(ohne.get("a"));
    // Wer nicht eingesetzt hat, behält sein Ziel.
    expect(nachEinem.get("b")).toBe(ohne.get("b"));
  });

  // Frage 2: gegenseitig oder einseitig?
  it("`paare: gegenseitig` verlost Paare — und bei ungerader Zahl einen Dreier", () => {
    const gerade = losZiele({ userIds: ["a", "b", "c", "d"], spieltag: 3, seed: "r1", los: los({ paare: "gegenseitig" }) });
    for (const [von, auf] of gerade) expect(gerade.get(auf)).toBe(von);

    const ungerade = losZiele({ userIds: ids, spieltag: 3, seed: "r1", los: los({ paare: "gegenseitig" }) });
    // Auch hier gilt die wichtigere Regel: jeder wird genau einmal gezogen.
    expect(ungerade.size).toBe(ids.length);
    expect([...ungerade.values()].sort()).toEqual([...ids].sort());
  });

  // Frage 5: ein Los für alle Arten oder je Art eins?
  it("`jeArt` gibt jedem Fremdjoker ein eigenes Los", () => {
    const gemeinsam = (art) => losZiele({ userIds: ids, spieltag: 3, seed: "r1", los: los(), art });
    expect(gemeinsam("block").get("a")).toBe(gemeinsam("klau").get("a"));

    const getrennt = (art) => losZiele({ userIds: ids, spieltag: 3, seed: "r1", los: los({ jeArt: true }), art });
    expect([...getrennt("block").entries()]).not.toEqual([...getrennt("klau").entries()]);
  });

  it("unter zwei Teilnehmern gibt es nichts zu losen", () => {
    expect(losZiele({ userIds: ["a"], spieltag: 3, seed: "r1", los: los() }).size).toBe(0);
  });
});

describe("meinLos und die Zielwahl „ausgelost“", () => {
  const board = ["a", "b", "c", "d"].map((id) => ({ userId: id, name: id.toUpperCase(), total: 10 }));
  const ids = board.map((b) => b.userId);
  const R2 = (duellTeil = {}, eingriffeTeil = {}) => ({
    ...DEFAULT_RULES,
    duell: { ...DEFAULT_DUELL, enabled: true, typen: ["klau"], maxProZiel: 9, immun: 0, ...duellTeil },
    eingriffe: { ...DEFAULT_EINGRIFFE, ...eingriffeTeil },
  });

  it("ohne die Einstellung gibt es kein Los", () => {
    expect(meinLos(R2({ zielWahl: "frei" }), { userId: "a", userIds: ids, spieltag: 3, seed: "r1" })).toBeNull();
  });

  // 🔴 Der Kern: die Entscheidung wird VERSCHOBEN, nicht weggenommen. Statt
  // „über wen?" bleibt „bei welchem Spiel?".
  it("mit Los bleibt genau EIN Ziel übrig — das gezogene", () => {
    const rules = R2({ zielWahl: "ausgelost" });
    const args = { userId: "a", userIds: ids, spieltag: 3, seed: "r1" };
    const los = meinLos(rules, args);
    expect(los.ziel).toBeTruthy();
    expect(zulaessigeZiele(board, "a", rules, { aktuellerSpieltag: 3, seed: "r1", art: "klau" }))
      .toEqual([los.ziel]);
  });

  // ⚠️ Fehlende Daten heißen NEIN. Fiele eine Runde mit Los still auf freie
  // Wahl zurück, sobald ein Aufrufer den Seed vergisst, würde es niemand
  // merken — dieselbe Regel wie beim Tipp-Fenster.
  it("ohne verwertbares Los bleibt die Liste LEER, statt auf freie Wahl zu fallen", () => {
    const rules = R2({ zielWahl: "ausgelost" });
    expect(zulaessigeZiele(board, "a", rules, { aktuellerSpieltag: 3, seed: "r1", art: "klau" }).length).toBe(1);
    // Nur ein Teilnehmer: es gibt gar kein Los — und damit auch kein Ziel.
    expect(zulaessigeZiele([board[0]], "a", rules, { aktuellerSpieltag: 3, seed: "r1", art: "klau" })).toEqual([]);
  });

  // Frage 3: sieht man sein Los?
  it("`sichtbar` entscheidet, was man erfährt", () => {
    const args = { userId: "a", userIds: ids, spieltag: 3, seed: "r1" };
    const eigenes = meinLos(R2({ zielWahl: "ausgelost" }), args);
    expect(eigenes.sichtbar).toBe(true);
    expect(eigenes.gezogenVon).toBeNull();   // wer MICH gezogen hat, bleibt verdeckt

    const offen = meinLos(R2({ zielWahl: "ausgelost" },
      { los: { jeArt: false, standard: { takt: "spieltag", paare: "einseitig", sichtbar: "alle" } } }), args);
    expect(offen.gezogenVon).toBeTruthy();
    expect(offen.alle.size).toBe(ids.length);

    const keines = meinLos(R2({ zielWahl: "ausgelost" },
      { los: { jeArt: false, standard: { takt: "spieltag", paare: "einseitig", sichtbar: "keines" } } }), args);
    expect(keines.sichtbar).toBe(false);
  });

  // Der Konter bleibt die Ausnahme, die er überall ist.
  it("ein Konter bricht auch das Los", () => {
    const rules = R2({ zielWahl: "ausgelost", konter: true });
    const los = meinLos(rules, { userId: "a", userIds: ids, spieltag: 3, seed: "r1" });
    const angreifer = ids.find((id) => id !== "a" && id !== los.ziel);
    const ziele = zulaessigeZiele(board, "a", rules, {
      aktuellerSpieltag: 3, seed: "r1", art: "klau",
      bisherigeEinsaetze: [{ spieltag: 3, vonUserId: angreifer, aufUserId: "a", typ: "klau" }],
    });
    expect(ziele.sort()).toEqual([los.ziel, angreifer].sort());
  });
});

// ── JK14: geschützte Spiele ─────────────────────────────────
// 🔴 Andi, 22.08.2026: „dass die Option für jeden Tippabgeber besteht,
// ausgewählte Spiele für jeden Spieltag vor jedem Fremdjoker zu schützen (weil
// man die halt evtl selber live verfolgen will)." Die einzige Schutzregel, die
// dem SPIELER gehört — der Admin stellt nur die Anzahl.
describe("geschuetzteSpiele und der Schutz in der Wertung", () => {
  const tipp = (userId, matchId, kickoff, extra = {}) => ({
    userId, matchday: 5, matchId, kickoff,
    tip: { home: 1, away: 1, ...extra },
  });
  const R3 = (schutz = {}, duellTeil = {}) => ({
    ...DEFAULT_RULES,
    duell: { ...DEFAULT_DUELL, enabled: true, typen: ["block"], proSpieltag: 3, ...duellTeil },
    eingriffe: { ...DEFAULT_EINGRIFFE, schutz: { ...DEFAULT_EINGRIFFE.schutz, ...schutz } },
  });

  it("nur markierte Spiele sind geschützt", () => {
    const tipps = [
      tipp("b", "m1", "2026-09-05T15:30:00Z", { schutz: true }),
      tipp("b", "m2", "2026-09-05T18:30:00Z"),
    ];
    const g = geschuetzteSpiele(tipps, R3());
    expect(g.has("b#m1")).toBe(true);
    expect(g.has("b#m2")).toBe(false);
  });

  // ⚠️ Die Zahl gehört dem Admin: bei „alle Spiele schützbar" gibt es keine
  // Fremdjoker mehr. Deshalb ein Kontingent je Spieltag.
  it("das Kontingent wird in der WERTUNG durchgesetzt, nicht nur im Screen", () => {
    const tipps = ["m1", "m2", "m3"].map((m, i) =>
      tipp("b", m, `2026-09-05T1${i}:30:00Z`, { schutz: true }));
    const eins = geschuetzteSpiele(tipps, R3({ proSpieltag: 1 }));
    expect(eins.size).toBe(1);
    // Es gewinnt der früheste Anpfiff — nicht die Reihenfolge in der Liste.
    expect(eins.has("b#m1")).toBe(true);
    expect(geschuetzteSpiele([...tipps].reverse(), R3({ proSpieltag: 1 }))).toEqual(eins);
    expect(geschuetzteSpiele(tipps, R3({ proSpieltag: 0 })).size).toBe(0);
    expect(geschuetzteSpiele(tipps, R3({ proSpieltag: 3 })).size).toBe(3);
  });

  it("`schutzStand` sagt, wie viele noch frei sind", () => {
    const tipps = [tipp("b", "m1", "2026-09-05T15:30:00Z", { schutz: true })];
    const stand = schutzStand(tipps, R3({ proSpieltag: 2 }), { userId: "b", spieltag: 5 });
    expect(stand).toMatchObject({ erlaubt: 2, vergeben: 1, frei: 1 });
    expect(stand.spiele).toEqual(["m1"]);
  });

  // 🔴 Die zwei Varianten aus Andis offener Frage, jetzt als Einstellung.
  it("`zurueck` nimmt den Einsatz aus der Liste, `verfaellt` lässt ihn stehen", () => {
    const tipps = [
      tipp("a", "m1", "2026-09-05T15:30:00Z", { duell: { auf: "b", typ: "block" } }),
      tipp("b", "m1", "2026-09-05T15:30:00Z", { schutz: true }),
    ];
    expect(fremdEinsaetze(tipps, R3({ verfall: "zurueck" }))).toEqual([]);

    const bleibt = fremdEinsaetze(tipps, R3({ verfall: "verfaellt" }));
    expect(bleibt).toHaveLength(1);
    expect(bleibt[0].geschuetzt).toBe(true);
  });

  // Der Kern: ein geschütztes Spiel kostet keine Punkte.
  it("ein Einsatz auf ein geschütztes Spiel bewegt nichts", () => {
    const verlauf = [{ wettbewerb: "BL", matchday: 1, board: [
      { userId: "a", name: "A", total: 0 },
      { userId: "b", name: "B", total: 100 },
    ] }];
    const rules = R3({ verfall: "verfaellt" });
    const ein = [{ spieltag: 1, vonUserId: "a", aufUserId: "b", typ: "block", matchId: "m1" }];
    // Ohne Schutz dämpft der Block.
    expect(applyDuellJoker(verlauf, rules, ein)[0].board.find((z) => z.userId === "b").total)
      .toBeLessThan(100);
    // Mit Marke bleibt alles, wie es war.
    const geschuetzt = [{ ...ein[0], geschuetzt: true }];
    expect(applyDuellJoker(verlauf, rules, geschuetzt)).toEqual(verlauf);
  });

  it("meldet den verdeckten Schutz mit Rückgabe — er verrät sich selbst", () => {
    const rules = {
      ...R3({ sichtbar: false, verfall: "zurueck" }),
      tippfenster: { vorlaufStunden: 168, anker: "spieltag", schlussStunden: 24 },
    };
    expect(konflikte(rules).map((k) => k.key)).toContain("schutz-verdeckt-verraet-sich");
    const sauber = { ...rules, eingriffe: { ...rules.eingriffe, schutz: { ...rules.eingriffe.schutz, sichtbar: true } } };
    expect(konflikte(sauber).map((k) => k.key)).not.toContain("schutz-verdeckt-verraet-sich");
  });
});

// ── 🔴 Der Spieltag, auf dem ein Einsatz landet ─────────────
//
// **Der Befund vom 23.08.2026, und er ist der teuerste Fehlertyp dieses
// Projekts** (CLAUDE.md, Runden-Schicht, Frage 2). Die Einsätze trugen den
// LIGA-Spieltag; der Verlauf ist aber nach der CHRONOLOGISCHEN Position über
// alle Wettbewerbe geordnet. Gemessen an vier echten Spielen: ein Klau,
// gesetzt am CL-Spieltag 2, wirkte auf den BUNDESLIGA-Spieltag 2 — er nahm
// Punkte von einem ganz anderen Tag ab. Fehlgeschlagen ist dabei nichts.
//
// ⚠️ Die naheliegende Reparatur war ebenfalls falsch: `rundenSpieltagVon`
// zählt die Spieltage der ZEITACHSE, und die bündelt anders (34
// Bundesliga-Spieltage ergeben 42 Achsen-Positionen). Maßgeblich ist allein
// `verlaufPositionen` — dieselbe Liste, aus der auch der Verlauf entsteht.
describe("fremdEinsaetze — auf welchem Spieltag ein Einsatz landet", () => {
  // Vier Spieltage über zwei Wettbewerbe, bewusst NICHT in der Reihenfolge
  // ihrer Nummern: bl#1 · bl#2 · cl#1 · cl#2 chronologisch.
  const tage = [
    { wettbewerb: "bl", matchday: 1, kickoff: "2026-08-28T18:30:00Z" },
    { wettbewerb: "bl", matchday: 2, kickoff: "2026-09-04T18:30:00Z" },
    { wettbewerb: "cl", matchday: 1, kickoff: "2026-09-15T18:30:00Z" },
    { wettbewerb: "cl", matchday: 2, kickoff: "2026-09-29T18:30:00Z" },
  ];
  const entries = tage.flatMap((t, i) => ["a", "b"].map((u) => ({
    userId: u, name: u, matchId: `${t.wettbewerb}-${t.matchday}`,
    matchday: t.matchday, wettbewerb: t.wettbewerb, kickoff: t.kickoff,
    tip: { home: u === "a" ? 1 : 2, away: i % 2 },
  })));
  const tipp = (w, md) => [{
    userId: "a", matchday: md, wettbewerb: w, matchId: `${w}-${md}`,
    kickoff: tage.find((t) => t.wettbewerb === w && t.matchday === md).kickoff,
    tip: { duell: { auf: "b", typ: "klau" } },
  }];
  const rules = mitDuell({ typen: ["klau"] });

  it("ohne Umrechnung trägt der Einsatz den LIGA-Spieltag — das war der Fehler", () => {
    expect(fremdEinsaetze(tipp("cl", 2), rules)[0].spieltag).toBe(2);
  });

  it("mit `verlaufPositionen` trägt er die POSITION im Verlauf", () => {
    const raus = fremdEinsaetze(tipp("cl", 2), rules,
      { rundenSpieltag: verlaufPositionen(entries) });
    // cl#2 ist der VIERTE Spieltag der Runde, nicht der zweite.
    expect(raus[0].spieltag).toBe(4);
  });

  it("und der erste Spieltag bleibt der erste", () => {
    const raus = fremdEinsaetze(tipp("bl", 1), rules,
      { rundenSpieltag: verlaufPositionen(entries) });
    expect(raus[0].spieltag).toBe(1);
  });

  // Die Gegenprobe: bei EINEM Wettbewerb sind beide Zahlen dieselbe. Genau
  // deshalb ist der Fehler so lange unbemerkt geblieben.
  it("bei nur einem Wettbewerb ändert die Umrechnung nichts", () => {
    const nurBl = entries.filter((e) => e.wettbewerb === "bl");
    const ohne = fremdEinsaetze(tipp("bl", 2), rules)[0].spieltag;
    const mit = fremdEinsaetze(tipp("bl", 2), rules,
      { rundenSpieltag: verlaufPositionen(nurBl) })[0].spieltag;
    expect(mit).toBe(ohne);
  });

  // 🔴 Und der Beleg, dass die Wertung die Zahl wirklich so benutzt: derselbe
  // Einsatz wirkt an unterschiedlichen Stellen des Verlaufs.
  it("die Wertung setzt die Wirkung genau dort an", () => {
    const verlauf = tage.map((t, i) => ({
      wettbewerb: t.wettbewerb, matchday: t.matchday,
      board: [
        { userId: "a", name: "a", total: 0 },
        { userId: "b", name: "b", total: 100 * (i + 1) },
      ],
    }));
    const wirktAn = (spieltag) => {
      const raus = applyDuellJoker(verlauf, { ...rules, duell: { ...rules.duell, maxProSaison: 0 } },
        [{ spieltag, vonUserId: "a", aufUserId: "b", typ: "klau" }]);
      return raus.findIndex((v) => v.board.some((z) => z.duell));
    };
    expect(wirktAn(2)).toBe(1);
    expect(wirktAn(4)).toBe(3);
  });
});


// ============================================================
//  tippSperre â die EINE Antwort auf âdarf ich dieses Spiel tippen?"
//
//  ð´ Andi, 25.08.2026: âBlockiert = mach einstellbar was hier passiert."
//  Steht die Runde auf `block.wirkung: "gesperrt"`, ist ein geblocktes Spiel
//  nicht mehr tippbar â eine Sperre in der EINGABE, nicht in der Wertung.
//
//  â ï¸ Warum das eine Funktion ist und keine PrÃ¼fung im Screen: die Tippabgabe
//  fragt sie beim Anzeigen UND beim Speichern. Zwei getrennte PrÃ¼fungen wÃ¤ren
//  die zweite Wahrheit â und hier besonders teuer: eine OberflÃ¤che, die
//  sperrt, wÃ¤hrend das Speichern durchlÃ¤sst, ist von einem Fehler nicht zu
//  unterscheiden.
// ============================================================
describe("tippSperre", () => {
  const einsatz = (extra = {}) => ({
    typ: "block", vonUserId: "a", aufUserId: "b", matchId: "M1", vonName: "Anna", ...extra,
  });
  const regeln = (block = {}, an = true) => ({
    duell: {
      ...DEFAULT_DUELL, enabled: an, typen: ["block"],
      block: { ...DEFAULT_DUELL.block, wirkung: "gesperrt", ...block },
    },
  });
  const frage = (r, e) => tippSperre(e, r, { userId: "b", matchId: "M1" });

  it("sperrt das geblockte Spiel des Getroffenen", () => {
    const t = frage(regeln(), [einsatz()]);
    expect(t).toBeTruthy();
    expect(t.vonName).toBe("Anna");
  });

  it("sperrt NICHT, solange die Wirkung auf „punkte“ steht", () => {
    // Die Vorgabe. Wer sie fÃ¤hrt, tippt normal und merkt den Block erst in
    // der Abrechnung â das ist der Sinn der Einstellung.
    expect(frage(regeln({ wirkung: "punkte" }), [einsatz()])).toBeNull();
  });

  it("sperrt nur DAS Spiel, nicht den ganzen Spieltag", () => {
    expect(tippSperre([einsatz()], regeln(), { userId: "b", matchId: "M2" })).toBeNull();
  });

  it("sperrt nur den Getroffenen, nicht den Blockenden", () => {
    expect(tippSperre([einsatz()], regeln(), { userId: "a", matchId: "M1" })).toBeNull();
  });

  it("befolgt den Schutz (JK14) — wie die Wertung auch", () => {
    // â ï¸ Ohne diese Zeile hÃ¤tte der Schutz in der Wertung gegolten und in der
    // Eingabe nicht: das Spiel wÃ¤re gesperrt gewesen, ohne dass der Block je
    // Punkte gekostet hÃ¤tte.
    expect(frage(regeln(), [einsatz({ geschuetzt: true })])).toBeNull();
  });

  it("sperrt nicht, wenn die Familie aus ist", () => {
    expect(frage(regeln({}, false), [einsatz()])).toBeNull();
  });

  it("reicht `verfaellt` durch, damit der Screen den richtigen Satz zeigt", () => {
    expect(frage(regeln({ verfaellt: true }), [einsatz()]).verfaellt).toBe(true);
    expect(frage(regeln({ verfaellt: false }), [einsatz()]).verfaellt).toBe(false);
  });

  it("vertrÃ¤gt fehlende Angaben, statt abzustÃ¼rzen", () => {
    expect(tippSperre([], regeln(), {})).toBeNull();
    expect(tippSperre(null, regeln(), { userId: "b", matchId: "M1" })).toBeNull();
    expect(tippSperre([einsatz()], {}, { userId: "b", matchId: "M1" })).toBeNull();
  });
});

// ============================================================
//  „Eher bei kleinen, privaten Runden unter 15 Teilnehmern anwenden!"
//  (Andi, 27.08.2026, in seinem eigenen Werbetext fuer die Fremdjoker)
//
//  ⚠️ Kein Verbot, ein HINWEIS -- Baukasten-Grundsatz. Und kein Balancing:
//  die Aussage ist eine soziale, keine rechnerische. Ein Fremdjoker lebt
//  davon, dass man den Getroffenen kennt.
// ============================================================
describe("Hinweis zur Rundengroesse", () => {
  const an = sanitizeRules({
    ...DEFAULT_RULES,
    eingriffe: { ...DEFAULT_RULES.eingriffe, enabled: true, trittbrett: { enabled: true, anteil: 0.3, kopierterBekommt: 0 } },
  });

  it("schweigt, solange die Familie aus ist", () => {
    const aus = sanitizeRules({ ...DEFAULT_RULES, eingriffe: { ...DEFAULT_RULES.eingriffe, enabled: false } });
    expect(grosseRundeHinweis(aus, 40)).toBeNull();
  });

  it("schweigt, solange die Zahl unbekannt ist -- beim ANLEGEN gibt es keine Runde", () => {
    expect(grosseRundeHinweis(an, null)).toBeNull();
    expect(grosseRundeHinweis(an, 0)).toBeNull();
    expect(grosseRundeHinweis(an, "acht")).toBeNull();
  });

  it("schweigt in einer kleinen Runde -- genau da gehoert sie hin", () => {
    for (const n of [2, 8, 14]) expect(grosseRundeHinweis(an, n), String(n)).toBeNull();
  });

  it("meldet sich ab 15 und nennt die Zahl", () => {
    expect(grosseRundeHinweis(an, RUNDE_KLEIN_BIS)).not.toBeNull();
    expect(grosseRundeHinweis(an, 22).text).toContain("22");
  });

  it("ist ein RATSCHLAG und keine Warnung -- der Ton entscheidet die Kiste", () => {
    // 🔴 Andi, 27.08.2026: „des mit den 15 ist ja nur ein ratschlag". Ein
    // Hinweis, der aussieht wie ein Fehler, wird wie ein Fehler behandelt --
    // und dann schaltet jemand etwas ab, das er eigentlich wollte.
    const h = grosseRundeHinweis(an, 30);
    expect(h.ton).toBe("rat");
    expect(h.text).toMatch(/Nur ein Ratschlag/);
  });

  it("nennt Andis Grund -- Uebersichtlichkeit, nicht Fairness", () => {
    // ⚠️ Die erste Fassung erklaerte, man treffe „einen Namen statt ein
    // Gesicht". Klang gut, war erfunden. Sein Grund ist ein anderer.
    const h = grosseRundeHinweis(an, 30);
    expect(h.text).toMatch(/unübersichtlich/);
    expect(h.text).toMatch(/Community-Tippspiel|Firmenrunde/);
  });
});
