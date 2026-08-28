import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";

// ============================================================
//  ZWEI GEGENWARTEN IN EINER ANTWORT
//
//  🔴 Der Fund vom 29.08.2026, und das Bemerkenswerte daran ist, WANN er
//  auffiel. `saisonLage(matches, jetzt)` gab zwei Werte zurück:
//
//      gestartet: … <= jetzt                    ← der übergebene Zeitpunkt
//      stand:     aktuellerSpieltag(matches)    ← ohne `jetzt`, also Date.now()
//
//  `aktuellerSpieltag` hat einen eigenen Vorgabewert. Wer also ausdrücklich
//  einen Zeitpunkt angab — eine Vorschau, ein Was-wäre-wenn, ein Test —, bekam
//  eine Antwort aus zwei verschiedenen Gegenwarten.
//
//  ⚠️ **Und es KONNTE nicht auffallen.** Solange die echte Uhr vor dem ersten
//  Anpfiff des Katalogs stand, kamen beide Wege zufällig aufs selbe Ergebnis.
//  Am 28.08.2026 lief der erste Bundesliga-Spieltag wirklich — und am Tag
//  darauf standen acht Tests rot, ohne dass jemand etwas geändert hatte. Ein
//  grüner Test hatte hier nie bewiesen, dass die Rechnung stimmt, sondern nur,
//  dass der Kalender mitspielte.
//
//  ── Was dieser Test prüft ──
//  Zwei Regeln, beide nur für Funktionen, die einen `jetzt`-Parameter HABEN:
//   1. Ruft sie eine andere Funktion mit `jetzt`-Parameter, reicht sie ihn weiter.
//   2. Sie greift im Rumpf nicht selbst zu `Date.now()`.
//
//  Wer keinen `jetzt`-Parameter hat, darf die Uhr fragen — das ist der normale
//  Fall und wird hier nicht angefasst.
//
//  ⚠️ Textprüfung, keine Ausführung — dieselbe Bauart wie `ladezustand.test.js`
//  und `rund.test.js`: geprüft wird die STELLE, an der der Fehler entsteht.
// ============================================================

// Begründete Ausnahmen. Schlüssel: `datei.js|funktion`.
// ⚠️ Jede Zeile braucht einen SATZ, warum die zweite Gegenwart hier richtig ist.
const GEDULDET = {};

const ohneKommentare = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

// ⚠️ Pfade mit Vorwärts-Slash, auch unter Windows — `join` liefert dort
// Backslashes, und ein Schlüssel wie `datei.js|funktion` fände seine eigene
// Ausnahme sonst nie. Genau dieser Fehler steckte am 28.08.2026 in drei
// Wächtern gleichzeitig und meldete dreimal einen Fund, den es nicht gab.
const dateien = [];
const lauf = (dir) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n).replace(/\\/g, "/");
    if (statSync(p).isDirectory()) lauf(p);
    else if (/\.jsx?$/.test(p) && !/\.test\./.test(p)) dateien.push(p);
  }
};
lauf("src");

// Klassische Funktionen UND Pfeilfunktionen an einer Konstante.
const DEKL = /(?:export\s+)?(?:function\s+([A-Za-z0-9_]+)\s*\(([\s\S]*?)\)\s*\{|const\s+([A-Za-z0-9_]+)\s*=\s*\(([\s\S]*?)\)\s*=>)/g;

function koerperVon(text, ab) {
  const auf = text.indexOf("{", ab);
  if (auf < 0) return "";
  let tiefe = 0;
  for (let i = auf; i < text.length; i++) {
    if (text[i] === "{") tiefe++;
    else if (text[i] === "}" && --tiefe === 0) return text.slice(auf, i + 1);
  }
  return text.slice(auf);
}

function argumenteVon(text, ab) {
  const auf = text.indexOf("(", ab);
  if (auf < 0) return "";
  let tiefe = 0;
  for (let i = auf; i < text.length; i++) {
    if (text[i] === "(") tiefe++;
    else if (text[i] === ")" && --tiefe === 0) return text.slice(auf + 1, i);
  }
  return "";
}

const inhalt = new Map(dateien.map((f) => [f, ohneKommentare(readFileSync(f, "utf8"))]));

// Alle Funktionen, die einen Zeitpunkt entgegennehmen.
const mitZeit = [];
for (const [f, t] of inhalt) {
  for (const m of t.matchAll(DEKL)) {
    const name = m[1] ?? m[3];
    const params = m[2] ?? m[4] ?? "";
    if (!name || !/\bjetzt\b/.test(params)) continue;
    mitZeit.push({ datei: f, name, koerper: koerperVon(t, m.index + m[0].length - 1) });
  }
}
const namenMitZeit = new Set(mitZeit.map((x) => x.name));
const schluessel = (x) => `${basename(x.datei)}|${x.name}`;

describe("Eine Antwort, EINE Gegenwart", () => {
  it("es gibt überhaupt Funktionen mit Zeitpunkt — sonst prüft dieser Test nichts", () => {
    expect(mitZeit.length).toBeGreaterThan(10);
    // Die Fundstelle selbst muss dabei sein, sonst greift das Muster daneben.
    expect(mitZeit.some((x) => x.name === "saisonLage")).toBe(true);
  });

  it("wer `jetzt` bekommt, reicht es auch weiter", () => {
    const funde = [];
    for (const fn of mitZeit) {
      if (GEDULDET[schluessel(fn)]) continue;
      for (const ziel of namenMitZeit) {
        if (ziel === fn.name) continue;
        for (const c of fn.koerper.matchAll(new RegExp(`\\b${ziel}\\s*\\(`, "g"))) {
          const args = argumenteVon(fn.koerper, c.index + ziel.length);
          if (!/\bjetzt\b/.test(args)) funde.push(`${schluessel(fn)} → ${ziel}(…)`);
        }
      }
    }
    expect(
      funde,
      "Diese Funktionen nehmen einen Zeitpunkt entgegen und rufen damit eine "
      + "andere zeitabhängige Funktion OHNE ihn — die rechnet dann gegen die "
      + "echte Uhr. Ergebnis: eine Antwort aus zwei Gegenwarten.\n"
      + "Entweder `jetzt` durchreichen — oder in `GEDULDET` begründen.\n"
      + funde.join("\n"),
    ).toEqual([]);
  });

  it("wer `jetzt` bekommt, fragt nicht daneben die Uhr", () => {
    const funde = mitZeit
      .filter((fn) => !GEDULDET[schluessel(fn)] && /Date\.now\(\)/.test(fn.koerper))
      .map(schluessel);
    expect(
      funde,
      "Diese Funktionen haben einen Zeitpunkt-Parameter UND greifen im Rumpf "
      + "selbst zu `Date.now()`. Der Aufrufer kann die Zeit dann nur zur Hälfte "
      + "bestimmen.\n" + funde.join("\n"),
    ).toEqual([]);
  });

  it("jede Ausnahme trägt einen Begründungssatz", () => {
    for (const [k, grund] of Object.entries(GEDULDET)) {
      expect(typeof grund, k).toBe("string");
      expect(grund.length, k).toBeGreaterThan(60);
    }
  });

  it("keine Ausnahme ist überholt", () => {
    const bekannt = new Set(mitZeit.map(schluessel));
    const ueberholt = Object.keys(GEDULDET).filter((k) => !bekannt.has(k));
    expect(ueberholt, `Ausnahme zeigt ins Leere: ${ueberholt.join(", ")}`).toEqual([]);
  });
});
