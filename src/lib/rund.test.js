import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { RUND } from "@/lib/theme";

// ============================================================
//  ECKENRADIEN — der Wächter über Andis G2
//
//  🔴 Warum es diesen Test gibt: `--tqs-rund: 12px` stand seit dem 09.08.2026
//  in globals.css, mit Andis Ansage „R2 (12 px) ist der bevorzugte
//  Eckenradius". Zwei Wochen später waren im Code ACHT verschiedene Radien im
//  Umlauf — 999, 12, 14, 10, 11, 18, 26, 16, dazu 9, 8, 6, 4, 3 und 2.
//  Niemand hatte etwas falsch gemacht: jede einzelne Stelle war für sich
//  plausibel gewählt. Genau das ist Drift, und dagegen hilft keine Ansage,
//  sondern nur eine Messung.
//
//  ⚠️ Der Test verbietet nicht die ZAHL 14, sondern die Entscheidung im
//  Vorbeigehen. Wer eine fünfte Stufe braucht, trägt sie in `RUND` ein — mit
//  einem Grund daneben. Dann ist sie eine Stufe und keine Drift.
// ============================================================

const jsxDateien = [];
const lauf = (dir) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) lauf(p);
    else if (n.endsWith(".jsx")) jsxDateien.push(p);
  }
};
lauf("src");

describe("Die Eckenradien", () => {
  it("stehen nirgends als nackte Zahl", () => {
    const funde = [];
    for (const p of jsxDateien) {
      readFileSync(p, "utf8").split("\n").forEach((zeile, i) => {
        const t = zeile.match(/borderRadius: (\d+)/);
        if (t) funde.push(`${p}:${i + 1} → ${t[1]}`);
      });
    }
    // Die Fundstellen stehen IN der Meldung: wer den Test bricht, soll die
    // Stelle sehen, nicht nur die Zahl der Verstöße.
    expect(funde, `Zahl statt Stufe:\n${funde.join("\n")}`).toEqual([]);
  });

  // 🔴 Der eigentliche Fehler, den G2 zutage gefördert hat, war nicht die
  // Vielfalt der Zahlen, sondern dass ZWEI Leitern nebeneinander liefen und
  // dasselbe Wort für verschiedene Werte benutzten: `--tqs-rund-karte` war
  // 16 px, `RUND.karte` 12 px. Ein Screen, der von CSS auf inline umgebaut
  // wurde, änderte damit lautlos sein Aussehen.
  it("stimmen mit der CSS-Leiter überein", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const wert = (name) => {
      const t = css.match(new RegExp(`--tqs-rund${name}: (\\d+)px`));
      return t ? Number(t[1]) : null;
    };
    expect(wert("-klein")).toBe(RUND.klein);
    expect(wert("")).toBe(RUND.karte);
    expect(wert("-schirm")).toBe(RUND.schirm);
    expect(wert("-pille")).toBe(RUND.pille);
  });

  it("sind vier unterscheidbare Stufen", () => {
    const werte = Object.values(RUND);
    expect(new Set(werte).size).toBe(werte.length);
    // Die Reihenfolge ist Teil der Aussage: klein < karte < schirm < Pille.
    expect(RUND.klein).toBeLessThan(RUND.karte);
    expect(RUND.karte).toBeLessThan(RUND.schirm);
    expect(RUND.schirm).toBeLessThan(RUND.pille);
  });

  // Gegenprobe zum ersten Test: er wäre auch grün, wenn gar keine Radien mehr
  // gesetzt würden. Der Stufen-Gebrauch muss also nachweisbar da sein.
  it("werden auch tatsächlich benutzt", () => {
    let treffer = 0;
    for (const p of jsxDateien) {
      treffer += (readFileSync(p, "utf8").match(/borderRadius: RUND\./g) ?? []).length;
    }
    expect(treffer).toBeGreaterThan(300);
  });
});
