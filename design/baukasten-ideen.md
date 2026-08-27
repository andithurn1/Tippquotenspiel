# Was dem Baukasten aus meiner Sicht noch fehlt

**Angelegt 27.08.2026 auf Andis Frage:** *„fällt dir selber noch was ein zu
unserem Prinzip des optimalen Baukastens, mit guter Führung und Code austausch
für Tippspielrunden mit Quotenableitung und Auswertung"*

⚠️ **Das hier sind MEINE Vorschläge, nicht seine Aufträge.** Nichts davon ist
gebaut, nichts davon wird ohne Ansage gebaut. Jeder Punkt nennt, was es heute
schon gibt — sonst schlage ich etwas vor, das seit Wochen läuft.

🔴 **Ein Maßstab vorweg, an dem ich sie sortiert habe:** dieser Baukasten hat
201 Einstellungen. Der Engpass ist längst nicht mehr, was man einstellen KANN,
sondern ob jemand versteht, was er gerade tut, und ob er es weitergeben kann.
Alle Vorschläge unten zielen auf diese beiden Dinge — keiner fügt eine
Einstellung hinzu.

---

## 1 · 🔴 Der Regelwerk-Vergleich in Menschensprache

**Die Lücke.** Beim Code-Austausch ist die entscheidende Frage: *„was ist an
diesem Code anders als an meinem?"* — und die kann heute niemand beantworten.

**Was es gibt.** `unterschiede(a, b)` in `presetMerge.js` sagt, welche der
**12 Aspekte** sich unterscheiden. Das ist die Grobkarte für das Mischen
zweier Presets, und dafür genügt sie.

**Was fehlt.** Die Zeile darunter. „Joker unterscheidet sich" hilft nicht;
„bei dir 1 Joker je Spieltag, hier 3 — und sie kosten Münzen" schon. Also ein
Vergleich auf **Blatt-Ebene** (225 Felder), der die Unterschiede in Sätzen
ausgibt statt in Feldnamen.

**Warum ich es zuerst nenne.** Die Bausteine liegen alle da: `blattFelder()`
kennt jedes Blatt, die Regel-Kataloge tragen für fast jedes Feld schon einen
Beschreibungstext (`beschreibeSperre`, `beschreibeWirkung`, `beschreibeMix` …).
Es fehlt die Klammer, nicht die Substanz.

⚠️ **Der Haken:** 225 Felder ergeben schnell eine Liste, die niemand liest.
Der Vergleich müsste nach **Wirkung** sortieren — was ändert am meisten? — und
das ist genau die Sortierung, die es ohne Balancing nicht sauber gibt. **Ein
Ausweg ohne Balancing:** nach Ebene sortieren (Wertung vor Auswahl vor
Anzeige) und den Rest hinter einer Klappe.

---

## 2 · 🔴 Der Probelauf: „so hätte der letzte Spieltag mit diesem Code ausgesehen"

**Die Lücke.** Ein Regelwerk ist heute eine Behauptung, bis der erste Spieltag
gelaufen ist. Wer einen fremden Code lädt, kauft die Katze im Sack.

**Was es gibt.** `AuszahlungsExplorer` zeigt, was EIN Tipp bringt.
`zusammenfassung()` zählt Spiele. `balanceSim.js` ist stillgelegt und bleibt es.

**Was fehlt — und warum es hier besonders stark wäre.** Diese App hat echte
Quoten und echte Ergebnisse. Man kann also einen **schon gespielten Spieltag
mit dem neuen Regelwerk neu ausrechnen** und beide Tabellen nebeneinander
legen: *„mit diesem Code hätte Lena statt dir gewonnen, weil ihr Außenseiter-
Tipp das Dreifache gebracht hätte."* Das ist keine Simulation mit erfundenen
Spielern — das sind eure echten Tipps.

