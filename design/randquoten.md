# Randquoten — was zahlt ein Ergebnis, für das es keine Quote gibt?

**Angelegt 22.08.2026** auf Andis Frage: *„wenn's keine Originalquoten gibt,
dann brauchen wir ein Modell, welches solche Ergebnistipps trotzdem honoriert,
also einen Modifikator hinzu ausgehend von der nächsten Quote."*

---

## 1 · Der Befund, gemessen

Das Ergebnis-Raster (`snap.correctScore`) ist **6×6** — 0 bis 5 Tore je Seite.
Der Stepper in der Tippabgabe lässt aber **0 bis 9** zu. Alles darüber hat
keinen Preis:

```js
const csRaw = snap.correctScore?.[actual.home]?.[actual.away];
const ergNaehe = csRaw != null ? Math.exp(-rules.k * dist) * csRaw : 0;
```

Fehlt die Quote, ist die Ergebnis-Nähe **0** — und weil `teamGoals` genauso
lang ist wie das Raster, fällt der zweite Nähe-Teil gleich mit weg.

**Gemessen über den Katalog (1943 Spiele mit Ergebnis):**

| | |
|---|---|
| Spiele mit einem Endstand außerhalb 0–5 | **32 (1,65 %)** |
| Exakt getipptes **6:0** | **47 Punkte** |
| Exakt getipptes **5:1** | **1440 Punkte** |

🔴 **Der seltenere Treffer zahlt 30-mal weniger.** Die 47 Punkte kommen nur
noch aus Sieger-Boden und Abstand; die ganze Ergebnis-Ebene fällt aus. Das
trifft nicht nur den Tipper: der Anker ist das REALE Ergebnis, ein wildes 6:2
löscht also die Nähe-Ebene für ALLE Mitspieler dieses Spiels.

⚠️ Es ist kein Anzeigefehler, sondern eine Lücke in der Wertung — und sie
fällt nicht auf, weil sie nur 1,65 % der Spiele trifft und dort wie ein
schlechter Tipp aussieht.

---

## 2 · Wohin es gehört: in die QUOTE, nicht in den Modifikator-Topf

Andis Wort war „Modifikator". Die Mechanik, die er beschreibt, ist richtig —
der Ort wäre falsch, und der Unterschied ist genau der, den `vokabular.md`
schützt:

| | |
|---|---|
| **Ebene 1 — Wertung** | „was ist dieser Endstand wert?" ← **hierhin** |
| **Ebene 2 — Modifikatoren** | „dieses SPIEL zählt mehr" (Derby, CL, Joker), additiv, gedeckelt bei `modCap` |

Ein Aufschlag in Ebene 2 hätte drei Nachteile: er würde vom `modCap`
gefressen, er wäre für alle Tipps desselben Spiels gleich (ist er aber nicht —
nur der eine Endstand ist außergewöhnlich), und er würde behaupten, das SPIEL
sei besonders, obwohl das ERGEBNIS es ist.

---

## 3 · Der Vorschlag: erst das Raster, dann die Fortschreibung

### 3a · Das Raster größer erzeugen (behebt die Ursache)

`rasterAusMarkt(markt, { grid })` nimmt die Größe **schon heute als
Parameter** — 6 ist nur die Vorgabe. Das Raster entsteht ohnehin aus einem
Fit (`fitLambdasMitTotal`, `RHO`, `longshotK` in `oddsApi.js`); ein 9×9 oder
11×11 ist derselbe Fit, nur weiter ausgewertet. Kosten: ein paar Dutzend
Zahlen je Snapshot.

**Das ist die saubere Antwort**, weil danach echte (modellierte) Quoten
dastehen statt einer Schätzung — und weil dieselbe Änderung die fehlenden
Matrix-Stufen 6 · 8 · 10 freischaltet (TI2).

⚠️ Alte Snapshots bleiben 6×6. Eingefrorene Quoten werden nicht nachträglich
geändert — dieselbe Regel wie überall sonst.

### 3b · Randfortschreibung für alles, was übrig bleibt (die Sicherung)

Eine Funktion `quoteFuerEndstand(snap, h, a)`: innerhalb des Rasters die echte
Quote, außerhalb eine fortgeschriebene. Damit hat **jeder** Endstand einen
Preis, auch in alten Runden und jenseits jeder Rastergröße.

**Wie fortschreiben:** die Randverteilung je Seite fällt im Schwanz
annähernd geometrisch. Aus zwei sauberen Stützstellen den Zerfallsfaktor
schätzen, dann Stufe für Stufe weiterrechnen.

🔴 **Die Falle, schon gemessen:** NICHT die letzte Stufe als Stützstelle
nehmen. Beispiel RB Leipzig – Gladbach, Randverteilung des Gastes:

```
0,3094  0,3646  0,1917  0,0738  0,0315  0,0289
                                   └──────┘  Zerfall 0,92 ?!
```

Der Sprung 0,0315 → 0,0289 ist **kein** Zerfall, sondern die Rasterkante: was
über 5 Tore hinausgeht, staut sich auf der letzten Stufe. Wer von dort
extrapoliert, hält den Stau für die Wahrheit und schreibt einen viel zu
flachen Schwanz fort. Die sauberen Stützstellen liegen davor (0,0738 → 0,0315
= 0,427).

**Zur Probe gerechnet** (RB Leipzig – Gladbach, Heimseite, Zerfall 0,53):
P(6:0) ≈ 0,98 % → **Quote 102**. Daneben die echten: 4:0 = 28,5 · 5:0 = 57,8.
Die Reihe 28,5 → 57,8 → 102 ist monoton und plausibel.

### 3c · Vier Leitplanken

1. **Markiert, nie stillschweigend.** Eine fortgeschriebene Quote bekommt ihr
   Kennzeichen (wie `spielerQuelle`, `torschnittQuelle`, `herkunftLabel`) und
   die Oberfläche sagt „geschätzt". Eine Schätzung, die wie ein Marktpreis
   aussieht, ist schlimmer als keine.
2. **Monoton.** 7:0 muss mehr zahlen als 6:0. Ein Zerfallsfaktor ≥ 1 wird
   gekappt, sonst dreht sich die Reihe um.
3. **Gedeckelt.** `rasterAusMarkt` kennt `cap` (200); die Fortschreibung
   endet dort ebenfalls. Ein 9:0 darf nicht ins Unendliche laufen.
4. **Nicht farmbar.** Der Anker ist das REALE Ergebnis (Architektur-Regel 4):
   ein Tipp auf 8:0 zahlt nur, wenn es wirklich 8:0 steht. Die Kante lässt
   sich also nicht ansteuern — deshalb braucht es hier keine Sperre.

---

## 4 · Was der Deckel anrichtet — ein Befund aus dem Umbau

Beim Vergrößern auf 9×9 ist etwas aufgefallen, das im 6×6 nicht sichtbar war.
`oddsFrom` kappt jede Quote bei **200**. Gemessen an FC Bayern – VfB Stuttgart:

| | |
|---|---|
| Zellen am Deckel | **48 von 81** |
| Ihr Anteil an der normierten Masse | **19,3 %** |

Das ist keine Wahrscheinlichkeit, sondern die Kappung. Ein 8:8 ist nicht
„einmal in 200 Spielen", es ist praktisch unmöglich — es steht nur deshalb bei
200, weil die Quote dort abgeschnitten wird.

**Zwei Folgen, und nur eine ist erledigt:**

1. ✅ **Anzeige.** Der automatische Zuschnitt der Matrix jagte dem Phantom
   hinterher und zeigte fast das volle Raster (Ø 80,8 von 81 Feldern). Zellen
   am Deckel zählen beim Zuschneiden jetzt nicht mit — danach Ø **22,9** Felder,
   213 von 300 ungleich zugeschnitten (FC Bayern – VfB Stuttgart: 7×4).
2. ⏳ **Wertung.** Ein 6:0, 7:0 und 8:0 zahlen am Deckel alle gleich viel. Vor
   dem Umbau zahlten sie 0, jetzt zahlen sie 200er-Niveau — besser, aber die
   Reihenfolge „seltener zahlt mehr" endet dort.

🔴 **Der Deckel ist eine Balance-Frage und gehört damit in die Endphase.** Die
saubere Lösung wäre, das RASTER feiner zu deckeln (etwa 2000) und die
Auszahlung weiter über `perGameCap` und die Anzeige-Skalierung zu begrenzen —
dann behält der Schwanz seine Reihenfolge, ohne dass Punkte explodieren.
**Nicht ohne Andis Ansage**, weil es die Höhe seltener Auszahlungen verschiebt.

## 5 · Was zu entscheiden ist

❓ **Wie groß soll das erzeugte Raster werden?** 9×9 deckt praktisch alles ab
(über 8 Tore je Seite kommt im Katalog nicht vor), 11×11 wäre die Größe des
Steppers. Mehr Raster heißt mehr gerechnete Quoten je Spiel — bei 1943 Spielen
ist auch 11×11 kein Speicherproblem, es ist eine Frage der Sauberkeit.

❓ **Soll die Fortschreibung auch dann greifen, wenn ein Spiel echte
Marktquoten trägt?** Der Markt liefert `correct_score` nur für die üblichen
Endstände; dort ist die Fortschreibung die einzige Antwort. Ich würde sie
immer anbieten — sie ist ja markiert.
