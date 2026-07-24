# QT — Reaktions-Clips, Zustände & Ansprachen (Design-Spec)

Gemeinsame Quelle für **Grafik-Produktion** (was gezeichnet/animiert wird) und
**Code** (wann was ausgelöst wird). Wer Clips erstellt, arbeitet diese Datei ab;
wer Trigger baut, hängt sie an die hier genannten Engine-Signale.

**QT** = der persönliche Fan-Begleiter jedes Tippers. Kleiner, dicker Zwerg mit
lustigen Proportionen, realistischer Cartoon-Comic-Look. Sein Zustand hängt am
Abschneiden seines Tippers — er leidet oder feiert **wegen dir**.

> **Warum das strategisch zählt:** Eine einzelne Animation ist in Minuten kopiert.
> Eine konsistente Charakter-Bibliothek mit passgenauer Reaktion auf *jeden*
> Auswertungs-Ausgang ist es nicht. Der Burggraben ist die **Vollständigkeit**,
> nicht der einzelne Clip.

---

## 1. Andockpunkt im Code (existiert bereits)

`src/lib/reactions.js` ist die Zuordnungs-Schicht (rein, testbar, UI-frei —
analog zu Quoten-Quelle und Daten-Store). Neue Szenarien = **eine Regel dort +
eine Clip-Datei**, kein UI-Umbau.

- **Clip-Pfad:** `public/reactions/<key>.mp4` (kurzes stummes MP4, siehe
  `public/reactions/README.md`). Fehlt die Datei, zeigt die UI den
  Emoji-Platzhalter — die App funktioniert also schon vor dem ersten Clip.
- **Bestehende Tipp-Szenario-Schlüssel** (priorisiert, erster Treffer gewinnt):

  | Key | Bedeutung | Emotions-Register (§3) |
  |---|---|---|
  | `exakt` | Volltreffer | Triumph |
  | `hauchduenn` | Sieger richtig, 1 Tor daneben | Knapp daneben |
  | `abstand` | Abstand getroffen | Freude |
  | `tendenz-tore` | Tendenz + Torschütze | Freude |
  | `tendenz` | Richtige Tendenz | Zufrieden |
  | `tore-trostpreis` | Sieger weg, aber Tor getroffen | Knapp daneben |
  | `daneben` | Voll daneben (Fallback) | Enttäuschung / Wut |

- **Rollen-Reaktionen:** `sieger` · `mittelfeld` · `letzter`
- **`MATCH_DRAMA`** — vorbereiteter Andockpunkt für Spielverlauf-Szenarien
  (Nachspielzeit-Drama). **Inaktiv, solange keine Torminuten vorliegen** (§9).

---

## 2. Tonalität & Leitplanken (das Wichtigste — nicht brechen)

Der Comedy-Motor ist der **Kontrast**: derselbe kleine Kerl, Himmel oder Hölle,
je nachdem wie du tippst. Zwei Pole, je eigene Regeln.

### Pol A — Martialisch, aber sympathisch (Lose-Seite)

Slapstick-Gewalt ist nur lustig, wenn sie **Looney-Tunes-Physik** folgt:

1. **Gummi-Körper.** QT wird geplättet, verbeult, weggeschossen — und **popt im
   nächsten Frame zurück**. Sterne/Vögelchen kreisen kurz, dann ist er heil.
2. **Nie eklig, nie echt.** Kein Blut, keine echte Verletzung. Nur Beule,
   Pflaster, verdrehte Augen. Comic, nicht Splatter.
3. **Er behält seine Würde.** Er jammert nie ernsthaft — er guckt **vorwurfsvoll
   in die Kamera** (bricht die 4. Wand). Das Publikum lacht *mit* ihm gegen den
   Tipper, nicht *über* ein Opfer.
4. **Das Pech ist Missgeschick, nie Erniedrigung.** „Armer Tropf mit Pech" =
   liebenswert. „Gedemütigtes Opfer" = unangenehm. Das ist die Grenze.
5. **Comeback ist Pflicht.** Jede Leidens-Serie braucht ihren Erlösungsmoment (§6).

### Pol B — Eskalierende Stammtisch-Party (Win-Seite)

Primitiver Männerhumor, Ballermann-Energie — mit einer Leitplanke:

- **„Stammtisch mit Augenzwinkern", nicht FSK18.** Nichts Anzügliches/Sexuelles.
  Zwei Gründe: **App-Store-Zulassung** (siehe Glücksspiel-Abgrenzung in
  `README.md`) und **Teilbarkeit** — ein Screenshot vom eskalierenden QT geht
  rum, ein anzüglicher nicht.
