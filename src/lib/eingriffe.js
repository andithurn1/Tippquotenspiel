// ============================================================
//  EINGRIFFE — die Grundform der FREMDJOKER-Familie (JK4–JK7)
//
//  🔴 Die Familie heißt seit 22.08.2026 **Fremdjoker** (Andi, `vokabular.md`):
//  Block · Trittbrettfahrer · Gegenwette · Klau — jeder Joker, der in den Tipp
//  eines ANDEREN greift. Diese Datei trägt das DACH darüber; die Logik selbst
//  liegt in `fremdjoker.js`, die Wertung in `duellJoker.js`.
//
//  ── Warum eine eigene Datei, und warum sie NICHTS importiert ──
//  `duellJoker.js` muss `sanitizeEingriffe` lesen (die Wertung kennt jetzt
//  vier Arten statt zwei), und `fremdjoker.js` muss `duellJoker.js` lesen.
//  Lägen Dach und Logik zusammen, wäre das ein Importzyklus — genau der, vor
//  dem der Kopf von `duellJoker.js` bereits warnt. Diese Datei importiert
//  deshalb bewusst gar nichts: Kataloge, Grenzen, Vorgabe, Prüfung, eine
//  Formel. Mehr nicht.
//
//  ── 🔴 Das Dach nimmt nur weg, es gibt nie etwas dazu ──
//  `enabled` ist die Antwort auf JK7 („Büro-Runde nein, Freundesrunde ja"),
//  und die Vorgabe ist **an**. Das sieht verkehrt herum aus und ist es nicht:
//
//  1. Jede der vier Arten hat ihren EIGENEN Schalter (`duell.enabled` samt
//     `typen`, `trittbrett.enabled`, `gegenwette.enabled`) und ist von sich
//     aus AUS. Ein Dach mit Vorgabe „an" schaltet deshalb nichts ein — es
//     steht nur bereit, alles auf einmal auszuschalten.
//  2. Wäre die Vorgabe „aus", würde JEDER bestehende Creator-Code mit
//     `duell.enabled: true` sein Verhalten ändern, ohne dass jemand etwas
//     verstellt hat. Ein Regelwerk-Feld, das rückwirkend Runden umschreibt,
//     ist keine Option (dieselbe Kante wie bei `tippfenster.schlussStunden`,
//     Vorgabe 0 = alles wie bisher).
//
//  Wer die Familie in EINEM Griff an- ODER ausschalten will, nimmt
//  `familieSchalten()` aus `fremdjoker.js` — das ist die Stelle, die beide
//  Richtungen kann. Dieses Feld allein ist der AUS-Griff.
//
//  ── Was hier NICHT steht ──
//  Klau und Block bleiben in `rules.duell`. Sie ein zweites Mal hier zu
//  führen wäre die doppelte Wahrheit in Reinform — eine Runde hätte dann zwei
//  Antworten auf „ist der Block an?". Wer wissen will, welche Arten wirklich
//  laufen, fragt `aktiveArten(rules)` in `fremdjoker.js`; das ist die EINE
//  Stelle (Runden-Schicht, CLAUDE.md).
//
//  Reine Funktionen, UI-frei, keine Importe.
// ============================================================

// ── Kataloge ────────────────────────────────────────────────

// Die vier Fremdjoker. `wo` sagt, in welchem Regel-Block die Art wohnt — das
// ist keine Zierde, sondern die Antwort auf „warum steht der Block nicht hier".
export const FREMDJOKER_ARTEN = [
  {
    key: "block", label: "Block", wo: "duell",
    desc: "Der fremde Tipp zählt weniger. Du nimmst keine Punkte weg, du dämpfst.",
  },
  {
    key: "klau", label: "Klau", wo: "duell",
    desc: "Du nimmst dem Getroffenen einen Anteil seiner Punkte auf diesem Spiel ab.",
  },
  {
    key: "trittbrett", label: "Trittbrettfahrer", wo: "eingriffe",
    desc: "Du hängst dich an den fremden Tipp und bekommst einen Anteil dessen, was er bringt.",
  },
  {
    key: "gegenwette", label: "Gegenwette", wo: "eingriffe",
    desc: "Du setzt darauf, dass der fremde Tipp NICHT aufgeht — zur Gegenquote.",
  },
];

