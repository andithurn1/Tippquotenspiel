import { describe, it, expect } from "vitest";
import {
  REGLER, REGLER_KEY, anwenden, erkenneStufe, beispiele, naeheSatz,
} from "@/lib/einfachRegler";
import { DEFAULT_RULES, sanitizeRules, RULE_LIMITS } from "@/lib/engine";
import { simulateBalance } from "@/lib/balanceSim";
import { PRESETS } from "@/lib/presets";
import { konflikte } from "@/lib/regelAbstimmung";
import { ASPEKT_KEYS } from "@/lib/presetMerge";

// Basis fuer die Balance-Pruefung ist das Standard-PRESET, nicht DEFAULT_RULES:
// DEFAULT_RULES ist der technische Fallback OHNE Balance-Daempfung (dort
// gewinnt der Zocker mit 97 %). Genau deshalb startet auch die Spielerstellung
// vom Preset. Die einfachen Regler werden immer auf ein bestehendes Regelwerk
// angewendet, nie auf den nackten Fallback.
const BASIS = PRESETS[0].rules;

describe("Katalog", () => {
  it("jeder Regler ist vollständig beschrieben", () => {
    for (const r of REGLER) {
      expect(r.key && r.label && r.hint).toBeTruthy();
      expect(r.stufen.length).toBeGreaterThanOrEqual(2);
      for (const s of r.stufen) {
        expect(s.key && s.label && s.beschreibung).toBeTruthy();
        expect(Object.keys(s.werte).length).toBeGreaterThan(0);
      }
    }
  });

  it("wenige Regler — sonst wäre es die Profi-Ebene", () => {
    expect(REGLER.length).toBeGreaterThanOrEqual(3);
    // ⚠️ Die Grenze wandert NICHT bei jedem neuen Regelblock mit. Sie stand auf
    // 6 und ist am 06.08.2026 EINMAL auf 7 gegangen, für „Wie viel soll
    // nebenbei passieren?" — die Ereignis-Ebene kam bis dahin nur in der
    // Profi-Ansicht vor und war damit nach dem Baukasten-Grundsatz nicht
    // fertig. Wer den nächsten Regler ergänzen will, prüft zuerst, ob er
    // nicht in einen bestehenden gehört: Stufe 2 ist eine Handvoll FRAGEN,
    // keine kürzere Profi-Ansicht. Sieben ist die Obergrenze.
    expect(REGLER.length).toBeLessThanOrEqual(7);
  });

  it("Schlüssel sind eindeutig, auch je Stufe", () => {
    expect(new Set(REGLER.map((r) => r.key)).size).toBe(REGLER.length);
    for (const r of REGLER) {
      expect(new Set(r.stufen.map((s) => s.key)).size).toBe(r.stufen.length);
    }
  });
});

describe("anwenden / erkenneStufe", () => {
  it("jede Stufe lässt sich anwenden und danach wiedererkennen", () => {
    for (const r of REGLER) {
      for (const s of r.stufen) {
        const neu = anwenden(DEFAULT_RULES, r.key, s.key);
        expect(erkenneStufe(neu, r.key)).toBe(s.key);
      }
    }
  });

  it("das Ergebnis ist immer ein gültiges Regelwerk", () => {
    for (const r of REGLER) {
      for (const s of r.stufen) {
        const neu = anwenden(DEFAULT_RULES, r.key, s.key);
        expect(sanitizeRules(neu)).toEqual(neu);
        expect(neu.k).toBeLessThanOrEqual(RULE_LIMITS.k.max);
      }
    }
  });

  it("ein Regler lässt die anderen in Ruhe", () => {
    const basis = anwenden(DEFAULT_RULES, "joker", "mild");
    const danach = anwenden(basis, "mut", "wild");
    expect(erkenneStufe(danach, "joker")).toBe("mild");   // Joker unberührt
    expect(erkenneStufe(danach, "mut")).toBe("wild");
  });

  it("eine eigene Mischung wird als „keine Stufe“ erkannt", () => {
    const eigen = sanitizeRules({ ...DEFAULT_RULES, k: 0.95, minPayout: 2.5 });
    expect(erkenneStufe(eigen, "mut")).toBeNull();
  });

  it("unbekannte Eingaben ändern nichts", () => {
    const r = anwenden(DEFAULT_RULES, "gibtsnicht", "auch-nicht");
    expect(r).toEqual(sanitizeRules(DEFAULT_RULES));
    expect(erkenneStufe(DEFAULT_RULES, "gibtsnicht")).toBeNull();
  });
});

