# Tippquotenspiel — Projektwissen für Claude Code

Quoten-gewichtetes Fußball-Tippspiel unter Freunden. Kein Echtgeld (bewusste
Glücksspiel-Abgrenzung — wichtig für App-Store-Zulassung). Launch-Ziel:
vor Bundesliga-Start am 28.08.2026. Details zur Strategie: `README.md`.

## Stack

- **Next.js (App Router) + React**, JavaScript (kein TypeScript), Inline-Styles
  (keine CSS-Framework-Abhängigkeit). Import-Alias `@/*` → `src/*`.
- **Tests:** Vitest (`npm test`). Getestet werden Engine + Mock-Store.
- **Backend:** Supabase (`@supabase/supabase-js`). Daten-Schicht steht als
  austauschbarer Store (Mock ↔ Supabase); Live-Anbindung braucht nur ein
  Supabase-Projekt + Env-Vars. Details: `docs/BACKEND.md`.
- **Geplant, noch nicht gebaut:** UI an den Store hängen (Login + echte Daten),
  Quoten-API-Proxy als Next.js-API-Route, Capacitor für App-Stores.

## Struktur

- `src/lib/engine.js` — **die einzige Logik-Quelle** (Scoring, Regelwerk,
  Quoten-Quelle, Creator-Codes). UI-frei. Von `src/lib/engine.test.js` abgesichert.
- `src/components/*.jsx` — die vier Screens (Client Components). Sie rechnen
  NICHT selbst, sie importieren aus der Engine.
- `src/app/` — Routen: `/` (Übersicht), `/tippen`, `/abrechnung`, `/explorer`,
  `/erstellen` (Admin: Regelwerk einstellen + Creator-Code).
- `src/lib/store.js` — **die eine Stelle Mock ↔ Supabase** (wie die Quoten-Quelle).
  `store.mock.js` (In-Memory, seeded), `store.supabase.js` (echte DB),
  `supabaseClient.js` (Client-Factory). Gleiche Schnittstelle, Scoring in der Engine.
- `supabase/schema.sql` + `seed.sql` — DB-Schema (mit RLS) und Demo-Match-Seed.

## Architektur-Regeln (nicht brechen)

1. **Logik vs. UI trennen.** `engine.js` bleibt UI-frei; Screens sind nur „Haut".
   Neue Spiellogik gehört in die Engine + einen Test, nie in eine Komponente.
2. **Quoten-Quelle & Daten-Store sind austauschbar.** `createMockOddsSource()`
   (Quoten) und `getStore()` (Daten) sind je die einzige Stelle, die gegen die
   echte API/DB getauscht wird. API-/service_role-Keys NIE ins Frontend — nur
   serverseitig (API-Route / Env-Var ohne `NEXT_PUBLIC_`).
3. **Märkte sportart-neutral modellieren** (`{ sportart, typ, ankerQuote,
   auswertungs-statistik }`), damit Basketball etc. später ohne Engine-Umbau reinpasst.
4. **Anker immer auf der Quote des REALEN Ergebnisses**, nie auf der getippten —
   sonst wird die Nähe-Belohnung farmbar.

## Scoring-Kurzreferenz

`scoreResult` wertet Ebenen (exakt > abstand > tendenz > keiner), `max()` der
Teile: Sieger-Boden, Abstand, Ergebnis-Nähe (`exp(-k·dist) × Exakt-Quote`),
siegerunabhängige Team-Tore-Nähe. `scoreGoals`: gleicher Spieler 2× =
Doppelpack, 1 Tor = anytime-Floor. `applyCombo`: Tor-Gewinne × Kombi-Faktor
der erreichten Ebene. `toDisplay`: roh × `displayScale` (Anzeige, nie Fairness).
`sanitizeRules` macht aus einem (evtl. importierten) Teil-Regelwerk ein gültiges
— Zahlen auf `RULE_LIMITS` beschnitten; `RULE_LIMITS` speist auch die UI-Regler.

## Arbeitsweise

- Nach Logik-Änderungen: `npm test`. Vor Abschluss: `npm run build`.
- Demo-Daten: Match „JOR-ESP" (Jordanien vs Spanien, real 5:1). Mock-Werte in
  Screens (Leaderboard, Spieltag, Rang) sind als solche kommentiert — sie
  verschwinden, sobald das Backend steht.
- Roadmap (Stand: Screens ✓ an Engine, Spielerstellungs-Screen ✓, Backend-
  Daten-Schicht ✓ als Mock/Supabase-Store): als Nächstes die UI an `getStore()`
  hängen (Login + echte Daten statt Mock-Arrays), zuletzt echte Quoten-API mit
  Test-Key (Key nur serverseitig).
