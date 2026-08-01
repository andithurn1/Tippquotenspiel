# Joker-Grundform — die Form, die jeder Joker trägt

**Spec + Umsetzungsplan.** Account 2 (Andre), 2026-07-31. Setzt L12–L15 aus
`design/joker-inventar.md` um. **Vorgezogen auf Anweisung des Nutzers**, mit
seiner Begründung: es ist zuerst eine Verständlichkeits-Entscheidung.

> **Der Punkt:** Sechs Dimensionen wiederholen sich bei JEDEM Joker — wer darf,
> wer sieht es, wann verfällt er, worauf gilt er, bis wann änderbar, wie viele
> auf ein Spiel. Heute stecken sie einzeln im Duell-Joker oder nirgends. Wenn
> jeder neue Typ sie neu erfindet, hat der Admin am Ende elf Sonderfälle statt
> eines Systems.

---

## 1. ⚠️ Die Entwurfsentscheidung: EINE Karte, nicht ein Feld je Modul

Der naheliegende Weg wäre ein `basis`-Unterobjekt in jedem Joker-Regelblock
(`rules.duell.basis`, `rules.joker.basis`, …). **Das wird verworfen.**

Stattdessen **eine Karte, geschlüsselt nach Joker-Art**:

```js
rules.jokerBasis = {
  standard:      { … },   // gilt für alle Arten
  "duell.klau":  { … },   // überschreibt einzelne Felder
}
```

Drei Gründe:

1. **Verständlichkeit — der eigentliche Auftrag.** Der Admin sieht EINEN Bereich
   „so gelten deine Joker" statt derselben sechs Fragen verstreut über sechs
   Abschnitte. Er stellt sie einmal ein und weicht nur dort ab, wo er will.
2. **Ein Schlüsselraum, drei Karten.** `jokerBudget.preise` und
   `limitKlassen.mitglieder` sind bereits über `jokerArt` geschlüsselt
   (`JOKER_ARTEN` in `jokerBudget.js`). Eine dritte Karte über denselben
   Schlüsseln ist ein Modell, das man einmal versteht — verstreute
   `basis`-Felder wären ein zweites.
3. **Der Creator-Code bleibt klein.** Nur Abweichungen vom `standard` werden
   gespeichert, nicht sechs Vollobjekte.

`basisFuer(jokerArt, rules)` legt `standard` und die Art-Abweichung übereinander
und liefert die fertige Form. **Nur diese Funktion darf die Karte lesen** — kein
Modul greift direkt auf `rules.jokerBasis[...]` zu, sonst entstehen zwei
Auflösungswege.

---

## 2. Die sechs Dimensionen

### 2.1 `wer` — wer den Joker überhaupt einsetzen darf

| Wert | Parameter | Bedeutung |
|---|---|---|
| `alle` | — | Vorgabe. |
| `abPlatz` | `werWert` | Nur ab Tabellenplatz N abwärts. |
| `abRueckstand` | `werWert` | Nur wer mindestens N Punkte hinter Platz 1 liegt. |
| `adminFreigabe` | — | Der Admin schaltet je Spieltag frei. |

⚠️ **`wer` ≠ `duell.zielWahl`.** `wer` regelt, WER einsetzen darf; `zielWahl`
regelt, AUF WEN. Zwei verschiedene Fragen, die sich leicht verwechseln lassen —
die Oberfläche muss sie sichtbar auseinanderhalten.

⚠️ **Abgrenzung zu `limitKlassen`, sonst zwei Wahrheiten:**

| | Grundform `wer` | Limitierungsklasse |
|---|---|---|
| Frage | Darf ich diese Art *überhaupt*? | Wie *oft*, geteilt mit welchen anderen Arten? |
| Gilt für | genau eine Joker-Art | eine benannte Gruppe |
| Zählt | nichts | Einsätze gegen ein Kontingent |

Beide können auf dieselbe Bedingung gehen (z. B. Rückstand). Das ist erlaubt,
aber verwirrend — `konflikte()` meldet es als **doppelte Absicherung** mit dem
Hinweis, dass eine davon genügt. Keine Sperre, ein Hinweis.

### 2.2 `sicht` — wer den Einsatz wann sieht

`sofort` · `nachAnpfiff` (Vorgabe) · `nachAuswertung`

Löst `duell.ansage` und `duell.oeffentlich` ab; die beiden wandern beim
Einhängen hierher. ⚠️ Verborgen ist immer nur die **Ansage**, nie der
**Zeitpunkt** — gesetzt wird jeder Joker vor Anpfiff.

