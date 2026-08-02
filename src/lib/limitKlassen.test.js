import { describe, it, expect } from "vitest";
import {
  AKTIVIERUNG_TYPEN, PRO_ZEITRAUM, WIRKUNGEN, LIMIT_KLASSEN_LIMITS, DEFAULT_LIMIT_KLASSEN,
  sanitizeLimitKlassen, pruefeEinsatz, offeneKlassen, beschreibeKlasse, pruefeKlassen,
} from "./limitKlassen";

// ── Kataloge ────────────────────────────────────────────────

describe("Kataloge", () => {
  it("jeder Katalog-Eintrag hat key, label und desc, Keys sind eindeutig", () => {
    for (const liste of [AKTIVIERUNG_TYPEN, PRO_ZEITRAUM, WIRKUNGEN]) {
      for (const e of liste) expect(e.key && e.label && e.desc).toBeTruthy();
      expect(new Set(liste.map((e) => e.key)).size).toBe(liste.length);
    }
  });

  // 2b Nachtrag (design/joker-ausloeser.md): genau die zwei Wirkungen aus der
  // Festlegung, „kontingent" zuerst als Vorgabe.
  it("WIRKUNGEN nennt genau kontingent und nurWennAktiv", () => {
    expect(WIRKUNGEN.map((w) => w.key)).toEqual(["kontingent", "nurWennAktiv"]);
  });

  it("Abschnitt 2.2/2b nennt genau zehn Aktivierungs-Typen", () => {
    expect(AKTIVIERUNG_TYPEN.map((t) => t.key).sort()).toEqual([
      "abBudget", "abRueckstand", "abSpannung", "abSpieltag", "abVorsprung",
      "fenster", "immer", "nachEreignis", "nurGegenFuehrende", "unterSpannung",
    ]);
  });

  it("DEFAULT_LIMIT_KLASSEN ist eine leere Liste", () => {
    expect(DEFAULT_LIMIT_KLASSEN).toEqual([]);
  });
});

// ── sanitizeLimitKlassen ────────────────────────────────────

