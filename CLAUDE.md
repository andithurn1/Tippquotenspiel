# Tippquotenspiel — Projektwissen für Claude Code

Quoten-gewichtetes Fußball-Tippspiel unter Freunden. Kein Echtgeld (bewusste
Glücksspiel-Abgrenzung — wichtig für App-Store-Zulassung). Details zur
Strategie: `README.md`.

## ⏳ KEIN TERMINDRUCK MEHR (Andi, 20.08.2026)

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

3. **Die ersten ~230 Zeilen** von `COORDINATION.md` — der Kanal zur anderen
   Session. Das Nachrichten-Log ist **neueste oben** sortiert, davor stehen
   Spielregeln, Claim-Board (wer hat welchen Bereich) und Push-Regeln. Die
   Datei ist über 1700 Zeilen lang; alles WEITER UNTEN ist Historie und wird
   nicht gebraucht. Vor dem Anfassen eines Bereichs dort eintragen und pushen.
4. Erst dann arbeiten. Nach Logik-Änderungen `npm test`, vor Abschluss
   `npm run build`.

Erlaubnisse liegen in `.claude/settings.json` (committed) — Lesen/Schreiben,
`git`, `npm`, `node`; nur Force-Pushes fragen nach. Da ist nichts einzurichten.

### 🔴 Der Baukasten-Grundsatz (Andi, 02.08.2026)

**Maximale Individualisierung, wenn man sie will — und ein guter Vorschlag,
wenn nicht.** Drei Dinge gelten für JEDE neue Einstellung:

1. **Regler UND Zahleneingabe.** Der Regler ist zum Fühlen, das Feld zum
   Treffen. Wer 1,15 einstellen will, soll es tippen können statt zu zielen.
   Nicht entweder/oder — beides, nebeneinander.
2. **Immer ein empfohlenes Preset dazu.** Jeder Bereich hat unsere kuratierten
   Voreinstellungen, und die sollen später *die bekannten, ausgewogenen* sein,
   auf die man sich beruft. Sie müssen jederzeit abrufbar bleiben, auch nachdem
   jemand alles verstellt hat.
3. **Eine Einstellung, die ins Leere läuft, ist kein Baukastenteil.** Wenn der
   Regler auf Spieltag 12 steht, muss der Joker an Spieltag 12 existieren. Das
   ist keine Balance-Frage, sondern die Mindestanforderung.

⚠️ **Balance ist NICHT unser Job — Vollständigkeit ist es.** Empfehlungen zu
Stärke, Häufigkeit und Kombination kommen später, wenn das Gehäuse steht. Wenn
ein Admin sich eine kaputte Runde bauen will, soll er das dürfen. Was geprüft
wird, ist ob die Einstellung GREIFT, nicht ob sie klug ist.

🔴 **Und deshalb beantwortet `balanceSim.js` die falsche Frage, solange gebaut
wird.** „Gewinnt der Kenner?" ist eine Aussage über EIN Regelwerk — sie gilt
nach der nächsten Mechanik nicht mehr und muss neu gemessen werden. Das ist
Arbeit, die sich selbst auffrisst; sie ist in dieser Sitzung mehrfach gemacht
und mehrfach wertlos geworden. Die Frage, die trägt, ist die andere:
**SIEHT der Simulator die Ebene überhaupt?** Wenn eine neue Mechanik seine
Kennzahlen nicht bewegt, ist sie nicht angeschlossen — das ist ein
Vollständigkeits-Befund und bleibt gültig, egal wie die Runde später
eingestellt wird. Balance-Zahlen erst am Ende, mit Beispielparametern je
Admin-Einstellung (Andi, 05.08.2026).

#### 🔴 Die zweite Hälfte: Tiefe UND Einfachheit (Andi, 05.08.2026)

Der Grundsatz oben wird gern als „möglichst viele Regler" gelesen. **Das ist nur
die halbe Ansage.** Beides gilt gleichzeitig, für JEDE Einstellung:

- **Nach unten offen.** Wer in die Tiefe will, findet jeden Einzelwert.
- **Nach oben verdeckt.** Wer nicht will, sieht ihn nie und bekommt trotzdem
  eine stimmige Runde.

Der Mechanismus dafür ist **gebaut und darf nicht umgangen werden**: die drei
Komplexitätsstufen (`charaktere.js` → Stufe 1, `einfachRegler.js` → Stufe 2,
Profi-Ansicht → Stufe 3). Sie sind eine ANSICHT auf dasselbe `rules`-Objekt,
kein zweites Datenmodell — beim Wechsel geht nichts verloren.

**Für jede neue Einstellung heißt das drei Fragen, in dieser Reihenfolge:**

1. **Kommt sie in Stufe 1 überhaupt vor?** Meist nein — dann muss ein
   Runden-Charakter sie sinnvoll mitsetzen, ohne sie zu zeigen.
