// ============================================================
//  JOKER-BUDGET — die gemeinsame Währung
//
//  Bisher ist jeder Joker-Topf eine eigene Insel mit eigenem Deckel
//  (`joker.verteilung`, `ereignisse.maxErspielt`, `duell.maxProSaison`). Hier
//  entsteht eine GEMEINSAME Währung: `rules.budget`. Ein Spieler bekommt aus
//  mehreren Quellen Budget zugeteilt und bezahlt damit jede Joker-Art —
//  wie viel er noch hat, entscheidet, wie viele Joker er sich leisten kann,
//  statt dass jede Art ihr eigenes Kontingent führt.
//
//  ── Woher das Budget kommt (`quellen`) ──
//  Mehrere Quellen gleichzeitig erlaubt, sie ADDIEREN sich:
//  `startkapital` (einmalig), `gleich` (der Normalfall, pro Zeitraum),
//  `leistung` (gekoppelt an `ereignisse.js` — ein ausgelöstes Ereignis zahlt
//  wahlweise Budget statt einer Joker-Gutschrift; die getriggerten Ereignisse
//  kommen von außen herein, genau wie `spieltagsPunkte` bei `auswerten()` in
//  `ereignisse.js` — diese Datei wertet keine Tipps selbst aus),
//  `rueckstand` (wer hinten liegt, bekommt mehr) und `platzierung`
//  (verstärkend statt ausgleichend — gehört ins Empfehlungsband als „nur mit
//  Deckel", siehe `konflikte()`).
//
//  ── Takt und Verfall ──
//  EIN Takt gilt für alle periodischen Quellen (`gleich`, `rueckstand`,
//  `platzierung`) gemeinsam — `startkapital` zahlt immer nur an Spieltag 1,
//  `leistung` zahlt genau dann, wenn ein Ereignis ausgelöst hat, unabhängig
//  vom Takt. Bei `takt: "phase"` ist das ganze Saison-Fenster EIN Zeitraum —
//  `fensterVon` aus `duellJoker.js` liefert die Grenzen (eine Quelle für
//  Saison-Fenster, nicht neu gebaut).
//
//  `verfall: "nie"` sammelt unbegrenzt (Schluss-Salven-Gefahr, siehe
//  `konflikte()`), `"periode"` löscht den Rest am Ende jedes Takts,
//  `"deckel"` (Vorgabe) erlaubt Sammeln bis `maxAnsparen`.
//
//  ── ⚠️ Kein Schuldenmodell ──
//  Ein Einsatz ohne Deckung findet nicht statt (`kannBezahlen`). Kein
//  negatives Budget — sonst entsteht genau der zweite Punkte-Kanal, den
//  `ereignisse.js` bereits ausschließt.
//
//  ── Reine Rechnung, kein Zustand ──
//  `budgetVerlauf` berechnet nur die ZUFLUSS-Seite (Einnahmen mit Verfall) —
//  wie viel WÄRE verfügbar, wenn noch nichts ausgegeben wurde. `kontoVerlauf`
//  (weiter unten) verbucht zusätzlich die tatsächlichen Käufe, abgeleitet aus
//  den Tipps — erst damit gibt es einen echten Kontostand
//  (design/kontaktstellen.md Abschnitt 5 Punkt 2, löst dort die Zeile
//  `kannBezahlen · budgetVerlauf` von 0 Aufrufern).
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { sanitizeDuellJoker, fensterVon, einsaetzeAusTipps } from "./duellJoker";

// ── Kataloge ────────────────────────────────────────────────

export const BUDGET_QUELLEN = [
  {
    key: "startkapital", label: "Startkapital",
    desc: "Einmalig zu Saisonbeginn.",
  },
  {
    key: "gleich", label: "Gleich für alle",
    desc: "Jeder bekommt pro Zeitraum denselben Betrag. Der Normalfall.",
  },
  {
    key: "leistung", label: "Leistung",
    // ⚠️ `desc` ist SICHTBARER Text. Hier stand einmal „Gekoppelt an
    // ereignisse.js" — ein Dateiname in der Oberfläche. Im Browser-Durchgang
    // aufgefallen, nicht in den Tests: Kataloge werden ungeprüft angezeigt.
    desc: "Ein erspieltes Ereignis zahlt Narren aus, statt einen Joker gutzuschreiben.",
  },
  {
    key: "rueckstand", label: "Rückstand",
    desc: "Wer hinten liegt, bekommt mehr.",
  },
  {
    key: "platzierung", label: "Platzierung",
    desc: "Nach Rang — verstärkend statt ausgleichend, nur mit Deckel empfohlen.",
  },
];

export const TAKTE = [
  { key: "saison", label: "Einmal pro Saison", desc: "Ein einziger Zeitraum über die komplette Saison." },
  { key: "spieltag", label: "Jeden Spieltag", desc: "Jeder Spieltag ist ein eigener Zeitraum." },
  { key: "alleNSpieltage", label: "Alle N Spieltage", desc: "Ein Zeitraum je N Spieltage." },
  { key: "phase", label: "Saison-Fenster", desc: "Ein einziger Zeitraum, begrenzt auf ein Saison-Fenster." },
];

