// ============================================================
//  WETTBEWERBS-GEWICHTE (Etappe b)
//
//  Ein Champions-League-Halbfinale soll mehr zählen als ein
//  Bundesliga-Spieltagsspiel. Zwei Dinge daran sind leicht falsch zu machen:
//
//  ── 1. Gewicht pro Spiel ≠ Anteil an der Gesamtwertung ──
//  Die Bundesliga hat 306 Spiele, die CL-Ligaphase 144. Wer die CL auf „×1,5"
//  stellt, bekommt trotzdem WENIGER Gesamtanteil als die Liga — der Faktor
//  fühlt sich nach „doppelt so wichtig" an, das Ergebnis ist es nicht. Deshalb
//  rechnet `anteile()` aus, was am Ende wirklich herauskommt, und die
//  Oberfläche zeigt das statt bloß den Regler. Ohne diese Rückmeldung stellt
//  ein Admin etwas ein und bekommt etwas anderes.
//
//  ── 2. Es ist KEIN neuer Multiplikator ──
//  „Dieses Spiel ist wichtiger, für alle gleich" ist dieselbe Aussage wie beim
//  Derby und beim Big Game. Also derselbe ADDITIVE Topf unter `modCap`
//  (`teamModFactor` in der Engine) — nicht ein vierter Faktor daneben, der
//  sich mit den anderen multipliziert.
//
//  ── Phasen ohne String-Vergleiche ──
//  Statt jede K.-o.-Runde einzeln einzustellen, gibt es EINEN Aufschlag je
//  Runde, der über `PHASE[...].rang` hochzählt: Achtelfinale ×1, Viertelfinale
//  ×2, Halbfinale ×3, Finale ×4. Ein Regler statt vier, und neue Phasen
//  wirken automatisch mit.
//
//  Reine Funktionen, UI-frei. Die Engine kennt weiterhin keine Ligennamen —
//  sie liest den fertigen Aufschlag, den diese Datei aus den Daten ableitet.
// ============================================================

import { PHASE, wettbewerbVon, phaseVon, WETTBEWERBE } from "./wettbewerbe";

export const WETTBEWERB_LIMITS = {
  aufschlag: { min: 0, max: 1.5, step: 0.05 },     // je Wettbewerb
  phasenStufe: { min: 0, max: 0.3, step: 0.05 },   // je K.-o.-Runde
};

export const DEFAULT_WETTBEWERBE = { enabled: false, aufschlaege: {}, phasenStufe: 0 };

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? +Math.min(max, Math.max(min, n)).toFixed(2) : fallback;
};

export function sanitizeWettbewerbe(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const roh = p.aufschlaege && typeof p.aufschlaege === "object" ? p.aufschlaege : {};
  const aufschlaege = {};
  for (const w of WETTBEWERBE) {
    const v = clamp(roh[w.key], WETTBEWERB_LIMITS.aufschlag, 0);
    // Neutrale Einträge (0) fliegen raus, damit ein Regelwerk klein bleibt und
    // ein Creator-Code nicht mit Nullen zugemüllt wird.
    if (v > 0) aufschlaege[w.key] = v;
  }
  const phasenStufe = clamp(p.phasenStufe, WETTBEWERB_LIMITS.phasenStufe, 0);
  return {
    enabled: p.enabled === true && (Object.keys(aufschlaege).length > 0 || phasenStufe > 0),
    aufschlaege,
    phasenStufe,
  };
}

// Der Aufschlag EINES Spiels: Wettbewerb + K.-o.-Runde, addiert.
// Gibt 0 zurück, wenn nichts eingestellt ist — ein neutrales No-op.
export function wettbewerbAufschlag(match, rules) {
  const cfg = sanitizeWettbewerbe(rules?.wettbewerbe);
  if (!cfg.enabled || !match) return 0;
  const basis = cfg.aufschlaege[wettbewerbVon(match)] ?? 0;
  const rang = PHASE[phaseVon(match)]?.rang ?? 0;
  return +(basis + cfg.phasenStufe * rang).toFixed(3);
}

// ── Die eigentliche Rückmeldung: was kommt am Ende heraus? ──
// Punkte sind in erster Näherung proportional zu (Spiele × Faktor). Genau
// deshalb wird HIER je Spiel gerechnet und nicht je Wettbewerb: eine CL mit
// K.-o.-Runden hat innerhalb desselben Wettbewerbs verschiedene Faktoren.
export function anteile(matches = [], rules) {
  const proWettbewerb = new Map();
  let summe = 0;

  for (const m of matches) {
    const k = wettbewerbVon(m);
    const faktor = 1 + wettbewerbAufschlag(m, rules);
    const e = proWettbewerb.get(k) || { key: k, spiele: 0, gewicht: 0 };
    e.spiele += 1;
    e.gewicht += faktor;
    proWettbewerb.set(k, e);
    summe += faktor;
  }

  const gesamtSpiele = matches.length;
  return WETTBEWERBE
    .filter((w) => proWettbewerb.has(w.key))
    .map((w) => {
      const e = proWettbewerb.get(w.key);
      return {
        key: w.key,
        label: w.label,
        spiele: e.spiele,
        // OHNE Gewichte: reiner Mengenanteil. Der Vergleich der beiden Zahlen
        // ist die eigentliche Aussage — er zeigt, wie viel das Gewicht wirklich
        // verschiebt.
        anteilRoh: gesamtSpiele ? e.spiele / gesamtSpiele : 0,
        anteil: summe ? e.gewicht / summe : 0,
        schnittFaktor: e.spiele ? +(e.gewicht / e.spiele).toFixed(2) : 1,
      };
    })
    .sort((a, b) => b.anteil - a.anteil);
}

// Ein Satz, der die Falle beim Namen nennt — wird in der Oberfläche gezeigt,
// wenn Faktor und tatsächlicher Anteil auseinanderlaufen.
export function anteilHinweis(liste = []) {
  if (liste.length < 2) return "";
  const stark = [...liste].sort((a, b) => b.schnittFaktor - a.schnittFaktor)[0];
  const groesster = liste[0];
  if (stark.key === groesster.key) return "";
  return `${stark.label} zählt je Spiel am meisten (×${stark.schnittFaktor.toFixed(2)}), `
    + `macht aber nur ${Math.round(stark.anteil * 100)} % der Gesamtwertung aus — `
    + `${groesster.label} hat schlicht mehr Spiele.`;
}

// Höchster Aufschlag, den ein einzelnes Spiel durch Wettbewerb + Phase
// erreichen kann. Speist den Maximalfall (Skalierungs-Empfehlung, Deckel).
export function maxWettbewerbAufschlag(rules) {
  const cfg = sanitizeWettbewerbe(rules?.wettbewerbe);
  if (!cfg.enabled) return 0;
  const groesster = Math.max(0, ...Object.values(cfg.aufschlaege));
  const maxRang = Math.max(...Object.values(PHASE).map((p) => p.rang));
  return +(groesster + cfg.phasenStufe * maxRang).toFixed(3);
}

export function beschreibeWettbewerbe(rules) {
  const cfg = sanitizeWettbewerbe(rules?.wettbewerbe);
  if (!cfg.enabled) return "Alle Wettbewerbe zählen gleich.";
  const teile = Object.entries(cfg.aufschlaege)
    .map(([k, v]) => `${WETTBEWERBE.find((w) => w.key === k)?.kurz ?? k} ×${(1 + v).toFixed(2)}`);
  if (cfg.phasenStufe > 0) teile.push(`+${cfg.phasenStufe.toFixed(2)} je K.-o.-Runde`);
  return teile.join(" · ");
}
