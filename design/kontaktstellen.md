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
| `darfEinsetzen` | `jokerBasis` | `wer`, „kein Joker ohne Tipp", `abklingzeit` | **2** (`pruefeJokerEinsatz` → `Tippabgabe.jsx`; `drehradBoard.js` → `store.mock.js`/`store.supabase.js`) |
| `erfuelltBedingung` | `jokerBasis` | `minQuote`/`maxQuote`, `wettbewerbe`, `phasen` (L15) | **1** (`pruefeJokerEinsatz` → `Tippabgabe.jsx`) |
| `darfWiderrufen` | `jokerBasis` | `widerruf`, `widerrufStunden` | **2** (`Tippabgabe.jsx`: einmal für Joker/Ranking, einmal für den Duell-Joker, beide beim Speichern) |
| `pruefeEinsatz` · `pruefeKlassen` | `limitKlassen` | Kontingente, `wirkung`, acht Aktivierungen | **2** (`pruefeEinsatz` → `Tippabgabe.jsx`, zweimal — Joker und Duell — beim Speichern) · `pruefeKlassen` → **1** (`LimitKlassen.jsx`, zeigt die verworfenen Klassen) |
| `kannBezahlen` | `jokerBudget` | Narrenstand darf nie unters Guthaben fallen | **1** (`Tippabgabe.jsx`, vor dem Speichern) |
| `budgetVerlauf` | `jokerBudget` | Narrenstand, Quellen, Takt, Verfall (Zufluss-Seite) | **1** (`kontoVerlauf` — darüber `Tippabgabe.jsx`, `narrenstand.js` → `RundenHub.jsx`/`Hauptmenu.jsx`) |
| `ziehe` · `auswerten` | `drehrad` | die Ziehung und `maxPunkteProSaison` | **1** (`drehradBoard.js` → `store.mock.js`/`store.supabase.js`) |
| `zulaessigeZiele` · `duellPlan` | `duellJoker` | `zielWahl`, `maxProZiel`, `immun` | **1** (`Tippabgabe.jsx`: `duellPlan` bestimmt den Duell-Spieltag im Screen, `zulaessigeZiele` läuft dort zweimal — Auswahl der Ziele und erneute Prüfung beim Speichern) |

Aufrufer haben nur: `basisFuer` (im eigenen Editor), `drehradPlan` (Vorschau)
— beide weiterhin nur in der Admin-Oberfläche, keiner im Spiel. `preisFuer`
war bis Schritt 2 ebenfalls nur die Admin-Vorschau (`JokerOekonomie.jsx`) —
seither hat es außerdem echte Aufrufer im Spiel, siehe unten.

`applyDuellJoker` hängt in `engine.js` in der Kette und ist seit dem Schritt
vom 2026-08-04 (siehe unten, `einsaetzeAusTipps`) **kein No-op mehr** — sobald
echte Tipps mit `tip.duell` vorliegen, wirkt die Regel.

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

**2026-08-04, Schritt 3 aus Abschnitt 5 umgesetzt: die Drehrad-Ziehung zahlt
aus.** Neues Modul `src/lib/drehradBoard.js`, Geschwister von
`saisonBoard.js` — `drehradZiehungen({ rules, rundenId, userIds, spieltage })`
bestimmt über `drehradPlan` WER an WELCHEN Spieltagen dreht und ruft je
Spieler chronologisch `ziehe(drehrad, { rundenId, userId, spieltag,
bisherige })` auf, `bisherige` als die eigenen Feld-Ids neueste zuerst (sonst
wirkt die Sperrfrist aus `drehrad.md` 2.2b nicht). `withDrehradPunkte({ board,
rules, rundenId, spieltage, nameOf })` ruft `auswerten(rules.drehrad,
ziehungen)` auf und rechnet aus `gutschriften` NUR die Einträge mit
`belohnung.typ === "punkte"` je Spieler zusammen, addiert sie als eigenes
`drehrad`-Feld auf `total` und rankt neu — Bauart 1:1 gespiegelt von
`withSaisonPunkte`.

Es wird NICHTS gespeichert — die Ziehung wird bei jedem Aufruf neu berechnet.
`drehrad.md` 2.5 Punkt 1 verlangt Determinismus aus `(rundenId, userId,
spieltag)`, und weil `ziehe` das bereits ist, erfüllt reines Rechnen die
Forderung vollständig; eine Ablage in `spieltagOeffnen`/`openMatchday` wäre
hier sogar falsch gewesen, weil `matches` dort global über alle Runden liegt
(Big-Game-Begründung), eine Drehrad-Ziehung aber je Runde UND Spieler ist.

