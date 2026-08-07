// ============================================================
//  JOKER-KONTINGENT — die beiden Töpfe zu EINEM Vorrat zusammenführen
//
//  Es gibt zwei Quellen für Joker:
//    ZUGETEILT  — aus `jokerPlan.js`: der Admin stellt eine Frequenz ein,
//                 verteilt wird deterministisch auf bestimmte Spieltage.
//    ERSPIELT   — aus `ereignisse.js`: verdient durch Meilensteine oder
//                 Widerfahrnisse, gedeckelt durch `maxErspielt`.
//  Solange beide nebeneinander stehen, ist ein erspielter Joker nur eine Zahl
//  ohne Wirkung. Diese Datei macht daraus einen Vorrat, den man einsetzen kann.
//
//  ── Drei Entscheidungen, die den Unterschied machen ──
//
//  1. **Zugeteilte Joker sind an ihren Spieltag gebunden, erspielte nicht.**
//     Der Plan sagt, WANN es einen zugeteilten gibt — das ist sein Sinn. Ein
//     erspielter dagegen wird irgendwann gutgeschrieben, oft an einem Spieltag
//     ohne Plan-Joker; wäre er ebenso gebunden, verfiele er sofort und die
//     ganze Ereignis-Ebene wäre wertlos.
//
//  2. **Erspielte Joker wirken ab dem Spieltag, an dem sie verdient wurden —
//     nie rückwirkend.** Sonst könnte man einen später verdienten Joker auf
//     einen längst gespielten Spieltag legen und die Wertung nachträglich
//     ändern. Dieselbe Regel wie beim Quoten-Snapshot.
//
//  3. **Verbraucht wird ZUERST der zugeteilte Topf.** Wer an einem
//     Plan-Spieltag einen Joker setzt, verbraucht den, den er dort ohnehin hat
//     — nicht seinen mühsam erspielten. Andersherum wäre der erspielte Vorrat
//     nach zwei Spieltagen weg, ohne dass der Spieler je eine Wahl hatte.
//
//  Spieltage werden durchgängig über `spieltagKey` verglichen: seit es mehrere
//  Wettbewerbe gibt, ist eine nackte Zahl mehrdeutig.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { spieltagKey } from "./engine";
import { hatJoker } from "./jokerPlan";
import { auswerten, jackpotLage } from "./ereignisse";

// Alle erspielten Joker eines Nutzers, chronologisch — jede Gutschrift zählt
// mit ihrem Spieltag, ab dem sie einsetzbar ist.
// `schluessel` = `rundenSchluessel(achse)`, siehe `auswerten`. Ohne ihn zaehlt
// `ereignisse.js` in LIGA-Spieltagen — in einer Runde ueber fuenf Wettbewerbe
// waeren das fuenf Trost-Joker pro Woche statt einem.
export function erspielteJoker(args = {}) {
  return erspielteLage(args).gutschriften;
}

// 🔴 Dieselbe Rechnung, aber MIT dem, was NICHT gutgeschrieben wurde.
//
// `auswerten()` liefert neben den Gutschriften zwei Zahlen, die bisher
// niemand weitergereicht hat: `gebremst` (an einer Abklingzeit oder am
// Einzel-Deckel des Ereignisses hängengeblieben) und `verworfen` (am
// Gesamtdeckel `maxErspielt`). Ohne sie sieht ein Spieler, der seine Serie
// geschafft hat, einfach keinen Joker — und kann sich das nicht erklären.
//
// Das ist derselbe Fall wie bei den Streichresultaten im Ranking: was die
// Zahl verändert, bekommt einen Namen. Eine Belohnung, die stillschweigend
// ausfällt, liest sich wie ein Fehler.
// `rundenId` speist den `zufall`-Auslöser der WANN-Achse (`ausloeser.js`).
// ⚠️ Ohne ihn losen ALLE Runden dieselben Spieltage — deterministisch ist es
// so oder so, aber die Überraschung wäre für alle dieselbe. Wer diese
// Funktion aufruft und die Runden-Id hat, gibt sie mit.
// 🔴 Die WIE-LANGE-Achse braucht für ihren Jackpot eine Aussage über die ganze
// RUNDE („holt es niemand"), und die kann `auswerten` als Ein-Nutzer-Lauf nicht
// treffen. Sie wird hier vorgerechnet und mitgegeben — ohne diese Zeile stünde
// der Jackpot im Regelwerk, wäre einstellbar und bliebe für Joker folgenlos.
// `jackpotLage` liefert `null`, solange keiner eingestellt ist; der Durchlauf
// über alle Mitspieler kostet also nur dann etwas, wenn er gebraucht wird.
export function erspielteLage({
  eintraege = [], alleEintraege = null, rules, spieltagsPunkte = null,
  schluessel = null, rundenId = "",
} = {}) {
  const alle = alleEintraege ?? eintraege;
  return auswerten({
    eintraege, alleEintraege, ereignisse: rules?.ereignisse, spieltagsPunkte, schluessel, rundenId,
    jackpotLage: jackpotLage({
      alleEintraege: alle, ereignisse: rules?.ereignisse, spieltagsPunkte, schluessel, rundenId,
    }),
  });
}