⛔ **Abgrenzung zu Balancing, und sie ist scharf:** der Probelauf EMPFIEHLT
nichts und bewertet nichts. Er rechnet einen vorhandenen Spieltag mit
vorhandenen Tipps nach einer anderen Regel aus und zeigt beide Ergebnisse. Was
davon besser ist, sagt er nicht.

⚠️ **Er braucht mindestens einen gespielten Spieltag** — für eine frische
Runde bringt er nichts, und genau dort wird ein Code geladen. Ehrliche Antwort
darauf: dann eben mit einem Beispiel-Spieltag aus dem Katalog.

---

## 3 · Die Herkunft eines Regelwerks — eine Ahnentafel

**Die Lücke.** Ein Creator-Code ist heute ein anonymer Block. Man sieht nicht,
worauf er aufbaut.

**Was fehlt.** Jedes geteilte Regelwerk trägt zwei Zeilen mit: **von wem** und
**abgeleitet wovon**. „Basiert auf ‚Klassisch & fair‘, 4 Aspekte geändert" ist
in einem Satz erfasst — und es macht das Weitergeben zu etwas, das man sehen
kann.

**Warum das mehr ist als Kosmetik.** Es ist die Grundlage für M9
(Creator-Partnerschaften): wer sein Regelwerk verbreitet sieht, verbreitet es
weiter. Und es beantwortet dem Empfänger die Frage aus Punkt 1 zur Hälfte
schon, bevor er vergleicht.

⚠️ **Datenschutz-Kante:** „von wem" ist ein Name in einem Code, der herumgeht.
Freiwillig, abschaltbar, oder ein selbstgewähltes Kürzel — nicht die
Konto-Adresse.

---

## 4 · ✅ Was am geladenen Code in DEINER Runde gar nicht greifen wird · GEBAUT 27.08.2026

> **Gebaut** als `src/lib/greiftNicht.js`, sichtbar unter *Regeländerungen*.
> Acht Prüfungen, alle GEMESSEN an den echten Spielen der Runde statt
> nachgebaut. Die Probe an der Schaufenster-Runde findet genau einen Fall —
> und zwar denselben, den ein Mensch dort im August als Kommentar
> hinschreiben musste. 21 Tests.

**Die Lücke — und sie ist ein echter Fehler, kein Komfort.** Ein Code kann
Einstellungen enthalten, die in der empfangenden Runde **wirkungslos** sind:
Wettbewerbs-Gewichte in einer Ein-Ligen-Runde, K.-o.-Aufschläge ohne K.-o.-
Phase, Fremdjoker-Kontingente bei drei Mitspielern, Saison-Wetten mitten in
der Saison.

**Was es gibt.** `reglerWarnung.js` prüft das Regelwerk **gegen sich selbst**
(unstimmige Kombinationen). `engpaesse()` prüft die Spielauswahl.

**Was fehlt.** Die Prüfung des Regelwerks **gegen die konkrete Runde**: wie
viele Wettbewerbe, wie viele Leute, welcher Spieltag. Ein Bericht beim Laden:
*„3 Einstellungen greifen bei euch nicht — hier ist warum."*

