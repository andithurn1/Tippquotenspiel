import { describe, it, expect, beforeEach, vi } from "vitest";
import { schonDagewesen, merkeBesuch, vergissBesuch, ERSTKONTAKT_WEGE } from "@/lib/erstkontakt";

// Ein Speicher, den wir kontrollieren — sonst hängt der Test am Browser.
function speicher(inhalt = {}) {
  const daten = { ...inhalt };
  return {
    getItem: (k) => (k in daten ? daten[k] : null),
    setItem: (k, v) => { daten[k] = String(v); },
    removeItem: (k) => { delete daten[k]; },
    _daten: daten,
  };
}

describe("Erstkontakt — erster Start vs. Wiederkehrer", () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it("ein frischer Browser gilt als NEU", () => {
    vi.stubGlobal("localStorage", speicher());
    expect(schonDagewesen()).toBe(false);
  });

  it("nach dem Merken gilt er als Wiederkehrer", () => {
    const s = speicher();
    vi.stubGlobal("localStorage", s);
    merkeBesuch();
    expect(schonDagewesen()).toBe(true);
  });

  // ⚠️ Idempotent: ein zweiter Aufruf darf den ERSTEN Zeitpunkt nicht
  // überschreiben — sonst wäre „seit wann dabei" später nicht mehr zu haben.
  it("merkt nur den ERSTEN Besuch", () => {
    const s = speicher();
    vi.stubGlobal("localStorage", s);
    merkeBesuch();
    const erst = s._daten["tqs.erstkontakt.v1"];
    merkeBesuch();
    expect(s._daten["tqs.erstkontakt.v1"]).toBe(erst);
  });

  it("vergissBesuch stellt wieder auf neu", () => {
    vi.stubGlobal("localStorage", speicher());
    merkeBesuch();
    vergissBesuch();
    expect(schonDagewesen()).toBe(false);
  });

  // 🔴 Der Fall, der sonst niemandem auffällt: privates Fenster, gesperrte
  // Seitendaten — dort WIRFT der Zugriff. Im Zweifel gilt „schon da gewesen",
  // sonst bekäme dieser Nutzer die Begrüßung bei JEDEM Start.
  it("ohne Speicher gilt „schon da gewesen“ — nicht „neu“", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("gesperrt"); },
      setItem: () => { throw new Error("gesperrt"); },
      removeItem: () => { throw new Error("gesperrt"); },
    });
    expect(schonDagewesen()).toBe(true);
    expect(() => merkeBesuch()).not.toThrow();
    expect(() => vergissBesuch()).not.toThrow();
  });

  it("bietet genau drei Wege, jeder mit Ziel und Text", () => {
    expect(ERSTKONTAKT_WEGE).toHaveLength(3);
    for (const w of ERSTKONTAKT_WEGE) {
      expect(w.ziel.startsWith("/")).toBe(true);
      expect(w.titel.length).toBeGreaterThan(3);
      expect(w.text.length).toBeGreaterThan(10);
    }
  });
});
