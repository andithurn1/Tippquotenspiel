import { describe, it, expect } from "vitest";
import { createMockStore } from "@/lib/store.mock";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";
import { LIGEN } from "@/lib/ligen";
import { zeitachse, rundenSpieltagVon } from "@/lib/zeitachse";
import { duellPlan, DEFAULT_DUELL } from "@/lib/duellJoker";
import { duellBasis } from "@/lib/jokerBasis";
import { pruefeDuellEinsatz } from "@/lib/duellPruefung";
import { tippStatus, spieltagStarts } from "@/lib/tippfenster";

const blTeams = Object.keys(LIGEN.find((l) => l.key === "bl").ratings);
const SPIELER = ["u-du", "u-lena", "u-kemal"];

const duellRegeln = (teil = {}, sonst = {}) => sanitizeRules({
  ...DEFAULT_RULES, ...sonst,
  duell: { ...DEFAULT_DUELL, enabled: true, typen: ["klau"], anzahl: 6, phase: "ganze", ...teil },
});

// Eine Runde mit drei Spielern, klar verschiedenen Punktständen und einem
// Duell-Spieltag, den der Plan für „u-du" wirklich vorsieht.
async function runde(teil = {}, sonst = {}) {
  const store = createMockStore();
  const rules = duellRegeln(teil, sonst);
  const rnd = await store.createRound({ name: "D", adminId: "u-du", rules, teamFilter: blTeams });
  for (const u of SPIELER.slice(1)) await store.joinRound({ roundId: rnd.id, userId: u });

  const spiele = (await store.listRoundMatches(rnd.id))
    .filter((m) => m.result).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).slice(0, 60);
  for (const [i, m] of spiele.entries()) {
    for (const [j, u] of SPIELER.entries()) {
      store.seedTip({
        roundId: rnd.id, matchId: m.id, userId: u,
        tip: { home: (i + j) % 4, away: (i * j) % 3, goals: { home: [], away: [] } },
        snapshot: m.snapshot,
      });
    }
  }

  const alle = await store.listRoundMatches(rnd.id);
  const achse = zeitachse(alle, rules.zeitachse);
  const board = await store.getLeaderboard(rnd.id);
  const plan = duellPlan({
    spieltage: achse.length, duell: rules.duell, basis: duellBasis(rules),
    seed: rnd.id, userIds: board.map((b) => b.userId),
  });
  // ⚠️ Gesucht wird über ALLE Spiele der Runde, nicht über die 60 getippten.
  // Der Duell-Plan verteilt sechs Spieltage über die ganze Saison; in den
  // ersten sieben liegt oft keiner, und die Runden-Id (und damit der Plan)
  // wechselt bei jedem Lauf. Über die getippten gesucht war der Test von der
  // Auslosung abhängig — grün oder rot je nach Zufall, und beim ersten Lauf
  // genau so aufgefallen.
  const fuer = (userId) => {
    const meine = plan.proSpieler[userId] ?? [];
    return alle.find((m) => meine.includes(rundenSpieltagVon(achse, m)));
  };
  return { store, rnd, board, achse, plan, fuer, spiel: fuer("u-du") };
}

describe("Die billige Vorfrage", () => {
  it("ein Tipp ohne Duell fragt den Store gar nicht erst", async () => {
    // 🔴 Die Zusage aus dem Kopfkommentar, und sie ist prüfbar: der Store
    // wirft bei JEDEM Zugriff. Kommt die Prüfung trotzdem durch, hat sie
    // nichts angefasst.
    const stolperdraht = new Proxy({}, {
      get() { throw new Error("Der Store wurde angefasst, obwohl kein Duell im Tipp steht."); },
    });
    for (const tip of [{ home: 1, away: 0 }, { home: 1, away: 0, duell: {} }, null]) {
      const r = await pruefeDuellEinsatz({ store: stolperdraht, roundId: "r", matchId: "m", userId: "u", tip });
      expect(r.erlaubt).toBe(true);
    }
  });

  it("ein Duell OHNE Ziel ist keins — und blockiert den Tipp nicht", async () => {
    // Ein `duell` ohne `auf` ist nichts, was sich prüfen ließe. Wichtig ist,
    // dass es den Tipp nicht abweist: der Nutzer hat kein Duell gesetzt, er
    // hat eins angefangen und wieder gelassen.
    const { store, rnd, spiel } = await runde();
    const r = await pruefeDuellEinsatz({
      store, roundId: rnd.id, matchId: spiel.id, userId: "u-du",
      tip: { home: 1, away: 0, duell: { typ: "klau" } },
    });
    expect(r.erlaubt).toBe(true);
  });
});

