# Teilbibliotheken — herunterladbare Baukasten-Elemente

**Spec.** Account 2 (Andre), 2026-07-31, nach Vorgabe des Nutzers.

> **Der Wunsch:** Nicht nur ganze Regelwerke teilen, sondern **einzelne
> Bausteine** — „nimm mein Drehrad", „nimm meine Joker-Ökonomie". Je Bereich
> 3–5 kuratierte Voreinstellungen von uns, dazu eigene des Admins, alles als
> Code teilbar und abspeicherbar.

---

## 1. 🔴 Das gibt es schon halb — nur hieß es nie so

`presetMerge.ASPEKTE` definiert bereits, **welche Regelwerte zusammen wandern
müssen**. Neun Aspekte, jeder mit einer Begründung, warum genau diese Felder
eine Einheit bilden — z. B. `["aufholen", "versaeumnis", "saisonform"]`, weil
sie dieselbe Frage beantworten und ein halber Satz eine unvermessene Balance
ergäbe.

**Eine Teilbibliothek ist nichts anderes als: kuratierte Einträge für EINEN
Aspekt.** Und ein Teil-Code ist ein Creator-Code, der genau die Felder dieses
Aspekts trägt.

Das ist der ganze Trick. Wir brauchen kein neues Zuschnitt-Konzept — der
Zuschnitt liegt seit `presetMerge.js` fest, samt Begründungen, und ein Test
sichert ab, dass die Aspekte ALLE Regel-Felder abdecken.

⚠️ **Daraus folgt eine harte Regel:** Ein Teil-Code trägt immer einen GANZEN
Aspekt, nie einzelne Felder daraus. Wer „nur den Joker-Faktor" teilen könnte,
teilt einen halben Satz — und genau davor schützen die Aspekte.

## 2. Der Teil-Code

```
TS2-…      ganzes Regelwerk        (heute)
TS2A-<aspekt>-…   ein einzelner Aspekt   (neu)
```

Beispiel: `TS2A-modifikatoren-eyJ…` trägt Joker, Team-Mods, modCap, Big Game,
Ereignisse, Wettbewerbe, Duell, Budget, Limitklassen und Grundform — alles, was
in `ASPEKTE` unter `modifikatoren` steht.

- **Kodiert wird wie beim Vollformat**: nur die Abweichungen von
  `sanitizeRules(DEFAULT_RULES)`, beschränkt auf die Felder des Aspekts. Ein
  Drehrad-Code wird dadurch sehr kurz.
- **Angewendet** wird über `mische()` aus `presetMerge.js` — die Funktion gibt
  es bereits und sie nimmt genau eine Aspekt-Auswahl entgegen. Nicht nachbauen.
- **Unbekannter Aspekt → `null`**, nie geraten. Gleiche Regel wie bei
  `zerlegeCode`.

## 3. Was eine Teilbibliothek ist

```js
{
  aspekt: "modifikatoren",           // Schlüssel aus ASPEKTE
  eintraege: [
    { key: "gleichgewicht", label: "Gleichgewicht", desc: "…", werte: { … } },
    …
  ],
}
```

- **3–5 Einträge je Bereich**, kuratiert. Verschieden im Charakter, nicht in der
  Qualität.
- `werte` enthält NUR Felder dieses Aspekts. Ein Test muss das erzwingen —
  sonst schleicht sich über eine Teilbibliothek ein Wert aus einem anderen
  Bereich ein, und niemand findet ihn wieder.
- Die vorhandenen Kataloge werden dorthin überführt, nicht dupliziert:
  `PRESETS` (`presets.js`) und `KOMBINATIONEN` (`jokerBibliothek.js`) sind
  bereits Teilbibliotheken, sie heißen nur anders.

## 4. Eigene Einträge des Admins

Der Store kann bereits `publishPreset({ name, rules, creatorId })` und
`getPresetByCode(code)`. Für Teil-Codes kommt dieselbe Ablage in Frage — sie
braucht nur ein Feld mehr:

```
publishPreset({ name, rules, creatorId, aspekt })
```

`aspekt: null` = ganzes Regelwerk (heutiges Verhalten), sonst der Aspekt-Schlüssel.

**Gespeicherte Einträge des Admins erscheinen in derselben Liste wie unsere
kuratierten**, deutlich getrennt („Unsere Vorschläge" / „Deine gespeicherten" /
„Aus der Community"). Wer eigene baut, soll sie neben unseren sehen — sonst ist
es kein Baukasten, sondern ein Katalog mit Anhang.

## 5. Herunterladen und Einlesen

„Herunterladbar" heißt hier: **Text, kein Dateiformat.** Ein Teil-Code ist eine
Zeile, die man kopiert, verschickt und einfügt. Kein Download-Dialog, keine
Datei-Endung, nichts, was auf einem Telefon Reibung erzeugt.

Für eine ganze Sammlung (mehrere Aspekte auf einmal) genügt eine Liste von
Teil-Codes, zeilenweise. Das Einlese-Feld nimmt beides — einen Code oder viele.

## 6. Was NICHT gebaut wird

| Idee | Warum nicht |
|---|---|
| Eigenes Datei-Format (`.tqs`) | Ein Code ist eine Zeile Text. Eine Datei macht daraus einen Anhang, den man auf dem Telefon nicht öffnen kann. |
| Teilen einzelner FELDER | Bricht die Aspekt-Regel (Abschnitt 1). |
| Bewertungen/Sterne für Community-Codes | Braucht echte Nutzung. Ohne Daten ist es Scheingenauigkeit — dieselbe Zurückhaltung wie beim Würze-Rückläufer (`joker-oekonomie.md` 3.1b). |

## 7. Reihenfolge

1. `teilbibliothek.js` — Datenform, `bildeTeilCode`, `zerlegeTeilCode`,
   Anwendung über `mische()`.
2. Bestehende Kataloge als Teilbibliotheken deklarieren (`PRESETS`,
   `KOMBINATIONEN`) — ohne sie zu verschieben, nur zu benennen.
3. Neue Teilbibliotheken je Bereich: Drehrad, Auslöser, Saisonform/Aufholen,
   Spielauswahl.
4. Store-Feld `aspekt`.
5. UI — Teil dessen Gehäuse.
