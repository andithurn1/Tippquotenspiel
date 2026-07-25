// ============================================================
//  EMPFEHLUNGSBAND & WARNUNGEN — die Leitplanken der Profi-Stufe
//
//  Die Profi-Stufe gibt jeden Regler frei. Das ist gewollt — aber ein Regler,
//  der bis zu seiner harten Grenze läuft, sagt nichts darüber, WO es noch
//  Spaß macht. `RULE_LIMITS` ist die Grenze des technisch Erlaubten,
//  hier steht die Grenze des Erprobten.
//
//  Zwei Arten von Hinweisen, bewusst getrennt:
//
//   1. FELD-BAND — liegt ein einzelner Wert außerhalb dessen, was in den
//      vermessenen Presets vorkommt? Das Band wird aus den PRESETS ABGELEITET,
//      nicht getippt: was in `presets.balance.test.js` durchgemessen ist, gilt
//      als erprobt. Ändern sich die Presets, wandert das Band automatisch mit.
//      Dazu ein Toleranzrand, damit kleine Abweichungen nicht sofort meckern.
//
//   2. KOMBINATIONEN — die Fälle, in denen jeder Einzelwert harmlos aussieht
//      und erst das Zusammenspiel kippt. Der wichtigste ist in presets.js
//      dokumentiert: kein Einsatz (`wrongPenalty` ~ 0) plus kein Cutoff
//      (`minPayout` ~ 0) macht aus jedem Außenseiter-Tipp ein Gratis-Los.
//      Diese Regeln sind handgeschrieben, weil sie Wissen tragen, das in
//      keinem Einzelwert steckt.
//
//  Jede Warnung kennt ihre eigene Korrektur (`korrigieren`), damit der Hinweis
//  nicht nur mahnt, sondern in einem Klick auflösbar ist.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { RULE_LIMITS, sanitizeRules, maxTotalModifier } from "./engine";
import { PRESETS } from "./presets";
import { SAISON_LIMITS } from "./saisonwetten";

// Wie weit über das Preset-Spektrum hinaus noch als normal gilt — als Anteil
// der gesamten Regler-Spanne. Ohne diesen Rand wäre jede Feinjustierung sofort
// ein Hinweis, denn die Presets belegen oft nur einen einzigen Wert.
const TOLERANZ = 0.15;
// Ab welchem Abstand (ebenfalls Anteil der Spanne) aus dem Hinweis eine echte
// Warnung wird.
const WARNSCHWELLE = 0.15;

const get = (obj, pfad) => pfad.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

function setIn(obj, pfad, wert) {
  const teile = pfad.split(".");
  const kopie = { ...obj };
  let ziel = kopie;
  for (const k of teile.slice(0, -1)) {
    ziel[k] = { ...(ziel[k] ?? {}) };
    ziel = ziel[k];
  }
  ziel[teile[teile.length - 1]] = wert;
  return kopie;
}

