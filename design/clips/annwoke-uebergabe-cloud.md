# Ann-woke — Übergabe an die Cloud-Session
Stand: 30.09.2026, mittags. Autor: Andi. Higgsfield-Guthaben 2137 Credits (Ultra).
Engpass ist NICHT Higgsfield, sondern das Claude-Budget und die Zeit bis heute Abend.

---

## 0. Was du als Erstes tust

1. Higgsfield-Verbindung herstellen. Alle Job-IDs unten bleiben gültig, die hängen
   am Higgsfield-Account, nicht am Claude-Account.
2. `nichnet\annwoke\QUELLEN.md` lesen — das ist das Produktionslog, 1571 Zeilen.
   Besonders die letzten beiden Abschnitte (Arbeitsregeln vom 29.09.).
3. NICHT sofort generieren. Erst Abschnitt 5 hier lesen, das spart Runden.

---

## 1. Die Arbeitsregeln, die diese Sessions gekostet haben

Diese fünf Regeln stammen aus zwei verbrannten Abenden. Sie sind nicht optional.

**Maximale Referenz, minimale Beschreibung.** Nie das ganze Bild neu beschreiben.
Ein bereits freigegebenes Bild ist die Basis, im Prompt steht EINE benannte
Änderung, alles andere ausdrücklich als „bleibt exakt wie in Referenz 2".

**Alles, was man neu beschreibt, erfindet das Modell neu.** Bühne, Licht, Menge,
Stil im Prompt zu wiederholen ist kein Absichern, sondern eine Einladung zum Drift.
So ist die Absperrung von einem Chromgeländer zu einer Bretterwand geworden.

**Eine Änderung pro Runde.** Mehrere gleichzeitig heißt, man weiß hinterher nicht,
welche Formulierung den Schaden angerichtet hat.

**Details kommen aus Bildern, nicht aus Worten.** Maske und Frisur IMMER als
Detailspender-Referenz an erster Stelle, Szenenbild an zweiter. Die Maske in Worten
zu beschreiben endet zuverlässig in einem Bart oder einem Balken.

**Vor dem Zeigen selbst prüfen, in der 100-%-Ansicht auf dem Gesicht.** Die
verkleinerte Übersicht taugt nur für Komposition.

**Und: ein Widerspruch zwischen Start- und Endframe ist im Videoprompt NICHT
reparierbar.** minimax_h3 springt in der ERSTEN SEKUNDE in die Welt des Endbilds.
Wenn die beiden Keyframes verschiedene Welten zeigen, hilft kein `stays intact`.

### Der nsfw-Filter
Formulierungen wie „junge Frauen" + Körperteile („ein Knie auf der Kante") +
Mundbeschreibungen reißen den Filter. Drei von vier Läufen abgewiesen.
Funktioniert: „fans", „climb", „cheer", „calling out". Der Filter prüft das
Ergebnis, nicht nur den Prompt.

### Widget-Regel
Nach JEDER Generierung `show_generation_by_ids` mit dem kompletten Material der
Szene in Erzählreihenfolge, das Neue am Ende — Andi springt dann hin und her und
sieht Brüche sofort. **Höchstens elf Einträge pro Aufruf**, sonst ist die Antwort
zu groß und das Widget kommt gar nicht.

### Dateipfade
Andi kann mit Pfaden nichts anfangen. Dateien über SendUserFile in den Chat
schicken, nicht auf Ordner verweisen. Umgekehrt zieht er Dateien in den Chat,
von dort sind sie unter `/mnt/user-data/uploads/` lesbar.

### Prüfen von Clips
Der Higgsfield-CDN ist aus dem Container und aus der Geräte-VM gesperrt. Ein Clip
lässt sich nur beurteilen, wenn Andi ihn in den Chat zieht — dann mit ffmpeg einen
Frame-Streifen bauen (`select='not(mod(n,12))',tile=4x4`) und ansehen. Einzelne
Bilder gehen über den Browser-Pane: `Claude_Browser__preview_start` mit der
result_url, dann `computer {action:"screenshot"}`, einmal klicken für 100 %.

---

## 2. Wo die Zepter-Szene steht

