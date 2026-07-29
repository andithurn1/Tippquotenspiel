# Tippquotenspiel — Projektwissen für Claude Code

Quoten-gewichtetes Fußball-Tippspiel unter Freunden. Kein Echtgeld (bewusste
Glücksspiel-Abgrenzung — wichtig für App-Store-Zulassung). Launch-Ziel:
vor Bundesliga-Start am 28.08.2026. Details zur Strategie: `README.md`.

## Session-Start (bei einem frischen Chat zuerst lesen)

An diesem Projekt arbeiten ZWEI Claude-Sessions verschiedener Accounts
asynchron über dieses Repo. Ein neuer Chat kennt nur diese Datei — der Rest
steht im Repo und muss aktiv gelesen werden, aber **nur die Enden**, die
Dateien sind lang:

1. `git fetch origin main` + auf aktuellen Stand bringen. `main` bewegt sich,
   die andere Session pusht dazwischen.
2. `design/roadmap.md` — was fertig ist und was als Nächstes ansteht. Wer
   etwas fertig macht, trägt es dort SOFORT ein.
3. **Die ersten ~230 Zeilen** von `COORDINATION.md` — der Kanal zur anderen
   Session. Das Nachrichten-Log ist **neueste oben** sortiert, davor stehen
   Spielregeln, Claim-Board (wer hat welchen Bereich) und Push-Regeln. Die
   Datei ist über 1700 Zeilen lang; alles WEITER UNTEN ist Historie und wird
   nicht gebraucht. Vor dem Anfassen eines Bereichs dort eintragen und pushen.
4. Erst dann arbeiten. Nach Logik-Änderungen `npm test`, vor Abschluss
   `npm run build`.

Erlaubnisse liegen in `.claude/settings.json` (committed) — Lesen/Schreiben,
`git`, `npm`, `node`; nur Force-Pushes fragen nach. Da ist nichts einzurichten.

### Arbeitsweise, die Andi ausdrücklich will

- **Möglichst wenig Rückfragen.** Andi schaut nur gelegentlich rüber. Aufgaben
  hintereinander wegarbeiten, Entscheidungen aus den Repo-Dokumenten ableiten
  statt zu fragen. Nachfragen nur, wenn die Antwort das VORGEHEN ändert und
  sich nicht aus Roadmap/Kanal/Code ergibt.
- **Keine Erlaubnis-Schleifen.** Commit + Push nach jedem abgeschlossenen
  Schritt, ohne vorher zu fragen. Klein und oft (Push-Regeln unten).
- **Befunde ins Repo, nicht in den Chat.** Was auffällt, gehört nach
  `design/roadmap.md` bzw. `COORDINATION.md` — dort sieht es auch die andere
  Session, ein Chatverlauf ist nach dem Fenster weg.
- **Messen statt annehmen.** In dieser Sitzung sind zwei eigene Fehlmessungen
  aufgeflogen, beide durch eine ANNAHME statt einer Messung (siehe `RHO` in
  `oddsApi.js`). Wo eine Zahl gebraucht wird: erst nachmessen.

### ⚙️ Werkzeug-Fallen auf diesem Rechner (Account 1 / Andi)

- **Node ist NICHT im PATH.** Vor jedem `npm`-Aufruf im Bash-Tool:
  ```bash
  export PATH="/c/Users/andit/AppData/Local/Microsoft/WinGet/Packages/OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe/node-v24.18.0-win-x64:$PATH"
  ```
- **`npm run build` NICHT bei laufendem Dev-Server** — überschreibt `.next`,
  danach lädt der Dev-Server stumm nichts mehr. Erst `preview_stop`.
- **Commit-Nachrichten über eine Datei** (`git commit -F <datei>`), nicht per
  `-m` mit Anführungszeichen: PowerShell zerlegt sie sonst.