- **Der Bierbauch ist der Star**, nicht die Fremdscham.

---

## 3. Die sechs Emotions-Register

Der Lockenkopf spielt in jedem Register dieselbe Figur — nur Ausdruck und
Requisite ändern sich.

| Register | Anlass | Beispiele |
|---|---|---|
| 🏆 **Triumph** | Jackpot (`exakt` + Torschütze, ideal Underdog) | Backflip, Pokal, Konfetti |
| 😄 **Freude** | starker Treffer (`abstand`, `tendenz-tore`) | Jubelsprung, Faust |
| 😌 **Zufrieden** | `tendenz` | zufriedenes Nicken, Daumen hoch |
| 😐 **Knapp daneben** | `hauchduenn`, `tore-trostpreis` | Schulterzucken, „Najaa…" |
| 😞 **Enttäuschung** | getippter Sieg → nur Remis | Bier über sich kippen, Kind weint |
| 😡 **Wut/Comedy** | Niederlage kassiert | Bengalo, „Fan in der Mitte" pöbelt |

**Auslöser-Signale aus der Engine** (`scoreTip`): `ebene` (`exakt` › `abstand` ›
`tendenz` › `keiner`), `winnerRight`, `dist`, `goals.net`, `underdogMult`.

**Varianten:** je Register **3–5 austauschbare Clips**, die rotieren — sonst ist
der Gag beim 10. Mal tot. **Seltenheits-Stufe:** Jackpot-Momente schalten seltene
Spezial-Clips frei (Sammel-Reiz, Screenshot-Teilen).

---

## 4. Figur & Farb-System

### Drei Ebenen — nur eine ist farbig

1. **QT selbst = farbneutral.** Haut, Locken, Grundoutfit neutral. Wird **einmal**
   animiert, gilt für **alle** Teams.
2. **Ein einziges Tint-Element** trägt die Vereinsfarbe — **Schal** (bevorzugt,
   gut animierbar) oder Mütze/Trikot. Nur dieses Element hat einen Farb-Token.
3. **Optional Sekundär-Streifen** für Zwei-Ton-Identitäten (Dortmund, Gladbach).

→ „Bier über sich kippen" wird **einmal** produziert; der Schal wechselt die
Farbe und der Clip funktioniert für alle Vereine.

### Sechs Farben decken die Liga

| Token | Hex (Richtwert) | Typische Vereine |
|---|---|---|
| `rot` | `#E10600` | Bayern, Leverkusen, Stuttgart, Union, Freiburg, Mainz, Köln, Leipzig |
| `schwarzgelb` | `#FDE100` + `#111111` | Dortmund |
| `koenigsblau` | `#004D9D` | Schalke, Hertha, Hoffenheim, Bochum, HSV, Darmstadt |
| `gruen` | `#009036` | Wolfsburg, Werder, Augsburg (+ Gladbach-Akzent) |
| `schwarzweiss` | `#111111` + `#FFFFFF` | Gladbach, neutraler Fallback |
| `akzent` | frei | Aufsteiger / Sonderfälle |

> Welche Vereine 2026/27 genau spielen, hängt an Auf-/Abstieg. Deshalb wird auf
> **Farb-Familien** gebaut, nicht auf Vereinsnamen — neue Teams fallen fast immer
> in einen bestehenden Bucket. `rot` + `koenigsblau` allein decken über die Hälfte.

### Clip-Klassifizierung

- **`neutral`** (~90 %): läuft über den Schal-Tint → einmal zeichnen, alle Teams.
- **`teamSpecial`** (wenige): zeigt Wappen/Verein explizit → nur für große Vereine
  produzieren, nicht für alle 18.

---

## 5. QT-Zustandsstufen (gekoppelt an den Tabellenplatz)

Kern-Loop: der Nutzer will nicht nur gewinnen — er will **seinem QT das Leiden
ersparen**. Gekoppelt an Rang aus `scoreLeaderboard`.

| Stufe | Platz | Zustand | Look |
|---|---|---|---|
| `loge` | Spitze | fett, glänzend, arrogant | Sonnenbrille, VIP-Loge, Kaviar auf der Bratwurst |
| `satt` | oberes Drittel | zufrieden | Bier in der Hand, entspannt, Doppelschal |
| `nervoes` | Mittelfeld | nervös | Schweißperle, Fingernägel-Kauen, starrt auf die Tabelle |
| `ramponiert` | unteres Drittel | angeschlagen, spart | Pflaster, Schal schief, **trockene Semmel ohne Wurst** |
| `boden` | Letzter | am Ende | blaues Auge, kaputte Tröte, allein im Regen |

