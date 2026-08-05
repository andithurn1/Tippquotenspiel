// ============================================================
//  WETTBEWERBE — Katalog + Phasen (Etappe a des Mehr-Wettbewerbs-Umbaus)
//
//  Reine DATEN, keine Engine-Logik. Die Engine kennt weiterhin keine
//  Ligennamen (Architektur-Regel 3): sie liest höchstens generische Felder,
//  die die Daten-Schicht setzt — genau wie bei `snap.derby`.
//
//  Jedes Match trägt ab jetzt:
//    wettbewerb: "bl" | "pl" | "cl"        — welcher Wettbewerb
//    phase:      "liga" | "achtelfinale" | "viertelfinale" | "halbfinale" | "finale"
//
//  Ohne `phase` ließe sich „Halbfinale zählt mehr" später nicht ausdrücken.
//  Gewichte/Regeln je Wettbewerb kommen bewusst ERST in Etappe (b) — hier
//  steht nur das Datenmodell, damit der Schritt klein und früh gepusht ist.
// ============================================================

export const WETTBEWERBE = [
  { key: "bl", label: "Bundesliga",      kurz: "BL", land: "Deutschland" },
  { key: "pl", label: "Premier League",  kurz: "PL", land: "England" },
  { key: "pd", label: "La Liga",         kurz: "PD", land: "Spanien" },
  { key: "sa", label: "Serie A",         kurz: "SA", land: "Italien" },
  { key: "cl", label: "Champions League", kurz: "CL", land: "Europa" },
  // Läuft, während Europa Sommerpause hat — und ist dadurch die einzige Liga,
  // an der sich echte Quoten inklusive Torschützen schon vor dem Launch prüfen
  // lassen. Spielplan UND Quoten sind hier echt, nichts ist simuliert.
  { key: "mls", label: "MLS", kurz: "MLS", land: "USA/Kanada" },
  // Das alte Demo-Match (Länderspiel JOR-ESP) ist keiner Liga zuzuordnen. Ohne
  // eigenen Eintrag würde es über den Fallback als Bundesliga-Spiel angezeigt.
  // `echt: false` heißt: es gehört zu keiner Saison — siehe istEchterWettbewerb.
  { key: "demo", label: "Demo-Spiel",    kurz: "DEMO", land: "—", echt: false },
];

export const WETTBEWERB = Object.fromEntries(WETTBEWERBE.map((w) => [w.key, w]));

// Phasen in aufsteigender Bedeutung. `rang` erlaubt später „ab Viertelfinale
// zählt mehr", ohne dass irgendwo Strings verglichen werden müssen.
export const PHASEN = [
  { key: "liga",           label: "Ligaphase",      kurz: "Liga", rang: 0, ko: false },
  { key: "achtelfinale",   label: "Achtelfinale",   kurz: "AF",   rang: 1, ko: true },
  { key: "viertelfinale",  label: "Viertelfinale",  kurz: "VF",   rang: 2, ko: true },
  { key: "halbfinale",     label: "Halbfinale",     kurz: "HF",   rang: 3, ko: true },
  { key: "finale",         label: "Finale",         kurz: "FIN",  rang: 4, ko: true },
];

export const PHASE = Object.fromEntries(PHASEN.map((p) => [p.key, p]));

export const DEFAULT_WETTBEWERB = "bl";
export const DEFAULT_PHASE = "liga";

// Anzeige-Namen; unbekannte Keys fallen auf den Key selbst zurück, damit die
// Oberfläche bei neuen Daten nie leer bleibt.
export function wettbewerbLabel(key) {
  return WETTBEWERB[key]?.label ?? key ?? "—";
}
export function phasenLabel(key) {
  return PHASE[key]?.label ?? key ?? "—";
}

// Ist diese Phase eine K.-o.-Runde? (Ligaphase = nein)
export function istKo(phase) {
  return PHASE[phase]?.ko === true;
}

// Gehört dieser Wettbewerb zu einer SAISON — oder ist es nur das Demo-Spiel?
// Wichtig überall, wo ein Datum einen Saisonstart bestimmt: das Demo-Länderspiel
// liegt in der Vergangenheit und steckt in jedem Match-Katalog (auch im Seed der
// Live-DB). Als „Anpfiff" gezählt, eröffnet es eine Saison, die noch gar nicht
// begonnen hat. Unbekannte Keys gelten als echt — wie beim Bundesliga-Fallback
// in `wettbewerbVon`: neue Daten sollen nicht stillschweigend wegfallen.
export function istEchterWettbewerb(key) {
  return WETTBEWERB[key]?.echt !== false;
}

