import { describe, it, expect } from "vitest";
import { isPremium, applyEntitlements, isLocked, PREMIUM_FEATURES } from "./premium";
import { DEFAULT_RULES, sanitizeRules } from "./engine";
import { createMockStore } from "./store.mock";

const MIT_JOKER = sanitizeRules({
  ...DEFAULT_RULES, joker: { enabled: true, modus: "einzel", faktor: 2 },
});

describe("isPremium", () => {
  it("gilt nur mit einem Datum in der Zukunft", () => {
    expect(isPremium({ premium_until: "2099-01-01T00:00:00Z" })).toBe(true);
    expect(isPremium({ premium_until: "2020-01-01T00:00:00Z" })).toBe(false);
    expect(isPremium({ premium_until: null })).toBe(false);
    expect(isPremium({})).toBe(false);
    expect(isPremium(null)).toBe(false);
  });

  it("verträgt Unsinn im Feld, ohne Premium zu verschenken", () => {
    expect(isPremium({ premium_until: "übermorgen" })).toBe(false);
    expect(isPremium({ premium_until: true })).toBe(false);
  });

  it("läuft zum Stichtag ab", () => {
    const bis = "2026-07-01T00:00:00Z";
    expect(isPremium({ premium_until: bis }, Date.parse("2026-06-30T00:00:00Z"))).toBe(true);
    expect(isPremium({ premium_until: bis }, Date.parse("2026-07-02T00:00:00Z"))).toBe(false);
  });
});

// 🔴 UMGESCHRIEBEN AM 25.08.2026. Diese Tests hielten vorher die
// Bezahlschranke fest („neutralisiert den Joker ohne Premium"). Andi hat sie
// abgeschafft: „ich will keine Funktionen am Gesamten Spiel hinter ner
// Bezahlschranke, ich bin darauf aus auf maximale Verbreitung."
//
// ⚠️ Sie sind nicht gelöscht, sondern **umgedreht** — sie sichern jetzt, dass
// die Schranke WEG BLEIBT. Ein gelöschter Test hätte nichts gesichert, und
// genau so schleicht sich eine Sperre in einem halben Jahr wieder ein.
describe("applyEntitlements sperrt nichts mehr", () => {
  it("lässt den Joker stehen, auch ohne Premium", () => {
    expect(applyEntitlements(MIT_JOKER, { premium: false }).joker.enabled).toBe(true);
  });

  it("gibt dasselbe Regelwerk zurück, nicht eine Kopie", () => {
    // Dieselbe Referenz: die Funktion reicht durch, sie stutzt nicht mehr.
    expect(applyEntitlements(MIT_JOKER, { premium: false })).toBe(MIT_JOKER);
    expect(applyEntitlements(MIT_JOKER, { premium: true })).toBe(MIT_JOKER);
  });

  it("verändert auch ein schlichtes Regelwerk nicht", () => {
    const schlicht = sanitizeRules(DEFAULT_RULES);
    expect(applyEntitlements(schlicht, { premium: false })).toBe(schlicht);
  });
});

describe("isLocked", () => {
  // 🔴 Der Wächter über Andis Entscheidung: sobald jemand einen Eintrag in
  // `PREMIUM_FEATURES` schreibt, steht wieder eine Funktion hinter der
  // Bezahlschranke — und dieser Test schlägt an.
  it("sperrt nichts, weil es keine gesperrten Funktionen gibt", () => {
    expect(PREMIUM_FEATURES).toEqual([]);
    expect(isLocked("joker", { premium: false })).toBe(false);
    expect(isLocked("joker", { premium: true })).toBe(false);
    expect(isLocked("gibts-nicht", { premium: false })).toBe(false);
  });

  it("jede gelistete Funktion hat Schlüssel, Titel und Beschreibung", () => {
    for (const f of PREMIUM_FEATURES) {
      expect(f.key).toBeTruthy();
      expect(f.label).toBeTruthy();
      expect(f.desc).toBeTruthy();
    }
  });
});

describe("Durchsetzung beim Anlegen einer Runde", () => {
  it("Admin OHNE Premium bekommt den Joker trotzdem", async () => {
    const store = createMockStore();
    const round = await store.createRound({ name: "Ohne", adminId: "u-lena", rules: MIT_JOKER });
    expect(round.rules.joker.enabled).toBe(true);
    expect(round.rules.joker.faktor).toBe(2);
  });

  it("Admin mit Premium behält den Joker", async () => {
    const store = createMockStore();
    const round = await store.createRound({ name: "Mit", adminId: "u-du", rules: MIT_JOKER });
    expect(round.rules.joker.enabled).toBe(true);
    expect(round.rules.joker.faktor).toBe(2);
  });

  it("auch ein unbekannter Admin bekommt ein vollständiges Regelwerk", async () => {
    // ⚠️ Der Fall, der vorher am meisten wehtat: wer ohne Konto eine Runde
    // anlegte, bekam eine Runde ohne Joker — und erfuhr es nirgends.
    const store = createMockStore();
    const round = await store.createRound({ name: "Fremd", adminId: "u-niemand", rules: MIT_JOKER });
    expect(round.rules.joker.enabled).toBe(true);
  });

  it("das Profil verrät die Berechtigung, ohne dass sie setzbar wäre", async () => {
    const store = createMockStore();
    expect(isPremium(await store.getProfile("u-du"))).toBe(true);
    expect(isPremium(await store.getProfile("u-lena"))).toBe(false);
    // updateProfile kennt kein Premium-Feld — ein Client kann es nicht setzen.
    await store.updateProfile("u-lena", { displayName: "Lena", premium_until: "2099-01-01T00:00:00Z" });
    expect(isPremium(await store.getProfile("u-lena"))).toBe(false);
  });
});