- **Der Mock-Store lebt im Arbeitsspeicher.** Ein voller Seitenwechsel im
  Browser setzt ihn zurück — angelegte Runden sind dann weg.

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
QUOTEN gezogen. Jeder Tipper hat einen VEREIN (ein Spiel je Spieltag) und
tippt ihn zu optimistisch (`FAN_OPTIMISMUS`) — ohne diese Fan-Brille würde der
Heimat-Joker systematisch zu gut bewertet, weil er nur die Gewinne verstärkte
statt auch die voreingenommenen Fehltipps. Favoriten-Tipper und Zocker sind
davon ausgenommen: sie sind Messinstrumente, keine Menschen. Zielbild: der KENNER gewinnt. Kennzahlen: `punkteVerhaeltnis`,
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
Ins **Leaderboard** kommen sie über `src/lib/saisonBoard.js` — EINE Quelle für
beide Stores (vorher lag die Funktion zweimal da und war schon auseinander-
gelaufen). Zwei Regeln stecken drin: (1) im Board steht, wer ETWAS abgegeben hat
— Match-Tipp ODER Saison-Wette; das Board wird aus Match-Tipps gebaut, ein
reiner Saison-Tipper fehlte sonst ganz (ein Mitglied ohne jeden Tipp bleibt
draußen, es gibt nichts zu ranken). (2) Ergänzt wird NACH dem Verlauf, sonst
bekäme ein reiner Saison-Tipper Anschluss-Boni für Spieltage, die er nie
mitgespielt hat. Anzeige: `tips === 0` → „nur Saison" statt „0/0".
**Saisonstart** (= Sperre der fensterlosen Wetten) zählt nur Anpfiffe in ECHTEN
Wettbewerben (`istEchterWettbewerb` in `wettbewerbe.js`): das Demo-Länderspiel
liegt in der Vergangenheit und steckt in jedem Match-Katalog, auch im Seed der
Live-DB — es fror sonst ALLE Saison-Wetten von Anfang an ein.

**Tipp-Fenster** (`src/lib/tippfenster.js`, `rules.tippfenster`, Standard 1
Woche): wann ein Spiel überhaupt tippbar ist. Öffnet `vorlaufStunden` vor
Anpfiff (Admin-Sache — echte Quoten gibt es erst wenige Tage vorher), schließt
beim Anpfiff (dieselbe Kante wie der eingefrorene Snapshot). `tippStatus` ist
DREIwertig (`zu`/`offen`/`vorbei`) — „noch nicht" und „vorbei" sind für den
Spieler zwei verschiedene Nachrichten. Ohne verwertbaren Anpfiff gilt ZU.
Die Spielwahl zeigt nur Anstehendes (sonst 465 Spiele), nennt aber immer die
Zahlen der ausgeblendeten; ist gerade nichts offen, zeigt sie die nächsten
gedimmt statt einer leeren Fläche.

