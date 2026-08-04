// ============================================================
//  JOKER-GRUNDFORM — die Form, die jeder Joker trägt
//
//  Sechs Dimensionen wiederholen sich bei JEDEM Joker: wer darf, wer sieht es,
//  wann verfällt er, worauf gilt er, bis wann änderbar, wie viele auf ein
//  Spiel. Bisher stecken sie einzeln im Duell-Joker oder nirgends — wenn
//  jeder neue Typ sie neu erfindet, hat der Admin am Ende elf Sonderfälle
//  statt eines Systems (design/joker-grundform.md).
//
//  ── ⚠️ EINE Karte, geschlüsselt nach Joker-Art — kein Feld je Modul ──
//  `rules.jokerBasis = { standard: {…}, "duell.klau": {…} }`. `jokerBudget.js`
//  (`preise`) und `limitKlassen.js` (`mitglieder`) sind bereits über
//  `jokerArt` geschlüsselt (`JOKER_ARTEN` aus `jokerBudget.js`, hier
//  IMPORTIERT statt nachgebaut) — eine dritte Karte über denselben
//  Schlüsseln ist ein Modell, das man einmal versteht. Nur `basisFuer()` darf
//  `rules.jokerBasis` lesen; kein anderes Modul greift direkt zu, sonst
//  entstehen zwei Auflösungswege für dieselbe Frage.
//
//  ── ⚠️ Die wichtigste Festlegung: `bedingung.minQuote`/`maxQuote` ──
//  Sie messen die Außenseiter-Siegquote DES SPIELS (die höhere der beiden
//  Siegquoten aus `snap.winner`), NIE die Quote des getippten Ausgangs.
//  Begründung ist Architektur-Regel 4 aus CLAUDE.md („Anker immer auf der
//  Quote des REALEN Ergebnisses, nie auf der getippten — sonst wird die
//  Nähe-Belohnung farmbar"): hinge die Bedingung am eigenen Tipp, tippte man
//  einen aussichtslosen Ausgang nur, um den Joker freizuschalten, und legte
//  ihn dann auf das, was man wirklich erwartet. Die Spiel-Quote ist objektiv
//  und für alle gleich — deshalb nimmt `erfuelltBedingung` gar keinen Tipp
//  entgegen, sondern nur den Quoten-Snapshot des Spiels.
//
//  ── ⚠️ `widerruf: "bisStunden"` reicht NIE über Anpfiff hinaus ──
//  Dieselbe Kante wie der eingefrorene Quoten-Snapshot und das Tippfenster
//  (`tippfenster.js`): am Anpfiff selbst ist ohnehin Schluss, unabhängig
//  davon, was `widerrufStunden` sagt.
//
//  ── Abgrenzung zu `limitKlassen` (2.1) ──
//  `wer` regelt, ob eine Art überhaupt eingesetzt werden darf — genau EINE
//  Art, nichts wird gezählt. Eine Limitierungsklasse regelt, wie OFT, geteilt
//  mit anderen Arten, gegen ein Kontingent gezählt. Beide dürfen auf
//  dieselbe Bedingung gehen (z. B. Rückstand) — `konflikte()` meldet das als
//  doppelte Absicherung, sperrt aber nichts.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { JOKER_ARTEN } from "./jokerBudget";
import { sanitizeLimitKlassen } from "./limitKlassen";

// ── Kataloge ────────────────────────────────────────────────

// K1 (Abnahme 31.07., design/drehrad.md Abschnitt 3b (a)): `nurVollstaendigGetippt`
// wandert HIERHER statt in einem zweiten `wer`-Katalog im Drehrad zu leben —
// das ist eine allgemeine Frage, kein Rad-Sonderfall: auch ein Joker kann
// verlangen, dass der Spieltag KOMPLETT getippt wurde. ⚠️ Nicht zu verwechseln
// mit der Invariante 5.0 („kein Joker ohne Tipp", weiter unten) — die verlangt
// ÜBERHAUPT einen Tipp, dieser Wert verlangt ALLE Spiele des Spieltags.
// `darfEinsetzen` liest dafür `kontext.alleGetippt` (neben dem bestehenden
// `hatGetippt`). Fehlt `alleGetippt`, gilt es wie `false`.
export const WER = [
  { key: "alle", label: "Alle", desc: "Jeder darf einsetzen. Vorgabe." },
  { key: "abPlatz", label: "Ab Tabellenplatz", desc: "Nur ab dem eingestellten Tabellenplatz abwärts." },
  { key: "abRueckstand", label: "Ab Rückstand", desc: "Nur wer weit genug hinter Platz 1 liegt." },
  { key: "adminFreigabe", label: "Admin-Freigabe", desc: "Der Admin schaltet je Spieltag frei." },
  { key: "nurVollstaendigGetippt", label: "Nur vollständig getippt", desc: "Nur wer ALLE Spiele des Spieltags getippt hat." },
];

export const SICHT = [
  { key: "sofort", label: "Sofort", desc: "Der Einsatz ist sofort für alle sichtbar." },
  { key: "nachAnpfiff", label: "Nach Anpfiff", desc: "Sichtbar erst nach Anpfiff. Vorgabe." },
  { key: "nachAuswertung", label: "Nach Auswertung", desc: "Sichtbar erst mit der Auswertung." },
];

