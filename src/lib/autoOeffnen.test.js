import { describe, it, expect } from "vitest";
import { faelligeSpieltage, maxVorlaufStunden } from "@/lib/autoOeffnen";
import { DEFAULT_TIPPFENSTER } from "@/lib/tippfenster";

const STUNDE = 3600_000;
const JETZT = new Date("2026-08-20T12:00:00Z").getTime();

// Ein Spiel, wie es aus der DB kommt. `offen` setzt den Snapshot auf
// „schon eingefroren".
const m = (id, wettbewerb, matchday, stundenBisAnpfiff, offen = false) => ({
  id, wettbewerb, matchday,
  kickoff: new Date(JETZT + stundenBisAnpfiff * STUNDE).toISOString(),
  snapshot: { matchId: id, ...(offen ? { bigGameGeprueft: true } : {}) },
  result: null,
});

describe("maxVorlaufStunden — die früheste Runde gibt den Takt vor", () => {
  it("nimmt den GRÖSSTEN Vorlauf aller Runden", () => {
    // Sobald für die früheste Runde das Fenster aufgeht, muss der Wert stehen —
    // sonst änderte sich der Wert eines schon abgegebenen Tipps.
    const max = maxVorlaufStunden([
      { rules: { tippfenster: { vorlaufStunden: 48 } } },
      { rules: { tippfenster: { vorlaufStunden: 336 } } },
      { rules: { tippfenster: { vorlaufStunden: 168 } } },
    ]);
    expect(max).toBe(336);
  });

  it("ohne Runden gilt der Standard, nicht 0", () => {
    // 0 hieße: nie öffnen. Das wäre der stille Ausfall, den die Automatik
    // gerade beseitigen soll.
    expect(maxVorlaufStunden([])).toBe(DEFAULT_TIPPFENSTER.vorlaufStunden);
    expect(maxVorlaufStunden([{ rules: {} }])).toBe(DEFAULT_TIPPFENSTER.vorlaufStunden);
  });

  it("unsinnige Werte werden auf die Grenzen beschnitten", () => {
    expect(maxVorlaufStunden([{ rules: { tippfenster: { vorlaufStunden: 99999 } } }])).toBe(720);
  });
});

describe("faelligeSpieltage", () => {
  it("öffnet, was innerhalb des Vorlaufs liegt", () => {
    const faellig = faelligeSpieltage({
      matches: [m("a", "bl", 1, 24), m("b", "bl", 1, 26)],
      vorlaufStunden: 48, jetzt: JETZT,
    });
    expect(faellig).toHaveLength(1);
    expect(faellig[0].matchday).toBe(1);
    expect(faellig[0].wettbewerb).toBe("bl");
  });

  it("lässt liegen, was noch zu weit weg ist", () => {
    const faellig = faelligeSpieltage({
      matches: [m("a", "bl", 5, 200)],
      vorlaufStunden: 48, jetzt: JETZT,
    });
    expect(faellig).toEqual([]);
  });

  it("öffnet NICHT mehr, wenn das erste Spiel schon angepfiffen ist", () => {
    // Nachträglich einzufrieren wäre schlimmer als gar nicht: bereits
    // abgegebene Tipps bekämen rückwirkend einen anderen Wert.
    const faellig = faelligeSpieltage({
      matches: [m("a", "bl", 1, -1), m("b", "bl", 1, 5)],
      vorlaufStunden: 48, jetzt: JETZT,
    });
    expect(faellig).toEqual([]);
  });

  it("überspringt bereits eingefrorene Spieltage", () => {
    const faellig = faelligeSpieltage({
      matches: [m("a", "bl", 1, 24, true), m("b", "bl", 1, 26, true)],
      vorlaufStunden: 48, jetzt: JETZT,
    });
    expect(faellig).toEqual([]);
  });

  it("trennt Spieltage nach WETTBEWERB, nicht nach der Zahl", () => {
    // „Spieltag 1" gibt es seit den fünf Ligen fünfmal. Zusammengeworfen käme
    // das Big Game aus doppelt so vielen Spielen und aus zwei Tabellen.
    const faellig = faelligeSpieltage({
      matches: [m("bl-a", "bl", 1, 24), m("cl-a", "cl", 1, 30)],
      vorlaufStunden: 48, jetzt: JETZT,
    });
    expect(faellig).toHaveLength(2);
    expect(faellig.map((f) => f.wettbewerb)).toEqual(["bl", "cl"]);
  });

  it("sortiert das dringendste zuerst", () => {
    const faellig = faelligeSpieltage({
      matches: [m("spaet", "cl", 1, 40), m("frueh", "bl", 1, 10)],
      vorlaufStunden: 48, jetzt: JETZT,
    });
    expect(faellig.map((f) => f.wettbewerb)).toEqual(["bl", "cl"]);
  });

  it("maßgeblich ist der ERSTE Anpfiff des Spieltags", () => {
    // Ein Spieltag zieht sich über Tage. Sobald sein frühestes Spiel tippbar
    // wird, muss der Wert für den GANZEN Spieltag stehen.
    const faellig = faelligeSpieltage({
      matches: [m("sa", "bl", 1, 47), m("fr", "bl", 1, 20)],
      vorlaufStunden: 24, jetzt: JETZT,
    });
    expect(faellig).toHaveLength(1);
    expect(faellig[0].spiele).toHaveLength(2);   // der ganze Spieltag
  });

  it("Spiele ohne Termin lösen nichts aus", () => {
    const ohne = { id: "x", wettbewerb: "bl", matchday: 9, kickoff: null, snapshot: {} };
    expect(faelligeSpieltage({ matches: [ohne], vorlaufStunden: 48, jetzt: JETZT })).toEqual([]);
  });
});
