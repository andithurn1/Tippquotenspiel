// ============================================================
//  PRESET-MISCHEN — „Schärfe von A, Kombi von B"
//
//  Zwei Regelwerke zu einem verbinden, ohne dass der Nutzer 20 Einzelregler
//  verstehen muss. Der Trick ist die GRUPPIERUNG: die Regeln zerfallen in
//  wenige, benennbare Aspekte („wie streng ist die Nähe?", „wie stark sind
//  die Modifikatoren?"). Je Aspekt wählt man A oder B — fertig.
//
//  Warum nicht feldweise mischen? Weil zusammengehörige Werte auseinander-
//  gerissen die Balance zerstören: `underdogBoost` ohne die passende Rampe
//  oder `k` ohne `minPayout` ergibt Regelwerke, die niemand vermessen hat.
//  Die Gruppen halten genau das zusammen, was zusammengehört.
//
//  Ergebnis läuft IMMER durch sanitizeRules — ein Mix kann also nie ein
//  ungültiges Regelwerk erzeugen.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { DEFAULT_RULES, sanitizeRules } from "./engine";

// Die Aspekte. `keys` = die Regel-Felder, die als Block wandern.
// Reihenfolge = Anzeige-Reihenfolge (wichtigstes zuerst).
export const ASPEKTE = [
  {
    key: "naehe",
    label: "Nähe & Schärfe",
    hint: "Wie schnell die Punkte fallen, wenn du danebenliegst — und was ein Fehltipp kostet.",
    keys: ["k", "m", "minPayout", "wrongPenalty", "winnerFloor"],
  },
  {
    key: "kombi",
    label: "Kombi-Stufen",
    hint: "Wie stark exakt/Abstand/Tendenz die Torschützen-Gewinne vervielfachen.",
    keys: ["combo"],
  },
  {
    key: "underdog",
    label: "Außenseiter & Favoriten",
    hint: "Ob Überraschungen extra zahlen und ob ein Favoriten-Reinfall wehtut.",
    keys: ["underdogBoost", "underdogRampStart", "underdogRampEnd", "favFlopPenalty"],
  },
  {
    key: "modifikatoren",
    label: "Joker & Team-Faktoren",
    hint: "Joker/Gewichtung, Derby-, Team- und Big-Game-Modifikatoren samt Deckel.",
    // bigGame gehört hierher, weil es denselben additiven Topf speist wie
    // Derby und Team-Faktoren — wer die Modifikatoren übernimmt, will es mit.
    // ereignisse gehört hierher, weil es denselben Joker-Topf speist —
    // Modifikatoren übernimmt man als Ganzes oder gar nicht. Aus demselben
    // Grund, nur stärker: duell/budget/limitKlassen/jokerBasis. `budget`
    // bepreist ALLE Joker-Arten, `limitKlassen` deckelt sie, `jokerBasis` gibt
    // ihnen ihre Form — wer die Ökonomie ohne die Joker übernähme (oder
    // umgekehrt), bekäme eine Kombination, die niemand vermessen hat.
    // `drehrad` ebenfalls: es zahlt Joker, Münzen und Modifikatoren aus, also
    // in genau dieselben Töpfe. Ein Rad ohne die Ökonomie, aus der es schöpft,
    // wäre ein Auslöser ohne Wirkung.
    keys: ["joker", "teamMods", "modCap", "modFloor", "bigGame", "ereignisse", "wettbewerbe",
           "duell", "budget", "limitKlassen", "jokerBasis", "drehrad"],
  },
  {
    key: "spiele",
    label: "Spielauswahl, Tipp-Fenster & Zeitachse",
    hint: "Welche Vereine, welcher Zeitraum, wie früh getippt wird — und was ein Spieltag der Runde umfasst.",
    // Eigener Aspekt statt bei den Regeln: „Regeln von A, Spielauswahl von B"
    // ist genau die Mischung, die man teilen will. Tipp-Fenster und Zeitachse
    // gehören dazu, weil sie dieselbe Frage beantworten: WAS steht wann zum
    // Tippen an — die Zeitachse zusätzlich, WIE es zu Spieltagen gebündelt wird.
    keys: ["spiele", "tippfenster", "zeitachse"],
  },
  {
    key: "fairness",
    label: "Anschluss, Versäumnis & Saisonform",
    hint: "Aufhol-Bonus, vergessene Spieltage — und wie stark ein einzelner Spieltag die Saison bestimmt.",
    // `saisonform` gehört hierher, weil es dieselbe Frage beantwortet wie der
    // Aufhol-Bonus: wie stark darf ein Rückstand werden. Die beiden greifen
    // nacheinander auf denselben Verlauf — wer das eine übernimmt, will das
    // andere mit, sonst gleicht ein Bonus einen Abstand aus, den die
    // Saisonform gar nicht entstehen lässt.
    keys: ["aufholen", "versaeumnis", "saisonform"],
  },
  {
    key: "saison",
    label: "Saison-Wetten",
    hint: "Die nebenbei laufenden Langzeit-Tipps (Meister, Torschützenkönig …) samt Gewichtung.",
    keys: ["saison"],
  },
  {
    key: "maerkte",
    label: "Märkte",
    hint: "Worauf überhaupt getippt wird (Ergebnis, Torschützen, Anzahl der Tipps).",
    // `tippEinfluss` gehört hierher, weil es beantwortet, WORAUS die Quote
    // entsteht — also zur selben Frage wie `oddsMode`, nicht zur Fairness.
    keys: ["markets", "oddsMode", "tippEinfluss"],
  },
  {
    key: "anzeige",
    label: "Anzeige & Bedienung",
    hint: "Punkte-Skalierung, Deckel und wie fein die Regler greifen — reine Optik und Bedienung, keine Fairness.",
    // ⚠️ `reglerFeinheit` liegt HIER und nicht bei „Modifikatoren", obwohl es
    // deren Regler betrifft. Es ist gar keine Spielregel: es ändert keinen
    // einzigen Wert, sondern nur, welche Werte der EDITOR anbietet. Wer den
    // Modifikator-Aspekt von jemandem übernimmt, soll dessen Bedienvorliebe
    // nicht mitgeschleppt bekommen — zwei Regelwerke mit identischer Wirkung
    // dürfen sich in der Feinheit unterscheiden.
    // Nebenbei wäre „Modifikatoren" auch sachlich falsch: die Feinheit greift
    // ebenso auf `k`, `m` und die Kombi-Stufen, die in anderen Aspekten liegen.
    keys: ["displayScale", "perGameCap", "reglerFeinheit"],
  },
];

