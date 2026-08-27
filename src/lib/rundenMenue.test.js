import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

// ============================================================
//  DAS RUNDEN-MENUE ZEIGT AUF SEITEN, DIE ES GIBT
//
//  🔴 Andi, 27.08.2026: „ich haett jetz eh gedacht dass es bei jeder Tipprunde
//  ein Untermenue gibt" -- und zum Zuschnitt: „solche optionen muessen egtl
//  hinter nem eigenen oeffnenbarem Fenster sein, weil die ganzen
//  Einstellmoeglichkeiten einen sonst komplett erschlagen".
//
//  ⚠️ Zwei leise Fehler lauern hier, und beide fallen im Betrieb monatelang
//  niemandem auf:
//
//  1. Eine Kachel zeigt auf eine Route, die es nicht (mehr) gibt. Der Klick
//     landet auf einer 404, und zwar nur fuer den, dessen Runde diese Ebene
//     ueberhaupt eingeschaltet hat.
//  2. Eine Kachel wandert in eine zugeklappte Gruppe, OHNE `kurz`. Dann steht
//     ueber der Gruppe nicht, was in ihr liegt -- und eine Gruppe, von der man
//     das nicht weiss, klappt niemand auf. Aus dem Aufraeumen ist dann ein
//     Verstecken geworden, und das ist das Gegenteil von dem, was bestellt war.
//
//  Geprueft wird der Quelltext -- dieselbe Bauart wie `sprungleiste.test.js`.
// ============================================================

const quelle = readFileSync("src/components/RundenHub.jsx", "utf8");

// Alle Kacheln mit ihrem Gruppen-Namen, in Reihenfolge der Kataloge.
function katalog(name) {
  const start = quelle.indexOf(`const ${name} = [`);
  if (start === -1) return [];
  const ende = quelle.indexOf("\n];", start);
  const block = quelle.slice(start, ende);
  // ⚠️ `[^}]*` statt `[\s\S]*?`: die Eintraege enthalten keine geschachtelten
  // Klammern, und die faule Variante hoerte am ersten Zeilenumbruch auf --
  // ein zweizeiliger Eintrag fiel dadurch stillschweigend aus der Pruefung.
  return [...block.matchAll(/\{ href: "([^"]+)"[^}]*\}/g)].map((m) => ({
    href: m[1],
    roh: m[0],
    kurz: /kurz: "([^"]+)"/.exec(m[0])?.[1] ?? null,
    wenn: /wenn: (null|"[a-z]+")/.exec(m[0])?.[1] ?? null,
  }));
}

const JETZT = katalog("JETZT");
const MEINS = katalog("MEINS");
const RUNDE = katalog("RUNDE");
const alle = [...JETZT, ...MEINS, ...RUNDE];

// Zusaetzlich die zwei Aufruf-Kacheln, die direkt im JSX stehen (sie haengen an
// einer Bedingung und gehoeren bewusst NICHT in einen Katalog).
const ausJsx = [...quelle.matchAll(/<Kachel href="([^"]+)"/g)].map((m) => m[1]);

describe("Runden-Menue: die Kataloge", () => {
  it("es gibt sie ueberhaupt -- sonst prueft dieser Test nichts", () => {
    expect(JETZT.length).toBeGreaterThan(2);
    expect(MEINS.length).toBeGreaterThan(1);
    expect(RUNDE.length).toBeGreaterThan(2);
  });

  it("jede Kachel zeigt auf eine Route, die es gibt", () => {
    const fehlt = [...alle.map((k) => k.href), ...ausJsx]
      .filter((href) => !existsSync(`src/app${href}/page.js`));
    expect(
      fehlt,
      "Diese Kacheln zeigen auf eine Seite, die es nicht gibt -- der Klick "
      + "landet auf einer 404:\n" + fehlt.join("\n"),
    ).toEqual([]);
  });

  it("keine Route steht doppelt im Menue", () => {
    const hrefs = alle.map((k) => k.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("Runden-Menue: der Zuschnitt", () => {
  it("was zugeklappt liegt, sagt vorher was es ist (`kurz`)", () => {
    // 🔴 Der eigentliche Punkt der ganzen Umstellung. Ohne `kurz` steht ueber
    // der Gruppe nichts, und niemand klappt sie auf.
    const ohne = [...MEINS, ...RUNDE].filter((k) => !k.kurz);
    expect(ohne.map((k) => k.href)).toEqual([]);
  });

  it("was OFFEN steht, braucht kein `kurz` -- und hat auch keins", () => {
    // Umgekehrte Richtung: `kurz` an einer immer sichtbaren Kachel waere ein
    // Feld, das nichts tut, und das naechste Mal kopiert es jemand.
    expect(JETZT.filter((k) => k.kurz)).toEqual([]);
  });

  it("`wenn` nennt nur Ebenen, die der Hub auch abfragt", () => {
    // ⚠️ Ein Tippfehler in `wenn` waere still: `an["jokr"]` ist `undefined`,
    // die Kachel verschwindet einfach -- fuer alle, fuer immer.
    const bekannt = new Set(["joker", "rad", "saison", "freigaben"]);
    const unbekannt = [...MEINS, ...RUNDE]
      .filter((k) => k.wenn && k.wenn !== "null" && !bekannt.has(k.wenn.replaceAll('"', "")));
    expect(unbekannt.map((k) => k.href)).toEqual([]);
    // Und die Gegenprobe: der Hub baut `an` wirklich aus diesen vier.
    expect(quelle).toMatch(/const an = \{ joker, rad, saison, freigaben \}/);
  });

  it("die Gruppen laufen ueber `Feinheiten`, nicht ueber eine eigene Mechanik", () => {
    // 🔴 CLAUDE.md / Feinheiten.jsx: acht Fassungen desselben Aufklappers sind
    // in diesem Projekt schon einmal entstanden, weil jede Stelle fuer sich
    // plausibel war.
    expect(quelle).toContain('import Feinheiten from "@/components/Feinheiten"');
    expect(quelle).toContain('<Feinheiten titel="Deine Sachen"');
    expect(quelle).toContain('<Feinheiten titel="Die Runde"');
  });

  it("eine leere Gruppe wird gar nicht erst gezeigt", () => {
    // Eine aufklappbare Gruppe, hinter der nichts liegt, ist eine Enttaeuschung
    // mit Extra-Klick.
    expect(quelle).toContain("{meins.length > 0 && (");
    expect(quelle).toContain("{runde.length > 0 && (");
  });
});