**Ergänzungen:**
- **Accessoire-Fortschritt:** über die Saison schaltet QT Ausstattung frei
  (Schal → Hut → VIP-Pass) — verstärkt die Bindung.
- **Sozialer Vergleich:** in der Runde die QTs der Mitspieler sehen — der
  verkloppte QT neben dem Loge-QT des Tabellenführers = Ansporn + Lacher.

---

## 6. Eskalations-Leitern (Running Gags über mehrere Spieltage)

Zwei gespiegelte Serien, gesteuert vom **Streak-Zähler** (§9). Prinzip:
Erwartung aufbauen → brechen → aus unerwarteter Richtung zuschlagen.

### 6a. Die Ball-ins-Gesicht-Saga (Lose-Streak)

QT sitzt hinterm Tor. Jede Stufe = ein weiterer verkorkster Tipp in Folge.

| Streak | Szene |
|---|---|
| 1 | **Der Klassiker.** QT kaut ahnungslos → **BAM**, Vollschuss ins Gesicht. *Variante:* Ball trifft die Wurst, die schießt ihm senkrecht in den Rachen. |
| 2 | **Der Doppelschlag.** Der angebeulte QT ahnt Böses, duckt sich → Schuss geht drüber. Erleichterung, er setzt zum Getränk an … → Ball kommt **von hinten** zurückgeworfen, voll auf den Hinterkopf. |
| 3 | **Selbstverteidigung scheitert.** Kochtopf als Helm, stolzer Blick → Schuss trifft mit **GONG**, Topf rutscht übers Gesicht, er tappt blind los und fällt vom Sitz. |
| 4 | **Die Festung.** Schutzmauer aus Bierbechern. Schuss verfehlt, QT grinst triumphierend → die Mauer kippt von selbst, alles Bier über ihn. |
| 5 | **Die Ritterrüstung.** Komplett bandagiert + Rüstung. Schuss trifft, er schwingt wie eine Kirchenglocke, kippt steif nach hinten um. |
| 6+ | **Rock Bottom.** QT ist weg, nur ein Schild „QT im Krankenhaus". Zwei Sekunden Stille → aus dem Off fliegt trotzdem ein Ball und trifft **das Schild**. |

**Visuelle Signatur — der Bowling-Payoff:** Bei großen Treffern fliegt QT nach
hinten in die Sitzreihe, die kleinen Mit-Fans fallen wie **Kegel** um. **„STRIKE!"**
knallt als Text ins Bild.

**Erlösung (Streak bricht = guter Tipp):** QT sitzt misstrauisch geduckt, Arme
überm Kopf … Schuss kommt … er **fängt den Ball einhändig ohne hinzusehen**,
wirft zurück und trifft aus Versehen den Schützen. **Rache.** Grinst in die Kamera.

### 6b. Die Party-Eskalation (Win-Streak)

| Streak | Szene |
|---|---|
| 1 | Reißt sich das Trikot vom Leib, schwenkt es überm Kopf, Bierbauch wackelt stolz |
| 2 | Steigt auf den Stadionsitz, tanzt, kippt sich selbst die Bierdusche über |
| 3 | Vereinsfarben auf den Bierbauch gemalt — spiegelverkehrt / Buchstaben vertauscht |
| 4 | Luftgitarre auf der Eckfahne, Bratwurst als Mikro, grölt den falschen Liedtext |
| 5 | Bierbauch-Chestbump mit wildfremdem Riesen-Ultra, beide Tränen der Rührung |
| 6+ | **Volleskalation:** steht auf der Bande, dirigiert die Kurve, Konfetti-Kanone aus dem Bierkrug, Humba-Blaskapelle, Wurst als Zepter, Sonnenbrille nachts |

**Weitere Bausteine:** Doppel-Bier-Halten · „Nummer 1"-Zeigefinger · Sitztanz ·
Laola ganz allein anfangen (und alle machen mit) · Doppeldaumen-in-die-Kamera-Brüllen ·
Schunkeln mit Fremden.

---

## 7. Gag-Bibliothek (Fan-Alltagspech, leicht zu illustrieren)

