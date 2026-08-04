// ============================================================
//  MÜNZ-TAKT — WIE OFT es im Wettmodus Münzen gibt
//
//  design/wettmodus.md Abschnitt 3: bisher verteilt der Einsatz-Modus
//  (`rules.joker.modus === "einsatz"`) FEST je Spieltag ein Münz-Budget
//  (`einsatzProSpieltag`). Diese Datei macht daraus einen einstellbaren TAKT
//  — ohne die Einsatz-Logik selbst anzufassen.
//
//  ── Der Trick: eine SCHLÜSSEL-Funktion, kein zweites Datenmodell ──
//  `einsatzPlanung`, `invalidEinsatzMatchdays` und `einsatzUsageForMatchday`
//  (engine.js) gruppieren bereits über eine übergebene `schluessel`-Funktion
//  — genau wie `rundenSchluessel(achse)` in `zeitachse.js` den Liga-Spieltag
//  durch den Runden-Spieltag ersetzt. Der Münz-Takt ist dieselbe Bauart eine
//  Ebene höher: ein Schlüssel, der mehrere Runden-Spieltage zu EINER
//  Münz-Periode zusammenfasst. Budget, Höchsteinsatz und Deckungsrechnung
//  gelten dann automatisch für die Periode, weil die Einsatz-Funktionen gar
//  nicht wissen, ob ihr `schluessel` einen einzelnen Spieltag oder eine
//  ganze Periode adressiert.
//
//  ── Der Katalog wird NICHT neu erfunden ──
//  `TAKTE` und `perioden()` kommen aus `jokerBudget.js` (dort bereits die
//  eine Quelle für die Narren-Zuteilung) — hier nur zweitgenutzt, nicht
//  dupliziert. Ändert sich der Katalog dort, wandert er hier automatisch mit.
//
//  ── ⚠️ Der Fall "saison" ist ein Widerspruch, kein Bug ──
//  `einsatzTakt: "saison"` lässt Münzen einmalig zu Saisonbeginn zufließen
//  und nie wieder — damit werden Münzen zum SAISON-VERMÖGEN. Das widerspricht
//  Abschnitt 1 von `design/wettmodus.md` ausdrücklich ("Gewinne fließen nicht
//  zurück in den Einsatz-Topf", kein Zinseszins, kein Vorsprung durch frühe
//  Treffer). Deshalb hier NICHT stillschweigend erlaubt, sondern mit
//  Warnhinweis (`muenzTaktKonflikte`) und Warnung in der Live-Vorschau
//  (`beschreibeMuenzTakt`) — eine ausdrückliche Wahl, kein stiller Nebenfall.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { TAKTE, perioden } from "./jokerBudget";
import { sanitizeDuellJoker, fensterVon } from "./duellJoker";
import { spieltagKey, spieltageChronologisch } from "./spieltag";
import { wettbewerbVon } from "./wettbewerbe";
// ⚠️ Zahlen in SICHTBAREM Text laufen über `zahl()` — sonst steht dort ein
// englischer Dezimalpunkt („5.6 je Spieltag"). In einer eigenen Messung
// aufgefallen, nicht in den Tests: die prüften auf Textbestandteile, und
// „7.2" ist ein genauso gültiger Textbestandteil wie „7,2". Dieselbe
// Abhängigkeit haben `wettbewerbGewicht.js` und `limitKlassen.js`, die
// ebenfalls fertige Sätze liefern — Logik-Modul heißt nicht zahlenblind.
import { zahl } from "./format";

// ── Grenzen & Vorgabe ───────────────────────────────────────

export const DEFAULT_MUENZ_TAKT = {
  einsatzTakt: "spieltag",
  einsatzTaktN: 4,
  // Gleiche Form wie `rules.duell`/`budget.fenster` — nur bei takt "phase" relevant.
  einsatzFenster: { phase: "letztesDrittel", schlussLaenge: 4, abSpieltag: null, bisSpieltag: null },
};

