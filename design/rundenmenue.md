# Das Runden-Menü — und die eine Entscheidung, die davor liegt

**Angelegt 27.08.2026** auf zwei Ansagen von Andi: *„beschreib nochmal genau
das problem wo ich mich entscheiden muss"* und die Beschreibung eines
Untermenüs je Tipprunde.

---

# TEIL 1 · Die Entscheidung: wo landet eine ausgeübte Wahl?

## Das Problem in einem Satz

Der Sieger wählt etwas aus — **wohin schreiben wir das?**

## Warum das überhaupt eine Frage ist

Die Wertung liest ein Regelwerk, das je Runde UND je Spieltag gilt
(`getRegelnFuer`). Eine ausgeübte Wahl ist genau das: **eine Regeländerung für
einen Spieltag, in einer Runde.**

Für Regeländerungen gibt es in diesem Projekt schon eine Maschinerie — Anträge
mit Abstimmung (`beschluss.js`, `regelAbstimmung.js`, Tabelle `antraege`). Sie
passt fast, aber eben nur fast:

| | Antrag | Ausgeübtes Recht |
|---|---|---|
| Wer stellt ihn? | jeder, der darf | nur der Rechteinhaber |
| Wird abgestimmt? | **ja** | **nein** — das Recht IST die Berechtigung |
| Kann er scheitern? | ja | nein |
| Gilt ab | dem beschlossenen Spieltag | dem nächsten Spieltag |

**Die Frage ist also:** biegen wir die vorhandene Maschinerie so hin, dass sie
beides kann — oder bekommt das Recht seinen eigenen kleinen Weg?

## Die drei Wege, mit Preis

### A · Antrag ohne Abstimmung

Ein ausgeübtes Recht wird als Antrag gespeichert, der sofort auf „angenommen"
steht.

- ✅ **Kein neuer Speicher, keine Schema-Änderung.** Tabelle, Store-Methoden
  und die Auswertung über `regelwerkAmSpieltag` gibt es alle schon.
- ✅ Die Historie steht automatisch da: man sieht, wer wann was geändert hat.
- ⛔ **Der Preis:** „Antrag" heißt ab dann zwei verschiedene Dinge. Jede
  Prüfung, jeder Bildschirm und jede spätere Regel muss unterscheiden, ob ein
  Antrag zur Abstimmung steht oder ein ausgeübtes Recht ist. Genau die Sorte
  Vermischung, aus der in diesem Projekt die teuersten Fehler kamen.
- ⚠️ Und eine praktische Kante: die Abstimmungs-Oberfläche würde diese
  „Anträge" mit auflisten, wenn niemand daran denkt, sie herauszufiltern.

### B · Eigene Tabelle `rechte_ausgeuebt`

`{ round_id, matchday, user_id, angebot_key, wert }` — eine Zeile je Ausübung.

- ✅ **Sauber getrennt.** Ein Recht ist ein Recht, ein Antrag ist ein Antrag.
- ✅ Die Wertung liest sie zusätzlich zu den Beschlüssen — eine Stelle mehr,
  aber eine klar benannte.
- ✅ Wächst mit: ein zweites, drittes Recht braucht keine neue Tabelle.
- ⛔ **Der Preis:** Schema-Änderung (Tabelle + RLS-Policies), zwei
  Store-Methoden in BEIDEN Stores, und `getRegelnFuer` muss die Zeilen
  einrechnen. Ein halber Tag, kein Nachmittag.
- ⚠️ Und die RLS will bedacht sein: **schreiben darf nur, wer das Recht auch
  hält.** Das ist eine Prüfung, die der Server machen muss — im Browser wäre
  sie eine Bitte.

### C · Ins Regelwerk der Runde schreiben

Die Wahl landet direkt in `rounds.rules` (etwa `bigGame.festesSpiel`).

- ✅ **Am wenigsten Aufwand von allen.** Die Wertung liest es, ohne dass
  irgendwo etwas dazukommt.
- ⛔ **Der Preis, und er ist der härteste:** das Regelwerk hat kein Gedächtnis.
  Schreibt Spieltag 6 das Topspiel hinein, steht es an Spieltag 7 immer noch
  da — es sei denn, jemand löscht es. **Und rückwirkend ändert es die
  Vergangenheit:** ein Tipp aus Spieltag 5 würde plötzlich unter einem
  Regelwerk gewertet, das es damals nicht gab. Das ist dieselbe Falle wie eine
  nachträglich veränderte Quote.
