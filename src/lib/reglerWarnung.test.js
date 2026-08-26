import { describe, it, expect } from "vitest";
import {
  BAND_FELDER, band, pruefe, korrigieren, zusammenfassung, rohModifikator,
} from "@/lib/reglerWarnung";
import { DEFAULT_RULES, sanitizeRules, RULE_LIMITS, maxTotalModifier } from "@/lib/engine";
import { PRESETS } from "@/lib/presets";
import { CHARAKTERE } from "@/lib/charaktere";
import { schaufensterRegeln } from "@/lib/schaufenster";
import { SAISON_PRESETS } from "@/lib/saisonwetten";

const BASIS = PRESETS[0].rules;

describe("Bänder", () => {
  it("jedes Band liegt innerhalb der harten Regler-Grenzen", () => {
    for (const feld of BAND_FELDER) {
      const b = band(feld.pfad);
      expect(b.von).toBeGreaterThanOrEqual(b.min);
      expect(b.bis).toBeLessThanOrEqual(b.max);
      expect(b.von).toBeLessThanOrEqual(b.bis);
    }
  });

  it("jedes Feld hat einen Text in mindestens eine Richtung", () => {
    for (const feld of BAND_FELDER) {
      expect(feld.label.length).toBeGreaterThan(3);
      expect((feld.hoch || "") + (feld.tief || "")).not.toBe("");
    }
  });

  it("unbekannte Felder haben kein Band", () => {
    expect(band("gibtsnicht")).toBeNull();
  });
});

describe("Die erprobten Regelwerke lösen keine Warnung aus", () => {
  // Das ist der eigentliche Sinn: Was durchgemessen ist, gilt als in Ordnung.
  // Schlägt dieser Test an, ist entweder ein Preset aus der Balance gelaufen
  // oder ein Band zu eng — beides will man wissen.
  for (const p of PRESETS) {
    it(`Preset „${p.label}“ ist warnungsfrei`, () => {
      const warnungen = pruefe(p.rules).filter((w) => w.stufe === "warnung");
      expect(warnungen).toEqual([]);
    });
  }

  for (const ch of CHARAKTERE) {
    it(`Charakter „${ch.label}“ ist warnungsfrei`, () => {
      const warnungen = pruefe(ch.rules).filter((w) => w.stufe === "warnung");
      expect(warnungen).toEqual([]);
    });
  }
});

describe("Extreme Werte werden erkannt", () => {
  it("der nackte Fallback fällt auf — er ist ungedämpft", () => {
    // DEFAULT_RULES ist der technische Ausgangspunkt, nicht ein Vorschlag:
    // ohne Abzug und ohne Cutoff gewinnt der Dauerzocker (siehe presets.js).
    const w = pruefe(DEFAULT_RULES);
    expect(w.some((x) => x.id === "gratis-lose")).toBe(true);
  });

  it("ein Joker weit über dem Deckel meldet den Modifikator-Turm", () => {
    const r = sanitizeRules({
      ...BASIS, modCap: 4,
      joker: { enabled: true, modus: "einzel", faktor: 2, heimat: { enabled: true, faktor: 2 }, mut: { enabled: true, faktor: 1.2 } },
      teamMods: { derbyFaktor: 2, teams: {} },
    });
    const w = pruefe(r);
    expect(w.some((x) => x.id === "modifikator-turm")).toBe(true);
    expect(maxTotalModifier(r)).toBeGreaterThanOrEqual(3);
  });

  it("ein zu tiefer Deckel meldet, dass er abschneidet", () => {
    const r = sanitizeRules({
      ...BASIS, modCap: 1.2,
      joker: { enabled: true, modus: "einzel", faktor: 2 },
    });
    expect(pruefe(r).some((x) => x.id === "deckel-beisst")).toBe(true);
  });

  it("exakt ≈ abstand meldet den fehlenden Reiz", () => {
    const r = sanitizeRules({ ...BASIS, combo: { tendenz: 1.15, abstand: 1.5, exakt: 1.6 } });
    expect(pruefe(r).some((x) => x.id === "kein-unterschied")).toBe(true);
  });

  it("Versäumnis ohne Abzug wird angemerkt", () => {
    const r = sanitizeRules({
      ...BASIS,
      versaeumnis: { enabled: true, strategie: "wahrscheinlich", malusProzent: 0, maxProSaison: 3 },
    });
    expect(pruefe(r).some((x) => x.id === "versaeumnis-lohnt")).toBe(true);
  });

  it("ein Regler am oberen Anschlag ist eine Warnung, kein Hinweis", () => {
    const r = sanitizeRules({ ...BASIS, underdogBoost: RULE_LIMITS.underdogBoost.max });
    const w = pruefe(r).find((x) => x.id === "underdogBoost");
    expect(w).toBeTruthy();
    expect(w.stufe).toBe("warnung");
    expect(w.richtung).toBe("hoch");
  });

  it("abgeschaltete Ebenen erzeugen keine Warnung", () => {
    // Ein extremer Heimatbonus ist egal, solange der Joker aus ist.
    const r = sanitizeRules({
      ...BASIS,
      joker: { enabled: false, heimat: { enabled: true, faktor: 2 } },
    });
    expect(pruefe(r).some((x) => x.id === "joker.heimat.faktor")).toBe(false);
  });
});

