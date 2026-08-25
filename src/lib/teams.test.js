import { describe, it, expect } from "vitest";
import {
  DEFAULT_TEAMS, TEAM_LIMITS, WERTUNGEN, WERTUNG,
  sanitizeTeams, pruefeAufteilung, teamLeaderboard, beschreibeTeams,
} from "@/lib/teams";

const AN = (extra = {}) => ({ teams: { enabled: true, wertung: "schnitt", minGroesse: 2, ...extra } });

// Eine Einzelrangliste, wie sie aus scoreLeaderboard kommt.
const board = [
  { userId: "a", name: "Anna", total: 100, tips: 5, gewertet: 5 },
  { userId: "b", name: "Bernd", total: 80, tips: 5, gewertet: 5 },
  { userId: "c", name: "Cem", total: 60, tips: 5, gewertet: 5 },
  { userId: "d", name: "Dana", total: 40, tips: 5, gewertet: 5 },
  { userId: "e", name: "Emre", total: 20, tips: 5, gewertet: 5 },
];

describe("Katalog & sanitize", () => {
  it("jede Wertung ist vollständig beschrieben", () => {
    for (const w of WERTUNGEN) {
      expect(w.key && w.label && w.hint).toBeTruthy();
      expect(typeof w.ungleichOk).toBe("boolean");
    }
    // Genau EINE Wertung darf ungleiche Größen tragen — sonst wäre die
    // Fairness-Meldung beliebig.
    expect(WERTUNGEN.filter((w) => w.ungleichOk)).toHaveLength(1);
  });

  it("ist standardmäßig aus und fällt auf „Punkte je Mitglied“ zurück", () => {
    expect(DEFAULT_TEAMS.enabled).toBe(false);
    expect(sanitizeTeams({}).wertung).toBe("schnitt");
  });

  it("ein unbekannter Modus fällt auf den Standard zurück, statt still zu kippen", () => {
    expect(sanitizeTeams({ wertung: "erfunden" }).wertung).toBe("schnitt");
  });

  it("beschneidet die Mindestgröße auf die Grenzen", () => {
    expect(sanitizeTeams({ minGroesse: 99 }).minGroesse).toBe(TEAM_LIMITS.minGroesse.max);
    expect(sanitizeTeams({ minGroesse: 0 }).minGroesse).toBe(TEAM_LIMITS.minGroesse.min);
  });
});

describe("Aufteilung prüfen", () => {
  const zwei = [
    { id: "t1", name: "Rot", mitglieder: ["a", "b"] },
    { id: "t2", name: "Blau", mitglieder: ["c", "d"] },
  ];

  it("meldet nichts, wenn alles passt", () => {
    expect(pruefeAufteilung(zwei, ["a", "b", "c", "d"], AN())).toEqual([]);
  });

  it("ist still, solange der Team-Modus aus ist", () => {
    expect(pruefeAufteilung([], ["a"], { teams: { enabled: false } })).toEqual([]);
  });

  it("verlangt mindestens zwei Teams", () => {
    const m = pruefeAufteilung([zwei[0]], ["a", "b"], AN());
    expect(m.some((x) => x.key === "zu-wenig-teams")).toBe(true);
  });

  it("erkennt doppelte Mitgliedschaft — die Punkte zählten sonst zweimal", () => {
    const doppelt = [
      { id: "t1", name: "Rot", mitglieder: ["a", "b"] },
      { id: "t2", name: "Blau", mitglieder: ["b", "c"] },
    ];
    const m = pruefeAufteilung(doppelt, ["a", "b", "c"], AN());
    expect(m.some((x) => x.key === "doppelt" && x.schwere === "fehler")).toBe(true);
  });

  it("erkennt zu kleine Teams", () => {
    const klein = [
      { id: "t1", name: "Rot", mitglieder: ["a"] },
      { id: "t2", name: "Blau", mitglieder: ["b", "c"] },
    ];
    expect(pruefeAufteilung(klein, ["a", "b", "c"], AN()).some((x) => x.key === "zu-klein")).toBe(true);
  });

  it("weist auf Mitspieler ohne Team hin — die fielen sonst still heraus", () => {
    const m = pruefeAufteilung(zwei, ["a", "b", "c", "d", "e"], AN());
    const ohne = m.find((x) => x.key === "ohne-team");
    expect(ohne).toBeTruthy();
    expect(ohne.schwere).toBe("hinweis");   // kein Fehler, nur unbeabsichtigt
  });

  // ── Der eigentliche Fairness-Fall ───────────────────────
  it("meldet ungleiche Größen, wenn die Wertung sie nicht trägt", () => {
    const ungleich = [
      { id: "t1", name: "Rot", mitglieder: ["a", "b", "c"] },
      { id: "t2", name: "Blau", mitglieder: ["d", "e"] },
    ];
    const m = pruefeAufteilung(ungleich, ["a", "b", "c", "d", "e"], AN({ wertung: "summe" }));
    const warnung = m.find((x) => x.key === "ungleich");
    expect(warnung).toBeTruthy();
    // Jede Meldung kennt ihre Korrektur — wie bei den Profi-Warnungen.
    expect(warnung.korrektur).toEqual({ wertung: "schnitt" });
  });

  it("meldet ungleiche Größen NICHT, wenn je Mitglied gewertet wird", () => {
    const ungleich = [
      { id: "t1", name: "Rot", mitglieder: ["a", "b", "c"] },
      { id: "t2", name: "Blau", mitglieder: ["d", "e"] },
    ];
    const m = pruefeAufteilung(ungleich, ["a", "b", "c", "d", "e"], AN({ wertung: "schnitt" }));
    expect(m.some((x) => x.key === "ungleich")).toBe(false);
  });
});

