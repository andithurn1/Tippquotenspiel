// ============================================================
//  EREIGNISSE — Joker ERSPIELEN statt nur zugeteilt bekommen
//
//  Bisher kommt ein Joker nur vom Admin (`joker.verteilung`). Hier kommt der
//  zweite Topf dazu: Joker, die man sich verdient.
//
//  ── Zwei Töpfe, einer davon gedeckelt ──
//  `zugeteilt` (aus dem Regelwerk) und `erspielt` (aus Ereignissen) fließen in
//  DASSELBE Joker-Kontingent — es gibt bewusst keinen neuen Punkte-Kanal,
//  damit die bestehende Deckelung (`modCap`) weiter greift. Der erspielte Topf
//  hat zusätzlich eine eigene Obergrenze (`maxErspielt`): ohne sie gewönne das
//  Tippspiel, wer im Minispiel gut ist. Das wäre eine zweite Leistungsachse
//  und damit ein Fairness-Bruch.
//
//  ── Warum Meilensteine der richtige Anfang sind ──
//  Sie brauchen KEINE neuen Daten und kein Minispiel: „drei Spieltage in Folge
//  getippt" steckt schon in den Tipps. Und sie belohnen Dranbleiben statt
//  Geschicklichkeit — das ist automatisch balance-freundlich, weil es niemanden
//  bevorzugt, der besser tippt, sondern jemanden, der überhaupt tippt.
//
//  ── Jeder Typ deklariert seine Daten (`braucht`) ──
//  Gleiches Muster wie bei den Saison-Wetten: Herausforderungen (Quiz, Duell)
//  stehen im Katalog, sind aber als NICHT auswertbar markiert, solange es kein
//  Minispiel gibt. So bleibt der Katalog die eine Quelle und niemand aktiviert
//  ein Ereignis, das nie auslöst.
//
//  ⚠️ Fußball-Tic-Tac-Toe („Spieler, der für beide Vereine spielte") ist mit
//  unseren Daten NICHT möglich — unsere Kader sind generiert und fiktiv. Das
//  ginge erst mit einer echten Spieler-Datenquelle. Ein Quiz über die
//  TIPP-Statistiken der eigenen Runde ginge dagegen sofort.
//
//  Reine Funktionen, UI-frei.
// ============================================================

// Direkt aus `spieltag.js`, NICHT aus `engine.js` — die Engine importiert aus
// dieser Datei hier, das wäre ein Kreis.
import { spieltagKey, spieltageChronologisch } from "./spieltag";
// 🔴 Die WEN-Achse. Sie lag seit ihrem Bau ungenutzt da — dieser Import ist
// der erste Aufrufer überhaupt (Befund 06.08.2026).
import { waehleBetroffene } from "./auswahl";
// 🔴 Die WAS-Achse. Bis 07.08.2026 war die Wirkung eines Ereignisses IMMER
// „n Joker" — das Feld hieß `belohnung` und war eine Zahl. Das ist die
// Voreinstellung geblieben (`wirkungVon` unten), aber nicht mehr die einzige
// Möglichkeit. Wichtig dabei: der Deckel `maxErspielt` zählt weiterhin nur
// JOKER, weil er ein Joker-Deckel ist — die anderen Wirkungen bringen ihren
// eigenen Topf mit (siehe Kopfkommentar von `wirkung.js`).
import { sanitizeWirkung, beschreibeWirkung, wendeAn } from "./wirkung";

// Welche Daten haben wir heute? Alles andere ist im Katalog vorbereitet, aber
// nicht auswertbar — genau wie Karten/Fouls bei den Saison-Wetten.
export const VERFUEGBARE_DATEN = ["tipps", "ergebnisse", "spieltagspunkte"];

export const EREIGNIS_TYPEN = [
  // ── 1. Meilensteine (passiv, aus dem Tippen selbst) ──
  {
    key: "serie",
    label: "Serie: mehrere Spieltage in Folge getippt",
    kategorie: "meilenstein",
    braucht: ["tipps"],
    parameter: ["anzahl"],
    standard: { anzahl: 3, belohnung: 1 },
    hint: "Belohnt Dranbleiben. Löst jedes Mal aus, wenn die Serie erneut voll ist.",
  },
  {
    key: "erster-exakter",
    label: "Erster exakter Treffer",
    kategorie: "meilenstein",
    braucht: ["tipps", "ergebnisse"],
    parameter: [],
    standard: { belohnung: 1 },
    hint: "Einmal pro Saison — der Moment, in dem es zum ersten Mal genau aufgeht.",
  },
  {
    key: "aussenseiter",
    label: "Außenseiter-Sieg vorhergesagt",
    kategorie: "meilenstein",
    braucht: ["tipps", "ergebnisse"],
    parameter: ["abQuote"],
    standard: { abQuote: 5, belohnung: 1 },
    hint: "Wer den Mut hatte und recht behielt. Ab der eingestellten Sieger-Quote.",
  },
  {
    key: "spieltag-komplett",
    label: "Alle Spiele eines Spieltags getippt",
    kategorie: "meilenstein",
    braucht: ["tipps"],
    parameter: [],
    standard: { belohnung: 1 },
    hint: "Für die, die keinen Spieltag auslassen — unabhängig davon, wie gut getippt wurde.",
  },

  // ── 2. Widerfahrnisse (passiv, sozialer Ausgleich) ──
  {
    // 🔴 Der erste Ereignis-Typ mit einer echten WEN-ACHSE.
    //
    // `auswahl.js` (`waehleBetroffene`) beantwortet die zweite der vier Fragen
    // jeder Mechanik — WANN, WEN, WAS, WIE LANGE — mit achtzehn Modi und
    // eigenen Tests. Bis 06.08.2026 hat es **niemand aufgerufen**: die ganze
    // Achse war totes Kapital, vierter Fund derselben Sorte an einem Tag.
    //
    // Hier hängt sie: aus „Trost-Joker für den Letzten" wird „Auszeichnung
    // nach Spieltags-Platzierung", und derselbe Eintrag liefert auch die
    // Spieltags-Krone (`ende: "oben"`) oder das untere Fünftel
    // (`modus: "perzentil"`) — ohne eine Zeile neuen Auswertungs-Code.
    key: "letzter-am-spieltag",
    label: "Auszeichnung nach Spieltags-Platzierung",
    kategorie: "widerfahrnis",
    braucht: ["spieltagspunkte"],
    parameter: ["auswahl"],
    standard: { belohnung: 1, auswahl: { modus: "rang", ende: "unten", n: 1, prozent: 20 } },
    // ⚠️ Der Aufhol-Mechanismus belohnt Zurückliegen bereits. Beides zusammen
    // belohnt es DOPPELT — deshalb meldet `konflikte()` diese Kombination.
    // Aber NUR, wenn hier tatsächlich nach unten ausgezeichnet wird: eine
    // Spieltags-Krone für den Besten verdoppelt gar nichts.
    doppeltMit: "aufholen",
    hint: "Wer je Spieltag etwas bekommt — hinten (Trost) oder vorn (Krone). Trost nicht zusammen mit dem Anschluss-Bonus.",
  },

  // ── 3. Herausforderungen (aktiv, Minispiel) — vorbereitet ──
  // Stehen im Katalog, damit die Struktur steht und der Admin sieht, was
  // kommt. Auswertbar erst mit einem Minispiel; `istAuswertbar` blendet sie
  // solange aus, statt sie stillschweigend nie auslösen zu lassen.
  {
    key: "quiz",
    label: "Quiz über die eigene Runde",
    kategorie: "herausforderung",
    braucht: ["minispiel"],
    parameter: [],
    standard: { belohnung: 1 },
    hint: "„Wer tippt am häufigsten Unentschieden?“ — ginge mit unseren Daten sofort, braucht aber ein Minispiel drumherum.",
  },
  {
    key: "duell",
    label: "Joker-Duell gegen einen Mitspieler",
    kategorie: "herausforderung",
    braucht: ["minispiel"],
    parameter: [],
    standard: { belohnung: 1 },
    hint: "Muss ASYNCHRON funktionieren — ein Freundeskreis spielt nie gleichzeitig.",
  },
];

