// ============================================================
//  SYNC-STATUS — „wie synchron sind die beiden Accounts?"
//
//  Zeigt auf einen Blick, ob Account 1 und Account 2 auf demselben Stand sind,
//  wer zuletzt was gepusht hat und ob im Koordinationskanal etwas Unbeantwortetes
//  liegt. Gedacht für den Nutzer, der beide Sessions überblicken will.
//
//  Aufruf:  npm run sync
// ============================================================

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const sh = (cmd) => { try { return execSync(cmd, { encoding: "utf8" }).trim(); } catch { return ""; } };
const zeile = (s = "─") => s.repeat(64);

// Remote-Stand holen, ohne das Arbeitsverzeichnis anzufassen.
sh("git fetch origin main --quiet");

const branch = sh("git rev-parse --abbrev-ref HEAD");
const lokal = sh("git rev-parse --short HEAD");
const remote = sh("git rev-parse --short origin/main");
const voraus = sh("git rev-list --count origin/main..HEAD");
const zurueck = sh("git rev-list --count HEAD..origin/main");
const schmutzig = sh("git status --porcelain").split("\n").filter((l) => l.trim() && !l.includes(".claude/")).length;

console.log(`\n${zeile("═")}`);
console.log("  SYNC-STATUS  ·  Account 2 (dieser Chat)  ↔  Account 1");
console.log(zeile("═"));

// ── Synchronität ────────────────────────────────────────────
let ampel, satz;
if (voraus === "0" && zurueck === "0") {
  ampel = "🟢"; satz = "Vollständig synchron — beide Seiten sehen dasselbe.";
} else if (voraus !== "0" && zurueck !== "0") {
  ampel = "🔴"; satz = `AUSEINANDER: ${voraus} Commit(s) nur bei mir, ${zurueck} nur beim anderen. Merge nötig.`;
} else if (voraus !== "0") {
  ampel = "🟡"; satz = `${voraus} Commit(s) noch NICHT gepusht — Account 1 sieht sie nicht.`;
} else {
  ampel = "🟡"; satz = `${zurueck} Commit(s) von Account 1 noch nicht geholt.`;
}
console.log(`\n${ampel} ${satz}`);
console.log(`   Branch ${branch} · lokal ${lokal} · remote ${remote}` + (schmutzig ? ` · ${schmutzig} Datei(en) uncommittet` : ""));

// ── Wer hat zuletzt was gemacht ─────────────────────────────
console.log(`\n${zeile()}\n  LETZTE COMMITS AUF main\n${zeile()}`);
const log = sh('git log origin/main -8 --pretty=format:"%h|%an|%ar|%s"');
for (const l of log.split("\n").filter(Boolean)) {
  const [hash, autor, wann, betreff] = l.split("|");
  console.log(`  ${hash}  ${wann.padEnd(16)} ${betreff.slice(0, 60)}`);
}

// ── Offene Punkte aus dem Kanal ─────────────────────────────
if (existsSync("COORDINATION.md")) {
  const txt = readFileSync("COORDINATION.md", "utf8");
  const nachrichten = [...txt.matchAll(/^### (.+?) · Account (\d) → Account (\d)(.*)$/gm)];
  console.log(`\n${zeile()}\n  KOORDINATIONSKANAL\n${zeile()}`);
  console.log(`  ${nachrichten.length} Nachricht(en) im Log.`);
  const letzte = nachrichten[0];
  if (letzte) {
    const [, datum, von, an] = letzte;
    console.log(`  Neueste: Account ${von} → Account ${an}  (${datum})`);
    console.log(letzte[1].includes("Account 2") || von === "2"
      ? "  → Zuletzt habe ICH geschrieben. Warte auf Antwort von Account 1."
      : "  → Zuletzt hat ACCOUNT 1 geschrieben. Ich bin am Zug.");
  }
  // Offene Nutzer-Aufgaben einsammeln
  const aufgaben = [...txt.matchAll(/\*\*(?:⚠️ )?Nutzer-Aufgabe[^*]*\*\*/g)].length;
  if (aufgaben) console.log(`  ${aufgaben} als Nutzer-Aufgabe markierte Stelle(n) im Kanal.`);
}

console.log(`\n${zeile("═")}\n`);
