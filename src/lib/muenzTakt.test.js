import { describe, it, expect } from "vitest";
import {
  sanitizeMuenzTakt, DEFAULT_MUENZ_TAKT, MUENZ_TAKT_LIMITS,
  spieltagsFolge, muenzPerioden, muenzSchluessel, muenzTaktStatus,
  beschreibeMuenzTakt, muenzTaktKonflikte, periodeLabel,
} from "./muenzTakt";
import { sanitizeRules, invalidEinsatzMatchdays } from "./engine";
import { spieltagKey } from "./spieltag";

const TAG = 24 * 3600 * 1000;
const WOCHE = 7 * TAG;
const START = Date.UTC(2026, 7, 1);

// Acht Spieltage, wöchentlich, drei Spiele je Spieltag — EIN Wettbewerb, damit
// Runden-Spieltag und Liga-Spieltag deckungsgleich sind.
const spieltagMatches = (matchday, ms) =>
  Array.from({ length: 3 }, (_, i) => ({
    id: `bl${matchday}-${i}`, wettbewerb: "bl", matchday,
    kickoff: new Date(ms).toISOString(), home: `H${i}`, away: `A${i}`,
  }));

const MATCHES = Array.from({ length: 8 }, (_, i) => i + 1)
  .flatMap((md) => spieltagMatches(md, START + (md - 1) * WOCHE));

describe("sanitizeMuenzTakt", () => {
  it("leeres Objekt liefert die Vorgaben", () => {
    expect(sanitizeMuenzTakt({})).toEqual(DEFAULT_MUENZ_TAKT);
  });

  it("unbekannter Takt fällt auf 'spieltag' zurück", () => {
    expect(sanitizeMuenzTakt({ einsatzTakt: "quatsch" }).einsatzTakt).toBe("spieltag");
  });

  it("einsatzTaktN wird gerundet und auf die Grenzen beschnitten", () => {
    expect(sanitizeMuenzTakt({ einsatzTaktN: 1 }).einsatzTaktN).toBe(MUENZ_TAKT_LIMITS.einsatzTaktN.min);
    expect(sanitizeMuenzTakt({ einsatzTaktN: 99 }).einsatzTaktN).toBe(MUENZ_TAKT_LIMITS.einsatzTaktN.max);
    expect(sanitizeMuenzTakt({ einsatzTaktN: 3.6 }).einsatzTaktN).toBe(4);
  });

  it("Fenster-Felder werden übernommen", () => {
    const cfg = sanitizeMuenzTakt({
      einsatzFenster: { phase: "manuell", abSpieltag: 5, bisSpieltag: 12 },
    });
    expect(cfg.einsatzFenster.phase).toBe("manuell");
    expect(cfg.einsatzFenster.abSpieltag).toBe(5);
    expect(cfg.einsatzFenster.bisSpieltag).toBe(12);
  });
});

describe("spieltagsFolge", () => {
  it("liefert die Spieltags-Schlüssel chronologisch und doppelfrei", () => {
    // Reihenfolge der Eingabe absichtlich durcheinander — die Ausgabe muss
    // trotzdem chronologisch sein.
    const durcheinander = [...MATCHES].reverse();
    expect(spieltagsFolge(durcheinander)).toEqual(
      Array.from({ length: 8 }, (_, i) => spieltagKey({ wettbewerb: "bl", matchday: i + 1 })),
    );
  });

  it("respektiert eine übergebene Schlüsselfunktion", () => {
    // Fasst je zwei Liga-Spieltage zu einem Schlüssel zusammen.
    const paarSchluessel = (x) => String(Math.ceil(Number(x.matchday) / 2));
    expect(spieltagsFolge(MATCHES, paarSchluessel)).toEqual(["1", "2", "3", "4"]);
  });
});

