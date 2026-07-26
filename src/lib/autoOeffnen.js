// ============================================================
//  AUTO-ÖFFNEN — welcher Spieltag muss JETZT eingefroren werden?
//
//  `spieltagOeffnen.js` beantwortet WAS eingefroren wird. Diese Datei
//  beantwortet WANN — und zwar so, dass niemand den Moment mehr wählt.
//
//  ── Warum es die Automatik braucht ──
//  Bisher hing das Einfrieren an einem Admin-Knopf in der Spielwahl. Vergisst
//  der Admin ihn, gibt es kein Topspiel — die Funktion verpufft still, ohne
//  Fehler und ohne Hinweis. Genau das hat Account 1 beim Bauen der Anzeige
//  angemerkt und als Betriebs-Frage weitergereicht.
//
//  ── Der Zeitpunkt ist eine FAIRNESS-Frage, keine Bequemlichkeit ──
//  Der Spannungswert hängt am Tabellenstand im Moment des Öffnens. Wer den
//  Moment wählt, wählt also mit. Ein fester, für alle gleicher Auslöser nimmt
//  diese Wahl aus dem Spiel — das ist der eigentliche Gewinn gegenüber dem
//  Knopf, nicht die Bequemlichkeit.
//
//  ── Eingefroren wird, BEVOR irgendwer tippen kann ──
//  Ein Tipp darf nie nachträglich mehr wert werden. `matches` ist global,
//  dieselbe Begegnung gehört zu vielen Runden — und jede Runde hat ihren
//  eigenen Vorlauf (`rules.tippfenster.vorlaufStunden`, 1 Stunde bis 30 Tage).
//  Maßgeblich ist deshalb der GRÖSSTE Vorlauf aller Runden: sobald für die
//  früheste Runde das Fenster aufgeht, muss der Wert stehen.
//
//  Bewusst NICHT die theoretische Obergrenze (720 h) für alle: dann fröre man
//  30 Tage im Voraus ein, und der Tabellenstand wäre alt. Gerechnet wird mit
//  dem, was tatsächlich eingestellt ist — meist der Standard von einer Woche.
//
//  ── Ein verpasster Spieltag bleibt verpasst ──
//  Hat das erste Spiel schon angepfiffen, wird NICHT mehr geöffnet. Nachträglich
//  einzufrieren wäre schlimmer als gar nicht: bereits abgegebene Tipps bekämen
//  rückwirkend einen anderen Wert. Dieselbe Kante wie beim Admin-Knopf, der
//  ebenfalls verschwindet, sobald etwas angepfiffen ist.
//
//  Reine Funktionen, UI-frei, kein I/O — `jetzt` ist immer ein Parameter.
// ============================================================

import { sanitizeTippfenster, DEFAULT_TIPPFENSTER } from "./tippfenster";
import { istGeoeffnet } from "./spieltagOeffnen";
import { spieltagKey } from "./spieltag";

const anpfiff = (m) => {
  const t = new Date(m?.kickoff ?? m?.snapshot?.kickoff ?? NaN).getTime();
  return Number.isFinite(t) ? t : null;
};

// Der größte Vorlauf, den irgendeine Runde eingestellt hat. Ohne Runden (oder
// ohne verwertbare Regelwerke) gilt der Standard — nicht 0, sonst würde nie
// etwas geöffnet.
export function maxVorlaufStunden(rounds = []) {
  let max = 0;
  for (const r of rounds) {
    const { vorlaufStunden } = sanitizeTippfenster(r?.rules?.tippfenster);
    if (vorlaufStunden > max) max = vorlaufStunden;
  }
  return max > 0 ? max : DEFAULT_TIPPFENSTER.vorlaufStunden;
}

// Die Spieltage, die jetzt fällig sind. Ein Spieltag ist erst mit dem
// WETTBEWERB eindeutig — quer über Wettbewerbe zu öffnen käme sonst auf 36
// statt 18 Spiele und mischte zwei Tabellen (derselbe Fund wie im Mock).
//
// Rückgabe: [{ wettbewerb, matchday, ersterAnpfiff, spiele }] — nach Anpfiff
// sortiert, das dringendste zuerst.
export function faelligeSpieltage({ matches = [], vorlaufStunden, jetzt = Date.now() } = {}) {
  const vorlauf = Number.isFinite(vorlaufStunden)
    ? vorlaufStunden : DEFAULT_TIPPFENSTER.vorlaufStunden;
  const fenster = vorlauf * 3600_000;

  const gruppen = new Map();
  for (const m of matches) {
    if (m?.matchday == null) continue;
    const key = spieltagKey(m);
    if (!gruppen.has(key)) {
      gruppen.set(key, { wettbewerb: m.wettbewerb ?? null, matchday: m.matchday, spiele: [] });
    }
    gruppen.get(key).spiele.push(m);
  }

  const faellig = [];
  for (const g of gruppen.values()) {
    // Schon eingefroren → nichts zu tun (das Öffnen selbst ist zusätzlich
    // idempotent, aber so sparen wir den Schreibzugriff).
    if (istGeoeffnet(g.spiele)) continue;

    const zeiten = g.spiele.map(anpfiff).filter((t) => t !== null);
    if (!zeiten.length) continue;              // ohne Termin: im Zweifel nichts tun
    const erster = Math.min(...zeiten);

    if (jetzt >= erster) continue;             // zu spät — siehe Kopf
    if (erster - jetzt > fenster) continue;    // noch zu früh

    faellig.push({ ...g, ersterAnpfiff: erster });
  }

  return faellig.sort((a, b) => a.ersterAnpfiff - b.ersterAnpfiff);
}
