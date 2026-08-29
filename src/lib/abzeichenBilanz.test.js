import { describe, it, expect } from "vitest";
import { bilanzAus, bilanzZusammen, bilanzAusUmfeld, LUECKEN } from "./abzeichenBilanz";
import { LEERE_BILANZ, erspielte, ABZEICHEN } from "./abzeichen";
import { createMockOddsSource, DEFAULT_RULES } from "./engine";

const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const ERGEBNIS = odds.getResult("JOR-ESP");

// Ein Eintrag, wie ihn die Wertung sieht. `matchday` trägt die Zeitachse.
let lauf = 0;
const eintrag = ({ userId, matchday, tip, result = ERGEBNIS, ersatz = false }) => {
  lauf += 1;
  return {
    userId, name: userId, matchday, matchId: `m${lauf}`,
    snapshot: SNAP, result, tip, ersatz,
  };
};

// Der exakt richtige Tipp, und einer, der weit daneben liegt.
const EXAKT = { home: ERGEBNIS.home, away: ERGEBNIS.away, goals: { home: [], away: [] } };
const DANEBEN = { home: ERGEBNIS.home + 4, away: ERGEBNIS.away + 4, goals: { home: [], away: [] } };

describe("Die Bilanz einer Runde", () => {
  it("ohne Nutzer gibt es nichts zu bilanzieren", () => {
    expect(bilanzAus({ eintraege: [], userId: null })).toEqual({});
  });

  it("zählt abgegebene Tipps und exakte Treffer", () => {
    const e = [
      eintrag({ userId: "a", matchday: 1, tip: EXAKT }),
      eintrag({ userId: "a", matchday: 2, tip: DANEBEN }),
      eintrag({ userId: "a", matchday: 3, tip: EXAKT }),
    ];
    const b = bilanzAus({ eintraege: e, userId: "a", rules: DEFAULT_RULES });
    expect(b.tipps).toBe(3);
    expect(b.exakteTreffer).toBe(2);
  });

  // 🔴 Ein Ersatz-Tipp ist die Kulanz der Runde, keine eigene Leistung — die
  // Wertung trennt das bereits (`e.ersatz`), und die Abzeichen müssen es
  // genauso sehen. Sonst trägt jemand „Immer dabei", der nie getippt hat.
  it("🔴 ein Ersatz-Tipp zählt NICHT als abgegebener Tipp", () => {
    const e = [
      eintrag({ userId: "a", matchday: 1, tip: EXAKT }),
      eintrag({ userId: "a", matchday: 2, tip: EXAKT, ersatz: true }),
    ];
    const b = bilanzAus({ eintraege: e, userId: "a" });
    expect(b.tipps).toBe(1);
    expect(b.exakteTreffer).toBe(1);
  });

  it("misst die Serie über SPIELTAGE, nicht über Tipps", () => {
    // Spieltag 1 und 3 getroffen, 2 ausgelassen: das ist keine Zweier-Serie.
    const e = [
      eintrag({ userId: "a", matchday: 1, tip: EXAKT }),
      eintrag({ userId: "a", matchday: 3, tip: EXAKT }),
      // damit Spieltag 2 überhaupt in der Reihenfolge auftaucht
      eintrag({ userId: "b", matchday: 2, tip: DANEBEN }),
    ];
    const b = bilanzAus({ eintraege: e, userId: "a" });
    expect(b.exaktSerie).toBe(1);
  });

  it("erkennt eine echte Serie", () => {
    const e = [1, 2, 3].map((md) => eintrag({ userId: "a", matchday: md, tip: EXAKT }));
    const b = bilanzAus({ eintraege: e, userId: "a" });
    expect(b.exaktSerie).toBe(3);
    expect(b.tippSerie).toBe(3);
  });

  // ⚠️ Der Pechvogel soll das Tippen begleiten, nicht das Nichtstun belohnen.
  it("⚠️ die Pech-Serie zählt nur Spieltage, an denen getippt wurde", () => {
    const e = [
      eintrag({ userId: "a", matchday: 1, tip: DANEBEN }),
      eintrag({ userId: "a", matchday: 2, tip: DANEBEN }),
      eintrag({ userId: "b", matchday: 3, tip: DANEBEN }),  // a hat ausgelassen
      eintrag({ userId: "a", matchday: 4, tip: DANEBEN }),
    ];
    const b = bilanzAus({ eintraege: e, userId: "a" });
    expect(b.ohneExaktSerie).toBe(2);
  });

  it("merkt sich, an welchem Spieltag der erste Treffer kam", () => {
    const e = [
      eintrag({ userId: "a", matchday: 1, tip: DANEBEN }),
      eintrag({ userId: "a", matchday: 2, tip: DANEBEN }),
      eintrag({ userId: "a", matchday: 3, tip: EXAKT }),
    ];
    expect(bilanzAus({ eintraege: e, userId: "a" }).ersterTrefferSpieltag).toBe(3);
  });

  it("ohne einen einzigen Treffer bleibt der erste Spieltag bei 0", () => {
    const e = [eintrag({ userId: "a", matchday: 1, tip: DANEBEN })];
    expect(bilanzAus({ eintraege: e, userId: "a" }).ersterTrefferSpieltag).toBe(0);
  });

  it("zählt Spieltage an der Spitze", () => {
    const e = [
      eintrag({ userId: "a", matchday: 1, tip: EXAKT }),
      eintrag({ userId: "b", matchday: 1, tip: DANEBEN }),
      eintrag({ userId: "a", matchday: 2, tip: DANEBEN }),
      eintrag({ userId: "b", matchday: 2, tip: EXAKT }),
    ];
    expect(bilanzAus({ eintraege: e, userId: "a" }).fuehrungSpieltage).toBe(1);
    expect(bilanzAus({ eintraege: e, userId: "b" }).fuehrungSpieltage).toBe(1);
  });

  it("stürzt bei kaputten Einträgen nicht ab", () => {
    expect(() => bilanzAus({ eintraege: [null, {}, { userId: "a" }], userId: "a" })).not.toThrow();
  });
});

