// ============================================================
//  JOKER-BIBLIOTHEK — kuratierte Kombinationen + Achsenprofil
//
//  Baustein 3 aus design/joker-oekonomie.md. Zwei Dinge liegen hier:
//
//  1. `KOMBINATIONEN` — sechs fertige Joker-Ökonomien (Budget +
//     Limitierungsklassen + Duell-Joker), die sich mit einem Wertungs-Preset
//     aus `presets.js` zu einem Namen zusammensetzen: `<Erstname>-<Kombiname>`,
//     z. B. "underdog-party-sparflamme". Erstname = die WERTUNG (presets.js),
//     Kombiname = die JOKER-ÖKONOMIE (hier).
//
//     ⚠️ `joker` (der klassische Joker aus `presets.js`) gehört NICHT hierher.
//     `presets.js` setzt dieses Feld bereits ("Joker", "Rangliste") — würde
//     die Ökonomie es ebenfalls setzen, überschriebe die Auswahl einer
//     Kombination still die Wertung, und das zweiachsige Codeschema
//     `<Wertung>-<Ökonomie>` wäre eine Lüge (design/gehaeuse-ui.md 4b).
//
//  2. `achsenProfil(rules)` — der Ersatz für eine einzelne „Würze"-Zahl
//     (design/joker-oekonomie.md 3.1b, design/joker-inventar.md Abschnitt 3).
//     Statt EINER Lautstärke gibt es sechs Achsen (Risiko · Fokus ·
//     Dramaturgie · Sozial · Ausdauer · Wissen), und geprüft wird JE ACHSE:
//     hoch + hoch auf DERSELBEN Achse ist ein Zusammenstoß, hoch auf
//     verschiedenen Achsen ist es nicht. Ein hoher Underdog-Modifikator (A)
//     und ein aktiver Duell-Joker (D) stören sich nicht — genau der Fall, an
//     dem eine nackte Summe scheitern würde.
//
//  ── ⚠️ GESCHÄTZT, nicht gemessen ──
//  Die Zuordnung „welches Feld zählt wie stark auf welche Achse" (Beitrags-
//  tabelle unten, aus design/joker-inventar.md Abschnitt 3.1) ist eine
//  Annahme, keine Messung. Sie ist die bessere Schätzung als eine nackte
//  Würze-Summe, weil sie eine überprüfbare Behauptung macht (dieselbe Achse
//  verstärkt sich) — aber eine Schätzung bleibt es. `npm run balance` kann sie
//  widerlegen; bis dahin verengt sie nichts (kein Regler, keine Grenze, keine
//  Sperre), sie ist nur ein Hinweis wie das Empfehlungsband.
//
//  ── `presets.js` wird NICHT angefasst ──
//  Kein `wuerze`- oder `achsen`-Feld dort, und auch die sechs Kombinationen
//  hier tragen kein deklariertes Profil. `achsenProfil(rules)` LEITET das
//  Profil aus einem vollständigen Regelwerk ab — jedes Preset UND jede
//  Kombination hier IST ein (Teil-)Regelwerk. Ein zusätzlich hingeschriebenes
//  Feld wäre eine zweite Wahrheit, die beim nächsten Tuning auseinanderläuft
//  (dieselbe Regel wie bei `reglerWarnung.js`s Empfehlungsband).
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { sanitizeRules } from "./engine";
import { sanitizeBudget } from "./jokerBudget";
import { sanitizeLimitKlassen } from "./limitKlassen";
import { sanitizeDuellJoker } from "./duellJoker";
import { EREIGNIS } from "./ereignisse";
import { PRESETS } from "./presets";

// ── Kataloge ────────────────────────────────────────────────

export const ACHSEN = [
  { key: "A", label: "Risiko", desc: "Außenseiter tippen, hohe Quoten wagen — der Mutige gewinnt." },
  { key: "B", label: "Fokus", desc: "Die richtigen Spiele auswählen und schwerpunkten — der Taktierer gewinnt." },
  { key: "C", label: "Dramaturgie", desc: "Zum richtigen Zeitpunkt stark sein — der Spätzünder gewinnt." },
  { key: "D", label: "Sozial", desc: "Interaktion mit Mitspielern — der Aufmerksame gewinnt." },
  { key: "E", label: "Ausdauer", desc: "Dabeibleiben, nichts auslassen — der Verlässliche gewinnt." },
  { key: "F", label: "Wissen", desc: "Detailkenntnis — der Kenner im engeren Sinn gewinnt." },
];

