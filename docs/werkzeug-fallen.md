# Werkzeug-Fallen auf diesem Rechner

**Ausgelagert aus `CLAUDE.md` am 21.08.2026.** 128 Zeilen, die beim Arbeiten nachgeschlagen werden — nicht bei jeder Antwort.

🔴 **Inhaltlich unverändert** — es ist keine Zeile gestrichen, nur verschoben.
Wer hier etwas ändert, ändert eine verbindliche Regel; die Kürzung war eine
Frage des ORTES, nicht der Gültigkeit.

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

## 📱 Capacitor / Android (seit 26.08.2026)

- **Nach einem frischen `git clone` bricht der Gradle-Sync ab** mit
  „project ':capacitor-cordova-android-plugins' not found". Das Repo ist NICHT
  kaputt: der Ordner ist Build-Ausgabe und steht in Capacitors `.gitignore`.
  **Behebung:** `npm run app:sync`. Dasselbe gilt für
  `android/app/src/main/assets/public` und die dortige `capacitor.config.json`.
- **`npm run build:app` verschiebt `src/app/api` für die Dauer des Builds.**
  Bricht jemand hart ab (Fenster zu, Strom weg), liegt `.api-waehrend-app-build`
  noch da — das Skript weigert sich dann beim nächsten Lauf und sagt, wie es
  zurückgeschoben wird. **Nicht von Hand löschen**, sonst sind die vier
  API-Routen weg.
- **Ein App-Build ohne `NEXT_PUBLIC_API_BASIS` sieht völlig normal aus** und
  scheitert erst später an Konto-Löschen und Spieltag-Öffnen — mit einem
  blanken Netzwerkfehler. Das Skript warnt am ENDE des Builds; die Warnung
  steht dort, damit sie nicht weggescrollt ist.
- **Die App-ID `de.quotentippspiel.app` ist nach dem ersten Play-Store-Upload
  unveränderlich.** Eine andere ID ist dort eine andere App — mit null
  Installationen und null Bewertungen.

## ⌨️ Shell & Commit-Nachrichten (27.08.2026)

- 🔴 **Backticks in einer Commit-Nachricht verschwinden**, wenn die Nachricht
  über `git commit -m "…"` in doppelten Anführungszeichen steht: die Shell hält
  `` `listMatches()` `` für einen Befehl, führt ihn aus und setzt das (leere)
  Ergebnis ein. In der Nachricht steht dann ein Loch — „weil ␣␣ alle Spalten
  holt". **Passiert genau dort, wo man Code benennt, also ständig.**
  **Behebung:** Nachricht immer über ein Heredoc geben:
  `git commit -F - <<'EOF'` … `EOF`. Die Anführungszeichen um `EOF` sind der
  Punkt — ohne sie expandiert die Shell trotzdem.
  ⚠️ Aufgefallen erst NACH dem Push. Eine gepushte Nachricht nachträglich zu
  korrigieren hieße `--force` auf `main`, und dort arbeitet die andere Session
  mit. Eine schiefe Nachricht ist billiger als umgeschriebene Historie.
- ⚠️ **Deutsche Anführungszeichen in JS-Strings** sind die häufigste
  Ursache für „invalid JS syntax" in diesem Projekt — `„Text"` schließt den
  String, weil das schließende Zeichen ein normales `"` ist. In Kommentaren
  harmlos, in einem `it("…")`-Titel tödlich. **Im Zweifel `»…«` oder das
  schließende `"` mitschreiben.**
