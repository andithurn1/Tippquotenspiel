# Tippquotenspiel — Projektwissen für Claude Code

Quoten-gewichtetes Fußball-Tippspiel unter Freunden. Kein Echtgeld (bewusste
Glücksspiel-Abgrenzung — wichtig für App-Store-Zulassung). Details zur
Strategie: `README.md`.

## 🗓️ ZEITRAHMEN: HINRUNDE = TESTBETRIEB, KEINE FRIST (Andi, 25.08.2026)

⚠️ **Dieser Block stand einen halben Tag lang falsch hier und ist korrigiert.**
Aus *„wir haben jetz ruhig bis vor Beginn der Rückrunde Zeit"* hatte ich eine
**Frist zum 09.01.2027** gemacht und geschrieben, die Hinrunde sei
abgeschrieben. Beides hat Andi umgehend richtiggestellt:

> *„mit frist neu hab ich nur gemeint es eilt überhaupt nicht und ich will
> eher die hinrunde für Testing mit mir und Freunden als Menschen nutzen"*

**Was also gilt:**

- ⛔ **Der 09.01.2027 ist KEINE Frist.** „Es eilt überhaupt nicht" ist die
  Aussage, nicht „bis dahin fertig". Der Block darunter (kein Termindruck)
  gilt unverändert und ohne Ende.
- ✅ **Die Hinrunde ist nicht abgeschrieben, sondern der TESTBETRIEB** — mit
  Andi und Freunden, echte Menschen, echte Spiele, kleiner Kreis.
- ✅ **Die Rückrunde ist das, worauf hin gebaut wird**, nicht der Tag, an dem
  etwas fertig sein muss.

🔴 **Die Folge, und sie ist die wichtige an diesem ganzen Block:** „vor der
ersten echten Runde MIT MITSPIELERN" heißt ab jetzt **Hinrunde**, nicht
Rückrunde. Der einzige echte Blocker bleibt der **eigene Mailversand** —
ohne ihn kann sich außer Andi niemand anmelden, und ohne Anmeldung gibt es
keinen Test mit Freunden.

