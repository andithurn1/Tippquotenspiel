# Symbole für die UI — was extern generiert werden soll

**Andis Frage (29.08.2026), wörtlich:** *„ich brauche von dir auch nochmal
Rückmeldung, welche Joker Symbole, und Ereignis schilder ich von externer KI
generieren sollte, um sie in der UI Version einzubringen."*

Diese Datei ist die Antwort. Sie ist **aus den Katalogen im Code gezogen**, nicht
geschätzt — wenn eine Joker-Art dazukommt, fehlt sie hier, und das fällt auf.

---

## 🔴 Vorher: es gibt noch keinen Ort für ein Symbol

**Gemessen am 29.08.2026:** weder `JOKER_ARTEN` (`jokerBudget.js`) noch
`FREMDJOKER_ARTEN` (`eingriffe.js`), `EREIGNIS_TYPEN` (`ereignisse.js`) oder
`BELOHNUNGS_TYPEN` (`drehrad.js`) haben ein `icon`- oder `bild`-Feld. Die
Symbole, die man heute sieht, stehen als Emoji **direkt in den Komponenten** —
mehrfach, je Screen neu getippt.

⚠️ **Das ist der Punkt, der vor dem Generieren geklärt gehört.** Wer 24 Bilder
bestellt und sie dann in den Screens verteilt, bekommt denselben Joker in drei
Ansichten mit drei verschiedenen Bildern — genau der Verlauf, den dieses Projekt
bei den Eckenradien (G2), beim `wer`-Katalog (K1) und zuletzt bei der
Stufenleiter der Vereins-Gewichte hatte.

✅ **Der Weg, der das verhindert, ist eine Zeile je Eintrag:** ein `bild`-Feld im
KATALOG, und die Screens lesen es. Dann gibt es je Joker genau ein Symbol, und
ein neuer Joker ohne Bild fällt in einer Abnahme auf. **Das baue ich, sobald die
ersten Bilder da sind** — vorher wäre es ein leeres Feld.

---

## Was generiert werden soll — 24 Stück, in drei Gruppen

### 1 · Fremdjoker (4) — die wichtigsten, hier zuerst anfangen

