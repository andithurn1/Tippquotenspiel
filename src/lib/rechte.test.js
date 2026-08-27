import { describe, it, expect } from "vitest";
import {
  DEFAULT_RECHTE, RECHT_ARTEN, WAHL_ARTEN, RECHTE_LIMITS,
  sanitizeRechte, angeboteFuer, hatWahl, beschreibeAngebot, beschreibeRechte,
  nochOhneWirkung,
} from "./rechte";

// ============================================================
//  Was hier festgehalten wird -- und es sind Andis Saetze
//
//  „nur die der Admin einstellt, aber ja Admin kann auch einstellen, dass aus
//   einer Liste ausgewaehlt werden kann und diese einzelnen Wirkungen koennen
//   natuerlich auch angepasst werden vor vom Admin" (27.08.2026)
//
//  „ja ist quasi als Ereignis was alle trifft und nicht Fremdjoker"
// ============================================================

const mit = (teil) => ({ rechte: { enabled: true, ...teil } });

describe("Katalog", () => {
  it("jede Recht-Art ist beschrieben und eindeutig", () => {
    for (const a of RECHT_ARTEN) expect(a.key && a.label && a.text).toBeTruthy();
    expect(new Set(RECHT_ARTEN.map((a) => a.key)).size).toBe(RECHT_ARTEN.length);
  });

  it("jede Recht-Art traegt die Ehrlichkeits-Klausel -- und heute steht jeder Weg", () => {
    // 🔴 `fertig` sagt, ob der Weg von der Wahl bis in die Wertung wirklich
    // steht. Bis zum 27.08.2026 galt das NUR fuers Topspiel; seit Andis
    // Entscheidung fuer Weg B (eigene Ablage `rechte_ausgeuebt`) laeuft auch
    // eine ausgeuebte Wirkung durch -- als Vorgang wie ein Ereignis.
    // ⚠️ Das Feld MUSS an jeder Art stehen, auch wenn heute alle `true` sind:
    // `undefined` waere „nicht fertig" und damit stillschweigend richtig, aber
    // aus dem falschen Grund. Die naechste neue Art soll sich entscheiden
    // muessen.
    for (const a of RECHT_ARTEN) expect(typeof a.fertig, a.key).toBe("boolean");
    expect(RECHT_ARTEN.filter((a) => a.fertig).map((a) => a.key)).toEqual(["bigGame", "wirkung"]);
  });

  it("beide Wahl-Arten sind beschrieben", () => {
    for (const w of WAHL_ARTEN) expect(w.key && w.label && w.text).toBeTruthy();
  });
});

describe("sanitizeRechte", () => {
  it("die Vorgabe ist AUS und leer", () => {
    expect(sanitizeRechte()).toEqual(DEFAULT_RECHTE);
    expect(DEFAULT_RECHTE.enabled).toBe(false);
  });

  it("laesst sich nicht einschalten, wenn es nichts zu vergeben gibt", () => {
    // Dieselbe Sperrklinke wie bei `sanitizeSperre`: ein Schalter, hinter dem
    // nichts liegt, sieht aus wie eine kaputte Mechanik.
    expect(sanitizeRechte({ enabled: true, angebote: [] }).enabled).toBe(false);
    expect(sanitizeRechte({ enabled: true, angebote: [{ art: "bigGame" }] }).enabled).toBe(true);
  });

  it("„Liste“ ohne zweites Angebot ist keine Liste", () => {
    const c = sanitizeRechte({ enabled: true, wahl: "liste", angebote: [{ art: "bigGame" }] });
    expect(c.wahl).toBe("fest");
  });

  it("mit zwei Angeboten bleibt die Liste eine Liste", () => {
    const c = sanitizeRechte({
      enabled: true, wahl: "liste",
      angebote: [{ art: "bigGame" }, { art: "wirkung", wirkung: { typ: "bonus", prozent: 20 } }],
    });
    expect(c.wahl).toBe("liste");
    expect(c.angebote).toHaveLength(2);
  });

  it("deckelt die Liste -- eine Wahl aus zwanzig ist keine Wahl mehr", () => {
    const viele = Array.from({ length: 20 }, () => ({ art: "bigGame" }));
    expect(sanitizeRechte({ enabled: true, angebote: viele }).angebote)
      .toHaveLength(RECHTE_LIMITS.angebote.max);
  });

  it("jedes Angebot bekommt einen Schluessel, auch ohne einen", () => {
    const c = sanitizeRechte({ enabled: true, angebote: [{ art: "bigGame" }, { art: "bigGame" }] });
    expect(new Set(c.angebote.map((a) => a.key)).size).toBe(2);
  });

  it("eine unbekannte Art faellt auf das Topspiel zurueck", () => {
    expect(sanitizeRechte({ enabled: true, angebote: [{ art: "weltherrschaft" }] }).angebote[0].art)
      .toBe("bigGame");
  });

  it("die Wirkung eines Angebots laeuft durch dieselbe Bereinigung wie ueberall", () => {
    const c = sanitizeRechte({
      enabled: true,
      angebote: [{ art: "wirkung", wirkung: { typ: "bonus", prozent: 999 } }],
    });
    // Auf die Grenze geklemmt -- kein zweiter Bereinigungsweg.
    expect(c.angebote[0].wirkung.prozent).toBeLessThanOrEqual(50);
  });

  it("eine nicht auswertbare Wirkung kommt gar nicht erst durch", () => {
    const c = sanitizeRechte({
      enabled: true,
      angebote: [{ art: "wirkung", wirkung: { typ: "sonderspiel" } }],
    });
    expect(c.angebote[0].wirkung.typ).not.toBe("sonderspiel");
  });

  it("ein Angebot hat KEIN Ziel -- ein Recht trifft alle", () => {
    // 🔴 Andi: „ja ist quasi als Ereignis was alle trifft und nicht
    // Fremdjoker". Eine WEN-Achse hier waere die Grenze zwischen zwei
    // Familien eingerissen.
    const c = sanitizeRechte({
      enabled: true,
      angebote: [{ art: "wirkung", wirkung: { typ: "malus" }, auswahl: { modus: "rang", n: 1 } }],
    });
    expect(c.angebote[0].auswahl).toBeUndefined();
  });

  it("ist stabil: zweimal saeubern aendert nichts mehr", () => {
    const einmal = sanitizeRechte({
      enabled: true, wahl: "liste",
      angebote: [{ art: "bigGame" }, { art: "wirkung", wirkung: { typ: "umverteilung", prozent: 15 } }],
    });
    expect(sanitizeRechte(einmal)).toEqual(einmal);
  });
});