export const EREIGNIS = Object.fromEntries(EREIGNIS_TYPEN.map((e) => [e.key, e]));

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// ── Welche Auswahl-Modi ergeben HIER einen Sinn? ────────────
// `auswahl.js` kennt achtzehn. Die meisten brauchen Daten, die an dieser
// Stelle nicht vorliegen (Rangveränderung, Beitrittsdatum, Freiwillige) oder
// beantworten eine andere Frage (`selbst`, `betroffener`). Ein Ereignis, das
// je Spieltag auszeichnet, arbeitet auf dem SPIELTAGS-Stand — und dort sind
// genau diese drei sinnvoll.
//
// ⚠️ Bewusst eine kurze Liste statt „alles durchreichen": ein Modus, dessen
// Daten fehlen, liefert stillschweigend eine leere Auswahl. Das sähe für den
// Admin exakt aus wie ein Ereignis, das nie auslöst.
export const AUSWAHL_MODI = ["rang", "perzentil", "mitte"];

export const AUSWAHL_LIMITS = {
  n: { min: 1, max: 5, step: 1 },
  prozent: { min: 5, max: 50, step: 5 },
};

export function sanitizeAuswahl(partial = {}, standard = { modus: "rang", ende: "unten", n: 1, prozent: 20 }) {
  const p = partial && typeof partial === "object" ? partial : {};
  const modus = AUSWAHL_MODI.includes(p.modus) ? p.modus : standard.modus;
  return {
    modus,
    // `mitte` hat kein Ende — es ist per Definition „weder oben noch unten".
    // Trotzdem mitschreiben, damit ein Wechsel zurück nach `rang` die frühere
    // Wahl nicht verliert.
    ende: p.ende === "oben" ? "oben" : "unten",
    n: Math.round(clamp(p.n, AUSWAHL_LIMITS.n, standard.n)),
    prozent: Math.round(clamp(p.prozent, AUSWAHL_LIMITS.prozent, standard.prozent)),
  };
}

// Ein Satz, den ein Spieler versteht — dieselbe Rolle wie `anteile()` bei den
// Wettbewerbs-Gewichten: „rang/unten/1" sagt niemandem etwas.
export function beschreibeAuswahl(auswahl) {
  const a = sanitizeAuswahl(auswahl);
  if (a.modus === "mitte") return `das mittlere Feld (ohne die oberen und unteren ${a.prozent} %)`;
  if (a.modus === "perzentil") return `${a.ende === "oben" ? "das obere" : "das untere"} Fünftel (${a.prozent} %)`;
  if (a.n === 1) return a.ende === "oben" ? "der Beste des Spieltags" : "der Letzte des Spieltags";
  return `die ${a.n} ${a.ende === "oben" ? "Besten" : "Letzten"} des Spieltags`;
}

export const EREIGNIS_LIMITS = {
  belohnung: { min: 1, max: 3, step: 1 },
  maxErspielt: { min: 1, max: 15, step: 1 },
  anzahl: { min: 2, max: 10, step: 1 },      // Serie
  abQuote: { min: 2, max: 15, step: 0.5 },   // Außenseiter
  // ── Begrenzer, für JEDES Ereignis verfügbar ───────────────
  // 0 heißt „aus" und ist die Vorgabe — ohne Zutun ändert sich nichts am
  // bisherigen Verhalten. Sie sind der zweite Wert zu jeder Option: die
  // Einstellung sagt, WAS passiert, der Begrenzer, wie oft es höchstens
  // passieren darf.
  abstand: { min: 0, max: 10, step: 1 },        // Abklingzeit in Spieltagen
  maxProSaison: { min: 0, max: 20, step: 1 },   // 0 = unbegrenzt
};

export const DEFAULT_EREIGNISSE = { enabled: false, maxErspielt: 5, aktive: [] };

