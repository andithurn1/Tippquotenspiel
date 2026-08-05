import { describe, it, expect } from "vitest";
import { createMockStore } from "./store.mock";
import { DEMO_ROUND_ID, DEMO_JOIN_CODE } from "./constants";
import { DEFAULT_RULES, RULE_LIMITS, sanitizeRules } from "./engine";
import { zeitachse, rundenSpieltagVon } from "./zeitachse";

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

describe("Kurzcode-Presets (publishPreset / getPresetByCode)", () => {
  it("veröffentlicht ein Regelwerk unter einem kurzen Code, der wieder abrufbar ist", async () => {
    const store = createMockStore();
    const pub = await store.publishPreset({ name: "Hardcore", rules: { ...DEFAULT_RULES, k: 1.2 }, creatorId: "u-du" });
    expect(pub.code).toHaveLength(6);
    expect(pub.name).toBe("Hardcore");

    const loaded = await store.getPresetByCode(pub.code);
    expect(loaded.rules.k).toBe(1.2);
    expect(loaded.name).toBe("Hardcore");
  });

  it("Code ist case-insensitiv abrufbar, unbekannter Code ergibt null", async () => {
    const store = createMockStore();
    const pub = await store.publishPreset({ name: "X", rules: DEFAULT_RULES, creatorId: "u-du" });
    expect(await store.getPresetByCode(pub.code.toLowerCase())).not.toBeNull();
    expect(await store.getPresetByCode("ZZZZZZ")).toBeNull();
  });

  it("sanitized das Regelwerk beim Veröffentlichen", async () => {
    const store = createMockStore();
    const pub = await store.publishPreset({ name: "Böse", rules: { k: 99, hack: true }, creatorId: "u-du" });
    expect(pub.rules.k).toBeLessThanOrEqual(RULE_LIMITS.k.max);
    expect(pub.rules.hack).toBeUndefined();
  });
});

describe("Spieltag öffnen (openMatchday)", () => {
  it("friert den Spieltag ein und markiert JEDES Spiel als geprüft", async () => {
    const store = createMockStore();
    const ergebnis = await store.openMatchday(DEMO_ROUND_ID, 1, "bl");
    expect(ergebnis.veraendert).toBe(true);
    const alle = await store.listMatches();
    const spieltag = alle.filter((m) => m.matchday === 1 && m.wettbewerb === "bl");
    expect(spieltag.length).toBeGreaterThan(0);
    for (const m of spieltag) expect(m.snapshot.bigGameGeprueft).toBe(true);
    // Genau EIN Spiel trägt den Spannungswert des Topspiels.
    expect(spieltag.filter((m) => Number.isFinite(m.snapshot.bigGameWert))).toHaveLength(1);
  });

  it("ein zweiter Aufruf ändert nichts mehr (der eingefrorene Stand gilt)", async () => {
    const store = createMockStore();
    await store.openMatchday(DEMO_ROUND_ID, 1, "bl");
    const vorher = (await store.listMatches()).find((m) => Number.isFinite(m.snapshot.bigGameWert));
    const zweite = await store.openMatchday(DEMO_ROUND_ID, 1, "bl");
    expect(zweite.veraendert).toBe(false);
    expect(zweite.schonOffen).toBe(true);
    const nachher = (await store.listMatches()).find((m) => Number.isFinite(m.snapshot.bigGameWert));
    expect(nachher.id).toBe(vorher.id);
    expect(nachher.snapshot.bigGameWert).toBe(vorher.snapshot.bigGameWert);
  });

  // Der Mock hat für die ganze simulierte Saison Ergebnisse vorab. Zählte er
  // sie alle als „gespielt", wäre die Tabelle am 1. Spieltag die ENDTABELLE —
  // das Topspiel würde nach Plätzen gewählt, die noch niemand kennen kann.
  it("die Tabelle beim Öffnen kennt nur wirklich gespielte Spiele", async () => {
    const store = createMockStore();
    await store.openMatchday(DEMO_ROUND_ID, 1, "bl");
    const top = (await store.listMatches()).find((m) => Number.isFinite(m.snapshot.bigGameWert));
    // Am 1. Spieltag gibt es keine Tabelle → die Begründung darf sich nicht auf
    // Tabellenplätze stützen.
    expect(top.snapshot.bigGameGrund).not.toMatch(/Platz \d+/);
  });

  it("öffnet je WETTBEWERB, nicht quer über alle (Spieltag 1 gibt es zweimal)", async () => {
    const store = createMockStore();
    await store.openMatchday(DEMO_ROUND_ID, 1, "bl");
    const alle = await store.listMatches();
    const cl = alle.filter((m) => m.matchday === 1 && m.wettbewerb === "cl");
    expect(cl.length).toBeGreaterThan(0);
    for (const m of cl) expect(m.snapshot.bigGameGeprueft).toBeUndefined();
  });
});

