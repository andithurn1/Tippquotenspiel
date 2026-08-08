// ============================================================
//  TAPZIEL — wie klein darf ein Knopf sein?
//
//  Apple verlangt 44 pt, Google 48 dp. Gemessen wurde am 07.08.2026 auf dem
//  iPhone 14 (390 px): auf dem Erstellungs-Screen lagen **18** Tippziele
//  darunter, in der Profi-Stufe **110**. Das ist keine Geschmacksfrage — ein
//  27 px hoher Knopf wird auf dem Handy danebengetroffen.
//
//  ── Warum eine Konstante und keine globale CSS-Regel ──
//  Eine Regel wie `button { min-height: 44px }` wäre in einer Zeile erledigt
//  und an zwei Stellen falsch: `min-height` schlägt `height`, damit würde aus
//  dem 30×30-Stepper ein 30×44-Streifen, und jeder Text-Link im Fließtext
//  („… Einstellungen hier") bekäme eine Kastenhöhe mitten im Satz. Das
//  Projekt arbeitet ohnehin mit Inline-Styles (CLAUDE.md, Stack) — die
//  Konstante passt dazu und lässt sich pro Stelle bewusst weglassen.
//
//  ── Wo es NICHT gilt ──
//  Text-Links innerhalb eines Satzes. Sie sind Fließtext, kein Bedienelement
//  in einer Reihe; eine Kastenhöhe zerreißt dort die Zeile.
//
//  Verwendung: `style={{ ...TAPZIEL, ...der Rest }}`
export const TAPZIEL = { minHeight: 44, boxSizing: "border-box" };

// Quadratische Knöpfe (Stepper, Icon-Knöpfe): hier muss auch die BREITE mit,
// sonst entsteht ein hoher, dünner Streifen.
export const TAPZIEL_QUADRAT = { minWidth: 44, minHeight: 44, boxSizing: "border-box" };
