// ============================================================
//  ANZEIGE-DURCHGANG — zeigt derselbe Wert in JEDER Anzeige dieselbe Zahl?
//
//  Der Nutzer hat am 05.08.2026 die Reihenfolge festgelegt: Baukasten, dann
//  alle Anzeigen während der Runde, dann „jeder erzeugte Wert wird in den
//  verschiedenen Anzeige-Möglichkeiten wahrheitsgemäß korrekt ausgegeben".
//  Erst danach Gewichtung. Dieses Skript ist die Messung zu Punkt 3.
//
//  Aufruf:  npm run anzeige
//
//  ⚠️ Das ist KEIN Test, und zwar mit Absicht. Ein Test fragt „ist es kaputt",
//  diese Messung fragt „wie weit auseinander". Eine Aufschlüsselung, die auf
//  3 statt 5 Punkte kommt, ist grün in jedem Test mit Toleranz — und trotzdem
//  eine falsche Auskunft an den Spieler.
//
//  Verglichen werden fünf Anzeige-Wege für DENSELBEN Tipp:
//    A `scoreTip().total`     — die Wahrheit; das addiert das Leaderboard
//    B Aufschlüsselung        — die Posten-Kette, wie `Ertragsquellen.jsx` sie
//                               untereinander schreibt (Summen +, Faktoren ×)
//    C Nachbar-Tabelle        — `nearPayouts`, Zeile „exakt so ausgegangen"
//    D Tipp-Vorschau          — `projectTip`, wenn der Tipp eintrifft
//    E Leaderboard/Verlauf    — Summe über alle Tipps vs. Verlaufs-Endstand
//
//  TEIL 2 vergleicht die RUNDEN-Werte: dieselbe Zahl, wie sie der Runden-Hub
//  zeigt, wie sie die Tippabgabe zeigt und wie sie das Leaderboard verrechnet.
//  Das ist die Ebene, auf der die schwersten Funde lagen (Narren 340 gegen 420,
//  Rad-Belohnungen 270 gegen 30) — sie entstehen nicht im Scoring, sondern
//  darin, WELCHE Spiele und WELCHER Spieltag gemeint sind.
// ============================================================
import { alleMatches } from "../src/lib/ligen.js";
import { PRESETS } from "../src/lib/presets.js";
import {
  scoreTip, projectTip, scoreLeaderboard, scoreLeaderboardHistory,
  brauchtVerlauf, sanitizeRules, DEFAULT_RULES,
} from "../src/lib/engine.js";
import { breakdown } from "../src/lib/breakdown.js";
import { nearPayouts } from "../src/lib/nearResults.js";

// Eigener Zufall statt `seeded.js`: dort steht Spielstand (Joker-Spieltage,
// Ersatz-Tipps), der nicht zum Streuen von Messproben herhalten soll.
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 4242;
const SPIELE = 400;          // ausgewertete Begegnungen je Regelwerk
const TIPPS_JE_SPIEL = 4;    // verschiedene Tipper auf dasselbe Spiel

// Die Kette so nachrechnen, wie ein Spieler sie auf dem Bildschirm liest:
// von oben nach unten, Summen addieren, Faktoren multiplizieren, Info-Zeilen
// überspringen (die sind durchgestrichen dargestellt).
function ketteWieAngezeigt(posten) {
  let wert = 0;
  for (const p of posten) {
    if (p.art === "summe") wert += p.wert;
    else if (p.art === "faktor") wert *= p.wert;
  }
  return Math.round(wert * 10) / 10;
}

const auswertbar = alleMatches().filter((m) => m.result && m.snapshot);
const rng = makeRng(SEED);
const pick = (n) => Math.floor(rng() * n);

// Tipps streuen: exakt, knapp daneben, weit daneben, Zufall — damit alle
// Wertungs-Ebenen (exakt/abstand/tendenz/keiner) vorkommen.
function tippFuer(m, i) {
  const r = m.result;
  // `snapshot.players` ist je Seite ein OBJEKT (Name → Quoten), keine Liste.
  const namen = (seite) => Object.keys(m.snapshot.players?.[seite] ?? {});
  const torschuetzen = { home: namen("home").slice(0, 1), away: namen("away").slice(0, 1) };
  const varianten = [
    { home: r.home, away: r.away },
    { home: r.home + 1, away: r.away + 1 },
    { home: Math.max(0, r.away), away: Math.max(0, r.home) },
    { home: pick(5), away: pick(5) },
  ];
  return { ...varianten[i % varianten.length], goals: torschuetzen };
}