describe("Teamrangliste", () => {
  const zwei = [
    { id: "t1", name: "Rot", mitglieder: ["a", "b"] },   // 100 + 80 = 180
    { id: "t2", name: "Blau", mitglieder: ["c", "d"] },  //  60 + 40 = 100
  ];

  it("summiert die Punkte der Mitglieder und vergibt Ränge", () => {
    const tab = teamLeaderboard(board, zwei, AN({ wertung: "summe" }));
    expect(tab[0].name).toBe("Rot");
    expect(tab[0].total).toBe(180);
    expect(tab[0].rank).toBe(1);
    expect(tab[1].total).toBe(100);
  });

  it("„je Mitglied“ teilt durch die Teamgröße", () => {
    const tab = teamLeaderboard(board, zwei, AN({ wertung: "schnitt" }));
    expect(tab[0].total).toBe(90);    // 180 / 2
    expect(tab[1].total).toBe(50);    // 100 / 2
  });

  it("bei ungleichen Größen dreht „je Mitglied“ das Ergebnis um", () => {
    // Genau der Grund für die Warnung: nach Summe gewinnt das größere Team,
    // je Mitglied das stärkere.
    const ungleich = [
      { id: "t1", name: "Gross", mitglieder: ["c", "d", "e"] },  // 60+40+20 = 120
      { id: "t2", name: "Klein", mitglieder: ["a", "b"] },       // 100+80   = 180
    ];
    const summe = teamLeaderboard(board, ungleich, AN({ wertung: "summe" }));
    const schnitt = teamLeaderboard(board, ungleich, AN({ wertung: "schnitt" }));
    expect(summe[0].name).toBe("Klein");        // 180 > 120
    expect(schnitt[0].name).toBe("Klein");      // 90 > 40
    expect(schnitt[0].total).toBe(90);
    expect(schnitt[1].total).toBe(40);
  });

  it("teilt durch die GEMELDETEN Mitglieder, nicht durch die aktiven", () => {
    // Sonst verbesserte ein untätiges Mitglied den Schnitt seines Teams,
    // indem es einfach nichts tut.
    const mitKarteileiche = [{ id: "t1", name: "Rot", mitglieder: ["a", "b", "unbekannt"] }];
    const tab = teamLeaderboard(board, mitKarteileiche, AN({ wertung: "schnitt" }));
    expect(tab[0].groesse).toBe(3);
    expect(tab[0].total).toBe(60);              // 180 / 3, nicht 180 / 2
  });

  it("listet die Mitglieder absteigend nach Punkten", () => {
    const tab = teamLeaderboard(board, zwei, AN());
    expect(tab.find((t) => t.name === "Rot").mitglieder.map((m) => m.name)).toEqual(["Anna", "Bernd"]);
  });

  it("ein Team ganz ohne gewertete Mitglieder steht mit 0 da, statt zu fehlen", () => {
    const leer = [{ id: "t9", name: "Leer", mitglieder: ["x", "y"] }];
    const tab = teamLeaderboard(board, leer, AN());
    expect(tab[0].total).toBe(0);
    expect(tab[0].mitglieder).toEqual([]);
  });
});

