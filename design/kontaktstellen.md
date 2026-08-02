# Kontaktstellen-Inventar — welche Einstellung wird im Spiel tatsächlich abgefragt?

**Befund.** Account 2 (Andre), 2026-08-02. Untersuchung, keine Umsetzung.

> **Der Baukasten-Grundsatz sagt:** *„Eine Einstellung, die ins Leere läuft, ist
> kein Baukastenteil."* Dieses Dokument beantwortet die Frage einmal
> systematisch statt einzeln — ausgelöst davon, dass beim Nachmessen der
> Abklingzeit auffiel, dass `darfEinsetzen` **null Aufrufer** hat.

---

## 1. Die Messung

Gesucht wurde je Funktion nach Aufrufern in `src/`, **ohne** Testdateien:

```
grep -rn "\bNAME(" src --include=*.js --include=*.jsx | grep -v "\.test\."
```

Dazu die Gegenprobe, welche Bezeichner `engine.js` aus den vier neuen Modulen
überhaupt importiert.

## 2. Das Ergebnis

`engine.js` holt aus `jokerBudget`, `limitKlassen`, `jokerBasis` und `drehrad`
**ausschließlich `sanitize*` und `DEFAULT_*`** — keine einzige Prüffunktion.

| Funktion | Modul | Was sie durchsetzt | Aufrufer im Spielbetrieb |
|---|---|---|:--:|
| `darfEinsetzen` | `jokerBasis` | `wer`, „kein Joker ohne Tipp", `abklingzeit` | **0** |
| `erfuelltBedingung` | `jokerBasis` | `minQuote`/`maxQuote`, `wettbewerbe`, `phasen` (L15) | **0** |
| `darfWiderrufen` | `jokerBasis` | `widerruf`, `widerrufStunden` | **0** |
| `pruefeEinsatz` · `pruefeKlassen` | `limitKlassen` | Kontingente, `wirkung`, acht Aktivierungen | **0** |
| `kannBezahlen` · `budgetVerlauf` | `jokerBudget` | Münzstand, Quellen, Takt, Verfall | **0** |
| `ziehe` · `auswerten` | `drehrad` | die Ziehung und `maxPunkteProSaison` | **0** |
| `zulaessigeZiele` · `duellPlan` | `duellJoker` | `zielWahl`, `maxProZiel`, `immun` | **0** |

Aufrufer haben nur: `basisFuer` (im eigenen Editor), `preisFuer` (Preis-Vorschau),
`drehradPlan` (Vorschau) — **alle drei in der Admin-Oberfläche, keiner im Spiel.**

`applyDuellJoker` hängt in `engine.js` in der Kette, ist aber ein No-op, solange
`einsaetze` leer bleibt (bekannt, siehe `duell-joker.md`).

## 3. 🔴 Was das heißt — und was es NICHT heißt

**Es heißt nicht, dass etwas falsch gebaut wurde.** Die Reihenfolge war
Absicht, und jede Spec sagt es ausdrücklich: „Nicht Teil dieses Schritts:
Store-Anbindung." Die Module sind richtig, getestet und über die Oberfläche
einstellbar.

**Es heißt:** die Einstellungen werden heute **gespeichert** (`sanitizeRules`
hält sie, der Creator-Code trägt sie, `presetMerge` bewegt sie mit) und sind
**einstellbar** — aber im laufenden Spiel fragt sie niemand ab. Zwischen
„der Admin kann es einstellen" und „es greift" liegt bei diesen sieben
Funktionen noch eine Verkabelung.

⚠️ **Der Unterschied zu den bisher gefundenen toten Kontaktstellen ist wichtig.**
Die vier Fälle aus der letzten Sitzung (fehlendes Feld, Punkte-Deckel, Drehrad-
Schalter, Dämpfer in der Oberfläche) waren *Fehler*: die Verkabelung war
gemeint und fehlte. Diese sieben sind *unfertig*: die Verkabelung ist noch
nicht dran. Beides sieht im Test gleich aus — grün.

## 4. Warum es trotzdem hier steht

Weil die Menge nirgends zusammen aufgeschrieben war. Verstreut steht es in drei
Dokumenten (`blindstellen-balancesim.md` für den Simulator, `duell-joker.md` für
die Einsätze, `joker-einhaengen.md` Abschnitt 8), und jedes nennt nur seinen
eigenen Ausschnitt. Wer nur eines liest, hält den Rest für verkabelt.

**Für die Balance ist das der eigentliche Vorlauf.** `balanceSim.js` kann diese
Ebenen nicht messen, solange es im Spiel selbst keine Stelle gibt, an der sie
greifen — das ist genau der Befund „Art B · Verhaltensmodell" aus
`blindstellen-balancesim.md`, nur von der anderen Seite gesehen.

## 5. Vorschlag für die Reihenfolge

Keine Empfehlung zur Stärke, nur zum Bauweg:

1. **Ein Ort, an dem ein Joker gesetzt wird.** Heute gibt es ihn nicht — weder
   im Store noch in der Tippabgabe. Er ist die Voraussetzung für alle sieben:
   `darfEinsetzen`, `erfuelltBedingung`, `pruefeEinsatz` und `kannBezahlen`
   sind Prüffunktionen und brauchen einen Moment, in dem gefragt wird.
2. **Danach die Buchführung** (`budgetVerlauf`, `kontostand`) — sie hängt an
   den Einsätzen aus Schritt 1.
3. **Dann `ziehe`/`auswerten`** beim Öffnen des Spieltags (die Spec verlangt
   ausdrücklich: beim Öffnen, nicht beim Klicken, `drehrad.md` 2.5).
4. **Zuletzt die Duell-Einsätze** — `applyDuellJoker` wartet nur auf Daten.

⚠️ **Nach jedem Schritt dieselbe Gegenprobe wie bei den Blindstellen:** eine
Einstellung auf Anschlag MUSS ein messbar anderes Ergebnis liefern als keine.
Sonst ist die Kontaktstelle weiterhin tot, nur unsichtbarer als vorher.

## 6. So bleibt das Inventar ehrlich

Die Messung aus Abschnitt 1 ist ein Einzeiler. Wer eine neue Prüffunktion baut,
trägt sie in die Tabelle ein — und wer eine verkabelt, streicht die Null.
Ein Wächter-Test wäre denkbar (Muster `uiTexte.test.js`), wurde hier aber
bewusst **nicht** gebaut: er müsste den Quelltext nach Aufrufern durchsuchen,
und ein Test, der Textsuche über das Projekt macht, geht bei der ersten
Umbenennung kaputt und erzieht dann zum Abschalten.
