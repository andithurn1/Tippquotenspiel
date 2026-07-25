// ============================================================
//  SEED-GENERATOR — alle Spiele in die Supabase-DB
//
//  Erzeugt aus den vorhandenen Quoten-Daten (src/lib/bundesligaData.js und
//  src/lib/championsLeagueData.js → Poisson-Modell in oddsGenerator.js) ein
//  idempotentes SQL-Skript für die `matches`-Tabelle. So sind die Spiele auf
//  der echten Seite (Supabase) live betippbar — nicht nur im Mock-Store.
//
//  Hieß früher seed-bundesliga.mjs; seit es MEHRERE Wettbewerbe gibt (siehe
//  wettbewerbe.js), wäre „bundesliga" im Namen irreführend. `npm run
//  seed:bundesliga` bleibt als Alias bestehen, damit ältere Anleitungen
//  weiter funktionieren.
//
//  Ausführen:  npm run seed:matches
//              → schreibt supabase/seed-matches.sql
//  Danach:     den Inhalt im Supabase-SQL-Editor einmal ausführen.
//
//  WICHTIG: result wird als NULL geseedet — die Fixtures liegen in der Zukunft,
//  man tippt VOR Anpfiff blind. Die echten Ergebnisse trägt später ein Job/Admin
//  serverseitig nach (Snapshot der Quoten bleibt zum Tippzeitpunkt eingefroren).
//  Muss über vite-node laufen (löst @-Alias & extensionslose Imports auf).
// ============================================================

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getBundesligaMatches } from "../src/lib/bundesligaData.js";
import { getChampionsLeagueMatches } from "../src/lib/championsLeagueData.js";

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;          // String → SQL-Literal
const j = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`; // Objekt → jsonb-Literal

const matches = [...getBundesligaMatches(), ...getChampionsLeagueMatches()];

const rows = matches.map((m) =>
  `  (${q(m.matchId)}, ${q(m.home)}, ${q(m.away)}, ${q(m.kickoff)}::timestamptz, ` +
  `${m.matchday}, ${j(m.snapshot)}, null, ${q(m.wettbewerb ?? "bl")}, ${q(m.phase ?? "liga")})`
);

// Übersicht je Wettbewerb — landet als Kommentar in der SQL-Datei, damit beim
// Ausführen sichtbar ist, was hineinkommt.
const proWettbewerb = matches.reduce((acc, m) => {
  const k = m.wettbewerb ?? "bl";
  acc[k] = (acc[k] ?? 0) + 1;
  return acc;
}, {});
const uebersicht = Object.entries(proWettbewerb)
  .map(([k, n]) => `--    ${k}: ${n} Spiele`)
  .join("\n");

const sql = `-- ============================================================
--  Match-Seed (Saison 2026/27) — AUTOGENERIERT
--  Quelle: src/lib/bundesligaData.js + src/lib/championsLeagueData.js
--  erzeugt via: npm run seed:matches
--  NICHT von Hand editieren — bei Änderungen an den Quoten-Daten neu erzeugen.
--
--  Enthalten (${matches.length} Spiele):
${uebersicht}
--
--  Voraussetzung: schema.sql wurde ausgeführt (Spalten wettbewerb/phase).
--  Idempotent: kann gefahrlos erneut ausgeführt werden (ON CONFLICT aktualisiert
--  Paarung/Anstoß/Quoten). result bleibt NULL → man tippt vor Anpfiff blind;
--  echte Ergebnisse werden später separat nachgetragen (überschreibt hier nichts).
-- ============================================================

insert into public.matches (id, home, away, kickoff, matchday, snapshot, result, wettbewerb, phase) values
${rows.join(",\n")}
on conflict (id) do update set
  home       = excluded.home,
  away       = excluded.away,
  kickoff    = excluded.kickoff,
  matchday   = excluded.matchday,
  snapshot   = excluded.snapshot,
  wettbewerb = excluded.wettbewerb,
  phase      = excluded.phase;
  -- result absichtlich NICHT überschrieben: einmal gesetzte echte Ergebnisse bleiben.
`;

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../supabase");
const outFile = path.join(outDir, "seed-matches.sql");
writeFileSync(outFile, sql, "utf8");

console.log(`✓ ${matches.length} Spiele → supabase/seed-matches.sql geschrieben.`);
for (const [k, n] of Object.entries(proWettbewerb)) console.log(`    ${k}: ${n}`);
console.log("  Nächster Schritt: Inhalt im Supabase-SQL-Editor ausführen.");
