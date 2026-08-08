// ============================================================
//  GLEICH-DURCHGANG — steht derselbe Wert überall gleich da?
//
//  Aufruf:  npm run gleich
//
//  🔴 Punkt 3 der Reihenfolge, die der Nutzer am 05.08.2026 festgelegt hat:
//  „jeder erzeugte Wert wird in JEDER Anzeige wahrheitsgemäß ausgegeben —
//  derselbe Wert darf in Aufschlüsselung, Verlauf, Leaderboard, Vorschau und
//  Rundenansicht nicht verschieden dastehen. Das ist eine Vollständigkeits-,
//  keine Balance-Frage."
//
//  Anlass ist ein Fund vom 07.08.2026: die Abrechnung rechnete über den ROHEN
//  Snapshot, das Leaderboard über den von der Runde mitbewegten — 53 von 120
//  Tipps standen verschieden da, bis zu 445 Punkte. Gefunden wurde das
//  zufällig. Diese Messung ersetzt den Zufall.
//
//  ── Was verglichen wird ──
//  Drei Wege zu DERSELBEN Zahl, alle drei aus dem Store:
//    1. `getLeaderboard`         — der Endstand, den die Tabelle zeigt
//    2. `getLeaderboardHistory`  — der letzte Punkt des Verlaufs
//    3. `getSpieltagsPunkte`     — die Summe der Einzel-Spieltage
//  Dazu die Selbstkontrolle der Aufschlüsselung (`breakdown().stimmt`): rechnet
//  die Kette, die ein Spieler von oben nach unten addiert, auf die angezeigte
//  Endzahl auf?
//
//  ⚠️ Gemessen wird über MEHRERE Regelwerke, nicht nur die Vorgabe. Der Fund
//  vom 07.08. trat nur bei eingeschaltetem `tippEinfluss` auf — mit der
//  Vorgabe allein hätte diese Messung Ruhe gemeldet.
//
//  ⚠️ **Kein Balance-Durchgang.** Verglichen werden Anzeigen miteinander, nicht
//  Zahlen mit einem Ideal (siehe CLAUDE.md, Block ganz oben).
// ============================================================
import { createMockStore } from "../src/lib/store.mock.js";
import { DEFAULT_RULES, sanitizeRules } from "../src/lib/engine.js";
import { breakdown } from "../src/lib/breakdown.js";
import { LIGEN } from "../src/lib/ligen.js";

const blTeams = Object.keys(LIGEN.find((l) => l.key === "bl").ratings);
const SPIELER = Array.from({ length: 8 }, (_, i) => `u-${i}`);

// Je Fall ein Regelwerk. Die Vorgabe ist der Normalfall; die übrigen schalten
// je eine Ebene ein, die eine EIGENE Rechnung in den Verlauf einhängt — genau
// dort entstehen zwei Wahrheiten.
const FAELLE = [
  ["Vorgabe", {}],
  ["tippEinfluss", { tippEinfluss: { staerke: 1, marktTiefe: 1, minTipper: 3 } }],
  ["Aufhol-Bonus", { aufholen: { enabled: true, staerke: "stark", schwelle: 0.05 } }],
  ["Saisonform", { saisonform: { kurve: "steigend", streich: 2 } }],
  ["Ereignis-Punkte", { ereignisse: { enabled: true, maxErspielt: 5, aktive: [
    { key: "letzter-am-spieltag", belohnung: 1, abstand: 0, maxProSaison: 0,
      auswahl: { modus: "rang", ende: "unten", n: 1, prozent: 20 },
      wirkung: { typ: "punkte", betrag: 200, maxProSaison: 2000 } },
  ] } }],
];

async function baue(extra) {
  const rules = sanitizeRules({ ...DEFAULT_RULES, ...extra });
  const st = createMockStore();
  const rnd = await st.createRound({ name: "G", adminId: "u-0", rules, teamFilter: blTeams });
  const spiele = (await st.listRoundMatches(rnd.id)).filter((m) => m.result).slice(0, 24);
  for (const [i, m] of spiele.entries()) {
    for (const [j, u] of SPIELER.entries()) {
      st.seedTip({
        roundId: rnd.id, matchId: m.id, userId: u,
        tip: { home: (i + j) % 4, away: (i * j) % 3, goals: { home: [], away: [] } },
        snapshot: m.snapshot,
      });
    }
  }
  return { st, rnd, rules };
}

