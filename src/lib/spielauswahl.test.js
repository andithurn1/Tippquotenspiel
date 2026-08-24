import { describe, it, expect } from "vitest";
import {
  AUSWAHL_MODI, AUSWAHL_LIMITS, DEFAULT_SPIELE,
  sanitizeSpiele, passtSpiel, filterSpiele, zusammenfassung, beschreibeAuswahl,
  spieleProSpieltag, engpaesse,
} from "@/lib/spielauswahl";
import { DEFAULT_RULES, sanitizeRules, encodePreset, decodePreset } from "@/lib/engine";

// Ein kleiner Spielplan: 3 Spieltage à 3 Spiele.
const SPIELE = [
  { matchId: "m1", home: "A", away: "B", matchday: 1 },
  { matchId: "m2", home: "C", away: "D", matchday: 1 },
  { matchId: "m3", home: "E", away: "F", matchday: 1 },
  { matchId: "m4", home: "B", away: "C", matchday: 2 },
  { matchId: "m5", home: "D", away: "E", matchday: 2 },
  { matchId: "m6", home: "F", away: "A", matchday: 2 },
  { matchId: "m7", home: "A", away: "C", matchday: 3 },
  { matchId: "m8", home: "B", away: "D", matchday: 3 },
  { matchId: "m9", home: "E", away: "F", matchday: 3 },
];

describe("Katalog & Bereinigung", () => {
  it("die Modi sind vollständig beschrieben", () => {
    for (const m of AUSWAHL_MODI) expect(m.key && m.label && m.desc).toBeTruthy();
    expect(new Set(AUSWAHL_MODI.map((m) => m.key)).size).toBe(AUSWAHL_MODI.length);
  });

  it("Unsinn wird auf die Standardauswahl zurückgeholt", () => {
    expect(sanitizeSpiele({ modus: "hack", teams: "nein", matchIds: 5 })).toEqual(DEFAULT_SPIELE);
    expect(sanitizeSpiele()).toEqual(DEFAULT_SPIELE);
  });

  it("ein Modus ohne seine Daten fällt auf „alle“ zurück", () => {
    // Sonst wäre die Auswahl eine, die JEDES Spiel wegfiltert — das ist nie
    // gewollt und würde die Runde still leer laufen lassen.
    expect(sanitizeSpiele({ modus: "teams", teams: ["A"] }).modus).toBe("alle");
    expect(sanitizeSpiele({ modus: "liste", matchIds: [] }).modus).toBe("alle");
    expect(sanitizeSpiele({ modus: "teams", teams: ["A", "B"] }).modus).toBe("teams");
  });

  it("Vereine werden entdoppelt, getrimmt und begrenzt", () => {
    const s = sanitizeSpiele({ modus: "teams", teams: [" A ", "A", "B", "", null, 7] });
    expect(s.teams).toEqual(["A", "B"]);
    const viele = sanitizeSpiele({
      modus: "teams",
      teams: Array.from({ length: 99 }, (_, i) => `T${i}`),
    });
    expect(viele.teams.length).toBe(AUSWAHL_LIMITS.maxTeams);
  });

  it("vertauschte Spieltag-Grenzen werden gedreht, nicht verworfen", () => {
    const s = sanitizeSpiele({ spieltagVon: 20, spieltagBis: 5 });
    expect(s.spieltagVon).toBe(5);
    expect(s.spieltagBis).toBe(20);
  });

  it("„nicht gesetzt“ bleibt null und wird nicht zu Spieltag 1", () => {
    // Number(null) ist 0 und würde auf den Mindestwert hochgeklemmt — aus
    // „keine Grenze“ wäre „ab Spieltag 1“ geworden.
    const s = sanitizeSpiele({ spieltagVon: null, spieltagBis: undefined });
    expect(s.spieltagVon).toBeNull();
    expect(s.spieltagBis).toBeNull();
  });
});