// Ein Match ohne die neuen Felder gilt als Ligaspiel des Standard-Wettbewerbs —
// so bleiben Altdaten (z. B. das JOR-ESP-Demo-Match) gültig, statt zu fehlen.
export function wettbewerbVon(match) {
  return match?.wettbewerb ?? DEFAULT_WETTBEWERB;
}
export function phaseVon(match) {
  return match?.phase ?? DEFAULT_PHASE;
}

// Welche Wettbewerbe kommen in einer Match-Liste tatsächlich vor? In der
// Reihenfolge des Katalogs, damit die Oberfläche stabil sortiert.
export function wettbewerbeIn(matches = []) {
  const vorhanden = new Set(matches.map(wettbewerbVon));
  return WETTBEWERBE.filter((w) => vorhanden.has(w.key));
}

// Spiele je Wettbewerb zählen — Grundlage für die spätere Anteils-Anzeige
// („Bundesliga 68 % · CL 32 %"), die laut Entwurf verhindert, dass ein Admin
// ein Gewicht einstellt und einen ganz anderen Gesamtanteil bekommt.
export function verteilung(matches = []) {
  const zaehler = new Map();
  for (const m of matches) {
    const k = wettbewerbVon(m);
    zaehler.set(k, (zaehler.get(k) ?? 0) + 1);
  }
  const gesamt = matches.length;
  return WETTBEWERBE
    .filter((w) => zaehler.has(w.key))
    .map((w) => ({
      key: w.key,
      label: w.label,
      spiele: zaehler.get(w.key),
      anteil: gesamt ? zaehler.get(w.key) / gesamt : 0,
    }));
}


// Aktueller Spieltag JE WETTBEWERB: der höchste, dessen Anpfiff vorbei ist.
// Rückgabe { [wettbewerb]: spieltag, default: höchster überhaupt } — mehrere
// Wettbewerbe laufen nicht synchron, deshalb ist eine einzelne Zahl hier
// wertlos (der 20. Bundesliga-Spieltag fällt mit dem 3. CL-Spieltag zusammen).
export function aktuellerSpieltag(matches = [], jetzt = Date.now()) {
  const out = {};
  let hoechster = 0;
  for (const m of matches) {
    const md = Number(m?.matchday);
    if (!Number.isFinite(md)) continue;
    if (new Date(m.kickoff).getTime() > jetzt) continue;
    const k = wettbewerbVon(m);
    if (md > (out[k] ?? 0)) out[k] = md;
    if (md > hoechster) hoechster = md;
  }
  out.default = hoechster;
  return out;
}

// ── Die Lage der SAISON aus Sicht einer RUNDE ───────────────
//
// Zwei Werte, die zusammengehören und beide dieselbe Voraussetzung haben:
// gerechnet wird über die Spiele DIESER RUNDE, nicht über den Katalog.
//
// 🔴 Gemessen am 05.08.2026: der Katalog trägt sechs Wettbewerbe, die Wochen
// auseinander starten (MLS 31.07., Bundesliga 28.08.). `SaisonTipps.jsx` fragte
// den ungefilterten Katalog — in einer reinen Bundesliga-Runde galt die Saison
// damit als GESTARTET, und alle fensterlosen Wetten waren drei Wochen vor dem
// ersten Spieltag eingefroren. Dieselbe Falle wie beim Demo-Länderspiel unten,
// nur eine Ebene höher: dort ein fremdes Spiel, hier ein fremder Wettbewerb.
//
// `matches` muss deshalb bereits auf die Runde gefiltert sein
// (`filterMatchesByTeams` mit `rounds.team_filter`).
export function saisonLage(matches = [], jetzt = Date.now()) {
  const echte = (Array.isArray(matches) ? matches : [])
    .filter((m) => istEchterWettbewerb(wettbewerbVon(m)));
  return {
    // Saisonstart = erster Anpfiff in einem ECHTEN Wettbewerb der Runde.
    // Wetten OHNE Freischalt-Fenster sind danach zu — sie gehören davor.
    gestartet: echte.some((m) => new Date(m.kickoff) <= jetzt),
    // Wetten MIT Fenster richten sich nach dem Spieltag IHRES Wettbewerbs.
    stand: aktuellerSpieltag(matches),
  };
}