export const VERFALL = [
  { key: "periode", label: "Je Periode", desc: "Ein ungenutzter Joker verfällt am Ende der Periode." },
  { key: "saison", label: "Saison", desc: "Verfällt erst am Saisonende. Vorgabe." },
  { key: "wandert", label: "Wandert", desc: "Ein ungenutzter Joker wandert unverbraucht in die nächste Periode." },
];

export const WIDERRUF = [
  { key: "bisAnpfiff", label: "Bis Anpfiff", desc: "Änderbar bis zum Anpfiff des Spiels. Vorgabe." },
  { key: "bisStunden", label: "Bis X Stunden vorher", desc: "Änderbar bis zu den eingestellten Stunden vor Anpfiff — nie darüber hinaus." },
  { key: "sofortVerbindlich", label: "Sofort verbindlich", desc: "Kein Widerruf möglich, sobald gesetzt." },
];

// 5.1 (design/joker-grundform.md Abschnitt 5.1): löst die heute fest
// verdrahtete Symmetrie ab („wirkt symmetrisch, auch auf ein Minus").
export const SYMMETRIE = [
  { key: "beidseitig", label: "Beidseitig", desc: "Verdoppelt Gewinn UND Verlust. Vorgabe, heutiges Verhalten." },
  { key: "nurGewinn", label: "Nur Gewinn", desc: "Wirkt nur nach oben — risikolos." },
  { key: "nurVerlust", label: "Nur Verlust", desc: "Wirkt nur nach unten — der Malus-Joker, den ein Mitspieler verhängt." },
];

// 5.4 (design/joker-grundform.md Abschnitt 5.4): wandert sinngemäß aus
// `duellJoker.js`s `UMFANG` hoch — jeder Joker stellt dieselbe Frage, nicht
// nur der Duell-Joker. Bewusst NEU angelegt statt aus `duellJoker.js`
// importiert: `duellJoker.js` gibt diese Felder erst in einem SPÄTEREN Schritt
// ab (Abschnitt 5.4, letzter Satz) — bis dahin bleiben es zwei unabhängige
// Kataloge mit identischem Inhalt, keine Kopplung in die falsche Richtung.
export const UMFANG = [
  { key: "einSpiel", label: "Ein Spiel", desc: "Wirkt nur auf ein einzelnes Spiel. Vorgabe." },
  { key: "nSpiele", label: "Mehrere Spiele", desc: "Wirkt auf eine feste Anzahl Spiele." },
  { key: "spieltag", label: "Ganzer Spieltag", desc: "Wirkt auf den kompletten Spieltag." },
];

// ── Grenzen & Vorgabe ───────────────────────────────────────

export const BASIS_LIMITS = {
  // K2 (Abnahme 31.07., design/joker-grundform.md Abschnitt 4): ZWEI eigene
  // Bereiche statt eines gemeinsamen `werWert` — ein Tabellenplatz (`abPlatz`)
  // und ein Punktrückstand (`abRueckstand`) sind verschiedene Größenordnungen,
  // und `*_LIMITS` speist in diesem Projekt die UI-Regler. Ein Regler bis 500
  // für eine Tabellenposition wäre unbedienbar. Beschnitten wird ERST im
  // Merge (`basisFuer`/`mergeBasis`), wo `wer` und `werWert` beide sicher
  // bekannt sind — die sparse Art-Abweichung reicht den Rohwert unbeschnitten
  // durch (siehe `sanitizeBasisAbweichung`).
  abPlatz: { min: 1, max: 50, step: 1 },
  abRueckstand: { min: 0, max: 500, step: 1 },
  // Außenseiter-Siegquote — dieselbe Spanne wie `EREIGNIS_LIMITS.abQuote`
  // in ereignisse.js, derselbe Quoten-Begriff.
  quote: { min: 2, max: 15, step: 0.5 },
  widerrufStunden: { min: 0, max: 168, step: 1 },
  stapeln: { min: 1, max: 10, step: 1 },
  // 5.2: wie viele man von einer Art HALTEN darf (Inventar), nicht wie viele
  // man einsetzen darf. Kein Vorbild im Plan für die genaue Obergrenze —
  // eigene, moderate Einschätzung, siehe Ausführungsbericht.
  bestand: { min: 0, max: 20, step: 1 },
  // 5.5: löst `duell.abstand` ab (design/joker-ausloeser.md Abschnitt 8).
  // ⚠️ ABSICHTLICH weiter als `DUELL_LIMITS.abstand` (0–6). Jene Spanne stammt
  // aus einem Regler, der nur die Einsätze EINES Jokers entzerren sollte. Hier
  // ist es die allgemeine Sperre je Joker-Art, und ein Admin muss „höchstens
  // einmal pro Halbserie" ausdrücken können — bei 34 Spieltagen sind das 17.
  // Grenzen sind die des ERLAUBTEN, nicht des Empfohlenen (reglerWarnung.js):
  // wer eine harte Sperre will, darf sie setzen.
  abklingzeit: { min: 0, max: 20, step: 1 },
  // 5.4: sinngemäß aus `DUELL_LIMITS.spieleProEinsatz` in duellJoker.js.
  spieleProEinsatz: { min: 1, max: 5, step: 1 },
};

