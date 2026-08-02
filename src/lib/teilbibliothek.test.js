import { describe, it, expect } from "vitest";
import { DEFAULT_RULES, sanitizeRules, encodePreset, istCreatorCode } from "@/lib/engine";
import { ASPEKTE } from "@/lib/presetMerge";
import { PRESETS } from "@/lib/presets";
import { generateJoinCode } from "@/lib/joinCode";
import {
  bildeTeilCode, zerlegeTeilCode, wendeTeilCodeAn, istTeilCode, beschreibeTeilCode,
  TEILBIBLIOTHEKEN,
} from "@/lib/teilbibliothek";

// Je Aspekt eine gültige, vom Standard abweichende Änderung — nur ein paar
// Felder je Aspekt, nicht alle (der Rundlauf-Test prüft trotzdem, dass genau
// die ganzen Aspekt-Felder ankommen, nicht mehr und nicht weniger).
const AENDERUNGEN = {
  naehe: { k: 1.45, wrongPenalty: -2 },
  kombi: { combo: { tendenz: 1.3, abstand: 1.8, exakt: 3 } },
  underdog: { underdogBoost: 1.6, favFlopPenalty: 2 },
  modifikatoren: { modCap: 2, modFloor: 0.5 },
  spiele: { spiele: { ...DEFAULT_RULES.spiele, spieltagVon: 5, spieltagBis: 30 } },
  fairness: { aufholen: { ...DEFAULT_RULES.aufholen, enabled: true, staerke: 0.4 } },
  saison: { saison: { ...DEFAULT_RULES.saison, enabled: true, gewicht: 1.5 } },
  maerkte: { oddsMode: "average" },
  anzeige: { displayScale: 20 },
};

// Alle Top-Level-Felder aus DEFAULT_RULES außer „name" (das gehört zu keinem
// Aspekt, siehe presetMerge.test.js „die Aspekte erfassen alle Regel-Felder
// außer dem Namen").
const ALLE_FELDER = Object.keys(DEFAULT_RULES).filter((k) => k !== "name");

describe("bildeTeilCode / zerlegeTeilCode / wendeTeilCodeAn — Rundlauf je Aspekt (Pflichttest 1)", () => {
  for (const aspekt of ASPEKTE) {
    it(`Aspekt „${aspekt.key}": genau seine Felder kommen an, alle anderen bleiben Standard`, () => {
      const geaendert = sanitizeRules({ ...DEFAULT_RULES, ...AENDERUNGEN[aspekt.key] });
      const code = bildeTeilCode(geaendert, aspekt.key);
      expect(istTeilCode(code)).toBe(true);

      const ergebnis = wendeTeilCodeAn(DEFAULT_RULES, code);

      // Genau die Felder DIESES Aspekts kommen an ...
      for (const feld of aspekt.keys) {
        expect(ergebnis[feld]).toEqual(geaendert[feld]);
      }
      // ... und alle Felder anderer Aspekte bleiben beim Standard.
      const andere = ALLE_FELDER.filter((f) => !aspekt.keys.includes(f));
      for (const feld of andere) {
        expect(ergebnis[feld]).toEqual(sanitizeRules(DEFAULT_RULES)[feld]);
      }
    });
  }
});

describe("wendeTeilCodeAn lässt andere Aspekte unberührt (Pflichttest 2)", () => {
  it("Regelwerk A ändert zwei Aspekte, Teil-Code trägt nur einen, angewendet auf B wandert nur der eine", () => {
    const A = sanitizeRules({
      ...DEFAULT_RULES,
      ...AENDERUNGEN.naehe,      // Aspekt 1: naehe
      ...AENDERUNGEN.underdog,   // Aspekt 2: underdog
    });
    const B = sanitizeRules(PRESETS.find((p) => p.key === "hardcore").rules);

    const codeNaehe = bildeTeilCode(A, "naehe");
    const ergebnis = wendeTeilCodeAn(B, codeNaehe);

    // Der eine Aspekt (naehe) wandert vollständig von A — inklusive der
    // Felder, die A gar nicht explizit geändert hat (m, minPayout,
    // winnerFloor bleiben bei A auf Standard, also kommt der Standard an,
    // NICHT B's eigener Wert). Das ist die „ganzer Aspekt, nie ein halber
    // Satz"-Regel aus design/teilbibliotheken.md Abschnitt 1.
    for (const feld of ["k", "m", "minPayout", "wrongPenalty", "winnerFloor"]) {
      expect(ergebnis[feld]).toEqual(A[feld]);
    }
    expect(ergebnis.k).toBe(1.45);
    expect(ergebnis.minPayout).toBe(DEFAULT_RULES.minPayout); // NICHT B.minPayout (5)

    // Der andere in A geänderte Aspekt (underdog) ist NICHT im Teil-Code —
    // er bleibt exakt bei B, obwohl A ihn ebenfalls geändert hat.
    expect(ergebnis.underdogBoost).toBe(B.underdogBoost);
    expect(ergebnis.favFlopPenalty).toBe(B.favFlopPenalty);
    expect(ergebnis.underdogBoost).not.toBe(A.underdogBoost);

    // Und ein Aspekt, den weder Teil-Code noch Auswahl betreffen (kombi),
    // bleibt ebenfalls exakt bei B.
    expect(ergebnis.combo).toEqual(B.combo);
  });
});

