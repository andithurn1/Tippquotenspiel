// ============================================================
//  GREIFT-DURCHGANG — bewegt JEDE Einstellung wirklich etwas?
//
//  Aufruf:  npm run greift
//
//  🔴 Der Baukasten-Grundsatz in einem Satz: „eine Einstellung, die ins Leere
//  läuft, ist kein Baukastenteil." Diese Messung stellt genau diese Frage —
//  nicht für eine Mechanik, sondern für ALLE auf einmal.
//
//  Sie ist aus einem Fund entstanden: `autoTip.js` (Versäumnis) war fertig
//  gebaut, getestet, über drei Regler einstellbar — und wurde von niemandem
//  aufgerufen. Das ist bei einer Prüfung von Hand nur aufgefallen, weil danach
//  gesucht wurde. Vier weitere Mechaniken hatten Regler, die nichts bewegten
//  (Duell-Stärke unter dem Saison-Deckel) oder die falsche Zahl trafen
//  (Joker-Plan über Liga- statt Runden-Spieltage).
//
//  ── Wie gemessen wird ──
//  Eine feste Runde: dieselben Spiele, dieselben Tipps, dieselben Spieler.
//  Einmal mit der Vorgabe, dann je Regel-Block einmal mit einer EXTREMEN
//  Einstellung. Ändert sich das Leaderboard nicht, ist der Block entweder
//  nicht angeschlossen oder von etwas anderem überdeckt.
//
//  ⚠️ „Bewegt nichts" ist ein BEFUND, kein Fehler. Manche Blöcke gehören
//  nicht in die Wertung (Benachrichtigungen, Anzeige-Stufen) und stehen
//  deshalb gar nicht erst in der Liste. Wer einen neuen Block ergänzt, trägt
//  ihn hier ein — mit der Einstellung, bei der er am deutlichsten wirkt.
// ============================================================
import { createMockStore } from "../src/lib/store.mock.js";
import { DEFAULT_RULES, sanitizeRules } from "../src/lib/engine.js";
import { LIGEN } from "../src/lib/ligen.js";
import { erspielteJoker } from "../src/lib/jokerKontingent.js";
import { zeitachse, rundenSchluessel } from "../src/lib/zeitachse.js";

const blTeams = Object.keys(LIGEN.find((l) => l.key === "bl").ratings);
const plTeams = Object.keys(LIGEN.find((l) => l.key === "pl").ratings);
const SPIELER = ["u-du", "u-lena", "u-kemal"];

