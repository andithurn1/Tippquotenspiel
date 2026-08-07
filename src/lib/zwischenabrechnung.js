// ============================================================
//  ZWISCHENABRECHNUNG — was ist passiert, seit du zuletzt da warst?
//
//  Bisher gab es die Abrechnung nur als ORT: man ging hin und sah nach. Diese
//  Datei dreht das um — abgerechnet wird nach JEDEM einzelnen Spiel, und die
//  App erzählt es beim nächsten Öffnen von selbst.
//
//  ── 🔴 Warum je SPIEL und nicht je Spieltag ──
//  Ein Bundesliga-Spieltag läuft von Freitagabend bis Sonntagabend. Wer am
//  Samstagmorgen in die App schaut, hat sein Freitagsspiel längst hinter sich
//  — und sähe unter „Spieltag 7" trotzdem nichts, weil der Spieltag formal
//  noch läuft. Die Wertung selbst kennt diese Grenze gar nicht: `scoreTip`
//  rechnet je Spiel, und das Leaderboard nimmt alles, wozu ein Ergebnis
//  vorliegt. Die Spieltags-Grenze war also nie eine Regel, sondern nur die
//  Auflösung der Anzeige.
//
//  ⚠️ Das ändert NICHTS an den Mechaniken, die am Spieltag hängen (Joker,
//  Anschluss-Bonus, Ereignis-Auswahl, Duell-Ziele). Die rechnen weiter über
//  `rundenSchluessel`/`spieltagKey`. Hier geht es allein darum, WANN dem
//  Spieler etwas erzählt wird.
//
//  ── Wann ist ein Spiel „vorbei"? ──
//  Es gibt keinen Abpfiff in unseren Daten — nur den Anpfiff. Ein Spiel gilt
//  deshalb nach `SPIELDAUER_MIN` als beendet. Der Wert ist bewusst großzügig:
//  90 Minuten plus Halbzeit plus Nachspielzeit sind ~115, und eine
//  Zwischenabrechnung, die fünf Minuten zu früh kommt, zeigt ein Ergebnis, das
//  es noch nicht gibt. Zu spät ist harmlos, zu früh ist falsch.
//
//  ⚠️ **Das Ergebnis muss trotzdem DA sein.** Die Zeit allein genügt nicht:
//  unsere Ergebnisse sind derzeit erzeugt und stehen im Katalog, live kommen
//  sie später aus einer Ergebnis-Quelle (wie die Quoten). Beide Bedingungen
//  zusammen — Zeit UND Ergebnis — halten die Abrechnung ehrlich, egal welche
//  Quelle dahinterhängt.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { scoreTip, DEFAULT_RULES } from "./engine";

// 90 + Halbzeit + Nachspielzeit + Puffer. Siehe Kopfkommentar: zu spät ist
// harmlos, zu früh zeigt ein Ergebnis, das es noch nicht gibt.
export const SPIELDAUER_MIN = 135;

const zeit = (x) => {
  const t = new Date(x ?? "").getTime();
  return Number.isFinite(t) ? t : null;
};

// Wann ist dieses Spiel abgerechnet — also vorbei UND ausgewertet?
// `null`, wenn es (noch) nicht so weit ist.
export function abrechnungsZeit(eintrag, jetzt = Date.now()) {
  const anpfiff = zeit(eintrag?.kickoff);
  if (anpfiff == null) return null;
  const ende = anpfiff + SPIELDAUER_MIN * 60 * 1000;
  if (ende > jetzt) return null;
  // 🔴 Zeit allein genügt nicht — ohne Ergebnis gibt es nichts abzurechnen.
  // Ein Spiel, dessen Ergebnis noch aussteht (Absage, Quelle hängt), wäre
  // sonst eine leere Meldung mit 0 Punkten, und die liest sich wie ein
  // Fehltipp.
  if (!eintrag?.result) return null;
  return ende;
}

