# Zwei Währungen — Narren und Münzen

**Spec.** Account 2 (Andre), 2026-08-03, nach Vorgabe des Nutzers.
**Löst die Sprachregelung in `joker-ausloeser.md` Abschnitt 0 ab.**

> **Die Entscheidung:** Es gibt zwei Töpfe, und sie bekommen jetzt zwei Namen.
> **Narren** für den Shop (Joker kaufen), **Münzen** für Wetteinsätze.
> Beide müssen dem Spieler angezeigt werden — beim Tippen und im Schnellmenü,
> auch wenn er mehrere Tippspiele parallel hat.

---

## 1. Warum es zwei sein müssen

Bis heute hieß beides „Münzen". Das war schon in `einsatz-joker.md` 3.1 als
Falle notiert: wer die Töpfe zusammenlegt, kann seine Saison-Ersparnisse in
einen einzigen Spieltag kippen — die Schluss-Salve, die ausgeschlossen ist.

| | 🃏 **Narren** | 🪙 **Münzen** |
|---|---|---|
| Code | `rules.budget`, `jokerBudget.js` | `rules.joker.einsatzProSpieltag` |
| Woher | über die Saison **verdient**, fünf Quellen | jeden **Spieltag neu**, für alle gleich |
| Wofür | Joker **kaufen** (Shop) | einzelne Spiele **gewichten** |
| Rest | verfällt nach `budget.verfall` | verfällt **immer** am Spieltagsende |
| Anzeige | ein Kontostand über die Saison | „73 von 100 an diesem Spieltag" |

⚠️ **Die Code-Bezeichner bleiben wie sie sind.** `budget` heißt weiter `budget`
— ein Rename über sieben Module wäre Bewegung ohne Gewinn. Geändert wird
ausschließlich, was der Spieler LIEST. Dieselbe Trennung wie bisher zwischen
`budget` im Code und „Münzen" im Text, nur mit dem richtigen Wort.

## 2. Die Sprachregel (ersetzt `joker-ausloeser.md` 0)

| Wo | Wort |
|---|---|
| Shop, Preise, `budget.quellen`, `budget.verfall`, Drehrad-Feld `budget` | **Narren** |
| Einsatz je Spiel, `einsatzProSpieltag`, Mindest-/Höchsteinsatz, Planung | **Münzen** |
| überall | **nie** „Budget" |

🔴 **`uiTexte.test.js` muss das erzwingen** — und zwar in beide Richtungen,
sonst laufen die Kataloge wieder auseinander:

- Texte aus den **Shop-Katalogen** (`BUDGET_QUELLEN`, `TAKTE`,
  `VERFALL_TYPEN`, `PREISMODI`) dürfen „Münzen" **nicht** enthalten.
- Kein sichtbarer Text enthält „Budget" (Regel bleibt).

⚠️ Der Wächter prüft weiterhin nur KATALOGE, nicht die daraus gebauten Sätze —
dort ist „Budget" schon zweimal durchgerutscht. Die zusammengesetzten Texte in
`beschreibeBudget`, `beschreibeDrehrad` und den Komponenten muss man von Hand
durchsehen.

## 3. Wo der Spieler sie sieht

Drei Orte, alle vom Nutzer benannt:

### 3.1 Tippabgabe / Tippübersicht
Die **Münzen** dieses Spieltags, samt Planung aus `einsatz-joker.md` 3.2
(„73 von 100 verteilt", „höchstens 7 auf dieses Spiel"). Die **Narren** als
Kontostand daneben, weil man beim Tippen entscheidet, ob man einen Joker
einsetzt.

### 3.2 Runden-Hub (`RundenHub.jsx`)
Beide Stände als Kopfzeile der aktiven Runde.

### 3.3 🔴 Schnellmenü (`Hauptmenu.jsx`) — je Runde
Die Rundenliste zeigt heute Name und Tipp-Stand. Dazu kommen beide Währungen
**pro Runde**, denn sie sind rundengebunden: wer in drei Tippspielen ist, hat
drei getrennte Stände. Ohne diese Zahl muss man jede Runde einzeln betreten,
um zu sehen, wo man noch etwas zu vergeben hat — genau das wollte der Nutzer
abkürzen.

⚠️ Das ist eine Liste; die Zahlen dürfen sie nicht überfrachten. Nur die
beiden Stände, kompakt, ohne Planungs-Text.

## 4. 🔴 Was NICHT angezeigt wird: eine Zahl, die es nicht gibt

`design/kontaktstellen.md` hält fest, dass `kannBezahlen` und `budgetVerlauf`
**null Aufrufer im Spielbetrieb** haben. Es gibt heute also keinen echten
Narren-Kontostand — nur ein Regelwerk, das beschreibt, wie er entstünde.

**Festlegung:** Eine Währung wird nur angezeigt, wenn ihr Stand aus echten
Daten stammt.

- **Münzen** sind heute schon echt: sie folgen aus dem Spieltag und den
  abgegebenen Tipps (`einsatzPlanung`). Anzeigen, sobald
  `joker.modus === "einsatz"`.
- **Narren** erst, wenn `budget.enabled` **und** die Verkabelung aus
  `kontaktstellen.md` steht. Bis dahin **gar nichts** anzeigen — kein „0", kein
  Platzhalter.

Eine erfundene Null ist schlimmer als eine leere Fläche: sie sieht aus wie eine
Auskunft und ist keine. Dieselbe Zurückhaltung wie bei den
Community-Rückläufern (`joker-oekonomie.md` 3.1b) und bei den nicht
auswertbaren Saison-Wetten, die ehrlich als „nicht aktivierbar" markiert sind.

## 5. Reihenfolge

1. Umbenennung der sichtbaren Texte + `uiTexte`-Wächter in beide Richtungen.
2. Eine Anzeige-Komponente, EINE Stelle für beide Währungen.
3. Einbau an den drei Orten aus Abschnitt 3.
4. Im Browser gegensehen — vor allem das Schnellmenü mit mehreren Runden.
