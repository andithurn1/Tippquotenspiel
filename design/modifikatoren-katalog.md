# Modifikatoren — was es gibt, was baubar ist, was nicht

**Angelegt 21.08.2026** auf Andis Frage: *„was haben wir für ne sinnvolle
Auswahl an Modifikatoren: Mach hier ne Liste … was fällt dir noch alles ein, es
gibt noch viele mehr die Sinn machen können."*

🔴 **Die Gliederung folgt der DATENLAGE, nicht der Fantasie.** Was ein
Modifikator braucht, ist zuerst eine Information über das Spiel — und die ist
entweder da oder nicht. Ein Katalog, der das vermischt, erzeugt genau die
Regler, die später niemand füllen kann.

---

## 0 · Was ein Spiel bei uns mitbringt

Aus dem Quoten-Schnappschuss (`buildSnapshot`), also **vor** dem Anpfiff:

| Feld | Was drinsteckt |
|---|---|
| `winner` | Sieg / Unentschieden / Sieg als Quote |
| `margin` | Quoten je Tordifferenz, für beide Seiten |
| `correctScore` | die **vollständige Ergebnis-Matrix** mit Wahrscheinlichkeiten |
| `teamGoals` | Quoten auf die Toranzahl je Mannschaft |
| `lamH` / `lamA` | die **Torerwartung** je Mannschaft |
| `players` | Kader mit Torschützen-Quoten |
| `derby` | Derby-Kennzeichnung, wo vorhanden |
| `kickoff`, `matchday`, `wettbewerb`, `phase` | Termin, Spieltag, Wettbewerb, K.-o.-Runde |

Aus dem Ergebnis: **Tore beider Seiten und die Torschützen.**

⛔ **Nicht vorhanden:** Tabellenplatz, Punktestand, Karten, Elfmeter,
Ballbesitz, xG, Aufstellungen, Verletzungen, Zuschauer, Wetter.

---

## 1 · Gebaut und einstellbar

| Modifikator | Feld | Stand |
|---|---|---|
| Außenseiter-Bonus mit Quotenschwelle | `underdogBoost` + `underdogRampStart/End` | ✅ genau Andis „Underdog-Bonus (Quote mit Schwellenwert)" |
| Favoriten-Patzer-Malus | `favFlopPenalty` | ✅ |
| Derby-Aufschlag | `teamMods.derbyFaktor` | ✅ |
| Faktor je Mannschaft | `teamMods.teams` | ✅ **schon je Team einstellbar** |
| Spitzenspiel | `bigGame` (`minSpannung`) | ✅ nach Quoten-Spannung, nicht nach Tabelle |
| Aufschlag je Wettbewerb | `wettbewerbe.aufschlaege` | ✅ **schon je Liga einstellbar**, dazu `phasenStufe` für K.-o.-Runden |
| Heimspiel des eigenen Vereins | `joker.heimat` | ✅ passiv |
| Mut gegen den Favoriten | `joker.mut` | ✅ passiv |
| Kombi-Stufen (Tendenz/Abstand/Exakt) | `combo` | ✅ |
| Aufholmechanik | `aufholen` | ✅ |
| Saisonform / Streichergebnisse | `saisonform` | ✅ |
| Versäumnis | `versaeumnis` | ✅ |
| Alleingang | `alleinstellung` | ✅ |
| Einfluss der Mitspieler-Tipps | `tippEinfluss` | ✅ |
| Deckel | `modCap`, `perGameCap`, `minPayout` | ✅ |

⚠️ **Zwei davon beantworten Andis heutige Frage schon:** Ligen und Mannschaften
sind bereits einzeln höher gewichtbar (`wettbewerbe.aufschlaege`,
`teamMods.teams`). Was fehlt, ist nicht die Mechanik, sondern ihr **Platz in
der Oberfläche** — sie liegen nicht bei den Sonderregeln je Wettbewerb.

---

## 2 · Sofort baubar — die Daten liegen vor

### Aus der Torerwartung (`lamH`/`lamA`, `teamGoals`)

1. **Torarmes Spiel** — greift, wenn die erwartete Torzahl unter einer
   Schwelle liegt. Andis „wenige Tore" als Eigenschaft des SPIELS.
2. **Torreiches Spiel** — dieselbe Schwelle nach oben.
3. **Zu-Null** — Aufschlag, wenn jemand „keine Gegentore" richtig tippt.
   ⚠️ Nicht mit 1 verwechseln: 1 beschreibt das Spiel, 3 den TIPP.