// `wer` → welcher Bereich aus BASIS_LIMITS gilt für `werWert`. `null`, wenn
// `wer` keinen Wert braucht.
function werWertLimits(wer) {
  if (wer === "abPlatz") return BASIS_LIMITS.abPlatz;
  if (wer === "abRueckstand") return BASIS_LIMITS.abRueckstand;
  return null;
}

export const DEFAULT_BASIS = {
  wer: "alle",
  werWert: null,
  sicht: "nachAnpfiff",
  verfall: "saison",
  bedingung: { minQuote: null, maxQuote: null, wettbewerbe: [], phasen: [] },
  widerruf: "bisAnpfiff",
  widerrufStunden: 24,
  stapeln: 1,
  symmetrie: "beidseitig",
  bestand: 0,
  kasseSichtbar: true,
  abklingzeit: 0,
  umfang: "einSpiel",
  spieleProEinsatz: 1,
  wahl: "selbst",
};

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// ── Sanitize: einzelne Felder ───────────────────────────────
// Jedes Feld fällt für sich auf die Vorgabe zurück (Muster
// `sanitizeDuellJoker`). `werWert` ist nur bei `abPlatz`/`abRueckstand`
// gesetzt, sonst `null` — dieselbe „nur wenn gebraucht"-Bauart wie
// `abSpieltag`/`bisSpieltag` in `duellJoker.js`.
function sanitizeWer(v) {
  return WER.some((w) => w.key === v) ? v : DEFAULT_BASIS.wer;
}

function sanitizeWerWert(wer, v) {
  const limits = werWertLimits(wer);
  if (!limits) return null;
  return Math.round(clamp(v, limits, limits.min));
}

function sanitizeSicht(v) {
  return SICHT.some((s) => s.key === v) ? v : DEFAULT_BASIS.sicht;
}

function sanitizeVerfall(v) {
  return VERFALL.some((x) => x.key === v) ? v : DEFAULT_BASIS.verfall;
}

function sanitizeWiderruf(v) {
  return WIDERRUF.some((w) => w.key === v) ? v : DEFAULT_BASIS.widerruf;
}

function sanitizeSymmetrie(v) {
  return SYMMETRIE.some((s) => s.key === v) ? v : DEFAULT_BASIS.symmetrie;
}

function sanitizeUmfang(v) {
  return UMFANG.some((u) => u.key === v) ? v : DEFAULT_BASIS.umfang;
}

// `null`/`undefined` gelten als „keine Vorgabe" (bleiben `null`), dieselbe
// Regel wie bei `abSpieltag` in `sanitizeDuellJoker` — nicht über `Number()`
// jagen, sonst würde `null` fälschlich zu einer Zahl.
function sanitizeBedingung(partial) {
  const o = partial && typeof partial === "object" ? partial : {};
  const leer = (v) => v === null || v === undefined;
  const minRoh = leer(o.minQuote) ? NaN : Number(o.minQuote);
  const maxRoh = leer(o.maxQuote) ? NaN : Number(o.maxQuote);
  const stringListe = (v) => Array.isArray(v)
    ? [...new Set(v.filter((x) => typeof x === "string" && x.trim() !== ""))]
    : [];
  return {
    minQuote: Number.isFinite(minRoh) ? +clamp(minRoh, BASIS_LIMITS.quote, BASIS_LIMITS.quote.min).toFixed(2) : null,
    maxQuote: Number.isFinite(maxRoh) ? +clamp(maxRoh, BASIS_LIMITS.quote, BASIS_LIMITS.quote.max).toFixed(2) : null,
    wettbewerbe: stringListe(o.wettbewerbe),
    phasen: stringListe(o.phasen),
  };
}

// Bereinigt eine VOLLE Basis-Form — jedes Feld gesetzt, fehlende/ungültige
// Werte fallen auf `DEFAULT_BASIS`. Für den `standard`-Eintrag der Karte.
export function sanitizeBasis(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const wer = sanitizeWer(p.wer);
  return {
    wer,
    werWert: sanitizeWerWert(wer, p.werWert),
    sicht: sanitizeSicht(p.sicht),
    verfall: sanitizeVerfall(p.verfall),
    bedingung: sanitizeBedingung(p.bedingung),
    widerruf: sanitizeWiderruf(p.widerruf),
    widerrufStunden: Math.round(clamp(p.widerrufStunden, BASIS_LIMITS.widerrufStunden, DEFAULT_BASIS.widerrufStunden)),
    stapeln: Math.round(clamp(p.stapeln, BASIS_LIMITS.stapeln, DEFAULT_BASIS.stapeln)),
    symmetrie: sanitizeSymmetrie(p.symmetrie),
    bestand: Math.round(clamp(p.bestand, BASIS_LIMITS.bestand, DEFAULT_BASIS.bestand)),
    // Nur ein ausdrückliches `false` schaltet ab — dieselbe Bauart wie
    // `block.nurGewinn` in duellJoker.js.
    kasseSichtbar: p.kasseSichtbar !== false,
    abklingzeit: Math.round(clamp(p.abklingzeit, BASIS_LIMITS.abklingzeit, DEFAULT_BASIS.abklingzeit)),
    umfang: sanitizeUmfang(p.umfang),
    spieleProEinsatz: Math.round(clamp(p.spieleProEinsatz, BASIS_LIMITS.spieleProEinsatz, DEFAULT_BASIS.spieleProEinsatz)),
    wahl: p.wahl === "bestes" ? "bestes" : DEFAULT_BASIS.wahl,
  };
}

