// ============================================================
//  SEED-GENERATOR — Bundesliga-Spiele in die Supabase-DB
//
//  Erzeugt aus den vorhandenen Quoten-Daten (src/lib/bundesligaData.js →
//  Poisson-Modell in oddsGenerator.js) ein idempotentes SQL-Skript für die
//  `matches`-Tabelle. So werden die 27 Spiele (Saison 2026/27, Spieltage 1–3)
//  auf der echten Seite (Supabase) live betippbar — nicht nur im Mock-Store.
//
//  Ausführen:  npm run seed:bundesliga
//              → schreibt supabase/seed-bundesliga.sql
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

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;          // String → SQL-Literal
const j = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`; // Objekt → jsonb-Literal

const matches = getBundesligaMatches();

const rows = matches.map((m) =>
  `  (${q(m.matchId)}, ${q(m.home)}, ${q(m.away)}, ${q(m.kickoff)}::timestamptz, ` +
  `${m.matchday}, ${j(m.snapshot)}, null)`
);

const sql = `-- ============================================================
--  Bundesliga-Seed (Saison 2026/27, Spieltage 1–3) — AUTOGENERIERT
--  Quelle: src/lib/bundesligaData.js · erzeugt via: npm run seed:bundesliga
--  NICHT von Hand editieren — bei Änderungen an den Quoten-Daten neu erzeugen.
--
--  Idempotent: kann gefahrlos erneut ausgeführt werden (ON CONFLICT aktualisiert
--  Paarung/Anstoß/Quoten). result bleibt NULL → man tippt vor Anpfiff blind;
--  echte Ergebnisse werden später separat nachgetragen (überschreibt hier nichts).
-- ============================================================

insert into public.matches (id, home, away, kickoff, matchday, snapshot, result) values
${rows.join(",\n")}
on conflict (id) do update set
  home     = excluded.home,
  away     = excluded.away,
  kickoff  = excluded.kickoff,
  matchday = excluded.matchday,
  snapshot = excluded.snapshot;
  -- result absichtlich NICHT überschrieben: einmal gesetzte echte Ergebnisse bleiben.
`;

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../supabase");
const outFile = path.join(outDir, "seed-bundesliga.sql");
writeFileSync(outFile, sql, "utf8");

console.log(`✓ ${matches.length} Spiele → supabase/seed-bundesliga.sql geschrieben.`);
console.log("  Nächster Schritt: Inhalt im Supabase-SQL-Editor ausführen.");
