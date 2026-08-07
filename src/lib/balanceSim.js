// ============================================================
//  BALANCE-SIMULATOR — „bleibt das noch ein Tippspiel?"
//
//  Monte-Carlo über simulierte Spieltage: zwei Tipper-Typen treten gegen-
//  einander an — ein GUTER TIPPER (tippt den wahrscheinlichsten Ausgang, liest
//  also die Quoten) und ein ZOCKER (setzt konsequent auf Überraschungen).
//  Gewinnt der Zocker über eine ganze Saison zu oft, belohnt das Regelwerk
//  Glück statt Können — dann ist es kein Tippspiel mehr, sondern ein Casino.
//
//  Warum überhaupt simulieren: Die Underdog-Neigung aus presetRating.js schaut
//  nur auf EIN Spiel. Modifikatoren (Joker, Gewichte) wirken aber über eine
//  ganze Saison und stapeln sich — das sieht man erst im Durchlauf.
//
//  Reine Berechnung, kein UI, kein I/O. Deterministisch über den Seed, damit
//  gleiche Regler immer dieselbe Bewertung ergeben (sonst zappelt die Ampel).
//
//  Bewusste Vereinfachung: simuliert wird nur der ERGEBNIS-Markt, keine
//  Torschützen. Die Torschützen-Wette verstärkt beide Typen ähnlich und würde
//  die Aussage „Können vs. Glück" nicht verschieben, aber die Laufzeit vervielfachen.
// ============================================================

import { scoreTip, maxTotalModifier, maxJokerFactor } from "./engine";
import { archetypeSnapshots } from "./rulePreview";
import { ARCHETYPE_FREQ } from "./bundesligaStats";
import { applyCatchup } from "./catchup";
// 🔴 Blindstelle 3.1 aus design/blindstellen-balancesim.md: `applySaisonform`
// wurde nie aufgerufen. Gewichtung und Streichresultate waren im Simulator
// damit UNSICHTBAR — ein Regelwerk konnte sie auf Anschlag drehen, und die
// Kennzahlen änderten sich nicht.
import { applySaisonform, sanitizeSaisonform } from "./saisonform";
// 🔴 Blindstelle 3.2: die Joker-GRUNDFORM war unsichtbar. `bedingung.minQuote`,
// `maxQuote` und `wer` konnten beliebig stehen — der Simulator setzte den
// Joker trotzdem auf jedes Spiel. Eine Einstellung ohne messbare Wirkung.
import { basisFuer, darfEinsetzen, erfuelltBedingung } from "./jokerBasis";
import { sanitizeTippEinfluss, mischeRaster } from "./tippEinfluss";

// ── 🔴 Was dieser Simulator NICHT rechnet ───────────────────
//
//  Gemessen am 07.08.2026, und der Befund ist schärfer als „ein paar neue
//  Ebenen fehlen": **dieser Simulator hat eine ZWEITE FASSUNG der
//  Ranglisten-Kette, und die ist von der echten abgewandert.**
//
//  `scoreLeaderboardHistory` (engine.js) rechnet vier Schritte:
//    roh → applyEreignisWirkungen → applyDuellJoker → applySaisonform → applyCatchup
//  Dieser Simulator baut den Verlauf selbst und rechnet zwei davon:
//    verlauf → applySaisonform → applyCatchup
//
//  Der Kommentar weiter unten sagt sogar „Reihenfolge wie in
//  `scoreLeaderboardHistory`" — er stimmt für das ENDE der Kette und
//  verschweigt den Anfang. Genau die Sorte zweite Wahrheit, an der dieses
//  Projekt `saisonBoard.js` schon einmal auseinandergezogen hat.
//
//  Dazu die Ebenen, die der STORE draufrechnet und die es hier gar nicht
//  gibt: Drehrad, Saison-Wetten, Versäumnis-Ersatztipps.
//
//  ⚠️ **Warum das nicht nur eine Lücke, sondern ein Schaden ist:** die Ampel
//  in der Spielerstellung sagt „Ausgewogen", auch wenn ein Jackpot auf dem
//  Dreifachen steht und Duelle laufen. Sie hat davon nichts gesehen. Ein
//  grünes Licht, das nichts bedeutet, ist schlimmer als gar keins — deshalb
//  BENENNT `unvermesseneEbenen()` die Lücke, solange sie besteht, statt sie
//  stillschweigend als Urteil auszugeben.
//
//  Wer eine dieser Ebenen an den Simulator anschließt, streicht sie HIER —
//  dann wird aus dem Teilbefund wieder ein Urteil.
export const NICHT_SIMULIERT = [
  {
    feld: "ereignisse", label: "Ereignisse",
    was: "erspielte Joker, Punkte-Gutschriften, Auf- und Abschläge",
    aktiv: (r) => r?.ereignisse?.enabled === true,
  },
  {
    feld: "duell", label: "Duell-Joker",
    was: "Klau und Block zwischen Mitspielern",
    aktiv: (r) => r?.duell?.enabled === true,
  },
  {
    feld: "drehrad", label: "Drehrad",
    was: "die Ziehung je Spieltag",
    aktiv: (r) => r?.drehrad?.enabled === true,
  },
  {
    feld: "saison", label: "Saison-Wetten",
    was: "die Langzeit-Ebene neben den Spieltagen",
    aktiv: (r) => r?.saison?.enabled === true,
  },
  {
    feld: "versaeumnis", label: "Versäumnis",
    was: "Ersatz-Tipps für vergessene Spieltage",
    aktiv: (r) => r?.versaeumnis?.enabled === true,
  },
];

// Welche unsimulierten Ebenen sind in DIESEM Regelwerk eingeschaltet?
// Leer = die Simulation hat alles gesehen, was aktiv ist.
export function unvermesseneEbenen(rules) {
  return NICHT_SIMULIERT.filter((e) => e.aktiv(rules))
    .map(({ feld, label, was }) => ({ feld, label, was }));
}