// ── Die Ereignis-Bibliothek ─────────────────────────────────
//  🔴 Warum es sie gibt: bis 06.08.2026 kam `rules.ereignisse` NUR in der
//  Profi-Ansicht vor — in Stufe 1 (Charaktere) und Stufe 2 (einfache Regler)
//  war die ganze Ebene unsichtbar. Genau das schließt der Baukasten-Grundsatz
//  aus: „eine Einstellung, die nur in Stufe 3 auftaucht, ist nicht fertig."
//  Sie zwingt jeden, der sie nutzen will, in die Profi-Ansicht.
//
//  Ein Eintrag ist ein BÜNDEL, keine Einzeleinstellung — dieselbe Idee wie bei
//  den Stufen in `einfachRegler.js` und den ASPEKTEN in `presetMerge.js`:
//  zusammengehörige Werte wandern gemeinsam, damit keine unvermessene
//  Kombination entsteht.
//
//  ⚠️ **`wirkrichtung` ist ABGELEITET, nicht gemessen** — deshalb steht
//  `gemessen: false` daran. Sie sagt, WEN ein Eintrag seiner Bauart nach
//  begünstigt (wer zurückliegt → ausgleichend, wer trifft → verstärkend), und
//  das ist eine Aussage über den Auslöser, keine über die Endpunkte. Die
//  Messung (Streuung der Endpunkte + `aufholFlipQuote`) gehört in den
//  Balance-Durchgang am Ende und ersetzt das Feld dann. So herum ist es eine
//  ehrliche Einordnung; als „gemessen" behauptet wäre es eine Erfindung.
export const EREIGNIS_PRESETS = [
  {
    key: "aus",
    label: "Nichts nebenbei",
    text: "Joker gibt es nur vom Admin. Kein Ereignis, keine Nebenrechnung.",
    wirkrichtung: "neutral", gemessen: false,
    ereignisse: { enabled: false, maxErspielt: 5, aktive: [] },
  },
  {
    key: "dranbleiben",
    label: "Dranbleiben lohnt sich",
    text: "Wer regelmäßig tippt, verdient sich Joker — unabhängig davon, wie gut er tippt.",
    // Die harmloseste Sorte: sie belohnt Teilnahme, nicht Können. Damit
    // bevorzugt sie niemanden, der ohnehin vorn liegt.
    wirkrichtung: "neutral", gemessen: false,
    ereignisse: {
      enabled: true, maxErspielt: 6,
      aktive: [
        { key: "serie", anzahl: 3, belohnung: 1, wirkung: { typ: "joker", n: 1 }, abstand: 2, maxProSaison: 0 },
        { key: "spieltag-komplett", belohnung: 1, wirkung: { typ: "joker", n: 1 }, abstand: 0, maxProSaison: 6 },
      ],
    },
  },
  {
    key: "ausgleich",
    label: "Wer hinten liegt, bekommt etwas",
    text: "Der Letzte eines Spieltags bekommt einen Trost-Joker. Niemand ist nach zehn Spieltagen raus.",
    wirkrichtung: "ausgleichend", gemessen: false,
    ereignisse: {
      enabled: true, maxErspielt: 5,
      // `abstand: 2`: ohne Abklingzeit kassiert derselbe Spieler jede Woche.
      aktive: [{ key: "letzter-am-spieltag", belohnung: 1, wirkung: { typ: "joker", n: 1 }, abstand: 2, maxProSaison: 0,
        auswahl: { modus: "rang", ende: "unten", n: 1, prozent: 20 } }],
    },
  },
  {
    key: "mut",
    label: "Mut wird belohnt",
    text: "Ein getroffener Außenseiter und der erste exakte Treffer bringen einen Joker extra.",
    // ⚠️ Verstärkend: wer gut (oder mutig) tippt, bekommt ZUSÄTZLICH einen
    // Joker, mit dem er wieder besser tippen kann. Gehört in die Bibliothek,
    // aber nicht in eine Ausgleichs-Empfehlung — sichtbar etikettiert statt
    // stillschweigend beigemischt.
    wirkrichtung: "verstärkend", gemessen: false,
    ereignisse: {
      enabled: true, maxErspielt: 5,
      aktive: [
        { key: "aussenseiter", abQuote: 5, belohnung: 1, wirkung: { typ: "joker", n: 1 }, abstand: 0, maxProSaison: 4 },
        { key: "erster-exakter", belohnung: 1, wirkung: { typ: "joker", n: 1 }, abstand: 0, maxProSaison: 0 },
      ],
    },
  },
  {
    // 🔴 Kostet KEINE Zeile Auswertungs-Code — derselbe Eintrag wie der
    // Trost-Joker, nur mit `ende: "oben"`. Genau dafür ist die WEN-Achse da.
    key: "krone",
    label: "Der Beste des Spieltags",
    text: "Wer einen Spieltag gewinnt, bekommt einen Joker. Eine Auszeichnung, kein Ausgleich.",
    // ⚠️ Verstärkend, und zwar deutlicher als „Mut wird belohnt": wer gut
    // tippt, gewinnt Spieltage und bekommt dafür ein Werkzeug, mit dem er
    // wieder besser tippt. Deshalb `abstand: 3` — ohne Abklingzeit kassiert
    // derselbe Spieler wochenlang.
    wirkrichtung: "verstärkend", gemessen: false,
    ereignisse: {
      enabled: true, maxErspielt: 5,
      aktive: [{ key: "letzter-am-spieltag", belohnung: 1, wirkung: { typ: "joker", n: 1 }, abstand: 3, maxProSaison: 0,
        auswahl: { modus: "rang", ende: "oben", n: 1, prozent: 20 } }],
    },
  },
  {
    key: "alles",
    label: "Ständig passiert etwas",
    text: "Alle fünf Ereignisse an. Es gibt fast jeden Spieltag irgendwo eine Gutschrift.",
    wirkrichtung: "gemischt", gemessen: false,
    ereignisse: {
      enabled: true, maxErspielt: 10,
      aktive: [
        { key: "serie", anzahl: 3, belohnung: 1, wirkung: { typ: "joker", n: 1 }, abstand: 2, maxProSaison: 0 },
        { key: "spieltag-komplett", belohnung: 1, wirkung: { typ: "joker", n: 1 }, abstand: 0, maxProSaison: 8 },
        { key: "letzter-am-spieltag", belohnung: 1, wirkung: { typ: "joker", n: 1 }, abstand: 2, maxProSaison: 0,
          auswahl: { modus: "rang", ende: "unten", n: 1, prozent: 20 } },
        { key: "aussenseiter", abQuote: 5, belohnung: 1, wirkung: { typ: "joker", n: 1 }, abstand: 0, maxProSaison: 4 },
        { key: "erster-exakter", belohnung: 1, wirkung: { typ: "joker", n: 1 }, abstand: 0, maxProSaison: 0 },
      ],
    },
  },
];

