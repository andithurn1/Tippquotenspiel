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
//
// 🔴 `schluessel` (optional) ist derselbe Ausweg wie bei
// `invalidJokerMatchdays`: `rundenSchluessel(achse)` fasst damit alle
// Liga-Spieltage EINES Runden-Spieltags zusammen. Ohne den Parameter bleibt es
// beim Liga-Spieltag — kein stiller Regelwechsel für Aufrufer ohne Achse, und
// bei nur einem Wettbewerb sind beide Schlüssel ohnehin deckungsgleich.
//
// ⚠️ `wettbewerb`/`matchday` bleiben auch dann der LIGA-Spieltag, und zwar der
// FRÜHESTE der Gruppe. Sie sind das, woran ein Aufrufer den Tag wiedererkennt
// (und woraus die Screens über `rundenSpieltagVon` die Runden-Nummer machen) —
// eine Gruppe mit `matchday: null` wäre für sie unbrauchbar.
export function spieltageChronologisch(entries = [], schluessel = null) {
  const zeit = (k) => { const t = new Date(k ?? "").getTime(); return Number.isFinite(t) ? t : null; };
  const keyVon = typeof schluessel === "function" ? schluessel : spieltagKey;

  const spieltage = new Map();
  for (const e of entries) {
    if (e?.matchday == null) continue;
    const key = keyVon(e);
    const t = zeit(e.kickoff);
    const vorhanden = spieltage.get(key);
    if (!vorhanden) {
      spieltage.set(key, { key, wettbewerb: e.wettbewerb ?? null, matchday: e.matchday, ende: t });
    } else {
      if (t != null && (vorhanden.ende == null || t > vorhanden.ende)) vorhanden.ende = t;
      // Der FRÜHESTE Liga-Spieltag der Gruppe vertritt sie. Ohne Anpfiff bleibt
      // die kleinere Zahl — sonst hinge der Vertreter an der Eingabereihenfolge.
      const frueher = t != null && vorhanden.start != null ? t < vorhanden.start
        : e.matchday < vorhanden.matchday;
      if (frueher) { vorhanden.wettbewerb = e.wettbewerb ?? null; vorhanden.matchday = e.matchday; }
    }
    const eintrag = spieltage.get(key);
    if (t != null && (eintrag.start == null || t < eintrag.start)) eintrag.start = t;
  }

  return [...spieltage.values()].sort((a, b) => {
    if (a.ende != null && b.ende != null && a.ende !== b.ende) return a.ende - b.ende;
    if (a.matchday !== b.matchday) return a.matchday - b.matchday;
    return String(a.wettbewerb ?? "").localeCompare(String(b.wettbewerb ?? ""));
  });
}

// ── 🔴 Die Position IM VERLAUF, als Funktion ────────────────
//
// `scoreLeaderboardHistory` baut seinen Verlauf aus `spieltageChronologisch`
// — Index 0 ist der erste Spieltag, Index 1 der zweite. Wer eine Wirkung an
// einem bestimmten Spieltag ansetzen will (die Fremdjoker tun das), muss
// GENAU DIESE Zahl benutzen und keine andere.
//
// 🔴 **Der Befund vom 23.08.2026, an dem das hängt.** Die Fremdjoker-Einsätze
// trugen den LIGA-Spieltag. Gemessen an vier echten Spielen (bl#1 · bl#2 ·
// cl#1 · cl#2): ein Klau, gesetzt am CL-Spieltag 2, wirkte auf den
// BUNDESLIGA-Spieltag 2 — er nahm Punkte von einem ganz anderen Tag ab.
// Fehlgeschlagen ist dabei nichts.
//
// ⚠️ Und die naheliegende Reparatur war ebenfalls falsch: `rundenSpieltagVon`
// (zeitachse.js) zählt die Spieltage der ZEITACHSE, und die bündelt anders
// (gemessen: 34 Bundesliga-Spieltage ergeben 42 Achsen-Positionen). Für den
// Verlauf zählt allein `spieltageChronologisch` — deshalb wird die Zahl hier
// aus DERSELBEN Liste abgeleitet, aus der auch der Verlauf entsteht. Zwei
// Ableitungen könnten auseinanderlaufen; eine kann es nicht.
//
// Rückgabe: `(eintrag) => nummer | null`, 1-basiert.
export function verlaufPositionen(entries = [], schluessel = null) {
  const keyVon = typeof schluessel === "function" ? schluessel : spieltagKey;
  const karte = new Map(
    spieltageChronologisch(entries, schluessel).map((s, i) => [s.key, i + 1]));
  return (x) => karte.get(keyVon(x)) ?? null;
}
