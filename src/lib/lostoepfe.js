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
// `{ toepfe, ausLigen, ohne, koPhasen, koToepfe }`
//   toepfe    — welche Töpfe in JEDER Phase zählen
//   ausLigen  — zusätzlich alle Vereine aus diesen Ligen (Andis „deutsche")
//   ohne      — einzelne Vereine, die trotz ihres Topfes NICHT zählen
//   koPhasen  — welche Phasen als K.-o.-Runde gelten
//   koToepfe  — welche Töpfe dort ZUSÄTZLICH zählen
//
// ⚠️ `toepfe`, `ausLigen` und `koToepfe` sind ODER-verknüpft, und das ist der
// ganze Zweck: genau das kann `passtSpiel` nicht.
//
// 🔴 **`ohne` ist der Grund, warum das hier eine VORauswahl heißt** (Andi,
// 27.08.2026): „bei der mannschaftsauswahl mit den töpfen sollen einzelne
// Mannschaften trotzdem abgewählt werden können". Ein Topf setzt einen
// Startwert, er sperrt nicht. Ohne diese Zeile wäre die Mechanik eine
// Schublade statt eines Werkzeugs — man müsste sie ganz nehmen oder ganz
// lassen.
//
// ⚠️ **Und was Abwählen HEISST, ist keine Kleinigkeit.** Ein abgewählter
// Verein zählt nicht mehr als GRUND, ein Spiel aufzunehmen — er ist damit kein
// Verbot. Real Madrid abgewählt und Bayern drin: Real gegen Bayern ist
// weiterhin dabei, weil Bayern es hineinbringt. Das ist dieselbe Lesart wie
// `teamModus: "einer"` überall sonst („Jedes Spiel der gewählten Vereine
// zählt — auch gegen alle anderen"), und eine zweite Lesart daneben wäre eine
// Regel-Sprache mehr. Wer wirklich kein einziges Real-Spiel will, lässt Topf 1
// weg und wählt die acht anderen über `ausLigen`/eine eigene Liste.
export const DEFAULT_LOSTOPF_REGEL = {
  toepfe: [1],
  ausLigen: [],
  ohne: [],
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
  // ⚠️ Nur Vereine, die es in diesem Wettbewerb überhaupt gibt. Ein Name, den
  // niemand kennt, wäre eine Abwahl ohne Wirkung — und die sieht man einer
  // Liste nicht an.
  const imWettbewerb = new Set(Object.values(LOSTOEPFE[wettbewerb] ?? {}).flat());
  return {
    toepfe: nummern(p.toepfe, DEFAULT_LOSTOPF_REGEL.toepfe),
    ausLigen: Array.isArray(p.ausLigen) ? p.ausLigen.filter((x) => typeof x === "string") : [],
    ohne: Array.isArray(p.ohne)
      ? [...new Set(p.ohne.filter((x) => typeof x === "string" && imWettbewerb.has(x)))]
      : [],
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
  const abgewaehlt = new Set(r.ohne);

  const immer = new Set([
    ...vereineAusToepfen(wettbewerb, r.toepfe),
    ...vereineAusLigen(wettbewerb, r.ausLigen),
  ].filter((v) => !abgewaehlt.has(v)));
  if (immer.has(match.home) || immer.has(match.away)) return true;

  if (!r.koPhasen.includes(match.phase)) return false;
  // ⚠️ Die Abwahl gilt AUCH in der K.-o.-Runde. Sonst käme ein abgewählter
  // Verein im Achtelfinale durch die Hintertür zurück — und der Admin fände
  // ihn dort wieder, ohne zu wissen warum.
  const ko = new Set(vereineAusToepfen(wettbewerb, r.koToepfe).filter((v) => !abgewaehlt.has(v)));
  return ko.has(match.home) || ko.has(match.away);
}

// ── Die Vereine, die die Regel WIRKLICH auswählt ────────────
// Für eine Oberfläche, die Häkchen zeigen will: welche Vereine sind gewählt,
// welche stehen zur Wahl, und welche sind abgewählt?
//
// 🔴 EINE Stelle, aus der die Oberfläche liest — nicht die Töpfe noch einmal
// selbst zusammenrechnen. Sonst zeigt sie ein Häkchen, wo `passtLostopf`
// anders entscheidet, und niemand merkt es.
export function vereineDerRegel(regel, wettbewerb = "cl") {
  const r = sanitizeLostopfRegel(regel, wettbewerb);
  const abgewaehlt = new Set(r.ohne);
  const ausToepfen = [
    ...vereineAusToepfen(wettbewerb, r.toepfe),
    ...vereineAusLigen(wettbewerb, r.ausLigen),
  ];
  const zurWahl = [...new Set(ausToepfen)];
  return {
    // Was die Regel am Ende auswählt.
    gewaehlt: zurWahl.filter((v) => !abgewaehlt.has(v)),
    // Was der Topf anbietet — die Liste, aus der man abwählt.
    zurWahl,
    // Was abgewählt wurde. ⚠️ Nur die, die überhaupt zur Wahl standen: eine
    // Abwahl von jemandem, den der Topf gar nicht anbietet, ist keine.
    abgewaehlt: zurWahl.filter((v) => abgewaehlt.has(v)),
    // Zusätzlich in der K.-o.-Runde.
    nurKo: vereineAusToepfen(wettbewerb, r.koToepfe)
      .filter((v) => !abgewaehlt.has(v) && !zurWahl.includes(v)),
  };
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
  // ⚠️ Die Abwahl gehört in den Satz. Eine Vorauswahl, die man verändert hat
  // und die sich weiter wie die Vorgabe liest, ist eine falsche Auskunft.
  const weg = vereineDerRegel(regel, wettbewerb).abgewaehlt;
  if (weg.length) {
    teile.push(weg.length <= 2 ? `ohne ${weg.join(" und ")}` : `ohne ${weg.length} abgewählte`);
  }
  if (r.koToepfe.length) teile.push(`in der K.-o.-Runde auch Topf ${r.koToepfe.join(" + ")}`);
  return `${teile.join(", ")}.`;
}