**Warum das wichtig ist.** Genau hier entsteht der Eindruck „die App macht
nicht, was da steht". Der Admin stellt etwas ein, es passiert nichts, niemand
sagt ihm warum. Das ist derselbe Befund wie Andis Fund vom 24.08.2026 („+
Premier League ändert die Spielzahl nicht") — nur eine Ebene höher.

⚠️ **Der erste Baustein steht seit gestern:** `grosseRundeHinweis()` ist genau
so ein Fall (Fremdjoker ab 15 Leuten). Der Vorschlag ist, daraus ein Muster zu
machen statt eines Einzelfalls.

---

## 5 · Der Einstieg über das GEFÜHL statt über die Regel

**Was es gibt.** Drei Stufen: Charaktere (Stufe 1), 12 Regler (Stufe 2), das
volle Gehäuse (Stufe 3). Das ist gut und deckt viel ab.

**Was fehlt — eine Stufe 0.** Drei Fragen, die kein Regelwissen brauchen:

1. *Wie oft schaut ihr rein?* (einmal die Woche ↔ täglich)
2. *Soll man einander ärgern können?* (nein ↔ gern)
3. *Darf der Letzte noch gewinnen?* (nein ↔ unbedingt)

Daraus fällt ein vollständiges Regelwerk. ⚠️ **Das ersetzt die Charaktere
nicht, es steht davor:** ein Charakter ist eine fertige Antwort, die man
wiedererkennen muss („Hardcore"). Diese drei Fragen kann jemand beantworten,
der noch nie ein Tippspiel geleitet hat.

🔴 **Die erste Frage ist die wichtigste und wird meistens vergessen:** wie oft
eine Runde reinschaut, entscheidet über Fremdjoker (zwei Phasen!), Abstimmung,
Münz-Takt und Versäumnis-Regeln. Sie steht heute an vier Stellen einzeln.

---

## 6 · Die Quote erklären, nicht nur zeigen

**Was es gibt.** `ergebnisQuote()` kennzeichnet fortgeschriebene Werte als
geschätzt — das ist die halbe Miete und war ein echter Fund.

**Was fehlt.** Der Satz dahinter. Ein Spieler sieht „12,4" und weiß nicht, ob
das viel ist. Zwei Zeilen würden reichen: *„Etwa jedes 12. Spiel dieser
Paarung endet so"* — und beim Torschützen: *„Bei seinen letzten 10 Einsätzen
hat er 4-mal getroffen."*

**Warum das zum Baukasten gehört und nicht zur Kosmetik.** Das ganze Spiel
beruht darauf, dass Leute Quoten lesen können. Wer das nicht kann, tippt
Bauchgefühl und versteht die Abrechnung nicht — und dann ist jede Feinheit im
Regelwerk umsonst.

---

## 7 · Was diese Woche zu tun ist — für den Admin

**Die Lücke.** Ein Admin muss zu bestimmten Zeiten etwas tun: Spieltag öffnen,
Beschlüsse ausrufen, Freigaben erteilen. Verstreut über vier Screens.

**Was es gibt.** `autoOeffnen.js` nimmt ihm das Öffnen ab, wenn er will.
`AdminFreigaben`, `Regelaenderungen`, `Zwischenabrechnung` gibt es einzeln.

**Was fehlt.** Eine Karte im Hub: *„Diese Woche: Spieltag 7 öffnet Freitag
18:30 · 2 Anträge warten · 3 Leute haben noch nicht getippt."* Kein neuer
Mechanismus — eine Zusammenfassung dessen, was schon berechnet wird.

---

## Meine Reihenfolge, wenn ich wählen dürfte

| | Vorschlag | warum dort |
|---|---|---|
| 1 | **Nr. 4** — was greift nicht | Verhindert den Eindruck „kaputt". Bausteine stehen |
| 2 | **Nr. 1** — Vergleich in Worten | Macht Code-Austausch erst benutzbar |
| 3 | **Nr. 6** — Quote erklären | Betrifft JEDEN Spieler bei JEDEM Tipp |
| 4 | **Nr. 7** — Admin-Woche | Kleinster Aufwand, sofort spürbar |
| 5 | **Nr. 5** — Stufe 0 | Groß, aber erst nach der Masterdatei sinnvoll |
| 6 | **Nr. 3** — Ahnentafel | Hängt an der Creator-Frage (M9) |
| 7 | **Nr. 2** — Probelauf | Der stärkste Effekt, der größte Aufwand, die schärfste Balancing-Kante |

⚠️ **Und was NICHT auf der Liste steht, obwohl es sich aufdrängt:** noch mehr
Einstellungen. Der Baukasten hat 201, und `npm run stufen` sagt: jede ist
erreichbar. Das Problem ist nicht die Zahl — es ist, dass 201 Einstellungen
ohne Führung eine Wand sind statt eines Baukastens.
