// ============================================================
//  SCHLANK-DURCHGANG — greift ein Screen an einen Schnappschuss,
//  den er gar nicht geladen hat?
//
//  Aufruf:  npm run schlank
//
//  🔴 Die Messung dahinter (design/roadmap.md, Performance): ein Katalog wiegt
//  0,49 MB, davon 43 % `players` und 14 % `correctScore`. Beides braucht in
//  voller Länge nur die Tippabgabe, für EIN Spiel. Von 18 Screens, die Spiele
//  laden, fassen 14 den Schnappschuss überhaupt nicht an — und zahlen ihn
//  trotzdem bei JEDEM Öffnen.
//
//  ⚠️ **Warum das eine eigene Abnahme braucht:** die Roadmap warnt wörtlich —
//  „Ein weggelassenes Feld stürzt nicht ab — es zeigt still etwas Falsches,
//  und das fällt frühestens Wochen später auf." Genau dagegen misst dieser
//  Durchgang: wer `{ schlank: true }` lädt, darf den Schnappschuss nirgends
//  mehr anfassen.
//
//  ── Was geprüft wird ──
//  1. Screens, die schlank laden, nennen `snapshot` nicht.
//  2. Sie reichen ihre Spiele nicht an eine Funktion weiter, die einen
//     Schnappschuss liest (Liste unten, aus dem Code gemessen).
//  3. Und die Gegenrichtung, damit die Ersparnis nicht wieder einschläft:
//     wer NICHT schlank lädt, hat einen Grund dafür.
//
//  ⚠️ Textprüfung, keine Ausführung. Sie sieht, ob ein Name vorkommt — nicht,
//  ob er auf DIESEN Spielen landet. Ein falsch-positiver Fund ist deshalb
//  möglich und wird mit einem Satz in `MIT_GRUND` erledigt.
// ============================================================

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const KOMPONENTEN = "src/components";

// Funktionen, die aus einem SPIEL den Schnappschuss lesen. Wer seine Spiele
// hier hineingibt, braucht die fette Fassung.
//
// ⚠️ Gemessen über `grep "snap\\.\\|snapshot\\."`, nicht geschätzt — und die
// Liste ist Pflege-Arbeit: eine neue Funktion, die `m.snapshot` liest, gehört
// hierher, sonst geht der Durchgang an ihr vorbei.
const SCHNAPPSCHUSS_LESER = [
  "autoTipsFor", "missingMatches",          // autoTip.js
  "schuetzenSperre", "istSchuetzeGesperrt", // favoritenSperre.js
  "scoreSaison", "saisonStand",             // saisonwetten.js
  "startErgebnis",                          // vorbelegung.js
  "naheErgebnisse",                         // nearResults.js
  "matrixVon", "abdeckungVon",              // ergebnisMatrix.js
  "spannungsWert",                          // bigGame.js
];

// Screens, die bewusst die volle Fassung laden — mit Grund.
// ⛔ Ein Eintrag ohne Satz ist nicht erlaubt.
const MIT_GRUND = {
  "Tippabgabe.jsx": "Der eine Screen, der den Schnappschuss WIRKLICH braucht — Raster, Torschützen, Nähe-Belohnung.",
  "Spielwahl.jsx": "Zeigt Quoten in der Liste, damit man vor dem Klick sieht, worauf man sich einlässt.",
  "SaisonTipps.jsx": "Braucht die Zuordnung Spieler → Verein aus `players` (Torschützenkönig).",
  "Historie.jsx": "Rechnet ganze Spieltage unter fremden Regelwerken nach — dafür zählt der echte Schnappschuss.",
  "LigaSonderregeln.jsx": "Zeigt je Liga Beispielquoten, damit eine Sonderregel nicht blind eingestellt wird.",
};

const quellen = new Map();
for (const datei of readdirSync(KOMPONENTEN)) {
  if (!datei.endsWith(".jsx")) continue;
  quellen.set(datei, readFileSync(join(KOMPONENTEN, datei), "utf8"));
}

const laedtSpiele = (t) => /listMatches\(|listRoundMatches\(/.test(t);
const laedtSchlank = (t) => /schlank:\s*true/.test(t);

const funde = [];
let schlanke = 0;
let volle = 0;

for (const [datei, text] of quellen) {
  if (!laedtSpiele(text)) continue;

  if (!laedtSchlank(text)) {
    volle++;
    if (!MIT_GRUND[datei]) {
      funde.push({ datei, art: "voll ohne Grund",
        text: "lädt den vollen Katalog, ohne dass ein Grund hinterlegt ist." });
    }
    continue;
  }
  schlanke++;

  // 1) Fasst der Screen den Schnappschuss selbst an?
  if (/\bsnapshot\b/.test(text)) {
    funde.push({ datei, art: "greift zu",
      text: "lädt schlank UND nennt `snapshot` — eines von beidem ist falsch." });
  }
  // 2) Reicht er die Spiele an einen Leser weiter?
  for (const name of SCHNAPPSCHUSS_LESER) {
    if (new RegExp(`\\b${name}\\s*\\(`).test(text)) {
      funde.push({ datei, art: "reicht weiter",
        text: `lädt schlank und ruft \`${name}()\` — die Funktion liest einen Schnappschuss.` });
    }
  }
}

console.log(`\n${"=".repeat(88)}`);
console.log("  SCHLANK-DURCHGANG — wer lädt den fetten Schnappschuss, ohne ihn zu brauchen?");
console.log(`  ${schlanke} Screens laden schlank · ${volle} laden voll (${Object.keys(MIT_GRUND).length} davon begründet)`);
console.log(`${"=".repeat(88)}\n`);

if (!funde.length) {
  console.log("  ✅ Kein Screen greift an einen Schnappschuss, den er nicht geladen hat.");
  console.log("     Und jeder, der die volle Fassung nimmt, sagt warum.\n");
} else {
  for (const f of funde.sort((a, b) => a.datei.localeCompare(b.datei))) {
    console.log(`     ${f.datei.padEnd(28)} ${f.art.padEnd(16)} ${f.text}`);
  }
  console.log();
  console.log("  🔴 Ein fehlender Schnappschuss stürzt NICHT ab — er zeigt still etwas");
  console.log("     Falsches. Genau deshalb gibt es diesen Durchgang.");
  console.log("  ⚠️ Entweder voll laden (und den Grund in `MIT_GRUND` schreiben), oder");
  console.log("     den Zugriff entfernen.\n");
}