Verkabelt in `store.mock.js` und `store.supabase.js`, jeweils direkt NACH
`withSaisonPunkte` an derselben Stelle in `getLeaderboard`: Saison zuerst,
dann Rad — beide sortieren und ranken das Board neu, also darf es nur EINE
Reihenfolge geben. Saison zuerst, weil `withSaisonPunkte` reine
Saison-Tipper erst ins Board aufnimmt; `withDrehradPunkte` ergänzt bewusst
KEINE neuen Spieler — wer nicht im Board steht, hat nicht mitgespielt und
dreht auch nicht. `spieltage` kommt dabei aus einer neuen lokalen
`SPIELTAGE = 34`-Konstante in beiden Stores, derselbe Wert und dieselbe
Bauart wie in `Tippabgabe.jsx`/`Drehrad.jsx`/`JokerVerteilung.jsx`.

⚠️ **Halbe Verkabelung, ausdrücklich benannt statt verschwiegen:** Dieser
Schritt zahlt NUR `belohnung.typ === "punkte"` aus. Rad-Felder mit
Joker-, Narren- (Budget-) oder Modifikator-Belohnung werden zwar gezogen und
tauchen in `auswerten()`s `gutschriften` auf, wirken sich im Spiel aber
weiterhin NICHT aus — sie gehören in andere Töpfe (`jokerKontingent`,
`jokerBudget`, `modCap`), die dieser Schritt nicht anfasst. Ein Admin, der ein
Rad mit einem Joker- oder Budget-Feld baut, sieht also weiterhin keine
Wirkung dieses Feldes im Spielbetrieb — nur `punkte`-Felder greifen.

**Nachtrag, noch selbentags: `wer`/`werWert` entscheiden jetzt WIRKLICH, wer
dreht.** Die erste Fassung von `drehradZiehungen` zog für JEDEN übergebenen
`userId`, unabhängig von `rules.drehrad.wer`/`.werWert` — der `wer`-Regler in
`Drehrad.jsx` lief damit ins Leere, obwohl `darfEinsetzen` jetzt in der
Tabelle oben als Aufrufer steht. `drehradZiehungen`/`withDrehradPunkte`
bekamen dafür einen optionalen `kontext`-Parameter (`{ board, tipps,
adminFreigaben, letzteEinsaetze }`, jeweils ALLE Spieler roh). Fehlt er,
bleibt das Verhalten unverändert (Regressionsschutz für bestehende Aufrufer).
Wird er mitgegeben — beide Stores tun das jetzt in `getLeaderboard` —, prüft
`drehradZiehungen` vor JEDER Ziehung `darfEinsetzen(drehradBasis(rules),
userId, ctx, "drehrad")`: zuerst die 5.0-Invariante „kein Rad ohne Tipp"
(`ctx.hatGetippt`, gilt für JEDES `wer`, nicht nur `abPlatz`/`abRueckstand`),
dann `wer`/`werWert` selbst. `"drehrad"` ist keine Art aus `JOKER_ARTEN` —
`basisFuer("drehrad", rules)` liefert deshalb den `jokerBasis.standard`-
Eintrag zurück (kein neuer Art-Schlüssel erfunden) und liefert von dort
`sicht`/`verfall`/`bedingung`/`widerruf`/… — **`wer`/`werWert` selbst kommen
aber bewusst NICHT von dort, sondern bleiben `rules.drehrad.wer`/`.werWert`**
(`drehradBasis()` überschreibt sie nach dem `basisFuer`-Aufruf): das Rad führt
diese beiden Felder als eigene Einstellung mit eigenem Regler in
`Drehrad.jsx`; nähme man stattdessen `jokerBasis.standard.wer`, liefe dieser
Regler ins Leere — dieselbe Fehlerklasse nur an neuer Stelle. `wer:
"abPlatz"`/`"abRueckstand"` bewertet dabei den `board`-Snapshot, der auch an
`withDrehradPunkte` übergeben wurde (der fertige Saison-Stand) — für einen
Spieler, der über die Saison mehrfach zieht, ist das die AKTUELLE Position
zum Zeitpunkt des Aufrufs, nicht die historische Position am jeweiligen
Dreh-Spieltag (`getLeaderboardHistory` wird hier NICHT herangezogen). Offen
bleibt weiterhin, wie in Schritt 1: `adminFreigaben` ist mangels
Speicherort immer leer, `wer: "adminFreigabe"` lehnt am Rad deshalb
konsequent ab. Neu offen: `letzteEinsaetze` ist ebenfalls immer leer — es
gibt keine eigene Abklingzeit-Historie fürs Rad —, ein am
`jokerBasis.standard` gesetzter `abklingzeit`-Wert bleibt für das Rad
deshalb wirkungslos, selbst wenn er für echte Joker greift.

