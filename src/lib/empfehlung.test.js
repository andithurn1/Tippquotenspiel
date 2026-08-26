import { describe, it, expect } from "vitest";
import {
  DEFAULT_EMPFEHLUNG, EMPFEHLUNG_LIMITS, sanitizeEmpfehlung,
  spieltageJeSpieler, empfehlungsStand, beschreibeEmpfehlung,
} from "@/lib/empfehlung";

// Spiele: bl Spieltag 1-4 und pl Spieltag 1 (gleiche NUMMER, andere Liga).
const INFO = new Map([
  ["bl1", { wettbewerb: "bl", matchday: 1 }],
  ["bl1b", { wettbewerb: "bl", matchday: 1 }],
  ["bl2", { wettbewerb: "bl", matchday: 2 }],
  ["bl3", { wettbewerb: "bl", matchday: 3 }],
  ["bl4", { wettbewerb: "bl", matchday: 4 }],
  ["pl1", { wettbewerb: "pl", matchday: 1 }],
]);
const tipp = (userId, matchId) => ({ user_id: userId, match_id: matchId });

describe("Schwellen", () => {
  it("Andis zwei Zahlen stehen als Vorgabe", () => {
    expect(DEFAULT_EMPFEHLUNG.mitspieler).toBe(10);
    expect(DEFAULT_EMPFEHLUNG.praemieMonate).toBe(6);
  });

  it("bleiben in ihren Grenzen und fallen bei Unsinn auf die Vorgabe zurück", () => {
    expect(sanitizeEmpfehlung({ mitspieler: 999 }).mitspieler).toBe(EMPFEHLUNG_LIMITS.mitspieler.max);
    expect(sanitizeEmpfehlung({ mitspieler: 0 }).mitspieler).toBe(EMPFEHLUNG_LIMITS.mitspieler.min);
    expect(sanitizeEmpfehlung({ spieltage: "viele" }).spieltage).toBe(DEFAULT_EMPFEHLUNG.spieltage);
    expect(sanitizeEmpfehlung()).toEqual(DEFAULT_EMPFEHLUNG);
  });
});

describe("Spieltage je Spieler", () => {
  // 🔴 Wer an einem Nachmittag neun Spiele durchklickt, hat EINMAL getippt.
  it("zählt Spieltage, nicht Tipps", () => {
    const m = spieltageJeSpieler([tipp("a", "bl1"), tipp("a", "bl1b")], INFO);
    expect(m.get("a").size).toBe(1);
  });

  // 🔴 „Spieltag 1" gibt es in jeder Liga einmal.
  it("hält Wettbewerbe auseinander", () => {
    const m = spieltageJeSpieler([tipp("a", "bl1"), tipp("a", "pl1")], INFO);
    expect(m.get("a").size).toBe(2);
  });

  it("Tipps auf unbekannte Spiele zählen nicht", () => {
    const m = spieltageJeSpieler([tipp("a", "gibts-nicht")], INFO);
    expect(m.get("a")).toBeUndefined();
  });

  it("kommt mit leer und Unsinn klar", () => {
    expect(spieltageJeSpieler().size).toBe(0);
    expect(spieltageJeSpieler([{}, null], INFO).size).toBe(0);
  });
});

