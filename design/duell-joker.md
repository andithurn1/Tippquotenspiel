# Duell-Joker — Klau-Joker & Block-Joker

**Spec + Umsetzungsplan.** Verfasst von Account 2 (Andre) am 2026-07-31 auf
ausdrückliche Anweisung des Nutzers.

> **Vorgeschichte, damit sie nicht verlorengeht:** Andre hatte von der
> Block-Variante abgeraten — sie bricht dem Anschein nach die Regel, dass ein
> abgegebener Tipp seinen Wert behält, und lädt zum Rudelbilden gegen den
> Führenden ein. **Der Nutzer hat sich am 31.07. für beide Varianten
> entschieden.** Gebaut wird deshalb beides. Der Einwand ist damit nicht vom
> Tisch, sondern in den Entwurf eingearbeitet: siehe „Wie der Einwand aufgelöst
> wird" und die Empfehlungsbänder.

---

## 1. Was das ist

Der dritte Joker-Topf. Die bisherigen zwei zielen auf ein SPIEL (`rules.joker`)
oder auf eine Aufgabe (`rules.ereignisse`). Dieser zielt auf eine **PERSON**.

| Typ | Kürzel | Was er tut |
|-----|--------|------------|
| **Klau-Joker** | `klau` | Du verdienst an der Ausbeute eines Mitspielers mit. |
| **Block-Joker** | `block` | Du dämpfst die Wertung eines Mitspielers für ein Spiel. |

Beide sind dieselbe Mechanik mit umgekehrtem Vorzeichen — deshalb EIN Modul,
EIN Regelblock, ein gemeinsames Kontingent. Zwei getrennte Module würden
zwangsläufig auseinanderlaufen (dieselbe Lehre wie bei `saisonBoard.js`).

## 2. Wie der Einwand aufgelöst wird

Drei Entwurfsentscheidungen, die den Fairness-Bruch entschärfen, ohne die
Mechanik zu entkernen. **Diese drei nicht brechen.**

1. **`scoreTip` bleibt unberührt.** Der Duell-Joker greift NICHT in die Wertung
   eines Tipps, sondern auf die FERTIGEN Spieltagspunkte — dieselbe Bauart wie
   `catchup.js` und `saisonform.js`, aus demselben Grund. Damit behält ein
   abgegebener Tipp seinen Wert im Sinne der Architektur: er ist weiterhin für
   sich allein bewertbar. Was sich ändert, ist eine ÜBERWEISUNG obendrauf, und
   die ist als solche sichtbar. Das ist der eigentliche Unterschied zur
   ursprünglich abgelehnten Version 1, die in die Wertung selbst eingegriffen
   hätte.
2. **Kein neuer Punkte-Kanal.** Übernommen aus `ereignisse.js`: was ein Spieler
   durch Duell-Joker gewinnt, muss ein anderer verlieren (`nullsumme`) ODER es
   gilt ein Deckel (`maxProSaison`). Sonst entsteht eine zweite Leistungsachse,
   und `modCap` greift daran vorbei.
3. **Gegen das Rudelbilden gibt es Regler, keine Verbote:** `zielWahl:
   "nurVorne"` (man kann nur nach oben treten), `maxProZiel` (wie oft derselbe
   Spieler pro Saison getroffen werden darf) und `immun` (Schonfrist nach einem
   Treffer). Die Empfehlung stellt sie scharf, erlaubt bleibt alles.

## 3. ⚠️ Die Falle, an der der Block-Joker sonst scheitert

**Ein Block auf einen Spieler, der an diesem Spieltag ins Minus tippt, ist ein
Geschenk.** Das Regelwerk kennt Abzüge (`wrongPenalty`), Spieltagspunkte können
also negativ sein. Wer stumpf „× `restanteil`" rechnet, halbiert auch den
Verlust — der Block würde ausgerechnet dem helfen, den er treffen soll, und
zwar genau dann, wenn dieser gerade schwächelt.

Deshalb: **`nurGewinn: true` als Vorgabe.** Gedämpft wird nur eine positive
Spieltagswertung; eine negative bleibt unangetastet. Nur ein ausdrückliches
`false` schaltet das ab (dieselbe Bauart wie `nurGetippte` in `saisonform.js`).