describe("muenzSchluessel", () => {
  it("bei 'spieltag' wird die übergebene Funktion UNVERÄNDERT zurückgegeben", () => {
    const rules = sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "spieltag" } });
    const schluesselFn = muenzSchluessel({ matches: MATCHES, rules, schluessel: spieltagKey });
    expect(schluesselFn).toBe(spieltagKey);
  });

  it("bei 'alleNSpieltage' (n=2) liefern Spieltag 1 und 2 denselben Schlüssel, Spieltag 3 einen anderen", () => {
    const rules = sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "alleNSpieltage", einsatzTaktN: 2 } });
    const schluesselFn = muenzSchluessel({ matches: MATCHES, rules });
    const k1 = schluesselFn({ wettbewerb: "bl", matchday: 1 });
    const k2 = schluesselFn({ wettbewerb: "bl", matchday: 2 });
    const k3 = schluesselFn({ wettbewerb: "bl", matchday: 3 });
    expect(k1).toBe(k2);
    expect(k3).not.toBe(k1);
  });
});

describe("muenzPerioden", () => {
  it("bei 'saison' gibt es genau eine Periode, die ALLE Schlüssel enthält", () => {
    const rules = sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "saison" } });
    const perioden = muenzPerioden({ matches: MATCHES, rules });
    const folge = spieltagsFolge(MATCHES);
    expect(perioden).toHaveLength(1);
    expect(perioden[0].nummer).toBe(1);
    expect(perioden[0].von).toBe(1);
    expect(perioden[0].bis).toBe(folge.length);
    expect(perioden[0].keys).toEqual(folge);
  });
});

describe("muenzTaktStatus", () => {
  it("bei 'phase' außerhalb des Fensters ist die Periode inaktiv, mit erklärendem Grund", () => {
    const rules = sanitizeRules({
      joker: { modus: "einsatz", einsatzTakt: "phase", einsatzFenster: { phase: "schlussspurt", schlussLaenge: 2 } },
    });
    // Fenster bei 8 Spieltagen und schlussLaenge 2: Spieltag 7–8.
    const status = muenzTaktStatus({ matches: MATCHES, rules, spieltag: { wettbewerb: "bl", matchday: 3 } });
    expect(status.aktiv).toBe(false);
    expect(typeof status.grund).toBe("string");
    expect(status.grund.length).toBeGreaterThan(0);
    expect(status.nummer).toBeNull();
    expect(status.spieleInPeriode).toBe(0);
  });

  it("bei 'phase' innerhalb des Fensters ist die Periode aktiv, mit der tatsächlich gezählten Spielzahl", () => {
    const rules = sanitizeRules({
      joker: { modus: "einsatz", einsatzTakt: "phase", einsatzFenster: { phase: "schlussspurt", schlussLaenge: 2 } },
    });
    const status = muenzTaktStatus({ matches: MATCHES, rules, spieltag: { wettbewerb: "bl", matchday: 7 } });
    expect(status.aktiv).toBe(true);
    expect(status.grund).toBeNull();
    // Spieltag 7 UND 8 gehören zur Periode, je 3 Spiele.
    expect(status.spieleInPeriode).toBe(6);
  });

  it("bei 'alleNSpieltage' (n=2) ist spieleInPeriode die SUMME der Spiele beider Spieltage", () => {
    const rules = sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "alleNSpieltage", einsatzTaktN: 2 } });
    const status = muenzTaktStatus({ matches: MATCHES, rules, spieltag: { wettbewerb: "bl", matchday: 1 } });
    // Von Hand ausgezählt, nicht über dieselbe Formel wie die Implementierung:
    // Spieltag 1 und 2 haben je 3 Spiele in MATCHES.
    const handAusgezaehlt = MATCHES.filter((m) => m.matchday === 1 || m.matchday === 2).length;
    expect(handAusgezaehlt).toBe(6);
    expect(status.spieleInPeriode).toBe(handAusgezaehlt);
  });
});

describe("periodeLabel", () => {
  // 🔴 Der Text steht sowohl als Überschrift ("🪙 Münzen — die ganze Saison")
  // als auch mitten im Satz ("… Münzen für die ganze Saison verteilt") — ohne
  // Artikel liest sich der Satzfall an einer der beiden Stellen falsch.
  it("nennt bei einer Periode über die ganze Folge 'die ganze Saison' MIT Artikel", () => {
    const rules = sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "saison" } });
    const folge = spieltagsFolge(MATCHES);
    const status = muenzTaktStatus({ matches: MATCHES, rules, spieltag: { wettbewerb: "bl", matchday: 1 } });
    expect(periodeLabel(status, folge.length)).toBe("die ganze Saison");
  });

  it("bleibt bei 'Spieltage X–Y' ohne Artikel", () => {
    const rules = sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "alleNSpieltage", einsatzTaktN: 2 } });
    const folge = spieltagsFolge(MATCHES);
    const status = muenzTaktStatus({ matches: MATCHES, rules, spieltag: { wettbewerb: "bl", matchday: 1 } });
    expect(periodeLabel(status, folge.length)).toBe("Spieltage 1–2");
  });
});