// ============================================================
//  🔴 DIE LÜCKEN — sichtbar statt vergessen
// ============================================================
describe("Die Lücken", () => {
  // 🔴 Der Kern: was in `LUECKEN` steht, darf `bilanzAus` NICHT setzen. Sonst
  // wäre die Liste eine Beruhigung statt einer Aussage — und genau solche
  // Listen sind es, die man ein halbes Jahr später für vollständig hält.
  it("🔴 kein Feld, das als Lücke benannt ist, wird heimlich doch gefüllt", () => {
    const e = [1, 2, 3].map((md) => eintrag({ userId: "a", matchday: md, tip: EXAKT }));
    const b = bilanzAus({ eintraege: e, userId: "a" });
    for (const feld of Object.keys(LUECKEN)) {
      expect(b[feld], `${feld} steht in LUECKEN, wird aber gesetzt`).toBeUndefined();
    }
  });

  it("jede Lücke nennt einen Grund und ein echtes Bilanz-Feld", () => {
    for (const [feld, grund] of Object.entries(LUECKEN)) {
      expect(Object.keys(LEERE_BILANZ), `${feld} gibt es in der Bilanz gar nicht`).toContain(feld);
      expect(grund.length, feld).toBeGreaterThan(20);
    }
  });

  // ⚠️ Die Zahl, die den Stand ehrlich hält. Sie darf nur SINKEN — wer ein
  // Signal anschließt, streicht die Lücke.
  it("⚠️ die Zahl der Lücken ist festgehalten und darf nur kleiner werden", () => {
    expect(Object.keys(LUECKEN).length).toBeLessThanOrEqual(11);
  });
});

