// ============================================================
//  LIGA-GENERATOR — eine simulierte Saison für BELIEBIGE Ligen
//
//  Vorher stand dieser Code nur in `bundesligaData.js`. Mit Premier League,
//  La Liga und Serie A wären daraus vier fast identische Kopien geworden — und
//  Kopien laufen auseinander (dieselbe Falle wie zuletzt bei `withSaisonPunkte`,
//  wo zwei Fassungen derselben Funktion schon unterschiedlich filterten).
//
//  ⚠️ WAS HIER SIMULIERT IST — und was nicht:
//  Echt sind die KLUBS und die üblichen Anstoßzeiten ihrer Liga. Der SPIELPLAN
//  ist erzeugt (Circle-Methode), die QUOTEN, ERGEBNISSE und TORSCHÜTZEN kommen
//  aus dem Poisson-Modell in `oddsGenerator.js`, die Team-Stärken sind grobe
//  Einschätzungen. Es sind KEINE offiziellen Spielpläne und keine echten
//  Resultate — die Kalender für 2026/27 stehen dafür nicht zur Verfügung.
//  Die Oberfläche sagt das auch so („Simulierte Saison").
//
//  Was hier NICHT hingehört: Wertung. Diese Datei erzeugt nur Daten. Die Engine
//  kennt weiterhin keine Ligennamen und liest nur `wettbewerb`/`phase`/`derby`
//  (Architektur-Regel 3).
// ============================================================

import { generateMatchOdds, simulateResult } from "./oddsGenerator";

const WOCHE = 7 * 24 * 3600 * 1000;

// Landestypische Namen für die (erfundenen) Kader. Ein „Iker Brandt" bei
// Burnley reißt einen sofort aus der Illusion — und die Torschützen-Wette lebt
// davon, dass die Namen zum Klub passen. ECHTE Spieler stehen hier bewusst
// nicht: Kader ändern sich mit jedem Transferfenster, und erfundene Daten
// dürfen nicht wie echte aussehen.
export const NAMENSPOOLS = {
  en: {
    key: "en",
    vornamen: ["Jack", "Harry", "Callum", "Owen", "Ethan", "Reece", "Kyle", "Mason", "Dylan", "Tyler", "Liam", "Josh"],
    nachnamen: ["Whitfield", "Barnes", "Hollis", "Radcliffe", "Ashworth", "Merton", "Callaghan", "Doyle", "Pearce", "Ainsworth", "Kelso", "Bramley"],
  },
  es: {
    key: "es",
    vornamen: ["Iker", "Álvaro", "Rubén", "Nacho", "Pau", "Sergio", "Iván", "Adrián", "Hugo", "Marcos", "Diego", "Unai"],
    nachnamen: ["Morales", "Cabrera", "Ferrán", "Quintana", "Vidal", "Olmedo", "Serrano", "Bermejo", "Cortés", "Lozano", "Aguirre", "Peralta"],
  },
  it: {
    key: "it",
    vornamen: ["Matteo", "Lorenzo", "Andrea", "Simone", "Nicolò", "Davide", "Federico", "Tommaso", "Riccardo", "Gianluca", "Alessio", "Pietro"],
    nachnamen: ["Bellini", "Ferraro", "Marchetti", "Caputo", "Rinaldi", "Villa", "Santoro", "Grasso", "Fabbri", "Moretti", "Palumbo", "Zanetti"],
  },
};

// Ist diese Begegnung ein Derby? Richtungsunabhängig — wer zu Hause spielt,
// ändert am Charakter des Spiels nichts.
export function findeDerby(derbys = [], home, away) {
  return derbys.find((d) => (d.a === home && d.b === away) || (d.a === away && d.b === home)) ?? null;
}

