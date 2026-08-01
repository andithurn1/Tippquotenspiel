import { describe, it, expect } from "vitest";
import * as drehradModul from "./drehrad";
import {
  BELOHNUNGS_TYPEN, DREHRAD_LIMITS, DEFAULT_DREHRAD,
  sanitizeDrehrad, pruefeFelder, wahrscheinlichkeiten,
  drehradPlan, ziehe, beschreibeDrehrad, auswerten,
} from "./drehrad";
import { DEFAULT_BASIS, WER, darfEinsetzen } from "./jokerBasis";

const feld = (id, gewicht, extra = {}) => ({
  id, label: `Feld ${id}`, gewicht, belohnung: { typ: "nichts" }, ...extra,
});

// ── Kataloge ────────────────────────────────────────────────

describe("Kataloge", () => {
  it("BELOHNUNGS_TYPEN: jeder Eintrag hat key, label, desc — Keys eindeutig", () => {
    for (const e of BELOHNUNGS_TYPEN) expect(e.key && e.label && e.desc).toBeTruthy();
    expect(new Set(BELOHNUNGS_TYPEN.map((e) => e.key)).size).toBe(BELOHNUNGS_TYPEN.length);
  });

  it("Abschnitt 2.2 nennt genau fünf Belohnungs-Typen", () => {
    expect(BELOHNUNGS_TYPEN.map((t) => t.key).sort()).toEqual(
      ["budget", "joker", "modifikator", "nichts", "punkte"],
    );
  });

  it("DEFAULT_DREHRAD trägt einen Saison-Deckel für Punkte — er darf nie fehlen (2.5 Punkt 2)", () => {
    expect(DEFAULT_DREHRAD.maxPunkteProSaison).toBeGreaterThan(0);
    expect(sanitizeDrehrad({}).maxPunkteProSaison).toBeGreaterThan(0);
    // Auch bei explizit entferntem Feld bleibt der Deckel gesetzt — fällt auf
    // die Vorgabe zurück statt zu fehlen.
    const { maxPunkteProSaison, ...ohneDeckel } = DEFAULT_DREHRAD;
    expect(sanitizeDrehrad(ohneDeckel).maxPunkteProSaison).toBe(DEFAULT_DREHRAD.maxPunkteProSaison);
  });
});

// ── pruefeFelder / sanitizeDrehrad: Bereinigung ──────────────

describe("pruefeFelder — Test 6: jedes verworfene Feld mit Grund", () => {
  it("meldet fehlende id, fehlendes label, unbekannten Belohnungs-Typ und unbekannte Joker-Art einzeln", () => {
    const roh = [
      { label: "ohne id", gewicht: 1, belohnung: { typ: "nichts" } },                          // 0: keine id
      { id: "b", gewicht: 1, belohnung: { typ: "nichts" } },                                    // 1: kein label
      { id: "c", label: "Unbekannter Typ", gewicht: 1, belohnung: { typ: "quatsch" } },          // 2: unbekannter Typ
      { id: "d", label: "Unbekannte Art", gewicht: 1, belohnung: { typ: "joker", art: "voodoo" } }, // 3: unbekannte Art
      { id: "e", label: "Gültig", gewicht: 3, belohnung: { typ: "nichts" } },                    // 4: gültig
      { id: "f", label: "Auch gültig", gewicht: 3, belohnung: { typ: "budget", betrag: 10 } },   // 5: gültig
    ];
    const r = pruefeFelder(roh, 0);

    expect(r.felder.map((f) => f.id)).toEqual(["e", "f"]);
    expect(r.verworfen).toHaveLength(4);
    expect(r.verworfen.map((v) => v.index)).toEqual([0, 1, 2, 3]);
    expect(r.verworfen[0].grund).toMatch(/id/i);
    expect(r.verworfen[1].id).toBe("b");
    expect(r.verworfen[1].grund).toMatch(/label/i);
    expect(r.verworfen[2].id).toBe("c");
    expect(r.verworfen[2].grund).toMatch(/typ/i);
    expect(r.verworfen[3].id).toBe("d");
    expect(r.verworfen[3].grund).toMatch(/art/i);
  });

  it("leere oder unsinnige Liste liefert leere felder und leeres verworfen", () => {
    expect(pruefeFelder([], 0).felder).toEqual([]);
    expect(pruefeFelder(undefined, 0).verworfen).toEqual([]);
  });

  it("sanitizeDrehrad wirft dieselben ungültigen Felder still raus", () => {
    const cfg = sanitizeDrehrad({
      felder: [
        { label: "ohne id", gewicht: 1, belohnung: { typ: "nichts" } },
        { id: "e", label: "Gültig", gewicht: 3, belohnung: { typ: "nichts" } },
      ],
    });
    expect(cfg.felder.map((f) => f.id)).toEqual(["e"]);
  });
});