function messe(rules) {
  const abw = { B: [], C: [], D: [] };
  const beispiele = [];
  const eintraege = [];
  const rundungen = [];
  let zeilenGesamt = 0;

  for (let s = 0; s < SPIELE; s++) {
    const m = auswertbar[pick(auswertbar.length)];
    for (let i = 0; i < TIPPS_JE_SPIEL; i++) {
      const tip = tippFuer(m, i);
      const A = scoreTip(tip, m.result, m.snapshot, rules).total;

      // B — Aufschlüsselung
      const b = breakdown(tip, m.result, m.snapshot, rules);
      const kette = ketteWieAngezeigt(b.posten);
      // Die Frage lautet: kommt der Spieler, der die Spalte addiert, auf die
      // angezeigte Zahl? Also GERUNDET vergleichen — ein Rest von 0,4 ist auf
      // dem Bildschirm nicht sichtbar, ein Rest von 1,6 sehr wohl.
      const dB = Math.round(kette) - b.gesamt;
      abw.B.push(Math.abs(dB));
      const rundung = b.posten.find((x) => x.key === "rundung");
      if (rundung) rundungen.push({ wert: Math.abs(rundung.wert), gesamt: Math.abs(b.gesamt) });
      zeilenGesamt++;
      if (Math.abs(dB) > 0.5 && beispiele.length < 6) {
        beispiele.push({
          art: "Aufschlüsselung", tip: `${tip.home}:${tip.away}`,
          real: `${m.result.home}:${m.result.away}`, gesamt: b.gesamt, kette,
          posten: b.posten.filter((p) => p.art !== "info")
            .map((p) => `${p.label} ${p.art === "faktor" ? "×" : ""}${p.wert}`).join(" | "),
        });
      }
      if (A !== b.gesamt) abw.B.push(Infinity);   // darf nie vorkommen

      // C — Nachbar-Tabelle, Zeile „geht genau so aus"
      const zeile = nearPayouts(tip, m.snapshot, rules)
        .find((z) => z.home === m.result.home && z.away === m.result.away);
      if (zeile) {
        // Nachbar-Tabelle rechnet OHNE echte Torschützen (playerGoals: null),
        // also gegen denselben Tipp ohne Schützen vergleichen.
        const ohneSchuetzen = { home: tip.home, away: tip.away, goals: { home: [], away: [] } };
        const erwartet = scoreTip(ohneSchuetzen,
          { home: m.result.home, away: m.result.away, playerGoals: null },
          m.snapshot, rules).total;
        const nurErgebnis = nearPayouts(ohneSchuetzen, m.snapshot, rules)
          .find((z) => z.home === m.result.home && z.away === m.result.away);
        if (nurErgebnis) abw.C.push(Math.abs(nurErgebnis.points - erwartet));
      }

      // D — Vorschau beim Tippen: „wenn es genau so ausgeht"
      const dVorschau = projectTip(tip, m.snapshot, rules).points;
      const wennEsSoKommt = scoreTip(tip,
        { home: tip.home, away: tip.away, playerGoals: null }, m.snapshot, rules).total;
      abw.D.push(Math.abs(dVorschau - wennEsSoKommt));

      eintraege.push({
        userId: `u${i}`, name: `Tipper ${i}`, tip, snapshot: m.snapshot, result: m.result,
        matchday: m.matchday, wettbewerb: m.wettbewerb, kickoff: m.kickoff,
      });
    }
  }

  // E — Leaderboard gegen die Einzelwerte, und Verlauf gegen Leaderboard
  const board = scoreLeaderboard(eintraege, rules);
  const einzeln = new Map();
  for (const e of eintraege) {
    const v = scoreTip(e.tip, e.result, e.snapshot, rules).total;
    einzeln.set(e.userId, (einzeln.get(e.userId) ?? 0) + v);
  }
  const dBoard = board.map((b) => Math.abs(b.total - (einzeln.get(b.userId) ?? 0)));

  const verlauf = scoreLeaderboardHistory(eintraege, rules);
  const ende = verlauf.length ? verlauf[verlauf.length - 1].board : [];
  const endeVon = new Map(ende.map((z) => [z.userId, z.total]));
  const dVerlauf = board.map((b) => Math.abs((endeVon.get(b.userId) ?? 0) - b.total));

  return { abw, beispiele, dBoard, dVerlauf, rundungen, zeilenGesamt, verlaufNoetig: brauchtVerlauf(rules) };
}

