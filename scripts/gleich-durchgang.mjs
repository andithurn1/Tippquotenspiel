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
import { DEFAULT_RULES, sanitizeRules, projectTip, scoreTip } from "../src/lib/engine.js";
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

// ============================================================
//  TEIL 2 — die VORSCHAU beim Tippen gegen die spätere WERTUNG
//
//  🔴 Warum das bis 09.08.2026 fehlte, stand in der Roadmap: „beides braucht
//  einen gemeinsamen Bezugspunkt, den es noch nicht gibt". Den gibt es doch,
//  und es ist der einzige, der trägt:
//
//      **Das Spiel geht GENAU SO aus, wie getippt wurde.**
//
//  In diesem Fall — und nur in diesem — muss die Zahl, die beim Tippen
//  versprochen wurde, exakt die Zahl sein, die später gutgeschrieben wird.
//  Alles andere ist ein gebrochenes Versprechen an genau der Stelle, an der
//  ein Spieler seine Entscheidung trifft.
//
//  `projectTip` rechnet mit `playerGoals: null` — die Engine nimmt dann an,
//  dass jeder getippte Schütze trifft (ein doppelt gesetzter zweimal). Die
//  Deckungsgleichheit wird hier genau so gebaut, sonst verglichen wir zwei
//  verschiedene Annahmen und nennten die Differenz einen Fehler.
//
//  ⚠️ Die zweite Zahl ist KEIN Befund, sondern eine Auskunft: um wie viel
//  weniger zahlt dasselbe Ergebnis, wenn KEIN getippter Schütze trifft? Das
//  ist die Spanne hinter dem Wort „möglich". Sie gehört gemessen, damit die
//  Oberfläche sie benennen kann — nicht wegkorrigiert.
// ============================================================
console.log(`\n${"=".repeat(88)}`);
console.log("  TEIL 2 — hält die Vorschau beim Tippen, was sie verspricht?");
console.log("  Bezugspunkt: das Spiel geht genau so aus wie getippt");
console.log(`${"=".repeat(88)}\n`);

// Aus den getippten Schützen die Wirklichkeit bauen, die `projectTip`
// annimmt: jeder Genannte trifft, ein doppelt Genannter zweimal.
const schuetzenTreffen = (goals) => {
  const pg = {};
  for (const seite of ["home", "away"]) {
    for (const p of goals?.[seite] ?? []) if (p) pg[p] = (pg[p] || 0) + 1;
  }
  return pg;
};

const vorschauBefunde = [];
for (const [name, extra] of FAELLE) {
  const rules = sanitizeRules({ ...DEFAULT_RULES, ...extra });
  const st = createMockStore();
  const rnd = await st.createRound({ name: "V", adminId: "u-0", rules, teamFilter: blTeams });
  const spiele = (await st.listRoundMatches(rnd.id)).slice(0, 30);

  let geprueft = 0;
  let abweichend = 0;
  let maxAbw = 0;
  let mitSchuetzen = 0;
  let summeVersprochen = 0;
  let summeOhneSchuetzen = 0;

  for (const m of spiele) {
    const snap = m.snapshot;
    if (!snap?.players) continue;
    const heim = Object.keys(snap.players.home ?? {});
    const gast = Object.keys(snap.players.away ?? {});
    if (!heim.length || !gast.length) continue;

    // Vier Tipps je Spiel, damit Joker und Gewicht vorkommen — genau die
    // Ebenen, die `scoreTip` GANZ ZULETZT anwendet und die eine Vorschau
    // deshalb am leichtesten verfehlt.
    const varianten = [
      { home: 2, away: 1, goals: { home: [heim[0]], away: [] } },
      { home: 1, away: 1, goals: { home: [], away: [gast[0]] } },
      { home: 3, away: 0, goals: { home: [heim[0], heim[0]], away: [] }, joker: true },
      { home: 0, away: 2, goals: { home: [], away: [gast[0]] }, gewicht: 2 },
    ];

    for (const tip of varianten) {
      const proj = projectTip(tip, snap, rules);
      const wirklich = { home: tip.home, away: tip.away, playerGoals: schuetzenTreffen(tip.goals) };
      const ist = scoreTip(tip, wirklich, snap, rules).total;
      geprueft++;
      const d = Math.abs(proj.points - ist);
      if (d > 0.5) { abweichend++; maxAbw = Math.max(maxAbw, d); }

      if ((tip.goals.home.length + tip.goals.away.length) > 0) {
        const ohne = scoreTip(tip, { home: tip.home, away: tip.away, playerGoals: {} }, snap, rules).total;
        mitSchuetzen++;
        summeVersprochen += proj.points;
        summeOhneSchuetzen += ohne;
      }
    }
  }

  // Dieselbe Sperrklinke wie in Teil 1: null Vergleiche wären keine Ruhe,
  // sondern eine Messung, die den Fall gar nicht trifft.
  if (geprueft === 0) {
    console.log(`  ${name.padEnd(18)} ⚠️  NICHTS VERGLICHEN — die Messung trifft diesen Fall nicht.`);
    vorschauBefunde.push(`${name} (nichts verglichen)`);
    continue;
  }

  const anteil = summeVersprochen > 0
    ? Math.round((1 - summeOhneSchuetzen / summeVersprochen) * 100) : 0;
  console.log(`  ${name.padEnd(18)}`
    + ` Vorschau ${abweichend === 0 ? "hält" : `⚠️ ${abweichend} abw. (max ${maxAbw.toFixed(1)})`}`
    + ` · ${geprueft} Tipps geprüft`
    + ` · ohne Schützen ${anteil} % weniger (${mitSchuetzen} Tipps)`);
  if (abweichend) vorschauBefunde.push(name);
}

