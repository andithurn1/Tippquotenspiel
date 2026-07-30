// ============================================================
//  NUR DIE SPIELE MIT ECHTEN MARKTQUOTEN als SQL
//
//  `npm run seed:matches` schreibt alle 1636 Spiele — fünf Dateien, zusammen
//  1,8 MB, die der Supabase-SQL-Editor nur mit Mühe verdaut. Nach einem
//  `odds:holen` ändern sich davon aber nur die Spiele, für die es echte
//  Marktquoten gibt (aktuell 70). Der Rest ist byteweise identisch.
//
//  Dieses Skript schreibt genau diese Teilmenge: ein Einfügen statt fünf.
//
//  ⚠️ **Die Datei wird NICHT eingecheckt, und das ist Absicht.** Eine
//  gespeicherte Delta-Datei ist nach dem nächsten `odds:holen` veraltet — wer
//  sie dann noch einmal ausführt, schreibt ALTE Quoten über neue, und zwar
//  ohne Fehlermeldung. Erzeugen, ausführen, wegwerfen. Der Kopf der Datei
//  trägt deshalb einen Zeitstempel.
//
//  Gefiltert wird über `snapshot.quelle === "api"` — dieselbe Quelle wie das
//  große Seed-Skript (`alleMatches()`), damit keine zweite Wahrheit entsteht.
//
//  Aufruf:  npm run seed:delta
// ============================================================

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { alleMatches } from "../src/lib/ligen.js";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = process.argv[2] ?? path.resolve(HIER, "..", "supabase", "_quoten-update.sql");

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const j = (o) => q(JSON.stringify(o));

const echte = alleMatches().filter((m) => m.snapshot?.quelle === "api");
if (!echte.length) {
  console.log("Keine Spiele mit echten Marktquoten — nichts zu tun.");
  console.log("  (Erst `npm run odds:holen -- <liga>` laufen lassen.)");
  process.exit(0);
}

const zeile = (m) =>
  `(${q(m.matchId)}, ${q(m.home)}, ${q(m.away)}, ${q(m.kickoff)}, ` +
  `${m.matchday}, ${j(m.snapshot)}, null, ${q(m.wettbewerb ?? "bl")}, ${q(m.phase ?? "liga")})`;

const proLiga = {};
for (const m of echte) proLiga[m.wettbewerb] = (proLiga[m.wettbewerb] ?? 0) + 1;
const verteilung = Object.entries(proLiga).map(([k, v]) => `${k}: ${v}`).join(" · ");

const sql = [
  "-- ============================================================",
  "--  NUR DIE SPIELE MIT ECHTEN MARKTQUOTEN",
  "--",
  "--  ERZEUGTE DATEI — nicht einchecken, nicht aufheben.",
  `--  Erzeugt:  ${new Date().toISOString()}`,
  `--  Umfang:   ${echte.length} Spiele (${verteilung})`,
  "--",
  "--  ⚠️ Nach dem naechsten `odds:holen` ist diese Datei VERALTET. Wer sie",
  "--     dann noch einmal ausfuehrt, schreibt alte Quoten ueber neue — ohne",
  "--     Fehlermeldung. Neu erzeugen mit `npm run seed:delta`.",
  "--",
  "--  Idempotent (ON CONFLICT). `result` bleibt unberuehrt.",
  "-- ============================================================",
  "",
  "insert into public.matches (id, home, away, kickoff, matchday, snapshot, result, wettbewerb, phase) values",
  echte.map(zeile).join(",\n"),
  `on conflict (id) do update set
  home = excluded.home,
  away = excluded.away,
  kickoff = excluded.kickoff,
  matchday = excluded.matchday,
  snapshot = excluded.snapshot,
  wettbewerb = excluded.wettbewerb,
  phase = excluded.phase;`,
  "",
].join("\n");

writeFileSync(ZIEL, sql, "utf8");
console.log(`✓ ${echte.length} Spiele → ${ZIEL}`);
console.log(`  ${verteilung}`);
console.log("  Inhalt im Supabase-SQL-Editor ausführen, danach die Datei löschen.");