export const EREIGNIS_PRESET = Object.fromEntries(EREIGNIS_PRESETS.map((p) => [p.key, p]));

export function istAuswertbar(key) {
  const typ = EREIGNIS[key];
  return Boolean(typ) && typ.braucht.every((d) => VERFUEGBARE_DATEN.includes(d));
}

export const AUSWERTBARE_TYPEN = EREIGNIS_TYPEN.filter((e) => istAuswertbar(e.key));

export function sanitizeEreignisse(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const roh = Array.isArray(p.aktive) ? p.aktive : [];
  const gesehen = new Set();
  const aktive = [];

  for (const a of roh) {
    const typ = EREIGNIS[a?.key];
    // Nicht auswertbare Typen fliegen raus statt still nie auszulösen — der
    // Admin soll nichts einschalten können, das folgenlos bleibt.
    if (!typ || !istAuswertbar(typ.key) || gesehen.has(typ.key)) continue;
    gesehen.add(typ.key);

    const eintrag = {
      key: typ.key,
      belohnung: Math.round(clamp(a.belohnung, EREIGNIS_LIMITS.belohnung, typ.standard.belohnung)),
    };
    // 🔴 Die WAS-Achse. Ohne Angabe gilt weiter „so viele Joker wie
    // `belohnung`" — dadurch ist kein bestehendes Regelwerk betroffen und
    // kein Creator-Code ändert stillschweigend seine Bedeutung. Ein
    // ausdrücklich gesetztes `wirkung` gewinnt.
    //
    // ⚠️ `belohnung` bleibt daneben stehen und ist NICHT redundant: es ist
    // die Zahl, gegen die `maxErspielt` deckelt. Bei einer Nicht-Joker-Wirkung
    // wird sie unten auf 0 gesetzt, damit eine Punkte-Gutschrift nicht den
    // JOKER-Deckel aufzehrt (der Topf-Vertrag aus `wirkung.js`).
    eintrag.wirkung = sanitizeWirkung(a.wirkung, { typ: "joker", n: eintrag.belohnung });
    if (eintrag.wirkung.typ !== "joker") eintrag.belohnung = 0;
    if (typ.parameter.includes("anzahl")) {
      eintrag.anzahl = Math.round(clamp(a.anzahl, EREIGNIS_LIMITS.anzahl, typ.standard.anzahl));
    }
    if (typ.parameter.includes("abQuote")) {
      eintrag.abQuote = +clamp(a.abQuote, EREIGNIS_LIMITS.abQuote, typ.standard.abQuote).toFixed(1);
    }
    if (typ.parameter.includes("auswahl")) {
      eintrag.auswahl = sanitizeAuswahl(a.auswahl, typ.standard.auswahl);
    }
    // Die Begrenzer gelten für JEDEN Typ, nicht nur für die, die sie in
    // `parameter` führen — sie sind keine Eigenschaft des Ereignisses, sondern
    // eine Grenze, die der Admin ihm setzt. Vorgabe 0 = aus.
    eintrag.abstand = Math.round(clamp(a.abstand, EREIGNIS_LIMITS.abstand, 0));
    eintrag.maxProSaison = Math.round(clamp(a.maxProSaison, EREIGNIS_LIMITS.maxProSaison, 0));
    aktive.push(eintrag);
  }

  return {
    enabled: p.enabled === true && aktive.length > 0,
    maxErspielt: Math.round(clamp(p.maxErspielt, EREIGNIS_LIMITS.maxErspielt, DEFAULT_EREIGNISSE.maxErspielt)),
    aktive,
  };
}

// ── Auswertung ──────────────────────────────────────────────

// ⚠️ Ein Spieltag ist erst mit dem WETTBEWERB eindeutig. Über die nackte Zahl
// gruppiert verschmolzen Bundesliga-, Premier-League- und CL-Spieltag 1 zu
// EINEM Spieltag — mit zwei sichtbaren Folgen: „alle Spiele des Spieltags
// getippt" verlangte plötzlich ~35 statt 9 Spiele und löste nie mehr aus, und
// der Trost-Joker suchte den Letzten über fünf Wettbewerbe hinweg.
// Geordnet wird chronologisch über `spieltageChronologisch` (eine Quelle,
// dieselbe wie im Ranking-Verlauf).

// Wie viele Spiele hatte ein Spieltag? Aus den Tipps ALLER Mitspieler
// abgeleitet — die Einträge eines einzelnen Nutzers wissen nicht, was er
// ausgelassen hat. Das ist eine Untergrenze: ein Spiel, das niemand getippt
// hat, taucht nicht auf. Für „hat alles getippt" ist das die faire Lesart.
function spieleJeSpieltag(alleEintraege, keyVon = spieltagKey) {
  const map = new Map();
  for (const e of alleEintraege) {
    if (!Number.isFinite(e.matchday)) continue;
    const key = keyVon(e);
    if (!map.has(key)) map.set(key, { wettbewerb: e.wettbewerb ?? null, matchday: e.matchday, ids: new Set() });
    map.get(key).ids.add(e.matchId ?? `${e.snapshot?.matchId}`);
  }
  return map;
}

const istExakt = (e) =>
  e?.result && e?.tip && e.tip.home === e.result.home && e.tip.away === e.result.away;