describe("Sperrfrist — Feld schlägt Rad-Vorgabe (2.2b)", () => {
  it("ein Feld mit eigener sperrfrist überschreibt die Rad-Vorgabe", () => {
    const r = pruefeFelder([
      { id: "a", label: "A", gewicht: 1, sperrfrist: 5, belohnung: { typ: "nichts" } },
      { id: "b", label: "B", gewicht: 1, belohnung: { typ: "nichts" } }, // erbt Rad-Vorgabe
    ], 2);
    expect(r.felder.find((f) => f.id === "a").sperrfrist).toBe(5);
    expect(r.felder.find((f) => f.id === "b").sperrfrist).toBe(2);
  });

  it("eine explizite sperrfrist: 0 am Feld sperrt nie, auch wenn die Rad-Vorgabe höher ist", () => {
    const r = pruefeFelder([
      { id: "a", label: "A", gewicht: 1, sperrfrist: 0, belohnung: { typ: "nichts" } },
    ], 5);
    expect(r.felder[0].sperrfrist).toBe(0);
  });
});

// ── Test 7: Rad mit weniger als zwei Feldern über Gewicht 0 ──

describe("Test 7 — ein Rad mit weniger als zwei Feldern über Gewicht 0 ist ungültig", () => {
  it("pruefeFelder meldet gueltig: false mit Grund bei null Feldern über Gewicht 0", () => {
    const r = pruefeFelder([feld("a", 0), feld("b", 0)], 0);
    expect(r.gueltig).toBe(false);
    expect(r.grund).toBeTruthy();
  });

  it("pruefeFelder meldet gueltig: false mit Grund bei genau einem Feld über Gewicht 0", () => {
    const r = pruefeFelder([feld("a", 5), feld("b", 0)], 0);
    expect(r.gueltig).toBe(false);
    expect(r.grund).toBeTruthy();
  });

  it("ab zwei Feldern über Gewicht 0 ist das Rad gültig", () => {
    const r = pruefeFelder([feld("a", 5), feld("b", 5)], 0);
    expect(r.gueltig).toBe(true);
    expect(r.grund).toBeNull();
  });

  it("beschreibeDrehrad sagt es ebenfalls, statt ein kaputtes Rad zu beschreiben", () => {
    const text = beschreibeDrehrad({ felder: [feld("a", 5), feld("b", 0)] });
    expect(text).toMatch(/gültig|zwei Felder/i);
  });
});

// ── Test 1: Feld mit gewicht: 0 fällt nie ────────────────────

describe("Test 1 — ein Feld mit gewicht: 0 fällt nie", () => {
  it("über viele Ziehungen taucht das Nieten-Feld mit Gewicht 0 nie als Ergebnis auf", () => {
    const drehrad = { felder: [feld("niete", 0), feld("a", 5), feld("b", 5)] };
    for (let spieltag = 1; spieltag <= 50; spieltag++) {
      const r = ziehe(drehrad, { rundenId: "r1", userId: "u1", spieltag, bisherige: [] });
      expect(r.id).not.toBe("niete");
    }
  });
});

// ── Test 2: Anteile summieren sich auf 1 ─────────────────────

