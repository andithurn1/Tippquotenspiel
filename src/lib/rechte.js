// ============================================================
//  RECHTE — was der Sieger bestimmen darf
//
//  🔴 Andi, 27.08.2026, auf meine zwei Rückfragen:
//
//    „nur die der Admin einstellt, aber ja Admin kann auch einstellen, dass
//     aus einer Liste ausgewählt werden kann und diese einzelnen Wirkungen
//     können natürlich auch angepasst werden vor vom Admin"
//
//  Damit sind beide Fragen beantwortet, und die Antwort ist enger als das,
//  was ich vorgeschlagen hatte — zu Recht:
//
//    ⛔ Der Rechteinhaber wählt NICHTS frei. Er wählt aus dem, was der Admin
//       vorbereitet hat. Alles andere wäre ein Fremdjoker mit anderem Namen,
//       und den gibt es schon.
//    ✅ Der Admin bestimmt, ob es EIN festes Recht ist („du bestimmst das
//       Topspiel") oder eine LISTE, aus der gewählt wird.
//    ✅ Jedes Angebot der Liste ist eine fertig eingestellte Wirkung —
//       Zahlen und Dauer stehen vorher fest.
//
//  ── 🔴 Es trifft IMMER ALLE. Auf Nachfrage, wörtlich ──
//  *„was meinst mit ziel? ja ist quasi als Ereignis was alle trifft und nicht
//  Fremdjoker"* (Andi, 27.08.2026).
//
//  Damit hat ein Angebot bewusst KEINE WEN-Achse. Das ist keine Vereinfachung,
//  sondern die Grenze zwischen zwei Familien: eine Wirkung, die sich EINE
//  Person aussucht, ist ein Fremdjoker — und die gibt es längst, mit
//  Schutzschild, Sperrfrist und Kontingent. Ein Recht ist das Gegenteil: der
//  Sieger dreht an etwas, das für die ganze Runde gilt, ihn eingeschlossen.
//
//  ⚠️ Das hat eine Folge, die man beim Einstellen wissen sollte: ein Abzug,
//  den der Sieger auslöst, trifft ihn selbst mit. Genau deshalb ist es keine
//  Waffe — und deshalb braucht es hier auch keine Schutzregeln.
//
//  ⚠️ Und die Gegenrichtung, die Andi im selben Atemzug nennt: „sobald wer
//  einen Unterwert erreicht hat, er eben auch Joker bzw mehr Joker als andere
//  zum aufholen kriegt" — das ist KEIN Recht, das ist ein Ereignis, und es
//  läuft schon: Auslöser + WEN-Achse + Wirkung `joker`. Seit dem 27.08.2026
//  sogar mit seiner Schwelle (`auswahl.js`, Modus `abstand`: „30 % unter dem
//  Schnitt"). Beides zu bauen wäre dieselbe Sache zweimal.
//
//  ── 🔴 Warum das ein eigener Block ist und keine Wirkung ──
//  Naheliegend wäre gewesen, das Recht in die vorbereitete Wirkung `rolle`
//  zu legen. Dagegen sprechen zwei Dinge, und beide sind hart:
//
//  1. **Eine Wirkung, die Wirkungen enthält, schachtelt sich.** `sanitizeWirkung`
//     müsste sich selbst aufrufen, und ein Recht auf ein Recht auf ein Recht
//     wäre gültig. Die Grenze müsste man dann künstlich ziehen.
//  2. **Der Admin stellt das hier ein, BEVOR ein Ereignis eintritt.** Es ist
//     eine Runden-Einstellung wie das Big Game, keine Folge eines Auslösers.
//     Was ein Ereignis damit macht, ist eine zweite Frage.
//
//  Die WEN-Achse wird trotzdem geteilt (`sanitizeAuswahl`): „wer den Spieltag
//  gewinnt" ist dieselbe Frage wie überall sonst, und zwei Kataloge dafür
//  wären die doppelte Wahrheit.
//
//  ── ⏳ Was hier NICHT drinsteht ──
//  Wie die getroffene Wahl gespeichert wird. Das ist die eine offene
//  Architektur-Frage (`design/ideen.md`), und sie wird nicht nebenbei
//  entschieden. Diese Datei beschreibt, WAS zur Wahl steht — nicht, wo das
//  Ergebnis landet.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { sanitizeWirkung, beschreibeWirkung } from "./wirkung";

// ── Was ein Recht überhaupt sein kann ───────────────────────
// ⚠️ Kurz gehalten, und das ist Absicht: jedes Recht braucht eine Mechanik,
// in die es greifen kann. Ein Katalog mit zehn Einträgen, von denen acht
// nirgends ankommen, wäre die Sorte Baukasten, vor der `npm run tot` warnt.
export const RECHT_ARTEN = [
  {
    key: "bigGame",
    label: "Das Topspiel bestimmen",
    text: "Er sucht das Spiel aus, das am nächsten Spieltag mehr zählt.",
    // 🔴 Das einzige Recht, dessen Weg schon vollständig steht: die Wahl
    // landet in `bigGame.festesSpiel`, und `bigGameAufschlag` liest sie.
    fertig: true,
  },
  {
    key: "wirkung",
    label: "Eine vorbereitete Wirkung auslösen",
    text: "Er löst eine der Wirkungen aus, die der Admin vorbereitet hat — Aufschlag, Abzug, Umverteilung, Sperre.",
    fertig: false,
  },
];
const ART_KEYS = new Set(RECHT_ARTEN.map((a) => a.key));

