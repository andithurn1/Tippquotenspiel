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

## ✅ ENTSCHIEDEN: B (Andi, 27.08.2026 — „ja b")

**Gebaut und angeschlossen.** Tabelle `rechte_ausgeuebt` in `schema.sql`,
`src/lib/rechteAusuebung.js` (25 Tests), beide Stores, und seit dem Abend auch
die Ausübung selbst auf `/runde`.

🔴 **Der wichtigste Test ist der negative:** an JEDEM anderen Spieltag steht die
Wahl NICHT im Regelwerk. Das ist der ganze Unterschied zwischen B und C.

⚠️ **Die bekannte Grenze, ausgeschrieben in `schema.sql`:** die RLS-Policy kann
prüfen, dass der Schreiber Mitglied ist und für sich selbst schreibt — nicht,
dass er der Spieltagssieger ist. Das wäre eine Nachbildung der Wertung in SQL.
Es bleibt also ein Missbrauch möglich: jemand kommt dem Sieger zuvor. Für eine
Runde unter Freunden tragbar; wasserdicht erst mit einer
`security definer`-Funktion.

---

## Meine damalige Empfehlung: B

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

> **Stand 27.08.2026, abends:** 1, 2 und 3 sind gebaut und angeschlossen.
> Offen ist nur noch 4 (das Menü selbst) — und Andis Entscheidung zu Teil 1.

### 1 · Die Runden-Übersicht „wer hat was, und wann fällt es weg" — ✅ 27.08.2026

Heute sieht jeder nur SEINE Joker. Was fehlt, ist die Tabelle über die ganze
Runde: wer hält welche Joker, welche Ereignisse sind gelaufen, **und wann
verfällt was.**

⚠️ Die Daten liegen alle vor (`erspielteJoker`, `wirkungsVorgaenge`,
`jokerBasis.verfall`) — es fehlt die eine Ansicht, die sie zusammenbringt.
🔴 Und das „wann wird zurückgesetzt" ist der Teil, den heute NIRGENDS jemand
sieht: die Regel steht im Regelwerk, das Datum nirgends.

