# Spielvarianten — was es gibt, wo es steckt, was man davon sieht

**Angelegt 20.08.2026** auf Andis Frage: *„wir hatten verschiedene
Spielvarianten überlegt, mit Budget was jeder fest hat. oder auch ohne und
punkte halt in abhängigkeit der quoten… was hatten wir noch? und wieso seh ich
davon nichts."*

Diese Datei ist eine **Inventur, keine Spec.** Sie sagt, was gebaut ist und wo
es in der Oberfläche auftaucht — damit die Umbau-Entwürfe auf einem echten
Bestand aufsetzen und nicht auf Erinnerung.

⚠️ **Was nicht im Repo steht, ist weg.** Andi hat Ideen in mehreren Chats mit
Claude besprochen; ein Chatverlauf endet mit dem Fenster. Hier steht, was es in
den Code oder in `design/` geschafft hat. Fehlt etwas, das er sicher besprochen
hat, dann ist es dort verloren gegangen und muss neu gesagt werden — genau
dafür gibt es `design/ideen.md`.

---

## 1. Die drei Wertungs-Varianten — EIN Regelwerk, nicht drei

Alle drei sind Werte von `joker.modus`. Bewusst kein zweites Regelwerk: ein
paralleler Wertungsweg wäre eine zweite Wahrheit über dieselbe Frage
(`design/wettmodus.md` 2).

| Modus | Wie gewichtet wird | Zustand |
|---|---|---|
| `einzel` | Der Tipper markiert EIN Spiel als Joker → fester Faktor | ✅ gebaut |
| `ranking` | Jedes Spiel bekommt ein Gewicht aus einem Pool; **jeder Pool-Wert nur einmal je Spieltag** | ✅ gebaut |
| `einsatz` | Festes Münz-Budget je Spieltag, frei auf die Spiele verteilt | ✅ gebaut |

**Die Quoten-Wertung liegt darunter und ist nie abschaltbar.** „Punkte in
Abhängigkeit der Quoten" ist keine Variante, sondern das Fundament; die drei
Modi bestimmen nur, wie stark ein einzelnes Spiel in die Wertung eingeht.

🔴 **Die tragende Regel des Einsatz-Modus:** man setzt Münzen, man gewinnt
**Punkte** — nie neue Münzen. Ohne diese Trennung gäbe es Zinseszins: wer früh
gewinnt, hätte mehr zu setzen, und nach zehn Spieltagen entscheidet der Start
die Saison. Deshalb ist der Vorrat jede Woche derselbe, und deshalb verfällt,
was nicht verteilt wurde.

## 2. Was in Stufe 1 als fertige Runden-Idee angeboten wird

`src/lib/charaktere.js` — fünf Kacheln, jede mit Kurztext und Zielgruppe:

| Kachel | Kern | Modus |
|---|---|---|
| 🎯 Klassisch & fair | jedes Spiel zählt gleich | `einzel` |
| 🔥 Mutig & wild | Außenseiter zahlen sich stark aus | `einzel` |
| 🧠 Kenner-Runde | Gewichte verteilen statt einen Joker setzen | `ranking` |
| 🪙 **Wettbüro** | **festes Münz-Budget je Spieltag** | `einsatz` |
| 🌤️ Nur nebenbei | keine Joker, milde Wertung, Kulanz | — |

## 3. Was daneben existiert — eigene Bildschirme, nicht in der Spielerstellung

| Was | Route | erreichbar über |
|---|---|---|
| Drehrad (vom Admin gebaute Zufalls-Ereignisse) | `/rad` | Runden-Hub |
| Joker-Inventar / Gehäuse | `/joker` | Runden-Hub |
| Freigaben (was Mitspieler dürfen) | `/freigaben` | Runden-Hub |
| Regel-Abstimmung & Verfassung | `/abstimmung` | Runden-Hub |
| Regelwerk zum Nachlesen | `/regeln` | Runden-Hub |
| Saison-Wetten | `/saison` | Runden-Hub |

## 4. Gebaut, aber praktisch unsichtbar

Diese Bildschirme existieren und haben **keinen oder genau einen** eingehenden
Verweis in der gesamten App:

```
/profil        0 Verweise   — von nirgends erreichbar
/abrechnung    1            /explorer   1
/fahrplan      2            /historie   1
/farben        1            /spott      1
/benachrichtigungen  2
```

🔴 **Das ist der Hauptgrund für „ich sehe davon nichts".** Nicht fehlende
Funktionen — fehlende Wege dorthin. Wer die App auf dem Handy öffnet, landet im
Menü, und das Menü führt zu `/tutorial`, `/datenschutz`, `/impressum`,
`/konto`. Alles andere hängt am Runden-Hub oder an gar nichts.

## 5. Der zweite Grund: die Stufen

Die Spielerstellung startet in **Stufe 1 („einfach")**. Dort gibt es nur die
fünf Kacheln aus Abschnitt 2 — keine Einzelregler. Stufe 2 („anpassen") zeigt
vier große Fragen, Stufe 3 („profi") die Rohregler, Leitplanken,
Limitierungsklassen und die Mitbestimmung.

Der Wettmodus war früher **nur** in Stufe 3 erreichbar; die Kachel „Wettbüro"
wurde genau deshalb nachgetragen (Kommentar in `charaktere.js`): wer die
einfachste Stufe benutzt, hätte von einer ganzen Spielart nie erfahren.
**Dieselbe Prüfung steht für alles andere noch aus.**

## 6. Woran als Nächstes zu denken ist

Nicht bauen — erst entscheiden. Die offenen Fragen, die dieser Bestand
aufwirft:

1. Ist „Variante" überhaupt ein Preset, oder die **erste Frage** der
   Spielerstellung („Wie wird gewichtet?") vor allem anderen?
2. Was gehört in die Spielerstellung und was in den Runden-Hub? Aktuell
   entscheidet das die Entstehungsgeschichte, nicht ein Gedanke.
3. Welche der acht unsichtbaren Bildschirme sollen bleiben — und wo hängen sie
   dann dran?