describe("Filtern", () => {
  it("„alle“ lässt alles durch", () => {
    expect(filterSpiele(SPIELE, DEFAULT_SPIELE)).toHaveLength(SPIELE.length);
  });

  it("Vereins-Auswahl: ein Spiel zählt, sobald EINER der Vereine dabei ist", () => {
    const gewaehlt = filterSpiele(SPIELE, { modus: "teams", teams: ["A", "B"] });
    expect(gewaehlt.map((m) => m.matchId)).toEqual(["m1", "m4", "m6", "m7", "m8"]);
  });

  it("Liste: genau die genannten Begegnungen", () => {
    const gewaehlt = filterSpiele(SPIELE, { modus: "liste", matchIds: ["m2", "m9"] });
    expect(gewaehlt.map((m) => m.matchId)).toEqual(["m2", "m9"]);
  });

  it("der Spieltag-Bereich gilt zusätzlich, in JEDEM Modus", () => {
    const nurST2 = filterSpiele(SPIELE, { spieltagVon: 2, spieltagBis: 2 });
    expect(nurST2).toHaveLength(3);
    const kombiniert = filterSpiele(SPIELE, {
      modus: "teams", teams: ["A", "B"], spieltagVon: 3,
    });
    expect(kombiniert.map((m) => m.matchId)).toEqual(["m7", "m8"]);
  });

  it("kein Spiel ist kein gültiges Spiel", () => {
    expect(passtSpiel(null)).toBe(false);
  });
});

// 🔴 Andis Ansage vom 23.08.2026: „so soll bspw. El Clásico auch betippt
// werden, und nicht alle Spiele von Barça und Real in der Liga."
describe("Einer oder beide — der Clásico-Fall", () => {
  it("mit „beide“ zählt nur das Duell der Gewählten", () => {
    const einer = filterSpiele(SPIELE, { modus: "teams", teams: ["A", "B"] });
    const beide = filterSpiele(SPIELE, { modus: "teams", teams: ["A", "B"], teamModus: "beide" });
    // m1 ist A–B, das einzige Spiel der beiden gegeneinander.
    expect(beide.map((m) => m.matchId)).toEqual(["m1"]);
    expect(einer.length).toBeGreaterThan(beide.length);
  });

  it("bleibt ohne Angabe beim bisherigen Verhalten", () => {
    // Der Rückwärts-Test: jeder vorhandene Creator-Code muss dieselbe Auswahl
    // ergeben wie vorher, sonst änderte ein Update laufende Runden.
    expect(sanitizeSpiele({}).teamModus).toBe("einer");
    expect(filterSpiele(SPIELE, { modus: "teams", teams: ["A", "B"] }).map((m) => m.matchId))
      .toEqual(["m1", "m4", "m6", "m7", "m8"]);
  });

  it("gilt je Wettbewerb einzeln — Andis eigentlicher Fall", () => {
    // In der Liga nur das Duell, im Pokal jedes Spiel der beiden.
    const spiele = {
      modus: "teams", teams: ["A", "B"], teamModus: "beide",
      jeWettbewerb: { cup: { teamModus: "einer" } },
    };
    const liga = { matchId: "L1", home: "A", away: "C", wettbewerb: "liga" };
    const cup = { matchId: "C1", home: "A", away: "C", wettbewerb: "cup" };
    expect(passtSpiel(liga, spiele)).toBe(false);
    expect(passtSpiel(cup, spiele)).toBe(true);
  });

  it("ein unbekannter Wert fällt auf „einer“ zurück", () => {
    expect(sanitizeSpiele({ teamModus: "irgendwas" }).teamModus).toBe("einer");
  });

  it("die Schätzung verharmlost „beide“ nicht", () => {
    // 🔴 Der eigentliche Fallstrick: zwei Vereine treffen sich in einer
    // Hinrunde EINMAL. Eine Schätzung „1 bis 1 Spiel pro Spieltag" wäre
    // formal richtig gerundet und in der Sache irreführend.
    expect(spieleProSpieltag(2, 18, "beide")).toEqual({ min: 0, max: 1 });
    expect(spieleProSpieltag(2, 18, "einer")).toEqual({ min: 1, max: 2 });
    expect(spieleProSpieltag(6, 18, "beide").max).toBe(3);
  });

  it("die Beschreibung sagt UNTER statt VON", () => {
    expect(beschreibeAuswahl({ modus: "teams", teams: ["A", "B"], teamModus: "beide" }))
      .toBe("nur Spiele UNTER 2 Vereinen");
    expect(beschreibeAuswahl({ modus: "teams", teams: ["A", "B"] }))
      .toBe("nur Spiele von 2 Vereinen");
  });

  it("reist im Creator-Code mit", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      spiele: { modus: "teams", teams: ["Real", "Barca"], teamModus: "beide" },
    });
    expect(sanitizeRules(decodePreset(encodePreset(rules))).spiele.teamModus).toBe("beide");
  });
});

