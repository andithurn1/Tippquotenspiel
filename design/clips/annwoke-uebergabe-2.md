# Ann-woke — Übergabe 2 (Cloud-Session → nächster Chat), 30.09.2026 abends

Die erste Übergabe steht in `annwoke-uebergabe-cloud.md`, samt Nachträgen dieser Session.
Der Schnittplan steht in `annwoke-schnittplan.md`, der Klopapier-Clip in `klopapier.md`.
Alle IDs gehören zu Andis Higgsfield-Konto.

## Arbeitsregeln (gelten weiter)

- Nichts erzeugen ohne Andis Ja. Vorher sagen: was, welches Modell, wie viele Credits.
- Vor jeder Generierung kurz bestätigen, dass man verstanden hat.
- Zeigen: Generierungen über `show_generation_by_ids`, höchstens 11, in Erzählreihenfolge.
  Montagen und Schnitte als Media-Link (Widget zeigt nur Generierungen).
- Minimax-Prompts: nicht „mask over the mouth" (nsfw), sondern „designer face mask worn
  low on the face".
- Higgsfield-Preset-Hinweis („IN THE DARK", „CARDBOARD CUTOUT") → mit
  `declined_preset_id` wörtlich erneut schicken.
- Sandbox-`sleep` nicht als Warteschleife nutzen, es gab ein Limit (1100 Sandboxes). Zum
  Warten `jobs_wait` mit 15 s nehmen.

## Stand Zepter-Szene

- Ende = Clip `226a317e` + Debussy-Graffiti; Endframe 2 und Platte 3 entfallen.
- **Schnitt v2 (gilt): Medium `afcfd589`**, 28,4 s: z3 2,5-mal so schnell, z4 ab 2,5 s doppelt so
  schnell, Graffiti blendet 1 s vor Ende ein, danach 2 s Standbild.
- Ohne Graffiti: `9ec917df` (altes Tempo).
- Debussy freigestellt: Medium `2f63ea54`.
- Neuauflegen gestoppt: Kling Edit veränderte zu stark, Cinema Studio 3.0 ließ die Menge
  starr. Test-Jobs `5c4900ec`, `b58e3a58`, `d4e5a70d` werden nicht verwendet.

## Klopapier

Take `8dfdec27`, 4-s-Schnitt Medium `beedf786`.

## Schnittplan

Siehe `annwoke-schnittplan.md`. Die Reihenfolge ergibt sich aus dem Liedtext:
Wolkenkratzer → Tennis → Scrabble → Zähneputzen → Klopapier → Gewitter/Kabel/Kick →
Tank → Zepter + Debussy („dé Pussy… Clɔd") → Mafia (Uzi) → Jacuzzi → Outro.

## Sprünge zwischen Szenen (minimax_h3, 5 s, je 10 Credits)

Regel von Andi: jeder Sprung landet in einem anderen Teil der Stadt, und die Kamera
zoomt nicht zu weit weg (niedrig über die Dächer). Im Schnitt eine Tempo-Rampe:
Start und Landung normal, die Flugmitte etwa dreimal so schnell.

| Sprung | Job | Stand |
|---|---|---|
| Wolkenkratzer → Tennis | `6da5179f` | ✅ „ok gut" |
| Boxhandschuh (Mafia m4) → Jacuzzi | `d1a46dad` | ✅ „sehr gelungen" |
| Jacuzzi → Outro (Auto) | `4b939726` | ✅ „exzellent", **nach Bild 99 (4,12 s) schneiden**, danach zittert es |
| verworfen | `d9b47035`, `87923753` | Perspektive falsch |
| Field Goal → Tank | – | **wartet**: Field-Goal-Clip `26e67140` steht nicht in der Historie, Andi muss Clip oder Endbild liefern |

Beim Durchsehen gefunden: Wolken-Kette am Turm `9a998d9a` → Gewitter `0c6742ec` → Sturz
auf die Straße `0e1b234d`. Passt zu V3 („Schlechtwetter… Kabel… Kick").

## Lief beim Abbruch

- Vorschau der Kette V6→V7 (m4 → Sprung → Jacuzzi → Sprung, geschnitten → Outro o1).
  Sie wurde im Hintergrund gebaut und nach Medium `cebf0703` hochgeladen, aber **nicht
  bestätigt**. Gegebenenfalls `media_confirm` (Typ video) aufrufen oder neu bauen.

## Offen

1. **Audiodatei des Songs** (2:15) → mit faster-whisper die Wort-Zeitpunkte auslesen → Rohschnitt.
2. Field-Goal-Clip bzw. sein Endbild.
3. ❓ Clips für „Scherzinfarkt" (V1) und „Reste weg zu wischen" (V3), Anfang V1 („Orɔnche").
4. Tennis-Stills: `SAETZE` → `SÄTZE`.
