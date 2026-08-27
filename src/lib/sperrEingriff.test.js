import { describe, it, expect } from "vitest";
import { sperrenFuer, beschreibeEingriff, freischaltStand } from "./sperrEingriff";

// „kein Eingriff" ist `null` und kein eigener Export — von außen prüft man auf
// falsy, und ein zweiter Name dafür wäre toter Code.
const KEIN_EINGRIFF = null;
import { schuetzenSperre } from "./favoritenSperre";
import { wendeAn } from "./wirkung";

const V = (userId, sperre, matchday = 5, ereignisText = null) =>
  ({ userId, joker: 0, punkte: 0, faktor: 1, sperre, matchday, ereignisText });

describe("sperrenFuer", () => {
  it("ohne Vorgaenge gibt es keinen Eingriff", () => {
    expect(sperrenFuer([], { userId: "a", matchday: 5 })).toBe(KEIN_EINGRIFF);
    expect(sperrenFuer(null, { userId: "a" })).toBe(KEIN_EINGRIFF);
    expect(sperrenFuer([V("a", { schuetzen: 1 })], {})).toBe(KEIN_EINGRIFF);
  });

  it("trifft nur den gemeinten Spieler", () => {
    const v = [V("a", { schuetzen: 1 })];
    expect(sperrenFuer(v, { userId: "a", matchday: 5 })).toMatchObject({ schuetzen: 1 });
    expect(sperrenFuer(v, { userId: "b", matchday: 5 })).toBe(KEIN_EINGRIFF);
  });

  it("trifft nur den gemeinten Spieltag -- nie rueckwirkend einen anderen", () => {
    const v = [V("a", { schuetzen: 1 }, 5)];
    expect(sperrenFuer(v, { userId: "a", matchday: 5 })).toMatchObject({ schuetzen: 1 });
    expect(sperrenFuer(v, { userId: "a", matchday: 6 })).toBe(KEIN_EINGRIFF);
    expect(sperrenFuer(v, { userId: "a", matchday: 4 })).toBe(KEIN_EINGRIFF);
  });

  it("ein Vorgang ohne Spieltag gilt ueberall -- keine stumme Sperre", () => {
    const v = [V("a", { schuetzen: 1 }, null)];
    expect(sperrenFuer(v, { userId: "a", matchday: 9 })).toMatchObject({ schuetzen: 1 });
  });

  it("mehrere Ereignisse am selben Spieltag addieren sich", () => {
    const v = [V("a", { schuetzen: 1 }), V("a", { schuetzen: 2 })];
    expect(sperrenFuer(v, { userId: "a", matchday: 5 })).toMatchObject({ schuetzen: 3 });
  });

  it("sammelt die Anlaesse, ohne sie zu doppeln", () => {
    const v = [V("a", { schuetzen: 1 }, 5, "Pechsträhne"), V("a", { schuetzen: 1 }, 5, "Pechsträhne")];
    expect(sperrenFuer(v, { userId: "a", matchday: 5 }).gruende).toEqual(["Pechsträhne"]);
  });

  it("uebergeht Vorgaenge ohne Sperre -- Joker und Punkte gehen andere Wege", () => {
    const v = [{ userId: "a", joker: 2, punkte: 0, faktor: 1, sperre: null, matchday: 5 }];
    expect(sperrenFuer(v, { userId: "a", matchday: 5 })).toBe(KEIN_EINGRIFF);
  });
});

