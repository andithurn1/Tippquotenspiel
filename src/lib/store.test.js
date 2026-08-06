import { describe, it, expect } from "vitest";
import { createMockStore } from "./store.mock";
import { DEMO_ROUND_ID, DEMO_JOIN_CODE } from "./constants";
import { DEFAULT_RULES, RULE_LIMITS, sanitizeRules } from "./engine";
import { zeitachse, rundenSpieltagVon } from "./zeitachse";
import { drehradZiehungen } from "./drehradBoard";
import { auswerten } from "./drehrad";
import { WETT_TYP } from "./saisonwetten";
import { filterMatchesByTeams } from "./roundStatus";
import { darfEinsetzen, basisFuer } from "./jokerBasis";
import { LIGEN } from "./ligen";

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
  // 🔴 Seit 06.08.2026 prüft `saveSeasonTip` das FREISCHALT-FENSTER (siehe
  // saisonFenster.js). Vorher war es ein `disabled`-Attribut in der
  // Oberfläche, und der Store nahm jede Wette zu jeder Zeit entgegen.
  //
  // ⚠️ Deshalb brauchen diese Tests eine Runde mit `teamFilter`. Über den
  // GANZEN Katalog gerechnet hat die Saison längst begonnen — die MLS spielt
  // seit dem 31.07., und Wetten OHNE Fenster gehören vor den 1. Spieltag.
  // Genau die Falle, vor der der Kommentar in `SaisonTipps.jsx` warnt; sie ist
  // jetzt nicht mehr nur eine Anzeige-Frage.
  const SAISON = { enabled: true, gewicht: 1, wetten: [{ key: "meister", punkte: 300 }] };
  const blTeams = Object.keys(LIGEN.find((l) => l.key === "bl").ratings);
  const saisonRunde = (store, saison = SAISON) => store.createRound({
    name: "Saison-Runde", adminId: "u-du", adminName: "Du",
    rules: { ...DEFAULT_RULES, saison }, teamFilter: blTeams,
  });

  it("speichert einen Saison-Tipp und aktualisiert ihn beim erneuten Abgeben (kein Duplikat)", async () => {
    const store = createMockStore();
    const round = await saisonRunde(store);
    await store.saveSeasonTip({ roundId: round.id, userId: "u-du", wettenId: "meister", wert: "FC Bayern München" });
    let mine = await store.listSeasonTips({ roundId: round.id, userId: "u-du" });
    expect(mine).toHaveLength(1);
    expect(mine[0].wert).toBe("FC Bayern München");

    await store.saveSeasonTip({ roundId: round.id, userId: "u-du", wettenId: "meister", wert: "Borussia Dortmund" });
    mine = await store.listSeasonTips({ roundId: round.id, userId: "u-du" });
    expect(mine).toHaveLength(1);
    expect(mine[0].wert).toBe("Borussia Dortmund");
  });

  it("listSeasonTips filtert nach Nutzer bzw. gibt alle der Runde zurück", async () => {
    const store = createMockStore();
    const round = await saisonRunde(store);
    await store.joinRound({ roundId: round.id, userId: "u-lena", name: "Lena" });
    await store.saveSeasonTip({ roundId: round.id, userId: "u-du", wettenId: "meister", wert: "A" });
    await store.saveSeasonTip({ roundId: round.id, userId: "u-lena", wettenId: "meister", wert: "B" });
    expect(await store.listSeasonTips({ roundId: round.id })).toHaveLength(2);
    expect(await store.listSeasonTips({ roundId: round.id, userId: "u-du" })).toHaveLength(1);
  });

  // 🔴 Die alte Fassung dieses Tests hieß „ohne aktive Saison verändert ein
  // Saison-Tipp das Leaderboard nicht" und legte den Tipp einfach ab. Das geht
  // jetzt gar nicht mehr — und das ist die STÄRKERE Aussage: eine Wette, die
  // es in der Runde nicht gibt, landet erst gar nicht in der Tabelle. Vorher
  // ließ sich eine beliebige `wettenId` ablegen; sie zählte nie, stand aber
  // für immer da.
  it("ohne aktive Saison lässt sich gar kein Saison-Tipp abgeben", async () => {
    const store = createMockStore();
    await expect(store.saveSeasonTip({
      roundId: DEMO_ROUND_ID, userId: "u-du", wettenId: "meister", wert: "FC Bayern München",
    })).rejects.toThrow(/keine Saison-Wetten/);
    const board = await store.getLeaderboard(DEMO_ROUND_ID);
    expect(board.every((b) => b.saison === undefined)).toBe(true);
  });

  it("eine Wette, die nicht im Regelwerk steht, wird abgelehnt", async () => {
    const store = createMockStore();
    const round = await saisonRunde(store);
    await expect(store.saveSeasonTip({
      roundId: round.id, userId: "u-du", wettenId: "torschuetzenkoenig", wert: "irgendwer",
    })).rejects.toThrow(/gehört nicht zu dieser Runde/);
  });

  it("nach Saisonstart der RUNDE ist eine Wette ohne Fenster zu", async () => {
    const store = createMockStore();
    const round = await saisonRunde(store);
    // Ohne Vereinsfilter zählt der ganze Katalog — und dort läuft die MLS
    // bereits. Dieselbe Wette, andere Runde, anderes Ergebnis.
    const offen = await store.createRound({
      name: "Alles", adminId: "u-du", adminName: "Du", rules: { ...DEFAULT_RULES, saison: SAISON },
    });
    await store.saveSeasonTip({ roundId: round.id, userId: "u-du", wettenId: "meister", wert: "FC Bayern München" });
    await expect(store.saveSeasonTip({
      roundId: offen.id, userId: "u-du", wettenId: "meister", wert: "FC Bayern München",
    })).rejects.toThrow(/Saison läuft/);
  });

  it("mit aktiver Saison trägt ein Treffer eine eigene saison-Zeile ins Board", async () => {
    const store = createMockStore();
    const round = await saisonRunde(store);
    const { scoreSaison } = await import("./saisonwetten");
    // 🔴 Über die Spiele DIESER Runde, nicht über den Katalog — sonst ist der
    // „Meister" einer Bundesliga-Runde der FC Barcelona (Befund 05.08.2026).
    const matches = await store.listRoundMatches(round.id);
    const meister = scoreSaison({ matches, tipps: {}, saison: SAISON }).zeilen[0].gewinner[0];
    // u-du tippt auch ein Match, damit er im (Spieltags-)Leaderboard erscheint
    const eins = matches.find((m) => m.result && m.snapshot);
    await store.saveTip({ roundId: round.id, matchId: eins.id, userId: "u-du", tip: { home: 2, away: 1, goals: { home: [], away: [] } }, snapshot: eins.snapshot });
    await store.saveSeasonTip({ roundId: round.id, userId: "u-du", wettenId: "meister", wert: meister });
    const board = await store.getLeaderboard(round.id);
    const du = board.find((b) => b.userId === "u-du");
    expect(du.saison).toBe(300);
    expect(du.total).toBeGreaterThanOrEqual(300);
  });

  it("ein reiner Saison-Tipper steht im Board — auch ohne einen einzigen Match-Tipp", async () => {
    const store = createMockStore();
    const round = await saisonRunde(store);
    const { scoreSaison } = await import("./saisonwetten");
    const matches = await store.listRoundMatches(round.id);
    const meister = scoreSaison({ matches, tipps: {}, saison: SAISON }).zeilen[0].gewinner[0];

    // Lena tritt bei und gibt AUSSCHLIESSLICH eine Saison-Wette ab.
    await store.joinRound({ roundId: round.id, userId: "u-lena", name: "Lena" });
    await store.saveSeasonTip({ roundId: round.id, userId: "u-lena", wettenId: "meister", wert: meister });

    const board = await store.getLeaderboard(round.id);
    const lena = board.find((b) => b.userId === "u-lena");
    expect(lena).toBeDefined();
    expect(lena.name).toBe("Lena");        // Name kommt aus der Mitgliedschaft, nicht aus dem Tipp
    expect(lena.saison).toBe(300);
    expect(lena.total).toBe(300);
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

// 🔴 Zwei Skalen, die nicht verwechselt werden dürfen: `drehradPlan` verteilt
// die Drehungen über RUNDEN-Spieltage, `kontextFuer` in drehradBoard.js
// vergleicht `t.matchday === spieltag` direkt damit. Der Store hat dort lange
// den LIGA-Spieltag hineingereicht — in einer Runde über fünf Wettbewerbe sind
// das zwei verschiedene Zahlen, und „kein Rad ohne Tipp" prüfte den falschen
// Tag. Dieselbe Fehlerklasse wie beim Joker (siehe Zeitachse in CLAUDE.md).
describe("Drehrad: der Store reicht den RUNDEN-Spieltag, nicht den Liga-Spieltag", () => {
  it("die Drehung liegt auf dem Spieltag, an dem wirklich getippt wurde", async () => {
    const s = createMockStore();
    const alle = await s.listMatches();
    const achse = zeitachse(alle, DEFAULT_RULES.zeitachse);
    const spiel = alle.find((m) => m.wettbewerb === "bl" && m.matchday === 20 && m.result);
    const rundenSpieltag = rundenSpieltagVon(achse, spiel);

    // Die beiden Skalen müssen für diesen Test auseinanderliegen — sonst
    // bewiese er nichts.
    expect(rundenSpieltag).not.toBe(spiel.matchday);

    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      drehrad: {
        enabled: true, frequenz: 1, phase: "ganze",
        felder: [
          { id: "f1", label: "Nichts", gewicht: 1, belohnung: { typ: "nichts" } },
          { id: "f2", label: "Punkte", gewicht: 1, belohnung: { typ: "punkte", punkte: 50 } },
        ],
      },
    });
    const basis = { rules, rundenId: "r1", userIds: ["u1"], spieltage: achse.length };
    const kontextMit = (matchday) => ({
      board: [{ userId: "u1", total: 0, rank: 1 }],
      tipps: [{ userId: "u1", matchId: spiel.id, matchday }],
      adminFreigaben: [], letzteEinsaetze: [],
    });

    // Richtig: der Runden-Spieltag → dort wird gedreht.
    const richtig = drehradZiehungen({ ...basis, kontext: kontextMit(rundenSpieltag) });
    expect(richtig.map((z) => z.spieltag)).toEqual([rundenSpieltag]);

    // Falsch (die alte Verkabelung): der Liga-Spieltag → die Drehung landet
    // auf einem ganz anderen Tag, an dem gar nicht getippt wurde.
    const falsch = drehradZiehungen({ ...basis, kontext: kontextMit(spiel.matchday) });
    expect(falsch.map((z) => z.spieltag)).toEqual([spiel.matchday]);
    expect(falsch[0].spieltag).not.toBe(rundenSpieltag);
  });

  // 🔴 Anzeige und Wertung müssen aus DERSELBEN Rechnung kommen.
  // `MeinRad.jsx` hat die Ziehung bis 05.08.2026 selbst nachgerechnet, mit
  // `adminFreigaben: []` und dem Board INKLUSIVE der Rad-Punkte. In einer
  // Runde mit „nur nach Freigabe" stand dort „keine Drehung vorgesehen",
  // während im Leaderboard Punkte dafür gutgeschrieben waren.
  it("getDrehradZiehungen liefert genau die Ziehungen, die das Leaderboard verrechnet", async () => {
    const s = createMockStore();
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      drehrad: {
        enabled: true, frequenz: 1, phase: "ganze", maxPunkteProSaison: 0,
        // ⚠️ Das Feld heißt `betrag` (siehe `sanitizeBelohnung` in drehrad.js).
        // Mit `punkte` sanitized es still auf 0 — der Test liefe grün durch,
        // ohne je einen Punkt zu vergeben.
        felder: [{ id: "f1", label: "Punkte", gewicht: 1, belohnung: { typ: "punkte", betrag: 50 } }],
      },
    });
    const runde = await s.createRound({ name: "Rad-Runde", adminId: "u-du", rules });
    // Ein Tipp, damit „kein Rad ohne Tipp" erfüllt ist und jemand im Board
    // steht. ⚠️ NICHT auf JOR-ESP: das Demo-Länderspiel gehört zu keinem
    // echten Wettbewerb und hat deshalb gar keinen Runden-Spieltag
    // (`rundenSpieltagVon` liefert `null`) — es könnte nie eine Drehung tragen.
    const spiel = (await s.listMatches()).find((m) => m.wettbewerb === "bl" && m.result);
    await s.saveTip({
      roundId: runde.id, matchId: spiel.id, userId: "u-du",
      tip: { home: 2, away: 1, goals: { home: [], away: [] } }, snapshot: spiel.snapshot,
    });

    const board = await s.getLeaderboard(runde.id);
    const { ziehungen } = await s.getDrehradZiehungen(runde.id);

    // Aus den Ziehungen dieselbe Punktzahl bilden, die das Board ausweist.
    const { gutschriften } = auswerten(rules.drehrad, ziehungen);
    const erwartet = new Map();
    for (const g of gutschriften) {
      if (g.belohnung?.typ !== "punkte") continue;
      erwartet.set(g.userId, (erwartet.get(g.userId) ?? 0) + g.belohnung.betrag);
    }
    expect(board.length).toBeGreaterThan(0);
    for (const zeile of board) {
      expect(zeile.drehrad ?? 0).toBe(erwartet.get(zeile.userId) ?? 0);
    }
    // Und es wurde überhaupt gedreht — sonst prüfte der Test nur zwei Nullen.
    expect(ziehungen.length).toBeGreaterThan(0);
  });

  // 🔴 Die dritte Prüffrage (05.08.2026): rechnet eine Stelle über die Spiele
  // DIESER RUNDE oder über den ganzen Katalog? Die Zeitachse ist der Ort, an
  // dem das am meisten wehtut — sie definiert den Runden-Spieltag selbst.
  // Gemessen: über den Katalog liegt der Bundesliga-Spieltag 20 auf
  // Runden-Spieltag 27, über die Spiele der Runde auf 26. Beide Zahlen waren
  // gleichzeitig im Umlauf (Spielwahl und Narrenstand rechneten gefiltert,
  // Store und Tippabgabe ungefiltert).
  it("die Zeitachse des Stores ist die der RUNDE, nicht die des Katalogs", async () => {
    const s = createMockStore();
    const alle = await s.listMatches();
    // Eine Runde über einen Ausschnitt: die Vereine von zwei Bundesliga-Spielen.
    const zwei = alle.filter((m) => m.wettbewerb === "bl").slice(0, 2);
    const teams = [...new Set(zwei.flatMap((m) => [m.home, m.away]))];
    const runde = await s.createRound({
      name: "Ausschnitt", adminId: "u-du", rules: DEFAULT_RULES, teamFilter: teams,
    });

    const rundenSpiele = await s.listRoundMatches(runde.id);
    expect(rundenSpiele.length).toBeGreaterThan(0);
    expect(rundenSpiele.length).toBeLessThan(alle.length);   // wirklich gefiltert
    for (const m of rundenSpiele) {
      expect(teams.some((t) => t === m.home || t === m.away)).toBe(true);
    }

    // Der Store muss dieselbe Achse benutzen wie ein Screen, der
    // `listRoundMatches` lädt — sonst tragen beide verschiedene
    // Runden-Spieltage.
    const achse = zeitachse(rundenSpiele, DEFAULT_RULES.zeitachse);
    const { spieltage } = await s.getDrehradZiehungen(runde.id);
    expect(spieltage).toBe(achse.length);
    // Gegenprobe: die Achse des ganzen Katalogs ist eine ANDERE Aussage.
    const katalogAchse = zeitachse(alle, DEFAULT_RULES.zeitachse);
    const spiel = rundenSpiele.find((m) => m.wettbewerb === "bl" && m.matchday === 20);
    if (spiel) {
      expect(rundenSpieltagVon(achse, spiel))
        .not.toBe(rundenSpieltagVon(katalogAchse, spiel));
    }
  });

  // 🔴 Dieselbe Frage bei den Saison-Wetten: `tabelle()` baut eine Tabelle über
  // ALLE übergebenen Spiele. Gemessen am 05.08.2026 über den ganzen Katalog:
  // „Meister" einer Bundesliga-Runde = FC Barcelona, „Meiste Tore" ebenfalls,
  // Torschützenkönig ein Spieler aus einer anderen Liga.
  it("Saison-Wetten werden über die Spiele DER RUNDE ausgewertet", async () => {
    const s = createMockStore();
    const alle = await s.listMatches();
    const blTeams = [...new Set(alle.filter((m) => m.wettbewerb === "bl")
      .flatMap((m) => [m.home, m.away]))];
    const katalogMeister = WETT_TYP.meister.ermitteln(alle, { key: "meister" })[0];
    const rundenMeister = WETT_TYP.meister
      .ermitteln(filterMatchesByTeams(alle, blTeams), { key: "meister" })[0];
    // Die beiden müssen auseinanderliegen, sonst bewiese der Test nichts.
    expect(rundenMeister).not.toBe(katalogMeister);

    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      saison: {
        enabled: true, gewicht: 1,
        wetten: [{ key: "meister", punkte: 300 }],
      },
    });
    const runde = await s.createRound({
      name: "BL", adminId: "u-du", rules, teamFilter: blTeams,
    });
    const jor = await s.getMatch("JOR-ESP");
    await s.saveTip({
      roundId: runde.id, matchId: "JOR-ESP", userId: "u-du",
      tip: { home: 5, away: 1, goals: { home: [], away: [] } }, snapshot: jor.snapshot,
    });
    // Auf den Meister DER RUNDE getippt → Punkte. Auf den des Katalogs → keine.
    await s.saveSeasonTip({ roundId: runde.id, userId: "u-du", wettenId: "meister", wert: rundenMeister });
    const board = await s.getLeaderboard(runde.id);
    expect(board.find((b) => b.userId === "u-du")?.saison).toBe(300);

    await s.saveSeasonTip({ roundId: runde.id, userId: "u-du", wettenId: "meister", wert: katalogMeister });
    const board2 = await s.getLeaderboard(runde.id);
    expect(board2.find((b) => b.userId === "u-du")?.saison).toBe(0);
  });

  it("der Plan deckt die ganze Runde ab, nicht nur 34 Spieltage", async () => {
    const s = createMockStore();
    const alle = await s.listMatches();
    const achse = zeitachse(alle, DEFAULT_RULES.zeitachse);
    // Gemessen: der Katalog ergibt mehr Runden-Spieltage als eine Liga-Saison.
    // Mit der früheren festen 34 bekämen die letzten nie eine Drehung.
    expect(achse.length).toBeGreaterThan(34);
  });
});

