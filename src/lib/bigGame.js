// ============================================================
//  BIG GAME — das Spiel des Spieltags dynamisch bestimmen
//
//  Beim Anlegen der Runde weiß niemand, welche Begegnungen spannend werden.
//  Ein DERBY steht vorher fest, „Erster gegen Zweiter am 31. Spieltag" nicht.
//  Diese Datei sucht während der Saison je Spieltag das interessanteste Spiel.
//
//  ── Was ein Spiel groß macht ──
//  Die naheliegende Antwort — ausgeglichene Quoten — ist die falsche: Zehnter
//  gegen Elfter ist maximal ausgeglichen und völlig belanglos. Entscheidend ist
//  die TABELLENZONE: oben geht es um Titel und Europa, unten um den Abstieg,
//  in der Mitte um nichts. Deshalb wiegt `zone` am schwersten, und die
//  Ausgeglichenheit ist nur ein Zuschlag darauf.
//
//  ── Der Zeitpunkt ist ein FAKTOR, kein Summand ──
//  Spät in der Saison zählt alles mehr. Innerhalb EINES Spieltags ist dieser
//  Wert aber für alle Spiele gleich — er kann also gar nicht entscheiden,
//  WELCHES Spiel das Big Game wird, sondern nur, OB ein Spieltag überhaupt eins
//  bekommt (Schwelle `minSpannung`). Genau so ist er hier modelliert.
//
//  ── Fairness: das Big Game muss VORHER feststehen ──
//  Bestimmt wird es beim Öffnen des Spieltags aus dem DANN gültigen
//  Tabellenstand — gleiches Prinzip wie der Quoten-Snapshot: einmal festgelegt,
//  gilt es. Diese Datei RECHNET nur; das Einfrieren ist Sache von Store/UI.
//  Ohne diese Regel änderte sich der Wert eines Tipps rückwirkend.
//
//  ── Die Belohnung ist kein neuer Multiplikator ──
//  „Dieses Spiel ist wichtiger, für alle gleich" — dieselbe Aussage wie Derby
//  und (später) Wettbewerbs-Gewicht. Also derselbe additive Topf unter
//  `modCap`, kein eigener Faktor daneben.
//
//  Reine Funktionen, UI-frei. Die Engine kennt weiterhin keine Vereinsnamen:
//  hier kommt alles aus Tabelle und Snapshot.
// ============================================================

import { rangliste } from "./saisonwetten";

export const BIGGAME_LIMITS = {
  aufschlag: { min: 0, max: 1, step: 0.05 },     // Aufschlag auf den Modifikator
  minSpannung: { min: 0, max: 0.8, step: 0.05 }, // ab welchem Wert es eins gibt
};

// ── 🔴 Das Topspiel von HAND bestimmen (Andi, 27.08.2026) ──
// Wörtlich: *„admin einstellbar machen, dass halt sieger eines Spieltags oder
// auch eines letzten Top matches das nächste Topspiel oder ereignis auswählen
// kann (bzw. sowas wie Big Game aber auch andere für die ganze Tipprunde
// festlegt)"*.
//
// `festesSpiel` ist die matchId, die für DIESE RUNDE als Topspiel gilt —
// unabhängig vom Spannungswert. `null` = wie bisher, die Rechnung entscheidet.
//
// ⚠️ **Warum das ins REGELWERK gehört und nicht in den Snapshot** — und das
// ist der Befund, an dem die ganze Idee hängt: `matches` ist GLOBAL, dieselbe
// Begegnung gehört zu vielen Runden. Der Kopf von `spieltagOeffnen.js` sagt
// es ausdrücklich: eingefroren wird nur der objektive Spannungswert, „ob er
// zählt, entscheidet jede Runde mit ihrer eigenen Schwelle".
//
// Eine handverlesene Wahl ist aber genau das Gegenteil von objektiv. Stünde
// sie im Snapshot, bestimmte der Sieger EINER Runde das Topspiel für alle
// anderen mit. Sie muss also rundenweit liegen — und das Regelwerk ist der
// einzige Ort, den die Wertung ohnehin je Runde UND je Spieltag liest
// (`getRegelnFuer`).
export const DEFAULT_BIGGAME = {
  enabled: false, aufschlag: 0.5, minSpannung: 0.35,
  festesSpiel: null,
  // Darf der Sieger des letzten Spieltags das nächste Topspiel bestimmen?
  // ⚠️ Das ist der ADMIN-Schalter. WER genau der Sieger ist, entscheidet die
  // WEN-Achse (`auswahl.js`) — dort gibt es `titelverteidiger` („wer den
  // vorigen Spieltag gewonnen hat") längst. Hier steht nur, ob das Recht
  // überhaupt vergeben wird.
  siegerWaehlt: false,
};