export const VERFALL_TYPEN = [
  { key: "nie", label: "Nie", desc: "Narren sammeln sich unbegrenzt an. Führt zum Horten und zur Schluss-Salve." },
  { key: "periode", label: "Je Zeitraum", desc: "Verfällt am Ende jedes Takts. Zwingt zum Einsetzen." },
  { key: "deckel", label: "Deckel", desc: "Sammeln erlaubt bis zur Obergrenze — der Mittelweg. Vorgabe." },
];

export const PREISMODI = [
  { key: "fix", label: "Fest", desc: "Jeder Einsatz kostet gleich viel." },
  { key: "steigend", label: "Steigend", desc: "Jeder weitere Einsatz derselben Art in derselben Periode kostet das Vielfache." },
  { key: "knappheit", label: "Knappheit", desc: "Der Preis steigt, je mehr Spieler dieselbe Art in dieser Periode gespielt haben." },
];

export const JOKER_ARTEN = [
  { key: "joker.einzel", label: "Einzel-Joker", desc: "Der klassische Joker auf ein einzelnes Spiel." },
  { key: "joker.ranking", label: "Ranking-Joker", desc: "Joker auf die eigene Platzierung." },
  { key: "duell.klau", label: "Klau-Joker", desc: "Verdient an der Ausbeute eines Mitspielers mit." },
  { key: "duell.block", label: "Block-Joker", desc: "Dämpft die Wertung eines Mitspielers für ein Spiel." },
  // 🔴 Die zwei neuen FREMDJOKER (JK4, 23.08.2026). Sie stehen hier, weil
  // „Was für ALLE neuen Arten gilt" (design/joker-sondermenue.md Teil C) genau
  // das verlangt: jede Art erbt die Grundform aus `jokerBasis` — Widerruf,
  // Sichtbarkeit, Abklingzeit, Verfall, Bedingung. Diese 18 Werte je Art neu
  // zu erfinden ist der ganze Grund, warum es die Grundform gibt.
  // ⚠️ Ohne Eintrag hier hätten Trittbrettfahrer und Gegenwette keinen
  // Schlüssel für `basisFuer()` — und `darfWiderrufen` fiele bei ihnen still
  // auf die Vorgabe zurück, statt der Einstellung der Runde zu folgen.
  { key: "eingriffe.trittbrett", label: "Trittbrettfahrer", desc: "Hängt sich an einen fremden Tipp und bekommt einen Anteil." },
  { key: "eingriffe.gegenwette", label: "Gegenwette", desc: "Setzt darauf, dass ein fremder Tipp NICHT aufgeht." },
  { key: "ereignis.trost", label: "Trost-Joker", desc: "Ausgleich für den Letzten eines Spieltags." },
  { key: "saison.wette", label: "Saison-Wette", desc: "Eine Wette über den Saisonverlauf." },
];

// ── Grenzen & Vorgabe ───────────────────────────────────────

export const BUDGET_LIMITS = {
  betrag: { min: 0, max: 500, step: 1 },
  proEreignis: { min: 0, max: 50, step: 1 },
  proPunktRueckstand: { min: 0, max: 20, step: 0.5 },
  deckel: { min: 0, max: 500, step: 1 },        // rueckstand: 0 = kein Deckel je Vorfall
  n: { min: 2, max: 10, step: 1 },               // alleNSpieltage
  maxAnsparen: { min: 1, max: 500, step: 1 },
  preis: { min: 0, max: 200, step: 1 },
  steigerung: { min: 1.0, max: 5.0, step: 0.1 },
};

export const DEFAULT_BUDGET = {
  enabled: false,
  quellen: [{ typ: "gleich", betrag: 10 }],
  takt: "spieltag",
  n: 4,
  // Dieselbe Form wie `rules.duell` für `fensterVon` — nur bei `takt: "phase"`
  // relevant.
  fenster: { phase: "letztesDrittel", schlussLaenge: 4, abSpieltag: null, bisSpieltag: null },
  verfall: "deckel",
  maxAnsparen: 30,
  preise: {},
  preisModus: "fix",
  steigerung: 1.5,
};

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// ── Sanitize ────────────────────────────────────────────────

