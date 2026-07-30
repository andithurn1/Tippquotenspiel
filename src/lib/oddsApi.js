// ============================================================
//  ECHTE QUOTEN — Adapter von einer Wett-API auf unser Snapshot-Format
//
//  Das Problem: günstige Quoten-APIs (The Odds API, API-Football …) liefern
//  zuverlässig nur 1X2 (Heimsieg / Remis / Auswärtssieg). Unser Spiel braucht
//  aber das ganze Raster: exakte Ergebnisse, Team-Tore, Torschützen.
//
//  Die Lösung ist ein HYBRID:
//    1) aus den echten 1X2-Quoten die Buchmacher-Marge herausrechnen
//       → ehrliche Wahrscheinlichkeiten pH / pD / pA
//    2) daraus die TOR-ERWARTUNGEN beider Teams schätzen (Poisson-Fit)
//    3) mit `buildSnapshot()` daraus dasselbe vollständige, in sich stimmige
//       Quoten-Raster erzeugen wie bisher
//
//  Ergebnis: Die Grundquoten sind echt und marktnah, der Rest bleibt
//  konsistent — und die Engine merkt keinen Unterschied.
//
//  Reine Funktionen: kein fetch, kein Key, kein I/O. Das Holen der Daten
//  macht die serverseitige Route (src/app/api/odds/route.js), damit der
//  API-Schlüssel nie ins Frontend gerät.
// ============================================================

import { buildSnapshot, dixonColes } from "./oddsGenerator";
import { teileAuf } from "./kader";

// ── Niedrig-Ergebnis-Korrektur für ECHTE Quoten ─────────────
// Warum sie hier eingeschaltet ist und im Generator nicht: hereinkommende
// Marktquoten sind eine harte Vorgabe, die das Modell treffen MUSS. Fehlen ihm
// Remis, verschafft es sie sich über den Torschnitt — gemessen an elf echten
// Bundesliga-Spielen ergab das 2,43 erwartete Tore bei ausgeglichenen und 4,14
// bei einseitigen Partien. Beides ist unrealistisch, und beides verbiegt das
// Exakt-Raster, von dem die Nähe-Wertung lebt.
//
// ⚠️ STEHT AUF 0 — und das ist eine Korrektur einer eigenen Fehlmessung.
//
// Der Weg dorthin, weil die Lehre mehr wert ist als der Wert: Der Fit aus 1X2
// allein liefert Torschnitte zwischen 2,43 (ausgeglichene Spiele) und 4,14
// (Bayern gegen Stuttgart). Das sah nach einem Modellfehler aus, und ich habe
// ρ so kalibriert, dass der MITTELWERT den langjährigen Bundesliga-Torschnitt
// (~3,1) trifft — bei ρ = −0,06.
//
// Dann kam die Gegenprobe an der ECHTEN Über/Unter-Linie des Marktes, und die
// hat die Annahme umgeworfen: Bayern–Stuttgart hat einen Markt-Torschnitt von
// **4,07**. Der unkorrigierte Fit lag mit 4,14 also praktisch richtig, und die
// Kalibrierung auf 3,1 hätte ihn auf 4,44 verschlechtert. Falsch war nicht das
// Modell, falsch war mein Anker: ein LIGA-Mittelwert sagt nichts über ein
// EINZELNES Spiel.
//
// Der echte, verbleibende Fehler liegt woanders und ist kleiner: bei
// ausgeglichenen Spielen fittet das Modell im Schnitt 0,3 Tore ZU NIEDRIG
// (2,43 gegen 2,90 laut Markt), bei einseitigen trifft es (+0,07 / +0,04).
//
// **Die Lösung ist nicht, ρ besser zu raten, sondern den Torschnitt gar nicht
// mehr zu schätzen:** die API liefert `totals` (Über/Unter) von elf
// Buchmachern. Damit ist λ_gesamt eine MESSUNG statt einer Annahme, und ρ
// bleibt nur noch für das Feintuning der Remis-Quote übrig. Das ist der
// nächste Schritt, siehe `design/roadmap.md`.
//
// Die Mechanik unten bleibt deshalb stehen und ist getestet — sie wird
// gebraucht, sobald der Torschnitt aus dem Markt kommt. Bis dahin ist sie AUS,
// weil ein geratener Wert schlechter ist als keiner.
export const RHO = 0;

