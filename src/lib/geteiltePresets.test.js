import { describe, it, expect } from "vitest";
import { createMockStore } from "@/lib/store.mock";
import { eintraege, sortiere, suche, SORTIERUNGEN } from "@/lib/bibliothek";
import { DEFAULT_RULES } from "@/lib/engine";
import { ASPEKT_KEYS } from "@/lib/presetMerge";

// ============================================================
//  GETEILTE REGELWERKE — die Voraussetzung für „beliebteste Auswahl"
//
//  🔴 Andi am 24.08.2026: „funktionierts auch schon, dass ich einen Gamemode
//  erstellen und nen creator code dafür austeilen kann, der dann hochgeladen
//  ist unter beliebteste auswahl und so und von jemand anderem so übernommen
//  werden kann?"
//
//  Die ehrliche Antwort war: nein — nicht wegen einer fehlenden Oberfläche,
//  sondern weil der Store nur `getPresetByCode` konnte. Man musste den Code
//  schon KENNEN. Eine Liste gab es nicht, also konnte es auch keine
//  Beliebtheit geben.
//
//  ⚠️ Geprüft wird hier beides getrennt: dass die Liste da ist (Store) und
//  dass die Bibliothek sie einsortiert (bibliothek.js). Ein grüner Store-Test
//  allein hätte am 06.08. sechsmal nichts bewiesen — siehe `npm run tot`.
// ============================================================

const teile = async (store, name, extra = {}) =>
  store.publishPreset({ name, rules: DEFAULT_RULES, creatorId: "u1", ...extra });

// 🔴 Der Mock ist seit dem 24.08.2026 mit drei geteilten Regelwerken GESEEDET
// (ATE4 — sonst wäre „beliebteste Auswahl" im Demo-Betrieb nie zu sehen).
// Die Tests hier prüfen das VERHALTEN, nicht den Katalog: sie filtern deshalb
// auf ihre eigenen Einträge, statt eine Gesamtzahl festzunageln.
// ⚠️ Ein Test, der `toHaveLength(3)` schriebe, ginge beim vierten Seed-Eintrag
// kaputt, ohne dass etwas kaputt wäre.
const nurMeine = (liste, namen) => liste.filter((p) => namen.includes(p.name)).map((p) => p.name);

describe("Der Seed", () => {
  it("bringt geteilte Regelwerke mit, sonst wäre „Beliebt\" im Demo leer", async () => {
    const store = createMockStore();
    const liste = await store.listPresets();
    expect(liste.length).toBeGreaterThan(0);
    // Mindestens einer mit Übernahmen und einer ohne — beide Anzeigefälle.
    expect(liste.some((p) => (p.uebernahmen ?? 0) > 0)).toBe(true);
    expect(liste.some((p) => (p.uebernahmen ?? 0) === 0)).toBe(true);
  });

  it("führt den Teil-Code mit einem gültigen Aspekt", async () => {
    const store = createMockStore();
    const mitAspekt = (await store.listPresets()).filter((p) => p.aspekt);
    expect(mitAspekt.length).toBeGreaterThan(0);
    for (const p of mitAspekt) expect(ASPEKT_KEYS).toContain(p.aspekt);
  });
});

