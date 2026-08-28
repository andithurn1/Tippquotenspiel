import { describe, it, expect } from "vitest";
import {
  RUNDEN_ZONE, WOCHENTAGE, wochentagVon,
  zonenVersatz, wochentagIndex, tagesBeginn, letzterWochentag,
} from "./zonenzeit";

// ⚠️ Alle Zeiten hier als ISO mit „Z" — sonst läse `new Date(...)` sie in der
// Zeitzone des Rechners, und der Test prüfte auf dem Server etwas anderes als
// auf Andis Windows-Rechner. Genau der Fehler, gegen den diese Datei da ist.
const t = (iso) => new Date(iso).getTime();

describe("Zonenzeit rechnet in der Zone, nicht auf dem Rechner", () => {
  it("kennt den Versatz und wechselt mit der Sommerzeit", () => {
    // Sommerzeit: Berlin = UTC+2. Winterzeit: UTC+1.
    expect(zonenVersatz(t("2026-08-28T12:00:00Z"))).toBe(2 * 3600 * 1000);
    expect(zonenVersatz(t("2026-12-19T12:00:00Z"))).toBe(1 * 3600 * 1000);
  });

  it("🔴 kippt den Wochentag an der Stelle, an der UTC noch der Vortag ist", () => {
    // 22:30 UTC am Freitag ist in Berlin bereits Samstag 00:30. Ein Spieltag,
    // der Samstag beginnt, muss dieses Spiel enthalten — `getDay()` auf einem
    // UTC-Server hätte hier „Freitag" gesagt.
    expect(wochentagIndex(t("2026-08-28T22:30:00Z"))).toBe(6);
    expect(wochentagIndex(t("2026-08-28T18:30:00Z"))).toBe(5);
  });

  it("findet den Beginn des Kalendertags in Ortszeit", () => {
    // Freitag 20:30 Ortszeit (= 18:30 UTC) → Freitag 00:00 Ortszeit = 22:00 UTC
    // des Vortags. Wer hier UTC-Mitternacht nimmt, liegt zwei Stunden daneben.
    expect(new Date(tagesBeginn(t("2026-08-28T18:30:00Z"))).toISOString())
      .toBe("2026-08-27T22:00:00.000Z");
  });

  describe("letzterWochentag — die Spieltags-Grenze", () => {
    it("geht rückwärts auf den gesuchten Tag um 00:00 Ortszeit", () => {
      // Samstag, 29.08.2026 → der Donnerstag davor ist der 27.08.
      const grenze = letzterWochentag(t("2026-08-29T13:30:00Z"), "do");
      expect(wochentagIndex(grenze)).toBe(4);
      expect(new Date(grenze).toISOString()).toBe("2026-08-26T22:00:00.000Z");
    });

    it("⚠️ bleibt stehen, wenn der Zeitpunkt SELBST die Grenze ist", () => {
      // Sonst verschöbe sich eine Saison, die genau auf der Grenze beginnt,
      // um eine ganze Woche nach hinten.
      const donnerstagNull = letzterWochentag(t("2026-08-29T13:30:00Z"), "do");
      expect(letzterWochentag(donnerstagNull, "do")).toBe(donnerstagNull);
    });

    it("übersteht die Zeitumstellung", () => {
      // Die Nacht auf Sonntag, 25.10.2026 — die Uhr geht zurück. Die Grenze
      // muss trotzdem Donnerstag 00:00 Ortszeit sein, nicht 23:00 des Mittwochs.
      const grenze = letzterWochentag(t("2026-10-27T20:00:00Z"), "do");
      expect(wochentagIndex(grenze)).toBe(4);
      expect(new Date(grenze).toISOString()).toBe("2026-10-21T22:00:00.000Z");
    });

    it("lässt den Zeitpunkt unangetastet, wenn kein Tag gemeint ist", () => {
      const ms = t("2026-08-29T13:30:00Z");
      expect(letzterWochentag(ms, null)).toBe(ms);
      expect(letzterWochentag(ms, "quatsch")).toBe(ms);
    });
  });

  it("die Tagesliste ist vollständig und montagsorientiert", () => {
    expect(WOCHENTAGE).toHaveLength(7);
    expect(WOCHENTAGE[0].key).toBe("mo");
    expect(WOCHENTAGE.at(-1).key).toBe("so");
    expect(new Set(WOCHENTAGE.map((t) => t.index)).size).toBe(7);
    expect(wochentagVon("do").index).toBe(4);
    expect(wochentagVon("gibtsnicht")).toBe(null);
    expect(RUNDEN_ZONE).toBe("Europe/Berlin");
  });
});
