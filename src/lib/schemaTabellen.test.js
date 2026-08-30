import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

// 🔴 Am 30.08.2026 schlug dieser Test EINMAL im Gesamtlauf an und war
// allein wieder grün. Ursache: `lauf("src")` und `readFileSync(
// "supabase/schema.sql")` sind RELATIV — sie hängen am Arbeits-
// verzeichnis, und das ist in einem Testlauf mit mehreren Arbeitern nichts,
// worauf man sich verlassen sollte.
//
// ⚠️ Ein Wächter, der zufällig anschlägt, wird beim dritten Mal ignoriert —
// und dann meldet er den echten Fund an niemanden mehr. Deshalb hängen die
// Pfade jetzt an der LAGE DIESER DATEI und nicht am Aufrufort.
const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
import { join, dirname } from "node:path";

// ============================================================
//  FRAGT DER CODE EINE TABELLE AB, DIE ES IM SCHEMA NICHT GIBT?
//
//  🔴 Der Anlass ist derselbe wie bei `storeParitaet.test.js`, nur eine Ebene
//  tiefer: kein Test dieses Projekts läuft gegen die echte Datenbank. Ein
//  `.from("profil_privat")` — ein Buchstabe daneben — ist im Mock unsichtbar,
//  im Build unsichtbar, im Lint unsichtbar. Live liefert PostgREST dann
//  `PGRST205 · Could not find the table`, und zwar erst dem ersten Menschen,
//  der den Screen öffnet.
//
//  ⚠️ Die Gegenrichtung ist genauso ein Fund und deshalb mit geprüft: eine
//  Tabelle im Schema, die niemand abfragt, ist entweder tote Struktur oder
//  ein vergessener Anschluss. Am 06.08.2026 waren sechs Mechaniken fertig
//  gebaut und wurden von niemandem aufgerufen — dasselbe Muster.
//
//  ⚠️ Was dieser Test NICHT kann: Spalten, Typen, Policies. Er prüft nur, ob
//  die Tabelle überhaupt angelegt wird. Für den Rest gibt es `npm run bereit`,
//  das gegen die echte Datenbank fragt.
// ============================================================

// Tabellen, die absichtlich nur auf einer Seite stehen — mit Grund.
// ⚠️ Keine Ausnahmeliste zum Vollmachen: wer hier einträgt statt anzuschließen,
// muss den Satz vertreten können.
const NUR_SCHEMA = {};

const quellDateien = [];
const lauf = (dir) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) lauf(p);
    else if ((n.endsWith(".js") || n.endsWith(".jsx")) && !n.endsWith(".test.js")) quellDateien.push(p);
  }
};
lauf(join(WURZEL, "src"));

// `.from("…")` ist der einzige Weg, über den dieses Projekt eine Tabelle
// anspricht — der Supabase-Client kennt keinen zweiten.
function tabellenImCode() {
  const treffer = new Map();               // Tabelle → Dateien
  for (const p of quellDateien) {
    const text = readFileSync(p, "utf8");
    for (const m of text.matchAll(/\.from\("([a-z_]+)"\)/g)) {
      if (!treffer.has(m[1])) treffer.set(m[1], []);
      if (!treffer.get(m[1]).includes(p)) treffer.get(m[1]).push(p);
    }
  }
  return treffer;
}

function tabellenImSchema() {
  const sql = readFileSync(join(WURZEL, "supabase", "schema.sql"), "utf8");
  return new Set(
    [...sql.matchAll(/create table if not exists public\.([a-z_]+)/g)].map((m) => m[1])
  );
}

describe("Schema ↔ Code", () => {
  it("der Scan findet überhaupt etwas — sonst prüft dieser Test nichts", () => {
    // 🔴 Ohne diese Zeile wäre ein kaputtes Muster ein GRÜNER Test: zwei leere
    // Mengen sind immer deckungsgleich. Genau so hat sich der Bewegungs-
    // Wächter am 25.08.2026 blind gestellt.
    expect(quellDateien.length).toBeGreaterThan(50);
    expect(tabellenImCode().size).toBeGreaterThan(8);
    expect(tabellenImSchema().size).toBeGreaterThan(8);
  });

  it("jede abgefragte Tabelle wird im Schema auch angelegt", () => {
    const schema = tabellenImSchema();
    const fehlend = [];
    for (const [tabelle, dateien] of tabellenImCode()) {
      if (!schema.has(tabelle)) fehlend.push(`${tabelle}  ←  ${dateien.join(", ")}`);
    }
    expect(
      fehlend,
      "Diese Tabellen fragt der Code ab, `supabase/schema.sql` legt sie aber "
      + "nicht an. Live gibt es dafür `PGRST205 · Could not find the table`:\n"
      + fehlend.join("\n")
    ).toEqual([]);
  });

  it("jede angelegte Tabelle wird auch abgefragt — oder steht in NUR_SCHEMA", () => {
    const code = new Set(tabellenImCode().keys());
    const ungenutzt = [...tabellenImSchema()]
      .filter((t) => !code.has(t) && !NUR_SCHEMA[t]);
    expect(
      ungenutzt,
      "Diese Tabellen stehen im Schema, aber niemand fragt sie ab — "
      + "entweder toter Ballast oder ein vergessener Anschluss:\n"
      + ungenutzt.join("\n")
    ).toEqual([]);
  });

  it("NUR_SCHEMA führt nichts auf, das inzwischen doch abgefragt wird", () => {
    // Dieselbe Gegenprobe wie `ueberholteBegruendungen()` bei den Stufen: eine
    // Begründung, die einen Zustand beschreibt, den es nicht mehr gibt, wird
    // beim nächsten Durchgang geglaubt.
    const code = new Set(tabellenImCode().keys());
    expect(Object.keys(NUR_SCHEMA).filter((t) => code.has(t))).toEqual([]);
  });

  it("jede Ausnahme trägt einen Begründungssatz", () => {
    for (const [tabelle, grund] of Object.entries(NUR_SCHEMA)) {
      expect(typeof grund, tabelle).toBe("string");
      expect(grund.length, tabelle).toBeGreaterThan(40);
    }
  });
});
