// ============================================================
//  SPANNUNG — wie eng liegt die ganze Runde beieinander
//
//  design/joker-ausloeser.md, Abschnitt 2b. Anders als `limitKlassen.js`s
//  bisherige Aktivierungs-Bedingungen (Kalender: „ab Spieltag 12" · Person:
//  „ich liege 30 Punkte hinten") misst `spannung` die VERFASSUNG DER GANZEN
//  RUNDE — und die kann von Spieltag zu Spieltag umschlagen.
//
//  ── Vier `bezug`-Werte, zwei `art`-Werte ────────────────────
//  `bezug` wählt, WELCHE Spieler in den Vergleich einfließen: `ersterZweiter`
//  (nur Platz 2), `ersterLetzter` (nur das Schlusslicht), `spitzengruppe`
//  (Plätze 2…n, n = `plaetze`), `feld` (alle außer Platz 1). `art` wählt die
//  EINHEIT: `relativ` (Anteil an den Punkten von Platz 1, z. B. 0.9 = „hat
//  90 % von Platz 1") oder `absolut` (Punkte-Abstand).
//
//  ⚠️ `relativ` ist die VORGABE (design/joker-ausloeser.md, Abschnitt 2b).
//  Absolute Punkte bedeuten je nach `displayScale` und Saisonlänge etwas
//  völlig anderes — 30 Punkte Rückstand sind in einer Runde viel und in der
//  nächsten nichts. `relativ` bleibt über Runden hinweg vergleichbar.
//
//  ── ⚠️ Die Skalen zeigen in ENTGEGENGESETZTE Richtungen ──────
//  Bei `relativ` bedeutet ein HÖHERER Wert ENGER (0.9 = fast gleichauf,
//  0.1 = weit abgehängt) — das ist die Zahl, die `limitKlassen.js`s
//  `abSpannung`/`unterSpannung` bei `art: "relativ"` mit `>=`/`<` prüfen.
//  Bei `absolut` ist es umgekehrt: der Rückgabewert ist der reine
//  Punkte-ABSTAND — je GRÖSSER, desto WEITER auseinander. `limitKlassen.js`
//  dreht die Vergleichsrichtung deshalb bei `art: "absolut"` um (`<=`/`>`
//  statt `>=`/`<`). Das ist bewusst so und keine Inkonsistenz: „absolut" soll
//  für Admins, die ihre Runde kennen, eine lesbare Punktzahl liefern
//  (design/joker-ausloeser.md, Abschnitt 2b) — keine erfundene, vorzeichen-
//  gedrehte Kunstzahl. Deshalb gilt „enges Feld ergibt eine höhere Spannung"
//  ausdrücklich nur für `relativ` (siehe spannung.test.js).
//
//  ── `gewichtung`: 0…1, gewichtet zur Spitze ─────────────────
//  Bei `spitzengruppe`/`feld` fließen mehrere Spieler in EINEN Wert ein.
//  `gewichtung` entscheidet, wie stark der Abstand zur Spitze dabei zählt:
//  Gewicht je Spieler = (Rangabstand zu Platz 1) ^ (−gewichtung). Bei 0 ist
//  jedes Gewicht 1 (alle Ränge zählen gleich). Bei 1 sinkt das Gewicht mit
//  1/Rangabstand (Platz 2 dominiert, Platz 8 kaum). Vorgabe hoch (0.7), weil
//  die Frage laut Spec fast immer „zieht der Erste davon?" lautet, nicht
//  „wie liegt Platz 7 zu Platz 8". Bei `ersterZweiter`/`ersterLetzter" fließt
//  ohnehin nur EIN anderer Spieler ein — `gewichtung` hat dort keinen
//  messbaren Einfluss (die gewichtete Mittelung über ein einziges Element
//  ist immer dieses Element selbst).
//
//  ── Leeres/einelementiges Board: definierter Wert, kein NaN ──
//  Ohne mindestens zwei Spieler gibt es nichts zu vergleichen — es kann
//  niemand „davonziehen". Das wird als das ENGE Extrem der jeweiligen Skala
//  gewertet: `relativ` → 1 (= 100 % Übereinstimmung, „so eng wie es nur
//  geht"), `absolut` → 0 (= kein Punkte-Abstand). Beides ist konsistent mit
//  der oben beschriebenen Richtung. Dieselbe Regel gilt, wenn ein `bezug`
//  bei der aktuellen Spielerzahl keinen „anderen" Spieler findet (z. B.
//  `spitzengruppe` mit `plaetze: 1`).
//
//  ── Warum die Prüfung selbst NICHT hier lebt ────────────────
//  `spannungVon` liefert nur die Zahl. Ob eine Klasse deswegen offen ist,
//  entscheidet `limitKlassen.js` (`abSpannung`/`unterSpannung`) — dieselbe
//  Aufteilung, die `rueckstandVon`/`vorsprungVon` dort schon vormachen.
//
//  Reine Funktionen, UI-frei.
// ============================================================

