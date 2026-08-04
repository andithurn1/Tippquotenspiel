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

## 3. Woher die Münzen kommen ✅ GEBAUT (04.08.2026)

```js
joker: {
  modus: "einsatz",
  einsatzProSpieltag: 100,   // vorhanden
  maxAnteilProSpiel: 0.4,    // vorhanden
  minAnteilProSpiel: 0,      // vorhanden
  skippenErlaubt: true,      // vorhanden
  einsatzTakt: "spieltag",   // wie oft es Münzen gibt
  einsatzTaktN: 4,           // bei "alle N Spieltage" der Abstand
  einsatzFenster: { … },     // nur bei "phase" — Form wie `rules.duell`
}
```

Liegt in `src/lib/muenzTakt.js`. **Der Katalog wurde nicht neu erfunden**:
`einsatzTakt` nimmt `TAKTE` aus `jokerBudget.js`, die Perioden-Rechnung
`perioden()` von dort, das Saison-Fenster `sanitizeDuellJoker`/`fensterVon`
aus `duellJoker.js`. Die vier Werte des Entwurfs oben lösen sich damit auf:
`jederNte` = `alleNSpieltage`, `saisonstart` = `saison` (ein Zeitraum über die
ganze Saison zahlt genau einmal, zu Beginn). `woche` gibt es bewusst NICHT —
die Zeitachse (`zeitachse.js`) kennt bereits einen Wochen-Modus, ein zweiter
Wochenbegriff daneben wäre genau die Doppelung, die dieser Abschnitt verbietet.

### Wie es gebaut ist: eine SCHLÜSSEL-Funktion, kein zweites Datenmodell

`einsatzPlanung`, `invalidEinsatzMatchdays` und `einsatzUsageForMatchday`
gruppieren bereits über eine übergebene `schluessel`-Funktion — dieselbe
Bauart, mit der `rundenSchluessel` in `zeitachse.js` den Liga-Spieltag durch
den Runden-Spieltag ersetzt. `muenzSchluessel(...)` ist die Ebene darüber: er
fasst mehrere Runden-Spieltage zu EINER Münz-Periode zusammen. Budget,
Höchsteinsatz und Deckungsrechnung gelten dadurch automatisch für die Periode,
**ohne dass die Einsatz-Logik angefasst wurde**. Beim Vorgabe-Takt gibt er die
übergebene Funktion unverändert zurück — kein stiller Regelwechsel.

⚠️ **`saison` widerspricht Abschnitt 1 und ist deshalb eine ausdrückliche
Wahl**: einmal Münzen und danach nie wieder macht sie zum Vermögen. Umgesetzt
als Warnung in `muenzTaktKonflikte` UND in der Live-Vorschau, nicht als
stiller Nebenfall.

⚠️ **`phase` schaltet den Wettmodus außerhalb des Fensters ab.** Das ist eine
eigene Aussage (`aktiv: false` samt Grund), kein `null`: die Runde kennt
Münzen sehr wohl, nur an diesem Spieltag gibt es keine. Die Oberfläche sagt
das hin — sonst fiele die Anzeige bis zum Joker-Knopf durch und böte einen
Joker an, den der Modus gar nicht kennt.

🔴 **`TAKTE` ist jetzt DOPPELT genutzt** (Narren-Zuteilung + Münz-Takt), und
`uiTexte.test.js` verbietet in diesem Katalog das Wort „Münzen" (Zwei-Währungen-
Regel). Beides zusammen heißt: **Takt-Beschriftungen müssen währungsneutral
bleiben** („Alle N Spieltage", nicht „Alle N Spieltage neue Münzen"). Wer dort
eine Währung hineinschreibt, bricht entweder den Test oder den anderen Aufrufer.

### Wo er in den drei Komplexitätsstufen steht

Beim Bauen fiel auf, dass der **Wettmodus selbst** in Stufe 1 und 2 gar nicht
vorkam — er war nur über die Profi-Ansicht erreichbar und damit nach dem
Baukasten-Grundsatz nicht fertig. Behoben:

- **Stufe 1:** Charakter „Wettbüro" (`charaktere.js`) — setzt den Takt
  sinnvoll mit, ohne ihn zu zeigen.
- **Stufe 2:** zwei Stufen an der Frage „Zählt jedes Spiel gleich viel?" —
  „Münzen setzen" (jeden Spieltag) und „Münzen auf Vorrat" (alle vier). Damit
  ist der Takt auch hier eine Klartext-Wahl.
- **Stufe 3:** Takt-Karten, Zahlenfeld, Saison-Fenster, Live-Vorschau.

### Was beim Verkabeln aufgefallen ist

- Die Konflikt-Prüfung maß gegen die Spiele EINES Spieltags. Richtig ist die
  Zahl der Spiele, die sich EIN Budget teilen — bei „alle 4 Spieltage" also
  die vierfache. Vorher wäre ein echter Konflikt nicht gemeldet worden.
- Danach log der Warntext: „Bei 36 Spielen **im Spieltag**". Die Zahl stimmte,
  der Satz behauptete einen einzelnen Spieltag. `einsatzKonflikte` nimmt jetzt
  die Zeitraum-Länge entgegen — ausschließlich für den Wortlaut.
- Die Live-Vorschau schrieb „im Schnitt 33.3 je Spieltag" — englischer
  Dezimalpunkt in deutschem Text. Ein Test auf „enthält die Zahl" kann das
  nicht sehen; er läuft jetzt über `zahl()`.

### Was noch offen ist

- **Verfall bei mehrspieltägigen Takten ist nicht modelliert.** Heute gilt:
  was in einer Periode nicht verteilt wird, verfällt mit ihrem Ende. Ein
  Ansparen über Perioden hinweg (wie `verfall: "deckel"` bei den Narren) gibt
  es für Münzen bewusst NICHT — es wäre genau das Vermögen aus Abschnitt 1.
  Sollte es je gewollt sein, gehört es hierher und nicht in `jokerBudget.js`.

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