Das sind die mit Charakter: sie richten sich **gegen Mitspieler**, und ihr Ton
ist Andis eigener Beispieltext („wische deinen Kontrahenten etwas aus").

| Schlüssel | Name | Was das Bild zeigen muss |
|---|---|---|
| `block` | **Block** | Dämpfen, nicht wegnehmen. Etwas wird kleiner/gedrosselt — kein Verbotsschild, es ist keine Sperre |
| `klau` | **Klau** | Ein Anteil wandert von einem zum anderen. Richtung erkennbar |
| `trittbrett` | **Trittbrettfahrer** | Mitfahren an fremdem Erfolg — anhängen, nicht wegnehmen |
| `gegenwette` | **Gegenwette** | Auf das Gegenteil setzen. Zwei Richtungen, eine davon gewählt |

⚠️ **Alle vier müssen auf einen Blick auseinanderzuhalten sein** — sie stehen in
der Tippabgabe nebeneinander in einer Reihe. Vier Varianten desselben Pfeils
wären wertlos.

### 2 · Eigene Joker (4)

| Schlüssel | Name | Was das Bild zeigen muss |
|---|---|---|
| `joker.einzel` | **Einzel-Joker** | Der klassische: ein Spiel zählt mehr. Das Grundsymbol, an dem sich die anderen orientieren |
| `joker.ranking` | **Ranking-Joker** | Nicht auf ein Spiel, sondern auf die eigene Platzierung |
| `ereignis.trost` | **Trost-Joker** | Ausgleich für den Letzten — freundlich, nicht mitleidig |
| `saison.wette` | **Saison-Wette** | Langfristig, über die ganze Saison — nicht ein Spieltag |

### 3 · Rad-Felder (7) — die brauchen es am dringendsten nach den Fremdjokern

🔴 **Auf einem Drehrad steht kein Text, sondern ein Bild.** Von allen Gruppen
ist das die, die ohne Symbole am wenigsten funktioniert.

| Schlüssel | Name | Was das Bild zeigen muss |
|---|---|---|
| `nichts` | **Niete** | Nichts passiert. Muss auf dem Rad sofort als „leer" lesbar sein |
| `joker` | **Joker** | Verweist auf Gruppe 2 — am besten dasselbe Grundsymbol |
| `budget` | **Narren** | Die Währung der Runde |
| `modifikator` | **Modifikator** | Ein Aufschlag auf die eigene Wertung, für ein paar Spieltage |
| `punkte` | **Punkte** | Direkte Punkte, ohne Umweg |
| `ereignis` | **Ereignis** | Es wird eines der eingestellten Ereignisse ausgelöst — ein Auslöser, keine Belohnung |
| `ruecksetzung` | **Rücksetzung** | Löscht, was war: Abklingzeiten weg, Käufe zählen nicht mehr. **Das einzige, das nichts gutschreibt, sondern etwas wegnimmt** |

### 4 · Ereignis-Schilder (9)

Andis „Ereignis schilder" — die Dinger, die während der Runde aufpoppen.

| Schlüssel | Name |
|---|---|
| `serie` | Serie: mehrere Spieltage in Folge getippt |
| `erster-exakter` | Erster exakter Treffer |
| `aussenseiter` | Außenseiter-Sieg vorhergesagt |
| `treffer-serie` | Scharfschütze: mehrmals in Folge exakt |
| `spieltag-komplett` | Alle Spiele eines Spieltags getippt |
| `letzter-am-spieltag` | Auszeichnung nach Spieltags-Platzierung |
| `pechstraehne` | Pechsträhne: mehrere Spieltage ohne Treffer |
| `quiz` | Quiz über die eigene Runde |
| `duell` | Joker-Duell gegen einen Mitspieler |

⚠️ **Zwei davon sind negativ** (`pechstraehne`, `letzter-am-spieltag`) — die
brauchen einen Ton, der aufzieht statt auszulachen. Der Rest ist Auszeichnung.

---

## ⛔ Was NICHT generiert werden sollte

**Die 14 Auslöser** (`AUSLOESER_TYPEN`: „jeder n-te Spieltag", „solange es eng
ist", „der Admin drückt" …). Das sind **Bedingungen in der Admin-Oberfläche**,
keine Dinge, die ein Spieler zu sehen bekommt. Ein Bild für „Wenn jemand
davonzieht" wäre eine Illustration eines Wenn-Satzes — man erkennt es nie
wieder, und es sind 14 Stück Arbeit ohne Ertrag.

---

## Technisches, damit die Bilder nicht zweimal bestellt werden müssen

| | |
|---|---|
| **Format** | SVG, wenn die KI es kann — sonst PNG mit transparentem Hintergrund |
| **Größe** | Mindestens 512×512 px. In der App laufen sie klein (Rad-Feld, Chip in der Tippabgabe), aber verkleinern geht, vergrößern nicht |
| **Quadratisch** | Alle gleich beschnitten, gleicher Innenabstand. Sonst wirkt eins größer als das andere, obwohl beide 24 px hoch sind |
| 🔴 **Zwei Themes** | Die App läuft hell UND dunkel. Ein Symbol mit dunkler Kontur verschwindet im dunklen Thema. Am sichersten: **einfarbig mit transparentem Grund**, Farbe kommt aus dem Theme |
| **Keine Schrift im Bild** | Wir übersetzen später (siehe `design/roadmap.md`), und ein Symbol mit deutschem Wort darin ist dann falsch |
| **Erkennbar bei 24 px** | Das ist die reale Größe in der Tippabgabe. Was bei 24 px zu Matsch wird, ist unbrauchbar — bitte an EINEM Symbol ausprobieren, bevor 24 bestellt werden |

---

## 🔴 Meine Empfehlung zur Reihenfolge

**Nicht alle 24 auf einmal bestellen.** Erst **ein einziges** — den
`joker.einzel`, weil er das Grundsymbol ist, an dem sich alle anderen
orientieren. Daran lässt sich prüfen, ob Stil, Größe und Verhalten in beiden
Themes stimmen.

Danach in dieser Reihenfolge:

1. **Die 4 Fremdjoker** — sie stehen nebeneinander, dort zeigt sich, ob der Stil
   vier unterscheidbare Bilder hergibt.
2. **Die 7 Rad-Felder** — das Rad ist ohne Bilder am schwächsten.
3. **Die 3 übrigen eigenen Joker.**
4. **Die 9 Ereignis-Schilder** — sie erscheinen einzeln und selten, ein Symbol
   weniger tut dort am wenigsten weh.

⚠️ **Und die Frage, die ich nicht entscheiden kann:** ob der Stil illustrativ
(gezeichnet, bunt) oder flach (einfarbig, wie die Emoji heute) sein soll. Das
ist eine Gestaltungsfrage und gehört zu G6/der Masterdatei — die App ist heute
flach, aber ein Drehrad verträgt mehr.