export const SPANNUNG_BEZUG = [
  { key: "ersterZweiter", label: "Erster zu Zweiter", desc: "Abstand von Platz 1 zu Platz 2." },
  { key: "ersterLetzter", label: "Erster zu Letztem", desc: "Abstand von Platz 1 zum Schlusslicht." },
  { key: "spitzengruppe", label: "Spitzengruppe", desc: "Streuung über die ersten Plätze der Tabelle." },
  { key: "feld", label: "Ganzes Feld", desc: "Streuung über die gesamte Tabelle." },
];

export const SPANNUNG_ART = [
  { key: "relativ", label: "Relativ", desc: "Anteil an den Punkten von Platz 1. Vorgabe." },
  { key: "absolut", label: "Absolut", desc: "Punkte-Abstand zu Platz 1. Für Admins, die ihre Runde kennen." },
];

export const SPANNUNG_LIMITS = {
  gewichtung: { min: 0, max: 1, step: 0.05 },
  plaetze: { min: 2, max: 20, step: 1 },
};

export const DEFAULT_SPANNUNG = {
  bezug: "ersterZweiter",
  art: "relativ",
  gewichtung: 0.7,
  plaetze: 3,
};

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// Bereinigt eine VOLLE Konfiguration — jedes Feld gesetzt, fehlende/ungültige
// Werte fallen auf DEFAULT_SPANNUNG zurück. Muster `sanitizeBasis`.
export function sanitizeSpannung(partial) {
  const p = partial && typeof partial === "object" ? partial : {};
  const bezug = SPANNUNG_BEZUG.some((b) => b.key === p.bezug) ? p.bezug : DEFAULT_SPANNUNG.bezug;
  const art = SPANNUNG_ART.some((a) => a.key === p.art) ? p.art : DEFAULT_SPANNUNG.art;
  return {
    bezug,
    art,
    gewichtung: clamp(p.gewichtung, SPANNUNG_LIMITS.gewichtung, DEFAULT_SPANNUNG.gewichtung),
    plaetze: Math.round(clamp(p.plaetze, SPANNUNG_LIMITS.plaetze, DEFAULT_SPANNUNG.plaetze)),
  };
}

// Welche „anderen" Spieler (alle außer Platz 1) je nach `bezug` einfließen —
// `sortiert` ist absteigend sortiert, Platz 1 (Index 0) bleibt außen vor.
function andereVon(sortiert, cfg) {
  if (cfg.bezug === "ersterZweiter") return sortiert.slice(1, 2);
  if (cfg.bezug === "ersterLetzter") return sortiert.length > 1 ? sortiert.slice(-1) : [];
  if (cfg.bezug === "spitzengruppe") {
    const n = Math.min(cfg.plaetze, sortiert.length);
    return sortiert.slice(1, n);
  }
  return sortiert.slice(1); // "feld"
}

// Wie eng liegt die Runde beieinander — eine Zahl, siehe Kopfkommentar für
// die Richtung je `art`.
export function spannungVon(board, cfg) {
  const c = sanitizeSpannung(cfg);
  const liste = Array.isArray(board) ? board : [];
  const sortiert = [...liste].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));

  // Enges Extrem der jeweiligen Skala — siehe Kopfkommentar.
  const keineDistanz = c.art === "absolut" ? 0 : 1;
  if (sortiert.length < 2) return keineDistanz;

  const erster = Number(sortiert[0].total) || 0;
  const andere = andereVon(sortiert, c);
  if (!andere.length) return keineDistanz;

  // Gewicht je Spieler: (Rangabstand zu Platz 1) ^ (−gewichtung). `andere[0]`
  // ist immer Platz 2 (Rangabstand 1), unabhängig vom `bezug`.
  let gewichtSumme = 0;
  let summe = 0;
  andere.forEach((eintrag, idx) => {
    const rangabstand = idx + 1;
    const gewicht = Math.pow(rangabstand, -c.gewichtung);
    const total = Number(eintrag.total) || 0;
    const wert = c.art === "absolut"
      ? Math.max(0, erster - total)
      : erster > 0 ? Math.max(0, Math.min(1, total / erster)) : 1;
    gewichtSumme += gewicht;
    summe += gewicht * wert;
  });

  return gewichtSumme > 0 ? summe / gewichtSumme : keineDistanz;
}

// Ein Satz für die UI, Muster `beschreibeBasis`/`beschreibeKlasse`.
export function beschreibeSpannung(cfg) {
  const c = sanitizeSpannung(cfg);
  const bezugLabel = SPANNUNG_BEZUG.find((b) => b.key === c.bezug)?.label ?? c.bezug;
  const artText = c.art === "absolut" ? "als Punkte-Abstand" : "als Anteil an Platz 1";
  const gewichtungText = c.gewichtung >= 0.99
    ? "voll zur Spitze gewichtet"
    : c.gewichtung <= 0.01
      ? "ohne Gewichtung zur Spitze"
      : `zu ${Math.round(c.gewichtung * 100)} % zur Spitze gewichtet`;
  return `${bezugLabel}, gemessen ${artText}, ${gewichtungText}.`;
}
