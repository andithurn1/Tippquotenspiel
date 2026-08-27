import { describe, it, expect } from "vitest";
import { EBENEN, ohneEbenen, beschreibeAnsicht, unterschiedeZumStand } from "./vergleichsansicht";
import { DEFAULT_RULES, sanitizeRules } from "./engine";
import { EREIGNIS_PRESETS } from "./ereignisse";

// ============================================================
//  🔴 Die eine Eigenschaft, auf der alles beruht:
//  eine Ansicht „ohne Joker" muss WIRKLICH ohne Joker sein.
//
//  Der Fehler, der hier lauert, ist der unangenehmste ueberhaupt: schaltet
//  die Ebene nur die Haelfte ab, steht in der Tabelle weiter ein Abzug, den
//  ein Joker verursacht hat -- und die Ueberschrift sagt „ohne Joker". Das
//  ist keine Ungenauigkeit, das ist eine falsche Aussage, und niemand kann
//  sie an der Zahl erkennen.
// ============================================================

const scharf = sanitizeRules({
  ...DEFAULT_RULES,
  joker: { ...DEFAULT_RULES.joker, enabled: true },
  duell: { ...DEFAULT_RULES.duell, enabled: true },
  eingriffe: { ...DEFAULT_RULES.eingriffe, enabled: true,
    trittbrett: { enabled: true, anteil: 0.3, kopierterBekommt: 0 } },
  wettbewerbe: { enabled: true, aufschlaege: { cl: 0.3 }, phasenStufe: 0.1 },
  bigGame: { ...DEFAULT_RULES.bigGame, enabled: true },
  tabellenBonus: { ...DEFAULT_RULES.tabellenBonus, enabled: true },
  aufholen: { ...DEFAULT_RULES.aufholen, enabled: true },
  saisonform: { ...DEFAULT_RULES.saisonform, enabled: true },
  versaeumnis: { ...DEFAULT_RULES.versaeumnis, enabled: true },
  // ⚠️ Ereignisse und Rad muessen WIRKLICH an sein, sonst prueft der Fall
  // „ohne Ereignisse" nichts -- er faellt dann auf, weil die Gegenprobe
  // „jede Ebene schaltet auch wirklich etwas ab" fehlschlaegt. Genau dafuer
  // ist sie da.
  ereignisse: EREIGNIS_PRESETS.find((p) => p.key !== "aus").ereignisse,
  drehrad: { ...DEFAULT_RULES.drehrad, enabled: true },
});

describe("Katalog", () => {
  it("jede Ebene ist beschrieben, eindeutig und nennt ihre Bloecke", () => {
    for (const e of EBENEN) {
      expect(e.key && e.label && e.text).toBeTruthy();
      expect(e.bloecke.length).toBeGreaterThan(0);
      // Jeder genannte Block muss es im Regelwerk wirklich geben -- ein
      // Tippfehler hier schaltet stillschweigend NICHTS ab.
      for (const b of e.bloecke) expect(DEFAULT_RULES, `${e.key} → ${b}`).toHaveProperty(b);
    }
    expect(new Set(EBENEN.map((e) => e.key)).size).toBe(EBENEN.length);
  });

  it("kein Block gehoert zu ZWEI Ebenen", () => {
    // Sonst schaltete das Abwaehlen der einen die andere halb mit ab, und
    // niemand koennte sagen, welche Zahl woher kommt.
    const alle = EBENEN.flatMap((e) => e.bloecke);
    expect(new Set(alle).size).toBe(alle.length);
  });
});