### 2.3 `verfall` — was mit einem ungenutzten Joker geschieht

`periode` · `saison` (Vorgabe) · `wandert`

⚠️ **Nicht dasselbe wie `budget.verfall`.** Dort verfällt GELD, hier ein
BERECHTIGUNG. Ein Spieler kann Budget haben und trotzdem keinen Joker dieser Art
mehr besitzen. Beide Texte müssen das benennen, sonst sucht jemand den Fehler
im falschen Regler.

### 2.4 `bedingung` — worauf der Joker überhaupt gilt

```js
bedingung: { minQuote: null, maxQuote: null, wettbewerbe: [], phasen: [] }
```

🔴 **Die wichtigste Festlegung des ganzen Moduls:** `minQuote`/`maxQuote` messen
die **Außenseiter-Siegquote des SPIELS**, nicht die Quote des getippten
Ausgangs.

Begründung ist Architektur-Regel 4 in `CLAUDE.md` („Anker immer auf der Quote
des REALEN Ergebnisses, nie auf der getippten — sonst wird die Nähe-Belohnung
farmbar"). Genau dieselbe Falle: hinge die Bedingung am eigenen Tipp, tippte man
einen aussichtslosen Ausgang, nur um den Joker freizuschalten, und legte ihn
dann auf das, was man wirklich erwartet. Die Spiel-Quote ist objektiv und für
alle gleich.

`bedingung` ist der saubere Ersatz für den verworfenen Quoten-Joker (L1): sie
macht Mut zur **Bedingung**, ohne die Quote selbst anzufassen — der Snapshot
bleibt eine Wahrheit je Spiel, der RLS-Trigger bleibt baubar.

### 2.5 `widerruf` — bis wann änderbar

`bisAnpfiff` (Vorgabe) · `bisStunden` (+`widerrufStunden`) · `sofortVerbindlich`

⚠️ `bisStunden` zählt Stunden **VOR** Anpfiff. Nie darüber hinaus — dieselbe
Kante wie der Snapshot und das Tippfenster.

### 2.6 `stapeln` — wie viele Joker auf DASSELBE Spiel

Zahl, Vorgabe 1. Zählt **über alle Arten hinweg**, denn das ist die
Fairness-Frage („dieses eine Spiel entscheidet alles"). Grenzen je Art gehören
in eine Limitierungsklasse, nicht hierher.

---

## 3. Umsetzung — `src/lib/jokerBasis.js`

Exportiert:

- Kataloge `WER`, `SICHT`, `VERFALL`, `WIDERRUF` als `{ key, label, desc }`.
- `BASIS_LIMITS`, `DEFAULT_BASIS` (Abschnitt 2).
- `sanitizeBasis(partial)` — Muster `sanitizeDuellJoker`, Felder fallen einzeln
  auf die Vorgabe zurück.
- `sanitizeJokerBasisKarte(karte)` — die ganze Karte. Unbekannte Schlüssel, die
  weder `standard` noch eine `JOKER_ARTEN`-Art sind, fliegen raus.
- `basisFuer(jokerArt, rules)` → fertige Form aus `standard` + Abweichung.
- `darfEinsetzen(basis, userId, kontext)` → `{ erlaubt, grund }`.
  `kontext = { board, aktuellerSpieltag, adminFreigaben }`.
- `erfuelltBedingung(basis, snap, wettbewerb, phase)` → `{ erlaubt, grund }`.
  Die Außenseiter-Siegquote wird aus `snap.winner` gelesen (höhere der beiden
  Siegquoten) — dieselbe Quelle, aus der `balanceSim.js` seine Spielarten zieht.
- `darfWiderrufen(basis, jetzt, anpfiff)` → bool.
- `beschreibeBasis(basis)` → ein Satz für die UI.
- `konflikte(rules)` → doppelte Absicherung mit `limitKlassen` (2.1),
  `sofortVerbindlich` zusammen mit `sicht: "sofort"` (der Einsatz ist dann
  öffentlich UND unumkehrbar — legitim, aber hart; nur ein Hinweis).

### Pflichttests

1. `basisFuer` legt `standard` und Art-Abweichung korrekt übereinander; eine
   Art ohne Eintrag bekommt exakt `standard`.
2. Jeder der vier `wer`-Werte einmal, inklusive `adminFreigabe` ohne Freigabe.
3. `bedingung.minQuote` prüft die **Spiel**-Quote, nicht die getippte — Test mit
   einem Snapshot, bei dem beide auseinanderfallen. **Der wichtigste Test.**
4. `maxQuote` schließt Favoritenspiele aus.
5. `wettbewerbe`/`phasen` filtern; leere Liste heißt „alle".
6. `darfWiderrufen` bei allen drei Werten, inklusive `bisStunden` genau auf der
   Kante — und **nie nach Anpfiff**.
7. `sanitizeJokerBasisKarte` wirft unbekannte Schlüssel raus und lässt
   `standard` plus gültige Arten durch.
8. `konflikte` meldet die doppelte Absicherung.

---

## 4. Abnahme (31.07.) — zwei Nachbesserungen, drei Fragen beantwortet

Kern abgenommen und nachgemessen: der Merge legt `standard` und Abweichung
korrekt übereinander, `erfuelltBedingung` nimmt **strukturell keinen Tipp**
entgegen (damit ist die Bedingung nicht farmbar), `darfWiderrufen` greift bei
allen drei Werten und nie über den Anpfiff hinaus.

### K1 🟠 — eine Einstellung, sechs Meldungen

Gemessen: EIN Verstoß im `standard` (`sicht: "sofort"` +
`widerruf: "sofortVerbindlich"`) erzeugt **sechs** Meldungen — eine je
Joker-Art, weil `basisFuer` ohne Abweichung exakt den `standard` liefert.

Die Begründung des Umsetzers („wie `pruefeEinsatz`, das jede Klasse einzeln
nennt") trägt hier **nicht**. Dort ist jede Klasse eine eigene Regel, die der
Admin geschrieben hat. Hier ist es **eine** Einstellung, sechsmal
wiedergegeben. Das verdeckt, statt zu erklären — und damit genau das Gegenteil
des Zwecks, für den die Grundform vorgezogen wurde.

**Festlegung:**
- Verstoß stammt aus dem `standard` → **EINE** Meldung, `bereich: "standard"`.
- Verstoß stammt aus einer Art-**Abweichung** → eine Meldung je betroffener
  Art, `bereich: "<jokerArt>"`.
- Gilt beides, wird beides gemeldet — sie haben verschiedene Ursachen und
  verschiedene Korrekturen.

### K2 🟠 — `werWert` braucht zwei Bereiche

`BASIS_LIMITS.werWert` ist `{ min: 0, max: 500 }` für `abPlatz` **und**
`abRueckstand` gemeinsam. Für „ab Tabellenplatz N" ist 500 sinnlos — und
`*_LIMITS` speist in diesem Projekt die UI-Regler (`RULE_LIMITS` tut es
ausdrücklich). Ein Regler bis 500 für eine Tabellenposition ist unbedienbar.

Der genannte Grund ist berechtigt: beim Bereinigen einer isolierten
Art-Abweichung ist noch nicht bekannt, welches `wer` nach dem Merge gilt.
**Die Lösung ist der Zeitpunkt, nicht ein gemeinsamer Bereich.**

**Festlegung:**
- `BASIS_LIMITS.abPlatz = { min: 1, max: 50, step: 1 }`
- `BASIS_LIMITS.abRueckstand = { min: 0, max: 500, step: 1 }`
- Beschnitten wird **im Merge** (`basisFuer`), denn dort sind `wer` und
  `werWert` beide sicher bekannt. Die sparse Abweichung reicht den Rohwert
  unbeschnitten durch — das ist kein Versäumnis, sondern die einzige Stelle,
  an der er noch mehrdeutig ist.

### Beantwortete Fragen

1. **`adminFreigaben` = `[{ userId, spieltag }]`** — bestätigt. Rohe Liste, die
   die Funktion selbst nach `aktuellerSpieltag` filtert, wie
   `bisherigeEinsaetze` in `duellJoker.zulaessigeZiele`. Eine vorgefilterte
   Liste würde die Filterregel an den Aufrufer verschieben und wäre die zweite
   Wahrheit.
2. **Übrige `BASIS_LIMITS`** — bestätigt: `quote` an `EREIGNIS_LIMITS.abQuote`
   angelehnt, `widerrufStunden` 0–168 (Vorgabe 24), `stapeln` 1–10.
3. **Die gefundene Testassertion** (`toHaveProperty("duell.klau")` liest den
   Punkt als Pfad) war ein echter Fund — der Test wäre sonst leer durchgelaufen.
   Die Umstellung auf die Array-Form ist richtig.

---

## 5. Erweiterung (31.07., zweite Runde) — sechs weitere Dimensionen

Der Nutzer hat nachgefragt, was der Grundform noch fehlt. Ergebnis: eine
Invariante und fünf neue Felder.

### 5.0 🔴 INVARIANTE: kein Joker ohne Tipp

**Ein Joker wird zusammen mit dem Tipp gesetzt. Wer den Spieltag nicht tippt,
kann dort nichts setzen.**

Das ist **keine Einstellung**, sondern eine Regel des Spiels — Entscheidung des
Nutzers. Sie löst eine Frage auf, die ich als sechste Dimension vorschlagen
wollte („was passiert mit einem gesetzten Joker bei Versäumnis?"): die Frage
kann gar nicht mehr entstehen.

Zwei Nebeneffekte, beide erwünscht:
- Niemand kann einen Joker auf einem Spieltag **reservieren**, den er nicht
  mitspielt.
- ⚠️ **Auch der Ersatz-Tipp aus `versaeumnis` trägt keinen Joker.** `autoTip.js`
  ist ausdrücklich „der zahmste" und durch Tests abgesichert, dass er nie mehr
  zahlt als ein mutiger eigener Treffer. Ein Joker darauf bräche genau diese
  Zusicherung. Damit entfällt auch der „Auto-Einsatz" als Idee — er hätte nur
  auf einem Ersatz-Tipp Sinn ergeben.

Umsetzung: `darfEinsetzen` bekommt `hatGetippt` in den `kontext` und lehnt ohne
Tipp ab, mit klarem Grund.

### 5.1 `symmetrie` — wirkt der Joker auch nach unten?

Heute fest verdrahtet: `CLAUDE.md` hält fest „Wirkt symmetrisch, also auch auf
ein Minus". Jeder Joker ist damit ein **Einsatz**. Das ist eine
Architektur-Entscheidung, die kein Admin sehen oder ändern kann.

| Wert | |
|---|---|
| `beidseitig` | Verdoppelt Gewinn UND Verlust. **Vorgabe, heutiges Verhalten.** |
| `nurGewinn` | Nur nach oben — risikolos. |
| `nurVerlust` | Nur nach unten: der **Malus-Joker**, den ein Mitspieler verhängt. |

`nurVerlust` ist nebenbei die saubere Form für das, was der Block-Joker heute
umständlich löst.

### 5.2 `bestand` — wie viele darf man HALTEN

Geregelt sind bisher: wie viele man einsetzen darf (Limitklassen) und was sie
kosten (Shop). Nicht geregelt: wie viele im Inventar liegen dürfen.

Eigene Frage. Ohne die Grenze sammelt jemand die halbe Saison und feuert am
Schluss alles ab. `0` = unbegrenzt.

### 5.3 `kasseSichtbar` — sehen die anderen meinen Bestand?

`jokerPlan.sichtbarkeit` regelt den Joker-KALENDER. Nicht geregelt: ob
**Münzstand und Inventar** offen liegen.

Reine Sozial-Entscheidung, ändert die Runde stark: bei offener Kasse stellt man
sich auf jemanden ein, der noch zwei Klau-Joker hat. Bei verdeckter ist jeder
Einsatz eine Überraschung.

### 5.4 `umfang` wandert aus `duell` hoch

`duell.umfang` (`einSpiel` · `nSpiele` · `spieltag`) plus `spieleProEinsatz` und
`wahl` stecken heute nur im Duell-Joker. Die Frage stellt **jeder** Joker.

⚠️ Nach dem Einhängen muss `duell` diese Felder abgeben — sonst zwei Wahrheiten,
gleiche Behandlung wie `ansage`/`oeffentlich`.

### 5.5 `abklingzeit` — Cooldown

Siehe `design/joker-ausloeser.md` Abschnitt 8. Spieltage Sperre nach einem
Einsatz DIESER Art. `duell.abstand` fällt dadurch weg.

### 5.6 Verworfen, mit Begründung

| Idee | Warum nicht |
|---|---|
| **Übertragbarkeit an Mitspieler** | Absprachen — dieselbe Begründung wie beim Joker-Handel (`joker-inventar.md` 4.4). |
| **Unverträglichkeit zwischen Arten** („Joker und Duell nie auf demselben Spiel") | Limitklassen decken das fast ab; ein zweiter Mechanismus wäre Überbau. |
| **Anzeige-Details der Wirkung** | Keine Regel, sondern Optik. |
| **Auto-Einsatz** | Hätte nur auf einem Ersatz-Tipp Sinn — und der darf keinen Joker tragen (5.0). |

### Nicht Teil dieses Schritts

Das Einhängen (`engine.js`, `presetMerge.js`) und das Ablösen von
`duell.ansage`/`duell.oeffentlich` — eigener Schritt, damit die Umstellung
bestehender Regelwerke für sich prüfbar bleibt.