export const MUENZ_TAKT_LIMITS = { einsatzTaktN: { min: 2, max: 10, step: 1 } };

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// Bereinigt den Münz-Takt-Teil von `rules.joker`. Unbekannte Werte fallen auf
// die Vorgabe, Zahlen werden auf `MUENZ_TAKT_LIMITS` beschnitten — dasselbe
// Muster wie `sanitizeBudget` in `jokerBudget.js`.
export function sanitizeMuenzTakt(jk = {}) {
  const p = jk && typeof jk === "object" ? jk : {};

  // `einsatzFenster` ist dieselbe Form wie `rules.duell`/`budget.fenster` —
  // `sanitizeDuellJoker` erledigt die eigentliche Bereinigung (`phase`,
  // `schlussLaenge`, `abSpieltag`, `bisSpieltag`), damit die Logik nicht ein
  // drittes Mal danebensteht (dieselbe Delegation wie `sanitizeBudget`s
  // `fenster` in jokerBudget.js).
  const fensterCfg = sanitizeDuellJoker(p.einsatzFenster);

  return {
    einsatzTakt: TAKTE.some((t) => t.key === p.einsatzTakt) ? p.einsatzTakt : DEFAULT_MUENZ_TAKT.einsatzTakt,
    einsatzTaktN: Math.round(clamp(p.einsatzTaktN, MUENZ_TAKT_LIMITS.einsatzTaktN, DEFAULT_MUENZ_TAKT.einsatzTaktN)),
    einsatzFenster: {
      phase: fensterCfg.phase,
      schlussLaenge: fensterCfg.schlussLaenge,
      abSpieltag: fensterCfg.abSpieltag,
      bisSpieltag: fensterCfg.bisSpieltag,
    },
  };
}

// ── Die geordnete Spieltags-Folge, auf der die Perioden liegen ─
// `matches` wird auf `{ wettbewerb, matchday, kickoff }` normalisiert — über
// `wettbewerbVon`, damit ein Match ohne eigenes `wettbewerb`-Feld genauso auf
// den Standard-Wettbewerb fällt wie überall sonst im Projekt (Architektur-
// Regel 3, dieselbe Normalisierung wie in `rundenSchluessel`). Danach
// übernimmt `spieltageChronologisch` die Sortierung (Wettbewerb + Spieltag,
// nicht neu gebaut) — hier wird nur noch durch `schluessel` gejagt und
// entdoppelt, bei gleichbleibender Reihenfolge des ersten Auftretens.
export function spieltagsFolge(matches = [], schluessel = spieltagKey) {
  const liste = Array.isArray(matches) ? matches : [];
  const normalisiert = liste.map((m) => ({
    wettbewerb: wettbewerbVon(m),
    matchday: m?.matchday ?? null,
    kickoff: m?.kickoff,
  }));
  const chronologisch = spieltageChronologisch(normalisiert);

  const folge = [];
  const gesehen = new Set();
  for (const eintrag of chronologisch) {
    const key = schluessel(eintrag);
    if (gesehen.has(key)) continue;
    gesehen.add(key);
    folge.push(key);
  }
  return folge;
}

// ── Die Münz-Perioden ───────────────────────────────────────
// `von`/`bis` sind 1-basierte INDIZES in `spieltagsFolge` (nicht
// Spieltags-Zahlen) — `perioden()` aus jokerBudget.js rechnet ohnehin nur mit
// einer Länge `N`, nicht mit den Spieltags-Zahlen selbst. `keys` sind die
// zugehörigen Spieltags-Schlüssel, `nummer` ist 1-basiert fortlaufend.
export function muenzPerioden({ matches = [], rules, schluessel = spieltagKey } = {}) {
  const cfg = sanitizeMuenzTakt(rules?.joker);
  const folge = spieltagsFolge(matches, schluessel);
  const N = folge.length;
  if (N === 0) return [];

  const roh = perioden(cfg.einsatzTakt, { n: cfg.einsatzTaktN, fenster: cfg.einsatzFenster }, N);
  return roh.map((p, i) => ({
    nummer: i + 1,
    von: p.von,
    bis: p.bis,
    keys: folge.slice(p.von - 1, p.bis),
  }));
}

// ── Die Schlüssel-Funktion für den Münz-Takt ────────────────
// Liefert `(x) => string` — denselben Vertrag wie `schluessel` selbst, damit
// sie 1:1 als `schluessel`-Argument in `einsatzPlanung`/
// `invalidEinsatzMatchdays`/`einsatzUsageForMatchday` durchgereicht werden
// kann.
export function muenzSchluessel({ matches = [], rules, schluessel = spieltagKey } = {}) {
  const cfg = sanitizeMuenzTakt(rules?.joker);

  // Vorgabe-Takt darf kein stiller Regelwechsel sein — exakt dieselbe Doktrin
  // wie beim Rückfall von `rundenSchluessel` auf `spieltagKey`: der
  // Normalfall (kein Münz-Takt gesetzt) verhält sich exakt wie bisher, ohne
  // Umweg über eine Map.
  if (cfg.einsatzTakt === "spieltag") return schluessel;

  const perioden_ = muenzPerioden({ matches, rules, schluessel });
  const zuPeriode = new Map();
  for (const p of perioden_) {
    for (const key of p.keys) zuPeriode.set(key, `muenz#${p.nummer}`);
  }

  // Rückfall auf den EIGENEN Schlüssel (statt auf einen gemeinsamen Topf):
  // bei `takt: "phase"` liegen Spieltage außerhalb des gewählten Fensters in
  // gar keiner Periode. Fielen sie alle in denselben Topf, teilten sich
  // völlig unabhängige Spieltage ein Budget, das nie für sie gedacht war.
  return (x) => zuPeriode.get(schluessel(x)) ?? schluessel(x);
}

