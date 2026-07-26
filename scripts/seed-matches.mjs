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
import { alleMatches } from "../src/lib/ligen.js";

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;          // String → SQL-Literal
const j = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`; // Objekt → jsonb-Literal

// Welche Wettbewerbe dabei sind, steht in `ligen.js` — dieselbe Quelle wie im
// Mock-Store. Sonst hätte die Live-DB einen anderen Spielplan als die Demo.
const matches = alleMatches();

const zeile = (m) =>
  `  (${q(m.matchId)}, ${q(m.home)}, ${q(m.away)}, ${q(m.kickoff)}::timestamptz, ` +
  `${m.matchday}, ${j(m.snapshot)}, null, ${q(m.wettbewerb ?? "bl")}, ${q(m.phase ?? "liga")})`;

const rows = matches.map(zeile);

const KONFLIKT = `on conflict (id) do update set
  home       = excluded.home,
  away       = excluded.away,
  kickoff    = excluded.kickoff,
  matchday   = excluded.matchday,
  snapshot   = excluded.snapshot,
  wettbewerb = excluded.wettbewerb,
  phase      = excluded.phase;
  -- result absichtlich NICHT überschrieben: einmal gesetzte echte Ergebnisse bleiben.
`;

const kopf = ({ titel, anzahl, uebersicht }) => `-- ============================================================
--  ${titel} — AUTOGENERIERT
--  Quelle: src/lib/ligen.js (Bundesliga · Premier League · La Liga · Serie A · CL)
--  erzeugt via: npm run seed:matches
--  NICHT von Hand editieren — bei Änderungen an den Quoten-Daten neu erzeugen.
--
--  Enthalten (${anzahl} Spiele):
${uebersicht}
--
--  Voraussetzung: schema.sql wurde ausgeführt (Spalten wettbewerb/phase).
--  Idempotent: kann gefahrlos erneut ausgeführt werden (ON CONFLICT aktualisiert
--  Paarung/Anstoß/Quoten). result bleibt NULL → man tippt vor Anpfiff blind;
--  echte Ergebnisse werden später separat nachgetragen (überschreibt hier nichts).
-- ============================================================
`;

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

const sql = kopf({ titel: "Match-Seed (Saison 2026/27)", anzahl: matches.length, uebersicht })
  + `\ninsert into public.matches (id, home, away, kickoff, matchday, snapshot, result, wettbewerb, phase) values\n`
  + rows.join(",\n") + "\n" + KONFLIKT;

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../supabase");
const outFile = path.join(outDir, "seed-matches.sql");
writeFileSync(outFile, sql, "utf8");

// Zusätzlich EINE Datei JE WETTBEWERB. Mit fünf Wettbewerben ist die
// Gesamtdatei mehrere MB groß, und der SQL-Editor von Supabase wird beim
// Einfügen solcher Blöcke unzuverlässig. Wer darauf stößt, spielt die Teile
// nacheinander ein — dasselbe Ergebnis, weil alles idempotent ist.
const teile = [];
for (const [key, anzahl] of Object.entries(proWettbewerb)) {
  const teilRows = matches.filter((m) => (m.wettbewerb ?? "bl") === key).map(zeile);
  const teilSql = kopf({
    titel: `Match-Seed ${key.toUpperCase()} (Saison 2026/27)`,
    anzahl, uebersicht: `--    ${key}: ${anzahl} Spiele`,
  }) + `\ninsert into public.matches (id, home, away, kickoff, matchday, snapshot, result, wettbewerb, phase) values\n`
    + teilRows.join(",\n") + "\n" + KONFLIKT;
  const datei = path.join(outDir, `seed-matches-${key}.sql`);
  writeFileSync(datei, teilSql, "utf8");
  teile.push(`seed-matches-${key}.sql (${anzahl})`);
}

console.log(`✓ ${matches.length} Spiele → supabase/seed-matches.sql geschrieben.`);
for (const [k, n] of Object.entries(proWettbewerb)) console.log(`    ${k}: ${n}`);
console.log(`  Zusätzlich je Wettbewerb: ${teile.join(" · ")}`);
console.log("  Nächster Schritt: Inhalt im Supabase-SQL-Editor ausführen.");
console.log("  Bei Problemen mit der Größe: die Einzeldateien nacheinander ausführen.");