describe("Gemessene Bänder — Messung als Empfehlung, nicht als Verbot", () => {
  it("der Mut-Bonus warnt ab dem gemessenen Wert, bleibt aber erlaubt", () => {
    // Der Kern: RULE_LIMITS lässt 1,2 weiterhin zu. Die Messung landet im
    // BAND, nicht in der Grenze — der Admin darf darüber, er soll es nur
    // nicht versehentlich tun.
    const r = sanitizeRules({
      ...BASIS,
      joker: { ...BASIS.joker, enabled: true, mut: { enabled: true, faktor: 1.2 } },
    });
    expect(r.joker.mut.faktor).toBe(1.2);          // NICHT beschnitten
    const w = pruefe(r).find((x) => x.id === "joker.mut.faktor");
    expect(w).toBeTruthy();
    expect(w.text).toContain("42 %");               // Beispielrechnung im Text
    expect(band("joker.mut.faktor").bis).toBe(1.15);
  });

  it("im gemessenen Band schweigt er", () => {
    const r = sanitizeRules({
      ...BASIS,
      joker: { ...BASIS.joker, enabled: true, mut: { enabled: true, faktor: 1.1 } },
    });
    expect(pruefe(r).some((x) => x.id === "joker.mut.faktor")).toBe(false);
  });

  it("der Heimatbonus hat ein weites Band — gemessen harmlos", () => {
    const r = sanitizeRules({
      ...BASIS,
      joker: { ...BASIS.joker, enabled: true, heimat: { enabled: true, faktor: 1.8 } },
    });
    expect(pruefe(r).some((x) => x.id === "joker.heimat.faktor")).toBe(false);
  });
});

describe("Die beiden Modifikator-Regeln widersprechen sich nie", () => {
  it("„Deckel anheben“ und „Deckel senken“ treten nicht gemeinsam auf", () => {
    // Sonst klickt der Admin im Kreis: die eine Korrektur löst die andere aus.
    const kaputt = sanitizeRules({
      ...BASIS, modCap: 1.2,
      joker: { ...BASIS.joker, enabled: true, modus: "einzel", faktor: 2,
        heimat: { enabled: true, faktor: 2 } },
      teamMods: { derbyFaktor: 2, teams: {} },
    });
    const ids = pruefe(kaputt).map((w) => w.id);
    expect(ids.includes("deckel-beisst") && ids.includes("modifikator-turm")).toBe(false);
  });
});

