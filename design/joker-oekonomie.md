# Joker-Ökonomie — Budget, Kosten, Limitierungsklassen, Bibliothek, Aufwand

**Spec + Umsetzungsplan.** Account 2 (Andre), 2026-07-31, nach Konzept des
Nutzers. Ergänzt `design/duell-joker.md` — dort steht EIN Joker-Typ, hier steht,
**was jeder Joker kostet und wie oft er überhaupt darf**.

> **Das Konzept in einem Satz:** Bisher ist jeder Joker-Topf eine eigene Insel
> mit eigenem Deckel. Ab hier gibt es eine gemeinsame Währung (Budget), einen
> Preis je Joker-Art, und **Limitierungsklassen** — benannte Gruppen von
> Joker-Arten, die sich ein Kontingent TEILEN und dadurch ineinandergreifen.

## 0. Was schon da ist und nicht neu gebaut wird

| Vorhanden | Wofür wir es nutzen |
|---|---|
| `jokerPlan.js` | „wann gibt es einen Joker" — Frequenz, blockweise Verteilung |
| `ereignisse.js` | Joker ERSPIELEN. Wird zur Budget-Quelle `leistung`, nicht ersetzt |
| `spielauswahl.js` (`spieleProSpieltag`, `AUSWAHL_LIMITS.maxSpiele`) | Grundzahl fürs Aufwands-Rating |
| `presets.js`, `presetMerge.js` | Erstname und Aspekte, an die der Zweitcode andockt |
| `reglerWarnung.js` | Empfehlungsbänder und Kombinationsregeln |
| `PresetRating.jsx` | Vorbild fürs Aufwands-Panel — aber **anderes Rating** (dort: Underdog-Neigung, hier: Aufwand) |

---

# Baustein 1 — `src/lib/jokerBudget.js`

Die Währung. `rules.budget`.

## 1.1 Woher das Budget kommt (`quellen`)

Eine Liste, mehrere gleichzeitig erlaubt — sie addieren sich.

| Quelle | Parameter | Was sie tut |
|---|---|---|
| `startkapital` | `betrag` | Einmalig zu Saisonbeginn. |
| `gleich` | `betrag`, `takt` | Jeder bekommt pro Zeitraum dasselbe. Der Normalfall. |
| `leistung` | `proEreignis` | Gekoppelt an `ereignisse.js`. **Nicht neu bauen** — ein ausgelöstes Ereignis zahlt statt einer Joker-Gutschrift jetzt wahlweise Budget aus. |
| `rueckstand` | `proPunktRueckstand`, `deckel` | Wer hinten liegt, bekommt mehr. ⚠️ Doppelt mit `aufholen` — muss in `konflikte()`. |
| `platzierung` | `kurve` (`linear`\|`top-schwer`) | Nach Rang. Verstärkend statt ausgleichend — gehört ins Empfehlungsband als „nur mit Deckel". |

`takt`: `saison` · `spieltag` · `alleNSpieltage` (+`n`) · `phase` (nutzt
`fensterVon` aus `duellJoker.js` — eine Quelle für Saison-Fenster).

## 1.2 Was mit ungenutztem Budget passiert (`verfall`)

| Wert | Wirkung |
|---|---|
| `nie` | Budget sammelt sich unbegrenzt. ⚠️ Führt zum Horten und zur Schluss-Salve. |
| `periode` | Verfällt am Ende jedes Takts. Zwingt zum Einsetzen. |
| `deckel` (+`maxAnsparen`) | Sammeln erlaubt bis zur Obergrenze. **Vorgabe** — der Mittelweg. |

## 1.3 Was ein Joker kostet (`preise`)

`preise: { "<jokerArt>": <preis> }`. Joker-Arten sind stabile Schlüssel:
`joker.einzel` · `joker.ranking` · `duell.klau` · `duell.block` ·
`ereignis.trost` · `saison.wette`.

**Preisdynamik** (`preisModus`):
- `fix` — jeder Einsatz kostet gleich viel.
- `steigend` (`steigerung`, z. B. 1,5) — jeder WEITERE Einsatz derselben Art in
  derselben Periode kostet das Vielfache. Der eleganteste Selbst-Deckel: der
  erste Klau ist billig, der vierte ruinös. **Vorgabe.**
