# Masterdatei — wie Andis Folien gelesen werden

**Angelegt 21.08.2026** zu `Quotentippen.pptx`. Andi baut darin den Aufbau der
Bildschirme; gelesen wird sie mit

```bash
node scripts/lies-pptx.mjs "C:\Users\andit\OneDrive\Dokumente\Quotentippen.pptx"
```

🔴 **Der Leser wertet die ANORDNUNG aus, nicht nur den Text.** Bei einer Folie,
auf der die Lage die Aussage trägt, wäre eine reine Textliste die halbe
Information.

---

## Was der Leser versteht

| Auf der Folie | Wird gelesen als |
|---|---|
| **senkrechter Strich** | Spaltengrenze. Links der Bildschirm, rechts das Fenster, das sich öffnet. **Mehrere Striche = mehrere Fenster** |
| **Lage eines Kastens** | Reihenfolge von oben nach unten, je Spalte getrennt |
| **Pfeil** | „dieses Element öffnet jenes Fenster". Beide Enden werden dem nächstliegenden Kasten zugeordnet (bis 2 cm Abstand) |
| **mehrzeiliger Kasten** | bleibt mehrzeilig, mit `⏎` getrennt |

⚠️ **Reiner Abstand ohne Strich reicht NICHT.** Andi arbeitet teils mit
Abstand statt Trennstrich — ein Abstand ist für den Leser aber nicht von einem
Absatz zu unterscheiden. **Wo ein neues Fenster anfängt, gehört ein Strich
hin.**

## Was er NICHT sieht

- **Farben und Rahmen.** Ein rot umrandeter Kasten sieht aus wie jeder andere.
  Wenn Farbe etwas bedeutet, muss es im Text stehen.
- **Gruppierungen.** Zwei Kästen übereinander sind zwei Kästen, kein Block.
- **Stillschweigende Auslassungen.** Siehe unten.

---

## 🔴 Wiederholende Blöcke weglassen — ja, aber SAGEN

Andis Frage vom 21.08.2026: *„Verstehst du immer, wenn ich die wiederholenden
Blöcke weglasse, wie bei den Preset-Auswahlen oder Ligen und Teams?"*

**Wenn er es hinschreibt: ja. Wenn er es still weglässt: nein.**

Zwei Beispiele aus seiner eigenen Datei, beide verstanden — weil sie es sagen:

```
„Presets wie Klassisch und fair et. Wie davor"
„Bundesliga selber Aufbau wie bei 2. Bundesliga"
```

Ein leerer Bereich ist dagegen nicht von „hier kommt nichts" zu unterscheiden.
Es genügt ein Wort im Kasten:

| Kürzel | heißt |
|---|---|
| `… wie davor` | derselbe Block wie oben |
| `… wie bei X` | derselbe Block wie in X |
| `…` allein | die Aufzählung geht gleichförmig weiter |

## Der Folientitel

**Oben links den Namen des Bildschirms** (`erstellen`, `tippen`, `hub`, `rad`).
Ohne ihn muss aus dem Inhalt geschlossen werden, um welchen Screen es geht —
bei elf Folien wird das schnell falsch.

---

## Stand der Datei (21.08.2026)

| Folie | Inhalt |
|---|---|
| 1 | Spiel erstellen · rechts: Bibliothek/Gamemode mit Suche, Filter, Bewertung |
| 2 | Wettbewerbe: Bundesliga, 2. Bundesliga …, darin „alle" und einzelne Vereine |
| 3–11 | leer |

## Reihenfolge der Arbeit — Andis Ansage

1. **Erst die Masterdatei fertigstellen** (Andi, mit Beratung, was gut umsetzbar ist)
2. **Dann intensive Sitzungen**, in denen umgesetzt wird — gleich mit guter Bedienung

⚠️ **Bis dahin gilt: Mechanik ja, Platzierung nein.** Wertungslogik überlebt
jeden Aufbau; wo ein Regler sitzt, entscheidet die Masterdatei. Wer vorher
einsortiert, räumt zweimal — genau das ist am 21.08. beim Tabellen-Bonus
passiert.

⚠️ **Und es geht ausschließlich um „Spiel erstellen"**, bis Andi etwas anderes
sagt.
