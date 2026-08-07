import { describe, it, expect } from "vitest";
import {
  SPIELDAUER_MIN, abrechnungsZeit, neueAbrechnungen, zusammenfassung, gesehenBis,
} from "@/lib/zwischenabrechnung";
import {
  DEFAULT_PREFS, sanitizePrefs, PREF_META,
  MAX_VERGLEICH, toggleVergleich, vergleichFuer,
} from "@/lib/prefs";
import { createMockOddsSource } from "@/lib/engine";

const MIN = 60 * 1000;
const T0 = new Date("2026-08-28T18:30:00Z").getTime();

// ⚠️ Ein ECHTER Snapshot aus der Quoten-Quelle, kein selbstgebauter mit nur
// `winner`. `scoreTip` liest daraus auch das Ergebnis-Raster und die Torschützen
// — ein halber Snapshot lässt sie nicht „0 Punkte" rechnen, sondern abstürzen.
// Beim ersten Anlauf genau daran gescheitert.
const SNAP = createMockOddsSource().getSnapshot("JOR-ESP");

// Ein Eintrag in der Form von `getRoundEntries`.
const e = (min, tip, result, extra = {}) => ({
  userId: "u1", matchId: `m${min}`, matchday: 1, wettbewerb: "bl",
  kickoff: new Date(T0 + min * MIN).toISOString(),
  tip: tip && { goals: { home: [], away: [] }, ...tip },
  result: result && { playerGoals: {}, ...result },
  snapshot: { ...SNAP, matchId: `m${min}`, home: "A", away: "B" },
  ...extra,
});

const treffer = { home: 2, away: 1 };

describe("Wann ist ein Spiel abgerechnet?", () => {
  const jetzt = T0 + 1000 * MIN;

  it("erst nach Ablauf der Spieldauer", () => {
    const spiel = e(0, treffer, treffer);
    expect(abrechnungsZeit(spiel, T0 + (SPIELDAUER_MIN - 1) * MIN)).toBe(null);
    expect(abrechnungsZeit(spiel, T0 + SPIELDAUER_MIN * MIN)).toBe(T0 + SPIELDAUER_MIN * MIN);
  });

  // 🔴 Zeit allein genügt nicht. Ein Spiel ohne Ergebnis (Absage, Quelle
  // hängt) wäre sonst eine Meldung mit 0 Punkten — und die liest sich wie ein
  // Fehltipp, nicht wie ein fehlendes Ergebnis.
  it("ohne Ergebnis gibt es nichts abzurechnen, egal wie spät es ist", () => {
    expect(abrechnungsZeit(e(0, treffer, null), jetzt)).toBe(null);
  });

  it("ohne verwertbaren Anpfiff ebenfalls nicht", () => {
    expect(abrechnungsZeit({ kickoff: "kaputt", result: treffer }, jetzt)).toBe(null);
    expect(abrechnungsZeit({ result: treffer }, jetzt)).toBe(null);
    expect(abrechnungsZeit(null, jetzt)).toBe(null);
  });

  it("die Spieldauer ist großzügig — zu spät ist harmlos, zu früh ist falsch", () => {
    // 90 + Halbzeit + Nachspielzeit sind rund 115 Minuten.
    expect(SPIELDAUER_MIN).toBeGreaterThan(115);
  });
});

describe("Was ist seit dem letzten Besuch fertig geworden?", () => {
  const jetzt = T0 + 1000 * MIN;
  const spiele = [
    e(0, treffer, treffer),            // fertig bei T0+135
    e(200, treffer, { home: 0, away: 3 }),  // fertig bei T0+335
    e(600, treffer, treffer),          // fertig bei T0+735
  ];

  it("liefert genau die Spiele NACH der Marke, chronologisch", () => {
    const seit = T0 + 300 * MIN;
    const neu = neueAbrechnungen({ eintraege: spiele, seit, jetzt });
    expect(neu.map((x) => x.matchId)).toEqual(["m200", "m600"]);
    expect(neu[0].fertig).toBeLessThan(neu[1].fertig);
  });

  // 🔴 Beim allerersten Öffnen darf nicht die halbe Saison als „Neuigkeiten"
  // kommen — dieselbe Überlegung wie bei der Spielwahl, die nur Anstehendes
  // zeigt statt 465 Spiele.
  it("ohne Marke wird NICHTS erzählt", () => {
    expect(neueAbrechnungen({ eintraege: spiele, seit: null, jetzt })).toEqual([]);
    expect(neueAbrechnungen({ eintraege: spiele, seit: "kaputt", jetzt })).toEqual([]);
  });

  it("noch laufende Spiele bleiben draußen", () => {
    const neu = neueAbrechnungen({ eintraege: spiele, seit: T0 - 1, jetzt: T0 + 400 * MIN });
    expect(neu.map((x) => x.matchId)).toEqual(["m0", "m200"]);
  });

  it("ein Spiel ohne eigenen Tipp ist keine Neuigkeit", () => {
    const ohne = [{ ...e(0, treffer, treffer), tip: null }];
    expect(neueAbrechnungen({ eintraege: ohne, seit: T0 - 1, jetzt })).toEqual([]);
  });

  it("jede Zeile trägt Tipp, Ergebnis und Punkte", () => {
    const neu = neueAbrechnungen({ eintraege: [spiele[0]], seit: T0 - 1, jetzt });
    expect(neu[0].punkte).toBeGreaterThan(0);
    expect(neu[0].exakt).toBe(true);
    expect(neu[0].home).toBe("A");
    // Der Fehltipp bringt weniger als der Volltreffer — sonst rechnet die
    // Zeile nicht wirklich, sondern zeigt nur eine Zahl.
    const daneben = neueAbrechnungen({ eintraege: [spiele[1]], seit: T0 - 1, jetzt });
    expect(daneben[0].exakt).toBe(false);
    expect(daneben[0].punkte).toBeLessThan(neu[0].punkte);
  });
});

