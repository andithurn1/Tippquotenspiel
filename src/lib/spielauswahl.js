// ============================================================
//  SPIELAUSWAHL — welche Spiele gehören überhaupt zur Runde?
//
//  Bisher trug der Creator-Code nur die REGELN. Wer „Kenner-Runde" teilte,
//  teilte die Wertung, nicht die Runden-Idee — dabei ist „nur die Top 6, zehn
//  Spieltage, harte Wertung" erst zusammen ein Vorschlag, den man übernehmen
//  will. `rules.spiele` schließt die Lücke: die Auswahl wandert automatisch in
//  `encodePreset` und damit in Lang- und Kurzcodes.
//
//  ── Der Code ist ein VORSCHLAG, kein Vertrag ──
//  Nach dem Laden bleibt alles änderbar. Deshalb liegt die Auswahl als
//  normales Regel-Feld vor und nicht als eigener, gesonderter Import.
//
//  ── Zwei Wahrheiten vermeiden ──
//  Es gibt bereits `rounds.team_filter` — den Stand, der beim Anlegen
//  tatsächlich gewählt wurde. Die Zuständigkeit ist deshalb klar getrennt:
//    rules.spiele      = Vorschlag aus dem Regelwerk/Code (reist mit)
//    rounds.team_filter = was beim Anlegen daraus wirklich wurde (gilt)
//  Die Runde gewinnt, das Regelwerk schlägt vor.
//
//  ── Sportart-neutral (Architektur-Regel 3) ──
//  Hier stehen keine Vereinsnamen und keine Ligagrößen, nur Felder: Vereine,
//  Spieltag-Bereich, konkrete Begegnungen. Was ein Verein ist, weiß die
//  Daten-Schicht.
//
//  Reine Funktionen, UI-frei.
// ============================================================

export const AUSWAHL_MODI = [
  {
    key: "alle", label: "Alle Spiele",
    desc: "Der ganze Spielplan — nichts wird ausgeblendet.",
  },
  {
    key: "teams", label: "Nur bestimmte Vereine",
    desc: "Es zählen nur Spiele, an denen einer der gewählten Vereine beteiligt ist.",
  },
  {
    key: "liste", label: "Ausgewählte Begegnungen",
    desc: "Eine feste Liste von Spielen — für kurze Runden oder ein Turnier.",
  },
];

export const AUSWAHL_LIMITS = {
  maxTeams: 40,
  maxSpiele: 200,
  spieltag: { min: 1, max: 99 },
};

export const DEFAULT_SPIELE = {
  modus: "alle",
  teams: [],
  matchIds: [],
  spieltagVon: null,
  spieltagBis: null,
  // Quer über Wettbewerbe (Etappe d): welche Wettbewerbe und welche Phasen
  // überhaupt dazugehören. Leer = alle. Das ist der „nur das Beste"-Fall:
  // „nur Champions League ab dem Achtelfinale".
  wettbewerbe: [],
  phasen: [],
};

// ⚠️ Alle Dimensionen wirken UND-verknüpft: Vereine, Zeitraum, Wettbewerbe,
// Phasen müssen gemeinsam zutreffen. Für eine gemischte Wunschliste („CL-K.-o.
// PLUS meine Bundesliga-Vereine") ist der Modus `liste` der richtige Weg —
// dort zählt genau, was drinsteht. Eine ODER-Verknüpfung über Dimensionen
// hinweg wäre eine zweite, konkurrierende Regel-Sprache; das ist es nicht wert.
export const VERKNUEPFUNG_HINWEIS =
  "Alle Einschränkungen gelten gleichzeitig. Für eine gemischte Auswahl aus "
  + "verschiedenen Wettbewerben nimm die feste Begegnungs-Liste.";

const text = (v, max = 60) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