// 🔴 Der Schlüssel, unter dem eine Art ihre GRUNDFORM findet (`basisFuer` in
// `jokerBasis.js`). Er sagt zugleich, warum es hier KEINEN eigenen
// Rücknahme-Katalog gibt:
//
// **Befund vom 23.08.2026, an der eigenen Arbeit.** Eine erste Fassung dieser
// Datei trug ein Feld `ruecknahme` (bisAnpfiff · bisFrist · nein) für JK6 —
// familienweit. Die Frage „bis wann darf ich einen Einsatz zurücknehmen?"
// beantwortet die Grundform aber längst, mit `widerruf` (bisAnpfiff ·
// bisStunden · sofortVerbindlich), JE ART, und die Tippabgabe setzt genau die
// beim Speichern durch (`darfWiderrufen`). Zwei Felder, dieselbe Frage: eine
// Runde hätte „zurücknehmbar" anzeigen können, während das Speichern es
// verweigert. Genau die Fehlerklasse, aus der die 17 Funde vom 05.08. kamen —
// diesmal selbst gebaut und vor dem ersten Einsatz gefunden.
//
// ⚠️ Wer JK6 sucht: die Rücknahme steht in der Grundform, nicht hier.
// `fremdjoker.konflikte()` meldet `sofortVerbindlich` auf einem Fremdjoker als
// Widerspruch zum Zweck der Familie.
export function jokerArtVon(typ) {
  const art = FREMDJOKER_ARTEN.find((a) => a.key === typ);
  if (!art) return null;
  return art.wo === "duell" ? `duell.${typ}` : `eingriffe.${typ}`;
}

// Auf welcher Genauigkeit die Gegenwette gilt (Teil E, Falle 3: „die Stufe
// muss festgelegt sein, sonst verhandelt sie jeder anders").
//
// ⚠️ Die Stufe ist NICHT kosmetisch — sie ist der ganze Preis. Gegen die
// Tendenz eines Favoritentipps zu wetten zahlt dreifach, gegen ein exaktes
// 4:1 ein Prozent. Dieselbe Handlung, zwei völlig verschiedene Wetten.
export const GEGEN_STUFEN = [
  {
    key: "tendenz", label: "Tendenz", desc: "Du gewinnst, wenn schon der Ausgang danebenliegt. Das echte Wagnis — Vorgabe.",
  },
  {
    key: "abstand", label: "Tordifferenz", desc: "Du gewinnst, sobald die Tordifferenz nicht stimmt.",
  },
  {
    key: "exakt", label: "Exaktes Ergebnis", desc: "Du gewinnst fast immer — und bekommst dafür fast nichts.",
  },
];

// Woher der Gewinn einer Gegenwette kommt (Teil E, offene Frage „Nullsumme
// oder Nebenwette?"). Andis Regel vom 23.08.2026: wo es mehrere sinnvolle
// Varianten gibt, wird die Variante zur EINSTELLUNG.
export const GEGEN_MODI = [
  {
    key: "topf", label: "Nebenwette",
    desc: "Der Getippte verliert nichts, der Wettende gewinnt oder verliert seinen Einsatz. Vorgabe.",
  },
  {
    key: "nullsumme", label: "Nullsumme",
    desc: "Was der eine gewinnt, fehlt dem anderen. Schärfer — und das Punkte-Niveau bleibt gleich.",
  },
];

// ── Grenzen & Vorgabe ───────────────────────────────────────

