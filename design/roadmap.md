# Roadmap & Pipeline

Offene Feature-Ideen, grob nach Aufwand. Gebaut wird in einzelnen, testbaren
Schritten (Engine zuerst, dann Store, dann UI, dann Browser-Check + Commit).

## Erledigt (alles auf `main`, Stand fb82eab)
- QT-Design-Spec (`design/reaktions-clips.md`)
- Joker/Gewichtung: Einzel- + Ranking-Modus, Skalierungs-Empfehlung
- Profile: Anzeigename + vorgefertigte Avatare (`src/lib/avatars.js`)
- Premium-Gate (`src/lib/premium.js`) — nur Admin braucht Premium
- Ranking-Modus: Eindeutigkeit der Gewichte je Spieltag
- Joker-Abstimmung (`src/lib/voting.js`) — Runde entscheidet, welche Spieltage
- Historie & Rekorde (`src/lib/records.js`) inkl. Preset-Was-wäre-wenn + Plot
- **Balance-Simulator** (`src/lib/balanceSim.js`) — Tipper-Population, misst ob
  der Kenner gewinnt (nicht Zocker/Favorit); Presets darauf neu ausbalanciert
  (`presets.balance.test.js` sichert das ab)
- **Team-/Derby-Regeln** (`teamMods` in engine, `DERBYS` in `bundesligaData.js`)
  — additive Modifikatoren mit Deckel (`modCap`), Balance nachgemessen
- **Aufhol-Mechanismus** (`src/lib/catchup.js`) — Anschluss-Bonus, drei Stufen,
  Balance-Prüfung im Simulator (`aufholFlipQuote`), Admin-UI + Leaderboard-Anbindung
- **Design-Ebene** (`src/lib/theme.js`) — eine Quelle für Farben/Schrift
  (Account 1 hat darauf die Fanfarben-Umschaltung gebaut)

Test-Stand: **800 grün**, Build sauber (Stand 2026-07-27).

> ⚠️ **Diese Datei war am 27.07. deutlich veraltet.** Mehrere Abschnitte standen
> als „NEU" oder „offen" da, obwohl der Code längst lag — wer sie als
> Arbeitsliste liest, baut Dinge ein zweites Mal. Nachgezogen: die drei
> Komplexitätsstufen, die Ertragsquellen, die Joker-Typen, das zusammengeführte
> Joker-Kontingent, die Listen-UI der Spielauswahl, die klebende Balance-Ampel
> und der automatische Big-Game-Auslöser.
> **Wer etwas fertig macht, trägt es bitte sofort hier ein.**

## Offen

### Balance: EIN Durchgang am Ende statt Feinjustierung nebenbei — ENTSCHIEDEN (Nutzer)
**Arbeitsweise ab jetzt.** Beim Bauen einer neuen Mechanik gibt es nur einen
SCHNELLTEST: „gewinnt der Kenner strukturell noch?" — ja/nein, keine Zahlen-
Suche. Findet er einen ENTWURFSFEHLER (Mechanik belohnt das Falsche), wird
sofort korrigiert. Findet er nur eine Unwucht in den WERTEN, bleibt es beim
konservativen Standard und wandert hierher.

**Grund:** Jede neue Mechanik verschiebt die Balance aller anderen. Wer
zwischendrin auf die zweite Nachkommastelle tunt, macht dieselbe Arbeit
mehrfach — und tunt gegen ein Regelwerk, das es am Ende gar nicht mehr gibt.

**Der Abschluss-Durchgang (eigene Aufgabe, vor dem Launch):**
- Alle Presets × alle üblichen Joker-Varianten × Modifikator-Werte in EINEM
  Lauf durchmessen (`balanceSim.js`), nicht einzeln.
- Daraus die **Leitplanken** ableiten: je Regler ein empfohlener Bereich, der
  in der Pro-Ebene als „Empfehlungsband" angezeigt wird.
- Presets neu ausbalancieren, `presets.balance.test.js` nachziehen.
- ✅ **Die bekannte Lücke ist geschlossen.** Der Simulator kennt jetzt
  Vereins-Zugehörigkeit: jeder Tipper hat einen Verein, der an jedem Spieltag
  in genau einem von neun Spielen mitspielt — und, das ist der Punkt, er tippt
  ihn zu OPTIMISTISCH (`FAN_OPTIMISMUS`). Ohne diese Voreingenommenheit hätte
  der Simulator den Heimatbonus systematisch zu gut bewertet. Die beiden
  Extreme (Favoriten-Tipper, Zocker) sind bewusst ausgenommen: sie sind
  Messinstrumente, keine Menschen — eine Ausnahme darin verbögen die Skala.
- **Ergebnis Heimat-Joker (3 Seeds × 60 Saisons, alle Presets):** harmlos.
  Über alle Presets gewinnt der Kenner MIT Heimatbonus eher mehr als weniger
  (Standard 47 % → 50 %, Underdog-Party 38 % → 44 %), weil der Bonus die aus
  der Fan-Brille entstehenden Fehltipps mitverstärkt. Auch bei ×2,0 bleibt der
  Kenner bei 46 %. Standard 1,2 und Obergrenze 2,0 sind damit belegt.
