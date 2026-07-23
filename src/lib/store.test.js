import { describe, it, expect } from "vitest";
import { createMockStore } from "./store.mock";
import { DEMO_ROUND_ID, DEMO_JOIN_CODE } from "./constants";
import { DEFAULT_RULES, RULE_LIMITS } from "./engine";

describe("Mock-Store — Seed & Schnittstelle", () => {
  it("liefert das Demo-Match JOR-ESP mit Snapshot und Ergebnis", async () => {
    const store = createMockStore();
    const m = await store.getMatch("JOR-ESP");
    expect(m.home).toBe("Jordanien");
    expect(m.result).toEqual({ home: 5, away: 1, playerGoals: { "Al-Naimat": 2, "Yamal": 1 } });
    expect(await store.getMatch("XXX")).toBeNull();
  });

  it("Demo-Runde ist per Code und Id auffindbar, mit 5 Mitgliedern", async () => {
    const store = createMockStore();
    const byCode = await store.getRoundByCode(DEMO_JOIN_CODE);
    expect(byCode.id).toBe(DEMO_ROUND_ID);
    expect((await store.getRound(DEMO_ROUND_ID)).name).toBe("Freundeskreis");
    expect(await store.listMembers(DEMO_ROUND_ID)).toHaveLength(5);
  });

  it("Leaderboard rankt die 5 Demo-Tipps über die Engine", async () => {
    const store = createMockStore();
    const board = await store.getLeaderboard(DEMO_ROUND_ID);
    expect(board).toHaveLength(5);
    expect(board.map((b) => b.rank)).toEqual([1, 2, 3, 4, 5]);
    // absteigend sortiert
    for (let i = 1; i < board.length; i++) {
      expect(board[i - 1].total).toBeGreaterThanOrEqual(board[i].total);
    }
    // jeder Demo-Spieler hat genau einen gewerteten Tipp
    expect(board.every((b) => b.tips === 1 && b.gewertet === 1)).toBe(true);
  });

  it("saveTip legt an und aktualisiert denselben Tipp (kein Duplikat)", async () => {
    const store = createMockStore();
    const snap = (await store.getMatch("JOR-ESP")).snapshot;
    await store.saveTip({ roundId: DEMO_ROUND_ID, matchId: "JOR-ESP", userId: "u-neu", tip: { home: 3, away: 3 }, snapshot: snap });
    let mine = await store.listTips({ roundId: DEMO_ROUND_ID, matchId: "JOR-ESP" });
    const neu = mine.filter((t) => t.user_id === "u-neu");
    expect(neu).toHaveLength(1);
    expect(neu[0].tip).toEqual({ home: 3, away: 3 });

    await store.saveTip({ roundId: DEMO_ROUND_ID, matchId: "JOR-ESP", userId: "u-neu", tip: { home: 1, away: 0 }, snapshot: snap });
    mine = await store.listTips({ roundId: DEMO_ROUND_ID, matchId: "JOR-ESP" });
    expect(mine.filter((t) => t.user_id === "u-neu")).toHaveLength(1);
    expect(mine.find((t) => t.user_id === "u-neu").tip).toEqual({ home: 1, away: 0 });
  });

  it("joinRound ist idempotent (kein doppeltes Mitglied)", async () => {
    const store = createMockStore();
    await store.joinRound({ roundId: DEMO_ROUND_ID, userId: "u-neu", name: "Neu" });
    await store.joinRound({ roundId: DEMO_ROUND_ID, userId: "u-neu", name: "Neu" });
    const members = await store.listMembers(DEMO_ROUND_ID);
    expect(members.filter((m) => m.user_id === "u-neu")).toHaveLength(1);
    expect(members).toHaveLength(6);
  });

  it("listRoundsForUser liefert alle Runden eines Mitglieds, keine fremden", async () => {
    const store = createMockStore();
    const eigene = await store.createRound({ name: "Büro-Liga", adminId: "u-du", rules: DEFAULT_RULES });
    const fremde = await store.createRound({ name: "Fremd", adminId: "u-anderer", rules: DEFAULT_RULES });
    const meine = await store.listRoundsForUser("u-du");
    expect(meine.map((r) => r.id)).toEqual(expect.arrayContaining([DEMO_ROUND_ID, eigene.id]));
    expect(meine.map((r) => r.id)).not.toContain(fremde.id);
  });

  it("getLeaderboardHistory: Demo-Runde hat nur JOR-ESP (matchday 14) → ein Historien-Eintrag", async () => {
    const store = createMockStore();
    const history = await store.getLeaderboardHistory(DEMO_ROUND_ID);
    expect(history).toHaveLength(1);
    expect(history[0].matchday).toBe(14);
    expect(history[0].board).toHaveLength(5);
  });
});

describe("createRound", () => {
  it("legt eine neue Runde mit generiertem Beitritts-Code an, Admin wird Mitglied", async () => {
    const store = createMockStore();
    const round = await store.createRound({ name: "Büro-Liga", adminId: "u-chef", adminName: "Chef", rules: DEFAULT_RULES });
    expect(round.join_code).toHaveLength(6);
    expect(round.name).toBe("Büro-Liga");
    expect(await store.getRoundByCode(round.join_code)).toEqual(round);
    const members = await store.listMembers(round.id);
    expect(members).toContainEqual({ round_id: round.id, user_id: "u-chef", name: "Chef" });
  });

  it("sanitized ein unvollständiges/übertriebenes Regelwerk beim Anlegen", async () => {
    const store = createMockStore();
    const round = await store.createRound({ name: "X", adminId: "u1", rules: { k: 99 } });
    expect(round.rules.k).toBeLessThanOrEqual(RULE_LIMITS.k.max);
  });

  it("neue Runde ist unabhängig von der Demo-Runde (eigenes, leeres Leaderboard)", async () => {
    const store = createMockStore();
    const round = await store.createRound({ name: "Neu", adminId: "u1", rules: DEFAULT_RULES });
    expect(await store.getLeaderboard(round.id)).toEqual([]);
    expect(await store.getLeaderboard(DEMO_ROUND_ID)).toHaveLength(5); // Demo-Runde unberührt
  });

  it("ohne Namen bekommt die Runde einen Standardnamen", async () => {
    const store = createMockStore();
    const round = await store.createRound({ adminId: "u1", rules: DEFAULT_RULES });
    expect(round.name).toBe("Neue Runde");
  });

  it("team_filter: mit ≥2 Teams wird er übernommen, sonst null (alle Spiele)", async () => {
    const store = createMockStore();
    const gefiltert = await store.createRound({
      adminId: "u1", rules: DEFAULT_RULES, teamFilter: ["FC Bayern München", "Borussia Dortmund"],
    });
    expect(gefiltert.team_filter).toEqual(["FC Bayern München", "Borussia Dortmund"]);

    const ohne = await store.createRound({ adminId: "u1", rules: DEFAULT_RULES });
    expect(ohne.team_filter).toBeNull();

    const zuWenig = await store.createRound({ adminId: "u1", rules: DEFAULT_RULES, teamFilter: ["Nur Ein Team"] });
    expect(zuWenig.team_filter).toBeNull();
  });
});
