import { describe, it, expect } from "vitest";
import {
  SPOTT_SCHWELLEN, stehtOben, stehtUnten, darfSpotten, offenerSpott, baueSpott,
} from "./spottPost";

// Sechs Spieler, klar sortiert: a ist Erster, f ist Letzter.
const BOARD = [
  { userId: "a", total: 600 },
  { userId: "b", total: 500 },
  { userId: "c", total: 400 },
  { userId: "d", total: 300 },
  { userId: "e", total: 200 },
  { userId: "f", total: 100 },
];
const SPIELTAG = { wettbewerb: "BL", matchday: 3 };

describe("Wer steht wo", () => {
  it("erkennt oben und unten", () => {
    expect(stehtOben(BOARD, "a")).toBe(true);
    expect(stehtOben(BOARD, "f")).toBe(false);
    expect(stehtUnten(BOARD, "f")).toBe(true);
    expect(stehtUnten(BOARD, "a")).toBe(false);
  });

  it("verlässt sich nicht auf die Reihenfolge im Board", () => {
    expect(stehtOben([...BOARD].reverse(), "a")).toBe(true);
  });

  // 🔴 In einer Runde zu dritt ist „oberes Drittel" eine Person, und der
  // Spott träfe zwangsläufig immer dieselbe. Das ist kein Spiel mehr.
  it("🔴 in einer Kleinstrunde steht niemand oben oder unten", () => {
    const drei = BOARD.slice(0, 3);
    expect(stehtOben(drei, "a")).toBe(false);
    expect(stehtUnten(drei, "c")).toBe(false);
  });

  it("wer gar nicht mitgespielt hat, steht nirgends", () => {
    expect(stehtOben(BOARD, "x")).toBe(false);
    expect(stehtUnten(BOARD, "x")).toBe(false);
  });
});

describe("Darf ich spotten?", () => {
  const gut = { board: BOARD, vonId: "a", aufId: "f", spieltag: SPIELTAG, abgerechnet: true };

  it("von ganz oben auf ganz unten geht", () => {
    expect(darfSpotten(gut).erlaubt).toBe(true);
  });

  // 🔴 Andis Wertung: Spott als BELOHNUNG statt als Dauerrecht. Wer selbst
  // hinten lag, zieht niemanden auf.
  it("🔴 von unten nach oben geht NICHT", () => {
    const p = darfSpotten({ ...gut, vonId: "f", aufId: "a" });
    expect(p.erlaubt).toBe(false);
    expect(p.grund).toContain("weit vorn");
  });

  it("die Mitte darf weder senden noch getroffen werden", () => {
    expect(darfSpotten({ ...gut, vonId: "c" }).erlaubt).toBe(false);
    expect(darfSpotten({ ...gut, aufId: "c" }).erlaubt).toBe(false);
  });

  // 🔴 Andis Zeitpunkt: „macht immer nur nach der Gesamtspieltagsabrechnung
  // Sinn". Vorher weiß niemand, wer gut oder schlecht lag — der Spott wäre
  // geraten.
  it("🔴 vor der Abrechnung geht gar nichts", () => {
    const p = darfSpotten({ ...gut, abgerechnet: false });
    expect(p.erlaubt).toBe(false);
    expect(p.grund).toContain("abgerechnet");
  });

  it("sich selbst zieht man nicht auf", () => {
    expect(darfSpotten({ ...gut, aufId: "a" }).erlaubt).toBe(false);
  });

  // ⚠️ Sonst wird aus einer Pointe eine Belästigung — und zwar genau in dem
  // Moment, in dem jemand ohnehin schlecht dasteht.
  it("⚠️ einer je Ziel und Spieltag", () => {
    const schon = [{ auf_id: "f", wettbewerb: "BL", matchday: 3 }];
    expect(darfSpotten({ ...gut, bereitsGesendet: schon }).erlaubt).toBe(false);
    // Anderer Spieltag: wieder frei.
    expect(darfSpotten({
      ...gut, bereitsGesendet: schon, spieltag: { wettbewerb: "BL", matchday: 4 },
    }).erlaubt).toBe(true);
    // Anderes Ziel am selben Spieltag: auch frei.
    expect(darfSpotten({ ...gut, aufId: "e", bereitsGesendet: schon }).erlaubt).toBe(true);
  });

  // 🔴 Ein Knopf, der nichts tut und nicht sagt warum, wirkt kaputt.
  it("🔴 jede Absage nennt einen Grund", () => {
    const faelle = [
      { ...gut, abgerechnet: false },
      { ...gut, vonId: "f", aufId: "a" },
      { ...gut, aufId: "a" },
      { ...gut, board: BOARD.slice(0, 3) },
      { ...gut, vonId: null },
    ];
    for (const f of faelle) {
      const p = darfSpotten(f);
      expect(p.erlaubt).toBe(false);
      expect(p.grund, JSON.stringify(f.vonId)).toBeTruthy();
    }
  });
});

