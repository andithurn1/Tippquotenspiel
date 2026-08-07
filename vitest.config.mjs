import { defineConfig } from "vitest/config";
import path from "node:path";

// ⛔ BALANCE-TESTS SIND STILLGELEGT (Andi, 07.08.2026) ─────────
//
// Balancing ist Endphase — die verbindliche Fassung steht ganz oben in
// `CLAUDE.md`. Diese beiden Dateien prüfen NICHT, ob eine Einstellung greift,
// sondern ob die gewählten ZAHLEN gut sind. Genau das wird am Ende ohnehin
// neu gemacht, und bis dahin erzeugen sie Rückmeldungen über ein Problem,
// das keines ist.
//
// 🔴 **Nicht gelöscht, nur ausgehängt.** Sie sind die Vorarbeit für die
// Endphase und tragen Wissen, das sonst verloren ginge (wie stark eine
// Stichprobe streut, welche Seeds stabil sind, warum 60 statt 30 Saisons).
//
// ▶️ **Wieder anschalten:** diese Liste leeren. Dazu die beiden
// `describe.skip` in `charaktere.test.js` und `einfachRegler.test.js` (jeweils
// „Schnelltest Balance") auf `describe` zurückstellen — die Dateien selbst
// laufen weiter, weil sie daneben die Stufen-Abdeckung prüfen.
//
// ⚠️ **Was NICHT betroffen ist und weiterlaufen MUSS:** ob eine Einstellung
// GREIFT und ob sie ERREICHBAR ist. Das misst `npm run greift` / `stufen` /
// `tot` / `anzeige` gegen die echte Wertung, nicht gegen den Simulator.
const BALANCE_TESTS = [
  "src/lib/presets.balance.test.js",
  "src/lib/balanceSim.test.js",
];

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.js"],
    // Die Vorgabe von Vitest (`node_modules`, `dist`, …) wird durch ein eigenes
    // `exclude` ERSETZT, nicht ergänzt — deshalb stehen sie hier mit drin.
    exclude: [...BALANCE_TESTS, "**/node_modules/**", "**/.next/**", "**/dist/**"],
  },
});
