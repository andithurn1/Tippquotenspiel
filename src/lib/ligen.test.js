import { describe, it, expect } from "vitest";
import { LIGEN, alleMatches, quotenQuelle, echteSpielplaene, alleVereine, vereineVon } from "@/lib/ligen";

describe("Ligen-Registry", () => {
  it("jeder Wettbewerb hat einen eindeutigen Schluessel", () => {
    const keys = LIGEN.map((l) => l.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("der Katalog traegt jeden Wettbewerb der Registry", () => {
    const imKatalog = new Set(alleMatches().map((m) => m.wettbewerb));
    for (const l of LIGEN) expect(imKatalog).toContain(l.key);
  });

  it("alle matchIds im ganzen Katalog sind eindeutig", () => {
    const ids = alleMatches().map((m) => m.matchId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// 🔴 Der Grund, warum diese Tests hier stehen und nicht siebenmal in den
// Liga-Dateien: bis zum 25.08.2026 hatte JEDE Liga ihre eigene Quoten-Quelle,
// jede mit demselben Einzeiler und ihrem eigenen Test. Keine davon rief
// jemand auf, und keine haette eine Runde bedienen koennen, die Wettbewerbe
// mischt.
describe("quotenQuelle — gleiche Schnittstelle wie createMockOddsSource", () => {
  it("liefert Snapshot & Ergebnis fuer bekannte Matches, null fuer unbekannte", () => {
    const q = quotenQuelle();
    const [erst] = alleMatches();
    expect(q.getSnapshot(erst.matchId).home).toBe(erst.home);
    expect(q.getResult(erst.matchId)).toEqual(erst.result);
    expect(q.getSnapshot("gibts-nicht")).toBeNull();
    expect(q.getResult("gibts-nicht")).toBeNull();
  });

  it("bedient ALLE Wettbewerbe — nicht nur einen", () => {
    const q = quotenQuelle();
    for (const l of LIGEN) {
      const spiel = alleMatches().find((m) => m.wettbewerb === l.key);
      expect(q.getSnapshot(spiel.matchId), l.key).not.toBeNull();
    }
  });

  it("gibt bei zwei Aufrufen dieselbe Quelle zurueck", () => {
    expect(quotenQuelle()).toBe(quotenQuelle());
  });
});

describe("Abgeleitete Listen", () => {
  it("echteSpielplaene nennt nur Schluessel aus der Registry", () => {
    const keys = new Set(LIGEN.map((l) => l.key));
    for (const k of echteSpielplaene()) expect(keys).toContain(k);
  });

  it("alleVereine ist dublettenfrei und alphabetisch", () => {
    const v = alleVereine();
    expect(new Set(v).size).toBe(v.length);
    expect([...v].sort((a, b) => a.localeCompare(b, "de"))).toEqual(v);
  });

  it("vereineVon liefert die Klubs eines Wettbewerbs, sonst nichts", () => {
    expect(vereineVon("bl").length).toBeGreaterThan(0);
    expect(vereineVon("gibts-nicht")).toEqual([]);
  });
});