describe("sanitizeLimitKlassen", () => {
  it("liefert immer ein Array — auch bei Unsinn", () => {
    expect(sanitizeLimitKlassen(undefined)).toEqual([]);
    expect(sanitizeLimitKlassen(null)).toEqual([]);
    expect(sanitizeLimitKlassen("quatsch")).toEqual([]);
    expect(sanitizeLimitKlassen([])).toEqual([]);
  });

  it("wirft Einträge ohne id raus", () => {
    const r = sanitizeLimitKlassen([
      { mitglieder: ["joker.einzel"], max: 3, proZeitraum: "saison", aktivierung: { typ: "immer" } },
    ]);
    expect(r).toEqual([]);
  });

  it("wirft Einträge mit unbekanntem aktivierung.typ raus", () => {
    const r = sanitizeLimitKlassen([
      { id: "x", mitglieder: ["joker.einzel"], max: 3, proZeitraum: "saison", aktivierung: { typ: "quatsch" } },
    ]);
    expect(r).toEqual([]);
  });

  it("wirft Einträge mit leeren mitglieder raus", () => {
    const r = sanitizeLimitKlassen([
      { id: "x", mitglieder: [], max: 3, proZeitraum: "saison", aktivierung: { typ: "immer" } },
      { id: "y", mitglieder: [""], max: 3, proZeitraum: "saison", aktivierung: { typ: "immer" } },
    ]);
    expect(r).toEqual([]);
  });

  it("gültige Einträge bleiben, ungültige fliegen raus — gemischte Liste", () => {
    const r = sanitizeLimitKlassen([
      { mitglieder: ["joker.einzel"], max: 3, proZeitraum: "saison", aktivierung: { typ: "immer" } }, // keine id
      { id: "b", mitglieder: ["joker.einzel"], max: 3, proZeitraum: "saison", aktivierung: { typ: "quatsch" } }, // unbekannter typ
      { id: "c", mitglieder: [], max: 3, proZeitraum: "saison", aktivierung: { typ: "immer" } }, // leere mitglieder
      { id: "d", label: "Gültig", mitglieder: ["joker.einzel"], max: 3, proZeitraum: "saison", aktivierung: { typ: "immer" } },
    ]);
    expect(r.map((k) => k.id)).toEqual(["d"]);
    expect(r[0].label).toBe("Gültig");
  });

  it("n ist nur bei proZeitraum nSpieltage gesetzt, sonst null", () => {
    const r = sanitizeLimitKlassen([
      { id: "a", mitglieder: ["x"], max: 1, proZeitraum: "saison", n: 5, aktivierung: { typ: "immer" } },
      { id: "b", mitglieder: ["x"], max: 1, proZeitraum: "nSpieltage", n: 5, aktivierung: { typ: "immer" } },
    ]);
    expect(r[0].n).toBeNull();
    expect(r[1].n).toBe(5);
  });

  it("unbekannter proZeitraum fällt auf saison zurück, statt die Klasse zu verwerfen", () => {
    const r = sanitizeLimitKlassen([
      { id: "a", mitglieder: ["x"], max: 1, proZeitraum: "quatsch", aktivierung: { typ: "immer" } },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].proZeitraum).toBe("saison");
  });

  it("max wird auf LIMIT_KLASSEN_LIMITS.max beschnitten", () => {
    const r = sanitizeLimitKlassen([
      { id: "a", mitglieder: ["x"], max: 9999, proZeitraum: "saison", aktivierung: { typ: "immer" } },
    ]);
    expect(r[0].max).toBe(LIMIT_KLASSEN_LIMITS.max.max);
  });

  it("fehlendes aktivierung-Feld ist eine Vorgabe (immer), keine Verwerfung — 5d Festlegung a", () => {
    const r = sanitizeLimitKlassen([
      { id: "a", mitglieder: ["x"], max: 1, proZeitraum: "saison" },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].aktivierung).toEqual({ typ: "immer" });
  });

  it("ein UNBEKANNTER aktivierung.typ verwirft die Klasse weiterhin", () => {
    const r = sanitizeLimitKlassen([
      { id: "a", mitglieder: ["x"], max: 1, proZeitraum: "saison", aktivierung: { typ: "voodoo" } },
    ]);
    expect(r).toEqual([]);
  });

  // Pflichttest 1 (2b Nachtrag, design/joker-ausloeser.md): Vorgabe ist
  // "kontingent" (heutiges Verhalten), Unsinn fällt darauf zurück.
  it("wirkung: fehlendes Feld ist die Vorgabe kontingent", () => {
    const r = sanitizeLimitKlassen([
      { id: "a", mitglieder: ["x"], max: 1, proZeitraum: "saison", aktivierung: { typ: "immer" } },
    ]);
    expect(r[0].wirkung).toBe("kontingent");
  });

  it("wirkung: unbekannter Wert fällt auf kontingent zurück, statt die Klasse zu verwerfen", () => {
    const r = sanitizeLimitKlassen([
      { id: "a", mitglieder: ["x"], max: 1, proZeitraum: "saison", aktivierung: { typ: "immer" }, wirkung: "quatsch" },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].wirkung).toBe("kontingent");
  });

  it("wirkung: nurWennAktiv wird unverändert übernommen", () => {
    const r = sanitizeLimitKlassen([
      { id: "a", mitglieder: ["x"], max: 1, proZeitraum: "saison", aktivierung: { typ: "immer" }, wirkung: "nurWennAktiv" },
    ]);
    expect(r[0].wirkung).toBe("nurWennAktiv");
  });
});

// ── Regression 5d: fehlendes aktivierung schaltete früher alle Limits ab ──

describe("5d — fehlendes aktivierung darf Limits nicht lautlos abschalten", () => {
  // Exakt die drei am 31.07. nachgemessenen Klassen, keine trägt ein
  // `aktivierung`-Feld. Vor der Festlegung (a) fiel dadurch die gesamte
  // Liste auf `[]` zurück und `pruefeEinsatz` erlaubte danach jeden Einsatz.
  const klassen = [
    { id: "A", mitglieder: ["duell.klau", "duell.block"], max: 3, proZeitraum: "saison" },
    { id: "B", mitglieder: ["duell.klau", "duell.block"], max: 1, proZeitraum: "nSpieltage", n: 5 },
    { id: "C", mitglieder: ["duell.klau", "duell.block", "joker.einzel"], max: 6, proZeitraum: "saison" },
  ];

  it("alle drei überleben sanitizeLimitKlassen mit aktivierung: immer", () => {
    const r = sanitizeLimitKlassen(klassen);
    expect(r.map((k) => k.id)).toEqual(["A", "B", "C"]);
    expect(r.every((k) => k.aktivierung.typ === "immer")).toBe(true);
  });

  it("der nachgemessene Einsatz wird abgelehnt und nennt GENAU Klasse B", () => {
    const historie = [{ spieltag: 21, jokerArt: "duell.klau", vonUserId: "a", aufUserId: "b" }];
    const r = pruefeEinsatz(
      { spieltag: 23, jokerArt: "duell.klau", vonUserId: "a", aufUserId: "b" },
      klassen, historie, {},
    );
    expect(r.erlaubt).toBe(false);
    expect(r.gruende.map((g) => g.klasseId)).toEqual(["B"]);
  });
});