describe("ohneEbenen", () => {
  it("ohne Auswahl bleibt das Regelwerk, wie es ist", () => {
    expect(ohneEbenen(scharf, [])).toEqual(scharf);
    expect(ohneEbenen(scharf)).toEqual(scharf);
  });

  it("schaltet JEDEN Block der gewaehlten Ebene ab -- nicht nur den ersten", () => {
    // 🔴 Der Kern: „ohne Joker" heisst auch ohne Duelle und ohne Fremdjoker.
    const ohne = ohneEbenen(scharf, ["joker"]);
    expect(ohne.joker.enabled).toBe(false);
    expect(ohne.duell.enabled).toBe(false);
    expect(ohne.eingriffe.enabled).toBe(false);
  });

  it("laesst die anderen Ebenen in Ruhe", () => {
    const ohne = ohneEbenen(scharf, ["joker"]);
    expect(ohne.wettbewerbe.enabled).toBe(true);
    expect(ohne.bigGame.enabled).toBe(true);
    expect(ohne.aufholen.enabled).toBe(true);
  });

  it("mehrere Ebenen zusammen", () => {
    const ohne = ohneEbenen(scharf, ["joker", "wettbewerbe", "modifikatoren"]);
    expect(ohne.joker.enabled).toBe(false);
    expect(ohne.wettbewerbe.enabled).toBe(false);
    expect(ohne.bigGame.enabled).toBe(false);
    expect(ohne.tabellenBonus.enabled).toBe(false);
    expect(ohne.aufholen.enabled).toBe(true);   // Verlauf war nicht dabei
  });

  it("jede einzelne Ebene schaltet auch wirklich etwas ab", () => {
    // Die Gegenprobe gegen eine Ebene, die nur so aussieht.
    for (const e of EBENEN) {
      const ohne = ohneEbenen(scharf, [e.key]);
      expect(JSON.stringify(ohne), e.key).not.toBe(JSON.stringify(scharf));
    }
  });

  it("uebergeht unbekannte Ebenen still", () => {
    // Eine Ansicht darf an einem Tippfehler nicht die ganze Tabelle verlieren.
    expect(ohneEbenen(scharf, ["gibtsnicht"])).toEqual(scharf);
    expect(ohneEbenen(scharf, ["joker", "gibtsnicht"]).joker.enabled).toBe(false);
  });

  it("das Ergebnis ist immer ein GUELTIGES Regelwerk", () => {
    // 🔴 Sonst kaeme die Vergleichszahl aus einem Zustand, den es ueber die
    // Oberflaeche gar nicht geben koennte.
    for (const e of EBENEN) {
      const ohne = ohneEbenen(scharf, [e.key]);
      expect(sanitizeRules(ohne), e.key).toEqual(ohne);
    }
  });

  it("loescht keinen Block -- sonst kaeme die Vorgabe zurueck", () => {
    // ⚠️ `sanitizeRules` setzt einen fehlenden Block auf die Vorgabe. Ein
    // geloeschter Joker waere danach wieder der Vorgabe-Joker.
    for (const e of EBENEN) {
      const ohne = ohneEbenen(scharf, [e.key]);
      for (const b of e.bloecke) expect(ohne, `${e.key} → ${b}`).toHaveProperty(b);
    }
  });
});

describe("Der Satz darueber", () => {
  it("sagt beim echten Stand, dass alles zaehlt", () => {
    expect(beschreibeAnsicht([])).toMatch(/echte Stand/);
  });

  it("nennt die abgewaehlten Ebenen und dass nichts umgewertet wird", () => {
    const t = beschreibeAnsicht(["joker", "ereignisse"]);
    expect(t).toContain("Joker");
    expect(t).toContain("Ereignisse");
    expect(t).toMatch(/gewertet bleibt der echte Stand/);
  });
});

describe("Der Unterschied zum echten Stand", () => {
  const echt = [
    { userId: "a", name: "Ana", total: 300 },
    { userId: "b", name: "Ben", total: 250 },
    { userId: "c", name: "Cem", total: 200 },
  ];
  // Ohne das Drumherum dreht sich die Reihenfolge: Cem war vorn.
  const ohne = [
    { userId: "c", name: "Cem", total: 210 },
    { userId: "a", name: "Ana", total: 190 },
    { userId: "b", name: "Ben", total: 180 },
  ];

  it("zeigt, wie viele Plaetze das Drumherum gebracht hat", () => {
    const d = unterschiedeZumStand(echt, ohne);
    const cem = d.find((x) => x.userId === "c");
    const ana = d.find((x) => x.userId === "a");
    // Cem waere ohne das Drumherum Erster, ist echt Dritter → −2 Plaetze.
    expect(cem).toMatchObject({ rangOhne: 1, rangEcht: 3, plaetze: 2 });
    // ⚠️ Vorzeichen: positiv heisst „im echten Stand BESSER platziert".
    expect(ana).toMatchObject({ rangOhne: 2, rangEcht: 1, plaetze: -1 });
  });

  it("traegt beide Punktzahlen mit", () => {
    const d = unterschiedeZumStand(echt, ohne);
    expect(d.find((x) => x.userId === "a")).toMatchObject({ punkteOhne: 190, punkteEcht: 300 });
  });

  it("kommt mit jemandem zurecht, den es nur in EINER Liste gibt", () => {
    const d = unterschiedeZumStand(echt, [...ohne, { userId: "d", name: "Dana", total: 5 }]);
    expect(d.find((x) => x.userId === "d")).toMatchObject({ rangEcht: null, plaetze: null });
  });

  it("sortiert nicht um -- die Reihenfolge kommt aus der Wertung", () => {
    // Ein zweites Sortieren koennte bei Gleichstand anders aufloesen als
    // `scoreLeaderboard` und einen Rang zeigen, den es nie gab.
    const gleich = [
      { userId: "x", total: 100 }, { userId: "y", total: 100 },
    ];
    expect(unterschiedeZumStand(gleich, gleich).map((z) => z.userId)).toEqual(["x", "y"]);
  });
});
