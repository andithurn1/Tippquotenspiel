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
//  Das ERZEUGTE Raster ist seit 22.08.2026 **9×9** (0…8 Tore je Seite). Aus
//  dem MARKT kommen kleinere — kein Buchmacher quotiert 81 Endstände —, und
//  dort füllt das Modell die Lücken (`mischeRaster` in `oddsApi.js`). Was auch
//  dann fehlt, schreibt `randquoten.js` fort. Die Matrix liest die Größe ab
//  (`rasterMasse`), statt sie zu kennen: wächst die Quelle, wächst sie mit.
//
//  Andis Folie nennt die Stufen „automatisch · automatisch+ · 3 · 4 · 5 · 6 ·
//  8 · 10". Gebaut sind **automatisch · 3 · 4 · 5 · 6 · 8**:
//
//   · **6 und 8** gibt es, seit das erzeugte Raster 9×9 ist (22.08.2026).
//     Vorher endete es bei 5, und für ein 6:2 gab es schlicht keine Quote.
//   · **10** fehlt weiter — dafür müsste das Raster 11×11 werden. Über acht
//     Tore je Seite kommt im Katalog nicht vor; die Stufe wäre eine Fläche aus
//     Feldern, die nie eintreten.
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
import { MAX_TIPP } from "./nearResults";
import { ergebnisQuote } from "./randquoten";