// Je Block die Einstellung, bei der er am deutlichsten wirkt — und, wo nötig,
// was am TIPP dafür gesetzt sein muss (Joker, Duell-Ziel …). Ohne das greift
// eine Regel nie, und die Zeile stünde grün da, ohne etwas geprüft zu haben.
const FAELLE = [
  ["k (Nähe-Steilheit)", { k: 3 }],
  ["m (Nähe-Höhe)", { m: 3 }],
  ["minPayout", { minPayout: 5 }],
  ["winnerFloor", { winnerFloor: false }],
  // ⚠️ `wrongPenalty` ist ein MINUS (Limits −5…0). Mit +5 clampt es auf 0,
  // also auf die Vorgabe — der erste Lauf meldete deshalb „bewegt nichts".
  // ⚠️ Zusammen mit `minPayout`, und das ist der Befund: bei `minPayout: 0`
  // (Vorgabe) ist `nearParts` praktisch nie exakt 0, und der Abzug greift in
  // gemessen 1 % der hoffnungslosen Tipps. Mit einer Mindestauszahlung sind es
  // 50 %. Die beiden Regler gehören zusammen — eine Regler-Warnung sagt das
  // jetzt auch im Editor.
  ["wrongPenalty (+ minPayout)", { wrongPenalty: -5, minPayout: 5 }],
  ["combo", { combo: { ...DEFAULT_RULES.combo, exakt: 5 } }],
  ["displayScale", { displayScale: 40 }],
  ["perGameCap", { perGameCap: 50 }],
  // Braucht Tipps, die mehr als einen Schützen nennen — sonst ändert die
  // erlaubte Anzahl nichts.
  ["markets (Picks je Team)", { markets: { ...DEFAULT_RULES.markets,
    goals: { ...DEFAULT_RULES.markets.goals, picksPerTeam: 3 } } }, { mehrSchuetzen: true,
    hinweis: "greift nur, wenn ein Spiel überhaupt drei plausible Schützen anbietet" }],
  ["underdogBoost", { underdogBoost: 3 }],
  ["favFlopPenalty", { favFlopPenalty: 15 }],
  ["joker (Faktor)", { joker: { enabled: true, modus: "einzel", faktor: 3 } }, { joker: true }],
  ["teamMods (Derby)", { teamMods: { derbyFaktor: 1, teams: Object.fromEntries(blTeams.map((t) => [t, 2])) } }],
  // Der Big-Game-Wert entsteht erst beim ÖFFNEN des Spieltags (Admin-Handlung,
  // siehe `spieltagOeffnen`). Ohne das Öffnen ist die Regel folgenlos — das ist
  // so gewollt und muss im Messfall nachgestellt werden.
  ["bigGame", { bigGame: { enabled: true, aufschlag: 1, minSpannung: 0 } }, { oeffnen: true,
    hinweis: "braucht eine laufende Saison — der Spannungswert kommt aus dem Tabellenstand, "
      + "und am 1. Spieltag gibt es keinen" }],
  ["modCap", {
    joker: { enabled: true, modus: "einzel", faktor: 3 }, modCap: 1.1,
  }, { joker: true, gegen: { joker: { enabled: true, modus: "einzel", faktor: 3 } } }],
  ["aufholen", { aufholen: { enabled: true, staerke: "stark", schwelle: 0.05 } }],
  ["saisonform (Kurve)", { saisonform: { kurve: "steigend", streich: 0 } }],
  ["saisonform (Streicher)", { saisonform: { kurve: "flach", streich: 3 } }],
  // ⚠️ Braucht mindestens `minTipper` Tipps OHNE den eigenen — bei drei
  // Spielern sind das zwei, und die Regel greift bewusst nicht (Rauschen).
  ["tippEinfluss", { tippEinfluss: { staerke: 1, marktTiefe: 1, minTipper: 3 } },
    { spieler: Array.from({ length: 10 }, (_, i) => `u-${i}`) }],
  ["versaeumnis", {
    versaeumnis: { enabled: true, strategie: "wahrscheinlich", malusProzent: 0, maxProSaison: 20 },
  }, { ohneFilter: true, luecke: true,
    hinweis: "braucht ein bereits ANGEPFIFFENES Spiel und ein MITGLIED, das es versäumt hat — "
      + "vor Saisonstart gibt es beides nicht" }],
  ["wettbewerbe (Aufschlag)", { wettbewerbe: { enabled: true, aufschlaege: { bl: 1 } } }],
  ["duell", {
    duell: { enabled: true, typen: ["klau"], maxProSaison: 0, klau: { anteil: 0.5, modus: "nullsumme" } },
  }, { duell: true }],
  ["drehrad", {
    drehrad: {
      enabled: true, frequenz: 2, phase: "ganze", maxPunkteProSaison: 0,
      felder: [{ id: "p", label: "Punkte", gewicht: 1, belohnung: { typ: "punkte", betrag: 500 } }],
    },
  }],
  ["saison (Wetten)", {
    saison: { enabled: true, gewicht: 1, wetten: [{ key: "meister", punkte: 500 }] },
  }, { saisonTipp: true }],
];