// Normalisiert das Ziel (ein Spieltag-Objekt ODER eine nackte Spieltags-Zahl)
// auf dieselbe `{ wettbewerb, matchday }`-Form, mit der auch `matches` über
// `spieltagsFolge` normalisiert werden — sonst träfe der Münz-Schlüssel des
// Ziels nie den der Perioden.
function zielKeyVon(spieltag, schluessel) {
  const roh = spieltag && typeof spieltag === "object" ? spieltag : { matchday: spieltag };
  return schluessel({ wettbewerb: wettbewerbVon(roh), matchday: roh?.matchday ?? null });
}

// ── Status EINES Spieltags im Münz-Takt ─────────────────────
// `aktiv: false` heißt: der gesuchte Spieltag liegt in KEINER Periode (nur
// bei `takt: "phase"` möglich, außerhalb des Fensters) — dort zählen alle
// Spiele wie ohne Münz-Modus.
export function muenzTaktStatus({ matches = [], rules, schluessel = spieltagKey, spieltag } = {}) {
  const cfg = sanitizeMuenzTakt(rules?.joker);
  const liste = Array.isArray(matches) ? matches : [];
  const zielKey = zielKeyVon(spieltag, schluessel);
  const perioden_ = muenzPerioden({ matches: liste, rules, schluessel });
  const periode = perioden_.find((p) => p.keys.includes(zielKey));

  if (!periode) {
    return {
      aktiv: false, takt: cfg.einsatzTakt, nummer: null, von: null, bis: null,
      spieltageInPeriode: 0, spieleInPeriode: 0,
      grund: "In diesem Zeitraum gibt es keine Münzen — hier zählen alle Spiele gleich.",
    };
  }

  const keySet = new Set(periode.keys);
  const spieleInPeriode = liste.filter((m) =>
    keySet.has(schluessel({ wettbewerb: wettbewerbVon(m), matchday: m?.matchday ?? null }))
  ).length;

  return {
    aktiv: true, takt: cfg.einsatzTakt, nummer: periode.nummer, von: periode.von, bis: periode.bis,
    spieltageInPeriode: periode.keys.length, spieleInPeriode, grund: null,
  };
}

// Kurzer Anzeigetext für eine Periode, als Ersatz für „Spieltag N" dort, wo
// mehrere Spieltage zu einer Münz-Periode gehören. `null` heißt: nichts
// Besonderes zu sagen, die Oberfläche zeigt weiter den einzelnen Spieltag.
// ⚠️ „die ganze Saison" mit Artikel, nicht „ganze Saison": der Text steht
// sowohl als Überschrift („🪙 Münzen — die ganze Saison") als auch mitten im
// Satz („… Münzen für die ganze Saison verteilt") — ohne Artikel liest sich
// der Satzfall falsch. „Spieltage 5–8" braucht ihn in beiden Stellungen nicht.
export function periodeLabel(status, folgeLaenge) {
  if (!status?.aktiv) return null;
  if (status.spieltageInPeriode === 1) return null;
  if (status.von === 1 && status.bis === folgeLaenge) return "die ganze Saison";
  return `Spieltage ${status.von}–${status.bis}`;
}

// Lokale Rückfälle für die zwei Joker-Felder, die die Live-Vorschau unten
// braucht (`einsatzProSpieltag`, `maxAnteilProSpiel`) — dieselben Werte wie
// `DEFAULT_RULES.joker` in engine.js. Kein Import von dort: engine.js
// importiert bereits diese Datei (siehe Kopfkommentar), ein Import in die
// Gegenrichtung erzeugte einen Zyklus.
const EINSATZ_FALLBACK = { einsatzProSpieltag: 100, maxAnteilProSpiel: 0.4 };

