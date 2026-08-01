import { describe, it, expect } from "vitest";

// ============================================================
//  REGLER-RASTER — der Wächter für die Multiplikator-Familie
//
//  Alle Regler, die einen vom Admin gesetzten MULTIPLIKATOR tragen (Joker-
//  Faktor, Team-/Derby-Faktoren, modCap, Kombi-Faktoren, Big-Game-Aufschlag,
//  Wettbewerbs-Gewichte, Drehrad-Modifikator), landen im selben additiven
//  Topf (`1 + Σ Aufschläge`, gedeckelt durch `modCap` — siehe `totalModifier`
//  in engine.js). Sie laufen deshalb alle mit demselben Raster hinein: 0,05.
//
//  Warum 0,05 und nicht 0,1: `reglerWarnung.js` trägt beim Mut-Bonus eine
//  GEMESSENE Grenze bei genau ×1,15 („ab 1,15 schmilzt der Vorsprung des
//  Könnens sichtbar ab", 4 Seeds × 60 Saisons). Ein 0,1-Raster machte 1,15
//  unerreichbar und würfe eine vorhandene Messung weg. Mit 0,05 bleibt jeder
//  frühere 0,1-Wert erreichbar (Vielfaches von 0,05), und 1,15 wird bedienbar.
//
//  Drei Dinge prüft dieser Test für JEDES Feld der Familie:
//   1. step === 0.05 — das gemeinsame Raster.
//   2. min und max liegen SELBST auf dem Raster — sonst ist der Endpunkt des
//      Reglers gar nicht erreichbar.
//   3. Rundlauf durch die jeweilige Sanitize-Funktion: ein Wert AUF dem Raster
//      (z. B. 1,15 oder modCap 2,45) kommt exakt so zurück, wie er hineinging.
//      Das ist der Regressionstest zu einem echten Fund: `sanitizeTeamMods`
//      rundete Vereins-Faktoren mit `.toFixed(1)` — ein Regler auf 1,15
//      überlebte das Speichern nicht (wurde zu 1,2). Jedes neue Feld, das
//      still mit `.toFixed(1)` rundet, fällt hier bei Punkt 3 auf.
//
//  Die Felder stehen als BENANNTE Liste hier — nicht generisch über
//  RULE_LIMITS iteriert —, damit ein neuer Multiplikator-Regler auffällt,
//  sobald ihn jemand ohne dieses Raster hinzufügt: er fehlt dann einfach in
//  der Liste, und ein Reviewer sieht die Lücke.
// ============================================================

import { RULE_LIMITS, sanitizeRules, REGLER_FEINHEITEN, reglerSchritt } from "./engine";
import { BIGGAME_LIMITS } from "./bigGame";
import { WETTBEWERB_LIMITS } from "./wettbewerbGewicht";
import { DREHRAD_LIMITS, pruefeFelder } from "./drehrad";

// Ein Wert auf dem 0,05-Raster, mittig in jeder üblichen [1..2]-Spanne — genau
// die Grenze aus der Mut-Bonus-Messung.
const RASTERWERT = 1.15;

const FAMILIE = [
  {
    name: "joker.faktor",
    limits: RULE_LIMITS.joker.faktor,
    rundlauf: () => sanitizeRules({ joker: { enabled: true, faktor: RASTERWERT } }).joker.faktor,
    erwartet: RASTERWERT,
  },
  {
    name: "joker.mutFaktor",
    limits: RULE_LIMITS.joker.mutFaktor,
    rundlauf: () => sanitizeRules({
      joker: { enabled: true, mut: { enabled: true, faktor: RASTERWERT } },
    }).joker.mut.faktor,
    erwartet: RASTERWERT,
  },
  {
    name: "combo.tendenz",
    limits: RULE_LIMITS.combo.tendenz,
    rundlauf: () => sanitizeRules({ combo: { tendenz: RASTERWERT } }).combo.tendenz,
    erwartet: RASTERWERT,
  },
  {
    name: "combo.abstand",
    limits: RULE_LIMITS.combo.abstand,
    rundlauf: () => sanitizeRules({ combo: { abstand: RASTERWERT } }).combo.abstand,
    erwartet: RASTERWERT,
  },
  {
    name: "combo.exakt",
    limits: RULE_LIMITS.combo.exakt,
    rundlauf: () => sanitizeRules({ combo: { exakt: RASTERWERT } }).combo.exakt,
    erwartet: RASTERWERT,
  },
  {
    name: "teamMods.derbyFaktor",
    limits: RULE_LIMITS.teamMods.derbyFaktor,
    rundlauf: () => sanitizeRules({ teamMods: { derbyFaktor: RASTERWERT } }).teamMods.derbyFaktor,
    erwartet: RASTERWERT,
  },
  {
    name: "teamMods.teamFaktor",
    limits: RULE_LIMITS.teamMods.teamFaktor,
    rundlauf: () => sanitizeRules({
      teamMods: { teams: { Verein: RASTERWERT } },
    }).teamMods.teams.Verein,
    erwartet: RASTERWERT,
  },
  {
    name: "modCap",
    limits: RULE_LIMITS.modCap,
    // 2,45 statt 1,15: modCap läuft bis 4 und ist der Deckel selbst — der Wert
    // aus dem echten Bug-Bericht.
    rundlauf: () => sanitizeRules({ modCap: 2.45 }).modCap,
    erwartet: 2.45,
  },
  {
    name: "bigGame.aufschlag",
    limits: BIGGAME_LIMITS.aufschlag,
    // bigGame.aufschlag läuft nur bis 1 — RASTERWERT (1,15) passt nicht,
    // deshalb ein eigener Wert auf demselben Raster.
    rundlauf: () => sanitizeRules({ bigGame: { enabled: true, aufschlag: 0.15 } }).bigGame.aufschlag,
    erwartet: 0.15,
  },
  {
    name: "wettbewerbe.aufschlaege",
    limits: WETTBEWERB_LIMITS.aufschlag,
    rundlauf: () => sanitizeRules({
      wettbewerbe: { enabled: true, aufschlaege: { cl: RASTERWERT } },
    }).wettbewerbe.aufschlaege.cl,
    erwartet: RASTERWERT,
  },
  {
    name: "wettbewerbe.phasenStufe",
    limits: WETTBEWERB_LIMITS.phasenStufe,
    // phasenStufe läuft nur bis 0,3 — RASTERWERT (1,15) passt nicht, deshalb
    // ein eigener Wert auf demselben Raster.
    rundlauf: () => sanitizeRules({ wettbewerbe: { enabled: true, phasenStufe: 0.15 } }).wettbewerbe.phasenStufe,
    erwartet: 0.15,
  },
  {
    name: "drehrad.modFaktor",
    limits: DREHRAD_LIMITS.modFaktor,
    rundlauf: () => pruefeFelder([
      { id: "a", label: "A", gewicht: 1, belohnung: { typ: "modifikator", faktor: RASTERWERT, spieltage: 1 } },
    ]).felder[0].belohnung.faktor,
    erwartet: RASTERWERT,
  },
];

