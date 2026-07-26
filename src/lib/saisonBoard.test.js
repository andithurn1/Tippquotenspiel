import { describe, it, expect } from "vitest";
import { withSaisonPunkte } from "./saisonBoard";

// Die eine Stelle, an der Saison-Wetten aufs Leaderboard kommen — für BEIDE
// Stores. Hier die Kanten; das Zusammenspiel mit echten Ergebnissen prüft
// store.test.js.

const BOARD = [
  { userId: "u-a", name: "Anna", total: 100, tips: 2, gewertet: 2, rank: 1 },
  { userId: "u-b", name: "Bert", total: 40, tips: 1, gewertet: 1, rank: 2 },
];
const AUS = { saison: { enabled: false } };
// Aktive Saison ohne auswertbare Wette: die Punkte bleiben 0, aber die
// Board-Zusammenstellung greift — genau das wird hier geprüft.
const AN = { saison: { enabled: true, gewicht: 1, wetten: [] } };

describe("withSaisonPunkte", () => {
  it("lässt das Board unverändert, wenn die Saison aus ist", () => {
    expect(withSaisonPunkte({ board: BOARD, rules: AUS, seasonTips: [{ user_id: "u-x", wetten_id: "meister", wert: "A" }] }))
      .toEqual(BOARD);
  });

  it("weist die Saison-Punkte als eigenes Feld aus und rankt neu", () => {
    const board = withSaisonPunkte({ board: BOARD, rules: AN, seasonTips: [] });
    expect(board.map((e) => e.saison)).toEqual([0, 0]);
    expect(board.map((e) => e.rank)).toEqual([1, 2]);
  });

  it("nimmt einen reinen Saison-Tipper ins Board auf, der noch keinen Match-Tipp hat", () => {
    const board = withSaisonPunkte({
      board: BOARD, rules: AN,
      seasonTips: [{ user_id: "u-c", wetten_id: "meister", wert: "Bayern" }],
      nameOf: (id) => (id === "u-c" ? "Cem" : id),
    });
    const cem = board.find((e) => e.userId === "u-c");
    expect(cem).toMatchObject({ name: "Cem", total: 0, tips: 0, gewertet: 0, saison: 0 });
    expect(board).toHaveLength(3);
  });

  it("fällt ohne bekannten Namen auf die Nutzer-Id zurück (statt undefined zu sortieren)", () => {
    const board = withSaisonPunkte({
      board: [], rules: AN,
      seasonTips: [{ user_id: "u-fremd", wetten_id: "meister", wert: "Bayern" }],
      nameOf: () => null,
    });
    expect(board[0].name).toBe("u-fremd");
  });

  it("zählt einen Nutzer nicht doppelt, wenn er mehrere Saison-Wetten abgegeben hat", () => {
    const board = withSaisonPunkte({
      board: [], rules: AN,
      seasonTips: [
        { user_id: "u-c", wetten_id: "meister", wert: "Bayern" },
        { user_id: "u-c", wetten_id: "torschuetzenkoenig", wert: "Kane" },
      ],
    });
    expect(board).toHaveLength(1);
  });
});