// ── Welche Felder haben ein Band? ───────────────────────────
// `aktiv` blendet Felder aus, die im aktuellen Regelwerk gar nichts tun —
// ein Joker-Faktor ohne Joker ist keine Warnung wert.
export const BAND_FELDER = [
  { pfad: "k", label: "Schärfe der Ergebnis-Nähe", limits: RULE_LIMITS.k,
    hoch: "Nur noch der exakte Treffer zahlt — knappe Tipps bringen fast nichts.",
    tief: "Auch weit danebenliegende Tipps zahlen noch ordentlich. Das belohnt Dauerzocken." },
  { pfad: "m", label: "Schärfe der Team-Tore-Nähe", limits: RULE_LIMITS.m,
    hoch: "Die Team-Tore-Nähe fällt sehr steil ab und trägt kaum noch etwas bei.",
    tief: "Die Team-Tore-Nähe zahlt fast immer — ein zweiter Trostpreis neben der Ergebnis-Nähe." },
  { pfad: "minPayout", label: "Mindest-Auszahlung", limits: RULE_LIMITS.minPayout,
    hoch: "Ein hoher Cutoff schneidet auch fast richtige Tipps ab.",
    tief: "Ohne Cutoff wirft JEDER Tipp noch Krümel ab — Außenseiter-Wetten werden zu Gratis-Losen." },
  { pfad: "wrongPenalty", label: "Abzug bei komplett falsch", limits: RULE_LIMITS.wrongPenalty,
    hoch: "Ohne Abzug kostet ein Fehltipp nichts — dann lohnt sich wildes Draufhalten immer.",
    tief: "Sehr harter Abzug: Vorsichtige Tipps auf den Favoriten werden zur einzig sinnvollen Wahl." },
  { pfad: "combo.exakt", label: "Kombi-Faktor bei exaktem Ergebnis", limits: RULE_LIMITS.combo.exakt,
    hoch: "Ein einzelner Volltreffer mit Torschützen kann einen ganzen Spieltag entscheiden.",
    tief: "Der exakte Treffer bringt kaum mehr als ein grober — der Kombi-Reiz fällt weg." },
  { pfad: "combo.abstand", label: "Kombi-Faktor bei richtigem Abstand", limits: RULE_LIMITS.combo.abstand,
    hoch: "Schon der richtige Abstand verstärkt die Torschützen sehr stark.",
    tief: "Der richtige Abstand verstärkt praktisch nichts mehr." },
  { pfad: "underdogBoost", label: "Außenseiter-Aufschlag", limits: RULE_LIMITS.underdogBoost,
    aktiv: (r) => get(r, "underdogBoost") > 1,
    hoch: "Ein einziger erwischter Außenseiter überholt eine ganze Saison solider Tipps.",
    tief: "" },
  { pfad: "favFlopPenalty", label: "Favoriten-Reinfall-Malus", limits: RULE_LIMITS.favFlopPenalty,
    aktiv: (r) => get(r, "favFlopPenalty") > 0,
    hoch: "Wer auf den Favoriten tippt, verliert bei jeder Überraschung viel — die meisten tippen dann nur noch Außenseiter.",
    tief: "" },
  { pfad: "joker.faktor", label: "Joker-Faktor", limits: RULE_LIMITS.joker.faktor,
    aktiv: (r) => get(r, "joker.enabled") === true,
    hoch: "Das Joker-Spiel entscheidet den Spieltag fast allein.",
    tief: "Der Joker fällt kaum auf — dann kann er auch aus bleiben." },
  { pfad: "joker.heimat.faktor", label: "Heimatbonus", limits: RULE_LIMITS.joker.faktor,
    aktiv: (r) => get(r, "joker.enabled") === true && get(r, "joker.heimat.enabled") === true,
    hoch: "Der Heimatbonus greift bei JEDEM Spiel des eigenen Vereins — über eine Saison summiert sich das stark.",
    tief: "" },
  { pfad: "modCap", label: "Deckel für alle Modifikatoren", limits: RULE_LIMITS.modCap,
    hoch: "Ein hoher Deckel lässt Joker, Derby und Team-Faktoren gemeinsam sehr weit ausschlagen.",
    tief: "Der Deckel greift so früh, dass die meisten Modifikatoren gar nicht mehr wirken." },
  { pfad: "teamMods.derbyFaktor", label: "Derby-Faktor", limits: RULE_LIMITS.teamMods.derbyFaktor,
    aktiv: (r) => get(r, "teamMods.derbyFaktor") > 1,
    hoch: "Derbys zählen so viel mehr, dass die übrigen Spiele nebensächlich werden.",
    tief: "" },
  { pfad: "aufholen.staerke", label: "Stärke des Anschluss-Bonus", limits: RULE_LIMITS.aufholen.staerke,
    aktiv: (r) => get(r, "aufholen.enabled") === true,
    hoch: "Ein großer Teil des Rückstands wird geschenkt — gutes Tippen zählt dann weniger als Zurückliegen.",
    tief: "" },
  { pfad: "saison.gewicht", label: "Gewicht der Saison-Wetten", limits: SAISON_LIMITS.gewicht,
    aktiv: (r) => get(r, "saison.enabled") === true,
    hoch: "Ein Tipp vor der Saison zählt dann mehr als viele Spieltage danach.",
    tief: "Die Saison-Wetten fallen kaum ins Gewicht." },
];

// Das Band eines Feldes: Spektrum der Presets plus Toleranzrand, hart auf die
// Regler-Grenzen beschnitten.
export function band(pfad) {
  const feld = BAND_FELDER.find((f) => f.pfad === pfad);
  if (!feld) return null;
  const { min, max } = feld.limits;
  const werte = PRESETS
    .map((p) => get(p.rules, pfad))
    .filter((v) => Number.isFinite(v));
  const rand = (max - min) * TOLERANZ;
  const von = werte.length ? Math.min(...werte) : (min + max) / 2;
  const bis = werte.length ? Math.max(...werte) : (min + max) / 2;
  return {
    von: +Math.max(min, von - rand).toFixed(3),
    bis: +Math.min(max, bis + rand).toFixed(3),
    min, max,
  };
}

