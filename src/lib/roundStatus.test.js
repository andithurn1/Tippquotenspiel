import { describe, it, expect } from "vitest";
import { computeMatchStatus, countTippedByUser, filterMatchesByTeams } from "./roundStatus";

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

describe("filterMatchesByTeams", () => {
  const bl = [
    { id: "m1", home: "FC Bayern München", away: "VfB Stuttgart" },
    { id: "m2", home: "SV Elversberg", away: "Bayer 04 Leverkusen" },
    { id: "m3", home: "RB Leipzig", away: "Borussia Mönchengladbach" },
  ];

  it("ohne Filter (null/leer) bleiben alle Matches", () => {
    expect(filterMatchesByTeams(bl, null)).toEqual(bl);
    expect(filterMatchesByTeams(bl, [])).toEqual(bl);
  });

  it("mit Filter bleibt ein Match, wenn MINDESTENS eine Seite ausgewählt ist", () => {
    const result = filterMatchesByTeams(bl, ["FC Bayern München", "Bayer 04 Leverkusen"]);
    expect(result.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("Match ohne ausgewähltes Team fällt raus", () => {
    const result = filterMatchesByTeams(bl, ["RB Leipzig"]);
    expect(result.map((m) => m.id)).toEqual(["m3"]);
  });
});

// ============================================================
//  🔴 Welche Spiele gehören zur Runde? (Befund vom 09.08.2026)
//
//  Bis dahin entschied das allein `team_filter` — eine flache Vereinsliste.
//  Gemessen: eine Runde „nur Bundesliga" umfasste 1943 statt 306 Spiele.
// ============================================================
import { rundenSpiele, rundenAuswahl } from "@/lib/roundStatus";

const KATALOG = [
  { matchId: "b1", home: "A", away: "B", matchday: 5, wettbewerb: "bl" },
  { matchId: "b2", home: "C", away: "D", matchday: 33, wettbewerb: "bl" },
  { matchId: "p1", home: "E", away: "F", matchday: 5, wettbewerb: "pl" },
  { matchId: "p2", home: "A", away: "G", matchday: 33, wettbewerb: "pl" },
];

describe("rundenSpiele — die eine Antwort auf Frage 1 der Runden-Schicht", () => {
  it("nimmt die eingefrorene Auswahl, nicht nur die Vereine", () => {
    const runde = { spiele: { wettbewerbe: ["bl"] } };
    expect(rundenSpiele(KATALOG, runde).map((m) => m.matchId)).toEqual(["b1", "b2"]);
  });

  it("Zeitraum und Wettbewerb wirken zusammen", () => {
    const runde = { spiele: { wettbewerbe: ["bl"], spieltagVon: 30 } };
    expect(rundenSpiele(KATALOG, runde).map((m) => m.matchId)).toEqual(["b2"]);
  });

  it("🔴 Runden von VOR der Umstellung laufen weiter über `team_filter`", () => {
    // Ohne diesen Rückfall verlören alle bestehenden Runden ihre Einschränkung
    // — und zwar still, mitten in der Saison.
    const alt = { team_filter: ["A"] };
    expect(rundenSpiele(KATALOG, alt).map((m) => m.matchId)).toEqual(["b1", "p2"]);
  });

  it("ohne beides gehört alles dazu", () => {
    expect(rundenSpiele(KATALOG, {}).length).toBe(4);
    expect(rundenSpiele(KATALOG, null).length).toBe(4);
  });
});

describe("rundenAuswahl — was beim Anlegen eingefroren wird", () => {
  it("🔴 ein übergebener teamFilter GEWINNT über die Vereinsliste im Regelwerk", () => {
    // Genau das ist beim ersten Anlauf schiefgegangen: die (leere) Auswahl aus
    // dem Regelwerk überstimmte den ausdrücklich übergebenen Filter, und neun
    // Tests schlugen an. CLAUDE.md: „die Runde gewinnt."
    const a = rundenAuswahl({ spiele: { modus: "alle" }, teamFilter: ["A", "C"] });
    expect(a.modus).toBe("teams");
    expect(a.teams).toEqual(["A", "C"]);
  });

  it("die übrigen Dimensionen kommen aus dem Regelwerk MIT", () => {
    // Der eigentliche Befund: sie gingen bisher verloren.
    const a = rundenAuswahl({
      spiele: { wettbewerbe: ["bl"], spieltagVon: 30, jeWettbewerb: { bl: { zonen: [{ von: 14, bis: 18 }] } } },
      teamFilter: ["A", "C"],
    });
    expect(a.wettbewerbe).toEqual(["bl"]);
    expect(a.spieltagVon).toBe(30);
    expect(a.jeWettbewerb.bl.zonen).toEqual([{ von: 14, bis: 18 }]);
  });

  it("ein zu kurzer teamFilter ändert nichts", () => {
    // Unter zwei Vereinen ist die Einschränkung ungültig (`sanitizeSpiele`).
    expect(rundenAuswahl({ spiele: { wettbewerbe: ["bl"] }, teamFilter: ["A"] }).modus).toBe("alle");
  });
});
