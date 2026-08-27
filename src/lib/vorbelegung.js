// ============================================================
//  WOMIT DIE TIPPABGABE STARTET
//
//  🔴 Andi, 26.08.2026, wörtlich: „mach auch noch bei der anzeigeeinstellung
//  bzw account einstellung mit dem unterpunkt anzeigeeinstellung, dass bei
//  jeder tippabgabe als option zur verfügung steht immer die Ergebnisse als
//  bereits eingestellte Auswahl zu haben die am Wahrscheinlichsten ist … Also
//  bei bayern st. pauli beginnt nicht bei 0:0 sondern direkt bei 3:1 oder eben
//  das aus den quoten ablesbare wahrscheinlichste ergebnis"
//
//  ── Eine ANZEIGE-Einstellung, keine Regel der Runde ──
//  Womit mein Stepper anfängt, geht den Admin nichts an, und zwei Spieler
//  derselben Runde dürfen es verschieden halten. Dieselbe Trennung wie bei
//  `rasterWeite` und den Vergleichs-Mitspielern (`prefs.js`).
//
//  ⚠️ Und es ist ausdrücklich KEINE Wertungs-Frage: der Startwert ändert
//  nichts an Punkten, Quoten oder Fairness. Wer ihn nicht anfasst, tippt
//  genau wie vorher.
//
//  ── ⚠️ Warum hier KEINE Sperre mitgelesen wird ──
//  Die erste Fassung fragte die Favoriten-Sperre, weil die auch Endstände
//  zuhalten konnte. Seit Andis Entscheidung vom 26.08.2026 („ich will keinen
//  block ermöglichen bei ergebnissen, nur Torschützen") gibt es beim Endstand
//  nichts mehr zu umgehen — der wahrscheinlichste ist immer wählbar.
//
//  Reine Funktionen, UI-frei.
// ============================================================

export const VORBELEGUNGEN = ["fest", "wahrscheinlich"];

// ⚠️ „fest" bleibt die Vorgabe, und zwar nicht aus Bequemlichkeit: ein
// vorgeschlagener Endstand ist ein VORSCHLAG, und wer schnell tippt, nimmt
// ihn. Das ist Andis Sache zu wollen — aber nicht etwas, das man jedem
// stillschweigend einschaltet. Er hat ausdrücklich „als option" gesagt.
export const DEFAULT_VORBELEGUNG = "fest";

// Der bisherige Startwert des Steppers, unverändert. Er steht hier, damit es
// ihn nur einmal gibt: vorher war die 2 und die 1 in `Tippabgabe.jsx`
// eingetippt und nirgends erklärt.
export const FESTER_START = { home: 2, away: 1 };

export const VORBELEGUNG_LABEL = {
  fest: "Immer 2:1",
  wahrscheinlich: "Wahrscheinlichstes Ergebnis",
};
export const VORBELEGUNG_HINWEIS = {
  fest: "Jedes Spiel beginnt beim selben Stand. Die Vorgabe.",
  wahrscheinlich: "Der Stepper startet beim Endstand mit der niedrigsten Quote — bei Bayern gegen St. Pauli also eher 3:1 als 2:1.",
};

// ── Der wahrscheinlichste OFFENE Endstand ───────────────────
// Gibt `{ home, away, quote }` oder `null`, wenn das Spiel kein Raster hat.
//
// ⚠️ Sortiert wird nach Quote AUFSTEIGEND — die niedrigste Quote ist der
// wahrscheinlichste Ausgang. Derselbe Vorzeichen-Fallstrick wie in
// `favoritenSperre.js`, und er sähe hier genauso harmlos aus: der Stepper
// stünde einfach auf 6:0 und niemand wüsste, warum.
// ⚠️ Nicht exportiert: von außen fragt man `startErgebnis`, sonst gäbe es zwei
// Wege zum selben Wert — und `npm run tot` hätte den zweiten prompt als
// Export gemeldet, den außer den Tests niemand aufruft.
function wahrscheinlichsterEndstand(snap) {
  const raster = Array.isArray(snap?.correctScore) ? snap.correctScore : [];
  let beste = null;
  for (let h = 0; h < raster.length; h++) {
    const zeile = Array.isArray(raster[h]) ? raster[h] : [];
    for (let a = 0; a < zeile.length; a++) {
      const quote = zeile[a];
      if (!Number.isFinite(quote) || quote <= 0) continue;
      if (!beste || quote < beste.quote) beste = { home: h, away: a, quote };
    }
  }
  return beste;
}

// ── Womit der Stepper startet ───────────────────────────────
// Der EINE Ort, den die Tippabgabe fragt. `quelle` sagt, woher der Wert kommt
// — die Oberfläche schreibt daraus ihren Satz, statt ihn selbst zu erraten.
//
//   fest   — der Vorgabe-Stand (2:1)
//   quote  — aus dem Raster gelesen
export function startErgebnis(snap, stufe = DEFAULT_VORBELEGUNG) {
  if (stufe !== "wahrscheinlich") return { ...FESTER_START, quelle: "fest" };
  const beste = wahrscheinlichsterEndstand(snap);
  // Kein Raster (oder alles gesperrt) → der feste Stand. Ein Spiel ohne
  // Ergebnis-Quoten gibt es: Saison-Wetten und frisch angelegte Spiele haben
  // keins, und ein `undefined` im Stepper wäre ein weißer Screen.
  if (!beste) return { ...FESTER_START, quelle: "fest" };
  return { home: beste.home, away: beste.away, quote: beste.quote, quelle: "quote" };
}