describe("Test 2 — wahrscheinlichkeiten summieren sich auf 1", () => {
  it("Anteile ergeben in Summe 1, auch mit einem Gewicht-0-Feld dabei", () => {
    const felder = [feld("a", 3), feld("b", 2), feld("c", 0)];
    const w = wahrscheinlichkeiten(felder);
    const summe = w.reduce((s, x) => s + x.anteil, 0);
    expect(summe).toBeCloseTo(1, 10);
    expect(w.find((x) => x.id === "c").anteil).toBe(0);
  });

  it("ein Rad ganz ohne Gewicht liefert überall Anteil 0, statt zu teilen durch 0", () => {
    const w = wahrscheinlichkeiten([feld("a", 0), feld("b", 0)]);
    expect(w.every((x) => x.anteil === 0)).toBe(true);
  });
});

// ── Test 3: Determinismus & Unterscheidung nach Spieler ──────

describe("Test 3 — ziehe ist deterministisch", () => {
  const drehrad = { felder: [feld("a", 3), feld("b", 3), feld("c", 3), feld("d", 3), feld("e", 3)] };

  it("dieselben Eingaben liefern immer dasselbe Feld", () => {
    const eingabe = { rundenId: "runde-1", userId: "u1", spieltag: 7, bisherige: ["b", "a"] };
    const r1 = ziehe(drehrad, eingabe);
    const r2 = ziehe(drehrad, { ...eingabe, bisherige: [...eingabe.bisherige] });
    expect(r1).toEqual(r2);
  });

  it("verschiedene Spieler am selben Spieltag können verschiedene Felder ziehen", () => {
    const userIds = Array.from({ length: 15 }, (_, i) => `u${i}`);
    const ergebnisse = new Set(
      userIds.map((userId) => ziehe(drehrad, { rundenId: "runde-1", userId, spieltag: 3, bisherige: [] })?.id),
    );
    expect(ergebnisse.size).toBeGreaterThan(1);
  });

  it("ein Neuladen (erneuter Aufruf) ändert nichts am Ergebnis", () => {
    const eingabe = { rundenId: "runde-9", userId: "u3", spieltag: 12, bisherige: [] };
    const ergebnisse = Array.from({ length: 5 }, () => ziehe(drehrad, eingabe)?.id);
    expect(new Set(ergebnisse).size).toBe(1);
  });
});

// ── Test 3b: Sperrfrist ───────────────────────────────────────

describe("Test 3b — Sperrfrist verhindert schnelle Wiederholung", () => {
  const drehrad = { felder: [feld("a", 5, { sperrfrist: 2 }), feld("b", 5)] };

  it("ein Feld mit sperrfrist: 2 kommt in den nächsten zwei Drehungen nicht", () => {
    for (let spieltag = 1; spieltag <= 30; spieltag++) {
      const direktDanach = ziehe(drehrad, { rundenId: "r", userId: "u1", spieltag, bisherige: ["a"] });
      expect(direktDanach.id).not.toBe("a");
      const zweiDanach = ziehe(drehrad, { rundenId: "r", userId: "u1", spieltag, bisherige: ["b", "a"] });
      expect(zweiDanach.id).not.toBe("a");
    }
  });

  it("in der dritten Drehung ist das Feld wieder im Spiel", () => {
    let mindestensEinmalA = false;
    for (let spieltag = 1; spieltag <= 30; spieltag++) {
      const dritteDanach = ziehe(drehrad, { rundenId: "r", userId: "u1", spieltag, bisherige: ["b", "b", "a"] });
      if (dritteDanach.id === "a") mindestensEinmalA = true;
    }
    expect(mindestensEinmalA).toBe(true);
  });

  it("sperrfrist: 0 sperrt nie, egal wie oft das Feld zuletzt kam", () => {
    const nieGesperrt = { felder: [feld("a", 5, { sperrfrist: 0 }), feld("b", 5)] };
    let mindestensEinmalA = false;
    for (let spieltag = 1; spieltag <= 30; spieltag++) {
      const r = ziehe(nieGesperrt, { rundenId: "r", userId: "u1", spieltag, bisherige: ["a", "a", "a"] });
      if (r.id === "a") mindestensEinmalA = true;
    }
    expect(mindestensEinmalA).toBe(true);
  });
});