describe("Die Zusammenfassung", () => {
  it("zählt Spiele, Punkte und Volltreffer", () => {
    const jetzt = T0 + 1000 * MIN;
    const neu = neueAbrechnungen({
      eintraege: [e(0, treffer, treffer), e(200, treffer, { home: 0, away: 3 })],
      seit: T0 - 1, jetzt,
    });
    const s = zusammenfassung(neu);
    expect(s.anzahl).toBe(2);
    expect(s.exakte).toBe(1);
    expect(s.punkte).toBe(neu[0].punkte + neu[1].punkte);
    expect(s.beste.matchId).toBe("m0");
  });

  it("kommt mit einer leeren Liste zurecht", () => {
    expect(zusammenfassung([])).toEqual({ anzahl: 0, punkte: 0, exakte: 0, beste: null });
  });
});

// 🔴 Die Marke ist der Stand des LETZTEN abgerechneten Spiels, nicht „jetzt".
// Zwischen dem Aufbau der Liste und dem Klick können Minuten liegen; mit
// „jetzt" markiert würde ein Spiel, das genau dazwischen fertig wird, als
// gesehen verbucht und nie erzählt. Doppelt zeigen ist ärgerlich, verschlucken
// ist schlimmer.
describe("Die Marke „bis hierhin gesehen“", () => {
  it("nimmt den Stand des letzten Spiels, nicht die Uhrzeit", () => {
    const liste = [{ fertig: 100 }, { fertig: 500 }, { fertig: 300 }];
    expect(gesehenBis(liste)).toBe(500);
  });

  it("geht nie zurück", () => {
    expect(gesehenBis([{ fertig: 100 }], 900)).toBe(900);
    expect(gesehenBis([], 900)).toBe(900);
  });
});

// ⚠️ Etwas, das sich beim Öffnen vor alles legt, MUSS abstellbar sein — das
// ist keine Komfortfrage. Diese Zeilen halten fest, dass der Schalter da ist
// und dass er drei echte Stufen hat.
describe("Abstellbar", () => {
  it("steht als eigene Anzeige-Stufe im Regelwerk der Prefs", () => {
    expect(DEFAULT_PREFS.zwischenabrechnung).toBe("voll");
    expect(sanitizePrefs({ zwischenabrechnung: "aus" }).zwischenabrechnung).toBe("aus");
    expect(sanitizePrefs({ zwischenabrechnung: "gibtsNicht" }).zwischenabrechnung).toBe("voll");
  });

  it("hat einen Text für den Einstellungs-Screen — auch für „aus“", () => {
    const meta = PREF_META.zwischenabrechnung;
    expect(meta.title && meta.hint).toBeTruthy();
    for (const stufe of ["voll", "dezent", "aus"]) {
      expect(meta.levels[stufe].length).toBeGreaterThan(10);
    }
    // „aus" muss sagen, wie man trotzdem hinkommt — sonst liest es sich, als
    // wäre die Abrechnung weg.
    expect(meta.levels.aus).toContain("Menü");
  });
});

