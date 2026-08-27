import { describe, it, expect } from "vitest";
import { greiftNicht, beschreibeGreiftNicht } from "./greiftNicht";
import { DEFAULT_RULES, sanitizeRules, createMockOddsSource } from "./engine";
import { alleMatches } from "./ligen";
import { filterSpiele } from "./spielauswahl";
import { schaufensterRegeln } from "./schaufenster";

// ============================================================
//  Was hier geprueft wird
//
//  🔴 Zwei Richtungen, und die zweite ist die wichtigere: ein Bericht, der zu
//  VIEL meldet, ist schlimmer als keiner. Wer bei jeder Runde drei Meldungen
//  sieht, die nichts bedeuten, liest ab der zweiten Woche keine mehr -- und
//  uebersieht dann die eine, die zaehlt.
//
//  Deshalb hat fast jeder Fall seine Gegenprobe: dieselbe Einstellung in einer
//  Runde, in der sie GREIFT, darf nicht gemeldet werden.
// ============================================================

const KATALOG = alleMatches();
const BL = KATALOG.filter((m) => m.wettbewerb === "bl");
const snapVon = (m) => m.snapshot ?? null;
const mitSnaps = (liste) => liste.filter(snapVon);

const regeln = (teil) => sanitizeRules({ ...DEFAULT_RULES, ...teil });

describe("Grundverhalten", () => {
  it("die Vorgabe meldet gar nichts -- sonst waere der Bericht Rauschen", () => {
    expect(greiftNicht(DEFAULT_RULES, { matches: BL, mitglieder: 5 })).toEqual([]);
  });

  it("ohne Spiele und ohne Mitglieder haelt er sich zurueck", () => {
    // 🔴 Beim ANLEGEN gibt es weder das eine noch das andere. Ein Bericht, der
    // dort schon meckert, meckert ueber eine Runde, die es nicht gibt.
    const scharf = regeln({
      duell: { ...DEFAULT_RULES.duell, enabled: true },
      wettbewerbe: { enabled: true, aufschlaege: { cl: 0.3 }, phasenStufe: 0 },
    });
    expect(greiftNicht(scharf, {})).toEqual([]);
  });

  it("jeder Befund traegt Titel, Text und einen Weg heraus", () => {
    const funde = greiftNicht(regeln({
      sperre: { enabled: true, schuetzen: 1 },
      markets: { ...DEFAULT_RULES.markets, goals: { ...DEFAULT_RULES.markets.goals, enabled: false } },
    }), { matches: BL, mitglieder: 5 });
    expect(funde.length).toBeGreaterThan(0);
    for (const f of funde) {
      expect(f.key).toBeTruthy();
      expect(f.titel.length).toBeGreaterThan(5);
      expect(f.text.length).toBeGreaterThan(20);
      expect(f.beheben.length).toBeGreaterThan(10);
    }
  });

  it("der Satz darueber nennt die Zahl", () => {
    expect(beschreibeGreiftNicht([])).toMatch(/greift in dieser Runde auch/);
    expect(beschreibeGreiftNicht([{ key: "a" }])).toMatch(/1 Einstellung greift/);
    expect(beschreibeGreiftNicht([{ key: "a" }, { key: "b" }])).toMatch(/2 Einstellungen greifen/);
  });
});

