import { describe, it, expect } from "vitest";
import { punkteJeSpieltag, proNutzer } from "@/lib/spieltagsPunkte";
import { createMockStore } from "@/lib/store.mock";
import { erspielteJoker } from "@/lib/jokerKontingent";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";
import { LIGEN } from "@/lib/ligen";
import { zeitachse, rundenSchluessel } from "@/lib/zeitachse";

// 🔴 Der Befund vom 06.08.2026, zweiter Teil derselben Sorte wie beim
// Versäumnis: `ereignisse.auswerten()` nimmt `spieltagsPunkte` entgegen und
// wertet ohne sie den Trost-Joker („Letzter am Spieltag") einfach nicht aus.
// Geliefert hat sie NIEMAND — weder `Tippabgabe.jsx` noch `MeineJoker.jsx`.
// Der Admin konnte das Ereignis einschalten, und es passierte nichts.
//
// Daneben lag ein zweiter, umgekehrter Fehler: ohne `alleEintraege` verglich
// „alle Spiele des Spieltags getippt" die eigenen Tipps mit den eigenen Tipps.
// Das ist immer vollständig — wer die Hälfte ausließ, bekam den Joker trotzdem.

describe("punkteJeSpieltag — die Differenz aus dem kumulativen Verlauf", () => {
  const verlauf = [
    { wettbewerb: "bl", matchday: 1, board: [
      { userId: "a", name: "A", total: 100, gewertet: 2 },
      { userId: "b", name: "B", total: 40, gewertet: 2 },
    ] },
    { wettbewerb: "bl", matchday: 2, board: [
      { userId: "a", name: "A", total: 130, gewertet: 4 },
      { userId: "b", name: "B", total: 140, gewertet: 3 },
    ] },
  ];

  it("liefert je Nutzer und Spieltag die PUNKTE DIESES TAGES, nicht die Summe", () => {
    const p = punkteJeSpieltag(verlauf);
    expect(p).toHaveLength(4);
    expect(p.find((x) => x.userId === "a" && x.matchday === 1).punkte).toBe(100);
    expect(p.find((x) => x.userId === "a" && x.matchday === 2).punkte).toBe(30);
    expect(p.find((x) => x.userId === "b" && x.matchday === 2).punkte).toBe(100);
  });

  it("der Schlüssel trägt den Wettbewerb — sonst verschmelzen fünf „Spieltag 1“", () => {
    const gemischt = punkteJeSpieltag([
      { wettbewerb: "bl", matchday: 1, board: [{ userId: "a", total: 10, gewertet: 1 }] },
      { wettbewerb: "cl", matchday: 1, board: [{ userId: "a", total: 25, gewertet: 2 }] },
    ]);
    expect(new Set(gemischt.map((x) => x.key)).size).toBe(2);
  });

  it("`getippt` hängt an `gewertet`, nicht an den Punkten — ein 0-Punkte-Tag ist getippt", () => {
    const p = punkteJeSpieltag([
      { wettbewerb: "bl", matchday: 1, board: [{ userId: "a", total: 0, gewertet: 0 }] },
      // Zweiter Spieltag: eine Wertung kam dazu, sie brachte aber null Punkte.
      { wettbewerb: "bl", matchday: 2, board: [{ userId: "a", total: 0, gewertet: 1 }] },
    ]);
    expect(p[0].getippt).toBe(false);
    expect(p[1].getippt).toBe(true);
    expect(p[1].punkte).toBe(0);
  });

  it("leerer Verlauf gibt eine leere Liste, keinen Fehler", () => {
    expect(punkteJeSpieltag([])).toEqual([]);
    expect(punkteJeSpieltag(null)).toEqual([]);
  });

  it("proNutzer bündelt chronologisch", () => {
    const m = proNutzer(punkteJeSpieltag(verlauf));
    expect(m.get("a").map((x) => x.punkte)).toEqual([100, 30]);
  });
});

// ── Die eigentliche Frage: greift das Ereignis über den STORE-Weg? ──
// Nicht „rechnet auswerten richtig" (das prüft ereignisse.test.js), sondern:
// kommt die Zahl bei dem an, der sie anzeigt?

const blTeams = Object.keys(LIGEN.find((l) => l.key === "bl").ratings);
const SPIELER = ["u-du", "u-lena", "u-kemal"];

