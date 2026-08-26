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
    hint: "Wie stark exakt/Abstand/Tendenz die Torschützen-Gewinne vervielfachen — und ob ein seltener Schütze extra zählt.",
    // ⚠️ `kombi` (der Bonus aus B16) gehört in DENSELBEN Aspekt wie `combo`:
    // beide beantworten „was ist das Zusammentreffen wert?". Getrennt könnte
    // ein Teil-Code den Bonus mitbringen, ohne die Stufen, auf die er sich
    // bezieht — zwei Hälften einer Regel, die einzeln reisen.
    keys: ["combo", "kombi"],
  },
  {
    key: "underdog",
    label: "Außenseiter & Favoriten",
    hint: "Ob Überraschungen extra zahlen und ob ein Favoriten-Reinfall wehtut.",
    keys: ["underdogBoost", "underdogRampStart", "underdogRampEnd", "favFlopPenalty"],
  },
  // 🔴 JOKERCODE (Andis TC3, gebaut am 23.08.2026). Vorher lagen Joker,
  // Ereignisse, Drehrad und alle Modifikatoren in EINEM Aspekt — ein
  // „Jokercode" gab es deshalb nicht, man konnte nur den ganzen Block teilen.
  //
  // ⚠️ Der Kommentar, der die Bündelung begründete, argumentierte mit BALANCE
  // („eine Kombination, die niemand vermessen hat"). Genau dieser Einwand ist
  // seit Andis Ansage vom 21.08.2026 hinfällig: „will ein Admin etwas
  // Unbalanciertes, soll er es haben." Damit war es eine reine Bauaufgabe.
  //
  // Der Zuschnitt folgt dem, was ein Admin teilen WILL, und deckt sich mit den
  // Sondermenüs: hier steht alles, was einen Joker ausmacht — was er ist
  // (`joker`), welche Form er hat (`jokerBasis`), was er kostet (`budget`),
  // wie oft es ihn gibt (`limitKlassen`) und wen er treffen darf (`duell`).
  {
    key: "joker",
    label: "Jokercode",
    hint: "Alles rund um Joker: Art und Stärke, Grundform, Narren-Shop, Kontingente und Fremdjoker.",
    // ⚠️ `eingriffe` gehört zwingend dazu: es ist das DACH über `duell` (JK7,
    // 23.08.2026). Ein Joker-Teilcode ohne dieses Feld übernähme Klau und
    // Block, ließe aber offen, ob die Familie in der Zielrunde überhaupt
    // eingeschaltet ist — und ein geladener Code, der halb wirkt, ist
    // schlimmer als einer, der gar nicht wirkt.
    keys: ["joker", "jokerBasis", "budget", "limitKlassen", "duell", "eingriffe"],
  },
  // 🔴 EREIGNIS-CODE (Andis TC4) — „samt Auslosung am Rad", deshalb steht das
  // Drehrad hier und nicht bei den Jokern: es ist der ZWEITE Auslöser derselben
  // Frage („wodurch verdient man sich etwas?"), und wer die Ereignisse teilt,
  // meint das Rad mit.
  {
    key: "ereignisse",
    label: "Ereignis-Code",
    hint: "Was man sich erspielen kann — Ereignisse und die Auslosung am Drehrad.",
    keys: ["ereignisse", "drehrad"],
  },
  {
    key: "modifikatoren",
    label: "Modifikatoren",
    hint: "Derby-, Team-, Big-Game- und Wettbewerbs-Modifikatoren samt gemeinsamem Deckel.",
    // Was hier bleibt, teilt sich EINEN additiven Topf und EINEN Deckel:
    // Derby/Team, Big Game, Wettbewerbs-Gewichte und der Tabellen-Bonus. Wer
    // sie übernimmt, will sie zusammen — ein Derby-Faktor ohne den Deckel, der
    // ihn begrenzt, ist eine halbe Regel.
    //
    // ⚠️ `modCap`/`modFloor` bleiben hier, obwohl sie AUCH den Joker deckeln.
    // Der Deckel gehört zum Topf, nicht zu einem seiner Zuflüsse — sonst
    // brächte ein Jokercode einen fremden Deckel mit und veränderte
    // stillschweigend, was Derby und Big Game wert sind.
    keys: ["teamMods", "modCap", "modFloor", "bigGame", "wettbewerbe", "tabellenBonus"],
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
    // `alleinstellung` gehört ebenfalls hierher und NICHT zu den
    // Modifikatoren: sie ist kein Multiplikator im additiven Topf, sondern ein
    // eigener Punkte-Kanal — und sie beantwortet dieselbe Frage wie der
    // Anschluss-Bonus, nur von der anderen Seite: wie stark darf ein einzelner
    // Spieltag die Abstände verschieben. Wer die eine Antwort übernimmt, will
    // die andere mit.
    keys: ["aufholen", "versaeumnis", "saisonform", "alleinstellung"],
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
    // Die Favoriten-Sperre gehört ebenfalls hierher: sie entscheidet, WAS
    // wählbar ist — dieselbe Frage wie „welche Märkte gibt es überhaupt".
    // Nicht zur Fairness: sie verrechnet nichts, sie nimmt etwas weg.
    keys: ["markets", "oddsMode", "tippEinfluss", "sperre"],
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
  {
    key: "mitbestimmung",
    label: "Mitbestimmung",
    hint: "Ob die Runde über Regeländerungen abstimmt — und welchen Rahmen die Verfassung dafür setzt.",
    // 🔴 Dieser Aspekt ist der EINZIGE, über den nie abgestimmt werden kann
    // (design/abstimmung-verfassung.md Abschnitt 6: „Abstimmung über die
    // Verfassung selbst — dann ist sie keine"). Durchgesetzt wird das in
    // `regelAbstimmung.js` über `MITBESTIMMUNG_ASPEKT`, nicht hier: hier ist
    // er ein ganz normaler Aspekt, damit er beim Mischen wandert und im
    // Creator-Code mitreist. Ein Creator teilt seine ganze Runden-Idee, und
    // „wie entscheidet ihr" gehört dazu.
    // Beide Blöcke zusammen, weil sie sich gegenseitig bedingen: eine
    // Verfassung ohne Abstimmung regelt nichts, eine Abstimmung ohne
    // Verfassung hat keinen Rahmen.
    keys: ["verfassung", "regelAbstimmung"],
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
