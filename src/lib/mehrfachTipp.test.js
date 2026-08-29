import { describe, it, expect } from "vitest";
import {
  MEHRFACH_MODI, DEFAULT_MEHRFACH, sanitizeMehrfach,
  passtInsRegelwerk, anpassung, verteilung, schalterText,
} from "./mehrfachTipp";
import { DEFAULT_RULES } from "./engine";

// Ein Spiel, das in drei Tagen angepfiffen wird — damit das Tipp-Fenster der
// Vorgabe offen ist und die Prüfung nicht schon am Termin scheitert.
const JETZT = Date.parse("2026-09-01T12:00:00Z");
const MATCH = {
  id: "m1", matchId: "m1", matchday: 3, league: "bl",
  kickoff: new Date(JETZT + 3 * 24 * 3600e3).toISOString(),
  home: "Borussia Dortmund", away: "FC Bayern München",
};

const regeln = (aenderung = {}) => ({
  ...DEFAULT_RULES,
  ...aenderung,
  markets: {
    ...DEFAULT_RULES.markets,
    ...(aenderung.markets ?? {}),
    goals: { ...DEFAULT_RULES.markets.goals, ...(aenderung.markets?.goals ?? {}) },
  },
});

const tipp = (goals) => ({ home: 2, away: 1, goals });

describe("Der Modus", () => {
  it("kennt genau zwei Möglichkeiten", () => {
    expect(MEHRFACH_MODI).toEqual(["alle", "einzeln"]);
    expect(MEHRFACH_MODI).toContain(DEFAULT_MEHRFACH);
  });

  it("macht aus Unsinn die Vorgabe", () => {
    expect(sanitizeMehrfach("quatsch")).toBe(DEFAULT_MEHRFACH);
    expect(sanitizeMehrfach(null)).toBe(DEFAULT_MEHRFACH);
    expect(sanitizeMehrfach("einzeln")).toBe("einzeln");
  });

  // 🔴 Andis zweite Hälfte: "sodass jede Tipprunde einzeln betippt wird auch
  // wenns die gleichen Spiele sind". Der Modus muss WIRKLICH nichts verteilen.
  it("🔴 verteilt im Modus einzeln an niemanden", () => {
    const v = verteilung({
      runden: [{ id: "r2", name: "Büro", rules: DEFAULT_RULES }],
      match: MATCH, tip: tipp({ home: [], away: [] }), jetzt: JETZT, modus: "einzeln",
    });
    expect(v.aktiv).toBe(false);
    expect(v.mit).toEqual([]);
  });
});

describe("Passt der Tipp in ein anderes Regelwerk?", () => {
  it("ein reiner Ergebnis-Tipp passt überall", () => {
    const t = tipp({ home: [], away: [] });
    expect(passtInsRegelwerk(t, regeln()).passt).toBe(true);
    expect(passtInsRegelwerk(t, regeln({ markets: { goals: { enabled: false } } })).passt).toBe(true);
  });

  // 🔴 Der Fall, um den es geht: dort gilt der Tipp NICHT so, wie er hier
  // gemeint war. Stillschweigend kürzen wäre schlimmer als ihn nicht zu setzen.
  it("🔴 zu viele Torschützen je Mannschaft werden abgelehnt, nicht gekürzt", () => {
    const t = tipp({ home: ["Guirassy", "Adeyemi"], away: ["Kane"] });
    const r = regeln({ markets: { goals: { picksPerTeam: 1 } } });
    const p = passtInsRegelwerk(t, r);
    expect(p.passt).toBe(false);
    expect(p.grund).toContain("1 Torschützen je Mannschaft");
  });

  it("🔴 Torschützen dort ausgeschaltet: der Tipp würde etwas anderes bedeuten", () => {
    const t = tipp({ home: ["Guirassy"], away: [] });
    const p = passtInsRegelwerk(t, regeln({ markets: { goals: { enabled: false } } }));
    expect(p.passt).toBe(false);
    expect(p.grund).toContain("ohne Torschützen");
  });

  it("zu viele Namen im Spiel-Modus werden abgelehnt", () => {
    const t = tipp({ home: ["A", "B"], away: ["C", "D"] });
    const r = regeln({ markets: { goals: { modus: "proSpiel", picksProSpiel: 3 } } });
    expect(passtInsRegelwerk(t, r).passt).toBe(false);
  });

  // ⚠️ Der Weg von proSpiel nach proTeam: dort liegen alle Namen auf einer
  // Seite, und das wäre ein Tipp, den man in der Zielrunde nie hätte abgeben
  // können.
  it("⚠️ eine leere Mannschaftsseite wird abgelehnt", () => {
    const t = tipp({ home: ["A", "B"], away: [] });
    const p = passtInsRegelwerk(t, regeln({ markets: { goals: { picksPerTeam: 2 } } }));
    expect(p.passt).toBe(false);
    expect(p.grund).toContain("Gast");
  });
});

