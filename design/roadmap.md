# Roadmap & Pipeline

Offene Feature-Ideen, grob nach Aufwand. Gebaut wird in einzelnen, testbaren
Schritten (Engine zuerst, dann Store, dann UI, dann Browser-Check + Commit).

## 🔔 ZP5: fünf Benachrichtigungsarten — zwei davon liefern noch nichts (25.08.2026)

Andis Zusage beim Fremdjoker-Gespräch: *„wir machen noch ein Untermenü wo
jeder Benachrichtigungstyp einzeln an und abgewählt werden kann"*.

Der alte Vorbehalt im Auftragsbuch war richtig — **bei zwei Arten wäre das
Untermenü fast leer** — und er nannte auch die Bedingung, unter der er
entfällt: „sobald mehr dazukommen". Die drei sind jetzt da:

| Art | Vorgabe | liefert heute |
|---|---|---|
| Neuer Spieltag tippbar | an | ✅ |
| Erinnerung vor Anpfiff | an | ✅ |
| **Jemand hat dir ein Spiel gesperrt** | an | ✅ über `getFremdEingriffe(roundId)` |
| **Spieltag abgerechnet** | an | ✅ **26.08.2026 angeschlossen** |
| **Jemand ist an dir vorbei** | **aus** | ✅ **26.08.2026 angeschlossen** |

🔴 **Warum „Sperre" die wichtigste der drei ist:** sie betrifft eine FRIST.
Wer nicht weiß, dass sein Spiel gesperrt wurde, versucht kurz vor Anpfiff zu
tippen und steht vor einem grauen Knopf. Deshalb trägt sie in der Sortierung
`stunden: -1` und fällt als Letzte aus der Tages-Obergrenze — durch einen
Test festgehalten.

⛔ **Warum „Überholt" als einziges AUS ist:** sie kann an einem Spieltag
mehrfach kommen und ist reine Unterhaltung. Eine Benachrichtigung, die nur
kribbelt, schaltet man nach der dritten ganz ab — und dann sind auch die
wichtigen weg.

### ✅ Beide offenen sind am 26.08.2026 zugegangen

Beide brauchten einen **Vergleich mit dem Stand von vorhin**. Bei beiden lag
die Antwort in Daten, die es längst gab — keine neue Marke, kein neuer
Zustand:

