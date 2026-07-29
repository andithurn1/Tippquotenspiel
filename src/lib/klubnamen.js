// ============================================================
//  KLUBNAMEN — die Übersetzung zwischen Quoten-API und unserem Katalog
//
//  Die Quoten-API nennt den Klub „Bayern Munich", unser Katalog
//  „FC Bayern München". Ohne Abbildung findet KEIN einziger Snapshot sein
//  Match — die Quoten kämen an und lägen dann neben dem Spielplan.
//
//  ── Warum eine explizite Liste und keine Ähnlichkeitssuche ──
//  Dieselbe Entscheidung wie beim Spielplan-Import: ein automatisch geratener
//  Klub fällt nirgends mehr auf. „Real Madrid" und „Real Sociedad" liegen
//  einander näher als manche Schreibvariante desselben Vereins; ein Fuzzy-Match
//  würde irgendwann still das falsche Spiel bequoten, und das merkt man erst,
//  wenn jemand auf ein Ergebnis tippt, das zu ganz anderen Quoten gehört.
//
//  Aufgeführt sind nur ABWEICHUNGEN. Wer gleich heißt, braucht keinen Eintrag —
//  sonst wächst die Liste ins Unpflegbare und verdeckt die echten Fälle.
//
//  Reine Daten und reine Funktionen, UI-frei.
// ============================================================

// API-Name → unser Katalog-Name, je Wettbewerb. Getrennt gehalten, weil
// derselbe Kurzname in zwei Ligen verschiedene Klubs meinen kann.
export const KLUB_ALIASE = {
  bl: {
    "Bayern Munich": "FC Bayern München",
    "Bayer Leverkusen": "Bayer 04 Leverkusen",
    "Borussia Monchengladbach": "Borussia Mönchengladbach",
    "Augsburg": "FC Augsburg",
    "Elversberg": "SV Elversberg",
    "FSV Mainz 05": "1. FSV Mainz 05",
    "Union Berlin": "1. FC Union Berlin",
    "Werder Bremen": "SV Werder Bremen",
    "SC Paderborn": "SC Paderborn 07",
  },
  // ⚠️ Für pl/pd/sa steht hier bewusst (fast) nichts: dort stimmen nicht die
  // SCHREIBWEISEN nicht überein, sondern die Klub-LISTEN — siehe
  // `unbekannteKlubs()` und die Roadmap. Aliase einzutragen, bevor die Listen
  // stimmen, würde den eigentlichen Fehler verdecken.
  pl: {},
  pd: {},
  sa: {},
};

// Einen API-Namen in unseren Katalog übersetzen. Unbekannte Namen kommen
// UNVERÄNDERT zurück — der Aufrufer soll sie als unbekannt erkennen können,
// statt ein stillschweigend falsches Ergebnis zu bekommen.
export function ausApiName(wettbewerb, name) {
  return KLUB_ALIASE[wettbewerb]?.[name] ?? name;
}

// Welche Klubs der API kennt unser Katalog nicht? DAS ist die eigentliche
// Prüfung vor jedem Quoten-Abruf: solange hier etwas übrig bleibt, würden
// Quoten ins Leere laufen.
//
// Rückgabe trennt die zwei Fälle, weil sie verschiedene Reaktionen verlangen:
//  • `unbekannt` — Name kommt bei uns nicht vor. Entweder fehlt ein ALIAS
//    (Schreibweise) oder der Klub fehlt wirklich (falsche Liga-Besetzung).
//  • `fehlend`   — Klub steht bei uns, taucht bei der API aber nicht auf.
//    Zusammen mit `unbekannt` ist das das Muster für Auf-/Absteiger.
export function unbekannteKlubs(apiNamen = [], unsereNamen = [], wettbewerb = null) {
  const unsere = new Set(unsereNamen);
  const uebersetzt = apiNamen.map((n) => ausApiName(wettbewerb, n));
  const unbekannt = [...new Set(uebersetzt.filter((n) => !unsere.has(n)))].sort();
  const gesehen = new Set(uebersetzt);
  const fehlend = [...unsere].filter((n) => !gesehen.has(n)).sort();
  // ⚠️ Bewusst KEINE Vermutung, ob es sich um Schreibweisen oder um Auf- und
  // Absteiger handelt. Der erste Versuch hier war „gleich viele auf beiden
  // Seiten = Kaderwechsel" — das ist falsch: bei der Serie A sind 17 der 20
  // Abweichungen bloß deutsche Namen (AC Mailand ↔ AC Milan) und trotzdem
  // stehen auf beiden Seiten gleich viele. Eine Diagnose, die in der Mehrzahl
  // der Fälle danebenliegt, ist schlechter als keine: sie schickt den Leser in
  // die falsche Richtung, und er glaubt ihr, weil sie nach Messung aussieht.
  // Beide Listen nebeneinander sind für einen Menschen in Sekunden lesbar.
  return { unbekannt, fehlend, ok: unbekannt.length === 0 };
}
