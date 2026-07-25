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

**Joker/Gewichtung** (`rules.joker`, Standard aus): skaliert die FERTIGE Wertung
eines Spiels — `jokerFactor` greift in `scoreTip` ganz zuletzt, nach Kombi und
Favoriten-Malus, damit sich nichts multiplikativ aufschaukelt. Deckt dadurch
Ergebnis UND Torschützen mit einem Regler ab. Zwei Modi: `einzel` (ein Spiel
pro Spieltag, `tip.joker === true` → `faktor`) und `ranking` (jedes Spiel trägt
ein `tip.gewicht` aus dem Pool `faktoren`; jeder Pool-Wert nur EINMAL pro
Spieltag — sonst setzt jeder überall das Maximum). Wirkt symmetrisch, also auch
auf ein Minus. Prüfregeln: `invalidJokerMatchdays` / `invalidWeightMatchdays`
— das **Einfrieren ab Anpfiff** ist Sache von Store/UI, wie beim Quoten-Snapshot.
`maxTotalModifier` speist Vorschau und `recommendedDisplayScale` (in
`rulePreview.js`): empfiehlt eine Anzeige-Skalierung, die den höchsten
Modifikator einrechnet — reine Anzeige, nie Fairness.

**Drei Modifikator-Ebenen, additiv gedeckelt** (wichtig, nicht brechen): Joker
(pro Nutzer), Team-/Derby (`rules.teamMods`, pro Begegnung, für ALLE gleich),
Joker-Abstimmung (`voting.js`, pro Spieltag). `totalModifier` fasst Joker +
Team-Mods **additiv** zusammen (1 + Σ Aufschläge) und deckelt bei `rules.modCap`
— multiplikativ würde es die Balance sprengen. Derby wird an `snap.derby`
erkannt; das Label setzt die Daten-Schicht (`DERBYS`/`findDerby` in
`bundesligaData.js`), die Engine kennt keine Vereinsnamen (Regel 3).

**Aufhol-Mechanismus** (`src/lib/catchup.js`, `rules.aufholen`, Standard aus):
Anschluss-Bonus für Zurückliegende. Greift NICHT in `scoreTip`, sondern im
Verlauf — der Bonus hängt am Stand VOR dem Spieltag. `applyCatchup` ist in
`scoreLeaderboardHistory` eingehängt; `getLeaderboard` nimmt bei aktivem Bonus
den Verlaufs-Endstand. Nur ein ANTEIL des Rückstands (Aufholen ≠ Überholen),
erst ab einer Schwelle, drei Stufen (`STAERKE_STUFEN`).

**Balance-Simulator** (`src/lib/balanceSim.js`): Monte-Carlo mit realistischer
Tipper-Population (Favorit/Solide/Kenner/Mutig/Zocker), Ergebnisse AUS DEN
QUOTEN gezogen. Zielbild: der KENNER gewinnt. Kennzahlen: `punkteVerhaeltnis`,
`modifikatorAnteil`, `aufholFlipQuote` → `bewerten()` macht daraus die
grün/gelb/rot-Ampel (`BalanceAmpel.jsx` in der Spielerstellung). Die Presets
sind darauf ausbalanciert; `presets.balance.test.js` sichert es ab — bei
Regelwerk-Änderungen dort prüfen.

**Versäumnis** (`rules.versaeumnis`, `src/lib/autoTip.js`, Standard aus): wer
einen Spieltag vergisst, bekommt einen Ersatz-Tipp statt null Punkte. Der ADMIN
wählt Strategie (`wahrscheinlich` | `schnitt` der Mitspieler-Tipps | `zufall`
aus den plausiblen, geseedet reproduzierbar), `malusProzent` und `maxProSaison`.
Der Ersatz-Tipp ist bewusst der zahmste — durch Tests abgesichert, dass er nie
mehr zahlt als ein mutiger eigener Treffer. `autoTip.js` definiert die Regel
NICHT selbst, sondern liest sie aus dem Regelwerk (eine Quelle).

**Nahe Ergebnisse** (`src/lib/nearResults.js`): „was zahlt mein Tipp, wenn es
knapp anders ausgeht" — gleicher Abstand / ein Tor mehr oder weniger. Speist die
Nachbar-Tabelle beim Tippen und die Punkte-Chips in der Spielwahl (dort die
WAHRSCHEINLICHSTEN Endstände, nicht die bestbezahlten — die sind alle 5:5 und
laufen in den Deckel). Liest nur `scoreTip`, Anker bleibt das reale Ergebnis.

