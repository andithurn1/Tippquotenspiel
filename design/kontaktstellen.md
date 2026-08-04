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
| `darfEinsetzen` | `jokerBasis` | `wer`, „kein Joker ohne Tipp", `abklingzeit` | **1** (`pruefeJokerEinsatz` → `Tippabgabe.jsx`) |
| `erfuelltBedingung` | `jokerBasis` | `minQuote`/`maxQuote`, `wettbewerbe`, `phasen` (L15) | **1** (`pruefeJokerEinsatz` → `Tippabgabe.jsx`) |
| `darfWiderrufen` | `jokerBasis` | `widerruf`, `widerrufStunden` | **0** |
| `pruefeEinsatz` · `pruefeKlassen` | `limitKlassen` | Kontingente, `wirkung`, acht Aktivierungen | **0** |
| `kannBezahlen` | `jokerBudget` | Narrenstand darf nie unters Guthaben fallen | **1** (`Tippabgabe.jsx`, vor dem Speichern) |
| `budgetVerlauf` | `jokerBudget` | Narrenstand, Quellen, Takt, Verfall (Zufluss-Seite) | **1** (`kontoVerlauf` — darüber `Tippabgabe.jsx`, `narrenstand.js` → `RundenHub.jsx`/`Hauptmenu.jsx`) |
| `ziehe` · `auswerten` | `drehrad` | die Ziehung und `maxPunkteProSaison` | **0** |
| `zulaessigeZiele` · `duellPlan` | `duellJoker` | `zielWahl`, `maxProZiel`, `immun` | **0** |

Aufrufer haben nur: `basisFuer` (im eigenen Editor), `drehradPlan` (Vorschau)
— beide weiterhin nur in der Admin-Oberfläche, keiner im Spiel. `preisFuer`
war bis Schritt 2 ebenfalls nur die Admin-Vorschau (`JokerOekonomie.jsx`) —
seither hat es außerdem echte Aufrufer im Spiel, siehe unten.

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

---

**2026-08-04.** Schritt 1 aus Abschnitt 5 umgesetzt: `jokerBasis.js` bekam
`pruefeJokerEinsatz({ rules, jokerArt, userId, snap, wettbewerb, phase,
kontext })` — erst `darfEinsetzen`, dann bei Erfolg `erfuelltBedingung`.
`Tippabgabe.jsx` ruft sie beim Speichern eines Tipps auf, sobald tatsächlich
eine Gewichtung gesetzt wird (Joker aktiv, nicht gesperrt, und `joker ===
true` oder `gewicht !== 1`). Der Screen lädt dafür zusätzlich
`getStore().getLeaderboard(roundId)` (State `board`, für die `wer`-Modi
`abPlatz`/`abRueckstand`) und baut `kontext` mit `hatGetippt: true` (der
gerade gespeicherte Tipp erfüllt die Invariante immer), `alleGetippt` sowie
`letzteEinsaetze` aus den eigenen Tipps.

Ausdrücklich NICHT Teil dieses Schritts: `pruefeEinsatz`/`pruefeKlassen`
(`limitKlassen`), `kannBezahlen`/`budgetVerlauf` (`jokerBudget`),
`ziehe`/`auswerten` (`drehrad`), `zulaessigeZiele`/`duellPlan`
(`duellJoker`) sowie `darfWiderrufen` (`jokerBasis`) — deren Zeile in der
Tabelle oben steht weiterhin auf **0**. Offen bleibt außerdem
`kontext.adminFreigaben`: es gibt noch keinen Speicherort für
Admin-Freigaben, `Tippabgabe.jsx` übergibt dafür bewusst eine leere Liste,
wodurch der `wer`-Modus `adminFreigabe` konsequent ablehnt statt still
durchzulassen.