// ── Was ist seit `seit` fertig geworden? ────────────────────
// `eintraege` sind die EIGENEN Tipps in der Form von `getRoundEntries`
// (`tip`, `result`, `snapshot`, `kickoff`, `matchday`, `wettbewerb`).
//
// 🔴 `seit = null` heißt „noch nie etwas gesehen" und liefert bewusst NICHTS.
// Sonst bekäme jemand beim allerersten Öffnen die halbe Saison als
// „Neuigkeiten" vorgesetzt — dieselbe Überlegung wie bei der Spielwahl, die
// nur Anstehendes zeigt statt 465 Spiele.
// ── Der Vergleich mit ausgewählten Mitspielern ──────────────
// `alleEintraege` sind die Tipps ALLER Mitglieder, `vergleich` die bis zu drei
// Nutzer-Ids, die dieser Spieler im Blick haben will (persönliche Einstellung,
// je Runde — siehe `prefs.js`).
//
// ⚠️ Verglichen wird NUR bei denselben Spielen. Ein Mitspieler, der dieses
// Spiel nicht getippt hat, taucht in der Zeile gar nicht auf, statt mit 0
// dazustehen — „hat nicht getippt" und „hat null Punkte geholt" sind zwei
// verschiedene Aussagen, und die zweite wäre eine Behauptung über jemanden,
// die nicht stimmt.
export function neueAbrechnungen({
  eintraege = [], seit = null, jetzt = Date.now(), rules = DEFAULT_RULES,
  alleEintraege = null, vergleich = [],
} = {}) {
  if (seit == null) return [];
  const grenze = zeit(seit) ?? Number(seit);
  if (!Number.isFinite(grenze)) return [];

  // Die Tipps der Vergleichs-Mitspieler, nach Spiel gebündelt. Einmal
  // aufgebaut statt je Spiel durch die ganze Liste zu suchen.
  const wen = new Set(vergleich.filter(Boolean));
  const andereJeSpiel = new Map();
  if (wen.size && Array.isArray(alleEintraege)) {
    for (const a of alleEintraege) {
      if (!wen.has(a.userId) || !a.tip || !a.snapshot || !a.result) continue;
      const mid = a.matchId ?? a.snapshot?.matchId ?? null;
      if (mid == null) continue;
      if (!andereJeSpiel.has(mid)) andereJeSpiel.set(mid, []);
      andereJeSpiel.get(mid).push(a);
    }
  }

  const out = [];
  for (const e of eintraege) {
    const fertig = abrechnungsZeit(e, jetzt);
    if (fertig == null || fertig <= grenze) continue;
    // Ohne abgegebenen Tipp gibt es nichts zu erzählen — ein Spiel, das man
    // ausgelassen hat, ist keine Neuigkeit über den eigenen Tipp.
    if (!e.tip || !e.snapshot) continue;
    const wertung = scoreTip(e.tip, e.result, e.snapshot, e.rules ?? rules);
    const matchId = e.matchId ?? e.snapshot?.matchId ?? null;
    // Die ausgewählten Mitspieler zu DIESEM Spiel — in der Reihenfolge, in der
    // sie gewählt wurden, damit die Spalten nicht je Spiel springen.
    const andere = (andereJeSpiel.get(matchId) ?? [])
      .map((a) => {
        const w = scoreTip(a.tip, a.result, a.snapshot, a.rules ?? rules);
        return {
          userId: a.userId, name: a.name ?? a.userId, tip: a.tip,
          punkte: w.total,
          exakt: a.tip.home === a.result.home && a.tip.away === a.result.away,
        };
      })
      .sort((x, y) => vergleich.indexOf(x.userId) - vergleich.indexOf(y.userId));
    out.push({
      matchId,
      wettbewerb: e.wettbewerb ?? null,
      matchday: e.matchday ?? null,
      kickoff: e.kickoff ?? null,
      fertig,
      home: e.snapshot?.home ?? null,
      away: e.snapshot?.away ?? null,
      tip: e.tip,
      result: e.result,
      punkte: wertung.total,
      exakt: e.tip.home === e.result.home && e.tip.away === e.result.away,
      andere,
    });
  }
  // Chronologisch: die App erzählt der Reihe nach, was passiert ist.
  return out.sort((a, b) => a.fertig - b.fertig);
}

// Eine Zeile für die Überschrift. „7 Spiele, 412 Punkte" ist die Aussage, für
// die jemand die Einblendung überhaupt liest — dieselbe Rolle wie `anteile()`
// bei den Wettbewerbs-Gewichten: aus Einzelwerten wird eine Aussage.
export function zusammenfassung(liste = []) {
  const punkte = liste.reduce((s, x) => s + (Number(x.punkte) || 0), 0);
  const exakte = liste.filter((x) => x.exakt).length;
  // Das beste Einzelspiel — der Moment, den man erzählen will.
  let beste = null;
  for (const x of liste) if (!beste || x.punkte > beste.punkte) beste = x;
  return { anzahl: liste.length, punkte, exakte, beste };
}

// Der Zeitstempel, bis zu dem der Nutzer alles gesehen hat, nachdem er die
// Einblendung weggeklickt hat.
//
// ⚠️ Der Stand des LETZTEN abgerechneten Spiels, nicht `Date.now()`. Zwischen
// dem Aufbau der Liste und dem Klick können Minuten liegen; mit „jetzt"
// markiert würde ein Spiel, das genau dazwischen fertig geworden ist, als
// gesehen verbucht und nie erzählt. Ein Spiel doppelt zu zeigen wäre ärgerlich
// — eines zu verschlucken ist schlimmer.
export function gesehenBis(liste = [], vorher = null) {
  const letzte = liste.reduce((m, x) => Math.max(m, x.fertig ?? 0), 0);
  const alt = Number(vorher) || 0;
  return Math.max(alt, letzte);
}