- `knappheit` — der Preis steigt, je mehr Spieler in dieser Periode dieselbe Art
  gespielt haben. Erzeugt Runden-Dynamik („heute klauen alle, morgen lohnt es").

⚠️ **Ein Einsatz ohne Deckung findet nicht statt.** Kein Schuldenmodell, kein
negatives Budget — sonst entsteht genau der Punkte-Kanal, den `ereignisse.js`
ausschließt.

---

# Baustein 2 — `src/lib/limitKlassen.js`

**Das Herzstück.** Eine Limitierungsklasse ist eine benannte Gruppe von
Joker-Arten mit gemeinsamem Kontingent, gemeinsamem Zeitfenster und einer
Aktivierungs-Bedingung.

```js
{
  id: "angriff",
  label: "Angriffs-Joker",
  mitglieder: ["duell.klau", "duell.block"],
  max: 3,
  proZeitraum: "saison",        // saison | spieltag | nSpieltage | phase
  n: 5,                          // nur bei nSpieltage
  aktivierung: { typ: "abRueckstand", wert: 25 },
}
```

## 2.1 Warum Klassen und nicht ein Deckel je Joker

Weil sie **ineinandergreifen sollen**. Ein Einsatz zählt gegen **jede** Klasse,
in der seine Art Mitglied ist. Damit lassen sich Regeln bauen, die es sonst
nicht gäbe:

- „Höchstens 3 Angriffe pro Saison" (Klasse A: klau + block, max 3, Saison)
- „…davon höchstens einer pro 5 Spieltage" (Klasse B: dieselben Mitglieder, max
  1, `nSpieltage: 5`)
- „…und insgesamt höchstens 6 Joker jeder Art pro Saison" (Klasse C: alle Arten)

Drei Klassen, dieselbe Art, drei Grenzen gleichzeitig. Genau das ist gemeint mit
„Unterkontingente, die aufeinander greifen".

## 2.2 Aktivierung — was eintreten muss (`aktivierung.typ`)

| Typ | Parameter | Bedingung |
|---|---|---|
| `immer` | — | Klasse ist offen. Vorgabe. |
| `abSpieltag` | `wert` | Erst ab Spieltag N. |
| `fenster` | `von`, `bis` | Nur in diesem Bereich. |
| `abRueckstand` | `wert` | Nur wer mindestens N Punkte hinter Platz 1 liegt. |
| `abVorsprung` | `wert` | Nur wer mindestens N Punkte VORNE liegt — die Kehrseite, für „der Führende darf mehr riskieren". |
| `nachEreignis` | `ereignisKey` | Ein Ereignis aus `ereignisse.js` muss ausgelöst haben. |
| `abBudget` | `wert` | Erst ab N Budget. |
| `nurGegenFuehrende` | `plaetze` | Nur Einsätze gegen die ersten N. Verzahnt sich mit `duell.zielWahl`. |

## 2.3 Auswertung

`pruefeEinsatz(einsatz, klassen, historie, kontext)` → 
`{ erlaubt: bool, gruende: [{ klasseId, grund }] }`

**Alle Klassen müssen zustimmen.** Die Ablehnung nennt jede verletzte Klasse
einzeln — eine Sammelmeldung „nicht erlaubt" ist in einem Baukasten unbrauchbar,
der Admin muss sehen, WELCHE seiner Regeln greift.

⚠️ **Reine Prüffunktion, kein Zustand.** `historie` kommt herein, wird nicht
gehalten — dieselbe Bauart wie `invalidJokerMatchdays` in der Engine.

---

# Baustein 3 — `src/lib/jokerBibliothek.js`

Die kuratierten Kombinationen mit Namensschema.

## 3.1 Das Namensschema

```
<Erstname>-<Kombiname>
Standard-Rundumschlag      ·  Hardcore-Nadelstiche
Gemütlich-Rundumschlag     ·  Underdog-Party-Sparflamme
```

- **Erstname** = der `key` des Presets (`presets.js`) — die WERTUNG.
- **Kombiname** = der `key` aus dieser Bibliothek — die JOKER-ÖKONOMIE.

**Kein Saison- oder Jahreskürzel.** Eine Einstellung ist zeitlos; ein Jahr im
Code ließe sie altern, obwohl sich nichts an ihr ändert. Der Code ist lesbar
und maschinell zerlegbar (`zerlegeCode(code)` → `{ presetKey, kombiKey }`).

