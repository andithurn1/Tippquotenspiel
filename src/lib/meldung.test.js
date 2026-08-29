import { describe, it, expect } from "vitest";
import {
  MELDE_GRUENDE, GRUND_KEYS, NOTIZ_MAX, istGrund, grundVon,
  pruefeMeldung, sanitizeNotiz, baueMeldung, schonGemeldet,
} from "./meldung";

describe("Die Gründe", () => {
  it("jeder Grund ist beschriftet und erklärt", () => {
    for (const g of MELDE_GRUENDE) {
      expect(g.key).toMatch(/^[a-z-]+$/);
      expect(g.label).toBeTruthy();
      // ⚠️ Der Hinweis ist kein Zierrat: ohne ihn wählen alle den ersten
      // Eintrag, und die Liste sagt hinterher nichts aus.
      expect(g.hint.length, g.key).toBeGreaterThan(20);
    }
  });

  it("die Schlüssel sind eindeutig", () => {
    expect(new Set(GRUND_KEYS).size).toBe(GRUND_KEYS.length);
  });

  // ⚠️ Bewusst wenige. Je feiner die Auswahl, desto mehr sieht es nach einem
  // Verfahren aus, das es noch nicht gibt.
  it("⚠️ es bleiben wenige — höchstens sechs", () => {
    expect(MELDE_GRUENDE.length).toBeLessThanOrEqual(6);
  });

  it("kennt nur seine eigenen Gründe", () => {
    expect(istGrund("beleidigend")).toBe(true);
    expect(istGrund("gefaellt-mir-nicht")).toBe(false);
    expect(istGrund(null)).toBe(false);
    expect(grundVon("werbung").label).toBe("Werbung oder Spam");
    expect(grundVon("quatsch")).toBeNull();
  });
});

describe("Die Prüfung", () => {
  const gut = { melderId: "a", zielId: "b", grund: "beleidigend" };

  it("lässt eine vollständige Meldung durch", () => {
    expect(pruefeMeldung(gut).erlaubt).toBe(true);
  });

  // 🔴 Klingt albern und ist der erste Weg, eine Liste zuzumüllen, die
  // irgendwann jemand von Hand durchsieht.
  it("🔴 niemand meldet sich selbst", () => {
    const p = pruefeMeldung({ ...gut, zielId: "a" });
    expect(p.erlaubt).toBe(false);
    expect(p.grund).toContain("selbst");
  });

  it("ohne Anmeldung geht nichts", () => {
    expect(pruefeMeldung({ ...gut, melderId: null }).erlaubt).toBe(false);
  });

  it("ohne Ziel geht nichts", () => {
    expect(pruefeMeldung({ ...gut, zielId: null }).erlaubt).toBe(false);
  });

  it("ein erfundener Grund geht nicht durch", () => {
    expect(pruefeMeldung({ ...gut, grund: "weil-halt" }).erlaubt).toBe(false);
  });

  // ⚠️ „Etwas anderes" ohne Notiz ist keine Meldung, sondern ein Achselzucken.
  it("⚠️ Etwas anderes verlangt eine Beschreibung", () => {
    expect(pruefeMeldung({ ...gut, grund: "sonstiges" }).erlaubt).toBe(false);
    expect(pruefeMeldung({ ...gut, grund: "sonstiges", notiz: "kurz" }).erlaubt).toBe(false);
    expect(pruefeMeldung({ ...gut, grund: "sonstiges", notiz: "Er nennt hier meinen Arbeitgeber." }).erlaubt)
      .toBe(true);
  });

  // 🔴 Ein Knopf, der nichts tut und nicht sagt warum, ist die schlechteste
  // Rückmeldung von allen: der Melder hält die Funktion für kaputt.
  it("🔴 jede Absage nennt einen Grund", () => {
    const faelle = [
      { melderId: null, zielId: "b", grund: "werbung" },
      { melderId: "a", zielId: null, grund: "werbung" },
      { melderId: "a", zielId: "a", grund: "werbung" },
      { melderId: "a", zielId: "b", grund: "unfug" },
      { melderId: "a", zielId: "b", grund: "sonstiges" },
    ];
    for (const f of faelle) {
      const p = pruefeMeldung(f);
      expect(p.erlaubt, JSON.stringify(f)).toBe(false);
      expect(p.grund, JSON.stringify(f)).toBeTruthy();
    }
  });
});