describe("Die Stufen tun wirklich etwas", () => {
  it("„wild“ belohnt Nähe deutlich stärker als „zahm“", () => {
    const zahm = anwenden(DEFAULT_RULES, "mut", "zahm");
    const wild = anwenden(DEFAULT_RULES, "mut", "wild");
    const knappZahm = beispiele(zahm).find((z) => z.key === "knapp").wert;
    const knappWild = beispiele(wild).find((z) => z.key === "knapp").wert;
    expect(knappWild).toBeGreaterThan(knappZahm);
  });

  it("ohne Torschützen-Markt fehlt die Schützen-Zeile", () => {
    const aus = anwenden(DEFAULT_RULES, "tore", "aus");
    expect(beispiele(aus).some((z) => z.key === "schuetze")).toBe(false);
    const an = anwenden(DEFAULT_RULES, "tore", "normal");
    expect(beispiele(an).some((z) => z.key === "schuetze")).toBe(true);
  });

  it("„Kein Joker“ schaltet ihn wirklich ab", () => {
    const aus = anwenden(DEFAULT_RULES, "joker", "aus");
    expect(aus.joker.enabled).toBe(false);
  });

  // 🔴 Baukasten-Grundsatz: der Wettmodus war nur über die Profi-Ansicht
  // erreichbar. Diese beiden Tests halten fest, dass Stufe 2 ihn anbietet —
  // und dass der Münz-Takt dabei als KLARTEXT-Wahl vorkommt, nicht nur als
  // Regler eine Ebene höher.
  it("der Wettmodus ist über Stufe 2 erreichbar", () => {
    const wetten = anwenden(DEFAULT_RULES, "joker", "wetten");
    expect(wetten.joker.enabled).toBe(true);
    expect(wetten.joker.modus).toBe("einsatz");
    expect(wetten.joker.einsatzProSpieltag).toBeGreaterThan(0);
  });

  it("die beiden Wett-Stufen unterscheiden sich im Münz-Takt", () => {
    const jeden = anwenden(DEFAULT_RULES, "joker", "wetten");
    const vorrat = anwenden(DEFAULT_RULES, "joker", "wetten-vorrat");
    expect(jeden.joker.einsatzTakt).toBe("spieltag");
    expect(vorrat.joker.einsatzTakt).toBe("alleNSpieltage");
    // Und sie müssen auseinanderzuhalten sein — sonst erkennt `erkenneStufe`
    // die zweite als die erste und die Auswahl springt beim Öffnen zurück.
    expect(erkenneStufe(vorrat, "joker")).toBe("wetten-vorrat");
  });

  // 🔴 Baukasten-Grundsatz, zweite Anwendung: die Mitbestimmung hat in der
  // Profi-Ebene ein ganzes Gehäuse (Verfassung, Quorum, Mehrheit, Fristen).
  // Wer sie nicht bis dorthin verfolgen will, muss trotzdem eine stimmige
  // Runde bekommen — genau dafür sind diese drei Stufen da.
  it("die Mitbestimmung ist über Stufe 2 erreichbar", () => {
    const admin = anwenden(DEFAULT_RULES, "mitbestimmung", "admin");
    expect(admin.regelAbstimmung.enabled).toBe(false);

    const runde = anwenden(DEFAULT_RULES, "mitbestimmung", "runde");
    expect(runde.regelAbstimmung.enabled).toBe(true);
    expect(runde.regelAbstimmung.mehrheit).toBe("einfach");

    const gross = anwenden(DEFAULT_RULES, "mitbestimmung", "grosseMehrheit");
    expect(gross.regelAbstimmung.mehrheit).toBe("zweidrittel");
    expect(gross.regelAbstimmung.quorum).toBeGreaterThan(runde.regelAbstimmung.quorum);
    // Die höchste Stufe schützt zusätzlich die Wertung selbst.
    expect(gross.verfassung.enabled).toBe(true);
    expect(gross.verfassung.gesperrt).toContain("naehe");
  });

  it("keine Stufe der Mitbestimmung erzeugt einen Konflikt", () => {
    for (const stufe of REGLER_KEY.mitbestimmung.stufen) {
      const r = anwenden(DEFAULT_RULES, "mitbestimmung", stufe.key);
      expect(konflikte(r, ASPEKT_KEYS), stufe.key).toEqual([]);
    }
  });

  it("Saison-Stufen setzen unterschiedlich viele Wetten", () => {
    const wuerze = anwenden(DEFAULT_RULES, "saison", "wuerze");
    const spuerbar = anwenden(DEFAULT_RULES, "saison", "spuerbar");
    expect(spuerbar.saison.wetten.length).toBeGreaterThan(wuerze.saison.wetten.length);
    expect(spuerbar.saison.gewicht).toBeGreaterThan(wuerze.saison.gewicht);
  });
});

