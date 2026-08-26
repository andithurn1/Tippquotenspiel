import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPERRE, SPERRE_MODI, sanitizeSperre,
  schuetzenSperre, ergebnisSperre,
  istSchuetzeGesperrt, istErgebnisGesperrt, beschreibeSperre,
} from "./favoritenSperre";

// ============================================================
//  Was hier geprueft wird -- und was ausdruecklich NICHT.
//
//  Geprueft wird, ob die Sperre die RICHTIGEN Optionen trifft: die
//  wahrscheinlichsten, nie die Aussenseiter. Dieser Fehler waere in der
//  Oberflaeche unsichtbar, weil gesperrt eben gesperrt aussieht -- man saehe
//  erst nach Wochen, dass ausgerechnet die 30er-Quoten fehlen.
//
//  NICHT geprueft wird, ob eine Zahl gut gewaehlt ist. Das ist Balance und
//  damit Endphase (CLAUDE.md).
// ============================================================

// Ein Schnappschuss mit klarer Rangfolge: Kane ist der Favorit.
const SNAP = {
  players: {
    home: { Kane: { anytime: 1.6 }, Musiala: { anytime: 2.4 }, Kimmich: { anytime: 7.0 } },
    away: { Irvine: { anytime: 5.5 }, Saad: { anytime: 6.5 }, Smith: { anytime: 11.0 } },
  },
  // [heim][auswaerts] -- 3:1 ist mit 7,0 der wahrscheinlichste Endstand.
  correctScore: [
    [26, 34, 60],
    [15, 18, 40],
    [11, 12, 30],
    [9, 7.0, 25],
  ],
};

const mit = (partial) => ({ sperre: { enabled: true, ...partial } });

describe("sanitizeSperre", () => {
  it("gibt ohne Eingabe die Vorgabe -- und die ist AUS", () => {
    expect(sanitizeSperre()).toEqual(DEFAULT_SPERRE);
    expect(DEFAULT_SPERRE.enabled).toBe(false);
  });

  it("kennt nur die zwei Bauarten", () => {
    expect(SPERRE_MODI).toEqual(["rang", "quote"]);
    expect(sanitizeSperre({ modus: "irgendwas" }).modus).toBe("rang");
  });

  it("klemmt Werte in ihre Grenzen statt sie zu uebernehmen", () => {
    expect(sanitizeSperre({ schuetzen: 99 }).schuetzen).toBe(6);
    expect(sanitizeSperre({ ergebnisse: -3 }).ergebnisse).toBe(0);
    expect(sanitizeSperre({ mindestQuote: 999 }).mindestQuote).toBe(15);
    expect(sanitizeSperre({ mindestensOffen: 0 }).mindestensOffen).toBe(1);
    expect(sanitizeSperre({ schuetzen: "kaputt" }).schuetzen).toBe(DEFAULT_SPERRE.schuetzen);
  });

  it("laesst sich nicht einschalten, wenn sie nichts tut", () => {
    // Dieselbe Sperrklinke wie bei `sanitizeWettbewerbe`: ein aktiver Schalter
    // ohne Wirkung ist eine Einstellung, die luegt.
    expect(sanitizeSperre({ enabled: true, modus: "rang", schuetzen: 0, ergebnisse: 0 }).enabled).toBe(false);
    expect(sanitizeSperre({ enabled: true, modus: "quote", mindestQuote: 1 }).enabled).toBe(false);
    expect(sanitizeSperre({ enabled: true, modus: "rang", schuetzen: 1 }).enabled).toBe(true);
    expect(sanitizeSperre({ enabled: true, modus: "quote", mindestQuote: 2 }).enabled).toBe(true);
  });
});

