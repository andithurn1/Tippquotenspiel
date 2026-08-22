// ============================================================
//  KOMBI-BONUS — wenn Ergebnis UND Torschütze zusammen aufgehen
//  (design/modifikatoren-katalog.md B16 · Andi 21./22.08.2026)
//
//  ── ⚠️ Zuerst eine Richtigstellung ──
//  Die Spec sagt „heute addieren sich beide Teile nur". Das stimmte nicht:
//  `applyCombo` multipliziert die Summe aus Ergebnis- und Tor-Anteil längst
//  mit `rules.combo[ebene]`, sobald ein Schütze getroffen hat. Das
//  Zusammentreffen wird also belohnt.
//
//  Was FEHLTE, ist Andis zweiter Satz — und der trägt die ganze Idee:
//
//    „ist ja klar bei nem 5:1, dass Kane und Olise ein Tor schießen — aber
//     grade dafür … sodass es hier vielleicht nur nen Bonus gibt, wenn bei
//     dem 5:1 auch ein Upamecano trifft."
//
//  Der bestehende Kombi-Faktor ist PAUSCHAL: ein Tipp auf den Stürmer, der
//  ohnehin fast immer trifft, bekommt denselben Aufschlag wie einer auf den
//  Innenverteidiger. Genau das belohnt das Naheliegende.
//
//  ── 🔴 Die Seltenheit steht schon im Snapshot ──
//  Jeder Spieler trägt seine Torschützenquote. Der Aufschlag wird daraus
//  ABGELEITET, nicht eingestellt — damit braucht es keine Sonderregel für
//  „welcher Spieler ist unerwartet": die Frage beantwortet der Markt.
//
//  ── Warum LOGARITHMISCH ──
//  Linear (`q − 1`) wäre der naheliegende Weg und ist falsch: ein Schütze zu
//  15,0 bekäme das 28-Fache eines Schützen zu 1,5 und würde alles andere
//  erschlagen — der Kombi-Bonus wäre in Wahrheit eine zweite
//  Torschützen-Wertung. Der Zehnerlogarithmus hält das Verhältnis
//  proportioniert: 1,5 → 0,18 · 3,0 → 0,48 · 15,0 → 1,18. Eine Zehnerpotenz
//  Quote ist ein voller Schritt, und das lässt sich in einem Satz erklären.
//
//  ── ⚠️ Ebene 1, kein Modifikator ──
//  Der Aufschlag greift IM Kombi-Faktor (`applyCombo`), also in der Wertung
//  dieses Spiels — nicht im additiven Modifikator-Topf. Dort würde ihn
//  `modCap` fressen, und er behauptete, das SPIEL sei besonders, obwohl die
//  KOMBINATION es ist. Dieselbe Grenze wie bei den Randquoten.
//
//  ⏳ **Die Zahlen sind Platzhalter.** `staerke` und `maxAufschlag` gehören ins
//  Balancing und damit in die Endphase (Andi ausdrücklich am 22.08.2026). Hier
//  steht die MECHANIK; sie ist unabhängig von den Zahlen richtig oder falsch.
//  Der Block ist deshalb standardmäßig AUS.
//
//  Reine Funktionen, UI-frei.
// ============================================================

// Welche Ergebnis-Ebene muss stimmen, damit die Kombination zählt?
export const KOMBI_STUFEN = [
  { key: "tendenz", label: "Sieger richtig", desc: "Schon der richtige Sieger genügt — der mildeste Zuschnitt." },
  { key: "abstand", label: "Abstand richtig", desc: "Die Tordifferenz muss stimmen." },
  { key: "exakt", label: "Ergebnis exakt", desc: "Beide Torzahlen müssen stimmen — die seltenste Kombination." },
];

const RANG = { keiner: 0, tendenz: 1, abstand: 2, exakt: 3 };

export const KOMBI_LIMITS = {
  staerke: { min: 0, max: 1, step: 0.05 },
  maxAufschlag: { min: 0, max: 3, step: 0.1 },
  mindestSchuetzen: { min: 1, max: 4, step: 1 },
};

