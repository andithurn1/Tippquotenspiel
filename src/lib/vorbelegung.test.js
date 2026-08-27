import { describe, it, expect } from "vitest";
import {
  VORBELEGUNGEN, DEFAULT_VORBELEGUNG, FESTER_START,
  VORBELEGUNG_LABEL, VORBELEGUNG_HINWEIS,
  startErgebnis,
} from "./vorbelegung";

// ⚠️ Der wahrscheinlichste Endstand wird über `startErgebnis(…, "wahrscheinlich")`
// geprüft und nicht über einen eigenen Export: zwei Wege zum selben Wert sind
// zwei Wahrheiten, und `npm run tot` meldet den zweiten ohnehin als toten Export.
const besterStand = (snap) => {
  const s = startErgebnis(snap, "wahrscheinlich");
  return s.quelle === "quote" ? s : null;
};

// Ein Spiel mit klarem Favoriten: 3:1 hat mit 7,0 die niedrigste Quote.
const SNAP = {
  correctScore: [
    [26, 34, 60],
    [15, 18, 40],
    [11, 12, 30],
    [9, 7.0, 25],
  ],
};

describe("der wahrscheinlichste Endstand", () => {
  it("nimmt die NIEDRIGSTE Quote -- nicht die hoechste", () => {
    // 🔴 Der Vorzeichenfehler waere in der Oberflaeche unsichtbar: der Stepper
    // stuende einfach auf 0:2 und niemand wuesste, warum.
    expect(besterStand(SNAP)).toMatchObject({ home: 3, away: 1, quote: 7 });
  });

  it("gibt `null`, wenn es kein Raster gibt", () => {
    expect(besterStand({})).toBeNull();
    expect(besterStand({ correctScore: [] })).toBeNull();
  });

  it("kennt keine Sperre mehr -- Endstaende bleiben immer offen", () => {
    // ⛔ Hier stand bis zum 26.08.2026 der Fall „ueberspringt einen gesperrten
    // Endstand". Er ist weg, weil es die Endstand-Sperre nicht mehr gibt
    // (Andi: „ich will keinen block ermoeglichen bei ergebnissen"). Der Test
    // haelt jetzt die andere Richtung fest: ein Regelwerk mit scharfer Sperre
    // aendert am Startwert NICHTS.
    const rules = { sperre: { enabled: true, modus: "rang", schuetzen: 3, mindestensOffen: 1 } };
    expect(startErgebnis(SNAP, "wahrscheinlich", rules))
      .toEqual(startErgebnis(SNAP, "wahrscheinlich"));
  });
});

describe("startErgebnis", () => {
  it("die Vorgabe ist der feste Stand", () => {
    expect(DEFAULT_VORBELEGUNG).toBe("fest");
    expect(startErgebnis(SNAP)).toEqual({ ...FESTER_START, quelle: "fest" });
  });

  it("`wahrscheinlich` liest den Stand aus den Quoten", () => {
    expect(startErgebnis(SNAP, "wahrscheinlich"))
      .toEqual({ home: 3, away: 1, quote: 7, quelle: "quote" });
  });

  it("faellt ohne Raster auf den festen Stand zurueck -- kein `undefined` im Stepper", () => {
    // Saison-Wetten und frisch angelegte Spiele haben kein Ergebnis-Raster.
    expect(startErgebnis({}, "wahrscheinlich")).toEqual({ ...FESTER_START, quelle: "fest" });
  });

  it("`quelle` sagt, woher der Wert kommt -- die Oberflaeche raet nicht", () => {
    expect(startErgebnis(SNAP, "fest").quelle).toBe("fest");
    expect(startErgebnis(SNAP, "wahrscheinlich").quelle).toBe("quote");
  });

  it("jede Stufe hat Beschriftung und Hinweis", () => {
    for (const v of VORBELEGUNGEN) {
      expect(VORBELEGUNG_LABEL[v], v).toBeTruthy();
      expect(VORBELEGUNG_HINWEIS[v]?.length ?? 0, v).toBeGreaterThan(20);
    }
  });
});
