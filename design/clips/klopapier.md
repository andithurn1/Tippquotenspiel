# Clip „Klopapier" — Stand der Higgsfield-Arbeit

Stand abgelesen aus der Higgsfield-Historie am 28.09.2026 (die Sitzung, die ihn
gebaut hat, hat nichts ins Repo geschrieben — deshalb diese Datei).
Gearbeitet wurde am 26.–27.09.2026, ~60 Generierungen.

## Idee

Schwarz-weißer Graphic-Novel-Look, Ich-Perspektive vom Klo. Eine Klorolle mit
bedruckten Blättern (Karikaturen: Goldketten-Muskelmann, Trainingsanzug-
Gangster, Kiffer mit Bommelmütze, Dichter mit Rollkragen, Autotune-Heulsuse).
Eine weiße Hand im Smoking-Ärmel reißt das Papier ab, die leere Papprolle
fliegt vom Halter und landet aufrecht auf der Ablage — darauf ein Porträt im
Banknoten-Stil (Lorbeer-Oval, Mann mit Sonnenbrille, kleine Maske, Fliege).

## Verlauf

1. 26.09. abends: Kulisse Marmorwand/-ablage, Halter, Drucke, Hand.
2. 27.09. vormittags: Dicke der Papprolle mehrfach korrigiert.
3. 27.09. nachmittags: Wand/Ablage von Marmor auf **matt schwarze Fliesen +
   dunkle Steinablage** umgestellt (Hintergrund-Platte `6d20f0fc`).
4. 27.09. abends: Rolle ~30 % schlanker, ~10 % länger (Start/Ende neu).

## Aktuelle Schlüsselbilder (Higgsfield-Job-IDs)

| Rolle | Job | Modell |
|---|---|---|
| Startbild: Hand greift unterstes Blatt | `2cdc54a3-a30f-4ac1-88b5-42ff937c39b9` | gpt_image_2_5 |
| Endbild: Papprolle steht auf der Ablage (schlank) | `08e4e319-b92b-435f-a20a-05768488ec86` | gpt_image_2_5 |
| Zwischenbild: Papprolle im Flug (schlank) | `2445597d-f6da-4dad-b996-17d518cd1199` | gpt_image_2_5 |
| Leere Hintergrund-Platte (schwarze Fliesen) | `6d20f0fc-5185-4fda-9b08-f2294db8d8f9` | gpt_image_2_5 |
| **Letzter Clip** (Start→Ende, 5 s, 2K) | `223e864d-244a-40fb-954b-755cbdf29904` | minimax_h3 |

Frühere Clip-Versuche: `f5d1d256`, `f6561587`, `818787bb`, `a1c7fd40`,
`7a590013` (kling3_0), `495ee1b9` (seedance_2_0_mini), `4b40bc63` (minimax_h3).

## Andis Auswahl (28.09.2026) — die vier Schlüsselbilder

Per Bild-Fingerabdruck gegen die Higgsfield-Bilder abgeglichen (Abweichung 6–10 von
~20 000 möglich, also identisch; das Startbild 550 wegen anderer Kompression):

| # | Moment | Job |
|---|---|---|
| 1 | Hand hält unterstes Blatt (Muskelmann) | `2cdc54a3-a30f-4ac1-88b5-42ff937c39b9` |
| 2 | Papprolle rutscht vom Armende, schräg in der Luft | `13f3a2d4-d56d-4abf-8a49-5cc95e8c81f6` |
| 3 | Papprolle knapp über der Ablage, Porträt dreht rein | `f9a40f30-b793-4d13-a969-27d5f997adf0` |
| 4 | Papprolle steht, Porträt vorn | `5f1c1a69-9de4-4565-a2ca-1790ccbe6323` |

⚠️ 3 und 4 sind die DICKEREN Fassungen, nicht die schlanken (`2445597d`/`08e4e319`).

⛔ **Ohne Auftrag erzeugt — Andi: „jeder Clip ist beschissen".** Kosten 30 Credits
(3 × 10; die 4-s-Versuche wurden erstattet). Vor dem nächsten Clip braucht es
erst die fehlenden Keyframes, damit die Videogenerierung sie annimmt.

Der Durchgang: drei Übergänge, minimax_h3, 2K. Mit 4 s sind alle drei
ohne Meldung gescheitert (Credits zurück), mit 5 s liefen sie durch —
1→2 `ba8cada4`, 2→3 `84434956`, 3→4 `9769513c`.
Zusammengeschnitten in der Higgsfield-Sandbox (ffmpeg, doppeltes Übergangsbild
entfernt, 15,4 s): Medium `1f2d2a6c-6276-4609-9392-7a87ed9af9c7`.

