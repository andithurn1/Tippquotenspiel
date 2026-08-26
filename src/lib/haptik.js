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
//  ausgelöst wird. Ein `navigator.vibrate` in fünfzehn Komponenten wäre
//  fünfzehn Stellen — und in vierzehn davon hätte niemand an die Einstellung
//  gedacht. Dass diese Datei am 26.08.2026 einmal komplett umgebaut wurde,
//  ohne dass ein einziger Aufrufer davon etwas gemerkt hat, ist der Beweis,
//  dass die Trennung richtig war.
//
//  ── 🔴 ZWEI WEGE, und der Unterschied ist nicht „geht / geht nicht" ──
//
//  **Im Browser:** `navigator.vibrate` — die Vibration-API. Sie kann genau
//  eine Sache: den Vibrationsmotor für N Millisekunden EINSCHALTEN. Kein
//  Muster mit Stärke, kein Gefühl, nur an/aus. Das ist der grobe Summer, den
//  auch ein Wecker benutzt. Es gibt sie auf **Android** (Chrome, WebView) —
//  auf **iOS gar nicht**, weder in Safari noch in einer WKWebView.
//
//  **In der App (Capacitor):** `@capacitor/haptics`. Das ist NICHT dieselbe
//  Sache in anders — es sind die Haptik-Bausteine des Betriebssystems:
//  `Haptics.notification({ type })` und `Haptics.impact({ style })`. Android
//  spielt sie über `VibrationEffect` (seit Android 8 mit Amplitude, also mit
//  einer Stärke statt nur Dauer), iOS über die Taptic Engine.
//
//  ⚠️ **Damit ist die App auch auf ANDROID besser als der Browser**, nicht
//  nur auf iOS. Ein `navigator.vibrate([26,70,26])` ist ein Summen mit Pause;
//  ein `NotificationType.Error` ist das Muster, das der Nutzer aus jeder
//  anderen App seines Telefons kennt. Wer nur an iOS denkt, verschenkt das.
//
//  ── Die drei Muster folgen den drei Arten der Rückmeldung ──
//  `Rueckmeldung.jsx` kennt genau drei Arten (gespeichert · fehler · info),
//  und die Haptik hängt an derselben Schicht. Damit gibt es keine Handlung,
//  die eine Meldung zeigt, aber nichts spüren lässt — und keine, die vibriert,
//  ohne dass etwas dasteht.
//
//  ⚠️ Die Millisekunden im Browser-Weg sind Konventionen, keine Messung: ein
//  kurzer Tick für „ist durch", ein doppelter, kräftigerer Stoß für „ist NICHT
//  durch". Der native Weg braucht sie gar nicht — dort sagt man dem System,
//  WAS es bedeutet, und das System weiß, wie sich das anfühlt.
//
//  ── Was diese Datei bewusst NICHT tut ──
//  Sie hängt NICHT an `prefs.bewegung`. Bewegung ist das Auge, Haptik ist die
//  Hand — wer Animationen abschaltet, weil ihm das Telefon zu langsam ist,
//  will deshalb nicht auf die Bestätigung im Daumen verzichten. Zwei Sinne,
//  zwei Schalter (`prefs.haptik`).
// ============================================================

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

// ── Weg 1: der Browser. Dauer in Millisekunden; ein Array ist ein Wechsel
// aus Stoß und Pause. Mehr kann die Vibration-API nicht.
export const MUSTER = {
  gespeichert: [12],
  fehler: [26, 70, 26],
  info: [8],
};

// ── Weg 2: das Betriebssystem. Hier steht keine Dauer, sondern eine
// BEDEUTUNG — wie sie sich anfühlt, entscheidet das Gerät.
//
// ⚠️ `info` ist ein `impact` und keine `notification`: eine Benachrichtigung
// ist die Antwort auf „ist es gut ausgegangen?", ein Impact die auf „etwas hat
// sich bewegt". Ein `NotificationType` für ein beiläufiges „ist passiert"
// fühlte sich an wie eine Warnung ohne Warnung.
export const NATIV = {
  gespeichert: { art: "notification", wert: NotificationType.Success },
  fehler: { art: "notification", wert: NotificationType.Error },
  info: { art: "impact", wert: ImpactStyle.Light },
};

// Fällt eine unbekannte Art an, wird sie wie `info` behandelt — dieselbe
// Haltung wie bei `STANDZEIT` in `Rueckmeldung.jsx`: eine neue Art soll nichts
// kaputt machen, nur unauffällig sein, bis jemand ihr ein Muster gibt.
export function musterFuer(art) {
  return MUSTER[art] ?? MUSTER.info;
}
export function nativFuer(art) {
  return NATIV[art] ?? NATIV.info;
}

// Läuft die App gerade in der nativen Hülle? Serverseitig (SSR) und auf der
// Netlify-Seite: nein.
export function istNativ() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

// Kann dieses Gerät überhaupt etwas spüren lassen?
//
// 🔴 Nativ IMMER — dort geht der Weg über das Betriebssystem, und das kann es
// auf jedem Telefon. Im Browser nur mit `navigator.vibrate`, also auf Android
// ja und auf einem iPhone nein.
export function istMoeglich() {
  if (istNativ()) return true;
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
// ⚠️ Der native Weg ist ASYNCHRON, der Browser-Weg nicht. Der Rückgabewert
// sagt deshalb „ist losgeschickt", nicht „hat gewackelt" — auf ein Promise zu
// warten, nur um eine Bestätigung zu fühlen, hielte den Aufrufer auf.
// Das abgelehnte Promise wird ausdrücklich verschluckt, aus demselben Grund
// wie das `try/catch`.
export function spuere(art = "info", { an } = {}) {
  if (!(an ?? istEingeschaltet())) return false;
  if (istNativ()) {
    const n = nativFuer(art);
    try {
      const p = n.art === "notification"
        ? Haptics.notification({ type: n.wert })
        : Haptics.impact({ style: n.wert });
      p?.catch?.(() => {});
      return true;
    } catch {
      return false;
    }
  }
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  try {
    return navigator.vibrate(musterFuer(art)) === true;
  } catch {
    return false;
  }
}
