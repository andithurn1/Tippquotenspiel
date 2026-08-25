// ── Premium-Berechtigung ────────────────────────────────────
// EINE Stelle, die entscheidet, was Premium freischaltet — analog zu
// Quoten-Quelle und Daten-Store. Reine Logik, kein UI, kein I/O.
//
// 🔴 **UMGESTELLT AM 25.08.2026 — Premium sperrt KEINE SPIELFUNKTION MEHR.**
//
// Andi wörtlich: *„ich will keine Funktionen am Gesamten Spiel hinter ner
// Bezahlschranke, ich bin darauf aus auf maximale Verbreitung."*
//
// Was hier vorher stand und jetzt WEG ist: Premium schaltete `joker` und die
// Joker-Abstimmung frei, und `applyEntitlements` setzte ohne Premium schlicht
// `joker.enabled = false`. Eine kostenlose Runde verlor damit ihren Joker —
// und der Joker ist keine Zusatzfunktion, sondern tragende Mechanik.
//
// ⚠️ **Warum die Funktionen trotzdem stehen bleiben und nicht gelöscht sind:**
// Premium verschwindet nicht, es bekommt einen anderen Inhalt. Nach Andis Plan
// ist es (a) später die Werbefreiheit und (b) **eine Belohnung**: wer eine
// Runde anlegt und zehn Leute zum Mitspielen bringt, bekommt es befristet
// geschenkt; Creator können es als Partner-Vergütung bekommen. `premium_until`
// und `isPremium` tragen das unverändert. Nur das SPERREN ist raus.
//
// ⚠️ **Und der Satz, der damit hinfällig ist:** „es reicht, wenn der ADMIN
// Premium hat — die ganze Runde profitiert" war das Verkaufsargument des alten
// Modells. Bei Werbefreiheit trägt er nicht mehr: Werbung sieht jeder für
// sich. Wer ein neues Argument sucht, findet es nicht hier, sondern in der
// Belohnungs-Mechanik.
//
// ⚠️ `applyEntitlements` bleibt als Durchreiche STEHEN, obwohl sie gerade
// nichts tut. Sie ist an zwei Stellen im Store der Ort, an dem eine
// Berechtigung durchgesetzt WIRD — ein Aufrufer, den man erst wieder einbauen
// muss, ist teurer als eine Zeile, die durchreicht.

// Zeitpunkt, bis zu dem Premium gilt (null/abgelaufen = kein Premium).
// Ein Datum statt eines Boolean, damit Abos später ohne Schema-Umbau passen —
// bis dahin setzt man das Feld einfach von Hand in der Datenbank.
export function isPremium(profile, jetzt = Date.now()) {
  const bis = profile?.premium_until;
  if (!bis) return false;
  const ts = typeof bis === "number" ? bis : Date.parse(bis);
  return Number.isFinite(ts) && ts > jetzt;
}

// Was Premium an SPIELFUNKTIONEN freischaltet: **nichts**, und das ist eine
// Entscheidung, kein Rückstand (Andi, 25.08.2026 — siehe Kopf).
//
// ⛔ **Hier wieder etwas einzutragen heißt, eine Funktion hinter die
// Bezahlschranke zu stellen.** Das ist genau das, was Andi ausgeschlossen hat.
// Premium darf Werbefreiheit sein, Auszeichnungen, Dank — nichts, was das
// Spiel selbst verändert.
export const PREMIUM_FEATURES = [];

// Regelwerk auf die Berechtigung zurechtstutzen — **tut derzeit nichts**, weil
// `PREMIUM_FEATURES` leer ist. Siehe Kopf: die Durchreiche bleibt, damit der
// Ort erhalten bleibt, an dem eine künftige Berechtigung durchgesetzt WIRD.
//
// ⚠️ Sie ist bewusst nicht gelöscht: sie wird an zwei Stellen im Store
// aufgerufen (`createRound` in beiden Fassungen). Einen Aufrufer wieder
// einzubauen ist teurer als eine Zeile, die durchreicht — und riskanter,
// weil er dann an EINER der beiden Stellen vergessen wird.
export function applyEntitlements(rules) {
  return rules;
}

// Sperrt eine konkrete Funktion? Seit dem 25.08.2026 **nie** — die Liste ist
// leer. Der Helfer bleibt, damit eine Oberfläche, die fragen will, weiter EINE
// Stelle hat und sich keine eigene Logik baut.
export function isLocked(featureKey, { premium = false } = {}) {
  if (premium) return false;
  return PREMIUM_FEATURES.some((f) => f.key === featureKey);
}