**Zeitachse** (`src/lib/zeitachse.js`, `rules.zeitachse`): was „Spieltag 5" in
einer Runde über MEHRERE Ligen heißt. Die Ligen starten versetzt und zählen
jede für sich — gemeint ist aber der Spieltag DER RUNDE, sobald etwas rundenweit
passiert (Joker, Anschluss-Bonus, Zwischenstand). Ein TAKTGEBER (Standard: die
früheste Liga) gibt den Rhythmus vor, alles bis zum nächsten Ankerpunkt gehört
dazu; Alternative ist ein fester Wochen-Modus. Reine Struktur und Anzeige,
**keine Wertung** — `scoreTip` ist unberührt, der Balance-Simulator sieht die
Achse nicht — mit EINER Ausnahme: `rundenSchluessel(achse)` ist der Ersatz für
`spieltagKey` überall dort, wo „einmal pro Spieltag" gemeint ist (Joker,
Ranglisten-Pool). `invalidJokerMatchdays`, `invalidWeightMatchdays` und
`weightUsageForMatchday` nehmen ihn als letzten, optionalen Parameter; ohne ihn
bleibt es beim Liga-Spieltag, es gibt also keinen stillen Regelwechsel. Über
den Liga-Spieltag geschlüsselt bekäme ein Tipper in einer Runde mit fünf
Wettbewerben fünf Joker pro Woche statt einem. Bei nur einem Wettbewerb sind
beide Schlüssel deckungsgleich. Vier Punkte, die nicht brechen dürfen: (1) zugeordnet wird immer
ein GANZER Liga-Spieltag (`spieltagKey`), dorthin wo sein erstes Spiel liegt —
ein BL-Spieltag läuft Fr–So und läge sonst links und rechts eines Ankerpunkts;
ein halber Spieltag ist der Punkt, an dem aus einer Anzeige- eine Fairness-Frage
wird. (2) `rundenSpieltagVon` schlägt in der fertigen Achse NACH und rechnet
nicht neu — sonst zwei Wahrheiten. (3) Spiele VOR dem ersten Ankerpunkt fallen
in Runden-Spieltag 1 statt zu verschwinden. (4) Die Überfüllungs-Warnung misst
RELATIV zum üblichen Spieltag (Median), nie an einer festen Zahl: über vier
Ligen sind 39 Spiele eine normale Woche, mit CL 57 — eine feste Schwelle meldet
den Normalfall. Ihre Ursache liest sie am Zeitfenster ab (lange Fenster = Pause
im Taktgeber, normale = mehrere Wettbewerbe fallen zusammen).

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
(`teamModFactor`), ist also kein neuer Multiplikator.
**Eingefroren wird der WERT, nicht das Urteil:** `matches` ist global, dieselbe
Begegnung gehört zu vielen Runden. Ein Häkchen „das ist das Big Game" hieße,
dass die zuerst öffnende Runde für alle mitentscheidet. `spieltagOeffnen` legt
deshalb nur `snap.bigGameWert` ab (objektiv, aus dem Tabellenstand beim
Öffnen); ob das als Big Game zählt, entscheidet jede Runde beim Auswerten mit
ihrer eigenen `minSpannung`. Eingefroren ist es trotzdem — die Fairness-Regel
gilt weiter.
**Anzeige** (Spielwahl, Tippabgabe, `breakdown.js`): nie am Snapshot ablesen,
immer über `bigGameAufschlag(snap, rules)` — derselbe Wert liegt in einer
anderen Runde evtl. unter der Schwelle. Dazu immer `snap.bigGameGrund` zeigen
(beim Öffnen mit eingefroren): ein Aufschlag ohne Begründung sieht nach Willkür
aus. In der Aufschlüsselung stehen Team/Derby, Big Game und Wettbewerbs-Gewicht
als DREI Zeilen, obwohl sie in einem Topf landen — sonst sucht der Spieler ein
Derby, das es nicht gibt.
**Ausgelöst wird das Öffnen vom ADMIN** (Knopf in der Spielwahl, solange nichts
angepfiffen ist; die Server-Route prüft es erneut). Bewusst keine Automatik: der
Wert hängt am Tabellenstand im Moment des Öffnens — wer den Moment wählt, wählt
mit. Im Mock zählen dafür nur Spiele, deren Anpfiff vorbei ist: die simulierte
Saison trägt alle Ergebnisse vorab, sonst wäre die Tabelle am 1. Spieltag die
Endtabelle (live ist `result` bis zum Anpfiff NULL).

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
die Grenze des ERLAUBTEN, das Empfehlungsband die des ERPROBTEN. **Eine Messung
verengt NIE die harte Grenze** — sonst wird aus jeder Messung ein Verbot; sie
landet als Band (`gemessen` am Feld, wenn kein Preset den Wert belegt) plus
Beispielrechnung im Warntext. Das Band wird
aus den PRESETS abgeleitet (was `presets.balance.test.js` durchmisst, gilt als
erprobt) — ändern sich die Presets, wandert es mit. Dazu handgeschriebene
KOMBINATIONS-Regeln für das, was in keinem Einzelwert steckt (kein Abzug + kein
Cutoff = Gratis-Lose). Jede Meldung kennt ihre Korrektur; Tests sichern, dass
kein Preset und kein Charakter eine Warnung auslöst.

