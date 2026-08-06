// ============================================================
//  SPIELTAGSPUNKTE — was hat wer an EINEM Spieltag geholt?
//
//  Der Verlauf (`scoreLeaderboardHistory`) ist KUMULATIV: jede Stufe trägt den
//  Gesamtstand nach diesem Spieltag. Die Punkte eines einzelnen Spieltags sind
//  darin nur als Differenz zur Vorstufe enthalten — und genau diese Differenz
//  wurde im Projekt an mehreren Stellen einzeln gebildet.
//
//  🔴 Warum das eine eigene Datei ist: `applySaisonform` rechnete sie für die
//  Streichresultate aus, und `ereignisse.js` erwartet sie als `spieltagsPunkte`
//  von außen — ohne dass irgendein Aufrufer sie je geliefert hätte (Befund
//  06.08.2026, siehe unten). Zwei Stellen, dieselbe Rechnung, eine davon leer.
//  Das ist die Runden-Schicht aus CLAUDE.md, Frage 4: „Was hat wer
//  gutgeschrieben bekommen?" — der Screen fragt, er rechnet nicht nach.
//
//  ⚠️ Gerechnet wird auf dem FERTIGEN Verlauf, also nach Duell-Joker,
//  Saisonform und Aufhol-Bonus. Wer „Letzter am Spieltag" auf den rohen
//  Wertungspunkten bestimmte, käme in einer Runde mit Streichresultaten auf
//  einen anderen Letzten als die Tabelle daneben.
//
//  ⚠️ Die SKALA ist die des übergebenen Verlaufs. `scoreLeaderboardHistory`
//  liefert LIGA-Spieltage; wer Runden-Spieltage will, schickt den Verlauf
//  vorher durch `verlaufNachRundenSpieltag`. Diese Datei rechnet nicht um —
//  sonst gäbe es zwei Stellen, die dieselbe Umschlüsselung entscheiden.
//
//  Reine Funktionen, UI-frei.
// ============================================================

// Ein Spieltag pro Stufe, ein Eintrag je Nutzer und Stufe.
//
// `getippt` ist NICHT „hat Punkte geholt": ein Spieltag mit null Punkten ist
// ein getippter Spieltag, und ein 0-Punkte-Tag muss vom gar nicht gespielten
// unterscheidbar bleiben — sonst zählt „drei Spieltage in Folge getippt" den
// Fehlgriff mit und die Streichresultate streichen den falschen Tag.
// Gemessen wird deshalb an `gewertet`, nicht an `total`.
export function punkteJeSpieltag(verlauf = []) {
  if (!Array.isArray(verlauf) || !verlauf.length) return [];
  const out = [];
  verlauf.forEach((stufe, i) => {
    const vorher = i > 0 ? (verlauf[i - 1].board ?? []) : [];
    const vorSumme = new Map(vorher.map((z) => [z.userId, z.total]));
    const vorGewertet = new Map(vorher.map((z) => [z.userId, z.gewertet ?? 0]));
    for (const z of stufe.board ?? []) {
      out.push({
        userId: z.userId,
        name: z.name ?? null,
        wettbewerb: stufe.wettbewerb ?? null,
        matchday: stufe.matchday,
        // Der Schlüssel, unter dem alle Aufrufer gruppieren. Mitgeliefert,
        // damit niemand ihn selbst zusammensetzt — `${wettbewerb}#${matchday}`
        // stand bisher an drei Stellen wörtlich da.
        key: `${stufe.wettbewerb ?? ""}#${stufe.matchday}`,
        punkte: (z.total ?? 0) - (vorSumme.get(z.userId) ?? 0),
        getippt: (z.gewertet ?? 0) > (vorGewertet.get(z.userId) ?? 0),
      });
    }
  });
  return out;
}

// Dieselbe Liste, nach Nutzer gebündelt und chronologisch — die Form, in der
// `applySaisonform` sie braucht.
export function proNutzer(liste = []) {
  const map = new Map();
  for (const e of liste) {
    if (!map.has(e.userId)) map.set(e.userId, []);
    map.get(e.userId).push(e);
  }
  return map;
}