// ── Test 3c: Randfall — alle Felder gesperrt ─────────────────

describe("Test 3c — sind alle Felder gesperrt, wird trotzdem gezogen", () => {
  it("liefert ein Ergebnis statt null, wenn die Vorgeschichte alle Felder sperrt", () => {
    const drehrad = { sperrfrist: 3, felder: [feld("a", 5), feld("b", 5)] };
    // Beide Felder wurden gerade erst gezogen — beide wären nach Sperrfrist
    // eigentlich blockiert.
    const r = ziehe(drehrad, { rundenId: "r", userId: "u1", spieltag: 10, bisherige: ["b", "a"] });
    expect(r).not.toBeNull();
    expect(["a", "b"]).toContain(r.id);
  });

  it("pruefeFelder warnt schon beim Einstellen, wenn die Sperrfristen rechnerisch nicht aufgehen", () => {
    // Summe der Sperren (3+3=6) >= Anzahl Felder mit Gewicht > 0 (2).
    const r = pruefeFelder([feld("a", 5, { sperrfrist: 3 }), feld("b", 5, { sperrfrist: 3 })], 0);
    expect(r.warnung).toBeTruthy();
  });

  it("keine Warnung, wenn die Sperrfristen rechnerisch aufgehen können", () => {
    const r = pruefeFelder([feld("a", 5, { sperrfrist: 0 }), feld("b", 5, { sperrfrist: 1 })], 0);
    expect(r.warnung).toBeNull();
  });
});

// ── Test 4: drehradPlan hält sich an Frequenz & Fenster ──────

describe("Test 4 — Drehungen liegen im eingestellten Fenster und nirgends sonst", () => {
  it("alle geplanten Spieltage liegen zwischen von und bis des manuellen Fensters", () => {
    const drehrad = {
      felder: [feld("a", 5), feld("b", 5)],
      modus: "kontingent",
      frequenz: 2,
      phase: "manuell",
      abSpieltag: 10,
      bisSpieltag: 20,
    };
    const userIds = ["u1", "u2", "u3"];
    const plan = drehradPlan({ spieltage: 34, drehrad, seed: "runde-1", userIds });

    expect(plan.von).toBe(10);
    expect(plan.bis).toBe(20);
    for (const id of userIds) {
      for (const t of plan.proSpieler[id]) {
        expect(t).toBeGreaterThanOrEqual(10);
        expect(t).toBeLessThanOrEqual(20);
      }
      expect(plan.proSpieler[id].length).toBeGreaterThan(0);
    }
  });

  it("ruft jokerPlan auf — Modus „gleich“ liefert für alle dieselben Spieltage", () => {
    const drehrad = {
      felder: [feld("a", 5), feld("b", 5)],
      modus: "gleich", frequenz: 4, phase: "manuell", abSpieltag: 1, bisSpieltag: 34,
    };
    const userIds = ["u1", "u2", "u3"];
    const plan = drehradPlan({ spieltage: 34, drehrad, seed: "runde-2", userIds });
    const listen = userIds.map((id) => plan.proSpieler[id].join(","));
    expect(new Set(listen).size).toBe(1);
  });

  it("deterministisch: gleiche Runde, gleicher Plan", () => {
    const drehrad = { felder: [feld("a", 5), feld("b", 5)], modus: "kontingent", frequenz: 4 };
    const userIds = ["u1", "u2"];
    const p1 = drehradPlan({ spieltage: 34, drehrad, seed: "runde-x", userIds });
    const p2 = drehradPlan({ spieltage: 34, drehrad, seed: "runde-x", userIds });
    expect(p1).toEqual(p2);
  });
});

// ── Test 5: wer: abRueckstand schließt Führende aus ──────────

