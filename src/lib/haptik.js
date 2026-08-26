// ============================================================
//  HAPTIK — das kurze Spüren, wenn etwas durchgegangen ist
//
//  🔴 Der Auftrag steht seit dem 24.08.2026 unter UX10 („was ‚professionell'
//  noch fehlt") als OFFEN mit dem Vermerk „braucht Capacitor". Seit dem
//  26.08.2026 steht Capacitor — also ist der Punkt dran.
//
//  ── Warum das hier ein eigenes Modul ist und kein `navigator.vibrate(10)` ──
//  Dieselbe Begründung wie bei `getStore()` und der Quoten-Quelle
//  (Architektur-Regel 2): es gibt GENAU EINE Stelle, an der die Haptik
//  ausgelöst wird, und wenn sie später über ein Capacitor-Plugin läuft statt
//  über die Browser-Schnittstelle, ändert sich nur diese Datei. Ein
//  `navigator.vibrate` in fünfzehn Komponenten wäre fünfzehn Stellen — und in
//  vierzehn davon hätte niemand an die Einstellung gedacht.
//
//  ── 🔴 Was heute NICHT geht, und das gehört gesagt ──
//  `navigator.vibrate` gibt es auf **Android** (Chrome, WebView) — auf
//  **iOS nicht**, weder in Safari noch in einer WKWebView. Auf einem iPhone
//  passiert also bis auf Weiteres GAR NICHTS, und zwar lautlos: `istMoeglich()`
//  meldet dort `false`. Das ist kein Fehler, sondern der Stand.
//  Die Behebung ist ein Handgriff und steht in `docs/native-app.md`:
//  `@capacitor/haptics` einbinden und in `spuere()` statt `navigator.vibrate`
//  aufrufen. Alles andere in dieser Datei bleibt, wie es ist.
//
//  ── Die drei Muster folgen den drei Arten der Rückmeldung ──
//  `Rueckmeldung.jsx` kennt genau drei Arten (gespeichert · fehler · info),
//  und die Haptik hängt an derselben Schicht. Damit gibt es keine Handlung,
//  die eine Meldung zeigt, aber nichts spüren lässt — und keine, die vibriert,
//  ohne dass etwas dasteht.
//
//  ⚠️ Die Zahlen sind Konventionen, keine Messung: ein kurzer Tick für
//  „ist durch", ein doppelter, kräftigerer Stoß für „ist NICHT durch". Wer sie
//  ändert, ändert nichts an der Mechanik.
//
//  ── Was diese Datei bewusst NICHT tut ──
//  Sie hängt NICHT an `prefs.bewegung`. Bewegung ist das Auge, Haptik ist die
//  Hand — wer Animationen abschaltet, weil ihm das Telefon zu langsam ist,
//  will deshalb nicht auf die Bestätigung im Daumen verzichten. Zwei Sinne,
//  zwei Schalter (`prefs.haptik`).
//
//  Reine Funktionen bis auf `spuere()`, das als einziges die Außenwelt anfasst.
// ============================================================

// Dauer in Millisekunden; ein Array ist ein Wechsel aus Stoß und Pause.
export const MUSTER = {
  gespeichert: [12],
  fehler: [26, 70, 26],
  info: [8],
};

// Fällt eine unbekannte Art an, wird sie wie `info` behandelt — dieselbe
// Haltung wie bei `STANDZEIT` in `Rueckmeldung.jsx`: eine neue Art soll nichts
// kaputt machen, nur unauffällig sein, bis jemand ihr ein Muster gibt.
export function musterFuer(art) {
  return MUSTER[art] ?? MUSTER.info;
}

// Kann dieses Gerät überhaupt vibrieren? Serverseitig (SSR) und auf iOS: nein.
export function istMoeglich() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

// ── Woher die Einstellung kommt, und warum nicht über einen Hook ──
// 🔴 `RueckmeldungProvider` liegt in `layout.js` GANZ AUSSEN, ausserhalb von
// `PrefsProvider` — damit es auch Anmelde-Fehler melden kann. Ein `usePrefs()`
// darin gäbe es also gar nicht.
//
// Deshalb derselbe Weg, den `prefs.bewegung` schon geht: `PrefsProvider`
// schreibt die Stufe als Attribut ans `<html>`, und wer sie braucht, liest sie
// von dort. Ein zweiter Zugriff auf den localStorage wäre eine zweite Wahrheit
// über dieselbe Einstellung.
//
// ⚠️ „an" ist das FEHLEN des Attributs, nicht `data-haptik="an"` — dieselbe
// Bauart wie bei `data-bewegung`. Dadurch ist die Vorgabe schon vor der
// Hydration richtig, statt für einen Moment falsch.
export function istEingeschaltet() {
  if (typeof document === "undefined") return true;
  return document.documentElement.getAttribute("data-haptik") !== "aus";
}

// Die EINE Stelle, die die Außenwelt anfasst.
//
// ⚠️ `try/catch` ist kein Ziergriff: Browser lehnen `vibrate` ab, wenn es
// nicht aus einer echten Berührung heraus kommt oder die Seite in einem
// fremden Rahmen steckt — manche mit einem geworfenen Fehler. Eine
// Bestätigung, die den Speichern-Vorgang mit sich reißt, wäre die Sorte
// Beiwerk, die schlimmer ist als gar keins (siehe `Rueckmeldung.jsx`,
// „die Meldung ist BEIWERK").
//
// Gibt zurück, ob wirklich etwas passiert ist — dadurch kann die
// Einstellungs-Seite eine Probe anbieten, die ehrlich sagt „hier tut sich
// nichts", statt einen Knopf zu zeigen, der ins Leere greift.
export function spuere(art = "info", { an } = {}) {
  if (!(an ?? istEingeschaltet())) return false;
  if (!istMoeglich()) return false;
  try {
    return navigator.vibrate(musterFuer(art)) === true;
  } catch {
    return false;
  }
}