// ── pruefeKlassen: Verworfenes sichtbar machen (5d Festlegung b) ─────

describe("pruefeKlassen", () => {
  it("meldet alle drei Verwerfungsgründe mit Index und Grund, gültige Einträge bleiben", () => {
    const liste = [
      { mitglieder: ["joker.einzel"], max: 3, proZeitraum: "saison" }, // fehlende id
      { id: "b", mitglieder: [], max: 3, proZeitraum: "saison" }, // leere mitglieder
      { id: "c", mitglieder: ["joker.einzel"], max: 3, proZeitraum: "saison", aktivierung: { typ: "quatsch" } }, // unbekannter typ
      { id: "d", mitglieder: ["joker.einzel"], max: 3, proZeitraum: "saison" }, // gültig, aktivierung fehlt
    ];
    const r = pruefeKlassen(liste);

    expect(r.klassen.map((k) => k.id)).toEqual(["d"]);
    expect(r.klassen[0].aktivierung).toEqual({ typ: "immer" });

    expect(r.verworfen).toHaveLength(3);
    expect(r.verworfen.map((v) => v.index)).toEqual([0, 1, 2]);
    expect(r.verworfen[0].grund).toMatch(/id/i);
    expect(r.verworfen[1].id).toBe("b");
    expect(r.verworfen[1].grund).toMatch(/mitglieder/i);
    expect(r.verworfen[2].id).toBe("c");
    expect(r.verworfen[2].grund).toMatch(/typ/i);
  });

  it("leere oder unsinnige Liste liefert leere klassen und leeres verworfen", () => {
    expect(pruefeKlassen([])).toEqual({ klassen: [], verworfen: [] });
    expect(pruefeKlassen(undefined)).toEqual({ klassen: [], verworfen: [] });
  });
});

// ── pruefeEinsatz: Grundfälle ───────────────────────────────

describe("pruefeEinsatz — Grundfälle", () => {
  it("leere Klassenliste erlaubt alles", () => {
    const r = pruefeEinsatz({ spieltag: 5, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }, [], [], {});
    expect(r).toEqual({ erlaubt: true, gruende: [] });
  });

  it("Klasse ohne passendes Mitglied betrifft den Einsatz nicht", () => {
    const klassen = [{ id: "a", mitglieder: ["saison.wette"], max: 0, proZeitraum: "saison", aktivierung: { typ: "immer" } }];
    const r = pruefeEinsatz({ spieltag: 5, jokerArt: "duell.klau", vonUserId: "u1" }, klassen, [], {});
    expect(r.erlaubt).toBe(true);
  });

  it("Einsatz innerhalb des Kontingents ist erlaubt", () => {
    const klassen = [{ id: "a", mitglieder: ["duell.klau"], max: 2, proZeitraum: "saison", aktivierung: { typ: "immer" } }];
    const historie = [{ spieltag: 1, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }];
    const r = pruefeEinsatz({ spieltag: 5, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }, klassen, historie, {});
    expect(r).toEqual({ erlaubt: true, gruende: [] });
  });

  it("Einsatz über dem Kontingent wird abgelehnt und nennt die Klasse", () => {
    const klassen = [{ id: "a", label: "Angriffs-Joker", mitglieder: ["duell.klau"], max: 1, proZeitraum: "saison", aktivierung: { typ: "immer" } }];
    const historie = [{ spieltag: 1, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }];
    const r = pruefeEinsatz({ spieltag: 5, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }, klassen, historie, {});
    expect(r.erlaubt).toBe(false);
    expect(r.gruende).toHaveLength(1);
    expect(r.gruende[0].klasseId).toBe("a");
    expect(r.gruende[0].grund).toContain("Angriffs-Joker");
  });
});

// ── Das Beispiel aus Abschnitt 2.1: drei überlagernde Klassen ─

