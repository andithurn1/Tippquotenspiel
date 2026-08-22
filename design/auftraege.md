# Auftragsbuch — jede Ansage von Andi, mit Stand

**Angelegt 20.08.2026.** Anlass, wörtlich: *„habe bislang immer text gegeben und
es wurde die hälfte ignoriert, es ist echt schwach was du rausliest teilweise.“*

**Er hat recht, und es ist messbar** — die Belege stehen in der Tabelle.

## Die Regel an dieser Datei

🔴 **Sagt Andi in einer Nachricht fünf Dinge, kommen fünf Zeilen hierher** —
nicht die eine, die gerade in die Arbeit passt. Eine Zeile verschwindet nie;
sie ändert nur ihren Stand.

Erlaubte Stände, und jeder verlangt einen Beleg:

| Zeichen | heißt | verlangt |
|---|---|---|
| ✅ | umgesetzt | Nachweis: Datei, Zeile oder Messung |
| 🔨 | angefangen | was fehlt noch |
| ⏳ | offen | — |
| ❓ | nicht verstanden | die Rückfrage, ausformuliert |
| ⛔ | bewusst nicht | die Begründung, die Andi gelesen hat |
| 👤 | liegt bei Andi | — |

⚠️ **Es gibt kein „erledigt, glaub mir“.** Ein ✅ ohne Beleg ist ein ⏳.

---

## Gestaltung — Andis sechs Ansagen (09.08.2026, noch alle offen)

| Nr | Ansage (seine Worte) | Stand | Beleg / was fehlt |
|---|---|---|---|
| G1 | „F7 (Akzent, bisher Gold) soll LILA sein“ | ✅ | `theme.js`: `akzent: "#9A6BE8"`. Ton auf dasselbe Helligkeitsprofil gemessen wie das alte Gold (dunkler Text darauf 5,14 statt 5,26) — deshalb ohne Lesbarkeits-Umbau in 58 Dateien. Im Browser geprüft: `rgb(154,107,232)` |
| G2 | „R2 (12 px) ist der bevorzugte Eckenradius“ | 🔨 | Token `--tqs-rund: 12px` liegt in `globals.css`. In den Screens **acht verschiedene Radien**, gezählt: 999 (127×), 12 (91×), 14 (58×), 10 (47×), 11 (23×), 18, 26 … |
| G3 | „durchwegs die apple schrift. typ und formatierung“ | ✅ | **Schrift:** `--tqs-schrift-familie` (`-apple-system` zuerst) auf `body`, Apples Glättung, Laufweite −0,16 px; 30 Kopien in Komponenten → 0. **Größen:** Andi wählte Weg A (echtes Apple-Maß) — 520 Stellen auf Apples Leiter gehoben, danach nur noch 11·12·13·15·16·17·20·22·28. Gemessen auf 375×812: kein Querlauf, kein Tippziel unter 40 px auf /erstellen, /tippen, /ranking |