// ============================================================
//  🔴 DER VORSCHLAG — "maximal wenig wiederholen"
// ============================================================
describe("Anpassen statt neu tippen", () => {
  it("kürzt auf die dort erlaubte Anzahl und sagt, was noch fehlt", () => {
    const t = tipp({ home: ["Guirassy", "Adeyemi"], away: ["Kane", "Olise"] });
    const a = anpassung(t, regeln({ markets: { goals: { picksPerTeam: 1 } } }));
    expect(a.vorschlag.goals.home).toEqual(["Guirassy"]);
    expect(a.vorschlag.goals.away).toEqual(["Kane"]);
    expect(a.fehlt).toBe(0);
  });

  // ⚠️ Das Ergebnis wandert IMMER mit — es ist überall dieselbe Zahl. Genau
  // das macht den Unterschied zwischen "nochmal tippen" und "bestätigen".
  it("🔴 behält das Ergebnis, auch wenn alle Torschützen wegfallen", () => {
    const t = tipp({ home: ["Guirassy"], away: ["Kane"] });
    const a = anpassung(t, regeln({ markets: { goals: { enabled: false } } }));
    expect(a.vorschlag.home).toBe(2);
    expect(a.vorschlag.away).toBe(1);
    expect(a.vorschlag.goals).toEqual({ home: [], away: [] });
  });

  it("meldet offene Plätze, wenn die Zielrunde mehr Namen verlangt", () => {
    const t = tipp({ home: ["Guirassy"], away: [] });
    const a = anpassung(t, regeln({ markets: { goals: { picksPerTeam: 2 } } }));
    // Heim fehlt einer, Gast fehlen zwei.
    expect(a.fehlt).toBe(3);
  });

  // 🔴 Die Zusicherung, die den ganzen Vorschlag trägt: was herauskommt, ist
  // im Zielregelwerk auch wirklich zulässig. Ein Vorschlag, der selbst nicht
  // passt, wäre schlimmer als gar keiner.
  it("🔴 der Vorschlag passt anschließend wirklich ins Zielregelwerk", () => {
    const faelle = [
      [tipp({ home: ["A", "B"], away: ["C", "D"] }), regeln({ markets: { goals: { picksPerTeam: 1 } } })],
      [tipp({ home: ["A"], away: ["B"] }), regeln({ markets: { goals: { enabled: false } } })],
      [tipp({ home: ["A", "B"], away: ["C"] }), regeln({ markets: { goals: { modus: "proSpiel", picksProSpiel: 2 } } })],
    ];
    for (const [t, r] of faelle) {
      const a = anpassung(t, r);
      if (a.fehlt > 0) continue;   // dann muss der Nutzer dort noch etwas setzen
      expect(passtInsRegelwerk(a.vorschlag, r).passt, JSON.stringify(a.vorschlag)).toBe(true);
    }
  });
});

describe("Die Verteilung auf mehrere Runden", () => {
  const offen = { id: "r2", name: "Büro", rules: DEFAULT_RULES };
  const einTipp = tipp({ home: [], away: [] });

  it("nimmt eine offene Runde mit", () => {
    const v = verteilung({ runden: [offen], match: MATCH, tip: einTipp, jetzt: JETZT });
    expect(v.mit.map((r) => r.roundId)).toEqual(["r2"]);
    expect(v.zu).toEqual([]);
  });

  // ⚠️ Das Tipp-Fenster ist je Runde eingestellt. Eine Runde, in der das Spiel
  // noch nicht aufgeht, wird BENANNT statt übergangen.
  it("🔴 lässt eine Runde aus, deren Tipp-Fenster zu ist — mit Grund", () => {
    const spaeter = {
      id: "r3", name: "Familie",
      // ⚠️ `vorlaufStunden`, nicht `vorlaufTage` — die erste Fassung dieses
      // Tests hat einen Feldnamen erfunden, den Aufschlag still ignoriert und
      // damit das Gegenteil geprüft: die Runde war offen, und der Test hätte
      // eine kaputte Verteilung durchgewunken.
      rules: { ...DEFAULT_RULES, tippfenster: { ...DEFAULT_RULES.tippfenster, vorlaufStunden: 24 } },
    };
    const v = verteilung({ runden: [spaeter], match: MATCH, tip: einTipp, jetzt: JETZT });
    expect(v.mit).toEqual([]);
    expect(v.zu).toHaveLength(1);
    expect(v.zu[0].grund).toBeTruthy();
  });

  it("hängt an jede unpassende Runde einen Vorschlag", () => {
    const eng = { id: "r4", name: "Streng", rules: regeln({ markets: { goals: { picksPerTeam: 1 } } }) };
    const v = verteilung({
      runden: [eng], match: MATCH, jetzt: JETZT,
      tip: tipp({ home: ["Guirassy", "Adeyemi"], away: ["Kane", "Olise"] }),
    });
    expect(v.unpassend).toHaveLength(1);
    expect(v.unpassend[0].grund).toBeTruthy();
    expect(v.unpassend[0].vorschlag.goals.home).toEqual(["Guirassy"]);
  });

  it("ohne weitere Runden gibt es nichts zu sagen", () => {
    const v = verteilung({ runden: [], match: MATCH, tip: einTipp, jetzt: JETZT });
    expect(schalterText(v)).toBeNull();
  });

  it("der Schaltertext nennt eine Zahl statt einer Beschwichtigung", () => {
    const v = verteilung({ runden: [offen], match: MATCH, tip: einTipp, jetzt: JETZT });
    expect(schalterText(v)).toMatch(/1 weitere Runde/);
  });
});