describe("Zusammenfassung — Zahlen statt Behauptungen", () => {
  it("zählt Spiele und Spieltage", () => {
    const z = zusammenfassung(SPIELE, DEFAULT_SPIELE);
    expect(z.spiele).toBe(9);
    expect(z.spieltage).toBe(3);
    expect(z.proSpieltag).toBe(3);
    expect(z.leer).toBe(false);
    expect(z.duenn).toBe(false);
  });

  it("warnt, wenn pro Spieltag kaum etwas übrig bleibt", () => {
    // Genau der Fall, den man beim Einstellen nicht bemerkt: „nur die Top 2"
    // lässt oft nur ein Spiel je Spieltag stehen.
    const z = zusammenfassung(SPIELE, { modus: "teams", teams: ["A", "C"] });
    expect(z.duenn).toBe(true);
  });

  it("erkennt eine Auswahl, die nichts übrig lässt", () => {
    const z = zusammenfassung(SPIELE, { modus: "liste", matchIds: ["gibtsnicht"] });
    expect(z.leer).toBe(true);
    expect(z.spiele).toBe(0);
  });
});

describe("Spiele je Spieltag — die Spanne statt einer erfundenen Zahl", () => {
  it("alle 18 Vereine ergeben die vollen 9 Spiele", () => {
    expect(spieleProSpieltag(18, 18)).toEqual({ min: 9, max: 9 });
  });

  it("zwei Vereine ergeben 1 bis 2 Spiele — sichtbar zu dünn", () => {
    expect(spieleProSpieltag(2, 18)).toEqual({ min: 1, max: 2 });
  });

  it("die Obergrenze kann nie mehr sein als der Spieltag hergibt", () => {
    expect(spieleProSpieltag(14, 18).max).toBe(9);
  });

  it("keine Auswahl, keine Spiele", () => {
    expect(spieleProSpieltag(0, 18)).toEqual({ min: 0, max: 0 });
  });
});

describe("Quer über Wettbewerbe (Etappe d)", () => {
  const plan = [
    { matchId: "bl1", home: "A", away: "B", matchday: 1, wettbewerb: "bl", phase: "liga" },
    { matchId: "cl1", home: "A", away: "C", matchday: 1, wettbewerb: "cl", phase: "liga" },
    { matchId: "cl2", home: "A", away: "D", matchday: 2, wettbewerb: "cl", phase: "achtelfinale" },
    { matchId: "cl3", home: "B", away: "C", matchday: 3, wettbewerb: "cl", phase: "finale" },
  ];

  it("„nur Champions League“", () => {
    expect(filterSpiele(plan, { wettbewerbe: ["cl"] }).map((m) => m.matchId))
      .toEqual(["cl1", "cl2", "cl3"]);
  });

  it("„nur das Interessanteste“: CL ab dem Achtelfinale", () => {
    // Der Fall, um den es dem Nutzer ging — ein Gesamtspiel nur aus den
    // wirklich spannenden Partien.
    const gewaehlt = filterSpiele(plan, {
      wettbewerbe: ["cl"], phasen: ["achtelfinale", "finale"],
    });
    expect(gewaehlt.map((m) => m.matchId)).toEqual(["cl2", "cl3"]);
  });

  it("leere Listen schränken nicht ein", () => {
    expect(filterSpiele(plan, { wettbewerbe: [], phasen: [] })).toHaveLength(4);
  });

  it("alle Dimensionen wirken UND-verknüpft", () => {
    // Vereine + Wettbewerb gleichzeitig: nur CL-Spiele mit Verein B.
    const gewaehlt = filterSpiele(plan, {
      modus: "teams", teams: ["B", "Z"], wettbewerbe: ["cl"],
    });
    expect(gewaehlt.map((m) => m.matchId)).toEqual(["cl3"]);
  });

  it("Spiele ohne die Felder fallen NICHT still heraus", () => {
    // Altdaten ohne `wettbewerb`/`phase` müssen gültig bleiben.
    const alt = [{ matchId: "alt", home: "A", away: "B", matchday: 1 }];
    expect(filterSpiele(alt, { wettbewerbe: ["cl"], phasen: ["finale"] })).toHaveLength(1);
  });

  it("reist im Creator-Code mit", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      spiele: { wettbewerbe: ["cl"], phasen: ["halbfinale", "finale"] },
    });
    expect(rules.spiele.wettbewerbe).toEqual(["cl"]);
    expect(sanitizeRules(decodePreset(encodePreset(rules)))).toEqual(rules);
  });
});

