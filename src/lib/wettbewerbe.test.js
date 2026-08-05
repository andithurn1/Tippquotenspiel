import { describe, it, expect } from "vitest";
import {
  WETTBEWERBE, PHASEN, wettbewerbLabel, phasenLabel, istKo,
  wettbewerbVon, phaseVon, wettbewerbeIn, verteilung, istEchterWettbewerb, saisonLage,
} from "./wettbewerbe";

describe("Wettbewerbs-Katalog", () => {
  it("Wettbewerbe und Phasen haben eindeutige Keys und Labels", () => {
    expect(new Set(WETTBEWERBE.map((w) => w.key)).size).toBe(WETTBEWERBE.length);
    expect(new Set(PHASEN.map((p) => p.key)).size).toBe(PHASEN.length);
    for (const w of WETTBEWERBE) expect(w.label.length).toBeGreaterThan(0);
  });

  it("Phasen sind nach Bedeutung aufsteigend gerankt, Ligaphase ist keine K.-o.-Runde", () => {
    const raenge = PHASEN.map((p) => p.rang);
    expect(raenge).toEqual([...raenge].sort((a, b) => a - b));
    expect(istKo("liga")).toBe(false);
    expect(istKo("halbfinale")).toBe(true);
    expect(istKo("finale")).toBe(true);
  });

  it("Labels fallen bei unbekannten Keys auf den Key zurück statt leer zu sein", () => {
    expect(wettbewerbLabel("cl")).toBe("Champions League");
    expect(wettbewerbLabel("xx")).toBe("xx");
    expect(phasenLabel("finale")).toBe("Finale");
    expect(phasenLabel(undefined)).toBe("—");
  });

  // Der Saisonstart darf nicht am Demo-Länderspiel hängen: es liegt in der
  // Vergangenheit und steckt in jedem Match-Katalog. Als Anpfiff gezählt,
  // fror es alle fensterlosen Saison-Wetten von Anfang an ein.
  it("nur das Demo-Spiel gehört zu keiner Saison — unbekannte Keys gelten als echt", () => {
    expect(istEchterWettbewerb("bl")).toBe(true);
    expect(istEchterWettbewerb("cl")).toBe(true);
    expect(istEchterWettbewerb("demo")).toBe(false);
    expect(istEchterWettbewerb("xx")).toBe(true);
    expect(istEchterWettbewerb(undefined)).toBe(true);
  });
});

describe("Fallback für Altdaten", () => {
  it("ein Match ohne die neuen Felder gilt als Bundesliga-Ligaspiel", () => {
    expect(wettbewerbVon({ id: "JOR-ESP" })).toBe("bl");
    expect(phaseVon({ id: "JOR-ESP" })).toBe("liga");
  });

  it("gesetzte Felder werden übernommen", () => {
    expect(wettbewerbVon({ wettbewerb: "cl" })).toBe("cl");
    expect(phaseVon({ phase: "finale" })).toBe("finale");
  });
});

describe("wettbewerbeIn & verteilung", () => {
  const matches = [
    { wettbewerb: "bl" }, { wettbewerb: "bl" }, { wettbewerb: "bl" },
    { wettbewerb: "cl" },
  ];

  it("listet nur tatsächlich vorkommende Wettbewerbe, in Katalog-Reihenfolge", () => {
    expect(wettbewerbeIn(matches).map((w) => w.key)).toEqual(["bl", "cl"]);
    expect(wettbewerbeIn([]).length).toBe(0);
  });

  it("verteilung zählt Spiele je Wettbewerb und liefert den Anteil", () => {
    const v = verteilung(matches);
    expect(v.find((x) => x.key === "bl").spiele).toBe(3);
    expect(v.find((x) => x.key === "bl").anteil).toBeCloseTo(0.75, 5);
    expect(v.find((x) => x.key === "cl").anteil).toBeCloseTo(0.25, 5);
    expect(v.reduce((s, x) => s + x.anteil, 0)).toBeCloseTo(1, 5);
  });

  it("leere Liste ergibt keine Verteilung (keine Division durch null)", () => {
    expect(verteilung([])).toEqual([]);
  });
});

// 🔴 Der Befund vom 05.08.2026: `SaisonTipps.jsx` fragte den UNGEFILTERTEN
// Match-Katalog. Der trägt sechs Wettbewerbe, die Wochen auseinander starten —
// gemessen: MLS am 31.07., Bundesliga am 28.08. In einer reinen
// Bundesliga-Runde galt die Saison damit schon als gestartet, und ALLE
// fensterlosen Saison-Wetten waren drei Wochen vor dem ersten Spieltag
// eingefroren.
describe("saisonLage — die Saison DIESER Runde, nicht die des Katalogs", () => {
  const spiel = (wettbewerb, kickoff, matchday = 1) => ({
    id: `${wettbewerb}-${matchday}`, wettbewerb, matchday, kickoff,
    home: "A", away: "B",
  });
  const JETZT = new Date("2026-08-05T12:00:00Z").getTime();

  const MLS = spiel("mls", "2026-07-31T23:00:00Z");
  const BL = spiel("bl", "2026-08-28T18:30:00Z");

  it("ein fremder Wettbewerb startet die Saison NICHT mit", () => {
    // Beide zusammen (so kam der Katalog herein): sieht gestartet aus.
    expect(saisonLage([MLS, BL], JETZT).gestartet).toBe(true);
    // Nur die Spiele der Runde: die Bundesliga hat noch nicht angefangen.
    expect(saisonLage([BL], JETZT).gestartet).toBe(false);
  });

  it("das Demo-Länderspiel zählt nicht als Saisonstart", () => {
    // `wettbewerb: "demo"` ist kein echter Wettbewerb — es liegt in jedem
    // Katalog und in der Vergangenheit.
    const demo = spiel("demo", "2024-01-01T18:00:00Z");
    expect(saisonLage([demo, BL], JETZT).gestartet).toBe(false);
  });

  it("der Spieltags-Stand zählt je Wettbewerb und nur über die Runde", () => {
    const mitMls = saisonLage([MLS, BL], JETZT).stand;
    expect(mitMls.mls).toBe(1);
    // Ohne die MLS steht die Runde bei 0 — es hat noch nichts stattgefunden.
    const nurBl = saisonLage([BL], JETZT).stand;
    expect(nurBl.mls).toBeUndefined();
    expect(nurBl.bl ?? nurBl.default).toBe(0);
  });

  it("ohne Spiele gilt die Saison als nicht gestartet", () => {
    expect(saisonLage([], JETZT).gestartet).toBe(false);
  });
});
