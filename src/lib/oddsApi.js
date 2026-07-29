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

// Welche 1X2-Wahrscheinlichkeiten ergäben sich aus diesen Tor-Erwartungen?
export function outcomeProbs(lamH, lamA, tail = 12, rho = 0) {
  let pH = 0, pD = 0, pA = 0;
  for (let h = 0; h < tail; h++) {
    const ph = poissonPmf(lamH, h);
    for (let a = 0; a < tail; a++) {
      const p = ph * poissonPmf(lamA, a) * dixonColes(h, a, lamH, lamA, rho);
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
  return { lamH: fein.lamH, lamA: fein.lamA, fehler: fein.err };
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
  torschuetzen = null, kaderZuordnung = null,
}) {
  const probs = impliedProbabilities(odds || {});
  if (!probs) return null;
  const fit = fitLambdas(probs, { rho: RHO });
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
    rho: RHO,
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
  const rasterK = longshotK(correctScore, probs);
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
    const snap = snapshotFromOdds({ ...parsed, cap });
    if (snap) out.push({ ...parsed, snapshot: snap });
  }
  return out;
}
