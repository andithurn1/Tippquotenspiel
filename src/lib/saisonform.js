// ============================================================
//  SAISONFORM — Gewichtung der Spieltage und Streichresultate
//
//  Zwei Stellschrauben, die dieselbe Frage beantworten: **wie stark darf ein
//  einzelner Spieltag die Saison bestimmen?** Beide greifen NICHT in `scoreTip`,
//  sondern auf die FERTIGEN Spieltagspunkte — dieselbe Bauart wie
//  `catchup.js`, und aus demselben Grund: die Wertung eines Spiels darf nicht
//  davon abhängen, wann in der Saison es liegt oder wie andere Spieltage
//  ausgingen. Sonst wäre ein Tipp nicht mehr für sich bewertbar.
//
//  1) GEWICHTUNG — eine Kurve über die Saison.
//
//     🔴 **ACHTUNG, das ist KEIN Ausgleichsregler.** Beim Bauen stand hier die
//     Begründung „der eleganteste Hebel gegen einen davonziehenden Führenden".
//     Die Messung hat sie umgeworfen (400 Läufe × 34 Spieltage × 12 Tipper):
//
//       Form                          Bester gewinnt   Vorsprung 1./2.
//       flach                              74,0 %           3,66 %
//       Endspurt x2,5 (Stärke konstant)    68,8 %           3,86 %
//       Endspurt x2,5 (mit Formkurven)     53,0 %           4,95 %
//
//     Die Gewichtung senkt den Vorsprung des Führenden nicht, sie VERGRÖSSERT
//     ihn — und kostet massiv Können-Ausdruck. Grund: Gewicht auf einen Teil
//     der Saison zu konzentrieren verkleinert die effektive Stichprobe. Weniger
//     wirksame Spieltage heißt mehr Rauschen, und wer in der schweren Phase
//     zufällig heiß läuft, gewinnt mit größerem Abstand.
//
//     Was sie wirklich ist: ein DRAMATURGIE-Regler („das letzte Drittel
//     entscheidet"). Als Spielgefühl legitim — aber in der Bibliothek gehört
//     sie unter „verstärkend", nie in eine Ausgleichs-Empfehlung.
//
//  2) STREICHRESULTATE — die n schlechtesten Spieltage zählen nicht. Von den
//     beiden das einzige, das tut, was es soll: 6 Streicher senken den
//     Vorsprung von 3,66 auf 3,45 %, bei nur 1,5 Punkten weniger
//     Können-Ausdruck — und die Wirkung hängt NICHT davon ab, ob sich die Form
//     der Spieler ändert (73,0 % in beiden Szenarien).
//
//  ⚠️ **Die Summe der Gewichte bleibt konstant** (Mittelwert 1). Ohne diese
//  Normierung höbe „Endspurt" das gesamte Punkteniveau an, und die
//  Anzeige-Skalierung (`displayScale`) wanderte mit — dieselbe Falle wie bei
//  „Bonus für den Letzten hebt das Niveau, Malus für den Ersten senkt es".
//  Die Kurve verschiebt Gewicht, sie erzeugt keines.
// ============================================================

export const KURVEN = [
  {
    key: "flach",
    label: "Gleichmäßig",
    text: "Jeder Spieltag zählt gleich viel.",
  },
  {
    key: "steigend",
    label: "Langsam steigend",
    text: "Später im Jahr zählt etwas mehr. Ein früher Vorsprung schmilzt von selbst.",
  },
  {
    key: "endspurt",
    label: "Endspurt",
    text: "Das letzte Drittel entscheidet. Bis dahin bleibt fast jeder dran.",
  },
  {
    key: "rueckrunde",
    label: "Rückrunde zählt doppelt",
    text: "Die zweite Saisonhälfte wiegt schwerer — die klassische Halbzeit-Regel.",
  },
];

export const KURVE = Object.fromEntries(KURVEN.map((k) => [k.key, k]));

export const SAISONFORM_LIMITS = {
  streich: { min: 0, max: 8, step: 1 },
  staerke: { min: 1.0, max: 2.5, step: 0.1 },
};

export const DEFAULT_SAISONFORM = {
  kurve: "flach",
  staerke: 1.5,        // wie ausgeprägt die Kurve ist (1.0 = flach, egal welche)
  streich: 0,          // wie viele Spieltage gestrichen werden
  nurGetippte: true,   // siehe unten — die wichtigste Voreinstellung des Moduls
};