// ── Sanitize: Abweichung (sparse) ───────────────────────────
// Anders als `sanitizeBasis`: nur tatsächlich vorhandene UND gültige Felder
// werden übernommen, der Rest bleibt weg — „nur Abweichungen vom `standard`
// werden gespeichert, nicht sechs Vollobjekte" (Abschnitt 1, Punkt 3). Werte
// werden trotzdem geprüft/beschnitten, nur nicht mit `DEFAULT_BASIS`
// aufgefüllt.
function sanitizeBedingungAbweichung(partial) {
  const o = partial && typeof partial === "object" ? partial : {};
  const leer = (v) => v === null || v === undefined;
  const out = {};
  if (!leer(o.minQuote)) {
    const n = Number(o.minQuote);
    if (Number.isFinite(n)) out.minQuote = +clamp(n, BASIS_LIMITS.quote, BASIS_LIMITS.quote.min).toFixed(2);
  }
  if (!leer(o.maxQuote)) {
    const n = Number(o.maxQuote);
    if (Number.isFinite(n)) out.maxQuote = +clamp(n, BASIS_LIMITS.quote, BASIS_LIMITS.quote.max).toFixed(2);
  }
  if (Array.isArray(o.wettbewerbe)) {
    out.wettbewerbe = [...new Set(o.wettbewerbe.filter((x) => typeof x === "string" && x.trim() !== ""))];
  }
  if (Array.isArray(o.phasen)) {
    out.phasen = [...new Set(o.phasen.filter((x) => typeof x === "string" && x.trim() !== ""))];
  }
  return Object.keys(out).length ? out : undefined;
}

function sanitizeBasisAbweichung(partial) {
  const o = partial && typeof partial === "object" ? partial : {};
  const out = {};
  if (WER.some((w) => w.key === o.wer)) out.wer = o.wer;
  // K2: HIER ist noch nicht sicher, welches `wer` nach dem Merge mit dem
  // `standard` gilt (eine isolierte Abweichung kann `werWert` ohne `wer`
  // tragen, oder umgekehrt) — deshalb nur validieren/runden, NICHT auf
  // `abPlatz`/`abRueckstand` beschneiden. Das Beschneiden passiert in
  // `mergeBasis`, wo beide Felder final feststehen.
  if (o.werWert !== undefined && o.werWert !== null) {
    const n = Number(o.werWert);
    if (Number.isFinite(n)) out.werWert = Math.round(n);
  }
  if (SICHT.some((s) => s.key === o.sicht)) out.sicht = o.sicht;
  if (VERFALL.some((v) => v.key === o.verfall)) out.verfall = o.verfall;
  if (o.bedingung && typeof o.bedingung === "object") {
    const b = sanitizeBedingungAbweichung(o.bedingung);
    if (b) out.bedingung = b;
  }
  if (WIDERRUF.some((w) => w.key === o.widerruf)) out.widerruf = o.widerruf;
  if (o.widerrufStunden !== undefined && o.widerrufStunden !== null) {
    const n = Number(o.widerrufStunden);
    if (Number.isFinite(n)) out.widerrufStunden = Math.round(clamp(n, BASIS_LIMITS.widerrufStunden, BASIS_LIMITS.widerrufStunden.min));
  }
  if (o.stapeln !== undefined && o.stapeln !== null) {
    const n = Number(o.stapeln);
    if (Number.isFinite(n)) out.stapeln = Math.round(clamp(n, BASIS_LIMITS.stapeln, BASIS_LIMITS.stapeln.min));
  }
  if (SYMMETRIE.some((s) => s.key === o.symmetrie)) out.symmetrie = o.symmetrie;
  if (o.bestand !== undefined && o.bestand !== null) {
    const n = Number(o.bestand);
    if (Number.isFinite(n)) out.bestand = Math.round(clamp(n, BASIS_LIMITS.bestand, BASIS_LIMITS.bestand.min));
  }
  // Boolesch: nur ein tatsächlich gesetzter boolescher Wert zählt als
  // Abweichung — dieselbe „nur vorhanden UND gültig"-Regel wie bei den
  // anderen Feldern in dieser Funktion.
  if (typeof o.kasseSichtbar === "boolean") out.kasseSichtbar = o.kasseSichtbar;
  if (o.abklingzeit !== undefined && o.abklingzeit !== null) {
    const n = Number(o.abklingzeit);
    if (Number.isFinite(n)) out.abklingzeit = Math.round(clamp(n, BASIS_LIMITS.abklingzeit, BASIS_LIMITS.abklingzeit.min));
  }
  if (UMFANG.some((u) => u.key === o.umfang)) out.umfang = o.umfang;
  if (o.spieleProEinsatz !== undefined && o.spieleProEinsatz !== null) {
    const n = Number(o.spieleProEinsatz);
    if (Number.isFinite(n)) out.spieleProEinsatz = Math.round(clamp(n, BASIS_LIMITS.spieleProEinsatz, BASIS_LIMITS.spieleProEinsatz.min));
  }
  if (o.wahl === "selbst" || o.wahl === "bestes") out.wahl = o.wahl;
  return out;
}

