// ============================================================
//  WELCHE ABZEICHEN-BILDER GIBT ES WIRKLICH?
//
//  Andi liefert die PNGs als Satz nach („erstelle mir 30 logos … und geb sie
//  dir mit zuordnung"). Bis dahin — und für jedes, das er auslässt — gibt es
//  die Datei nicht.
//
//  ── 🔴 Warum das eine erzeugte Liste braucht ──
//  Im Browser gemessen: der Schrank forderte 30 Bilder an, die es nicht gibt,
//  und produzierte **30 Mal 404 bei jedem Aufruf**. Funktional harmlos — der
//  Platzhalter erscheint —, aber die Konsole ist danach so voll, dass ein
//  ECHTER Fehler darin untergeht. Und genau dafür ist sie da.
//
//  ⚠️ Von Hand gepflegt wäre die Liste beim ersten abgelegten PNG falsch.
//  Deshalb wird sie aus dem Ordner GELESEN und läuft automatisch vor `dev`
//  und `build` — Andi muss nichts aufrufen und nichts nachtragen.
//
//    node scripts/abzeichen-bilder.mjs
// ============================================================
import { readdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORDNER = join(wurzel, "public", "abzeichen");
const ZIEL = join(wurzel, "src", "lib", "abzeichenBilder.js");

const keys = existsSync(ORDNER)
  ? readdirSync(ORDNER)
      .filter((n) => n.toLowerCase().endsWith(".png"))
      .map((n) => n.slice(0, -4))
      .sort()
  : [];

const inhalt = `// ⚠️ ERZEUGT von \`scripts/abzeichen-bilder.mjs\` — nicht von Hand ändern.
// Läuft automatisch vor \`npm run dev\` und \`npm run build\`.
//
// Die Liste sagt, welche Abzeichen-Bilder in \`public/abzeichen/\` WIRKLICH
// liegen. Ohne sie fordert der Trophäenschrank dreißig Dateien an, die es
// nicht gibt, und füllt die Konsole mit 404ern — in der ein echter Fehler
// dann untergeht.
export const VORHANDENE_BILDER = ${JSON.stringify(keys, null, 2).replace(/\n/g, "\n")};
`;

// ⚠️ Nur schreiben, wenn sich etwas geändert hat: sonst stößt jeder Lauf den
// Dev-Server neu an, weil eine Quelldatei „neu" ist.
const vorher = existsSync(ZIEL) ? readFileSync(ZIEL, "utf8") : "";
if (vorher !== inhalt) {
  writeFileSync(ZIEL, inhalt);
  console.log(`abzeichen-bilder: ${keys.length} Bild(er) eingetragen.`);
}
