// ============================================================
//  MANNSCHAFTS-GEWICHTE — die eine Stufenleiter
//
//  🔴 Andis MOD5: „Ligen und Mannschaften einzeln höher gewichten." Der
//  Liga-Teil sitzt seit dem 29.08.2026 in den Sonderregeln je Liga, der
//  Mannschafts-Teil daneben. Damit gibt es ZWEI Oberflächen für denselben
//  Wert (`rules.teamMods.teams`) — im Modifikatoren-Sondermenü und bei der
//  Liga.
//
//  ⚠️ **Und genau deshalb steht die Leiter hier und nicht in einer der beiden.**
//  Sie war eine modulprivate Konstante in `ModifikatorenSondermenue.jsx`. Wer
//  sie für die zweite Stelle abschreibt, hat am Tag des Abschreibens dasselbe
//  Verhalten und ein halbes Jahr später zwei verschiedene — der Verlauf, den
//  dieses Projekt bei den Eckenradien (G2) und beim `wer`-Katalog (K1) schon
//  hatte.
//
//  ── Warum Durchklicken und kein Regler ──
//  Ein Verein trägt entweder einen Aufschlag oder keinen; dazwischen gibt es
//  nichts zu treffen. Eine Leiter mit sechs Stufen ist auf dem Handy ein
//  Tippziel statt eines 4-px-Reglers, und die Runde landet nie auf ×1,37.
//
//  ⚠️ **Die Leiter endet auf 1 und das ist der Ausgang**, nicht das Ende: nach
//  der letzten Stufe steht der Verein wieder auf „normal", und der Eintrag
//  verschwindet ganz. Bliebe er als `1` stehen, trüge jeder Creator-Code eine
//  Liste von Vereinen mit sich, an denen nichts eingestellt ist.
// ============================================================

// Rauf, dann runter, dann aus. Erst die häufigen Aufschläge, danach die
// selteneren Abwertungen — die Reihenfolge ist die erwartete Richtung.
export const TEAM_STUFEN = [1.25, 1.5, 2, 0.75, 0.5, 1];

// Was zeigt dieser Verein gerade? `1` heißt „nichts eingestellt".
export function teamFaktor(teams = {}, team) {
  const v = Number(teams?.[team]);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

// Eine Stufe weiter. Gibt die NEUE Teams-Karte zurück, nicht den Faktor —
// der Aufrufer soll nicht selbst entscheiden müssen, ob eine 1 gespeichert
// oder gelöscht wird.
//
// ⚠️ Unbekannte Werte (aus einem alten Creator-Code, von Hand geschrieben)
// landen auf der ERSTEN Stufe statt auf `undefined`: `indexOf` liefert dann
// `-1`, und `(-1 + 1) % 6` ist 0. Das ist gewollt — ein Klick muss immer
// etwas tun.
export function naechsteStufe(teams = {}, team) {
  const karte = { ...(teams ?? {}) };
  const jetzt = teamFaktor(karte, team);
  const i = TEAM_STUFEN.indexOf(jetzt);
  const naechster = TEAM_STUFEN[(i + 1) % TEAM_STUFEN.length];
  if (naechster !== 1) karte[team] = naechster;
  else delete karte[team];
  return karte;
}

// Wie viele Vereine tragen überhaupt ein Gewicht? Für die Standzeile.
export function gewichteteTeams(teams = {}) {
  return Object.keys(teams ?? {}).length;
}
