import { describe, it, expect } from "vitest";
import { CHARAKTERE, CHARAKTER, merkmale } from "@/lib/charaktere";
import { sanitizeRules, encodePreset, decodePreset, DEFAULT_RULES } from "@/lib/engine";
import { simulateBalance } from "@/lib/balanceSim";

describe("Katalog", () => {
  it("jeder Charakter ist vollständig beschrieben", () => {
    for (const c of CHARAKTERE) {
      expect(c.key && c.label && c.tagline && c.desc && c.emoji && c.fuer).toBeTruthy();
      expect(c.rules).toBeTruthy();
    }
  });

  it("Schlüssel sind eindeutig", () => {
    const keys = CHARAKTERE.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("der Name des Regelwerks entspricht dem Charakter", () => {
    for (const c of CHARAKTERE) expect(c.rules.name).toBe(c.label);
  });

  it("es gibt genug Auswahl, aber keine Überforderung", () => {
    expect(CHARAKTERE.length).toBeGreaterThanOrEqual(3);
    expect(CHARAKTERE.length).toBeLessThanOrEqual(5);
  });
});

describe("Jeder Charakter ist ein gültiges Regelwerk", () => {
  it("übersteht sanitizeRules unverändert", () => {
    for (const c of CHARAKTERE) {
      expect(sanitizeRules(c.rules)).toEqual(c.rules);
    }
  });

  it("reist vollständig durch einen Creator-Code", () => {
    for (const c of CHARAKTERE) {
      const zurueck = sanitizeRules(decodePreset(encodePreset(c.rules)));
      expect(zurueck).toEqual(c.rules);
      // Die Zusatzebenen müssen mitreisen, nicht nur die Grundregeln.
      expect(zurueck.saison.enabled).toBe(c.rules.saison.enabled);
      expect(zurueck.joker.enabled).toBe(c.rules.joker.enabled);
    }
  });
});

describe("Die Charaktere unterscheiden sich wirklich", () => {
  it("keine zwei sind regeltechnisch identisch", () => {
    const ohneNamen = CHARAKTERE.map((c) => JSON.stringify({ ...c.rules, name: null }));
    expect(new Set(ohneNamen).size).toBe(CHARAKTERE.length);
  });

  it("sie decken verschiedene Joker-Zustände ab", () => {
    const zustaende = CHARAKTERE.map((c) =>
      !c.rules.joker.enabled ? "aus" : c.rules.joker.modus
    );
    expect(new Set(zustaende).size).toBeGreaterThanOrEqual(2);
  });

  // 🔴 Baukasten-Grundsatz: eine Spielart, die nur die Profi-Ansicht kennt,
  // ist nicht fertig. Der Wettmodus war genau das — bis hierher hat ihn kein
  // einziger Charakter gesetzt. Dieser Test hält den Zustand fest.
  it("mindestens einer spielt im Wettmodus, samt gesetztem Münz-Takt", () => {
    const wett = CHARAKTERE.filter((c) => c.rules.joker.enabled && c.rules.joker.modus === "einsatz");
    expect(wett.length).toBeGreaterThanOrEqual(1);
    for (const c of wett) {
      // Der Takt muss MITGESETZT sein — ein Charakter ist eine ganze
      // Runden-Idee, keine halbe.
      expect(c.rules.joker.einsatzTakt).toBeTruthy();
      expect(c.rules.joker.einsatzProSpieltag).toBeGreaterThan(0);
      expect(merkmale(c)).toContain("Münzen verteilen");
    }
  });

  it("mindestens einer kommt ganz ohne Joker aus", () => {
    expect(CHARAKTERE.some((c) => !c.rules.joker.enabled)).toBe(true);
  });

  it("mindestens einer bietet Saison-Wetten, mindestens einer ist mild", () => {
    expect(CHARAKTERE.some((c) => c.rules.saison.enabled)).toBe(true);
    expect(CHARAKTERE.some((c) => c.rules.versaeumnis.enabled)).toBe(true);
  });
});

describe("merkmale — Alltagssprache statt Regelnamen", () => {
  it("nennt für jeden Charakter mindestens zwei Merkmale", () => {
    for (const c of CHARAKTERE) expect(merkmale(c).length).toBeGreaterThanOrEqual(2);
  });

  it("sagt „ohne Joker“, wenn keiner an ist", () => {
    const ohne = CHARAKTERE.find((c) => !c.rules.joker.enabled);
    expect(merkmale(ohne)).toContain("ohne Joker");
  });

  it("nennt die passiven Joker-Arten, wenn sie an sind", () => {
    const mutig = CHARAKTER.mutig;
    expect(merkmale(mutig)).toContain("Heimatbonus");
    expect(merkmale(mutig)).toContain("Mut-Bonus");
  });

  it("verträgt Unfug", () => {
    expect(merkmale(null)).toEqual([]);
    expect(merkmale({})).toEqual([]);
  });
});

// ⛔ STILLGELEGT (Andi, 07.08.2026): Balancing ist Endphase — siehe ganz oben
// in `CLAUDE.md` und den Kopf von `vitest.config.mjs`. Der Rest dieser Datei
// (Stufen-Abdeckung der Charaktere) läuft weiter, deshalb `describe.skip` statt
// eines Datei-Ausschlusses.
// ▶️ Wieder anschalten: `describe.skip` → `describe`.
describe.skip("Schnelltest Balance: der Kenner gewinnt bei jedem Charakter", () => {
  // Bewusst nur ein STRUKTURELLER Test — gewinnt der Kenner überhaupt noch?
  // Die Feinjustierung der Werte passiert gebündelt im Abschluss-Durchgang
  // (siehe design/roadmap.md), nicht bei jeder Änderung neu.
  for (const c of CHARAKTERE) {
    it(`„${c.label}“ lässt nicht den Zocker gewinnen`, () => {
      const s = simulateBalance(c.rules, { seasons: 40, seed: 20260725 });
      expect(s.kennerQuote).toBeGreaterThan(s.zockerQuote);
    });
  }
});