## 3.1b ⚠️ Die WÜRZE — die gemeinsame Achse über alle Preset-Familien

**Das ist der eigentliche Punkt der Codierung, nicht der Name.** Bisher trägt
jede Ebene ihre eigene Stufen-Sprache (`einfachRegler.js`: `zahm`/`normal`,
`wuerze`/`spuerbar`). Quer über die Ebenen gibt es nichts — und deshalb kann
niemand sehen, was zusammenpasst.

Jedes Preset **jeder** Familie bekennt deshalb eine `wuerze` von 0 bis 3:

| Wert | Name | Was die Ebene tut |
|---|---|---|
| 0 | `pur` | Reines Tippen. Die Ebene fällt nicht auf. |
| 1 | `würzig` | Spürbar, aber die Wertung bleibt der Kern. |
| 2 | `kräftig` | Entscheidet regelmäßig einzelne Spieltage. |
| 3 | `wild` | Kann die Saison entscheiden. |

### Die Regel: Würze ADDIERT sich, sie multipliziert sich nicht

Das ist die Beobachtung des Nutzers, in eine Zahl gegossen: **wenn die Wertung
schon stark moduliert, braucht es kaum noch Joker.** Beide Ebenen ziehen aus
demselben Vorrat.

```
Gesamtwürze = wuerze(Wertung) + wuerze(Joker-Ökonomie) + wuerze(Saison-Wetten)
Empfehlungsband: 2 bis 4
```

| Kombination | Summe | Urteil |
|---|---|---|
| Underdog-Party (3) + Sparflamme (0) | 3 | ✅ Die Wertung trägt die Spannung allein. |
| Gemütlich (0) + Rundumschlag (3) | 3 | ✅ Ruhige Wertung, die Joker machen den Reiz. |
| Standard (1) + Gleichgewicht (2) | 3 | ✅ Die Empfehlung. |
| Underdog-Party (3) + Rundumschlag (3) | 6 | ❌ Zwei laute Ebenen übertönen einander. Reine Lotterie, und der höchste Aufwand. |
| Gemütlich (0) + Sparflamme (0) | 0 | ⚠️ Sehr ruhig — legitim, aber die Oberfläche fragt einmal nach. |

### 🔴 Die Additionsregel ist GERATEN, nicht gemessen

**Das muss im Code stehen und in der Oberfläche sichtbar sein.** `CLAUDE.md`
hält als Lehre fest, dass in diesem Projekt schon zwei Fehlmessungen aus einer
ANNAHME statt einer Messung entstanden sind (`RHO` in `oddsApi.js`). Die
Würze-Summe ist heute genau so eine Annahme.

Und es gibt ein konkretes Argument, dass sie falsch ist: **die Ebenen sind nicht
unabhängig.** Die Wertung bestimmt die Streuung der Rohpunkte, die Joker
MULTIPLIZIEREN diese Streuung (`jokerFactor` greift in `scoreTip` ganz zuletzt).
Eine laute Wertung plus laute Joker ist deshalb vermutlich eher ein PRODUKT als
eine Summe — während eine strenge Wertung (Hardcore) mit vielen Jokern wenig
anrichtet, weil kaum etwas da ist, das sich verstärken ließe. Additiv behandelt
beide Fälle gleich, und das ist mit hoher Wahrscheinlichkeit falsch.

**Deshalb drei Regeln:**

1. **Die Würze ist keine Balance-Aussage.** Ob eine Runde fair ist, sagt die
   AMPEL, und die ist gemessen (`balanceSim.js` → `bewerten()`). Die Würze sagt
   nur, wie LAUT sich etwas anfühlt. Drei verschiedene Fragen, drei verschiedene
   Wahrheitsquellen — sie dürfen sich nicht gegenseitig vertreten:

   | Frage | Anzeige | Quelle |
   |---|---|---|
   | Ist es fair? | Ampel | gemessen (`balanceSim`) |
   | Wie laut fühlt es sich an? | Würze | **geschätzt** |
   | Wie viel Arbeit ist es? | Aufwand | gerechnet (`aufwand.js`) |

2. **Die Würze verengt NIE etwas.** Kein Regler, keine Grenze, keine Sperre.
   Sie ist ein Anhaltspunkt, wie das Empfehlungsband — dieselbe Regel wie
   „eine Messung verengt nie `RULE_LIMITS`" in `reglerWarnung.js`.

