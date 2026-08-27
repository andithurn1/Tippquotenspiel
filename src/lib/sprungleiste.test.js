import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// ============================================================
//  DIE SPRUNGLEISTE ZEIGT AUF ÜBERSCHRIFTEN, DIE ES GIBT
//
//  🔴 Andi, 27.08.2026: „muss eben die admin spielerstellungsseite auch so
//  strukturiert sein mit den Unterpunkten dass es einen nicht erschlaegt und
//  man nicht alle durchscrollen muss."
//
//  ⚠️ Der Fehler, der hier lauert, ist leise: jemand fuegt einen Abschnitt ein
//  oder benennt ihn um, und die Leiste zeigt auf eine Id, die es nicht mehr
//  gibt. Der Klick tut dann NICHTS -- kein Fehler, keine Meldung, nur ein
//  Knopf, der sich tot anfuehlt. Genau die Sorte, die man wochenlang nicht
//  bemerkt, weil niemand alle vierzehn durchklickt.
//
//  Geprueft wird deshalb der Quelltext -- dieselbe Bauart wie
//  `rueckmeldungUhr.test.js` und `storeParitaet.test.js`.
// ============================================================

const quelle = readFileSync("src/components/Spielerstellung.jsx", "utf8");

const ausLeiste = () => [...quelle.matchAll(/\{ id: "(abs-[a-z]+)", kurz: "([^"]+)", titel: "([^"]+)" \}/g)]
  .map((m) => ({ id: m[1], kurz: m[2], titel: m[3] }));
const ausUeberschriften = () => [...quelle.matchAll(/<SectionTitle id="(abs-[a-z]+)">/g)].map((m) => m[1]);

describe("Sprungleiste", () => {
  it("es gibt sie ueberhaupt -- sonst prueft dieser Test nichts", () => {
    expect(ausLeiste().length).toBeGreaterThan(8);
    expect(quelle).toContain("<Sprungleiste");
  });

  it("jeder Eintrag zeigt auf eine Ueberschrift, die es gibt", () => {
    const ueber = new Set(ausUeberschriften());
    const tot = ausLeiste().filter((a) => !ueber.has(a.id));
    expect(
      tot.map((a) => a.id),
      "Diese Chips zeigen auf eine Ueberschrift, die es nicht (mehr) gibt. Der "
      + "Klick tut dann nichts, ohne dass irgendwo ein Fehler auftaucht:\\n"
      + tot.map((a) => `${a.id} (${a.kurz})`).join("\\n")
    ).toEqual([]);
  });

  it("und jede Ueberschrift mit Id steht auch in der Leiste", () => {
    // Die Gegenrichtung: ein Abschnitt mit Sprungpunkt, den niemand anspringen
    // kann, ist ein halb gebauter Weg.
    const inLeiste = new Set(ausLeiste().map((a) => a.id));
    expect(ausUeberschriften().filter((id) => !inLeiste.has(id))).toEqual([]);
  });

  it("die Ids sind eindeutig", () => {
    const ids = ausLeiste().map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("jeder Chip traegt ein kurzes Wort UND den vollen Titel", () => {
    for (const a of ausLeiste()) {
      expect(a.kurz.length, a.id).toBeGreaterThan(2);
      // ⚠️ Chip-Wort kurz genug fuer eine Leiste auf 375 px. „Die vier
      // wichtigsten Fragen" passt dort nicht -- deshalb gibt es `kurz`.
      expect(a.kurz.length, `${a.id}: „${a.kurz}" ist zu lang fuer die Leiste`).toBeLessThan(16);
      expect(a.titel.length, a.id).toBeGreaterThan(4);
    }
  });

  it("die Ueberschriften halten Abstand zur klebenden Kopfzeile", () => {
    // Ohne `scrollMarginTop` schoebe sich die Kopfzeile ueber genau die Zeile,
    // zu der man gerade gesprungen ist.
    const ab = quelle.indexOf("function SectionTitle");
    expect(quelle.slice(ab, ab + 700)).toContain("scrollMarginTop");
  });
});