2. **Wenn sie in Stufe 2 gehört: unter welchem KLARTEXT-Regler?** Nicht der
   Feldname, sondern die Frage, die ein Spieler stellt („Wie viel soll nebenbei
   passieren?"). Ein Regler in Stufe 2 fasst oft mehrere Profi-Werte zusammen.
3. **In Stufe 3: Regler, Zahlenfeld, Preset und Live-Vorschau** — was der Wert
   konkret bewirkt, in einem Satz.

⚠️ **Eine Einstellung, die nur in Stufe 3 auftaucht und in Stufe 1/2 gar nicht
vorkommt, ist nicht fertig.** Sie zwingt jeden, der sie nutzen will, in die
Profi-Ansicht — genau davor sollen die Stufen schützen. Gehört sie wirklich nur
ins Profi-Gehäuse, ist das ausdrücklich zu BEGRÜNDEN, statt sie stillschweigend
dort abzulegen.

**Die Live-Vorschau ist kein Komfort, sondern die Betreuung.** „50 % Mischung"
sagt niemandem etwas, „ein einzelner Tipp verschiebt eine Quote um 0,24 %"
schon. Dieselbe Rolle haben `anteile()` bei den Wettbewerbs-Gewichten und
`beschreibeSaisonform()` / `beschreibeTippEinfluss()` bei ihren Modulen — dort
abschauen, statt Neues zu erfinden.

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

### 📋 Anweisungen an Andi IMMER Schritt für Schritt (Andi, 07.08.2026)

**Jede Handlungsanweisung an den Nutzer wird als nummerierte Schrittfolge
geschrieben — nie als Nebensatz im Fließtext.** Andi arbeitet an mehreren
Stellen gleichzeitig (Vercel, Supabase, GitHub, ZWEI Arbeitskopien auf der
Platte, mehrere Branches). Ein Satz wie „führ die Datei im SQL-Editor aus"
setzt voraus, dass er weiß, WELCHE Datei, in WELCHER Version, an WELCHEM Ort —
und genau das ist mehrfach schiefgegangen.

**Zu jeder Anweisung gehören verbindlich:**

1. **Der vollständige Pfad**, nicht der Dateiname: `C:\Dev\Tippquotenspiel\…`
   ⚠️ Es gibt eine ZWEITE, veraltete Arbeitskopie unter
   `C:\Users\andit\OneDrive\Tippprojekt\Tippquotenspiel` — ohne vollen Pfad
   landet er womöglich dort.
2. **Der Branch bzw. Commit**, sobald es über GitHub geht. Der aktuelle Stand
   liegt oft NICHT auf `main`.
3. **Wo genau geklickt wird** — Menüpunkt für Menüpunkt, mit den Namen, die
   auf den Knöpfen stehen.
4. **Eine Gegenprobe zum Schluss**: woran erkennt er, dass es geklappt hat?
   Eine Anweisung ohne Erfolgskontrolle endet damit, dass er nachfragen muss.

**🔴 Der Standard-Weg, eine Datei zu öffnen oder zu kopieren: der BROWSER.**
Andi hat ihn am 07.08.2026 ausdrücklich als Vorgabe gesetzt, nachdem drei
andere Wege zu lang waren.

```
file:///C:/Dev/Tippquotenspiel/<pfad>
```
in die Adresszeile, **Strg+A**, **Strg+C**. Zwei Schritte, fertig.

⛔ **Nicht** anbieten, solange der Browser reicht: Explorer mit Rechtsklick
(„Öffnen mit …", „ausgeblendete Elemente einblenden"), Notepad über
Windows+R, `Get-Content | Set-Clipboard` in PowerShell. Alle drei sind länger
und haben je einen Schritt, an dem es hakt — beim Rechtsklick die Frage, WO
man klickt; bei `Set-Clipboard` die fehlende Ausgabe, die wie ein Fehler
aussieht.

⚠️ Für Befehle bleibt PowerShell natürlich der Weg — es geht hier nur ums
ANSEHEN und KOPIEREN von Dateien.

⚠️ **Wegwerf-Dateien ausdrücklich als solche benennen.**
`supabase/_quoten-update.sql` ist nach dem nächsten Abruf veraltet; wer sie
später noch einmal ausführt, schreibt alte Quoten über neue — ohne
Fehlermeldung. Bei jeder Anweisung dazusagen, ob die Datei bleibt oder weg kann.

### ⚙️ Werkzeug-Fallen auf diesem Rechner (Account 1 / Andi)

- 📅 **Datum NIE schätzen — immer `git log --date=short` oder den Dateizeit-
  stempel nehmen.** Am 20.08.2026 stellte sich heraus, dass 14 Zeilen in
  `CLAUDE.md`, `COORDINATION.md`, `README.md` und `design/*.md` „09.08.2026“
  behaupteten, obwohl `git blame` den 20.08. zeigt: eine lange Sitzung lief
  über mehrere Tage, und das Modell schrieb weiter das Datum, das am Anfang
  stimmte. **Das ist nicht kosmetisch** — `COORDINATION.md` ist nach Datum
  sortiert (die zweite Session liest den obersten Eintrag als aktuellen
  Auftrag), und die Bestandsaufnahme der Regel-Blöcke entscheidet ANHAND DES
  DATUMS, ob etwas von Andi gewünscht oder erfunden war.
  Die Gegenprobe, die das gefunden hat:
  ```bash
  git blame -L <zeile>,<zeile> --date=short -- <datei>
  ```

- 🔴 **Der Anmelde-CODE ist auf dem Gratis-Tarif nicht herstellbar** (geprüft
  08.08.2026). „Ergänze `{{ .Token }}` in der Magic-Link-Vorlage" stand hier
  und in drei Übergaben als offene Nutzer-Aufgabe — **Supabase lässt die
  Vorlagen ohne eigenen SMTP-Versand gar nicht bearbeiten** („Set up custom
  SMTP to edit templates"). Die Aufgabe war also nicht liegengeblieben, sie war
  unmöglich. Gelöst über den **kopierten Link** aus der Standard-Mail: darin
  steckt derselbe Token (`src/lib/anmeldung.js`, `docs/BACKEND.md`).
  **Merksatz daraus:** eine Nutzer-Aufgabe, die dreimal offen bleibt, ist
  vielleicht nicht vergessen worden — erst nachsehen, ob sie überhaupt geht.
- **Node ist NICHT im PATH.** Vor jedem `npm`-Aufruf im Bash-Tool:
  ```bash
  export PATH="/c/Users/andit/AppData/Local/Microsoft/WinGet/Packages/OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe/node-v24.18.0-win-x64:$PATH"
  ```
- **`npm run build` NICHT bei laufendem Dev-Server** — überschreibt `.next`,
  danach lädt der Dev-Server stumm nichts mehr. Erst `preview_stop`.
- ⚠️ **Die Browser-Konsole sammelt ALTE Fehler ein.** `read_console_messages`
  liefert einen Puffer, der ein Neuladen überlebt. Wer während einer laufenden
  Bearbeitung liest, sieht Übersetzungsfehler aus Zwischenständen, die es im
  Code längst nicht mehr gibt — am 03.08. eine Viertelstunde an einem
  „Identifier already declared" gesucht, das nie existierte: der Subagent hatte
  beim Umstellen kurzzeitig Import und lokale Funktion nebeneinander, der
  Dev-Server hat das übersetzt und gemeldet.
  **Erkennungsprobe:** rendert die Seite (`document.body.innerText` hat
  Inhalt), ist der Fehler alt. Entscheidend ist ein `rm -rf .next` plus
  `npm run build` — der baut ohne Puffer.
- 🔴 **ZWEI ARBEITSKOPIEN — die teuerste Falle auf diesem Rechner.**
  Aktuell ist `C:\Dev\Tippquotenspiel`. Daneben liegt ein ALTER Checkout unter
  `C:\Users\andit\OneDrive\Tippprojekt\Tippquotenspiel` (stand am 31.07.2026
  noch auf `24d7abd` vom 30.07.).
  `preview_start` liest die `launch.json` aus dem **Primärverzeichnis der
  Session** (`C:\Users\andit\OneDrive\Tippprojekt\.claude\launch.json`), nicht
  aus dem Arbeitsverzeichnis — und die startete per `npm --prefix Tippquotenspiel`
  den alten Checkout. Der Dev-Server servierte damit tagealten Code, und eine
  Browser-Prüfung bestätigte Verhalten, das mit der gerade gemachten Änderung
  nichts zu tun hatte. Ohne Fehlermeldung, ohne Hinweis.
  **Behoben am 31.07.2026** (absoluter Pfad in jener `launch.json`), aber wer
  die Umgebung neu aufsetzt, tritt wieder hinein.
  **Erkennungsprobe**, wenn eine Änderung im Browser nicht ankommt, obwohl die
  Datei stimmt: nicht `.next` verdächtigen, sondern
  ```js
  fetch('/pfad?p=' + Date.now(), { cache: 'no-store' }).then(r => r.text()).then(t => t.includes('<neuer String>'))
  ```
  Liefert der SERVER den alten Text, ist es die falsche Arbeitskopie.
- 🔴 **Typografische Anführungszeichen: `„` IMMER mit `“` schließen, nie mit `"`.**
  Am 06.08.2026 dreimal hineingelaufen, jedes Mal mit einer anderen
  Fehlermeldung:
  · in einem JS-String bricht die Datei still ab — der Test-Zähler SINKT
    (1948 → 1915), weil eine ganze Suite nicht mehr geparst wird, und kein
    einziger Test schlägt rot fehl;
  · in einem JSX-Attribut endet das Attribut mitten im Satz, und der Build
    meldet nur `Expected '</', got ','` ohne Zeilennummer.
  🔴 **Die Erkennungsprobe ist `npm run lint` — nachgemessen am 09.08.2026.**
  ESLint parst `src` UND `scripts` und meldet den Bruch mit DATEI UND
  ZEILENNUMMER: `372:25 Parsing error: Unexpected token bei`. Damit ist es
  in Sekunden gefunden, statt über Test-Zähler und Build-Meldung erschlossen.
  **Also: `npm run lint` VOR `npm run build`.**
  · Am 09.08. dreimal hineingelaufen (JSX-Attribut, Template-String,
    `console.log`) — jedes Mal hat `lint` es sofort mit Zeile gezeigt.
  ⛔ **Keine eigene Prüfung dafür bauen.** Am 09.08. einmal versucht: ein
  Skript, das `„` ohne `“` sucht, meldete **1026 Treffer** — fast alle in
  KOMMENTAREN, wo ein gerades `"` völlig harmlos ist. Genau die Halden-Falle,
  vor der dieses Dokument überall warnt. Das Skript wurde wieder gelöscht;
  `lint` kann es besser, weil es wirklich parst.
  · Ergänzend, wenn `lint` einmal nicht läuft: `npm test` — die Zahl der Tests
    darf nach einer Änderung nur STEIGEN. Sinkt sie ohne roten Test, ist eine
    Suite nicht mehr geparst worden.
- **Commit-Nachrichten über eine Datei** (`git commit -F <datei>`), nicht per
  `-m` mit Anführungszeichen: PowerShell zerlegt sie sonst.
  ℹ️ **Umlaute dürfen rein.** Die älteren Commits schreiben „Uebergabe",
  „gruen", „Daempfer" — das stammt aus der Zeit von `-m` und ist über eine
  UTF-8-Datei nicht mehr nötig (am 03.08. gegengeprüft, `git log` zeigt sie
  korrekt). Die Krücke bitte nicht weiter abschreiben, sie liest sich wie ein
  Rechtschreibfehler.
- 🔴 **„Die Seite lädt nicht" — erst die zwei Anbieter prüfen, dann den Code.**
  Am 09.08.2026 lagen BEIDE gleichzeitig, und keins davon war ein Fehler im
  Projekt:
  · **Vercel: HTTP 402.** Der Pro-Tarif ist ausgelaufen (keine Kreditkarte
    mehr), Vercel sperrt dann Auslieferung UND Bauen. Ein Downgrade auf Hobby
    ist bei gesperrtem Team nicht anwählbar, und „Create a team" bietet nur
    noch Pro — deshalb der Umzug zu Netlify (`netlify.toml`, geplante Funktion
    unter `netlify/functions/`).
  · **Supabase: Projekt pausiert.** Gratis-Projekte schlafen nach etwa einer
    Woche ohne Zugriffe ein. Ein Klick auf **Resume project** genügt, kostenlos
    — NICHT „Upgrade to Pro". Die Daten bleiben unberührt.
  ⚠️ **Die beiden hängen zusammen:** solange die App offline ist, greift
  niemand auf die Datenbank zu, und Supabase schläft wieder ein. Läuft die App,
  hält allein die tägliche Spieltag-Automatik das Projekt wach.
  **Erkennungsprobe, bevor irgendwer den Code verdächtigt:**
  ```bash
  curl -s -o /dev/null -w "%{http_code}\n" https://<adresse>/
  ```
  402 = Bezahlung/Sperre beim Hoster · 200 mit leerer Liste = eher Supabase.
- **Der Mock-Store lebt im Arbeitsspeicher.** Ein voller Seitenwechsel im
  Browser setzt ihn zurück — angelegte Runden sind dann weg.
- **`vercel.json` verträgt KEINE eigenen Felder** (auch kein `_hinweis`), und
  der GRATIS-Tarif erlaubt nur EINEN Cron-Lauf pro Tag. Ein stündlicher Plan
  lässt dort nicht den Job scheitern, sondern **den ganzen Build** — genau daran
  ist jedes Deployment vom 26.–29.07. gestorben, ohne dass es jemandem auffiel.
  🔴 **Seit 20.08.2026 steht dort wieder `0 3 * * *` (täglich).** Andi hat
  keinen Zugang mehr zu einer Kreditkarte, der Pro-Tarif läuft also aus. Die
  Umstellung ist VORSORGLICH passiert, und zwar wegen der Asymmetrie: bleibt
  der stündliche Plan stehen und der Tarif fällt auf Hobby, scheitert **jeder
  Build** — und man sucht den Fehler im Code statt in einer Zeile Konfiguration.
  Umgekehrt kostet der tägliche Plan auf Pro fast nichts.
  ⚠️ **Was der tägliche Lauf wirklich kostet: kaum etwas.** Das Tippfenster
  öffnet `vorlaufStunden` (Vorgabe: 1 Woche) vor Anpfiff. Ein Spieltag geht
  dadurch höchstens ~24 h später auf als ideal — bei 168 h Vorlauf sind das
  14 %. Der Big-Game-Wert friert aus einer einen Tag älteren Tabelle ein.
  Beides ist folgenlos, solange der Lauf VOR dem ersten Anpfiff des Spieltags
  liegt, und 03:00 UTC liegt davor.
  ℹ️ Wer je wieder Pro hat, DARF auf `0 * * * *` zurück — muss aber nicht.

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
  Quoten-API-Proxy als Next.js-API-Route, Capacitor für App-Stores.

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

### 🔴 Fünf Abnahmen statt Tests — wer eine Mechanik ergänzt, geht sie ALLE durch

Ein Test fragt „ist es kaputt". Diese fünf fragen etwas anderes, und **keine
kann die Frage der anderen beantworten** — jede von ihnen ist aus einem Fund
entstanden, den die beiden anderen nicht gesehen haben.

| Kommando | Frage | woran sie entstanden ist |
|---|---|---|
| `npm run anzeige` | **Steht überall dieselbe Zahl?** Vergleicht denselben Wert über alle Anzeige-Wege — nicht „kaputt", sondern „wie weit auseinander". | 17 Funde am 05.08., kein einziger ein Rechenfehler |
| `npm run greift` | **Bewegt die Einstellung überhaupt etwas?** Vorgabe gegen Extremwert, je Regel-Block. Teil 2 misst Ebenen, die keine PUNKTE bewegen, sondern Gutschriften. | `autoTip.js` war fertig, getestet, einstellbar — und von niemandem aufgerufen |
| `npm run stufen` | **Kommt ein Admin überhaupt an sie heran?** Jedes Regel-Feld muss auf Stufe 1 oder 2 erreichbar sein — oder in `NUR_PROFI` einen Begründungssatz tragen. | `rules.ereignisse` war wirksam UND richtig angezeigt und trotzdem unfertig: nur in der Profi-Ansicht |
| `npm run lint` | **Gibt es die Variable überhaupt?** Nur ZWEI Regeln: `no-undef` und `react-hooks/rules-of-hooks`. | Beim Umbau fiel `gestartet` weg und stand weiter im JSX — Build grün, 2019 Tests grün, Screen im Browser weiß |
| `npm run tot` | **Ruft die gebaute Funktion überhaupt jemand auf?** Ein Export, den außerhalb seiner Datei und ihrer Tests niemand nennt. Sortiert nach Risiko: Funktionen in `rules.*`-Modulen zuerst. | An EINEM Tag sechs Mechaniken, die fertig, getestet und einstellbar waren — und niemand fragte sie |

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

## Scoring-Kurzreferenz

`scoreResult` wertet Ebenen (exakt > abstand > tendenz > keiner), `max()` der
Teile: Sieger-Boden, Abstand, Ergebnis-Nähe (`exp(-k·dist) × Exakt-Quote`),
siegerunabhängige Team-Tore-Nähe. `scoreGoals`: gleicher Spieler 2× =
Doppelpack, 1 Tor = anytime-Floor. `applyCombo`: Tor-Gewinne × Kombi-Faktor
der erreichten Ebene. `toDisplay`: roh × `displayScale` (Anzeige, nie Fairness).
`sanitizeRules` macht aus einem (evtl. importierten) Teil-Regelwerk ein gültiges
— Zahlen auf `RULE_LIMITS` beschnitten; `RULE_LIMITS` speist auch die UI-Regler.

**Joker/Gewichtung** (`rules.joker`, Standard aus): skaliert die FERTIGE Wertung
eines Spiels — `jokerFactor` greift in `scoreTip` ganz zuletzt, nach Kombi und
Favoriten-Malus, damit sich nichts multiplikativ aufschaukelt. Deckt dadurch
Ergebnis UND Torschützen mit einem Regler ab. Zwei Modi: `einzel` (ein Spiel
pro Spieltag, `tip.joker === true` → `faktor`) und `ranking` (jedes Spiel trägt
ein `tip.gewicht` aus dem Pool `faktoren`; jeder Pool-Wert nur EINMAL pro
Spieltag — sonst setzt jeder überall das Maximum). Wirkt symmetrisch, also auch
auf ein Minus. Prüfregeln: `invalidJokerMatchdays` / `invalidWeightMatchdays`
— das **Einfrieren ab Anpfiff** ist Sache von Store/UI, wie beim Quoten-Snapshot.
`maxTotalModifier` speist Vorschau und `recommendedDisplayScale` (in
`rulePreview.js`): empfiehlt eine Anzeige-Skalierung, die den höchsten
Modifikator einrechnet — reine Anzeige, nie Fairness.

**Drei Modifikator-Ebenen, additiv gedeckelt** (wichtig, nicht brechen): Joker
(pro Nutzer), Team-/Derby (`rules.teamMods`, pro Begegnung, für ALLE gleich),
Joker-Abstimmung (`voting.js`, pro Spieltag). `totalModifier` fasst Joker +
Team-Mods **additiv** zusammen (1 + Σ Aufschläge) und deckelt bei `rules.modCap`
— multiplikativ würde es die Balance sprengen. Derby wird an `snap.derby`
erkannt; das Label setzt die Daten-Schicht (`DERBYS`/`findDerby` in
`bundesligaData.js`), die Engine kennt keine Vereinsnamen (Regel 3).

**Aufhol-Mechanismus** (`src/lib/catchup.js`, `rules.aufholen`, Standard aus):
Anschluss-Bonus für Zurückliegende. Greift NICHT in `scoreTip`, sondern im
Verlauf — der Bonus hängt am Stand VOR dem Spieltag. `applyCatchup` ist in
`scoreLeaderboardHistory` eingehängt; `getLeaderboard` nimmt bei aktivem Bonus
den Verlaufs-Endstand. Nur ein ANTEIL des Rückstands (Aufholen ≠ Überholen),
erst ab einer Schwelle, drei Stufen (`STAERKE_STUFEN`).

**Balance-Simulator** (`src/lib/balanceSim.js`): Monte-Carlo mit realistischer
Tipper-Population (Favorit/Solide/Kenner/Mutig/Zocker), Ergebnisse AUS DEN
QUOTEN gezogen. Jeder Tipper hat einen VEREIN (ein Spiel je Spieltag) und
tippt ihn zu optimistisch (`FAN_OPTIMISMUS`) — ohne diese Fan-Brille würde der
Heimat-Joker systematisch zu gut bewertet, weil er nur die Gewinne verstärkte
statt auch die voreingenommenen Fehltipps. Favoriten-Tipper und Zocker sind
davon ausgenommen: sie sind Messinstrumente, keine Menschen. Zielbild: der KENNER gewinnt. Kennzahlen: `punkteVerhaeltnis`,
`modifikatorAnteil`, `aufholFlipQuote` → `bewerten()` macht daraus die
grün/gelb/rot-Ampel (`BalanceAmpel.jsx` in der Spielerstellung). Die Presets
sind darauf ausbalanciert; `presets.balance.test.js` sichert es ab — bei
Regelwerk-Änderungen dort prüfen.

**Versäumnis** (`rules.versaeumnis`, `src/lib/autoTip.js`, Standard aus): wer
einen Spieltag vergisst, bekommt einen Ersatz-Tipp statt null Punkte. Der ADMIN
wählt Strategie (`wahrscheinlich` | `schnitt` der Mitspieler-Tipps | `zufall`
aus den plausiblen, geseedet reproduzierbar), `malusProzent` und `maxProSaison`.
Der Ersatz-Tipp ist bewusst der zahmste — durch Tests abgesichert, dass er nie
mehr zahlt als ein mutiger eigener Treffer. `autoTip.js` definiert die Regel
NICHT selbst, sondern liest sie aus dem Regelwerk (eine Quelle).

**Nahe Ergebnisse** (`src/lib/nearResults.js`): „was zahlt mein Tipp, wenn es
knapp anders ausgeht" — gleicher Abstand / ein Tor mehr oder weniger. Speist die
Nachbar-Tabelle beim Tippen und die Punkte-Chips in der Spielwahl (dort die
WAHRSCHEINLICHSTEN Endstände, nicht die bestbezahlten — die sind alle 5:5 und
laufen in den Deckel). Liest nur `scoreTip`, Anker bleibt das reale Ergebnis.

**Preset-Mischen** (`src/lib/presetMerge.js`): zwei Regelwerke über sieben
benannte ASPEKTE kombinieren statt über Einzelregler — zusammengehörige Werte
wandern gemeinsam, damit keine unvermessene Balance entsteht. Ein Test prüft,
dass die Aspekte ALLE Regel-Felder abdecken; wächst das Regelwerk, schlägt er an.

**Spott** (`src/lib/taunts.js`, Screen `/spott`): Spruch + Reaktions-Clip an
einen Mitspieler — bewusst OHNE eigene Tabelle, Versand über die Teilen-Funktion
des Geräts. Spam-Bremse: einer je Ziel und Spieltag.

**Benachrichtigungen** (`src/lib/notify.js`, Screen `/benachrichtigungen`): nur
zwei Anlässe (neuer Spieltag tippbar, ungetipptes Spiel beginnt in X h), mehrere
Vorwarnstufen, Nachtruhe, Tagesobergrenze. `dueNotifications()` entscheidet nur,
WAS fällig wäre — der Versandkanal (Web-Push/App) hängt sich später daran und
ist damit austauschbar wie die Quoten-Quelle. Standard aus.

**Saison-Wetten** (`rules.saison`, `src/lib/saisonwetten.js`, Standard aus): die
nebenbei laufende Langzeit-Ebene (Meister, Torschützenkönig, wenigste Gegentore,
meiste Unentschieden …). Drei Entwurfs-Entscheidungen: (1) **keine Quoten** — der
Admin vergibt Punkte je Wette, ein `gewicht` skaliert die ganze Ebene gegenüber
den Spieltagen; (2) **konstruierbar** — jede Wette ist TYP + Parameter, mit
`ausser: [Verein]` wird aus „Torschützenkönig" die Variante „bester Schütze außer
Bayern" (eigene `wettenId`, also eine eigene Wette); (3) **jede Wette deklariert
ihre Daten** (`braucht`) — Karten/Fouls sind vorbereitet, aber als NICHT
auswertbar markiert, weil unsere Ergebnisse nur Tore + Torschützen tragen.
Jede Wette kann ein FREISCHALT-FENSTER tragen (`abSpieltag`/`bisSpieltag`,
optional `wettbewerb`): „Wer gewinnt die CL?" vor dem 1. Spieltag ist Raten.
Immer ein Fenster, nie nur ein Startpunkt — sonst wüsste, wer später tippt,
mehr bei gleicher Punktzahl. Der Stand kommt aus `aktuellerSpieltag()` je
Wettbewerb; unbekannter Stand hält die Wette ZU.
`sanitizeRules` delegiert an `sanitizeSaison`, damit der Katalog die eine Quelle
bleibt — dadurch landen Saison-Wetten automatisch in den Creator-Codes.
Ins **Leaderboard** kommen sie über `src/lib/saisonBoard.js` — EINE Quelle für
beide Stores (vorher lag die Funktion zweimal da und war schon auseinander-
gelaufen). Zwei Regeln stecken drin: (1) im Board steht, wer ETWAS abgegeben hat
— Match-Tipp ODER Saison-Wette; das Board wird aus Match-Tipps gebaut, ein
reiner Saison-Tipper fehlte sonst ganz (ein Mitglied ohne jeden Tipp bleibt
draußen, es gibt nichts zu ranken). (2) Ergänzt wird NACH dem Verlauf, sonst
bekäme ein reiner Saison-Tipper Anschluss-Boni für Spieltage, die er nie
mitgespielt hat. Anzeige: `tips === 0` → „nur Saison" statt „0/0".
**Saisonstart** (= Sperre der fensterlosen Wetten) zählt nur Anpfiffe in ECHTEN
Wettbewerben (`istEchterWettbewerb` in `wettbewerbe.js`): das Demo-Länderspiel
liegt in der Vergangenheit und steckt in jedem Match-Katalog, auch im Seed der
Live-DB — es fror sonst ALLE Saison-Wetten von Anfang an ein.

**Tipp-Fenster** (`src/lib/tippfenster.js`, `rules.tippfenster`, Standard 1
Woche): wann ein Spiel überhaupt tippbar ist. Öffnet `vorlaufStunden` vor
Anpfiff (Admin-Sache — echte Quoten gibt es erst wenige Tage vorher), schließt
beim Anpfiff (dieselbe Kante wie der eingefrorene Snapshot). `tippStatus` ist
DREIwertig (`zu`/`offen`/`vorbei`) — „noch nicht" und „vorbei" sind für den
Spieler zwei verschiedene Nachrichten. Ohne verwertbaren Anpfiff gilt ZU.
Die Spielwahl zeigt nur Anstehendes (sonst 465 Spiele), nennt aber immer die
Zahlen der ausgeblendeten; ist gerade nichts offen, zeigt sie die nächsten
gedimmt statt einer leeren Fläche.

**Zeitachse** (`src/lib/zeitachse.js`, `rules.zeitachse`): was „Spieltag 5" in
einer Runde über MEHRERE Ligen heißt. Die Ligen starten versetzt und zählen
jede für sich — gemeint ist aber der Spieltag DER RUNDE, sobald etwas rundenweit
passiert (Joker, Anschluss-Bonus, Zwischenstand). Ein TAKTGEBER (Standard: die
früheste Liga) gibt den Rhythmus vor, alles bis zum nächsten Ankerpunkt gehört
dazu; Alternative ist ein fester Wochen-Modus. Reine Struktur und Anzeige,
**keine Wertung** — `scoreTip` ist unberührt, der Balance-Simulator sieht die
Achse nicht — mit EINER Ausnahme: `rundenSchluessel(achse)` ist der Ersatz für
`spieltagKey` überall dort, wo „einmal pro Spieltag" gemeint ist (Joker,
Ranglisten-Pool). `invalidJokerMatchdays`, `invalidWeightMatchdays` und
`weightUsageForMatchday` nehmen ihn als letzten, optionalen Parameter; ohne ihn
bleibt es beim Liga-Spieltag, es gibt also keinen stillen Regelwechsel. Über
den Liga-Spieltag geschlüsselt bekäme ein Tipper in einer Runde mit fünf
Wettbewerben fünf Joker pro Woche statt einem. Bei nur einem Wettbewerb sind
beide Schlüssel deckungsgleich. 🔴 **Und der Fehler, der genau das kaputt gemacht hat (gefunden 05.08.2026):**
der automatische Taktgeber ist die Liga, die ZUERST anfängt — im Katalog war
das die MLS mit drei Spieltagen (aus dem Quotenabruf). Hinter ihrem letzten
Ankerpunkt lief der Rhythmus nicht weiter, und die restlichen acht Monate über
fünf Wettbewerbe fielen in EINEN Runden-Spieltag; die ganze Achse hatte drei
Einträge. Ein Tipper hätte drei Joker pro Saison bekommen statt achtunddreißig.
`mitPausen` füllt jetzt auch den SCHWANZ hinter dem letzten Ankerpunkt auf
(bis zum letzten Spiel des Katalogs). Gegenprobe: 42 statt 3 Einträge, Median
39 Spiele je Runden-Spieltag — genau die Zahl, die weiter unten als normale
Woche über vier Ligen steht. **Wer am Taktgeber etwas ändert, misst die
Achsenlänge nach; ein grüner Test sieht diesen Fehler nicht.**

Fünf Punkte, die nicht brechen dürfen: (1) zugeordnet wird immer
ein GANZER Liga-Spieltag (`spieltagKey`), dorthin wo sein erstes Spiel liegt —
ein BL-Spieltag läuft Fr–So und läge sonst links und rechts eines Ankerpunkts;
ein halber Spieltag ist der Punkt, an dem aus einer Anzeige- eine Fairness-Frage
wird. (2) `rundenSpieltagVon` schlägt in der fertigen Achse NACH und rechnet
nicht neu — sonst zwei Wahrheiten. (3) Spiele VOR dem ersten Ankerpunkt fallen
in Runden-Spieltag 1 statt zu verschwinden. (4) Die Überfüllungs-Warnung misst
RELATIV zum üblichen Spieltag (Median), nie an einer festen Zahl: über vier
Ligen sind 39 Spiele eine normale Woche, mit CL 57 — eine feste Schwelle meldet
den Normalfall. Ihre Ursache liest sie am Zeitfenster ab (lange Fenster = Pause
im Taktgeber, normale = mehrere Wettbewerbe fallen zusammen).

**Spielauswahl** (`src/lib/spielauswahl.js`, `rules.spiele`, Standard „alle"):
welche Spiele überhaupt zur Runde gehören — Vereine, Spieltag-Bereich, feste
Liste — dazu `wettbewerbe`/`phasen` für „nur das Interessanteste" (CL ab
Achtelfinale = 15 statt 466 Spiele). Alle Dimensionen wirken UND-verknüpft;
für eine gemischte Wunschliste ist der Modus `liste` da.
Liegt im REGELWERK und reist dadurch im Creator-Code mit (ein Creator
teilt seine ganze Runden-Idee, nicht nur die Wertung). Zwei Wahrheiten
vermeiden: `rules.spiele` schlägt vor, `rounds.team_filter` hält fest, was beim
Anlegen daraus wurde — die Runde gewinnt. Ein Modus ohne seine Daten fällt auf
„alle" zurück, sonst filterte die Auswahl still alles weg.

**Big Game** (`src/lib/bigGame.js`, `rules.bigGame`, Standard aus): das je
Spieltag DYNAMISCH bestimmte Topspiel — ein Derby steht vorher fest, „Erster
gegen Zweiter am 31. Spieltag" nicht. Zwei Punkte nicht brechen: (1) der
Zeitpunkt ist ein FAKTOR, kein Signal — innerhalb eines Spieltags für alle
Spiele gleich, entscheidet also nur, OB es ein Big Game gibt, nie WELCHES;
(2) die Tabellenzone (oben Titel, unten Abstieg, Mitte nichts) wiegt schwerer
als die Ausgeglichenheit der Quoten, sonst gewinnt immer das belanglose
9.-gegen-10. Der Aufschlag fällt in DENSELBEN additiven Topf wie Derby
(`teamModFactor`), ist also kein neuer Multiplikator.
**Eingefroren wird der WERT, nicht das Urteil:** `matches` ist global, dieselbe
Begegnung gehört zu vielen Runden. Ein Häkchen „das ist das Big Game" hieße,
dass die zuerst öffnende Runde für alle mitentscheidet. `spieltagOeffnen` legt
deshalb nur `snap.bigGameWert` ab (objektiv, aus dem Tabellenstand beim
Öffnen); ob das als Big Game zählt, entscheidet jede Runde beim Auswerten mit
ihrer eigenen `minSpannung`. Eingefroren ist es trotzdem — die Fairness-Regel
gilt weiter.
**Anzeige** (Spielwahl, Tippabgabe, `breakdown.js`): nie am Snapshot ablesen,
immer über `bigGameAufschlag(snap, rules)` — derselbe Wert liegt in einer
anderen Runde evtl. unter der Schwelle. Dazu immer `snap.bigGameGrund` zeigen
(beim Öffnen mit eingefroren): ein Aufschlag ohne Begründung sieht nach Willkür
aus. In der Aufschlüsselung stehen Team/Derby, Big Game und Wettbewerbs-Gewicht
als DREI Zeilen, obwohl sie in einem Topf landen — sonst sucht der Spieler ein
Derby, das es nicht gibt.
**Ausgelöst wird das Öffnen vom ADMIN** (Knopf in der Spielwahl, solange nichts
angepfiffen ist; die Server-Route prüft es erneut). Bewusst keine Automatik: der
Wert hängt am Tabellenstand im Moment des Öffnens — wer den Moment wählt, wählt
mit. Im Mock zählen dafür nur Spiele, deren Anpfiff vorbei ist: die simulierte
Saison trägt alle Ergebnisse vorab, sonst wäre die Tabelle am 1. Spieltag die
Endtabelle (live ist `result` bis zum Anpfiff NULL).

**Wettbewerbs-Gewichte** (`src/lib/wettbewerbGewicht.js`, `rules.wettbewerbe`,
Standard aus): ein CL-Halbfinale zählt mehr als ein Ligaspiel. Der Aufschlag
fällt in DENSELBEN additiven Topf wie Derby und Big Game — kein vierter
Multiplikator. K.-o.-Runden über EINE Stufe mal `PHASE[...].rang`, nicht vier
Regler. Wichtigster Punkt für die UI: **Gewicht pro Spiel ≠ Anteil an der
Wertung** (306 BL- gegen 144 CL-Spiele) — `anteile()` rechnet den
resultierenden Anteil, `anteilHinweis()` benennt die Falle.

**Ereignisse** (`src/lib/ereignisse.js`, `rules.ereignisse`, Standard aus): der
ZWEITE Joker-Topf — Joker, die man sich verdient, statt sie zugeteilt zu
bekommen. Belohnung ist immer eine Joker-Gutschrift, nie ein neuer Punkte-Kanal,
damit `modCap` weiter greift; dazu ein eigener Deckel (`maxErspielt`), sonst
gewänne die Runde, wer die Nebenaufgaben am besten erledigt — eine zweite
Leistungsachse und damit ein Fairness-Bruch. Gedeckelt wird chronologisch.
Jeder Typ deklariert seine Daten (`braucht`) wie bei den Saison-Wetten;
Herausforderungen sind vorbereitet, aber nicht auswertbar und lassen sich
deshalb gar nicht aktivieren. `konflikte()` meldet Trost-Joker + Anschluss-Bonus
als Doppelbelohnung.

**Joker-Verteilung** (`src/lib/jokerPlan.js`, `rules.joker.verteilung`, Standard
`frei`): WANN es überhaupt einen Joker gibt. Der Admin stellt eine FREQUENZ ein
(„etwa jeder 4. Spieltag"), verteilt wird deterministisch aus der Runden-Id —
dadurch sehen alle dasselbe, es ist nachprüfbar, und der Creator-Code bleibt
kurz (gespeichert wird die REGEL, nicht die ausgerollte Liste). Verteilt wird
BLOCKWEISE (je Block genau einer), sonst bündelt reiner Zufall vier Joker in
fünf Spieltagen. Modus `kontingent` gibt jedem gleich VIELE Joker an
verschiedenen Spieltagen — deshalb liefert `fortschritt()` immer „3 von 8" und
nie eine nackte Zahl: ein ungleicher Zwischenstand ist systembedingt und sähe
sonst nach Bevorzugung aus. Empfehlung: Reihenfolge verdeckt, Kontingent offen.
`sanitizeRules` delegiert an `sanitizeVerteilung`.

**Leitplanken der Profi-Stufe** (`src/lib/reglerWarnung.js`): `RULE_LIMITS` ist
die Grenze des ERLAUBTEN, das Empfehlungsband die des ERPROBTEN. **Eine Messung
verengt NIE die harte Grenze** — sonst wird aus jeder Messung ein Verbot; sie
landet als Band (`gemessen` am Feld, wenn kein Preset den Wert belegt) plus
Beispielrechnung im Warntext. Das Band wird
aus den PRESETS abgeleitet (was `presets.balance.test.js` durchmisst, gilt als
erprobt) — ändern sich die Presets, wandert es mit. Dazu handgeschriebene
KOMBINATIONS-Regeln für das, was in keinem Einzelwert steckt (kein Abzug + kein
Cutoff = Gratis-Lose). Jede Meldung kennt ihre Korrektur; Tests sichern, dass
kein Preset und kein Charakter eine Warnung auslöst.

**Echte Spielpläne** (`src/lib/spielplan.js`, `scripts/import-spielplan.mjs`,
`src/lib/spielplaene/`): der Launch-Blocker. `npm run import:spielplan -- bl`
holt die echten Bundesliga-Termine von OpenLigaDB (frei, ohne Schlüssel) und
legt sie als JS-Modul mit Herkunfts-Kopf ab; `baueLiga` übernimmt sie
UNVERÄNDERT statt die Circle-Methode zu benutzen. Fehlt die Datei, fällt die
Liga auf die erzeugte Saison zurück. Vier Punkte: (1) `pruefeSpielplan` trennt
FEHLER (unbekannter Klubname, Verein doppelt am Spieltag, unlesbarer Anpfiff →
harter Abbruch) von WARNUNGEN (unvollständig, überlappende Spieltage → nur
melden); ein Import, der still eine halbe Saison baut, fällt erst auf, wenn
jemand auf ein Spiel tippt, das es nicht gibt. (2) Echt ist NUR der Kalender —
Quoten, Ergebnisse und Torschützen bleiben erzeugt. (3) Die Herkunft wird
abgelesen (`herkunftLabel` über `echteSpielplaene()` aus `ligen.js`), nie
behauptet: der Katalog ist gemischt, solange die CL-Auslosung aussteht, und der
Store reicht kein `echterSpielplan` durch — deshalb zählt das Label über den
WETTBEWERB. (4) `spielplaene/index.js` ist erzeugt und löst eine Henne-Ei-Kette:
der Importer braucht die Klublisten aus den Ligadateien, die deshalb keine
Plan-Datei direkt importieren dürfen. Nach einem Import `npm run seed:matches`.

**Marge ist nicht gleich Marge** (`longshotK`, `fitLambdasMitTotal`,
`torschnittAusTotals` in `oddsApi.js`): drei Messungen, die zusammengehören.
(1) **Die Schiefe der Marge zählt, nicht nur ihre Höhe.** Das
`correct_score`-Buch trägt 65 % Overround, und die liegt auf den Außenseitern.
Wer stumpf durch die Summe teilt, hält diese Schieflage für eine
Wahrscheinlichkeitsverteilung — gemessen 2,4–5,7 pp daneben, und in Preisen
11–30 % zu viel für die WAHRSCHEINLICHEN Ergebnisse, also für die, die
eintreten. Geeicht wird mit dem Potenz-Verfahren am 1X2-Markt **desselben
Spiels** (7,7 % Marge), nie an einem Liga-Mittel. (2) **Der Torschnitt ist eine
Vorgabe, keine Nebenwirkung.** Rangfolge: echte Über/Unter-Linie >
Ergebnis-Buch > Schätzung (`snapshot.torschnittQuelle`). (3) **Dadurch ist ρ
gemessen:** bei vorgegebenem Torschnitt ist es die einzige Größe, die übrig
bleibt, wenn 1X2 und Torschnitt gleichzeitig stimmen sollen — gemessen −0,013
bis −0,158, am stärksten in ausgeglichenen Spielen, wo die
Unabhängigkeits-Annahme zu wenig Remis liefert. Die Konstante `RHO` bleibt 0
und gilt nur noch für den ungebundenen Fall. Fit und Raster benutzen weiterhin
DASSELBE ρ — sonst gäbe das Raster die Quoten nicht mehr her, aus denen es
geschätzt wurde.
⚠️ **Wer hier etwas ändert, prüft beides zusammen:** `margin`/`teamGoals`
kommen aus dem Fit, `correctScore` aus dem Markt. Laufen die Torschnitte
auseinander, trägt dasselbe Spiel zwei Tor-Erwartungen — das lag eine Weile
still so da. Ein Test hält es jetzt fest.

**Echte Quoten** (`oddsApi.js`, `/api/odds`, `klubnamen.js`,
`scripts/fetch-odds.mjs`): Adapter und Route stehen, der Schlüssel liegt in
`.env.local` (nie im Repo, nie mit `NEXT_PUBLIC_`). Zwei Kommandos:
**`npm run odds:pruefen` ist KOSTENLOS** (nutzt den `/events`-Endpunkt und
gleicht nur Klubnamen ab), **`npm run odds:holen` kostet 2 Credits JE LIGA**
(1X2 + Über/Unter; der Anbieter rechnet Märkte × Regionen, ein zweiter Markt
kostet also für die ganze Liga einen Credit — `correct_score` dagegen einen JE
SPIEL) und legt das Ergebnis als `src/lib/quoten/<key>.js` ab. Der Gratis-Tarif hat 500
Anfragen im MONAT, und der Zwischenspeicher der Route liegt im
Arbeitsspeicher — jeder Dev-Server-Neustart holt sonst neu, damit ist das
Kontingent in einer Woche weg. Deshalb: einmal holen, als Datei ablegen,
beliebig oft abspielen. `klubnamen.js` übersetzt „Bayern Munich" →
„FC Bayern München"; **explizite Liste, kein Fuzzy-Match** — „Real Madrid" und
„Real Sociedad" liegen näher beieinander als manche Schreibvariante desselben
Vereins, und ein falsch geratener Klub hängt die Quoten still ans falsche Spiel.
Unbekannte Namen kommen unverändert zurück und fallen dadurch auf.

**Kader ohne Kaderquelle** (`src/lib/kader.js`, erzeugt: `src/lib/kader/<liga>.js`):
Die echten Torschützen-Quoten nennen **keinen Verein** — nur
`{ description: "Talles Magno", price: 2.15 }`, rund 21 Namen je Spiel. Unser
Tippmodell braucht die Trennung. Gelöst OHNE externe Kaderliste, weil eine
solche gepflegt werden müsste (Transfers, Leihen, Sperren) und nach jedem
Fenster falsch wäre: **die Quoten SIND der Kader** — ein Buchmacher bepreist
keinen Verletzten. Der Verein steckt in der SCHNITTMENGE über mehrere Spiele
(kommt jemand in NYC–TOR und NYC–MTL vor, spielt er für NYC). Vier Punkte:
(1) zwei Spiele desselben Klubs mit VERSCHIEDENEN Gegnern lösen auf — zweimal
derselbe Gegner nicht; (2) wer noch offen ist, wird NICHT angeboten (ein
Spieler bei der falschen Mannschaft fiele erst bei der Abrechnung auf, und dann
hat jemand auf ihn getippt); (3) bei einem Widerspruch (Transfer) gewinnt die
NEUERE Beobachtung, sonst bliebe er für immer unauflösbar; (4) der Abruf
SAMMELT über Läufe (`--schuetzen`), weil ein einzelner Lauf jeden Verein meist
nur einmal zeigt — gemessen: 15 MLS-Spiele = 30 Klub-Auftritte bei 30 Vereinen,
also null Schnittmengen. Erst die nächste Spielrunde löst auf.

Eingesetzt werden die echten Schützen von `spielerAusMarkt` (`oddsApi.js`) in
`snapshot.players`; `snapshot.spielerQuelle` sagt `markt` oder `erfunden`. Die
ANYTIME-Quote ist dabei EXAKT die des Marktes — die Marge wird heraus- und
unverändert wieder aufgerechnet, die Annahme über ihre Höhe trifft also nur den
DOPPELPACK (den Markt „2+ Tore" gibt es nicht, geprüft). Hat eine Mannschaft
weniger als zwei zugeordnete Schützen, bleibt der GANZE erfundene Kader stehen:
eine halb echte Liste wäre auf einer Seite eine leere Fläche.

**Torschützen-Modus** (`rules.markets.goals.modus`): `proTeam` (Vorgabe, je
Mannschaft `picksPerTeam`) oder `proSpiel` (`picksProSpiel` Namen aus einem
Topf). Der zweite Modus ist nicht nur Geschmack — er kommt OHNE Vereins-
zuordnung aus und ist damit auch dann spielbar, wenn der Kader noch offen ist.
Die Tipp-Form bleibt in beiden Fällen `{ home, away }`, damit ein Moduswechsel
mitten in der Saison abgegebene Tipps nicht entwertet.

**Liga-Daten** (`ligaGenerator.js` + `ligen.js`): fünf Wettbewerbe im EINEN
Match-Katalog — Bundesliga 306 · Premier League 380 · La Liga 380 · Serie A 380
· Champions League 159 = 1605 Spiele (Aufbau ~50 ms, reine Funktionen, gecacht).
**Der Bundesliga-Spielplan ist seit 28.07.2026 ECHT** (siehe oben), die übrigen
vier Wettbewerbe sind weiter erzeugt.
**Nach einem `odds:holen` reicht `npm run seed:delta`**: es schreibt NUR die
Spiele mit echten Marktquoten (aktuell 70, ~98 KB) statt aller 1636 in fünf
Dateien mit 1,8 MB — ein Einfügen im SQL-Editor statt fünf. ⚠️ Die erzeugte
`supabase/_quoten-update.sql` ist eine **Wegwerf-Datei** und steht in
`.gitignore`: nach dem nächsten Abruf ist sie veraltet, und wer sie dann noch
einmal ausführt, schreibt alte Quoten über neue — ohne Fehlermeldung. Erzeugen,
ausführen, löschen. `npm run seed:matches` bleibt der Weg, wenn sich Klubs,
Spielpläne oder der Katalog selbst geändert haben.

`ligaGenerator.js` baut eine Saison aus Ratings + Anstoß-Slots (Circle-Methode);
die vier Ligadateien liefern nur Daten. **`ligen.js` ist die EINE Liste** —
Mock-Store, Seed-Skript und Vereinsfilter lesen daraus, sonst läuft die
Aufzählung an vier Stellen auseinander. Was echt ist: Klubs und übliche
Anstoßzeiten (je Liga in ORTSZEIT, `utcOffset`; dadurch schieben sich die Ligen
zeitlich ineinander statt übereinanderzuliegen). Was simuliert ist: Spielplan,
Quoten, Ergebnisse, Torschützen — **auch die Spielernamen sind erfunden**
(landestypische `NAMENSPOOLS`), weil echte Kader nach jedem Transferfenster
falsch wären und simulierte Daten nicht wie echte aussehen dürfen. Stärken
eines Klubs sind über Liga und CL abgestimmt. Beim Ändern einer Ligadatei
`npm run seed:matches` neu laufen lassen; das Skript schreibt zusätzlich eine
Datei JE WETTBEWERB, weil die Gesamtdatei (1,9 MB) den Supabase-SQL-Editor
überfordern kann.

**Weitere Module:** `premium.js` (Berechtigung; nur Admin braucht Premium,
`applyEntitlements` neutralisiert Premium-Regeln ohne Löschen), `records.js`
(Rekorde/Auszeichnungen aus dem Verlauf), `avatars.js` (Profil), `theme.js`
(zentrale Design-Ebene — Farben/Schrift; Account 1s Fanfarben bauen darauf).

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