Die kleine, dicke Proportion trägt jeden Gag: zu klein, zu rund, kriegt alles ab.

**🌭 Essen & Bude**
- Wurst rutscht aus der Semmel — plopp, in den Dreck
- Senfstrahl zischt aufs frische Trikot
- Bierschaum ins Gesicht beim Anstoßen / Becher umgekippt
- Ketchup-Päckchen explodiert beim Aufreißen
- Pommes fallen runter → Möwe klaut sie sofort
- Bratwurst fällt hin, 3-Sekunden-Regel, isst sie trotzdem
- Glühwein verschüttet (Winterspiel), dampfender Fleck
- Brezel so salzig, dass das Gesicht implodiert

**🧣 Ausrüstung & Merch**
- Schal so lang, dass er drüber stolpert
- Doppelhalter-Fahne verheddert sich komplett
- Trikot verkehrt rum / Etikett vorn
- Gesichtsschminke verläuft im Regen (Vereinsfarben-Schlieren)
- Perücke/Hut fliegt beim Windstoß weg
- Tröte macht nur noch „pffft"
- Rassel fällt in Einzelteile auseinander

**🌧️ Wetter & Sitzplatz**
- Regenponcho reißt genau in der Mitte
- Setzt sich in die eine nasse Sitzschale im ganzen Block
- Zu klein → sieht nur den Rücken des Vordermanns
- Sonnenbrand nur auf der halben Nase
- Rutscht auf verschüttetem Bier aus, Beine in die Luft

**🥁 Fanblock & Soziales**
- Im Fanaufmarsch mitgeschleift, verschwindet in der Menge
- Jubelt aus Versehen beim **Gegentor** → ganzer Block dreht sich böse um
- La-Ola verpennt → steht als Einziger zwei Sekunden zu spät auf
- Beim Torjubel von der Fan-Traube begraben, nur die Mütze schaut raus
- Sitznachbar = Riesen-Ultra, QT verschwindet in dessen Jubel-Umarmung
- Wird vom Ordner (grundlos) als Einziger rausgezogen

**🏆 Gute Momente**
- Fängt einen Ball/ein Trikot → strahlt, viel zu groß für ihn
- Wird auf Händen getragen wie ein Pokal
- Tanzt auf dem Sitz, Konfetti
- Bekommt ein Autogramm quer übers ganze Gesicht

---

## 8. Ansprachen-Generator

QT redet **mit dem Tipper** — frech, schuldbewusst, mitleidheischend.
Aufbau: `Opener + Anrede-Nomen (+ Tail)`. Wenige Listen → hunderte Varianten.

### Opener

> Hey · Yo · Whatup · Was geht · Na · Ey · Servus · Moin · Digga · Sag mal ·
> Hör zu · Guck an · Ah, da ist ja · Aufgepasst · Boah · Läuft bei dir ·
> Meine Damen und Herren: · Alter/Alte · Na du · Pass auf

### Anrede-Nomen — wenn's LÄUFT

*♦ = geschlechtsneutral verwendbar*

> Waffe ♦ · Maschine ♦ · Rakete ♦ · Granate ♦ · Kanone ♦ · Bestie ♦ · Legende ♦ ·
> Naturgewalt ♦ · Wucht ♦ · Phänomen ♦ · Titan ♦ · Genie ♦ · Diamant ♦ · Orakel ♦ ·
> Sportskanone ♦ · Quotengott/Quotengöttin · Fußball-Prophet/-Prophetin ·
> Tippgott/Tippgöttin · Halbgott/Halbgöttin · Hellseher/Hellseherin ·
> König/Königin · Meister/Meisterin · Zauberer/Zauberin · Chef/Chefin ·
> Cheftipper/Cheftipperin

### Anrede-Nomen — wenn's KRACHT *(liebevoll-frech, nie fies)*

> Katastrophe ♦ · Naturkatastrophe ♦ · Pechvogel ♦ · Sorgenkind ♦ · Blindfisch ♦ ·
> Kommissar Zufall ♦ · Trümmerhaufen ♦ · Tippniete ♦ · Tipp-Nostradamus ♦ *(ironisch)* ·
> Wackelkandidat/-kandidatin · Pannen-Tipper/-in · Chaos-König/-Königin

### Geschlechts-Handhabung (fürs Datenmodell)

- **Die meisten Slang-Nomen sind unisex** (*Waffe, Maschine, Rakete, Granate,
  Legende, Bestie*) — größter Vorrat, kein Extra-Aufwand.
