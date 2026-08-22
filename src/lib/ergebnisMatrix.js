// ============================================================
//  ERGEBNIS-MATRIX — jeder Endstand mit seinen Punkten, direkt zum Antippen
//
//  Andis Ansage aus `Quotentippen.pptx` (TI1–TI3, 21.08.2026): eine Matrix
//  der möglichen Endstände, in der **an jedem Feld steht, was es bringt** —
//  statt einer Zahleneingabe, bei der man das Ergebnis erst raten und dann
//  ablesen muss.
//
//  ── 🔴 Warum die Matrix ASYMMETRISCH ist ──
//  Der naheliegende Weg wäre ein Quadrat (0…5 je Seite). Nachgemessen ist das
//  falsch: bei einem klaren Favoriten braucht die schwache Seite über 5 Tore
//  **0,00 %** der Wahrscheinlichkeit, die starke aber **12,95 %**. Ein festes
//  Quadrat verschenkt also auf der einen Seite Felder an Unmögliches und
//  schneidet auf der anderen Wahrscheinlichkeit ab. Beide Seiten werden
//  deshalb EINZELN so weit aufgezogen, bis die gewünschte Abdeckung steht —
//  gemessen 99 % mit 27 statt 36 Feldern.
//
//  ── ⚠️ Was hier NICHT gerechnet wird ──
//  Die Punkte kommen aus `scoreTip`, nie aus einer eigenen Formel (Runden-
//  Schicht, CLAUDE.md: ein Screen fragt, er rechnet nicht nach). Und die
//  Matrix zeigt die Punkte OHNE Torschützen: ein Tipp auf 4:0 mit zwei
//  gesetzten Schützen ergibt bei 1:1 keine sinnvolle Aussage über die
//  Schützen, und eine Zahl, die je nach Feld mal mit und mal ohne sie
//  gerechnet wäre, ist schlimmer als eine, die konsequent eine Ebene zeigt.
//  Die Schützen stehen getrennt darunter (`projectTip.pointsOhneSchuetzen`
//  ist dieselbe Trennung, nur andersherum).
//
//  ── ⚠️ Grenze der Daten, gemessen statt vermutet ──
//  Das Quoten-Raster ist 6×6 (0…5 Tore je Seite, `rasterAusMarkt` mit
//  `grid: 6`). Höhere Endstände HABEN keine Quote — die Matrix kann sie nicht
//  anbieten, egal welche Stufe gewählt ist.
//
//  Andis Folie nennt die Stufen „automatisch · automatisch+ · 3 · 4 · 5 · 6 ·
//  8 · 10". Gebaut sind **automatisch · 3 · 4 · 5**, und beides fehlt aus
//  demselben Grund:
//
//   · **6 · 8 · 10** gibt es nicht, weil es für 6:2 keine Quote gibt.
//   · **automatisch +** ist gestrichen, weil es nichts anderes zeigen KÖNNTE.
//     Nachgemessen über 300 Spiele des Katalogs: `automatisch` trimmt 299 mal
//     (Ø 28,6 statt 36 Felder, 212 davon ungleich zugeschnitten) und landet
//     dabei fast immer schon bei 5 oder 6 je Seite — eine großzügigere Stufe
//     stößt sofort an die Rasterkante und wäre von „5" nicht zu unterscheiden.
//     Eine Stufe, die immer dasselbe zeigt, ist keine Stufe (Baukasten-
//     Grundsatz: eine Einstellung, die ins Leere läuft, ist kein Baukastenteil).
//
//  🔴 Beides kommt zurück, sobald die Quotenquelle ein größeres Raster liefert
//  — `rasterAusMarkt` nimmt `grid` bereits als Parameter, und `rasterMasse`
//  liest die Größe ab, statt sie zu kennen. Der Weg steht also offen.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { scoreTip, DEFAULT_RULES } from "./engine";

// Die Stufen aus Andis Folie, soweit die Daten sie hergeben (siehe Kopf).
// `auto` zieht jede Seite einzeln auf, die Zahlen sind feste Quadrate — beides
// hat seinen Platz: wer eine feste Größe wählt, will Verlässlichkeit über alle
// Spiele hinweg statt eines Rasters, das je Spiel anders aussieht.
export const MATRIX_STUFEN = [
  { key: "auto", label: "automatisch", abdeckung: 0.97, desc: "Jede Seite reicht so weit, bis 97 % ihrer Tore drin sind." },
  { key: "3", label: "3", feste: 3, desc: "Festes Quadrat 0–3." },
  { key: "4", label: "4", feste: 4, desc: "Festes Quadrat 0–4." },
  { key: "5", label: "5", feste: 5, desc: "Festes Quadrat 0–5 — das volle Raster." },
];

