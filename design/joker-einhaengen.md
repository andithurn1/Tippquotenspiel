# Einhängen der Joker-Ökonomie ins Regelwerk

**Spec + Umsetzungsplan.** Account 2 (Andre), 2026-07-31.

Sechs Module liegen fertig und getestet neben der Engine: `duellJoker`,
`jokerBudget`, `limitKlassen`, `jokerBasis`, `jokerBibliothek`, `aufwand`.
**Keines davon ist an `engine.js` angeschlossen.** Dieser Schritt ist der erste,
der bestehende Dateien anfasst.

> ⚠️ **Push-Regel:** Änderungen an `engine.js` sind laut `COORDINATION.md` ein
> „großer Push" und werden im Kanal angekündigt. Andi ist bis Mittwoch am
> Wochenlimit — angekündigt wird trotzdem, gewartet wird nicht (so ausdrücklich
> in seiner Übergabe).

---

## 1. Was ins Regelwerk kommt

Vier neue Blöcke in `DEFAULT_RULES`, alle **aus** bzw. leer:

| Feld | Vorgabe | Sanitize |
|---|---|---|
| `duell` | `{ ...DEFAULT_DUELL }` (enabled: false) | `sanitizeDuellJoker` |
| `budget` | `{ ...DEFAULT_BUDGET }` (enabled: false) | `sanitizeBudget` |
| `limitKlassen` | `[]` | `sanitizeLimitKlassen` |
| `jokerBasis` | `{ standard: { ...DEFAULT_BASIS } }` | `sanitizeJokerBasisKarte` |

`sanitizeRules` delegiert an die vier — **keine Logik nachbauen**, dasselbe
Muster wie die bestehende Delegation an `sanitizeSaisonform` und
`sanitizeSaison`.

## 2. Die Verlaufskette

Heute (`engine.js:912`):
```js
return applyCatchup(applySaisonform(roh, rules), rules);
```

Neu:
```js
export function scoreLeaderboardHistory(entries = [], rules = DEFAULT_RULES, einsaetze = []) {
  …
  return applyCatchup(applySaisonform(applyDuellJoker(roh, rules, einsaetze), rules), rules);
}
```

⚠️ **`einsaetze` ist heute immer leer.** Die gesetzten Duell-Joker kommen später
aus dem Store; bis dahin ist `applyDuellJoker` ein No-op, der den Verlauf
unverändert zurückgibt (so gebaut und getestet). Der dritte Parameter wird
trotzdem JETZT eingeführt — sonst müsste später jede Aufrufstelle noch einmal
angefasst werden, und die Kette bliebe bis dahin ungetestet.

Reihenfolge-Begründung steht in `design/duell-joker.md` Abschnitt 4 und ändert
sich nicht: Duell zuerst (Überweisung innerhalb eines Spieltags), Saisonform
danach (wiegt ganze Spieltage), Catchup zuletzt (reagiert auf den Rückstand,
der zählt).

## 3. `brauchtVerlauf`

Heute prüft es `aufholen` und `saisonform`. **`duell.enabled` muss dazu** —
sonst rechnet `getLeaderboard` bei aktivem Duell-Joker ohne Verlauf, und die
Überweisungen fielen still unter den Tisch.

```js
export function brauchtVerlauf(rules = DEFAULT_RULES) {
  if (rules?.aufholen?.enabled === true) return true;
  if (sanitizeDuellJoker(rules?.duell).enabled) return true;
  const sf = sanitizeSaisonform(rules?.saisonform);
  return sf.kurve !== "flach" || sf.streich > 0;
}
```

## 4. `presetMerge.js` — alle vier in den BESTEHENDEN Joker-Aspekt

🔴 **Kein neuer Aspekt.** Die vier Felder wandern in
`"Modifikatoren & Joker"` (heute
`["joker", "teamMods", "modCap", "bigGame", "ereignisse", "wettbewerbe"]`),
also neu:

```js
keys: ["joker", "teamMods", "modCap", "bigGame", "ereignisse", "wettbewerbe",
       "duell", "budget", "limitKlassen", "jokerBasis"]
```