✅ **Gebaut:** `/runde` („Was gerade läuft") mit `src/lib/ablauf.js`. Die Datei
übersetzt die vorhandenen Regeln in einen Zeitpunkt — `jokerBasis.verfall` plus
Münz-Takt wird „Ende von Spieltag 8", `abklingzeit` wird „Einzel-Joker wieder
frei ab Spieltag 5".
⚠️ `ablauf.test.js` fesselt die Auskunft an `darfEinsetzen`: der genannte
Spieltag ist genau der erste, an dem der Torwächter wieder ja sagt. Ohne diese
Fessel stünde irgendwann ein Datum auf dem Schirm, an dem der Knopf nicht geht
— und der Spieler hielte sich für blöd, nicht die App für kaputt.

### 2 · Das Rad soll Ereignisse auslösen können — ✅ 27.08.2026

Heute schüttet es fünf Dinge aus (Niete, Joker, Narren, Modifikator, Punkte).
Ein Rad-Feld, das ein EREIGNIS auslöst, gibt es nicht — dabei ist das Rad die
natürliche Ziehung dafür.

✅ **Gebaut, aber anders als hier vermutet.** Der Plan war ein Rad-Feld
`ereignis`, das ein Ereignis aus `rules.ereignisse` auslöst. Beim Bauen von
Punkt 3 stellte sich heraus: was Andi an DIESER Stelle nennt („ein Ereignis
dass dann Joker cooldowns geresettet werden"), ist gar kein Ereignis aus dem
Katalog, sondern eine **Wirkung, die es noch nicht gab**. Das Rad schüttet sie
jetzt direkt aus — `BELOHNUNGS_TYPEN` hat `ruecksetzung`, und `/runde` zeigt
sie unter „Am Rad gezogen".

✅ **Und seit dem Abend des 27.08.2026 auch der allgemeine Fall.** Andi auf die
Rückfrage: *„klar dafür ist das Rad ja auch da? zum auslosen?"* — ein Rad-Feld
„Ereignis" löst eines der eingestellten Ereignisse aus. Das Rad ersetzt nur den
AUSLÖSER; die Wirkung kommt aus dem Ereignis.

⚠️ Die zwei Entscheidungen, die ich dafür gebraucht hätte, sind zu EINEM
sichtbaren Schalter geworden statt zu einer Annahme: *wen trifft es* steht am
Rad-Feld (Zieher oder ganze Runde), *wie lange* ist der Spieltag der Ziehung.
Die WEN-Achse des Ereignisses wird bewusst nicht benutzt — sie braucht einen
Auslöser und einen Tabellenstand, die es hier nicht gibt.

### 3 · Zwei Wirkungen, die es noch nicht gibt — ✅ 27.08.2026

Andis Beispiele, und beide sind ehrliche Lücken:

- **„Joker-Cooldowns zurücksetzen"** — `jokerBasis` kennt Sperrfristen, aber
  niemand kann sie aufheben.
- **„Budget zurücksetzen"** — `jokerBudget` kennt Konten, aber keinen Reset.

🔴 Beide sind aus demselben Holz: eine Wirkung, die einen ZUSTAND
zurücksetzt, statt etwas zu vergeben. Die gibt es im ganzen Katalog noch
nicht — alle heutigen Wirkungen geben oder nehmen, keine setzt zurück.

✅ **Gebaut: `src/lib/ruecksetzung.js`.** Und die Form ist die eigentliche
Antwort auf „wo landet ein Zustand": **nirgends.** Eine Rücksetzung ist ein
SCHNITT auf der Zeitachse — `{ userId, ziel, abSpieltag }`. Wer fragt, was ein
Spieler „bisher" getan hat, lässt alles vor dem Schnitt weg. Aus einem Zustand
wird ein Filter, und ein Filter ist aus der Historie jederzeit neu ableitbar.

⚠️ Das ist derselbe Gedanke, der in TEIL 1 zur Debatte steht — nur fällt er
hier leicht, weil eine Rücksetzung keine ENTSCHEIDUNG ist, die jemand später
nachlesen können muss. Für das ausgeübte Recht gilt das nicht, deshalb bleibt
Teil 1 offen.

Angeschlossen an beiden Enden (sonst wäre es der Befund vom 06.08.):
- Ziel `cooldown` → schneidet `letzteEinsaetze` in der Tippabgabe. Die REGEL in
  `pruefeAbklingzeit` bleibt unberührt; kürzer ist nur die Historie, die man ihr
  vorlegt. Eine Sonderregel im Torwächter wäre die doppelte Wahrheit.
- Ziel `budget` → schneidet die kumulierten Käufe in `kontoVerlauf`. Der Kauf AM
  Tag des Schnitts zählt weiter.

### 4 · Das Menü selbst — ✅ 27.08.2026

Vier Routen, die es einzeln gibt, brauchen eine Klammer: eine Seite je Runde,
von der aus alles erreichbar ist. ⚠️ Das ist der billigste Punkt der vier —
und der, der ohne die anderen drei am wenigsten bringt.

🔴 **Jetzt bringt er etwas**, weil die anderen drei stehen. Und er hängt an
Andis Ansage vom selben Tag: *„solche optionen müssen egtl hinter nem eigenen
öffnenbarem Fenster sein, weil die ganzen Einstellmöglichkeiten einen sonst
komplett erschlagen"*. Das gilt für die Spieler-Seite genauso wie für die
Admin-Seite.

⚠️ **Aber: „Mechanik ja, Platzierung nein"** (CLAUDE.md). WO die Kacheln
sitzen, entscheidet `Quotentippen.pptx`. Was hier gebaut werden darf, ist die
KLAMMER — eine Seite je Runde, die die vorhandenen Routen bündelt — nicht eine
neue Anordnung der Spielerstellung.

✅ **Gebaut, und der Befund war größer als gedacht:** die Klammer gab es längst
(`/hub`, `RundenHub.jsx`) — sie war nur selbst zu dem geworden, wogegen Andis
Ansage sich richtet. **Bis zu elf gleich aussehende Kacheln untereinander**,
sechs davon als kopierte Link-Blöcke im JSX, jede mit demselben Verlauf und
demselben Punkt noch einmal ausgeschrieben.

Jetzt drei Ebenen statt einer Liste:

| | Was | Warum dort |
|---|---|---|
| **Über allem** | Joker-Abstimmung · Regeländerungen | Aufrufe, die vergehen, wenn man sie übersieht. Nie hinter einem Klick |
| **Offen** | Tipp abgeben · Ranking · Was gerade läuft | Was man an einem normalen Spieltag tut |
| **„Deine Sachen"** | Joker · Glücksrad · Saison-Wetten | Meins, aber es eilt nicht |
| **„Die Runde"** | Fahrplan · Historie · Freigaben · Spott | Nachschlagen und verwalten |

🔴 **Der Teil, der leicht schiefgeht und deshalb einen Wächter hat**
(`rundenMenue.test.js`, 8 Tests): eine zugeklappte Gruppe **muss sagen, was in
ihr liegt** (`kurz`). Sonst klappt sie niemand auf — und aus dem Aufräumen ist
ein Verstecken geworden, also das Gegenteil des Auftrags. Der Wächter prüft
außerdem, dass jede Kachel auf eine Route zeigt, die es gibt (sonst 404, und
zwar nur für den, dessen Runde diese Ebene eingeschaltet hat), und dass `wenn`
keine Ebene nennt, die der Hub gar nicht abfragt (ein Tippfehler dort lässt die
Kachel still für alle verschwinden).

⚠️ **Aufgeklappt wird über `Feinheiten`**, nicht über eine eigene Mechanik —
acht Fassungen desselben Aufklappers sind in diesem Projekt schon einmal
entstanden, jede für sich plausibel.

⛔ **Was NICHT passiert ist:** eine neue Anordnung der Spielerstellung. Die
bleibt bei der Masterdatei.
