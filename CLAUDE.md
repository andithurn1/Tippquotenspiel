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
  Quoten-Quelle, Creator-Codes, `scoreLeaderboard`, `projectTip`). UI-frei.
  Von `src/lib/engine.test.js` abgesichert.
- `src/components/*.jsx` — die Screens + Provider (Client Components). Screens
  rechnen NICHT selbst, sie importieren aus der Engine: `Tippabgabe`,
  `Abrechnung`, `AuszahlungsExplorer`, `Spielerstellung` (Regelwerk + Runde
  anlegen), `RundeBeitreten`, `Einstellungen`. Provider: `AuthProvider`
  (`useAuth`), `RoundProvider` (`useCurrentRound` — aktive Runde, localStorage),
  `PrefsProvider` (`usePrefs` — persönliche Anzeige-Stufen).
- `src/app/` — Routen: `/` (Übersicht), `/tippen`, `/abrechnung`, `/explorer`,
  `/erstellen` (Admin: Regelwerk einstellen + Runde anlegen + Creator-Code),
  `/beitreten` (Runde per Code beitreten/wechseln), `/einstellungen`.
- `src/lib/store.js` — **die eine Stelle Mock ↔ Supabase** (wie die Quoten-Quelle).
  `store.mock.js` (In-Memory, seeded), `store.supabase.js` (echte DB),
  `supabaseClient.js` (Client-Factory), `joinCode.js` (Beitritts-Code-Generator).
  Gleiche Schnittstelle inkl. `createRound`/`joinRound`, Scoring in der Engine.
- `supabase/schema.sql` + `seed.sql` — DB-Schema (mit RLS, idempotent) und
  Demo-Match-Seed + Gemeinschaftsrunde.

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
- Auth: `AuthProvider` (Context) ist die eine Quelle für den Nutzer — Mock liefert
  Demo-User „Du", live kommt supabase.auth (Magic-Link) + Auto-Beitritt zur
  Freundeskreis-Runde (`DEMO_ROUND_ID` in `constants.js`, gleich in Mock + DB).
- Runden: `RoundProvider`/`useCurrentRound` hält die AKTIVE Runde (localStorage,
  Default `DEMO_ROUND_ID`) — unabhängig vom Regelwerk und vom Login. Neue Runde
  → `getStore().createRound()` (generiert Beitritts-Code via `joinCode.js`,
  Admin wird automatisch Mitglied). Beitreten → `getRoundByCode()` +
  `joinRound()`, dann `setRoundId()`. Tippabgabe/Abrechnung lesen `roundId`
  ausschließlich aus `useCurrentRound()`, nie mehr hart codiert.
- **RLS-Hinweis (wichtig bei Schema-Änderungen):** `rounds` ist für alle
  Eingeloggten lesbar (`using (true)`) — nötig, damit Beitritt-per-Code eine
  Runde findet, BEVOR man Mitglied ist; der Code selbst ist die Zugangsschranke,
  nicht die Sichtbarkeit. `round_members` erlaubt SELECT für alle Mitglieder
  DERSELBEN Runde (Self-Join-Policy), sonst sähe das Leaderboard nur die eigene
  Zeile. Bei Supabase-Schema-Updates: `schema.sql` ist idempotent, im SQL Editor
  einfach erneut komplett ausführen.
- Roadmap (Stand: Screens ✓, Spielerstellung ✓, Backend-Daten-Schicht ✓,
  UI an `getStore()` + E-Mail-Login ✓, Runden-Erstellung/-Beitritt ✓): als
  Nächstes echte Quoten-API mit Test-Key (Key nur serverseitig).