// Bereinigt eine einzelne Quelle nach ihrem `typ`. Unbekannte `typ`-Werte
// liefern `null` und fliegen beim Aufrufer raus — dieselbe Bauart wie
// `sanitizeEreignisse` in `ereignisse.js`.
function sanitizeQuelle(q) {
  const o = q && typeof q === "object" ? q : {};
  if (o.typ === "startkapital") {
    return { typ: "startkapital", betrag: clamp(o.betrag, BUDGET_LIMITS.betrag, 0) };
  }
  if (o.typ === "gleich") {
    return { typ: "gleich", betrag: clamp(o.betrag, BUDGET_LIMITS.betrag, 10) };
  }
  if (o.typ === "leistung") {
    // `ausgeloest` kommt von außen herein (aus `ereignisse.js`s `auswerten()`)
    // — diese Datei wertet keine Tipps aus, sie verbucht nur, WAS bereits
    // ausgelöst hat: `[{ userId, spieltag, anzahl }]`, `anzahl` = wie viele
    // Ereignisse an diesem Spieltag für diesen Spieler ausgelöst haben.
    const ausgeloest = Array.isArray(o.ausgeloest)
      ? o.ausgeloest
          .filter((e) => e && e.userId != null && Number.isFinite(Number(e.spieltag)))
          .map((e) => ({
            userId: e.userId,
            spieltag: Math.round(Number(e.spieltag)),
            anzahl: Math.max(1, Math.round(Number(e.anzahl) || 1)),
          }))
      : [];
    return { typ: "leistung", proEreignis: clamp(o.proEreignis, BUDGET_LIMITS.proEreignis, 1), ausgeloest };
  }
  if (o.typ === "rueckstand") {
    return {
      typ: "rueckstand",
      proPunktRueckstand: clamp(o.proPunktRueckstand, BUDGET_LIMITS.proPunktRueckstand, 0.5),
      deckel: clamp(o.deckel, BUDGET_LIMITS.deckel, 0), // 0 = kein Deckel je Vorfall
    };
  }
  if (o.typ === "platzierung") {
    return {
      typ: "platzierung",
      betrag: clamp(o.betrag, BUDGET_LIMITS.betrag, 10),
      kurve: o.kurve === "top-schwer" ? "top-schwer" : "linear",
    };
  }
  return null;
}

// Bereinigt `rules.budget`. Unbekannte Werte fallen auf die Vorgabe, Zahlen
// werden auf `BUDGET_LIMITS` beschnitten — dasselbe Muster wie
// `sanitizeDuellJoker`.
export function sanitizeBudget(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};

  const quellenRoh = Array.isArray(p.quellen) ? p.quellen.map(sanitizeQuelle).filter(Boolean) : [];
  const quellen = quellenRoh.length ? quellenRoh : DEFAULT_BUDGET.quellen.map(sanitizeQuelle);

  // `fenster` ist dieselbe Form wie `rules.duell` — `sanitizeDuellJoker`
  // erledigt die eigentliche Bereinigung (`phase`, `schlussLaenge`,
  // `abSpieltag`, `bisSpieltag`), damit die Logik nicht doppelt existiert.
  const fensterCfg = sanitizeDuellJoker(p.fenster);

  const preiseRoh = p.preise && typeof p.preise === "object" ? p.preise : {};
  const preise = {};
  for (const art of JOKER_ARTEN) {
    const v = Number(preiseRoh[art.key]);
    if (Number.isFinite(v)) preise[art.key] = clamp(v, BUDGET_LIMITS.preis, 0);
  }

  return {
    enabled: p.enabled === true,
    quellen,
    takt: TAKTE.some((t) => t.key === p.takt) ? p.takt : DEFAULT_BUDGET.takt,
    n: Math.round(clamp(p.n, BUDGET_LIMITS.n, DEFAULT_BUDGET.n)),
    fenster: {
      phase: fensterCfg.phase,
      schlussLaenge: fensterCfg.schlussLaenge,
      abSpieltag: fensterCfg.abSpieltag,
      bisSpieltag: fensterCfg.bisSpieltag,
    },
    verfall: VERFALL_TYPEN.some((v) => v.key === p.verfall) ? p.verfall : DEFAULT_BUDGET.verfall,
    maxAnsparen: Math.round(clamp(p.maxAnsparen, BUDGET_LIMITS.maxAnsparen, DEFAULT_BUDGET.maxAnsparen)),
    preise,
    preisModus: PREISMODI.some((m) => m.key === p.preisModus) ? p.preisModus : DEFAULT_BUDGET.preisModus,
    steigerung: +clamp(p.steigerung, BUDGET_LIMITS.steigerung, DEFAULT_BUDGET.steigerung).toFixed(2),
  };
}

// ── Zeiträume ───────────────────────────────────────────────
// Liefert die Zeiträume, an deren ANFANG die periodischen Quellen (`gleich`,
// `rueckstand`, `platzierung`) zahlen. Bei `takt: "phase"` ist das ganze
// Fenster EIN Zeitraum — `fensterVon` liefert die Grenzen, nicht neu gebaut.
// Exportiert, damit `kontoVerlauf` (weiter unten) und Aufrufer außerhalb
// dieser Datei dieselbe Perioden-Rechnung nutzen, statt sie nachzubauen.
export function perioden(takt, { n, fenster }, spieltage) {
  const N = Number.isFinite(spieltage) && spieltage > 0 ? Math.floor(spieltage) : 34;
  if (takt === "saison") return [{ von: 1, bis: N }];
  if (takt === "alleNSpieltage") {
    const groesse = Math.max(2, Math.round(n) || DEFAULT_BUDGET.n);
    const out = [];
    for (let von = 1; von <= N; von += groesse) out.push({ von, bis: Math.min(N, von + groesse - 1) });
    return out;
  }
  if (takt === "phase") {
    const f = fensterVon(fenster, N);
    return f.bis >= f.von ? [{ von: f.von, bis: f.bis }] : [];
  }
  // "spieltag": jeder Tag ein eigener, einelementiger Zeitraum.
  const out = [];
  for (let t = 1; t <= N; t++) out.push({ von: t, bis: t });
  return out;
}

