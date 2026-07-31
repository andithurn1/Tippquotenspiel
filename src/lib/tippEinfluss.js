// ============================================================
//  TIPP-EINFLUSS — die Runde bewegt die Quote (Totalisator-Anteil)
//
//  Admin-Option, standardmäßig AUS. Reizvoll, weil sie Herdenverhalten von
//  selbst bestraft: wer tippt, was alle tippen, bekommt weniger — ohne
//  Modifikator, ohne Malus, ohne dass jemand eine Regel erklären muss.
//
//  ── Die Kalibrierung, um die sich alles dreht ──────────────
//  Der Nutzer hat sie in einem Satz geliefert: *„im normalen Markt wäre ja ein
//  Tippender marginal."* Genau das ist der Maßstab. Ein Totalisator, in dem ein
//  einzelner Tipp die Quote sichtbar bewegt, ist nicht falsch gebaut — ihm
//  fehlt die MARKTGRÖSSE. An einer Börse steht ein Einsatz gegen Millionen, in
//  einer Zwölfer-Runde stünde er gegen elf.
//
//  Deshalb NICHT „Gruppe gegen Markt", sondern die Gruppe wird dem Markt
//  hinzugerechnet:
//
//      p = p_markt · (1 − a)  +  p_gruppe · a
//      a = staerke · n / (n + marktTiefe)
//
//  `marktTiefe` ist der eigentliche Regler: gegen wie viele „virtuelle
//  Mitspieler" tritt die Runde an. Bei 200 bewegt ein Tipp in einer
//  Zwölfer-Runde Bruchteile eines Prozents, bei 10 wird es spürbar. Der
//  Unterschied zwischen Würze und Chaos ist damit eine Zahl.
//
//  ── Drei Regeln, die nicht gebrochen werden dürfen ─────────
//
//  1. **Gerechnet wird EINMAL, beim Schließen des Tipp-Fensters.** Live
//     nachzurechnen baut ein Wettrennen — früh zu tippen wäre besser oder
//     schlechter, je nachdem. Nach Anpfiff zu rechnen ändert den Wert
//     abgegebener Tipps rückwirkend. Beides ist verboten; es gibt genau dieses
//     eine Fenster.
//
//  2. **Die eigene Stimme zählt nicht gegen die eigene Quote** (`ohneUserId`).
//     Sonst bestraft sich, wer den Favoriten tippt, fürs Mittippen — und in
//     einer kleinen Runde merkt er das sofort. Das Verfahren ist trotzdem für
//     alle gleich: jeder wird nach den Tipps der ÜBRIGEN bepreist, und zwei
//     Spieler mit demselben Tipp bekommen deshalb exakt denselben Preis.
//
//  3. **Unter `minTipper` Tippern greift gar nichts.** Bei drei Tippern ist die
//     Gruppenverteilung reines Rauschen, und Rauschen als Marktmeinung
//     auszugeben wäre schlechter als nichts.
//
//  ── Was NICHT verschoben wird ──────────────────────────────
//  Nur das ERGEBNIS-Raster. Die 1X2-Quoten bleiben unangetastet — sie sind der
//  Marktpreis und der äußere Anker der Runde. Die Gruppe bewegt also die feinen
//  Preise (welcher Endstand), nicht die Grundwahrheit (wer gewinnt). Damit
//  bleibt Architektur-Regel 4 erfüllt: der Anker hängt weiter am REALEN
//  Ergebnis und ist für alle gleich.
// ============================================================

export const TIPPEINFLUSS_LIMITS = {
  staerke: { min: 0, max: 1, step: 0.05 },
  marktTiefe: { min: 5, max: 500, step: 5 },
  minTipper: { min: 3, max: 50, step: 1 },
};

export const DEFAULT_TIPPEINFLUSS = {
  staerke: 0,        // 0 = aus, und das ist die Vorgabe
  marktTiefe: 200,   // „gegen wie viele virtuelle Mitspieler"
  minTipper: 8,
};

