// ============================================================
//  ALLEINSTELLUNG — Bonus, wenn sonst (fast) niemand richtig lag
//
//  Andis Wunsch vom 09.08.2026, wörtlich: „so wie bei Stadt-Land-Fluss —
//  wenn man als Einziger richtig lag, nochmal Bonus." Dazu die zweite Hälfte
//  desselben Gedankens: „ein Bonus, wenn die anderen in der Tipprunde alle
//  schlecht waren."
//
//  ── 🔴 Warum das NICHT in `scoreTip` stehen kann ──
//  `scoreTip` sieht EINEN Tipp. „Ich war der Einzige" ist aber eine Aussage
//  über alle anderen Tipps desselben Spiels. Diese Ebene gehört deshalb
//  dorthin, wo alle Einträge zusammenkommen — genau wie `tippEinfluss.js`
//  (mischt das Raster aus allen Tipps) und `catchup.js` (hängt am Stand vor
//  dem Spieltag). Ein Screen, der es selbst nachrechnet, wäre die zweite
//  Wahrheit, vor der die Runden-Schicht in CLAUDE.md warnt.
//
//  ── 🔴 Warum die Belohnung PUNKTE sind und kein Faktor ──
//  CLAUDE.md, nicht verhandelbar: „Drei Modifikator-Ebenen, additiv
//  gedeckelt … multiplikativ würde es die Balance sprengen." Ein Faktor hier
//  wäre ein VIERTER Multiplikator, und zwar einer, der NACH `modCap` greift —
//  der Deckel wäre damit wirkungslos. Der Bonus ist deshalb ein Zuschlag auf
//  die Punkte dieses Spiels, mit einem EIGENEN, sichtbaren Deckel. Dieselbe
//  Konstruktion wie `maxErspielt` bei den Ereignissen, und aus demselben
//  Grund.
//  Der Zuschlag kann trotzdem ANTEILIG gesetzt werden („die Hälfte obendrauf")
//  — das ist bequemer als eine feste Punktzahl, die bei jeder Quote anders
//  wirkt. Gedeckelt wird er in beiden Fällen bei `maxZuschlag`.
//
//  ── ⚠️ Die Schutzregel, ohne die es kaputt ist ──
//  `minTipper`. In einer Runde zu zweit ist man IMMER allein, sobald der
//  andere danebenliegt — der Bonus wäre dann kein Sonderfall, sondern die
//  Normalzahlung. Deshalb greift er erst, wenn genug Leute auf dieses Spiel
//  getippt haben.
//
//  ⚠️ ERSATZ-Tipps (`autoTip.js`) zählen standardmäßig NICHT mit: weder als
//  Treffer noch als Mitbewerber. Wer einen Spieltag vergisst, bekommt einen
//  zahmen Ersatz — würde der als „Konkurrent, der auch richtig lag" gelten,
//  entschiede die Kulanz der Runde über den Bonus eines anderen. Umstellbar,
//  weil eine Runde das auch anders sehen darf.
//
//  Reine Funktionen, UI-frei. Keine Balance-Aussagen — was gute Werte sind,
//  wird am Ende entschieden (CLAUDE.md, Block ganz oben).
// ============================================================

// Die Trefferebenen aus `scoreResult`, von grob nach fein.
// „keiner" ist keine Ebene, die man erreichen kann — sie steht für daneben.
export const EBENEN = [
  { key: "tendenz", label: "Sieger richtig", desc: "Wer gewinnt (oder Remis) stimmt." },
  { key: "abstand", label: "Abstand richtig", desc: "Die Tordifferenz stimmt." },
  { key: "exakt",   label: "Ergebnis exakt", desc: "Beide Torzahlen stimmen." },
];

const RANG = { keiner: 0, tendenz: 1, abstand: 2, exakt: 3 };

