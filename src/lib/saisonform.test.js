import { describe, it, expect } from "vitest";
import {
  KURVEN, KURVE, SAISONFORM_LIMITS, DEFAULT_SAISONFORM,
  sanitizeSaisonform, gewichte, anwenden, beschreibeSaisonform,
} from "@/lib/saisonform";

// Ein Spieltag, wie ihn der Verlauf liefert.
const s = (key, punkte, getippt = true) => ({ key, punkte, getippt });

describe("Katalog", () => {
  it("jede Kurve ist vollständig beschrieben", () => {
    for (const k of KURVEN) {
      expect(k.key && k.label && k.text).toBeTruthy();
      expect(k.text.length).toBeGreaterThan(15);
    }
    expect(new Set(KURVEN.map((k) => k.key)).size).toBe(KURVEN.length);
  });

  it("die Vorgabe ändert nichts", () => {
    const flach = anwenden([s("a", 100), s("b", 50), s("c", 10)], DEFAULT_SAISONFORM);
    expect(flach.total).toBe(160);
    expect(flach.gestrichen).toEqual([]);
    expect(flach.vorlaeufig).toBe(false);
  });
});

describe("Bereinigung", () => {
  it("Unsinn fällt auf den Standard zurück", () => {
    expect(sanitizeSaisonform({ kurve: "gibtsnicht" }).kurve).toBe("flach");
    expect(sanitizeSaisonform()).toEqual(DEFAULT_SAISONFORM);
  });

  it("Werte werden beschnitten", () => {
    const c = sanitizeSaisonform({ streich: 99, staerke: 99 });
    expect(c.streich).toBe(SAISONFORM_LIMITS.streich.max);
    expect(c.staerke).toBe(SAISONFORM_LIMITS.staerke.max);
  });

  it("nurGetippte ist an, solange es niemand ausdrücklich abschaltet", () => {
    expect(sanitizeSaisonform({}).nurGetippte).toBe(true);
    expect(sanitizeSaisonform({ nurGetippte: undefined }).nurGetippte).toBe(true);
    expect(sanitizeSaisonform({ nurGetippte: false }).nurGetippte).toBe(false);
  });
});

// Der Kern der Gewichtung: sie verschiebt Gewicht, sie erzeugt keines.
describe("Gewichte — die Summe bleibt konstant", () => {
  for (const k of KURVEN) {
    it(`${k.key}: Mittelwert bleibt 1`, () => {
      const f = gewichte(k.key, 34, 2.0);
      const summe = f.reduce((a, b) => a + b, 0);
      expect(summe).toBeCloseTo(34, 3);
    });
  }

  it("ohne Normierung würde das Punkteniveau wandern — es tut es nicht", () => {
    // Sonst zöge die Anzeige-Skalierung mit, und ein „Endspurt" sähe aus wie
    // eine Punkteinflation.
    const gleich = Array.from({ length: 34 }, (_, i) => s(`t${i}`, 100));
    const flach = anwenden(gleich, { kurve: "flach" });
    for (const k of KURVEN) {
      const mit = anwenden(gleich, { kurve: k.key, staerke: 2.0 });
      expect(mit.total).toBeCloseTo(flach.total, 1);
    }
  });

  it("staerke 1.0 ist immer flach, egal welche Kurve", () => {
    for (const k of KURVEN) {
      const f = gewichte(k.key, 10, 1.0);
      for (const x of f) expect(x).toBeCloseTo(1, 5);
    }
  });

  it("steigend und endspurt gewichten hinten stärker als vorn", () => {
    for (const k of ["steigend", "endspurt", "rueckrunde"]) {
      const f = gewichte(k, 30, 2.0);
      expect(f[f.length - 1]).toBeGreaterThan(f[0]);
    }
  });

  it("kommt mit Randfällen klar", () => {
    expect(gewichte("steigend", 0)).toEqual([]);
    expect(gewichte("steigend", 1)).toHaveLength(1);
    expect(gewichte("steigend", 1)[0]).toBeCloseTo(1, 5);
  });
});

// Der eigentliche Zweck: ein früher Vorsprung soll weniger wert sein.
describe("Ein früher Vorsprung schmilzt", () => {
  it("wer vorn stark war, verliert gegen wen, der hinten stark war", () => {
    const n = 30;
    const frueh = Array.from({ length: n }, (_, i) => s(`t${i}`, i < n / 2 ? 120 : 80));
    const spaet = Array.from({ length: n }, (_, i) => s(`t${i}`, i < n / 2 ? 80 : 120));

    // Flach: beide gleichauf.
    expect(anwenden(frueh, { kurve: "flach" }).total)
      .toBeCloseTo(anwenden(spaet, { kurve: "flach" }).total, 1);

    // Endspurt: der Spätstarter zieht vorbei.
    const a = anwenden(frueh, { kurve: "endspurt", staerke: 2.0 }).total;
    const b = anwenden(spaet, { kurve: "endspurt", staerke: 2.0 }).total;
    expect(b).toBeGreaterThan(a);
  });
});

