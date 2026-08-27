import { describe, it, expect } from "vitest";
import {
  RUECKSETZ_ZIELE, istRuecksetzZiel, schnitteAus, schnittFuer,
  abSchnitt, ohneZurueckgesetztes, beschreibeSchnitt,
} from "./ruecksetzung";
import { sanitizeDrehrad, pruefeFelder, auswerten } from "./drehrad";
import { kontoVerlauf } from "./jokerBudget";
import { DEFAULT_RULES, sanitizeRules } from "./engine";

// ============================================================
//  Was hier schiefgehen KANN, und deshalb festgehalten wird
//
//  🔴 Eine Ruecksetzung ist die erste Wirkung, die einen ZUSTAND aendert statt
//  einen Wert. Genau daran ist in diesem Projekt am meisten kaputtgegangen:
//  ein Zustand, den zwei Stellen lesen, ist eine zweite Wahrheit.
//
//  Die Loesung ist der Schnitt auf der Zeitachse -- und die Tests unten pruefen
//  vor allem SEINE Kanten: Spieltag 0, fehlender Spieltag, zweimal
//  zurueckgesetzt, und der Tag des Schnitts selbst.
// ============================================================

const G = (userId, spieltag, ziel) =>
  ({ userId, spieltag, feldId: "f", belohnung: { typ: "ruecksetzung", ziel } });

describe("Der Katalog", () => {
  it("nennt fuer jedes Ziel die Stelle, an der der Schnitt greift", () => {
    // 🔴 Ohne diese Angabe entstuende genau der Befund vom 06.08.: eine
    // Belohnung steht im Admin-Menue und tut nichts.
    for (const z of RUECKSETZ_ZIELE) {
      expect(z.stelle, z.key).toBeTruthy();
      expect(z.desc.length, z.key).toBeGreaterThan(20);
    }
  });

  it("kennt nur die Ziele, die es wirklich gibt", () => {
    expect(istRuecksetzZiel("cooldown")).toBe(true);
    expect(istRuecksetzZiel("budget")).toBe(true);
    expect(istRuecksetzZiel("punkte")).toBe(false);
    expect(istRuecksetzZiel(undefined)).toBe(false);
  });
});

describe("Aus Gutschriften werden Schnitte", () => {
  it("nimmt nur die Ruecksetzungen", () => {
    const s = schnitteAus([
      G("u1", 5, "cooldown"),
      { userId: "u1", spieltag: 6, belohnung: { typ: "punkte", betrag: 10 } },
    ]);
    expect(s).toEqual([{ userId: "u1", ziel: "cooldown", abSpieltag: 5 }]);
  });

  it("verwirft ein unbekanntes Ziel, statt es durchzulassen", () => {
    expect(schnitteAus([G("u1", 5, "alles")])).toEqual([]);
  });

  it("macht aus einem fehlenden Spieltag KEINEN Schnitt bei 0", () => {
    // 🔴 `Number(null)` ist 0 und endlich. Ein Schnitt bei Spieltag 0 wuerde
    // die ganze Historie wegwerfen -- und zwar lautlos.
    expect(schnitteAus([G("u1", null, "budget")])).toEqual([]);
    expect(schnitteAus([G("u1", undefined, "budget")])).toEqual([]);
  });
});

describe("Der Schnitt selbst", () => {
  const schnitte = [
    { userId: "u1", ziel: "cooldown", abSpieltag: 3 },
    { userId: "u1", ziel: "cooldown", abSpieltag: 8 },
    { userId: "u2", ziel: "cooldown", abSpieltag: 5 },
    { userId: "u1", ziel: "budget", abSpieltag: 2 },
  ];

  it("die JUENGSTE Ruecksetzung gewinnt", () => {
    expect(schnittFuer(schnitte, "u1", "cooldown")).toBe(8);
  });

  it("haelt Spieler und Ziel auseinander", () => {
    expect(schnittFuer(schnitte, "u2", "cooldown")).toBe(5);
    expect(schnittFuer(schnitte, "u1", "budget")).toBe(2);
    expect(schnittFuer(schnitte, "u3", "cooldown")).toBeNull();
  });

  it("ohne Schnitt bleibt alles stehen", () => {
    const liste = [{ spieltag: 1 }, { spieltag: 9 }];
    expect(abSchnitt(liste, null)).toEqual(liste);
  });

  it("wirft weg, was VOR dem Schnitt liegt -- der Tag selbst bleibt", () => {
    // ⚠️ Das Rad wird an einem Spieltag gedreht, an dem auch getippt wird. Wer
    // an diesem Tag zieht, soll das Fruehere los sein, nicht seinen an dem Tag
    // gesetzten Joker geschenkt bekommen.
    const l = abSchnitt([{ spieltag: 2 }, { spieltag: 5 }, { spieltag: 7 }], 5);
    expect(l.map((e) => e.spieltag)).toEqual([5, 7]);
  });

  it("ein Eintrag OHNE Spieltag bleibt stehen, statt still zu verschwinden", () => {
    const l = abSchnitt([{ spieltag: null }, { spieltag: 1 }], 5);
    expect(l).toHaveLength(1);
    expect(l[0].spieltag).toBeNull();
  });

  it("der Griff in einem: `ohneZurueckgesetztes`", () => {
    const l = ohneZurueckgesetztes(
      [{ spieltag: 1 }, { spieltag: 9 }], schnitte, "u1", "cooldown");
    expect(l.map((e) => e.spieltag)).toEqual([9]);
  });

  it("sagt einen Satz darueber", () => {
    expect(beschreibeSchnitt({ ziel: "budget", abSpieltag: 4 }))
      .toBe("Narren-Konto zurückgesetzt ab Spieltag 4");
    expect(beschreibeSchnitt(null)).toBe("");
  });
});