// Der Stand ZUM oder VOR dem gesuchten Spieltag — der jüngste verfügbare,
// falls kein exakter Treffer existiert (dieselbe Kulanz wie bei kumulativen
// Verläufen in `saisonform.js`/`duellJoker.js`). Gibt es KEINEN Stand zum
// oder vor dem Spieltag, liefert diese Funktion `null` — kein Rückgriff auf
// einen späteren (zukünftigen) Stand. Sonst flösse Zukunftswissen in
// vergangene Spieltage, genau die Fehlerklasse, die `applySaisonform`
// ausdrücklich vermeidet („der Zwischenstand muss aus sich heraus stimmen").
// Ohne `stand` gibt es keinen Stand — `rueckstand`/`platzierung` liefern dann
// bewusst 0 statt zu raten.
function standAmTag(stand, matchday) {
  if (!Array.isArray(stand) || !stand.length) return null;
  let best = null;
  for (const s of stand) {
    if (!Number.isFinite(s?.matchday)) continue;
    if (s.matchday <= matchday && (!best || s.matchday > best.matchday)) best = s;
  }
  return best?.board ?? null;
}

function rueckstandBetrag(board, userId, quelle) {
  if (!Array.isArray(board) || !board.length) return 0;
  const fuehrend = Math.max(...board.map((b) => Number(b.total) || 0));
  const eigen = board.find((b) => b.userId === userId);
  const eigenTotal = eigen ? Number(eigen.total) || 0 : 0;
  const rueckstand = Math.max(0, fuehrend - eigenTotal);
  let betrag = rueckstand * quelle.proPunktRueckstand;
  if (quelle.deckel > 0) betrag = Math.min(betrag, quelle.deckel);
  return betrag;
}

function platzierungBetrag(board, userId, quelle) {
  if (!Array.isArray(board) || !board.length) return 0;
  const sortiert = [...board].sort((a, b) =>
    (Number(b.total) || 0) - (Number(a.total) || 0) || String(a.userId).localeCompare(String(b.userId)));
  const idx = sortiert.findIndex((b) => b.userId === userId);
  if (idx < 0) return 0;
  const n = sortiert.length;
  // Platz 1 -> Anteil 1, letzter Platz -> Anteil 1/n. `top-schwer` verstärkt
  // den Vorsprung des Führenden zusätzlich (Anteil im Quadrat) — genau die
  // Wirkung, vor der der Kopfkommentar warnt, wenn kein Deckel gesetzt ist.
  const anteil = (n - idx) / n;
  const faktor = quelle.kurve === "top-schwer" ? anteil * anteil : anteil;
  return quelle.betrag * faktor;
}

function creditsFuerTag(userId, t, quellen, periodenStart, stand) {
  let summe = 0;
  for (const q of quellen) {
    if (q.typ === "startkapital" && t === 1) {
      summe += q.betrag;
      continue;
    }
    if (q.typ === "leistung") {
      for (const e of q.ausgeloest) {
        if (e.userId === userId && e.spieltag === t) summe += q.proEreignis * e.anzahl;
      }
      continue;
    }
    if (!periodenStart.has(t)) continue;
    if (q.typ === "gleich") { summe += q.betrag; continue; }
    const board = standAmTag(stand, t);
    if (q.typ === "rueckstand") summe += rueckstandBetrag(board, userId, q);
    if (q.typ === "platzierung") summe += platzierungBetrag(board, userId, q);
  }
  return summe;
}

