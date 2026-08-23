# Die Bibliothek

*Andis PP1/PP2 von Folie 1 der Masterdatei. Gebaut am 23.08.2026.*

> „Bibliothek / Gamemode als eigenes Fenster rechts vom Strich. Suche, Filter
> nach Relevanz und Beliebtheit, je Eintrag Kurzbeschreibung, **von wem**,
> Popularität und **Bewertung durch Admins mit Icons**."

---

## 1. Warum ein Fenster

Bis zum 23.08.2026 lag alles Fertige an **drei Orten, die nichts voneinander
wussten**:

| wo | was | Suche? |
|---|---|---|
| ganz oben im Erstellen-Screen | die 5 Runden-Charaktere | nein |
| Zeile „Empfehlungen verwalten" | die 6 Presets | nein |
| nur im Abstimmungs-Screen | die 58 Bausteine (Teil-Codes) | nein |

Wer „irgendwas mit weniger Glück" suchte, musste alle drei kennen. Die
Bibliothek führt sie in **einer** Liste zusammen — 69 Einträge, durchsuchbar.

Ein **Fenster** und kein weiterer Abschnitt, weil die Frage („gibt's da was
Fertiges für?") mitten in der Arbeit aufkommt. Als Abschnitt läge sie an einer
festen Stelle im Ablauf; als Fenster legt sie sich über alles und gibt den
Screen danach unverändert zurück.

---

## 2. Die zwei Zahlen, die Andi verlangt

Beide wären das Leichteste zum Erfinden. Beide sind **gemessen**.

### Verbreitung („Popularität")

Wie viele der fünf kuratierten Runden-Ideen benutzen genau diese Werte.
**Kein Klickzähler** — den gäbe es ohne Server nicht, und eine ausgedachte Zahl
unter einem Eintrag ist schlimmer als gar keine.

Gemessen: 26 der 69 Einträge haben eine Verbreitung > 0. Höchstwerte 5/5
(„Eine Woche Vorlauf", „Ergebnis und Torschützen", „Übliche Anzeige").

Ein **geladener fremder Code** bekommt keine Verbreitung — über ihn wissen wir
nichts, und „0 von 5" würde wie ein Urteil aussehen.

### Bewertung („durch Admins mit Icons")

Keine Meinung, sondern die **Wirkung**, über die echte Engine gemessen.

---

## 3. 🔴 Der Fehlversuch, der die Bewertung gerettet hat

Die erste Fassung nahm die vorhandene Kennzahl `ratePreset().underdogLean`.
Nachgemessen:

```
Wirkungen: { neutral: 64, ueberraschung: 5 }
```

**64 von 69 Einträgen bekamen dasselbe Icon.** Sogar „Mild" und „Streng"
kamen auf denselben Wert:

```
Wertungs-Bausteine, Delta: Mild +0 · Ausgewogen +0 · Streng +0 ·
Ohne Sicherheitsnetz +0 · Flach +0 · Gestuft +0 · …
```

Der Grund war kein Fehler in den Einträgen, sondern in der Messung:
`underdogLean` ist ein **Verhältnis** (Außenseiter-Punkte zu Favoriten-Punkten),
und `k`/`m` skalieren beide Seiten gleich. Die Kennzahl ist für ihren Zweck
richtig — als allgemeines „was tut dieser Eintrag" ist sie blind.

Ein Icon, das fast alle gleich beschreibt, ist Deko. Dieselbe Sorte Befund wie
die gelöschte `autoPlus`-Stufe (`design/randquoten.md`).

---

## 4. Die vier Achsen

Jede ist an den Einträgen nachgemessen, dass sie wirklich unterscheidet.

| Achse | was sie misst | gemessene Spanne |
|---|---|---|
| **Schärfe** | wie viel ein knapper Fehltipp verliert | Mild 56 · Ausgewogen 64 · Streng 93 · Ohne Netz 73 |
| **Boden** | der schlechteste Tipp der Vorschau | 58 · 41 · **−75** · 25 |
| **Überraschung** | Außenseiter gegen Favorit (`ratePreset`) | 0 · +19 · +5 · +42 (die Underdog-Bausteine) |
| **Torschützen** | Anteil der Schützen an der Summe | Flach 18 % · Gleichmäßig 59 % · Gestuft 64 % · Exakt entscheidet 79 % |

Standard-Regelwerk zum Vergleich: Schärfe 59 · Boden 50 · Überraschung 24 ·
Torschützen 64.

### Die vierte Achse war auch ein Befund

Die vier **Kombi**-Einträge zeigten auf den ersten drei Achsen exakt dieselben
Zahlen (59 · 317 · 50). Das sah nach „diese Einträge tun nichts" aus, war aber
ein **Messfehler**: `previewArchetypes` tippt mit leerer Schützenliste, und
genau darauf wirkt die Kombi-Staffelung. Über `projectTip` — die Funktion
liefert dieselbe Zahl einmal mit und einmal ohne treffende Schützen — trennen
sie sich sauber: 18 % / 59 % / 64 % / 79 %.

---

## 5. 🔴 Verglichen wird mit den Geschwistern

Auch die vier Achsen gegen den **Standard** gemessen zeigten „Mild" und
„Gemütlich" nichts an: beide liegen nah genug an der Vorgabe (Schärfe 56 gegen
59). Richtig gerechnet — und trotzdem die falsche Frage.

Wer in der Bibliothek steht, entscheidet nicht „strenger als die Vorgabe?",
sondern **„welcher von DIESEN vieren ist der strengste?"**. Deshalb vergleicht
`bewerteAlle` innerhalb der Gruppe (`baustein:naehe`, `preset`, `charakter`)
und vergibt das Icon an die Ausreißer nach oben und unten — aber nur, wenn die
Spannweite der Gruppe über der Schwelle liegt.

Ergebnis: **17 von 69** Einträgen tragen mindestens ein Icon, verteilt so:

| Gruppe | Einträge | Icons |
|---|---|---|
| charakter | 5 | 8 |
| preset | 6 | 8 |
| baustein:naehe | 4 | 4 |
| baustein:kombi | 4 | 2 |
| baustein:underdog | 4 | 4 |
| baustein:anzeige | 4 | 2 |
| baustein:modifikatoren | 4 | 2 |
| joker · spiele · fairness · saison · maerkte · mitbestimmung · ereignisse | 38 | **0** |

Die sieben stummen Gruppen sind **kein Mangel**: sie wirken auf Joker,
Ereignisse, Anzeige und Zeit — darüber sagt eine Wertungs-Messung nichts. Ein
Icon dort wäre eine vorgetäuschte Aussage. Diese Einträge tragen stattdessen
Aufwand und Verbreitung.

### ❓ Offen für später

Für die stummen Gruppen ließen sich **eigene** Achsen messen — Joker-Dichte
(wie oft kommt einer?), Ereignis-Anzahl, Länge des Tipp-Fensters. Das wäre eine
zweite Familie von Kennzahlen je Aspekt. Bewusst vertagt, bis klar ist, ob die
Icons in der Praxis überhaupt gelesen werden.

---

## 6. Aufwand

Zählt die **Blätter** der Werte, nicht die Schlüssel: `combo: { tendenz,
abstand, exakt }` sind drei Einstellwerte, nicht einer. Das ist die ehrlichste
Antwort auf „wie viel muss ich erklären?".

🟢 bis 3 · 🟡 bis 8 · 🔴 darüber. Gemessen: 10 · 17 · 31 (die restlichen 11
sind Charaktere und Presets, die ganze Regelwerke tragen).

---

## 7. Was ein Klick tut

| Art | Wirkung |
|---|---|
| Runden-Idee | ersetzt das ganze Regelwerk |
| Regelwerk | ersetzt die Wertung, übernimmt den Namen |
| Baustein | **ersetzt seinen Aspekt**, lässt alles andere stehen |

Dieselbe Regel wie beim Teil-Code (`wendeTeilCodeAn`). Ein Baustein löscht
dabei Preset- und Charakter-Namen: was danach gilt, ist keins von beiden mehr —
der Kopf-Chip zeigt „eigenes".

⚠️ **Die Bibliothek selbst baut keine Regeln zusammen.** Sie meldet den
gewählten Eintrag nach oben; was damit geschieht, weiß der Erstellen-Screen.
Sonst gäbe es zwei Stellen, die Regelwerke mischen.

---

## 8. Nachgemessen im Browser (375 px)

- Fenster öffnet über den 📚-Chip, 69 Einträge, kein Querlauf der Seite
- Suche „gemutlich" → 1 von 69, findet „Gemütlich" ohne Umlaut
- Karte „Streng": `Baustein · Nähe & Schärfe` · 🎯 am strengsten · ⚠️ Fehltipps
  kosten · 🟡 mittlerer Umfang · 🏠 vom Haus · in 0/5 Runden-Ideen
- „Zahlen" klappt auf: Schärfe 93 · Standard 59 | Boden −75 · Standard 50
- „Übernehmen" schließt das Fenster; das Regelwerk steht danach auf
  `k 0.7 · m 0.35 · minPayout 2 · wrongPenalty −2` (der Baustein „Mild"),
  der Kopf-Chip auf „eigenes"

---

## 9. Offen

- **ATE4** (die beliebtesten Creator-Codes in der Bibliothek) braucht echte
  Nutzungsdaten und damit einen Server. Bis dahin bleibt „Verbreitung" die
  einzige ehrliche Popularität.
- Geladene Codes stehen bereits in der Liste (`urheber: "geladen"`), werden
  aber noch von niemandem eingespeist — der Erstellen-Screen führt keine
  Merkliste geladener Codes. Ein Handgriff, sobald es eine gibt.
