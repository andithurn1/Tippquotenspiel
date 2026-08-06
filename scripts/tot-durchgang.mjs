// ============================================================
//  TOT-DURCHGANG — welche gebaute Funktion ruft niemand auf?
//
//  Aufruf:  npm run tot
//
//  🔴 Am 06.08.2026 sind VIER Mechaniken aufgefallen, die fertig gebaut,
//  getestet und über die Oberfläche einstellbar waren — und von niemandem
//  aufgerufen wurden:
//
//    `autoTip.js`   (Versäumnis)        · importiert waren nur die Regler-LABELS
//    `spieltagsPunkte` bei `auswerten()` · kein Aufrufer gab sie mit
//    `alleEintraege` bei `auswerten()`   · dito, mit umgekehrtem Vorzeichen
//    `auswahl.js`   (die ganze WEN-Achse) · achtzehn Modi, null Aufrufer
//
//  Alle vier sind beim HINSEHEN gefunden worden, nicht durch eine Prüfung.
//  Kein Test konnte sie sehen: sie waren ja alle grün — die Funktion rechnete
//  richtig, sie wurde nur nie gefragt.
//
//  Diese Messung sucht danach mechanisch: ein Export, den außerhalb seiner
//  eigenen Datei und ihrer Tests niemand nennt, ist ein Verdacht.
//
//  ⚠️ „Unbenutzt" ist ein BEFUND, kein Fehler — dieselbe Haltung wie bei
//  `greift`. Manches ist bewusst nur für Tests da, manches ist eine
//  vorbereitete Schnittstelle. Deshalb gilt dieselbe Regel wie bei `stufen`:
//  entweder es hat einen Aufrufer, oder es steht mit einem BEGRÜNDUNGSSATZ in
//  `GEDULDET`. Stillschweigend herumliegen darf nichts.
//
//  ⚠️ Textsuche, keine Typanalyse. Sie kann einen Export übersehen, der nur
//  dynamisch angesprochen wird — dafür braucht sie kein Werkzeug und läuft in
//  einer Sekunde. Ein Verdacht, den man in zehn Sekunden prüft, ist mehr wert
//  als eine perfekte Analyse, die niemand startet.
// ============================================================
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Was darf ohne Aufrufer dastehen — mit Satz, warum.
const GEDULDET = {
  createSupabaseStore:
    "Wird über `getStore()` in store.js ausgewählt, nicht direkt importiert.",
  createMockStore:
    "Dito — die eine Stelle, an der Mock gegen Supabase getauscht wird.",

  // ── Am 06.08.2026 geprüft und stehen gelassen ─────────────
  catchupLeaderboard:
    "Bequemer Weg zum Endstand mit Anschluss-Bonus. Der Store nimmt statt "
    + "dessen den letzten Eintrag von `scoreLeaderboardHistory` — beide "
    + "rechnen über `applyCatchup`, es gibt also keine zweite Wahrheit. "
    + "⚠️ Gehört Account 2; vor dem Löschen im Kanal abstimmen.",
  istFreigeschaltet:
    "🔴 ZWEITE FORMULIERUNG derselben Regel wie `freigabeStatus` (das den "
    + "Zustand samt Begründungssatz liefert und überall benutzt wird). Steht "
    + "auf der Abrissliste, sobald Account 2 den Kanal-Eintrag vom 06.08. "
    + "gelesen hat — solange zwei Fassungen dastehen, können sie auseinander"
    + "laufen.",
  tippbareSpiele:
    "Bequemer Weg zu „was ist JETZT tippbar\". Die Spielwahl baut ihre Liste "
    + "selbst, weil sie zusätzlich nach Regelwerk je Spiel gruppiert. Beide "
    + "gehen über `tippStatus`, also eine Rechnung.",
};

const LIB = "src/lib";
const SUCHORTE = ["src", "scripts", "supabase"];

// Alle `export`-Namen einer Datei. Bewusst grob: benannte Funktionen,
// Konstanten und Klassen. `export default` hat keinen Namen und fällt weg.
function exporteVon(text) {
  const namen = new Set();
  for (const m of text.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_$]+)/gm)) {
    namen.add(m[1]);
  }
  // `export { a, b as c }` — der EXPORTIERTE Name zählt.
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const teil of m[1].split(",")) {
      const name = teil.includes(" as ") ? teil.split(" as ")[1] : teil;
      const sauber = name.trim();
      if (sauber && sauber !== "default") namen.add(sauber);
    }
  }
  return namen;
}

function dateien(ordner) {
  const out = [];
  for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
    const pfad = join(ordner, eintrag.name);
    if (eintrag.isDirectory()) out.push(...dateien(pfad));
    else if (/\.(js|jsx|mjs)$/.test(eintrag.name)) out.push(pfad);
  }
  return out;
}

const alleDateien = SUCHORTE.flatMap((o) => {
  try { return dateien(o); } catch { return []; }
});
const inhalt = new Map(alleDateien.map((f) => [f, readFileSync(f, "utf8")]));

const module = readdirSync(LIB)
  .filter((f) => f.endsWith(".js") && !f.endsWith(".test.js"))
  .map((f) => join(LIB, f));

const befunde = [];
const nurTest = [];
let geprueft = 0;

