import { describe, it, expect } from "vitest";
import { generateJoinCode } from "./joinCode";

describe("generateJoinCode", () => {
  it("erzeugt Codes der Standardlänge 6 aus dem erlaubten Alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/); // kein O, I, 0, 1
    }
  });

  it("respektiert eine andere Länge", () => {
    expect(generateJoinCode(4)).toHaveLength(4);
    expect(generateJoinCode(10)).toHaveLength(10);
  });
});
