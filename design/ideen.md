# Ideen — Andis Eingangskorb

**Hier schreibt Andi rein, was ihm einfällt. Sonst niemand.**
Angelegt 20.08.2026, weil Ideen bisher im Chat standen — und ein Chatverlauf
ist nach dem Fenster weg.

---

## Für Andi: wie du hier schreibst

**Eine Überschrift mit `##`, darunter was du willst.** Mehr nicht. Stichworte
reichen, ganze Sätze auch.

⚠️ **Du MUSST nichts einordnen — du DARFST aber alles.** Diese Datei gehört
dir, nicht mir. Wenn du schon weißt, welche Ebene es ist, welche Werte du
willst oder wie der Regler heißen soll: schreib es hin. Wenn du nur ein
Stichwort hast: auch gut. Beides ist richtig, und je mehr von dir kommt, desto
weniger muss ich raten.

Und wenn eine Rückfrage (`❓`) in einem Eintrag steht: **antworte direkt
darunter in der Datei.** Dann steht die Antwort dort, wo die Frage steht —
auch in drei Wochen noch.

```
## Joker fürs Dranbleiben aufteilen
wer 5 Spieltage am Stück tippt kriegt was, aber gestaffelt.
und irgendwie soll man das auch verlieren können
```

Das genügt. Datei speichern, fertig.

⚠️ **Du musst nichts committen.** Sag im Chat „hab was in die Ideen
geschrieben", dann lese ich sie, arbeite sie ein und schiebe sie mit.

---

## Für Claude: die Regeln an dieser Datei

🔴 **Ein Eintrag mit `🆕` wird NIE direkt gebaut.** Erst wird die Vorlage aus
`design/vokabular.md` ausgefüllt — Ebene, die fünf Fragen, die Liste der
Einstellwerte. Was sich daraus nicht beantworten lässt, kommt als `❓` in den
Eintrag, **nicht in eine Vermutung**.

Das ist der ganze Zweck dieser Datei. Andis Befund vom 20.08.2026: aus
Anfragen wie „du kannst dir sicher vorstellen, welche Parameter das braucht"
sind 38 Regel-Blöcke mit 180 Einstellwerten geworden, von denen er einen
Großteil nie bestellt hat. **Lieber eine Rückfrage zu viel als ein erfundener
Regler.**

**Der Status steht am Anfang der Überschrift:**

| | heißt |
|---|---|
| `🆕` | neu von Andi, noch nicht angesehen |
| `❓` | ich habe Rückfragen — sie stehen im Eintrag, Andi antwortet |
| `✅` | geklärt, Vorlage ausgefüllt, kann gebaut werden |
| `🔨` | in Arbeit |
| `✔️` | gebaut — mit Datum und Modul dahinter |
| `⛔` | verworfen — **mit Grund**, sonst kommt es in drei Wochen wieder |

⚠️ **Nichts hier löschen.** Erledigtes wandert nach unten unter „Abgelegt".
Ein gestrichener Eintrag ohne Begründung taucht garantiert wieder auf — genau
so kam das Balancing dreimal zurück.

⚠️ **Rückfragen gehören in die DATEI, nicht nur in den Chat.** Andi liest sie
sonst nicht mehr, wenn das Fenster zu ist.

---

# Offen

## ✅ Favoriten sperren — „immer Harry Kane nehmen, boring" · GEBAUT 26.08.2026

*Andi, 26.08.2026, wörtlich:* „notier noch als auswahl, dass der admin
einstellen kann, dass bspw. die wahrscheinlichsten quoten bei Torschützen und
Spielstand nicht ausgewählt werden können (in abhängigkeit der betippten
Mannschaften und pro Wettbewerb) sobald sie einen Schwellenwert nicht
erreichen … find halt immer harry kane nehmen boringo"

**Der Kern in einem Satz:** die naheliegendste Wahl soll nicht immer offen
stehen. Wer den Torschützenkönig nimmt, weil er der Torschützenkönig ist, tippt
nicht — er wählt aus.

### 🔴 Stand: gebaut. Was aus den sechs Fragen geworden ist

