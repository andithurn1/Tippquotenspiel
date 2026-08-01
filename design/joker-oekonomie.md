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
<Erstname>-<Kombiname><Saisonkürzel>
Standard-Rundumschlag26      ·  Hardcore-Nadelstiche26
Gemütlich-Gleichgewicht26    ·  Underdog-Party-FavoritenJagd26
```

- **Erstname** = der `key` des Presets (`presets.js`) — die WERTUNG.
- **Kombiname** = der `key` aus dieser Bibliothek — die JOKER-ÖKONOMIE.
- **Saisonkürzel** = zwei Ziffern.

Zwei Achsen, weil sie unabhängig sind: dieselbe Joker-Ökonomie passt auf
verschiedene Wertungen. Der Code ist damit lesbar UND maschinell zerlegbar
(`zerlegeCode(code)` → `{ presetKey, kombiKey, saison }`).

## 3.2 Die Kombinationen (Startkatalog)

Jede trägt: `key`, `label`, `desc`, `neigung`, `dichte`, `schaerfe` und ein
vollständiges `{ budget, limitKlassen, duell, joker }`.

| key | Label | Neigung | Dichte | Schärfe | Idee |
|---|---|---|---|---|---|
| `gleichgewicht` | Gleichgewicht | ausgleich | mittel | zahm | Der Normalfall. Budget gleich für alle, Angriffe nur im letzten Drittel. |
| `nadelstiche` | Nadelstiche | neutral | sparsam | scharf | Wenige, aber harte Einsätze. Steigende Preise. |
| `rundumschlag` | Rundumschlag | neutral | dicht | zahm | Viele Joker, jeder schwach. Der lebhafte Modus. ⚠️ Höchster Aufwand — Rating beachten. |
| `favoritenjagd` | Favoriten-Jagd | underdog | mittel | scharf | Budget aus Rückstand, `nurGegenFuehrende`. Die Runde jagt den Ersten. |
| `schlussoffensive` | Schluss-Offensive | ausgleich | sparsam | scharf | Alles im Schlussspurt, Budget spart sich bis dahin an. |
| `sparflamme` | Sparflamme | neutral | sparsam | zahm | Fast aus. Für Runden, die Joker nur als Farbtupfer wollen. |

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