describe("Test 5 — wer: abRueckstand schließt Führende aus", () => {
  it("die gespeicherte Einstellung greift über jokerBasis.darfEinsetzen, kein zweiter Mechanismus", () => {
    const cfg = sanitizeDrehrad({ wer: "abRueckstand", werWert: 20, felder: [feld("a", 5), feld("b", 5)] });
    expect(cfg.wer).toBe("abRueckstand");
    expect(cfg.werWert).toBe(20);

    const basis = { ...DEFAULT_BASIS, wer: cfg.wer, werWert: cfg.werWert };
    const board = [{ userId: "fuehrend", total: 100 }, { userId: "hinten", total: 50 }];

    const fuehrend = darfEinsetzen(basis, "fuehrend", { hatGetippt: true, board });
    const hinten = darfEinsetzen(basis, "hinten", { hatGetippt: true, board });

    expect(fuehrend.erlaubt).toBe(false);
    expect(hinten.erlaubt).toBe(true);
  });

  it("wer: abPlatz wird ebenso durchgereicht und validiert", () => {
    const cfg = sanitizeDrehrad({ wer: "abPlatz", werWert: 3 });
    expect(cfg.wer).toBe("abPlatz");
    expect(cfg.werWert).toBe(3);
  });

  it("unbekanntes wer fällt auf die Vorgabe alle zurück", () => {
    expect(sanitizeDrehrad({ wer: "quatsch" }).wer).toBe(DEFAULT_DREHRAD.wer);
  });
});

// ── K1 (Abnahme 31.07., design/drehrad.md Abschnitt 3b (a)) ─────────────────
// EIN wer-Katalog statt zwei: drehrad.js führt keinen eigenen mehr, sondern
// importiert WER aus jokerBasis.js.

describe("K1 — drehrad.js exportiert keinen eigenen wer-Katalog mehr", () => {
  it("Pflichttest 3: die erlaubten wer-Werte in sanitizeDrehrad stammen aus jokerBasis.WER", () => {
    // Jeder Schlüssel aus jokerBasis.WER wird von sanitizeDrehrad akzeptiert
    // (bleibt unverändert erhalten, statt auf die Vorgabe zurückzufallen) —
    // das beweist, dass dieselbe Liste zugrunde liegt. Insbesondere
    // "adminFreigabe": der frühere lokale Katalog im Drehrad kannte diesen
    // Wert NICHT (er hatte stattdessen "nurGetippte") — akzeptiert
    // sanitizeDrehrad ihn jetzt, kommt der Katalog nachweislich aus
    // jokerBasis.WER, nicht mehr aus einer eigenen Liste.
    for (const w of WER) {
      expect(sanitizeDrehrad({ wer: w.key }).wer).toBe(w.key);
    }
  });

  it("drehrad.js exportiert kein eigenes WER/WER_KEYS", () => {
    expect(drehradModul.WER).toBeUndefined();
    expect(drehradModul.WER_KEYS).toBeUndefined();
  });

  it("ein wer-Wert, der in jokerBasis.WER NICHT vorkommt, fällt weiterhin auf die Vorgabe zurück", () => {
    expect(WER.some((w) => w.key === "nurGetippte")).toBe(false);
    expect(sanitizeDrehrad({ wer: "nurGetippte" }).wer).toBe(DEFAULT_DREHRAD.wer);
  });
});

// ── sanitizeDrehrad: Grundlegendes ───────────────────────────

