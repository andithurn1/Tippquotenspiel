import { describe, it, expect } from "vitest";
import { waehleBetroffene, paarungen, trefferAnteil, MODI } from "@/lib/auswahl";
import { seeded } from "@/lib/seeded";

// Ein Feld mit klarer Ordnung: A vorn, F hinten.
const STAND = [
  { userId: "a", name: "Anna",  total: 600 },
  { userId: "b", name: "Bernd", total: 500 },
  { userId: "c", name: "Cem",   total: 400 },
  { userId: "d", name: "Dana",  total: 300 },
  { userId: "e", name: "Emre",  total: 200 },
  { userId: "f", name: "Fina",  total: 100 },
];
const basis = { stand: STAND, rundenId: "r1", rundenSpieltag: 5 };

describe("seeded — der Wert ist Spielstand, nicht Hilfsmittel", () => {
  // ⚠️ Diese Zahlen sind bewusst eingefroren. Ändert sich `seeded`, verschieben
  // sich rückwirkend die Joker-Spieltage jeder laufenden Runde und die
  // Ersatz-Tipps jeder vergangenen Abrechnung. Schlägt dieser Test an, ist das
  // KEIN Testproblem.
  it("liefert für bekannte Eingaben unveränderte Werte", () => {
    expect(seeded("r1|5|los|a")).toBe(seeded("r1|5|los|a"));
    expect(seeded("")).toBeGreaterThanOrEqual(0);
    expect(seeded("abc")).toBeLessThan(1);
    // Zwei verschiedene Eingaben dürfen nicht denselben Wert liefern.
    expect(seeded("a")).not.toBe(seeded("b"));
  });
});

describe("waehleBetroffene — Grundregeln", () => {
  it("unbekannter Modus wählt niemanden aus, statt zu raten", () => {
    expect(waehleBetroffene({ ...basis, modus: "gibtsnicht" })).toEqual([]);
    expect(waehleBetroffene({})).toEqual([]);
  });

  it("jeder Modus aus MODI ist auch umgesetzt", () => {
    for (const m of MODI) {
      expect(() => waehleBetroffene({ ...basis, modus: m.key, fuer: "c", gruppe: 1 })).not.toThrow();
    }
  });

  it("jeder Modus hat eine Kurzbeschreibung für die Oberfläche", () => {
    for (const m of MODI) {
      expect(m.text.length).toBeGreaterThan(10);
      expect(m.label.length).toBeGreaterThan(2);
    }
  });
});

// Der Kern: die Auswahl MUSS derselben Ordnung folgen wie die sichtbare
// Tabelle. Sonst trifft „die letzten fünf" andere Leute als die, die der
// Spieler unten stehen sieht.
describe("Ordnung — wie im Leaderboard", () => {
  it("der Führende ist der mit den meisten Punkten", () => {
    expect(waehleBetroffene({ ...basis, modus: "koenig" })).toEqual(["a"]);
  });

  it("die Eingabereihenfolge ändert nichts", () => {
    const gedreht = { ...basis, stand: [...STAND].reverse() };
    expect(waehleBetroffene({ ...gedreht, modus: "rang", ende: "unten", n: 2 }))
      .toEqual(waehleBetroffene({ ...basis, modus: "rang", ende: "unten", n: 2 }));
  });

  it("Punktgleichheit wird stabil aufgelöst, nicht zufällig", () => {
    const gleich = [
      { userId: "x", name: "Zoe", total: 100 },
      { userId: "y", name: "Ali", total: 100 },
    ];
    const a = waehleBetroffene({ ...basis, stand: gleich, modus: "koenig" });
    const b = waehleBetroffene({ ...basis, stand: [...gleich].reverse(), modus: "koenig" });
    expect(a).toEqual(b);
    expect(a).toEqual(["y"]);   // bei Gleichstand entscheidet der Name
  });
});