// ⚠️ Alle `desc` hier sind SICHTBARER Text in der Spielerstellung.
// Zwei Regeln, beide im Browser-Durchgang am 31.07. verletzt aufgefallen:
//   1. „Diamanten", nie „Budget" (design/waehrungen.md Abschnitt 2).
//   2. Keine Code-Bezeichner. Hier stand „nurGegenFuehrende" mitten im Satz.
// Kataloge werden ungeprüft angezeigt — Tests fangen so etwas nicht.
export const NEIGUNGEN = [
  { key: "neutral", label: "Neutral", desc: "Keine Zielrichtung: gleich viele Diamanten für alle, jeder darf jeden treffen." },
  { key: "ausgleich", label: "Ausgleichend", desc: "Einsätze treffen nur, wer vorne steht — das bremst den Vorsprung, ohne die Diamanten selbst umzuverteilen." },
  { key: "underdog", label: "Underdog", desc: "Diamanten UND Ziele bevorzugen ausdrücklich, wer hinten liegt." },
];

export const DICHTEN = [
  { key: "sparsam", label: "Sparsam", desc: "Wenige Mechanismen gleichzeitig aktiv." },
  { key: "mittel", label: "Mittel", desc: "Ein ausgewogenes Bündel an Mechanismen." },
  { key: "dicht", label: "Dicht", desc: "Viele Mechanismen gleichzeitig aktiv — höherer Aufwand." },
];

export const SCHAERFEN = [
  { key: "zahm", label: "Zahm", desc: "Milde Einsätze, feste oder sanft steigende Preise." },
  { key: "scharf", label: "Scharf", desc: "Harte Einsätze, steil steigende oder knappheitsgetriebene Preise." },
];

