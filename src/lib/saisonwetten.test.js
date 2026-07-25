import { describe, it, expect } from "vitest";
import {
  WETT_TYPEN, WETT_TYP, AUSWERTBARE_TYPEN, istAuswertbar, VERFUEGBARE_STATISTIKEN,
  DEFAULT_SAISON, SAISON_LIMITS, sanitizeSaison, wettenId, wettenLabel,
  tabelle, torschuetzen, scoreSaison, SAISON_PRESETS,
} from "@/lib/saisonwetten";

// Mini-Saison: A dominiert, B ist zweiter, C ist Letzter.
// Schützen: "Toni" (A) 4 Tore, "Basti" (B) 3, "Cem" (C) 1.
const snap = (heim, gast, heimSpieler, gastSpieler) => ({
  home: heim, away: gast,
  players: {
    home: Object.fromEntries(heimSpieler.map((n) => [n, { anytime: 2, double: 6 }])),
    away: Object.fromEntries(gastSpieler.map((n) => [n, { anytime: 2, double: 6 }])),
  },
});

const MATCHES = [
  { home: "A", away: "B", snapshot: snap("A", "B", ["Toni"], ["Basti"]),
    result: { home: 3, away: 1, playerGoals: { Toni: 3, Basti: 1 } } },
  { home: "B", away: "C", snapshot: snap("B", "C", ["Basti"], ["Cem"]),
    result: { home: 2, away: 1, playerGoals: { Basti: 2, Cem: 1 } } },
  { home: "A", away: "C", snapshot: snap("A", "C", ["Toni"], ["Cem"]),
    result: { home: 1, away: 0, playerGoals: { Toni: 1 } } },
];

describe("Saison-Tabellen", () => {
  it("rechnet Punkte, Tore und Gegentore korrekt", () => {
    const t = tabelle(MATCHES);
    const a = t.find((x) => x.team === "A");
    expect(a.punkte).toBe(6);      // zwei Siege
    expect(a.tore).toBe(4);
    expect(a.gegentore).toBe(1);
    expect(t.find((x) => x.team === "C").punkte).toBe(0);
  });

  it("ordnet Torschützen ihrem Team zu", () => {
    const s = torschuetzen(MATCHES);
    const toni = s.find((x) => x.spieler === "Toni");
    expect(toni.tore).toBe(4);
    expect(toni.team).toBe("A");
    expect(s.find((x) => x.spieler === "Basti").tore).toBe(3);
  });

  it("verträgt Spiele ohne Ergebnis", () => {
    expect(tabelle([{ home: "A", away: "B", result: null }])).toEqual([]);
    expect(torschuetzen([{ home: "A", away: "B", result: null }])).toEqual([]);
  });
});

