// ============================================================
//  AUFWAND — wie viele Entscheidungen muss ein Spieler pro Spieltag treffen?
//
//  Das ist ZEITSCHUTZ, keine Balance. Zu viele Entscheidungen pro Woche sind
//  der häufigste Grund, warum Mitspieler aussteigen — deshalb landet das
//  Ergebnis NICHT in `RULE_LIMITS` und sperrt nichts (anders als die
//  Ampel aus `balanceSim.js`, die eine Fairness-Aussage trifft). Es ist eine
//  reine Auskunft (design/joker-oekonomie.md Abschnitt 4).
//
//  ── 🔴 Der MEDIAN, nicht der Mittelwert ──
//  `kontext.spieleJeSpieltag` ist eine Zahl je Spieltag der gewählten Runde.
//  Ein einzelner englischer Doppelspieltag (oder eine Champions-League-Woche)
//  zöge den MITTELWERT hoch und meldete den Normalfall als Problem. Der
//  Median ist gegen einen einzelnen Ausreißer immun — dieselbe Begründung wie
//  bei `median()`/`warnungen()` in `zeitachse.js`.
//
//  ── 🔴 Schwellen sind VIELFACHE des Medians, keine absoluten Zahlen ──
//  Übernommen aus derselben Stelle: über vier Ligen sind 39 Spiele eine
//  normale Woche, mit Champions League 57 — eine feste Schwelle meldet in
//  beiden Fällen etwas Falsches. `AUFWAND_STUFEN[i].bisFaktor` ist deshalb ein
//  Vielfaches des `spieleProSpieltag`-Medians dieser Runde: bei reinem
//  Ergebnis-Tipp (kein Joker, keine Torschützen) liegt `gesamtProSpieltag`
//  IMMER exakt beim einfachen Median — das ist per Definition „entspannt",
//  egal wie viele Ligen die Runde umfasst. Jede zusätzliche Ebene (Joker,
//  Torschützen, Duell, Saison-Wetten) verschiebt das Verhältnis, und genau
//  dieses Verhältnis wird gegen die Stufen geprüft, nicht der Rohwert.
//  Die harte, TECHNISCHE Grenze `AUSWAHL_LIMITS.maxSpiele` (200) aus
//  `spielauswahl.js` bleibt davon unberührt — die ist keine Ergonomie-Frage.
//
//  ── ⚠️ `SEKUNDEN_JE_ENTSCHEIDUNG` ist eine SCHÄTZUNG, keine Messung ──
//  Dieselbe Ehrlichkeit, die `CLAUDE.md` bei `RHO` in `oddsApi.js` erzwingt,
//  nachdem dort zweimal eine Annahme als Messung durchgerutscht ist. Es gibt
//  keine erhobenen Zeiten je Tipp-Entscheidung; der Wert ist so gewählt, dass
//  er mit dem illustrativen Beispiel aus Abschnitt 4.3 übereinstimmt
//  („~12 Entscheidungen pro Spieltag · etwa 7 Minuten" → 420 s / 12 ≈ 35 s).
//  Das macht ihn nicht weniger geraten — nur nachvollziehbar geraten.
//
//  ── `jokerEntscheidungen` — was hochgerechnet wird ──
//  Aus dem Regelwerk, nicht gemessen: der AKTIVE Joker-Modus (`joker.einzel`
//  → 1 Entscheidung je Spieltag, `joker.ranking` → eine je Spiel, weil jedes
//  Spiel ein Gewicht aus dem Pool bekommt), der Duell-Joker (`duell.js`,
//  `proSpieltag`) und Saison-Wetten (`saisonwetten.js`) — deren Entscheidungen
//  über die ganze Saison anfallen, nicht je Spieltag, und deshalb über die
//  Länge von `kontext.spieleJeSpieltag` verteilt werden. Was ausgeschaltet
//  ist, zählt 0.
//
//  ⚠️ Torschützen-Tipps zählen NICHT hier, sondern in `tippEntscheidungen`
//  (Abschnitt 4.1: „Spiele × Felder (Ergebnis, ggf. Torschützen)") — sie sind
//  ein zusätzliches FELD auf einem ohnehin zu tippenden Spiel, kein
//  eigenständiger Joker-Einsatz. Der Torschützen-Schalter wirkt entsprechend
//  auf `tippEntscheidungen`, nicht auf `jokerEntscheidungen`.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { sanitizeDuellJoker } from "./duellJoker";
import { sanitizeSaison } from "./saisonwetten";

