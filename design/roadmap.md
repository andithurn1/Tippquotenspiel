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

Test-Stand: 283 grün, Build sauber.

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
- ⚠️ **Bekannte Lücke:** Der Simulator modelliert keine Vereins-Zugehörigkeit,
  deshalb feuert der **Heimat-Joker in der Simulation nie** — sein Faktor ist
  bisher UNGEMESSEN (Standard 1,2 stammt aus der Nutzer-Einschätzung). Im
  Abschluss-Durchgang muss die Tipper-Population Vereine bekommen.
- Vorläufige Messung (3 Seeds × 60 Saisons), die bis dahin gilt: Mut-Bonus ab
  ×1,3 kippt zum Zocker → Obergrenze steht bei 1,2, Standard bei 1,1.


### Spielerstellung in 3 Komplexitätsstufen — NEU (Nutzerwunsch)
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

### Joker-TYPEN statt neuer Ebenen — NEU (Architektur-Entscheidung des Nutzers)
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

### Ertragsquellen in der Abrechnung sichtbar machen — NEU (Nutzerwunsch)
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

### Profi-Variante: aktiv vor Unwucht warnen — NEU (Nutzerwunsch)
Die Pro-Ebene lädt dazu ein, Regelwerke kaputtzudrehen. Deshalb:

- **Empfehlungsband am Regler:** der ausbalancierte Bereich ist am Slider selbst
  markiert; außerhalb färbt sich der Wert und ein Satz erklärt die Folge
  („ab hier entscheidet ein einzelnes Spiel den Spieltag").
- **Warnung SOFORT am Regler**, nicht erst unten in der Ampel — der Zusammenhang
  zwischen Handlung und Folge muss unmittelbar sein.
- **Balance-Ampel dauerhaft sichtbar** (klebend), nicht wegscrollbar.
- Kein Verbot: extreme Werte bleiben erlaubt, sie sind nur nie versehentlich.

### Joker-Verteilung über die Saison (Frequenz statt Handarbeit) — NEU
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