function spieltagWert(v) {
  // null/undefined/"" heißt „nicht gesetzt" — NICHT 0. Number(null) ist 0 und
  // würde auf den Mindest-Spieltag 1 hochgeklemmt; aus „keine Grenze" wäre
  // dann „ab Spieltag 1" geworden, und ein Regelwerk sähe nach einer
  // Code-Runde anders aus als vorher.
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const { min, max } = AUSWAHL_LIMITS.spieltag;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function sanitizeSpiele(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const modus = AUSWAHL_MODI.some((m) => m.key === p.modus) ? p.modus : DEFAULT_SPIELE.modus;

  const teams = [...new Set((Array.isArray(p.teams) ? p.teams : [])
    .map((t) => text(t)).filter(Boolean))].slice(0, AUSWAHL_LIMITS.maxTeams);
  const matchIds = [...new Set((Array.isArray(p.matchIds) ? p.matchIds : [])
    .map((t) => text(t, 80)).filter(Boolean))].slice(0, AUSWAHL_LIMITS.maxSpiele);

  let von = spieltagWert(p.spieltagVon);
  let bis = spieltagWert(p.spieltagBis);
  // Vertauschte Grenzen sind ein Tippfehler, kein Grund, die Angabe zu
  // verwerfen — also drehen statt wegwerfen.
  if (von !== null && bis !== null && von > bis) [von, bis] = [bis, von];

  const liste = (arr, max) => [...new Set((Array.isArray(arr) ? arr : [])
    .map((t) => text(t, 20)).filter(Boolean))].slice(0, max);

  return {
    // Ein Modus ohne die dazugehörigen Daten wäre eine Auswahl, die alles
    // wegfiltert — das ist nie gewollt, also fällt er auf „alle" zurück.
    modus: (modus === "teams" && teams.length < 2) || (modus === "liste" && !matchIds.length)
      ? "alle" : modus,
    teams, matchIds, spieltagVon: von, spieltagBis: bis,
    wettbewerbe: liste(p.wettbewerbe, 10),
    phasen: liste(p.phasen, 10),
  };
}

// Gehört dieses Spiel zur Runde? Der Spieltag-Bereich gilt in JEDEM Modus —
// er ist eine zweite, unabhängige Einschränkung („nur die Rückrunde").
export function passtSpiel(match, spiele = DEFAULT_SPIELE) {
  const s = sanitizeSpiele(spiele);
  if (!match) return false;

  const md = Number(match.matchday ?? match.spieltag);
  if (s.spieltagVon !== null && Number.isFinite(md) && md < s.spieltagVon) return false;
  if (s.spieltagBis !== null && Number.isFinite(md) && md > s.spieltagBis) return false;

  // Wettbewerb und Phase gelten in JEDEM Modus zusätzlich — genau wie der
  // Zeitraum. Ein Spiel ohne die Felder gilt als zugehörig, sonst fielen
  // Altdaten still aus der Runde.
  if (s.wettbewerbe.length && match.wettbewerb && !s.wettbewerbe.includes(match.wettbewerb)) return false;
  if (s.phasen.length && match.phase && !s.phasen.includes(match.phase)) return false;

  if (s.modus === "teams") {
    return s.teams.includes(match.home) || s.teams.includes(match.away);
  }
  if (s.modus === "liste") {
    return s.matchIds.includes(String(match.matchId ?? match.id ?? ""));
  }
  return true;
}

export function filterSpiele(matches = [], spiele = DEFAULT_SPIELE) {
  return matches.filter((m) => passtSpiel(m, spiele));
}

// Was die Auswahl konkret bedeutet — Zahlen statt Behauptungen. Ohne diese
// Rückmeldung stellt man „nur die Top 6" ein und merkt erst in Woche drei,
// dass pro Spieltag nur ein Spiel übrig bleibt.
export function zusammenfassung(matches = [], spiele = DEFAULT_SPIELE) {
  const gewaehlt = filterSpiele(matches, spiele);
  const spieltage = new Set(
    gewaehlt.map((m) => m.matchday ?? m.spieltag).filter((x) => x !== undefined && x !== null));
  const proSpieltag = spieltage.size ? gewaehlt.length / spieltage.size : 0;
  return {
    spiele: gewaehlt.length,
    gesamt: matches.length,
    spieltage: spieltage.size,
    proSpieltag: +proSpieltag.toFixed(1),
    leer: gewaehlt.length === 0,
    duenn: gewaehlt.length > 0 && proSpieltag < 2,
  };
}

// Wie viele Spiele bleiben je Spieltag übrig, wenn man k von n Vereinen wählt?
// Ohne Spielplan lässt sich das nicht exakt sagen, aber sehr wohl eingrenzen:
// an einem Spieltag spielt jeder Verein genau einmal. Spielen die Gewählten
// untereinander, sind es nur k/2 Spiele; trifft jeder auf einen Nicht-Gewählten,
// sind es k. Diese Spanne ist ehrlicher als eine erfundene genaue Zahl — und
// sie genügt, um „nur die Top 2" als zu dünn zu erkennen.
export function spieleProSpieltag(gewaehlt, gesamtTeams) {
  const k = Math.max(0, Math.floor(gewaehlt || 0));
  const n = Math.max(2, Math.floor(gesamtTeams || 0));
  if (k <= 0) return { min: 0, max: 0 };
  return { min: Math.ceil(k / 2), max: Math.min(k, Math.floor(n / 2)) };
}

export function beschreibeAuswahl(spiele = DEFAULT_SPIELE) {
  const s = sanitizeSpiele(spiele);
  const teile = [];
  if (s.modus === "teams") teile.push(`nur Spiele von ${s.teams.length} Vereinen`);
  else if (s.modus === "liste") teile.push(`${s.matchIds.length} ausgewählte Begegnungen`);
  else teile.push("alle Spiele");

  if (s.wettbewerbe.length) teile.push(`nur ${s.wettbewerbe.length} Wettbewerb${s.wettbewerbe.length === 1 ? "" : "e"}`);
  if (s.phasen.length) teile.push(`nur ${s.phasen.length} Phase${s.phasen.length === 1 ? "" : "n"}`);
  if (s.spieltagVon !== null || s.spieltagBis !== null) {
    const von = s.spieltagVon ?? 1;
    const bis = s.spieltagBis ?? "Saisonende";
    teile.push(`Spieltag ${von} bis ${bis}`);
  }
  return teile.join(", ");
}