⚠️ **DRITTE Richtigstellung zum selben Thema, 26.08.2026 — und sie steht hier,
weil der Fehler dreimal derselbe war.** Aus „die Hinrunde ist der Testbetrieb"
hatte ich gemacht, der Test beginne mit dem Saisonstart am 28.08.2026, und
daraus wieder eine Dringlichkeit („in zwei Tagen"). Andi dazu:

> *„wieso testbetrieb mit freunden in 2 tagen? testbetrieb hat erstmal Zeit"*

⛔ **Der Saisonstart ist KEIN Startschuss für den Testbetrieb.** Die Hinrunde
ist das FENSTER, in dem getestet wird — nicht ihr erster Tag. Wann innerhalb
dieses Fensters begonnen wird, entscheidet Andi, und es eilt nicht.

🔴 **Die Lehre, ausgeschrieben, weil sie sich dreimal wiederholt hat:** ich
lese aus Zeitangaben Fristen heraus, die niemand gesetzt hat — erst „Frist
09.01.2027", dann „Hinrunde abgeschrieben", jetzt „in zwei Tagen". Jedes Mal
war die Angabe ENTSPANNT gemeint. **Ein Datum im Kalender ist keine Frist,
solange Andi es nicht als Frist bezeichnet.** Im Zweifel nachfragen, nie
ableiten.

⚠️ **VIERTE Richtigstellung, 26.08.2026 — und diesmal ohne Kalenderblatt.**
Ich hatte geschrieben, „in zwei Wochen laufen echte Menschen diesen Weg".
Niemand hat das gesagt; ich hatte es aus dem Spielplan abgeleitet. Andi:

> *„ich weiss nich wieso von dir immer kommt in zwei wochen, ich werde halt
> während der saison einsteigen lassen mit … als Spieltagsbeginn"*

🔴 **Was daraus folgt, und es ist mehr als eine Terminkorrektur:** der Einstieg
ist **kein Datum, sondern eine EINSTELLUNG** — `spiele.spieltagVon`. Eine Runde
fängt an, wann ihr Admin sie anfangen lässt, und das kann jeder Spieltag der
Saison sein. Wer nach dem „Starttermin" fragt, stellt schon die falsche Frage.

⚠️ Andi hat den Fall gleich weitergedacht: *„angenommen Marktstart ist eben
wirklich erst zur 2. Saisonhälfte dann wirds auch ne Einstellbarkeit brauchen
ab welchem Spieltag eben mitgemacht wird."* Die gibt es
(`spiele.spieltagVon`/`spieltagBis`, je Wettbewerb sogar abweichend) — und
seit dem 26.08.2026 sagt `reglerWarnung.js` auch, was sie für die
Saison-Wetten bedeutet.

📅 **Zum Nachschlagen, am echten Spielplan gemessen** (`bl-2026.js`,
OpenLigaDB) — Daten, keine Termine:

| | Datum | |
|---|---|---|
| Saisonstart (1. Spieltag) | 28.08.2026 | ⚠️ Beginn des FENSTERS, nicht des Tests |
| Letzter Spieltag vor der Winterpause | 19.12.2026 | Spieltag 14 |
| Erster Spieltag danach | 09.01.2027 | Spieltag 15 — 21 Tage Pause |
| Rückrunde im engen Sinn | 23.01.2027 | Spieltag 18 |

⚠️ **Und die Lehre aus dem Fehlgriff selbst, weil sie wiederkommt:** aus einer
beiläufigen Zeitangabe wurde hier eine Frist samt Begründung, warum sie
einzuhalten sei. Wo Andi *entspannt* formuliert, ist das die Aussage — nicht
der Anlass, eine Deadline zu rekonstruieren. **Im Zweifel nachfragen, nicht
ableiten.**

## ⏳ KEIN TERMINDRUCK MEHR (Andi, 20.08.2026)

⚠️ *Gilt unverändert weiter — der Zeitrahmen darüber nimmt nichts davon
zurück, er sagt nur, wofür die Hinrunde da ist.*

**Der 28.08.2026 ist KEIN Launch-Termin mehr.** Andi wörtlich: „launch ist
nicht so wichtig, gerne gutes top design“ und „wir planen eh nicht mehr
schnell fertig zu sein, haben alle Ruhe“.

Das steht hier oben, weil das Datum an einem Dutzend Stellen im Repo klebt —
in `README.md`, in der Roadmap, an mehreren „Launch-Blockern“. Genau so ist
schon einmal etwas zurückgekommen, das längst entschieden war (siehe den
Balancing-Block darunter): **nicht über das Gespräch, sondern über die
Aufgabenlisten.** Wer eine dieser Stellen liest, liest sie ab jetzt mit
diesem Vorbehalt.

**Was sich dadurch ändert — konkret, nicht als Stimmung:**

- ⛔ **Keine Abkürzung mehr mit der Begründung „vor dem Launch“.** Stehen zwei
  Wege offen und der gründlichere dauert länger, gewinnt der gründlichere.
- ⛔ **„Launch-Blocker“ heißt ab jetzt nur noch:** das muss vor der ersten
  echten Runde MIT MITSPIELERN stehen. Kein Datum, eine Reihenfolge. Der
  einzige echte davon ist der eigene Mailversand — ohne ihn kann sich niemand
  außer Andi anmelden.
- ✅ **Gestaltung darf Zeit kosten.** Ausdrücklich gewünscht, siehe den
  Gestaltungs-Auftrag im Kanal.
- ⚠️ **Was NICHT gemeint ist:** Balancing bleibt Endphase. Ruhe heißt nicht,
  dass jetzt alles drankommt.

⚠️ Die Daten im Katalog bleiben echt: die Bundesliga startet am 28.08.2026,
die Spielpläne rechnen damit. Das Datum ist weiter ein FAKT über den Fußball —
nur keine Frist mehr für uns.

## 🔴 UMFANG NIE EIGENMÄCHTIG KÜRZEN (Andi, 21.08.2026)

Wörtlich: *„wieso reduzierst du den Umfang? das ist ja Sabotage an meinen
Credits, maximiere deine Auslastung, ich zahle hier Geld."*

Der Rückfall, der dazu führte: Andis Struktur-Entwurf enthielt die
Variantenfrage als erste Zeile. Ich habe sie **selbst aus dem Umfang genommen**
— mit dem an sich vernünftigen Grund, sie würde beim Umbau am nächsten Tag
ohnehin nochmal angefasst — und das in einem Nebensatz am Ende einer langen
Nachricht erwähnt. Kein Missverständnis: ein stilles Streichen.

⛔ **Der bestellte Umfang IST die Lieferung.** Nicht kleiner, nicht „erstmal
der wichtigste Teil", nicht „das andere kommt morgen mit".

✅ **Richtig ist:** vollständig liefern UND die Bedenken danebenstellen —
„gebaut; Achtung, Teil X wird beim nächsten Umbau vermutlich nochmal
angefasst". Dann entscheidet Andi, ob er kürzen will. Kürzen ist seine
Entscheidung, nie meine.

⚠️ Das gilt auch für den umgekehrten Reflex: **kein Aufschieben auf „morgen",
solange nichts dagegenspricht.** Wenn Arbeit da ist und nichts blockiert, wird
sie gemacht — Wartezeit kostet ihn Geld, ohne dass etwas entsteht.

⚠️ Und es gilt für Rückfragen: **eine Frage stellen und dabei stehenbleiben**
ist dieselbe Kürzung. Erst alles bauen, was ohne die Antwort geht, dann fragen.


## 🎯 NUR „SPIEL ERSTELLEN" (Andi, 21.08.2026)

Wörtlich: *„es geht jetzt sowieso erstmal nur um Aufbau von Spiel erstellen,
außer ich sags anders."*

Andis Reihenfolge, ausdrücklich von ihm gesetzt: **erst die Masterdatei fertig**
(`Quotentippen.pptx`, gelesen über `scripts/lies-pptx.mjs`), **dann** intensive
Sitzungen, in denen umgesetzt wird — gleich mit guter Bedienung.

⚠️ **Bis dahin: Mechanik ja, Platzierung nein.** Wertungslogik überlebt jeden
Aufbau; WO ein Regler sitzt, entscheidet die Masterdatei. Wer vorher
einsortiert, räumt zweimal — am 21.08.2026 beim Tabellen-Bonus passiert.

Konventionen der Folien: `design/entwuerfe/masterdatei.md`.

## ⛔ BALANCING IST ENDPHASE — NICHT ANFASSEN (Andi, mehrfach, zuletzt 07.08.2026)

**Das steht bewusst ganz oben, weil es das ist, was am häufigsten schiefgeht.**
Andi hat es fünfmal geschrieben, fünfmal ist ihm zugestimmt worden, und danach
kam trotzdem wieder eine Balance-Rückmeldung. Der Grund war nicht schlechtes
Zuhören, sondern **die Aufgabenlisten im Repo**: Balance stand als „nächster
Schritt" in Übergabe und Roadmap, das nächste Fenster las die Liste und fing an.
Deshalb hier, und deshalb als Verbot formuliert.

Wir bauen den **Baukasten** — Gehäuse, Regler, Mechaniken. **Welche Zahlen
darin gut sind, wird ganz am Ende entschieden**, wenn das Gehäuse steht und
feststeht, welche Spiele, Wettbewerbe und Mannschaften eine Runde umfasst.
Vorher ist jede Balance-Aussage Zwischenarbeit, die ohnehin über den Haufen
geworfen wird.

- ⛔ **Keine Balance-Arbeit, keine Balance-Messung, keine Balance-Meldung** —
  nicht als Aufgabe, nicht nebenbei, nicht „nur kurz nachgesehen".
- ⛔ **`balanceSim.js` und die Balance-Ampel bleiben, wie sie sind.** Kein
  Anschließen neuer Ebenen, keine Blindstellen-Durchgänge, kein Nachrüsten.
- ⛔ **Nicht als „nächster Schritt" in eine Übergabe schreiben.** Genau darüber
  kommt es zurück.
- ⚠️ Fällt trotzdem etwas auf: **eine Zeile in `design/roadmap.md` unter
  „Endphase"** — nicht in den Chat, nicht in die Aufgabenliste.
### 🔴 Verschärft am 21.08.2026 — auch nicht als GEGENARGUMENT

Andi wörtlich: *„erstmal will ich nichts mehr von Balancing hören, außer es ist
wichtig für die Struktur des Grundspiels."*

Der Rückfall dieses Mal war subtiler als eine Balance-Messung: Balance wurde als
**Einwand** benutzt („feiner schneiden geht nicht, weil dann Kombinationen
entstehen, die niemand durchgerechnet hat"). Das ist dieselbe Sache in Tarnung —
und es blockiert Bauarbeit, statt sie zu ordnen.

⛔ **Balance ist kein zulässiges Gegenargument gegen einen Umbau.** Die einzige
Ausnahme ist wörtlich seine: wenn die STRUKTUR DES GRUNDSPIELS daran hängt —
also die Wertung selbst nicht mehr funktionierte, nicht „es könnte unrund
werden".

**Seine Begründung, damit sie nicht wieder verhandelt wird:**

- **Will ein Admin etwas Unbalanciertes, soll er es haben.** Das ist eine
  Eigenschaft des Baukastens, kein Fehler darin.
- **Die Quoten balancieren bereits.** Sie sind die Grundlage der Wertung, und
  sie kommen aus echten Marktpreisen — da ist das Gleichgewicht eingebaut.
- **Unsere Empfehlungen sind milde Aufwertungen**, Größenordnung **bis etwa
  +20 %** (Beispiel von ihm: ein Tipp auf viele Tore).
- **Joker dürfen deutlich stärker sein, weil sie viel seltener sind** — und
  Seltenheit wie Schwere sind ohnehin einstellbar.

⚠️ Das ist zugleich die Antwort auf „wie stark darf eine Empfehlung sein?",
falls sie beim Bauen aufkommt: bis ~20 % für Dauerhaftes, mehr für Seltenes.
Damit ist die Frage beantwortet, ohne dass jemand sie neu ausrechnet.


**Warum Balance im Repo überhaupt vorkommt:** Andi hat vor zwei Wochen im Chat
beschrieben, was er am Ende WILL — **Empfehlungen in Form konkreter Zahlenwerte**
je Variable, abgestimmt auf die gewählten Spiele und Wettbewerbe. Das ist eine
Beschreibung des Ziels, **kein Auftrag für jetzt**. Alles, was im Repo zu
Balance steht, ist unter diesem Vorbehalt zu lesen.

🔴 **Was JETZT gilt, ist etwas anderes und heißt nur ähnlich:** geprüft wird, ob
eine Einstellung GREIFT und ob sie ERREICHBAR ist — nicht, ob sie klug ist
(Baukasten-Grundsatz unten). Dafür sind `npm test`, `greift`, `stufen`, `tot`,
`anzeige`, `lint` da. **Diese Abnahmen sind KEINE Balance-Prüfung** und laufen
normal weiter.

⛔ **Die Balance-Tests sind seit 07.08.2026 STILLGELEGT** — das ist Absicht und
kein kaputter Zustand. `npm test` meldet deshalb „39 skipped", und zwei Dateien
laufen gar nicht mit:

| Wo | Was |
|---|---|
| `vitest.config.mjs` → `BALANCE_TESTS` | `presets.balance.test.js` und `balanceSim.test.js` ausgeschlossen |
| `charaktere.test.js` · `einfachRegler.test.js` | je ein `describe.skip("Schnelltest Balance …")` |

**Nicht „reparieren".** Gelöscht ist nichts — die Dateien tragen die Vorarbeit
für die Endphase. Wieder anschalten geht in zwei Minuten (Anleitung steht im
Kopf von `vitest.config.mjs`), aber erst **auf ausdrückliche Ansage von Andi**.
Nebeneffekt, den man sonst für ein Problem hält: `npm test` läuft dadurch etwa
doppelt so schnell.

---

## Session-Start (bei einem frischen Chat zuerst lesen)

An diesem Projekt arbeiten ZWEI Claude-Sessions verschiedener Accounts
asynchron über dieses Repo. Ein neuer Chat kennt nur diese Datei — der Rest
steht im Repo und muss aktiv gelesen werden, aber **nur die Enden**, die
Dateien sind lang:

1. `git fetch origin main` + auf aktuellen Stand bringen. `main` bewegt sich,
   die andere Session pusht dazwischen.
2. 🔴 **`design/ideen.md` — Andis Eingangskorb. IMMER lesen.** Dort schreibt er
   auf, was ihm zwischen zwei Sitzungen einfällt. Ein Eintrag mit `🆕` wird
   **nie direkt gebaut**: erst die Vorlage aus `design/vokabular.md` ausfüllen,
   und was unklar bleibt, als `❓` IN DEN EINTRAG schreiben statt zu raten.
   ⚠️ Genau hier entstand der Wildwuchs: aus „du kannst dir sicher vorstellen,
   welche Parameter das braucht" wurden 38 Regel-Blöcke mit 180 Einstellwerten.
   **Lieber eine Rückfrage zu viel als ein erfundener Regler.**
3. `design/vokabular.md` — die sieben Ebenen und die fünf Pflichtfragen. Ohne
   sie ist „Game-Einfluss" ein Wort, das nichts bezeichnet.
   🖥️ **Andi tippt in diese beiden Dateien über Desktop-Verknüpfungen**
   („Tippquotenspiel - Vokabular“ / „- Meine Ideen“, beide öffnen Notepad auf
   `C:\Dev\Tippquotenspiel\design\`). Zwei Folgen daraus:
   - Seine Ergänzungen liegen **uncommitted im Arbeitsbaum**. Also `git status`
     lesen, bevor irgendetwas verworfen wird. ⚠️ **Ein `git checkout -- .`,
     `git stash` oder Branchwechsel löscht, was er getippt hat** — und er
     merkt es erst Wochen später, wenn seine Notiz fehlt. Erst sichern.
   - Was er hineingeschrieben hat, **wird am Ende der Sitzung mitcommittet**,
     auch wenn es mit der Tagesaufgabe nichts zu tun hat. Sonst ist es beim
     nächsten `git clone` weg.
4. 🔴 **`design/auftraege.md` — jede Ansage von Andi mit Stand. IMMER lesen,
   IMMER nachführen.** Anlass war sein Befund vom 20.08.2026: *„habe bislang
   immer text gegeben und es wurde die hälfte ignoriert.“* Nachgemessen hatte
   er recht — von sechs Gestaltungs-Ansagen war keine umgesetzt, und die
   Leucht-Komponente lag gebaut, aber an einer einzigen Stelle benutzt.
   **Sagt er in einer Nachricht fünf Dinge, kommen fünf Zeilen dorthin** —
   nicht die eine, die gerade in die Arbeit passt. Eine Zeile verschwindet
   nie, sie ändert nur ihren Stand. ⚠️ **Ein ✅ ohne Beleg (Datei, Zeile oder
   Messung) ist ein ⏳.**

5. `design/roadmap.md` — was fertig ist und was als Nächstes ansteht. Wer
   etwas fertig macht, trägt es dort SOFORT ein.
   ⚡ **Kurzweg, wenn du nur die aktuelle Aufgabe brauchst:** der oberste
   Eintrag im Nachrichten-Log von `COORDINATION.md` ist immer der aktuelle
   Auftrag und selbsttragend geschrieben. Alles darunter ist Historie — lies
   sie nur, wenn dir etwas fehlt.

6. **Die ersten ~230 Zeilen** von `COORDINATION.md` — der Kanal zur anderen
   Session. Das Nachrichten-Log ist **neueste oben** sortiert, davor stehen
   Spielregeln, Claim-Board (wer hat welchen Bereich) und Push-Regeln. Die
   Datei ist über 1700 Zeilen lang; alles WEITER UNTEN ist Historie und wird
   nicht gebraucht. Vor dem Anfassen eines Bereichs dort eintragen und pushen.
7. Erst dann arbeiten. Nach Logik-Änderungen `npm test`, vor Abschluss
   `npm run build`.

🔴 **Zum Nachsehen im Browser gibt es zwei Demo-Runden**, nicht eine:
`DEMO` („Freundeskreis") fährt die Vorgabe und hat fast alles AUS — richtig für
den ersten Eindruck, unbrauchbar zum Prüfen. `ALLES` („Schaufenster") schaltet
an, was man sehen soll, und hat Tipps, die es auslösen (`src/lib/schaufenster.js`)
— seit dem 23.08.2026 mit **189 von 201** Einstellungen auf einem anderen Wert
als der Vorgabe, gemessen von `npm run einstellbar`. Die 12 übrigen tragen je
einen Satz (`SCHAU_AUSGENOMMEN` bzw. `GEKOPPELT`); die Zahl, die 0 sein muss,
heißt `unerklaert`.
⛔ Die Zahlen darin sind DEMO-Werte, keine Empfehlung — nichts davon gehört in
`presets.js` oder `charaktere.js`.
⚠️ **Dass `reglerWarnung.pruefe()` auf dieser Runde anschlägt, ist RICHTIG** und
darf nicht glattgezogen werden: ein Regelwerk, in dem jede Einstellung von der
Vorgabe abweicht, verlässt zwangsläufig die Empfehlungsbänder. Eine stumme
Ampel wäre hier der Fund.

Erlaubnisse liegen in `.claude/settings.json` (committed) — Lesen/Schreiben,
`git`, `npm`, `node`; nur Force-Pushes fragen nach. Da ist nichts einzurichten.

### 🔴 Der Baukasten-Grundsatz (Andi, 02.08.2026) — Langtext in `docs/arbeitsweise.md`

**Tiefe UND Einfachheit.** Jede neue Einstellung beantwortet drei Fragen:

1. Wie sieht sie in der EINFACHEN Ansicht aus — oder wer setzt sie dort mit?
2. Was macht sie in der Profi-Ansicht einzeln verstellbar?
3. Warum darf sie NUR in Profi stehen? Ohne Begründung ist sie eine Lücke,
   und `npm run stufen` zählt sie.

⚠️ **Nie nur der Knopf.** Zu jeder Voreinstellung gehört das Zahlenfeld —
eine Bequemlichkeit, keine Bevormundung.

### Arbeitsweise, die Andi ausdrücklich will

- **Möglichst wenig Rückfragen.** Andi schaut nur gelegentlich rüber. Aufgaben
  hintereinander wegarbeiten, Entscheidungen aus den Repo-Dokumenten ableiten
  statt zu fragen. Nachfragen nur, wenn die Antwort das VORGEHEN ändert und
  sich nicht aus Roadmap/Kanal/Code ergibt.
- **Keine Erlaubnis-Schleifen.** Commit + Push nach jedem abgeschlossenen
  Schritt, ohne vorher zu fragen. Klein und oft (Push-Regeln unten).
- **Befunde ins Repo, nicht in den Chat.** Was auffällt, gehört nach
  `design/roadmap.md` bzw. `COORDINATION.md` — dort sieht es auch die andere
  Session, ein Chatverlauf ist nach dem Fenster weg.
- **Messen statt annehmen.** In dieser Sitzung sind zwei eigene Fehlmessungen
  aufgeflogen, beide durch eine ANNAHME statt einer Messung (siehe `RHO` in
  `oddsApi.js`). Wo eine Zahl gebraucht wird: erst nachmessen.

### 📋 Anweisungen an Andi IMMER Schritt für Schritt — Langtext in `docs/arbeitsweise.md`

Ein Schritt je Zeile, in der Reihenfolge des Klickens, mit dem, was er sehen
wird. **Nie mehrere Handgriffe in einen Satz.**

⚠️ **Platzhalter mit `…` sind gefährlich.** Andi fügt Blöcke eins zu eins ein;
`sb_publishable_…` landete so in einem Build. Echte Werte einsetzen oder das
Feld leer lassen.

### ⚙️ Werkzeug-Fallen — stehen in `docs/werkzeug-fallen.md`

Node im PATH, `.next` nach einem Build, PDF-Renderer, Datumsangaben, Netlify,
Supabase — alles, was auf DIESEM Rechner schon einmal Zeit gekostet hat.
**Beim ersten Werkzeug-Ärger dort nachsehen, bevor gesucht wird.**

Die zwei, die am häufigsten zuschlagen, bleiben hier stehen:

- 📅 **Datum NIE schätzen** — `git log --date=short` oder Dateizeitstempel.
  Am 20.08.2026 trugen 14 Zeilen ein falsches Datum, weil eine lange Sitzung
  über mehrere Tage lief und das Datum vom Anfang weitergeschrieben wurde.
- ⚠️ **`npm run build` zerlegt den laufenden Dev-Server.** „Lädt ewig" im
  Browser ist meist `.next`, nicht der Code — löschen und neu starten.


## Stack

- **Next.js (App Router) + React**, JavaScript (kein TypeScript). Import-Alias
  `@/*` → `src/*`.
- 🔴 **Styling seit 09.08.2026 ZWEISCHICHTIG** — Inline-Styles PLUS eine
  Stilebene (`src/app/globals.css`, Tokens in `src/lib/cssVariablen.js`).
  Kein CSS-Framework, aber auch nicht mehr nur Inline.

  **Warum, und das ist die eigentliche Lehre:** Inline-Styles allein waren eine
  bewusste Entscheidung — nur stand nie dabei, was sie AUSSCHLIESSEN. Sie
  können kein `:hover`, kein `:active`, kein `:focus-visible`, keine
  `@keyframes`, kein `prefers-reduced-motion` und kein `::before`. Das heißt:
  eine Oberfläche, die auf eine Berührung nicht antwortet. Andi hat am
  09.08.2026 nach Leuchten beim Klicken gefragt und zu Recht angemerkt, dass
  ihm das vorher hätte gesagt werden müssen.

  ⚠️ **Die Regel daraus, allgemein:** wer eine Architektur-Entscheidung hier
  einträgt, schreibt dazu, was sie unmöglich macht — nicht nur, was sie
  einspart. Eine Einschränkung, die niemand kennt, wird nicht entschieden,
  sondern erlitten.

  **Wie die zwei Schichten zusammenpassen:** `theme.js` bleibt die EINE Quelle
  der Farben; `applyFanColors` ändert sie zur Laufzeit (Vereinsfarben), und
  `schreibeCssVariablen()` spiegelt sie ins Dokument. Screens lesen `C.gold`,
  das Stylesheet `var(--tqs-gold)` — derselbe Wert, eine Richtung.
  ⚠️ `globals.css` enthält **bewusst keinen Reset**: sie ändert von sich aus
  nichts, eine Komponente muss eine Klasse nehmen. Dadurch ist die Umstellung
  Schritt für Schritt möglich statt als Big Bang über 67 Dateien.
  **Musterseite mit allen Bausteinen und Kürzeln: `/stil`.**
- **Tests:** Vitest (`npm test`). Getestet werden Engine + Mock-Store.
- **Backend:** Supabase (`@supabase/supabase-js`). Daten-Schicht steht als
  austauschbarer Store (Mock ↔ Supabase); Live-Anbindung braucht nur ein
  Supabase-Projekt + Env-Vars. Details: `docs/BACKEND.md`.
- **Geplant, noch nicht gebaut:** UI an den Store hängen (Login + echte Daten),
  Quoten-API-Proxy als Next.js-API-Route.
- 📱 **Capacitor steht seit 26.08.2026** — Ordner `android/`, App-ID
  `de.quotentippspiel.app`, `npm run app:sync`. **Für die tägliche Arbeit
  ändert sich nichts:** `npm run dev` im Browser bleibt der Arbeitsplatz,
  `npm run build` für Netlify ist unberührt. Handgriffe und die noch
  offenen Schritte (Deep Link, Push, iOS): `docs/native-app.md`.

## Struktur

- `src/lib/engine.js` — **die einzige Logik-Quelle** (Scoring, Regelwerk,
  Quoten-Quelle, Creator-Codes, `scoreLeaderboard`, `projectTip`). UI-frei.
  Von `src/lib/engine.test.js` abgesichert.
- `src/components/*.jsx` — die Screens + Provider (Client Components). Screens
  rechnen NICHT selbst, sie importieren aus der Engine: `Tippabgabe`,
  `Abrechnung`, `AuszahlungsExplorer`, `Spielerstellung` (Regelwerk + Runde
  anlegen), `RundeBeitreten`, `Einstellungen`. Provider: `AuthProvider`
  (`useAuth`), `RoundProvider` (`useCurrentRound` — aktive Runde, localStorage),
  `PrefsProvider` (`usePrefs` — persönliche Anzeige-Stufen).
- `src/app/` — Routen: `/` (Übersicht), `/tippen`, `/abrechnung`, `/explorer`,
  `/erstellen` (Admin: Regelwerk einstellen + Runde anlegen + Creator-Code),
  `/beitreten` (Runde per Code beitreten/wechseln), `/einstellungen`.
- `src/lib/store.js` — **die eine Stelle Mock ↔ Supabase** (wie die Quoten-Quelle).
  `store.mock.js` (In-Memory, seeded), `store.supabase.js` (echte DB),
  `supabaseClient.js` (Client-Factory), `joinCode.js` (Beitritts-Code-Generator).
  Gleiche Schnittstelle inkl. `createRound`/`joinRound`, Scoring in der Engine.
- `supabase/schema.sql` + `seed.sql` — DB-Schema (mit RLS, idempotent) und
  Demo-Match-Seed + Gemeinschaftsrunde.

## Architektur-Regeln (nicht brechen)

1. **Logik vs. UI trennen.** `engine.js` bleibt UI-frei; Screens sind nur „Haut".
   Neue Spiellogik gehört in die Engine + einen Test, nie in eine Komponente.
2. **Quoten-Quelle & Daten-Store sind austauschbar.** `createMockOddsSource()`
   (Quoten) und `getStore()` (Daten) sind je die einzige Stelle, die gegen die
   echte API/DB getauscht wird. API-/service_role-Keys NIE ins Frontend — nur
   serverseitig (API-Route / Env-Var ohne `NEXT_PUBLIC_`).
3. **Märkte sportart-neutral modellieren** (`{ sportart, typ, ankerQuote,
   auswertungs-statistik }`), damit Basketball etc. später ohne Engine-Umbau reinpasst.
4. **Anker immer auf der Quote des REALEN Ergebnisses**, nie auf der getippten —
   sonst wird die Nähe-Belohnung farmbar.
5. 🔴 **Die Runden-Schicht: vier Fragen, je EINE Stelle.** Siehe unten.

### 🔴 Die Runden-Schicht — vier Fragen, die kein Screen selbst beantwortet

**Der teuerste Befund dieses Projekts, in einem Satz:** von 17 Fehlern, die am
05.08.2026 in einem Durchgang gefunden wurden, war KEINER ein Rechenfehler.
Alle waren dieselbe Sache — eine Oberfläche hat einen Wert selbst nachgerechnet
und dabei eine andere Grundlage benutzt als die Wertung. Kein einziger kam aus
den Tests, weil beide Seiten für sich genommen richtig rechneten.

Es gibt genau VIER Fragen, an denen das passiert. Sie haben je eine Antwort,
und die steht im STORE — nicht im Screen:

| Frage | Antwort | ⚠️ Falsch wäre |
|---|---|---|
| **Welche Spiele gehören zur Runde?** | `getStore().listRoundMatches(roundId)` | `listMatches()` — der Katalog trägt sechs Wettbewerbe. Der „Meister" einer Bundesliga-Runde war dadurch der FC Barcelona. |
| **Welcher Spieltag ist das?** | `zeitachse(rundenSpiele)` → `rundenSpieltagVon` | Der LIGA-Spieltag. Über fünf Wettbewerbe gibt es „Spieltag 5" fünfmal, und der Joker-Plan vergab 27 statt 11 Joker. |
| **Welches Regelwerk gilt?** | `getStore().getRegelnFuer(roundId)` → `regelnFuer(spiel)` | `round.rules` — das ist der Stand VOR jedem Beschluss. |
| **Was hat wer gutgeschrieben bekommen?** | `getDrehradZiehungen` / `getDrehradBelohnungen` | Selbst nachrechnen. Ein Screen zeigte 270 Narren, wo die Wertung 30 vergibt. |

**Die Regel daraus, für jede neue Mechanik:** wenn ein Screen eine Zahl zeigt,
die auch in der Wertung vorkommt, **fragt er sie ab — er rechnet sie nicht
nach.** Fehlt die Store-Methode, wird sie gebaut; das ist billiger als die
zweite Wahrheit. Ein Screen darf rechnen, was NUR er zeigt (Vorschauen,
Was-wäre-wenn) — dann aber mit den vier Antworten oben als Eingabe.

### 🔴 Abnahmen statt Tests — wer eine Mechanik ergänzt, geht sie ALLE durch

Ein Test fragt „ist es kaputt". Diese fünf fragen etwas anderes, und **keine
kann die Frage der anderen beantworten** — jede von ihnen ist aus einem Fund
entstanden, den die beiden anderen nicht gesehen haben.

| Kommando | Frage | woran sie entstanden ist |
|---|---|---|
| `npm run anzeige` | **Steht überall dieselbe Zahl?** Vergleicht denselben Wert über alle Anzeige-Wege — nicht „kaputt", sondern „wie weit auseinander". | 17 Funde am 05.08., kein einziger ein Rechenfehler |
| `npm run greift` | **Bewegt die Einstellung überhaupt etwas?** Vorgabe gegen Extremwert, je Regel-Block. Teil 2 misst Ebenen, die keine PUNKTE bewegen, sondern Gutschriften. | `autoTip.js` war fertig, getestet, einstellbar — und von niemandem aufgerufen |
| `npm run stufen` | **Kommt ein Admin überhaupt an sie heran?** Jedes Regel-Feld muss auf Stufe 1 oder 2 erreichbar sein — oder in `NUR_PROFI` einen Begründungssatz tragen. | `rules.ereignisse` war wirksam UND richtig angezeigt und trotzdem unfertig: nur in der Profi-Ansicht |
| `npm run lint` | **Gibt es die Variable überhaupt?** Nur ZWEI Regeln: `no-undef` und `react-hooks/rules-of-hooks`. | Beim Umbau fiel `gestartet` weg und stand weiter im JSX — Build grün, 2019 Tests grün, Screen im Browser weiß |
| `npm run einstellbar` | **Nimmt das Feld überhaupt einen anderen Wert an — und überlebt er das Teilen?** Geht JEDES Blatt des Regelwerks durch, nicht eine Auswahl. Kandidaten werden aus Presets, Charakteren, Regler-Stufen und der Schaufenster-Runde GEERNTET, nicht von Hand gepflegt. | Zwei Blöcke standen in `greift` Teil 3 jahrelang ohne Messfall, weil dessen Liste von Hand gepflegt ist |
| `npm run tot` | **Ruft die gebaute Funktion überhaupt jemand auf?** Ein Export, den außerhalb seiner Datei und ihrer Tests niemand nennt. Sortiert nach Risiko: Funktionen in `rules.*`-Modulen zuerst. | An EINEM Tag sechs Mechaniken, die fertig, getestet und einstellbar waren — und niemand fragte sie |
| `npm run schrift` | **Skaliert die Schrift mit der Geräte-Einstellung?** Verbietet die nackte px-Schriftgröße; die Leiter steht als `TEXT` in `theme.js`. | 1 210 Fundstellen in px, 0 in `rem` — auf iOS ein bekannter Ablehnungsgrund im App-Review |
| `npm run detail` | **Gilt Andis Regel „gängigstes oben, Feinheiten hinter einem Klick" überall?** Zählt je Regel-Oberfläche, ob es eine zweite Ebene gibt — und ob sie über das gemeinsame `Feinheiten`-Bauteil läuft. | Die Regel WAR mehrfach befolgt, aber jede Stelle hatte ihre eigene Fassung gebaut — derselbe Verlauf wie bei den acht Eckenradien |
| `npm run bereit` | 👤 **Kann sich außer Andi überhaupt jemand anmelden?** Fragt Env-Variablen, Datenbank, Schema und Spielplan an EINER Stelle ab und gibt aus, was zu tun ist. ⚠️ Für ANDI, nicht für die Sitzung: er braucht die echten Schlüssel, die hier niemand hat. | Der einzige echte Blocker des Testbetriebs hängt an fünf Dingen, die einzeln in Ordnung aussehen — verteilt über Supabase, Netlify und Brevo |

🔴 **Der gemeinsame Nenner aller sechs Funde vom 06.08.:** ein grüner Test
beweist, dass eine Funktion RICHTIG rechnet — nicht, dass sie jemand fragt.
`autoTip.js` · die `spieltagsPunkte` · `alleEintraege` · die ganze WEN-Achse
(`auswahl.js`) · `tippfenster.anker` · das Freischalt-Fenster der Saison-Wetten.
Sechsmal war die Rechnung fehlerfrei und der Aufruf nicht da.

⚠️ **Zwei Sperrklinken hängen daran**, damit die Zahlen nicht davonlaufen:
`greift` meldet einen Messfall, der `sanitizeRules` gar nicht erst passiert
(„EINSTELLUNG VERWORFEN" — ein Tippfehler im Feldnamen sieht sonst exakt aus
wie eine tote Einstellung), und `stufen` hat einen Test, der die Zahl der
Lücken nur SINKEN lässt.

⚠️ **Und die Gegenprobe, die dreimal an einem Tag etwas gefunden hat:** neue
Voreinstellungen gegen `reglerWarnung.js` laufen lassen. Keiner der drei Funde
vom 06.08. (Derby-Faktor über dem Deckel · `DEFAULT_DUELL.maxProSaison` unter
dem Erprobten · das Empfehlungsband für `saison.gewicht` aus dem falschen
Katalog) kam aus einem Test — alle aus dieser Prüfung.

## Scoring — steht in `docs/scoring.md`

🔴 **Vor jeder Änderung an der Wertung dort nachlesen.** Die Kurzreferenz
erklärt, wie aus Quote und Tipp Punkte werden, in welcher REIHENFOLGE die
Faktoren greifen und welche Deckel wo sitzen.

⚠️ Sie stand bis zum 21.08.2026 hier — 361 Zeilen, die jede Sitzung mitlas,
obwohl sie nur beim Anfassen der Wertung gebraucht werden. Ausgelagert ist
NICHT abgeschafft: die Regeln gelten unverändert.


## Arbeitsweise

- Nach Logik-Änderungen: `npm test`. Vor Abschluss: `npm run build`.
- ⚠️ **`npm run build` NICHT bei laufendem `next dev`.** Der Build überschreibt
  `.next`, und der Dev-Server läuft danach in „Cannot find module
  ./vendor-chunks/…" oder — tückischer — lädt einfach nichts mehr, ohne
  Fehlermeldung. Wer dann den Fehler im eigenen Code sucht, sucht lange.
  Erst den Dev-Server stoppen, oder ihn nach dem Build neu starten.
- **Hooks stehen VOR jedem frühen `return`.** Die Screens haben fast alle einen
  Lade-Zweig (`if (!match) return <Lade/>`); ein `useMemo` darunter wird im
  ersten Render übersprungen und der Screen stürzt beim zweiten mit „change in
  the order of Hooks" ab — genau so lag `Tippabgabe.jsx` eine Weile still kaputt.
- Demo-Daten: Match „JOR-ESP" (Jordanien vs Spanien, real 5:1). Mock-Werte in
  Screens (Leaderboard, Spieltag, Rang) sind als solche kommentiert — sie
  verschwinden, sobald das Backend steht.
- Auth: `AuthProvider` (Context) ist die eine Quelle für den Nutzer — Mock liefert
  Demo-User „Du", live kommt supabase.auth (Magic-Link) + Auto-Beitritt zur
  Freundeskreis-Runde (`DEMO_ROUND_ID` in `constants.js`, gleich in Mock + DB).
- Runden: `RoundProvider`/`useCurrentRound` hält die AKTIVE Runde (localStorage,
  Default `DEMO_ROUND_ID`) — unabhängig vom Regelwerk und vom Login. Neue Runde
  → `getStore().createRound()` (generiert Beitritts-Code via `joinCode.js`,
  Admin wird automatisch Mitglied). Beitreten → `getRoundByCode()` +
  `joinRound()`, dann `setRoundId()`. Tippabgabe/Abrechnung lesen `roundId`
  ausschließlich aus `useCurrentRound()`, nie mehr hart codiert.
- **RLS-Hinweis (wichtig bei Schema-Änderungen):** `rounds` ist für alle
  Eingeloggten lesbar (`using (true)`) — nötig, damit Beitritt-per-Code eine
  Runde findet, BEVOR man Mitglied ist; der Code selbst ist die Zugangsschranke,
  nicht die Sichtbarkeit. `round_members` erlaubt SELECT für alle Mitglieder
  DERSELBEN Runde (Self-Join-Policy), sonst sähe das Leaderboard nur die eigene
  Zeile. Bei Supabase-Schema-Updates: `schema.sql` ist idempotent, im SQL Editor
  einfach erneut komplett ausführen.
- Roadmap (Stand: Screens ✓, Spielerstellung ✓, Backend-Daten-Schicht ✓,
  UI an `getStore()` + E-Mail-Login ✓, Runden-Erstellung/-Beitritt ✓): als
  Nächstes echte Quoten-API mit Test-Key (Key nur serverseitig).

### ✍️ Texte und Oberfläche: Andis Vorgaben (07.08.2026)

**1. Beginnt eine Anfrage mit `formulierungXXX`, kommen IMMER mehrere
Alternativen — ohne dass er darum bittet.** Kurz und prägnant, als Liste oder
Schema. Er wählt aus, DANN wird geändert. Nicht vorher implementieren.

**1b. 🔴 TONFALL: locker jugendlich — der Maßstab steht in `docs/tonfall.md`.**
Andi am 27.08.2026: *„locker jugendlich, und nicht so Alter Sack der jung und
hipp ist"*. Sein eigener Beispieltext für die Fremdjoker ist die Referenz, an
der jeder neue Text gemessen wird. ⛔ Ausgenommen und ausdrücklich SACHLICH:
`reglerWarnung.js`, Fehlermeldungen beim Speichern, Datenschutz, Impressum.
⚠️ Der Bestand (4 609 Stellen, ~97 Normseiten) ist NICHT nachgezogen — das
steht als TON1 in `design/auftraege.md`. Neue Texte folgen dem Ton ab sofort.

**2. Weniger Text, dafür größer.** Sein Satz: „mir ist aufgefallen, dass oft
weniger Text möglich ist, den man dafür größer darstellen kann — genauso wie
die Boxen. Das ermöglicht, es später übersichtlicher zu gestalten." Gilt für
Beschriftungen, Hinweise und Kartenzuschnitt gleichermaßen.

**3. NOMINALSTIL statt Erklärsatz.** Nicht „Standardmäßig zählen alle Spiele
…", sondern „Beschränke die Tipprunde auf einzelne Mannschaften mehrerer
Wettbewerbe und konfiguriere, bei welchen Begegnungen welche Regeln,
Modifikatoren und Joker gelten." Auffordernd und dicht, nicht erklärend.

⚠️ Tippziele: gemessen mit `npm run sicht`/dem Handy-Durchgang lagen 17 Knöpfe
der Spielerstellung unter 40 px. Apple verlangt 44 pt, Google 48 dp — neue
Knöpfe nie darunter.
