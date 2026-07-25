import { describe, it, expect, afterEach } from "vitest";
import {
  C, sanitizeFanColors, relativeLuminance, contrastRatio, readableInk,
  deriveRoles, applyFanColors, resetTheme, CLUB_PRESETS,
} from "@/lib/theme";

afterEach(() => resetTheme()); // gemeinsames COLORS-Objekt sauber zurücksetzen

describe("sanitizeFanColors", () => {
  it("behält nur gültige #rrggbb und höchstens drei", () => {
    expect(sanitizeFanColors(["#FF0000", "rot", "#00ff00", "#0000FF", "#123456"]))
      .toEqual(["#ff0000", "#00ff00", "#0000ff"]);
  });
  it("liefert bei Unfug ein leeres Array", () => {
    expect(sanitizeFanColors(null)).toEqual([]);
    expect(sanitizeFanColors(["nope", 42, "# zzz"])).toEqual([]);
  });
});

describe("Luminanz & Kontrast", () => {
  it("Weiß hell, Schwarz dunkel", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 2);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 2);
  });
  it("Schwarz auf Weiß ist maximaler Kontrast (21:1)", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
  it("readableInk wählt dunkel auf hellem Grund, hell auf dunklem", () => {
    expect(readableInk("#f5c451")).toBe("#0B0E1F"); // helles Gold → dunkler Text
    expect(readableInk("#111111")).toBe("#EDEEF6"); // fast schwarz → heller Text
  });
});

describe("deriveRoles", () => {
  it("leere Auswahl → Grundwerte", () => {
    const roles = deriveRoles([]);
    expect(roles.gold).toBeDefined();
    expect(roles.indigo).toBeDefined();
  });
  it("fehlende Farbe 2/3 fällt auf Farbe 1 zurück", () => {
    const roles = deriveRoles(["#ff8800"]);
    expect(roles.indigo).toBe(roles.gold);
    expect(roles.violet).toBe(roles.gold);
  });
  it("hellt sehr dunkle Vereinsfarben auf, bis sie lesbar sind", () => {
    const roles = deriveRoles(["#0a0a0a"]); // fast schwarz
    expect(contrastRatio(roles.gold, "#0B0E1F")).toBeGreaterThanOrEqual(3.2);
  });
  it("lässt gut lesbare Farben unverändert", () => {
    const roles = deriveRoles(["#ffce00", "#1b4e9b", "#4fd18b"]);
    expect(roles.gold).toBe("#ffce00");
  });
});

describe("applyFanColors / resetTheme (mutiert das gemeinsame C)", () => {
  it("setzt die Akzent-Rollen und stellt sie zurück", () => {
    const base = C.gold;
    applyFanColors(["#ff00aa"]);
    expect(C.gold).not.toBe(base);
    expect(C.gold).toBe("#ff00aa");
    resetTheme();
    expect(C.gold).toBe(base);
  });
  it("tastet Wertungsfarben (mint/coral) und Gerüst nie an", () => {
    const { mint, coral, ink, text } = C;
    applyFanColors(["#123456", "#654321", "#abcdef"]);
    expect(C.mint).toBe(mint);
    expect(C.coral).toBe(coral);
    expect(C.ink).toBe(ink);
    expect(C.text).toBe(text);
  });
});

describe("CLUB_PRESETS", () => {
  it("jedes Preset hat gültige, lesbar ableitbare Farben", () => {
    for (const p of CLUB_PRESETS) {
      expect(sanitizeFanColors(p.colors).length).toBeGreaterThanOrEqual(2);
      const roles = deriveRoles(p.colors);
      expect(contrastRatio(roles.gold, "#0B0E1F")).toBeGreaterThanOrEqual(3.2);
    }
  });
});