export const DEFAULT_KOMBI = {
  enabled: false,
  stufe: "exakt",
  // ⏳ Balancing-Platzhalter, siehe Kopf. Bewusst in der Mitte des Erlaubten:
  // eine 0 sähe aus wie „aus", eine 1 wie eine Empfehlung.
  staerke: 0.5,
  maxAufschlag: 1,
  mindestSchuetzen: 1,
};

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function sanitizeKombi(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  return {
    enabled: p.enabled === true,
    stufe: KOMBI_STUFEN.some((s) => s.key === p.stufe) ? p.stufe : DEFAULT_KOMBI.stufe,
    staerke: +clamp(p.staerke, KOMBI_LIMITS.staerke, DEFAULT_KOMBI.staerke).toFixed(2),
    maxAufschlag: +clamp(p.maxAufschlag, KOMBI_LIMITS.maxAufschlag, DEFAULT_KOMBI.maxAufschlag).toFixed(2),
    mindestSchuetzen: Math.round(clamp(p.mindestSchuetzen, KOMBI_LIMITS.mindestSchuetzen, DEFAULT_KOMBI.mindestSchuetzen)),
  };
}

// Wie selten war DIESER Treffer? Aus der Quote des Schützen, logarithmisch.
// Ein Doppelpack zählt mit seiner eigenen (höheren) Quote — er ist das
// seltenere Ereignis und muss auch hier das seltenere bleiben.
function seltenheit(eintrag) {
  const q = eintrag?.type === "double"
    ? Number(eintrag.double ?? eintrag.single)
    : Number(eintrag?.anytime);
  if (!Number.isFinite(q) || q <= 1) return 0;
  return Math.log10(q);
}

// Hat dieser Eintrag wirklich getroffen? `scored == null` heißt „angenommen,
// er trifft" — die Vorschau beim Tippen. Bei der Auswertung steht dort die
// echte Toranzahl.
const hatGetroffen = (e) => (e?.scored == null ? true : Number(e.scored) >= 1);

// 🔴 Der Aufschlag auf den Kombi-Faktor. 0 = greift nicht.
//
// `detail` kommt aus `scoreGoals` — dieselbe Liste, aus der auch die
// Tor-Punkte entstehen. Keine zweite Quelle für dieselbe Frage.
export function kombiAufschlag(ebene, detail, rules = {}) {
  const cfg = sanitizeKombi(rules?.kombi);
  if (!cfg.enabled) return 0;
  // Die Ergebnis-Ebene muss mindestens so genau sein wie verlangt.
  if ((RANG[ebene] ?? 0) < (RANG[cfg.stufe] ?? 3)) return 0;

  const treffer = (Array.isArray(detail) ? detail : []).filter(hatGetroffen);
  if (treffer.length < cfg.mindestSchuetzen) return 0;

  // ⚠️ Summiert, nicht gemittelt: zwei seltene Schützen sind seltener als
  // einer. Dass zwei HÄUFIGE Schützen dadurch nicht mehr wiegen als einer
  // seltener, ist genau der Punkt — der Mittelwert würde das verwischen.
  const summe = treffer.reduce((s, e) => s + seltenheit(e), 0);
  return +Math.min(cfg.maxAufschlag, cfg.staerke * summe).toFixed(3);
}

// Ein Satz für die Oberfläche. Ohne ihn ist „Stärke 0,5" eine Zahl ohne
// Bedeutung — dieselbe Rolle wie `anteilHinweis()` bei den Wettbewerben.
export function beschreibeKombi(rules = {}) {
  const cfg = sanitizeKombi(rules?.kombi);
  if (!cfg.enabled) return "Aus — Ergebnis und Torschützen zählen wie bisher zusammen.";
  const stufe = KOMBI_STUFEN.find((s) => s.key === cfg.stufe)?.label ?? cfg.stufe;
  // Zwei Beispiele, die den Unterschied tragen: der sichere Stürmer und der
  // Verteidiger. Die Zahlen sind gerechnet, nicht behauptet.
  const beispiel = (q) => (cfg.staerke * Math.log10(q)).toFixed(2);
  return `Zählt ab „${stufe}“ und ab ${cfg.mindestSchuetzen} Treffer. `
    + `Ein Schütze zu 1,5 bringt +${beispiel(1.5)}, einer zu 15,0 bringt +${beispiel(15)} `
    + `auf den Kombi-Faktor — gedeckelt bei +${cfg.maxAufschlag.toFixed(2)}.`;
}