describe("Korrigieren", () => {
  it("jede gemeldete Warnung lässt sich auflösen", () => {
    const kaputt = sanitizeRules({
      ...DEFAULT_RULES, modCap: 4, underdogBoost: 3, favFlopPenalty: 20,
      joker: { enabled: true, modus: "einzel", faktor: 2, heimat: { enabled: true, faktor: 2 }, mut: { enabled: true, faktor: 1.2 } },
      teamMods: { derbyFaktor: 2, teams: {} },
      combo: { tendenz: 1.15, abstand: 1.5, exakt: 1.6 },
    });
    let r = kaputt;
    // Immer die erste Meldung auflösen, bis nichts mehr kommt. Endlich muss
    // das sein — sonst dreht sich die UI im Kreis.
    for (let i = 0; i < 40 && pruefe(r).length; i++) {
      r = korrigieren(r, pruefe(r)[0].id);
    }
    expect(pruefe(r)).toEqual([]);
  });

  it("das Ergebnis bleibt ein gültiges Regelwerk", () => {
    const r = korrigieren(DEFAULT_RULES, "gratis-lose");
    expect(sanitizeRules(r)).toEqual(r);
    expect(pruefe(r).some((x) => x.id === "gratis-lose")).toBe(false);
  });

  it("unbekannte IDs ändern nichts", () => {
    expect(korrigieren(BASIS, "gibtsnicht")).toEqual(sanitizeRules(BASIS));
  });

  it("eine Feld-Korrektur rührt die anderen Felder nicht an", () => {
    const r = sanitizeRules({ ...BASIS, underdogBoost: 3 });
    const fix = korrigieren(r, "underdogBoost");
    expect(fix.underdogBoost).toBeLessThan(3);
    expect(fix.k).toBe(r.k);
    expect(fix.minPayout).toBe(r.minPayout);
  });
});

describe("rohModifikator", () => {
  it("addiert die Aufschläge, ohne zu deckeln", () => {
    const r = sanitizeRules({
      ...BASIS, modCap: 1.5,
      joker: { enabled: true, modus: "einzel", faktor: 2 },
      teamMods: { derbyFaktor: 1.5, teams: {} },
    });
    expect(rohModifikator(r)).toBeCloseTo(2.5, 2);      // 1 + 1,0 + 0,5
    expect(maxTotalModifier(r)).toBeCloseTo(1.5, 2);    // gedeckelt
  });

  it("ohne Modifikatoren ist er neutral", () => {
    expect(rohModifikator(sanitizeRules(BASIS))).toBe(1);
  });
});

describe("Zusammenfassung", () => {
  it("meldet für ein erprobtes Preset Entwarnung", () => {
    const z = zusammenfassung(BASIS);
    expect(z.stufe).toBe("ok");
    expect(z.anzahl).toBe(0);
  });

  it("meldet Warnungen deutlicher als Hinweise", () => {
    expect(zusammenfassung(DEFAULT_RULES).stufe).toBe("warnung");
    const nurHinweis = sanitizeRules({ ...BASIS, combo: { tendenz: 1.15, abstand: 1.5, exakt: 1.6 } });
    expect(zusammenfassung(nurHinweis).stufe).toBe("hinweis");
  });
});

