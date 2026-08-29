import { describe, it, expect } from "vitest";
import { sanitizeBeschreibung, beschreibungStand, BESCHREIBUNG_MAX } from "./beschreibung";

describe("Die Kurzbeschreibung", () => {
  it("lässt einen normalen Satz in Ruhe", () => {
    const t = "Tippe seit 2009 zu optimistisch auf Werder.";
    expect(sanitizeBeschreibung(t)).toBe(t);
  });

  it("macht aus Unsinn einen leeren Text, statt zu werfen", () => {
    expect(sanitizeBeschreibung(null)).toBe("");
    expect(sanitizeBeschreibung(42)).toBe("");
    expect(sanitizeBeschreibung(undefined)).toBe("");
  });

  it("kürzt auf die Höchstlänge", () => {
    const lang = "a".repeat(BESCHREIBUNG_MAX + 50);
    expect(sanitizeBeschreibung(lang).length).toBe(BESCHREIBUNG_MAX);
  });

  // ⚠️ Erst aufräumen, dann kürzen. Andersherum zählte weggeputzter Leerraum
  // gegen das Limit, und ein sichtbar kurzer Text würde abgeschnitten.
  it("⚠️ Leerraum zählt nicht gegen das Limit", () => {
    const t = `${"  ".repeat(100)}Kurzer Satz.`;
    expect(sanitizeBeschreibung(t)).toBe("Kurzer Satz.");
  });

  it("lässt höchstens drei Zeilen stehen", () => {
    const t = "eins\nzwei\ndrei\nvier\nfünf";
    expect(sanitizeBeschreibung(t).split("\n").length).toBe(3);
  });

  it("wirft Leerzeilen-Ketten raus", () => {
    expect(sanitizeBeschreibung("eins\n\n\n\nzwei")).toBe("eins\n\nzwei");
  });

  // 🔴 Der eigentliche Grund für diese Datei. Unsichtbare Zeichen sind der
  // Trick, der in jeder Freitext-Anzeige einmal probiert wird: ein
  // Richtungswechsel dreht die halbe Zeile um, Zero-Width verschiebt Namen.
  // In einer Rangliste, in der Beschreibungen nebeneinanderstehen, verschiebt
  // das nicht nur den eigenen Eintrag.
  it("🔴 entfernt unsichtbare Steuerzeichen", () => {
    expect(sanitizeBeschreibung("Hallo​Welt")).toBe("HalloWelt");
    expect(sanitizeBeschreibung("Hallo‮Welt")).toBe("HalloWelt");
    expect(sanitizeBeschreibung("HalloWelt")).toBe("HalloWelt");
    expect(sanitizeBeschreibung("﻿Hallo")).toBe("Hallo");
  });

  it("Emoji und Umlaute überleben", () => {
    expect(sanitizeBeschreibung("Grüße aus Köln ⚽")).toBe("Grüße aus Köln ⚽");
  });
});

describe("Der Stand für die Oberfläche", () => {
  it("zählt, was übrig ist", () => {
    const s = beschreibungStand("Hallo");
    expect(s.laenge).toBe(5);
    expect(s.uebrig).toBe(BESCHREIBUNG_MAX - 5);
    expect(s.leer).toBe(false);
  });

  it("merkt leer", () => {
    expect(beschreibungStand("").leer).toBe(true);
    expect(beschreibungStand("   ").leer).toBe(true);
  });

  // 🔴 „Gekürzt" muss man SEHEN, bevor man speichert — sonst steht später
  // etwas anderes da, als man geschrieben hat, und man merkt es nie.
  it("🔴 meldet, wenn etwas verschwunden ist", () => {
    expect(beschreibungStand("a".repeat(BESCHREIBUNG_MAX + 1)).gekuerzt).toBe(true);
    expect(beschreibungStand("Hallo​Welt").gekuerzt).toBe(true);
    expect(beschreibungStand("Alles gut.").gekuerzt).toBe(false);
  });

  it("ein leerer Text gilt nicht als gekürzt", () => {
    expect(beschreibungStand("").gekuerzt).toBe(false);
    expect(beschreibungStand(null).gekuerzt).toBe(false);
  });
});
