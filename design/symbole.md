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
`BELOHNUNGS_TYPEN` (`drehrad.js`) haben ein `icon`- oder `bild`-Feld.

⚠️ **Richtigstellung zur ersten Fassung dieser Datei.** Dort stand, die Symbole
stünden „als Emoji direkt in den Komponenten, mehrfach, je Screen neu getippt".
**Nachgemessen stimmt das nicht.** Im ganzen `src/components` liegen zwar 371
Emoji in 65 Dateien — aber die gehören zu ABSCHNITTEN (📅 Saison & Zeit,
⚽ Wettbewerbe, 🧭 Zeitachse) und stehen in Kommentaren und Warntexten. Für
einen einzelnen Joker, ein Ereignis oder ein Rad-Feld gibt es **heute gar kein
Symbol** — weder im Katalog noch im Screen.

✅ **Das ist die bessere Ausgangslage:** es gibt nichts zu vereinheitlichen, nur
etwas anzulegen. Der Fehler „derselbe Joker, drei Bilder" ist noch nicht
passiert — er würde erst entstehen, wenn die Bilder ohne gemeinsamen Ort in die
Screens wandern. Genau der Verlauf, den dieses Projekt bei den Eckenradien (G2),
beim `wer`-Katalog (K1) und zuletzt bei der Stufenleiter der Vereins-Gewichte
hatte.

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

## 🔴 Vereinslogos: warum „das kann doch nicht teuer sein" nicht die Frage ist

**Andis Frage (29.08.2026):** *„Wie schwer ist es denkst du eine Lizenz für alle
Logos der Vereine zu erhalten, ich sehe so oft Billigprodukte, das kann ja nicht
so teuer sein."*

⚠️ **Kein Rechtsrat, und Preise kann ich nicht nachsehen** — mein Wissensstand
endet im Mai 2026, und Lizenzkonditionen stehen ohnehin in keinem Katalog. Was
sich sagen lässt, ist die Struktur des Problems.

### Das Teure ist nicht der Preis, sondern die Anzahl der Gegenüber

Ein Vereinswappen ist **Marke** und meist zusätzlich **urheberrechtlich**
geschützt, und es gehört dem **jeweiligen Verein** — nicht der Liga. Es gibt
keinen Schalter, an dem man „alle Bundesliga-Logos" bekommt. Bei sechs
Wettbewerben in unserem Katalog wären das über hundert einzelne Gegenüber, jedes
mit eigenem Vertrag, eigener Rechtsabteilung und eigenem Interesse daran, ob es
mit einem unbekannten Tippspiel in Verbindung gebracht werden will.

🔴 **Und die letzte Hürde ist die eigentliche:** ein Rechteinhaber muss nicht
lizenzieren. Ein kleines Produkt bekommt oft schlicht keine Antwort.

### Warum es trotzdem überall billige Produkte gibt

Drei verschiedene Gründe, und nur einer davon ist übertragbar:

1. **Echte Lizenzware.** Die Lizenz ist real und teuer — sie verteilt sich nur
   auf hohe Stückzahlen. Bei Gebühren als Prozentsatz vom Verkauf trägt sich
   ein 5-Euro-Schlüsselanhänger problemlos. Das funktioniert über **Masse**,
   nicht über einen niedrigen Preis.
2. **Unlizenziert.** Ein großer Teil dessen, was man auf Marktplätzen sieht, ist
   schlicht nicht lizenziert. Es existiert, weil Verfolgung mühsam ist — nicht,
   weil es erlaubt wäre.
3. **Redaktionelle Nutzung.** Ein Wappen in einem Spielbericht ist etwas
   anderes als ein Wappen als Bedienelement in einer App.

⚠️ **Für eine App ist Punkt 2 der gefährlichste Trugschluss.** Ein Marktstand
ist schwer zu verfolgen — eine App im Store ist **auffindbar, meldbar und mit
einem Klick abschaltbar**. Apple und Google entfernen auf Beschwerde, und zwar
ohne Verfahren. Der Schaden wäre nicht eine Abmahnung, sondern die
Nichtverfügbarkeit.