// ── Ein Urteil, das seine eigenen Grenzen kennt ─────────────
// 🔴 Warum das NICHT in `bewerten()` steckt: dort gehören Aussagen über
// gemessene Zahlen hin. Dies hier ist eine Aussage über die MESSUNG SELBST,
// und die beiden dürfen sich nicht vermischen — `presets.balance.test.js`
// misst `bewerten()` und soll weiter genau das messen.
//
// Die Regel dahinter, und sie ist keine Geschmacksfrage:
//  - Ein GRÜN, das aktive Ebenen nicht gesehen hat, ist keine abgeschwächte
//    Entwarnung, sondern gar keine. Es wird zu „unbekannt".
//  - Ein GELB oder ROT bleibt stehen. Der gemessene Teil ist auffällig, und
//    daran ändert eine ungesehene Ebene nichts — sie kann es nur schlimmer
//    machen. Eine Warnung wegen Unwissen zurückzunehmen wäre der Fehler in
//    die andere Richtung.
export function ampelMitLuecken(ampel, luecken = []) {
  if (!luecken.length) return ampel;
  const namen = luecken.map((l) => l.label).join(", ");
  if (ampel.stufe !== "gruen") {
    return { ...ampel, luecken, text: `${ampel.text} Nicht mitgerechnet: ${namen}.` };
  }
  return {
    stufe: "unbekannt", luecken,
    titel: "Nur teilweise vermessen",
    text: `Was die Simulation gesehen hat, ist ausgewogen — aber ${namen} rechnet sie `
      + "nicht mit. Für diese Runde gibt es deshalb kein Urteil, nur einen Teilbefund.",
  };
}