describe("Mehrere Runden zu einem Konto", () => {
  it("Mengen addieren sich", () => {
    const z = bilanzZusammen([{ tipps: 12, exakteTreffer: 3 }, { tipps: 8, exakteTreffer: 2 }]);
    expect(z.tipps).toBe(20);
    expect(z.exakteTreffer).toBe(5);
  });

  // 🔴 Der wichtigste Fall. Wer in zwei Runden je drei Spieltage in Folge
  // traf, hat eine Dreier-Serie — keine Sechser. Eine addierte Serie wäre
  // eine erfundene Leistung, und zwar genau bei den hohen Stufen.
  it("🔴 Serien nehmen das Maximum, sie addieren sich NICHT", () => {
    const z = bilanzZusammen([{ exaktSerie: 3 }, { exaktSerie: 3 }]);
    expect(z.exaktSerie).toBe(3);
  });

  it("Verhältnisse nehmen das Maximum", () => {
    expect(bilanzZusammen([{ bestesSpielFaktor: 1.4 }, { bestesSpielFaktor: 2.6 }])
      .bestesSpielFaktor).toBe(2.6);
  });

  it("der erste Treffer ist der früheste über alle Runden", () => {
    expect(bilanzZusammen([{ ersterTrefferSpieltag: 12 }, { ersterTrefferSpieltag: 4 }])
      .ersterTrefferSpieltag).toBe(4);
  });

  // ⚠️ Eine 0 heißt „gab es nicht" und darf das Minimum nicht kapern.
  it("⚠️ eine Runde ohne Treffer verdirbt den frühesten Treffer nicht", () => {
    expect(bilanzZusammen([{ ersterTrefferSpieltag: 0 }, { ersterTrefferSpieltag: 7 }])
      .ersterTrefferSpieltag).toBe(7);
  });

  it("Ja/Nein bleibt Ja, sobald es einmal Ja war", () => {
    expect(bilanzZusammen([{ aufholsprung: false }, { aufholsprung: true }]).aufholsprung).toBe(true);
  });

  it("verträgt Unsinn in der Liste", () => {
    expect(() => bilanzZusammen([null, 5, "x", { tipps: 1 }])).not.toThrow();
    expect(bilanzZusammen([null, { tipps: 1 }]).tipps).toBe(1);
  });
});

// ============================================================
//  🔴 DIE MESSUNG — Punkt 3 aus `design/abzeichen.md`, vor der Oberfläche
//
//  „Wie viele Spieler bekämen ein Abzeichen? Wirft eine Bedingung 90 % oder
//   0 % aus, taugt sie nicht."
// ============================================================
describe("Deckt der Katalog eine echte Saison ab?", () => {
  // Drei Spieler, 20 Spieltage, unterschiedlich gut und fleißig.
  const bauen = () => {
    const e = [];
    for (let md = 1; md <= 20; md += 1) {
      e.push(eintrag({ userId: "gut", matchday: md, tip: md % 2 === 0 ? EXAKT : DANEBEN }));
      e.push(eintrag({ userId: "mittel", matchday: md, tip: md % 5 === 0 ? EXAKT : DANEBEN }));
      if (md % 3 !== 0) e.push(eintrag({ userId: "faul", matchday: md, tip: DANEBEN }));
    }
    return e;
  };

  it("ein fleißiger Spieler bekommt mehr als eines, aber nicht alles", () => {
    const e = bauen();
    const b = bilanzAus({ eintraege: e, userId: "gut" });
    const hat = erspielte(b);
    expect(hat.length, "der Beste bekommt gar nichts").toBeGreaterThan(1);
    expect(hat.length, "der Beste bekommt alles").toBeLessThan(ABZEICHEN.length);
  });

  // ⚠️ Auch wer schlecht tippt, soll etwas im Schrank haben — dafür gibt es
  // die Gruppe Selbstironie. Ein leerer Schrank ist der beste Grund
  // aufzuhören.
  it("⚠️ auch der schwächste Spieler geht nicht leer aus", () => {
    const b = bilanzAus({ eintraege: bauen(), userId: "faul" });
    expect(erspielte(b).length).toBeGreaterThan(0);
  });

  it("der bessere Spieler hat mehr als der schwächere", () => {
    const e = bauen();
    const gut = erspielte(bilanzAus({ eintraege: e, userId: "gut" })).length;
    const faul = erspielte(bilanzAus({ eintraege: e, userId: "faul" })).length;
    expect(gut).toBeGreaterThan(faul);
  });
});