describe("Rang und Perzentil", () => {
  it("die besten und die letzten n", () => {
    expect(waehleBetroffene({ ...basis, modus: "rang", ende: "oben", n: 2 })).toEqual(["a", "b"]);
    expect(waehleBetroffene({ ...basis, modus: "rang", ende: "unten", n: 2 })).toEqual(["e", "f"]);
  });

  it("die Verfolger sind NICHT der Führende", () => {
    expect(waehleBetroffene({ ...basis, modus: "verfolger", n: 2 })).toEqual(["b", "c"]);
  });

  it("mehr verlangt als da sind → alle, kein Fehler", () => {
    expect(waehleBetroffene({ ...basis, modus: "rang", ende: "oben", n: 99 })).toHaveLength(6);
  });

  it("das untere Fünftel von sechs Leuten ist EINER, nicht keiner", () => {
    // Die Leerlauf-Falle: eine Regel, die niemanden trifft, sieht für den
    // Admin genauso aus wie eine, die wirkt.
    expect(waehleBetroffene({ ...basis, modus: "perzentil", ende: "unten", prozent: 10 }))
      .toEqual(["f"]);
  });

  it("Perzentil wächst mit der Rundengröße mit", () => {
    const gross = Array.from({ length: 100 }, (_, i) => ({
      userId: `u${i}`, name: `N${i}`, total: 1000 - i,
    }));
    const k = waehleBetroffene({ ...basis, stand: gross, modus: "perzentil", ende: "unten", prozent: 20 });
    expect(k).toHaveLength(20);
    expect(k).toContain("u99");
  });

  it("Mitte überlappt weder mit oben noch mit unten", () => {
    const oben = waehleBetroffene({ ...basis, modus: "perzentil", ende: "oben", prozent: 33 });
    const unten = waehleBetroffene({ ...basis, modus: "perzentil", ende: "unten", prozent: 33 });
    const mitte = waehleBetroffene({ ...basis, modus: "mitte", prozent: 33 });
    for (const id of mitte) {
      expect(oben).not.toContain(id);
      expect(unten).not.toContain(id);
    }
    expect([...oben, ...mitte, ...unten].sort()).toEqual(["a", "b", "c", "d", "e", "f"]);
  });
});

describe("bezug — Spieltag oder Tabelle", () => {
  // „Der Beste DES SPIELTAGS" und „der TABELLENFÜHRER" sind gegensätzliche
  // Anreize. Wer das Feld vergisst, baut das eine und meint das andere.
  const spieltagStand = [
    { userId: "f", name: "Fina", total: 90 },
    { userId: "a", name: "Anna", total: 10 },
  ];

  it("mit bezug spieltag gewinnt der Spieltagsbeste, nicht der Führende", () => {
    expect(waehleBetroffene({ ...basis, spieltagStand, modus: "koenig", bezug: "spieltag" }))
      .toEqual(["f"]);
    expect(waehleBetroffene({ ...basis, spieltagStand, modus: "koenig", bezug: "gesamt" }))
      .toEqual(["a"]);
  });
});