// Bereinigt die GANZE Karte. Unbekannte Schlüssel — weder `standard` noch
// eine Art aus `JOKER_ARTEN` — fliegen raus. `standard` wird IMMER als volle
// Form geliefert (auch ohne Eingabe), jede Art nur als sparse Abweichung,
// und nur, wenn nach dem Bereinigen tatsächlich etwas übrig bleibt.
export function sanitizeJokerBasisKarte(karte) {
  const o = karte && typeof karte === "object" ? karte : {};
  const out = { standard: sanitizeBasis(o.standard) };
  for (const art of JOKER_ARTEN) {
    if (!Object.prototype.hasOwnProperty.call(o, art.key)) continue;
    const abweichung = sanitizeBasisAbweichung(o[art.key]);
    if (Object.keys(abweichung).length) out[art.key] = abweichung;
  }
  return out;
}

// `standard` und die Abweichung einer Art übereinanderlegen — `bedingung`
// wird dabei feldweise gemergt, nicht als Ganzes ersetzt.
//
// K2: `werWert` wird HIER beschnitten, nicht in der sparsen Abweichung — erst
// hier stehen `wer` und `werWert` beide sicher fest (z. B. `wer` aus dem
// `standard`, `werWert` aus einer isolierten Art-Abweichung). Passt `wer`
// nach dem Merge nicht zu `abPlatz`/`abRueckstand`, wird `werWert` auf
// `null` zurückgesetzt — dieselbe „nur wenn gebraucht"-Regel wie überall
// sonst in diesem Modul.
function mergeBasis(karte, jokerArt) {
  const standard = karte.standard;
  const abweichung = karte[jokerArt];
  const merged = abweichung
    ? {
        ...standard,
        ...abweichung,
        bedingung: { ...standard.bedingung, ...(abweichung.bedingung ?? {}) },
      }
    : standard;
  const limits = werWertLimits(merged.wer);
  return {
    ...merged,
    werWert: limits ? Math.round(clamp(merged.werWert, limits, limits.min)) : null,
  };
}

// Die fertige Form für eine Joker-Art. NUR diese Funktion liest
// `rules.jokerBasis` — kein anderes Modul greift direkt zu (Abschnitt 1).
export function basisFuer(jokerArt, rules) {
  const karte = sanitizeJokerBasisKarte(rules?.jokerBasis);
  return mergeBasis(karte, jokerArt);
}

// ── wer darf einsetzen ──────────────────────────────────────
// `kontext = { board, aktuellerSpieltag, adminFreigaben, hatGetippt,
// letzteEinsaetze }`. `board` = Snapshot der Tabelle, `[{ userId, total, … }]`,
// dieselbe Form wie in `duellJoker.js` und `limitKlassen.js`. `adminFreigaben`
// = welche Freigaben der Admin je Spieltag erteilt hat, `[{ userId, spieltag }]`
// — dieselbe Bauart wie `bisherigeEinsaetze` in `duellJoker.js`s
// `zulaessigeZiele`: eine rohe, unfilterte Liste, die diese Funktion selbst
// nach `aktuellerSpieltag` filtert.
//
// 🔴 5.0 INVARIANTE (design/joker-grundform.md Abschnitt 5.0): kein Joker ohne
// Tipp. Das ist KEINE Einstellung, sie gilt IMMER, unabhängig von `wer` — ein
// Spieler, der den Spieltag nicht tippt, kann dort nichts setzen. `hatGetippt`
// muss ausdrücklich `true` sein; fehlt es (`undefined`) ODER ist es `false`,
// gilt der Spieltag als NICHT getippt und der Einsatz wird abgelehnt — lieber
// ein Joker zu wenig als einer auf einem Spieltag, den niemand gespielt hat.
// Auch der Ersatz-Tipp aus `autoTip.js` (`versaeumnis`) zählt NICHT als Tipp
// in diesem Sinn (Abschnitt 5.0) — das entscheidet der Aufrufer, der
// `hatGetippt` befüllt, nicht diese Funktion.
//
// 5.5 ABKLINGZEIT (design/joker-ausloeser.md Abschnitt 8): `jokerArt` ist ein
// optionaler VIERTER Parameter, damit bestehende Aufrufe ohne ihn nicht
// brechen — ohne `jokerArt` wird die Abklingzeit nicht geprüft.
// `kontext.letzteEinsaetze` = `[{ jokerArt, spieltag }]`, bereits auf DIESEN
// Spieler eingegrenzt (der Aufrufer filtert nach `userId`, dieselbe
// Verantwortungsteilung wie bei `adminFreigaben`/`bisherigeEinsaetze`).
export function darfEinsetzen(basis, userId, kontext = {}, jokerArt = null) {
  const b = basis && typeof basis === "object" ? basis : DEFAULT_BASIS;
  const ctx = kontext && typeof kontext === "object" ? kontext : {};

  if (ctx.hatGetippt !== true) {
    return { erlaubt: false, grund: "Kein Joker ohne Tipp: an diesem Spieltag wurde nicht getippt." };
  }

  const werErgebnis = pruefeWer(b, userId, ctx);
  if (!werErgebnis.erlaubt) return werErgebnis;

  if (jokerArt != null) {
    const abklingErgebnis = pruefeAbklingzeit(b, ctx, jokerArt);
    if (!abklingErgebnis.erlaubt) return abklingErgebnis;
  }

  return { erlaubt: true, grund: null };
}