describe("pruefeEinsatz — Abschnitt 2.1: drei überlagernde Klassen", () => {
  const klassen = [
    { id: "a", label: "Angriffs-Joker (Saison)", mitglieder: ["duell.klau", "duell.block"], max: 3, proZeitraum: "saison", aktivierung: { typ: "immer" } },
    { id: "b", label: "Angriffs-Joker (5 Spieltage)", mitglieder: ["duell.klau", "duell.block"], max: 1, proZeitraum: "nSpieltage", n: 5, aktivierung: { typ: "immer" } },
    { id: "c", label: "Alle Joker (Saison)", mitglieder: ["duell.klau", "duell.block", "joker.einzel"], max: 6, proZeitraum: "saison", aktivierung: { typ: "immer" } },
  ];
  // Ein Einsatz von u1 im selben 5er-Block (Spieltag 1) liegt bereits vor —
  // A (max 3) und C (max 6) haben noch Luft, B (max 1) ist damit voll.
  const historie = [{ spieltag: 1, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }];

  it("ist gegen A und C erlaubt, gegen B gesperrt — gruende nennt genau B", () => {
    const r = pruefeEinsatz({ spieltag: 3, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }, klassen, historie, {});
    expect(r.erlaubt).toBe(false);
    expect(r.gruende).toHaveLength(1);
    expect(r.gruende[0].klasseId).toBe("b");
  });

  it("derselbe Einsatz außerhalb des 5er-Blocks von B ist auch gegen B erlaubt", () => {
    const r = pruefeEinsatz({ spieltag: 8, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }, klassen, historie, {});
    expect(r).toEqual({ erlaubt: true, gruende: [] });
  });
});

// ── Zwei Klassen verletzt, beide werden genannt ──────────────

