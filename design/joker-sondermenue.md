# Joker-Sondermenü — was alles einstellbar ist und wie es geordnet wird

**Angelegt 22.08.2026** auf Andis Auftrag: *„mach erstmal ne Übersicht, welche
ganzen einzeln einstellbaren Sachen du einbringen wirst, und wie diese für eine
gute Übersichtlichkeit bzw. Nutzerfreundlichkeit strukturiert wird."*

🔴 **Erst der Bestand, dann der Vorschlag.** Alles unten Gelistete ist aus dem
Regelwerk gezogen, nicht erfunden — **84 Einzelwerte** in sechs Blöcken.

---

## 0 · Zwei Befunde vorweg

**Es gibt heute drei Joker-Wirkprinzipien, nicht eines:**

| Art | Wirkprinzip | Wer entscheidet |
|---|---|---|
| **Gesetzter Joker** | Der Tipper hebt Spiele hervor — als einzelner Joker, als verteilte Wichtigkeit oder als Münz-Einsatz | der TIPPER, je Spieltag |
| **Heimatbonus** | Spiele des eigenen Vereins zählen mehr | niemand — greift passiv |
| **Mut-Bonus** | Zahlt, wenn gegen den Favoriten getippt wurde UND es aufgeht | niemand — greift passiv |

Dazu zwei Nachbarn, die eigene Blöcke sind, aber in denselben Topf zahlen:
**Duell-Joker** (Klauen/Blocken gegen Mitspieler) und das **Drehrad**.

