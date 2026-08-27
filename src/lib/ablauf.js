// ============================================================
//  WANN FÄLLT ES WEG? — Verfall, Rücksetzung, Fristen
//
//  🔴 Andi, 27.08.2026, in der Beschreibung des Runden-Menüs: „ne Übersicht
//  über die Ereignisse und angewendeten Joker **bzw. wann die auch geresettet
//  werden**".
//
//  ── Der Befund, der diese Datei nötig macht ──
//  Die REGEL steht überall: `jokerBasis.verfall` kennt „je Periode", „Saison"
//  und „wandert", die Sperrfristen der Fremdjoker haben ihre Spieltage, das
//  Budget seinen Takt. **Das DATUM steht nirgends.**
//
//  Ein Spieler sieht „2 Joker übrig" und weiß nicht, ob er sie diese Woche
//  ausgeben muss oder bis Mai Zeit hat. Das ist kein Anzeigefehler, das ist
//  eine fehlende Auskunft: die Regel ist eingestellt, gültig und wirksam — und
//  sie steht nur in der Profi-Ansicht des Admins.
//
//  ⚠️ Diese Datei RECHNET NICHTS NEU. Sie übersetzt die vorhandenen Regeln in
//  einen Zeitpunkt: aus `verfall: "periode"` plus dem laufenden Münz-Takt wird
//  „am Ende von Spieltag 8". Die Regeln selbst bleiben, wo sie sind — eine
//  zweite Verfalls-Logik wäre die doppelte Wahrheit, an der dieses Projekt
//  schon 17 Fehler an einem Tag hatte.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { sanitizeBasis, basisFuer, VERFALL } from "./jokerBasis";
import { JOKER_ARTEN } from "./jokerBudget";
import { muenzTaktStatus } from "./muenzTakt";

// ── Ein Ablauf-Eintrag ──────────────────────────────────────
// `{ was, wann, spieltag, text }`
//   was      — kurzer Name der Sache („Joker", „Sperrfrist", „Narren")
//   wann     — "saison" | "spieltag" | "nie" | "unbekannt"
//   spieltag — der RUNDEN-Spieltag, an dessen Ende es wegfällt (oder null)
//   text     — der Satz für die Oberfläche
//
// ⚠️ `wann: "unbekannt"` ist ein ausdrücklicher Zustand und kein Fehler: ohne
// Spielplan lässt sich eine Periode nicht ausrechnen. Ein erfundenes Datum
// wäre schlimmer als keins — der Spieler richtet sich danach.

const ende = (spieltag, was, zusatz = "") => ({
  was, wann: "spieltag", spieltag,
  text: `${was}: verfällt am Ende von Spieltag ${spieltag}${zusatz}`,
});

// ── Der Joker-Verfall ───────────────────────────────────────
// 🔴 Die drei Fälle aus `jokerBasis.VERFALL`, in Daten übersetzt.
//
// ⚠️ „wandert" ist der einzige, der KEIN Datum hat — und genau deshalb muss er
// gesagt werden. Wer nicht weiß, dass sein Joker mitwandert, gibt ihn aus
// Angst zu früh aus.
export function jokerAblauf(rules, { matches = [], spieltag = null, schluessel } = {}) {
  const basis = sanitizeBasis(rules?.jokerBasis?.standard ?? rules?.jokerBasis);
  const name = "Joker";

  if (basis.verfall === "saison") {
    return { was: name, wann: "saison", spieltag: null,
      text: `${name}: bleiben bis zum Saisonende — kein Zeitdruck.` };
  }
  if (basis.verfall === "wandert") {
    return { was: name, wann: "nie", spieltag: null,
      text: `${name}: wandern unverbraucht in die nächste Periode — nichts geht verloren.` };
  }

  // „periode": das Ende hängt am Münz-Takt, und der kennt es genau.
  const status = muenzTaktStatus({ matches, rules, spieltag, ...(schluessel ? { schluessel } : {}) });
  if (!status?.aktiv || !Number.isFinite(status.bis)) {
    return { was: name, wann: "unbekannt", spieltag: null,
      text: `${name}: verfallen am Ende der Periode — welcher Spieltag das ist, steht erst mit dem Spielplan fest.` };
  }
  const mehrere = status.spieltageInPeriode > 1;
  return ende(status.bis, name, mehrere ? ` (Periode ${status.von}–${status.bis})` : "");
}

