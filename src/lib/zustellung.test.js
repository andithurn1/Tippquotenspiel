import { describe, it, expect } from "vitest";
import {
  zustellbar, merkeZustellung, pruneZustellungen, zugestelltImFenster,
  budgetText, AUFBEWAHRUNG_TAGE,
} from "./zustellung";
import { DEFAULT_NOTIFY } from "./notify";

const AN = { ...DEFAULT_NOTIFY, enabled: true, maxProTag: 3 };
const JETZT = new Date("2026-08-28T15:00:00Z").getTime();
const STD = 3600 * 1000;

const faellig = (n) => Array.from({ length: n }, (_, i) => ({
  art: "erinnerung", key: `erinnerung:m${i}:3`, stunden: 3, titel: `Spiel ${i}`, text: "",
}));

describe("Tages-Obergrenze greift über MEHRERE Durchläufe", () => {
  // Der eigentliche Zweck des Moduls: dueNotifications deckelt pro Aufruf.
  // Ohne Buchführung bekäme man bei jedem Nachsehen wieder volle Ladung.
  it("nach dem Ausschöpfen des Budgets geht im selben Fenster nichts mehr raus", () => {
    let gesehen = [];
    for (const e of zustellbar({ faellig: faellig(3), gesehen, prefs: AN, jetzt: JETZT })) {
      gesehen = merkeZustellung(gesehen, e, JETZT);
    }
    expect(gesehen).toHaveLength(3);
    // Zweiter Durchlauf, andere Spiele — Budget ist aufgebraucht.
    const zweite = zustellbar({
      faellig: [{ art: "erinnerung", key: "erinnerung:neu:1", stunden: 1 }],
      gesehen, prefs: AN, jetzt: JETZT + 5 * 60 * 1000,
    });
    expect(zweite).toEqual([]);
  });

  it("nach 24 Stunden ist das Budget wieder frei", () => {
    let gesehen = [];
    for (const e of faellig(3)) gesehen = merkeZustellung(gesehen, e, JETZT);
    const spaeter = JETZT + 25 * STD;
    expect(zugestelltImFenster(gesehen, spaeter)).toBe(0);
    const naechste = zustellbar({
      faellig: [{ art: "neuerSpieltag", key: "spieltag:2" }], gesehen, prefs: AN, jetzt: spaeter,
    });
    expect(naechste).toHaveLength(1);
  });

  it("rollend gemessen, nicht nach Kalendertag (23:50 + 00:10 wäre sonst doppelt)", () => {
    const abends = new Date("2026-08-28T23:50:00+02:00").getTime();
    let gesehen = [];
    for (const e of faellig(3)) gesehen = merkeZustellung(gesehen, e, abends);
    const kurzNachMitternacht = new Date("2026-08-29T00:10:00+02:00").getTime();
    expect(zustellbar({
      faellig: [{ art: "neuerSpieltag", key: "spieltag:9" }], gesehen, prefs: AN, jetzt: kurzNachMitternacht,
    })).toEqual([]);
  });
});

describe("Nie doppelt", () => {
  it("ein bereits zugestellter key wird nicht erneut ausgewählt", () => {
    const eintrag = { art: "neuerSpieltag", key: "spieltag:1" };
    const gesehen = merkeZustellung([], eintrag, JETZT);
    expect(zustellbar({ faellig: [eintrag], gesehen, prefs: AN, jetzt: JETZT })).toEqual([]);
  });

  it("merkeZustellung legt denselben key kein zweites Mal ab", () => {
    const eintrag = { art: "neuerSpieltag", key: "spieltag:1" };
    let gesehen = merkeZustellung([], eintrag, JETZT);
    gesehen = merkeZustellung(gesehen, eintrag, JETZT + STD);
    expect(gesehen).toHaveLength(1);
  });
});

describe("Reihenfolge und Aufräumen", () => {
  it("bei knappem Budget geht das Dringendste zuerst raus", () => {
    const liste = [
      { art: "erinnerung", key: "a", stunden: 24 },
      { art: "erinnerung", key: "b", stunden: 1 },
      { art: "erinnerung", key: "c", stunden: 6 },
    ];
    const raus = zustellbar({ faellig: liste, gesehen: [], prefs: { ...AN, maxProTag: 1 }, jetzt: JETZT });
    expect(raus.map((r) => r.key)).toEqual(["b"]);
  });

  it("alte Einträge fallen weg, undatierte bleiben (sonst käme ihre Meldung erneut)", () => {
    const gesehen = [
      { key: "alt", zeit: JETZT - (AUFBEWAHRUNG_TAGE + 1) * 24 * STD },
      { key: "frisch", zeit: JETZT - STD },
      { key: "ohne-zeit" },
    ];
    expect(pruneZustellungen(gesehen, JETZT).map((g) => g.key)).toEqual(["frisch", "ohne-zeit"]);
  });
});

describe("Ausgeschaltet heißt: nichts", () => {
  it("ohne enabled geht nichts raus, egal was fällig wäre", () => {
    expect(zustellbar({ faellig: faellig(3), gesehen: [], prefs: DEFAULT_NOTIFY, jetzt: JETZT })).toEqual([]);
  });

  it("budgetText erklärt die Stille, statt sie unkommentiert zu lassen", () => {
    let gesehen = [];
    for (const e of faellig(3)) gesehen = merkeZustellung(gesehen, e, JETZT);
    expect(budgetText(gesehen, AN, JETZT)).toContain("Tagesgrenze erreicht");
    expect(budgetText([], AN, JETZT)).toContain("3 von 3");
    expect(budgetText([], DEFAULT_NOTIFY, JETZT)).toContain("Aus");
  });
});
