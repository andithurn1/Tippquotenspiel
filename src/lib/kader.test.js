import { describe, it, expect } from "vitest";
import { zuordne, verschmelze, teileAuf, fortschritt, MAX_BEOBACHTUNGEN, UEBERSTEUERT } from "./kader";

const b = (home, away, spieler, kickoff = null) => ({ home, away, spieler, kickoff });

describe("zuordne — die Schnittmenge löst den Verein auf", () => {
  it("ein einzelnes Spiel lässt jeden Spieler offen", () => {
    const { zuordnung, offen } = zuordne([b("NYC", "TOR", ["Magno", "Wolf"])]);
    expect(zuordnung).toEqual({});
    expect(offen).toHaveLength(2);
    expect(offen[0].moeglich).toEqual(["NYC", "TOR"]);
  });

  // Der Kern: zwei Spiele mit VERSCHIEDENEN Gegnern genügen.
  it("zwei Spiele mit verschiedenen Gegnern lösen ihn auf", () => {
    const { zuordnung, offen } = zuordne([
      b("NYC", "TOR", ["Magno"]),
      b("NYC", "MTL", ["Magno"]),
    ]);
    expect(zuordnung).toEqual({ Magno: "NYC" });
    expect(offen).toEqual([]);
  });

  it("auch wenn der Verein einmal auswärts spielt", () => {
    const { zuordnung } = zuordne([
      b("NYC", "TOR", ["Magno"]),
      b("MTL", "NYC", ["Magno"]),
    ]);
    expect(zuordnung).toEqual({ Magno: "NYC" });
  });

  it("zweimal derselbe Gegner löst NICHT auf — die Schnittmenge bleibt zu zweit", () => {
    const { zuordnung, offen } = zuordne([
      b("NYC", "TOR", ["Magno"]),
      b("TOR", "NYC", ["Magno"]),
    ]);
    expect(zuordnung).toEqual({});
    expect(offen[0].moeglich).toEqual(["NYC", "TOR"]);
  });

  it("trennt beide Mannschaften eines Spiels korrekt auf", () => {
    const { zuordnung } = zuordne([
      b("NYC", "TOR", ["Magno", "Osorio"]),
      b("NYC", "MTL", ["Magno"]),
      b("TOR", "MTL", ["Osorio"]),
    ]);
    expect(zuordnung).toEqual({ Magno: "NYC", Osorio: "TOR" });
  });

  // Ein Wechsel mitten in der Saison leert die Schnittmenge. Bliebe der Spieler
  // dann für immer unauflösbar, wäre die Zuordnung nach jedem Transferfenster
  // löchrig — und Transfers sind der Normalfall.
  it("bei einem Vereinswechsel gewinnt die neuere Beobachtung", () => {
    const { zuordnung } = zuordne([
      b("NYC", "TOR", ["Magno"]),
      b("NYC", "MTL", ["Magno"]),   // → NYC
      b("LAG", "SEA", ["Magno"]),   // Widerspruch: jetzt bei LAG oder SEA
      b("LAG", "POR", ["Magno"]),   // → LAG
    ]);
    expect(zuordnung).toEqual({ Magno: "LAG" });
  });

  it("verträgt leere und kaputte Eingaben", () => {
    expect(zuordne([]).zuordnung).toEqual({});
    expect(zuordne([{ home: "A" }, null, b("A", "B", [null, "  ", "X"])]).offen)
      .toEqual([{ spieler: "X", moeglich: ["A", "B"] }]);
  });
});

describe("teileAuf", () => {
  const zuordnung = { Magno: "NYC", Osorio: "TOR" };

  it("verteilt die Spieler auf beide Mannschaften", () => {
    const t = teileAuf({ home: "NYC", away: "TOR", spieler: ["Magno", "Osorio"], zuordnung });
    expect(t.home).toEqual(["Magno"]);
    expect(t.away).toEqual(["Osorio"]);
    expect(t.unbekannt).toEqual([]);
  });

  // Lieber ein Spieler zu wenig als einer bei der falschen Mannschaft: der
  // Fehler fiele erst bei der Abrechnung auf, und dann hat jemand auf ihn
  // getippt.
  it("wer nicht zugeordnet ist, landet NIRGENDS", () => {
    const t = teileAuf({ home: "NYC", away: "TOR", spieler: ["Magno", "Neuer Typ"], zuordnung });
    expect(t.home).toEqual(["Magno"]);
    expect(t.away).toEqual([]);
    expect(t.unbekannt).toEqual(["Neuer Typ"]);
  });

  it("ein Spieler eines dritten Vereins zählt als unbekannt, nicht als Heimspieler", () => {
    const t = teileAuf({ home: "MTL", away: "LAG", spieler: ["Magno"], zuordnung });
    expect(t.unbekannt).toEqual(["Magno"]);
  });
});

describe("verschmelze", () => {
  it("führt alte und neue Beobachtungen zusammen", () => {
    const zus = verschmelze([b("A", "B", ["X"], "t1")], [b("A", "C", ["X"], "t2")]);
    expect(zus).toHaveLength(2);
  });

  it("zählt dieselbe Begegnung nicht doppelt", () => {
    const eins = b("A", "B", ["X"], "t1");
    expect(verschmelze([eins], [eins])).toHaveLength(1);
  });

  // Ohne Obergrenze wüchse die Datei über eine Saison ins Unbrauchbare — und
  // dass Altes hinausfällt, ist bei Transfers sogar erwünscht.
  it("begrenzt die Menge und behält die NEUESTEN", () => {
    const viele = Array.from({ length: MAX_BEOBACHTUNGEN + 50 },
      (_, i) => b("A", "B", ["X"], `t${i}`));
    const zus = verschmelze([], viele);
    expect(zus).toHaveLength(MAX_BEOBACHTUNGEN);
    expect(zus.at(-1).kickoff).toBe(`t${MAX_BEOBACHTUNGEN + 49}`);
  });
});

