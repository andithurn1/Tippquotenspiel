// ============================================================
//  STUFEN-DURCHGANG — ist jede Einstellung auch ERREICHBAR?
//
//  Aufruf:  npm run stufen
//
//  Die dritte Messung neben `npm run greift` („bewegt sie etwas?") und
//  `npm run anzeige` („steht überall dieselbe Zahl?"). Diese hier fragt:
//  **kommt ein Admin überhaupt an sie heran, ohne in die Profi-Ansicht zu
//  gehen?**
//
//  🔴 Warum das eine eigene Frage ist: `rules.ereignisse` war vollständig
//  gebaut, wirksam (greift ✓) und überall richtig angezeigt (anzeige ✓) — und
//  trotzdem unfertig, weil kein Charakter und kein einfacher Regler sie je
//  erwähnte. Weder `greift` noch `anzeige` konnten das sehen.
//
//  Ein Feld darf nur dann allein in der Profi-Ansicht stehen, wenn in
//  `stufenAbdeckung.js` eine BEGRÜNDUNG dazu steht. Alles andere ist eine
//  Lücke und wird hier gezählt.
// ============================================================
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  abdeckung, luecken, ueberholteBegruendungen, NUR_PROFI,
  blattFelder, LISTEN_FELDER, fehlendeOberflaeche, OHNE_OBERFLAECHE,
} from "../src/lib/stufenAbdeckung.js";

const alle = abdeckung();
const breite = Math.max(...alle.map((a) => a.feld.length));

console.log(`\n${"=".repeat(88)}`);
console.log("  STUFEN-DURCHGANG — auf welcher Stufe ist jede Einstellung erreichbar?");
console.log(`  ${alle.length} Regel-Felder`);
console.log(`${"=".repeat(88)}\n`);

const zeile = (a) => {
  const s1 = a.stufe1 ? "①" : " ";
  const s2 = a.stufe2 ? "②" : " ";
  const rest = a.stufe1 || a.stufe2 ? "" : (a.begruendung ? "  (nur Profi, begründet)" : "  ⚠️  NUR PROFI, OHNE BEGRÜNDUNG");
  return `  ${a.feld.padEnd(breite)}  ${s1} ${s2} ③${rest}`;
};

console.log("  Stufe ① Charakter · ② einfacher Regler · ③ Profi (immer)\n");
for (const a of alle) console.log(zeile(a));

const fehlt = luecken();
const ueberholt = ueberholteBegruendungen();

console.log(`\n${"-".repeat(88)}`);
console.log(`  Stufe 1 berührt ${alle.filter((a) => a.stufe1).length} Felder`
  + ` · Stufe 2 setzt ${alle.filter((a) => a.stufe2).length}`
  + ` · begründet nur Profi: ${Object.keys(NUR_PROFI).length}`);

if (ueberholt.length) {
  console.log("\n  ⚠️ ÜBERHOLTE BEGRÜNDUNGEN — diese Felder sind inzwischen erreichbar,");
  console.log("     die Begründung in `NUR_PROFI` behauptet aber das Gegenteil:");
  for (const f of ueberholt) console.log(`     - ${f}`);
  console.log("     Eintrag löschen, sonst glaubt ihr beim nächsten Mal jemand.");
}

if (fehlt.length) {
  console.log(`\n  ⚠️ ${fehlt.length} LÜCKEN — nur in der Profi-Ansicht und ohne Begründung:`);
  for (const f of fehlt) console.log(`     - ${f}`);
  console.log("\n  Für jede gilt die Frage aus CLAUDE.md, in dieser Reihenfolge:");
  console.log("    1. Kommt sie in Stufe 1 vor? Meist nein — dann muss ein Charakter sie");
  console.log("       sinnvoll MITSETZEN, ohne sie zu zeigen.");
  console.log("    2. Gehört sie in Stufe 2: unter welchen KLARTEXT-Regler?");
  console.log("    3. Gehört sie wirklich nur ins Profi-Gehäuse: in `NUR_PROFI` begründen.");
} else {
  console.log("\n  ✅ Jede Einstellung ist entweder auf Stufe 1/2 erreichbar oder begründet.");
}
console.log();