describe("Beschreibung", () => {
  it("nennt Modus und Zeitraum", () => {
    expect(beschreibeAuswahl({ modus: "teams", teams: ["A", "B"], spieltagVon: 5, spieltagBis: 12 }))
      .toBe("nur Spiele von 2 Vereinen, Spieltag 5 bis 12");
    expect(beschreibeAuswahl(DEFAULT_SPIELE)).toBe("alle Spiele");
  });
});

describe("Die Auswahl reist im Creator-Code mit", () => {
  it("ist Teil des Regelwerks", () => {
    expect(DEFAULT_RULES.spiele).toEqual(DEFAULT_SPIELE);
  });

  it("übersteht encode → decode → sanitize unverändert", () => {
    // Das ist der eigentliche Zweck: ein Creator teilt nicht nur seine
    // Wertung, sondern seine ganze Runden-Idee.
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      spiele: { modus: "teams", teams: ["Bayern", "Dortmund", "Leipzig"], spieltagVon: 1, spieltagBis: 17 },
    });
    expect(sanitizeRules(decodePreset(encodePreset(rules)))).toEqual(rules);
  });
});

// ============================================================
//  SCHRITT 3 — Abweichungen JE WETTBEWERB (design/spielauswahl-je-liga.md)
// ============================================================

// Zwei Ligen in einem Katalog, dazu ein eingefrorener Tabellenstand.
const ZWEI_LIGEN = [
  { matchId: "b1", home: "A", away: "B", matchday: 30, wettbewerb: "bl",
    snapshot: { tabellenPlatz: { home: 1, away: 17 } } },
  { matchId: "b2", home: "C", away: "D", matchday: 30, wettbewerb: "bl",
    snapshot: { tabellenPlatz: { home: 8, away: 9 } } },
  { matchId: "b3", home: "E", away: "F", matchday: 12, wettbewerb: "bl",
    snapshot: { tabellenPlatz: { home: 15, away: 16 } } },
  { matchId: "p1", home: "G", away: "H", matchday: 30, wettbewerb: "pl",
    snapshot: { tabellenPlatz: { home: 2, away: 3 } } },
  { matchId: "p2", home: "I", away: "J", matchday: 12, wettbewerb: "pl" },
];

describe("jeWettbewerb — die Vorgabe bleibt, die Liga weicht ab", () => {
  it("🔴 ohne `jeWettbewerb` ändert sich NICHTS", () => {
    // Die Zusicherung, die den ganzen Umbau trägt: alte Regelwerke und alte
    // Creator-Codes verhalten sich bitgleich wie vorher.
    for (const spiele of [
      DEFAULT_SPIELE,
      { modus: "teams", teams: ["A", "C"] },
      { spieltagVon: 20 },
      { wettbewerbe: ["bl"] },
    ]) {
      expect(filterSpiele(ZWEI_LIGEN, spiele).map((m) => m.matchId))
        .toEqual(filterSpiele(ZWEI_LIGEN, { ...spiele, jeWettbewerb: {} }).map((m) => m.matchId));
    }
  });

  it("überschreibt FELD FÜR FELD, nicht tief gemischt", () => {
    // Runden-weit „nur A und C", für die PL aber „G und H" — die Vorgabe wird
    // ERSETZT, nicht ergänzt. Sonst zählte in der PL auch noch A oder C.
    const spiele = {
      modus: "teams", teams: ["A", "C"],
      jeWettbewerb: { pl: { teams: ["G", "H"] } },
    };
    const ids = filterSpiele(ZWEI_LIGEN, spiele).map((m) => m.matchId);
    expect(ids).toContain("b1");   // A ist dabei
    expect(ids).toContain("b2");   // C ist dabei
    expect(ids).toContain("p1");   // G/H über die Abweichung
    expect(ids).not.toContain("p2");
  });

  it("ein NICHT gesetztes Feld gilt weiter aus der Vorgabe", () => {
    // Die Abweichung setzt nur den Spieltag — der Vereinsfilter der Vorgabe
    // gilt in der Bundesliga unverändert weiter.
    const spiele = {
      modus: "teams", teams: ["A", "E"],
      jeWettbewerb: { bl: { spieltagVon: 20 } },
    };
    const ids = filterSpiele(ZWEI_LIGEN, spiele).map((m) => m.matchId);
    expect(ids).toEqual(["b1"]);   // b3 hat E, fällt aber am Spieltag 12 raus
  });

  it("ein gesetztes, LEERES Feld hebt die Vorgabe für diese Liga auf", () => {
    // Der Unterschied zwischen „nichts gesetzt" und „ausdrücklich leer". Ohne
    // ihn ließe sich eine runden-weite Einschränkung je Liga nie aufheben.
    const spiele = {
      spieltagVon: 20,
      jeWettbewerb: { pl: { spieltagVon: null } },
    };
    const ids = filterSpiele(ZWEI_LIGEN, spiele).map((m) => m.matchId);
    expect(ids).toContain("p2");        // Spieltag 12, Grenze aufgehoben
    expect(ids).not.toContain("b3");    // Bundesliga: Grenze gilt weiter
  });

  it("welche Wettbewerbe dazugehören, bleibt RUNDEN-weit", () => {
    // Eine Liga darf sich nicht selbst in die Runde hineindefinieren — sonst
    // zwei Wahrheiten über dieselbe Frage.
    const spiele = {
      wettbewerbe: ["bl"],
      jeWettbewerb: { pl: { wettbewerbe: ["pl"] } },
    };
    expect(filterSpiele(ZWEI_LIGEN, spiele).every((m) => m.wettbewerb === "bl")).toBe(true);
    // Und das Feld wird gar nicht erst gespeichert:
    expect(sanitizeSpiele(spiele).jeWettbewerb.pl).toBeUndefined();
  });

  it("wirft leere und unbrauchbare Abweichungen weg", () => {
    const s = sanitizeSpiele({
      jeWettbewerb: { bl: {}, pl: null, "": { teams: ["X"] }, cl: { phasen: ["af"] } },
    });
    expect(Object.keys(s.jeWettbewerb)).toEqual(["cl"]);
  });
});

