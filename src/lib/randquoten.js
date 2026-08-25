// ============================================================
//  RANDQUOTEN — was zahlt ein Endstand, für den es keine Quote gibt?
//  (design/randquoten.md · Andi, 22.08.2026)
//
//  ── 🔴 Der Befund, der dazu geführt hat ──
//  Das Ergebnis-Raster endete bei 0…5 Toren, der Stepper der Tippabgabe lässt
//  aber 0…9 zu. Fehlte die Quote, rechnete `scoreResult` den Nähe-Teil als
//  **0** — gemessen über den Katalog: 1,65 % der Spiele enden außerhalb, und
//  ein exakt getipptes 6:0 zahlte **47** Punkte, wo ein exakt getipptes 5:1
//  **1440** zahlt. Der seltenere Treffer war der billigere.
//
//  ⚠️ Es traf nicht nur den, der so tippt: der Anker ist das REALE Ergebnis
//  (Architektur-Regel 4). Ein wildes 6:2 löschte die Nähe-Ebene für ALLE
//  Mitspieler dieses Spiels.
//
//  ── Zwei Antworten, und diese Datei ist die zweite ──
//  1. Das ERZEUGTE Raster ist seit 22.08.2026 9×9 (`oddsGenerator.js`).
//  2. Für alles darüber — und für Snapshots aus dem MARKT, die bauartbedingt
//     6×6 bleiben (`rasterAusMarkt` verlangt ein zu 80 % gefülltes Buch, und
//     kein Buchmacher quotiert 81 Endstände) — schreibt diese Datei den Rand
//     fort.
//
//  ── 🔴 Die Falle, gemessen statt vermutet ──
//  Der Zerfall darf NICHT aus der letzten Rasterstufe geschätzt werden. Dort
//  staut sich, was darüber hinausgeht. Beispiel RB Leipzig – Gladbach,
//  Randverteilung des Gastes:
//
//      0,3094  0,3646  0,1917  0,0738  0,0315  0,0289
//                                         └───────┘  „Zerfall" 0,92
//
//  Das ist kein Schwanz, das ist die Kante. Die sauberen Stützstellen liegen
//  davor (0,0738 → 0,0315 = 0,427). Deshalb wird die LETZTE Stufe beim
//  Schätzen übersprungen.
//
//  ── Vier Leitplanken ──
//  1. **Markiert.** Jede fortgeschriebene Zahl kommt mit `geschaetzt: true`
//     zurück — wie `spielerQuelle` oder `torschnittQuelle`. Eine Schätzung,
//     die wie ein Marktpreis aussieht, ist schlimmer als keine.
//  2. **Monoton.** Der Zerfallsfaktor wird auf (0, 0.9] gekappt: 7:0 zahlt
//     immer mehr als 6:0, nie weniger.
//  3. **Gedeckelt.** Nie über die höchste Quote des Rasters hinaus (mindestens
//     aber `CAP`) — ein 9:0 darf nicht ins Unendliche laufen.
//  4. **Nicht farmbar.** Der Anker bleibt das reale Ergebnis; ein Tipp auf 8:0
//     zahlt nur, wenn es wirklich 8:0 steht. Die Kante lässt sich nicht
//     ansteuern, deshalb braucht es hier keine Sperre.
//
//  Reine Funktionen, UI-frei, keine Engine-Abhängigkeit.
// ============================================================

// Höchste Quote, die eine Fortschreibung erreichen darf, wenn das Raster
// selbst keine höhere kennt. Dieselbe Zahl wie `cap` in `oddsGenerator.js`.
export const CAP = 200;

// Der Zerfall wird aus zwei Stützstellen VOR der letzten geschätzt (siehe
// Kopf). Weniger als drei Werte lassen keine saubere Schätzung zu — dann
// bleibt es beim vorsichtigen Standard.
const STANDARD_ZERFALL = 0.45;
const MAX_ZERFALL = 0.9;

// Aus einer Quoten-Reihe (kleine Quote = wahrscheinlich) den Zerfall der
// WAHRSCHEINLICHKEIT schätzen. Reihen kommen als Quoten herein, weil der
// Snapshot sie so trägt.
export function zerfallAusQuoten(quoten) {
  const p = (quoten ?? []).map((q) => (Number(q) > 0 ? 1 / Number(q) : 0));
  // Die letzte Stufe überspringen: dort staut sich der abgeschnittene Rest.
  const sauber = p.slice(0, Math.max(0, p.length - 1));
  if (sauber.length < 2) return STANDARD_ZERFALL;
  const b = sauber[sauber.length - 1];
  const a = sauber[sauber.length - 2];
  if (!(a > 0) || !(b > 0)) return STANDARD_ZERFALL;
  const r = b / a;
  if (!Number.isFinite(r) || r <= 0) return STANDARD_ZERFALL;
  return Math.min(MAX_ZERFALL, r);
}