describe("listPresets", () => {
  it("gibt zurück, was veröffentlicht wurde", async () => {
    const store = createMockStore();
    const vorher = (await store.listPresets()).length;
    const a = await teile(store, "Erstes");
    const liste = await store.listPresets();
    expect(liste).toHaveLength(vorher + 1);
    expect(liste.map((p) => p.code)).toContain(a.code);
  });

  it("sortiert nach Übernahmen — das ist „beliebteste Auswahl\"", async () => {
    const store = createMockStore();
    const selten = await teile(store, "Selten");
    const oft = await teile(store, "Oft");
    await store.merkePresetNutzung(oft.code);
    await store.merkePresetNutzung(oft.code);
    await store.merkePresetNutzung(selten.code);

    const liste = await store.listPresets({ sortierung: "beliebt" });
    expect(nurMeine(liste, ["Oft", "Selten"])).toEqual(["Oft", "Selten"]);
    expect(liste.find((p) => p.name === "Oft").uebernahmen).toBe(2);
  });

  // Die Gegenprobe zur Sortierung: ein neu geteiltes Preset steht bei
  // „beliebt" hinten, bei „neu" vorn. Ohne diesen Test wäre nicht belegt,
  // dass die Sortierung überhaupt etwas TUT — nur dass sie nicht abstürzt.
  it("sortiert nach „neu\" anders als nach „beliebt\"", async () => {
    const store = createMockStore();
    const alt = await teile(store, "Alt");
    await store.merkePresetNutzung(alt.code);
    // Zeitstempel auseinanderziehen: zwei Aufrufe in derselben Millisekunde
    // wären sonst nicht unterscheidbar und der Test zufällig grün.
    await new Promise((r) => setTimeout(r, 5));
    await teile(store, "Neu");

    expect(nurMeine(await store.listPresets({ sortierung: "beliebt" }), ["Alt", "Neu"])).toEqual(["Alt", "Neu"]);
    expect(nurMeine(await store.listPresets({ sortierung: "neu" }), ["Alt", "Neu"])).toEqual(["Neu", "Alt"]);
  });

  it("findet über Name, Beschreibung und Code", async () => {
    const store = createMockStore();
    const p = await teile(store, "Sturmnacht", { beschreibung: "viele Joker, wenig Gnade" });
    await teile(store, "Lüftchen");

    // ⚠️ „sturm" trifft auch den Seed-Eintrag „Sturmnacht" — genau deshalb
    // sucht dieser Test über den CODE, der garantiert einmalig ist, und prüft
    // bei den Wörtern nur, dass der eigene Eintrag dabei und der andere weg ist.
    const namen = async (t) => (await store.listPresets({ text: t })).map((x) => x.name);
    expect(await namen("gnade")).toContain("Sturmnacht");
    expect(await namen("gnade")).not.toContain("Lüftchen");
    expect(await namen(p.code)).toEqual(["Sturmnacht"]);
  });

  it("zählt nur die Übernahme, nicht den Blick", async () => {
    const store = createMockStore();
    const p = await teile(store, "Egal");
    // Zehnmal anschauen bewegt nichts …
    for (let i = 0; i < 10; i++) await store.getPresetByCode(p.code);
    expect((await store.getPresetByCode(p.code)).uebernahmen).toBe(0);
    // … einmal übernehmen schon.
    await store.merkePresetNutzung(p.code);
    expect((await store.getPresetByCode(p.code)).uebernahmen).toBe(1);
  });

  it("verträgt einen unbekannten Code beim Zählen", async () => {
    const store = createMockStore();
    expect(await store.merkePresetNutzung("GIBTSNICHT")).toBeNull();
  });
});

describe("Die Bibliothek nimmt geteilte Regelwerke auf", () => {
  const geteilt = (extra = {}) => ({
    code: "ABC123", name: "Sturmnacht", beschreibung: "viele Joker",
    rules: DEFAULT_RULES, uebernahmen: 7, aspekt: null, ...extra,
  });

  it("führt sie als eigene Herkunft", () => {
    const liste = eintraege([], [geteilt()]);
    const e = liste.find((x) => x.id === "geteilt:ABC123");
    expect(e).toBeTruthy();
    expect(e.urheber).toBe("geteilt");
    expect(e.art).toBe("preset");
    expect(e.uebernahmen).toBe(7);
  });

  // 🔴 Ein Teil-Code beschreibt EINEN Aspekt und ist damit ein Baustein, kein
  // Regelwerk. Stünde er unter „Regelwerk", würde ihn das Gesamtspiel-Fenster
  // als ganze Runden-Idee anbieten — und beim Anwenden bliebe der Rest leer.
  it("sortiert einen Teil-Code als Baustein ein", () => {
    const liste = eintraege([], [geteilt({ aspekt: "joker" })]);
    expect(liste.find((x) => x.id === "geteilt:ABC123").art).toBe("baustein");
  });

  it("ist über den Code auffindbar", () => {
    const liste = eintraege([], [geteilt()]);
    expect(suche(liste, "ABC123").map((e) => e.id)).toEqual(["geteilt:ABC123"]);
  });

  it("steht bei „beliebt\" vor den Haus-Einträgen", () => {
    const liste = eintraege([], [geteilt()]);
    expect(sortiere(liste, "beliebt")[0].id).toBe("geteilt:ABC123");
  });

  // ⚠️ Die Gegenprobe: ein Haus-Eintrag hat KEINE Übernahmen — und darf
  // deshalb nicht als „0× übernommen" gelten. „Nicht gemessen" und „null mal"
  // sind zwei verschiedene Aussagen.
  it("gibt Haus-Einträgen keine erfundene Null", () => {
    const haus = eintraege()[0];
    expect(haus.uebernahmen).toBeUndefined();
  });

  it("kennt „beliebt\" als angebotene Sortierung", () => {
    expect(SORTIERUNGEN.map((s) => s.key)).toContain("beliebt");
  });
});