function clamp(v, { min, max }, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function sanitizeTippEinfluss(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  return {
    staerke: +clamp(p.staerke, TIPPEINFLUSS_LIMITS.staerke, DEFAULT_TIPPEINFLUSS.staerke).toFixed(2),
    marktTiefe: Math.round(clamp(p.marktTiefe, TIPPEINFLUSS_LIMITS.marktTiefe, DEFAULT_TIPPEINFLUSS.marktTiefe)),
    minTipper: Math.round(clamp(p.minTipper, TIPPEINFLUSS_LIMITS.minTipper, DEFAULT_TIPPEINFLUSS.minTipper)),
  };
}

// Wie stark wirkt die Gruppe bei n Tipps? Das Herzstück der Kalibrierung.
export function mischAnteil(n, cfg = DEFAULT_TIPPEINFLUSS) {
  const c = sanitizeTippEinfluss(cfg);
  if (!(c.staerke > 0) || n < c.minTipper) return 0;
  return +(c.staerke * (n / (n + c.marktTiefe))).toFixed(6);
}

// Die Tipps der Runde als Verteilung über das Raster. Tipps außerhalb (z. B.
// 7:2) fallen weg — sie hätten im 6×6-Raster keinen Platz und würden die
// Normierung verzerren.
export function gruppenVerteilung(tipps = [], grid = 6) {
  const zaehler = new Map();
  let gesamt = 0;
  for (const t of tipps) {
    const h = Number(t?.tip?.home), a = Number(t?.tip?.away);
    if (!Number.isInteger(h) || !Number.isInteger(a)) continue;
    if (h < 0 || a < 0 || h >= grid || a >= grid) continue;
    const k = `${h}:${a}`;
    zaehler.set(k, (zaehler.get(k) ?? 0) + 1);
    gesamt++;
  }
  return { zaehler, gesamt };
}

// ── Das gemischte Raster ────────────────────────────────────
// `raster` = 6×6 QUOTEN (wie `snapshot.correctScore`). Zurück kommt ein neues
// Raster derselben Form. Ohne Wirkung (Stärke 0, zu wenige Tipper) wird das
// Original unverändert zurückgegeben — identisch, nicht nur gleich.
export function mischeRaster({
  raster, tipps = [], cfg = DEFAULT_TIPPEINFLUSS,
  ohneUserId = null, overround = 1.07, cap = 200,
} = {}) {
  if (!Array.isArray(raster) || !raster.length) return raster;

  // Die eigene Stimme heraus — siehe Regel 2 im Kopf.
  const relevant = ohneUserId ? tipps.filter((t) => t?.userId !== ohneUserId) : tipps;
  const { zaehler, gesamt } = gruppenVerteilung(relevant, raster.length);
  const a = mischAnteil(gesamt, cfg);
  if (!(a > 0) || !gesamt) return raster;

  const grid = raster.length;
  // Marktseite: Quoten → Wahrscheinlichkeiten, auf das Raster normiert.
  const markt = [];
  let summeMarkt = 0;
  for (let h = 0; h < grid; h++) {
    markt[h] = [];
    for (let x = 0; x < grid; x++) {
      const q = Number(raster[h][x]);
      const p = q > 1 ? 1 / q : 0;
      markt[h][x] = p;
      summeMarkt += p;
    }
  }
  if (!(summeMarkt > 0)) return raster;

  const out = [];
  for (let h = 0; h < grid; h++) {
    out[h] = [];
    for (let x = 0; x < grid; x++) {
      const pM = markt[h][x] / summeMarkt;
      const pG = (zaehler.get(`${h}:${x}`) ?? 0) / gesamt;
      const p = pM * (1 - a) + pG * a;
      // Dieselbe Marge wieder aufschlagen wie im Original — verschoben wird die
      // VERTEILUNG, nicht das Preisniveau. Sonst wäre eine Runde mit
      // Tipp-Einfluss insgesamt mehr oder weniger wert als eine ohne.
      out[h][x] = p > 0
        ? Math.min(cap, Math.max(1.01, +(1 / (p * overround)).toFixed(2)))
        : cap;
    }
  }
  return out;
}

// Ein Satz für die Spielerstellung: was bedeutet die Einstellung konkret?
// Ohne diese Rückmeldung stellt ein Admin eine Zahl ein und weiß nicht, ob
// daraus Würze oder Chaos wird — dieselbe Rolle wie `anteile()` bei den
// Wettbewerbs-Gewichten.
export function beschreibeTippEinfluss(cfg = DEFAULT_TIPPEINFLUSS, mitglieder = 12) {
  const c = sanitizeTippEinfluss(cfg);
  if (!(c.staerke > 0)) return "Aus — es gelten allein die Marktquoten.";
  if (mitglieder < c.minTipper) {
    return `Aus, solange weniger als ${c.minTipper} Leute tippen `
      + `(ihr seid ${mitglieder}). Zu wenige Tipps wären Rauschen, keine Marktmeinung.`;
  }
  const a = mischAnteil(mitglieder, c);
  const prozent = (a * 100).toFixed(1);
  // Was bewegt EIN einzelner Tipp? Genau die Frage, um die es geht.
  const einer = (a / mitglieder * 100).toFixed(2);
  return `Bei ${mitglieder} Tippern zählt die Runde zu ${prozent} % mit; `
    + `ein einzelner Tipp verschiebt eine Ergebnis-Quote um rund ${einer} %.`;
}

// ── Anbindung an die Wertung ────────────────────────────────
// `entries` = die Roh-Einträge, aus denen die Engine rechnet
// (`{ userId, matchId, tip, snapshot, result, … }`). Zurück kommen dieselben
// Einträge, deren `snapshot.correctScore` die Tipps der Runde einrechnet.
//
// ⚠️ **Warum hier und nicht beim Speichern des Tipps:** die Mischung darf erst
// feststehen, wenn ALLE Tipps da sind (Regel 1 im Kopf). Würde sie beim
// Abgeben gespeichert, hinge der Wert eines Tipps davon ab, wie viele vor ihm
// getippt haben — genau das Wettrennen, das ausgeschlossen sein soll. Hier
// dagegen wird sie aus dem fertigen Tippfeld GERECHNET, jedes Mal gleich, und
// muss nirgends abgelegt werden.
//
// Dass dabei nur abgerechnete Spiele betroffen sind, ergibt sich von selbst:
// gewertet wird nur mit `result`, und ein Ergebnis gibt es erst nach Anpfiff —
// also nach dem Schließen des Tipp-Fensters.
export function mitTippEinfluss(entries = [], rules = {}) {
  const cfg = sanitizeTippEinfluss(rules?.tippEinfluss);
  if (!(cfg.staerke > 0) || !Array.isArray(entries) || !entries.length) return entries;

  // Tipps je Spiel sammeln — die Mischung ist eine Eigenschaft der BEGEGNUNG,
  // nicht des einzelnen Tipps.
  const proMatch = new Map();
  for (const e of entries) {
    const id = e?.matchId ?? e?.snapshot?.matchId;
    if (!id) continue;
    if (!proMatch.has(id)) proMatch.set(id, []);
    proMatch.get(id).push({ userId: e.userId, tip: e.tip });
  }

  return entries.map((e) => {
    const id = e?.matchId ?? e?.snapshot?.matchId;
    const raster = e?.snapshot?.correctScore;
    if (!id || !Array.isArray(raster)) return e;
    const gemischt = mischeRaster({
      raster, tipps: proMatch.get(id) ?? [], cfg,
      // Die eigene Stimme heraus — siehe Regel 2.
      ohneUserId: e.userId,
      overround: Number(e.snapshot.marge) > 1 ? Number(e.snapshot.marge) : 1.07,
    });
    // Unverändert? Dann auch denselben Eintrag zurück, kein neues Objekt.
    if (gemischt === raster) return e;
    return { ...e, snapshot: { ...e.snapshot, correctScore: gemischt, tippEinfluss: true } };
  });
}
