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
  { key: "cl", label: "Champions League", kurz: "CL", land: "Europa" },
  // Das alte Demo-Match (Länderspiel JOR-ESP) ist keiner Liga zuzuordnen. Ohne
  // eigenen Eintrag würde es über den Fallback als Bundesliga-Spiel angezeigt.
  { key: "demo", label: "Demo-Spiel",    kurz: "DEMO", land: "—" },
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