const deckel = (reihe) => {
  const werte = (reihe ?? []).map(Number).filter((q) => Number.isFinite(q) && q > 0);
  return Math.max(CAP, ...(werte.length ? werte : [0]));
};

// ── Eine Reihe fortschreiben (Team-Tore, Abstand) ────────────
// `reihe` = Quoten je Index (0 Tore, 1 Tor, …). Liegt der Index drin, kommt
// die echte Quote zurück; sonst die fortgeschriebene.
export function reihenQuote(reihe, index) {
  const arr = Array.isArray(reihe) ? reihe : [];
  const i = Math.max(0, Math.floor(Number(index) || 0));
  if (i < arr.length) {
    const q = Number(arr[i]);
    return Number.isFinite(q) && q > 0 ? { quote: q, geschaetzt: false } : { quote: null, geschaetzt: false };
  }
  if (!arr.length) return { quote: null, geschaetzt: false };
  const letzte = Number(arr[arr.length - 1]);
  if (!Number.isFinite(letzte) || letzte <= 0) return { quote: null, geschaetzt: false };
  const r = zerfallAusQuoten(arr);
  const schritte = i - (arr.length - 1);
  // Quote = 1/p, also wächst sie mit 1/r je Schritt.
  const quote = Math.min(deckel(arr), letzte / Math.pow(r, schritte));
  return { quote: +quote.toFixed(2), geschaetzt: true };
}

// ── Das Ergebnis-Raster fortschreiben ────────────────────────
// Außerhalb wird je Achse fortgeschrieben: erst waagerecht bis zur Kante,
// dann senkrecht. Beide Richtungen benutzen den Zerfall IHRER Achse, gemessen
// an der jeweiligen Randverteilung.
export function ergebnisQuote(snap, heim, gast) {
  const cs = snap?.correctScore;
  if (!Array.isArray(cs) || !cs.length) return { quote: null, geschaetzt: false };
  const h = Math.max(0, Math.floor(Number(heim) || 0));
  const a = Math.max(0, Math.floor(Number(gast) || 0));
  const maxH = cs.length - 1;
  const maxA = Math.max(...cs.map((z) => (Array.isArray(z) ? z.length : 0))) - 1;

  if (h <= maxH && a <= maxA) {
    const q = Number(cs[h]?.[a]);
    return Number.isFinite(q) && q > 0 ? { quote: q, geschaetzt: false } : { quote: null, geschaetzt: false };
  }

  // Randverteilungen als Quoten-Reihen, um denselben Schätzer zu benutzen.
  // ⚠️ Über die Wahrscheinlichkeit summiert, nicht über die Quoten: Quoten
  // sind Kehrwerte, ihre Summe bedeutet nichts.
  const pSumme = (werte) => werte.reduce((s, q) => s + (Number(q) > 0 ? 1 / Number(q) : 0), 0);
  const randHeim = cs.map((z) => pSumme(z ?? []));
  const randGast = [];
  for (let i = 0; i <= maxA; i++) randGast[i] = pSumme(cs.map((z) => z?.[i]));
  const alsQuoten = (p) => p.map((x) => (x > 0 ? 1 / x : 0));

  const rH = zerfallAusQuoten(alsQuoten(randHeim));
  const rA = zerfallAusQuoten(alsQuoten(randGast));

  const basisH = Math.min(h, maxH);
  const basisA = Math.min(a, maxA);
  const basis = Number(cs[basisH]?.[basisA]);
  if (!Number.isFinite(basis) || basis <= 0) return { quote: null, geschaetzt: false };

  const schritteH = h - basisH;
  const schritteA = a - basisA;
  const quote = basis / (Math.pow(rH, schritteH) * Math.pow(rA, schritteA));
  const grenze = Math.max(CAP, ...cs.flat().map(Number).filter((q) => Number.isFinite(q) && q > 0));
  return { quote: +Math.min(grenze, quote).toFixed(2), geschaetzt: true };
}

// ⛔ `istGeschaetzt(snap, h, a)` stand hier bis zum 25.08.2026 — als bequeme
// Abkürzung für die Oberfläche. Gelöscht, nicht angeschlossen: jede der drei
// Stellen, die die Markierung braucht, braucht auch die QUOTE, und die
// bekommt sie nur von `ergebnisQuote`. Eine zweite Formulierung derselben
// Frage hätte nur eine zweite Wahrheit werden können.
