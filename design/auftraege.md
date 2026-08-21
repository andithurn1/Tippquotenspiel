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
| ST1 | **Nur noch ZWEI Anzeigeebenen** (Einfach, Profi) — „Anpassen“ fällt weg | ✅ | 1 Bedingung `anpassen`→`einfach` (die vier großen Fragen sitzen jetzt in Einfach — „wenige und nur die wichtigsten Regler“), 3× `!== einfach`→`=== profi`. Build, 2141 Tests, `stufen`, `anzeige`, `sicht` grün |
| ST2 | **Die Reihenfolge der Auswahlen ist in beiden Ebenen gleich** | ✅ | Im Browser gemessen: die Abschnittsfolge ist über **19 Abschnitte** identisch, danach hat Profi nur MEHR (167 statt 22). Auch die Überschrift springt nicht mehr |
| ST3 | Reihenfolge: **Variante → Anzeigeebene → Voreinstellungen** | ✅ | `VariantenWahl.jsx` steht als erste Frage über den Voreinstellungen, in BEIDEN Ansichten. Im Browser geprüft: Variantenfrage bei Zeichen 355, erste Voreinstellung bei 839. Umschalten und Zurückschalten getestet |
| ST4 | **Thermometer rechts neben den Voreinstellungen** | 🔨 | `BalanceAmpel` ist gebaut, hängt aber in `Spielerstellung.jsx:849` **innerhalb** von `stufe !== "einfach"` — in der einfachen Ansicht also unsichtbar, genau dort, wo Andi sie haben will |
| ST5 | **Kopfzeile: Bibliothek · Gamemode · GameCode einsetzen** | ⏳ | GameCode-Feld existiert, liegt aber nicht in einer Kopfzeile |
| ST6 | Texte fehlerfrei | ✅ | `design/entwuerfe/texte-teil1.md` — zwei Stellen inhaltlich angemerkt, nicht still geändert |
| ST7 | **Anzeige-Umschalter dauerhaft oben rechts** | ✅ | `AnsichtSchalter.jsx`, in der klebenden Kopfzeile neben „Menü“. Gemessen bei 375×812: nach 900 px Scrollen weiterhin bei y=5, Tippziele 44 px, rechtsbündig |
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
| EB2 | „welche bei der einfachen Variante weggelassen werden“ | ✅ | ausgezählt: **128 von 180** werden von keiner Voreinstellung und keinem Regler angefasst — sie stehen nur in Profi und behalten sonst ewig ihre Vorgabe |
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