// Die Stufen aus Andis Folie, soweit die Daten sie hergeben (siehe Kopf).
// `auto` zieht jede Seite einzeln auf, die Zahlen sind feste Quadrate — beides
// hat seinen Platz: wer eine feste Größe wählt, will Verlässlichkeit über alle
// Spiele hinweg statt eines Rasters, das je Spiel anders aussieht.
export const MATRIX_STUFEN = [
  { key: "auto", label: "automatisch", abdeckung: 0.97, desc: "Jede Seite reicht so weit, bis 97 % ihrer Tore drin sind." },
  { key: "3", label: "3", feste: 3, desc: "Festes Quadrat 0–3." },
  { key: "4", label: "4", feste: 4, desc: "Festes Quadrat 0–4." },
  { key: "5", label: "5", feste: 5, desc: "Festes Quadrat 0–5." },
  { key: "6", label: "6", feste: 6, desc: "Festes Quadrat 0–6." },
  { key: "8", label: "8", feste: 8, desc: "Festes Quadrat 0–8 — das volle Raster." },
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
// `ohneDeckel: true` lässt Zellen auf der Höchstquote weg — siehe die
// Begründung in `matrixMasse`. Zuschnitt UND Abdeckung müssen dieselbe
// Grundlage benutzen, sonst widerspricht die Prozentzahl dem Raster daneben.
export function wahrscheinlichkeiten(snap, { ohneDeckel = false } = {}) {
  const cs = snap?.correctScore;
  const { maxHeim, maxGast } = rasterMasse(snap);
  const hoechste = ohneDeckel
    ? Math.max(...(cs ?? []).flat().map(Number).filter((q) => Number.isFinite(q) && q > 0), 0)
    : Infinity;
  const roh = [];
  let summe = 0;
  for (let h = 0; h <= maxHeim; h++) {
    roh[h] = [];
    for (let a = 0; a <= maxGast; a++) {
      const q = Number(cs?.[h]?.[a]);
      const zaehlt = Number.isFinite(q) && q > 0 && q < hoechste;
      const p = zaehlt ? 1 / q : 0;
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
// 🔴 `bisTipp` (Andi, 25.08.2026): das Raster darf über die Quotenquelle
// hinausgehen, bis zur Grenze des Steppers (0…9).
//
// Der Anlass ist sein Befund: „einmal das Grid direkt wo man direkt sieht
// welches Ergebnis wie viel auszahlt wenns direkt getroffen wird" — und
// gemessen reichte genau dieses Raster nur bis 0…4/0…5, während sich 0…9
// tippen lässt. Wer 6:0 tippen wollte, fand die Zelle nicht.
//
// ⚠️ Es bleibt eine EINSTELLUNG und wird nicht die Vorgabe. Der Grund steht
// oben bei `ohneDeckel`: außerhalb des Rasters schreibt `randquoten.js` fort,
// und fortgeschriebene Zellen laufen alle in den Deckel. Ein Raster, in dem
// die halbe Fläche auf demselben Höchstwert steht, ist als ORIENTIERUNG
// wertlos — auch wenn jede einzelne Zahl stimmt. Wer es trotzdem sehen will,
// weiß dann, wonach er sucht.
export function matrixMasse(snap, stufeKey = DEFAULT_MATRIX_STUFE, { bisTipp = false } = {}) {
  const rohGrenzen = rasterMasse(snap);
  // Bei „voll" zählt der Stepper als Grenze, nicht die Quotenquelle.
  const grenzen = bisTipp
    ? { maxHeim: Math.max(rohGrenzen.maxHeim, MAX_TIPP), maxGast: Math.max(rohGrenzen.maxGast, MAX_TIPP) }
    : rohGrenzen;
  const st = stufeVon(stufeKey);
  if (st.feste != null) {
    return {
      maxHeim: Math.min(st.feste, grenzen.maxHeim),
      maxGast: Math.min(st.feste, grenzen.maxGast),
      abgedeckt: abdeckungVon(snap, Math.min(st.feste, grenzen.maxHeim), Math.min(st.feste, grenzen.maxGast)),
      begrenztVomRaster: !bisTipp && (st.feste > grenzen.maxHeim || st.feste > grenzen.maxGast),
      ueberRaster: bisTipp && (grenzen.maxHeim > rohGrenzen.maxHeim || grenzen.maxGast > rohGrenzen.maxGast),
    };
  }

  // 🔴 Zellen AM DECKEL zählen beim Zuschneiden nicht mit.
  //
  // Gemessen an FC Bayern – VfB Stuttgart im 9×9-Raster: **48 von 81 Zellen**
  // stehen auf der Höchstquote (200), und die tragen zusammen **19,3 %** der
  // normierten Masse. Das ist keine Wahrscheinlichkeit, sondern die Kappung —
  // ein 8:8 ist nicht „einmal in 200 Spielen", es ist praktisch unmöglich und
  // steht nur deshalb bei 200, weil die Quote dort abgeschnitten wird.
  //
  // Ohne diese Zeile jagt der automatische Zuschnitt diesem Phantom hinterher
  // und zeigt fast das volle Raster (gemessen: Ø 80,8 von 81 Feldern). Mit ihr
  // schneidet er wieder dort, wo die Quoten etwas aussagen.
  //
  // ⚠️ Das ist eine ANZEIGE-Entscheidung. Was ein Deckel-Ergebnis WERTEN soll,
  // ist eine andere Frage und gehört in die Endphase (siehe
  // design/randquoten.md, Abschnitt „Was der Deckel anrichtet").
  const p = wahrscheinlichkeiten(snap, { ohneDeckel: true });
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
  // 🔴 `bisTipp` schlägt die automatische Beschneidung, und das war der Fund
  // beim Prüfen im Browser: die Einstellung „volles Raster" wirkte in der
  // Stufe „automatisch" GAR NICHT. Der Grund ist unscheinbar — die
  // Randverteilung `randHeim` ist so lang wie das RASTER, nicht wie die neue
  // Grenze. Jenseits davon steht `undefined`, die Summe wächst nicht mehr,
  // und `bis()` gibt die Rasterkante zurück. Die Einstellung sah aus wie
  // gesetzt und tat nichts.
  //
  // Wer „bis 9:9" einschaltet, will 9:9 sehen — nicht das, was 97 % der
  // Wahrscheinlichkeit abdeckt. Der automatische Zuschnitt ist genau die
  // Frage, die er damit abwählt.
  const maxHeim = bisTipp
    ? grenzen.maxHeim
    : Math.min(grenzen.maxHeim, Math.max(2, bis(randHeim, grenzen.maxHeim)));
  const maxGast = bisTipp
    ? grenzen.maxGast
    : Math.min(grenzen.maxGast, Math.max(2, bis(randGast, grenzen.maxGast)));
  return {
    maxHeim, maxGast,
    abgedeckt: abdeckungVon(snap, maxHeim, maxGast),
    begrenztVomRaster: false,
    ueberRaster: bisTipp && (maxHeim > rohGrenzen.maxHeim || maxGast > rohGrenzen.maxGast),
  };
}

// Wie viel Wahrscheinlichkeit steckt in dem gewählten Ausschnitt?
export function abdeckungVon(snap, maxHeim, maxGast) {
  // ⚠️ Dieselbe Grundlage wie der Zuschnitt: OHNE die Zellen am Deckel. Sonst
  // stünde neben einem Raster, das je Seite 97 % abdeckt, eine Zahl wie 78 % —
  // und der Widerspruch wäre nicht auflösbar, weil beide Zahlen stimmen, nur
  // über verschiedene Grundgesamtheiten.
  const p = wahrscheinlichkeiten(snap, { ohneDeckel: true });
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
      // ⚠️ Über `ergebnisQuote`, nicht direkt aus dem Raster: außerhalb
      // schreibt `randquoten.js` fort, und die WERTUNG zahlt das auch. Ein
      // leeres Feld neben einer Punktzahl wäre die zweite Wahrheit, die heute
      // früh schon in der Tippabgabe stand.
      const eq = ergebnisQuote(snap, h, a);
      const quote = Number(eq.quote);
      // Der Tipp AUF dieses Feld, wenn genau dieses Feld eintritt: die
      // ehrliche Frage „was bringt mir dieser Endstand?". Ohne Torschützen
      // (Kopfkommentar) — deshalb `goals` bewusst leer.
      const eigen = { home: h, away: a, goals: { home: [], away: [] },
        joker: tip?.joker, gewicht: tip?.gewicht, einsatz: tip?.einsatz };
      const s = scoreTip(eigen, { home: h, away: a, playerGoals: null }, snap, rules);
      out.push({
        home: h, away: a,
        quote: Number.isFinite(quote) ? quote : null,
        // Fortgeschrieben statt quotiert? Wird drangeschrieben (Leitplanke 1
        // in `randquoten.js`) — eine Schätzung, die wie ein Marktpreis
        // aussieht, ist schlimmer als keine.
        geschaetzt: eq.geschaetzt === true,
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
export function beschreibeMatrix(snap, stufeKey = DEFAULT_MATRIX_STUFE, optionen = {}) {
  const m = matrixMasse(snap, stufeKey, optionen);
  const felder = (m.maxHeim + 1) * (m.maxGast + 1);
  // ⚠️ NICHT `Math.round`: 99,6 % rundete auf „100 % aller Ausgänge" auf —
  // und behauptete damit Vollständigkeit, die das Raster nicht hat. Genau das,
  // was der Nutzer beim Griff nach einem hohen Endstand widerlegt. 100 steht
  // erst, wenn auch die erste Nachkommastelle voll ist.
  const prozent = m.abgedeckt >= 0.9995 ? 100 : Math.min(99, Math.round(m.abgedeckt * 100));
  const teile = [`${m.maxHeim + 1}×${m.maxGast + 1} Felder, ${prozent} % aller Ausgänge`];
  if (m.maxHeim !== m.maxGast) {
    teile.push(`ungleich zugeschnitten — die eine Seite trifft häufiger hoch als die andere`);
  }
  if (m.begrenztVomRaster) {
    // ⚠️ Der Satz hier hieß bis zum 25.08.2026 „für höhere Endstände liefert
    // die Quotenquelle keine Quote". Das stimmt seit `randquoten.js`
    // (22.08.2026) nicht mehr: höhere Endstände bekommen eine
    // fortgeschriebene Quote und ZAHLEN auch. Das Raster endet hier, die
    // Wertung nicht — und ein Nutzer, der das Gegenteil gelesen hat, tippt
    // hoch und hält die Auszahlung für einen Fehler.
    teile.push("größer geht nicht: darüber endet das Quoten-Raster — tippen lässt sich höher, die Quote wird dann geschätzt");
  }
  // 🔴 Bei „volles Raster" (Andi, 25.08.2026) steht die Erweiterung DRAN.
  // Ohne den Satz sähen fortgeschriebene Zellen wie Marktpreise aus, und die
  // vielen gleichen Höchstwerte am Rand wie ein Fehler statt wie der Deckel.
  if (m.ueberRaster) {
    teile.push("über dem Quoten-Raster geschätzt — die hohen Endstände laufen alle in denselben Deckel");
  }
  return { text: teile.join(" · "), felder, prozent };
}
