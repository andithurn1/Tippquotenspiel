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
import { abdeckung, luecken, ueberholteBegruendungen, NUR_PROFI } from "../src/lib/stufenAbdeckung.js";

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
