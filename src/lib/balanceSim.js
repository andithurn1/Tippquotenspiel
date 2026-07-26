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

import { scoreTip, maxTotalModifier } from "./engine";
import { archetypeSnapshots } from "./rulePreview";
import { ARCHETYPE_FREQ } from "./bundesligaStats";
import { applyCatchup } from "./catchup";

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
export const PROFILE = [
  { key: "favorit", label: "Favoriten-Tipper", desc: "tippt immer den Favoriten",
    aussenseiter: () => false, fanBrille: false },
  { key: "solide", label: "Solide", desc: "fast immer Favorit, selten mal mutig",
    aussenseiter: (u, r) => r() < 0.12, fanBrille: true },
  { key: "kenner", label: "Kenner", desc: "wagt gezielt — erwischt ~jede 4. Überraschung",
    aussenseiter: (u, r) => r() < (u ? 0.28 : 0.07), fanBrille: true },
  { key: "mutig", label: "Mutig", desc: "etwa jedes zweite Spiel Außenseiter",
    aussenseiter: (u, r) => r() < 0.45, fanBrille: true },
  { key: "zocker", label: "Zocker", desc: "setzt stur auf Außenseiter",
    aussenseiter: () => true, fanBrille: false },
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

// Führt die Simulation aus. Je Spieltag setzen beide Tipper (falls erlaubt)
// ihren Joker dorthin, wo er strategisch hingehört — der Könner auf sein
// sicherstes Spiel (Favorit), der Zocker auf seine Überraschungs-Wette
// (Außenseiter). Genau da entscheidet sich, ob das Regelwerk kippt.
export function simulateBalance(rules, { seasons = 100, matchdays = 17, perMatchday = 9, seed = 12345 } = {}) {
  const snaps = archetypeSnapshots();               // [{ key, snap, ... }]
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
  let aufholFlips = 0;   // Saisons, in denen der Bonus den Sieger geändert hat

  for (let s = 0; s < seasons; s++) {
    const saison = new Array(n).fill(0);
    // Kumulativer Stand je Spieltag — Grundlage, um den Aufhol-Bonus zu prüfen
    // (er hängt am Stand VOR dem jeweiligen Spieltag).
    const verlauf = aufholenAktiv ? [] : null;
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
        return p.aussenseiter(sp.ueberraschung, rand);
      }));
      // Joker: jeder setzt ihn auf sein erstes Außenseiter-Spiel (dort ist am
      // meisten zu holen), sonst aufs erste Spiel.
      const jokerIdx = wahl.map((w) => {
        if (!hatModifikator) return -1;
        const i = w.indexOf(true);
        return i >= 0 ? i : 0;
      });

      spiele.forEach((sp, idx) => {
        if (sp.ueberraschung) ueberraschungen += 1;
        const actual = { ...sp.real, playerGoals: null };
        for (let pi = 0; pi < n; pi++) {
          const aufAussenseiter = wahl[pi][idx];
          if (aufAussenseiter && sp.ueberraschung) dabei[pi] += 1;
          const basis = aufAussenseiter ? sp.def.upset : sp.def.modal;
          const mitJoker = idx === jokerIdx[pi];
          // `verein` nur setzen, wenn der eigene Verein wirklich mitspielt —
          // daran erkennt die Engine den Heimatbonus (sie kennt selbst keine
          // Vereinsnamen, siehe Architektur-Regel 3).
          const eigener = idx === eigenesSpiel[pi]
            ? (eigenerIstFavorit[pi] ? sp.snap.home : sp.snap.away)
            : undefined;
          const tipp = {
            ...basis, goals: leer, joker: mitJoker,
            gewicht: mitJoker ? jokerMax : 1,
            ...(eigener ? { verein: eigener } : {}),
          };
          const punkte = scoreTip(tipp, actual, sp.snap, rules).total;
          saison[pi] += punkte;
          summeMit += punkte;
          summeOhne += scoreTip(tipp, actual, sp.snap, ohneMod).total;
        }
      });
      // Zwischenstand nach diesem Spieltag festhalten (für den Aufhol-Test).
      if (verlauf) {
        verlauf.push({
          matchday: md + 1,
          board: PROFILE.map((p, pi) => ({ userId: p.key, name: p.label, total: saison[pi] })),
        });
      }
    }
    // Saisonsieger OHNE Aufholen (nach reinen Punkten).
    let best = 0;
    for (let pi = 1; pi < n; pi++) if (saison[pi] > saison[best]) best = pi;
    siege[best] += 1;
    for (let pi = 0; pi < n; pi++) punkteGesamt[pi] += saison[pi];

    // Sieger MIT Aufholen: kippt der Bonus den Sieg weg vom stärksten Tipper?
    // Jeder Wechsel bedeutet, dass ein SCHWÄCHERER Tipper durch die Hilfe
    // gewinnt — genau die Grenze, an der gutes Tippen entwertet würde.
    if (verlauf) {
      const mitBonus = applyCatchup(verlauf, rules);
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
      const exakt = { ...real, goals: leer, joker: true, gewicht: jokerMax };
      // Gegen die Derby-Fassung gerechnet: der Maximalfall ist der teuerste
      // denkbare Ausgang, und dazu gehört ein aktiver Derby-Faktor.
      maximalfall = Math.max(maximalfall, scoreTip(exakt, { ...real, playerGoals: null }, def.snapDerby, rules).total);
    }
  }

  // Aufhol-Effekt: Anteil der Saisons, in denen der Bonus den Sieg vom
  // stärksten Tipper wegnahm. 0 = Aufholen ändert die Rangspitze nie (nur
  // Kosmetik im Mittelfeld), hoch = gutes Tippen wird entwertet.
  const aufholFlipQuote = aufholenAktiv ? +(aufholFlips / seasons).toFixed(3) : 0;

  return {
    profile,
    gewinner: gewinner.key,
    kennerQuote: profile[iKenner].siegquote,
    zockerQuote: +zockerQuote.toFixed(3),
    punkteVerhaeltnis: +punkteVerhaeltnis.toFixed(2),
    modifikatorAnteil: +modifikatorAnteil.toFixed(3),
    aufholFlipQuote,
    maximalfall,
    ampel: bewerten({
      gewinner: gewinner.key,
      kennerQuote: profile[iKenner].siegquote,
      zockerQuote,
      favoritQuote: profile[iFavorit].siegquote,
      modifikatorAnteil,
      aufholFlipQuote,
    }),
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