## Analyse 28.09.2026 — was fehlt, was nicht zusammenpasst

Andis Ablauf: Hand zieht die Rolle (nur 5 Blätter) zu sich nach unten und reißt sie
ab → der Drall schiebt die leere Papprolle drehend nach links → im Flug stellt sie
sich auf → landet aufrecht, Porträt nach vorn. Ziel später ~3 s.

**Gemessen** (Pixel bei 2000 px Bildbreite; Papierstreifen im Startbild 398 px ≈ 10 cm):

| Bild | Moment | Länge | Dicke | Farbe (R−B) |
|---|---|---|---|---|
| `2cdc54a3` A | Rolle mit Papier auf dem Arm | ~435 auf dem Arm | ~80 | Papier 33 |
| `874441ec` | Rolle kippt vom Armende | 438 | 82 | 39 braun |
| `13f3a2d4` B | gerade vom Arm, fast waagerecht | 435 | 77 | 38 braun |
| `f9a40f30` C | knapp über der Ablage (dick) | 412 | **109** | 29 |
| `2445597d` | dasselbe, schlank | 402 | 75 | 30 |
| `5f1c1a69` D | steht (dick) | 390 | **118** | 27 hell |
| `08e4e319` | steht, schlank | 408 | 82 | 25 hell |

- ⚠️ **Dicke:** C/D sind 40–50 % dicker als B — und dicker als die volle Rolle im
  Startbild. Die schlanken Fassungen `2445597d`/`08e4e319` passen (75–82).
- ⚠️ **Porträt:** C zeigt einen anderen Mann (Blätterkranz, KEINE Maske). D passt zum
  Charakterblatt `6527ccc5` (Sonnenbrille, Maske, welliges Haar). `2445597d` ist aus C
  abgeleitet und trägt laut Auftrag dessen Porträt.
- ⚠️ **Material:** B und `874441ec` braunes Packpapier, D hell-grau mit Spiralnaht —
  die Rolle würde im Flug „ausbleichen".
- ⚠️ **Flugbahn:** Mitte B x=849 → Landung x≈916: die Rolle landet ~1,5 cm RECHTS vom
  Absprung, obwohl der Drall nach links schiebt.
- ✅ **Hintergrund:** Fliesen und Ablage in A–D deckungsgleich (mittlere Abweichung
  1–6 von 255). Nur die Chrom-Rosette ist je Bild anders gespiegelt (11–19).
- ✅ Alle vier gewählten Bilder sind schon auf schwarzen Fliesen. Marmor gibt es nur
  noch bei Momenten, die in der Folge fehlen (z. B. `8df32631` Rolle rutscht auf dem Arm).

## 🔢 Die Bildnamen — so reden wir über die Bilder (Andi, 28.09.2026)

Andi: *„du sagst immer K2 K3 aber ich weiss garnicht welches bild du meinst"*.
Deshalb: **Nummer + Name**, sichtbar auf der **Storyboard-Tafel** (Higgsfield-Medium
`2bbbf2d8-6c20-4691-b6a3-529b3bf1e2d2`, in der Sandbox gebaut, 0 Credits). Im Chat
immer „Bild 6 · Flug", nie eine Job-ID allein und nie „K6".

| Nr · Name | Moment | Bild | Stand |
|---|---|---|---|
| 1 · Griff | Hand hält den Muskelmann | `a31fa69c` (Medium, dicke Rolle, rechts, Stange repariert) | vorhanden — alt: `2cdc54a3` |
| 2 · Ruck | Hand reißt das Papier ab, Rolle dreht | — | fehlt |
| 3 · Rutschen | leere Rolle rutscht drehend nach links | — | fehlt (Marmor-Vorlage `8df32631`) |
| 4 · Kippen | Rolle kippt vom Armende | `874441ec` | vorhanden, optional |
| 5 · Absprung | Rolle gerade vom Arm, fast waagerecht | `13f3a2d4` | vorhanden |
| 6 · Flug | Flugmitte, schräg ~45°, Porträt dreht links rein | — | fehlt |
| 7 · Anflug | kurz vorm Aufsetzen | `2445597d` | Porträt korrigieren |
| 8 · Stand | steht, Porträt vorn | `f5abe946` (dicke Rolle, links) | vorhanden — davor `bf4d4c4e`, `08e4e319` |

