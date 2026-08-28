// ============================================================
//  EINSTELLBAR-DURCHGANG — lässt sich JEDE Einstellung überhaupt setzen?
//
//  🔴 Andi am 23.08.2026: „mach die demo runde bzw tests so dass sie alle
//  Einstellbarkeiten abdeckt … um sie zu prüfen."
//
//  Der neunte Durchgang, und er fragt etwas, das keiner der acht anderen
//  fragt. Zwei Dinge, die man leicht für selbstverständlich hält:
//
//    1. Nimmt das Feld überhaupt einen ANDEREN Wert an? Ein Tippfehler im
//       Namen, ein vergessener Zweig in `sanitize*`, ein Wert außerhalb der
//       eigenen Grenzen — in allen drei Fällen fällt die Einstellung stumm auf
//       die Vorgabe zurück und sieht dabei aus wie eine, die greift.
//    2. Überlebt der Wert das TEILEN? Ein Creator-Code speichert nur die
//       ABWEICHUNG; ein Feld, das die Delta-Bildung nicht kennt, verschwindet
//       genau dort und nirgends sonst.
//
//  Die Kandidaten werden GEERNTET (Presets, Charaktere, Regler-Stufen,
//  Schaufenster) statt von Hand gepflegt — eine Liste wäre beim nächsten
//  neuen Feld schon veraltet. Genau daran sind `tabellenBonus` und
//  `duell.proSpieltag` in `greift` Teil 3 jahrelang vorbeigelaufen.
//
//  Aufruf: `npm run einstellbar`
// ============================================================
import { pruefeEinstellbarkeit, abdeckung, GEKOPPELT, ueberholteKopplungen, ueberholteAusnahmen } from "../src/lib/einstellbarkeit.js";
import { SCHAU_AUSGENOMMEN } from "../src/lib/schaufenster.js";

const alle = pruefeEinstellbarkeit();
const a = abdeckung();
const strich = "-".repeat(88);

console.log(`\n${"=".repeat(88)}`);
console.log("  EINSTELLBAR-DURCHGANG — nimmt jedes Feld einen anderen Wert an, und überlebt er das Teilen?");
console.log(`  ${a.blaetter} Blattfelder · ${Object.keys(GEKOPPELT).length} begründet gekoppelt`);
console.log(`${"=".repeat(88)}\n`);

// ── TEIL 1: die Funde ───────────────────────────────────────
if (a.funde.length) {
  console.log(`  🔴 ${a.funde.length} Felder nehmen ihren Wert NICHT an oder verlieren ihn beim Teilen:\n`);
  for (const f of a.funde) {
    const was = f.setzbar === false ? "nicht setzbar" : "verliert sich im Creator-Code";
    console.log(`     ${f.pfad.padEnd(38)} ${was}`);
    if (f.grund) console.log(`     ${"".padEnd(38)} └ ${f.grund}`);
  }
  console.log();
  console.log("  🔴 Ein Feld, das seinen Wert verwirft, sieht aus wie eines, das greift.");
  console.log("     Entweder reparieren — oder in `GEKOPPELT` begründen, warum es so sein MUSS.");
} else {
  console.log("  ✅ Jedes Feld nimmt einen anderen Wert an und behält ihn im Creator-Code.");
}
console.log();

const ueberholt = ueberholteKopplungen();
if (ueberholt.length) {
  console.log(`  ⚠️ ${ueberholt.length} Kopplungs-Begründungen stimmen nicht mehr: ${ueberholt.join(", ")}`);
  console.log("     Eine Begründung, die das Gegenteil beschreibt, ist schlimmer als keine.\n");
}

if (a.gekoppelt.length) {
  console.log(`  ℹ️ ${a.gekoppelt.length} bewusst gekoppelt (lassen sich nicht ALLEIN umlegen):`);
  for (const p of a.gekoppelt) console.log(`     ${p.padEnd(38)} ${GEKOPPELT[p].slice(0, 60)}…`);
  console.log();
}

