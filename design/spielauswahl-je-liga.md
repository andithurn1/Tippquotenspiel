# Spielauswahl JE LIGA — Spec für Schritt 3 des Oberflächen-Umbaus

**Geschrieben 08.08.2026, Account 1.** Grundlage: Andis Konzept vom
07.08.2026 (iPhone-Durchgang), Punkt 3 — „Sonderregeln je Liga".
Schritt 1 (große Zeilen) und Schritt 2 (Ligen aufklappbar) liegen auf
`claude/koordinierte-arbeitsweise-fe6w1v`.

⚠️ **Diese Datei ist eine Spec, kein Baubericht.** Sie ist die nach Push-Regel 3
verlangte ANKÜNDIGUNG: der Umbau ändert das Regelwerk und gehört deshalb vor
dem ersten Commit in den Kanal.

⛔ **Keine Balance-Arbeit.** Hier steht, was einstellbar wird — nicht, welche
Zahlen darin gut sind (`CLAUDE.md`, Block ganz oben).

---

## 1. Was Andi will

Unter den Mannschaften einer Liga ein Knopf, der ein Unterfenster öffnet:

- **Derby-Vorauswahl** je Liga,
- **„Abstiegskampf"** — letzte 5 Spieltage, Plätze 14–18 werden mitgetippt,
- weitere Sonderregeln, offen nach oben,
- dazu **einzelne Begegnungen von Hand**, mit unseren Derby-Empfehlungen.

## 2. Der Kern des Problems, in einem Satz

`rules.spiele` gilt heute für die **ganze Runde**. „Je Liga" heißt, es muss je
Wettbewerb gelten — und sobald zwei Stellen beantworten, welche Spiele zur
Runde gehören, gibt es zwei Wahrheiten.

Heute (`src/lib/spielauswahl.js`, `DEFAULT_SPIELE`):

```
modus · teams · matchIds · spieltagVon · spieltagBis · wettbewerbe · phasen
```

Alle Dimensionen wirken UND-verknüpft, `passtSpiel` prüft sie nacheinander.

## 3. Vorgeschlagenes Modell: ein Deckel und Ausnahmen

