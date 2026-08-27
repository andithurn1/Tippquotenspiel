import { describe, it, expect } from "vitest";
import {
  sanitizeAusuebung, sanitizeAusuebungen, inhaberFuer, ausuebungenFuer,
  regelnMitRechten, vorgaengeAusRechten, offenesRecht, beschreibeAusuebung,
} from "./rechteAusuebung";
import { DEFAULT_RULES, sanitizeRules } from "./engine";
import { createMockStore } from "./store.mock";
import { DEMO_ROUND_ID } from "./constants";

// ============================================================
//  WEG B -- und was daran wirklich schiefgehen kann
//
//  🔴 Andi hat am 27.08.2026 "ja b" gesagt: eigene Ablage, eine Zeile je
//  Ausuebung, mit dem Spieltag drin.
//
//  ⚠️ Der Grund war das Gedaechtnis: Weg C (ins Regelwerk schreiben) haette
//  die Wahl fuer IMMER gelten lassen -- und rueckwirkend auch fuer Spieltage,
//  an denen es sie noch gar nicht gab. Genau deshalb pruefen die Tests unten
//  nicht nur, DASS eine Wahl ankommt, sondern vor allem, dass sie an den
//  anderen Spieltagen NICHT ankommt.
// ============================================================

const MIT_RECHT = sanitizeRules({
  ...DEFAULT_RULES,
  bigGame: { ...DEFAULT_RULES.bigGame, enabled: true },
  rechte: {
    enabled: true, wahl: "liste",
    angebote: [
      { key: "topspiel", art: "bigGame" },
      { key: "malus", art: "wirkung", wirkung: { typ: "malus", faktor: 0.8 } },
    ],
  },
});

describe("Eine Zeile bereinigen", () => {
  it("nimmt die vier Angaben, die eine Ausuebung ausmachen", () => {
    expect(sanitizeAusuebung({ spieltag: 5, userId: "u1", angebotKey: "topspiel", wert: "m-9" }))
      .toEqual({ spieltag: 5, userId: "u1", angebotKey: "topspiel", wert: "m-9" });
  });

  it("liest auch die Schreibweise der Datenbank (`matchday`, `angebot_key`)", () => {
    expect(sanitizeAusuebung({ matchday: 3, user_id: "u2", angebot_key: "malus" }))
      .toMatchObject({ spieltag: 3, userId: "u2", angebotKey: "malus", wert: null });
  });

  it("wirft weg, was sich nicht einordnen laesst", () => {
    expect(sanitizeAusuebung({ userId: "u1", angebotKey: "x" })).toBeNull();       // kein Spieltag
    expect(sanitizeAusuebung({ spieltag: 4, angebotKey: "x" })).toBeNull();        // kein Spieler
    expect(sanitizeAusuebung({ spieltag: 4, userId: "u1" })).toBeNull();           // kein Angebot
  });

  it("macht aus einem fehlenden Spieltag KEINEN Spieltag 0", () => {
    // 🔴 `Number(null)` ist 0 und endlich. Ein Spieltag 0 waere hier besonders
    // boesartig: die Wahl griffe auf einem Tag, den es nicht gibt.
    expect(sanitizeAusuebung({ spieltag: null, userId: "u1", angebotKey: "x" })).toBeNull();
    expect(sanitizeAusuebung({ spieltag: 0, userId: "u1", angebotKey: "x" })).toBeNull();
  });

  it("eine Wahl je Spieltag und Angebot -- die spaetere Zeile gewinnt", () => {
    const l = sanitizeAusuebungen([
      { spieltag: 5, userId: "u1", angebotKey: "topspiel", wert: "m-1" },
      { spieltag: 5, userId: "u1", angebotKey: "topspiel", wert: "m-2" },
      { spieltag: 6, userId: "u1", angebotKey: "topspiel", wert: "m-3" },
    ]);
    expect(l).toHaveLength(2);
    expect(l.find((a) => a.spieltag === 5).wert).toBe("m-2");
  });
});

describe("Wer haelt das Recht", () => {
  const punkte = [
    { userId: "u1", matchday: 4, punkte: 30 },
    { userId: "u2", matchday: 4, punkte: 50 },
    { userId: "u3", matchday: 4, punkte: 20 },
    { userId: "u1", matchday: 5, punkte: 40 },
    { userId: "u2", matchday: 5, punkte: 40 },
  ];

  it("der Sieger des Spieltags", () => {
    expect(inhaberFuer(punkte, 4)).toBe("u2");
  });

  it("bei Gleichstand NIEMAND -- und das ist Absicht", () => {
    // ⚠️ Wer bei Gleichstand wuerfelt, verschenkt eine Buehne an den Zufall,
    // und niemand kann hinterher erklaeren, warum.
    expect(inhaberFuer(punkte, 5)).toBeNull();
  });

  it("ein Spieltag ohne Punkte hat keinen Sieger", () => {
    expect(inhaberFuer(punkte, 9)).toBeNull();
    expect(inhaberFuer(punkte, null)).toBeNull();
  });
});

