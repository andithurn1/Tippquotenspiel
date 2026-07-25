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
    // Modifikatoren übernimmt man als Ganzes oder gar nicht.
    keys: ["joker", "teamMods", "modCap", "bigGame", "ereignisse", "wettbewerbe"],
  },
  {
    key: "spiele",
    label: "Spielauswahl",
    hint: "Welche Vereine und welcher Zeitraum überhaupt getippt werden.",
    // Eigener Aspekt statt bei den Regeln: „Regeln von A, Spielauswahl von B"
    // ist genau die Mischung, die man teilen will.
    keys: ["spiele"],
  },
  {
    key: "fairness",
    label: "Anschluss & Versäumnis",
    hint: "Aufhol-Bonus für Zurückliegende und was bei einem vergessenen Spieltag passiert.",
    keys: ["aufholen", "versaeumnis"],
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
    keys: ["markets", "oddsMode"],
  },
  {
    key: "anzeige",
    label: "Anzeige",
    hint: "Punkte-Skalierung und Deckel — reine Optik, keine Fairness.",
    keys: ["displayScale", "perGameCap"],
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
