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

1. `regelAbstimmung.js` — Datenform, `sanitize*`, `zaehleAus`,
   `verstoesstGegenVerfassung`. Reine Funktionen, wie `voting.js`.
2. Store: Anträge und Stimmen ablegen (Muster `saveVote`/`listVotes`).
3. Verfassung in der Spielerstellung (Profi-Stufe).
4. Antrags- und Abstimmungs-Screen.
5. ⚠️ **Erst danach die Wirkung**: ein angenommener Antrag ändert das Regelwerk
   der Runde zum berechneten Spieltag. Das ist der Schritt, der die
   Snapshot-Kante berührt — getrennt halten und einzeln prüfen.