3. **Die Summenformel liegt an EINER Stelle** (`wuerzeGesamt(teile)`) und ist
   ausdrücklich als vorläufig markiert. Wird sie später gemessen, ändert sich
   eine Funktion und nicht dreißig Aufrufstellen.

### Wie aus der Schätzung eine Messung wird — die Community-Schleife

**Das ist der eigentlich tragfähige Weg, und die Infrastruktur steht schon:**
der Store kennt `publishPreset({ name, rules, creatorId })` und
`getPresetByCode(code)`. Ein Admin kann sein Regelwerk also bereits als Kurzcode
veröffentlichen.

Was fehlt, ist der Rückweg: **was ist aus einer geteilten Einstellung geworden?**
Vorbereitet wird das jetzt, geschlossen wird die Schleife erst mit echten Runden:

- Ein veröffentlichter Code trägt seine **behauptete** Würze mit (`wuerze`-Feld
  im Preset, vom Ersteller oder aus `wuerzeVon(rules)`).
- Läuft eine Runde damit zu Ende, lassen sich zwei Zahlen ohne jede neue
  Datenquelle ablesen: **wie oft der Führende noch gewechselt hat** und **wie
  groß der Abstand 1. zu 2. war**. Beides liegt im Verlauf, den
  `scoreLeaderboardHistory` ohnehin baut. Genau diese beiden Zahlen misst der
  Simulator heute schon als „Bester gewinnt" und „Vorsprung 1./2."
  (Modulkopf `saisonform.js`) — die Skalen sind also vergleichbar.
- Aus genug echten Runden wird die Würze **abgeleitet statt behauptet** — nach
  demselben Muster, mit dem `reglerWarnung.js` sein Empfehlungsband aus den
  Presets ableitet, statt es zu tippen.

⚠️ **Nicht jetzt bauen.** Ohne echte Runden gibt es nichts zu lernen, und ein
Bewertungssystem ohne Daten erzeugt nur Scheingenauigkeit. Was jetzt kostenlos
mitgeht, ist allein das **Feld** am veröffentlichten Preset. Das kostet eine
Spalte und rettet später die Datenbasis.

### Warum NICHT gleiche Namen für zusammengehörige Presets

Der naheliegende Weg wäre, jeder Familie ein „Würzig" zu geben und
gleichnamige Presets als Paar zu zeigen. **Das wäre genau falsch** — es würde
`wild` + `wild` als Traumpaar ausweisen, obwohl das die schlechteste
Kombination ist. Die Ebenen ergänzen sich, sie spiegeln sich nicht.

Deshalb in der UI eine **Würze-Waage** statt Namensgleichheit: eine Leiste, die
den Gesamtwert zeigt, und auf jeder Preset-Karte die Würze als Punkte (●●○○).
Wer eine laute Wertung wählt, sieht die Leiste sofort volllaufen und findet die
passende Joker-Ökonomie, indem er nach unten greift. Der Anhaltspunkt ist die
Summe, nicht der Name.

`wuerzeVon(rules)` rechnet den Wert auch für ein frei zusammengestelltes
Regelwerk aus, damit die Waage in der Profi-Stufe nicht ausfällt.

## 3.2 Die Kombinationen (Startkatalog)

Jede trägt: `key`, `label`, `desc`, **`wuerze`**, `neigung`, `dichte`,
`schaerfe` und ein vollständiges `{ budget, limitKlassen, duell, joker }`.

| key | Label | Würze | Neigung | Dichte | Schärfe | Idee |
|---|---|:---:|---|---|---|---|
| `sparflamme` | Sparflamme | 0 | neutral | sparsam | zahm | Fast aus. Der Partner für eine laute Wertung. |
| `nadelstiche` | Nadelstiche | 1 | neutral | sparsam | scharf | Wenige, aber harte Einsätze. Steigende Preise. |
| `gleichgewicht` | Gleichgewicht | 2 | ausgleich | mittel | zahm | Der Normalfall. Budget gleich für alle, Angriffe nur im letzten Drittel. |
| `schlussoffensive` | Schluss-Offensive | 2 | ausgleich | sparsam | scharf | Alles im Schlussspurt, Budget spart sich bis dahin an. |
| `favoritenjagd` | Favoriten-Jagd | 3 | underdog | mittel | scharf | Budget aus Rückstand, `nurGegenFuehrende`. Die Runde jagt den Ersten. |
| `rundumschlag` | Rundumschlag | 3 | neutral | dicht | zahm | Viele Joker, jeder schwach. Der lebhafte Modus. ⚠️ Höchster Aufwand — Rating beachten. |

