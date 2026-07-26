// ============================================================
//  SPIELTAG — die Identität und die Reihenfolge eines Spieltags
//
//  Ein SPIELTAG ist erst mit dem WETTBEWERB eindeutig: Bundesliga-Spieltag 1
//  und Champions-League-Spieltag 1 sind zwei verschiedene Spieltage. Seit fünf
//  Wettbewerbe im selben Katalog liegen, gibt es „Spieltag 1" fünfmal.
//
//  Diese Datei ist bewusst EIGENSTÄNDIG und importiert nichts. Sie lag vorher
//  in `engine.js`, aber `engine.js` importiert aus `ereignisse.js` — und die
//  Ereignisse brauchen dieselbe Spieltags-Identität. Das wäre ein Import-Kreis
//  gewesen, bei dem `DEFAULT_RULES.ereignisse` still zu `{}` geworden wäre.
//
//  Sie kennt KEINE Wettbewerbsnamen (Architektur-Regel 3), sondern setzt nur
//  zwei Felder zusammen; was „bl" bedeutet, weiß allein die Daten-Schicht.
//
//  ⚠️ Diese Fehlerklasse hatten wir fünfmal — überall dort, wo ein Spieltag als
//  nackte Zahl in einen Schlüssel wandert (Joker, Abstimmung, Spieltag öffnen,
//  Benachrichtigungen, Ranking-Verlauf). Wer „je Spieltag" gruppiert oder
//  sortiert, nimmt `spieltagKey` bzw. `spieltageChronologisch` — nie `matchday`
//  allein.
//
//  Reine Funktionen, UI-frei.
// ============================================================

export function spieltagKey(x) {
  return `${x?.wettbewerb ?? ""}#${x?.matchday ?? ""}`;
}

// Zwei Tipps am selben Spieltag DESSELBEN Wettbewerbs?
export function gleicherSpieltag(a, b) {
  return spieltagKey(a) === spieltagKey(b);
}

// Die Spieltage einer Eintrags-Liste in ihrer CHRONOLOGISCHEN Reihenfolge.
// Seit mehrere Wettbewerbe in einer Runde laufen können, ist die Spieltags-Zahl
// keine Reihenfolge mehr: CL-Spieltag 1 liegt etwa bei Bundesliga-Spieltag 3.
// Nach der Zahl sortiert würde ein Verlauf springen — und der Aufhol-Bonus zum
// falschen Zeitpunkt greifen, weil er am Stand VOR dem Spieltag hängt.
//
// Maßgeblich ist der LETZTE Anpfiff eines Spieltags: erst wenn er durch ist,
// steht der Zwischenstand fest. Ohne verwertbare Anstoßzeit bleibt es bei der
// Zahl — dadurch verhält sich eine Runde mit nur EINEM Wettbewerb exakt wie
// bisher, und Altdaten ohne `kickoff` fallen nicht weg.
//
// Rückgabe: [{ key, wettbewerb, matchday, ende }] — `key` ist `spieltagKey`.
export function spieltageChronologisch(entries = []) {
  const zeit = (k) => { const t = new Date(k ?? "").getTime(); return Number.isFinite(t) ? t : null; };

  const spieltage = new Map();
  for (const e of entries) {
    if (e?.matchday == null) continue;
    const key = spieltagKey(e);
    const t = zeit(e.kickoff);
    const vorhanden = spieltage.get(key);
    if (!vorhanden) {
      spieltage.set(key, { key, wettbewerb: e.wettbewerb ?? null, matchday: e.matchday, ende: t });
    } else if (t != null && (vorhanden.ende == null || t > vorhanden.ende)) {
      vorhanden.ende = t;
    }
  }

  return [...spieltage.values()].sort((a, b) => {
    if (a.ende != null && b.ende != null && a.ende !== b.ende) return a.ende - b.ende;
    if (a.matchday !== b.matchday) return a.matchday - b.matchday;
    return String(a.wettbewerb ?? "").localeCompare(String(b.wettbewerb ?? ""));
  });
}
