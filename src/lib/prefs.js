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

export const DEFAULT_PREFS = {
  abrechnung: "voll", vorschau: "voll", zwischenabrechnung: "voll", startScreen: "menu",
};

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
  // 🔴 „aus" ist hier keine Sparversion, sondern die eigentliche Zusage: eine
  // Einblendung, die sich beim Öffnen der App vor alles legt, MUSS abstellbar
  // sein. Wer sie nicht will, soll sie nie wieder sehen — und trotzdem
  // jederzeit selbst in die Abrechnung gehen können.
  zwischenabrechnung: {
    title: "Nach dem Spiel — was passiert ist, während du weg warst",
    hint: "Ob sich die App beim Öffnen meldet, sobald Spiele fertig geworden sind, auf die du getippt hast.",
    levels: {
      voll: "Einblendung mit allen Spielen seit deinem letzten Besuch, samt Punkten.",
      dezent: "Einblendung nur mit der Summe — wie viele Spiele, wie viele Punkte.",
      aus: "Keine Einblendung. Die Abrechnung bleibt über das Menü erreichbar.",
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
    zwischenabrechnung: pick(src.zwischenabrechnung, DEFAULT_PREFS.zwischenabrechnung),
    startScreen: START_SCREENS.includes(src.startScreen) ? src.startScreen : DEFAULT_PREFS.startScreen,
  };
}
