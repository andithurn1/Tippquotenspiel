import { describe, it, expect } from "vitest";
import { GLOSSARY, getGlossary } from "./glossary";

describe("Glossar", () => {
  it("jeder Eintrag hat einen Begriff und einen Erklärtext", () => {
    for (const [key, entry] of Object.entries(GLOSSARY)) {
      expect(key.length).toBeGreaterThan(0);
      expect(entry.term.length).toBeGreaterThan(0);
      expect(entry.text.length).toBeGreaterThan(20);
    }
  });

  it("getGlossary liefert den Eintrag oder null bei unbekanntem Key", () => {
    expect(getGlossary("quote").term).toBe("Quote");
    expect(getGlossary("gibtsnicht")).toBeNull();
  });
});