// Hat der Tipp den Sieger richtig — und war der ein Außenseiter?
function aussenseiterTreffer(e, abQuote) {
  if (!e?.result || !e?.tip) return false;
  const realHeim = e.result.home > e.result.away;
  const realGast = e.result.away > e.result.home;
  if (!realHeim && !realGast) return false;             // Remis zählt nicht
  const getipptHeim = e.tip.home > e.tip.away;
  const getipptGast = e.tip.away > e.tip.home;
  if (realHeim !== getipptHeim || realGast !== getipptGast) return false;
  const quote = realHeim ? e.snapshot?.winner?.home : e.snapshot?.winner?.away;
  return Number.isFinite(quote) && quote >= abQuote;
}

// Alle Gutschriften eines Nutzers — chronologisch, damit der Deckel die
// SPÄTEREN abschneidet und nicht willkürlich mittendrin.
export function auswerten({
  eintraege = [], alleEintraege = null, ereignisse = DEFAULT_EREIGNISSE,
  spieltagsPunkte = null, schluessel = null,
} = {}) {
  const cfg = sanitizeEreignisse(ereignisse);
  if (!cfg.enabled) return { gutschriften: [], gesamt: 0, gedeckelt: false, verworfen: 0 };

  const alle = alleEintraege ?? eintraege;
  const meine = eintraege;
  const roh = [];
  const aktiv = (key) => cfg.aktive.find((a) => a.key === key);
  // 🔴 Der Spieltag DER RUNDE, sobald eine Achse mitkommt (`rundenSchluessel`).
  // Ohne sie der Liga-Spieltag — kein stiller Regelwechsel, und bei einem
  // einzigen Wettbewerb sind beide deckungsgleich. Über Liga-Spieltage
  // geschlüsselt vergäbe eine Runde über fünf Wettbewerbe fünf Trost-Joker pro
  // Woche statt einem, und „drei Spieltage in Folge" zählte eine andere Folge
  // als die Zeitachse daneben. Gemessen am 06.08.2026 fielen selbst in einer
  // reinen Bundesliga-Runde 5 Liga- auf 4 Runden-Spieltage zusammen.
  const keyVon = typeof schluessel === "function" ? schluessel : spieltagKey;

  // Serie: Spieltage in Folge. Zählt bei jedem Erreichen erneut, damit eine
  // lange Serie nicht nach dem ersten Mal wertlos wird.
  // Reihenfolge und Position aller Spieltage — eine Quelle für alles unten.
  const reihenfolge = spieltageChronologisch(alle, keyVon);
  const posVon = new Map(reihenfolge.map((s, i) => [s.key, i]));
  const pos = (e) => posVon.get(keyVon(e)) ?? -1;

  const serie = aktiv("serie");
  if (serie) {
    const getippt = new Set(meine.filter((e) => Number.isFinite(e.matchday)).map(keyVon));
    let lauf = 0;
    // Chronologisch, wettbewerbsübergreifend: „dranbleiben" heißt, keinen
    // Spieltag auszulassen, der in der Runde überhaupt anstand — auch keinen
    // aus einem zweiten Wettbewerb.
    for (const s of reihenfolge) {
      if (!getippt.has(s.key)) { lauf = 0; continue; }
      lauf++;
      if (lauf % serie.anzahl === 0) {
        roh.push({ key: "serie", wettbewerb: s.wettbewerb, matchday: s.matchday, belohnung: serie.belohnung,
          text: `${serie.anzahl} Spieltage in Folge getippt` });
      }
    }
  }

  // Erster exakter Treffer — genau einmal.
  const exakt = aktiv("erster-exakter");
  if (exakt) {
    const treffer = meine.filter(istExakt).sort((a, b) => pos(a) - pos(b))[0];
    if (treffer) {
      roh.push({ key: "erster-exakter", wettbewerb: treffer.wettbewerb ?? null, matchday: treffer.matchday,
        belohnung: exakt.belohnung, text: "erster exakter Treffer" });
    }
  }

  // Außenseiter-Sieg richtig getippt.
  const aus = aktiv("aussenseiter");
  if (aus) {
    for (const e of meine) {
      if (!aussenseiterTreffer(e, aus.abQuote)) continue;
      roh.push({ key: "aussenseiter", wettbewerb: e.wettbewerb ?? null, matchday: e.matchday,
        belohnung: aus.belohnung, text: `Außenseiter-Sieg ab Quote ${aus.abQuote} vorhergesagt` });
    }
  }

  // Spieltag vollständig getippt.
  const komplett = aktiv("spieltag-komplett");
  if (komplett) {
    const proSpieltag = spieleJeSpieltag(alle, keyVon);
    const meineProSpieltag = spieleJeSpieltag(meine, keyVon);
    for (const [key, s] of proSpieltag) {
      const meins = meineProSpieltag.get(key);
      if (meins && meins.ids.size >= s.ids.size) {
        roh.push({ key: "spieltag-komplett", wettbewerb: s.wettbewerb, matchday: s.matchday,
          belohnung: komplett.belohnung, text: "alle Spiele des Spieltags getippt" });
      }
    }
  }

  // Trost-Joker: braucht die Spieltagspunkte, die nur die Wertung kennt —
  // deshalb reicht der Aufrufer sie herein, statt dass diese Datei scort.
  const trost = aktiv("letzter-am-spieltag");
  if (trost && Array.isArray(spieltagsPunkte) && spieltagsPunkte.length) {
    const meineId = meine[0]?.userId;
    const jeSpieltag = new Map();
    for (const p of spieltagsPunkte) {
      const key = keyVon(p);
      if (!jeSpieltag.has(key)) jeSpieltag.set(key, { wettbewerb: p.wettbewerb ?? null, matchday: p.matchday, summe: new Map() });
      const g = jeSpieltag.get(key);
      // ⚠️ AUFSUMMIERT je Nutzer, nicht angehängt. Fallen zwei Liga-Spieltage
      // in denselben Runden-Spieltag, steht jeder Spieler zweimal in der Liste
      // — `Math.min` fände dann den schlechteren EINZELTAG statt der Bilanz des
      // Runden-Spieltags, und „Letzter" wäre jemand anderes als in der Tabelle.
      g.summe.set(p.userId, (g.summe.get(p.userId) ?? 0) + (Number(p.punkte) || 0));
      // Der frühere Liga-Spieltag vertritt die Gruppe (siehe
      // `spieltageChronologisch`), damit die Screens ihn wiedererkennen.
      if (p.matchday != null && (g.matchday == null || p.matchday < g.matchday)) {
        g.matchday = p.matchday; g.wettbewerb = p.wettbewerb ?? null;
      }
    }
    const auswahl = sanitizeAuswahl(trost.auswahl, EREIGNIS["letzter-am-spieltag"].standard.auswahl);
    const satz = beschreibeAuswahl(auswahl);
    for (const s of jeSpieltag.values()) {
      const liste = [...s.summe.entries()].map(([userId, punkte]) => ({ userId, punkte }));
      if (liste.length < 2) continue;   // allein ist man weder Erster noch Letzter

      // 🔴 WEN es trifft, entscheidet `auswahl.js` — dieselbe Funktion, die
      // auch jede künftige Mechanik benutzen wird. Vorher stand hier eine fest
      // verdrahtete Min-Suche; damit gab es die Auswahl-Achse nur auf dem
      // Papier.
      //
      // ⚠️ `total` statt `punkte`, weil `waehleBetroffene` das Board-Format
      // erwartet und danach sortiert. `bezug: "spieltag"` sagt: dieser Stand
      // ist der EINE Spieltag, nicht die Saisontabelle.
      const stand = liste.map((p) => ({ userId: p.userId, name: p.userId, total: p.punkte }));
      const getroffen = waehleBetroffene({
        modus: auswahl.modus, ende: auswahl.ende, n: auswahl.n, prozent: auswahl.prozent,
        bezug: "spieltag", spieltagStand: stand, mitglieder: liste.map((p) => p.userId),
      });
      if (!getroffen.includes(meineId)) continue;

      // ⚠️ UND die Gleichstands-Regel bleibt — sie ist keine Doppelung von
      // `auswahl.js`, sondern etwas anderes. `waehleBetroffene` löst einen
      // Gleichstand deterministisch über den Namen auf; das ist für eine
      // AUSWAHL richtig (sie muss reproduzierbar sein), für eine BELOHNUNG an
      // der Grenze aber nicht: wer bei gleicher Punktzahl den Joker bekommt,
      // hinge dann am Alphabet. Punktgleich an der Kante heißt: niemand.
      const meinWert = s.summe.get(meineId);
      const grenzWert = auswahl.ende === "oben"
        ? Math.max(...liste.map((p) => p.punkte))
        : Math.min(...liste.map((p) => p.punkte));
      const teiltDieKante = liste.filter((p) => p.punkte === meinWert).length > 1;
      if (meinWert === grenzWert && teiltDieKante) continue;

      roh.push({ key: "letzter-am-spieltag", wettbewerb: s.wettbewerb, matchday: s.matchday,
        belohnung: trost.belohnung, text: `Auszeichnung am Spieltag: ${satz}` });
    }
  }

  // ── Die WAS-Achse an jeden Vorgang hängen ───────────────────
  // An EINER Stelle statt an sechs `roh.push`-Aufrufen — sonst hätte die
  // nächste neue Ereignisart die Zeile vergessen, und ihre Wirkung wäre
  // stillschweigend wieder „ein Joker".
  //
  // 🔴 `belohnung` wird hier aus der Wirkung ABGELEITET und nicht daneben
  // gepflegt: es ist die Zahl, gegen die `maxErspielt` deckelt, und der ist
  // ein JOKER-Deckel. Eine Punkte-Gutschrift oder ein Aufschlag zehrt ihn
  // deshalb nicht auf — sie bringen ihren eigenen Topf mit (Topf-Vertrag in
  // `wirkung.js`). Zwei Zahlen für dieselbe Sache wären genau die zweite
  // Wahrheit, vor der die Runden-Schicht warnt.
  for (const g of roh) {
    const cfgE = cfg.aktive.find((a) => a.key === g.key);
    g.wirkung = cfgE?.wirkung ?? sanitizeWirkung(null, { typ: "joker", n: g.belohnung ?? 1 });
    g.belohnung = g.wirkung.typ === "joker" ? (g.wirkung.n ?? 0) : 0;
    g.wirkungText = beschreibeWirkung(g.wirkung);
  }

  // Chronologisch, damit der Deckel die SPÄTEREN abschneidet. Spieltage, die in
  // `alle` nicht vorkommen, landen über pos = -1 vorn — das betrifft nur
  // konstruierte Fälle und bleibt deterministisch.
  roh.sort((a, b) => pos(a) - pos(b) || a.key.localeCompare(b.key));

  // ── Begrenzer JE EREIGNIS, vor dem Gesamtdeckel ─────────────
  // `maxErspielt` deckelt die SUMME und sagt nichts darüber, wie oft ein
  // EINZELNES Ereignis feuert. Genau dort sitzt die farmbare Serie: „drei
  // Spieltage in Folge getippt" zahlt sonst an jedem dritten Spieltag, und wer
  // einmal drin ist, bleibt drin. Zwei Begrenzer reichen dagegen:
  //
  //   abstand      — Abklingzeit: nach einem Treffer n Spieltage Ruhe
  //   maxProSaison — wie oft dieses Ereignis überhaupt zahlt
  //
  // Beide greifen CHRONOLOGISCH, aus demselben Grund wie der Gesamtdeckel: die
  // früh verdienten zählen, sonst hinge das Ergebnis an der Sortierung.
  const zuletzt = new Map();   // key → Position des letzten Treffers
  const gezaehlt = new Map();  // key → wie oft schon gezahlt
  const erlaubt = [];
  let gebremst = 0;
  for (const g of roh) {
    const cfgE = cfg.aktive.find((a) => a.key === g.key) ?? {};
    const p = pos(g);
    const vor = zuletzt.get(g.key);
    const zuFrueh = cfgE.abstand > 0 && vor != null && p - vor < cfgE.abstand;
    const zuOft = cfgE.maxProSaison > 0 && (gezaehlt.get(g.key) ?? 0) >= cfgE.maxProSaison;
    if (zuFrueh || zuOft) { gebremst++; continue; }
    zuletzt.set(g.key, p);
    gezaehlt.set(g.key, (gezaehlt.get(g.key) ?? 0) + 1);
    erlaubt.push(g);
  }

  const gutschriften = [];
  let gesamt = 0;
  let verworfen = 0;
  for (const g of erlaubt) {
    if (gesamt + g.belohnung > cfg.maxErspielt) { verworfen++; continue; }
    gutschriften.push(g);
    gesamt += g.belohnung;
  }
  // `gebremst` und `verworfen` bleiben getrennt: das eine ist eine Regel des
  // Ereignisses, das andere der Gesamtdeckel. Wer sie zusammenwirft, kann dem
  // Admin nicht sagen, an welcher Schraube er drehen muss.
  return { gutschriften, gesamt, gedeckelt: verworfen > 0, verworfen, gebremst };
}

