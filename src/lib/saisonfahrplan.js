// ============================================================
//  SAISON-FAHRPLAN — was wann aufgeht, und wo wir gerade stehen
//
//  Die Runde hat inzwischen ein halbes Dutzend Dinge, die sich im LAUF der
//  Saison öffnen und schließen: das Tipp-Fenster je Spiel, die Joker-Spieltage,
//  die Drehungen am Rad, die Freischalt-Fenster der Saison-Wetten, der
//  Wirkungs-Spieltag eines Beschlusses. Jedes davon ist einzeln richtig
//  gerechnet — und keines war je zusammen zu sehen.
//
//  🔴 Genau das ist die Lücke, die Andi am 05.08.2026 benannt hat: „im
//  zeitlichen Verlauf der Saison müssen nach und nach die Freischaltungen und
//  aktuellen Stände" sichtbar werden. Ein Spieler kann heute nachsehen, ob er
//  JETZT tippen darf — aber nicht, was nächste Woche aufgeht.
//
//  Dieses Modul baut daraus EINE Liste, eine Zeile je RUNDEN-Spieltag. Es
//  rechnet nichts selbst: jede Spalte kommt aus dem Modul, dem sie gehört
//  (`tippfenster`, `jokerPlan`, `drehrad`, `saisonwetten`, `records`). Damit
//  kann der Fahrplan nichts anderes behaupten als die Wertung — die Lehre aus
//  den 17 Funden des Anzeige-Durchgangs.
//
//  ⚠️ Gerechnet wird in RUNDEN-Spieltagen. Der Aufrufer reicht die Spiele DER
//  RUNDE herein (`getStore().listRoundMatches`), sonst zählt der Fahrplan
//  andere Spieltage als der Store (Architektur-Regel 5).
//
//  ⚠️ VERDECKT bleibt verdeckt. Joker-Spieltage kommen über
//  `sichtbareSpieltage`, nicht über den rohen Plan — sonst verriete der
//  Fahrplan genau das, was die Einstellung `sichtbarkeit: "verdeckt"`
//  zurückhalten soll.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { zeitachse, rundenSpieltagVon, achsenLabel, bespielteSpieltage } from "./zeitachse";
import { tippStatus } from "./tippfenster";
import { jokerPlan, sichtbareSpieltage, sanitizeVerteilung } from "./jokerPlan";
import { drehradPlan, sanitizeDrehrad } from "./drehrad";
import { sanitizeSaison, wettenLabel, sanitizeFreigabe } from "./saisonwetten";
import { matchdayDeltas } from "./records";
import { wettbewerbVon } from "./wettbewerbe";

// Auf welchen RUNDEN-Spieltag fällt ein Liga-Spieltag eines Wettbewerbs?
// Die Freischalt-Fenster der Saison-Wetten sind in LIGA-Spieltagen notiert
// („ab CL-Spieltag 6"), der Fahrplan läuft über Runden-Spieltage — ohne diese
// Übersetzung stünde die Wette an der falschen Zeile.
function rundenTagFuer(achse, matches, wettbewerb, ligaSpieltag) {
  if (!Number.isFinite(ligaSpieltag)) return null;
  const kandidat = matches.find((m) => (wettbewerb == null || wettbewerbVon(m) === wettbewerb)
    && m.matchday === ligaSpieltag);
  return kandidat ? rundenSpieltagVon(achse, kandidat) : null;
}