export const EINGRIFF_LIMITS = {
  // JK5, Ebene 3. 0 ist überall die Vorgabe — eine Runde, die nichts
  // einstellt, verhält sich exakt wie vorher.
  spieltage: { min: 0, max: 20, step: 1 },
  aufschlag: { min: 0, max: 10, step: 1 },
  hoechstens: { min: 0, max: 38, step: 1 },
  anteil: { min: 0.05, max: 1, step: 0.05 },
  kopierterBekommt: { min: 0, max: 1, step: 0.05 },
  // JK10: „ohne EINSATZ ist auch 1,01 ein Geschenk". Deshalb hat das Feld
  // kein 0 — eine Gegenwette ohne Einsatz gibt es nicht.
  einsatz: { min: 1, max: 500, step: 1 },
};

// 🔴 JK5, DREI Ebenen tief (Andi, 23.08.2026): „mach bei sowas auch weitere
// Option zur Feineinstellung durch weiteren Klick … sodass sich bspw.
// einstellen lässt, es gibt nicht das Verbot, das doppelt hintereinander
// einzusetzen, aber der Cooldown verändert sich dadurch eben."
//
//   Ebene 1  eine Zahl für alle vier Fremdjoker          → `sperrfrist.standard`
//   Ebene 2  eine eigene Zahl je Fremdjoker              → `sperrfrist.block` …
//   Ebene 3  wie die Sperre sich VERHÄLT                 → `aufschlag`/`hoechstens`
//
// ── Die eine Formel, die beide Verhalten trägt ──
// Wartezeit nach dem n-ten Treffer auf dieselbe Person:
//
//     warte = spieltage + max(0, n − 1) × aufschlag        (gedeckelt: hoechstens)
//
// `aufschlag: 0` (Vorgabe) ergibt die feste Sperre, die es immer gab.
// `spieltage: 0, aufschlag: 2` ergibt genau Andis Fall: der zweite Einsatz
// direkt hintereinander ist ERLAUBT (warte = 0), und erst dadurch wächst die
// Wartezeit — 2 Spieltage vor dem dritten, 4 vor dem vierten.
//
// ⚠️ Bewusst KEIN eigenes Feld „Verbot oder Aufschlag?". Die Zahl sagt es
// schon: 0 heißt fest, alles darüber heißt wachsend. Ein Moduswahl-Feld
// daneben wäre ein zweiter Weg zur selben Aussage — und damit die Sorte
// Doppelung, die hier gestern schon einmal aufgeräumt werden musste.
// Vorgabe der Sichtbarkeit: OFFEN. Ein Eingriff, den der Betroffene erst bei
// der Abrechnung sieht, erfüllt Andis Zweck nicht (JK6).
const DEFAULT_SICHT = true;

const DEFAULT_SPERRE = {
  // Wartezeit nach dem ERSTEN Treffer, in Spieltagen. 0 = keine.
  spieltage: 0,
  // Wieviel jeder WEITERE Treffer auf dieselbe Person obendrauf legt.
  aufschlag: 0,
  // Obergrenze der so gewachsenen Wartezeit. 0 = keine Grenze.
  hoechstens: 0,
};