// ── Konflikte mit anderen Regeln ────────────────────────────
// Ein Ereignis kann für sich harmlos sein und trotzdem eine bestehende Regel
// verdoppeln. Der Trost-Joker ist genau so ein Fall: der Aufhol-Mechanismus
// belohnt Zurückliegen bereits.
export function konflikte(rules) {
  const cfg = sanitizeEreignisse(rules?.ereignisse);
  const out = [];
  if (!cfg.enabled) return out;
  for (const a of cfg.aktive) {
    const typ = EREIGNIS[a.key];
    // 🔴 Nur wenn tatsächlich nach UNTEN ausgezeichnet wird. Seit die WEN-Achse
    // dranhängt, kann derselbe Eintrag auch die Spieltags-Krone sein — und die
    // verdoppelt gar nichts, sie tut das Gegenteil. Eine Warnung, die auch im
    // umgekehrten Fall anschlägt, wird nach dem dritten Mal überlesen.
    const nachUnten = !a.auswahl || a.auswahl.ende === "unten";
    if (typ?.doppeltMit === "aufholen" && rules?.aufholen?.enabled && nachUnten) {
      out.push({
        key: a.key,
        text: "Trost-Joker und Anschluss-Bonus belohnen beide das Zurückliegen — zusammen wird es doppelt belohnt. Eines von beiden genügt.",
      });
    }
  }
  return out;
}

