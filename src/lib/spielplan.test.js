import { describe, it, expect } from "vitest";
import {
  normalisiereSpielplan, pruefeSpielplan, spielplanHerkunft, herkunftLabel, quotenHerkunft,
} from "./spielplan";
import { baueLiga } from "./ligaGenerator";

const TEAMS = ["Alpha", "Beta", "Gamma", "Delta"];
const TAG = 24 * 3600 * 1000;
const START = Date.UTC(2026, 7, 28, 18, 30);

// Vier Klubs, sechs Spieltage — eine vollständige Hin- und Rückrunde.
const VOLLSTAENDIG = [
  { matchday: 1, home: "Alpha", away: "Beta", kickoff: new Date(START).toISOString() },
  { matchday: 1, home: "Gamma", away: "Delta", kickoff: new Date(START + 3600e3).toISOString() },
  { matchday: 2, home: "Alpha", away: "Gamma", kickoff: new Date(START + 7 * TAG).toISOString() },
  { matchday: 2, home: "Beta", away: "Delta", kickoff: new Date(START + 7 * TAG + 3600e3).toISOString() },
  { matchday: 3, home: "Alpha", away: "Delta", kickoff: new Date(START + 14 * TAG).toISOString() },
  { matchday: 3, home: "Beta", away: "Gamma", kickoff: new Date(START + 14 * TAG + 3600e3).toISOString() },
  { matchday: 4, home: "Beta", away: "Alpha", kickoff: new Date(START + 21 * TAG).toISOString() },
  { matchday: 4, home: "Delta", away: "Gamma", kickoff: new Date(START + 21 * TAG + 3600e3).toISOString() },
  { matchday: 5, home: "Gamma", away: "Alpha", kickoff: new Date(START + 28 * TAG).toISOString() },
  { matchday: 5, home: "Delta", away: "Beta", kickoff: new Date(START + 28 * TAG + 3600e3).toISOString() },
  { matchday: 6, home: "Delta", away: "Alpha", kickoff: new Date(START + 35 * TAG).toISOString() },
  { matchday: 6, home: "Gamma", away: "Beta", kickoff: new Date(START + 35 * TAG + 3600e3).toISOString() },
];

describe("pruefeSpielplan — was den Import blockieren MUSS", () => {
  it("ein vollständiger Plan geht ohne Fehler und ohne Warnung durch", () => {
    const p = pruefeSpielplan(normalisiereSpielplan(VOLLSTAENDIG), TEAMS);
    expect(p.fehler).toEqual([]);
    expect(p.warnungen).toEqual([]);
    expect(p.ok).toBe(true);
  });

  // Der teuerste Importfehler: eine abweichende Schreibweise erzeugt still
  // einen Verein, den es in den Ratings nicht gibt.
  it("ein Klubname, den die Liga nicht kennt, ist ein FEHLER", () => {
    const p = pruefeSpielplan(
      normalisiereSpielplan([{ ...VOLLSTAENDIG[0], home: "Alpha FC" }, ...VOLLSTAENDIG.slice(1)]),
      TEAMS,
    );
    expect(p.ok).toBe(false);
    expect(p.fehler.join(" ")).toContain("Alpha FC");
  });

  it("ein Verein zweimal am selben Spieltag ist ein FEHLER", () => {
    const kaputt = [...VOLLSTAENDIG];
    kaputt[1] = { ...kaputt[1], home: "Alpha" };        // Alpha spielt an Spieltag 1 zweimal
    const p = pruefeSpielplan(normalisiereSpielplan(kaputt), TEAMS);
    expect(p.ok).toBe(false);
    expect(p.fehler.join(" ")).toContain("zweimal angesetzt");
  });

  it("eine unlesbare Anstoßzeit ist ein FEHLER", () => {
    const p = pruefeSpielplan(
      normalisiereSpielplan([{ ...VOLLSTAENDIG[0], kickoff: "Samstag halb vier" }]),
      TEAMS,
    );
    expect(p.ok).toBe(false);
    expect(p.fehler.join(" ")).toContain("nicht lesbar");
  });

  it("ein leerer Plan ist ein Fehler, kein leeres Ergebnis", () => {
    expect(pruefeSpielplan([], TEAMS).ok).toBe(false);
  });
});

describe("pruefeSpielplan — was nur WARNT", () => {
  // Während der Vorbereitung steht die Rückrunde oft noch nicht. Würde das den
  // Import blockieren, schaltete jemand die Prüfung ab.
  it("ein halber Spielplan warnt, blockiert aber nicht", () => {
    const p = pruefeSpielplan(normalisiereSpielplan(VOLLSTAENDIG.slice(0, 5)), TEAMS);
    expect(p.ok).toBe(true);
    expect(p.warnungen.length).toBeGreaterThan(0);
  });

  it("ein fehlender Spieltag mittendrin wird benannt", () => {
    const ohne2 = VOLLSTAENDIG.filter((s) => s.matchday !== 2);
    const p = pruefeSpielplan(normalisiereSpielplan(ohne2), TEAMS);
    expect(p.warnungen.join(" ")).toContain("fehlen die Spieltage 2");
  });

  it("überlappende Spieltage werden benannt — sie verschieben den Runden-Spieltag", () => {
    const ueberlappt = [...VOLLSTAENDIG];
    // Spieltag 3 wird vorgezogen und beginnt mitten in Spieltag 2.
    ueberlappt[4] = { ...ueberlappt[4], kickoff: new Date(START + 7 * TAG).toISOString() };
    const p = pruefeSpielplan(normalisiereSpielplan(ueberlappt), TEAMS);
    expect(p.warnungen.join(" ")).toContain("beginnt, bevor");
  });
});