4. **Torflut getippt** — Tipp auf mindestens N Tore, und es trifft ein.
5. **Kantersieg** — Tordifferenz ab N richtig. Der `margin`-Markt liegt vor.

### Aus der Ergebnis-Matrix (`correctScore`)

6. **Unwahrscheinliches Ergebnis exakt** — Aufschlag nach der
   Einzelwahrscheinlichkeit des getippten Ergebnisses statt nach 1X2.
   **Das ist der feinste Underdog-Begriff, den wir haben** und braucht keine
   neue Datenquelle.
7. **Gegen die wahrscheinlichste Variante** — Abstand des Tipps zum
   Markt-Favoriten als Maß für Mut.

### Aus dem Kader (`players`)

8. **Außenseiter-Torschütze** — der getroffene Torschütze hatte eine hohe Quote.
9. **Doppelpack / Dreierpack** vorhergesagt.

### Aus Termin und Spielplan

10. **Spieltag-Gewicht** — späte Spieltage zählen mehr (Endspurt).
11. **K.-o.-Runde zählt mehr** — `phase` liegt vor, `phasenStufe` gibt es schon.
12. **Anstoßzeit** — Freitag- und Sonntagabendspiele als eigene Kategorie.
13. **Englische Woche** — Spiele mit wenig Abstand zum vorigen.

### Aus dem Rundenverlauf (alle Tipps liegen vor)

14. **Serie** — N Spieltage in Folge über einer Trefferquote.
15. **Perfekter Spieltag** — alle Spiele richtig.
16. **Kontra-Bonus** — richtig liegen, wo die Mehrheit falsch lag. Gradueller
    als der Alleingang, der auf „fast allein" abstellt.
17. **Wackelkandidat** — Aufschlag auf das Spiel mit der größten
    Uneinigkeit in der Runde.

---

## 3 · Baubar, aber mit eigenem Aufwand

18. **Tabellenplatz und Punkteabstand** — Andis Wunsch. ⚠️ Eine Tabelle haben
    wir **nicht**; sie ließe sich aber aus unseren eigenen Ergebnissen
    RECHNEN, weil der vollständige Spielplan je Liga vorliegt.
    Drei Einschränkungen, die vorher auf dem Tisch liegen müssen:
    - Sie stimmt nur für Ligen, von denen wir **alle** Spiele haben — nicht
      für eine Runde, die nur ausgewählte Partien betippt.
    - Sie ist zu Saisonbeginn **leer**: die ersten Spieltage haben keine
      aussagekräftige Tabelle.
    - Sie kennt keine Abzüge (Lizenzstrafen) und keine ligaspezifischen
      Sonderregeln bei Punktgleichheit.
19. **Aufstiegs-/Abstiegszone** — folgt aus 18.
20. **Spitzenspiel nach Tabelle** statt nach Quote — folgt aus 18 und wäre die
    intuitivere Variante von `bigGame`.

---

## 4 · Nicht ohne neue Datenquelle

Karten, Elfmeter, Ballbesitz, xG, Aufstellungen, Verletzungen, Zuschauerzahl,
Wetter. **Alles davon hieße: eine weitere Schnittstelle einkaufen und pflegen.**
Sie stehen hier, damit niemand sie versehentlich als Regler vorschlägt.

---

## 5 · Offene Frage an Andi

❓ **Woran hängt ein Modifikator?** Drei verschiedene Dinge lassen sich meinen,
und der Unterschied entscheidet die Oberfläche:

| Bezug | Beispiel | Wo er hingehört |
|---|---|---|
| am **Spiel** | torarmes Spiel, Derby | Sonderregeln je Wettbewerb |
| am **Tipp** | Zu-Null, Kantersieg | Wertung, gilt überall |
| am **Tipper** | Serie, Aufholmechanik | Runden-Regeln |

Ohne diese Trennung landen alle drei in derselben Liste, und die Sonderregeln
je Wettbewerb bekommen Regler, die mit dem Wettbewerb nichts zu tun haben.

---

# TEIL B · Jeder Modifikator im Einzelnen

**Ergänzt am 21.08.2026** auf Andis Frage: *„kannst du auch bitte jeweilig
nochmal ausgestalten, welche Einzeldetails bzw. welche Parameter dazu jeweils
einstellbar sein sollten."*

## Was für ALLE gilt

🔴 **Jeder Modifikator liefert einen AUFSCHLAG, keinen Faktor.** Die Aufschläge
werden addiert und erst am Ende von `modCap` gedeckelt. Ein Faktor würde nach
dem Deckel wirken und ihn damit aushebeln — dieser Fehler ist im Projekt schon
einmal passiert (siehe `alleinstellung.js`).

