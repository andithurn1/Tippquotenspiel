// ── Presets-Bibliothek für die Spielerstellung ──────────────
// Startpunkte, keine Einbahnstraße: jedes Preset ist ein normales,
// sanitizeRules-geprüftes Regelwerk — nach der Auswahl bleiben alle Regler
// weiter frei einstellbar, und das Ergebnis lässt sich wie jedes andere
// Regelwerk als Creator-Code exportieren/teilen (encodePreset/decodePreset,
// siehe engine.js) — Presets sind also selbst nur ein kuratierter Startwert,
// keine eigene Code-Infrastruktur.

import { DEFAULT_RULES, sanitizeRules } from "./engine";

export const PRESETS = [
  {
    key: "standard",
    label: "Standard",
    desc: "Ausgewogen, kein Underdog-Boost — die Quote allein entscheidet.",
    rules: DEFAULT_RULES,
  },
  {
    key: "underdog-party",
    label: "Underdog-Party",
    desc: "Außenseiter-Siege zahlen nochmal deutlich obendrauf — für Runden, die Überraschungen extra feiern wollen.",
    rules: sanitizeRules({
      ...DEFAULT_RULES, name: "Underdog-Party",
      underdogBoost: 2, underdogRampStart: 2.5, underdogRampEnd: 6,
    }),
  },
  {
    key: "hardcore",
    label: "Hardcore",
    desc: "Nur Exakt zählt wirklich, Nähe verzeiht wenig, Strafe bei komplett falsch.",
    rules: sanitizeRules({
      ...DEFAULT_RULES, name: "Hardcore",
      k: 1.3, wrongPenalty: -1, combo: { ...DEFAULT_RULES.combo, exakt: 3 },
    }),
  },
  {
    key: "gemuetlich",
    label: "Gemütlich",
    desc: "Nähe zählt großzügig, kein Cutoff, keine Strafen — entspannt mittippen.",
    rules: sanitizeRules({
      ...DEFAULT_RULES, name: "Gemütlich",
      k: 0.35, minPayout: 0,
    }),
  },
];