// Wie viele erspielte Joker stehen an DIESEM Spieltag schon zur Verfügung?
// Alles, was bis einschließlich hier gutgeschrieben wurde (Regel 2).
function erspieltBis(gutschriften = [], bisSpieltag) {
  if (bisSpieltag === null || bisSpieltag === undefined) {
    return gutschriften.reduce((s, g) => s + (g.belohnung ?? 0), 0);
  }
  return gutschriften
    .filter((g) => (g.matchday ?? 0) <= bisSpieltag)
    .reduce((s, g) => s + (g.belohnung ?? 0), 0);
}

// Gesetzte Joker eines Nutzers, aufgeteilt nach Topf. Ein gesetzter Joker an
// einem Plan-Spieltag geht auf den zugeteilten Topf, sonst auf den erspielten
// (Regel 3).
// 🔴 `duell.kosten === "stattJoker"` zählt einen Duell-Einsatz wie einen
// gesetzten Joker. Bis 06.08.2026 stand die Einstellung im Regelwerk, wurde
// gesäubert, reiste im Creator-Code mit — und KEINE Zeile im Projekt fragte
// sie ab (gefunden über `npm run stufen` Teil 2, gemessen mit `greift`:
// bewegt nichts).
//
// Warum genau HIER und nicht im Duell-Modul: „kostet einen Joker" ist eine
// Aussage über den JOKER-VORRAT, nicht über die Duell-Wertung. Im Duell-Modul
// gerechnet gäbe es zwei Buchführungen über denselben Vorrat — die zweite
// Wahrheit, vor der die Runden-Schicht warnt.
//
// ⚠️ Es ist die stärkste Bremse des ganzen Bausteins: wer angreift, verzichtet
// auf die eigene Verstärkung. Ein Tipp, der BEIDES trägt (Joker gesetzt UND
// Duell), verbraucht dementsprechend zwei.
function verbrauch({ tipps = [], plan, userId, wettbewerb = null, duellKostetJoker = false }) {
  let zugeteilt = 0;
  let erspielt = 0;
  const zaehle = (t) => {
    const md = t.matchday ?? null;
    const passt = t.wettbewerb == null || wettbewerb == null || t.wettbewerb === wettbewerb;
    if (passt && hatJoker(plan, userId, md)) zugeteilt++;
    else erspielt++;
  };
  for (const t of tipps) {
    if (t?.joker === true) zaehle(t);
    // Ein Duell-Einsatz DESSELBEN Spielers. `tipps` ist bereits auf ihn
    // gefiltert (siehe `kontingent`), der Absender steht also fest.
    if (duellKostetJoker && t?.duell?.auf != null) zaehle(t);
  }
  return { zugeteilt, erspielt };
}