export const DEFAULT_EINGRIFFE = {
  // JK7 — siehe Kopfkommentar: an, weil das Dach nur wegnimmt.
  enabled: true,
  // JK5 — `maxProZiel` begrenzt nur, wie oft jemand INSGESAMT getroffen wird,
  // nicht ob es immer derselbe Gegner ist. Genau das meint Andi mit „nicht von
  // allen und immer regelmäßig".
  //
  // Die Karte trägt einen `standard` und je Fremdjoker eine ABWEICHUNG —
  // dieselbe Bauform wie `jokerBasis`, ausdrücklich kein zweites Muster
  // (Andi, `vokabular.md`: „ein Hauptschalter oben, darunter je Fremdjoker die
  // eigene Form"). Gespeichert wird nur, was wirklich abweicht.
  sperrfrist: { standard: { ...DEFAULT_SPERRE } },
  // JK6 — Vorgabe „offen“ (joker-sondermenue.md Teil D), je Fremdjoker
  // einzeln stellbar wie die Sperrfrist. Die zweite Hälfte von JK6, das
  // Zurücknehmen, steht in der GRUNDFORM (`jokerBasis.widerruf`) und nicht
  // hier — die Begründung steht bei `jokerArtVon` oben.
  sichtbar: { standard: DEFAULT_SICHT },
  // JK4 — mitprofitieren.
  trittbrett: { enabled: false, anteil: 0.3, kopierterBekommt: 0 },
  // JK4 — dagegen wetten.
  gegenwette: { enabled: false, einsatz: 25, stufe: "tendenz", modus: "topf" },
};

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// Eine VOLLE Sperr-Form — jedes Feld gesetzt. Für den `standard`-Eintrag.
function sanitizeSperre(partial = {}) {
  const o = partial && typeof partial === "object" ? partial : {};
  return {
    spieltage: Math.round(clamp(o.spieltage, EINGRIFF_LIMITS.spieltage, DEFAULT_SPERRE.spieltage)),
    aufschlag: Math.round(clamp(o.aufschlag, EINGRIFF_LIMITS.aufschlag, DEFAULT_SPERRE.aufschlag)),
    hoechstens: Math.round(clamp(o.hoechstens, EINGRIFF_LIMITS.hoechstens, DEFAULT_SPERRE.hoechstens)),
  };
}

// Eine ABWEICHUNG je Art — sparse, nur was dasteht. Ein leeres Ergebnis
// bedeutet „diese Art folgt dem Standard" und wird gar nicht erst gespeichert
// (dieselbe Regel wie `sanitizeBasisAbweichung` in `jokerBasis.js`; sonst
// trüge jeder Creator-Code vier identische Kopien des Standards mit sich).
function sanitizeSperrAbweichung(partial) {
  const o = partial && typeof partial === "object" ? partial : {};
  const out = {};
  for (const feld of ["spieltage", "aufschlag", "hoechstens"]) {
    if (o[feld] === undefined) continue;
    const n = Number(o[feld]);
    if (Number.isFinite(n)) out[feld] = Math.round(clamp(n, EINGRIFF_LIMITS[feld], DEFAULT_SPERRE[feld]));
  }
  return out;
}

// 🔴 Die Karten-Bauform an EINER Stelle: `standard` immer voll, jede Art nur
// als Abweichung, unbekannte Schlüssel fliegen raus.
//
// Sie wird zweimal gebraucht (Sperrfrist und Sichtbarkeit) und wird es beim
// nächsten „je Fremdjoker einzeln" ein drittes Mal. Zwei handgeschriebene
// Läufe über `FREMDJOKER_ARTEN` wären die Sorte Doppelung, die irgendwann
// auseinanderläuft — dann trüge die eine Karte einen unbekannten Schlüssel
// weiter, den die andere wegwirft, und niemand könnte sagen, welche recht hat.
function karteVon(roh, vollstaendig, abweichungVon) {
  const o = roh && typeof roh === "object" ? roh : {};
  const out = { standard: vollstaendig(o.standard) };
  for (const art of FREMDJOKER_ARTEN) {
    if (!Object.prototype.hasOwnProperty.call(o, art.key)) continue;
    const abweichung = abweichungVon(o[art.key]);
    if (abweichung !== undefined) out[art.key] = abweichung;
  }
  return out;
}

export function sanitizeSperrKarte(karte) {
  return karteVon(karte, sanitizeSperre, (v) => {
    const a = sanitizeSperrAbweichung(v);
    return Object.keys(a).length ? a : undefined;
  });
}