export const RECHTE_LIMITS = {
  // Sechs, nicht zwanzig: eine Liste, die man nicht auf einen Blick erfasst,
  // ist keine Wahl mehr, sondern eine Suche.
  angebote: { min: 0, max: 6, step: 1 },
};

export const WAHL_ARTEN = [
  { key: "fest", label: "Ein festes Recht", text: "Genau eine Sache — es gibt nichts zu entscheiden." },
  { key: "liste", label: "Er wählt aus einer Liste", text: "Der Admin stellt mehrere zusammen, der Sieger nimmt eine." },
];

export const DEFAULT_RECHTE = { enabled: false, wahl: "fest", angebote: [] };

// ── Ein einzelnes Angebot ───────────────────────────────────
// ⚠️ `wirkung` wird durch `sanitizeWirkung` geschickt — dieselbe Bereinigung
// wie überall. Damit kann in einem Angebot nichts stehen, was als Wirkung
// nicht auswertbar wäre; die Prüfung liegt an EINER Stelle.
// ⚠️ KEIN `auswahl`-Feld, und das ist Absicht (siehe Kopf): ein Recht trifft
// alle. Wer eine Person treffen will, nimmt einen Fremdjoker.
function sanitizeAngebot(roh, index) {
  const p = roh && typeof roh === "object" ? roh : {};
  const art = ART_KEYS.has(p.art) ? p.art : "bigGame";
  const eintrag = { key: typeof p.key === "string" && p.key ? p.key : `angebot-${index + 1}`, art };
  if (art !== "wirkung") return eintrag;
  // ⚠️ Eine nicht auswertbare Wirkung fällt auf die Vorgabe zurück (das macht
  // `sanitizeWirkung` von sich aus) — ein Angebot, das ins Leere greift, wäre
  // ein Knopf, der nichts tut, und der Rechteinhaber merkt es als Erster.
  eintrag.wirkung = sanitizeWirkung(p.wirkung);
  return eintrag;
}

export function sanitizeRechte(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const roh = Array.isArray(p.angebote) ? p.angebote : [];
  const angebote = roh.slice(0, RECHTE_LIMITS.angebote.max).map(sanitizeAngebot);
  const wahl = WAHL_ARTEN.some((w) => w.key === p.wahl) ? p.wahl : DEFAULT_RECHTE.wahl;
  return {
    // 🔴 Dieselbe Sperrklinke wie bei `sanitizeSperre` und
    // `sanitizeWettbewerbe`: eingeschaltet nur, wenn es auch etwas zu
    // vergeben gibt. Ein Recht ohne Angebot wäre ein Schalter, hinter dem
    // nichts liegt.
    enabled: p.enabled === true && angebote.length > 0,
    // ⚠️ „Liste" ohne zweites Angebot ist keine Liste. Still auf „fest"
    // zurückgeholt, statt eine Wahl anzukündigen, die es nicht gibt.
    wahl: angebote.length > 1 ? wahl : "fest",
    angebote,
  };
}

// ── Was steht dem Inhaber zur Wahl? ─────────────────────────
// Immer eine LISTE, auch bei „fest" — dann eben mit einem Eintrag. Ein
// Aufrufer soll nicht zwei Formen unterscheiden müssen („nie halb gesetzt",
// dieselbe Regel wie in `limitKlassen.js`).
export function angeboteFuer(rules) {
  const cfg = sanitizeRechte(rules?.rechte);
  if (!cfg.enabled) return [];
  return cfg.wahl === "fest" ? cfg.angebote.slice(0, 1) : cfg.angebote;
}

// Darf der Inhaber überhaupt etwas entscheiden?
export function hatWahl(rules) {
  return angeboteFuer(rules).length > 1;
}

// ── Ein Satz je Angebot, für die Oberfläche ─────────────────
export function beschreibeAngebot(angebot) {
  const a = sanitizeAngebot(angebot ?? {}, 0);
  if (a.art !== "wirkung") {
    return RECHT_ARTEN.find((x) => x.key === a.art)?.label ?? a.art;
  }
  return `auslösen: ${beschreibeWirkung(a.wirkung)}`;
}

// Und einer über das Ganze — für die Zusammenfassung der Klappe.
export function beschreibeRechte(rules) {
  const cfg = sanitizeRechte(rules?.rechte);
  if (!cfg.enabled) return "aus — niemand bestimmt etwas";
  if (cfg.wahl === "fest") return beschreibeAngebot(cfg.angebote[0]);
  return `Wahl aus ${cfg.angebote.length} Möglichkeiten`;
}

// ── ⚠️ Was davon kommt heute wirklich an? ───────────────────
// 🔴 Diese Funktion ist die Ehrlichkeits-Klausel des Blocks. Der Admin kann
// alles einstellen, was oben steht — aber nur das Topspiel-Recht hat heute
// einen vollständigen Weg von der Wahl bis in die Wertung.
//
// Sie wird von `greiftNicht.js` benutzt, damit der Admin es SIEHT, statt es
// zu merken, wenn nichts passiert. Genau dafür gibt es diesen Bericht.
export function nochOhneWirkung(rules) {
  return angeboteFuer(rules)
    .filter((a) => !RECHT_ARTEN.find((x) => x.key === a.art)?.fertig)
    .map((a) => beschreibeAngebot(a));
}