Wird ein Bild ersetzt, wird die Tafel neu gebaut (Skript in der Sandbox, kostenlos) —
die Nummern bleiben, nur das Bild wechselt.

**Entschieden (Andi, 28.09.2026):**
- ✅ **Schlanke Rolle** — *„meines Erachtens sind die groß genug"*. Also 7 · Anflug
  `2445597d` und 8 · Stand `08e4e319` statt der dicken `f9a40f30`/`5f1c1a69`.
- ✅ **Flugbahn:** *„müsste mit den Keyframes erstmal passen"* — vorerst keine eigene
  Korrektur; 6 · Flug wird zwischen 5 · Absprung und 7 · Anflug gelegt.
- ❓ Material angleichen (braun bei 4/5, hell bei 7/8) — offen.
- ⛔ Erzeugen von 2 · Ruck, 3 · Rutschen, 6 · Flug und dem Porträt-Fix an 7 · Anflug:
  **noch nicht freigegeben.**

## 🎯 Bewegung: Schub nach links schon beim Abreißen, dann gleichmäßig (Andi, 28.09.2026)

Andi: *„das häufige Problem, dass die Papprolle wenn sie leer ist auf einmal nach
vorne schießt. Dabei soll sie während dem Abreißen schon Schub nach links bekommen
… der dann weiterhin gleichmäßig ist, bisher waren alle Ergebnisse eher beschleunigt"*.

Gemessene Mitte der Rolle (x, Pixel bei 2000 px Breite): 1 · Griff ~1352 →
4 · Kippen 1083 → 5 · Absprung 849 → 7 · Anflug 901 → 8 · Stand 916.
⚠️ Nach dem Absprung läuft sie wieder NACH RECHTS — mit „gleichmäßig nach links"
nicht vereinbar; vermutlich ein Teil des Ruckelns.

Daraus für die Keyframes:
- 2 · Ruck zeigt die Rolle schon ein Stück nach links gewandert, WÄHREND das Papier
  noch abläuft (Schub beginnt beim Abreißen, nicht danach).
- Die Rollen-Mitte wandert von Bild zu Bild nur nach links; Landung links vom
  Absprung (Vorschlag ~x 650–700) → 7 · Anflug und 8 · Stand verschieben.
- Größe der Rolle in allen Bildern gleich (±5 %) — wächst sie, liest das Modell
  „kommt auf die Kamera zu".
- Prompts: „moves only left and down, parallel to the wall, never towards the camera,
  constant speed, no acceleration"; ⛔ nie wieder „towards the camera" beim Ruck.
- Im Schnitt: jedes Teilstück so raffen, dass Weg ÷ Zeit überall gleich ist
  (kostenlos, ffmpeg).

## Andis Favorit: `223e864d` (28.09.2026) — „nur das Beschleunigen ist Schmarrn"

Vermessen (24 fps, 124 Bilder, Rollen-Mitte x in 2000er Maßstab):
- 0–1,4 s Hand zieht, Papier geht ab.
- **1,4–1,65 s Rolle steht still** auf dem Arm (x≈1240), dann **schießt sie los**:
  Weg je Bild 5 → 11 → 18 → 32 → 50 → 54, danach langsamer (40, 28 …).
- 2,75 s Landung bei x≈775 (links ✓), **danach 1,3 s Rutschen nach RECHTS** bis x≈950 —
  vom Endbild erzwungen.

Testfassung ohne Neuerzeugung (Sandbox, 0 Credits), Medium
`5bfa9300-1225-4cea-add8-acdf6fecee04`, 2,9 s: Anfangshalten gekürzt, Stillstand
raus, Flug auf gleichmäßig 29 px/Bild umgerechnet (791 px in 27 Bildern), Schluss
bei der Landung + 0,5 s Halten. ⚠️ Gleichmäßig gemacht durch Auslassen/Doppeln von
Bildern — kann leicht stottern; weicher ginge per Zwischenbild-Berechnung (ffmpeg
`minterpolate`, auch kostenlos). ⚠️ Ob die Rolle bei der Landung schon mit dem
Porträt nach vorn steht, ist ungeprüft — das Drehen passierte im Original teils
während des Rechtsrutschens.

