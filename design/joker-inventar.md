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

## 3.1 Wie `achsenProfil(rules)` rechnet — verbindlich

Je Achse werden **Beiträge** addiert und das Ergebnis auf 0–3 begrenzt. Jeder
Beitrag ist an EIN Feld gebunden, damit später nachvollziehbar ist, welcher
Regler eine Achse hochgetrieben hat (`achsenProfil` liefert deshalb neben dem
Wert auch die Herkunft).

⚠️ **Eine ausgeschaltete Ebene trägt immer 0 bei.** Jeder Beitrag prüft zuerst
sein `enabled`.

### A · Risiko

| Feld | Beitrag |
|---|---|
| `underdogBoost` | ≥1,6 → 2 · >1,0 → 1 · sonst 0 |
| `joker.mut.faktor` (wenn `mut.enabled`) | >1,15 → 2 · >1,0 → 1 |
| `wrongPenalty` | ≥ −1 → 1 (kein Einsatz = Gratis-Lose) |
| `minPayout` | ≤1 → 1 (kein Cutoff) |

### B · Fokus

| Feld | Beitrag |
|---|---|
| `joker.faktor` (wenn `joker.enabled`) | ≥2,5 → 2 · >1,5 → 1 |
| `bigGame.aufschlag` (wenn aktiv) | ≥0,6 → 1 |
| `teamMods.derbyFaktor` | >1,3 → 1 |
| `wettbewerbe.enabled` | 1 |

### C · Dramaturgie

| Feld | Beitrag |
|---|---|
| `saisonform.kurve` ≠ `flach` | `staerke` ≥2,0 → 2 · sonst 1 |
| `aufholen.enabled` | `staerke` ≥0,4 → 2 · sonst 1 |
| `duell.phase` ∈ {`letztesDrittel`,`schlussspurt`} | 1 |

### D · Sozial

| Feld | Beitrag |
|---|---|
| `duell.enabled` | `typen` enthält `block` → 2 · sonst 1 |
| `duell.zielWahl` = `frei` | +1 |
| `joker.abstimmung` === `true` | 1 |
| `joker.heimat.enabled` | 1 |

> 🔴 **Korrektur 31.07.:** Hier stand `voting.enabled`. Das Feld gibt es nicht —
> die Joker-Abstimmung liegt als **Boolean** unter `rules.joker.abstimmung`
> (`engine.js:125`, ausgewertet in `voting.js`). Die Zeile hätte nie
> beigetragen. Gefunden bei der Abnahme von Baustein 3, weil die Umsetzung sie
> wörtlich übernommen und gemeldet hat, statt sie still zurechtzubiegen.

### E · Ausdauer

| Feld | Beitrag |
|---|---|
| `saisonform.streich` | >3 → 2 · >0 → 1 |
| `versaeumnis.enabled` | 1 |
| `ereignisse` mit Kategorie `meilenstein` | ≥3 aktiv → 2 · ≥1 → 1 |

### F · Wissen

| Feld | Beitrag |
|---|---|
| `markets.goals.enabled` | **Namen je Spiel** ≥4 → 2 · ≥1 → 1 |
| `saison.enabled` | `gewicht` ≥1,5 → 2 · sonst 1 |
| `combo.exakt` | ≥3 → 1 |

> 🔴 **Korrektur 31.07.:** Hier stand „`gewicht` hoch → 2". `markets.goals` hat
> **kein** `gewicht`-Feld (`engine.js:79`) — der Zweig war unerreichbar, es zählte
> immer die 1. Der richtige Maßstab dafür, wie viel Detailwissen die Ebene
> verlangt, ist die Zahl der zu tippenden **Namen je Spiel**:
>
> ```
> namenJeSpiel = modus === "proTeam" ? picksPerTeam * 2 : picksProSpiel
> ```
>
> Die Vorgabe (`proTeam`, `picksPerTeam: 2`) ergibt 4 Namen je Spiel und damit
> den hohen Beitrag — das ist auch inhaltlich richtig, Torschützen sind die
> wissensintensivste Ebene, die wir haben.

### `achsenKonflikte(profil)`

Meldet **nur** Achsen mit Wert 3 **und** mindestens zwei beitragenden Quellen —
eine einzelne Ebene auf Anschlag ist eine Entscheidung, zwei auf derselben Achse
ein Zusammenstoß. Der Text nennt beide Herkünfte, damit der Admin weiß, welchen
der beiden Regler er zurücknehmen kann.

