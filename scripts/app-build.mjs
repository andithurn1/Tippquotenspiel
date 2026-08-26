// ============================================================
//  APP-BUILD — statischer Export für Capacitor
//
//  Aufruf:  npm run build:app
//
//  🔴 Was diese Datei löst, und warum es kein Schalter in `next.config.mjs`
//  tut: `output: "export"` bricht ab, sobald eine API-Route im Baum liegt —
//  gemessen an `/api/odds`. Next.js kennt keine Möglichkeit, einzelne Routen
//  vom Export auszunehmen. Also wird der Ordner für die Dauer des Builds
//  beiseitegelegt.
//
//  ⚠️ DAS IST EIN EINGRIFF IN DEN ARBEITSBAUM, und er muss auch dann
//  zurückgenommen werden, wenn der Build scheitert oder jemand abbricht.
//  Sonst fehlen dem nächsten `npm run build` die vier API-Routen, und
//  niemand käme auf die Idee, das mit diesem Skript in Verbindung zu
//  bringen. Deshalb `finally` UND ein Signal-Fänger.
//
//  ⚠️ Der Ordner wird VERSCHOBEN, nicht kopiert: eine Kopie würde beim
//  nächsten Lauf als „schon da" gelten und die echten Routen überschreiben.
// ============================================================
import { existsSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const API = "src/app/api";
const BEISEITE = ".api-waehrend-app-build";

let verschoben = false;

const zurueck = () => {
  if (!verschoben) return;
  if (existsSync(BEISEITE)) {
    if (existsSync(API)) rmSync(API, { recursive: true, force: true });
    renameSync(BEISEITE, API);
  }
  verschoben = false;
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => { zurueck(); process.exit(1); });
}

try {
  if (existsSync(BEISEITE)) {
    console.error(`\n⛔ ${BEISEITE} liegt noch herum — ein früherer Lauf wurde hart abgebrochen.`);
    console.error("   Bitte von Hand zurückschieben, damit nichts überschrieben wird:");
    console.error(`   mv ${BEISEITE} ${API}\n`);
    process.exit(1);
  }
  if (existsSync(API)) {
    renameSync(API, BEISEITE);
    verschoben = true;
    console.log(`→ ${API} beiseitegelegt (kommt gleich zurück)`);
  }

  rmSync(".next", { recursive: true, force: true });
  rmSync("out", { recursive: true, force: true });

  const r = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    env: { ...process.env, TQS_APP_BUILD: "1" },
  });
  if (r.status !== 0) process.exitCode = r.status ?? 1;
} finally {
  zurueck();
  console.log(`← ${API} ist wieder da`);
}
