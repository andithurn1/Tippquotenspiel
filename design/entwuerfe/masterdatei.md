# Masterdatei — wie Andis Folien gelesen werden

**Angelegt 21.08.2026** zu `Quotentippen.pptx`. Andi baut darin den Aufbau der
Bildschirme; gelesen wird sie mit

```bash
node scripts/lies-pptx.mjs "C:\Users\andit\OneDrive\Dokumente\Quotentippen.pptx"
```

🔴 **Der Leser wertet die ANORDNUNG und die FARBE aus, nicht nur den Text.** Bei
Folien, auf denen die Lage die Aussage trägt, wäre eine reine Textliste die
halbe Information.

---

## 🟠 Orange = Auftrag

**Andis Ansage vom 21.08.2026:** *„solche Funktionsweisen schreib ich ab jetzt
in ne orangene Box für dich zur Umsetzung."*

Ein orange gefüllter Kasten ist damit kein Aufbau-Element, sondern eine
**Anweisung**. Der Leser markiert ihn im Fließtext mit 🟠 und listet alle am
Ende der Folie noch einmal gesammelt — verstreut zwischen dreißig Kästen wird
sonst einer übersehen.

⚠️ **Erkannt wird am Farbton, nicht am Hexwert.** Andis Orange kommt aus dem
Office-Thema (`accent2` = `#E97132`), aber ein selbst gemischtes Orange meint
dasselbe. Geprüft gegen elf Farben: `E97132`, `FFA500`, `ED7D31`, `F4B183`,
`C55A11` gelten als Auftrag; Rot, Gelb, Blau, Grün, Grau und Weiß nicht.
**Rot ist bewusst draußen** — eine rote Warnung soll kein Auftrag sein.

---

## Was der Leser sonst versteht

| Auf der Folie | Wird gelesen als |
|---|---|
| **senkrechter Strich** | Spaltengrenze. Spalte 1 ist der Bildschirm, jede weitere ein Fenster, das sich öffnet. **Mehrere Striche = mehrere Fenster** |
| **Lage eines Kastens** | Reihenfolge von oben nach unten, je Spalte getrennt |
| **Pfeil** | „dieses Element öffnet jenes Fenster". Beide Enden werden dem nächstliegenden Kasten zugeordnet (bis 2 cm) |
| **mehrzeiliger Kasten** | bleibt mehrzeilig, mit `⏎` getrennt |

## Was er NICHT sieht

- **Reiner Abstand ohne Strich.** Ein Abstand ist nicht von einem Absatz zu
  unterscheiden. **Wo ein neues Fenster anfängt, gehört ein Strich hin.**
- **Andere Farben als Orange.** Nur Orange trägt Bedeutung.
- **Gruppierungen.** Zwei Kästen übereinander sind zwei Kästen, kein Block.
- **Stillschweigende Auslassungen.** Siehe unten.

---

## 🔴 Wiederholende Blöcke weglassen — ja, aber SAGEN

Andis Frage: *„Verstehst du immer, wenn ich die wiederholenden Blöcke weglasse,
wie bei den Preset-Auswahlen oder Ligen und Teams?"*

**Wenn er es hinschreibt: ja. Wenn er es still weglässt: nein.** Zwei Beispiele
aus seiner Datei, beide angekommen — weil sie es sagen:

```
„Presets wie Klassisch und fair et. Wie davor"
„Bundesliga selber Aufbau wie bei 2. Bundesliga"
```

Ein leerer Bereich ist dagegen nicht von „hier kommt nichts" zu unterscheiden.
Ein Wort im Kasten genügt: `… wie davor` · `… wie bei X` · `…` allein.

## Keine Folientitel nötig

**Andi am 21.08.2026:** *„ich werde das nicht bei jedem einzigen Slide
schreiben, weil alles was erstmal kommt die adminseitige Spielerstellung ist."*

Berechtigt — die Voreinstellung gilt also ohne Beschriftung:

- **Spalte 1** ist die adminseitige **Spielerstellung**
- **weitere Spalten** sind **Bibliotheken** (Teilbibliothek Joker,
  Betippungsauswahl-Bibliothek …)
- ⛔ **Nichts hiervon betrifft das Tippen.** Wenn doch, sagt Andi es.

---

## Stand der Datei

| Folie | Inhalt |
|---|---|
| 1 | Spiel erstellen · rechts: Bibliothek/Gamemode mit Suche, Filter, Bewertung |
| 2 | Wettbewerbe: Bundesliga, 2. Bundesliga …, darin „alle" und einzelne Vereine |
| 3 ff. | **in Arbeit** — als Nächstes die Teilbibliothek „Betippungsauswahl": wie die Varianten vorgestellt werden und welche Kurzbeschreibung dazu steht |

## Reihenfolge der Arbeit — Andis Ansage

1. **Erst die Masterdatei fertigstellen** (Andi, mit Beratung, was gut umsetzbar ist)
2. **Dann intensive Sitzungen**, in denen umgesetzt wird — gleich mit guter Bedienung

⚠️ **Bis dahin gilt: Mechanik ja, Platzierung nein.** Wertungslogik überlebt
jeden Aufbau; wo ein Regler sitzt, entscheidet die Masterdatei. Wer vorher
einsortiert, räumt zweimal — genau das ist am 21.08. beim Tabellen-Bonus
passiert.
