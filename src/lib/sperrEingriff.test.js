import { describe, it, expect } from "vitest";
import { sperrenFuer, beschreibeEingriff } from "./sperrEingriff";

// „kein Eingriff" ist `null` und kein eigener Export — von außen prüft man auf
// falsy, und ein zweiter Name dafür wäre toter Code.
const KEIN_EINGRIFF = null;
import { schuetzenSperre, ergebnisSperre } from "./favoritenSperre";
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
    const v = [V("a", { schuetzen: 1, ergebnisse: 0 })];
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
    const v = [V("a", { schuetzen: 1, ergebnisse: 1 }), V("a", { schuetzen: 2, ergebnisse: 0 })];
    expect(sperrenFuer(v, { userId: "a", matchday: 5 })).toMatchObject({ schuetzen: 3, ergebnisse: 1 });
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
    const eingriff = { schuetzen: 2, ergebnisse: 1 };
    const ohne = schuetzenSperre(SNAP, {});
    expect(ohne.filter((o) => o.gesperrt)).toHaveLength(0);
    const mit = schuetzenSperre(SNAP, {}, eingriff);
    expect(mit.filter((o) => o.gesperrt).map((o) => o.id)).toEqual(["Kane", "Musiala"]);
    expect(ergebnisSperre(SNAP, {}, eingriff).filter((o) => o.gesperrt).map((o) => o.id))
      .toEqual(["3:1"]);
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
    expect(schuetzenSperre(SNAP, rules, { schuetzen: 0, ergebnisse: 0 }))
      .toEqual(schuetzenSperre(SNAP, rules));
  });
});

describe("die Kette von der Wirkung bis zur Auswahl", () => {
  it("`wendeAn` liefert genau die Form, die `sperrenFuer` liest", () => {
    // ⚠️ Ohne diesen Test koennten beide Seiten fuer sich richtig sein und
    // trotzdem nicht zusammenpassen -- genau die 17 Funde vom 05.08.2026.
    const vorgaenge = wendeAn({ wirkung: { typ: "sperre", was: "favoriten", n: 2 }, betroffene: ["a"] })
      .map((v) => ({ ...v, matchday: 5 }));
    expect(sperrenFuer(vorgaenge, { userId: "a", matchday: 5 }))
      .toMatchObject({ schuetzen: 2, ergebnisse: 2 });
  });

  it("`was` trennt Torschuetzen und Ergebnisse sauber", () => {
    const nur = (was) => sperrenFuer(
      wendeAn({ wirkung: { typ: "sperre", was, n: 1 }, betroffene: ["a"] }).map((v) => ({ ...v, matchday: 1 })),
      { userId: "a", matchday: 1 });
    expect(nur("schuetzen")).toMatchObject({ schuetzen: 1, ergebnisse: 0 });
    expect(nur("ergebnisse")).toMatchObject({ schuetzen: 0, ergebnisse: 1 });
    expect(nur("favoriten")).toMatchObject({ schuetzen: 1, ergebnisse: 1 });
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
    const t = beschreibeEingriff({ schuetzen: 1, ergebnisse: 2, gruende: ["Pechsträhne"] });
    expect(t).toContain("1 Torschütze");
    expect(t).toContain("2 Ergebnisse");
    expect(t).toContain("Pechsträhne");
  });

  it("ohne Eingriff steht da nichts", () => {
    expect(beschreibeEingriff(null)).toBe("");
  });
});
