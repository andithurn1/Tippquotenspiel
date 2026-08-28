// ============================================================
//  ALLE ABNAHMEN IN EINEM LAUF
//
//  Aufruf:  npm run abnahmen
//
//  🔴 CLAUDE.md verlangt: „wer eine Mechanik ergänzt, geht sie ALLE durch."
//  In der Praxis tippt man drei und vergisst vier — es gab schlicht kein
//  Kommando dafür. Und schlimmer: von 13 Durchgängen setzten **9 keinen
//  Rückgabewert**. Sie fanden etwas, schrieben es hin und beendeten sich mit
//  0. Kein `&&` brach ab, keine Kette schlug an.
//
//  ⚠️ Dieser Lauf liest die Schlusszeile (`ABNAHME <name>: …`, siehe
//  `abnahme.mjs`) und NICHT den Fließtext. Ein Bericht, den man nach seiner
//  Prosa beurteilt, wird beim ersten umformulierten Satz still grün.
//
//  ── Was er ausdrücklich NICHT tut ──
//  ⛔ Er läuft nicht parallel. Mehrere Durchgänge bauen dieselben Kataloge auf
//  (1943 Spiele), und drei davon gleichzeitig machen die Zeitmessung unten
//  wertlos — sie ist das Einzige, woran man merkt, dass ein Durchgang
//  entgleist.
//  ⛔ Er ersetzt `npm test` und `npm run build` nicht. Die stehen daneben,
//  weil sie etwas anderes fragen (siehe CLAUDE.md: „Ein Test fragt ‚ist es
//  kaputt'. Diese fragen etwas anderes").
// ============================================================

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// 🔴 **Warum hier nicht `npm run <name>` steht, obwohl genau das gemeint ist.**
// `execFileSync` öffnet keine Shell. Unter Windows heißt der Starter `npm.cmd`
// und wird als nacktes `npm` nicht gefunden (`ENOENT`); seit Node 20 verweigert
// `spawnSync` zusätzlich das Ausführen einer `.cmd` ohne Shell (`EINVAL`).
//
// ⚠️ **Das war kein Schönheitsfehler.** Gemessen am 28.08.2026: auf diesem
// Rechner stürzten dadurch ALLE ZWÖLF Durchgänge in je 0,0 Sekunden ab — und
// die Tabelle sah aus wie ein Befund, obwohl gar nichts gemessen worden war.
// Ein Sammel-Lauf, der nicht startet, ist gefährlicher als keiner: er beruhigt
// nicht, aber er lenkt auf die falsche Fährte.
//
// ✅ Deshalb wird die Kommandozeile aus der `package.json` GELESEN — sie bleibt
// die eine Quelle — und mit demselben Node gestartet, der gerade läuft. Kein
// Shell-Aufruf, kein PATH, plattformgleich.
const SKRIPTE = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts;
const VITE_NODE = "node_modules/vite-node/vite-node.mjs";

function befehlFuer(name) {
  const zeile = SKRIPTE?.[name];
  if (!zeile) throw new Error(`In package.json steht kein Skript "${name}".`);
  const teile = zeile.trim().split(" ").filter(Boolean);
  // `node scripts/x.mjs` → direkt; `vite-node scripts/x.mjs` → über vite-node.
  if (teile[0] === "node") return teile.slice(1);
  if (teile[0] === "vite-node") return [VITE_NODE, ...teile.slice(1)];
  throw new Error(`Unbekannter Starter "${teile[0]}" für "${name}" — bitte hier ergänzen.`);
}

