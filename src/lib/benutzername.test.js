import { describe, it, expect } from "vitest";
import {
  namensSchluessel, gleicherName, istFrei, jahresZusatz,
  namensVorschlaege, namensHinweis,
} from "@/lib/benutzername";
import { NAME_LIMITS } from "@/lib/avatars";

describe("Wann ist es derselbe Name?", () => {
  it("Groß-/Kleinschreibung macht keinen Unterschied", () => {
    expect(gleicherName("Andi", "andi")).toBe(true);
    expect(gleicherName("ANDI", "Andi")).toBe(true);
  });

  it("Mehrfach-Leerzeichen und Rand-Leerzeichen auch nicht", () => {
    expect(gleicherName("Der  Kaiser", " der kaiser ")).toBe(true);
  });

  it("verschiedene Namen bleiben verschieden", () => {
    expect(gleicherName("Andi", "Andi2")).toBe(false);
    expect(gleicherName("Andi", "Andy")).toBe(false);
  });

  it("leer ist nie gleich — auch nicht mit leer", () => {
    expect(gleicherName("", "")).toBe(false);
    expect(gleicherName("  ", null)).toBe(false);
  });

  // 🔴 Muss zum Index in schema.sql passen (`lower(display_name)`), sonst
  // sagt die App „frei" und die Datenbank „belegt".
  it("der Schlüssel ist kleingeschrieben und normalisiert", () => {
    expect(namensSchluessel("  Der  Kaiser ")).toBe("der kaiser");
  });
});

describe("istFrei", () => {
  const belegt = ["Andi", "Kemal", "Der Kaiser"];

  it("erkennt Belegtes unabhängig von der Schreibweise", () => {
    expect(istFrei("andi", belegt)).toBe(false);
    expect(istFrei("DER KAISER", belegt)).toBe(false);
  });

  it("lässt Freies durch", () => {
    expect(istFrei("Andi95", belegt)).toBe(true);
  });

  it("ein leerer Name ist nie frei", () => {
    expect(istFrei("", belegt)).toBe(false);
    expect(istFrei("   ", belegt)).toBe(false);
  });
});

describe("Geburtsjahr-Zusatz (Andis erster Vorschlag)", () => {
  it("1995 wird zu 95", () => expect(jahresZusatz(1995)).toBe("95"));
  it("2003 wird zu 03 — mit führender Null", () => expect(jahresZusatz(2003)).toBe("03"));
  it("Unsinn ergibt null statt eines geratenen Zusatzes", () => {
    for (const x of [null, undefined, "abc", 42, 1800, 2200, 19.95]) {
      expect(jahresZusatz(x), String(x)).toBeNull();
    }
  });
});

describe("Vorschläge", () => {
  const belegt = ["Andi", "Andi2", "Andi3"];

  it("das Geburtsjahr steht vorn, wenn es eines gibt", () => {
    const v = namensVorschlaege("Andi", belegt, { geburtsjahr: 1995 });
    expect(v[0]).toBe("Andi95");
  });

  // ⚠️ Pflicht, nicht Zierde: KT9 (Geburtsdatum) gibt es noch gar nicht.
  it("ohne Geburtsjahr kommt die laufende Zahl", () => {
    const v = namensVorschlaege("Andi", belegt);
    expect(v[0]).toBe("Andi4");     // 2 und 3 sind belegt
  });

  it("schlägt NIE etwas vor, das schon vergeben ist", () => {
    const viele = ["Andi", ...Array.from({ length: 40 }, (_, i) => `Andi${i + 2}`)];
    for (const v of namensVorschlaege("Andi", viele, { anzahl: 5 })) {
      expect(istFrei(v, viele), v).toBe(true);
    }
  });

  it("bleibt in der Längengrenze — der Stamm wird gekürzt, nicht der Zusatz", () => {
    const lang = "A".repeat(NAME_LIMITS.max);
    const v = namensVorschlaege(lang, [lang], { geburtsjahr: 1995 });
    expect(v[0].length).toBeLessThanOrEqual(NAME_LIMITS.max);
    expect(v[0].endsWith("95")).toBe(true);
  });

  it("auch wenn 99 Namensvettern da sind, kommt noch ein Vorschlag", () => {
    const alle = ["Andi", ...Array.from({ length: 120 }, (_, i) => `Andi${i + 2}`)];
    const v = namensVorschlaege("Andi", alle, { anzahl: 2 });
    expect(v.length).toBe(2);
    for (const n of v) expect(istFrei(n, alle), n).toBe(true);
  });

  it("ein unbrauchbarer Wunsch ergibt keine Vorschläge", () => {
    expect(namensVorschlaege("a", [])).toEqual([]);
    expect(namensVorschlaege("", [])).toEqual([]);
  });
});

describe("Ein Satz für die Oberfläche", () => {
  it("frei → grün und ohne Vorschläge", () => {
    const h = namensHinweis("Neuling", ["Andi"]);
    expect(h.frei).toBe(true);
    expect(h.vorschlaege).toEqual([]);
  });

  it("vergeben → Vorschläge stehen im Satz", () => {
    const h = namensHinweis("Andi", ["Andi"], { geburtsjahr: 1995 });
    expect(h.frei).toBe(false);
    expect(h.vorschlaege).toContain("Andi95");
    expect(h.text).toContain("Andi95");
  });

  it("zu kurz → sagt die Regel, statt Vorschläge zu erfinden", () => {
    const h = namensHinweis("a", []);
    expect(h.frei).toBe(false);
    expect(h.ton).toBe("fehler");
    expect(h.vorschlaege).toEqual([]);
  });
});