Ausdrücklich NICHT Teil dieses Schritts: `darfWiderrufen` (`jokerBasis`),
`zulaessigeZiele`/`duellPlan` (`duellJoker`), `pruefeEinsatz`/`pruefeKlassen`
(`limitKlassen`) — deren Zeilen in der Tabelle oben stehen weiterhin auf
**0**.

**2026-08-04, Schritt 4 aus Abschnitt 5 umgesetzt: die Duell-Einsätze.**
`duellJoker.js` bekam `einsaetzeAusTipps(tipps, { spieltagVon })` — übersetzt
die roh gespeicherten Tipps (`tip.duell = { auf, typ }`) in die Form, die
`applyDuellJoker` als drittes Argument erwartet
(`[{ spieltag, vonUserId, aufUserId, typ }]`). Nur `spielIds`/`basis` bleiben
draußen (Spiel-Ebene, spätere Verfeinerung); fehlt `basis`, behandelt
`applyDuellJoker` das bereits korrekt als „ganzer Spieltag zählt". Je Spieler
UND Spieltag zählt höchstens EIN Einsatz — bei mehreren Kandidaten (z. B. zwei
Duell-Tipps am selben Spieltag) gewinnt der mit dem frühesten `kickoff`, bei
Gleichstand die kleinere `matchId`, NICHT der erste Eintrag in der Eingabe —
sonst hinge das Ergebnis an der Reihenfolge der Datenbank-Antwort statt an den
Daten selbst (getestet mit gedrehter Eingabereihenfolge). Die Rückgabe ist
chronologisch nach `spieltag` sortiert, weil `applyDuellJoker` `maxProSaison`
chronologisch deckelt.

Verkabelt an ALLEN fünf tatsächlich gefundenen Aufrufern von
`scoreLeaderboardHistory` (deckt sich mit der in der Vorgabe erwarteten
Aufteilung 2/2/1): `store.mock.js` (`getLeaderboard`, `getLeaderboardHistory`),
`store.supabase.js` (`getLeaderboard`, `getLeaderboardHistory`) und
`Historie.jsx`. An allen fünf Stellen wird `einsaetzeAusTipps(...)` aus
denselben Roh-Tipp-Einträgen abgeleitet, die dort ohnehin schon für
`scoreLeaderboardHistory` gebaut werden. `applyDuellJoker` ist damit **kein
No-op mehr** in der echten Kette (Tabelle in Abschnitt 2 oben aktualisiert).

⚠️ `einsaetzeAusTipps` braucht für den Gleichstand-Fall zusätzlich `matchId`
je Tipp — die `entries`, die `getLeaderboard`/`getLeaderboardHistory` für
`scoreLeaderboardHistory` selbst bauen (`eintragVon(...)`), tragen dieses Feld
NICHT (nur `userId`, `name`, `tip`, `snapshot`, `result`, `matchday`,
`wettbewerb`, `kickoff`). An den vier Stellen in `store.mock.js`/
`store.supabase.js` wird deshalb für `einsaetzeAusTipps` extra eine um
`matchId` angereicherte Kopie gebaut (`{ ...eintragVon(t), matchId:
t.match_id }`), statt `entries` selbst zu verändern — in `Historie.jsx` ist
das nicht nötig, weil `getRoundEntries` `matchId` schon mitliefert.