function clamp(v, { min, max }, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function sanitizeSaisonform(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const kurve = KURVE[p.kurve] ? p.kurve : DEFAULT_SAISONFORM.kurve;
  return {
    kurve,
    staerke: +clamp(p.staerke, SAISONFORM_LIMITS.staerke, DEFAULT_SAISONFORM.staerke).toFixed(2),
    streich: Math.round(clamp(p.streich, SAISONFORM_LIMITS.streich, DEFAULT_SAISONFORM.streich)),
    // Nur ein ausdrückliches `false` schaltet es ab. Wer das Feld vergisst,
    // bekommt die sichere Variante — siehe die Warnung bei `streichen()`.
    nurGetippte: p.nurGetippte !== false,
  };
}

// ── Die Kurve ───────────────────────────────────────────────
// Liefert für n Spieltage n Faktoren mit Mittelwert 1. `staerke` spreizt sie:
// 1.0 ist immer flach, 2.5 ist die stärkste erlaubte Spreizung.
export function gewichte(kurve, anzahl, staerke = DEFAULT_SAISONFORM.staerke) {
  const n = Math.max(0, Math.floor(anzahl));
  if (!n) return [];
  const s = Math.max(1, Number(staerke) || 1);
  // Rohform je Kurve, danach auf Mittelwert 1 normiert.
  const roh = Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1);         // 0 … 1 über die Saison
    switch (kurve) {
      case "steigend":   return 1 + (s - 1) * (t - 0.5);
      case "endspurt":   return t >= 2 / 3 ? s : 1;
      case "rueckrunde": return t >= 0.5 ? s : 1;
      default:           return 1;
    }
  });
  const summe = roh.reduce((a, b) => a + b, 0);
  // Mittelwert exakt 1: die Kurve verschiebt Gewicht, sie erzeugt keines.
  return roh.map((f) => +(f * n / summe).toFixed(6));
}

// ── Streichen ───────────────────────────────────────────────
// ⚠️ **Die Falle, an der dieses Feature sonst scheitert:** Streichresultate
// machen das AUSLASSEN kostenlos. Wer einen Spieltag gar nicht tippt, hat dort
// null Punkte — genau der Wert, der am ehesten gestrichen wird. Damit wird aus
// der Regel „ein Ausrutscher wird verziehen" ein „zwei Spieltage darfst du
// schwänzen", und das arbeitet direkt gegen `versaeumnis`, das denselben Fall
// mit einem Ersatz-Tipp und einem Malus abdeckt.
//
// Deshalb streicht `nurGetippte: true` (Vorgabe) ausschließlich Spieltage, an
// denen tatsächlich getippt wurde. Ein verpasster Spieltag bleibt stehen.
function streichIndizes(werte, streich, nurGetippte) {
  if (!(streich > 0)) return new Set();
  // ⚠️ Es bleibt IMMER mindestens ein Spieltag stehen. Sonst stehen am 2.
  // Spieltag einer Runde mit „3 Streichern" alle bei null Punkten, und die
  // Tabelle ist so lange leer, bis genug Spieltage zusammen sind. Ein
  // Zwischenstand, der aus Regelgründen nicht existiert, sieht wie ein Fehler
  // aus — und der Spieler kann nicht wissen, dass er keiner ist.
  const moeglich = Math.min(streich, Math.max(0, werte.length - 1));
  if (!moeglich) return new Set();
  const kandidaten = werte
    .map((w, i) => ({ i, punkte: w.punkte, getippt: w.getippt !== false }))
    .filter((w) => (nurGetippte ? w.getippt : true))
    // Der schlechteste zuerst; bei Gleichstand der frühere, damit das Ergebnis
    // nicht an der Eingabereihenfolge hängt.
    .sort((a, b) => a.punkte - b.punkte || a.i - b.i)
    .slice(0, moeglich);
  return new Set(kandidaten.map((k) => k.i));
}