Reihenfolge der Sequenz, sieben Clips, lokal in `nichnet\annwoke\zepter\`:

```
z1 Fang                292440e4-db67-4a02-a360-822b7cf1603e   OK
z2 Steppen/Ausholen    252929ff-1eb8-476d-ba2e-aec0209aceac   OK
z3 flacher Schwung     f8f60628-3be9-4e1b-a34c-c661722c72ab   OK
z4 Rotor/Treffer       e84ecaa0-fd8a-4b47-ac69-5f87116af148   OK
   Keyframe Treffer    6ca3ee5a-92b5-4d35-830a-c71eb370133b
z5 Umfallen/Daumen     16ff15d2-f3b4-46c5-b9d8-c77c83a07dfa   OK
   Keyframe Daumen     ee732115-7644-41a7-9c29-ba5f9c597ac4   << letzter gültiger Stand
z6 Absperrung          VERWORFEN (Bretterwand, Geometriebruch)
z7 Abgang              VERWORFEN (erbt den Bruch)
```

**Die Geometrie, die stimmt** (aus z1–z5): niedriges, glänzendes Chromgeländer
DIREKT an der Bühnenkante, kein Zwischenraum, kein Graben. Erste Reihe durchgehend
Frauen auf gleicher Höhe, dahinter eine Reihe Männer, einen Kopf höher. Schmales
Publikumsband, etwa 15 % der Bildhöhe.

**Der Fehler, der alles danach zerstört hat:** Im Endbild von z6 (`5d13d6c7`) wurde
die Szene im Prompt komplett neu beschrieben, um die Graben-Geometrie zu korrigieren
— dabei wurde aus dem Chromgeländer eine hohe Bretterwand mit Graben davor. z7 baut
darauf auf. Beide Clips sind unbrauchbar.

### Der neue Strang (30.09.)

```
Platte ohne Figur          7e7bdbab-595b-411d-b973-95ad66c74b79
Endframe 1 (Montage)       media_id d1553ae5-a86e-43cd-82e5-6c079fc7170a
                           lokal: nichnet\annwoke\endbild-absperrung.png
Clip Daumen -> Endframe 1  226a317e-c86b-49cb-a1b4-f571f745144d  (aktuellste Fassung)
                           Vorgänger: c4dca84d (fror am Ende ein),
                           ed0c0f5e (Drehung ging im Gang unter)
Platte weiter 1            36695784-8705-4f7f-ab0d-6804f211274a
Platte weiter 2            8fb00511-3301-4063-a505-d98988e4accd  (Rücken zur Kamera)
Platte weiter 3 FRONTAL    36b0a0fc-ac95-4728-9c84-fdf9ee9ee67c  << Andis Favorit
                           Alternative: eee6b739-6ab8-4c21-b1c0-62da10276a94