// ── Der Verlauf ─────────────────────────────────────────────
// Je Spieler und Spieltag der verfügbare Kontostand — reine Zufluss-Rechnung
// (Einnahmen + Verfall), OHNE Abzug tatsächlicher Käufe (siehe Kopfkommentar).
// `kontoVerlauf` (weiter unten) baut auf diesem Ergebnis auf und zieht die
// tatsächlichen Käufe ab — DAS ist der echte Kontostand.
// `stand` = `[{ matchday, board }]`, dieselbe Form wie in `applySaisonform`.
// `userIds` — dieselbe Bauart wie `jokerPlan({ …, userIds })`: die
// ausdrückliche Spielerliste. Sie wird mit den aus `stand`/
// `leistung.ausgeloest` ABGELEITETEN Ids vereinigt, nicht ersetzt — sonst
// liefert der Normalfall (nur Quelle `gleich`, kein `stand`) ohne `userIds`
// weiterhin ein leeres `proSpieler`.
export function budgetVerlauf({
  quellen = [], takt = DEFAULT_BUDGET.takt, n = DEFAULT_BUDGET.n, fenster = DEFAULT_BUDGET.fenster,
  verfall = DEFAULT_BUDGET.verfall, maxAnsparen = DEFAULT_BUDGET.maxAnsparen, spieltage = 34, stand = null,
  userIds = [],
} = {}) {
  const cfg = sanitizeBudget({ enabled: true, quellen, takt, n, fenster, verfall, maxAnsparen });
  const N = Number.isFinite(spieltage) && spieltage > 0 ? Math.floor(spieltage) : 34;

  // Spieler-Roster: die ausdrücklich übergebenen `userIds`, vereinigt mit den
  // Ids aus `stand` (Board-Einträge) UND aus `leistung.ausgeloest` — damit
  // sowohl `leistung`/`stand` auch ohne `userIds` allein testbar bleiben, als
  // auch der Normalfall (`gleich`, kein `stand`) mit `userIds` funktioniert.
  const spielerSet = new Set(Array.isArray(userIds) ? userIds : []);
  if (Array.isArray(stand)) {
    for (const s of stand) for (const b of Array.isArray(s?.board) ? s.board : []) spielerSet.add(b.userId);
  }
  for (const q of cfg.quellen) {
    if (q.typ === "leistung") for (const e of q.ausgeloest) spielerSet.add(e.userId);
  }
  const spielerIds = [...spielerSet];

  const perioden_ = perioden(cfg.takt, { n: cfg.n, fenster: cfg.fenster }, N);
  const periodenStart = new Set(perioden_.map((p) => p.von));
  const periodenEnde = new Set(perioden_.map((p) => p.bis));

  const proSpieler = {};
  for (const id of spielerIds) {
    let bal = 0;
    const verlauf = [];
    for (let t = 1; t <= N; t++) {
      bal += creditsFuerTag(id, t, cfg.quellen, periodenStart, stand);
      // Kein Schuldenmodell: Zufluss ist nie negativ, also bleibt `bal` es
      // auch nie — der Deckel begrenzt nur nach oben.
      if (cfg.verfall === "deckel") bal = Math.min(bal, cfg.maxAnsparen);
      bal = +bal.toFixed(2);
      verlauf.push({ matchday: t, kontostand: bal });
      if (cfg.verfall === "periode" && periodenEnde.has(t)) bal = 0;
    }
    proSpieler[id] = verlauf;
  }
  return { proSpieler };
}

// ── Preis ───────────────────────────────────────────────────
// `bisherInPeriode` = wie oft DERSELBE Spieler diese Art in dieser Periode
// bereits eingesetzt hat (0 = der erste Einsatz) — treibt `steigend`.
// `spielerInPeriode` = wie viele VERSCHIEDENE Spieler diese Art in dieser
// Periode bereits gespielt haben — treibt `knappheit`. Beide nutzen
// `steigerung` als gemeinsamen Wachstumsfaktor, damit „Preisniveau" in der
// Bibliothek (Abschnitt 5, Stufe „anpassen") EIN Regler bleibt.
export function preisFuer(jokerArt, budget, { bisherInPeriode = 0, spielerInPeriode = 0 } = {}) {
  const cfg = sanitizeBudget(budget);
  const basis = Number(cfg.preise[jokerArt]);
  const basisPreis = Number.isFinite(basis) ? basis : 0;
  if (cfg.preisModus === "steigend") {
    return +(basisPreis * Math.pow(cfg.steigerung, Math.max(0, bisherInPeriode))).toFixed(2);
  }
  if (cfg.preisModus === "knappheit") {
    return +(basisPreis * Math.pow(cfg.steigerung, Math.max(0, spielerInPeriode))).toFixed(2);
  }
  return basisPreis; // "fix"
}

// Ein Einsatz ohne Deckung findet nicht statt. Kein Schuldenmodell, kein
// negatives Budget.
export function kannBezahlen(kontostand, preis) {
  const k = Number(kontostand);
  const p = Number(preis);
  if (!Number.isFinite(k) || !Number.isFinite(p) || p < 0) return false;
  return k >= p;
}

// Liegt in `t` ein tatsächlicher Narren-Kauf vor? EIN Ort für diese
// Unterscheidung — exportiert, damit weder `kontoVerlauf` noch ein Aufrufer
// wie `Tippabgabe.jsx` sie ein zweites Mal hinschreibt. Eine Verwechslung
// wäre hier teuer: im Modus "einsatz" darf das niemals anschlagen (Münzen ≠
// Narren, design/waehrungen.md Abschnitt 1).
// Modus "einzel": `tip.joker === true`. Modus "ranking": `tip.gewicht !== 1`.
// (design/kontaktstellen.md Abschnitt 5 Punkt 2 — Schritt 1 hat dieselbe
// Unterscheidung schon für `letzteEinsaetze` in Tippabgabe.jsx getroffen.)
export function istNarrenKauf(modus, t) {
  return modus === "ranking" ? (t?.gewicht != null && t.gewicht !== 1) : t?.joker === true;
}

