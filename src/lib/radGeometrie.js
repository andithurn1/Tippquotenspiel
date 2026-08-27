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
    // ⚠️ `gewicht` kommt MIT hinaus, obwohl die Anzeige es nicht braucht: der
    // Rad-Editor rechnet einen Grenzzug in Gewichte zurück, und ohne das Feld
    // müsste er sich die Zahl aus dem Anteil zurückschätzen — also aus einer
    // gerundeten Größe eine exakte machen. Genau daraus entsteht die zweite
    // Wahrheit, vor der der Kopf dieser Datei warnt.
    .map((f) => ({
      id: f?.id, label: f?.label ?? "",
      gewicht: Number(f?.gewicht) || 0,
      anteil: anteilVon.get(f?.id) ?? 0,
    }))
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

// ============================================================
//  DER EDITOR AM RAD (Andi, 27.08.2026)
//
//  🔴 Wörtlich: „glaubst du man kann so ein glücksrad so designen dass admin
//  selber die felder größe also die wahrscheinlichkeit … optisch an dem Rad
//  einstellen kann mit den ganzen Regelbeziehungen."
//
//  ── Warum das GEHT, und woran es sonst scheitert ──
//  Ein Rad ist ein GANZES. Zieht man ein Feld größer, muss die Fläche
//  irgendwo herkommen — und genau darin steckt die Entscheidung, die eine
//  Zahlentabelle einem abnimmt und ein Rad einem aufzwingt.
//
//  ⚠️ Die naive Umsetzung („Feld größer ziehen, alle anderen anteilig
//  kleiner") fühlt sich beim ersten Zug richtig an und wird beim dritten
//  unbrauchbar: jedes Feld wandert, während man ein anderes zieht, und man
//  kann nichts mehr festhalten. Deshalb wird hier eine GRENZE gezogen, nicht
//  ein Feld: die Fläche geht zwischen genau zwei Nachbarn hin und her, alle
//  übrigen bleiben, wo sie sind.
//
//  🔴 Und die Zahl bleibt die Wahrheit. Der Zug ändert `gewicht` — dieselbe
//  Zahl, mit der `ziehe()` zieht. Es gibt keine zweite Größe fürs Aussehen.
// ============================================================

// Winkel eines Punktes relativ zur Mitte, in DERSELBEN Vereinbarung wie oben:
// 0° oben, wachsend im Uhrzeigersinn, Bereich [0, 360).
export function winkelVon(cx, cy, x, y) {
  const grad = (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
  return ((grad % 360) + 360) % 360;
}

// Welche Grenze liegt am nächsten? Grenzen sind die `bis`-Winkel der
// Segmente — die letzte (360°/0°) ist KEINE ziehbare Grenze: sie ist der
// Anfang des Rades, und sie zu verschieben hieße, das ganze Rad zu drehen.
//
// Gibt `null`, wenn nichts nahe genug liegt. ⚠️ `toleranz` in Grad, nicht in
// Pixeln: nah am Mittelpunkt sind wenige Pixel viele Grad, und ein Griff, der
// dort zuschnappt, macht das Ziehen unbrauchbar.
export function naechsteGrenze(segs = [], grad, toleranz = 12) {
  let beste = null;
  segs.forEach((s, i) => {
    if (i === segs.length - 1) return;   // die 360°-Naht ist keine Grenze
    // ⚠️ Kreis-Abstand, nicht Zahlen-Abstand: zwischen 359° und 1° liegen zwei
    // Grad, nicht 358. `(+540) % 360 - 180` bringt die Differenz auf
    // [-180, 180), der Betrag davon ist der Abstand.
    const abstand = Math.abs(((s.bis - grad + 540) % 360) - 180);
    if (abstand <= toleranz && (beste === null || abstand < beste.abstand)) {
      beste = { index: i, abstand, winkel: s.bis };
    }
  });
  return beste;
}

// Die Grenze `index` auf `grad` ziehen: die Fläche wandert zwischen dem
// Segment davor und dem danach, ihre SUMME bleibt gleich.
//
// Gibt `{ [feldId]: neuesGewicht }` für genau zwei Felder — oder `null`, wenn
// der Zug nichts ändern würde.
//
// ⚠️ Beide Felder behalten mindestens 1. Ein Feld auf 0 zu ziehen sähe aus
// wie „gelöscht", ist aber etwas anderes (ein Feld mit Gewicht 0 liegt weiter
// auf dem Rad und fällt nie) — und aus einem Segment ohne Fläche kommt man
// mit der Maus nicht mehr heraus, weil es keine Grenze mehr zum Anfassen hat.
export function ziehGrenze(segs = [], index, grad, gesamtGewicht) {
  const links = segs[index];
  const rechts = segs[index + 1];
  if (!links || !rechts || !(gesamtGewicht > 0)) return null;

  // Der neue Winkel muss ZWISCHEN den beiden Außenkanten liegen — sonst
  // würde ein Feld übersprungen und die Fläche käme aus einem dritten.
  const von = links.von;
  const bis = rechts.bis;
  const spanne = ((bis - von) + 360) % 360;
  const relativ = ((grad - von) + 360) % 360;
  if (relativ <= 0 || relativ >= spanne) return null;

  const proGrad = gesamtGewicht / 360;
  const linksNeu = Math.max(1, Math.round(relativ * proGrad));
  const summe = Math.round((spanne) * proGrad);
  const rechtsNeu = Math.max(1, summe - linksNeu);
  if (linksNeu === links.gewicht && rechtsNeu === rechts.gewicht) return null;
  return { [links.id]: linksNeu, [rechts.id]: rechtsNeu };
}

// Die Sehne zwischen zwei Segmentmitten — so wird eine Regelbeziehung im Rad
// sichtbar. ⚠️ Eine LINIE und kein Pfeil: ein Ausschluss gilt gegenseitig,
// und ein Pfeil behauptete eine Richtung, die es nicht gibt.
export function sehne(cx, cy, radius, gradA, gradB) {
  const p = (g) => {
    const rad = ((g - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const [x1, y1] = p(gradA);
  const [x2, y2] = p(gradB);
  // Leicht zur Mitte gebogen, damit sich mehrere Sehnen nicht überdecken —
  // bei acht Feldern und vier Beziehungen läge sonst alles auf einem Punkt.
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}