// Wie weit liegt ein Wert außerhalb seines Bandes — als Anteil der Spanne.
// 0 = innerhalb.
function abstand(wert, b) {
  if (!b || !Number.isFinite(wert)) return 0;
  const spanne = b.max - b.min || 1;
  if (wert < b.von) return (b.von - wert) / spanne;
  if (wert > b.bis) return (wert - b.bis) / spanne;
  return 0;
}

function feldWarnung(rules, feld) {
  if (feld.aktiv && !feld.aktiv(rules)) return null;
  const wert = get(rules, feld.pfad);
  if (!Number.isFinite(wert)) return null;
  const b = band(feld.pfad);
  const d = abstand(wert, b);
  if (d <= 0) return null;

  const zuHoch = wert > b.bis;
  const text = zuHoch ? feld.hoch : feld.tief;
  if (!text) return null;   // in dieser Richtung ist nichts zu sagen

  return {
    id: feld.pfad,
    pfad: feld.pfad,
    label: feld.label,
    stufe: d > WARNSCHWELLE ? "warnung" : "hinweis",
    wert,
    band: b,
    richtung: zuHoch ? "hoch" : "tief",
    titel: `${feld.label} ${zuHoch ? "sehr hoch" : "sehr niedrig"}`,
    text,
    empfehlung: zuHoch ? b.bis : b.von,
  };
}

// ── Kombinationen: was einzeln harmlos aussieht ─────────────
const KOMBINATIONEN = [
  {
    id: "gratis-lose",
    stufe: "warnung",
    titel: "Außenseiter-Tipps kosten nichts",
    gilt: (r) => r.wrongPenalty > -2 && r.minPayout < 2.5,
    text: (r) =>
      `Ein völlig falscher Tipp kostet ${r.wrongPenalty === 0 ? "gar nichts" : `nur ${Math.abs(r.wrongPenalty)}`}, ` +
      `und selbst weit danebenliegende Tipps zahlen noch (Cutoff ${r.minPayout}). ` +
      "Dann ist jede Außenseiter-Wette ein Gratis-Los und Dauerzocken schlägt gutes Tippen.",
    fix: "Abzug und Cutoff auf die erprobten Werte setzen",
    korrektur: (r) => ({ ...r, wrongPenalty: -5, minPayout: 3.5 }),
  },
  {
    id: "modifikator-turm",
    stufe: "warnung",
    titel: "Ein Spiel kann alles entscheiden",
    gilt: (r) => maxTotalModifier(r) >= 3,
    text: (r) =>
      `Im ungünstigsten Fall zählt ein einzelnes Spiel ${formatWert(maxTotalModifier(r))}-fach. ` +
      "Wer dieses eine Spiel trifft, hängt den Rest der Runde ab — unabhängig davon, wie gut alle sonst getippt haben.",
    fix: "Deckel auf 2,5× senken",
    korrektur: (r) => ({ ...r, modCap: 2.5 }),
  },
  {
    id: "deckel-beisst",
    stufe: "hinweis",
    titel: "Der Deckel schneidet deine Modifikatoren ab",
    gilt: (r) => rohModifikator(r) > (r.modCap ?? Infinity) + 0.05,
    text: (r) =>
      `Deine Modifikatoren summieren sich auf ×${formatWert(rohModifikator(r))}, gedeckelt wird bei ×${formatWert(r.modCap ?? 0)}. ` +
      "Die obersten Stufen wirken damit gar nicht mehr — entweder Deckel anheben oder die Faktoren senken.",
    fix: "Deckel auf die Summe anheben",
    korrektur: (r) => ({ ...r, modCap: Math.min(RULE_LIMITS.modCap.max, +rohModifikator(r).toFixed(1)) }),
  },
  {
    id: "kein-unterschied",
    stufe: "hinweis",
    titel: "Exakt und ungefähr zahlen fast gleich",
    gilt: (r) => r.combo.exakt - r.combo.abstand < 0.3 && r.markets?.goals?.enabled,
    text: () =>
      "Der exakte Treffer bringt kaum mehr als der richtige Abstand. Dann lohnt es sich nicht, " +
      "ein Ergebnis genau zu tippen — und der spannendste Moment beim Auswerten fällt weg.",
    fix: "Exakt-Kombi anheben",
    korrektur: (r) => ({ ...r, combo: { ...r.combo, exakt: Math.min(RULE_LIMITS.combo.exakt.max, r.combo.abstand + 0.8) } }),
  },
  {
    id: "versaeumnis-lohnt",
    stufe: "hinweis",
    titel: "Nichtstippen wird nicht spürbar teurer",
    gilt: (r) => r.versaeumnis?.enabled && r.versaeumnis.malusProzent < 10,
    text: () =>
      "Der Ersatz-Tipp wird fast voll gewertet. Wer den Spieltag vergisst, steht damit kaum " +
      "schlechter da als jemand, der sich Gedanken gemacht hat.",
    fix: "Abzug auf 30 % setzen",
    korrektur: (r) => ({ ...r, versaeumnis: { ...r.versaeumnis, malusProzent: 30 } }),
  },
];

