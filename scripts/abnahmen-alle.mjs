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

// Reihenfolge nach LAUFZEIT, die schnellen zuerst: wer etwas kaputt gemacht
// hat, soll es nach zehn Sekunden wissen und nicht nach zwei Minuten.
const DURCHGAENGE = [
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
    ausgabe = execFileSync("npm", ["run", "--silent", d.name], {
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