// 🔴 Die LETZTE Teil-Wirkung aus `design/kontaktstellen.md`:
// `jokerBasis.wer: "adminFreigabe"` lehnte an JEDER Kontaktstelle ab, weil es
// keinen Speicherort für Freigaben gab — die Einstellung war über die
// Profi-Oberfläche wählbar und ohne jede Wirkung.
describe("Admin-Freigaben (setAdminFreigabe / listAdminFreigaben)", () => {
  const rules = sanitizeRules({
    ...DEFAULT_RULES,
    joker: { enabled: true, modus: "einzel", faktor: 1.5 },
    jokerBasis: { standard: { wer: "adminFreigabe" } },
  });
  const basis = basisFuer("joker.einzel", rules);
  const ctx = (adminFreigaben, aktuellerSpieltag = 7) => ({
    board: [], aktuellerSpieltag, adminFreigaben,
    hatGetippt: true, alleGetippt: false, letzteEinsaetze: [],
  });

  it("ohne Freigabe wird abgelehnt — mit Begründung", () => {
    const p = darfEinsetzen(basis, "u1", ctx([]), "joker.einzel");
    expect(p.erlaubt).toBe(false);
    expect(p.grund.length).toBeGreaterThan(10);
  });

  it("mit Freigabe darf gesetzt werden — und NUR an ihrem Spieltag", async () => {
    const s = createMockStore();
    await s.setAdminFreigabe({ roundId: DEMO_ROUND_ID, userId: "u1", matchday: 7 });
    const fg = await s.listAdminFreigaben({ roundId: DEMO_ROUND_ID });
    expect(fg).toEqual([{ userId: "u1", spieltag: 7 }]);

    expect(darfEinsetzen(basis, "u1", ctx(fg, 7), "joker.einzel").erlaubt).toBe(true);
    // Ein anderer Spieltag bleibt gesperrt — eine Freigabe ist kein Freibrief.
    expect(darfEinsetzen(basis, "u1", ctx(fg, 8), "joker.einzel").erlaubt).toBe(false);
    // Und sie gilt nur für DIESEN Spieler.
    expect(darfEinsetzen(basis, "u2", ctx(fg, 7), "joker.einzel").erlaubt).toBe(false);
  });

  it("eine Freigabe lässt sich zurücknehmen", async () => {
    const s = createMockStore();
    await s.setAdminFreigabe({ roundId: DEMO_ROUND_ID, userId: "u1", matchday: 7 });
    await s.setAdminFreigabe({ roundId: DEMO_ROUND_ID, userId: "u1", matchday: 7, an: false });
    expect(await s.listAdminFreigaben({ roundId: DEMO_ROUND_ID })).toEqual([]);
  });

  it("zweimal freigeben legt keinen zweiten Eintrag an", async () => {
    const s = createMockStore();
    await s.setAdminFreigabe({ roundId: DEMO_ROUND_ID, userId: "u1", matchday: 7 });
    await s.setAdminFreigabe({ roundId: DEMO_ROUND_ID, userId: "u1", matchday: 7 });
    expect(await s.listAdminFreigaben({ roundId: DEMO_ROUND_ID })).toHaveLength(1);
  });

  it("Freigaben anderer Runden tauchen nicht auf", async () => {
    const s = createMockStore();
    await s.setAdminFreigabe({ roundId: "andere", userId: "u1", matchday: 7 });
    expect(await s.listAdminFreigaben({ roundId: DEMO_ROUND_ID })).toEqual([]);
  });
});
