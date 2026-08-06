// ============================================================
//  LINT — bewusst NUR zwei Regeln
//
//  Aufruf:  npm run lint
//
//  🔴 Warum es ihn gibt, und warum er so klein ist: am 06.08.2026 ist beim
//  Umbau von `SaisonTipps.jsx` eine Variable (`gestartet`) weggefallen, die
//  weiter unten im JSX noch stand. **Weder `npm run build` noch die 2019 Tests
//  haben das gesehen** — eine undeklarierte Variable wirft erst BEIM RENDERN,
//  und für Komponenten gibt es keine Tests. Der Screen wäre im Browser weiß
//  geblieben. Gefunden beim Nachlesen.
//
//  ⚠️ Bewusst KEIN volles Regelwerk. Ein frischer ESLint auf einem gewachsenen
//  Projekt meldet Hunderte Stilfragen — und eine Halde wird beim dritten Mal
//  ignoriert (dieselbe Lehre wie beim ersten `tot`-Lauf mit 85 Einträgen).
//  Hier stehen genau die zwei Regeln, für die es im Projekt einen BELEG gibt:
//
//    no-undef                   — der Fund von heute (weißer Screen)
//    react-hooks/rules-of-hooks — in CLAUDE.md dokumentiert: „Hooks stehen VOR
//                                 jedem frühen return", `Tippabgabe.jsx` lag
//                                 daran eine Weile still kaputt
//
//  Wer eine dritte Regel ergänzt, bringt bitte den Fund mit, der sie
//  rechtfertigt.
// ============================================================
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    files: ["src/**/*.{js,jsx}", "scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // ⚠️ Aus: das Projekt trägt `eslint-disable`-Kommentare für Regeln, die
    // hier bewusst NICHT eingeschaltet sind (`exhaustive-deps`, `no-console`).
    // Sie als „unnötig" zu melden wäre genau die Halde, die dieser Lauf
    // vermeiden soll — und die Kommentare sind richtig, sobald jemand die
    // Regeln einschaltet.
    linterOptions: { reportUnusedDisableDirectives: false },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