describe("Beschreibung", () => {
  it("sagt im Aus-Fall klar, dass jeder für sich spielt", () => {
    expect(beschreibeTeams({ teams: { enabled: false } })).toMatch(/jeder spielt für sich/i);
  });
  it("nennt Mindestgröße und Wertung", () => {
    expect(beschreibeTeams(AN({ minGroesse: 3 }))).toContain("3");
    expect(beschreibeTeams(AN())).toContain(WERTUNG.schnitt.label);
  });
});

// 🔴 Der Fund vom 25.08.2026: die Wertungsart "bester" fiel still auf "summe"
// durch. Sie stand zur Auswahl, ihr Hinweistext versprach "je Spiel zählt das
// beste Ergebnis im Team" — gerechnet wurde die Summe aller Mitglieder.
describe("Wertungsart bester — je Spiel nur der beste Tipp", () => {
  const TEAMS = [
    { id: "t1", name: "Rot", mitglieder: ["a", "b"] },
    { id: "t2", name: "Blau", mitglieder: ["c", "d"] },
  ];
  const BOARD = [
    { userId: "a", name: "A", total: 100, tips: 2 },
    { userId: "b", name: "B", total: 60, tips: 2 },
    { userId: "c", name: "C", total: 80, tips: 2 },
    { userId: "d", name: "D", total: 80, tips: 2 },
  ];
  // Rot:  m1 40/10 → 40 · m2 60/50 → 60  = 100
  // Blau: m1 30/30 → 30 · m2 50/50 → 50  =  80
  const SPIELPUNKTE = [
    { userId: "a", matchId: "m1", wert: 40 }, { userId: "b", matchId: "m1", wert: 10 },
    { userId: "a", matchId: "m2", wert: 60 }, { userId: "b", matchId: "m2", wert: 50 },
    { userId: "c", matchId: "m1", wert: 30 }, { userId: "d", matchId: "m1", wert: 30 },
    { userId: "c", matchId: "m2", wert: 50 }, { userId: "d", matchId: "m2", wert: 50 },
  ];
  const regeln = { teams: { enabled: true, wertung: "bester", minGroesse: 2 } };

  it("zählt je Spiel nur den besten Wert des Teams", () => {
    const [erst, zweit] = teamLeaderboard(BOARD, TEAMS, regeln, SPIELPUNKTE);
    expect(erst.name).toBe("Rot");
    expect(erst.total).toBe(100);
    expect(zweit.total).toBe(80);
  });

  it("ist NICHT dasselbe wie die Summe — genau das war der Fehler", () => {
    const [rot] = teamLeaderboard(BOARD, TEAMS, regeln, SPIELPUNKTE);
    expect(rot.summe).toBe(160);      // 100 + 60
    expect(rot.total).toBe(100);      // vorher stand hier 160
  });

  it("doppelt getippte Spiele bringen dem Team nichts extra", () => {
    // Blau tippt zweimal identisch: 30/30 und 50/50 — zählt wie einer.
    const [, blau] = teamLeaderboard(BOARD, TEAMS, regeln, SPIELPUNKTE);
    expect(blau.total).toBe(80);
    expect(blau.summe).toBe(160);
  });

  it("ohne Spielpunkte wird nicht still weitergerechnet, sondern markiert", () => {
    const zeilen = teamLeaderboard(BOARD, TEAMS, regeln, null);
    for (const z of zeilen) expect(z.unvollstaendig).toBe(true);
  });

  it("summe und schnitt brauchen die Spielpunkte nicht", () => {
    const su = teamLeaderboard(BOARD, TEAMS, { teams: { enabled: true, wertung: "summe", minGroesse: 2 } });
    expect(su[0].total).toBe(160);
    expect(su[0].unvollstaendig).toBe(false);
    const sc = teamLeaderboard(BOARD, TEAMS, { teams: { enabled: true, wertung: "schnitt", minGroesse: 2 } });
    expect(sc[0].total).toBe(80);
  });
});