describe("Favoriten-Regel ohne Torschuetzen", () => {
  const ohneSchuetzen = {
    markets: { ...DEFAULT_RULES.markets, goals: { ...DEFAULT_RULES.markets.goals, enabled: false } },
  };

  it("meldet sich, wenn gar keine Torschuetzen getippt werden", () => {
    const funde = greiftNicht(regeln({ ...ohneSchuetzen, sperre: { enabled: true, schuetzen: 1 } }),
      { matches: BL, mitglieder: 5 });
    expect(funde.map((f) => f.key)).toContain("sperre-ohne-schuetzen");
  });

  it("schweigt, wenn Torschuetzen getippt werden -- die Gegenprobe", () => {
    const funde = greiftNicht(regeln({ sperre: { enabled: true, schuetzen: 1 } }),
      { matches: mitSnaps(BL), mitglieder: 5 });
    expect(funde.map((f) => f.key)).not.toContain("sperre-ohne-schuetzen");
  });

  it("schweigt, solange die Regel aus ist", () => {
    const funde = greiftNicht(regeln(ohneSchuetzen), { matches: BL, mitglieder: 5 });
    expect(funde.map((f) => f.key)).not.toContain("sperre-ohne-schuetzen");
  });
});

describe("Wettbewerbs-Gewichte", () => {
  it("meldet Aufschlaege fuer eine Liga, die hier gar nicht laeuft", () => {
    // Champions-League-Aufschlag in einer reinen Bundesliga-Runde.
    const funde = greiftNicht(
      regeln({ wettbewerbe: { enabled: true, aufschlaege: { cl: 0.3 }, phasenStufe: 0 } }),
      { matches: BL, mitglieder: 5 });
    expect(funde.map((f) => f.key)).toContain("wettbewerbe-ohne-wirkung");
  });

  it("schweigt, wenn die Liga dabei ist -- die Gegenprobe", () => {
    const funde = greiftNicht(
      regeln({ wettbewerbe: { enabled: true, aufschlaege: { bl: 0.3 }, phasenStufe: 0 } }),
      { matches: BL, mitglieder: 5 });
    expect(funde.map((f) => f.key)).not.toContain("wettbewerbe-ohne-wirkung");
  });
});

describe("Tabellen-Bonus", () => {
  it("meldet einen Bonus, der erst nach dem letzten Spieltag anspringt", () => {
    const kurz = BL.filter((m) => m.matchday <= 3);
    const funde = greiftNicht(
      regeln({ tabellenBonus: { ...DEFAULT_RULES.tabellenBonus, enabled: true, abSpieltag: 10 } }),
      { matches: kurz, mitglieder: 5 });
    const f = funde.find((x) => x.key === "tabellenbonus-zu-spaet");
    expect(f).toBeTruthy();
    expect(f.text).toContain("10");
    expect(f.text).toContain("3");
  });

  it("schweigt, wenn die Runde weit genug reicht", () => {
    const funde = greiftNicht(
      regeln({ tabellenBonus: { ...DEFAULT_RULES.tabellenBonus, enabled: true, abSpieltag: 5 } }),
      { matches: BL, mitglieder: 5 });
    expect(funde.map((f) => f.key)).not.toContain("tabellenbonus-zu-spaet");
  });
});

describe("Joker, die niemanden treffen koennen", () => {
  const alleine = { matches: BL, mitglieder: 1 };

  it("meldet den Duell-Joker in einer Ein-Personen-Runde", () => {
    const funde = greiftNicht(regeln({ duell: { ...DEFAULT_RULES.duell, enabled: true } }), alleine);
    expect(funde.map((f) => f.key)).toContain("duell-ohne-gegner");
  });

  it("schweigt, sobald jemand da ist -- die Gegenprobe", () => {
    const funde = greiftNicht(regeln({ duell: { ...DEFAULT_RULES.duell, enabled: true } }),
      { matches: BL, mitglieder: 2 });
    expect(funde.map((f) => f.key)).not.toContain("duell-ohne-gegner");
  });

  it("meldet die Fremdjoker-Familie in einer Ein-Personen-Runde", () => {
    const funde = greiftNicht(regeln({
      eingriffe: { ...DEFAULT_RULES.eingriffe, enabled: true,
        trittbrett: { enabled: true, anteil: 0.3, kopierterBekommt: 0 } },
    }), alleine);
    expect(funde.map((f) => f.key)).toContain("fremdjoker-ohne-gegner");
  });

  it("bei unbekannter Mitgliederzahl schweigen BEIDE", () => {
    const funde = greiftNicht(regeln({ duell: { ...DEFAULT_RULES.duell, enabled: true } }),
      { matches: BL });
    expect(funde.map((f) => f.key)).not.toContain("duell-ohne-gegner");
  });
});

