import { describe, it, expect } from "vitest";
import { jokerAblauf, sperrfristAblauf, abklingAblaeufe, ablaeufe, naechsterAblauf } from "./ablauf";
import { basisFuer, darfEinsetzen } from "./jokerBasis";
import { DEFAULT_RULES, sanitizeRules } from "./engine";
import { alleMatches } from "./ligen";

// ============================================================
//  Der Befund, den diese Datei behebt
//
//  🔴 Die REGEL steht ueberall (`jokerBasis.verfall`), das DATUM nirgends. Ein
//  Spieler sieht „2 Joker uebrig" und weiss nicht, ob er sie diese Woche
//  ausgeben muss oder bis Mai Zeit hat.
//
//  ⚠️ Wichtiger als jede einzelne Zahl ist hier: es darf NIE ein erfundenes
//  Datum herauskommen. Wer sich auf „Spieltag 8" verlaesst und dann ist es
//  Spieltag 5, hat seinen Joker verloren -- und der Fehler faellt niemandem
//  auf, weil eine Zahl dastand.
// ============================================================

const BL = alleMatches().filter((m) => m.wettbewerb === "bl");
const mitVerfall = (verfall) => sanitizeRules({
  ...DEFAULT_RULES,
  jokerBasis: { standard: { ...DEFAULT_RULES.jokerBasis.standard, verfall } },
});

describe("Joker-Verfall", () => {
  it("„Saison“ sagt: kein Zeitdruck", () => {
    const a = jokerAblauf(mitVerfall("saison"), { matches: BL, spieltag: 3 });
    expect(a.wann).toBe("saison");
    expect(a.spieltag).toBeNull();
    expect(a.text).toMatch(/Saisonende/);
  });

  it("„wandert“ bekommt eine eigene Auskunft -- und das ist kein Beiwerk", () => {
    // 🔴 Wer nicht weiss, dass sein Joker mitwandert, gibt ihn aus Angst zu
    // frueh aus. Die beruhigende Auskunft ist so wichtig wie die dringende.
    const a = jokerAblauf(mitVerfall("wandert"), { matches: BL, spieltag: 3 });
    expect(a.wann).toBe("nie");
    expect(a.text).toMatch(/wandern/);
  });

  it("„je Periode“ nennt den Spieltag, an dessen Ende es soweit ist", () => {
    const a = jokerAblauf(mitVerfall("periode"), { matches: BL, spieltag: 3 });
    // Entweder ein echter Spieltag -- oder ausdruecklich „unbekannt".
    expect(["spieltag", "unbekannt"]).toContain(a.wann);
    if (a.wann === "spieltag") {
      expect(Number.isFinite(a.spieltag)).toBe(true);
      expect(a.spieltag).toBeGreaterThanOrEqual(3);
      expect(a.text).toContain(String(a.spieltag));
    }
  });

  it("ohne Spielplan wird NICHTS erfunden", () => {
    // 🔴 Die wichtigste Zusage dieser Datei. Ein erfundenes Datum ist
    // schlimmer als keines -- der Spieler richtet sich danach.
    const a = jokerAblauf(mitVerfall("periode"), { matches: [], spieltag: null });
    expect(a.wann).toBe("unbekannt");
    expect(a.spieltag).toBeNull();
    expect(a.text).toMatch(/steht erst mit dem Spielplan fest/);
  });

  it("jeder Fall traegt einen Satz, den ein Spieler versteht", () => {
    for (const v of ["saison", "wandert", "periode"]) {
      const a = jokerAblauf(mitVerfall(v), { matches: BL, spieltag: 2 });
      expect(a.text.length, v).toBeGreaterThan(25);
      // Kein Feldname im Text -- „verfall: periode" sagt niemandem etwas.
      expect(a.text, v).not.toMatch(/verfall:|jokerBasis/);
    }
  });
});

describe("Sperrfristen", () => {
  it("rechnet den Spieltag aus, ab dem es wieder geht", () => {
    const a = sperrfristAblauf({ getroffenAm: 5, spieltage: 3, name: "Block" });
    expect(a).toMatchObject({ spieltag: 8, wann: "spieltag" });
    expect(a.text).toContain("8");
  });

  it("schweigt, wenn es gar keine Sperrfrist gibt", () => {
    // Eine Zeile „keine Sperrfrist" waere Rauschen.
    expect(sperrfristAblauf({ getroffenAm: 5, spieltage: 0 })).toBeNull();
    expect(sperrfristAblauf({ spieltage: 3 })).toBeNull();
    expect(sperrfristAblauf({})).toBeNull();
  });

  it("beugt richtig -- ein Spieltag, drei Spieltage", () => {
    expect(sperrfristAblauf({ getroffenAm: 1, spieltage: 1 }).text).toMatch(/1 Spieltag gesperrt/);
    expect(sperrfristAblauf({ getroffenAm: 1, spieltage: 3 }).text).toMatch(/3 Spieltage gesperrt/);
  });
});

