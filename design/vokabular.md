# Vokabular — wie wir über Spiel-Einflüsse reden

**Angelegt 20.08.2026 auf Andis Vorschlag.** Anlass war sein Befund: „bei den
Parametern ist extrem viel Müll dabei, die passen nicht ganz auf die
Game-Einflüsse."

🔴 **Das ist kein Ordnungsproblem, sondern die Ursache des Mülls.** Wenn eine
Anfrage lautet „du kannst dir sicher vorstellen, welche Parameter ein
Game-Einfluss braucht", dann erfindet ein Modell zuverlässig zwanzig plausible
Felder — weil „Game-Einfluss" nichts Bestimmtes bezeichnet. Gemessen am
20.08.2026: **38 Regel-Blöcke mit 180 einzelnen Einstellwerten.** Für ein
Tippspiel unter Freunden.

Dieses Blatt legt fest, was die Wörter bedeuten. Danach ist „mach den Joker
stärker“ ein präziser Auftrag statt einer Einladung zum Erfinden.

🔴 **Es ist ein GEMEINSAMES Blatt, kein Vorschlag von Claude an Andi.** Andi
schreibt hier genauso hinein wie ich: Ebenen umbenennen, Begriffe streichen,
eigene ergänzen. **Im Zweifel gewinnt sein Wort** — ein Vokabular taugt nur,
wenn es die Sprache dessen spricht, der die Aufträge gibt. Wenn er eine Ebene
anders nennt als hier, wird sie hier umbenannt, nicht er korrigiert.

---

## ✍️ Andis Begriffe — hier schreibt er hinein

**Die linke Spalte gehört Andi.** Er trägt ein, wie er etwas nennt; ich fülle
rechts nach, was es im Code ist und in welche Ebene es gehört. Wo beides
auseinandergeht, **wird die Tabelle geändert, nicht Andis Wort.**

⚠️ Ein leeres Feld rechts ist kein Versäumnis, sondern eine offene Frage an
mich — sie wird beim nächsten Durchgang beantwortet, nicht überschrieben.

| Wenn Andi sagt … | meint er … | Ebene |
|---|---|---|
| „Game-Einfluss“ | *(zu unbestimmt — deshalb dieses Blatt)* | — |
| „Joker-Ökonomie“ | woher Joker kommen, was sie kosten, wie oft es sie gibt | 6 |
| „Preset-Modifikator“ | *(❓ Voreinstellung der Wertung? oder ein Aufschlag daraus?)* | ❓ |
| | | |
| | | |

---

### 🔴 ENTSCHIEDEN: Es gibt keine Spielmodi (Andi, 20.08.2026)

Wörtlich: *„Quoten-Auswertung ist der Standard bzw. meine Idee, und natürlich
können auch Joker, Ereignisse bzw. Game-Einflüsse hinzugefügt werden, das ist
kein eigener Spielmodus.“*

**Damit ist die bisherige Darstellung falsch.** Der Code führt `einzel`,
`ranking` und `einsatz` als drei Werte von `joker.modus`, und die Oberfläche
hat daraus drei „Modi“ gemacht. Richtig ist:

| | |
|---|---|
| **Das Spiel** | **Quoten-Auswertung.** Nicht abschaltbar, kein Modus, kein Preset. Wer aus einer unwahrscheinlichen Lage richtig liegt, bekommt mehr. Das ist die Idee, nicht eine von mehreren. |
| **Zusätze** | Joker, Ereignisse, Game-Einflüsse. Optional, kombinierbar, **nie ein eigener Spielmodus**. |

🔴 **Nachtrag 20.08.2026, aus `StrukturTeil1.docx`:** Die Überschrift oben ist
zu absolut. Richtig ist:

- **Budget** und **Quotentippen** SIND eine Variantenwahl — sie steht in Andis
  Entwurf als **erste Frage** der Spielerstellung, noch vor der Anzeigeebene.
- **Kein** eigener Modus sind Joker, Ereignisse und Game-Einflüsse. Die sind
  Zusätze und werden dazugeschaltet.

Der Satz „es gibt keine Spielmodi" gilt also für die Zusätze, nicht für die
Variante. Zwei Varianten, beliebig viele Zusätze.

