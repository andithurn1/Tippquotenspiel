// ============================================================
//  TOPF-DURCHGANG — welcher Rückgabe-TOPF wird von niemandem gelesen?
//
//  🔴 Der Fund, der diesen Durchgang nötig macht (27.08.2026): die
//  Modifikator-Belohnung des Glücksrads wurde seit ihrem Bau ERZEUGT und von
//  niemandem verrechnet. Wer „+50 % für zwei Spieltage" zog, bekam nichts —
//  kein Fehler, keine Meldung, keine rote Zeile irgendwo.
//
//  ⚠️ **`npm run tot` konnte das nicht finden**, und zwar aus einem Grund, der
//  sich wiederholen wird: es war kein EXPORT, sondern ein FELD in einem
//  Rückgabeobjekt. `drehradBelohnungen()` wird überall aufgerufen — also ist
//  die Funktion quicklebendig. Dass einer ihrer vier Töpfe leer ausgeht,
//  sieht man von außen nicht.
//
//  ── Was hier geprüft wird ──
//  Objekte, die in NAMENSTÖPFE aufteilen: `{ joker: [], narren: [],
//  modifikatoren: [] }`. Genau diese Form ist die Risikoform — sie entsteht,
//  wenn eine Funktion mehrere Sorten Ergebnis liefert, und beim Ergänzen einer
//  fünften Sorte vergisst man den Anschluss, nicht die Rechnung.
//
//  Für jeden Topf: nennt ihn außerhalb seiner Datei überhaupt jemand
//  (`.name` oder `name:` beim Auspacken)? Testdateien zählen NICHT — ein
//  grüner Test beweist, dass der Topf richtig gefüllt wird, nicht dass ihn
//  jemand ausleert. Dieselbe Trennung wie in `tot-durchgang.mjs`.
//
//  ⚠️ **Was dieser Durchgang NICHT kann:** er sieht, ob der Name irgendwo
//  vorkommt — nicht, ob damit etwas Sinnvolles geschieht. Ein Topf, der
//  gelesen und weggeworfen wird, fällt ihm nicht auf. Das ist die Grenze
//  jeder Textprüfung, und sie steht hier, damit niemand mehr erwartet.
// ============================================================

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LIB = "src/lib";
const SUCHORTE = ["src", "scripts"];

// Töpfe, die absichtlich niemand von außen liest — mit Grund.
// ⛔ Ein Eintrag ohne Satz ist nicht erlaubt: „steht halt so da" ist genau die
// Begründung, mit der der Rad-Modifikator zwei Wochen lang niemandem auffiel.
const GEDULDET = {
  "drehradBoard.js|modifikatoren":
    "Anzeige-Liste: wer hat was gezogen. Die WERTUNG laeuft ueber `vorgaenge` -- "
    + "beide aus denselben Gutschriften, damit sie nicht auseinanderlaufen.",
};

// ⚠ **Pfade hier IMMER mit Vorwaerts-Slash.** `join` liefert unter Windows
// `src\lib\datei.js`, und alles dahinter rechnet mit `src/lib/` — die
// Abkuerzung `kurz` greift dann nicht, und damit auch kein Eintrag in
// `GEDULDET` bzw. `REGELMODULE`. Gemessen am 28.08.2026: genau so meldete
// `toepfe` einen Fund, der laengst begruendet geduldet war — die Ausnahme
// stand da, nur fand der Schluessel sie nie.
function dateien(ordner) {
  const out = [];
  for (const e of readdirSync(ordner, { withFileTypes: true })) {
    const pfad = join(ordner, e.name);
    if (e.isDirectory()) out.push(...dateien(pfad));
    else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(pfad.replace(/\\/g, "/"));
  }
  return out;
}

const alleDateien = SUCHORTE.flatMap((o) => { try { return dateien(o); } catch { return []; } });
const inhalt = new Map(alleDateien.map((f) => [f, readFileSync(f, "utf8")]));