Dieselbe Überlegung beim Klau-Joker: aus einem Minus lässt sich nichts klauen.
`klau.anteil` wird nur auf positive Zielpunkte angewendet.

## 4. Reihenfolge in der Verlaufskette

Heute: `applyCatchup(applySaisonform(roh, rules), rules)` (`engine.js:912`).

Neu: **`applyCatchup(applySaisonform(applyDuellJoker(roh, rules), rules), rules)`**

Begründung, in dieser Reihenfolge zwingend:
- **Duell zuerst**, weil die Überweisung INNERHALB eines Spieltags passiert. Was
  jemand an einem Spieltag „hat", schließt geklaute und geblockte Punkte ein.
- **Saisonform danach**, weil sie ganze Spieltage gewichtet und streicht — sie
  muss den Wert wiegen, der wirklich zählt.
- **Catchup zuletzt**, unverändert: der Anschluss-Bonus hängt am Rückstand, und
  der soll alles enthalten, was die Runde vorher entschieden hat.

---

## 5. Die Regler — vollständig

`rules.duell`. Gestaffelt nach Detailstufe: **E** = einfach, **A** = anpassen,
**P** = profi.

### A. Grundlage

| Feld | Typ | Vorgabe | Stufe | Bedeutung |
|------|-----|---------|-------|-----------|
| `enabled` | bool | `false` | E | Ganze Ebene an/aus. |
| `typen` | `["klau"]` \| `["block"]` \| beide | `["klau"]` | A | Welche Sorten es gibt. |

### B. Wann er kommt — hier liegt die Empfehlung

| Feld | Typ | Vorgabe | Stufe | Bedeutung |
|------|-----|---------|-------|-----------|
| `phase` | `ganze` \| `rueckrunde` \| `letztesDrittel` \| `schlussspurt` \| `manuell` | `letztesDrittel` | A | In welchem Saisonabschnitt es die Joker überhaupt gibt. **`schlussspurt`** = die letzten `schlussLaenge` Spieltage. |
| `schlussLaenge` | 2–8 | 4 | P | Nur bei `schlussspurt`. |
| `abSpieltag` / `bisSpieltag` | 1–38 | — | P | Nur bei `manuell`. |
| `anzahl` | 1–6 | 2 | A | Wie viele Duell-Joker jeder über die Runde bekommt. |
| `proSpieltag` | 1–3 | 1 | P | Wie viele davon an EINEM Spieltag. |
| `abstand` | 0–6 | 1 | P | Mindestabstand in Spieltagen zwischen zwei eigenen Einsätzen. Verhindert, dass alle drei am letzten Spieltag fallen. |
| `sichtbarkeit` | `verdeckt` \| `offen` | `offen` | P | Aus `jokerPlan.js` übernommen. **Hier bewusst `offen` als Vorgabe** (anders als beim normalen Joker): wer getroffen werden kann, soll das Fenster kennen — sonst fühlt es sich nach Willkür an. |

> **Umsetzung:** `phase` erzeugt ein Spieltags-Intervall, das an
> `jokerPlan.js` durchgereicht wird. Die Verteilung INNERHALB des Fensters macht
> weiterhin `jokerPlan` (blockweise, deterministisch aus der Runden-Id) — nicht
> nachbauen.

### C. Worauf er wirkt

| Feld | Typ | Vorgabe | Stufe | Bedeutung |
|------|-----|---------|-------|-----------|
| `umfang` | `einSpiel` \| `nSpiele` \| `spieltag` | `einSpiel` | A | Ein Spiel des Ziels, mehrere, oder sein ganzer Spieltag. |
| `spieleProEinsatz` | 1–5 | 1 | P | Nur bei `nSpiele`. |
| `wahl` | `selbst` \| `bestes` | `selbst` | P | Sucht der Spieler das Spiel aus, oder trifft es automatisch das ertragreichste Spiel des Ziels? **`bestes` ist die härtere Variante** — sie trifft immer. |

### D. Wie stark