describe("Saison-Wetten (saveSeasonTip / listSeasonTips + Leaderboard)", () => {
  it("speichert einen Saison-Tipp und aktualisiert ihn beim erneuten Abgeben (kein Duplikat)", async () => {
    const store = createMockStore();
    await store.saveSeasonTip({ roundId: DEMO_ROUND_ID, userId: "u-du", wettenId: "meister", wert: "FC Bayern München" });
    let mine = await store.listSeasonTips({ roundId: DEMO_ROUND_ID, userId: "u-du" });
    expect(mine).toHaveLength(1);
    expect(mine[0].wert).toBe("FC Bayern München");

    await store.saveSeasonTip({ roundId: DEMO_ROUND_ID, userId: "u-du", wettenId: "meister", wert: "Borussia Dortmund" });
    mine = await store.listSeasonTips({ roundId: DEMO_ROUND_ID, userId: "u-du" });
    expect(mine).toHaveLength(1);
    expect(mine[0].wert).toBe("Borussia Dortmund");
  });

  it("listSeasonTips filtert nach Nutzer bzw. gibt alle der Runde zurück", async () => {
    const store = createMockStore();
    await store.saveSeasonTip({ roundId: DEMO_ROUND_ID, userId: "u-du", wettenId: "meister", wert: "A" });
    await store.saveSeasonTip({ roundId: DEMO_ROUND_ID, userId: "u-lena", wettenId: "meister", wert: "B" });
    expect(await store.listSeasonTips({ roundId: DEMO_ROUND_ID })).toHaveLength(2);
    expect(await store.listSeasonTips({ roundId: DEMO_ROUND_ID, userId: "u-du" })).toHaveLength(1);
  });

  it("ohne aktive Saison verändert ein Saison-Tipp das Leaderboard nicht", async () => {
    const store = createMockStore();
    await store.saveSeasonTip({ roundId: DEMO_ROUND_ID, userId: "u-du", wettenId: "meister", wert: "FC Bayern München" });
    const board = await store.getLeaderboard(DEMO_ROUND_ID);
    expect(board.every((b) => b.saison === undefined)).toBe(true); // Demo-Runde hat saison aus
  });

  it("mit aktiver Saison trägt ein Treffer eine eigene saison-Zeile ins Board", async () => {
    const store = createMockStore();
    // Runde mit aktiver Saison-Wette: „Meister" (aus den simulierten Ergebnissen ermittelbar)
    const round = await store.createRound({
      name: "Saison-Runde", adminId: "u-du", adminName: "Du", rules: DEFAULT_RULES,
    });
    // Regelwerk der Runde direkt mit Saison versehen (Admin ist Premium im Mock)
    const r = await store.getRound(round.id);
    r.rules = { ...r.rules, saison: { enabled: true, gewicht: 1, wetten: [{ key: "meister", punkte: 300 }] } };
    // echten Meister aus den Match-Ergebnissen bestimmen und darauf tippen
    const { scoreSaison } = await import("./saisonwetten");
    const matches = await store.listMatches();
    const meister = scoreSaison({ matches, tipps: {}, saison: r.rules.saison }).zeilen[0].gewinner[0];
    // u-du tippt auch ein Match, damit er im (Spieltags-)Leaderboard erscheint
    const jor = await store.getMatch("JOR-ESP");
    await store.saveTip({ roundId: round.id, matchId: "JOR-ESP", userId: "u-du", tip: { home: 2, away: 1, goals: { home: [], away: [] } }, snapshot: jor.snapshot });
    await store.saveSeasonTip({ roundId: round.id, userId: "u-du", wettenId: "meister", wert: meister });
    const board = await store.getLeaderboard(round.id);
    const du = board.find((b) => b.userId === "u-du");
    expect(du.saison).toBe(300);
    expect(du.total).toBeGreaterThanOrEqual(300);
  });

  it("ein reiner Saison-Tipper steht im Board — auch ohne einen einzigen Match-Tipp", async () => {
    const store = createMockStore();
    const round = await store.createRound({
      name: "Saison-Runde", adminId: "u-du", adminName: "Du", rules: DEFAULT_RULES,
    });
    const r = await store.getRound(round.id);
    r.rules = { ...r.rules, saison: { enabled: true, gewicht: 1, wetten: [{ key: "meister", punkte: 300 }] } };
    const { scoreSaison } = await import("./saisonwetten");
    const matches = await store.listMatches();
    const meister = scoreSaison({ matches, tipps: {}, saison: r.rules.saison }).zeilen[0].gewinner[0];

    // Lena tritt bei und gibt AUSSCHLIESSLICH eine Saison-Wette ab.
    await store.joinRound({ roundId: round.id, userId: "u-lena", name: "Lena" });
    await store.saveSeasonTip({ roundId: round.id, userId: "u-lena", wettenId: "meister", wert: meister });

    const board = await store.getLeaderboard(round.id);
    const lena = board.find((b) => b.userId === "u-lena");
    expect(lena).toBeDefined();
    expect(lena.name).toBe("Lena");        // Name kommt aus der Mitgliedschaft, nicht aus dem Tipp
    expect(lena.saison).toBe(300);
    expect(lena.total).toBe(300);
    expect(lena.tips).toBe(0);             // daran hängt die „nur Saison"-Anzeige im Ranking
    expect(lena.rank).toBe(1);

    // Der Admin ist Mitglied, hat aber nichts abgegeben — er bleibt draußen.
    expect(board.map((b) => b.userId)).toEqual(["u-lena"]);
  });
});

