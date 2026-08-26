// ============================================================
//  PERSÖNLICHE SPERREN — was ein Ereignis (und später ein Joker) zuhält
//
//  🔴 Andi, 26.08.2026: „mach generell solche mechaniken auch als Ereignis
//  verfügbar und als Joker (oder gibts da Bedenken dass es nicht aufgeht)".
//
//  ── Was diese Datei ist ──
//  Die eine Übersetzung zwischen zwei Welten, die sich sonst nicht kennen:
//
//    `wirkung.js` sagt, WAS jemandem widerfährt — als flacher Vorgang
//    `{ userId, joker, punkte, faktor, sperre, matchday, … }`.
//    `favoritenSperre.js` sagt, WAS wählbar ist — aus Schnappschuss + Regelwerk.
//
//  Dazwischen fehlte die Frage „gilt für MICH an DIESEM Spieltag etwas
//  Zusätzliches?". Sie steht hier, an EINER Stelle, damit kein Screen sie
//  selbst beantwortet (Runden-Schicht, CLAUDE.md).
//
//  ── 🔴 Die Bedenken, nach denen Andi ausdrücklich gefragt hat ──
//  Drei, und sie sind der Grund für den Zuschnitt dieser Datei:
//
//  1. **Rückwirkend geht nicht.** Eine Sperre, die einen Spieltag trifft, an
//     dem schon getippt wurde, macht abgegebene Tipps nachträglich ungültig —
//     dieselbe Falle wie beim Quoten-Schnappschuss. Deshalb greift sie nur an
//     Spieltagen, die noch nicht getippt sind; `giltFuer` prüft das über den
//     Spieltag, nicht über die Uhrzeit.
//  2. **Sie darf nie den letzten Ausweg nehmen.** Runden-Sperre und
//     persönliche Sperre addieren sich, und zwei Mechaniken, die einzeln
//     harmlos sind, ergeben zusammen ein Spiel ohne wählbaren Tipp. Die
//     Sicherung liegt deshalb NICHT hier, sondern in `favoritenSperre.js`
//     (`mindestensOffen`, zweiter Durchgang über die noch offenen Optionen) —
//     eine zweite Sicherung an dieser Stelle wäre eine zweite Wahrheit.
//  3. **Sie verrechnet nichts.** Der Vorgang bleibt in `joker`, `punkte` und
//     `faktor` neutral. Damit fällt die ganze Mechanik nicht unter Balancing:
//     sie verschiebt die Auswahl, nicht die Punkte.
//
//  Reine Funktionen, UI-frei.
// ============================================================

// Ein leerer Eingriff ist `null` und nicht `{ schuetzen: 0, ergebnisse: 0 }`:
// die Aufrufer prüfen auf „gibt es einen", und ein Objekt voller Nullen wäre
// dabei wahr.
// ⚠️ Nicht exportiert: von außen prüft man auf „falsy", und ein zweiter Name
// für `null` wäre ein Export, den außer den Tests niemand aufruft.
const KEIN_EINGRIFF = null;

// ── Gilt dieser Vorgang für mich, hier, jetzt? ──────────────
// `matchday` ist der RUNDEN-Spieltag (zeitachse.js) — nicht der Liga-Spieltag.
// Über fünf Wettbewerbe gibt es „Spieltag 5" fünfmal, und eine Sperre träfe
// dann fünf Spieltage statt einen (CLAUDE.md, die vier Fragen).
function giltFuer(vorgang, userId, matchday) {
  if (!vorgang?.sperre || vorgang.userId !== userId) return false;
  // Ohne Spieltag am Vorgang gilt er überall — so entstehen keine stummen
  // Sperren, wenn eine Quelle das Feld nicht mitliefert.
  if (vorgang.matchday === null || vorgang.matchday === undefined) return true;
  if (matchday === null || matchday === undefined) return false;
  return Number(vorgang.matchday) === Number(matchday);
}

// ── Alle meine Sperren dieses Spieltags, zusammengefasst ────
// Mehrere Ereignisse am selben Spieltag ADDIEREN sich. Das ist die
// unangenehmere der beiden Möglichkeiten (die andere wäre „das strengste
// gewinnt"), aber die ehrlichere: zwei Ereignisse, die beide je einen
// Torschützen sperren, sollen zwei sperren. Wer das nicht will, stellt weniger
// Ereignisse scharf — und `mindestensOffen` fängt den Extremfall ohnehin ab.
export function sperrenFuer(vorgaenge = [], { userId = null, matchday = null } = {}) {
  if (!userId || !Array.isArray(vorgaenge)) return KEIN_EINGRIFF;
  let schuetzen = 0;
  let ergebnisse = 0;
  const gruende = [];
  for (const v of vorgaenge) {
    if (!giltFuer(v, userId, matchday)) continue;
    schuetzen += Math.max(0, Number(v.sperre.schuetzen) || 0);
    ergebnisse += Math.max(0, Number(v.sperre.ergebnisse) || 0);
    if (v.ereignisText && !gruende.includes(v.ereignisText)) gruende.push(v.ereignisText);
  }
  if (!schuetzen && !ergebnisse) return KEIN_EINGRIFF;
  return { schuetzen, ergebnisse, gruende };
}

// ── Ein Satz für die Tippabgabe ─────────────────────────────
// ⚠️ Er nennt den ANLASS, nicht nur die Zahl. „Ein Torschütze weniger" ohne
// das „weil" ist die Sorte Meldung, die man für einen Fehler hält — genau
// deshalb trägt schon jede einzelne Sperre ihren Grund.
export function beschreibeEingriff(eingriff) {
  if (!eingriff) return "";
  const teile = [];
  if (eingriff.schuetzen) {
    teile.push(`${eingriff.schuetzen} Torschütze${eingriff.schuetzen === 1 ? "" : "n"}`);
  }
  if (eingriff.ergebnisse) {
    teile.push(`${eingriff.ergebnisse} Ergebnis${eingriff.ergebnisse === 1 ? "" : "se"}`);
  }
  const anlass = eingriff.gruende?.length ? ` (${eingriff.gruende.join(", ")})` : "";
  return `Für dich an diesem Spieltag zusätzlich gesperrt: ${teile.join(" und ")}${anlass}.`;
}