describe("Beispiele — konkrete Zahlen statt abstrakter Regler", () => {
  it("liefert verständliche Zeilen mit Zahlen", () => {
    for (const z of beispiele(DEFAULT_RULES)) {
      expect(z.text.length).toBeGreaterThan(5);
      expect(Number.isFinite(z.wert)).toBe(true);
    }
  });

  it("der exakte Treffer zahlt am meisten", () => {
    const z = beispiele(DEFAULT_RULES);
    const exakt = z.find((x) => x.key === "exakt").wert;
    for (const andere of z.filter((x) => !["exakt", "schuetze"].includes(x.key))) {
      expect(exakt).toBeGreaterThanOrEqual(andere.wert);
    }
  });

  it("naeheSatz beschreibt das Verhältnis in Prozent", () => {
    expect(naeheSatz(anwenden(DEFAULT_RULES, "mut", "wild"))).toMatch(/\d+ %/);
    expect(naeheSatz(anwenden(DEFAULT_RULES, "mut", "zahm"))).toMatch(/\d+ %/);
  });

  it("die Mut-Stufen fuehren zu unterschiedlichen Punktzahlen", () => {
    // Bewusst die ABSOLUTEN Werte vergleichen, nicht das Verhaeltnis
    // knapp/exakt: der Aussenseiter-Boost wirkt auf beide gleichermassen und
    // kuerzt sich im Verhaeltnis heraus — „zahm" und „wild" koennen denselben
    // Prozentsatz ergeben und trotzdem voellig verschieden zahlen.
    const werte = REGLER_KEY.mut.stufen.map((st) => {
      const r = anwenden(BASIS, "mut", st.key);
      return beispiele(r).find((z) => z.key === "exakt").wert;
    });
    expect(new Set(werte).size).toBeGreaterThanOrEqual(2);
  });
});

describe("Schnelltest Balance: keine Stufe kippt das Spiel", () => {
  // Nur strukturell — gewinnt der Kenner noch? Feinjustierung sammelt sich
  // im Abschluss-Durchgang (siehe design/roadmap.md).
  for (const r of REGLER) {
    for (const s of r.stufen) {
      it(`${r.key}/${s.key} lässt nicht den Zocker gewinnen`, () => {
        const rules = anwenden(BASIS, r.key, s.key);
        // 60 statt 30 Saisons: seit `balanceSim` Formkurven kennt, streut eine
        // einzelne Stichprobe stärker (siehe presets.balance.test.js).
        const sim = simulateBalance(rules, { seasons: 60, seed: 987654 });
        expect(sim.kennerQuote).toBeGreaterThan(sim.zockerQuote);
      });
    }
  }
});
