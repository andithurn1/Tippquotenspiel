import { describe, it, expect } from "vitest";
import {
  sanitizeFreigabe, istFreigeschaltet, freigabeStatus, sanitizeSaison, SAISON_LIMITS,
} from "@/lib/saisonwetten";
import { DEFAULT_RULES, sanitizeRules, encodePreset, decodePreset } from "@/lib/engine";

describe("Freigabe-Fenster säubern", () => {
  it("ohne abSpieltag gibt es kein Fenster", () => {
    expect(sanitizeFreigabe({})).toEqual({ abSpieltag: null, bisSpieltag: null });
    expect(sanitizeFreigabe({ bisSpieltag: 12 })).toEqual({ abSpieltag: null, bisSpieltag: null });
  });

  it("ohne bisSpieltag ist das Fenster GENAU ein Spieltag", () => {
    // Der entscheidende Punkt: eine Freigabe ohne Frist wäre unfair, weil wer
    // später tippt mehr weiß — bei gleicher Punktzahl.
    expect(sanitizeFreigabe({ abSpieltag: 8 })).toEqual({ abSpieltag: 8, bisSpieltag: 8 });
  });

  it("ein zu frühes Ende wird auf den Start gezogen, nicht verworfen", () => {
    expect(sanitizeFreigabe({ abSpieltag: 10, bisSpieltag: 3 })).toEqual({ abSpieltag: 10, bisSpieltag: 10 });
  });

  it("Werte werden auf die Grenzen beschnitten", () => {
    expect(sanitizeFreigabe({ abSpieltag: 0 }).abSpieltag).toBe(SAISON_LIMITS.spieltag.min);
    expect(sanitizeFreigabe({ abSpieltag: 99 }).abSpieltag).toBe(SAISON_LIMITS.spieltag.max);
    expect(sanitizeFreigabe({ abSpieltag: "quatsch" }).abSpieltag).toBeNull();
  });
});

describe("Ist die Wette abgebbar?", () => {
  const wette = { key: "meister", abSpieltag: 8, bisSpieltag: 10 };

  it("vor dem Fenster: nein", () => {
    expect(istFreigeschaltet(wette, 7)).toBe(false);
  });

  it("im Fenster: ja", () => {
    for (const md of [8, 9, 10]) expect(istFreigeschaltet(wette, md)).toBe(true);
  });

  it("nach dem Fenster: nein — die Frist ist vorbei", () => {
    expect(istFreigeschaltet(wette, 11)).toBe(false);
  });

  it("ohne Fenster jederzeit", () => {
    expect(istFreigeschaltet({ key: "meister" }, 1)).toBe(true);
    expect(istFreigeschaltet({ key: "meister" }, 34)).toBe(true);
  });

  it("unbekannter Stand hält die Wette ZU, nicht offen", () => {
    // Im Zweifel gesperrt: eine versehentlich offene Wette lässt sich nicht
    // zurücknehmen, eine versehentlich gesperrte schon.
    expect(istFreigeschaltet(wette, null)).toBe(false);
    expect(istFreigeschaltet(wette, undefined)).toBe(false);
  });
});

describe("Der Stand richtet sich nach dem WETTBEWERB der Wette", () => {
  // Eine CL-Wette hängt am CL-Spieltag, nicht am Bundesliga-Spieltag — sonst
  // öffnete die CL-Wette, während die Ligaphase noch gar nicht läuft.
  const clWette = { key: "meister", wettbewerb: "cl", abSpieltag: 6, bisSpieltag: 8 };
  const stand = { bl: 20, cl: 3 };

  it("nimmt den Spieltag des eigenen Wettbewerbs", () => {
    expect(istFreigeschaltet(clWette, stand)).toBe(false);       // CL erst bei 3
    expect(istFreigeschaltet(clWette, { ...stand, cl: 7 })).toBe(true);
  });

  it("fällt auf `default` zurück, wenn der Wettbewerb im Stand fehlt", () => {
    expect(istFreigeschaltet(clWette, { bl: 20, default: 7 })).toBe(true);
  });
});

describe("Zustand in Worten", () => {
  const wette = { key: "meister", abSpieltag: 8, bisSpieltag: 10 };

  it("sagt, WANN es losgeht — nicht nur „gesperrt“", () => {
    const s = freigabeStatus(wette, 5);
    expect(s.offen).toBe(false);
    expect(s.zustand).toBe("noch-zu");
    expect(s.text).toContain("8");
  });

  it("sagt, wie lange noch", () => {
    expect(freigabeStatus(wette, 8).text).toContain("2");
    expect(freigabeStatus(wette, 10).text).toContain("letzter");
  });

  it("sagt, wenn die Frist vorbei ist", () => {
    const s = freigabeStatus(wette, 12);
    expect(s.offen).toBe(false);
    expect(s.zustand).toBe("vorbei");
    expect(s.text).toContain("10");
  });

  it("ohne Fenster: jederzeit", () => {
    expect(freigabeStatus({ key: "meister" }, 5)).toMatchObject({ offen: true, zustand: "immer" });
  });
});

describe("Im Regelwerk und im Creator-Code", () => {
  it("die Freigabe übersteht encode → decode → sanitize", () => {
    const rules = sanitizeRules({
      ...DEFAULT_RULES,
      saison: {
        enabled: true, gewicht: 1,
        wetten: [{ key: "meister", punkte: 500, wettbewerb: "cl", abSpieltag: 6, bisSpieltag: 8 }],
      },
    });
    expect(rules.saison.wetten[0]).toMatchObject({
      key: "meister", wettbewerb: "cl", abSpieltag: 6, bisSpieltag: 8,
    });
    expect(sanitizeRules(decodePreset(encodePreset(rules)))).toEqual(rules);
  });

  it("Wetten ohne Fenster bleiben klein — keine Null-Felder im Code", () => {
    const s = sanitizeSaison({ enabled: true, wetten: [{ key: "meister", punkte: 500 }] });
    expect(s.wetten[0]).toEqual({ key: "meister", punkte: 500 });
    expect("abSpieltag" in s.wetten[0]).toBe(false);
  });
});