- ✅ **Abgerechnet — am 26.08.2026 angeschlossen.** Der Anschluss lag genau
  dort, wo er vermutet wurde: die Zwischenabrechnungs-Einblendung führt schon
  eine Marke „bis hierhin gesehen" (`tqs.abrechnung.gesehen.v1`). Neu ist
  `fertigeSpieltage()` in `zwischenabrechnung.js`.

  🔴 **Es ist eine andere Aussage als die Einblendung darüber:** die erzählt
  SPIELE („Bochum – Osnabrück, 156 Punkte"), die Benachrichtigung meldet einen
  SPIELTAG. Ein Spieltag, von dem drei von neun Spielen fertig sind, ist nicht
  abgerechnet — und eine Meldung je Spiel wären neun Meldungen für ein
  Ereignis. `neueAbrechnungen` reicht deshalb NICHT als Quelle: sie liefert
  die seit dem letzten Blick fertigen Spiele, nicht die Frage, ob der Spieltag
  damit vollständig ist.

  ⚠️ **Die Marke wird MITGELESEN, nicht ein zweites Mal geführt.** Zwei Marken
  für „bis hierhin gesehen" liefen unweigerlich auseinander, und dann meldet
  die eine Seite, was die andere längst gezeigt hat. Geschrieben wird sie
  weiterhin nur dort, wo der Nutzer die Einblendung wegklickt — eine
  Benachrichtigung ist kein „gesehen".
- ✅ **Überholt — am 26.08.2026 angeschlossen**, und zwar OHNE die Marke, die
  hier noch als fehlend stand. `src/lib/ueberholung.js`.

  🔴 „Mein Rang beim letzten Mal" im localStorage festzuhalten wäre die
  naheliegende Lösung gewesen — und die falsche, aus zwei Gründen, die beide
  erst im Betrieb auffallen: sie hinge am **Gerät** (wer am Telefon nachsieht
  und dann am Rechner, bekommt die Meldung zweimal oder gar nicht) und am
  **Hinsehen** (wer eine Woche nicht hineinschaut, wird überschüttet oder
  bekommt nichts).

  Der Verlauf beantwortet es ohne jeden gespeicherten Zustand: er trägt je
  Spieltag eine vollständige Rangliste. „Vorbeigezogen" heißt dann schlicht:
  im vorletzten Board stand ich davor, im letzten dahinter. Auf jedem Gerät
  dieselbe Antwort, unabhängig davon, wann man hinsieht.

  ⚠️ Gleichstand zählt NICHT als Überholen — sonst käme die Meldung bei jedem
  Remis-Spieltag.

⚠️ **Die Schalter sind trotzdem schon gebaut und WIRKEN** — sie liefern nur
noch nichts. Das ist bewusst, damit die Reihenfolge stimmt: erst die
Einstellung, dann die Quelle. Wer den Anschluss baut, muss nichts an der
Oberfläche anfassen. **Nicht** vergessen: solange sie leer laufen, ist das
genau die Sorte Halbfertigkeit, die `npm run tot` und `npm run greift`
suchen — deshalb steht es hier und nicht nur im Code.

## 🔴🔴 DER MANNSCHAFTS-MODUS EXISTIERT NUR IN `teams.js` (25.08.2026)

**Der größte Einzelfund aus `npm run tot` — und er ist kein Rechenfehler,
sondern ein Modul ohne Anschluss.** `src/lib/teams.js` ist fertig gebaut,
kommentiert und von `teams.test.js` abgesichert: `TEAM_LIMITS`, `WERTUNGEN`
(Summe · Schnitt · Bester), `sanitizeTeams`, `pruefeAufteilung` (mit
Korrekturvorschlägen), `teamLeaderboard`, `beschreibeTeams`. Sechs seiner
acht Exporte standen in der `tot`-Liste als „nur Test".

**GEMESSEN, nicht vermutet** — `sanitizeRules` mit einem gesetzten
`teams`-Block gefüttert:

```
teams nach sanitizeRules: undefined
teams in DEFAULT_RULES:   undefined
```

Der Block ist also nicht bloß unerreichbar, **er existiert im Regelwerk gar
nicht**. Ein Admin, der ihn setzte, verlöre ihn beim Speichern — genau die
Sorte „EINSTELLUNG VERWORFEN", vor der `npm run greift` warnt. Deshalb taucht
`teams` auch in `npm run stufen` NICHT als Lücke auf: `stufen` zählt Felder
des Regelwerks, und dieses Feld gibt es nicht.

**Was alles fehlt, in der Reihenfolge, in der es gebaut werden müsste:**

| Schicht | Stand |
|---|---|
| Wertung (`teams.js`) | ✅ fertig + getestet |
| `DEFAULT_RULES.teams` + `sanitizeRules` | ⛔ fehlt ganz |
| Store: wer ist in welcher Mannschaft | ⛔ fehlt ganz (keine Tabelle, keine Methode) |
| Admin-Oberfläche (Aufteilung, Wertungsart) | ⛔ fehlt ganz |
| Anzeige der Mannschafts-Rangliste | ⛔ fehlt ganz |
| Wertungsart „Bester Tipp zählt" | ✅ **am 25.08.2026 nachgebaut** — sie fiel vorher still auf „Summe" durch |

⚠️ **Die letzte Zeile war der verräterische Fund und ist erledigt.** Der
Kommentar über `teamLeaderboard` verwies auf ein `teamLeaderboardBester` „für
die Wertungsart Bester" — geschrieben wurde es nie, und `bester` fiel im Code
still auf `summe` durch. Die Wertungsart stand also zur Auswahl, ihr
Hinweistext versprach „je Spiel zählt das beste Ergebnis im Team", und
gerechnet wurde die Summe aller Mitglieder.

Jetzt nimmt `teamLeaderboard` ein viertes Argument `spielPunkte` (aus
`punkteJeSpiel`, engine.js — dieselbe Quelle, die auch die Fremdjoker
benutzen) und rechnet je Spiel den besten Wert des Teams. Fehlt die Liste,
wird NICHT still weitergerechnet: die Zeile trägt `unvollstaendig: true`.
Fünf Tests halten das fest, darunter der, der den Fehler benennt („ist NICHT
dasselbe wie die Summe").

🔴 **Warum das trotz Bau-Stopp richtig war:** eine Wertungsart, die etwas
anderes tut als ihr eigener Hinweistext, ist ein Fehler in der MECHANIK — und
Mechanik ist ausdrücklich erlaubt („Mechanik ja, Platzierung nein"). Ein
falsches Ergebnis ist teurer als ein fehlendes; wäre der Modus später
angeschlossen worden, hätte niemand nachgesehen, ob `bester` auch rechnet,
was draufsteht.

🔴 **NICHT JETZT GEBAUT — und das ist eine Regel, keine Bequemlichkeit.**
Alles außer der ersten Zeile ist Platzierung, und dafür gilt Andis Ansage vom
21.08.2026: erst die Masterdatei, dann wird eingebaut („Mechanik ja,
Platzierung nein"). Wer den Regelblock jetzt in `DEFAULT_RULES` schiebt,
macht außerdem `npm run stufen` rot und müsste die Lücke mit genau der
Oberfläche schließen, die noch nicht platziert werden darf.

**Wenn es drankommt, ist die Reihenfolge:** Regelblock ins Regelwerk
(`DEFAULT_RULES` + `sanitizeRules`) → Store-Mitgliedschaft → Oberfläche →
Rangliste. Die Wertung selbst ist fertig und braucht nichts mehr.

## 🆕 Zwischenabrechnung nach Spielende (Nutzer-Wunsch, 07.08.2026, gebaut)

**Der Wunsch:** abgerechnet wird nach JEDEM einzelnen Spiel, zeitgesteuert; der
Spieler sieht es beim Öffnen der App — und zwar gesammelt für alle Spiele, die
seit seinem letzten Besuch fertig geworden sind.

Gebaut: `src/lib/zwischenabrechnung.js` (Logik), `Zwischenabrechnung.jsx`
(Einblendung im Layout), `prefs.zwischenabrechnung` (voll · dezent · **aus**).

Drei Punkte, die nicht brechen dürfen:

1. **Zeit UND Ergebnis.** Ein Spiel gilt `SPIELDAUER_MIN` (135) nach Anpfiff als
   vorbei — großzügig, weil zu spät harmlos ist und zu früh ein Ergebnis zeigt,
   das es noch nicht gibt. Die Zeit allein genügt aber nicht: ohne vorliegendes
   Ergebnis gäbe es eine Meldung mit 0 Punkten, und die liest sich wie ein
   Fehltipp statt wie ein fehlendes Ergebnis.
2. **Die Marke ist der Stand des LETZTEN abgerechneten Spiels, nicht `jetzt`.**
   Zwischen Aufbau der Liste und Klick liegen Minuten; mit „jetzt" markiert
   würde ein Spiel, das genau dazwischen fertig wird, als gesehen verbucht und
   nie erzählt. Doppelt zeigen ist ärgerlich, verschlucken ist schlimmer.
3. **Beim allerersten Start wird NICHTS erzählt**, nur die Marke gesetzt — sonst
   käme die halbe Saison als „Neuigkeiten".

⚠️ **Was noch fehlt: die Ergebnis-Quelle.** Echt ist bisher nur der Kalender;
Ergebnisse sind erzeugt. Die Mechanik läuft vollständig gegen die erzeugten
Ergebnisse und ist quellen-neutral gebaut (Zeit + `result`), aber im
Live-Betrieb hängt sie daran, dass Ergebnisse überhaupt eintreffen. Das ist
dieselbe austauschbare Stelle wie bei den Quoten.

---

## 🔴🔴 Fremdjoker wirkten auf dem FALSCHEN SPIELTAG — behoben (23.08.2026)

**Der teuerste Fehlertyp dieses Projekts, wieder einmal** (CLAUDE.md,
Runden-Schicht, Frage 2: „Welcher Spieltag ist das?"). Gefunden beim
prüfenden Lesen der eigenen Arbeit, nicht von einem Test.

Die Fremdjoker-Einsätze trugen den **Liga-Spieltag** (`t.matchday`). Der
Verlauf ist aber nach der **chronologischen Position über alle Wettbewerbe**
geordnet. In einer Runde mit einem Wettbewerb ist das dieselbe Zahl — deshalb
ist es nie aufgefallen.

**Gemessen an vier echten Spielen** (bl#1 · bl#2 · cl#1 · cl#2): ein Klau,
gesetzt am **CL-Spieltag 2**, wirkte auf den **Bundesliga-Spieltag 2**. Er nahm
Punkte von einem ganz anderen Tag ab. Fehlgeschlagen ist dabei nichts, kein
Test wurde rot, keine Zahl sah verdächtig aus.

⚠️ **Die naheliegende Reparatur war ebenfalls falsch.** `rundenSpieltagVon`
(zeitachse.js) zählt die Spieltage der ZEITACHSE, und die bündelt anders —
gemessen ergeben 34 Bundesliga-Spieltage **42 Achsen-Positionen**. Mit ihr
landete der Einsatz auf Position 5 von 4, also nirgends.

**Maßgeblich ist `verlaufPositionen(entries)`** (neu in `spieltag.js`): die
Zahl wird aus DERSELBEN Liste abgeleitet, aus der auch der Verlauf entsteht.
Zwei Ableitungen könnten auseinanderlaufen, eine kann es nicht.

### ⚠️ Zwei Skalen, die nie verglichen werden dürfen

| Wo | Welche Zahl | Wer benutzt sie |
|---|---|---|
| **Wertung** | Position im Verlauf (`verlaufPositionen`) | Stores, `Historie.jsx`, `applyDuellJoker` |
| **Prüfung/Anzeige** | Runden-Spieltag der Zeitachse | `Tippabgabe.jsx`, `duellPruefung.js` |

Die Schutzregeln (`maxProZiel`, `immun`, `sperrfristJeZiel`) leben **ganz** in
der zweiten Skala; die Wertung fragt sie nie. Solange das so bleibt, ist beides
in sich stimmig. **Wer eine Schutzregel in die Wertung zieht, muss zuerst diese
Tabelle auflösen** — sonst vergleicht er zwei Zahlen, die dasselbe heißen und
nicht dasselbe sind.

---

## 🔴 EIN BLINDSCHUSS LÖSCHTE DEN GANZEN SPIELTAG (25.08.2026)

**Aus einer Frage von Andi heraus gefunden, nicht aus einem Test:**

*„wenn ich nem anderen ein Spiel sperren will oder ein Fremdjoker mache, muss
ich noch nicht unbedingt gesehen haben ob der des betippt hat, also is nich
unbedingt Voraussetzung Pflicht, weil will nicht so nen engen Zeitplan bei
Tippabgabe und Jokereinsatz verpflichtend machen."*

Die Frage war, ob das Sinn ergibt. Beim Nachmessen kam etwas anderes heraus:

| Fremdjoker auf ein Spiel, das das Ziel **nicht getippt** hat | vorher |
|---|---|
| `wirkung: "punkte"`, Restanteil 0,5 | 200 → **100** |
| `wirkung: "gesperrt"` | 200 → **0** |

Es traf nicht das Spiel, sondern **den ganzen Spieltag**. Ein Blindschuss war
damit ungleich härter als ein gezielter Treffer — und genau der Blindschuss
soll nach Andis Ansage der Normalfall sein dürfen.

🔴 **Die Ursache war eine Zeile, die zwei sehr verschiedene Fälle gleich
behandelte:**

```js
const zielPunkte = … : Number.isFinite(ausSpiel) ? ausSpiel : zielVoll;
```

`zielVoll` (der ganze Spieltag) war als **Übergang** gedacht — für Einsätze
ganz OHNE `matchId`, solange die Store-Anbindung fehlte. Er griff aber auch,
wenn ein Spiel BENANNT war und das Ziel dort nur nichts hatte.

⚠️ **Und es gab einen Test, der das ausdrücklich festhielt**, mit der
Begründung „sonst verschluckte ein Tippfehler in der Spiel-Id den Einsatz
stumm". Die Sorge war berechtigt — **die Abwägung hat sich gedreht**, nicht
die Sorge:

- Seit blind gesetzt werden darf, ist „Ziel hat dort nicht getippt" der
  **Normalfall**, nicht der Ausnahmefall eines Tippfehlers.
- Und als Fehlermeldung taugte der Rückfall ohnehin nicht: **niemand liest
  einen gelöschten Spieltag als Tippfehler**, alle lesen ihn als Regel.

**Behoben, und zwar unterschieden statt pauschal:**

| Lage | jetzt |
|---|---|
| Ziel hat Einzelspiel-Werte, aber nicht für DIESES Spiel | **0** — der Joker ist verbraucht und wirkungslos |
| Ziel hat GAR KEINE Einzelspiel-Werte | **Spieltag** — der benannte Übergang bleibt |

⚠️ Ohne diese Unterscheidung hätte der Fix den Übergang stillschweigend
mitgekippt. Beide Fälle stehen jetzt als Test.

🔴 **Nebenwirkung, die Andis Entwurf trägt:** der blinde Einsatz wird damit zu
einer **Wette** statt zu einem Freifahrtschein. Wer ohne Kenntnis blockt,
riskiert, den Joker zu verschwenden — genau das macht den lockeren Zeitplan
erst spielbar.

---

## 🔴 ZWEI SCREENS STÜRZTEN AB — `Zahl` und `Slider` widersprechen sich (25.08.2026)

**Gefunden beim Durchklicken, nicht von einem Test.** Zwei Stellen der
Spielerstellung zerlegten die Seite, sobald man sie benutzte:

| Wo | Was man tut | Was passierte |
|---|---|---|
| Modifikatoren → „Außenseiter nach Tabelle" | einschalten | weißer Screen |
| Wettbewerbe → Sonderregeln → Tabellenzone | eine Zone anlegen | derselbe |

Beide Male dieselbe Meldung: `Cannot read properties of undefined (reading 'min')`.

🔴 **Die Ursache ist keine Schlamperei, sondern eine Falle im eigenen Haus.**
`Zahl` und `Slider` stehen in DERSELBEN Datei (`Eingaben.jsx`) und benutzen
**gegensätzliche Prop-Namen**:

```
<Slider value={…} min={…} max={…} step={…} />     ← lose Grenzen
<Zahl   wert={…}  limits={{ min, max, step }} />  ← Grenzen im Objekt
```

Wer eben einen `Slider` geschrieben hat und daneben eine `Zahl` setzt,
schreibt `value`/`min`/`max` weiter. `limits` ist dann `undefined`, und
`limits.min` reißt den Render mit.

⚠️ **Weder Test noch Lint konnten das sehen.** `no-undef` prüft Variablen,
keine Props; für Screens gibt es keine Render-Tests. `npm run build` war
grün, alle Tests waren grün, und der Screen war trotzdem weiß — genau der
Fall, für den `npm run lint` einmal eingeführt wurde, nur eine Ebene tiefer.

**Drei Dinge gemacht:**

1. **Beide Stellen berichtigt** (`TabellenBonus.jsx`, `LigaSonderregeln.jsx`),
   im Browser nachgeprüft: einschalten und Zone anlegen laufen ohne Fehler.
2. **`Zahl` fällt nicht mehr um:** `limits = {}` als Vorgabe. Ein falscher
   Aufruf verliert die Grenzen, aber zerlegt nicht den Screen — ein
   Eingabefeld ohne Maximum ist ein Schönheitsfehler, eine weiße Seite ein
   Ausfall.
3. **`src/components/eingaben.test.js`** hält die richtige Form fest, damit
   Punkt 2 nicht zur Ausrede wird. Alle 77 `<Zahl>`- und 27
   `<Slider>`-Aufrufe werden geprüft.

⏳ **Offen: die Namen vereinheitlichen.** Das wären ~104 Aufrufstellen in
einem Zug, mitten in laufender Arbeit an denselben Dateien — deshalb jetzt
der Test statt des Umbaus. **Wenn, dann `Zahl` auf `value`/`min`/`max`
umstellen**, nicht umgekehrt: `Slider` ist häufiger und `min={…}` liest sich
im JSX besser als ein Objektliteral.

---

## 🧩 Andis Detail-Regel bekommt ein Bauteil und eine Messung (25.08.2026)

Seine Ansage vom 24.08. (SA6), ausdrücklich als Dauerregel: *„erstmal die
gängigsten sachen einstellbar und mit einem Detailfenster sogar noch
Feinheiten bzw. maximales Detail einstellbar, was du so bitte auch wirklich
auf alle anderen Einstellbarkeiten anwendest."*

**Nachgesehen statt angenommen:** die Regel war an mehreren Stellen befolgt —
und **jede Stelle hatte ihre eigene Fassung gebaut**. Anderer Pfeil, andere
Farbe, andere Schriftgröße, mal mit Zusammenfassung, mal ohne, mal mit
`aria-expanded`, mal ohne. Genau der Verlauf, den die Eckenradien schon
genommen haben (`rund.test.js`): niemand macht etwas falsch, jede Stelle ist
für sich plausibel, und am Ende sind es acht Varianten.

**Gebaut:** `src/components/Feinheiten.jsx` — ein Titel, eine
Zusammenfassung, ein Klick. Von außen steuerbar, wenn ein Elternteil „immer
nur eines offen" durchsetzen muss.

⚠️ **`zusammenfassung` ist der wichtigste Teil:** eine zugeklappte Feinheit
muss sagen, ob dahinter etwas VERSTELLT ist. Ohne das sieht eine wirksame
Sonderregel aus wie eine unbenutzte — und ein Admin sucht später, warum
seine Runde anders rechnet, als oben steht.

⛔ **Kein `<details>`-Element** (öffnet ohne Übergang, kaum gestaltbar) und
**kein Modal**: Andis Wort „Detailfenster" meint „mehr Tiefe hinter einem
Klick". Ein Modal reißt den Bezug zur Einstellung ab, um die es geht.

**Gemessen:** `npm run detail` — 85 Dateien, 52 sind keine Regel-Oberfläche,
13 ausdrücklich begründet. Stand nach diesem Durchgang: **4 über das
gemeinsame Bauteil** (`KoRunden`, `TabellenBonus`, `Zeitachse`, `Fremdjoker`),
**0 mit eigener Mechanik**, **16 ohne zweite Ebene**.

⚠️ Die 16 sind ein BEFUND, kein Fehler — dieselbe Haltung wie bei `greift`
und `tot`. Sie sollen schrumpfen, nicht sofort leer sein. Für jede gilt:
Feinheit ergänzen oder mit einem Satz in `OHNE_DETAIL` eintragen.

⚠️ **Der Erkenner brauchte drei Anläufe**, und das gehört dazu: `onChange(`
im Rumpf fand 34 Dateien (jedes Eingabefeld der App hat eins), `patch(` im
Rumpf verlor die echten Regel-Bausteine (sie patchen nicht selbst, sie
reichen nach oben). Tragfähig ist erst die SIGNATUR: `({ rules, onChange })`.

---

## 🔔 Rückmeldung: die App sagte nie, dass etwas gespeichert ist (24.08.2026)

**Andis Ansage:** „ich will wirklich das ganze dann in ne richtig professionell
aussehende app mit entsprechender UX haben und flüssige (kleine animationen)
bspw bei neuem fenster laden oder feedback dass eingeloggt und abgespeichert
ist etc…"

🔴 **Der Satz enthält zwei Aufträge, und der zweite war der ganze Fund.**
Bewegung gab es zum Teil schon (Druck, Leuchten, Fenster-Übergänge — G4).
**Rückmeldung gab es nirgends.** Ein Tipp wurde in die Datenbank geschrieben
und der Screen sah danach aus wie davor: der Wechsel auf die
Bestätigungs-Ansicht passiert, BEVOR der Store antwortet, sagt also nichts
darüber, ob das Speichern durchging.

**Gebaut:** `Rueckmeldung.jsx` als SCHICHT, nicht als Hinweis je Screen.
`RueckmeldungProvider` liegt ganz außen im Layout — außerhalb des
`AuthProvider`, weil ausgerechnet der melden können muss („Angemeldet als …").
`useRueckmeldung()` gibt `gespeichert` · `fehler` · `info`.

⚠️ **Warum eine Schicht und nicht je Screen:** ein Speichern-Hinweis, den jeder
Screen selbst baut, sieht überall anders aus und fehlt in dem einen, an den
niemand gedacht hat. Dieselbe Sache wie die zweite Wahrheit in CLAUDE.md — nur
für Gestaltung statt für Zahlen.

**Drei Entscheidungen, die nicht offensichtlich sind:**

1. **Ein Fehler steht länger als ein Erfolg** (5 s gegen 2,2 s). „Gespeichert"
   darf man verpassen, „nicht gespeichert" nicht.
2. **Dieselbe Meldung zweimal stapelt sich nicht, sie erneuert sich.** Zwei
   identische Streifen übereinander sehen nach Fehler aus, nicht nach
   Bestätigung.
3. **Fehlt der Provider, gibt es einen funktionierenden Notbehelf**, keinen
   Absturz. Die Meldung ist Beiwerk, das Speichern ist die Sache — ein
   vergessener Provider darf nicht dazu führen, dass sich kein Tipp mehr
   abgeben lässt. Die Warnung geht in die Konsole.

⚠️ **Der Vorbehalt, der bleibt (UX9):** die Rückmeldung darf nie der einzige
Ort einer Information sein. Wer zwei Sekunden wegsieht, hat sie verpasst. Was
bleiben muss, gehört auf den Screen.

---

## 📱 App-Tauglichkeit: drei Befunde, einer davon aktiv schädlich (24.08.2026)

**Andis Frage:** „wenn man das dann als App für Android und iOS rausbringt,
passt sich das dann an jedes Modell richtig professionell an?"

**Gemessen, nicht geschätzt — die Antwort ist NEIN, noch nicht:**

| Befund | Messwert | Folge auf dem Gerät |
|---|---|---|
| 🔴 **`viewportFit: "cover"` OHNE Safe Areas** | `layout.js:50` setzt es, `safe-area-inset` kommt im ganzen Projekt **0×** vor | Die schlechteste Kombination von beiden. „cover" sagt dem Gerät ausdrücklich „zieh den Inhalt bis unter die Notch" — und ohne die Insets holt ihn niemand zurück. Kopfzeile unter der Dynamic Island, Knöpfe unter dem Home-Indicator |
| ⚠️ **Alle Schriftgrößen in px** | **1202×** `fontSize: <zahl>`, **0×** `rem` | Die Schriftgrößen-Einstellung des Nutzers wird ignoriert. Auf iOS ist „Dynamic Type wird nicht unterstützt" ein bekannter Ablehnungsgrund im App-Review, auf Android eine Barrierefreiheits-Lücke |
| ⚠️ **51 feste `maxWidth`-Stellen** | meist 400 px | Auf Tablets eine schmale Säule mitten im Bild. Für Handys richtig, für „jedes Modell" zu wenig |

⚠️ **Was NICHT das Problem ist:** Capacitor packt die Web-App in eine native
Hülle — das ist der leichte Teil und ändert an keinem der drei Punkte etwas.
Wer nur Capacitor einrichtet, hat eine App, die auf halben Geräten falsch sitzt.

✅ **Alle drei erledigt am 24.08.2026** — die Einschätzung „gehört geplant,
nicht nebenbei gemacht" war beim mittleren Punkt richtig und beim rechten
Aufwand zu vorsichtig:

| Befund | Was gebaut wurde | Messwert danach |
|---|---|---|
| Safe Areas | `body` trägt `env(safe-area-inset-*)` auf allen vier Seiten, dazu `box-sizing: border-box`. Der Meldungs-Streifen rechnet zusätzlich selbst mit dem unteren Inset | `viewportFit: "cover"` bleibt — jetzt ist es die richtige Einstellung statt der schädlichen |
| Schriftgrößen | `TEXT` + `px()` in `theme.js` als die eine Leiter, alles auf `rem` | **1 210 Fundstellen** umgestellt, **0** nackte px übrig. 1 198 lagen schon auf Apples Leiter, 12 Ausreißer eingerastet |
| Feste Breiten | `--tqs-schirm-breite` in drei Stufen: 400 · 480 (ab 700 px) · 560 (ab 900 px) | **22 Stellen in 18 Dateien** |

🔴 **Eine Sperrklinke dazu, nach dem Muster von `rund.test.js`:**
`schriftmass.test.js` (`npm run schrift`) verbietet die nackte px-Schriftgröße.
Der Radien-Test ist genau deshalb entstanden, weil eine ANSAGE („R2 ist der
bevorzugte Radius") den Drift nicht aufgehalten hat — acht Radien waren
trotzdem im Umlauf. Gegen Drift hilft keine Ansage, sondern eine Messung.

⚠️ **Was weiterhin gilt:** Capacitor ändert an keinem dieser Punkte etwas. Es
ist jetzt der leichte Teil, weil die drei schweren davor stehen — nicht, weil
es je leicht gewesen wäre.

---

## 💡 Creator-Codes sind bis zu 4 903 Zeichen lang — ein kürzeres Format wäre möglich

**Gemessen am 24.08.2026** mit `encodePreset`, aufgekommen bei Andis Frage zum
Namensschema („son Gesamtgamecode schnell mal über 200 Zeichen"):

| Regelwerk | Zeichen |
|---|---|
| Vorgabe | 7 |
| Preset „Rangliste" | 159 |
| Charakter „Mutig & wild" | 1 300 |
| **Schaufenster** (188/199 Felder abweichend) | **4 903** |

Fast die Hälfte davon ist EIN Aspekt: `joker` mit 2 315 Zeichen.

**Der Weg, der sich anbietet:** Der Code speichert heute die Abweichung von
`DEFAULT_RULES`. Die meisten echten Regelwerke sind aber Abwandlungen eines
CHARAKTERS — gegen den gemessen wäre das Delta ein Bruchteil.

```
heute    TS2-<Abweichung von der Vorgabe>               4 903 Zeichen
möglich  TS3-<Charakter>-<Fassung>-<Abweichung davon>     ~300 Zeichen
```

⚠️ **Der Preis:** Der Code hängt dann an einem Charakter. Ändert sich dessen
Definition, ändert sich die Bedeutung alter Codes — deshalb müsste die
Charakter-FASSUNG mit im Code stehen, sonst entsteht genau die stille
Verschiebung, vor der die Runden-Schicht warnt.

⏳ **Nicht angefangen.** Steht als ❓6 in `design/namensschema.md` — es ist ein
eigenes Thema, unabhängig davon, ob der Satz-Name je gebaut wird.

---

## 📏 Abdeckung: 188 von 199 Einstellbarkeiten werden vorgeführt — der Rest hat Gründe

`npm run einstellbar` (23.08.2026) beantwortet zwei Fragen, die vorher niemand
stellte: nimmt ein Feld überhaupt einen anderen Wert an, und überlebt er das
Teilen? Die zweite Zahl daneben ist die, um die es Andi ging.

**Beim ersten Lauf: 78 von 199.** 121 Blattfelder wurden NIRGENDS im Projekt
anders gesetzt als in der Vorgabe — nicht in einem Preset, nicht in einem
Charakter, nicht in einer Regler-Stufe, nicht im Schaufenster. Gebaut, geprüft,
teilbar, und von keinem Menschen je vorgeführt.

**Seit dem 23.08.2026: 188 von 199.** Das Schaufenster (`ALLES`) setzt jetzt
jede Einstellung, die sich mit dem verträgt, was die Runde zeigt.

🔴 **Und hier steht der eigentliche Merksatz dieses Abschnitts**, weil an
dieser Stelle vorher das Gegenteil stand: an derselben Stelle hieß es „⛔ die
Zahl NICHT als Ziel behandeln“ — geschrieben von der Session, die die Messung
gebaut hatte, mit einer an sich vernünftigen Begründung (eine Runde, die jeden
Regler verstellt, liest sich niemand durch). Andis Auftrag lautete wörtlich
anders: *„mach die demo runde bzw tests so dass sie alle Einstellbarkeiten
abdeckt.“* **Ein eigener Vorbehalt ist keine Absage an eine Ansage** — er
gehört daneben, nicht davor (CLAUDE.md, „UMFANG NIE EIGENMÄCHTIG KÜRZEN“).

### Die 11 übrigen sind kein Rest, sondern eine Liste mit Gründen

| Wo | Wie viele | Was das heißt |
|---|---|---|
| `SCHAU_AUSGENOMMEN` (schaufenster.js) | 7 | Einstellungen, die einander AUSSCHLIESSEN. `spiele.modus` hat genau einen Wert, und „teams“ zeigt eine andere Runde als „alle“. |
| `GEKOPPELT` (einstellbarkeit.js) | 4 | Felder, die sich ohne ihren Partner gar nicht setzen lassen — `werWert` ohne `wer: abPlatz` ist keine Angabe, sondern ein Missverständnis. |

⚠️ **Die Prüf-Zahl ist deshalb nicht die Abdeckung, sondern `unerklaert`:** ein
Feld, das nirgends vorgeführt wird UND für das niemand einen Satz geschrieben
hat. Sie steht auf 0 und wird von drei Tests dort gehalten.

⛔ **Was weiter gilt:** die Werte im Schaufenster sind DEMO-Werte. Sie behaupten
keine Empfehlung, und nichts davon gehört in `presets.js` oder `charaktere.js`.
Dass `reglerWarnung.pruefe()` auf dieser Runde acht Meldungen wirft, ist der
Beleg, dass die Warnungen greifen — nicht eine Aufgabe, sie stillzustellen.

---

## 🔍 Drei Befunde beim Bau der Fremdjoker (23.08.2026) — alle GEMESSEN

Keiner kam aus einem Test; alle drei aus den Durchgängen und aus dem Nachrechnen
am Rand. Sie stehen hier und nicht im Chat, weil ein Chatverlauf nach dem
Fenster weg ist.

### 1. ✅ ERLEDIGT — `duell.proSpieltag` war wirkungslos, ist angeschlossen

**Andis Entscheidung vom 23.08.2026: mehrere ja, aber auf VERSCHIEDENE Spiele.**
`einsaetzeAusTipps` nimmt jetzt `proSpieltag` entgegen, `fremdEinsaetze` reicht
es aus dem Regelwerk durch. Nachgemessen: drei gesetzte Tipps an einem Spieltag
ergeben bei `proSpieltag` 1 · 2 · 3 jetzt **1 · 2 · 3 Einsätze** in der Wertung
— vorher dreimal einen. „Verschiedene Spiele" braucht keine eigene Prüfung: ein
Fremdjoker wird beim Tippen EINES Spiels gesetzt, und je Spieler und Spiel gibt
es genau einen Tipp.

Der Befund, wie er dastand:



**Gemessen**, nicht vermutet: ein Plan im engstmöglichen Fenster
(`phase: "manuell"`, Spieltag 30–32, `anzahl: 6`) ergibt bei `proSpieltag` 1, 2
und 3 **dreimal dieselben drei Plan-Tage und dreimal drei Einsätze**.

Zwei Gründe, unabhängig voneinander:

- `duellPlan` baut die Tage aus einer MENGE von Spieltagen — ein Spieltag kann
  darin gar nicht doppelt vorkommen, also findet
  `abstandUndProSpieltagAnwenden` nie etwas zu begrenzen.
- Selbst wenn: `einsaetzeAusTipps` lässt „je Spieler UND Spieltag höchstens EIN
  Einsatz" durch. Ein zweiter Einsatz am selben Tag käme in der Wertung nie an.

⚠️ **Warum es keiner der Durchgänge gefunden hat:** `npm run greift` Teil 4
misst beim Duell `zielWahl`, `maxProZiel`, `immun`, `konter` und `kosten` — die
Liste ist von Hand gepflegt, und `proSpieltag` steht nicht darin. Genau die
Lücke, vor der der Kopf des Skripts warnt: *„eine Liste, die schweigt, sieht
aus wie eine ohne Befund."*

**Nicht behoben** — es gehört nicht zu JK4–JK7 und die Antwort ist keine
Kleinigkeit: entweder `proSpieltag` fällt weg (dann ist `anzahl` die einzige
Mengenangabe), oder die Ein-Einsatz-Regel in `einsaetzeAusTipps` wird gelockert.
Das Zweite hängt an Andis offener Frage aus Teil D — *„Darf man auf denselben
Tipp mehrere Handlungen legen?"*

### 1b. Vier Tippziele der Fremdjoker-Oberfläche waren 40 px breit

Im Browser gemessen (375 px, Chromium): die Pillen „An" und „Aus" wurden
44 hoch, aber nur **40 breit** — `TAPZIEL` setzt bewusst nur die HÖHE (die
Begründung steht im Kopf von `tapziel.js`), und bei langen Beschriftungen
genügt das auch. Bei zwei Buchstaben nicht. `Fremdjoker.jsx` und
`DuellJoker.jsx` nehmen jetzt `TAPZIEL_QUADRAT`; nachgemessen: **5 → 1**, und
der letzte ist der 32-px-Stepper, den `tapziel.js` ausdrücklich als Ausnahme
führt.

⚠️ Der Verdacht liegt nahe, dass es weitere kurze Pillen mit `TAPZIEL` gibt.
`npm run sicht` misst das nicht — es fragt nach Anzeige, nicht nach Größe.

### 2. ✅ ERLEDIGT — `tabellenBonus` hatte keinen Messfall in `npm run greift`

Nachgetragen am 23.08.2026: **bewegt 2625 Punkte.** Er brauchte
`fallback: "quote"` — der Tabellenplatz wird beim ÖFFNEN des Spieltags auf dem
Snapshot eingefroren, und im Messfall gibt es keine Tabelle. Genau dafür ist
der Fallback gebaut („ohne diese Wahl wäre er an den ersten Spieltagen still
wirkungslos, und niemand merkt es").

**Damit ist `greift` Teil 3 zum ersten Mal vollständig:** 31 von 41 Blöcken mit
Messfall, 10 ausdrücklich begründet, keiner mehr stumm.

### 3. `wettbewerbe` ist weiter die eine Lücke in `npm run stufen`

Unverändert seit dem 06.08.2026, durch eine Sperrklinke im Test festgehalten.
Der Übergabe-Eintrag im Kanal vom 23.08. sagt „stufen ohne Lücke" — das war
schon damals eine zu freundliche Zusammenfassung.

---

## 🧱 Sondermenüs — der Umbau zur EINEN Ansicht (Andi EB2/EB4, 22.08.2026)

**Reihenfolge ist zwingend: erst alle Sondermenüs, DANN der Umschalter weg.**
Andersherum liegt alles flach auf einer Seite — schlechter als heute.

| Bereich | Stand |
|---|---|
| **Joker** (84 Einstellwerte, fünf Karten) | ✅ `JokerSondermenue.jsx`, Commit `4030f5c` |
| **Modifikatoren** (Derby · Vereine · Big Game · Außenseiter, ein Deckel) | ✅ `ModifikatorenSondermenue.jsx`, Commit `b10d2da` |
| **Wertung** (Nähe, Underdog/Favorit, Kombi, Sieger-Boden, Anzeige & Cutoffs, Märkte, Regler-Feinheit) | ✅ `WertungSondermenue.jsx`, Commit `dee81ed` |
| **Verlauf** (Anschluss halten, Streicher & Saisonverlauf, Spieltag vergessen) | ✅ `VerlaufSondermenue.jsx` |
| **Saison & Zeit** (Saison-Wetten, Zeitachse, Tippfenster, Zeitraum) | ✅ `SaisonZeitSondermenue.jsx` — eigene Zeile (Andi, 22.08.2026). Der Zeitraum steht bewusst hier statt bei der Betippungsauswahl: er beantwortet dieselbe Frage wie Tipp-Fenster und Zeitachse |
| **Mitbestimmung** | ⏳ klein, kann an die Wertung anschließen |
| **Mitbestimmung** und **Alleingang-Bonus** | ⏳ die letzten zwei Einzelabschnitte; beide klein genug, dass eine eigene Zeile sie eher versteckt als ordnet — vor dem Umschalter-Ausbau entscheiden |
| Danach: `AnsichtSchalter.jsx` + Zustand `stufe` entfernen | ⏳ **jetzt dran** — alle fünf Sondermenüs stehen |

**Das Muster steht** und ist zweimal durchgehalten: eine `GrosseZeile` mit
Stand-Anzeige, dahinter entweder Karten (wenn es viele Werte sind) oder
verschachtelte Zeilen (wenn es Unterbereiche sind). Der gemeinsame Deckel
gehört ans Ende, nicht zu einem der Teile. Ein Bereich, der in einem anderen
Menü sitzt, bekommt einen **Verweis statt einer zweiten Kopie**.

## 🔍 Die zwei „Befunde" vom 22.08.2026 — beide waren schon bekannt

🔴 **Lehre für den nächsten Durchgang: erst nachsehen, ob eine Meldung schon
erklärt ist, dann melden.** Beide standen hier zuerst als offene Befunde, und
beide waren beim Nachsehen keine.

1. **`npm run stufen`: `wettbewerbe` nur in der Detailansicht, ohne
   Begründung.** Das ist ABSICHT, und ein Test hält es fest
   (`stufenAbdeckung.test.js`: „die eine verbliebene Lücke ist `wettbewerbe` —
   und die ist bewusst vertagt"). Die Wettbewerbs-Gewichte gehören in den
   Gewichtungs-Durchgang der Endphase; sie vorher mit erfundenen Stufen zu
   belegen wäre Balance-Arbeit an der falschen Stelle.
   ⚠️ Ich hatte am 22.08. eine Begründung in `NUR_PROFI` ergänzt und die Lücke
   damit geschlossen — der Test hat es sofort gemeldet, die Änderung ist
   zurückgenommen. **Die Lücke soll sichtbar bleiben.**
2. **`npm run greift`: `bigGame` und `markets (Picks je Team)` „bewegen
   nichts".** Keine toten Einstellungen, sondern Grenzen des Messfalls — und
   das Werkzeug schreibt es selbst daneben („└ erklärt: …"). Big Game braucht
   einen Tabellenstand, den es am 1. Spieltag nicht gibt; die Picks je Team
   brauchen ein Spiel mit mindestens drei plausiblen Schützen.

   ✅ **Für `bigGame` ist die Blindstelle am 22.08.2026 halb geschlossen.**
   Der Messfall setzt den eingefrorenen Spannungswert jetzt selbst
   (`bigGameWert`), so wie ihn ein geöffneter Spieltag ablegen würde — damit ist
   die WERTUNG gedeckt (bewegt 13 151 Punkte), dazu eine Gegenprobe, dass
   `minSpannung` als Schwelle wirklich sperrt. Neu im Werkzeug: ein Messfall
   darf jetzt „soll nichts bewegen" erklären (`erwartetNull`) — sonst sieht eine
   greifende Schwelle aus wie eine tote Regel.
   ⏳ Offen bleibt der ERSTE Schritt: dass das Öffnen den Wert richtig
   BERECHNET, kann erst eine laufende Saison zeigen (die simulierte beginnt am
   28.08.2026, vorher ist die Tabelle leer). Steht als `hinweis` am Messfall.

## 💰 Monetarisierung — entschieden am 25.08.2026

**Andi hat den Konflikt entschieden, und zwar in die weite Richtung:**
*„ich will keine Funktionen am Gesamten Spiel hinter ner Bezahlschranke, ich
bin darauf aus auf maximale Verbreitung."*

Das alte Modell (Premium schaltet Joker + Joker-Abstimmung frei,
`applyEntitlements` setzte ohne Premium `joker.enabled = false`) ist damit
**abgeräumt** — an fünf Stellen:

| Wo | Was war | Was ist |
|---|---|---|
| `premium.js` | `PREMIUM_FEATURES` mit zwei Einträgen | leer |
| `premium.js` | `applyEntitlements` stutzte den Joker | reicht durch |
| `JokerSondermenue.jsx` | 🔒-Kasten statt des Schalters | Schalter |
| `ModifikatorenSondermenue.jsx` | 🔒-Kasten statt des ganzen Blocks | Block |
| `presets.js` · `Spielerstellung.jsx` | `premium: true` an „Joker" und „Rangliste", 🔒 an der Karte | weg |
| `Profil.jsx` | „diese Funktionen sind gesperrt:" + Liste | sagt, was Premium IST |

🔴 **Die vier Tests, die die Schranke festhielten, sind UMGEDREHT statt
gelöscht.** Sie sichern jetzt, dass sie weg bleibt — `PREMIUM_FEATURES` muss
leer sein, sonst schlagen sie an. Ein gelöschter Test hätte nichts gesichert,
und genau so schleicht sich eine Sperre in einem halben Jahr wieder ein.

⚠️ **`isPremium` und `premium_until` bleiben unverändert.** Premium
verschwindet nicht, es bekommt einen anderen Inhalt: später die
Werbefreiheit — und vor allem eine **Belohnung** (M8/M9).

---

## 🕸️ Der Moat — zweimal besprochen, hier der Stand (25.08.2026)

Andi: *„der Moat bei so ner App ist echt nich groß … ist das halt son
Netzwerkaufbau-Kampagne um Nachahmer direkt zu verhindern."*

Auf meinen Einwand hin präzisiert: *„der Moat ist, dass ich bereits so groß
bin nach kurzer Zeit mit dem Konzept und dass die App so vollständig ist,
keinerlei Wünsche offen lässt, dass es für Nachahmer schlichtweg keinen Sinn
macht einen Klon zu bauen, auch wenn sie vielleicht höhere Ressourcen als ich
haben."*

🔴 **Damit hat er recht, und mein erster Einwand war zu eng.** Vollständigkeit
IST ein Graben, und zwar gerade gegen die mit mehr Ressourcen: ein großer
Anbieter klont keine Nischen-App mit 199 Einstellungen — der Aufwand steht in
keinem Verhältnis zum Markt. Das ist der klassische Graben eines Kleinen.

⚠️ **Was ich trotzdem danebenstelle, weil es ändert, wofür Geld ausgegeben
wird:** „alle anderen sind schlechter, es gibt keinen Grund zu wechseln" ist
**Produktüberlegenheit plus Wechselkosten**, nicht ein Netzwerkeffekt. Der
Unterschied ist kein Wortstreit, sondern ein anderer Verteidigungsplan:

| | verteidigt man mit | wer kann das? |
|---|---|---|
| Netzwerkeffekt | **Wachstum** — Reichweite, Kampagne, Geld | der mit dem größeren Budget |
| Überlegenheit | **Vorsprung** — weiterbauen, schneller sein | ein Einzelner |

Andi hat selbst geschrieben, dass man so etwas heute schnell kopieren kann.
Dann ist „schnell groß werden" ein Rennen, das der mit mehr Geld gewinnt —
und der **Vorsprung** ist der Teil, der ihm gehört.

---

### 🔴 Der Punkt, der daraus für die Bauarbeit folgt

**Der Moat wird gerade nicht von Nachahmern angeknabbert, sondern von innen.**

„Keine Wünsche offen" gilt nur für das, was ein Nutzer auch FINDET. Allein am
24./25.08.2026 gemessen:

| Fund | was er heißt |
|---|---|
| **16 Regel-Oberflächen ohne zweite Ebene** (`npm run detail`) | Tiefe da, nicht erreichbar |
| **16 Avatare + `AvatarKreis`** — ausdrücklich fürs Leaderboard geschrieben, dort nie benutzt | gebaut, nie gefragt |
| **Zwei Screens, die beim Anklicken abstürzten** | Build grün, Tests grün, Lint grün — Screen weiß |
| historisch: `autoTip.js`, die WEN-Achse, `spieltagsPunkte` | dasselbe Muster, sechsmal an EINEM Tag |

Das ist alles Vollständigkeit, die bezahlt und nicht bekommen wurde. **Ein
Nachahmer, der die einfache Fassung sauber ausliefert, schlägt eine tiefe
Fassung, in der die Tiefe nicht ankommt.**

🔴 **Deshalb sind `npm run tot`, `npm run detail` und `npm run greift` keine
Hygiene, sondern Moat-Arbeit.** Jeder Fund dort ist Vorsprung, der schon
bezahlt ist und nur noch angeschlossen werden muss — die billigste Form von
Vorsprung, die es gibt.

⚠️ Und die drei aus der ersten Fassung dieses Abschnitts bleiben gültig, sie
sind nur nicht mehr der Widerspruch, sondern die Ergänzung: die
**Regelwerk-Bibliothek** (Inhalt, der sich anhäuft), die **gespielte
Geschichte** (Wechselkosten) und die **Tiefe** selbst.

## ⛔ ENDPHASE — hier steht, was ERST GANZ AM SCHLUSS drankommt

- ⚠️ **Die Balance-Ampel sagt „Nicht mitgerechnet: Duell-Joker (Klau und
  Block)".** Seit dem 23.08.2026 sind es VIER Fremdjoker; Trittbrettfahrer und
  Gegenwette fehlen in dem Satz genauso. Der Text ist damit nicht falsch,
  sondern unvollständig. ⛔ **Nicht jetzt anfassen** — `balanceSim.js` und die
  Ampel bleiben, wie sie sind (CLAUDE.md). Hier vermerkt, damit es beim
  Balancing nicht neu entdeckt werden muss.

**Nicht anfangen. Nicht messen. Nicht melden.** Ausdrückliche Anweisung von
Andi, mehrfach wiederholt; die verbindliche Fassung steht ganz oben in
`CLAUDE.md`. Dieser Abschnitt existiert, damit solche Punkte einen Platz haben,
an dem sie NICHT als nächster Schritt gelesen werden.

- **Balancing insgesamt.** Welche Zahlenwerte die Variablen entlang der
  Möglichkeiten (Spieltags-Ereignisse, Joker, Wirkungen, Geltungen …) haben
  sollen, und wie das auf die Wahl der Spiele, Wettbewerbe und Mannschaften
  abgestimmt wird. Das Ziel ist eine **Empfehlung in Form konkreter Zahlen je
  Einstellung** — bewusst grob (2 %/5 %-Schritte), mit Beispielwerten. Es geht
  erst, wenn das Gehäuse steht; vorher ist jede Zahl Zwischenarbeit.
- **`balanceSim.js` vollständig machen.** Der Simulator rechnet zwei der vier
  Schritte, die `scoreLeaderboardHistory` rechnet (Saisonform, Aufholen); die
  Ereignis-Wirkungen und der Duell-Joker fehlen, dazu die Store-Ebenen
  (Drehrad, Saison-Wetten, Versäumnis). Seit 07.08.2026 **sagt die Ampel das
  wenigstens dazu** (`NICHT_SIMULIERT`, Stufe `unbekannt`) — damit ist der
  Punkt für die Bauphase abgehakt. Der richtige Weg später ist NICHT, die
  fehlenden Schritte im Simulator nachzubauen (dann stünde die zweite Fassung
  nur vollständiger da und wanderte wieder ab), sondern ihn dieselbe Kette
  benutzen zu lassen wie die Wertung.

## Erledigt (alles auf `main`, Stand fb82eab)
- QT-Design-Spec (`design/reaktions-clips.md`)
- Joker/Gewichtung: Einzel- + Ranking-Modus, Skalierungs-Empfehlung
- Profile: Anzeigename + vorgefertigte Avatare (`src/lib/avatars.js`)
- Premium-Gate (`src/lib/premium.js`) — nur Admin braucht Premium
- Ranking-Modus: Eindeutigkeit der Gewichte je Spieltag
- Joker-Abstimmung (`src/lib/voting.js`) — Runde entscheidet, welche Spieltage
- Historie & Rekorde (`src/lib/records.js`) inkl. Preset-Was-wäre-wenn + Plot
- **Balance-Simulator** (`src/lib/balanceSim.js`) — Tipper-Population, misst ob
  der Kenner gewinnt (nicht Zocker/Favorit); Presets darauf neu ausbalanciert
  (`presets.balance.test.js` sichert das ab)
- **Team-/Derby-Regeln** (`teamMods` in engine, `DERBYS` in `bundesligaData.js`)
  — additive Modifikatoren mit Deckel (`modCap`), Balance nachgemessen
- **Aufhol-Mechanismus** (`src/lib/catchup.js`) — Anschluss-Bonus, drei Stufen,
  Balance-Prüfung im Simulator (`aufholFlipQuote`), Admin-UI + Leaderboard-Anbindung
- **Design-Ebene** (`src/lib/theme.js`) — eine Quelle für Farben/Schrift
  (Account 1 hat darauf die Fanfarben-Umschaltung gebaut)

### Dazugekommen 29.07.–03.08. (Account 2)

Der Joker-Baukasten und der Wettmodus. Kurz gehalten — die Begründungen stehen
in den Specs, der Verlauf im Nachrichten-Log von `COORDINATION.md`.

- **Joker-Ökonomie**: `duellJoker` · `jokerBudget` · `limitKlassen` ·
  `jokerBasis` (13 Dimensionen inkl. Abklingzeit) · `jokerBibliothek` ·
  `aufwand` · `drehrad` · `spannung` — alle an `engine.js` angeschlossen und
  über fünf Oberflächen-Bausteine erreichbar.
- **Creator-Code auf Delta** (`TS2-`): 3338 → 62 Zeichen beim Standard-Preset.
- **Teilbibliotheken** (`teilbibliothek.js`, `TS2A-`): einzelne Aspekte teilen.
  Alle neun Aspekte kuratiert, 39 Einträge.
- **L5 Dämpfer** — Modifikatoren können unter 1: Vereine, Derby UND
  Wettbewerbe (`design/joker-inventar.md` 4.5).
- **L2 variabler Einsatz** — dritter `joker.modus`, samt Mindest-/Höchsteinsatz,
  Skippen und Deckungsplanung. Bedienbar in Spielerstellung und Tippabgabe.
  → `design/einsatz-joker.md`, `design/wettmodus.md`
- **Zwei Währungen**: 🃏 Narren (Shop) · 🪙 Münzen (Einsatz).
  → `design/waehrungen.md`. Münzstand in Tippabgabe, Hub und Schnellmenü.
- **Format an einer Stelle** (`format.js`), **Zahleneingabe an einer Stelle**
  (`Eingaben.jsx` — vorher fünf auseinandergelaufene Kopien).
- **Drei Wächter-Tests**: `uiTexte` (sichtbare Katalogtexte, in beide
  Richtungen) · `reglerRaster` (0,05-Raster) · `format`.

🔴 **Und ein Befund, der wie eine Erledigung aussieht, aber keiner ist:**
`design/kontaktstellen.md` — **sieben Prüffunktionen haben null Aufrufer im
Spielbetrieb**. Die Module sind gebaut, getestet und einstellbar; im laufenden
Spiel fragt sie niemand ab. Das ist der Vorlauf für jede Balance-Messung.
**Wer diese Liste als „fertig" liest, baut auf Sand.**

**Nur Spec, noch nichts gebaut:** — (die Liste ist abgearbeitet).

### Dazugekommen 04.08. (Account 1)

- **Münz-Takt** ✅ (`src/lib/muenzTakt.js`, `wettmodus.md` 3) — WIE OFT der
  Wettmodus Münzen ausschüttet. Gebaut als Schlüssel-Funktion über den
  Spieltags-Schlüssel (Bauart `rundenSchluessel`), dadurch gelten Budget,
  Höchsteinsatz und Deckungsrechnung automatisch für die Periode, ohne dass
  die Einsatz-Logik angefasst wurde. Katalog + Perioden aus `jokerBudget.js`,
  Saison-Fenster aus `duellJoker.js` — nichts dupliziert.
  Verkabelt in `muenzstand.js`, `Tippabgabe.jsx`, `Waehrungen.jsx`,
  `Spielerstellung.jsx`.
- 🔴 **Dabei aufgefallen: der WETTMODUS SELBST kam in Stufe 1 und 2 gar nicht
  vor.** Kein Charakter und keine Klartext-Stufe hat ihn je gesetzt — nur die
  Profi-Ansicht kannte ihn. Nachgezogen: Charakter „Wettbüro" (Stufe 1) und
  zwei Stufen an der Joker-Frage (Stufe 2). **Wer eine neue Ebene baut, prüft
  bitte beide Stufen mit** — die Profi-Ansicht wächst von allein, die anderen
  beiden nicht.
- Zwei Fehler aus dem Nachrechnen, nicht aus den Tests: die Konflikt-Prüfung
  maß gegen einen Spieltag statt gegen die Periode (ein echter Konflikt wäre
  nicht gemeldet worden), und der Warntext sagte danach „im Spieltag", während
  die Zahl vier zählte.

- **Regel-Abstimmung & Verfassung** ✅ Schritte 1–5 (nur das Einhängen in die
  Wertung fehlt)
  (`src/lib/regelAbstimmung.js`, `design/abstimmung-verfassung.md`) — die
  Runde beschließt Änderungen AM REGELWERK, der Admin legt mit der Verfassung
  den Rahmen fest, den auch eine Mehrheit nicht bricht. Reine Logik:
  `zaehleAus`, `wirktAb`, `verstoesstGegenVerfassung`, `konflikte`.
  Eingebunden in `engine.js` (Vorgaben + `sanitizeRules`), `presetMerge.js`
  (zehnter Aspekt `mitbestimmung`) und `teilbibliothek.js`.
  Stufe 2 („Wer darf die Regeln ändern?") steht, Stufe 1 ist ausdrücklich
  begründet ausgelassen.
  Dazu: Store (`createAntrag`/`listAntraege`/`saveAntragStimme`, Tabellen
  `rule_proposals`/`rule_proposal_votes` samt RLS), Profi-Ansicht
  (`Mitbestimmung.jsx`), Antrags- und Abstimmungs-Screen (`/regeln`) und
  `src/lib/beschluss.js` für die Wirkung.
  🔴 **Der Kniff bei der Wirkung:** es gibt kein „Regelwerk aktualisieren",
  sondern `regelwerkAmSpieltag(...)` — die Frage lautet immer „welches
  Regelwerk gilt an Spieltag N?". Damit ist die Rückwirkung STRUKTURELL
  unmöglich statt nur verboten.
  ✅ **Auch in der Wertung angekommen:** `regelnFuer` läuft durch
  `scoreLeaderboard`, `scoreLeaderboardHistory`, `applyCatchup` und beide
  Stores. Nachgemessen durch den ganzen Weg (Test in `store.test.js`).
  🔴 **Dabei ein Fund, der schwerer wiegt als die ganze Aufgabe:** die
  Zeitachse fiel über den echten Katalog auf DREI Runden-Spieltage zusammen —
  der automatische Taktgeber (MLS, drei Spieltage) endete, und der Rhythmus
  lief nicht weiter. Joker, Ranglisten-Pool und Münz-Takt hätten dreimal pro
  Saison gegriffen statt achtunddreißigmal. Behoben in `zeitachse.js`, samt
  Eintrag in `CLAUDE.md`.
  ⚠️ **Nutzer-Aufgabe:** `supabase/schema.sql` erneut ausführen (idempotent),
  sonst fehlen live zwei Tabellen.

- **Glücksrad als SVG** ✅ (`src/lib/radGeometrie.js`, `Gluecksrad.jsx`,
  `drehrad.md` 3c) — prozedural aus der Feldliste, keine vorgerenderten Clips.
  Die Winkel liegen im Lib und sind geprüft: `segmentUnterZeiger` ist die
  Umkehrung von `zielWinkel` und existiert allein, um zu BEWEISEN, dass unter
  dem Zeiger das gezogene Feld landet und nicht der Nachbar.
  ✅ **Auch der Spieler sieht es jetzt** (`MeinRad.jsx`, Route `/rad`): kein
  Knopf „drehen", der Ausgang steht ohnehin fest — die Ansicht rechnet nach.
  🔴 **Dabei ein Fund:** beide Stores reichten dem Rad den LIGA-Spieltag statt
  des RUNDEN-Spieltags; „kein Rad ohne Tipp" prüfte damit den falschen Tag,
  und `spieltage: 34` ließ die letzten acht Runden-Spieltage ohne Drehung.

- **Alle fünf Teil-Wirkungen aus `design/kontaktstellen.md`** ✅ — darunter
  zwei, die keine Anzeigefehler waren, sondern echte: `standAmTag` zahlte auf
  einen Tabellenstand aus der ZUKUNFT, und `wer: "adminFreigabe"` lehnte
  überall ab, weil es keinen Speicherort gab.
  ⚠️ **Nutzer-Aufgabe:** `supabase/schema.sql` erneut ausführen
  (`admin_freigaben` ist dazugekommen).

- **Balance-Simulator sieht zwei bisher blinde Ebenen** ✅
  (`design/blindstellen-balancesim.md` 3.1 + 3.2): Saisonform und
  Joker-Grundform. 🔴 Zwei Messergebnisse daraus: **acht Streichresultate
  lassen den Zocker vor dem Kenner gewinnen**, und die Quoten-Bedingung am
  Joker ist eine Klippe, kein Regler — dosieren lässt er sich über die
  Abklingzeit.

Test-Stand: **1897 grün**, Build sauber (Stand 2026-08-05).
Vorher **1671 grün** (Stand 2026-08-03).
Vorher stand hier **933 grün (28.07.)** — über eine Woche still, während die
Suite um 738 Tests gewachsen ist. Genau die Drift, vor der der Kasten unten
zweimal warnt; diesmal ist sie mir selbst passiert.

> ⚠️ **Diese Datei war am 27.07. deutlich veraltet.** Mehrere Abschnitte standen
> als „NEU" oder „offen" da, obwohl der Code längst lag — wer sie als
> Arbeitsliste liest, baut Dinge ein zweites Mal. Nachgezogen: die drei
> Komplexitätsstufen, die Ertragsquellen, die Joker-Typen, das zusammengeführte
> Joker-Kontingent, die Listen-UI der Spielauswahl, die klebende Balance-Ampel
> und der automatische Big-Game-Auslöser.
> **Wer etwas fertig macht, trägt es bitte sofort hier ein.**
>
> **Zweiter Durchgang am 28.07.** — wieder standen fertige Dinge als offen da:
> Per-Team-/Derby-Regeln, der Aufhol-Mechanismus (beide sogar doppelt: oben als
> erledigt, unten als „NEU") und der Versand der Benachrichtigungen
> (`zustellung.js`). **Die Ursache ist strukturell:** ein Abschnitt beschreibt
> zuerst den ENTWURF und wird beim Bauen nicht umgeschrieben. Deshalb steht die
> Erledigung jetzt jeweils als kurzer Block GANZ OBEN im Abschnitt, und der
> Entwurf bleibt darunter als Begründung stehen — statt ihn zu löschen, denn
> das WARUM ist das eigentlich Wertvolle daran.

## Offen

### 🔴 Reihenfolge, vom Nutzer festgelegt (05.08.2026)

Gewichtung und Balance kommen **zuletzt**. Davor, in dieser Folge:

1. **Baukasten vollständig** — jede Einstellung in allen drei Stufen, und sie
   greift.
2. **Alle Anzeigen WÄHREND der Runde** — nicht nur die Admin-Ansicht beim
   Anlegen.
3. **Jeder erzeugte Wert wird in JEDER Anzeige wahrheitsgemäß ausgegeben** —
   derselbe Wert darf in Aufschlüsselung, Verlauf, Leaderboard, Vorschau und
   Rundenansicht nicht verschieden dastehen. Das ist eine Vollständigkeits-,
   keine Balance-Frage.
4. **Dann Gewichtung, bewusst grob** — Stufen von 2 % / 5 % nach oben (eine Liga
   ~20 % höher, ein Joker nach Anzahl abgedeckter Spiele, ein Ereignis-Spieltag
   mit besonderen Quoten). Die Quoten kommen aus den Spielständen.

⚠️ „Gewinnt der Kenner?" ist damit **kein Abnahmekriterium** mehr für neue
Bausteine. Der Simulator bleibt für die Frage „**sieht er die Ebene
überhaupt**" — greift die Einstellung messbar. Blindstellen 3–5 sind
zurückgestellt. Begründung im Nachrichten-Log von `COORDINATION.md`,
Eintrag 2026-08-05 (IV).

### ⏱️ Hobby-Tarif: 10 Sekunden Zeitlimit — trifft `/api/matchday/auto` (20.08.2026)

**Gefunden bei der Recherche nach Vercel-Alternativen, nicht gesucht.** Auf dem
Vercel-GRATIS-Tarif haben Funktionen **10 s Zeitlimit** (Pro: deutlich mehr).
Da Andi keinen Zugang mehr zu einer Kreditkarte hat, läuft Pro aus — das Limit
wird also bald gelten.

**Warum das gefährlich ist:** `/api/matchday/auto` liest ALLE Runden, sucht die
fälligen Spieltage, baut je Wettbewerb den Tabellenstand und schreibt die
Snapshots. Reißt das die 10 s, scheitert der Lauf **still**: kein Spieltag
öffnet sich, kein Big-Game-Wert wird eingefroren, und es gibt keine
Fehlermeldung, die jemandem auffiele. Genau das Muster, das hier schon dreimal
Geld gekostet hat.

⚠️ **Nicht schätzen — messen.** Der Lauf hängt an der Zahl der Runden und der
Spiele, beides wächst. Vorschlag:
1. Die Route misst ihre eigene Dauer und schreibt sie in die Antwort
   (`{ dauerMs }`) — dann steht die Zahl im Vercel-Log, statt geraten zu werden.
2. Grenze setzen: über ~7 s eine Warnung ausgeben, damit es auffällt, BEVOR es
   reißt.
3. Falls es reißt: die Arbeit stückeln (ein Wettbewerb pro Lauf, 5 statt 1
   Cron-Trigger gibt es auf Hobby nicht — also eher: pro Lauf nur den
   dringendsten Spieltag öffnen und beim nächsten Lauf weiter).

**Alternativen, falls es wirklich klemmt** (alle ohne Kreditkarte, geprüft
20.08.2026): Cloudflare Workers (5 Cron-Trigger, beliebige Frequenz,
unbegrenzte Bandbreite — Next.js braucht dort einen Adapter), Netlify
(geplante Funktionen, ebenfalls 10 s). **Ein Umzug lohnt sich erst, wenn die
Messung ihn begründet** — vorher ist er Aufwand ohne Gegenwert.

### 📧 Anmelde-Mail: eigener SMTP-Versand ist ein LAUNCH-Blocker (08.08.2026)

**Der Befund:** Supabase lässt auf dem Gratis-Tarif die Mail-Vorlagen nicht
bearbeiten („Set up custom SMTP to edit templates"). Damit ist `{{ .Token }}`
nicht in die Mail zu bekommen — der sechsstellige Anmelde-Code, der in
`CLAUDE.md` und in mehreren Übergaben als „Andi muss nur die Vorlage ergänzen"
stand, war **nicht herstellbar**, nicht bloß unerledigt.

✅ **Sofort behoben, ohne Supabase anzufassen:** das Anmelde-Feld nimmt jetzt
auch den KOPIERTEN LINK aus der Standard-Mail (`src/lib/anmeldung.js`); in ihm
steckt derselbe Token als `token_hash`. Damit funktioniert die Anmeldung in der
Home-Bildschirm-App wieder.

🔴 **Was trotzdem offen bleibt und vor dem 28.08. erledigt sein muss** —
nachgeschlagen am 09.08.2026, nicht vermutet:

> Der eingebaute Versand schickt **nur an Adressen, die Mitglied der
> Supabase-Organisation sind**; alle anderen scheitern mit „Email address not
> authorized". Dazu **2 Mails pro Stunde**.

**Das heißt: Mitspieler können sich heute gar nicht anmelden.** Andi bekommt
seine Mail nur, weil ihm das Projekt gehört. Mit eigenem SMTP sind es 30 neue
Nutzer pro Stunde.

⚠️ **Ein Supabase-Abo hilft dagegen NICHT** und wird auch für die Vorlagen
nicht gebraucht: seit 03.06.2026 dürfen neue Gratis-Projekte die Vorlagen nur
mit eigenem SMTP ändern — der ist auf dem Gratis-Tarif erlaubt. Pro (~25 $/Mon)
kauft an dieser Stelle nichts dazu.

**Entscheidung des Nutzers (09.08.2026): eigene Domain + Brevo.** Grund für die
Domain: Post „von @icloud.com" über einen fremden Versender landet leicht im
Spam, und die App soll ohnehin nicht dauerhaft `…vercel.app` heißen.

⚠️ **Was beim Domain-Wechsel mitwandern muss** (sonst zeigen die Anmelde-Links
weiter auf die alte Adresse): Supabase → Authentication → **URL Configuration**
→ Site URL **und** Redirect URLs. Im CODE steht nichts fest verdrahtet —
`emailRedirectTo` liest `window.location.origin`, die App zieht also von selbst
mit. Und: die Kachel auf Andis Home-Bildschirm zeigt auf die ALTE Adresse und
muss einmal neu abgelegt werden.

**Nebeneffekt, der die eigentliche Belohnung ist:** mit eigenem SMTP werden die
Vorlagen bearbeitbar, und dann kann der sechsstellige Code doch noch in die
Mail. Das Eingabefeld kann beides schon (`src/lib/anmeldung.js`).

### 📱 Tippziele: ALLE DREI STUFEN sauber (08.08.2026) — ✅ erledigt

Gemessen bei 390 px (iPhone 14), Tippziele unter 44 px:

| Stufe | vorher | nachher |
|---|---|---|
| einfach | 18 | **0** |
| anpassen | 17 | **0** |
| profi | 113 | **0** |

**Wie, ohne die Kachelwand:** `src/lib/tapziel.js` — eine Konstante `TAPZIEL`
(`minHeight: 44`), die in die vorhandenen Inline-Styles gespreizt wird, dazu
`TAPZIEL_QUADRAT` für quadratische Knöpfe. Die 113 zu kleinen Knöpfe kamen aus
nur **29 Code-Stellen** in 14 Dateien; jede rendert vielfach. Deshalb war es
auch kein Kahlschlag: die dichten Modus-Reihen bleiben Reihen, sie sind nur
hoch genug.

⚠️ **Warum keine globale CSS-Regel** (`button { min-height: 44px }`), obwohl
sie eine Zeile wäre: `min-height` schlägt `height` — aus dem 30×30-Stepper
würde ein 30×44-Streifen, und jeder Text-Link im Fließtext bekäme eine
Kastenhöhe mitten im Satz. Die Begründung steht in `tapziel.js`, damit sie
nicht bei der nächsten „Vereinfachung" verloren geht.

**Für jeden neuen Knopf:** `style={{ ...TAPZIEL, … }}`.

✅ **Nachgezogen am 09.08.2026: die SPIELER-Screens sind ebenfalls durch.**
Gemessen wurden **alle 26 Routen** bei 390 px (die Seiten in einem 390er
`iframe` geladen und darin gezählt — deutlich schneller als 26-mal navigieren).

| | vorher | nachher |
|---|---|---|
| `/historie` | 10 | 0 |
| `/einstellungen` | 15 | 0 |
| `/benachrichtigungen` | 6 | 0 |
| `/explorer` | 9 | 0 |
| `/farben` | 11 | 0 |
| `/spott` · `/abrechnung` · `/tippen` · `/ranking` · `/hub` · `/menu` · `/` · `/konto` · `/fahrplan` · `/datenschutz` · `/impressum` | je 1–4 | 0 |
| `/saison` `/rad` `/joker` `/profil` `/abstimmung` `/beitreten` `/regeln` `/freigaben` `/ranking/verlauf` | 0 | 0 |

🔴 **Zwei Stellen bleiben absichtlich klein, und sie stehen namentlich in
`src/lib/tapziel.js`:** die 17 Glossar-Begriffe in `/tutorial` (`Begriff.jsx`)
und „Mein Konto" in `/datenschutz`. Beide stehen MITTEN IM SATZ — eine
44-px-Kastenhöhe machte aus jedem Absatz eine Treppe. **Wer sie beim nächsten
Durchgang findet, hat nichts entdeckt.**

⚠️ **Die Unterscheidung, die dabei gelernt wurde:** ein Link, der ALLEIN in
einer Zeile steht („Verlauf →", „Impressum", „wechseln"), ist KEIN
Fließtext-Link, auch wenn er wie einer aussieht. Er wird angetippt, also gilt
die Grenze — mit `display: inline-flex`, weil `min-height` an einem reinen
Inline-Element nicht greift.

<details><summary>Ursprünglicher Eintrag (Stand vor dem Profi-Durchgang)</summary>

**Erledigt:** die Spielerstellung in Stufe „einfach" hatte bei 390 px Breite
**18 Tippziele unter 40 px**, jetzt **0** — der Umbau auf große Zeilen
(Andis Layout, Schritt 1) hat dreizehn davon von selbst abgeräumt, der Rest
kam über `minHeight: 44` an Chips, Schaltern und Knöpfen.

**Offen, und nicht nebenbei zu machen:** dieselbe Messung in der **Profi-Stufe**
zählt rund **110** zu kleine Ziele. Das sind die Regler- und Modus-Kataloge
quer durch `JokerGrundform.jsx`, `LimitKlassen.jsx`, `Drehrad.jsx`,
`Ereignisse.jsx`, `WettbewerbGewichte.jsx` und die Stepper in
`Spielerstellung.jsx` selbst — überall dieselbe Bauform: eine Reihe kleiner
Modus-Knöpfe à 22–30 px.

⚠️ **Nicht durch stumpfes `minHeight: 44` erledigen.** Bei acht Modus-Knöpfen
nebeneinander wird daraus eine Wand aus Kacheln; hier gehört dieselbe Frage
gestellt wie in Schritt 1 — welche dieser Reihen ist überhaupt eine Reihe, und
welche wäre eine Zeile mit Stand (`GrosseZeile` in `Spielerstellung.jsx`).
Messbefehl, damit niemand raten muss:

```js
[...document.querySelectorAll('button,a')].filter(el=>{const b=el.getBoundingClientRect();return b.height>0&&b.height<40;}).length
```

</details>

### 🔴🔴 DIE SPIELAUSWAHL KOMMT IN DER RUNDE GAR NICHT AN — ✅ BEHOBEN (09.08.2026)

**Behoben am selben Tag.** Die ganze `rules.spiele` wird beim Anlegen auf der
Runde eingefroren (`rounds.spiele`), und `rundenSpiele(matches, round)` in
`roundStatus.js` ist die EINE Stelle, die sie anwendet — alle elf Aufrufer in
beiden Stores und im Hauptmenü gehen darüber.

```
                     Regelwerk   Runde vorher   Runde jetzt
nur Bundesliga            306          1943           306  ✅
nur CL ab Achtelfinale     15          1943            15  ✅
nur Spieltag 30–34        240          1943           240  ✅
Sonderregeln je Liga     1637          1943          1637  ✅
feste Vereinsliste         85            85            85  ✅
```

🔴 **Drei Punkte, die nicht aufgeweicht werden dürfen:**
1. **EINGEFROREN, nicht live gelesen.** Eine Runde kann ihr Regelwerk per
   Abstimmung ändern; ein Beschluss darf nicht rückwirkend ändern, welche
   Spiele je dazugehört haben — samt der Tipps darauf. Dieselbe Kante wie beim
   Quoten-Snapshot.
2. **Bestehende Runden ändern sich NICHT.** Sie haben `spiele = null` und
   laufen weiter über `team_filter` (Rückfall in `rundenSpiele`). Damit ist
   Andis Frage nach der laufenden Runde beantwortet: es passiert nichts.
3. **Ein übergebener `teamFilter` gewinnt** über die Vereinsliste im
   Regelwerk (`rundenAuswahl`) — „die Runde gewinnt", CLAUDE.md. Beim ersten
   Anlauf hat genau diese Zusammenführung gefehlt, neun Tests haben es
   gemeldet.

**Die Messung steht jetzt in `npm run greift` (Teil 4)** und setzt bei einer
Abweichung den Exit-Code. Sie kann damit nicht mehr still zurückfallen.

⚠️ **Andi muss `supabase/schema.sql` einmal ausführen** — die Spalte
`rounds.spiele` fehlt sonst live, und `createRound` schlägt fehl. Das Schema
ist idempotent.

<details><summary>Der ursprüngliche Befund</summary>

**Der größte Fund seit dem 05.08., und er ist gemessen, nicht vermutet.** Eine
Runde bestimmt ihre Spiele AUSSCHLIESSLICH über `rounds.team_filter` — eine
flache Vereinsliste. Alles andere aus `rules.spiele` verdampft beim Anlegen:

```
Regelwerk sagt          Runde liefert
nur Bundesliga             306                1943   ⚠️
nur CL ab Achtelfinale      15                1943   ⚠️
nur Spieltag 30–34         240                1943   ⚠️
Abstiegskampf BL          1637                1943   ⚠️
```

**Warum es niemandem auffiel:** die Spielerstellung zeigt die richtige Zahl —
sie rechnet mit `filterSpiele`. Der Store rechnet mit `filterMatchesByTeams`
über `team_filter`. Beide Seiten sind für sich korrekt, und `npm run greift`
prüft, ob eine Einstellung die WERTUNG bewegt, nicht ob sie die
Spielmenge der Runde bewegt. Exakt das Muster der 17 Funde vom 05.08.

⚠️ **Betroffen ist damit auch Schritt 3 vom 08.08.** (`jeWettbewerb`, `zonen`):
die Logik ist gebaut, getestet und einstellbar — und wird von der Runde nicht
gefragt. Dieselbe Sorte Befund wie `autoTip.js` seinerzeit.

**Der Weg, so wie ihn `listRoundMatches` schon vorgibt:**
1. Beim Anlegen die GANZE `rules.spiele` auf der Runde festhalten, nicht nur
   die Vereinsliste. `team_filter` bleibt für Altrunden lesbar.
2. `listRoundMatches` filtert mit `filterSpiele(alle, round.spiele ?? aus
   team_filter abgeleitet)`. **Eine Stelle**, wie bisher — sie rechnet nur
   richtig.
3. `store.supabase.js` mit (`rounds` braucht eine Spalte, `schema.sql` ist
   idempotent), sonst laufen Mock und Live auseinander.
4. Danach messen, nicht hoffen: das Skript oben gehört als Teil in
   `npm run greift`, damit „die Auswahl greift" eine Zahl hat.

⚠️ **Vorher klären**, weil es eine Fairness-Kante ist: was passiert mit einer
LAUFENDEN Runde, deren Spielmenge sich dadurch ändert? Tipps auf Spiele, die
plötzlich nicht mehr dazugehören, dürfen nicht still verschwinden.
→ **Beantwortet:** gar nichts. Bestehende Runden haben `spiele = null` und
laufen weiter über `team_filter`.

</details>

### 🔴 Ereignisse: der Trost-Joker war nicht angeschlossen (06.08.2026) — ✅ behoben

Dritter Fund derselben Sorte wie beim Versäumnis (`autoTip.js`) und beim
Runden-Spieltag: **gebaut, getestet, einstellbar — und von niemandem
aufgerufen.**

`ereignisse.auswerten()` nimmt `spieltagsPunkte` entgegen und wertet ohne sie
den Trost-Joker („Letzter am Spieltag") gar nicht aus. Geliefert hat sie kein
einziger Aufrufer: weder `Tippabgabe.jsx` noch `MeineJoker.jsx` noch
`jokerKontingent.js`. Gemessen über eine Bundesliga-Runde (36 Spiele, drei
Spieler): **0 statt 5 Gutschriften.** Kein Test hat es gesehen, weil
`ereignisse.test.js` die Punkte selbst mitliefert — beide Seiten rechneten für
sich richtig.

**Daneben lag der umgekehrte Fehler im selben Aufruf.** Ohne `alleEintraege`
vergleicht „alle Spiele des Spieltags getippt" die eigenen Tipps mit den
eigenen Tipps. Das ist immer vollständig: ein Spieler, der jeden fünften
Spieltag ausließ, bekam den Joker trotzdem — gemessen 5 von 5. Jetzt 0 von 5,
und die beiden Vollständigen behalten ihre 5.

**Behoben** über `src/lib/spieltagsPunkte.js` (`punkteJeSpieltag`) plus
`getSpieltagsPunkte(roundId)` in BEIDEN Stores — Frage 4 der Runden-Schicht,
der Screen fragt sie ab statt sie nachzurechnen. `applySaisonform` benutzt
dieselbe Funktion, die Rechnung lag vorher zweimal da. Nebenbei mitgenommen:
`getLeaderboardHistory` baute seine Einträge selbst und OHNE die Ersatz-Tipps
des Versäumnisses — zwei Kurven für dieselbe Runde. Läuft jetzt über dieselbe
Quelle wie das Leaderboard.

**Nachgezogen im selben Durchgang: `ereignisse.js` rechnete in LIGA-Spieltagen.**
Die in `CLAUDE.md` beschriebene Fehlerklasse, und sie war hier scharf. Gemessen
über 90 Spiele und drei Spieler mit allen Ereignissen an:

| Runde | Liga-Spieltage | Runden-Spieltage | Gutschriften Liga → Runde |
|---|---|---|---|
| nur Bundesliga | 13 | 12 | 45 → 45 |
| Bundesliga + Premier League | 11 | 6 | **45 → 30** |

Über Liga-Spieltage geschlüsselt vergibt eine Runde über mehrere Wettbewerbe
also mehrere Trost-Joker pro Woche, und „drei Spieltage in Folge getippt" zählt
eine andere Folge als die Zeitachse daneben. Gelöst wie bei
`invalidJokerMatchdays`: ein OPTIONALER `schluessel` an `auswerten()` und
`spieltageChronologisch()`. Ohne ihn bleibt alles wie bisher — kein stiller
Regelwechsel, und bei einem Wettbewerb sind beide Schlüssel deckungsgleich
(Zeile 1 der Tabelle ist der Beweis, dass das stimmt).

Zwei Punkte, die dabei nicht brechen dürfen:
1. **Die Gutschrift trägt weiter den LIGA-Spieltag** (den frühesten der
   Gruppe). Die Screens machen daraus über `rundenSpieltagVon` die
   Runden-Nummer — hätte die Gutschrift schon die Runden-Nummer, würde zweimal
   übersetzt.
2. **Beim Trost-Joker werden die Punkte je Nutzer AUFSUMMIERT**, wenn zwei
   Liga-Spieltage in einen Runden-Spieltag fallen. Vorher stand jeder Spieler
   zweimal in der Liste, und `Math.min` fand den schlechteren EINZELTAG statt
   der Bilanz — „Letzter" wäre jemand anderes gewesen als in der Tabelle.

**`npm run greift` hat jetzt einen Teil 2:** Einstellungen, die keine Punkte
bewegen, sondern Gutschriften. Der ganze `ereignisse`-Block fehlte in Teil 1,
weil sich das Leaderboard von ihm nicht rührt — genau deshalb konnte der
Trost-Joker unbemerkt tot sein. Stand: alle fünf Ereignisse schütten aus
(6 · 3 · 11 · 18 · 6), `maxErspielt` deckelt (43 → 6), und zwei Ligen ergeben
dieselben 43 Gutschriften wie eine.

### 🔴 Ereignisse gab es nur in Stufe 3 (06.08.2026) — ✅ behoben

Die Ebene war über die Profi-Ansicht vollständig einstellbar, und **kein
Charakter setzte sie, kein Regler in Stufe 2 erreichte sie**. Genau der
Zustand, den der Baukasten-Grundsatz ausschließt: „eine Einstellung, die nur in
Stufe 3 auftaucht, ist nicht fertig — sie zwingt jeden, der sie nutzen will, in
die Profi-Ansicht."

Gebaut wurden die drei Antworten der Reihe nach:

1. **Ereignis-Bibliothek** (`EREIGNIS_PRESETS` in `ereignisse.js`) — fünf
   Bündel: *Nichts nebenbei · Dranbleiben lohnt sich · Wer hinten liegt,
   bekommt etwas · Mut wird belohnt · Ständig passiert etwas.* Ein Eintrag ist
   ein BÜNDEL, keine Einzeleinstellung — dieselbe Idee wie die Stufen in
   `einfachRegler.js` und die Aspekte in `presetMerge.js`.
2. **Stufe 2: ein Klartext-Regler** „Wie viel soll nebenbei passieren?" mit
   vier Stufen. Bewusst nicht nach dem Feldnamen benannt: der Admin denkt nicht
   in „Ereignissen".
3. **Stufe 1: jeder Charakter trifft eine Entscheidung**, auch „aus" ist eine.
   *Klassisch/Wettbüro/Nebenbei* → Dranbleiben · *Mutig & wild* → Mut (das
   einzige verstärkende Bündel, und dort ist es die Ansage) · *Kenner-Runde* →
   ausdrücklich AUS, mit Begründung im Code statt stillschweigend.
   ⚠️ *Nur nebenbei* bekommt bewusst NICHT „ausgleich": Trost-Joker und
   Versäumnis-Ersatztipp fangen beide den verpatzten Spieltag ab.
4. **Stufe 3 behält die Bündel als Knöpfe** — Punkt 2 des Grundsatzes: die
   kuratierten Voreinstellungen müssen jederzeit abrufbar bleiben, auch nachdem
   jemand alles verstellt hat.

⚠️ **Die `wirkrichtung` steht als ABGELEITET dran, nicht als gemessen**
(`gemessen: false`, in der Oberfläche „eher verstärkend"). Sie sagt, wen ein
Bündel seiner BAUART nach begünstigt — das ist eine Aussage über den Auslöser,
keine über die Endpunkte. Die Messung (Streuung der Endpunkte +
`aufholFlipQuote`) gehört in den Balance-Durchgang am Ende und ersetzt das Feld
dann. Als „gemessen" behauptet wäre es eine Erfindung.

⚠️ **Die Obergrenze von Stufe 2 ist damit erreicht** (7 Regler, Test hält sie
fest). Wer den nächsten ergänzen will, prüft zuerst, ob er nicht in einen
bestehenden gehört — Stufe 2 ist eine Handvoll FRAGEN, keine kürzere
Profi-Ansicht.

### 🧪 `npm run tot` — welcher gebaute Export hat keinen Aufrufer? (06.08.2026)

Die vierte Abnahme, und sie ist aus einem Muster entstanden: an EINEM Tag sind
vier Mechaniken aufgefallen, die fertig gebaut, getestet und einstellbar waren
— und von niemandem aufgerufen wurden (`autoTip.js`, die `spieltagsPunkte`,
`alleEintraege`, die ganze WEN-Achse). **Alle vier beim Hinsehen gefunden, keine
durch eine Prüfung.** Kein Test konnte sie sehen: sie waren ja grün. Die
Funktion rechnete richtig, sie wurde nur nie gefragt.

`npm run tot` sucht das mechanisch: ein Export, den außerhalb seiner Datei und
ihrer Tests niemand nennt. 89 Module, 605 Exporte.

⚠️ **Der erste Lauf meldete 85 Einträge in einer Liste — das ist keine Messung,
sondern eine Halde**, und eine Halde wird beim dritten Mal ignoriert (dieselbe
Lehre wie bei der Überfüllungs-Warnung der Zeitachse). Deshalb sortiert sie
nach RISIKO: die vier Funde waren FUNKTIONEN in Modulen, die zu einem
`rules.*`-Block gehören. Dort heißt „ruft niemand auf" nämlich *die Einstellung
tut nichts*; bei einer Konstante heißt es bloß *ungenutzt*. Erste Gruppe: 17.

#### 🔴 Der zwölfte Fund — und diesmal war ich es selbst: ein weißer Screen

Beim Umbau von `SaisonTipps.jsx` auf `wettenStatus()` fiel die
`saisonLage`-Destrukturierung weg, und `gestartet` blieb weiter unten im JSX
stehen. **`npm run build` grün, 2019 Tests grün** — und der Screen wäre im
Browser weiß geblieben. Eine undeklarierte Variable wirft erst BEIM RENDERN,
und für Komponenten gibt es keine Tests. Gefunden beim Nachlesen.

**Daraus die fünfte Abnahme: `npm run lint`** — mit genau ZWEI Regeln:

| Regel | der Beleg dafür |
|---|---|
| `no-undef` | der Fund von heute |
| `react-hooks/rules-of-hooks` | in CLAUDE.md dokumentiert: „Hooks stehen VOR jedem frühen return", `Tippabgabe.jsx` lag daran eine Weile still kaputt |

⚠️ **Bewusst kein volles Regelwerk.** Ein frischer ESLint auf einem gewachsenen
Projekt meldet Hunderte Stilfragen, und eine Halde wird beim dritten Mal
ignoriert — dieselbe Lehre wie beim ersten `tot`-Lauf mit 85 Einträgen. Wer
eine dritte Regel ergänzt, bringt den Fund mit, der sie rechtfertigt.
Gegengeprobt: der Lauf ist sauber, und eine eingebaute undefinierte Variable
wird gemeldet.

#### 🔴 Der elfte Fund: Saison-Wetten hatten keinen Zwischenstand

Priorität 2, und es war die einzige Zahl im Spiel, die man nirgends sehen
konnte: `/saison` zeigte, WAS man getippt hat — nicht, ob es gerade zutrifft.
Im Ranking stand längst eine Summe dafür.

`getSaisonStand(roundId, userId)` in beiden Stores, über `scoreSaison` und die
Spiele DIESER Runde — dieselbe Funktion und dieselbe Grundlage, die
`saisonBoard.js` fürs Leaderboard benutzt. Der Screen zeigt jetzt je Wette den
aktuellen Führenden („Stand: FC Bayern München — dein Tipp liegt vorn, 300
Pkt.") und oben die Summe.

⚠️ **Beim Bauen fast eine Endlosschleife eingebaut:** der Zwischenstand sollte
nachladen, wenn sich `tipps` ändert — aber der Effekt SETZT `tipps`, und
`Object.fromEntries` liefert jedes Mal ein neues Objekt. Jetzt lädt er nach dem
Speichern nach, nicht über eine Abhängigkeit.

#### 🔴 Der zehnte Fund: „−340 Duell" ohne den Namen ist die halbe Nachricht

Priorität 2 der Nutzer-Reihenfolge, Anzeigen WÄHREND der Runde. Das Ranking
zeigte die Nettosumme aus Duellen als Marke — und sonst nichts. Bei einer
Mechanik, deren ganzer Sinn ist, dass ein ANDERER es war, fehlt damit die
eigentliche Aussage: *wer*, *wann*, und *geklaut oder nur gedämpft*.

Gebaut als **Store-Antwort, nicht als Screen-Rechnung** (Runden-Schicht,
Frage 4): `getDuellVorgaenge(roundId)` in beiden Stores. Die Beträge hängen am
Deckel, an der chronologischen Reihenfolge und am Nullsummen-Modus — eine
zweite Fassung liefe unweigerlich auseinander. Deshalb reicht
`scoreLeaderboardHistory` eine optionale Sammelliste an `applyDuellJoker`
durch; es ist buchstäblich derselbe Durchlauf, der auch die Wertung erzeugt.

🔴 **Und die Falle ist beim Bauen zugeschnappt, an mir selbst:** die erste
Fassung rundete jeden Einzelposten. Summe der Vorgänge eines Spielers: 1123 —
im Ranking stand 1122. Die Wertung addiert roh und rundet EINMAL am Ende;
genau dafür gibt es in `breakdown.js` die Zeile „Rundung". `duellVorgaenge`
trägt deshalb UNGERUNDETE Beträge: die Anzeige rundet je Zeile, die Summe wird
aus den rohen Werten gebildet.

`npm run anzeige` Teil 2 hat dafür eine vierte Zeile bekommen — sie addiert die
Vorgänge und vergleicht sie mit der Marke im Ranking. Sie meldet zusätzlich,
wenn in der Messrunde gar kein Duell gelaufen ist: zwei Nullen stimmen auch
überein.

#### 🔴 Der zehnte Fund: die MESSUNG selbst deckte 14 von 37 Blöcken nicht ab

Die Frage an das Werkzeug, und sie ist so wichtig wie sein Ergebnis: **ein
Block ohne Messfall steht nirgends als „bewegt nichts" — er steht GAR NICHT
da.** Eine Liste, die schweigt, sieht aus wie eine Liste ohne Befund.

Gemessen: 14 von 37 Regel-Blöcken hatten in `npm run greift` keinen Messfall.
**Drei davon waren schlicht vergessen** und bewegen kräftig etwas:

| Block | bewegt |
|---|---|
| `underdogRampStart` (2 → 6) | 1922 Punkte |
| `underdogRampEnd` (→ 3) | 2716 Punkte |
| `modFloor` (0,3 → 0,9) | 8497 Punkte |

⚠️ Alle drei brauchen einen VORBEREITETEN Vergleichsstand, sonst messen sie das
Falsche: die Rampe ist ohne `underdogBoost > 1` folgenlos, und `modFloor` ist
die untere Leitplanke — sie greift nur, wenn überhaupt etwas nach unten zieht
(Team-Faktoren unter 1). Mit der Vorgabe wären beide stumm gewesen und hätten
wie tote Einstellungen ausgesehen.

Für die restlichen elf gilt jetzt dieselbe Regel wie bei `stufen` und `tot`:
ein Messfall **oder** ein Satz, warum hier keiner hingehört. Die Begründungen
sagen dabei, WO die Ebene stattdessen gemessen wird — `ereignisse` in Teil 2,
`tippfenster` in seinem Test, `zeitachse` über `rundenSchluessel` in Teil 2.

🔴 Damit haben alle vier Abnahmen jetzt eine Selbstprüfung: `greift` (Teil 3),
`stufen` (Sperrklinke + überholte Begründungen), `tot` (`GEDULDET`), und in
`greift` zusätzlich „EINSTELLUNG VERWORFEN" für einen Messfall, der
`sanitizeRules` gar nicht erst passiert.

#### 🔴🔴 Der neunte Fund, und der schwerste: `saveTip` prüfte den ANPFIFF nicht

**Gemessen:** ein Tipp auf das Demo-Spiel, dessen Anpfiff **zwei Monate**
zurückliegt, wurde angenommen, gespeichert und mit **1440 Punkten** für den
„exakten Treffer" gewertet. Der Screen zeigte das Spiel korrekt als
„angepfiffen" — der Store fragte niemanden.

Das ist die zentrale Fairness-Regel des ganzen Spiels („geschlossen wird immer
beim Anpfiff"), und sie stand nur in `Tippabgabe.jsx`. **Dritter Fall
derselben Klasse an einem Tag:**

| Regel | stand nur in | Folge |
|---|---|---|
| Freischalt-Fenster der Saison-Wetten | einem `disabled`-Attribut | jede Wette jederzeit abgebbar |
| Ziel-Schutzregeln des Duell-Jokers | `Tippabgabe.jsx` | jeder trifft jeden, beliebig oft |
| **Tipp-Fenster / Anpfiff** | `Tippabgabe.jsx` | **Tipp auf ein beendetes Spiel zählt** |

Behoben in BEIDEN Stores über dieselbe Funktion, die auch der Screen benutzt
(`tippStatus`). ⚠️ **Das ist keine Sicherheitsgrenze** — der Client schreibt
direkt in die Tabelle, wer den Aufruf umgeht, kommt weiter durch. Dafür braucht
es den Trigger aus dem RLS-Durchgang. Was es verhindert: dass UNSER EIGENER
Code es falsch macht, und dass die Regel zweimal formuliert wird.

🔴 **`seedTip` / `seedSeasonTip` — der benannte Umweg für Messläufe.**
`npm run greift` und `npm run anzeige` legen ganze Saisons auf einmal an; kein
einziger Zeitpunkt macht 54 Spiele gleichzeitig tippbar (das früheste ist längst
angepfiffen, wenn das späteste aufgeht). Bewusst ZWEI eigene Namen statt eines
`pruefen: false`-Schalters an `saveTip`: ein Schalter wird irgendwann aus
Bequemlichkeit im Spielbetrieb gesetzt, ein Name mit Warnkommentar nicht.

⚠️ **Nebenbefund aus zwei Läufen desselben Durchgangs:** die absoluten Zahlen
von `npm run greift` wackeln. `createRound` leitet die Runden-Id aus einem
ZUFÄLLIGEN Beitritts-Code ab, und alles daraus Geseedete (Drehrad,
Kontingent-Joker, Zufalls-Ersatztipp) fällt jedes Mal anders aus — gemessen 600
gegen 900 Punkte für denselben Drehrad-Fall. Aussagekräftig ist „bewegt etwas /
bewegt nichts", nicht der Betrag im Vergleich zu gestern. Steht jetzt im Kopf
des Skripts.

#### 🔴 Der achte Fund: die Schutzregeln des Duell-Jokers stehen nur im SCREEN

Nachdem die acht Duell-Felder eine Oberfläche hatten, die nächste Frage:
greifen sie? Gemessen über 54 Spiele und vier Spieler, die sich gegenseitig
angreifen — Tipps direkt über `store.saveTip()` geschrieben, also am Screen
vorbei:

| Einstellung | bewegt |
|---|---|
| `block.restanteil` 0,5 → 0 | **1364 Punkte** |
| `block.beute` 0 → 0,5 | **400 Punkte** |
| `block.nurGewinn` an → aus | **206 Punkte** |
| `zielWahl` (frei / nur Top 3) | **nichts** |
| `maxProZiel` 2 → 1 | **nichts** |
| `immun` 1 → 4 | **nichts** |
| `konter` aus → an | **nichts** |
| `kosten` frei → stattJoker | **nichts** |

⚠️ **Zwei verschiedene Befunde, die nicht zusammengehören:**

1. **`zielWahl` · `maxProZiel` · `immun` sind implementiert** — in
   `zulaessigeZiele()`, und `Tippabgabe.jsx` fragt sie an zwei Stellen mit
   identischen Argumenten (nachgesehen, kein zweiter Fehler dort). Aber
   `saveTip` prüft NICHTS. Wer die Route direkt anspricht, trifft jeden,
   beliebig oft. **Dieselbe Klasse wie das Freischalt-Fenster der
   Saison-Wetten** — eine Fairness-Regel, die nur in einem Screen steht, ist
   eine Vereinbarung. Der belastbare Ort ist die Server-Route (steht schon
   unter „RLS-Durchgang"); anders als beim Saison-Fenster ist ein
   Store-Vorgriff hier NICHT billig, weil die Prüfung den ganzen Tabellenstand
   braucht.
2. **`konter` und `kosten` sind nirgends implementiert.** Sie stehen im
   Regelwerk, werden gesäubert, reisen im Creator-Code mit — und keine Zeile
   fragt sie ab. In der neuen Oberfläche stehen sie deshalb als
   „vorbereitet · wirkt noch nicht", in derselben Form wie die
   Herausforderungen in `Ereignisse.jsx`. Ein Umschalter, der nichts bewirkt,
   ist schlimmer als keiner.
   ✅ **Erledigt 07.08.2026** — beide angeschlossen, siehe den Abschnitt
   darunter.

#### ✅ 07.08.: die WANN-Achse als GATTER (`src/lib/ausloeser.js`)

Dritte der vier Achsen, und die Entscheidung dabei ist die wichtigste Zeile:
**sie ersetzt die Ereignis-Typen nicht.** Die SIND heute schon Auslöser
(„Serie", „erster exakter Treffer", „Außenseiter getroffen"). Diese Achse legt
nur eine zweite Frage davor — „und passt der Zeitpunkt?" Aus „Trost-Joker"
wird damit „Trost-Joker, aber nur jeden vierten Spieltag" oder „nur, solange
die Tabelle eng ist", ohne eine Zeile neuen Auswertungs-Code. Genau so hat die
WEN-Achse aus dem Trost-Joker die Spieltags-Krone gemacht.

Ein Ersatz der bestehenden Typen wäre dagegen ein Umbau der funktionierenden
Ebene, und der gehört nicht in denselben Schritt.

**Zehn auswertbare Auslöser**, vier vorbereitet (`lotterie`, `abstimmung`,
`adminAusloesung`, `kaskade` — alle brauchen Infrastruktur). Vorgabe
`{ typ: "immer" }` = Gatter offen, also kein stiller Regelwechsel für
bestehende Regelwerke.

⚠️ **`zufall` nimmt die Lösung, die dieses Projekt schon einmal gebaut hat:**
reiner Zufall bündelt (`jokerPlan.js`: „sonst bündelt reiner Zufall vier Joker
in fünf Spieltagen; formal fair, gefühlt kaputt"). Deshalb blockweise — je
Block von `frequenz` Spieltagen feuert GENAU EINER, welcher ist aus der
Runden-Id gelost. Ein Test prüft das über vier verschiedene Runden-Ids.

**Gemessen über 54 Spiele, drei Spieler, Trost-Ereignis:**

| Gatter | Gutschriften | zurückgehalten |
|---|---|---|
| `immer` (Vorgabe) | 8 | 0 |
| `rhythmus` n=4 | 2 | 6 |
| `zufall` frequenz=5 | 2 | 6 |
| `saisonende` letzte=3 | 3 | 5 |
| `termin` Spieltag 3 | 1 | 7 |
| `enge` ≤ 10 % | 3 | 5 |
| `gruppenereignis` | 3 | 5 |
| `quotenereignis` ab 6,0 | 2 | 6 |
| `torlos` | 2 | 6 |

🔴 **Zwei Fehler, die nur die Messung gefunden hat — kein Test hätte sie
gemeldet:**

1. **`Number(null) === 0`, zum wiederholten Mal.** `feuert()` prüfte
   `Number.isFinite(Number(position))`, und `Number(null)` ist 0 — bei
   `rhythmus` heißt `0 % 4 === 0` also: **das Gatter geht ohne jede Grundlage
   auf.** Dieselbe Falle, die `sanitizeDuellJoker` bei `abSpieltag` schon
   einmal hatte. Hier hat der Test sie erwischt, bevor sie in die Wertung kam.

2. **`spieltageChronologisch` liefert OBJEKTE, keine Schlüssel.** Der erste
   Anlauf iterierte sie als Schlüssel; `standVor` war damit über Objekte
   indiziert, jedes `get(key)` ging ins Leere, und `enge` wie `abstand`
   hielten IMMER zu. **Und das sieht plausibel aus** — sie sind Gegenstücke,
   eines von beiden ist immer falsch. Gefunden hat es erst die Messung, die
   alle zehn Gatter nebeneinander stellte, und die Gegenprobe (`abstand` bei
   5 % lässt 7 durch, `enge` bei 60 % ebenfalls 7 — das Gatter bewegt sich
   monoton).

**Angeschlossen:** das Gatter steht VOR den Begrenzern in `auswerten()` —
was der Auslöser nicht durchlässt, darf keine Abklingzeit starten und nicht
gegen `maxProSaison` zählen; sonst verbrauchte ein Ereignis sein Kontingent an
Spieltagen, an denen es nie gefeuert hat. `zugehalten` steht als eigene Zahl
neben `gebremst` und `verworfen`: drei Gründe, drei Schrauben.

⚠️ **`rundenId` reicht jetzt bis in die Wertung durch** (Screens →
`erspielteLage`, Stores → `scoreLeaderboardHistory` → `wirkungsVorgaenge`).
Ohne das zöge dieselbe `zufall`-Regel im Joker-Vorrat andere Spieltage als in
der Wertung — die doppelte Wahrheit in Reinform.

Vier neue Tore in `greift` Teil 4: `rhythmus` 20 → 5 · `zufall` 20 → 4 ·
`saisonende` 20 → 3 · `enge` 6 → 0 offene Spieltage.

#### ✅ 07.08.: die WAS-Achse der Regel-Grammatik steht (`src/lib/wirkung.js`)

Schritt 2 der Reihenfolge weiter unten („die Grammatik als Datenmodell in
`rules.ereignisse` erweitern — noch ohne neue Auslöser"). Nach der WEN-Achse
(`auswahl.js`, 06.08.) ist das die zweite der vier.

**Die Wirkung eines Ereignisses war bis dahin IMMER „n Joker"** — das Feld
hieß `belohnung` und war eine Zahl. Das ist die Voreinstellung geblieben
(`sanitizeWirkung(a.wirkung, { typ: "joker", n: belohnung })`), damit kein
bestehender Creator-Code stillschweigend seine Bedeutung ändert. Daneben
stehen jetzt sechs weitere auswertbare Wirkungen und sechs vorbereitete.

🔴 **Der Vertrag, an dem alles hängt: keine Wirkung macht einen neuen
Punkte-Kanal auf.** Jede läuft in einen Topf, der schon einen Deckel hat —
und ein Test prüft, dass keine auswertbare Wirkung ZWEI Töpfe gleichzeitig
bedient.

| Wirkung | Topf | Deckel |
|---|---|---|
| `joker` / `jokerEntzug` | Joker-Kontingent | `ereignisse.maxErspielt` |
| `punkte` | direkte Gutschrift | **eigener** Saison-Deckel, Bauart `drehrad.maxPunkteProSaison` |
| `bonus` / `malus` | Gewichtung eines Spieltags im Verlauf, wie `saisonform.kurve` | `WIRKUNG_LIMITS.prozent` (± 50 %) |
| `umverteilung` | keiner — summenneutral | braucht keinen |
| `nichts` | keiner | kostet null Balance |

⚠️ **Eine Korrektur am Plan weiter unten:** dort steht, `bonus` und `punkte`
fielen „in denselben ADDITIVEN Topf wie Derby, Big Game und Wettbewerbs-Gewicht
und damit unter `modCap`". Das stimmt nicht. `modCap` deckelt die Modifikatoren
EINES TIPPS und greift in `scoreTip`; diese Wirkung liegt eine Ebene darüber
und wiegt einen ganzen SPIELTAG im Verlauf. Ihre Grenze ist die eigene, nicht
`modCap` — wer das verwechselt, hält den Faktor für gedeckelt, obwohl ihn dort
niemand sieht. Und `punkte` ist ein SUMMAND: ein Faktor ist von Natur aus
begrenzt, eine feste Gutschrift wächst mit jedem Auslösen weiter. Deshalb der
eigene Saison-Deckel, und deshalb meldet `konflikte()` ein `maxProSaison: 0`.

**Angeschlossen, nicht nur gebaut** (die Lehre vom 06.08.): `wirkungsVorgaenge`
läuft einmal über die ganze Runde und lässt `wendeAn()` je Spieltag EINMAL
rechnen — bei einer Umverteilung sitzt die andere Hälfte des Vorgangs bei allen
anderen, ein Ein-Nutzer-Lauf kann sie gar nicht sehen. `applyEreignisWirkungen`
legt das Ergebnis in den Verlauf, VOR dem Duell-Joker: die Wirkungen hängen an
den ROHEN Spieltagspunkten, genau der Liste, aus der die Auswahl ihre
Betroffenen zieht. Und `brauchtVerlauf()` fragt dieselbe Funktion — sonst
rechnete `getLeaderboard` an der ganzen Ebene vorbei.

**Gemessen auf echten Daten** (36 Spiele, drei Spieler, Trost-Ereignis):

| Wirkung | Δ Endstand | |
|---|---|---|
| `joker` (wie bisher) | 0 / 0 / 0 | keine stille Änderung ✅ |
| `punkte` 100, Deckel 500 | +200 / +100 / +200 | **Summe exakt 500 = der Deckel** |
| `bonus` 50 % | +385 / +333 / +748 | |
| `malus` 50 % | −384 / −333 / −747 | spiegelbildlich |
| `umverteilung` 50 % | +156 / +233 / −389 | **Rundensumme 10419 → 10419, Differenz 0** |

#### 🔴 Und der blinde Fleck, den das aufgedeckt hat: `stufen` Teil 2 sah in LISTEN gar nicht hinein

`blattFelder()` läuft über `sanitizeRules(DEFAULT_RULES)` und hält an ARRAYS
an. In der Vorgabe sind `ereignisse.aktive`, `saison.wetten`, `drehrad.felder`
und `limitKlassen` **alle leer** — was ein Eintrag darin trägt, hat die
Rekursion also nie gesehen. Die ganze Wirkungs-Achse lag außerhalb, und Teil 2
meldete weiter „jedes Regel-Feld kommt in einer Oberfläche vor".

Behoben über `LISTEN_FELDER`: eine ausdrückliche, von Hand gepflegte Liste
dessen, was in solchen Einträgen steckt (16 Namen). Von Hand ist hier kein
Kompromiss, sondern die einzige Möglichkeit — die Vorgabe kann sie nicht
liefern, weil die Listen leer anfangen. Gegenprobe gemacht: ein erfundener
Name in der Liste wird sofort als Lücke gemeldet.

**Wer eine Einstellung in einen LISTEN-Eintrag legt, trägt sie dort ein.**

#### ✅ 07.08.: `konter` und `kosten` angeschlossen — und die Messung, die sie hätte finden müssen

**`konter`** liegt in `zulaessigeZiele()`: wer an DIESEM Spieltag getroffen
wurde, darf seinen Angreifer zurückschlagen — auch dort, wo `zielWahl` es sonst
verbietet. Genau darin liegt der Sinn: bei „nur nach vorne" steht der Angreifer
per Definition HINTER dem Getroffenen, der könnte also nie antworten, und der
Schalter wäre in der häufigsten Zielwahl folgenlos. Es ist eine Ausnahme von
der ZIELWAHL, nicht von den Schutzregeln — `maxProZiel` und `immun` gelten
weiter, dafür gibt es je einen Test.

**`kosten: "stattJoker"`** liegt in `jokerKontingent.js`, nicht im Duell-Modul:
„kostet einen Joker" ist eine Aussage über den JOKER-VORRAT, nicht über die
Duell-Wertung. Im Duell-Modul gerechnet gäbe es zwei Buchführungen über
denselben Vorrat. Angeschlossen über `verbrauch()` → `kontingent()` →
neu `darfDuellSetzen()` → `Tippabgabe.jsx`.

🔴 **Der Fund beim Nachmessen, und er ist der eigentliche Ertrag des Tages.**
Nach dem Anschließen zeigte die Messung:

```
Plan-Spieltage: [2,7,12,13,18]
Duell AN einem Plan-Spieltag    zugeteilt 1/5 · erspielt 0/0 · offen 4
Duell AUSSERHALB des Plans      zugeteilt 0/5 · erspielt 1/0 · offen 5
3 Duelle ausserhalb             zugeteilt 0/5 · erspielt 3/0 · offen 5
```

Der Verbrauch stieg, `offen` nicht. Ursache:
`erspieltOffen = Math.max(0, erspieltGesamt - verbraucht)` — der Topf war leer,
drei Einsätze gingen trotzdem durch, und das `Math.max` machte aus der
Überziehung wieder eine Null. **Die stärkste Bremse des Bausteins bremste
messbar nichts**, obwohl die Zählung stimmte.

⚠️ **Die Lehre, allgemeiner als der Fall:** ein `Math.max(0, …)` ist immer eine
Aussage („weniger als leer gibt es nicht") und fast immer auch ein Deckmantel.
`kontingent()` meldet jetzt `ueberzogen` statt es wegzurechnen, und
`darfDuellSetzen()` lehnt den Einsatz ab, wenn nichts mehr da ist.

#### 🔴 Und die Abnahme, die diese Fehlerklasse gar nicht sehen konnte: `greift` TEIL 4

`konter` und `kosten` bewegen **keine Punkte** — sie entscheiden, ob ein Einsatz
zustande kommt. In Teil 1 waren sie vom Block `duell` (3401 Punkte) mit
abgedeckt und sahen dadurch gesund aus. **Punkte zu messen konnte sie nicht
finden.**

Dieselbe Lage hatten vier weitere Blöcke — und sie standen in Teil 3 als
BEGRÜNDUNG, warum sie nicht gemessen werden („begrenzt, wie viele Joker man
einsetzen darf, nicht was einer zählt"). Eine Begründung ist an der Stelle
aber nur ein anderes Wort für „ungemessen".

**Teil 4 zählt deshalb erlaubte VORGÄNGE statt Punkte** (erster Lauf):

| Tor | Vorgabe → Extremwert | |
|---|---|---|
| `duell.zielWahl` | 20 → 10 | erlaubte Ziele über 5 Spieler |
| `duell.maxProZiel` | 20 → 19 | dito |
| `duell.immun` | 20 → 18 | dito |
| `duell.konter` | 10 → 11 | dito |
| `duell.kosten` | 20 → 5 | bezahlbare Spieltage von 20 |
| `jokerBasis.wer` | 5 → 2 | berechtigte Spieler von 5 |
| `limitKlassen` | 25 → 0 | durchgelassene Einsätze von 25 |
| `budget` (Preise) | 5 → 3 | bezahlbare Joker-Arten von 5 |
| `tippfenster` | 9 → 44 | tippbare Spiele von 341 |

⚠️ **Und prompt die alte Falle im neuen Teil:** `limitKlassen` meldete beim
ersten Lauf „bewegt nichts". Nicht das Tor war tot, sondern mein Messfall —
`jokerArten`/`pro` statt `mitglieder`/`proZeitraum`, und `sanitizeLimitKlassen`
warf die Klasse still weg. Dazu `jokerArt: "joker"` statt `"joker.einzel"`.
Beides ist jetzt mit einer Sperrklinke abgesichert, wie `kommtDurch` in Teil 1.
**Eine Messung, die nicht prüft, ob sie etwas geprüft hat, meldet Ruhe statt
Befunden** — zum dritten Mal an zwei Tagen dieselbe Lehre.

**Offen bleibt Befund 1 oben unverändert:** `zielWahl`/`maxProZiel`/`immun`
**und jetzt auch `kosten`** werden im Screen geprüft, `saveTip` prüft weiterhin
nichts. Der belastbare Ort ist die Server-Route (RLS-Durchgang).

🔴 **Und eine Korrektur an mir selbst:** der erste Lauf meldete
`block.nurGewinn` ebenfalls als wirkungslos. Falsch — das Messszenario lief mit
`wrongPenalty: 0` und hatte deshalb keinen einzigen Minus-Spieltag, und genau
die unterscheidet die Einstellung. Mit Abzug: 7 von 32 Spieltagen negativ, und
der Regler bewegt 206 Punkte. **Eine Messung, die den Fall nicht herstellt, den
sie messen will, meldet „tot" für etwas Lebendiges** — dieselbe Falle wie die
vier Fehlalarme im ersten `greift`-Lauf.

#### 🔴 Der siebte Fund: `tippfenster.anker` hatte GAR KEINE Oberfläche

Nachdem der Anker wirksam war (Fund 5), die Frage danach: wo stellt man ihn
eigentlich ein? **Nirgends.** Er stand im Regelwerk, reiste im Creator-Code
mit, wurde von `sanitizeRules` gesäubert — und die Profi-Ansicht zeigte nur die
Vorlaufzeit.

⚠️ **Schlimmer: der Vorlauf-Knopf löschte ihn.** Er setzte
`tippfenster: { vorlaufStunden: … }` und ersetzte damit das GANZE Objekt. Ein
geteilter Creator-Code mit `anker: "spieltag"` verlor die Einstellung, sobald
jemand den Vorlauf einmal anfasste — lautlos.

Drei Schichten übereinander (wirkungslos · nicht einstellbar · beim Anfassen
gelöscht), und keine davon hat sich gemeldet. Behoben; dazu zeigt die
Profi-Ansicht jetzt `erklaereTippfenster()` — drei Fragen, die ein Spieler
wirklich stellt („Kann ich das Sonntagsspiel schon am Freitag tippen?") statt
einer Beschreibung der Einstellung. Auch die lag gebaut und ungenutzt da.

#### Zwei Live-Vorschauen, die niemand aufrief

Aus derselben Messung, beide aus der Kategorie „die Live-Vorschau ist nicht
Komfort, sondern die Betreuung":

- **`beschreibeBetrifft`** (Aufhol-Bonus): die Oberfläche zeigte die STATISCHE
  Beschreibung der Stufe. Bei den beiden parametrierten („die letzten n", „wer
  mehr als x % abfällt") drehte der Admin an einem Regler und las daneben
  immer denselben Satz — nie die eingestellte Zahl.
- **`trefferAnteil`** (WEN-Achse): sagt, WIE VIELE eine Auswahl trifft. „Die
  besten 5" klingt nach einer Kleinigkeit und ist in einer Zwölfer-Runde fast
  die halbe Gruppe. Genau die Falle, für die es `anteile()` bei den
  Wettbewerbs-Gewichten gibt.

**Stand der scharfen Gruppe von `npm run tot`: leer.** Drei Einträge stehen mit
Begründung in `GEDULDET`, darunter einer mit Ablaufdatum: `istFreigeschaltet`
ist eine ZWEITE Formulierung derselben Regel wie `freigabeStatus` und gehört
gelöscht — sie liegt in Account 2s Bereich, deshalb erst nach dem Kanal.

#### 🔴 Der sechste Fund: das Freischalt-Fenster war ein `disabled`-Attribut

`saveSeasonTip` nahm **jede Wette zu jeder Zeit entgegen.** `SaisonTipps.jsx`
zeigte den Zustand richtig an und sperrte das Auswahlfeld — der Store prüfte
nichts. Eine Regel, die nur in der Oberfläche steht, ist eine Vereinbarung;
derselbe Satz steht in dieser Roadmap schon über den Quoten-Snapshot.

Das ist mehr als Formsache: die Fenster tragen eine FAIRNESS-Aussage. „Wer
gewinnt die Champions League?" vor dem 1. Spieltag ist Raten — wer später
tippen darf, weiß mehr bei gleicher Punktzahl.

**`src/lib/saisonFenster.js`** ist jetzt die eine Stelle: `wettenStatus()` für
die Anzeige, `darfSaisonTippen()` für beide Stores. Der Screen hatte die
Fallunterscheidung selbst stehen — zwei Formulierungen derselben Regel wären
der nächste Schritt in dieselbe Falle.

⚠️ **Client-seitig, und das ersetzt keinen Trigger** (siehe RLS-Durchgang).
Geschlossen ist die Lücke zwischen ANZEIGE und SPEICHERUNG, nicht die zwischen
Client und Datenbank.

⚠️ **Ein Nebenbefund, der sofort scharf wurde:** über den GANZEN Katalog
gerechnet hat die Saison längst begonnen — die MLS spielt seit dem 31.07.,
15 Spiele sind angepfiffen. Eine Runde OHNE Vereinsfilter kann damit keine
fensterlose Saison-Wette mehr annehmen. Das ist richtig so und stand als
Warnung schon in `SaisonTipps.jsx`; seit der Store prüft, ist es keine
Anzeige-Frage mehr. Fünf Store-Tests mussten deshalb eine Runde MIT
`teamFilter` anlegen — vorher legten sie Saison-Tipps in einer Runde ab, die
gar keine Saison-Wetten hatte.

#### 🔴 Und gleich der fünfte Fund: `tippfenster.anker` lief ins Leere

Aus der ersten Gruppe direkt eine echte Sache — sechs unbenutzte Exporte in
`tippfenster.js`, darunter `spieltagStarts()`.

`oeffnetAm` braucht die `starts`-Map, sobald `anker: "spieltag"` gilt (der
Spieltag geht als BLOCK auf, gerechnet ab seinem ersten Anpfiff). Fehlt sie,
fällt es auf den eigenen Anpfiff zurück — und verhält sich damit **exakt wie
der Anker `spiel`**. Genau das taten alle direkten Aufrufer: `Spielwahl.jsx`
(drei Stellen) und `saisonfahrplan.js` (zwei). `uebersicht()` und
`naechsteOeffnung()` bilden die Map intern.

**Damit widersprach der Screen sich selbst.** Gemessen, 60 h vor dem ersten
Anpfiff bei 72 h Vorlauf:

| | tippbare Spiele |
|---|---|
| der Zähler oben (`uebersicht`) | **9** |
| die Liste darunter | **1** |

⚠️ **Der Rückfall ist bewusst gebaut** (Altaufrufer ohne Spielplan-Kontext
sollen gültig bleiben) und deshalb doppelt gefährlich: er meldet sich nicht.
Behoben an allen fünf Stellen, mit Tests. Der Fahrplan unterscheidet jetzt
messbar: 1 offenes Spiel bei `anker: spiel`, 9 bei `anker: spieltag`.

### 🔴 `auswahl.js` — achtzehn Modi, getestet, von NIEMANDEM aufgerufen (06.08.2026) — ✅ behoben

Vierter Fund derselben Sorte an einem Tag, und der größte: die **WEN-Achse**
der Regel-Grammatik war totes Kapital. `waehleBetroffene()` beantwortet die
zweite der vier Fragen jeder Mechanik (WANN · WEN · WAS · WIE LANGE), hat
achtzehn Modi und eigene Tests — und kein einziger Aufrufer im ganzen Projekt.

**Jetzt hängt sie am ersten Ereignis-Typ.** Aus „Trost-Joker für den Letzten"
wird „Auszeichnung nach Spieltags-Platzierung": derselbe Eintrag liefert je
nach `auswahl` auch die Spieltags-Krone, die zwei Letzten, das untere Fünftel
oder das Mittelfeld — **ohne eine Zeile neuen Auswertungs-Code.** Gemessen über
54 Spiele und fünf Spieler, Gutschriften je Spieler:

| Auswahl | gesamt | Verteilung |
|---|---|---|
| der Letzte des Spieltags | 6 | du 1 · lena 0 · kemal 2 · **max 2** · jonas 1 |
| der Beste des Spieltags | 6 | du 1 · lena 1 · kemal 2 · **max 0** · jonas 2 |
| die 2 Letzten | 12 | |
| das untere Fünftel (40 %) | 12 | |
| das mittlere Feld | 18 | |

Fünf Einstellungen, fünf verschiedene Verteilungen — und die Gegenrichtung
trifft nachweislich andere Leute.

**Drei Punkte, die dabei nicht brechen dürfen:**

1. **Die Gleichstands-Regel bleibt, und sie ist keine Doppelung.**
   `waehleBetroffene` löst einen Gleichstand deterministisch über den Namen
   auf — für eine AUSWAHL richtig (sie muss reproduzierbar sein), für eine
   BELOHNUNG an der Kante nicht: wer bei gleicher Punktzahl den Joker bekäme,
   hinge am Alphabet. Punktgleich an der Kante heißt: niemand.
2. **Nur drei der achtzehn Modi sind zugelassen** (`rang`, `perzentil`,
   `mitte`). Die übrigen brauchen Daten, die hier nicht vorliegen
   (Rangveränderung, Beitrittsdatum, Freiwillige) — sie lieferten
   stillschweigend eine leere Auswahl, und das sähe für den Admin exakt aus wie
   ein totes Ereignis. Ein unbekannter Modus fällt auf die Vorgabe zurück.
3. **Die Doppelbelohnungs-Warnung gilt nur nach UNTEN.** Eine Spieltags-Krone
   verdoppelt den Anschluss-Bonus nicht, sie tut das Gegenteil. Eine Warnung,
   die auch im umgekehrten Fall anschlägt, wird nach dem dritten Mal überlesen.

Alle drei Stufen dabei: neues Bibliotheks-Bündel **„Der Beste des Spieltags"**
(als `verstärkend` etikettiert, mit Abklingzeit 3), eine Stufe-2-Stufe gleichen
Namens, und in Stufe 3 ein Auswahlfeld mit **Live-Satz** („Trifft: der Letzte
des Spieltags") plus einem Hinweis, sobald nach oben ausgezeichnet wird.

### 🔴 `/historie` zeigte einen anderen Verlauf als `/ranking` (06.08.2026) — ✅ behoben

**Gemessen: 801 Punkte Unterschied, 32 %** — und heute unsichtbar, weil noch
kein Spiel der Runde angepfiffen ist.

`Historie.jsx` baut seinen Verlauf aus `getRoundEntries()`. Das liefert nur
ABGEGEBENE Tipps; ein Ersatz-Tipp aus dem Versäumnis ist per Definition keiner.
Das Ranking bekommt sie dagegen vom Store mitgeliefert. In einer Runde über 36
Spiele, in der ein Spieler jedes zweite ausließ, stand er im Verlauf bei 1726
und im Ranking bei 2527. **Ab dem 28.08.2026** (Bundesliga-Start) hätte das
jeder gesehen, der die Kulanz eingeschaltet hat.

⚠️ **Das war KEIN Rechenfehler** — beide Seiten rechneten richtig, sie
rechneten nur über verschiedene Eingaben. Genau die Fehlerklasse aus
Architektur-Regel 5, und sie hat den Store-Umbau von heute morgen überlebt:
`getLeaderboardHistory` läuft jetzt über dieselben Einträge wie das
Leaderboard, aber dieser Screen ruft es gar nicht auf.

**Behoben, und zwar für BEIDE Fälle des Screens:**
- „Diese Runde" bildet die Ersatz-Tipps aus denselben Zutaten wie der Store.
- Ein fremdes Preset bildet sie unter DESSEN Regelwerk neu. `versaeumnis` ist
  Teil des Regelwerks — ein „was wäre mit Preset X gewesen" muss auch dessen
  Kulanz durchrechnen. Die Ersatz-Tipps der echten Runde zu übernehmen, mischte
  zwei Regelwerke.
- ⚠️ Die Duell-Einsätze kommen weiter aus den ECHTEN Tipps: ein Ersatz-Tipp
  trägt keinen Einsatz, den niemand gesetzt hat.

### 📐 `npm run stufen` — ist jede Einstellung auch ERREICHBAR? (06.08.2026)

Die dritte Messung neben `greift` („bewegt sie etwas?") und `anzeige` („steht
überall dieselbe Zahl?"). Sie fragt: **kommt ein Admin überhaupt an sie heran,
ohne in die Profi-Ansicht zu gehen?**

🔴 **Warum das keine der beiden anderen sehen kann:** `rules.ereignisse` war
gebaut, wirksam (greift ✓) und überall richtig angezeigt (anzeige ✓) — und
trotzdem unfertig, weil kein Charakter und kein einfacher Regler sie je
erwähnte. Beide Messungen stellen eine andere Frage.

**Der erste Befund: 15 von 37 Regel-Feldern waren nur in der Profi-Ansicht
erreichbar** — und niemand konnte sagen, welche davon dort hingehören und
welche vergessen wurden. Genau das ist der Unterschied zwischen einer Lücke und
einer Entscheidung, und deshalb gibt es jetzt beides getrennt:

- `NUR_PROFI` in `stufenAbdeckung.js` — Feld → **Begründungssatz**. Sechs
  Felder stehen dort (`displayScale`, `reglerFeinheit`, `oddsMode`, `modFloor`,
  `zeitachse`, `spiele`), jedes mit dem Satz, warum es auf Stufe 1/2 keine
  Frage gäbe, die ein Admin beantworten könnte.
- Alles ohne Eintrag und ohne Anbindung ist eine **LÜCKE** und wird gezählt.

⚠️ **Ein Test hält die Zahl als Sperrklinke** — sie darf sinken, nie steigen.
Ein neuer Regelblock, der nur in der Profi-Ansicht landet, fällt damit sofort
auf. Dazu zwei Gegenproben, die genauso zählen: eine **überholte Begründung**
(Feld inzwischen erreichbar, Eintrag steht noch da) und eine Begründung für ein
Feld, das es gar nicht mehr gibt.

**Sofort geschlossen (15 → 13):** `aufholen` und `saisonform` unter der neuen
Stufe-2-Frage **„Wie leicht bleibt man dran?"** (vier Stufen) plus in zwei
Charakteren. Die beiden gehören unter EINE Frage, weil ein Spieler sie auch als
eine stellt — und weil genau ihr Zusammenspiel die Balance trägt: doppelter
Ausgleich presst das Feld zusammen, bis das Ranking beliebig wird. Deshalb
überall die SANFTEN Werte, nie „stark" plus viele Streicher.

**Im selben Durchgang auf 1 gebracht.** Geschlossen wurden:

| Feld | wohin |
|---|---|
| `aufholen` + `saisonform` | neue Frage **„Wie leicht bleibt man dran?"** (4 Stufen) + zwei Charaktere |
| `ereignisse` | **„Wie viel soll nebenbei passieren?"** (4 Stufen) + alle Charaktere |
| `drehrad` | dieselbe Frage — der dritte Auslöser neben Zeitpunkt und Leistung ist reiner Zufall |
| `teamMods` | **„Zählen manche Spiele mehr als andere?"** (aus „Gibt es ein Spiel des Spieltags?") + Charakter *Mutig & wild* |
| `duell` | neue Frage **„Dürft ihr euch gegenseitig etwas wegnehmen?"** (4 Stufen) |

⚠️ Zweimal ist ein Feld bewusst NICHT zu einer eigenen Frage geworden, sondern
in eine bestehende gewandert (`teamMods`, `drehrad`) — sonst hätte Stufe 2
elf Regler. Stufe 2 ist eine Handvoll FRAGEN, keine kürzere Profi-Ansicht; ein
Test prüft jetzt genau diese Eigenschaft (jede Beschriftung endet auf „?").

**Neun Felder sind BEGRÜNDET Profi-only geworden**, und die Begründung ist bei
vier davon eine Messung: `winnerFloor`, `perGameCap`, `favFlopPenalty` und
`modCap` tragen in ALLEN SECHS vermessenen Presets denselben Wert. Eine
Stufe-2-Stufe, die davon abweicht, wäre ein Regelwerk, das niemand vermessen
hat. Dazu der Joker-Unterbau (`jokerBasis`, `budget`, `limitKlassen` — sie
beschreiben, WIE Joker verwaltet werden, nicht wie sich die Runde anfühlt),
`tippfenster` (eine Betriebsfrage: wann liegen echte Quoten vor) und
`tippEinfluss` (Kandidat für Stufe 2, sobald ein Balance-Durchgang die
Markttiefe vermessen hat).

**Noch offen: `wettbewerbe`** — gehört in den Gewichtungs-Durchgang am Ende
(Nutzer-Reihenfolge Punkt 4, „bewusst grob, 2-/5-Prozent-Stufen"). Ein Test
hält fest, dass es GENAU diese eine ist; eine zweite wäre ein neuer Befund.

#### 🔴 Drei Funde, die erst die Gegenprobe gebracht hat

Die neuen Stufen wurden gegen `reglerWarnung.js` geprüft — und **alle drei
Funde stammen aus dieser Prüfung, keiner aus einem Test:**

1. **Charakter *Mutig & wild* mit `derbyFaktor: 1,5`:** Modifikatoren summieren
   sich auf ×2,8 bei einem Deckel von ×2,5 — der Derby-Aufschlag lief ins
   Leere. Genau die Falle, zu der ich zwei Zeilen darüber einen Warnkommentar
   geschrieben hatte. Jetzt 1,15 (= ×2,45, knapp darunter).
2. **`DEFAULT_DUELL.maxProSaison: 60` liegt unter dem Erprobten.** Die eigene
   Regler-Warnung meldet: „der Deckel greift schon beim ersten Duell, ob 10 %
   oder 100 % geklaut werden, ändert am Ergebnis nichts mehr." Es fällt nur
   nicht auf, weil das Duell standardmäßig aus ist. Die Stufe-2-Stufen setzen
   150. ⚠️ **Die Vorgabe selbst steht noch auf 60** — sie gehört Account 2, und
   ein Wechsel verschiebt dessen Balance-Messungen.
3. **Das Empfehlungsband für `saison.gewicht` las den falschen Katalog.**
   Es wird aus `PRESETS` abgeleitet — das sind WERTUNGS-Regelwerke, die die
   Saison-Wetten alle aus haben und deshalb überall die Vorgabe 1 tragen.
   Ergebnis: Band 0,565–1,435, und das kuratierte Saison-Preset „nebenbei"
   (Gewicht 0,5) galt als unerprobt. Der Charakter *Nur nebenbei* und die Stufe
   „Als Würze" lösten beide einen Hinweis aus, obwohl beide genau das tun, was
   ihr Name sagt. Ein Feld darf jetzt über `quelle` sagen, wo seine erprobten
   Werte liegen — die Regel bleibt „das Band kommt aus den kuratierten
   Voreinstellungen", sie fragt nur den richtigen Katalog.

**Der Test daraus, der bleibt:** keine Stufe-2-Stufe darf sich eine Warnung
holen, die `DEFAULT_RULES` nicht schon hat. Verglichen wird gegen die Vorgabe
und nicht gegen „keine" — das nackte Vorgabe-Regelwerk ist selbst kein
vermessenes Preset und trägt vier Meldungen; die mitzuzählen hiesse, jede Stufe
für etwas verantwortlich zu machen, das sie gar nicht gesetzt hat.

### ⏰ Echte Spielpläne vor dem Launch — HARTE FRIST, Bundesliga ✅ erledigt
**Der einzige Punkt mit einem Datum: 28.08.2026.**

> ✅ **Stand 2026-07-28: der Weg steht, die Bundesliga ist getauscht.**
> `npm run import:spielplan -- bl` holt die 306 echten Begegnungen samt
> Anstoßzeiten von OpenLigaDB (frei, ohne Schlüssel) und legt sie als
> `src/lib/spielplaene/bl-2026.js` ab; `baueLiga` übernimmt sie unverändert.
> In der App steht jetzt Bayern – Stuttgart am 28.08. 20:30, der echte Auftakt.
>
> **Drei Entwurfs-Entscheidungen, die nicht gebrochen werden sollten:**
> 1. **Ein fehlerhafter Plan bricht den Import HART ab** (`pruefeSpielplan`).
>    Ein Klubname mit anderer Schreibweise erzeugte sonst still eine halbe
>    Saison — sichtbar erst, wenn jemand auf ein Spiel tippt, das es nicht gibt.
>    Unvollständigkeit WARNT dagegen nur: die Rückrunde steht oft noch nicht,
>    und eine Warnung, die den Import verhindert, führt dazu, dass jemand die
>    Prüfung abschaltet.
> 2. **Die Herkunft wird abgelesen, nicht behauptet** (`herkunftLabel`). Der
>    Katalog ist ab jetzt GEMISCHT, und das bleibt er bis zur CL-Auslosung Ende
>    August — die Oberfläche sagt „teilweise echt (306 von 1606)". Gezählt wird
>    über den Wettbewerb, weil der Store nur DB-Spalten durchreicht.
> 3. **Der Index `spielplaene/index.js` löst eine Henne-Ei-Kette auf:** der
>    Importer braucht die Klublisten aus den Ligadateien; importierten die
>    ihrerseits direkt eine Plan-Datei, ließe sich der erste Lauf nie starten.
>
> **Offen bleiben PL, La Liga und Serie A** — OpenLigaDB hat sie nicht. Der Weg
> steht: `npm run import:spielplan -- pl --datei <pfad.json>` nimmt eine
> Liste `[{ matchday, home, away, kickoff }]` und läuft durch dieselbe Prüfung.
> Es fehlt nur die Quelle. **Die Champions League bleibt bis zur Auslosung
> erzeugt** — das ist Wartezeit, kein Versäumnis.
>
> ### ✅ Nachtrag 2026-07-28: die Klublisten von PL, La Liga und Serie A sind korrigiert
>
> Aufgefallen beim Abgleich gegen die Quoten-API (`npm run odds:pruefen`,
> kostenlos). **Je Liga sind DREI Vereine falsch** — Auf- und Absteiger, die wir
> beim Schätzen nicht treffen konnten:
>
> | Liga | bei uns, gibt es nicht mehr | fehlt bei uns |
> |------|------------------------------|----------------|
> | Premier League | FC Burnley · West Ham United · Wolverhampton Wanderers | Coventry City · Hull City · Ipswich Town |
> | La Liga | Girona FC · RCD Mallorca · Real Oviedo | Málaga · Real Racing Santander · Deportivo La Coruña |
> | Serie A | AC Pisa · Hellas Verona · US Cremonese | Frosinone · Monza · Venezia |
>
> **Das wiegt schwerer als die Quoten.** Ein falscher Spielplan ist ärgerlich,
> eine falsche Liga-Besetzung macht ganze Vereine untippbar und erfindet welche,
> die es in dieser Liga nicht gibt. Die Bundesliga ist NICHT betroffen (18 von 18
> stimmen, von OpenLigaDB unabhängig bestätigt).
>
**Erledigt am selben Tag.** Vorgehen, weil es beim nächsten Auf-/Abstieg wieder
gebraucht wird:
> 1. **Klubs tauschen**, aber die Aufsteiger bekommen DIESELBEN Rating-Plätze
>    wie die Abgestiegenen — die Spreizung der Liga bleibt damit unverändert,
>    und genau gegen diese Spreizung ist die Balance vermessen. Einzige
>    Ausnahme: Girona lag im Mittelfeld (1,08), sein Platz ging an Málaga, damit
>    La Liga oben nicht ausdünnt.
> 2. **Die Champions League mitziehen.** Girona stand dort als eigener Eintrag;
>    ein Klub in der CL, den keine Liga führt, ist ein Widerspruch im Katalog.
>    Ersetzt durch Villarreal, mit denselben Werten wie in `laLigaData.js`.
>    Ein Test hält das jetzt fest.
> 3. **`npm run balance`** — Ergebnis: kein Preset kippt, der Kenner gewinnt
>    überall (Standard 50,8 % · Hardcore 63,3 % · Gemütlich 60,8 %).
> 4. **`npm run seed:matches`**, weil die Klubs in den SQL-Dateien stecken.
>
> Gegenprobe: `npm run odds:pruefen` meldet für alle vier Ligen „alle Klubnamen
> passen" — 80 Klubs gegen die Live-API, ohne einen Credit zu verbrauchen.
>
> ⚠️ **Nicht die Ratings vergessen.** Ein Aufsteiger mit Mittelfeld-Rating
> verschiebt die Quoten-Verteilung, gegen die die Presets vermessen sind. Namen
> tauschen allein reicht nicht.
>
> ⚠️ **Nutzer-Aufgabe:** `supabase/seed-matches-bl.sql` ist neu erzeugt und muss
> im SQL-Editor erneut ausgeführt werden, sonst kennt die Live-DB weiter den
> alten, erfundenen Bundesliga-Spielplan.

Alle 1605 Spiele im Katalog sind **simuliert**. Echt sind nur die Klubs und die
üblichen Anstoßzeiten je Liga — Spielplan, Quoten, Ergebnisse und Torschützen
sind generiert, die Spielernamen bewusst erfunden. Für Entwicklung und Test ist
das genau richtig; für den Betrieb muss es getauscht werden, sonst tippen
Spieler auf Begegnungen, die es nie gibt.

**Reihenfolge und Machbarkeit:**
- **Die vier Ligen gehen sofort** — Bundesliga, Premier League, La Liga und
  Serie A haben ihre Termine längst veröffentlicht.
- **Die Champions League geht NICHT vor Ende August** — die Ligaphase wird erst
  Ende August ausgelost. Bis dahin bleibt der generierte CL-Plan stehen. Das
  ist kein Versäumnis, sondern eine Wartezeit.

**Kein Umbau, nur ein Datentausch:** die fünf Ligadateien liefern reine Daten,
`ligaGenerator.js` baut daraus die Saison. Danach `npm run seed:matches` und die
SQL-Runde erneut (fünf Einzeldateien, der SQL-Editor scheitert an der 1,9-MB-
Gesamtdatei).

⚠️ **Beim Tausch mitdenken:** echte Spielpläne heißen auch echte QUOTEN, sobald
die API angebunden ist. `RATING_SHRINK` in `oddsGenerator.js` greift dann NICHT
mehr (echte Quoten kommen über `buildSnapshot`) — die Balance ist gegen die
simulierte Quoten-Verteilung vermessen und sollte gegen die echte einmal
nachgeprüft werden (`npm run balance`).


### 🔬 Quoten-Modell gegen den echten Markt vermessen (2026-07-29) — ✅ ERLEDIGT

> ✅ **Abgeschlossen am 29.07. — und der größere Fund war nicht der geplante.**
>
> **1) Das echte Ergebnis-Raster war schief.** `rasterAusMarkt` hat die HÖHE der
> Buchmacher-Marge herausgerechnet, aber nicht ihre SCHIEFE — und ein Buchmacher
> verteilt 65 % Overround nicht gleichmäßig, er lädt sie auf die Außenseiter.
> Nachweisbar **ohne jede zusätzliche Abfrage**, weil wir für dasselbe Spiel
> einen zweiten, viel saubereren Markt schon in der Hand halten: rechnet man das
> normierte Raster zu Heim/Remis/Auswärts zusammen, MUSS die 1X2-Verteilung
> herauskommen (7,7 % statt 65 % Marge). Tat es nicht — **2,4 bis 5,7
> Prozentpunkte daneben, in allen neun Spielen mit demselben Vorzeichen.**
> In Preisen: die naive Normierung zahlte für die WAHRSCHEINLICHEN Ergebnisse
> 11–30 % zu viel (Bayern–Stuttgart 2:1 zu 14,57 statt 11,17). Da reale
> Endstände meistens die wahrscheinlichen sind, war das ein stiller Aufschlag
> auf jedes Spiel mit echtem Raster — gegenüber jedem Spiel ohne. Also genau der
> unsichtbare Fairness-Bruch, gegen den das Herausrechnen der Marge einmal
> eingebaut wurde. `longshotK` eicht das jetzt **je Spiel** am eigenen
> 1X2-Markt (gemessen k = 1,18–1,34, Restfehler danach 0,0–1,9 pp).
>
> **2) ρ ist jetzt gemessen — die Auflösung der Fehlmessung unten.** Der freie
> Fit hat zwei Freiheiten für zwei Vorgaben und trifft die 1X2 deshalb fast
> exakt; der Torschnitt fällt dabei ungeprüft mit ab. Ist er VORGEGEBEN, bleibt
> ρ als einzige Unbekannte übrig — eine Messung je Spiel statt einer Konstante
> für alle. Gemessen: **ρ = −0,013 bis −0,158**, am stärksten in den
> AUSGEGLICHENEN Spielen. Das reproduziert nicht nur den Literaturwert (≈ −0,13),
> sondern den dokumentierten Mechanismus: die Unabhängigkeits-Annahme liefert
> genau dort zu wenig Remis. **Falsch war nie die Mechanik, falsch war der
> Anker.** `RHO` bleibt auf 0 und gilt weiter für den ungebundenen Fall.
> Preis der Bindung: größter 1X2-Fehler 0,10 → 0,15 pp, dafür stimmt der
> Torschnitt exakt statt um bis zu 0,5 Tore daneben.
>
> **3) Eine stille Inkonsistenz nebenbei geschlossen.** Bei einem echten Raster
> wurde `correctScore` ersetzt, während `margin` und `teamGoals` weiter aus dem
> ungebundenen Fit kamen — dasselbe Spiel trug **zwei verschiedene
> Tor-Erwartungen**. Jetzt teilen sie eine.
>
> **4) Die Quelle des Torschnitts, nach Rangfolge:** echte Über/Unter-Linie >
> Ergebnis-Buch > Schätzung; `snapshot.torschnittQuelle` sagt, welche es war.
> `totals` kommt in DERSELBEN Liga-Anfrage wie 1X2 (der Anbieter rechnet Märkte
> × Regionen) — **1 Credit für die ganze Liga**, während `correct_score` 1
> Credit JE SPIEL kostet, und sie steht Wochen vor Anpfiff statt erst kurz
> davor. Für die Masse der Spiele ist sie die einzige realistische Messung.
>
> ⚠️ **Offen (Nutzer/nächste Session): einmal `npm run odds:holen -- <liga>`
> laufen lassen.** Die gespeicherten Quotendateien tragen noch kein `total` —
> es kostet ab jetzt 2 statt 1 Credit je Liga. Bis dahin greift unverändert das
> Ergebnis-Buch (bl: 9 von 9) bzw. die Schätzung. **Es wurde bewusst kein
> Credit ausgegeben:** die ganze Messkette oben lief gegen bereits
> gespeicherte Daten.

Die Frage war: **wie sauber entstehen die Quoten für „nah ans Ergebnis"?**
Antwort in Kurzform: die Kette ist korrekt und in sich stimmig, das MODELL ist
gut, aber nicht exakt — und es gibt einen deutlich besseren Weg, den die API
schon hergibt.

**Die Kette** (echte Quoten): 1X2 → Marge herausrechnen → Tor-Erwartungen
schätzen (`fitLambdas`) → volles Poisson-Raster (`buildSnapshot`) →
`scoreResult` liest `correctScore[reales Ergebnis]` × `exp(−k · Abstand)`.
Der Fit reproduziert die Marktquoten auf **0,03–0,10 Prozentpunkte** — an der
Stelle ist nichts faul.

**⚠️ Eine eigene Fehlmessung, dokumentiert, weil die Lehre zählt.** Die
gefitteten Torschnitte streuten von 2,43 (ausgeglichene Spiele) bis 4,14
(Bayern–Stuttgart). Das sah nach Modellfehler aus, und ich habe eine
Dixon–Coles-Korrektur so kalibriert, dass der MITTELWERT den langjährigen
Bundesliga-Torschnitt (~3,1) trifft. Die Gegenprobe an der echten
**Über/Unter-Linie** hat das umgeworfen: der Markt erwartet für Bayern–Stuttgart
**4,07** Tore. Der unkorrigierte Fit lag richtig, meine Kalibrierung hätte ihn
auf 4,44 verschlechtert. **Ein Liga-Mittelwert sagt nichts über ein einzelnes
Spiel.** `RHO` steht deshalb auf 0; die Mechanik bleibt getestet stehen.

**Der echte, kleinere Fehler:** bei ausgeglichenen Spielen fittet das Modell
0,3 Tore zu niedrig (2,43 gegen 2,90 laut Markt), bei einseitigen trifft es
(+0,07). Ursache ist die Unabhängigkeits-Annahme: bei realistischem Torschnitt
liefert sie in ausgeglichenen Spielen 2–3,6 Prozentpunkte zu wenig Remis.

**Direktvergleich mit dem echten `correct_score`-Markt** (66 Ergebnisse, US-
Buchmacher, Overround **65 %** gegenüber 7,7 % bei 1X2 — Ergebnis-Wetten sind
für den Buchmacher ein viel besseres Geschäft): auf dieselben 36 Zellen
normiert weichen wir in Summe **10,9 Prozentpunkte** ab, die zehn
wahrscheinlichsten Ergebnisse auf 0–15 %. Extremwerte 0,50 bis 1,36.

**→ Nächster Schritt, klar belegt:** den Torschnitt nicht mehr schätzen,
sondern aus `totals` lesen, und wo `correct_score` vorliegt, gleich das echte
Raster nehmen. Details unten. — ✅ **beides gebaut, siehe Block oben.**

### 📡 Was die Quoten-API wirklich hergibt (gemessen, nicht angenommen)

Gemessen an Bayern–Stuttgart, einen Monat vor Anpfiff (Zahl = gelieferte
Ausgänge). **Leere Antworten kosten keinen Credit**, nur gefüllte.

| Markt | eu | us | **entspricht bei uns** |
|---|---|---|---|
| `h2h` (1X2) | 57 | 24 | `snap.winner` — schon in Benutzung |
| `correct_score` | 0 | **66** | **`snap.correctScore`** — das Herz der Nähe-Wertung |
| `alternate_spreads` | **102** | 8 | `snap.margin` (Tor-Abstand) |
| `alternate_team_totals` | 0 | **40** | `snap.teamGoals` (Team-Tore-Nähe) |
| `alternate_totals` | **133** | 37 | pinnt den Torschnitt exakt statt ihn zu schätzen |
| `team_totals` | 0 | 8 | dito, gröber |
| `halftime_fulltime` | 0 | 18 | — kein Markt bei uns |
| `correct_score_h1` | 0 | 52 | — kein Markt bei uns |
| `double_chance` / `draw_no_bet` | 6 / 0 | 6 / 6 | — in `winner` enthalten |
| `corners_1x2` | 0 | 0 | — nicht angeboten |
| **alle `player_*`** | **0** | **0** | ❌ Torschützen — siehe unten |

**Das ist die eigentliche Nachricht: VIER unserer fünf Wertungs-Märkte gibt es
echt.** Endstand, Sieger, Tor-Abstand und Team-Tore lassen sich direkt aus dem
Markt füllen — das Poisson-Modell wäre dann nur noch Rückfall für das, was
fehlt. Kosten: fünf Märkte × fünf Wettbewerbe = **25 Credits je Auffrischung**.

Ecken gibt es für dieses Spiel nicht (`corners_1x2` leer, `totals_corners`
existiert als Schlüssel nicht) — und sie hätten bei uns ohnehin keinen Markt.

**US oder EU — spielt es eine Rolle? Nein.** Margenbereinigt weichen die beiden
Regionen über neun Bundesliga-Spiele um **0,47 Prozentpunkte im Mittel** ab
(Maximum 0,74). Das ist derselbe Markt. Sinnvoll ist trotzdem eine Mischung:
`h2h`/`totals` aus **eu** (mehr Büros → robusterer Median), `correct_score`
und Torschützen aus **us** (die einzige Region, die sie führt).

### ✅ Torschützen: kein API-Problem, ein ZEIT-Problem — bewiesen

Für die Bundesliga liefern alle `player_*`-Märkte einen Monat vor Anpfiff
**0 Buchmacher**, in jeder Region. Das sah nach einer Lücke des Anbieters aus.
Ist es nicht — die Gegenprobe an einem **MLS-Spiel in 64 Stunden** (MLS ist eine
der unterstützten Ligen und spielt gerade):

```
player_goal_scorer_anytime   3 Büros, 67 Ausgänge
   Talles Magno 2.15 · Hannes Wolf 3.20 · Malachi Jones 3.20 · Agustín Ojeda 3.75
player_first_goal_scorer     2 Büros, 47 Ausgänge
player_shots_on_target       2 Büros, 82 Ausgänge
```

Echte Spieler, echte Quoten. Die Doku sagt dasselbe: *„As an event's commence
time approaches, this endpoint will return more market keys as bookmakers open
more markets."* **Ein Anbieterwechsel würde daran nichts ändern** — im Juli
bepreist kein Buchmacher der Welt Bundesliga-Torschützen. Erwartbar sind sie
1–7 Tage vor Anpfiff, sobald die Aufstellungen absehbar sind.

**💡 Die Folge ist größer als „ein Markt mehr":** mit den Torschützen-Quoten
kommen **echte Spielernamen frei Haus**. Unsere Kader sind bewusst erfunden
(`NAMENSPOOLS`), weil echte nach jedem Transferfenster falsch wären — aber genau
dieses Problem hat der Buchmacher schon gelöst: er stellt nur Spieler, die auch
spielen. Er liefert grob 20 je Partie, wir brauchen 5 je Team. Das passt.

### 📏 NACHGEMESSEN (30.07.): die Torschützen kommen erst ~2 TAGE vorher, nicht 1–7

Die Angabe „1–7 Tage" oben war eine Schätzung aus zwei Datenpunkten (ein Monat
vorher = 0, 64 Stunden vorher = 3 Bücher). Der Nutzer fragte, ob es wenigstens
4 Tage seien. **Nachgemessen an 10 Spielen aus fünf Ligen — nein:**

| Vorlauf | Liga | Buchmacher | Ausgänge |
|---|---|---|---|
| 1,6 T | MLS | 3 | 73 |
| 2,6 T | MLS | 4 | 114 |
| 2,7 T | MLS | 4 | 109 |
| 2,8 T | MLS | 4 | 118 |
| **3,1 T** | **Dänemark, Schweiz** | **0** | **0** |
| **3,2 T** | **Schottland** | **0** | **0** |
| **3,5 T** | **Argentinien** | **0** | **0** |
| 4,5 T | Argentinien | 0 | 0 |
| 6,6 T | Argentinien | 0 | 0 |
| 9,5 / 16,7 T | MLS | 0 | 0 |

**Die Schwelle liegt zwischen 2,8 und 3,1 Tagen.** Sie ist damit deutlich enger
als angenommen und liegt UNTER dem Wert, mit dem man planen möchte.

⚠️ **Zwei Einschränkungen, die dazugehören:** (1) Die Bundesliga ließ sich nicht
messen — sie startet erst am 28.08., der früheste Anpfiff liegt 29 Tage weg.
Der endgültige Beleg ist erst Ende August möglich. (2) Getestet wurde mit
`regions=us,eu`; die vollen MLS-Bücher kommen von US-Anbietern, die ihre
Heimatliga früher bepreisen. Für die Bundesliga ist eher MIT, nicht mit
weniger Vorlauf zu rechnen — aber die drei europäischen Ligen bei 3,1–3,2 Tagen
waren ebenfalls leer.

💡 **Nützlicher Nebenbefund: leere Antworten kosten wirklich keinen Credit.**
Über sechs erfolglose Abfragen blieb der Zähler bei 347 stehen. Ein
Warteschleifen-Skript, das täglich nachsieht, ob die Märkte schon offen sind,
ist damit gratis.

**→ Die Folge für den Entwurf:** ein Tipp-Fenster von einer Woche und echte
Torschützen schließen sich aus. Der brauchbare Ausweg ist NICHT, das Fenster zu
verkürzen (dann verliert man die frühen Tipper), sondern die beiden Dinge zu
trennen, die man bisher zusammen gedacht hat:

- **NAMEN früh, PREISE spät.** Welche Spieler zur Auswahl stehen, weiß
  `kader.js` schon lange vorher — die Zuordnung wächst über die Läufe und
  bleibt bestehen, sie hängt nicht am aktuellen Spiel. Echte Namen sind also
  eine Woche vorher verfügbar; nur ihre ANYTIME-Quote ist es nicht.
- **Der Preis wird beim Öffnen des Spieltags eingefroren** (`quotenStand:
  "oeffnung"`), für alle gleich. Liegt der Markt bis dahin vor, ist er echt;
  sonst bleibt der abgeleitete Preis stehen. In beiden Fällen sehen alle
  Tipper dasselbe, und das ist die Fairness-Regel, um die es geht.

Damit ist die Kollision aufgelöst, ohne das Tipp-Fenster anzufassen: **der
Spieler bekommt immer echte Namen und immer denselben Preis wie alle anderen.**

⚠️ **Es hängt aber an einem Faden, und der berührt eine Fairness-Regel:** die
Quoten kommen 1–7 Tage vor Anpfiff, unser Tipp-Fenster öffnet standardmäßig
**eine Woche** vorher. Wer früh tippt, sähe erfundene Namen, wer spät tippt,
echte — das geht nicht. Entweder wandert das Tipp-Fenster für den
Torschützen-Markt nach hinten, oder der Snapshot wird nachgezogen, sobald die
Quoten da sind. Letzteres kollidiert mit „ab Anpfiff ist eingefroren" bzw. mit
dem Grundsatz, dass ein abgegebener Tipp seinen Wert nicht mehr ändert.
**Entwurfsentscheidung, keine Fleißarbeit.**

### 🧩 VORGEHEN: Torschützen-Kader ohne Kaderquelle — was wann schiefgehen kann

Festgehalten, BEVOR es im Betrieb auffällt. Die Vereinszuordnung entsteht aus
der Schnittmenge mehrerer Spiele (`kader.js`); hier steht, wo das an Grenzen
stößt und was jeweils zu tun ist.

**Die Eigenschaft, auf der alles ruht:** ein Spieler taucht nur in Spielen
SEINES Vereins auf, der Verein steht also in jedem beobachteten Paar und damit
immer in der Schnittmenge. **Bleibt einer übrig, ist es zwangsläufig der
richtige — das Verfahren kann sich nicht vertun, nur unentschieden bleiben.**
Ein falsch zugeordneter Spieler wäre der teure Fehler (auffallen würde er erst
bei der Abrechnung, und dann hat jemand auf ihn getippt); ein unentschiedener
kostet nur Komfort. Ein Test hält die Eigenschaft fest.

| Fall | Was passiert | Vorgehen |
|---|---|---|
| **Verletzt, Comeback in 2 Monaten** | Der Buchmacher führt ihn nicht, er fällt aus den Beobachtungen | ✅ **Gelöst.** Die Zuordnung hat ein GEDÄCHTNIS: wer gerade nicht gelistet ist, behält seinen Verein und ist am ersten Tag zurück sofort wieder tippbar |
| **Transfer** | Die Schnittmenge widerspricht dem Gedächtnis | ✅ Alte Zuordnung wird VERWORFEN, nach dem 2. Spiel beim neuen Klub steht sie wieder. Kurz unentschieden statt dauerhaft falsch |
| **Neuzugang / Debütant** | Nie zuvor gesehen | Braucht zwei Spiele. Nicht abkürzbar ohne externe Quelle — in `proSpiel` trotzdem tippbar |
| **Zwei Spieler, gleicher Name** | Schnittmenge leert sich, Zuordnung springt | ⚠️ Die EINZIGE Konstellation, die das Verfahren nicht lösen kann → Eintrag in `UEBERSTEUERT` (`kader.js`). Wächst die Liste über eine Handvoll, stimmt etwas anderes nicht |
| **1. Spieltag der Saison** | Jeder Klub hat genau EIN Spiel → null Schnittmengen | ✅ **Gelöst** über Beobachtungs-Wettbewerbe (siehe unten) |

**⚠️ Das Startproblem und seine Lösung.** Am 1. Spieltag hätte jeder Klub genau
eine Beobachtung — es wäre also **kein einziger Spieler zugeordnet**, und
ausgerechnet zum Launch ginge der Torschützen-Tipp je Mannschaft nicht. Deshalb
zieht der Abruf zusätzlich aus Wettbewerben, die wir gar nicht anbieten:
**der DFB-Pokal läuft ab dem 21.08., die Bundesliga startet am 28.08.** Die
Pokal-Runde liefert die erste Beobachtung, der 1. Spieltag die zweite — zum
Launch steht die Zuordnung. Dass die Pokal-Gegner Drittligisten sind, stört
nicht: für die Schnittmenge zählt nur der eigene Verein.

**Was zu tun ist (Betrieb):**
1. **Ab sofort wöchentlich** `npm run odds:holen -- <liga> --schuetzen` laufen
   lassen. Die Datei `src/lib/kader/<liga>.js` wächst mit; der Lauf sagt im
   Klartext, wie viele Spieler zugeordnet sind.
2. **Vor dem Launch prüfen**, dass die Quote hoch genug ist. Ist sie es nicht,
   ist das kein Blocker — der Modus `proSpiel` braucht die Zuordnung nicht.
3. **Nach jedem Transferfenster** ist eine kurze Delle normal; sie schließt
   sich nach zwei Spieltagen von selbst.

✅ **Eingehängt (2026-07-29).** `spielerAusMarkt` in `oddsApi.js` setzt die
echten Torschützen in `snapshot.players`, sobald die Zuordnung greift; jedes
Match trägt `snapshot.spielerQuelle` (`markt` / `erfunden`). Zwei Punkte:

- **Die ANYTIME-Quote ist exakt die des Marktes.** Die Marge wird herausgerechnet
  und unverändert wieder aufgeschlagen — die Annahme über ihre Höhe wirkt sich
  ausschließlich auf den DOPPELPACK aus, nie auf den Preis, den der Spieler
  sieht. Nachgemessen: Talles Magno 2,78 rein, 2,78 raus.
- **Den Markt „2 oder mehr Tore" gibt es nicht** (geprüft, 0 Buchmacher). Der
  Doppelpack wird über dieselbe Poisson-Annahme abgeleitet wie bei den
  erzeugten Kadern: aus P(≥1) folgt λ = −ln(1−p), daraus P(≥2).
- **Sicherheitsschwelle:** hat eine Mannschaft weniger als zwei zugeordnete
  Schützen, bleibt der GANZE erfundene Kader stehen. Eine halb echte Liste wäre
  im Tipp-Screen eine leere Fläche auf einer Seite.

Solange die MLS-Zuordnung noch leer ist, greift genau diese Schwelle — der
Katalog zeigt weiter erfundene Namen, und das ist richtig so.

### Balance: EIN Durchgang am Ende statt Feinjustierung nebenbei — ENTSCHIEDEN (Nutzer)
**Arbeitsweise ab jetzt.** Beim Bauen einer neuen Mechanik gibt es nur einen
SCHNELLTEST: „gewinnt der Kenner strukturell noch?" — ja/nein, keine Zahlen-
Suche. Findet er einen ENTWURFSFEHLER (Mechanik belohnt das Falsche), wird
sofort korrigiert. Findet er nur eine Unwucht in den WERTEN, bleibt es beim
konservativen Standard und wandert hierher.

**Grund:** Jede neue Mechanik verschiebt die Balance aller anderen. Wer
zwischendrin auf die zweite Nachkommastelle tunt, macht dieselbe Arbeit
mehrfach — und tunt gegen ein Regelwerk, das es am Ende gar nicht mehr gibt.

**Der Abschluss-Durchgang (eigene Aufgabe, vor dem Launch):**
- Alle Presets × alle üblichen Joker-Varianten × Modifikator-Werte in EINEM
  Lauf durchmessen (`balanceSim.js`), nicht einzeln.
- Daraus die **Leitplanken** ableiten: je Regler ein empfohlener Bereich, der
  in der Pro-Ebene als „Empfehlungsband" angezeigt wird.
- Presets neu ausbalancieren, `presets.balance.test.js` nachziehen.
- ✅ **Die bekannte Lücke ist geschlossen.** Der Simulator kennt jetzt
  Vereins-Zugehörigkeit: jeder Tipper hat einen Verein, der an jedem Spieltag
  in genau einem von neun Spielen mitspielt — und, das ist der Punkt, er tippt
  ihn zu OPTIMISTISCH (`FAN_OPTIMISMUS`). Ohne diese Voreingenommenheit hätte
  der Simulator den Heimatbonus systematisch zu gut bewertet. Die beiden
  Extreme (Favoriten-Tipper, Zocker) sind bewusst ausgenommen: sie sind
  Messinstrumente, keine Menschen — eine Ausnahme darin verbögen die Skala.
- **Ergebnis Heimat-Joker (3 Seeds × 60 Saisons, alle Presets):** harmlos.
  Über alle Presets gewinnt der Kenner MIT Heimatbonus eher mehr als weniger
  (Standard 47 % → 50 %, Underdog-Party 38 % → 44 %), weil der Bonus die aus
  der Fan-Brille entstehenden Fehltipps mitverstärkt. Auch bei ×2,0 bleibt der
  Kenner bei 46 %. Standard 1,2 und Obergrenze 2,0 sind damit belegt.
- **Ergebnis Mut-Joker.** Mit Vereins-Modell (4 Seeds × 60 Saisons),
  Kenner : Zocker — ×1,05 → 51:16 · ×1,10 → 50:19 · ×1,15 → 47:23 ·
  ×1,20 → 42:30. Ab 1,15 schmilzt der Vorsprung des Könnens sichtbar ab.
  ⚠️ **Wie so ein Befund umgesetzt wird (Nutzer-Korrektur):** Ich hatte zuerst
  `RULE_LIMITS.joker.mutFaktor.max` gesenkt — falsch. Eine Messung darf nie
  eine harte Grenze verengen, sonst wird aus jeder Messung ein Verbot und der
  Admin verliert eine Freiheit, statt eine Rückmeldung zu bekommen. Richtig
  ist: die Grenze bleibt, der Wert landet als GEMESSENES BAND in
  `reglerWarnung.js` — mit Beispielrechnung im Warntext („bei ×1,2 gewinnt der
  Kenner nur noch 42 %, der Zocker schon 30 %"). Felder, die in keinem Preset
  vorkommen, tragen ihr Band jetzt direkt am Feld (`gemessen`).

### ✅ Abschluss-Durchgang DURCHGEFÜHRT (2026-07-27) — `npm run balance`

Der eine Lauf, den dieser Abschnitt fordert, ist jetzt ein festes Kommando:
`npm run balance` (3 Saatzahlen × 40 Saisons × alle Presets × Big Game
aus/Standard/Maximum). **Ergebnis: kein Preset kippt.**

**⚠️ Wichtiger als das Ergebnis war der Weg dorthin — der Simulator hat drei
Ebenen gar nicht gemessen.** Alle drei Fehler waren STILL (Ampel grün, Zahlen
plausibel, gemessen wurde nichts):

1. **Der Ranglisten-Joker fiel aus, sobald eine ZWEITE Ebene aktiv war.** Der
   Simulator setzte als Gewicht `maxTotalModifier` (Obergrenze aller Ebenen);
   die Engine nimmt im Ranking-Modus aber nur Werte AUS DEM POOL. Mit Big Game,
   Wettbewerbs-Gewichten **oder Team-Mods** lag der Wert außerhalb → Aufschlag
   0. Heißt rückblickend: jede Runde mit Ranglisten-Joker UND Derby-Regeln war
   schon vorher falsch vermessen.
2. **Big Game war unsichtbar** — kein Snapshot trug einen `bigGameWert`.
3. **Der Ranglisten-Modus war nicht modelliert** (ein Joker statt verteilter
   Gewichte) — „Joker" und „Rangliste" lieferten identische Zahlen.

**Lehre fürs nächste Mal:** bevor eine neue Ebene gemessen wird, erst prüfen, ob
der Simulator sie überhaupt SIEHT. Ein Test in `presets.balance.test.js` hält
das jetzt fest — der Modifikator-Anteil MUSS steigen, wenn die Ebene aktiv ist.

**Befund Big Game:** über die ganze Spanne unbedenklich, der Kenner bleibt
überall vorn. Die Stellschraube ist nicht der Aufschlag, sondern die SCHWELLE:
bei 0 bekommt jeder Spieltag ein Topspiel, aus der Auszeichnung wird eine
Dauer-Zugabe (Kenner 61 → 57 %, Zocker 9 → 11 %). Bei „Underdog-Party" gewinnt
der Kenner MIT Big Game sogar minimal mehr — der Aufschlag verstärkt auch die
Fehlgriffe des Zockers, dieselbe Mechanik wie beim Heimatbonus.

**Über alle drei Komplexitätsstufen umgesetzt:** Charakter-Paket „Mutig & wild"
(Stufe 1) · Klartext-Stufe „Gibt es ein Spiel des Spieltags?" (Stufe 2) ·
gemessenes Band an beiden Reglern (Stufe 3). Die harten `RULE_LIMITS` blieben
unberührt — eine Messung verengt nie eine Grenze.

**Noch offen:** Wettbewerbs-Gewichte und Ereignisse sind weiterhin ungemessen.
Für die Wettbewerbs-Gewichte braucht der Simulator eine GEMISCHTE Runde — bei
nur einem Wettbewerb wirkt das Gewicht auf alle Spiele gleich und kann die
relative Rangfolge gar nicht verschieben. Das ist der nächste Ausbauschritt.


### Spielerstellung in 3 Komplexitätsstufen — GEBAUT ✓
`src/lib/charaktere.js` + `RundenCharaktere.jsx` (Stufe 1) ·
`src/lib/einfachRegler.js` + `EinfacheRegler.jsx` (Stufe 2) · die Profi-Ansicht
war schon da. Der Stufenwähler sitzt oben in der Spielerstellung und ändert
nur die ANSICHT auf dasselbe `rules`-Objekt — beim Wechsel geht nichts
verloren, wie unten entworfen.

Offen geblieben ist nur die Warnung beim ZURÜCKschalten, wenn Profi-Werte zu
keinem Paket mehr passen.

Ursprünglicher Entwurf:
Ein Admin soll wählen, wie tief er einsteigt. **Wichtig: die Stufe ist eine
ANSICHT auf dasselbe `rules`-Objekt, kein zweites Datenmodell** — beim Wechsel
geht nichts verloren.

- **Stufe 1 „Schnellstart"** — keine Regler, sondern 3–4 fertige RUNDEN-CHARAKTERE.
  Jeder bündelt Regelwerk + Saison-Wetten + Joker-Einstellung in einem Paket
  („Klassisch & fair", „Mutig & wild", „Kenner-Runde", „Nur nebenbei").
  Ein Klick → Runde steht. Unsere Empfehlung ist der Standard.
- **Stufe 2 „Anpassen"** — 4–6 GROSSE Regler in Klartext statt Zahlen
  („Wie mutig soll es sein?" zahm ↔ wild), jeweils mit Beispielsatz
  („ein 3:1 auf den Außenseiter bringt dann ~X Punkte") + Balance-Ampel live.
- **Stufe 3 „Profi"** — alles, was heute schon da ist, plus die
  Spieltag-genaue Joker-Planung und individuelle Kontingente.

Offene Entwurfsfragen: Warnung beim Zurückschalten, wenn Profi-Werte nicht mehr
zu einem Paket passen. Nicht mehr als 3 Stufen — jede kostet Pflege.

### Big Game: das Spiel des Spieltags dynamisch bestimmen — GEBAUT ✓
`src/lib/bigGame.js` + Abschnitt in der Spielerstellung. Zwei Entwurfs-Punkte
haben sich beim Bauen als die wichtigen herausgestellt:

- **Der Zeitpunkt ist ein FAKTOR, kein Signal.** Innerhalb eines Spieltags ist
  er fuer alle Spiele gleich, kann also gar nicht entscheiden, WELCHES Spiel
  das Big Game wird — nur, OB der Spieltag ueberhaupt eins bekommt (Schwelle).
  Ein Test haelt das fest (`roh` bleibt gleich, `wert` steigt).
- **Zone schlaegt Ausgeglichenheit.** Die Tabellenzone (oben Titel, unten
  Abstieg, Mitte nichts) wiegt 0,45, die Quoten nur 0,25 — sonst gewinnt das
  belanglose 9.-gegen-10., weil es am ausgeglichensten ist. Auch das ist ein
  eigener Test.

Das Einfrieren ist inzwischen gebaut: `src/lib/spieltagOeffnen.js` +
`openMatchday()` im Mock-Store. Der feine Punkt dabei: eingefroren wird
`bigGameGeprueft` auf ALLEN Snapshots des Spieltags, nicht nur `bigGame: true`
auf dem Gewinner — sonst waere ein Spieltag OHNE Big Game von einem
ungeoeffneten nicht zu unterscheiden und bekaeme spaeter, mit gewachsenem
Tabellenstand, nachtraeglich doch noch eines.

✅ **Alles davon ist gebaut.** Supabase-Store + Route (`/api/matchday/open`),
Hervorhebung in Spielwahl und Tippabgabe, eigene Zeile in den Ertragsquellen
(Account 1) — und seit 27.07. friert sich der Spieltag SELBST ein:
`src/lib/autoOeffnen.js` + `/api/matchday/auto`, stündlich per Vercel-Cron
(`vercel.json`).

Der Punkt dabei, der nicht nach Bequemlichkeit aussieht, es aber ist: der
Zeitpunkt des Öffnens IST die Fairness-Frage. Der Spannungswert hängt am
Tabellenstand in diesem Moment — wer den Moment wählt, wählt das Topspiel mit.
Ein fester, für alle gleicher Auslöser nimmt diese Wahl aus dem Spiel. Geöffnet
wird, sobald für die FRÜHESTE Runde das Tipp-Fenster aufgeht (größter
tatsächlich eingestellter Vorlauf, nicht die theoretische Obergrenze von 720 h
— sonst fröre man 30 Tage im Voraus mit altem Tabellenstand ein). Hat das erste
Spiel angepfiffen, wird NICHT mehr geöffnet: nachträglich einzufrieren wäre
schlimmer als gar nicht.

⚠️ **Nutzer-Aufgabe:** `CRON_SECRET` in Vercel setzen, sonst antwortet die
Route mit 500 und es bleibt beim Admin-Knopf.

Offen: Benachrichtigung („Diese Woche Big Game: X gegen Y").

Beim Anlegen der Runde weiss niemand, welche Begegnungen spannend werden. Ein
DERBY ist vorher bekannt — „Erster gegen Zweiter am 28. Spieltag" nicht. Ein
Algorithmus soll waehrend der Saison das jeweils interessanteste Spiel finden
und hervorheben (Quotenboost oder Zusatzregel).

**Was ein Spiel gross macht — Signale, die wir HABEN:**
- **Ausgeglichenheit** steckt schon im Snapshot (`winner.home ≈ winner.away`).
  ⚠️ Aber: ausgeglichen ≠ wichtig. Zehnter gegen Elfter ist ausgeglichen und
  trotzdem belanglos. Quoten allein reichen also nicht.
- **Tabellen-Relevanz** aus `saisonwetten.tabelle()`: Naehe der Kontrahenten
  UND Hoehe in der Tabelle (1. gegen 2. schlaegt 15. gegen 16.).
- **Zeitpunkt**: spaet in der Saison zaehlt mehr — Titel/Abstieg entscheiden sich.
- **Derby** (`findDerby`) als Zuschlag, nicht als alleiniges Kriterium.
→ `spannungsWert(match, tabelle, snapshot, spieltag) → 0..1`, daraus je
Spieltag das Top-Spiel.

**⚠️ Die entscheidende Fairness-Regel: VORHER feststehen.**
Das Big Game muss bekannt sein, BEVOR getippt wird — sonst aendert sich der
Wert eines Tipps rueckwirkend. Gleiches Prinzip wie beim Quoten-Snapshot:
einmal festgelegt, gilt es. Bestimmt wird es also beim Oeffnen des Spieltags
aus dem DANN gueltigen Tabellenstand.

**Transparenz:** Deterministisch und begruendet anzeigen („Platz 2 gegen Platz 3,
punktgleich, 28. Spieltag") — sonst wirkt die Auswahl willkuerlich und der
Verdacht der Bevorzugung entsteht.

**Belohnung = derselbe Modifikator-Typ wie Derby und Wettbewerbs-Gewicht.**
„Dieses Spiel ist wichtiger, fuer alle gleich" — also in denselben additiven
Topf unter `modCap`. Kein neuer Multiplikator.
⚠️ Zusammenspiel mit dem Joker bedenken: Wer seinen Joker aufs ohnehin
geboostete Big Game legt, stapelt zwei Aufschlaege. Additiv ist das gedeckelt,
aber die Varianz steigt — im Abschluss-Durchgang mitmessen.

**Anschluesse:** Benachrichtigung („Diese Woche Big Game: X gegen Y") ·
eigene Zeile in der Ertragsquellen-Aufschluesselung · als Ereignis-Ausloeser
verwendbar (Joker fuers richtige Tippen des Big Game).

### Mehrere Wettbewerbe in EINEM Tippspiel — Etappen (a) + (b) GEBAUT ✓
(a) `wettbewerbe.js` + `championsLeagueData.js` (Datenmodell, CL mit Ligaphase
und K.-o.-Baum). (b) `wettbewerbGewicht.js` + `WettbewerbGewichte.jsx`.

Zwei Punkte aus (b), die man nicht brechen sollte:
- **Der Aufschlag faellt in DENSELBEN additiven Topf** wie Derby und Big Game
  (`teamModFactor`) — kein vierter Multiplikator daneben. Ein Test rechnet den
  Fall mit allen dreien nach: additiv 2,7x statt multiplikativ 3,83x.
- **Gewicht pro Spiel ist nicht Anteil an der Wertung.** 306 BL-Spiele gegen
  144 CL-Spiele: „CL x1,5" fuehlt sich nach doppelt so wichtig an und bleibt
  trotzdem die kleinere Haelfte. `anteile()` rechnet den resultierenden Anteil
  aus, die Oberflaeche zeigt ihn unter jedem Regler samt „ohne Gewichte waeren
  es X %", und `anteilHinweis()` nennt die Falle beim Namen. Ohne diese
  Rueckmeldung stellt ein Admin etwas ein und bekommt etwas anderes.
- K.-o.-Runden brauchen keinen eigenen Regler: EINE Stufe steigt ueber
  `PHASE[...].rang` (AF x1, VF x2, HF x3, Finale x4).

(c) Freischalt-Zeitpunkte sind GEBAUT: jede Saison-Wette kann ein Fenster
`{ wettbewerb, abSpieltag, bisSpieltag }` tragen (`saisonwetten.js`,
`istFreigeschaltet`/`freigabeStatus`). Der nicht offensichtliche Teil: eine
Freigabe OHNE Frist waere unfair, weil wer spaeter tippt schlicht mehr weiss —
bei gleicher Punktzahl. Deshalb ist es immer ein FENSTER, ohne Angabe genau
einen Spieltag lang. Und der Stand richtet sich nach dem Spieltag des EIGENEN
Wettbewerbs, sonst oeffnete eine CL-Wette, waehrend die Ligaphase laeuft
(`aktuellerSpieltag()` in `wettbewerbe.js`). Im Zweifel — Stand unbekannt —
bleibt die Wette ZU: eine versehentlich offene Wette laesst sich nicht
zurueckziehen, eine versehentlich gesperrte schon.

(d) GEBAUT: `rules.spiele` hat jetzt `wettbewerbe` und `phasen`
(`SpielauswahlWettbewerbe.jsx`). „Nur Champions League ab dem Achtelfinale"
sind damit 15 statt 466 Spiele — nachgemessen in der laufenden App.

⚠️ Alle Dimensionen wirken UND-verknuepft (Vereine, Zeitraum, Wettbewerbe,
Phasen). Fuer eine GEMISCHTE Wunschliste („CL-K.-o. PLUS meine
Bundesliga-Vereine") ist der Modus `liste` gedacht. Eine ODER-Verknuepfung
ueber Dimensionen hinweg waere eine zweite, konkurrierende Regel-Sprache — das
waere es nicht wert. Falls sich der gemischte Fall doch als haeufig erweist,
ist die saubere Loesung ein Filter PRO WETTBEWERB (`proWettbewerb: { cl: {...},
bl: {...} }`), nicht ein ODER-Schalter.

**Der ganze Wettbewerbs-Block ist damit durch (a-d).**

Bundesliga + Premier League + Champions League zusammen, mit eigenen Regeln je
Wettbewerb und fairer Gewichtung untereinander. Ziel des Nutzers: ein
**Gesamt-Tippspiel nur aus dem Besten und Interessantesten**.

**1) Datenmodell.** Matches brauchen `wettbewerb` und `phase`:
`{ wettbewerb: "bl" | "pl" | "cl", phase: "liga" | "achtelfinale" | "halbfinale" | "finale", matchday }`.
Ohne `phase` laesst sich „Halbfinale zaehlt mehr" nicht ausdruecken.

**2) Regeln je Wettbewerb — NICHT drei volle Regelwerke.**
Empfehlung: EIN Basis-Regelwerk + je Wettbewerb ein `gewicht` und optionale
Ueberschreibungen (`rules.wettbewerbe = { bl: { gewicht }, cl: { gewicht, ... } }`).
Drei vollstaendige Regelwerke wuerden die Admin-Oberflaeche verdreifachen,
obwohl die meisten nur „gleiche Regeln, aber CL zaehlt mehr" wollen.

**3) Phasen-Gewicht ist DIESELBE Art Modifikator wie der Derby-Faktor.**
Beide sagen: „diese Begegnung ist wichtiger — fuer alle gleich". Deshalb
gehoert das Wettbewerbs-/Phasen-Gewicht in denselben additiven Topf wie
`teamMods` und unter `modCap`. Kein vierter Multiplikator, sonst schaukelt es
sich wieder auf (dieselbe Lehre wie bei den Joker-Typen).

**4) ⚠️ Der Denkfehler, den die Oberflaeche verhindern muss:**
„Gewicht pro Spiel" ist NICHT „Anteil an der Gesamtwertung". Die Bundesliga hat
306 Spiele, die CL-Ligaphase ~120. Bei Gewicht 1 vs 1,5 dominiert die
Bundesliga trotzdem klar die Saison. Der Admin denkt aber in Anteilen.
→ Die Oberflaeche muss den RESULTIERENDEN ANTEIL anzeigen
(„Bundesliga 62 % · CL 28 % · PL 10 % der erwarteten Gesamtpunkte"),
nicht nur den Faktor. Das ist der Punkt, an dem eine naive Umsetzung
unbemerkt unfair wird.

**5) Saison-Wetten mit Freischalt-Zeitpunkt.**
Jede Saison-Wette bekommt optional `ab: { wettbewerb, spieltag }` — „CL-
Halbfinalisten erst ab Spieltag 8 der Ligaphase tippbar". Sinnvoll, weil
manche Langzeitwetten vorher reines Raten waeren. Vorher: sichtbar, aber
gesperrt, mit Datum/Spieltag der Freischaltung.

**6) Anschluss an bereits Geplantes:**
- `rules.spiele` (Spielauswahl im Code) wird zur Auswahl QUER ueber Wettbewerbe
  — genau der „nur das Beste"-Fall.
- Preset-Mischen bekaeme einen Aspekt „Wettbewerbe".
- Die Quoten-API liefert je Liga eigene Endpunkte (`soccer_germany_bundesliga`,
  `soccer_epl`, `soccer_uefa_champs_league`) — die Route kann das schon, sie
  nimmt `?liga=`.

**7) Reihenfolge (gross, deshalb in Etappen):**
a) `wettbewerb`/`phase` ins Datenmodell + Daten erzeugen
b) Gewichtung + Anteils-Anzeige
c) Freischalt-Zeitpunkte fuer Saison-Wetten
d) wettbewerbsuebergreifende Spielauswahl

### Zeitachse: was „Spieltag 5" in einer Runde über mehrere Ligen heißt — GEBAUT ✓
`src/lib/zeitachse.js` + `Zeitachse.jsx` (Spielerstellung) + Übersetzungszeile in
der Spielwahl. `rules.zeitachse`, im Aspekt „spiele" von `presetMerge.js`.

Die Lücke, die (a-d) offen gelassen haben: seit fünf Wettbewerben im einen
Katalog liegen laufen **vier Zählungen nebeneinander her**, und keine davon ist
der Spieltag DER RUNDE. Gemeint ist aber genau der, sobald etwas rundenweit
passiert — ein Joker je Spieltag, der Anschluss-Bonus, ein Zwischenstand.

**Der Entwurf:** ein TAKTGEBER (Standard: die früheste Liga) gibt den Rhythmus
vor, jeder seiner Spieltage eröffnet einen Runden-Spieltag, alles bis zum
nächsten Ankerpunkt gehört dazu. In einem Satz erklärbar — daran hängt, ob ein
Spieler dem Ding traut. Alternative: fester Wochen-Modus.

Drei Dinge, die der naive Entwurf verliert:
- **Vor dem ersten Ankerpunkt.** Startet der Taktgeber später als andere Ligen,
  hingen deren erste Spieltage in der Luft. Sie fallen in Runden-Spieltag 1 —
  lieber ein voller erster Spieltag als verschwundene Spiele.
- **Pausen im Taktgeber** (Winterpause). Ein Runden-Spieltag über drei Wochen
  ist nicht falsch, aber ein Joker darin wäre etwas völlig anderes wert.
  Wählbar: auffüllen (Rhythmus bleibt) oder anhängen.
- **Die Vorschau ist der eigentliche Wert des Blocks.** Eine Zeitachse, die man
  erst im Dezember als unpassend erkennt, lässt sich nicht mehr ändern.

**Wichtig: das ist reine Struktur und Anzeige, KEINE Wertung.** `scoreTip` ist
unberührt, der Balance-Simulator sieht die Achse nicht.

✅ **Eingehängt (2026-07-28):** `rundenSchluessel(achse)` ersetzt `spieltagKey`
dort, wo „einmal pro Spieltag" gemeint ist. `invalidJokerMatchdays`,
`invalidWeightMatchdays` und `weightUsageForMatchday` nehmen ihn als letzten,
OPTIONALEN Parameter — ohne ihn bleibt alles beim Liga-Spieltag, es gibt keinen
stillen Regelwechsel. Vorher bekam ein Tipper in einer Runde über fünf
Wettbewerbe fünf Joker pro Woche statt einem, und der Ranglisten-Pool ließ sich
fünfmal ausgeben. Bei nur einem Wettbewerb sind beide Schlüssel deckungsgleich.

⏳ **Noch nicht eingehängt, bewusst:** der Anschluss-Bonus (`applyCatchup` hängt
am Verlauf, `scoreLeaderboardHistory` gruppiert über `spieltageChronologisch`)
und `ereignisse.js` („alle Spiele des Spieltags getippt"). Beides geht an die
BALANCE und gehört mit einem Simulator-Lauf zusammen gemacht, nicht nebenbei.

✅ **Zwei Funde aus dem Browser-Check nachgezogen** (2026-07-28) — beide waren am
Zwei-Ligen-Testfall nicht sichtbar und traten erst gegen den echten
1605-Spiele-Katalog auf:

- **Liga-Spieltage zerrissen.** Ein BL-Spieltag von Freitag bis Sonntag lag
  links und rechts eines Ankerpunkts; in der Vorschau stand „Bundesliga 1" im
  einen und „Bundesliga 1+2" im nächsten Runden-Spieltag. Zugeordnet wird jetzt
  der ganze Liga-Spieltag (`spieltagKey`), dorthin wo sein ERSTES Spiel liegt.
  `rundenSpieltagVon` schlägt seither in der fertigen Achse nach statt neu zu
  rechnen — eine zweite Rechnung wäre eine zweite Wahrheit.
- **Die Überfüllungs-Warnung war ein Fehlalarm auf der Standard-Einstellung.**
  Die feste Schwelle von 40 Spielen stammte aus dem Zwei-Ligen-Entwurf; über
  vier Ligen sind 39 Spiele eine normale Woche, mit Champions League 57.
  Gemeldet wurden 12 völlig normale Spieltage, und zwar mit der FALSCHEN
  Begründung „Pause im Taktgeber". **Lehre:** eine Schwelle, die an der Zahl der
  Wettbewerbe hängt, gehört nicht als Konstante ins Modul. Gemessen wird jetzt
  relativ zum üblichen Spieltag dieser Achse (Median), und die Ursache wird am
  ZEITFENSTER unterschieden statt geraten.

### Spiel-Auswahl gehört in den Code — GEBAUT ✓
`src/lib/spielauswahl.js` + Abschnitt „Teams/Zeitraum" in der Spielerstellung.
`rules.spiele` ist jetzt Teil des Regelwerks und reist damit in Lang- und
Kurzcodes mit; der Team-Filter der Spielerstellung ist KEIN lokaler Zustand
mehr, sondern liest und schreibt dieses Feld. Die Zuständigkeit bleibt getrennt:
`rules.spiele` schlägt vor, `rounds.team_filter` hält fest, was beim Anlegen
daraus wurde. Dazu ein achter ASPEKT „Spielauswahl" beim Preset-Mischen und
`spieleProSpieltag()`, das ohne Spielplan ehrlich eine SPANNE nennt („bleiben
2 bis 4 Spiele pro Spieltag") statt eine erfundene genaue Zahl.

✅ Modus `liste` hat seit 27.07. eine UI: `SpielauswahlListe.jsx`. Gesucht statt
geblättert (1605 Spiele lassen sich nicht auflisten), die AUSGEWÄHLTEN stehen
immer oben — sonst verschwindet ein angehaktes Spiel beim Weitersuchen und ist
nicht mehr abwählbar. Team-Filter und Liste schließen sich gegenseitig aus,
`modus` kann nur eines sein.

Ein geteilter Creator-Code trägt heute nur das REGELWERK. Welche Spiele die
Runde umfasst (`team_filter`) hängt an der Runde, nicht am Code — wer einen
Code lädt, bekommt also die Regeln, aber nicht die Spielauswahl. Das soll mit
rein, und danach **anpassbar bleiben**.

- **`rules.spiele`** ins Regelwerk aufnehmen (wandert damit automatisch in
  `encodePreset` und in die Kurzcodes): welche Vereine, welche Spieltage,
  ggf. nur bestimmte Begegnungen.
- **Nach dem Laden editierbar:** der Code ist ein VORSCHLAG, kein Vertrag.
  Wer „Kenner-Runde" lädt, soll die Spielauswahl noch auf seine Liga/seinen
  Zeitraum ändern können, ohne den Rest zu verlieren.
- ⚠️ **`team_filter` gibt es schon** — auf der Runde (`rounds.team_filter`,
  gesetzt beim Anlegen). Beim Umbau muss klar sein, was gewinnt: das
  Regelwerk ist die Vorlage, die Runde der konkrete Stand. Sonst hat man
  zwei Wahrheiten. Vorschlag: `rules.spiele` = Vorschlag aus dem Code,
  `rounds.team_filter` = das, was beim Anlegen tatsächlich gewählt wurde.
- **Passt zum Preset-Mischen:** „Spiele" würde ein achter ASPEKT
  (`presetMerge.js`) — Regeln von A, Spielauswahl von B.
- **Nutzen:** genau der „populäre Seeds holen"-Fall. Ein Creator teilt nicht
  nur seine Regeln, sondern seine ganze Runden-Idee („Nur die Top 6, 10
  Spieltage, Hardcore-Wertung") — und man kann sie trotzdem anpassen.

### Ereignisse: Joker ERSPIELEN statt nur zugeteilt bekommen — GEBAUT ✓ (Kategorie 1+2)
`src/lib/ereignisse.js` + `Ereignisse.jsx` in der Spielerstellung. Gebaut sind
die **Meilensteine** (Serie, erster exakter Treffer, Aussenseiter-Sieg, Spieltag
vollstaendig) und der **Trost-Joker**. Herausforderungen stehen im Katalog, sind
aber als NICHT auswertbar markiert (`braucht: ["minispiel"]`) — `sanitizeEreignisse`
wirft sie beim Aktivieren raus, damit niemand etwas einschaltet, das nie ausloest.

Drei Dinge, die sich beim Bauen als die wichtigen erwiesen haben:
- Der **Deckel** (`maxErspielt`) steht in der UI GANZ OBEN, nicht am Ende. Er ist
  keine Feineinstellung, sondern die Zusage, dass niemand das Tippspiel ueber
  Nebenaufgaben gewinnt. Gedeckelt wird **chronologisch** — die frueh verdienten
  Joker zaehlen, sonst haenge die Auswahl an der Sortierung.
- **`konflikte()`** meldet Trost-Joker + Anschluss-Bonus als Doppelbelohnung.
  Genau die Kante, vor der der Entwurf gewarnt hat — jetzt sichtbar statt nur
  dokumentiert.
- **Aussenseiter zaehlt nur, wenn der Tipp AUFGEHT** — sonst waere blindes
  Dagegenhalten belohnt (dieselbe Regel wie beim Mut-Joker in der Engine).

✅ Zusammengeführt: `src/lib/jokerKontingent.js` macht aus beiden Töpfen EINEN
Vorrat und ist in der Tippabgabe verdrahtet. Drei Regeln stecken drin:
zugeteilte Joker sind an ihren Spieltag gebunden, erspielte nicht (sonst
verfielen sie sofort); erspielte wirken ab dem Spieltag, an dem sie verdient
wurden, nie rückwirkend; verbraucht wird ZUERST der zugeteilte Topf.

Offen: die Herausforderungen selbst (Kategorie 3, braucht ein Minispiel).

Bisher kommt ein Joker nur vom Admin (Frequenz/Verteilung). Zusätzlich soll man
sich welche **verdienen** können — durch Herausforderungen oder weil einem in
der Runde etwas widerfährt.

**Zwei Töpfe, klar getrennt:** `zugeteilt` (vom Regelwerk) + `erspielt` (aus
Ereignissen). Beide fließen in dasselbe Joker-Kontingent, aber der erspielte
Topf ist **gedeckelt** — sonst gewinnt das Tippspiel, wer im Minispiel gut ist.
Das wäre eine zweite Leistungsachse und damit ein Fairness-Bruch.

**Drei Kategorien (nach Aufwand und Risiko sortiert):**

1. **Meilensteine — passiv, aus dem Tippen selbst.** „Drei Spieltage in Folge
   getippt", „erster exakter Treffer", „Außenseiter-Sieg vorhergesagt".
   ⭐ **Bester Startpunkt:** braucht KEINE neuen Daten und kein Minispiel —
   `records.js` berechnet solche Dinge bereits. Belohnt Dranbleiben statt
   Geschicklichkeit, ist also automatisch balance-freundlich.
2. **Widerfahrnisse — passiv, sozialer Ausgleich.** „Letzter am Spieltag →
   Trost-Joker", „dein Verein hat verletzungsbedingt verloren". Verwandt mit dem
   Aufhol-Mechanismus (`catchup.js`) — ⚠️ **darf sich nicht mit ihm doppeln**,
   sonst wird Zurückliegen doppelt belohnt.
3. **Herausforderungen — aktiv, Minispiel.** Fußball-Tic-Tac-Toe, Quiz.
   Größter Aufwand, größtes Balance-Risiko.
   ❌ **Das Elfmeterschießen-Duell ist am 29.07. aus der Planung genommen**
   (Nutzer-Entscheidung) und auch aus dem Hub entfernt. Was daran interessant
   war, ist ohnehin nicht das Minispiel, sondern der Adressaten-Mechanismus
   „zwei werden gegeneinander gesetzt" — und der ist als `paarung` in der
   Regel-Grammatik aufgehoben.
   ⚠️ **Muss ASYNCHRON funktionieren** — ein Freundeskreis spielt nie gleichzeitig.
   ⚠️ **Tic-Tac-Toe („Spieler, der für beide Vereine spielte") ist mit unseren
   Daten NICHT möglich** — unsere Kader sind generiert und fiktiv. Ginge erst
   mit einer echten Spieler-Datenquelle. Ein Quiz über TIPP-Statistiken der
   eigenen Runde ginge dagegen sofort.

**Architektur (wie bei den Saison-Wetten):** `ereignisse.js` mit einem Katalog
aus TYP + Parameter, jeder Typ deklariert seine benötigten Daten (`braucht`).
Der Admin schaltet einzelne Ereignisse frei und legt die Belohnung fest.
Ergebnis ist immer dasselbe: eine **Joker-Gutschrift** — kein neuer
Punkte-Kanal, damit die bestehende Deckelung weiter greift.

**Anschluss:** Die ganze Kategorie wird von der **Regel-Grammatik** überholt
(eigener Abschnitt) — `ereignisse.js` ist deren natürliche Heimat, weil der
Katalog aus TYP + Parameter schon genau die richtige Form hat.

### Joker-TYPEN statt neuer Ebenen — GEBAUT ✓
`rules.joker.typen` steht, `heimat` und `mut` sind gebaut und im
Balance-Durchgang vermessen (Ergebnisse oben im Balance-Abschnitt). Der
Mut-Faktor trägt sein gemessenes Band in `reglerWarnung.js`.

Ursprünglicher Entwurf:
Das eigene Top-Team ist **keine neue Modifikator-Ebene, sondern eine Spielart
des Jokers**. Damit bleibt es bei drei Ebenen (Joker · Abstimmung · Team-Mods),
und neue Ideen wachsen INNERHALB der Joker-Ebene statt daneben.

- **Datenmodell:** `rules.joker.typen = { einzel: {...}, heimat: {...}, … }` —
  der Admin schaltet einzelne Typen frei. Jeder Typ liefert einen AUFSCHLAG;
  alle Aufschläge eines Spiels werden **additiv** zum Joker-Beitrag summiert und
  wie bisher von `modCap` gedeckelt. Kein Stapeln, keine neue Deckelung nötig.
- **Kandidaten (bewusst WENIGE, der Admin wählt aus):**
  * `einzel` — ein Spiel je Spieltag markieren (heutiges Verhalten)
  * `ranking` — Gewichte über den Spieltag verteilen (heutiges Verhalten)
  * `heimat` — die Spiele des eigenen Vereins, passiv, Empfehlung ×1,2
  * `mut` — greift NUR, wenn gegen den Favoriten getippt wurde („Mut zahlt sich
    aus" als eigene Mechanik statt nur als Motto)
- **Regel gegen Wildwuchs:** höchstens 4–5 Typen insgesamt; jeder muss einen
  eigenen SPIELERISCHEN Grund haben, nicht nur einen anderen Zahlenwert.
- **Symmetrisch** (auch auf Minus) und über `totalModifier`, wie der Joker heute.
- **Kopplung:** die Vereinsauswahl für `heimat` kann zugleich die Fanfarben
  speisen (`theme.js`) — eine Angabe, zwei Wirkungen.
- ⚠️ Vor dem Merge mit `balanceSim.js` prüfen: der Kenner darf gewinnen, aber
  nicht davonziehen.

### Ertragsquellen in der Abrechnung sichtbar machen — GEBAUT ✓
`src/lib/breakdown.js` + `Ertragsquellen.jsx`. Team/Derby, Spiel des Spieltags
und Wettbewerbs-Gewicht stehen als DREI Zeilen, obwohl sie in einem additiven
Topf landen — sonst sucht der Spieler ein Derby, das es nicht gibt.

Ursprünglicher Entwurf:
**Nicht bloß Anzeige, sondern ein Bindungs-Element.** Eine aufgeschlüsselte
Liste „woher kamen meine Punkte" liest sich wie eine Abrechnung und hakt
nachweislich besser als eine nackte Endzahl.

- Die Engine RECHNET die Bestandteile bereits (`scoreTip` liefert
  `parts.tendBoden`, `parts.ergNaehe`, `parts.teamTore`, `goals.net`, `combo`,
  `modifier`) — es fehlt nur die Darstellung als benannte Posten.
- **Jeder aktive Joker-Typ bekommt eine EIGENE Zeile** („Heimatbonus ×1,2 →
  +45"). Genau deshalb sind mehrere Typen interessant: sie machen die
  Aufschlüsselung reichhaltiger, ohne die Balance anzufassen.
- Format wie ein Kassenbon: Posten, Betrag, unten die Summe. Negatives
  (Favoriten-Malus) gehört genauso hinein — Ehrlichkeit macht es glaubwürdig.
- Hängt an `prefs.abrechnung` (voll/dezent/aus), damit niemand zugeschüttet wird.

### Profi-Variante: aktiv vor Unwucht warnen — GEBAUT ✓
`src/lib/reglerWarnung.js` + `ProfiWarnungen.jsx`, Bänder im `Slider` der
Spielerstellung. Umgesetzt:

- **Empfehlungsband am Regler:** grüner Streifen unter dem Slider, Wert und
  Regler färben sich coral, sobald er verlassen wird. Das Band wird aus den
  PRESETS abgeleitet, nicht getippt — was `presets.balance.test.js` durchmisst,
  gilt als erprobt, und ändern sich die Presets, wandert das Band mit.
- **Kasten über den Reglern**, der immer da ist (auch grün) und jede Meldung
  mit ihrer eigenen Korrektur ausliefert — ein Hinweis ohne Auflösung wäre eine
  Belehrung, kein Werkzeug. Ein Test löst alle Meldungen iterativ auf und
  prüft, dass das terminiert.
- **Kombinations-Regeln** neben den Einzelfeldern: der teuerste Fehler
  (`wrongPenalty` ≈ 0 **und** `minPayout` ≈ 0 → Gratis-Lose) steckt in keinem
  einzelnen Wert. Dazu: Modifikator-Turm, Deckel schneidet ab, exakt ≈ abstand,
  Versäumnis ohne Abzug.
- Kein Verbot: extreme Werte bleiben erlaubt, sie sind nur nie versehentlich.

✅ **Balance-Ampel klebt** (seit 27.07.), zusammen mit dem Warnungs-Kasten;
gedeckelt auf 42 % der Fensterhöhe mit eigenem Scroll.

⚠️ Beim Bauen die Falle gefunden, die so etwas STILL scheitern lässt: der
Telefon-Rahmen jedes Screens trägt `overflow: hidden`, und das macht ihn zum
Scroll-Container — `position: sticky` klebt dann an ihm statt am Fenster und
scrollt einfach weiter mit, ohne dass etwas kaputt aussieht. `overflow: clip`
schneidet die runden Ecken genauso ab, erzeugt aber keinen Scroll-Container.
Der Rahmen steht INLINE in jedem Screen; wer anderswo etwas kleben lassen will,
muss ihn dort ebenso umstellen.

### Joker-Verteilung über die Saison (Frequenz statt Handarbeit) — GEBAUT ✓
`src/lib/jokerPlan.js` + `JokerVerteilung.jsx`. Umgesetzt wie unten beschrieben;
verteilt wird BLOCKWEISE (je Block genau einer), weil reiner Zufall sonst vier
Joker in fünf Spieltage bündelt — formal fair, gefühlt kaputt.

✅ Die Durchsetzung beim Tippen ist gebaut: `jokerKontingent.darfJokerSetzen()`
sagt nicht nur ob, sondern auch AUS WELCHEM TOPF — „heute ist dein
Joker-Spieltag" ist eine andere Aussage als „du setzt einen erspielten ein".

Offen: die Mitspieler-Übersicht als eigener Screen.

Der Admin soll nicht 34 Spieltage einzeln anklicken müssen.

- **Frequenz-Regler:** „etwa jeder 4. Spieltag hat einen Joker" → das System
  verteilt sie, **deterministisch aus der Runden-Id geseedet** (alle sehen
  dasselbe, es ist nachprüfbar, und der Creator-Code bleibt kurz, weil nur die
  REGEL gespeichert wird, nicht die ausgerollte Liste).
- **Drei Verteilungs-Modi:**
  1. *Gleich für alle* — alle haben am selben Spieltag denselben Joker.
  2. *Gleiches Kontingent, andere Reihenfolge* — jeder bekommt über die Saison
     gleich viele Joker, nur an verschiedenen Spieltagen. Mehr Abwechslung bei
     identischer Fairness. **Muss durch einen Test garantiert werden.**
  3. *Frei* — jeder setzt selbst (heutiges Verhalten).
- **Vorschau-Kalender:** 34er-Leiste mit markierten Joker-Spieltagen, damit man
  sofort sieht, was man eingestellt hat.
- **Sichtbarkeit: ENTSCHIEDEN (Nutzer) — verdeckte Reihenfolge, offenes Kontingent.**
  Unsere Empfehlung zeigt NICHT vorab, welche Spieltage Joker haben (Spannung),
  aber sehr wohl:
  * das **ungefähre Kontingent** („du bekommst über die Saison etwa 8 Joker"),
  * den **eigenen Fortschritt** („3 von 8 verbraucht"),
  * und **was die Mitspieler bisher hatten** — damit bei verdeckter Reihenfolge
    nie der Verdacht aufkommt, jemand werde bevorzugt.
  Der Admin kann das umstellen; in der **Pro-Variante** ist auch „Spieltage vorab
  bekannt" wählbar.
  ⚠️ Wichtig bei Modus 2 (gleiches Kontingent, andere Reihenfolge): mitten in der
  Saison haben Spieler zwangsläufig UNTERSCHIEDLICH viele Joker gehabt. Deshalb
  immer als **Fortschritt** anzeigen („3 von 8"), nie als nackte Zahl — sonst
  wirkt ein systembedingter Zwischenstand wie Bevorzugung.
- ⚠️ **Balance:** ungleiche Verteilung darf die Simulation nicht kippen —
  vor dem Merge mit `balanceSim.js` gegenprüfen.


### Per-Team-/Derby-Regeln (Admin-Ebene) — GEBAUT ✓
`rules.teamMods` in der Engine, `DERBYS`/`findDerby` in `bundesligaData.js`.
Der Aufschlag fällt in denselben ADDITIVEN Topf wie Big Game und
Wettbewerbs-Gewicht (`totalModifier`, gedeckelt durch `rules.modCap`) — kein
eigener Multiplikator. Balance nachgemessen. Der Entwurf darunter ist die
ursprüngliche Überlegung und steht nur noch als Begründung da.

Admins vereinbaren für **ausgewählte Begegnungen** eigene Modifikatoren, die für
ALLE in der Runde gelten (anders als der Joker, den jeder Tipper selbst setzt).

- **Beispiele:** „Derby zählt mehr", „alle Spiele meines Lieblingsteams ×1,2".
- **Simpel zuerst (unsere Empfehlung der Ausbalanciertheit):** die drei
  wichtigsten Regler — Derby-Faktor, Faktor für ausgewählte Teams, evtl. ein
  dritter. Sinnvolle Defaults, die man einfach übernimmt.
- **Optional aufklappbar:** die individuellsten Modifikatoren pro Begegnung.
- **Architektur:** `rules.teamMods` = { derbyFaktor, teams:{name→faktor},
  fixtures:{...} }. Greift in `scoreTip` als reine Funktion von `(snap, rules)`
  — `snap.home`/`snap.away` liefern die Teams, kein neuer Datenfluss nötig.
  Derby-Paare gehören nach `bundesligaData.js`.
- **Achtung Komposition:** dann gibt es drei Multiplikatoren (Joker pro Nutzer,
  Abstimmung pro Spieltag, Team-Mods pro Begegnung). Reihenfolge + Deckelung
  bewusst festlegen, damit sie sich nicht unkontrolliert aufschaukeln. Premium.

### Aufhol-Mechanismus (Anschluss halten) — GEBAUT ✓
`src/lib/catchup.js`, `rules.aufholen`, Admin-UI und Leaderboard-Anbindung.
Der Bonus greift NICHT in `scoreTip`, sondern im Verlauf (`applyCatchup` in
`scoreLeaderboardHistory`) — er hängt am Stand VOR dem Spieltag. Nur ein ANTEIL
des Rückstands, erst ab einer Schwelle, drei Stufen. Im Simulator über
`aufholFlipQuote` abgesichert. Der Entwurf darunter ist die ursprüngliche
Überlegung und steht nur noch als Begründung da.

Einstellbar bei der Rundenerstellung: Wenn der Abstand zur Spitze zu groß wird,
bekommen Zurückliegende je Spieltag Punkte dazu, damit Mitspielen weiter lohnt.

- **Auswahl, wen es betrifft:** Letzter · schlechtestes Quantil · alle unter dem
  Schnitt — variabel.
- **Simpel zuerst:** ein Regler „Anschluss halten: aus / sanft / stark" mit
  vernünftigem Default. Aufklappbar dann die volle Zahlenregel
  (Schwelle, Formel, Deckel).
- **Balance:** unbedingt über den Balance-Simulator prüfen — ein zu starker
  Ausgleich entwertet gutes Tippen (Punkte-Verhältnis kippt Richtung 1,0 und
  darunter wird das Ranking beliebig).
- Verwandt: „verdiente" Joker an Zurückliegende (siehe Kontingent-Idee) — beides
  sind Aufhol-Mechaniken und sollten sich nicht doppeln.

### ~~Preset-Mischen~~ ✅ ERLEDIGT
`presetMerge.js` + `PresetMischen.jsx`, aufklappbar in der Spielerstellung.
Gelöst über sieben benannte Aspekte statt Einzelregler; es werden nur die
Aspekte gezeigt, in denen sich die beiden Presets unterscheiden.

### 🎛️ Big Game individualisierbar + Preset-Bibliothek (NEU, Nutzer, 2026-07-29 21:30)

**Die Aufgabe in einem Satz:** Die Formel, aus der sich der `bigGameWert`
ergibt, und die Schwelle `minSpannung` sollen vom Admin einstellbar sein — mit
einer Bibliothek benannter, beschriebener Empfehlungen und mit Betreuung, die
unsinnige Kombinationen abfängt.

**Was heute fest verdrahtet ist** (`src/lib/bigGame.js`, Zeile ~90):

```js
const GEWICHT = { zone: 0.45, naehe: 0.20, quoten: 0.25, derby: 0.10 };
zeitFaktor = 0.6 + 0.4 × (Spieltag / Gesamtspieltage)
```

Einstellbar sind bisher nur `aufschlag` (wie viel mehr das Topspiel zählt) und
`minSpannung` (ab wann eines gilt). Die vier Gewichte und der Zeitfaktor nicht.

**Was daraus werden soll:**

1. **Die vier Gewichte + der Zeitfaktor werden Teil von `rules.bigGame`** und
   laufen durch `sanitizeBigGame` wie alles andere. `BIGGAME_LIMITS` bekommt
   die Grenzen dazu.
2. **Eine BIBLIOTHEK benannter Kombinationen**, jede mit einem Satz, der sagt,
   für wen sie ist — nicht mit Zahlen, sondern mit dem Charakter der Runde.
   Erste Kandidaten, aus den Bausteinen ableitbar:
   - *Tabellenspitze* — `zone` hoch, `quoten` niedrig: Titel- und Abstiegskampf
     zählen, ein ausgeglichenes Mittelfeldduell nicht.
   - *Kopf-an-Kopf* — `naehe` + `quoten` hoch: das offene Spiel gewinnt, egal
     auf welchem Platz.
   - *Rivalität* — `derby` dominiert: das Big Game ist fast immer ein Derby.
   - *Saisonfinale* — Zeitfaktor steil: früh passiert wenig, ab dem 25. viel.
   - *Aus* — der heutige Standard.
3. **Betreuung gegen Unsinn.** Die Maschinerie dafür EXISTIERT und darf nicht
   neu erfunden werden:
   - `reglerWarnung.js` — `RULE_LIMITS` ist die Grenze des ERLAUBTEN, das
     Empfehlungsband die des ERPROBTEN, dazu handgeschriebene
     KOMBINATIONS-Regeln für das, was in keinem Einzelwert steckt. Genau hier
     gehören die Big-Game-Fallen hinein.
   - `presets.balance.test.js` — was durchgemessen ist, gilt als erprobt.
     Jede neue Bibliotheks-Kombination gehört dort hinein.

**⚠️ Die Fallen, die die Betreuung abfangen muss** (das ist der eigentliche
Inhalt der Aufgabe, nicht die Regler):

- **Alle Gewichte auf 0** → jedes Spiel hat Wert 0, es gibt nie ein Big Game.
  Der Admin denkt, er hat es an, und es passiert nichts.
- **`minSpannung` auf 0** → JEDES Spiel ist Big Game, der Aufschlag ist kein
  Aufschlag mehr, sondern eine Verschiebung des Nullpunkts.
- **Nur `quoten`** → das belanglose 9.-gegen-10. gewinnt zuverlässig. Genau der
  Fehler, den der ursprüngliche Entwurf ausdrücklich vermeiden wollte
  (siehe Kopf von `bigGame.js`) — eine Bibliothek darf ihn nicht wieder
  einbauen.
- **Nur `derby`** → in Spieltagen ohne Derby gibt es nie eins; das ist zulässig,
  muss aber DRANSTEHEN, sonst wirkt es wie ein Fehler.
- **`zone` hoch + hoher `aufschlag` + hohe `modCap`** → die Spitzenteams
  bekommen dauerhaft mehr Gewicht, das verschiebt die Balance systematisch.
  Muss durch `balanceSim` und landet im Modifikator-Budget (siehe unten).

**Reihenfolge:** erst die Gewichte konfigurierbar machen (klein), dann die
Bibliothek, dann die Warnungen — die Warnungen brauchen die Bibliothek als
Messgrundlage, nicht umgekehrt.

**Berührt:** `bigGame.js`, `engine.js` (`sanitizeRules`), `reglerWarnung.js`,
`Spielerstellung.jsx`, `presetMerge.js` (Aspekt „bigGame" prüfen — ein Test
wacht darüber, dass die Aspekte ALLE Regel-Felder abdecken).

### 🔒 RLS-Durchgang: vier Löcher, eines davon bricht das ganze Spiel (2026-07-29)

Durchgesehen wurde `supabase/schema.sql`, Abschnitt Row Level Security, gegen
die Tabellen-Definitionen. **Das ist kein laufender Schaden** — im Freundeskreis
mit bekannten Leuten passiert nichts. Aber **bevor eine offene Community-Runde
aufgemacht wird, muss das zu.** Nach Schwere sortiert.

> ⚠️ **`schema.sql` und die Store-Dateien sind Andres Bereich.** Deshalb hier
> nur der Befund samt Lösungsweg, nicht die Änderung.

**🔴 1. Der Tipp lässt sich NACH Anpfiff noch ändern — und der Snapshot kommt
vom Client.** Das ist der schwerste Befund, weil er die Grundlage des Spiels
aushebelt.

```sql
create policy "tips_update_own" on public.tips for update to authenticated
  using (user_id = auth.uid());
```

Keine Prüfung auf Anpfiff, kein Blick auf `matches.kickoff`. `CLAUDE.md` sagt
ausdrücklich: „das Einfrieren ab Anpfiff ist Sache von Store/UI". Nur ist die
UI keine Schranke — der Supabase-Client spricht direkt mit Postgres, und ein
Aufruf am Frontend vorbei kann einen Tipp umschreiben, wenn das Spiel längst
gelaufen ist. **RLS ist hier die einzige serverseitige Instanz, und sie prüft es
nicht.**

Schlimmer noch: `tips.snapshot` ist eine vom Client geschriebene Spalte. Der
Snapshot ist aber genau das, woran die Auszahlung hängt (`correctScore[reales
Ergebnis]`). Wer ihn selbst mitschickt, kann sich seine Quote **aussuchen** —
ein getippter Endstand mit Quote 200 ist eine Zeile JSON. Die ganze
Anker-Regel („Anker immer auf der Quote des REALEN Ergebnisses") wird damit
gegenstandslos, weil der Anker gar nicht von uns kommt.

**Lösungsweg:** beides gehört serverseitig. Entweder Tipp-Abgabe über eine
API-Route mit `service_role`, die den Snapshot AUS DER DB stempelt und nach
Anpfiff ablehnt — oder auf DB-Ebene: `insert`/`update`-Policies um
`exists (select 1 from matches mt where mt.id = tips.match_id and mt.kickoff > now())`
erweitern, plus einen `before insert or update`-Trigger, der `new.snapshot`
aus `matches` überschreibt statt ihn zu übernehmen. Der Trigger ist der
wichtigere Teil: eine Spalte, die der Client setzen darf, ist keine Messung.

**🔴 2. Der Beitritts-Code ist keine Schranke — er steht in einer Tabelle, die
jeder lesen darf.**

```sql
join_code text not null unique,   -- in public.rounds
create policy "rounds_read" on public.rounds for select to authenticated using (true);
```

Der Kommentar daneben sagt: „der Code selbst ist die Zugangsschranke, nicht die
Sichtbarkeit". Das Schema widerspricht dem — der Code steht IN der frei
lesbaren Zeile. Ein einziges `select join_code from rounds` liefert die Codes
**aller** Runden. Die Absicht ist richtig, die Umsetzung hebt sie auf.

**🔴 3. Beitreten prüft den Code überhaupt nicht.**

```sql
create policy "members_join_self" on public.round_members for insert to authenticated
  with check (user_id = auth.uid());
```

Geprüft wird nur, dass man sich nicht für jemand anderen einträgt. **Die
`round_id` ist frei wählbar** — man braucht den Code also nicht einmal (siehe 2),
man kann direkt in jede beliebige Runde einsteigen. Der Code-Abgleich passiert
in `getRoundByCode()`, also in Anwendungscode, den ein direkter API-Aufruf
umgeht. Danach greifen alle „gleiche Runde"-Policies: Mitglieder, abgerechnete
Tipps, Stimmen, Saison-Wetten.

**Lösungsweg für 2 + 3 zusammen:** Beitritt über eine `security definer`-Funktion
`join_round(code text)`, die den Code prüft und die Mitgliedschaft selbst
anlegt. Dann darf `rounds` auf Mitglieder eingeschränkt werden (`rounds_read`
über `round_members`), und der Code verlässt die Datenbank nie. RLS kann keine
Parameter entgegennehmen — deshalb ist die Funktion hier der richtige Weg, nicht
eine schlauere Policy.

**🟡 4. Vollständiges Nutzer- und Rundenverzeichnis für jeden Angemeldeten.**

`profiles_read using (true)` und `rounds_read using (true)`: jeder Eingeloggte
kann alle Profile (Anzeigename, Avatar, `premium_until`) und alle Runden
abziehen. Im Freundeskreis belanglos; bei offenen Community-Runden ist es eine
Abgreif-Fläche und bei `premium_until` nebenbei die Preisgabe, wer zahlt.
Sinnvoll: Profile nur für Leute sichtbar, mit denen man eine Runde teilt.

**✅ Was gut gelöst ist** — damit beim Aufräumen nichts kaputtgeht:
- **Spalten-Rechte für `premium_until`.** RLS kann keine Spalten einschränken;
  das ist über `revoke update` + `grant update (display_name, avatar)` gelöst.
  Sauber, und die Sorte Detail, die man leicht übersieht.
- **Keine DELETE-Policies** → Löschen ist überall verboten. Richtige Voreinstellung.
- **`tips_read_own_or_settled`** verhindert Abschreiben vor Anpfiff korrekt.
- Bei `update`-Policies ohne `with check` nimmt Postgres den `using`-Ausdruck
  auch für die neue Zeile — ein Tipp lässt sich also nicht auf einen anderen
  Nutzer umschreiben. Beim Umbau bitte nicht versehentlich aufweichen.

### 🎲 WEN trifft es? — die unausgebaute Achse (Befund, 2026-07-29)

Ein Vorschlag aus dem Durchsehen des Gesamtstands, angeregt vom Nutzer. **Jede
Mechanik dieses Spiels hat vier Achsen:**

| Achse | Frage | Beispiel |
|---|---|---|
| **WANN** | Was löst es aus? | jeder Spieltag · Frequenz · Meilenstein · Abstimmung |
| **WEN** | Wen in der Gruppe trifft es? | alle · jeder selbst · die Zurückliegenden |
| **WAS** | Was passiert dann? | Punkte-Faktor · Joker-Gutschrift · Struktur · Anzeige |
| **WIE VIEL** | Stärke × Häufigkeit | → das Modifikator-Budget |

Trägt man die bestehenden Mechaniken ein, fällt ein Ungleichgewicht auf:

| Mechanik | WANN | WEN |
|---|---|---|
| Joker-Verteilung | Frequenz, blockweise | `frei` · `gleich` · `kontingent` ✅ |
| Aufhol-Bonus | je Spieltag | `letzter` · Quantil · unter dem Schnitt ✅ |
| Versäumnis | Tipp fehlt | der Vergessliche |
| Big Game | beim Öffnen des Spieltags | **alle gleich** (trifft ein SPIEL, keine Person) |
| Team/Derby | feste Begegnung | alle gleich |
| Joker-Abstimmung | Abstimmung | alle gleich |
| Ereignisse | Meilenstein | der Einzelne, der ihn schafft |
| Saison-Wetten | Freischaltfenster | alle gleich |

**Der Befund: die WEN-Achse ist fast leer.** Praktisch alles ist entweder „alle
gleich" oder „jeder für sich". Eine rang-abhängige Auswahl gibt es **genau
einmal** (Aufhol-Bonus), und die ist ausgerechnet die, die bei großen Gruppen
bricht (siehe Abschnitt „Große Gruppen"). Was komplett fehlt:

- **Auslosung** — „diesen Spieltag trifft es drei Ausgeloste"
- **Paarung / Duell** — „du gegen X diesen Spieltag". `ereignisse.js` führt
  `duell` schon im Katalog; es fehlt allein der Adressaten-Mechanismus.
- **Knappheit / Wettlauf** — „die ersten fünf, die zugreifen"
- **Soziale Vergabe** — „wer letzte Woche Letzter war, bestimmt das Big Game".
  Reizvoll, weil es aus einem Trostpflaster eine Rolle macht statt eines Bonus.
- **Ansage / Selbstverpflichtung** — „ich kündige an, dass ich diesen Spieltag
  doppelt gehe": Risiko statt Geschenk, und die einzige Variante, die
  Modifikatoren interessanter macht, ohne sie stärker zu machen.

### 🧱 REGEL-GRAMMATIK: ein Satzbau statt hundert Schalter (Entwurf, Nutzer, 2026-07-29)

**Die Ausgangslage:** Der Nutzer will, dass ein Admin nahezu beliebige
Regelideen einstellen kann — „die letzten 20 % bekommen einen Trost-Joker",
„die ersten 5 dieses Spieltags bekommen einen Joker der Sorte X", „wer 3
Spieltage nichts getroffen hat, kriegt nächsten Spieltag +20 %", „alle 3
Spieltage bekommt der Beste eine Belohnung", „zufällig startet ein 3 Spieltage
laufendes Miniwettspiel um Joker". Es gibt praktisch unendlich viele solcher
Wünsche.

**⚠️ Genau deshalb darf man sie nicht als Features bauen.** Hundert Wünsche als
hundert Schalter sind hundert Balance-Fragen, hundert Warntexte und hundert
Stellen, an denen `modCap` umgangen wird. Der Ausweg ist eine **GRAMMATIK**: der
Admin baut SÄTZE aus vier Satzgliedern, und alle Sätze laufen durch dieselben
Töpfe und dieselbe Vermessung.

```
WANN (Auslöser)  →  WEN (Auswahl)  →  WAS (Belohnung)  →  WIE LANGE (Geltung)
```

Alle Beispiele des Nutzers sind in dieser Grammatik ein Einzeiler:

| Wunsch | Auslöser | Auswahl | Belohnung | Geltung | Stand |
|---|---|---|---|---|---|
| Trostpflaster | jeder Spieltag | Perzentil unten 20 % | 1 Joker | sofort | ✅ Bündel „ausgleich" |
| Spieltags-Krone | jeder Spieltag | Rang oben 5 **am Spieltag** | 1 Joker (Sorte wählbar) | sofort | ✅ Bündel „krone" |
| Pechvogel-Bonus | Serie: 3× kein Treffer | der Betroffene | +20 % | nächster Spieltag | ✅ Bündel „pechvogel" (07.08.) |
| Scharfschütze | Serie: 4× exakt | der Betroffene | 1 Joker | sofort | ✅ Bündel „scharfschuetze" (07.08.) |
| Dreier-Wertung | Rhythmus: jeder 3. Spieltag | Rang oben 1 **über die 3** | Belohnung | sofort | ✅ Bündel „dreier" (07.08.) |
| Jokerjagd | Zufall (≈ alle 8 Spieltage) | alle | Sonderspiel | 3 Spieltage | ✅ Bündel „jokerjagd" (07.08.) |

🔴 **Gemessen am 07.08.2026, und es widersprach der Ansage „mit allen vier
Achsen sind die Wünsche Einzeiler": vier von sechs waren es, zwei nicht.**
Vier Achsen ergeben nicht automatisch jeden Satz — an zwei Stellen fehlten noch
VOKABELN. Eine davon ist inzwischen gebaut:

- ✅ **Dreier-Wertung** brauchte einen `bezug: "zeitraum"` in der WEN-Achse.
  Auslöser und Auswahl standen, „der Beste **über die drei**" nicht:
  `standFuer()` in `auswahl.js` kannte nur `gesamt` und `spieltag`, und
  `ereignisse.js` reichte fest `bezug: "spieltag"` durch. **Gebaut am
  07.08.2026** — dritter Bezug (`zeitraumStand`) plus das Feld `zeitraum` am
  Ereignis, das die Runden-Spieltage in Blöcke gruppiert. Gemessen in `greift`
  Teil 2: 6 → 2 Gutschriften.
  ⚠️ **Zwei Punkte, die nicht brechen dürfen.** (1) Ausgezeichnet wird am
  LETZTEN Spieltag des Blocks — am ersten verbucht stünde die Auszeichnung im
  Verlauf VOR den Punkten, die sie begründen, und eine Geltung „nächster
  Spieltag" läge mitten im laufenden Block. (2) Nicht als „der Beste des
  dritten Spieltags" abkürzen: anderer Anreiz (ein Glückstag statt drei Wochen
  Konstanz), gleiche Oberfläche — die teuerste Sorte Näherung. Genau deshalb
  ein eigener `bezug` und kein durchgereichter Spieltags-Stand.
- ✅ **Jokerjagd** stand als „Sonderspiel über 3 Spieltage" da und sah nach
  Infrastruktur aus — nach der Wirkung `sonderspiel`, die in `wirkung.js`
  ausdrücklich nicht auswertbar ist. **Nachgesehen am 07.08.2026: sie braucht
  sie gar nicht.** Ein Sonderspiel ist kein Minispiel, sondern ein WETTBEWERB
  ÜBER EIN FENSTER NACH EINER KENNZAHL. Fenster (`zeitraum`), Zeitpunkt
  (`ausloeser: zufall`) und Preis (`wirkung`) gab es längst; gefehlt hat allein
  die KENNZAHL — bis dahin war „der Beste" immer „die meisten Punkte".
  Gebaut als `metrik` (`punkte` · `exakteTreffer` · `getippteSpiele`), Bündel
  „jokerjagd" liegt in der Bibliothek.
  ⚠️ **Bei einer Jagd gewinnt oft niemand, und das ist richtig.** Trifft in dem
  Zeitraum keiner exakt, sind alle gleichauf — und bei Gleichstand an der Kante
  gibt es nichts. Eine Jagd ohne Beute hat keinen Sieger; sie sieht nur aus wie
  eine tote Einstellung. Deshalb steht der Satz in der Oberfläche.
  ℹ️ Die Wirkung `sonderspiel` bleibt trotzdem im Katalog: ein echtes
  Miniwettspiel mit eigener Buchführung wäre etwas anderes als ein Wettbewerb
  über vorhandene Kennzahlen. Sie ist nur nicht mehr der Blocker.

Zwei NEUE Ereignis-Typen sind dafür entstanden (`treffer-serie`,
`pechstraehne`) — beide Serien über Spieltage, wie `serie`, nur mit einer
anderen Bedingung je Spieltag; gezählt wird in `inFolge()`, einer Funktion für
alle drei.
⚠️ **Die Falle beim Pechvogel, und sie ist keine kleine:** „kein exakter
Treffer" ist für jemanden, der GAR NICHT getippt hat, immer wahr. Ohne die
Bedingung „hat getippt UND es lag ein Ergebnis vor" wäre der Pechvogel-Bonus
die einzige Mechanik im Regelwerk, bei der Wegbleiben zahlt. Ein ausgelassener
Spieltag setzt die Strähne deshalb zurück; ein Test hält das fest.

**Das ist die ganze Idee.** Neue Wünsche brauchen künftig kein neues Feature,
sondern nur einen neuen Wert in einer der vier Listen — und der wird EINMAL
vermessen statt jedes Mal neu.

#### Die vier Satzglieder

**WANN — Auslöser.** Was bringt die Regel überhaupt ins Rollen.

| Auslöser | Kurzbeschreibung für die Oberfläche |
|---|---|
| `spieltag` | „Jeden Spieltag." |
| `rhythmus(n)` | „Alle n Spieltage — die Wertung läuft über den ganzen Block." |
| `serie(bedingung, n)` | „Wenn dir n Spieltage hintereinander dasselbe passiert." |
| `schwelle(größe, wert)` | „Sobald ein Wert überschritten wird, z. B. der Rückstand." |
| `zufall(frequenz)` | „Unangekündigt, aber etwa alle n Spieltage. Wann genau, weiß niemand vorher." |
| `termin(spieltag)` | „An einem festen Spieltag." |
| `saisonende` | „Einmal am Ende." |

**WEN — Auswahl.** Der Teil, der heute fast leer ist (siehe Befund oben).

| Auswahl | Kurzbeschreibung |
|---|---|
| `alle` | „Trifft jeden gleich." |
| `selbst` | „Jeder entscheidet für sich." |
| `betroffener` | „Nur wen es erwischt hat." (bei `serie`/`schwelle`) |
| `rang(ende, n)` | „Die besten / schlechtesten n." |
| `perzentil(ende, %)` | „Das obere / untere Fünftel — wächst mit der Rundengröße mit." |
| `mitte` | „Wer weder vorn noch hinten steht." |
| `los(n)` | „n Ausgeloste. Nachprüfbar, nicht heimlich." |
| `paarung` | „Zwei werden gegeneinander gesetzt." |
| `wettlauf(n)` | „Die ersten n, die zugreifen." |

⚠️ **Der `bezug` ist ein Pflichtfeld, kein Detail:** `gesamt` (Tabelle),
`spieltag` (nur dieser Spieltag) oder `zeitraum(n)`. „Der Beste **des
Spieltags**" und „der **Tabellenführer**" sind gegensätzliche Anreize — der
erste ist ein rotierender Preis, der auch von hinten erreichbar ist, der zweite
verstärkt einen bestehenden Vorsprung. Wer das Feld vergisst, baut versehentlich
das Zweite und meint das Erste.

⚠️ **`perzentil` statt `rang`, sobald Runden groß werden.** „Die letzten 5" ist
in einer Zwölfer-Runde fast jeder und in einer Runde mit 5000 Teilnehmern ein
Rundungsfehler. Bei großen Runden führt nur das Perzentil zu einer Regel, die
sich gleich anfühlt (siehe Abschnitt „Große Gruppen").

⚠️ **`wettlauf` ist die eine Ausnahme, die Infrastruktur kostet.** „Die ersten
fünf" lässt sich nicht aus einem Startwert ableiten — es braucht eine echte
Reihenfolge und damit Serverzustand. Alles andere ist deterministisch aus der
Runden-Id ableitbar. Deshalb: **`wettlauf` zuletzt bauen**, und ehrlich als
das kennzeichnen, was es ist.

**WAS — Belohnung.** Hier entscheidet sich, ob das Regelwerk vermessbar bleibt.

| Belohnung | Kurzbeschreibung |
|---|---|
| `joker(n, sorte)` | „n Joker, Sorte aus der Joker-Bibliothek." |
| `bonus(%)` | „Ein Aufschlag auf deine Punkte." |
| `punkte(n)` | „Eine feste Gutschrift." |
| `rolle(welche)` | „Ein Recht statt Punkten — z. B. das Big Game bestimmen." |
| `sonderspiel(id)` | „Startet ein Miniwettspiel über mehrere Spieltage." |
| `nichts` | „Nur eine Auszeichnung. Kostet keine Balance." |

🔴 **Die Regel, die nicht gebrochen werden darf: KEINE Belohnung darf einen
neuen Punkte-Kanal aufmachen.** `joker` fließt in `jokerKontingent.js` und
unterliegt `maxErspielt`; `bonus` und `punkte` fallen in denselben ADDITIVEN
Topf wie Derby, Big Game und Wettbewerbs-Gewicht und damit unter `modCap`. Das
ist bei `ereignisse.js` schon so entschieden worden, und der Grund gilt hier
verstärkt: mit einer Grammatik kann ein Admin zwanzig Regeln gleichzeitig
scharf schalten. Ohne gemeinsamen Deckel addieren die sich zu einem Spiel, das
niemand mehr vermessen hat.

**`rolle` und `nichts` sind dabei die unterschätzten Einträge.** Sie kosten
NULL Balance und erzeugen trotzdem Bindung — „du darfst diese Woche das Big
Game bestimmen" ist stärker als „+5 %", weil es eine Rolle ist und kein Betrag.
Das ist der billigste Weg, eine Runde lebendig zu machen, und der einzige, der
im Abschluss-Durchgang nichts verschiebt.

**Die Wirkung darf NEGATIV sein** — deshalb heißt die Achse Wirkung und nicht
Belohnung. Der Auslöser dafür war der Wunsch „der König bekommt beim nächsten
Mal Abzug".

| Wirkung (negativ) | Kurzbeschreibung |
|---|---|
| `malus(%)` | „Abzug auf deine Punkte." |
| `jokerEntzug(n)` | „Ein Joker verfällt." |
| `sperre(was)` | „Diesen Spieltag kein Joker." / „Nur Tendenz, kein Ergebnis." |
| `handicap(art)` | „Dein Favoriten-Malus zählt doppelt." |
| `pflicht(was)` | „Du musst gegen den Favoriten tippen." |
| **`umverteilung`** | **„Der Führende gibt ab, die Verfolger bekommen."** |
| `tausch` | „Zwei tauschen ihren Joker." |

🔴 **`umverteilung` ist die einzige SUMMENNEUTRALE Wirkung** — Punkte werden
verschoben statt erzeugt. Sie kann das Modifikator-Budget deshalb gar nicht
aufblähen und ist damit die billigste Art, den Vorsprung an der Spitze zu
begrenzen. **Vor `malus` bevorzugen.**

⚠️ **Bonus für den Letzten und Malus für den Ersten sind NICHT dasselbe**,
obwohl sie sich gleich anfühlen. Der Bonus hebt das Punkteniveau (die
Anzeige-Skalierung wandert mit), der Malus senkt es, und beides zusammen presst
das Feld doppelt. `umverteilung` macht beide Seiten in einem Zug und lässt die
Summe in Ruhe.

⚠️ **Verlust wiegt schwerer als entgangener Gewinn.** Ein Abzug für den
Führenden ist die Mechanik mit dem höchsten Absprung-Risiko der ganzen
Grammatik. Deshalb: als „die Verfolger holen auf" rahmen statt als Strafe — und
**niemals einen Malus aus einer verdeckten Lotterie ziehen.** Wer Punkte
verliert, muss es vorher gewusst haben.

**WEN — weitere Auswahlen**, die aus dem Bestand ableitbar sind:

| Auswahl | Kurzbeschreibung |
|---|---|
| `koenig` | „Der Tabellenführer." — eigener Name, weil häufigster und gefährlichster Fall |
| `verfolger(n)` | „Die Plätze 2 bis n+1." |
| **`aufsteiger(n)`** | **„Wer die meisten Plätze gutgemacht hat."** |
| `absteiger(n)` | „Wer am meisten verloren hat." |
| `titelverteidiger` | „Wer letzten Spieltag der Beste war." |
| `nachbarn` | „Die direkt über und unter dir." — jeder bekommt eine andere Auswahl |
| `gruppe(id)` | „Eine Division oder ein Grüppchen." |
| **`neu`** | **„Wer erst seit n Spieltagen dabei ist."** |
| `inaktiv` | „Wer n Spieltage nicht getippt hat." |
| **`freiwillig`** | **„Wer sich meldet."** — Risiko auf eigenen Wunsch |

Drei davon lösen echte Probleme statt nur Varianten zu sein:
- **`aufsteiger` belohnt BEWEGUNG statt POSITION** und ist dadurch
  selbstbegrenzend — man kann nicht dauerhaft der größte Kletterer sein. Es ist
  die einzige „belohne die Guten"-Regel, die sich nicht selbst verstärkt.
- **`neu` ist eine Community-Notwendigkeit, keine Spielerei.** Wer einer offenen
  Runde am 12. von 34 Spieltagen beitritt, hat keine Chance und ist in zwei
  Wochen weg. Ohne so eine Regel wächst eine Community-Runde nur bis zum ersten
  Spieltag.
- ⚠️ **`freiwillig` ist balancekritisch:** Zocker melden sich häufiger als
  Kenner. Ungemessen ist das ein Zocker-Turbo.

**WANN — weitere Auslöser**, alle aus Daten, die wir schon haben:

| Auslöser | Kurzbeschreibung | Daten |
|---|---|---|
| **`lotterie(tabelle)`** | „Es wird gelost, was passiert." | eigener Abschnitt unten |
| `quotenereignis(ab)` | „Ein Außenseiter über Quote X hat gewonnen." | ✅ Quoten |
| **`gruppenereignis`** | **„Niemand in der Runde hat es getroffen."** / „Alle haben." | ✅ Tipps |
| `spielereignis(art)` | „Ein Spiel endete 0:0." / „Der Führende hat verloren." | ✅ Ergebnisse |
| `enge(schwelle)` | „Wenn die Tabelle vorn eng ist." | ✅ Tabelle |
| `abstimmung` | „Die Runde entscheidet." | ✅ `voting.js` |
| `adminAusloesung` | „Der Admin drückt den Knopf." | wie beim Big Game |
| `kaskade(regel)` | „Ein Ereignis löst das nächste aus." | ⚠️ Zyklus-Erkennung nötig |

**`gruppenereignis` ist der beste Kandidat der Liste:** „niemand hat dieses
Spiel richtig getippt → alle bekommen einen Joker" braucht keine neuen Daten,
erzeugt ein Gemeinschaftsgefühl, das keine individuelle Regel hinbekommt, und
ist automatisch balancefair, weil es alle gleich trifft.

**WIE LANGE — Geltung.** ✅ **GEBAUT am 07.08.2026** (`src/lib/geltung.js`,
34 Tests, Oberfläche in `Ereignisse.jsx`, gemessen in `greift` Teil 4 und
`anzeige` Teil 3). Sechs auswertbare Typen: `sofort` · `naechsterSpieltag` ·
`fenster(n)` · `rest` (bis Saisonende) · `bisAusgeloest` · **`jackpot`**
(„holt es niemand, wächst es und wandert weiter"); zwei vorbereitet
(`handelbar` braucht Bestandsverwaltung, `bisWiderruf` eine Abstimmung).
Das Fenster ist der Fall Miniwettspiel: eine Regel, die den Zustand für
mehrere Spieltage verändert.

Damit steht die Grammatik vollständig:
**WANN** (`ausloeser.js`) → **WEN** (`auswahl.js`) → **WAS** (`wirkung.js`) →
**WIE LANGE** (`geltung.js`). Vorgabe jeder Achse ist das bisherige Verhalten
(`immer` / `sofort`), ein bestehender Creator-Code ändert also seine Bedeutung
nicht.

🔴 **Der Vertrag beim Bauen, und er ist nicht offensichtlich: über ein Fenster
läuft nur ein FAKTOR.** Ein Aufschlag über drei Spieltage wirkt dreimal; eine
feste Gutschrift über dieselben drei Spieltage wird EINMAL gezahlt, am Beginn.
Andersherum wäre das Fenster eine Multiplikation — und damit genau der neue
Punkte-Kanal, den die Wirkungs-Achse ausschließt. `wirkSpieltage()` rechnet das
an einer Stelle aus, `konflikte()` sagt es dem Admin im Klartext.

🔴 **Der Jackpot ist eine Aussage über die RUNDE, nicht über einen Spieler** —
und das ist der Fehler, der beim Bauen nahelag. Aus Sicht eines einzelnen
Spielers wäre bei „der Letzte des Spieltags" fast jeder Spieltag ein leerer
gewesen; aus Sicht der Runde ist an JEDEM Spieltag jemand Letzter, der Topf darf
also nie wachsen. Ein Ein-Nutzer-Lauf hätte aus einer Auszeichnung still eine
Verdreifachung für den gemacht, der selten hinten steht. Deshalb rechnet
`jackpotLage()` einmal über alle Mitspieler — und nur dann, wenn wirklich ein
Jackpot eingestellt ist.

⚠️ **`jackpot` braucht eine Obergrenze**, sonst entscheidet ein einzelner
Spieltag die Saison. Umgesetzt als PFLICHT: `GELTUNG_LIMITS.maxFaktor.min` ist
1,5 und nicht 0 — anders als bei `wirkung.punkte.maxProSaison`, wo 0 („kein
Deckel") erlaubt ist und nur eine Warnung auslöst. Der Unterschied ist
begründet: eine feste Gutschrift wächst nur durch eine ungünstige Einstellung,
ein Jackpot bauartbedingt.

⚠️ **Nicht zu verwechseln mit `jokerBasis.verfall`.** Der beschreibt die
Grundform ALLER Joker einer Runde (`periode`/`saison`/`wandert`), `geltung`
gehört zu EINER Regel. Zwei Runden können denselben Joker-Verfall haben und
trotzdem verschiedene Geltungen je Ereignis.

#### 🎰 Die Lotterie: gelost wird mit einstellbaren Wahrscheinlichkeiten

Statt dass jede Regel ihr eigenes `zufall(frequenz)` trägt, definiert der Admin
EINE Ziehung: eine Liste von Ereignissen mit Gewichten, je Spieltag gezogen.

Zwei Dinge gehören zwingend dazu:

1. **Ein ausdrückliches „nichts passiert" mit eigenem Gewicht.** Sonst passiert
   immer etwas, und dann ist es kein Ereignis mehr, sondern der Normalzustand.
2. **Gewichte werden als HÄUFIGKEIT angezeigt, nie als Zahl.** „Gewicht 3" sagt
   niemandem etwas, „kommt etwa 4× in 34 Spieltagen" schon. Wörtlich dieselbe
   Falle wie bei den Wettbewerbs-Gewichten, wo `anteile()` genau deshalb
   eingebaut wurde: der Admin denkt in Häufigkeiten und stellt Faktoren ein.

⚠️ **Und die Falle, für die die Lösung schon im Haus ist:** reiner Zufall
bündelt. `jokerPlan.js` hat das dokumentiert — *„sonst bündelt reiner Zufall
vier Joker in fünf Spieltagen; formal fair, gefühlt kaputt"* — und löst es
BLOCKWEISE. Die Lotterie braucht denselben zweiten Modus: **Kontingent**
(„diese vier Ereignisse kommen je einmal, an gelosten Spieltagen") neben der
reinen Ziehung. Ohne ihn baut man einen Fehler ein, den das Projekt schon
einmal behoben hat.

#### 🚫 Ausschlüsse: über GRUPPEN, nicht über Paare

Naiv wäre `schliesstAus: [regelId]`. Das nicht bauen — bei 20 Regeln sind das
bis zu 190 Paare, die niemand pflegt. Drei Primitive genügen:

| Mittel | Kurzbeschreibung |
|---|---|
| **`gruppe` + `maxGleichzeitig(n)`** | „Höchstens ein Glücksereignis pro Spieltag." |
| `abstand(n)` | „Dieselbe Regel erst wieder nach n Spieltagen." (Abklingzeit) |
| `vorrang(n)` | „Wer gewinnt, wenn zwei gleichzeitig greifen." |

**Damit wird aus einer Warnung eine Einstellung:** `konflikte()` in
`ereignisse.js` meldet heute „Trost-Joker + Aufhol-Bonus = Doppelbelohnung".
Mit Gruppen ist das keine Meldung mehr, sondern die Voreinstellung — beide in
Gruppe „Ausgleich" mit `maxGleichzeitig: 1`.

⚠️ **`vorrang` ist Pflicht, nicht Komfort.** Ohne feste Auflösungsreihenfolge
rechnet dieselbe Runde auf zwei Geräten verschieden. `ereignisse.js` deckelt aus
genau diesem Grund chronologisch.

⚠️ **`abstand` ist das Gegenmittel gegen farmbare Serien.** „3× nichts
getroffen → Bonus" mit `abstand: 5` lässt sich nicht wöchentlich melken.

#### Bibliotheken — verschachtelt, aber mit EINER Kompositionsregel

Der Nutzer will Bibliotheken auf mehreren Ebenen. Das ist richtig, braucht aber
Disziplin, sonst entstehen zwei konkurrierende Zusammensetzungs-Systeme.

- **Runden-Bibliothek** (das Gesamtpaket) — eine ganze Runden-Idee: Regelwerk +
  Wettbewerbe/Gewichtung + Joker-Auswahl + Ereignis-Regeln + Big-Game-Formel.
  **Das ist keine neue Erfindung**, sondern die Ausweitung von `charaktere.js`
  (Stufe 1 „Schnellstart"), das heute schon Regelwerk + Saison-Wetten + Joker
  bündelt.
- **Joker-Bibliothek** — Sorten und Verteilung (`jokerTypen`, `jokerPlan`).
  **Filter- und sortierbar, siehe eigener Abschnitt direkt darunter** — das ist
  die ausdrückliche Nutzer-Anforderung, kein Komfort.
- **Ereignis-Bibliothek** — fertige SÄTZE in der Grammatik oben, jeder mit
  einem Satz Beschreibung. Kandidaten: *Trostpflaster · Spieltags-Krone ·
  Pechvogel-Bonus · Scharfschütze · Dreier-Wertung · Jokerjagd · Losglück ·
  Rollentausch*.
- **Zufallsereignis-Bibliothek** — die `zufall`-Auslöser samt Beschaffenheit
  (Frequenz, was passiert, wie lange).
- **Wettbewerbs-Bibliothek** — welche Ligen, plus Gewichtungs-Presets.
- **Big-Game-Bibliothek** — steht schon als eigene Aufgabe (21:30).

🔴 **Die Kompositionsregel: die Bibliotheken MÜSSEN den Aspekten von
`presetMerge.js` entsprechen.** Dort werden Regelwerke heute über acht benannte
ASPEKTE gemischt, und ein Test wacht darüber, dass die Aspekte ALLE Regel-Felder
abdecken. Wenn die Bibliotheken anders schneiden als die Aspekte, gibt es zwei
Wege, ein Regelwerk zusammenzusetzen, die unterschiedliche Ergebnisse liefern —
und dann ist nicht mehr feststellbar, was eine Runde eigentlich spielt.
**Eine Bibliothek = ein Aspekt.** Wächst die Grammatik, wächst der Aspekt mit,
und der Test schlägt an.

Damit ist der Ablauf, den der Nutzer beschreibt, automatisch gedeckt:
**Empfehlung annehmen → einzelne Bibliotheken austauschen → Feinheiten
anpassen.** Genau das kann `presetMerge` schon, es bekommt nur mehr Aspekte.

#### 🏷️ Die Bibliothek als SORTIMENT — sechs Facetten, eine davon gemessen

**Ausdrücklicher Nutzer-Wunsch (29.07.):** „ich will eigentlich nicht, dass der
Erste gerade mit viel Abstand so stark davonziehen kann, und will das schon so
kommunizieren." Daraus folgt: die Bibliothek ist keine Liste, sondern ein
Sortiment mit Facetten — und die wichtigste Facette ist, **was ein Eintrag mit
dem Feld macht.**

| Facette | Werte | wofür |
|---|---|---|
| **Wirkrichtung** | ausgleichend · neutral · verstärkend | die Leitfrage |
| Vergabe | zugeteilt · erspielt · gelost · frei · sozial | „wie komme ich dran" |
| Gültigkeit | sofort · Fenster(n) · Saison · bis Ereignis | zeitlich |
| Wirkung | Faktor · Malus · Umverteilung · Rolle · Sonderspiel | was passiert |
| Budget | „~4× pro Saison · ~6 % der Punkte" | wie stark |
| Sichtbarkeit | offen · verdeckt | angekündigt oder nicht |

🔴 **Die Wirkrichtung wird GEMESSEN, nicht behauptet.** Das ist der Kern des
Vorschlags und die Hausregel des Projekts („die Herkunft wird abgelesen, nicht
behauptet"). Ein Eintrag heißt nicht „Ausgleichsjoker", weil jemand das
hingeschrieben hat, sondern weil ein Simulator-Lauf zeigt, dass er die Streuung
der Endpunkte senkt und Überholvorgänge häufiger macht. **Die Kennzahl dafür
existiert schon:** `aufholFlipQuote` in `balanceSim.js` misst genau, wie oft
jemand von hinten noch vorbeizieht. Dazu die Veränderung der Punkte-Streuung.
Zwei Zahlen, ein Etikett.

**Sortier-Schlüssel** (Voreinstellung: Wirkrichtung):
ausgleichend → verstärkend · Saison-Anteil · Häufigkeit · Erklärbarkeit
(passt es auf Stufe 1?) · Verträglichkeit mit der bisherigen Auswahl.

**Filter:** nur ausgleichende · nur was ohne Zusatzdaten läuft (`braucht`, das
Muster gibt es bei Saison-Wetten und Ereignissen schon) · nur was auf Stufe 1
erklärbar ist · **verträglich mit meiner Auswahl**.

**Der letzte Filter ist der wertvollste:** die Bibliothek kennt die
Ausschluss-Gruppen (Abschnitt oben) und kann deshalb live ausgrauen, was zur
bisherigen Auswahl nicht passt — statt es zuzulassen und später zu warnen.

**Kategorien im Sortiment** (Beispiele, wie der Nutzer sie genannt hat):
*Ausgleichsjoker* (begünstigen hintere Plätze) · *Serien-/Scorestreak-Joker*
(belohnen Läufe — die am stärksten selbstverstärkende Sorte, deshalb der
engste Deckel) · *Mut-Joker* · *Heimat-Joker* · *Rollen* (kosten keine
Balance) · *Zufalls-/Losjoker*.

⚠️ **Serien-Joker gehören in die Bibliothek, aber NICHT in unsere Empfehlung.**
Sie sind das Gegenteil dessen, was der Nutzer will; wer sie ausdrücklich sucht,
soll sie finden — mit sichtbarem Etikett „verstärkend".

#### 📣 Das Runden-Profil: eine Zahl, die der Admin wirklich braucht

Einzelne Etiketten helfen beim Auswählen, beantworten aber nicht die Frage, die
der Nutzer gestellt hat. Deshalb rechnet die Spielerstellung aus der GESAMTEN
Auswahl ein Profil und sagt es in einem Satz:

> „Deine Runde wirkt **ausgleichend**. Ein Rückstand von 10 % wird in etwa
> 6 Spieltagen aufgeholt, wenn du gut tippst. Der Führende kann sich nicht
> dauerhaft absetzen."

⚠️ **Und die Gegenwarnung, die genauso dazugehört: zu viel Ausgleich zerstört
den Sinn des Tippens.** Das steht schon im Aufhol-Abschnitt — „ein zu starker
Ausgleich entwertet gutes Tippen (Punkte-Verhältnis kippt Richtung 1,0 und
darunter wird das Ranking beliebig)" — und `balanceSim` misst es als
`punkteVerhaeltnis`. **Das Ziel ist also kein Extrem, sondern ein Korridor:**

- **`punkteVerhaeltnis`** — gewinnt der Kenner noch? (darf nicht Richtung 1,0)
- **`aufholFlipQuote`** — kann ein Zurückliegender noch aufholen? (darf nicht 0)

Beide Zahlen gibt es bereits. Die Empfehlung heißt deshalb nicht „möglichst
ausgleichend", sondern: **der Kenner gewinnt, aber niemand ist nach zehn
Spieltagen raus.** Das ist die Formulierung, die in die Oberfläche gehört.

#### Wie das auf den drei Stufen aussieht

Der schwierige Teil ist nicht die Grammatik, sondern dass Stufe 1 davon
**nichts** merkt.

- **Stufe 1 „Schnellstart"** — ein Runden-Charakter, fertig. Die Ereignis-Regeln
  kommen mit und stehen als Liste von SÄTZEN da, nicht als Einstellungen:
  „Alle 3 Spieltage wird der Beste belohnt. Das untere Fünftel bekommt einen
  Trost-Joker." Lesen genügt, verstehen ist optional.
- **Stufe 2 „Anpassen"** — EIN Regler „Wie viel soll nebenbei passieren?"
  (nichts ↔ viel), der ein Bündel aus der Ereignis-Bibliothek wählt. Darunter
  die einzelnen Sätze zum Ab- und Anhaken, jeder mit seiner Kurzbeschreibung.
  Kein Satzbau, nur Auswahl.
- **Stufe 3 „Profi"** — der Satzbaukasten: vier Auswahlfelder, die einen
  lesbaren Satz ergeben, plus **Live-Vorschau**: „trifft dich etwa 4× pro
  Saison" und „macht ~6 % deiner Saisonpunkte".

⚠️ **Die Live-Vorschau ist nicht Komfort, sie ist die Betreuung.** Bei den
Wettbewerbs-Gewichten war der entscheidende Fund, dass „Gewicht pro Spiel" nicht
„Anteil an der Wertung" ist und die Oberfläche den resultierenden ANTEIL zeigen
muss (`anteile()`/`anteilHinweis()`). Hier ist es dieselbe Falle in schärferer
Form: „die besten 5 bekommen einen Joker" klingt nach einer Kleinigkeit und ist
in einer Zwölfer-Runde fast die halbe Gruppe. Ohne Vorschau stellt ein Admin
etwas ein und bekommt etwas anderes.

#### ⚠️ Die Fallen, die die Betreuung abfangen muss

Das ist wieder der eigentliche Inhalt, nicht der Baukasten. Gehört in
`reglerWarnung.js`, wo die Trennung ERLAUBT/ERPROBT und die
Kombinations-Regeln schon stehen.

1. **Selbstverstärkung** — `rang oben` + `bonus` bei `bezug: gesamt`: der
   Führende wird jeden Spieltag stärker. Das ist der teuerste Fehler der ganzen
   Grammatik, weil er sich erst nach zehn Spieltagen zeigt und dann nicht mehr
   korrigierbar ist. **Muss eine harte Warnung sein.**
2. **Doppelter Ausgleich** — `rang unten`/`perzentil unten` + `bonus` neben
   aktivem Aufhol-Bonus. `konflikte()` in `ereignisse.js` meldet genau diesen
   Fall schon für den Trost-Joker; die Meldung muss die Grammatik mit abdecken.
3. **Farmbare Serien** — `serie(kein Treffer, 3)` + fette Belohnung: wer absichtlich
   drei Spieltage verschenkt, kassiert. Im Freundeskreis absurd, in einer
   Community-Runde mit Preis nicht. **Die Regel dagegen steht schon:** der
   Versäumnis-Ersatztipp ist „bewusst der zahmste — durch Tests abgesichert,
   dass er nie mehr zahlt als ein mutiger eigener Treffer". Dasselbe muss für
   jede Belohnung auf einen NEGATIVEN Auslöser gelten, und zwar als Test.
4. **Kollision** — zwei Regeln treffen dieselbe Person am selben Spieltag.
   Braucht eine feste Auflösungsreihenfolge (chronologisch, wie der Deckel in
   `ereignisse.js`) und eine Obergrenze je Person und Spieltag.
5. **Leerlauf** — eine Regel, die nie feuert, weil ihre Bedingung unerreichbar
   ist (`serie(exakt, 8)`). Der Admin denkt, er hat etwas eingestellt. Dieselbe
   Sorte Falle wie „alle Big-Game-Gewichte auf 0".
6. **Unangekündigter Zufall** — ein `zufall`-Auslöser, von dem niemand weiß,
   ist nicht spannend, sondern willkürlich. `jokerPlan.js` hat das schon
   entschieden: **verdeckte Reihenfolge, offenes Kontingent.** Also sagen, DASS
   es Zufallsereignisse gibt und wie oft — nie, wann.

#### Was das für die Vermessung heißt

Jede Regel liefert zwei Zahlen ins **Modifikator-Budget** (eigener Abschnitt
unten): **wie oft trifft es eine Person pro Saison** und **welchen Anteil an
den Saisonpunkten** macht sie aus. Erst damit ist eine Bibliothek eine
Empfehlung und nicht eine Sammlung.

⚠️ **Und der Punkt, der neu ist gegenüber allem Bisherigen:** `los`, `rang` und
`perzentil` erzeugen **ungleiche Erwartungswerte zwischen Personen**. Alles, was
bisher gemessen wurde, traf alle gleich (oder jeder entschied selbst). Der
Simulator muss deshalb nicht nur den Mittelwert prüfen, sondern die STREUUNG
zwischen Tippern gleicher Stärke — sonst sieht eine Runde, in der Losglück über
den Sieg entscheidet, in der Ampel genauso grün aus wie eine faire.

**⭐ Startmenge — die vier, die viel lösen und billig zu vermessen sind:**
`umverteilung` (summenneutral, begrenzt den Vorsprung an der Spitze) ·
`gruppenereignis` (trifft alle gleich, braucht keine neuen Daten) ·
`aufsteiger` (belohnt Bewegung statt Position, selbstbegrenzend) ·
`neu` (ohne sie wächst keine Community-Runde über den ersten Spieltag hinaus).

**Reihenfolge (nicht alles auf einmal):**
1. `waehleBetroffene()` als reine Funktion + Tests — UI-frei, klein,
   deterministisch aus Runden-Id geseedet wie `jokerPlan.js`. Ohne `wettlauf`.
2. Die Grammatik als Datenmodell in `rules.ereignisse` erweitern, durch
   `sanitize` und in den Aspekt von `presetMerge` — noch ohne neue Auslöser.
3. EINE Mechanik umstellen (Ereignisse), messen, Ampel prüfen.
4. Die Ereignis-Bibliothek mit 6–8 vermessenen Sätzen füllen.
5. Auslöser `serie` und `rhythmus`, dann `zufall` + `sonderspiel`.
6. Stufe-3-Baukasten mit Live-Vorschau, dann Stufe 2, dann Stufe 1.
7. `wettlauf` zuletzt, wenn überhaupt.

### ⏱️ WELCHE Quote gilt? — eine Annahme, die nicht stimmt (Befund, 2026-07-29)

**Der Nutzer ging davon aus:** „die Quote gilt vor Anpfiff, egal was sie vorher
jemals betragen hat." **Der Code macht etwas anderes.**

`saveTip({ roundId, matchId, userId, tip, snapshot })` — der Snapshot wird MIT
DEM TIPP gespeichert, also in dem Zustand, den er **im Moment der Abgabe**
hatte. Wer am Montag tippt, spielt mit den Montagsquoten; wer am Freitag tippt,
mit den Freitagsquoten. „Eingefroren ab Anpfiff" heißt nur, dass sich danach
nichts mehr ändert — zwischen Öffnung und Anpfiff hat jeder Tipper **seinen
eigenen Preis**.

**Das ist eine Entwurfsentscheidung, keine Kleinigkeit**, und sie war bisher
nirgends festgehalten. Drei Modelle sind vertretbar:

| Modell | Wer profitiert | Kurzbeschreibung |
|---|---|---|
| `oeffnung` | niemand | „Ein Preis für alle, festgelegt beim Öffnen des Spieltags." |
| **`abgabe`** (heute) | wer früh überzeugt ist | „Du sicherst dir die Quote, die du beim Tippen siehst." |
| `anpfiff` | wer spät tippt | „Für alle gilt die letzte Quote vor Anpfiff." |

- **`oeffnung`** ist das fairste im Sinne von „alle spielen dasselbe Spiel" und
  passt zu `bigGameWert`, der genau so eingefroren wird. Zeitpunkt der Abgabe
  ist dann völlig belanglos.
- **`abgabe`** belohnt frühe Überzeugung wie beim echten Wetten — wer den
  Außenseiter früh nimmt, bevor der Markt nachzieht, bekommt mehr. Reizvoll,
  aber es belohnt auch schlicht das Zuschauen: wer wartet, weiß mehr.
- **`anpfiff`** nimmt jeden Zeitvorteil, hat aber einen schweren Nachteil: man
  weiß beim Tippen nicht, was der Tipp wert ist.

**→ Vorschlag: `rules.quotenStand` mit `oeffnung` als Empfehlung**, `abgabe`
als heutiges Verhalten erhalten. ⚠️ Das berührt die Torschützen-Frage weiter
oben (echte Namen kommen erst 1–7 Tage vor Anpfiff): mit `oeffnung` löst sich
die auf, weil alle denselben Stand sehen.

⚠️ **Und es hängt an einem Sicherheitsbefund:** solange der Client den Snapshot
selbst mitschickt (siehe „RLS-Durchgang", Punkt 1), ist JEDES dieser Modelle
nur eine Vereinbarung, keine Regel. Erst ein Trigger, der den Snapshot
serverseitig stempelt, macht die Einstellung wirksam.

### 🎚️ Tipp-Einfluss auf die Quote — ENTSCHIEDEN: bleibt als Admin-Option (Nutzer, 30.07.)

**Der Nutzer will das ausdrücklich behalten**, mit einer Kalibrierungs-Ansage,
die das ganze Problem löst: *„im normalen Markt wäre ja ein Tippender
marginal."*

Genau das ist der Maßstab. Ein Totalisator, in dem ein einzelner Tipp die Quote
sichtbar bewegt, ist kaputt — nicht weil die Mechanik falsch wäre, sondern weil
die MARKTGRÖSSE fehlt. An einer echten Börse steht ein Tipp gegen Millionen;
in einer Zwölfer-Runde stünde er gegen elf.

**Daraus folgt die Bauform:** nicht „Gruppe gegen Markt", sondern **die Gruppe
wird dem Markt HINZUGERECHNET**, mit einem einstellbaren Gewicht:

```
p_final ∝ p_markt · (1 − a) + p_gruppe · a
a = tippEinfluss · (n_tipps / (n_tipps + marktTiefe))
```

- **`marktTiefe`** ist der eigentliche Regler. Sie sagt, gegen wie viele
  „virtuelle Mitspieler" die Runde antritt. Bei `marktTiefe: 200` bewegt ein
  einzelner Tipp in einer Zwölfer-Runde die Quote um Bruchteile eines Prozents
  — genau das „marginal", das der Nutzer meint. Bei `marktTiefe: 10` wird es
  spürbar. **Das ist der Unterschied zwischen Würze und Chaos, und er ist eine
  Zahl.**
- **`tippEinfluss`** (0–1) deckelt, wie weit es maximal gehen darf, auch wenn
  sehr viele tippen.
- Standard: **aus** (`tippEinfluss: 0`) — dann ändert sich gar nichts.

**Warum das die Architektur-Regel 4 NICHT bricht:** der Anker bleibt die Quote
des REALEN Ergebnisses, und er bleibt für alle gleich. Verschoben wird nur, wie
diese Quote zustande kommt — und zwar **einmal, beim Öffnen des Spieltags**,
nicht fortlaufend. Damit gilt weiter: einmal festgelegt, für alle dasselbe.

⚠️ **Der Punkt, der das Ganze sonst kippt: WANN wird gerechnet?** Wer während
der Tippphase live nachrechnet, baut ein Wettrennen — früh tippen wäre besser
oder schlechter, je nachdem. Und wer nach Anpfiff rechnet, ändert den Wert
abgegebener Tipps rückwirkend. **Beides ist verboten.** Es gibt genau ein
zulässiges Fenster: die Tipps werden gesammelt, und **beim Schließen des
Tipp-Fensters** entsteht daraus die endgültige Quote — vor Anpfiff, nach dem
letzten Tipp, für alle gleich. Wer früh tippt, hat weder Vor- noch Nachteil.

⚠️ **Zweite Falle: der Tippende darf seine eigene Quote nicht drücken.** Wer den
Favoriten tippt und dadurch dessen Auszahlung senkt, bestraft sich selbst fürs
Mittippen — und in einer kleinen Runde merkt er es. Sauber ist, die eigene
Stimme aus der eigenen Quote herauszurechnen (jeder sieht die Quote, die aus
den Tipps der ANDEREN entsteht). Das ist mehr Rechnung, aber es ist der
Unterschied zwischen „die Runde bewegt den Markt" und „ich schade mir selbst".

⚠️ **Dritte: kleine Runden brauchen einen Boden.** Bei drei Tippern ist die
Gruppenverteilung reines Rauschen. Unterhalb einer Mindestzahl (Vorschlag: 8)
sollte der Einfluss automatisch auf 0 gehen, statt eine Zufallszahl als
Marktmeinung auszugeben.

**Reizvoll bleibt es trotzdem**, und zwar aus einem Grund, der zum erklärten
Ziel des Nutzers passt: es bestraft Herdenverhalten von selbst. Wer tippt, was
alle tippen, bekommt weniger — ganz ohne Modifikator, ohne Malus und ohne dass
jemand eine Regel erklären muss.

**Ursprünglicher Entwurfs-Gedanke:** die Quote entsteht dann nicht (nur) aus
dem Markt, sondern aus dem Tippverhalten der Runde: tippen alle den Favoriten,
sinkt seine Auszahlung.
- **Reizvoll**, weil es Herdenverhalten von selbst bestraft und damit genau das
  Ziel „der Erste soll nicht davonziehen" bedient, ohne einen Modifikator.
- ⚠️ **Bricht aber Architektur-Regel 4** („Anker immer auf der Quote des REALEN
  Ergebnisses"): der Anker wäre nicht mehr der Markt, sondern die Gruppe. In
  einer Runde mit sechs Leuten ist das extrem volatil — einer tippt anders und
  die Quoten springen.
- **Deshalb wirklich nur für kleine, private Runden** und mit einer MISCHUNG
  (`markt × (1−a) + gruppe × a`), damit ein einzelner Tipp nicht alles kippt.
  Eigener Entwurf, nicht nebenbei.

### 🥷 Steals, Blocks und Mitgewinner — und warum sie eine fünfte Achse brauchen

**Nutzer-Wunsch:** ein Admin soll Ereignisse einstellen können, bei denen
Spieler einander etwas wegnehmen, blockieren oder mitgewinnen — mit Grenzen,
wie oft man einen Einzelnen treffen darf, und mit Abschwächung, wenn mehrere
denselben treffen.

**Das sprengt die bisherige Grammatik an genau einer Stelle:** bisher gab es
WEN es trifft. Ein Steal hat aber **zwei** Beteiligte — wer nimmt, und wem wird
genommen. Die Grammatik bekommt deshalb eine fünfte Stelle:

```
WANN → WER (Akteur) → ZIEL (Betroffener) → WAS → WIE LANGE
```

**Gute Nachricht: das kostet fast nichts.** `waehleBetroffene()` wird schlicht
ZWEIMAL aufgerufen, mit unterschiedlicher Konfiguration. Akteur `perzentil
unten 20 %`, Ziel `koenig` ergibt „das untere Fünftel darf dem Führenden etwas
abnehmen" — ohne eine Zeile neuer Auswahl-Logik.

**Die Wirkungen:**

| Wirkung | Kurzbeschreibung |
|---|---|
| `steal(was, menge)` | „Nimm dem Ziel etwas weg — es bekommt es abgezogen, du bekommst es gutgeschrieben." |
| `block(was)` | „Das Ziel kann diesen Spieltag seinen Joker nicht setzen." |
| `mitgewinner(anteil)` | „Du bekommst einen Anteil dessen, was das Ziel gewinnt — ohne dass es ihm fehlt." |

**`mitgewinner` ist der freundlichste Eintrag der ganzen Grammatik** und
verdient Vorrang vor `steal`: er erzeugt eine Verbindung zwischen zwei Spielern,
ohne dass einer verliert. „Du hast diese Woche auf Anna gesetzt — sie hat gut
getippt, du bekommst 20 % davon." Das ist sozialer Kitt statt Konflikt und
lässt sich außerdem ohne Deckel-Diskussion einführen, weil es niemandem etwas
wegnimmt (die Gesamtsumme steigt allerdings — also doch unters Budget).

#### ⚙️ Die Begrenzer — das eigentliche Werkzeug

Genau das, was der Nutzer meint mit „zu der Option noch einen zweiten Wert mit
Änderung geben". **Jede Ziel-gerichtete Wirkung bekommt Begrenzer**, und ohne
sie sollte keine davon aktivierbar sein:

| Begrenzer | Kurzbeschreibung |
|---|---|
| `maxProSaison(n)` | „So oft geht das überhaupt." |
| `maxProZiel(n)` | „So oft darf es DENSELBEN treffen." |
| `schutzfrist(n)` | „Wer getroffen wurde, ist n Spieltage sicher." |
| **`aufteilung`** | **„Treffen mehrere denselben, wird der Abzug geteilt statt vervielfacht."** |
| `mindestabstand(n)` | „Nur gegen jemanden, der mindestens n Plätze vor dir liegt." |
| `immunitaet` | „Neulinge und der Letzte sind nie Ziel." |

⚠️ **`aufteilung` ist der wichtigste Eintrag und die Voreinstellung.** Ohne ihn
ist ein Steal quadratisch: bei fünf Angreifern verliert das Ziel fünffach. In
einer Zwölfer-Runde ist das ein Ärgernis, in einer Runde mit tausend
Teilnehmern hört der Führende sofort auf zu spielen. **Geteilt statt
vervielfacht** hält die Wirkung planbar — und macht sie nebenbei
budgetierbar, weil die Gesamtsumme feststeht.

⚠️ **`mindestabstand` verhindert das Mobben nach unten.** Ohne ihn richtet sich
ein Steal gegen den Schwächsten, weil der sich am wenigsten wehrt. Mit ihm
zeigt die Mechanik immer nach OBEN — und dient damit dem erklärten Ziel.

**Unsere Empfehlung dazu: SELTENHEIT.** Steals und Blocks gehören in die
Bibliothek mit niedriger Frequenz und am besten an einzelne Wetten oder
Ereignisse gekoppelt, nicht als Dauerzustand. Ein Spiel, in dem jede Woche
geklaut wird, ist kein Tippspiel mehr. Das ist eine Empfehlung, kein Verbot.

### 🪓 Eliminationsmodus — und die Falle, die ihn meistens ruiniert

**Nutzer-Wunsch:** „immer X werden nach XX rausgeworfen, und ab … dann nur noch
xxx". Als Satz in der Grammatik:

```
Auslöser rhythmus(n) → Auswahl perzentil/rang unten(k) → Wirkung ausscheiden
```

Einstellbar: `abSpieltag` · `alleNSpieltage` · `wieViele` (Anzahl oder Anteil) ·
`bisNochUebrig` · `wasPassiertDanach`.

🔴 **Die Falle: Elimination und Bindung sind Gegenspieler.** Wer raus ist, hört
auf. In einer Zwölfer-Runde verlierst du am Ende zwei gelangweilte Freunde; in
einer Community-Runde mit 5000 Leuten wirfst du 4500 Nutzer raus, und die
kommen nicht wieder. **Deshalb ist `wasPassiertDanach` das eigentliche Feld:**

| danach | Kurzbeschreibung |
|---|---|
| `zuschauer` | „Du siehst weiter zu, tippst aber nicht mehr." — schlechteste Wahl |
| **`trostliga`** | **„Du spielst unter den Ausgeschiedenen weiter."** — Empfehlung |
| `wiedereinstieg` | „Ein Ausgeschiedener kann sich zurückkämpfen." |
| `raus` | „Endgültig." — nur für kleine, private Runden |

⚠️ **Elimination schließt den Aufhol-Bonus aus** — das eine entfernt die
Nachzügler, das andere hilft ihnen. Beides gleichzeitig ist widersprüchlich und
gehört in dieselbe Ausschluss-Gruppe (`maxGleichzeitig: 1`).

⚠️ **Und es verträgt sich schlecht mit `neu`:** wer spät beitritt, fliegt beim
nächsten Schnitt sofort raus. Entweder Schonfrist für Neulinge oder
Eliminationsmodus nur für geschlossene Runden.

### 💡 Wo ich noch Individualisierungsbedarf sehe (eigener Vorschlag)

Beim Durchgehen des Bestands sind mir vier Stellen aufgefallen, an denen heute
ein FESTER Wert steht, wo eine Einstellung Spielsinn hätte — zwei davon dienen
direkt dem Ziel „der Erste soll nicht davonziehen" und sind billig:

**1. Spieltag-Gewichtung über die Saison** — 🔴 **GEBAUT und VERMESSEN, und die
Messung hat meine eigene Begründung umgeworfen** (`src/lib/saisonform.js`,
30.07.).

> ⚠️ **Ich hatte hier geschrieben: „der eleganteste Hebel gegen einen
> davonziehenden Führenden". Das ist FALSCH.** 400 Läufe × 34 Spieltage ×
> 12 Tipper, gemessen wurde, wie oft der stärkste Tipper die Saison gewinnt und
> wie groß der Vorsprung des Ersten ist:
>
> | Form | Bester gewinnt | Vorsprung 1./2. |
> |---|---|---|
> | flach | 74,0 % | 3,66 % |
> | Endspurt ×2,5, Stärke konstant | 68,8 % | 3,86 % |
> | **Endspurt ×2,5, mit Formkurven** | **53,0 %** | **4,95 %** |
> | Rückrunde ×2,0, mit Formkurven | 57,0 % | 4,43 % |
>
> **Die Gewichtung senkt den Vorsprung des Führenden NICHT — sie vergrößert
> ihn**, und sie kostet massiv Können-Ausdruck. Der Grund ist im Nachhinein
> offensichtlich und war es vorher nicht: **Gewicht auf einen Teil der Saison zu
> konzentrieren verkleinert die effektive Stichprobe.** Weniger wirksame
> Spieltage heißt mehr Rauschen, und wer zufällig in der schweren Phase heiß
> läuft, gewinnt mit größerem Abstand. Aus einem Fairness-Regler wird ein
> Zufallsregler.
>
> **Was sie WIRKLICH ist:** ein Dramaturgie-Regler. „Das letzte Drittel
> entscheidet" macht das Saisonende spannend und ist als Spielgefühl legitim —
> aber sie gehört in die Bibliothek unter **verstärkend/zufällig**, nicht unter
> ausgleichend, und niemals in die Empfehlung für „der Erste soll nicht
> davonziehen". Genau dafür ist die gemessene Wirkrichtung da.
>
> **Die Lehre ist dieselbe wie bei ρ:** die Mechanik war plausibel, der
> Wirkzusammenhang erfunden. Erst die Messung mit FORMKURVEN (Spieler, deren
> Stärke sich über die Saison ändert) hat es gezeigt — bei konstanter Stärke
> ist der Effekt klein und man hätte ihn übersehen.

**2. ⭐ Streichresultate** (`streich` in `saisonform.js`) — **GEBAUT, und als
einziges der beiden tut es, was es soll.** Dieselbe Messung:

| Form | Bester gewinnt | Vorsprung 1./2. |
|---|---|---|
| flach | 74,0 % | 3,66 % |
| 3 Streicher | 73,0 % | 3,57 % |
| 6 Streicher | 72,5 % | **3,45 %** |

Der Vorsprung sinkt, der Können-Ausdruck bleibt fast unberührt (−1,5 Punkte),
und — anders als bei der Gewichtung — **ist die Wirkung unabhängig davon, ob
sich die Form der Spieler ändert** (73,0 % in beiden Szenarien). Das ist ein
echter, wenn auch milder Ausgleichsregler. Er verzeiht Urlaub und Ausrutscher.

⚠️ **Die Falle, an der Streichresultate sonst scheitern, ist gelöst:** sie
machen das AUSLASSEN kostenlos. Ein nicht getippter Spieltag hat null Punkte —
genau der Wert, der zuerst gestrichen wird. Aus „ein Ausrutscher wird
verziehen" würde „zwei Spieltage darfst du schwänzen", und das arbeitet direkt
gegen `versaeumnis`. Deshalb streicht `nurGetippte: true` (Vorgabe) nur
Spieltage, an denen wirklich getippt wurde.

⚠️ Gestrichen wird nach dem GEWICHTETEN Wert, nicht nach rohen Punkten — sonst
verschenkt man den teuersten Ausrutscher. Und der Zwischenstand ist
`vorlaeufig`, solange gestrichen wird: welcher Spieltag herausfällt, kann sich
noch ändern.

**Noch offen:** beide sind reine Funktionen und noch nicht ins Leaderboard
eingehängt (das berührt `scoreLeaderboardHistory`, wo auch `applyCatchup`
sitzt). Und sie gehören durch `balanceSim`, bevor sie in ein Preset kommen —
die Messung oben ist ein eigenes, vereinfachtes Modell, kein Ersatz dafür.

**3. Sichtbarkeit fremder Tipps** (`tippSicht`). Heute hart verdrahtet: fremde
Tipps erst, wenn das Spiel ein Ergebnis hat. Sinnvolle Varianten: *nach
Anpfiff* · *sobald ich selbst getippt habe* (der beste Kompromiss — belohnt
frühes Tippen mit Information, ohne Abschreiben zu erlauben) · *nie*. Kostet
keine Balance und verändert das soziale Gefühl der Runde stark.

**4. Kappung je Spieltag** (`maxProSpieltag`). Ein einzelner Volltreffer auf
einen 5:5-Außenseiter kann einen Spieltag entscheiden. Eine Obergrenze macht
Ausreißer planbar. ⚠️ Aber vorsichtig: eine Kappung entwertet genau den
mutigen Tipp, den das Spiel eigentlich belohnen will — deshalb hoch ansetzen
und als „nur gegen Extremfälle" beschreiben, nicht als Regler zum Drehen.

### 📊 Modifikator-BUDGET: wie viel Prozent bringt was — und wie oft? (NEU, Nutzer)

Gehört an den **Abschluss-Durchgang** (siehe Balance-Abschnitt oben), nicht
nebenbei. Es ist der Schritt, der aus „kein Preset kippt" eine
**Empfehlung mit Zahlen** macht.

**Die Lücke.** Wir messen heute EINE aggregierte Zahl (`modifikatorAnteil`) und
eine Ja/Nein-Frage („gewinnt der Kenner?"). Was fehlt, ist die Aufschlüsselung:
für jede Ertragsquelle einzeln — Joker (je Typ), Team/Derby, Joker-Abstimmung,
Big Game, Wettbewerbs-Gewicht, Ereignisse/erspielte Joker, Aufhol-Bonus,
Versäumnis-Ersatztipp, Saison-Wetten — jeweils **wie oft sie feuert** und
**wie viel sie dann bringt**, und daraus der **Anteil an den Saisonpunkten**.

**⚠️ Der Denkfehler, den das verhindern muss** — und es ist derselbe, der bei
den Wettbewerbs-Gewichten schon einmal dokumentiert ist („Gewicht pro Spiel ≠
Anteil an der Wertung"): **`modCap` deckelt pro SPIEL, nicht pro SAISON.** Zwei
Regelwerke mit identischem `modCap` können völlig verschiedene Saison-Budgets
haben, je nachdem wie HÄUFIG die Quellen feuern. Ein Modifikator mit +100 %, der
einmal pro Saison greift, ist etwas ganz anderes als +10 % an jedem Spieltag —
in der Anzeige sehen beide nach „ein Regler" aus. Genau dort wird eine naive
Einstellung unbemerkt unfair.

**Was dabei herauskommen soll:**
- Eine **Budget-Tabelle je Preset**: Quelle · Häufigkeit · Ø-Aufschlag wenn sie
  feuert · resultierender Saison-Anteil · Maximalfall.
- Daraus ein **Ziel-Korridor** je Quelle („Joker sollte 5–12 % der
  Saisonpunkte ausmachen"), abgeleitet aus den Presets, die schon vermessen
  sind — nicht getippt. Selbes Prinzip wie das Empfehlungsband in
  `reglerWarnung.js`: was `presets.balance.test.js` durchmisst, gilt als erprobt.
- **Speist drei Dinge auf einmal:** die Preset-Empfehlung, die Bänder der
  Profi-Stufe, und die Klartext-Sätze der Stufe 2 („der Joker macht bei dir
  etwa ein Zehntel der Saison aus").
- ⚠️ **Eine Messung verengt nie eine harte Grenze** (`RULE_LIMITS`) — das ist
  eine ausdrückliche Nutzer-Korrektur und gilt hier genauso.

**Reihenfolge:** erst der Simulator muss jede Ebene überhaupt SEHEN. Der
Blindstellen-Fund vom 27.07. (drei Ebenen wurden still gar nicht gemessen)
ist die Warnung dazu — vor dem Budget-Lauf prüfen, ob jede Quelle im Simulator
ankommt, sonst steht am Ende eine Tabelle mit Nullen, die nach Ergebnis
aussieht. Wettbewerbs-Gewichte und Ereignisse sind heute noch ungemessen.

### 📚 Preset-BIBLIOTHEK und offene Community-Spiele (NEU, Nutzer)

Heute sind Presets Code (`presets.js`) und Creator-Codes eine Zeichenkette, die
man von Hand weitergibt. Das Ziel ist größer: eine **durchsuchbare Bibliothek**
— unsere Empfehlungen, dazu von Nutzern geteilte Regelwerke, dazu **offene
Runden zum Beitreten**.

**Zwei Objekte, die nicht vermischt werden dürfen** (dieselbe Trennung wie
`rules.spiele` ↔ `rounds.team_filter`, die schon einmal zwei Wahrheiten
verhindert hat):
- **Preset = Vorlage.** Ein Regelwerk samt Spielauswahl, beliebig oft
  instanziierbar, nach dem Laden anpassbar. Der Creator-Code trägt das heute
  schon.
- **Community-Spiel = laufende Runde.** Ein konkreter Beitritts-Code, konkrete
  Mitglieder, ein konkreter Stand. Beitreten heißt hier mitspielen, nicht
  kopieren.

**⚠️ Die Ehrlichkeits-Regel, ohne die die Bibliothek wertlos wird:** unsere
eigenen Presets sind **vermessen** (`presets.balance.test.js`,
`npm run balance`). Ein hochgeladenes Community-Preset ist es nicht. Beides
nebeneinander zu zeigen, ohne das zu kennzeichnen, wäre dieselbe Sorte
Behauptung wie ein „echter Spielplan", der keiner ist — und dagegen gibt es
schon eine Hausregel: **die Herkunft wird abgelesen, nicht behauptet**
(`herkunftLabel`). Also: jeder Eintrag trägt sichtbar, woher er kommt.
**Und wir können mehr als kennzeichnen:** `balanceSim.js` + `bewerten()`
liefern die grün/gelb/rot-Ampel schon — ein eingereichtes Preset lässt sich
automatisch durchmessen und mit seiner Ampel anzeigen. Das ist der eigentliche
Wettbewerbsvorteil einer Bibliothek: nicht die Menge, sondern dass zu jedem
Eintrag steht, ob er das Spiel kaputt macht.

**Der Podcaster-Fall** (ausdrücklich vom Nutzer genannt): ein Creator mit
Reichweite will eine eigene Runde für seine Community. Was er braucht:
- **Ein eigener, sprechender Beitritts-Code** statt einer Zufallsfolge
  (`joinCode.js` erzeugt heute zufällige) — reserviert, damit ihn niemand
  wegschnappt.
- **Eine Landeseite je Runde**, die man verlinken kann: Regelwerk in Klartext,
  Ampel, Teilnehmerzahl, „jetzt beitreten".
- **Sein Regelwerk als Preset** in der Bibliothek, damit andere es als Vorlage
  nehmen können, ohne seiner Runde beizutreten.
- **Rollen:** Creator ≠ Admin ≠ Moderator. Bei tausend Mitgliedern kann der
  Creator die Runde nicht allein betreuen.
- ⚠️ **Premium-Frage:** heute braucht nur der ADMIN Premium (`premium.js`).
  Bei einer offenen Runde mit tausend Beitretenden ist das genau die richtige
  Seite — aber es lohnt, es vor dem Bauen noch einmal bewusst zu bestätigen.

### 👥 Große Gruppen: was bei tausenden Teilnehmern bricht (NEU, Nutzer)

Der Kern in einem Satz: **fast alles, was eine große Runde braucht, ist eine
GRUPPIERUNGS-Ebene über der bestehenden Wertung, keine neue Wertung** — genau
wie die Zeitachse „reine Struktur und Anzeige" ist. Drei Mechaniken sind
allerdings auf einen Freundeskreis hin gebaut und **brechen still**, wenn die
Runde wächst. Die zuerst.

**⚠️ Was konkret bricht (vor dem Bauen prüfen):**

1. **Aufhol-Mechanismus** (`catchup.js`) hängt am **Rückstand zur SPITZE**. In
   einer Runde mit 5000 Tippern ist der Erste ein statistischer Ausreißer —
   fast jeder liegt weit zurück, der Anschluss-Bonus feuert praktisch für alle
   und wird vom Ausgleich zum Grundeinkommen. Muss auf **Median oder Perzentil**
   umgestellt werden, sobald die Runde groß ist. Das ist eine echte
   Balance-Änderung, gehört also in den Simulator, nicht in die Anzeige.
2. **Spott** (`taunts.js`) bremst „einer je Ziel und Spieltag" **pro Absender**.
   Bei 5000 Mitgliedern kann ein Einzelner 4999 Sprüche bekommen. Es fehlt die
   Bremse **pro EMPFÄNGER** — und die ist die wichtigere, weil die Belästigung
   auf der Empfangsseite entsteht.
3. **Ereignisse/Meilensteine** (`ereignisse.js`): „erster exakter Treffer",
   „Außenseiter-Sieg vorhergesagt" sind in zwölf Leuten eine Auszeichnung und
   in 5000 eine Selbstverständlichkeit — irgendwer schafft es immer, und zwar
   jede Woche. `maxErspielt` deckelt zwar die Menge je Person, aber die
   BEDEUTUNG geht verloren. Bei großen Runden müssen solche Ereignisse relativ
   werden („unter den ersten 1 %"), nicht absolut.

**Was die Anzeige braucht (und das ist der Großteil):**
- **Eine Tabelle mit 5000 Zeilen ist keine Tabelle.** Niemand fühlt „Platz
  3471". Gebraucht wird: die **Nachbarschaft** (±5 um den eigenen Rang), das
  **Perzentil** („besser als 82 %"), und die **Spitze** getrennt davon.
- **Untergruppen sind die eigentliche Antwort.** Eine große Runde zerfällt in
  Grüppchen — selbst gebildet (Freunde) oder zugelost (Divisionen mit Auf- und
  Abstieg). Beide teilen Regelwerk und Punkte und ranken nur lokal. **Deshalb
  ist es billig:** die Wertung bleibt unberührt, es ist eine zweite Sicht auf
  dieselben Zahlen. Genau das Prinzip, das bei der Zeitachse funktioniert hat.
- **Divisionen mit Auf-/Abstieg** sind zusätzlich der natürliche Ersatz für den
  Aufhol-Bonus in großen Runden: wer abgehängt ist, spielt gegen Gleichstarke
  weiter, statt einen Bonus zu bekommen. Das löst Punkt 1 spielerisch statt
  rechnerisch — die schönere Lösung, wenn sie sich vermessen lässt.

**Was wir als Anbieter gut können — und was nicht:**
- **Gut:** deterministische, nachprüfbare Verteilung (Joker-Plan ist schon so
  gebaut: aus der Runden-Id geseedet, alle sehen dasselbe). Bei tausend
  Teilnehmern ist Nachprüfbarkeit wichtiger als bei zwölf — der Verdacht der
  Bevorzugung entsteht sonst automatisch, und er lässt sich nicht widerlegen.
- **Gut:** Automatik statt Handarbeit. Der Spieltag friert sich schon selbst ein
  (`autoOeffnen.js`, Vercel-Cron). Ein Creator mit tausend Mitgliedern kann
  nichts von Hand auslösen.
- **Schlecht/teuer:** Moderation. Anzeigenamen, Avatare und Spott-Sprüche sind
  in einem Freundeskreis unproblematisch und in einer offenen Runde ein
  Meldeweg, eine Blockliste und eine Person, die entscheidet. Das ist
  Betriebsaufwand, kein Feature — vor der Zusage einplanen.
- **⚠️ Rechtlich, und das ist kein Detail:** die Glücksspiel-Abgrenzung ist eine
  bewusste Grundentscheidung des Projekts (kein Echtgeld, wegen der
  App-Store-Zulassung). Eine offene Runde mit tausenden Teilnehmern, beworben
  von einem Creator, der vielleicht Preise auslobt, ist eine ANDERE Lage als
  ein Freundeskreis. **Bevor Community-Runden aufgemacht werden, muss klar
  sein, was ein Creator ausloben darf und was nicht** — und die Oberfläche
  sollte es gar nicht erst anbieten, wenn es nicht erlaubt ist.

**Technisch mitzudenken (Andres Ecke):** `round_members` wird heute für das
Leaderboard komplett gelesen (Self-Join-Policy in der RLS). Bei 5000
Mitgliedern je Seitenaufruf ist das nicht haltbar — es braucht serverseitige
Aggregation und Seitenweise-Laden. Das berührt `schema.sql` und die
Store-Dateien und sollte NICHT nebenbei passieren.

### Team-Modus (2er-Teams)
Zwei Tipper bilden ein Team, teilen sich Punkte oder tippen abwechselnd. Größter
Brocken — greift tief ins Scoring- und Runden-Modell.

### Rundenübergreifender Preset-Vergleich
Punkte nach Preset-Schwierigkeit normiert vergleichen. Innerhalb EINER Runde
haben alle dasselbe Regelwerk → lohnt erst über mehrere Runden hinweg.

### Kleinere geparkte Ideen
- ~~Auto-Tipp bei Versäumnis~~ ✅ ERLEDIGT — `autoTip.js` + `rules.versaeumnis`
  (Admin wählt Strategie, Malus in Prozent, Kontingent je Saison)
- Streak-Bonus (nutzt denselben Zähler wie die QT-Ball-ins-Gesicht-Saga)
- ~~GIF an Mitspieler senden~~ ✅ ERLEDIGT — `taunts.js` + Screen `/spott`,
  Versand über die Teilen-Funktion des Geräts (keine eigene Tabelle nötig)
- ❌ ~~Elfmeterschießen-Duell~~ **GESTRICHEN am 29.07.** (Nutzer). Auch aus dem
  Hub entfernt (`SOON` in `RundenHub.jsx` ist jetzt leer — eine Ankündigung, die
  niemand mehr baut, ist schlimmer als keine). Der wertvolle Teil daran lebt als
  `paarung` in der Regel-Grammatik weiter.
- **Benachrichtigungen** ✅ ERLEDIGT — `notify.js` + `/benachrichtigungen`:
  nur „neuer Spieltag" und „ungetipptes Spiel beginnt in X h", mit Nachtruhe
  und Tagesobergrenze. **Der Versand ist inzwischen gebaut** (`zustellung.js`,
  Stufe 1): `notify.js` sagt, was fällig WÄRE, `zustellung.js` führt Buch, was
  wirklich rausging — nötig, weil `maxProTag` sonst pro AUFRUF deckelte und
  häufiges Nachsehen zu Dauerfeuer trotz Obergrenze führte. Gemessen wird in
  einem rollenden 24-h-Fenster, nicht am Kalendertag.
  **Wirklich offen:** Web-Push/App als zweiter Kanal — die Naht dafür steht.

### 🔎 Nebenbefund 07.08.2026: `public/reactions/sieger.mp4` fehlt

Beim Browser-Check der Abrechnung: zwei 404 auf `/reactions/sieger.mp4`. Der
Clip wird von `rankReaction` für den Tabellenführer angefordert und liegt nicht
im `public`-Ordner. Bestand VOR den Änderungen dieser Sitzung und hat mit ihnen
nichts zu tun — deshalb hier notiert statt nebenbei repariert.

⚠️ Es fällt nicht auf, weil ein fehlendes `<video>` still bleibt: der Sieger
sieht schlicht keine Reaktion. Beim Prüfen der übrigen Clips mitnehmen, ob noch
weitere fehlen — die Liste der Namen steht in `reactions.js`.

### 📐 `npm run gleich` — steht derselbe Wert überall gleich da? (07.08.2026)

Punkt 3 der Nutzer-Reihenfolge, jetzt messbar statt vermutet. Verglichen werden
drei Wege zu DERSELBEN Zahl (`getLeaderboard` · letzter Punkt von
`getLeaderboardHistory` · Summe aus `getSpieltagsPunkte`) plus die
Selbstkontrolle der Aufschlüsselung (`breakdown().stimmt`).

Gemessen über FÜNF Regelwerke, nicht nur die Vorgabe — der Fund vom selben Tag
(Abrechnung gegen Leaderboard, 445 Punkte) trat nur bei eingeschaltetem
`tippEinfluss` auf. Mit der Vorgabe allein hätte die Messung Ruhe gemeldet.

**Stand: alle fünf Regelwerke gleich, 192/192 Ketten stimmig, 16 Werte je Fall
verglichen.**

⚠️ Die Zahl „16 Werte verglichen" steht bewusst in der Ausgabe. Ohne sie hieße
„gleich" womöglich nur, dass nichts geprüft wurde — dieselbe Sperrklinke wie in
`sicht` (kein Spieler-Screen übrig) und `greift` (Einstellung verworfen).

**✅ Nachgezogen am 09.08.2026 — die Vorschau ist jetzt drin (`gleich` Teil 2).**
Der gemeinsame Bezugspunkt, der angeblich fehlte, gibt es doch, und es ist der
einzige, der trägt: **das Spiel geht genau so aus, wie getippt wurde.** Dann
MUSS die versprochene Zahl die gutgeschriebene sein. 120 Tipps über fünf
Regelwerke, inklusive Joker und Gewicht (die Ebenen, die `scoreTip` ganz
zuletzt anwendet): **die Vorschau hält.** Ein Test in `engine.test.js` hält es
zusätzlich fest.

🔴 **Der Befund kam aus der ZWEITEN Zahl derselben Messung**, die gar kein
Fehler-Kandidat war: „Wenn dein Tipp exakt aufgeht: +1070" setzt
stillschweigend voraus, dass auch die getippten SCHÜTZEN treffen. Trifft
keiner, zahlt dasselbe Ergebnis **+146** — über 120 Tipps im Schnitt **62 %
weniger**. Beide Zahlen stimmen; nur stand die zweite nirgends, und wer sie
später bekommt, hält die Wertung für kaputt.
**Behoben:** `projectTip` liefert jetzt `pointsOhneSchuetzen` mit, die
Tippabgabe zeigt eine Zeile „… ohne deine Torschützen". Gerechnet wird das in
der ENGINE, nicht im Screen — ein Screen, der es selbst nachrechnete, wäre die
zweite Wahrheit, vor der die Runden-Schicht warnt.

**✅ Und die Rundenansicht ist seit 09.08.2026 als Teil 3 dabei** — damit ist
Punkt 3 der Reihenfolge vom 05.08. abgearbeitet. Verglichen werden die vier
Zahlen der Übersicht (Spiele der Runde · offen · selbst getippt · Münz-/
Narrenstand) über vier Runden-Zuschnitte, und zwar auf den ZWEI Wegen, die es
dafür gibt: `RundenHub` fragt den Store, `Hauptmenu` filtert den Katalog selbst
(laut eigenem Kommentar „die eine Ausnahme"). Genau solche Doppelwege waren die
17 Funde vom 05.08.

⚠️ Die Stand-Spalte zeigt in drei der vier Zuschnitte ein `—`: dort führt die
Runde weder Münzen noch Narren, es wurde also NICHTS verglichen. Das steht
bewusst dran — eine ungeprüfte Zeile darf sich nicht wie eine geprüfte lesen
(dieselbe Sperrklinke wie in Teil 1 und 2). **Wer den Stand breiter absichern
will, ergänzt Zuschnitte mit Narren-Ökonomie.**

### ⚠️ 07.08.2026: Vercel-Deployment pausiert — Pro Plan abgelaufen

Die Seite zeigte „This deployment is temporarily paused". Ursache war NICHT das
Ausgabenlimit (stand auf 0 von 200 $, „Pause Projects: Off"), sondern der Plan
selbst: **Pro Plan — Expired**, Zyklus 30.07.–30.08.2026. Also eine
fehlgeschlagene Verlängerung, kein neuer Antrag — das Datum deckt sich mit dem
Tag, an dem Pro hier vermerkt wurde.

**Entscheidung des Nutzers: Pro wird verlängert.** `vercel.json` bleibt damit
auf `0 * * * *`; der stündliche Cron ist ein Pro-Feature.

🔴 **Für den Fall, dass es doch einmal auf Hobby zurückfällt** — der Satz steht
schon in `CLAUDE.md`, hier die Bestätigung aus dem Ernstfall: dann MUSS
`vercel.json` sofort auf `0 3 * * *`. Auf dem Gratis-Tarif lässt ein zu
häufiger Plan nicht den Cron scheitern, sondern **den ganzen Build** — und man
sucht den Fehler im Code.

⚠️ **Was währenddessen still liegt, und das ist der eigentliche Punkt:** nicht
nur die Seite, sondern auch `/api/matchday/auto`. Ohne Cron öffnet sich kein
Spieltag von selbst und der Big-Game-Wert wird nicht eingefroren. Bis zum
28.08. folgenlos — danach nicht mehr. **Vor dem Launch prüfen, dass der Cron
wirklich läuft**, nicht nur, dass die Seite lädt.

### ⚽ 2. Bundesliga als siebter Wettbewerb (07.08.2026) — ECHTER Spielplan

`zweiteLigaData.js` + Eintrag in `ligen.js` und `wettbewerbe.js`. Katalog wächst
von 1636 auf **1942 Spiele** (bl 306 · bl2 306 · pl 380 · pd 380 · sa 380 ·
cl 159 · mls 31). Spielplan echt von OpenLigaDB (`bl2-2026.js`, 306 Spiele,
34 Spieltage); Quoten, Ergebnisse, Torschützen und Team-Stärken bleiben erzeugt.

🔴 **Zwei Funde, die der Bau selbst geliefert hat:**

1. **Klubs dürfen nicht in zwei Ligen stehen.** Der erste Anlauf hatte HSV,
   1. FC Köln, Schalke und Paderborn in beiden Listen — der Vereinsfilter zog
   damit bei einer reinen Bundesliga-Runde auch die 2. Liga mit, und
   `spieltagsPunkte.test.js` schlug an („bei EINEM Wettbewerb ändert der
   Schlüssel nichts": 38 statt 45 Spieltage). Ein Test, der eine Annahme über
   die DATEN prüft, nicht über den Code — und genau deshalb hat er es gefunden.
2. **Die Klubliste wird GEHOLT, nicht geraten.** Der zweite Anlauf stand auf
   einer plausibel erfundenen Liste und wurde von `pruefeSpielplan` hart
   abgebrochen: vier Klubs der echten Saison fehlten (Heidenheim, St. Pauli,
   Wolfsburg, Cottbus), vier erfundene gab es nicht. Die endgültige Liste kommt
   aus `getavailableteams/bl2/2026` — in der Schreibweise der Quelle, deshalb
   ist `ALIASE.bl2` leer.

⚠️ **Die Anstoßzeiten sind bewusst andere als in der 1. Liga** (Fr 18:30,
Sa 13:00/20:30, So 13:30). Fielen beide auf dieselben Slots, lägen die
Spieltage exakt übereinander, und die Zeitachse könnte sie nicht mehr staffeln
— „Spieltag 5 der Runde" träfe dann 18 Spiele auf einmal. Beim echten
Spielplan kommt das ohnehin aus der Quelle; die Slots greifen nur noch, falls
die Plan-Datei fehlt.

**Für den Live-Betrieb:** `supabase/seed-matches-bl2.sql` (306 Spiele) im
SQL-Editor ausführen — oder die Gesamtdatei, wenn sie durchgeht.
