# Das Gehäuse — Oberfläche für die Joker-Ökonomie

**Spec.** Account 2 (Andre), 2026-07-31.

Acht Module liegen fertig und getestet in `src/lib/`. **Kein einziges ist über
die Oberfläche erreichbar.** Dieses Dokument beschreibt, wie sie in die
Spielerstellung kommen.

⚠️ **Keine Balance-Aussagen in der UI.** Keine „empfohlen"-Sterne auf Zahlen,
keine Warnungen, die etwas verbieten. Die Oberfläche zeigt, WAS eingestellt ist
und WAS das bedeutet — nicht, ob es gut ist.

---

## 1. Aufteilung in Komponenten

| Komponente | Deckt ab | Stufe |
|---|---|---|
| `JokerOekonomie.jsx` | Bibliothek, Münzen, Shop, Achsenprofil | anpassen + profi |
| `LimitKlassen.jsx` | Limitierungsklassen anlegen/bearbeiten | profi |
| `JokerGrundform.jsx` | die 13 Dimensionen, standard + Abweichungen | profi |
| `Drehrad.jsx` | Feld-Editor, Frequenz, Sperrfristen | profi |
| `AufwandPanel.jsx` | Entscheidungen je Spieltag | alle Stufen |

Je eine Datei, Muster `JokerVerteilung.jsx` / `Ereignisse.jsx` — beide sind
bereits genau so gebaut und werden aus `Spielerstellung.jsx` eingebunden.

## 2. Schritt 1: `JokerOekonomie.jsx`

### 2.1 Bibliothek (oben, immer sichtbar)

Sechs Karten aus `KOMBINATIONEN` (`jokerBibliothek.js`), **in der vorhandenen
Reihenfolge** — sie ist bereits nach Würze aufsteigend sortiert.

Je Karte: `label`, `desc`, und das **Achsenprofil als sechs kleine Balken**
(A Risiko · B Fokus · C Dramaturgie · D Sozial · E Ausdauer · F Wissen), Werte
aus `achsenProfil(rules)`.

⚠️ Die Balken sind eine **Richtungsanzeige, keine Bewertung**. Kein Balken ist
„zu hoch". Unter den Karten ein Satz, der das sagt.

### 2.2 Münzen (Stufe „anpassen")

Ein Block pro Quelle aus `budget.quellen`, hinzufügbar und entfernbar.
`BUDGET_QUELLEN` liefert `label`/`desc`.

Dazu Takt und Verfall als Karten-Reihe (`TAKTE`, `VERFALL_TYPEN`).

**Sprache: „Münzen", nicht „Budget"** (`joker-ausloeser.md` Abschnitt 0).

### 2.3 Jokershop (Stufe „anpassen")

Eine Zeile je Joker-Art aus `JOKER_ARTEN`: Name, Preis-Eingabe, und rechts der
**tatsächliche Preis beim n-ten Einsatz**, gerechnet über `preisFuer` mit dem
eingestellten `preisModus`. Bei `steigend` ist das der ganze Punkt — der Admin
muss sehen, dass aus 10 beim vierten Einsatz 34 werden.

### 2.4 Achsenprofil (unten)

Das Profil des **gesamten aktuellen Regelwerks**, nicht nur der Kombination,
plus die Meldungen aus `achsenKonflikte`. Muster `PresetRating.jsx`.

⚠️ Der Kopftext muss sagen, dass die Achsen-Zuordnung **geschätzt** ist. Nicht
im Kleingedruckten — im Panel.

## 3. Verdrahtung in `Spielerstellung.jsx`

- Import + `patchBudget`-Helfer nach dem Muster von `patchSaisonform`.
- Render unter `stufe === "anpassen"` (Bibliothek + Münzen + Shop) und
  `stufe === "profi"` (alles).
- Bei `stufe === "einfach"` unsichtbar — dort entscheiden Charakter und Preset.

## 4. ⚠️ Was beim Bauen schiefgehen kann

**Hooks stehen VOR jedem frühen `return`.** `CLAUDE.md` hält fest, dass genau
das `Tippabgabe.jsx` schon einmal still zerlegt hat: ein `useMemo` unter einem
Lade-Zweig wird im ersten Render übersprungen und der Screen stürzt beim zweiten
mit „change in the order of Hooks" ab.

**`overflow: hidden` bricht `position: sticky`** — auch das steht in `CLAUDE.md`
und ist im Telefon-Rahmen schon einmal passiert.

**Im Browser prüfen, nicht nur bauen.** Und dabei: es gibt ZWEI Arbeitskopien,
`preview_start` hat schon einmal den alten Checkout gestartet (`CLAUDE.md`,
Werkzeug-Fallen). Erkennungsprobe steht dort.

## 5. Reihenfolge

1. `JokerOekonomie.jsx` + Verdrahtung ← **dieser Schritt**
2. `AufwandPanel.jsx` (klein, hoher Nutzen)
3. `Drehrad.jsx`
4. `LimitKlassen.jsx`
5. `JokerGrundform.jsx`
