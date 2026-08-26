import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// ============================================================
//  DIE UHR DER MELDUNG — läuft sie ab dem SEHEN oder ab dem BESTELLEN?
//
//  🔴 Warum es diesen Test gibt, und er ist eine MESSUNG, keine Meinung.
//  Bis zum 26.08.2026 stand das `setTimeout` in `melde()`, direkt neben dem
//  `setMeldungen` — die naheliegendste Stelle, und die falsche. An einer
//  echten Tippabgabe gemessen (Pixel 5, Entwicklungs-Server):
//
//      5 450 ms   Uhr gestartet (2 200 ms Standzeit)
//      6 758 ms   Streifen erscheint       ← 1 308 ms später
//      7 674 ms   Streifen verschwindet    ← die Uhr war ja schon gelaufen
//
//  Sichtbar: 916 ms statt 2 200. Ein „Tipp gespeichert", das man verpasst,
//  weil man in dem Moment noch auf den Knopf gesehen hat.
//
//  Der Grund ist kein Fehler in React: der Zustand ändert sich sofort,
//  gezeichnet wird erst, wenn der Hauptthread wieder Luft hat — und genau in
//  dem Moment hat er sie nicht, weil derselbe Klick gerade gespeichert hat.
//  Auf einem alten Telefon ist der Abstand größer, nicht kleiner.
//
//  Nach dem Umbau (`useEffect` statt `melde`), dreimal gemessen:
//  Versatz **28 / 36 / 24 ms**, sichtbar **2 185 / 2 190 / 2 203 ms**.
//
//  ⚠️ Ein echter Render-Test bräuchte jsdom und eine Testbibliothek — für
//  eine Regel, die man auch am Quelltext ablesen kann. Dieser Test ist
//  deshalb eine Textprüfung, dieselbe Bauart wie `rund.test.js`: er verbietet
//  nicht das `setTimeout`, sondern die STELLE.
// ============================================================

const quelle = readFileSync("src/components/Rueckmeldung.jsx", "utf8");

// Den Rumpf von `melde` herausschneiden — von der Zeile mit `const melde`
// bis zum abschließenden `}, [`. Grob, aber für diese eine Frage genau genug.
function meldeRumpf() {
  const start = quelle.indexOf("const melde = useCallback(");
  expect(start, "`melde` gibt es nicht mehr — dieser Test ist überholt").toBeGreaterThan(-1);
  const ende = quelle.indexOf("}, [", start);
  expect(ende, "Ende von `melde` nicht gefunden").toBeGreaterThan(start);
  return quelle.slice(start, ende);
}

describe("Die Standzeit misst, wie lange man die Meldung SIEHT", () => {
  it("`melde` startet keine Uhr", () => {
    const rumpf = meldeRumpf();
    expect(
      rumpf.includes("setTimeout"),
      "In `melde()` steht wieder ein `setTimeout`. Die Uhr liefe dann ab dem "
      + "BESTELLEN statt ab dem Zeichnen — gemessen 916 ms statt 2 200 ms "
      + "sichtbar. Die Uhr gehört in den `useEffect` darunter."
    ).toBe(false);
  });

  it("die Uhr hängt an den gerenderten Meldungen", () => {
    // `useEffect` läuft nach dem Zeichnen. Genau das ist der Punkt: die
    // Abhängigkeit MUSS `meldungen` sein, sonst startet die Uhr wieder zu früh.
    expect(quelle).toContain("}, [meldungen, weg]);");
    expect(quelle).toMatch(/offen\.set\(m\.id, setTimeout\(/);
  });

  it("eine verdrängte Meldung lässt keine Uhr zurück", () => {
    // ⚠️ Die Gegenrichtung, die vorher fehlte: eine Meldung kann verschwinden,
    // OHNE dass ihre Uhr abgelaufen ist — verdrängt von einer gleichlautenden
    // oder vom Dreier-Deckel. Deren Timer lief bisher weiter und rief `weg`
    // auf eine Id, die es nicht mehr gibt. Folgenlos, aber es sammelt sich.
    expect(quelle).toMatch(/noch\.has\(id\)/);
  });
});