// Kleiner, schneller Zufallsgenerator mit Seed (mulberry32) — reproduzierbar.
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Je Spielart: der wahrscheinlichste Tipp (so tippt der GUTE Tipper — er liest
// die Quoten), der Überraschungs-Tipp (so tippt der ZOCKER) und die realen
// Ausgänge mit ihren Wahrscheinlichkeiten (Summe je 1).
// Ergebnis-Verteilung AUS DEN QUOTEN ableiten: implizite Wahrscheinlichkeit
// eines Endstands = 1/Quote, über das Raster normiert.
//
// Warum nicht handgemachte Tabellen: Passt die eigene Tabelle nicht exakt zu
// den Quoten des Snapshots, sind Außenseiter-Wetten schon dadurch systematisch
// unter- oder überbewertet — dann misst der Simulator den eigenen Schätzfehler
// statt des Regelwerks. Aus den Quoten gezogen ist die Simulation in sich
// konsistent: bei fairen Quoten hat KEINE Tipp-Strategie einen Vorteil, und
// jeder gemessene Zocker-Vorsprung kommt dann wirklich aus den Regeln.
function impliedDistribution(snap) {
  const cs = snap.correctScore || [];
  const list = [];
  let sum = 0;
  for (let h = 0; h < cs.length; h++) {
    for (let a = 0; a < (cs[h] || []).length; a++) {
      const q = cs[h][a];
      if (!(q > 0)) continue;
      const p = 1 / q;
      list.push([{ home: h, away: a }, p]);
      sum += p;
    }
  }
  return list.map(([r, p]) => [r, p / sum]);
}

// Die beiden Strategien, beide aus denselben Quoten abgeleitet:
//  Könner — tippt den wahrscheinlichsten Endstand (liest die Quoten).
//  Zocker — setzt konsequent auf den Außenseiter (die Seite mit der HÖHEREN
//           Sieger-Quote), dort aber auf dessen wahrscheinlichsten Endstand.
// Es geht also nicht um „wer rät wilder", sondern um die Frage, die dich
// umtreibt: lohnt sich stures Außenseiter-Setzen mehr als gutes Tippen?
// ── Tipper-Typen ────────────────────────────────────────────
// In einer echten Runde tippt niemand stur nur Favoriten oder nur Außenseiter.
// Diese Population bildet gewöhnliches Verhalten ab: die meisten tippen
// überwiegend Favoriten und wagen ab und zu eine Überraschung.
//
// `aussenseiter(istUeberraschung, rand)` entscheidet je Spiel, ob dieser Typ
// auf den Außenseiter setzt. Der KENNER bekommt dabei eine höhere Trefferquote
// bei echten Überraschungen — das ist die übliche Art, Sachverstand zu
// modellieren (Können = Korrelation mit dem tatsächlichen Ausgang), nicht
// Schummeln: er erwischt nur rund jede vierte Überraschung, liegt also meistens
// auch daneben.
//
// ZIELBILD einer gesunden Runde: Der Kenner gewinnt am häufigsten — nicht der
// Dauerzocker (reines Glück) und nicht der reine Favoriten-Tipper (kein Mut).
// `fanBrille`: Wer tippt bei seinem EIGENEN Verein anders, als die Quoten
// nahelegen? Die beiden Extreme sind bewusst ausgenommen — „tippt immer den
// Favoriten" und „setzt stur auf Außenseiter" sind keine Menschen, sondern
// MESSINSTRUMENTE. Sie halten je einen Rand fest, an dem man abliest, ob das
// Regelwerk kippt; eine Ausnahme darin würde die Skala verbiegen.
// ── FORM: niemand ist eine Saison lang gleich stark ─────────
// Bis hierher war jeder Tipper über 34 Spieltage konstant. Das klingt harmlos
// und macht den Simulator für eine ganze FEHLERKLASSE blind: alles, was einen
// AUSSCHNITT der Saison stärker gewichtet, verkleinert die effektive
// Stichprobe — und das sieht man nur, wenn die Stichprobe überhaupt streut.
//
// Belegt an der Spieltag-Gewichtung: bei konstanter Stärke sah sie harmlos aus
// (Kenner 74 % → 68,8 %), mit Formkurven halbierte sie den Können-Ausdruck
// (74 % → 53 %) und vergrößerte den Vorsprung des Ersten.
//
// Modelliert als glatte Welle mit eigener Phase je Tipper, plus eine zweite,
// schnellere Schwingung — eine reine Sinuskurve wäre zu regelmäßig, echte Form
// kommt in ungleichen Wellen. Deterministisch aus dem Seed.
//
// `form` ist ein Faktor um 1: >1 gut drauf, <1 schwache Phase. Er zieht die
// Trefferquote zur BASIS (= Tippen ohne Information) und wieder weg davon —
// Form ist also nicht „mehr Glück", sondern „ich lese die Spiele gerade
// besser oder schlechter".
// ── PUBLIKUM: die Runde ist größer als fünf Archetypen ──────
// `tippEinfluss` greift erst ab `minTipper` (Standard 8) — mit fünf gemessenen
// Tippern könnte die Regel also NIE feuern, und der Mischanteil bliebe immer 0.
// Das ist genau die Blindstelle: nicht „die Regel wirkt nicht", sondern „der
// Simulator hat gar keine Runde, in der sie wirken könnte".
//
// Ergänzt wird deshalb ein PUBLIKUM: zusätzliche Tipper, die mittippen und
// damit die Gruppenverteilung bilden, aber NICHT gewertet werden. Sie sind der
// Rest der Runde, nicht weitere Messpunkte.
//
// Die Mischung ist bewusst nicht gleichverteilt — eine echte Runde besteht
// überwiegend aus soliden Tippern und Kennern. Reine Favoriten-Tipper gibt es
// wenige, reine Dauerzocker praktisch nicht (das sind Messinstrumente, keine
// Menschen). Genau diese Schieflage IST der Herdeneffekt, den die Regel
// bestrafen soll: wenn fast alle den Favoriten tippen, wird der Favoriten-Tipp
// teuer. Eine Gleichverteilung hätte keine Herde und nichts zu messen.
const PUBLIKUM_MIX = [
  { key: "solide", anteil: 0.40 },
  { key: "kenner", anteil: 0.25 },
  { key: "mutig", anteil: 0.25 },
  { key: "favorit", anteil: 0.10 },
];

const FORM_AMPLITUDE = 0.45;

export function formFaktor(phase, phase2, md, spieltage) {
  const t = spieltage > 0 ? md / spieltage : 0;
  const welle = Math.sin(2 * Math.PI * (t + phase))
    + 0.5 * Math.sin(2 * Math.PI * (2.7 * t + phase2));
  return 1 + FORM_AMPLITUDE * (welle / 1.5);
}

// Trefferquote unter Form: `p` ist die Quote mit voller Information, `basis`
// die ohne. Bei form = 1 bleibt alles wie bisher.
const mitForm = (p, basis, form) => basis + (p - basis) * form;

// ⚠️ `form: false` bei den beiden Extremen — aus demselben Grund wie
// `fanBrille`. „Tippt immer den Favoriten" und „setzt stur auf Außenseiter"
// sind keine Menschen, sondern MESSINSTRUMENTE: sie halten je einen Rand fest,
// an dem man abliest, ob das Regelwerk kippt. Ein Instrument, das mal besser
// und mal schlechter misst, verbiegt die Skala.
export const PROFILE = [
  { key: "favorit", label: "Favoriten-Tipper", desc: "tippt immer den Favoriten",
    aussenseiter: () => false, fanBrille: false, form: false },
  { key: "solide", label: "Solide", desc: "fast immer Favorit, selten mal mutig",
    aussenseiter: (u, r, f) => r() < mitForm(0.12, 0.12, f), fanBrille: true, form: true },
  { key: "kenner", label: "Kenner", desc: "wagt gezielt — erwischt ~jede 4. Überraschung",
    // Der einzige mit echter UNTERSCHEIDUNG (0.28 bei Überraschung gegen 0.07
    // sonst). Genau die schmilzt in schwacher Form Richtung Basis 0.12 — dann
    // wagt er zwar noch, aber nicht mehr an den richtigen Stellen.
    aussenseiter: (u, r, f) => r() < mitForm(u ? 0.28 : 0.07, 0.12, f), fanBrille: true, form: true },
  { key: "mutig", label: "Mutig", desc: "etwa jedes zweite Spiel Außenseiter",
    aussenseiter: (u, r, f) => r() < mitForm(0.45, 0.45, f), fanBrille: true, form: true },
  { key: "zocker", label: "Zocker", desc: "setzt stur auf Außenseiter",
    aussenseiter: () => true, fanBrille: false, form: false },
];

function strategien(snap, verteilung) {
  let modal = null, upset = null;
  const aussenseiterIstHeim = (snap.winner?.home ?? 0) > (snap.winner?.away ?? 0);
  for (const [r, p] of verteilung) {
    if (!modal || p > modal.p) modal = { r, p };
    const istAussenseiterSieg = aussenseiterIstHeim ? r.home > r.away : r.away > r.home;
    if (istAussenseiterSieg && (!upset || p > upset.p)) upset = { r, p };
  }
  return { modal: modal?.r ?? { home: 1, away: 1 }, upset: upset?.r ?? { home: 1, away: 2 } };
}

// Kumulierte Auswahltabelle für die Spielart-Häufigkeit (aus den realen Werten).
function buildPicker(freq) {
  const keys = Object.keys(freq);
  const cum = [];
  let acc = 0;
  for (const k of keys) { acc += freq[k]; cum.push([k, acc]); }
  return (r) => { for (const [k, c] of cum) if (r <= c) return k; return keys[keys.length - 1]; };
}

function pickWeighted(list, r) {
  let acc = 0;
  for (const [wert, p] of list) { acc += p; if (r <= acc) return wert; }
  return list[list.length - 1][0];
}

const leer = { home: [], away: [] };

// Anteil der Begegnungen, die als Derby gelten. Grob: ~11 Traditionsduelle bei
// 306 Saisonspielen. Bestimmt, wie stark ein Derby-Faktor überhaupt durchschlägt.
const DERBY_ANTEIL = 0.07;

// ── Vereins-Zugehörigkeit (schließt die bekannte Lücke) ─────
// Bis hierher kannte der Simulator keine Vereine — der HEIMAT-Joker feuerte
// deshalb nie, und sein Faktor war ungemessen. Modelliert wird jetzt:
//
//  • Jeder Tipper hat einen Verein. In einer 18er-Liga spielt der an jedem
//    Spieltag in GENAU EINEM von neun Spielen mit.
//  • Ob der eigene Verein dabei der Favorit oder der Außenseiter ist, wechselt
//    — im Mittel hälftig.
//  • ⚠️ Der eigentliche Punkt: FANS TIPPEN IHR TEAM ZU OPTIMISTISCH. Genau
//    deshalb ist der Heimatbonus kein Gratis-Aufschlag: er verstärkt auch die
//    Fehltipps, die aus dieser Voreingenommenheit entstehen. Ohne diese
//    Modellierung würde der Simulator den Bonus systematisch zu gut bewerten.
const EIGENER_VEREIN_ANTEIL = 1 / 9;   // ein Spiel je Spieltag
const FAN_OPTIMISMUS = 0.6;            // so oft tippt ein Fan sein Team zum Sieg

// ── Big Game (schließt die zweite Blindstelle) ──────────────
// Bis hierher trug KEIN Snapshot einen `bigGameWert`. `bigGameAufschlag` gab
// deshalb immer 0 zurück, und Big Game war für die Ampel unsichtbar: „aus" und
// „stark" lieferten auf die Nachkommastelle dieselben Zahlen. Gleichzeitig
// rechnete `maxTotalModifier` die Ebene in die Obergrenze ein — der Simulator
// meldete also eine Decke, die im Spiel nie ausgezahlt wurde.
//
// Modelliert wird es so, wie es wirklich läuft: GENAU EIN Spiel je Spieltag ist
// das Topspiel (`spieltagOeffnen` wählt eines), und eingefroren wird ein WERT,
// kein Urteil — ob er zählt, entscheidet die Runde über `minSpannung`. Der Wert
// streut, weil nicht jeder Spieltag ein gleich brisantes Topspiel hat; über der
// Standard-Schwelle 0,35 liegt damit gut die Hälfte. Genau diese Streuung ist
// der Punkt: ein Spieltag ohne Big Game ist ein normaler Spieltag.
const BIGGAME_WERT_MIN = 0.25;
const BIGGAME_WERT_MAX = 0.75;

// Führt die Simulation aus. Je Spieltag setzen beide Tipper (falls erlaubt)
// ihren Joker dorthin, wo er strategisch hingehört — der Könner auf sein
// sicherstes Spiel (Favorit), der Zocker auf seine Überraschungs-Wette
// (Außenseiter). Genau da entscheidet sich, ob das Regelwerk kippt.
export function simulateBalance(rules, {
  seasons = 100, matchdays = 17, perMatchday = 9, seed = 12345,
  mitglieder = 12,     // Rundengröße inkl. der fünf gemessenen Archetypen
} = {}) {
  const snaps = archetypeSnapshots();               // [{ key, snap, ... }]

  // ── Tipp-Einfluss: nur aufbauen, wenn die Regel überhaupt an ist ──
  // Der gemischte Raster kostet je Spiel und Tipper eine eigene Rechnung.
  // Steht die Regel auf 0 (Standard), bleibt der Pfad komplett unberührt —
  // dieselbe Laufzeit und dieselben Zahlen wie bisher.
  const teCfg = sanitizeTippEinfluss(rules?.tippEinfluss);
  const teAktiv = teCfg.staerke > 0;
  // Das Publikum füllt die Runde auf `mitglieder` auf. Es tippt mit, wird aber
  // nicht gewertet — sonst wären es weitere Messpunkte statt Mitspieler.
  const publikum = teAktiv ? (() => {
    const rest = Math.max(0, mitglieder - PROFILE.length);
    const out = [];
    for (const m of PUBLIKUM_MIX) {
      const anzahl = Math.round(rest * m.anteil);
      for (let i = 0; i < anzahl; i++) out.push(PROFILE.find((p) => p.key === m.key));
    }
    return out;
  })() : [];
  // Je Spielart einmal: Quoten-Verteilung + die beiden Tipp-Strategien.
  const artOf = new Map(snaps.map((s) => {
    const verteilung = impliedDistribution(s.snap);
    return {
      key: s.key,
      wert: {
        snap: s.snap,
        // Zweite Fassung derselben Begegnung, als Derby markiert — damit der
        // Simulator auch Team-/Derby-Modifikatoren misst. Ohne das wäre die
        // Ampel blind für alles, was der Admin unter „Derby zählt mehr" einstellt.
        snapDerby: { ...s.snap, derby: "Derby" },
        verteilung, ...strategien(s.snap, verteilung),
      },
    };
  }).map(({ key, wert }) => [key, wert]));
  const pickArt = buildPicker(ARCHETYPE_FREQ);
  const jokerMax = maxTotalModifier(rules);
  const hatModifikator = jokerMax > 1;
  // ⚠️ NICHT dasselbe wie `jokerMax`. Im Ranking-Modus akzeptiert die Engine nur
  // Gewichte AUS DEM POOL (`joker.faktoren`) — eine bewusste Sicherung, damit
  // kein manipulierter Tipp einen Fantasie-Faktor einschleust. `jokerMax` ist
  // aber die Obergrenze ALLER Ebenen zusammen (Joker + Big Game + Wettbewerb +
  // Team/Derby). Sobald eine davon aktiv ist, liegt der Wert NICHT mehr im Pool,
  // die Sicherung greift, und der Aufschlag ist still 0 — der Simulator hätte
  // dann den Ranking-Joker gar nicht mehr gemessen, ohne dass es auffällt.
  // Genau das war der Fall: mit aktivem Big Game fiel beim Preset „Rangliste"
  // der Modifikator-Anteil von 9,8 % auf 0 und der Maximalfall halbierte sich.
  const jokerGewicht = maxJokerFactor(rules);
  // Der Gewichts-Pool, absteigend — nur im Ranglisten-Modus belegt.
  const rankingPool = (rules?.joker?.enabled && rules.joker.modus === "ranking")
    ? [...(rules.joker.faktoren || [])].filter((f) => Number.isFinite(f) && f > 1).sort((a, b) => b - a)
    : null;
  // Ohne Modifikatoren gerechnet — für den Anteil, den sie ausmachen.
  const ohneMod = {
    ...rules,
    joker: { ...(rules.joker || {}), enabled: false },
    teamMods: { derbyFaktor: 1, teams: {} },
    bigGame: { ...(rules.bigGame || {}), enabled: false },
    wettbewerbe: { ...(rules.wettbewerbe || {}), enabled: false },
  };

  const rand = rng(seed);
  const n = PROFILE.length;
  const siege = new Array(n).fill(0);
  const punkteGesamt = new Array(n).fill(0);
  let summeMit = 0, summeOhne = 0;
  // Wie oft war ein Typ bei einer echten Überraschung dabei (Anteil aller
  // Überraschungen) — genau die Frage „jedes 4.–5. Mal dabei".
  let ueberraschungen = 0;
  const dabei = new Array(n).fill(0);
  // Aufhol-Mechanismus: nur messen, wenn er aktiv ist (spart Verlaufsführung).
  const aufholenAktiv = rules?.aufholen?.enabled === true;
  // Dieselbe Frage wie `brauchtVerlauf` in engine.js sie für die Saisonform
  // stellt: eine flache Kurve ohne Streicher ist ein No-op.
  // Die Grundform des klassischen Jokers — EINE Auflösung je Lauf, nicht je
  // Spieltag: sie hängt nur am Regelwerk.
  const jokerBasisEinzel = basisFuer("joker.einzel", rules);
  const sfCfg = sanitizeSaisonform(rules?.saisonform);
  const saisonformAktiv = sfCfg.kurve !== "flach" || sfCfg.streich > 0;
  let aufholFlips = 0;   // Saisons, in denen der Bonus den Sieger geändert hat

  for (let s = 0; s < seasons; s++) {
    const saison = new Array(n).fill(0);
    // Je Saison eine eigene Formkurve pro Tipper — zwei Phasen, damit die
    // Wellen nicht im Gleichtakt laufen. Wären alle gleichzeitig gut drauf,
    // höbe sich die Form gegenseitig auf und wäre wieder unsichtbar.
    const formPhase = PROFILE.map(() => [rand(), rand()]);
    // Kumulativer Stand je Spieltag — Grundlage für den Aufhol-Bonus (er hängt
    // am Stand VOR dem jeweiligen Spieltag) UND für die Saisonform.
    // ⚠️ Vorher stand hier `aufholenAktiv ? [] : null`: ohne Aufhol-Bonus gab es
    // gar keinen Verlauf, und damit konnte die Saisonform prinzipiell nicht
    // gemessen werden (Blindstelle 3.1, Punkt 2).
    const verlauf = (aufholenAktiv || saisonformAktiv) ? [] : null;
    // Wie viele Wertungen hat jeder bis hierher bekommen? `applySaisonform`
    // liest daran ab, ob an einem Spieltag überhaupt getippt wurde — fehlt das
    // Feld, gilt JEDER Spieltag als nicht getippt, und mit `nurGetippte: true`
    // (Vorgabe) greifen Streichresultate NIE (Blindstelle 3.1, Punkt 3).
    const gewertet = new Array(n).fill(0);
    // Gesetzte Joker je Spieler, für die Abklingzeit in `darfEinsetzen`.
    const jokerHistorie = PROFILE.map(() => []);
    for (let md = 0; md < matchdays; md++) {
      const arten = [];
      for (let m = 0; m < perMatchday; m++) arten.push(pickArt(rand()));

      // Erst alle Spiele des Spieltags auslosen — nötig, weil die Tipp-
      // Entscheidung davon abhängt, ob es eine Überraschung wird.
      const spiele = arten.map((art) => {
        const def = artOf.get(art);
        const real = pickWeighted(def.verteilung, rand());
        const aussenseiterIstHeim = (def.snap.winner?.home ?? 0) > (def.snap.winner?.away ?? 0);
        const ueberraschung = aussenseiterIstHeim ? real.home > real.away : real.away > real.home;
        // Derby-Anteil: ~11 Traditionsduelle bei 306 Saisonspielen ≈ 7 %.
        const istDerby = rand() < DERBY_ANTEIL;
        return { def, real, ueberraschung, snap: istDerby ? def.snapDerby : def.snap };
      });

      // Genau EIN Topspiel je Spieltag — und nur dieses trägt den Wert. Die
      // Snapshots aus `artOf` sind gecacht und werden von allen Spieltagen
      // geteilt, deshalb eine KOPIE statt einer Zuweisung; sonst bliebe der
      // Wert kleben und ab dem zweiten Spieltag wäre jedes Spiel ein Big Game.
      if (spiele.length) {
        const topIdx = Math.floor(rand() * spiele.length);
        const wert = +(BIGGAME_WERT_MIN + rand() * (BIGGAME_WERT_MAX - BIGGAME_WERT_MIN)).toFixed(3);
        spiele[topIdx] = {
          ...spiele[topIdx],
          snap: { ...spiele[topIdx].snap, bigGameWert: wert },
        };
      }

      // Welches Spiel betrifft den eigenen Verein? Höchstens eines je Spieltag
      // und Tipper — und je Tipper ein anderes, sonst hätten alle denselben
      // Heimvorteil und der Bonus wäre wirkungslos statt gemessen.
      const eigenesSpiel = PROFILE.map(() =>
        (rand() < EIGENER_VEREIN_ANTEIL * perMatchday
          ? Math.floor(rand() * spiele.length) : -1));
      // Ist der eigene Verein hier der Favorit oder der Außenseiter?
      const eigenerIstFavorit = PROFILE.map(() => rand() < 0.5);

      // Je Typ entscheiden, wo er auf den Außenseiter setzt.
      const wahl = PROFILE.map((p, pi) => spiele.map((sp, idx) => {
        // Beim eigenen Verein schlägt die Fan-Brille die Strategie: man tippt
        // sein Team zum Sieg, auch wenn die Quoten dagegen sprechen.
        if (p.fanBrille && idx === eigenesSpiel[pi] && rand() < FAN_OPTIMISMUS) {
          return !eigenerIstFavorit[pi];   // eigener Verein Außenseiter → Außenseiter-Tipp
        }
        // Form nur bei den „Menschen" — die beiden Messinstrumente bleiben
        // konstant, sonst verbiegt sich die Skala, an der wir ablesen.
        const f = p.form ? formFaktor(formPhase[pi][0], formPhase[pi][1], md, matchdays) : 1;
        return p.aussenseiter(sp.ueberraschung, rand, f);
      }));

      // Das Publikum tippt mit — nur für die Gruppenverteilung, ungewertet.
      const wahlPublikum = publikum.map((p) => spiele.map((sp) => p.aussenseiter(sp.ueberraschung, rand, 1)));
      // Joker: jeder setzt ihn auf sein erstes Außenseiter-Spiel (dort ist am
      // meisten zu holen), sonst aufs erste Spiel.
      //
      // 🔴 Neu: nur auf ein Spiel, das die GRUNDFORM zulässt
      // (`erfuelltBedingung` — `minQuote`/`maxQuote`), und nur, wenn der
      // Spieler überhaupt einsetzen darf (`darfEinsetzen` — `wer`). Vorher
      // wurde beides ignoriert: ein Regelwerk konnte „nur ab Außenseiter-Quote
      // 4,0" verlangen, und der Simulator setzte trotzdem überall.
      //
      // ⚠️ Modell-Annahme, ausdrücklich: bei `wer: "adminFreigabe"` gilt jeder
      // als freigegeben. Der Simulator misst den JOKER, nicht die Bereitschaft
      // eines Admins — ohne diese Annahme wäre die Ebene schlicht aus, und die
      // Messung sagte nichts über die Einstellung aus, nur über den Admin.
      const jokerIdx = wahl.map((w, pi) => {
        if (!hatModifikator || rankingPool) return -1;
        const erlaubnis = darfEinsetzen(jokerBasisEinzel, PROFILE[pi].key, {
          board: PROFILE.map((p, k) => ({ userId: p.key, name: p.label, total: saison[k] }))
            .sort((a, b) => b.total - a.total),
          aktuellerSpieltag: md + 1,
          adminFreigaben: PROFILE.map((p) => ({ userId: p.key, spieltag: md + 1 })),
          hatGetippt: true,
          alleGetippt: true,
          letzteEinsaetze: jokerHistorie[pi],
        }, "joker.einzel");
        if (!erlaubnis.erlaubt) return -1;
        // Erst unter den Spielen suchen, die die Bedingung erfüllen.
        const moeglich = spiele
          .map((sp, i) => (erfuelltBedingung(jokerBasisEinzel, sp.snap).erlaubt ? i : -1))
          .filter((i) => i >= 0);
        if (!moeglich.length) return -1;
        const aussenseiter = moeglich.find((i) => w[i]);
        return aussenseiter != null ? aussenseiter : moeglich[0];
      });
      // Für die Abklingzeit: an welchen Spieltagen hat dieser Spieler gesetzt?
      jokerIdx.forEach((i, pi) => {
        if (i >= 0) jokerHistorie[pi].push({ jokerArt: "joker.einzel", spieltag: md + 1 });
      });

      // ── Ranglisten-Modus: der Pool wird VERTEILT ──────────
      // Vorher setzte der Simulator in BEIDEN Modi genau einen Joker je
      // Spieltag. Damit war der Ranglisten-Modus nicht modelliert — sein ganzer
      // Sinn ist, mehrere Gewichte über den Spieltag zu legen. Folge: die
      // Presets „Joker" und „Rangliste" lieferten auf die Nachkommastelle
      // identische Zahlen, obwohl sie verschiedene Spiele sind.
      // Verteilt wird nach VORLIEBE: das stärkste Gewicht auf den ersten
      // Außenseiter-Tipp (dort ist am meisten zu holen), dann absteigend; was
      // übrig bleibt, behält das neutrale 1.
      const gewichte = PROFILE.map((_, pi) => {
        if (!rankingPool || !hatModifikator) return null;
        const w = wahl[pi];
        const idx = spiele.map((_, i) => i);
        const reihenfolge = [...idx.filter((i) => w[i]), ...idx.filter((i) => !w[i])];
        const m = new Map();
        rankingPool.forEach((f, k) => { if (k < reihenfolge.length) m.set(reihenfolge[k], f); });
        return m;
      });

      spiele.forEach((sp, idx) => {
        if (sp.ueberraschung) ueberraschungen += 1;
        const actual = { ...sp.real, playerGoals: null };

        // ── Tipp-Einfluss: die Runde bewegt das Ergebnis-Raster ──
        // Alle Tipps DIESER Begegnung einsammeln — gewertete und Publikum.
        // Ohne das Publikum blieben es fünf und `minTipper` (8) griffe nie.
        const gruppenTipps = teAktiv ? [
          ...PROFILE.map((p, pi) => ({
            userId: p.key,
            tip: wahl[pi][idx] ? sp.def.upset : sp.def.modal,
          })),
          ...publikum.map((p, k) => ({
            userId: `publikum-${k}`,
            tip: wahlPublikum[k][idx] ? sp.def.upset : sp.def.modal,
          })),
        ] : null;

        for (let pi = 0; pi < n; pi++) {
          const aufAussenseiter = wahl[pi][idx];
          if (aufAussenseiter && sp.ueberraschung) dabei[pi] += 1;
          const basis = aufAussenseiter ? sp.def.upset : sp.def.modal;
          // Einzel-Modus liest `tip.joker`, Ranglisten-Modus `tip.gewicht` —
          // je Modus ist nur eines davon gesetzt, sonst zählte beides doppelt.
          const mitJoker = !rankingPool && idx === jokerIdx[pi];
          const gewicht = rankingPool ? (gewichte[pi]?.get(idx) ?? 1) : 1;
          // `verein` nur setzen, wenn der eigene Verein wirklich mitspielt —
          // daran erkennt die Engine den Heimatbonus (sie kennt selbst keine
          // Vereinsnamen, siehe Architektur-Regel 3).
          const eigener = idx === eigenesSpiel[pi]
            ? (eigenerIstFavorit[pi] ? sp.snap.home : sp.snap.away)
            : undefined;
          const tipp = {
            ...basis, goals: leer, joker: mitJoker,
            gewicht,
            ...(eigener ? { verein: eigener } : {}),
          };
          // Jeder wird nach den Tipps der ÜBRIGEN bepreist (`ohneUserId`) —
          // sonst bestrafte sich, wer den Favoriten tippt, fürs eigene
          // Mittippen. Das Verfahren bleibt für alle gleich.
          const snapFuerMich = teAktiv
            ? { ...sp.snap, correctScore: mischeRaster({
                raster: sp.snap.correctScore, tipps: gruppenTipps,
                cfg: teCfg, ohneUserId: PROFILE[pi].key,
              }) }
            : sp.snap;

          const punkte = scoreTip(tipp, actual, snapFuerMich, rules).total;
          saison[pi] += punkte;
          gewertet[pi] += 1;
          summeMit += punkte;
          summeOhne += scoreTip(tipp, actual, snapFuerMich, ohneMod).total;
        }
      });
      // Zwischenstand nach diesem Spieltag festhalten (für den Aufhol-Test).
      if (verlauf) {
        verlauf.push({
          matchday: md + 1,
          board: PROFILE.map((p, pi) => ({
            userId: p.key, name: p.label, total: saison[pi], gewertet: gewertet[pi],
          })),
        });
      }
    }
    // 🔴 Saisonsieger OHNE Aufholen, aber MIT Saisonform.
    //
    // Vorher kam er aus den rohen Punkten. Das war zweimal falsch, sobald die
    // Saisonform aktiv ist (Blindstelle 3.1, Punkt 4): der ausgewiesene Sieger
    // war nicht der, den die Regeln der Runde küren — und dieselbe Referenz
    // speist `aufholFlipQuote`, die Kennzahl schriebe also dem Aufhol-Bonus
    // zu, was die GEWICHTUNG getan hat.
    //
    // Reihenfolge wie in `scoreLeaderboardHistory`: erst Saisonform, dann
    // Aufholen. Ohne Saisonform bleibt `endstand` die rohe Summe — der
    // Normalfall verhält sich damit exakt wie bisher.
    const geformt = (verlauf && saisonformAktiv) ? applySaisonform(verlauf, rules) : verlauf;
    const endstand = geformt
      ? geformt[geformt.length - 1].board
      : PROFILE.map((p, pi) => ({ userId: p.key, total: saison[pi] }));
    const punkteVon = new Map(endstand.map((e) => [e.userId, e.total]));

    let best = 0;
    for (let pi = 1; pi < n; pi++) {
      if ((punkteVon.get(PROFILE[pi].key) ?? 0) > (punkteVon.get(PROFILE[best].key) ?? 0)) best = pi;
    }
    siege[best] += 1;
    for (let pi = 0; pi < n; pi++) punkteGesamt[pi] += punkteVon.get(PROFILE[pi].key) ?? 0;

    // Sieger MIT Aufholen: kippt der Bonus den Sieg weg vom stärksten Tipper?
    // Jeder Wechsel bedeutet, dass ein SCHWÄCHERER Tipper durch die Hilfe
    // gewinnt — genau die Grenze, an der gutes Tippen entwertet würde.
    if (geformt && aufholenAktiv) {
      const mitBonus = applyCatchup(geformt, rules);
      const board = mitBonus[mitBonus.length - 1].board;
      const siegerKey = board[0].userId;
      if (siegerKey !== PROFILE[best].key) aufholFlips += 1;
    }
  }

  const idxOf = (key) => PROFILE.findIndex((p) => p.key === key);
  const iKenner = idxOf("kenner"), iZocker = idxOf("zocker"), iFavorit = idxOf("favorit");

  const profile = PROFILE.map((p, i) => ({
    key: p.key, label: p.label, desc: p.desc,
    siegquote: +(siege[i] / seasons).toFixed(3),
    punkteSchnitt: Math.round(punkteGesamt[i] / seasons),
    ueberraschungsAnteil: ueberraschungen > 0 ? +(dabei[i] / ueberraschungen).toFixed(3) : 0,
  }));
  const gewinner = profile.reduce((a, b) => (b.siegquote > a.siegquote ? b : a));

  const zockerQuote = siege[iZocker] / seasons;
  // Aussagekräftiger als die Siegquote: Über viele Spiele kippt schon ein
  // winziger EV-Vorteil die Siegquote auf 100 %. Das Punkte-Verhältnis zeigt,
  // WIE GROSS der Vorteil ist. 1,0 = beide Strategien gleichauf.
  const punkteVerhaeltnis = punkteGesamt[iFavorit] > 0 ? punkteGesamt[iZocker] / punkteGesamt[iFavorit] : 1;
  const modifikatorAnteil = summeMit > 0 ? Math.max(0, (summeMit - summeOhne) / summeMit) : 0;

  // Maximalfall: bestes einzelnes Spiel — exakt getroffen, mit vollem Modifikator.
  // Nur realistisch erreichbare Endstände zählen (mind. 1 % Wahrscheinlichkeit),
  // sonst wäre der „Maximalfall" ein 5:5, das nie vorkommt.
  let maximalfall = 0;
  for (const [, def] of artOf) {
    for (const [real, p] of def.verteilung) {
      if (p < 0.01) continue;
      const exakt = { ...real, goals: leer, joker: true, gewicht: jokerGewicht };
      // Gegen die Derby-Fassung gerechnet: der Maximalfall ist der teuerste
      // denkbare Ausgang, und dazu gehört ein aktiver Derby-Faktor.
      maximalfall = Math.max(maximalfall, scoreTip(exakt, { ...real, playerGoals: null }, def.snapDerby, rules).total);
    }
  }

  // Aufhol-Effekt: Anteil der Saisons, in denen der Bonus den Sieg vom
  // stärksten Tipper wegnahm. 0 = Aufholen ändert die Rangspitze nie (nur
  // Kosmetik im Mittelfeld), hoch = gutes Tippen wird entwertet.
  const aufholFlipQuote = aufholenAktiv ? +(aufholFlips / seasons).toFixed(3) : 0;

  // Welche eingeschalteten Ebenen hat dieser Durchlauf gar nicht angefasst?
  const unvermessen = unvermesseneEbenen(rules);

  return {
    profile,
    gewinner: gewinner.key,
    kennerQuote: profile[iKenner].siegquote,
    zockerQuote: +zockerQuote.toFixed(3),
    punkteVerhaeltnis: +punkteVerhaeltnis.toFixed(2),
    modifikatorAnteil: +modifikatorAnteil.toFixed(3),
    aufholFlipQuote,
    maximalfall,
    // 🔴 Die Ampel weiß jetzt, was sie NICHT gesehen hat. `bewerten()` bleibt
    // die reine Zahl-zu-Urteil-Funktion; `ampelMitLuecken` legt darüber, was
    // die Messung selbst nicht abdeckt. Vorher stand hier ein „Ausgewogen"
    // auch für Regelwerke mit Duellen, Drehrad und Ereignissen — von denen
    // dieser Simulator kein einziges rechnet.
    ampel: ampelMitLuecken(bewerten({
      gewinner: gewinner.key,
      kennerQuote: profile[iKenner].siegquote,
      zockerQuote,
      favoritQuote: profile[iFavorit].siegquote,
      modifikatorAnteil,
      aufholFlipQuote,
    }), unvermessen),
    unvermessen,
  };
}

// Verdichtet die Kennzahlen zu einer Ampel mit Klartext — eine Aussage,
// kein Zahlenfriedhof. Schwellen bewusst konservativ: ein Tippspiel darf
// Überraschungen belohnen, aber Können muss sich über die Saison durchsetzen.
// Bewertet danach, WER in der simulierten Runde am häufigsten gewinnt.
// Zielbild: der KENNER — jemand, der gezielt wagt und dabei etwa jede vierte
// Überraschung erwischt. Gewinnt stattdessen der Dauerzocker, entscheidet
// Glück; gewinnt der reine Favoriten-Tipper, lohnt Mut überhaupt nicht.
export function bewerten({ gewinner, kennerQuote, zockerQuote, favoritQuote, modifikatorAnteil, aufholFlipQuote = 0 }) {
  // Aufhol-Mechanismus zuerst: kippt er zu oft den Sieg vom stärksten Tipper
  // weg, ist die Rangliste beliebig — das wiegt schwerer als jede Prämie.
  if (aufholFlipQuote >= 0.35) {
    return { stufe: "rot", titel: "Aufholen entwertet gutes Tippen",
      text: "Der Anschluss-Bonus dreht zu oft den Sieg weg vom besten Tipper. Stärke senken oder erst bei größerem Abstand greifen lassen." };
  }
  if (modifikatorAnteil >= 0.35) {
    return { stufe: "rot", titel: "Modifikatoren dominieren",
      text: "Über ein Drittel aller Punkte kommt aus Jokern/Gewichten statt aus guten Tipps. Faktor senken oder seltener vergeben." };
  }
  if (gewinner === "zocker" || zockerQuote >= 0.4) {
    return { stufe: "rot", titel: "Glück schlägt Können",
      text: "Wer stur auf Außenseiter setzt, gewinnt hier am häufigsten. Nähe-Cutoff anheben, Sieger-Boden abschalten oder Strafe für Fehltipps einführen." };
  }
  if (aufholFlipQuote >= 0.2) {
    return { stufe: "gelb", titel: "Aufholen wirkt kräftig",
      text: "Der Anschluss-Bonus dreht ab und zu den Sieg. Spannend fürs Feld — aber wenn Können klar vorn liegen soll, etwas zurücknehmen." };
  }
  if (gewinner === "favorit" || favoritQuote >= 0.5) {
    return { stufe: "gelb", titel: "Mut lohnt sich nicht",
      text: "Wer immer nur den Favoriten tippt, gewinnt hier am häufigsten — Überraschungen zahlen zu wenig." };
  }
  if (gewinner === "mutig") {
    return { stufe: "gelb", titel: "Etwas zu überraschungsfreudig",
      text: "Wildes Tippen setzt sich hier durch. Bewusst so gewollt? Sonst Überraschungs-Prämie leicht zurückdrehen." };
  }
  if (modifikatorAnteil >= 0.25) {
    return { stufe: "gelb", titel: "Modifikatoren wiegen schwer",
      text: "Ein guter Teil der Punkte kommt aus Jokern/Gewichten. Für den Nervenkitzel okay — aber im Blick behalten." };
  }
  return { stufe: "gruen", titel: "Ausgewogen",
    text: `Gewinnt am häufigsten: ${gewinner === "kenner" ? "wer gezielt wagt" : "der solide Tipper"} — Mut zahlt sich aus, ohne dass Glück allein entscheidet.` };
}