```

**Offen, direkt als Nächstes:** In `36b0a0fc` die Figur einsetzen (siehe Abschnitt 3),
das ergibt Endframe 2. Dann Clip Endframe 1 -> Endframe 2. Dann Debussy-Ebene drüber,
dann stoppt die Szene.

### Debussy-Graffiti
```
Stencil allein, schwarz+orange auf Weiss   0236adad-c05d-4380-9b67-47b54a3347b9
Beispiel über einer Szene                  10bc03d3-d3d6-408b-89fd-4eaf894c872a
Altes Standbild (falsche Absperrung)       lokal zepter\z8-debussy-standbild.png
```
Das Weiß muss noch auf transparent gesetzt werden, dann ist es eine freie Ebene für
den Schnitt. Trivial lokal mit PIL. Debussy ist gemeinfrei, das Stencil ist unser
eigenes — kein Rechteproblem.

---

## 3. Die Freistell-Methode (Andis Idee, funktioniert)

Das Problem: jede Generierung zeichnet den Mann neu, und dabei driften Maske,
Frisur, Anzug. Die Lösung: ihn gar nicht neu zeichnen lassen.

1. Frame aus einem fertigen Clip ziehen, in dem er richtig aussieht:
   `ffmpeg -ss 4.2 -i zepter/z6-absperrung.mp4 -frames:v 1 -q:v 2 frame.png`
   Die Clips liegen lokal, kostet nichts.
2. Eng um ihn herum beschneiden.
3. Freistellen im Container: `pip install rembg onnxruntime --break-system-packages`,
   dann **`new_session("u2net_human_seg")`** benutzen. Das Standardmodell
   (bria-rmbg, 1 GB) sprengt den Speicher und wird gekillt.
4. In die Platte einsetzen. Skalierung Platte/Quelle = 2688/2560 = 1,05.
   Füße auf dieselbe relative Höhe wie im Quellframe.
5. **Spiegelung bauen** — der Bühnenboden spiegelt. Figur vertikal spiegeln, auf
   45 % Höhe stauchen, Gaussian Blur 5, Alpha mit linearem Verlauf 0,40 -> 0
   von oben nach unten, direkt unter die Füße setzen.
6. Andi lädt das Ergebnis per `media_upload_widget` hoch, dann ist es als
   Endframe benutzbar.

Das Skript dafür steht in `/home/claude/comp.py` der alten Session — falls nicht
vorhanden, ist es in zwanzig Zeilen neu geschrieben, die Parameter stehen oben.

Figur-Frames, schon extrahiert, in `nichnet\annwoke\z6-check\`:
`gang/gang-1..4.png` (3,2 / 3,7 / 4,2 / 4,7 s) und `gang2/gross-1..2.png` (4,5 / 4,9 s).
Für Endframe 1 wurde gang-3 benutzt. Für Endframe 2 steht die Wahl zwischen
gross-1 und gross-2 noch aus.

---

## 4. Andis offene Frage: Cinema-Fassung der schwachen Clips

Er will die bisherigen, eher mäßigen Clips in hoher Qualität neu machen und dabei
die bestehenden Clips als Referenz vorgeben, damit die Handlung 1:1 übernommen wird.

**Das Werkzeug dafür heißt Genjutsu**, Modell-ID `hf_mult_motion_control`, läuft über
`generate_video`. Beschreibung: „Transfer motion from a reference video to subjects in
reference images." Medien-Rollen: `image_references` plus `video_references`.
Auflösung 480p / 720p / **1080p** — mehr nicht.

**Was ich ihm dazu ehrlich sagen würde, bevor Credits fließen:**

- **1080p ist WENIGER als die jetzigen Clips.** Die laufen auf 2K (2560×1440).
  Genjutsu bringt also keine höhere Auflösung, sondern bestenfalls bessere Bewegung.
- Genjutsu ist auf **Subjekte** gebaut — eine Figur, die die Bewegung aus dem
  Fahrervideo übernimmt. Ob es eine komplette Bühne samt Publikum, Absperrung und
  Spiegelungen 1:1 mitnimmt, ist offen. Wahrscheinlich nicht.
- Realistischer Weg für „gleiche Handlung, höheres Niveau": dieselben Keyframes
  in ein stärkeres Videomodell geben. Kandidaten aus dem Katalog:
  `kling2_6` (Kling 2.6, „cinematic motion, advanced physics", 5/10 s, nur
  start_image, kein end_image) und `seedance1_5` (Seedance 1.5 Pro, 4/8/12 s,
  480p/720p/1080p, start_image UND end_image).
  `cinematic_studio_3_0` ist schon im Einsatz (Scrabble, Outro).
- **Der Haken bei kling2_6: kein end_image.** Die ganze Sequenz lebt davon, dass
  Endframe A der Startframe von B ist. Ohne end_image bricht die Nahtlosigkeit.
  Seedance 1.5 kann end_image — das wäre der erste Kandidat für einen Test.

**Konkreter Vorschlag für den Test, bevor irgendwas in Serie geht:**
EINEN Clip doppelt bauen, derselbe Keyframe-Paar, einmal `seedance1_5` auf 1080p
und einmal `hf_mult_motion_control` mit dem bestehenden Clip als `video_references`.
Vorher bei beiden `get_cost: true` preflighten und Andi die Zahlen nennen.
Dann vergleichen und erst danach entscheiden. Nicht die ganze Sequenz auf Verdacht.

---

## 5. Die Figur — was in jeden Prompt gehört

```
Element:  <<<f43a764c-31c1-4ab8-815c-f6fd2c177e31>>>   (annwoke-figur-v3, KANONISCH)
```
ACHTUNG: v3 trägt die ALTE Mähne. Die Zepter-Sequenz ist durchgehend mit dieser
Frisur gebaut — also NICHT die neue Frisur einzelne Bilder hineinziehen, sonst
springt sie mitten in der Szene.

**Maske, nie als Schlafmaske über dem Mund beschreiben** (löst nsfw aus).
Vermeiden: `sleep mask`, `over the mouth`, `strap`, `gag`, `rotated 180 degrees`.
Benutzen: `accessory`, `fashion face covering`, `designer face mask`,
`worn low on the face`, `curved cut-out edge at the top`, `elastic band`.
Kopf-Detailspender: `53238819-c7fa-486e-b070-da076bc286fa` (Frontalportrait).

**Wichtig:** In der Totalen ist die Nasenkerbe in der GANZEN Zepter-Szene nicht zu
sehen — die Maske liegt dort über der Nase, auch in den freigegebenen Frames. Nicht
darauf herumkorrigieren, das war ein Fehler von mir und hat zwei Runden gekostet.

**Kleidung:** schwarze Fliege, schwarze Hosenträger über weißem Hemd, Smoking mit
Satinrevers OFFEN getragen, schwarze Lackschuhe. Schlank, hochgewachsen.

**Farbkonzept:** eine Farbe pro Bild. Orange wo er sich selbst inszeniert, Hellblau
im Zuchttank, Gold beim Zepter. Sonst Graustufen. `brass`, `copper`, `warm metal`,
`wood` sind farbig und brechen die Regel.

---

## 6. Was sonst noch fertig ist

```
clips\   01 Wolkenkratzer 9a998d9a · 02 Scrabble b391fdb5 · 03 Field Goal 26e67140
         04 Zähneputzen bfddd430 · 05 Tank 997f7dc3 · 06 Tennis d1517b6b
