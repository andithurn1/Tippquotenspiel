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

## ❓ Favoriten sperren — „immer Harry Kane nehmen, boring"

*Andi, 26.08.2026, wörtlich:* „notier noch als auswahl, dass der admin
einstellen kann, dass bspw. die wahrscheinlichsten quoten bei Torschützen und
Spielstand nicht ausgewählt werden können (in abhängigkeit der betippten
Mannschaften und pro Wettbewerb) sobald sie einen Schwellenwert nicht
erreichen … find halt immer harry kane nehmen boringo"

**Der Kern in einem Satz:** die naheliegendste Wahl soll nicht immer offen
stehen. Wer den Torschützenkönig nimmt, weil er der Torschützenkönig ist, tippt
nicht — er wählt aus.

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

## 🆕 Joker-Ökonomie — neue Einfälle

*(Platzhalter vom 20.08.2026: Andi hat angekündigt, dass ihm hier noch etwas
einfällt. Zeile ersetzen, sobald er schreibt.)*

---

# Abgelegt

*(noch nichts)*