// ── Der Kontingent-Stand ────────────────────────────────────
// `bisSpieltag` grenzt ein, wie weit die Saison gelaufen ist; ohne Angabe zählt
// alles. `wettbewerb` sagt, auf welchen Wettbewerb sich der Plan bezieht —
// `jokerPlan` verteilt je Wettbewerb, nicht über alle hinweg.
// `duell` (optional) ist `rules.duell` — nur `kosten: "stattJoker"` wird
// daraus gelesen. Ohne den Parameter zählt ein Duell-Einsatz nichts, das
// Verhalten bleibt also unverändert; kein stiller Regelwechsel für Aufrufer,
// die ihn noch nicht mitgeben.
export function kontingent({
  plan, gutschriften = [], tipps = [], userId, bisSpieltag = null, wettbewerb = null, duell = null,
} = {}) {
  const planGesamt = plan && plan.modus !== "frei"
    ? (plan.proSpieler?.[userId] ?? plan.alle ?? []).filter(
        (md) => bisSpieltag === null || md <= bisSpieltag).length
    : null;   // null = unbegrenzt („frei": an jedem Spieltag einer)

  const erspieltGesamt = erspieltBis(gutschriften, bisSpieltag);
  const v = verbrauch({
    tipps, plan, userId, wettbewerb,
    duellKostetJoker: duell?.enabled === true && duell?.kosten === "stattJoker",
  });

  const zugeteiltOffen = planGesamt === null ? null : Math.max(0, planGesamt - v.zugeteilt);
  const erspieltOffen = Math.max(0, erspieltGesamt - v.erspielt);

  // 🔴 ÜBERZOGEN — was mehr verbraucht wurde, als da war.
  //
  // Gemessen am 06.08.2026, direkt nachdem `kosten: "stattJoker"` angeschlossen
  // war: ein Duell-Einsatz an einem Spieltag OHNE Plan-Joker erhöhte
  // `erspielt.verbraucht` auf 3, während `erspielt.gesamt` bei 0 stand — und
  // `Math.max(0, …)` schluckte die Differenz. `offen` blieb bei 5, die Bremse
  // war also messbar wirkungslos: „kostet einen Joker" kostete nichts.
  //
  // Ein `Math.max(0, …)` ist immer eine Aussage („weniger als leer gibt es
  // nicht") und fast immer auch ein Deckmantel. Hier heißt die ehrliche Zahl
  // ÜBERZOGEN: der Vorrat ist leer UND es wurde schon mehr gesetzt. Sie wird
  // gemeldet statt weggerechnet — `darfDuellSetzen` liest sie, und die
  // Oberfläche kann sie benennen.
  const ueberzogenZugeteilt = planGesamt === null ? 0 : Math.max(0, v.zugeteilt - planGesamt);
  const ueberzogenErspielt = Math.max(0, v.erspielt - erspieltGesamt);

  return {
    zugeteilt: {
      gesamt: planGesamt, verbraucht: v.zugeteilt, offen: zugeteiltOffen,
      ueberzogen: ueberzogenZugeteilt,
    },
    erspielt: {
      gesamt: erspieltGesamt, verbraucht: v.erspielt, offen: erspieltOffen,
      ueberzogen: ueberzogenErspielt,
    },
    offen: zugeteiltOffen === null ? null : zugeteiltOffen + erspieltOffen,
    ueberzogen: ueberzogenZugeteilt + ueberzogenErspielt,
    unbegrenzt: planGesamt === null,
  };
}

// ── Darf ich HIER einen Joker setzen? ───────────────────────
// Gibt zusätzlich die QUELLE zurück, damit die Oberfläche sagen kann, woher er
// kommt — „du setzt einen erspielten Joker ein" ist eine andere Aussage als
// „heute ist dein Joker-Spieltag".
export function darfJokerSetzen({
  plan, gutschriften = [], tipps = [], userId, spieltag, wettbewerb = null, duell = null,
} = {}) {
  const md = (spieltag && typeof spieltag === "object") ? spieltag.matchday : spieltag;
  const key = (spieltag && typeof spieltag === "object")
    ? spieltagKey(spieltag) : spieltagKey({ matchday: spieltag });

  // Schon einer an DIESEM Spieltag gesetzt? Dann ist die Frage beantwortet.
  const schonGesetzt = tipps.some((t) => t?.joker === true && spieltagKey(t) === key);
  if (schonGesetzt) {
    return { erlaubt: false, quelle: null, grund: "An diesem Spieltag hast du schon einen Joker gesetzt." };
  }

  const stand = kontingent({ plan, gutschriften, tipps, userId, wettbewerb, duell });

  // Plan-Spieltag: der zugeteilte Topf greift.
  if (!plan || plan.modus === "frei" || hatJoker(plan, userId, md)) {
    return { erlaubt: true, quelle: "zugeteilt", grund: "Heute ist einer deiner Joker-Spieltage." };
  }
  // Sonst nur aus dem erspielten Vorrat — und nur, wenn schon etwas drin ist.
  const verfuegbar = Math.max(0, erspieltBis(gutschriften, md) - stand.erspielt.verbraucht);
  if (verfuegbar > 0) {
    return {
      erlaubt: true, quelle: "erspielt",
      grund: `Kein Joker-Spieltag — du setzt einen erspielten ein (noch ${verfuegbar}).`,
    };
  }
  return {
    erlaubt: false, quelle: null,
    grund: "Heute ist kein Joker-Spieltag, und du hast keinen erspielten übrig.",
  };
}

