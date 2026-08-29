import { describe, it, expect } from "vitest";
import {
  ABZEICHEN, ABZEICHEN_NACH_KEY, GRUPPEN, STUFEN, STUFE, stufeVon, LEITERN,
  LEERE_BILANZ, sanitizeBilanz, erreichteStufe, naechsteStufe,
  erspielte, schrank, nachGruppen, bildPfad,
} from "./abzeichen";

const HEX = /^#[0-9A-Fa-f]{6}$/;
const KEY = /^[a-z0-9-]+$/;
const mit = (feld, wert) => ({ ...LEERE_BILANZ, [feld]: wert });

describe("Der Katalog", () => {
  // 🔴 Der Schlüssel ist der Dateiname des Bildes UND der Wert in der
  // Datenbank. Wer ihn ändert, wirft erspielte Abzeichen weg — und Andis PNG
  // zeigt auf ein Abzeichen, das es nicht mehr gibt.
  it("🔴 jeder Schlüssel ist eindeutig und dateinamentauglich", () => {
    const keys = ABZEICHEN.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k, k).toMatch(KEY);
  });

  // ⚠️ Andi erzeugt sie als EINEN Satz: „erstelle mir 30 logos mit fussball
  // motiven, und von denen schneide ich dann die besten raus". Wächst der
  // Katalog später, braucht es einen ZWEITEN Satz — und der passt nie ganz
  // zum ersten. Die Zahl steht deshalb fest und darf nicht versehentlich
  // wandern.
  it("⚠️ es sind genau 30 — die Zahl, für die der Bildersatz erzeugt wird", () => {
    expect(ABZEICHEN.length).toBe(30);
  });

  it("jedes Abzeichen ist vollständig beschrieben", () => {
    for (const a of ABZEICHEN) {
      expect(a.label, a.key).toBeTruthy();
      expect(a.was, a.key).toBeTruthy();
      expect(a.motiv, a.key).toBeTruthy();
      expect(GRUPPEN.map((g) => g.key), a.key).toContain(a.gruppe);
    }
  });

  // 🔴 Genau EINE der beiden Bauarten. Ein Abzeichen mit Leiter UND fester
  // Stufe wäre zweideutig: welche gilt? Und eines mit keiner von beiden wird
  // nie vergeben, ohne dass es jemand merkt.
  it("🔴 jedes Abzeichen ist entweder zählbar ODER einmalig — nie beides, nie keines", () => {
    for (const a of ABZEICHEN) {
      const zaehlbar = Boolean(a.mass);
      const einmalig = Boolean(a.stufe);
      expect(zaehlbar || einmalig, `${a.key}: weder Leiter noch feste Stufe`).toBe(true);
      expect(zaehlbar && einmalig, `${a.key}: Leiter UND feste Stufe`).toBe(false);
      if (zaehlbar) {
        expect(Array.isArray(LEITERN[a.leiter]), `${a.key}: Leiter „${a.leiter}“ gibt es nicht`).toBe(true);
        expect(Object.keys(LEERE_BILANZ), `${a.key}: Maß „${a.mass}“ steht nicht in der Bilanz`)
          .toContain(a.mass);
      } else {
        expect(stufeVon(a.stufe), `${a.key}: Stufe „${a.stufe}“ gibt es nicht`).not.toBeNull();
        expect(typeof a.gilt, `${a.key}: einmalig, aber ohne Prüfung`).toBe("function");
      }
    }
  });

  it("jede Gruppe hat Abzeichen", () => {
    for (const g of GRUPPEN) {
      expect(ABZEICHEN.filter((a) => a.gruppe === g.key).length, g.key).toBeGreaterThan(0);
    }
  });
});

