"use client";

// ── Demo-Nutzer und Demo-Runde ──────────────────────────────
// Die zwei Konstanten, die Mock-Betrieb und DB gemeinsam haben. Mehr steht
// hier nicht mehr, und das ist die Pointe der Datei:
//
// ⛔ `getCurrentUser()` stand hier bis zum 25.08.2026 — als „EINE Stelle zum
// Umstellen, analog zu getStore()". Nur ist die eine Stelle für den Nutzer
// längst eine andere: `AuthProvider` (CLAUDE.md, wörtlich „die eine Quelle
// für den Nutzer"). Der Provider liest die Session selbst
// (`getSession` + `onAuthStateChange`) und bildet sie mit `mapUser` ab.
//
// 🔴 Und die zwei Antworten waren NICHT dieselbe. `mapUser` liefert
// `display_name || <Teil vor dem @> || "Ich"` plus `email`, `nameSet`,
// `fanColors` und `prefs`; `getCurrentUser` lieferte `email ?? "Ich"` und
// sonst nichts. Wer sie benutzt hätte, hätte die volle Mailadresse dort
// angezeigt, wo überall sonst der Anzeigename steht — und niemand hätte es
// dem Aufruf angesehen. Kein Aufrufer heißt hier also nicht „vergessen",
// sondern „noch nicht passiert".
//
// Wird der Nutzer außerhalb von React gebraucht (API-Route, Skript), gehört
// die Ableitung in EINE Funktion, die `mapUser` teilt — nicht in eine
// zweite Fassung daneben.

import { DEMO_ROUND_ID } from "./constants";

// Gemeinsame Demo-Runde (gleiche Id in Mock-Store und DB).
export { DEMO_ROUND_ID };
export const DEMO_USER = { id: "u-du", name: "Du" };
