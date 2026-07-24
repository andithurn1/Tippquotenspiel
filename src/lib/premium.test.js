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

describe("applyEntitlements", () => {
  it("neutralisiert den Joker ohne Premium", () => {
    const gestutzt = applyEntitlements(MIT_JOKER, { premium: false });
    expect(gestutzt.joker.enabled).toBe(false);
  });

  it("lässt mit Premium alles unverändert", () => {
    expect(applyEntitlements(MIT_JOKER, { premium: true })).toBe(MIT_JOKER);
  });

  it("behält die Einstellungen, statt sie zu löschen — sie greifen nur nicht", () => {
    const gestutzt = applyEntitlements(MIT_JOKER, { premium: false });
    expect(gestutzt.joker.faktor).toBe(MIT_JOKER.joker.faktor);
    expect(gestutzt.joker.modus).toBe(MIT_JOKER.joker.modus);
    // Nach dem Freischalten wirken sie wieder, ohne neu eingestellt zu werden.
    expect(applyEntitlements(gestutzt, { premium: true }).joker.faktor).toBe(2);
  });

  it("verändert ein Regelwerk ohne Premium-Anteile nicht", () => {
    const schlicht = sanitizeRules(DEFAULT_RULES);
    expect(applyEntitlements(schlicht, { premium: false })).toBe(schlicht);
  });
});

describe("isLocked", () => {
  it("meldet Premium-Funktionen nur ohne Berechtigung als gesperrt", () => {
    expect(isLocked("joker", { premium: false })).toBe(true);
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
  it("Admin ohne Premium bekommt den Joker abgeschaltet", async () => {
    const store = createMockStore();
    const round = await store.createRound({ name: "Ohne", adminId: "u-lena", rules: MIT_JOKER });
    expect(round.rules.joker.enabled).toBe(false);
  });

  it("Admin mit Premium behält den Joker", async () => {
    const store = createMockStore();
    const round = await store.createRound({ name: "Mit", adminId: "u-du", rules: MIT_JOKER });
    expect(round.rules.joker.enabled).toBe(true);
    expect(round.rules.joker.faktor).toBe(2);
  });

  it("unbekannter Admin gilt nicht als Premium", async () => {
    const store = createMockStore();
    const round = await store.createRound({ name: "Fremd", adminId: "u-niemand", rules: MIT_JOKER });
    expect(round.rules.joker.enabled).toBe(false);
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
