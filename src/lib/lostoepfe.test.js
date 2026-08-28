import { describe, it, expect } from "vitest";
import {
  LOSTOEPFE, toepfeVon, topfVon, vereineAusToepfen, vereineAusLigen,
  wettbewerbeMitToepfen, sanitizeLostopfRegel, passtLostopf, lostopfSpiele,
  beschreibeLostopf, DEFAULT_LOSTOPF_REGEL, vereineDerRegel,
} from "./lostoepfe";
import { alleMatches, vereineVon } from "./ligen";

// ============================================================
//  DIE LOSTOEPFE (Andi, 27.08.2026)
//
//  🔴 Was hier wirklich schiefgehen kann, ist wieder ein TIPPFEHLER IN EINEM
//  VEREINSNAMEN: die Toepfe sind gepflegte Daten, und ein falsch geschriebener
//  Verein faellt nicht als Fehler auf -- er fehlt still, und die Runde ist um
//  ein paar Spiele kleiner.
//
//  ⚠️ Deshalb steht die Namenspruefung ganz oben und haelt jeden Eintrag gegen
//  den echten Katalog.
// ============================================================

const alle = alleMatches();
const cl = alle.filter((m) => m.wettbewerb === "cl");

describe("Die Toepfe sind gepflegte Daten -- und stimmen", () => {
  it("🔴 jeder Name steht so im CL-Katalog", () => {
    const katalog = new Set(vereineVon("cl"));
    const fehlend = Object.values(LOSTOEPFE.cl).flat().filter((v) => !katalog.has(v));
    expect(
      fehlend,
      `Diese Vereine gibt es im CL-Katalog nicht -- sie fehlen still:\n${fehlend.join("\n")}`,
    ).toEqual([]);
  });

  it("jeder CL-Verein gehoert GENAU EINEM Topf", () => {
    // ⚠️ Beide Richtungen: keiner doppelt, keiner vergessen. Ein Verein in zwei
    // Toepfen waere in jeder Auswahl doppelt drin, einer in keinem waere aus
    // jeder Auswahl heraus -- und beides sieht man einer Liste nicht an.
    const flach = Object.values(LOSTOEPFE.cl).flat();
    expect(new Set(flach).size, "ein Verein steht in zwei Toepfen").toBe(flach.length);
    expect(flach.length, "nicht alle 36 CL-Vereine sind eingeteilt").toBe(vereineVon("cl").length);
  });

  it("vier Toepfe zu je neun", () => {
    expect(toepfeVon("cl")).toEqual([1, 2, 3, 4]);
    for (const nr of toepfeVon("cl")) expect(LOSTOEPFE.cl[nr], `Topf ${nr}`).toHaveLength(9);
  });

  it("`topfVon` findet den Topf -- und gibt `null` statt 0", () => {
    expect(topfVon("cl", "Real Madrid")).toBe(1);
    expect(topfVon("cl", "AS Monaco")).toBe(4);
    // 🔴 `null` und nicht 0: „nicht im Wettbewerb" saehe sonst aus wie „Topf 0".
    expect(topfVon("cl", "SC Freiburg")).toBeNull();
  });

  it("⏳ die Europa League ist notiert, aber leer -- und taucht deshalb nicht auf", () => {
    // ⚠️ Ein erfundener Topf waere schlimmer als keiner: er saehe aus wie
    // gepflegte Daten. Den Wettbewerb gibt es im Katalog noch nicht.
    expect(LOSTOEPFE.el).toEqual({});
    expect(wettbewerbeMitToepfen()).toEqual(["cl"]);
  });
});

describe("Deutsche Vereine werden ABGELEITET, nicht gepflegt", () => {
  it("findet genau die, die auch in der Bundesliga spielen", () => {
    // 🔴 Eine zweite Laenderliste liefe auseinander, sobald jemand einen
    // Aufsteiger nachtraegt.
    const deutsch = vereineAusLigen("cl", ["bl"]);
    expect(deutsch.length).toBeGreaterThanOrEqual(3);
    const blListe = new Set(vereineVon("bl"));
    for (const v of deutsch) expect(blListe.has(v), v).toBe(true);
  });

  it("eine Liga ohne CL-Vereine liefert nichts, statt zu raten", () => {
    expect(vereineAusLigen("cl", ["bl2"])).toEqual([]);
  });
});