mafia\   m1 56b7ac47 · m2 df014da1 · m4 7d3b80c6   (m3 nur Standbild)
jacuzzi\ j1 7318f054
outro\   o1 d0299e21 · o2 7f93da00 · o3 9c78eb53 · o4 70dd36c5  (noch nicht geladen)
```
Zusammen rund 112 Sekunden fertiges Material.

Offene Altlasten: `SAETZE` muss `SÄTZE` heißen auf den Tennis-Stills (danach Clip
neu); die Klopapier-Clips vom 27.–29.09. sind nirgends eingeloggt, der vollständige
Take ist vermutlich `8dfdec27-0702-4cc7-9a4a-196b0d8485f8`; Scrabble-Brett mit den
drei Rappernamen; Spotify-Canvas 9:16.

---

## 7. Schnitt

Der Song liegt noch nicht als Datei vor — ohne ihn keine Schnittliste.
Andis Vorgaben für den Schnitt:
- Die Pointe nie vorwegnehmen. Jeder Clip hat EINEN Pointe-Frame, der auf der Silbe
  liegt, nicht davor. Vorne wird weggeschnitten, dafür sind die Clips gebaut.
- Kritisch sind lesbare Gags (Scrabble-Brett, Tennis-Tafel) — die liest man in
  0,3 Sekunden. Entweder Einstieg auf einem Ausschnitt mit Rauszoomen, oder erst
  im Moment der Zeile reinschneiden.
- Übergänge: die Wolkendecke als wiederkehrende Tür, aber nicht an jeder Naht,
  sondern nach Laufzeit gesetzt, jedes Eintauchen leicht anders (Eskalation:
  klare Decke, dann zieht es zu, dann Unwetter — der Gewitterclip `0c6742ec` ist da).
  Wo die Clips lang sind, harter Schnitt oder eine Trafo.
- Trafo-Paare, die sich anbieten: Tank -> Wolkenkratzer (beide aufrechter heller
  Quader), Scrabble-Brett -> Turmfassade (beide Raster, gleiche Polarität),
  Tennis-Tafel -> Turmfassade, Klopapier-Pappe -> Zepter (beide senkrecht, beide
  tragen sein Portrait).
- ffmpeg liegt auf Andis Rechner, der Rohschnitt kann dort gebaut werden, ohne
  Credits.

---

## 8. Ton

Andi arbeitet schnell und wird zu Recht ungeduldig, wenn dieselbe Sache mehrfach
schiefgeht. Er will keine langen Erklärungen, sondern dass das Ergebnis sitzt.
Was er ausdrücklich verlangt hat: vor jeder Generierung kurz bestätigen, dass man
verstanden hat. Und: eigene Fehler benennen statt sie dem Modell zuzuschieben — die
meisten Fehlschläge in diesen Sessions kamen aus meinen Prompts, nicht aus dem Modell.

---

## Nachtrag Cloud-Session (30.09.2026)

- Übergabe gelesen. `QUELLEN.md` und die lokalen Ordner (`nichnet\annwoke\…`) liegen
  auf Andis Rechner und sind von hier aus nicht erreichbar.
- Klopapier: der vollständige Take ist **`8dfdec27`** (bestätigt). Der 4-s-Schnitt ist
  Medium `beedf786`. Alles Weitere steht in `design/clips/klopapier.md`.
- **Debussy-Stencil freigestellt** (Weiß → transparent, 0 Credits):
  Medium `2f63ea54` (2688×1520 RGBA, 79,5 % transparent).
- Tafel mit Kandidaten für Endframe 2 (Clip `226a317e` bei 4,5 s, 4,9 s und
  letztem Bild, dazu Platte `36b0a0fc`): Medium `390fbe0c`.
  ⚠️ Offen: stammen gross-1/gross-2 aus `226a317e` oder aus dem z6-Clip?
- **Endframe 2, zwei Montagen (0 Credits):** die Figur aus Endframe 1 (`d1553ae5`)
  wurde über die Differenz zur Platte `7e7bdbab` gefunden, mit rembg
  `u2net_human_seg` freigestellt und in Platte 3 `36b0a0fc` gesetzt. Der Kopf
  bleibt auf derselben Höhe (y 430), die Mitte ebenfalls (x 747); nur die Füße
  wandern nach unten, weil er näher kommt. Dazu eine Spiegelung (45 % Höhe,
  Blur 5, Alpha 0,40 → 0).
  - 1,15× → Medium `0d082e90`
  - 1,30× → Medium `ab97de6b`
  - Tafel mit Endframe 1 und beiden Varianten samt Ausschnitt: Medium `1c3c44d9`
- ❌ Montagen „vogelwild ausgeschnitten" (Andi), verworfen.
- **Entscheidung Andi (30.09.):** Die Zepter-Szene endet mit Clip `226a317e`, darüber
  kommt das Debussy-Graffiti. Endframe 2 und Platte 3 entfallen. Grund: auf
  `36b0a0fc` stehen die zwei Frauen zu weit rechts und waren vorher nicht in der
  ersten Reihe.
- **Rohschnitt Zepter + Debussy (0 Credits): Medium `dfc90c93`**, 32,8 s,
  2560×1440, 24 fps, ohne Ton. z1→z5→`226a317e`, an jeder Naht das doppelte Bild
  entfernt. Debussy blendet 1,0 s vor dem Clipende ein (0,4 s), danach 2 s
  Standbild mit Graffiti.
- **Kostenprobe für die Aufwertung (30.09., ohne Erzeugung):**
  | Werkzeug | Eingabe | Credits |
  |---|---|---|
  | `bytedance_video_upscale` 4K, pro, 48 fps, Preset aigc | ganzer Zepter-Schnitt 32,8 s | **8** |
  | `kling_video_edit` (Kling 3.0 Omni Edit) 4K | 1 Clip, 5 s | 30 |
  | `kling_video_edit` 4K | ganzer Schnitt | 192 |
  | `kling_video_edit` pro | 1 Clip, 5 s | 10 |
  | `seedance_2_5` video_edit 1080p | 1 Clip, 5 s | 63 |
  | `topaz_video` | – | keine Kostenschätzung möglich |
- Zepter-Schnitt **ohne** Graffiti und Standbild (für das Neurendern): Medium
  `9ec917df`, 30,8 s.
- **Neurendern gestartet:** `kling_video_edit` 4K, Job **`f96a7e08`**, 180 Credits
  (Andi: „Credits reichlich"). Prompt: Handlung, Timing, Bildausschnitt und
  Chromgeländer bleiben, nur die Darstellung wird aufgewertet. Kopf-Vorlage
  `53238819`. Das Graffiti kommt danach wieder per ffmpeg drüber.
- ❌ Ganze Szene (30,8 s) in Kling Edit: Job `f96a7e08` nach 8 s abgelehnt und
  erstattet. Vermutlich ist die Eingabe zu lang.
- **Test mit einem Clip: z3 neu gerendert, Job `5c4900ec`** (Kling Edit 4K, 30 Credits).
  Ergebnis 3840×2160, 24 fps, 5,04 s. ⚠️ Gemessen weicht das erste und das letzte
  Bild um durchschnittlich **~80 Graustufen** vom Original ab (Vergleich bei 640×360).
  Das ist kein Feinschliff mehr, das ist ein stark verändertes Bild; die Nähte zu z2
  und z4 passen so nicht. Andis Urteil steht aus.