export function beschreibeEreignisse(ereignisse) {
  const cfg = sanitizeEreignisse(ereignisse);
  if (!cfg.enabled) return "Joker gibt es nur vom Admin.";
  const namen = cfg.aktive.map((a) => EREIGNIS[a.key]?.label).filter(Boolean);
  return `${namen.length} Ereignis${namen.length === 1 ? "" : "se"}, höchstens ${cfg.maxErspielt} erspielte Joker pro Saison.`;
}

// ── Die Nicht-Joker-Wirkungen, für den VERLAUF ──────────────
// 🔴 Warum es diese Funktion gibt: `auswerten()` liefert Gutschriften JE
// NUTZER, und für einen Joker genügt das — er landet im Kontingent dieses
// Spielers. Eine Umverteilung geht so aber nicht: dort ist die andere Hälfte
// des Vorgangs bei ALLEN ANDEREN, und die kennt ein Ein-Nutzer-Lauf nicht.
//
// Diese Funktion läuft deshalb einmal über die ganze Runde, sammelt die
// Wirkungen je Spieltag ein und lässt `wendeAn()` (wirkung.js) EINMAL je
// Gruppe rechnen. Ergebnis ist eine flache Liste von Vorgängen, die
// `applyEreignisWirkungen` in `engine.js` in den Verlauf einrechnet —
// dieselbe Bauart wie `duellVorgaenge`/`applyDuellJoker`.
//
// ⚠️ Joker-Wirkungen kommen hier NICHT vor. Sie haben ihren eigenen, längst
// gebauten Weg über `erspielteJoker`/`jokerKontingent.js`, und eine zweite
// Buchung derselben Gutschrift wäre genau die doppelte Wahrheit, vor der die
// Runden-Schicht warnt.
//
// `mitglieder` = alle Nutzer-Ids der Runde. Ohne sie kann `umverteilung`
// niemanden als Empfänger benennen und liefert nichts, statt zu raten.
export function wirkungsVorgaenge({
  alleEintraege = [], ereignisse = DEFAULT_EREIGNISSE, spieltagsPunkte = null,
  schluessel = null, mitglieder = [],
} = {}) {
  const cfg = sanitizeEreignisse(ereignisse);
  if (!cfg.enabled) return [];
  // Kein einziges Nicht-Joker-Ereignis? Dann gibt es hier nichts zu tun, und
  // der ganze Durchlauf über alle Nutzer entfällt.
  if (!cfg.aktive.some((a) => a.wirkung?.typ && a.wirkung.typ !== "joker")) return [];

  const nutzer = [...new Set(alleEintraege.map((e) => e.userId).filter((x) => x != null))];
  const keyVon = typeof schluessel === "function" ? schluessel : spieltagKey;

  // Alle Nicht-Joker-Gutschriften einsammeln, gruppiert nach Spieltag +
  // Ereignis. Die Gruppe ist der Punkt: für `umverteilung` sind ALLE
  // Ausgezeichneten dieses Spieltags gemeinsam die Geber.
  const gruppen = new Map();
  for (const userId of nutzer) {
    const meine = alleEintraege.filter((e) => e.userId === userId);
    const r = auswerten({
      eintraege: meine, alleEintraege, ereignisse: cfg, spieltagsPunkte, schluessel,
    });
    for (const g of r.gutschriften) {
      if (!g.wirkung || g.wirkung.typ === "joker") continue;
      const k = `${g.wettbewerb ?? ""}|${g.matchday}|${g.key}`;
      if (!gruppen.has(k)) {
        gruppen.set(k, {
          wettbewerb: g.wettbewerb, matchday: g.matchday, key: g.key,
          wirkung: g.wirkung, text: g.text, userIds: [],
        });
      }
      gruppen.get(k).userIds.push(userId);
    }
  }
  if (!gruppen.size) return [];

  // Spieltagspunkte je Spieltag umschlüsseln — `wendeAn` erwartet
  // `{ [userId]: Punkte DIESES Spieltags }`.
  const punkteJe = new Map();
  for (const p of spieltagsPunkte ?? []) {
    const k = keyVon(p);
    if (!punkteJe.has(k)) punkteJe.set(k, {});
    punkteJe.get(k)[p.userId] = p.punkte;
  }

  // Chronologisch, damit der Saison-Deckel einer Punkte-Wirkung die SPÄTEREN
  // abschneidet — dieselbe Regel wie beim Gesamtdeckel oben.
  const sortiert = [...gruppen.values()].sort((a, b) =>
    (a.matchday ?? 0) - (b.matchday ?? 0) || a.key.localeCompare(b.key));

  const bisher = new Map();   // Ereignis-Key → schon vergebene Punkte
  const out = [];
  for (const gr of sortiert) {
    const vorgaenge = wendeAn({
      wirkung: gr.wirkung,
      betroffene: gr.userIds,
      mitglieder: mitglieder.length ? mitglieder : nutzer,
      spieltagsPunkte: punkteJe.get(keyVon(gr)) ?? null,
      bisherPunkte: bisher.get(gr.key) ?? 0,
    });
    let vergeben = 0;
    for (const v of vorgaenge) {
      if (v.punkte > 0) vergeben += v.punkte;
      out.push({ ...v, wettbewerb: gr.wettbewerb, matchday: gr.matchday, key: gr.key, ereignisText: gr.text });
    }
    // Nur positive Gutschriften zählen gegen den Deckel: bei einer
    // Umverteilung stünde sonst die Empfängerseite gegen ihn, obwohl sie
    // gar nichts erzeugt hat.
    bisher.set(gr.key, (bisher.get(gr.key) ?? 0) + vergeben);
  }
  return out;
}