// Die Zeilen des Fahrplans.
//
//   matches   Spiele DIESER Runde
//   rules     Regelwerk der Runde
//   roundId   Saat für Joker- und Rad-Plan (dieselbe wie im Store)
//   userId    für „meine Joker-Spieltage" und „meine Punkte"
//   userIds   alle Spieler der Runde (der Plan verteilt je Spieler)
//   history   `getLeaderboardHistory` — für die Punkte je Spieltag
//   meineTips roh (`listTips`), nur um „getippt" je Spieltag zu zählen
//
// Rückgabe je Zeile:
//   { nummer, label, zustand, spiele, offen, getippt, joker, rad,
//     saison: [{ label, was }], punkte }
export function fahrplan({
  matches = [], rules = {}, roundId = "", userId = null, userIds = [],
  history = [], meineTips = [], jetzt = Date.now(),
} = {}) {
  const achse = zeitachse(matches, rules?.zeitachse);
  if (!achse.length) return [];

  const spieltage = achse.length;
  const jetztTag = aktuellerRundenSpieltag(achse, matches, jetzt);

  // ── Joker: nur die SICHTBAREN Spieltage ──
  const verteilung = sanitizeVerteilung(rules?.joker?.verteilung);
  const jokerAn = rules?.joker?.enabled === true;
  const bespielt = bespielteSpieltage(achse);
  const jPlan = jokerAn
    ? jokerPlan({ spieltage, bespielt, verteilung, seed: roundId, userIds })
    : null;
  const jokerTage = jokerAn
    ? sichtbareSpieltage(jPlan, userId, verteilung, jetztTag ?? spieltage)
    : [];
  // `null` = Modus „frei": jeder Spieltag trägt einen.
  const jokerAlle = jokerAn && jokerTage === null;
  const jokerSet = new Set(jokerTage ?? []);

  // ── Rad ──
  const radCfg = sanitizeDrehrad(rules?.drehrad);
  const radTage = radCfg.enabled && userId
    ? new Set(drehradPlan({ spieltage, bespielt, drehrad: radCfg, seed: roundId, userIds })
      .proSpieler?.[userId] ?? [])
    : new Set();

  // ── Saison-Wetten: wo öffnet und wo schließt welche? ──
  const saison = sanitizeSaison(rules?.saison);
  const saisonMarken = new Map();   // Runden-Spieltag → [{ label, was }]
  if (saison.enabled) {
    for (const w of saison.wetten) {
      const f = sanitizeFreigabe(w);
      if (f.abSpieltag === null) continue;   // ohne Fenster: gehört vor die Saison
      const auf = rundenTagFuer(achse, matches, w.wettbewerb ?? null, f.abSpieltag);
      const zu = rundenTagFuer(achse, matches, w.wettbewerb ?? null, f.bisSpieltag);
      const label = wettenLabel(w);
      if (auf != null) marke(saisonMarken, auf, { label, was: "oeffnet" });
      if (zu != null) marke(saisonMarken, zu, { label, was: "schliesst" });
    }
  }

  // ── Eigene Punkte je Spieltag ──
  // `history` trägt LIGA-Spieltage; umgeschlüsselt wird über dieselbe Achse.
  const punkteJeTag = new Map();
  for (const { matchday, perUser } of matchdayDeltas(history)) {
    const eintrag = history.find((h) => h.matchday === matchday);
    const wettbewerb = eintrag?.wettbewerb ?? null;
    const tag = rundenTagFuer(achse, matches, wettbewerb, matchday);
    if (tag == null) continue;
    const delta = perUser.get(userId)?.delta ?? 0;
    punkteJeTag.set(tag, (punkteJeTag.get(tag) ?? 0) + delta);
  }

  // ── Eigene Tipps je Spieltag ──
  const matchVon = new Map(matches.map((m) => [m.id, m]));
  const getipptJeTag = new Map();
  for (const t of meineTips) {
    const m = matchVon.get(t.match_id ?? t.matchId);
    const tag = m ? rundenSpieltagVon(achse, m) : null;
    if (tag == null) continue;
    getipptJeTag.set(tag, (getipptJeTag.get(tag) ?? 0) + 1);
  }

  return achse.map((e) => {
    const offen = e.spiele.filter((m) => tippStatus(m, rules, jetzt).zustand === "offen").length;
    const vorbei = e.spiele.every((m) => tippStatus(m, rules, jetzt).zustand === "vorbei");
    const zustand = jetztTag == null ? "kommt"
      : e.nummer < jetztTag ? "vorbei"
      : e.nummer > jetztTag ? "kommt"
      : "laeuft";
    return {
      nummer: e.nummer,
      label: achsenLabel(e, { kurz: true }),
      zustand: e.spiele.length && vorbei && zustand !== "laeuft" ? "vorbei" : zustand,
      spiele: e.spiele.length,
      offen,
      getippt: getipptJeTag.get(e.nummer) ?? 0,
      joker: jokerAlle || jokerSet.has(e.nummer),
      rad: radTage.has(e.nummer),
      saison: saisonMarken.get(e.nummer) ?? [],
      punkte: punkteJeTag.has(e.nummer) ? punkteJeTag.get(e.nummer) : null,
    };
  });
}

function marke(map, tag, eintrag) {
  if (!map.has(tag)) map.set(tag, []);
  map.get(tag).push(eintrag);
}

// Der Runden-Spieltag, an dem die Saison GERADE steht: der letzte, dessen
// Fenster begonnen hat. Vor dem ersten Anpfiff `1`, nach dem letzten Spiel der
// letzte Eintrag — nie `null`, solange es überhaupt eine Achse gibt.
// ⚠️ Bewusst nicht „das nächste offene Spiel": in der Länderspielpause gibt es
// tagelang keines, und der Fahrplan stünde dann auf einem Spieltag, der längst
// gelaufen ist.
export function aktuellerRundenSpieltag(achse = [], matches = [], jetzt = Date.now()) {
  if (!achse.length) return null;
  let letzter = 1;
  for (const e of achse) {
    const start = Number.isFinite(e.von)
      ? e.von
      : Math.min(...(e.spiele ?? []).map((m) => new Date(m.kickoff).getTime()).filter(Number.isFinite));
    if (Number.isFinite(start) && start <= jetzt) letzter = e.nummer;
  }
  return letzter;
}

// Ein Satz über den Stand der Saison — für die Kopfzeile.
export function beschreibeFahrplan(zeilen = [], jetztTag = null) {
  if (!zeilen.length) return "Für diese Runde gibt es noch keinen Spielplan.";
  const gesamt = zeilen.length;
  const gespielt = zeilen.filter((z) => z.zustand === "vorbei").length;
  const offeneSpiele = zeilen.reduce((s, z) => s + z.offen, 0);
  const teile = [`Spieltag ${jetztTag ?? 1} von ${gesamt}`];
  if (gespielt > 0) teile.push(`${gespielt} gespielt`);
  teile.push(offeneSpiele === 0
    ? "gerade nichts tippbar"
    : `${offeneSpiele} ${offeneSpiele === 1 ? "Spiel" : "Spiele"} tippbar`);
  return teile.join(" · ") + ".";
}