// ── Die FREMDJOKER-Familie (23.08.2026) ─────────────────────
// 🔴 Drei Kombinationen, die jede für sich erlaubt sind und zusammen eine
// Runde ergeben, die niemand spielen will. Gemeldet, nicht gesperrt — „will
// ein Admin etwas Unbalanciertes, soll er es haben" (Andi, 21.08.2026).
describe("Fremdjoker: Kombinationen, die eine Runde kippen", () => {
  const R = (duell = {}, eingriffe = {}) => sanitizeRules({
    ...DEFAULT_RULES,
    duell: { ...DEFAULT_RULES.duell, enabled: true, typen: ["klau", "block"], ...duell },
    eingriffe: { ...DEFAULT_RULES.eingriffe, ...eingriffe },
  });
  const ids = (r) => pruefe(r).map((w) => w.id);

  it("ohne Fremdjoker schweigt die Familie", () => {
    const raus = ids(sanitizeRules(DEFAULT_RULES));
    expect(raus).not.toContain("fremdjoker-ohne-schutz");
    expect(raus).not.toContain("fremdjoker-rudel");
    expect(raus).not.toContain("sperrfrist-waechst-unbegrenzt");
  });

  // 🔴 Andis Begründung: „weil man die halt evtl selber live verfolgen will,
  // und's deswegen blöd wäre." Der Schutz ist die Bedingung dafür, dass eine
  // Runde die Fremdjoker eingeschaltet LÄSST.
  it("meldet Fremdjoker ohne jeden Schutz — und setzt ein Schild ein", () => {
    const r = R({}, { schutz: { proSpieltag: 0, sichtbar: true, verfall: "zurueck" } });
    expect(ids(r)).toContain("fremdjoker-ohne-schutz");
    expect(korrigieren(r, "fremdjoker-ohne-schutz").eingriffe.schutz.proSpieltag).toBe(1);
  });

  // Das Rudelbilden stand bis zum 23.08.2026 nur im Duell-Baustein und kam in
  // den Profi-Warnungen gar nicht vor.
  it("meldet das Rudelbilden — freie Zielwahl, keine Sperre, viele Treffer", () => {
    const r = R({ zielWahl: "frei", maxProZiel: 4 });
    expect(ids(r)).toContain("fremdjoker-rudel");
    expect(korrigieren(r, "fremdjoker-rudel").eingriffe.sperrfrist.standard.spieltage).toBe(2);
  });

  it("das Los macht das Rudelbilden unmöglich — dann schweigt die Warnung", () => {
    expect(ids(R({ zielWahl: "ausgelost", maxProZiel: 4 }))).not.toContain("fremdjoker-rudel");
  });

  it("eine Sperrfrist bremst ebenfalls — die Warnung ist keine Dauermeldung", () => {
    const r = R({ zielWahl: "frei", maxProZiel: 4 },
      { sperrfrist: { standard: { spieltage: 2, aufschlag: 0, hoechstens: 0 } } });
    expect(ids(r)).not.toContain("fremdjoker-rudel");
  });

  // ⚠️ Kein Balance-Urteil, sondern eine Rechenaussage.
  it("meldet eine Sperrfrist, die über die Saison hinauswächst", () => {
    const r = R({}, { sperrfrist: { standard: { spieltage: 2, aufschlag: 6, hoechstens: 0 } } });
    expect(ids(r)).toContain("sperrfrist-waechst-unbegrenzt");
    expect(korrigieren(r, "sperrfrist-waechst-unbegrenzt").eingriffe.sperrfrist.standard.hoechstens).toBe(6);
  });

  it("mit Obergrenze schweigt sie", () => {
    const r = R({}, { sperrfrist: { standard: { spieltage: 2, aufschlag: 6, hoechstens: 6 } } });
    expect(ids(r)).not.toContain("sperrfrist-waechst-unbegrenzt");
  });

  // 🔴 Die Gegenprobe, die im Projekt schon dreimal etwas gefunden hat: die
  // Schaufenster-Runde hat ALLE vier Arten an und darf trotzdem keine dieser
  // Warnungen auslösen. Täte sie es, wäre die Vorführrunde selbst der Beleg
  // dafür, dass die Familie so nicht spielbar ist.
  it("die Schaufenster-Runde löst keine davon aus", () => {
    const raus = ids(schaufensterRegeln());
    expect(raus).not.toContain("fremdjoker-ohne-schutz");
    expect(raus).not.toContain("fremdjoker-rudel");
    expect(raus).not.toContain("sperrfrist-waechst-unbegrenzt");
  });
});

