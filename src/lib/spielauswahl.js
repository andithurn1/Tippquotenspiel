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
  maxZonen: 4,
  platz: { min: 1, max: 99 },
  maxAbweichungen: 12,
};

// Welche Felder eine Liga für sich anders setzen darf. `wettbewerbe` steht
// bewusst NICHT dabei: welche Wettbewerbe überhaupt dazugehören, ist eine
// runden-weite Frage. Dürfte eine Liga sich selbst hinein- oder
// hinausdefinieren, gäbe es zwei Wahrheiten über dieselbe Frage.
export const ABWEICHUNGS_FELDER = [
  "modus", "teams", "matchIds", "spieltagVon", "spieltagBis", "phasen", "zonen",
];

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
  // ── Tabellenzone (Schritt 3, design/spielauswahl-je-liga.md) ──
  // „Abstiegskampf" = Plätze 14–18. Leer = keine Einschränkung. Ein Spiel
  // zählt, sobald EINE Seite in einer der Zonen steht — dieselbe Regel wie
  // bei den Vereinen.
  // 🔴 Der Platz kommt aus `snapshot.tabellenPlatz` und ist beim ÖFFNEN des
  // Spieltags eingefroren. Zwischen zwei Spielen desselben Spieltags ändert
  // er sich also nicht; sonst sähe, wer Sonntag tippt, eine andere Runde als
  // wer Freitag tippt.
  zonen: [],
  // ── Abweichungen JE WETTBEWERB (Schritt 3) ──
  // Alles darüber ist die runden-weite VORGABE. Hier stehen nur die
  // Abweichungen: `{ bl: { spieltagVon: 30, zonen: [{von:14,bis:18}] } }`.
  // Leer heißt bitgleich wie vorher — deshalb bricht kein alter Creator-Code.
  jeWettbewerb: {},
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

