import { describe, it, expect } from "vitest";
import {
  AUSSCHLUSS_REICHWEITEN, DREHRAD_LIMITS, DEFAULT_DREHRAD,
  sanitizeDrehrad, pruefeAusschluesse, ziehe, wahrscheinlichkeiten,
} from "./drehrad";
import { drehradZiehungen } from "./drehradBoard";
import { segmente, winkelVon, naechsteGrenze, ziehGrenze } from "./radGeometrie";
import { DEFAULT_RULES, sanitizeRules } from "./engine";

// ============================================================
//  DAS RAD ALS BAUKASTEN -- Andis Fragen vom 27.08.2026
//
//  🔴 „gegenseitige ausschlüsse und nicht kombinierbarkeit" und „auch mehrfach
//  bei einem Rad-drehtereignis?"
//
//  ⚠️ Was hier wirklich schiefgehen kann, ist NICHT die Rechnung, sondern die
//  Rueckwirkungslosigkeit: eine Beziehung, die man einstellen kann und die
//  beim Ziehen niemand fragt. Deshalb misst fast jeder Test unten an `ziehe`
//  oder `drehradZiehungen` -- nicht an der Bereinigung.
// ============================================================

const feld = (id, gewicht, extra = {}) =>
  ({ id, label: id, gewicht, belohnung: { typ: "nichts" }, ...extra });

const rad = (extra = {}) => sanitizeDrehrad({
  ...DEFAULT_DREHRAD, enabled: true,
  felder: [feld("a", 25), feld("b", 25), feld("c", 25), feld("d", 25)],
  ...extra,
});

describe("Der Katalog der Reichweiten", () => {
  it("jede Reichweite ist benannt und erklaert", () => {
    for (const r of AUSSCHLUSS_REICHWEITEN) {
      expect(r.key && r.label, r.key).toBeTruthy();
      expect(r.desc.length, r.key).toBeGreaterThan(30);
    }
  });

  it("genau drei -- und die Liste ist eine Zahlensperre", () => {
    // ⚠️ Wer eine vierte ergaenzt, muss hier vorbei. Aus einem „du kannst dir
    // sicher vorstellen, welche Parameter das braucht" sind in diesem Projekt
    // schon einmal 38 Regel-Bloecke geworden (CLAUDE.md).
    expect(AUSSCHLUSS_REICHWEITEN.map((r) => r.key))
      .toEqual(["ereignis", "drehungen", "saison"]);
  });
});

describe("Ausschluesse bereinigen", () => {
  const felder = [feld("a", 1), feld("b", 1)];

  it("nimmt ein gueltiges Paar und sortiert es", () => {
    // Ein Ausschluss gilt gegenseitig -- unsortiert stuenden „a-b" und „b-a"
    // als zwei Eintraege da, und die Doppelten-Pruefung faende sie nicht.
    const { ausschluesse } = pruefeAusschluesse([{ a: "b", b: "a" }], felder);
    expect(ausschluesse).toEqual([{ a: "a", b: "b", reichweite: "ereignis" }]);
  });

  it("verwirft mit BEGRUENDUNG, was ins Leere zeigt", () => {
    const { ausschluesse, verworfen } = pruefeAusschluesse([{ a: "a", b: "weg" }], felder);
    expect(ausschluesse).toEqual([]);
    expect(verworfen[0].grund).toMatch(/nicht \(mehr\) gibt/);
  });

  it("ein Feld gegen sich selbst IST die Sperrfrist -- und wird abgelehnt", () => {
    // Zwei Wege zu derselben Regel laufen auseinander.
    const { verworfen } = pruefeAusschluesse([{ a: "a", b: "a" }], felder);
    expect(verworfen[0].grund).toMatch(/Sperrfrist/);
  });

  it("dasselbe Paar zweimal ist einmal", () => {
    const { ausschluesse, verworfen } = pruefeAusschluesse(
      [{ a: "a", b: "b" }, { a: "b", b: "a", reichweite: "saison" }], felder);
    expect(ausschluesse).toHaveLength(1);
    expect(verworfen[0].grund).toMatch(/gibt es schon/);
  });

  it("„drehungen\" bekommt seine Zahl, die anderen nicht", () => {
    const { ausschluesse } = pruefeAusschluesse([
      { a: "a", b: "b", reichweite: "drehungen", drehungen: 4 },
    ], felder);
    expect(ausschluesse[0].drehungen).toBe(4);
    const ohne = pruefeAusschluesse([{ a: "a", b: "b", reichweite: "saison" }], felder);
    expect(ohne.ausschluesse[0].drehungen).toBeUndefined();
  });

  it("ein Ausschluss auf ein verworfenes Feld ueberlebt die Bereinigung NICHT", () => {
    // 🔴 Reihenfolge: erst die Felder, dann die Ausschluesse. Umgekehrt bliebe
    // eine Zeile stehen, die auf nichts zeigt.
    const cfg = sanitizeDrehrad({
      enabled: true,
      felder: [feld("a", 1), feld("b", 1), { id: "", gewicht: 1 }],
      ausschluesse: [{ a: "a", b: "" }],
    });
    expect(cfg.ausschluesse).toEqual([]);
  });
});