**Preset-Mischen** (`src/lib/presetMerge.js`): zwei Regelwerke über sieben
benannte ASPEKTE kombinieren statt über Einzelregler — zusammengehörige Werte
wandern gemeinsam, damit keine unvermessene Balance entsteht. Ein Test prüft,
dass die Aspekte ALLE Regel-Felder abdecken; wächst das Regelwerk, schlägt er an.

**Spott** (`src/lib/taunts.js`, Screen `/spott`): Spruch + Reaktions-Clip an
einen Mitspieler — bewusst OHNE eigene Tabelle, Versand über die Teilen-Funktion
des Geräts. Spam-Bremse: einer je Ziel und Spieltag.

**Benachrichtigungen** (`src/lib/notify.js`, Screen `/benachrichtigungen`): nur
zwei Anlässe (neuer Spieltag tippbar, ungetipptes Spiel beginnt in X h), mehrere
Vorwarnstufen, Nachtruhe, Tagesobergrenze. `dueNotifications()` entscheidet nur,
WAS fällig wäre — der Versandkanal (Web-Push/App) hängt sich später daran und
ist damit austauschbar wie die Quoten-Quelle. Standard aus.

**Saison-Wetten** (`rules.saison`, `src/lib/saisonwetten.js`, Standard aus): die
nebenbei laufende Langzeit-Ebene (Meister, Torschützenkönig, wenigste Gegentore,
meiste Unentschieden …). Drei Entwurfs-Entscheidungen: (1) **keine Quoten** — der
Admin vergibt Punkte je Wette, ein `gewicht` skaliert die ganze Ebene gegenüber
den Spieltagen; (2) **konstruierbar** — jede Wette ist TYP + Parameter, mit
`ausser: [Verein]` wird aus „Torschützenkönig" die Variante „bester Schütze außer
Bayern" (eigene `wettenId`, also eine eigene Wette); (3) **jede Wette deklariert
ihre Daten** (`braucht`) — Karten/Fouls sind vorbereitet, aber als NICHT
auswertbar markiert, weil unsere Ergebnisse nur Tore + Torschützen tragen.
Jede Wette kann ein FREISCHALT-FENSTER tragen (`abSpieltag`/`bisSpieltag`,
optional `wettbewerb`): „Wer gewinnt die CL?" vor dem 1. Spieltag ist Raten.
Immer ein Fenster, nie nur ein Startpunkt — sonst wüsste, wer später tippt,
mehr bei gleicher Punktzahl. Der Stand kommt aus `aktuellerSpieltag()` je
Wettbewerb; unbekannter Stand hält die Wette ZU.
`sanitizeRules` delegiert an `sanitizeSaison`, damit der Katalog die eine Quelle
bleibt — dadurch landen Saison-Wetten automatisch in den Creator-Codes.

**Tipp-Fenster** (`src/lib/tippfenster.js`, `rules.tippfenster`, Standard 1
Woche): wann ein Spiel überhaupt tippbar ist. Öffnet `vorlaufStunden` vor
Anpfiff (Admin-Sache — echte Quoten gibt es erst wenige Tage vorher), schließt
beim Anpfiff (dieselbe Kante wie der eingefrorene Snapshot). `tippStatus` ist
DREIwertig (`zu`/`offen`/`vorbei`) — „noch nicht" und „vorbei" sind für den
Spieler zwei verschiedene Nachrichten. Ohne verwertbaren Anpfiff gilt ZU.
Die Spielwahl zeigt nur Anstehendes (sonst 465 Spiele), nennt aber immer die
Zahlen der ausgeblendeten; ist gerade nichts offen, zeigt sie die nächsten
gedimmt statt einer leeren Fläche.

**Spielauswahl** (`src/lib/spielauswahl.js`, `rules.spiele`, Standard „alle"):
welche Spiele überhaupt zur Runde gehören — Vereine, Spieltag-Bereich, feste
Liste — dazu `wettbewerbe`/`phasen` für „nur das Interessanteste" (CL ab
Achtelfinale = 15 statt 466 Spiele). Alle Dimensionen wirken UND-verknüpft;
für eine gemischte Wunschliste ist der Modus `liste` da.
Liegt im REGELWERK und reist dadurch im Creator-Code mit (ein Creator
teilt seine ganze Runden-Idee, nicht nur die Wertung). Zwei Wahrheiten
vermeiden: `rules.spiele` schlägt vor, `rounds.team_filter` hält fest, was beim
Anlegen daraus wurde — die Runde gewinnt. Ein Modus ohne seine Daten fällt auf
„alle" zurück, sonst filterte die Auswahl still alles weg.