export function sanitizeBigGame(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const clamp = (v, { min, max }, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? +Math.min(max, Math.max(min, n)).toFixed(2) : fallback;
  };
  // Eine leere Zeichenkette ist keine matchId — sie käme aus einem
  // zurückgesetzten Eingabefeld und stünde danach als „gewählt" da.
  const festesSpiel = typeof p.festesSpiel === "string" && p.festesSpiel.trim()
    ? p.festesSpiel.trim() : null;
  return {
    enabled: p.enabled === true,
    aufschlag: clamp(p.aufschlag, BIGGAME_LIMITS.aufschlag, DEFAULT_BIGGAME.aufschlag),
    minSpannung: clamp(p.minSpannung, BIGGAME_LIMITS.minSpannung, DEFAULT_BIGGAME.minSpannung),
    festesSpiel,
    // ⚠️ Nur sinnvoll, solange es überhaupt ein Big Game gibt. Ein Recht, das
    // nichts bestimmen kann, wäre ein Schalter, der nichts tut — dieselbe
    // Klinke wie bei `sanitizeSperre`.
    siegerWaehlt: p.siegerWaehlt === true && p.enabled === true,
  };
}

// ── Signale ─────────────────────────────────────────────────

// Wie viel steht für einen Tabellenplatz auf dem Spiel? Oben (Titel/Europa)
// und unten (Abstieg) viel, in der Mitte fast nichts. Bewusst als ANTEILE der
// Ligagröße, damit dieselbe Formel für 18er- und 20er-Ligen stimmt — und für
// Sportarten mit ganz anderen Tabellen (Regel 3: sportart-neutral).
export function zonenWert(rang, teams) {
  if (!Number.isFinite(rang) || !Number.isFinite(teams) || teams < 2) return 0;
  const oben = 1 - (rang - 1) / (teams * 0.35);
  const unten = 1 - (teams - rang) / (teams * 0.25);
  return +Math.max(0, Math.min(1, Math.max(oben, unten))).toFixed(3);
}

// Wie dicht liegen die beiden in der Tabelle? Direkte Nachbarn = 1.
function rangNaehe(rangA, rangB, teams) {
  if (teams < 2) return 0;
  return +Math.max(0, 1 - Math.abs(rangA - rangB) / (teams - 1)).toFixed(3);
}

// Ausgeglichenheit aus den Quoten: gleich hohe Sieger-Quoten = 1.
// Aus den Quoten und nicht aus der Tabelle, weil Form und Verletzungen dort
// schon eingepreist sind — der Snapshot weiß mehr als der Punktestand.
function ausgeglichen(snap) {
  const h = snap?.winner?.home, a = snap?.winner?.away;
  if (!Number.isFinite(h) || !Number.isFinite(a) || h <= 0 || a <= 0) return 0;
  const pH = 1 / h, pA = 1 / a;
  const summe = pH + pA;
  if (summe <= 0) return 0;
  return +Math.max(0, 1 - Math.abs(pH - pA) / summe).toFixed(3);
}

// Gewichte. Zone dominiert — siehe Kopf: ausgeglichen ≠ wichtig.
const GEWICHT = { zone: 0.45, naehe: 0.2, quoten: 0.25, derby: 0.1 };

// Der Zeitpunkt skaliert das Ganze: der 31. Spieltag zählt mehr als der 3.
// Nie auf 0 — auch früh gibt es große Spiele, sie sind nur weniger endgültig.
function zeitFaktor(spieltag, gesamt) {
  if (!Number.isFinite(spieltag) || !Number.isFinite(gesamt) || gesamt < 1) return 1;
  return +(0.6 + 0.4 * Math.min(1, Math.max(0, spieltag / gesamt))).toFixed(3);
}

// ── Spannungswert eines einzelnen Spiels ────────────────────
// Gibt die Einzelteile mit zurück — ohne Begründung wirkt die Auswahl
// willkürlich, und genau daran stirbt das Vertrauen in so einen Automatismus.
export function spannungsWert({ snap, tabelle = [], spieltag = 1, gesamtSpieltage = 34 } = {}) {
  const teams = tabelle.length;
  const zeile = (name) => tabelle.find((t) => t.team === name) || null;
  const zH = zeile(snap?.home), zA = zeile(snap?.away);

  const zone = zH && zA
    ? (zonenWert(zH.rang, teams) + zonenWert(zA.rang, teams)) / 2
    : 0;
  const naehe = zH && zA ? rangNaehe(zH.rang, zA.rang, teams) : 0;
  const quoten = ausgeglichen(snap);
  const derby = snap?.derby ? 1 : 0;

  const roh = GEWICHT.zone * zone + GEWICHT.naehe * naehe
    + GEWICHT.quoten * quoten + GEWICHT.derby * derby;
  const zeit = zeitFaktor(spieltag, gesamtSpieltage);

  return {
    matchId: snap?.matchId ?? null,
    wert: +(roh * zeit).toFixed(4),
    roh: +roh.toFixed(4),
    zeit,
    teile: { zone: +zone.toFixed(3), naehe, quoten, derby },
    raenge: { home: zH?.rang ?? null, away: zA?.rang ?? null },
  };
}