describe("pruefeEinsatz — mehrere gleichzeitige Verstöße", () => {
  it("ein Einsatz, der gegen zwei Klassen verstößt, nennt beide in gruende", () => {
    const klassen = [
      { id: "b", mitglieder: ["duell.klau", "duell.block"], max: 1, proZeitraum: "nSpieltage", n: 5, aktivierung: { typ: "immer" } },
      { id: "d", mitglieder: ["duell.klau"], max: 1, proZeitraum: "saison", aktivierung: { typ: "immer" } },
      { id: "a", mitglieder: ["duell.klau", "duell.block"], max: 3, proZeitraum: "saison", aktivierung: { typ: "immer" } },
    ];
    const historie = [{ spieltag: 1, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }];
    const r = pruefeEinsatz({ spieltag: 3, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }, klassen, historie, {});
    expect(r.erlaubt).toBe(false);
    expect(r.gruende.map((g) => g.klasseId).sort()).toEqual(["b", "d"]);
  });

  it("eine Joker-Art, die in zwei Klassen Mitglied ist, zählt in beiden hoch", () => {
    const klassen = [
      { id: "e", mitglieder: ["duell.klau", "duell.block"], max: 2, proZeitraum: "saison", aktivierung: { typ: "immer" } },
      { id: "f", mitglieder: ["duell.klau"], max: 2, proZeitraum: "saison", aktivierung: { typ: "immer" } },
    ];
    const historie = [
      { spieltag: 1, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" },
      { spieltag: 2, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" },
    ];
    // Vor diesem dritten Einsatz stehen E und F beide schon bei 2 von 2 —
    // derselbe historische Klau zählt unabhängig in beiden Klassen hoch.
    const r = pruefeEinsatz({ spieltag: 3, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }, klassen, historie, {});
    expect(r.erlaubt).toBe(false);
    expect(r.gruende.map((g) => g.klasseId).sort()).toEqual(["e", "f"]);
  });
});

// ── Jede der acht Aktivierungs-Bedingungen ───────────────────

describe("pruefeEinsatz — Aktivierungs-Bedingungen (Abschnitt 2.2)", () => {
  // Klasse mit max: 0 — sobald sie aktiv ist, blockiert JEDER passende
  // Einsatz. So lässt sich die Aktivierung selbst isoliert testen.
  const basisKlasse = (aktivierung) => ([{
    id: "x", mitglieder: ["testArt"], max: 0, proZeitraum: "saison", aktivierung,
  }]);

  it("immer: Klasse ist sofort aktiv", () => {
    const r = pruefeEinsatz({ spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, basisKlasse({ typ: "immer" }), [], {});
    expect(r.erlaubt).toBe(false);
    expect(r.gruende[0].klasseId).toBe("x");
  });

  it("abSpieltag: aktiv erst ab Spieltag N", () => {
    const klassen = basisKlasse({ typ: "abSpieltag", wert: 10 });
    const vorher = pruefeEinsatz({ spieltag: 5, jokerArt: "testArt", vonUserId: "u1" }, klassen, [], {});
    const nachher = pruefeEinsatz({ spieltag: 10, jokerArt: "testArt", vonUserId: "u1" }, klassen, [], {});
    expect(vorher.erlaubt).toBe(true);
    expect(nachher.erlaubt).toBe(false);
  });

  it("fenster: aktiv nur innerhalb von von/bis", () => {
    const klassen = basisKlasse({ typ: "fenster", von: 5, bis: 10 });
    const davor = pruefeEinsatz({ spieltag: 3, jokerArt: "testArt", vonUserId: "u1" }, klassen, [], { spieltage: 34 });
    const drin = pruefeEinsatz({ spieltag: 7, jokerArt: "testArt", vonUserId: "u1" }, klassen, [], { spieltage: 34 });
    const danach = pruefeEinsatz({ spieltag: 15, jokerArt: "testArt", vonUserId: "u1" }, klassen, [], { spieltage: 34 });
    expect(davor.erlaubt).toBe(true);
    expect(drin.erlaubt).toBe(false);
    expect(danach.erlaubt).toBe(true);
  });

  it("abRueckstand: aktiv erst ab N Punkten Rückstand auf Platz 1", () => {
    const klassen = basisKlasse({ typ: "abRueckstand", wert: 20 });
    const knapp = pruefeEinsatz(
      { spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 10 }, { userId: "u2", total: 15 }] },
    );
    const weit = pruefeEinsatz(
      { spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 0 }, { userId: "u2", total: 25 }] },
    );
    expect(knapp.erlaubt).toBe(true);
    expect(weit.erlaubt).toBe(false);
  });

  it("abVorsprung: aktiv erst ab N Punkten Vorsprung", () => {
    const klassen = basisKlasse({ typ: "abVorsprung", wert: 20 });
    const knapp = pruefeEinsatz(
      { spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 12 }, { userId: "u2", total: 10 }] },
    );
    const weit = pruefeEinsatz(
      { spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 30 }, { userId: "u2", total: 5 }] },
    );
    expect(knapp.erlaubt).toBe(true);
    expect(weit.erlaubt).toBe(false);
  });

  it("nachEreignis: aktiv erst nachdem der Ereignis-Key ausgelöst hat", () => {
    const klassen = basisKlasse({ typ: "nachEreignis", ereignisKey: "serie" });
    const ohne = pruefeEinsatz({ spieltag: 5, jokerArt: "testArt", vonUserId: "u1" }, klassen, [], { ausgeloesteEreignisse: [] });
    const mit = pruefeEinsatz(
      { spieltag: 5, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { ausgeloesteEreignisse: [{ userId: "u1", ereignisKey: "serie", spieltag: 3 }] },
    );
    expect(ohne.erlaubt).toBe(true);
    expect(mit.erlaubt).toBe(false);
  });

  it("abBudget: aktiv erst ab N Budget", () => {
    const klassen = basisKlasse({ typ: "abBudget", wert: 5 });
    const wenig = pruefeEinsatz({ spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [], { budgetStand: { u1: 2 } });
    const genug = pruefeEinsatz({ spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [], { budgetStand: { u1: 10 } });
    expect(wenig.erlaubt).toBe(true);
    expect(genug.erlaubt).toBe(false);
  });

  it("nurGegenFuehrende: aktiv nur bei Einsätzen gegen die ersten N", () => {
    const klassen = basisKlasse({ typ: "nurGegenFuehrende", plaetze: 1 });
    const board = [{ userId: "u1", total: 10 }, { userId: "u2", total: 20 }];
    const gegenFuehrenden = pruefeEinsatz({ spieltag: 1, jokerArt: "testArt", vonUserId: "u1", aufUserId: "u2" }, klassen, [], { board });
    const gegenAndere = pruefeEinsatz({ spieltag: 1, jokerArt: "testArt", vonUserId: "u2", aufUserId: "u1" }, klassen, [], { board });
    expect(gegenFuehrenden.erlaubt).toBe(false);
    expect(gegenAndere.erlaubt).toBe(true);
  });

  // Pflichttest 5 (design/joker-ausloeser.md, Abschnitt 2b): abSpannung
  // erlaubt bei engem Stand und sperrt bei weitem — unterSpannung umgekehrt.
  it("abSpannung: aktiv nur solange die Tabelle eng beieinander liegt (relativ)", () => {
    const klassen = basisKlasse({
      typ: "abSpannung", wert: 0.75,
      spannung: { bezug: "ersterZweiter", art: "relativ" },
    });
    const eng = pruefeEinsatz(
      { spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 100 }, { userId: "u2", total: 90 }] }, // 0.9 >= 0.75
    );
    const weit = pruefeEinsatz(
      { spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 100 }, { userId: "u2", total: 20 }] }, // 0.2 < 0.75
    );
    expect(eng.erlaubt).toBe(false); // Klasse aktiv (eng), max 0 blockiert
    expect(weit.erlaubt).toBe(true); // Klasse inaktiv (weit), Kontingent greift nicht
  });

  it("unterSpannung: aktiv nur wenn jemand davonzieht (relativ) — umgekehrt zu abSpannung", () => {
    const klassen = basisKlasse({
      typ: "unterSpannung", wert: 0.4,
      spannung: { bezug: "ersterZweiter", art: "relativ" },
    });
    const eng = pruefeEinsatz(
      { spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 100 }, { userId: "u2", total: 90 }] }, // 0.9, nicht < 0.4
    );
    const weit = pruefeEinsatz(
      { spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 100 }, { userId: "u2", total: 20 }] }, // 0.2 < 0.4
    );
    expect(eng.erlaubt).toBe(true); // Klasse inaktiv (kein Davonziehen)
    expect(weit.erlaubt).toBe(false); // Klasse aktiv (jemand zieht davon), max 0 blockiert
  });

  it("abSpannung mit art: absolut vergleicht in umgekehrter Richtung (kleiner Abstand = eng)", () => {
    const klassen = basisKlasse({
      typ: "abSpannung", wert: 15,
      spannung: { bezug: "ersterZweiter", art: "absolut" },
    });
    const eng = pruefeEinsatz(
      { spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 100 }, { userId: "u2", total: 90 }] }, // Abstand 10 <= 15
    );
    const weit = pruefeEinsatz(
      { spieltag: 1, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 100 }, { userId: "u2", total: 50 }] }, // Abstand 50 > 15
    );
    expect(eng.erlaubt).toBe(false); // aktiv (Abstand klein genug)
    expect(weit.erlaubt).toBe(true); // inaktiv (Abstand zu groß)
  });
});

