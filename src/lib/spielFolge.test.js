import { describe, it, expect } from "vitest";
import { sortiereFolge, nachbarn, positionText } from "@/lib/spielFolge";

const spiel = (id, kickoff, extra = {}) => ({
  matchId: id, snapshot: { kickoff }, ...extra,
});

// Ein Samstag, wie er wirklich aussieht: fünf Spiele um 15:30, davor eines am
// Freitag, danach eines am Sonntag.
const SAMSTAG = [
  spiel("bl-c", "2026-08-29T13:30:00Z"),
  spiel("bl-a", "2026-08-29T13:30:00Z"),
  spiel("bl-e", "2026-08-29T13:30:00Z"),
  spiel("fr", "2026-08-28T18:30:00Z"),
  spiel("so", "2026-08-30T15:30:00Z"),
];

describe("Reihenfolge", () => {
  it("nach Anstoßzeit", () => {
    const ids = sortiereFolge(SAMSTAG).map((m) => m.matchId);
    expect(ids[0]).toBe("fr");
    expect(ids.at(-1)).toBe("so");
  });

  // 🔴 Neun Bundesliga-Spiele stoßen samstags gleichzeitig an. Ohne festen
  // zweiten Schlüssel haengt ihre Reihenfolge davon ab, wie die Datenbank sie
  // gerade liefert — „das nächste Spiel" wäre nach dem Neuladen ein anderes.
  it("bei gleicher Anstoßzeit entscheidet die matchId — stabil", () => {
    const a = sortiereFolge(SAMSTAG).map((m) => m.matchId);
    const b = sortiereFolge([...SAMSTAG].reverse()).map((m) => m.matchId);
    expect(a).toEqual(b);
    expect(a.slice(1, 4)).toEqual(["bl-a", "bl-c", "bl-e"]);
  });

  it("Spiele ohne Termin fallen ans Ende statt die Sortierung zu sprengen", () => {
    const mit = sortiereFolge([...SAMSTAG, spiel("ohne", null)]);
    expect(mit.at(-1).matchId).toBe("ohne");
  });

  it("wirft Einträge ohne Id weg", () => {
    expect(sortiereFolge([...SAMSTAG, { snapshot: { kickoff: "2026-01-01" } }]))
      .toHaveLength(SAMSTAG.length);
  });

  it("kommt mit leer und Unsinn klar", () => {
    expect(sortiereFolge()).toEqual([]);
    expect(sortiereFolge(null)).toEqual([]);
  });
});

describe("Nachbarn", () => {
  it("liefert Vorgänger und Nachfolger", () => {
    const n = nachbarn(SAMSTAG, "bl-c");
    expect(n.vorher.matchId).toBe("bl-a");
    expect(n.nachher.matchId).toBe("bl-e");
    expect(n.index).toBe(2);
    expect(n.anzahl).toBe(5);
  });

  it("am Anfang gibt es keinen Vorgänger, am Ende keinen Nachfolger", () => {
    expect(nachbarn(SAMSTAG, "fr").vorher).toBeNull();
    expect(nachbarn(SAMSTAG, "so").nachher).toBeNull();
  });

  it("ein Spiel, das nicht zur Runde gehört, hat keine Position", () => {
    const n = nachbarn(SAMSTAG, "gibts-nicht");
    expect(n.index).toBe(-1);
    expect(n.vorher).toBeNull();
    expect(n.nachher).toBeNull();
    expect(positionText(SAMSTAG, "gibts-nicht")).toBeNull();
  });

  it("zählt für Menschen ab 1", () => {
    expect(positionText(SAMSTAG, "fr")).toBe("1 von 5");
    expect(positionText(SAMSTAG, "so")).toBe("5 von 5");
  });
});

describe("Filter — nur die tippbaren", () => {
  const tippbar = (m) => m.matchId !== "bl-c";

  it("überspringt, was der Filter aussortiert", () => {
    const n = nachbarn(SAMSTAG, "bl-a", { filter: tippbar });
    expect(n.nachher.matchId).toBe("bl-e");   // bl-c übersprungen
    expect(n.anzahl).toBe(4);
  });

  // ⚠️ Sonst verschwindet der Blätter-Balken genau in dem Moment, in dem das
  // Spiel angepfiffen wird und man noch darauf schaut.
  it("das AKTUELLE Spiel bleibt drin, auch wenn der Filter es aussortiert", () => {
    const n = nachbarn(SAMSTAG, "bl-c", { filter: tippbar });
    expect(n.index).toBeGreaterThanOrEqual(0);
    expect(n.vorher.matchId).toBe("bl-a");
    expect(n.nachher.matchId).toBe("bl-e");
    expect(n.anzahl).toBe(5);
  });

  it("filtert der Filter alles weg, bleibt man trotzdem allein stehen", () => {
    const n = nachbarn(SAMSTAG, "bl-c", { filter: () => false });
    expect(n.anzahl).toBe(1);
    expect(n.vorher).toBeNull();
    expect(n.nachher).toBeNull();
    expect(positionText(SAMSTAG, "bl-c", { filter: () => false })).toBe("1 von 1");
  });
});

// 🔴 Die Runden-Schicht-Falle, ausgeschrieben: wer `listMatches()` statt
// `listRoundMatches()` hereingibt, blättert nach dem Bundesliga-Spiel in die
// MLS. Die Datei kann das nicht verhindern — sie kann nur zeigen, dass die
// Antwort von der Eingabe abhängt.
describe("Die Eingabe entscheidet, nicht die Datei", () => {
  const KATALOG = [...SAMSTAG, spiel("mls-1", "2026-08-29T13:31:00Z")];
  it("mit dem ganzen Katalog steht plötzlich ein fremder Wettbewerb daneben", () => {
    expect(nachbarn(KATALOG, "bl-e").nachher.matchId).toBe("mls-1");
    expect(nachbarn(SAMSTAG, "bl-e").nachher.matchId).toBe("so");
  });
});