// Reihenfolge nach LAUFZEIT, die schnellen zuerst: wer etwas kaputt gemacht
// hat, soll es nach zehn Sekunden wissen und nicht nach zwei Minuten.
const DURCHGAENGE = [
  { name: "worte", was: "Werkstatt-Sprache in einem Spielertext" },
  { name: "detail", was: "zweite Ebene hinter einem Klick" },
  { name: "toepfe", was: "wird jeder Rückgabe-Topf ausgeleert" },
  { name: "schlank", was: "Schnappschuss nur, wo er gebraucht wird" },
  { name: "sicht", was: "sieht der Mitspieler die Mechanik" },
  { name: "stufen", was: "kommt der Admin an die Einstellung" },
  { name: "bewegung", was: "Animationen ohne neues Ausmessen" },
  { name: "tot", was: "ruft die gebaute Funktion jemand auf" },
  { name: "anzeige", was: "überall dieselbe Zahl" },
  { name: "einstellbar", was: "nimmt jedes Feld einen anderen Wert an" },
  { name: "gleich", was: "Übersicht und Wertung meinen dieselbe Runde" },
  { name: "greift", was: "bewegt die Einstellung überhaupt etwas" },
];

// ⚠️ Ausdrücklich NICHT dabei, und beides mit Grund:
//   `balance` — stillgelegt (CLAUDE.md, Balancing ist Endphase)
//   `bereit`  — Bericht FÜR ANDI, kein Urteil über den Code
const NICHT_DABEI = {
  balance: "stillgelegt — Balancing ist Endphase (CLAUDE.md)",
  bereit: "Bericht für Andi über Schlüssel und Datenbank, kein Code-Urteil",
};

const ergebnisse = [];
const beginn = Date.now();

for (const d of DURCHGAENGE) {
  const t0 = Date.now();
  let ausgabe = "";
  let abgestuerzt = false;
  try {
    ausgabe = execFileSync(process.execPath, befehlFuer(d.name), {
      encoding: "utf8", timeout: 600000, stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (e) {
    // 🔴 Ein Durchgang, der ABSTÜRZT, ist nicht dasselbe wie einer, der etwas
    // FINDET — und er ist der schlimmere Fall: er hat gar nicht gemessen.
    ausgabe = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    abgestuerzt = !/ABNAHME /.test(ausgabe);
  }
  const zeile = /ABNAHME \S+: (.+)$/m.exec(ausgabe);
  ergebnisse.push({
    ...d,
    urteil: abgestuerzt ? "ABGESTÜRZT" : (zeile?.[1]?.trim() ?? "keine Schlusszeile"),
    sekunden: ((Date.now() - t0) / 1000).toFixed(1),
    ausgabe,
  });
}

const breit = "=".repeat(88);
console.log(`\n${breit}`);
console.log("  ALLE ABNAHMEN");
console.log(breit + "\n");

for (const e of ergebnisse) {
  const gut = e.urteil === "ok" || e.urteil === "Bericht";
  const zeichen = gut ? "✅" : "🔴";
  console.log(`  ${zeichen} ${e.name.padEnd(13)} ${e.urteil.padEnd(20)} ${e.sekunden.padStart(5)}s   ${e.was}`);
}

const rot = ergebnisse.filter((e) => e.urteil !== "ok" && e.urteil !== "Bericht");
console.log(`\n${"-".repeat(88)}`);
console.log(`  ${ergebnisse.length} Durchgänge · ${((Date.now() - beginn) / 1000).toFixed(0)}s gesamt`);
for (const [name, grund] of Object.entries(NICHT_DABEI)) {
  console.log(`  ⚠️ nicht dabei: ${name} — ${grund}`);
}

if (!rot.length) {
  console.log("\n  ✅ Alle Abnahmen sauber.");
  console.log("  ⚠️ `npm test` und `npm run build` gehören trotzdem daneben — sie fragen");
  console.log("     etwas anderes (CLAUDE.md, Abschnitt „Abnahmen statt Tests\").\n");
} else {
  console.log("");
  for (const e of rot) {
    console.log(`\n${"─".repeat(88)}`);
    console.log(`  🔴 ${e.name} — ${e.urteil}`);
    console.log(`${"─".repeat(88)}`);
    // Nur der Schluss: der Fließtext davor ist die Erklärung, die Funde stehen
    // am Ende. Wer mehr will, ruft den Durchgang einzeln auf.
    console.log(e.ausgabe.split("\n").slice(-30).join("\n"));
  }
  process.exitCode = 1;
}
