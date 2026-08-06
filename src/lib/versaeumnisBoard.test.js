import { describe, it, expect } from "vitest";
import { ersatzEintraege, ersatzStand } from "@/lib/versaeumnisBoard";
import { DEFAULT_RULES, sanitizeRules, scoreLeaderboard } from "@/lib/engine";
import { alleMatches, LIGEN } from "@/lib/ligen";
import { filterMatchesByTeams } from "@/lib/roundStatus";

// 🔴 Der Befund vom 06.08.2026: `autoTip.js` war fertig gebaut, getestet und
// über die Profi-Oberfläche einstellbar — und `autoTipsFor` wurde von NIEMANDEM
// aufgerufen. Aus dem Modul importiert waren nur die Regler-LABELS. Der Admin
// konnte die Kulanz einschalten, Strategie, Malus und Höchstzahl wählen, und
// es passierte nichts.
//
// Diese Tests messen deshalb nicht „ist die Rechnung richtig" (das prüft
// `autoTip.test.js`), sondern die Frage des Baukasten-Grundsatzes: **bewegt
// jeder Regler die Zahl?**

const MATCHES = filterMatchesByTeams(
  alleMatches().map((m) => ({ ...m, id: m.matchId })),
  Object.keys(LIGEN.find((l) => l.key === "bl").ratings),
);
const SPIELE = MATCHES.filter((m) => m.wettbewerb === "bl" && m.result).slice(0, 20);
// Nach dem letzten dieser Spiele — vorher ist es kein Versäumnis, sondern ein
// offenes Tipp-Fenster.
const JETZT = new Date(SPIELE[SPIELE.length - 1].kickoff).getTime() + 36e5;

// „Du" tippt alle zwanzig, „Lena" nur die ersten fünf → 15 Versäumnisse.
const TIPS = [];
for (const [i, m] of SPIELE.entries()) {
  const tip = { home: 2, away: 1, goals: { home: [], away: [] } };
  TIPS.push({ match_id: m.id, user_id: "u-du", tip });
  if (i < 5) TIPS.push({ match_id: m.id, user_id: "u-lena", tip });
}
const eintragVon = (t) => {
  const m = SPIELE.find((x) => x.id === t.match_id);
  return {
    userId: t.user_id, name: t.user_id, tip: t.tip, snapshot: m.snapshot,
    result: m.result, matchday: m.matchday, wettbewerb: m.wettbewerb, kickoff: m.kickoff,
  };
};

const regeln = (versaeumnis) => sanitizeRules({ ...DEFAULT_RULES, versaeumnis });
const bauen = (versaeumnis, jetzt = JETZT) => ersatzEintraege({
  matches: SPIELE, tips: TIPS, rules: regeln(versaeumnis),
  userIds: ["u-du", "u-lena"], nameOf: (id) => id, jetzt,
});
const punkte = (versaeumnis) => {
  const rules = regeln(versaeumnis);
  const board = scoreLeaderboard([...TIPS.map(eintragVon), ...bauen(versaeumnis)], rules);
  return board.find((b) => b.userId === "u-lena");
};

const AN = { enabled: true, strategie: "wahrscheinlich", malusProzent: 30, maxProSaison: 10 };

describe("Versäumnis greift — jeder Regler bewegt die Zahl", () => {
  it("ausgeschaltet gibt es keinen einzigen Ersatz-Tipp", () => {
    expect(bauen({ enabled: false })).toEqual([]);
    expect(punkte({ enabled: false }).ersatz).toBe(0);
  });

  it("eingeschaltet bekommt der Versäumer Punkte, die er ohne Kulanz nicht hätte", () => {
    const ohne = punkte({ enabled: false });
    const mit = punkte(AN);
    expect(mit.total).toBeGreaterThan(ohne.total);
    expect(mit.ersatz).toBeGreaterThan(0);
  });

  it("der MALUS senkt den Ertrag, und 100 % macht den Ersatz-Tipp wertlos", () => {
    const ohneMalus = punkte({ ...AN, malusProzent: 0 });
    const mitMalus = punkte({ ...AN, malusProzent: 30 });
    const voll = punkte({ ...AN, malusProzent: 100 });
    expect(mitMalus.total).toBeLessThan(ohneMalus.total);
    // Bei 100 % Malus zahlt der Ersatz-Tipp nichts — dasselbe Ergebnis wie aus.
    expect(voll.total).toBe(punkte({ enabled: false }).total);
  });

  it("`maxProSaison` deckelt wirklich — und zwar chronologisch", () => {
    const viele = bauen({ ...AN, maxProSaison: 10 }).filter((e) => e.userId === "u-lena");
    const wenige = bauen({ ...AN, maxProSaison: 3 }).filter((e) => e.userId === "u-lena");
    expect(viele).toHaveLength(10);
    expect(wenige).toHaveLength(3);
    // Die DREI FRÜHESTEN, nicht irgendwelche drei: sonst hinge es an der
    // Sortierung des Katalogs, welche Versäumnisse die Kulanz erwischt.
    const zeit = (e) => new Date(e.kickoff).getTime();
    expect(wenige.map(zeit)).toEqual(viele.slice(0, 3).map(zeit));
  });

  it("die STRATEGIE ändert den Ersatz-Tipp messbar", () => {
    const a = punkte({ ...AN, strategie: "wahrscheinlich" }).total;
    const b = punkte({ ...AN, strategie: "schnitt" }).total;
    const c = punkte({ ...AN, strategie: "zufall" }).total;
    // Mindestens zwei der drei müssen auseinanderliegen — wären alle gleich,
    // wäre der Regler eine Zierde.
    expect(new Set([a, b, c]).size).toBeGreaterThan(1);
  });

  it("wer alles getippt hat, bekommt keinen Ersatz", () => {
    expect(bauen(AN).some((e) => e.userId === "u-du")).toBe(false);
  });
});