**Big Game** (`src/lib/bigGame.js`, `rules.bigGame`, Standard aus): das je
Spieltag DYNAMISCH bestimmte Topspiel — ein Derby steht vorher fest, „Erster
gegen Zweiter am 31. Spieltag" nicht. Zwei Punkte nicht brechen: (1) der
Zeitpunkt ist ein FAKTOR, kein Signal — innerhalb eines Spieltags für alle
Spiele gleich, entscheidet also nur, OB es ein Big Game gibt, nie WELCHES;
(2) die Tabellenzone (oben Titel, unten Abstieg, Mitte nichts) wiegt schwerer
als die Ausgeglichenheit der Quoten, sonst gewinnt immer das belanglose
9.-gegen-10. Der Aufschlag fällt in DENSELBEN additiven Topf wie Derby
(`teamModFactor`), ist also kein neuer Multiplikator. `snap.bigGame` setzt die
Daten-Schicht beim Öffnen des Spieltags — eingefroren wie der Quoten-Snapshot,
sonst änderte sich der Wert eines Tipps rückwirkend.

**Wettbewerbs-Gewichte** (`src/lib/wettbewerbGewicht.js`, `rules.wettbewerbe`,
Standard aus): ein CL-Halbfinale zählt mehr als ein Ligaspiel. Der Aufschlag
fällt in DENSELBEN additiven Topf wie Derby und Big Game — kein vierter
Multiplikator. K.-o.-Runden über EINE Stufe mal `PHASE[...].rang`, nicht vier
Regler. Wichtigster Punkt für die UI: **Gewicht pro Spiel ≠ Anteil an der
Wertung** (306 BL- gegen 144 CL-Spiele) — `anteile()` rechnet den
resultierenden Anteil, `anteilHinweis()` benennt die Falle.

**Ereignisse** (`src/lib/ereignisse.js`, `rules.ereignisse`, Standard aus): der
ZWEITE Joker-Topf — Joker, die man sich verdient, statt sie zugeteilt zu
bekommen. Belohnung ist immer eine Joker-Gutschrift, nie ein neuer Punkte-Kanal,
damit `modCap` weiter greift; dazu ein eigener Deckel (`maxErspielt`), sonst
gewänne die Runde, wer die Nebenaufgaben am besten erledigt — eine zweite
Leistungsachse und damit ein Fairness-Bruch. Gedeckelt wird chronologisch.
Jeder Typ deklariert seine Daten (`braucht`) wie bei den Saison-Wetten;
Herausforderungen sind vorbereitet, aber nicht auswertbar und lassen sich
deshalb gar nicht aktivieren. `konflikte()` meldet Trost-Joker + Anschluss-Bonus
als Doppelbelohnung.

**Joker-Verteilung** (`src/lib/jokerPlan.js`, `rules.joker.verteilung`, Standard
`frei`): WANN es überhaupt einen Joker gibt. Der Admin stellt eine FREQUENZ ein
(„etwa jeder 4. Spieltag"), verteilt wird deterministisch aus der Runden-Id —
dadurch sehen alle dasselbe, es ist nachprüfbar, und der Creator-Code bleibt
kurz (gespeichert wird die REGEL, nicht die ausgerollte Liste). Verteilt wird
BLOCKWEISE (je Block genau einer), sonst bündelt reiner Zufall vier Joker in
fünf Spieltagen. Modus `kontingent` gibt jedem gleich VIELE Joker an
verschiedenen Spieltagen — deshalb liefert `fortschritt()` immer „3 von 8" und
nie eine nackte Zahl: ein ungleicher Zwischenstand ist systembedingt und sähe
sonst nach Bevorzugung aus. Empfehlung: Reihenfolge verdeckt, Kontingent offen.
`sanitizeRules` delegiert an `sanitizeVerteilung`.

**Leitplanken der Profi-Stufe** (`src/lib/reglerWarnung.js`): `RULE_LIMITS` ist
die Grenze des ERLAUBTEN, das Empfehlungsband die des ERPROBTEN. Das Band wird
aus den PRESETS abgeleitet (was `presets.balance.test.js` durchmisst, gilt als
erprobt) — ändern sich die Presets, wandert es mit. Dazu handgeschriebene
KOMBINATIONS-Regeln für das, was in keinem Einzelwert steckt (kein Abzug + kein
Cutoff = Gratis-Lose). Jede Meldung kennt ihre Korrektur; Tests sichern, dass
kein Preset und kein Charakter eine Warnung auslöst.

**Weitere Module:** `premium.js` (Berechtigung; nur Admin braucht Premium,
`applyEntitlements` neutralisiert Premium-Regeln ohne Löschen), `records.js`
(Rekorde/Auszeichnungen aus dem Verlauf), `avatars.js` (Profil), `theme.js`
(zentrale Design-Ebene — Farben/Schrift; Account 1s Fanfarben bauen darauf).

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