Vorgaben für neue Bilder (Andi): Halter und Rolle in JEDEM Bild identisch; die
5 Blätter an der fast leeren Rolle leicht mit Motiv bedruckt (verschwimmen eh im
Bewegungsunschärfe); Fall nach unten nicht beschleunigen — die Strecke ist kurz.

## Neuer Anlauf (Andi, 28.09.2026): wenige Keyframes, richtige Anweisung

Andi: *„lass uns lieber ein neues erstellen mit den richtigen Anweisungen und
Keyframes (eigentlich braucht es ja gar nicht so viele) … Schmarrn, dass das Modell
auf einmal macht, dass sich die Rolle wieder in die andere Richtung dreht"*.

Vorschlag (wartet auf Andis Ja):
1. **Bild 8 · Stand nach links verschieben** — dorthin, wo die Rolle in `223e864d` von
   selbst gelandet ist (Mitte x≈775 statt 916). Sonst zwingt das Endbild wieder ein
   Rutschen nach rechts. 1 Bild-Edit, 4,5 Credits.
2. **Ein Clip: 1 · Griff → 8 · Stand (neu)**, MiniMax H3, 5 s, 2K, 10 Credits.
   Wenn der Flug danach noch ausschert: 5 · Absprung als Mittelbild dazu (+10).

Die Anweisung für den Clip (Entwurf):

> Black and white graphic-novel look, first-person view from the toilet. Locked-off
> static camera. Black tiled wall, dark stone ledge and the chrome holder never move
> or change. The white hand in the black tuxedo sleeve pulls the printed paper
> straight DOWN in one smooth pull. The pull makes the thin roll spin in ONE direction
> only (front surface moving down) and, already while the last sheets are coming off,
> the drag pushes the roll to the LEFT along the arm. The now empty cardboard core
> keeps spinning in the same direction and slides off the open left end of the arm
> WITHOUT stopping. From there it keeps exactly the same leftward speed, drops a short
> way down in a gentle arc parallel to the wall, and turns upright during the fall so
> the printed portrait comes round to the front. It lands upright on the ledge with
> one tiny wobble and then stays exactly where it landed.
> Constant speed from the pull to the landing, no pause, no sudden acceleration.
> Avoid: the core moving towards the camera, the core growing or shrinking, the spin
> reversing, the core sliding to the right, the holder or roll changing shape,
> morphing faces, colour.

## Schritt 1 erledigt (28.09.2026): 8 · Stand nach links

Andi: *„ok schritt 1, und achte darauf dass einheitliche Größen verwendet werden"*.
1. Montage in der Sandbox (0 Credits): Rolle aus `08e4e319` maßgleich auf die leere
   Kulisse `6d20f0fc` gesetzt, Mitte x 916 → ~772; Fußpunkt aus der gemessenen
   Ablagen-Perspektive (Oberkante vorn 0,47, Wandfuge 0,35 px/px). Medium `c15f1719`.
2. Bild-Edit GPT Image 2.5 (4,5 Credits, Job `e4936788`) nur für Schatten + Spiegelung.
   ⚠️ **Das Modell hat die Rolle trotz Verbot 20 % schlanker gemacht** (66 statt 82 px).
3. Deshalb Rolle aus der Montage wieder darübergelegt, Schatten/Spiegelung vom Modell
   behalten (0 Credits). **Neues 8 · Stand = Medium `bf4d4c4e-9c81-4934-8b45-eb33f75a9eca`**:
   Mitte x≈772, Dicke 81 px (Folge: 75–82), Wand/Halter unverändert (Abweichung 4–7).

🔴 Lehre: Größen NIE dem Bild-Modell überlassen — erst maßgenau montieren, das Modell
nur einpassen lassen, danach NACHMESSEN und notfalls die Rolle zurücklegen.

## Idee Andi 28.09.2026: alles lassen, nur Rolle + Papprolle realistisch dick

Andi: *„alle bisherigen Bilder … sonst alles gleich lassen, nur dass eben die Papprolle
und dementsprechend auch die ganze Rolle deutlich dicker … so wie sie es eigentlich
auch in echt sind"*.