- ⚠️ Reparierbar nur, indem man den Spieltag mit hineinschreibt — und dann hat
  man Weg B gebaut, nur schlechter.

## 🔴 Meine Empfehlung: B

**Weil das Regelwerk kein Gedächtnis hat und ein Antrag keine Abstimmung
überspringen sollte.** B kostet einen halben Tag und ist danach für jedes
weitere Recht kostenlos. A ist heute billiger und wird bei jedem neuen
Bildschirm ein bisschen teurer. C ist ein Fehler, der erst in Woche drei
auffällt.

⚠️ **Es ist trotzdem deine Entscheidung** — vor allem, weil A schneller zu
einem sichtbaren Ergebnis führt, und für den Testbetrieb mit Freunden zählt
das womöglich mehr als die saubere Trennung.

---

# TEIL 2 · Das Runden-Menü, das Andi beschrieben hat

*„ich hätt jetz eh gedacht dass es bei jeder Tipprunde ein Untermenü gibt wo
einmal die Rangliste steht … und hier sehen wir ne Übersicht über die
Ereignisse und angewendeten Joker bzw. wann die auch geresettet werden genauso
wie einen Eintrag für die Auslösung (mittels Glücksrad) für die Ereignisse."*

## Was es davon schon gibt

| Sein Punkt | Stand |
|---|---|
| Rangliste | ✅ `/ranking` |
| „Was wäre ohne Joker / Ereignisse / Wettbewerbs-Gewichte" | ✅ **seit 27.08.2026** in `/historie` (`vergleichsansicht.js`) |
| Glücksrad, das etwas ausschüttet | ✅ `/rad` — Niete · Joker · Narren · Modifikator · Punkte |
| Meine Joker | ✅ `/joker` — aber **nur die eigenen** |
| Verlauf, Rekorde, Saison | ✅ `/historie`, `/saison` |

## Was FEHLT — vier Dinge, in der Reihenfolge ihres Werts

### 1 · Die Runden-Übersicht „wer hat was, und wann fällt es weg"

Heute sieht jeder nur SEINE Joker. Was fehlt, ist die Tabelle über die ganze
Runde: wer hält welche Joker, welche Ereignisse sind gelaufen, **und wann
verfällt was.**

⚠️ Die Daten liegen alle vor (`erspielteJoker`, `wirkungsVorgaenge`,
`jokerBasis.verfall`) — es fehlt die eine Ansicht, die sie zusammenbringt.
🔴 Und das „wann wird zurückgesetzt" ist der Teil, den heute NIRGENDS jemand
sieht: die Regel steht im Regelwerk, das Datum nirgends.

### 2 · Das Rad soll Ereignisse auslösen können

Heute schüttet es fünf Dinge aus (Niete, Joker, Narren, Modifikator, Punkte).
Ein Rad-Feld, das ein EREIGNIS auslöst, gibt es nicht — dabei ist das Rad die
natürliche Ziehung dafür.

⚠️ Die Verbindung wäre klein: `BELOHNUNGS_TYPEN` bekommt `ereignis`, und das
gezogene Feld liefert eine Wirkung wie jede andere. Beide Kataloge stehen.

### 3 · Zwei Wirkungen, die es noch nicht gibt

Andis Beispiele, und beide sind ehrliche Lücken:

- **„Joker-Cooldowns zurücksetzen"** — `jokerBasis` kennt Sperrfristen, aber
  niemand kann sie aufheben.
- **„Budget zurücksetzen"** — `jokerBudget` kennt Konten, aber keinen Reset.

🔴 Beide sind aus demselben Holz: eine Wirkung, die einen ZUSTAND
zurücksetzt, statt etwas zu vergeben. Die gibt es im ganzen Katalog noch
nicht — alle heutigen Wirkungen geben oder nehmen, keine setzt zurück.

### 4 · Das Menü selbst

Vier Routen, die es einzeln gibt, brauchen eine Klammer: eine Seite je Runde,
von der aus alles erreichbar ist. ⚠️ Das ist der billigste Punkt der vier —
und der, der ohne die anderen drei am wenigsten bringt.
