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
| G2 | „R2 (12 px) ist der bevorzugte Eckenradius“ | ✅ | Vier Stufen in `RUND` (`theme.js`), 415 Stellen in 70 Dateien umgestellt: `pille` 999 · `karte` **12** · `schirm` 26 · `klein` 4. Nicht alles wurde 12 — der äußere Bildschirmrahmen und wenige Pixel große Balken haben einen Grund, alles dazwischen ist R2. ⚠️ Dabei kam eine ZWEITE Leiter zum Vorschein: `--tqs-rund-karte` war 16 px, `RUND.karte` 12 px — dasselbe Wort, zwei Werte; jetzt eine Leiter. `npm run rund` wacht darüber (nackte Zahl → rot, mit Datei und Zeile). Im Browser gemessen: auf `/erstellen` nur noch 12 px (127×), 999 px (49×), 26 px (1×) |
| G3 | „durchwegs die apple schrift. typ und formatierung“ | ✅ | **Schrift:** `--tqs-schrift-familie` (`-apple-system` zuerst) auf `body`, Apples Glättung, Laufweite −0,16 px; 30 Kopien in Komponenten → 0. **Größen:** Andi wählte Weg A (echtes Apple-Maß) — 520 Stellen auf Apples Leiter gehoben, danach nur noch 11·12·13·15·16·17·20·22·28. Gemessen auf 375×812: kein Querlauf, kein Tippziel unter 40 px auf /erstellen, /tippen, /ranking |

