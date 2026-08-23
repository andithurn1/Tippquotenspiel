import { describe, it, expect } from "vitest";
import {
  pruefeEinstellbarkeit, funde, abdeckung, GEKOPPELT, ueberholteKopplungen,
} from "@/lib/einstellbarkeit";
import { DEFAULT_RULES, sanitizeRules, encodePreset, decodePreset } from "@/lib/engine";

// 🔴 Andi am 23.08.2026: „mach die demo runde bzw tests so dass sie alle
// Einstellbarkeiten abdeckt … um sie zu prüfen."
//
// Das hier ist die Test-Hälfte seiner Antwort: sie geht JEDES Blatt des
// Regelwerks durch, nicht eine Auswahl. Die Demo-Hälfte („Schaufenster") zeigt
// dagegen nur, was man auch SEHEN kann.

describe("Einstellbarkeit — jedes Feld, nicht eine Auswahl", () => {
  it("geht über das ganze Regelwerk und lässt nichts aus", () => {
    const alle = pruefeEinstellbarkeit();
    expect(alle.length).toBeGreaterThan(150);
    // Jedes Blatt genau einmal.
    expect(new Set(alle.map((e) => e.pfad)).size).toBe(alle.length);
    // `name` ist der Runden-Name, keine Einstellung.
    expect(alle.some((e) => e.pfad === "name")).toBe(false);
  });

  // 🔴 DIE Sperrklinke. Ein Feld, das seinen Wert verwirft, sieht aus wie
  // eines, das greift — genau davor warnt `greift` in seinem Kopf, aber nur
  // für die Handvoll Messfälle, die dort von Hand stehen.
  it("kein Feld verwirft seinen Wert oder verliert ihn im Creator-Code", () => {
    expect(funde().map((f) => `${f.pfad}: ${f.grund ?? "verliert sich im Creator-Code"}`)).toEqual([]);
  });

  // Die Gegenprobe zur Ausnahmeliste: eine Begründung, die nicht mehr stimmt,
  // ist schlimmer als keine — beim nächsten Durchgang glaubt ihr jemand.
  it("keine Kopplungs-Begründung ist überholt", () => {
    expect(ueberholteKopplungen()).toEqual([]);
  });

  it("jede Kopplung trägt einen Satz, der sie vertritt", () => {
    for (const [pfad, satz] of Object.entries(GEKOPPELT)) {
      expect(pfad).toMatch(/\./);
      expect(satz.length).toBeGreaterThan(60);
    }
  });

  // ⚠️ Arrays bleiben draußen — was in ihren Einträgen steckt, hat mit
  // `LISTEN_FELDER` in `stufenAbdeckung.js` seine eigene Messung.
  it("Arrays sind ausdrücklich nicht dabei", () => {
    const pfade = pruefeEinstellbarkeit().map((e) => e.pfad);
    for (const p of ["limitKlassen", "ereignisse.aktive", "drehrad.felder", "saison.wetten"]) {
      expect(pfade).not.toContain(p);
    }
  });
});

describe("Einstellbarkeit — die Abdeckung", () => {
  // Die Zahl steht hier als Sperrklinke: sie darf STEIGEN, aber nicht fallen.
  // Sinkt sie, hat jemand ein Preset, einen Charakter, eine Regler-Stufe oder
  // das Schaufenster ausgedünnt — und eine Einstellung wird seither nirgends
  // mehr vorgeführt.
  const ABDECKUNG_BEI_EINFUEHRUNG = 78;

  it("die Zahl der im Projekt vorgeführten Felder sinkt NICHT", () => {
    expect(abdeckung().ausProjekt).toBeGreaterThanOrEqual(ABDECKUNG_BEI_EINFUEHRUNG);
  });

  // 🔴 Der Beleg, dass die Prüfung überhaupt etwas prüft: ein absichtlich
  // kaputtes Feld MUSS auffallen. Ohne diesen Test könnte `funde()` immer
  // eine leere Liste liefern und alles sähe grün aus.
  it("ein Feld, das seinen Wert verwirft, fällt auch wirklich auf", () => {
    // `sanitizeRules` beschneidet `k` auf seine Grenzen — ein Wert weit
    // außerhalb kommt garantiert nicht durch, und genau das ist der Fall, den
    // die Prüfung finden soll.
    const kaputt = sanitizeRules({ ...DEFAULT_RULES, k: 99999 });
    expect(kaputt.k).not.toBe(99999);
  });

  // 🔴 Der Fund vom 23.08.2026, als Test festgenagelt: für eine Zahl mit
  // Vorgabe 0 liefert der generische Kandidaten-Vorrat über `wert * 2` und
  // `wert / 2` zweimal die 0 SELBST. Wird sie angenommen, meldet der Durchgang
  // „geprüft“ für ein Feld, das sich nie bewegt hat. `wettbewerbe.phasenStufe`
  // stand genau so in der Liste.
  it("kein Feld gilt als geprüft, weil es seine eigene Vorgabe annimmt", () => {
    for (const e of pruefeEinstellbarkeit()) {
      if (e.setzbar !== true) continue;
      expect(JSON.stringify(e.kandidat), `${e.pfad} nimmt nur seine eigene Vorgabe an`)
        .not.toBe(JSON.stringify(e.vorgabe));
    }
  });

  // Die Gegenprobe zum Nachrücker: ein Feld mit einer GRENZE (`phasenStufe`
  // deckelt bei 0.3) nimmt keinen der runden generischen Werte exakt an — es
  // kommt geklemmt an. Das ist ein Beleg, kein Fund, und es muss einer bleiben:
  // sonst stünde die halbe Regler-Landschaft als „nicht setzbar“ da.
  it("ein Wert, der auf seiner Grenze ankommt, zählt als Beleg — nicht als Fund", () => {
    const e = pruefeEinstellbarkeit().find((x) => x.pfad === "wettbewerbe.phasenStufe");
    expect(e.setzbar).toBe(true);
    expect(e.angeboten).toBe(1);
    expect(e.kandidat).toBe(0.3);
  });

  it("ein gesetzter Wert überlebt den Creator-Code — an einem echten Beispiel", () => {
    const r = sanitizeRules({
      ...DEFAULT_RULES,
      eingriffe: {
        ...DEFAULT_RULES.eingriffe,
        sperrfrist: { standard: { spieltage: 4, aufschlag: 2, hoechstens: 8 } },
      },
    });
    const zurueck = sanitizeRules(decodePreset(encodePreset(r)));
    expect(zurueck.eingriffe.sperrfrist.standard).toEqual({ spieltage: 4, aufschlag: 2, hoechstens: 8 });
  });
});
