import { describe, it, expect } from "vitest";
import { AUFWAND_STUFEN, SEKUNDEN_JE_ENTSCHEIDUNG, aufwand, beschreibeAufwand } from "./aufwand";

// Fünf gleich große Spieltage — Median = Mittelwert = 10, damit die
// Rechnungen unten leicht nachvollziehbar bleiben.
const KONTEXT_GLEICH = { spieleJeSpieltag: [10, 10, 10, 10, 10] };

const NUR_ERGEBNIS = { markets: { result: true, goals: { enabled: false } } };
const MIT_TORSCHUETZEN = { markets: { result: true, goals: { enabled: true } } };

describe("aufwand — Median statt Mittelwert (wichtigster Test)", () => {
  it("ein Ausreißer nach oben ändert die Stufe NICHT", () => {
    const ohneAusreisser = aufwand(MIT_TORSCHUETZEN, { spieleJeSpieltag: [9, 9, 9, 9, 9] });
    const mitAusreisser = aufwand(MIT_TORSCHUETZEN, { spieleJeSpieltag: [9, 9, 9, 9, 90] });
    // Median bleibt in beiden Fällen 9 — Stufe und spieleProSpieltag also gleich.
    expect(mitAusreisser.spieleProSpieltag).toBe(ohneAusreisser.spieleProSpieltag);
    expect(mitAusreisser.stufe).toBe(ohneAusreisser.stufe);
  });

  it("mit Mittelwert wäre der Ausreißer sichtbar gewesen — Median blendet ihn aus", () => {
    // Mittelwert von [9,9,9,9,90] ist 25.2 — deutlich höher als der Median 9.
    const r = aufwand(NUR_ERGEBNIS, { spieleJeSpieltag: [9, 9, 9, 9, 90] });
    expect(r.spieleProSpieltag).toBe(9);
  });
});

describe("aufwand — alle vier Stufen", () => {
  // Median = 10 in jedem Fall (KONTEXT_GLEICH). Die Zusatz-Ebenen schieben
  // `gesamtProSpieltag` als Vielfaches dieses Medians durch die vier Stufen
  // (bisFaktor: entspannt 1.5, normal 2.5, viel 4, zuviel unbegrenzt).

  it("entspannt: nur Ergebnis-Tipps, keine Zusatz-Ebene (Faktor 1.0)", () => {
    const r = aufwand(NUR_ERGEBNIS, KONTEXT_GLEICH);
    expect(r.gesamtProSpieltag).toBe(10);
    expect(r.stufe).toBe("entspannt");
  });

  it("normal: Torschützen kommen dazu (Faktor 2.0)", () => {
    const r = aufwand(MIT_TORSCHUETZEN, KONTEXT_GLEICH);
    expect(r.gesamtProSpieltag).toBe(20);
    expect(r.stufe).toBe("normal");
  });

  it("viel: zusätzlich Ranking-Joker und Duell-Joker (Faktor 3.1)", () => {
    const rules = {
      ...MIT_TORSCHUETZEN,
      joker: { enabled: true, modus: "ranking" },
      duell: { enabled: true, proSpieltag: 1 },
    };
    const r = aufwand(rules, KONTEXT_GLEICH);
    // 20 (Tipp) + 10 (Ranking-Joker) + 1 (Duell) = 31 -> Faktor 3.1
    expect(r.gesamtProSpieltag).toBe(31);
    expect(r.stufe).toBe("viel");
  });

  it("zuviel: dieselbe Kombination mit ausgereiztem Duell-Joker und Saison-Wetten", () => {
    const alleAuswertbarenWetten = [
      "meister", "letzter", "beste-offensive", "beste-defensive",
      "remis-koenig", "torschuetzenkoenig", "team-des-torschuetzenkoenigs", "meiste-karten",
    ].map((key) => ({ key }));
    const rules = {
      ...MIT_TORSCHUETZEN,
      joker: { enabled: true, modus: "ranking" },
      duell: { enabled: true, proSpieltag: 3 },
      saison: { enabled: true, wetten: alleAuswertbarenWetten },
    };
    // Auf EINEN Spieltag verteilt, damit die Saison-Wetten-Hochrechnung stark
    // durchschlägt (8 Wetten / 1 Spieltag).
    const r = aufwand(rules, { spieleJeSpieltag: [10] });
    // 20 (Tipp) + 10 (Ranking) + 3 (Duell) + 8 (Saison, / 1 Spieltag) = 41 -> Faktor 4.1
    expect(r.gesamtProSpieltag).toBe(41);
    expect(r.stufe).toBe("zuviel");
    // Der Vollständigkeit halber: alle vier Stufen kommen im Katalog vor.
    expect(AUFWAND_STUFEN.map((s) => s.key)).toEqual(["entspannt", "normal", "viel", "zuviel"]);
  });
});

describe("aufwand — Regelwerk ohne Zusatzebene", () => {
  it("jokerEntscheidungen ist 0, wenn Joker, Duell und Saison-Wetten aus sind", () => {
    const r = aufwand({}, KONTEXT_GLEICH);
    expect(r.jokerEntscheidungen).toBe(0);
  });

  it("auch mit explizit ausgeschalteten Ebenen bleibt es 0", () => {
    const rules = {
      joker: { enabled: false, modus: "ranking" },
      duell: { enabled: false, proSpieltag: 3 },
      saison: { enabled: false, wetten: [{ key: "meister" }] },
    };
    const r = aufwand(rules, KONTEXT_GLEICH);
    expect(r.jokerEntscheidungen).toBe(0);
  });
});

