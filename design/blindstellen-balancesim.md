# Blindstellen-Durchgang: was `balanceSim.js` von den neuen Ebenen sieht

**Befund.** Account 2 (Andre), 2026-07-31. Untersuchung, keine Umsetzung.

Vorgehen wie bei Andis Punkten 1 und 2: **erst prüfen, ob der Simulator eine
Ebene SIEHT, dann messen.** Ergebnis: er sieht keine der sechs — und bei dreien
ist das kein Verkabelungsproblem.

---

## 1. Der Kern des Befunds

Es gibt **zwei verschiedene Arten** von Blindstelle, und sie brauchen völlig
verschiedene Arbeit:

| Art | Ebenen | Was fehlt |
|---|---|---|
| **A · Verkabelung** | `saisonform` | Der Aufruf fehlt. Reine Mechanik. |
| **B · Verhaltensmodell** | `duell`, `budget`, `limitKlassen`, `jokerBasis` | Der Simulator kennt keine Entscheidung, an der diese Regeln greifen könnten. |

🔴 **B ist der eigentliche Befund.** Man kann diese vier nicht „einhängen" —
es gibt nichts, woran sie hängen könnten.

### Warum

Zwei Stellen zeigen es:

**(1) Der Joker wird bedingungslos gesetzt** (`balanceSim.js:424`):
```js
const mitJoker = !rankingPool && idx === jokerIdx[pi];
```
Ein fester Index je Profil, zu Spieltagsbeginn ausgelost. Es wird **nie
gefragt**, ob der Spieler ihn sich leisten kann (`budget`), ob er ihn haben darf
(`jokerBasis.wer`), ob das Spiel die Bedingung erfüllt (`jokerBasis.bedingung`)
oder ob ein Kontingent erschöpft ist (`limitKlassen`). Diese vier Module sind
**Prüffunktionen** — sie können nur wirken, wo etwas gefragt wird. Hier fragt
niemand.

**(2) Die Profile interagieren nicht.** Die einzige spielerübergreifende
Struktur ist `gruppenTipps` (Zeile 407) — und die dient dem Tipp-Einfluss auf
die Quote, nicht dem Zielen auf eine Person. Ein „Spieler A greift Spieler B an"
existiert im Simulator **überhaupt nicht**. Der Duell-Joker hat damit nichts,
worauf er wirken könnte.

---

## 2. ⚠️ Die Falle, die daraus folgt

Um `duell` zu messen, muss jemand festlegen: **wen greift ein Kenner an, und
wann?** Diese Entscheidung ist kein Detail — sie bestimmt das Ergebnis
weitgehend selbst:

- Greifen alle den Führenden an, senkt der Duell-Joker die Siegquote des
  Stärksten. Man misst dann, dass Rudelbildung wirkt — was man vorher
  hineingeschrieben hat.
- Greift jeder zufällig an, verschwindet der Effekt im Rauschen. Man misst,
  dass die Ebene harmlos ist — auch das eine Folge der Annahme.

**Das ist exakt die Fehlerklasse, die `CLAUDE.md` bei `RHO` festhält:** eine
Annahme, die wie eine Messung aussieht. Zweimal in diesem Projekt passiert.

**Konsequenz für die Umsetzung:** Das Verhaltensmodell gehört **nicht** in
`balanceSim.js` versteckt, sondern als benannte, austauschbare Strategie neben
die Archetypen — so wie `strategien()` schon heute die Tippwahl trägt. Und die
Messung muss über **mehrere** Zielstrategien laufen (mindestens
`nurFuehrenden` · `zufaellig` · `nurVorne`), damit die Bandbreite sichtbar wird
statt einer einzigen Zahl, die nach Wahrheit aussieht.

Wenn eine Ebene nur unter EINER Zielstrategie kippt, ist das das Ergebnis —
nicht ein Mittelwert darüber.

---

## 3. Die Einzelbefunde

### 3.1 `saisonform` — vier Gründe (unverändert seit dem 31.07. früh)

1. `applySaisonform` wird nie aufgerufen (`:25` importiert nur `applyCatchup`,
   `:471` ruft nur den auf).
2. Ohne aktives Aufholen existiert gar kein Verlauf (`:319`
   `const verlauf = aufholenAktiv ? [] : null`).