describe("Der Ausschluss greift beim ZIEHEN", () => {
  const zieh = (cfg, extra) => ziehe(cfg, {
    rundenId: "r", userId: "u", spieltag: 3, ...extra,
  });

  it("Reichweite „ereignis\": was am selben Termin fiel, sperrt den Partner", () => {
    const cfg = rad({ ausschluesse: [{ a: "a", b: "b", reichweite: "ereignis" }] });
    // 40 Versuche ueber verschiedene Seeds: nie kommt „b", wenn „a" schon fiel.
    for (let i = 0; i < 40; i++) {
      const f = ziehe(cfg, { rundenId: `r${i}`, userId: "u", spieltag: 1, imEreignis: ["a"] });
      expect(f.id, `Seed ${i}`).not.toBe("b");
    }
  });

  it("... aber an einem ANDEREN Termin ist der Partner wieder frei", () => {
    // ⚠️ Der Unterschied zu „saison". Ohne diesen Test waere die kuerzeste
    // Reichweite still die haerteste.
    const cfg = rad({ ausschluesse: [{ a: "a", b: "b", reichweite: "ereignis" }] });
    const gezogen = new Set();
    for (let i = 0; i < 60; i++) {
      gezogen.add(ziehe(cfg, { rundenId: `r${i}`, userId: "u", spieltag: 1, imEreignis: [] }).id);
    }
    expect(gezogen.has("b")).toBe(true);
  });

  it("Reichweite „saison\": wer das eine hatte, bekommt das andere nie mehr", () => {
    const cfg = rad({ ausschluesse: [{ a: "a", b: "b", reichweite: "saison" }] });
    for (let i = 0; i < 40; i++) {
      const f = ziehe(cfg, { rundenId: `r${i}`, userId: "u", spieltag: 9, jeGefallen: ["a"] });
      expect(f.id, `Seed ${i}`).not.toBe("b");
    }
  });

  it("Reichweite „drehungen\": gesperrt, solange der Partner nah genug zurueckliegt", () => {
    const cfg = rad({ ausschluesse: [{ a: "a", b: "b", reichweite: "drehungen", drehungen: 2 }] });
    // „a" liegt eine Drehung zurueck -> „b" gesperrt
    for (let i = 0; i < 30; i++) {
      expect(ziehe(cfg, { rundenId: `r${i}`, userId: "u", spieltag: 5, bisherige: ["a", "c"] }).id)
        .not.toBe("b");
    }
    // ... drei Drehungen zurueck -> wieder frei
    const gezogen = new Set();
    for (let i = 0; i < 60; i++) {
      gezogen.add(ziehe(cfg, { rundenId: `r${i}`, userId: "u", spieltag: 5, bisherige: ["c", "d", "a"] }).id);
    }
    expect(gezogen.has("b")).toBe(true);
  });

  it("sind ALLE Felder gesperrt, liefert das Rad trotzdem etwas", () => {
    // 🔴 Eine Drehung ohne Ergebnis waere der schlechtere Fehler -- dieselbe
    // Regel wie bei der Sperrfrist (drehrad.md 2.2b), und sie weicht die
    // haerteste Reichweite bewusst auf.
    const cfg = sanitizeDrehrad({
      ...DEFAULT_DREHRAD, enabled: true,
      felder: [feld("a", 50), feld("b", 50)],
      ausschluesse: [{ a: "a", b: "b", reichweite: "saison" }],
    });
    const f = zieh(cfg, { jeGefallen: ["a", "b"] });
    expect(f).toBeTruthy();
  });

  it("ohne Ausschluesse aendert sich am Ergebnis GAR NICHTS", () => {
    // ⚠️ Der Regressionsschutz: die neue Mechanik darf bestehende Runden nicht
    // umschreiben. Eine Drehung, die gestern „30 Narren" war, muss es bleiben.
    const ohne = rad();
    for (let i = 0; i < 25; i++) {
      const a = ziehe(ohne, { rundenId: "runde-1", userId: "u", spieltag: i + 1 });
      const b = ziehe(ohne, { rundenId: "runde-1", userId: "u", spieltag: i + 1, nummer: 0 });
      expect(a.id).toBe(b.id);
    }
  });
});