function pruefeWer(b, userId, ctx) {
  const board = Array.isArray(ctx.board) ? ctx.board : [];

  if (b.wer === "alle") return { erlaubt: true, grund: null };

  if (b.wer === "abPlatz") {
    const sortiert = [...board].sort((x, y) => (Number(y.total) || 0) - (Number(x.total) || 0));
    const idx = sortiert.findIndex((z) => z.userId === userId);
    if (idx < 0) return { erlaubt: false, grund: "Tabellenposition nicht bekannt." };
    const platz = idx + 1;
    return platz >= b.werWert
      ? { erlaubt: true, grund: null }
      : { erlaubt: false, grund: `Nur ab Tabellenplatz ${b.werWert} abwärts.` };
  }

  if (b.wer === "abRueckstand") {
    if (!board.length) return { erlaubt: false, grund: "Tabellenstand nicht bekannt." };
    const fuehrend = Math.max(...board.map((z) => Number(z.total) || 0));
    const eigen = board.find((z) => z.userId === userId);
    const eigenTotal = eigen ? Number(eigen.total) || 0 : 0;
    const rueckstand = Math.max(0, fuehrend - eigenTotal);
    return rueckstand >= b.werWert
      ? { erlaubt: true, grund: null }
      : { erlaubt: false, grund: `Nur ab ${b.werWert} Punkten Rückstand.` };
  }

  // K1: verlangt ALLE Spiele des Spieltags — anders als die 5.0-Invariante
  // oben, die nur IRGENDEINEN Tipp verlangt. Fehlt `alleGetippt`, gilt das wie
  // `false` (dieselbe Kulanz-Regel wie bei `hatGetippt`): lieber ein Joker zu
  // wenig als einer auf einem Spieltag, der nicht komplett getippt wurde.
  if (b.wer === "nurVollstaendigGetippt") {
    return ctx.alleGetippt === true
      ? { erlaubt: true, grund: null }
      : { erlaubt: false, grund: "Nur erlaubt, wenn der komplette Spieltag getippt wurde." };
  }

  // "adminFreigabe"
  const freigaben = Array.isArray(ctx.adminFreigaben) ? ctx.adminFreigaben : [];
  const jetzt = ctx.aktuellerSpieltag;
  const freigegeben = freigaben.some((f) => f && f.userId === userId
    && (jetzt == null || Number(f.spieltag) === Number(jetzt)));
  return freigegeben
    ? { erlaubt: true, grund: null }
    : { erlaubt: false, grund: "Der Admin hat diesen Spieltag noch nicht freigegeben." };
}

// Sperrt eine Joker-ART für `basis.abklingzeit` Spieltage NACH dem letzten
// Einsatz DIESER Art — eine andere Art sperrt nicht mit. Ohne
// `aktuellerSpieltag` (nicht bekannt) lässt sich die Sperre nicht auswerten —
// dieselbe Kulanz wie bei `adminFreigaben` mit `jetzt == null`.
function pruefeAbklingzeit(b, ctx, jokerArt) {
  const abklingzeit = Number(b.abklingzeit) || 0;
  if (abklingzeit <= 0) return { erlaubt: true, grund: null };

  const aktuellerSpieltag = ctx.aktuellerSpieltag;
  if (aktuellerSpieltag == null) return { erlaubt: true, grund: null };

  const einsaetze = Array.isArray(ctx.letzteEinsaetze) ? ctx.letzteEinsaetze : [];
  let letzterSpieltag = null;
  for (const e of einsaetze) {
    if (!e || e.jokerArt !== jokerArt) continue;
    const st = Number(e.spieltag);
    if (!Number.isFinite(st)) continue;
    if (letzterSpieltag == null || st > letzterSpieltag) letzterSpieltag = st;
  }
  if (letzterSpieltag == null) return { erlaubt: true, grund: null };

  const seit = Number(aktuellerSpieltag) - letzterSpieltag;
  if (seit < abklingzeit) {
    return {
      erlaubt: false,
      grund: `Abklingzeit: noch ${abklingzeit - seit} Spieltag(e) gesperrt (letzter Einsatz Spieltag ${letzterSpieltag}).`,
    };
  }
  return { erlaubt: true, grund: null };
}

