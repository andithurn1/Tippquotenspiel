// ============================================================
//  VERSÄUMNIS AUFS BOARD — Geschwister von `saisonBoard.js` und
//  `drehradBoard.js`, und derselbe Zweck: EINE Stelle, die beide Stores
//  aufrufen, statt zweimal leicht verschieden verkabelt.
//
//  🔴 Der Befund vom 06.08.2026: `autoTip.js` war fertig gebaut, getestet und
//  über die Profi-Oberfläche einstellbar (Strategie, Malus, Höchstzahl pro
//  Saison) — und `autoTipsFor` wurde von NIEMANDEM aufgerufen. Der Admin
//  konnte die Kulanz einschalten und es passierte nichts. Importiert waren aus
//  dem Modul nur die LABELS, für die Regler.
//
//  Genau der Fall, den der Baukasten-Grundsatz ausschließt: „eine Einstellung,
//  die ins Leere läuft, ist kein Baukastenteil."
//
//  ── Zwei Entwurfs-Entscheidungen ──
//
//  1) **Es wird NICHTS gespeichert, es wird gerechnet.** Wie beim Glücksrad
//     (`drehradBoard.js`): `buildAutoTip` ist deterministisch über
//     `${matchId}-${userId}`, der Snapshot ist beim Anpfiff eingefroren, das
//     Ergebnis steht fest. Ein zweiter Aufruf liefert denselben Ersatz-Tipp.
//     Eine Ablage bräuchte einen Schreibpfad, einen Zeitpunkt und eine
//     Aufräumregel — und könnte auseinanderlaufen.
//
//  2) **Ein Versäumnis entsteht erst mit dem ANPFIFF.** Vorher ist es kein
//     Versäumnis, sondern ein offenes Tipp-Fenster. Gerechnet wird deshalb nur
//     über Spiele, die angepfiffen sind UND ein Ergebnis tragen — sonst
//     bekäme jemand mitten in der Woche einen Ersatz-Tipp für ein Spiel, das
//     er noch abgeben will.
//
//  ⚠️ Der Ersatz-Tipp zählt NICHT als eigener Tipp im Sinne der
//  5.0-Invariante („kein Joker ohne Tipp", `jokerBasis.js`). Er trägt deshalb
//  `ersatz: true`, und wer Tipps zählt, filtert danach.
// ============================================================

import { autoTipsFor, sanitizeVersaeumnis } from "./autoTip";
import { wettbewerbVon } from "./wettbewerbe";

const zeit = (m) => new Date(m?.kickoff ?? 0).getTime();

// Die Ersatz-Tipps aller Spieler als fertige Wertungs-Einträge.
//
//   matches   Spiele DIESER Runde (mit `snapshot` und `result`)
//   tips      rohe Tipps der Runde (`listTips`)
//   rules     Regelwerk der Runde
//   userIds   wer überhaupt mitspielt (Mitglieder, nicht nur wer getippt hat)
//   nameOf    userId → Anzeigename
//   jetzt     Zeitpunkt (nur angepfiffene Spiele zählen)
//
// Rückgabe: dieselbe Form wie `eintragVon` in den Stores, plus
// `{ ersatz: true, malusFaktor }`.
export function ersatzEintraege({
  matches = [], tips = [], rules = {}, userIds = [], nameOf = (id) => id,
  jetzt = Date.now(),
} = {}) {
  const v = sanitizeVersaeumnis(rules?.versaeumnis);
  if (!v.enabled || !userIds.length) return [];

  // Nur was schon gelaufen UND ausgewertet ist. Chronologisch, weil das
  // Saison-Kontingent in der Reihenfolge greift, in der versäumt wurde —
  // sonst hinge es davon ab, wie der Katalog sortiert ist.
  const gelaufen = matches
    .filter((m) => m.result && m.snapshot && zeit(m) <= jetzt)
    .sort((a, b) => zeit(a) - zeit(b));
  if (!gelaufen.length) return [];

  const out = [];
  for (const userId of userIds) {
    let genutzt = 0;
    for (const m of gelaufen) {
      // ⚠️ Spiel für Spiel, nicht alle auf einmal: `autoTipsFor` verwirft ab
      // dem Kontingent-Limit ALLES, und ob das Limit greift, hängt davon ab,
      // wie viele Versäumnisse VORHER lagen. Ein einziger Aufruf über die
      // ganze Saison könnte das nicht chronologisch abbilden.
      const [ersatz] = autoTipsFor({
        matches: [m], tips, userId, rules, versaeumnis: v, bisherGenutzt: genutzt,
      });
      if (!ersatz) continue;
      genutzt += 1;
      out.push({
        userId, name: nameOf(userId),
        tip: ersatz.tip, snapshot: ersatz.snapshot, result: m.result,
        matchday: m.matchday ?? null,
        wettbewerb: wettbewerbVon(m),
        kickoff: m.kickoff ?? null,
        matchId: m.id ?? m.matchId,
        // Der Malus gehört an die Wertung DIESES Tipps (siehe `autoTip.js`).
        malusFaktor: ersatz.malusFaktor,
        // Kein echter Tipp — wer Tipps zählt, filtert danach.
        ersatz: true,
      });
    }
  }
  return out;
}

// Wie oft hat die Kulanz je Spieler gegriffen? Für die Anzeige: „2 von 3
// Ersatz-Tipps verbraucht" ist die Zahl, die ein Spieler sucht — eine nackte
// Liste beantwortet die Frage nicht.
export function ersatzStand(eintraege = [], rules = {}) {
  const v = sanitizeVersaeumnis(rules?.versaeumnis);
  const proSpieler = new Map();
  for (const e of eintraege) {
    if (!e?.ersatz) continue;
    proSpieler.set(e.userId, (proSpieler.get(e.userId) ?? 0) + 1);
  }
  return {
    maxProSaison: v.maxProSaison,
    malusProzent: v.malusProzent,
    proSpieler: Object.fromEntries(proSpieler),
  };
}
