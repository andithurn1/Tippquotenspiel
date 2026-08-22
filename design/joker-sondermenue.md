# Joker-Sondermenü — was alles einstellbar ist und wie es geordnet wird

**Angelegt 22.08.2026** auf Andis Auftrag: *„mach erstmal ne Übersicht, welche
ganzen einzeln einstellbaren Sachen du einbringen wirst, und wie diese für eine
gute Übersichtlichkeit bzw. Nutzerfreundlichkeit strukturiert wird."*

🔴 **Erst der Bestand, dann der Vorschlag.** Alles unten Gelistete ist aus dem
Regelwerk gezogen, nicht erfunden — **84 Einzelwerte** in sechs Blöcken.

---

## 0 · Zwei Befunde vorweg

**Es gibt heute drei Joker-Wirkprinzipien, nicht eines:**

| Art | Wirkprinzip | Wer entscheidet |
|---|---|---|
| **Gesetzter Joker** | Der Tipper hebt Spiele hervor — als einzelner Joker, als verteilte Wichtigkeit oder als Münz-Einsatz | der TIPPER, je Spieltag |
| **Heimatbonus** | Spiele des eigenen Vereins zählen mehr | niemand — greift passiv |
| **Mut-Bonus** | Zahlt, wenn gegen den Favoriten getippt wurde UND es aufgeht | niemand — greift passiv |

Dazu zwei Nachbarn, die eigene Blöcke sind, aber in denselben Topf zahlen:
**Duell-Joker** (Klauen/Blocken gegen Mitspieler) und das **Drehrad**.