describe("sanitizeDrehrad — Grenzen & Vorgaben", () => {
  it("liefert bei komplettem Unsinn die Vorgaben", () => {
    const cfg = sanitizeDrehrad("quatsch");
    expect(cfg.felder).toEqual([]);
    expect(cfg.modus).toBe(DEFAULT_DREHRAD.modus);
    expect(cfg.sperrfrist).toBe(DEFAULT_DREHRAD.sperrfrist);
  });

  it("frequenz wird auf DREHRAD_LIMITS.frequenz beschnitten", () => {
    expect(sanitizeDrehrad({ frequenz: 999 }).frequenz).toBe(DREHRAD_LIMITS.frequenz.max);
    expect(sanitizeDrehrad({ frequenz: 0 }).frequenz).toBe(DREHRAD_LIMITS.frequenz.min);
  });

  it("modus akzeptiert nur gleich/kontingent — frei ist für ein Rad kein gültiger Modus", () => {
    expect(sanitizeDrehrad({ modus: "frei" }).modus).toBe(DEFAULT_DREHRAD.modus);
    expect(sanitizeDrehrad({ modus: "kontingent" }).modus).toBe("kontingent");
  });

  it("maxPunkteProSaison wird auf DREHRAD_LIMITS beschnitten, statt zu fehlen", () => {
    expect(sanitizeDrehrad({ maxPunkteProSaison: 999999 }).maxPunkteProSaison)
      .toBe(DREHRAD_LIMITS.maxPunkteProSaison.max);
    expect(sanitizeDrehrad({}).maxPunkteProSaison).toBe(DEFAULT_DREHRAD.maxPunkteProSaison);
  });

  it("abSpieltag/bisSpieltag: 0, null und undefined gelten alle als keine Vorgabe", () => {
    expect(sanitizeDrehrad({ abSpieltag: 0 }).abSpieltag).toBeNull();
    expect(sanitizeDrehrad({ abSpieltag: null }).abSpieltag).toBeNull();
    expect(sanitizeDrehrad({}).abSpieltag).toBeNull();
    expect(sanitizeDrehrad({ abSpieltag: 5 }).abSpieltag).toBe(5);
  });
});

// ── Belohnungs-Typen: alle fünf sanitisieren korrekt ─────────

describe("Belohnungs-Typen (Abschnitt 2.2)", () => {
  it("nichts, joker, budget, modifikator, punkte werden alle akzeptiert", () => {
    const roh = [
      { id: "a", label: "Niete", gewicht: 1, belohnung: { typ: "nichts" } },
      { id: "b", label: "Joker", gewicht: 1, belohnung: { typ: "joker", art: "joker.einzel", anzahl: 2 } },
      { id: "c", label: "Budget", gewicht: 1, belohnung: { typ: "budget", betrag: 50 } },
      { id: "d", label: "Mod", gewicht: 1, belohnung: { typ: "modifikator", faktor: 1.5, spieltage: 3 } },
      { id: "e", label: "Punkte", gewicht: 1, belohnung: { typ: "punkte", betrag: 10 } },
    ];
    const r = pruefeFelder(roh, 0);
    expect(r.felder).toHaveLength(5);
    expect(r.verworfen).toEqual([]);
    expect(r.felder.find((f) => f.id === "b").belohnung).toEqual({ typ: "joker", art: "joker.einzel", anzahl: 2 });
    expect(r.felder.find((f) => f.id === "d").belohnung.faktor).toBe(1.5);
  });
});

// ── beschreibeDrehrad ─────────────────────────────────────────

describe("beschreibeDrehrad", () => {
  it("beschreibt ein gültiges Rad mit Feldanzahl und Fenster", () => {
    const text = beschreibeDrehrad({
      felder: [feld("a", 5), feld("b", 5)],
      frequenz: 4, phase: "manuell", abSpieltag: 5, bisSpieltag: 15,
    }, 34);
    expect(text).toContain("2");
    expect(text).toContain("5");
    expect(text).toContain("15");
  });
});

// ── K2 (Abnahme 31.07., design/drehrad.md Abschnitt 3b (b)) ─────────────────
// auswerten(drehrad, ziehungen) -> { gutschriften, gedeckelt } — der Punkte-
// Deckel wird durchgesetzt, chronologisch je Nutzer.

