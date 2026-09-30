# Ann-woke — Schnittplan (Entwurf, 30.09.2026)

Song ~2:15. Grundlage ist der Liedtext von Andi. Die Zeiten fehlen noch: sobald die
Audiodatei da ist, werden die Wort-Zeitpunkte mit faster-whisper ausgelesen und hier
eingetragen.

## Grundsatz

Der Text erzählt die Szenen schon in Reihenfolge. Jede Szene sitzt auf der Zeile, die
ihre Pointe ausspricht, und der Pointe-Frame liegt auf der markierten Silbe.
Gekürzt wird vorne.

## Zuordnung

| Songteil | Zeile (Pointe fett) | Szene | Pointe-Frame |
|---|---|---|---|
| Intro | instrumental | Wolkendecke → **Tauchgang 1 (klar)** | Durchbruch zum Einsatz der Stimme |
| V1 | „…wie durch **Wolken bohrendes Wohnkonzept**" | 01 Wolkenkratzer `9a998d9a` | Turm durchstößt die Wolken |
| V1 | „…Anzeige-Bord-Ergebnis beim Cup von Davis, weil stets **Top Tennis**" | 06 Tennis `d1517b6b` | Tafel lesbar (vorher `SAETZE` → `SÄTZE` korrigieren!) |
| V1 | „Fans erleiden ein **Scherzinfarkt**" | ❓ offen (Reaktion/Menge?) | |
| V2 | „…in **Skrebbel floppen** / …auszuflippen **schtoppen**" | 02 Scrabble `b391fdb5` | Brett lesbar auf „floppen", Wegwischen auf „schtoppen" |
| V2 | „Mundfäule… Mundhygiene… **Putz euch die Zähne**" | 04 Zähneputzen `bfddd430` | auf „Zähne" |
| V3 | „…Reste weg zu **wischen**" | ❓ offen | |
| V3 | „tragende Rolle wie **Klohpa-Pier-Pappe**" | Klopapier `beedf786` (4 s) | Landung auf „Pappe" |
| V3 | „…dröhnt **Schlechtwetter**" | **Tauchgang 2 (Unwetter)**, Gewitter `0c6742ec` | Blitz auf „Schlecht-" |
| V3 | „Kick ich diese Triebtäter, **Diebtreter**" | 03 Field Goal `26e67140` | Kick auf „Dieb-" |
| V4 | „hochwohlgeborn mit **Nobelsten Chromosom**" | 05 Tank `997f7dc3` (Zuchttank, hellblau) | auf „Chromosom" |
| V4 → V5 | „Sohn von hohem **Thron**… **Untertan-assies stören mich**… Herrschaft" | Zepter-Szene v2 `afcfd589` | Treffer der Männer auf „stöhrn mich" |
| V5 | „dé **Pussy** nennt mich **Ellecks Clɔd**" | Zepter-Ende + **Debussy-Graffiti** | Graffiti genau auf „dé Pussy… Clɔd" |
| V6 | „Schüsse in die Rap-Szene mit meiner **Uzi**" | Mafia m1 `56b7ac47`, m2 `df014da1`, m4 `7d3b80c6` | Schüsse auf „Uzi" |
| V6 | „Humor mit Luk im **Jacuzzi**… paralympic-Athleten" | Jacuzzi j1 `7318f054` | auf „Jacuzzi" |
| V7 | „**autoschlüssel-zückend aus der Bar stolper**… übern Jungeltern-Paar **holper**" | Outro o1 `d0299e21`, o2 `7f93da00`, o3 `9c78eb53`, o4 `70dd36c5` (Auto springt über eine Bodenwelle) | Sprung auf „holper" |
| Outro | instrumental | Rest Outro → **Tauchgang 3 (Auflösung)**, Abspann | |

## Tauchgänge durch die Wolken — nur drei