Deshalb hat **jeder** Eintrag unten dieselben drei Grundregler, und sie werden
danach nicht mehr wiederholt:

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `enabled` | an/aus | aus | Ohne ihn passiert nichts. Alles Neue startet AUS. |
| `aufschlag` | 0 … 1,5 | 0,2 | Wie viel er beisteuert. 0,2 heißt +20 % — Andis Größenordnung für Empfehlungen. |
| `nurWennRichtig` | an/aus | an | Zählt er nur bei richtigem Tipp, oder als Grundgewicht des Spiels? |

⚠️ **`nurWennRichtig` ist der wichtigste und am leichtesten übersehene
Schalter.** Aus heißt: das Spiel zählt generell mehr — auch für den, der
danebenliegt. An heißt: es ist eine Belohnung. Dieselbe Zahl bedeutet damit
zwei völlig verschiedene Spiele.

---

## B1 · Torarmes Spiel

**Was:** Spiele mit niedriger Torerwartung zählen mehr — sie sind schwerer zu
tippen. Hängt am **Spiel**, nicht am Tipp.

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `schwelle` | 1,5 … 3,5 Tore | 2,3 | Ab welcher erwarteten Gesamt-Torzahl es als torarm gilt (darunter) |
| `rampe` | 0 … 1,5 Tore | 0,5 | Weicher Übergang: volle Wirkung erst bei `schwelle − rampe`. Ohne Rampe springt der Aufschlag zwischen 2,29 und 2,31 hin und her |

⚠️ Die Torerwartung liegt als `lamH + lamA` vor — keine Schätzung, sondern der
Wert, aus dem auch die Quoten gerechnet sind.

## B2 · Torreiches Spiel

Spiegelbild von B1, gleiche Regler, `schwelle` als Untergrenze (Vorgabe 3,2).

❓ **Frage an Andi:** B1 und B2 gleichzeitig eingeschaltet heißt, dass nur
*mittlere* Spiele nichts bekommen. Gewollt — oder sollen sie sich ausschließen?

## B3 · Zu-Null

**Was:** Aufschlag, wenn richtig getippt wurde, dass eine Mannschaft nicht
trifft. Hängt am **Tipp**.

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `seite` | beide / nur Heim / nur Auswärts | beide | Auswärts zu Null ist deutlich seltener und damit mehr wert |
| `nurBeiSieg` | an/aus | aus | Zählt ein 0:0 mit? |

## B4 · Kantersieg

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `abDifferenz` | 2 … 5 | 3 | Ab welchem Torabstand |
| `genau` | an/aus | aus | Muss die Differenz exakt stimmen oder reicht „mindestens"? |
| `staffeln` | an/aus | an | Wächst der Aufschlag mit jedem weiteren Tor Abstand? |

## B5 · Unwahrscheinliches Ergebnis — der stärkste Kandidat

**Was:** Der Aufschlag richtet sich nach der Wahrscheinlichkeit **genau dieses
Ergebnisses**, nicht danach, wer gewonnen hat. Ein 3:2 des Favoriten kann
unwahrscheinlicher sein als ein 1:0 des Außenseiters.

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `schwelle` | 1 … 15 % | 6 % | Ab welcher Einzelwahrscheinlichkeit es als unwahrscheinlich gilt |
| `kurve` | flach / linear / steil | linear | Wie stark sehr seltene gegenüber knapp seltenen Ergebnissen bevorzugt werden |
| `maxAufschlag` | 0 … 3 | 1,0 | Eigener Deckel |

⚠️ **Ohne `maxAufschlag` ist dieser Modifikator gefährlich:** die
Ergebnis-Matrix enthält Felder mit Wahrscheinlichkeiten unter 0,1 %.

## B6 · Gegen den Markt

**Was:** Belohnt Abstand zum wahrscheinlichsten Ergebnis — ein Maß für Mut,
kein Treffer-Bonus.

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `mass` | Tendenz / Tordifferenz / Ergebnis | Tendenz | Woran der Abstand gemessen wird |
| `mindestAbstand` | 0 … 50 % | 15 % | Ab wann ein Tipp als „gegen den Markt" gilt |

## B7 · Außenseiter-Torschütze

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `abQuote` | 3 … 30 | 8 | Ab welcher Torschützen-Quote |
| `nurErsterTreffer` | an/aus | aus | Nur der erste Treffer des Spiels? |
| `proTreffer` | an/aus | an | Zählt jeder Treffer desselben Spielers oder nur einmal? |