export const ALLEIN_MODI = [
  { key: "alleine", label: "Nur als Einziger",
    desc: "Der Bonus kommt, wenn außer dir niemand die Ebene erreicht hat." },
  { key: "wenige", label: "Wenn es wenige waren",
    desc: "Bis zu einer festen Zahl von Treffern zählt es noch als Alleingang." },
  { key: "anteil", label: "Wenn es ein kleiner Teil war",
    desc: "Gemessen am Anteil der Tipper — wächst mit der Rundengröße mit." },
];

export const ALLEIN_ARTEN = [
  { key: "anteil", label: "Anteil obendrauf", desc: "Ein Teil der Punkte dieses Spiels zusätzlich." },
  { key: "punkte", label: "Feste Punkte", desc: "Immer derselbe Zuschlag, unabhängig von der Quote." },
];

export const ALLEIN_LIMITS = {
  maxTipper:   { min: 1,  max: 10,   step: 1 },
  maxAnteil:   { min: 0.05, max: 0.9, step: 0.05 },
  anteil:      { min: 0.1, max: 3,   step: 0.1 },
  punkte:      { min: 10, max: 2000, step: 10 },
  maxZuschlag: { min: 50, max: 5000, step: 50 },
  minTipper:   { min: 2,  max: 20,   step: 1 },
  maxProSaison: { min: 0, max: 50,   step: 1 },
};

export const DEFAULT_ALLEINSTELLUNG = {
  enabled: false,
  // Ab welcher Trefferebene gilt ein Tipp als „richtig"?
  ebene: "abstand",
  // Wann gilt man als allein?
  modus: "alleine",
  maxTipper: 2,        // nur für `wenige`
  maxAnteil: 0.25,     // nur für `anteil`
  // Wie wird belohnt?
  art: "anteil",
  anteil: 1,           // 1 = die Punkte dieses Spiels noch einmal obendrauf
  punkte: 200,         // nur für `punkte`
  maxZuschlag: 1000,   // eigener Deckel je Spiel — siehe Kopf
  // Schutzregeln
  minTipper: 3,
  ersatzZaehlt: false,
  maxProSaison: 0,     // 0 = unbegrenzt
};

