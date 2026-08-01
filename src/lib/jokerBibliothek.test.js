import { describe, it, expect } from "vitest";
import {
  ACHSEN, NEIGUNGEN, DICHTEN, SCHAERFEN, KOMBINATIONEN,
  achsenProfil, achsenKonflikte,
  bildeCode, zerlegeCode, beschreibeKombination,
} from "./jokerBibliothek";
import { sanitizeBudget } from "./jokerBudget";
import { sanitizeLimitKlassen } from "./limitKlassen";
import { sanitizeDuellJoker } from "./duellJoker";
import { PRESETS } from "./presets";

// ── Kataloge ────────────────────────────────────────────────

describe("Kataloge", () => {
  it("jeder Katalog-Eintrag hat key, label und desc, Schlüssel sind eindeutig", () => {
    for (const liste of [ACHSEN, NEIGUNGEN, DICHTEN, SCHAERFEN]) {
      for (const e of liste) expect(e.key && e.label && e.desc).toBeTruthy();
      expect(new Set(liste.map((e) => e.key)).size).toBe(liste.length);
    }
  });

  it("ACHSEN trägt genau die sechs Schlüssel A–F", () => {
    expect(ACHSEN.map((a) => a.key)).toEqual(["A", "B", "C", "D", "E", "F"]);
  });
});

describe("KOMBINATIONEN", () => {
  it("genau sechs Einträge, jeder mit key/label/desc/neigung/dichte/schaerfe und vollem Regelfragment", () => {
    expect(KOMBINATIONEN).toHaveLength(6);
    for (const k of KOMBINATIONEN) {
      expect(k.key && k.label && k.desc).toBeTruthy();
      expect(NEIGUNGEN.some((n) => n.key === k.neigung)).toBe(true);
      expect(DICHTEN.some((d) => d.key === k.dichte)).toBe(true);
      expect(SCHAERFEN.some((s) => s.key === k.schaerfe)).toBe(true);
      expect(k.budget && typeof k.budget).toBe("object");
      expect(Array.isArray(k.limitKlassen)).toBe(true);
      expect(k.duell && typeof k.duell).toBe("object");
      expect(k.joker && typeof k.joker).toBe("object");
      // Baustein 3 (5b): kein deklariertes `achsen`/`wuerze`-Feld — das Profil
      // wird berechnet, nicht mitgeschrieben.
      expect(k).not.toHaveProperty("achsen");
      expect(k).not.toHaveProperty("wuerze");
    }
  });

  it("Schlüssel sind eindeutig", () => {
    expect(new Set(KOMBINATIONEN.map((k) => k.key)).size).toBe(KOMBINATIONEN.length);
  });

  // Pflichttest: kein Kombi-Schlüssel enthält einen Bindestrich — sonst
  // bricht `zerlegeCode` still, sobald jemand einen hinzufügt.
  it("Pflichttest: kein Kombi-Schlüssel enthält einen Bindestrich", () => {
    for (const k of KOMBINATIONEN) expect(k.key).not.toMatch(/-/);
  });

  it("die berechneten Würze-Höchstwerte (Max über die sechs Achsen) sind nicht absteigend sortiert — passend zur aufsteigenden Tabelle in design/joker-oekonomie.md 3.2", () => {
    const maxWerte = KOMBINATIONEN.map((k) => {
      const p = achsenProfil({ budget: k.budget, limitKlassen: k.limitKlassen, duell: k.duell, joker: k.joker });
      return Math.max(...Object.values(p).map((a) => a.wert));
    });
    for (let i = 1; i < maxWerte.length; i++) {
      expect(maxWerte[i]).toBeGreaterThanOrEqual(maxWerte[i - 1]);
    }
  });

  // Pflichttest: alle sechs Regelfragmente überstehen die jeweiligen
  // sanitize*-Funktionen in den gesetzten Feldern unverändert.
  it("Pflichttest: jedes Regelfragment übersteht sanitizeBudget/sanitizeLimitKlassen/sanitizeDuellJoker in den gesetzten Feldern", () => {
    for (const k of KOMBINATIONEN) {
      expect(sanitizeBudget(k.budget)).toMatchObject(k.budget);
      expect(sanitizeLimitKlassen(k.limitKlassen)).toMatchObject(k.limitKlassen);
      expect(sanitizeDuellJoker(k.duell)).toMatchObject(k.duell);
    }
  });

  // Pflichttest: die berechneten Profile passen zu neigung/dichte.
  describe("berechnete Profile passen zu neigung/dichte", () => {
    // „dichte" = wie viele Bausteine gleichzeitig aktiv sind — direkt an den
    // Regelfragmenten ablesbar (`achsenProfil` selbst kennt `budget`/
    // `limitKlassen` nicht, siehe Kopfkommentar der Bibliothek: die
    // Beitragstabelle in design/joker-inventar.md 3.1 nennt beide Module
    // nirgends).
    const aktiveBausteine = (k) => [
      k.budget?.enabled === true,
      Array.isArray(k.limitKlassen) && k.limitKlassen.length > 0,
      k.duell?.enabled === true,
      k.joker?.enabled === true,
    ].filter(Boolean).length;

    it("sparsam ≤ mittel ≤ dicht, gemessen an der Zahl gleichzeitig aktiver Bausteine", () => {
      const gruppe = (key) => KOMBINATIONEN.filter((k) => k.dichte === key).map(aktiveBausteine);
      const sparsam = gruppe("sparsam");
      const mittel = gruppe("mittel");
      const dicht = gruppe("dicht");
      expect(sparsam.length).toBeGreaterThan(0);
      expect(mittel.length).toBeGreaterThan(0);
      expect(dicht.length).toBeGreaterThan(0);
      expect(Math.max(...sparsam)).toBeLessThanOrEqual(Math.min(...mittel));
      expect(Math.max(...mittel)).toBeLessThanOrEqual(Math.min(...dicht));
    });

    it("„neutral“ Kombinationen lassen (bei aktivem Duell-Joker) jeden treffen — zielWahl „frei“ taucht als Achse-D-Quelle auf", () => {
      const neutrale = KOMBINATIONEN.filter((k) => k.neigung === "neutral" && k.duell?.enabled);
      expect(neutrale.length).toBeGreaterThan(0);
      for (const k of neutrale) {
        expect(k.duell.zielWahl).toBe("frei");
        const p = achsenProfil({ duell: k.duell, joker: k.joker });
        expect(p.D.quellen).toContain("duell.zielWahl");
      }
    });

    it("„ausgleich“/„underdog“ Kombinationen schränken das Ziel ein (nicht „frei“) — keine Achse-D-Quelle „duell.zielWahl“", () => {
      const eingeschraenkt = KOMBINATIONEN.filter((k) => k.neigung !== "neutral" && k.duell?.enabled);
      expect(eingeschraenkt.length).toBeGreaterThan(0);
      for (const k of eingeschraenkt) {
        expect(k.duell.zielWahl).not.toBe("frei");
        const p = achsenProfil({ duell: k.duell, joker: k.joker });
        expect(p.D.quellen).not.toContain("duell.zielWahl");
      }
    });

    it("„underdog“ Kombinationen speisen ihr Budget (auch) aus Rückstand, „neutral“/„ausgleich“ nie", () => {
      for (const k of KOMBINATIONEN) {
        const hatRueckstand = Array.isArray(k.budget?.quellen)
          && k.budget.quellen.some((q) => q.typ === "rueckstand");
        if (k.neigung === "underdog") expect(hatRueckstand).toBe(true);
        else expect(hatRueckstand).toBe(false);
      }
    });
  });
});

