// ============================================================
//  ANZEIGE VON ZAHLEN — eine Quelle für alle Screens
//
//  ⚠️ Entstanden aus einem Fehler, der sich durch das halbe Projekt zog:
//  Am 01.08.2026 sind alle Multiplikator-Regler auf das 0,05-Raster gegangen
//  (über `rules.reglerFeinheit` sogar auf bis zu 0,01). Die FORMATIERER
//  standen weiter auf `toFixed(1)` — der Admin stellte 1,15 ein und las
//  „×1.2", und der SPIELER bekam in `Tippabgabe.jsx` denselben falschen Wert
//  zu sehen. Ein Wert, den niemand gewählt hat.
//
//  Dieselbe Fehlerklasse gab es eine Schicht tiefer schon einmal: dort hat
//  `sanitizeRules` mit `.toFixed(1)` den Wert gerundet GESPEICHERT. Beide Male
//  war die Ursache, dass eine Rundung an einer Stelle stand, an die beim
//  Ändern der Schrittweite niemand gedacht hat.
//
//  Deshalb liegt die Formatierung ab jetzt HIER und wird importiert, nicht
//  je Komponente neu getippt.
// ============================================================

// Eine Zahl, wie ein deutschsprachiger Leser sie erwartet: höchstens zwei
// Nachkommastellen, keine überflüssigen Nullen (1,5 statt 1,50), Komma statt
// Punkt — dieselbe Behandlung wie bei `AVG_GOALS` in `PresetRating.jsx`.
export function zahl(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "—";
  return String(+n.toFixed(2)).replace(".", ",");
}

// Ein Multiplikator: „×1,15".
export function fmtFaktor(x) {
  return "×" + zahl(x);
}

// Für Regler, bei denen genau 1 „kein Modifikator" bedeutet.
// ⚠️ NUR bei genau 1. Ein früherer Formatierer prüfte `<= 1` und hätte seit
// den Dämpfern (Faktoren unter 1) jeden Dämpfer als „aus" ausgewiesen,
// obwohl er sehr wohl wirkt.
export function fmtFaktorOderAus(x) {
  return Number(x) === 1 ? "aus" : fmtFaktor(x);
}
