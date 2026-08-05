import { describe, it, expect } from "vitest";
import { regelwerkAmSpieltag, beschreibeBeschluesse } from "./beschluss";
import { sanitizeRules, DEFAULT_RULES } from "./engine";

// Eine Runde, in der abgestimmt wird: Quorum 0, damit die Auszählung nicht das
// Thema dieser Tests ist (die steckt in regelAbstimmung.test.js).
const RUNDE = sanitizeRules({
  ...DEFAULT_RULES,
  regelAbstimmung: { enabled: true, dauer: 2, quorum: 0, sperrfrist: 4 },
});

const MITGLIEDER = Array.from({ length: 4 }, (_, i) => ({ userId: `u${i}` }));
const dafuer = (n) => Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, ja: true }));
const dagegen = (n) => Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, ja: false }));

// Ein Antrag auf den Aspekt „anzeige" — reine Optik, dadurch lässt sich die
// Wirkung an einer einzigen Zahl ablesen, ohne die Wertung zu berühren.
const antrag = (id, gestelltAm, werte, stimmen = dafuer(3)) => ({
  id, aspekt: "anzeige", werte, gestellt_am: gestelltAm,
  laeuft_bis: gestelltAm + RUNDE.regelAbstimmung.dauer, stimmen,
});

describe("regelwerkAmSpieltag — die Rückwirkung ist strukturell ausgeschlossen", () => {
  // 🔴 Der wichtigste Test der Datei. Von Hand: gestellt an 3, Frist bis 5,
  // wirksam ab 6. An Spieltag 5 gilt also noch das ALTE Regelwerk — und zwar
  // nicht, weil es jemand verbietet, sondern weil man für Spieltag 5 fragt.
  it("ein Beschluss gilt erst ab seinem Spieltag, davor das alte Regelwerk", () => {
    const antraege = [antrag("a1", 3, { displayScale: 50 })];

    const vorher = regelwerkAmSpieltag({ rules: RUNDE, antraege, mitglieder: MITGLIEDER, spieltag: 5 });
    expect(vorher.rules.displayScale).toBe(RUNDE.displayScale);
    expect(vorher.angewandt).toEqual([]);

    const nachher = regelwerkAmSpieltag({ rules: RUNDE, antraege, mitglieder: MITGLIEDER, spieltag: 6 });
    expect(nachher.rules.displayScale).toBe(50);
    expect(nachher.angewandt).toEqual([{ id: "a1", aspekt: "anzeige", abSpieltag: 6 }]);
  });

  it("solange die Frist läuft, ist nichts entschieden", () => {
    const antraege = [antrag("a1", 3, { displayScale: 50 })];
    // Frist bis 5 — an Spieltag 5 ist die Abstimmung noch offen.
    const r = regelwerkAmSpieltag({ rules: RUNDE, antraege, mitglieder: MITGLIEDER, spieltag: 5 });
    expect(r.angewandt).toEqual([]);
  });

  it("ein abgelehnter Antrag ändert nichts", () => {
    const antraege = [antrag("a1", 3, { displayScale: 50 }, dagegen(3))];
    const r = regelwerkAmSpieltag({ rules: RUNDE, antraege, mitglieder: MITGLIEDER, spieltag: 20 });
    expect(r.rules.displayScale).toBe(RUNDE.displayScale);
    expect(r.angewandt).toEqual([]);
  });

  it("ohne Spieltag wird nichts angewandt", () => {
    const antraege = [antrag("a1", 3, { displayScale: 50 })];
    const r = regelwerkAmSpieltag({ rules: RUNDE, antraege, mitglieder: MITGLIEDER });
    expect(r.angewandt).toEqual([]);
    expect(r.rules.displayScale).toBe(RUNDE.displayScale);
  });
});

