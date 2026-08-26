import { describe, it, expect } from "vitest";
import { createMockOddsSource, DEFAULT_RULES, scoreTip, sanitizeRules } from "@/lib/engine";
import {
  buildAutoTip, missingMatches, autoTipsFor,
  sanitizeVersaeumnis, malusFaktor, DEFAULT_VERSAEUMNIS,
  VERSAEUMNIS_STRATEGIEN, VERSAEUMNIS_LIMITS,
} from "@/lib/autoTip";
import { likelyScorelines } from "@/lib/nearResults";
import { ergebnisSperre, schuetzenSperre } from "@/lib/favoritenSperre";

const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const RESULT = odds.getResult("JOR-ESP");

describe("buildAutoTip", () => {
  it("tippt den wahrscheinlichsten Endstand", () => {
    const [best] = likelyScorelines(SNAP, DEFAULT_RULES, 1);
    const tip = buildAutoTip(SNAP, DEFAULT_RULES);
    expect(tip.home).toBe(best.home);
    expect(tip.away).toBe(best.away);
    expect(tip.auto).toBe(true);
  });

  it("benennt keinen Schützen für ein Team ohne getipptes Tor", () => {
    const tip = buildAutoTip(SNAP, DEFAULT_RULES);
    if (tip.home === 0) expect(tip.goals.home).toHaveLength(0);
    if (tip.away === 0) expect(tip.goals.away).toHaveLength(0);
  });

  it("nennt jeden Schützen höchstens einmal (nie ein Doppelpack)", () => {
    const tip = buildAutoTip(SNAP, DEFAULT_RULES);
    for (const side of ["home", "away"]) {
      const list = tip.goals[side];
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("setzt weder Joker noch Gewicht (verbraucht kein Kontingent)", () => {
    const tip = buildAutoTip(SNAP, DEFAULT_RULES);
    expect(tip.joker).toBeUndefined();
    expect(tip.gewicht).toBeUndefined();
  });

  it("ohne Torschützen-Markt bleiben die Listen leer", () => {
    const ohneTore = sanitizeRules({
      ...DEFAULT_RULES,
      markets: { result: true, goals: { ...DEFAULT_RULES.markets.goals, enabled: false } },
    });
    const tip = buildAutoTip(SNAP, ohneTore);
    expect(tip.goals.home).toHaveLength(0);
    expect(tip.goals.away).toHaveLength(0);
  });

  it("ohne Snapshot null statt Absturz", () => {
    expect(buildAutoTip(null)).toBeNull();
    expect(buildAutoTip({})).toBeNull();
  });
});

describe("Fairness: Nichtstun darf sich nie lohnen", () => {
  it("der Auto-Tipp ist der zahmste — ein mutiger Tipp zahlt bei Treffer mehr", () => {
    const auto = buildAutoTip(SNAP, DEFAULT_RULES);
    // Mutiger Tipp = das real eingetretene 5:1 (hohe Quote).
    const mutig = { home: 5, away: 1, goals: { home: [], away: [] } };
    const autoBeiTreffer = scoreTip(auto, { home: auto.home, away: auto.away, playerGoals: null }, SNAP, DEFAULT_RULES);
    const mutigBeiTreffer = scoreTip(mutig, { home: 5, away: 1, playerGoals: null }, SNAP, DEFAULT_RULES);
    expect(mutigBeiTreffer.total).toBeGreaterThan(autoBeiTreffer.total);
  });

  it("gegen das echte Ergebnis zahlt der Auto-Tipp weniger als der Volltreffer", () => {
    const auto = buildAutoTip(SNAP, DEFAULT_RULES);
    const treffer = { home: 5, away: 1, goals: { home: [], away: [] } };
    const a = scoreTip(auto, RESULT, SNAP, DEFAULT_RULES).total;
    const t = scoreTip(treffer, RESULT, SNAP, DEFAULT_RULES).total;
    expect(t).toBeGreaterThan(a);
  });

  it("aber er rettet vor der Null — er zahlt mehr als gar kein Tipp", () => {
    const auto = buildAutoTip(SNAP, DEFAULT_RULES);
    expect(scoreTip(auto, RESULT, SNAP, DEFAULT_RULES).total).toBeGreaterThan(0);
  });
});

describe("missingMatches / autoTipsFor", () => {
  const matches = [
    { matchId: "m1", snapshot: SNAP },
    { matchId: "m2", snapshot: SNAP },
    { matchId: "m3", snapshot: SNAP },
  ];
  const tips = [
    { match_id: "m1", user_id: "u-du" },
    { match_id: "m2", user_id: "u-anders" },
  ];
  const AN = { ...DEFAULT_VERSAEUMNIS, enabled: true };

  it("findet nur die Spiele ohne eigenen Tipp", () => {
    const fehlend = missingMatches(matches, tips, "u-du").map((m) => m.matchId);
    expect(fehlend).toEqual(["m2", "m3"]);
  });

  it("erzeugt je Versäumnis einen speicherbaren Eintrag mit eingefrorenem Snapshot", () => {
    const autos = autoTipsFor({ matches, tips, userId: "u-du", rules: DEFAULT_RULES, versaeumnis: AN });
    expect(autos).toHaveLength(2);
    for (const a of autos) {
      expect(a.snapshot).toBe(SNAP);
      expect(a.tip.auto).toBe(true);
      expect(a.malusFaktor).toBeCloseTo(malusFaktor(AN));
    }
  });

  it("wer alles getippt hat, bekommt nichts dazu", () => {
    const alle = matches.map((m) => ({ match_id: m.matchId, user_id: "u-du" }));
    expect(autoTipsFor({ matches, tips: alle, userId: "u-du", versaeumnis: AN })).toEqual([]);
  });

  it("ist die Kulanz ausgeschaltet, gibt es gar nichts (Standard)", () => {
    expect(autoTipsFor({ matches, tips, userId: "u-du" })).toEqual([]);
    expect(autoTipsFor({ matches, tips, userId: "u-du", versaeumnis: DEFAULT_VERSAEUMNIS })).toEqual([]);
  });

  it("aufgebrauchtes Kontingent beendet die Kulanz", () => {
    const v = { ...AN, maxProSaison: 2 };
    expect(autoTipsFor({ matches, tips, userId: "u-du", versaeumnis: v, bisherGenutzt: 1 })).toHaveLength(2);
    expect(autoTipsFor({ matches, tips, userId: "u-du", versaeumnis: v, bisherGenutzt: 2 })).toEqual([]);
  });

  it("maxProSaison = 0 heißt unbegrenzt", () => {
    const v = { ...AN, maxProSaison: 0 };
    expect(autoTipsFor({ matches, tips, userId: "u-du", versaeumnis: v, bisherGenutzt: 99 })).toHaveLength(2);
  });
});

describe("Admin-Einstellung: sanitizeVersaeumnis / Malus", () => {
  it("Standard ist AUS — Nichtstun wird nie automatisch belohnt", () => {
    expect(DEFAULT_VERSAEUMNIS.enabled).toBe(false);
  });

  it("beschneidet Unfug auf gültige Werte", () => {
    const v = sanitizeVersaeumnis({ enabled: "ja", strategie: "hack", malusProzent: 999, maxProSaison: -5 });
    expect(v.enabled).toBe(false);            // nur echtes true zählt
    expect(VERSAEUMNIS_STRATEGIEN).toContain(v.strategie);
    expect(v.malusProzent).toBe(VERSAEUMNIS_LIMITS.malusProzent.max);
    expect(v.maxProSaison).toBe(VERSAEUMNIS_LIMITS.maxProSaison.min);
  });

  it("übernimmt gültige Werte unverändert", () => {
    const v = sanitizeVersaeumnis({ enabled: true, strategie: "zufall", malusProzent: 40, maxProSaison: 5 });
    expect(v).toEqual({ enabled: true, strategie: "zufall", malusProzent: 40, maxProSaison: 5 });
  });

  it("Malus 100 % entwertet den Auto-Tipp komplett, 0 % lässt ihn voll", () => {
    expect(malusFaktor({ malusProzent: 100 })).toBe(0);
    expect(malusFaktor({ malusProzent: 0 })).toBe(1);
  });
});

describe("Strategien", () => {
  const AN = { ...DEFAULT_VERSAEUMNIS, enabled: true };

  it("Schnitt mittelt die Tipps der Mitspieler", () => {
    const fremde = [{ home: 2, away: 0 }, { home: 4, away: 2 }]; // Schnitt 3:1
    const tip = buildAutoTip(SNAP, DEFAULT_RULES, { strategie: "schnitt", fremdeTipps: fremde });
    expect(tip.home).toBe(3);
    expect(tip.away).toBe(1);
  });

  it("Schnitt ohne fremde Tipps fällt aufs wahrscheinlichste Ergebnis zurück", () => {
    const schnitt = buildAutoTip(SNAP, DEFAULT_RULES, { strategie: "schnitt", fremdeTipps: [] });
    const standard = buildAutoTip(SNAP, DEFAULT_RULES);
    expect(schnitt.home).toBe(standard.home);
    expect(schnitt.away).toBe(standard.away);
  });

  it("Zufall ist reproduzierbar (gleicher Seed → gleicher Tipp)", () => {
    const a = buildAutoTip(SNAP, DEFAULT_RULES, { strategie: "zufall", seed: "m1-u-du" });
    const b = buildAutoTip(SNAP, DEFAULT_RULES, { strategie: "zufall", seed: "m1-u-du" });
    expect(a).toEqual(b);
  });

  it("Zufall bleibt im plausiblen Bereich (kein Freilos)", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      const tip = buildAutoTip(SNAP, DEFAULT_RULES, { strategie: "zufall", seed });
      const punkte = scoreTip(tip, { home: tip.home, away: tip.away, playerGoals: null }, SNAP, DEFAULT_RULES).total;
      const mutig = scoreTip({ home: 5, away: 1, goals: { home: [], away: [] } }, { home: 5, away: 1, playerGoals: null }, SNAP, DEFAULT_RULES).total;
      expect(punkte).toBeLessThan(mutig); // nie besser als ein mutiger eigener Treffer
    }
  });

  it("die Strategie kommt aus dem Regelwerk der Runde", () => {
    const matches = [{ matchId: "m1", snapshot: SNAP }];
    const tips = [{ match_id: "m1", user_id: "u-anders", tip: { home: 4, away: 2 } }];
    const autos = autoTipsFor({
      matches, tips, userId: "u-du", rules: DEFAULT_RULES,
      versaeumnis: { ...AN, strategie: "schnitt" },
    });
    expect(autos[0].tip.home).toBe(4);
    expect(autos[0].tip.away).toBe(2);
  });
});

// ── Modus proSpiel ──────────────────────────────────────────
// Ohne Unterscheidung benennte der Ersatz-Tipp doppelt so viele Schützen wie
// erlaubt — und er soll der zahmste sein, nicht der großzügigste.
describe("autoTip im Torschützen-Modus proSpiel", () => {
  const snap = createMockOddsSource().getSnapshot("JOR-ESP");

  const regeln = (goals) => sanitizeRules({ markets: { result: true, goals } });

  it("hält sich an picksProSpiel statt an picksPerTeam", () => {
    const r = regeln({ enabled: true, modus: "proSpiel", picksProSpiel: 2, picksPerTeam: 3 });
    const t = buildAutoTip(snap, r, { strategie: "wahrscheinlich" });
    const gesamt = t.goals.home.length + t.goals.away.length;
    expect(gesamt).toBeLessThanOrEqual(2);
  });

  it("benennt weiterhin nie mehr Schützen als das Ergebnis Tore hergibt", () => {
    const r = regeln({ enabled: true, modus: "proSpiel", picksProSpiel: 6 });
    const t = buildAutoTip(snap, r, { strategie: "wahrscheinlich" });
    expect(t.goals.home.length).toBeLessThanOrEqual(t.home);
    expect(t.goals.away.length).toBeLessThanOrEqual(t.away);
  });

  it("proTeam bleibt unverändert — zwei je Mannschaft sind vier im Spiel", () => {
    const r = regeln({ enabled: true, modus: "proTeam", picksPerTeam: 2 });
    const t = buildAutoTip(snap, r, { strategie: "wahrscheinlich" });
    expect(t.goals.home.length).toBeLessThanOrEqual(2);
    expect(t.goals.away.length).toBeLessThanOrEqual(2);
  });
});

// ============================================================
//  Der Ersatz-Tipp darf die Favoriten-Sperre nicht brechen
//
//  🔴 Andi, 26.08.2026 — die Sperre nimmt dem Spieler den Favoriten weg. Ein
//  Auto-Tipp, der ihn trotzdem benennt, wäre der einzige Tipp der Runde, der
//  die Regel bricht: der Versäumte bekäme, was der Anwesende nicht darf.
//
//  ⚠️ Dieselbe Sorte Fund wie am 06.08.2026: `autoTip.js` war fertig,
//  getestet und einstellbar — und von niemandem aufgerufen. Eine Rechnung
//  stimmt nicht dadurch, dass sie jemand fragt.
// ============================================================
describe("Favoriten-Sperre im Ersatz-Tipp", () => {
  // ⚠️ Der ECHTE Mock-Schnappschuss und kein selbst gebauter: `likelyScorelines`
  // liest auch die 1X2-Quoten (`snap.odds`), und ein handgeschriebenes Objekt
  // ohne sie stürzt ab — dann prüfte der Test nur noch sich selbst.
  const SNAP = createMockOddsSource().getSnapshot("JOR-ESP");
  const mitSperre = (teil) => sanitizeRules({
    ...DEFAULT_RULES,
    markets: { ...DEFAULT_RULES.markets, goals: { ...DEFAULT_RULES.markets.goals, enabled: true, picksPerTeam: 1 } },
    sperre: { enabled: true, modus: "rang", mindestensOffen: 2, ...teil },
  });

  it("benennt keinen gesperrten Torschützen", () => {
    const ohne = buildAutoTip(SNAP, mitSperre({ schuetzen: 0 }));
    const mit = buildAutoTip(SNAP, mitSperre({ schuetzen: 2 }));
    const zu = schuetzenSperre(SNAP, mitSperre({ schuetzen: 2 }))
      .filter((o) => o.gesperrt).map((o) => o.id);
    expect(zu.length).toBe(2);
    // Gegenprobe: ohne Sperre steht mindestens einer der beiden im Tipp.
    const ohneNamen = [...ohne.goals.home, ...ohne.goals.away];
    expect(ohneNamen.some((n) => zu.includes(n))).toBe(true);
    // Mit Sperre keiner — und gleich viele Namen wie vorher.
    const mitNamen = [...mit.goals.home, ...mit.goals.away];
    expect(mitNamen.some((n) => zu.includes(n))).toBe(false);
    expect(mitNamen.length).toBe(ohneNamen.length);
  });

  it("tippt keinen gesperrten Endstand", () => {
    const rules = mitSperre({ ergebnisse: 1, mindestensOffen: 1 });
    const zu = ergebnisSperre(SNAP, rules).filter((o) => o.gesperrt).map((o) => o.id);
    expect(zu.length).toBe(1);
    const ohne = buildAutoTip(SNAP, sanitizeRules(DEFAULT_RULES));
    // Gegenprobe: ohne Sperre ist genau dieser Stand der Ersatz-Tipp.
    expect(zu).toContain(`${ohne.home}:${ohne.away}`);
    const t = buildAutoTip(SNAP, rules);
    expect(zu).not.toContain(`${t.home}:${t.away}`);
  });

  it("auch die Strategie Zufall bleibt innerhalb der Sperre", () => {
    const rules = mitSperre({ ergebnisse: 3, mindestensOffen: 1 });
    const zu = new Set(ergebnisSperre(SNAP, rules).filter((o) => o.gesperrt).map((o) => o.id));
    expect(zu.size).toBe(3);
    // Über viele Seeds: kein einziger Wurf darf in einem gesperrten Feld landen.
    for (let i = 0; i < 40; i++) {
      const t = buildAutoTip(SNAP, rules, { strategie: "zufall", seed: `s${i}` });
      expect(zu.has(`${t.home}:${t.away}`), `seed s${i}`).toBe(false);
    }
  });

  it("auch der Schnitt der Mitspieler weicht einem gesperrten Feld aus", () => {
    const rules = mitSperre({ ergebnisse: 1, mindestensOffen: 1 });
    const [gesperrt] = ergebnisSperre(SNAP, rules).filter((o) => o.gesperrt);
    // Drei identische Tipps auf genau den gesperrten Stand — ihr Mittelwert
    // ist er selbst.
    const fremdeTipps = Array.from({ length: 3 }, () => ({ home: gesperrt.home, away: gesperrt.away }));
    const t = buildAutoTip(SNAP, rules, { strategie: "schnitt", fremdeTipps });
    expect(`${t.home}:${t.away}`).not.toBe(gesperrt.id);
  });

  it("ohne Sperre ändert sich am Ersatz-Tipp gar nichts", () => {
    // Die Gegenprobe zu allen vieren: sonst wäre nicht zu unterscheiden, ob die
    // Sperre wirkt oder der Auto-Tipp einfach anders geworden ist.
    // ⚠️ Gegen DASSELBE Regelwerk mit ausgeschalteter Sperre verglichen, nicht
    // gegen die nackte Vorgabe: `mitSperre` setzt auch die Zahl der Schützen,
    // und der Unterschied käme dann von dort statt von der Sperre.
    const a = buildAutoTip(SNAP, sanitizeRules({ ...mitSperre({}), sperre: { enabled: false } }));
    const b = buildAutoTip(SNAP, mitSperre({ schuetzen: 0, ergebnisse: 0 }));
    expect(b).toEqual(a);
  });
});
