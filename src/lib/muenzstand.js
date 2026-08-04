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
//  ⚠️ Münzen ≠ Narren (design/waehrungen.md 1) — diese Datei liefert bewusst
//  NUR die Münzen-Seite, kein Narren-Feld, auch nicht als `null`. Die Narren-
//  Seite (jetzt echt verkabelt, design/kontaktstellen.md Abschnitt 5 Punkt 2)
//  hat ihren eigenen Geschwister-Vorbau: `narrenstand.js`. Beide teilen sich
//  `naechstesOffenesSpiel` (hier exportiert) für „welcher Spieltag ist jetzt".
//
//  ── Münz-TAKT (design/wettmodus.md 3, `muenzTakt.js`) ──
//  Der Einsatz-Modus verteilt Münzen nicht zwingend JE Spieltag — der Admin
//  kann mehrere Spieltage zu einer Münz-PERIODE zusammenfassen. Deshalb wird
//  die Einsatz-Rechnung unten nicht mehr über den Spieltags-Schlüssel `schl`
//  gruppiert, sondern über `muenzSchluessel(...)`: bei Vorgabe-Takt ist das
//  derselbe Schlüssel wie bisher, bei einem eingestellten Takt gruppiert er
//  über die ganze Periode. Außerhalb eines Münz-Fensters (Takt „Saison-
//  Fenster") gibt es an diesem Spieltag GAR KEINE Münzen — das ist eine
//  eigene Aussage (`aktiv: false`), kein Rückfall auf `null`.
// ============================================================

import { einsatzPlanung, spieltagKey } from "./engine";
import { zeitachse, rundenSchluessel } from "./zeitachse";
import { wettbewerbVon } from "./wettbewerbe";
import { muenzSchluessel, muenzTaktStatus, periodeLabel, spieltagsFolge } from "./muenzTakt";

// Der „aktuelle" Spieltag: der des FRÜHESTEN Spiels, dessen Anpfiff noch in
// der Zukunft liegt. Ein früherer, ungetippter Spieltag zählt nicht — der ist
// vorbei, dort gibt es nichts mehr zu verteilen (anders als beim Tippen
// EINES Spiels, wo der Spieltag durch das Spiel selbst feststeht).
// Exportiert: `narrenstand.js` (design/kontaktstellen.md Abschnitt 5 Punkt 2)
// braucht denselben „aktuellen Spieltag" für die Narren-Anzeige — keine
// zweite Berechnung daneben.
export function naechstesOffenesSpiel(matches, jetzt) {
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

  // Münz-Takt: der Schlüssel für die Einsatz-Rechnung (`muenzSchl`, siehe
  // Kopfkommentar) und der Status DIESES Spieltags im Takt — beide über
  // denselben Spieltags-Schlüssel `schl`, damit `muenzSchl` bei Vorgabe-Takt
  // exakt `schl` selbst ist (keine Map, kein Umweg).
  const muenzSchl = muenzSchluessel({ matches, rules, schluessel: schl });
  const status = muenzTaktStatus({ matches, rules, schluessel: schl, spieltag });

  // ⚠️ `null` heißt in dieser Datei „es gibt hier gar keinen Wettmodus"
  // (siehe Kopfkommentar, `rules?.joker?.modus !== "einsatz"` oben). Liegt
  // der aktuelle Spieltag außerhalb eines Münz-Fensters (nur beim Takt
  // „Saison-Fenster" möglich), gibt es den Wettmodus SEHR WOHL — nur an
  // DIESEM Spieltag keine Münzen. Das ist eine Aussage, die die Oberfläche
  // treffen können muss (`design/waehrungen.md` 4), deshalb ein Objekt mit
  // `aktiv: false` statt eines stillschweigenden `null`.
  if (status.aktiv === false) {
    return {
      spieltag,
      spieleInPeriode: status.spieleInPeriode,
      budget: 0,
      verteilt: 0,
      frei: 0,
      minJeSpiel: 0,
      maxJeSpiel: 0,
      aktiv: false,
      grund: status.grund,
      periodeLabel: null,
    };
  }

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

  const spieleInPeriode = status.spieleInPeriode;
  const planung = einsatzPlanung({
    tips: meineTips, spieltag, spieleImSpieltag: spieleInPeriode, rules, schluessel: muenzSchl,
  });

  return {
    spieltag,
    spieleInPeriode,
    budget: planung.budget,
    verteilt: planung.verteilt,
    frei: planung.frei,
    minJeSpiel: planung.minJeSpiel,
    maxJeSpiel: planung.maxJeSpiel,
    aktiv: true,
    grund: null,
    takt: status.takt,
    periodeLabel: periodeLabel(status, spieltagsFolge(matches, schl).length),
  };
}