console.log(`\n${"=".repeat(88)}`);
console.log("  GLEICH-DURCHGANG — steht derselbe Wert in jeder Anzeige gleich da?");
console.log(`  ${FAELLE.length} Regelwerke · Leaderboard gegen Verlauf gegen Spieltagspunkte`);
console.log(`${"=".repeat(88)}\n`);

const befunde = [];
for (const [name, extra] of FAELLE) {
  const { st, rnd, rules } = await baue(extra);
  const board = await st.getLeaderboard(rnd.id);
  const verlauf = await st.getLeaderboardHistory(rnd.id);
  const punkte = await st.getSpieltagsPunkte(rnd.id);
  const entries = await st.getRoundEntries(rnd.id);

  const ende = verlauf?.length ? verlauf[verlauf.length - 1].board : [];
  const vonVerlauf = new Map(ende.map((z) => [z.userId, z.total]));
  const vonPunkten = new Map();
  for (const p of punkte) vonPunkten.set(p.userId, (vonPunkten.get(p.userId) ?? 0) + (Number(p.punkte) || 0));

  let abwVerlauf = 0;
  let abwPunkte = 0;
  let maxV = 0;
  let maxP = 0;
  for (const z of board) {
    const v = vonVerlauf.get(z.userId);
    if (v != null && Math.round(v) !== Math.round(z.total)) {
      abwVerlauf++; maxV = Math.max(maxV, Math.abs(v - z.total));
    }
    const p = vonPunkten.get(z.userId);
    if (p != null && Math.round(p) !== Math.round(z.total)) {
      abwPunkte++; maxP = Math.max(maxP, Math.abs(p - z.total));
    }
  }

  // Die Aufschlüsselung: rechnet die Kette auf ihre eigene Endzahl auf?
  let kette = 0;
  let ketteFehler = 0;
  for (const e of entries) {
    if (!e.result || !e.snapshot || !e.tip) continue;
    kette++;
    if (!breakdown(e.tip, e.result, e.snapshot, rules).stimmt) ketteFehler++;
  }

  // 🔴 Die Sperrklinke: WIE VIELE Werte wurden überhaupt verglichen? Stünde
  // hier 0, hieße „gleich" nur, dass nichts geprüft wurde — dieselbe Falle wie
  // bei `sicht` (kein Spieler-Screen übrig) und `greift` (Einstellung
  // verworfen). Ohne diese Zeile meldet die Messung Ruhe statt Befunden.
  const verglichen = board.filter((z) => vonVerlauf.has(z.userId)).length
    + board.filter((z) => vonPunkten.has(z.userId)).length;
  if (verglichen === 0 || kette === 0) {
    console.log(`  ${name.padEnd(18)} ⚠️  NICHTS VERGLICHEN — die Messung trifft diesen Fall nicht.`);
    befunde.push(`${name} (nichts verglichen)`);
    continue;
  }

  const zeile = `  ${name.padEnd(18)}`
    + ` Verlauf ${abwVerlauf === 0 ? "gleich" : `⚠️ ${abwVerlauf} abw. (max ${Math.round(maxV)})`}`
    + ` · Spieltagssumme ${abwPunkte === 0 ? "gleich" : `⚠️ ${abwPunkte} abw. (max ${Math.round(maxP)})`}`
    + ` · Kette ${ketteFehler === 0 ? `${kette}/${kette}` : `⚠️ ${ketteFehler}/${kette} kaputt`}`
    + ` · ${verglichen} Werte verglichen`;
  console.log(zeile);
  if (abwVerlauf || abwPunkte || ketteFehler) befunde.push(name);
}

console.log(`\n${"-".repeat(88)}`);
if (befunde.length) {
  console.log("  ⚠️ Diese Regelwerke zeigen denselben Wert an zwei Stellen verschieden:");
  for (const b of befunde) console.log(`     - ${b}`);
  console.log();
  console.log("  🔴 Das ist keine Balance-Frage. Ein Spieler, der nachrechnet, bekommt eine");
  console.log("     andere Zahl als die, die dasteht — und kann nicht wissen, welche gilt.");
} else {
  console.log("  ✅ Jeder geprüfte Weg kommt auf dieselbe Zahl.");
}
console.log();
