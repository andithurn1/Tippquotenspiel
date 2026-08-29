# Abzeichen und Trophäenschrank — Vorschläge

**Andis Auftrag (29.08.2026), wörtlich:**

> *„sensible Daten nicht für jedermann anzeigen, ich denke es reicht bei jedem
> Profil der benutzername samt nen kleinen Beschreibungstext über sich (den
> jeder selber einstellen kann und evtl. iwelche Abzeichen, die man erhält
> bspw. für ne krasse Scorestreak, oder riskant aufgegangen Tipps … etc. mach
> da mal ein Paar Vorschläge welche Kombis für die jeweiligen Abzeichen
> voraussetzung sein könnten um sie im Trophäenschrank (Eingliederung dann bei
> meinem Account und Fanfarben) auszuhängen. Die Abzeichen muss ich dann auch
> noch KI Designen mit Fussballmotiven."*

Diese Datei ist die Vorschlagsliste. **Gebaut ist davon noch nichts** — sie ist
zum Aussuchen da, und die Motiv-Spalte ist als Vorlage für die Bild-Erzeugung
gedacht.

---

## 1 · Was ein Profil zeigt — und was nicht

🔴 **Andis Zuschnitt ist die richtige Antwort auf die Datenfrage**, und er löst
sie an der Wurzel statt über Regeln: was gar nicht im Profil steht, kann auch
nicht ausgelesen werden.

| Sichtbar für alle Mitspieler | Nie im Profil |
|---|---|
| **Benutzername** (Anzeigename) | Mailadresse |
| **Kurzbeschreibung**, selbst geschrieben | Geburtsdatum |
| **Abzeichen** aus dem Trophäenschrank | alles andere aus `profile_privat` |
| Sinnbild / Fanfarben | |

⚠️ **Das Geburtsdatum lag bis zum 29.08.2026 doch offen** — die Spalte war in
`profiles` stehen geblieben, obwohl der Schreibweg längst nach `profile_privat`
umgezogen war. Behoben; steht in `supabase/schema.sql`. **Die Lehre für die
Kurzbeschreibung:** sie ist bewusst ÖFFENTLICH und gehört deshalb nach
`profiles`, nicht nach `profile_privat`. Wer sie schreibt, weiß, dass alle sie
lesen — das ist der Unterschied zu einem Geburtsdatum.

⚠️ **Und eine Grenze, die man beim Freitext mitdenken muss:** ein Feld, in das
jeder schreiben darf, wird auch von Fremden gelesen. Für eine Runde unter
Freunden ist das unkritisch; sobald Creator-Runden mit 1000 Leuten laufen,
braucht es eine Meldemöglichkeit. Nicht jetzt, aber bevor die erste große Runde
startet.

---

## 2 · 🔴 Der Grundsatz: Abzeichen ERFINDEN keine Messung

Die Engine misst schon eine Menge, und `ereignisse.js` hat genau dafür einen
Katalog: `serie`, `erster-exakter`, `aussenseiter`, `treffer-serie`,
`spieltag-komplett`, `pechstraehne`. Dazu die `METRIKEN` (Punkte, exakte
Treffer, abgegebene Tipps) und je Tipp die **Ebene** (exakt · Abstand · Tendenz
· daneben) samt der **Quote** des realen Ergebnisses.

⚠️ **Ein Abzeichen, das eine eigene Zählung mitbringt, ist eine zweite
Wahrheit.** Genau daran hatte dieses Projekt schon 17 Fehler an einem Tag: zwei
Stellen rechnen dasselbe und laufen auseinander. Die Abzeichen unten lesen
deshalb dieselben Signale wie die Ereignisse.

🔴 **Alle Zahlen unten sind PLATZHALTER.** Ab wann eine Serie „krass" ist, ist
eine Balance-Frage, und Balancing ist Endphase (CLAUDE.md). Die Zahlen stehen
da, damit man sich etwas vorstellen kann — festgelegt werden sie zuletzt.

---

## 3 · Die Vorschläge

### 3a · Treffsicherheit — für die, die es können

| Abzeichen | Bedingung (Platzhalter) | Motiv-Vorschlag |
|---|---|---|
| **Erster Treffer** | Der erste exakt getroffene Endstand überhaupt | Ein Ball, der gerade die Linie überquert — schlicht, es ist das Einsteiger-Abzeichen |
| **Scharfschütze** | 3 Spieltage in Folge mindestens ein exakter Treffer | Zielscheibe aus konzentrischen Ringen, Ball in der Mitte |
| **Uhrwerk** | 10 exakte Treffer in einer Saison | Ein Zifferblatt, dessen Zeiger Ballspitzen sind |
| **Hellseher** | Exakter Treffer **plus** beide Torschützen richtig, im selben Spiel | Eine Kristallkugel mit einem Ball darin |

### 3b · Mut — Andis „riskant aufgegangene Tipps"

🔴 **Die interessanteste Gruppe**, weil sie das belohnt, was das Spiel
ausmacht: nicht Richtigliegen, sondern **gegen die Quote** Richtigliegen.

| Abzeichen | Bedingung (Platzhalter) | Motiv-Vorschlag |
|---|---|---|
| **Außenseiter-Freund** | Ein Tipp auf einen Außenseiter-Sieg geht auf | Ein kleiner Ball, der einen großen umwirft |
| **Hasardeur** | 3 aufgegangene Außenseiter-Tipps in einer Saison | Würfel, dessen Augen Bälle sind |
| **Wahnsinn mit Methode** | Ein einzelnes Spiel bringt mehr als das Doppelte des üblichen Spieltags-Ertrags | Ein Blitz, der in ein Tornetz einschlägt |
| **Alleingang** | Als Einziger der Runde auf diesen Ausgang getippt — und er kommt | Ein Trikot mit der Nummer 1 auf leerem Rasen |
| **Kaltschnäuzig** | Außenseiter-Tipp **plus** Joker darauf — und er geht auf | Ein Spielkarten-Joker mit Fußball statt Narrenkappe |

⚠️ **„Alleingang" braucht einen Vergleich mit den anderen Tipps der Runde.** Die
Daten liegen vor (`alleinstellung.js` gibt es schon), aber in einer Runde zu
zweit ist es fast geschenkt. Braucht eine Mindestgröße.

### 3c · Ausdauer — Andis „Scorestreak"

| Abzeichen | Bedingung (Platzhalter) | Motiv-Vorschlag |
|---|---|---|
| **Immer dabei** | 10 Spieltage in Folge abgegeben, ohne Auto-Tipp | Ein Kalenderblatt mit Häkchen-Reihe |
| **Eiserner** | Eine ganze Hinrunde ohne einen einzigen verpassten Spieltag | Ein Anker aus einem Torpfosten |
| **Serientäter** | 5 Spieltage in Folge über dem Rundenschnitt | Aufsteigende Balken, oben ein Ball |
| **Aufholjagd** | Von der unteren Hälfte in die obere, innerhalb von 5 Spieltagen | Ein Pfeil, der sich um einen Ball nach oben windet |

### 3d · Runde und Rolle — für alle, die etwas beitragen

| Abzeichen | Bedingung (Platzhalter) | Motiv-Vorschlag |
|---|---|---|
| **Baumeister** | Eine eigene Runde erstellt | Ein Reißbrett mit Spielfeldlinien |
| **Gastgeber** | Eine eigene Runde mit mindestens 5 Mitspielern | Ein Wimpel-Tausch vor dem Anstoß |
| **Wegbereiter** | Der eigene Creator-Code wurde von jemand anderem übernommen | Ein Schlüssel, dessen Bart ein Spielfeld ist |
| **Gefragt** | Der eigene Code wurde 10-mal übernommen | Derselbe Schlüssel, in Gold, mit Lorbeer |

⚠️ **„Wegbereiter" und „Gefragt" sind schon messbar:** `presets.uebernahmen`
wird gezählt, nicht geschätzt. Das sind die billigsten Abzeichen der Liste.

### 3e · Selbstironie — die wichtigste Gruppe für eine Freundesrunde

🔴 **Nicht weglassen.** Eine Sammlung, in der man nur glänzen kann, wird
langweilig; die Abzeichen, über die gelacht wird, werden am häufigsten
hergezeigt. Der Ton muss dabei **aufziehen, nicht auslachen** (docs/tonfall.md).

| Abzeichen | Bedingung (Platzhalter) | Motiv-Vorschlag |
|---|---|---|
| **Pechvogel** | 5 Spieltage in Folge ohne exakten Treffer | Eine Taube auf der Latte, Ball fliegt vorbei |
| **Der Sichere** | 10 Tipps in Folge auf den Favoriten — ohne einen Außenseiter | Ein Regenschirm auf dem Rasen |
| **Knapp daneben** | 5-mal ein Tor daneben bei richtigem Sieger | Ball am Pfosten, Abdruck sichtbar |
| **Letzter Held** | Spieltags-Letzter — und trotzdem am nächsten Spieltag abgegeben | Ein Wischmop im leeren Stadion |

---

## 4 · Für die Bild-Erzeugung

Die Vorgaben aus `design/symbole.md` gelten unverändert: **flach**, einfarbig
mit transparentem Grund, quadratisch, mindestens 512 px, **keine Schrift im
Bild** (wir übersetzen später), erkennbar bei 24 px.

🔴 **Zwei Zusätze, die nur für Abzeichen gelten:**

- **Eine gemeinsame Grundform.** Alle im selben Rahmen — Wappenschild, Kreis
  oder Sechseck, aber überall derselbe. Sonst sieht der Trophäenschrank aus wie
  ein Flohmarkt. **Das ist die eine Entscheidung, die vor dem ersten Bild
  fallen muss.**
- **Drei Stufen derselben Form**, falls du Bronze/Silber/Gold willst: dann
  reicht EIN Motiv je Abzeichen, und die Stufe kommt über die Rahmenfarbe aus
  dem Theme. Das spart zwei Drittel der Bilder — und die Farbe passt sich
  automatisch an hell/dunkel an.

⚠️ **Fußballmotive ja, Vereinsbezug nein.** Ein Wappen, das nach einem echten
Klub aussieht, ist ein Markenproblem, sobald die App im Store liegt.

---

## 5 · Der Trophäenschrank

Andis Ort: **bei „Mein Account und Fanfarben"**. Passt — beides ist „das bin
ich", im Gegensatz zu „so spielt meine Runde".

**Was er zeigen sollte:**

1. Die **erspielten** Abzeichen groß, in Erwerbsreihenfolge.
2. Die **noch nicht erspielten** blass daneben, mit ihrer Bedingung. 🔴 Das ist
   der eigentliche Antrieb — ein Schrank, der nur zeigt, was man hat, gibt
   keinen Grund, weiterzuspielen.
3. Je Abzeichen **wann** es kam, und in welcher Runde.

⚠️ **Eine Frage, die vor dem Bauen zu klären ist:** gelten Abzeichen **je
Runde** oder **je Konto**? Für „Baumeister" ist es das Konto, für „Scharfschütze"
eher die Runde — sonst zählt eine Runde mit 1000 Leuten genauso wie eine mit
fünf. **Mein Vorschlag:** je Konto gesammelt, aber mit der Runde beschriftet, in
der es erspielt wurde. Das ist beides und lügt bei keinem.

---

## 6 · Was zu bauen wäre, in dieser Reihenfolge

1. **`profiles.beschreibung`** — die Kurzbeschreibung, öffentlich, mit Länge und
   Bereinigung. Klein und unabhängig vom Rest.
2. **`src/lib/abzeichen.js`** — der Katalog mit Bedingungen, UI-frei und
   prüfbar. Jede Bedingung liest vorhandene Signale, keine neue Zählung.
3. **Messung gegen echte Daten**: wie viele Spieler bekämen ein Abzeichen? Wirft
   eine Bedingung 90 % oder 0 % aus, taugt sie nicht — derselbe Fehler wie bei
   PP2 („64 von 69 Einträgen dasselbe Icon").
4. **Der Schrank** als Oberfläche.
5. **Die Bilder**, wenn die Grundform steht.

⚠️ Punkt 3 vor Punkt 4. Eine Sammlung, die niemand füllt, ist schlimmer als
keine.
