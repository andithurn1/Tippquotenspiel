// ============================================================
//  MEHRFACH-TIPP — ein Handgriff, mehrere Tipprunden
//
//  Andi, 29.08.2026:
//    „wenn man in mehreren Tipprunden gleichzeitig drin ist, dass bei den
//     Spielen wo sie sich überschneiden diese Tippabgaben für alle Tipprunden
//     eingetragen werden (dennoch kann die Option in der Tippabgabe
//     Wischfenster mit nem Schalter unter dem Spielstand bzw wenn mit
//     Torschützen ist dann unter Torschützen weg ist) … den Schalter kann man
//     im Anzeigehauptmenü auch entfernen bzw diese Einstellung auch abändern,
//     sodass jede Tipprunde einzeln betippt wird auch wenns die gleichen
//     Spiele sind"
//
//  ── 🔴 Das Schwierige ist nicht das Kopieren ──
//  Ein Tipp ist kein Wert, den man überall hinschreiben kann. Jede Runde hat
//  ihr EIGENES Regelwerk, und derselbe Tipp kann dort schlicht unzulässig
//  sein:
//
//   · Das Tipp-Fenster ist anders eingestellt — in Runde A schon offen, in
//     Runde B noch zu oder längst geschlossen.
//   · Die Torschützen-Märkte stehen anders: zwei Namen je Mannschaft passen
//     nicht in eine Runde, die nur einen zulässt.
//   · Die Favoriten-Sperre greift dort auf einen Namen, den man hier wählen
//     durfte.
//
//  ⚠️ **Deshalb wird nie stillschweigend zurechtgeschnitten.** Ein Tipp, der
//  in der Zielrunde nicht in dieser Form gilt, wird dort NICHT gesetzt, und
//  der Grund wird benannt. Ein halb übertragener Tipp wäre die schlimmste der
//  drei Möglichkeiten: man hält ihn für abgegeben und er ist es nicht, oder er
//  steht anders da, als man ihn gemeint hat.
//
//  ── ⚠️ Was diese Datei NICHT tut ──
//  Sie schreibt nichts. Sie entscheidet nur, WOHIN geschrieben werden darf und
//  WARUM nicht. Das Schreiben macht der Aufrufer über `store.saveTip` — und
//  zwar je Runde einzeln, damit die dortigen Prüfungen (Tipp-Fenster,
//  Duell-Regeln) wirklich laufen. `saveTip` ist die letzte Instanz, nicht
//  diese Datei; hier steht die Vorschau, damit man vorher sieht, was passiert.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { tippStatus } from "./tippfenster";
import { istSchuetzeGesperrt } from "./favoritenSperre";

// „alle" = überall eintragen, wo es geht. „einzeln" = jede Runde für sich.
export const MEHRFACH_MODI = ["alle", "einzeln"];
export const DEFAULT_MEHRFACH = "alle";

export function sanitizeMehrfach(wert) {
  return MEHRFACH_MODI.includes(wert) ? wert : DEFAULT_MEHRFACH;
}

// Alle Namen aus einem Tipp, ohne Rücksicht auf die Seite. `proSpiel` legt
// beide Seiten ohnehin in einen Topf (siehe `scoreGoals`), deshalb braucht es
// beide Zählweisen.
function namenVon(tip) {
  const heim = (tip?.goals?.home ?? []).filter(Boolean);
  const gast = (tip?.goals?.away ?? []).filter(Boolean);
  return { heim, gast, alle: [...heim, ...gast] };
}

// ── Passt DIESER Tipp in DIESES Regelwerk? ──────────────────
//
// 🔴 Die Frage ist enger als „ist der Tipp gültig". Sie lautet: würde er in
// der Zielrunde DASSELBE bedeuten? Ein Tipp, der dort zurechtgestutzt werden
// müsste, gilt als nicht übertragbar — lieber gar nicht als anders.
export function passtInsRegelwerk(tip, rules, snap = null) {
  const g = rules?.markets?.goals ?? {};
  const { heim, gast, alle } = namenVon(tip);

  // Ohne Torschützen im Tipp ist die Frage beantwortet: das Ergebnis passt
  // immer, es ist überall dieselbe Zahl.
  if (!alle.length) return { passt: true, grund: null };

  // ⚠️ Torschützen dort ausgeschaltet: das Ergebnis ließe sich übertragen,
  // die Namen nicht. Das ist KEIN Hindernis — es ist eine Kürzung, und die
  // wird gemeldet statt still gemacht.
  if (!g.enabled) {
    return { passt: false, grund: "dort ohne Torschützen — der Tipp würde anders zählen" };
  }

  if (g.modus === "proSpiel") {
    const erlaubt = g.picksProSpiel ?? 0;
    if (alle.length > erlaubt) {
      return { passt: false, grund: `dort nur ${erlaubt} Torschützen je Spiel, dein Tipp hat ${alle.length}` };
    }
  } else {
    const erlaubt = g.picksPerTeam ?? 0;
    const zuViel = Math.max(heim.length, gast.length);
    if (zuViel > erlaubt) {
      return { passt: false, grund: `dort nur ${erlaubt} Torschützen je Mannschaft, dein Tipp hat ${zuViel}` };
    }
    // 🔴 Aus `proSpiel` heraus können alle Namen auf EINER Seite stehen —
    // in `proTeam` wäre das ein Tipp, den man dort nie hätte abgeben können.
    if (!heim.length || !gast.length) {
      const leer = heim.length ? "Gast" : "Heim";
      return { passt: false, grund: `dort je Mannschaft getippt — für ${leer} fehlt ein Name` };
    }
  }

  // Die Favoriten-Sperre ist je Runde eingestellt: ein Name, der hier frei
  // war, kann dort gesperrt sein.
  if (snap) {
    for (const name of alle) {
      if (istSchuetzeGesperrt(snap, rules, name, null).gesperrt) {
        return { passt: false, grund: `${name} ist dort gesperrt` };
      }
    }
  }

  return { passt: true, grund: null };
}

