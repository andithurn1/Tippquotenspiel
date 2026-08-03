import { describe, it, expect } from "vitest";
import {
  DEFAULT_RULES, sanitizeRules, encodePreset, istCreatorCode,
  scoreTip, createMockOddsSource,
} from "@/lib/engine";
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

// ── Kuratierte Kataloge je Aspekt (design/teilbibliotheken.md Abschnitt 7,
//    Schritt 3) ─────────────────────────────────────────────
describe("TEILBIBLIOTHEKEN — jeder Aspekt ist kuratiert", () => {
  // ⚠️ Nur eine UNTERgrenze. `design/teilbibliotheken.md` Abschnitt 3 nennt
  // „3–5 Einträge je Bereich" — das ist ein Hinweis für die Kuratierung, keine
  // Invariante. Eine erste Fassung dieses Tests hat die 5 als Obergrenze
  // geprüft und ist prompt an `modifikatoren` gescheitert: dort stehen die
  // SECHS Ökonomien aus `KOMBINATIONEN`, die es lange vor dieser Datei gab und
  // die bewusst so geschnitten sind. Einen vermessenen Katalog wegen eines
  // Halbsatzes im Entwurf zu kürzen, wäre der falsche Weg herum.
  it("kein Aspekt ist mehr leer", () => {
    for (const bibliothek of TEILBIBLIOTHEKEN) {
      expect(bibliothek.eintraege.length, bibliothek.aspekt).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("TEILBIBLIOTHEKEN — eindeutige Schlüssel, sichtbare Texte gesetzt", () => {
  it("jeder Aspekt hat eindeutige keys, und label/desc sind nicht-leere Strings", () => {
    for (const bibliothek of TEILBIBLIOTHEKEN) {
      const keys = bibliothek.eintraege.map((e) => e.key);
      expect(new Set(keys).size, bibliothek.aspekt).toBe(keys.length);
      for (const eintrag of bibliothek.eintraege) {
        expect(typeof eintrag.label, `${bibliothek.aspekt}.${eintrag.key}`).toBe("string");
        expect(eintrag.label.trim(), `${bibliothek.aspekt}.${eintrag.key}`).not.toBe("");
        expect(typeof eintrag.desc, `${bibliothek.aspekt}.${eintrag.key}`).toBe("string");
        expect(eintrag.desc.trim(), `${bibliothek.aspekt}.${eintrag.key}`).not.toBe("");
      }
    }
  });
});

// ⚠️ Verglichen wird nur, was der Eintrag TATSÄCHLICH angibt — rekursiv bis
// aufs Blatt, Arrays als Ganzes.
//
// Eine erste Fassung verlangte Tiefengleichheit des ganzen Feldes und ist an
// allen sechs `modifikatoren`-Einträgen gescheitert. Zu Recht: `KOMBINATIONEN`
// speichert bewusst nur die ABWEICHUNG (`budget: { enabled: false }`), und die
// delegierenden Sanitizer füllen daraus zehn Felder auf. Das ist kein Mangel,
// sondern dieselbe Sparsamkeit, aus der auch der Creator-Code nur Deltas trägt.
//
// Die Zusicherung, um die es geht, bleibt dabei vollständig erhalten: kein
// angegebener Wert darf unterwegs still verändert werden. Genau daran ist
// `maerkte.schuetzenImMittelpunkt` mit `picksPerTeam: 4` aufgefallen (Grenze
// ist 3) — der Eintrag hätte sonst etwas anderes geliefert, als er verspricht.
// ⚠️ Auch in Arrays wird hineingeschaut, ELEMENTWEISE. Das weicht bewusst von
// der Delta-Regel des Creator-Codes ab („Arrays werden als GANZES verglichen",
// design/creator-code-delta.md) — dort geht es ums Kodieren, hier um die
// Frage, ob ein Wert unterwegs verändert wurde. `limitKlassen` ist eine Liste
// von Objekten, die `sanitizeLimitKlassen` je Element auffüllt; ein Vergleich
// der ganzen Liste würde daran scheitern und dabei genau das verdecken, was
// geprüft werden soll. Die Länge muss stimmen — ein verschluckter Eintrag wäre
// sehr wohl eine Veränderung.
function angegebeneWerteUeberleben(ist, soll, pfad = "") {
  if (Array.isArray(soll)) {
    expect(Array.isArray(ist), `${pfad} ist keine Liste`).toBe(true);
    expect(ist.length, `${pfad} — Anzahl der Einträge`).toBe(soll.length);
    soll.forEach((wert, i) => angegebeneWerteUeberleben(ist[i], wert, `${pfad}[${i}]`));
    return;
  }
  if (soll === null || typeof soll !== "object") {
    expect(JSON.stringify(ist), pfad).toBe(JSON.stringify(soll));
    return;
  }
  for (const [feld, wert] of Object.entries(soll)) {
    angegebeneWerteUeberleben(ist?.[feld], wert, pfad ? `${pfad}.${feld}` : feld);
  }
}

describe("TEILBIBLIOTHEKEN — jeder Eintrag GREIFT (Pflichttest 7)", () => {
  for (const bibliothek of TEILBIBLIOTHEKEN) {
    for (const eintrag of bibliothek.eintraege) {
      it(`Aspekt „${bibliothek.aspekt}“, Eintrag „${eintrag.key}“: sanitizeRules verändert keinen angegebenen Wert`, () => {
        const clean = sanitizeRules({ ...DEFAULT_RULES, ...eintrag.werte });
        angegebeneWerteUeberleben(clean, eintrag.werte, `${bibliothek.aspekt}.${eintrag.key}`);
      });

      it(`Aspekt „${bibliothek.aspekt}“, Eintrag „${eintrag.key}“: Rundlauf über den Teil-Code liefert dieselben Werte`, () => {
        const geaendert = sanitizeRules({ ...DEFAULT_RULES, ...eintrag.werte });
        const code = bildeTeilCode(geaendert, bibliothek.aspekt);
        const ergebnis = wendeTeilCodeAn(DEFAULT_RULES, code);
        angegebeneWerteUeberleben(ergebnis, eintrag.werte, `${bibliothek.aspekt}.${eintrag.key}`);
      });
    }
  }
});

describe("TEILBIBLIOTHEKEN — mindestens zwei Einträge je Aspekt unterscheiden sich", () => {
  it("kein Aspekt besteht aus lauter identischen Einträgen", () => {
    for (const bibliothek of TEILBIBLIOTHEKEN) {
      const stringified = bibliothek.eintraege.map((e) => JSON.stringify(e.werte));
      expect(new Set(stringified).size, bibliothek.aspekt).toBeGreaterThan(1);
    }
  });
});

// ── Verschieden in den WERTEN ist nicht verschieden in der WIRKUNG ──────────
//
// 🔴 Der Test darüber vergleicht `werte` als Text und war grün, während drei
// der vier „naehe"-Einträge an JEDEM Tipp exakt dieselben Punkte zahlten:
// nur `k` war gestaffelt, `m` stand überall auf der Vorgabe — und weil
// `scoreResult` das `max()` seiner Teile nimmt, überdeckte die an `m` hängende
// Team-Tore-Nähe den ganzen Unterschied. Gefunden beim Nachrechnen, nicht vom
// Test; genau die Fehlerklasse „ein Test prüft, ob die Funktion tut was
// dasteht, nicht ob sie tut was gemeint war".
//
// Deshalb hier die Gegenprobe an echten Punkten. Sie gilt bewusst nur für
// „naehe" und „kombi": das sind die beiden Aspekte, die unmittelbar auf die
// Wertung EINES Tipps durchschlagen und sich deshalb ohne Saison-Simulation
// messen lassen. Für die übrigen wäre eine Punkte-Probe eine halbe Messung,
// die mehr verspricht, als sie hält.
describe("TEILBIBLIOTHEKEN — die Einträge schmecken auch wirklich verschieden", () => {
  const odds = createMockOddsSource();
  const snap = odds.getSnapshot("JOR-ESP");
  const actual = odds.getResult("JOR-ESP"); // real 5:1

  // Tipps mit WACHSENDEM Abstand zum echten Ergebnis — sonst wird die
  // Nähe-Dämpfung gar nicht angefasst. Eine erste Fassung dieser Probe nahm
  // nur exakt/Abstand/Tendenz/daneben und sah deshalb keinen Unterschied.
  const TIPPS = [
    { home: 5, away: 1 }, { home: 4, away: 1 }, { home: 3, away: 1 },
    { home: 2, away: 0 }, { home: 1, away: 1 }, { home: 0, away: 3 },
  ];

  // ⚠️ MIT Torschützen. Eine erste Fassung tippte leere Schützen-Listen und
  // meldete daraufhin, „flach" und „gestuft" seien identisch — was stimmte,
  // aber nichts über die Einträge aussagte: die Kombi-Stufen vervielfachen
  // die TOR-Gewinne (`applyCombo`), und ohne getippte Schützen gibt es nichts
  // zu vervielfachen. Der Wächter muss anfassen, was er misst.
  // Al-Naimat trifft wirklich (2×), Yamal auch (1×) — so tragen beide Seiten
  // etwas bei, statt dass die Tor-Ebene glatt null bleibt.
  const SCHUETZEN = { home: ["Al-Naimat"], away: ["Yamal"] };

  const punkteProfil = (werte) => {
    const rules = sanitizeRules({ ...DEFAULT_RULES, ...werte });
    return TIPPS.map((t) =>
      scoreTip({ ...t, goals: SCHUETZEN }, actual, snap, rules).raw);
  };

  for (const aspekt of ["naehe", "kombi"]) {
    it(`Aspekt „${aspekt}“: je zwei Einträge zahlen für dieselben Tipps verschieden`, () => {
      const eintraege = TEILBIBLIOTHEKEN.find((b) => b.aspekt === aspekt).eintraege;
      const profile = eintraege.map((e) => [e.key, JSON.stringify(punkteProfil(e.werte))]);
      for (let i = 0; i < profile.length; i++) {
        for (let j = i + 1; j < profile.length; j++) {
          expect(profile[i][1], `„${profile[i][0]}“ und „${profile[j][0]}“ zahlen identisch`)
            .not.toBe(profile[j][1]);
        }
      }
    });
  }
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