describe("Tabellenzone — „Abstiegskampf“", () => {
  it("nimmt ein Spiel mit, sobald EINE Seite in der Zone steht", () => {
    const spiele = { zonen: [{ von: 14, bis: 18 }] };
    const ids = filterSpiele(ZWEI_LIGEN, spiele).map((m) => m.matchId);
    expect(ids).toEqual(["b1", "b3"]);   // 17. bzw. 15./16.
  });

  it("🔴 ohne Tabellenstand fällt das Spiel RAUS, nicht rein", () => {
    // Andersherum zöge ein fehlendes Feld still den ganzen Spielplan herein.
    expect(passtSpiel({ matchId: "x", home: "A", away: "B" }, { zonen: [{ von: 1, bis: 99 }] }))
      .toBe(false);
  });

  it("greift auch als Abweichung EINER Liga", () => {
    // Andis Fall: „letzte 5 Spieltage, Plätze 14–18" — aber nur in der
    // Bundesliga, die PL läuft normal weiter.
    const spiele = {
      jeWettbewerb: { bl: { spieltagVon: 30, zonen: [{ von: 14, bis: 18 }] } },
    };
    const ids = filterSpiele(ZWEI_LIGEN, spiele).map((m) => m.matchId);
    expect(ids).toEqual(["b1", "p1", "p2"]);
  });

  it("füllt halbe Angaben auf und dreht vertauschte Grenzen", () => {
    expect(sanitizeSpiele({ zonen: [{ von: 14 }] }).zonen).toEqual([{ von: 14, bis: 99 }]);
    expect(sanitizeSpiele({ zonen: [{ bis: 4 }] }).zonen).toEqual([{ von: 1, bis: 4 }]);
    expect(sanitizeSpiele({ zonen: [{ von: 18, bis: 14 }] }).zonen).toEqual([{ von: 14, bis: 18 }]);
    expect(sanitizeSpiele({ zonen: [{}, null, "x"] }).zonen).toEqual([]);
  });
});

describe("Schritt 3 reist im Creator-Code mit", () => {
  it("übersteht encode → decode → sanitize unverändert", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      spiele: {
        modus: "teams", teams: ["Bayern", "Dortmund"],
        jeWettbewerb: { bl: { spieltagVon: 30, zonen: [{ von: 14, bis: 18 }] } },
      },
    });
    expect(rules.spiele.jeWettbewerb.bl.zonen).toEqual([{ von: 14, bis: 18 }]);
    expect(sanitizeRules(decodePreset(encodePreset(rules)))).toEqual(rules);
  });

  it("eine leere Karte landet NICHT im Code", () => {
    const rules = sanitizeRules({ ...DEFAULT_RULES, spiele: { jeWettbewerb: {} } });
    expect(encodePreset(rules)).toBe(encodePreset(sanitizeRules(DEFAULT_RULES)));
  });
});

