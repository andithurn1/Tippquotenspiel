import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPERRE, SPERRE_MODI, sanitizeSperre,
  schuetzenSperre, istSchuetzeGesperrt, beschreibeSperre, schuetzenMalus,
} from "./favoritenSperre";

// ============================================================
//  Was hier geprueft wird -- und was ausdruecklich NICHT.
//
//  Geprueft wird, ob die Sperre die RICHTIGEN Optionen trifft: die
//  wahrscheinlichsten, nie die Aussenseiter. Dieser Fehler waere in der
//  Oberflaeche unsichtbar, weil gesperrt eben gesperrt aussieht -- man saehe
//  erst nach Wochen, dass ausgerechnet die 30er-Quoten fehlen.
//
//  ⛔ NUR TORSCHUETZEN. Die Endstand-Sperre ist am 26.08.2026 auf Andis Ansage
//  zurueckgebaut worden -- die Naehe-Belohnung haette ein gesperrtes 2:1 ueber
//  ein getipptes 2:0 doch bezahlt. `SNAP.correctScore` steht hier trotzdem
//  noch: `startErgebnis` liest es, und der Schnappschuss soll echt bleiben.
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
    expect(sanitizeSperre({ mindestQuote: 999 }).mindestQuote).toBe(15);
    expect(sanitizeSperre({ mindestensOffen: 0 }).mindestensOffen).toBe(1);
    expect(sanitizeSperre({ schuetzen: "kaputt" }).schuetzen).toBe(DEFAULT_SPERRE.schuetzen);
  });

  it("laesst sich nicht einschalten, wenn sie nichts tut", () => {
    // Dieselbe Sperrklinke wie bei `sanitizeWettbewerbe`: ein aktiver Schalter
    // ohne Wirkung ist eine Einstellung, die luegt.
    expect(sanitizeSperre({ enabled: true, modus: "rang", schuetzen: 0 }).enabled).toBe(false);
    expect(sanitizeSperre({ enabled: true, modus: "quote", mindestQuote: 1 }).enabled).toBe(false);
    expect(sanitizeSperre({ enabled: true, modus: "rang", schuetzen: 1 }).enabled).toBe(true);
    expect(sanitizeSperre({ enabled: true, modus: "quote", mindestQuote: 2 }).enabled).toBe(true);
  });
});