describe("Die Notiz", () => {
  it("räumt Leerraum auf und kürzt", () => {
    expect(sanitizeNotiz("  viel    Platz  ")).toBe("viel Platz");
    expect(sanitizeNotiz("x".repeat(NOTIZ_MAX + 50)).length).toBe(NOTIZ_MAX);
  });

  // 🔴 Dieselben unsichtbaren Zeichen wie bei der Beschreibung. Eine Meldung,
  // die die Liste des Prüfers verschiebt, ist ein eigener kleiner Angriff.
  it("🔴 entfernt unsichtbare Steuerzeichen", () => {
    expect(sanitizeNotiz("Hallo​Welt")).toBe("HalloWelt");
    expect(sanitizeNotiz("Hallo‮Welt")).toBe("HalloWelt");
  });

  it("verträgt Unsinn", () => {
    expect(sanitizeNotiz(null)).toBe("");
    expect(sanitizeNotiz(42)).toBe("");
  });
});

describe("Die fertige Meldung", () => {
  const JETZT = Date.parse("2026-09-02T10:00:00Z");

  it("trägt alles, was ein Prüfer braucht", () => {
    const { ok, meldung } = baueMeldung({
      melderId: "a", zielId: "b", grund: "werbung",
      notiz: "Immer derselbe Link.", textKopie: "Kauft bei mir!", jetzt: JETZT,
    });
    expect(ok).toBe(true);
    expect(meldung.melder_id).toBe("a");
    expect(meldung.ziel_id).toBe("b");
    expect(meldung.art).toBe("beschreibung");
    expect(meldung.grund).toBe("werbung");
    expect(meldung.notiz).toBe("Immer derselbe Link.");
    expect(meldung.gemeldet_am).toBe(new Date(JETZT).toISOString());
  });

  // 🔴 Der Kern der ganzen Datei. Wer gemeldet wird, ändert seinen Text — und
  // dann steht „unangemessen" über einem harmlosen Satz. Das schadet BEIDEN
  // Seiten: der Gemeldete kann sich gegen einen Vorwurf nicht wehren, den
  // niemand mehr nachlesen kann.
  it("🔴 speichert den gemeldeten Text MIT", () => {
    const { meldung } = baueMeldung({
      melderId: "a", zielId: "b", grund: "beleidigend", textKopie: "Der Satz von damals.",
    });
    expect(meldung.text_kopie).toBe("Der Satz von damals.");
  });

  it("gibt bei einer unzulässigen Meldung nichts zurück — mit Grund", () => {
    const r = baueMeldung({ melderId: "a", zielId: "a", grund: "werbung" });
    expect(r.ok).toBe(false);
    expect(r.meldung).toBeNull();
    expect(r.grund).toBeTruthy();
  });

  it("säubert auch die Kopie", () => {
    const { meldung } = baueMeldung({
      melderId: "a", zielId: "b", grund: "werbung", textKopie: "Kauft​ bei‮ mir",
    });
    expect(meldung.text_kopie).not.toMatch(/[​‮]/);
  });
});

describe("Schon gemeldet?", () => {
  const bestand = [{ melder_id: "a", ziel_id: "b", art: "beschreibung" }];

  // ⚠️ Der Knopf soll dann „Meldung ändern" heißen und nicht so tun, als wäre
  // nichts passiert — sonst meldet jemand dreimal und wundert sich.
  it("erkennt die eigene frühere Meldung", () => {
    expect(schonGemeldet(bestand, "a", "b")).toBe(true);
    expect(schonGemeldet(bestand, "a", "c")).toBe(false);
    expect(schonGemeldet(bestand, "x", "b")).toBe(false);
  });

  it("unterscheidet die Art", () => {
    expect(schonGemeldet(bestand, "a", "b", "name")).toBe(false);
  });

  it("verträgt eine leere Liste", () => {
    expect(schonGemeldet(null, "a", "b")).toBe(false);
    expect(schonGemeldet([], "a", "b")).toBe(false);
  });
});