export const DEFAULT_MATRIX_STUFE = "auto";

export const stufeVon = (key) => MATRIX_STUFEN.find((s) => s.key === key) ?? MATRIX_STUFEN[0];

// Wie groß ist das Raster im Snapshot? Nicht geraten, sondern abgelesen —
// wächst die Quotenquelle, wächst die Matrix mit.
export function rasterMasse(snap) {
  const cs = snap?.correctScore;
  if (!Array.isArray(cs) || !cs.length) return { maxHeim: 0, maxGast: 0 };
  const maxHeim = cs.length - 1;
  const maxGast = Math.max(...cs.map((zeile) => (Array.isArray(zeile) ? zeile.length : 0))) - 1;
  return { maxHeim, maxGast: Math.max(0, maxGast) };
}

// Wahrscheinlichkeit je Endstand aus der Quote (1/q), auf Summe 1 normiert.
// ⚠️ Normiert, weil das Raster eine Marge trägt: die rohen Kehrwerte summieren
// sich auf über 1, und eine „Abdeckung von 99 %" wäre sonst eine andere Zahl,
// je nachdem wie fett das Buch ist.
export function wahrscheinlichkeiten(snap) {
  const cs = snap?.correctScore;
  const { maxHeim, maxGast } = rasterMasse(snap);
  const roh = [];
  let summe = 0;
  for (let h = 0; h <= maxHeim; h++) {
    roh[h] = [];
    for (let a = 0; a <= maxGast; a++) {
      const q = Number(cs?.[h]?.[a]);
      const p = Number.isFinite(q) && q > 0 ? 1 / q : 0;
      roh[h][a] = p;
      summe += p;
    }
  }
  if (!summe) return roh;
  return roh.map((zeile) => zeile.map((p) => p / summe));
}

// 🔴 Die eigentliche Entscheidung: wie weit muss jede Seite gehen?
//
// Beide Seiten werden GETRENNT aufgezogen — erst die Randverteilung je Seite
// bilden, dann von 0 an aufsummieren, bis die Abdeckung steht. Genau das ist
// der Unterschied zum Quadrat: beim klaren Favoriten endet die schwache Seite
// früh und die starke spät.
export function matrixMasse(snap, stufeKey = DEFAULT_MATRIX_STUFE) {
  const grenzen = rasterMasse(snap);
  const st = stufeVon(stufeKey);
  if (st.feste != null) {
    return {
      maxHeim: Math.min(st.feste, grenzen.maxHeim),
      maxGast: Math.min(st.feste, grenzen.maxGast),
      abgedeckt: abdeckungVon(snap, Math.min(st.feste, grenzen.maxHeim), Math.min(st.feste, grenzen.maxGast)),
      begrenztVomRaster: st.feste > grenzen.maxHeim || st.feste > grenzen.maxGast,
    };
  }

  const p = wahrscheinlichkeiten(snap);
  const randHeim = p.map((zeile) => zeile.reduce((s, x) => s + x, 0));
  const randGast = [];
  for (let a = 0; a <= grenzen.maxGast; a++) {
    randGast[a] = p.reduce((s, zeile) => s + (zeile[a] ?? 0), 0);
  }
  // 🔴 Das Ziel gilt JE SEITE, nicht für die Fläche — und das ist eine
  // gemessene Entscheidung, keine Bequemlichkeit.
  //
  // Die erste Fassung nahm die Wurzel (`sqrt(0,97)` je Seite ≈ 98,5 %), weil
  // die Fläche näherungsweise das Produkt beider Seiten ist. Sauber gerechnet,
  // aber nachgemessen über 300 Spiele des Katalogs: **null Mal** wurde
  // getrimmt, null Mal ungleich zugeschnitten. Der Grund liegt an den Daten:
  // das Raster ist auf 0…5 normiert, die letzte Stufe bringt die Summe also
  // immer auf 100 % — und 98,5 % je Seite erreicht fast nie jemand vorher.
  //
  // Eine Stufe „automatisch", die immer das volle Raster zeigt, ist keine
  // Stufe, sondern Dekoration — genau die Einstellung, die ins Leere läuft und
  // die der Baukasten-Grundsatz ausschließt. Deshalb gilt die Zahl je Seite;
  // die ANGEZEIGTE Abdeckung wird ohnehin gemessen (`abdeckungVon`) und nicht
  // versprochen, der Spieler sieht also immer die Wahrheit über sein Raster.
  const ziel = st.abdeckung;
  const bis = (rand, max) => {
    let s = 0;
    for (let i = 0; i <= max; i++) {
      s += rand[i] ?? 0;
      if (s >= ziel) return i;
    }
    return max;
  };
  // Mindestens 0–2 je Seite: eine Matrix, die nur 0:0 und 1:0 anbietet, ist keine.
  const maxHeim = Math.min(grenzen.maxHeim, Math.max(2, bis(randHeim, grenzen.maxHeim)));
  const maxGast = Math.min(grenzen.maxGast, Math.max(2, bis(randGast, grenzen.maxGast)));
  return {
    maxHeim, maxGast,
    abgedeckt: abdeckungVon(snap, maxHeim, maxGast),
    begrenztVomRaster: false,
  };
}