// 🔴 JK6/JK13 — dieselbe Karte für die SICHTBARKEIT. Andi am 23.08.2026 auf
// die Frage „Sperrfrist und Sichtbarkeit gemeinsam oder je Joker?": „ne, für
// jeden Joker … einzeln einstellbar."
//
// ⚠️ Er hat dabei ausdrücklich nur die SPERRFRIST benannt. Die Sichtbarkeit
// bekommt hier dieselbe Bauform, weil er die Antwort „gemeinsam lassen" als
// Ganzes verworfen hat — und weil es sonst zwei Bedienmuster für dieselbe
// Frage gäbe. Zurückdrehen kostet zwei Zeilen, falls er es anders meinte.
//
// Ein `true`/`false` je Art, kein Objekt: hier gibt es nichts zu vertiefen.
export function sanitizeSichtKarte(karte) {
  return karteVon(
    karte,
    (v) => (v === undefined ? DEFAULT_SICHT : v !== false),
    (v) => (typeof v === "boolean" ? v : undefined),
  );
}

// 🔴 Die fertige Sperre für EINE Art — Standard und Abweichung übereinander.
// Die einzige Stelle, an der `eingriffe.sperrfrist` aufgelöst wird; ein
// zweiter Auflösungsweg wäre die zweite Wahrheit (Muster `basisFuer`).
// 🔴 Sieht der Betroffene diesen Fremdjoker, bevor der Spieltag beginnt?
// Dieselbe Auflösung wie `sperreFuer` — Abweichung über Standard.
export function sichtFuer(art, eingriffe) {
  const karte = sanitizeSichtKarte(sanitizeEingriffe(eingriffe).sichtbar);
  return karte[art] ?? karte.standard;
}

export function sperreFuer(art, eingriffe) {
  const karte = sanitizeSperrKarte(sanitizeEingriffe(eingriffe).sperrfrist);
  return { ...karte.standard, ...(karte[art] ?? {}) };
}

// 🔴 Wie lange muss ich warten, bevor ich DIESELBE Person mit DIESER Art
// wieder treffen darf? `treffer` = wie oft ich sie mit dieser Art bereits
// getroffen habe. Siehe die Formel im Kopf von `DEFAULT_SPERRE`.
//
// ⚠️ EINE Funktion für Wertung, Prüfung und Anzeige. Der Screen darf sie nicht
// nachrechnen — genau das ist die Runden-Schicht-Regel aus CLAUDE.md.
export function wartezeit(sperre, treffer) {
  const s = sanitizeSperre(sperre);
  const n = Math.max(0, Math.floor(Number(treffer) || 0));
  if (n <= 0) return 0;
  const roh = s.spieltage + (n - 1) * s.aufschlag;
  return s.hoechstens > 0 ? Math.min(s.hoechstens, roh) : roh;
}

// Bereinigt `rules.eingriffe`. Muster `sanitizeDuellJoker`: jedes Feld fällt
// für sich auf die Vorgabe zurück, Zahlen werden auf `EINGRIFF_LIMITS`
// beschnitten.
//
// ⚠️ `enabled` ist das EINZIGE Feld der Familie, dessen Vorgabe `true` ist —
// deshalb `!== false` statt `=== true`. Ein fehlendes Feld (alter
// Creator-Code) heißt „Dach offen", nicht „Familie aus".
export function sanitizeEingriffe(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const pt = p.trittbrett && typeof p.trittbrett === "object" ? p.trittbrett : {};
  const pg = p.gegenwette && typeof p.gegenwette === "object" ? p.gegenwette : {};

  return {
    enabled: p.enabled !== false,
    sperrfrist: sanitizeSperrKarte(p.sperrfrist),
    sichtbar: sanitizeSichtKarte(p.sichtbar),
    trittbrett: {
      enabled: pt.enabled === true,
      anteil: +clamp(pt.anteil, EINGRIFF_LIMITS.anteil, DEFAULT_EINGRIFFE.trittbrett.anteil).toFixed(2),
      kopierterBekommt: +clamp(pt.kopierterBekommt, EINGRIFF_LIMITS.kopierterBekommt,
        DEFAULT_EINGRIFFE.trittbrett.kopierterBekommt).toFixed(2),
    },
    gegenwette: {
      enabled: pg.enabled === true,
      einsatz: Math.round(clamp(pg.einsatz, EINGRIFF_LIMITS.einsatz, DEFAULT_EINGRIFFE.gegenwette.einsatz)),
      stufe: GEGEN_STUFEN.some((s) => s.key === pg.stufe) ? pg.stufe : DEFAULT_EINGRIFFE.gegenwette.stufe,
      modus: GEGEN_MODI.some((m) => m.key === pg.modus) ? pg.modus : DEFAULT_EINGRIFFE.gegenwette.modus,
    },
  };
}

