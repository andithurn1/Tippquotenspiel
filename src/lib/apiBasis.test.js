import { describe, it, expect } from "vitest";
import { apiPfad, API_BASIS } from "@/lib/apiBasis";

// 🔴 Der Anlass: in einem Capacitor-Container ist der Ursprung
// `capacitor://localhost` — `fetch("/api/…")` zeigt dann ins Nichts, und zwar
// ohne Fehlermeldung, die darauf hinweist.
describe("API-Basis", () => {
  it("im Web bleibt der Pfad unverändert", () => {
    // Ohne gesetzte Variable ist die Basis leer — die Vorgabe für den Browser.
    expect(API_BASIS).toBe("");
    expect(apiPfad("/api/odds")).toBe("/api/odds");
  });

  // ⚠️ Eine vollständige Adresse darf kein Präfix bekommen, sonst entsteht
  // beim Durchreichen einer fremden URL ein Doppel-Präfix.
  it("lässt vollständige Adressen in Ruhe", () => {
    for (const url of ["https://x.de/api/y", "http://localhost:3000/api/y", "HTTPS://X.DE/a"]) {
      expect(apiPfad(url), url).toBe(url);
    }
  });

  it("kommt mit Unsinn klar, statt undefined in die Adresse zu schreiben", () => {
    expect(apiPfad(null)).toBe("");
    expect(apiPfad(undefined)).toBe("");
  });
});
