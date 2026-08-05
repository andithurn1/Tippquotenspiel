# Regel-Abstimmung und Verfassung — die Runde entscheidet mit

**Spec.** Account 2 (Andre), 2026-08-03, nach Vorgabe des Nutzers.

> **Die Vorgabe:** Ein Abstimmsystem für alle Nutzer einer Tipprunde, um
> gemeinsam und demokratisch über Regeländerungen zu entscheiden. Der Admin
> kann eine **Verfassung** auflegen, die den Rahmen des Änderbaren festlegt und
> nicht gebrochen werden kann — dazu Fristen zur Wirkung und Regeln, wer wie zu
> stimmen hat. Der Admin darf das aufteilen, wie er will.

⚠️ **Nicht zu verwechseln mit der Joker-Abstimmung** (`voting.js`,
`rules.joker.abstimmung`). Die entscheidet, an WELCHEN Spieltagen es einen
Joker gibt — eine wiederkehrende Ja/Nein-Frage im laufenden Betrieb. Hier geht
es um **Änderungen am Regelwerk selbst**. Zwei verschiedene Dinge; sie dürfen
nicht in einem Modul landen, sonst hat man eine Abstimmung, die zwei
unvereinbare Fragen beantwortet.

---

## 1. 🔴 Zuerst die harte Kante: was ein Beschluss NICHT darf

Bevor irgendetwas anderes entschieden wird, gilt eine Regel, die keine
Einstellung ist:

**Eine Regeländerung wirkt nie rückwirkend.** Kein Beschluss darf einen bereits
abgegebenen Tipp anders bewerten, als er beim Abgeben bewertet worden wäre.

