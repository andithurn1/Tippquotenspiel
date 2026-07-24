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

import { scoreTip, maxJokerFactor } from "./engine";
import { archetypeSnapshots } from "./rulePreview";
import { ARCHETYPE_FREQ } from "./bundesligaStats";

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

// Führt die Simulation aus. Je Spieltag setzen beide Tipper (falls erlaubt)
// ihren Joker dorthin, wo er strategisch hingehört — der Könner auf sein
// sicherstes Spiel (Favorit), der Zocker auf seine Überraschungs-Wette
// (Außenseiter). Genau da entscheidet sich, ob das Regelwerk kippt.
export function simulateBalance(rules, { seasons = 100, matchdays = 17, perMatchday = 9, seed = 12345 } = {}) {
  const snaps = archetypeSnapshots();               // [{ key, snap, ... }]
  // Je Spielart einmal: Quoten-Verteilung + die beiden Tipp-Strategien.
  const artOf = new Map(snaps.map((s) => {
    const verteilung = impliedDistribution(s.snap);
    return [s.key, { snap: s.snap, verteilung, ...strategien(s.snap, verteilung) }];
  }));
  const pickArt = buildPicker(ARCHETYPE_FREQ);
  const jokerMax = maxJokerFactor(rules);
  const hatModifikator = jokerMax > 1;
  // Ohne Modifikatoren gerechnet — für den Anteil, den sie ausmachen.
  const ohneMod = { ...rules, joker: { ...(rules.joker || {}), enabled: false } };

  const rand = rng(seed);
  let zockerSiege = 0, koennerSiege = 0, gleich = 0;
  let summeMit = 0, summeOhne = 0;
  let punkteKoenner = 0, punkteZocker = 0;

  for (let s = 0; s < seasons; s++) {
    let koenner = 0, zocker = 0;
    for (let md = 0; md < matchdays; md++) {
      // Spiele dieses Spieltags ziehen
      const arten = [];
      for (let m = 0; m < perMatchday; m++) arten.push(pickArt(rand()));
      // Joker-Ziele bestimmen: Könner nimmt einen "favorit", Zocker einen "aussenseiter".
      const jokerKoenner = hatModifikator ? arten.indexOf("favorit") : -1;
      const jokerZocker = hatModifikator ? arten.indexOf("aussenseiter") : -1;

      arten.forEach((art, idx) => {
        const def = artOf.get(art);
        const snap = def.snap;
        const real = pickWeighted(def.verteilung, rand());
        const actual = { ...real, playerGoals: null };

        const tippK = { ...def.modal, goals: leer, joker: idx === jokerKoenner, gewicht: idx === jokerKoenner ? jokerMax : 1 };
        const tippZ = { ...def.upset, goals: leer, joker: idx === jokerZocker, gewicht: idx === jokerZocker ? jokerMax : 1 };

        const pK = scoreTip(tippK, actual, snap, rules).total;
        const pZ = scoreTip(tippZ, actual, snap, rules).total;
        koenner += pK; zocker += pZ;
        summeMit += pK + pZ;
        summeOhne += scoreTip(tippK, actual, snap, ohneMod).total
                   + scoreTip(tippZ, actual, snap, ohneMod).total;
      });
    }
    punkteKoenner += koenner; punkteZocker += zocker;
    if (zocker > koenner) zockerSiege += 1;
    else if (koenner > zocker) koennerSiege += 1;
    else gleich += 1;
  }

  const zockerQuote = zockerSiege / seasons;
  // Aussagekräftiger als die Siegquote: Über viele Spiele kippt schon ein
  // winziger EV-Vorteil die Siegquote auf 100 %. Das Punkte-Verhältnis zeigt,
  // WIE GROSS der Vorteil ist. 1,0 = beide Strategien gleichauf.
  const punkteVerhaeltnis = punkteKoenner > 0 ? punkteZocker / punkteKoenner : 1;
  const modifikatorAnteil = summeMit > 0 ? Math.max(0, (summeMit - summeOhne) / summeMit) : 0;

  // Maximalfall: bestes einzelnes Spiel — exakt getroffen, mit vollem Modifikator.
  // Nur realistisch erreichbare Endstände zählen (mind. 1 % Wahrscheinlichkeit),
  // sonst wäre der „Maximalfall" ein 5:5, das nie vorkommt.
  let maximalfall = 0;
  for (const [, def] of artOf) {
    for (const [real, p] of def.verteilung) {
      if (p < 0.01) continue;
      const exakt = { ...real, goals: leer, joker: true, gewicht: jokerMax };
      maximalfall = Math.max(maximalfall, scoreTip(exakt, { ...real, playerGoals: null }, def.snap, rules).total);
    }
  }

  return {
    zockerQuote: +zockerQuote.toFixed(3),
    koennerQuote: +(koennerSiege / seasons).toFixed(3),
    unentschieden: +(gleich / seasons).toFixed(3),
    punkteVerhaeltnis: +punkteVerhaeltnis.toFixed(2),
    modifikatorAnteil: +modifikatorAnteil.toFixed(3),
    maximalfall,
    ampel: bewerten(punkteVerhaeltnis, modifikatorAnteil),
  };
}

// Verdichtet die Kennzahlen zu einer Ampel mit Klartext — eine Aussage,
// kein Zahlenfriedhof. Schwellen bewusst konservativ: ein Tippspiel darf
// Überraschungen belohnen, aber Können muss sich über die Saison durchsetzen.
// Bewertet primär über das Punkte-Verhältnis (Zocker/Könner): 1,0 = beide
// Strategien gleichauf, darunter lohnt gutes Tippen mehr, darüber das
// Außenseiter-Setzen. Ein Tippspiel darf Überraschungen belohnen — aber wenn
// stures Longshot-Setzen dauerhaft mehr einbringt, ist es kein Tippspiel mehr.
export function bewerten(punkteVerhaeltnis, modifikatorAnteil) {
  if (punkteVerhaeltnis >= 1.5) {
    return { stufe: "rot", titel: "Glück schlägt Können",
      text: "Wer stur auf Außenseiter setzt, holt hier deutlich mehr Punkte als ein guter Tipper. Nähe-Cutoff anheben, Sieger-Boden abschalten oder Strafe für Fehltipps einführen." };
  }
  if (modifikatorAnteil >= 0.35) {
    return { stufe: "rot", titel: "Modifikatoren dominieren",
      text: "Über ein Drittel aller Punkte kommt aus Jokern/Gewichten statt aus guten Tipps. Faktor senken oder seltener vergeben." };
  }
  if (punkteVerhaeltnis >= 1.2 || modifikatorAnteil >= 0.25) {
    return { stufe: "gelb", titel: "Sehr überraschungsfreudig",
      text: "Außenseiter-Setzen lohnt sich hier spürbar mehr als solides Tippen. Bewusst so gewollt? Dann passt es — sonst etwas zurückdrehen." };
  }
  if (punkteVerhaeltnis <= 0.7) {
    return { stufe: "gelb", titel: "Sehr favoritenlastig",
      text: "Überraschungen zahlen sich kaum aus — die Runde belohnt fast nur das Tippen der Favoriten." };
  }
  return { stufe: "gruen", titel: "Ausgewogen",
    text: "Überraschungen zahlen sich aus, aber gute Tipps setzen sich über die Saison durch." };
}
