// ============================================================
//  MÜNZSTAND — EINE Rechnung für drei Aufrufer
//
//  Tippabgabe, Runden-Hub und Schnellmenü zeigen alle denselben Wert: „X von Y
//  Münzen an diesem Spieltag verteilt" (design/waehrungen.md 3). Würde jeder
//  Screen das selbst ausrechnen, liefen sie irgendwann auseinander — derselbe
//  Grund, aus dem `einsatzPlanung` in engine.js schon eine einzige Stelle ist.
//  Diese Datei ist nur der Vorbau davor: „welcher Spieltag, welche Tipps,
//  welches Regelwerk" — reine Logik, UI-frei.
//
//  ⚠️ Münzen sind heute schon ECHT (design/waehrungen.md 4): sie folgen aus
//  dem Spieltag und den abgegebenen Tipps. Narren (der Shop-Kontostand) sind
//  es nicht — `kannBezahlen`/`budgetVerlauf` haben null Aufrufer im Spiel-
//  betrieb (design/kontaktstellen.md). Diese Datei liefert deshalb NUR die
//  Münzen-Seite. Kein Narren-Feld, auch nicht als `null` — das wäre schon die
//  Andeutung einer Zahl, die es nicht gibt.
// ============================================================

import { einsatzPlanung, spieltagKey } from "./engine";
import { zeitachse, rundenSchluessel } from "./zeitachse";
import { wettbewerbVon } from "./wettbewerbe";

// Der „aktuelle" Spieltag: der des FRÜHESTEN Spiels, dessen Anpfiff noch in
// der Zukunft liegt. Ein früherer, ungetippter Spieltag zählt nicht — der ist
// vorbei, dort gibt es nichts mehr zu verteilen (anders als beim Tippen
// EINES Spiels, wo der Spieltag durch das Spiel selbst feststeht).
function naechstesOffenesSpiel(matches, jetzt) {
  let bestes = null;
  let besteZeit = Infinity;
  for (const m of matches) {
    const t = new Date(m?.kickoff).getTime();
    if (!Number.isFinite(t) || t <= jetzt.getTime()) continue;
    if (t < besteZeit) { besteZeit = t; bestes = m; }
  }
  return bestes;
}

// Reine Logik, keine UI. Rückgabe `null`, wenn es nichts anzuzeigen gibt —
// siehe Kopfkommentar und design/waehrungen.md 4.
export function muenzStand({ rules, matches = [], tips = [], userId, jetzt = new Date() }) {
  if (rules?.joker?.enabled !== true) return null;
  if (rules?.joker?.modus !== "einsatz") return null;

  const fruehstesOffenes = naechstesOffenesSpiel(matches, jetzt);
  if (!fruehstesOffenes) return null;

  // Dieselbe Quelle wie in Tippabgabe.jsx, damit beide Screens denselben
  // Spieltag meinen. Fällt `rundenSchluessel` auf `undefined` (keine Achse),
  // wird auf `spieltagKey` zurückgefallen — gleiches Muster wie dort.
  const schluessel = rundenSchluessel(zeitachse(matches, rules?.zeitachse)) ?? undefined;
  const schl = schluessel ?? spieltagKey;

  const spieltag = {
    wettbewerb: wettbewerbVon(fruehstesOffenes),
    matchday: fruehstesOffenes.matchday ?? null,
  };
  const spieleImSpieltag = matches.filter((m) => schl(m) === schl(spieltag)).length;

  // Tipps des Nutzers auf DIESEN Spieltag einschränken. Die Roh-Zeilen aus
  // `listTips` tragen kein `matchday`/`wettbewerb` — aus dem Match-Katalog
  // nachgereicht, genau wie in Tippabgabe.jsx (Suchbegriff `infoOf`).
  const infoOf = new Map(matches.map((m) => [m.id, { matchday: m.matchday ?? null, wettbewerb: wettbewerbVon(m) }]));
  const meineTips = tips
    .filter((t) => t.user_id === userId)
    .map((t) => ({
      match_id: t.match_id,
      matchday: infoOf.get(t.match_id)?.matchday ?? null,
      wettbewerb: infoOf.get(t.match_id)?.wettbewerb ?? null,
      gewicht: t.tip?.gewicht,
    }));

  const planung = einsatzPlanung({
    tips: meineTips, spieltag, spieleImSpieltag, rules, schluessel: schl,
  });

  return {
    spieltag,
    spieleImSpieltag,
    budget: planung.budget,
    verteilt: planung.verteilt,
    frei: planung.frei,
    minJeSpiel: planung.minJeSpiel,
    maxJeSpiel: planung.maxJeSpiel,
  };
}