describe("Andis Regel, Spiel fuer Spiel", () => {
  const REGEL = { toepfe: [1], ausLigen: ["bl"], koToepfe: [1, 2] };

  it("🔴 trifft 85 von 159 CL-Spielen", () => {
    // Gemessen 27.08.2026. Beides waere ein Fehler: 0 hiesse „trifft nichts",
    // 159 hiesse „filtert nicht".
    const ids = lostopfSpiele(alle, REGEL);
    expect(ids.length).toBe(85);
    expect(ids.length).toBeLessThan(cl.length);
  });

  it("ALLE K.-o.-Spiele sind dabei -- Andis „alle Finalspiele\"", () => {
    const ids = new Set(lostopfSpiele(alle, REGEL));
    const ko = cl.filter((m) => m.phase && m.phase !== "liga");
    expect(ko.length).toBeGreaterThan(10);
    const fehlend = ko.filter((m) => !ids.has(String(m.matchId)));
    expect(fehlend.map((m) => `${m.phase}: ${m.home}-${m.away}`)).toEqual([]);
  });

  it("in der Ligaphase faellt weg, was weder Topf 1 noch deutsch ist", () => {
    const ids = new Set(lostopfSpiele(alle, REGEL));
    const liga = cl.filter((m) => m.phase === "liga");
    const raus = liga.filter((m) => !ids.has(String(m.matchId)));
    expect(raus.length).toBeGreaterThan(50);
    // Gegenprobe: in KEINEM weggefallenen Spiel steht ein Topf-1-Verein oder
    // ein deutscher.
    const drin = new Set([...vereineAusToepfen("cl", [1]), ...vereineAusLigen("cl", ["bl"])]);
    for (const m of raus) {
      expect(drin.has(m.home) || drin.has(m.away), `${m.home}-${m.away}`).toBe(false);
    }
  });

  it("ein Topf-3-Spiel der Ligaphase ist draussen, dasselbe Duell im Achtelfinale nicht", () => {
    // 🔴 Genau der Unterschied, den Andi beschrieben hat -- und der Grund,
    // warum es eine eigene Mechanik braucht: dieselben zwei Vereine, zwei
    // verschiedene Antworten, je nach Phase.
    const liga = { wettbewerb: "cl", phase: "liga", home: "Sparta Prag", away: "Ajax Amsterdam" };
    const ko = { ...liga, phase: "achtelfinale", home: "FC Chelsea", away: "Ajax Amsterdam" };
    expect(passtLostopf(liga, REGEL)).toBe(false);
    expect(passtLostopf(ko, REGEL)).toBe(true);   // Chelsea ist Topf 2
  });

  it("nimmt nur Spiele DIESES Wettbewerbs", () => {
    // ⚠️ Ohne den Filter kaemen Bundesliga-Spiele in die CL-Liste, sobald ein
    // Verein in beiden vorkommt -- und das tun alle vier deutschen.
    const ids = new Set(lostopfSpiele(alle, REGEL));
    for (const m of alle) {
      if (m.wettbewerb !== "cl") expect(ids.has(String(m.matchId)), m.matchId).toBe(false);
    }
  });
});

describe("Die Bereinigung laesst nichts Ungueltiges durch", () => {
  it("ein Topf, den es nicht gibt, faellt auf die Vorgabe zurueck", () => {
    expect(sanitizeLostopfRegel({ toepfe: [7, 9] }).toepfe).toEqual(DEFAULT_LOSTOPF_REGEL.toepfe);
    expect(sanitizeLostopfRegel({ toepfe: [] }).toepfe).toEqual(DEFAULT_LOSTOPF_REGEL.toepfe);
  });

  it("sortiert und entdoppelt", () => {
    expect(sanitizeLostopfRegel({ toepfe: [3, 1, 3] }).toepfe).toEqual([1, 3]);
  });

  it("der Satz nennt die AUSGERECHNETE Zahl, nicht nur den Topf", () => {
    const satz = beschreibeLostopf({ toepfe: [1], ausLigen: ["bl"], koToepfe: [1, 2] });
    expect(satz).toMatch(/Topf 1 \(9 Vereine\)/);
    expect(satz).toMatch(/4 aus eurer Liga/);
    expect(satz).toMatch(/K\.-o\.-Runde auch Topf 1 \+ 2/);
  });
});