**Echte Spielpläne** (`src/lib/spielplan.js`, `scripts/import-spielplan.mjs`,
`src/lib/spielplaene/`): der Launch-Blocker. `npm run import:spielplan -- bl`
holt die echten Bundesliga-Termine von OpenLigaDB (frei, ohne Schlüssel) und
legt sie als JS-Modul mit Herkunfts-Kopf ab; `baueLiga` übernimmt sie
UNVERÄNDERT statt die Circle-Methode zu benutzen. Fehlt die Datei, fällt die
Liga auf die erzeugte Saison zurück. Vier Punkte: (1) `pruefeSpielplan` trennt
FEHLER (unbekannter Klubname, Verein doppelt am Spieltag, unlesbarer Anpfiff →
harter Abbruch) von WARNUNGEN (unvollständig, überlappende Spieltage → nur
melden); ein Import, der still eine halbe Saison baut, fällt erst auf, wenn
jemand auf ein Spiel tippt, das es nicht gibt. (2) Echt ist NUR der Kalender —
Quoten, Ergebnisse und Torschützen bleiben erzeugt. (3) Die Herkunft wird
abgelesen (`herkunftLabel` über `echteSpielplaene()` aus `ligen.js`), nie
behauptet: der Katalog ist gemischt, solange die CL-Auslosung aussteht, und der
Store reicht kein `echterSpielplan` durch — deshalb zählt das Label über den
WETTBEWERB. (4) `spielplaene/index.js` ist erzeugt und löst eine Henne-Ei-Kette:
der Importer braucht die Klublisten aus den Ligadateien, die deshalb keine
Plan-Datei direkt importieren dürfen. Nach einem Import `npm run seed:matches`.

**Echte Quoten** (`oddsApi.js`, `/api/odds`, `klubnamen.js`,
`scripts/fetch-odds.mjs`): Adapter und Route stehen, der Schlüssel liegt in
`.env.local` (nie im Repo, nie mit `NEXT_PUBLIC_`). Zwei Kommandos:
**`npm run odds:pruefen` ist KOSTENLOS** (nutzt den `/events`-Endpunkt und
gleicht nur Klubnamen ab), **`npm run odds:holen` kostet 1 Credit JE LIGA** und
legt das Ergebnis als `src/lib/quoten/<key>.js` ab. Der Gratis-Tarif hat 500
Anfragen im MONAT, und der Zwischenspeicher der Route liegt im
Arbeitsspeicher — jeder Dev-Server-Neustart holt sonst neu, damit ist das
Kontingent in einer Woche weg. Deshalb: einmal holen, als Datei ablegen,
beliebig oft abspielen. `klubnamen.js` übersetzt „Bayern Munich" →
„FC Bayern München"; **explizite Liste, kein Fuzzy-Match** — „Real Madrid" und
„Real Sociedad" liegen näher beieinander als manche Schreibvariante desselben
Vereins, und ein falsch geratener Klub hängt die Quoten still ans falsche Spiel.
Unbekannte Namen kommen unverändert zurück und fallen dadurch auf.

**Kader ohne Kaderquelle** (`src/lib/kader.js`, erzeugt: `src/lib/kader/<liga>.js`):
Die echten Torschützen-Quoten nennen **keinen Verein** — nur
`{ description: "Talles Magno", price: 2.15 }`, rund 21 Namen je Spiel. Unser
Tippmodell braucht die Trennung. Gelöst OHNE externe Kaderliste, weil eine
solche gepflegt werden müsste (Transfers, Leihen, Sperren) und nach jedem
Fenster falsch wäre: **die Quoten SIND der Kader** — ein Buchmacher bepreist
keinen Verletzten. Der Verein steckt in der SCHNITTMENGE über mehrere Spiele
(kommt jemand in NYC–TOR und NYC–MTL vor, spielt er für NYC). Vier Punkte:
(1) zwei Spiele desselben Klubs mit VERSCHIEDENEN Gegnern lösen auf — zweimal
derselbe Gegner nicht; (2) wer noch offen ist, wird NICHT angeboten (ein
Spieler bei der falschen Mannschaft fiele erst bei der Abrechnung auf, und dann
hat jemand auf ihn getippt); (3) bei einem Widerspruch (Transfer) gewinnt die
NEUERE Beobachtung, sonst bliebe er für immer unauflösbar; (4) der Abruf
SAMMELT über Läufe (`--schuetzen`), weil ein einzelner Lauf jeden Verein meist
nur einmal zeigt — gemessen: 15 MLS-Spiele = 30 Klub-Auftritte bei 30 Vereinen,
also null Schnittmengen. Erst die nächste Spielrunde löst auf.