describe("Mehrfach drehen an einem Termin", () => {
  const regeln = (drehrad) => sanitizeRules({ ...DEFAULT_RULES, drehrad });

  it("drei Drehungen je Termin liefern dreimal so viele Ziehungen", () => {
    const einfach = drehradZiehungen({
      rules: regeln(rad({ modus: "gleich", frequenz: 2 })),
      rundenId: "r1", userIds: ["u1"], spieltage: 12,
    });
    const dreifach = drehradZiehungen({
      rules: regeln(rad({ modus: "gleich", frequenz: 2, drehungenProEreignis: 3 })),
      rundenId: "r1", userIds: ["u1"], spieltage: 12,
    });
    expect(einfach.length).toBeGreaterThan(0);
    expect(dreifach.length).toBe(einfach.length * 3);
  });

  it("🔴 die Drehungen sehen einander -- der Ausschluss greift INNERHALB des Termins", () => {
    // Ohne das waeren fuenf Drehungen fuenfmal dieselbe Rechnung, und ein
    // „nicht zusammen" waere eine Zierde.
    const cfg = rad({
      modus: "gleich", frequenz: 2, drehungenProEreignis: 4,
      ausschluesse: [{ a: "a", b: "b", reichweite: "ereignis" }],
    });
    const ziehungen = drehradZiehungen({
      rules: regeln(cfg), rundenId: "r-mehrfach", userIds: ["u1", "u2", "u3"], spieltage: 20,
    });
    expect(ziehungen.length).toBeGreaterThan(10);
    // je (Spieler, Spieltag) duerfen „a" und „b" nie zusammen vorkommen
    const proTermin = new Map();
    for (const z of ziehungen) {
      const k = `${z.userId}|${z.spieltag}`;
      if (!proTermin.has(k)) proTermin.set(k, new Set());
      proTermin.get(k).add(z.feldId);
    }
    for (const [k, felder] of proTermin) {
      expect(felder.has("a") && felder.has("b"), `Termin ${k}`).toBe(false);
    }
  });

  it("die erste Drehung eines Termins bleibt dieselbe wie bisher", () => {
    // ⚠️ Der Schluessel bekommt die Nummer erst ab der ZWEITEN Drehung -- sonst
    // aendert sich jedes Ergebnis jeder bestehenden Runde.
    const einfach = drehradZiehungen({
      rules: regeln(rad({ modus: "gleich", frequenz: 3 })),
      rundenId: "alt", userIds: ["u1"], spieltage: 15,
    });
    const mehrfach = drehradZiehungen({
      rules: regeln(rad({ modus: "gleich", frequenz: 3, drehungenProEreignis: 2 })),
      rundenId: "alt", userIds: ["u1"], spieltage: 15,
    });
    for (const z of einfach) {
      const erste = mehrfach.find((m) => m.userId === z.userId && m.spieltag === z.spieltag);
      expect(erste.feldId, `Spieltag ${z.spieltag}`).toBe(z.feldId);
    }
  });
});

