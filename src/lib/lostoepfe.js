// ============================================================
//  LOSTÖPFE — die Vorauswahl für europäische Wettbewerbe
//
//  🔴 Andi, 27.08.2026: „machen wir doch mal bei CL nur die von Lostopf 1 und
//  sonst noch deutsche Mannschaften von CL statt alle!, sowie alle
//  Finalsspiele mit Beteiligung von Mannschaften der Lostöpfe 1 +2) mach die
//  Lostopf Vorauswahl auch bei der CL und später auch Europaleague".
//
//  ── Warum das eine eigene Mechanik ist und keine Vereinsliste ──
//  Man KÖNNTE die neun Vereine aus Topf 1 von Hand in `spiele.teams`
//  schreiben. Drei Gründe, es nicht zu tun:
//
//  1. **Der Topf ist die Aussage, nicht die Namensliste.** „Topf 1" heißt
//     „die neun stärksten nach Koeffizient" — wer nächste Saison drin ist,
//     ändert sich, die Aussage nicht.
//  2. **Es kommt wieder.** Europa League, Conference League, später andere
//     Sportarten: überall dieselbe Frage. Eine Liste je Runde wäre neunmal
//     dieselbe Pflegearbeit.
//  3. 🔴 **Andis Zuschnitt ist ein ODER über Dimensionen**, und das kann
//     `passtSpiel` nicht: „Topf 1 ODER deutsch" in der Ligaphase, „Topf 1+2"
//     in der K.-o.-Runde. Alle Einschränkungen dort wirken UND-verknüpft
//     (`VERKNUEPFUNG_HINWEIS` in `spielauswahl.js`), und eine
//     ODER-Verknüpfung wäre eine zweite, konkurrierende Regel-Sprache.
//
//  ⚠️ **Der Ausweg, und er ist bewusst gewählt:** diese Datei rechnet die
//  Regel EINMAL aus und liefert eine feste Begegnungsliste (`matchIds`). Damit
//  bleibt `passtSpiel` unverändert — es gibt weiterhin genau eine Stelle, die
//  entscheidet, ob ein Spiel zur Runde gehört.
//
//  🔴 **Der Preis, und er gehört dazugesagt:** eine feste Liste zeigt auf
//  konkrete Spiele. Kommt ein neuer Spielplan, ist sie veraltet. Für eine
//  Runde ist das richtig so — der Zuschnitt wird beim Anlegen ohnehin
//  eingefroren (`rounds.spiele`, schema.sql), damit ein späterer Beschluss
//  nicht rückwirkend ändert, welche Spiele je dazugehört haben. Wer die Regel
//  auf eine neue Saison anwenden will, ruft sie neu auf.
//
//  ── ⚠️ Die Töpfe sind GEPFLEGTE DATEN, keine Rechnung ──
//  Die Einteilung folgt dem UEFA-Klubkoeffizienten und wird jede Saison neu
//  gelost. Sie steht hier als Liste, wie die Derby-Paarungen in
//  `ligaGenerator.js` — und muss wie die von Hand nachgezogen werden.
//  `lostoepfe.test.js` hält fest, dass jeder Name im Katalog vorkommt und dass
//  jeder Verein genau EINEM Topf gehört. Ein Tippfehler wäre sonst kein
//  Fehler, sondern ein Verein, der still fehlt.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { vereineVon } from "./ligen";