describe("K2 — auswerten setzt maxPunkteProSaison durch", () => {
  const punkteFeld = (id, betrag) => ({ id, label: id, gewicht: 1, belohnung: { typ: "punkte", betrag } });

  it("Pflichttest 4: drei Punkte-Ziehungen à 40 bei maxPunkteProSaison: 100 -> 40/40/20, danach 0; gedeckelt nennt den gekürzten Betrag", () => {
    const drehrad = { maxPunkteProSaison: 100, felder: [punkteFeld("p40", 40)] };
    const ziehungen = [
      { userId: "u1", spieltag: 1, feldId: "p40" },
      { userId: "u1", spieltag: 2, feldId: "p40" },
      { userId: "u1", spieltag: 3, feldId: "p40" },
      { userId: "u1", spieltag: 4, feldId: "p40" },
    ];
    const r = auswerten(drehrad, ziehungen);
    expect(r.gutschriften.map((g) => g.belohnung.betrag)).toEqual([40, 40, 20, 0]);

    // Genau die dritte und vierte Ziehung wurden gekürzt.
    expect(r.gedeckelt).toHaveLength(2);
    expect(r.gedeckelt[0]).toMatchObject({ userId: "u1", spieltag: 3, feldId: "p40", angefragt: 40, ausgezahlt: 20, gekuerzt: 20 });
    expect(r.gedeckelt[1]).toMatchObject({ userId: "u1", spieltag: 4, feldId: "p40", angefragt: 40, ausgezahlt: 0, gekuerzt: 40 });
  });

  it("Pflichttest 5: maxPunkteProSaison: 0 deckelt nicht", () => {
    const drehrad = { maxPunkteProSaison: 0, felder: [punkteFeld("p40", 40)] };
    const ziehungen = Array.from({ length: 10 }, (_, i) => ({ userId: "u1", spieltag: i + 1, feldId: "p40" }));
    const r = auswerten(drehrad, ziehungen);
    expect(r.gutschriften.every((g) => g.belohnung.betrag === 40)).toBe(true);
    expect(r.gedeckelt).toEqual([]);
  });

  it("Pflichttest 6: Joker- und Münz-Felder werden NICHT gedeckelt, auch wenn der Punkte-Deckel erreicht ist", () => {
    const drehrad = {
      maxPunkteProSaison: 10,
      felder: [
        punkteFeld("p40", 40),
        { id: "j", label: "Joker", gewicht: 1, belohnung: { typ: "joker", art: "joker.einzel", anzahl: 3 } },
        { id: "m", label: "Münze", gewicht: 1, belohnung: { typ: "budget", betrag: 500 } },
      ],
    };
    const ziehungen = [
      { userId: "u1", spieltag: 1, feldId: "p40" },   // reißt den Deckel (10) sofort
      { userId: "u1", spieltag: 2, feldId: "j" },
      { userId: "u1", spieltag: 3, feldId: "m" },
    ];
    const r = auswerten(drehrad, ziehungen);
    expect(r.gutschriften[0].belohnung.betrag).toBe(10); // Punkte gedeckelt
    expect(r.gutschriften[1].belohnung).toEqual({ typ: "joker", art: "joker.einzel", anzahl: 3 });
    expect(r.gutschriften[2].belohnung).toEqual({ typ: "budget", betrag: 500 });
    expect(r.gedeckelt).toHaveLength(1);
    expect(r.gedeckelt[0].feldId).toBe("p40");
  });

  it("Pflichttest 7: zwei Nutzer zählen getrennt", () => {
    const drehrad = { maxPunkteProSaison: 50, felder: [punkteFeld("p40", 40)] };
    const ziehungen = [
      { userId: "u1", spieltag: 1, feldId: "p40" },
      { userId: "u2", spieltag: 1, feldId: "p40" },
      { userId: "u1", spieltag: 2, feldId: "p40" },
      { userId: "u2", spieltag: 2, feldId: "p40" },
    ];
    const r = auswerten(drehrad, ziehungen);
    const u1 = r.gutschriften.filter((g) => g.userId === "u1").map((g) => g.belohnung.betrag);
    const u2 = r.gutschriften.filter((g) => g.userId === "u2").map((g) => g.belohnung.betrag);
    expect(u1).toEqual([40, 10]);
    expect(u2).toEqual([40, 10]);
    expect(r.gedeckelt).toHaveLength(2);
    expect(r.gedeckelt.map((g) => g.userId).sort()).toEqual(["u1", "u2"]);
  });
});