- **Ergebnis Mut-Joker.** Mit Vereins-Modell (4 Seeds × 60 Saisons),
  Kenner : Zocker — ×1,05 → 51:16 · ×1,10 → 50:19 · ×1,15 → 47:23 ·
  ×1,20 → 42:30. Ab 1,15 schmilzt der Vorsprung des Könnens sichtbar ab.
  ⚠️ **Wie so ein Befund umgesetzt wird (Nutzer-Korrektur):** Ich hatte zuerst
  `RULE_LIMITS.joker.mutFaktor.max` gesenkt — falsch. Eine Messung darf nie
  eine harte Grenze verengen, sonst wird aus jeder Messung ein Verbot und der
  Admin verliert eine Freiheit, statt eine Rückmeldung zu bekommen. Richtig
  ist: die Grenze bleibt, der Wert landet als GEMESSENES BAND in
  `reglerWarnung.js` — mit Beispielrechnung im Warntext („bei ×1,2 gewinnt der
  Kenner nur noch 42 %, der Zocker schon 30 %"). Felder, die in keinem Preset
  vorkommen, tragen ihr Band jetzt direkt am Feld (`gemessen`).

**Noch offen im Abschluss-Durchgang:** Presets gegen die neuen Ebenen (Big
Game, Wettbewerbs-Gewichte, Ereignisse) durchmessen und das Empfehlungsband in
`reglerWarnung.js` daraus nachziehen.


### Spielerstellung in 3 Komplexitätsstufen — GEBAUT ✓
`src/lib/charaktere.js` + `RundenCharaktere.jsx` (Stufe 1) ·
`src/lib/einfachRegler.js` + `EinfacheRegler.jsx` (Stufe 2) · die Profi-Ansicht
war schon da. Der Stufenwähler sitzt oben in der Spielerstellung und ändert
nur die ANSICHT auf dasselbe `rules`-Objekt — beim Wechsel geht nichts
verloren, wie unten entworfen.

Offen geblieben ist nur die Warnung beim ZURÜCKschalten, wenn Profi-Werte zu
keinem Paket mehr passen.

Ursprünglicher Entwurf:
Ein Admin soll wählen, wie tief er einsteigt. **Wichtig: die Stufe ist eine
ANSICHT auf dasselbe `rules`-Objekt, kein zweites Datenmodell** — beim Wechsel
geht nichts verloren.

- **Stufe 1 „Schnellstart"** — keine Regler, sondern 3–4 fertige RUNDEN-CHARAKTERE.
  Jeder bündelt Regelwerk + Saison-Wetten + Joker-Einstellung in einem Paket
  („Klassisch & fair", „Mutig & wild", „Kenner-Runde", „Nur nebenbei").
  Ein Klick → Runde steht. Unsere Empfehlung ist der Standard.
- **Stufe 2 „Anpassen"** — 4–6 GROSSE Regler in Klartext statt Zahlen
  („Wie mutig soll es sein?" zahm ↔ wild), jeweils mit Beispielsatz
  („ein 3:1 auf den Außenseiter bringt dann ~X Punkte") + Balance-Ampel live.
- **Stufe 3 „Profi"** — alles, was heute schon da ist, plus die
  Spieltag-genaue Joker-Planung und individuelle Kontingente.

Offene Entwurfsfragen: Warnung beim Zurückschalten, wenn Profi-Werte nicht mehr
zu einem Paket passen. Nicht mehr als 3 Stufen — jede kostet Pflege.

### Big Game: das Spiel des Spieltags dynamisch bestimmen — GEBAUT ✓
`src/lib/bigGame.js` + Abschnitt in der Spielerstellung. Zwei Entwurfs-Punkte
haben sich beim Bauen als die wichtigen herausgestellt:

- **Der Zeitpunkt ist ein FAKTOR, kein Signal.** Innerhalb eines Spieltags ist
  er fuer alle Spiele gleich, kann also gar nicht entscheiden, WELCHES Spiel
  das Big Game wird — nur, OB der Spieltag ueberhaupt eins bekommt (Schwelle).
  Ein Test haelt das fest (`roh` bleibt gleich, `wert` steigt).
- **Zone schlaegt Ausgeglichenheit.** Die Tabellenzone (oben Titel, unten
  Abstieg, Mitte nichts) wiegt 0,45, die Quoten nur 0,25 — sonst gewinnt das
  belanglose 9.-gegen-10., weil es am ausgeglichensten ist. Auch das ist ein
  eigener Test.

Das Einfrieren ist inzwischen gebaut: `src/lib/spieltagOeffnen.js` +
`openMatchday()` im Mock-Store. Der feine Punkt dabei: eingefroren wird
`bigGameGeprueft` auf ALLEN Snapshots des Spieltags, nicht nur `bigGame: true`
auf dem Gewinner — sonst waere ein Spieltag OHNE Big Game von einem
ungeoeffneten nicht zu unterscheiden und bekaeme spaeter, mit gewachsenem
Tabellenstand, nachtraeglich doch noch eines.

✅ **Alles davon ist gebaut.** Supabase-Store + Route (`/api/matchday/open`),
Hervorhebung in Spielwahl und Tippabgabe, eigene Zeile in den Ertragsquellen
(Account 1) — und seit 27.07. friert sich der Spieltag SELBST ein:
`src/lib/autoOeffnen.js` + `/api/matchday/auto`, stündlich per Vercel-Cron
(`vercel.json`).

Der Punkt dabei, der nicht nach Bequemlichkeit aussieht, es aber ist: der
Zeitpunkt des Öffnens IST die Fairness-Frage. Der Spannungswert hängt am
Tabellenstand in diesem Moment — wer den Moment wählt, wählt das Topspiel mit.
Ein fester, für alle gleicher Auslöser nimmt diese Wahl aus dem Spiel. Geöffnet
wird, sobald für die FRÜHESTE Runde das Tipp-Fenster aufgeht (größter
tatsächlich eingestellter Vorlauf, nicht die theoretische Obergrenze von 720 h
— sonst fröre man 30 Tage im Voraus mit altem Tabellenstand ein). Hat das erste
Spiel angepfiffen, wird NICHT mehr geöffnet: nachträglich einzufrieren wäre
schlimmer als gar nicht.

⚠️ **Nutzer-Aufgabe:** `CRON_SECRET` in Vercel setzen, sonst antwortet die
Route mit 500 und es bleibt beim Admin-Knopf.

Offen: Benachrichtigung („Diese Woche Big Game: X gegen Y").

Beim Anlegen der Runde weiss niemand, welche Begegnungen spannend werden. Ein
DERBY ist vorher bekannt — „Erster gegen Zweiter am 28. Spieltag" nicht. Ein
Algorithmus soll waehrend der Saison das jeweils interessanteste Spiel finden
und hervorheben (Quotenboost oder Zusatzregel).

**Was ein Spiel gross macht — Signale, die wir HABEN:**
- **Ausgeglichenheit** steckt schon im Snapshot (`winner.home ≈ winner.away`).
  ⚠️ Aber: ausgeglichen ≠ wichtig. Zehnter gegen Elfter ist ausgeglichen und
  trotzdem belanglos. Quoten allein reichen also nicht.
- **Tabellen-Relevanz** aus `saisonwetten.tabelle()`: Naehe der Kontrahenten
  UND Hoehe in der Tabelle (1. gegen 2. schlaegt 15. gegen 16.).
- **Zeitpunkt**: spaet in der Saison zaehlt mehr — Titel/Abstieg entscheiden sich.
- **Derby** (`findDerby`) als Zuschlag, nicht als alleiniges Kriterium.
→ `spannungsWert(match, tabelle, snapshot, spieltag) → 0..1`, daraus je
Spieltag das Top-Spiel.

**⚠️ Die entscheidende Fairness-Regel: VORHER feststehen.**
Das Big Game muss bekannt sein, BEVOR getippt wird — sonst aendert sich der
Wert eines Tipps rueckwirkend. Gleiches Prinzip wie beim Quoten-Snapshot:
einmal festgelegt, gilt es. Bestimmt wird es also beim Oeffnen des Spieltags
aus dem DANN gueltigen Tabellenstand.

**Transparenz:** Deterministisch und begruendet anzeigen („Platz 2 gegen Platz 3,
punktgleich, 28. Spieltag") — sonst wirkt die Auswahl willkuerlich und der
Verdacht der Bevorzugung entsteht.

**Belohnung = derselbe Modifikator-Typ wie Derby und Wettbewerbs-Gewicht.**
„Dieses Spiel ist wichtiger, fuer alle gleich" — also in denselben additiven
Topf unter `modCap`. Kein neuer Multiplikator.
⚠️ Zusammenspiel mit dem Joker bedenken: Wer seinen Joker aufs ohnehin
geboostete Big Game legt, stapelt zwei Aufschlaege. Additiv ist das gedeckelt,
aber die Varianz steigt — im Abschluss-Durchgang mitmessen.

**Anschluesse:** Benachrichtigung („Diese Woche Big Game: X gegen Y") ·
eigene Zeile in der Ertragsquellen-Aufschluesselung · als Ereignis-Ausloeser
verwendbar (Joker fuers richtige Tippen des Big Game).

### Mehrere Wettbewerbe in EINEM Tippspiel — Etappen (a) + (b) GEBAUT ✓
(a) `wettbewerbe.js` + `championsLeagueData.js` (Datenmodell, CL mit Ligaphase
und K.-o.-Baum). (b) `wettbewerbGewicht.js` + `WettbewerbGewichte.jsx`.

Zwei Punkte aus (b), die man nicht brechen sollte:
- **Der Aufschlag faellt in DENSELBEN additiven Topf** wie Derby und Big Game
  (`teamModFactor`) — kein vierter Multiplikator daneben. Ein Test rechnet den
  Fall mit allen dreien nach: additiv 2,7x statt multiplikativ 3,83x.
- **Gewicht pro Spiel ist nicht Anteil an der Wertung.** 306 BL-Spiele gegen
  144 CL-Spiele: „CL x1,5" fuehlt sich nach doppelt so wichtig an und bleibt
  trotzdem die kleinere Haelfte. `anteile()` rechnet den resultierenden Anteil
  aus, die Oberflaeche zeigt ihn unter jedem Regler samt „ohne Gewichte waeren
  es X %", und `anteilHinweis()` nennt die Falle beim Namen. Ohne diese
  Rueckmeldung stellt ein Admin etwas ein und bekommt etwas anderes.
- K.-o.-Runden brauchen keinen eigenen Regler: EINE Stufe steigt ueber
  `PHASE[...].rang` (AF x1, VF x2, HF x3, Finale x4).

(c) Freischalt-Zeitpunkte sind GEBAUT: jede Saison-Wette kann ein Fenster
`{ wettbewerb, abSpieltag, bisSpieltag }` tragen (`saisonwetten.js`,
`istFreigeschaltet`/`freigabeStatus`). Der nicht offensichtliche Teil: eine
Freigabe OHNE Frist waere unfair, weil wer spaeter tippt schlicht mehr weiss —
bei gleicher Punktzahl. Deshalb ist es immer ein FENSTER, ohne Angabe genau
einen Spieltag lang. Und der Stand richtet sich nach dem Spieltag des EIGENEN
Wettbewerbs, sonst oeffnete eine CL-Wette, waehrend die Ligaphase laeuft
(`aktuellerSpieltag()` in `wettbewerbe.js`). Im Zweifel — Stand unbekannt —
bleibt die Wette ZU: eine versehentlich offene Wette laesst sich nicht
zurueckziehen, eine versehentlich gesperrte schon.

(d) GEBAUT: `rules.spiele` hat jetzt `wettbewerbe` und `phasen`
(`SpielauswahlWettbewerbe.jsx`). „Nur Champions League ab dem Achtelfinale"
sind damit 15 statt 466 Spiele — nachgemessen in der laufenden App.

⚠️ Alle Dimensionen wirken UND-verknuepft (Vereine, Zeitraum, Wettbewerbe,
Phasen). Fuer eine GEMISCHTE Wunschliste („CL-K.-o. PLUS meine
Bundesliga-Vereine") ist der Modus `liste` gedacht. Eine ODER-Verknuepfung
ueber Dimensionen hinweg waere eine zweite, konkurrierende Regel-Sprache — das
waere es nicht wert. Falls sich der gemischte Fall doch als haeufig erweist,
ist die saubere Loesung ein Filter PRO WETTBEWERB (`proWettbewerb: { cl: {...},
bl: {...} }`), nicht ein ODER-Schalter.

**Der ganze Wettbewerbs-Block ist damit durch (a-d).**

Bundesliga + Premier League + Champions League zusammen, mit eigenen Regeln je
Wettbewerb und fairer Gewichtung untereinander. Ziel des Nutzers: ein
**Gesamt-Tippspiel nur aus dem Besten und Interessantesten**.

**1) Datenmodell.** Matches brauchen `wettbewerb` und `phase`:
`{ wettbewerb: "bl" | "pl" | "cl", phase: "liga" | "achtelfinale" | "halbfinale" | "finale", matchday }`.
Ohne `phase` laesst sich „Halbfinale zaehlt mehr" nicht ausdruecken.

**2) Regeln je Wettbewerb — NICHT drei volle Regelwerke.**
Empfehlung: EIN Basis-Regelwerk + je Wettbewerb ein `gewicht` und optionale
Ueberschreibungen (`rules.wettbewerbe = { bl: { gewicht }, cl: { gewicht, ... } }`).
Drei vollstaendige Regelwerke wuerden die Admin-Oberflaeche verdreifachen,
obwohl die meisten nur „gleiche Regeln, aber CL zaehlt mehr" wollen.

**3) Phasen-Gewicht ist DIESELBE Art Modifikator wie der Derby-Faktor.**
Beide sagen: „diese Begegnung ist wichtiger — fuer alle gleich". Deshalb
gehoert das Wettbewerbs-/Phasen-Gewicht in denselben additiven Topf wie
`teamMods` und unter `modCap`. Kein vierter Multiplikator, sonst schaukelt es
sich wieder auf (dieselbe Lehre wie bei den Joker-Typen).

**4) ⚠️ Der Denkfehler, den die Oberflaeche verhindern muss:**
„Gewicht pro Spiel" ist NICHT „Anteil an der Gesamtwertung". Die Bundesliga hat
306 Spiele, die CL-Ligaphase ~120. Bei Gewicht 1 vs 1,5 dominiert die
Bundesliga trotzdem klar die Saison. Der Admin denkt aber in Anteilen.
→ Die Oberflaeche muss den RESULTIERENDEN ANTEIL anzeigen
(„Bundesliga 62 % · CL 28 % · PL 10 % der erwarteten Gesamtpunkte"),
nicht nur den Faktor. Das ist der Punkt, an dem eine naive Umsetzung
unbemerkt unfair wird.

**5) Saison-Wetten mit Freischalt-Zeitpunkt.**
Jede Saison-Wette bekommt optional `ab: { wettbewerb, spieltag }` — „CL-
Halbfinalisten erst ab Spieltag 8 der Ligaphase tippbar". Sinnvoll, weil
manche Langzeitwetten vorher reines Raten waeren. Vorher: sichtbar, aber
gesperrt, mit Datum/Spieltag der Freischaltung.

**6) Anschluss an bereits Geplantes:**
- `rules.spiele` (Spielauswahl im Code) wird zur Auswahl QUER ueber Wettbewerbe
  — genau der „nur das Beste"-Fall.
- Preset-Mischen bekaeme einen Aspekt „Wettbewerbe".
- Die Quoten-API liefert je Liga eigene Endpunkte (`soccer_germany_bundesliga`,
  `soccer_epl`, `soccer_uefa_champs_league`) — die Route kann das schon, sie
  nimmt `?liga=`.

**7) Reihenfolge (gross, deshalb in Etappen):**
a) `wettbewerb`/`phase` ins Datenmodell + Daten erzeugen
b) Gewichtung + Anteils-Anzeige
c) Freischalt-Zeitpunkte fuer Saison-Wetten
d) wettbewerbsuebergreifende Spielauswahl