// ⚠️ Nicht zu verwechseln mit `saveVote`/`listVotes` — das ist die
// Joker-Abstimmung (welche Spieltage einen Joker haben). Hier geht es um
// Anträge auf Änderungen AM REGELWERK (design/abstimmung-verfassung.md).
describe("Regel-Abstimmung (createAntrag / listAntraege / saveAntragStimme)", () => {
  const antragDaten = {
    roundId: DEMO_ROUND_ID, userId: "u1", aspekt: "modifikatoren",
    werte: { modCap: 2 }, gestelltAm: 5, laeuftBis: 8,
  };

  it("ein Antrag wird angelegt und kommt mit leerer Stimmliste zurück", async () => {
    const s = createMockStore();
    const angelegt = await s.createAntrag(antragDaten);
    expect(angelegt.id).toBeTruthy();
    expect(angelegt.status).toBe("offen");
    expect(angelegt.veto).toBe(false);

    const liste = await s.listAntraege({ roundId: DEMO_ROUND_ID });
    expect(liste).toHaveLength(1);
    expect(liste[0].aspekt).toBe("modifikatoren");
    expect(liste[0].werte).toEqual({ modCap: 2 });
    expect(liste[0].stimmen).toEqual([]);
  });

  // Die Frist wird beim Anlegen eingefroren — `wirktAb` liest genau dieses
  // Feld, damit eine später geänderte Dauer keine laufende Abstimmung
  // verschiebt.
  it("die Frist wird mitgespeichert, nicht laufend nachgerechnet", async () => {
    const s = createMockStore();
    await s.createAntrag(antragDaten);
    const [a] = await s.listAntraege({ roundId: DEMO_ROUND_ID });
    expect(a.gestellt_am).toBe(5);
    expect(a.laeuft_bis).toBe(8);
  });

  it("Stimmen hängen am Antrag, und die letzte je Nutzer gilt", async () => {
    const s = createMockStore();
    const a = await s.createAntrag(antragDaten);
    await s.saveAntragStimme({ antragId: a.id, userId: "u1", ja: true });
    await s.saveAntragStimme({ antragId: a.id, userId: "u2", ja: false });
    // Dieselbe Person stimmt um.
    await s.saveAntragStimme({ antragId: a.id, userId: "u2", ja: true });

    const [geladen] = await s.listAntraege({ roundId: DEMO_ROUND_ID });
    expect(geladen.stimmen).toHaveLength(2);
    expect(geladen.stimmen.find((v) => v.userId === "u2").ja).toBe(true);
  });

  it("Stimmen eines Antrags landen nicht bei einem anderen", async () => {
    const s = createMockStore();
    const a = await s.createAntrag(antragDaten);
    const b = await s.createAntrag({ ...antragDaten, aspekt: "saison" });
    await s.saveAntragStimme({ antragId: a.id, userId: "u1", ja: true });

    const liste = await s.listAntraege({ roundId: DEMO_ROUND_ID });
    expect(liste.find((x) => x.id === a.id).stimmen).toHaveLength(1);
    expect(liste.find((x) => x.id === b.id).stimmen).toHaveLength(0);
  });

  it("der Abschluss lässt sich festhalten und filtern", async () => {
    const s = createMockStore();
    const a = await s.createAntrag(antragDaten);
    await s.createAntrag({ ...antragDaten, aspekt: "saison" });
    await s.setAntragStatus({ antragId: a.id, status: "angenommen" });

    expect(await s.listAntraege({ roundId: DEMO_ROUND_ID, status: "angenommen" })).toHaveLength(1);
    expect(await s.listAntraege({ roundId: DEMO_ROUND_ID, status: "offen" })).toHaveLength(1);
    expect(await s.listAntraege({ roundId: DEMO_ROUND_ID })).toHaveLength(2);
  });

  it("ein Antrag einer anderen Runde taucht nicht auf", async () => {
    const s = createMockStore();
    await s.createAntrag({ ...antragDaten, roundId: "andere-runde" });
    expect(await s.listAntraege({ roundId: DEMO_ROUND_ID })).toHaveLength(0);
  });
});

