import { describe, it, expect } from "vitest";
import {
  FREMDJOKER_ARTEN, RUECKNAHME, GEGEN_STUFEN, GEGEN_MODI,
  EINGRIFF_LIMITS, DEFAULT_EINGRIFFE, sanitizeEingriffe,
  gegenquote, gegenwetteErtrag,
} from "@/lib/eingriffe";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";

// 🔴 Diese Datei prüft das DACH der Fremdjoker-Familie (JK4–JK7). Die Wertung
// selbst steht in `duellJoker.test.js`, die Familienlogik in
// `fremdjoker.test.js` — hier geht es nur um Kataloge, Grenzen und die eine
// Formel aus Teil E.

describe("Kataloge", () => {
  it("die vier Fremdjoker sind vollständig beschrieben und tragen ihren Wohnort", () => {
    expect(FREMDJOKER_ARTEN.map((a) => a.key)).toEqual(["block", "klau", "trittbrett", "gegenwette"]);
    for (const a of FREMDJOKER_ARTEN) {
      expect(a.label).toBeTruthy();
      expect(a.desc.length).toBeGreaterThan(20);
      expect(["duell", "eingriffe"]).toContain(a.wo);
    }
  });

  it("jeder Katalog-Eintrag hat Schlüssel, Beschriftung und Beschreibung", () => {
    for (const katalog of [RUECKNAHME, GEGEN_STUFEN, GEGEN_MODI]) {
      expect(katalog.length).toBeGreaterThan(1);
      for (const e of katalog) {
        expect(e.key && e.label).toBeTruthy();
        expect(e.desc.length).toBeGreaterThan(15);
      }
    }
  });
});

describe("sanitizeEingriffe", () => {
  it("aus dem Nichts kommt die Vorgabe", () => {
    expect(sanitizeEingriffe()).toEqual(DEFAULT_EINGRIFFE);
    expect(sanitizeEingriffe(null)).toEqual(DEFAULT_EINGRIFFE);
    expect(sanitizeEingriffe("quatsch")).toEqual(DEFAULT_EINGRIFFE);
  });

  // 🔴 Die wichtigste Zeile dieser Datei. `enabled` ist das EINZIGE Feld der
  // Familie mit Vorgabe `true` — ein fehlendes Feld heißt „Dach offen", nicht
  // „Familie aus". Andernfalls würde jeder bestehende Creator-Code mit
  // `duell.enabled: true` rückwirkend sein Verhalten ändern.
  it("ein fehlendes `enabled` heißt AN, nur ein ausdrückliches false schaltet ab", () => {
    expect(sanitizeEingriffe({}).enabled).toBe(true);
    expect(sanitizeEingriffe({ enabled: false }).enabled).toBe(false);
    expect(sanitizeEingriffe({ enabled: "nein" }).enabled).toBe(true);
    expect(sanitizeEingriffe({ enabled: 0 }).enabled).toBe(true);
  });

  it("dieselbe Regel gilt für `sichtbarVorFrist` — Vorgabe ist offen", () => {
    expect(sanitizeEingriffe({}).sichtbarVorFrist).toBe(true);
    expect(sanitizeEingriffe({ sichtbarVorFrist: false }).sichtbarVorFrist).toBe(false);
  });

  it("die beiden neuen Arten sind umgekehrt: nur ein ausdrückliches true schaltet ein", () => {
    expect(sanitizeEingriffe({}).trittbrett.enabled).toBe(false);
    expect(sanitizeEingriffe({}).gegenwette.enabled).toBe(false);
    expect(sanitizeEingriffe({ trittbrett: { enabled: 1 } }).trittbrett.enabled).toBe(false);
    expect(sanitizeEingriffe({ trittbrett: { enabled: true } }).trittbrett.enabled).toBe(true);
  });

  it("Zahlen werden auf EINGRIFF_LIMITS beschnitten", () => {
    const r = sanitizeEingriffe({
      sperrfristJeZiel: 99,
      trittbrett: { anteil: 5, kopierterBekommt: -3 },
      gegenwette: { einsatz: 0 },
    });
    expect(r.sperrfristJeZiel).toBe(EINGRIFF_LIMITS.sperrfristJeZiel.max);
    expect(r.trittbrett.anteil).toBe(EINGRIFF_LIMITS.anteil.max);
    expect(r.trittbrett.kopierterBekommt).toBe(EINGRIFF_LIMITS.kopierterBekommt.min);
    // JK10: eine Gegenwette ohne Einsatz gibt es nicht — 0 fällt auf das Minimum.
    expect(r.gegenwette.einsatz).toBe(EINGRIFF_LIMITS.einsatz.min);
  });

  it("unbekannte Schlüsselwerte fallen auf die Vorgabe", () => {
    const r = sanitizeEingriffe({ ruecknahme: "irgendwann", gegenwette: { stufe: "gefühl", modus: "hä" } });
    expect(r.ruecknahme).toBe(DEFAULT_EINGRIFFE.ruecknahme);
    expect(r.gegenwette.stufe).toBe(DEFAULT_EINGRIFFE.gegenwette.stufe);
    expect(r.gegenwette.modus).toBe(DEFAULT_EINGRIFFE.gegenwette.modus);
  });

  it("ist im Regelwerk verankert und läuft durch sanitizeRules", () => {
    expect(DEFAULT_RULES.eingriffe).toEqual(DEFAULT_EINGRIFFE);
    expect(sanitizeRules({ ...DEFAULT_RULES, eingriffe: { sperrfristJeZiel: 999 } }).eingriffe.sperrfristJeZiel)
      .toBe(EINGRIFF_LIMITS.sperrfristJeZiel.max);
  });
});

