import { describe, it, expect } from "vitest";
import {
  DEFAULT_TIPPFENSTER, TIPPFENSTER_LIMITS, VORLAUF_STUFEN,
  sanitizeTippfenster, tippStatus, istTippbar, tippbareSpiele,
  naechsteOeffnung, uebersicht, oeffnetAm, formatDauer, beschreibeTippfenster,
} from "@/lib/tippfenster";
import { DEFAULT_RULES, sanitizeRules, encodePreset, decodePreset } from "@/lib/engine";

const STD = 3600_000;
const JETZT = new Date("2026-08-28T12:00:00Z").getTime();
const spiel = (id, stundenBisAnpfiff) => ({
  id, matchId: id, kickoff: new Date(JETZT + stundenBisAnpfiff * STD).toISOString(),
});

// 48-Stunden-Vorlauf macht die Rechnung im Test lesbar.
const RULES = sanitizeRules({ ...DEFAULT_RULES, tippfenster: { vorlaufStunden: 48 } });

describe("Bereinigung", () => {
  it("Unsinn wird auf den Standard zurückgeholt", () => {
    expect(sanitizeTippfenster({ vorlaufStunden: "bald" })).toEqual(DEFAULT_TIPPFENSTER);
    expect(sanitizeTippfenster()).toEqual(DEFAULT_TIPPFENSTER);
  });

  it("Werte werden auf die Grenzen beschnitten", () => {
    expect(sanitizeTippfenster({ vorlaufStunden: 0 }).vorlaufStunden).toBe(TIPPFENSTER_LIMITS.vorlaufStunden.min);
    expect(sanitizeTippfenster({ vorlaufStunden: 9999 }).vorlaufStunden).toBe(TIPPFENSTER_LIMITS.vorlaufStunden.max);
  });

  it("die Vorauswahl-Stufen sind gültige Werte", () => {
    for (const s of VORLAUF_STUFEN) {
      expect(sanitizeTippfenster({ vorlaufStunden: s.stunden }).vorlaufStunden).toBe(s.stunden);
      expect(s.label && s.hint).toBeTruthy();
    }
  });
});

describe("Die zwei Kanten des Fensters", () => {
  it("vor der Öffnung: zu — und es sagt, ab wann", () => {
    const s = tippStatus(spiel("m", 72), RULES, JETZT);   // 72 h hin, Fenster 48 h
    expect(s.offen).toBe(false);
    expect(s.zustand).toBe("zu");
    expect(s.text).toContain("tippbar ab");
  });

  it("im Fenster: offen — und es sagt, wie lange noch", () => {
    const s = tippStatus(spiel("m", 5), RULES, JETZT);
    expect(s.offen).toBe(true);
    expect(s.zustand).toBe("offen");
    expect(s.text).toContain("5 Std.");
  });

  it("ab Anpfiff: vorbei", () => {
    expect(tippStatus(spiel("m", 0), RULES, JETZT).zustand).toBe("vorbei");
    expect(tippStatus(spiel("m", -1), RULES, JETZT).zustand).toBe("vorbei");
  });

  it("die Öffnung liegt genau `vorlaufStunden` vor dem Anpfiff", () => {
    const m = spiel("m", 100);
    expect(oeffnetAm(m, RULES)).toBe(new Date(m.kickoff).getTime() - 48 * STD);
  });

  it("genau auf der Kante ist offen, nicht zu", () => {
    // 48 h vorher: das Fenster geht in DIESEM Moment auf.
    expect(istTippbar(spiel("m", 48), RULES, JETZT)).toBe(true);
    expect(istTippbar(spiel("m", 48.1), RULES, JETZT)).toBe(false);
  });

  it("ohne verwertbaren Anpfiff gilt: ZU", () => {
    // Im Zweifel gesperrt — ein versehentlich offenes Spiel lässt sich nicht
    // zurücknehmen, ein versehentlich gesperrtes schon.
    expect(istTippbar({ id: "x" }, RULES, JETZT)).toBe(false);
    expect(tippStatus({ id: "x" }, RULES, JETZT).zustand).toBe("unbekannt");
  });
});

describe("Der Vorlauf ist eine Admin-Entscheidung", () => {
  it("ein längerer Vorlauf öffnet mehr Spiele", () => {
    const plan = [spiel("a", 5), spiel("b", 40), spiel("c", 100), spiel("d", 300)];
    const kurz = sanitizeRules({ ...DEFAULT_RULES, tippfenster: { vorlaufStunden: 24 } });
    const lang = sanitizeRules({ ...DEFAULT_RULES, tippfenster: { vorlaufStunden: 336 } });
    expect(tippbareSpiele(plan, kurz, JETZT).map((m) => m.id)).toEqual(["a"]);
    expect(tippbareSpiele(plan, lang, JETZT).map((m) => m.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("Die Liste, die der Spieler sehen will", () => {
  const plan = [spiel("spaet", 40), spiel("gleich", 2), spiel("mittel", 20), spiel("fern", 500), spiel("durch", -3)];

  it("nur die tippbaren, das dringendste zuerst", () => {
    expect(tippbareSpiele(plan, RULES, JETZT).map((m) => m.id)).toEqual(["gleich", "mittel", "spaet"]);
  });

  it("zählt ehrlich, was noch kommt — statt es wortlos wegzulassen", () => {
    const u = uebersicht(plan, RULES, JETZT);
    expect(u.offen).toBe(3);
    expect(u.zu).toBe(1);
    expect(u.vorbei).toBe(1);
  });

  it("sagt, wann es weitergeht, wenn gerade nichts offen ist", () => {
    const nurFern = [spiel("f1", 500), spiel("f2", 200)];
    expect(tippbareSpiele(nurFern, RULES, JETZT)).toEqual([]);
    const naechste = naechsteOeffnung(nurFern, RULES, JETZT);
    expect(naechste.match.id).toBe("f2");           // das nähere öffnet zuerst
    expect(naechste.oeffnetAm).toBe(new Date(nurFern[1].kickoff).getTime() - 48 * STD);
  });

  it("ohne kommende Spiele gibt es nichts anzukündigen", () => {
    expect(naechsteOeffnung([spiel("weg", -5)], RULES, JETZT)).toBeNull();
  });
});

describe("Texte", () => {
  it("Dauer wird grob, aber lesbar", () => {
    expect(formatDauer(30 * 60000)).toBe("30 Min.");
    expect(formatDauer(5 * STD)).toBe("5 Std.");
    expect(formatDauer(72 * STD)).toBe("3 Tage");
  });

  it("das Fenster beschreibt sich in einem Satz", () => {
    expect(beschreibeTippfenster(RULES)).toContain("2 Tage");
    expect(beschreibeTippfenster(RULES)).toContain("Anpfiff");
  });
});

describe("Im Regelwerk und im Creator-Code", () => {
  it("ist Teil des Regelwerks", () => {
    expect(DEFAULT_RULES.tippfenster).toEqual(DEFAULT_TIPPFENSTER);
  });

  it("übersteht encode → decode → sanitize", () => {
    expect(sanitizeRules(decodePreset(encodePreset(RULES)))).toEqual(RULES);
  });
});