Maßstab: Papierbreite 398 px ≈ 10 cm → ~40 px/cm. Echte Papprolle ≈ 4,3 cm → **~175 px**
(heute 75–82 px, also ~2,2×). 5 Blätter tragen kaum auf (<1 mm) → volle Rolle ~180 px.
Chromarm ≈ 70 px (≈1,75 cm): eine echte Papprolle hängt LOCKER darauf und sitzt mit der
Innenseite oben auf dem Arm → ihre Mitte liegt ~50 px tiefer als die Arm-Mitte.
Betroffen: 1 · Griff, 4 · Kippen, 5 · Absprung, 7 · Anflug, 8 · Stand (+ die neuen).
Zwischenstufe gibt es schon: die dicken Fassungen `f9a40f30` (109) / `5f1c1a69` (118).
Am 27.09. ging es schon einmal hin und her (`8ce9f5e7` „viel dicker, Durchmesser halb
so groß wie die Länge", danach wieder schlanker) — deshalb diesmal EIN Maß festlegen
und in jedem Bild nachmessen. ⛔ Wartet auf Andis Ja.

Andi 29.09.2026: *„vielleicht etwas schmaler die Rolle, so einen Zentimeter, und dafür
etwas dicker"* → Länge 9 cm (≈360 px) statt 10. Dicke noch offen: kostenlose Vorschau
(nur gestreckt) mit heute 2 cm · 2,9 · 3,75 · 4,3 cm, Medium `5fba6f23`.
✅ **Entschieden (Andi 29.09.): 3,75 cm dick, 9 cm lang → 150 × 360 px** (2000er Maßstab).
⚠️ Wird die Rolle 9 cm lang, muss auch der Papierstreifen in 1 · Griff 9 cm breit werden.

## Dicke Rolle, Durchgang 1 (29.09.2026, 9 Credits, freigegeben „jo")

- **8 · Stand** `f5abe946` (Montage `8fd627e2` als Vorlage): Rolle **141 × 357 px**
  (Soll 150 × 360), Mitte x 770 ✅, Hintergrund unverändert (4,6–8,1). ~6 % zu schlank.
- **1 · Griff** `a1e16890`: ⚠️ Papierstreifen nach zwei Messarten nur **~230–250 px**
  breit (Soll 360, vorher 398) — das Modell hat „10 % schmaler" als ~40 % ausgeführt.
  Hintergrund/Hand unverändert (2–7, Rosette 11). Rollendicke nicht sauber messbar.
  Ungeprüft, ob es im Bild so aussieht — Andi schaut.

Andi zu Durchgang 1: *„Rolle ist nicht schlecht, aber das erste ist etwas zu schmal,
der Pumper ist direkt zweimal und der Jogginganzugträger ist abgeschnitten"* → 1 · Griff
muss neu (Streifen 360 px, jeder Charakter genau einmal).

**Charakter-Vorlagen (Druckmotive):**

| Figur | Job |
|---|---|
| Pumper (Goldketten-Muskelmann) | `402e0c30` (hängendes Blatt in der Szene) |
| Jogginganzug-Gangster | `1dd7504d` |
| Kiffer | `03710f3c` |
| Autotune-Heulsuse | `2b3ba795` |
| Pseudo-Poet | `7b795682` |

**1 · Griff, Versuch 2** `2e19de98` (4,5 Credits, Maßvorlage `dab8a683` + Figuren
3/4/5 mitgegeben): Papier **~281 px** breit, gemessen über die Außenkanten (Soll 360,
alt 407, Versuch 1 ~240). Wieder zu schmal, aber näher dran. Hand weicht ab (16).
🔴 Muster: das Modell verschmälert Papier und Rolle bei jedem Edit mehr als verlangt.

Andi: *„eigentlich gut so, nur muss die Rolle deutlich weiter rechts an der Stange sein,
weil sie ja erst nach dem Abziehen der Papiere nach links bewegt wird, und vielleicht
einen Ticken größer"* → Montage in der Sandbox (0 Credits): Rolle + Papier + Hand um
154 px nach rechts und 26 px nach unten (entlang der Stangenneigung 0,17), ×1,1.
**Neues 1 · Griff = Medium `cbf880c5-95b6-4a6a-a864-a612bb387707`**, Papier 1267–1576
(308 px ≈ 7,7 cm), rechtes Rollenende ~x 1590 (Rosette ab ~1600).
⚠️ Erster Montageversuch verworfen: der Chromarm wurde als Rolle erkannt → nach LINKS
geschoben; die Kontrollmessung hat es gefangen.

**Stange repariert (29.09.2026):** Andi *„beim neuesten passt die Chromstange leider
nicht"* — Ursache gemessen: das KI-Bild hatte die Stange dünner gezeichnet (61 statt
79 px), in der Montage steckten zwei Stangen. Bild-Edit `5369b7c6` (4,5 Credits) nur für
die Stange, danach alles außer einem Band um die Stange aus der Montage zurückgelegt.
**1 · Griff = Medium `a31fa69c-89dc-4c8c-b175-4f575a406e37`**: Stange links der Rolle
85–88 px wie Kulisse (83–89); Papier/Figuren/Hand/Fliesen = Montage (Abweichung 0,0–0,1).
Andi dazu: *„ja gut so! Hand muss auch nicht unbedingt farbig sein"*.