// ── worauf der Joker gilt ────────────────────────────────────
// 🔴 Liest die Außenseiter-Siegquote AUS `snap.winner` (die höhere der beiden
// Siegquoten) — NIE die Quote des getippten Ausgangs. Deshalb nimmt diese
// Funktion gar keinen Tipp entgegen (Abschnitt 2.4, Kopfkommentar).
export function erfuelltBedingung(basis, snap, wettbewerb = null, phase = null) {
  const b = basis && typeof basis === "object" ? basis : DEFAULT_BASIS;
  const bed = b.bedingung && typeof b.bedingung === "object" ? b.bedingung : DEFAULT_BASIS.bedingung;

  const heim = Number(snap?.winner?.home);
  const gast = Number(snap?.winner?.away);
  if (!Number.isFinite(heim) || !Number.isFinite(gast)) {
    return { erlaubt: false, grund: "Keine Quoten-Daten für dieses Spiel." };
  }
  // Die höhere der beiden Siegquoten = die Quote des Außenseiters, unabhängig
  // davon, wer tatsächlich gewinnt oder was getippt wurde.
  const aussenseiterQuote = Math.max(heim, gast);

  if (bed.minQuote != null && aussenseiterQuote < bed.minQuote) {
    return { erlaubt: false, grund: `Erst ab einer Außenseiter-Quote von ${bed.minQuote}.` };
  }
  if (bed.maxQuote != null && aussenseiterQuote > bed.maxQuote) {
    return { erlaubt: false, grund: `Nicht bei einer Außenseiter-Quote über ${bed.maxQuote} (zu einseitiges Spiel).` };
  }
  if (bed.wettbewerbe.length && !bed.wettbewerbe.includes(wettbewerb)) {
    return { erlaubt: false, grund: "Nicht in diesem Wettbewerb." };
  }
  if (bed.phasen.length && !bed.phasen.includes(phase)) {
    return { erlaubt: false, grund: "Nicht in dieser Phase." };
  }
  return { erlaubt: true, grund: null };
}

// ── EIN Aufruf fürs Setzen eines Jokers ──────────────────────
// design/kontaktstellen.md Abschnitt 5 Punkt 1: bis hierhin hatten
// `darfEinsetzen` und `erfuelltBedingung` NULL Aufrufer im Spielbetrieb —
// diese Funktion ist die Verkabelung, die das behebt. Sie ist der EINE Ort,
// an dem beide beim tatsächlichen Setzen eines Jokers gefragt werden.
//
// Die Reihenfolge ist Absicht: ERST `darfEinsetzen` (die Grundberechtigung —
// `wer`, „kein Joker ohne Tipp", Abklingzeit), DANN erst `erfuelltBedingung`
// (die Eigenschaft DIESES Spiels — minQuote/maxQuote, Wettbewerb, Phase).
// „Du darfst hier gar nicht einsetzen" ist für den Spieler eine nützlichere
// Meldung als „dieses Spiel passt nicht zur Bedingung" — wer schon an der
// Grundberechtigung scheitert, muss nicht zusätzlich über eine
// Spiel-Eigenschaft stolpern, die am eigentlichen Problem vorbeigeht.
export function pruefeJokerEinsatz({ rules, jokerArt, userId, snap, wettbewerb = null, phase = null, kontext = {} }) {
  const basis = basisFuer(jokerArt, rules);
  const wer = darfEinsetzen(basis, userId, kontext, jokerArt);
  if (wer.erlaubt === false) return wer;
  return erfuelltBedingung(basis, snap, wettbewerb, phase);
}

// ── bis wann änderbar ────────────────────────────────────────
// `jetzt`/`anpfiff` als Zeitstempel (ms), dieselbe Bauart wie `tippStatus` in
// `tippfenster.js`. Geschlossen wird IMMER spätestens beim Anpfiff — dieselbe
// Kante wie der eingefrorene Quoten-Snapshot und das Tippfenster
// (`jetzt >= anpfiff` ist immer zu spät, auch bei `bisStunden: 0`).
export function darfWiderrufen(basis, jetzt, anpfiff) {
  const b = basis && typeof basis === "object" ? basis : DEFAULT_BASIS;
  const t = Number(jetzt);
  const a = Number(anpfiff);
  if (!Number.isFinite(t) || !Number.isFinite(a)) return false;
  if (b.widerruf === "sofortVerbindlich") return false;
  if (t >= a) return false;
  if (b.widerruf === "bisStunden") {
    const cutoff = a - (Number(b.widerrufStunden) || 0) * 3600_000;
    return t <= cutoff;
  }
  return true; // "bisAnpfiff"
}