// ── Die Töpfe finden ────────────────────────────────────────
// Ein Objektliteral, dessen Schlüssel auf leere Arrays zeigen — die Form, in
// der eine Funktion mehrere Sorten Ergebnis vorbereitet.
//
// ⚠️ Bewusst nur die LEEREN Arrays: `{ a: [], b: [] }` ist eine Sammelstelle,
// `{ a: berechne(), b: 3 }` ist ein normales Ergebnis. Ohne diese Einengung
// meldete der erste Entwurf 200 Zeilen, und eine Halde liest niemand.
const TOPF_ZEILE = /^\s*(?:(?:const|let)\s+\w+\s*=\s*)?\{?[^{}]*$/;

function toepfeVon(text) {
  const treffer = new Map();   // topfName -> Zeilennummer
  const zeilen = text.split("\n");

  // Ein Block ist eine Folge von Zeilen zwischen `{` und `}`, in der
  // mindestens ZWEI Schlüssel auf `[]` zeigen. Ein einzelnes `{ x: [] }` ist
  // kein Fächer, sondern ein Rückgabewert.
  //
  // 🔴 UND es muss ein Topf sein, der die Datei VERLÄSST. Ein Zwischenspeicher
  // wie `proLinie.set(linie, { ueber: [], unter: [] })` in `oddsApi.js` hat
  // dieselbe Form und ist völlig in Ordnung — er wird zwei Zeilen später
  // ausgelesen. Ohne diese Unterscheidung meldete der erste Lauf ihn als
  // Fund, und ein Bericht, dessen erster Eintrag falsch ist, wird nicht
  // gelesen.
  const rueckgabe = (v) => new RegExp(`return\\s+(?:\\{\\s*\\.\\.\\.)?${v}\\b`).test(text);

  let block = null;
  zeilen.forEach((zeile, i) => {
    const zuweisung = /(?:const|let|var)\s+(\w+)\s*=\s*\{\s*$/.exec(zeile);
    const direkt = /return\s*\{\s*$/.test(zeile);
    if (block === null && (direkt || zuweisung)) {
      block = { start: i, keys: [], variable: zuweisung?.[1] ?? null };
      return;
    }
    if (block === null) {
      // Einzeiler — aber nur als RÜCKGABE. `proLinie.set(linie, { ueber: [],
      // unter: [] })` hat dieselbe Form und ist ein Zwischenspeicher, der die
      // Datei nie verlässt.
      if (!/return\s*\{/.test(zeile)) return;
      const einzeln = [...zeile.matchAll(/(\w+)\s*:\s*\[\s*\]/g)].map((m) => m[1]);
      if (einzeln.length >= 2) for (const k of einzeln) if (!treffer.has(k)) treffer.set(k, i + 1);
      return;
    }
    if (/^\s*\}/.test(zeile)) {
      const verlaesstDatei = block.variable === null || rueckgabe(block.variable);
      if (block.keys.length >= 2 && verlaesstDatei) {
        for (const { name, zeile: z } of block.keys) if (!treffer.has(name)) treffer.set(name, z);
      }
      block = null;
      return;
    }
    for (const m of zeile.matchAll(/(\w+)\s*:\s*\[\s*\]/g)) {
      block.keys.push({ name: m[1], zeile: i + 1 });
    }
    if (!TOPF_ZEILE.test(zeile) && !/\[\s*\]/.test(zeile) && zeile.trim() && !zeile.trim().startsWith("//")) {
      // Zeile passt nicht ins Bild eines Objektliterals — Block verwerfen,
      // statt quer durch eine Funktion weiterzusammeln.
      if (!/[:,]/.test(zeile)) block = null;
    }
  });
  return treffer;
}

const module = readdirSync(LIB)
  .filter((f) => f.endsWith(".js") && !f.endsWith(".test.js"))
  .map((f) => join(LIB, f));

const befunde = [];
const nurTest = [];
let geprueft = 0;

for (const datei of module) {
  const text = inhalt.get(datei) ?? readFileSync(datei, "utf8");
  const kurz = datei.replace(/^src\/lib\//, "");

  for (const [name, zeile] of toepfeVon(text)) {
    geprueft++;
    if (GEDULDET[`${kurz}|${name}`]) continue;

    // Gelesen heißt: `.name` oder `name` beim Auspacken (`const { name } = …`).
    //
    // 🔴 NICHT gelesen ist `name: []` — und das ist der Griff, ohne den dieser
    // Durchgang seinen eigenen Anlassfall verpasst hätte. Der leere Rückfall
    // („kein Rad? dann eben `{ joker: [], narren: [], modifikatoren: [] }`")
    // steht in BEIDEN Stores und im Screen. Der Name kommt dort also vor —
    // gelesen wird der Topf trotzdem nirgends. Nachgemessen: ohne diese Zeile
    // meldete der Durchgang den Rad-Modifikator NICHT.
    const ohneDeklaration = (t) => t.replace(/\w+\s*:\s*\[\s*\]/g, "");
    const muster = new RegExp(`\\.${name}\\b|\\b${name}\\s*[,}]`);
    let fremd = false;
    let auchTest = false;
    for (const [f, t] of inhalt) {
      if (f === datei) continue;
      if (!muster.test(ohneDeklaration(t))) continue;
      if (f.endsWith(".test.js")) { auchTest = true; continue; }
      fremd = true;
      break;
    }
    if (fremd) continue;
    (auchTest ? nurTest : befunde).push({ datei: kurz, name, zeile });
  }
}

const alle = [
  ...befunde.map((b) => ({ ...b, wo: "niemand" })),
  ...nurTest.map((b) => ({ ...b, wo: "nur Test" })),
];

console.log(`\n${"=".repeat(88)}`);
console.log("  TOPF-DURCHGANG — welcher Rückgabe-Topf wird von niemandem gelesen?");
console.log(`  ${module.length} Module · ${geprueft} Töpfe geprüft · ${Object.keys(GEDULDET).length} begründet geduldet`);
console.log(`${"=".repeat(88)}\n`);

if (!alle.length) {
  console.log("  ✅ Jeder Rückgabe-Topf wird außerhalb seiner Datei gelesen.\n");
  console.log("  ⚠️ Geprüft werden nur ZURÜCKGEGEBENE Fächer (`return { a: [], b: [] }`");
  console.log("     oder eine Variable, die so zurückgegeben wird). Ein interner");
  console.log("     Zwischenspeicher derselben Form ist ausdrücklich kein Fund — er wird");
  console.log("     zwei Zeilen später ausgelesen, und ein Bericht mit falschem erstem");
  console.log("     Eintrag wird nicht gelesen.\n");
} else {
  for (const b of alle.sort((x, y) => x.datei.localeCompare(y.datei) || x.name.localeCompare(y.name))) {
    console.log(`     ${b.datei.padEnd(24)} ${b.name.padEnd(22)} Zeile ${String(b.zeile).padEnd(5)} ${b.wo}`);
  }
  console.log();
  console.log("  🔴 Ein Topf, den niemand ausleert, ist eine Mechanik, die RECHNET und");
  console.log("     nicht ANKOMMT. Genau so blieb die Modifikator-Belohnung des Rades");
  console.log("     wochenlang wirkungslos — ohne Fehler, ohne Meldung.");
  console.log("  ⚠️ Für jeden Eintrag gilt: anschließen, entfernen, oder mit einem SATZ");
  console.log("     in `GEDULDET` begründen.\n");
}

// ── Die Schlusszeile für den Sammel-Lauf ────────────────────
// ⚠️ Der Import steht hier unten und nicht oben: ESM hebt ihn ohnehin, und
// ein Einfügen weiter oben zerreißt mehrzeilige Import-Blöcke.
import { melde } from "./abnahme.mjs";
melde("toepfe", alle.length);
