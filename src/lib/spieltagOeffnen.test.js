import { describe, it, expect } from "vitest";
import { spieltagOeffnen, istGeoeffnet } from "@/lib/spieltagOeffnen";
import { DEFAULT_RULES, sanitizeRules } from "@/lib/engine";

const TEAMS = Array.from({ length: 18 }, (_, i) => `T${String(i + 1).padStart(2, "0")}`);

// Bereits gespielte Saison: die kleinere Nummer gewinnt immer, damit der Rang
// eines Vereins direkt aus seinem Namen ablesbar ist.
function gespielteSaison() {
  const out = [];
  for (let i = 0; i < TEAMS.length; i++) {
    for (let j = i + 1; j < TEAMS.length; j++) {
      out.push({ home: TEAMS[i], away: TEAMS[j], result: { home: 2, away: 0 } });
    }
  }
  return out;
}
const GESPIELT = gespielteSaison();

const spiel = (home, away, { h = 2.5, a = 2.5 } = {}) => ({
  id: `${home}-${away}`, home, away, matchday: 30,
  snapshot: { matchId: `${home}-${away}`, home, away, winner: { home: h, draw: 3.4, away: a } },
});

const SPIELTAG = [
  spiel("T09", "T10"),
  spiel("T01", "T02", { h: 2.2, a: 3.1 }),
  spiel("T05", "T14"),
];

const RULES = sanitizeRules({ ...DEFAULT_RULES, bigGame: { enabled: true, aufschlag: 0.5, minSpannung: 0.35 } });
const oeffnen = (matches = SPIELTAG, rules = RULES) =>
  spieltagOeffnen({ spieltag: 30, matches, gespielt: GESPIELT, rules, gesamtSpieltage: 34 });

describe("Öffnen bestimmt das Big Game", () => {
  it("markiert genau ein Spiel", () => {
    const r = oeffnen();
    expect(r.bigGame.matchId).toBe("T01-T02");
    const markiert = Object.values(r.snapshots).filter((s) => Number.isFinite(s.bigGameWert));
    expect(markiert).toHaveLength(1);
    expect(markiert[0].bigGameGrund).toContain("Platz 1 gegen Platz 2");
  });

  it("ALLE Snapshots werden als geprüft eingefroren, nicht nur der Gewinner", () => {
    // Das ist die eigentliche Sperre: sonst wäre ein Spieltag ohne Big Game
    // von einem ungeöffneten nicht zu unterscheiden.
    const r = oeffnen();
    for (const s of Object.values(r.snapshots)) expect(s.bigGameGeprueft).toBe(true);
  });

  it("lässt den übrigen Snapshot unangetastet", () => {
    const r = oeffnen();
    expect(r.snapshots["T01-T02"].winner).toEqual(SPIELTAG[1].snapshot.winner);
  });
});

describe("Einmal eingefroren, bleibt eingefroren", () => {
  it("ein zweiter Aufruf ändert nichts", () => {
    const erste = oeffnen();
    const eingefroren = SPIELTAG.map((m) => ({ ...m, snapshot: erste.snapshots[m.id] }));
    const zweite = oeffnen(eingefroren);
    expect(zweite.schonOffen).toBe(true);
    expect(zweite.veraendert).toBe(false);
    expect(zweite.snapshots).toEqual({});
    expect(zweite.bigGame.matchId).toBe("T01-T02");
  });

  it("ein unspektakulaerer Spieltag wird trotzdem eingefroren", () => {
    // Beim Oeffnen gibt es IMMER ein Topspiel — nur ist sein Wert dann
    // niedrig, und ob er als Big Game zaehlt, entscheidet erst die Schwelle
    // der jeweiligen Runde. Das Pruef-Kennzeichen haelt den Spieltag
    // trotzdem fest, sonst wuerde er spaeter neu berechnet.
    const langweilig = [spiel("T08", "T11"), spiel("T09", "T12")];
    const erste = spieltagOeffnen({
      spieltag: 2, matches: langweilig, gespielt: GESPIELT, rules: RULES, gesamtSpieltage: 34,
    });
    expect(Object.values(erste.snapshots).every((s) => s.bigGameGeprueft)).toBe(true);
    // Niedriger Wert: eine Runde mit Standard-Schwelle zaehlt ihn nicht.
    expect(erste.bigGame.wert).toBeLessThan(0.35);

    const eingefroren = langweilig.map((m) => ({ ...m, snapshot: erste.snapshots[m.id] }));
    const zweite = spieltagOeffnen({
      spieltag: 2, matches: eingefroren, gespielt: GESPIELT, rules: RULES, gesamtSpieltage: 34,
    });
    expect(zweite.schonOffen).toBe(true);
    expect(zweite.veraendert).toBe(false);
  });

  it("ein späterer Tabellenstand kippt einen offenen Spieltag nicht mehr", () => {
    const erste = oeffnen();
    const eingefroren = SPIELTAG.map((m) => ({ ...m, snapshot: erste.snapshots[m.id] }));
    // Tabelle auf den Kopf stellen: jetzt wäre T09/T10 das Spitzenspiel.
    const umgedreht = GESPIELT.map((m) => ({ ...m, result: { home: 0, away: 2 } }));
    const zweite = spieltagOeffnen({
      spieltag: 30, matches: eingefroren, gespielt: umgedreht, rules: RULES, gesamtSpieltage: 34,
    });
    expect(zweite.bigGame.matchId).toBe("T01-T02");
  });
});