// ── Die Live-Vorschau ────────────────────────────────────────
// Ein bis zwei Sätze, Alltagsdeutsch, Einheit „Münzen". ⚠️ Sichtbarer Text:
// KEINE Bezeichner, KEINE Dateinamen (siehe `BUDGET_QUELLEN.leistung` in
// jokerBudget.js dazu, warum das schon einmal schiefging). Muster:
// `beschreibeBudget` (jokerBudget.js) und `anteilHinweis` (wettbewerbGewicht.js).
export function beschreibeMuenzTakt(rules, { spieltage = 34, spieleJeSpieltag = null } = {}) {
  const cfg = sanitizeMuenzTakt(rules?.joker);
  const j = rules?.joker || {};
  const budget = Number.isFinite(j.einsatzProSpieltag) ? j.einsatzProSpieltag : EINSATZ_FALLBACK.einsatzProSpieltag;
  const maxAnteil = Number.isFinite(j.maxAnteilProSpiel) ? j.maxAnteilProSpiel : EINSATZ_FALLBACK.maxAnteilProSpiel;

  if (cfg.einsatzTakt === "alleNSpieltage") {
    const n = cfg.einsatzTaktN;
    let text = `Alle ${n} Spieltage gibt es ${zahl(budget)} Münzen — sie müssen für ${n} Spieltage reichen, `
      + `also im Schnitt ${zahl(budget / n)} je Spieltag.`;
    if (Number.isFinite(spieleJeSpieltag) && spieleJeSpieltag > 0) {
      const maxJeSpiel = maxAnteil * budget;
      const spieleImZeitraum = n * spieleJeSpieltag;
      // 🔴 Das WIRKLICHE Ergebnis benennen, nicht die Einstellung wiederholen:
      // der Höchsteinsatz ist ein Anteil am BUDGET, und das Budget deckt jetzt
      // den ganzen Zeitraum. Der Deckel wird dadurch relativ großzügiger, je
      // mehr Spiele er überspannt — bei 18 Spielen darf ein einziges davon so
      // viel binden wie rechnerisch sieben. Genau das ist die Falle, die ein
      // Admin sonst erst im Spielbetrieb sieht.
      text += ` Der Höchsteinsatz je Spiel bleibt ${zahl(maxJeSpiel)} Münzen — bei ${spieleImZeitraum} Spielen `
        + `im Zeitraum stehen rechnerisch nur ${zahl(budget / spieleImZeitraum)} je Spiel zur Verfügung, `
        + `ein einzelnes Spiel darf also so viel binden wie rund ${zahl(Math.round(maxAnteil * spieleImZeitraum))} andere.`;
    }
    return text;
  }

  if (cfg.einsatzTakt === "saison") {
    return `Es gibt ${zahl(budget)} Münzen für die ganze Saison — danach nie wieder. Damit sind Münzen ein Vermögen `
      + `statt eines Spieltags-Werkzeugs: wer früh alles setzt, spielt den Rest der Saison ohne Einsatz.`;
  }

  if (cfg.einsatzTakt === "phase") {
    // ⚠️ `spieltage` muss die Zahl der RUNDEN-Spieltage sein, über die auch
    // `muenzPerioden` rechnet — sonst nennt die Vorschau ein anderes Fenster,
    // als die Runde tatsächlich benutzt (die 34 hier sind nur der Rückfall).
    const f = fensterVon(cfg.einsatzFenster, spieltage);
    return `Münzen gibt es nur im gewählten Saison-Fenster (Spieltag ${f.von} bis ${f.bis}) — an allen anderen `
      + `Spieltagen zählen alle Spiele gleich.`;
  }

  // "spieltag" (Vorgabe)
  return `Jeder Spieltag bringt ${zahl(budget)} neue Münzen. Was nicht verteilt wird, verfällt.`;
}

// ── Konflikte mit anderen Regeln ────────────────────────────
// Dieselbe Form wie `einsatzKonflikte` in engine.js: `{ key, text }`, die
// Korrektur steht als Satz IM Text, kein eigenes Feld dafür.
export function muenzTaktKonflikte(rules) {
  const cfg = sanitizeMuenzTakt(rules?.joker);
  const out = [];
  if (cfg.einsatzTakt === "saison") {
    out.push({
      key: "muenz-saison-vermoegen",
      text: "Münzen im Takt „Einmal pro Saison“ fließen über die ganze Saison nicht mehr nach — das widerspricht "
        + "dem Grundgedanken des Wettmodus: wer früh gewinnt oder verschwendet, kann für den Rest der Saison nicht "
        + "mehr aufholen. „Alle N Spieltage“ ist der Mittelweg, wenn seltener als jeden Spieltag gewünscht ist.",
    });
  }
  return out;
}