describe("Was für mich bereitliegt", () => {
  const JETZT = Date.parse("2026-09-10T12:00:00Z");
  const vor = (tage) => new Date(JETZT - tage * 24 * 3600e3).toISOString();

  it("zeigt nur Ungesehenes für mich", () => {
    const post = [
      { auf_id: "f", erstellt_am: vor(1), gesehen_am: null, spruch: "neu" },
      { auf_id: "f", erstellt_am: vor(2), gesehen_am: vor(1), spruch: "schon gesehen" },
      { auf_id: "e", erstellt_am: vor(1), gesehen_am: null, spruch: "nicht für mich" },
    ];
    const offen = offenerSpott(post, "f", JETZT);
    expect(offen).toHaveLength(1);
    expect(offen[0].spruch).toBe("neu");
  });

  // ⚠️ Ein Spott von vor drei Monaten ist kein Spott mehr, sondern eine
  // Merkwürdigkeit.
  it("⚠️ Altes verschwindet von selbst", () => {
    const post = [{ auf_id: "f", erstellt_am: vor(60), gesehen_am: null }];
    expect(offenerSpott(post, "f", JETZT)).toEqual([]);
  });

  // 🔴 Lieber einmal zu viel zeigen als etwas verschlucken, das jemand
  // abgeschickt hat.
  it("🔴 ohne lesbaren Zeitstempel wird NICHT weggeworfen", () => {
    const post = [{ auf_id: "f", erstellt_am: "kaputt", gesehen_am: null }];
    expect(offenerSpott(post, "f", JETZT)).toHaveLength(1);
  });

  it("Ältestes zuerst", () => {
    const post = [
      { auf_id: "f", erstellt_am: vor(1), spruch: "jung" },
      { auf_id: "f", erstellt_am: vor(5), spruch: "alt" },
    ];
    expect(offenerSpott(post, "f", JETZT).map((s) => s.spruch)).toEqual(["alt", "jung"]);
  });

  it("verträgt Unsinn", () => {
    expect(offenerSpott(null, "f")).toEqual([]);
    expect(offenerSpott([null, 5], "f")).toEqual([]);
  });
});

describe("Der fertige Spott", () => {
  const JETZT = Date.parse("2026-09-10T12:00:00Z");

  it("trägt alles, was die Auswertung braucht", () => {
    const { ok, spott } = baueSpott({
      vonId: "a", aufId: "f", roundId: "r1", spieltag: SPIELTAG,
      spruch: "Das war knapp.", clip: "jubel", jetzt: JETZT,
    });
    expect(ok).toBe(true);
    expect(spott.von_id).toBe("a");
    expect(spott.auf_id).toBe("f");
    expect(spott.matchday).toBe(3);
    expect(spott.wettbewerb).toBe("BL");
    expect(spott.clip).toBe("jubel");
    expect(spott.gesehen_am).toBeNull();
  });

  // ⚠️ Ein leerer Spott ist ein Stups ohne Inhalt — und genau das soll die
  // Funktion nicht sein.
  it("⚠️ ohne Spruch UND ohne Clip geht nichts", () => {
    const r = baueSpott({ vonId: "a", aufId: "f" });
    expect(r.ok).toBe(false);
    expect(r.spott).toBeNull();
    expect(r.grund).toBeTruthy();
  });

  it("ein Clip allein reicht", () => {
    expect(baueSpott({ vonId: "a", aufId: "f", clip: "jubel" }).ok).toBe(true);
  });

  it("kürzt einen zu langen Spruch und räumt Leerraum auf", () => {
    const { spott } = baueSpott({ vonId: "a", aufId: "f", spruch: `  viel   Platz  ${"x".repeat(300)}` });
    expect(spott.spruch.length).toBeLessThanOrEqual(160);
    expect(spott.spruch.startsWith("viel Platz")).toBe(true);
  });

  it("die Haltbarkeit ist gesetzt und endlich", () => {
    expect(SPOTT_SCHWELLEN.haltbarTage).toBeGreaterThan(0);
    expect(SPOTT_SCHWELLEN.haltbarTage).toBeLessThanOrEqual(60);
  });
});