// ── EIN Satz aller Einsätze — Grundlage für `limitKlassen.js`s `historie` ──
// design/kontaktstellen.md Abschnitt 5 Punkt 5 (Schritt 5): `pruefeEinsatz`
// erwartet die HISTORIE bereits gesetzter Einsätze über ALLE Joker-Arten,
// `einsaetzeAusTipps` (duellJoker.js) liefert dafür bisher nur die Duelle.
// Diese Funktion vereinigt beide Quellen zu EINER Liste in derselben Form.
//
// ⚠️ HIER statt in `duellJoker.js`, obwohl der Plan dort zuerst nachsieht:
// die Joker-Erkennung braucht `istNarrenKauf` (oben in dieser Datei), und
// `jokerBudget.js` importiert bereits `duellJoker.js` (`sanitizeDuellJoker`,
// `fensterVon`) — ein Import in die andere Richtung (`duellJoker.js` →
// `jokerBudget.js`) erzeugte einen Zyklus, dieselbe Falle, vor der der
// Kopfkommentar von `duellJoker.js` bei `jokerBasis.js` bereits warnt. Diese
// Datei importiert stattdessen `einsaetzeAusTipps` aus `duellJoker.js` —
// dieselbe Richtung, die ohnehin schon besteht.
//
// `tipps` = dieselbe Roh-Form wie bei `kontoVerlauf`/`einsaetzeAusTipps`:
// `{ userId, matchday, kickoff, joker, gewicht, tip }` — `Tippabgabe.jsx`
// baut `alleTipps` bereits in genau dieser Form für beide Zwecke.
//
// Modus "einsatz" erzeugt KEINEN Joker-Einsatz (`tip.gewicht` ist dort ein
// Münz-Einsatz, kein Narren-Kauf — design/waehrungen.md Abschnitt 1); Duelle
// sind davon unabhängig und bleiben in jedem Modus erhalten.
export function einsaetzeAllerArten(tipps = [], rules = {}) {
  const liste = Array.isArray(tipps) ? tipps : [];
  const modus = rules?.joker?.modus;

  const jokerEinsaetze = modus === "einsatz" ? [] : liste
    .filter((t) => istNarrenKauf(modus, t))
    .map((t) => ({
      spieltag: Number(t.matchday),
      jokerArt: modus === "ranking" ? "joker.ranking" : "joker.einzel",
      vonUserId: t.userId ?? t.user_id ?? null,
      aufUserId: null,
    }))
    .filter((e) => e.vonUserId != null && Number.isFinite(e.spieltag));

  // `einsaetzeAusTipps` liefert `typ` als "klau"/"block" (DUELL_TYPEN) — die
  // Limitierungsklassen schlüsseln aber über die JOKER_ARTEN-Form
  // "duell.klau"/"duell.block", genau wie `mitglieder` in limitKlassen.js.
  const duellEinsaetze = einsaetzeAusTipps(liste).map((e) => ({
    spieltag: e.spieltag,
    jokerArt: e.typ === "block" ? "duell.block" : "duell.klau",
    vonUserId: e.vonUserId,
    aufUserId: e.aufUserId,
  }));

  // Chronologisch nach `spieltag`, dieselbe Regel wie in `einsaetzeAusTipps`:
  // `pruefeEinsatz`s Zählung ist zeitraumbasiert, nicht ordnungsabhängig,
  // aber eine stabile Reihenfolge macht die Rückgabe deterministisch
  // testbar, statt von der Objektreihenfolge der Eingabe abzuhängen.
  return [...jokerEinsaetze, ...duellEinsaetze].sort((a, b) => (a.spieltag ?? 0) - (b.spieltag ?? 0));
}