// Wie viel Wahrscheinlichkeit steckt in dem gewählten Ausschnitt?
export function abdeckungVon(snap, maxHeim, maxGast) {
  const p = wahrscheinlichkeiten(snap);
  let s = 0;
  for (let h = 0; h <= maxHeim; h++) {
    for (let a = 0; a <= maxGast; a++) s += p[h]?.[a] ?? 0;
  }
  return +s.toFixed(4);
}

// Die Felder der Matrix, jedes mit seinen Punkten.
//
// ⚠️ `tip` liefert nur die WEITEREN Tipp-Bestandteile (Joker/Gewicht) — der
// Endstand jedes Feldes ist der des Feldes selbst. Sonst stünde in jedem Feld
// die Auszahlung des aktuell getippten Ergebnisses.
export function matrixFelder(snap, rules = DEFAULT_RULES, masse = null, tip = null) {
  if (!snap) return [];
  const m = masse ?? matrixMasse(snap);
  const p = wahrscheinlichkeiten(snap);
  const out = [];
  for (let h = 0; h <= m.maxHeim; h++) {
    for (let a = 0; a <= m.maxGast; a++) {
      const quote = Number(snap.correctScore?.[h]?.[a]);
      // Der Tipp AUF dieses Feld, wenn genau dieses Feld eintritt: die
      // ehrliche Frage „was bringt mir dieser Endstand?". Ohne Torschützen
      // (Kopfkommentar) — deshalb `goals` bewusst leer.
      const eigen = { home: h, away: a, goals: { home: [], away: [] },
        joker: tip?.joker, gewicht: tip?.gewicht, einsatz: tip?.einsatz };
      const s = scoreTip(eigen, { home: h, away: a, playerGoals: null }, snap, rules);
      out.push({
        home: h, away: a,
        quote: Number.isFinite(quote) ? quote : null,
        wahrscheinlichkeit: +(p[h]?.[a] ?? 0).toFixed(4),
        punkte: s.total,
      });
    }
  }
  return out;
}

// Ein Satz für die Oberfläche: was der gewählte Ausschnitt abdeckt und was er
// kostet. Dieselbe Rolle wie `anteilHinweis()` bei den Wettbewerbs-Gewichten —
// eine Prozentzahl allein sagt niemandem, ob sie gut ist.
export function beschreibeMatrix(snap, stufeKey = DEFAULT_MATRIX_STUFE) {
  const m = matrixMasse(snap, stufeKey);
  const felder = (m.maxHeim + 1) * (m.maxGast + 1);
  const prozent = Math.round(m.abgedeckt * 100);
  const teile = [`${m.maxHeim + 1}×${m.maxGast + 1} Felder, ${prozent} % aller Ausgänge`];
  if (m.maxHeim !== m.maxGast) {
    teile.push(`ungleich zugeschnitten — die eine Seite trifft häufiger hoch als die andere`);
  }
  if (m.begrenztVomRaster) {
    teile.push("größer geht nicht: für höhere Endstände liefert die Quotenquelle keine Quote");
  }
  return { text: teile.join(" · "), felder, prozent };
}