describe("Der Stand einer Runde", () => {
  const mitglieder = [
    { user_id: "admin", name: "Andi" },
    { user_id: "a", name: "Anna" },
    { user_id: "b", name: "Ben" },
    { user_id: "c", name: "Cem" },
  ];
  // Anna 3 Spieltage · Ben 1 · Cem 0
  const tips = [
    tipp("a", "bl1"), tipp("a", "bl2"), tipp("a", "bl3"),
    tipp("b", "bl1"),
    tipp("admin", "bl1"), tipp("admin", "bl2"), tipp("admin", "bl3"),
  ];
  const stand = (schwellen) => empfehlungsStand({
    mitglieder, tips, spielInfo: INFO, adminId: "admin",
    // ⚠️ `mitspieler: 3` ist die UNTERGRENZE aus `EMPFEHLUNG_LIMITS` — kleinere
    // Werte würden gekappt, und der Test prüfte dann etwas anderes als er sagt.
    // (Beim ersten Anlauf stand hier 2 und der Test schlug zu Recht an.)
    schwellen: { ...DEFAULT_EMPFEHLUNG, mitspieler: 3, spieltage: 3, ...schwellen },
  });

  // ⚠️ Wer sich selbst mitzählt, braucht nur neun Freunde statt zehn.
  it("der Admin zählt NICHT als geworbener Mitspieler", () => {
    const s = stand();
    expect(s.geworben).toBe(3);
    expect(s.zeilen.some((z) => z.userId === "admin")).toBe(false);
  });

  it("aktiv ist, wer die Spieltag-Schwelle erreicht", () => {
    const s = stand();
    expect(s.zeilen.find((z) => z.userId === "a")).toMatchObject({ spieltage: 3, aktiv: true });
    expect(s.zeilen.find((z) => z.userId === "b")).toMatchObject({ spieltage: 1, aktiv: false });
    expect(s.zeilen.find((z) => z.userId === "c")).toMatchObject({ spieltage: 0, aktiv: false });
    expect(s.aktive).toBe(1);
  });

  it("sagt, wie viele noch fehlen", () => {
    expect(stand().fehlen).toBe(2);      // 1 von 3 aktiv
    expect(stand().erfuellt).toBe(false);
  });

  it("erfüllt, sobald genug aktiv sind", () => {
    // Schwelle auf einen Spieltag: dann sind Anna UND Ben aktiv.
    const s = stand({ mitspieler: 3, spieltage: 1 });
    expect(s.aktive).toBe(2);
    expect(s.erfuellt).toBe(false);      // 2 von 3
    const alle = empfehlungsStand({
      mitglieder, tips: [...tips, tipp("c", "bl4")], spielInfo: INFO, adminId: "admin",
      schwellen: { ...DEFAULT_EMPFEHLUNG, mitspieler: 3, spieltage: 1 },
    });
    expect(alle.aktive).toBe(3);
    expect(alle.erfuellt).toBe(true);
    expect(alle.fehlen).toBe(0);
  });

  // ⚠️ Die Missbrauchskante: Beitreten allein reicht nicht.
  it("ein Beitritt ohne Tipps macht niemanden aktiv", () => {
    const s = empfehlungsStand({
      mitglieder: [{ user_id: "admin" }, ...Array.from({ length: 20 }, (_, i) => ({ user_id: `fake${i}` }))],
      tips: [], spielInfo: INFO, adminId: "admin",
    });
    expect(s.geworben).toBe(20);
    expect(s.aktive).toBe(0);
    expect(s.erfuellt).toBe(false);
  });

  it("die aktivsten stehen oben", () => {
    const s = stand();
    expect(s.zeilen.map((z) => z.userId)).toEqual(["a", "b", "c"]);
  });
});

describe("Ein Satz für die Oberfläche", () => {
  const basis = { mitglieder: [{ user_id: "admin" }, { user_id: "a" }], spielInfo: INFO, adminId: "admin" };

  it("nennt Stand und Bedingung, solange es nicht reicht", () => {
    const s = empfehlungsStand({ ...basis, tips: [] });
    const text = beschreibeEmpfehlung(s);
    expect(text).toContain("0 von 10");
    expect(text).toContain("3 verschiedenen Spieltagen");
  });

  it("sagt es klar, wenn es geschafft ist", () => {
    const s = empfehlungsStand({
      mitglieder: [{ user_id: "admin" }, { user_id: "a" }, { user_id: "b" }, { user_id: "c" }],
      spielInfo: INFO, adminId: "admin",
      tips: [{ user_id: "a", match_id: "bl1" }, { user_id: "b", match_id: "bl1" }, { user_id: "c", match_id: "bl1" }],
      schwellen: { ...DEFAULT_EMPFEHLUNG, mitspieler: 3, spieltage: 1 },
    });
    expect(beschreibeEmpfehlung(s)).toContain("Geschafft");
    expect(beschreibeEmpfehlung(s)).toContain("6 Monate");
  });

  it("eine leere Runde bekommt keinen Zahlensalat", () => {
    const s = empfehlungsStand({ mitglieder: [{ user_id: "admin" }], tips: [], adminId: "admin" });
    expect(beschreibeEmpfehlung(s)).toContain("Noch niemand");
  });

  it("Einzahl bleibt Einzahl", () => {
    const s = empfehlungsStand({
      mitglieder: [{ user_id: "admin" }, { user_id: "a" }], spielInfo: INFO, adminId: "admin",
      tips: [], schwellen: { ...DEFAULT_EMPFEHLUNG, spieltage: 1 },
    });
    expect(beschreibeEmpfehlung(s)).toContain("an einem Spieltag");
    expect(beschreibeEmpfehlung(s)).not.toContain("1 verschiedenen");
  });
});