**Nicht** `rules.spiele` durch „ein Auswahl-Objekt je Liga" ersetzen. Das
zerschlägt den einfachen Fall („alle Spiele") in sieben gleich aussehende
Objekte und macht jeden Creator-Code siebenmal so lang.

Stattdessen: das heutige Objekt bleibt **die Runden-weite Vorgabe**, und
darunter kommt eine Karte von ABWEICHUNGEN je Wettbewerb.

```js
rules.spiele = {
  ...DEFAULT_SPIELE,          // gilt weiter für alles, unverändert
  jeWettbewerb: {             // NEU, leer = alles wie bisher
    bl:  { teams: [...], spieltagVon: 30, zonen: [{ von: 14, bis: 18 }] },
    cl:  { phasen: ["af", "vf", "hf", "fin"] },
  },
}
```

Drei Eigenschaften, die diese Form trägt:

1. **Abwärtskompatibel.** Fehlt `jeWettbewerb`, ist das Verhalten bitgleich
   zu heute. Kein Migrationsschritt, keine alten Creator-Codes, die brechen.
2. **Kurz im Code.** Nur Abweichungen werden gespeichert — der
   Creator-Code wächst nur um das, was der Admin wirklich je Liga gesetzt hat.
3. **EINE Stelle entscheidet.** `passtSpiel` bleibt der einzige Ort: es
   ermittelt zuerst den Wettbewerb des Spiels, mischt die Abweichung über die
   Vorgabe und prüft dann wie bisher. Kein Screen rechnet mit.

⚠️ **Die Regel für das Mischen muss VOR dem ersten Test festgelegt sein**, sonst
läuft sie auseinander: **Feld für Feld überschreiben, nicht tief mischen.** Wer
`bl.teams` setzt, ersetzt die runden-weite Vereinsliste für die Bundesliga —
er ergänzt sie nicht. Alles, was er nicht setzt, gilt weiter aus der Vorgabe.

## 4. Die neue Dimension: Tabellenzone

`rules.spiele` kennt Vereine, Spieltag-Bereich, Liste, Wettbewerbe, Phasen —
**keine Zone**. Für den Abstiegskampf fehlt genau das.

```js
zonen: [{ von: 14, bis: 18 }]   // Plätze, 1-basiert
```

🔴 **Andis Frage dazu ist beantwortet und verbindlich:** Tabellenplatz-Regeln
gelten **nur zwischen Spieltagen**, nie zwischen zwei Spielen desselben
Spieltags. Wer Freitag tippt, sähe sonst eine andere Tabelle als wer Sonntag
tippt — und damit eine andere Runde.

**Präzedenz ist das Big Game, und sie ist zu übernehmen, nicht nachzuerfinden:**
`spieltagOeffnen` friert beim ÖFFNEN einen objektiven WERT im Snapshot ein
(`snap.bigGameWert`), das URTEIL fällt jede Runde selbst mit ihrer eigenen
Schwelle. Hier heißt das:

- beim Öffnen des Spieltags je Spiel **`snap.tabellenPlatz = { home, away }`**
  ablegen (der Platz VOR diesem Spieltag),
- ob das in die Zone fällt, entscheidet jede Runde beim Filtern mit ihren
  eigenen `zonen`.

⚠️ Ein Häkchen „dieses Spiel ist Abstiegskampf" im Snapshot wäre derselbe
Fehler, den das Big Game schon einmal hatte: `matches` ist global, dieselbe
Begegnung gehört zu vielen Runden — die zuerst öffnende Runde entschiede für
alle mit.

⚠️ **Ohne Tabellenstand gilt die Zone als NICHT erfüllt** (Spiel fällt raus),
nicht als erfüllt. Sonst zöge ein fehlendes Feld stillschweigend den ganzen
Spielplan in die Runde.

## 5. Was es schon gibt — nicht neu bauen

| Gebraucht | Liegt in |
|---|---|
| Derby-Listen je Liga, inkl. 2. Bundesliga | `DERBYS` / `findDerby` (`bundesligaData.js`) |
| Tabellenzonen (oben Titel, unten Abstieg, Mitte nichts) | `bigGame.js` |
| Einfrieren beim Öffnen | `spieltagOeffnen` (Muster `snap.bigGameWert`) |
| Vereinsliste je Liga | `vereineVon` / `LIGEN` (`ligen.js` ist DIE eine Liste) |
| Aufklappbare Zeile mit Stand | `GrosseZeile` in `Spielerstellung.jsx` (Schritt 1) |
| Liga-Zeile mit `3/18` | `Spielerstellung.jsx`, Team-Block (Schritt 2) |

## 6. Reihenfolge des Baus

1. `spielauswahl.js`: `jeWettbewerb` in `DEFAULT_SPIELE`, `sanitizeSpiele`
   (Abweichungen ebenfalls sanitisieren, unbekannte Wettbewerbs-Keys weg),
   `passtSpiel` mischt Vorgabe + Abweichung. **Tests zuerst**, besonders
   „ohne `jeWettbewerb` ändert sich nichts".
2. `zonen` als eigene Dimension, mit `snap.tabellenPlatz` in
   `spieltagOeffnen` — getrennter Commit, das ist die Fairness-Kante.
3. Creator-Code: `encodePreset` nimmt `rules.spiele` schon mit; prüfen, dass
   die Delta-Bildung eine leere `jeWettbewerb`-Karte NICHT mitschreibt.
4. `presetMerge.js`: der Test, der prüft, dass die sieben Aspekte ALLE
   Regel-Felder abdecken, schlägt bei einem neuen Feld an — das ist Absicht.
5. `stufenAbdeckung.js`: die neuen Felder brauchen eine Stufe 1/2 oder eine
   Begründung in `NUR_PROFI`. Ein Feld, das nur in der Profi-Ansicht steht,
   ist nicht fertig.
6. Erst dann die Oberfläche: je Liga-Zeile ein Knopf „Sonderregeln", der ein
   Unterfenster mit Derby-Vorauswahl, Zonen und Handauswahl öffnet.

## 7. Abnahmen, die diesen Umbau treffen

`npm test` (Zahl darf nur STEIGEN) · `npm run stufen` (Erreichbarkeit der neuen
Felder) · `npm run greift` (bewegt eine Liga-Abweichung wirklich die Auswahl?)
· `npm run anzeige` (steht dieselbe Spielzahl überall) · `npm run lint` ·
`npm run sicht` · `npm run gleich`. Dazu die Gegenprobe, die dreimal an einem
Tag etwas gefunden hat: neue Voreinstellungen gegen `reglerWarnung.js` laufen
lassen.

⚠️ Und die Messung, die kein Test sieht: **wie viele Spiele bleiben übrig?**
Eine Liga-Abweichung, die versehentlich als Filter über ALLE Ligen wirkt, ist
grün getestet und trotzdem falsch. Vor und nach dem Umbau die Spielzahl im
Kasten unter der Wettbewerbs-Auswahl vergleichen — bei leerer `jeWettbewerb`
muss sie identisch sein (heute 1943 von 1943).
