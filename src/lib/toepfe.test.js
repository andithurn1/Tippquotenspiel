import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";

// ⚠️ **Nicht über `npx` starten.** `execFileSync` öffnet keine Shell: unter
// Windows heißt der Starter `npx.cmd` und wird als nacktes `npx` gar nicht
// gefunden (`ENOENT`) — und seit Node 20 verweigert `spawnSync` das Ausführen
// einer `.cmd` ohne Shell zusätzlich mit `EINVAL`. Beides ließ diese Datei
// schon beim EINLESEN durchfallen, ohne dass am geprüften Durchgang etwas
// kaputt war (gemessen am 28.08.2026 auf diesem Rechner).
//
// ✅ Deshalb direkt derselbe Node, der gerade läuft, auf das lokale
// `vite-node`-Skript. Das ist auf jeder Plattform dieselbe Zeile und braucht
// weder Shell noch PATH.
const VITE_NODE = "node_modules/vite-node/vite-node.mjs";

// ============================================================
//  DIE SPERRKLINKE FUER DEN TOPF-DURCHGANG
//
//  🔴 Der Anlass (27.08.2026): die Modifikator-Belohnung des Glucksrads wurde
//  seit ihrem Bau ERZEUGT und von niemandem verrechnet. Wer „+50 % fuer zwei
//  Spieltage" zog, bekam nichts -- kein Fehler, keine Meldung.
//
//  ⚠️ `npm run tot` konnte das nicht sehen: es war kein EXPORT, sondern ein
//  FELD in einem Rueckgabeobjekt. Die Funktion wird ueberall aufgerufen, also
//  ist sie quicklebendig -- dass einer ihrer vier Toepfe leer ausgeht, sieht
//  man von aussen nicht.
//
//  Dieser Test haelt zwei Dinge fest, und das zweite ist das wichtigere:
//  1. Es gibt keinen ungelesenen Topf.
//  2. Der Durchgang PRUEFT ueberhaupt noch etwas. Eine Messung, die auf 0
//     Faelle zusammenschrumpft, meldet auf ewig „alles gut" -- genau die
//     Sorte gruener Haken, die schlimmer ist als gar keiner.
// ============================================================

const lauf = () => execFileSync(process.execPath, [VITE_NODE, "scripts/toepfe-durchgang.mjs"], {
  encoding: "utf8", timeout: 120000,
});

describe("Topf-Durchgang", () => {
  const ausgabe = lauf();

  it("meldet keinen ungelesenen Topf", () => {
    expect(ausgabe, ausgabe).toContain("✅ Jeder Rückgabe-Topf wird außerhalb seiner Datei gelesen.");
  });

  it("🔴 prueft ueberhaupt noch etwas -- die Zahl darf nur STEIGEN", () => {
    const treffer = /(\d+) Töpfe geprüft/.exec(ausgabe);
    expect(treffer, ausgabe).toBeTruthy();
    // Stand 27.08.2026: 12. Wer hier eine kleinere Zahl sieht, hat entweder
    // ein Faecher-Objekt entfernt (dann diese Zahl mitsenken UND dazuschreiben,
    // welches) oder die Erkennung kaputtgemacht.
    expect(Number(treffer[1])).toBeGreaterThanOrEqual(12);
  });

  it("jeder geduldete Topf traegt eine Begruendung", () => {
    // ⛔ „steht halt so da" ist genau die Begruendung, mit der der
    // Rad-Modifikator zwei Wochen lang niemandem auffiel.
    const geduldet = /(\d+) begründet geduldet/.exec(ausgabe);
    expect(geduldet, ausgabe).toBeTruthy();
    expect(Number(geduldet[1])).toBeLessThanOrEqual(3);
  });
});
