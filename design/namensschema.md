# Namensschema — der sprechende Name eines Regelwerks

**Andis Auftrag, 24.08.2026** (wörtlich, gekürzt an den Auslassungen):

> „ein gewisser code in der Namensgebung für die einzelnen Regelwerke (bzw.
> auch für die aneinanderreihung der einzelnen Teilbibliotheks auswahlen) …
> beispiel besten 4 Teams der topligen plus champions League heisst **Allee**
> [alternativen so wie straße, Auffahrt, Schotterpiste, Autobahn] (einzigartiger
> zahlen code für die auswahl der Teams) **auf den Weg zur** (…) für die
> Jokerauswahl und dann **Städte** oder sowas, sodass sich eben auch für
> menschen eine Wiedererkennung in dieser Codierung ergibt, doch dennoch
> Einzigartigkeit im Gesamtnamen bzw. dem kompletten Satz ergibt."

⏳ **Status: Entwurf zur Auswahl.** Nichts davon ist gebaut. Andi hat um
Alternativen gebeten — sie stehen in Abschnitt 4, er entscheidet.

---

## 1 · Was der Name leisten soll — und was nicht

Andis Satz enthält zwei Ziele, die einander widersprechen. Das ist der
eigentliche Entwurfs-Konflikt, und er ist lösbar — aber nur, wenn man ihn
benennt:

| Ziel | heißt konkret | zieht in Richtung |
|---|---|---|
| **Wiedererkennung** | Wer den Namen hört, weiß ungefähr, was drin ist | wenige, bekannte Wörter |
| **Einzigartigkeit** | Zwei verschiedene Regelwerke heißen nie gleich | viele, unterschiedliche Zeichen |