describe("fortschritt", () => {
  it("sagt, wie weit die Zuordnung ist", () => {
    const f = fortschritt(zuordne([b("A", "B", ["X"]), b("A", "C", ["X", "Y"])]));
    expect(f).toMatchObject({ zugeordnet: 1, offen: 1, gesamt: 2 });
    expect(f.anteil).toBeCloseTo(0.5);
  });

  it("kein Sturz bei leerer Zuordnung", () => {
    expect(fortschritt({}).anteil).toBe(0);
  });
});

// ── Das Gedächtnis ──────────────────────────────────────────
// Der Fall, der sonst erst nach Markteintritt auffliegt: ein Spieler ist zwei
// Monate verletzt, verschwindet aus den Quoten — und wäre nach dem Comeback
// wieder unbekannt. Ausgerechnet der zurückkehrende Stürmer nicht tippbar.
describe("zuordne mit Gedächtnis", () => {
  const bekannt = { Magno: "NYC" };

  it("ein gerade nicht gelisteter Spieler behält seinen Verein", () => {
    // Verletzt: kommt in keiner Beobachtung vor.
    const { zuordnung } = zuordne([b("NYC", "TOR", ["Wolf"])], bekannt);
    expect(zuordnung.Magno).toBe("NYC");
  });

  it("am ersten Tag zurück ist er SOFORT wieder eindeutig", () => {
    // Comeback: eine einzige Beobachtung, für sich genommen mehrdeutig …
    const ohne = zuordne([b("NYC", "TOR", ["Magno"])]);
    expect(ohne.zuordnung.Magno).toBeUndefined();
    // … mit Gedächtnis aber sofort aufgelöst, weil NYC unter den Kandidaten ist.
    const mit = zuordne([b("NYC", "TOR", ["Magno"])], bekannt);
    expect(mit.zuordnung.Magno).toBe("NYC");
    expect(mit.offen).toEqual([]);
  });

  // Sicherheit vor Komfort: passt die alte Antwort nicht mehr zu dem, was wir
  // sehen, ist er gewechselt — dann lieber unentschieden als falsch.
  it("nach einem Transfer wird die alte Zuordnung VERWORFEN", () => {
    const { zuordnung, offen } = zuordne([b("LAG", "SEA", ["Magno"])], bekannt);
    expect(zuordnung.Magno).toBeUndefined();
    expect(offen[0].moeglich).toEqual(["LAG", "SEA"]);
  });

  it("und der neue Verein löst sich nach dem zweiten Spiel auf", () => {
    const { zuordnung } = zuordne(
      [b("LAG", "SEA", ["Magno"]), b("LAG", "POR", ["Magno"])], bekannt);
    expect(zuordnung.Magno).toBe("LAG");
  });

  it("eine eindeutige Beobachtung schlägt das Gedächtnis", () => {
    const { zuordnung } = zuordne(
      [b("LAG", "SEA", ["Magno"]), b("LAG", "POR", ["Magno"])], { Magno: "NYC" });
    expect(zuordnung.Magno).toBe("LAG");
  });
});

// Die einzige Konstellation, die das Verfahren NICHT lösen kann: zwei Spieler
// mit identischem Namen in verschiedenen Vereinen.
describe("UEBERSTEUERT — die Notbremse", () => {
  it("ist im Auslieferungszustand leer", () => {
    expect(Object.keys(UEBERSTEUERT)).toEqual([]);
  });

  it("schlägt Beobachtung UND Gedächtnis", () => {
    UEBERSTEUERT["Doppel Name"] = "TOR";
    try {
      const { zuordnung, offen } = zuordne(
        [b("NYC", "MTL", ["Doppel Name"]), b("NYC", "LAG", ["Doppel Name"])],
        { "Doppel Name": "NYC" });
      expect(zuordnung["Doppel Name"]).toBe("TOR");
      expect(offen.some((o) => o.spieler === "Doppel Name")).toBe(false);
    } finally {
      delete UEBERSTEUERT["Doppel Name"];
    }
  });
});

// Die Eigenschaft, auf der alles ruht — hier als Test festgehalten, damit sie
// beim nächsten Umbau nicht verlorengeht.
describe("Sicherheits-Eigenschaft: nie falsch, höchstens unentschieden", () => {
  it("die Schnittmenge enthält IMMER den wahren Verein", () => {
    // Magno spielt für NYC. Egal welche Gegner, NYC ist in jedem Paar.
    const spiele = [
      b("NYC", "TOR", ["Magno"]), b("MTL", "NYC", ["Magno"]),
      b("NYC", "LAG", ["Magno"]), b("SEA", "NYC", ["Magno"]),
    ];
    for (let n = 1; n <= spiele.length; n++) {
      const { zuordnung, offen } = zuordne(spiele.slice(0, n));
      const antwort = zuordnung.Magno ?? null;
      // Entweder die richtige Antwort — oder gar keine. Nie eine falsche.
      if (antwort !== null) expect(antwort).toBe("NYC");
      else expect(offen[0].moeglich).toContain("NYC");
    }
  });
});