// ── 2b: die Abstands-Bedingung entscheidet sich pro Spieltag NEU ────
// Pflichttest 6 (design/joker-ausloeser.md, Abschnitt 2b): dieselbe Klasse
// ist an Spieltag 5 gesperrt und an Spieltag 20 erlaubt, wenn sich der Stand
// dazwischen ändert — Beweis, dass die Bedingung nicht festhängt (keine
// Kalender-Regel im Spannungs-Gewand).
describe("2b — Abstands-Bedingung entscheidet sich pro Spieltag neu", () => {
  it("dieselbe Klasse ist an Spieltag 5 (enger Stand) gesperrt und an Spieltag 20 (Stand danach auseinandergezogen) erlaubt", () => {
    const klassen = [{
      id: "x", mitglieder: ["testArt"], max: 0, proZeitraum: "saison",
      aktivierung: { typ: "abSpannung", wert: 0.75, spannung: { bezug: "ersterZweiter", art: "relativ" } },
    }];

    const spieltag5 = pruefeEinsatz(
      { spieltag: 5, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 40 }, { userId: "u2", total: 38 }] }, // 38/40 = 0.95, eng
    );
    const spieltag20 = pruefeEinsatz(
      { spieltag: 20, jokerArt: "testArt", vonUserId: "u1" }, klassen, [],
      { board: [{ userId: "u1", total: 160 }, { userId: "u2", total: 60 }] }, // 60/160 = 0.375, weit
    );

    expect(spieltag5.erlaubt).toBe(false);
    expect(spieltag20.erlaubt).toBe(true);
  });
});