// Kein Prozess-Fehlercode: eine Lücke ist ein BEFUND, kein kaputter Build —
// dieselbe Haltung wie in `greift`. Die Zahl gehört in die Roadmap, nicht in
// einen roten Balken, den man wegklickt.

// ════════════════════════════════════════════════════════════
//  TEIL 2 — hat die PROFI-Ansicht das Feld überhaupt?
//
//  🔴 Die Lücke in Teil 1: ein Feld mit `NUR_PROFI`-Begründung galt als
//  „erreichbar in Stufe 3" — nachgesehen hatte das niemand. `tippfenster.anker`
//  stand im Regelwerk, im Creator-Code, in `sanitizeRules` und in KEINER
//  Oberfläche (Fund 06.08.2026).
//
//  Gemessen auf BLATT-Ebene. Über den Block gerechnet wäre `tippfenster`
//  „vorhanden" gewesen, weil `vorlaufStunden` vorkommt — genau der blinde
//  Fleck.
// ════════════════════════════════════════════════════════════
function jsxDateien(ordner) {
  const out = [];
  for (const e of readdirSync(ordner, { withFileTypes: true })) {
    const p = join(ordner, e.name);
    if (e.isDirectory()) out.push(...jsxDateien(p));
    else if (/\.(jsx|js)$/.test(e.name)) out.push(p);
  }
  return out;
}
const uiQuelltext = jsxDateien("src/components").map((f) => readFileSync(f, "utf8")).join("\n");
const blaetter = blattFelder();
const ohneUi = fehlendeOberflaeche(uiQuelltext);

console.log(`${"=".repeat(88)}`);
console.log("  TEIL 2 — welches Regel-FELD kommt in keiner Oberfläche vor?");
console.log(`  ${blaetter.length} Blattfelder + ${LISTEN_FELDER.length} aus LISTEN-Einträgen`
  + ` · ${Object.keys(OHNE_OBERFLAECHE).length} ausdrücklich begründet`);
// 🔴 Die LISTEN-Felder stehen getrennt, weil sie NICHT aus der Vorgabe
// abgeleitet sind: `ereignisse.aktive` & Co. fangen leer an, also sieht die
// Rekursion nie hinein. Am 07.08.2026 lag die ganze Wirkungs-Achse in diesem
// blinden Fleck, und Teil 2 meldete trotzdem grün.
console.log(`${"=".repeat(88)}\n`);

if (ohneUi.length) {
  console.log(`  ⚠️ ${ohneUi.length} Felder hat KEINE Oberfläche — einstellbar nur über den Creator-Code:`);
  for (const f of ohneUi) console.log(`     ${f}`);
  console.log();
  console.log("  🔴 Ein Feld ohne Oberfläche ist kein Baukastenteil. Entweder es bekommt");
  console.log("     einen Regler, oder es gehört gelöscht, oder es steht mit einem Satz in");
  console.log("     `OHNE_OBERFLAECHE`. Der Anker des Tippfensters lag hier — er war");
  console.log("     zusätzlich wirkungslos, und der Nachbar-Knopf löschte ihn beim Klicken.");
} else {
  console.log("  ✅ Jedes Regel-Feld kommt in mindestens einer Oberfläche vor.");
}
console.log();

// ── Die Schlusszeile für den Sammel-Lauf ────────────────────
// ⚠️ Der Import steht hier unten und nicht oben: ESM hebt ihn ohnehin, und
// ein Einfügen weiter oben zerreißt mehrzeilige Import-Blöcke.
import { melde } from "./abnahme.mjs";
melde("stufen", fehlt.length + ohneUi.length + ueberholt.length);