// ── Abwaehlen: der Topf ist eine VORauswahl ─────────────────
// 🔴 Andi, 27.08.2026: „bei der mannschaftsauswahl mit den toepfen sollen
// einzelne Mannschaften trotzdem abgewaehlt werden koennen".
//
// ⚠️ Ohne das waere die Mechanik eine Schublade statt eines Werkzeugs -- man
// muesste einen Topf ganz nehmen oder ganz lassen.
describe("Einzelne Vereine abwaehlen", () => {
  const BASIS = { toepfe: [1], ausLigen: ["bl"], koToepfe: [1, 2] };

  it("ein abgewaehlter Verein bringt kein Spiel mehr herein", () => {
    const ohnePsg = { ...BASIS, ohne: ["Paris Saint-Germain"] };
    const spiel = { wettbewerb: "cl", phase: "liga", home: "Paris Saint-Germain", away: "Sparta Prag" };
    expect(passtLostopf(spiel, BASIS)).toBe(true);
    expect(passtLostopf(spiel, ohnePsg)).toBe(false);
  });

  it("🔴 aber er ist KEIN Verbot -- der Gegner bringt das Spiel trotzdem herein", () => {
    // ⚠️ Dieselbe Lesart wie `teamModus: "einer"` ueberall sonst: „Jedes Spiel
    // der gewaehlten Vereine zaehlt -- auch gegen alle anderen." Eine zweite
    // Lesart daneben waere eine Regel-Sprache mehr.
    const ohnePsg = { ...BASIS, ohne: ["Paris Saint-Germain"] };
    const gegenBayern = { wettbewerb: "cl", phase: "liga", home: "Paris Saint-Germain", away: "FC Bayern München" };
    expect(passtLostopf(gegenBayern, ohnePsg)).toBe(true);
  });

  it("die Abwahl gilt AUCH in der K.-o.-Runde", () => {
    // 🔴 Sonst kaeme ein abgewaehlter Verein durch die Hintertuer zurueck --
    // und der Admin faende ihn dort wieder, ohne zu wissen warum.
    const ohneChelsea = { ...BASIS, ohne: ["FC Chelsea"] };
    const ko = { wettbewerb: "cl", phase: "achtelfinale", home: "FC Chelsea", away: "Ajax Amsterdam" };
    expect(passtLostopf(ko, BASIS)).toBe(true);
    expect(passtLostopf(ko, ohneChelsea)).toBe(false);
  });

  it("wirkt sich messbar auf die Spielauswahl aus", () => {
    const voll = lostopfSpiele(alle, BASIS).length;
    const ohne = lostopfSpiele(alle, { ...BASIS, ohne: ["Real Madrid", "Manchester City"] }).length;
    expect(ohne).toBeLessThan(voll);
    // Gegenprobe: es faellt etwas weg, aber nicht alles.
    expect(ohne).toBeGreaterThan(voll / 2);
  });

  it("ein Name, den der Wettbewerb nicht kennt, wird verworfen", () => {
    // ⚠️ Eine Abwahl ohne Wirkung sieht man einer Liste nicht an.
    expect(sanitizeLostopfRegel({ ohne: ["SC Freiburg", "Gibtsnicht"] }).ohne).toEqual([]);
    expect(sanitizeLostopfRegel({ ohne: ["Real Madrid", "Real Madrid"] }).ohne).toEqual(["Real Madrid"]);
  });

  it("`vereineDerRegel` sagt der Oberflaeche, was gewaehlt und was abgewaehlt ist", () => {
    // 🔴 EINE Stelle, aus der Haekchen gelesen werden -- die Toepfe noch einmal
    // selbst zusammenzurechnen hiesse, ein Haekchen zu zeigen, wo
    // `passtLostopf` anders entscheidet.
    const v = vereineDerRegel({ ...BASIS, ohne: ["Real Madrid"] });
    expect(v.zurWahl).toContain("Real Madrid");
    expect(v.gewaehlt).not.toContain("Real Madrid");
    expect(v.abgewaehlt).toEqual(["Real Madrid"]);
    // Topf 2 steht nur in der K.-o.-Runde dahinter -- getrennt ausgewiesen,
    // weil es eine andere Aussage ist.
    expect(v.nurKo).toContain("FC Chelsea");
    expect(v.gewaehlt).not.toContain("FC Chelsea");
  });

  it("die Abwahl steht im Satz -- sonst liest er sich wie die Vorgabe", () => {
    expect(beschreibeLostopf({ ...BASIS, ohne: ["Real Madrid"] })).toMatch(/ohne Real Madrid/);
    expect(beschreibeLostopf({ ...BASIS, ohne: ["Real Madrid", "Inter Mailand"] }))
      .toMatch(/ohne Real Madrid und Inter Mailand/);
    // Ab drei wird gezaehlt statt aufgezaehlt -- sonst wird der Satz laenger
    // als die Liste, die er beschreibt.
    expect(beschreibeLostopf({ ...BASIS, ohne: ["Real Madrid", "Inter Mailand", "FC Barcelona"] }))
      .toMatch(/ohne 3 abgewählte/);
  });

  it("ohne Abwahl bleibt alles, wie es war", () => {
    // ⚠️ Regressionsschutz: `ohne` ist eine Zugabe, keine neue Vorgabe.
    expect(lostopfSpiele(alle, BASIS).length).toBe(85);
    expect(sanitizeLostopfRegel({}).ohne).toEqual([]);
  });
});