// ── 2b Nachtrag: wirkung — Kontingent vs. Erlaubnis-Fenster ──
// design/joker-ausloeser.md, „Nachtrag zur Abnahme (02.08.): die Bedingung
// stand auf dem Kopf". `wirkung: "nurWennAktiv"` macht eine
// Aktivierungs-Bedingung selbst zum Ablehnungsgrund, statt sie nur ein
// Kontingent steuern zu lassen.
describe("pruefeEinsatz — wirkung: nurWennAktiv (2b Nachtrag)", () => {
  // Pflichttest 2: exakt der Satz aus der Spec — ERLAUBT bei engem Stand,
  // SPERRT bei weitem Stand, ohne max: 0 und ohne gedankliche Umkehr.
  it("nurWennAktiv mit abSpannung: erlaubt bei engem Stand, sperrt bei weitem Stand — ohne max: 0", () => {
    const klassen = [{
      id: "x", label: "Klau-Joker", mitglieder: ["duell.klau"], max: 3, proZeitraum: "saison",
      wirkung: "nurWennAktiv",
      aktivierung: { typ: "abSpannung", wert: 0.75, spannung: { bezug: "ersterZweiter", art: "relativ" } },
    }];
    const eng = pruefeEinsatz(
      { spieltag: 1, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }, klassen, [],
      { board: [{ userId: "u1", total: 100 }, { userId: "u2", total: 90 }] }, // 0.9 >= 0.75, eng
    );
    const weit = pruefeEinsatz(
      { spieltag: 1, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }, klassen, [],
      { board: [{ userId: "u1", total: 100 }, { userId: "u2", total: 20 }] }, // 0.2 < 0.75, weit
    );
    expect(eng.erlaubt).toBe(true);
    expect(weit.erlaubt).toBe(false);
  });

  // Pflichttest 3: dieselbe Klasse als kontingent (Vorgabe) verhält sich
  // weiterhin wie bisher — also gerade NICHT so: "weit" bleibt erlaubt, weil
  // eine inaktive Klasse mit wirkung "kontingent" gar nichts einschränkt.
  it("dieselbe Klasse als wirkung: kontingent (Vorgabe) sperrt bei weitem Stand NICHT", () => {
    const klassen = [{
      id: "x", label: "Klau-Joker", mitglieder: ["duell.klau"], max: 3, proZeitraum: "saison",
      wirkung: "kontingent",
      aktivierung: { typ: "abSpannung", wert: 0.75, spannung: { bezug: "ersterZweiter", art: "relativ" } },
    }];
    const eng = pruefeEinsatz(
      { spieltag: 1, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }, klassen, [],
      { board: [{ userId: "u1", total: 100 }, { userId: "u2", total: 90 }] }, // eng, aktiv, zählt gegen max
    );
    const weit = pruefeEinsatz(
      { spieltag: 1, jokerArt: "duell.klau", vonUserId: "u1", aufUserId: "u2" }, klassen, [],
      { board: [{ userId: "u1", total: 100 }, { userId: "u2", total: 20 }] }, // weit, inaktiv, kein Kontingent-Effekt
    );
    expect(eng.erlaubt).toBe(true);
    expect(weit.erlaubt).toBe(true);
  });

  // Pflichttest 4: nurWennAktiv funktioniert auch mit einer
  // nicht-spannungsbezogenen Aktivierung.
  it("nurWennAktiv mit abSpieltag: vor dem Spieltag gesperrt, danach erlaubt", () => {
    const klassen = [{
      id: "x", label: "Spätzünder-Joker", mitglieder: ["testArt"], max: 3, proZeitraum: "saison",
      wirkung: "nurWennAktiv",
      aktivierung: { typ: "abSpieltag", wert: 10 },
    }];
    const vorher = pruefeEinsatz({ spieltag: 5, jokerArt: "testArt", vonUserId: "u1" }, klassen, [], {});
    const nachher = pruefeEinsatz({ spieltag: 10, jokerArt: "testArt", vonUserId: "u1" }, klassen, [], {});
    expect(vorher.erlaubt).toBe(false);
    expect(nachher.erlaubt).toBe(true);
  });

  // Pflichttest 5: ist die Klasse aktiv, greift max weiter wie bisher — die
  // beiden Wege (Kontingent und Erlaubnis-Fenster) dürfen sich nicht
  // widersprechen.
  it("nurWennAktiv UND aktiv: max blockiert weiterhin bei ausgeschöpftem Kontingent", () => {
    const klassen = [{
      id: "x", label: "Spätzünder-Joker", mitglieder: ["testArt"], max: 1, proZeitraum: "saison",
      wirkung: "nurWennAktiv",
      aktivierung: { typ: "abSpieltag", wert: 10 },
    }];
    const historie = [{ spieltag: 10, jokerArt: "testArt", vonUserId: "u1" }];
    const r = pruefeEinsatz({ spieltag: 15, jokerArt: "testArt", vonUserId: "u1" }, klassen, historie, {});
    expect(r.erlaubt).toBe(false);
    expect(r.gruende).toHaveLength(1);
    expect(r.gruende[0].klasseId).toBe("x");
    // Grund ist das ausgeschöpfte Kontingent, nicht "nicht offen" — die
    // Klasse IST aktiv.
    expect(r.gruende[0].grund).toMatch(/Kontingent/);
    expect(r.gruende[0].grund).not.toMatch(/nicht offen/);
  });

  // Pflichttest 6: der Grund nennt die Klasse UND dass sie nicht offen ist.
  it("nurWennAktiv UND inaktiv: der Grund nennt Klasse und Nicht-Offen-Sein", () => {
    const klassen = [{
      id: "x", label: "Spätzünder-Joker", mitglieder: ["testArt"], max: 3, proZeitraum: "saison",
      wirkung: "nurWennAktiv",
      aktivierung: { typ: "abSpieltag", wert: 10 },
    }];
    const r = pruefeEinsatz({ spieltag: 5, jokerArt: "testArt", vonUserId: "u1" }, klassen, [], {});
    expect(r.erlaubt).toBe(false);
    expect(r.gruende).toHaveLength(1);
    expect(r.gruende[0].klasseId).toBe("x");
    expect(r.gruende[0].grund).toContain("Spätzünder-Joker");
    expect(r.gruende[0].grund).toMatch(/nicht offen/);
  });
});

