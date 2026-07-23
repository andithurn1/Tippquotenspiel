import { describe, it, expect } from "vitest";
import { computeMatchStatus, countTippedByUser } from "./roundStatus";

const now = new Date("2026-07-23T00:00:00Z");
const matches = [
  { id: "m1", kickoff: "2026-06-20T18:45:00Z" }, // Vergangenheit
  { id: "m2", kickoff: "2026-08-28T18:30:00Z" }, // Zukunft
  { id: "m3", kickoff: "2026-09-05T13:30:00Z" }, // Zukunft
];

describe("computeMatchStatus", () => {
  it("zählt offene (Kickoff in der Zukunft) und geschlossene Matches korrekt", () => {
    const s = computeMatchStatus(matches, now);
    expect(s).toEqual({ total: 3, open: 2, closed: 1 });
  });

  it("leere Liste ergibt alles 0", () => {
    expect(computeMatchStatus([], now)).toEqual({ total: 0, open: 0, closed: 0 });
  });
});

describe("countTippedByUser", () => {
  const tips = [
    { user_id: "u1", match_id: "m1" },
    { user_id: "u1", match_id: "m2" },
    { user_id: "u2", match_id: "m1" },
  ];

  it("zählt eindeutige Matches, auf die dieser Nutzer schon getippt hat", () => {
    expect(countTippedByUser(tips, "u1")).toBe(2);
    expect(countTippedByUser(tips, "u2")).toBe(1);
    expect(countTippedByUser(tips, "u-unbekannt")).toBe(0);
  });

  it("ohne userId (Gast) ergibt 0, statt zu crashen", () => {
    expect(countTippedByUser(tips, null)).toBe(0);
    expect(countTippedByUser(tips, undefined)).toBe(0);
  });
});
