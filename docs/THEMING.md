# Fanfarben-Theming — Stand & Funktionsweise

Ziel: Jeder Nutzer wählt **2–3 Fanfarben**, um seinen Verein zu repräsentieren.
Die App bleibt im Layout überall identisch — nur die **Akzente** tragen die
gewählten Farben, systematisch und konsistent.

> **Status:** ✅ **gebaut & live.** Grundlage `src/lib/theme.js` (zentrale
> Farbquelle), Umschaltung über `ThemeProvider` + Screen `/farben`
> (`Fanfarben.jsx`), abgesichert durch `src/lib/theme.test.js`.
> Der Abschnitt „Offen / später" unten listet, was noch aussteht.

## Prinzip: Farben → feste Rollen (nicht pro Element)

Fanfarben werden NICHT einzelnen Buttons zugewiesen, sondern **semantischen
Rollen**. Jedes Modul nutzt immer dieselbe Rolle → überall dieselbe Farbe.

| Slot | Rolle | Token (in `theme.js`) | Beispiele |
|------|-------|-----------------------|-----------|
| **Farbe 1** | Primär-Akzent | `gold` | Buttons/CTAs, aktive Zustände, große Punkte-Zahlen |
| **Farbe 2** | Sekundär-Akzent | `indigo` | Admin-Akzente, Ränder, Chips |
| **Farbe 3** | Signal | `violet` | Badges, „Zocker des Spieltags", seltene Glanzmomente |

Wählt der Nutzer nur 2 Farben, fällt Slot 3 auf Slot 1 zurück; bei nur 1 Farbe
tragen alle Rollen dieselbe Farbe (`deriveRoles` in `theme.js`).

## Fixes Gerüst — und was NIE eingefärbt wird

Hintergrund (Ink `#0B0E1F`), Flächen und Text-Grautöne bleiben **systemweit
gleich**. Zusätzlich bleiben die **Wertungsfarben** unangetastet:
`mint` (Erfolg) und `coral` (Warnung) tragen feste Bedeutung und dürfen nicht
zur Vereinsfarbe werden. Ebenso bleiben die Plot-Reihen (`SERIES`) fix, weil
sie beim Modul-Laden als feste Werte kopiert werden. Nur die drei Akzent-Rollen
oben sind einfärbbar.

## Kontrast / Lesbarkeit automatisch

`relativeLuminance` + `contrastRatio` (WCAG 2.1) sichern Lesbarkeit:
- **Primär (`gold`)** wird als Button-Fläche mit dunklem Text genutzt →
  Mindestkontrast 3.2 gegen den dunklen Grund; zu dunkle Vereinsfarben werden
  schrittweise aufgehellt, bis der Text lesbar ist.
- **Sekundär/Signal (`indigo`/`violet`)** erscheinen als Punkte/Labels auf
  dunklem Grund → Mindestkontrast 2.4, ebenfalls per Aufhellung gesichert.
- `readableInk(hex)` liefert die passende Textfarbe (hell/dunkel) auf einer
  Akzentfläche. `/farben` markiert eine aufgehellte Farbe sichtbar als
  „aufgehellt", damit der Nutzer weiß, warum die Anzeige leicht abweicht.

## Technische Umsetzung (wie es OHNE Screen-Umbau funktioniert)

Der große Vorteil des zentralen `theme.js`: die Screens lesen die Farben als
Werte aus **einem** gemeinsamen `COLORS`/`C`-Objekt.

1. `applyFanColors(farben)` überschreibt **nur die Akzent-Rollen** auf diesem
   gemeinsamen Objekt (in place) — `resetTheme()` stellt die Grundwerte wieder her.
2. `ThemeProvider` (in `layout.js` **innerhalb** der übrigen Provider) hält die
   Auswahl in `localStorage` (`tqs.theme.v1`), wendet sie **nach der Hydration**
   an (SSR + erster Client-Render bleiben auf Grundwerten → keine
   Hydration-Diskrepanz) und **remountet die Kind-Ebene per wechselndem `key`**.
   Dadurch lesen alle Screens die neuen Werte, ohne dass eine Screen-Datei
   angefasst werden muss. Weil der Provider innerhalb von Auth/Round/Prefs sitzt,
   bleibt beim Umschalten die Sitzung/Runde erhalten.

## Persistenz

- **Pro Gerät:** immer über `localStorage` (`tqs.theme.v1`) — funktioniert auch
  ohne Login (Demo/Mock).
- **Am Nutzerprofil (Supabase):** eingeloggt werden die Farben zusätzlich am
  Profil gespeichert (`profiles.fan_colors`) und beim Login geladen → gleiche
  Farben auf jedem Gerät. localStorage bleibt der schnelle lokale Cache.

## Vereins-Presets

`CLUB_PRESETS` in `theme.js`: Schnellauswahl-Paletten (**NUR Farben, KEINE
Wappen/Logos → rechtlich sauber**), generisch benannt (Gelb-Schwarz, Rot-Weiß …),
frei nachjustierbar über den Farbwähler.

## Offen / später

- [ ] **Optional: helles Design** — dieselbe Token-Mechanik könnte auch Gerüst-
  Farben umschalten (derzeit bewusst nur Akzente).
- [ ] **Mehr Presets** je nach Wunsch.