async function runde(ereignisse, { luecke = null } = {}) {
  const rules = sanitizeRules({ ...DEFAULT_RULES, ereignisse });
  const st = createMockStore();
  const rnd = await st.createRound({ name: "M", adminId: "u-du", rules, teamFilter: blTeams });
  const spiele = (await st.listRoundMatches(rnd.id)).filter((m) => m.result)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).slice(0, 36);
  for (const [i, m] of spiele.entries()) {
    for (const [j, u] of SPIELER.entries()) {
      if (luecke && u === luecke && i % 5 === 0) continue;
      await st.saveTip({
        roundId: rnd.id, matchId: m.id, userId: u,
        tip: { home: (i + j) % 4, away: (i * j) % 3, goals: { home: [], away: [] } },
        snapshot: m.snapshot,
      });
    }
  }
  return {
    rules,
    eintraege: await st.getRoundEntries(rnd.id),
    tagesPunkte: await st.getSpieltagsPunkte(rnd.id),
  };
}

const zaehle = (g, key) => g.filter((x) => x.key === key).length;

describe("Trost-Joker greift über den Store-Weg", () => {
  const EREIGNISSE = { enabled: true, maxErspielt: 15, aktive: [{ key: "letzter-am-spieltag", belohnung: 1 }] };

  it("`getSpieltagsPunkte` liefert eine Zeile je Spieler und Spieltag", async () => {
    const { tagesPunkte } = await runde(EREIGNISSE);
    expect(tagesPunkte.length).toBeGreaterThan(0);
    expect(new Set(tagesPunkte.map((p) => p.userId))).toEqual(new Set(SPIELER));
    // Genau ein Eintrag je Spieler und Spieltag — keine Dubletten.
    const paare = tagesPunkte.map((p) => `${p.userId}|${p.key}`);
    expect(new Set(paare).size).toBe(paare.length);
  });

  it("OHNE die Punkte gibt es keine einzige Gutschrift — MIT ihnen schon", async () => {
    const { rules, eintraege, tagesPunkte } = await runde(EREIGNISSE);
    let ohne = 0;
    let mit = 0;
    for (const u of SPIELER) {
      const meine = eintraege.filter((e) => e.userId === u);
      ohne += zaehle(erspielteJoker({ eintraege: meine, rules }), "letzter-am-spieltag");
      mit += zaehle(erspielteJoker({
        eintraege: meine, alleEintraege: eintraege, spieltagsPunkte: tagesPunkte, rules,
      }), "letzter-am-spieltag");
    }
    expect(ohne).toBe(0);       // der Zustand bis 06.08.2026
    expect(mit).toBeGreaterThan(0);
  });

  it("je Spieltag bekommt HÖCHSTENS EINER den Trost-Joker", async () => {
    const { rules, eintraege, tagesPunkte } = await runde(EREIGNISSE);
    const proTag = new Map();
    for (const u of SPIELER) {
      for (const g of erspielteJoker({
        eintraege: eintraege.filter((e) => e.userId === u),
        alleEintraege: eintraege, spieltagsPunkte: tagesPunkte, rules,
      })) {
        if (g.key !== "letzter-am-spieltag") continue;
        const k = `${g.wettbewerb}#${g.matchday}`;
        proTag.set(k, (proTag.get(k) ?? 0) + 1);
      }
    }
    expect([...proTag.values()].every((n) => n === 1)).toBe(true);
  });
});

describe("„alle Spiele des Spieltags getippt“ braucht die Tipps der ANDEREN", () => {
  const EREIGNISSE = { enabled: true, maxErspielt: 15, aktive: [{ key: "spieltag-komplett", belohnung: 1 }] };

  it("ohne `alleEintraege` bekommt auch der Joker, der die Hälfte ausgelassen hat", async () => {
    const { rules, eintraege } = await runde(EREIGNISSE, { luecke: "u-kemal" });
    const meine = eintraege.filter((e) => e.userId === "u-kemal");
    // Der eigene Spieltag ist mit den eigenen Tipps immer „vollständig".
    expect(zaehle(erspielteJoker({ eintraege: meine, rules }), "spieltag-komplett")).toBeGreaterThan(0);
  });

  it("mit `alleEintraege` bekommt er nichts — und die Vollständigen alles", async () => {
    const { rules, eintraege, tagesPunkte } = await runde(EREIGNISSE, { luecke: "u-kemal" });
    const fuer = (u) => zaehle(erspielteJoker({
      eintraege: eintraege.filter((e) => e.userId === u),
      alleEintraege: eintraege, spieltagsPunkte: tagesPunkte, rules,
    }), "spieltag-komplett");
    expect(fuer("u-kemal")).toBe(0);
    expect(fuer("u-du")).toBeGreaterThan(0);
    expect(fuer("u-lena")).toBe(fuer("u-du"));
  });
});