async function board(extra, opt = {}) {
  const spieler = opt.spieler ?? SPIELER;
  const st = createMockStore();
  const rules = sanitizeRules({ ...DEFAULT_RULES, ...extra });
  const rnd = await st.createRound({
    name: "M", adminId: "u-du", rules,
    teamFilter: opt.ohneFilter ? null : blTeams,
  });
  const spiele = (await st.listRoundMatches(rnd.id))
    .filter((m) => m.result).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).slice(0, 36);
  for (const [i, m] of spiele.entries()) {
    for (const [j, u] of spieler.entries()) {
      // Eine LÜCKE für den Versäumnis-Fall: „Lena" lässt Spiele aus — auch das
      // erste, denn nur das Demo-Länderspiel ist überhaupt schon angepfiffen.
      if (opt.luecke && u === "u-lena" && i % 2 === 0) continue;
      const namen = Object.keys(m.snapshot?.players?.home ?? {}).slice(0, opt.mehrSchuetzen ? 3 : 1);
      const tip = {
        home: (i + j) % 4, away: (i * j) % 3,
        goals: { home: namen, away: [] },
      };
      if (opt.joker && u === "u-du" && i % 9 === 0) tip.joker = true;
      if (opt.duell && u === "u-du") tip.duell = { auf: "u-lena", typ: "klau" };
      await st.saveTip({ roundId: rnd.id, matchId: m.id, userId: u, tip, snapshot: m.snapshot });
    }
  }
  if (opt.saisonTipp) {
    await st.saveSeasonTip({ roundId: rnd.id, userId: "u-du", wettenId: "meister", wert: blTeams[0] });
  }
  // Spieltage öffnen (friert u. a. den Big-Game-Wert ein) — Admin-Handlung.
  if (opt.oeffnen) {
    const gruppen = new Set(spiele.map((m) => `${m.wettbewerb}|${m.matchday}`));
    for (const g of gruppen) {
      const [wettbewerb, matchday] = g.split("|");
      await st.openMatchday(rnd.id, Number(matchday), wettbewerb).catch(() => {});
    }
  }
  const brd = await st.getLeaderboard(rnd.id);
  return Object.fromEntries(brd.map((b) => [b.userId, b.total]));
}

const abstand = (a, b, spieler = SPIELER) => spieler.reduce((s, u) => s + Math.abs((a[u] ?? 0) - (b[u] ?? 0)), 0);

// 🔴 Kommt die Einstellung überhaupt DURCH? `sanitizeRules` verwirft, was es
// nicht kennt — ein Tippfehler im Feldnamen sieht danach exakt aus wie eine
// tote Einstellung. Genau das ist beim ersten Lauf passiert: `wettbewerbe`
// wurde mit `gewichte` statt `aufschlaege` gemessen und als „bewegt nichts"
// gemeldet, obwohl die Regel einwandfrei greift.
//
// Dieselbe Lehre wie in Teil 3 des Anzeige-Durchgangs: eine Messung, die nicht
// prüft, ob sie etwas geprüft hat, meldet Ruhe statt Befunden.
function kommtDurch(extra, gegen = {}) {
  const a = JSON.stringify(sanitizeRules({ ...DEFAULT_RULES, ...gegen }));
  const b = JSON.stringify(sanitizeRules({ ...DEFAULT_RULES, ...extra }));
  return a !== b;
}

console.log(`\n${"=".repeat(88)}`);
console.log("  GREIFT-DURCHGANG — bewegt jede Einstellung die Wertung?");
console.log(`  ${FAELLE.length} Regel-Blöcke, jeweils Vorgabe gegen Extremwert`);
console.log(`${"=".repeat(88)}\n`);

