import { describe, it, expect } from "vitest";
import {
  FREMDJOKER_ARTEN, GEGEN_STUFEN, GEGEN_MODI, jokerArtVon,
  EINGRIFF_LIMITS, DEFAULT_EINGRIFFE, sanitizeEingriffe,
  sanitizeSperrKarte, sanitizeSichtKarte, sperreFuer, sichtFuer, wartezeit,
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
    for (const katalog of [GEGEN_STUFEN, GEGEN_MODI]) {
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

  // 🔴 Auch die SICHTBARKEIT steht je Fremdjoker (Andi, 23.08.2026: „ne, für
  // jeden Joker … einzeln einstellbar"). Vorgabe bleibt offen — ein Eingriff,
  // den man erst bei der Abrechnung sieht, erfüllt den Zweck der Familie nicht.
  it("die Sichtbarkeit ist eine Karte mit Standard und Abweichung je Art", () => {
    expect(sanitizeEingriffe({}).sichtbar).toEqual({ standard: true });
    expect(sichtFuer("block", {})).toBe(true);

    const eg = { sichtbar: { standard: true, gegenwette: false } };
    expect(sichtFuer("block", eg)).toBe(true);
    expect(sichtFuer("gegenwette", eg)).toBe(false);

    // Nur echte Booleans zählen als Abweichung, alles andere folgt dem Standard.
    const karte = sanitizeSichtKarte({ standard: false, block: true, klau: "vielleicht", quatsch: true });
    expect(karte.standard).toBe(false);
    expect(karte.block).toBe(true);
    expect(karte.klau).toBeUndefined();
    expect(karte.quatsch).toBeUndefined();
  });

  it("die beiden neuen Arten sind umgekehrt: nur ein ausdrückliches true schaltet ein", () => {
    expect(sanitizeEingriffe({}).trittbrett.enabled).toBe(false);
    expect(sanitizeEingriffe({}).gegenwette.enabled).toBe(false);
    expect(sanitizeEingriffe({ trittbrett: { enabled: 1 } }).trittbrett.enabled).toBe(false);
    expect(sanitizeEingriffe({ trittbrett: { enabled: true } }).trittbrett.enabled).toBe(true);
  });

  it("Zahlen werden auf EINGRIFF_LIMITS beschnitten", () => {
    const r = sanitizeEingriffe({
      sperrfrist: { standard: { spieltage: 99 } },
      trittbrett: { anteil: 5, kopierterBekommt: -3 },
      gegenwette: { einsatz: 0 },
    });
    expect(r.sperrfrist.standard.spieltage).toBe(EINGRIFF_LIMITS.spieltage.max);
    expect(r.trittbrett.anteil).toBe(EINGRIFF_LIMITS.anteil.max);
    expect(r.trittbrett.kopierterBekommt).toBe(EINGRIFF_LIMITS.kopierterBekommt.min);
    // JK10: eine Gegenwette ohne Einsatz gibt es nicht — 0 fällt auf das Minimum.
    expect(r.gegenwette.einsatz).toBe(EINGRIFF_LIMITS.einsatz.min);
  });

  it("unbekannte Schlüsselwerte fallen auf die Vorgabe", () => {
    const r = sanitizeEingriffe({ gegenwette: { stufe: "gefühl", modus: "hä" } });
    expect(r.gegenwette.stufe).toBe(DEFAULT_EINGRIFFE.gegenwette.stufe);
    expect(r.gegenwette.modus).toBe(DEFAULT_EINGRIFFE.gegenwette.modus);
  });

  it("ist im Regelwerk verankert und läuft durch sanitizeRules", () => {
    expect(DEFAULT_RULES.eingriffe).toEqual(DEFAULT_EINGRIFFE);
    expect(sanitizeRules({ ...DEFAULT_RULES, eingriffe: { sperrfrist: { standard: { spieltage: 999 } } } })
      .eingriffe.sperrfrist.standard.spieltage).toBe(EINGRIFF_LIMITS.spieltage.max);
  });
});