### Spiel-Auswahl gehört in den Code — GEBAUT ✓
`src/lib/spielauswahl.js` + Abschnitt „Teams/Zeitraum" in der Spielerstellung.
`rules.spiele` ist jetzt Teil des Regelwerks und reist damit in Lang- und
Kurzcodes mit; der Team-Filter der Spielerstellung ist KEIN lokaler Zustand
mehr, sondern liest und schreibt dieses Feld. Die Zuständigkeit bleibt getrennt:
`rules.spiele` schlägt vor, `rounds.team_filter` hält fest, was beim Anlegen
daraus wurde. Dazu ein achter ASPEKT „Spielauswahl" beim Preset-Mischen und
`spieleProSpieltag()`, das ohne Spielplan ehrlich eine SPANNE nennt („bleiben
2 bis 4 Spiele pro Spieltag") statt eine erfundene genaue Zahl.

✅ Modus `liste` hat seit 27.07. eine UI: `SpielauswahlListe.jsx`. Gesucht statt
geblättert (1605 Spiele lassen sich nicht auflisten), die AUSGEWÄHLTEN stehen
immer oben — sonst verschwindet ein angehaktes Spiel beim Weitersuchen und ist
nicht mehr abwählbar. Team-Filter und Liste schließen sich gegenseitig aus,
`modus` kann nur eines sein.

Ein geteilter Creator-Code trägt heute nur das REGELWERK. Welche Spiele die
Runde umfasst (`team_filter`) hängt an der Runde, nicht am Code — wer einen
Code lädt, bekommt also die Regeln, aber nicht die Spielauswahl. Das soll mit
rein, und danach **anpassbar bleiben**.

- **`rules.spiele`** ins Regelwerk aufnehmen (wandert damit automatisch in
  `encodePreset` und in die Kurzcodes): welche Vereine, welche Spieltage,
  ggf. nur bestimmte Begegnungen.
- **Nach dem Laden editierbar:** der Code ist ein VORSCHLAG, kein Vertrag.
  Wer „Kenner-Runde" lädt, soll die Spielauswahl noch auf seine Liga/seinen
  Zeitraum ändern können, ohne den Rest zu verlieren.
- ⚠️ **`team_filter` gibt es schon** — auf der Runde (`rounds.team_filter`,
  gesetzt beim Anlegen). Beim Umbau muss klar sein, was gewinnt: das
  Regelwerk ist die Vorlage, die Runde der konkrete Stand. Sonst hat man
  zwei Wahrheiten. Vorschlag: `rules.spiele` = Vorschlag aus dem Code,
  `rounds.team_filter` = das, was beim Anlegen tatsächlich gewählt wurde.
- **Passt zum Preset-Mischen:** „Spiele" würde ein achter ASPEKT
  (`presetMerge.js`) — Regeln von A, Spielauswahl von B.
- **Nutzen:** genau der „populäre Seeds holen"-Fall. Ein Creator teilt nicht
  nur seine Regeln, sondern seine ganze Runden-Idee („Nur die Top 6, 10
  Spieltage, Hardcore-Wertung") — und man kann sie trotzdem anpassen.

### Ereignisse: Joker ERSPIELEN statt nur zugeteilt bekommen — GEBAUT ✓ (Kategorie 1+2)
`src/lib/ereignisse.js` + `Ereignisse.jsx` in der Spielerstellung. Gebaut sind
die **Meilensteine** (Serie, erster exakter Treffer, Aussenseiter-Sieg, Spieltag
vollstaendig) und der **Trost-Joker**. Herausforderungen stehen im Katalog, sind
aber als NICHT auswertbar markiert (`braucht: ["minispiel"]`) — `sanitizeEreignisse`
wirft sie beim Aktivieren raus, damit niemand etwas einschaltet, das nie ausloest.

Drei Dinge, die sich beim Bauen als die wichtigen erwiesen haben:
- Der **Deckel** (`maxErspielt`) steht in der UI GANZ OBEN, nicht am Ende. Er ist
  keine Feineinstellung, sondern die Zusage, dass niemand das Tippspiel ueber
  Nebenaufgaben gewinnt. Gedeckelt wird **chronologisch** — die frueh verdienten
  Joker zaehlen, sonst haenge die Auswahl an der Sortierung.
- **`konflikte()`** meldet Trost-Joker + Anschluss-Bonus als Doppelbelohnung.
  Genau die Kante, vor der der Entwurf gewarnt hat — jetzt sichtbar statt nur
  dokumentiert.
- **Aussenseiter zaehlt nur, wenn der Tipp AUFGEHT** — sonst waere blindes
  Dagegenhalten belohnt (dieselbe Regel wie beim Mut-Joker in der Engine).

✅ Zusammengeführt: `src/lib/jokerKontingent.js` macht aus beiden Töpfen EINEN
Vorrat und ist in der Tippabgabe verdrahtet. Drei Regeln stecken drin:
zugeteilte Joker sind an ihren Spieltag gebunden, erspielte nicht (sonst
verfielen sie sofort); erspielte wirken ab dem Spieltag, an dem sie verdient
wurden, nie rückwirkend; verbraucht wird ZUERST der zugeteilte Topf.

Offen: die Herausforderungen selbst (Kategorie 3, braucht ein Minispiel).

Bisher kommt ein Joker nur vom Admin (Frequenz/Verteilung). Zusätzlich soll man
sich welche **verdienen** können — durch Herausforderungen oder weil einem in
der Runde etwas widerfährt.

**Zwei Töpfe, klar getrennt:** `zugeteilt` (vom Regelwerk) + `erspielt` (aus
Ereignissen). Beide fließen in dasselbe Joker-Kontingent, aber der erspielte
Topf ist **gedeckelt** — sonst gewinnt das Tippspiel, wer im Minispiel gut ist.
Das wäre eine zweite Leistungsachse und damit ein Fairness-Bruch.

**Drei Kategorien (nach Aufwand und Risiko sortiert):**

1. **Meilensteine — passiv, aus dem Tippen selbst.** „Drei Spieltage in Folge
   getippt", „erster exakter Treffer", „Außenseiter-Sieg vorhergesagt".
   ⭐ **Bester Startpunkt:** braucht KEINE neuen Daten und kein Minispiel —
   `records.js` berechnet solche Dinge bereits. Belohnt Dranbleiben statt
   Geschicklichkeit, ist also automatisch balance-freundlich.
2. **Widerfahrnisse — passiv, sozialer Ausgleich.** „Letzter am Spieltag →
   Trost-Joker", „dein Verein hat verletzungsbedingt verloren". Verwandt mit dem
   Aufhol-Mechanismus (`catchup.js`) — ⚠️ **darf sich nicht mit ihm doppeln**,
   sonst wird Zurückliegen doppelt belohnt.
3. **Herausforderungen — aktiv, Minispiel.** Fußball-Tic-Tac-Toe, Quiz,
   Elfmeterschießen-Duell. Größter Aufwand, größtes Balance-Risiko.
   ⚠️ **Muss ASYNCHRON funktionieren** — ein Freundeskreis spielt nie gleichzeitig.
   ⚠️ **Tic-Tac-Toe („Spieler, der für beide Vereine spielte") ist mit unseren
   Daten NICHT möglich** — unsere Kader sind generiert und fiktiv. Ginge erst
   mit einer echten Spieler-Datenquelle. Ein Quiz über TIPP-Statistiken der
   eigenen Runde ginge dagegen sofort.

**Architektur (wie bei den Saison-Wetten):** `ereignisse.js` mit einem Katalog
aus TYP + Parameter, jeder Typ deklariert seine benötigten Daten (`braucht`).
Der Admin schaltet einzelne Ereignisse frei und legt die Belohnung fest.
Ergebnis ist immer dasselbe: eine **Joker-Gutschrift** — kein neuer
Punkte-Kanal, damit die bestehende Deckelung weiter greift.

**Anschluss:** Das geparkte **Elfmeterschießen-Duell** wäre genau so eine
Herausforderung. Es könnte als „Joker-Duell" zurückkommen, statt als eigenes
Feature ohne Zweck.

### Joker-TYPEN statt neuer Ebenen — GEBAUT ✓
`rules.joker.typen` steht, `heimat` und `mut` sind gebaut und im
Balance-Durchgang vermessen (Ergebnisse oben im Balance-Abschnitt). Der
Mut-Faktor trägt sein gemessenes Band in `reglerWarnung.js`.

Ursprünglicher Entwurf:
Das eigene Top-Team ist **keine neue Modifikator-Ebene, sondern eine Spielart
des Jokers**. Damit bleibt es bei drei Ebenen (Joker · Abstimmung · Team-Mods),
und neue Ideen wachsen INNERHALB der Joker-Ebene statt daneben.

- **Datenmodell:** `rules.joker.typen = { einzel: {...}, heimat: {...}, … }` —
  der Admin schaltet einzelne Typen frei. Jeder Typ liefert einen AUFSCHLAG;
  alle Aufschläge eines Spiels werden **additiv** zum Joker-Beitrag summiert und
  wie bisher von `modCap` gedeckelt. Kein Stapeln, keine neue Deckelung nötig.
- **Kandidaten (bewusst WENIGE, der Admin wählt aus):**
  * `einzel` — ein Spiel je Spieltag markieren (heutiges Verhalten)
  * `ranking` — Gewichte über den Spieltag verteilen (heutiges Verhalten)
  * `heimat` — die Spiele des eigenen Vereins, passiv, Empfehlung ×1,2
  * `mut` — greift NUR, wenn gegen den Favoriten getippt wurde („Mut zahlt sich
    aus" als eigene Mechanik statt nur als Motto)
- **Regel gegen Wildwuchs:** höchstens 4–5 Typen insgesamt; jeder muss einen
  eigenen SPIELERISCHEN Grund haben, nicht nur einen anderen Zahlenwert.
- **Symmetrisch** (auch auf Minus) und über `totalModifier`, wie der Joker heute.
- **Kopplung:** die Vereinsauswahl für `heimat` kann zugleich die Fanfarben
  speisen (`theme.js`) — eine Angabe, zwei Wirkungen.
- ⚠️ Vor dem Merge mit `balanceSim.js` prüfen: der Kenner darf gewinnen, aber
  nicht davonziehen.

### Ertragsquellen in der Abrechnung sichtbar machen — GEBAUT ✓
`src/lib/breakdown.js` + `Ertragsquellen.jsx`. Team/Derby, Spiel des Spieltags
und Wettbewerbs-Gewicht stehen als DREI Zeilen, obwohl sie in einem additiven
Topf landen — sonst sucht der Spieler ein Derby, das es nicht gibt.

Ursprünglicher Entwurf:
**Nicht bloß Anzeige, sondern ein Bindungs-Element.** Eine aufgeschlüsselte
Liste „woher kamen meine Punkte" liest sich wie eine Abrechnung und hakt
nachweislich besser als eine nackte Endzahl.

- Die Engine RECHNET die Bestandteile bereits (`scoreTip` liefert
  `parts.tendBoden`, `parts.ergNaehe`, `parts.teamTore`, `goals.net`, `combo`,
  `modifier`) — es fehlt nur die Darstellung als benannte Posten.
- **Jeder aktive Joker-Typ bekommt eine EIGENE Zeile** („Heimatbonus ×1,2 →
  +45"). Genau deshalb sind mehrere Typen interessant: sie machen die
  Aufschlüsselung reichhaltiger, ohne die Balance anzufassen.
- Format wie ein Kassenbon: Posten, Betrag, unten die Summe. Negatives
  (Favoriten-Malus) gehört genauso hinein — Ehrlichkeit macht es glaubwürdig.
- Hängt an `prefs.abrechnung` (voll/dezent/aus), damit niemand zugeschüttet wird.

### Profi-Variante: aktiv vor Unwucht warnen — GEBAUT ✓
`src/lib/reglerWarnung.js` + `ProfiWarnungen.jsx`, Bänder im `Slider` der
Spielerstellung. Umgesetzt:

- **Empfehlungsband am Regler:** grüner Streifen unter dem Slider, Wert und
  Regler färben sich coral, sobald er verlassen wird. Das Band wird aus den
  PRESETS abgeleitet, nicht getippt — was `presets.balance.test.js` durchmisst,
  gilt als erprobt, und ändern sich die Presets, wandert das Band mit.
- **Kasten über den Reglern**, der immer da ist (auch grün) und jede Meldung
  mit ihrer eigenen Korrektur ausliefert — ein Hinweis ohne Auflösung wäre eine
  Belehrung, kein Werkzeug. Ein Test löst alle Meldungen iterativ auf und
  prüft, dass das terminiert.
- **Kombinations-Regeln** neben den Einzelfeldern: der teuerste Fehler
  (`wrongPenalty` ≈ 0 **und** `minPayout` ≈ 0 → Gratis-Lose) steckt in keinem
  einzelnen Wert. Dazu: Modifikator-Turm, Deckel schneidet ab, exakt ≈ abstand,
  Versäumnis ohne Abzug.
- Kein Verbot: extreme Werte bleiben erlaubt, sie sind nur nie versehentlich.

✅ **Balance-Ampel klebt** (seit 27.07.), zusammen mit dem Warnungs-Kasten;
gedeckelt auf 42 % der Fensterhöhe mit eigenem Scroll.

⚠️ Beim Bauen die Falle gefunden, die so etwas STILL scheitern lässt: der
Telefon-Rahmen jedes Screens trägt `overflow: hidden`, und das macht ihn zum
Scroll-Container — `position: sticky` klebt dann an ihm statt am Fenster und
scrollt einfach weiter mit, ohne dass etwas kaputt aussieht. `overflow: clip`
schneidet die runden Ecken genauso ab, erzeugt aber keinen Scroll-Container.
Der Rahmen steht INLINE in jedem Screen; wer anderswo etwas kleben lassen will,
muss ihn dort ebenso umstellen.

### Joker-Verteilung über die Saison (Frequenz statt Handarbeit) — GEBAUT ✓
`src/lib/jokerPlan.js` + `JokerVerteilung.jsx`. Umgesetzt wie unten beschrieben;
verteilt wird BLOCKWEISE (je Block genau einer), weil reiner Zufall sonst vier
Joker in fünf Spieltage bündelt — formal fair, gefühlt kaputt.

✅ Die Durchsetzung beim Tippen ist gebaut: `jokerKontingent.darfJokerSetzen()`
sagt nicht nur ob, sondern auch AUS WELCHEM TOPF — „heute ist dein
Joker-Spieltag" ist eine andere Aussage als „du setzt einen erspielten ein".

Offen: die Mitspieler-Übersicht als eigener Screen.

Der Admin soll nicht 34 Spieltage einzeln anklicken müssen.

- **Frequenz-Regler:** „etwa jeder 4. Spieltag hat einen Joker" → das System
  verteilt sie, **deterministisch aus der Runden-Id geseedet** (alle sehen
  dasselbe, es ist nachprüfbar, und der Creator-Code bleibt kurz, weil nur die
  REGEL gespeichert wird, nicht die ausgerollte Liste).
- **Drei Verteilungs-Modi:**
  1. *Gleich für alle* — alle haben am selben Spieltag denselben Joker.
  2. *Gleiches Kontingent, andere Reihenfolge* — jeder bekommt über die Saison
     gleich viele Joker, nur an verschiedenen Spieltagen. Mehr Abwechslung bei
     identischer Fairness. **Muss durch einen Test garantiert werden.**
  3. *Frei* — jeder setzt selbst (heutiges Verhalten).
- **Vorschau-Kalender:** 34er-Leiste mit markierten Joker-Spieltagen, damit man
  sofort sieht, was man eingestellt hat.
- **Sichtbarkeit: ENTSCHIEDEN (Nutzer) — verdeckte Reihenfolge, offenes Kontingent.**
  Unsere Empfehlung zeigt NICHT vorab, welche Spieltage Joker haben (Spannung),
  aber sehr wohl:
  * das **ungefähre Kontingent** („du bekommst über die Saison etwa 8 Joker"),
  * den **eigenen Fortschritt** („3 von 8 verbraucht"),
  * und **was die Mitspieler bisher hatten** — damit bei verdeckter Reihenfolge
    nie der Verdacht aufkommt, jemand werde bevorzugt.
  Der Admin kann das umstellen; in der **Pro-Variante** ist auch „Spieltage vorab
  bekannt" wählbar.
  ⚠️ Wichtig bei Modus 2 (gleiches Kontingent, andere Reihenfolge): mitten in der
  Saison haben Spieler zwangsläufig UNTERSCHIEDLICH viele Joker gehabt. Deshalb
  immer als **Fortschritt** anzeigen („3 von 8"), nie als nackte Zahl — sonst
  wirkt ein systembedingter Zwischenstand wie Bevorzugung.
- ⚠️ **Balance:** ungleiche Verteilung darf die Simulation nicht kippen —
  vor dem Merge mit `balanceSim.js` gegenprüfen.


### Per-Team-/Derby-Regeln (Admin-Ebene) — NEU
Admins vereinbaren für **ausgewählte Begegnungen** eigene Modifikatoren, die für
ALLE in der Runde gelten (anders als der Joker, den jeder Tipper selbst setzt).

- **Beispiele:** „Derby zählt mehr", „alle Spiele meines Lieblingsteams ×1,2".
- **Simpel zuerst (unsere Empfehlung der Ausbalanciertheit):** die drei
  wichtigsten Regler — Derby-Faktor, Faktor für ausgewählte Teams, evtl. ein
  dritter. Sinnvolle Defaults, die man einfach übernimmt.
- **Optional aufklappbar:** die individuellsten Modifikatoren pro Begegnung.
- **Architektur:** `rules.teamMods` = { derbyFaktor, teams:{name→faktor},
  fixtures:{...} }. Greift in `scoreTip` als reine Funktion von `(snap, rules)`
  — `snap.home`/`snap.away` liefern die Teams, kein neuer Datenfluss nötig.
  Derby-Paare gehören nach `bundesligaData.js`.
- **Achtung Komposition:** dann gibt es drei Multiplikatoren (Joker pro Nutzer,
  Abstimmung pro Spieltag, Team-Mods pro Begegnung). Reihenfolge + Deckelung
  bewusst festlegen, damit sie sich nicht unkontrolliert aufschaukeln. Premium.

### Aufhol-Mechanismus (Anschluss halten) — NEU
Einstellbar bei der Rundenerstellung: Wenn der Abstand zur Spitze zu groß wird,
bekommen Zurückliegende je Spieltag Punkte dazu, damit Mitspielen weiter lohnt.

- **Auswahl, wen es betrifft:** Letzter · schlechtestes Quantil · alle unter dem
  Schnitt — variabel.
- **Simpel zuerst:** ein Regler „Anschluss halten: aus / sanft / stark" mit
  vernünftigem Default. Aufklappbar dann die volle Zahlenregel
  (Schwelle, Formel, Deckel).
- **Balance:** unbedingt über den Balance-Simulator prüfen — ein zu starker
  Ausgleich entwertet gutes Tippen (Punkte-Verhältnis kippt Richtung 1,0 und
  darunter wird das Ranking beliebig).
- Verwandt: „verdiente" Joker an Zurückliegende (siehe Kontingent-Idee) — beides
  sind Aufhol-Mechaniken und sollten sich nicht doppeln.

### ~~Preset-Mischen~~ ✅ ERLEDIGT
`presetMerge.js` + `PresetMischen.jsx`, aufklappbar in der Spielerstellung.
Gelöst über sieben benannte Aspekte statt Einzelregler; es werden nur die
Aspekte gezeigt, in denen sich die beiden Presets unterscheiden.

### Team-Modus (2er-Teams)
Zwei Tipper bilden ein Team, teilen sich Punkte oder tippen abwechselnd. Größter
Brocken — greift tief ins Scoring- und Runden-Modell.

### Rundenübergreifender Preset-Vergleich
Punkte nach Preset-Schwierigkeit normiert vergleichen. Innerhalb EINER Runde
haben alle dasselbe Regelwerk → lohnt erst über mehrere Runden hinweg.

### Kleinere geparkte Ideen
- ~~Auto-Tipp bei Versäumnis~~ ✅ ERLEDIGT — `autoTip.js` + `rules.versaeumnis`
  (Admin wählt Strategie, Malus in Prozent, Kontingent je Saison)
- Streak-Bonus (nutzt denselben Zähler wie die QT-Ball-ins-Gesicht-Saga)
- ~~GIF an Mitspieler senden~~ ✅ ERLEDIGT — `taunts.js` + Screen `/spott`,
  Versand über die Teilen-Funktion des Geräts (keine eigene Tabelle nötig)
- Elfmeterschießen-Duell (steht im Hub noch als „bald")
- **Benachrichtigungen** ✅ ERLEDIGT — `notify.js` + `/benachrichtigungen`:
  nur „neuer Spieltag" und „ungetipptes Spiel beginnt in X h", mit Nachtruhe
  und Tagesobergrenze. Offen bleibt der echte VERSAND (Web-Push/App).