Gilt **nur bis zu den Wettbewerben**. Ab dort kommt die Komplettüberarbeitung
später; die Sonderregeln je Wettbewerb sind ausdrücklich noch offen.

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| ST1 | ~~Nur noch ZWEI Anzeigeebenen~~ ⬆️ **überholt am 22.08.2026: nur noch EINE** | ⛔ | 1 Bedingung `anpassen`→`einfach` (die vier großen Fragen sitzen jetzt in Einfach — „wenige und nur die wichtigsten Regler“), 3× `!== einfach`→`=== profi`. Build, 2141 Tests, `stufen`, `anzeige`, `sicht` grün |
| ST2 | ~~Reihenfolge in beiden Ebenen gleich~~ ⬆️ **gegenstandslos — es gibt nur noch eine Ebene** | ⛔ | Im Browser gemessen: die Abschnittsfolge ist über **19 Abschnitte** identisch, danach hat Profi nur MEHR (167 statt 22). Auch die Überschrift springt nicht mehr |
| ST3 | Reihenfolge: **Variante → Anzeigeebene → Voreinstellungen** | ✅ | `VariantenWahl.jsx` steht als erste Frage über den Voreinstellungen, in BEIDEN Ansichten. Im Browser geprüft: Variantenfrage bei Zeichen 355, erste Voreinstellung bei 839. Umschalten und Zurückschalten getestet |
| ST4 | **Thermometer rechts neben den Voreinstellungen** | 🔨 | `BalanceAmpel` ist gebaut, hängt aber in `Spielerstellung.jsx:849` **innerhalb** von `stufe !== "einfach"` — in der einfachen Ansicht also unsichtbar, genau dort, wo Andi sie haben will |
| ST5 | **Kopfzeile: Bibliothek · Gamemode · GameCode einsetzen** | ⏳ | GameCode-Feld existiert, liegt aber nicht in einer Kopfzeile |
| ST6 | Texte fehlerfrei | ✅ | `design/entwuerfe/texte-teil1.md` — zwei Stellen inhaltlich angemerkt, nicht still geändert |
| ST7 | ~~Anzeige-Umschalter oben rechts~~ ⬆️ **fällt weg, sobald die Sondermenüs stehen** | ⛔ | `AnsichtSchalter.jsx`, in der klebenden Kopfzeile neben „Menü“. Gemessen bei 375×812: nach 900 px Scrollen weiterhin bei y=5, Tippziele 44 px, rechtsbündig |
| ST8 | **Hinweis im Text** auf den Umschalter | ✅ | steht dort, wo der Umschalter vorher saß |
| ST9 | Später **Pfeilanimation auf den Schalter**, als Teil eines kleinen Tutorials zur Spielerstellung | ⏳ | noch nichts gebaut. Hängt an B1/B3 (Bewegung) |

**Bestätigt (Andi, 20.08.2026):** „gleiche Reihenfolge“ heißt — *Profi zeigt
dieselben Abschnitte in derselben Folge, nur mit mehr Reglern in jedem
Abschnitt.* Kein Abschnitt existiert nur in einer Ansicht, keiner sitzt woanders.

🔴 **Belegter Verstoß, von Andi selbst gefunden:** *„irgendwie gibt man bei
Profi direkt am Anfang die Teams ein."* Stimmt — `Spielerstellung.jsx:579`
(„Wettbewerbe auswählen“) steht AUSSERHALB der Stufen-Bedingung, die
Voreinstellungen darüber aber nur in `stufe === "einfach"`. In der einfachen
Ansicht kommen also erst die Presets, dann die Wettbewerbe; in Profi stehen die
Wettbewerbe ganz oben. Genau der Sprung, den ST2 verbietet.


## Ebenen-Dokument (21.08.2026)

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| EB1 | „arbeite in nem separatem word mal sehr umfangreich aus, welche Parameter bei den jeweiligen Ebenen geändert werden sollen“ | ✅ | `design/entwuerfe/Ebenen-Parameter.docx` — **erzeugt** aus dem Regelwerk (`scripts/ebenen-dokument.mjs`), 38 Blöcke, 180 Parameter, jeder mit Vorgabe und mit der Quelle, die ihn in Einfach setzt |
| EB2 | „welche bei der einfachen Variante weggelassen werden“ | ✅ | ausgezählt: **128 von 180** werden von keiner Voreinstellung und keinem Regler angefasst. ⚠️ Momentaufnahme vom 21.08.2026 — seit EA1 gibt es keine einfache Variante mehr; die Frage lautet jetzt, wen ein Charakter oder ein einfacher Regler anfasst |
| EB3 | „bei Profi soll jede denkbare Kombination und Art wie bzw. für wann dies bestimmt wird anpassbar sein“ | ❓ | Als **vier Achsen** ausgearbeitet (WER · WANN · WIE · WOFÜR) samt dem, was es dafür schon gibt. ⚠️ Frei kombiniert sind das über 700 Entscheidungen — **die Entscheidung, ob alle Achsen für jeden Parameter offenstehen, fehlt und trägt alles Weitere** |