describe("Torschuetzen", () => {
  it("laesst ohne Einstellung jeden Namen wählbar -- und traegt dann keinen Grund", () => {
    const alle = schuetzenSperre(SNAP, {});
    expect(alle).toHaveLength(6);
    expect(alle.every((o) => o.gesperrt === false && o.malus === 0 && o.grund === null)).toBe(true);
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

describe("Nachschlagen fuer die Oberflaeche", () => {
  it("beantwortet die Frage nach EINEM Namen genauso wie die Liste", () => {
    const rules = mit({ modus: "rang", schuetzen: 1, mindestensOffen: 1 });
    expect(istSchuetzeGesperrt(SNAP, rules, "Kane").gesperrt).toBe(true);
    expect(istSchuetzeGesperrt(SNAP, rules, "Smith").gesperrt).toBe(false);
    // Ein Name, den es gar nicht gibt, ist nicht gesperrt -- kein Absturz.
    expect(istSchuetzeGesperrt(SNAP, rules, "Gibtsnicht")).toEqual({ gesperrt: false, malus: 0, grund: null });
  });

  it("sagt dem Admin in einem Satz, was an DIESEM Spiel passiert", () => {
    expect(beschreibeSperre(SNAP, {})).toMatch(/wählbar/);
    const satz = beschreibeSperre(SNAP, mit({ modus: "rang", schuetzen: 1, mindestensOffen: 1 }));
    expect(satz).toContain("Kane");
  });

  it("sagt es auch, wenn die Sperre AN ist und trotzdem nichts trifft", () => {
    // Der Fall, den man sonst fuer einen Fehler haelt: eingeschaltet, aber die
    // Sicherung `mindestensOffen` laesst keinen Spielraum.
    const satz = beschreibeSperre(SNAP, mit({ modus: "rang", schuetzen: 2, mindestensOffen: 6 }));
    expect(satz).toMatch(/greift die Regel nicht/);
  });
});

// ============================================================
//  ABWERTEN STATT SPERREN — dieselbe Auswahl, weiche Konsequenz
//
//  🔴 Andi, 26.08.2026: „wir haben ja auch nen mechanismus, der einfach die
//  Topwahrscheinlichen Torschuetzen quoten biischen abwertet (ist ja egtl ne
//  aehnliche einstellung ienfach mit nem Malus sobald schwellenwerte)".
//
//  ⚠️ Den Mechanismus gab es NICHT -- der naechste Verwandte (`kombiBonus.js`)
//  wertet SELTENE Schuetzen AUF. Gebaut ist er jetzt, als zweite Konsequenz
//  DERSELBEN Auswahl: eine eigene Schwelle waere eine zweite Antwort auf „wer
//  ist hier der Favorit".
// ============================================================
describe("Abwerten statt Sperren", () => {
  const abwerten = (teil) => ({
    sperre: { enabled: true, wirkung: "abwerten", modus: "rang", malusProzent: 30, ...teil },
  });

  it("trifft GENAU dieselben Namen wie die Sperre", () => {
    // Der Kern der Bauart: eine Auswahl, zwei Konsequenzen.
    const hart = schuetzenSperre(SNAP, mit({ modus: "rang", schuetzen: 2, mindestensOffen: 1 }))
      .filter((o) => o.gesperrt).map((o) => o.id);
    const weich = schuetzenSperre(SNAP, abwerten({ schuetzen: 2, mindestensOffen: 1 }))
      .filter((o) => o.malus).map((o) => o.id);
    expect(weich).toEqual(hart);
  });

  it("sperrt dabei NICHTS -- der Name bleibt waehlbar", () => {
    const alle = schuetzenSperre(SNAP, abwerten({ schuetzen: 2 }));
    expect(alle.some((o) => o.gesperrt)).toBe(false);
    expect(alle.filter((o) => o.malus)).toHaveLength(2);
  });

  it("gibt den Malus als ANTEIL, nicht in Prozent", () => {
    const kane = schuetzenSperre(SNAP, abwerten({ schuetzen: 1 })).find((o) => o.id === "Kane");
    expect(kane.malus).toBeCloseTo(0.3, 10);
    expect(schuetzenMalus(SNAP, abwerten({ schuetzen: 1 }), "Kane")).toBeCloseTo(0.3, 10);
    expect(schuetzenMalus(SNAP, abwerten({ schuetzen: 1 }), "Smith")).toBe(0);
  });

  it("nennt im Grund die Zahl -- „−30 %“ statt „gesperrt“", () => {
    const kane = schuetzenSperre(SNAP, abwerten({ schuetzen: 1 })).find((o) => o.id === "Kane");
    expect(kane.grund).toContain("30");
    expect(kane.grund).not.toContain("gesperrt");
  });

  it("`mindestensOffen` gilt hier NICHT -- es wird ja nichts weggenommen", () => {
    // 🔴 Sonst stellte der Admin „alle unter 2,0 zahlen weniger" ein, und in
    // Wahrheit zahlten die ersten vier voll.
    const alle = schuetzenSperre(SNAP, abwerten({ modus: "quote", mindestQuote: 15, mindestensOffen: 5 }));
    expect(alle.filter((o) => o.malus)).toHaveLength(6);
  });

  it("`schuetzenMalus` gibt 0, solange die Runde SPERRT", () => {
    // Die Gegenprobe: der Malus darf nicht heimlich auch beim Sperren greifen.
    expect(schuetzenMalus(SNAP, mit({ modus: "rang", schuetzen: 1, mindestensOffen: 1 }), "Kane")).toBe(0);
  });

  it("die Freischaltung hebt AUCH den Malus auf", () => {
    const rules = abwerten({ schuetzen: 2 });
    expect(schuetzenMalus(SNAP, rules, "Kane")).toBeGreaterThan(0);
    expect(schuetzenMalus(SNAP, rules, "Kane", { frei: true })).toBe(0);
  });

  it("ein Ereignis wertet weiter ab, statt zu sperren", () => {
    const rules = abwerten({ schuetzen: 1 });
    const alle = schuetzenSperre(SNAP, rules, { schuetzen: 1 });
    const getroffen = alle.filter((o) => o.malus);
    expect(getroffen.map((o) => o.id)).toEqual(["Kane", "Musiala"]);
    expect(alle.some((o) => o.gesperrt)).toBe(false);
    // Und der zweite Grund sagt, dass er nur für mich gilt.
    expect(getroffen[1].grund).toMatch(/für dich/);
  });

  it("sagt dem Admin den Unterschied in einem Satz", () => {
    expect(beschreibeSperre(SNAP, abwerten({ schuetzen: 1 }))).toMatch(/30 % weniger/);
    expect(beschreibeSperre(SNAP, mit({ modus: "rang", schuetzen: 1, mindestensOffen: 1 })))
      .toMatch(/Gesperrt/);
  });
});