describe("normalisiereSpielplan", () => {
  it("trimmt Namen, schreibt sie aber NICHT um", () => {
    const [s] = normalisiereSpielplan([{ matchday: 1, home: "  Alpha ", away: "Beta", kickoff: "2026-08-28T18:30:00Z" }]);
    expect(s.home).toBe("Alpha");
  });

  it("sortiert nach Anstoßzeit, egal wie die Quelle sortiert war", () => {
    const plan = normalisiereSpielplan([...VOLLSTAENDIG].reverse());
    const zeiten = plan.map((s) => new Date(s.kickoff).getTime());
    expect([...zeiten].sort((a, b) => a - b)).toEqual(zeiten);
  });
});

const RATINGS = {
  Alpha: { code: "alp", attack: 1.5, defense: 1.0 },
  Beta: { code: "bet", attack: 1.2, defense: 1.1 },
  Gamma: { code: "gam", attack: 1.0, defense: 1.2 },
  Delta: { code: "del", attack: 0.9, defense: 1.4 },
};

describe("baueLiga mit echtem Spielplan", () => {
  const liga = () => baueLiga({
    wettbewerb: "test", idPrefix: "t", ratings: RATINGS, spielplan: VOLLSTAENDIG,
  });

  it("übernimmt die echten Anstoßzeiten unverändert", () => {
    const m = liga();
    expect(m).toHaveLength(VOLLSTAENDIG.length);
    expect(m[0].kickoff).toBe(VOLLSTAENDIG[0].kickoff);
    expect(m.at(-1).kickoff).toBe(VOLLSTAENDIG.at(-1).kickoff);
  });

  it("erzeugt Quoten und Ergebnis weiterhin — echt ist nur der Kalender", () => {
    const [m] = liga();
    expect(m.snapshot).toBeTruthy();
    expect(m.result).toBeTruthy();
    expect(m.echterSpielplan).toBe(true);
  });

  // Ohne harten Abbruch entstünde still eine falsche Saison, sichtbar erst,
  // wenn jemand auf ein Spiel tippt, das es nicht gibt.
  it("bricht bei einem fehlerhaften Plan ab, statt eine halbe Saison zu bauen", () => {
    expect(() => baueLiga({
      wettbewerb: "test", idPrefix: "t", ratings: RATINGS,
      spielplan: [{ ...VOLLSTAENDIG[0], away: "Epsilon" }],
    })).toThrow(/Epsilon/);
  });

  it("ohne Spielplan bleibt alles wie bisher — erzeugt und als solches markiert", () => {
    const m = baueLiga({
      wettbewerb: "test", idPrefix: "t", ratings: RATINGS,
      saisonStart: START, utcOffset: 2, slotFuer: () => ({ tag: 0, hh: 20, mm: 30 }),
    });
    expect(m).toHaveLength(12);                     // 4 Teams → 6 Spieltage à 2 Spiele
    expect(m.every((x) => x.echterSpielplan === false)).toBe(true);
  });
});

describe("Herkunft — simulierte Daten dürfen nie wie echte aussehen", () => {
  const echt = (n) => Array.from({ length: n }, () => ({ echterSpielplan: true }));
  const erzeugt = (n) => Array.from({ length: n }, () => ({ echterSpielplan: false }));

  it("zählt echte und erzeugte Spiele getrennt", () => {
    expect(spielplanHerkunft([...echt(3), ...erzeugt(2)])).toMatchObject({ echt: 3, erzeugt: 2 });
  });

  it("nennt den gemischten Zustand beim Namen — der tritt im August wirklich ein", () => {
    // Die Ligen haben ihre Termine, die Champions League wird erst Ende August
    // ausgelost. „Echte Saison" wäre dann für die CL gelogen.
    expect(herkunftLabel([...echt(1446), ...erzeugt(159)])).toContain("teilweise echt");
  });

  it("ohne echte Spiele wird nichts behauptet", () => {
    const l = herkunftLabel(erzeugt(10));
    expect(l).toContain("Simulierter Spielplan");
    expect(l).toContain("simuliert");
  });

  // Spielplan und Quoten sind zwei getrennte Wahrheiten: ein Katalog kann echte
  // Termine und erfundene Quoten tragen (die europäischen Ligen) oder beides
  // echt (MLS). Für die Wertung ist die zweite Hälfte die wichtigere.
  it("nennt echte Marktquoten getrennt vom Spielplan", () => {
    const mitQuoten = [
      ...Array.from({ length: 3 }, () => ({
        echterSpielplan: true, snapshot: { quelle: "api", rasterQuelle: "markt" },
      })),
      ...erzeugt(7),
    ];
    expect(quotenHerkunft(mitQuoten)).toMatchObject({ echt: 3, mitRaster: 3 });
    expect(herkunftLabel(mitQuoten)).toContain("echte Marktquoten für 3 Spiele");
  });

  it("bei vollständig echtem Plan bleiben Quoten und Ergebnisse als simuliert benannt", () => {
    expect(herkunftLabel(echt(10))).toContain("simuliert");
  });

  // Der Weg, den die Oberfläche wirklich geht: der Store reicht `echterSpielplan`
  // nicht durch, es bleibt nur der Wettbewerb am Spiel.
  it("erkennt die Herkunft auch an Store-Zeilen ohne das Feld", () => {
    const ausStore = [
      ...Array.from({ length: 306 }, () => ({ wettbewerb: "bl" })),
      ...Array.from({ length: 159 }, () => ({ wettbewerb: "cl" })),
    ];
    expect(spielplanHerkunft(ausStore, new Set(["bl"]))).toMatchObject({ echt: 306, erzeugt: 159 });
    expect(herkunftLabel(ausStore, new Set(["bl"]))).toContain("306 von 465");
    expect(herkunftLabel(ausStore, new Set())).toContain("Simulierter Spielplan");
  });
});