describe("Streichresultate", () => {
  const saison = [s("a", 100), s("b", 10), s("c", 80), s("d", 5), s("e", 60)];

  it("streicht die schlechtesten und nur so viele wie eingestellt", () => {
    const r = anwenden(saison, { streich: 2 });
    expect(r.gestrichen.sort()).toEqual(["b", "d"]);
    expect(r.total).toBe(240);
  });

  it("null streichen heißt nichts streichen", () => {
    expect(anwenden(saison, { streich: 0 }).gestrichen).toEqual([]);
  });

  it("mehr streichen als da sind, geht nicht schief", () => {
    const r = anwenden(saison, { streich: 8 });
    expect(r.gestrichen).toHaveLength(5);
    expect(r.total).toBe(0);
  });

  // ⚠️ Die Falle, an der dieses Feature sonst scheitert.
  it("ein NICHT getippter Spieltag wird nicht verschenkt", () => {
    // Sonst wird aus „ein Ausrutscher wird verziehen" ein „zwei Spieltage
    // darfst du schwänzen" — und das arbeitet gegen das Versäumnis-Modul.
    const mitLuecke = [s("a", 100), s("b", 0, false), s("c", 20)];
    const sicher = anwenden(mitLuecke, { streich: 1 });
    expect(sicher.gestrichen).toEqual(["c"]);   // nicht "b"

    const offen = anwenden(mitLuecke, { streich: 1, nurGetippte: false });
    expect(offen.gestrichen).toEqual(["b"]);
  });

  it("gestrichen wird nach dem GEWICHTETEN Wert, nicht nach rohen Punkten", () => {
    // Ein schwacher Spieltag mit hohem Gewicht kostet mehr als ein schwacher
    // mit niedrigem — genau den will man loswerden.
    const liste = [s("frueh", 30), s("mitte", 30), s("spaet", 32)];
    const r = anwenden(liste, { kurve: "endspurt", staerke: 2.5, streich: 1 });
    // „spaet" hat mehr rohe Punkte, wiegt aber so viel mehr, dass es NICHT
    // der kleinste Beitrag ist — gestrichen wird einer der frühen.
    expect(r.gestrichen[0]).not.toBe("spaet");
  });

  it("bei Gleichstand entscheidet der frühere — nicht die Eingabereihenfolge", () => {
    const a = anwenden([s("x", 10), s("y", 10), s("z", 90)], { streich: 1 });
    expect(a.gestrichen).toEqual(["x"]);
  });

  it("ein Zwischenstand mit Streichern ist vorläufig, und das steht dran", () => {
    expect(anwenden(saison, { streich: 1 }).vorlaeufig).toBe(true);
    expect(anwenden(saison, { streich: 0 }).vorlaeufig).toBe(false);
  });
});

describe("Aufschlüsselung", () => {
  it("jeder Spieltag nennt seinen Faktor und ob er zählte", () => {
    const r = anwenden([s("a", 100), s("b", 10)], { kurve: "endspurt", staerke: 2, streich: 1 });
    expect(r.detail).toHaveLength(2);
    for (const d of r.detail) {
      expect(d.key).toBeTruthy();
      expect(typeof d.faktor).toBe("number");
      expect(typeof d.gestrichen).toBe("boolean");
    }
    expect(r.detail.filter((d) => d.gestrichen)).toHaveLength(1);
  });
});

describe("Klartext für die Spielerstellung", () => {
  it("die Vorgabe sagt schlicht, dass alles gleich zählt", () => {
    expect(beschreibeSaisonform(DEFAULT_SAISONFORM)).toMatch(/gleich/i);
  });

  it("nennt das Verhältnis statt der Faktoren", () => {
    const t = beschreibeSaisonform({ kurve: "endspurt", staerke: 2.0 }, 34);
    expect(t).toMatch(/×/);
    expect(t).toMatch(/Endspurt/);
  });

  it("erwähnt die Streicher samt der Einschränkung auf Getipptes", () => {
    expect(beschreibeSaisonform({ streich: 2 })).toMatch(/getippt/i);
    expect(beschreibeSaisonform({ streich: 2, nurGetippte: false })).not.toMatch(/getippt hast/i);
  });
});