// 🔴 Schritt 5 der Regel-Abstimmung, durch den GANZEN Weg: Antrag → Auszählung
// → Wirkung → Wertung. Das ist die Stelle, an der die harte Kante aus
// design/abstimmung-verfassung.md Abschnitt 1 sitzt — ein Beschluss darf einen
// bereits abgegebenen Tipp nicht anders bewerten.
describe("Beschlossene Regeländerungen wirken ab ihrem Spieltag — und nur ab da", () => {
  const aufsetzen = async () => {
    const s = createMockStore();
    const alle = await s.listMatches();
    const bl = alle.filter((m) => m.wettbewerb === "bl" && m.result);
    const frueh = bl.find((m) => m.matchday === 2);
    const spaet = bl.find((m) => m.matchday === 20);
    const achse = zeitachse(alle, DEFAULT_RULES.zeitachse);

    const rules = sanitizeRules({
      ...DEFAULT_RULES, name: "Testrunde", displayScale: 15,
      regelAbstimmung: { enabled: true, dauer: 2, quorum: 0 },
    });
    const runde = await s.createRound({ name: "Testrunde", rules, adminId: "u1" });
    await s.joinRound({ roundId: runde.id, userId: "u2" });
    for (const m of [frueh, spaet]) {
      await s.saveTip({
        roundId: runde.id, matchId: m.id, userId: "u1",
        tip: { home: m.result.home, away: m.result.away, goals: { home: [], away: [] } },
        snapshot: m.snapshot,
      });
    }
    return { s, runde, gestelltAm: rundenSpieltagVon(achse, frueh) + 1 };
  };

  it("der frühere Spieltag bleibt unberührt, der spätere zählt dreifach", async () => {
    const { s, runde, gestelltAm } = await aufsetzen();
    const vorher = await s.getLeaderboardHistory(runde.id);

    const a = await s.createAntrag({
      roundId: runde.id, userId: "u1", aspekt: "anzeige",
      werte: { displayScale: 45 },           // dreifach
      gestelltAm, laeuftBis: gestelltAm + 2,
    });
    await s.saveAntragStimme({ antragId: a.id, userId: "u1", ja: true });
    await s.saveAntragStimme({ antragId: a.id, userId: "u2", ja: true });

    const nachher = await s.getLeaderboardHistory(runde.id);

    // Der frühe Spieltag liegt VOR der Wirkung — Punkt für Punkt derselbe Wert.
    expect(nachher[0].board[0].total).toBe(vorher[0].board[0].total);

    // Der späte liegt danach. Die Stände sind KUMULATIV, also wird der Beitrag
    // des späten Spieltags verglichen, nicht die Gesamtsumme — von Hand:
    // (nachher − früh) muss dreimal (vorher − früh) sein.
    const frueherStand = vorher[0].board[0].total;
    const beitragVorher = vorher[1].board[0].total - frueherStand;
    const beitragNachher = nachher[1].board[0].total - frueherStand;
    expect(beitragVorher).toBeGreaterThan(0);
    // Toleranz 1: `toDisplay` rundet je Tipp.
    expect(Math.abs(beitragNachher - 3 * beitragVorher)).toBeLessThanOrEqual(1);
  });

  it("ein abgelehnter Antrag ändert die Wertung nicht", async () => {
    const { s, runde, gestelltAm } = await aufsetzen();
    const vorher = await s.getLeaderboardHistory(runde.id);
    const a = await s.createAntrag({
      roundId: runde.id, userId: "u1", aspekt: "anzeige",
      werte: { displayScale: 45 }, gestelltAm, laeuftBis: gestelltAm + 2,
    });
    await s.saveAntragStimme({ antragId: a.id, userId: "u1", ja: false });
    await s.saveAntragStimme({ antragId: a.id, userId: "u2", ja: false });
    const nachher = await s.getLeaderboardHistory(runde.id);
    expect(nachher.map((h) => h.board[0].total)).toEqual(vorher.map((h) => h.board[0].total));
  });
});