// Rohe Summe aller Modifikator-Aufschläge, OHNE Deckel — damit sichtbar wird,
// wie viel der Deckel gerade abschneidet. Bewusst hier und nicht in der
// Engine: die Engine liefert den gedeckelten, also wirksamen Wert.
export function rohModifikator(rules) {
  const j = rules?.joker ?? {};
  let aufschlag = 0;
  if (j.enabled) {
    const aktiv = j.modus === "ranking" ? Math.max(...(j.faktoren ?? [1])) : (j.faktor ?? 1);
    aufschlag += Math.max(0, aktiv - 1);
    if (j.heimat?.enabled) aufschlag += Math.max(0, (j.heimat.faktor ?? 1) - 1);
    if (j.mut?.enabled) aufschlag += Math.max(0, (j.mut.faktor ?? 1) - 1);
  }
  const tm = rules?.teamMods ?? {};
  if (tm.derbyFaktor > 1) aufschlag += tm.derbyFaktor - 1;
  const teams = Object.values(tm.teams ?? {}).filter((f) => Number.isFinite(f) && f > 1)
    .sort((a, b) => b - a).slice(0, 2);
  for (const f of teams) aufschlag += f - 1;
  return +(1 + aufschlag).toFixed(3);
}

// ── Die eine Prüfung ────────────────────────────────────────
// Warnungen zuerst, darin Kombinationen vor Einzelfeldern: eine kaputte
// Kombination ist immer wichtiger als ein einzelner strammer Regler.
export function pruefe(rules) {
  const r = sanitizeRules(rules);
  const treffer = [];

  for (const k of KOMBINATIONEN) {
    if (!k.gilt(r)) continue;
    treffer.push({
      id: k.id, art: "kombination", stufe: k.stufe, titel: k.titel,
      text: k.text(r), fix: k.fix,
    });
  }
  for (const feld of BAND_FELDER) {
    const w = feldWarnung(r, feld);
    if (w) treffer.push({ ...w, art: "feld", fix: `auf ${formatWert(w.empfehlung)} zurücksetzen` });
  }

  const rang = { warnung: 0, hinweis: 1 };
  const artRang = { kombination: 0, feld: 1 };
  return treffer.sort((a, b) =>
    rang[a.stufe] - rang[b.stufe] || artRang[a.art] - artRang[b.art]);
}

function formatWert(v) {
  return Number.isInteger(v) ? String(v) : String(+v.toFixed(2)).replace(".", ",");
}

// Eine Warnung auflösen — Kombinationen kennen ihre eigene Korrektur,
// Feld-Warnungen setzen auf die nächste Bandkante zurück.
export function korrigieren(rules, id) {
  const k = KOMBINATIONEN.find((x) => x.id === id);
  if (k) return sanitizeRules(k.korrektur(sanitizeRules(rules)));
  const feld = BAND_FELDER.find((f) => f.pfad === id);
  if (!feld) return sanitizeRules(rules);
  const r = sanitizeRules(rules);
  const w = feldWarnung(r, feld);
  if (!w) return r;
  return sanitizeRules(setIn(r, feld.pfad, w.empfehlung));
}

// Ein Satz für das Band über der Profi-Stufe.
export function zusammenfassung(rules) {
  const alle = pruefe(rules);
  const warnungen = alle.filter((w) => w.stufe === "warnung").length;
  const hinweise = alle.length - warnungen;
  if (!alle.length) {
    return { stufe: "ok", anzahl: 0, text: "Alle Werte liegen im erprobten Bereich." };
  }
  if (warnungen) {
    return {
      stufe: "warnung", anzahl: alle.length,
      text: `${warnungen} Einstellung${warnungen === 1 ? "" : "en"} ${warnungen === 1 ? "kann" : "können"} die Runde kippen${hinweise ? `, dazu ${hinweise} Hinweis${hinweise === 1 ? "" : "e"}` : ""}.`,
    };
  }
  return {
    stufe: "hinweis", anzahl: alle.length,
    text: `${hinweise} Hinweis${hinweise === 1 ? "" : "e"} — spielbar, aber ungewöhnlich.`,
  };
}