// ── offeneKlassen ─────────────────────────────────────────────

describe("offeneKlassen", () => {
  it("liefert nur Klassen, deren Aktivierung gerade erfüllt ist", () => {
    const klassen = [
      { id: "a", mitglieder: ["x"], max: 1, proZeitraum: "saison", aktivierung: { typ: "immer" } },
      { id: "b", mitglieder: ["x"], max: 1, proZeitraum: "saison", aktivierung: { typ: "abSpieltag", wert: 20 } },
    ];
    const frueh = offeneKlassen(klassen, "u1", { aktuellerSpieltag: 5, spieltage: 34 });
    const spaet = offeneKlassen(klassen, "u1", { aktuellerSpieltag: 25, spieltage: 34 });
    expect(frueh.map((k) => k.id)).toEqual(["a"]);
    expect(spaet.map((k) => k.id).sort()).toEqual(["a", "b"]);
  });

  it("ohne bekannten aktuellen Spieltag gilt eine erreichbare Bedingung als offen", () => {
    const klassen = [{ id: "a", mitglieder: ["x"], max: 1, proZeitraum: "saison", aktivierung: { typ: "abSpieltag", wert: 20 } }];
    const r = offeneKlassen(klassen, "u1", { spieltage: 34 });
    expect(r.map((k) => k.id)).toEqual(["a"]);
  });

  it("leere Klassenliste liefert eine leere Liste", () => {
    expect(offeneKlassen([], "u1", {})).toEqual([]);
  });
});

// ── beschreibeKlasse ────────────────────────────────────────

describe("beschreibeKlasse", () => {
  it("liefert einen Satz mit Label und Kontingent", () => {
    const klasse = { id: "a", label: "Angriffs-Joker", mitglieder: ["duell.klau"], max: 3, proZeitraum: "saison", aktivierung: { typ: "immer" } };
    const text = beschreibeKlasse(klasse, 34);
    expect(text).toContain("Angriffs-Joker");
    expect(text).toContain("3");
  });

  it("nennt bei nSpieltage die Blockgröße", () => {
    const klasse = { id: "a", label: "Angriffs-Joker", mitglieder: ["duell.klau"], max: 1, proZeitraum: "nSpieltage", n: 5, aktivierung: { typ: "immer" } };
    expect(beschreibeKlasse(klasse, 34)).toContain("5 Spieltage");
  });

  it("liefert einen leeren String für eine ungültige Klasse", () => {
    expect(beschreibeKlasse({ mitglieder: [], aktivierung: { typ: "immer" } }, 34)).toBe("");
  });

  // 2b Nachtrag: die Wirkung muss im Text stehen, sonst sehen zwei Klassen
  // mit gleichem Kontingent identisch aus, obwohl sie Gegenteiliges tun.
  it("nennt die Wirkung, damit kontingent und nurWennAktiv sich im Text unterscheiden", () => {
    const basis = { id: "a", label: "Klau-Joker", mitglieder: ["duell.klau"], max: 3, proZeitraum: "saison", aktivierung: { typ: "immer" } };
    const kontingentText = beschreibeKlasse({ ...basis, wirkung: "kontingent" }, 34);
    const nurWennAktivText = beschreibeKlasse({ ...basis, wirkung: "nurWennAktiv" }, 34);
    expect(kontingentText).not.toBe(nurWennAktivText);
  });
});