1. **Intro → V1**, klar. Er führt direkt in den Wolkenkratzer („durch Wolken bohrend"),
   ist also inhaltlich begründet.
2. **V3 „Schlechtwetter"**, Unwetter. Das Wort liefert den Anlass mit.
3. **Outro**, Ausklang.

An allen anderen Nähten gibt es harte Schnitte auf den Takt oder Formenübergänge.
Die bisherigen Paare liegen in der Textfolge nicht mehr nebeneinander. Neu passt:
**Tank → Zepter** (V4 läuft von „Chromosom" direkt zu „Thron").

## Offen

- Audiodatei für die Zeitmarken
- ❓ „Scherzinfarkt" (V1) und „Reste weg zu wischen" (V3): gibt es dafür Clips?
- ❓ „auf Orɔnche… als Gott lɔnche" (Anfang V1): Wolkendecke oder eigenes Bild?
- Tennis-Stills: `SAETZE` → `SÄTZE`, danach den Clip neu

## Übergänge (Entwurf)

Zwei Sorten:
- **Generierte Sprünge**: minimax_h3 mit Startbild = letztes Bild von Szene A und
  Endbild = erstes Bild von Szene B. Kamera schnellt hoch über die Wolken und taucht
  woanders wieder ein; erzeugt mit 5 s, im Schnitt auf ~1 s beschleunigt.
  2 Credits/s → 10 Credits je Sprung. Die Nähte stimmen, weil Start und Ende feste
  Bilder sind.
- **Schnitt-Übergänge ohne Credits** (ffmpeg): Match-Cut, Wisch, Blitz, Farbfläche.

| Naht | Art | Idee |
|---|---|---|
| Intro → Wolkenkratzer | Tauchgang 1 | klare Decke, Durchbruch zum Turm |
| Wolkenkratzer → Tennis | **Sprung** | vom Turm hoch über die Wolken, Sturz aufs Stadion |
| Tennis → Scrabble (V1→V2) | Match-Cut | Anzeigetafel-Raster → Scrabble-Raster |
| Scrabble → Zähneputzen | Wisch | die wischende Hand ist die Blende |
| Zähneputzen → Klopapier (V2→V3) | Match-Cut | beide im Bad |
| Klopapier → Gewitter | Tauchgang 2 / **Sprung** | durch die Decke hoch ins Unwetter, „Schlechtwetter" |
| Gewitter → Field Goal | Blitz | weißer Blitz-Frame |
| Field Goal → Tank (V3→V4) | **Sprung** | der Ball fliegt in den Himmel, über die Wolken, Sturz ins Labor |
| Tank → Zepter | Formenübergang | „Chromosom" → „Thron" |
| Zepter/Debussy → Mafia (V5→V6) | Wisch | Graffiti-Farbe füllt das Bild |
| Mafia → Jacuzzi | Blitz | Mündungsfeuer → Dampf |
| Jacuzzi → Outro/Bar (V6→V7) | **Sprung** | hoch über die Wolken, Sturz in die nächtliche Stadt |
| Outro → Ende | Tauchgang 3 | Ausklang |

Generierte Sprünge: 4 × 10 = **40 Credits**. Vorschlag: zuerst den Test
Wolkenkratzer → Tennis.

### Regel für die Sprünge (Andi, 30.09.)

*„nicht immer wieder an die gleiche Position nach unten stürzen, der Film soll sich überall
in der Stadt verteilen"*. Jeder Sprung fliegt deshalb über das Wolkenmeer in einen
**anderen Stadtteil** und stürzt erst dort hinunter. Die Landepunkte ergeben sich aus den
Szenen: Stadion (Tennis), Bad, Straße (Field Goal), Labor (Tank), Bühne, Stadt bei Nacht.

**Test 1: Wolkenkratzer → Tennis, Job `6da5179f`** (minimax_h3, 5 s, 10 Credits).
Startbild `cbe5ec96` (Ende von `9a998d9a`), Endbild `c187c1aa` (Anfang von `d1517b6b`).

⚠️ Beim Durchsehen der Historie gefunden: es gibt schon eine Wolken-Kette am Turm,
`9a998d9a` Aufstieg → `0c6742ec` Gewitter (Start `cbe5ec96`, endet weiß) →
`0e1b234d` Sturz vom Turm auf die Straße (Kabel-Knoten, Kick). Die passt genau zu V3
(„Schlechtwetter… Kopfhörer ent-heddern… Kick ich"). Der Turm kommt also zweimal vor.

**Test 1 abgenommen** (Andi: *„ok gut"*), mit der Anmerkung *„musst nicht so weit wegzoomen"*.
Die weiteren Sprünge bleiben deshalb niedrig über den Dächern, statt über die Wolken zu gehen.

**Sprung 2: Jacuzzi → Outro, Job `d9b47035`** (minimax_h3, 5 s, 10 Credits).
Start `b024f70f` (Ende von `7318f054`), Ende `5e95cb05` (Anfang von `d0299e21`).
Flug knapp über die Dächer bei Nacht, dann in eine Straße zum geparkten Auto.

⚠️ Der Field-Goal-Clip `26e67140` steht nicht in der Video-Historie. Es fehlen die
volle ID oder die Keyframes; der Sprung Field Goal → Tank wartet deshalb.
Übersicht der Outro- und Mafia-Keyframes: o1 `d0299e21` (5e95cb05→00897071),
o2 `7f93da00` (00897071→e4e9cf57), o3 `9c78eb53` (e4e9cf57→4bb9d9a7),
o4 `70dd36c5` (4bb9d9a7→e4e9cf57); m1 `56b7ac47` (facdea02→7ccd12e4),
m2 `df014da1` (7ccd12e4→d0438c72), m4 `7d3b80c6` (6c736cb0→444a8047).