// ── Wann ist eine Sperrfrist vorbei? ────────────────────────
// Fremdjoker sperren nach einem Treffer für n Spieltage. Die Zahl steht im
// Regelwerk, der Zeitpunkt nirgends.
//
// `getroffenAm` = der RUNDEN-Spieltag des Treffers, `spieltage` = die
// eingestellte Sperrfrist. ⚠️ Gibt `null`, wenn es gar keine gibt — dann ist
// nichts zu sagen, und eine Zeile „keine Sperrfrist" wäre Rauschen.
export function sperrfristAblauf({ getroffenAm = null, spieltage = 0, name = "Sperrfrist" } = {}) {
  const n = Math.max(0, Number(spieltage) || 0);
  // ⚠️ `Number(null)` ist 0 und damit endlich — ein fehlender Spieltag käme
  // sonst als „Spieltag 0" durch und die Sperrfrist endete scheinbar schon.
  // 🔴 DERSELBE Fehler wie zwei Stunden vorher in `greiftNicht.js`
  // („ihr seid 0"). Beim zweiten Mal ist es kein Ausrutscher mehr, sondern
  // ein Muster: in dieser Sprache ist `null` eine Zahl. Steht deshalb auch in
  // `docs/werkzeug-fallen.md`.
  const ab = (getroffenAm === null || getroffenAm === undefined || getroffenAm === "")
    ? NaN : Number(getroffenAm);
  if (!n || !Number.isFinite(ab)) return null;
  const frei = ab + n;
  return {
    was: name, wann: "spieltag", spieltag: frei,
    text: `${name}: wieder frei ab Spieltag ${frei} (${n} ${n === 1 ? "Spieltag" : "Spieltage"} gesperrt).`,
  };
}

// ── Die Abklingzeit: welche Joker-ART liegt gerade still? ───
// 🔴 Der zweite Fall von „wann wird das zurückgesetzt", und der häufigere:
// `basis.abklingzeit` sperrt eine Joker-Art für n Spieltage NACH ihrem letzten
// Einsatz. Die Regel steht in `jokerBasis.js` und wird dort auch durchgesetzt
// (`darfEinsetzen`) — nur erfährt der Spieler den Zeitpunkt erst, wenn er es
// versucht und abgewiesen wird.
//
// ⚠️ Hier wird NICHT nachgerechnet, ob er darf — das entscheidet weiter
// `darfEinsetzen`. Übersetzt wird nur dieselbe Zahl in ein Datum, und
// `ablauf.test.js` hält beide gegeneinander fest: der Spieltag, den diese
// Funktion nennt, ist genau der erste, an dem `darfEinsetzen` wieder ja sagt.
//
// `einsaetze` kommt aus `einsaetzeAllerArten(tipps, rules)` — dieselbe Liste,
// aus der auch Budget und Limitklassen lesen. Eine eigene Ableitung aus den
// Tipps wäre die zweite Wahrheit.
export function abklingAblaeufe(rules, { einsaetze = [], userId = null, spieltag = null } = {}) {
  const meine = (Array.isArray(einsaetze) ? einsaetze : [])
    .filter((e) => e && (userId == null || e.vonUserId === userId));

  // je Art der JÜNGSTE Einsatz — ältere sind längst abgeklungen
  const letzte = new Map();
  for (const e of meine) {
    const st = Number(e.spieltag);
    if (!Number.isFinite(st)) continue;
    const bisher = letzte.get(e.jokerArt);
    if (bisher == null || st > bisher) letzte.set(e.jokerArt, st);
  }

  const label = new Map(JOKER_ARTEN.map((a) => [a.key, a.label]));
  const out = [];
  for (const [art, getroffenAm] of letzte) {
    const basis = basisFuer(art, rules);
    const eintrag = sperrfristAblauf({
      getroffenAm,
      spieltage: basis?.abklingzeit ?? 0,
      name: label.get(art) ?? art,
    });
    if (!eintrag) continue;
    // ⚠️ Abgelaufene Sperren NICHT zeigen. „Wieder frei ab Spieltag 3", wenn
    // Spieltag 7 läuft, ist keine Auskunft, sondern Rauschen — und Rauschen
    // ist genau das, was die dringende Zeile darüber unlesbar macht.
    const jetzt = (spieltag === null || spieltag === undefined || spieltag === "")
      ? NaN : Number(spieltag);
    if (Number.isFinite(jetzt) && eintrag.spieltag <= jetzt) continue;
    out.push({ ...eintrag, jokerArt: art });
  }
  return out;
}

// ── Alles, was in dieser Runde einen Ablauf hat ─────────────
// Die eine Stelle, die ein Screen fragt. Immer eine LISTE — auch wenn sie
// leer ist („nie halb gesetzt", dieselbe Regel wie in `limitKlassen.js`).
//
// ⚠️ Die Reihenfolge ist NICHT alphabetisch, sondern nach Dringlichkeit: was
// bald wegfällt, steht oben. Was gar nicht wegfällt, steht unten — es ist die
// beruhigende Auskunft, nicht die dringende.
export function ablaeufe(rules, {
  matches = [], spieltag = null, schluessel,
  sperrfristen = [], einsaetze = [], userId = null,
} = {}) {
  const out = [jokerAblauf(rules, { matches, spieltag, schluessel })];
  for (const s of sperrfristen) {
    const eintrag = sperrfristAblauf(s);
    if (eintrag) out.push(eintrag);
  }
  out.push(...abklingAblaeufe(rules, { einsaetze, userId, spieltag }));
  const rang = { spieltag: 0, unbekannt: 1, saison: 2, nie: 3 };
  return out.sort((a, b) =>
    (rang[a.wann] - rang[b.wann]) || ((a.spieltag ?? 0) - (b.spieltag ?? 0)));
}

// Ein Satz über die dringendste Sache — für eine Kopfzeile.
export function naechsterAblauf(liste = []) {
  const bald = liste.find((e) => e.wann === "spieltag");
  return bald ?? null;
}
