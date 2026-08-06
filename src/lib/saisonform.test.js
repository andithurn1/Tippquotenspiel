import { describe, it, expect } from "vitest";
import {
  KURVEN, KURVE, SAISONFORM_LIMITS, DEFAULT_SAISONFORM,
  sanitizeSaisonform, gewichte, anwenden, beschreibeSaisonform, applySaisonform,
} from "@/lib/saisonform";
import { DEFAULT_RULES, sanitizeRules, scoreLeaderboardHistory, brauchtVerlauf } from "@/lib/engine";
import { DEFAULT_DUELL } from "@/lib/duellJoker";

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

  it("es bleibt immer mindestens ein Spieltag stehen", () => {
    // Sonst stünden am 2. Spieltag einer Runde mit „3 Streichern" alle bei
    // null, und die Tabelle wäre so lange leer, bis genug Spieltage zusammen
    // sind. Ein Zwischenstand, den es aus Regelgründen nicht gibt, sieht wie
    // ein Fehler aus — und der Spieler kann nicht wissen, dass er keiner ist.
    const r = anwenden(saison, { streich: 8 });
    expect(r.gestrichen).toHaveLength(4);
    expect(r.total).toBe(100);          // der beste Spieltag bleibt
    const zwei = anwenden([s("a", 40), s("b", 10)], { streich: 3 });
    expect(zwei.total).toBe(40);
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

// ── Anbindung an den Verlauf ────────────────────────────────
describe("applySaisonform", () => {
  // Verlauf wie aus scoreLeaderboardHistory: kumulative Stände je Spieltag.
  const verlauf = (proNutzer) => {
    const tage = proNutzer[Object.keys(proNutzer)[0]].length;
    return Array.from({ length: tage }, (_, i) => ({
      wettbewerb: "bl", matchday: i + 1,
      board: Object.entries(proNutzer).map(([userId, punkte]) => ({
        userId, name: userId,
        total: punkte.slice(0, i + 1).reduce((a, b) => a + b, 0),
        tips: i + 1, gewertet: i + 1,
      })).sort((a, b) => b.total - a.total),
    }));
  };

  it("ist die Regel aus, bleibt der Verlauf unangetastet", () => {
    const v = verlauf({ a: [10, 20, 30] });
    expect(applySaisonform(v, {})).toBe(v);
    expect(applySaisonform(v, { saisonform: DEFAULT_SAISONFORM })).toBe(v);
  });

  it("Streicher wirken auf jede Stufe des Verlaufs", () => {
    const v = verlauf({ a: [100, 5, 90], b: [70, 70, 70] });
    const r = applySaisonform(v, { saisonform: { streich: 1 } });
    // Letzte Stufe: A verliert seinen 5er, B einen 70er.
    const letzte = r[r.length - 1].board;
    expect(letzte.find((z) => z.userId === "a").total).toBe(190);
    expect(letzte.find((z) => z.userId === "b").total).toBe(140);
    expect(letzte[0].userId).toBe("a");
  });

  it("jede Stufe rechnet nur mit den bis dahin gespielten Spieltagen", () => {
    // Der Zwischenstand muss aus sich heraus stimmen, nicht aus der Sicht
    // des Saisonendes.
    const v = verlauf({ a: [100, 5, 90] });
    const r = applySaisonform(v, { saisonform: { streich: 1 } });
    expect(r[0].board[0].total).toBe(100);   // ein Spieltag → nichts gestrichen
    expect(r[1].board[0].total).toBe(100);   // der 5er fällt weg
    expect(r[2].board[0].total).toBe(190);
  });

  it("die Tabelle wird nach der neuen Summe neu sortiert", () => {
    const v = verlauf({ fuehrend: [100, 100, 0], stetig: [70, 70, 70] });
    const r = applySaisonform(v, { saisonform: { streich: 1 } });
    const letzte = r[r.length - 1].board;
    expect(letzte[0].userId).toBe("fuehrend");
    expect(letzte[0].total).toBe(200);
  });

  // ⚠️ Nicht getippt ist nicht dasselbe wie null Punkte.
  it("ein ausgelassener Spieltag wird nicht als Nullrunde gestrichen", () => {
    const v = [
      { wettbewerb: "bl", matchday: 1, board: [{ userId: "a", name: "a", total: 80, tips: 1, gewertet: 1 }] },
      // Spieltag 2 ausgelassen: Summe unverändert, `gewertet` unverändert.
      { wettbewerb: "bl", matchday: 2, board: [{ userId: "a", name: "a", total: 80, tips: 1, gewertet: 1 }] },
      { wettbewerb: "bl", matchday: 3, board: [{ userId: "a", name: "a", total: 100, tips: 2, gewertet: 2 }] },
    ];
    const r = applySaisonform(v, { saisonform: { streich: 1 } });
    // Gestrichen wird der schwächere GETIPPTE (20), nicht die Nichtteilnahme.
    expect(r[2].board[0].total).toBe(80);
  });
});

// ── Verdrahtung in der Engine ───────────────────────────────
// Der Beweis, dass die Saisonform im echten Verlauf ankommt — und nicht nur
// als Modul danebenliegt. Genau die Lücke, die bei den Quoten-Dateien zweimal
// unbemerkt geblieben war.
describe("scoreLeaderboardHistory nimmt die Saisonform an", () => {
  const eintrag = (userId, matchday, punkte) => ({
    userId, name: userId, matchday, wettbewerb: "bl",
    matchId: `m${matchday}-${userId}`,
    tip: { home: 1, away: 0 },
    result: { home: 1, away: 0 },
    // Ein Snapshot, dessen Quote die Punktzahl steuert: je kleiner die Quote,
    // desto weniger Punkte. So lassen sich starke und schwache Spieltage bauen.
    snapshot: {
      matchId: `m${matchday}-${userId}`,
      winner: { home: punkte, draw: 4, away: 6 },
      correctScore: [[punkte, 5, 9], [6, 7, 11], [12, 14, 20]],
      teamGoals: { home: [2, 3, 6], away: [4, 3, 4] },
      margin: { home: [0, 3, 7], away: [0, 3, 7] },
    },
  });

  const eintraege = [
    ...[1, 2, 3].map((md) => eintrag("a", md, md === 2 ? 1.05 : 9)),
    ...[1, 2, 3].map((md) => eintrag("b", md, 4)),
  ];

  it("ohne Saisonform bleibt alles wie bisher", () => {
    const ohne = scoreLeaderboardHistory(eintraege, DEFAULT_RULES);
    const mitFlach = scoreLeaderboardHistory(eintraege, sanitizeRules({
      ...DEFAULT_RULES, saisonform: { kurve: "flach", streich: 0 },
    }));
    expect(mitFlach).toEqual(ohne);
  });

  it("ein Streicher verändert den Endstand", () => {
    const ohne = scoreLeaderboardHistory(eintraege, DEFAULT_RULES);
    const mit = scoreLeaderboardHistory(eintraege, sanitizeRules({
      ...DEFAULT_RULES, saisonform: { streich: 1 },
    }));
    const summe = (v) => v[v.length - 1].board.reduce((s, z) => s + z.total, 0);
    expect(summe(mit)).toBeLessThan(summe(ohne));
  });

  it("die Saisonform reist über sanitizeRules mit", () => {
    const r = sanitizeRules({ ...DEFAULT_RULES, saisonform: { kurve: "endspurt", streich: 99 } });
    expect(r.saisonform.kurve).toBe("endspurt");
    expect(r.saisonform.streich).toBe(SAISONFORM_LIMITS.streich.max);
    expect(sanitizeRules(r)).toEqual(r);
  });
});

// ── brauchtVerlauf: die Naht zum Store ──────────────────────
// Der Endstand kam bisher nur dann aus dem Verlauf, wenn der Aufhol-Bonus an
// war (`rules.aufholen?.enabled`, in BEIDEN Store-Dateien). Mit der Saisonform
// war das still falsch: Streicher und Gewichtung wurden im Leaderboard
// schlicht nicht angewandt, außer der Bonus war zufällig auch an. Die Frage
// gehört deshalb an eine Stelle.
describe("brauchtVerlauf", () => {
  it("ohne verlaufsabhängige Regel genügt die Summe", () => {
    expect(brauchtVerlauf(DEFAULT_RULES)).toBe(false);
  });

  it("der Aufhol-Bonus braucht den Verlauf", () => {
    expect(brauchtVerlauf({ ...DEFAULT_RULES, aufholen: { enabled: true } })).toBe(true);
  });

  it("Streicher brauchen ihn auch", () => {
    expect(brauchtVerlauf({ ...DEFAULT_RULES, saisonform: { streich: 2 } })).toBe(true);
  });

  it("eine Gewichtungskurve ebenso", () => {
    expect(brauchtVerlauf({ ...DEFAULT_RULES, saisonform: { kurve: "endspurt" } })).toBe(true);
  });

  it("eine flache Kurve ohne Streicher ist kein Grund", () => {
    expect(brauchtVerlauf({ ...DEFAULT_RULES, saisonform: { kurve: "flach", streich: 0 } })).toBe(false);
  });

  it("kommt mit fehlenden Regeln klar", () => {
    expect(brauchtVerlauf({})).toBe(false);
    expect(brauchtVerlauf()).toBe(false);
  });

  // Pflichttest 5 (design/joker-einhaengen.md): ein aktiver Duell-Joker
  // braucht den Verlauf ebenso — sonst fielen die Überweisungen still unter
  // den Tisch, weil `getLeaderboard` ohne Verlauf rechnet.
  it("der Duell-Joker braucht den Verlauf, wenn er aktiv ist", () => {
    expect(brauchtVerlauf({ ...DEFAULT_RULES, duell: { ...DEFAULT_DUELL, enabled: true } })).toBe(true);
  });

  it("ein inaktiver Duell-Joker ändert nichts", () => {
    expect(brauchtVerlauf({ ...DEFAULT_RULES, duell: { ...DEFAULT_DUELL, enabled: false } })).toBe(false);
  });
});

// Die Anzeige braucht die Zahl an der Zeile — sonst sieht der Spieler eine
// Summe, die nicht zu seinen Spieltagen passt, und kann sich das nicht erklären.
describe("applySaisonform beschriftet die Zeilen", () => {
  const verlauf3 = [1, 2, 3].map((md) => ({
    wettbewerb: "bl", matchday: md,
    board: [{ userId: "a", name: "a", total: [100, 105, 195][md - 1], tips: md, gewertet: md }],
  }));

  it("nennt, wie viele Spieltage gestrichen wurden", () => {
    const r = applySaisonform(verlauf3, { saisonform: { streich: 1 } });
    expect(r[2].board[0].gestrichen).toBe(1);
    expect(r[2].board[0].vorlaeufig).toBe(true);
  });

  it("ohne Streicher steht dort nichts Irreführendes", () => {
    const r = applySaisonform(verlauf3, { saisonform: { kurve: "endspurt" } });
    expect(r[2].board[0].gestrichen).toBe(0);
    expect(r[2].board[0].vorlaeufig).toBe(false);
  });
});

// 🔴 Gemessen am 06.08.2026: das Ranking zeigte „5049.67" — in einer Tabelle,
// in der jede andere Zahl ganzzahlig ist. Und die KURVE verschob den Stand um
// bis zu 186 Punkte, ohne dass irgendwo etwas dazu stand: die Streicher hatten
// längst eine Marke, die Kurve nicht.
describe("Was die Saisonform am Board verändert, bekommt einen Namen", () => {
  const verlauf = (n) => {
    const board = [];
    const out = [];
    let summe = 0;
    for (let i = 1; i <= n; i++) {
      summe += 100 + i;
      out.push({
        wettbewerb: "bl", matchday: i,
        board: [{ userId: "u1", name: "Eins", total: summe, gewertet: i, tips: i }],
      });
    }
    return out;
  };

  it("das Total ist ganzzahlig — auch wenn die Kurve mit Faktoren rechnet", () => {
    const v = applySaisonform(verlauf(10), { saisonform: { kurve: "steigend", streich: 0 } });
    for (const stufe of v) {
      for (const z of stufe.board) expect(Number.isInteger(z.total)).toBe(true);
    }
  });

  it("`form` benennt genau das, was die Kurve verschoben hat", () => {
    const roh = verlauf(10);
    const v = applySaisonform(roh, { saisonform: { kurve: "steigend", streich: 0 } });
    const letzte = v[v.length - 1].board[0];
    const rohTotal = roh[roh.length - 1].board[0].total;
    // Ohne Streicher ist die Kurve die EINZIGE Ursache — `form` muss die ganze
    // Differenz tragen, sonst erklärt die Marke nur die Hälfte.
    expect(letzte.form).toBe(letzte.total - rohTotal);
  });

  it("bei flacher Kurve gibt es nichts zu erklären: `form` ist null", () => {
    const v = applySaisonform(verlauf(10), { saisonform: { kurve: "flach", streich: 2 } });
    expect(v[v.length - 1].board[0].form).toBeNull();
  });

  it("`gestrichenPunkte` nennt den Betrag, nicht nur die Anzahl", () => {
    const v = applySaisonform(verlauf(10), { saisonform: { kurve: "flach", streich: 2 } });
    const z = v[v.length - 1].board[0];
    expect(z.gestrichen).toBe(2);
    // Zwei Spieltage à gut 100 Punkte — der Betrag muss in dieser Größenordnung
    // liegen, nicht bei 2.
    expect(z.gestrichenPunkte).toBeGreaterThan(100);
  });
});