**Die Spieler-Eingabe** sitzt in `Tippabgabe.jsx`, im selben Chip-Muster wie
die bestehende Ranking-/Joker-Auswahl (nur in Coral statt Gold). Sichtbar nur,
wenn `rules.duell.enabled` UND `duellPlan({ spieltage: SPIELTAGE, duell:
rules.duell, basis, seed: roundId, userIds: board.map(b => b.userId) })` den
aktuellen Spieltag für DIESEN Spieler als Duell-Spieltag ausweist — `basis`
kommt aus `basisFuer("duell.klau"|"duell.block", rules)`, wie bei
`pruefeJokerEinsatz`. Die Ziel-Auswahl läuft über `zulaessigeZiele(board,
userId, rules.duell, { bisherigeEinsaetze: einsaetzeAusTipps(alleTipps),
aktuellerSpieltag })`; `alleTipps` (seit Schritt 2 im Screen-State) wurde dafür
um `kickoff` und den rohen `tip` ergänzt — vorher trug es nur die für
`kontoVerlauf` gebrauchten Felder. Beim Speichern wird `tip.duell = { auf,
typ }` nur mitgeschickt, wenn eine erneute Prüfung gegen `zulaessigeZiele` in
diesem Moment noch zulässig ist (dasselbe Muster wie `gewichtungSicher` beim
Ranking-Gewicht) — sonst wird das Duell verworfen statt ungeprüft übernommen.
Ist die Ziel-Liste leer, zeigt der Screen einen Hinweistext statt einer leeren
Auswahl (Muster `narrenGrund`/`einsatzGrund`); da `zulaessigeZiele` selbst
keinen strukturierten Grund liefert, ist der Text bewusst allgemein gehalten
(zählt die möglichen Ursachen auf, statt eine einzelne zu benennen).

✅ **Entschieden am 05.08.2026** (siehe unten, Liste der Teil-Wirkungen):
es gilt die LÄNGERE Abklingzeit, umgesetzt in `duellBasis(rules)`.
Der ursprüngliche Text der offenen Frage:

⚠️ ~~**Offene Entscheidung, nicht im Plan festgelegt:**~~ Sind sowohl „klau" als
auch „block" in `rules.duell.typen` erlaubt, nutzt `duellPlan` (genauer:
dessen `basis`-Parameter für die Abklingzeit) die Basis von „klau" — es gibt
nur EINEN Plan je Spieler, keinen getrennt nach Art, und der Plan-Text nennt
nur „`basis` kommt aus `basisFuer(\"duell.klau\"|\"duell.block\", rules)`"
ohne Tie-Break-Regel für den Fall, dass beide Arten aktiv sind und
unterschiedliche `abklingzeit`-Werte tragen.

Ausdrücklich NICHT Teil dieses Schritts: `darfWiderrufen` (`jokerBasis`),
`pruefeEinsatz`/`pruefeKlassen` (`limitKlassen`) — deren Zeilen in der Tabelle
oben stehen weiterhin auf **0**.

**2026-08-04, Schritt 5 aus Abschnitt 5 umgesetzt: Kontingente und Widerruf —
die letzte Zeile der Tabelle.**

`jokerBudget.js` bekam `einsaetzeAllerArten(tipps, rules)` — vereinigt die
Joker-Käufe (`istNarrenKauf`, dieselbe Unterscheidung wie in `kontoVerlauf`)
mit den Duell-Einsätzen aus `einsaetzeAusTipps` (`duellJoker.js`) zu EINER
Liste in der Form, die `pruefeEinsatz`s `historie` erwartet. Bewusst NICHT in
`duellJoker.js` gebaut, wie der Plan zuerst vorschlug: `jokerBudget.js`
importiert bereits `duellJoker.js` (`sanitizeDuellJoker`, `fensterVon`), ein
Import in die Gegenrichtung erzeugte denselben Zyklus, vor dem der
Kopfkommentar von `duellJoker.js` beim Verhältnis zu `jokerBasis.js` bereits
warnt. `istNarrenKauf` liegt ohnehin in `jokerBudget.js` — die Funktion dort
zu bauen bedeutete keinen neuen Import, nur den bereits bestehenden in
gewohnter Richtung genutzt.

Verkabelt in `Tippabgabe.jsx`, an ZWEI Stellen im `submit()`, jeweils nur in
denselben Fällen, in denen die vorangehenden Prüfungen aus Schritt 1/2 auch
laufen: einmal für den Joker (direkt nach der Narren-Deckung, außerhalb des
Einsatz-Modus — `einsaetzeAllerArten` erzeugt dort ohnehin keinen Eintrag),
einmal für den Duell-Joker (nachdem `zulaessigeZiele` das Ziel im Moment des
Speicherns erneut bestätigt hat). `historie` ist `einsaetzeAllerArten`
angewandt auf `alleTipps`, OHNE den Tipp zu diesem `matchId` — das ist der
Einsatz, der hier gerade geprüft wird, er darf sich nicht selbst im Weg
stehen. `kontext.board`/`.budgetStand`/`.ausgeloesteEreignisse`: `board` liegt
seit Schritt 1 vor, `budgetStand` wird aus dem Kontoverlauf (`kontoVerlauf`,
Schritt 2) für den betreffenden Spieltag abgeleitet — NICHT aus
`budgetVerlauf`, wie `joker-oekonomie.md` an der Stelle noch sagt (der
Planauftrag zu diesem Schritt weist ausdrücklich auf den Kontoverlauf, der
den tatsächlichen Stand nach Käufen zeigt, nicht nur den rohen Zufluss).
`ausgeloesteEreignisse` kommt aus den ohnehin schon geladenen `gutschriften`
(`erspielteJoker`) des eingeloggten Spielers — kein neuer Speicherort nötig,
weil `pruefeEinsatz`s `nachEreignis`-Aktivierung ohnehin nur nach `userId`
filtert und hier nur der eigene Nutzer geprüft wird. Bei Ablehnung: neuer
`saveState`-Wert `"klasseUngueltig"` mit `klasseGrund` (alle Gründe aus
`gruende` zusammengefasst), exakt nach dem Muster von `jokerUngueltig`/
`narrenUngueltig`.