describe("Wett-Typen", () => {
  it("jeder Typ ist vollständig beschrieben", () => {
    for (const w of WETT_TYPEN) {
      expect(w.key && w.label && w.hint).toBeTruthy();
      expect(["team", "spieler"]).toContain(w.antwort);
      expect(Array.isArray(w.braucht)).toBe(true);
      expect(typeof w.ermitteln).toBe("function");
    }
  });

  it("Schlüssel sind eindeutig", () => {
    const keys = WETT_TYPEN.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("Karten/Fouls sind ehrlich als NICHT auswertbar markiert", () => {
    expect(istAuswertbar("meiste-karten")).toBe(false);
    expect(istAuswertbar("meiste-fouls")).toBe(false);
    expect(VERFUEGBARE_STATISTIKEN).not.toContain("karten");
  });

  it("die tor-basierten Typen sind auswertbar", () => {
    for (const k of ["meister", "letzter", "torschuetzenkoenig", "beste-defensive"]) {
      expect(istAuswertbar(k)).toBe(true);
    }
    expect(AUSWERTBARE_TYPEN.length).toBeGreaterThan(4);
  });

  it("ermittelt die richtigen Gewinner", () => {
    expect(WETT_TYP.meister.ermitteln(MATCHES, {})).toEqual(["A"]);
    expect(WETT_TYP.letzter.ermitteln(MATCHES, {})).toEqual(["C"]);
    expect(WETT_TYP.torschuetzenkoenig.ermitteln(MATCHES, {})).toEqual(["Toni"]);
    expect(WETT_TYP["team-des-torschuetzenkoenigs"].ermitteln(MATCHES, {})).toEqual(["A"]);
    expect(WETT_TYP["beste-defensive"].ermitteln(MATCHES, {})).toEqual(["A"]);
  });

  it("bei Gleichstand gewinnen alle Gleichauf-Sieger", () => {
    const gleich = [
      { home: "A", away: "B", snapshot: snap("A", "B", ["Toni"], ["Basti"]),
        result: { home: 1, away: 1, playerGoals: { Toni: 1, Basti: 1 } } },
    ];
    expect(WETT_TYP.torschuetzenkoenig.ermitteln(gleich, {}).sort()).toEqual(["Basti", "Toni"]);
  });
});

describe("Konstruierbar: der Ausschluss-Parameter", () => {
  it("schließt ein Team vom Torschützenkönig aus", () => {
    const ohneA = WETT_TYP.torschuetzenkoenig.ermitteln(MATCHES, { ausser: ["A"] });
    expect(ohneA).toEqual(["Basti"]);   // Toni (Team A) fällt raus
  });

  it("schließt ein Team von der Offensiv-Wertung aus", () => {
    expect(WETT_TYP["beste-offensive"].ermitteln(MATCHES, { ausser: ["A"] })).toEqual(["B"]);
  });

  it("das Label macht den Ausschluss sichtbar", () => {
    expect(wettenLabel({ key: "torschuetzenkoenig", ausser: ["A"] })).toContain("außer A");
  });

  it("dieselbe Wette mit anderem Ausschluss ist eine EIGENE Wette", () => {
    expect(wettenId({ key: "torschuetzenkoenig" }))
      .not.toBe(wettenId({ key: "torschuetzenkoenig", ausser: ["A"] }));
  });
});

describe("sanitizeSaison", () => {
  it("Standard ist aus", () => {
    expect(DEFAULT_SAISON.enabled).toBe(false);
    expect(sanitizeSaison({}).wetten).toEqual([]);
  });

  it("wirft unbekannte Typen raus und beschneidet Punkte", () => {
    const s = sanitizeSaison({
      enabled: true, gewicht: 99,
      wetten: [{ key: "hack", punkte: 100 }, { key: "meister", punkte: 999999 }],
    });
    expect(s.wetten).toHaveLength(1);
    expect(s.wetten[0].key).toBe("meister");
    expect(s.wetten[0].punkte).toBeLessThanOrEqual(SAISON_LIMITS.punkte.max);
    expect(s.gewicht).toBeLessThanOrEqual(SAISON_LIMITS.gewicht.max);
  });

  it("entfernt exakte Dubletten, behält aber Varianten mit anderem Ausschluss", () => {
    const s = sanitizeSaison({
      enabled: true,
      wetten: [
        { key: "meister", punkte: 300 },
        { key: "meister", punkte: 500 },
        { key: "torschuetzenkoenig", punkte: 400 },
        { key: "torschuetzenkoenig", punkte: 400, ausser: ["A"] },
      ],
    });
    expect(s.wetten).toHaveLength(3);
  });

  it("begrenzt die Anzahl der Wetten", () => {
    const viele = Array.from({ length: 20 }, (_, i) => ({ key: "meister", punkte: 100 + i, ausser: [`T${i}`] }));
    expect(sanitizeSaison({ enabled: true, wetten: viele }).wetten.length)
      .toBeLessThanOrEqual(SAISON_LIMITS.maxWetten);
  });

  it("ignoriert den Ausschluss bei Typen, die ihn nicht kennen", () => {
    const s = sanitizeSaison({ enabled: true, wetten: [{ key: "meister", ausser: ["A"] }] });
    expect(s.wetten[0].ausser).toBeUndefined();
  });
});

describe("scoreSaison", () => {
  const saison = {
    enabled: true, gewicht: 1,
    wetten: [
      { key: "meister", punkte: 300 },
      { key: "torschuetzenkoenig", punkte: 400 },
      { key: "letzter", punkte: 300 },
    ],
  };

  it("zahlt nur für richtige Tipps", () => {
    const r = scoreSaison({ matches: MATCHES, saison, tipps: { meister: "A", torschuetzenkoenig: "Basti", letzter: "C" } });
    expect(r.treffer).toBe(2);
    expect(r.gesamt).toBe(600);
    expect(r.zeilen.find((z) => z.key === "torschuetzenkoenig").richtig).toBe(false);
  });

  it("das Gesamtgewicht skaliert alle Saison-Punkte", () => {
    const halb = scoreSaison({ matches: MATCHES, saison: { ...saison, gewicht: 0.5 }, tipps: { meister: "A" } });
    expect(halb.gesamt).toBe(150);
  });

  it("ist die Saison-Ebene aus, gibt es nichts", () => {
    const r = scoreSaison({ matches: MATCHES, saison: { ...saison, enabled: false }, tipps: { meister: "A" } });
    expect(r.gesamt).toBe(0);
    expect(r.zeilen).toEqual([]);
  });

  it("ohne Tipp keine Punkte, aber die Zeile zeigt den Gewinner", () => {
    const r = scoreSaison({ matches: MATCHES, saison, tipps: {} });
    expect(r.gesamt).toBe(0);
    expect(r.zeilen[0].gewinner).toEqual(["A"]);
  });

  it("nicht auswertbare Wetten zahlen nie und sind markiert", () => {
    const r = scoreSaison({
      matches: MATCHES,
      saison: { enabled: true, gewicht: 1, wetten: [{ key: "meiste-karten", punkte: 300 }] },
      tipps: { "meiste-karten": "A" },
    });
    expect(r.zeilen[0].auswertbar).toBe(false);
    expect(r.gesamt).toBe(0);
  });

  it("ein Tipp mit Ausschluss wird unter eigener Id gewertet", () => {
    const s = { enabled: true, gewicht: 1, wetten: [{ key: "torschuetzenkoenig", punkte: 400, ausser: ["A"] }] };
    const id = wettenId(s.wetten[0]);
    const r = scoreSaison({ matches: MATCHES, saison: s, tipps: { [id]: "Basti" } });
    expect(r.gesamt).toBe(400);
  });
});

describe("Empfehlungen (Presets)", () => {
  it("jedes Preset ist gültig und überlebt die Prüfung unverändert", () => {
    for (const p of SAISON_PRESETS) {
      expect(p.key && p.label && p.desc).toBeTruthy();
      const s = sanitizeSaison(p.saison);
      expect(s.enabled).toBe(true);
      expect(s.wetten).toHaveLength(p.saison.wetten.length);
    }
  });

  it("alle empfohlenen Wetten sind heute auch auswertbar", () => {
    for (const p of SAISON_PRESETS) {
      for (const w of p.saison.wetten) expect(istAuswertbar(w.key)).toBe(true);
    }
  });
});