// ── Kataloge ────────────────────────────────────────────────

// `bisFaktor` = Vielfaches des Medians (`spieleProSpieltag`), bis zu dem diese
// Stufe gilt (siehe Kopfkommentar). Die letzte Stufe hat kein Dach — dort ist
// `Infinity` der ausdrückliche „alles darüber"-Wert, kein Rechenfehler.
export const AUFWAND_STUFEN = [
  {
    key: "entspannt", label: "Entspannt",
    desc: "Reines Ergebnis-Tippen ohne Zusatz-Ebenen — der Grundaufwand jeder Runde.",
    bisFaktor: 1.5,
  },
  {
    key: "normal", label: "Normal",
    desc: "Eine Zusatz-Ebene (z. B. Torschützen) kommt dazu — noch entspannt zu schaffen.",
    bisFaktor: 2.5,
  },
  {
    key: "viel", label: "Viel",
    desc: "Mehrere Zusatz-Ebenen gleichzeitig aktiv — spürbarer Aufwand an jedem Spieltag.",
    bisFaktor: 4,
  },
  {
    key: "zuviel", label: "Zu viel",
    desc: "Deutlich mehr, als ein normaler Spieltag dieser Runde braucht — Aussteige-Risiko.",
    bisFaktor: Infinity,
  },
];

// ⚠️ Schätzung, nicht Messung — siehe Kopfkommentar.
export const SEKUNDEN_JE_ENTSCHEIDUNG = 35;

// ── Hilfsfunktionen ─────────────────────────────────────────