## Teil-Codes (21.08.2026)

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| TC1 | Teilbibliotheken: einzelne Bausteine als Code teilen | ✅ | `teilbibliothek.js`, Codes `TS2A-<aspekt>-…`, Oberfläche `Bausteine.jsx` (Profi) |
| TC2 | „einzeln kombinierbar bzw. in Reihe geschaltet“ auf eine gewählte Voreinstellung | ✅ | `wendeTeilCodeAn` ersetzt nur die Felder SEINES Aspekts, alles andere bleibt — mehrere nacheinander gehen also |
| TC3 | **Ein Code nur für Joker („Jokercode“)** | ⏳ | **Gibt es nicht.** Joker liegt im Aspekt „Joker & Team-Faktoren“ zusammen mit 11 weiteren Blöcken (u.a. ereignisse, wettbewerbe, budget, drehrad). 🔴 **Der Einwand dagegen war Balance — hinfällig seit 21.08.2026.** Damit reine Bauaufgabe |
| TC4 | **Ein Code nur für Ereignisse**, samt Auslosung am Rad | ⏳ | dito — `ereignisse` und `drehrad` liegen im selben Aspekt. Das Drehrad selbst ist gebaut (`/rad`) |
| TC5 | „Jokercode“ ins Vokabular | ✅ | `design/vokabular.md`, Abschnitt „Teil-Codes“ mit dem vollständigen Feld-Bündel |

