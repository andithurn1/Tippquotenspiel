import { describe, it, expect } from "vitest";
import {
  START_JAHR, JAHR_GRENZEN, bildeDatum, tageImMonat, sanitizeGeburtsdatum,
  jahrVon, alterAm, jahresListeSortiert, beschreibeGeburtsdatum,
} from "@/lib/geburtsdatum";

describe("Datum bilden und säubern", () => {
  it("baut ein ISO-Datum", () => {
    expect(bildeDatum(1995, 8, 27)).toBe("1995-08-27");
    expect(bildeDatum(2003, 1, 5)).toBe("2003-01-05");
  });

  // ⚠️ Die Stelle, an der Datumsfelder reihenweise falsch sind.
  it("kennt Schaltjahre", () => {
    expect(tageImMonat(2024, 2)).toBe(29);
    expect(tageImMonat(2023, 2)).toBe(28);
    expect(tageImMonat(2000, 2)).toBe(29);   // durch 400 teilbar
    expect(tageImMonat(1900, 2)).toBe(28);   // durch 100, nicht durch 400
    expect(bildeDatum(2024, 2, 29)).toBe("2024-02-29");
    expect(bildeDatum(2023, 2, 29)).toBeNull();
  });

  it("biegt kein unmögliches Datum zurecht, sondern verwirft es", () => {
    expect(bildeDatum(1995, 2, 31)).toBeNull();
    expect(bildeDatum(1995, 13, 1)).toBeNull();
    expect(bildeDatum(1995, 4, 31)).toBeNull();
  });

  it("hält sich an die Jahresgrenzen", () => {
    expect(bildeDatum(JAHR_GRENZEN.min - 1, 6, 1)).toBeNull();
    expect(bildeDatum(JAHR_GRENZEN.max + 1, 6, 1)).toBeNull();
  });

  it("säubert Eingaben und lehnt Unsinn ab", () => {
    expect(sanitizeGeburtsdatum(" 1995-08-27 ")).toBe("1995-08-27");
    for (const x of [null, undefined, 42, "27.08.1995", "1995-8-27", "abc", "2023-02-29"]) {
      expect(sanitizeGeburtsdatum(x), String(x)).toBeNull();
    }
  });

  it("liest das Jahr heraus — das ist die Brücke zu KT10", () => {
    expect(jahrVon("1995-08-27")).toBe(1995);
    expect(jahrVon("quatsch")).toBeNull();
  });
});

describe("Alter", () => {
  it("zählt den Geburtstag mit", () => {
    expect(alterAm("1995-08-27", new Date("2026-08-27T12:00:00Z"))).toBe(31);
  });

  it("einen Tag vorher ist man noch ein Jahr jünger", () => {
    expect(alterAm("1995-08-27", new Date("2026-08-26T12:00:00Z"))).toBe(30);
  });

  it("rechnet über den Jahreswechsel richtig", () => {
    expect(alterAm("1995-12-31", new Date("2026-01-01T00:00:00Z"))).toBe(30);
    expect(alterAm("1995-01-01", new Date("2026-01-01T00:00:00Z"))).toBe(31);
  });

  it("ohne Stichtag oder ohne Datum: null statt einer Zahl", () => {
    expect(alterAm("1995-08-27", null)).toBeNull();
    expect(alterAm(null, new Date())).toBeNull();
    expect(alterAm("1995-08-27", "gibts nicht")).toBeNull();
  });
});

// 🔴 Andis eigentliche Anforderung: „sodass man nich von heutigem datum
// runterscrollen muss". Sie hängt an EINER Zahl — wo die Liste aufschlägt.
//
// ⛔ Eine Zickzack-Liste (1995, 1994, 1996 …) stand hier kurz daneben und ist
// gelöscht: in einem Auswahlfeld sucht niemand 2003 zwischen 1993 und 1997.
describe("Die Jahresliste", () => {
  const { jahre, startIndex } = jahresListeSortiert();

  it("schlägt bei 1995 auf, nicht bei heute", () => {
    expect(jahre[startIndex]).toBe(START_JAHR);
  });

  it("läuft der Reihe nach — neueste oben", () => {
    expect(jahre[0]).toBe(JAHR_GRENZEN.max);
    expect(jahre.at(-1)).toBe(JAHR_GRENZEN.min);
    for (let i = 1; i < jahre.length; i++) expect(jahre[i]).toBe(jahre[i - 1] - 1);
  });

  it("enthält jeden Jahrgang genau einmal", () => {
    const erwartet = JAHR_GRENZEN.max - JAHR_GRENZEN.min + 1;
    expect(jahre.length).toBe(erwartet);
    expect(new Set(jahre).size).toBe(erwartet);
  });

  // 🔴 Von den Tests gefunden: die erste Fassung hatte die Obergrenze auf
  // 2020. Das heißt, ab 2038 kann sich kein 17-Jähriger mehr eintragen — und
  // der Fehler sähe aus wie ein kaputtes Datumsfeld, nicht wie eine
  // abgelaufene Konstante.
  it("die Obergrenze verrottet nicht sofort", () => {
    expect(JAHR_GRENZEN.max).toBeGreaterThanOrEqual(2030);
    expect(bildeDatum(2026, 6, 1)).toBe("2026-06-01");
  });

  it("jüngere Jahrgänge sind erreichbar, nicht abgeschnitten", () => {
    expect(jahre).toContain(2003);
    expect(jahre).toContain(2010);
  });
});

describe("Ein Satz für die Oberfläche", () => {
  it("nennt Datum und Alter", () => {
    expect(beschreibeGeburtsdatum("1995-08-27", new Date("2026-08-27T00:00:00Z")))
      .toBe("27. August 1995 · 31 Jahre");
  });

  it("ohne Stichtag nur das Datum", () => {
    expect(beschreibeGeburtsdatum("1995-08-27")).toBe("27. August 1995");
  });

  // ⛔ Kein Pflichtfeld — „nicht angegeben" ist ein gültiger Zustand.
  it("ohne Angabe sagt es das, statt zu raten", () => {
    expect(beschreibeGeburtsdatum(null)).toBe("Nicht angegeben");
    expect(beschreibeGeburtsdatum("quatsch")).toBe("Nicht angegeben");
  });
});