🔴 **Der Shop existiert bereits — und zwar genau da, wo Andi ihn haben will.**
`budget` ist der Narren-Shop: Zufluss, Takt, Verfall, Preise. Er ist im
**Budget-Modus abgeschaltet** (`jokerBudget.js`: „Modus einsatz ODER kein
Budget aktiv: kein Narren-Kauf möglich") und läuft **in der reinen
Quotenversion**. Andis Wunsch ist also erfüllt, nur andersherum als gedacht:
nicht „auch bei Quoten", sondern „NUR bei Quoten".

⚠️ **Das ist eine offene Frage, keine Feststellung:** soll der Shop im
Budget-Modus wirklich aus bleiben? Der Grund dafür ist gut — zwei Währungen,
die beide Joker bezahlen, wären zwei Wahrheiten über dieselbe Frage. Aber es
ist eine Entscheidung, die Andi kennen sollte.

---

## 1 · Der Bestand: 84 Einzelwerte

### `joker` — die Grundeinstellung (22)

| Feld | Was es tut |
|---|---|
| `enabled` | Gibt es überhaupt Joker? |
| `modus` | Ein Joker · Wichtigkeit verteilen · Münz-Einsatz |
| `faktor` | Stärke beim einzelnen Joker |
| `faktoren` | Der Stufen-Pool beim Verteilen (2 · 1,5 · 1,2 · 1) |
| `abstimmung` | Die Runde stimmt ab, an welchen Spieltagen es Joker gibt |
| `einsatzProSpieltag` · `maxAnteilProSpiel` · `minAnteilProSpiel` · `skippenErlaubt` | Der Münz-Einsatz: Vorrat, Ober- und Untergrenze je Spiel, Aussetzen erlaubt |
| `einsatzTakt` · `einsatzTaktN` | **Wie oft** es Münzen gibt |
| `einsatzFenster.*` (4) | **In welchem Zeitraum** überhaupt |
| `heimat.enabled` · `heimat.faktor` | Heimatbonus |
| `mut.enabled` · `mut.faktor` | Mut-Bonus |
| `verteilung.modus` · `frequenz` · `sichtbarkeit` | Wie Joker ausgeschüttet werden |

### `budget` — der Shop (12)

`enabled` · `quellen` (wer wie viel bekommt) · `takt` · `n` · `fenster.*` (4) ·
`verfall` · `maxAnsparen` · `preisModus` · `steigerung`

⚠️ `preisModus` und `steigerung` sind die Shop-Preise: fester Preis oder
steigend, je gekauftem Joker.

### `jokerBasis` — die Form JE Joker-Art (18 je Art)

`wer` · `werWert` · `sicht` · `verfall` · `bedingung.minQuote` ·
`bedingung.maxQuote` · `bedingung.wettbewerbe` · `bedingung.phasen` ·
`widerruf` · `widerrufStunden` · `stapeln` · `symmetrie` · `bestand` ·
`kasseSichtbar` · **`abklingzeit`** · `umfang` · `spieleProEinsatz` · `wahl`

🔴 **Hier steckt Andis Cooldown** (`abklingzeit`) — und zwar je Joker-Art
einzeln, nicht global.

### `duell` — Joker gegen Mitspieler (20)

`typen` (klau/block) · Zeitfenster (5) · `anzahl` · `proSpieltag` ·
`sichtbarkeit` · `klau.anteil` · `klau.modus` · `block.restanteil` ·
`block.nurGewinn` · `block.beute` · `maxProSaison` · `zielWahl` ·
`maxProZiel` · `immun` · `konter` · `kosten`

### `drehrad` — Zufalls-Ausschüttung (12)

`felder` · `sperrfrist` · `frequenz` · `modus` · Zeitfenster (4) · `wer` ·
`werWert` · `maxPunkteProSaison`

### `limitKlassen` — Unterkontingente (frei viele)

Je Klasse: `mitglieder` · `proZeitraum` · `zeitraum` · `aktivierung`

---

## 2 · Der Vorschlag: fünf Fragen statt 84 Felder

🔴 **Die Ordnung folgt nicht dem Code, sondern der Frage, die ein Admin
stellt.** Heute liegen `joker`, `budget`, `jokerBasis`, `limitKlassen` und
`drehrad` als fünf getrennte Abschnitte nebeneinander — technisch richtig,
zum Bedienen falsch: „wann kommt ein Joker?" steht an drei Stellen.

**In der Hauptansicht bleibt EINE Zeile:**

```
Joker · an · Ein Joker · Faktor 1,5                              [aufklappen]
```

**Dahinter fünf Karten, in dieser Reihenfolge:**

### A · Welche Joker gibt es?
Die drei Wirkprinzipien als Schalter: gesetzter Joker (mit Art), Heimatbonus,
Mut-Bonus. Dazu Duell-Joker und Drehrad als eigene Zeilen mit eigenem
Untermenü.
→ `joker.enabled`, `modus`, `heimat.enabled`, `mut.enabled`, `duell.typen`

### B · Wie stark wirken sie?
→ `faktor`, `faktoren`, `heimat.faktor`, `mut.faktor`, `klau.anteil`,
`block.restanteil`, `einsatzProSpieltag`, `maxAnteilProSpiel`

### C · Woher kommen sie?
**Andis „wann werden sie ausgeschüttet".** Drei Wege nebeneinander, alle
einzeln zuschaltbar:
- **geschenkt** — `verteilung.modus`, `frequenz`, `sichtbarkeit`
- **gekauft** — der Shop: `budget.quellen`, `takt`, `preisModus`, `steigerung`,
  `verfall`, `maxAnsparen`
- **erspielt** — Drehrad und Ereignisse

### D · Wann gelten sie?
**Alles Zeitliche an EINER Stelle** — heute liegt es in vier Blöcken verstreut:
→ `einsatzFenster.*`, `budget.fenster.*`, `drehrad`-Fenster, `duell`-Fenster,
`abklingzeit` (Cooldown), `verfall`, `widerruf`, `sperrfrist`

### E · Wo sind die Grenzen?
→ `stapeln`, `maxProSaison`, `maxProZiel`, `immun`, `limitKlassen`,
`maxPunkteProSaison`, `bedingung.*` (nur bei diesen Quoten/Wettbewerben)

---

## 3 · Was die eine Ansicht bedienbar hält

⚠️ **Andis Bedingung:** *„weiterhin sollts so sein, dass man auch ohne viel
durchzulesen und alles einzeln einstellen muss."*

Drei Mittel, alle schon vorhanden:

1. **Jede Karte zeigt zugeklappt ihren Stand** („Woher: geschenkt alle 4
   Spieltage · Shop aus"). Wer nichts ändern will, liest eine Zeile.
2. **Die Voreinstellung setzt alle 84 Werte.** Aufklappen ist Kür.
3. **Der Teil-Code je Ebene** lädt einen fertigen Joker-Satz von jemand anderem.

---

## 4 · Offene Fragen an Andi

❓ **Shop im Budget-Modus:** aus lassen oder freigeben? (siehe Abschnitt 0)

❓ **Duell und Drehrad — eigene Zeile oder Karte F?** Sie sind Joker im weiteren
Sinn, haben aber eigene Fenster. Zusammen wird das Menü groß, getrennt sucht
man Zeitfenster an zwei Orten.

❓ **`jokerBasis` gilt heute für „standard"** — also alle Arten gleich. Soll
jede Joker-Art ihre eigene Form bekommen (18 Werte × Anzahl Arten), oder bleibt
es eine gemeinsame Grundform mit Ausnahmen?