🔴 **Die Auflösung: das WORT trägt die Bedeutung, die ZAHL die Identität.**
Genau das steht schon in Andis Beispiel („Allee" + Zahlencode) — es ist die
tragende Idee des ganzen Schemas und sollte nicht verwässert werden.

⚠️ **Der Name ersetzt den Kurzcode NICHT.** Sie beantworten verschiedene
Fragen und sollen nebeneinander stehen:

| | wofür | Beispiel |
|---|---|---|
| **Kurzcode** | tippen, teilen, per WhatsApp schicken | `K7RM2Q` |
| **Name** | wiedererkennen, darüber reden, in der Liste finden | „Allee 7 nach Sturmhafen" |

Wer den Namen zum Tippen zwingt, verliert beides: er ist zu lang zum Tippen
und zu technisch zum Reden.

---

## 2 · Der Aufbau: Achsen statt Buchstaben

Ein Regelwerk hat **12 Aspekte** (`presetMerge.ASPEKTE`). Die alle in einen
Namen zu pressen ergäbe einen Absatz, keinen Namen.

🔴 **Höchstens DREI Bedeutungs-Wörter plus EIN Ortsname.** Vier Bausteine sind
die Grenze dessen, was jemand nach einmal Hören wiedergeben kann — darüber
kippt es von „Name" zu „Aufzählung".

Die drei Achsen, die ein Regelwerk am stärksten prägen:

| Achse | aus welchem Aspekt | was das Wort sagt |
|---|---|---|
| **UMFANG** | `spiele` | Wie viele Begegnungen umfasst die Runde? |
| **WUCHT** | `joker` | Wie stark und wie oft greifen Joker ein? |
| **SCHÄRFE** | `naehe` + `underdog` | Wie hart bestraft die Wertung einen knappen Fehltipp? |

⚠️ **Diese drei sind ein Vorschlag, kein Naturgesetz.** Wer sie ändert, ändert,
worauf der Name antwortet — das ist Andis Entscheidung, nicht meine.

### 🔴 Die Wörter kommen aus MESSUNGEN, nicht aus Handarbeit

Der Punkt, an dem so ein Schema sonst stirbt: Wenn jemand für jedes neue
Regelwerk ein Wort **erfinden** muss, bleibt die Hälfte namenlos, und geladene
Fremd-Codes bekommen nie einen.

Das Projekt kann es bereits messen — `bibliothek.js` rechnet über die echte
Engine vier Kennzahlen je Regelwerk (Schärfe · Boden · Überraschung ·
Torschützen-Anteil), und `spielauswahl.js` weiß, wie viele Spiele eine Auswahl
umfasst. **Das Wort ist damit ableitbar statt gepflegt.**

⚠️ Daraus folgt eine harte Regel: Ändert jemand das Regelwerk, ändert sich der
Name mit. Ein Name, der nach einer Änderung stehen bliebe, würde lügen — genau
wie der Kurzcode, der bei jeder Regeländerung ungültig wird (`touched()` in
`Spielerstellung.jsx`).

---

## 3 · Andis Vorschlag, ausbuchstabiert

```
  Allee 7            auf den Weg zur      Kaskade 3        ·  Sturmhafen
  └─ UMFANG ─┘                            └─ WUCHT ─┘        └─ Identität ─┘
     Wort = Größe                            Wort = Größe       eindeutig
     Zahl = welche Teams                     Zahl = welche Joker
```

**Was daran trägt:**

- Die **Wege-Skala hat eine eingebaute Ordnung**, die niemand lernen muss.
  Jeder weiß, dass eine Schotterpiste schmaler ist als eine Autobahn. Das ist
  selten und wertvoll — die meisten Wortfelder haben das nicht.
- **„auf den Weg zur"** macht aus einer Aufzählung einen Satz. Eine Saison IST
  eine Reise; die Metapher passt zum Gegenstand und nicht nur zum Klang.
- **Städte am Ende** tragen die Eindeutigkeit, ohne dass eine Zahl im Vordergrund
  steht.

**Wo ich nachbessern würde — drei Punkte:**

1. ⚠️ **Echte Städtenamen sind heikel.** Sie sind endlich (irgendwann sind die
   bekannten durch), sie tragen ungewollte Nebenbedeutungen, und eine Runde,
   die „Tschernobyl" heißt, will niemand erklären. **Besser: erzeugte deutsche
   Ortsnamen aus zwei Silbenlisten** — siehe 4c.
2. ⚠️ **Zwei Zahlen im Satz sind eine zu viel.** „Allee 7 … Kaskade 3" liest
   sich wie eine Bestellnummer. Besser: die Zahlen verschwinden, und der
   ORTSNAME trägt die gesamte Identität (er wird aus demselben Hash erzeugt).
3. ⚠️ **„auf den Weg zur" ist grammatisch heikel**, weil das folgende Wort mal
   männlich, mal weiblich, mal sächlich ist („zur Kaskade", aber „zum Sturm").
   Eine Verbindung, die **kein Geschlecht braucht**, hält das Schema einfach:
   `nach`, `über`, `Richtung`.

---

## 4 · Die Skalen — mehr Auswahl, wie gewünscht

Was eine Skala taugen muss: **mindestens sechs Stufen**, eine Ordnung, die
niemand lernen muss, kurze Wörter, und **keine Wertung** — „gut" und „schlecht"
gehören nicht in einen Namen, den sich der Admin selbst gibt.

### 4a · Für den UMFANG (wie viele Spiele)

| Skala | Stufen | Urteil |
|---|---|---|
| **Wege** (Andis) | Trampelpfad · Feldweg · Schotterpiste · Gasse · Straße · **Allee** · Landstraße · Bundesstraße · Autobahn | 🥇 **9 Stufen, makellose Ordnung.** Die beste der Reihe — hier würde ich nichts ersetzen |
| **Gewässer** | Rinnsal · Bach · Fluss · Strom · See · Meer · Ozean | 7 Stufen, ebenso klar. Guter Zweitplatz, falls Wege woanders gebraucht werden |
| **Bauwerke** | Zelt · Hütte · Haus · Hof · Villa · Burg · Festung | 7 Stufen, aber „Umfang" ist bei Gebäuden weniger eindeutig als bei Wegen |

### 4b · Für WUCHT und SCHÄRFE

| Skala | Stufen | passt zu | Urteil |
|---|---|---|---|
| **Wetter** | Windstille · Brise · Wind · Böe · Sturm · Orkan | Schärfe | 🥇 Jeder versteht sie sofort, und sie klingt nach Bedingungen, nicht nach Urteil |
| **Gangart** | Schritt · Trab · Galopp · Sprint | Wucht/Takt | Nur 4 Stufen, aber passt zur Reise-Metapher wie kaum etwas sonst |
| **Tempo (Musik)** | Largo · Adagio · Andante · Moderato · Allegro · Vivace · Presto | Wucht/Takt | 🥇 7 Stufen mit eingebauter Ordnung. ⚠️ Setzt etwas Bildung voraus — wer sie nicht kennt, hört nur hübsche Wörter |
| **Feuer** | Glut · Funke · Flamme · Feuer · Brand · Inferno | Schärfe | Klar geordnet, aber dramatischer als nötig |
| **Höhe** | Ebene · Hügel · Anhöhe · Berg · Massiv · Gipfel | Anspruch | Gut, überschneidet sich thematisch aber mit den Wegen |

### 4c · Für die IDENTITÄT — der Vorschlag, der Städte ersetzt

**Erzeugte Ortsnamen aus zwei Listen**, zusammengesetzt wie echte deutsche
Ortsnamen:

```
VORNE (64)   Stein · Sturm · Nebel · Gold · Eichen · Falken · Raben · Wolfs
             Rosen · Winter · Sommer · Moor · Birken · Hoch · Tief · Alt …
HINTEN (32)  -hafen · -tal · -berg · -furt · -bach · -burg · -heim · -feld
             -au · -stein · -bruck · -rode · -wald · -see · -moor · -eck …

→ 64 × 32 = 2048 Namen, alle sprechend: Sturmhafen · Nebeltal · Goldfurt
```

**Warum das besser ist als echte Städte:**

- **2048 statt „so viele, wie uns einfallen"** — und die Liste ist mit einer
  Zeile erweiterbar, ohne dass ein bestehender Name kippt.
- **Keine echten Orte, keine Nebenbedeutungen.** Niemand fühlt sich vertreten
  oder verspottet.
- **Der Hash bestimmt den Namen**, also ergibt dasselbe Regelwerk immer
  denselben Ortsnamen — auch auf einem anderen Gerät, ohne Server.
- ⚠️ **Kollisionen bleiben möglich** (zwei Regelwerke, ein Ort). Bei 2048 Namen
  ist das ab etwa 50 gleichzeitig kursierenden Regelwerken spürbar
  (Geburtstagsparadoxon). **Deshalb steht der Kurzcode daneben** — er ist
  garantiert eindeutig, der Name ist es nur wahrscheinlich.

---

## 5 · Drei fertige Schemata zur Auswahl

### A · Die Reise (Andis Idee, aufgeräumt)

```
  Allee im Galopp nach Sturmhafen
  └UMFANG┘  └WUCHT┘      └Identität┘
```

- **Dafür:** Ein echter Satz, gut zu sprechen, die Metapher passt zur Saison.
- **Dagegen:** Die SCHÄRFE fehlt — drei Achsen machen den Satz zu lang.
- Varianten der Verbindung: `nach` · `Richtung` · `bis`

### B · Die Reise mit Wetter (drei Achsen, kompakt)

```
  Allee · Galopp · Sturm  →  Nebeltal
  └UMFANG┘ └WUCHT┘ └SCHÄRFE┘   └Identität┘
```

- **Dafür:** Alle drei Achsen drin, trotzdem kurz. Liest sich wie ein Steckbrief.
- **Dagegen:** Kein Satz mehr, sondern eine Reihe. Weniger zum Erzählen.

### C · Der Zweiteiler (kürzest möglich)

```
  Sturmhafen · Allee/Galopp
  └Identität┘  └die zwei Achsen┘
```

- **Dafür:** Der Ortsname steht vorn und wird zum eigentlichen Rufnamen
  („spielt ihr Sturmhafen?"), die Achsen sind der Untertitel.
- **Dagegen:** Die Bedeutung rückt in die zweite Reihe.

🔴 **Meine Empfehlung: B.** Der Ortsname ist der Rufname, die drei Wörter davor
sind der Steckbrief — und genau die drei Fragen beantwortet, die ein Mitspieler
vorher stellt („wie viele Spiele? wie viele Joker? wie streng?"). Schema A ist
schöner zu sprechen, aber die Schärfe wegzulassen kostet die wichtigste der
drei Auskünfte.

---

## 6 · Die Aneinanderreihung von Teil-Auswahlen

Andis zweiter Satzteil: „bzw. auch für die aneinanderreihung der einzelnen
Teilbibliotheks auswahlen".

Das passt ohne Zusatzerfindung, weil **jeder Aspekt eine eigene Achse ist**:
Wer nur den Joker-Aspekt teilt (`TS2A-joker-…`), teilt genau EIN Wort.

```
  ganzes Regelwerk   Allee · Galopp · Sturm → Nebeltal
  nur Joker-Aspekt   Galopp → Nebeltal          (nur seine Achse + Identität)
  nur Spielauswahl   Allee → Goldfurt
```

⚠️ **Der Ortsname wird je Teil-Code aus DESSEN Inhalt gebildet**, nicht aus dem
ganzen Regelwerk — sonst hießen zwei verschiedene Joker-Codes gleich, sobald
sie aus derselben Runde stammen.

---

## 7 · Offene Fragen an Andi

| ❓ | Frage | warum sie das Ergebnis ändert |
|---|---|---|
| ❓1 | **Welches Schema — A, B oder C?** | Bestimmt, ob es ein Satz oder ein Steckbrief wird |
| ❓2 | **Welche drei Achsen?** Vorgeschlagen: Umfang · Wucht · Schärfe | Der Name antwortet genau auf diese Fragen und auf keine andere |
| ❓3 | **Erzeugte Ortsnamen statt echter Städte — einverstanden?** | Echte Städte sind endlich und tragen Nebenbedeutungen |
| ❓4 | **Darf der Name sich ändern, wenn das Regelwerk sich ändert?** | Ich halte Ja für richtig (ein Name, der nach einer Änderung stehen bleibt, lügt) — aber es heißt auch: der Name in einem alten Chat zeigt auf etwas anderes |
| ❓5 | **Soll der Admin den Namen überschreiben dürfen?** | Ein eigener Name ist schön, hebelt aber die Wiedererkennung aus. Vorschlag: eigener Name ERLAUBT, erzeugter steht klein daneben |

---

## 8 · Was zu bauen wäre (wenn entschieden)

Reihenfolge, kleinste lauffähige Schritte zuerst:

1. `src/lib/namensschema.js` — die Skalen, die Silbenlisten, `nameVon(rules)`.
   UI-frei, wie jede Logik (Architektur-Regel 1).
2. **Die Stufen-Zuordnung messen, nicht raten**: welcher Messwert ergibt welches
   Wort. Braucht einen Durchgang über alle Presets/Charaktere, damit die Skala
   nicht 90 % ihrer Einträge in eine Stufe wirft — derselbe Fehler wie bei PP2
   („64 von 69 Einträgen dasselbe Icon").
3. Anzeige neben Kurzcode und in der Bibliothek.
4. Kollisions-Gegenprobe als Test: alle bekannten Regelwerke durchrechnen, die
   Zahl gleicher Namen muss 0 sein.

⛔ **Nicht anfangen, bevor ❓1–❓3 beantwortet sind.** Die Skalen sind schnell
gebaut; welche Achsen der Name trägt, ist die Entscheidung, die alles andere
festlegt.