// ── Die Töpfe ───────────────────────────────────────────────
// Champions League, 36 Vereine, vier Töpfe zu je neun — die Einteilung der
// Ligaphase seit 2024/25.
export const LOSTOEPFE = {
  cl: {
    1: [
      "Real Madrid", "Manchester City", "FC Bayern München", "Paris Saint-Germain",
      "FC Liverpool", "Inter Mailand", "Borussia Dortmund", "RB Leipzig", "FC Barcelona",
    ],
    2: [
      "Bayer 04 Leverkusen", "Atlético Madrid", "Atalanta Bergamo", "Juventus Turin",
      "Benfica Lissabon", "FC Arsenal", "FC Brügge", "FC Chelsea", "AC Mailand",
    ],
    3: [
      "Sporting Lissabon", "PSV Eindhoven", "FC Porto", "Ajax Amsterdam", "SSC Neapel",
      "Feyenoord Rotterdam", "Villarreal CF", "Young Boys Bern", "Celtic Glasgow",
    ],
    4: [
      "Olympique Marseille", "Galatasaray", "Schachtar Donezk", "Roter Stern Belgrad",
      "Sparta Prag", "Slovan Bratislava", "AS Monaco", "Aston Villa", "Bologna FC",
    ],
  },
  // ⏳ Europa League: notiert, aber LEER — den Wettbewerb gibt es im Katalog
  // noch nicht (`WETTBEWERBE` in wettbewerbe.js kennt ihn nicht). Ein
  // erfundener Topf wäre schlimmer als keiner: er sähe aus wie gepflegte
  // Daten. Sobald `el` im Katalog steht, kommt die Einteilung hierher —
  // alles andere in dieser Datei funktioniert dann ohne Änderung.
  el: {},
};

// Welche Wettbewerbe haben überhaupt Töpfe? ⚠️ Nur die mit Inhalt: ein
// Wettbewerb mit leerem Katalog soll in der Oberfläche gar nicht erst als
// Möglichkeit auftauchen.
export function wettbewerbeMitToepfen() {
  return Object.entries(LOSTOEPFE)
    .filter(([, toepfe]) => Object.keys(toepfe).length > 0)
    .map(([key]) => key);
}

export function toepfeVon(wettbewerb) {
  return Object.keys(LOSTOEPFE[wettbewerb] ?? {}).map(Number).sort((a, b) => a - b);
}

// In welchem Topf steckt dieser Verein? `null`, wenn er nicht dabei ist —
// nicht 0, sonst sähe „nicht im Wettbewerb" aus wie „Topf 0".
export function topfVon(wettbewerb, verein) {
  const toepfe = LOSTOEPFE[wettbewerb] ?? {};
  for (const [nr, liste] of Object.entries(toepfe)) {
    if (liste.includes(verein)) return Number(nr);
  }
  return null;
}

export function vereineAusToepfen(wettbewerb, nummern = []) {
  const toepfe = LOSTOEPFE[wettbewerb] ?? {};
  const gewaehlt = new Set(nummern.map(Number));
  const out = [];
  for (const [nr, liste] of Object.entries(toepfe)) {
    if (gewaehlt.has(Number(nr))) out.push(...liste);
  }
  return out;
}

// ── Vereine EINES LANDES im Wettbewerb ──────────────────────
// 🔴 Abgeleitet, nicht gepflegt: „deutsche Mannschaften in der CL" sind die,
// die auch in der Bundesliga-Vereinsliste stehen. Eine zweite Länderliste
// liefe auseinander, sobald jemand einen Aufsteiger nachträgt — genau die
// doppelte Wahrheit, vor der die Runden-Schicht warnt.
//
// ⚠️ `ligen` ist deshalb eine Liste von LIGA-Schlüsseln („bl", „bl2"), kein
// Ländername: die Zuordnung Liga → Land steht schon in `WETTBEWERBE`, und
// hier zählt ohnehin, wer wirklich in der Liga spielt.
export function vereineAusLigen(wettbewerb, ligen = []) {
  const imWettbewerb = new Set(Object.values(LOSTOEPFE[wettbewerb] ?? {}).flat());
  const out = [];
  for (const liga of ligen) {
    for (const v of vereineVon(liga) ?? []) if (imWettbewerb.has(v)) out.push(v);
  }
  return [...new Set(out)];
}

