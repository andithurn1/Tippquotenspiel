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
//  Resultate. Die Oberfläche sagt das auch so („Simulierte Saison").
//
//  Ein ECHTER Kalender kann übergeben werden (`spielplan`) und ersetzt dann die
//  Circle-Methode — das ist der Launch-Blocker vom 28.08.2026. Was er NICHT
//  ersetzt: Quoten, Ergebnisse, Torschützen. Jedes Match trägt deshalb
//  `echterSpielplan`, und `spielplan.js` macht daraus den Satz, den die
//  Oberfläche zeigt. Ein Katalog, der halb echt ist, ist der gefährlichste
//  Zustand — die Champions League wird erst Ende August ausgelost, genau dieser
//  Zustand tritt also ein.
//
//  Was hier NICHT hingehört: Wertung. Diese Datei erzeugt nur Daten. Die Engine
//  kennt weiterhin keine Ligennamen und liest nur `wettbewerb`/`phase`/`derby`
//  (Architektur-Regel 3).
// ============================================================

import { generateMatchOdds, simulateResult } from "./oddsGenerator";
import { normalisiereSpielplan, pruefeSpielplan } from "./spielplan";
import { snapshotFromOdds } from "./oddsApi";

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
//  spielplan   — OPTIONAL: der ECHTE Kalender als [{ matchday, home, away, kickoff }].
//                Liegt er vor, wird er unverändert übernommen und weder
//                `saisonStart` noch `slotFuer` angefasst — echte Termine sind
//                genau das, was hier nicht nachgerechnet werden darf.
export function baueLiga({
  wettbewerb, idPrefix, ratings, derbys = [], saisonStart, utcOffset = 2, slotFuer,
  namensPool = null, spielplan = null, quoten = null, kaderZuordnung = null,
}) {
  const teams = Object.keys(ratings);

  // ── Ein Spiel fertig bauen. Für beide Wege identisch: an den Quoten,
  //    Ergebnissen und Torschützen ändert ein echter Kalender nichts, die
  //    bleiben erzeugt, solange keine Quoten-API angebunden ist.
  // Echte Marktquoten, nachschlagbar über die Begegnung. Sie decken immer nur
  // die NÄCHSTEN Spiele ab — kein Buchmacher bepreist eine ganze Saison im
  // Voraus. Der Rest bleibt erzeugt, und das ist kein Mangel, sondern der
  // Normalfall.
  const marktQuoten = new Map(
    (quoten ?? []).map((q) => [`${q.home}|${q.away}`, q]),
  );

  const baue = ({ matchday, home, away, kickoff, echterSpielplan }) => {
    const matchId = `${idPrefix}-md${matchday}-${ratings[home].code}-${ratings[away].code}`.toLowerCase();
    const hr = ratings[home], ar = ratings[away];
    const strengths = {
      homeAttack: hr.attack, homeDefense: hr.defense,
      awayAttack: ar.attack, awayDefense: ar.defense,
    };
    const markt = marktQuoten.get(`${home}|${away}`);
    // Echte Quoten schlagen erzeugte — an jeder Stelle, an der es sie gibt.
    // `snapshotFromOdds` übernimmt 1X2 unverändert, setzt das echte
    // Ergebnis-Raster ein, wo der Markt es hergibt, und leitet den Rest
    // konsistent daraus ab. Schlägt das fehl (unbrauchbare Quoten), fällt es
    // still auf den Generator zurück — eine Runde ohne Spiele wäre schlimmer.
    const snapshot = (markt && snapshotFromOdds({
      matchId, home, away, kickoff, odds: markt.odds,
      correctScore: markt.correctScore ?? null, namensPool,
      torschuetzen: markt.torschuetzen ?? null, kaderZuordnung,
    })) || generateMatchOdds({ matchId, home, away, kickoff, seed: matchId, ...strengths, namensPool });
    // Derby-Label auf den Snapshot: die Engine kennt keine Vereins-Paarungen
    // und bleibt so sportart-neutral — sie liest nur `snap.derby`.
    const derby = findeDerby(derbys, home, away);
    if (derby) snapshot.derby = derby.label;
    const result = simulateResult(snapshot, strengths, `${matchId}-result`);
    return {
      matchId, matchday, home, away, kickoff, snapshot, result,
      wettbewerb, phase: "liga", echterSpielplan,
      // Getrennt festgehalten, weil es getrennte Wahrheiten sind: der KALENDER
      // kann echt sein und die Quoten erzeugt, und umgekehrt.
      echteQuoten: snapshot.quelle === "api",
    };
  };

  if (spielplan) {
    const plan = normalisiereSpielplan(spielplan);
    const { ok, fehler } = pruefeSpielplan(plan, teams);
    // ⚠️ Bewusst ein harter Abbruch. Ein echter Spielplan kommt von außen, und
    // die typischen Importfehler (Klubname anders geschrieben, Verein doppelt
    // angesetzt) erzeugen sonst still eine halbe oder falsche Saison — sichtbar
    // erst, wenn jemand auf ein Spiel tippt, das es nicht gibt.
    if (!ok) {
      throw new Error(`Spielplan „${wettbewerb}" ist nicht verwendbar:\n- ${fehler.join("\n- ")}`);
    }
    return plan.map((s) => baue({ ...s, echterSpielplan: true }));
  }

  const matches = [];
  baueSpielplan(teams).forEach((round, ri) => {
    const matchday = ri + 1;
    round.forEach(([home, away], i) => {
      const kickoff = anstoss({ saisonStart, matchday, slot: slotFuer(i, round.length), utcOffset });
      matches.push(baue({ matchday, home, away, kickoff, echterSpielplan: false }));
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
