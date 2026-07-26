import { describe, it, expect } from "vitest";
import {
  DEFAULT_NOTIFY, sanitizeNotify, inRuhezeit, dueNotifications, summarize,
  VORLAUF_OPTIONEN, NOTIFY_LIMITS,
} from "@/lib/notify";

const H = 3600000;
const JETZT = new Date("2026-08-27T12:00:00").getTime(); // Donnerstag, mittags

const spiel = (id, stundenBisAnpfiff, matchday = 1) => ({
  id, matchday, home: "A", away: "B",
  kickoff: new Date(JETZT + stundenBisAnpfiff * H).toISOString(),
});

const AN = { ...DEFAULT_NOTIFY, enabled: true };

describe("Standard ist zurückhaltend", () => {
  it("ist ausgeschaltet, bis der Nutzer zustimmt", () => {
    expect(DEFAULT_NOTIFY.enabled).toBe(false);
    expect(dueNotifications({ matches: [spiel("m1", 2)], userId: "u" })).toEqual([]);
  });

  it("hat eine Nachtruhe und eine Tagesobergrenze", () => {
    expect(DEFAULT_NOTIFY.ruhezeit.von).toBeGreaterThan(DEFAULT_NOTIFY.ruhezeit.bis);
    expect(DEFAULT_NOTIFY.maxProTag).toBeLessThanOrEqual(5);
  });
});

describe("sanitizeNotify", () => {
  it("beschneidet Unfug", () => {
    const p = sanitizeNotify({ enabled: "ja", vorlaufStunden: [99, 3, 3], maxProTag: 999, ruhezeit: { von: 40, bis: -2 } });
    expect(p.enabled).toBe(false);
    expect(p.vorlaufStunden).toEqual([3]);           // 99 raus, Dublette weg
    expect(p.maxProTag).toBe(NOTIFY_LIMITS.maxProTag.max);
    expect(p.ruhezeit.von).toBeLessThanOrEqual(23);
    expect(p.ruhezeit.bis).toBeGreaterThanOrEqual(0);
  });

  it("leere Vorlaufliste fällt auf den Standard zurück", () => {
    expect(sanitizeNotify({ vorlaufStunden: [] }).vorlaufStunden).toEqual(DEFAULT_NOTIFY.vorlaufStunden);
  });

  it("alle Vorlauf-Optionen sind gültig", () => {
    const p = sanitizeNotify({ vorlaufStunden: VORLAUF_OPTIONEN });
    expect(p.vorlaufStunden).toHaveLength(VORLAUF_OPTIONEN.length);
  });
});

// „Spieltag 1" gibt es seit den fünf Wettbewerben fünfmal. Ohne den Wettbewerb
// im Schlüssel fielen sie zu EINEM Spieltag zusammen — die Meldung käme nur
// einmal, und ein getipptes Bundesligaspiel unterdrückte den Hinweis auf die
// Premier League.
describe("Neuer Spieltag: je Wettbewerb, nicht quer über alle", () => {
  const prefs = { ...AN, erinnerung: false };
  const inLiga = (id, w) => ({ ...spiel(id, 48, 1), wettbewerb: w });

  it("meldet jeden Wettbewerb einzeln", () => {
    const faellig = dueNotifications({
      matches: [inLiga("bl1", "bl"), inLiga("pl1", "pl"), inLiga("sa1", "sa")],
      userId: "u", prefs, jetzt: JETZT,
    });
    expect(faellig).toHaveLength(3);
    expect(faellig.map((f) => f.key).sort())
      .toEqual(["spieltag:bl:1", "spieltag:pl:1", "spieltag:sa:1"]);
  });

  it("nennt den Wettbewerb im Titel — die nackte Spieltags-Zahl wäre nicht zuzuordnen", () => {
    const [erste] = dueNotifications({ matches: [inLiga("bl1", "bl")], userId: "u", prefs, jetzt: JETZT });
    expect(erste.titel).toContain("Bundesliga");
    expect(erste.titel).toContain("Spieltag 1");
  });

  it("ein getippter Bundesliga-Spieltag unterdrückt die Premier League NICHT", () => {
    const tips = [{ match_id: "bl1", user_id: "u" }];
    const faellig = dueNotifications({
      matches: [inLiga("bl1", "bl"), inLiga("pl1", "pl")],
      tips, userId: "u", prefs, jetzt: JETZT,
    });
    expect(faellig.map((f) => f.key)).toEqual(["spieltag:pl:1"]);
  });

  it("Matches ohne Wettbewerb bleiben gültig (Altdaten fallen auf die Bundesliga)", () => {
    const [erste] = dueNotifications({ matches: [spiel("alt", 48, 1)], userId: "u", prefs, jetzt: JETZT });
    expect(erste.key).toBe("spieltag:bl:1");
  });
});

describe("Ruhezeit", () => {
  it("erkennt ein Fenster über Mitternacht", () => {
    const r = { von: 22, bis: 8 };
    expect(inRuhezeit(new Date("2026-08-27T23:30:00"), r)).toBe(true);
    expect(inRuhezeit(new Date("2026-08-27T03:00:00"), r)).toBe(true);
    expect(inRuhezeit(new Date("2026-08-27T12:00:00"), r)).toBe(false);
  });

  it("nachts wird nichts zugestellt", () => {
    const nachts = new Date("2026-08-27T23:00:00").getTime();
    const faellig = dueNotifications({ matches: [spiel("m1", 2)], userId: "u", prefs: AN, jetzt: nachts });
    expect(faellig).toEqual([]);
  });
});