describe("Beschreibung nennt die neuen Ebenen", () => {
  it("Zone und Sonderregeln", () => {
    expect(beschreibeAuswahl({ zonen: [{ von: 14, bis: 18 }] }))
      .toBe("alle Spiele, Plätze 14–18");
    expect(beschreibeAuswahl({ jeWettbewerb: { bl: { spieltagVon: 30 } } }))
      .toBe("alle Spiele, Sonderregeln für 1 Wettbewerb");
  });
});


// ── 🔴 Der Engpass: WARUM bleiben so wenige übrig? ──────
//
// Andis Fund vom 24.08.2026 im Browser: „+Premier League" ändert die Zahl
// nicht, „−Bundesliga" macht daraus 0 — und nichts sagt, woran es liegt.
describe("Engpass — welche Einschränkung kostet die meisten Spiele", () => {
  // Ein Spielplan aus zwei Wettbewerben, damit sich Wettbewerb und
  // Vereinsliste gegeneinander ausspielen lassen.
  const ZWEI = [
    { matchId: "b1", home: "A", away: "B", matchday: 1, wettbewerb: "bl" },
    { matchId: "b2", home: "C", away: "D", matchday: 1, wettbewerb: "bl" },
    { matchId: "p1", home: "X", away: "Y", matchday: 1, wettbewerb: "pl" },
    { matchId: "p2", home: "Y", away: "Z", matchday: 2, wettbewerb: "pl" },
  ];

  it("nennt keine Einschränkung, wenn keine gesetzt ist", () => {
    expect(engpaesse(ZWEI, DEFAULT_SPIELE)).toEqual([]);
  });

  it("findet die Vereinsliste als Engpass — Andis „+PL bringt nichts“", () => {
    // Zwei Wettbewerbe gewählt, aber nur Bundesliga-Vereine in der Liste.
    const spiele = { modus: "teams", teams: ["A", "B"], wettbewerbe: ["bl", "pl"] };
    const [erster] = engpaesse(ZWEI, spiele);
    expect(erster.feld).toBe("teams");
    // Ohne die Vereinsliste wären ALLE vier Spiele dabei, mit ihr nur eins.
    expect(erster.jetzt).toBe(1);
    expect(erster.ohne).toBe(4);
  });

  it("erklärt auch die NULL — Andis „−Bundesliga“", () => {
    // Nur Premier League gewählt, aber ausschließlich BL-Vereine in der Liste.
    const spiele = { modus: "teams", teams: ["A", "B"], wettbewerbe: ["pl"] };
    const funde = engpaesse(ZWEI, spiele);
    expect(filterSpiele(ZWEI, sanitizeSpiele(spiele))).toHaveLength(0);
    expect(funde[0].jetzt).toBe(0);
    // Beide Einschränkungen sind beteiligt, und beide werden genannt — wer nur
    // eine wegnimmt, hat wieder Spiele.
    expect(funde.map((f) => f.feld).sort()).toEqual(["teams", "wettbewerbe"]);
    expect(funde.every((f) => f.ohne > 0)).toBe(true);
  });

  it("sortiert den teuersten zuerst", () => {
    const spiele = { modus: "teams", teams: ["A", "B"], wettbewerbe: ["bl", "pl"] };
    const funde = engpaesse(ZWEI, spiele);
    for (let i = 1; i < funde.length; i++) {
      expect(funde[i - 1].gewinn).toBeGreaterThanOrEqual(funde[i].gewinn);
    }
  });

  // ⚠️ Eine Einschränkung, die nichts kostet, ist kein Fehler — sie steht nur
  // hinter einer anderen, die schon alles wegnimmt. Sie muss trotzdem
  // auftauchen, sonst fehlt sie in der Erklärung.
  it("nennt auch eine Einschränkung, die gerade nichts kostet", () => {
    const spiele = { wettbewerbe: ["bl"], spieltagVon: 1, spieltagBis: 9 };
    const funde = engpaesse(ZWEI, spiele);
    const spieltage = funde.find((f) => f.feld === "spieltage");
    expect(spieltage).toBeTruthy();
    expect(spieltage.gewinn).toBe(0);
  });
});