describe("Ein Versäumnis entsteht erst mit dem Anpfiff", () => {
  it("vor dem ersten Anpfiff gibt es keine Ersatz-Tipps", () => {
    const frueh = new Date(SPIELE[0].kickoff).getTime() - 36e5;
    expect(bauen(AN, frueh)).toEqual([]);
  });

  it("nach dem fünften Spiel nur für die fünf, die gelaufen sind", () => {
    const nachFuenf = new Date(SPIELE[5].kickoff).getTime() + 36e5;
    const e = bauen(AN, nachFuenf).filter((x) => x.userId === "u-lena");
    // Lena hat die ersten fünf getippt — versäumt hat sie erst das sechste.
    expect(e).toHaveLength(1);
  });
});

describe("Ein Ersatz-Tipp ist kein abgegebener Tipp", () => {
  it("er zählt in der Wertung, aber nicht in „x von y getippt“", () => {
    const b = punkte(AN);
    expect(b.tips).toBe(5);          // wirklich abgegeben
    expect(b.ersatz).toBe(10);       // dazu die Kulanz
    expect(b.gewertet).toBe(15);     // beides zusammen ist gewertet
  });

  it("jeder Eintrag ist als Ersatz markiert und trägt seinen Malus", () => {
    for (const e of bauen(AN)) {
      expect(e.ersatz).toBe(true);
      expect(e.malusFaktor).toBeCloseTo(0.7, 5);
    }
  });
});

describe("ersatzStand", () => {
  it("nennt Verbrauch und Kontingent, nicht nur eine Liste", () => {
    const stand = ersatzStand(bauen({ ...AN, maxProSaison: 3 }), regeln({ ...AN, maxProSaison: 3 }));
    expect(stand.maxProSaison).toBe(3);
    expect(stand.malusProzent).toBe(30);
    expect(stand.proSpieler["u-lena"]).toBe(3);
  });
});

// ── Der Verlauf im „Was wäre gewesen"-Screen ────────────────
// 🔴 Befund 06.08.2026: `Historie.jsx` baut seinen Verlauf aus
// `getRoundEntries()` — und das liefert nur ABGEGEBENE Tipps. Ein Ersatz-Tipp
// ist per Definition keiner. Das Ranking dagegen bekommt sie vom Store
// mitgeliefert.
//
// Heute fällt der Unterschied nicht auf, weil noch kein Spiel der Runde
// angepfiffen ist (Bundesliga-Start 28.08.2026) und ein Versäumnis erst mit
// dem Anpfiff entsteht. Ab dann hätten die beiden Screens verschiedene Zahlen
// gezeigt — gemessen unten.

describe("Ein Verlauf ohne Ersatz-Tipps ist ein anderer Verlauf", () => {
  const REGELN = regeln({ enabled: true, strategie: "wahrscheinlich", malusProzent: 20, maxProSaison: 20 });

  it("misst den Unterschied in Punkten — nicht nur, DASS es einen gibt", () => {
    const nur = scoreLeaderboard(TIPS.map(eintragVon), REGELN);
    const mit = scoreLeaderboard([...TIPS.map(eintragVon), ...bauen(
      { enabled: true, strategie: "wahrscheinlich", malusProzent: 20, maxProSaison: 20 })], REGELN);
    const lenaOhne = nur.find((b) => b.userId === "u-lena").total;
    const lenaMit = mit.find((b) => b.userId === "u-lena").total;
    // Der Versäumer steht ohne Kulanz messbar schlechter da …
    expect(lenaMit).toBeGreaterThan(lenaOhne);
    // … und zwar nicht um Krümel. In der Messrunde vom 06.08. (36 Spiele,
    // jedes zweite ausgelassen) waren es 801 Punkte = 32 %. Hier reicht die
    // Größenordnung: mehr als ein Zehntel, sonst wäre die Anzeige-Abweichung
    // eine Rundungsfrage und kein Befund.
    expect((lenaMit - lenaOhne) / lenaMit).toBeGreaterThan(0.1);
  });

  it("wer nichts versäumt hat, ist von beiden Wegen gleich betroffen", () => {
    const nur = scoreLeaderboard(TIPS.map(eintragVon), REGELN);
    const mit = scoreLeaderboard([...TIPS.map(eintragVon), ...bauen(
      { enabled: true, strategie: "wahrscheinlich", malusProzent: 20, maxProSaison: 20 })], REGELN);
    expect(mit.find((b) => b.userId === "u-du").total)
      .toBe(nur.find((b) => b.userId === "u-du").total);
  });
});