describe("Neutral, wenn nichts zu tun ist", () => {
  it("die Regel der oeffnenden Runde aendert den eingefrorenen Wert NICHT", () => {
    // Der Kern der Korrektur: `matches` ist global. Oeffnen mit oder ohne
    // aktivem Big Game muss denselben Snapshot ergeben, sonst entschiede die
    // erste Runde fuer alle.
    const mitRegel = oeffnen(SPIELTAG, RULES);
    const ohneRegel = oeffnen(SPIELTAG, DEFAULT_RULES);
    expect(ohneRegel.snapshots).toEqual(mitRegel.snapshots);
    expect(ohneRegel.bigGame.matchId).toBe(mitRegel.bigGame.matchId);
  });

  it("ein leerer Spieltag ergibt nichts", () => {
    const r = oeffnen([]);
    expect(r.snapshots).toEqual({});
    expect(r.veraendert).toBe(false);
  });

  it("istGeoeffnet erkennt beide Zustände", () => {
    expect(istGeoeffnet(SPIELTAG)).toBe(false);
    expect(istGeoeffnet([{ snapshot: { bigGameGeprueft: true } }])).toBe(true);
  });
});

describe("Tabellenplatz einfrieren — Grundlage für die Zonen-Auswahl", () => {
  it("legt beide Plätze im Snapshot ab (Stand VOR dem Spieltag)", () => {
    // Im Aufbau oben gewinnt immer die kleinere Nummer, T01 steht also auf 1.
    const { snapshots } = spieltagOeffnen({
      spieltag: 30, matches: SPIELTAG, gespielt: GESPIELT, rules: sanitizeRules(DEFAULT_RULES),
    });
    const eins = Object.values(snapshots)[0];
    expect(eins.tabellenPlatz).toBeDefined();
    expect(Number.isFinite(eins.tabellenPlatz.home)).toBe(true);
    expect(Number.isFinite(eins.tabellenPlatz.away)).toBe(true);
    // Jeder Snapshot des Spieltags trägt ihn, nicht nur das Big Game.
    for (const s of Object.values(snapshots)) expect(s.tabellenPlatz).toBeDefined();
  });

  it("schreibt gar nichts, wenn ein Verein noch keine Tabelle hat", () => {
    // Ein halber Stand wäre schlimmer als keiner: „nicht in der Zone" ließe
    // sich dann nicht mehr von „Platz unbekannt" unterscheiden.
    const { snapshots } = spieltagOeffnen({
      spieltag: 1, matches: [
        { id: "x", home: "Neu-A", away: "Neu-B", matchday: 1,
          snapshot: { matchId: "x", home: "Neu-A", away: "Neu-B", winner: { home: 2, draw: 3, away: 4 } } },
      ], gespielt: [], rules: sanitizeRules(DEFAULT_RULES),
    });
    expect(snapshots.x.tabellenPlatz).toBeUndefined();
    expect(snapshots.x.bigGameGeprueft).toBe(true);
  });

  it("ist eingefroren: ein zweiter Aufruf ändert nichts mehr", () => {
    const erst = spieltagOeffnen({
      spieltag: 30, matches: SPIELTAG, gespielt: GESPIELT, rules: sanitizeRules(DEFAULT_RULES),
    });
    const mitStand = SPIELTAG.map((m) => ({ ...m, snapshot: erst.snapshots[m.id] }));
    const zweit = spieltagOeffnen({
      spieltag: 30, matches: mitStand, gespielt: [], rules: sanitizeRules(DEFAULT_RULES),
    });
    expect(zweit.schonOffen).toBe(true);
    expect(zweit.snapshots).toEqual({});
  });
});
