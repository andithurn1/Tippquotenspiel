import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createMockStore } from "@/lib/store.mock";

// ============================================================
//  MOCK ↔ SUPABASE: haben beide Stores dieselben Methoden?
//
//  🔴 Der Anlass, und er ist strukturell, nicht hypothetisch: ALLE Tests
//  dieses Projekts laufen gegen den MOCK. `store.supabase.js` hat keinen
//  einzigen — er lässt sich ohne echte Datenbank nicht sinnvoll ausführen.
//  Die beiden werden also VON HAND synchron gehalten, und niemand merkt es,
//  wenn eine Methode nur im Mock landet: Tests grün, Build grün, und live
//  fliegt ein `store.xyz is not a function` in einem Screen.
//
//  ⚠️ Dieser Test ersetzt keinen Integrationstest gegen die echte DB — er
//  prüft die OBERFLÄCHE, nicht das Verhalten. Das ist trotzdem der Fund, der
//  am teuersten wäre: eine fehlende Methode fällt erst dem ersten echten
//  Mitspieler auf, und der Testbetrieb der Hinrunde ist genau dafür da.
//
//  Gelesen wird der QUELLTEXT von `store.supabase.js`, nicht das Objekt:
//  `createSupabaseStore()` wirft ohne Env-Variablen.
// ============================================================

// Absichtlich nur im Mock — mit Grund, sonst hat der Test keinen Wert.
const NUR_MOCK = {
  seedTip:
    "Legt einen Tipp ohne Anpfiff-Prüfung an. Testwerkzeug: die Wertung "
    + "braucht Tipps aus der Vergangenheit, `saveTip` verweigert die zu Recht. "
    + "In der DB wäre das eine Hintertür an der Policy vorbei.",
  seedSeasonTip:
    "Dito für Saison-Wetten — dieselbe Begründung, dasselbe Risiko.",
};

const quelltext = readFileSync("src/lib/store.supabase.js", "utf8");
// Methoden des zurückgegebenen Objektliterals: „  name(" bzw. „  async name(".
const supabaseMethoden = new Set(
  [...quelltext.matchAll(/^\s{2,4}(?:async\s+)?([a-zA-Z_$][\w$]*)\s*\(/gm)].map((m) => m[1]),
);
const mockMethoden = Object.entries(createMockStore())
  .filter(([, v]) => typeof v === "function")
  .map(([k]) => k);

describe("Store-Parität Mock ↔ Supabase", () => {
  it("jede Mock-Methode gibt es auch im Supabase-Store — oder sie steht in NUR_MOCK", () => {
    const fehlen = mockMethoden.filter((k) => !supabaseMethoden.has(k) && !NUR_MOCK[k]);
    expect(fehlen, `Nur im Mock, ohne Begründung: ${fehlen.join(", ")}`).toEqual([]);
  });

  it("NUR_MOCK führt nichts auf, das es im Supabase-Store längst gibt", () => {
    // Sonst verrottet die Ausnahmeliste und deckt echte Lücken zu.
    const ueberholt = Object.keys(NUR_MOCK).filter((k) => supabaseMethoden.has(k));
    expect(ueberholt, `Ausnahme überflüssig: ${ueberholt.join(", ")}`).toEqual([]);
  });

  it("NUR_MOCK führt nichts auf, das der Mock gar nicht mehr hat", () => {
    const verwaist = Object.keys(NUR_MOCK).filter((k) => !mockMethoden.includes(k));
    expect(verwaist, `Ausnahme zeigt ins Leere: ${verwaist.join(", ")}`).toEqual([]);
  });

  it("jede Ausnahme trägt einen Begründungssatz", () => {
    for (const [k, grund] of Object.entries(NUR_MOCK)) {
      expect(typeof grund, k).toBe("string");
      expect(grund.length, k).toBeGreaterThan(40);
    }
  });

  // Grobe Plausibilität: findet der Quelltext-Scan überhaupt etwas?
  it("der Quelltext-Scan liest den Supabase-Store wirklich aus", () => {
    expect(supabaseMethoden.size).toBeGreaterThan(30);
    for (const pflicht of ["saveTip", "getLeaderboard", "createRound", "joinRound"]) {
      expect(supabaseMethoden, pflicht).toContain(pflicht);
    }
  });
});
