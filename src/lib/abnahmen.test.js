import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// ============================================================
//  DIE ABNAHMEN BLEIBEN ANGESCHLOSSEN
//
//  🔴 Der Befund vom 27.08.2026: von 13 Durchgaengen setzten **9 keinen
//  Rueckgabewert**. Sie fanden etwas, schrieben es hin -- und beendeten sich
//  mit 0. Kein `&&` brach ab, keine Kette schlug an. Dazu gab es kein
//  Kommando, das alle laufen laesst, obwohl CLAUDE.md genau das verlangt
//  („wer eine Mechanik ergaenzt, geht sie ALLE durch").
//
//  ⚠️ Dieser Test prueft NICHT die Durchgaenge selbst -- das tun sie
//  gegenseitig. Er prueft die VERKABELUNG, und zwar die Sorte Fehler, die
//  niemandem auffaellt: ein Durchgang ohne Schlusszeile faellt still aus dem
//  Sammel-Lauf, und der bleibt gruen.
// ============================================================

const SCRIPTS = "scripts";

// Ausdruecklich ohne Schlusszeile, mit Grund -- dieselbe Liste wie im
// Sammel-Lauf. ⛔ Ein Eintrag ohne Satz ist nicht erlaubt.
const OHNE_URTEIL = {
  "balance-durchgang.mjs": "stillgelegt — Balancing ist Endphase (CLAUDE.md)",
  "bereit-durchgang.mjs": "Bericht fuer Andi ueber Schluessel und Datenbank, kein Code-Urteil",
};

const durchgaenge = readdirSync(SCRIPTS).filter((f) => f.endsWith("-durchgang.mjs"));

describe("Jeder Durchgang faellt ein Urteil", () => {
  it("es gibt ueberhaupt welche -- sonst prueft dieser Test nichts", () => {
    expect(durchgaenge.length).toBeGreaterThanOrEqual(13);
  });

  it("🔴 jeder ruft `melde()` -- oder steht mit Grund in der Ausnahmeliste", () => {
    const stumm = durchgaenge.filter((f) => {
      if (OHNE_URTEIL[f]) return false;
      return !/melde\(/.test(readFileSync(join(SCRIPTS, f), "utf8"));
    });
    expect(
      stumm,
      "Diese Durchgaenge melden nichts und fallen damit still aus `npm run "
      + "abnahmen` heraus -- der Lauf bleibt gruen, obwohl sie etwas finden:\n"
      + stumm.join("\n"),
    ).toEqual([]);
  });

  it("jede Ausnahme traegt eine Begruendung", () => {
    for (const [datei, grund] of Object.entries(OHNE_URTEIL)) {
      expect(durchgaenge, `${datei} steht in der Ausnahmeliste, existiert aber nicht`).toContain(datei);
      expect(grund.length, datei).toBeGreaterThan(20);
    }
  });
});

describe("Der Sammel-Lauf kennt sie alle", () => {
  const lauf = readFileSync(join(SCRIPTS, "abnahmen-alle.mjs"), "utf8");
  const genannt = new Set([
    ...[...lauf.matchAll(/\{ name: "(\w+)"/g)].map((m) => m[1]),
    ...Object.keys(/const NICHT_DABEI = \{([\s\S]*?)\};/.exec(lauf)?.[1]
      ? Object.fromEntries([...(/const NICHT_DABEI = \{([\s\S]*?)\};/.exec(lauf)[1])
        .matchAll(/(\w+):/g)].map((m) => [m[1], true]))
      : {}),
  ]);

  it("🔴 kein Durchgang fehlt in der Liste", () => {
    // ⚠️ Der leise Fehler: jemand baut einen neuen Durchgang, traegt ihn in
    // `package.json` ein und vergisst den Sammel-Lauf. Dann laeuft er nie,
    // und niemand merkt es -- er ist ja da.
    const fehlend = durchgaenge
      .map((f) => f.replace("-durchgang.mjs", ""))
      .filter((n) => !genannt.has(n));
    expect(
      fehlend,
      "Diese Durchgaenge gibt es, aber `npm run abnahmen` ruft sie nicht auf "
      + "(und nennt sie auch nicht als bewusst ausgelassen):\n" + fehlend.join("\n"),
    ).toEqual([]);
  });

  it("liest die Schlusszeile und nicht den Fliesstext", () => {
    // 🔴 Ein Bericht, den man nach seiner Prosa beurteilt, wird beim ersten
    // umformulierten Satz still gruen.
    expect(lauf).toMatch(/ABNAHME \\S\+: \(\.\+\)\$|ABNAHME/);
    expect(lauf).not.toMatch(/includes\("✅"\)/);
  });
});