// 🔴 Die eigentliche Probe: der Eingriff muss in der AUSWAHL ankommen. Ein
// Wert, den niemand fragt, ist der Fund vom 06.08.2026 -- sechsmal an einem Tag.
describe("der Eingriff kommt in der Auswahl an", () => {
  const SNAP = {
    players: {
      home: { Kane: { anytime: 1.6 }, Musiala: { anytime: 2.4 }, Kimmich: { anytime: 7.0 } },
      away: { Irvine: { anytime: 5.5 }, Saad: { anytime: 6.5 }, Smith: { anytime: 11.0 } },
    },
    correctScore: [[26, 34, 60], [15, 18, 40], [11, 12, 30], [9, 7.0, 25]],
  };

  it("verschaerft eine Runde OHNE eigene Sperre", () => {
    const ohne = schuetzenSperre(SNAP, {});
    expect(ohne.filter((o) => o.gesperrt)).toHaveLength(0);
    const mit = schuetzenSperre(SNAP, {}, { schuetzen: 2 });
    expect(mit.filter((o) => o.gesperrt).map((o) => o.id)).toEqual(["Kane", "Musiala"]);
  });

  it("legt auf eine bestehende Runden-Sperre NACH, statt sie zu ersetzen", () => {
    const rules = { sperre: { enabled: true, modus: "rang", schuetzen: 1, mindestensOffen: 1 } };
    const nur = schuetzenSperre(SNAP, rules).filter((o) => o.gesperrt).map((o) => o.id);
    expect(nur).toEqual(["Kane"]);
    const mit = schuetzenSperre(SNAP, rules, { schuetzen: 1 }).filter((o) => o.gesperrt);
    expect(mit.map((o) => o.id)).toEqual(["Kane", "Musiala"]);
    // Und die beiden Gründe sind UNTERSCHIEDLICH -- der Spieler soll sehen,
    // dass das zweite nicht für alle gilt.
    expect(mit[0].grund).not.toBe(mit[1].grund);
    expect(mit[1].grund).toMatch(/für dich/);
  });

  it("verschaerft auch eine Runde im Quoten-Modus -- zwei Bauarten nebeneinander", () => {
    const rules = { sperre: { enabled: true, modus: "quote", mindestQuote: 2, mindestensOffen: 1 } };
    const nur = schuetzenSperre(SNAP, rules).filter((o) => o.gesperrt).map((o) => o.id);
    expect(nur).toEqual(["Kane"]);
    const mit = schuetzenSperre(SNAP, rules, { schuetzen: 1 }).filter((o) => o.gesperrt).map((o) => o.id);
    expect(mit).toEqual(["Kane", "Musiala"]);
  });

  it("nimmt nie den letzten Ausweg -- `mindestensOffen` gilt fuer BEIDE zusammen", () => {
    // 🔴 Das Bedenken, nach dem Andi gefragt hat: zwei Mechaniken, die einzeln
    // harmlos sind, raeumen zusammen die Auswahl leer.
    const rules = { sperre: { enabled: true, modus: "rang", schuetzen: 2, mindestensOffen: 4 } };
    const mit = schuetzenSperre(SNAP, rules, { schuetzen: 4 });
    expect(mit.filter((o) => !o.gesperrt).length).toBeGreaterThanOrEqual(4);
  });

  it("ein Eingriff mit 0 aendert gar nichts", () => {
    const rules = { sperre: { enabled: true, modus: "rang", schuetzen: 1, mindestensOffen: 1 } };
    expect(schuetzenSperre(SNAP, rules, { schuetzen: 0 })).toEqual(schuetzenSperre(SNAP, rules));
  });
});

describe("die Kette von der Wirkung bis zur Auswahl", () => {
  it("`wendeAn` liefert genau die Form, die `sperrenFuer` liest", () => {
    // ⚠️ Ohne diesen Test koennten beide Seiten fuer sich richtig sein und
    // trotzdem nicht zusammenpassen -- genau die 17 Funde vom 05.08.2026.
    const vorgaenge = wendeAn({ wirkung: { typ: "sperre", n: 2 }, betroffene: ["a"] })
      .map((v) => ({ ...v, matchday: 5 }));
    expect(sperrenFuer(vorgaenge, { userId: "a", matchday: 5 })).toMatchObject({ schuetzen: 2 });
  });

  it("die Wirkung trifft ausschliesslich Torschuetzen", () => {
    // ⛔ Ein `was`-Katalog gab es bis zum 26.08.2026. Er ist weg: Endstaende
    // werden nicht mehr gesperrt, und ein Katalog mit einem Eintrag ist keiner.
    const v = wendeAn({ wirkung: { typ: "sperre", n: 1 }, betroffene: ["a"] })
      .map((x) => ({ ...x, matchday: 1 }));
    expect(v[0].sperre).toEqual({ schuetzen: 1 });
    expect(sperrenFuer(v, { userId: "a", matchday: 1 })).toMatchObject({ schuetzen: 1 });
  });

  it("der Vorgang bleibt in Punkten, Jokern und Faktor neutral", () => {
    // 🔴 Die Zusage, mit der diese Mechanik an Balancing vorbeikommt: sie
    // verschiebt die Auswahl, nicht die Punkte.
    for (const v of wendeAn({ wirkung: { typ: "sperre" }, betroffene: ["a", "b"] })) {
      expect(v.joker).toBe(0);
      expect(v.punkte).toBe(0);
      expect(v.faktor).toBe(1);
    }
  });
});