describe("Weg 1: die Wahl landet im Regelwerk DIESES Spieltags", () => {
  const ausuebungen = [{ spieltag: 5, userId: "u1", angebotKey: "topspiel", wert: "match-77" }];

  it("am gewaehlten Spieltag steht das feste Spiel", () => {
    expect(regelnMitRechten(MIT_RECHT, ausuebungen, 5).bigGame.festesSpiel).toBe("match-77");
  });

  it("🔴 an JEDEM anderen Spieltag steht es NICHT -- der ganze Grund fuer Weg B", () => {
    // Weg C haette es ab Spieltag 5 fuer immer stehen lassen UND rueckwirkend
    // auch Spieltag 4 unter ein Regelwerk gestellt, das es damals nicht gab.
    expect(regelnMitRechten(MIT_RECHT, ausuebungen, 4)).toBe(MIT_RECHT);
    expect(regelnMitRechten(MIT_RECHT, ausuebungen, 6)).toBe(MIT_RECHT);
  });

  it("gibt dasselbe Objekt zurueck, wenn nichts zu aendern ist", () => {
    // ⚠️ `regelnFuerSpieltag` merkt sich seine Ergebnisse je Spieltag. Ein
    // frisches Objekt bei jedem Aufruf machte den Speicher wertlos.
    expect(regelnMitRechten(MIT_RECHT, [], 5)).toBe(MIT_RECHT);
  });

  it("ohne eingeschaltetes Topspiel greift die Wahl nicht", () => {
    // Ein festes Spiel in einem ausgeschalteten Topspiel waere eine
    // Einstellung ohne Wirkung -- der Sieger haette gewaehlt und nichts davon.
    const aus = sanitizeRules({ ...MIT_RECHT, bigGame: { ...MIT_RECHT.bigGame, enabled: false } });
    expect(regelnMitRechten(aus, ausuebungen, 5).bigGame.festesSpiel).not.toBe("match-77");
  });

  it("ein Angebots-Key, den es nicht gibt, aendert nichts", () => {
    const falsch = [{ spieltag: 5, userId: "u1", angebotKey: "gibtsnicht", wert: "m-1" }];
    expect(regelnMitRechten(MIT_RECHT, falsch, 5)).toBe(MIT_RECHT);
  });
});

describe("Weg 2: die Wirkung trifft ALLE", () => {
  const reihenfolge = [
    { wettbewerb: "bl", matchday: 1 }, { wettbewerb: "bl", matchday: 2 },
    { wettbewerb: "bl", matchday: 3 },
  ];
  const ausuebungen = [{ spieltag: 3, userId: "u1", angebotKey: "malus" }];

  it("erzeugt einen Vorgang je Mitglied -- den Sieger eingeschlossen", () => {
    // 🔴 Andis Einordnung: „ist quasi als Ereignis was alle trifft und nicht
    // Fremdjoker". Dass der Sieger mitleidet, ist der Grund, warum ein Recht
    // keine Waffe ist.
    const v = vorgaengeAusRechten({
      ausuebungen, rules: MIT_RECHT, mitglieder: ["u1", "u2", "u3"], reihenfolge,
    });
    expect(v.map((x) => x.userId).sort()).toEqual(["u1", "u2", "u3"]);
    expect(v.every((x) => x.faktor === 0.8)).toBe(true);
  });

  it("uebersetzt den RUNDEN-Spieltag in Wettbewerb + Liga-Spieltag", () => {
    // ⚠️ Ohne diese Uebersetzung findet `applyEreignisWirkungen` den Spieltag
    // nicht -- der Vorgang faellt still unter den Tisch.
    const v = vorgaengeAusRechten({
      ausuebungen, rules: MIT_RECHT, mitglieder: ["u1"], reihenfolge,
    });
    expect(v[0]).toMatchObject({ wettbewerb: "bl", matchday: 3 });
  });

  it("ein Spieltag ausserhalb des Verlaufs erzeugt nichts, statt zu raten", () => {
    const v = vorgaengeAusRechten({
      ausuebungen: [{ spieltag: 99, userId: "u1", angebotKey: "malus" }],
      rules: MIT_RECHT, mitglieder: ["u1"], reihenfolge,
    });
    expect(v).toEqual([]);
  });

  it("das Topspiel-Recht erzeugt hier NICHTS -- es geht den anderen Weg", () => {
    const v = vorgaengeAusRechten({
      ausuebungen: [{ spieltag: 3, userId: "u1", angebotKey: "topspiel", wert: "m-1" }],
      rules: MIT_RECHT, mitglieder: ["u1"], reihenfolge,
    });
    expect(v).toEqual([]);
  });
});

