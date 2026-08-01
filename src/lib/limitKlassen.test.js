import { describe, it, expect } from "vitest";
import {
  AKTIVIERUNG_TYPEN, PRO_ZEITRAUM, LIMIT_KLASSEN_LIMITS, DEFAULT_LIMIT_KLASSEN,
  sanitizeLimitKlassen, pruefeEinsatz, offeneKlassen, beschreibeKlasse, pruefeKlassen,
} from "./limitKlassen";

// ── Kataloge ────────────────────────────────────────────────

describe("Kataloge", () => {
  it("jeder Katalog-Eintrag hat key, label und desc, Keys sind eindeutig", () => {
    for (const liste of [AKTIVIERUNG_TYPEN, PRO_ZEITRAUM]) {
      for (const e of liste) expect(e.key && e.label && e.desc).toBeTruthy();
      expect(new Set(liste.map((e) => e.key)).size).toBe(liste.length);
    }
  });

  it("Abschnitt 2.2 nennt genau acht Aktivierungs-Typen", () => {
    expect(AKTIVIERUNG_TYPEN.map((t) => t.key).sort()).toEqual([
      "abBudget", "abRueckstand", "abSpieltag", "abVorsprung",
      "fenster", "immer", "nachEreignis", "nurGegenFuehrende",
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
});
