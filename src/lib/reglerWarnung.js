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
import { SAISON_LIMITS, SAISON_PRESETS } from "./saisonwetten";
import { BIGGAME_LIMITS } from "./bigGame";
// 🔴 Die FREMDJOKER-Familie (JK4–JK14). `aktiveArten` ist die einzige Stelle,
// die sagt, welche der vier Arten laufen — hier `duell.enabled` zu fragen
// hieße, zwei davon zu übersehen (sie stehen in `rules.eingriffe`).
// ⚠️ Zyklusfrei: `fremdjoker.js` liest `engine.js`, aber niemand in dieser
// Kette liest `reglerWarnung.js` zurück.
import { aktiveArten } from "./fremdjoker";
import { EINGRIFF_LIMITS, sanitizeSchutz, sanitizeSperrKarte } from "./eingriffe";

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
  { pfad: "joker.mut.faktor", label: "Mut-Bonus", limits: RULE_LIMITS.joker.mutFaktor,
    aktiv: (r) => get(r, "joker.enabled") === true && get(r, "joker.mut.enabled") === true,
    // Gemessen im Simulator (4 Seeds × 60 Saisons, mit Vereins-Modell) —
    // Siegquote Kenner : Zocker:
    //   ×1,05 → 51:16 · ×1,10 → 50:19 · ×1,15 → 47:23 · ×1,20 → 42:30
    // Ab 1,15 schmilzt der Vorsprung des Könnens sichtbar ab.
    gemessen: { von: 1, bis: 1.15 },
    hoch: "Bei ×1,2 gewinnt der Kenner in der Simulation nur noch 42 % der Saisons, "
      + "der Dauerzocker schon 30 % — bei ×1,1 stehen 50 % gegen 19 %. Der Mut-Bonus "
      + "verstärkt genau die höchsten Auszahlungen, deshalb wirkt er stärker, als die Zahl aussieht.",
    tief: "" },
  { pfad: "joker.heimat.faktor", label: "Heimatbonus", limits: RULE_LIMITS.joker.faktor,
    aktiv: (r) => get(r, "joker.enabled") === true && get(r, "joker.heimat.enabled") === true,
    // Gemessen: harmlos. Der Kenner gewinnt MIT Heimatbonus eher mehr, weil
    // der Bonus auch die zu optimistischen Tipps auf den eigenen Verein
    // mitverstärkt. Deshalb ein weites Band statt einer Warnung.
    gemessen: { von: 1, bis: 2 },
    hoch: "Der Heimatbonus greift bei JEDEM Spiel des eigenen Vereins — über eine Saison summiert sich das stark.",
    tief: "" },
  { pfad: "modCap", label: "Deckel für alle Modifikatoren", limits: RULE_LIMITS.modCap,
    hoch: "Ein hoher Deckel lässt Joker, Derby und Team-Faktoren gemeinsam sehr weit ausschlagen.",
    tief: "Der Deckel greift so früh, dass die meisten Modifikatoren gar nicht mehr wirken." },
  { pfad: "teamMods.derbyFaktor", label: "Derby-Faktor", limits: RULE_LIMITS.teamMods.derbyFaktor,
    aktiv: (r) => get(r, "teamMods.derbyFaktor") > 1,
    hoch: "Derbys zählen so viel mehr, dass die übrigen Spiele nebensächlich werden.",
    tief: "" },
  // ── Big Game ──────────────────────────────────────────────
  // In KEINEM Preset aktiv, deshalb ein gemessenes Band direkt am Feld.
  // Messung: `npm run balance`, 3 Saatzahlen × 40 Saisons, alle sechs Presets.
  // Befund: die Ebene ist über ihre GANZE Spanne unbedenklich — selbst bei
  // Aufschlag 1,0 bleibt der Kenner überall vorn. Deshalb kein enges Band auf
  // dem Aufschlag; die Rückmeldung gehört an die SCHWELLE (siehe unten).
  { pfad: "bigGame.aufschlag", label: "Aufschlag fürs Topspiel", limits: BIGGAME_LIMITS.aufschlag,
    aktiv: (r) => get(r, "bigGame.enabled") === true,
    gemessen: { von: 0.2, bis: 1 },
    hoch: "",
    tief: "So klein fällt der Aufschlag niemandem auf — dann kann das Topspiel auch aus bleiben." },
  { pfad: "bigGame.minSpannung", label: "Schwelle fürs Topspiel", limits: BIGGAME_LIMITS.minSpannung,
    aktiv: (r) => get(r, "bigGame.enabled") === true,
    // Die eigentliche Stellschraube. Bei 0 hat JEDER Spieltag ein Topspiel —
    // aus der Auszeichnung wird eine Dauer-Zugabe, und der Aufschlag wirkt nur
    // noch als allgemeine Varianz. Genau das hilft dem Zocker.
    gemessen: { von: 0.25, bis: 0.8 },
    hoch: "Die Schwelle ist so hoch, dass es fast nie ein Topspiel gibt — die Einstellung läuft dann meistens leer.",
    tief: "Bei Schwelle 0 bekommt JEDER Spieltag ein Topspiel, auch ein belangloses. "
      + "Gemessen (Aufschlag 1,0, mildes Regelwerk): der Kenner gewinnt dann noch 57 % der "
      + "Saisons statt 61 %, der Dauerzocker steigt von 9 % auf 11 %. Kein Beinbruch — aber "
      + "der Aufschlag ist dann keine Auszeichnung mehr, sondern nur noch mehr Zufall." },
  { pfad: "aufholen.staerke", label: "Stärke des Anschluss-Bonus", limits: RULE_LIMITS.aufholen.staerke,
    aktiv: (r) => get(r, "aufholen.enabled") === true,
    hoch: "Ein großer Teil des Rückstands wird geschenkt — gutes Tippen zählt dann weniger als Zurückliegen.",
    tief: "" },
  { pfad: "saison.gewicht", label: "Gewicht der Saison-Wetten", limits: SAISON_LIMITS.gewicht,
    aktiv: (r) => get(r, "saison.enabled") === true,
    // 🔴 Das Erprobte für dieses Feld steht in einem ANDEREN Katalog.
    // `PRESETS` sind Wertungs-Regelwerke; sie haben die Saison-Wetten alle
    // aus und tragen deshalb überall dieselbe Vorgabe 1. Daraus abgeleitet
    // ergab das Band 0,565–1,435 — und meldete ausgerechnet das kuratierte
    // Saison-Preset „nebenbei" (Gewicht 0,5) als unerprobt. Gemessen am
    // 06.08.2026: der Charakter „Nur nebenbei" und die Stufe-2-Stufe „Als
    // Würze" lösten beide einen Hinweis aus, obwohl beide genau das tun, was
    // ihr Name sagt.
    //
    // Deshalb `quelle`: ein Feld darf sagen, wo seine erprobten Werte liegen.
    // Das ist kein Schlupfloch — die Regel bleibt „das Band kommt aus den
    // kuratierten Voreinstellungen", sie fragt nur den richtigen Katalog.
    quelle: () => SAISON_PRESETS.map((p) => p.saison?.gewicht),
    hoch: "Ein Tipp vor der Saison zählt dann mehr als viele Spieltage danach.",
    tief: "Die Saison-Wetten fallen kaum ins Gewicht." },
];