describe("Die Liste", () => {
  it("ist immer eine Liste und enthaelt mindestens den Joker-Verfall", () => {
    const l = ablaeufe(mitVerfall("saison"), { matches: BL, spieltag: 3 });
    expect(Array.isArray(l)).toBe(true);
    expect(l.length).toBeGreaterThan(0);
  });

  it("sortiert nach DRINGLICHKEIT, nicht alphabetisch", () => {
    // 🔴 Was bald wegfaellt, steht oben. Was gar nicht wegfaellt, unten.
    const l = ablaeufe(mitVerfall("saison"), {
      matches: BL, spieltag: 3,
      sperrfristen: [{ getroffenAm: 9, spieltage: 2, name: "Klau" },
                     { getroffenAm: 3, spieltage: 1, name: "Block" }],
    });
    expect(l[0].was).toBe("Block");   // ab Spieltag 4
    expect(l[1].was).toBe("Klau");    // ab Spieltag 11
    expect(l[2].wann).toBe("saison"); // der Joker, ohne Datum
  });

  it("uebergeht leere Sperrfristen, statt Luecken zu erzeugen", () => {
    const l = ablaeufe(mitVerfall("saison"), {
      matches: BL, spieltag: 3,
      sperrfristen: [{ spieltage: 0 }, { getroffenAm: 2, spieltage: 2, name: "Block" }],
    });
    expect(l.every((e) => e && e.text)).toBe(true);
    expect(l.filter((e) => e.was === "Block")).toHaveLength(1);
  });

  it("die dringendste Sache laesst sich einzeln abfragen", () => {
    const l = ablaeufe(mitVerfall("saison"), {
      matches: BL, spieltag: 3, sperrfristen: [{ getroffenAm: 3, spieltage: 2, name: "Block" }],
    });
    expect(naechsterAblauf(l)).toMatchObject({ was: "Block", spieltag: 5 });
  });

  it("ohne etwas Dringendes gibt es auch nichts Dringendes", () => {
    const l = ablaeufe(mitVerfall("wandert"), { matches: BL, spieltag: 3 });
    expect(naechsterAblauf(l)).toBeNull();
  });
});

// ============================================================
//  Die Abklingzeit -- und die Fessel, die sie an `darfEinsetzen` bindet
//
//  🔴 Hier entsteht eine zweite Wahrheit, wenn niemand aufpasst: `jokerBasis`
//  ENTSCHEIDET, ob ein Joker gespielt werden darf, `ablauf.js` SAGT, ab wann
//  wieder. Laufen die beiden auseinander, steht auf dem Schirm ein Datum, an
//  dem der Knopf trotzdem nicht geht -- und der Spieler haelt sich fuer
//  bloed, nicht die App fuer kaputt.
//
//  Der letzte Test unten laesst das nicht zu: er fragt `darfEinsetzen` Spieltag
//  fuer Spieltag ab und verlangt, dass das erste Ja genau auf dem Spieltag
//  liegt, den `abklingAblaeufe` nennt.
// ============================================================

const mitAbklingzeit = (abklingzeit) => sanitizeRules({
  ...DEFAULT_RULES,
  jokerBasis: { standard: { ...DEFAULT_RULES.jokerBasis.standard, abklingzeit } },
});

const EINSATZ = (spieltag, vonUserId = "u1", jokerArt = "joker.einzel") =>
  ({ spieltag, jokerArt, vonUserId, aufUserId: null });

