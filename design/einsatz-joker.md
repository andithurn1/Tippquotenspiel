# Variabler Einsatz (L2) — Budget, Mindest- und Höchsteinsatz, Planung

**Spec.** Account 2 (Andre), 2026-08-03, nach Vorgabe des Nutzers.
Löst den Absatz „⭐ L2" in `design/joker-inventar.md` 4.5 ab und erweitert ihn.
Die Logik-Grundlage liegt seit `7ee20b9` auf `main`.

> **Der Wunsch:** Nicht nur „verteile ein Budget", sondern ein einstellbarer
> Rahmen darum — **Höchsteinsatz je Spiel, Mindesteinsatz je Spiel, und die
> Erlaubnis, einzelne Spiele ganz auszulassen**, um das Budget auf weniger
> Spiele zu konzentrieren. Alle Grenzen einstellbar, die ganze Ebene
> abschaltbar. Und: wenn ein Mindesteinsatz gilt, muss der Spieler beim Tippen
> **sehen, ob sein Budget noch für die offenen Spiele reicht**.

---

## 1. 🔴 Zuerst eine Korrektur: die Bezugsgröße war falsch

Die erste Fassung normierte über die Zahl der **getippten** Spiele. Gemessen,
was das anrichtet — ein Spieler setzt den Höchsteinsatz von 40 auf sein erstes
Spiel und tippt danach weiter:

| nach n Tipps | gespeicherter Faktor | Einsatz-Gegenwert |
|---:|---:|---:|
| 1 | 0,4 | 40,0 |
| 2 | 0,4 | 20,0 |
| 3 | 0,4 | 13,3 |
| 6 | 0,4 | 6,7 |

