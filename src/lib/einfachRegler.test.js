import { describe, it, expect } from "vitest";
import {
  REGLER, REGLER_KEY, anwenden, erkenneStufe, beispiele, naeheSatz,
} from "@/lib/einfachRegler";
import { DEFAULT_RULES, sanitizeRules, RULE_LIMITS, teamModFactor } from "@/lib/engine";
import { simulateBalance } from "@/lib/balanceSim";
import { PRESETS } from "@/lib/presets";
import { konflikte } from "@/lib/regelAbstimmung";
import { ASPEKT_KEYS } from "@/lib/presetMerge";
import { pruefe } from "@/lib/reglerWarnung";

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
    // ⚠️ Die Grenze wandert NICHT bei jedem neuen Regelblock mit. Sie stand
    // lange auf 6 und ist am 06.08.2026 auf 8 gegangen, für zwei Ebenen, die
    // bis dahin NUR in der Profi-Ansicht erreichbar waren („Wie viel soll
    // nebenbei passieren?" und „Wie leicht bleibt man dran?").
    //
    // Wer den nächsten ergänzen will, prüft zuerst, ob er nicht in einen
    // bestehenden gehört. Die Probe steht im Test darunter: Stufe 2 ist eine
    // Handvoll FRAGEN, keine kürzere Profi-Ansicht. Zwei Profi-Werte unter
    // einer Frage sind richtig — zwei Fragen unter einem Regler nicht.
    //
    // Am 06.08.2026 zweimal gewachsen (6 → 8 → 9), und zweimal ist ein Feld
    // bewusst NICHT zu einer eigenen Frage geworden, sondern in eine
    // bestehende gewandert: `teamMods` (Derby) unter „Zählen manche Spiele
    // mehr?", `drehrad` unter „Wie viel soll nebenbei passieren?". Beides
    // hätte je einen zehnten und elften Regler ergeben.
    //
    // 09.08.2026: 9 → 10 für „Lohnt sich ein Alleingang?" (`alleinstellung`).
    // Die Probe ist gemacht, und zwar gegen den nächstliegenden Kandidaten
    // „Wie mutig soll es sein?": dorthin gehört sie NICHT. Jene Stufen
    // bestehen aus `naeheFelder(preset)` — Bündeln aus VERMESSENEN Presets.
    // Ein neuer, unvermessener Punkte-Kanal daran gekoppelt hieße, dass
    // „Zahm" plötzlich etwas mitbringt, was in keinem Preset steckt.
    // Und es sind wirklich zwei Fragen: eine milde Wertung MIT kräftigem
    // Alleingang-Bonus ist eine sinnvolle Runde, die sonst nicht einstellbar
    // wäre. Genau darin liegt der Unterschied zwischen „zwei Profi-Werte
    // unter einer Frage" (richtig) und „zwei Fragen unter einem Regler"
    // (falsch).
    //
    // 26.08.2026: 10 → 11 für „Zählen große Wettbewerbe mehr?"
    // (`wettbewerbe`). Anlass war kein Wunsch, sondern ein Befund: `npm run
    // stufen` meldete das Feld als EINZIGE verbliebene Lücke — wirksam, im
    // Creator-Code, in der Profi-Ansicht, auf Stufe 1/2 nicht vorhanden.
    // Die Probe gegen den nächstliegenden Kandidaten ist gemacht, und zwar
    // gegen „Zählen manche Spiele mehr als andere?" — dorthin gehört sie
    // NICHT, obwohl beide in denselben additiven Topf zahlen: dort geht es um
    // EIN Spiel innerhalb eines Spieltags, hier um den ganzen Wettbewerb.
    // Zusammengelegt wären es zwölf Stufen unter einer Frage.
    //
    // 26.08.2026: 11 → 12 für „Ist der Naheliegende wählbar?" (`sperre`).
    // Anlass ist Andis Ansage vom selben Tag („find halt immer harry kane
    // nehmen boringo") plus derselbe Befund wie eine Zeile darüber: ohne diese
    // Stufe wäre `sperre` die einzige Lücke in `npm run stufen`.
    //
    // Die Probe gegen den nächstliegenden Kandidaten ist gemacht, hier gegen
    // „Worauf wird getippt?" (die Märkte): dorthin gehört sie NICHT. Die
    // Märkte entscheiden, OB es Torschützen und Endstände überhaupt gibt —
    // diese Frage, WELCHE davon wählbar sind. Wer den Markt abschaltet, hat
    // keine Auswahl mehr; wer hier sperrt, hat eine kleinere. Zwei Fragen.
    expect(REGLER.length).toBeLessThanOrEqual(12);
  });

  it("keine Stufe holt sich eine Warnung, die die Vorgabe nicht schon hat", () => {
    // 🔴 Der Test, der beim Bauen zweimal angeschlagen hat, und beide Male zu
    // Recht:
    //   `topspiel/normal` mit `derbyFaktor: 1,5` → „Derbys zählen so viel
    //      mehr, dass die übrigen Spiele nebensächlich werden" (1,25 ist die
    //      Grenze des Erprobten).
    //   `angriff/*` mit der VORGABE `duell.maxProSaison: 60` → „der Deckel
    //      greift schon beim ersten Duell, ob 10 % oder 100 % geklaut werden,
    //      ändert am Ergebnis nichts mehr".
    //
    // Verglichen wird gegen die Warnungen von DEFAULT_RULES, nicht gegen
    // „keine": das nackte Vorgabe-Regelwerk ist selbst kein vermessenes Preset
    // und trägt vier Meldungen (`gratis-lose`, `minPayout`, `wrongPenalty`,
    // `k`). Die hier mitzuzählen hiesse, jede Stufe für etwas verantwortlich
    // zu machen, das sie gar nicht gesetzt hat.
    const vorgabe = new Set(pruefe(sanitizeRules(DEFAULT_RULES)).map((w) => w.id));
    for (const r of REGLER) {
      for (const st of r.stufen) {
        const neu = pruefe(anwenden(DEFAULT_RULES, r.key, st.key))
          .filter((w) => !vorgabe.has(w.id))
          .map((w) => w.id);
        expect(neu, `${r.key}/${st.key}`).toEqual([]);
      }
    }
  });

  it("jeder Regler stellt eine FRAGE — das ist der Unterschied zur Profi-Ebene", () => {
    // Ein Regler, dessen Beschriftung keine Frage ist, ist meist nach dem
    // Feldnamen benannt statt nach dem, was ein Spieler wissen will.
    for (const r of REGLER) expect(r.label.trim().endsWith("?"), r.key).toBe(true);
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

  // 🔴 Baukasten-Grundsatz, dritte Anwendung: `wettbewerbe` war am 26.08.2026
  // die EINZIGE Lücke, die `npm run stufen` noch meldete — wirksam, im
  // Creator-Code, in der Profi-Ansicht, und auf Stufe 1/2 nicht vorhanden.
  //
  // ⚠️ Die drei Tests hier messen nicht den Regler, sondern seine WIRKUNG am
  // Faktor eines Spiels. Genau das ist der Unterschied, an dem `autoTip.js`
  // aufgefallen ist: dass eine Stufe einen Wert setzt, beweist nicht, dass er
  // irgendwo ankommt.
  const clFaktor = (rules, phase) => teamModFactor({ wettbewerb: "cl", phase }, rules);
  const blFaktor = (rules) => teamModFactor({ wettbewerb: "bl", phase: "liga" }, rules);

  it("„Nein“ lässt Champions League und Bundesliga gleich zählen", () => {
    const aus = anwenden(BASIS, "wettbewerbe", "aus");
    expect(aus.wettbewerbe.enabled).toBe(false);
    expect(clFaktor(aus, "finale")).toBe(blFaktor(aus));
  });

  it("die Beschreibungen sind nachgerechnet, nicht behauptet", () => {
    // „ein Fünftel mehr" und „gut anderthalbfach" stehen als Text in den
    // Stufen. Wer die Zahlen ändert, ändert damit auch den Satz — und dieser
    // Test sagt es ihm.
    const europa = anwenden(BASIS, "wettbewerbe", "europa");
    expect(clFaktor(europa, "liga")).toBeCloseTo(1.2, 3);
    expect(clFaktor(europa, "finale")).toBeCloseTo(1.2, 3);   // ohne K.-o.-Stufe flach
    expect(blFaktor(europa)).toBe(1);

    const ko = anwenden(BASIS, "wettbewerbe", "ko");
    expect(clFaktor(ko, "liga")).toBeCloseTo(1.2, 3);
    expect(clFaktor(ko, "achtelfinale")).toBeCloseTo(1.3, 3);
    expect(clFaktor(ko, "finale")).toBeCloseTo(1.6, 3);
    // Und die Ligaspiele bleiben unberührt — der Aufschlag ist kein Faktor
    // auf alles, sonst verschöbe er gar nichts.
    expect(blFaktor(ko)).toBe(1);
  });

  it("jede Stufe wird wiedererkannt und bleibt im Empfehlungsband", () => {
    for (const stufe of REGLER_KEY.wettbewerbe.stufen) {
      const r = anwenden(BASIS, "wettbewerbe", stufe.key);
      // Ohne diese Zeile springt die Auswahl beim Öffnen der Ansicht zurück.
      expect(erkenneStufe(r, "wettbewerbe"), stufe.key).toBe(stufe.key);
      // ⚠️ Die Gegenprobe aus CLAUDE.md: neue Voreinstellungen gegen
      // `reglerWarnung` laufen lassen. Sie hat am 06.08. dreimal an einem Tag
      // etwas gefunden, was kein Test gesehen hat.
      expect(pruefe(r).length, stufe.key).toBe(pruefe(BASIS).length);
    }
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

// ⛔ STILLGELEGT (Andi, 07.08.2026): Balancing ist Endphase — siehe ganz oben
// in `CLAUDE.md` und den Kopf von `vitest.config.mjs`. Der Rest dieser Datei
// (welche Stufe welches Feld setzt) läuft weiter, deshalb `describe.skip` statt
// eines Datei-Ausschlusses.
// ▶️ Wieder anschalten: `describe.skip` → `describe`.
describe.skip("Schnelltest Balance: keine Stufe kippt das Spiel", () => {
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