// ============================================================
//  🔴 DIE STUFEN — der Schein hinter dem runden Logo
// ============================================================
describe("Die Stufen", () => {
  it("Andis Leiter steht in seiner Reihenfolge", () => {
    expect(STUFEN.map((s) => s.key))
      .toEqual(["holz", "bronze", "kupfer", "silber", "gold", "platin", "diamant"]);
  });

  it("die Ränge steigen lückenlos", () => {
    STUFEN.forEach((s, i) => expect(s.rang, s.key).toBe(i));
  });

  it("jede Stufe hat gültige Farben für den Schein", () => {
    for (const s of STUFEN) {
      expect(s.schein, s.key).toMatch(HEX);
      expect(s.rand, s.key).toMatch(HEX);
    }
  });

  // 🔴 Der eigentliche Zweck: eine Stufe, die kein Abzeichen je erreicht, ist
  // ein Schein, den nie jemand zu sehen bekommt. Andi hätte sieben Stufen
  // bestellt und fünf davon bekommen.
  it("🔴 jede Stufe ist wirklich erreichbar", () => {
    const erreichbar = new Set();
    for (const a of ABZEICHEN) {
      if (a.stufe) { erreichbar.add(a.stufe); continue; }
      // Zählbare erreichen jede Stufe, sobald der Wert hoch genug ist.
      const leiter = LEITERN[a.leiter];
      leiter.forEach((_, i) => erreichbar.add(STUFEN[i].key));
    }
    for (const s of STUFEN) {
      expect(erreichbar.has(s.key), `Stufe ${s.label} erreicht kein Abzeichen`).toBe(true);
    }
  });

  it("unbekannte Stufen geben `null` statt einer erfundenen", () => {
    expect(stufeVon("titan")).toBeNull();
    expect(stufeVon(null)).toBeNull();
    expect(STUFE.gold.label).toBe("Gold");
  });
});

