# Tailwind — geht das, und was kostet es? (O1)

**Andis Ansage:** *„ich denke wir sollten dennoch zum professionellen tool
rüberwechseln."* Im Auftragsbuch stand dazu bisher nur „Recherche fehlt".

Diese Datei ist die Recherche. **Zwei Fragen, beide beantwortet:** geht es
technisch, und was kostet der Umstieg an diesem Bestand.

⚠️ **Versionsangaben bitte vor dem Installieren gegenprüfen.** Mein Wissensstand
endet im Mai 2026; was hier über Tailwind 4 steht, war bis dahin richtig, aber
eine Nebenversion später kann eine Zahl anders lauten.

---

## 1 · Der Bestand, gemessen (29.08.2026)

| | |
|---|---|
| Quelldateien (`js`/`jsx`, ohne Tests) | **284** · 77 628 Zeilen |
| `style={{ … }}` | **2 513 Vorkommen in 93 Dateien** |
| `globals.css` | 470 Zeilen, **15 Klassen** |
| `cssVariablen.js` | 62 Zeilen — spiegelt `theme.js` ins Dokument |
| `className=` in `Spielerstellung.jsx` | **0** |

🔴 **Die letzte Zeile ist die aussagekräftigste.** Der größte Screen des
Projekts benutzt die Stilebene, die es seit dem 09.08.2026 gibt, **gar nicht**.
Die zweischichtige Lösung aus CLAUDE.md ist also nicht halb umgesetzt — sie ist
an einer Handvoll Stellen umgesetzt und sonst nirgends.

---

## 2 · Geht es? Ja — und Andis Sorge ist die kleinere

**Seine Frage im Auftragsbuch:** *„ob die Fanfarben zur Laufzeit dynamisch
bleiben."*

✅ **Sie bleiben es, und mit Tailwind 4 sogar leichter als heute.** Der Grund
liegt in der Bauart: Tailwind 4 legt seine Theme-Werte **als CSS-Variablen** an.
Eine Klasse wie `bg-akzent` wird zu `background-color: var(--color-akzent)`.
Wer die Variable zur Laufzeit umsetzt, ändert alles, was sie benutzt — genau
das, was `applyFanColors` + `schreibeCssVariablen()` heute schon tun.

🔴 **Die Brücke ist also schon gebaut.** `cssVariablen.js` schreibt heute
`--tqs-akzent` & Co. ins Dokument, damit Inline-Styles und Stylesheet dieselbe
Farbe zeigen. Genau diese Naht ist die, an der Tailwind ansetzt. Der Umstieg
würde die Datei nicht wegwerfen, sondern zu ihrem eigentlichen Zweck bringen.

⚠️ In Tailwind **3** war das umständlicher (Farben mussten als Kanäle abgelegt
werden, damit Transparenz noch funktionierte). Wer alte Anleitungen liest,
findet dort die Klimmzüge — die sind mit 4 weg.

---

## 3 · Was es wirklich kostet

**Nicht die Einrichtung — die ist ein Nachmittag.** Der Preis sind die **2 513
Inline-Styles in 93 Dateien.** Das ist der Umbau, und er ist größer als jeder
bisher in diesem Projekt.

⚠️ **Und er hätte einen schlechten Zeitpunkt.** Der Aufbau der Einstellungen
gehört laut CLAUDE.md Andi (G6), die Masterdatei entscheidet die Platzierung.
Wer 2 513 Stellen umschreibt, bevor feststeht, wo die Regler sitzen, räumt
zweimal — dieselbe Falle wie am 21.08.2026 beim Tabellen-Bonus.

### Zwei Haken, die man vorher wissen sollte

- 📱 **Browser-Untergrenze.** Tailwind 4 setzt moderne CSS-Funktionen voraus
  (`@property`, `color-mix()`) und damit neuere Browser als 3. Für die Web-App
  egal, für die **Android-App über Capacitor** nicht: dort rendert die System-
  WebView, und wie alt die auf einem Zielgerät sein darf, hat noch niemand
  festgelegt. **Das ist die eine Zahl, die vor der Entscheidung fehlt.**
- ⚠️ **Zwei Stilsysteme nebeneinander sind erlaubt, aber nur auf Zeit.**
  Inline-Styles gewinnen gegen Klassen (Spezifität) — solange beides existiert,
  muss man wissen, welche Stelle welchem System gehört. Ein Zustand, den man
  Monate stehen lässt, wird zur dritten Wahrheit.

---

## 4 · Was Tailwind LÖST, das heute wirklich weh tut

Nicht „schöner schreiben" — das wäre kein Grund. Sondern das, was CLAUDE.md als
Lehre festhält: **Inline-Styles können kein `:hover`, kein `:active`, kein
`:focus-visible`, keine `@keyframes`, kein `prefers-reduced-motion`, kein
`::before`.** Deshalb gibt es `globals.css` überhaupt.

Heute liegen dafür **15 Klassen** in 470 Zeilen bereit, und der größte Screen
benutzt **keine davon**. Mit Tailwind wäre ein Hover-Zustand kein
Architekturthema mehr, sondern ein Wort.

---

## 5 · Empfehlung

**Ja zum Wechsel, nein zum Stichtag.**

1. **Jetzt:** Tailwind 4 danebenstellen (`@tailwindcss/postcss`), die Farben aus
   `theme.js` als `@theme`-Variablen anlegen — sie sind ohnehin schon Variablen.
   Kostet fast nichts und ändert an keiner bestehenden Zeile etwas.
2. **Ab dann:** **jede NEUE Komponente** in Tailwind. `Walkthrough.jsx` wäre der
   erste Kandidat gewesen.
3. **Umgestellt wird, was ohnehin angefasst wird** — nie eine Datei nur zum
   Umstellen öffnen.
4. **Der große Rest erst nach G6/Masterdatei.** Dann steht die Platzierung, und
   man räumt einmal statt zweimal.

⚠️ **Vor Schritt 1 fehlt genau eine Angabe, und die kann ich nicht messen:** ab
welcher Android-Version die App laufen soll. Steht die, ist die Browser-Frage
beantwortet und der Rest ist Handwerk.

⛔ **Was ich NICHT empfehle:** den Bestand in einem Rutsch umzuschreiben. 2 513
Stellen ohne laufende Oberflächen-Entscheidung sind kein Fortschritt, sondern
ein zweites Mal dieselbe Arbeit.