**2026-08-04, Schritt 2 aus Abschnitt 5 umgesetzt: die Narren-Buchführung.**
`jokerBudget.js` bekam `kontoVerlauf({ rules, tipps, spieltage, stand,
userIds })` — es ruft `budgetVerlauf` für die Zufluss-Seite (unverändert),
leitet Käufe aus den Tipps ab (`tip.joker === true` im Modus „einzel",
`tip.gewicht !== 1` im Modus „ranking"), bepreist sie chronologisch je
Periode über `preisFuer` und zieht sie vom Zufluss ab — nie unter 0. Im
Modus „einsatz" oder bei ausgeschaltetem Budget bleiben die Ausgaben bei 0
(Münzen ≠ Narren, `design/waehrungen.md` Abschnitt 1: `tip.gewicht` ist dort
ein Wetteinsatz, kein Joker-Kauf). `perioden()` wurde dafür exportiert, damit
weder `kontoVerlauf` noch ein Aufrufer die Perioden-Grenzen ein zweites Mal
rechnen.

Damit sind `kannBezahlen` und `budgetVerlauf` jetzt verkabelt (Tabelle oben):
`Tippabgabe.jsx` prüft vor dem Speichern eines Jokers — direkt nach der
`pruefeJokerEinsatz`-Prüfung aus Schritt 1, nur außerhalb des Modus
„einsatz" — mit `preisFuer` und `kannBezahlen(kontostand, preis)`, ob der
Kauf gedeckt ist; bei `false` ein neuer `saveState`-Wert `"narrenUngueltig"`
mit `narrenGrund`. Dafür lädt der Screen zusätzlich `alleTipps` (die
ungefilterte `listTips`-Antwort, angereichert um `matchday`/`matchId`) —
`meineTips` allein reicht nicht, weil `spielerInPeriode` (Preis „knappheit")
die Käufe ALLER Spieler braucht. Der Narren-Kontostand wird dort jetzt auch
angezeigt (`design/waehrungen.md` Abschnitt 3.1), NUR in den Modi
„einzel"/„ranking". Die Kauf-Erkennung selbst (`joker === true` bzw.
`gewicht !== 1`, je nach Modus) steckt EINMAL in `istNarrenKauf`
(`jokerBudget.js`, exportiert) — `kontoVerlauf` und die Preis-Vorschau in
`Tippabgabe.jsx` rufen dieselbe Funktion, keine zweite Ternary.

Dieselbe Zahl (kompakt, ohne Planungstext) kam an den beiden anderen Orten
aus `design/waehrungen.md` 3.2/3.3 dazu: `src/lib/narrenstand.js` (neu, das
Narren-Geschwister von `muenzstand.js`) liefert den Kontostand für
`RundenHub.jsx` und `Hauptmenu.jsx` — beide luden `tips` für den Münzstand
ohnehin schon ungefiltert, kein neuer Store-Aufruf nötig. `Waehrungen.jsx`
zeigt jetzt beide Währungen (`stand`/`narren`-Prop), dieselbe EINE
Anzeige-Komponente wie zuvor.

Für die Budget-Quellen `rueckstand`/`platzierung` reichen alle drei Orte den
ECHTEN Spieltag-für-Spieltag-Tabellenstand durch — `getStore().
getLeaderboardHistory(roundId)` existiert in beiden Stores (`store.mock.js`,
`store.supabase.js`) und liefert genau die Form, die `budgetVerlauf` als
`stand` erwartet. `Tippabgabe.jsx` lädt sie im bestehenden `Promise.all`,
`RundenHub.jsx`/`Hauptmenu.jsx` ebenso je Runde. Ein erster Entwurf dieses
Schritts hatte hier fälschlich angenommen, es gäbe keine Historie, und einen
EIN-Punkt-Behelf gebaut — korrigiert, bevor er verkabelt wurde.

⚠️ Eine echte Einschränkung bleibt, unverändert seit `budgetVerlauf`s
eigenem Entwurf: `stand`/`standAmTag` schlüsseln NUR über `matchday`, nicht
zusätzlich über `wettbewerb`. Läuft eine Runde über mehrere Wettbewerbe mit
kollidierenden Spieltag-Nummern (z. B. Bundesliga-Spieltag 5 UND
Champions-League-Spieltag 5), mischt `standAmTag` deren Tabellenstände. Das
ist kein neuer Fehler dieses Schritts, sondern der bestehenden `stand`-Form
`[{ matchday, board }]` inhärent — außerhalb dieses Schritts, da eine
Lösung `budgetVerlauf`s Schnittstelle ändern müsste.

Ausdrücklich NICHT Teil dieses Schritts: `ziehe`/`auswerten` (`drehrad`),
`darfWiderrufen` (`jokerBasis`), `zulaessigeZiele`/`duellPlan`
(`duellJoker`), `pruefeEinsatz`/`pruefeKlassen` (`limitKlassen`) — deren
Zeilen in der Tabelle oben stehen weiterhin auf **0**.