3. Die Verlaufs-Zeilen tragen kein `gewertet` (`:457`). `applySaisonform` liest
   daran ab, ob getippt wurde — fehlt es, gilt JEDER Spieltag als nicht getippt,
   und mit `nurGetippte: true` (Vorgabe) greifen Streichresultate **nie**.
4. Der Saisonsieger kommt aus rohen Punkten (`:462`), nicht aus der gewichteten
   Summe. Dieselbe Referenz speist `aufholFlipQuote` — die Kennzahl schriebe dem
   Aufhol-Bonus zu, was die Gewichtung getan hat.

**Aufwand: klein.** Verkabelung plus `gewertet` im Board plus Sieger-Referenz.

### 3.2 `jokerBasis` — der billigste Einstieg von den vieren

Braucht **keine** neue Interaktion, nur eine Frage an der richtigen Stelle:
`mitJoker` wird zusätzlich an `darfEinsetzen` und `erfuelltBedingung` geknüpft.
`bedingung.minQuote` lässt sich sofort prüfen, weil die Außenseiter-Quote je
Spiel im Simulator ohnehin vorliegt (`sp.def`).

**Messbare Aussage:** Wie stark sinkt der Modifikator-Anteil, wenn Joker nur auf
Spiele über Quote X gelten? Das ist eine echte Zahl fürs Empfehlungsband.

**Aufwand: klein bis mittel.** Kein Verhaltensmodell nötig — `wer: "abPlatz"`
und `abRueckstand` brauchen allerdings den Zwischenstand, also den Verlauf
(siehe 3.1 Punkt 2).

### 3.3 `budget` + `limitKlassen` — mittel

Beide brauchen eine **Buchführung je Profil und Spieltag**: Kontostand,
bisherige Einsätze je Art und Periode. Das ist Mechanik, kein Modell — aber es
verändert die Schleife spürbar, weil der Joker nicht mehr sicher gesetzt wird.

⚠️ **Erwartbarer Nebeneffekt, vorher benennen:** sobald Joker Geld kosten,
sinkt der Modifikator-Anteil in allen Presets. Das ist kein Balance-Bruch,
sondern die Ebene, die endlich wirkt — aber es verschiebt die Ampel, und die
Presets sind gegen den heutigen Anteil vermessen. **`presets.balance.test.js`
wird anschlagen.** Das ist der eingebaute Wecker, kein Fehler.

### 3.4 `duell` — groß, und zuletzt

Braucht alles aus 3.2 und 3.3 plus das Verhaltensmodell aus Abschnitt 2.

### 3.5 `jokerBibliothek` / `achsenProfil` — braucht keine Simulation

Reine Anzeige. **Aber:** `achsenKonflikte` behauptet etwas Überprüfbares —
*dieselbe* Achse verstärkt sich, verschiedene Achsen nicht. Sobald 3.1 bis 3.4
stehen, ist das eine messbare Hypothese:

> Zwei Regler auf derselben Achse senken die Kenner-Siegquote stärker als
> dieselben zwei Regler auf verschiedenen Achsen.

Fällt das durch, ist das Achsenmodell widerlegt — und genau dafür wurde es so
gebaut (`design/joker-inventar.md` 3, „geschätzt, nicht gemessen").

---

## 4. Empfohlene Reihenfolge

1. **`saisonform`** — kleinster Aufwand, und Punkt 2 (Verlauf immer bauen) ist
   Voraussetzung für alles Weitere.
2. **`jokerBasis`** — erste echte neue Messung, ohne Verhaltensmodell.
3. **`budget` + `limitKlassen`** — Buchführung. Mit der Erwartung, dass
   `presets.balance.test.js` anschlägt.
4. **`duell`** — mit mehreren Zielstrategien, nicht einer.
5. **Achsenmodell prüfen** — die Hypothese aus 3.5.

⚠️ **Nach jedem Schritt eine Blindstellen-Gegenprobe**, nach dem Muster der
bestehenden Tests „Big Game wird überhaupt gemessen" in
`presets.balance.test.js`: ein Regelwerk, das die Ebene auf Anschlag dreht, MUSS
ein messbar anderes Ergebnis liefern als eines ohne. Sonst ist die Ebene
weiterhin blind, nur unsichtbarer als vorher.
