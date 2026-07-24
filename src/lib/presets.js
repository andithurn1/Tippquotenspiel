// ── Presets-Bibliothek für die Spielerstellung ──────────────
// Startpunkte, keine Einbahnstraße: jedes Preset ist ein normales,
// sanitizeRules-geprüftes Regelwerk — nach der Auswahl bleiben alle Regler
// weiter frei einstellbar, und das Ergebnis lässt sich wie jedes andere
// Regelwerk als Creator-Code exportieren/teilen (encodePreset/decodePreset,
// siehe engine.js) — Presets sind also selbst nur ein kuratierter Startwert,
// keine eigene Code-Infrastruktur.
//
// ── Warum diese Zahlen? (Balance, mit balanceSim.js nachgemessen) ──
// Ohne Dämpfung gewinnt in JEDER Variante der Dauerzocker: Ein Fehltipp kostet
// nichts (wrongPenalty 0) und die Nähe-Boni zahlen auch bei komplett falschem
// Tipp etwas — Außenseiter-Wetten sind dann Gratis-Lose mit riesiger Auszahlung.
// Gemessen: mehr Außenseiter-Anteil = linear mehr Punkte.
//
// Zwei Regler drehen das zuverlässig um:
//   • wrongPenalty < 0  — der fehlende „Einsatz", ohne den Longshots immer lohnen
//   • minPayout 3,5–5   — Cutoff, damit nicht jeder Tipp noch Krümel abwirft
//
// Zielbild jedes Presets: Es gewinnt der KENNER — wer gezielt wagt und dabei
// etwa jede vierte Überraschung erwischt — nicht der Dauerzocker und nicht der
// reine Favoriten-Tipper. Die Werte unten sind alle so nachgemessen
// (siehe presets.balance.test.js, das genau das absichert).

import { DEFAULT_RULES, sanitizeRules } from "./engine";

// Gemeinsame Dämpfung, ohne die jede Variante zum Zocker-Spiel wird.
const BALANCE = { k: 1.3, minPayout: 3.5, wrongPenalty: -5 };

export const PRESETS = [
  {
    key: "standard",
    label: "Standard",
    desc: "Ausgewogen: Mut zahlt sich aus, aber gute Tipps setzen sich über die Saison durch.",
    rules: sanitizeRules({ ...DEFAULT_RULES, name: "Standard", ...BALANCE }),
  },
  {
    key: "underdog-party",
    label: "Underdog-Party",
    desc: "Außenseiter-Siege zahlen zusätzlich obendrauf — für Runden, die Überraschungen extra feiern wollen.",
    rules: sanitizeRules({
      ...DEFAULT_RULES, name: "Underdog-Party",
      ...BALANCE, k: 1.6, minPayout: 5,
      underdogBoost: 1.6, underdogRampStart: 3, underdogRampEnd: 8,
    }),
  },
  {
    key: "hardcore",
    label: "Hardcore",
    desc: "Nur Exakt zählt wirklich, Nähe verzeiht wenig, Fehltipps tun weh.",
    rules: sanitizeRules({
      ...DEFAULT_RULES, name: "Hardcore",
      ...BALANCE, k: 1.6, minPayout: 5,
      combo: { ...DEFAULT_RULES.combo, exakt: 3 },
    }),
  },
  {
    key: "joker",
    label: "Joker",
    premium: true,
    desc: "Ein Spiel pro Spieltag zählt doppelt — ein mutiger Tipp kann den ganzen Spieltag drehen.",
    rules: sanitizeRules({
      ...DEFAULT_RULES, name: "Joker", ...BALANCE,
      joker: { enabled: true, modus: "einzel", faktor: 2 },
    }),
  },
  {
    key: "rangliste",
    label: "Rangliste",
    premium: true,
    desc: "Du verteilst feste Gewichte (2× · 1,5× · 1,2× · 1×) auf deine Spiele — gleicher Pool für alle, die Verteilung ist die Kunst.",
    rules: sanitizeRules({
      ...DEFAULT_RULES, name: "Rangliste", ...BALANCE,
      // faktor spiegelt den Pool-Höchstwert, damit ein Wechsel auf „einzel"
      // nicht plötzlich einen anderen Faktor zeigt.
      joker: { enabled: true, modus: "ranking", faktor: 2, faktoren: [2, 1.5, 1.2, 1] },
    }),
  },
  {
    key: "gemuetlich",
    label: "Gemütlich",
    desc: "Nähe zählt großzügiger, Fehltipps kosten weniger — entspannt mittippen.",
    rules: sanitizeRules({
      ...DEFAULT_RULES, name: "Gemütlich",
      k: 1.1, minPayout: 3.5, wrongPenalty: -4,
    }),
  },
];
