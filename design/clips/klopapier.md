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

## Offen

- ❓ Urteil über den letzten Clip `223e864d` fehlt noch.
- ❓ Wo er in der App landet (Reaktion „letzter"/„daneben", Spott-Clip SP1?)
  ist nicht festgehalten. Format für die App steht in `public/reactions/README.md`
  (stumm, loopend, MP4, quadratisch empfohlen — dieser Clip ist 16:9).
