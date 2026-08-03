# Auslöser-Katalog — wann gibt es Joker, wann gibt es Diamanten

**Katalog.** Account 2 (Andre), 2026-07-31, aus dem Gespräch mit dem Nutzer.

⚠️ **Keine Empfehlungen in diesem Dokument.** Hier steht, welche Auslöser es
geben soll — nicht, wie stark sie sein sollen oder welche zusammenpassen. Das
entscheidet der Nutzer später, wenn das Gehäuse steht.

---

## 0. Die drei Begriffe (Sprachregelung)

⚠️ **Veraltet seit 03.08.:** Diese Tabelle ging von EINER Währung aus
(„Münzen" = `rules.budget`). Das stimmt nicht mehr — es gibt jetzt zwei Töpfe
mit zwei Namen: **Diamanten** für den Shop (`rules.budget`, weiterhin) und
**Münzen** für den Wetteinsatz je Spiel (`rules.joker.einsatzProSpieltag`,
neu). Die gültige Sprachregel steht in `design/waehrungen.md` Abschnitt 2.
Die Tabelle bleibt unten stehen, damit sichtbar ist, was sich geändert hat —
ungültig ist nur ihre erste Zeile.

| Nutzer-Begriff | im Code | was es ist |
|---|---|---|
| ~~**Münzen**~~ **Diamanten** | `rules.budget` | die Shop-Währung. Der Admin stellt ein, wie viel es wofür und für wen gibt. |
| **Jokershop** | `budget.preise` | was jede Joker-Art in DIESER Runde kostet. Der Admin setzt die Preise. |
| **Abklingzeit** | `jokerBasis.abklingzeit` | Cooldown je Joker-Art, siehe Abschnitt 4. |

Alle sichtbaren Texte sagen **Diamanten** und **Shop** für diesen Topf, nicht
„Budget". Die Code-Bezeichner bleiben wie sie sind — ein Rename über sechs
Module wäre Bewegung ohne Gewinn, aber die Sprache in der Oberfläche muss
stimmen.

**Keine Zinsen.** Ein früherer Vorschlag von mir, vom Nutzer verworfen: keine
der beiden Währungen vermehrt sich von selbst. Man bekommt sie, man gibt sie
aus.

---

## 1. Was es heute gibt

**Ernüchternd wenig — eine einzige Frequenzform.**

`jokerPlan`: *„etwa jeder N-te Spieltag"*, blockweise verteilt, wahlweise für
alle gleich oder jeder an eigenen Tagen, dazu ein Saison-Fenster.

`ereignisse`: fünf Auslöser, alle an eigener Leistung — Serie, erster exakter
Treffer, Außenseiter erwischt, Spieltag komplett getippt, Letzter des Spieltags.

`budget.quellen`: Startkapital, gleich für alle, an Ereignisse gekoppelt, nach
Rückstand, nach Platzierung.

---

## 2. Rhythmus — statt fester Frequenz

| # | Auslöser | Daten vorhanden? |
|---|---|---|
| R1 | **Kurve statt Konstante** — selten am Anfang, dicht zum Schluss (oder umgekehrt). Braucht kein neues Konzept: `saisonform.gewichte()` erzeugt genau solche Kurven bereits (flach · steigend · Endspurt · Rückrunde). | ✅ direkt wiederverwendbar |
| R2 | **Englische Woche** — nur an Doppelspieltagen. | ✅ `spieleJeSpieltag` |
| R3 | **Nach der Pause** — Rückkehr nach einer Länderspielpause. Erkennbar am Abstand zwischen Anpfiffen. | ✅ `zeitachse.js` |
| R4 | **Countdown** — die letzten N Spieltage tragen je einen. | ✅ = `phase: schlussspurt` |

## 2b. 🔴 Die Abstands-Bedingung — eine Regel gilt, SOLANGE die Tabelle so aussieht

Vom Nutzer gefordert und grundsätzlich anders als alles bisherige: Die
bestehenden Bedingungen fragen nach dem **Kalender** („ab Spieltag 12") oder
nach einer **Person** („ich liege 30 Punkte hinten"). Diese hier fragt nach der
**Verfassung der ganzen Runde** — und sie kann von Spieltag zu Spieltag
umschlagen.

### Das Maß: `spannung`

Nicht ein einzelner Abstand, sondern eine einstellbare **Konstellation**:

| `bezug` | misst |
|---|---|
| `ersterZweiter` | Abstand Platz 1 zu Platz 2 |
| `ersterLetzter` | Abstand Platz 1 zum Schlusslicht |
| `spitzengruppe` | Streuung über die ersten `n` Plätze |
| `feld` | Streuung über alle |

| `art` | |
|---|---|
| `relativ` | Anteil, z. B. „Platz 2 hat 85 % der Punkte von Platz 1". **Vorgabe** — absolute Punkte sagen je nach `displayScale` und Saisonlänge etwas völlig anderes. |
| `absolut` | Punkte. Für Admins, die ihre Runde kennen. |

⚠️ **Gewichtung zur Spitze.** Der Nutzer will ausdrücklich, dass Platz 1 stärker
zählt. Deshalb `gewichtung: 0…1` — bei 0 zählen alle Ränge gleich, bei 1 nur der
Abstand zur Spitze. Vorgabe hoch, weil die Frage fast immer „zieht der Erste
davon?" lautet und nicht „wie liegt Platz 7 zu Platz 8".

### Wie sie benutzt wird

Als **Aktivierungs-Bedingung**, also überall dort, wo `limitKlassen.aktivierung`
und `jokerBasis.wer` schon greifen:

```
{ typ: "abSpannung",  wert: 0.75 }   // nur solange es ENG ist
{ typ: "unterSpannung", wert: 0.4 }  // nur wenn jemand DAVONZIEHT
```

Beispiel: „Der Klau-Joker existiert nur, solange der Zweite mindestens 75 % der
Punkte des Ersten hat" — eine Runde, in der die Angriffe aufhören, sobald einer
uneinholbar führt. Oder umgekehrt.

⚠️ **Sie muss sich pro Spieltag NEU entscheiden dürfen.** Eine Bedingung, die
einmal auslöst und dann festhängt, wäre eine verkleidete Kalender-Regel. Das
heißt: sie liest den Stand VOR dem jeweiligen Spieltag — dieselbe Kante wie der
Aufhol-Bonus in `catchup.js`, und aus demselben Grund.

### Voreinstellungen

3–5 kuratierte Konstellationen als eigene **Teilbibliothek**
(`design/teilbibliotheken.md`), nicht als fest verdrahtete Sonderfälle.

### 🔴 Nachtrag zur Abnahme (02.08.): die Bedingung stand auf dem Kopf

Beim Nachmessen aufgefallen, und der Fehler liegt in dieser Spec, nicht in der
Umsetzung.

Eine `aktivierung` steuert bei uns ein **Kontingent**, keine **Erlaubnis** — so
steht es im Kopf von `limitKlassen.js`: *„Ist sie [die Klasse] nicht offen,
greift ihr Kontingent gar nicht — weder zählend noch blockierend."*

Damit lässt sich der Beispielsatz oben („nur solange es eng ist") **nicht
direkt** ausdrücken. Gemessen:

| Klasse mit `max: 0` | eng | weit |
|---|---|---|
| `abSpannung` | gesperrt | erlaubt |
| `unterSpannung` | erlaubt | gesperrt |

Der Admin müsste also **`unterSpannung` mit `max: 0`** einstellen — „sperre,
wenn jemand davonzieht" — um „erlaube, solange es eng ist" zu bekommen. Das ist
richtig gerechnet und trotzdem unbedienbar: man muss die Regel gedanklich
umdrehen und über einen Kontingent-Deckel von 0 ausdrücken.

**Festlegung — eine Klasse bekommt eine `wirkung`:**

| Wert | Bedeutung |
|---|---|
| `kontingent` | **Vorgabe, heutiges Verhalten.** Aktiv → Einsätze zählen gegen `max`. Inaktiv → die Klasse schränkt nichts ein. |
| `nurWennAktiv` | Aktiv → zählt gegen `max` wie bisher. **Inaktiv → die Mitglieder sind GESPERRT.** |

Damit steht der Satz direkt da:

```js
{ mitglieder: ["duell.klau"], wirkung: "nurWennAktiv",
  aktivierung: { typ: "abSpannung", wert: 0.75 } }
```

⚠️ Der Gewinn ist größer als der Anlass: `nurWennAktiv` macht **jede**
Aktivierungs-Bedingung als Erlaubnis-Fenster nutzbar — „nur ab Spieltag 20",
„nur nach diesem Ereignis", „nur wer hinten liegt". Bisher konnte all das nur
Kontingente steuern.

⚠️ `max: 0` bleibt gültig und heißt weiterhin „solange aktiv: nichts erlaubt".
Die beiden Wege dürfen sich nicht widersprechen — ein Test hält beide fest.

## 3. Tabellenstand — die dramaturgischen

| # | Auslöser | Daten |
|---|---|---|
| T1 | **Führungswechsel** — wer die Spitze verliert, bekommt einen. Oder wer sie erobert. Zwei völlig verschiedene Rundengefühle aus demselben Auslöser, deshalb als Schalter. | ✅ Verlauf |
| T2 | **Kopf-an-Kopf** — liegen die ersten beiden unter X Punkten auseinander, bekommen BEIDE einen. Belohnt Spannung, nicht Position. | ✅ Verlauf |
| T3 | **Abstand gerissen** — alle mehr als X Punkte hinten schalten einen frei. | ✅ Verlauf |
| T4 | **Rangsprung** — wer an einem Spieltag N Plätze gutmacht. | ✅ Verlauf |

## 4. Aus den Spielen selbst

| # | Auslöser | Daten |
|---|---|---|
| S1 | **Big Game** — der Spieltag mit dem dynamisch bestimmten Topspiel trägt einen Joker. | ✅ `bigGame.js` |
| S2 | **Derby-Spieltag** | ✅ `DERBYS` in `bundesligaData.js` |
| S3 | **Kollektiver Reinfall** — hat die Runde einen Spieltag GEMEINSAM verhauen, gibt es für alle einen Trost-Joker. Belohnt keine Leistung, sondern erkennt einen geteilten Moment an. | ✅ Tipps + Ergebnisse |
| S4 | **Torreicher Spieltag** | ✅ Ergebnisse |

## 5. Aus der Gruppe

| # | Auslöser |
|---|---|
| G1 | **Abstimmung** — die Runde entscheidet. `voting.js` kann das bereits für Joker-Spieltage. |
| G2 | **Weitergabe** — wer einen Spieltag gewinnt, verschenkt einen Joker. |
| G3 | **Der Letzte bestimmt** — wer hinten liegt, wählt aus, wer den nächsten bekommt. |

## 6. Zwei, die aus dem Rahmen fallen

**V1 · Versteigerung.** Ein Joker wird versteigert, alle bieten Diamanten. Passt
genau zum Shop-Gedanken und macht daraus etwas Lebendiges — man schätzt ab, was
der Joker *anderen* wert ist.
⚠️ Joker-**Handel zwischen Spielern** bleibt verworfen (Absprachen, siehe
`joker-inventar.md` 4.4). Eine Versteigerung gegen die Bank hat das Problem
nicht: es fließt nichts von Spieler zu Spieler.

**V2 · Rückverkauf.** Einen ungenutzten Joker am Saisonende zu Diamanten machen.
Damit ist Nichtstun keine reine Verschwendung, und Horten bekommt einen
Gegenspieler — ohne dass wir Zinsen brauchen.

## 7. Diamanten-Quellen, die noch fehlen

| # | Quelle |
|---|---|
| M1 | **Rückverkauf** (= V2) — ein NICHT gesetzter Joker wird am Saisonende zu Diamanten. |
| M2 | **Aus dem Drehrad** — ein Feld kann Diamanten auszahlen (`design/drehrad.md`). |

### 🔴 Zwei Vorschläge von mir, beide vom Nutzer verworfen — und warum

**Zinsen** auf ungenutzte Diamanten und **Teilerstattung** für einen Joker, der
nichts eingebracht hat. Beide abgelehnt, und beide aus demselben Grund:

> **Sie mildern die Folge einer Entscheidung.** Ein Joker ist ein Einsatz. Wer
> ihn falsch setzt, hat ihn falsch gesetzt — das ist der ganze Reiz. Wer
> Rückerstattung einbaut, nimmt der Entscheidung ihr Gewicht und macht aus
> einer Wette eine Formalie.

Das ist eine Entwurfsregel, keine Einzelfallmeinung: **alles, was einen
gesetzten Joker nachträglich abfedert, gehört nicht in dieses Spiel.**

⚠️ Der Rückverkauf (M1) verletzt sie NICHT — er betrifft einen Joker, der nie
gesetzt wurde. Nichts wird rückgängig gemacht, es wird nur etwas Ungenutztes
verwertet.

---

## 8. ✅ Abklingzeit (Cooldown) — GEBAUT (Stand 02.08.)

> **Nachtrag 02.08.:** Dieser Abschnitt stand bis heute auf 🔴 „fehlt
> komplett". Das stimmt nicht mehr — die Abklingzeit liegt als Dimension in
> `jokerBasis.js` (`BASIS_LIMITS.abklingzeit`, `DEFAULT_BASIS.abklingzeit`),
> wird in `pruefeAbklingzeit` durchgesetzt und ist in `JokerGrundform.jsx`
> einstellbar. `duell.abstand` ist wie gefordert weg; `duellPlan` liest
> `basis.abklingzeit`.
>
> Nachgemessen (`abklingzeit: 3`, Einsatz an Spieltag 5): ST5/6/7 gesperrt mit
> Restangabe im Grund, ab ST8 frei, eine ANDERE Joker-Art bleibt unberührt.
>
> ⚠️ **Zwei Dinge, die dabei aufgefallen sind:**
> 1. `darfEinsetzen(basis, userId, kontext, jokerArt)` prüft die Abklingzeit
>    **nur, wenn `jokerArt` mitgegeben wird** — ohne das vierte Argument fällt
>    die Prüfung still aus. Der Aufrufer muss sie also kennen.
> 2. Der Kontext-Schlüssel heißt **`letzteEinsaetze`**, nicht
>    `bisherigeEinsaetze` (das ist der Name in `duellJoker.zulaessigeZiele`).
>    Zwei ähnliche Namen für ähnliche Listen — beim Verkabeln leicht zu
>    verwechseln.
>
> 🔴 Und der Punkt, der zählt: **`darfEinsetzen` hat null Aufrufer im
> Spielbetrieb.** Die Abklingzeit ist gebaut und greift, wenn man sie fragt —
> gefragt wird sie heute nirgends. Siehe `design/kontaktstellen.md`.

Vom Nutzer benannt. Weder `limitKlassen` noch der Shop decken es ab:

- **Limitierungsklasse** = wie VIELE, geteilt mit anderen Arten.
- **Preis** = was es KOSTET.
- **Abklingzeit** = wie lange danach diese Art GESPERRT ist.

Drei verschiedene Fragen. Man kann reich sein, Kontingent übrig haben — und
trotzdem warten müssen.

**Gehört in `jokerBasis.js`**, als siebte Dimension der Grundform. Damit trägt
sie jede Joker-Art automatisch, statt dass jeder Typ sie neu erfindet — genau
der Grund, aus dem die Grundform vorgezogen wurde.

```js
abklingzeit: 0,   // Spieltage Sperre nach einem Einsatz dieser Art. 0 = keine.
```

⚠️ **`duell.abstand` wird dadurch überflüssig** und muss weg — sonst stehen zwei
Wahrheiten über dieselbe Frage nebeneinander. Gleiche Behandlung wie
`duell.ansage`/`duell.oeffentlich`, die beim Einhängen in `jokerBasis.sicht`
aufgegangen sind.

`duell.immun` bleibt: das ist die Schonfrist des ZIELS, nicht die des
Angreifers. Andere Frage, anderes Feld.
