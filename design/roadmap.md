# Roadmap & Pipeline

Offene Feature-Ideen, grob nach Aufwand. Gebaut wird in einzelnen, testbaren
Schritten (Engine zuerst, dann Store, dann UI, dann Browser-Check + Commit).

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

Test-Stand: 283 grün, Build sauber.

## Offen

### Per-Team-/Derby-Regeln (Admin-Ebene) — NEU
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

### Aufhol-Mechanismus (Anschluss halten) — NEU
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
- Elfmeterschießen-Duell (steht im Hub noch als „bald")
- **Benachrichtigungen** ✅ ERLEDIGT — `notify.js` + `/benachrichtigungen`:
  nur „neuer Spieltag" und „ungetipptes Spiel beginnt in X h", mit Nachtruhe
  und Tagesobergrenze. Offen bleibt der echte VERSAND (Web-Push/App).