function platzWert(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const { min, max } = AUSWAHL_LIMITS.platz;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// Tabellenzonen: eine Liste von Platz-Bereichen. Eine halbe Angabe ist kein
// Grund, sie wegzuwerfen — „ab Platz 14" heißt bis zum Tabellenende, „bis
// Platz 4" heißt ab Platz 1. Vertauschte Grenzen werden gedreht, wie beim
// Spieltag-Bereich auch.
function zonenWert(arr) {
  if (!Array.isArray(arr)) return [];
  const raus = [];
  for (const z of arr) {
    if (!z || typeof z !== "object") continue;
    let von = platzWert(z.von);
    let bis = platzWert(z.bis);
    if (von === null && bis === null) continue;
    if (von === null) von = AUSWAHL_LIMITS.platz.min;
    if (bis === null) bis = AUSWAHL_LIMITS.platz.max;
    if (von > bis) [von, bis] = [bis, von];
    raus.push({ von, bis });
  }
  return raus.slice(0, AUSWAHL_LIMITS.maxZonen);
}

// Eine Abweichung trägt NUR die Felder, die wirklich gesetzt wurden. Das ist
// der Unterschied zwischen „für diese Liga gilt keine Vereins-Einschränkung"
// (Feld gesetzt, leer) und „für diese Liga steht nichts Eigenes drin" (Feld
// fehlt, die Vorgabe gilt weiter). Wer das zusammenwirft, kann eine
// runden-weite Einschränkung für eine Liga nie wieder aufheben.
function sanitizeAbweichung(p) {
  if (!p || typeof p !== "object") return null;
  // Über den vollen Sanitizer laufen lassen (eine Quelle für die Regeln),
  // dann auf die tatsächlich gesetzten Felder zurückschneiden.
  const voll = sanitizeSpiele({ ...p, jeWettbewerb: undefined });
  const raus = {};
  for (const feld of ABWEICHUNGS_FELDER) {
    if (Object.prototype.hasOwnProperty.call(p, feld)) raus[feld] = voll[feld];
  }
  return Object.keys(raus).length > 0 ? raus : null;
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

  // Abweichungen je Wettbewerb. Ein unbekannter oder leerer Schlüssel und eine
  // Abweichung ohne ein einziges gesetztes Feld fliegen raus — sonst wüchse
  // der Creator-Code um Einträge, die nichts bewirken.
  const jeWettbewerb = {};
  const roh = p.jeWettbewerb && typeof p.jeWettbewerb === "object" ? p.jeWettbewerb : {};
  for (const [k, v] of Object.entries(roh).slice(0, AUSWAHL_LIMITS.maxAbweichungen)) {
    const key = text(k, 20);
    const ab = key ? sanitizeAbweichung(v) : null;
    if (key && ab) jeWettbewerb[key] = ab;
  }

  return {
    // Ein Modus ohne die dazugehörigen Daten wäre eine Auswahl, die alles
    // wegfiltert — das ist nie gewollt, also fällt er auf „alle" zurück.
    modus: (modus === "teams" && teams.length < 2) || (modus === "liste" && !matchIds.length)
      ? "alle" : modus,
    teams, matchIds, spieltagVon: von, spieltagBis: bis,
    wettbewerbe: liste(p.wettbewerbe, 10),
    phasen: liste(p.phasen, 10),
    zonen: zonenWert(p.zonen),
    jeWettbewerb,
  };
}

// ── Die effektive Auswahl für EINEN Wettbewerb ───────────────
// Vorgabe + Abweichung, **Feld für Feld überschrieben, nicht tief gemischt**.
// Diese Regel steht hier und nirgends sonst: wer `bl.teams` setzt, ERSETZT die
// runden-weite Vereinsliste für die Bundesliga — er ergänzt sie nicht. Alles,
// was er nicht setzt, gilt weiter aus der Vorgabe.
//
// 🔴 Diese Funktion ist die EINE Stelle, an der gemischt wird. Kein Screen
// rechnet das nach — das ist genau die Sorte Fehler, aus der die Runden-Schicht
// in CLAUDE.md entstanden ist (17 Funde an einem Tag, kein einziger ein
// Rechenfehler).
export function auswahlFuer(spiele = DEFAULT_SPIELE, wettbewerb = null) {
  const s = sanitizeSpiele(spiele);
  const ab = wettbewerb ? s.jeWettbewerb[wettbewerb] : null;
  if (!ab) return s;
  return sanitizeSpiele({
    ...s, ...ab,
    // Runden-weit und NICHT überschreibbar (siehe ABWEICHUNGS_FELDER).
    wettbewerbe: s.wettbewerbe,
    // Die Karte selbst reist nicht mit in die effektive Auswahl — sonst
    // stünde die Abweichung zweimal da und lüde zum zweiten Mischen ein.
    jeWettbewerb: {},
  });
}

// Steht eine der beiden Mannschaften in einer der Zonen?
//
// 🔴 Fehlt der Tabellenstand, gilt die Zone als NICHT erfüllt — das Spiel
// fällt raus. Andersherum (fehlender Stand = erfüllt) zöge ein einziges
// fehlendes Feld stillschweigend den ganzen Spielplan in die Runde, und
// niemand sähe, warum.
function inZone(match, zonen) {
  if (!zonen.length) return true;
  const p = match.snapshot?.tabellenPlatz ?? match.tabellenPlatz;
  if (!p) return false;
  const trifft = (r) => Number.isFinite(r) && zonen.some((z) => r >= z.von && r <= z.bis);
  return trifft(Number(p.home)) || trifft(Number(p.away));
}

// Gehört dieses Spiel zur Runde? Der Spieltag-Bereich gilt in JEDEM Modus —
// er ist eine zweite, unabhängige Einschränkung („nur die Rückrunde").
//
// ⚠️ Gerechnet wird mit der Auswahl, die für den Wettbewerb DIESES Spiels
// gilt (`auswahlFuer`) — seit Schritt 3 kann jede Liga abweichen.
export function passtSpiel(match, spiele = DEFAULT_SPIELE) {
  if (!match) return false;
  const s = auswahlFuer(spiele, match.wettbewerb ?? null);

  const md = Number(match.matchday ?? match.spieltag);
  if (s.spieltagVon !== null && Number.isFinite(md) && md < s.spieltagVon) return false;
  if (s.spieltagBis !== null && Number.isFinite(md) && md > s.spieltagBis) return false;

  // Wettbewerb und Phase gelten in JEDEM Modus zusätzlich — genau wie der
  // Zeitraum. Ein Spiel ohne die Felder gilt als zugehörig, sonst fielen
  // Altdaten still aus der Runde.
  if (s.wettbewerbe.length && match.wettbewerb && !s.wettbewerbe.includes(match.wettbewerb)) return false;
  if (s.phasen.length && match.phase && !s.phasen.includes(match.phase)) return false;

  // Tabellenzone — wie Zeitraum und Phase eine zusätzliche Einschränkung, die
  // in JEDEM Modus gilt.
  if (!inZone(match, s.zonen)) return false;

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
  for (const z of s.zonen) teile.push(`Plätze ${z.von}–${z.bis}`);
  // Die Abweichungen NENNEN, nicht auflisten: eine Zusammenfassung, die je
  // Liga alles wiederholt, liest niemand — dass es sie gibt, muss aber
  // dastehen, sonst wundert man sich über die Spielzahl.
  const abw = Object.keys(s.jeWettbewerb);
  if (abw.length) teile.push(`Sonderregeln für ${abw.length} Wettbewerb${abw.length === 1 ? "" : "e"}`);
  return teile.join(", ");
}
