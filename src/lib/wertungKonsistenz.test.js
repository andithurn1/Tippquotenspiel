import { describe, it, expect } from "vitest";
import { createMockStore } from "@/lib/store.mock";
import { DEFAULT_RULES, sanitizeRules, scoreTip } from "@/lib/engine";
import { mitTippEinfluss } from "@/lib/tippEinfluss";
import { LIGEN } from "@/lib/ligen";

// ============================================================
//  Punkt 3 der Nutzer-Reihenfolge (05.08.2026): „jeder erzeugte Wert wird in
//  JEDER Anzeige wahrheitsgemäß ausgegeben — derselbe Wert darf in
//  Aufschlüsselung, Verlauf, Leaderboard, Vorschau und Rundenansicht nicht
//  verschieden dastehen."
//
//  🔴 Gemessen am 07.08.2026 und bestätigt: 53 von 120 Tipps standen in der
//  Abrechnung anders als im Leaderboard, bis zu 445 Punkte Unterschied.
//  `scoreLeaderboard` rechnet über `mitTippEinfluss` (das Ergebnis-Raster wird
//  von den Tipps der Runde mitbewegt), die Abrechnung nahm den ROHEN Snapshot.
//
//  ⚠️ Der Fall tritt nur bei eingeschaltetem `tippEinfluss` auf — Vorgabe ist
//  aus. Deshalb hat ihn jahrelang niemand gesehen, und deshalb steht er hier
//  als Test und nicht als Kommentar.
// ============================================================

const blTeams = Object.keys(LIGEN.find((l) => l.key === "bl").ratings);
const SPIELER = Array.from({ length: 10 }, (_, i) => `u-${i}`);

async function runde(teil) {
  const rules = sanitizeRules({ ...DEFAULT_RULES, ...teil });
  const st = createMockStore();
  const rnd = await st.createRound({ name: "K", adminId: "u-0", rules, teamFilter: blTeams });
  const spiele = (await st.listRoundMatches(rnd.id)).filter((m) => m.result).slice(0, 12);
  for (const [i, m] of spiele.entries()) {
    for (const [j, u] of SPIELER.entries()) {
      st.seedTip({
        roundId: rnd.id, matchId: m.id, userId: u,
        tip: { home: (i + j) % 4, away: (i * j) % 3, goals: { home: [], away: [] } },
        snapshot: m.snapshot,
      });
    }
  }
  return { rules, entries: await st.getRoundEntries(rnd.id) };
}

// Wie viele Tipps rechnen auf dem Weg der ABRECHNUNG anders als auf dem Weg
// des LEADERBOARDS?
function abweichungen(entries, rules, wieAbrechnung) {
  const gemischt = mitTippEinfluss(entries, rules);
  let abw = 0;
  let max = 0;
  for (const [i, e] of entries.entries()) {
    if (!e.result || !e.snapshot) continue;
    const a = scoreTip(...wieAbrechnung(e, gemischt[i]), rules).total;
    const b = scoreTip(gemischt[i].tip, e.result, gemischt[i].snapshot, rules).total;
    if (a !== b) { abw++; max = Math.max(max, Math.abs(a - b)); }
  }
  return { abw, max };
}

const AN = { tippEinfluss: { staerke: 1, marktTiefe: 1, minTipper: 3 } };

describe("Dieselbe Wertung, dieselbe Zahl — Abrechnung gegen Leaderboard", () => {
  it("rechnet mit dem gemischten Raster, so wie das Leaderboard", async () => {
    const { rules, entries } = await runde(AN);
    const { abw } = abweichungen(entries, rules, (e, gem) => [gem.tip, e.result, gem.snapshot]);
    expect(abw).toBe(0);
  });

  // 🔴 Die Gegenprobe, ohne die der Test nichts beweist: mit dem ROHEN
  // Snapshot — so stand es bis zum 07.08.2026 — MUSS es auseinanderlaufen.
  // Täte es das nicht, wäre der Fall gar nicht nachgestellt und die Zeile
  // darüber stünde grün da, ohne etwas geprüft zu haben.
  it("mit dem rohen Snapshot laufen sie auseinander — der behobene Fall", async () => {
    const { rules, entries } = await runde(AN);
    const { abw, max } = abweichungen(entries, rules, (e) => [e.tip, e.result, e.snapshot]);
    expect(abw).toBeGreaterThan(0);
    expect(max).toBeGreaterThan(0);
  });

  // Ist die Regel aus (Vorgabe), gibt es nichts zu mischen — beide Wege sind
  // identisch, und die Abrechnung verhält sich exakt wie vorher.
  it("ohne Tipp-Einfluss ändert sich gar nichts", async () => {
    const { rules, entries } = await runde({});
    const { abw } = abweichungen(entries, rules, (e) => [e.tip, e.result, e.snapshot]);
    expect(abw).toBe(0);
  });
});