// ============================================================
//  🔴 DIE LEITERN — Andis Frage nach den Voraussetzungen
// ============================================================
describe("Die Leitern", () => {
  it("jede hat genau sieben Sprossen — eine je Stufe", () => {
    for (const [name, l] of Object.entries(LEITERN)) {
      expect(l.length, name).toBe(STUFEN.length);
    }
  });

  // ⚠️ Eine Leiter, die nicht steigt, vergibt zwei Stufen für denselben Wert.
  it("⚠️ jede Leiter steigt echt an", () => {
    for (const [name, l] of Object.entries(LEITERN)) {
      for (let i = 1; i < l.length; i += 1) {
        expect(l[i], `${name}: Sprosse ${i}`).toBeGreaterThan(l[i - 1]);
      }
    }
  });

  // 🔴 Der Weg von Holz nach Diamant soll ein WEG sein. Eine Leiter, deren
  // Ende weniger als das Zehnfache ihres Anfangs verlangt, ist nach zwei
  // Wochen durchgespielt — und Diamant hieße danach nichts mehr.
  it("🔴 Diamant ist mindestens zehnmal so weit weg wie Holz", () => {
    for (const [name, l] of Object.entries(LEITERN)) {
      expect(l[l.length - 1] / l[0], name).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("Die Bilanz", () => {
  it("macht aus Unsinn eine leere Bilanz, statt zu werfen", () => {
    expect(sanitizeBilanz(null)).toEqual(LEERE_BILANZ);
    expect(sanitizeBilanz("quatsch")).toEqual(LEERE_BILANZ);
    expect(sanitizeBilanz({ tipps: "viele" }).tipps).toBe(0);
    expect(sanitizeBilanz({ aufholsprung: "ja" }).aufholsprung).toBe(false);
  });

  // 🔴 Der Trophäenschrank ist der harmloseste Screen der App und wäre der
  // dümmste Ort für einen Absturz.
  it("🔴 nichts stürzt ab, egal was hereinkommt", () => {
    const muell = [null, undefined, {}, { tipps: NaN }, { exakteTreffer: -5 }, "kaputt", 42];
    for (const m of muell) {
      expect(() => erspielte(m), JSON.stringify(m)).not.toThrow();
      expect(() => schrank(m), JSON.stringify(m)).not.toThrow();
    }
  });
});

describe("Die Vergabe", () => {
  it("eine leere Bilanz bekommt gar nichts", () => {
    expect(erspielte(LEERE_BILANZ)).toEqual([]);
  });

  // ⚠️ Das eine Abzeichen, das jeder bekommt. Ein leerer Schrank beim ersten
  // Blick sagt „hier gibt es nichts zu holen“.
  it("der erste Tipp bringt sofort eines", () => {
    const keys = erspielte(mit("tipps", 1)).map((e) => e.abzeichen.key);
    expect(keys).toContain("neuling");
  });

  // 🔴 Der Kern von Andis Bauweise: DASSELBE Logo, besserer Schein.
  it("🔴 dasselbe Abzeichen steigt mit dem Wert die Stufen hoch", () => {
    const a = ABZEICHEN_NACH_KEY.treffsicher;
    const leiter = LEITERN[a.leiter];
    const gesehen = [];
    for (const sprosse of leiter) {
      gesehen.push(erreichteStufe(a, mit("exakteTreffer", sprosse)).key);
    }
    expect(gesehen).toEqual(STUFEN.map((s) => s.key));
  });

  it("unterhalb der ersten Sprosse gibt es gar nichts", () => {
    const a = ABZEICHEN_NACH_KEY.treffsicher;
    expect(erreichteStufe(a, mit("exakteTreffer", 0))).toBeNull();
  });

  it("sagt, was bis zur nächsten Stufe fehlt", () => {
    const a = ABZEICHEN_NACH_KEY.treffsicher;
    const n = naechsteStufe(a, mit("exakteTreffer", 2));
    expect(n.stufe.key).toBe("bronze");
    expect(n.braucht).toBe(3);
    expect(n.fehlt).toBe(1);
  });

  it("auf Diamant fehlt nichts mehr", () => {
    const a = ABZEICHEN_NACH_KEY.treffsicher;
    expect(naechsteStufe(a, mit("exakteTreffer", 9999))).toBeNull();
  });

  it("einmalige Abzeichen haben keine nächste Stufe", () => {
    expect(naechsteStufe(ABZEICHEN_NACH_KEY.neuling, mit("tipps", 1))).toBeNull();
  });

  // 🔴 In einer Runde zu zweit ist man fast immer allein, sobald der andere
  // danebenliegt. Ohne Mindestgröße wäre das Abzeichen geschenkt.
  it("🔴 Alleingang gibt es in einer Kleinstrunde NICHT", () => {
    const a = ABZEICHEN_NACH_KEY.alleingang;
    expect(erreichteStufe(a, { ...LEERE_BILANZ, alleingaenge: 9, rundenGroesse: 2 })).toBeNull();
    expect(erreichteStufe(a, { ...LEERE_BILANZ, alleingaenge: 1, rundenGroesse: 5 })).not.toBeNull();
  });

  it("Gastgeber setzt eine eigene Runde voraus", () => {
    const a = ABZEICHEN_NACH_KEY.gastgeber;
    expect(erreichteStufe(a, { ...LEERE_BILANZ, rundenGroesse: 50, eigeneRunden: 0 })).toBeNull();
    expect(erreichteStufe(a, { ...LEERE_BILANZ, rundenGroesse: 50, eigeneRunden: 1 })).not.toBeNull();
  });
});

describe("Der Schrank", () => {
  it("zeigt auch das, was noch fehlt", () => {
    const s = schrank(mit("tipps", 1));
    expect(s.length).toBe(ABZEICHEN.length);
    expect(s.filter((a) => a.erspielt).length).toBeGreaterThan(0);
    expect(s.filter((a) => !a.erspielt).length).toBeGreaterThan(0);
  });

  it("trägt mit, wann und wo es erspielt wurde", () => {
    const s = schrank(mit("tipps", 1), { neuling: { am: "2026-09-01", rundenName: "Büro" } });
    const n = s.find((a) => a.key === "neuling");
    expect(n.erspielt).toBe(true);
    expect(n.rundenName).toBe("Büro");
  });

  it("nach Gruppen sortiert kommt alles genau einmal vor", () => {
    const alle = nachGruppen(LEERE_BILANZ).flatMap((g) => g.abzeichen.map((a) => a.key));
    expect(alle.sort()).toEqual(ABZEICHEN.map((a) => a.key).sort());
  });
});

describe("Der Bildpfad", () => {
  // ⚠️ EINE Stelle. Andi liefert die PNGs nach; wer den Pfad an zwei Stellen
  // zusammenbaut, hat beim Nachliefern zwei Stellen zu ändern.
  it("heißt wie der Schlüssel", () => {
    expect(bildPfad("neuling")).toBe("/abzeichen/neuling.png");
  });

  it("gibt für Unbekanntes `null`", () => {
    expect(bildPfad("gibtsnicht")).toBeNull();
    expect(bildPfad(null)).toBeNull();
  });

  it("jedes Abzeichen im Katalog hat einen Pfad", () => {
    for (const a of ABZEICHEN) expect(bildPfad(a.key), a.key).toBeTruthy();
    expect(Object.keys(ABZEICHEN_NACH_KEY).length).toBe(ABZEICHEN.length);
  });
});
