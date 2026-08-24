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

## 5 · ENTSCHIEDEN (Andi, 24.08.2026): ein Satz, der immer aufgeht

Andi wörtlich: *„B aber kann man da nicht immer nen Satz machen? der immer auf
geht? … bspw. **auf der Allee im Galopp bei Sturm ins Nebeltal**"*

```
  auf der Allee    im Galopp    bei Sturm     ins Nebeltal
  └── UMFANG ──┘  └─ WUCHT ─┘  └ SCHÄRFE ┘   └ Identität ┘
```

✅ **Das ist besser als mein Schema B**, und zwar aus einem Grund, den ich
unterschätzt hatte: ein Satz wird beim Hören EINMAL verarbeitet, eine Reihe aus
vier Wörtern viermal. „Spielt ihr auf der Allee im Galopp?" kann man sagen —
„spielt ihr Allee Galopp Sturm Nebeltal?" nicht.

### 🔴 Warum er IMMER aufgeht — Grammatik gehört in die Skala, nicht in Code

Andis Sorge (*„mit den ganzen kombis immer nen grammatikalischen satz machen
vllt nich so leicht"*) ist berechtigt, aber sie löst sich vollständig, wenn man
sie an der richtigen Stelle löst: **Das Geschlecht wird MIT dem Wort
gespeichert.** Dann beugt niemand zur Laufzeit, und es gibt keinen Fall, den
jemand vergessen kann.

| Fuge | Form | geht immer auf, weil … |
|---|---|---|
| `auf …` | auf **dem** Feldweg · auf **der** Allee | Genus steht am Wort: `{ wort: "Allee", genus: "f" }` → Dativ dem/der/dem |
| `im …` | im Schritt · im Trab · im Galopp · im Sprint | **alle Gangarten sind maskulin** — „im" passt ausnahmslos |
| `bei …` | bei Windstille · bei Wind · bei Sturm · bei Orkan | Dativ **ohne Artikel** — das Genus spielt gar keine Rolle |
| `ins/zum/zur …` | ins Nebeltal · zum Goldbach · zur Rabenburg | Die **Endung** trägt die Präposition: `-tal → ins`, `-hafen → zum`, `-burg → zur` |

⚠️ Zwei der vier Fugen sind also von Natur aus geschlechtsblind, und die
anderen zwei brauchen nur eine Spalte in einer Tabelle, die ohnehin von Hand
geschrieben wird. **Kein Fall bleibt offen** — und ein Test kann alle
Kombinationen durchrechnen (9 Wege × 4 Gangarten × 6 Wetter × 2048 Orte) und
prüfen, dass keine Fuge leer bleibt.

Drei echte Beispiele:

```
  auf der Allee im Galopp bei Sturm ins Nebeltal
  auf dem Feldweg im Schritt bei Windstille zum Goldbach
  auf der Autobahn im Sprint bei Orkan zur Rabenburg
```

---

## 6 · Die Codes hinter den Wörtern — und was sie NICHT können

Andis zweiter Gedanke: *„die einzelnen codes hinter den einzelnen Variablen
verstecken, der evtl ja sogar später zum gesamten Gamecode zusammensetzbar
ist"*.

✅ **Das passt genau auf die bestehende Architektur.** Ein Teil-Code
(`TS2A-<aspekt>-…`) trägt schon heute genau EINEN Aspekt. Jedes Wort im Satz
steht für einen Aspekt — also steht hinter jedem Wort ein fertiger Teil-Code,
ohne dass etwas Neues erfunden wird.

```
  auf der Allee   →  TS2A-spiele-…          (Spielauswahl)
  im Galopp       →  TS2A-joker-…           (Jokercode)
  bei Sturm       →  TS2A-naehe-… + underdog
  ins Nebeltal    →  die Identität des GANZEN
```

### 🔴 Aber: der Satz KANN das Regelwerk nicht tragen. Gemessen.

Andi ahnte es (*„son Gesamtgamecode schnell mal über 200 Zeichen"*) — die echte
Zahl ist deutlich größer. Gemessen am 24.08.2026 mit `encodePreset`:

| Regelwerk | Zeichen |
|---|---|
| Vorgabe (`DEFAULT_RULES`) | **7** |
| Preset „Standard" | 62 |
| Preset „Rangliste" | 159 |
| Charakter „Kenner-Runde" | 462 |
| Charakter „Mutig & wild" | 1 300 |
| 🔴 **Schaufenster** (188 von 199 Feldern abweichend) | **4 903** |

Und aufgeschlüsselt, wo die Zeichen liegen (Schaufenster):

| Aspekt | Zeichen | Anteil |
|---|---|---|
| **joker** | **2 315** | **47 %** |
| ereignisse | 672 | 14 % |
| modifikatoren | 453 | 9 % |
| fairness | 445 | 9 % |
| spiele | 304 | 6 % |
| alle übrigen sieben zusammen | 851 | 17 % |

⚠️ **Vier Wörter können keine 4 903 Zeichen tragen.** Das ist keine Frage von
Geschick, sondern von Informationsmenge: der Satz hat rund 9 × 4 × 6 × 2048 ≈
442 000 mögliche Formen, das Regelwerk hat astronomisch mehr Zustände.

**Die Auflösung ist Andis eigene Formulierung: der Satz VERSTECKT die Codes, er
IST sie nicht.** Drei Ebenen, jede mit ihrer Aufgabe:

| Ebene | Länge | trägt | wofür |
|---|---|---|---|
| **Satz** | ~45 Zeichen | eine Zusammenfassung | wiedererkennen, darüber reden |
| **Teil-Codes** | je 15–2 315 | einen Aspekt vollständig | einzeln weitergeben („nimm meine Joker") |
| **Kurzcode** | 6 | einen Verweis | tippen, verschicken |

Ein Klick auf „im Galopp" gibt den Joker-Teil-Code her. Alle vier zusammen
ergeben das ganze Regelwerk — nicht weil der Satz es trägt, sondern weil er
darauf zeigt.

### 💡 Und ein Weg, die 4 903 Zeichen wirklich zu drücken

Der Creator-Code speichert heute die Abweichung von **`DEFAULT_RULES`**. Die
meisten echten Regelwerke sind aber Abwandlungen eines **Charakters** — und
gegen den gemessen wäre das Delta ein Bruchteil.

```
heute    TS2-<Abweichung von der Vorgabe>              4 903 Zeichen
möglich  TS3-<Charakter-Schlüssel>-<Abweichung davon>    ~300 Zeichen
```

⚠️ **Das ist ein eigener Vorschlag, kein Teil des Namensschemas** — er würde
den Code kürzen, egal ob der Satz je gebaut wird. Er hat einen Preis: der Code
hängt dann an einem Charakter, und ändert sich dessen Definition, ändert sich
die Bedeutung alter Codes. Deshalb müsste die Charakter-Fassung mit im Code
stehen. Notiert als eigene Zeile in `design/roadmap.md`, nicht hier eingebaut.

---

## 7 · Offene Fragen an Andi

| ❓ | Frage | Stand |
|---|---|---|
| ~~❓1~~ | Welches Schema? | ✅ **Satz** („auf der Allee im Galopp bei Sturm ins Nebeltal") |
| ❓2 | **Welche drei Achsen?** Vorgeschlagen: Umfang · Wucht · Schärfe | offen — legt fest, worauf der Name antwortet |
| ~~❓3~~ | Erzeugte Ortsnamen statt echter Städte? | ✅ **Ja** |
| ❓4 | **Darf der Name sich ändern, wenn das Regelwerk sich ändert?** | offen. Ich halte Ja für richtig (ein Name, der stehen bliebe, lügt) — aber dann zeigt ein Name in einem alten Chat auf etwas anderes |
| ❓5 | **Darf der Admin den Namen überschreiben?** | offen. Vorschlag: eigener Name erlaubt, erzeugter steht klein daneben |
| ❓6 | **Kürzeres Code-Format gegen den Charakter** (siehe 6) — eigenes Thema, jetzt oder später? | offen |

---

## 8 · Was zu bauen wäre (wenn ❓2 entschieden ist)

Reihenfolge, kleinste lauffähige Schritte zuerst:

1. `src/lib/namensschema.js` — die vier Skalen MIT Genus und Fuge, die zwei
   Silbenlisten, `satzVon(rules)`. UI-frei (Architektur-Regel 1).
2. **Die Stufen-Zuordnung messen, nicht raten**: welcher Messwert ergibt welches
   Wort. Braucht einen Durchgang über alle Presets und Charaktere, damit die
   Skala nicht 90 % ihrer Einträge in eine Stufe wirft — derselbe Fehler wie bei
   PP2 („64 von 69 Einträgen dasselbe Icon").
3. **Grammatik-Test über ALLE Kombinationen** (9 × 4 × 6 × 2048): keine Fuge
   leer, kein doppeltes Leerzeichen, jeder Satz endet ohne Rest.
4. Anzeige: der Satz neben dem Kurzcode, jedes Wort anklickbar → sein Teil-Code.
5. Kollisions-Gegenprobe als Test: alle bekannten Regelwerke durchrechnen, die
   Zahl gleicher Sätze muss 0 sein.

⛔ **Nicht anfangen, bevor ❓2 beantwortet ist.** Die Skalen sind schnell
gebaut; welche Achsen der Satz trägt, legt alles andere fest.
