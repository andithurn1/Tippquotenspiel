import { describe, it, expect } from "vitest";
import { getChampionsLeagueMatches, CL_TEAM_RATINGS, createChampionsLeagueOddsSource } from "./championsLeagueData";
import { TEAM_RATINGS as BL_RATINGS } from "./bundesligaData";
import { scoreTip, DEFAULT_RULES } from "./engine";
import { istKo } from "./wettbewerbe";

const matches = getChampionsLeagueMatches();
const liga = matches.filter((m) => m.phase === "liga");
const ko = matches.filter((m) => istKo(m.phase));

describe("Champions League — Ligaphase", () => {
  it("36 Teams, 8 Spieltage à 18 Spiele = 144 Ligaphase-Spiele", () => {
    expect(Object.keys(CL_TEAM_RATINGS)).toHaveLength(36);
    expect(liga).toHaveLength(144);
    for (let md = 1; md <= 8; md++) {
      expect(liga.filter((m) => m.matchday === md)).toHaveLength(18);
    }
  });

  it("jeder Klub spielt genau 8-mal, gegen 8 VERSCHIEDENE Gegner (kein Rückspiel)", () => {
    for (const team of Object.keys(CL_TEAM_RATINGS)) {
      const eigene = liga.filter((m) => m.home === team || m.away === team);
      expect(eigene).toHaveLength(8);
      const gegner = eigene.map((m) => (m.home === team ? m.away : m.home));
      expect(new Set(gegner).size).toBe(8);
    }
  });

  it("alle Matches tragen wettbewerb 'cl' und eine gültige Phase", () => {
    const phasen = new Set(matches.map((m) => m.phase));
    expect(matches.every((m) => m.wettbewerb === "cl")).toBe(true);
    expect(phasen).toEqual(new Set(["liga", "achtelfinale", "viertelfinale", "halbfinale", "finale"]));
  });
});

describe("Champions League — K.-o.-Baum aus den Ligaphase-Ergebnissen", () => {
  it("Achtelfinale 8, Viertelfinale 4, Halbfinale 2, Finale 1 Spiel", () => {
    const zahl = (p) => matches.filter((m) => m.phase === p).length;
    expect(zahl("achtelfinale")).toBe(8);
    expect(zahl("viertelfinale")).toBe(4);
    expect(zahl("halbfinale")).toBe(2);
    expect(zahl("finale")).toBe(1);
  });

  it("nur Teams aus der Ligaphase erreichen die K.-o.-Runden, keines doppelt je Runde", () => {
    const ligaTeams = new Set(liga.flatMap((m) => [m.home, m.away]));
    for (const phase of ["achtelfinale", "viertelfinale", "halbfinale", "finale"]) {
      const teams = matches.filter((m) => m.phase === phase).flatMap((m) => [m.home, m.away]);
      expect(new Set(teams).size).toBe(teams.length);            // keiner doppelt
      for (const t of teams) expect(ligaTeams.has(t)).toBe(true); // keiner erfunden
    }
  });

  it("die Finalisten sind Sieger ihrer Halbfinals", () => {
    const hf = matches.filter((m) => m.phase === "halbfinale");
    const finale = matches.find((m) => m.phase === "finale");
    const finalisten = new Set([finale.home, finale.away]);
    for (const m of hf) {
      const beteiligt = [m.home, m.away].filter((t) => finalisten.has(t));
      expect(beteiligt).toHaveLength(1);   // genau einer der beiden zog weiter
    }
  });

  it("K.-o.-Spiele liegen zeitlich nach der Ligaphase", () => {
    const letztesLiga = liga.map((m) => m.kickoff).sort().pop();
    expect(ko.every((m) => m.kickoff > letztesLiga)).toBe(true);
  });
});

describe("Champions League — Konsistenz mit dem Rest der App", () => {
  it("deutsche Teilnehmer haben dieselben Stärken wie in der Bundesliga", () => {
    for (const t of ["FC Bayern München", "Borussia Dortmund", "Bayer 04 Leverkusen", "RB Leipzig"]) {
      expect(CL_TEAM_RATINGS[t]).toEqual(BL_RATINGS[t]);
    }
  });

  it("alle matchIds sind eindeutig", () => {
    expect(new Set(matches.map((m) => m.matchId)).size).toBe(matches.length);
  });

  it("jedes Match lässt sich von der Engine fehlerfrei werten", () => {
    for (const m of matches) {
      const r = scoreTip({ home: 1, away: 1, goals: { home: [], away: [] } }, m.result, m.snapshot, DEFAULT_RULES);
      expect(Number.isFinite(r.total)).toBe(true);
    }
  });

  it("Quoten-Quelle liefert Snapshot/Ergebnis für bekannte, null für unbekannte Ids", () => {
    const source = createChampionsLeagueOddsSource();
    expect(source.getSnapshot(matches[0].matchId).home).toBe(matches[0].home);
    expect(source.getResult("gibts-nicht")).toBeNull();
  });
});
