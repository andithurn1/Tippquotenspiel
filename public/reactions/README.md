# Reaktions-GIFs

Hier kommen die Abrechnungs-Clips rein. Format: kurzes, stummes, loopendes
**MP4** (kleiner & schärfer als GIF, genau das, was Higgsfield liefert).
Dateiname = `<key>.mp4`. Solange eine Datei fehlt, zeigt die App automatisch
einen Emoji-Platzhalter — es bricht also nichts, du kannst die Clips nach und
nach ergänzen/austauschen.

Ein `.mov` (iPhone-Aufnahme) vorher umwandeln, z.B.:
`ffmpeg -i clip.mov -vf "scale=-2:480" -an -movflags +faststart -pix_fmt yuv420p -c:v libx264 -crf 26 exakt.mp4`

Die Zuordnung (welcher key wann erscheint) lebt in `src/lib/reactions.js`.

## Tipp-Szenarien (nach eigenem Tipp)

| Datei              | Wann                                            | Platzhalter |
|--------------------|-------------------------------------------------|-------------|
| `exakt.mp4`        | Endstand exakt getroffen                        | 🎯 |
| `hauchduenn.mp4`   | Richtiger Sieger, nur 1 Tor daneben             | 😤 |
| `abstand.mp4`      | Richtiger Tor-Abstand (nicht exakt)             | 💪 |
| `tendenz-tore.mp4` | Nur Sieger richtig, aber Torschütze getroffen   | 🙌 |
| `tendenz.mp4`      | Nur Sieger richtig                              | 👍 |
| `tore-trostpreis.mp4` | Sieger verpasst, aber Torschütze getroffen   | 😅 |
| `daneben.mp4`      | Komplett daneben                                | 🤡 |

## Rollen im Spieltags-Ranking

| Datei             | Wann                     | Platzhalter |
|-------------------|--------------------------|-------------|
| `sieger.mp4`      | Platz 1 im Spieltag      | 👑 |
| `mittelfeld.mp4`  | Irgendwo dazwischen      | 😐 |
| `letzter.mp4`     | Letzter Platz            | 🪦 |

## Später: Spielverlauf-Drama

Szenarien wie „Führung in der Nachspielzeit verspielt" brauchen Torminuten
(Timeline), die das Ergebnis-Modell noch nicht liefert. Der Andockpunkt steht
schon in `reactions.js` (`MATCH_DRAMA`) — sobald die Timeline da ist, kommen
weitere keys wie `nachspielzeit-drama.mp4` dazu.

## Empfehlung

- Quadratisch (z.B. 480×480), damit sie im runden Rahmen sauber sitzen.
- Gleiche Charaktere + Designschema über alle GIFs, für einen einheitlichen Look.
