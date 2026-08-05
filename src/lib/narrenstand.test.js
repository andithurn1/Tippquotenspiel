import { describe, it, expect } from "vitest";
import { narrenStand } from "@/lib/narrenstand";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";
import { zeitachse, rundenSpieltagVon } from "@/lib/zeitachse";
import { alleMatches } from "@/lib/ligen";

// Ein Regelwerk, in dem Narren überhaupt entstehen: Joker an, Budget an,
// `verfall: "nie"` damit der Stand über die Saison WÄCHST — nur dann macht es
// einen sichtbaren Unterschied, an welchem Spieltag man nachschaut.
const RULES = sanitizeRules({
  ...DEFAULT_RULES,
  joker: { enabled: true, modus: "einzel", faktor: 1.5 },
  budget: { enabled: true, quellen: [{ typ: "gleich", betrag: 10 }], takt: "spieltag", verfall: "nie" },
});

const MATCHES = alleMatches().map((m) => ({
  id: m.matchId, home: m.home, away: m.away, kickoff: m.kickoff,
  matchday: m.matchday, snapshot: m.snapshot, result: m.result,
  wettbewerb: m.wettbewerb, phase: m.phase,
}));
const ACHSE = zeitachse(MATCHES, RULES.zeitachse);

// Kurz vor dem letzten Bundesliga-Spieltag: dort liegen Liga- und
// Runden-Spieltag am weitesten auseinander (34 gegen 42).
const LETZTES_BL = MATCHES.filter((m) => m.wettbewerb === "bl")
  .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).at(-3);
const SPAET = new Date(new Date(LETZTES_BL.kickoff).getTime() - 36e5);

const tippsBis = (n) => MATCHES
  .filter((m) => m.wettbewerb === "bl").slice(0, n)
  .map((m) => ({ match_id: m.id, user_id: "u1", tip: { home: 1, away: 1 } }));

describe("Narrenstand rechnet in RUNDEN-Spieltagen", () => {
  // 🔴 Der Befund vom 05.08.2026: der Runden-Hub las den Kontostand am
  // LIGA-Spieltag aus einem Verlauf, der über Runden-Spieltage läuft, und
  // rief `kontoVerlauf` ohne `spieltage` auf, also über die feste 34.
  // Gemessen am Saisonende: 340 Narren im Hub gegen 420 in der Tippabgabe.
  it("liest den Stand am Runden-Spieltag, nicht am Liga-Spieltag", () => {
    const stand = narrenStand({
      rules: RULES, matches: MATCHES, tips: tippsBis(40), userId: "u1", jetzt: SPAET,
    });
    expect(stand).not.toBeNull();

    const ligaTag = LETZTES_BL.matchday;
    const rundenTag = rundenSpieltagVon(ACHSE, LETZTES_BL);
    // Die beiden Skalen müssen auseinanderliegen, sonst bewiese der Test nichts.
    expect(rundenTag).toBeGreaterThan(ligaTag);

    // 10 Narren je Runden-Spieltag, ohne Verfall → der Stand ist die Zahl der
    // RUNDEN-Spieltage mal zehn, nicht die der Liga-Spieltage.
    expect(stand.kontostand).toBe(rundenTag * 10);
    expect(stand.kontostand).not.toBe(ligaTag * 10);
  });

  it("der Verlauf reicht über die ganze Runde, nicht nur 34 Spieltage", () => {
    // Mit der festen 34 gäbe es am Runden-Spieltag 42 gar keinen Eintrag —
    // die Anzeige wäre dann still verschwunden oder hätte den Stand von
    // Spieltag 34 gezeigt.
    expect(ACHSE.length).toBeGreaterThan(34);
    const stand = narrenStand({
      rules: RULES, matches: MATCHES, tips: tippsBis(40), userId: "u1", jetzt: SPAET,
    });
    expect(stand.kontostand).toBeGreaterThan(34 * 10);
  });

  it("Narren vom Glücksrad zählen mit", () => {
    const ohne = narrenStand({
      rules: RULES, matches: MATCHES, tips: tippsBis(40), userId: "u1", jetzt: SPAET,
    });
    const mit = narrenStand({
      rules: RULES, matches: MATCHES, tips: tippsBis(40), userId: "u1", jetzt: SPAET,
      // Form wie `drehradBelohnungen().narren` — ein fester Betrag an einem
      // Runden-Spieltag, keine Quelle mit Takt und Verfall.
      zusatz: [{ userId: "u1", spieltag: 3, betrag: 30 }],
    });
    expect(mit.kontostand).toBe(ohne.kontostand + 30);
  });

  it("ohne Budget gibt es nichts anzuzeigen", () => {
    const aus = sanitizeRules({ ...RULES, budget: { enabled: false } });
    expect(narrenStand({ rules: aus, matches: MATCHES, tips: [], userId: "u1", jetzt: SPAET })).toBeNull();
  });
});
