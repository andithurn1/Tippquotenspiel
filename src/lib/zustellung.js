// ============================================================
//  ZUSTELLUNG — die Buchführung zwischen „wäre fällig" und „ist raus"
//
//  `notify.js` entscheidet, WAS fällig wäre. Diese Datei entscheidet, was davon
//  tatsächlich rausgeht, und merkt sich, was rausging. Getrennt gehalten, weil
//  es zwei verschiedene Fragen sind: die eine hängt am Spielplan, die andere am
//  Gerät und an der Vergangenheit.
//
//  ── Der Grund für dieses Modul: `maxProTag` deckelte pro AUFRUF ──
//  `dueNotifications()` schneidet seine Liste auf `maxProTag` zu. Das ist
//  richtig für EINEN Durchlauf — aber die App sieht mehrmals nach. Wer alle
//  fünf Minuten prüft, bekäme drei Meldungen JE DURCHLAUF, also Dauerfeuer
//  trotz Obergrenze. Die Tages-Obergrenze kann nur dort greifen, wo bekannt ist,
//  was heute schon zugestellt wurde — und das weiß nur die Zustellung.
//
//  ── Warum ein rollendes 24-h-Fenster und kein Kalendertag ──
//  Um 23:50 drei Meldungen und um 00:10 wieder drei wären formal zwei Tage,
//  gefühlt aber Dauerfeuer. Das Versprechen lautet „höchstens X am Tag", also
//  wird es auch so gemessen.
//
//  Reine Funktionen, kein I/O. Wo die Liste liegt (localStorage, später eine
//  Tabelle), ist Sache des Aufrufers — genau wie beim Store.
// ============================================================

import { sanitizeNotify } from "./notify";

// Wie lange ein Eintrag aufgehoben wird. Lange genug, dass eine Erinnerung
// nicht doppelt kommt, kurz genug, dass die Liste nicht ewig wächst.
export const AUFBEWAHRUNG_TAGE = 30;

const TAG_MS = 24 * 3600 * 1000;

// Ein Zustell-Eintrag: { key, art, zeit }. `key` kommt aus notify.js und ist
// stabil — daran hängt die Doppel-Vermeidung.
export function merkeZustellung(gesehen = [], eintrag, jetzt = Date.now()) {
  const key = eintrag?.key;
  if (!key) return gesehen;
  const ohneAlte = pruneZustellungen(gesehen, jetzt);
  if (ohneAlte.some((g) => g.key === key)) return ohneAlte;   // nie doppelt
  return [...ohneAlte, { key, art: eintrag.art ?? null, zeit: jetzt }];
}

// Alte Einträge wegwerfen. Einträge OHNE Zeitstempel bleiben: sie stammen aus
// einer älteren Fassung, und sie zu verlieren hieße, ihre Meldung erneut
// zuzustellen — die unangenehmere Fehlerrichtung.
export function pruneZustellungen(gesehen = [], jetzt = Date.now()) {
  const grenze = jetzt - AUFBEWAHRUNG_TAGE * TAG_MS;
  return gesehen.filter((g) => g && (!Number.isFinite(g.zeit) || g.zeit >= grenze));
}

// Wie viele Meldungen gingen in den letzten 24 Stunden raus?
export function zugestelltImFenster(gesehen = [], jetzt = Date.now()) {
  const ab = jetzt - TAG_MS;
  return gesehen.filter((g) => Number.isFinite(g?.zeit) && g.zeit >= ab).length;
}

// Was davon geht JETZT wirklich raus?
//
//  faellig — das Ergebnis von dueNotifications()
//  gesehen — die eigene Zustell-Historie
//
// Reihenfolge: das Dringendste zuerst (kleinste Restzeit), damit bei knappem
// Budget nicht die Erinnerung „in 24 h" die Erinnerung „in 1 h" verdrängt.
export function zustellbar({ faellig = [], gesehen = [], prefs, jetzt = Date.now() } = {}) {
  const p = sanitizeNotify(prefs);
  if (!p.enabled) return [];
  const schon = new Set(gesehen.map((g) => g?.key));
  const rest = Math.max(0, p.maxProTag - zugestelltImFenster(gesehen, jetzt));
  if (rest === 0) return [];
  return faellig
    .filter((f) => f?.key && !schon.has(f.key))
    .sort((a, b) => (a.stunden ?? 99) - (b.stunden ?? 99))
    .slice(0, rest);
}

// Klartext für den Screen: was ist vom Tagesbudget noch übrig? Der Nutzer soll
// nachvollziehen können, warum gerade NICHTS kommt — Stille ohne Erklärung
// wirkt wie ein Defekt.
export function budgetText(gesehen = [], prefs, jetzt = Date.now()) {
  const p = sanitizeNotify(prefs);
  const genutzt = zugestelltImFenster(gesehen, jetzt);
  const rest = Math.max(0, p.maxProTag - genutzt);
  if (!p.enabled) return "Aus — es geht nichts raus.";
  if (rest === 0) return `Tagesgrenze erreicht (${genutzt} von ${p.maxProTag}) — heute kommt nichts mehr.`;
  return `${rest} von ${p.maxProTag} heute noch möglich.`;
}
