# Der Wett-Spielmodus — Münzen setzen, Punkte gewinnen

**Spec.** Account 2 (Andre), 2026-08-03, nach Vorgabe des Nutzers.
Erweitert `design/einsatz-joker.md` um die Frage, die dort offen blieb:
**woher die Münzen kommen und wohin die Gewinne gehen.**

> **Die Vorgabe:** *„Jeder kriegt regelmäßig (einstellbar) fiktives Geld — aber
> das Erwirtschaftete kann nicht weiter verwettet werden, es wird als Punkte
> ausgezählt und fürs Ranking gegeben."*

---

## 1. 🔴 Der Satz, auf den es ankommt

**Gewinne fließen nicht zurück in den Einsatz-Topf.** Man setzt Münzen, man
gewinnt Punkte. Zwei getrennte Größen.

Das ist keine Kleinigkeit, sondern die Regel, die den ganzen Modus tragfähig
macht:

- **Ohne sie gäbe es Zinseszins.** Wer früh gewinnt, hätte mehr zu setzen,
  gewänne dadurch mehr, hätte noch mehr zu setzen. Nach zehn Spieltagen
  entscheidet der Start die Saison, und Aufholen ist rechnerisch unmöglich.
  Genau davor schützt auch `catchup.js`, nur an anderer Stelle.
- **Sie hält den Einsatz vergleichbar.** Alle haben an jedem Spieltag dieselbe
  Menge Münzen. Was jemanden auszeichnet, ist die VERTEILUNG — nicht, wie viel
  er hat. Damit misst der Modus Urteilsvermögen, nicht Vorsprung.
- **Sie ist der Grund, warum die Münzen verfallen.** „Nicht verteilter Rest
  verfällt" (`einsatz-joker.md`) wäre sonst willkürlich; so ist es dieselbe
  Aussage: Münzen sind ein Spieltags-Werkzeug, kein Vermögen.

⚠️ **Damit ist auch klar, warum Narren und Münzen getrennt bleiben**
(`waehrungen.md`): Narren SIND ein Vermögen über die Saison. Würden Gewinne
Münzen erzeugen, hätte man zwei Vermögen und die Trennung wäre sinnlos.

## 2. Die zwei Spielmodi

Der Wettmodus tritt **neben** das bisherige Spiel, er ersetzt es nicht.

| | **Klassisch** (heute) | **Wettmodus** (neu) |
|---|---|---|
| Grundregel | jedes Spiel zählt gleich | jedes Spiel zählt so viel, wie man setzt |
| Gewichtung | über Presets des Admins (Joker, Team-Faktoren, Big Game …) | über den eigenen Einsatz je Spiel |
| Was man verwaltet | einen Joker je Spieltag | ein Münz-Kontingent je Spieltag |
| Code | `joker.modus` `einzel` / `ranking` | `joker.modus: "einsatz"` |

Beide sind Ausprägungen desselben `joker.modus` — **kein zweites Regelwerk.**
Das ist Absicht: ein paralleler Wertungsweg wäre eine zweite Wahrheit über
dieselbe Frage, und die Aspekte in `presetMerge.js` könnten ihn nicht mehr
zusammenhalten.

## 3. Woher die Münzen kommen

```js
joker: {
  modus: "einsatz",
  einsatzProSpieltag: 100,   // vorhanden
  maxAnteilProSpiel: 0.4,    // vorhanden
  minAnteilProSpiel: 0,      // vorhanden
  skippenErlaubt: true,      // vorhanden
  einsatzTakt: "spieltag",   // NEU: wie oft es Münzen gibt
  einsatzTaktN: 1,           // NEU: bei "jeder N-te" der Abstand
}
```

`einsatzTakt`: `spieltag` (Vorgabe) · `jederNte` · `woche` · `saisonstart`.

⚠️ **Den Katalog nicht neu erfinden.** `jokerBudget.js` führt bereits `TAKTE`
für die Narren-Zuteilung. Derselbe Katalog, dieselben Wörter — sonst stehen
zwei Taktbegriffe nebeneinander, die dasselbe meinen. Wenn ein Wert dort fehlt,
gehört er dort ergänzt, nicht hier dupliziert.

⚠️ **`saisonstart` ist der einzige Takt, bei dem Münzen NICHT verfallen dürfen**
— sonst gäbe es sie einmal und danach nie wieder. Dieser Fall widerspricht
Abschnitt 1 (kein Vermögen) und ist deshalb **bewusst ausgenommen und im Text
zu benennen**: er macht aus dem Wettmodus ein Saison-Budget, ein anderes Spiel.
Wenn er gebaut wird, dann als ausdrückliche Wahl mit Warnhinweis, nicht als
stiller Nebenfall.

## 4. Wohin die Gewinne gehen

Nirgendwohin Neues — **in die normale Wertung.** Der Einsatz ist bereits ein
Faktor auf die fertige Spielwertung (`einsatz-joker.md` 1), und die Punkte
laufen wie immer über `scoreTip` → Verlauf → Ranking.

Es entsteht also **kein neuer Punkte-Kanal**, dieselbe Regel wie bei
`ereignisse.js`. Der Wettmodus verschiebt Gewicht zwischen Spielen; er erzeugt
keines. Das ist die Normierung auf Mittelwert 1, und sie ist der Grund, warum
`displayScale` nicht mitwandern muss.

## 5. Was noch zu entscheiden ist

Bewusst offen gelassen, weil der Nutzer es noch nicht gesagt hat:

- **Zeigt die Oberfläche einen Münz-„Gewinn"?** Streng genommen gewinnt man
  keine Münzen, sondern Punkte. Ein „+340" am Spiel wäre also die Punkte —
  aber die Wett-Metapher legt eine Auszahlung nahe. Beides ehrlich darstellbar,
  aber es muss EINE Sprache sein.
- **Sieht man fremde Einsätze?** `jokerBasis.sicht` regelt das bereits für
  Joker (`sofort` · `nachAnpfiff` · `nachAuswertung`). Der Einsatz sollte
  denselben Regler benutzen und keinen eigenen.
- **Was bei Versäumnis?** `joker-grundform.md` 5.0 sagt „kein Joker ohne Tipp".
  Für den Einsatz heißt das: nicht getippt = nicht gesetzt = Münzen verfallen.
  Das folgt schon aus der Invariante, sollte aber im Text stehen, damit es
  niemand für einen Fehler hält.
