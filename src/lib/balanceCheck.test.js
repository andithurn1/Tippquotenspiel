import { describe, it, expect } from "vitest";
import { runBalanceCheck, RULE_VARIANTS } from "./balanceCheck";
import { DEFAULT_RULES } from "./engine";

// Diese Tests prüfen den Balance-Check selbst (Testdatensatz + Mechanik),
// NICHT dass die Saison am Ende zugunsten der Favoriten ausgeht — das tut sie
// aktuell nachweislich nicht (siehe Antwort im Chat). Ob/wie das Regelwerk
// dafür angepasst wird, ist eine Produktentscheidung, kein Bug-Fix.
describe("Balance-Check — Favorit vs. Außenseiter über einen gemischten Datensatz", () => {
  it("Testdatensatz trifft den angefragten Ausreißer-Korridor von 10–15%", () => {
    const { upsetShare } = runBalanceCheck(DEFAULT_RULES);
    expect(upsetShare).toBeGreaterThanOrEqual(0.10);
    expect(upsetShare).toBeLessThanOrEqual(0.15);
  });

  it("im Upset-Bucket dreht sich das Bild: Außenseiter-Tipper verdient dort im Schnitt mehr als der Favorit-Tipper", () => {
    const { byBucket } = runBalanceCheck(DEFAULT_RULES);
    const upset = byBucket.upset;
    expect(upset.dog / upset.n).toBeGreaterThan(upset.fav / upset.n);
  });

  it("ein korrekt getroffener Ausreißer zahlt spürbar mehr als ein gleich exakter Favoriten-Tipp", () => {
    const { avgFavExactChalk, avgDogExactUpset } = runBalanceCheck(DEFAULT_RULES);
    expect(avgDogExactUpset).toBeGreaterThan(avgFavExactChalk);
  });

  it("im chalk-Bucket (klare Favoriten) liegt die Favorit-Strategie klar vorn", () => {
    const { byBucket } = runBalanceCheck(DEFAULT_RULES);
    const chalk = byBucket.chalk;
    expect(chalk.fav / chalk.n).toBeGreaterThan(chalk.dog / chalk.n);
  });

  it.each(Object.keys(RULE_VARIANTS))("Regelwerk-Variante '%s' läuft ohne Fehler über den ganzen Datensatz", (name) => {
    const r = runBalanceCheck(RULE_VARIANTS[name]);
    expect(Number.isFinite(r.totalFav)).toBe(true);
    expect(Number.isFinite(r.totalDog)).toBe(true);
  });
});