// ── 3.2: der Startkatalog, nach Würze aufsteigend sortiert ──
// Jede Kombination trägt ein vollständiges Regelfragment
// { budget, limitKlassen, duell } — kein `joker`-Feld (siehe Kopfkommentar:
// das gehört der Wertung, nicht der Ökonomie) und kein eigenes `wuerze`- oder
// `achsen`-Feld (siehe Kopfkommentar). `neigung`/`dichte`/`schaerfe` sind
// dokumentierender Text (Katalog-Schlüssel oben), keine Balance-Aussage.
export const KOMBINATIONEN = [
  {
    key: "sparflamme",
    label: "Sparflamme",
    desc: "Fast aus. Der Partner für eine laute Wertung.",
    neigung: "neutral",
    dichte: "sparsam",
    schaerfe: "zahm",
    budget: { enabled: false },
    limitKlassen: [],
    duell: { enabled: false },
  },
  {
    key: "nadelstiche",
    label: "Nadelstiche",
    desc: "Wenige, aber harte Einsätze. Steigende Preise.",
    neigung: "neutral",
    dichte: "sparsam",
    schaerfe: "scharf",
    budget: {
      enabled: true,
      quellen: [{ typ: "gleich", betrag: 5 }],
      takt: "spieltag",
      verfall: "deckel",
      maxAnsparen: 15,
      preise: { "duell.klau": 8 },
      preisModus: "steigend",
      steigerung: 2.0,
    },
    limitKlassen: [],
    duell: {
      enabled: true,
      typen: ["klau"],
      phase: "letztesDrittel",
      anzahl: 2,
      klau: { anteil: 0.5, modus: "nullsumme" },
      zielWahl: "frei",
    },
  },
  {
    key: "gleichgewicht",
    label: "Gleichgewicht",
    desc: "Der Normalfall. Gleich viele Diamanten für alle, Angriffe nur im letzten Drittel.",
    neigung: "ausgleich",
    dichte: "mittel",
    schaerfe: "zahm",
    budget: {
      enabled: true,
      quellen: [{ typ: "gleich", betrag: 10 }],
      takt: "spieltag",
      verfall: "deckel",
      maxAnsparen: 30,
      preise: { "duell.klau": 5 },
      preisModus: "fix",
    },
    limitKlassen: [
      {
        id: "letztes-drittel",
        label: "Angriffe im letzten Drittel",
        mitglieder: ["duell.klau"],
        max: 3,
        proZeitraum: "saison",
        aktivierung: { typ: "fenster", von: 24, bis: 34 },
      },
    ],
    duell: {
      enabled: true,
      typen: ["klau"],
      phase: "letztesDrittel",
      anzahl: 2,
      klau: { anteil: 0.35, modus: "nullsumme" },
      zielWahl: "nurVorne",
    },
  },
  {
    key: "schlussoffensive",
    label: "Schluss-Offensive",
    desc: "Alles im Schlussspurt — die Diamanten sparen sich bis dahin an.",
    neigung: "ausgleich",
    dichte: "sparsam",
    schaerfe: "scharf",
    budget: {
      enabled: true,
      quellen: [{ typ: "gleich", betrag: 10 }],
      takt: "saison",
      verfall: "deckel",
      maxAnsparen: 60,
      preise: { "duell.klau": 10, "duell.block": 10 },
      preisModus: "steigend",
      steigerung: 2.5,
    },
    limitKlassen: [],
    duell: {
      enabled: true,
      typen: ["klau", "block"],
      phase: "schlussspurt",
      schlussLaenge: 4,
      anzahl: 3,
      klau: { anteil: 0.6, modus: "nullsumme" },
      block: { restanteil: 0.3, nurGewinn: true, beute: 0 },
      zielWahl: "nurVorne",
    },
  },
  {
    key: "favoritenjagd",
    label: "Favoriten-Jagd",
    desc: "Diamanten für den Rückstand, Angriffe nur nach vorne. Die Runde jagt den Ersten.",
    neigung: "underdog",
    dichte: "mittel",
    schaerfe: "scharf",
    budget: {
      enabled: true,
      quellen: [{ typ: "rueckstand", proPunktRueckstand: 1, deckel: 20 }],
      takt: "spieltag",
      verfall: "deckel",
      maxAnsparen: 40,
      preise: { "duell.klau": 6 },
      preisModus: "knappheit",
      steigerung: 1.8,
    },
    limitKlassen: [
      {
        id: "gegen-fuehrende",
        label: "Nur gegen die Führenden",
        mitglieder: ["duell.klau"],
        max: 5,
        proZeitraum: "saison",
        aktivierung: { typ: "nurGegenFuehrende", plaetze: 3 },
      },
    ],
    duell: {
      enabled: true,
      typen: ["klau"],
      phase: "letztesDrittel",
      anzahl: 3,
      klau: { anteil: 0.5, modus: "nullsumme" },
      zielWahl: "nurVorne",
    },
  },
  {
    key: "rundumschlag",
    label: "Rundumschlag",
    desc: "Viele kleine Einsätze aus einem großzügigen Münzstrom, gebündelt in einem "
      + "gemeinsamen Kontingent. Der lebhafte Modus — höchster Aufwand, Rating beachten.",
    neigung: "neutral",
    dichte: "dicht",
    schaerfe: "zahm",
    budget: {
      enabled: true,
      quellen: [{ typ: "gleich", betrag: 15 }],
      takt: "spieltag",
      verfall: "deckel",
      maxAnsparen: 30,
      preise: { "duell.klau": 3, "duell.block": 3, "joker.einzel": 2, "joker.ranking": 2 },
      preisModus: "fix",
    },
    limitKlassen: [
      {
        id: "gesamt",
        label: "Gesamtkontingent",
        mitglieder: ["duell.klau", "duell.block", "joker.einzel"],
        max: 10,
        proZeitraum: "saison",
        aktivierung: { typ: "immer" },
      },
    ],
    duell: {
      enabled: true,
      typen: ["klau", "block"],
      phase: "ganze",
      anzahl: 4,
      klau: { anteil: 0.25, modus: "nullsumme" },
      block: { restanteil: 0.6, nurGewinn: true, beute: 0 },
      zielWahl: "frei",
    },
  },
];