## Modifikatoren (21.08.2026)

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| MOD1 | „mach hier ne Liste" sinnvoller Modifikatoren | ✅ | `design/modifikatoren-katalog.md` — nach DATENLAGE gegliedert: 15 gebaut, 17 sofort baubar, 3 mit eigenem Aufwand, der Rest braucht eine neue Datenquelle |
| MOD2 | „welche Parameter dazu jeweils einstellbar sein sollten" | ✅ | Teil B des Katalogs: je Modifikator eine Regler-Tabelle mit Typ, Vorgabe und Bedeutung, plus die drei Grundregler, die für alle gelten |
| MOD3 | **Underdog-Bonus nach Tabellenplatz / Punkteabstand** — „bitte umsetzen" | ✅ | `tabellenBonus.js` + `TabellenBonus.jsx` (Profi). 20 eigene Tests, alle Abnahmen ohne Befund. Tabelle aus eigenen Ergebnissen, beim Öffnen des Spieltags eingefroren |
| MOD4 | **Mehrere Tabellenzonen** — „auch Platz 14–18 und noch 1–4" | ✅ | `LigaSonderregeln.jsx`: beliebig viele Zonen, vier Vorlagen (Spitze 1–4, Europa 1–7, Mittelfeld 8–13, Abstieg 14–18), jede Zahl frei verstellbar. Das Datenmodell konnte es immer, nur die Anzeige schrieb `zonen[0]` |
| MOD5 | Ligen und Mannschaften einzeln höher gewichten | 🔨 | **War schon gebaut** (`wettbewerbe.aufschlaege`, `teamMods.teams`). ⏳ Offen bleibt Andis eigentlicher Punkt: sie liegen nicht bei den Sonderregeln je Wettbewerb |
| MOD6 | Auswahl der Modifikatoren für die EINFACHE Ansicht | ⏳ | ausdrücklich nach Profi geplant („dann im Nachhinein") |

## Aus Quotentippen.pptx (21.08.2026)

Gelesen mit `scripts/lies-pptx.mjs` — MIT Anordnung, weil bei Andis Folien die
Lage links/rechts vom Trennstrich die eigentliche Aussage trägt.

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| PP1 | **Bibliothek / Gamemode als eigenes Fenster** rechts vom Strich | ⏳ | Neu. Enthält laut Folie 1: Suche, Filter nach Relevanz und Beliebtheit, je Eintrag Kurzbeschreibung, **von wem**, Popularität und **Bewertung durch Admins mit Icons** |
| PP2 | **Bewertungssystem für Einstellungen** („Anforderung Bewertungsystem der Einstellungen“) | ⏳ | Neu, im Repo gibt es nichts davon. Berührt `teilbibliotheken.md` (Teil-Codes) — die Bibliothek wäre der Ort, an dem sie gefunden werden |
| PP3 | Wettbewerbe: **je Liga derselbe Aufbau** („Bundesliga selber Aufbau wie bei 2. Bundesliga“) | 🔨 | `LigaSonderregeln` gilt schon je Wettbewerb. Offen: dass die Liste aller Ligen sichtbar denselben Aufbau zeigt |
| PP4 | Innerhalb einer Liga: **„alle" und einzelne Vereine** (Beispiel „Fc Köln“) | ✅ | `SpielauswahlWettbewerbe` kann beides |
| PP5 | Folien 3–11 sind leer | 👤 | Andi füllt sie — dort steht der Rest des Aufbaus |

## Layout (21.08.2026)

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| LAY1 | Feinschliff des Folien-Layouts im **zweiten Schritt** — Beispiel: „Suche/Filter oben rechts neben Bibliothek Betippungsauswahl“ | ⏳ | Andi: erst Aufbau klären, dann Anordnung. Sein Urteil zum bisherigen Layout: „hattest du bislang ja nicht schlecht gemacht, nur halt so nen riesen Teil rausgelassen“ |
| LAY2 | `CLAUDE.md` kürzen — „soll nicht mehr als 180 Zeilen haben“ | ✅ | 1017 → 460 Zeilen. Ausgelagert nach `docs/`: Scoring-Kurzreferenz (361), Werkzeug-Fallen (127), Baukasten-Grundsatz und Schritt-für-Schritt-Regel (114). **Keine Regel gestrichen, nur verschoben** |

## Code-Felder je Teilebene (21.08.2026)

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| ATE1 | **Eigenes Code-Feld vor jeder Bibliothek**, nur für diesen Abschnitt | ✅ | `TeilCodeFeld.jsx`, eingehängt bei der Betippungsauswahl und bei Joker/Modifikatoren. Im Browser geprüft: zwei Felder, richtig beschriftet, mit „teilen“-Knopf |
| ATE6 | Ein fremder Teil-Code darf nicht still die falsche Ebene überschreiben | ✅ | `TeilCodeFeld` prüft die Ebene im Code und weist ab: „Dieser Code gehört zu X, nicht zu Y.“ Im Browser geprüft |
| ATE2 | Schichtung: erst Gesamt-Code, dann Teilebenen einzeln überschreiben | ✅ | Mechanik gebaut: `wendeTeilCodeAn` ersetzt nur die Felder SEINES Aspekts. Mehrere nacheinander ergeben genau diese Schichtung |
| ATE3 | Teil-Codes dürfen **von anderen Creatorn** stammen | ✅ | Ein Code trägt keine Herkunft — er wirkt unabhängig davon, wer ihn gebaut hat |
| ATE4 | In der Bibliothek die **beliebtesten Creator-Codes** auswählen | ⏳ | Braucht Beliebtheit und Urheber je Eintrag — hängt mit PP1/PP2 zusammen |
| ATE5 | Anzeigen, welcher Code zuletzt geladen wurde | ✅ | `geladeneCodes` je Ebene, Anzeige unter dem Feld. **Ein Gesamt-Code leert die Merkliste** — Andis Regel vom 21.08.2026, an beiden Ladewegen umgesetzt |

## Tipp-Oberfläche (21.08.2026)

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| TI1 | Ergebnis-Matrix mit **direkter Punktanzeige** je Feld | ⏳ | Die Matrix liegt als `snapshot.correctScore` vor, die Punkte je Feld sind rechenbar |
| TI2 | **Viele Stufen** für die Matrixgröße, bis 10 | ⏳ | Vorschlag in der Folie: automatisch · automatisch+ · 3 · 4 · 5 · 6 · 8 · 10 |
| TI3 | Je Spiel anpassen, beim klaren Außenseiter dessen hohe Ergebnisse weglassen | ⏳ | 🔴 **Gemessen:** die schwache Seite braucht über 5 Tore **0,00 %**, die starke aber **12,95 %** — die Matrix muss ASYMMETRISCH sein, nicht kleiner. Ein festes 0–5-Quadrat deckt beim extremen Favoriten nur 87 % ab, die automatische Anpassung 99 % mit 27 statt 36 Feldern |
| TI4 | Vorschau: welches nahe Ergebnis wie viel zahlt | 🔨 | `nearResults.js` rechnet es, die Anzeige als Liste fehlt |
| TI5 | Sichere gegen mögliche Punkte trennen | 🔨 | `projectTip` liefert beide (`pointsOhneSchuetzen`), gezeigt wird bisher nur eine |
| TI6 | **Kombi-Bonus, wenn Ergebnis UND Torschütze aufgehen** | ⏳ | Als B16 ausgearbeitet. Heute addieren sich beide Teile nur — das Zusammentreffen wird nicht belohnt, obwohl es das Seltenere ist |
| TI7 | Der Bonus wird aus der **Torschützenquote abgeleitet**, nicht festgelegt (Andi, 22.08.2026) | ⏳ | Mechanik in B16: niedrige Quote → kleiner Aufschlag, hohe Quote → großer. „Bei nem 5:1 ist klar, dass Kane trifft“ — ein Pauschalbetrag belohnte das Naheliegende |
| TI8 | Mathematisches Modell + Hilfe, wie ein Admin das einstellt | ⏳ | ⛔ **Ausdrücklich Balancing, ausdrücklich am Ende** (Andi, 22.08.2026). Hier nur vermerkt, damit es nicht verlorengeht |

## Eine Ansicht statt zwei (22.08.2026)

⚠️ **Kürzel EA statt EB (umbenannt am 22.08.2026).** Dieser Abschnitt hieß
erst auch EB1–EB5 — und weil es EB1–EB3 damit ZWEIMAL gab, hat ein Update
prompt die falschen Zeilen im Ebenen-Dokument überschrieben und deren Belege
zerstört. Zwei Nummern für dieselbe Sache sind keine Kleinigkeit, sondern
eine Falle: gesucht wird nach `| EB1 |`, und getroffen wird die erste.

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| EA1 | **Nur die Detail-Version** — kein Umschalten mehr zwischen Einfach und Profi | ✅ | `AnsichtSchalter.jsx` gelöscht, Zustand `stufe` raus, alle sieben Stufen-Bedingungen aufgelöst — auch die durchgereichte in `JokerSondermenue`/`JokerOekonomie`. Im Browser geprüft: kein Umschalter mehr, sechs Zeilen sichtbar, die vier wichtigsten Fragen bleiben. Auf 375×812: 76 Knöpfe, keiner unter 44 px, kein Querlauf |
| EA2 | Verfeinerungen je Einstellung in ein **eigenes Sondereinstellungs-Menü**, wie bei den Mannschaften | ✅ | **Fünf Menüs**: Wertung · Joker · Modifikatoren · Verlauf · Saison & Zeit (`*Sondermenue.jsx`). `Spielerstellung.jsx` 2386 → 1109 Zeilen |
| EA3 | Trotzdem bedienbar **ohne alles durchzulesen und einzeln einzustellen** | ✅ | Drei Mittel, alle im Betrieb: die Charaktere setzen alles auf einmal, die vier wichtigsten Fragen stehen jetzt für ALLE über den Zeilen (vorher nur in der einfachen Ansicht), und jede Zeile zeigt zugeklappt ihren Stand |
| EA4 | **Reihenfolge des Umbaus**: erst die Sondermenüs, dann der Umschalter weg | ✅ | Genau so gelaufen: fünf Menüs zuerst (`4030f5c` … `a513efc`), der Umschalter erst danach (`97fca75`) |
| EA5 | „Klassische Playlist“ als Voreinstellung, *„so wie ich mir eine Tipprunde erstellen würde“* | ⏳ | ⛔ Ausdrücklich **gemeinsam am Ende, mit dem Balancing** |

## Joker-Sondermenü (22.08.2026)

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| JK1 | Übersicht aller einstellbaren Joker-Sachen + Struktur, vor dem Bauen | ✅ | `design/joker-sondermenue.md` — 84 Einzelwerte aus dem Regelwerk gezogen, geordnet in fünf Karten nach der Frage, die ein Admin stellt |
| JK2 | Shop mit eigener Währung, auch in der reinen Quotenversion | ✅ | **Gibt es schon** (`budget` = Narren-Shop) — und er läuft in der Quotenversion. Im Budget-Modus abgeschaltet, also andersherum als vermutet |
| JK3 | „einige mehr Joker bzw. Wirkprinzipien" | ✅ | Teil C: zwölf Arten in vier Gruppen, jede mit Wirkprinzip und Reglern |
| JK4 | **Eingriffe in fremde Tipps**: blocken · mitprofitieren · dagegen wetten | ⏳ | Teil D. Blocken und Klauen gibt es halb (`duell`), neu ist der Bezug auf einen EINZELNEN Tipp und das Dagegenwetten |
| JK5 | **Cooldown je Ziel**, damit nicht immer dieselben getroffen werden | ⏳ | `maxProZiel` begrenzt nur die Gesamtzahl, nicht ob es immer derselbe Gegner ist. `sperrfristJeZiel` ist neu |
| JK6 | 🔴 Eingriffe müssen **vor der Frist sichtbar und zurücknehmbar** sein | ⏳ | Andis Zweck ist der Austausch („nimm den Block bei mir raus"). Ein still verrechneter Eingriff leistet davon nichts. Felder da: `duell.sichtbarkeit`, `jokerBasis.widerruf` |
| JK8 | **Umgekehrtes Modell fürs Dagegenwetten** anhand der Quoten | ✅ | Teil E: Gegenquote = 1/(1−p), dieselbe Rechnung mit der Gegenwahrscheinlichkeit. An echten Quoten durchgerechnet — gegen einen Favoritentipp zahlt es 3,00, gegen ein exaktes 4:1 nur 1,01. **Das Modell reguliert sich selbst** |
| JK9 | ⚠️ `minPayout` muss für Gegenwetten AUS sein | ⏳ | Sonst würden aus 1,01 volle Punkte und das Abgrasen sicherer Wetten wäre wieder lohnend |
| JK10 | ⚠️ Gegenwette braucht einen EINSATZ, keinen Gratis-Bonus | ⏳ | Wer gegen ein 4:1 wettet, riskiert 100 um 1 zu gewinnen — damit erledigt sich das Abgrasen ohne Sperre |
| JK7 | Die ganze Familie **in einem Griff** aus-/einschaltbar | ⏳ | Andi: Büro-Runde nein, Freundesrunde ja. Ein `eingriffe.enabled` über allem statt sechs Häkchen |
| JK11 | **„Fremdjoker"** ist der Name der Familie (Block, Trittbrettfahrer, Gegenwette, Klau) | ✅ | `design/vokabular.md`, Abschnitt „Fremdjoker“; `joker-sondermenue.md` Teil D umbenannt |
| JK12 | **Ausgeloste Zielperson** statt freier Opferwahl — man sucht sich das Ziel nicht aus, entscheidet aber bei der Tippabgabe, bei welchem EINZELSPIEL man einsetzt | ⏳ | Vorlage ausgefüllt in `joker-sondermenue.md` Teil D („Das ausgeloste Ziel“): Ebene 6, drei Einstellwerte (`zielModus` · `losTakt` · `losSichtbar`), `zielWahl` bekommt die vierte Stufe `ausgelost`. **Fünf ❓ stehen im Eintrag** — Frage 4 (Los tippt nicht) blockiert das Bauen |
| JK13 | Die Option **je Fremdjoker einzeln** einstellbar, nicht einmal für alle | ⏳ | Bauform steht fest: dasselbe Muster wie `jokerBasis` (Standard oben, Abweichung je Art), kein zweites erfinden |
| JK14 | **Jeder Tipper darf je Spieltag ausgewählte Spiele vor JEDEM Fremdjoker schützen** — „weil man die evtl. selber live verfolgen will" | ⏳ | Vorlage ausgefüllt in `joker-sondermenue.md`, Abschnitt „Geschützte Spiele": Ebene 6, zwei Einstellwerte (`schutzProSpieltag` · `schutzSichtbar`), Wahl gehört in die Tippabgabe. 🔴 Die erste Schutzregel, die dem SPIELER gehört statt dem Admin — und die Bedingung dafür, dass eine Runde die Fremdjoker überhaupt anlässt. Zwei ❓ im Eintrag |
| JK15 | **Alle Fremdjoker treffen EINZELNE SPIELE**, nicht ganze Spieltage | 🔨 | Rechengrundlage gebaut: ein Einsatz mit `matchId` rechnet auf genau diesem Spiel (`applyDuellJoker`, 5 Tests). ⏳ Offen ist die Store-Anbindung — solange sie fehlt, gibt es keine Einsätze, und ein Einsatz OHNE `matchId` rechnet weiter auf den Spieltag (benannter Übergang, im Code begründet) |
| JK16 | **Wie geht das mit höher gewichteten Spielen (CL) zusammen?** | ✅ | **Entschieden am 22.08.2026** (Andi: „mach so wie du meinst, und ja auch Gegenwette wie du sagst“): die WIRKUNG wird normiert, nicht der Preis. Ein Fremdjoker rechnet auf dem `grundwert` — der nackten Quoten-Wertung ohne Joker, Derby, Big Game, Liga-Gewicht und Tabellen-Bonus. Gebaut in `engine.js` (`punkteJeSpiel`) + `duellJoker.js`; der entscheidende Test: dasselbe Spiel ist als Ziel gleich viel wert, ob mit oder ohne CL-Aufschlag. **Gilt auch für die Gegenwette** — die frühere Festlegung (Standard-Mods zählen mit) ist damit überholt und in Teil E durchgestrichen |
| JK17 | Im **Budget-Spielmodus zwei Währungen**: eine für Joker, eine für die Tippabgabe — „aber das kommt dann" | ✅ | **Gibt es schon** und heißt so: 🃏 **Narren** kaufen Joker im Shop, 🪙 **Münzen** sind der Einsatz beim Tippen (`design/waehrungen.md`, gebaut am 03.08.2026). Seine Bestätigung ist damit belegt, nicht offen. ⏳ Was beim Budget-Modus noch offen ist, steht in `joker-sondermenue.md` Abschnitt 0: soll der Narren-Shop dort wirklich abgeschaltet bleiben? |

## Wertung & Verlauf (22.08.2026)

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| VL1 | **Streicher gelten nur für EINZELNE SPIELE, nie für einen ganzen Spieltag** — „ich meine die Streicher gelten natürlich nur für einzelne Spiele und nie den gesamten Spieltag aussetzen" | ✅ | `saisonform.js` (`streichSpiele`) + `engine.js` (`punkteJeSpiel`); 13 Tests umgeschrieben, 2170 grün. Kanal-Eintrag (VII) mit den drei Entscheidungen. ⚠️ Alte Creator-Codes werden dadurch milder: `streich: 2` heißt jetzt zwei Spiele |

## Betrieb

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| O1 | Tailwind: „ich denke wir sollten dennoch zum professionellen tool rüberwechseln“ | ⏳ | Recherche fehlt: Tailwind v4 mit Next 15.3, und ob die Fanfarben zur Laufzeit dynamisch bleiben |
| O2 | Eigener Mailversand (Brevo + Domain) | 👤 | einziger echter Blocker, bevor Mitspieler dazukommen |
| O3 | Echte Spielpläne live schalten (`seed-matches-pl/pd/sa.sql`) | 👤 | — |

---

## Was hier NICHT hingehört

Fertiges. Sobald eine Zeile ✅ mit Beleg trägt und Andi es gesehen hat, wandert
sie nach unten unter „Erledigt“ — gelöscht wird nichts, sonst entsteht wieder
der Eindruck, es sei nie gesagt worden.

## Erledigt

| Nr | Ansage | Stand | Beleg |
|---|---|---|---|
| W1 | „ich mach mit word … brauche nur blöcke und text“ | ✅ | `scripts/lies-docx.mjs` liest Überschriften, Absätze, Listen und Tabellenzellen — an einem Testdokument durchgeprüft. Ablage `design/entwuerfe/`, Verknüpfung auf dem Desktop |
| W2 | Desktop-Zugriff auf Vokabular und Ideen | ✅ | drei `.lnk` auf dem Desktop, Ziele geprüft |
| W3 | „Schriftzug QuotenTippspiel … klar weiß“ im Symbol | ✅ | `apple-icon.png` neu aus `logo-dunkel.png`; reinweiße Pixel im Schriftband von 340 auf 645 |
| W4 | Anmeldung fragt nach Code, den es nicht gibt | ✅ | `AuthBar.jsx`: Link steht oben, drei Schritte, Code nur noch als Nebensatz |