describe("Abklingzeit als Datum", () => {
  it("ohne Abklingzeit gibt es nichts zu sagen", () => {
    const l = abklingAblaeufe(mitAbklingzeit(0), {
      einsaetze: [EINSATZ(3)], userId: "u1", spieltag: 3,
    });
    expect(l).toEqual([]);
  });

  it("nennt den Spieltag, ab dem die Art wieder frei ist", () => {
    const l = abklingAblaeufe(mitAbklingzeit(2), {
      einsaetze: [EINSATZ(3)], userId: "u1", spieltag: 3,
    });
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ spieltag: 5, jokerArt: "joker.einzel" });
    expect(l[0].text).toMatch(/Einzel-Joker/);
  });

  it("zaehlt vom JUENGSTEN Einsatz, nicht vom ersten", () => {
    // ⚠️ Sonst meldet die Seite eine Sperre als abgelaufen, die noch laeuft --
    // der Spieler plant mit einem Joker, den er nicht setzen kann.
    const l = abklingAblaeufe(mitAbklingzeit(3), {
      einsaetze: [EINSATZ(2), EINSATZ(6), EINSATZ(4)], userId: "u1", spieltag: 6,
    });
    expect(l[0].spieltag).toBe(9);
  });

  it("zeigt abgelaufene Sperren NICHT -- sie waeren Rauschen", () => {
    const l = abklingAblaeufe(mitAbklingzeit(2), {
      einsaetze: [EINSATZ(3)], userId: "u1", spieltag: 9,
    });
    expect(l).toEqual([]);
  });

  it("nimmt nur die eigenen Einsaetze", () => {
    const l = abklingAblaeufe(mitAbklingzeit(2), {
      einsaetze: [EINSATZ(3, "wer-anders"), EINSATZ(1, "u1")], userId: "u1", spieltag: 1,
    });
    expect(l).toHaveLength(1);
    expect(l[0].spieltag).toBe(3);
  });

  it("haelt die Arten auseinander -- eine Sperre sperrt nicht die andere", () => {
    const l = abklingAblaeufe(mitAbklingzeit(2), {
      einsaetze: [EINSATZ(3, "u1", "joker.einzel"), EINSATZ(4, "u1", "duell.klau")],
      userId: "u1", spieltag: 4,
    });
    expect(l.map((e) => e.jokerArt).sort()).toEqual(["duell.klau", "joker.einzel"]);
  });

  it("ein Einsatz ohne Spieltag erfindet KEIN Datum", () => {
    // 🔴 `Number(null)` ist 0 und endlich -- derselbe Griff, der an einem Tag
    // zweimal zugeschlagen hat (greiftNicht.js, sperrfristAblauf).
    const l = abklingAblaeufe(mitAbklingzeit(2), {
      einsaetze: [{ spieltag: null, jokerArt: "joker.einzel", vonUserId: "u1" }],
      userId: "u1", spieltag: 2,
    });
    expect(l).toEqual([]);
  });

  it("haengt in `ablaeufe` mit drin und sortiert sich nach Dringlichkeit ein", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      jokerBasis: { standard: { ...DEFAULT_RULES.jokerBasis.standard, verfall: "saison", abklingzeit: 2 } },
    });
    const l = ablaeufe(rules, {
      matches: BL, spieltag: 3,
      einsaetze: [EINSATZ(3)], userId: "u1",
    });
    expect(l[0]).toMatchObject({ spieltag: 5 });   // die Sperre zuerst
    expect(l[l.length - 1].wann).toBe("saison");   // die beruhigende zuletzt
  });

  // 🔴 DIE FESSEL: dasselbe Datum, das der Schirm nennt, muss der Torwaechter
  // meinen. Bricht das, ist es kein Anzeigefehler -- es ist eine Luege.
  it("nennt genau den Spieltag, an dem `darfEinsetzen` wieder ja sagt", () => {
    for (const abklingzeit of [1, 2, 3, 5]) {
      const rules = mitAbklingzeit(abklingzeit);
      const basis = basisFuer("joker.einzel", rules);
      const gesetztAm = 4;
      const einsaetze = [EINSATZ(gesetztAm)];

      const [gesagt] = abklingAblaeufe(rules, { einsaetze, userId: "u1", spieltag: gesetztAm });
      expect(gesagt, `Abklingzeit ${abklingzeit} muss eine Auskunft geben`).toBeTruthy();

      // Spieltag fuer Spieltag fragen, wann der Torwaechter wieder ja sagt.
      let erstesJa = null;
      for (let st = gesetztAm; st <= gesetztAm + 12; st++) {
        const { erlaubt } = darfEinsetzen(basis, "u1", {
          hatGetippt: true, alleGetippt: true, board: [], adminFreigaben: [],
          aktuellerSpieltag: st,
          letzteEinsaetze: [{ jokerArt: "joker.einzel", spieltag: gesetztAm }],
        }, "joker.einzel");
        if (erlaubt) { erstesJa = st; break; }
      }
      expect(erstesJa, `Abklingzeit ${abklingzeit}`).toBe(gesagt.spieltag);
    }
  });
});
