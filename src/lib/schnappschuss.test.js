import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { ohneSchnappschuss, hatSchnappschuesse, SCHNAPPSCHUSS_LESER } from "./schnappschuss";
import { createMockStore } from "./store.mock";
import { DEMO_ROUND_ID } from "./constants";

// ============================================================
//  DER SCHLANKE KATALOG -- und die Falle, die er aufmacht
//
//  🔴 Gemessen (27.08.2026, Mock-Katalog mit 1943 Spielen):
//        voll     3138 KB
//        schlank   467 KB   -- 85 % gespart
//  Von 18 Screens, die Spiele laden, fassen 14 den Schnappschuss nie an.
//
//  ⚠️ Und genau daraus entsteht die Gefahr, vor der die Roadmap woertlich
//  warnt: „Ein weggelassenes Feld stuerzt nicht ab -- es zeigt still etwas
//  Falsches, und das faellt fruehestens Wochen spaeter auf."
//
//  Dagegen zwei Sperren, und beide werden hier geprueft:
//  1. Das Feld wird GELOESCHT, nicht geleert. `null` saehe aus wie „kein
//     Schnappschuss vorhanden" und rechnete weiter.
//  2. `npm run schlank` misst, ob ein schlank ladender Screen doch zugreift.
// ============================================================

describe("Ein Spiel ohne Schnappschuss", () => {
  const spiel = { id: "m1", home: "A", away: "B", snapshot: { winner: {} } };

  it("🔴 LOESCHT das Feld, statt es auf null zu setzen", () => {
    const schlank = ohneSchnappschuss(spiel);
    expect("snapshot" in schlank).toBe(false);
    // ⚠️ Der Unterschied ist der ganze Punkt: `snapshot === null` rechnet
    // still weiter, ein fehlendes Feld faellt beim ersten Zugriff auf.
    expect(schlank.snapshot).toBeUndefined();
  });

  it("laesst alles andere unberuehrt", () => {
    expect(ohneSchnappschuss(spiel)).toEqual({ id: "m1", home: "A", away: "B" });
  });

  it("gibt dasselbe Objekt zurueck, wenn es nichts zu tun gibt", () => {
    const ohne = { id: "m1" };
    expect(ohneSchnappschuss(ohne)).toBe(ohne);
    expect(ohneSchnappschuss(null)).toBeNull();
  });

  it("`hatSchnappschuesse` erkennt beide Fassungen", () => {
    expect(hatSchnappschuesse([spiel])).toBe(true);
    expect(hatSchnappschuesse([ohneSchnappschuss(spiel)])).toBe(false);
    expect(hatSchnappschuesse([])).toBe(false);
  });

  it("die Leser-Liste nennt zu jedem Feld Anteil und Abnehmer", () => {
    // 🔴 Die Liste, nach der die Roadmap gefragt hat. Sie ist Dokumentation
    // und darf nicht zur Karteileiche werden.
    expect(SCHNAPPSCHUSS_LESER.length).toBeGreaterThanOrEqual(6);
    for (const l of SCHNAPPSCHUSS_LESER) {
      expect(l.feld && l.anteil && l.wer, l.feld).toBeTruthy();
    }
  });
});

describe("Der Store liefert wirklich schlank", () => {
  it("listMatches: schlank spart den Schnappschuss -- und zwar messbar", async () => {
    const store = createMockStore();
    const voll = await store.listMatches();
    const schlank = await store.listMatches(null, { schlank: true });

    expect(schlank).toHaveLength(voll.length);
    expect(hatSchnappschuesse(voll)).toBe(true);
    expect(hatSchnappschuesse(schlank)).toBe(false);

    // 🔴 Die Zahl, wegen der das gebaut wurde. Weniger als die Haelfte waere
    // ein Zeichen, dass der Schnappschuss geschrumpft ist -- dann lohnt die
    // ganze Unterscheidung nicht mehr und gehoert nochmal angesehen.
    const anteil = JSON.stringify(schlank).length / JSON.stringify(voll).length;
    expect(anteil, `schlank ist ${(anteil * 100).toFixed(0)} % von voll`).toBeLessThan(0.5);
  });

  it("listRoundMatches: dieselbe Zusage, dieselben Spiele", async () => {
    const store = createMockStore();
    const voll = await store.listRoundMatches(DEMO_ROUND_ID);
    const schlank = await store.listRoundMatches(DEMO_ROUND_ID, { schlank: true });
    expect(schlank.map((m) => m.id)).toEqual(voll.map((m) => m.id));
    expect(hatSchnappschuesse(schlank)).toBe(false);
  });

  it("ohne Angabe bleibt alles, wie es war", async () => {
    // ⚠️ Der Regressionsschutz: `schlank` ist eine BITTE, keine neue Vorgabe.
    const store = createMockStore();
    expect(hatSchnappschuesse(await store.listMatches())).toBe(true);
    expect(hatSchnappschuesse(await store.listRoundMatches(DEMO_ROUND_ID))).toBe(true);
  });
});

describe("Die Sperrklinke: npm run schlank", () => {
  const ausgabe = execFileSync("npx", ["vite-node", "scripts/schlank-durchgang.mjs"], {
    encoding: "utf8", timeout: 120000,
  });

  it("kein Screen greift an einen Schnappschuss, den er nicht geladen hat", () => {
    expect(ausgabe, ausgabe).toContain("✅ Kein Screen greift an einen Schnappschuss");
  });

  it("🔴 die Zahl der schlanken Screens darf nur STEIGEN", () => {
    // Stand 27.08.2026: 14. Sinkt sie, hat jemand einen Screen zurueck auf die
    // volle Fassung gestellt -- das kann richtig sein, muss dann aber
    // ausdruecklich hier vermerkt werden.
    const t = /(\d+) Screens laden schlank/.exec(ausgabe);
    expect(t, ausgabe).toBeTruthy();
    expect(Number(t[1])).toBeGreaterThanOrEqual(14);
  });
});