- **Nur „Titel" brauchen Varianten** (*Gott/Göttin, Prophet/Prophetin,
  König/Königin*). Feld pro Nomen: `{ neutral: true }` **oder** `{ m, w }`.
- **Default bei „divers"/keine Angabe: nur neutrale Nomen** → nie eine falsche Form.

### Fertige Zeilen

**LOB (läuft gut)**
- „Hey **Waffe**, du tippst verdammt gut!"
- „Was geht, **Fußball-Prophet/-Prophetin**!"
- „Whatup, **Maschine** — weiter so, mein Bierbauch dankt dir!"
- „Yo **Quotengott/-göttin**, ich sitz schon in der VIP-Loge!"
- „Servus **Legende**, die ganze Kurve grölt deinen Namen!"
- „Boah **Rakete**, wo hast du das gelernt?!"
- „Na **Granate** — drei Treffer, ich hab mir 'ne Wurst mit Kaviar bestellt!"
- „Läuft bei dir, **Titan** — ich hatte seit Tagen keine Beule mehr!"
- „Ey **Meister/Meisterin**, du machst mich noch berühmt!"
- „Aufgepasst, meine Damen und Herren: das **Orakel** höchstpersönlich!"

**ROAST (läuft schlecht)**
- „Na **Katastrophe**, weißt du eigentlich, wie oft ich diese Woche geflogen bin?"
- „Whatup, **Kommissar Zufall** — triffst du auch mal *absichtlich* was?"
- „Hey **Blindfisch**, mein linkes Auge ist wieder blau. Ratemal wegen wem."
- „Was geht, **Pechvogel** — die Wurst ist mir schon wieder in den Hals geschossen."
- „Yo **Sorgenkind**, der Torwart winkt mir zu, bevor er schießt."
- „Sag mal, **Trümmerhaufen**, tippst du mit dem Ellbogen?"
- „Ah, da ist ja unser **Tipp-Nostradamus** … das war Sarkasmus, ganz großer."

**NEUTRAL (Spieltag steht an)**
- „Moin **Chef/Chefin**, Spieltag ruft — Tipp steht?"
- „Servus **Sportsfreund/Sportsfreundin**, wer wird's heute?"
- „Na, **Held/Heldin des Tages** — überrasch mich."

---

## 9. Rückbezug & Loyalität — „Das ist DEINE Schuld"

Die Ebene, die alles verbindet: QTs Schicksal wird **explizit auf das Tippen
zurückgeführt**. Aus dem Maskottchen wird eine Beziehung mit Einsatz.

**😍 Läuft gut → QT profitiert**
- „Mir geht's blendend — und das nur wegen dir!"
- „Ich sitz dank dir in der Loge. Die bringen mir Wurst mit **Kaviar**."
- „Die ganze Kurve trägt mich auf Händen. Weil DU tippst wie ein Gott."
- „Ich hab seit drei Spieltagen keine einzige Beule. Weiter so!"
- „Mein Bierbauch glänzt, mein Schal ist frisch gewaschen. Danke, Chef/Chefin."

**😤 Läuft schlecht → QT verflucht dich**
- „Ich verfluche dich. Ganz höflich, aber ich verfluche dich."
- „Ich hab **drei blaue Augen**. Ich hab nur zwei. Rechne selbst."
- „Wegen dir kenne ich jeden Sanitäter im Stadion beim Vornamen."
- „Der Torwart zielt inzwischen **absichtlich** auf mich. Das ist dein Werk."
- „Trockene Semmel. Ohne Wurst. Vierter Spieltag in Folge. Danke auch."

**🔁 Transfer-Drohung (der stärkste Haken)**
- „Ich prüfe gerade meine Optionen. Nur damit du's weißt."
- „Ich hab einen **Transferantrag** ausgefüllt. Der Stift zittert noch."
- „Gibt's hier eine Wechselfrist? Frag für einen Freund. Der Freund bin ich."
- „Der QT von [Mitspieler] kriegt Kaviar. Ich krieg Beulen. Ich denk drüber nach."
- „Noch **ein** Tipp wie der, und ich zieh zum Nachbarn."
- „Ich hab mich woanders beworben. Die haben zurückgeschrieben. **Positiv.**"

**🤝 Versöhnung (Streak bricht)**
- „Ich hab den Transferantrag zerrissen. Komm her, du Legende."
- „Ich nehm alles zurück. Fast alles. Die Sache mit dem Blindfisch stimmt noch."
- „Okay. Okay! Wir versuchen's nochmal miteinander."