// ── Das Big Game eines Spieltags ────────────────────────────
// `matches` sind die Snapshots des Spieltags, `gespielt` die bereits
// ausgewerteten Spiele der Saison (daraus die Tabelle). Gibt null zurück,
// wenn kein Spiel die Schwelle reißt — ein Spieltag ohne Big Game ist besser
// als ein aufgeblasenes Mittelfeldduell.
export function bigGameFuer(matches = [], {
  gespielt = [], tabelle: vorgegeben = null, spieltag = 1, gesamtSpieltage = 34,
  bigGame = DEFAULT_BIGGAME,
} = {}) {
  const cfg = sanitizeBigGame(bigGame);
  if (!cfg.enabled || !matches.length) return null;

  const tab = vorgegeben ?? rangliste(gespielt);
  const bewertet = matches
    .map((snap) => spannungsWert({ snap, tabelle: tab, spieltag, gesamtSpieltage }))
    // Gleichstand nach matchId auflösen: sonst hinge das Big Game an der
    // Reihenfolge, in der die Spiele geladen wurden.
    .sort((a, b) => b.wert - a.wert || String(a.matchId).localeCompare(String(b.matchId)));

  const bester = bewertet[0];
  if (!bester || bester.wert < cfg.minSpannung) return null;
  return { ...bester, begruendung: begruendung(bester, matches, tab) };
}

// Ein Satz, der die Auswahl erklärt — in der Sprache, in der man über Fußball
// redet, nicht in Kennzahlen.
export function begruendung(bewertung, matches = [], tabelle = []) {
  const snap = matches.find((m) => m?.matchId === bewertung?.matchId);
  const teams = tabelle.length;
  const { home, away } = bewertung?.raenge ?? {};
  const teile = [];

  if (home && away) {
    teile.push(`Platz ${home} gegen Platz ${away}`);
    const obenGrenze = Math.ceil(teams * 0.25);
    const untenGrenze = teams - Math.ceil(teams * 0.2) + 1;
    if (home <= obenGrenze && away <= obenGrenze) teile.push("beide oben dran");
    else if (home >= untenGrenze && away >= untenGrenze) teile.push("Kellerduell");
    if (Math.abs(home - away) <= 1) teile.push("direkte Nachbarn");
  }
  if (snap?.derby) teile.push("Derby");
  if (bewertung?.teile?.quoten >= 0.8) teile.push("die Quoten sehen es offen");
  if (bewertung?.zeit >= 0.9) teile.push("und es wird langsam eng in der Saison");

  return teile.length ? teile.join(", ") : "das ausgeglichenste Spiel des Spieltags";
}

// Der Aufschlag fürs Big Game — dieselbe Bauart wie `teamModFactor`, damit er
// in denselben additiven Topf fällt.
//
// ⚠️ Warum hier ein WERT steht und kein Ja/Nein: `matches` ist GLOBAL, dieselbe
// Begegnung gehört zu vielen Runden. Würde beim Öffnen ein Häkchen
// „das ist das Big Game" in den Snapshot geschrieben, entschiede die Runde,
// die zuerst öffnet, für alle anderen mit — auch für solche, die Big Game gar
// nicht aktiviert haben oder eine andere Schwelle wollen.
//
// Eingefroren wird deshalb nur, was OBJEKTIV ist: der Spannungswert des
// Spieltags-Topspiels (`snap.bigGameWert`), berechnet aus dem Tabellenstand
// beim Öffnen. Ob dieser Wert für eine Runde als Big Game zählt, entscheidet
// jede Runde mit ihrer eigenen Schwelle — beim Auswerten, nicht beim Öffnen.
// Der Wert bleibt trotzdem eingefroren, die Fairness-Regel gilt also weiter.
export function bigGameAufschlag(snap, rules) {
  const cfg = sanitizeBigGame(rules?.bigGame);
  if (!cfg.enabled) return 0;
  // 🔴 Ein von Hand bestimmtes Topspiel schlägt die Rechnung — in BEIDE
  // Richtungen. Das gewählte Spiel bekommt den Aufschlag ohne Rücksicht auf
  // die Schwelle, und jedes ANDERE bekommt ihn nicht, auch wenn es sie reißt.
  //
  // ⚠️ Die zweite Hälfte ist die wichtigere: ohne sie gäbe es an einem
  // Spieltag zwei Topspiele — das gewählte und das gerechnete. „Du bestimmst
  // das Topspiel" wäre dann eine Halbwahrheit.
  if (cfg.festesSpiel) return snap?.matchId === cfg.festesSpiel ? cfg.aufschlag : 0;
  const wert = snap?.bigGameWert;
  if (!Number.isFinite(wert) || wert < cfg.minSpannung) return 0;
  return cfg.aufschlag;
}