// ── achsenProfil ─────────────────────────────────────────────

describe("achsenProfil", () => {
  // Pflichttest 1: für jede Achse einzeln ein Regelwerk, das NUR diese Achse
  // hochdreht — dort hoch, sonst niedrig.
  const FAELLE = [
    ["A", { underdogBoost: 1.8 }],
    ["B", {
      joker: { enabled: true, faktor: 1.6 },
      bigGame: { enabled: true, aufschlag: 0.7 },
      teamMods: { derbyFaktor: 1.4 },
      wettbewerbe: { enabled: true, aufschlaege: { cl: 0.5 } },
    }],
    ["C", {
      saisonform: { kurve: "linear", staerke: 2.2 },
      aufholen: { enabled: true, staerke: 0.5 },
      duell: { enabled: true, phase: "schlussspurt", typen: ["klau"], zielWahl: "nurVorne" },
    }],
    ["D", {
      duell: { enabled: true, typen: ["klau", "block"], phase: "ganze", zielWahl: "frei" },
      joker: { abstimmung: true, heimat: { enabled: true } },
    }],
    ["E", {
      saisonform: { streich: 5 },
      versaeumnis: { enabled: true },
      ereignisse: { enabled: true, aktive: [{ key: "serie" }, { key: "erster-exakter" }, { key: "aussenseiter" }] },
    }],
    ["F", { saison: { enabled: true, gewicht: 2 }, combo: { exakt: 3.5 } }],
  ];

  it.each(FAELLE)("Pflichttest 1 · Achse %s allein hochgedreht ergibt dort einen hohen, sonst niedrige Werte", (achse, rules) => {
    const p = achsenProfil(rules);
    expect(p[achse].wert).toBeGreaterThanOrEqual(2);
    for (const andere of ACHSEN.map((a) => a.key)) {
      if (andere === achse) continue;
      // A und F tragen aus Engine-Defaults eine unvermeidbare Grundlast
      // (wrongPenalty/minPayout bzw. `markets.goals.enabled`, siehe
      // Kopfkommentar) — die bleibt niedrig (≤2), wird hier aber toleriert,
      // solange sie klar unter dem hochgedrehten Wert liegt.
      expect(p[andere].wert).toBeLessThan(p[achse].wert === 3 ? 3 : p[achse].wert + 1);
      expect(p[andere].wert).toBeLessThanOrEqual(2);
    }
  });

  // Pflichttest 2: eine ausgeschaltete Ebene trägt 0 bei.
  it("Pflichttest 2 · duell.enabled: false trägt trotz gesetzter Felder 0 zu C und D bei", () => {
    const rules = { duell: { enabled: false, typen: ["klau", "block"], zielWahl: "frei", phase: "schlussspurt" } };
    const p = achsenProfil(rules);
    expect(p.D.wert).toBe(0);
    expect(p.D.quellen).toEqual([]);
    expect(p.C.quellen).not.toContain("duell.phase");
  });

  it("eine ausgeschaltete Ebene trägt 0 bei — auch bei joker.mut mit gesetztem Faktor", () => {
    const rules = { joker: { mut: { enabled: false, faktor: 1.9 } } };
    const p = achsenProfil(rules);
    expect(p.A.quellen).not.toContain("joker.mut.faktor");
  });

  // Achse D · joker.abstimmung (design/joker-inventar.md 3.1, Korrektur 31.07.)
  it("Achse D · joker.abstimmung: true trägt bei, joker.abstimmung: false trägt nicht bei", () => {
    const mitAbstimmung = achsenProfil({ joker: { enabled: true, abstimmung: true } });
    expect(mitAbstimmung.D.quellen).toContain("joker.abstimmung");

    const ohneAbstimmung = achsenProfil({ joker: { enabled: true, abstimmung: false } });
    expect(ohneAbstimmung.D.quellen).not.toContain("joker.abstimmung");
  });

  // Achse F · Namen je Spiel (design/joker-inventar.md 3.1, Korrektur 31.07.)
  it("Achse F · proTeam mit picksPerTeam: 2 (4 Namen) ergibt den hohen Beitrag", () => {
    const p = achsenProfil({ markets: { goals: { enabled: true, modus: "proTeam", picksPerTeam: 2 } } });
    const quelle = p.F.quellen.filter((q) => q === "markets.goals.enabled");
    expect(quelle.length).toBeGreaterThan(0);
    expect(p.F.wert).toBeGreaterThanOrEqual(2);
  });

  it("Achse F · proSpiel mit picksProSpiel: 1 ergibt den niedrigen Beitrag", () => {
    const hoch = achsenProfil({ markets: { goals: { enabled: true, modus: "proTeam", picksPerTeam: 2 } } });
    const niedrig = achsenProfil({ markets: { goals: { enabled: true, modus: "proSpiel", picksProSpiel: 1 } } });
    expect(niedrig.F.wert).toBeLessThan(hoch.F.wert);
  });

  it("Achse F · markets.goals.enabled: false trägt 0 bei", () => {
    const p = achsenProfil({ markets: { goals: { enabled: false } } });
    expect(p.F.quellen).not.toContain("markets.goals.enabled");
  });
});