### Loyalitäts-Mechanik

Abgeleiteter Wert (kein neuer Spielzustand nötig): sinkt mit der Lose-Streak,
steigt mit Treffern.

| Loyalität | Auslöser | QT-Verhalten |
|---|---|---|
| hoch | Win-Streak / oberes Drittel | schwärmt, dankt, feiert |
| normal | Mittelfeld | frotzelt freundlich |
| niedrig | Lose-Streak ab ~3 | verflucht, droht |
| **kritisch** | Lose-Streak ab ~5 | **Transferantrag**, Vergleich mit anderen QTs |
| erholt | Streak bricht | Versöhnung, Antrag zerrissen |

> **Fairness-Hinweis:** Loyalität ist **reine Anzeige** — sie beeinflusst
> niemals Punkte oder Ranking. Das Scoring bleibt allein Sache der Engine
> (siehe Architektur-Regel 1 in `CLAUDE.md`).

---

## 10. Was sofort baubar ist — und was auf Daten wartet

| Kategorie | Status | Grund |
|---|---|---|
| Alle Register aus §3 | ✅ **sofort** | rein aus `scoreTip()` ableitbar |
| QT-Zustandsstufen (§5) | ✅ **sofort** | Rang aus `scoreLeaderboard` |
| Ansprachen + Rückbezug (§8/§9) | ✅ **sofort** | nur Ergebnis + Rang nötig |
| Eskalations-Leitern (§6) | ⚠️ **fast** | braucht nur einen **Streak-Zähler** (neu) |
| Nachspielzeit-/Comeback-Drama | ⛔ **wartet** | braucht **Torminuten/Timeline** — siehe `MATCH_DRAMA` |

**Streak-Zähler (einzige neue Zustandsgröße):** aufeinanderfolgende Runden mit
schwachem Ergebnis (`ebene === "keiner"`) bzw. mit Treffer. Ableitbar aus der
Runden-Historie. Gehört als reine Funktion in die Engine oder in `reactions.js`
— **nicht** in eine Komponente.

**Timeline-Bedarf:** Die Drama-Szenarien (späte Ausgleichstreffer, Comebacks)
brauchen Tor-Events mit Minute. Die kämen mit der geplanten API-Anbindung
(Roadmap-Punkt „echte Quoten-API", `README.md`) — Reaktions-System und
Daten-Anbindung sollten deshalb **zusammen** geplant werden.

---

## 11. Rechtliches / Produktion (offen)

- **KI-generierte Clips sind schwach schützbar.** Rein maschinell erzeugte Werke
  genießen in vielen Rechtsordnungen keinen oder nur schwachen Urheberrechts-
  schutz. Für QT als Marken-Charakter heißt das: die **Figur selbst muss
  menschlich gestaltet** sein (Design-Sheet, Proportionen, Farbschema) — KI
  höchstens als Animations-Werkzeug, nie als Erfinder der Figur.
- **Vor jedem Tool-Abo prüfen:** kommerzielle Nutzung *in einer monetarisierten
  App* erlaubt? Wem gehört der Output? Exklusivität? Rechte bleiben nach
  Kündigung bestehen? Freistellung bei Rechtsverletzung?
- **Produktionsweg-Empfehlung:** Für eine sich ewig wiederholende Reaktions-
  Bibliothek ist ein **geriggter Charakter** (Rive/Live2D/AE) die bessere Wahl —
  perfekte Konsistenz, billige Varianten, passt exakt zum Farb-Layer-Konzept aus
  §4, voll ownbar. KI-Video bleibt Option für seltene Jackpot-Spezialclips.

---

## 12. Nächste Schritte

1. **Design-Sheet für QT** — Turnaround, Mimik-Set, Proportionen, Farb-Token.
   Blockiert nichts und ist Startpunkt für jeden Produktionsweg.
2. **Streak-Zähler** in der Logik ergänzen (+ Test) → schaltet §6 frei.
3. **Ansprachen-Listen** aus §8/§9 als strukturierte Daten anlegen
   (Opener[], Nomen[] mit Geschlechts-Feld, Stimmungs-Buckets).
4. **Erste Clips** in der Reihenfolge produzieren: `daneben` → `exakt` →
   `hauchduenn` (die drei häufigsten Ausgänge zuerst).
5. **Timeline-Szenarien** erst nach der API-Anbindung (`MATCH_DRAMA` aktivieren).