// Vollständiger Spielplan per Circle-Methode: ein Team bleibt fest, die übrigen
// rotieren im Kreis. Ergibt eine gültige Hinrunde (n-1 Spieltage); die
// Rückrunde ist dieselbe mit getauschtem Heimrecht. Funktioniert für jede
// gerade Teamzahl — 18 wie 20.
export function baueSpielplan(teams = []) {
  const n = teams.length;
  let arr = teams.slice();
  const hinrunde = [];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      let home = arr[i], away = arr[n - 1 - i];
      if ((r + i) % 2 === 1) [home, away] = [away, home];   // Heim/Auswärts ausbalancieren
      round.push([home, away]);
    }
    hinrunde.push(round);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];      // Circle-Rotation
  }
  return [...hinrunde, ...hinrunde.map((round) => round.map(([h, a]) => [a, h]))];
}

// Anstoßzeitpunkt aus einem Slot-Plan. `slots` beschreibt die üblichen
// Anstoßzeiten EINER Liga in ihrer ORTSZEIT; `utcOffset` rechnet sie um
// (Mitteleuropa im Sommer = 2, England = 1). Ohne diese Trennung säßen alle
// Ligen auf denselben Uhrzeiten — und genau das soll man ja testen können:
// dass sich die Wettbewerbe zeitlich ineinanderschieben.
export function anstoss({ saisonStart, matchday, slot, utcOffset }) {
  const ms = saisonStart
    + (matchday - 1) * WOCHE
    + slot.tag * 24 * 3600 * 1000
    + (slot.hh - utcOffset) * 3600 * 1000
    + (slot.mm ?? 0) * 60 * 1000;
  return new Date(ms).toISOString();
}

// Eine ganze Liga-Saison bauen.
//
//  wettbewerb  — Key aus `wettbewerbe.js` ("bl", "pl", "pd", "sa")
//  idPrefix    — Präfix der matchId, muss je Liga eindeutig sein
//  ratings     — { "Klubname": { code, attack, defense } }; die REIHENFOLGE
//                bestimmt den Spielplan, deshalb ist alles deterministisch
//  derbys      — [{ a, b, label }]
//  saisonStart — Date.UTC(...) des ersten Spieltags (Tag, an dem Slot.tag = 0 zählt)
//  utcOffset   — Stunden, um die die Ortszeit der Liga vor UTC liegt
//  slotFuer    — (i, proSpieltag) => { tag, hh, mm } — welche Partie wann angepfiffen wird
export function baueLiga({
  wettbewerb, idPrefix, ratings, derbys = [], saisonStart, utcOffset = 2, slotFuer,
  namensPool = null,
}) {
  const teams = Object.keys(ratings);
  const matches = [];
  baueSpielplan(teams).forEach((round, ri) => {
    const matchday = ri + 1;
    round.forEach(([home, away], i) => {
      const kickoff = anstoss({ saisonStart, matchday, slot: slotFuer(i, round.length), utcOffset });
      const matchId = `${idPrefix}-md${matchday}-${ratings[home].code}-${ratings[away].code}`.toLowerCase();
      const hr = ratings[home], ar = ratings[away];
      const strengths = {
        homeAttack: hr.attack, homeDefense: hr.defense,
        awayAttack: ar.attack, awayDefense: ar.defense,
      };
      const snapshot = generateMatchOdds({ matchId, home, away, kickoff, seed: matchId, ...strengths, namensPool });
      // Derby-Label auf den Snapshot: die Engine kennt keine Vereins-Paarungen
      // und bleibt so sportart-neutral — sie liest nur `snap.derby`.
      const derby = findeDerby(derbys, home, away);
      if (derby) snapshot.derby = derby.label;
      const result = simulateResult(snapshot, strengths, `${matchId}-result`);
      matches.push({ matchId, matchday, home, away, kickoff, snapshot, result, wettbewerb, phase: "liga" });
    });
  });
  return matches;
}

// Gleiche Schnittstelle wie `createMockOddsSource()` — austauschbare
// Quoten-Quelle, nur mit einer ganzen simulierten Saison statt einem Match.
export function alsQuotenQuelle(matches) {
  const byId = new Map(matches.map((m) => [m.matchId, m]));
  return {
    getSnapshot: (id) => byId.get(id)?.snapshot ?? null,
    getResult: (id) => byId.get(id)?.result ?? null,
  };
}