`darfWiderrufen` bekam zwei eigene, von den obigen UNABHÄNGIGE Prüfblöcke in
`submit()` — unabhängig deshalb, weil deren Bedingung einen AKTIVEN neuen
Joker verlangt (`joker === true || gewichtEffektiv !== 1`) und eine
ENTFERNUNG (neuer Zustand: kein Joker) dort nie ankäme. Dafür merkt sich ein
neuer Screen-Zustand `urspruenglich` (befüllt beim Laden des Tipps, aus
`dieser?.tip?.joker`/`.gewicht`/`.duell`), was beim Öffnen bereits gespeichert
war. Ein Widerruf liegt vor, wenn dieser ursprüngliche Zustand aktiv war UND
der neue Zustand entweder inaktiv ist ODER (nur Ranking) ein ANDERES Gewicht
trägt — „vorher keiner, jetzt einer" erfüllt den `vorherGesetzt`-Wächter
nicht und bleibt unangetastet, dafür bleibt weiterhin nur `pruefeJokerEinsatz`
zuständig. `basis` kommt aus `basisFuer(jokerArt, rules)` mit der VORHERIGEN
Art (bei Duell: `urspruenglich.duellTyp`, nicht der neu gewählte), `jetzt` =
`Date.now()`, `anpfiff` = `SNAP.kickoff`. Bei Ablehnung: `saveState`
`"widerrufUngueltig"` mit `widerrufGrund`, dasselbe Meldungs-Muster.

**Mit diesem Schritt steht in der Tabelle oben keine Null mehr.** Alle sieben
ursprünglich toten Kontaktstellen aus Abschnitt 2 sind verkabelt. Trotzdem
bleibt offen, was schon in den vorherigen Schritten ausdrücklich als
Einschränkung benannt wurde und durch Schritt 5 nicht behoben wird:

- ~~**Rad-Felder mit Joker-, Narren- oder Modifikator-Belohnung**~~
  ✅ **ZWEI VON DREI BEHOBEN (05.08.2026)**, die dritte ausgewiesen.
  Neu: `drehradBelohnungen()` in `drehradBoard.js` übersetzt die Ziehungen in
  die Formen, die die BESTEHENDEN Töpfe erwarten — kein neuer Kanal:
  - **Joker** → dieselbe Gutschrift-Form wie `ereignisse.auswerten()`
    (`{ userId, matchday, belohnung }`). Ein Rad-Joker landet damit im selben
    Vorrat wie ein erspieltes Ereignis (`kontingent`) und unterliegt derselben
    Regel „wirkt ab dem Spieltag, an dem er verdient wurde, nie rückwirkend".
    In `Tippabgabe.jsx` an die vorhandene `gutschriften`-Liste angehängt.
  - **Narren** → neuer, sehr schmaler Eingang `zusatz` in `kontoVerlauf`.
    ⚠️ Ausdrücklich NICHT über die `leistung`-Quelle: die multipliziert eine
    ANZAHL mit `proEreignis`, ein Rad-Feld nennt aber einen FESTEN Betrag —
    durch die Quelle geschickt käme eine andere Zahl heraus als auf dem Feld
    steht. `zusatz` hat keinen Takt, keinen Verfall und keine Kurve; es
    unterliegt aber weiter der Grundregel „kein Schuldenmodell".
  - **Modifikator** → wird GEMELDET (`drehradBelohnungen(...).modifikatoren`),
    aber nicht verrechnet. Er müsste je Spieltag in `totalModifier` fließen,
    und das ist der Wertungs-Pfad — das gehört einzeln gebaut und geprüft.
    Ausgewiesen statt still verschluckt: wer ihn baut, findet ihn dort.

  Gemessen: ein Rad mit Joker- und Narren-Feldern über 42 Spieltage ergibt
  1 erspielten Joker im Vorrat und hebt den Narren-Stand von 84 auf 144
  (zweimal 30). Tests in `drehradBoard.test.js` und `jokerBudget.test.js`.