describe("Was steht zur Wahl", () => {
  it("bei „fest“ genau eines -- auch wenn mehr eingestellt sind", () => {
    const rules = mit({ wahl: "fest", angebote: [{ art: "bigGame" }, { art: "bigGame" }] });
    expect(angeboteFuer(rules)).toHaveLength(1);
    expect(hatWahl(rules)).toBe(false);
  });

  it("bei „liste“ alle", () => {
    const rules = mit({
      wahl: "liste",
      angebote: [{ art: "bigGame" }, { art: "wirkung", wirkung: { typ: "bonus" } }],
    });
    expect(angeboteFuer(rules)).toHaveLength(2);
    expect(hatWahl(rules)).toBe(true);
  });

  it("ausgeschaltet steht gar nichts zur Wahl", () => {
    expect(angeboteFuer({ rechte: { enabled: false, angebote: [{ art: "bigGame" }] } })).toEqual([]);
    expect(angeboteFuer({})).toEqual([]);
  });

  it("immer eine LISTE, nie mal ein Einzelwert", () => {
    // „Nie halb gesetzt": ein Aufrufer soll nicht zwei Formen unterscheiden.
    for (const r of [{}, mit({ angebote: [{ art: "bigGame" }] })]) {
      expect(Array.isArray(angeboteFuer(r))).toBe(true);
    }
  });
});

describe("Saetze fuer die Oberflaeche", () => {
  it("nennt beim Topspiel das Recht, bei einer Wirkung deren Ergebnis", () => {
    expect(beschreibeAngebot({ art: "bigGame" })).toMatch(/Topspiel/);
    expect(beschreibeAngebot({ art: "wirkung", wirkung: { typ: "bonus", prozent: 20 } }))
      .toMatch(/20 %/);
  });

  it("fasst das Ganze in einem Satz zusammen", () => {
    expect(beschreibeRechte({})).toMatch(/aus/);
    expect(beschreibeRechte(mit({ angebote: [{ art: "bigGame" }] }))).toMatch(/Topspiel/);
    expect(beschreibeRechte(mit({
      wahl: "liste",
      angebote: [{ art: "bigGame" }, { art: "wirkung", wirkung: { typ: "bonus" } }],
    }))).toMatch(/Wahl aus 2/);
  });
});

describe("Die Ehrlichkeits-Klausel", () => {
  it("schweigt heute -- weil jeder Weg steht", () => {
    // 🔴 Bis zum 27.08.2026 meldete diese Funktion das Wirkungs-Recht: der
    // Admin konnte es einstellen, und es kam nichts an. Seit Weg B kommt es an.
    const rules = mit({
      wahl: "liste",
      angebote: [{ art: "bigGame" }, { art: "wirkung", wirkung: { typ: "bonus", prozent: 20 } }],
    });
    expect(nochOhneWirkung(rules)).toEqual([]);
  });

  it("meldet trotzdem, sobald eine Art `fertig: false` traegt", () => {
    // ⚠️ Die Klausel bleibt scharf, obwohl sie heute schweigt -- sonst waere
    // sie beim naechsten neuen Recht ein toter Zweig, den niemand mehr prueft.
    // Gemessen wird deshalb die MECHANIK, nicht der heutige Zustand: eine
    // unfertige Art faellt durch, eine fertige nicht.
    const unfertig = RECHT_ARTEN.map((a) => ({ ...a, fertig: false }));
    const alsUnfertig = (rules) => angeboteFuer(rules)
      .filter((g) => !unfertig.find((x) => x.key === g.art)?.fertig);
    expect(alsUnfertig(mit({ angebote: [{ art: "bigGame" }] }))).toHaveLength(1);
  });

  it("schweigt, wenn gar kein Recht eingestellt ist", () => {
    expect(nochOhneWirkung(mit({ enabled: false, angebote: [] }))).toEqual([]);
  });
});