### ✅ Die gute Nachricht: wir brauchen sie nicht — und tun es schon

**Nachgemessen am 29.08.2026: in `public/` liegt kein einziges Vereinslogo.**
Die App löst Vereins-Identität über zwei Wege, die beide ohne fremde Marken
auskommen:

| | |
|---|---|
| **Farben statt Wappen** | `CLUB_PRESETS` in `theme.js` — und die Vorlagen heißen nach der FARBE („Gelb-Schwarz"), nicht nach dem Verein. Wer sein Team erkennt, erkennt es an der Farbe |
| **Namen als Text** | „Borussia Dortmund" als Wort, um ein reales Spiel zu benennen, ist etwas anderes als sein Wappen abzubilden — es identifiziert, es schmückt nicht |

🔴 **Das war eine gute Entscheidung, und sie sollte bewusst bleiben.** Sie ist
kein Verzicht: Farbe plus Name trägt die Wiedererkennung fast vollständig, und
sie kostet nichts, verhandelt mit niemandem und kann nicht zurückgezogen werden.

**Wann sich die Frage neu stellt:** wenn die App Geld verdient und Reichweite
hat. Dann führt der Weg über die Ligen bzw. deren Vermarkter, nicht über die
Vereine einzeln — und dann ist es ein Geschäftsthema mit Anwalt, kein
Gestaltungsthema.

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

---

## 🔴 ENTSCHIEDEN: flach für die 24, illustrativ nur fürs Rad (Andi, 29.08.2026)

Auf die Rückfrage, was „flach oder illustrativ" überhaupt heißt — es geht nicht
darum, was auf dem Bild ist, sondern **wie es gezeichnet ist**:

| | **Flach** | **Illustrativ** |
|---|---|---|
| Aussehen | Piktogramm: eine, höchstens zwei Farben, klare Umrisse, keine Tiefe, keine Schatten | Gezeichnet: Verläufe, Licht, Schatten, oft eine kleine Szene oder Figur |
| Beispiel „Klau" | Ein Pfeil, der einen Anteil von einem Stapel wegzieht | Eine Figur, die einer anderen etwas abnimmt |
| Bei **24 px** | lesbar — und das ist die echte Größe der Fremdjoker-Chips | wird Matsch, Details brauchen Platz |
| Hell/dunkel | löst sich von selbst: einfarbig, das Theme färbt | Handarbeit — eigene Farben und Schatten passen nicht auf beide Gründe |
| 24 Stück am Stück | sehen wie ein Satz aus, auch aus vier Sitzungen | 🔴 **schwer**: nacheinander bestellt kommen 24 Handschriften zurück — andere Strichstärke, Sättigung, Perspektive. Nebeneinander fällt das sofort auf |
| Wirkung | sachlich, ordentlich | wertiger, „Jahrmarkt" statt „Formular" |

✅ **Andis Entscheidung: beides, aber getrennt bestellt.**

- **Die 24 aus der Liste oben: FLACH.** Sie stehen fast alle klein und
  nebeneinander — Chips in der Tippabgabe, Zeilen in der Auswahl. Dort gewinnt
  Erkennbarkeit gegen Schönheit.
- **Das Rad separat und ILLUSTRATIV.** Sieben Felder, groß, an einer einzigen
  Stelle: dort trägt es, dort stört die uneinheitliche Handschrift nicht, und
  dort lohnt der Aufwand mit den zwei Themes.

🔴 **Und die Richtung, in der es nur einmal geht:** aus flach kann man später
illustrativ nachlegen. Aus 24 illustrativen Bildern bekommt man keine
brauchbaren 24-px-Chips. Im Zweifel also flach.

⚠️ Das ändert die technischen Vorgaben oben nicht — es macht sie nur leichter
einzuhalten: **einfarbig mit transparentem Grund** ist bei flachen Symbolen der
Normalfall, nicht die Ausnahme.
