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

// ── „Dein Tipp" — EINE Formulierung (Andi, KT6, 25.08.2026) ──
//
// 🔴 Der Anlass: die Spielwahl schrieb an jedes getippte Spiel nur „✓ getippt".
// Andis Ansage dazu: „natürlich gibts auch ne Gesamtübersicht wo die einzelnen
// zu tippenden Spiele ausgewählt werden sollen auch um bisher eingetragenes
// noch anzupassen" — dafür muss man sehen, WAS eingetragen ist, sonst muss man
// jedes Spiel einzeln öffnen, um es zu erfahren.
//
// ⚠️ Warum hier und nicht im Screen: `{t.home}:{t.away}` stand am 25.08.2026
// an SECHS Stellen ausgeschrieben. Solange es nur eine Zahl ist, geht das gut;
// sobald „mit Torschützen" oder „Joker gesetzt" dazukommt, laufen sie
// auseinander — und niemand merkt es, weil jede Stelle für sich stimmt.
// Dieselbe Lehre wie bei `exaktText` in der Tippabgabe.
export function tippKurz(tip) {
  const h = Number(tip?.home), a = Number(tip?.away);
  if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) return null;
  return `${h}:${a}`;
}

// Wie viele Torschützen stehen im Tipp? ⚠️ Beide Mannschaften zusammen, und
// leere Plätze zählen nicht mit: `goals` trägt Lücken, wenn jemand nur einen
// von drei Plätzen gefüllt hat.
export function tippSchuetzen(tip) {
  const seiten = [tip?.goals?.home, tip?.goals?.away];
  return seiten.reduce(
    (s, liste) => s + (Array.isArray(liste) ? liste.filter(Boolean).length : 0),
    0,
  );
}

// Der ganze Satz: „2:1 · 2 Torschützen". Ohne Torschützen bleibt es bei der
// Zahl — ein „· 0 Torschützen" wäre eine Aussage über nichts.
export function tippLang(tip) {
  const kurz = tippKurz(tip);
  if (!kurz) return null;
  const n = tippSchuetzen(tip);
  return n > 0 ? `${kurz} · ${n} Torschütze${n === 1 ? "" : "n"}` : kurz;
}
