# Fanfarben-Theming — Design-Spec (geplant, noch nicht gebaut)

Ziel: Jeder Nutzer wählt **2–3 Fanfarben**, um seinen Verein zu repräsentieren.
Die App bleibt im Layout überall identisch — nur die **Akzente** tragen die
gewählten Farben, systematisch und konsistent.

## Prinzip: Farben → feste Rollen (nicht pro Element)

Fanfarben werden NICHT einzelnen Buttons zugewiesen, sondern **semantischen
Rollen**. Jedes Modul nutzt immer dieselbe Rolle → überall dieselbe Farbe.

| Slot | Rolle | Beispiele |
|------|-------|-----------|
| **Farbe 1** | Primär-Akzent | Buttons/CTAs, aktive Zustände, große Punkte-Zahlen |
| **Farbe 2** | Sekundär-Akzent | Ränder, Chips, Fortschritt, sekundäre Highlights |
| **Farbe 3** | Signal | Badges, „Zocker des Spieltags", seltene Glanzmomente |

Wählt der Nutzer nur 2 Farben, fällt Slot 3 auf Slot 1 (oder eine neutrale
Ableitung) zurück.

## Fixes Gerüst

Hintergrund (Ink `#0B0E1F`), Flächen und Text-Grautöne bleiben **systemweit
gleich**. Nur die Akzent-Rollen sind einfärbbar. So bleibt alles lesbar,
markenneutral und trotzdem persönlich gefärbt.

## Kontrast automatisch

Für jede gewählte Farbe wird die lesbare Textfarbe (hell/dunkel) automatisch
berechnet (Luminanz-Schwelle) → auch grelle/helle Vereinsfarben bleiben lesbar.
`on-f1`, `on-f2`, `on-f3` als abgeleitete Tokens.

## Technische Umsetzung

- **Zentrales Theme-Modul** + `ThemeProvider`, das CSS-Variablen auf `:root`
  setzt: `--f1 --f2 --f3 --on-f1 --on-f2 --on-f3` (+ Neutrale `--ink --surface …`).
- **Alle Screens referenzieren Tokens** statt roher Hex-Werte. Das ist der
  Umbau, der die heute in ~15 Komponenten duplizierten `C`-Objekte in EIN
  Modul zieht (cross-cutting → als Ganzes, nicht halb, umsetzen).
- Persistenz analog zu `prefs`/localStorage; später am Nutzerprofil (Supabase).

## Vereins-Presets

Schnellauswahl-Paletten (NUR Farben, KEINE Wappen/Logos → rechtlich sauber) zum
„Verein repräsentieren", frei nachjustierbar.

## Aufwand / Reihenfolge

Großer, cross-cutting Umbau. Sinnvoll als **ein** zusammenhängender Schritt:
1. Theme-Modul + Tokens + Kontrast-Ableitung (mit Tests).
2. `ThemeProvider` in `layout.js`.
3. Screens Datei für Datei auf Tokens umstellen.
4. Farb-Picker (2–3 Slots) + Club-Presets in den Einstellungen.
