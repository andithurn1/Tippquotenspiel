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
//  ⚠️ **Die absoluten Zahlen wackeln zwischen zwei Läufen.** `createRound`
//  leitet die Runden-Id aus einem ZUFÄLLIGEN Beitritts-Code ab, und alles, was
//  daraus geseedet wird (Drehrad, Joker-Verteilung im Kontingent-Modus, der
//  Zufalls-Ersatztipp), fällt jedes Mal anders aus — gemessen 600 gegen 900
//  Punkte für denselben Drehrad-Fall. Aussagekräftig ist deshalb nur „bewegt
//  etwas / bewegt nichts", nicht der Betrag im Vergleich zu gestern.
//  🔴 Und die Falle für den nächsten Messfall: Vergleichsstand und Messstand
//  sind ZWEI Runden mit zwei Ids. Wer einen Block prüft, der aus der Id
//  geseedet wird, misst dann teilweise das Los und nicht die Einstellung. In
//  der jetzigen Liste betrifft das nur das Drehrad, und dort ist es in einem
//  der beiden Stände ganz aus — der Unterschied ist also echt.
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
import { readFileSync } from "node:fs";
import { regelFelder } from "../src/lib/stufenAbdeckung.js";

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
  // Die Rampe formt den Außenseiter-Aufschlag. Ohne einen Aufschlag GRÖSSER 1
  // ist sie folgenlos — deshalb steht er im Vergleichsstand mit drin, sonst
  // misst die Zeile den Aufschlag statt die Rampe.
  ["underdogRampStart", { underdogBoost: 3, underdogRampStart: 6 },
    { gegen: { underdogBoost: 3 } }],
  ["underdogRampEnd", { underdogBoost: 3, underdogRampEnd: 3 },
    { gegen: { underdogBoost: 3 } }],
  // ⚠️ `modFloor` ist die UNTERE Leitplanke — sie greift nur, wenn überhaupt
  // etwas nach unten zieht. Team-Faktoren unter 1 stellen das her; mit der
  // Vorgabe (alles ≥ 1) wäre die Zeile stumm und sähe wie eine tote
  // Einstellung aus.
  ["modFloor", {
    teamMods: { derbyFaktor: 1, teams: Object.fromEntries(blTeams.map((t) => [t, 0.3])) },
    modFloor: 0.9,
  }, { gegen: { teamMods: { derbyFaktor: 1, teams: Object.fromEntries(blTeams.map((t) => [t, 0.3])) } } }],
  ["favFlopPenalty", { favFlopPenalty: 15 }],
  ["joker (Faktor)", { joker: { enabled: true, modus: "einzel", faktor: 3 } }, { joker: true }],
  ["teamMods (Derby)", { teamMods: { derbyFaktor: 1, teams: Object.fromEntries(blTeams.map((t) => [t, 2])) } }],
  // Der Big-Game-Wert entsteht erst beim ÖFFNEN des Spieltags (Admin-Handlung,
  // siehe `spieltagOeffnen`). Ohne das Öffnen ist die Regel folgenlos — das ist
  // so gewollt und muss im Messfall nachgestellt werden.
  // 🔴 Big Game wird in ZWEI Schritten wirksam, und dieser Fall misst nur den
  // zweiten: `spieltagOeffnen` friert einen Spannungswert ein (aus dem
  // Tabellenstand), und die Wertung macht daraus einen Aufschlag.
  //
  // ⚠️ Den ersten Schritt kann dieser Durchgang NICHT messen: die simulierte
  // Saison beginnt in der Zukunft, kein Spiel ist angepfiffen, die Tabelle ist
  // leer — und aus einer leeren Tabelle kommt kein Spannungswert. Bis zum
  // 22.08.2026 endete die Zeile deshalb bei „bewegt nichts (erklärt)", und
  // damit war die ganze Mechanik von keiner Abnahme gedeckt.
  //
  // Jetzt wird der Wert im Messfall GESETZT (`bigGameWert`), so wie ihn ein
  // geöffneter Spieltag ablegen würde. Damit ist wenigstens die Wertung
  // gedeckt: greift der Aufschlag, und greift `minSpannung` als Schwelle?
  // Was weiterhin fehlt, steht im `hinweis` — eine halb gedeckte Mechanik ist
  // besser als eine ungedeckte, aber sie darf sich nicht als ganz gedeckt
  // ausgeben.
  ["bigGame (Aufschlag)", { bigGame: { enabled: true, aufschlag: 1, minSpannung: 0 } },
    { oeffnen: true, bigGameWert: 0.8,
      hinweis: "misst die WERTUNG des eingefrorenen Werts; dass das Öffnen ihn "
        + "richtig BERECHNET, kann erst eine laufende Saison zeigen" }],
  // Die Gegenprobe zur Schwelle: derselbe Wert, aber `minSpannung` darüber —
  // dann darf es KEINEN Aufschlag geben. Ohne diese Zeile wäre eine Schwelle,
  // die gar nicht prüft, von der Messung nicht zu unterscheiden.
  ["bigGame (Schwelle)", { bigGame: { enabled: true, aufschlag: 1, minSpannung: 0.95 } },
    { oeffnen: true, bigGameWert: 0.8, erwartetNull: true,
      gegen: { bigGame: { enabled: true, aufschlag: 1, minSpannung: 0 } },
      hinweis: "SOLL nichts bewegen: der eingefrorene Wert liegt unter der Schwelle" }],
  // Der Kombi-Bonus (B16): greift nur, wenn ein Schuetze getippt UND die
  // Ergebnis-Ebene erreicht ist — deshalb mit mehreren Schuetzen messen.
  ["kombi (seltener Schuetze)", { kombi: { enabled: true, stufe: "tendenz", staerke: 1, maxAufschlag: 3, mindestSchuetzen: 1 } },
    { mehrSchuetzen: true }],
  ["modCap", {
    joker: { enabled: true, modus: "einzel", faktor: 3 }, modCap: 1.1,
  }, { joker: true, gegen: { joker: { enabled: true, modus: "einzel", faktor: 3 } } }],
  ["aufholen", { aufholen: { enabled: true, staerke: "stark", schwelle: 0.05 } }],
  // ⚠️ Braucht GENUG Tipper auf demselben Spiel, sonst greift `minTipper` und
  // die Messung meldete „bewegt nichts" für eine Regel, die in Ordnung ist —
  // dieselbe Falle wie bei `tippEinfluss` ein paar Zeilen weiter unten.
  ["alleinstellung", {
    alleinstellung: {
      enabled: true, ebene: "tendenz", modus: "anteil", maxAnteil: 0.5,
      art: "anteil", anteil: 1, maxZuschlag: 5000, minTipper: 3,
    },
  }, { spieler: Array.from({ length: 10 }, (_, i) => `u-${i}`) }],
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
  // 🔴 Der letzte Block ohne Messfall (Befund vom 23.08.2026). Er braucht
  // `fallback: "quote"`: der Tabellenplatz wird beim ÖFFNEN des Spieltags auf
  // dem Snapshot eingefroren, und im Messfall gibt es keine Tabelle. Genau
  // dafür ist der Fallback gebaut — „ohne diese Wahl wäre er an den ersten
  // Spieltagen still wirkungslos, und niemand merkt es" (tabellenBonus.js).
  // `abSpieltag: 1`, damit alle gemessenen Spieltage zählen.
  ["tabellenBonus", {
    tabellenBonus: {
      enabled: true, aufschlag: 1.0, nurWennRichtig: false, abSpieltag: 1,
      fallback: "quote", fallbackQuote: 1.5,
    },
  }],
  ["duell", {
    duell: { enabled: true, typen: ["klau"], maxProSaison: 0, klau: { anteil: 0.5, modus: "nullsumme" } },
  }, { duell: true }],
  // 🔴 Die FREMDJOKER-Familie (JK4–JK7). Gemessen wird der TRITTBRETTFAHRER,
  // weil er der einzige der drei neuen Fälle ist, der ohne Anreicherung
  // rechnet: die Gegenwette braucht `p` und `getroffen` aus `fremdEinsaetze`,
  // und der Rest der Familie ist über `duell` oben schon abgedeckt.
  // ⚠️ `maxProSaison: 0` (kein Deckel), damit die Zahl die WIRKUNG zeigt und
  // nicht den Deckel — sonst stünde hier bei jedem Anteil dieselbe Summe.
  ["eingriffe", {
    eingriffe: {
      enabled: true,
      trittbrett: { enabled: true, anteil: 0.5, kopierterBekommt: 0 },
    },
    duell: { enabled: false, maxProSaison: 0 },
  }, { fremd: "trittbrett" }],
  ["drehrad", {
    drehrad: {
      enabled: true, frequenz: 2, phase: "ganze", maxPunkteProSaison: 0,
      felder: [{ id: "p", label: "Punkte", gewicht: 1, belohnung: { typ: "punkte", betrag: 500 } }],
    },
  }],
  ["saison (Wetten)", {
    saison: { enabled: true, gewicht: 1, wetten: [{ key: "meister", punkte: 500 }] },
  }, { saisonTipp: true }],
  // 🔴 Die WAS-Achse (07.08.2026). Bis dahin war die Wirkung eines Ereignisses
  // IMMER „n Joker" — und Joker bewegen das Leaderboard nicht, deshalb stand
  // der ganze Block `ereignisse` in TEIL 2 statt hier. Eine Punkte-Wirkung
  // bewegt es sehr wohl, und genau das misst diese Zeile: kommt die neue
  // Achse in der Wertung an?
  ["ereignisse (Wirkung: Punkte)", {
    ereignisse: { enabled: true, maxErspielt: 5, aktive: [
      { key: "letzter-am-spieltag", belohnung: 1, abstand: 0, maxProSaison: 0,
        auswahl: { modus: "rang", ende: "unten", n: 1, prozent: 20 },
        wirkung: { typ: "punkte", betrag: 200, maxProSaison: 2000 } },
    ] },
  }],
  // 🔴 Die WIE-LANGE-Achse (07.08.2026), Ende zu Ende. Der Vergleichsstand ist
  // dasselbe Ereignis mit `geltung: sofort` — dadurch misst die Zeile die
  // GELTUNG und nicht das Ereignis. Ein Aufschlag über vier Spieltage statt
  // über einen ist der einzige Fall, in dem die Achse Punkte bewegt: eine
  // feste Gutschrift zahlt auch über ein Fenster nur einmal (der Topf-Vertrag
  // aus `wirkung.js`), und Joker bewegen das Leaderboard bauartbedingt nicht.
  ["ereignisse (Geltung: Fenster)", {
    ereignisse: { enabled: true, maxErspielt: 5, aktive: [
      { key: "letzter-am-spieltag", belohnung: 1, abstand: 0, maxProSaison: 0,
        auswahl: { modus: "rang", ende: "unten", n: 1, prozent: 20 },
        wirkung: { typ: "bonus", prozent: 50 }, geltung: { typ: "fenster", n: 4 } },
    ] },
  }, { gegen: { ereignisse: { enabled: true, maxErspielt: 5, aktive: [
    { key: "letzter-am-spieltag", belohnung: 1, abstand: 0, maxProSaison: 0,
      auswahl: { modus: "rang", ende: "unten", n: 1, prozent: 20 },
      wirkung: { typ: "bonus", prozent: 50 }, geltung: { typ: "sofort" } },
  ] } } }],
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
      // Dieselbe Ablage, andere Art — ein Fremdjoker steht immer in
      // `tip.duell` (der Feldname ist älter als die Familie).
      if (opt.fremd && u === "u-du") tip.duell = { auf: "u-lena", typ: opt.fremd };
      // Ein eingefrorener Big-Game-Wert, wie ihn `spieltagOeffnen` ablegt.
      // Nur für den Messfall — im Betrieb kommt er aus dem Tabellenstand.
      const snapshot = opt.bigGameWert != null
        ? { ...m.snapshot, bigGameWert: opt.bigGameWert }
        : m.snapshot;
      await st.seedTip({ roundId: rnd.id, matchId: m.id, userId: u, tip, snapshot });
    }
  }
  if (opt.saisonTipp) {
    st.seedSeasonTip({ roundId: rnd.id, userId: "u-du", wettenId: "meister", wert: blTeams[0] });
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
  // 🔴 Ein Fall darf auch NICHTS bewegen SOLLEN: eine Schwelle, die greift,
  // sieht in Punkten aus wie eine Regel, die nicht greift. Ohne diesen Zweig
  // müsste man die Gegenprobe entweder weglassen (dann prüft niemand, ob die
  // Schwelle überhaupt etwas tut) oder sie dauerhaft als „erklärt" mitführen
  // (dann steht ein Warnzeichen an einem gesunden Ergebnis, und ein echtes
  // Warnzeichen fällt daneben nicht mehr auf).
  if (opt.erwartetNull) {
    const ok = d === 0;
    console.log(`  ${name.padEnd(26)} ${ok ? "✅ bewegt erwartungsgemäß nichts" : `⚠️  BEWEGT ${Math.round(d)} PUNKTE — sollte nichts bewegen`}`);
    if (!ok) tot.push(`${name} (sollte nichts bewegen)`);
    continue;
  }
  console.log(`  ${name.padEnd(26)} ${d === 0 ? "⚠️  BEWEGT NICHTS" : `bewegt ${Math.round(d)} Punkte`}`);
  if (d === 0) {
    // 🔴 Ein Fall, der nichts bewegt, MUSS erklärt sein. Ohne Erklärung ist er
    // ein Verdacht; mit Erklärung ist er eine bekannte Grenze des Szenarios.
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
      await st.seedTip({
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
  // 🔴 Die Dreier-Wertung (07.08.2026). Gemessen wird gegen die Zeile darüber:
  // über einen Block von drei Spieltagen fallen weniger Auszeichnungen an als
  // je Spieltag — und zwar nicht nur ein Drittel, weil die Auswahl über die
  // SUMME entscheidet und damit andere Leute trifft.
  ["… über 3 Spieltage", { key: "letzter-am-spieltag", belohnung: 1, zeitraum: 3 }],
  // 🔴 Die Kennzahl (07.08.2026) — die letzte Stellschraube der Jokerjagd.
  // ⚠️ „ZAHLT NICHTS" wäre hier ein echter Befund und keine Erklärung: wenn
  // nach exakten Treffern gewertet wird und niemand trifft, gewinnt bei
  // Gleichstand niemand. Das ist gewollt, aber es muss SICHTBAR sein — sonst
  // sieht eine sinnvolle Einstellung wie eine tote aus.
  ["… nach exakten Treffern", { key: "letzter-am-spieltag", belohnung: 1, zeitraum: 3,
    metrik: "exakteTreffer", auswahl: { modus: "rang", ende: "oben", n: 1, prozent: 20 } }],
  // ⚠️ Zwei Anläufe, bis diese Zeile wirklich etwas gemessen hat — beide Male
  // war der MESSFALL falsch, nie die Regel:
  //  1. Ohne Lücke tippen alle drei jedes Spiel. Der Fleiß ist überall gleich,
  //     der Gleichstand an der Kante zeichnet niemanden aus.
  //  2. Mit Lücke bei EINEM Spieler und `ende: "oben"` teilen sich die beiden
  //     anderen die Spitze — wieder Gleichstand, wieder nichts.
  // Eindeutig ist nur die UNTERE Kante: genau ein Spieler hat weniger getippt.
  // Das ist zugleich die sinnvollere Regel („wer wenig mitgemacht hat, bekommt
  // einen Schubs") und nicht bloß ein Messtrick.
  ["… nach Tipp-Fleiß", { key: "letzter-am-spieltag", belohnung: 1, zeitraum: 3,
    metrik: "getippteSpiele", auswahl: { modus: "rang", ende: "unten", n: 1, prozent: 20 } },
    { luecke: "u-lena", hinweis: "ein Spieler lässt Spieltage aus" }],
  // Die beiden Einträge der Ereignis-Bibliothek vom 07.08.2026. Beide hängen
  // an ERGEBNISSEN und nicht nur an Tipps — der Messfall oben tippt über 54
  // gelaufene Spiele, also liegen welche vor.
  ["treffer-serie (2 in Folge)", { key: "treffer-serie", anzahl: 2, belohnung: 1 }],
  ["pechstraehne (2 in Folge)", { key: "pechstraehne", anzahl: 2, belohnung: 1 }],
];

console.log(`${"=".repeat(88)}`);
console.log("  TEIL 2 — Ereignisse: Gutschriften statt Punkte");
console.log(`${"=".repeat(88)}\n`);

const stumm = [];
const nullstand = await gutschriften(AUS);
console.log(`  ${"(ausgeschaltet)".padEnd(26)} ${nullstand.summe} Gutschriften`);
// 🔴 Manche Ereignisse brauchen ein anderes SZENARIO, nicht eine andere
// Einstellung. „Wer am fleißigsten getippt hat" kann im Grundfall niemanden
// auszeichnen, weil dort alle drei Spieler jedes Spiel tippen — alle gleich,
// Gleichstand an der Kante, also niemand. Das ist kein Befund am Ereignis,
// sondern einer am Messfall: gemeldet würde „ZAHLT NICHTS" für eine
// Einstellung, die einwandfrei greift.
// Deshalb darf jeder Fall sein Szenario mitbringen (dieselbe Bauart wie `opt`
// in TEIL 1).
for (const [name, eintrag, opt = {}] of EREIGNIS_FAELLE) {
  const an = { enabled: true, maxErspielt: 60, aktive: [eintrag] };
  // Auch hier: kommt die Einstellung überhaupt durch `sanitizeRules`?
  if (!sanitizeRules({ ...DEFAULT_RULES, ereignisse: an }).ereignisse.aktive.length) {
    console.log(`  ${name.padEnd(26)} ⚠️  EINSTELLUNG VERWORFEN — Feldname prüfen`);
    stumm.push(`${name} (verworfen)`);
    continue;
  }
  const r = await gutschriften(an, opt);
  console.log(`  ${name.padEnd(26)} ${r.summe === 0 ? "⚠️  ZAHLT NICHTS" : `${r.summe} Gutschriften`}`
    + `${opt.hinweis ? `  (${opt.hinweis})` : ""}`);
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

// ════════════════════════════════════════════════════════════
//  TEIL 3 — deckt die MESSUNG überhaupt jeden Regel-Block ab?
//
//  🔴 Die Frage an die Messung selbst, und sie ist genauso wichtig wie ihr
//  Ergebnis: ein Block ohne Messfall steht nirgends als „bewegt nichts" — er
//  steht GAR NICHT da. Eine Liste, die schweigt, sieht aus wie eine Liste
//  ohne Befund.
//
//  Gemessen am 06.08.2026: 14 von 37 Blöcken hatten keinen Messfall. Drei
//  davon waren einfach vergessen und bewegen kräftig etwas
//  (`underdogRampStart` 1922 · `underdogRampEnd` 2716 · `modFloor` 8497
//  Punkte). Für den Rest gilt dieselbe Regel wie bei `stufen` und `tot`:
//  entweder ein Messfall, oder ein Satz, warum hier keiner hingehört.
// ════════════════════════════════════════════════════════════
const OHNE_MESSFALL = {
  tippfenster:
    "Wird in TEIL 4 gemessen — entscheidet, WELCHE Spiele tippbar sind, nicht "
    + "was ein Tipp zählt.",
  spiele:
    "Ändert die Menge der Spiele der Runde. Ein Leaderboard-Unterschied wäre "
    + "tautologisch (weniger Spiele = weniger Punkte) und sagt nichts darüber, "
    + "ob die Auswahl RICHTIG filtert — das prüft `spielauswahl.test.js`.",
  zeitachse:
    "Reine Struktur und Anzeige, ausdrücklich KEINE Wertung (siehe CLAUDE.md). "
    + "Ihre einzige Wertungs-Berührung ist `rundenSchluessel`, und die wird in "
    + "Teil 2 gemessen (eine Liga 43 gegen zwei Ligen 43 Gutschriften).",
  budget:
    "Wird in TEIL 4 gemessen — begrenzt, wie viele Joker man EINSETZEN darf, "
    + "nicht was einer zählt.",
  limitKlassen: "Wird in TEIL 4 gemessen — eine Einsatz-Grenze, kein Punkte-Kanal.",
  jokerBasis: "Wird in TEIL 4 gemessen — Erlaubnis eines Jokers, nicht sein Wert.",
  verfassung:
    "Regiert, WAS eine Runde beschließen darf. Ohne einen Antrag im Messfall "
    + "gibt es nichts zu regieren; geprüft in `regelAbstimmung.test.js`.",
  regelAbstimmung: "Wie `verfassung` — Mitbestimmung, keine Wertung.",
  oddsMode: "Woher die Quoten kommen. Im Mock gibt es nur eine Quelle.",
  reglerFeinheit: "Eine Einstellung der Profi-Ansicht selbst, kein Spielwert.",
  sperre:
    "Nimmt Optionen aus der AUSWAHL und verrechnet nichts — ein Leaderboard-"
    + "Vergleich bewegt sich hier zwangsläufig um null. Gemessen wird sie "
    + "stattdessen dort, wo sie wirkt: `favoritenSperre.test.js` (trifft sie "
    + "den Favoriten oder den Außenseiter?), `sperrEingriff.test.js` (kommt "
    + "der Eingriff in der Auswahl an?) und `autoTip.test.js` (hält sich der "
    + "Ersatz-Tipp daran?).",
};

const faelleQuelle = (() => {
  const q = readFileSync("scripts/greift-durchgang.mjs", "utf8");
  const von = q.indexOf("const FAELLE = [");
  return q.slice(von, q.indexOf("\n];", von));
})();
const ohneFall = regelFelder().filter((f) => !new RegExp(`\\b${f}\\b`).test(faelleQuelle));
const unbegruendet = ohneFall.filter((f) => !OHNE_MESSFALL[f]);

console.log(`${"=".repeat(88)}`);
console.log("  TEIL 3 — deckt die Messung jeden Regel-Block ab?");
console.log(`  ${regelFelder().length} Blöcke · ${regelFelder().length - ohneFall.length} mit Messfall`
  + ` · ${Object.keys(OHNE_MESSFALL).length} ausdrücklich begründet`);
console.log(`${"=".repeat(88)}\n`);

if (unbegruendet.length) {
  console.log(`  ⚠️ ${unbegruendet.length} Blöcke werden NICHT gemessen und haben keine Begründung:`);
  for (const f of unbegruendet) console.log(`     ${f}`);
  console.log();
  console.log("  🔴 Ein Block ohne Messfall steht nirgends als „bewegt nichts\" — er steht");
  console.log("     GAR NICHT da. Eine Liste, die schweigt, sieht aus wie eine ohne Befund.");
} else {
  console.log("  ✅ Jeder Regel-Block hat einen Messfall oder eine Begründung.");
}
console.log();

// ════════════════════════════════════════════════════════════
//  TEIL 4 — Einstellungen, die keine PUNKTE bewegen, sondern eine ERLAUBNIS
//
//  🔴 Die zweite Lücke, die Teil 1 bauartbedingt nicht sehen kann — und die
//  bis 06.08.2026 in Teil 3 als vier Begründungen stand statt als Messung:
//  `budget`, `limitKlassen`, `jokerBasis`, `tippfenster` und die
//  Duell-Schutzregeln bewegen das Leaderboard NIE. Sie entscheiden, ob ein
//  Einsatz überhaupt zustande kommt. Wer nur Punkte misst, sieht bei ihnen
//  immer dieselbe Zahl — und eine tote Einstellung sieht dann exakt aus wie
//  eine, die sauber greift.
//
//  Genau dort saßen `duell.konter` und `duell.kosten`: beide standen im
//  Regelwerk, wurden gesäubert, reisten im Creator-Code mit, waren in Teil 1
//  vom Block `duell` (3401 Punkte) mit abgedeckt — und keine Zeile im Projekt
//  fragte sie ab. Punkte zu messen konnte das nicht finden.
//
//  ── Was hier gezählt wird ──
//  Nicht Punkte, sondern ERLAUBTE VORGÄNGE: wie viele Ziele darf ein Spieler
//  treffen, an wie vielen Spieltagen ist ein Einsatz bezahlbar, wie viele
//  Spiele sind tippbar. Vorgabe gegen Extremwert, wie oben. Ändert sich die
//  Zahl nicht, ist das Tor nicht angeschlossen.
//
//  ⚠️ Eine Zahl, die STEIGT, ist genauso gut wie eine, die sinkt — `konter`
//  öffnet, `immun` schließt. Gemessen wird der Unterschied, nicht die
//  Richtung.
// ════════════════════════════════════════════════════════════
import { zulaessigeZiele, DEFAULT_DUELL } from "../src/lib/duellJoker.js";
import { zulaessigeZiele as zulaessigeZieleFamilie, fremdEinsaetze } from "../src/lib/fremdjoker.js";
import { DEFAULT_EINGRIFFE } from "../src/lib/eingriffe.js";
import { darfDuellSetzen } from "../src/lib/jokerKontingent.js";
import { jokerPlan } from "../src/lib/jokerPlan.js";
import { pruefeEinsatz, sanitizeLimitKlassen } from "../src/lib/limitKlassen.js";
import { darfEinsetzen, DEFAULT_BASIS } from "../src/lib/jokerBasis.js";
import { preisFuer, kannBezahlen, DEFAULT_BUDGET } from "../src/lib/jokerBudget.js";
import { tippStatus } from "../src/lib/tippfenster.js";
import { feuert } from "../src/lib/ausloeser.js";
import { giltAn, geltungsfenster, jackpotFaktor } from "../src/lib/geltung.js";

// Ein fester Stand, gegen den alle Tore gemessen werden: fünf Spieler mit
// klarem Abstand, damit „nur nach vorne" und „nicht den Letzten" überhaupt
// unterscheidbar sind.
const GBOARD = [1, 2, 3, 4, 5].map((i) => ({
  userId: `p${i}`, name: `P${i}`, total: 600 - i * 100,
}));
const GIDS = GBOARD.map((b) => b.userId);

// Eine feste Vorgeschichte: p1 (Erster) wurde am Spieltag 8 von p5 (Letzter)
// getroffen, und p2 hat p3 schon zweimal erwischt.
const GHISTORIE = [
  { spieltag: 8, vonUserId: "p5", aufUserId: "p1", typ: "klau" },
  { spieltag: 4, vonUserId: "p2", aufUserId: "p3", typ: "klau" },
  { spieltag: 7, vonUserId: "p2", aufUserId: "p3", typ: "klau" },
];

// Summe der erlaubten Ziele über ALLE Spieler — eine Zahl, die jede
// Zielwahl-Einstellung anders färbt.
const zieleGesamt = (duell, spieltag = 8) => GIDS.reduce((s, id) =>
  s + zulaessigeZiele(GBOARD, id, duell, {
    bisherigeEinsaetze: GHISTORIE, aktuellerSpieltag: spieltag,
  }).length, 0);

const D = (teil) => ({ ...DEFAULT_DUELL, enabled: true, immun: 0, maxProZiel: 6, ...teil });

// 🔴 Die Familien-Fassung (`fremdjoker.js`): sie löst Sperrfrist UND Los aus
// dem Regelwerk auf. Die rohe aus `duellJoker.js` darüber kann das nicht — wer
// nur sie misst, sieht bei JK5 und JK12 immer dieselbe Zahl und hält eine tote
// Einstellung für eine, die greift.
const zieleFamilie = (rules, spieltag = 8, art = "klau") => GIDS.reduce((s, id) =>
  s + zulaessigeZieleFamilie(GBOARD, id, rules, {
    bisherigeEinsaetze: GHISTORIE, aktuellerSpieltag: spieltag, seed: "greift", art,
  }).length, 0);
// Drei Angriffe von „a" auf drei Spiele von „b" — davon schützt „b" die
// ersten `schutzProSpieltag`. Übrig bleibt, was die Wertung noch sieht.
const wirksameEinsaetze = (schutzProSpieltag) => {
  const tipps = ["s1", "s2", "s3"].flatMap((m, i) => [
    { userId: "a", matchday: 5, matchId: m, kickoff: `2026-09-05T1${i}:00:00Z`,
      tip: { home: 1, away: 1, duell: { auf: "b", typ: "klau" } } },
    { userId: "b", matchday: 5, matchId: m, kickoff: `2026-09-05T1${i}:00:00Z`,
      tip: { home: 1, away: 1, schutz: true } },
  ]);
  return fremdEinsaetze(tipps, {
    duell: D({ proSpieltag: 3, maxProZiel: 9 }),
    eingriffe: { ...DEFAULT_EINGRIFFE, schutz: { proSpieltag: schutzProSpieltag, sichtbar: true, verfall: "zurueck" } },
  }).length;
};

const F = (duellTeil, eingriffeTeil = {}) => ({
  duell: D(duellTeil),
  eingriffe: { ...DEFAULT_EINGRIFFE, ...eingriffeTeil },
});

// An wie vielen der ersten 20 Spieltage ist ein Duell-Einsatz bezahlbar?
const GPLAN = jokerPlan({
  spieltage: 20, verteilung: { modus: "kontingent", anzahl: 5 }, seed: "greift", userIds: ["p1"],
});
const bezahlbareTage = (duell, gutschriften = []) =>
  [...Array(20).keys()].map((i) => i + 1).filter((md) =>
    darfDuellSetzen({ plan: GPLAN, gutschriften, tipps: [], userId: "p1", spieltag: md, duell }).erlaubt,
  ).length;

// Wie viele der fünf Spieler dürfen laut Grundform überhaupt einsetzen?
const duerfenEinsetzen = (basis) => GIDS.filter((id) =>
  darfEinsetzen({ ...DEFAULT_BASIS, ...basis }, id, { hatGetippt: true, board: GBOARD }).erlaubt).length;

// Wie viele Einsätze lässt eine Limit-Klasse durch? Gezählt über fünf Spieler
// an fünf Spieltagen, mit einer Historie von je einem bereits gesetzten Joker.
//
// ⚠️ `jokerArt` ist "joker.einzel", nicht "joker" — die JOKER_ARTEN-Form aus
// `jokerBudget.js`. Mit dem kurzen Namen greift `klasse.mitglieder.includes`
// nie, und die Zeile meldete beim ersten Lauf „bewegt nichts" für ein Tor,
// das einwandfrei schließt. Dieselbe Falle wie `kommtDurch` in Teil 1.
const KART = "joker.einzel";
const KHISTORIE = GIDS.map((id) => ({ spieltag: 2, jokerArt: KART, vonUserId: id, aufUserId: null }));
const durchKlassen = (klassen) => {
  let n = 0;
  for (const id of GIDS) {
    for (const md of [3, 4, 5, 6, 7]) {
      const p = pruefeEinsatz(
        { spieltag: md, jokerArt: KART, vonUserId: id, aufUserId: null },
        klassen, KHISTORIE, { spieltage: 34, board: GBOARD },
      );
      if (p.erlaubt) n++;
    }
  }
  return n;
};
// 🔴 Dieselbe Sperrklinke wie `kommtDurch` in Teil 1: eine Klasse, die
// `sanitizeLimitKlassen` gar nicht erst passiert (falscher Feldname, fehlende
// `mitglieder`), sieht danach exakt aus wie ein totes Tor. Beim ersten Lauf
// war genau das der Fall — `jokerArten`/`pro` statt `mitglieder`/`proZeitraum`.
const KLASSE_ENG = [{
  id: "k1", label: "Einer pro Saison", mitglieder: [KART],
  max: 1, proZeitraum: "saison", aktivierung: { typ: "immer" },
}];
if (sanitizeLimitKlassen(KLASSE_ENG).length !== KLASSE_ENG.length) {
  console.log("  ⚠️  limitKlassen: der Messfall passiert `sanitizeLimitKlassen` nicht — er misst nichts.");
}

// Wie viele der fünf Joker-Arten sind bei einem Kontostand von 20 Narren
// bezahlbar?
const GARTEN = ["joker", "duell.klau", "duell.block", "drehrad", "ereignis"];
const bezahlbareArten = (budget, stand = 20) =>
  GARTEN.filter((art) => kannBezahlen(stand, preisFuer(art, budget))).length;

// Wie viele der 20 Spieltage lässt ein Auslöser durch? Der Tabellenstand
// zieht sich über die Saison auseinander (250 → 3000 Punkte Spanne), damit
// `enge`/`abstand` überhaupt etwas zu unterscheiden haben — sonst stünde die
// Zeile grün da, ohne etwas geprüft zu haben.
const offeneSpieltage = (ausloeser) =>
  [...Array(20).keys()].map((i) => i + 1).filter((position) => feuert({
    ausloeser, position, spieltageGesamt: 20, rundenId: "greift",
    stand: [
      { userId: "p1", total: 100 * position },
      { userId: "p2", total: 100 * position - 10 * position * position },
    ],
    spiele: [{ result: { home: position % 4, away: 0 },
      snapshot: { winner: { home: 1.3, draw: 3.4, away: 8 } } }],
    eintraege: [{ tip: { home: 1, away: 0 }, result: { home: position % 3, away: 0 } }],
  })).length;

// An wie vielen der 20 Spieltage gilt etwas, das an Spieltag 8 entstanden ist?
const ERWORBEN_AN = 8;
const gueltigeSpieltage = (geltung) =>
  [...Array(20).keys()].map((i) => i + 1).filter((position) =>
    giltAn({ geltung, erworbenAn: ERWORBEN_AN, position, spieltageGesamt: 20 })).length;

const ersterGueltiger = (geltung) =>
  geltungsfenster({ geltung, position: ERWORBEN_AN, spieltageGesamt: 20 })?.von ?? 0;

// Was zahlt eine Ausschüttung, wenn sie n Spieltage liegen geblieben ist?
// In Prozent, damit die Zeile eine ganze Zahl zeigt.
const ausschuettung = (geltung, luecke = 4) => Math.round(jackpotFaktor(geltung, luecke) * 100);

const GATE_FAELLE = [
  ["duell.zielWahl", () => zieleGesamt(D({ zielWahl: "frei" })), () => zieleGesamt(D({ zielWahl: "nurVorne" })),
    "erlaubte Ziele über 5 Spieler"],
  ["duell.maxProZiel", () => zieleGesamt(D({ zielWahl: "frei", maxProZiel: 6 })),
    () => zieleGesamt(D({ zielWahl: "frei", maxProZiel: 2 })), "erlaubte Ziele über 5 Spieler"],
  ["duell.immun", () => zieleGesamt(D({ zielWahl: "frei", immun: 0 })),
    () => zieleGesamt(D({ zielWahl: "frei", immun: 6 })), "erlaubte Ziele über 5 Spieler"],
  // 🔴 Der Fall, für den `konter` gebaut ist: p1 steht ganz vorne und hat bei
  // „nur nach vorne" NIE ein Ziel — außer dem, der ihn gerade getroffen hat.
  ["duell.konter", () => zieleGesamt(D({ zielWahl: "nurVorne", konter: false })),
    () => zieleGesamt(D({ zielWahl: "nurVorne", konter: true })), "erlaubte Ziele über 5 Spieler"],
  // 🔴 JK5 (23.08.2026): die Sperrfrist je Ziel — und ihre Vertiefung, der
  // wachsende Cooldown. Beides bewegt keine PUNKTE, sondern erlaubte Ziele.
  ["eingriffe.sperrfrist", () => zieleFamilie(F({ zielWahl: "frei" })),
    () => zieleFamilie(F({ zielWahl: "frei" }, { sperrfrist: { standard: { spieltage: 6 } } })),
    "erlaubte Ziele über 5 Spieler"],
  ["eingriffe.sperrfrist.aufschlag",
    () => zieleFamilie(F({ zielWahl: "frei" }, { sperrfrist: { standard: { spieltage: 0, aufschlag: 0 } } })),
    () => zieleFamilie(F({ zielWahl: "frei" }, { sperrfrist: { standard: { spieltage: 0, aufschlag: 6 } } })),
    "erlaubte Ziele über 5 Spieler"],
  // 🔴 JK14: ein geschütztes Spiel ist für Fremdjoker unantastbar. Gemessen
  // werden die Einsätze, die die Wertung überhaupt erreichen.
  ["eingriffe.schutz", () => wirksameEinsaetze(0), () => wirksameEinsaetze(1),
    "wirksame Einsätze von 3"],
  // 🔴 JK12: das Los ERSETZT die Wahl — aus vier möglichen Zielen wird eines.
  ["duell.zielWahl: ausgelost", () => zieleFamilie(F({ zielWahl: "frei" })),
    () => zieleFamilie(F({ zielWahl: "ausgelost" })), "erlaubte Ziele über 5 Spieler"],
  ["duell.kosten", () => bezahlbareTage(D({ kosten: "frei" })),
    () => bezahlbareTage(D({ kosten: "stattJoker" })), "bezahlbare Spieltage von 20"],
  ["jokerBasis.wer", () => duerfenEinsetzen({ wer: "alle" }),
    () => duerfenEinsetzen({ wer: "abPlatz", werWert: 4 }), "berechtigte Spieler von 5"],
  ["limitKlassen", () => durchKlassen([]), () => durchKlassen(KLASSE_ENG),
    "durchgelassene Einsätze von 25"],
  ["budget (Preise)", () => bezahlbareArten({ ...DEFAULT_BUDGET, enabled: true, preise: {} }),
    () => bezahlbareArten({ ...DEFAULT_BUDGET, enabled: true, preise: Object.fromEntries(GARTEN.map((a) => [a, 50])) }),
    "bezahlbare Joker-Arten von 5"],
  // 🔴 Die WANN-Achse (07.08.2026) ist ein GATTER und bewegt bauartbedingt
  // keine Punkte — sie gehört genau hierher und nicht in Teil 1.
  ["ausloeser.rhythmus", () => offeneSpieltage({ typ: "immer" }),
    () => offeneSpieltage({ typ: "rhythmus", n: 4 }), "offene Spieltage von 20"],
  ["ausloeser.zufall", () => offeneSpieltage({ typ: "immer" }),
    () => offeneSpieltage({ typ: "zufall", frequenz: 5 }), "offene Spieltage von 20"],
  ["ausloeser.saisonende", () => offeneSpieltage({ typ: "immer" }),
    () => offeneSpieltage({ typ: "saisonende", letzte: 3 }), "offene Spieltage von 20"],
  ["ausloeser.enge", () => offeneSpieltage({ typ: "enge", prozent: 60 }),
    () => offeneSpieltage({ typ: "enge", prozent: 5 }), "offene Spieltage von 20"],
  // 🔴 Die WIE-LANGE-Achse (07.08.2026). Sie ist die Erlaubnis in Reinform:
  // sie sagt, an welchen Spieltagen etwas gilt, und bewegt für sich genommen
  // keinen einzigen Punkt.
  ["geltung.fenster", () => gueltigeSpieltage({ typ: "sofort" }),
    () => gueltigeSpieltage({ typ: "fenster", n: 5 }), "gültige Spieltage von 20"],
  ["geltung.rest", () => gueltigeSpieltage({ typ: "sofort" }),
    () => gueltigeSpieltage({ typ: "rest" }), "gültige Spieltage von 20"],
  // ⚠️ Nicht über die ANZAHL messbar: „nächster Spieltag" gilt genau einen
  // Spieltag lang, „sofort" auch. Die Zahl wäre in beiden Fällen 1, und die
  // Zeile stünde als totes Tor da, obwohl sie sauber verschiebt. Gemessen wird
  // deshalb, WELCHER Spieltag es ist — dieselbe Lehre wie bei `limitKlassen`,
  // wo der erste Messfall am falschen Feldnamen scheiterte.
  ["geltung.naechsterSpieltag", () => ersterGueltiger({ typ: "sofort" }),
    () => ersterGueltiger({ typ: "naechsterSpieltag" }), "erster gültiger Spieltag (erworben an 8)"],
  ["geltung.jackpot", () => ausschuettung({ typ: "sofort" }),
    () => ausschuettung({ typ: "jackpot", zuwachs: 25, maxFaktor: 3 }),
    "% Ausschüttung nach 4 leeren Spieltagen"],
  // 🔴 Die Pflicht-Obergrenze aus der Roadmap („sonst entscheidet ein einzelner
  // Spieltag die Saison"). Ohne diese Zeile stünde sie im Regelwerk und niemand
  // hätte geprüft, ob sie überhaupt greift.
  ["geltung.maxFaktor", () => ausschuettung({ typ: "jackpot", zuwachs: 25, maxFaktor: 5 }, 20),
    () => ausschuettung({ typ: "jackpot", zuwachs: 25, maxFaktor: 2 }, 20),
    "% Ausschüttung nach 20 leeren Spieltagen"],
];

console.log(`${"=".repeat(88)}`);
console.log("  TEIL 4 — Erlaubnis statt Punkte");
console.log(`  ${GATE_FAELLE.length + 1} Tore, jeweils Vorgabe gegen Extremwert`);
console.log(`${"=".repeat(88)}\n`);

const taubeTore = [];
for (const [name, vorgabe, extrem, einheit] of GATE_FAELLE) {
  const a = vorgabe();
  const b = extrem();
  if (a === b) {
    console.log(`  ${name.padEnd(26)} ⚠️  BEWEGT NICHTS (${a} ${einheit})`);
    taubeTore.push(name);
  } else {
    console.log(`  ${name.padEnd(26)} ${String(a).padStart(3)} → ${String(b).padEnd(3)} ${einheit}`);
  }
}

// `tippfenster` braucht echte Spiele mit Anpfiff — deshalb getrennt und mit
// einem festen `jetzt`, sonst hinge die Zahl an der Uhrzeit des Laufs.
{
  const st = createMockStore();
  const rnd = await st.createRound({ name: "T", adminId: "u-du", rules: sanitizeRules(DEFAULT_RULES), teamFilter: blTeams });
  const spiele = (await st.listRoundMatches(rnd.id))
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  // Ein Zeitpunkt MITTEN in der Saison: kurz vor dem 60. Spiel.
  const jetzt = new Date(spiele[59].kickoff).getTime() - 60 * 60 * 1000;
  const offen = (stunden) => spiele.filter((m) =>
    tippStatus(m, sanitizeRules({ ...DEFAULT_RULES, tippfenster: { vorlaufStunden: stunden } }), jetzt).offen).length;
  const eng = offen(2);
  const weit = offen(720);
  const einheit = `tippbare Spiele von ${spiele.length}`;
  if (eng === weit) {
    console.log(`  ${"tippfenster".padEnd(26)} ⚠️  BEWEGT NICHTS (${eng} ${einheit})`);
    taubeTore.push("tippfenster");
  } else {
    console.log(`  ${"tippfenster".padEnd(26)} ${String(eng).padStart(3)} → ${String(weit).padEnd(3)} ${einheit}`);
  }
}

console.log(`\n${"-".repeat(88)}`);
if (taubeTore.length) {
  console.log("  ⚠️ Diese Tore lassen bei jeder Einstellung dasselbe durch:");
  for (const t of taubeTore) console.log(`     - ${t}`);
  console.log();
  console.log("  🔴 Ein Tor, das nie zugeht, ist keine Einstellung — es ist eine Zeile");
  console.log("     im Regelwerk, die im Creator-Code mitreist und nichts tut.");
} else {
  console.log("  ✅ Jedes geprüfte Tor öffnet und schließt.");
}
console.log();

// ============================================================
//  TEIL 4 — kommt die SPIELAUSWAHL in der angelegten Runde an?
//
//  🔴 Der teuerste Fund vom 09.08.2026, und er stand in keiner Messung:
//  eine Runde bestimmte ihre Spiele ausschließlich über `team_filter` — eine
//  flache Vereinsliste. Wettbewerbe, Phasen, Spieltag-Bereich, feste Liste und
//  die Liga-Sonderregeln verdampften beim Anlegen. „Nur Bundesliga" ergab 1943
//  statt 306 Spiele.
//
//  Warum keine der bestehenden Abnahmen das sah: `greift` fragte, ob eine
//  Einstellung die WERTUNG bewegt — nicht, ob sie die SPIELMENGE der Runde
//  bewegt. Beide Seiten rechneten für sich korrekt. Genau das Muster der 17
//  Funde vom 05.08.
//
//  Deshalb steht die Messung jetzt hier: sie vergleicht, was das Regelwerk
//  sagt, mit dem, was die angelegte Runde liefert.
// ============================================================
{
  console.log(`\n${"=".repeat(88)}`);
  console.log("  TEIL 4 — kommt die Spielauswahl in der angelegten Runde an?");
  console.log(`${"=".repeat(88)}\n`);

  const { filterSpiele } = await import("../src/lib/spielauswahl.js");
  const FAELLE = [
    ["nur Bundesliga", { wettbewerbe: ["bl"] }],
    ["nur CL ab Achtelfinale", { wettbewerbe: ["cl"], phasen: ["achtelfinale", "viertelfinale", "halbfinale", "finale"] }],
    ["nur Spieltag 30-34", { spieltagVon: 30, spieltagBis: 34 }],
    ["Sonderregeln je Liga", { jeWettbewerb: { bl: { spieltagVon: 30, zonen: [{ von: 14, bis: 18 }] } } }],
    ["feste Vereinsliste", { modus: "teams", teams: ["FC Bayern München", "Borussia Dortmund"] }],
  ];

  const abweichungen = [];
  for (const [name, spiele] of FAELLE) {
    const rules = sanitizeRules({ ...DEFAULT_RULES, spiele });
    const st = createMockStore();
    const rnd = await st.createRound({ name, adminId: "u-0", rules });
    const inRunde = (await st.listRoundMatches(rnd.id)).length;
    const nachRegel = filterSpiele(await st.listMatches(), rules.spiele).length;
    const gleich = inRunde === nachRegel;
    if (!gleich) abweichungen.push(`${name} (Regelwerk ${nachRegel}, Runde ${inRunde})`);
    console.log(`  ${name.padEnd(24)} Regelwerk ${String(nachRegel).padStart(5)}`
      + ` · Runde ${String(inRunde).padStart(5)} · ${gleich ? "gleich" : "⚠️ ABWEICHUNG"}`);
  }

  console.log(`\n${"-".repeat(88)}`);
  if (abweichungen.length) {
    console.log("  ⚠️ Diese Einstellungen kommen in der Runde NICHT an:");
    for (const a of abweichungen) console.log(`     - ${a}`);
    console.log();
    console.log("  🔴 Der Admin stellt etwas ein, die Spielerstellung zeigt die richtige Zahl,");
    console.log("     und die Runde spielt trotzdem etwas anderes. Beide Seiten rechnen für");
    console.log("     sich korrekt — deshalb fällt es ohne diese Messung niemandem auf.");
    process.exitCode = 1;
  } else {
    console.log("  ✅ Was eingestellt wurde, gilt auch in der angelegten Runde.");
  }
  console.log();
}
