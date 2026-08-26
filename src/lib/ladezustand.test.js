import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// ============================================================
//  ENDET DER LADEZUSTAND AUCH, WENN ETWAS SCHIEFGEHT?
//
//  🔴 Der Fund vom 26.08.2026, gemessen gegen ein Live-Supabase ohne
//  Anmeldung: `/joker`, `/regeln` und die Status-Kachel auf `/hub` verließen
//  den Ladezustand NIE. Kein Fehler, keine leere Liste — ein ewiges „lädt …".
//  Wer den Link bekommt und draufklickt, bevor er angemeldet ist, wartet.
//
//  Die Ursache war in allen drei Fällen dieselbe Zeile:
//
//      }).catch(() => {});          // verschluckt UND setzt nichts
//
//  Der Ladezustand hängt an `x == null`, und `null` bleibt es dann für immer.
//  Ein EINZIGER fehlschlagender Aufruf im `Promise.all` reicht.
//
//  ── Was dieser Test prüft, und was nicht ──
//  Er verbietet den stillen `catch` NICHT überall — an vielen Stellen ist er
//  richtig (eine Nebensache, die scheitern darf, ohne den Screen zu stören).
//  Er verbietet ihn dort, wo eine ZUSTANDSVARIABLE den Ladezustand steuert:
//  Wer `{x == null && …lädt…}` rendert, muss `x` auch im Fehlerfall setzen.
//
//  ⚠️ Textprüfung, keine Ausführung — ein echter Render-Test bräuchte jsdom
//  und eine Testbibliothek. Dieselbe Bauart wie `rund.test.js`: geprüft wird
//  die STELLE, an der der Fehler entsteht.
// ============================================================

// Screens, die einen stillen `catch` behalten dürfen — mit Grund.
const GEDULDET = {
  "Ranking.jsx":
    "Die Ladezeile hängt an `board`, und dessen Aufruf setzt im Fehlerfall "
    + "bereits `[]`. Die beiden stillen `catch` betreffen Rundenname und "
    + "Duell-Vorgänge — beides Beiwerk, das fehlen darf.",
  "Abrechnung.jsx":
    "Wie bei `Ranking.jsx`: die Tabellen-Ladezeile hängt an `board`, und der "
    + "Leaderboard-Aufruf setzt im Fehlerfall `[]`. Die übrigen Aufrufe füllen "
    + "Zusatzangaben, deren Ausbleiben den Screen nicht anhält.",
  "SpottSenden.jsx":
    "Ebenso: `board` wird im Fehlerfall auf `[]` gesetzt. Der stille `catch` "
    + "steht am Verlauf, der nur den angezeigten Spieltag bestimmt.",
  "Tippabgabe.jsx":
    "Die Ladezeile hängt an `match`/`picks` aus der Quoten-Quelle, nicht an "
    + "einem Store-Aufruf. Die stillen `catch` betreffen Rundenname, "
    + "Beschluss-Lage und Rad-Belohnungen — alles Beiwerk.",
};

// ⚠️ Kommentare herausnehmen, bevor gesucht wird. Sonst schlägt die Prüfung
// auf ihre eigene Begründung an: in `Regelaenderungen.jsx` steht der behobene
// Fall als Erklärung im Kommentar („nicht nur `catch(() => {})`") — und genau
// das meldete die erste Fassung als Fund. Ein Wächter, der Erklärungen für
// Verstöße hält, erzieht dazu, keine zu schreiben.
const ohneKommentare = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const jsx = [];
const lauf = (dir) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) lauf(p);
    else if (n.endsWith(".jsx")) jsx.push(p);
  }
};
lauf("src/components");

// Screens mit einem Ladezustand: irgendwo steht ein „lädt" im JSX.
const mitLadezustand = jsx.filter((p) => /lädt/.test(readFileSync(p, "utf8")));

describe("Der Ladezustand endet auch im Fehlerfall", () => {
  it("es gibt überhaupt Screens mit Ladezustand", () => {
    // Sonst wäre dieser Test grün, weil er nichts findet.
    expect(mitLadezustand.length).toBeGreaterThan(5);
  });

  it("kein Screen mit Ladezustand verschluckt einen Fehler, ohne etwas zu setzen", () => {
    const funde = mitLadezustand
      .filter((p) => ohneKommentare(readFileSync(p, "utf8")).includes("catch(() => {})"))
      .map((p) => p.split("/").pop())
      .filter((n) => !GEDULDET[n]);
    expect(
      funde,
      "Diese Screens zeigen einen Ladezustand UND verschlucken Fehler, ohne "
      + "einen Wert zu setzen. Live heißt das: der Screen lädt für immer.\n"
      + "Entweder im `catch` einen neutralen Wert setzen — oder in `GEDULDET` "
      + "begründen, warum der Ladezustand nicht daran hängt.\n"
      + funde.join("\n")
    ).toEqual([]);
  });

  it("jede Ausnahme trägt einen Begründungssatz", () => {
    for (const [n, grund] of Object.entries(GEDULDET)) {
      expect(typeof grund, n).toBe("string");
      expect(grund.length, n).toBeGreaterThan(80);
    }
  });

  it("keine Ausnahme ist überholt", () => {
    // Eine Begründung für einen Screen, der den stillen `catch` gar nicht mehr
    // hat, beschreibt einen Zustand, den es nicht mehr gibt.
    const ueberholt = Object.keys(GEDULDET).filter((n) => {
      const p = jsx.find((x) => x.endsWith(`/${n}`));
      return !p || !ohneKommentare(readFileSync(p, "utf8")).includes("catch(() => {})");
    });
    expect(ueberholt, `Ausnahme zeigt ins Leere: ${ueberholt.join(", ")}`).toEqual([]);
  });
});