// ── Die Regel ───────────────────────────────────────────────
// `{ toepfe, ausLigen, koPhasen, koToepfe }`
//   toepfe    — welche Töpfe in JEDER Phase zählen
//   ausLigen  — zusätzlich alle Vereine aus diesen Ligen (Andis „deutsche")
//   koPhasen  — welche Phasen als K.-o.-Runde gelten
//   koToepfe  — welche Töpfe dort ZUSÄTZLICH zählen
//
// ⚠️ Die vier Felder sind ODER-verknüpft, und das ist der ganze Zweck: genau
// das kann `passtSpiel` nicht.
export const DEFAULT_LOSTOPF_REGEL = {
  toepfe: [1],
  ausLigen: [],
  koPhasen: ["achtelfinale", "viertelfinale", "halbfinale", "finale"],
  koToepfe: [1, 2],
};

export function sanitizeLostopfRegel(roh = {}, wettbewerb = "cl") {
  const p = roh && typeof roh === "object" ? roh : {};
  const gueltig = new Set(toepfeVon(wettbewerb));
  const nummern = (v, vorgabe) => {
    const arr = Array.isArray(v) ? v.map(Number).filter((n) => gueltig.has(n)) : null;
    return arr && arr.length ? [...new Set(arr)].sort((a, b) => a - b) : vorgabe;
  };
  return {
    toepfe: nummern(p.toepfe, DEFAULT_LOSTOPF_REGEL.toepfe),
    ausLigen: Array.isArray(p.ausLigen) ? p.ausLigen.filter((x) => typeof x === "string") : [],
    koPhasen: Array.isArray(p.koPhasen) && p.koPhasen.length
      ? p.koPhasen.filter((x) => typeof x === "string")
      : DEFAULT_LOSTOPF_REGEL.koPhasen,
    koToepfe: nummern(p.koToepfe, DEFAULT_LOSTOPF_REGEL.koToepfe),
  };
}

// Trifft die Regel dieses Spiel? ⚠️ Es genügt, wenn EINE Seite passt — dieselbe
// Lesart wie `teamModus: "einer"` in der Spielauswahl.
export function passtLostopf(match, regel, wettbewerb = "cl") {
  if (!match) return false;
  const r = sanitizeLostopfRegel(regel, wettbewerb);
  const immer = new Set([
    ...vereineAusToepfen(wettbewerb, r.toepfe),
    ...vereineAusLigen(wettbewerb, r.ausLigen),
  ]);
  if (immer.has(match.home) || immer.has(match.away)) return true;

  if (!r.koPhasen.includes(match.phase)) return false;
  const ko = new Set(vereineAusToepfen(wettbewerb, r.koToepfe));
  return ko.has(match.home) || ko.has(match.away);
}

// ── Die Vorauswahl: aus der Regel wird eine Begegnungs-Liste ─
// ⚠️ Gibt IDs als Zeichenketten — `passtSpiel` vergleicht `matchIds` so.
export function lostopfSpiele(matches = [], regel, wettbewerb = "cl") {
  return (Array.isArray(matches) ? matches : [])
    .filter((m) => m?.wettbewerb === wettbewerb && passtLostopf(m, regel, wettbewerb))
    .map((m) => String(m.matchId ?? m.id ?? ""))
    .filter(Boolean);
}

// Ein Satz für die Oberfläche. ⚠️ Mit den AUSGERECHNETEN Zahlen: „Topf 1" sagt
// weniger als „Topf 1 — 9 Vereine".
export function beschreibeLostopf(regel, wettbewerb = "cl") {
  const r = sanitizeLostopfRegel(regel, wettbewerb);
  const n = vereineAusToepfen(wettbewerb, r.toepfe).length;
  const teile = [`Topf ${r.toepfe.join(" + ")} (${n} Vereine)`];
  const ausLigen = vereineAusLigen(wettbewerb, r.ausLigen);
  if (ausLigen.length) teile.push(`plus ${ausLigen.length} aus eurer Liga`);
  if (r.koToepfe.length) teile.push(`in der K.-o.-Runde auch Topf ${r.koToepfe.join(" + ")}`);
  return `${teile.join(", ")}.`;
}