| Feld | Typ | Vorgabe | Stufe | Bedeutung |
|------|-----|---------|-------|-----------|
| `klau.anteil` | 0.1–1.0 | 0.35 | A | Anteil der Zielpunkte, der zum Klauer fließt. |
| `klau.modus` | `nullsumme` \| `mitverdienen` | `nullsumme` | P | `nullsumme`: das Ziel verliert, was der Klauer bekommt. `mitverdienen`: das Ziel behält alles, der Klauer bekommt zusätzlich — dann greift zwingend `maxProSaison`. |
| `block.restanteil` | 0.0–0.9 | 0.5 | A | Was dem Ziel von der geblockten Wertung bleibt. 0 = vollständige Blockade. |
| `block.nurGewinn` | bool | `true` | P | Siehe Abschnitt 3. **Nicht leichtfertig abschalten.** |
| `block.beute` | 0.0–0.5 | 0 | P | Anteil des abgezogenen Betrags, den der Blocker selbst bekommt. 0 = reiner Abzug. Über 0 wird der Block faktisch zum Klau. |
| `maxProSaison` | 0–200 | 60 | P | Deckel, wie viele Punkte ein Spieler über die ganze Saison per Duell-Joker gewinnen kann. 0 = kein Deckel. Chronologisch gedeckelt, wie in `ereignisse.js`. |

### E. Wer auf wen

| Feld | Typ | Vorgabe | Stufe | Bedeutung |
|------|-----|---------|-------|-----------|
| `zielWahl` | `frei` \| `nurVorne` \| `nurTop3` \| `nichtLetzter` | `nurVorne` | A | `nurVorne`: nur auf Spieler, die vor mir stehen. Die direkte Antwort auf das Rudelbilden — der Führende ist angreifbar, der Letzte nicht. |
| `maxProZiel` | 1–6 | 2 | P | Wie oft derselbe Spieler pro Saison getroffen werden darf. |
| `immun` | 0–4 | 1 | P | Spieltage Schonfrist nach einem Treffer. |
| `konter` | bool | `false` | P | Darf ein Getroffener im selben Spieltag zurückschlagen, auch ohne eigenen Joker im Plan? |

### F. Ansage

| Feld | Typ | Vorgabe | Stufe | Bedeutung |
|------|-----|---------|-------|-----------|
| `ansage` | `vorAnpfiff` \| `beiAuswertung` | `vorAnpfiff` | A | Erfährt das Ziel vor dem Anpfiff, dass es getroffen wurde? |
| `oeffentlich` | bool | `true` | P | Sieht die ganze Runde, wer auf wen gesetzt hat — oder nur die zwei Beteiligten? |

> **Zur Fairness-Kante bei `ansage`:** Festgelegt wird der Einsatz IMMER vor
> Anpfiff (dieselbe Kante wie der Quoten-Snapshot). `beiAuswertung` verbirgt nur
> die Ansage, nie den Zeitpunkt. Ein Einsatz nach Anpfiff wäre ein
> Informationsvorsprung und ist gar nicht vorgesehen.

### G. Kosten

| Feld | Typ | Vorgabe | Stufe | Bedeutung |
|------|-----|---------|-------|-----------|
| `kosten` | `frei` \| `stattJoker` | `frei` | P | Kostet ein Duell-Joker einen normalen Joker aus `rules.joker`? |

---

## 6. Unsere Empfehlung (fest verdrahtet)

Der Nutzer hat sie vorgegeben, sie wird die Vorgabe UND das Empfehlungsband:

> **Diese Joker gehören ans Ende einer Runde und sollen selten und mäßig stark
> sein.** Sie sind ein Dramaturgie-Werkzeug, kein Balance-Werkzeug — dieselbe
> Einordnung wie die Spieltag-Gewichtung in `saisonform.js`. Wer sie über die
> ganze Saison und stark einstellt, ersetzt Tippkönnen durch Sozialdynamik.

Als `EMPFEHLUNG`-Konstante im Modul und als Bänder in `reglerWarnung.js`:

| Feld | Band | Begründung im Warntext |
|------|------|------------------------|
| `phase` | `letztesDrittel` / `schlussspurt` | Über die ganze Saison verteilt nutzt sich der Effekt ab und trifft zufällig statt zugespitzt. |
| `anzahl` | 1–3 | Ab 4 Einsätzen wird aus einer Zuspitzung ein Dauerzustand. |
| `klau.anteil` | 0.2–0.5 | Über 0,5 hängt der Saisonausgang mehr am Zielen als am Tippen. |
| `block.restanteil` | 0.4–0.8 | Unter 0,4 ist es eine Löschung, keine Dämpfung. |
| `zielWahl` | ≠ `frei`, wenn `anzahl` ≥ 3 | Kombinationsregel: viele freie Einsätze = alle auf den Führenden. |
| `maxProZiel` | ≤ 3 | Sonst kann sich die Runde auf einen einschießen. |

**Kombinationsregel** (handgeschrieben, nach dem Muster „kein Abzug + kein
Cutoff = Gratis-Lose"):
`klau.modus: "mitverdienen"` **und** `maxProSaison: 0` → das ist der neue
Punkte-Kanal, den Abschnitt 2 ausschließt. Muss eine Warnung mit
`korrigieren` auslösen.

---

## 7. Umsetzung in Schritten

Jeder Schritt ist für sich testbar und commitfähig.

### Schritt 1 — Modul `src/lib/duellJoker.js` (reine Logik, UI-frei)

Exportiert:
- `DUELL_TYPEN`, `PHASEN`, `ZIELWAHL`, `UMFANG`, `ANSAGE` — Kataloge mit
  `{ key, label, desc }`, nach dem Muster von `VERTEIL_MODI` in `jokerPlan.js`.
- `DUELL_LIMITS`, `DEFAULT_DUELL`, `EMPFEHLUNG` (Abschnitt 5 + 6).
- `sanitizeDuellJoker(partial)` — wie `sanitizeVerteilung`: unbekannte Werte
  fallen auf die Vorgabe, Zahlen werden auf `DUELL_LIMITS` beschnitten.
- `fensterVon(duell, spieltage)` → `{ von, bis }`. Übersetzt `phase` in ein
  Spieltags-Intervall. `manuell` nimmt `abSpieltag`/`bisSpieltag`, sonst
  errechnet.
- `duellPlan({ spieltage, duell, seed, userIds })` — ruft `jokerPlan` aus
  `jokerPlan.js` für das Fenster auf und filtert anschließend nach `abstand`
  und `proSpieltag`. **`jokerPlan` nicht nachbauen.**
- `zulaessigeZiele(board, userId, duell)` → Liste erlaubter Ziel-`userId`s nach
  `zielWahl`, `maxProZiel`, `immun`.
- `applyDuellJoker(verlauf, rules, einsaetze)` — die Anwendung auf den Verlauf.
  Signatur analog `applySaisonform(verlauf, rules)`, plus die tatsächlich
  gesetzten Einsätze `[{ spieltag, vonUserId, aufUserId, typ, spielIds }]`.
  Ohne Einsätze gibt sie den Verlauf **unverändert** zurück (`return verlauf`),
  wie `applyCatchup` und `applySaisonform` es tun.
- `beschreibeDuell(duell, spieltage)` — ein Satz für die UI, Muster
  `beschreibeVerteilung`.
- `konflikte(rules)` — meldet die Kombinationsregel aus Abschnitt 6.

Dazu `src/lib/duellJoker.test.js`. Pflichtfälle:
1. Standardregelwerk → `applyDuellJoker` gibt dieselbe Referenz zurück.
2. Klau `nullsumme`: die Summe über alle Spieler bleibt unverändert.
3. Klau auf einen Spieler mit NEGATIVEN Spieltagspunkten → kein Transfer.
4. Block mit `nurGewinn: true` auf negative Punkte → Ziel unverändert.
5. Block mit `nurGewinn: false` auf negative Punkte → Verlust wird gedämpft
   (der Fall, den Abschnitt 3 beschreibt — als bewusst erlaubt festgehalten).
6. `maxProSaison` deckelt chronologisch: der vierte Einsatz bringt nichts mehr,
   wenn der Deckel erreicht ist.
7. `zulaessigeZiele` mit `nurVorne` liefert nie den eigenen Namen und niemanden
   hinter mir.
8. `maxProZiel` und `immun` schließen ein bereits getroffenes Ziel aus.
9. `fensterVon` für alle fünf Phasen bei 34 Spieltagen.
10. `duellPlan` hält `abstand` ein und legt keinen Joker außerhalb des Fensters.

### Schritt 2 — Ins Regelwerk hängen
- `engine.js`: `DEFAULT_RULES.duell = { ...DEFAULT_DUELL }`, `sanitizeRules`
  delegiert an `sanitizeDuellJoker` (Muster `sanitizeSaisonform`).
- `engine.js:912`: die Kette um `applyDuellJoker` erweitern (Abschnitt 4).
  ⚠️ Einsätze kommen aus dem Store; solange keine da sind, ist der Aufruf ein
  No-Op. **`brauchtVerlauf` muss `duell.enabled` mitzählen.**
- `presetMerge.js`: `duell` in den Aspekt aufnehmen, in dem schon `aufholen`
  und `saisonform` liegen. Der Abdeckungs-Test schlägt sonst an — das ist so
  gewollt und der Hinweis, es nicht zu vergessen.

### Schritt 3 — Adminoberfläche `src/components/DuellJoker.jsx`
Eigene Komponente, Muster `JokerVerteilung.jsx`. Enthält:
- Typ-Wahl (Klau / Block / beide) als Karten mit `desc`.
- **Phasen-Leiste**: dieselbe 34-Kästchen-Leiste wie in `JokerVerteilung.jsx`,
  die das Fenster hervorhebt und die geplanten Einsätze darin leuchten lässt.
  Das ist das wichtigste Element der ganzen Oberfläche — „letztes Drittel, 2
  Joker" ist eine Zahl, die Leiste ist eine Aussage.
- Stärke-Regler mit Live-Beispielrechnung: „Dein Ziel holt am Spieltag 40
  Punkte → du bekommst 14, ihm bleiben 26."  Ohne diese Zeile ist `anteil` eine
  abstrakte Zahl.
- Ziel-Regeln, Ansage, Kosten — unter `stufe === "profi"`.
- Einbau in `Spielerstellung.jsx`: `stufe === "anpassen"` zeigt Typ, Phase,
  Anzahl, Stärke; `stufe === "profi"` die ganze Komponente. Bei `einfach`
  unsichtbar (nur über Charakter/Preset).
- Import + `patchDuell`-Helfer nach dem Muster von `patchSaisonform`.

### Schritt 4 — Empfehlungsbänder
`reglerWarnung.js`: die Felder aus Abschnitt 6 als `gemessen`-Bänder plus die
Kombinationsregel mit `korrigieren`. ⚠️ **Bänder verengen nie `DUELL_LIMITS`.**

### Schritt 5 — Messen (eigener Durchgang, NICHT Teil dieser Umsetzung)
Erst wenn 1–4 stehen: sieht `balanceSim.js` die Ebene überhaupt? Nach heutigem
Stand nein — der Simulator kennt keine Duelle zwischen Profilen. Das ist der
gleiche Blindstellen-Test wie bei `saisonform` und wird gesondert geplant.

---

## 8b. Nachtrag zur Abnahme von Schritt 1 (31.07.)

Schritt 1 liegt, 1188 Tests grün. Zwei Punkte aus der Abnahme, beide hier
entschieden, damit die Nachbesserung nicht raten muss.

### (a) Fehler: `abSpieltag`/`bisSpieltag` überleben `sanitize` nicht

`sanitizeDuellJoker` macht aus `null` eine `1`, weil `Number(null) === 0` ist
und `Number.isFinite(0)` wahr. Der Kommentar im Modul verspricht das Gegenteil
(„sonst bleibt es `null`"). **Wirkung:** wer `phase` auf `manuell` stellt, ohne
die Regler angefasst zu haben, bekommt das Fenster **Spieltag 1–1** — ein
einzelner Spieltag ganz am Saisonanfang, also das genaue Gegenteil der
Empfehlung und praktisch eine tote Regel. Gemessen:
`fensterVon({ ...DEFAULT_DUELL, phase: "manuell" }, 34)` → `{ von: 1, bis: 1 }`.

`undefined` läuft korrekt durch (`Number(undefined)` ist `NaN`) — es beißt genau
bei `null`, und `null` ist der Wert in `DEFAULT_DUELL`.

✅ **Behoben und nachgemessen (31.07.).** `null`, `undefined` und `0` gelten
alle als „keine Vorgabe" und bleiben `null`.

**Nachtrag — nur EINE Grenze gesetzt.** Der Rückfall aufs letzte Drittel gilt
ausdrücklich nur, wenn BEIDE Grenzen fehlen. Ist genau eine gesetzt, wird die
andere aufgefüllt (`ab 20` → 20–34, `bis 10` → 1–10). Begründung: eine
ausdrücklich gesetzte Grenze ist eine Ansage des Admins, und die darf ein
Vorgabe-Rückfall nicht überschreiben. Das ist die Regel, nicht ein Restzustand.

**Festlegung:** `null` und `undefined` gelten beide als „keine Vorgabe".
`manuell` ohne gesetzte Grenzen fällt auf das **letzte Drittel** zurück, nicht
auf die ganze Saison — die Vorgabe des Moduls ist die Empfehlung, und ein
Fenster über die ganze Saison wäre die aggressivste Einstellung als Nebenwirkung
eines Modus-Wechsels.

### (b) Offene Frage des Executors: `umfang: einSpiel` / `nSpiele`

Der Einwand ist berechtigt und der Fehler liegt im Plan, nicht in der Umsetzung:
`verlauf` trägt nur Spieltags-Summen, eine Wirkung auf EINZELNE Spiele lässt
sich daraus nicht rechnen.

**Festlegung — die Spiel-Ebene bleibt draußen, der BETRAG kommt herein.**
`applyDuellJoker` bekommt den betroffenen Betrag fertig geliefert:

```
einsatz = { spieltag, vonUserId, aufUserId, typ, spielIds, basis }
```

`basis` = die Punkte des Ziels aus den betroffenen Spielen an diesem Spieltag.
Fehlt `basis` (oder ist es `undefined`), gilt der GANZE Spieltag — also das
Verhalten von `umfang: "spieltag"`. Damit bleibt das Modul rein und ohne
Spiel-Daten benutzbar, und die Spiel-Ebene wird dort gerechnet, wo sie liegt:
in `scoreLeaderboardHistory` (Schritt 2), das die Einzeltipps ohnehin hat.

Was die Auswahl der Spiele angeht, ist das aber sehr wohl reine Logik und
gehört hierher — als eigene Funktion:

```
waehleSpiele(spieleDesZiels, duell, gewaehlteIds) -> string[]
```

`spieleDesZiels` = `[{ spielId, punkte }]` des Ziels an diesem Spieltag.
- `umfang: "spieltag"` → alle Ids.
- `umfang: "einSpiel"` → bei `wahl: "selbst"` die erste gültige Id aus
  `gewaehlteIds`, bei `wahl: "bestes"` das Spiel mit den MEISTEN Punkten.
- `umfang: "nSpiele"` → wie oben, aber `spieleProEinsatz` Stück; bei `bestes`
  die ertragreichsten, bei `selbst` die ersten gültigen aus `gewaehlteIds`.
- Ids, die nicht in `spieleDesZiels` vorkommen, werden verworfen (ein Einsatz
  auf ein Spiel, das das Ziel gar nicht getippt hat, ist kein Treffer).
- Bei Gleichstand entscheidet die kleinere `spielId`, damit das Ergebnis nicht
  an der Eingabereihenfolge hängt (dieselbe Regel wie `streichIndizes`).

## 8. Was NICHT gebaut wird
- Kein Eingriff in `scoreTip`. Nie.
- Keine eigene Tabelle für Einsätze in dieser Runde — erst wenn die Logik steht.
- Keine Automatik, die Ziele vorschlägt. Wer klaut, wählt selbst.