// ── Der Vergleich mit ausgewählten Mitspielern ──────────────
// 🔴 Nutzer-Wunsch vom 07.08.: bis zu drei Mitspieler laufen im Vergleich mit,
// auch in der Einblendung. Persönliche Einstellung je Runde — kein Regelwerk.
describe("Vergleich mit Mitspielern", () => {
  const jetzt = T0 + 1000 * MIN;
  const meins = e(0, treffer, treffer);
  const fremd = (userId, tip) => ({ ...e(0, tip, treffer), userId, name: userId.toUpperCase() });

  const mit = (vergleich, alle) => neueAbrechnungen({
    eintraege: [meins], alleEintraege: alle, vergleich, seit: T0 - 1, jetzt,
  });

  it("hängt die Tipps und Punkte der Gewählten an das Spiel", () => {
    const alle = [meins, fremd("u2", { home: 0, away: 0 }), fremd("u3", treffer)];
    const [zeile] = mit(["u2", "u3"], alle);
    expect(zeile.andere.map((a) => a.userId)).toEqual(["u2", "u3"]);
    expect(zeile.andere[0].name).toBe("U2");
    // u3 hat exakt getippt wie ich, u2 nicht — die Punkte müssen das zeigen,
    // sonst steht dort nur eine Zahl statt einer Wertung.
    expect(zeile.andere[1].exakt).toBe(true);
    expect(zeile.andere[0].punkte).toBeLessThan(zeile.andere[1].punkte);
  });

  it("ohne Auswahl bleibt die Zeile bei den eigenen Zahlen", () => {
    const alle = [meins, fremd("u2", { home: 0, away: 0 })];
    expect(mit([], alle)[0].andere).toEqual([]);
    // Auch ohne `alleEintraege` — der Aufrufer darf sie weglassen.
    expect(neueAbrechnungen({ eintraege: [meins], seit: T0 - 1, jetzt })[0].andere).toEqual([]);
  });

  // 🔴 „Hat nicht getippt" und „hat null Punkte geholt" sind zwei verschiedene
  // Aussagen. Die zweite wäre eine Behauptung über jemanden, die nicht stimmt.
  it("wer dieses Spiel nicht getippt hat, taucht gar nicht auf", () => {
    const alle = [meins, { ...fremd("u2", treffer), tip: null }];
    expect(mit(["u2"], alle)[0].andere).toEqual([]);
  });

  it("die Reihenfolge folgt der Auswahl, nicht der Datenlage", () => {
    const alle = [meins, fremd("u3", treffer), fremd("u2", treffer)];
    expect(mit(["u2", "u3"], alle)[0].andere.map((a) => a.userId)).toEqual(["u2", "u3"]);
  });
});

describe("Die Vergleichs-Einstellung", () => {
  it("liegt JE RUNDE getrennt", () => {
    const v = toggleVergleich({}, "r1", "u2");
    expect(vergleichFuer({ vergleich: v }, "r1")).toEqual(["u2"]);
    // Wer in drei Runden spielt, hat dort verschiedene Mitspieler — eine
    // flache Liste träfe in der zweiten Runde niemanden.
    expect(vergleichFuer({ vergleich: v }, "r2")).toEqual([]);
  });

  it("schaltet an und wieder ab", () => {
    let v = toggleVergleich({}, "r1", "u2");
    v = toggleVergleich(v, "r1", "u2");
    expect(vergleichFuer({ vergleich: v }, "r1")).toEqual([]);
    expect(v.r1).toBeUndefined();   // keine leeren Einträge zurücklassen
  });

  // ⚠️ Voll heißt GESPERRT, nicht „verdrängt den ersten". Ein Häkchen, das
  // still ein anderes wegnimmt, ist die Sorte Oberfläche, bei der man beim
  // dritten Klick aufgibt.
  it("über der Grenze passiert NICHTS — es wird niemand verdrängt", () => {
    let v = {};
    for (const u of ["u2", "u3", "u4"]) v = toggleVergleich(v, "r1", u);
    const voll = vergleichFuer({ vergleich: v }, "r1");
    expect(voll).toHaveLength(MAX_VERGLEICH);
    const danach = toggleVergleich(v, "r1", "u5");
    expect(vergleichFuer({ vergleich: danach }, "r1")).toEqual(voll);
  });

  it("überlebt das Säubern — und beschneidet Unsinn", () => {
    const roh = { vergleich: { r1: ["u2", "u2", "u3", "u4", "u5"], r2: "kaputt", "": ["u9"] } };
    const s = sanitizePrefs(roh);
    expect(s.vergleich.r1).toEqual(["u2", "u3", "u4"]);   // entdoppelt, gedeckelt
    expect(s.vergleich.r2).toBeUndefined();
    expect(s.vergleich[""]).toBeUndefined();
    // Und stabil: zweimal säubern ändert nichts mehr.
    expect(sanitizePrefs(s)).toEqual(s);
  });
});