const tot = [];
const verworfen = [];
for (const [name, extra, opt = {}] of FAELLE) {
  // Der Vergleichsstand muss DIESELBEN Tipps haben — bei einem Fall mit
  // `joker: true` etwa auch die Joker-Markierungen, sonst misst man den Tipp
  // statt die Regel.
  if (!kommtDurch(extra, opt.gegen)) {
    console.log(`  ${name.padEnd(26)} ⚠️  EINSTELLUNG VERWORFEN — der Messfall trifft das Regelwerk nicht`);
    verworfen.push(name);
    continue;
  }
  const basis = await board(opt.gegen ?? {}, opt);
  const jetzt = await board(extra, opt);
  const d = abstand(basis, jetzt, opt.spieler ?? SPIELER);
  console.log(`  ${name.padEnd(26)} ${d === 0 ? "⚠️  BEWEGT NICHTS" : `bewegt ${Math.round(d)} Punkte`}`);
  if (d === 0) {
    // 🔴 Ein Fall, der nichts bewegt, MUSS erklärt sein. Ohne Erklärung ist er
    // ein Verdacht; mit Erklärung ist er eine bekannte Grenze des Szenarios.
    // Ein unerklärtes „bewegt nichts" ist der Versäumnis-Fall von vorhin.
    if (opt.hinweis) console.log(`  ${" ".repeat(26)} └ erklärt: ${opt.hinweis}`);
    tot.push(opt.hinweis ? `${name} (erklärt)` : name);
  }
}

console.log(`\n${"-".repeat(88)}`);
if (verworfen.length) {
  console.log("  ⚠️ Diese Messfälle kamen gar nicht erst durch `sanitizeRules`:");
  for (const v of verworfen) console.log(`     - ${v}`);
  console.log("  Das ist ein Fehler IM MESSFALL, nicht in der Regel — Feldname prüfen.\n");
}
if (tot.length) {
  console.log("  ⚠️ Diese Blöcke haben die Wertung NICHT verändert:");
  for (const t of tot) console.log(`     - ${t}`);
  console.log("\n  Das heißt nicht zwingend kaputt — eine Regel kann von einer anderen");
  console.log("  überdeckt sein (Deckel!) oder im gewählten Szenario nie auslösen.");
  console.log("  Beides ist ein Befund und gehört nachgesehen.");
} else {
  console.log("  ✅ Jeder geprüfte Block bewegt die Wertung.");
}
console.log();

// ════════════════════════════════════════════════════════════
//  TEIL 2 — Einstellungen, die KEINE Punkte bewegen
//
//  🔴 Die Lücke, die Teil 1 nicht sehen kann: `rules.ereignisse` zahlt keine
//  Punkte, sondern JOKER-Gutschriften. Im Leaderboard steht deshalb dieselbe
//  Zahl, egal wie die Ereignisse eingestellt sind — der ganze Block fehlte in
//  der Liste oben und war damit unvermessen.
//
//  Genau dort saß der Fund vom 06.08.2026: der Trost-Joker war über die
//  Oberfläche einschaltbar und lieferte 0 Gutschriften, weil kein Aufrufer die
//  `spieltagsPunkte` mitgab. Gemessen wird deshalb, was diese Ebene wirklich
//  ausschüttet — Gutschriften, nicht Punkte.
//
//  Wer eine Mechanik ergänzt, die keine Punkte bewegt, hängt sie HIER an.
// ════════════════════════════════════════════════════════════

async function gutschriften(ereignisse, { teams = blTeams, spiele: anzahl = 54, luecke = null } = {}) {
  const st = createMockStore();
  const rules = sanitizeRules({ ...DEFAULT_RULES, ereignisse });
  const rnd = await st.createRound({ name: "E", adminId: "u-du", rules, teamFilter: teams });
  const spiele = (await st.listRoundMatches(rnd.id)).filter((m) => m.result)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).slice(0, anzahl);
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
  const eintraege = await st.getRoundEntries(rnd.id);
  const spieltagsPunkte = await st.getSpieltagsPunkte(rnd.id);
  const schluessel = rundenSchluessel(zeitachse(spiele, rules.zeitachse)) ?? undefined;
  const je = {};
  for (const u of SPIELER) {
    for (const g of erspielteJoker({
      eintraege: eintraege.filter((e) => e.userId === u),
      alleEintraege: eintraege, spieltagsPunkte, rules, schluessel,
    })) je[g.key] = (je[g.key] ?? 0) + 1;
  }
  return { je, summe: Object.values(je).reduce((a, b) => a + b, 0) };
}