| | Frage | Antwort im Code |
|---|---|---|
| ❓1 | Sperren oder dämpfen? | **Sperren.** Dämpfen wäre Ebene 2 und damit Balance. Das Kontingent aus deiner dritten Möglichkeit gibt es trotzdem — als **Freischalt-Joker** (`sperre.freischaltungen`). |
| ❓2 | Quote oder Rang? | **Beides, umschaltbar** (`sperre.modus`). Deine Antwort ist damit eine Voreinstellung und keine Architektur-Entscheidung. Vorgabe ist `rang`, weil er deine Klammer von selbst auflöst. |
| ❓3 | Torschütze und Endstand getrennt? | **Getrennt** — `schuetzen` und `ergebnisse` sind zwei Zahlen. |
| ❓4 | Was, wenn nichts übrig bleibt? | **`mindestensOffen`.** Gesperrt wird nur so weit, wie danach noch genug Auswahl bleibt. Vorgabe 4. |
| ❓5 | Welche Stufe? | **Stufe 2**, als Klartext-Frage „Ist der Naheliegende wählbar?" (12. Regler). |
| ❓6 | Nähe über eine gesperrte Zelle? | **ERLEDIGT — durch Wegfall.** Andi am 26.08.2026: *„stimmt deine Frage wirfts auf, ich will keinen block ermöglichen bei ergebnissen, nur Torschützen"*. Endstände werden nicht mehr gesperrt, also gibt es die Hintertür nicht mehr. Beim Torschützen gibt es sie ohnehin nicht: es gibt keine „Nähe" zu einem Namen. |
| ➕ | *neu, aus derselben Nachricht* | **Abwerten statt sperren.** Dieselbe Auswahl, weiche Konsequenz — siehe unten. |

⚠️ **Alles darunter ist die ursprüngliche Notiz** und bleibt stehen, weil sie
zeigt, woher die Antworten kommen. **Alle sechs Fragen sind beantwortet.**

⛔ **Und eine Antwort hat etwas zurückgebaut:** die erste Fassung sperrte auch
Endstände. Sie ist weg — auf Andis Ansage und aus dem Grund, den ❓6 benannt
hatte. Der Code, die Tests und die Oberfläche sind entsprechend
zurückgenommen, nicht nur ausgeschaltet.

### Vorlage ausgefüllt (`design/vokabular.md`)

```
Name          Favoriten-Sperre
Ebene         5 (AUSWAHL) — sie ändert nicht die Wertung, sondern was
              überhaupt wählbar ist
Hängt an      der Begegnung (Frage 1) — genauer: an den Quoten DIESER
              Begegnung, also an den beteiligten Mannschaften
Steht fest    beim ÖFFNEN des Spieltags (Frage 2)
Wirkt als     Auswahl-Einschränkung, KEIN Faktor und KEINE Punkte
Deckel        keiner nötig — Ebene 5 vergibt nichts
Entscheidet   Admin beim Anlegen (Frage 4)
Stufe         ❓ offen (Frage 5) — siehe ❓5
Anzeige       gesperrte Torschützen ausgegraut, gesperrte Zellen im
              Ergebnis-Raster ausgegraut, mit Grund daneben
Einstellwerte ❓ offen — hängt an ❓2
```

🔴 **Ebene 5 ist der Punkt, an dem diese Idee steht oder fällt.** Sie ist keine
Balance-Frage: es wird nichts umgewertet, es wird etwas WEGGENOMMEN. Deshalb
darf sie gebaut werden, bevor Balancing dran ist — die SCHWELLE selbst ist
dagegen eine Zahl und gehört ans Ende.

### ⚠️ Warum das mehr ist als ein Filter — und das gehört vor jeden Bau

Die Sperre greift in die einzige Stelle ein, an der das Spiel bisher NICHTS
verbietet. Drei Folgen, die mitgebaut werden müssen:

- **Der Ersatz-Tipp bei Versäumnis** (`autoTip.js`) wählt heute frei. Er darf
  keine gesperrte Option ziehen — sonst bekommt der Verpasser, was dem
  Anwesenden verwehrt war.
