// ============================================================
//  BALANCE-DURCHGANG — alle Presets gegen die Modifikator-Ebenen, in EINEM Lauf
//
//  Die Roadmap verlangt für den Abschluss-Durchgang ausdrücklich EINEN Lauf
//  statt Einzelmessungen: jede neue Mechanik verschiebt die Balance aller
//  anderen, und wer zwischendrin einzeln nachjustiert, tunt gegen ein
//  Regelwerk, das es am Ende nicht mehr gibt.
//
//  Aufruf:  npm run balance
//
//  Zielbild: der KENNER gewinnt — nicht der Zocker, nicht der Favoriten-Tipper.
//  Gemittelt über mehrere Saatzahlen, weil eine einzelne täuschen kann. Die
//  Ausgabe endet mit einer Befund-Liste; ist sie leer, kippt kein Preset.
//
//  Unterschied zu `presets.balance.test.js`: der Test ist die schnelle
//  Regression bei jedem Testlauf, das hier die gründliche Vermessung vor dem
//  Launch — mehr Saisons, mehr Varianten, mehr Saatzahlen.
// ============================================================
import { PRESETS } from "../src/lib/presets.js";
import { simulateBalance } from "../src/lib/balanceSim.js";
import { sanitizeRules } from "../src/lib/engine.js";

const SEEDS = [4242, 77, 1234];
const OPT = { seasons: 40, matchdays: 17, perMatchday: 9 };
const z = (x) => (x * 100).toFixed(1).padStart(5) + " %";

// Mittelt ueber mehrere Saatzahlen — eine einzelne kann taeuschen.
function messen(rules) {
  const laeufe = SEEDS.map((seed) => simulateBalance(rules, { ...OPT, seed }));
  const mittel = (f) => laeufe.reduce((s, r) => s + f(r), 0) / laeufe.length;
  const q = (k) => mittel((r) => r.profile.find((x) => x.key === k).siegquote);
  return {
    kenner: q("kenner"), zocker: q("zocker"), favorit: q("favorit"),
    modAnteil: mittel((r) => r.modifikatorAnteil),
    maximalfall: Math.round(mittel((r) => r.maximalfall)),
    rot: laeufe.filter((r) => r.ampel.stufe === "rot").length,
    gelb: laeufe.filter((r) => r.ampel.stufe === "gelb").length,
  };
}

const varianten = (rules) => ({
  "ohne":            rules,
  "BigGame Standard": sanitizeRules({ ...rules, bigGame: { enabled: true, aufschlag: 0.5, minSpannung: 0.35 } }),
  "BigGame Maximum":  sanitizeRules({ ...rules, bigGame: { enabled: true, aufschlag: 1.0, minSpannung: 0.0 } }),
});

console.log(`\n${"=".repeat(92)}`);
console.log("  BALANCE-ABSCHLUSS 2/3 — Presets gegen die Big-Game-Ebene");
console.log(`  ${SEEDS.length} Saatzahlen x ${OPT.seasons} Saisons. Zielbild: der KENNER gewinnt.`);
console.log(`${"=".repeat(92)}`);

let warnungen = [];

for (const p of PRESETS) {
  console.log(`\n  ${p.label}`);
  console.log("    Variante            Kenner   Zocker  Favorit   ModAnteil  Maximalfall  gelb/rot");
  for (const [name, rules] of Object.entries(varianten(p.rules))) {
    const m = messen(rules);
    console.log(
      `    ${name.padEnd(18)} ${z(m.kenner)} ${z(m.zocker)} ${z(m.favorit)}   `
      + `${z(m.modAnteil)}   ${String(m.maximalfall).padStart(6)}       ${m.gelb}/${m.rot}`,
    );
    if (m.rot > 0) warnungen.push(`${p.label} / ${name}: Ampel ROT`);
    if (m.kenner <= m.zocker) warnungen.push(`${p.label} / ${name}: Zocker holt den Kenner ein`);
    if (m.kenner <= m.favorit) warnungen.push(`${p.label} / ${name}: Favorit holt den Kenner ein`);
  }
}

console.log(`\n${"=".repeat(92)}`);
console.log(warnungen.length ? "  ⚠️ BEFUNDE:" : "  ✅ Kein Preset kippt.");
for (const w of warnungen) console.log(`     - ${w}`);
console.log();