// ── TEIL 2: die Abdeckung ───────────────────────────────────
console.log(`${"=".repeat(88)}`);
console.log("  TEIL 2 — welche Felder setzt das PROJEKT je anders als die Vorgabe?");
console.log(`${"=".repeat(88)}\n`);
console.log(`  ${a.ausProjekt} von ${a.blaetter} Blattfeldern werden irgendwo im Projekt anders gesetzt`);
console.log("  (Presets · Charaktere · Regler-Stufen · Schaufenster-Runde).\n");
console.log(`  ${a.blaetter - a.ausProjekt} kommen nur mit einem erfundenen Wert durch die Prüfung.`);
console.log("  ⚠️ Das ist KEIN Fehler — es heißt, dass diese Einstellung im ganzen Projekt");
console.log("     nirgends vorgeführt wird. Wer sie im Browser sehen will, muss sie von Hand");
console.log("     einstellen. Die Schaufenster-Runde (`ALLES`) ist der Ort, das zu ändern.\n");

// 🔴 Der Rest, aufgeschlüsselt. Ohne diese Aufschlüsselung liest sich
// „188 von 199“ wie eine unfertige Arbeit — dabei trägt jeder der elf
// übrigen einen Satz, warum er übrig ist. Was KEINEN trägt, steht darunter,
// und das ist die einzige Zahl hier, die 0 sein muss.
console.log(`  Davon ${a.ausgenommen.length} bewusst ausgenommen — eine Runde kann nicht`);
console.log("  jede Einstellung zugleich vorführen, weil manche einander ausschließen:");
for (const pfad of a.ausgenommen) {
  console.log(`     ${pfad.padEnd(28)} ${SCHAU_AUSGENOMMEN[pfad].slice(0, 56)}…`);
}
console.log();

if (a.unerklaert.length) {
  console.log(`  🔴 ${a.unerklaert.length} Felder werden nirgends vorgeführt UND tragen keinen Grund:`);
  for (const pfad of a.unerklaert) console.log(`     ${pfad}`);
  console.log("     Entweder ins Schaufenster — oder in `SCHAU_AUSGENOMMEN` mit einem Satz.\n");
} else {
  console.log("  ✅ Kein Feld bleibt unerklärt: jedes wird vorgeführt, ausgenommen oder gekoppelt.\n");
}

const ausUeberholt = ueberholteAusnahmen();
if (ausUeberholt.length) {
  console.log(`  ⚠️ ${ausUeberholt.length} Ausnahmen stimmen nicht mehr — das Schaufenster führt sie`);
  console.log(`     inzwischen doch vor: ${ausUeberholt.join(", ")}\n`);
}

if (a.ohneKandidat.length) {
  console.log(`  ${a.ohneKandidat.length} Felder mit unbekanntem Wortschatz (Katalog-Werte, die sonst nirgends vorkommen):`);
  const zeilen = [];
  for (let i = 0; i < a.ohneKandidat.length; i += 3) zeilen.push(a.ohneKandidat.slice(i, i + 3));
  for (const z of zeilen) console.log(`     ${z.map((p) => p.padEnd(28)).join("")}`);
  console.log();
  console.log("  ℹ️ Für sie kann dieser Durchgang nichts sagen — nicht „kaputt\", sondern");
  console.log("     „kein zweiter Wert bekannt\". Sie werden von `greift` und `stufen` abgedeckt.");
}
console.log();
console.log(strich);
console.log(`  Ergebnis: ${a.funde.length} Funde · ${a.unerklaert.length} unerklärt`
  + ` · ${a.ausgenommen.length} begründet ausgenommen · ${a.gekoppelt.length} begründet gekoppelt`
  + ` · Abdeckung ${a.ausProjekt}/${a.blaetter}`);
console.log();

process.exitCode = a.funde.length || a.unerklaert.length || ueberholt.length || ausUeberholt.length ? 1 : 0;

// ── Die Schlusszeile für den Sammel-Lauf ────────────────────
// ⚠️ Der Import steht hier unten und nicht oben: ESM hebt ihn ohnehin, und
// ein Einfügen weiter oben zerreißt mehrzeilige Import-Blöcke.
import { melde } from "./abnahme.mjs";
melde("einstellbar", a.funde.length + a.unerklaert.length + ueberholt.length + ausUeberholt.length);