⚠️ **Keine Warnung bei hohen Werten auf VERSCHIEDENEN Achsen.** Das ist der
ganze Sinn der Umstellung.

---

## 4. 🔴 Die Lücken — was ein Admin einstellen können sollte und heute nicht kann

Sortiert nach Bauaufwand. „Verständlich?" = lässt es sich im Detailmodus in
zwei Sätzen erklären.

### 4.1 Große Lücken (fehlende Grundmechanik)

| # | Fehlt | Achse | Warum es zählt | Verständlich? |
|---|---|:--:|---|---|
| ~~L1~~ | ~~**Quoten-Joker / Quote einfrieren**~~ | A | 🔴 **VERWORFEN am 31.07. durch den Nutzer.** Siehe Abschnitt 4.4 — der Einwand ist zwingend. | — |
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
| **Quoten-Joker (L1)** — Quote zum Tippzeitpunkt einfrieren | 🔴 **Vom Nutzer verworfen, und der Einwand trägt weiter als „Effizienz".** `snapshot` ist heute **pro Spiel und global**, nicht pro Spieler — dieselbe Begegnung gehört zu vielen Runden (siehe „Big Game" in `CLAUDE.md`: eingefroren wird der WERT, nicht das Urteil). Ein Einfrieren je Tippzeitpunkt hieße ein eigener Snapshot pro Spieler und Spiel. Zwei Folgen, beide untragbar: (1) die Wertungen zweier Spieler wären nicht mehr gegeneinander prüfbar, weil sie auf verschiedenen Quoten stehen; (2) **es macht den offenen RLS-Befund unreparierbar** — `tips.snapshot` wird vom Client geschrieben und braucht einen serverseitigen Trigger, der den Wert prüft. Prüfen kann er nur, wenn es EINEN richtigen Wert gibt. Der Frühtipp-Gedanke bleibt über **L6** erhalten, ohne die Quote anzufassen. |
| Joker-**Handel** zwischen Spielern | Absprachen. Zwei Spieler könnten sich gegenseitig hochschieben — das ist kein Regler, das ist ein Loch. |
| Tipp ÄNDERN nach Anpfiff | Bricht die Snapshot-Kante. Nicht verhandelbar. |
| Joker, der Punkte aus dem Nichts schafft | Verletzt „kein neuer Punkte-Kanal" (`ereignisse.js`). Immer Nullsumme oder Deckel. |
| Herausforderungen / Minispiele | Bereits im Katalog vorbereitet, aber ohne Datenquelle nicht auswertbar. Ehrlich als „nicht aktivierbar" markiert. |

---

## 4.5 Ausgearbeitete Lösungen

Auf Anweisung des Nutzers am 31.07. durchdacht. Jede Lösung hält die drei
Architekturregeln ein: `scoreTip` bleibt für sich bewertbar, kein neuer
Punkte-Kanal, Modifikatoren bleiben additiv gedeckelt.

### ⭐ L12–L15 — die gemeinsame Grundform (zuerst bauen)

`src/lib/jokerBasis.js`. **Kein neuer Joker, sondern die Form, die jeder Joker
trägt.** Ohne sie bringt jeder neue Typ wieder eigene Regler mit, und dann sind
es elf Sonderfälle statt eines Baukastens.

```js
export const JOKER_BASIS = {
  wer:       "alle",          // alle | abPlatz | abRueckstand | adminFreigabe
  werWert:   0,
  sicht:     "nachAnpfiff",   // sofort | nachAnpfiff | nachAuswertung
  verfall:   "saison",        // periode | saison | wandert
  widerruf:  "bisAnpfiff",    // bisAnpfiff | bisStunden | sofortVerbindlich
  widerrufStunden: 0,
  stapeln:   1,               // wie viele Joker auf DASSELBE Spiel
  bedingung: { minQuote: null, maxQuote: null, wettbewerbe: [], phasen: [] },
};
```

- `sanitizeJokerBasis(partial)` und `erfuelltBedingung(basis, snap)` liegen hier,
  jeder Joker-Typ ruft sie auf statt eigene Prüfungen zu schreiben.