## B8 · Spieltag-Gewicht (Endspurt)

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `abSpieltag` | 1 … 34 | 28 | Ab wann |
| `kurve` | Stufe / linear | linear | Sprung oder allmähliches Anwachsen |
| `endwert` | 0 … 1 | 0,3 | Aufschlag am letzten Spieltag |

⚠️ **Das ist eine Aufholmechanik in Verkleidung.** Zusammen mit `aufholen`
wirkt beides in dieselbe Richtung und addiert sich.

## B9 · Anstoßzeit

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `fenster` | Liste von Zeitfenstern | Fr 20:30 · So 19:30 | Welche Anstoßzeiten gemeint sind |
| `jeFenster` | Aufschlag je Fenster | — | Getrennt einstellbar, sonst sind „Freitag" und „Sonntagabend" dasselbe |

## B10 · Serie

**Was:** N Spieltage in Folge über einer Trefferquote. Hängt am **Tipper**.

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `laenge` | 2 … 10 | 3 | Wie viele Spieltage in Folge |
| `schwelle` | 30 … 100 % | 60 % | Was als „gut" zählt |
| `wachsend` | an/aus | an | Wächst der Aufschlag mit jeder weiteren Runde? |
| `maxStufen` | 1 … 10 | 5 | Deckel für das Wachsen |
| `bruchVerhalten` | zurück auf null / eine Stufe runter | null | Was ein schlechter Spieltag kostet |

⚠️ **`bruchVerhalten` entscheidet den Charakter.** „Zurück auf null" macht
Serien zum Nervenspiel, „eine Stufe runter" zur Rangliste der Beständigkeit.

## B11 · Perfekter Spieltag

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `genauigkeit` | Tendenz / Abstand / Exakt | Tendenz | Was „alles richtig" heißt |
| `mindestSpiele` | 3 … 15 | 5 | Bei zwei Spielen ist perfekt kein Kunststück |
| `punkte` | fester Betrag | 150 | ⚠️ Hier ausnahmsweise PUNKTE statt Aufschlag — es hängt an keinem einzelnen Spiel |

## B12 · Kontra-Bonus

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `abAnteil` | 50 … 95 % | 70 % | Ab welchem Anteil falscher Mitspieler |
| `skala` | Stufe / linear | linear | Sprung bei der Schwelle oder mitwachsend |
| `minTipper` | 3 … 20 | 5 | Darunter ist „die Mehrheit" bedeutungslos |

⚠️ **Überschneidet sich mit `alleinstellung`.** Vor dem Bauen entscheiden, ob
der Kontra-Bonus sie ERSETZT oder ergänzt.

## B13 · Wackelkandidat

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `anzahl` | 1 … 3 | 1 | Wie viele Spiele je Spieltag |
| `mass` | Streuung der Tendenzen / der Ergebnisse | Tendenz | Woran Uneinigkeit gemessen wird |
| `sichtbarVorher` | an/aus | aus | Sehen die Spieler vorher, welches Spiel es ist? |

⚠️ **`sichtbarVorher` verändert das Spiel grundlegend** — und verrät nebenbei
die Tipps der anderen, bevor abgegeben wurde.

## B14 · Tabellenplatz und Punkteabstand  ✅ GEBAUT am 21.08.2026

**Was:** Andis Wunsch. Der Aufschlag richtet sich danach, wie weit die beiden
Mannschaften in der Tabelle auseinanderliegen — nicht danach, was der Markt
sagt.

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `bezug` | Platzabstand / Punkteabstand | Platz | Womit gemessen wird |
| `abAbstand` | 3 … 18 Plätze bzw. 5 … 40 Punkte | 8 | Ab wann es ein Außenseiter-Duell ist |
| `abSpieltag` | 3 … 10 | 5 | Vorher ist die Tabelle nicht aussagekräftig |
| `richtung` | nur Außenseiter / auch Favorit | nur Außenseiter | Gibt es auch einen Malus für erwartbare Siege? |
| `fallback` | aus / Quote benutzen | Quote | Was gilt, solange keine Tabelle vorliegt |

🔴 **`fallback` ist Pflicht, kein Komfort.** Ohne ihn wäre der Modifikator an
den ersten Spieltagen still wirkungslos, und niemand merkt es.

## B15 · Spitzenspiel nach Tabelle

Wie `bigGame`, nur mit der Tabelle statt der Quoten-Spannung.

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `beidePlatzBis` | 2 … 8 | 4 | Beide Mannschaften unter Platz N |
| `oderAbstiegsduell` | an/aus | aus | Gilt dasselbe unten? |