Folgen, die daraus zu ziehen sind (noch nicht umgesetzt):

- **Das Wort „Modus“ verschwindet aus allem, was der Nutzer liest.** Der
  gespeicherte Wert `joker.modus` darf bleiben — er steht in bestehenden Runden
  und Creator-Codes. Umbenannt wird, was auf dem Bildschirm steht.
- Die Spielerstellung darf **nicht** mit einer Modus-Wahl beginnen. Die
  Quoten-Auswertung wird gesetzt, nicht gewählt.
- Die fünf Kacheln in Stufe 1 sind damit **Zusammenstellungen von Zusätzen**,
  keine Spielarten.

**Benennung der Joker-Formen:**

| Code-Wert | Andis Wort | was der Tipper tut |
|---|---|---|
| `einzel` | **Joker** | markiert EIN Spiel |
| `einsatz` | **Budget mit festen Münzen jeden Spieltag** | verteilt den Vorrat frei |
| `ranking` | ❓ noch offen | verteilt Stufen, jede nur einmal |

⚠️ Andi zum Budget: *„finde ich blöder“*. Es bleibt, aber es gehört **nicht
nach vorn** — weder als erste Kachel noch als Beispiel, wenn eine Regel erklärt
wird.

---

## Die sieben Ebenen — mehr gibt es nicht

Jeder Einfluss im Spiel gehört in **genau eine** davon. Wer einen neuen baut
und keine passt, hat entweder etwas übersehen oder braucht ihn nicht.

| # | Ebene | Was sie tut | Beispiele im Code |
|---|---|---|---|
| 1 | **Wertung** | Rechnet aus, was EIN Tipp auf EIN Spiel wert ist | `scoreResult`, `scoreGoals`, `applyCombo`, Nähe, Kombi |
| 2 | **Modifikatoren** | Skalieren die fertige Wertung EINES Spiels. **Additiv, gedeckelt bei `modCap`** | Joker, Derby/Team, Big Game, Wettbewerbs-Gewicht |
| 3 | **Punkte-Kanäle** | Geben Punkte NEBEN der Wertung, mit **eigenem** Deckel | Saison-Wetten, Ereignis-Punkte, Alleingang, Drehrad |
| 4 | **Verlaufs-Regeln** | Greifen über den STAND, nicht über ein Spiel | Aufhol-Bonus, Saisonform (Kurve, Streicher) |
| 5 | **Auswahl** | Welche Spiele gehören dazu, wann sind sie tippbar | `spiele`, `tippfenster`, `zeitachse` |
| 6 | **Ökonomie** | Woher Joker kommen, was sie kosten, wie oft | `jokerPlan`, `budget`, `limitKlassen`, `jokerBasis`, Ereignisse als Quelle |
| 7 | **Anzeige** | Verändert die ZAHL, nie die Reihenfolge | `displayScale`, persönliche Anzeige-Stufen |

🔴 **Die Grenze zwischen 2 und 3 ist die wichtigste im ganzen Spiel.**
Ebene 2 landet in EINEM additiven Topf und wird bei `modCap` gedeckelt —
deshalb kann sie nicht explodieren. Ebene 3 liegt außerhalb und braucht
deswegen **immer einen eigenen sichtbaren Deckel**. Wer einen Faktor in Ebene 3
einbaut, hebelt `modCap` aus, ohne dass es jemandem auffällt.

⚠️ **Ebene 7 darf nie die Reihenfolge ändern.** Eine Anzeige-Regel, die den
Rang bewegt, ist keine Anzeige-Regel.

---

## Die fünf Fragen — jeder Einfluss beantwortet alle

Bevor irgendetwas gebaut wird. Wer eine Frage nicht beantworten kann, hat den
Auftrag noch nicht verstanden — und **fragt nach, statt zu erfinden.**

| Frage | Mögliche Antworten |
|---|---|
| **1. Woran hängt er?** | Tipp · Begegnung · Spieltag · Saison · Spieler |
| **2. Wann steht er fest?** | beim Tippen · beim ÖFFNEN des Spieltags · beim Auswerten · im Verlauf |
| **3. Wie wirkt er?** | Faktor (Ebene 2) · Punkte (Ebene 3) · Auswahl (5) · Anzeige (7) |
| **4. Wer entscheidet?** | Admin beim Anlegen · Runde per Abstimmung · Spieler · System/Los |
| **5. Wo einstellbar?** | Stufe 1 (Charakter) · Stufe 2 (Klartext-Frage) · Stufe 3 (Profi) |

