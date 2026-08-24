import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { TEXT, px } from "@/lib/theme";

// ============================================================
//  SCHRIFTGRÖSSEN — der Wächter über die App-Tauglichkeit
//
//  🔴 Warum es diesen Test gibt: Andi fragte am 24.08.2026, ob sich die App
//  „an jedes Modell richtig professionell anpasst". Gemessen standen **1202
//  Schriftgrößen in px und null in rem**. Eine px-Größe ist absolut — sie
//  ignoriert, was jemand am Gerät unter „Schrift größer" eingestellt hat. Auf
//  iOS ist das ein bekannter Ablehnungsgrund im App-Review, auf Android eine
//  Barrierefreiheits-Lücke.
//
//  ⚠️ Dieselbe Bauform wie `rund.test.js` bei den Eckenradien, und aus
//  demselben Grund: eine einmalige Umstellung hält nicht. Beim Radien-Durchgang
//  waren zwei Wochen nach Andis Ansage acht Werte im Umlauf — niemand hatte
//  etwas falsch gemacht, jede Stelle war für sich plausibel. Dagegen hilft
//  keine Ansage, sondern nur eine Messung.
//
//  ⚠️ Verboten ist nicht die Zahl, sondern die absolute EINHEIT. Wer eine
//  Größe braucht, die es nicht gibt, trägt sie in `TEXT` ein — mit einem Grund
//  daneben. Dann ist sie eine Stufe und keine Drift.
// ============================================================

const dateien = [];
const lauf = (dir) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) lauf(p);
    else if (n.endsWith(".jsx") || n.endsWith(".js")) dateien.push(p);
  }
};
lauf("src");

describe("Die Schriftgrößen", () => {
  it("stehen nirgends als nackte px-Zahl", () => {
    const funde = [];
    for (const p of dateien) {
      if (p.endsWith(".test.js") || p.endsWith("theme.js")) continue;
      const zeilen = readFileSync(p, "utf8").split("\n");
      zeilen.forEach((z, i) => {
        // `fontSize: 13` oder `fontSize: "13px"` — beides absolut.
        if (/fontSize:\s*\d/.test(z) || /fontSize:\s*["'`]\d+px/.test(z)) {
          funde.push(`${p}:${i + 1}  ${z.trim().slice(0, 70)}`);
        }
      });
    }
    expect(funde, `Absolute Schriftgrößen gefunden:\n${funde.join("\n")}`).toEqual([]);
  });

  // 🔴 Die Gegenprobe: die Leiter selbst muss stimmen. Ohne sie könnte
  // jemand „0.8rem" eintragen und hätte eine zehnte Stufe erfunden, die
  // zwischen zwei bestehenden liegt.
  it("die Leiter trägt nur Apples Stufen, in rem", () => {
    const erwartet = [11, 12, 13, 15, 16, 17, 20, 22, 28];
    const gemessen = Object.values(TEXT).map((v) => px(v)).sort((a, b) => a - b);
    expect(gemessen).toEqual(erwartet);
    for (const v of Object.values(TEXT)) expect(v.endsWith("rem")).toBe(true);
  });

  // ⚠️ 1 rem MUSS 16 px sein, solange niemand etwas verstellt — sonst hätte
  // die Umstellung das Aussehen verändert, und genau das war nicht gewollt.
  it("rechnet gegen 16 px zurück — die Umstellung ändert nichts am Aussehen", () => {
    expect(px(TEXT.callout)).toBe(16);
    expect(px(TEXT.footnote)).toBe(13);
    expect(px(TEXT.title1)).toBe(28);
  });
});