// ── Der Kontoverlauf (Zufluss minus tatsächliche Käufe) ─────
//
// `budgetVerlauf` (siehe Kopfkommentar der Datei) rechnet ausdrücklich NUR
// den Zufluss — wie viel WÄRE verfügbar, wenn nie etwas ausgegeben würde.
// Damit gibt es keinen echten Kontostand, nur eine obere Schranke. Diese
// Funktion schließt die Lücke: Zufluss über `budgetVerlauf` (nicht neu
// gerechnet), Käufe aus den abgegebenen Tipps abgeleitet, Preis über
// `preisFuer`. Erst mit dieser Buchführung gibt es einen Narren-Kontostand,
// den man dem Spieler zeigen darf (design/waehrungen.md Abschnitt 4).
//
// 🔴 Münzen ≠ Narren (design/waehrungen.md Abschnitt 1). Im Modus "einsatz"
// ist `tip.gewicht` ein Wetteinsatz in MÜNZEN (`rules.joker.einsatzProSpieltag`,
// `einsatzPlanung` in engine.js) — mit dem Narren-Shop hat das nichts zu tun.
// Ein Tipp im Modus "einsatz" kostet hier deshalb NIEMALS Narren; wer die
// beiden Töpfe verwechselt, zieht demselben Spieler zweimal etwas ab, in
// zwei verschiedenen Währungen. Nur die Modi "einzel" und "ranking" kaufen
// Joker mit Narren.
//
// `tipps` erwartet je Eintrag `{ userId, matchday, joker, gewicht }` — der
// Aufrufer reichert die Roh-Tipps (typischerweise `user_id`, kein `matchday`)
// dafür an, genau wie `meineTips` in Tippabgabe.jsx das für sich selbst tut.
//
// Preis-Zähler (`bisherInPeriode`/`spielerInPeriode`) laufen CHRONOLOGISCH
// über alle Käufer gemeinsam, je Periode (`perioden()`, dieselbe Funktion
// wie in `budgetVerlauf`) — sonst hinge `preisModus: "steigend"`/"knappheit"
// von der Reihenfolge im Array statt vom Spieltag ab.
// 🔴 Nachtrag 05.08.2026: `zusatz` — direkte Narren-Gutschriften.
// Bisher konnte Narren NUR über die `quellen` fließen. Das Glücksrad zahlt
// aber einen FESTEN Betrag pro Feld („30 Narren"), und den durch die
// `leistung`-Quelle zu schicken wäre falsch: die multipliziert eine ANZAHL mit
// `proEreignis`, es käme also eine andere Zahl heraus als auf dem Feld steht.
// Deshalb ein eigener, sehr schmaler Eingang: `[{ userId, spieltag, betrag }]`.
// Er wird wie ein Zufluss behandelt, nicht wie eine Quelle — er hat keinen
// Takt, keinen Verfall und keine Kurve, sondern ist genau einmal da.
// ⚠️ Er unterliegt trotzdem der Grundregel der Datei: kein Schuldenmodell,
// nie unter 0.
export function kontoVerlauf({ rules, tipps = [], spieltage = 34, stand = null, userIds = [], zusatz = [] } = {}) {
  const modus = rules?.joker?.modus;
  const cfg = sanitizeBudget(rules?.budget);
  const N = Number.isFinite(spieltage) && spieltage > 0 ? Math.floor(spieltage) : 34;

  // Zufluss immer über `budgetVerlauf` — nicht neu implementiert.
  const zufluss = budgetVerlauf({
    quellen: cfg.quellen, takt: cfg.takt, n: cfg.n, fenster: cfg.fenster,
    verfall: cfg.verfall, maxAnsparen: cfg.maxAnsparen, spieltage: N, stand, userIds,
  });

  // Direkte Gutschriften (Rad) je Spieler und Spieltag — siehe Kopfkommentar.
  const zusatzJeTag = new Map();   // `${userId}|${matchday}` -> Summe
  const zusatzSpieler = new Set();
  for (const z of Array.isArray(zusatz) ? zusatz : []) {
    const id = z?.userId ?? null;
    const tag = Number(z?.spieltag ?? z?.matchday);
    const betrag = Number(z?.betrag);
    if (id == null || !Number.isFinite(tag) || !Number.isFinite(betrag) || betrag <= 0) continue;
    zusatzJeTag.set(`${id}|${tag}`, (zusatzJeTag.get(`${id}|${tag}`) ?? 0) + betrag);
    zusatzSpieler.add(id);
  }
  // Kumulativ bis zu einem Spieltag — der Zufluss-Verlauf ist ebenfalls
  // kumulativ, beide müssen dieselbe Lesart haben.
  const zusatzBis = (id, matchday) => {
    let summe = 0;
    for (const [key, betrag] of zusatzJeTag) {
      const [kid, ktag] = key.split("|");
      if (kid === String(id) && Number(ktag) <= matchday) summe += betrag;
    }
    return summe;
  };

  // Modus "einsatz" ODER kein Budget aktiv: kein Narren-Kauf möglich (siehe
  // Kopfkommentar oben) — reiner Zufluss, `ausgaben` bleibt bei 0.
  if (modus === "einsatz" || !cfg.enabled) {
    const proSpieler = {};
    const ids = new Set([...Object.keys(zufluss.proSpieler), ...zusatzSpieler]);
    for (const id of ids) {
      const verlauf = zufluss.proSpieler[id]
        ?? Array.from({ length: N }, (_, i) => ({ matchday: i + 1, kontostand: 0 }));
      proSpieler[id] = verlauf.map((v) => {
        const kontostand = +(v.kontostand + zusatzBis(id, v.matchday)).toFixed(2);
        return { matchday: v.matchday, zufluss: kontostand, ausgaben: 0, kontostand };
      });
    }
    return { proSpieler };
  }

  const jokerArt = modus === "ranking" ? "joker.ranking" : "joker.einzel";

  const kaeufe = (Array.isArray(tipps) ? tipps : [])
    .filter((t) => istNarrenKauf(modus, t))
    .map((t) => ({ userId: t.userId ?? t.user_id ?? null, matchday: Number(t.matchday) }))
    .filter((k) => k.userId != null && Number.isFinite(k.matchday))
    .sort((a, b) => a.matchday - b.matchday);

  const perioden_ = perioden(cfg.takt, { n: cfg.n, fenster: cfg.fenster }, N);
  const periodeVon = (t) => perioden_.find((p) => t >= p.von && t <= p.bis)?.von ?? t;

  // Chronologisch über ALLE Käufer: `spielerInPeriode` zählt verschiedene
  // Spieler, `bisherInPeriode` denselben Spieler — beide je Periode, beide
  // VOR dem jeweiligen Kauf (der Kauf selbst zählt erst danach mit).
  const bisherJeSpielerUndPeriode = new Map(); // `${periodeVon}|${userId}` -> Anzahl
  const spielerJePeriode = new Map();          // periodeVon -> Set(userId)
  const ausgabenJeSpielerUndTag = new Map();   // `${userId}|${matchday}` -> Summe

  for (const k of kaeufe) {
    const pVon = periodeVon(k.matchday);
    const spielerKey = `${pVon}|${k.userId}`;
    const bisherInPeriode = bisherJeSpielerUndPeriode.get(spielerKey) ?? 0;
    const spielerSet = spielerJePeriode.get(pVon) ?? new Set();
    const spielerInPeriode = spielerSet.size;

    const preis = preisFuer(jokerArt, cfg, { bisherInPeriode, spielerInPeriode });

    const tagKey = `${k.userId}|${k.matchday}`;
    ausgabenJeSpielerUndTag.set(tagKey, (ausgabenJeSpielerUndTag.get(tagKey) ?? 0) + preis);

    bisherJeSpielerUndPeriode.set(spielerKey, bisherInPeriode + 1);
    spielerSet.add(k.userId);
    spielerJePeriode.set(pVon, spielerSet);
  }

  // Roster: Zufluss-Spieler VEREINIGT mit Käufern — dieselbe Kulanz wie in
  // `budgetVerlauf` für `stand`/`ausgeloest` (dortiger Kopfkommentar), sonst
  // verschwindet ein Käufer ohne eigene Zufluss-Quelle spurlos aus der Liste.
  const spielerIds = new Set(Object.keys(zufluss.proSpieler));
  for (const k of kaeufe) spielerIds.add(k.userId);
  for (const id of zusatzSpieler) spielerIds.add(id);

  const proSpieler = {};
  for (const id of spielerIds) {
    const zuflussVerlauf = zufluss.proSpieler[id]
      ?? Array.from({ length: N }, (_, i) => ({ matchday: i + 1, kontostand: 0 }));
    let kumuliert = 0;
    proSpieler[id] = zuflussVerlauf.map((v) => {
      const ausgabenTag = ausgabenJeSpielerUndTag.get(`${id}|${v.matchday}`) ?? 0;
      kumuliert += ausgabenTag;
      const zuflussTag = +(v.kontostand + zusatzBis(id, v.matchday)).toFixed(2);
      // Kein Schuldenmodell: nie unter 0 (Kopfkommentar der Datei).
      const kontostand = Math.max(0, +(zuflussTag - kumuliert).toFixed(2));
      return { matchday: v.matchday, zufluss: zuflussTag, ausgaben: +ausgabenTag.toFixed(2), kontostand };
    });
  }
  return { proSpieler };
}