// 🔴 Der älteste offene Befund des Kanals: diese vier Regeln standen NUR in
// `Tippabgabe.jsx`. Wer den Store direkt ansprach, traf jeden, beliebig oft,
// umsonst. Jeder Fall hier ist einer, der vorher durchging.
describe("Die Schutzregeln greifen jetzt auch am Store", () => {
  it("ohne Duell-Joker in der Runde geht gar nichts", async () => {
    const store = createMockStore();
    const rnd = await store.createRound({
      name: "X", adminId: "u-du", rules: sanitizeRules(DEFAULT_RULES), teamFilter: blTeams,
    });
    const r = await pruefeDuellEinsatz({
      store, roundId: rnd.id, matchId: "egal", userId: "u-du",
      tip: { home: 1, away: 0, duell: { auf: "u-lena", typ: "klau" } },
    });
    expect(r.erlaubt).toBe(false);
    expect(r.grund).toContain("keine Fremdjoker");
  });

  it("ein Ziel, das nicht in der Runde ist, fällt nicht still durch", async () => {
    const { store, rnd, spiel } = await runde();
    const r = await pruefeDuellEinsatz({
      store, roundId: rnd.id, matchId: spiel.id, userId: "u-du",
      tip: { home: 1, away: 0, duell: { auf: "u-fremd", typ: "klau" } },
    });
    expect(r.erlaubt).toBe(false);
    expect(r.grund).toContain("nicht zu dieser Runde");
  });

  it("man kann sich nicht selbst herausfordern", async () => {
    const { store, rnd, spiel } = await runde();
    const r = await pruefeDuellEinsatz({
      store, roundId: rnd.id, matchId: spiel.id, userId: "u-du",
      tip: { home: 1, away: 0, duell: { auf: "u-du", typ: "klau" } },
    });
    expect(r.erlaubt).toBe(false);
  });

  it("eine Duell-Art, die die Runde nicht führt, wird abgelehnt", async () => {
    const { store, rnd, spiel } = await runde();
    const r = await pruefeDuellEinsatz({
      store, roundId: rnd.id, matchId: spiel.id, userId: "u-du",
      tip: { home: 1, away: 0, duell: { auf: "u-lena", typ: "block" } },
    });
    expect(r.erlaubt).toBe(false);
  });

  // 🔴 DER Fall, für den die ganze Datei existiert: dieselbe Runde, dasselbe
  // Spiel, dasselbe Ziel — einmal mit freier Zielwahl, einmal mit „nur nach
  // vorne". Läge die Regel weiterhin nur im Screen, wäre die Antwort beide
  // Male dieselbe.
  //
  // ⚠️ Und die Gegenprobe gehört dazu: eine Prüfung, die IMMER nein sagt,
  // sieht in einem Ablehnungs-Test genauso aus wie eine, die richtig prüft.
  // Deshalb muss der freie Fall JA liefern.
  it("`zielWahl` entscheidet — und lässt im freien Fall wirklich durch", async () => {
    const tip = (auf) => ({ home: 1, away: 0, duell: { auf, typ: "klau" } });
    const versuch = async (r) => {
      const erster = r.board[0].userId;
      const letzter = r.board[r.board.length - 1].userId;
      return pruefeDuellEinsatz({
        store: r.store, roundId: r.rnd.id, matchId: r.fuer(erster).id,
        userId: erster, tip: tip(letzter),
      });
    };
    // Der Erste greift den Letzten an: bei freier Zielwahl erlaubt …
    const ja = await versuch(await runde({ zielWahl: "frei" }));
    // … bei „nur nach vorne" nicht, denn vor dem Ersten steht niemand.
    const nein = await versuch(await runde({ zielWahl: "nurVorne" }));

    expect(ja.erlaubt).toBe(true);
    expect(nein.erlaubt).toBe(false);
    expect(nein.grund).toContain("kein erlaubtes Ziel");
  });

  it("an einem Spieltag ohne Duell-Joker geht es nicht", async () => {
    const { store, rnd, board, achse, plan } = await runde({ zielWahl: "frei" });
    const alle = await store.listRoundMatches(rnd.id);
    const meine = plan.proSpieler[board[0].userId] ?? [];
    const anderes = alle.find((m) => {
      const st = rundenSpieltagVon(achse, m);
      return st != null && !meine.includes(st);
    });
    expect(anderes).toBeTruthy();
    const r = await pruefeDuellEinsatz({
      store, roundId: rnd.id, matchId: anderes.id, userId: board[0].userId,
      tip: { home: 1, away: 0, duell: { auf: board[board.length - 1].userId, typ: "klau" } },
    });
    expect(r.erlaubt).toBe(false);
    expect(r.grund).toContain("keinen Duell-Joker");
  });
});

// Der Aufruf selbst — dass die Prüfung existiert, heißt noch nicht, dass
// `saveTip` sie stellt. Genau diese Lücke war der Befund.
describe("saveTip stellt die Frage wirklich", () => {
  it("ein unzulässiges Duell wird beim Speichern abgewiesen", async () => {
    // ⚠️ Das Spiel muss OFFEN sein, sonst schlägt die Tipp-Fenster-Prüfung
    // zuerst zu und der Test wäre grün, ohne die Duell-Prüfung je erreicht zu
    // haben — genau die Sorte Messung, die Ruhe meldet statt Befunden.
    const { store, rnd } = await runde({}, { tippfenster: { vorlaufStunden: 720 } });
    const rules = duellRegeln({}, { tippfenster: { vorlaufStunden: 720 } });
    const alle = await store.listRoundMatches(rnd.id);
    const starts = spieltagStarts(alle);
    const offen = alle.find((m) => tippStatus(m, rules, Date.now(), starts).offen);
    expect(offen).toBeTruthy();

    // Gegenprobe: derselbe Tipp OHNE Duell geht durch. Ohne sie könnte die
    // Ablehnung genauso gut vom Tipp-Fenster kommen.
    await store.saveTip({
      roundId: rnd.id, matchId: offen.id, userId: "u-du",
      tip: { home: 1, away: 0 }, snapshot: offen.snapshot,
    });
    await expect(store.saveTip({
      roundId: rnd.id, matchId: offen.id, userId: "u-du",
      tip: { home: 1, away: 0, duell: { auf: "u-fremd", typ: "klau" } },
      snapshot: offen.snapshot,
    })).rejects.toThrow(/Duell-Einsatz/);
  });
});
