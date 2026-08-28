// ============================================================
//  SICHT-DURCHGANG — begegnet dem SPIELER die Mechanik jemals?
//
//  Aufruf:  npm run sicht
//
//  🔴 Die Frage, die keine der anderen vier Abnahmen stellt:
//
//    `greift`  — bewegt die Einstellung die Wertung?
//    `stufen`  — kann der ADMIN sie erreichen?
//    `tot`     — ruft überhaupt jemand den Code auf?
//    `anzeige` — erklärt das Ranking seine eigene Summe?
//    **`sicht`  — sieht der MITSPIELER das Ergebnis irgendwo?**
//
//  Eine Regel kann greifen, erreichbar sein, aufgerufen werden und die Summe
//  erklären — und für den, der sie abbekommt, trotzdem unsichtbar bleiben.
//  Genau dort saßen der Trost-Joker (einstellbar, lieferte nichts) und die
//  Duell-Schutzregeln (nur im Screen geprüft).
//
//  ⚠️ Das ist Punkt 2 der Reihenfolge, die der Nutzer am 05.08.2026 festgelegt
//  hat: „alle Anzeigen WÄHREND der Runde — nicht nur die Admin-Ansicht beim
//  Anlegen." Bis hierher war das eine Vermutung; ab jetzt ist es eine Liste.
//
//  ⚠️ **Kein Balance-Durchgang.** Gemessen wird, ob eine Mechanik SICHTBAR
//  ist, nicht ob ihre Zahlen gut sind (siehe CLAUDE.md, Block ganz oben).
// ============================================================
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { regelFelder } from "../src/lib/stufenAbdeckung.js";
import {
  SPUREN, OHNE_ANZEIGE, ANZEIGE_LIBS, adminScreens, ohneSpielerAnzeige, ueberholteBegruendungen,
} from "../src/lib/sichtAbdeckung.js";

const KOMPONENTEN = "src/components";

const quellen = {};
for (const datei of readdirSync(KOMPONENTEN)) {
  if (!datei.endsWith(".jsx")) continue;
  quellen[datei] = readFileSync(join(KOMPONENTEN, datei), "utf8");
}
// Die Anzeige-Logik, die nicht in einer Komponente steht (Aufschlüsselung).
// Begründung und Warnung in `ANZEIGE_LIBS`.
for (const datei of ANZEIGE_LIBS) {
  quellen[datei] = readFileSync(join("src/lib", datei), "utf8");
}

const admin = adminScreens(quellen);
const spieler = Object.keys(quellen).filter((d) => !admin.has(d));
const fehlend = ohneSpielerAnzeige(quellen);
const ueberholt = ueberholteBegruendungen(quellen);

console.log(`\n${"=".repeat(88)}`);
console.log("  SICHT-DURCHGANG — begegnet dem Spieler die Mechanik jemals?");
console.log(`  ${Object.keys(quellen).length} Komponenten · ${admin.size} davon Admin (Spielerstellung + Bausteine)`);
console.log(`  ${spieler.length} Spieler-Screens · ${regelFelder().length} Regel-Blöcke`
  + ` · ${Object.keys(OHNE_ANZEIGE).length} ausdrücklich begründet`);
console.log(`${"=".repeat(88)}\n`);

// Der Kontrollwert, ohne den die ganze Messung wertlos wäre: bleiben nach dem
// Abzug der Admin-Screens überhaupt welche übrig? Wäre die Ableitung zu
// gierig, stünde hier 0 — und dann meldete die Liste unten alles als Lücke.
if (!spieler.length) {
  console.log("  ⚠️ KEIN einziger Spieler-Screen übrig — die Admin-Ableitung greift zu weit.");
  console.log("     Die Liste unten misst dann nichts. Erst das hier prüfen.\n");
}

if (fehlend.length) {
  console.log(`  ⚠️ ${fehlend.length} Regel-Blöcke kommen in KEINEM Spieler-Screen vor:\n`);
  for (const f of fehlend) {
    const spuren = (SPUREN[f] ?? [f]).join(", ");
    console.log(`     ${f.padEnd(20)} gesucht nach: ${spuren}`);
  }
  console.log();
  console.log("  🔴 Das heißt nicht „kaputt\" — es heißt: der Spieler erfährt nie, dass");
  console.log("     es diese Regel gibt oder dass sie ihn gerade getroffen hat. Entweder");
  console.log("     eine Anzeige bauen oder in `OHNE_ANZEIGE` begründen, warum keine");
  console.log("     hingehört.");
} else {
  console.log("  ✅ Jeder Regel-Block kommt in mindestens einem Spieler-Screen vor.");
}
console.log();

if (ueberholt.length) {
  console.log("  ⚠️ Diese Begründungen stimmen nicht mehr — der Block wird inzwischen gezeigt:");
  for (const f of ueberholt) console.log(`     ${f}`);
  console.log("  Eintrag aus `OHNE_ANZEIGE` entfernen, sonst glaubt ihn beim nächsten");
  console.log("  Durchgang jemand.\n");
}

console.log(`${"-".repeat(88)}`);
console.log("  Als Admin-Screens abgeleitet (bauen das Regelwerk, zählen nicht als Anzeige):");
console.log(`     ${[...admin].sort().join(" · ")}`);
console.log();

// ── Die Schlusszeile für den Sammel-Lauf ────────────────────
// ⚠️ Der Import steht hier unten und nicht oben: ESM hebt ihn ohnehin, und
// ein Einfügen weiter oben zerreißt mehrzeilige Import-Blöcke.
import { melde } from "./abnahme.mjs";
melde("sicht", fehlend.length + ueberholt.length);