describe("Saison-Wetten ohne Wetten", () => {
  it("meldet die eingeschaltete Ebene ohne eine einzige Wette", () => {
    const funde = greiftNicht(regeln({ saison: { enabled: true, gewicht: 1, wetten: [] } }),
      { matches: BL, mitglieder: 5 });
    expect(funde.map((f) => f.key)).toContain("saison-ohne-wetten");
  });
});

// 🔴 Die Probe, die den Bericht vor sich selbst schuetzt.
describe("Kein Rauschen bei den vermessenen Regelwerken", () => {
  it("die Vorgabe in einer normalen Runde meldet nichts", () => {
    const funde = greiftNicht(sanitizeRules(DEFAULT_RULES), { matches: BL, mitglieder: 8 });
    expect(funde, funde.map((f) => f.titel).join(" · ")).toEqual([]);
  });

  it("ein echter Schnappschuss aendert daran nichts", () => {
    // Gegen die Mock-Quelle: der Snapshot traegt echte Quoten und Kader.
    const snap = createMockOddsSource().getSnapshot("JOR-ESP");
    const mitEchtem = [{ matchId: "JOR-ESP", matchday: 1, wettbewerb: "bl", snapshot: snap }];
    expect(greiftNicht(sanitizeRules(DEFAULT_RULES), { matches: mitEchtem, mitglieder: 8 })).toEqual([]);
  });
});

// ============================================================
//  Die Probe gegen die Wirklichkeit
//
//  🔴 Der Bericht findet in der Schaufenster-Runde genau EINEN Fall -- und
//  zwar denselben, den ein Mensch dort im August als Kommentar hinschreiben
//  musste:
//
//    „⚠️ In einer reinen Bundesliga-Runde gibt es keine K.-o.-Phase; die Stufe
//     ist hier also ohne Wirkung und trotzdem gesetzt -- sie soll VORKOMMEN"
//     (schaufenster.js)
//
//  Was bisher nur im Quelltext stand, sagt die App jetzt dem Admin. Genau
//  dafuer ist der Bericht da.
// ============================================================
describe("Probe an der Schaufenster-Runde", () => {
  const rules = schaufensterRegeln();
  const spiele = filterSpiele(alleMatches(), rules.spiele);

  it("die Runde steht -- sonst prueft dieser Block nichts", () => {
    expect(spiele.length).toBeGreaterThan(20);
  });

  it("findet den absichtlich wirkungslosen Wettbewerbs-Aufschlag", () => {
    const funde = greiftNicht(rules, { matches: spiele, mitglieder: 5 });
    expect(funde.map((f) => f.key)).toContain("wettbewerbe-ohne-wirkung");
  });

  it("und sonst nur, was dort ABSICHTLICH steht", () => {
    // 🔴 Die eigentliche Probe: wer bei jeder Runde vier Meldungen sieht, die
    // nichts bedeuten, liest ab der zweiten Woche keine mehr.
    //
    // ⚠️ Beide Funde sind hier RICHTIG, und beide stehen absichtlich in der
    // Schaufenster-Runde:
    //   · der Wettbewerbs-Aufschlag auf die CL in einer reinen BL-Runde
    //     (der Kommentar dort sagt: „soll VORKOMMEN")
    //   · das zweite Recht, dessen Weg bis in die Wertung noch nicht steht
    //     (die Ehrlichkeits-Klausel aus `rechte.js`)
    const funde = greiftNicht(rules, { matches: spiele, mitglieder: 5 });
    expect(funde.map((f) => f.key).sort())
      .toEqual(["recht-ohne-weg", "wettbewerbe-ohne-wirkung"]);
  });
});