// ── Der Spieltag DER RUNDE ──────────────────────────────────
// 🔴 Die in CLAUDE.md beschriebene Fehlerklasse, hier an den Ereignissen:
// über LIGA-Spieltage geschlüsselt vergibt eine Runde über mehrere Wettbewerbe
// mehrere Trost-Joker pro Woche, und „drei Spieltage in Folge getippt" zählt
// eine andere Folge als die Zeitachse daneben.
//
// Gemessen am 06.08.2026 (90 Spiele, drei Spieler, alle Ereignisse an):
//   nur Bundesliga            13 Liga- → 12 Runden-Spieltage: 45 → 45 Gutschriften
//   Bundesliga + Premier L.   11 Liga- →  6 Runden-Spieltage: 45 → 30 Gutschriften
// Bei einem Wettbewerb sind beide Schlüssel deckungsgleich — deshalb ist die
// zweite Zeile die, auf die es ankommt.

describe("Ereignisse zählen in RUNDEN-Spieltagen, sobald eine Achse mitkommt", () => {
  const EREIGNISSE = {
    enabled: true, maxErspielt: 60,
    aktive: [
      { key: "letzter-am-spieltag", belohnung: 1 },
      { key: "serie", anzahl: 3, belohnung: 1 },
      { key: "spieltag-komplett", belohnung: 1 },
    ],
  };

  async function gutschriften(teams, mitSchluessel) {
    const rules = sanitizeRules({ ...DEFAULT_RULES, ereignisse: EREIGNISSE });
    const st = createMockStore();
    const rnd = await st.createRound({ name: "M", adminId: "u-du", rules, teamFilter: teams });
    const spiele = (await st.listRoundMatches(rnd.id)).filter((m) => m.result)
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).slice(0, 90);
    for (const [i, m] of spiele.entries()) {
      for (const [j, u] of SPIELER.entries()) {
        await st.saveTip({
          roundId: rnd.id, matchId: m.id, userId: u,
          tip: { home: (i + j) % 4, away: (i * j) % 3, goals: { home: [], away: [] } },
          snapshot: m.snapshot,
        });
      }
    }
    const eintraege = await st.getRoundEntries(rnd.id);
    const spieltagsPunkte = await st.getSpieltagsPunkte(rnd.id);
    const achse = zeitachse(spiele, rules.zeitachse);
    const schluessel = mitSchluessel ? (rundenSchluessel(achse) ?? undefined) : undefined;
    let n = 0;
    for (const u of SPIELER) {
      n += erspielteJoker({
        eintraege: eintraege.filter((e) => e.userId === u),
        alleEintraege: eintraege, spieltagsPunkte, rules, schluessel,
      }).length;
    }
    return { n, ligaTage: new Set(spiele.map((m) => `${m.wettbewerb}#${m.matchday}`)).size, rundenTage: achse.length };
  }

  const plTeams = Object.keys(LIGEN.find((l) => l.key === "pl").ratings);

  it("über MEHRERE Wettbewerbe fallen Liga-Spieltage zusammen — und die Gutschriften mit", async () => {
    const ohne = await gutschriften([...blTeams, ...plTeams], false);
    const mit = await gutschriften([...blTeams, ...plTeams], true);
    expect(mit.rundenTage).toBeLessThan(mit.ligaTage);
    expect(mit.n).toBeLessThan(ohne.n);
  }, 30000);

  it("bei EINEM Wettbewerb ändert der Schlüssel nichts — kein stiller Regelwechsel", async () => {
    const ohne = await gutschriften(blTeams, false);
    const mit = await gutschriften(blTeams, true);
    expect(mit.n).toBe(ohne.n);
  }, 30000);
});
