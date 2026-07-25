import { describe, it, expect } from "vitest";
import {
  WETTBEWERBE, PHASEN, wettbewerbLabel, phasenLabel, istKo,
  wettbewerbVon, phaseVon, wettbewerbeIn, verteilung,
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