const stat = (xs) => {
  if (!xs.length) return "—";
  const max = Math.max(...xs);
  // „daneben" = die angezeigte Kette rundet NICHT auf die angezeigte Zahl.
  const treffer = xs.filter((x) => x >= 1).length;
  return `max ${max === Infinity ? "∞" : max.toFixed(1)}  ·  ${treffer}/${xs.length} daneben`;
};

console.log(`\n${"=".repeat(94)}`);
console.log("  ANZEIGE-DURCHGANG — derselbe Wert in fünf Anzeigen");
console.log(`  ${SPIELE} Begegnungen x ${TIPPS_JE_SPIEL} Tipps je Regelwerk, Saat ${SEED}`);
console.log(`${"=".repeat(94)}`);

const alleBeispiele = [];
for (const p of [{ label: "Vorgabe (DEFAULT_RULES)", rules: DEFAULT_RULES },
                 ...PRESETS.map((x) => ({ label: x.label, rules: sanitizeRules(x.rules) }))]) {
  const m = messe(p.rules);
  console.log(`\n  ${p.label}`);
  console.log(`    B Aufschlüsselung vs. Gesamt   ${stat(m.abw.B)}`);
  console.log(`    C Nachbar-Tabelle vs. Wertung  ${stat(m.abw.C)}`);
  console.log(`    D Vorschau vs. Wertung         ${stat(m.abw.D)}`);
  console.log(`    E Leaderboard vs. Einzelwerte  ${stat(m.dBoard)}`);
  console.log(`    E Verlaufs-Endstand vs. Board  ${stat(m.dVerlauf)}`
    + (m.verlaufNoetig ? "   (verlaufsabhängig — Abweichung ist hier ERWARTET)" : ""));
  const anteil = m.zeilenGesamt ? (m.rundungen.length / m.zeilenGesamt) * 100 : 0;
  const groesse = m.rundungen.length
    ? Math.max(...m.rundungen.map((r) => r.wert))
    : 0;
  const relativ = m.rundungen.length
    ? Math.max(...m.rundungen.map((r) => (r.gesamt > 0 ? r.wert / r.gesamt : 0))) * 100
    : 0;
  console.log(`    → Zeile "Rundung"              ${anteil.toFixed(0).padStart(3)} % der Tipps`
    + `  ·  größter Rest ${groesse.toFixed(1)} (${relativ.toFixed(2)} % der Summe)`);
  for (const b of m.beispiele) alleBeispiele.push({ preset: p.label, ...b });
}

if (alleBeispiele.length) {
  console.log(`\n${"-".repeat(94)}`);
  console.log("  BEISPIELE, wo die angezeigte Kette nicht auf die angezeigte Summe kommt:");
  for (const b of alleBeispiele.slice(0, 8)) {
    console.log(`\n   ${b.preset} · Tipp ${b.tip} · real ${b.real}`);
    console.log(`     Kette:  ${b.posten}`);
    console.log(`     ergibt ${b.kette}, angezeigt wird ${b.gesamt}`);
  }
}
console.log();

// ============================================================
//  TEIL 2 — die Runden-Werte
// ============================================================
const { createMockStore } = await import("../src/lib/store.mock.js");
const { narrenStand } = await import("../src/lib/narrenstand.js");
const { kontoVerlauf } = await import("../src/lib/jokerBudget.js");
const { naechstesOffenesSpiel } = await import("../src/lib/muenzstand.js");
const { auswerten } = await import("../src/lib/drehrad.js");
const { zeitachse, rundenSpieltagVon, verlaufNachRundenSpieltag } = await import("../src/lib/zeitachse.js");
const { LIGEN } = await import("../src/lib/ligen.js");

console.log(`\n${"=".repeat(94)}`);
console.log("  TEIL 2 — Runden-Werte: Hub gegen Tippabgabe gegen Leaderboard");
console.log(`${"=".repeat(94)}`);

