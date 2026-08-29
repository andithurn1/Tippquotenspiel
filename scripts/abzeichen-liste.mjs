// ============================================================
//  Die Zuordnungsliste für Andis Bildersatz.
//
//  Andi, 29.08.2026: „erstelle mir 30 logos mit fussball motiven, und von
//  denen schneide ich dann die besten raus und geb sie dir mit zuordnung"
//
//  ⚠️ ERZEUGT, nicht gepflegt. Wer die Liste von Hand in eine Datei tippt,
//  hat sie beim nächsten Katalog-Umbau falsch — und merkt es erst, wenn ein
//  PNG auf ein Abzeichen zeigt, das es nicht mehr gibt.
//    Aufruf:  npx vite-node scripts/abzeichen-liste.mjs
// ============================================================
import { ABZEICHEN, GRUPPEN, STUFEN, LEITERN } from "../src/lib/abzeichen.js";

console.log("# Zuordnungsliste — 30 Abzeichen\n");
console.log("Schreib hinter jede Zeile die Nummer deines Logos.");
console.log("Dateiname wird dann `<key>.png` in `public/abzeichen/`.\n");

let n = 0;
for (const g of GRUPPEN) {
  const drin = ABZEICHEN.filter((a) => a.gruppe === g.key);
  if (!drin.length) continue;
  console.log(`\n## ${g.label}`);
  for (const a of drin) {
    n += 1;
    const art = a.mass
      ? `Stufen über ${LEITERN[a.leiter].join(" · ")} (${a.was})`
      : `feste Stufe ${a.stufe} — ${a.was}`;
    console.log(`${String(n).padStart(2)}. [ ] ${a.label.padEnd(22)} key: ${a.key}`);
    console.log(`         Motivvorschlag: ${a.motiv}`);
    console.log(`         ${art}`);
  }
}

console.log(`\n\n## Stufen (der Schein hinter dem runden Logo)`);
for (const s of STUFEN) console.log(`  ${s.rang}. ${s.label.padEnd(8)} ${s.schein}`);
console.log(`\n${n} Abzeichen · ${STUFEN.length} Stufen · ${n} PNGs statt ${n * STUFEN.length}.`);
