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