// ── achsenKonflikte ──────────────────────────────────────────

describe("achsenKonflikte", () => {
  // Pflichttest 3
  it("Pflichttest 3 · meldet Achse A bei underdogBoost 1,8 PLUS joker.mut.faktor 1,2", () => {
    const rules = { underdogBoost: 1.8, joker: { mut: { enabled: true, faktor: 1.2 } } };
    const profil = achsenProfil(rules);
    const konflikte = achsenKonflikte(profil);
    const treffer = konflikte.find((k) => k.achse === "A");
    expect(treffer).toBeTruthy();
    expect(treffer.text).toContain("underdogBoost");
    expect(treffer.text).toContain("joker.mut.faktor");
  });

  // Pflichttest 4 — der wichtigste Test.
  it("Pflichttest 4 (wichtigster Test) · meldet NICHTS bei hohem underdogBoost (A) plus aktivem Duell-Joker (D) — verschiedene Achsen", () => {
    const rules = {
      underdogBoost: 1.8, wrongPenalty: -5, minPayout: 3.5, // Grundlast neutralisiert
      duell: { enabled: true, typen: ["klau", "block"] },
    };
    const profil = achsenProfil(rules);
    expect(profil.A.wert).toBeGreaterThanOrEqual(2);
    expect(profil.D.wert).toBeGreaterThanOrEqual(2);
    expect(achsenKonflikte(profil)).toEqual([]);
  });

  it("meldet nichts bei einer hohen Achse mit nur EINER Quelle", () => {
    const profil = achsenProfil({ underdogBoost: 1.8, wrongPenalty: -5, minPayout: 3.5 });
    expect(profil.A.quellen).toHaveLength(1);
    expect(achsenKonflikte(profil)).toEqual([]);
  });

  it("ohne Profil-Eingabe keine Konflikte", () => {
    expect(achsenKonflikte({})).toEqual([]);
    expect(achsenKonflikte(undefined)).toEqual([]);
  });
});

