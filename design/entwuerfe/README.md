# Entwürfe — hier legt Andi seine Word-Dateien ab

**Angelegt 20.08.2026.** Andi baut den Aufbau der Screens in Word: *„brauche ja
egtl nur Blöcke und Text."*

## Speichern

In Word: **Datei → Speichern unter** → dieser Ordner. Als **`.docx`**.

🔴 **Kein PDF.** Auf diesem Rechner fehlt der PDF-Renderer, und ein
exportiertes PDF ist innen oft nur ein Haufen Bitmaps ohne Textebene — daran
ist hier schon zweimal Zeit verbrannt worden (siehe `CLAUDE.md`,
Werkzeug-Fallen). Aus einer `.docx` lese ich den Text direkt:

```bash
node scripts/lies-docx.mjs design/entwuerfe/<datei>.docx
```

## Blöcke als TABELLE, nicht als gezeichnete Kästen

⚠️ **Gezeichnete Rechtecke und Textfelder kommen bei mir NICHT an.** Word legt
sie als Grafik ab, nicht als Text — ich sehe dann eine leere Stelle und weiß
nicht einmal, dass dort etwas stand.

Eine **Tabelle** kommt vollständig durch: eine Zeile je Block, in der
Reihenfolge, in der sie auf dem Bildschirm stehen. Das genügt für alles, was
„Blöcke und Text" heißt:

| Block | Größe | Hinweis |
|---|---|---|
| Wettbewerbe wählen | groß | aufklappbar, Zähler rechts |
| Zusätze | klein | erst aus |
| Prüfen & anlegen | groß | unten festgeklebt |

Überschriften (Formatvorlage „Überschrift 1") und nummerierte Listen kommen
ebenfalls durch — beides gern benutzen, das ist die Gliederung, die ich lese.

## Benennen

```
<screen>-<was>.docx
```

`erstellen-aufbau.docx`, `tippen-soll.docx`, `menu-neu.docx`. Der Screen-Teil
ist der Pfad in der App ohne Schrägstrich.

⚠️ **Ein Satz in den Chat gehört trotzdem dazu** — ein Entwurf zeigt WAS,
selten WARUM.