// ── JK5, drei Ebenen tief ───────────────────────────────────
// 🔴 Andis Ansage vom 23.08.2026: „für jeden Joker Sperrfrist einzeln
// einstellbar, und mach bei sowas auch weitere Option zur Feineinstellung
// durch weiteren Klick … sodass sich bspw. einstellen lässt, es gibt nicht das
// Verbot, das doppelt hintereinander einzusetzen, aber der Cooldown verändert
// sich dadurch eben."
describe("Sperrfrist: Standard, Abweichung je Art, Verhalten", () => {
  it("die Karte speichert nur, was wirklich abweicht", () => {
    const k = sanitizeSperrKarte({ standard: { spieltage: 2 }, block: { spieltage: 5 }, klau: {} });
    expect(k.standard).toEqual({ spieltage: 2, aufschlag: 0, hoechstens: 0 });
    expect(k.block).toEqual({ spieltage: 5 });
    // `klau` weicht nicht ab → steht gar nicht erst in der Karte.
    expect(k.klau).toBeUndefined();
    // Unbekannte Schlüssel fliegen raus.
    expect(sanitizeSperrKarte({ quatsch: { spieltage: 3 } }).quatsch).toBeUndefined();
  });

  it("`sperreFuer` legt die Abweichung über den Standard — je Art", () => {
    const eg = { sperrfrist: { standard: { spieltage: 2 }, block: { spieltage: 5 } } };
    expect(sperreFuer("block", eg).spieltage).toBe(5);
    expect(sperreFuer("klau", eg).spieltage).toBe(2);
    // Auch ohne Art: der Standard.
    expect(sperreFuer(null, eg).spieltage).toBe(2);
  });

  // 🔴 DIE Formel, an einem durchgerechneten Fall. Beide Verhalten aus EINER
  // Zeile — das ist der Grund, warum es kein zusätzliches Modus-Feld gibt.
  it("`aufschlag: 0` ist die feste Sperre, die es immer gab", () => {
    const fest = { spieltage: 2, aufschlag: 0, hoechstens: 0 };
    expect(wartezeit(fest, 1)).toBe(2);
    expect(wartezeit(fest, 2)).toBe(2);
    expect(wartezeit(fest, 5)).toBe(2);
  });

  it("Andis Fall: kein Verbot beim zweiten Mal, aber der Cooldown wächst dadurch", () => {
    const wachsend = { spieltage: 0, aufschlag: 2, hoechstens: 0 };
    // Einmal getroffen → gar keine Wartezeit, direkt wieder erlaubt.
    expect(wartezeit(wachsend, 1)).toBe(0);
    // Und GENAU DADURCH wächst sie: vor dem dritten sind es 2 Spieltage.
    expect(wartezeit(wachsend, 2)).toBe(2);
    expect(wartezeit(wachsend, 3)).toBe(4);
    expect(wartezeit(wachsend, 4)).toBe(6);
  });

  it("`hoechstens` deckelt die gewachsene Wartezeit", () => {
    const gedeckelt = { spieltage: 0, aufschlag: 2, hoechstens: 4 };
    expect(wartezeit(gedeckelt, 3)).toBe(4);
    expect(wartezeit(gedeckelt, 9)).toBe(4);
  });

  it("ohne Treffer gibt es nie eine Wartezeit", () => {
    expect(wartezeit({ spieltage: 9, aufschlag: 9 }, 0)).toBe(0);
  });

  // 🔴 Die Vorgabe ist hier ausgeschrieben und nicht aus dem Modul geholt:
  // ein Test, der die Vorgabe gegen sich selbst prüft, kann nicht scheitern.
  it("die Vorgabe ändert an bestehenden Runden nichts", () => {
    expect(DEFAULT_EINGRIFFE.sperrfrist.standard).toEqual({ spieltage: 0, aufschlag: 0, hoechstens: 0 });
    expect(wartezeit(DEFAULT_EINGRIFFE.sperrfrist.standard, 5)).toBe(0);
  });
});

// ── Teil E: das umgekehrte Modell ───────────────────────────
// 🔴 Der Fund vom 23.08.2026 an der eigenen Arbeit: eine erste Fassung trug
// hier ein Feld `ruecknahme`, obwohl `jokerBasis.widerruf` dieselbe Frage
// längst beantwortet — je Art, und von der Tippabgabe beim Speichern
// durchgesetzt. Dieser Test hält fest, dass es kein zweites Feld gibt.
describe("kein zweiter Rücknahme-Regler", () => {
  it("die Familie trägt kein eigenes Rücknahme-Feld", () => {
    expect(Object.keys(DEFAULT_EINGRIFFE)).not.toContain("ruecknahme");
    expect(sanitizeEingriffe({ ruecknahme: "nein" }).ruecknahme).toBeUndefined();
  });

  it("`jokerArtVon` findet die Grundform jeder der vier Arten", () => {
    expect(jokerArtVon("klau")).toBe("duell.klau");
    expect(jokerArtVon("block")).toBe("duell.block");
    expect(jokerArtVon("trittbrett")).toBe("eingriffe.trittbrett");
    expect(jokerArtVon("gegenwette")).toBe("eingriffe.gegenwette");
    expect(jokerArtVon("quatsch")).toBeNull();
  });
});

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