export const ASPEKT_KEYS = ASPEKTE.map((a) => a.key);

// Standard-Auswahl: alles von A (dann ist der Mix erst mal genau A).
export function defaultAuswahl(seite = "a") {
  return Object.fromEntries(ASPEKT_KEYS.map((k) => [k, seite === "b" ? "b" : "a"]));
}

// Nur gültige Auswahlen durchlassen — unbekannte Aspekte fliegen raus,
// unbekannte Seiten fallen auf "a" zurück.
export function sanitizeAuswahl(auswahl = {}) {
  const src = auswahl && typeof auswahl === "object" ? auswahl : {};
  return Object.fromEntries(
    ASPEKT_KEYS.map((k) => [k, src[k] === "b" ? "b" : "a"])
  );
}

// Zwei Regelwerke mischen. `auswahl` = { aspektKey: "a" | "b" }.
// `name` überschreibt den Namen des Ergebnisses (sonst „A × B").
export function mergePresets(a, b, auswahl = {}, name = null) {
  const A = sanitizeRules(a ?? DEFAULT_RULES);
  const B = sanitizeRules(b ?? DEFAULT_RULES);
  const wahl = sanitizeAuswahl(auswahl);

  const out = { ...A };
  for (const aspekt of ASPEKTE) {
    const quelle = wahl[aspekt.key] === "b" ? B : A;
    for (const k of aspekt.keys) out[k] = quelle[k];
  }
  out.name = name || `${A.name || "A"} × ${B.name || "B"}`;
  return sanitizeRules(out);
}

// Welche Aspekte unterscheiden sich überhaupt? Nur die muss man entscheiden —
// bei identischen Aspekten ist die Wahl egal, das blendet die UI aus.
export function unterschiede(a, b) {
  const A = sanitizeRules(a ?? DEFAULT_RULES);
  const B = sanitizeRules(b ?? DEFAULT_RULES);
  return ASPEKTE.filter((aspekt) =>
    aspekt.keys.some((k) => JSON.stringify(A[k]) !== JSON.stringify(B[k]))
  ).map((aspekt) => aspekt.key);
}

// Kurzbeschreibung des Mixes für die Vorschau: welcher Aspekt kommt woher.
export function beschreibeMix(a, b, auswahl = {}) {
  const A = sanitizeRules(a ?? DEFAULT_RULES);
  const B = sanitizeRules(b ?? DEFAULT_RULES);
  const wahl = sanitizeAuswahl(auswahl);
  const diff = new Set(unterschiede(A, B));
  return ASPEKTE
    .filter((aspekt) => diff.has(aspekt.key))
    .map((aspekt) => ({
      key: aspekt.key,
      label: aspekt.label,
      von: wahl[aspekt.key] === "b" ? (B.name || "B") : (A.name || "A"),
      seite: wahl[aspekt.key],
    }));
}