describe("regelwerkAmSpieltag — Reihenfolge", () => {
  // Zwei Beschlüsse auf DENSELBEN Bereich: der spätere gewinnt, unabhängig
  // davon, wie die Liste sortiert hereinkommt. Ohne die chronologische
  // Sortierung hinge das Ergebnis an der Reihenfolge der Datenbankzeilen.
  it("der spätere Beschluss gewinnt, egal wie die Liste sortiert ist", () => {
    const frueh = antrag("a1", 3, { displayScale: 50 });   // wirksam ab 6
    const spaet = antrag("a2", 8, { displayScale: 1 });    // wirksam ab 11

    const inOrdnung = regelwerkAmSpieltag({ rules: RUNDE, antraege: [frueh, spaet], mitglieder: MITGLIEDER, spieltag: 20 });
    const verdreht = regelwerkAmSpieltag({ rules: RUNDE, antraege: [spaet, frueh], mitglieder: MITGLIEDER, spieltag: 20 });

    expect(inOrdnung.rules.displayScale).toBe(1);
    expect(verdreht.rules.displayScale).toBe(1);
    expect(inOrdnung.angewandt.map((x) => x.id)).toEqual(["a1", "a2"]);
    expect(verdreht.angewandt.map((x) => x.id)).toEqual(["a1", "a2"]);
  });

  it("dazwischen gilt der frühere", () => {
    const frueh = antrag("a1", 3, { displayScale: 50 });   // ab 6
    const spaet = antrag("a2", 8, { displayScale: 1 });    // ab 11
    const r = regelwerkAmSpieltag({ rules: RUNDE, antraege: [frueh, spaet], mitglieder: MITGLIEDER, spieltag: 9 });
    expect(r.rules.displayScale).toBe(50);
  });
});

describe("regelwerkAmSpieltag — die Verfassung bricht auch eine Mehrheit", () => {
  it("ein nachträglich festgeschriebener Bereich wird nicht angewandt — aber gemeldet", () => {
    const strenger = sanitizeRules({
      ...RUNDE,
      verfassung: { enabled: true, gesperrt: ["anzeige"] },
    });
    const antraege = [antrag("a1", 3, { displayScale: 50 })];
    const r = regelwerkAmSpieltag({ rules: strenger, antraege, mitglieder: MITGLIEDER, spieltag: 20 });

    expect(r.rules.displayScale).toBe(RUNDE.displayScale);
    expect(r.angewandt).toEqual([]);
    // 🔴 Nicht still verschwinden lassen: die Runde hat abgestimmt und muss
    // erfahren, warum nichts passiert ist.
    expect(r.verworfen).toHaveLength(1);
    expect(r.verworfen[0].id).toBe("a1");
    expect(r.verworfen[0].grund.length).toBeGreaterThan(10);
  });

  it("über die Mitbestimmung selbst wird auch dann nicht abgestimmt, wenn ein Antrag existiert", () => {
    const antraege = [{
      id: "a1", aspekt: "mitbestimmung",
      werte: { regelAbstimmung: { ...RUNDE.regelAbstimmung, quorum: 0 } },
      gestellt_am: 3, laeuft_bis: 5, stimmen: dafuer(4),
    }];
    const r = regelwerkAmSpieltag({ rules: RUNDE, antraege, mitglieder: MITGLIEDER, spieltag: 20 });
    expect(r.angewandt).toEqual([]);
    expect(r.verworfen).toHaveLength(1);
  });

  // 🔴 Keine technische Lücke, sondern Abschnitt 1 der Spec: „ab Spieltag 20
  // werden die zwei schlechtesten Spieltage gestrichen" lässt sich gar nicht
  // anders lesen als rückwirkend — gestrichen würde aus ALLEN Spieltagen.
  it("Regeln, die die ganze Saison formen, werden verworfen statt halb angewandt", () => {
    const antraege = [{
      id: "a1", aspekt: "fairness",
      werte: { saisonform: { ...DEFAULT_RULES.saisonform, streich: 2 } },
      gestellt_am: 3, laeuft_bis: 5, stimmen: dafuer(4),
    }];
    const r = regelwerkAmSpieltag({ rules: RUNDE, antraege, mitglieder: MITGLIEDER, spieltag: 20 });
    expect(r.angewandt).toEqual([]);
    expect(r.verworfen).toHaveLength(1);
    expect(r.verworfen[0].grund).toContain("rückwirkend");
    expect(r.rules.saisonform).toEqual(RUNDE.saisonform);
  });

  it("der Aufhol-Bonus im selben Bereich darf sehr wohl beschlossen werden", () => {
    // `fairness` enthält beides — geprüft wird am FELD, nicht am Aspekt, sonst
    // fiele der Anschluss-Bonus mit heraus, obwohl er je Spieltag entsteht.
    const antraege = [{
      id: "a1", aspekt: "fairness",
      werte: { aufholen: { ...DEFAULT_RULES.aufholen, enabled: true, staerke: 0.2, schwelle: 0.2 } },
      gestellt_am: 3, laeuft_bis: 5, stimmen: dafuer(4),
    }];
    const r = regelwerkAmSpieltag({ rules: RUNDE, antraege, mitglieder: MITGLIEDER, spieltag: 20 });
    expect(r.verworfen).toEqual([]);
    expect(r.angewandt).toHaveLength(1);
    expect(r.rules.aufholen.enabled).toBe(true);
  });

  it("ein unbekannter Bereich wird ignoriert", () => {
    const antraege = [{ ...antrag("a1", 3, { displayScale: 50 }), aspekt: "gibtsnicht" }];
    const r = regelwerkAmSpieltag({ rules: RUNDE, antraege, mitglieder: MITGLIEDER, spieltag: 20 });
    expect(r.angewandt).toEqual([]);
  });
});