// Median statt Mittelwert (Kopfkommentar). Dieselbe Bauart wie in
// `zeitachse.js`: gerade Länge → Mittel der beiden mittleren Werte, gerundet.
function median(zahlen = []) {
  if (!zahlen.length) return 0;
  const s = [...zahlen].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function stufeVon(gesamtProSpieltag, spieleProSpieltag) {
  // Ohne verwertbaren Median (kein Kontext) ist „entspannt" die einzig
  // sinnvolle Auskunft — nicht raten, aber auch nicht warnen, wo nichts
  // gemessen werden konnte.
  if (spieleProSpieltag <= 0) return AUFWAND_STUFEN[0].key;
  for (const s of AUFWAND_STUFEN) {
    if (gesamtProSpieltag <= spieleProSpieltag * s.bisFaktor) return s.key;
  }
  return AUFWAND_STUFEN[AUFWAND_STUFEN.length - 1].key;
}

// ── Die Rechnung ────────────────────────────────────────────

// `kontext = { spieleJeSpieltag: number[] }` — eine Zahl je Spieltag der
// gewählten Runde. Leer/fehlend stürzt nicht ab: alle Zahlen werden 0, dazu
// ein Hinweis, dass keine Daten vorlagen.
export function aufwand(rules, kontext = {}) {
  const r = rules && typeof rules === "object" ? rules : {};
  const ctx = kontext && typeof kontext === "object" ? kontext : {};
  const rohSpiele = Array.isArray(ctx.spieleJeSpieltag)
    ? ctx.spieleJeSpieltag.map(Number).filter((n) => Number.isFinite(n) && n >= 0)
    : [];

  const hinweise = [];
  if (!rohSpiele.length) {
    hinweise.push("Keine Spieltag-Daten übergeben (`kontext.spieleJeSpieltag`) — der Aufwand kann nicht berechnet werden.");
  }

  const spieleProSpieltag = median(rohSpiele);

  // ── Tipp-Entscheidungen: Spiele × Felder (Ergebnis, ggf. Torschützen) ──
  // `markets.result`/`markets.goals.enabled` fehlend heißt „an" — dieselbe
  // Vorgabe wie in `DEFAULT_RULES.markets` (engine.js).
  const ergebnisAktiv = r.markets?.result !== false;
  const torschuetzenAktiv = r.markets?.goals?.enabled !== false;
  const felder = (ergebnisAktiv ? 1 : 0) + (torschuetzenAktiv ? 1 : 0);
  const tippEntscheidungen = spieleProSpieltag * felder;

  // ── Joker-Entscheidungen: aus dem Regelwerk hochgerechnet ──
  let jokerEntscheidungen = 0;

  // Aktiver Joker: "einzel" verlangt EINE Entscheidung je Spieltag (welches
  // Spiel bekommt den Joker), "ranking" verlangt eine je Spiel (jedes Spiel
  // bekommt ein Gewicht aus dem Pool).
  const j = r.joker;
  if (j?.enabled === true) {
    jokerEntscheidungen += j.modus === "ranking" ? spieleProSpieltag : 1;
  }

  // Duell-Joker: `sanitizeDuellJoker` liefert die Vorgabe (enabled: false),
  // wenn `rules.duell` fehlt — dieselbe Bauart wie überall sonst, wo dieses
  // Modul gelesen wird (`jokerBudget.js`, `jokerBasis.js`).
  const duell = sanitizeDuellJoker(r.duell);
  if (duell.enabled) {
    jokerEntscheidungen += duell.proSpieltag;
  }

  // Saison-Wetten: fallen nicht JE Spieltag an, sondern ein paar Mal über die
  // ganze Saison — hochgerechnet auf den Schnitt je Spieltag der Reihe, die
  // hereinkommt. Ohne Spieltag-Daten lässt sich das nicht verteilen, dann
  // zählt diese Ebene 0 statt geraten zu werden (deckt sich mit dem Hinweis
  // oben).
  const saison = sanitizeSaison(r.saison);
  if (saison.enabled && saison.wetten.length && rohSpiele.length) {
    jokerEntscheidungen += saison.wetten.length / rohSpiele.length;
  }

  jokerEntscheidungen = +jokerEntscheidungen.toFixed(2);
  const gesamtProSpieltag = +(tippEntscheidungen + jokerEntscheidungen).toFixed(2);
  const minutenSchaetzung = +((gesamtProSpieltag * SEKUNDEN_JE_ENTSCHEIDUNG) / 60).toFixed(1);

  const stufe = stufeVon(gesamtProSpieltag, spieleProSpieltag);
  if (stufe === "viel" || stufe === "zuviel") {
    hinweise.push(
      "Viele Entscheidungen pro Spieltag sind der häufigste Grund, warum Mitspieler "
      + "aussteigen — das ist ein Zeitschutz-Hinweis, keine Balance-Warnung.",
    );
  }

  return {
    spieleProSpieltag,
    tippEntscheidungen,
    jokerEntscheidungen,
    gesamtProSpieltag,
    minutenSchaetzung,
    stufe,
    hinweise,
  };
}

// Ein Satz für die UI, Muster `beschreibeDuell`/`beschreibeBasis`.
export function beschreibeAufwand(a) {
  const x = a && typeof a === "object" ? a : {};
  const stufe = AUFWAND_STUFEN.find((s) => s.key === x.stufe);
  const stufeLabel = stufe?.label ?? "Unbekannt";
  // Deutsches Dezimalkomma in jeder angezeigten Zahl — dieselbe Behandlung wie
  // bei `AVG_GOALS` in `PresetRating.jsx`. Nur die Anzeige, die Rohwerte im
  // Ergebnisobjekt bleiben Zahlen.
  const kommaZahl = (n) => String(n ?? 0).replace(".", ",");
  return `${kommaZahl(x.gesamtProSpieltag)} Entscheidungen pro Spieltag (${x.spieleProSpieltag ?? 0} Spiele) `
    + `· etwa ${kommaZahl(x.minutenSchaetzung)} Minuten — ${stufeLabel}.`;
}