Eingesetzt werden die echten Schützen von `spielerAusMarkt` (`oddsApi.js`) in
`snapshot.players`; `snapshot.spielerQuelle` sagt `markt` oder `erfunden`. Die
ANYTIME-Quote ist dabei EXAKT die des Marktes — die Marge wird heraus- und
unverändert wieder aufgerechnet, die Annahme über ihre Höhe trifft also nur den
DOPPELPACK (den Markt „2+ Tore" gibt es nicht, geprüft). Hat eine Mannschaft
weniger als zwei zugeordnete Schützen, bleibt der GANZE erfundene Kader stehen:
eine halb echte Liste wäre auf einer Seite eine leere Fläche.

**Torschützen-Modus** (`rules.markets.goals.modus`): `proTeam` (Vorgabe, je
Mannschaft `picksPerTeam`) oder `proSpiel` (`picksProSpiel` Namen aus einem
Topf). Der zweite Modus ist nicht nur Geschmack — er kommt OHNE Vereins-
zuordnung aus und ist damit auch dann spielbar, wenn der Kader noch offen ist.
Die Tipp-Form bleibt in beiden Fällen `{ home, away }`, damit ein Moduswechsel
mitten in der Saison abgegebene Tipps nicht entwertet.

**Liga-Daten** (`ligaGenerator.js` + `ligen.js`): fünf Wettbewerbe im EINEN
Match-Katalog — Bundesliga 306 · Premier League 380 · La Liga 380 · Serie A 380
· Champions League 159 = 1605 Spiele (Aufbau ~50 ms, reine Funktionen, gecacht).
**Der Bundesliga-Spielplan ist seit 28.07.2026 ECHT** (siehe oben), die übrigen
vier Wettbewerbe sind weiter erzeugt.
`ligaGenerator.js` baut eine Saison aus Ratings + Anstoß-Slots (Circle-Methode);
die vier Ligadateien liefern nur Daten. **`ligen.js` ist die EINE Liste** —
Mock-Store, Seed-Skript und Vereinsfilter lesen daraus, sonst läuft die
Aufzählung an vier Stellen auseinander. Was echt ist: Klubs und übliche
Anstoßzeiten (je Liga in ORTSZEIT, `utcOffset`; dadurch schieben sich die Ligen
zeitlich ineinander statt übereinanderzuliegen). Was simuliert ist: Spielplan,
Quoten, Ergebnisse, Torschützen — **auch die Spielernamen sind erfunden**
(landestypische `NAMENSPOOLS`), weil echte Kader nach jedem Transferfenster
falsch wären und simulierte Daten nicht wie echte aussehen dürfen. Stärken
eines Klubs sind über Liga und CL abgestimmt. Beim Ändern einer Ligadatei
`npm run seed:matches` neu laufen lassen; das Skript schreibt zusätzlich eine
Datei JE WETTBEWERB, weil die Gesamtdatei (1,9 MB) den Supabase-SQL-Editor
überfordern kann.

**Weitere Module:** `premium.js` (Berechtigung; nur Admin braucht Premium,
`applyEntitlements` neutralisiert Premium-Regeln ohne Löschen), `records.js`
(Rekorde/Auszeichnungen aus dem Verlauf), `avatars.js` (Profil), `theme.js`
(zentrale Design-Ebene — Farben/Schrift; Account 1s Fanfarben bauen darauf).

## Arbeitsweise

- Nach Logik-Änderungen: `npm test`. Vor Abschluss: `npm run build`.
- ⚠️ **`npm run build` NICHT bei laufendem `next dev`.** Der Build überschreibt
  `.next`, und der Dev-Server läuft danach in „Cannot find module
  ./vendor-chunks/…" oder — tückischer — lädt einfach nichts mehr, ohne
  Fehlermeldung. Wer dann den Fehler im eigenen Code sucht, sucht lange.
  Erst den Dev-Server stoppen, oder ihn nach dem Build neu starten.
- **Hooks stehen VOR jedem frühen `return`.** Die Screens haben fast alle einen
  Lade-Zweig (`if (!match) return <Lade/>`); ein `useMemo` darunter wird im
  ersten Render übersprungen und der Screen stürzt beim zweiten mit „change in
  the order of Hooks" ab — genau so lag `Tippabgabe.jsx` eine Weile still kaputt.
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