// ── achsenProfil ─────────────────────────────────────────────
// Beitragstabelle wörtlich aus design/joker-inventar.md Abschnitt 3.1. Jeder
// Beitrag prüft zuerst sein `enabled` — eine ausgeschaltete Ebene trägt immer
// 0 bei. `rules` darf ein FREI zusammengestelltes (Teil-)Regelwerk sein:
// `sanitizeRules` füllt fehlende Felder aus `DEFAULT_RULES`, `duell` läuft
// separat durch `sanitizeDuellJoker` (kein Teil von `sanitizeRules`, siehe
// design/joker-oekonomie.md Abschnitt 6, Schritt 5 — die Anbindung ans
// Regelwerk ist dort als NOCH ZU TUN markiert).
function addBeitrag(sammlung, achse, feld, wert) {
  if (wert > 0) sammlung[achse].push({ feld, wert });
}

export function achsenProfil(rules) {
  const r = sanitizeRules(rules);
  const duell = sanitizeDuellJoker(rules?.duell);

  const beitraege = { A: [], B: [], C: [], D: [], E: [], F: [] };

  // A · Risiko
  addBeitrag(beitraege, "A", "underdogBoost", r.underdogBoost >= 1.6 ? 2 : r.underdogBoost > 1.0 ? 1 : 0);
  if (r.joker.mut.enabled) {
    addBeitrag(beitraege, "A", "joker.mut.faktor", r.joker.mut.faktor > 1.15 ? 2 : r.joker.mut.faktor > 1.0 ? 1 : 0);
  }
  addBeitrag(beitraege, "A", "wrongPenalty", r.wrongPenalty >= -1 ? 1 : 0);
  addBeitrag(beitraege, "A", "minPayout", r.minPayout <= 1 ? 1 : 0);

  // B · Fokus
  if (r.joker.enabled) {
    addBeitrag(beitraege, "B", "joker.faktor", r.joker.faktor >= 2.5 ? 2 : r.joker.faktor > 1.5 ? 1 : 0);
  }
  if (r.bigGame.enabled) {
    addBeitrag(beitraege, "B", "bigGame.aufschlag", r.bigGame.aufschlag >= 0.6 ? 1 : 0);
  }
  addBeitrag(beitraege, "B", "teamMods.derbyFaktor", r.teamMods.derbyFaktor > 1.3 ? 1 : 0);
  addBeitrag(beitraege, "B", "wettbewerbe.enabled", r.wettbewerbe.enabled ? 1 : 0);

  // C · Dramaturgie
  addBeitrag(beitraege, "C", "saisonform.kurve",
    r.saisonform.kurve !== "flach" ? (r.saisonform.staerke >= 2.0 ? 2 : 1) : 0);
  if (r.aufholen.enabled) {
    addBeitrag(beitraege, "C", "aufholen.enabled", r.aufholen.staerke >= 0.4 ? 2 : 1);
  }
  if (duell.enabled) {
    addBeitrag(beitraege, "C", "duell.phase",
      duell.phase === "letztesDrittel" || duell.phase === "schlussspurt" ? 1 : 0);
  }

  // D · Sozial
  if (duell.enabled) {
    addBeitrag(beitraege, "D", "duell.enabled", duell.typen.includes("block") ? 2 : 1);
    addBeitrag(beitraege, "D", "duell.zielWahl", duell.zielWahl === "frei" ? 1 : 0);
  }
  addBeitrag(beitraege, "D", "joker.abstimmung", r.joker.abstimmung === true ? 1 : 0);
  if (r.joker.heimat.enabled) {
    addBeitrag(beitraege, "D", "joker.heimat.enabled", 1);
  }

  // E · Ausdauer
  addBeitrag(beitraege, "E", "saisonform.streich",
    r.saisonform.streich > 3 ? 2 : r.saisonform.streich > 0 ? 1 : 0);
  if (r.versaeumnis.enabled) {
    addBeitrag(beitraege, "E", "versaeumnis.enabled", 1);
  }
  if (r.ereignisse.enabled) {
    const anzahlMeilenstein = r.ereignisse.aktive
      .filter((a) => EREIGNIS[a.key]?.kategorie === "meilenstein").length;
    addBeitrag(beitraege, "E", "ereignisse.meilenstein", anzahlMeilenstein >= 3 ? 2 : anzahlMeilenstein >= 1 ? 1 : 0);
  }

  // F · Wissen
  if (r.markets.goals.enabled) {
    const namenJeSpiel = r.markets.goals.modus === "proTeam"
      ? r.markets.goals.picksPerTeam * 2
      : r.markets.goals.picksProSpiel;
    addBeitrag(beitraege, "F", "markets.goals.enabled", namenJeSpiel >= 4 ? 2 : namenJeSpiel >= 1 ? 1 : 0);
  }
  if (r.saison.enabled) {
    addBeitrag(beitraege, "F", "saison.enabled", r.saison.gewicht >= 1.5 ? 2 : 1);
  }
  addBeitrag(beitraege, "F", "combo.exakt", r.combo.exakt >= 3 ? 1 : 0);

  const profil = {};
  for (const achse of Object.keys(beitraege)) {
    const quellen = beitraege[achse];
    const summe = quellen.reduce((s, b) => s + b.wert, 0);
    profil[achse] = { wert: Math.min(3, summe), quellen: quellen.map((b) => b.feld) };
  }
  return profil;
}