describe("Torschuetzen", () => {
  it("laesst ohne Einstellung jeden Namen wählbar -- und traegt dann keinen Grund", () => {
    const alle = schuetzenSperre(SNAP, {});
    expect(alle).toHaveLength(6);
    expect(alle.every((o) => o.gesperrt === false && o.grund === null)).toBe(true);
  });

  it("sperrt im Modus `rang` den Favoriten, nicht den Aussenseiter", () => {
    // 🔴 Der teuerste denkbare Vorzeichenfehler dieser Datei: absteigend
    // sortiert traefe es Smith (11,0) statt Kane (1,6).
    const alle = schuetzenSperre(SNAP, mit({ modus: "rang", schuetzen: 2, mindestensOffen: 1 }));
    const gesperrt = alle.filter((o) => o.gesperrt).map((o) => o.id);
    expect(gesperrt).toEqual(["Kane", "Musiala"]);
    expect(alle.find((o) => o.id === "Smith").gesperrt).toBe(false);
  });

  it("sperrt ueber BEIDE Mannschaften hinweg, nicht je Team", () => {
    // Der wahrscheinlichste Torschuetze des Spiels ist einer, nicht zwei.
    const alle = schuetzenSperre(SNAP, mit({ modus: "rang", schuetzen: 1, mindestensOffen: 1 }));
    expect(alle.filter((o) => o.gesperrt).map((o) => o.id)).toEqual(["Kane"]);
  });

  it("sperrt im Modus `quote` alles unterhalb der Schwelle", () => {
    const alle = schuetzenSperre(SNAP, mit({ modus: "quote", mindestQuote: 6, mindestensOffen: 1 }));
    expect(alle.filter((o) => o.gesperrt).map((o) => o.id).sort())
      .toEqual(["Irvine", "Kane", "Musiala"]);
  });

  it("jede gesperrte Option traegt einen Grund -- das war die Ansage", () => {
    for (const modus of SPERRE_MODI) {
      const alle = schuetzenSperre(SNAP, mit({ modus, schuetzen: 2, mindestQuote: 3, mindestensOffen: 1 }));
      for (const o of alle.filter((x) => x.gesperrt)) {
        expect(typeof o.grund, `${modus}/${o.id}`).toBe("string");
        expect(o.grund.length, `${modus}/${o.id}`).toBeGreaterThan(8);
      }
    }
  });

  it("`mindestensOffen` ist die Sicherung -- ein Tipp bleibt immer moeglich", () => {
    // Streng eingestellt wuerde die Sperre hier ALLE sechs Namen treffen.
    const alle = schuetzenSperre(SNAP, mit({ modus: "quote", mindestQuote: 15, mindestensOffen: 4 }));
    expect(alle.filter((o) => !o.gesperrt)).toHaveLength(4);
    expect(alle.filter((o) => o.gesperrt).map((o) => o.id)).toEqual(["Kane", "Musiala"]);
  });

  it("laesst im Rang-Modus nie mehr sperren, als der Spielraum hergibt", () => {
    const alle = schuetzenSperre(SNAP, mit({ modus: "rang", schuetzen: 6, mindestensOffen: 5 }));
    expect(alle.filter((o) => o.gesperrt)).toHaveLength(1);
  });

  it("uebergeht Namen ohne brauchbare Quote, statt sie zu sperren", () => {
    // \u26a0\ufe0f `Ohne` hat keine Quote und zaehlt deshalb NICHT als offene
    // Auswahl -- sonst waere die Sicherung `mindestensOffen` mit leeren
    // Eintraegen zu fuellen und der Spieler stuende vor lauter Namen ohne Preis.
    const kaputt = {
      players: {
        home: { Ohne: {}, Kane: { anytime: 1.6 } },
        away: { Saad: { anytime: 6.5 }, Smith: { anytime: 11.0 } },
      },
    };
    const alle = schuetzenSperre(kaputt, mit({ modus: "rang", schuetzen: 1, mindestensOffen: 2 }));
    expect(alle.find((o) => o.id === "Ohne").gesperrt).toBe(false);
    expect(alle.find((o) => o.id === "Kane").gesperrt).toBe(true);
  });
});

describe("Ergebnisse", () => {
  it("sperrt den wahrscheinlichsten Endstand -- 3:1, nicht 0:2", () => {
    const alle = ergebnisSperre(SNAP, mit({ modus: "rang", ergebnisse: 1, mindestensOffen: 1 }));
    expect(alle.filter((o) => o.gesperrt).map((o) => o.id)).toEqual(["3:1"]);
  });

  it("die Id ist `heim:auswaerts` -- die Schreibweise der Oberflaeche", () => {
    const alle = ergebnisSperre(SNAP, {});
    expect(alle).toHaveLength(12);
    expect(alle.map((o) => o.id)).toContain("2:0");
    expect(alle.find((o) => o.id === "2:0")).toMatchObject({ home: 2, away: 0, quote: 11 });
  });

  it("kommt mit einem fehlenden Raster zurecht", () => {
    expect(ergebnisSperre({}, mit({ ergebnisse: 2 }))).toEqual([]);
  });
});

describe("Nachschlagen fuer die Oberflaeche", () => {
  it("beantwortet die Frage nach EINEM Namen genauso wie die Liste", () => {
    const rules = mit({ modus: "rang", schuetzen: 1, mindestensOffen: 1 });
    expect(istSchuetzeGesperrt(SNAP, rules, "Kane").gesperrt).toBe(true);
    expect(istSchuetzeGesperrt(SNAP, rules, "Smith").gesperrt).toBe(false);
    // Ein Name, den es gar nicht gibt, ist nicht gesperrt -- kein Absturz.
    expect(istSchuetzeGesperrt(SNAP, rules, "Gibtsnicht")).toEqual({ gesperrt: false, grund: null });
  });

  it("beantwortet die Frage nach EINEM Endstand", () => {
    const rules = mit({ modus: "rang", ergebnisse: 1, mindestensOffen: 1 });
    expect(istErgebnisGesperrt(SNAP, rules, 3, 1).gesperrt).toBe(true);
    expect(istErgebnisGesperrt(SNAP, rules, 0, 2).gesperrt).toBe(false);
    expect(istErgebnisGesperrt(SNAP, rules, 8, 8)).toEqual({ gesperrt: false, grund: null });
  });

  it("sagt dem Admin in einem Satz, was an DIESEM Spiel passiert", () => {
    expect(beschreibeSperre(SNAP, {})).toMatch(/wählbar/);
    const satz = beschreibeSperre(SNAP, mit({ modus: "rang", schuetzen: 1, ergebnisse: 1, mindestensOffen: 1 }));
    expect(satz).toContain("Kane");
    expect(satz).toContain("3:1");
  });

  it("sagt es auch, wenn die Sperre AN ist und trotzdem nichts trifft", () => {
    // Der Fall, den man sonst fuer einen Fehler haelt: eingeschaltet, aber die
    // Sicherung `mindestensOffen` laesst keinen Spielraum.
    const satz = beschreibeSperre(SNAP, mit({ modus: "rang", schuetzen: 2, ergebnisse: 0, mindestensOffen: 6 }));
    expect(satz).toMatch(/greift die Sperre nicht/);
  });
});