// ── 1) Marge herausrechnen ──────────────────────────────────
// Buchmacher-Quoten ergeben in Summe >100 % („overround"/Vig). Für eine
// ehrliche Schätzung normieren wir auf 100 %.
export function impliedProbabilities({ home, draw, away }) {
  const q = [home, draw, away].map((o) => (Number(o) > 1 ? 1 / Number(o) : 0));
  const summe = q[0] + q[1] + q[2];
  if (!(summe > 0)) return null;
  return { home: q[0] / summe, draw: q[1] / summe, away: q[2] / summe, overround: summe };
}

// ── 2) Tor-Erwartungen schätzen ─────────────────────────────
function poissonPmf(lambda, k) {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

// Die ganze Poisson-Reihe auf einmal — einmal rechnen statt für jede Zelle neu.
// Rein eine Beschleunigung: dieselben Zahlen wie `poissonPmf` je Element. Sie
// wird gebraucht, weil der gebundene Fit unten zwei Parameter absucht statt
// einem und dabei ein Vielfaches an Auswertungen kostet.
function pmfReihe(lambda, n) {
  const v = new Array(n);
  v[0] = Math.exp(-lambda);
  for (let k = 1; k < n; k++) v[k] = v[k - 1] * lambda / k;
  return v;
}

// Welche 1X2-Wahrscheinlichkeiten ergäben sich aus diesen Tor-Erwartungen?
export function outcomeProbs(lamH, lamA, tail = 12, rho = 0) {
  const ph = pmfReihe(lamH, tail);
  const pa = pmfReihe(lamA, tail);
  let pH = 0, pD = 0, pA = 0;
  for (let h = 0; h < tail; h++) {
    for (let a = 0; a < tail; a++) {
      const p = ph[h] * pa[a] * dixonColes(h, a, lamH, lamA, rho);
      if (h > a) pH += p; else if (h < a) pA += p; else pD += p;
    }
  }
  return { home: pH, draw: pD, away: pA };
}

// Sucht das Paar (lamH, lamA), dessen 1X2-Verteilung am besten zu den
// gemessenen Wahrscheinlichkeiten passt. Zweistufig: erst grob, dann fein um
// den besten Treffer herum — schnell genug für Hunderte Spiele.
export function fitLambdas(probs, { min = 0.15, max = 4.0, rho = 0 } = {}) {
  if (!probs) return null;
  const fehler = (lh, la) => {
    const p = outcomeProbs(lh, la, 12, rho);
    return (p.home - probs.home) ** 2 + (p.draw - probs.draw) ** 2 + (p.away - probs.away) ** 2;
  };
  const suche = (loH, hiH, loA, hiA, schritt) => {
    let best = { lamH: loH, lamA: loA, err: Infinity };
    for (let lh = loH; lh <= hiH + 1e-9; lh += schritt) {
      for (let la = loA; la <= hiA + 1e-9; la += schritt) {
        const err = fehler(lh, la);
        if (err < best.err) best = { lamH: +lh.toFixed(3), lamA: +la.toFixed(3), err };
      }
    }
    return best;
  };
  const grob = suche(min, max, min, max, 0.1);
  const fein = suche(
    Math.max(min, grob.lamH - 0.1), Math.min(max, grob.lamH + 0.1),
    Math.max(min, grob.lamA - 0.1), Math.min(max, grob.lamA + 0.1),
    0.01
  );
  return { lamH: fein.lamH, lamA: fein.lamA, rho, fehler: fein.err };
}

// ── Gebundener Fit: der Torschnitt kommt aus dem Markt ───────
// Der Fit oben hat zwei Freiheiten (λ_H, λ_A) und zwei Vorgaben (die 1X2 sind
// nach Abzug der Marge zwei unabhängige Zahlen). Er trifft sie dadurch fast
// exakt — und der Torschnitt fällt nebenbei mit ab, ohne dass ihn irgendetwas
// prüfen würde. Genau dort sitzt der verbleibende Fehler: gemessen liegt er bei
// AUSGEGLICHENEN Spielen rund 0,5 Tore zu niedrig (Freiburg–Bremen 2,43 gegen
// 2,96 laut Markt), bei einseitigen trifft er (Bayern–Stuttgart 4,14 gegen
// 4,07). Ursache ist die Unabhängigkeits-Annahme: sie liefert in
// ausgeglichenen Spielen zu wenig Remis, und das Modell verschafft sie sich
// über einen zu kleinen Torschnitt.
//
// Ist der Torschnitt dagegen VORGEGEBEN (aus dem Markt), bleiben genau zwei
// Freiheiten übrig: wie er sich auf beide Mannschaften aufteilt, und ρ. Damit
// ist ρ nicht mehr geraten, sondern **die einzige Größe, die übrig bleibt, wenn
// 1X2 UND Torschnitt gleichzeitig stimmen sollen** — eine Messung je Spiel
// statt einer Konstante für alle. Das ist die Auflösung der ρ-Fehlmessung ganz
// oben: falsch war nie die Mechanik, falsch war der Anker.
//
// `total` = erwartete Gesamt-Tore. Woher sie kommt, ist dieser Funktion egal
// (echtes Ergebnis-Raster oder der `totals`-Markt) — sie ist eine Vorgabe.
export function fitLambdasMitTotal(probs, total, { rhoMax = 0.45 } = {}) {
  if (!probs || !(total > 0.3)) return null;

  // ρ darf die Dixon-Coles-Faktoren nicht negativ machen, sonst entstehen
  // negative Wahrscheinlichkeiten. Die Schranken hängen an den λ selbst.
  const grenzen = (lamH, lamA) => ({
    lo: Math.max(-1 / lamH, -1 / lamA, -rhoMax) + 1e-6,
    hi: Math.min(1 / (lamH * lamA), 1, rhoMax) - 1e-6,
  });
  const fehler = (anteil, rho) => {
    const lamH = anteil * total, lamA = (1 - anteil) * total;
    const p = outcomeProbs(lamH, lamA, 12, rho);
    return (p.home - probs.home) ** 2 + (p.draw - probs.draw) ** 2 + (p.away - probs.away) ** 2;
  };
  const suche = (aLo, aHi, rLo, rHi, schritt, rSchritt) => {
    let best = { anteil: aLo, rho: 0, err: Infinity };
    for (let a = aLo; a <= aHi + 1e-9; a += schritt) {
      const g = grenzen(a * total, (1 - a) * total);
      for (let r = Math.max(rLo, g.lo); r <= Math.min(rHi, g.hi) + 1e-9; r += rSchritt) {
        const err = fehler(a, r);
        if (err < best.err) best = { anteil: +a.toFixed(4), rho: +r.toFixed(4), err };
      }
    }
    return best;
  };
  const grob = suche(0.1, 0.9, -rhoMax, rhoMax, 0.02, 0.02);
  const fein = suche(
    Math.max(0.05, grob.anteil - 0.02), Math.min(0.95, grob.anteil + 0.02),
    grob.rho - 0.02, grob.rho + 0.02, 0.002, 0.002
  );
  return {
    lamH: +(fein.anteil * total).toFixed(3),
    lamA: +((1 - fein.anteil) * total).toFixed(3),
    rho: fein.rho,
    fehler: fein.err,
  };
}

// ── Torschnitt aus der Über/Unter-Linie ─────────────────────
// Die direkteste Messung, die der Markt hergibt, und die billigste: `totals`
// kommt in DERSELBEN Liga-Anfrage wie 1X2 (1 Credit mehr für die ganze Liga),
// während das Ergebnis-Buch 1 Credit JE SPIEL kostet. Sie ist außerdem für
// Bundesliga-Spiele Wochen vor Anpfiff da, das Ergebnis-Buch nicht.
//
// `linien` = [{ linie: 2.5, ueber: 1.85, unter: 1.95 }, …]. Je Linie wird die
// Marge herausgerechnet (zwei Ausgänge, also sauber bestimmbar — anders als
// beim Ergebnis-Buch, siehe `longshotK`), dann wird das λ gesucht, das alle
// Linien zusammen am besten erklärt.
//
// Die Summe zweier unabhängiger Poisson-Größen ist wieder Poisson — der
// Torschnitt lässt sich deshalb direkt bestimmen, ohne die Aufteilung auf
// beide Mannschaften zu kennen. Die Dixon-Coles-Korrektur verschiebt die
// Gesamtmasse nicht (die vier Faktoren heben sich exakt auf), sie darf hier
// also außen vor bleiben.
export function torschnittAusTotals(linien, { min = 0.5, max = 8.0 } = {}) {
  const gueltig = (linien || [])
    .map((l) => ({ linie: Number(l.linie), ueber: Number(l.ueber), unter: Number(l.unter) }))
    .filter((l) => l.linie > 0 && l.ueber > 1 && l.unter > 1);
  if (!gueltig.length) return null;

  // P(Gesamt > linie) unter Poisson(lambda). Die Linien sind halbzahlig
  // (2.5, 3.5 …), ein Gleichstand ist also ausgeschlossen.
  const pUeber = (lambda, linie) => {
    const bis = Math.floor(linie);
    let kum = 0, term = Math.exp(-lambda);
    for (let k = 0; k <= bis; k++) {
      kum += term;
      term *= lambda / (k + 1);
    }
    return 1 - kum;
  };
  const ziele = gueltig.map((l) => {
    const qU = 1 / l.ueber, qA = 1 / l.unter;
    return { linie: l.linie, p: qU / (qU + qA) };   // Marge raus
  });
  const fehler = (lambda) =>
    ziele.reduce((s, z) => s + (pUeber(lambda, z.linie) - z.p) ** 2, 0);

  const suche = (lo, hi, schritt) => {
    let best = { lam: lo, err: Infinity };
    for (let l = lo; l <= hi + 1e-9; l += schritt) {
      const err = fehler(l);
      if (err < best.err) best = { lam: +l.toFixed(3), err };
    }
    return best;
  };
  const grob = suche(min, max, 0.05);
  const fein = suche(Math.max(min, grob.lam - 0.05), Math.min(max, grob.lam + 0.05), 0.005);
  return +fein.lam.toFixed(3);
}

// Die `totals`-Ausgänge eines Anbieter-Events zu Linien zusammenfassen.
// Wie bei 1X2 der MEDIAN je Linie über alle Buchmacher — robuster gegen einen
// einzelnen Ausreißer als der erste Beste.
export function totalsAusEvent(event) {
  const proLinie = new Map();
  for (const b of event?.bookmakers || []) {
    for (const m of b.markets || []) {
      if (m.key !== "totals" && m.key !== "alternate_totals") continue;
      for (const o of m.outcomes || []) {
        const linie = Number(o.point);
        const preis = Number(o.price);
        if (!(linie > 0) || !(preis > 1)) continue;
        if (!proLinie.has(linie)) proLinie.set(linie, { ueber: [], unter: [] });
        const seite = String(o.name || "").toLowerCase();
        if (seite === "over") proLinie.get(linie).ueber.push(preis);
        else if (seite === "under") proLinie.get(linie).unter.push(preis);
      }
    }
  }
  const linien = [];
  for (const [linie, s] of proLinie) {
    const ueber = median(s.ueber), unter = median(s.unter);
    // Nur beidseitig bepreiste Linien: aus einer einzelnen Seite lässt sich
    // die Marge nicht herausrechnen, und ohne das ist die Zahl wertlos.
    if (ueber && unter) linien.push({ linie, ueber, unter });
  }
  return linien.sort((a, b) => a.linie - b.linie);
}

// Erwartete Gesamt-Tore aus einem echten Ergebnis-Buch. `k` ist die Eichung
// gegen den Longshot-Bias (siehe `longshotK`) — OHNE sie ist die Zahl deutlich
// zu hoch, weil die Marge auf den torreichen Außenseitern liegt: naiv 4,74 für
// Bayern–Stuttgart, korrigiert 4,28, echte Über/Unter-Linie 4,07.
export function torschnittAusRaster(markt, k = 1) {
  const roh = markteintraege(markt);
  if (roh.length < 10) return null;
  const gew = roh.map((z) => (k === 1 ? z.p : Math.pow(z.p, k)));
  const summe = gew.reduce((s, x) => s + x, 0);
  return +roh.reduce((s, z, i) => s + (z.h + z.a) * gew[i] / summe, 0).toFixed(3);
}

// ── 3) Kompletter Snapshot aus echten 1X2-Quoten ────────────
// `odds` = { home, draw, away } wie vom Anbieter geliefert.
// Der zurückgegebene Snapshot hat exakt die Form der Mock-Quelle, trägt aber
// zusätzlich `quelle` und `marge` — damit in der Abrechnung nachvollziehbar
// bleibt, woher die Zahlen kamen.
// ── Echtes Ergebnis-Raster einsetzen ────────────────────────
// `markt` = { "2:1": 9.5, … } echte Marktpreise je Endstand.
//
// ⚠️ Die Preise dürfen NICHT roh übernommen werden. Ergebnis-Wetten tragen eine
// viel größere Buchmacher-Marge als 1X2: gemessen **65 %** gegenüber 7,7 %.
// Roh eingesetzt zahlte ein echtes Raster also rund die Hälfte eines
// abgeleiteten — zwei Spiele derselben Runde wären unterschiedlich viel wert,
// je nachdem ob ein US-Buchmacher den Markt gestellt hat. Das wäre ein
// Fairness-Bruch, und zwar ein unsichtbarer.
//
// Deshalb: Marge herausrechnen (über ALLE Ergebnisse, die das Buch führt, auch
// die jenseits unseres 0–5-Rasters), dann UNSERE Marge wieder aufschlagen. Was
// bleibt, ist die echte Wahrscheinlichkeitsverteilung des Marktes auf unserem
// Preisniveau — der eigentliche Gewinn, denn genau daran hängt die
// Nähe-Wertung.
//
// ⚠️ **Die Höhe der Marge herauszurechnen genügt nicht — ihre SCHIEFE muss
// mit.** (Gemessen 2026-07-29, an den neun gespeicherten Bundesliga-Spielen.)
// Ein Buchmacher verteilt 65 % Overround nicht gleichmäßig: er lädt sie auf die
// Außenseiter. Wer stumpf durch die Summe teilt, übernimmt diese Schieflage
// unverändert und hält sie für eine Wahrscheinlichkeitsverteilung.
//
// Nachweisbar ist das ohne jede zusätzliche Abfrage, weil wir einen zweiten,
// viel saubereren Markt für DASSELBE Spiel schon in der Hand halten: die
// 1X2-Quoten (7,7 % statt 65 % Marge). Rechnet man das naiv normierte Raster zu
// Heimsieg / Remis / Auswärtssieg zusammen, MUSS dieselbe Verteilung
// herauskommen. Tut es nicht — die Abweichung lag bei **2,4 bis 5,7
// Prozentpunkten**, in allen neun Spielen mit demselben Vorzeichen.
//
// Korrigiert wird mit dem Potenz-Verfahren (`p ~ (1/o)^k`), dem üblichen Weg
// gegen den Favourite-Longshot-Bias. Entscheidend ist, WOHER k kommt: es wird
// für JEDES SPIEL EINZELN an dessen eigenem 1X2-Markt geeicht, nie als
// Liga-Mittel gesetzt. Das ist genau die Lehre aus der ρ-Fehlmessung weiter
// oben — ein Mittelwert sagt nichts über ein einzelnes Spiel. Gemessen: k
// zwischen 1,18 und 1,34, Restfehler danach 0,0 bis 1,9 pp.
//
// Was das in Preisen heißt (Bayern–Stuttgart, k = 1,32): die naive Normierung
// zahlte für die WAHRSCHEINLICHEN Ergebnisse 11–30 % zu viel (2:1 zu 14,57
// statt 11,17) und für die unwahrscheinlichen zu wenig. Da reale Endstände
// meistens die wahrscheinlichen sind, war das ein stiller Aufschlag auf jedes
// Spiel mit echtem Raster — gegenüber jedem Spiel ohne.
export function longshotK(markt, ziel, { min = 0.5, max = 2.0 } = {}) {
  if (!markt || !ziel) return 1;
  const roh = markteintraege(markt);
  if (roh.length < 10) return 1;

  const fehlerBei = (k) => {
    let pH = 0, pD = 0, pA = 0, summe = 0;
    const q = roh.map((z) => Math.pow(z.p, k));
    for (const x of q) summe += x;
    roh.forEach((z, i) => {
      const p = q[i] / summe;
      if (z.h > z.a) pH += p; else if (z.h < z.a) pA += p; else pD += p;
    });
    return (pH - ziel.home) ** 2 + (pD - ziel.draw) ** 2 + (pA - ziel.away) ** 2;
  };
  const suche = (lo, hi, schritt) => {
    let best = { k: lo, err: Infinity };
    for (let k = lo; k <= hi + 1e-9; k += schritt) {
      const err = fehlerBei(k);
      if (err < best.err) best = { k: +k.toFixed(3), err };
    }
    return best;
  };
  const grob = suche(min, max, 0.01);
  const fein = suche(Math.max(min, grob.k - 0.01), Math.min(max, grob.k + 0.01), 0.001);
  return fein.k;
}

function markteintraege(markt) {
  return Object.entries(markt)
    .map(([k, preis]) => {
      const t = String(k).match(/^(\d+):(\d+)$/);
      return t && Number(preis) > 1 ? { h: +t[1], a: +t[2], p: 1 / Number(preis) } : null;
    })
    .filter(Boolean);
}

export function rasterAusMarkt(markt, { overround = 1.07, cap = 200, grid = 6, k = 1 } = {}) {
  if (!markt || typeof markt !== "object") return null;
  const roh = markteintraege(markt);
  if (roh.length < 10) return null;   // ein halbes Buch ist keine Verteilung

  // k = 1 ist exakt die frühere, naive Normierung — ohne Eichung ändert sich
  // also nichts, und ein fehlendes 1X2 verschlechtert nie etwas.
  const gew = roh.map((z) => (k === 1 ? z.p : Math.pow(z.p, k)));
  const summe = gew.reduce((s, x) => s + x, 0);
  const raster = Array.from({ length: grid }, () => Array(grid).fill(cap));
  let getroffen = 0;
  roh.forEach((z, i) => {
    if (z.h >= grid || z.a >= grid) return;   // 6+ Tore: außerhalb des Rasters
    const p = gew[i] / summe;
    raster[z.h][z.a] = Math.min(cap, Math.max(1.01, +(1 / (p * overround)).toFixed(2)));
    getroffen++;
  });
  // Lücken im Buch würden als Höchstquote stehenbleiben und wären dann die
  // bestbezahlte Wette überhaupt. Lieber gar kein echtes Raster.
  return getroffen >= grid * grid * 0.8 ? raster : null;
}

// ── Echte Torschützen einsetzen ─────────────────────────────
// `torschuetzen` = { "Talles Magno": 2.15, … }, die ANYTIME-Quoten des Marktes.
//
// Zwei Dinge fehlen dort, und beide werden hier ergänzt:
//
// 1. **Der Verein.** Der Markt nennt ihn nicht; `kader.js` leitet ihn aus
//    mehreren Spielen ab und reicht ihn als `zuordnung` herein. Wer noch nicht
//    zugeordnet ist, fällt raus — lieber ein Spieler zu wenig als einer bei der
//    falschen Mannschaft.
//
// 2. **Der Doppelpack.** Den Markt „2 oder mehr Tore" gibt es nicht (geprüft).
//    Abgeleitet wird er über dieselbe Poisson-Annahme wie bei den erzeugten
//    Kadern: aus P(≥1) folgt λ = −ln(1−p), daraus P(≥2) = 1 − e^−λ(1+λ).
//
// ⚠️ Die ANYTIME-Quote bleibt dabei EXAKT die des Marktes. Die Marge wird
// herausgerechnet und danach unverändert wieder aufgeschlagen — die Annahme
// über ihre Höhe wirkt sich also ausschließlich auf den Doppelpack aus, nie auf
// den Preis, den der Spieler tatsächlich sieht. (Die Gegenseite „No" liefert
// der Anbieter nicht, sonst wäre die Marge exakt bestimmbar.)
const SCHUETZEN_MARGE = 1.15;   // dieselbe wie bei den erzeugten Kadern

export function spielerAusMarkt({ torschuetzen, home, away, zuordnung = {}, cap = 200, minProTeam = 2 }) {
  if (!torschuetzen || typeof torschuetzen !== "object") return null;
  const namen = Object.keys(torschuetzen);
  const geteilt = teileAuf({ home, away, spieler: namen, zuordnung });

  const seite = (liste) => {
    const out = {};
    for (const name of liste) {
      const preis = Number(torschuetzen[name]);
      if (!(preis > 1)) continue;
      const pRoh = 1 / preis;
      const p = Math.min(0.95, pRoh / SCHUETZEN_MARGE);     // Marge raus
      const lam = -Math.log(1 - p);
      const pDoppel = Math.max(1 - Math.exp(-lam) - lam * Math.exp(-lam), 0.0005);
      out[name] = {
        // Zurück auf denselben Preis, mit dem er hereinkam.
        anytime: +preis.toFixed(2),
        double: Math.min(cap, Math.max(1.01, +(1 / (pDoppel * SCHUETZEN_MARGE)).toFixed(2))),
      };
    }
    return out;
  };

  const heim = seite(geteilt.home);
  const gast = seite(geteilt.away);
  // Eine Mannschaft ohne wählbare Schützen wäre im Tipp-Screen eine leere
  // Fläche. Solange die Zuordnung noch nicht weit genug ist, bleibt lieber der
  // ganze erzeugte Kader stehen als eine halb echte Liste.
  if (Object.keys(heim).length < minProTeam || Object.keys(gast).length < minProTeam) return null;
  return { home: heim, away: gast, unbekannt: geteilt.unbekannt };
}

export function snapshotFromOdds({
  matchId, home, away, kickoff, odds, cap = 200, correctScore = null, namensPool = null,
  torschuetzen = null, kaderZuordnung = null, total = null,
}) {
  const probs = impliedProbabilities(odds || {});
  if (!probs) return null;

  // Der Torschnitt zuerst — er entscheidet, welcher Fit läuft.
  // Reihenfolge: eine echte Über/Unter-Linie schlägt das Ergebnis-Buch, beide
  // schlagen die Schätzung. `total` darf von außen kommen (`totals`-Markt),
  // sonst wird es aus dem echten Raster gelesen, wo eines vorliegt.
  const rasterK = longshotK(correctScore, probs);
  const torschnitt = Number(total) > 0.3
    ? Number(total)
    : (correctScore ? torschnittAusRaster(correctScore, rasterK) : null);

  const fit = torschnitt
    ? fitLambdasMitTotal(probs, torschnitt)
    : fitLambdas(probs, { rho: RHO });
  if (!fit) return null;

  const snap = buildSnapshot({
    matchId, home, away, kickoff,
    lamH: fit.lamH, lamA: fit.lamA,
    // Die Marge des Anbieters übernehmen: so bleiben unsere abgeleiteten
    // Quoten im selben Preisniveau wie die echten.
    overround: Math.max(1.0, probs.overround),
    cap, namensPool,
    // Fit und Raster MÜSSEN dasselbe Modell benutzen. Mit unterschiedlichem
    // `rho` gäbe das Raster die Marktquoten nicht mehr her, aus denen es
    // geschätzt wurde — ein stiller Widerspruch mitten in der Wertung.
    // Beim gebundenen Fit ist `rho` gemessen statt gesetzt; es MUSS deshalb
    // von dort kommen und nicht mehr aus der Konstanten.
    rho: fit.rho ?? RHO,
  });

  // Die ECHTEN 1X2-Quoten gewinnen — sie sind Marktpreis, keine Schätzung.
  snap.winner = {
    home: Number(odds.home), draw: Number(odds.draw), away: Number(odds.away),
  };
  // Dasselbe für das Ergebnis-Raster, wo der Markt es hergibt. Es ist die
  // Grundlage der Nähe-Wertung — eine Messung ist dort mehr wert als die beste
  // Schätzung. Fehlt es, bleibt das abgeleitete Raster stehen.
  // Geeicht am 1X2-Markt DIESES Spiels (siehe `longshotK`) — der zweite,
  // sauberere Markt, den wir für dieselbe Begegnung ohnehin schon haben.
  const echtesRaster = rasterAusMarkt(correctScore, {
    overround: Math.max(1.0, probs.overround), cap, k: rasterK,
  });
  if (echtesRaster) snap.correctScore = echtesRaster;

  // Und dasselbe für die Torschützen. Erst hier werden aus erfundenen Namen
  // echte — der letzte Markt, der noch simuliert war.
  const echteSpieler = spielerAusMarkt({
    torschuetzen, home, away, zuordnung: kaderZuordnung ?? {}, cap,
  });
  if (echteSpieler) {
    snap.players = { home: echteSpieler.home, away: echteSpieler.away };
    // Wer im Markt stand, aber noch keinem Verein zugeordnet ist. Sichtbar
    // festgehalten, damit der Abstand zur vollständigen Zuordnung messbar
    // bleibt statt still zu verschwinden.
    if (echteSpieler.unbekannt.length) snap.spielerOffen = echteSpieler.unbekannt.length;
  }

  snap.quelle = "api";
  snap.rasterQuelle = echtesRaster ? "markt" : "abgeleitet";
  // Sichtbar festhalten, wie stark das Buch schiefgezogen war. Eine Korrektur,
  // die man später nicht mehr nachvollziehen kann, ist eine Behauptung.
  if (echtesRaster) snap.rasterK = rasterK;
  // Dasselbe für den Torschnitt: gemessen oder geschätzt ist ein Unterschied,
  // den man später sehen können muss.
  snap.torschnitt = +(fit.lamH + fit.lamA).toFixed(3);
  snap.torschnittQuelle = Number(total) > 0.3 ? "totals"
    : (torschnitt ? "raster" : "geschaetzt");
  if (fit.rho) snap.rho = fit.rho;
  snap.spielerQuelle = echteSpieler ? "markt" : "erfunden";
  snap.marge = +probs.overround.toFixed(4);
  return snap;
}

// ── Anbieter-Formate ────────────────────────────────────────
// The Odds API liefert je Spiel mehrere Buchmacher. Wir nehmen den MEDIAN je
// Ausgang — robuster gegen einen einzelnen Ausreißer als der erste Beste.
function median(werte) {
  const s = werte.filter((v) => Number(v) > 1).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  // Auf zwei Stellen runden: bei gerader Anzahl entsteht sonst aus 4,35 und
  // 4,50 die Quote 4,425000000000001, und die steht so in der Oberfläche.
  return s.length % 2 ? s[m] : +((s[m - 1] + s[m]) / 2).toFixed(2);
}

// Ein Spiel im Format von The Odds API → { matchId, home, away, kickoff, odds }.
// Gibt null zurück, wenn keine verwertbaren 1X2-Quoten dabei sind.
export function parseTheOddsApiEvent(event, { idPrefix = "api" } = {}) {
  if (!event?.home_team || !event?.away_team) return null;
  const heim = [], remis = [], gast = [];
  for (const b of event.bookmakers || []) {
    const markt = (b.markets || []).find((m) => m.key === "h2h");
    if (!markt) continue;
    for (const o of markt.outcomes || []) {
      if (o.name === event.home_team) heim.push(Number(o.price));
      else if (o.name === event.away_team) gast.push(Number(o.price));
      else remis.push(Number(o.price)); // "Draw"
    }
  }
  const odds = { home: median(heim), draw: median(remis), away: median(gast) };
  if (!odds.home || !odds.draw || !odds.away) return null;
  return {
    matchId: `${idPrefix}-${event.id}`,
    home: event.home_team,
    away: event.away_team,
    kickoff: event.commence_time,
    odds,
  };
}

// Bequemer Gesamtweg: Roh-Antwort der API → fertige Snapshots.
export function snapshotsFromTheOddsApi(events = [], { idPrefix = "api", cap = 200 } = {}) {
  const out = [];
  for (const e of events) {
    const parsed = parseTheOddsApiEvent(e, { idPrefix });
    if (!parsed) continue;
    // Die Über/Unter-Linie mitnehmen, wenn der Abruf sie enthält. Ohne diese
    // Zeile blieb der Torschnitt geschätzt, obwohl die Messung im selben
    // Ergebnis lag — die Route hätte schlechtere Snapshots geliefert als der
    // Offline-Weg über `npm run odds:holen`.
    const total = torschnittAusTotals(totalsAusEvent(e));
    const snap = snapshotFromOdds({ ...parsed, cap, total });
    if (snap) out.push({ ...parsed, total: total ?? undefined, snapshot: snap });
  }
  return out;
}