// ── Die Kontaktstellen: greift der Schnitt WIRKLICH? ────────
// 🔴 Ein gruener Test beweist, dass die Funktion richtig rechnet -- nicht, dass
// sie jemand fragt (CLAUDE.md, die sechs Funde vom 06.08.). Diese beiden
// messen deshalb am ECHTEN Aufrufer.

describe("Kontaktstelle Rad: das Feld ueberlebt die Bereinigung", () => {
  it("`sanitizeDrehrad` behaelt eine Ruecksetzung", () => {
    const d = sanitizeDrehrad({
      enabled: true,
      felder: [{ id: "a", label: "Frei!", gewicht: 50, belohnung: { typ: "ruecksetzung", ziel: "cooldown" } },
               { id: "b", label: "Niete", gewicht: 50, belohnung: { typ: "nichts" } }],
    });
    expect(d.felder.find((f) => f.id === "a").belohnung)
      .toEqual({ typ: "ruecksetzung", ziel: "cooldown" });
  });

  it("ein Feld ohne gueltiges Ziel fliegt MIT BEGRUENDUNG raus", () => {
    // ⚠️ Stumm verwerfen waere schlimmer als ablehnen: der Admin stellt etwas
    // ein, es steht danach nicht mehr da, und niemand sagt warum.
    const { verworfen } = pruefeFelder([
      { id: "a", label: "Frei!", gewicht: 50, belohnung: { typ: "ruecksetzung", ziel: "irgendwas" } },
    ]);
    expect(verworfen).toHaveLength(1);
    expect(verworfen[0].grund).toMatch(/Rücksetz-Ziel/);
  });

  it("`auswerten` reicht die Ruecksetzung als Gutschrift durch", () => {
    const d = sanitizeDrehrad({
      enabled: true,
      felder: [{ id: "a", label: "Konto neu", gewicht: 100, belohnung: { typ: "ruecksetzung", ziel: "budget" } }],
    });
    const { gutschriften } = auswerten(d, [{ userId: "u1", spieltag: 4, feldId: "a" }]);
    expect(schnitteAus(gutschriften))
      .toEqual([{ userId: "u1", ziel: "budget", abSpieltag: 4 }]);
  });
});

describe("Kontaktstelle Konto: die Ruecksetzung bewegt den Kontostand", () => {
  // Ein Regelwerk, in dem Joker mit Narren gekauft werden.
  const rules = sanitizeRules({
    ...DEFAULT_RULES,
    joker: { ...DEFAULT_RULES.joker, modus: "einzel" },
    budget: {
      ...DEFAULT_RULES.budget, enabled: true,
      quellen: [{ typ: "gleich", betrag: 10 }],
      verfall: "nie",
      preise: { ...DEFAULT_RULES.budget.preise, "joker.einzel": 5 },
    },
  });
  const tipps = [
    { userId: "u1", matchday: 1, joker: true },
    { userId: "u1", matchday: 2, joker: true },
    { userId: "u1", matchday: 3, joker: true },
  ];
  const standAm = (verlauf, md) => verlauf.find((v) => v.matchday === md)?.kontostand ?? null;

  it("ohne Ruecksetzung zaehlen alle Kaeufe", () => {
    const k = kontoVerlauf({ rules, tipps, spieltage: 6, userIds: ["u1"] });
    const ohne = standAm(k.proSpieler.u1, 5);
    const mit = kontoVerlauf({
      rules, tipps, spieltage: 6, userIds: ["u1"],
      ruecksetzungen: [{ userId: "u1", ziel: "budget", abSpieltag: 3 }],
    });
    // 🔴 Die eigentliche Aussage: der Schnitt VERAENDERT den Stand. Ohne diese
    // Zeile koennte die Einstellung durchgereicht werden und nichts tun.
    expect(standAm(mit.proSpieler.u1, 5)).toBeGreaterThan(ohne);
  });

  it("der Kauf AM Tag des Schnitts zaehlt weiter", () => {
    const mit = kontoVerlauf({
      rules, tipps, spieltage: 6, userIds: ["u1"],
      ruecksetzungen: [{ userId: "u1", ziel: "budget", abSpieltag: 3 }],
    });
    const ganzOhneKaeufe = kontoVerlauf({ rules, tipps: [], spieltage: 6, userIds: ["u1"] });
    // Der Kauf an Spieltag 3 ist noch abgezogen -- also NICHT gleich dem Stand
    // ohne jeden Kauf.
    expect(standAm(mit.proSpieler.u1, 5))
      .toBeLessThan(standAm(ganzOhneKaeufe.proSpieler.u1, 5));
  });

  it("die Ruecksetzung eines anderen Spielers laesst mich unberuehrt", () => {
    const meins = kontoVerlauf({ rules, tipps, spieltage: 6, userIds: ["u1"] });
    const fremd = kontoVerlauf({
      rules, tipps, spieltage: 6, userIds: ["u1"],
      ruecksetzungen: [{ userId: "u2", ziel: "budget", abSpieltag: 2 }],
    });
    expect(standAm(fremd.proSpieler.u1, 5)).toBe(standAm(meins.proSpieler.u1, 5));
  });
});
