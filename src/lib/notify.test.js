import { describe, it, expect } from "vitest";
import {
  DEFAULT_NOTIFY, sanitizeNotify, inRuhezeit, dueNotifications, summarize,
  VORLAUF_OPTIONEN, NOTIFY_LIMITS, KANAELE, KANAL_META,
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
    // ⚠️ Über KANAELE statt über eine Aufzählung: als ZP5 drei Arten ergänzte,
    // schlug dieser Test an, weil er nur die zwei alten abwählte — und das war
    // ein echter Fund, kein Testproblem. So bleibt er beim nächsten Kanal heil.
    const alleAus = Object.fromEntries(KANAELE.map((k) => [k, false]));
    expect(summarize({ ...AN, ...alleAus })).toContain("Nichts");
  });
});

// 🔴 ZP5 (Andi, 25.08.2026): jeder Benachrichtigungstyp einzeln an- und
// abwählbar. Der alte Vorbehalt — „bei zwei Arten wäre das Untermenü fast
// leer" — ist mit diesen drei entfallen.
describe("Die drei neuen Arten (ZP5)", () => {
  const AN_ALLE = { ...DEFAULT_NOTIFY, enabled: true, ueberholt: true };
  const MITTAG = new Date("2026-08-28T12:00:00Z").getTime();
  const SPIEL = { id: "m1", home: "Bochum", away: "Osnabrück", matchday: 3,
    wettbewerb: "bl2", kickoff: new Date(MITTAG + 50 * H).toISOString() };

  it("Sperre: kommt an, und nur beim BETROFFENEN", () => {
    const eingriffe = [
      { aufUserId: "ich", vonUserId: "kemal", vonName: "Kemal", matchId: "m1" },
      { aufUserId: "wer-anders", vonUserId: "ich", matchId: "m1" },
    ];
    const out = dueNotifications({ matches: [SPIEL], userId: "ich", prefs: AN_ALLE, jetzt: MITTAG, eingriffe });
    const g = out.filter((n) => n.art === "geblockt");
    expect(g).toHaveLength(1);
    expect(g[0].titel).toContain("Bochum");
    expect(g[0].text).toContain("Kemal");
  });

  // 🔴 Der Grund, warum die Sperre `stunden: -1` trägt: sie betrifft eine
  // FRIST. Wer nicht weiß, dass sein Spiel gesperrt ist, steht kurz vor
  // Anpfiff vor einem grauen Knopf. Sie darf nicht als Erste aus der
  // Tages-Obergrenze fallen.
  it("Sperre steht ganz vorn, auch bei knapper Obergrenze", () => {
    const viele = Array.from({ length: 6 }, (_, i) => ({
      id: `x${i}`, home: `A${i}`, away: `B${i}`, matchday: 3, wettbewerb: "bl2",
      kickoff: new Date(MITTAG + 2 * H).toISOString(),
    }));
    const out = dueNotifications({
      matches: [...viele, SPIEL], userId: "ich",
      prefs: { ...AN_ALLE, maxProTag: 2 }, jetzt: MITTAG,
      eingriffe: [{ aufUserId: "ich", vonUserId: "k", vonName: "Kemal", matchId: "m1" }],
    });
    expect(out[0].art).toBe("geblockt");
  });

  it("Abrechnung: einmal je Wettbewerb und Spieltag", () => {
    const out = dueNotifications({
      matches: [SPIEL], userId: "ich", prefs: AN_ALLE, jetzt: MITTAG,
      abrechnungen: [{ wettbewerb: "bl2", matchday: 3, punkte: 412.4 }],
    });
    const a = out.filter((n) => n.art === "abgerechnet");
    expect(a).toHaveLength(1);
    expect(a[0].text).toContain("412");
  });

  it("Überholt kommt nur, wenn eingeschaltet — Vorgabe ist AUS", () => {
    expect(DEFAULT_NOTIFY.ueberholt).toBe(false);
    const args = {
      matches: [SPIEL], userId: "ich", jetzt: MITTAG,
      ueberholungen: [{ name: "Kemal", vonUserId: "k", rang: 4 }],
    };
    const aus = dueNotifications({ ...args, prefs: { ...DEFAULT_NOTIFY, enabled: true } });
    expect(aus.some((n) => n.art === "ueberholt")).toBe(false);
    const an = dueNotifications({ ...args, prefs: AN_ALLE });
    expect(an.some((n) => n.art === "ueberholt")).toBe(true);
  });

  // ⚠️ `ueberholt: false` als Vorgabe heißt: `sanitizeNotify` darf aus
  // „nicht gesetzt" kein „an" machen. Bei den anderen ist es umgekehrt.
  it("sanitize dreht die Vorgabe nicht um", () => {
    expect(sanitizeNotify({}).ueberholt).toBe(false);
    expect(sanitizeNotify({ ueberholt: true }).ueberholt).toBe(true);
    expect(sanitizeNotify({}).geblockt).toBe(true);
    expect(sanitizeNotify({ geblockt: false }).geblockt).toBe(false);
  });

  it("jede Art hat Titel und Hinweis im Untermenü", () => {
    for (const k of KANAELE) {
      expect(KANAL_META[k]?.title, k).toBeTruthy();
      expect(KANAL_META[k]?.hint?.length ?? 0, k).toBeGreaterThan(20);
    }
  });

  it("nichts kommt doppelt, was schon gesehen wurde", () => {
    const args = {
      matches: [SPIEL], userId: "ich", prefs: AN_ALLE, jetzt: MITTAG,
      eingriffe: [{ aufUserId: "ich", vonUserId: "k", vonName: "Kemal", matchId: "m1" }],
      abrechnungen: [{ wettbewerb: "bl2", matchday: 3, punkte: 10 }],
    };
    const erst = dueNotifications(args);
    const zweit = dueNotifications({ ...args, gesehen: erst.map((n) => ({ key: n.key })) });
    expect(zweit.some((n) => ["geblockt", "abgerechnet"].includes(n.art))).toBe(false);
  });
});