// ── Konflikte mit anderen Regeln ────────────────────────────
// Abschnitt 7 des Plans, soweit die Regel nur das Budget betrifft.
export function konflikte(rules) {
  const cfg = sanitizeBudget(rules?.budget);
  const out = [];
  if (!cfg.enabled) return out;

  // „Hoher Betrag" ist ohne Preis-Kontext nicht exakt messbar — die halbe
  // Spanne von BUDGET_LIMITS.betrag genügt als Schwelle für die Warnung.
  const hoch = BUDGET_LIMITS.betrag.max / 2;
  const gleich = cfg.quellen.find((q) => q.typ === "gleich");
  if (cfg.verfall === "nie" && gleich && gleich.betrag >= hoch) {
    out.push({
      key: "budget-nie-schluss-salve",
      korrigieren: true,
      text: "Budget ohne Verfall UND ein hoher gleichmäßiger Betrag führt zur Schluss-Salve: alle sparen die ganze Saison und feuern am letzten Spieltag. `verfall: \"deckel\"` mit `maxAnsparen` setzen.",
    });
  }

  if (cfg.quellen.some((q) => q.typ === "rueckstand") && rules?.aufholen?.enabled) {
    out.push({
      key: "budget-rueckstand-doppelt-aufholen",
      text: "Budget aus Rückstand und der Anschluss-Bonus (`aufholen`) belohnen beide dasselbe Zurückliegen — zusammen wird es doppelt belohnt.",
    });
  }

  if (cfg.quellen.some((q) => q.typ === "platzierung") && cfg.verfall !== "deckel") {
    out.push({
      key: "budget-platzierung-ohne-deckel",
      text: "Budget nach Platzierung ist verstärkend, nicht ausgleichend — ohne `verfall: \"deckel\"` zieht der Führende budgetär davon.",
    });
  }

  return out;
}

// Ein Satz für die UI, Muster `beschreibeDuell`.
export function beschreibeBudget(budget, spieltage = 34) {
  const cfg = sanitizeBudget(budget);
  // ⚠️ Sichtbarer Text: „Narren", nie „Budget" (design/waehrungen.md
  // Abschnitt 2). Die Code-Bezeichner heißen weiter `budget`, die Oberfläche
  // spricht die Sprache des Nutzers.
  if (!cfg.enabled || !cfg.quellen.length) return "Keine Narren in dieser Runde.";
  const quellenText = cfg.quellen
    .map((q) => BUDGET_QUELLEN.find((b) => b.key === q.typ)?.label ?? q.typ)
    .join(", ");
  const taktText = TAKTE.find((t) => t.key === cfg.takt)?.label ?? cfg.takt;
  const verfallText = VERFALL_TYPEN.find((v) => v.key === cfg.verfall)?.label ?? cfg.verfall;
  const deckelText = cfg.verfall === "deckel" ? ` bei ${cfg.maxAnsparen}` : "";
  void spieltage; // aktuell nicht gebraucht, Signatur analog zu beschreibeDuell
  return `Narren aus ${quellenText} (${taktText}). Verfall: ${verfallText}${deckelText}.`;
}