for (const datei of module) {
  const text = inhalt.get(datei) ?? readFileSync(datei, "utf8");
  const eigenerTest = datei.replace(/\.js$/, ".test.js");

  for (const name of exporteVon(text)) {
    geprueft++;
    if (GEDULDET[name]) continue;
    // Wortgrenze, damit `band` nicht in `bandbreite` trifft.
    const muster = new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`);
    const fremde = [];
    let auchTest = false;
    for (const [f, t] of inhalt) {
      if (f === datei) continue;
      if (!muster.test(t)) continue;
      if (f === eigenerTest) { auchTest = true; continue; }
      // Andere Testdateien zählen als „nur Test" — sie beweisen nicht, dass
      // die Funktion im Spiel etwas tut.
      if (f.endsWith(".test.js")) { auchTest = true; continue; }
      fremde.push(f);
    }
    if (fremde.length) continue;
    // 🔴 Der Unterschied, der die Liste erst brauchbar macht: wird der Name in
    // seiner EIGENEN Datei noch gebraucht? Dann ist er kein toter Code,
    // sondern nur ein unnötiger Export — ärgerlich, aber harmlos. Ohne diese
    // Trennung standen `passtSpiel`, `mischAnteil` und `muenzPerioden` in der
    // scharfen Gruppe, obwohl sie alle drei laufen.
    //
    // Gezählt wird OHNE die Export-Zeile selbst; ein Vorkommen bedeutet also
    // wirklich eine Verwendung.
    const ohneExport = text.replace(new RegExp(`^export\\s.*\\b${name}\\b.*$`, "gm"), "");
    const intern = (ohneExport.match(new RegExp(`\\b${name}\\b`, "g")) ?? []).length > 0;
    (auchTest ? nurTest : befunde).push({ name, datei, intern });
  }
}

// ── Nach RISIKO sortieren, nicht alphabetisch ───────────────
//
// 🔴 Der erste Lauf meldete 85 Einträge in einer Liste. Das ist keine Messung
// mehr, sondern eine Halde — und eine Halde wird beim zweiten Mal überflogen
// und beim dritten ignoriert. Dieselbe Lehre wie bei der Überfüllungs-Warnung
// der Zeitachse: eine Meldung, die den Normalfall trifft, ist keine.
//
// Die vier Funde vom 06.08. hatten eine gemeinsame Eigenschaft: es waren
// FUNKTIONEN in Modulen, die zu einem `rules.*`-Block gehören. Dort heißt „ruft
// niemand auf" nämlich „die Einstellung tut nichts". Bei einer Konstante oder
// einem Label heißt es bloß „ungenutzt".
const REGELMODULE = new Set(
  [...(inhalt.get("src/lib/engine.js") ?? "").matchAll(/from\s+"\.\/([a-zA-Z0-9_]+)"/g)]
    .map((m) => `${m[1]}.js`),
);
const istKonstante = (n) => /^[A-Z0-9_]+$/.test(n);
const rang = (b) => {
  // Intern benutzt = läuft, nur der Export ist überflüssig. Ganz nach hinten.
  if (b.intern) return 3;
  if (istKonstante(b.name)) return 2;
  return REGELMODULE.has(b.datei.replace(/^src\/lib\//, "")) ? 0 : 1;
};

const kurz = (d) => d.replace(/^src\/lib\//, "");
console.log(`\n${"=".repeat(88)}`);
console.log("  TOT-DURCHGANG — welcher Export hat keinen Aufrufer?");
console.log(`  ${module.length} Module · ${geprueft} Exporte geprüft`);
console.log(`${"=".repeat(88)}\n`);

const alleBefunde = [
  ...befunde.map((b) => ({ ...b, wo: "niemand" })),
  ...nurTest.map((b) => ({ ...b, wo: "nur Test" })),
];
const gruppen = [
  ["🔴 FUNKTION IN EINEM REGEL-MODUL — hier heißt „kein Aufrufer\" meist: die Einstellung tut nichts",
    alleBefunde.filter((b) => rang(b) === 0)],
  ["Funktion in einem sonstigen Modul", alleBefunde.filter((b) => rang(b) === 1)],
  ["Konstante oder Katalog — meist harmlos, aber ungenutzt", alleBefunde.filter((b) => rang(b) === 2)],
  ["Wird INTERN benutzt — läuft also, nur der Export ist überflüssig", alleBefunde.filter((b) => rang(b) === 3)],
];

for (const [titel, liste] of gruppen) {
  if (!liste.length) continue;
  console.log(`  ${titel}  (${liste.length})`);
  for (const b of liste.sort((x, y) => x.datei.localeCompare(y.datei) || x.name.localeCompare(y.name))) {
    console.log(`     ${kurz(b.datei).padEnd(24)} ${b.name.padEnd(28)} ${b.wo}`);
  }
  console.log();
}

if (!alleBefunde.length) {
  console.log("  ✅ Jeder Export hat einen Aufrufer außerhalb seiner Tests.");
} else {
  console.log("  🔴 „nur Test\" ist die Sorte, die am 06.08. viermal aufgefallen ist. Ein");
  console.log("     grüner Test beweist, dass die Funktion RICHTIG rechnet — nicht, dass");
  console.log("     sie jemand fragt. Für jeden Eintrag gilt: anschließen, löschen, oder");
  console.log("     mit einem Satz in `GEDULDET` begründen.");
  console.log("  ⚠️ Die erste Gruppe zuerst. Die dritte ist meist Beiwerk (Farbtabellen,");
  console.log("     Label-Kataloge) und darf lange stehen bleiben.");
}
console.log();