console.log(`\n${"-".repeat(88)}`);
if (vorschauBefunde.length) {
  console.log("  ⚠️ Die Vorschau verspricht etwas anderes, als die Wertung zahlt —");
  console.log("     und zwar im deckungsgleichen Fall, wo beide gleich sein MÜSSEN:");
  for (const b of vorschauBefunde) console.log(`     - ${b}`);
} else {
  console.log("  ✅ Geht das Spiel aus wie getippt, zahlt die Wertung exakt das Versprochene.");
}
console.log();
console.log("  ℹ️ „ohne Schützen X % weniger\" ist KEIN Befund, sondern die Spanne hinter dem");
console.log("     Wort „möglich\": dasselbe Ergebnis, aber kein getippter Schütze trifft.");
console.log("     Die Zahl gehört in die Oberfläche, nicht in eine Korrektur.");

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

// ============================================================
//  TEIL 3 — die RUNDENANSICHT gegen die Wertung
//
//  Der letzte Weg, den dieser Durchgang nicht verglichen hat. Die Übersicht
//  (`RundenHub`, `Hauptmenu`) zeigt vier Zahlen, die anderswo ebenfalls
//  vorkommen: wie viele Spiele die Runde hat, wie viele davon offen sind,
//  wie viele man selbst getippt hat, und den Münz- bzw. Narrenstand.
//
//  🔴 Der Grund, warum gerade hier gemessen werden muss: die beiden Screens
//  holen ihre Zahlen auf VERSCHIEDENEN Wegen. `RundenHub` fragt den Store
//  (`listRoundMatches`), `Hauptmenu` filtert den Katalog selbst — es ist
//  laut eigenem Kommentar „die eine Ausnahme". Zwei Wege zu derselben Zahl
//  sind genau die Stelle, an der dieses Projekt schon 17 Fehler hatte.
//
//  ⚠️ Und seit dem 09.08. ist es keine reine Anzeige-Frage mehr: die
//  Spielauswahl greift jetzt wirklich. Läuft einer der beiden Wege daneben,
//  zeigt die Übersicht eine andere Runde an, als getippt wird.
// ============================================================
console.log(`\n${"=".repeat(88)}`);
console.log("  TEIL 3 — zeigt die Rundenansicht dieselbe Runde, die gewertet wird?");
console.log(`${"=".repeat(88)}\n`);

