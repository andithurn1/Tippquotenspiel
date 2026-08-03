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
  Joker-, Diamanten- und Modifikator-Felder sind unberührt — sie haben ihre eigenen
  Deckel an anderer Stelle.
- `gedeckelt` listet, wem wie viel gekürzt wurde. Ohne diese Liste sieht ein
  Spieler eine Auszahlung, die nicht zu seinem Rad passt, und kann sich das nicht
  erklären — dieselbe Regel wie bei `gestrichen` in `saisonform.js`.
- `maxPunkteProSaison: 0` heißt **kein Deckel**, nicht „keine Punkte".

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