// ============================================================
//  MITTEN IN DER SAISON EINSTEIGEN (Andi, 26.08.2026)
//
//  Wörtlich: „ich werde halt während der saison einsteigen lassen mit … als
//  Spieltagsbeginn … vorsaison wetten gibts halt dann noch nicht." Und, einen
//  Satz später: „angenommen Marktstart ist eben wirklich erst zur 2.
//  Saisonhälfte dann wirds auch ne Einstellbarkeit brauchen ab welchem
//  Spieltag eben mitgemacht wird."
//
//  🔴 Die Einstellbarkeit GIBT es (`spiele.spieltagVon`, je Wettbewerb sogar
//  abweichend). Was fehlte, war die Aufklärung: gemessen an einer Runde ab
//  Spieltag 5 meldet `saisonLage` `gestartet: false` — für DIESE Runde hat die
//  Saison ja noch nicht angefangen — und alle fensterlosen Saison-Wetten
//  stehen offen. „Wer wird Meister?" ist dann mit vier bekannten Spieltagen
//  abzugeben, zu Vorsaison-Punkten.
//
//  ⚠️ Kein Verbot, ein Hinweis: fair ist es (alle wissen gleich viel), nur die
//  PUNKTZAHL passt nicht mehr. Will ein Admin das, soll er es haben.
// ============================================================
describe("Saison-Wetten in einer Runde, die mitten im Spielbetrieb beginnt", () => {
  const mitWetten = SAISON_PRESETS.find((p) => (p.saison?.wetten?.length ?? 0) > 0);
  const basis = sanitizeRules({ ...BASIS, saison: mitWetten.saison });
  const abSpieltag = (n) => sanitizeRules({ ...basis, spiele: { ...basis.spiele, spieltagVon: n } });
  const treffer = (r) => pruefe(r).filter((w) => w.id === "saisonwetten-mitten-drin");

  it("schweigt, wenn die Runde die ganze Saison umfasst", () => {
    expect(treffer(basis)).toEqual([]);
    expect(treffer(abSpieltag(1))).toEqual([]);
  });

  it("meldet sich ab dem zweiten Spieltag", () => {
    // 🔴 Ab ZWEI, nicht ab drei oder fünf: schon ein gelaufener Spieltag ist
    // Wissen, das eine Vorsaison-Wette nicht hat.
    expect(treffer(abSpieltag(2))).toHaveLength(1);
    expect(treffer(abSpieltag(18))).toHaveLength(1);
  });

  it("nennt die Zahl der bereits gelaufenen Spieltage — richtig gebeugt", () => {
    // Ein Hinweis, in dem „1 Spieltage sind gelaufen" steht, wird nicht
    // gelesen, sondern belächelt.
    expect(treffer(abSpieltag(2))[0].text).toContain("1 Spieltag ist");
    expect(treffer(abSpieltag(18))[0].text).toContain("17 Spieltage sind");
  });

  it("schweigt, wenn es gar keine Saison-Wetten gibt", () => {
    const ohne = sanitizeRules({ ...abSpieltag(18), saison: { ...basis.saison, enabled: false } });
    expect(treffer(ohne)).toEqual([]);
  });

  it("ist ein Hinweis, keine Warnung — und die Korrektur rät keine Zahl", () => {
    const w = treffer(abSpieltag(18))[0];
    expect(w.stufe).toBe("hinweis");
    // ⛔ Die Korrektur schaltet ab und senkt KEINE Punkte: was eine leichtere
    // Wette wert sein soll, ist eine Zahl — und Zahlen legt Andi zuletzt fest.
    const nachher = korrigieren(abSpieltag(18), "saisonwetten-mitten-drin");
    expect(nachher.saison.enabled).toBe(false);
    expect(nachher.saison.gewicht).toBe(abSpieltag(18).saison.gewicht);
    expect(treffer(nachher)).toEqual([]);
  });

  it("erzeugt bei keinem der sechs vermessenen Regelwerke Rauschen", () => {
    for (const p of PRESETS) expect(treffer(p.rules), p.key).toEqual([]);
  });
});