## 🎬 Drehbuch 3 s (Stand 29.09.2026, zur Abnahme durch Andi)

Andi: *„die Zwischen-Keyframes wären auch ganz gut … sag nochmal exakt und genauer, wie ich
die Gesamtvideoszene haben will, die geht ja eigentlich nur 3 Sekunden"*.

Maße (2000er Maßstab): Rollen-Mitte Start x≈1420 (an der Stange rechts) → Landung x≈770.
Rolle überall 150 × 360 px. Waagerecht gleichmäßig ≈ 14 px je Bild (24 fps).

| Zeit | Was passiert | Rollen-Mitte x | Keyframe |
|---|---|---|---|
| 0,0–0,2 s | Hand hält den Pumper, Stillstand | 1420 | 1 · Griff `a31fa69c` |
| 0,2–0,8 s | Hand zieht nach unten zu sich, Papier läuft ab, Rolle dreht; ab 0,4 s rutscht sie schon nach links | 1420 → 1285 | 2 · Ruck (neu, bei 0,6 s) |
| 0,8 s | letztes Blatt reißt ab, leere Papprolle dreht weiter | 1285 | — |
| 0,8–1,3 s | Papprolle rutscht drehend bis zur Stangenspitze, gleiches Tempo | 1285 → 1110 | — |
| 1,3–2,3 s | fliegt ohne Halt nach links, flacher Bogen nach unten, stellt sich auf, Porträt dreht nach vorn; Fall nicht beschleunigt | 1110 → 770 | 6 · Flug (neu, bei 1,8 s, ~45°) |
| 2,3–2,5 s | landet aufrecht, kleiner Wackler | 770 | — |
| 2,5–3,0 s | steht still, Porträt schaut in die Kamera | 770 | 8 · Stand `f5abe946` |

Immer: Drehung nur in EINE Richtung, nie zur Kamera, Größe gleich, Halter/Wand unverändert.
Vorschlag: 2 Zwischenbilder (Ruck, Flug) → 3 Teilstücke, danach kostenlos auf 3 s gerafft.

## Zwischenbilder 2 · Ruck und 6 · Flug (29.09.2026, 9 Credits, Andi „ok")

Vorlagen (0 Credits): Ruck `25a64eb9` (1 · Griff um 70 px nach links entlang der Stange),
Flug `8772574d` (Rolle aus 8 · Stand, 45° gekippt, Mitte 940/483).
- **6 · Flug** `7584fec7`: Mitte (934, 474) ✅, Winkel 46° ✅, Länge 353 ✅, **Dicke 119
  statt 142** (~16 % zu schlank). Hintergrund unverändert (4,9–9,3).
- **2 · Ruck** `cd9b74f0`: Papier unterhalb der Rolle ~260 px statt 302 (~14 % schmaler),
  Rolle reicht ~25 px weiter nach links als in der Vorlage. Stange links 80–81 px (Kulisse
  85–89). Bewegungsunschärfe verlangt — Andi prüft, ob es im Bild stört.

Kein Modell nimmt mehr als Start- + Endbild als Keyframe (FLUX 3 Video, MiniMax H3:
weitere Bilder nur als Referenz). Also je Keyframe-Paar ein Teilstück, danach in der
Sandbox zusammenschneiden und auf ~3 s raffen (kostenlos).

Kosten (Stand Transaktionen): Bild-Edit GPT Image 2.5 Flare 4,5 Credits · MiniMax H3
5 s 10 Credits (4 s scheiterte am 28.09. dreimal).

⛔ Nichts davon ist beauftragt — wartet auf Andis Entscheidung.

## Offen

- ❓ Urteil über den letzten Clip `223e864d` fehlt noch.
- ❓ Wo er in der App landet (Reaktion „letzter"/„daneben", Spott-Clip SP1?)
  ist nicht festgehalten. Format für die App steht in `public/reactions/README.md`
  (stumm, loopend, MP4, quadratisch empfohlen — dieser Clip ist 16:9).