// ── Darf ich HIER ein Duell setzen? ─────────────────────────
// 🔴 Die Gegenstück-Frage zu `darfJokerSetzen`, und der Grund, warum
// `kosten: "stattJoker"` überhaupt etwas bremst.
//
// Ohne diese Prüfung war die Einstellung eine reine Buchungszeile: der Einsatz
// wurde gezählt, der Vorrat rutschte ins Minus, und `Math.max(0, …)` machte
// daraus eine Null (siehe `ueberzogen` oben). Wer angreifen wollte, konnte
// immer angreifen — die stärkste Bremse des Bausteins bremste nichts.
//
// Die Antwort trägt eine QUELLE wie bei `darfJokerSetzen`: „das kostet deinen
// Joker für diesen Spieltag" ist eine andere Nachricht als „das kostet einen
// erspielten". Bei `kosten: "frei"` (Vorgabe) ist die Antwort immer ja — das
// Duell hat dann sein eigenes Kontingent aus `duellPlan`, und dieser Vorrat
// hier geht es nichts an.
//
// ⚠️ NICHT geprüft wird hier das Duell-eigene Kontingent (`anzahl`, Fenster,
// `proSpieltag`) — das steht in `duellPlan`. Zwei Fragen, zwei Stellen.
export function darfDuellSetzen({
  plan, gutschriften = [], tipps = [], userId, spieltag, wettbewerb = null, duell = null,
} = {}) {
  if (duell?.enabled !== true || duell?.kosten !== "stattJoker") {
    return { erlaubt: true, quelle: null, grund: "Ein Duell-Einsatz kostet in dieser Runde keinen Joker." };
  }

  const md = (spieltag && typeof spieltag === "object") ? spieltag.matchday : spieltag;
  const key = (spieltag && typeof spieltag === "object")
    ? spieltagKey(spieltag) : spieltagKey({ matchday: spieltag });

  // Der zugeteilte Joker eines Spieltags ist GENAU EINER. Ist er dort schon
  // vergeben — an einen Joker oder an ein früheres Duell —, muss der Einsatz
  // aus dem erspielten Vorrat kommen.
  const belegt = tipps.some((t) => spieltagKey(t) === key
    && (t?.joker === true || t?.duell?.auf != null));

  const stand = kontingent({ plan, gutschriften, tipps, userId, wettbewerb, duell });

  if (!belegt && (!plan || plan.modus === "frei" || hatJoker(plan, userId, md))) {
    return {
      erlaubt: true, quelle: "zugeteilt",
      grund: "Der Einsatz kostet dich deinen Joker für diesen Spieltag.",
    };
  }

  const verfuegbar = Math.max(0, erspieltBis(gutschriften, md) - stand.erspielt.verbraucht);
  if (verfuegbar > 0) {
    return {
      erlaubt: true, quelle: "erspielt",
      grund: `Der Einsatz kostet einen erspielten Joker (noch ${verfuegbar}).`,
    };
  }
  return {
    erlaubt: false, quelle: null,
    grund: belegt
      ? "Dein Joker für diesen Spieltag ist schon vergeben, und du hast keinen erspielten übrig."
      : "Ein Duell kostet einen Joker — und du hast keinen übrig.",
  };
}

// Ein Satz für die Oberfläche. Bewusst als FORTSCHRITT — im Modus `kontingent`
// haben Spieler mitten in der Saison zwangsläufig unterschiedlich viele Joker
// gehabt, und eine nackte Zahl sähe nach Bevorzugung aus.
export function standText(stand) {
  if (!stand) return "";
  if (stand.unbegrenzt) {
    return stand.erspielt.gesamt > 0
      ? `An jedem Spieltag ein Joker · ${stand.erspielt.offen} erspielte extra`
      : "An jedem Spieltag ein Joker";
  }
  const teile = [`${stand.zugeteilt.verbraucht} von ${stand.zugeteilt.gesamt} verbraucht`];
  if (stand.erspielt.gesamt > 0) {
    teile.push(`${stand.erspielt.offen} von ${stand.erspielt.gesamt} erspielten übrig`);
  }
  return teile.join(" · ");
}