describe("beschreibeMuenzTakt", () => {
  it("warnt bei 'saison' ausdrücklich vor dem Vermögens-Effekt", () => {
    const rules = sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "saison", einsatzProSpieltag: 80 } });
    expect(beschreibeMuenzTakt(rules)).toContain("Vermögen");
  });

  it("nennt bei 'alleNSpieltage' die ausgerechnete Zahl je Spieltag", () => {
    const rules = sanitizeRules({
      joker: { modus: "einsatz", einsatzTakt: "alleNSpieltage", einsatzTaktN: 4, einsatzProSpieltag: 100 },
    });
    // 100 Münzen auf 4 Spieltage verteilt -> 25 im Schnitt je Spieltag.
    expect(beschreibeMuenzTakt(rules)).toContain("25");
  });

  // 🔴 Aus einer eigenen Messung, nicht aus einem grünen Test: die erste
  // Fassung schrieb „im Schnitt 33.3 je Spieltag" — englischer Dezimalpunkt
  // in sichtbarem deutschem Text. Ein Test auf „enthält die Zahl" hätte das
  // nie gemeldet, weil „33.3" ein genauso gültiger Textbestandteil ist.
  it("schreibt Kommazahlen mit Komma, nicht mit Punkt", () => {
    const rules = sanitizeRules({
      joker: { modus: "einsatz", einsatzTakt: "alleNSpieltage", einsatzTaktN: 3, einsatzProSpieltag: 100 },
    });
    // 100 Münzen auf 3 Spieltage -> 33,33 im Schnitt.
    const text = beschreibeMuenzTakt(rules, { spieleJeSpieltag: 9 });
    expect(text).toContain("33,33");
    expect(text).not.toMatch(/\d+\.\d/);
  });

  it("enthält in keinem Fall einen Bezeichner oder Dateinamen aus dem Code", () => {
    const faelle = [
      sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "spieltag" } }),
      sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "alleNSpieltage", einsatzTaktN: 3 } }),
      sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "saison" } }),
      sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "phase" } }),
    ];
    for (const rules of faelle) {
      const text = beschreibeMuenzTakt(rules);
      expect(text).not.toContain("einsatzTakt");
      expect(text).not.toContain(".js");
      expect(text).not.toContain("alleNSpieltage");
    }
  });
});

describe("muenzTaktKonflikte", () => {
  it("ist leer bei 'spieltag'", () => {
    const rules = sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "spieltag" } });
    expect(muenzTaktKonflikte(rules)).toEqual([]);
  });

  it("meldet genau einen Fund bei 'saison'", () => {
    const rules = sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "saison" } });
    const konflikte = muenzTaktKonflikte(rules);
    expect(konflikte).toHaveLength(1);
    expect(konflikte[0].key).toBe("muenz-saison-vermoegen");
  });
});

describe("Integration mit engine.js", () => {
  it("sanitizeRules reicht den Münz-Takt durch, damit er im Creator-Code mitreist", () => {
    const r = sanitizeRules({ joker: { modus: "einsatz", einsatzTakt: "alleNSpieltage", einsatzTaktN: 3 } });
    expect(r.joker.einsatzTakt).toBe("alleNSpieltage");
    expect(r.joker.einsatzTaktN).toBe(3);
  });

  it("invalidEinsatzMatchdays liefert bei einem Verstoß ein Objekt mit key", () => {
    const rules = sanitizeRules({ joker: { enabled: true, modus: "einsatz" } });
    const tips = [2, 2, 1, 1, 1].map((gewicht, i) => ({ matchday: 1, matchId: `m${i}`, gewicht }));
    const fehler = invalidEinsatzMatchdays(tips, rules);
    expect(fehler).toHaveLength(1);
    expect(fehler[0].key).toBe("#1");
  });
});