---


## B16 · Kombi-Bonus: Ergebnis UND Torschütze

**Andis Idee vom 21.08.2026:** *„eigentlich müssen wir ja nen Kombi-Bonus bzw.
Modifikator nehmen, wenn ausgerechnet der Torschütze trifft und die Wette auch
noch aufgeht."*

⚠️ **RICHTIGSTELLUNG (22.08.2026, am Code nachgeprüft):** der Satz unten stimmte nicht. `applyCombo` multipliziert die Summe aus Ergebnis- und Tor-Anteil längst mit `combo[ebene]`, sobald ein Schütze trifft — das Zusammentreffen wird also belohnt. Was fehlte, ist Andis zweiter Punkt: dass der Aufschlag aus der QUOTE des Schützen kommt. Genau der ist jetzt gebaut (`kombiBonus.js`, `rules.kombi`, Standard aus).

~~🔴 **Heute addieren sich beide Teile nur.**~~ Ergebnis richtig gibt Punkte,
Torschütze getroffen gibt Punkte — das ZUSAMMENTREFFEN selbst wird nicht
belohnt, obwohl es das viel Seltenere ist. Zwei Ereignisse, die einzeln je 20 %
wahrscheinlich sind, treffen zusammen nur in 4 % der Fälle zu; die Wertung
behandelt das aber wie 20 % plus 20 %.

### 🔴 Der Bonus wird ABGELEITET, nicht festgelegt (Andi, 22.08.2026)

Sein Einwand, der den Modifikator erst tragfähig macht: *„ist ja klar bei nem
5:1, dass Kane und Olise ein Tor schießen — aber grade dafür … sodass es hier
vielleicht nur nen Bonus gibt, wenn bei dem 5:1 auch ein Upamecano trifft."*

**Ein fester Bonus wäre falsch.** Bei einem 5:1 ist der Stürmer fast sicher
dabei; ein Pauschalbetrag belohnte dann das Naheliegende. Trifft dagegen der
Innenverteidiger, ist genau DAS die seltene Kombination.

⚠️ **Die Seltenheit steht bereits im Schnappschuss** — jeder Spieler trägt
seine Torschützenquote (`snapshot.players`). Der Bonus muss also aus ihr
abgeleitet werden, nicht aus einem Regler:

- **niedrige Quote** (Stürmer, trifft ohnehin oft) → kleiner Aufschlag
- **hohe Quote** (Verteidiger, Joker-Einwechselspieler) → großer Aufschlag

Damit braucht es keine Sonderregel für „welcher Spieler ist unerwartet" — die
Frage beantwortet der Markt.

| Regler | Typ | Vorgabe | Bedeutung |
|---|---|---|---|
| `stufe` | Tendenz / Abstand / Exakt | Exakt | Wie genau das Ergebnis stimmen muss, damit die Kombi zählt |
| `staerke` | 0 … 1 | ⏳ Balancing | Wie stark die Schützenquote durchschlägt |
| `maxAufschlag` | Deckel | ⏳ Balancing | Sonst zahlt ein 6:0 mit Torwart-Treffer unbegrenzt |
| `mindestSchuetzen` | 1 … 4 | 1 | Wie viele Namen treffen müssen |

⚠️ **`jeSchuetze` ist bewusst NICHT mehr dabei.** Mit der Ableitung aus der
Quote erledigt sich die Frage: zwei häufige Schützen ergeben zwei kleine
Beträge, nicht zweimal denselben Pauschalbonus.

⏳ **Die Zahlen gehören ins Balancing** — Andi ausdrücklich am 22.08.2026: das
Modell dafür entsteht am Ende, zusammen mit einer Hilfe, wie ein Admin so etwas
ungefähr einstellt. Hier steht nur die MECHANIK; sie ist unabhängig davon
richtig oder falsch.

⚠️ **Der Bonus liegt vollständig im „möglichen“ Teil der Vorschau**, nie im
sicheren. Er verstärkt damit genau die Zahl, die heute allein groß auf dem
Bildschirm steht — die Trennung der beiden Summen wird dadurch wichtiger, nicht
unwichtiger.

## Was hier NICHT steht

Die 15 bereits gebauten Modifikatoren aus Teil A haben ihre Regler schon — sie
stehen vollständig in `design/entwuerfe/Ebenen-Parameter.docx`, Block für Block
mit Vorgabewerten. Sie hier zu wiederholen hieße, zwei Wahrheiten über
dieselben Felder zu pflegen.