// Das Band eines Feldes: Spektrum der Presets plus Toleranzrand, hart auf die
// Regler-Grenzen beschnitten.
//
// Manche Felder kommen in KEINEM Preset vor (der Mut-Joker etwa ist überall
// aus). Für die lässt sich nichts ableiten — sie tragen ein GEMESSENES Band
// direkt am Feld. Das ist die einzige zulässige Art, eine Messung
// festzuhalten: als Empfehlung, nie als engere `RULE_LIMITS`. Sonst würde aus
// jeder Messung ein Verbot, und der Admin verlöre eine Freiheit, statt eine
// Rückmeldung zu bekommen.
export function band(pfad) {
  const feld = BAND_FELDER.find((f) => f.pfad === pfad);
  if (!feld) return null;
  const { min, max } = feld.limits;
  if (feld.gemessen) {
    return {
      von: Math.max(min, feld.gemessen.von),
      bis: Math.min(max, feld.gemessen.bis),
      min, max,
    };
  }
  const werte = (feld.quelle ? feld.quelle() : PRESETS.map((p) => get(p.rules, pfad)))
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

// Ab hier entscheidet ein einzelnes Spiel zu viel. Dieselbe Schwelle gilt für
// beide Modifikator-Regeln, damit sie sich nie widersprechen können.
const TURM_SCHWELLE = 3;

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
    gilt: (r) => maxTotalModifier(r) >= TURM_SCHWELLE,
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
    // Nur melden, wenn das Anheben des Deckels auch wirklich der richtige Rat
    // ist. Liegt die Summe schon im Turm-Bereich, sagt die Warnung darüber das
    // Gegenteil („Deckel senken") — beide zusammen würden sich gegenseitig
    // aufheben und der Admin klickte im Kreis. Dort ist die Antwort nicht ein
    // höherer Deckel, sondern kleinere Faktoren.
    gilt: (r) => rohModifikator(r) > (r.modCap ?? Infinity) + 0.05
      && rohModifikator(r) < TURM_SCHWELLE,
    text: (r) =>
      `Deine Modifikatoren summieren sich auf ×${formatWert(rohModifikator(r))}, gedeckelt wird bei ×${formatWert(r.modCap ?? 0)}. ` +
      "Die obersten Stufen wirken damit gar nicht mehr — entweder Deckel anheben oder die Faktoren senken.",
    fix: "Deckel auf die Summe anheben",
    // ⚠️ Zwei Nachkommastellen, nicht eine. Seit die Modifikator-Regler auf
    // dem 0,05-Raster stehen (siehe `reglerRaster.test.js`), kann die Summe
    // z. B. 2,45 betragen — `toFixed(1)` schlüge dann 2,5 vor, also einen Wert,
    // den der Admin gar nicht gewählt hat. Die Richtung wäre harmlos (ein
    // höherer Deckel beißt weniger), die Anzeige aber falsch.
    korrektur: (r) => ({ ...r, modCap: Math.min(RULE_LIMITS.modCap.max, +rohModifikator(r).toFixed(2)) }),
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
  {
    // 🔴 Gemessen am 06.08.2026 über 1600 hoffnungslose Tipps: bei
    // `minPayout: 0` (Vorgabe) greift der Abzug in 17 Fällen — 1 %. Mit einer
    // Mindestauszahlung von 5 sind es 800, also die Hälfte.
    //
    // Ursache: der Abzug fällt nur, wenn ALLE Teile exakt 0 sind, und die
    // Ergebnis-Nähe ist fast immer knapp über null. Erst `minPayout` schneidet
    // diese Krümel ab und macht „komplett daneben" zu einem echten Zustand.
    // Der Regler ist also nicht kaputt — er hängt an einem zweiten.
    id: "strafe-ohne-mindestauszahlung",
    stufe: "hinweis",
    titel: "Der Abzug für „komplett daneben“ greift fast nie",
    gilt: (r) => r.wrongPenalty < 0 && !(r.minPayout > 0),
    text: () =>
      "Solange es keine Mindestauszahlung gibt, bringt fast jeder Tipp noch ein paar Krümel "
      + "Ergebnis-Nähe — und „komplett daneben“ tritt damit kaum je ein. Gemessen: in 1 % der "
      + "hoffnungslosen Tipps statt in der Hälfte.",
    fix: "Mindestauszahlung auf 5 setzen",
    korrektur: (r) => ({ ...r, minPayout: 5 }),
  },
  {
    // 🔴 Gemessen am 06.08.2026: mit dem Vorgabe-Deckel von 60 Punkten liefern
    // Klau-Anteile von 10 %, 35 % und 100 % ALLE dasselbe Ergebnis (+60). Der
    // Stärke-Regler bewegt die Zahl nicht — er läuft ins Leere, weil der Deckel
    // vorher greift. Ohne Deckel: +273, +954, +2726.
    //
    // Ursache ist eine Größenordnung, keine Balance: `maxProSaison` ist ein
    // ABSOLUTER Punktwert, aber die Punkte werden mit `displayScale`
    // hochskaliert. Ein einzelner exakter Treffer bringt schon ein Vielfaches
    // des Deckels. Die Warnung sagt das — welchen Deckel eine Runde will,
    // entscheidet der Admin.
    id: "duell-deckel-erdrueckt",
    stufe: "hinweis",
    titel: "Der Saison-Deckel macht den Stärke-Regler wirkungslos",
    gilt: (r) => {
      const d = r?.duell;
      if (!d?.enabled || !(d.maxProSaison > 0)) return false;
      // Grober Vergleich mit der Punkte-Größenordnung EINES Treffers: liegt der
      // Saison-Deckel darunter, ist er nach dem ersten Duell erschöpft.
      return d.maxProSaison < (r.displayScale ?? 1) * 10;
    },
    text: (r) =>
      `Höchstens ${r.duell.maxProSaison} Punkte pro Saison aus Duellen — das ist weniger als ein `
      + "einzelner guter Tipp bringt. Der Deckel greift dann schon beim ersten Duell, und ob "
      + "10 % oder 100 % geklaut werden, ändert am Ergebnis nichts mehr.",
    fix: "Deckel auf das Zehnfache anheben",
    korrektur: (r) => ({
      ...r,
      duell: {
        ...r.duell,
        maxProSaison: Math.min(RULE_LIMITS.duell?.maxProSaison?.max ?? 200,
          Math.max(1, Math.round((r.displayScale ?? 1) * 10))),
      },
    }),
  },

  // ── Die FREMDJOKER-Familie (23.08.2026) ───────────────────
  // Drei Kombinationen, die jede für sich erlaubt sind und zusammen eine
  // Runde ergeben, die niemand spielen will. Gemeldet, nicht gesperrt —
  // „will ein Admin etwas Unbalanciertes, soll er es haben" (Andi, 21.08.).
  {
    // 🔴 Andis eigene Begründung, warum der Schutz existiert: „weil man die
    // halt evtl selber live verfolgen will, und's deswegen blöd wäre." Ein
    // Fremdjoker, der das trifft, nimmt keine Punkte weg, sondern den Spaß —
    // und dann schaltet die Runde die ganze Familie ab. Der Schutz ist damit
    // die BEDINGUNG dafür, dass Fremdjoker eingeschaltet bleiben, nicht ihr
    // Gegenstück.
    id: "fremdjoker-ohne-schutz",
    stufe: "warnung",
    titel: "Niemand kann sein Spiel schützen",
    gilt: (r) => aktiveArten(r).length > 0 && sanitizeSchutz(r?.eingriffe?.schutz).proSpieltag === 0,
    text: () =>
      "Fremdjoker sind an, aber niemand darf ein Spiel davor schützen. Wer Samstag im Stadion "
      + "sitzt, muss zusehen, wie ihm genau dieses Spiel weggeblockt wird — und Runden schalten "
      + "danach erfahrungsgemäß die ganze Familie ab, nicht nur den einen Joker.",
    fix: "Ein geschütztes Spiel je Spieltag erlauben",
    korrektur: (r) => ({
      ...r,
      eingriffe: { ...r.eingriffe, schutz: { ...sanitizeSchutz(r?.eingriffe?.schutz), proSpieltag: 1 } },
    }),
  },
  {
    // 🔴 Das Rudelbilden. Es stand bis zum 23.08.2026 nur als `EMPFEHLUNG` in
    // `duellJoker.js` und wurde allein im Duell-Baustein angezeigt — die
    // Profi-Warnungen kannten es nicht. Mit vier Arten statt zwei liegen jetzt
    // deutlich mehr Einsätze auf demselben Spieltag, und das Los (JK12) ist
    // die Antwort, die es nicht nur bemängelt, sondern unmöglich macht.
    id: "fremdjoker-rudel",
    stufe: "warnung",
    titel: "Alle gehen auf den Führenden",
    gilt: (r) => {
      const arten = aktiveArten(r).length;
      if (arten < 2 || r?.duell?.zielWahl !== "frei") return false;
      const sperre = sanitizeSperrKarte(r?.eingriffe?.sperrfrist).standard;
      // Freie Zielwahl ist für sich harmlos. Gefährlich wird sie erst, wenn
      // NICHTS bremst: keine Sperrfrist und ein großzügiges `maxProZiel`.
      return sperre.spieltage === 0 && sperre.aufschlag === 0 && (r?.duell?.maxProZiel ?? 0) >= 3;
    },
    text: (r) =>
      `${aktiveArten(r).length} Fremdjoker mit freier Zielwahl, ohne Sperrfrist und mit bis zu `
      + `${r.duell.maxProZiel} Treffern auf dieselbe Person: erfahrungsgemäß gehen dann alle auf den `
      + "Führenden. Die Zielwahl „Ausgelost“ macht das unmöglich, statt es nur unwahrscheinlich zu machen.",
    fix: "Sperrfrist von 2 Spieltagen setzen",
    korrektur: (r) => ({
      ...r,
      eingriffe: {
        ...r.eingriffe,
        sperrfrist: {
          ...sanitizeSperrKarte(r?.eingriffe?.sperrfrist),
          standard: { ...sanitizeSperrKarte(r?.eingriffe?.sperrfrist).standard, spieltage: 2 },
        },
      },
    }),
  },
  {
    // ⚠️ Kein Balance-Urteil, sondern eine Rechenaussage: die Sperre wächst
    // pro Wiederholung, und ohne Deckel wächst sie über die Saison hinaus.
    // Dann ist die zweite Hälfte des Reglers Zierde.
    id: "sperrfrist-waechst-unbegrenzt",
    stufe: "hinweis",
    titel: "Die Sperrfrist wächst über die Saison hinaus",
    gilt: (r) => {
      if (aktiveArten(r).length === 0) return false;
      const s = sanitizeSperrKarte(r?.eingriffe?.sperrfrist).standard;
      // Nach dem vierten Treffer schon länger als eine halbe Saison.
      return s.aufschlag > 0 && s.hoechstens === 0 && s.spieltage + 3 * s.aufschlag > 17;
    },
    text: (r) => {
      const s = sanitizeSperrKarte(r?.eingriffe?.sperrfrist).standard;
      return `Jeder Wiederholungstreffer legt ${s.aufschlag} Spieltage drauf, und es gibt keine `
        + `Obergrenze: nach dem vierten Mal wären es ${s.spieltage + 3 * s.aufschlag} Spieltage — `
        + "mehr als eine halbe Saison. Danach ist dieselbe Person praktisch für immer gesperrt.";
    },
    fix: "Obergrenze auf 6 Spieltage setzen",
    korrektur: (r) => ({
      ...r,
      eingriffe: {
        ...r.eingriffe,
        sperrfrist: {
          ...sanitizeSperrKarte(r?.eingriffe?.sperrfrist),
          standard: {
            ...sanitizeSperrKarte(r?.eingriffe?.sperrfrist).standard,
            hoechstens: Math.min(EINGRIFF_LIMITS.hoechstens.max, 6),
          },
        },
      },
    }),
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
  if (rules?.bigGame?.enabled) aufschlag += Math.max(0, rules.bigGame.aufschlag ?? 0);
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