const zahl = (v, { min, max }, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

export function sanitizeAlleinstellung(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const d = DEFAULT_ALLEINSTELLUNG;
  const L = ALLEIN_LIMITS;
  return {
    enabled: p.enabled === true,
    ebene: EBENEN.some((e) => e.key === p.ebene) ? p.ebene : d.ebene,
    modus: ALLEIN_MODI.some((m) => m.key === p.modus) ? p.modus : d.modus,
    maxTipper: Math.round(zahl(p.maxTipper, L.maxTipper, d.maxTipper)),
    maxAnteil: zahl(p.maxAnteil, L.maxAnteil, d.maxAnteil),
    art: ALLEIN_ARTEN.some((a) => a.key === p.art) ? p.art : d.art,
    anteil: zahl(p.anteil, L.anteil, d.anteil),
    punkte: Math.round(zahl(p.punkte, L.punkte, d.punkte)),
    maxZuschlag: Math.round(zahl(p.maxZuschlag, L.maxZuschlag, d.maxZuschlag)),
    minTipper: Math.round(zahl(p.minTipper, L.minTipper, d.minTipper)),
    ersatzZaehlt: p.ersatzZaehlt === true,
    maxProSaison: Math.round(zahl(p.maxProSaison, L.maxProSaison, d.maxProSaison)),
  };
}

// Hat dieser Tipp die geforderte Ebene erreicht?
export function ebeneErreicht(ebene, schwelle) {
  return (RANG[ebene] ?? 0) >= (RANG[schwelle] ?? 0) && (RANG[ebene] ?? 0) > 0;
}

// Wie viele Treffer sind noch ein „Alleingang"?
export function grenzeFuer(anzahlTipper, a) {
  if (a.modus === "alleine") return 1;
  if (a.modus === "wenige") return a.maxTipper;
  return Math.max(1, Math.floor(anzahlTipper * a.maxAnteil));
}

// ── Die eigentliche Rechnung ────────────────────────────────
// `eintraege` sind bereits BEWERTETE Einträge, chronologisch:
//   { key, userId, matchId, ebene, wert, ersatz }
// `wert` ist die fertige Punktzahl dieses Spiels (nach Modifikatoren und
// Ersatz-Malus) — der Zuschlag hängt daran, damit er zur angezeigten Zahl
// passt und nicht zu einer Zwischengröße.
//
// ⚠️ Gedeckelt wird CHRONOLOGISCH, wie bei den Ereignissen: wer früh im Jahr
// alleine richtig lag, bekommt den Bonus — nicht der, dessen Spiel zufällig
// zuletzt in der Liste steht.
export function alleinstellungBoni(eintraege = [], rules = {}) {
  const a = sanitizeAlleinstellung(rules?.alleinstellung);
  const boni = new Map();
  if (!a.enabled || !eintraege.length) return boni;

  // Je Spiel: wer hat die Ebene erreicht, und wie viele haben überhaupt getippt?
  const proSpiel = new Map();
  for (const e of eintraege) {
    if (!e.matchId) continue;
    const zaehltMit = a.ersatzZaehlt || !e.ersatz;
    const g = proSpiel.get(e.matchId) || { tipper: 0, treffer: 0 };
    if (zaehltMit) {
      g.tipper += 1;
      if (ebeneErreicht(e.ebene, a.ebene)) g.treffer += 1;
    }
    proSpiel.set(e.matchId, g);
  }

  const proNutzer = new Map();
  for (const e of eintraege) {
    if (!e.matchId) continue;
    if (!a.ersatzZaehlt && e.ersatz) continue;
    if (!ebeneErreicht(e.ebene, a.ebene)) continue;
    const g = proSpiel.get(e.matchId);
    // Die Schutzregel: in einer zu kleinen Gruppe ist „allein" bedeutungslos.
    if (!g || g.tipper < a.minTipper) continue;
    if (g.treffer > grenzeFuer(g.tipper, a)) continue;

    if (a.maxProSaison > 0) {
      const n = proNutzer.get(e.userId) ?? 0;
      if (n >= a.maxProSaison) continue;
      proNutzer.set(e.userId, n + 1);
    }

    const roh = a.art === "punkte" ? a.punkte : Math.round((Number(e.wert) || 0) * a.anteil);
    const zuschlag = Math.min(a.maxZuschlag, Math.max(0, roh));
    if (zuschlag > 0) boni.set(e.key, { zuschlag, treffer: g.treffer, tipper: g.tipper });
  }
  return boni;
}

// ── Live-Vorschau ───────────────────────────────────────────
// CLAUDE.md: „Die Live-Vorschau ist kein Komfort, sondern die Betreuung."
// „Anteil 1" sagt niemandem etwas — „aus 300 Punkten werden 600" schon.
export function beschreibeAlleinstellung(rules = {}, beispielPunkte = 300) {
  const a = sanitizeAlleinstellung(rules?.alleinstellung);
  if (!a.enabled) return "Aus — ein einsamer Treffer zählt wie jeder andere.";
  const ebene = EBENEN.find((e) => e.key === a.ebene)?.label ?? a.ebene;
  const wann = a.modus === "alleine"
    ? "wenn sonst niemand"
    : a.modus === "wenige"
      ? `wenn höchstens ${a.maxTipper} Tipper`
      : `wenn höchstens ${Math.round(a.maxAnteil * 100)} % der Tipper`;
  const roh = a.art === "punkte" ? a.punkte : Math.round(beispielPunkte * a.anteil);
  const zuschlag = Math.min(a.maxZuschlag, roh);
  const gedeckelt = zuschlag < roh ? ` (auf ${a.maxZuschlag} gedeckelt)` : "";
  return `„${ebene}“ und ${wann} es auch trifft: +${zuschlag} Punkte${gedeckelt}`
    + ` — aus ${beispielPunkte} werden ${beispielPunkte + zuschlag}.`
    + ` Erst ab ${a.minTipper} Tippern je Spiel.`
    + (a.maxProSaison > 0 ? ` Höchstens ${a.maxProSaison}× pro Saison.` : "");
}