describe("regelwerkAmSpieltag — nur der eine Bereich wandert", () => {
  it("Felder anderer Aspekte bleiben unberührt", () => {
    const antraege = [antrag("a1", 3, { displayScale: 50 })];
    const r = regelwerkAmSpieltag({ rules: RUNDE, antraege, mitglieder: MITGLIEDER, spieltag: 20 });
    expect(r.rules.k).toBe(RUNDE.k);
    expect(r.rules.combo).toEqual(RUNDE.combo);
    expect(r.rules.joker).toEqual(RUNDE.joker);
  });

  it("der Name der Runde bleibt erhalten", () => {
    const benannt = sanitizeRules({ ...RUNDE, name: "Freundeskreis" });
    const antraege = [antrag("a1", 3, { displayScale: 50 })];
    const r = regelwerkAmSpieltag({ rules: benannt, antraege, mitglieder: MITGLIEDER, spieltag: 20 });
    expect(r.rules.name).toBe("Freundeskreis");
  });

  it("das Ergebnis ist immer ein gültiges Regelwerk", () => {
    const antraege = [antrag("a1", 3, { displayScale: 99999 })];
    const r = regelwerkAmSpieltag({ rules: RUNDE, antraege, mitglieder: MITGLIEDER, spieltag: 20 });
    expect(sanitizeRules(r.rules)).toEqual(r.rules);
  });
});

describe("beschreibeBeschluesse", () => {
  it("sagt es, wenn nichts wirksam wurde", () => {
    expect(beschreibeBeschluesse({})).toContain("keine");
  });

  it("nennt Anzahl und Bereiche", () => {
    const t = beschreibeBeschluesse({ angewandt: [{ id: "a1", aspekt: "anzeige", abSpieltag: 6 }] });
    expect(t).toContain("1 Beschluss");
    expect(t).toContain("Anzeige");
  });

  it("verschweigt die verworfenen nicht", () => {
    const t = beschreibeBeschluesse({ verworfen: [{ id: "a1", aspekt: "anzeige", grund: "x" }] });
    expect(t).toContain("greift nicht");
  });

  it("nennt keinen Bezeichner und keinen Dateinamen", () => {
    const t = beschreibeBeschluesse({
      angewandt: [{ id: "a1", aspekt: "anzeige", abSpieltag: 6 }],
      verworfen: [{ id: "a2", aspekt: "saison", grund: "x" }],
    });
    expect(t).not.toMatch(/\.(js|jsx)\b/);
    expect(t).not.toMatch(/\b[a-zäöüß]+[A-ZÄÖÜ][a-zA-ZäöüßÄÖÜ]*\b/);
  });
});