describe("Was steht noch offen", () => {
  const punkte = [
    { userId: "u1", matchday: 4, punkte: 50 },
    { userId: "u2", matchday: 4, punkte: 10 },
  ];

  it("der Sieger von Spieltag 4 waehlt fuer Spieltag 5", () => {
    const o = offenesRecht({ rules: MIT_RECHT, ausuebungen: [], spieltagsPunkte: punkte, spieltag: 5 });
    expect(o).toMatchObject({ userId: "u1", spieltag: 5, gewonnenAm: 4 });
    expect(o.angebote).toHaveLength(2);
  });

  it("was schon gewaehlt wurde, steht nicht mehr zur Wahl", () => {
    const o = offenesRecht({
      rules: MIT_RECHT, spieltagsPunkte: punkte, spieltag: 5,
      ausuebungen: [{ spieltag: 5, userId: "u1", angebotKey: "topspiel", wert: "m-1" }],
    });
    expect(o.angebote.map((g) => g.key)).toEqual(["malus"]);
  });

  it("alles gewaehlt heisst: nichts offen (`null`, nicht leere Liste)", () => {
    const o = offenesRecht({
      rules: MIT_RECHT, spieltagsPunkte: punkte, spieltag: 5,
      ausuebungen: [
        { spieltag: 5, userId: "u1", angebotKey: "topspiel", wert: "m-1" },
        { spieltag: 5, userId: "u1", angebotKey: "malus" },
      ],
    });
    expect(o).toBeNull();
  });

  it("am ersten Spieltag gibt es keinen Vorgaenger und damit kein Recht", () => {
    expect(offenesRecht({ rules: MIT_RECHT, spieltagsPunkte: punkte, spieltag: 1 })).toBeNull();
  });

  it("sagt einen Satz darueber", () => {
    expect(beschreibeAusuebung(
      { spieltag: 5, userId: "u1", angebotKey: "topspiel" }, MIT_RECHT, () => "Andi",
    )).toMatch(/Andi.*Topspiel.*5/);
  });

  it("`ausuebungenFuer` filtert auf den Spieltag", () => {
    const l = [{ spieltag: 5, userId: "u1", angebotKey: "a" }, { spieltag: 6, userId: "u1", angebotKey: "a" }];
    expect(ausuebungenFuer(l, 5)).toHaveLength(1);
    expect(ausuebungenFuer(l, null)).toEqual([]);
  });
});

// ── Die Ablage: kommt eine Ausuebung wirklich an? ───────────
// 🔴 Ein gruener Test beweist, dass die Funktion richtig rechnet -- nicht,
// dass sie jemand fragt (CLAUDE.md, die sechs Funde vom 06.08.). Der Test
// unten geht deshalb ueber den STORE.
describe("Ablage: die Zeile ueberlebt und wird gelesen", () => {
  it("speichert und liest zurueck", async () => {
    const store = createMockStore();
    const roundId = DEMO_ROUND_ID;

    const vorher = await store.listRechteAusgeuebt({ roundId });
    await store.ueberechtAus({
      roundId, userId: "u-demo", matchday: 7, angebotKey: "topspiel", wert: "match-42",
    });
    const nachher = await store.listRechteAusgeuebt({ roundId });
    expect(nachher.length).toBe(vorher.length + 1);
    expect(nachher.at(-1)).toMatchObject({
      spieltag: 7, userId: "u-demo", angebotKey: "topspiel", wert: "match-42",
    });
  });

  it("🔴 wer ZUERST da ist, gewinnt -- eine Wahl laesst sich nicht ueberschreiben", async () => {
    const store = createMockStore();
    const roundId = DEMO_ROUND_ID;
    await store.ueberechtAus({ roundId, userId: "u-a", matchday: 11, angebotKey: "topspiel", wert: "erst" });
    await store.ueberechtAus({ roundId, userId: "u-b", matchday: 11, angebotKey: "topspiel", wert: "dann" });
    const zeilen = (await store.listRechteAusgeuebt({ roundId })).filter((r) => r.spieltag === 11);
    expect(zeilen).toHaveLength(1);
    expect(zeilen[0].wert).toBe("erst");
    // ⚠️ Sonst waere „das Topspiel steht fest" eine Aussage, die bis zum
    // Anpfiff wackelt.
  });
});