// ============================================================
//  🔴 DAS UMFELD — was nicht in den Tipps steht
// ============================================================
describe("Die Umfeld-Bilanz", () => {
  const RUNDEN = [
    { id: "r1", admin_id: "a" },
    { id: "r2", admin_id: "b" },
    { id: "r3", admin_id: "a" },
  ];
  const MITGLIEDER = {
    r1: [1, 2, 3, 4, 5, 6, 7],
    r3: [1, 2],
  };

  it("ohne Nutzer gibt es nichts", () => {
    expect(bilanzAusUmfeld({ runden: RUNDEN })).toEqual({});
  });

  it("zählt eigene und mitgespielte Runden getrennt", () => {
    const u = bilanzAusUmfeld({ userId: "a", runden: RUNDEN });
    expect(u.mitgespielteRunden).toBe(3);
    expect(u.eigeneRunden).toBe(2);
  });

  // 🔴 „Gastgeber Gold" soll heißen, dass einmal 25 Leute zusammenkamen —
  // nicht, dass fünfmal fünf Leute an fünf verschiedenen Tischen saßen.
  it("🔴 nimmt die GRÖSSTE eigene Runde, nicht die Summe", () => {
    const u = bilanzAusUmfeld({ userId: "a", runden: RUNDEN, mitgliederJeRunde: MITGLIEDER });
    expect(u.rundenGroesse).toBe(7);
  });

  it("wer keine eigene Runde hat, hat auch keine Rundengröße", () => {
    const u = bilanzAusUmfeld({ userId: "c", runden: [{ id: "r1", admin_id: "a" }] });
    expect(u.rundenGroesse).toBeUndefined();
    expect(u.eigeneRunden).toBe(0);
  });

  it("summiert die Übernahmen über alle eigenen Codes", () => {
    const presets = [
      { creator_id: "a", uebernahmen: 12 },
      { creator_id: "a", uebernahmen: 5 },
      { creator_id: "b", uebernahmen: 99 },
    ];
    expect(bilanzAusUmfeld({ userId: "a", runden: [], presets }).uebernahmen).toBe(17);
  });

  // ⚠️ Wer seine Meinung ändert, hat trotzdem an EINER Abstimmung
  // teilgenommen. Stimmabgaben zu zählen statt Abstimmungen belohnte
  // Unentschlossenheit.
  it("⚠️ zählt Abstimmungen, nicht Stimmabgaben", () => {
    const stimmen = [
      { user_id: "a", round_id: "r1", matchday: 3, wettbewerb: "bl" },
      { user_id: "a", round_id: "r1", matchday: 3, wettbewerb: "bl" },
      { user_id: "a", round_id: "r1", matchday: 4, wettbewerb: "bl" },
      { user_id: "b", round_id: "r1", matchday: 9, wettbewerb: "bl" },
    ];
    expect(bilanzAusUmfeld({ userId: "a", runden: [], stimmen }).abstimmungen).toBe(2);
  });

  it("fehlende Listen lassen ihr Feld weg, statt es zu raten", () => {
    const u = bilanzAusUmfeld({ userId: "a", runden: [] });
    expect(u.uebernahmen).toBeUndefined();
    expect(u.abstimmungen).toBeUndefined();
  });

  it("verträgt Unsinn in den Listen", () => {
    expect(() => bilanzAusUmfeld({
      userId: "a", runden: [null, 5], presets: [null], stimmen: [null],
    })).not.toThrow();
  });

  // ⚠️ Die Gegenprobe zur Lückenliste: was jetzt gefüllt wird, darf dort
  // nicht mehr stehen.
  it("⚠️ die fünf angeschlossenen Felder stehen nicht mehr in LUECKEN", () => {
    for (const f of ["eigeneRunden", "rundenGroesse", "uebernahmen", "abstimmungen", "mitgespielteRunden"]) {
      expect(LUECKEN[f], `${f} ist angeschlossen, steht aber noch als Lücke`).toBeUndefined();
    }
  });
});
