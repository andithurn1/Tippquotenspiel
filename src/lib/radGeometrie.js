// ============================================================
//  RAD-GEOMETRIE — die Winkel des Glücksrads (design/drehrad.md 3c)
//
//  Architektur-Regel 1: Logik gehört nicht in die Komponente. Die
//  Segmentwinkel und der Zielwinkel der Drehung sind Rechnung, keine Haut —
//  und Rechnung, die niemand nachprüft, ist genau die Stelle, an der ein Rad
//  auf ein anderes Feld zeigt, als gezogen wurde.
//
//  🔴 **Die Fläche IST die Wahrscheinlichkeit.** Der Winkel folgt aus
//  `anteil × 360°`, und `anteil` kommt aus `wahrscheinlichkeiten()`
//  (drehrad.js) — also aus derselben Zahl, mit der auch gezogen wird. Hier
//  entsteht KEINE zweite Wahrheit über die Feldgrößen; diese Datei rechnet
//  nur um.
//
//  ⚠️ Felder mit Anteil 0 fallen heraus. Ein Feld mit Gewicht 0 fällt nie
//  (drehrad.md 4.1) — als hauchdünner Strich im Rad zu erscheinen wäre die
//  Behauptung, es könnte doch drankommen.
//
//  Winkel-Vereinbarung: **0° zeigt nach OBEN** (dort steht der Zeiger),
//  wachsend im Uhrzeigersinn. Sonst müsste jeder Aufrufer im Kopf um 90°
//  drehen — und genau dort entstehen die Fehler, bei denen der Zeiger einen
//  Nachbarn trifft.
//
//  Reine Funktionen, UI-frei.
// ============================================================

export const VOLLE_UMDREHUNGEN = 4;

// Die Segmente in Zeichen-Reihenfolge: `{ id, label, anteil, von, bis, mitte }`
// in GRAD. `felder` liefert Id und Beschriftung, `anteile` den Anteil — beide
// in der Form, die `wahrscheinlichkeiten()` zurückgibt.
export function segmente(felder = [], anteile = []) {
  const anteilVon = new Map((Array.isArray(anteile) ? anteile : []).map((a) => [a.id, Number(a.anteil) || 0]));
  const sichtbar = (Array.isArray(felder) ? felder : [])
    .map((f) => ({ id: f?.id, label: f?.label ?? "", anteil: anteilVon.get(f?.id) ?? 0 }))
    .filter((f) => f.anteil > 0);

  let laufend = 0;
  return sichtbar.map((f) => {
    const von = laufend * 360;
    laufend += f.anteil;
    const bis = laufend * 360;
    return { ...f, von, bis, mitte: (von + bis) / 2 };
  });
}

// Der Winkel, auf den das RAD gedreht wird, damit die Mitte des
// Gewinnersegments unter dem (feststehenden) Zeiger oben landet.
//
// ⚠️ Das Minus ist der Kern: gedreht wird das Rad, nicht der Zeiger. Ein
// Segment, dessen Mitte bei 90° liegt, muss um −90° zurückgedreht werden,
// damit es oben steht. Wer hier das Vorzeichen vertauscht, bekommt ein Rad,
// das systematisch das gespiegelte Feld anzeigt — und es fällt erst auf, wenn
// jemand nachrechnet, warum die Auszahlung nicht zum Bild passt.
//
// `reduziert` (prefers-reduced-motion) lässt die vollen Umdrehungen weg: das
// Ergebnis steht dann sofort da. Die Animation trägt ohnehin keine Information
// — der Ausgang ist längst gezogen (drehrad.md 2.5).
export function zielWinkel(segment, { reduziert = false, umdrehungen = VOLLE_UMDREHUNGEN } = {}) {
  if (!segment || !Number.isFinite(segment.mitte)) return 0;
  return (reduziert ? 0 : umdrehungen * 360) - segment.mitte;
}

// Welches Segment steht bei diesem Rad-Winkel unter dem Zeiger? Die Umkehrung
// von `zielWinkel` — gebraucht wird sie nicht zum Zeichnen, sondern zum
// PRÜFEN: nur so lässt sich zeigen, dass das Rad wirklich auf das gezogene
// Feld zeigt und nicht auf den Nachbarn.
export function segmentUnterZeiger(segs = [], winkel = 0) {
  if (!segs.length) return null;
  // Das Rad ist um `winkel` gedreht; unter dem Zeiger (0°) liegt damit die
  // Rad-Position `-winkel`, normiert auf [0, 360).
  const pos = ((-winkel % 360) + 360) % 360;
  return segs.find((s) => pos >= s.von && pos < s.bis)
    // Rundungs-Randfall genau auf 360: das gehört zum letzten Segment.
    ?? segs[segs.length - 1];
}