// ── Das umgekehrte Modell (Teil E) ──────────────────────────
// 🔴 Andi am 22.08.2026: „beim Dagegenwetten brauchen wir ja ein umgekehrtes
// Modell anhand der Quoten, um auszuwerten, wie sehr man belohnt wird."
//
// Ein Tipp trifft mit `p`; wer dagegen wettet, gewinnt mit `1 − p`. Die faire
// Gegenquote ist der Kehrwert davon. Kein zweites Modell, keine neue
// Datenquelle — dieselbe Rechnung mit der Gegenwahrscheinlichkeit.
//
// 🔴 **Das Modell reguliert sich selbst**, und das ist der Grund, warum es
// gegen das Abgrasen sicherer Wetten keine einzige Sperre braucht: gegen einen
// Favoritentipp (p = 66,7 %) zahlt es 3,00, gegen ein exaktes 4:1 (p = 0,5 %)
// zahlt es 1,01. Wer das Sichere nimmt, gewinnt fast immer ein Prozent — und
// riskiert dafür seinen ganzen Einsatz.
//
// ⚠️ `p >= 1` (ein Tipp, der nicht danebengehen KANN) hat keine faire
// Gegenquote; die Funktion gibt dann `null` zurück statt Unendlich. `p <= 0`
// ebenso: gegen einen unmöglichen Tipp zu wetten ist keine Wette. Beide Fälle
// entstehen nur aus kaputten Quoten, und ein `null` fällt auf, wo eine
// stillschweigende Zahl untergehen würde.
export function gegenquote(p) {
  const x = Number(p);
  if (!Number.isFinite(x) || x <= 0 || x >= 1) return null;
  return 1 / (1 - x);
}

// Was eine Gegenwette einbringt bzw. kostet — in ROHEN Punkten des
// Grundwerts, ohne Anzeige-Skalierung.
//
// 🔴 JK9: `minPayout` greift hier NICHT, und das ist keine Nachlässigkeit,
// sondern die Bedingung dafür, dass das Modell überhaupt funktioniert. Das
// Regelwerk hebt jeden Kleinstertrag auf den Mindestertrag an; liefe die
// Gegenwette durch dieselbe Wertung, würden aus 1,01 volle Punkte — und das
// Abgrasen der sicheren Wetten wäre wieder lohnend. Deshalb rechnet diese
// Funktion für sich und wird NICHT durch `toDisplay`/`scoreTip` geschickt.
//
// 🔴 JK10: es wird EINGESETZT. Wer gegen ein 4:1 wettet, riskiert seinen
// Einsatz, um ein Prozent davon zu gewinnen. Ohne diesen Einsatz wäre auch
// 1,01 ein Geschenk mit 99,5 % Trefferquote.
export function gegenwetteErtrag({ einsatz, p, getroffen }) {
  const q = gegenquote(p);
  const e = Number(einsatz);
  if (q == null || !Number.isFinite(e) || e <= 0) return 0;
  // Der Tipp ist aufgegangen → die Wette ist verloren, der Einsatz weg.
  if (getroffen) return -e;
  // Sonst der Reingewinn: Einsatz × (Gegenquote − 1). Der Einsatz selbst
  // kommt zurück, er ist kein Gewinn.
  return e * (q - 1);
}