- **Das Ergebnis-Raster** (`ergebnisMatrix.js`, `NaheErgebnisse`) zeigt jede
  Zelle mit Punkten. Gesperrte Zellen müssen als gesperrt erkennbar sein,
  sonst rechnet der Spieler mit einer Zahl, die er nicht bekommen kann.
- **Die Nähe-Belohnung** zahlt für „knapp daneben". Ist 2:1 gesperrt und 2:0
  nicht, bekommt man über die Nähe womöglich doch Punkte für das gesperrte
  Ergebnis. ❓ Gewollt oder nicht — siehe ❓6.

### ❓ Rückfragen an Andi — hier bitte antworten

**❓1 · Sperren oder nur dämpfen?**
Ein hartes Verbot ist das Einfachste und am klarsten zu erklären. Denkbar wäre
auch: Favorit bleibt wählbar, zahlt aber weniger — das wäre allerdings Ebene 2
und damit Balance. **Oder: nur x-mal pro Saison wählbar.**
→ Verbot · Dämpfung · Kontingent?

**❓2 · Feste Quote oder relativer Rang?**
Zwei Bauarten, und die Wahl entscheidet, ob deine Klammer („in Abhängigkeit der
betippten Mannschaften und pro Wettbewerb") überhaupt noch nötig ist:

| | |
|---|---|
| **feste Schwelle** | „alles unter Quote 2,0 gesperrt" — einfach, aber in einer schwachen Liga sperrt sie NICHTS und in einem Duell Bayern–Aufsteiger fast alles. Dann braucht es wirklich einen Wert je Wettbewerb. |
| **relativer Rang** | „die 2 wahrscheinlichsten Torschützen gesperrt" — löst das Ligen-Problem von selbst, weil es immer relativ zum Spiel gilt. **Ein Wert für alle Wettbewerbe genügt.** |

⚠️ Ich halte den relativen Rang für die bessere Bauart und würde ihn empfehlen
— aber es ist deine Entscheidung, nicht meine.

**❓3 · Torschütze und Spielstand mit derselben Schwelle oder getrennt?**
Beim Spielstand ist der Favorit oft 1:0 oder 2:1; beim Torschützen ist es eine
Person. Dieselbe Zahl könnte das eine hart und das andere gar nicht treffen.

**❓4 · Was, wenn fast nichts mehr übrig bleibt?**
Bayern gegen einen Aufsteiger: sperrt man die drei wahrscheinlichsten
Ergebnisse, ist der halbe sinnvolle Raum weg. Braucht es eine Untergrenze
(„mindestens N Optionen bleiben immer offen")?

**❓5 · Auf welcher Stufe einstellbar?**
Als Klartext-Frage in Stufe 2 („Darf man den Favoriten nehmen?") oder nur in
der Profi-Ansicht? Baukasten-Grundsatz: eine reine Profi-Einstellung braucht
eine Begründung.

**❓6 · Zählt die Nähe-Belohnung über eine gesperrte Zelle hinweg?**
Beispiel: 2:1 ist gesperrt, du tippst 2:0, es endet 2:1. Bekommst du die
Nähe-Punkte? Sonst ist die Sperre über die Hintertür doch erreichbar.

### Mein Einwand, damit er auf dem Tisch liegt

⚠️ **Der Favorit ist im Quotenspiel ohnehin schon die schwache Wahl.** Kane bei
1,6 zahlt wenig, ein Überraschungsschütze bei 8,0 zahlt viel — wer immer den
Favoriten nimmt, gewinnt die Runde nicht, er verliert sie nur langsam. Das
Problem ist also nicht die WERTUNG, sondern das GEFÜHL: es ist langweilig.

Das ist ein völlig legitimer Grund, und die Sperre löst ihn direkt. Ich schreibe
es nur dazu, weil daraus eine zweite, billigere Möglichkeit folgt: **das
Langweilige sichtbar machen, statt es zu verbieten** — „98 % deiner Runde haben
auch Kane genommen" (`alleinstellung.js` rechnet das bereits aus). Beides
zusammen ginge auch.

→ Deine Entscheidung. Ich baue, was du sagst.

---

## ✅ Abwerten statt sperren — die weiche Schwester · GEBAUT 26.08.2026

*Andi, 26.08.2026, wörtlich:* „gut wir haben ja auch nen mechanismus, der
einfach die Topwahrscheinlichen Torschützen quoten biischen abwertet (ist ja
egtl ne ähnliche einstellung ienfach mit nem Malus sobald schwellenwerte)"

### ⚠️ Zuerst die Richtigstellung: den Mechanismus gab es NICHT

Nachgesehen, nicht vermutet. Was es gab:

| | |
|---|---|
| `kombiBonus.js` | wertet **seltene** Schützen **auf** — und nur, wenn Ergebnis UND Schütze zusammen aufgehen. Keine Schwelle. |
| `underdogBoost` / `favFlopPenalty` | Ergebnis-Ebene, nicht Torschützen. |
| `tabellenBonus.richtung: "auchFavorit"` | dämpft den erwartbaren SIEG, nicht den erwartbaren Schützen. |

Der Gedanke stimmt also, die Umsetzung fehlte. Deine Beschreibung passt
allerdings **genau** auf die Favoriten-Sperre: „wer liegt über der Schwelle"
rechnet die längst aus — es fehlte nur die zweite Konsequenz.

### ✅ Gebaut als SCHALTER, nicht als zweiter Block

`sperre.wirkung`: **sperren** (nicht wählbar, Vorgabe) oder **abwerten**
(wählbar, zahlt `malusProzent` weniger). Eine eigene Datei mit eigener
Schwelle wäre eine zweite Antwort auf „wer ist hier der Favorit?" — genau die
doppelte Wahrheit, an der dieses Projekt am 05.08.2026 17 Fehler an einem Tag
hatte.

🔴 **Der Unterschied ist größer, als er aussieht, und er steht im Code:**
`sperren` ist **Ebene 5** (Auswahl) und verrechnet nichts. `abwerten` ist
**Ebene 2** und greift in `scoreGoals` ein — gemessen bewegt es **1690 Punkte**
(`npm run greift`). Deshalb steht der Prozentsatz auf einem Platzhalter und die
ganze Regel auf AUS.

⚠️ **Der Malus greift auf den GEWINN (`Quote − 1`), nicht auf die Quote.** Die
Quote selbst zu dämpfen zöge den Einsatz mit — ein Tipp, der 30 % weniger
gewinnt, verlöre dann auch 30 % weniger. Das wäre keine Abwertung, sondern eine
Versicherung.

**Auf Stufe 2 steht sie VOR den harten Stufen** („Er zahlt weniger" · „Der
Favorit ist gesperrt" · „Die drei Naheliegendsten sind gesperrt"): für eine
Freundesrunde ist die weiche vermutlich die richtige Antwort, und niemand steht
vor einem grauen Knopf.

⏳ **Endphase:** wie stark der Abzug sein soll. Heute 20 % in der Regler-Stufe —
die Größenordnung, die du am 21.08.2026 selbst gesetzt hast („milde
Aufwertungen bis etwa +20 %"), hier mit umgekehrtem Vorzeichen.

---

## ❓ Sperre als Ereignis und als Joker — die zweite Richtung

*Andi, 26.08.2026, wörtlich:* „mach generell solche mechaniken auch als Ereignis
verfügbar und als Joker (oder gibts da Bedenken dass es nicht aufgeht, )"

### ✅ Gebaut ist beides — in der Richtung, die trägt

- **Als Ereignis:** die Wirkung `sperre` in `wirkung.js` ist auswertbar
  geworden. Ein Ereignis kann EINEM Spieler an EINEM Spieltag zusätzlich
  Torschützen zuhalten — bzw. abwerten, je nachdem, was die Runde eingestellt
  hat (`sperrEingriff.js`). Sie stand seit dem 07.08.2026 als Vorbereitung im
  Katalog und hatte bis heute nichts, worauf sie greifen konnte.
- **Als Joker:** `sperre.freischaltungen` — der Spieler hebt die Sperre an
  einem Spiel je Spieltag selbst auf. Bauart wörtlich wie `eingriffe.schutz`
  (JK14): Anzahl vom Admin, Auswahl vom Spieler bei der Tippabgabe.

### 🔴 Die Bedenken, nach denen du gefragt hast

Es sind drei, und die ersten beiden sind der Grund für genau diesen Zuschnitt.

**1 · Rückwirkend geht es nicht.** Eine Sperre auf einem Spieltag, an dem schon
getippt wurde, macht abgegebene Tipps nachträglich ungültig — dieselbe Falle wie
ein nachträglich geänderter Quoten-Schnappschuss. Die Ereignis-Sperre greift
deshalb über den RUNDEN-Spieltag und nicht über die Uhrzeit.

**2 · Zwei Sperren zusammen können die Auswahl leerräumen.** Runden-Sperre plus
Ereignis-Sperre sind einzeln harmlos und zusammen womöglich nicht.
`mindestensOffen` gilt deshalb für BEIDE zusammen, an einer Stelle.

**3 · Sie verrechnet nichts.** Der Vorgang bleibt in Punkten, Jokern und Faktor
neutral. Damit fällt die ganze Mechanik nicht unter Balancing — sie verschiebt
die Auswahl, nicht die Punkte.

### ❓ Die eine Richtung, die ich NICHT gebaut habe — bitte entscheiden

**❓ Soll man einem MITSPIELER eine Sperre auflegen können?** („du darfst diesen
Spieltag den Favoriten nicht nehmen")

Das wäre ein Fremdjoker wie Block und Klau — und es ist die Richtung, bei der
Bedenken 1 wirklich zuschlägt: die Fremdjoker-Familie setzt voraus, dass der
Getroffene schon getippt hat (Trittbrett und Gegenwette brauchen seinen Tipp).
Eine Sperre braucht das Gegenteil: sie muss VOR seinem Tipp da sein, sonst ist
sie wirkungslos oder sie nimmt ihm einen abgegebenen Tipp weg.

Zwei Auswege, beide baubar:

| | |
|---|---|
| **auf den NÄCHSTEN Spieltag** | Der Getroffene hat dort noch nicht getippt. Sauber, aber die Wirkung kommt spät und fühlt sich entkoppelt an. |
| **nur bis zum eigenen Tipp-Schluss** | Wer früh tippt, ist geschützt; wer spät tippt, wird getroffen. Das belohnt frühes Tippen — womöglich sogar erwünscht, aber es ist eine Nebenwirkung, keine Absicht. |

→ Deine Entscheidung. Ohne sie baue ich sie nicht: eine Mechanik, die einem
Mitspieler etwas wegnimmt, will man nicht auf gut Glück einführen.

**❓ Und die kleinere Frage nebenbei:** die Wirkung `sperre` hieß bis heute „kein
Joker an diesem Spieltag". Diese Bedeutung ist NICHT mitgewandert — sie ist eine
andere Mechanik (Kontingent statt Auswahl). Soll es sie zusätzlich geben?

---

## 🔨 Rechte statt Punkte — „der Sieger bestimmt das nächste Topspiel"

*Andi, 27.08.2026, wörtlich:* „admin einstellbar machen, dass halt sieger eines
Speiltags oder eauch eines letzten Top matches (gibt hier verschiedene
interessante Optionen) das nächste Toppspiel oder ereignis auswählen kann (bzw.
Sowas wie Big game aber auch andere für die ganze Tipprunde festlegt) hast du
vllt auch schon so"

### ✅ Ja — die Idee stand schon im Katalog, seit dem 07.08.2026

Und zwar wörtlich mit seinem Beispiel. `wirkung.js`, Wirkung **`rolle`**:

> „Ein Recht statt Punkten — z. B. **diese Woche das Big Game bestimmen**."

⛔ Sie war nur **nicht auswertbar** (`braucht: ["rollen"]`), genau wie die
Sperre bis zum 26.08. Die halbe Strecke war ebenfalls schon da: die WEN-Achse
kennt seit Langem **„Der Letzte Sieger — wer den vorigen Spieltag gewonnen
hat"** (`auswahl.js`, Modus `titelverteidiger`). Es fehlte das Recht selbst.

### ✅ Gebaut am 27.08.2026 — die Wertungs-Seite

- `bigGame.festesSpiel` — die matchId, die für DIESE Runde als Topspiel gilt.
- `bigGame.siegerWaehlt` — der Admin-Schalter, der das Recht überhaupt vergibt.
- `bigGameAufschlag` schlägt in **beide** Richtungen um: das gewählte Spiel
  bekommt den Aufschlag ohne Rücksicht auf die Schwelle, **und jedes andere
  bekommt ihn nicht** — auch wenn es sie reißt.

⚠️ **Die zweite Hälfte ist die wichtigere.** Ohne sie gäbe es an einem
Spieltag zwei Topspiele, das gewählte und das gerechnete, und „du bestimmst das
Topspiel" wäre eine Halbwahrheit.

### 🔴 Der Befund, an dem die ganze Idee hängt

**Das Big Game wird GLOBAL eingefroren, nicht je Runde.** Der Kopf von
`spieltagOeffnen.js` sagt warum: dieselbe Begegnung gehört zu vielen Runden,
also wird nur der **objektive Spannungswert** festgeschrieben — „ob er zählt,
entscheidet jede Runde mit ihrer eigenen Schwelle".

Eine handverlesene Wahl ist das genaue Gegenteil von objektiv. Stünde sie im
Snapshot, bestimmte der Sieger EINER Runde das Topspiel für alle anderen mit.

✅ **Deshalb liegt sie im REGELWERK** — dem einzigen Ort, den die Wertung
ohnehin je Runde UND je Spieltag liest (`getRegelnFuer`). Das ist kein
Umweg, sondern die einzige Stelle, an der so etwas überhaupt hingehört.

### ⏳ Was noch fehlt: das AUSÜBEN

Die Wertung kann es. Was fehlt, ist der Weg dahin:

1. **Wer hält das Recht gerade?** Aus den Ereignis-Vorgängen ableitbar,
   dieselbe Bauart wie `sperrEingriff.js`.
2. **Wo wird die Wahl gespeichert?** Sie ist eine Regeländerung für EINEN
   Spieltag — die Maschinerie dafür gibt es (`beschluss.js`), aber sie läuft
   heute über Anträge und Abstimmung. Ein Recht ist kein Antrag.
3. **Die Oberfläche für den Rechteinhaber.**

### ✅ Beantwortet am 27.08.2026 — und die Antworten waren enger als mein Vorschlag

| | Frage | Andis Antwort |
|---|---|---|
| ❓1 | Welche Rechte noch? | **„am ehesten egtl big game"** — plus: der Admin darf auch **die Wirkungen** zur Wahl stellen (Malus, Aufschlag, Umverteilung …) |
| ❓ | Frei wählen oder aus einer Liste? | **„nur die der Admin einstellt"** — der Inhaber wählt NICHTS frei. Der Admin kann zusätzlich einstellen, dass aus einer Liste gewählt wird, und **jede Wirkung darin ist vorher fertig eingestellt** |
| ❓ | Trifft es alle oder ein Ziel? | **„ist quasi als Ereignis was alle trifft und nicht Fremdjoker"** — ein Angebot hat deshalb **keine WEN-Achse** |

🔴 **Die dritte Antwort ist die wichtigste, weil sie eine GRENZE zieht:** eine
Wirkung, die sich EINE Person aussucht, ist ein Fremdjoker — und die gibt es
längst, mit Schutzschild, Sperrfrist und Kontingent. Ein Recht ist das
Gegenteil: der Sieger dreht an etwas, das für die ganze Runde gilt, **ihn
eingeschlossen**. Ein Abzug, den er auslöst, trifft ihn selbst mit — genau
deshalb braucht es dort keine Schutzregeln.

✅ **Gebaut:** `src/lib/rechte.js` + `Rechte.jsx`, 22 Tests. Der
Wirkungs-Editor ist dabei aus `Ereignisse.jsx` **ausgelagert**
(`Wirkungsfeld.jsx`) statt nachgebaut.

⏳ **Ein Schritt bleibt:** wo die getroffene Wahl gespeichert wird. Damit das
niemanden überrascht, meldet der Bericht „was greift hier nicht" jedes Angebot
außer dem Topspiel-Recht als **„wirkt noch nicht"**. Lieber sichtbar unfertig
als stillschweigend folgenlos.

⚠️ **Und Andis Hinweis im selben Atemzug stimmt:** *„das mit den Fremdjokern
ist ja eh schon drin, dass Admin einstellen kann, sobald wer einen Unterwert
erreicht hat, er eben auch Joker … zum aufholen kriegt."* Das ist ein
**Ereignis**, kein Recht — und es läuft seit dem 07.08.2026. Seit heute sogar
mit seiner Schwelle: der Modus `abstand` kann „wer 30 % unter dem Schnitt
liegt", vorher ging nur „die letzten n".

### ❓ Rückfragen an Andi — hier bitte antworten

**❓1 · Welche Rechte noch?** Du schreibst „gibt hier verschiedene interessante
Optionen" und „auch andere für die ganze Runde festlegt". Das Topspiel ist
gebaut. Was noch — der Joker-Spieltag? Welcher Torschütze gesperrt ist? Das
Motto der Woche? ⚠️ Ich baue keins davon auf Verdacht: jedes Recht braucht
eine Mechanik, in die es greifen kann, und drei erfundene Rechte sind drei
Schalter ohne Wirkung.

**❓2 · Was, wenn der Sieger nicht wählt?** Verfällt das Recht und die Rechnung
entscheidet wie bisher — oder wandert es weiter an den Zweiten?

**❓3 · Offen oder verdeckt?** Sieht die Runde beim Tippen, dass der Sieger
gewählt hat (und was), oder erfährt sie es erst hinterher? ⚠️ Verdeckt wäre
heikel: das Topspiel zählt mehr, und wer nicht weiß, welches es ist, tippt
unter anderen Bedingungen.

**❓4 · „Sieger des letzten Top-Matches"** — dein zweiter Vorschlag. Das ist
etwas anderes als der Spieltagssieger: wer auf DEM EINEN Spiel die meisten
Punkte geholt hat. Reizvoll, weil es die Bühne an das Spiel bindet statt an die
Tabelle. Braucht aber eine eigene Auswahl-Art (`auswahl.js` kennt sie noch
nicht). Soll ich?

---

## ✅ BEANTWORTET: das Rad zieht jetzt auch Ereignisse (27.08.2026)

**Deine Antwort:** *„klar dafür ist das Rad ja auch da? zum auslosen?"*

✅ **Gebaut.** Ein Rad-Feld „Ereignis" löst eines deiner eingestellten
Ereignisse aus. Das Rad ersetzt dabei nur den **Auslöser** — die Wirkung kommt
aus dem Ereignis, wie du sie dort eingestellt hast.

🔴 **Die zwei Fragen, die ich dir dabei gestellt hatte, sind beantwortet, ohne
dass ich raten musste:**

- **Wen trifft es?** → ein Schalter am Rad-Feld: *nur den Zieher* oder *die
  ganze Runde*. ⚠️ Die WEN-Achse des Ereignisses selbst wird bewusst NICHT
  benutzt: sie hängt an einem Tabellenstand und wird sonst gegen einen Auslöser
  gerechnet, den es hier nicht gibt. Sie nachzubauen hieße, dieselbe Rechnung
  zweimal zu schreiben.
- **Wie lange gilt es?** → am Spieltag der Ziehung, wie jede andere
  Rad-Belohnung.

⚠️ **Was dabei nebenbei herauskam, und es war ein echter Fehler:** die
Modifikator-Belohnung des Rades wurde seit ihrem Bau **erzeugt und von
niemandem gelesen**. Wer „+50 % für zwei Spieltage" zog, bekam nichts — kein
Fehler, keine Meldung. Läuft jetzt durch denselben Kanal wie ein Ereignis.

---

## 🆕 Joker-Ökonomie — neue Einfälle

*(Platzhalter vom 20.08.2026: Andi hat angekündigt, dass ihm hier noch etwas
einfällt. Zeile ersetzen, sobald er schreibt.)*

---

# Abgelegt

*(noch nichts)*