// ── Der Editor am Rad ───────────────────────────────────────
// 🔴 Andi: „optisch an dem Rad einstellen". Was hier zaehlt, ist nicht das
// Aussehen, sondern dass der Zug in dieselbe Zahl geht, mit der gezogen wird.
describe("Der Zug am Rad", () => {
  const felder = [feld("a", 25), feld("b", 25), feld("c", 50)];
  const segs = segmente(felder, wahrscheinlichkeiten(felder));

  it("`segmente` traegt das Gewicht mit hinaus", () => {
    // Ohne das muesste der Editor aus einem gerundeten Anteil eine exakte Zahl
    // zurueckschaetzen -- genau daraus entsteht die zweite Wahrheit.
    expect(segs.map((s) => s.gewicht)).toEqual([25, 25, 50]);
  });

  it("Winkel: 0 Grad zeigt nach OBEN", () => {
    expect(Math.round(winkelVon(100, 100, 100, 0))).toBe(0);     // direkt darueber
    expect(Math.round(winkelVon(100, 100, 200, 100))).toBe(90);  // rechts
    expect(Math.round(winkelVon(100, 100, 100, 200))).toBe(180); // darunter
  });

  it("findet die Grenze, an der man zieht -- und nur die nahe", () => {
    // Grenzen liegen bei 90 und 180 Grad (25/25/50 von 100).
    expect(naechsteGrenze(segs, 92)?.index).toBe(0);
    expect(naechsteGrenze(segs, 178)?.index).toBe(1);
    expect(naechsteGrenze(segs, 45)).toBeNull();
  });

  it("die 360-Grad-Naht ist KEINE Grenze", () => {
    // 🔴 Sie zu verschieben hiesse, das ganze Rad zu drehen -- und alle
    // Groessen blieben dabei gleich. Ein Griff, der nichts tut, ist schlimmer
    // als keiner.
    expect(naechsteGrenze(segs, 359)).toBeNull();
    expect(naechsteGrenze(segs, 1)).toBeNull();
  });

  it("🔴 der Zug verschiebt Flaeche zwischen ZWEI Nachbarn -- die Summe bleibt", () => {
    const neu = ziehGrenze(segs, 0, 120, 100);
    expect(Object.keys(neu).sort()).toEqual(["a", "b"]);
    expect(neu.a + neu.b).toBe(50);       // vorher 25 + 25
    expect(neu.a).toBeGreaterThan(25);    // die Grenze ging nach rechts
  });

  it("die anderen Felder bleiben unberuehrt", () => {
    // ⚠️ Genau das unterscheidet den Grenzzug vom „Feld groesser ziehen":
    // dort wandert alles, und man kann nichts festhalten.
    expect(ziehGrenze(segs, 0, 120, 100).c).toBeUndefined();
  });

  it("kein Feld faellt beim Ziehen auf 0", () => {
    // Ein Feld mit Gewicht 0 liegt weiter auf dem Rad und faellt nie -- am Rad
    // waere es unsichtbar und damit nicht mehr anfassbar.
    const neu = ziehGrenze(segs, 0, 0.5, 100);
    expect(neu === null || neu.a >= 1).toBe(true);
  });

  it("ein Zug ueber den Nachbarn hinaus wird abgelehnt, statt ein Feld zu ueberspringen", () => {
    expect(ziehGrenze(segs, 0, 200, 100)).toBeNull();   // liegt jenseits von „b"
    expect(ziehGrenze(segs, 0, 0, 100)).toBeNull();     // liegt vor „a"
  });

  it("ein Zug, der nichts aendert, meldet auch nichts", () => {
    expect(ziehGrenze(segs, 0, 90, 100)).toBeNull();
  });
});

describe("Die Grenzen bleiben bedienbar", () => {
  it("Drehungen je Termin sind klein gehalten", () => {
    // ⚠️ Fuenf Drehungen hintereinander sind eine kleine Show, zwanzig waeren
    // eine Rechnung.
    expect(DREHRAD_LIMITS.drehungenProEreignis.max).toBeLessThanOrEqual(5);
    expect(DEFAULT_DREHRAD.drehungenProEreignis).toBe(1);
  });

  it("die Vorgabe traegt keine Ausschluesse", () => {
    expect(sanitizeDrehrad({}).ausschluesse).toEqual([]);
  });
});
