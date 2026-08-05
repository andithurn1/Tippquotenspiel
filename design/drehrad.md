# Drehrad — vom Admin gebaute Zufalls-Ereignisse

**Spec.** Account 2 (Andre), 2026-07-31, nach Vorgabe des Nutzers.

> **Der Punkt:** Nicht „ein Drehrad" als fertiges Feature, sondern **ein Rad,
> dessen Felder der Admin selbst anlegt** — Beschriftung, Feldgröße
> (Wahrscheinlichkeit), Belohnung — dazu, wie oft es über die Runde auftaucht
> und wer drehen darf.

⚠️ **Keine Empfehlungen, keine Balance-Vorgaben in diesem Modul.** Was ein Feld
auszahlt und wie groß es ist, entscheidet der Admin. Wer sich eine schiefe Runde
bauen will, darf das. Dieses Dokument beschreibt nur, welche Variablen es gibt
und dass sie tatsächlich greifen.

---

## 1. Warum das eine eigene Form ist

Der Baukasten kennt bisher zwei Auslöser für eine Belohnung:

| vorhanden | Auslöser |
|---|---|
| `jokerPlan` | ein Zeitpunkt (der Admin stellt eine Frequenz ein) |
| `ereignisse` | eine Leistung („drei Spieltage in Folge getippt") |

Das Drehrad ist der dritte: **Zufall aus einer vom Admin geschriebenen
Tabelle.** Weder Zeitpunkt noch Leistung bestimmen, WAS herauskommt — nur, DASS
gedreht wird.

Deshalb ein eigenes Modul `src/lib/drehrad.js` statt eines weiteren
`EREIGNIS_TYPEN`-Eintrags: die Ereignis-Typen haben feste Parameter, hier ist
die Tabelle selbst der Inhalt.

## 2. Was der Admin einstellt

### 2.1 Die Felder

```js
felder: [
  { id: "f1", label: "Joker geschenkt", gewicht: 3, belohnung: { typ: "joker", art: "joker.einzel", anzahl: 1 } },
  { id: "f2", label: "50 Budget",        gewicht: 2, belohnung: { typ: "budget", betrag: 50 } },
  { id: "f3", label: "Niete",            gewicht: 6, belohnung: { typ: "nichts" } },
]
```

- **`gewicht`** ist die Feldgröße. Die Wahrscheinlichkeit ist `gewicht` geteilt
  durch die Summe aller Gewichte — dadurch muss der Admin nie auf 100 kommen,
  er zieht nur Felder größer oder kleiner. Ein Feld mit `gewicht: 0` liegt auf
  dem Rad, kann aber nicht fallen (praktisch zum Vorbereiten).
- **`label`** ist frei. Es steht auf dem Rad und in der Meldung.
- Mindestens **zwei** Felder mit Gewicht über 0, sonst ist es kein Rad.

### 2.2 Belohnungs-Typen

| `typ` | Felder | Wirkung |
|---|---|---|
| `nichts` | — | Niete. Muss es geben, sonst ist Drehen risikolos. |
| `joker` | `art`, `anzahl` | Gutschrift auf eine Joker-Art (`JOKER_ARTEN`). |
| `budget` | `betrag` | Zahlt auf das Konto aus `jokerBudget.js`. |
| `modifikator` | `faktor`, `spieltage` | Aufschlag auf die eigene Wertung für N Spieltage. Fällt in denselben additiven Topf, `modCap` greift weiter. |
| `punkte` | `betrag` | Direkte Punkte. ⚠️ Siehe 2.5. |

### 2.2b Sperrfrist — damit sich Felder nicht ständig wiederholen

Vom Nutzer gefordert: einzelne Ereignisse sollen sich **nicht so schnell
wiederholen**, innerhalb einer einstellbaren Frist.

```js
sperrfrist: 2,                                   // Vorgabe für ALLE Felder
felder: [
  { id: "f1", label: "Joker geschenkt", gewicht: 3, sperrfrist: 5, … },
  { id: "f3", label: "Niete",           gewicht: 6, sperrfrist: 0, … },
]
```

- Gezählt wird in **Drehungen dieses Spielers**, nicht in Spieltagen. Ein Rad,
  das alle fünf Spieltage kommt, sperrt sonst faktisch die halbe Saison.
- **Je Spieler**, nicht rundenweit. Was ein anderer gezogen hat, geht mich
  nichts an — sonst hängt mein Rad an fremdem Glück.
- `sperrfrist: 0` = keine Sperre. Sinnvoll für die Niete: die darf ruhig
  mehrmals hintereinander kommen.
- Am Feld gesetzt schlägt die Rad-Vorgabe.

#### ⚠️ Was das für die Ziehung bedeutet

Die Sperrfrist macht die Ziehung **abhängig von der Vorgeschichte**. Damit
ändert sich die Signatur:

```js
ziehe(drehrad, { rundenId, userId, spieltag, bisherige })
```

`bisherige` = die zuletzt gezogenen Feld-Ids dieses Spielers, neueste zuerst.
Gesperrte Felder fallen raus, die Gewichte werden über die **verbleibenden**
neu normiert, dann wird gezogen.

Determinismus bleibt erhalten (Abschnitt 2.5 Punkt 1): die Vorgeschichte ist
selbst deterministisch, also ist es das Ergebnis auch. Ein Neuladen ändert
nichts.

🔴 **Der Randfall, an dem es sonst still bricht:** Sind durch die Sperrfristen
**alle** Felder blockiert, wird die Sperre für diese eine Drehung **ignoriert**
und über das volle Rad gezogen. Die Alternative wäre eine Drehung ohne Ergebnis
— und genau so etwas fällt erst im Spielbetrieb auf. Ein Test hält den Fall
fest, und `pruefeFelder` warnt den Admin schon beim Einstellen, wenn die
Sperrfristen rechnerisch nicht aufgehen können (Summe der Sperren ≥ Anzahl der
Felder mit Gewicht > 0).

### 2.3 Wann gedreht wird

Übernommen aus `jokerPlan.js` — **nicht neu bauen**:

| Feld | Bedeutung |
|---|---|
| `frequenz` | „etwa jeder N-te Spieltag" |
| `modus` | `gleich` (alle am selben Spieltag) · `kontingent` (jeder gleich oft, an eigenen Spieltagen) |
| `fenster` | Saison-Abschnitt, über `fensterVon` aus `duellJoker.js` |

Verteilt wird blockweise und deterministisch aus der Runden-Id, wie beim Joker —
dadurch sehen alle dasselbe und es ist nachprüfbar.

### 2.4 Wer dreht

| `wer` | |
|---|---|
| `alle` | jeder, der an dem Spieltag getippt hat |
| `nurGetippte` | nur wer den Spieltag vollständig getippt hat |
| `abPlatz` / `abRueckstand` | über `jokerBasis.darfEinsetzen` — dieselbe Grundform wie bei den Jokern, kein zweiter Mechanismus |

### 2.5 ⚠️ Zwei Dinge, die nicht verhandelbar sind

**(1) Das Ergebnis wird beim Öffnen des Spieltags gezogen, nicht beim Klicken.**
Sonst entscheidet der Zeitpunkt des Drehens mit, und wer wartet, hat mehr
Information. Gezogen wird deterministisch aus `(rundenId, userId, spieltag)` —
damit ist es für alle nachprüfbar dasselbe und ein Neuladen ändert nichts. Die
Animation zeigt nur, was ohnehin feststeht.

**(2) `punkte` ist erlaubt, aber es ist ein Punkte-Kanal.** `ereignisse.js`
schließt so etwas für sich aus (Belohnung ist immer eine Joker-Gutschrift). Hier
lassen wir es zu, weil der Admin entscheidet — **aber es bekommt einen eigenen
Saison-Deckel** (`maxPunkteProSaison`), sonst hebelt ein Rad die ganze Wertung
aus, ohne dass irgendwo eine Grenze greift. Der Deckel darf hoch stehen. Er darf
nur nicht fehlen.

## 3. Modul

`src/lib/drehrad.js`, reine Funktionen, UI-frei.

- `DEFAULT_DREHRAD`, `DREHRAD_LIMITS`, `BELOHNUNGS_TYPEN`
- `sanitizeDrehrad(partial)` — Felder ohne `id`/`label` oder mit unbekanntem
  Belohnungs-Typ fliegen raus. **Und wie bei `limitKlassen`: eine Funktion, die
  sagt WAS rausgeflogen ist** (`pruefeFelder`), sonst verschwindet die Hälfte
  des Rads stillschweigend.
- `wahrscheinlichkeiten(felder)` → je Feld der Anteil. Für die Anzeige — der
  Admin muss sehen, was seine Gewichte bedeuten, sonst dreht er blind.
- `drehradPlan({ spieltage, drehrad, seed, userIds })` → an welchen Spieltagen
  wer dreht. Ruft `jokerPlan` auf.
- `ziehe(drehrad, { rundenId, userId, spieltag })` → das gezogene Feld.
  Deterministisch über `seeded` aus `seeded.js`.
- `beschreibeDrehrad(drehrad, spieltage)` → ein Satz.

---

## 3b. Nachtrag zur Abnahme (31.07.) — zwei Lücken in dieser Spec

Beide von der Umsetzung gemeldet, beide berechtigt: ich habe eine Einstellung
und einen Deckel benannt, aber **keine Funktion, die sie durchsetzt**. Genau die
Fehlerklasse, die bei `limitKlassen` schon einmal zugeschlagen hat — eine
Einstellung, die ins Leere läuft, ist kein Baukastenteil.

### (a) 🔴 Zwei `wer`-Kataloge

`drehrad.js` führt lokal `alle · nurGetippte · abPlatz · abRueckstand`,
`jokerBasis.WER` führt `alle · abPlatz · abRueckstand · adminFreigabe`. Zwei
Listen für dieselbe Frage — sie laufen auseinander, sobald jemand eine ergänzt.

**Festlegung:**
- **`nurVollstaendigGetippt` wandert nach `jokerBasis.WER`.** Das ist eine
  allgemeine Frage, kein Rad-Sonderfall: auch ein Joker kann verlangen, dass der
  Spieltag KOMPLETT getippt wurde.
  ⚠️ Nicht zu verwechseln mit der Invariante aus `joker-grundform.md` 5.0
  („kein Joker ohne Tipp") — die verlangt *überhaupt* einen Tipp, dieser Wert
  verlangt *alle*. `kontext` bekommt dafür `alleGetippt` neben `hatGetippt`.
- **`drehrad.js` importiert `WER` aus `jokerBasis.js`** und führt keinen eigenen
  Katalog. `adminFreigabe` gilt dort mit, das ist kein Schaden.
- Die Auswertung bleibt `jokerBasis.darfEinsetzen` — kein zweiter Mechanismus.

### (b) 🔴 `maxPunkteProSaison` wird gespeichert, aber nie durchgesetzt

Ein Deckel, der nicht deckelt. `ereignisse.js` macht es richtig vor: dort setzt
`auswerten()` den `maxErspielt`-Deckel **chronologisch** durch.

**Festlegung — neue Funktion:**

```
auswerten(drehrad, ziehungen) -> { gutschriften, gedeckelt }
```

- `ziehungen` = `[{ userId, spieltag, feldId }]`, chronologisch.
- `gutschriften` = was tatsächlich ankommt, je Nutzer.
- **Nur `belohnung.typ === "punkte"` wird gedeckelt**, und zwar chronologisch je
  Nutzer: ist `maxPunkteProSaison` erreicht, bringt die nächste Ziehung 0 Punkte.
  Joker-, Narren- und Modifikator-Felder sind unberührt — sie haben ihre eigenen
  Deckel an anderer Stelle.
- `gedeckelt` listet, wem wie viel gekürzt wurde. Ohne diese Liste sieht ein
  Spieler eine Auszahlung, die nicht zu seinem Rad passt, und kann sich das nicht
  erklären — dieselbe Regel wie bei `gestrichen` in `saisonform.js`.
- `maxPunkteProSaison: 0` heißt **kein Deckel**, nicht „keine Punkte".

## 3c. Die Darstellung — prozedural, nicht vorgerendert (03.08.) ✅ GEBAUT (05.08.)

Frage des Nutzers: kann sich das Rad je nach Admin-Einstellung visuell
anpassen, und ginge das über **vorher erzeugte Clips**, aus denen nach dem
Ergebnis der passende abgespielt wird?

### 🔴 Warum Clips hier nicht tragen

**Die Kombinationsmenge ist nicht endlich.** Der Admin schreibt die Tabelle
selbst — Anzahl der Felder, Beschriftung, Gewicht. Nötig wäre ein Clip je
(Rad-Konfiguration × Ausgang), und die Konfiguration ist frei. Selbst je Runde
vorgerendert bräuchte es eine Render-Strecke, eine Ablage und eine
Ungültigmachung.

**Und ein Clip backt den Text ein.** Das Rad ist in der Spielerstellung live
editierbar; eine geänderte Beschriftung macht jeden Clip dieses Rades veraltet,
ein zusätzliches Feld ebenso. Man hätte einen Zwischenspeicher, der bei jeder
Admin-Änderung zerfällt — und merkt es erst, wenn ein Spieler ein Rad sieht,
das es so nicht mehr gibt.

### Was stattdessen

**Der Ausgang steht vor der Animation fest** (Abschnitt 2.5: gezogen beim
Öffnen des Spieltags, deterministisch). Die Animation zeigt also nur, was
ohnehin feststeht — der leichteste Fall, den es gibt.

1. **Rad als SVG aus der Feldliste.** Segmentwinkel `gewicht / Σ gewichte`,
   also genau die Zahl, die `wahrscheinlichkeiten()` schon liefert. Damit passt
   sich die Darstellung jeder Einstellung von selbst an, ohne dass irgendwo
   eine zweite Wahrheit über die Feldgrößen entsteht.
2. **Eine CSS-Drehung auf den Zielwinkel**, mit Verzögerung am Ende. Der
   Zielwinkel folgt aus der Mitte des Gewinnersegments plus ein paar vollen
   Umdrehungen.

⚠️ **Die Fläche IST die Wahrscheinlichkeit.** Gleich große Segmente bei
ungleichen Gewichten wären eine falsche Anzeige, und die Detailangabe dahinter
heilt das nicht — sie liest nur, wer ohnehin misstraut. Vom Nutzer am 03.08.
bestätigt: die Felder sollen unterschiedlich groß sein.

⚠️ **Die Animation ist nie die Wahrheit.** Ein Neuladen mitten in der Drehung
zeigt dasselbe Ergebnis; wer sie überspringt, verliert nichts. Und
`prefers-reduced-motion` schaltet sie ab — dann steht das Ergebnis einfach da.

### ✅ Was daraus geworden ist (05.08.2026)

- **`src/lib/radGeometrie.js` + 10 Tests** — die Winkel sind LOGIK und liegen
  deshalb nicht in der Komponente (Architektur-Regel 1). `segmente()` rechnet
  `anteil × 360°` aus `wahrscheinlichkeiten()`; eine zweite Wahrheit über die
  Feldgrößen entsteht nirgends.
- **`src/components/Gluecksrad.jsx`** — reines SVG, in der Spielerstellung als
  LIVE-VORSCHAU neben dem Proportionalbalken. Wer ein Gewicht ändert, sieht
  das Segment sofort wandern. Der Balken bleibt daneben, weil er kleine
  Anteile zeigt, die im Rad nur ein Strich wären.
- **`segmentUnterZeiger()` ist die Umkehrung von `zielWinkel()`** und wird
  nicht zum Zeichnen gebraucht, sondern zum PRÜFEN: erst damit lässt sich
  zeigen, dass unter dem Zeiger wirklich das gezogene Feld landet und nicht
  der Nachbar. Ein vertauschtes Vorzeichen fiele sonst erst auf, wenn jemand
  fragt, warum die Auszahlung nicht zum Bild passt. Der Test prüft es für
  JEDES Segment, auch für ein 0,36° schmales.
- **Ein Feld mit Gewicht 0 wird gar nicht gezeichnet** (statt als
  hauchdünner Strich) — es fällt nie, und im Rad zu erscheinen wäre die
  Behauptung, es könnte doch drankommen. Wie viele fehlen, steht darunter.
- `prefers-reduced-motion` lässt die vollen Umdrehungen weg: dasselbe
  Ergebnis, sofort. Ein Test hält fest, dass beide Winkel auf dasselbe Feld
  zeigen — die Umdrehungen sind Schmuck.

### ✅ Das Rad im Spielbetrieb (05.08.2026)

`src/components/MeinRad.jsx`, Route `/rad`, Karte im Runden-Hub. Bis dahin gab
es das Rad NUR in der Admin-Oberfläche: der Creator konnte eine Feldtabelle
schreiben, die Punkte landeten still im Leaderboard — wo der Spieler seine
eigene Drehung sieht, gab es nicht.

- **Kein Knopf „drehen".** Der Ausgang steht fest, sobald der Spieltag da ist
  (2.5, deterministisch). Ein Knopf behauptete, der Spieler entscheide den
  Zeitpunkt. Die Ansicht rechnet nach, sie löst nichts aus.
- **Dieselbe Rechnung wie das Leaderboard** (`drehradZiehungen`), mit
  denselben Eingaben — sonst zeigte der Screen eine andere Ziehung als die,
  die zählt.
- **Angezeigt wird der GEKÜRZTE Betrag** aus `auswerten`, nicht der
  Wunschwert des Feldes: sonst rechnet der Spieler mit Punkten, die der
  Saison-Deckel nie ausgezahlt hat. Gemessen: Deckel 120, vier Punkte-Treffer
  à 50 → 50/50/20/0, zwei davon als gekürzt gemeldet.

🔴 **Zwei Skalen, die beim Bauen aufgefallen sind** (Fund, kein Feature):
`drehradPlan` verteilt die Drehungen über RUNDEN-Spieltage, `kontextFuer` in
`drehradBoard.js` vergleicht `t.matchday === spieltag` direkt damit — und
BEIDE Stores reichten dort den LIGA-Spieltag hinein. In einer Runde über fünf
Wettbewerbe sind das verschiedene Zahlen: gemessen liegt Bundesliga-Spieltag
20 auf Runden-Spieltag 27, die Drehung landete also auf Spieltag 20, an dem
der Spieler gar nichts getippt haben muss. „Kein Rad ohne Tipp" prüfte den
falschen Tag. Dazu stand `spieltage: 34` fest verdrahtet, während die Runde 42
Runden-Spieltage hat — die letzten acht bekamen nie eine Drehung. Beides
behoben, beides als Test in `store.test.js` festgehalten.

### Wo Clips doch hingehören

Nicht ans Rad, sondern an die **Reaktion auf das Ergebnis** — und dort ist die
Menge klein und fest, weil sie am Belohnungs-TYP hängt (`nichts` · `joker` ·
`budget` · `modifikator` · `punkte`), nicht am einzelnen Feld. Fünf Clips statt
N × M, unabhängig davon, was der Admin in seine Tabelle schreibt.

Dafür gibt es im Projekt bereits ein Muster: `design/reaktions-clips.md`
(`taunts.js`). Wer das baut, holt es sich von dort, statt eine zweite
Clip-Verwaltung anzulegen.

## 4. Was geprüft wird

**Keine Balance-Tests.** Geprüft wird nur, dass die Einstellungen greifen:

1. Ein Feld mit `gewicht: 0` fällt nie.
2. Die Anteile aus `wahrscheinlichkeiten` summieren sich auf 1.
3. `ziehe` liefert für dieselbe `(rundenId, userId, spieltag, bisherige)` immer
   dasselbe Feld — und für verschiedene Spieler am selben Spieltag verschiedene.
3b. **Sperrfrist:** ein gerade gezogenes Feld mit `sperrfrist: 2` kommt in den
   nächsten zwei Drehungen nicht, in der dritten wieder. `sperrfrist: 0` sperrt
   nie.
3c. **Randfall:** sind alle Felder gesperrt, wird trotzdem gezogen (Sperre für
   diese Drehung ignoriert) statt ein leeres Ergebnis zu liefern.
4. Bei Frequenz N liegen die Drehungen im eingestellten Fenster und nirgends
   sonst.
5. `wer: "abRueckstand"` schließt Führende aus.
6. `pruefeFelder` meldet jedes verworfene Feld mit Grund.
7. Ein Rad mit weniger als zwei Feldern über Gewicht 0 ist ungültig und sagt das.
