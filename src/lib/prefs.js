// ── Persönliche Anzeige-Einstellungen (pro Nutzer/Browser) ──
// UNABHÄNGIG vom Regelwerk der Runde: das Regelwerk bestimmt die Fairness/
// Punkte (Admin), DIESE Einstellung nur, wie viel vom „Hintergrund" jeder
// selbst sehen will. Drei Stufen je Anzeige.

export const LEVELS = ["voll", "dezent", "aus"];
export const LEVEL_LABEL = { voll: "Voll", dezent: "Dezent", aus: "Aus" };

// App-Start: Standard ist das Hauptmenü (Runde wählen, erstellen, beitreten, …);
// wer will, kann optional direkt in die aktive Tipprunde springen.
export const START_SCREENS = ["menu", "hub"];
export const START_SCREEN_LABEL = { menu: "Hauptmenü", hub: "Aktive Tipprunde" };

export const DEFAULT_PREFS = { abrechnung: "voll", vorschau: "voll", startScreen: "menu" };

// Texte für den Einstellungs-Screen.
export const PREF_META = {
  abrechnung: {
    title: "Abrechnung — Punkte-Mathematik",
    hint: "Wie viel von der Berechnung du nach dem Spiel siehst (Sieger-Boden, Nähebonus, Kombi, Distanz-Leiter).",
    levels: {
      voll: "Volle Aufschlüsselung: alle Bausteine, Distanz-Leiter, Kombi.",
      dezent: "Nur Gesamtpunkte, Rang und ein kurzer Grund.",
      aus: "Maximale Spannung: nur Endpunkte und dein Rang.",
    },
  },
  vorschau: {
    title: "Tippen — Vorschau & Aussicht",
    hint: "Ob dir beim Tippen gezeigt wird, was dein Tipp bringen könnte.",
    levels: {
      voll: "Mögliche Punkte + Aufschlüsselung + Risiko-Einstufung.",
      dezent: "Nur mögliche Punkte und Risiko-Label.",
      aus: "Nichts — blind tippen, volle Überraschung.",
    },
  },
};

export function sanitizePrefs(p = {}) {
  const pick = (v, d) => (LEVELS.includes(v) ? v : d);
  const src = p && typeof p === "object" ? p : {};
  return {
    abrechnung: pick(src.abrechnung, DEFAULT_PREFS.abrechnung),
    vorschau: pick(src.vorschau, DEFAULT_PREFS.vorschau),
    startScreen: START_SCREENS.includes(src.startScreen) ? src.startScreen : DEFAULT_PREFS.startScreen,
  };
}
