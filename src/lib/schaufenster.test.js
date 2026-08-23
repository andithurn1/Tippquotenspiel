import { describe, it, expect } from "vitest";
import { createMockStore } from "@/lib/store.mock";
import {
  SCHAU_ROUND_ID, SCHAU_JOIN_CODE, schaufensterRegeln, schaufensterTipps, SCHAU_SPIELER,
} from "@/lib/schaufenster";
import { aktiveArten, familieAn, konflikte } from "@/lib/fremdjoker";
import { sanitizeRules, DEFAULT_RULES } from "@/lib/engine";
import { FREMDJOKER_ARTEN } from "@/lib/eingriffe";

// 🔴 Andi am 23.08.2026: „mach die demo runde bzw tests so dass sie alle
// Einstellbarkeiten abdeckt … um sie zu prüfen."
//
// Diese Datei hält fest, dass das Schaufenster TUT, was sein Name sagt. Ohne
// sie ist es eine Runde, die irgendwann still verwaist: jemand ergänzt eine
// Mechanik, schaltet sie hier nicht an, und beim nächsten Nachsehen fehlt sie
// im Browser, ohne dass etwas fehlschlägt.

describe("Schaufenster — die Runde, in der alles an ist", () => {
  it("läuft durch `sanitizeRules`, ohne dass ein Wert verworfen wird", () => {
    const r = schaufensterRegeln();
    expect(sanitizeRules(r)).toEqual(r);
  });

  it("alle vier Fremdjoker laufen", () => {
    const r = schaufensterRegeln();
    expect(familieAn(r)).toBe(true);
    expect(aktiveArten(r).sort()).toEqual(FREMDJOKER_ARTEN.map((a) => a.key).sort());
  });

  // 🔴 Ein Schaufenster, das eine kaputte Runde zeigt, ist schlimmer als
  // keines: wer nachsieht, hielte die Meldung für den Normalzustand.
  it("meldet KEINEN Konflikt — es zeigt eine Runde, die aufgeht", () => {
    expect(konflikte(schaufensterRegeln())).toEqual([]);
  });

  it("nutzt alle drei Ebenen der Sperrfrist und beide Sichtbarkeiten", () => {
    const eg = schaufensterRegeln().eingriffe;
    // Ebene 3: der wachsende Cooldown aus Andis Beispiel.
    expect(eg.sperrfrist.standard.aufschlag).toBeGreaterThan(0);
    // Ebene 2: mindestens eine Art weicht ab.
    expect(Object.keys(eg.sperrfrist).some((k) => k !== "standard")).toBe(true);
    // JK6 je Art: eine offen, eine verborgen.
    expect(eg.sichtbar.standard).toBe(true);
    expect(Object.values(eg.sichtbar).some((v) => v === false)).toBe(true);
    // JK14 an.
    expect(eg.schutz.proSpieltag).toBeGreaterThan(0);
  });

  // ⚠️ Diese Werte sind DEMO-Werte, keine Empfehlung — sie dürfen nicht in
  // die Charaktere oder Presets wandern. Der Test hält die Abgrenzung fest.
  it("ist ausdrücklich etwas anderes als die Vorgabe", () => {
    expect(schaufensterRegeln()).not.toEqual(sanitizeRules(DEFAULT_RULES));
  });
});

describe("Schaufenster — die Runde im Store", () => {
  it("gibt es, mit Code und allen fünf Mitgliedern", async () => {
    const st = createMockStore();
    const r = await st.getRound(SCHAU_ROUND_ID);
    expect(r?.join_code).toBe(SCHAU_JOIN_CODE);
    const mitglieder = await st.listMembers(SCHAU_ROUND_ID);
    expect(mitglieder.map((m) => m.user_id).sort()).toEqual([...SCHAU_SPIELER].sort());
  });

  // 🔴 Der Fund, der die Tipps nötig gemacht hat: eine Runde ohne Tipps hat
  // eine LEERE Tabelle — und `zulaessigeZiele` filtert die Tabelle. Also gab
  // es kein Ziel, also fehlte der ganze Fremdjoker-Block in der Tippabgabe.
  // Gemessen am 23.08.2026 im Browser: Schild da, Fremdjoker weg.
  it("hat eine gefüllte Tabelle — sonst gäbe es kein Ziel", async () => {
    const st = createMockStore();
    const board = await st.getLeaderboard(SCHAU_ROUND_ID);
    expect(board.length).toBe(SCHAU_SPIELER.length);
  });

  it("nur Bundesliga — sonst gäbe es „Spieltag 1“ sechsmal", async () => {
    const st = createMockStore();
    const spiele = await st.listRoundMatches(SCHAU_ROUND_ID);
    expect(spiele.length).toBe(306);
  });

  // 🔴 Der eigentliche Zweck: jede der vier Arten hinterlässt eine SPUR, die
  // man in der Abrechnung sehen kann. Eine Mechanik, die im Schaufenster
  // nichts bewegt, ist im Schaufenster nicht vorhanden.
  it("jede der vier Arten erzeugt einen sichtbaren Vorgang", async () => {
    const st = createMockStore();
    const vorgaenge = await st.getDuellVorgaenge(SCHAU_ROUND_ID);
    expect([...new Set(vorgaenge.map((v) => v.typ))].sort())
      .toEqual(FREMDJOKER_ARTEN.map((a) => a.key).sort());
    for (const v of vorgaenge) {
      expect(v.vonName).toBeTruthy();
      expect(v.aufName).toBeTruthy();
      // Etwas ist passiert — ein Vorgang, der nichts bewegt, zeigt nichts.
      expect(Math.abs(v.gewinn) + Math.abs(v.verlust)).toBeGreaterThan(0);
    }
  });

  it("zwei Fremdjoker an EINEM Spieltag, auf verschiedenen Spielen", async () => {
    const st = createMockStore();
    const eingriffe = await st.getFremdEingriffe(SCHAU_ROUND_ID);
    const meine = eingriffe.filter((e) => e.vonUserId === "u-du");
    expect(meine.length).toBe(2);
    expect(new Set(meine.map((e) => e.matchId)).size).toBe(2);
  });

  it("ein Spiel ist geschützt — JK14 ist im Schaufenster sichtbar", async () => {
    const st = createMockStore();
    const spiele = await st.listRoundMatches(SCHAU_ROUND_ID);
    const tipps = schaufensterTipps(spiele);
    expect(tipps.some((t) => t.tip?.schutz === true)).toBe(true);
  });
});