describe("Erinnerung vor Anpfiff", () => {
  it("meldet erst, wenn die Vorwarnzeit erreicht ist", () => {
    const prefs = { ...AN, neuerSpieltag: false, vorlaufStunden: [3] };
    const zuFrueh = dueNotifications({ matches: [spiel("m1", 10)], userId: "u", prefs, jetzt: JETZT });
    expect(zuFrueh).toEqual([]);
    const jetztFaellig = dueNotifications({ matches: [spiel("m1", 2)], userId: "u", prefs, jetzt: JETZT });
    expect(jetztFaellig).toHaveLength(1);
    expect(jetztFaellig[0].art).toBe("erinnerung");
  });

  it("schweigt für Spiele, die ich schon getippt habe", () => {
    const prefs = { ...AN, neuerSpieltag: false, vorlaufStunden: [3] };
    const tips = [{ match_id: "m1", user_id: "u" }];
    expect(dueNotifications({ matches: [spiel("m1", 2)], tips, userId: "u", prefs, jetzt: JETZT })).toEqual([]);
  });

  it("meldet nicht mehr, wenn der Anpfiff vorbei ist", () => {
    const prefs = { ...AN, neuerSpieltag: false };
    expect(dueNotifications({ matches: [spiel("m1", -1)], userId: "u", prefs, jetzt: JETZT })).toEqual([]);
  });

  it("stellt dieselbe Stufe kein zweites Mal zu", () => {
    const prefs = { ...AN, neuerSpieltag: false, vorlaufStunden: [3] };
    const erste = dueNotifications({ matches: [spiel("m1", 2)], userId: "u", prefs, jetzt: JETZT });
    const zweite = dueNotifications({ matches: [spiel("m1", 2)], userId: "u", prefs, jetzt: JETZT, gesehen: erste });
    expect(zweite).toEqual([]);
  });

  it("mehrere Vorwarnstufen greifen nacheinander", () => {
    const prefs = { ...AN, neuerSpieltag: false, vorlaufStunden: [24, 3] };
    const frueh = dueNotifications({ matches: [spiel("m1", 20)], userId: "u", prefs, jetzt: JETZT });
    expect(frueh[0].stunden).toBe(24);
    const spaet = dueNotifications({ matches: [spiel("m1", 2)], userId: "u", prefs, jetzt: JETZT, gesehen: frueh });
    expect(spaet[0].stunden).toBe(3);
  });
});

describe("Neuer Spieltag", () => {
  it("meldet einen komplett offenen, ungetippten Spieltag", () => {
    const prefs = { ...AN, erinnerung: false };
    const matches = [spiel("m1", 48, 2), spiel("m2", 50, 2)];
    const f = dueNotifications({ matches, userId: "u", prefs, jetzt: JETZT });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ art: "neuerSpieltag", matchday: 2 });
  });

  it("schweigt, sobald ich in dem Spieltag schon getippt habe", () => {
    const prefs = { ...AN, erinnerung: false };
    const matches = [spiel("m1", 48, 2), spiel("m2", 50, 2)];
    const tips = [{ match_id: "m1", user_id: "u" }];
    expect(dueNotifications({ matches, tips, userId: "u", prefs, jetzt: JETZT })).toEqual([]);
  });

  it("meldet einen bereits laufenden Spieltag nicht mehr als „neu“", () => {
    const prefs = { ...AN, erinnerung: false };
    const matches = [spiel("m1", -2, 2), spiel("m2", 50, 2)];
    expect(dueNotifications({ matches, userId: "u", prefs, jetzt: JETZT })).toEqual([]);
  });
});

describe("Nie Dauerfeuer", () => {
  it("hält die Tagesobergrenze ein und meldet das Dringendste zuerst", () => {
    const prefs = { ...AN, neuerSpieltag: false, vorlaufStunden: [24, 3, 1], maxProTag: 2 };
    const matches = [spiel("m1", 20), spiel("m2", 2), spiel("m3", 0.5)];
    const f = dueNotifications({ matches, userId: "u", prefs, jetzt: JETZT });
    expect(f).toHaveLength(2);
    expect(f[0].stunden).toBeLessThanOrEqual(f[1].stunden);
  });

  it("abgeschaltete Kanäle liefern nichts", () => {
    const prefs = { ...AN, neuerSpieltag: false, erinnerung: false };
    expect(dueNotifications({ matches: [spiel("m1", 2)], userId: "u", prefs, jetzt: JETZT })).toEqual([]);
  });
});

describe("summarize", () => {
  it("sagt im Klartext, was ankommt", () => {
    expect(summarize(DEFAULT_NOTIFY)).toContain("Aus");
    const text = summarize({ ...AN, vorlaufStunden: [24, 3] });
    expect(text).toContain("24");
    expect(text).toContain("Ruhe");
  });

  it("warnt, wenn alles abgewählt ist", () => {
    expect(summarize({ ...AN, neuerSpieltag: false, erinnerung: false })).toContain("Nichts");
  });
});
