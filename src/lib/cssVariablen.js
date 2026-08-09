// ============================================================
//  CSS-VARIABLEN — dieselben Farben für Inline-Styles UND Stylesheet
//
//  🔴 Das Problem, das diese Datei löst, ist genau die „zweite Wahrheit", vor
//  der die Runden-Schicht in CLAUDE.md warnt — nur für Farben:
//
//    · Die Screens lesen `C.gold` aus `theme.js` (ein Objekt im Speicher).
//    · Das Stylesheet liest `var(--tqs-gold)` (ein Wert im Dokument).
//
//  Beides muss dasselbe sein, sonst leuchtet ein Knopf in einer anderen Farbe,
//  als er gefüllt ist. Und es KANN auseinanderlaufen: `applyFanColors` ändert
//  die Akzente zur Laufzeit auf die Vereinsfarben des Nutzers.
//
//  Deshalb: `theme.js` bleibt die Quelle, diese Datei spiegelt sie ins
//  Dokument. Eine Richtung, nie andersherum.
//
//  ⚠️ Läuft nur im Browser (`document`). Auf dem Server greifen die Vorgaben
//  aus `globals.css` — die sind dieselben Werte, damit die Seite schon vor dem
//  ersten Javascript richtig aussieht und nicht kurz umspringt.
// ============================================================
import { COLORS } from "./theme";

// Welcher Farbschlüssel wird zu welcher Variable? Bewusst eine ausdrückliche
// Liste und keine automatische Umwandlung aller Schlüssel: das Stylesheet
// benutzt eine Handvoll: was dort nicht vorkommt, gehört nicht ins Dokument.
const ABBILDUNG = {
  ink: "--tqs-ink",
  ink2: "--tqs-ink2",
  surface: "--tqs-surface",
  surface2: "--tqs-surface2",
  line: "--tqs-line",
  lineStrong: "--tqs-line-strong",
  text: "--tqs-text",
  muted: "--tqs-muted",
  ghost: "--tqs-ghost",
  gold: "--tqs-gold",
  mint: "--tqs-mint",
  coral: "--tqs-coral",
};

export function schreibeCssVariablen(ziel = null) {
  const wurzel = ziel ?? (typeof document !== "undefined" ? document.documentElement : null);
  if (!wurzel) return null;
  const gesetzt = {};
  for (const [schluessel, variable] of Object.entries(ABBILDUNG)) {
    const wert = COLORS[schluessel];
    if (typeof wert !== "string" || !wert) continue;
    wurzel.style.setProperty(variable, wert);
    gesetzt[variable] = wert;
  }
  return gesetzt;
}

export const CSS_VARIABLEN = ABBILDUNG;