const AUS = { enabled: false, maxErspielt: 5, aktive: [] };
const EREIGNIS_FAELLE = [
  ["serie (3 in Folge)", { key: "serie", anzahl: 3, belohnung: 1 }],
  ["erster-exakter", { key: "erster-exakter", belohnung: 1 }],
  ["aussenseiter (ab 3,0)", { key: "aussenseiter", abQuote: 3, belohnung: 1 }],
  ["spieltag-komplett", { key: "spieltag-komplett", belohnung: 1 }],
  ["letzter-am-spieltag", { key: "letzter-am-spieltag", belohnung: 1 }],
];

console.log(`${"=".repeat(88)}`);
console.log("  TEIL 2 — Ereignisse: Gutschriften statt Punkte");
console.log(`${"=".repeat(88)}\n`);

const stumm = [];
const nullstand = await gutschriften(AUS);
console.log(`  ${"(ausgeschaltet)".padEnd(26)} ${nullstand.summe} Gutschriften`);
for (const [name, eintrag] of EREIGNIS_FAELLE) {
  const an = { enabled: true, maxErspielt: 60, aktive: [eintrag] };
  // Auch hier: kommt die Einstellung überhaupt durch `sanitizeRules`?
  if (!sanitizeRules({ ...DEFAULT_RULES, ereignisse: an }).ereignisse.aktive.length) {
    console.log(`  ${name.padEnd(26)} ⚠️  EINSTELLUNG VERWORFEN — Feldname prüfen`);
    stumm.push(`${name} (verworfen)`);
    continue;
  }
  const r = await gutschriften(an);
  console.log(`  ${name.padEnd(26)} ${r.summe === 0 ? "⚠️  ZAHLT NICHTS" : `${r.summe} Gutschriften`}`);
  if (r.summe === 0) stumm.push(name);
}

// Der Deckel gehört dazu: er ist die einzige Einstellung dieser Ebene, die
// nach OBEN begrenzt, und ohne Gegenprobe fiele nicht auf, wenn er durchlässt.
const alleAn = { enabled: true, maxErspielt: 60, aktive: EREIGNIS_FAELLE.map(([, e]) => e) };
const offen = await gutschriften(alleAn);
const gedeckelt = await gutschriften({ ...alleAn, maxErspielt: 2 });
console.log(`  ${"maxErspielt (60 → 2)".padEnd(26)} ${offen.summe} → ${gedeckelt.summe} Gutschriften`
  + `${gedeckelt.summe >= offen.summe ? "  ⚠️  DECKELT NICHT" : ""}`);
if (gedeckelt.summe >= offen.summe) stumm.push("maxErspielt");

// 🔴 Und die Frage, an der der Joker-Plan schon einmal hing: zählt diese Ebene
// in LIGA- oder in RUNDEN-Spieltagen? Über Liga-Spieltage vergäbe eine Runde
// über zwei Ligen doppelt so viele Trost-Joker wie Runden-Spieltage existieren.
const einLiga = await gutschriften(alleAn);
const zweiLigen = await gutschriften(alleAn, { teams: [...blTeams, ...plTeams], spiele: 90 });
console.log(`\n  Runden-Schlüssel: eine Liga ${einLiga.summe} · zwei Ligen ${zweiLigen.summe} Gutschriften`);
console.log("  └ zwei Ligen dürfen NICHT proportional mehr sein: die Liga-Spieltage");
console.log("    fallen in gemeinsame Runden-Spieltage zusammen.");

console.log(`\n${"-".repeat(88)}`);
if (stumm.length) {
  console.log("  ⚠️ Diese Ereignis-Einstellungen haben nichts ausgeschüttet:");
  for (const t of stumm) console.log(`     - ${t}`);
} else {
  console.log("  ✅ Jedes geprüfte Ereignis schüttet aus, und der Deckel greift.");
}
console.log();
