import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ============================================================
//  DIE PROP-FORM DER EINGABE-BAUSTEINE
//
//  🔴 Warum es diesen Test gibt (24.08.2026): `Zahl` und `Slider` stehen in
//  DERSELBEN Datei (`Eingaben.jsx`) und benutzen gegensätzliche Prop-Namen —
//
//      <Slider value={…} min={…} max={…} step={…} />
//      <Zahl   wert={…}  limits={{ min, max, step }} />
//
//  Wer eben einen Slider geschrieben hat und daneben eine Zahl setzt, schreibt
//  `value`/`min`/`max` weiter. `limits` ist dann `undefined`, und `limits.min`
//  hat die ganze Seite zerlegt. Gefunden wurden ZWEI solche Stellen:
//  „Außenseiter nach Tabelle" einschalten → weißer Screen, und eine
//  Abstiegs-Zone anlegen → derselbe.
//
//  ⚠️ **Weder Test noch Lint konnten das sehen.** `no-undef` prüft Variablen,
//  keine Props; für Screens gibt es keine Render-Tests. Gefunden erst beim
//  Durchklicken im Browser — und genau deshalb steht hier jetzt eine Messung
//  statt einer Ermahnung. Dieselbe Lehre wie bei `rund.test.js` und
//  `schriftmass.test.js`: gegen Drift hilft keine Ansage.
//
//  ⚠️ Textsuche, keine Typanalyse. Sie kann einen Aufruf übersehen, der über
//  eine Zwischenvariable läuft — dafür braucht sie kein Werkzeug und läuft in
//  Millisekunden.
// ============================================================

const dateien = readdirSync("src/components")
  .filter((n) => n.endsWith(".jsx"))
  .map((n) => [n, readFileSync(join("src/components", n), "utf8")]);

// Jeden Aufruf eines Bausteins einsammeln — auch mehrzeilige.
function aufrufe(quelle, name) {
  return [...quelle.matchAll(new RegExp(`<${name}\\b(.*?)/>`, "gs"))]
    .map((m) => ({ props: m[1], zeile: quelle.slice(0, m.index).split("\n").length }));
}

describe("Die Eingabe-Bausteine werden richtig aufgerufen", () => {
  it("`Zahl` bekommt immer `wert` UND `limits`", () => {
    const funde = [];
    for (const [name, quelle] of dateien) {
      for (const a of aufrufe(quelle, "Zahl")) {
        const fehlt = [];
        if (!/\bwert\s*=/.test(a.props)) fehlt.push(/\bvalue\s*=/.test(a.props) ? "wert (steht als `value`)" : "wert");
        if (!/\blimits\s*=/.test(a.props)) fehlt.push(/\bmin\s*=/.test(a.props) ? "limits (steht als `min`/`max`)" : "limits");
        if (fehlt.length) funde.push(`src/components/${name}:${a.zeile} → fehlt: ${fehlt.join(", ")}`);
      }
    }
    // Die Fundstellen stehen IN der Meldung: wer den Test bricht, soll die
    // Stelle sehen, nicht nur die Zahl der Verstöße.
    expect(funde, `Falsche Prop-Form:\n${funde.join("\n")}`).toEqual([]);
  });

  it("`Slider` bekommt immer `value` und Grenzen", () => {
    const funde = [];
    for (const [name, quelle] of dateien) {
      for (const a of aufrufe(quelle, "Slider")) {
        // Grenzen dürfen auch gespreizt kommen (`{...JOKER_LIMITS.staerke}`).
        const grenzen = /\bmin\s*=/.test(a.props) || /\{\s*\.\.\./.test(a.props);
        if (!/\bvalue\s*=/.test(a.props) || !grenzen) {
          funde.push(`src/components/${name}:${a.zeile}`);
        }
      }
    }
    expect(funde, `Falsche Prop-Form:\n${funde.join("\n")}`).toEqual([]);
  });

  // Gegenprobe: die Tests oben wären auch grün, wenn es gar keine Aufrufe
  // mehr gäbe. Der Gebrauch muss nachweisbar da sein.
  it("werden auch tatsächlich benutzt", () => {
    let zahl = 0, slider = 0;
    for (const [, quelle] of dateien) {
      zahl += aufrufe(quelle, "Zahl").length;
      slider += aufrufe(quelle, "Slider").length;
    }
    expect(zahl).toBeGreaterThan(20);
    expect(slider).toBeGreaterThan(20);
  });
});