// ── Anwenden ────────────────────────────────────────────────
// `spieltage` = [{ key, punkte, getippt }] in CHRONOLOGISCHER Reihenfolge.
// Gibt die gewichtete Summe zurück, dazu was gestrichen wurde und mit welchem
// Faktor jeder Spieltag zählte — die Aufschlüsselung ist der halbe Wert der
// Sache, sonst wirkt ein springender Zwischenstand willkürlich.
export function anwenden(spieltage = [], saisonform = DEFAULT_SAISONFORM) {
  const cfg = sanitizeSaisonform(saisonform);
  const liste = Array.isArray(spieltage) ? spieltage : [];
  const f = gewichte(cfg.kurve, liste.length, cfg.staerke);

  // Gestrichen wird nach dem GEWICHTETEN Wert: ein schwacher Spieltag mit
  // hohem Gewicht kostet mehr als ein schwacher mit niedrigem, und genau den
  // will man loswerden. Nach rohen Punkten zu streichen verschenkte den
  // teuersten Ausrutscher.
  const gewichtet = liste.map((s, i) => ({
    ...s, faktor: f[i] ?? 1, punkte: (Number(s.punkte) || 0) * (f[i] ?? 1),
  }));
  const raus = streichIndizes(gewichtet, cfg.streich, cfg.nurGetippte);

  let total = 0;
  const detail = gewichtet.map((s, i) => {
    const gestrichen = raus.has(i);
    if (!gestrichen) total += s.punkte;
    return { key: s.key, faktor: +s.faktor.toFixed(3), punkte: +s.punkte.toFixed(2), gestrichen };
  });

  return {
    total: +total.toFixed(2),
    detail,
    gestrichen: detail.filter((d) => d.gestrichen).map((d) => d.key),
    // Solange die Saison läuft, kann sich ändern, WELCHER Spieltag gestrichen
    // wird — ein schlechterer kann noch kommen. Der Zwischenstand ist deshalb
    // vorläufig, und das muss die Oberfläche sagen dürfen.
    vorlaeufig: cfg.streich > 0,
  };
}

// Ein Satz für die Spielerstellung. Ohne ihn ist die Kurve eine Zahl, mit ihm
// eine Aussage — dieselbe Rolle wie `anteilHinweis()` bei den
// Wettbewerbs-Gewichten.
export function beschreibeSaisonform(saisonform = DEFAULT_SAISONFORM, spieltage = 34) {
  const cfg = sanitizeSaisonform(saisonform);
  const teile = [];
  if (cfg.kurve !== "flach" && cfg.staerke > 1) {
    const f = gewichte(cfg.kurve, spieltage, cfg.staerke);
    const ersterZehnter = f.slice(0, Math.max(1, Math.round(spieltage / 10)));
    const letzterZehnter = f.slice(-Math.max(1, Math.round(spieltage / 10)));
    const mittel = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const verhaeltnis = mittel(letzterZehnter) / mittel(ersterZehnter);
    teile.push(`${KURVE[cfg.kurve].label}: die letzten Spieltage zählen etwa `
      + `${verhaeltnis.toFixed(1)}× so viel wie die ersten.`);
  }
  if (cfg.streich > 0) {
    teile.push(`Die ${cfg.streich} schlechtesten Spieltage zählen nicht`
      + (cfg.nurGetippte ? " — aber nur solche, an denen du getippt hast." : "."));
  }
  return teile.length ? teile.join(" ") : "Jeder Spieltag zählt gleich viel.";
}

// ── Anbindung an den Verlauf ────────────────────────────────
// `verlauf` = [{ wettbewerb, matchday, board }] aus `scoreLeaderboardHistory`,
// `board` = [{ userId, name, total, … }] als KUMULATIVER Stand.
//
// Die Saisonform braucht Punkte JE SPIELTAG, der Verlauf hält Summen — die
// Differenz zum Vorstand liefert sie. Danach wird der Verlauf mit den neu
// gewichteten Summen überschrieben.
//
// ⚠️ **Reihenfolge gegenüber dem Aufhol-Bonus:** Saisonform ZUERST, Catchup
// danach. Der Anschluss-Bonus reagiert auf den Rückstand — und der soll die
// Gewichtung und die Streicher schon enthalten, sonst gleicht er einen
// Abstand aus, den es nach den Regeln der Runde gar nicht gibt.
//
// ⚠️ **Nicht getippt ist nicht dasselbe wie null Punkte.** Ein Spieler, der
// einen Spieltag ausgelassen hat, erscheint im kumulativen Board mit
// unveränderter Summe — die Differenz ist 0, aber das ist keine Leistung von 0,
// sondern eine Nichtteilnahme. `gewertet` unterscheidet beides; ohne diese
// Unterscheidung würde `nurGetippte` wirkungslos.
// Die Punkte der Spieltage OHNE Kurve und ohne Streicher — der Bezugswert für
// die `form`-Marke unten.
function rohSumme(tage = []) {
  return tage.reduce((s, t) => s + (Number(t.punkte) || 0), 0);
}