describe("Regler-Raster der Multiplikator-Familie", () => {
  it("es gibt überhaupt eine Familie zu prüfen", () => {
    expect(FAMILIE.length).toBeGreaterThan(0);
  });

  for (const feld of FAMILIE) {
    describe(feld.name, () => {
      it("hat Schrittweite 0,05", () => {
        expect(feld.limits.step).toBe(0.05);
      });

      it("min und max liegen selbst auf dem 0,05-Raster", () => {
        for (const kante of [feld.limits.min, feld.limits.max]) {
          const vielfaches = Math.round(kante / 0.05);
          expect(Math.abs(kante - vielfaches * 0.05)).toBeLessThan(1e-9);
        }
      });

      it("übersteht den Rundlauf durch die Sanitize-Funktion unverändert", () => {
        expect(feld.rundlauf()).toBe(feld.erwartet);
      });
    });
  }
});

// ============================================================
//  REGLER-FEINHEIT — der Admin darf das 0,05-Raster der ganzen
//  Multiplikator-Familie oben rundenweise feiner stellen (0,025 · 0,01).
//  `RULE_LIMITS` bleibt dabei unverändert die Quelle des STANDARD-Rasters —
//  `reglerFeinheit` ist eine reine Runden-Übersteuerung on top, keine
//  Änderung an den Grenzen selbst.
// ============================================================
describe("Regler-Feinheit", () => {
  it("jede erlaubte Feinheit teilt 0,05 glatt — als Rechnung, nicht als Liste", () => {
    // Genau der Grund, aus dem 0,02 NICHT erlaubt ist: 0,05 / 0,02 = 2,5,
    // kein ganzzahliges Vielfaches, also kein glatter Teiler.
    for (const f of REGLER_FEINHEITEN) {
      const quotient = 0.05 / f.wert;
      expect(Math.abs(quotient - Math.round(quotient))).toBeLessThan(1e-9);
    }
  });

  it("keine Feinheit ist kleiner als 0,01", () => {
    for (const f of REGLER_FEINHEITEN) {
      expect(f.wert).toBeGreaterThanOrEqual(0.01);
    }
  });

  it("reglerSchritt liefert für ein Multiplikator-Limit die eingestellte Feinheit, für ein ganzzahliges Limit unveraendert dessen Schrittweite", () => {
    const rules = { reglerFeinheit: 0.01 };
    // Multiplikator-Limit (step 0,05 in RULE_LIMITS) — folgt der Feinheit.
    expect(reglerSchritt(rules, RULE_LIMITS.modCap)).toBe(0.01);
    // Ganzzahliges Limit (step 1) — bleibt UNVERAENDERT, auch bei Feinheit 0,01.
    expect(RULE_LIMITS.picksPerTeam.step).toBe(1);
    expect(reglerSchritt(rules, RULE_LIMITS.picksPerTeam)).toBe(1);
  });

  it("sanitizeRules nimmt 0,025 an und wirft Unsinn auf 0,05 zurück", () => {
    expect(sanitizeRules({ reglerFeinheit: 0.025 }).reglerFeinheit).toBe(0.025);
    expect(sanitizeRules({ reglerFeinheit: 0.01 }).reglerFeinheit).toBe(0.01);
    expect(sanitizeRules({ reglerFeinheit: 0.2 }).reglerFeinheit).toBe(0.05);
    expect(sanitizeRules({ reglerFeinheit: "quatsch" }).reglerFeinheit).toBe(0.05);
    expect(sanitizeRules({}).reglerFeinheit).toBe(0.05);
  });

  it("ein Wert auf dem feinen Raster übersteht den Rundlauf: modCap 2,42", () => {
    expect(sanitizeRules({ reglerFeinheit: 0.01, modCap: 2.42 }).modCap).toBe(2.42);
  });

  it("RULE_LIMITS bleibt die Quelle des Standard-Rasters — unabhaengig von reglerFeinheit", () => {
    expect(RULE_LIMITS.modCap.step).toBe(0.05);
    const gesetzt = sanitizeRules({ reglerFeinheit: 0.01, modCap: 2.45 });
    expect(gesetzt.modCap).toBe(2.45);
    expect(RULE_LIMITS.modCap.step).toBe(0.05);
  });
});