// ── achsenKonflikte ──────────────────────────────────────────
// Meldet NUR Achsen mit Wert 3 UND mindestens zwei beitragenden Quellen —
// eine einzelne Ebene auf Anschlag ist eine Entscheidung, zwei auf derselben
// Achse ein Zusammenstoß. Verschiedene Achsen melden NIE etwas, auch wenn
// beide auf 3 stehen (design/joker-inventar.md Abschnitt 3, design/
// joker-oekonomie.md 3.1b — der ganze Sinn der Umstellung).
//
// ⚠️ Auch diese Zuordnung ist geschätzt, nicht gemessen (siehe Kopfkommentar
// dieser Datei) — `npm run balance` kann sie widerlegen.
export function achsenKonflikte(profil) {
  const out = [];
  const p = profil && typeof profil === "object" ? profil : {};
  for (const achse of Object.keys(p)) {
    const eintrag = p[achse];
    if (!eintrag || eintrag.wert !== 3 || !Array.isArray(eintrag.quellen) || eintrag.quellen.length < 2) continue;
    const info = ACHSEN.find((a) => a.key === achse);
    const label = info ? `${info.label} (${achse})` : achse;
    out.push({
      achse,
      stufe: eintrag.wert,
      text: `Achse ${label} steht auf Anschlag, weil mehrere Quellen gleichzeitig ziehen: `
        + `${eintrag.quellen.join(", ")}. Geschätzt, nicht gemessen — durch \`npm run balance\` widerlegbar.`,
    });
  }
  return out;
}

// ── Code-Schema: <Erstname>-<Kombiname> ─────────────────────
// Erstname = Preset-Key (presets.js, die WERTUNG), Kombiname = Key aus
// KOMBINATIONEN (die JOKER-ÖKONOMIE). Kein Saison-/Jahreskürzel.
export function bildeCode(presetKey, kombiKey) {
  return `${presetKey}-${kombiKey}`;
}

// ⚠️ Die Falle: Preset-Schlüssel enthalten Bindestriche ("underdog-party"),
// Kombi-Schlüssel nicht. Zerlegt wird deshalb am LETZTEN Bindestrich, danach
// werden BEIDE Teile gegen ihre Kataloge geprüft — unbekannte Teile ergeben
// `null`, nie ein geratenes Ergebnis.
export function zerlegeCode(code) {
  if (typeof code !== "string" || !code.length) return null;
  const idx = code.lastIndexOf("-");
  if (idx < 0) return null;
  const presetKey = code.slice(0, idx);
  const kombiKey = code.slice(idx + 1);
  if (!presetKey || !kombiKey) return null;
  if (!PRESETS.some((p) => p.key === presetKey)) return null;
  if (!KOMBINATIONEN.some((k) => k.key === kombiKey)) return null;
  return { presetKey, kombiKey };
}

// Ein Satz für die UI, Muster `beschreibeDuell`/`beschreibeBasis`.
export function beschreibeKombination(kombi) {
  const k = kombi && typeof kombi === "object" ? kombi : {};
  const neigungText = NEIGUNGEN.find((n) => n.key === k.neigung)?.label ?? k.neigung ?? "?";
  const dichteText = DICHTEN.find((d) => d.key === k.dichte)?.label ?? k.dichte ?? "?";
  const schaerfeText = SCHAERFEN.find((s) => s.key === k.schaerfe)?.label ?? k.schaerfe ?? "?";
  return `„${k.label}“: ${k.desc} (${neigungText}, ${dichteText}, ${schaerfeText}.)`;
}