describe("aufwand — ranking vs. einzel", () => {
  it("ranking-Modus ergibt mehr Entscheidungen als einzel", () => {
    const ranking = aufwand({ joker: { enabled: true, modus: "ranking" } }, KONTEXT_GLEICH);
    const einzel = aufwand({ joker: { enabled: true, modus: "einzel" } }, KONTEXT_GLEICH);
    expect(ranking.jokerEntscheidungen).toBeGreaterThan(einzel.jokerEntscheidungen);
    // Konkret: ranking = eine Entscheidung je Spiel (Median 10), einzel = 1.
    expect(ranking.jokerEntscheidungen).toBe(10);
    expect(einzel.jokerEntscheidungen).toBe(1);
  });
});

describe("aufwand — Torschützen an/aus", () => {
  it("verändert tippEntscheidungen, nicht jokerEntscheidungen", () => {
    const an = aufwand(MIT_TORSCHUETZEN, KONTEXT_GLEICH);
    const aus = aufwand(NUR_ERGEBNIS, KONTEXT_GLEICH);
    expect(an.tippEntscheidungen).toBeGreaterThan(aus.tippEntscheidungen);
    expect(an.tippEntscheidungen).toBe(20);
    expect(aus.tippEntscheidungen).toBe(10);
    expect(an.jokerEntscheidungen).toBe(aus.jokerEntscheidungen);
  });
});

describe("aufwand — leerer oder fehlender Kontext", () => {
  it("fehlender kontext stürzt nicht ab, liefert 0 und einen Hinweis", () => {
    const r = aufwand({}, undefined);
    expect(r.spieleProSpieltag).toBe(0);
    expect(r.tippEntscheidungen).toBe(0);
    expect(r.jokerEntscheidungen).toBe(0);
    expect(r.gesamtProSpieltag).toBe(0);
    expect(r.spieltage).toBe(0);
    expect(r.entscheidungenJeSpiel).toBe(0);
    expect(r.sekundenJeSpiel).toBe(0);
    expect(r.stufe).toBe("entspannt");
    expect(r.hinweise.length).toBeGreaterThan(0);
  });

  it("leeres spieleJeSpieltag verhält sich genauso", () => {
    const r = aufwand({}, { spieleJeSpieltag: [] });
    expect(r.gesamtProSpieltag).toBe(0);
    expect(r.hinweise.length).toBeGreaterThan(0);
  });

  it("fehlende rules (undefined) stürzt ebenfalls nicht ab", () => {
    expect(() => aufwand(undefined, KONTEXT_GLEICH)).not.toThrow();
  });
});

describe("aufwand — Tatsachen und der Sekundenwert JE SPIEL", () => {
  it("spieltage ist die Länge der übergebenen Reihe, keine Schätzung", () => {
    expect(aufwand(NUR_ERGEBNIS, KONTEXT_GLEICH).spieltage).toBe(KONTEXT_GLEICH.spieleJeSpieltag.length);
  });

  it("sekundenJeSpiel wächst monoton mit den Entscheidungen je Spiel", () => {
    const wenig = aufwand(NUR_ERGEBNIS, KONTEXT_GLEICH);
    const viel = aufwand(
      { ...MIT_TORSCHUETZEN, joker: { enabled: true, modus: "ranking" }, duell: { enabled: true, proSpieltag: 3 } },
      KONTEXT_GLEICH,
    );
    expect(viel.entscheidungenJeSpiel).toBeGreaterThan(wenig.entscheidungenJeSpiel);
    expect(viel.sekundenJeSpiel).toBeGreaterThan(wenig.sekundenJeSpiel);
    // Die Umrechnung folgt SEKUNDEN_JE_ENTSCHEIDUNG direkt.
    expect(wenig.sekundenJeSpiel)
      .toBe(Math.round(wenig.entscheidungenJeSpiel * SEKUNDEN_JE_ENTSCHEIDUNG));
  });

  it("entscheidungenJeSpiel ist je SPIEL, nicht je Spieltag — bei reinem Ergebnis genau 1", () => {
    // Ein Ergebnis-Tipp je Spiel, sonst nichts: unabhängig davon, wie viele
    // Spiele ein Spieltag hat, kostet EIN Spiel genau EINE Entscheidung.
    const klein = aufwand(NUR_ERGEBNIS, { spieleJeSpieltag: [4, 4, 4] });
    const gross = aufwand(NUR_ERGEBNIS, { spieleJeSpieltag: [40, 40, 40] });
    expect(klein.entscheidungenJeSpiel).toBe(1);
    expect(gross.entscheidungenJeSpiel).toBe(1);
    expect(klein.sekundenJeSpiel).toBe(gross.sekundenJeSpiel);
    // Die Spieltags-Summe unterscheidet sich sehr wohl.
    expect(gross.gesamtProSpieltag).toBeGreaterThan(klein.gesamtProSpieltag);
  });
});

describe("beschreibeAufwand", () => {
  it("liefert einen lesbaren Satz", () => {
    const r = aufwand(MIT_TORSCHUETZEN, KONTEXT_GLEICH);
    const text = beschreibeAufwand(r);
    expect(text).toContain("Spiele pro Spieltag");
    expect(text).toContain("Spieltage");
    expect(text).toContain("Entscheidungen pro Spieltag");
    expect(text).toContain("Sekunden je Spiel");
  });

  it("stürzt bei leerer Eingabe nicht ab", () => {
    expect(() => beschreibeAufwand(undefined)).not.toThrow();
    expect(() => beschreibeAufwand({})).not.toThrow();
  });
});