Die Würze der bestehenden Wertungs-Presets (`presets.js`) wird dort ergänzt —
**additiv, ohne einen einzigen Regelwert anzufassen**, damit
`presets.balance.test.js` unberührt bleibt:
`gemuetlich` 0 · `standard` 1 · `joker` 2 · `rangliste` 2 · `hardcore` 2 ·
`underdog-party` 3.

**Unsere Empfehlung ist `gleichgewicht`** — und in der UI klar als solche
markiert, wie `letztesDrittel` bei den Duell-Jokern.

---

# Baustein 4 — `src/lib/aufwand.js`

„Wie viel muss ich als Spieler eigentlich einstellen?"

## 4.1 Was gerechnet wird

`aufwand(rules, kontext)` → 

```js
{
  spieleProSpieltag,        // aus spielauswahl.js
  tippEntscheidungen,       // Spiele × Felder (Ergebnis, ggf. Torschützen)
  jokerEntscheidungen,      // aus Budget, Preisen und Limitklassen HOCHGERECHNET
  gesamtProSpieltag,
  minutenSchaetzung,
  stufe,                    // entspannt | normal | viel | zuviel
  hinweise: [],
}
```

## 4.2 ⚠️ Relativ messen, nicht an einer festen Zahl

Übernommen aus der Überfüllungs-Warnung in `zeitachse.js`: über vier Ligen sind
39 Spiele eine normale Woche, mit CL 57. Eine feste Schwelle meldet den
Normalfall als Problem. Die Stufe bezieht sich deshalb auf den **Median-Spieltag
der gewählten Runde**, nicht auf eine Konstante.

Die harte Grenze bleibt `AUSWAHL_LIMITS.maxSpiele` (200) — die ist technisch,
nicht ergonomisch, und wird nicht angefasst.

## 4.3 Wo es auftaucht

- **Während der Spielauswahl**, live: „34 Spiele · ~12 Entscheidungen pro
  Spieltag · etwa 7 Minuten". Genau der Moment, in dem jemand versehentlich alle
  fünf Wettbewerbe anhakt.
- **Als Panel in der Spielerstellung**, Muster `PresetRating.jsx`.
- **Als Hinweis an der Joker-Ökonomie**, wenn eine Kombination den Aufwand
  treibt (`rundumschlag` + alle Wettbewerbe).

Der Zweck ist ausdrücklich **Zeitschutz, keine Balance**: zu viele
Entscheidungen pro Woche sind der häufigste Grund, warum Mitspieler aussteigen.

---

# 5. Detailstufen (durchgehend für alle vier Bausteine)

| Stufe | Was sichtbar ist |
|---|---|
| **einfach** | Nur die Bibliothek: sechs Karten mit Name, Beschreibung, Aufwands-Ampel. Ein Klick. |
| **anpassen** | Schieberegler auf der GEWÄHLTEN Kombination: Budgethöhe, Preisniveau, Dichte, Schärfe — je EIN Regler, der mehrere Werte gemeinsam bewegt (Muster `presetMerge.js`: zusammengehörige Werte wandern zusammen, damit keine unvermessene Balance entsteht). |
| **profi** | Jede Quelle, jeder Preis, jede Limitierungsklasse einzeln — inklusive „neue Klasse anlegen". |

---

# 5b. Verbindliche Signaturen für Baustein 3 und 4

Damit die Umsetzung nicht raten muss.

## Baustein 3 — `jokerBibliothek.js`

- `KOMBINATIONEN` — der Katalog aus 3.2, **nach `wuerze` aufsteigend sortiert**.
- `WUERZE_STUFEN` — `[{ wert, key, label, desc }]` für 0–3 (Tabelle 3.1b).
- `bildeCode(presetKey, kombiKey)` → `"underdog-party-sparflamme"`.
- `zerlegeCode(code)` → `{ presetKey, kombiKey }` oder `null`.

  ⚠️ **Die Falle:** Preset-Schlüssel enthalten Bindestriche (`underdog-party`),
  Kombi-Schlüssel nicht. Zerlegt wird deshalb am **LETZTEN** Bindestrich, und
  danach wird gegen beide Kataloge geprüft — ein Code, dessen Teile es nicht
  gibt, liefert `null` statt geraten zu werden. Ein Test sichert ab, dass kein
  Kombi-Schlüssel je einen Bindestrich enthält; sonst bricht die Zerlegung
  still, sobald jemand einen hinzufügt.