// ── Code-Schema ──────────────────────────────────────────────

describe("bildeCode / zerlegeCode", () => {
  it("bildeCode fügt Preset- und Kombi-Key mit einem Bindestrich zusammen", () => {
    expect(bildeCode("underdog-party", "sparflamme")).toBe("underdog-party-sparflamme");
    expect(bildeCode("standard", "rundumschlag")).toBe("standard-rundumschlag");
  });

  // Pflichttest: zerlegeCode(bildeCode(p, k)) === { p, k } für ALLE
  // Preset-Keys aus presets.js (inkl. „underdog-party", das selbst einen
  // Bindestrich trägt) × alle Kombi-Keys.
  it("Pflichttest · zerlegeCode(bildeCode(p, k)) ergibt wieder { presetKey: p, kombiKey: k } für alle Preset- × Kombi-Kombinationen", () => {
    for (const preset of PRESETS) {
      for (const kombi of KOMBINATIONEN) {
        const code = bildeCode(preset.key, kombi.key);
        expect(zerlegeCode(code)).toEqual({ presetKey: preset.key, kombiKey: kombi.key });
      }
    }
  });

  it("insbesondere: underdog-party (Bindestrich im Preset-Key) rundtrippt korrekt", () => {
    const code = bildeCode("underdog-party", "gleichgewicht");
    expect(code).toBe("underdog-party-gleichgewicht");
    expect(zerlegeCode(code)).toEqual({ presetKey: "underdog-party", kombiKey: "gleichgewicht" });
  });

  // Pflichttest: null bei unbekannten Teilen und bei Müll ohne Bindestrich.
  it("Pflichttest · liefert null bei unbekanntem Preset-Teil", () => {
    expect(zerlegeCode("nichtvorhanden-sparflamme")).toBeNull();
  });

  it("Pflichttest · liefert null bei unbekanntem Kombi-Teil", () => {
    expect(zerlegeCode("standard-nichtvorhanden")).toBeNull();
  });

  it("Pflichttest · liefert null bei Müll ohne Bindestrich", () => {
    expect(zerlegeCode("nurbuchstabenohnebindestrich")).toBeNull();
    expect(zerlegeCode("")).toBeNull();
  });

  it("liefert null bei Nicht-Strings", () => {
    expect(zerlegeCode(null)).toBeNull();
    expect(zerlegeCode(undefined)).toBeNull();
    expect(zerlegeCode(42)).toBeNull();
  });

  it("zerlegt am LETZTEN Bindestrich (Falle aus dem Kopfkommentar)", () => {
    // "underdog-party-sparflamme" hat zwei Bindestriche — der Preset-Teil
    // ("underdog-party") enthält selbst einen. Am LETZTEN Bindestrich
    // zerlegt ergibt presetKey "underdog-party", kombiKey "sparflamme" — das
    // ist korrekt, weil beide Teile gegen ihre Kataloge geprüft werden.
    expect(zerlegeCode("underdog-party-sparflamme")).toEqual({ presetKey: "underdog-party", kombiKey: "sparflamme" });
  });
});

// ── Beschreibung ─────────────────────────────────────────────

describe("beschreibeKombination", () => {
  it("nennt Label, Beschreibung, Neigung, Dichte und Schärfe", () => {
    const rundumschlag = KOMBINATIONEN.find((k) => k.key === "rundumschlag");
    const text = beschreibeKombination(rundumschlag);
    expect(text).toContain("Rundumschlag");
    expect(text).toContain(rundumschlag.desc);
    expect(text).toContain("Neutral");
    expect(text).toContain("Dicht");
    expect(text).toContain("Zahm");
  });
});