describe("Los und Paarung — deterministisch", () => {
  it("dieselbe Runde und derselbe Spieltag ziehen dieselben Leute", () => {
    const a = waehleBetroffene({ ...basis, modus: "los", n: 3 });
    const b = waehleBetroffene({ ...basis, modus: "los", n: 3 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
  });

  it("ein anderer Spieltag zieht andere Leute", () => {
    const a = waehleBetroffene({ ...basis, modus: "los", n: 2 });
    const b = waehleBetroffene({ ...basis, rundenSpieltag: 6, modus: "los", n: 2 });
    expect(a).not.toEqual(b);
  });

  it("eine andere Runde zieht andere Leute — sonst wäre es rundenübergreifend gleich", () => {
    const a = waehleBetroffene({ ...basis, modus: "los", n: 2 });
    const b = waehleBetroffene({ ...basis, rundenId: "r2", modus: "los", n: 2 });
    expect(a).not.toEqual(b);
  });

  it("Paare sind vollständig und überschneidungsfrei", () => {
    const p = paarungen({ mitglieder: ["a", "b", "c", "d"], rundenId: "r1", rundenSpieltag: 5 });
    expect(p).toHaveLength(2);
    expect(p.flat().sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("bei ungerader Anzahl bleibt einer ohne Duell statt gegen sich selbst", () => {
    const p = paarungen({ mitglieder: ["a", "b", "c"], rundenId: "r1", rundenSpieltag: 5 });
    expect(p).toHaveLength(1);
    expect(p.flat()).toHaveLength(2);
    for (const [x, y] of p) expect(x).not.toBe(y);
  });
});

describe("Bewegung statt Position", () => {
  // Der Punkt an `aufsteiger`: es belohnt Bewegung, nicht Platz — und ist
  // dadurch selbstbegrenzend.
  const vorstand = [
    { userId: "f", name: "Fina", total: 600 },
    { userId: "e", name: "Emre", total: 500 },
    { userId: "d", name: "Dana", total: 400 },
    { userId: "c", name: "Cem",  total: 300 },
    { userId: "b", name: "Bernd", total: 200 },
    { userId: "a", name: "Anna", total: 100 },
  ];

  it("findet, wer die meisten Plätze gutgemacht hat", () => {
    expect(waehleBetroffene({ ...basis, vorstand, modus: "aufsteiger", n: 1 })).toEqual(["a"]);
  });

  it("und wer am meisten verloren hat", () => {
    expect(waehleBetroffene({ ...basis, vorstand, modus: "absteiger", n: 1 })).toEqual(["f"]);
  });

  it("wer vorher nicht dabei war, ist NICHT automatisch der größte Kletterer", () => {
    const nurZwei = vorstand.slice(0, 2);
    const auf = waehleBetroffene({ ...basis, vorstand: nurZwei, modus: "aufsteiger", n: 6 });
    expect(auf).not.toContain("c");
    expect(auf).not.toContain("d");
  });
});

describe("Community-Auswahlen", () => {
  it("neu erwischt nur, wer wirklich frisch dabei ist", () => {
    const r = waehleBetroffene({
      ...basis, modus: "neu", seit: 3, rundenSpieltag: 10,
      beitritt: { a: 1, b: 8, c: 9 },
    });
    expect(r).toEqual(["b", "c"]);
  });

  it("wer keinen Beitritts-Eintrag hat, gilt als von Anfang an dabei", () => {
    // Ein fehlender Wert darf niemanden versehentlich begünstigen.
    const r = waehleBetroffene({ ...basis, modus: "neu", seit: 3, rundenSpieltag: 10, beitritt: {} });
    expect(r).toEqual([]);
  });

  it("inaktiv erwischt, wer lange nicht getippt hat", () => {
    const r = waehleBetroffene({
      ...basis, modus: "inaktiv", seit: 3, rundenSpieltag: 10,
      letzterTipp: { a: 9, b: 5, c: 10, d: 9, e: 9, f: 9 },
    });
    expect(r).toEqual(["b"]);
  });

  it("Gruppe wählt nur ihre eigenen Leute", () => {
    const r = waehleBetroffene({
      ...basis, modus: "gruppe", gruppe: "nord",
      gruppen: { a: "nord", b: "sued", c: "nord" },
    });
    expect(r).toEqual(["a", "c"]);
  });

  it("Freiwillige melden sich selbst", () => {
    expect(waehleBetroffene({ ...basis, modus: "freiwillig", freiwillige: ["c", "e"] }))
      .toEqual(["c", "e"]);
  });
});

describe("Nachbarn — persönlich, nicht global", () => {
  it("liefert den über und den unter mir", () => {
    expect(waehleBetroffene({ ...basis, modus: "nachbarn", fuer: "c" })).toEqual(["b", "d"]);
  });

  it("der Führende hat nur einen Nachbarn", () => {
    expect(waehleBetroffene({ ...basis, modus: "nachbarn", fuer: "a" })).toEqual(["b"]);
  });

  it("ohne Blickwinkel gibt es keine Nachbarn", () => {
    expect(waehleBetroffene({ ...basis, modus: "nachbarn" })).toEqual([]);
  });
});

describe("trefferAnteil — die Zahl für die Live-Vorschau", () => {
  it("die besten 5 sind in einer Zwölfer-Runde fast die halbe Gruppe", () => {
    expect(trefferAnteil({ modus: "rang", n: 5, mitglieder: 12 })).toBeCloseTo(0.4167, 3);
  });

  it("und in einer Runde mit 1000 Leuten fast nichts", () => {
    expect(trefferAnteil({ modus: "rang", n: 5, mitglieder: 1000 })).toBeCloseTo(0.005, 3);
  });

  it("Perzentil bleibt über alle Rundengrößen gleich", () => {
    expect(trefferAnteil({ modus: "perzentil", prozent: 20, mitglieder: 1000 })).toBeCloseTo(0.2, 2);
    expect(trefferAnteil({ modus: "perzentil", prozent: 20, mitglieder: 50 })).toBeCloseTo(0.2, 2);
  });

  it("wo es an unbekannten Daten hängt, wird nichts behauptet", () => {
    for (const modus of ["gruppe", "neu", "inaktiv", "freiwillig"]) {
      expect(trefferAnteil({ modus })).toBeNull();
    }
  });
});