Gilt **nur bis zu den Wettbewerben**. Ab dort kommt die Komplettüberarbeitung
später; die Sonderregeln je Wettbewerb sind ausdrücklich noch offen.

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| ST1 | ~~Nur noch ZWEI Anzeigeebenen~~ ⬆️ **überholt am 22.08.2026: nur noch EINE** | ⛔ | 1 Bedingung `anpassen`→`einfach` (die vier großen Fragen sitzen jetzt in Einfach — „wenige und nur die wichtigsten Regler“), 3× `!== einfach`→`=== profi`. Build, 2141 Tests, `stufen`, `anzeige`, `sicht` grün |
| ST2 | ~~Reihenfolge in beiden Ebenen gleich~~ ⬆️ **gegenstandslos — es gibt nur noch eine Ebene** | ⛔ | Im Browser gemessen: die Abschnittsfolge ist über **19 Abschnitte** identisch, danach hat Profi nur MEHR (167 statt 22). Auch die Überschrift springt nicht mehr |
| ST3 | Reihenfolge: **Variante → Anzeigeebene → Voreinstellungen** | ✅ | `VariantenWahl.jsx` steht als erste Frage über den Voreinstellungen, in BEIDEN Ansichten. Im Browser geprüft: Variantenfrage bei Zeichen 355, erste Voreinstellung bei 839. Umschalten und Zurückschalten getestet |
| ST4 | **Thermometer rechts neben den Voreinstellungen** | 🔨 | `BalanceAmpel` ist gebaut, hängt aber in `Spielerstellung.jsx:849` **innerhalb** von `stufe !== "einfach"` — in der einfachen Ansicht also unsichtbar, genau dort, wo Andi sie haben will |
| ST5 | **Kopfzeile: Bibliothek · Gamemode · GameCode einsetzen** | ✅ | Drei Chips in der klebenden Kopfzeile (`KopfChip` in `Spielerstellung.jsx`), jeder zeigt seinen STAND und springt zu seinem Abschnitt. Die Werte sind abgelesen statt gemerkt — kein zweiter Zustand neben `presetKey`/`rules`/`shortCode`. ⚠️ `behavior: "smooth"` musste raus — damit passierte gar nichts. 🔴 **Am 24.08.2026 zweimal nachgebessert, nachdem Andi es am Live-Stand vermisst hat** — beide Male, weil die Ansage genauer war als die Umsetzung: **(1)** Das Verb **„einsetzen"** war verlorengegangen. Der 🔑-Chip ZEIGT den eigenen Kurzcode und springt ans Seitenende; das EINSETZEN eines fremden Codes lag hinter dem ganzen Regelwerk. Wer einen Code geschenkt bekommt, will aber nichts einstellen, sondern ihn loswerden — jetzt steht „Du hast einen GameCode?" mit Feld und `Einsetzen`-Knopf direkt unter der Überschrift, vor der Variantenwahl, über demselben `load()` (Teil-, Creator- und Kurzcode in derselben Prüfung). **(2)** Die Chips trugen nur Sinnbild + Wert („📚 Standard"); das Wort **„Bibliothek" stand ausschließlich im Tooltip** — und auf dem Handy gibt es keinen. Namen stehen jetzt sichtbar dabei. Gemessen auf 390 px: alle drei Namen lesbar, Einsetz-Feld 44 px, keine Seitenfehler |
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
| TC3 | **Ein Code nur für Joker („Jokercode")** | ✅ | Eigener Aspekt `joker` (`presetMerge.js`): joker · jokerBasis · budget · limitKlassen · duell. Eigenes Code-Feld direkt über der Joker-Zeile, kuratierte Bibliothek (die KOMBINATIONEN hingen ohnehin schon dort). Rundlauf geprüft: `TS2A-joker-…` setzt den Joker-Faktor und lässt Derby, Ereignisse und Rad in Ruhe |
| TC4 | **Ein Code nur für Ereignisse**, samt Auslosung am Rad | ✅ | Eigener Aspekt `ereignisse` = Ereignisse **+ Drehrad** (deine Ansage „samt Auslosung am Rad"). Code-Feld steht in der Karte „Woher kommen sie?", direkt über beiden. Neue Bibliothek aus `EREIGNIS_PRESETS` plus einem Eintrag „Mit Glücksrad". Rundlauf geprüft: der Code schaltet das Rad ein und lässt Joker und Derby unberührt |
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
| PP1 | **Bibliothek / Gamemode als eigenes Fenster** rechts vom Strich | ✅ | `Bibliothek.jsx`, geöffnet über den 📚-Chip. Führt die drei bisher getrennten Orte zusammen — 5 Runden-Ideen, 6 Regelwerke, 58 Bausteine — mit Suche (ohne Umlaute tippbar), Filter nach Art und Sortierung nach Relevanz · Verbreitung · Name. Je Eintrag: Kurzbeschreibung, Urheber, Verbreitung und Icons. Ganze Herleitung in `design/bibliothek.md` |
| PP2 | **Bewertungssystem für Einstellungen** | ✅ | Vier über die echte Engine gemessene Achsen: Schärfe · Boden · Überraschung · Torschützen-Anteil. 🔴 Der erste Anlauf mit nur der Underdog-Neigung gab **64 von 69 Einträgen dasselbe Icon** — `underdogLean` ist ein Verhältnis, `k`/`m` skalieren beide Seiten gleich. Verglichen wird mit den GESCHWISTERN (der strengste dieser vier), nicht mit der Vorgabe. Wo die Messung nichts sieht, steht kein Icon |
| PP3 | Wettbewerbe: **je Liga derselbe Aufbau** („Bundesliga selber Aufbau wie bei 2. Bundesliga“) | 🔨 | `LigaSonderregeln` gilt schon je Wettbewerb. Offen: dass die Liste aller Ligen sichtbar denselben Aufbau zeigt |
| PP4 | Innerhalb einer Liga: **„alle" und einzelne Vereine** (Beispiel „Fc Köln“) | ✅ | `SpielauswahlWettbewerbe` kann beides |
| PP6 | **Nur die Duelle untereinander** statt jedes Spiel der gewählten Vereine — je Wettbewerb einstellbar | ✅ | **Andi, 23.08.2026:** „so soll bspw. El Clásico auch betippt werden, und nicht alle Spiele von Barça und Real in der Liga." `TEAM_MODI` in `spielauswahl.js`, Vorgabe `einer` (= das bisherige Verhalten, alle alten Codes bleiben bitgleich). Steht auch in `ABWEICHUNGS_FELDER`, also je Liga abweichend — genau sein Fall: in La Liga nur das Duell, in der Champions League jedes Spiel. ⚠️ Die Schätzung sagt für „beide" ausdrücklich „an den meisten Spieltagen keins" statt einer beruhigenden Zahl |
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
| ATE4 | In der Bibliothek die **beliebtesten Creator-Codes** auswählen | ⏳ | Die Bibliothek steht (PP1) und nimmt geladene Codes schon auf (`urheber: "geladen"`). Was fehlt, ist echte Nutzung: eine Beliebtheit ohne Server wäre erfunden. Bis dahin zeigt sie die Verbreitung — wie viele der kuratierten Runden-Ideen einen Baustein benutzen, nachgerechnet statt gezählt |
| ATE5 | Anzeigen, welcher Code zuletzt geladen wurde | ✅ | `geladeneCodes` je Ebene, Anzeige unter dem Feld. **Ein Gesamt-Code leert die Merkliste** — Andis Regel vom 21.08.2026, an beiden Ladewegen umgesetzt |

## Tipp-Oberfläche (21.08.2026)

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| TI1 | Ergebnis-Matrix mit **direkter Punktanzeige** je Feld | ✅ | `ergebnisMatrix.js` (21 Tests) + `ErgebnisMatrix.jsx`, eingehängt in der Tippabgabe UNTER der Zahleneingabe — beides schreibt denselben Endstand, keins ersetzt das andere. Jedes Feld zeigt Endstand und Punkte, Quote und Wahrscheinlichkeit im Tooltip. Im Browser: 30 Felder, keins unter 44 px, kein Querlauf der Seite (die Matrix scrollt für sich) |
| TI2 | **Viele Stufen** für die Matrixgröße, bis 10 | 🔨 | Gebaut: **automatisch · 3 · 4 · 5 · 6 · 8** (6 und 8 seit dem 9x9-Raster). ⏳ Offen bleibt **10 und „automatisch +"**: das Quoten-Raster ist 6×6 (0–5 Tore), für 6:2 gibt es keine Quote. Gemessen über 300 Spiele: eine großzügigere Auto-Stufe stößt sofort an die Rasterkante und wäre von „5" nicht zu unterscheiden — also gestrichen statt als Dekoration eingebaut. **Kommt zurück, sobald `rasterAusMarkt` ein größeres `grid` liefert** (der Parameter existiert bereits, `rasterMasse` liest die Größe ab) |
| TI3 | Je Spiel anpassen, beim klaren Außenseiter dessen hohe Ergebnisse weglassen | ✅ | Die Matrix ist ASYMMETRISCH: jede Seite wird einzeln aufgezogen, bis 97 % ihrer Tore drin sind. Gemessen über 300 Spiele des Katalogs: **299 mal getrimmt, 212 mal ungleich zugeschnitten, Ø 28,6 statt 36 Felder**. Beispiel im Browser: Manchester City – Bournemouth wird 6×5 statt 6×6, und die Zeile sagt es dazu |
| TI9 | **Modell für Ergebnisse ohne Originalquote** — „ausgehend von der naechsten Quote" (Andi, 22.08.2026) | ✅ | Erzeugtes Raster **9x9** (Andis Ansage), `rasterAusMarkt` wirft Marktquoten ueber 5 Tore nicht mehr weg und wird ueber das Modell gelegt statt es zu ersetzen, `randquoten.js` schreibt den Rest fort (markiert, monoton, gedeckelt). **Exakt getipptes 6:0: 47 → 2055 Punkte.** 15 eigene Tests, Kanal-Eintrag (VIII). ⏳ Offen bleibt der DECKEL (200): 6:0, 7:0 und 8:0 zahlen dort gleich viel — Balance, Endphase |
| TI4 | Vorschau: welches nahe Ergebnis wie viel zahlt | ✅ | **War schon gebaut** — `NaheErgebnisse.jsx` hängt in `Tippabgabe.jsx:1234`. Am 22.08.2026 im Browser nachgesehen (`/tippen/pl26-md1-mci-bou`): sieben Zeilen mit Endstand, Art (dein Tipp · gleicher Abstand · Heim ±1 · Gast ±1), Quote und Punkten. Die Zeile stand zu Unrecht auf 🔨 |
| TI5 | Sichere gegen mögliche Punkte trennen | ✅ | **War schon gebaut** — im Browser gemessen: „Wenn dein Tipp exakt aufgeht +1105" und darunter „… ohne deine Torschützen +151". Der Wert kommt aus `projectTip`, nicht aus einer zweiten Rechnung im Screen |
| TI6 | **Kombi-Bonus, wenn Ergebnis UND Torschütze aufgehen** | ✅ | **Gab es zum Teil schon:** `applyCombo` multipliziert die Summe aus Ergebnis- und Tor-Anteil mit `combo[ebene]`, sobald ein Schütze trifft — die Spec-Prämisse „heute addieren sich beide Teile nur" war überholt. Am Code nachgeprüft, in B16 richtiggestellt |
| TI7 | Der Bonus wird aus der **Torschützenquote abgeleitet**, nicht festgelegt (Andi, 22.08.2026) | ✅ | **Gebaut** als `rules.kombi` (`kombiBonus.js`, 19 Tests, Standard AUS). Der Aufschlag auf den Kombi-Faktor kommt aus der Quote der getroffenen Schützen — logarithmisch, damit ein 15,0-Schütze nicht das 28-Fache eines 1,5-Schützen erschlägt. Im Browser: Stürmer +0,09, Verteidiger +0,59. `greift`: bewegt 5270 Punkte |
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
| JK4 | **Eingriffe in fremde Tipps**: blocken · mitprofitieren · dagegen wetten | ✅ | Alle vier Arten gebaut (23.08.2026): Block und Klau in `duell` (vorhanden), **Trittbrettfahrer** und **Gegenwette** neu in `rules.eingriffe` (`eingriffe.js` + `fremdjoker.js`, 54 eigene Tests). Sie rechnen in `applyDuellJoker` MIT — derselbe Deckel, dieselbe Reihenfolge, dieselbe Rundung, dasselbe `sammeln`; eine zweite Fassung des Transfers wäre die doppelte Wahrheit. `npm run greift`: bewegt **228 Punkte**. Der Bezug auf den EINZELNEN Tipp kam über `matchId` in `einsaetzeAusTipps` (siehe JK15) |
| JK5 | **Cooldown je Ziel**, damit nicht immer dieselben getroffen werden | ✅ | **Drei Ebenen tief** (Andi, 23.08.2026: „für jeden Joker Sperrfrist einzeln einstellbar, und mach bei sowas auch weitere Option zur Feineinstellung durch weiteren Klick“): **1.** eine Zahl für alle · **2.** eine eigene je Fremdjoker (Muster `jokerBasis`, kein zweites erfunden) · **3.** wie die Sperre WIRKT. Ebene 3 ist sein eigenes Beispiel: `aufschlag > 0` heißt **kein Verbot beim zweiten Mal, aber der Cooldown wächst dadurch** — eine Formel für beide Verhalten (`warte = spieltage + (n−1) × aufschlag`, gedeckelt durch `hoechstens`), also **kein** zusätzliches Modus-Feld. Gemessen: Standard 0 + 2 → nach 1 Treffer sofort frei, nach 2 gesperrt bis Spieltag 11, nach 3 bis 15; Block mit eigenen 4 Spieltagen gesperrt, während Klau und Trittbrettfahrer frei sind. 🔴 **Dabei ein Fund:** `maxProZiel` und `immun` zählten nur die EIGENEN Einsätze, obwohl ihre Karte „Schutz der Getroffenen“ heißt — jetzt ziel-bezogen |
| JK6 | 🔴 Eingriffe müssen **vor der Frist sichtbar und zurücknehmbar** sein | ✅ | **Sichtbar:** `eingriffe.sichtbar` (Karte mit Standard und Abweichung je Fremdjoker), ausgewertet in `eingriffFenster()` über den `frist`-Zustand des Tippfensters — dazu die Spieler-Ansicht in `MeineJoker`: „Lena · Block · Bayern – Dortmund · noch bis zum Anpfiff“, mit NAMEN, aus der Store-Methode `getFremdEingriffe` statt aus einer zweiten Rechnung im Screen. **Zurücknehmbar:** `jokerBasis.widerruf`, je Fremdjoker einzeln. 🔴 **Fund an der eigenen Arbeit (23.08.2026):** die erste Fassung trug dafür ein zweites Feld `eingriffe.ruecknahme` — familienweit, nur für die Anzeige. Die Grundform beantwortete dieselbe Frage längst, und die Tippabgabe setzt SIE beim Speichern durch. Eine Runde hätte „zurücknehmbar“ anzeigen können, während das Speichern es verweigert. Feld gelöscht, `eingriffFenster` fragt jetzt dieselbe Funktion wie das Speichern (`darfWiderrufen`) |
| JK8 | **Umgekehrtes Modell fürs Dagegenwetten** anhand der Quoten | ✅ | Teil E: Gegenquote = 1/(1−p), dieselbe Rechnung mit der Gegenwahrscheinlichkeit. An echten Quoten durchgerechnet — gegen einen Favoritentipp zahlt es 3,00, gegen ein exaktes 4:1 nur 1,01. **Das Modell reguliert sich selbst** |
| JK9 | ⚠️ `minPayout` muss für Gegenwetten AUS sein | ✅ | `gegenwetteErtrag()` rechnet für sich und läuft NICHT durch `scoreTip`/`toDisplay`. Gemessen: gegen ein exaktes Ergebnis (p = 0,5 %) bringt ein Einsatz von 25 ganze **0,13 Punkte** — mit `minPayout` wären daraus volle Punkte geworden, und das Abgrasen wäre wieder lohnend |
| JK10 | ⚠️ Gegenwette braucht einen EINSATZ, keinen Gratis-Bonus | ✅ | `eingriffe.gegenwette.einsatz` (1–500, Vorgabe 25) — das Feld hat bewusst **kein 0**. Geht der fremde Tipp auf, ist der Einsatz weg; die Vorschau in der Tippabgabe zeigt beide Seiten, bevor gesetzt wird |
| JK7 | Die ganze Familie **in einem Griff** aus-/einschaltbar | ✅ | `eingriffe.enabled` über allem, **Vorgabe AN**. Das sieht verkehrt herum aus und ist es nicht: das Dach nimmt nur weg (jede Art hat ihren eigenen Schalter und ist von sich aus aus), und eine Vorgabe „aus“ hätte jeden bestehenden Creator-Code mit `duell.enabled: true` rückwirkend umgeschrieben. Beide Richtungen bedient `familieSchalten()` — aus lässt alles stehen, an gibt der leeren Runde Block+Klau, damit der Klick etwas bewirkt. Oberfläche: `Fremdjoker.jsx`, dazu die Regler-Stufe „Dürft ihr euch gegenseitig in die Tipps gehen?“ |
| JK11 | **„Fremdjoker"** ist der Name der Familie (Block, Trittbrettfahrer, Gegenwette, Klau) | ✅ | `design/vokabular.md`, Abschnitt „Fremdjoker“; `joker-sondermenue.md` Teil D umbenannt |
| JK12 | **Ausgeloste Zielperson** statt freier Opferwahl | ✅ | Gebaut am 23.08.2026. Der Schalter ist die **fünfte Stufe der Zielwahl** („Ausgelost“), das WIE steht in `eingriffe.los`. Alle fünf Fragen als Einstellung: `takt` (Spieltag · Saison · nach jedem Einsatz) · `paare` (einseitig · gegenseitig) · `sichtbar` (eigenes · alle · keines) · `jeArt`, dazu Abweichungen je Fremdjoker. 🔴 **Eine Permutation, keine unabhängige Ziehung:** jeder zieht genau einen und wird genau einmal gezogen — sonst könnten drei denselben ziehen, und das Rudelbilden wäre wieder da, nur mit Zufall statt Absicht. Bei „gegenseitig“ und ungerader Zahl bildet der Übrige mit dem letzten Paar einen Dreier-Ring, statt doppelt gezogen zu werden. `npm run greift`: **20 → 5 erlaubte Ziele**. In der Tippabgabe steht „Dein Ziel diesen Spieltag: Lena“ ÜBER der Zielliste. ⚠️ Der Konter bricht auch das Los — er ist überall die Ausnahme von der Zielwahl |
| JK13 | Die Option **je Fremdjoker einzeln** einstellbar, nicht einmal für alle | ✅ | Vier Wege, alle mit demselben Muster (Standard oben, Abweichung je Art — die Bauform steht seit dem 23.08.2026 als `karteVon()` an EINER Stelle): die **Grundform** über `JOKER_ARTEN` (Widerruf, Sichtbarkeit im Joker-Sinn, Abklingzeit, Verfall, Bedingung), die **Sperrfrist** samt Vertiefung, die **Sichtbarkeit vor der Frist**, und die **Stärke** ohnehin je Art. ⚠️ Andi hat am 23.08.2026 ausdrücklich nur die SPERRFRIST einzeln benannt; die Sichtbarkeit hat dieselbe Bauform bekommen, weil er die Antwort „gemeinsam lassen“ als Ganzes verworfen hat — zurückdrehen kostet zwei Zeilen |
| JK14 | **Jeder Tipper darf je Spieltag ausgewählte Spiele vor JEDEM Fremdjoker schützen** | ✅ | Gebaut am 23.08.2026: `eingriffe.schutz` (`proSpieltag` · `sichtbar` · `verfall`), `geschuetzteSpiele()` setzt das Kontingent in der WERTUNG durch (nicht erst im Screen), `fremdEinsaetze` entwertet betroffene Einsätze, `applyDuellJoker` befolgt die Marke. Andis zwei offene ❓ sind Einstellungen geworden: **sieht der Angreifer den Schutz** (Vorgabe offen — ein Einsatz, der ungewarnt verpufft, sieht nach Willkür aus) und **was aus dem Einsatz wird** (`zurueck` · `verfaellt`). Die widersprüchliche Kombination — verdeckter Schutz MIT Rückgabe — meldet `konflikte()`: wer seinen Joker unverbraucht wiederfindet, weiß, dass das Spiel geschützt war. `npm run greift`: **3 → 2 wirksame Einsätze**. Admin-Oberfläche im Browser geprüft. **Im Browser gesehen** (23.08.2026): dafür gibt es jetzt die zweite Demo-Runde „Schaufenster (alles an)“, Beitritts-Code `ALLES` — „🛡 Dieses Spiel schützen · 1 von 1 frei“, Klick schaltet auf „Geschützt“ |
| JK18 | 🔴 **Zwei-Phasen-Spieltag als Voraussetzung der Fremdjoker** — erst tippen alle, einen Tag später werden die Joker auf die anderen gesetzt | ✅ | `tippfenster.schlussStunden` (0–168, Vorgabe 0 = alles wie bisher) zieht einen GEMEINSAMEN Schluss vor den ersten Anpfiff. Neuer Zustand `frist` in `tippStatus` für die zweite Phase — bewusst nicht „vorbei", denn der Spieler erfährt hier „jetzt sind die anderen dran", nicht „zu spät". `fensterKonflikte` meldet den fehlenden Anker, statt still zu korrigieren. Im Browser geprüft: Warnung erscheint und verschwindet, Zeile zeigt „1 Woche · Schluss 1 Tag vorher" |
| JK19 | Beim Einschalten der Fremdjoker der **ehrliche Hinweis**: eure Runde muss zweimal pro Spieltag reinschauen | ✅ | `zweiPhasenHinweis(rules)` — in seiner Sprache: „Eure Runde muss zweimal pro Spieltag reinschauen: erst tippen alle, 1 Tag später werden die Joker auf die anderen gesetzt. Für eine Büro-Runde ist das zu viel — dort die Fremdjoker lieber ganz ausschalten.“ Steht als Kasten in `Fremdjoker.jsx`, sobald eine Art läuft. Fehlt der Tippschluss, sagt derselbe Satz das dazu |
| JK15 | **Alle Fremdjoker treffen EINZELNE SPIELE**, nicht ganze Spieltage | ✅ | 🔴 **Am 23.08.2026 fertig — es fehlte EINE Zeile.** Die Rechengrundlage (`applyDuellJoker` auf dem `grundwert` des getroffenen Einzelspiels) lag seit dem 22.08. fertig da; nur warf `einsaetzeAusTipps` die `matchId` weg, sodass jeder Einsatz ohne Spiel ankam und auf den ganzen SPIELTAG rechnete. Der Übergangszustand war im Code sauber benannt, nur hatte ihn niemand beendet. ⚠️ Das ist eine **Verhaltensänderung für bestehende Runden** — siehe Kanal-Eintrag vom 23.08.2026 |
| JK16 | **Wie geht das mit höher gewichteten Spielen (CL) zusammen?** | ✅ | **Entschieden am 22.08.2026** (Andi: „mach so wie du meinst, und ja auch Gegenwette wie du sagst“): die WIRKUNG wird normiert, nicht der Preis. Ein Fremdjoker rechnet auf dem `grundwert` — der nackten Quoten-Wertung ohne Joker, Derby, Big Game, Liga-Gewicht und Tabellen-Bonus. Gebaut in `engine.js` (`punkteJeSpiel`) + `duellJoker.js`; der entscheidende Test: dasselbe Spiel ist als Ziel gleich viel wert, ob mit oder ohne CL-Aufschlag. **Gilt auch für die Gegenwette** — die frühere Festlegung (Standard-Mods zählen mit) ist damit überholt und in Teil E durchgestrichen |
| JK17 | Im **Budget-Spielmodus zwei Währungen**: eine für Joker, eine für die Tippabgabe — „aber das kommt dann" | ✅ | **Gibt es schon** und heißt so: 🃏 **Narren** kaufen Joker im Shop, 🪙 **Münzen** sind der Einsatz beim Tippen (`design/waehrungen.md`, gebaut am 03.08.2026). Seine Bestätigung ist damit belegt, nicht offen. ⏳ Was beim Budget-Modus noch offen ist, steht in `joker-sondermenue.md` Abschnitt 0: soll der Narren-Shop dort wirklich abgeschaltet bleiben? |

## Wertung & Verlauf (22.08.2026)

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| VL1 | **Streicher gelten nur für EINZELNE SPIELE, nie für einen ganzen Spieltag** — „ich meine die Streicher gelten natürlich nur für einzelne Spiele und nie den gesamten Spieltag aussetzen" | ✅ | `saisonform.js` (`streichSpiele`) + `engine.js` (`punkteJeSpiel`); 13 Tests umgeschrieben, 2170 grün. Kanal-Eintrag (VII) mit den drei Entscheidungen. ⚠️ Alte Creator-Codes werden dadurch milder: `streich: 2` heißt jetzt zwei Spiele |

## Prüfbarkeit (23.08.2026)

| Nr | Ansage | Stand | Beleg / was fehlt |
|---|---|---|---|
| PR1 | **„mach die demo runde bzw tests so dass sie alle Einstellbarkeiten abdeckt.. um sie zu prüfen."** | ✅ | Zwei Hälften. **Tests:** `npm run einstellbar` (neunter Durchgang) geht JEDES Blatt des Regelwerks durch — nimmt es einen anderen Wert an, und überlebt er den Creator-Code? Kandidaten werden aus Presets, Charakteren, Regler-Stufen und dem Schaufenster GEERNTET, nicht von Hand gepflegt. **Demo-Runde:** das Schaufenster (`ALLES`) führt **188 von 199** Blattfeldern vor, vorher 78. Die 11 übrigen tragen je einen Satz: 7 in `SCHAU_AUSGENOMMEN` (Einstellungen, die einander ausschließen — `spiele.modus` hat genau einen Wert), 4 in `GEKOPPELT` (`werWert` ohne `wer: abPlatz` ist keine Angabe). Die Prüf-Zahl ist deshalb `unerklaert` = **0**, gehalten von drei Tests. Browser: 54 Spiele, Fremdjoker-Block auf allen geprüften Rundenspielen, keine Seitenfehler |
| PR2 | ⚠️ *Vorbehalt zu PR1, von mir, nicht von Andi* | ⏳ | Ein Schaufenster, in dem jeder einzelne Regler verstellt ist, liest sich schwerer als eines mit wenigen sprechenden Abweichungen — und `reglerWarnung.pruefe()` meldet darauf acht Punkte (das ist richtig so, siehe Kopf von `schaufenster.js`). Falls Andi lieber eine **ruhige** Vorführ-Runde will, wäre der Weg eine zweite Runde neben `ALLES`, nicht ein Zurückdrehen dieser. **Seine Entscheidung, nicht meine** |

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

