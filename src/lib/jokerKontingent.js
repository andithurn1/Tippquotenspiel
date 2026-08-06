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
import { auswerten } from "./ereignisse";

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
export function erspielteLage({ eintraege = [], alleEintraege = null, rules, spieltagsPunkte = null, schluessel = null } = {}) {
  return auswerten({
    eintraege, alleEintraege, ereignisse: rules?.ereignisse, spieltagsPunkte, schluessel,
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
function verbrauch({ tipps = [], plan, userId, wettbewerb = null }) {
  let zugeteilt = 0;
  let erspielt = 0;
  for (const t of tipps) {
    if (t?.joker !== true) continue;
    const md = t.matchday ?? null;
    const passt = t.wettbewerb == null || wettbewerb == null || t.wettbewerb === wettbewerb;
    if (passt && hatJoker(plan, userId, md)) zugeteilt++;
    else erspielt++;
  }
  return { zugeteilt, erspielt };
}

// ── Der Kontingent-Stand ────────────────────────────────────
// `bisSpieltag` grenzt ein, wie weit die Saison gelaufen ist; ohne Angabe zählt
// alles. `wettbewerb` sagt, auf welchen Wettbewerb sich der Plan bezieht —
// `jokerPlan` verteilt je Wettbewerb, nicht über alle hinweg.
export function kontingent({
  plan, gutschriften = [], tipps = [], userId, bisSpieltag = null, wettbewerb = null,
} = {}) {
  const planGesamt = plan && plan.modus !== "frei"
    ? (plan.proSpieler?.[userId] ?? plan.alle ?? []).filter(
        (md) => bisSpieltag === null || md <= bisSpieltag).length
    : null;   // null = unbegrenzt („frei": an jedem Spieltag einer)

  const erspieltGesamt = erspieltBis(gutschriften, bisSpieltag);
  const v = verbrauch({ tipps, plan, userId, wettbewerb });

  const zugeteiltOffen = planGesamt === null ? null : Math.max(0, planGesamt - v.zugeteilt);
  const erspieltOffen = Math.max(0, erspieltGesamt - v.erspielt);

  return {
    zugeteilt: { gesamt: planGesamt, verbraucht: v.zugeteilt, offen: zugeteiltOffen },
    erspielt: { gesamt: erspieltGesamt, verbraucht: v.erspielt, offen: erspieltOffen },
    offen: zugeteiltOffen === null ? null : zugeteiltOffen + erspieltOffen,
    unbegrenzt: planGesamt === null,
  };
}

// ── Darf ich HIER einen Joker setzen? ───────────────────────
// Gibt zusätzlich die QUELLE zurück, damit die Oberfläche sagen kann, woher er
// kommt — „du setzt einen erspielten Joker ein" ist eine andere Aussage als
// „heute ist dein Joker-Spieltag".
export function darfJokerSetzen({
  plan, gutschriften = [], tipps = [], userId, spieltag, wettbewerb = null,
} = {}) {
  const md = (spieltag && typeof spieltag === "object") ? spieltag.matchday : spieltag;
  const key = (spieltag && typeof spieltag === "object")
    ? spieltagKey(spieltag) : spieltagKey({ matchday: spieltag });

  // Schon einer an DIESEM Spieltag gesetzt? Dann ist die Frage beantwortet.
  const schonGesetzt = tipps.some((t) => t?.joker === true && spieltagKey(t) === key);
  if (schonGesetzt) {
    return { erlaubt: false, quelle: null, grund: "An diesem Spieltag hast du schon einen Joker gesetzt." };
  }

  const stand = kontingent({ plan, gutschriften, tipps, userId, wettbewerb });

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