- ~~**Die `klau`/`block`-Basiswahl aus Schritt 4**~~ ✅ **ENTSCHIEDEN
  (05.08.2026):** neu `duellBasis(rules)` in `jokerBasis.js` — **es gilt die
  LÄNGERE Abklingzeit.** Begründung: der Plan ist GEMEINSAM, an einem
  Plan-Spieltag darf der Spieler jede erlaubte Art einsetzen. Nähme man die
  kürzere, könnte er die strengere Art häufiger spielen, als ihre eigene
  Einstellung erlaubt — die Einstellung liefe ins Leere. Die längere
  verschenkt höchstens Gelegenheiten der lockereren Art; das ist die harmlose
  Richtung, dieselbe Wahl wie bei `wirktAb` in `regelAbstimmung.js`.
  Die alte Regel („klau zuerst") war keine Regel, sondern eine Reihenfolge.
- **`kontext.adminFreigaben`** (Schritt 1): weiterhin immer leer, mangels
  Speicherort für Admin-Freigaben — `wer: "adminFreigabe"` lehnt an JEDER
  Kontaktstelle konsequent ab, die diesen Kontext nutzt (Joker, Rad).
- ~~**`letzteEinsaetze` fürs Rad**~~ ✅ **BEHOBEN (05.08.2026).** Der Fehler
  war die Frage: die Historie musste gar nicht von außen kommen — **die eigene
  Dreh-Historie IST die Abklingzeit-Historie des Rads**, und `drehradZiehungen`
  erzeugt sie gerade. Die Drehungen laufen chronologisch, beim Prüfen von
  Spieltag N steht also genau das drin, was davor gefallen ist, und nichts aus
  der Zukunft. Ein von außen mitgegebener Eintrag wird nicht verworfen,
  sondern ergänzt.
  Gemessen an einem Rad, das ohne Bremse an jedem Spieltag dreht:
  Abklingzeit 0 → 12 Drehungen, 2 → 6 (jeder zweite), 4 → 3 (jeder vierte).
  Vorher waren es immer 12.
- ~~**`stand`/`standAmTag` schlüsseln nur über `matchday`**~~ ✅ **BEHOBEN
  (05.08.2026)** — und der Schaden war größer als hier beschrieben.
  Neu: `verlaufNachRundenSpieltag(verlauf, achse)` in `zeitachse.js`
  schlüsselt den Leaderboard-Verlauf auf RUNDEN-Spieltage um; die sind über
  alle Wettbewerbe eindeutig, die Kollision ist damit weg. Fallen mehrere
  Liga-Spieltage in denselben Runden-Spieltag, gewinnt der LETZTE — der
  Verlauf ist kumulativ, der erste wäre ein Zwischenstand mitten im Tag.
  🔴 **Beim Nachmessen kam heraus, dass es nicht nur eine Kollision war,
  sondern ZUKUNFTSWISSEN:** `kontoVerlauf` fragt `standAmTag(stand, t)` mit
  t als Spieltag 1…N. Trug `stand` Liga-Spieltage, fand die Suche bei t=4 den
  Bundesliga-Spieltag 3 — der in Runden-Spieltagen aber erst bei 6 liegt. Die
  Budget-Quelle „Rückstand" zahlte also auf Basis eines Tabellenstands, den es
  zu diesem Zeitpunkt gar nicht gab. Gemessen: 18 Narren an einem Spieltag,
  an dem es 0 sein müssen. Genau das, was der Kopfkommentar von `standAmTag`
  ausdrücklich ausschließen will. Test in `zeitachse.test.js`.
  Dazu in `Tippabgabe.jsx` zwei weitere Werte derselben Familie korrigiert:
  `spieltage` stand fest auf 34 (die Liga-Saison) statt auf der Länge der
  Runde, und der Narren-Kontostand wurde über den Liga-Spieltag
  nachgeschlagen.

Keine dieser fünf Lücken ist eine tote Kontaktstelle im Sinn dieses Dokuments
— jede der betroffenen Funktionen hat echte Aufrufer. Es sind bekannte,
bereits an ihrer jeweiligen Stelle benannte Teil-Wirkungen, keine neuen
Funde.