🔴 **Der Shop existiert bereits — und zwar genau da, wo Andi ihn haben will.**
`budget` ist der Narren-Shop: Zufluss, Takt, Verfall, Preise. Er ist im
**Budget-Modus abgeschaltet** (`jokerBudget.js`: „Modus einsatz ODER kein
Budget aktiv: kein Narren-Kauf möglich") und läuft **in der reinen
Quotenversion**. Andis Wunsch ist also erfüllt, nur andersherum als gedacht:
nicht „auch bei Quoten", sondern „NUR bei Quoten".

⚠️ **Das ist eine offene Frage, keine Feststellung:** soll der Shop im
Budget-Modus wirklich aus bleiben? Der Grund dafür ist gut — zwei Währungen,
die beide Joker bezahlen, wären zwei Wahrheiten über dieselbe Frage. Aber es
ist eine Entscheidung, die Andi kennen sollte.

---

## 1 · Der Bestand: 84 Einzelwerte

### `joker` — die Grundeinstellung (22)

| Feld | Was es tut |
|---|---|
| `enabled` | Gibt es überhaupt Joker? |
| `modus` | Ein Joker · Wichtigkeit verteilen · Münz-Einsatz |
| `faktor` | Stärke beim einzelnen Joker |
| `faktoren` | Der Stufen-Pool beim Verteilen (2 · 1,5 · 1,2 · 1) |
| `abstimmung` | Die Runde stimmt ab, an welchen Spieltagen es Joker gibt |
| `einsatzProSpieltag` · `maxAnteilProSpiel` · `minAnteilProSpiel` · `skippenErlaubt` | Der Münz-Einsatz: Vorrat, Ober- und Untergrenze je Spiel, Aussetzen erlaubt |
| `einsatzTakt` · `einsatzTaktN` | **Wie oft** es Münzen gibt |
| `einsatzFenster.*` (4) | **In welchem Zeitraum** überhaupt |
| `heimat.enabled` · `heimat.faktor` | Heimatbonus |
| `mut.enabled` · `mut.faktor` | Mut-Bonus |
| `verteilung.modus` · `frequenz` · `sichtbarkeit` | Wie Joker ausgeschüttet werden |

### `budget` — der Shop (12)

`enabled` · `quellen` (wer wie viel bekommt) · `takt` · `n` · `fenster.*` (4) ·
`verfall` · `maxAnsparen` · `preisModus` · `steigerung`

⚠️ `preisModus` und `steigerung` sind die Shop-Preise: fester Preis oder
steigend, je gekauftem Joker.

### `jokerBasis` — die Form JE Joker-Art (18 je Art)

`wer` · `werWert` · `sicht` · `verfall` · `bedingung.minQuote` ·
`bedingung.maxQuote` · `bedingung.wettbewerbe` · `bedingung.phasen` ·
`widerruf` · `widerrufStunden` · `stapeln` · `symmetrie` · `bestand` ·
`kasseSichtbar` · **`abklingzeit`** · `umfang` · `spieleProEinsatz` · `wahl`

🔴 **Hier steckt Andis Cooldown** (`abklingzeit`) — und zwar je Joker-Art
einzeln, nicht global.

### `duell` — Joker gegen Mitspieler (20)

`typen` (klau/block) · Zeitfenster (5) · `anzahl` · `proSpieltag` ·
`sichtbarkeit` · `klau.anteil` · `klau.modus` · `block.restanteil` ·
`block.nurGewinn` · `block.beute` · `maxProSaison` · `zielWahl` ·
`maxProZiel` · `immun` · `konter` · `kosten`

### `drehrad` — Zufalls-Ausschüttung (12)

`felder` · `sperrfrist` · `frequenz` · `modus` · Zeitfenster (4) · `wer` ·
`werWert` · `maxPunkteProSaison`

### `limitKlassen` — Unterkontingente (frei viele)

Je Klasse: `mitglieder` · `proZeitraum` · `zeitraum` · `aktivierung`

---

## 2 · Der Vorschlag: fünf Fragen statt 84 Felder

🔴 **Die Ordnung folgt nicht dem Code, sondern der Frage, die ein Admin
stellt.** Heute liegen `joker`, `budget`, `jokerBasis`, `limitKlassen` und
`drehrad` als fünf getrennte Abschnitte nebeneinander — technisch richtig,
zum Bedienen falsch: „wann kommt ein Joker?" steht an drei Stellen.

**In der Hauptansicht bleibt EINE Zeile:**

```
Joker · an · Ein Joker · Faktor 1,5                              [aufklappen]
```

**Dahinter fünf Karten, in dieser Reihenfolge:**

### A · Welche Joker gibt es?
Die drei Wirkprinzipien als Schalter: gesetzter Joker (mit Art), Heimatbonus,
Mut-Bonus. Dazu Duell-Joker und Drehrad als eigene Zeilen mit eigenem
Untermenü.
→ `joker.enabled`, `modus`, `heimat.enabled`, `mut.enabled`, `duell.typen`

### B · Wie stark wirken sie?
→ `faktor`, `faktoren`, `heimat.faktor`, `mut.faktor`, `klau.anteil`,
`block.restanteil`, `einsatzProSpieltag`, `maxAnteilProSpiel`

### C · Woher kommen sie?
**Andis „wann werden sie ausgeschüttet".** Drei Wege nebeneinander, alle
einzeln zuschaltbar:
- **geschenkt** — `verteilung.modus`, `frequenz`, `sichtbarkeit`
- **gekauft** — der Shop: `budget.quellen`, `takt`, `preisModus`, `steigerung`,
  `verfall`, `maxAnsparen`
- **erspielt** — Drehrad und Ereignisse

### D · Wann gelten sie?
**Alles Zeitliche an EINER Stelle** — heute liegt es in vier Blöcken verstreut:
→ `einsatzFenster.*`, `budget.fenster.*`, `drehrad`-Fenster, `duell`-Fenster,
`abklingzeit` (Cooldown), `verfall`, `widerruf`, `sperrfrist`

### E · Wo sind die Grenzen?
→ `stapeln`, `maxProSaison`, `maxProZiel`, `immun`, `limitKlassen`,
`maxPunkteProSaison`, `bedingung.*` (nur bei diesen Quoten/Wettbewerben)

---

## 3 · Was die eine Ansicht bedienbar hält

⚠️ **Andis Bedingung:** *„weiterhin sollts so sein, dass man auch ohne viel
durchzulesen und alles einzeln einstellen muss."*

Drei Mittel, alle schon vorhanden:

1. **Jede Karte zeigt zugeklappt ihren Stand** („Woher: geschenkt alle 4
   Spieltage · Shop aus"). Wer nichts ändern will, liest eine Zeile.
2. **Die Voreinstellung setzt alle 84 Werte.** Aufklappen ist Kür.
3. **Der Teil-Code je Ebene** lädt einen fertigen Joker-Satz von jemand anderem.

---

## 4 · Offene Fragen an Andi

❓ **Shop im Budget-Modus:** aus lassen oder freigeben? (siehe Abschnitt 0)

❓ **Duell und Drehrad — eigene Zeile oder Karte F?** Sie sind Joker im weiteren
Sinn, haben aber eigene Fenster. Zusammen wird das Menü groß, getrennt sucht
man Zeitfenster an zwei Orten.

❓ **`jokerBasis` gilt heute für „standard"** — also alle Arten gleich. Soll
jede Joker-Art ihre eigene Form bekommen (18 Werte × Anzahl Arten), oder bleibt
es eine gemeinsame Grundform mit Ausnahmen?

---

# TEIL C · Weitere Joker-Arten

**Andi am 22.08.2026:** *„ich denke wir können einige mehr Joker bzw.
Wirkprinzipien reinbringen, mach mal ne Liste was dir noch einfällt … bspw.
Underdog-Joker … will ich noch ne Form von Steal-Joker oder
Trittbrettfahrer-Joker."*

⚠️ Gegliedert wie der Modifikatoren-Katalog: nach dem, **was ein Joker
braucht**, um überhaupt zu funktionieren. Alles hier ist mit vorhandenen Daten
baubar — steht ausdrücklich dabei, wo nicht.

🔴 **Der Unterschied zu einem Modifikator:** ein Joker kostet eine
ENTSCHEIDUNG. Ein Modifikator greift von allein; ein Joker muss gesetzt werden,
ist begrenzt und tut woanders weh. Wo diese Entscheidung fehlt, ist es kein
Joker, sondern ein Modifikator mit falschem Namen.

## Schon gebaut

| Joker | Wirkprinzip |
|---|---|
| **Gesetzter Joker** | Der Tipper hebt ein Spiel hervor (einzeln, verteilt oder per Münzen) |
| **Heimatbonus** | Spiele des eigenen Vereins zählen mehr — passiv |
| **Mut-Bonus** | Zahlt bei eingelöstem Tipp gegen den Favoriten — passiv |
| **Klau-Joker** | Nimmt einem Mitspieler einen Anteil seiner Punkte |
| **Block-Joker** | Wehrt einen Klau ab, behält einen Restanteil |

---

## Gegen den Markt

### J1 · Underdog-Joker
**Wirkprinzip:** Zählt NUR auf Spielen über einer Quotenschwelle.
⚠️ Andis Einwand stimmt: die Quote steckt schon in der Wertung. Der Unterschied
ist die **Verknappung** — man hat nur zwei davon, und sie zwingen zur Wahl,
welchem Außenseiter man wirklich traut.
`abQuote` · `faktor` · `anzahlProSaison`

### J2 · Bank-Joker
**Wirkprinzip:** Das Gegenteil. Nur auf klaren Favoriten, kleiner Aufschlag —
dafür **kein Abzug bei Fehltipp**. Der Joker für den, der führt.
`bisQuote` · `faktor` · `schuetztVorMalus`

### J3 · Alles-oder-nichts
**Wirkprinzip:** Doppelte Punkte bei exaktem Ergebnis, null bei allem anderen —
auch bei richtiger Tendenz.
`faktor` · `stufe` (was als Treffer gilt)

---

## Gegen Mitspieler

### J4 · Trittbrettfahrer  🔴 Andis Wunsch
**Wirkprinzip:** Man übernimmt den Tipp eines Mitspielers und bekommt einen
Anteil seiner Punkte.

⚠️ **Die Falle, die er lösen muss:** Tipps sind bis zum Anpfiff VERDECKT. Man
kann nicht abschreiben, was man nicht sieht. Es gibt zwei saubere Wege:

- **blind** — „ich nehme, was Lena tippt", festgelegt vor Abgabe, aufgelöst
  beim Anpfiff. Elegant: man setzt auf die PERSON, nicht auf den Tipp.
- **verzögert** — man kopiert den Tipp des letzten Spieltags auf den nächsten.

⚠️ **Es muss wehtun.** Ein Trittbrettfahrer ohne Preis ist eine Kopiermaschine:
der Beste wird zum Ziel aller, und die Runde tippt einmal. Mögliche Preise:
Anteil kleiner als 100 %, der Kopierte bekommt etwas ab, oder es kostet einen
eigenen Tipp.

`anteil` · `wer` (frei / nur vorne / nur hinten) · `blindOderVerzoegert` ·
`sichtbarFuerZiel` · `maxProSaison` · `kopierterBekommt`

### J5 · Schaden-Joker
**Wirkprinzip:** Man wettet, dass ein bestimmter Mitspieler an diesem Spieltag
UNTER seinem Schnitt bleibt. Trifft es zu, gibt es Punkte; sonst kostet es.
`einsatz` · `schwelle` · `maxProZiel`

### J6 · Immun-Joker
**Wirkprinzip:** Schützt einen Spieltag lang vor Klau und Schaden.
⚠️ Das Feld `duell.immun` gibt es schon — als ZAHL, nicht als setzbarer Joker.
`dauer` · `anzahlProSaison`

### J7 · Geschenk
**Wirkprinzip:** Einen eigenen Joker an einen Mitspieler abgeben.
⚠️ **Absprachen sind damit möglich** — zwei Spieler können sich gegenseitig
hochziehen. `nurAnHintere` entschärft das.
`wasAbgebbar` · `nurAnHintere` · `maxProSaison`

---

## Über die Zeit

### J8 · Streich-Joker
**Wirkprinzip:** Ein schlechter Spieltag wird nachträglich gestrichen.
⚠️ Verwandt mit `saisonform.streich`, aber als ENTSCHEIDUNG: man muss selbst
wählen, wann man ihn zieht — und weiß nicht, ob noch ein schlechterer kommt.
`anzahl` · `frist` (bis wann rückwirkend) · `nurEigene`

### J9 · Doppel-Spieltag
**Wirkprinzip:** Ein Spieltag zählt doppelt — Gewinn UND Verlust.
`faktor` · `nurAnkuendigen` (vorher festlegen, nicht danach)

### J10 · Aufhol-Joker
**Wirkprinzip:** Nur verfügbar, wenn man einen Mindestabstand zurückliegt.
⚠️ Nahe an `aufholen`, aber sichtbar und selbst gewählt statt automatisch —
das fühlt sich völlig anders an als eine stille Korrektur.
`abRueckstand` · `faktor` · `maxProSaison`

---

## Rund um die Tore

### J11 · Torschützen-Joker
**Wirkprinzip:** Verdoppelt nur den Torschützen-Teil, nicht das Ergebnis.
`faktor` · `nurEinName`

### J12 · Zu-Null-Joker
**Wirkprinzip:** Zahlt, wenn die getippte Null hält.
`seite` · `faktor`

---

## Nicht ohne neue Daten

**Quoten-Einfrieren** („ich nehme die Quote von Montag statt die von Freitag")
wäre reizvoll — verlangt aber mehrere Schnappschüsse je Spiel über die Zeit.
Heute wird genau EINER eingefroren, 45 Minuten vor Anpfiff.

---

## Was für ALLE neuen Arten gilt

Jede Art erbt die Grundform (`jokerBasis`, 18 Werte) — darunter **Abklingzeit**,
Verfall, Widerruf, Stapeln, Sichtbarkeit und die Bedingung, auf welchen Quoten
und Wettbewerben sie überhaupt greift. **Diese 18 müssen nicht je Art neu
erfunden werden**; das ist der ganze Zweck der Grundform.

❓ Offen bleibt die Frage aus Teil B: gilt die Grundform weiter für alle
gemeinsam, oder bekommt jede Art ihre eigene?

---

# TEIL D · FREMDJOKER — Eingriffe in fremde Tipps

🔴 **Der Name steht seit 22.08.2026 fest: Fremdjoker** (Andi). Er umfasst
**Block · Trittbrettfahrer · Gegenwette · Klau** — jeden Joker, der in den Tipp
eines anderen greift. Begriff im `vokabular.md`.

**Andi am 22.08.2026:** *„finde die generelle Option interessant und spassig,
bei anderen Tippern oder Freunden reinzugehen und eben nen einzelnen Tipp, den
man selber für gut findet, für den anderen zu blocken oder selber davon
mitzuprofitieren oder auch dagegen zu wetten."*

🔴 **Das ist eine eigene Familie, kein einzelner Joker.** Drei Handlungen auf
DENSELBEN fremden Tipp, dazu eine Schutzschicht darüber.

## Die drei Handlungen

| | Was man tut | Konsequenz-Optionen |
|---|---|---|
| **Blocken** | Der fremde Tipp zählt nicht oder weniger | Restanteil (0 … 100 %) · nur bei Gewinn oder auch bei Verlust · Beute für den Blocker |
| **Mitprofitieren** | Man hängt sich an den Tipp und bekommt einen Anteil | Anteil · ob der Kopierte etwas abbekommt oder verliert |
| **Dagegen wetten** | Man setzt darauf, dass der Tipp NICHT aufgeht | Einsatz · Auszahlung bei Erfolg · Verlust bei Irrtum |

⚠️ **Blocken und Mitprofitieren gibt es halb schon** (`duell.klau`,
`duell.block` samt `restanteil`, `nurGewinn`, `beute`). Neu ist, dass sie sich
auf **einen einzelnen TIPP** richten statt auf den ganzen Spieltag — und dass
„dagegen wetten" als dritte Handlung dazukommt.

## 🔴 Andis eigentliche Anforderung: es muss VORHER sichtbar sein

Sein Beispiel: *„hey du Arschloch, nimm den Block bei mir fürs Bayern-Spiel
raus, ich habe da ein zu gutes Gefühl."*

**Damit dieses Gespräch überhaupt stattfinden kann, müssen drei Dinge gelten:**

1. **Der Eingriff ist sichtbar, bevor die Frist läuft.** Ein Block, den man erst
   hinterher sieht, erzeugt Ärger statt Austausch.
2. **Er ist zurücknehmbar.** Ohne das ist die Bitte sinnlos — der andere KANN
   ihn gar nicht rausnehmen.
3. **Man sieht, WER es war.** Anonym gibt es niemanden, den man ansprechen kann.

⚠️ **Das ist keine Feinheit, sondern der ganze Zweck.** Andi will damit
Tischgespräche und Mundpropaganda anregen. Ein Eingriff, der still im
Hintergrund verrechnet wird, leistet davon nichts — er ist dann nur eine
Punkteverschiebung.

Die Felder dafür gibt es: `duell.sichtbarkeit` (offen/verdeckt) und
`jokerBasis.widerruf` (bis Anpfiff / N Stunden vorher / gar nicht).
**Voreinstellung für diese Familie: offen und widerrufbar.**

## 🔴 Fremdjoker treffen EINZELNE SPIELE — und was das mit den Gewichten macht

**Andi am 22.08.2026:** *„also alle Fremdjoker nur für einzelne Spiele. Gut,
problematisch ist halt dann, wenn das Standard-Preset manche Spiele wie CL als
höher bewertet … dass der Preis im Joker-Shop dementsprechend höher wäre?
Solche Fremdjoker nur, wenn alle Spiele gleich viel zählen? Oder kennst du eine
andere Vereinbarkeit?"*

**Er hat das Problem genau getroffen.** Sobald ein Fremdjoker auf EIN Spiel
geht, ist sein Wert = Anteil × Punkte des Opfers auf diesem Spiel. Und diese
Punkte hängen an drei sehr verschiedenen Dingen:

| Woran | Bekannt wann? | Für alle gleich? |
|---|---|---|
| **Rundenweites Gewicht** (CL, Derby, Big Game, Liga-Aufschlag) | vorher | ja |
| **Joker des Opfers** auf diesem Spiel | erst nach dessen Abgabe | nein |
| **Wie gut das Opfer getippt hat** | erst nach Anpfiff | nein |

Das dritte ist das Spiel selbst — die gesunde Unsicherheit, die bleiben soll.
Das zweite ist längst entschieden (Teil E, 22.08.: „nicht durch Ereignisse oder
selbst gewählte Joker"). **Übrig bleibt genau das erste, und das ist seine
Frage.**

⚠️ **Warum es wirklich stört, in einem Satz:** wenn das schwerste Spiel auch das
lohnendste Ziel ist, gibt es keine Zielwahl mehr, sondern eine Rechenaufgabe
mit bekannter Lösung. Alle gehen auf dasselbe Spiel — und ein Fremdjoker, den
alle gleich einsetzen, ist kein Spielzug.

### 🔴 ENTSCHIEDEN (Andi, 22.08.2026): die WIRKUNG normieren, nicht den Preis

*„ja mach so wie du meinst, und ja auch Gegenwette wie du sagst."* — gebaut in
`punkteJeSpiel` (`grundwert`) und `applyDuellJoker`; fünf Tests in
`duellJoker.test.js`, darunter der entscheidende: **dasselbe Spiel ist als Ziel
gleich viel wert, ob es mit oder ohne CL-Aufschlag läuft.**

**Ein Fremdjoker rechnet auf dem Wert des Spiels OHNE die rundenweiten
Gewichte** — also so, als zählten alle Spiele gleich viel. Technisch: der
Angriff greift auf `wert / gewichtsFaktor(spiel)`.

Vier Gründe, warum das die sauberste der vier Lösungen ist:

1. **Es beseitigt die Ursache, statt sie zu bepreisen.** Ein CL-Spiel ist als
   Ziel nicht mehr attraktiver als ein Ligaspiel — die Konzentration entsteht
   gar nicht erst.
2. **Das Gewicht bleibt beim Opfer, wo es hingehört.** Die CL zählt für den
   Tipper weiterhin mehr. Nur der ANGREIFER profitiert nicht davon — und das
   ist genau richtig: das Gewicht ist eine Aussage über die Wichtigkeit des
   Spiels, keine Belohnung fürs Zuschlagen.
3. **Kein neuer Regler, kein Verbot, kein Hinweis-Text nötig.** Die Kombination
   „Fremdjoker + ungleiche Gewichte" bleibt erlaubt und ist trotzdem rund.
4. **Der Zeitpunkt bleibt egal** (Andis Grundsatz vom 22.08.): niemand muss
   früh tippen, um sich das fetteste Ziel zu sichern.

### Die drei anderen Wege, und warum sie nicht die Grundmechanik werden

**Preis nach Gewicht** (Andis erste Idee) — *als Option ja, als Grundregel
nein.* Der Preis wird bezahlt, BEVOR feststeht, was der Angriff bringt: der
größte Teil der Streuung kommt daher, wie gut das Opfer getippt hat, und die
kennt beim Kauf niemand. Ein Preis nach Gewicht bepreist also den kleineren
Teil und fühlt sich trotzdem wie eine Strafe an. Dazu macht er den Shop zur
Buchhaltung („billig für Liga, teuer für CL"). **Als Schalter
`kostenNachGewicht` für Admins, die genau das wollen: sinnvoll.**

**Nur bei Gleichgewichtung erlauben** (Andis zweite Idee) — *nein, aber als
WARNUNG.* Ein Verbot widerspricht dem Baukasten-Grundsatz („will ein Admin
etwas Unbalanciertes, soll er es haben"). Richtig ist eine Meldung in
`reglerWarnung.js`: „Fremdjoker + ungleiche Wettbewerbs-Gewichte, ohne
Normierung: die schweren Spiele werden zum einzigen Ziel" — mit der Korrektur
daneben. Das ist dieselbe Bauart wie die anderen Kombinationsregeln dort.

**Deckel je Einsatz** — *sinnvolle Ergänzung, keine Alternative.* Ein
`maxProEinsatz` (was ein einzelner Fremdjoker höchstens holen kann) begrenzt
JEDE Streuung, auch die aus dem Tippglück. Es gibt bereits `maxProSaison` als
Punkte-Deckel; das hier wäre die kleine Schwester. Nimmt aber die Konzentration
nicht weg, sondern kappt sie nur oben — deshalb zusätzlich, nicht stattdessen.

### ❓ Eine Folgefrage, die Andi entscheiden muss

**Gilt die Normierung auch für die GEGENWETTE?** Seine Entscheidung vom
22.08.2026 sagt: Standard-Modifikatoren (Außenseiter, Derby, Spitzenspiel,
Liga-Gewicht, Tabellen-Bonus) zählen für die Gegenwette MIT. Die Gewichte
waren dabei nicht die Frage — es ging um Joker und Ereignisse.

Konsequent wäre, die ganze Familie gleich zu behandeln: dann fielen die
Gewichte auch bei der Gegenwette heraus. **Dagegen spricht ein guter Grund:**
die Gegenwette reguliert sich über die Gegenquote `1/(1−p)` bereits selbst —
gegen einen fetten Tipp zu wetten ist teuer. Blocken und Klauen tun das nicht.

Beides ist vertretbar. Solange nichts entschieden ist, wird gebaut, was
dasteht: Gegenwette MIT Standard-Mods, Block/Klau/Trittbrettfahrer OHNE.

## 🔴 Geschützte Spiele — der Tipper wehrt sich (Andi, 22.08.2026)

Wörtlich: *„dass die Option für jeden Tippabgeber besteht, ausgewählte Spiele
für jeden Spieltag vor jedem Fremdjoker zu schützen (weil man die halt evtl
selber live verfolgen will, und's deswegen blöd wäre)."*

🔴 **Das ist die erste Schutzregel, die dem SPIELER gehört und nicht dem
Admin.** Alles andere in diesem Abschnitt — `maxProZiel`, `immun`, `zielWahl`,
`sperrfristJeZiel` — stellt der Admin für alle ein. Hier entscheidet jeder für
sich, und zwar aus einem Grund, den keine Regel kennen kann: an welchem Spiel
sein Abend hängt.

**Der Zweck ist nicht Fairness, sondern der Abend.** Wer Samstag im Stadion
sitzt oder mit Freunden vor dem Spiel hockt, will nicht erleben, dass genau
dieses Spiel ihm weggeblockt wurde. Ein Fremdjoker, der das trifft, nimmt keine
Punkte weg, sondern den Spaß — und dann schaltet die Runde die ganze Familie ab.
Der Schutz ist damit die Bedingung dafür, dass Fremdjoker überhaupt
eingeschaltet bleiben.

### Die Vorlage, ausgefüllt

```
Name          Geschütztes Spiel
Ebene         6 (Ökonomie — worauf ein Einsatz überhaupt wirken darf)
Hängt an      Tipp (ein Spiel, ein Spieltag, ein Spieler)
Steht fest    beim Tippen — dieselbe Frist wie der Tipp selbst
Wirkt als     Auswahl — ein geschütztes Spiel ist für Fremdjoker unsichtbar
Deckel        `schutzProSpieltag` (wie viele Spiele je Spieltag)
Entscheidet   der SPIELER (Admin stellt nur die Anzahl ein)
Stufe         3 für die Anzahl; die Wahl selbst gehört in die Tippabgabe
Anzeige       Schild-Marke am Spiel, in der eigenen Tippliste
Einstellwerte schutzProSpieltag · schutzSichtbar
```

**Zwei Einstellwerte, mehr nicht.** `schutzProSpieltag: 0` schaltet den Schutz
ab (dann ist alles angreifbar), 1 ist die naheliegende Vorgabe.

⚠️ **Die Zahl ist die ganze Balance-Frage, und sie gehört dem Admin:** bei
„alle Spiele schützbar" gibt es keine Fremdjoker mehr. Deshalb ein Kontingent
je Spieltag, kein Häkchen je Spiel.

⚠️ **Der Schutz muss VOR der Frist stehen und danach fest sein** — sonst
schützt man nach, sobald man einen Angriff kommen sieht. Dieselbe Kante wie der
Tipp selbst (Anpfiff), damit der Zeitpunkt der Abgabe egal bleibt.

### ❓ Was noch zu klären ist

1. **Sieht der Angreifer den Schutz?** Offen liegt näher: ein Fremdjoker, der
   an einem geschützten Spiel wirkungslos verpufft, verbrennt einen Einsatz für
   nichts — das fühlt sich nach Willkür an. Sichtbar heißt aber auch: der
   Angreifer weiß, welches Spiel dir wichtig ist. (`schutzSichtbar`)
2. **Was passiert mit einem Fremdjoker, der auf ein geschütztes Spiel gesetzt
   wurde?** Verfällt er, oder kommt er zurück ins Kontingent? Bei sichtbarem
   Schutz kann man ihn zurückgeben, bei verdecktem wäre das ein Hinweis.

## Die Schutzschicht

**Andi:** *„Option zu Cooldowns, dass einzelne nicht von allen und immer
regelmäßig getroffen werden können."*

Ohne sie wird der Beste zum Ziel aller — oder der Schwächste zum Opfer. Vier
Regler, davon drei schon vorhanden:

| Regler | Was er verhindert | Stand |
|---|---|---|
| `maxProZiel` | Dass einer mehrfach im selben Zeitraum getroffen wird | ✅ da |
| `sperrfristJeZiel` | Dass DERSELBE jemanden wieder und wieder trifft | ⏳ neu |
| `immun` | Erholung nach einem Treffer | ✅ da |
| `zielWahl` | frei · nur nach vorn · nur nach hinten | ✅ da |
| `zielWahl: ausgelost` | Dass man sich sein Opfer überhaupt aussucht — die vierte Stufe, siehe oben | ⏳ neu |

⚠️ **`sperrfristJeZiel` ist der neue und der wichtigste.** `maxProZiel` begrenzt
nur, wie oft jemand insgesamt getroffen wird — nicht, ob es immer derselbe
Gegner ist. Genau das meint Andi mit „nicht von allen und immer regelmäßig".

## 🔴 Das ausgeloste Ziel — Andis Ansage vom 22.08.2026

Wörtlich: *„dass man eine fest ausgeloste Person bekommt und eben nur bei
dieser Person, man kann sich also sein Opfer nicht genau aussuchen, aber muss
eben bei seiner Tippabgabe schauen, bei welchem Einzelspiel man den jeweiligen
Joker einsetzt. Die Option dazu halt."*

**Die Entscheidung wird verschoben, nicht weggenommen.** Wer sein Ziel frei
wählt, entscheidet ÜBER WEN; wer ein Los bekommt, entscheidet WO — bei welchem
Einzelspiel des Zugelosten der Fremdjoker sitzt. Es bleibt genau eine
Entscheidung, und sie fällt bei der Tippabgabe.

**Drei Dinge, die diese Option von allein löst** — deshalb ist sie mehr als ein
weiterer Regler:

1. **Kein Rudelbilden.** Bei freier Wahl gehen alle auf den Führenden; das ist
   heute schon in `reglerWarnung.js` als Kombinationsregel vermerkt und wird
   bisher nur GEMELDET. Ein Los macht es unmöglich statt es zu bemängeln.
2. **Niemand wird zum Dauer-Opfer.** Genau der Zweck, den `sperrfristJeZiel`
   (JK5) mit einer Sperre erreichen will — das Los braucht dafür keine Sperre.
3. **Der Zeitpunkt bleibt egal.** Andis Grundsatz vom 22.08.2026: wer zuletzt
   tippt, sieht bei freier Wahl, wer noch frei ist. Ein Los, das vor dem
   Spieltag gezogen wird, kennt diesen Vorteil nicht.

### Die Vorlage, ausgefüllt (`vokabular.md`)

```
Name          Ausgelostes Ziel
Ebene         6 (Ökonomie — „gegen wen darf eingesetzt werden")
Hängt an      Spieler (das Los) + Tipp (das gewählte Einzelspiel)
Steht fest    das LOS beim Öffnen des Spieltags · das SPIEL beim Tippen
Wirkt als     Auswahl — die Wirkung des Fremdjokers bleibt unverändert
Deckel        keiner neu; maxProZiel/immun/modCap gelten weiter
Entscheidet   System/Los (das Ziel) · Spieler (das Spiel)
Stufe         3, je Fremdjoker — Vorgabe „frei", damit sich für bestehende
              Runden nichts ändert
Anzeige       bei der Tippabgabe: „Dein Ziel diesen Spieltag: Lena"
Einstellwerte zielModus (frei | ausgelost) · losTakt · losSichtbar
```

**Drei Einstellwerte, nicht mehr** — und `zielModus` ist streng genommen die
vierte Stufe des vorhandenen `duell.zielWahl` (frei · nach vorn · nach hinten ·
**ausgelost**). Die anderen beiden sind neu.

🔴 **Je Fremdjoker einzeln** (Andis Ansage): der Block darf ausgelost sein,
während der Trittbrettfahrer frei bleibt. Bauform ist die vorhandene aus
`jokerBasis` — ein Standard oben, Abweichung je Art. Kein zweites Muster.

### ❓ Was Andi noch entscheiden muss

Fünf Fragen, die sich aus seinem Satz NICHT beantworten lassen. Ich rate sie
bewusst nicht — bitte direkt hier darunter antworten:

1. **Wie oft wird neu ausgelost?** Je Spieltag neu · einmal für die ganze
   Saison · nach jedem Einsatz. *(„fest ausgelost" klingt nach selten, aber
   eine Saison lang derselbe Gegner trifft dieselbe Person 34-mal.)*
2. **Gegenseitig oder einseitig?** Wenn ich Lena ziehe — zieht Lena dann
   automatisch mich (ein Paar, ein Duell), oder ist mein Los unabhängig von
   ihrem?
3. **Sieht man sein Los, und sieht das Ziel es auch?** JK6 verlangt, dass ein
   Eingriff vor der Frist sichtbar ist. Gilt das schon fürs LOS („Lena hat dich
   diesen Spieltag") oder erst für den gesetzten Joker?
4. **Was, wenn das Los nicht tippt?** Die zugeloste Person gibt keinen Tipp ab
   oder hat kein gemeinsames Spiel — verfällt der Fremdjoker, oder darf man
   ersatzweise frei wählen?
5. **Ein Los für alle Fremdjoker oder je Fremdjoker ein eigenes?** Bei
   getrennten Losen könnte man denselben Spieltag drei verschiedene Personen
   treffen.

⚠️ Frage 4 ist die einzige, die BAUEN blockiert — die übrigen vier haben eine
naheliegende Vorgabe, die sich später ändern lässt.

## Für wen das gedacht ist

**Andis eigene Einordnung:** *„bei hoch seriösen Tipprunden, bspw. auf Arbeit,
wird das wohl nicht greifen, aber bei Freundschaftsgruppen finde ich das lustig
und macht nen coolen Austausch."*

⚠️ Daraus folgt eine Anforderung an die VOREINSTELLUNGEN, nicht an die Mechanik:
die ganze Familie muss **in einem Griff aus- und einschaltbar** sein. Eine
Büro-Runde darf davon nichts sehen; eine Freundesrunde schaltet sie mit einem
Klick zu. Ein Feld `eingriffe.enabled` über allem, nicht sechs einzelne Häkchen.

## Offene Fragen

❓ **Kostet ein Eingriff etwas?** Ein Block, der nichts kostet, wird bei jedem
Spiel gesetzt. Möglich: eigener Joker-Bestand, Narren, oder das Risiko, selbst
Punkte zu verlieren, wenn der geblockte Tipp aufgeht.

❓ **Darf man auf denselben Tipp mehrere Handlungen legen?** Zwei Leute blocken,
einer profitiert mit — die Rechnung wird schnell unübersichtlich.

❓ **Was sieht der Betroffene genau?** „Lena blockt dein Bayern-Spiel" ist die
Grundlage des Gesprächs. „Jemand blockt eines deiner Spiele" wäre es nicht.

---

# TEIL E · Dagegen wetten — das umgekehrte Modell

**Andi am 22.08.2026:** *„beim Dagegenwetten brauchen wir ja ein umgekehrtes
Modell anhand der Quoten, um auszuwerten, wie sehr man belohnt wird."*

## Die Formel

Ein Tipp hat eine Wahrscheinlichkeit `p`, richtig zu sein — sie steckt bereits
in der Quote. Wer dagegen wettet, gewinnt mit `1 − p`. Die faire Gegenquote ist
also schlicht:

```
Gegenquote = 1 / (1 − p)
```

**Dieselbe Rechnung, nur die Gegenwahrscheinlichkeit.** Es braucht kein zweites
Modell und keine neue Datenquelle — `winner` und `correctScore` liegen im
Schnappschuss.

## Gerechnet an einem echten Spiel

Köln – Bayern, Quoten 5,20 · 4,74 · 1,50:

| Tipp, gegen den gewettet wird | P(richtig) | P(falsch) | faire Gegenquote |
|---|---|---|---|
| Tendenz Auswärtssieg | 66,7 % | 33,3 % | **3,00** |
| Tendenz Remis | 21,1 % | 78,9 % | 1,27 |
| Tendenz Heimsieg | 19,2 % | 80,8 % | 1,24 |
| Ergebnis 1:2 | 10,5 % | 89,5 % | 1,12 |
| Ergebnis 0:1 | 8,7 % | 91,3 % | 1,10 |
| Ergebnis 4:1 | 0,5 % | 99,5 % | **1,01** |

🔴 **Das Modell reguliert sich selbst.** Gegen einen Favoritentipp zu wetten ist
ein echtes Wagnis und zahlt dreifach. Gegen ein exaktes 4:1 zu wetten gewinnt
man fast immer — und bekommt dafür ein Prozent. Niemand muss eine Regel gegen
das Abgrasen sicherer Wetten schreiben; die Quote erledigt es.

## ⚠️ Drei Fallen, die das kaputtmachen würden

### 1. `minPayout` hebt die Kleinstbeträge an
Das Regelwerk hat einen **Mindestertrag** (`minPayout`, Vorgabe 1). Läuft die
Gegenwette durch dieselbe Wertung, würden aus 1,01 plötzlich volle Punkte —
und das Abgrasen wäre wieder lohnend. **Die Gegenwette muss von `minPayout`
ausgenommen sein.**

### 2. Ohne EINSATZ ist auch 1,01 ein Geschenk
Ein Gratis-Bonus von 1 % bei 99,5 % Trefferquote ist auf Dauer sicherer
Gewinn. Die Lösung liegt in Andis eigenem Wort „wetten": **man setzt etwas
ein.** Wer gegen ein 4:1 wettet, riskiert 100 Punkte, um 1 zu gewinnen. Damit
ist die Sache von allein uninteressant — und braucht keine Sperre.

### 3. Die Genauigkeitsstufe entscheidet alles
Gegen „Tendenz" zu wetten ist etwas völlig anderes als gegen „exaktes
Ergebnis" — 33 % gegen 99,5 %. **Die Stufe muss festgelegt sein**, sonst
verhandelt sie jeder anders. Vorschlag: die Gegenwette gilt auf derselben
Stufe, auf der die Runde wertet.

## Was noch zu entscheiden ist

❓ **Auf welche Punkte bezieht sie sich?** Ein Tipp kann Joker und Modifikatoren
tragen. Bezieht sich die Gegenwette auf die ROHEN Punkte oder auf die
verstärkten? Auf die verstärkten wäre reizvoll: dann wird ein gejokertes Spiel
zum Ziel, und der Joker bekommt ein soziales Risiko.

❓ **Nullsumme oder Nebenwette?** Nimmt der Gewinner dem anderen die Punkte weg
(wie `klau.modus: nullsumme`), oder bekommt er sie aus dem Topf und der
Getippte verliert nichts? Das erste ist schärfer, das zweite verträglicher.

❓ **Sieht der Betroffene es vorher?** Für Andis Tischgespräch ja — dann kann er
auch nachlegen. Verdeckt wäre es ein Hinterhalt.

## 🔴 ENTSCHIEDEN: worauf sich die Gegenwette bezieht (Andi, 22.08.2026)

*„nur verstärkt durch Standard-Spieleinstellungs-Mods und nicht durch
Ereignisse oder selbst gewählte Joker."*

| | zählt für die Gegenwette |
|---|---|
| Grundpunkte aus der Quote | ✅ |
| ~~Standard-Modifikatoren~~ (Außenseiter, Derby, Spitzenspiel, Liga-Gewicht, Tabellen-Bonus) | ⛔ **seit 22.08.2026 (II)** |
| Selbst gesetzte Joker | ⛔ |
| Ereignisse und Drehrad | ⛔ |

🔴 **NACHTRAG, Andi am 22.08.2026 (II): auch die Standard-Modifikatoren fallen
raus** — „und ja auch Gegenwette wie du sagst". Damit gilt für die ganze
Fremdjoker-Familie DIESELBE Rechengrundlage: der **Grundwert**, also die nackte
Quoten-Wertung des Tipps ohne jeden Aufschlag.

**Warum die Kehrtwende:** die erste Fassung dieser Tabelle beantwortete nur die
ZEITPUNKT-Frage (ein selbst gesetzter Joker macht den Wert davon abhängig, wann
das Opfer tippt). Die Gewichte waren dabei nicht im Blick. Sie werfen aber ein
zweites Problem auf, das die Zeitpunkt-Regel nicht löst: wenn das schwerste
Spiel auch das lohnendste Ziel ist, gehen alle auf dasselbe Spiel.

⚠️ **Eine Regel statt einer Ausschlussliste.** „Der Grundwert" bleibt richtig,
wenn morgen ein neuer Modifikator dazukommt — eine Liste müsste nachgepflegt
werden und würde es irgendwann nicht.

**Die Begründung ist ein Grundsatz, kein Sonderfall:** *„generell ist es mir
wichtig, dass der Zeitpunkt der Tippabgabe und Jokerauswahl möglichst
unwesentlich ist."* Bezöge sich die Gegenwette auf gejokerte Punkte, hinge ihr
Wert davon ab, WANN das Opfer seinen Joker setzt — und wer zuletzt tippt,
entkäme oder liefe hinein. Genau das soll es nicht geben.

⚠️ **Damit fällt meine eigene Idee von vorhin weg**, den Joker mit einem
sozialen Risiko zu belegen. Sie war reizvoll, verstößt aber gegen den
Grundsatz: sie hätte den Zeitpunkt der Jokerwahl entscheidend gemacht.

⚠️ **Praktische Folge:** die Gegenwette braucht eine Punktzahl OHNE Joker und
Ereignisse. Die gibt es schon in ähnlicher Form — `projectTip` liefert bereits
`pointsOhneSchuetzen` nach demselben Muster: dieselbe Rechnung, ein Teil
weggelassen.