// ── Teil E: das umgekehrte Modell ───────────────────────────
describe("gegenquote", () => {
  // 🔴 Die Zahlen stammen aus der Tabelle in `design/joker-sondermenue.md`
  // Teil E (Köln – Bayern, Quoten 5,20 · 4,74 · 1,50). Sie sind der Beleg
  // dafür, dass die Formel die dort dokumentierte ist und nicht eine ähnliche.
  it("rechnet die dokumentierten Fälle nach", () => {
    expect(gegenquote(0.667)).toBeCloseTo(3.0, 1);   // Tendenz Auswärtssieg
    expect(gegenquote(0.211)).toBeCloseTo(1.27, 2);  // Tendenz Remis
    expect(gegenquote(0.105)).toBeCloseTo(1.12, 2);  // Ergebnis 1:2
    expect(gegenquote(0.005)).toBeCloseTo(1.01, 2);  // Ergebnis 4:1
  });

  // 🔴 Das ist die Aussage, die die ganze Familie ohne Sperre auskommen lässt:
  // gegen das Sichere zu wetten lohnt sich von selbst nicht.
  it("das Modell reguliert sich selbst: je sicherer der Tipp, desto weniger zahlt die Wette dagegen", () => {
    expect(gegenquote(0.005)).toBeLessThan(gegenquote(0.667));
  });

  it("unmögliche Wetten geben null statt Unendlich", () => {
    expect(gegenquote(1)).toBeNull();
    expect(gegenquote(0)).toBeNull();
    expect(gegenquote(1.5)).toBeNull();
    expect(gegenquote(null)).toBeNull();
    expect(gegenquote("viel")).toBeNull();
  });
});

describe("gegenwetteErtrag", () => {
  it("geht der Tipp auf, ist der Einsatz weg", () => {
    expect(gegenwetteErtrag({ einsatz: 25, p: 0.667, getroffen: true })).toBe(-25);
  });

  it("geht er daneben, gibt es den Reingewinn — Einsatz mal (Gegenquote − 1)", () => {
    // Gegenquote 3,00 → 25 × 2 = 50.
    expect(gegenwetteErtrag({ einsatz: 25, p: 0.667, getroffen: false })).toBeCloseTo(50, 0);
  });

  // 🔴 JK9/JK10 in einer Zeile: gegen ein exaktes 4:1 zu wetten gewinnt fast
  // immer — und bringt bei 25 Punkten Einsatz ganze 0,13 Punkte. Ohne die
  // Ausnahme von `minPayout` wären daraus volle Punkte geworden, und das
  // Abgrasen sicherer Wetten wäre wieder lohnend.
  it("das Abgrasen sicherer Wetten lohnt nicht: viel Risiko, ein Prozent Ertrag", () => {
    const ertrag = gegenwetteErtrag({ einsatz: 25, p: 0.005, getroffen: false });
    expect(ertrag).toBeGreaterThan(0);
    expect(ertrag).toBeLessThan(0.2);
    expect(gegenwetteErtrag({ einsatz: 25, p: 0.005, getroffen: true })).toBe(-25);
  });

  it("ohne brauchbares p oder ohne Einsatz passiert nichts", () => {
    expect(gegenwetteErtrag({ einsatz: 25, p: null, getroffen: false })).toBe(0);
    expect(gegenwetteErtrag({ einsatz: 0, p: 0.5, getroffen: false })).toBe(0);
  });
});