describe("beschreibeEingriff", () => {
  it("nennt Zahl UND Anlass", () => {
    const t = beschreibeEingriff({ schuetzen: 2, gruende: ["Pechsträhne"] });
    expect(t).toContain("2 Torschützen");
    expect(t).toContain("Pechsträhne");
  });

  it("ohne Eingriff steht da nichts", () => {
    expect(beschreibeEingriff(null)).toBe("");
  });
});

// ============================================================
//  Der Joker dazu: die Freischaltung
//
//  🔴 Andi, 26.08.2026: „... und als Joker". Gebaut ist die Richtung, die
//  immer aufgeht: sie erweitert die EIGENE Auswahl vor dem EIGENEN Tipp.
//  Die andere Richtung (ich lege DIR eine Sperre auf) steht als offene Frage
//  in `design/ideen.md` -- sie kann einen abgegebenen Tipp nachtraeglich
//  ungueltig machen.
// ============================================================
describe("Freischaltung", () => {
  const T = (userId, matchId, matchday, frei) => ({ userId, matchId, matchday, tip: { frei } });

  it("ohne Kontingent gibt es sie nicht", () => {
    expect(freischaltStand([], {}, { userId: "a", spieltag: 5 }))
      .toMatchObject({ erlaubt: 0, frei: 0 });
  });

  it("zaehlt nur die eigenen, nur diesen Spieltag, nur die benutzten", () => {
    const tipps = [
      T("a", "m1", 5, true),
      T("a", "m2", 5, false),   // getippt, aber nicht freigeschaltet
      T("a", "m3", 6, true),    // anderer Spieltag
      T("b", "m4", 5, true),    // anderer Spieler
    ];
    const stand = freischaltStand(tipps, { freischaltungen: 2 }, { userId: "a", spieltag: 5 });
    expect(stand).toMatchObject({ erlaubt: 2, vergeben: 1, frei: 1 });
    expect(stand.spiele).toEqual(["m1"]);
  });

  it("geht nie ins Minus", () => {
    const tipps = [T("a", "m1", 5, true), T("a", "m2", 5, true)];
    expect(freischaltStand(tipps, { freischaltungen: 1 }, { userId: "a", spieltag: 5 }).frei).toBe(0);
  });

  it("hebt in der Auswahl BEIDES auf -- die Sperre der Runde UND die des Ereignisses", () => {
    const SNAP = {
      players: { home: { Kane: { anytime: 1.6 }, Musiala: { anytime: 2.4 } }, away: { Saad: { anytime: 6.5 } } },
      correctScore: [[26, 34], [15, 18]],
    };
    const rules = { sperre: { enabled: true, modus: "rang", schuetzen: 1, mindestensOffen: 1 } };
    // Runde sperrt einen, das Ereignis noch einen.
    expect(schuetzenSperre(SNAP, rules, { schuetzen: 1 }).filter((o) => o.gesperrt)).toHaveLength(2);
    // Mit Freischaltung ist nichts mehr zu.
    expect(schuetzenSperre(SNAP, rules, { schuetzen: 1, frei: true }).filter((o) => o.gesperrt)).toHaveLength(0);
  });
});
