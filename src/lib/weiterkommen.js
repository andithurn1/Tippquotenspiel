// ============================================================
//  WEITERKOMMEN — der eigene Markt für K.-o.-Spiele (KO1)
//
//  Andi, 29.08.2026: „wir nehmen auch deinen Vorschlag: bei Finalspielen bzw
//  Rückspielen gibts noch die Tippmöglichkeit wer kommt weiter, und den
//  Hinweis bei den Quoten nach 90 Minuten (der ist bei Nicht-K.-o.-Spielen
//  nicht da)."
//
//  ── 🔴 Warum das ein EIGENER Markt ist und keine Regeländerung ──
//  Alle Quoten im Schnappschuss (`winner`, `margin`, `correctScore`,
//  `teamGoals`) beantworten die 90-MINUTEN-Frage. Würde die Verlängerung im
//  Ergebnis-Tipp mitzählen, würde ein 3:1 nach Verlängerung gegen ein Raster
//  bewertet, das für 90 Minuten gepreist wurde — die Auszahlung passte dann
//  nicht mehr zur Frage. Das ist keine Regelvariante, das wäre falsch
//  gerechnet.
//
//  Deshalb bleibt der Ergebnis-Tipp bei der regulären Spielzeit, und
//  „Weiterkommen" steht als eigener Markt DANEBEN — mit eigener Quote, wie
//  die Torschützen.
//
//  ── ⚠️ Die Falle, die nicht offensichtlich ist ──
//  „Weiterkommen" gehört zur PAARUNG, nicht zum Spiel: im Hin- und Rückspiel
//  entscheidet es sich über zwei Partien, und die App kennt nur Spiele.
//  Deshalb hängt der Tipp am RÜCKSPIEL — dort fällt die Entscheidung, und die
//  Quote steht dann mit dem Hinspielergebnis im Rücken. Alles andere hieße,
//  eine Ebene „Paarung" einzuführen.
//
//  🔴 **Ohne Elfmeterschießen gibt es diesen Markt nicht.** Andi will es
//  ausdrücklich „ohne Elfmeterschiessen … aber vllt sogar mit Verlängerung" —
//  und genau deshalb MUSS die Quote vom Buchmacher kommen: „wer kommt weiter"
//  schließt das Elfmeterschießen immer ein. Eine selbst gebastelte Quote für
//  „Weiterkommen ohne Elfmeter" gäbe es nirgends zu kaufen, und geschätzt
//  wäre sie eine erfundene Zahl in einer Wertung, die sonst nur Marktpreise
//  benutzt.
//
//  ⚠️ Fehlt die Quote im Schnappschuss, gibt es den Tipp für dieses Spiel
//  einfach nicht. Kein Rückfall, keine Schätzung.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { istKo, phaseVon } from "./wettbewerbe";

export const DEFAULT_WEITERKOMMEN = {
  enabled: false,
  // ⚠️ Der Anteil, mit dem der Gewinn in die Wertung eingeht — dieselbe
  // Bauart wie `markets.goals.gewicht`. 1 ist neutral.
  gewicht: 1,
};

export const WEITERKOMMEN_LIMITS = {
  gewicht: { min: 0.5, max: 3, step: 0.05 },
};

export function sanitizeWeiterkommen(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const g = Number(p.gewicht);
  const L = WEITERKOMMEN_LIMITS.gewicht;
  return {
    enabled: p.enabled === true,
    gewicht: Number.isFinite(g) ? Math.min(L.max, Math.max(L.min, g)) : DEFAULT_WEITERKOMMEN.gewicht,
  };
}

// ============================================================
//  Gibt es diesen Tipp für DIESES Spiel?
//
//  Drei Bedingungen, und alle drei müssen erfüllt sein:
//   1. die Runde hat den Markt eingeschaltet,
//   2. das Spiel ist ein K.-o.-Spiel (`istKo`),
//   3. der Schnappschuss trägt eine Quote dafür.
//
//  🔴 Punkt 3 ist der wichtigste. Ohne Marktquote gibt es den Tipp nicht —
//  eine geschätzte Quote wäre eine erfundene Zahl in einer Wertung, die sonst
//  ausschließlich Marktpreise benutzt.
// ============================================================
export function tippbar(match, snap, rules) {
  const cfg = sanitizeWeiterkommen(rules?.markets?.weiterkommen);
  if (!cfg.enabled) return false;
  if (!istKo(phaseVon(match))) return false;
  const q = snap?.qualify;
  return Boolean(q) && Number.isFinite(q.home) && Number.isFinite(q.away)
    && q.home > 1 && q.away > 1;
}

// ⚠️ Der Hinweis, den Andi ausdrücklich bestellt hat — und der bei
// Nicht-K.-o.-Spielen NICHT dasteht. Ein Satz „gilt nach 90 Minuten" an einem
// Bundesligaspiel erklärt nichts und macht nur misstrauisch: dort gibt es
// keine Verlängerung, über die man sich Gedanken machen müsste.
export function braucht90MinutenHinweis(match) {
  return istKo(phaseVon(match));
}

export const HINWEIS_90 = "Ergebnis-Tipp und Quoten gelten für die reguläre "
  + "Spielzeit (90 Minuten). Verlängerung und Elfmeterschießen zählen hier nicht mit.";

// ============================================================
//  Die Wertung
//
//  `weiter` ist die getippte Seite: "home" oder "away".
//  `echt.weiter` ist, wer wirklich weitergekommen ist.
//
//  ⚠️ Wie bei den Torschützen wird der GEWINN gezahlt (`q − 1`) und nicht die
//  Quote: der Einsatz ist der Tipp selbst, nicht eine Zahl, die jemand setzt.
//  Wer daneben liegt, bekommt nichts — kein Abzug. Der Ergebnis-Teil hat
//  dafür schon `wrongPenalty`; ein zweiter Abzug an derselben Partie wäre
//  eine doppelte Strafe für einen Tipp.
// ============================================================
export function scoreWeiterkommen(tip, echt, snap, rules) {
  const cfg = sanitizeWeiterkommen(rules?.markets?.weiterkommen);
  if (!cfg.enabled) return 0;
  const seite = tip?.weiter;
  if (seite !== "home" && seite !== "away") return 0;
  const echtSeite = echt?.weiter;
  if (echtSeite !== "home" && echtSeite !== "away") return 0;
  if (seite !== echtSeite) return 0;
  const q = snap?.qualify?.[seite];
  if (!Number.isFinite(q) || q <= 1) return 0;
  return (q - 1) * cfg.gewicht;
}