// ── Konflikte mit anderen Regeln ────────────────────────────
// 2.1: `wer` (abRückstand) und eine Limitierungsklasse mit
// `aktivierung.typ: "abRueckstand"` auf derselben Art sichern beide über
// Rückstand ab — nur ein Hinweis, keine Sperre. Dazu `sofortVerbindlich`
// zusammen mit `sicht: "sofort"` (2.2/2.5): der Einsatz ist dann öffentlich
// UND unumkehrbar — legitim, aber hart.
//
// K1 (Abnahme 31.07., design/joker-grundform.md Abschnitt 4): EINE Einstellung
// im `standard` darf nicht als sechs Meldungen erscheinen — eine je Art, nur
// weil `basisFuer` sie ohne Abweichung sechsmal identisch liefert. Deshalb:
// Stammt der Verstoß für eine Art unverändert vom `standard` (die Art hat für
// die betroffenen Felder KEINE eigene Abweichung), zählt das als EIN Fund für
// `bereich: "standard"`. Stammt er aus einer Art-Abweichung (die Art
// überschreibt selbst eines der betroffenen Felder), gibt es eine Meldung je
// betroffener Art mit `bereich: "<jokerArt>"`. Gilt beides gleichzeitig
// (manche Arten unverändert vom `standard`, andere mit eigener Abweichung),
// werden beide Formen gemeldet.
export function konflikte(rules) {
  const karte = sanitizeJokerBasisKarte(rules?.jokerBasis);
  const klassen = sanitizeLimitKlassen(rules?.limitKlassen);
  const out = [];

  const labelFuer = (artKey) => JOKER_ARTEN.find((a) => a.key === artKey)?.label ?? artKey;
  // Ob Feld `feld` für `artKey` aus einer Art-Abweichung stammt (statt vom
  // `standard` geerbt zu sein).
  const stammtAusAbweichung = (artKey, feld) => {
    const abweichung = karte[artKey];
    return !!(abweichung && Object.prototype.hasOwnProperty.call(abweichung, feld));
  };

  // ── 2.1: wer: abRueckstand + Limitierungsklasse auf Rückstand ──
  for (const k of klassen) {
    if (k.aktivierung.typ !== "abRueckstand") continue;
    const betroffen = k.mitglieder.filter((artKey) => mergeBasis(karte, artKey).wer === "abRueckstand");
    if (!betroffen.length) continue;

    const ausStandard = betroffen.filter((artKey) => !stammtAusAbweichung(artKey, "wer"));
    const ausAbweichung = betroffen.filter((artKey) => stammtAusAbweichung(artKey, "wer"));

    if (ausStandard.length) {
      out.push({
        key: `basis-doppelt-rueckstand-standard-${k.id}`,
        bereich: "standard",
        text: `Grundform (Standard): „wer: abRückstand“ UND die Limitierungsklasse „${k.label}“ sichern beide über Rückstand ab — eine davon genügt. Betrifft: ${ausStandard.map(labelFuer).join(", ")}.`,
      });
    }
    for (const artKey of ausAbweichung) {
      out.push({
        key: `basis-doppelt-rueckstand-${artKey}-${k.id}`,
        bereich: artKey,
        text: `„${labelFuer(artKey)}“: „wer: abRückstand“ UND die Limitierungsklasse „${k.label}“ sichern beide über Rückstand ab — eine davon genügt.`,
      });
    }
  }

  // ── 2.2/2.5: sofortVerbindlich zusammen mit sicht: sofort ──
  const verstoss = JOKER_ARTEN
    .map((art) => art.key)
    .filter((artKey) => {
      const basis = mergeBasis(karte, artKey);
      return basis.widerruf === "sofortVerbindlich" && basis.sicht === "sofort";
    });

  const ausStandard = verstoss.filter((artKey) => !stammtAusAbweichung(artKey, "widerruf") && !stammtAusAbweichung(artKey, "sicht"));
  const ausAbweichung = verstoss.filter((artKey) => stammtAusAbweichung(artKey, "widerruf") || stammtAusAbweichung(artKey, "sicht"));

  if (ausStandard.length) {
    out.push({
      key: `basis-sofort-verbindlich-standard`,
      bereich: "standard",
      text: `Grundform (Standard): Einsatz ist sofort sichtbar UND sofort verbindlich — legitim, aber hart. Betrifft: ${ausStandard.map(labelFuer).join(", ")}.`,
    });
  }
  for (const artKey of ausAbweichung) {
    out.push({
      key: `basis-sofort-verbindlich-${artKey}`,
      bereich: artKey,
      text: `„${labelFuer(artKey)}“: Einsatz ist sofort sichtbar UND sofort verbindlich — legitim, aber hart.`,
    });
  }

  return out;
}

// Ein Satz für die UI, Muster `beschreibeDuell`.
export function beschreibeBasis(basis) {
  const b = basis && typeof basis === "object" ? basis : DEFAULT_BASIS;
  const werText = WER.find((w) => w.key === b.wer)?.label ?? b.wer;
  const sichtText = SICHT.find((s) => s.key === b.sicht)?.label ?? b.sicht;
  const verfallText = VERFALL.find((v) => v.key === b.verfall)?.label ?? b.verfall;
  const widerrufText = b.widerruf === "bisStunden"
    ? `bis ${b.widerrufStunden} Std. vor Anpfiff`
    : (WIDERRUF.find((w) => w.key === b.widerruf)?.label ?? b.widerruf);
  return `Wer: ${werText}. Sicht: ${sichtText}. Verfall: ${verfallText}. Widerruf: ${widerrufText}. Höchstens ${b.stapeln} pro Spiel.`;
}