// ── Die Vorgänge in den VERLAUF einrechnen ──────────────────
// Bauart wörtlich wie `applyDuellJoker` und `applySaisonform`: der Verlauf
// hält kumulative Summen, die Wirkung passiert aber INNERHALB eines
// Spieltags. Also: Spieltagspunkte zurückrechnen, verändern, neu aufsummieren.
//
// Reihenfolge der beiden Arten ist NICHT beliebig:
//   1. `faktor` (bonus/malus) — er wiegt die Leistung DIESES Spieltags.
//   2. `punkte` — eine feste Gutschrift danach, damit ein Aufschlag nicht
//      auch noch die Gutschrift vergrößert. Andersherum hinge der Wert einer
//      festen Zahl davon ab, ob zufällig ein Bonus danebenliegt.
//
// Ohne Vorgänge wird der Verlauf UNVERÄNDERT zurückgegeben (`return verlauf`)
// — wie bei `applyCatchup`, `applySaisonform` und `applyDuellJoker`.
export function applyEreignisWirkungen(verlauf = [], vorgaenge = []) {
  const liste = Array.isArray(vorgaenge) ? vorgaenge : [];
  if (!Array.isArray(verlauf) || verlauf.length === 0 || liste.length === 0) return verlauf;

  // Verlaufs-Position je Spieltag: die Vorgänge tragen `wettbewerb`+`matchday`,
  // der Verlauf ist chronologisch geordnet. Über die nackte Zahl gesucht
  // träfe „Spieltag 1" fünf Wettbewerbe auf einmal.
  const posVon = new Map();
  verlauf.forEach((s, i) => posVon.set(spieltagKey(s), i));

  const proNutzer = new Map();   // userId -> [Punkte je Spieltag]
  verlauf.forEach((stufe, i) => {
    const vorher = i > 0 ? verlauf[i - 1].board : [];
    const vorSumme = new Map(vorher.map((z) => [z.userId, z.total]));
    for (const z of stufe.board) {
      if (!proNutzer.has(z.userId)) proNutzer.set(z.userId, []);
      proNutzer.get(z.userId).push(z.total - (vorSumme.get(z.userId) ?? 0));
    }
  });

  const faktoren = new Map();   // "idx|userId" -> Faktor
  const summanden = new Map();  // "idx|userId" -> Punkte
  let etwas = false;
  for (const v of liste) {
    const idx = posVon.get(spieltagKey(v));
    if (idx == null || !proNutzer.has(v.userId)) continue;
    const k = `${idx}|${v.userId}`;
    if (v.faktor != null && v.faktor !== 1) {
      faktoren.set(k, (faktoren.get(k) ?? 1) * v.faktor);
      etwas = true;
    }
    if (v.punkte) {
      summanden.set(k, (summanden.get(k) ?? 0) + v.punkte);
      etwas = true;
    }
  }
  if (!etwas) return verlauf;

  for (const [userId, tage] of proNutzer) {
    for (let i = 0; i < tage.length; i++) {
      const k = `${i}|${userId}`;
      const f = faktoren.get(k);
      if (f != null) tage[i] = tage[i] * f;
      const s = summanden.get(k);
      if (s != null) tage[i] = tage[i] + s;
    }
  }

  return verlauf.map((stufe, i) => ({
    ...stufe,
    board: stufe.board
      .map((z) => {
        const tage = proNutzer.get(z.userId) ?? [];
        const total = tage.slice(0, i + 1).reduce((s, p) => s + p, 0);
        // GERUNDET wie in `applySaisonform`/`applyDuellJoker`: der Wert landet
        // direkt im Ranking, und ein Bruchteil steht dort in einer Tabelle,
        // in der jede andere Zahl ganzzahlig ist. Die Marke daneben, damit ein
        // Spieler eine Summe erklärt bekommt, zu der seine Tipps nicht führen.
        const gerundet = Math.round(total);
        return { ...z, total: gerundet, ereignis: gerundet - Math.round(z.total) };
      })
      .sort((a, b) => b.total - a.total || String(a.name ?? "").localeCompare(String(b.name ?? ""))),
  }));
}
