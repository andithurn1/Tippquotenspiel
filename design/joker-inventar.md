# Joker & Modifikatoren — vollständiges Inventar und Lückenliste

**Account 2 (Andre), 2026-07-31.** Auf Anweisung des Nutzers: *erst* Klarheit
über alle Gestaltungsmöglichkeiten, *dann* ausbalancieren.

> **Die Korrektur, die diesem Dokument vorausgeht:** Die Würze als eine Zahl
> („wie laut insgesamt") war falsch gedacht. Entscheidend ist die
> **GESTALTUNGSRICHTUNG**. Ein hoher Modifikator auf Außenseiter-Spiele macht
> Außenseiter-*Joker* überflüssig — auf einen Steal-Joker hat er null Einfluss,
> weil der auf einer anderen Achse liegt. Zwei Ebenen konkurrieren nur, wenn sie
> **dieselbe Achse** bedienen. Siehe Abschnitt 3.

---

## 1. Die sechs Gestaltungsachsen

Jede Regel-Ebene bedient eine oder mehrere. Das ist der Ersatz für die
Würze-Skala.

| Achse | Was sie belohnt | Wer gewinnt, wenn sie hochgedreht wird |
|---|---|---|
| **A · Risiko** | Außenseiter tippen, hohe Quoten wagen | der Mutige |
| **B · Fokus** | die richtigen Spiele auswählen und schwerpunkten | der Taktierer |
| **C · Dramaturgie** | zum richtigen ZEITPUNKT stark sein | der Spätzünder |
| **D · Sozial** | Interaktion mit Mitspielern | der Aufmerksame |
| **E · Ausdauer** | dabeibleiben, nichts auslassen | der Verlässliche |
| **F · Wissen** | Detailkenntnis (Torschützen, Saisonverläufe) | der Kenner im engeren Sinn |

---

## 2. Was wir HABEN

### 2.1 Modifikatoren (wirken auf ein Spiel, für alle gleich)

| Modul | Regel | Achse | Konfigurierbar |
|---|---|:--:|---|
| `engine.js` | `underdogBoost`, `underdogRampStart/End` | A | Höhe, Rampe |
| `engine.js` | `k`, `m`, `minPayout`, `wrongPenalty` | A | vier Regler |
| `engine.js` | `combo` (exakt/abstand/tendenz) | A/F | je Ebene |
| `teamMods` | Vereins-Faktor, `derbyFaktor` | B | je Verein, Derby |
| `bigGame` | dynamisches Topspiel | B/C | Aufschlag, `minSpannung`, Auslöser |
| `wettbewerbGewicht` | CL zählt mehr als Liga | B | je Wettbewerb, K.-o.-Rang |
| `markets.goals` | Torschützen | F | Modus, Anzahl, Gewicht |
| `modCap` | additiver Deckel über alles | — | eine Zahl |

### 2.2 Joker (wirken für EINEN Spieler)

| Modul | Regel | Achse | Konfigurierbar |
|---|---|:--:|---|
| `joker` | `einzel` — ein Spiel je Spieltag ×Faktor | B | Faktor |
| `joker` | `ranking` — Gewichte-Pool verteilen | B | Pool, Stufen |
| `joker.mut` | Mut-Bonus auf hohe Quoten | A | Faktor |
| `joker.heimat` | Heimatbonus auf den eigenen Verein | D | Faktor |
| `jokerPlan` | WANN es Joker gibt | C | Modus, Frequenz, Sichtbarkeit |
| `voting` | Runde stimmt über Joker-Spieltage ab | D | an/aus |
| `ereignisse` | Joker ERSPIELEN (4 Meilensteine, Trost) | E | je Typ, `maxErspielt` |
| `duellJoker` **neu** | Klau / Block gegen eine Person | D | 19 Regler |

### 2.3 Verlaufs-Ebenen (wirken auf fertige Spieltagspunkte)

| Modul | Regel | Achse | Konfigurierbar |
|---|---|:--:|---|
| `catchup` | Anschluss-Bonus für Zurückliegende | C/D | Stärke, Schwelle, Betrifft |
| `saisonform` | Spieltag-Gewichtung, Streichresultate | C/E | Kurve, Stärke, Streicher |
| `versaeumnis` | Ersatz-Tipp statt null Punkte | E | Strategie, Malus, Max |
| `saisonwetten` | Langzeit-Ebene nebenher | F | Katalog, Gewicht, Fenster |

**Befund: Achse A, B, C, E, F sind ordentlich besetzt. D (Sozial) hing bis zum
Duell-Joker fast leer** — Heimatbonus und Abstimmung waren alles.

---

## 3. Die Kollisionsregel (ersetzt die Würze-Summe)

**Zwei Ebenen konkurrieren nur auf derselben Achse.** Statt einer Gesamtzahl
also ein **Profil über sechs Achsen**, und geprüft wird je Achse:

```
achsenProfil(rules) -> { A: 0..3, B: 0..3, C: 0..3, D: 0..3, E: 0..3, F: 0..3 }
```

- **Auf einer Achse hoch + hoch** → Warnung. Beispiel: `underdogBoost` weit
  oben (A=3) **plus** starker Mut-Bonus (A=2) — die Ebenen verstärken einander
  multiplikativ, weil `jokerFactor` in `scoreTip` zuletzt greift und genau die
  ohnehin hohen Auszahlungen noch einmal streckt.
- **Auf verschiedenen Achsen hoch** → **kein Problem.** Underdog-Modifikator
  (A) plus Steal-Joker (D) stören einander nicht. Genau der Fall, an dem die
  Summenregel gescheitert wäre.
- **Eine Achse ganz auf 0** → Hinweis, keine Warnung. Eine Runde ganz ohne
  soziale Ebene ist eine legitime Entscheidung.

⚠️ **Auch das ist noch geschätzt.** Aber es ist die deutlich bessere Schätzung,
weil sie eine überprüfbare Behauptung macht: *dieselbe* Achse verstärkt sich.
Das kann `npm run balance` widerlegen, eine nackte Gesamtsumme nicht.

---

## 4. 🔴 Die Lücken — was ein Admin einstellen können sollte und heute nicht kann

Sortiert nach Bauaufwand. „Verständlich?" = lässt es sich im Detailmodus in
zwei Sätzen erklären.

### 4.1 Große Lücken (fehlende Grundmechanik)

| # | Fehlt | Achse | Warum es zählt | Verständlich? |
|---|---|:--:|---|---|
| **L1** | **Quoten-Joker / Quote einfrieren** | A | Wir sind ein QUOTEN-Tippspiel und haben keinen Joker auf die Quote. Heute friert der Snapshot beim Anpfiff für alle gleich ein. Ein Joker, der die Quote **zum Zeitpunkt deines Tipps** festschreibt, belohnt frühes Tippen und Marktgespür — die naheliegendste Mechanik unseres eigenen Themas, und sie fehlt komplett. | ✅ „Deine Quote gilt ab jetzt, egal wie sie sich noch bewegt." |
| **L2** | **Variabler Einsatz je Spiel** | A/B | Heute ist der Joker ein FESTER Faktor. Der Spieler kann nicht wählen, *wie viel* er auf ein Spiel setzt. Das ist die stärkste fehlende Ausdrucksmöglichkeit — `ranking` kommt am nächsten, ist aber ein fester Pool. | ✅ „Verteile 100 Punkte Einsatz auf deine Spiele." |
| **L3** | **Schutz / Versicherung** | C/E | Alle unsere Joker sind offensiv. Es gibt nichts Defensives: kein Boden für einen verpatzten Spieltag, keine Absicherung. Der Block-Joker trifft andere, er schützt nicht. Fehlender Gegenpol. | ✅ „Dein schlechtester Spieltag zählt mindestens X." |
| **L4** | **Ansage / Vorhersage-Joker** | A/D | Vorab ansagen „ich treffe dieses Spiel exakt" — trifft man, gibt es extra; trifft man nicht, kostet es. Erzeugt Drama VOR dem Spiel statt danach, und ist öffentlich. Reine Dramaturgie, sehr billig zu bauen. | ✅ |
| **L5** | **Dämpfer-Modifikator** | B | Alle Modifikatoren gehen nur nach OBEN (Aufschlag). Es gibt keine Möglichkeit zu sagen „dieses Spiel zählt weniger". Der Admin kann Wichtiges hervorheben, aber Unwichtiges nicht zurücknehmen — das halbiert die Ausdruckskraft der ganzen Ebene B. | ✅ |

### 4.2 Mittlere Lücken

| # | Fehlt | Achse | Warum | Verständlich? |
|---|---|:--:|---|---|
| **L6** | **Frühtipp-Bonus** | E/A | Wer früh tippt, tippt ohne spätere Informationen (Aufstellungen, Verletzungen). Belohnt Mut und entzerrt den Ansturm kurz vor Anpfiff. `tippfenster.js` kennt den Zeitpunkt bereits — die Daten liegen da. | ✅ |
| **L7** | **Spiel-Deckel** | B | „Kein einzelnes Spiel darf mehr als X % eines Spieltags ausmachen." `modCap` deckelt Modifikatoren, nicht den ANTEIL eines Spiels. Die Fairness-Schraube, die bei hohen Jokern fehlt. | ✅ |
| **L8** | **Stapelbarkeit regeln** | — | Dürfen zwei Joker auf dasselbe Spiel? Heute implizit gelöst, nirgends einstellbar. Gehört als ausdrücklicher Regler in die Limitierungsklassen. | ✅ |
| **L9** | **Widerruf-Fenster** | — | Bis wann ist ein gesetzter Joker änderbar? Heute: bis Anpfiff, hart verdrahtet. Ein Admin könnte „ab Setzen verbindlich" wollen — das ändert das Spielgefühl deutlich. | ✅ |
| **L10** | **Kopier-Joker** | D | Den Tipp eines Mitspielers übernehmen, sichtbar erst nach Anpfiff. Soziale Achse, harmlos (kein Punkte-Transfer), und die freundliche Ergänzung zum Klau-Joker. | ✅ |
| **L11** | **Serien-Joker** | E | Bonus, der mit jedem Treffer in Folge wächst und bei einem Fehltipp zurückfällt. `ereignisse.js` kennt Serien schon als Auslöser — hier wäre die Serie selbst der Multiplikator. | ✅ |

### 4.3 Kleine Lücken / Konfigurations-Dimensionen

Diese gelten quer über ALLE Joker und fehlen heute als einheitliche Regler:

| # | Dimension | Heute |
|---|---|---|
| **L12** | **Wer darf** (alle · nur Zurückliegende · nur ab Platz X · Admin-Freigabe) | nur im Duell-Joker (`zielWahl`), nirgends allgemein |
| **L13** | **Sichtbarkeit des Einsatzes** (sofort · nach Anpfiff · nach Auswertung) | nur im Duell-Joker (`ansage`) |
| **L14** | **Übertragbarkeit** (verfällt am Periodenende · wandert mit · handelbar) | nirgends |
| **L15** | **Mindest-Quote als Bedingung** („Joker nur auf Spiele über Quote 3") | nirgends — würde L1/L2 ergänzen |

**L12 bis L15 sind der eigentliche Baukasten-Gedanke:** vier Dimensionen, die
JEDER Joker tragen sollte, statt sie pro Joker neu zu erfinden. Sie gehören in
eine gemeinsame Grundform, aus der sich jeder Joker-Typ bedient — dieselbe
Überlegung, die aus Klau und Block EIN Modul gemacht hat.

### 4.4 Bewusst NICHT gebaut

| Idee | Warum nicht |
|---|---|
| Joker-**Handel** zwischen Spielern | Absprachen. Zwei Spieler könnten sich gegenseitig hochschieben — das ist kein Regler, das ist ein Loch. |
| Tipp ÄNDERN nach Anpfiff | Bricht die Snapshot-Kante. Nicht verhandelbar. |
| Joker, der Punkte aus dem Nichts schafft | Verletzt „kein neuer Punkte-Kanal" (`ereignisse.js`). Immer Nullsumme oder Deckel. |
| Herausforderungen / Minispiele | Bereits im Katalog vorbereitet, aber ohne Datenquelle nicht auswertbar. Ehrlich als „nicht aktivierbar" markiert. |

---

## 5. Empfohlene Reihenfolge

1. **L12–L15 zuerst** — die gemeinsame Grundform. Sie sind Voraussetzung dafür,
   dass die neuen Joker nicht wieder je eigene Regler mitbringen.
2. **L1, L2, L5** — die drei, die dem Spiel echte Ausdruckskraft hinzufügen.
   L1 vor allem, weil es unser eigenes Thema ist und peinlich fehlt.
3. **L3, L4** — Gegenpol und Dramaturgie.
4. **L6–L11** nach Bedarf.
5. **Erst danach ausbalancieren**, und zwar über `achsenProfil` je Achse — nicht
   über eine Gesamtsumme.

⚠️ **Vor dem Balancieren gilt weiterhin die Blindstellen-Regel:** erst prüfen,
ob `balanceSim.js` eine neue Ebene überhaupt SIEHT. Bei `saisonform` war die
Antwort nein, aus vier Gründen (siehe `COORDINATION.md`). Bei Budget,
Limitierungsklassen und Duell-Jokern ist sie nach heutigem Stand ebenfalls nein.
