# Creator-Code: nur noch die Abweichungen speichern

**Spec.** Account 2 (Andre), 2026-07-31. Folgt direkt aus dem Einhängen
(`d3973af`) und behebt eine Regression, die dieser Schritt verursacht hat.

## Der Befund

`encodePreset` ist rohes `JSON.stringify` → Base64, **ohne Abzug der
Vorgabewerte**. Vier neue Regelblöcke landen damit in JEDEM Code — auch bei
einer Runde ohne einen einzigen Joker.

Gemessen am Standard-Preset: **2071 → 3338 Zeichen (+61 %).**

Ein Creator-Code ist zum Teilen da; er wird in einen Chat gepastet. Bei 3338
Zeichen tut das niemand mehr. `jokerPlan.js` hält im Kopf ausdrücklich fest,
dass der Code kurz bleiben soll — „gespeichert wird die REGEL, nicht die
ausgerollte Liste".

## Die Messung, die die Entscheidung trägt

Nur die Abweichungen von `sanitizeRules(DEFAULT_RULES)` speichern:

| Preset | voll | delta | Ersparnis |
|---|---:|---:|---:|
| standard | 3338 | **62** | 98 % |
| gemuetlich | 3340 | 88 | 97 % |
| hardcore | 3332 | 110 | 97 % |
| underdog-party | 3346 | 118 | 96 % |
| joker | 3330 | 130 | 96 % |
| rangliste | 3336 | 159 | 95 % |

Nicht nur die Regression ist damit weg — die Codes werden **20- bis 50-mal
kürzer als vor dem Einhängen**. Das ist der eigentliche Gewinn: das Problem
bestand vorher schon, es ist nur jetzt erst aufgefallen.

## Umsetzung

### `encodePreset(rules)`

1. `sanitizeRules(rules)` (wie heute implizit erwartet).
2. Rekursiv gegen `sanitizeRules(DEFAULT_RULES)` differenzieren.
3. JSON → Base64 → Präfix **`TS2-`**.

**Differenz-Regeln:**
- Objekte werden rekursiv verglichen; ein Teilobjekt ohne Abweichung entfällt
  ganz.
- **Arrays werden als GANZES verglichen** (`JSON.stringify`-Gleichheit) und im
  Abweichungsfall vollständig gespeichert. Kein Element-Diff — eine Liste ist
  eine Einheit, und ein teilweise übernommenes `faktoren` oder `limitKlassen`
  wäre ein Regelwerk, das niemand vermessen hat.
- Ein Feld, das zufällig genau der Vorgabe entspricht, fällt heraus und wird
  beim Dekodieren identisch wiederhergestellt. Das ist gewollt.

### `decodePreset(code)`

- **`TS2-`** → Base64 → JSON → `sanitizeRules(delta)`. Das genügt, weil
  `sanitizeRules` jedes fehlende Feld ohnehin mit seiner Vorgabe füllt — genau
  die Eigenschaft, auf der das ganze Verfahren steht.
- **`TS1-`** → wie bisher (Vollformat). ⚠️ **Muss erhalten bleiben.** Es kann
  Codes geben, die jemand gespeichert hat; ein Format-Wechsel, der alte Codes
  bricht, ist ein Vertrauensbruch für ein Feature, dessen ganzer Zweck Teilen
  ist.
- Alles andere → weiterhin `Error("Ungültiger Creator-Code")`.

## Pflichttests

1. **Rundlauf über alle sechs Presets:** `decodePreset(encodePreset(r))` ist
   tief gleich zu `sanitizeRules(r)`. Der wichtigste Test.
2. **Rundlauf über ein Regelwerk mit ALLEN vier neuen Blöcken gesetzt**
   (`duell`, `budget`, `limitKlassen` mit zwei Klassen, `jokerBasis` mit
   `standard` plus einer Art-Abweichung). Deckt genau die Felder ab, die den
   Code hatten wachsen lassen.
3. **Ein `TS1-`-Code aus dem Vollformat dekodiert weiterhin korrekt.** Erzeuge
   ihn im Test von Hand (JSON → Base64 → `"TS1-"`), nicht über `encodePreset` —
   das erzeugt ja jetzt `TS2-`.
4. Ein Regelwerk, das exakt `DEFAULT_RULES` entspricht, ergibt einen **sehr
   kurzen** Code, und der Rundlauf liefert wieder `DEFAULT_RULES`.
5. Ungültiges Präfix wirft weiterhin.
6. **Längen-Regression:** der Code des Standard-Presets ist **kürzer als 500
   Zeichen**. Bewusst grosszügig — der Test soll das Verfahren absichern, nicht
   auf 62 Zeichen festnageln.

## Nicht Teil dieses Schritts

Kompression (deflate o. Ä.). Das Delta allein bringt 95–98 %; Kompression
obendrauf wäre Optimierung ohne Anlass und macht das Format undurchsichtig.