Der gespeicherte Faktor bleibt stehen, **seine Bedeutung wandert**. Damit die
40 40 bleiben, müsste der Faktor nachträglich von 0,4 auf 2,4 umgeschrieben
werden — der Wert eines bereits abgegebenen Tipps. Das ist die eine Regel, die
nicht gebrochen wird (`joker-inventar.md` 4.4, „Tipp ÄNDERN nach Anpfiff").

**Festlegung: Bezugsgröße ist die Zahl der Spiele IM SPIELTAG**, nicht die der
getippten. Sie steht fest, sobald der Spieltag offen ist, und ändert sich
danach nicht mehr.

```
neutralerEinsatz = einsatzProSpieltag / spieleImSpieltag
gewicht          = einsatz / neutralerEinsatz
```

⚠️ **Folge, und sie ist gewollt:** wer nur die Hälfte der Spiele tippt, verliert
das Budget für die andere Hälfte — es verfällt. Das ist genau die Regel „Nicht
verteilter Rest verfällt" aus `joker-inventar.md` 4.5, nur jetzt auch dann
wirksam, wenn jemand Spiele gar nicht erst antippt. Ohne diese Bezugsgröße
könnte man durch Weglassen von Spielen sein Gewicht je Spiel beliebig
hochtreiben.

⚠️ **Die Spieltagsgröße muss hereingereicht werden.** Weder `scoreTip` noch die
Prüffunktionen können sie kennen (`engine.js` sieht keine Spielpläne). Sie
kommt vom Aufrufer — dieselbe Bauart wie `schluessel` für den Runden-Spieltag.
Fehlt sie, fällt die Prüfung auf die Zahl der Tipps zurück und **meldet das**,
statt still etwas anderes zu rechnen.

---

## 2. Was der Admin einstellt

Alles unter `rules.joker`, greift nur bei `modus: "einsatz"`.

| Feld | Vorgabe | Bedeutung |
|---|---|---|
| `einsatzProSpieltag` | 100 | Was jeder je Spieltag zu verteilen hat. |
| `maxAnteilProSpiel` | 0,4 | **Höchsteinsatz** je Spiel, als Anteil am Budget. |
| `minAnteilProSpiel` | 0 | **Mindesteinsatz** je Spiel. 0 = keiner. |
| `skippenErlaubt` | `true` | Darf ein Spiel mit Einsatz 0 getippt werden? |

**Warum Anteile statt absoluter Punkte im Regelwerk, obwohl die Oberfläche
Punkte zeigt:** ein Creator-Code reist in Runden mit anderem Budget. Ein
absoluter Mindesteinsatz von 5 hieße bei Budget 100 „5 %" und bei Budget 1000
„0,5 %" — dieselbe Zahl mit völlig anderer Wirkung. Die Oberfläche rechnet
beides in Punkte um und zeigt nur die (`Höchsteinsatz 40 von 100`), weil ein
Anteil sich beim Verteilen nicht ausrechnen lässt.

### 2.1 Zwei Kombinationen, die nicht aufgehen können

Beides sind Einstellungen, die ins Leere laufen — sie müssen dem Admin
gemeldet werden, nicht stillschweigend korrigiert:

1. **`minAnteilProSpiel > maxAnteilProSpiel`** — kein zulässiger Einsatz
   existiert.
2. **`minAnteilProSpiel × spieleImSpieltag > 1`** (bei `skippenErlaubt: false`)
   — die Mindesteinsätze aller Spiele übersteigen das Budget. Bei neun Spielen
   und Mindestanteil 0,15 wären 135 % nötig. Der Spieler könnte den Spieltag
   gar nicht regelkonform tippen.

⚠️ Fall 2 hängt an der Spieltagsgröße und ist deshalb **keine reine
Regelwerks-Prüfung** — er kann erst gemeldet werden, wenn die Größe bekannt
ist. In der Spielerstellung wird mit einer typischen Größe gerechnet und das
ausdrücklich dazugesagt; verbindlich prüft ihn die Tippabgabe.

---

## 3. Die Planung beim Tippen — der eigentliche Auftrag

Sobald ein Mindesteinsatz gilt, ist Verteilen keine freie Wahl mehr, sondern
eine **Deckungsrechnung**: wer früh zu viel setzt, kann die Mindesteinsätze der
übrigen Spiele nicht mehr bezahlen. Der Spieler darf das nicht erst merken,
wenn er beim letzten Spiel ankommt.

```
einsatzPlanung({ tips, spieleImSpieltag, rules, aktuellesSpiel }) -> {
  budget,            // einsatzProSpieltag
  neutralerEinsatz,  // budget / spieleImSpieltag
  verteilt,          // Summe der bereits gesetzten Einsätze
  frei,              // budget - verteilt
  offeneSpiele,      // Spiele des Spieltags ohne Tipp
  minJeSpiel,        // minAnteilProSpiel * budget
  maxJeSpiel,        // maxAnteilProSpiel * budget
  noetigFuerOffene,  // was die offenen Spiele mindestens noch kosten
  fehlbetrag,        // > 0, wenn frei dafür nicht reicht
  maxJetztSetzbar,   // ⭐ was auf DIESES Spiel höchstens gehen darf
}
```

🔴 **`maxJetztSetzbar` ist der Kern.** Eine Warnung sagt „das geht nicht mehr"
und lässt den Spieler rätseln, was denn ginge. Diese Zahl macht die Regel
bedienbar:

```
maxJetztSetzbar = min(
  maxJeSpiel,
  frei − (Mindesteinsätze der ÜBRIGEN offenen Spiele)
)
```

⚠️ „übrige" heißt: ohne das gerade bearbeitete Spiel — sonst zöge man dessen
eigenen Mindesteinsatz doppelt ab und der Spieler könnte nie das Maximum
setzen.

⚠️ Bei `skippenErlaubt: true` ist `noetigFuerOffene` **0** — man darf jedes
weitere Spiel auslassen, also muss für nichts vorgehalten werden. Der
Mindesteinsatz gilt dann nur für Spiele, auf die man überhaupt etwas setzt
(„entweder gar nicht, oder mindestens so viel"). Das ist die
Poker-Blind-Lesart, die der Nutzer gemeint hat, und der Unterschied zwischen
den beiden Schaltern ist genau dieser.

### 3.1 🔴 Die Einheit heißt MÜNZEN — aber es sind nicht die Shop-Münzen

Sprachregelung aus `joker-ausloeser.md` Abschnitt 0: sichtbare Texte sagen
**Münzen**, nie „Budget". Das gilt auch hier — der Spieler soll nicht zwei
Währungsbegriffe lernen müssen.

⚠️ **Und genau deshalb muss die Abgrenzung im Text stehen.** Es gibt zwei
Töpfe, und sie haben nichts miteinander zu tun:

| | Shop-Münzen (`rules.budget`, `jokerBudget.js`) | Einsatz-Münzen (hier) |
|---|---|---|
| Woher | über die Saison verdient (fünf Quellen) | jeden Spieltag neu, für alle gleich |
| Wofür | Joker **kaufen** | einzelne Spiele **gewichten** |
| Rest | verfällt nach `budget.verfall` | verfällt am Spieltagsende, immer |
| Sichtbar | Kontostand über die Saison | „von 100 an diesem Spieltag" |

Wer sie zusammenlegt, kann seine Saison-Ersparnisse in einen einzigen Spieltag
kippen — das wäre die Schluss-Salve, die Abschnitt 4 ausschließt. **Sie bleiben
getrennt.** Die Oberfläche sagt darum immer *„Münzen für diesen Spieltag"* und
nie nur „Münzen", und dieselbe Vorsicht gilt wie bei `verfall` in
`joker-grundform.md` 2.3: zwei ähnliche Begriffe nebeneinander müssen beide
sagen, welcher gemeint ist — sonst sucht jemand den Fehler im falschen Regler.

### 3.2 Was die Tippabgabe zeigt

Nur, wenn ein Mindesteinsatz gilt oder die Münzen knapp werden — sonst ist es
eine leere Fläche:

- **„73 von 100 Münzen verteilt"** samt Balken.
- **„Noch 4 Spiele offen, dafür brauchst du mindestens 20 Münzen."**
- **„Auf dieses Spiel kannst du höchstens 7 Münzen setzen."**
  (`maxJetztSetzbar`)
- Bei Unterdeckung ein Satz, der die Korrektur nennt — nicht nur den Fehler:
  *„Dir fehlen 12 Münzen. Nimm auf einem anderen Spiel zurück oder lass eines
  aus."* (den zweiten Halbsatz nur, wenn Skippen erlaubt ist).

⚠️ **Kein Blockieren, solange es reparabel ist.** Der Spieler darf sich
vorübergehend verrennen; gesperrt wird erst das Absenden eines Spieltags, der
die Regel bricht — und auch dort mit der Zahl, die fehlt.

---

## 4. Was NICHT gebaut wird

| Idee | Warum nicht |
|---|---|
| Budget in den nächsten Spieltag mitnehmen | Erzeugt die Schluss-Salve. Steht schon so in `joker-inventar.md` 4.5. |
| Einsatz nach Anpfiff ändern | Bricht die Snapshot-Kante. |
| Automatisches Nachjustieren fremder Einsätze, damit es aufgeht | Änderte abgegebene Tipps. Die Planung zeigt, sie rechnet nicht um. |
| Mindesteinsatz als absolute Punktzahl im Regelwerk | Siehe Abschnitt 2 — reist nicht mit dem Creator-Code. |

## 5. Reihenfolge

1. Bezugsgröße korrigieren (`spieleImSpieltag` hereinreichen) — **zuerst**,
   alles Weitere hängt daran.
2. `minAnteilProSpiel` + `skippenErlaubt` ins Regelwerk, `konflikte()` für 2.1.
3. `einsatzPlanung()`.
4. Spielerstellung: Modus wählbar, vier Regler, Konflikt-Hinweis.
5. Tippabgabe: Einsatz setzen + die Planungs-Anzeige aus 3.1.
6. Im Browser gegensehen.