- **`bedingung.minQuote` ist L15** und der saubere Ersatz für den verworfenen
  L1: „dieser Joker gilt nur auf Spiele über Quote 3" macht Mut zur Bedingung,
  ohne die Quote selbst anzufassen.
- ⚠️ `widerruf` darf **nie über den Anpfiff hinaus** gehen. `bisStunden` zählt
  Stunden VOR Anpfiff, nie danach — dieselbe Kante wie der Snapshot.

### ⭐ L2 — variabler Einsatz je Spiel

**Kein neues Modul: ein dritter `joker.modus` neben `einzel` und `ranking`.**
`ranking` ist bereits die diskrete Fassung (fester Pool 2 · 1,5 · 1,2 · 1) —
`einsatz` ist die stufenlose.

Der Spieler verteilt je Spieltag ein Einsatz-Budget auf seine Spiele.

⚠️ **Die entscheidende Regel, sonst ist es kaputt:** die Faktoren werden auf
**Mittelwert 1 normiert**, exakt wie `gewichte()` in `saisonform.js`
(„die Kurve verschiebt Gewicht, sie erzeugt keines"). Wer alles auf ein Spiel
setzt, verschiebt sein Gewicht — er erzeugt keines. Ohne diese Normierung höbe
ein hoher Gesamteinsatz schlicht das Punkteniveau, und `displayScale` wanderte
mit; genau die Falle, die bei „Bonus für den Letzten" schon einmal dokumentiert
ist.

- `einsatzProSpieltag` (Vorgabe 100), `maxAnteilProSpiel` (Vorgabe 0,4) — der
  Deckel gegen All-in, gleichzeitig die Umsetzung von **L7**.
- Nicht verteilter Rest verfällt; er wandert nicht in den nächsten Spieltag,
  sonst entsteht die Schluss-Salve.
- `modCap` greift unverändert obendrauf.

#### 🔴 Nachtrag 03.08.: wo die Normierung stattfindet — die Spec ließ es offen

Beim Bauen aufgefallen, und es ist keine Kleinigkeit: **„auf Mittelwert 1
normiert" setzt voraus, dass man alle Tipps eines Spieltags kennt.**
`jokerAufschlaege` in `engine.js` sieht aber immer nur EINEN Tipp — es bekommt
`(tip, snap, j, actual)` und sonst nichts. `ranking` umgeht das über den festen
Pool: jeder Wert darf pro Spieltag nur einmal vergeben werden, dadurch ist die
Normierung im Zuschnitt des Pools schon enthalten. Ein stufenloser Einsatz hat
diese Krücke nicht.

Zwei Wege, und der naheliegende ist der falsche:

| Weg | Warum (nicht) |
|---|---|
| `scoreTip` den Spieltag mitgeben | Bricht die Architektur: `scoreTip` bewertet EINEN Tipp für sich. Und es bräche die Snapshot-Regel — ein später abgegebener Tipp würde den Faktor eines früheren nachträglich ändern. Genau das darf nicht passieren („ein abgegebener Tipp ändert seinen Wert nicht"). |
| **Der normierte Faktor steht am Tipp** | Der Spieler verteilt in der Oberfläche, die dort bekannte Spieltags-Größe normiert, und gespeichert wird der fertige Faktor — **im vorhandenen Feld `tip.gewicht`**, das `ranking` schon benutzt. |

**Festlegung: der zweite Weg.** Folgen:

- **Kein neues Tipp-Feld, keine Store-Änderung, keine Migration.** `saveTip`
  trägt `gewicht` bereits durch (`Tippabgabe.jsx` setzt es für `ranking`).
- `jokerAufschlaege` behandelt `modus: "einsatz"` wie `ranking`, nur mit einer
  BEREICHS-Prüfung statt `pool.includes(w)` — ein manipulierter Client soll
  keinen Fantasie-Faktor einschleusen können.
- Die Spieltags-Regel („Summe der Einsätze passt, keiner über
  `maxAnteilProSpiel`") gehört dorthin, wo `invalidWeightMatchdays` schon
  steht: eine Prüffunktion über die Tipps EINES Nutzers, mit demselben
  `schluessel`-Parameter für den Runden-Spieltag.
- ⚠️ **„Rest verfällt" ist damit automatisch richtig herum:** wer weniger als
  `einsatzProSpieltag` verteilt, hat lauter Faktoren unter 1 und verliert
  Gewicht. Es muss nichts eigens dafür gebaut werden — es ist die Folge davon,
  dass gegen das FESTE Budget normiert wird und nicht gegen das tatsächlich
  Ausgegebene.

### ⭐ L3 — Schutz, ohne Punkte zu erfinden

Die naheliegende Fassung („dein schlechtester Spieltag zählt mindestens X")
**erzeugt Punkte aus dem Nichts** und verletzt die Regel aus `ereignisse.js`.
Deshalb die andere Bauart, die nichts erschafft:

**Das Streichresultat wird vom Automatismus zur Spielerentscheidung.**
`saisonform.js` kann Streicher bereits — heute wählt sie das System (die n
schlechtesten). Neu: `streichModus: "automatisch" | "joker"`. Bei `joker`
entscheidet der Spieler selbst, welchen Spieltag er streicht, und verbraucht
dafür einen Joker.

Das ist punkteneutral, nutzt vorhandene, getestete Mechanik, und ist als
Entscheidung viel interessanter als die automatische Variante — man muss
abschätzen, ob noch ein schlechterer Spieltag kommt. `vorlaeufig` in
`anwenden()` sagt heute schon genau das.

⚠️ `nurGetippte` gilt weiter: ein ausgelassener Spieltag ist kein Ausrutscher.

### ⭐ L5 — Dämpfer statt nur Aufschlag

Die additive Fassung trägt das schon: `totalModifier` bildet `1 + Σ Aufschläge`.
Ein **negativer** Aufschlag fügt sich ein, ohne die Mechanik zu ändern.

Was fehlt, ist die Untergrenze. `modCap` deckelt nach oben; nach unten gibt es
nichts, und ein Spiel könnte auf 0 oder darunter fallen — ein richtiger Tipp
würde bestraft.

- Neu: **`modFloor`** als Geschwister von `modCap` (Vorgabe 0,25).
- ⚠️ **Ein Dämpfer dreht nie ein Plus ins Minus.** Gleiche Familie wie
  `block.nurGewinn` beim Duell-Joker.
- Betroffen: `teamMods.teams` (Faktor unter 1 erlauben) und
  `wettbewerbGewicht` (Liga-Gewicht unter 1).

**Nebeneffekt, der es besonders lohnend macht:** „nur das Interessanteste zählt"
lässt sich damit ausdrücken, ohne Spiele aus der Runde zu werfen. Ein gedämpftes
Spiel bleibt tippbar und zählt nur weniger — das ist fast immer besser als der
Filter in `spielauswahl.js`, der es ganz verschwinden lässt.

### L4 — Ansage-Joker

Vor Anpfiff ansagen: „dieses Spiel treffe ich exakt."
- Trifft man → Aufschlag auf die ohnehin fällige Exakt-Wertung.
- Trifft man nicht → fester Abzug (`einsatz`), unabhängig davon, wie knapp.

Punkteneutral kalibrierbar, weil die Quote den fairen Preis liefert: der
Aufschlag ist die Gegenwahrscheinlichkeit des Abzugs. Baut vollständig auf der
vorhandenen `exakt`-Ebene von `scoreTip` auf, braucht keine neue Wertungslogik —
nur einen Eintrag am Tipp und die Auswertung im Verlauf.
Sichtbarkeit über `JOKER_BASIS.sicht`: öffentlich angesagt ist die halbe Miete.

### L6 · L10 · L11 — kurz

- **L6 Frühtipp-Bonus:** `tippfenster.js` kennt Öffnungszeit und Anpfiff, der
  Tipp trägt seinen Zeitstempel. Bonus als Anteil der verstrichenen
  Fensterzeit. **Rettet den Frühtipp-Gedanken aus dem verworfenen L1, ohne die
  Quote anzufassen.**
- **L10 Kopier-Joker:** Tipp eines Mitspielers übernehmen, sichtbar erst nach
  Anpfiff. Kein Punkte-Transfer, also harmlos — die freundliche Ergänzung zum
  Klau-Joker auf derselben Achse D.
- **L11 Serien-Joker:** `ereignisse.js` kennt Serien schon als AUSLÖSER; hier
  ist die Serie selbst der Multiplikator. Deckel über `maxErspielt`-Muster.

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