{
  const { rundenSpiele, computeMatchStatus, countTippedByUser } = await import("../src/lib/roundStatus.js");
  const { muenzStand } = await import("../src/lib/muenzstand.js");
  const { narrenStand } = await import("../src/lib/narrenstand.js");

  // Vier Runden-Zuschnitte, damit die Auswahl wirklich etwas wegnimmt.
  const ZUSCHNITTE = [
    ["alle Spiele", {}],
    ["nur Bundesliga", { spiele: { wettbewerbe: ["bl"] } }],
    ["Endspurt", { spiele: { spieltagVon: 30, spieltagBis: 34 } }],
    ["Münz-Modus", { joker: { enabled: true, modus: "einsatz", faktor: 1 } }],
  ];

  const befunde3 = [];
  for (const [name, extra] of ZUSCHNITTE) {
    const rules = sanitizeRules({ ...DEFAULT_RULES, ...extra });
    const st = createMockStore();
    const rnd = await st.createRound({ name, adminId: "u-0", rules });
    const runde = await st.getRound(rnd.id);

    const spieleStore = await st.listRoundMatches(rnd.id);
    const alle = await st.listMatches();
    // Der Weg des Hauptmenüs: Katalog selbst filtern.
    const spieleMenue = rundenSpiele(alle, runde);

    for (const [i, m] of spieleStore.slice(0, 20).entries()) {
      for (const u of SPIELER.slice(0, 4)) {
        st.seedTip({
          roundId: rnd.id, matchId: m.id, userId: u,
          tip: { home: i % 3, away: (i + 1) % 3, goals: { home: [], away: [] } },
          snapshot: m.snapshot,
        });
      }
    }

    const tips = await st.listTips({ roundId: rnd.id });
    const board = await st.getLeaderboard(rnd.id);
    const ich = SPIELER[0];
    const ausUebersicht = countTippedByUser(tips, ich);
    const ausWertung = board.find((z) => z.userId === ich)?.tips ?? 0;

    // Die beiden Stände: beide Screens rechnen sie, aber mit den Spielen aus
    // ihrem jeweiligen Weg. Kommen verschiedene Spiele an, kommen verschiedene
    // Stände heraus — und der Spieler sieht sein Guthaben zweimal anders.
    const argsA = { rules, matches: spieleStore, tips, userId: ich };
    const argsB = { rules, matches: spieleMenue, tips, userId: ich };
    const muenzA = muenzStand(argsA)?.budget ?? null;
    const muenzB = muenzStand(argsB)?.budget ?? null;
    const narrA = narrenStand({ ...argsA, stand: null, zusatz: [] })?.kontostand ?? null;
    const narrB = narrenStand({ ...argsB, stand: null, zusatz: [] })?.kontostand ?? null;

    const gleichSpiele = spieleStore.length === spieleMenue.length;
    const gleichTipps = ausUebersicht === ausWertung;
    const gleichStand = muenzA === muenzB && narrA === narrB;
    const offen = computeMatchStatus(spieleStore).open;
    // 🔴 Sperrklinke, dieselbe wie in Teil 1 und 2: sind BEIDE Stände `null`
    // (Münzen aus, Narren aus), wäre „gleich" nur die Aussage, dass nichts
    // geprüft wurde. Das muss dranstehen, sonst meldet die Zeile Ruhe.
    const standGeprueft = muenzA != null || narrA != null;

    if (spieleStore.length === 0) {
      console.log(`  ${name.padEnd(16)} ⚠️  NICHTS VERGLICHEN — dieser Zuschnitt lässt keine Spiele übrig.`);
      befunde3.push(`${name} (nichts verglichen)`);
      continue;
    }

    console.log(`  ${name.padEnd(16)}`
      + ` Spiele ${gleichSpiele ? `${spieleStore.length} gleich` : `⚠️ ${spieleStore.length} vs ${spieleMenue.length}`}`
      + ` · offen ${String(offen).padStart(4)}`
      + ` · getippt ${gleichTipps ? `${ausUebersicht} gleich` : `⚠️ ${ausUebersicht} vs ${ausWertung}`}`
      + ` · Stand ${!standGeprueft ? "—" : gleichStand ? "gleich" : `⚠️ ${muenzA}/${muenzB} · ${narrA}/${narrB}`}`);
    if (!gleichSpiele || !gleichTipps || !gleichStand) befunde3.push(name);
  }

  console.log(`\n${"-".repeat(88)}`);
  if (befunde3.length) {
    console.log("  ⚠️ Die Rundenansicht zeigt etwas anderes, als gewertet wird:");
    for (const b of befunde3) console.log(`     - ${b}`);
    process.exitCode = 1;
  } else {
    console.log("  ✅ Übersicht und Wertung meinen dieselbe Runde.");
  }
  // Ein „—" in der Stand-Spalte heißt: in diesem Zuschnitt gibt es weder
  // Münzen noch Narren. Das ist kein Befund, aber es muss dastehen — sonst
  // liest sich eine ungeprüfte Zeile wie eine geprüfte.
  console.log("  ℹ️ „—“ bei Stand = dieser Zuschnitt führt weder Münzen noch Narren.");
  console.log();
}