describe("zerlegeTeilCode liefert null bei allem Ungültigen (Pflichttest 3)", () => {
  it("unbekannter Aspekt", () => {
    const fakeCode = `TS2A-quatsch-${bildeTeilCode(DEFAULT_RULES, "naehe").split("-").slice(2).join("-")}`;
    expect(zerlegeTeilCode(fakeCode)).toBeNull();
  });

  it("kaputtes Base64", () => {
    expect(zerlegeTeilCode("TS2A-naehe-@@@nicht-base64@@@")).toBeNull();
  });

  it("Müll allgemein", () => {
    expect(zerlegeTeilCode("")).toBeNull();
    expect(zerlegeTeilCode(null)).toBeNull();
    expect(zerlegeTeilCode(undefined)).toBeNull();
    expect(zerlegeTeilCode(123)).toBeNull();
    expect(zerlegeTeilCode("TS2A-")).toBeNull();
    expect(zerlegeTeilCode("TS2A-naehe-")).toBeNull();
  });

  it("normaler TS2--Vollcode ist kein Teil-Code", () => {
    const vollcode = encodePreset(DEFAULT_RULES);
    expect(zerlegeTeilCode(vollcode)).toBeNull();
  });
});

describe("istTeilCode (Pflichttest 4)", () => {
  it("erkennt Teil-Codes, aber weder Vollcodes noch Server-Kurzcodes", () => {
    const teilCode = bildeTeilCode(DEFAULT_RULES, "naehe");
    const vollCode = encodePreset(DEFAULT_RULES);
    const kurzCode = generateJoinCode();

    expect(istTeilCode(teilCode)).toBe(true);
    expect(istTeilCode(vollCode)).toBe(false);
    expect(istTeilCode(kurzCode)).toBe(false);

    // Konsistenz mit dem bestehenden istCreatorCode (engine.js, unverändert):
    // die beiden Codearten schließen sich gegenseitig aus.
    expect(istCreatorCode(teilCode)).toBe(false);
    expect(istCreatorCode(vollCode)).toBe(true);
  });
});

describe("Ein Teil-Code ist deutlich kürzer als der Vollcode (Pflichttest 5)", () => {
  it("misst die Längen", () => {
    // Regelwerk, das in JEDEM Aspekt vom Standard abweicht.
    const voll = sanitizeRules(Object.values(AENDERUNGEN).reduce(
      (acc, aenderung) => ({ ...acc, ...aenderung }), { ...DEFAULT_RULES }
    ));
    const vollCode = encodePreset(voll);
    const teilCode = bildeTeilCode(voll, "naehe");

    expect(teilCode.length).toBeLessThan(vollCode.length);
    // Für den Bericht: gemessene Längen.
    // eslint-disable-next-line no-console
    console.log(`Vollcode-Länge: ${vollCode.length}, Teil-Code-Länge (naehe): ${teilCode.length}`);
  });
});

describe("TEILBIBLIOTHEKEN — werte enthält nur Felder des eigenen Aspekts (Pflichttest 6)", () => {
  it("jeder Eintrag jeder Teilbibliothek trägt ausschließlich Felder seines Aspekts", () => {
    expect(TEILBIBLIOTHEKEN.length).toBe(ASPEKTE.length);
    for (const bibliothek of TEILBIBLIOTHEKEN) {
      const aspektDef = ASPEKTE.find((a) => a.key === bibliothek.aspekt);
      expect(aspektDef).toBeTruthy();
      for (const eintrag of bibliothek.eintraege) {
        const fremd = Object.keys(eintrag.werte).filter((k) => !aspektDef.keys.includes(k));
        expect(fremd).toEqual([]);
      }
    }
  });

  it("der Aspekt „modifikatoren“ ist über KOMBINATIONEN befüllt", () => {
    const modifikatoren = TEILBIBLIOTHEKEN.find((b) => b.aspekt === "modifikatoren");
    expect(modifikatoren.eintraege.length).toBeGreaterThanOrEqual(3);
    for (const eintrag of modifikatoren.eintraege) {
      expect(eintrag.key).toBeTruthy();
      expect(eintrag.label).toBeTruthy();
      expect(Object.keys(eintrag.werte).sort()).toEqual(["budget", "duell", "limitKlassen"]);
    }
  });
});

