// ============================================================
//  DETERMINISTISCHER ZUFALL — eine Quelle
//
//  Gleiche Eingabe, gleicher Wert. Überall dort benutzt, wo eine Runde etwas
//  „auslost", das trotzdem für alle gleich und nachprüfbar sein muss: welche
//  Spieltage einen Joker tragen (`jokerPlan.js`), welcher Ersatz-Tipp bei
//  Versäumnis gezogen wird (`autoTip.js`), wen ein Ereignis trifft
//  (`auswahl.js`).
//
//  ⚠️ **Diese Funktion ist Spielstand, kein Hilfsmittel.** Ändert sich ihr
//  Ergebnis, verschieben sich rückwirkend die Joker-Spieltage jeder laufenden
//  Runde und die Ersatz-Tipps jeder vergangenen Abrechnung. Sie darf deshalb
//  NIE „verbessert" werden — ein Test friert konkrete Werte ein.
//
//  Warum sie hier steht: sie lag wortgleich in `jokerPlan.js` und
//  `autoTip.js`. Zwei Kopien einer Funktion, an der die Reproduzierbarkeit
//  hängt, sind zwei Wahrheiten, die auseinanderlaufen können — derselbe Fall
//  wie bei `saisonBoard.js`, wo genau das schon passiert war.
//
//  FNV-1a, bewusst simpel: von Hand nachrechenbar, wenn jemand eine Verteilung
//  anzweifelt. Das ist bei tausend Teilnehmern mehr wert als bessere
//  Streuungseigenschaften.
// ============================================================

export function seeded(text) {
  let h = 2166136261;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
