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
export function rasterAusMarkt(markt, { overround = 1.07, cap = 200, grid = 6 } = {}) {
  if (!markt || typeof markt !== "object") return null;
  const roh = Object.entries(markt)
    .map(([k, preis]) => {
      const t = String(k).match(/^(\d+):(\d+)$/);
      return t && Number(preis) > 1 ? { h: +t[1], a: +t[2], p: 1 / Number(preis) } : null;
    })
    .filter(Boolean);
  if (roh.length < 10) return null;   // ein halbes Buch ist keine Verteilung

  const summe = roh.reduce((s, z) => s + z.p, 0);
  const raster = Array.from({ length: grid }, () => Array(grid).fill(cap));
  let getroffen = 0;
  for (const z of roh) {
    if (z.h >= grid || z.a >= grid) continue;   // 6+ Tore: außerhalb des Rasters
    const p = z.p / summe;
    raster[z.h][z.a] = Math.min(cap, Math.max(1.01, +(1 / (p * overround)).toFixed(2)));
    getroffen++;
  }
  // Lücken im Buch würden als Höchstquote stehenbleiben und wären dann die
  // bestbezahlte Wette überhaupt. Lieber gar kein echtes Raster.
  return getroffen >= grid * grid * 0.8 ? raster : null;
}

export function snapshotFromOdds({
  matchId, home, away, kickoff, odds, cap = 200, correctScore = null, namensPool = null,
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
  const echtesRaster = rasterAusMarkt(correctScore, {
    overround: Math.max(1.0, probs.overround), cap,
  });
  if (echtesRaster) snap.correctScore = echtesRaster;

  snap.quelle = "api";
  snap.rasterQuelle = echtesRaster ? "markt" : "abgeleitet";
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