export function applySaisonform(verlauf = [], rules = {}) {
  const cfg = sanitizeSaisonform(rules?.saisonform);
  const aus = cfg.kurve === "flach" && !(cfg.streich > 0);
  if (aus || !Array.isArray(verlauf) || verlauf.length === 0) return verlauf;

  // Je Nutzer die Punkte jedes Spieltags aus den kumulativen Ständen holen.
  const proNutzer = new Map();
  verlauf.forEach((stufe, i) => {
    const vorher = i > 0 ? verlauf[i - 1].board : [];
    const vorSumme = new Map(vorher.map((z) => [z.userId, z.total]));
    const vorGewertet = new Map(vorher.map((z) => [z.userId, z.gewertet ?? 0]));
    for (const z of stufe.board) {
      if (!proNutzer.has(z.userId)) proNutzer.set(z.userId, []);
      proNutzer.get(z.userId).push({
        key: `${stufe.wettbewerb ?? ""}#${stufe.matchday}`,
        punkte: z.total - (vorSumme.get(z.userId) ?? 0),
        // Getippt heißt: an diesem Spieltag kam mindestens eine Wertung dazu.
        getippt: (z.gewertet ?? 0) > (vorGewertet.get(z.userId) ?? 0),
      });
    }
  });

  // Für jede Stufe des Verlaufs neu aufsummieren — mit genau den Spieltagen,
  // die BIS DAHIN gespielt sind. Der Zwischenstand muss aus sich heraus
  // stimmen, nicht aus der Sicht des Saisonendes.
  return verlauf.map((stufe, i) => ({
    ...stufe,
    board: stufe.board
      .map((z) => {
        const tage = (proNutzer.get(z.userId) ?? []).slice(0, i + 1);
        const r = anwenden(tage, cfg);
        // 🔴 GERUNDET. `anwenden` rechnet mit zwei Nachkommastellen (die Kurve
        // multipliziert), und dieser Wert landet direkt im Ranking. Gemessen am
        // 06.08.2026 stand dort „5049.67" — in einer Punktetabelle, in der jede
        // andere Zahl ganzzahlig ist. Gerundet wird HIER und nicht in der
        // Anzeige: sonst zeigt das Ranking 5050 und der Abstand zum Nächsten
        // rechnet sich aus 5049,67.
        const total = Math.round(r.total);
        const gestrichenPunkte = Math.round(
          r.detail.filter((d) => d.gestrichen).reduce((sum, d) => sum + d.punkte, 0));
        return {
          ...z, total,
          // Mit an die Zeile, weil der Spieler sonst eine Summe sieht, die
          // nicht zu seinen Spieltagen passt, und sich das nicht erklären kann.
          // Dieselbe Regel wie bei den Ertragsquellen: was die Punktzahl
          // verändert, bekommt einen Namen.
          gestrichen: r.gestrichen.length,
          // ⚠️ Auch der BETRAG, nicht nur die Anzahl. „−2 gestrichen" sagt
          // niemandem, warum die Summe um 958 Punkte niedriger ist als die
          // eigenen Spieltage — das ist dieselbe Lücke, die die `form`-Marke
          // daneben schließt. Gezählt wird gewichtet, also so, wie es die
          // Wertung auch verrechnet hat.
          gestrichenPunkte: gestrichenPunkte,
          vorlaeufig: r.vorlaeufig,
          // 🔴 Was die KURVE verändert hat, in Punkten. Die Streicher hatten
          // längst einen Namen, die Kurve nicht — sie verschob den Stand
          // gemessen um bis zu 186 Punkte, ohne dass irgendwo etwas stand.
          // `null`, wenn die Kurve flach ist: dann gibt es nichts zu erklären.
          //
          // ⚠️ Als REST gerechnet, nicht als eigene Summe. Eine erste Fassung
          // nahm `total − rohSumme` — darin steckte der Streicher-Effekt mit
          // drin, der daneben schon als `gestrichenPunkte` abgezogen wird.
          // `npm run anzeige` hat es sofort gemeldet: bei Kurve UND Streichern
          // blieben 1361 Punkte doppelt gezählt. So herum geht die Gleichung
          // auf, die ein Spieler im Kopf aufmacht:
          //     eigene Punkte + Kurve − Streicher = Stand
          form: cfg.kurve === "flach"
            ? null
            : total + gestrichenPunkte - Math.round(rohSumme(tage)),
        };
      })
      .sort((a, b) => b.total - a.total || String(a.name ?? "").localeCompare(String(b.name ?? ""))),
  }));
}