describe("beschreibeTeilCode", () => {
  it("ein Satz mit Aspekt-Label und Feld-Anzahl", () => {
    const code = bildeTeilCode(sanitizeRules({ ...DEFAULT_RULES, ...AENDERUNGEN.modifikatoren }), "modifikatoren");
    const satz = beschreibeTeilCode(code);
    expect(satz).toContain(ASPEKTE.find((a) => a.key === "modifikatoren").label);
    expect(satz).toMatch(/\d+ abweichende/);
  });

  it("meldet einen ungültigen Code statt zu werfen", () => {
    expect(beschreibeTeilCode("Quatsch")).toBe("Ungültiger Teil-Code.");
  });
});

describe("bildeTeilCode — unbekannter Aspekt wirft", () => {
  it("wirft statt einen halben Code zu erzeugen", () => {
    expect(() => bildeTeilCode(DEFAULT_RULES, "gibtsnicht")).toThrow();
  });
});

describe("wendeTeilCodeAn — ungültiger Code wirft mit klarer Meldung", () => {
  it("wirft mit deutscher Fehlermeldung", () => {
    expect(() => wendeTeilCodeAn(DEFAULT_RULES, "Quatsch")).toThrow(/Teil-Code/);
  });
});

// ── Der Weg durch die Oberfläche ────────────────────────────
// ⚠️ Diese Prüfung ist der Grund, aus dem es sie gibt: `load()` in
// `Spielerstellung.jsx` unterscheidet Teil-Code, Creator-Code und
// Server-Kurzcode allein am Präfix. Genau dort ist beim Umstieg auf das
// Delta-Format (`TS1-` → `TS2-`) schon einmal ein Format durchs Raster
// gefallen und beim Store aufgelaufen — grün in allen Tests, kaputt für den
// Nutzer. Der Weg „erzeugen → einlesen" gehört deshalb dauerhaft in die Suite
// und nicht in eine Datei, die nach dem Lauf gelöscht wird.
describe("Erzeugen und wieder einlesen — der Weg, den die Oberfläche geht", () => {
  it("ein Teil-Code wird NICHT für einen Creator- oder Kurzcode gehalten", () => {
    for (const aspekt of ASPEKTE) {
      const code = bildeTeilCode(sanitizeRules(DEFAULT_RULES), aspekt.key);
      expect(istTeilCode(code), aspekt.key).toBe(true);
      // Fiele er hier durch, landete er im Kurzcode-Zweig und liefe beim
      // Store auf.
      expect(istCreatorCode(code), aspekt.key).toBe(false);
    }
  });

  it("umgekehrt: ein Vollcode wird nicht für einen Teil-Code gehalten", () => {
    const voll = encodePreset(sanitizeRules(DEFAULT_RULES));
    expect(istCreatorCode(voll)).toBe(true);
    expect(istTeilCode(voll)).toBe(false);
  });

  it("und ein Server-Kurzcode ist weder das eine noch das andere", () => {
    const kurz = generateJoinCode();
    expect(istTeilCode(kurz)).toBe(false);
    expect(istCreatorCode(kurz)).toBe(false);
  });

  it("der vollständige Weg: kopieren, bei jemand anderem einfügen", () => {
    const meins = sanitizeRules({ ...DEFAULT_RULES, name: "Meine Runde", k: 1.55, m: 0.25 });
    const code = bildeTeilCode(meins, "naehe");

    const fremd = sanitizeRules({ ...DEFAULT_RULES, name: "Anderer Admin" });
    const danach = wendeTeilCodeAn(fremd, code);

    expect(danach.k).toBe(meins.k);
    expect(danach.m).toBe(meins.m);
    // Der Name gehört zu keinem Aspekt und darf nicht mitwandern.
    expect(danach.name).toBe("Anderer Admin");
  });
});