Das ist dieselbe Kante wie der eingefrorene Snapshot und wie
`joker-inventar.md` 4.4 („Tipp ÄNDERN nach Anpfiff — nicht verhandelbar"). Sie
ist der Grund, warum es überhaupt eine **Frist zur Wirkung** braucht: eine
Änderung tritt frühestens zum nächsten noch nicht geöffneten Spieltag in Kraft.

⚠️ **Auch eine einstimmige Runde darf das nicht.** Die Regel schützt nicht vor
der Mehrheit, sondern vor der Unmöglichkeit: eine rückwirkend geänderte Wertung
ließe sich gar nicht mehr nachrechnen, weil der Snapshot die alte Welt trägt.

## 2. Die Verfassung — was überhaupt zur Wahl steht

Vom Nutzer gefordert: ein Rahmen, den auch eine Mehrheit nicht brechen kann.

```js
rules.verfassung = {
  enabled: false,
  aenderbar: [],          // Aspekt-Schlüssel aus presetMerge.ASPEKTE
  gesperrt: [],           // ausdrücklich unveränderlich
  grenzen: {},            // je Feld ein engeres Band als RULE_LIMITS
  …
}
```

🔴 **Der Zuschnitt ist schon da: `presetMerge.ASPEKTE`.** Zur Abstimmung steht
immer ein **ganzer Aspekt**, nie ein Einzelfeld — dieselbe Regel wie bei den
Teilbibliotheken (`teilbibliotheken.md` 1). Wer über „nur den Joker-Faktor"
abstimmen ließe, ließe über einen halben Satz abstimmen, und heraus käme eine
Kombination, die niemand entworfen hat.

**Die Verfassung kann nur VERENGEN, nie erweitern.** `RULE_LIMITS` bleibt die
äußere Grenze; `grenzen` darf sie einschränken, nie überschreiten. Sonst wäre
eine Abstimmung ein Weg, das Regelwerk zu verlassen — und die Presets,
Messungen und Warnbänder gälten nicht mehr.

⚠️ Das ist die Umkehrung der Regel aus `reglerWarnung.js` („eine Messung
verengt NIE die harte Grenze"). Dort verengt eine MESSUNG nicht; hier verengt
eine ENTSCHEIDUNG sehr wohl — sie ist eine Abmachung der Runde, keine
Behauptung über Balance.

## 3. Wie abgestimmt wird

```js
abstimmung: {
  wer:        "alle",        // alle | nurAktive | adminPlusAlle
  mehrheit:   "einfach",     // einfach | zweidrittel | einstimmig
  quorum:     0.5,           // Anteil, der teilnehmen muss
  dauer:      3,             // Spieltage, die eine Abstimmung offen ist
  wirkungAb:  "naechsterSpieltag",
  vetoAdmin:  false,
  antragsrecht: "alle",      // wer eine Änderung VORSCHLAGEN darf
}
```

**Vom Nutzer benannt:** Frist zur Wirkung, wer wie zu stimmen hat, Verfassung
als Obergrenze, freie Aufteilung durch den Admin.

**Von mir vorgeschlagen** (ausdrücklich als Vorschlag markiert, der Nutzer hat
darum gebeten):

| Feld | Warum |
|---|---|
| `quorum` | Ohne Beteiligungsschwelle beschließen drei von zwölf Leuten die Saison. Bei der Joker-Abstimmung ist das egal (es geht um einen Spieltag), bei einer Regeländerung nicht. |
| `antragsrecht` | Wer abstimmen darf, muss nicht vorschlagen dürfen. „Nur der Admin schlägt vor, alle entscheiden" ist ein völlig anderes Rundengefühl als „jeder darf jederzeit". |
| `vetoAdmin` | Der Admin trägt die Runde. Ein Veto ist ehrlicher als eine Verfassung, die heimlich alles sperrt — und es ist sichtbar. |
| `nurAktive` | Wer seit fünf Spieltagen nicht tippt, sollte die Regeln nicht mitbestimmen. Verhindert Karteileichen als Blockade beim Quorum. |
| `sperrfrist` | Nach einem Beschluss (oder einer Ablehnung) ist dasselbe Thema für N Spieltage gesperrt. Ohne das stellt jemand denselben Antrag jede Woche neu, bis er durchgeht. |
| `sichtbarkeit` | Laufende Stimmen offen oder verdeckt bis zum Ende. Offen erzeugt Herdenverhalten, verdeckt erzeugt Spannung — dieselbe Frage wie `jokerBasis.sicht`, und sie gehört dem Admin. |

⚠️ **`einstimmig` braucht `quorum: 1`**, sonst heißt es „einstimmig unter denen,
die zufällig abgestimmt haben". Eine Kombination, die etwas anderes tut, als
sie sagt — die Prüffunktion muss sie melden.

## 4. Was ein Antrag ist

```js
{ id, aspekt, werte, antragsteller, gestelltAm, laeuftBis, stimmen: [] }
```

`werte` trägt **die Felder genau eines Aspekts** — damit ist ein Antrag
technisch dasselbe wie ein **Teilbibliotheks-Eintrag** (`teilbibliotheken.md` 3).

🔴 **Daraus folgt der ganze Bauplan:** ein Antrag lässt sich als Teil-Code
(`TS2A-…`) darstellen, teilen und anwenden. Angenommen wird er über
`mergePresets` — dieselbe Funktion, die schon alles andere mischt. **Kein
zweiter Anwendungsweg.** Wer hier neu baut, bekommt zwei Wahrheiten darüber,
wie ein Regelwerk verändert wird.

Und die Oberfläche gibt es halb schon: „so sähe die Runde danach aus" ist der
Vergleich, den `presetMerge` und die Teilbibliotheken bereits zeigen.

## 5. Prüffunktionen (`src/lib/regelAbstimmung.js`)

- `sanitizeVerfassung(partial)` · `sanitizeAbstimmung(partial)`
- `darfBeantragen(aspekt, rules, userId, kontext)` → `{ erlaubt, grund }`
  — prüft Verfassung (`gesperrt`/`aenderbar`), `antragsrecht`, `sperrfrist`.
- `darfStimmen(userId, kontext)` → `{ erlaubt, grund }` — `wer`, plus
  „aktiv" über die Tipps der letzten Spieltage.
- `zaehleAus(antrag, mitglieder, abstimmung)` → `{ ja, nein, beteiligung,
  quorumErreicht, angenommen, grund }`
  ⚠️ Muster `tallyVotes` in `voting.js` — **dort nachsehen und die Form
  übernehmen**, statt eine zweite zu erfinden.
- `wirktAb(antrag, abstimmung, zeitachse)` → Runden-Spieltag. Nutzt
  `rundenSchluessel` aus `zeitachse.js`, nicht den Liga-Spieltag: eine
  Regeländerung gilt rundenweit.
- `verstoesstGegenVerfassung(werte, verfassung)` → welche Felder das erlaubte
  Band verlassen. **Nennt die Felder, nicht nur „nein"** — sonst weiß der
  Antragsteller nicht, was er ändern muss.
- `konflikte(rules)` → die Kombinationen, die sich widersprechen (z. B.
  `einstimmig` ohne `quorum: 1`, oder ein Aspekt gleichzeitig in `aenderbar`
  und `gesperrt`).

## 6. Was NICHT gebaut wird

| Idee | Warum nicht |
|---|---|
| Rückwirkende Beschlüsse | Abschnitt 1. Nicht verhandelbar. |
| Abstimmung über Einzelfelder | Bricht die Aspekt-Regel (Abschnitt 2). |
| Stimmgewicht nach Tabellenplatz | Wer führt, bekäme Einfluss auf die Regeln, unter denen er führt. Das ist kein Regler, das ist ein Loch. |
| Abstimmung über die Verfassung selbst | Dann ist sie keine. Sie ändert der Admin — sichtbar — oder gar niemand. |
| Automatische Umsetzung ohne Frist | Hebelt Abschnitt 1 aus, sobald ein Spieltag schon offen ist. |

## 7. Reihenfolge

1. ✅ **GEBAUT (05.08.2026)** — `src/lib/regelAbstimmung.js` + 64 Tests.
   Datenform, `sanitize*`, `zaehleAus`, `wirktAb`,
   `verstoesstGegenVerfassung`, `konflikte`. Reine Funktionen, wie `voting.js`.
2. ✅ **GEBAUT (05.08.2026)** — Store: `createAntrag` · `listAntraege` ·
   `saveAntragStimme` · `setAntragStatus`, in Mock und Supabase, dazu
   `rule_proposals`/`rule_proposal_votes` samt RLS in `supabase/schema.sql`.
   ⚠️ **Der Nutzer muss `schema.sql` erneut im SQL-Editor ausführen** (es ist
   idempotent, einfach komplett laufen lassen), sonst fehlen die Tabellen live.
   Zwei Entscheidungen dabei:
   - **`listAntraege` liefert die Stimmen gleich mit** (`antrag.stimmen`), weil
     `zaehleAus` genau diese Form erwartet — sonst setzte sie jeder Screen neu
     zusammen.
   - **`status`/`veto` ändert KEINE Policy.** Ein Abschluss gehört
     serverseitig gesetzt; sonst erklärte jedes Mitglied den eigenen Antrag
     für angenommen. RLS ist die Zugangs-, nicht die Spielregel — wer
     beantragen darf, entscheidet `regelAbstimmung.js`.
3. ✅ **GEBAUT (05.08.2026)** — `src/components/Mitbestimmung.jsx`, in der
   Spielerstellung nur bei Stufe „profi". Regler UND Zahleneingabe fürs
   Quorum, Karten für die Kataloge, die Verfassung als Liste der ASPEKTE
   (nie einzelner Regler), dazu `beschreibeMitbestimmung` als Live-Vorschau
   und die Konflikt-Meldungen.
   ⚠️ Zwei Fallen, die beim Bauen aufgefallen sind:
   - **Der Quorum-Regler läuft NICHT über `reglerSchritt`.** Der erkennt
     die Multiplikator-Familie generisch an `step === 0.05`; das Quorum hat
     diesen Schritt, ist aber ein Anteil und kein Modifikator. Gleiche Lage
     und gleiche Behandlung wie `maxAnteilProSpiel`.
   - **Das Entfernen des LETZTEN freigegebenen Bereichs kippte die
     Bedeutung ins Gegenteil.** Eine leere Freigabeliste heißt „alles außer
     den festgeschriebenen" — wer den letzten Haken entfernt, hätte statt
     „gar nichts abstimmbar" plötzlich „alles abstimmbar" bekommen, durch
     einen Klick und ohne Hinweis. Jetzt werden in diesem Fall alle
     Bereiche festgeschrieben; `konflikte` meldet den Zustand ordentlich.
4. ✅ **GEBAUT (05.08.2026)** — `src/components/Regelaenderungen.jsx`,
   Route `/regeln` (eigene Route neben `/abstimmung`, das ist die
   Joker-Abstimmung), Karte im Runden-Hub.
   🔴 **Ein Antrag wird aus einem TEILBIBLIOTHEKS-Eintrag gestellt**, nicht
   aus einem zweiten Regel-Editor: Bereich wählen, kuratierte
   Voreinstellung wählen, fertig. Das folgt Abschnitt 4 („ein Antrag IST
   ein Teilbibliotheks-Eintrag") und hält die Aspekt-Regel ein, ohne einen
   zweiten Weg zu bauen, ein Regelwerk zu verändern. Wer freier bauen will,
   tut das in der Spielerstellung und teilt einen Teil-Code.
   ⚠️ **Ein Fund beim Nachlesen:** `zuletztGeoeffnet` ist der AKTUELLE
   Runden-Spieltag, nicht der davor. Ein Spieltag wird zum Tippen geöffnet,
   BEVOR er angepfiffen wird — auf dem laufenden liegen also schon Tipps.
   Mit „aktuell minus eins" hätte ein Beschluss genau dort greifen und eine
   bereits getippte Wertung nachträglich ändern können. Gerundet wird in
   die harmlose Richtung: eine Woche zu spät kostet eine Woche, eine zu
   früh bricht Abschnitt 1.
   Verdeckte Sichtbarkeit gilt nur, SOLANGE die Abstimmung läuft — danach
   wird gezeigt, sonst könnte niemand das Ergebnis nachvollziehen.
5. ✅ **GEBAUT (05.08.2026), bis auf das Einhängen in die Wertung** —
   `src/lib/beschluss.js` + 16 Tests.
   🔴 **Die FORM ist die halbe Sicherung.** Es gibt bewusst kein
   `wendeBeschluesseAn(rules)`, das ein Regelwerk „aktualisiert", sondern
   `regelwerkAmSpieltag(...)`: die Frage lautet immer **„welches Regelwerk gilt
   an Spieltag N?"**. Damit ist die Rückwirkung aus Abschnitt 1 **strukturell
   unmöglich** statt nur verboten — wer einen vergangenen Spieltag nachrechnet,
   fragt nach genau diesem Spieltag und bekommt das damalige Regelwerk. Ein
   „aktuelles" Regelwerk, das man versehentlich auf alte Tipps anwendet, gibt
   es gar nicht. Dieselbe Idee wie beim eingefrorenen Quoten-Snapshot.
   Weitere Punkte:
   - **Chronologisch angewandt** (Wirkungs-Spieltag, dann Antragszeitpunkt,
     dann Id). Zwei Beschlüsse auf denselben Bereich überschreiben einander —
     ohne feste Reihenfolge hinge das Ergebnis daran, wie die Datenbank die
     Zeilen zurückgibt, und zwei Spieler sähen verschiedene Regelwerke.
   - **Die Verfassung wird beim ANWENDEN erneut geprüft**, nicht nur beim
     Stellen: sie ist der Rahmen, den auch eine Mehrheit nicht bricht, und der
     Admin kann sie zwischenzeitlich geändert haben. Ein so verworfener
     Beschluss verschwindet aber NICHT still — er steht in `verworfen`, mit
     Grund, und der Screen zeigt ihn. Eine Runde, die abgestimmt hat, muss
     erfahren, warum nichts passiert ist.
   - **Angewandt über `mergePresets`**, kein zweiter Weg (Abschnitt 4).
   ✅ **Auch das Einhängen in die Wertung ist gebaut (05.08.2026).**
   `scoreLeaderboard`/`scoreLeaderboardHistory` nehmen ein optionales
   `regelnFuer`, beide Stores reichen es durch (`regelnFuerSpieltag` in
   `beschluss.js`). Ohne den Parameter ändert sich nichts — eine Vorgabe darf
   kein stiller Regelwechsel sein.
   Drei Punkte, die dabei entschieden wurden:
   - **`applyCatchup` bekommt `regelnFuer` mit**, weil der Anschluss-Bonus je
     Spieltag entsteht. Die Prüfung „ist der Bonus an" steht dafür jetzt IM
     Schleifenkörper: er kann an Spieltag 1 aus und ab 20 an sein.
   - **`applySaisonform`/`applyDuellJoker` bekommen ihn NICHT** — und
     `beschluss.js` VERWIRFT Anträge, die an `saisonform`/`duell` rühren, mit
     Begründung. Das ist keine Lücke, sondern Abschnitt 1: „ab Spieltag 20
     werden die zwei schlechtesten Spieltage gestrichen" lässt sich gar nicht
     anders lesen als rückwirkend. Geprüft wird am FELD, nicht am Aspekt —
     `aufholen` liegt im selben Aspekt und darf sehr wohl beschlossen werden.
   - 🔴 **`brauchtVerlauf` muss BEIDE Regelwerke fragen.** Es entscheidet, ob
     überhaupt über den Verlauf gerechnet wird, und las bisher nur das
     angelegte Regelwerk. Beschließt eine Runde den Anschluss-Bonus erst an
     Spieltag 20, ist er in `round.rules` aus — der Verlauf würde gar nicht
     gebaut und der Bonus fiele still aus. Deshalb fragen beide Stores
     zusätzlich das Regelwerk am Saisonende (`amEnde`).

   **Nachgemessen durch den ganzen Weg** (Test in `store.test.js`): ein
   Beschluss, der die Anzeige verdreifacht, lässt den früheren Spieltag Punkt
   für Punkt unverändert und verdreifacht exakt den Beitrag des späteren.

---

## 8. Was beim Bauen von Schritt 1 entschieden wurde

**Die Blöcke heißen `rules.verfassung` und `rules.regelAbstimmung`** — bewusst
NICHT `rules.abstimmung`: `rules.joker.abstimmung` gibt es schon (die
Joker-Abstimmung), und zwei fast gleich heißende Felder für die zwei
unvereinbaren Fragen wären genau die Verwechslung, vor der ganz oben gewarnt
wird.

**Die Datei importiert NICHTS.** `engine.js` braucht sie, und alles, was sie
bräuchte, liegt hinter `engine.js` (`RULE_LIMITS` dort selbst, die ASPEKTE in
`presetMerge.js`, das seinerseits `engine.js` importiert) — jeder Weg wäre ein
Import-Kreis, dieselbe Falle wie bei `spieltag.js`. Harte Grenzen und
Aspekt-Katalog kommen deshalb als Parameter herein.

🔴 **Das hat die Zusicherung aus Abschnitt 2 sogar verbessert.** „Nur verengen,
nie erweitern" hängt jetzt nicht am SPEICHERN, sondern am LESEN: jeder Zugriff
läuft über `effektiveGrenzen`, und das schneidet immer gegen die harte Grenze.
Gemessen mit einem feindlichen Band — gespeichert 0 bis 10 auf `joker.faktor`,
wirksam bleibt 1 bis 2. Ein Band, das auf irgendeinem Weg in die Daten gelangt,
kann damit gar nichts aufmachen.

**`gestelltAm` ist ein RUNDEN-SPIELTAG, kein Datum.** Damit bleibt das Modul
uhrenfrei wie `voting.js`, und Dauer, Frist und Sperrfrist stehen in derselben
Einheit. Wer dort ein Datum hineinlegt, bekommt Unsinn.

**`aenderbar: []` heißt „alles außer `gesperrt`".** Eine Verfassung
einzuschalten darf nicht als Nebenwirkung alles sperren — dasselbe Muster wie
`fensterVon` in `duellJoker.js`.

**Ein zehnter Aspekt `mitbestimmung`** in `presetMerge.js` trägt beide Blöcke,
sonst fielen sie aus dem Creator-Code (der Abdeckungstest schlägt an). Er ist
der einzige Aspekt, über den nie abgestimmt werden kann (Abschnitt 6) — das
setzt `regelAbstimmung.js` durch, nicht der Katalog: beim Mischen und Teilen
soll er ganz normal mitwandern. Dazu gehört eine kuratierte Teilbibliothek mit
vier Einträgen.

### Die drei Komplexitätsstufen

- **Stufe 1 (Charaktere): kommt bewusst NICHT vor.** Ein Charakter ist eine
  Runden-Idee („wie fühlt sich das Spiel an"); wie eine Gruppe ihre Regeln
  beschließt, ist keine Frage des Spielgefühls und kommt erst auf, wenn eine
  Runde schon läuft. Alle Charaktere lassen die Abstimmung aus — das ist die
  kuratierte Wahl, ausdrücklich begründet (Kommentar in `charaktere.js`).
- **Stufe 2:** der Regler „Wer darf die Regeln ändern?" mit drei Stufen —
  „Der Admin" · „Die Runde stimmt ab" · „Nur mit großer Mehrheit" (die
  schützt zusätzlich die Wertung selbst per Verfassung).
- **Stufe 3: steht noch aus** — das ist Schritt 3 der Reihenfolge oben.

### Ein Fund aus dem Nachmessen

Die Verstoß-Meldung schrieb JEDE Grenze der Verfassung zu, auch dann, wenn das
Verfassungs-Band längst auf die harte Grenze beschnitten war. Der Admin hätte
in der Verfassung nach einer Schranke gesucht, die dort gar nicht steht. Sie
nennt jetzt die richtige Quelle.

### Kleine offene Kante

Ein `grenzen`-Eintrag auf einen Pfad, den `RULE_LIMITS` nicht kennt, überlebt
das Speichern und reist im Creator-Code mit, kann aber nie etwas bewirken
(`effektiveGrenzen` liefert dort `null`). Das ist Absicht — geraten wird
nichts —, aber es ist totes Gewicht. Wenn die Profi-Oberfläche entsteht, sollte
sie solche Pfade gar nicht erst anbieten.