Begründung — sie steht schon im Modul selbst: *„`ereignisse` gehört hierher,
weil es denselben Joker-Topf speist — Modifikatoren übernimmt man als Ganzes
oder gar nicht."* Genau das gilt hier stärker: `budget` bepreist **alle**
Joker-Arten, `limitKlassen` deckelt sie, `jokerBasis` gibt ihnen ihre Form. Wer
die Ökonomie ohne die Joker übernähme (oder umgekehrt), bekäme eine
Kombination, die niemand vermessen hat — und genau davor sollen die Aspekte
schützen.

Der Abdeckungstest in `presetMerge.test.js` schlägt sonst an. Das ist der
eingebaute Wecker, nicht ein Problem.

## 5. `duell.ansage` und `duell.oeffentlich` werden abgelöst

Die Grundform hat `sicht` (`sofort` · `nachAnpfiff` · `nachAuswertung`) und
deckt beide Felder ab. Zwei Wahrheiten über dieselbe Frage bleiben nicht stehen.

- Beide Felder **ersatzlos aus `DEFAULT_DUELL` und `sanitizeDuellJoker`
  entfernen**.
- Die zugehörigen Tests in `duellJoker.test.js` entfernen bzw. anpassen —
  **hier ausdrücklich erlaubt**, weil es eine gewollte Entfernung ist, kein
  gekippter Test.
- Kopfkommentar von `duellJoker.js` nachziehen: die Sichtbarkeit liegt jetzt in
  `jokerBasis.sicht`.
- ⚠️ **Keine Migration nötig.** Der Duell-Joker ist nie ausgeliefert worden, es
  gibt keine Regelwerke im Umlauf, die diese Felder tragen.

## 6. ⚠️ Creator-Code: messen, nicht vermuten

`encodePreset` ist rohes `JSON.stringify` → Base64, **ohne Abzug der
Vorgabewerte** (`engine.js:917`). Jedes neue Regelfeld wächst damit in JEDEN
Creator-Code hinein — auch in Codes von Runden, die keinen einzigen Joker
nutzen.

`jokerPlan.js` hält im Kopf ausdrücklich fest, dass der Code kurz bleiben soll
(„gespeichert wird die REGEL, nicht die ausgerollte Liste").

**Aufgabe:** die Länge von `encodePreset(sanitizeRules(PRESETS[0].rules))`
**vorher und nachher messen und im Bericht nennen.** Nicht optimieren — nur
beziffern. Ob daraus ein Delta-Encoding folgt, entscheide ich danach.

---

## 7. Pflichttests

1. `sanitizeRules({})` liefert die vier neuen Blöcke in ihrer Vorgabe.
2. Ein Regelwerk mit Müll in allen vier Blöcken übersteht `sanitizeRules` und
   ergibt die Vorgaben.
3. `scoreLeaderboardHistory(entries, rules)` **ohne** dritten Parameter
   verhält sich exakt wie vorher (Regression: bestehende Erwartungen bleiben).
4. `scoreLeaderboardHistory(entries, rules, [])` ebenso.
5. `brauchtVerlauf` ist `true` bei `duell.enabled: true` und sonst unverändert.
6. `presetMerge`: ein Merge, der den Joker-Aspekt übernimmt, nimmt `duell`,
   `budget`, `limitKlassen` und `jokerBasis` **mit**.
7. `encodePreset`/`decodePreset` läuft über ein Regelwerk mit gesetzten neuen
   Blöcken sauber hin und zurück.
8. Der Abdeckungstest in `presetMerge.test.js` bleibt grün.

## 8. Nicht Teil dieses Schritts

- Store-Anbindung der Einsätze (`einsaetze` bleibt leer).
- Oberfläche.
- Der Blindstellen-Durchgang gegen `balanceSim.js` — eigener Schritt, direkt
  danach. Nach heutigem Stand sieht der Simulator **keine** der sechs Ebenen:
  `balanceSim.js` enthält null Verweise auf `duell`, `budget`, `limitKlassen`,
  `jokerBasis`, `jokerBibliothek` oder `saisonform`.