- `wuerzeVon(rules)` → 0–3 für ein FREI zusammengestelltes Regelwerk, damit die
  Waage in der Profi-Stufe nicht ausfällt.
- `wuerzeGesamt(teile)` → `{ summe, band: [2, 4], urteil: "leise"|"gut"|"laut" }`.
  **Die eine Stelle mit der vorläufigen Formel** — Kopfkommentar muss sagen,
  dass sie geschätzt ist (siehe 3.1b).

Die `wuerze` der Wertungs-Presets kommt als **neues Feld neben `rules`** in
`presets.js` (`gemuetlich` 0 · `standard` 1 · `joker` 2 · `rangliste` 2 ·
`hardcore` 2 · `underdog-party` 3). Neben `rules`, nicht darin — dann bleibt
`presets.balance.test.js` unberührt. Eine Nachschlage-Tabelle in einer anderen
Datei wäre eine zweite Wahrheit und käme irgendwann auseinander.

## Baustein 4 — `aufwand.js`

- `aufwand(rules, kontext)` → das Objekt aus 4.1.
  `kontext = { spieleJeSpieltag: number[] }` — eine Zahl je Spieltag der
  gewählten Runde. Daraus kommt der **Median** (siehe 4.2), nicht der
  Mittelwert: ein einzelner englischer Wochen-Doppelspieltag zöge den Schnitt
  hoch und meldete den Normalfall als Problem.
- `AUFWAND_STUFEN` — `[{ key, label, desc, bisFaktor }]` für
  `entspannt` · `normal` · `viel` · `zuviel`. Die Schwellen sind **Vielfache des
  Medians**, keine absoluten Zahlen.
- `SEKUNDEN_JE_ENTSCHEIDUNG` — eine offen deklarierte Schätzung für die
  Minutenangabe. ⚠️ Im Kopfkommentar ausdrücklich als Schätzung markieren,
  nicht als Messung. Dieselbe Ehrlichkeit wie bei der Würze.
- `beschreibeAufwand(a)` → ein Satz für die UI.

# 6. Umsetzung in Schritten

Jeder Schritt für sich testbar und commitfähig. **Reihenfolge ist bindend**,
Baustein 2 braucht 1, die UI braucht beide.

1. `jokerBudget.js` + Test — Quellen, Takt, Verfall, Preise, Preisdynamik.
2. `limitKlassen.js` + Test — Klassen, Aktivierung, `pruefeEinsatz`.
3. `jokerBibliothek.js` + Test — Katalog, `bildeCode`, `zerlegeCode`.
4. `aufwand.js` + Test — Rechnung + Stufen, relativ zum Median.
5. Ins Regelwerk: `engine.js` (`DEFAULT_RULES.budget`, `rules.limitKlassen`,
   `sanitizeRules` delegiert), `presetMerge.js` (neuer Aspekt).
6. UI: `JokerOekonomie.jsx` (Bibliothek + Regler), `LimitKlassen.jsx` (Profi),
   `AufwandPanel.jsx`; Einbau in `Spielerstellung.jsx` und in die Spielauswahl.
7. Empfehlungsbänder + Kombinationsregeln in `reglerWarnung.js`.
8. Messen: sieht `balanceSim.js` die Ökonomie? (Nach heutigem Stand nein —
   eigener Blindstellen-Durchgang, wie bei `saisonform`.)

## 7. Kombinationsregeln, die von Anfang an mit müssen

- `verfall: "nie"` + `quelle: gleich` mit hohem Betrag → Schluss-Salve: alle
  sparen die ganze Saison und feuern am letzten Spieltag. Warnung + Korrektur
  auf `deckel`.
- `quelle: rueckstand` + `aufholen.enabled` → dieselbe Doppelbelohnung, die
  `ereignisse.js` bereits für den Trost-Joker meldet.
- `quelle: platzierung` ohne Deckel → der Führende zieht davon.
- `rundumschlag` + mehr als zwei Wettbewerbe → Aufwands-Warnung, kein
  Balance-Problem, aber der häufigste Aussteige-Grund.