// ── 🔴 NICHT NUR ABSAGEN — anpassen lassen ──────────────────
//
// Andi, 29.08.2026, direkt nachdem er die Funktion bestellt hatte:
//   „gut wenn s iwo ne ungültigkeit gibt, gibts nen hinweis dass der eben doch
//    angepasst werden muss bzw. kriegt man dann die option direkt bei der
//    anderen Tipprunde des einzustellen, sodass man maximal wenig wiederholen
//    muss"
//
// Genau deshalb liefert jede unpassende Runde einen VORSCHLAG mit: alles, was
// dort schon zulässig ist, steht drin — offen bleibt nur, was wirklich
// entschieden werden muss. Das Ergebnis wandert immer mit; es ist überall
// dieselbe Zahl.
//
// ⚠️ Der Vorschlag wird NICHT gespeichert. Er ist eine Vorbelegung, kein
// stiller Tipp — sonst wäre genau das passiert, was der Kopf dieser Datei
// ausschließt: ein Tipp, der anders dasteht, als man ihn gemeint hat.
//
// `fehlt` sagt, wie viele Namen der Nutzer dort noch setzen muss. Ist es 0,
// war die Anpassung reines Weglassen und er muss nur bestätigen.
export function anpassung(tip, rules, snap = null) {
  const g = rules?.markets?.goals ?? {};
  const ergebnis = { home: tip?.home, away: tip?.away };
  if (!g.enabled) {
    return { vorschlag: { ...ergebnis, goals: { home: [], away: [] } }, fehlt: 0 };
  }

  const gesperrt = (name) => Boolean(snap) && istSchuetzeGesperrt(snap, rules, name, null).gesperrt;
  const frei = (liste) => (liste ?? []).filter((n) => n && !gesperrt(n));

  if (g.modus === "proSpiel") {
    const erlaubt = Math.max(0, g.picksProSpiel ?? 0);
    // Reihenfolge erhalten: der erste Name ist der, auf den man sich am
    // meisten festgelegt hat.
    const alle = frei([...(tip?.goals?.home ?? []), ...(tip?.goals?.away ?? [])]).slice(0, erlaubt);
    return {
      vorschlag: { ...ergebnis, goals: { home: alle, away: [] } },
      fehlt: Math.max(0, erlaubt - alle.length),
    };
  }

  const erlaubt = Math.max(0, g.picksPerTeam ?? 0);
  const heim = frei(tip?.goals?.home).slice(0, erlaubt);
  const gast = frei(tip?.goals?.away).slice(0, erlaubt);
  return {
    vorschlag: { ...ergebnis, goals: { home: heim, away: gast } },
    fehlt: Math.max(0, erlaubt - heim.length) + Math.max(0, erlaubt - gast.length),
  };
}

// ── Wohin geht dieser Tipp? ─────────────────────────────────
//
// `runden` sind die WEITEREN Runden des Nutzers, die dieses Spiel enthalten —
// wer das feststellt, ist der Aufrufer (er kennt den Spielplan). Jede Runde
// bringt `{ id, name, rules, starts }` mit; `starts` sind die Spieltag-Starts
// dieser Runde, die `tippStatus` für das Tipp-Fenster braucht.
//
// ⚠️ Die aktuelle Runde ist NIE dabei. Sie wird ganz normal gespeichert, und
// zwar auch dann, wenn keine einzige andere Runde mitkommt.
export function verteilung({
  runden = [], match, tip, snap = null, jetzt = Date.now(), modus = DEFAULT_MEHRFACH,
} = {}) {
  const mit = [], zu = [], unpassend = [];
  if (sanitizeMehrfach(modus) === "einzeln") {
    return { mit, zu, unpassend, aktiv: false };
  }
  for (const r of runden) {
    if (!r?.id) continue;
    const eintrag = { roundId: r.id, name: r.name ?? "" };
    const status = tippStatus(match, r.rules, jetzt, r.starts ?? null);
    if (!status.offen) {
      zu.push({ ...eintrag, grund: status.text });
      continue;
    }
    const p = passtInsRegelwerk(tip, r.rules, snap);
    if (!p.passt) {
      // 🔴 Nicht nur die Absage, sondern gleich der Weg heraus (Andi:
      // „sodass man maximal wenig wiederholen muss").
      unpassend.push({ ...eintrag, grund: p.grund, ...anpassung(tip, r.rules, snap) });
      continue;
    }
    mit.push(eintrag);
  }
  return { mit, zu, unpassend, aktiv: true };
}

// Ein Satz für den Schalter in der Tippabgabe. `null` heißt: es gibt keine
// zweite Runde mit diesem Spiel, der Schalter gehört gar nicht erst hin.
//
// ⚠️ Der Satz nennt ZAHLEN, keine Beschwichtigung. „Wird auch in 2 weiteren
// Runden eingetragen" ist überprüfbar; „wird überall eingetragen" nicht.
export function schalterText(v) {
  if (!v || (!v.mit.length && !v.zu.length && !v.unpassend.length)) return null;
  const teile = [];
  if (v.mit.length) teile.push(`${v.mit.length} weitere${v.mit.length === 1 ? "" : ""} Runde${v.mit.length === 1 ? "" : "n"}`);
  const raus = v.zu.length + v.unpassend.length;
  if (!teile.length) return `Dieses Spiel läuft in ${raus} weiteren Runde${raus === 1 ? "" : "n"}, dort aber nicht übertragbar`;
  return `Wird auch in ${teile[0]} eingetragen`;
}