const store = createMockStore();
const blTeams = Object.keys(LIGEN.find((l) => l.key === "bl").ratings);
const rundenRegeln = sanitizeRules({
  ...DEFAULT_RULES,
  joker: { enabled: true, modus: "einzel", faktor: 1.5 },
  budget: { enabled: true, quellen: [{ typ: "gleich", betrag: 10 }], takt: "spieltag", verfall: "nie" },
  drehrad: {
    enabled: true, frequenz: 4, phase: "ganze",
    felder: [
      { id: "n", label: "30 Narren", gewicht: 1, belohnung: { typ: "budget", betrag: 30 } },
      { id: "p", label: "50 Punkte", gewicht: 1, belohnung: { typ: "punkte", betrag: 50 } },
    ],
  },
});
const runde = await store.createRound({
  name: "Messrunde", adminId: "u-du", rules: rundenRegeln, teamFilter: blTeams,
});
const rundenSpiele = await store.listRoundMatches(runde.id);
// Ein paar Spieltage tippen, damit überhaupt etwas entsteht.
for (const m of rundenSpiele.filter((x) => x.wettbewerb === "bl" && x.result).slice(0, 27)) {
  await store.saveTip({
    roundId: runde.id, matchId: m.id, userId: "u-du",
    tip: { home: 1, away: 1, goals: { home: [], away: [] } }, snapshot: m.snapshot,
  });
}

const achseR = zeitachse(rundenSpiele, rundenRegeln.zeitachse);
// ⚠️ SPÄT in der Saison messen. Am 1. Spieltag fallen Liga- und Runden-Spieltag
// zusammen und die Achse ist kurz — dort stimmt auch eine falsche Rechnung.
// Genau deshalb ist der Narren-Fund (340 gegen 420) erst am Saisonende
// aufgefallen.
const letztesSpiel = [...rundenSpiele].filter((m) => m.wettbewerb === "bl")
  .sort((a_, b_) => new Date(a_.kickoff) - new Date(b_.kickoff)).at(-3);
const jetzt = new Date(new Date(letztesSpiel.kickoff).getTime() - 36e5);
const offenesSpiel = naechstesOffenesSpiel(rundenSpiele, jetzt);
const jetztRunde = offenesSpiel ? rundenSpieltagVon(achseR, offenesSpiel) : null;
const rundenTipps = await store.listTips({ roundId: runde.id });
const verlauf = await store.getLeaderboardHistory(runde.id);
const rad = await store.getDrehradBelohnungen(runde.id);
const board = await store.getLeaderboard(runde.id);

// (1) Narren: Hub-Weg (`narrenStand`) gegen Tippabgabe-Weg (`kontoVerlauf`).
const hubNarren = narrenStand({
  rules: rundenRegeln, matches: rundenSpiele, tips: rundenTipps,
  userId: "u-du", stand: verlauf, zusatz: rad.narren, jetzt,
})?.kontostand ?? null;

const matchVon = new Map(rundenSpiele.map((m) => [m.id, m]));
const tippabgabeNarren = kontoVerlauf({
  rules: rundenRegeln,
  tipps: rundenTipps.map((t) => {
    const m = matchVon.get(t.match_id);
    return {
      userId: t.user_id, matchId: t.match_id,
      matchday: m ? rundenSpieltagVon(achseR, m) : null,
      gewicht: t.tip?.gewicht, joker: t.tip?.joker === true,
    };
  }),
  spieltage: achseR.length,
  stand: verlaufNachRundenSpieltag(verlauf, achseR),
  userIds: board.map((b) => b.userId),
  zusatz: rad.narren,
}).proSpieler["u-du"]?.find((v) => v.matchday === jetztRunde)?.kontostand ?? null;

// (2) Rad-Punkte: was `MeinRad` zeigt gegen das, was im Board steht.
const { ziehungen } = await store.getDrehradZiehungen(runde.id);
const { gutschriften } = auswerten(rundenRegeln.drehrad, ziehungen);
const radPunkteAnzeige = gutschriften
  .filter((g) => g.userId === "u-du" && g.belohnung?.typ === "punkte")
  .reduce((s_, g) => s_ + g.belohnung.betrag, 0);
const radPunkteBoard = board.find((b) => b.userId === "u-du")?.drehrad ?? 0;

const zeile = (name, a, b) => {
  const ok = a === b ? "  ✓" : "  ✗ AUSEINANDER";
  console.log(`    ${name.padEnd(38)} ${String(a).padStart(8)} | ${String(b).padStart(8)}${ok}`);
};
console.log(`\n  Runde über ${rundenSpiele.length} Spiele · Achse ${achseR.length} Runden-Spieltage `
  + `· jetzt Runden-Spieltag ${jetztRunde}`);
console.log("                                              Hub/Anzeige |  Wertung");
zeile("Narren-Kontostand", hubNarren, tippabgabeNarren);
zeile("Rad-Punkte", radPunkteAnzeige, radPunkteBoard);
console.log();