**Frage 2 ist eine Fairness-Frage, keine technische.** Alles, was am
Tabellenstand hängt, wird beim ÖFFNEN eingefroren — sonst sieht, wer Sonntag
tippt, eine andere Runde als wer Freitag tippt. Präzedenz: Big Game
(`spieltagOeffnen` legt den WERT ab, das URTEIL fällt jede Runde selbst).

---

## Worte, die wir NICHT mehr benutzen

| ⛔ statt | ✅ so | warum |
|---|---|---|
| „Game-Einfluss" | die Ebene benennen (1–7) | bezeichnet nichts Bestimmtes — genau daraus entstand der Müll |
| „Modifikator" für alles | **Modifikator** nur für Ebene 2 | sonst verschwimmt die Deckel-Grenze |
| „Bonus" | **Punkte-Kanal** oder **Aufschlag** | „Bonus" sagt nicht, ob gedeckelt |
| „Preset" | **Voreinstellung** (Wertung) · **Charakter** (Stufe 1) | zwei verschiedene Dinge |
| „Parameter" | **Einstellwert** — mit Ebene dazu | ein Wert ohne Ebene ist nicht baubar |

---

## Vorlage für einen neuen Einfluss

Kopieren, ausfüllen, DANN bauen. Nicht andersherum.

```
Name          (deutsch, ein Wort wenn möglich)
Ebene         1–7
Hängt an      Tipp | Begegnung | Spieltag | Saison | Spieler
Steht fest    beim Tippen | beim Öffnen | beim Auswerten | im Verlauf
Wirkt als     Faktor | Punkte | Auswahl | Anzeige
Deckel        welcher, und wo er sichtbar ist
Entscheidet   Admin | Runde | Spieler | System
Stufe         1 | 2 | 3   (bei 3: Begründung, warum nicht 1/2)
Anzeige       wo der Spieler das Ergebnis SIEHT
Einstellwerte die konkrete Liste — nichts darüber hinaus
```

⚠️ **Die letzte Zeile ist die eigentliche Bremse.** Wer sie ausfüllt, merkt
selbst, wenn aus einer Idee elf Regler werden.

### Beispiel: der Alleingang-Bonus (09.08.2026 gebaut)

```
Name          Alleingang
Ebene         3 (Punkte-Kanal)
Hängt an      Tipp, im Vergleich zu allen Tipps DERSELBEN Begegnung
Steht fest    beim Auswerten
Wirkt als     Punkte
Deckel        maxZuschlag je Spiel + maxProSaison je Spieler
Entscheidet   Admin
Stufe         2 („Lohnt sich ein Alleingang?"), Stufe 1 im Charakter „Mutig"
Anzeige       eigene Marke im Ranking: „+300 Alleingang"
Einstellwerte ebene · modus · maxTipper · maxAnteil · art · anteil · punkte ·
              maxZuschlag · minTipper · ersatzZaehlt · maxProSaison
```

Elf Einstellwerte. **Nach diesem Blatt hätte man vorher darüber geredet** — und
vermutlich mit vier angefangen.

---

## Was als Nächstes damit passiert

**Bestandsaufnahme aller 38 Blöcke gegen dieses Blatt.** Je Block eine Zeile:
Ebene, die fünf Antworten, und — die eigentliche Frage — **stammt er aus einem
Wunsch von Andi (mit Datum belegbar) oder ist er erfunden?** Was erfunden ist
und keine Ebene füllt, wird gestrichen statt weiter mitgeschleppt.

⚠️ Das ist Arbeit an einem laufenden Regelwerk. Streichen heißt Felder aus
`sanitizeRules` entfernen — alte Creator-Codes müssen das überleben (sie
laufen ohnehin durch `sanitizeRules`, unbekannte Felder fallen weg). Vor dem
ersten Streichen `npm test` als Ausgangszahl festhalten.
