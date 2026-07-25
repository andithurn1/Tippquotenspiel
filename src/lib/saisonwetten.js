// ============================================================
//  SAISON-WETTEN — die nebenbei laufenden Langzeit-Tipps
//
//  Neben dem Spieltags-Tippen läuft eine zweite, ruhige Ebene: „Wer wird
//  Torschützenkönig?", „Welches Team kassiert die meisten Karten?", „Wer
//  stellt den besten Torschützen AUSSER Bayern?". Einmal vor der Saison
//  getippt, am Ende abgerechnet.
//
//  Drei Entwurfs-Entscheidungen:
//
//  1) KEINE QUOTEN NÖTIG. Für Langzeitwetten gibt es in den günstigen
//     Quoten-Quellen ohnehin nichts Verlässliches. Deshalb vergibt der ADMIN
//     die Punkte je Wette (schwer zu treffen = mehr Punkte) und ein
//     Gesamtgewicht bestimmt, wie stark die Saison-Ebene gegenüber den
//     Spieltagen zählt. Wer will, kann sie ganz abschalten.
//
//  2) KONSTRUIERBAR statt fest verdrahtet. Jede Wette ist ein TYP plus
//     Parameter — „Torschützenkönig" wird mit `ausser: ["FC Bayern München"]`
//     zu „bester Torschütze außer Bayern". So entstehen aus wenigen Typen
//     viele Wetten, ohne neuen Code.
//
//  3) JEDE WETTE DEKLARIERT IHRE DATEN. `braucht` sagt, welche Statistik zur
//     Auswertung nötig ist. Unsere Ergebnisse tragen heute nur Tore und
//     Torschützen — Karten und Fouls sind vorbereitet, aber erst auswertbar,
//     wenn die Ergebnis-Daten sie liefern. Lieber ehrlich gesperrt als still
//     falsch gewertet.
//
//  Reine Funktionen, UI-frei. Die Engine kennt keine Vereinsnamen — die
//  kommen als Daten herein (Architektur-Regel 3).
// ============================================================

// Welche Statistiken unsere Ergebnisse heute hergeben.
export const VERFUEGBARE_STATISTIKEN = ["tore", "torschuetzen"];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

// ── Hilfen: Saison-Tabellen aus den Ergebnissen ─────────────
// `matches` = [{ home, away, result:{home,away,playerGoals}, snapshot }]

// Tabelle: Punkte, Tore, Gegentore je Team.
export function tabelle(matches = []) {
  const t = new Map();
  const zeile = (team) => {
    if (!t.has(team)) t.set(team, { team, punkte: 0, tore: 0, gegentore: 0, siege: 0, unentschieden: 0, spiele: 0 });
    return t.get(team);
  };
  for (const m of matches) {
    if (!m?.result) continue;
    const h = zeile(m.home), a = zeile(m.away);
    const th = m.result.home, ta = m.result.away;
    h.spiele++; a.spiele++;
    h.tore += th; h.gegentore += ta;
    a.tore += ta; a.gegentore += th;
    if (th > ta) { h.punkte += 3; h.siege++; }
    else if (th < ta) { a.punkte += 3; a.siege++; }
    else { h.punkte++; a.punkte++; h.unentschieden++; a.unentschieden++; }
  }
  return [...t.values()];
}

// Sortierte Tabelle mit Rang. Der Vereinsname als LETZTES Kriterium ist kein
// Sportrecht, sondern sorgt dafür, dass die Reihenfolge bei völlig gleichen
// Werten reproduzierbar bleibt — sonst hinge ein Rang an der Einlesereihenfolge.
export function rangliste(matches = []) {
  return tabelle(matches)
    .map((t) => ({ ...t, diff: t.tore - t.gegentore }))
    .sort((a, b) =>
      b.punkte - a.punkte || b.diff - a.diff || b.tore - a.tore || a.team.localeCompare(b.team))
    .map((t, i) => ({ ...t, rang: i + 1 }));
}

// Torschützen-Liste: Spieler → { tore, team }. Die Team-Zuordnung kommt aus
// dem Snapshot des jeweiligen Spiels (dort steht, wer zu welchem Kader gehört).
export function torschuetzen(matches = []) {
  const s = new Map();
  for (const m of matches) {
    const pg = m?.result?.playerGoals;
    if (!pg) continue;
    for (const [spieler, tore] of Object.entries(pg)) {
      const imHeim = Boolean(m.snapshot?.players?.home?.[spieler]);
      const team = imHeim ? m.home : (m.snapshot?.players?.away?.[spieler] ? m.away : null);
      if (!s.has(spieler)) s.set(spieler, { spieler, tore: 0, team });
      const e = s.get(spieler);
      e.tore += Number(tore) || 0;
      if (!e.team && team) e.team = team;
    }
  }
  return [...s.values()];
}

// Größter Wert gewinnt; bei Gleichstand zählen ALLE Gleichauf-Sieger (dann
// gewinnt auch, wer einen davon getippt hat — fairer als willkürlich zu wählen).
function bestenListe(eintraege, wert, richtung = "max") {
  if (!eintraege.length) return [];
  const werte = eintraege.map(wert);
  const beste = richtung === "min" ? Math.min(...werte) : Math.max(...werte);
  return eintraege.filter((e, i) => werte[i] === beste);
}

// ── Der Wett-Katalog ────────────────────────────────────────
// `antwort`: worauf getippt wird ("team" | "spieler")
// `braucht`: benötigte Statistik(en)
// `parameter`: welche Feineinstellungen der Admin setzen darf
// `ermitteln(matches, wette)`: die tatsächlichen Gewinner (Array von Strings)
export const WETT_TYPEN = [
  {
    key: "meister", label: "Meister", antwort: "team", braucht: ["tore"], parameter: [],
    hint: "Wer steht am Ende ganz oben?", standardPunkte: 300,
    ermitteln: (m) => bestenListe(tabelle(m), (t) => t.punkte).map((t) => t.team),
  },
  {
    key: "letzter", label: "Letzter Platz", antwort: "team", braucht: ["tore"], parameter: [],
    hint: "Wer schließt die Tabelle ab?", standardPunkte: 300,
    ermitteln: (m) => bestenListe(tabelle(m), (t) => t.punkte, "min").map((t) => t.team),
  },
  {
    key: "beste-offensive", label: "Meiste Tore (Team)", antwort: "team", braucht: ["tore"], parameter: ["ausser"],
    hint: "Welche Mannschaft trifft am häufigsten?", standardPunkte: 250,
    ermitteln: (m, w) => bestenListe(ohneTeams(tabelle(m), w), (t) => t.tore).map((t) => t.team),
  },
  {
    key: "beste-defensive", label: "Wenigste Gegentore", antwort: "team", braucht: ["tore"], parameter: ["ausser"],
    hint: "Welche Abwehr hält am besten dicht?", standardPunkte: 250,
    ermitteln: (m, w) => bestenListe(ohneTeams(tabelle(m), w), (t) => t.gegentore, "min").map((t) => t.team),
  },
  {
    key: "remis-koenig", label: "Meiste Unentschieden", antwort: "team", braucht: ["tore"], parameter: [],
    hint: "Wer teilt am häufigsten die Punkte?", standardPunkte: 350,
    ermitteln: (m) => bestenListe(tabelle(m), (t) => t.unentschieden).map((t) => t.team),
  },
  {
    key: "torschuetzenkoenig", label: "Torschützenkönig", antwort: "spieler",
    braucht: ["torschuetzen"], parameter: ["ausser"],
    hint: "Wer trifft am häufigsten? Mit „außer“ wird daraus z. B. „bester Schütze ohne den Titelfavoriten“.",
    standardPunkte: 400,
    ermitteln: (m, w) => bestenListe(ohneTeams(torschuetzen(m), w), (s) => s.tore).map((s) => s.spieler),
  },
  {
    key: "team-des-torschuetzenkoenigs", label: "Team des Torschützenkönigs", antwort: "team",
    braucht: ["torschuetzen"], parameter: ["ausser"],
    hint: "Welcher Verein stellt den besten Schützen? Mit „außer“ die spannendere Variante.",
    standardPunkte: 300,
    ermitteln: (m, w) => bestenListe(ohneTeams(torschuetzen(m), w), (s) => s.tore).map((s) => s.team).filter(Boolean),
  },
  // ── Vorbereitet, aber noch nicht auswertbar ──
  // Unsere Ergebnisse tragen keine Karten/Fouls. Sobald die Ergebnis-Daten sie
  // liefern (`result.karten` / `result.fouls` je Team), werden diese Typen
  // automatisch verfügbar — die Auswertung steht schon.
  {
    key: "meiste-karten", label: "Meiste Karten", antwort: "team", braucht: ["karten"], parameter: [],
    hint: "Welches Team sammelt am meisten Gelb und Rot?", standardPunkte: 300,
    ermitteln: (m) => bestenListe(teamStatistik(m, "karten"), (t) => t.wert).map((t) => t.team),
  },
  {
    key: "meiste-fouls", label: "Meiste Fouls", antwort: "team", braucht: ["fouls"], parameter: [],
    hint: "Wer geht am robustesten zu Werke?", standardPunkte: 300,
    ermitteln: (m) => bestenListe(teamStatistik(m, "fouls"), (t) => t.wert).map((t) => t.team),
  },
];

// Teams aus einer Liste ausschließen (für den „außer"-Parameter).
function ohneTeams(liste, wette) {
  const raus = new Set(wette?.ausser ?? []);
  if (!raus.size) return liste;
  return liste.filter((e) => !raus.has(e.team));
}

// Beliebige Team-Statistik aus den Ergebnissen summieren (Karten, Fouls, …).
// Erwartet `result[feld] = { home: n, away: n }`.
function teamStatistik(matches = [], feld) {
  const t = new Map();
  const add = (team, wert) => t.set(team, { team, wert: (t.get(team)?.wert ?? 0) + wert });
  for (const m of matches) {
    const s = m?.result?.[feld];
    if (!s) continue;
    add(m.home, Number(s.home) || 0);
    add(m.away, Number(s.away) || 0);
  }
  return [...t.values()];
}

export const WETT_TYP = Object.fromEntries(WETT_TYPEN.map((w) => [w.key, w]));

// Ist dieser Typ mit den heutigen Ergebnis-Daten auswertbar?
export function istAuswertbar(key) {
  const typ = WETT_TYP[key];
  return Boolean(typ) && typ.braucht.every((b) => VERFUEGBARE_STATISTIKEN.includes(b));
}

export const AUSWERTBARE_TYPEN = WETT_TYPEN.filter((w) => istAuswertbar(w.key));

// ── Regelwerk-Teil ──────────────────────────────────────────
export const SAISON_LIMITS = {
  gewicht: { min: 0.1, max: 3, step: 0.1 },   // wie stark die Saison-Ebene zählt
  punkte: { min: 50, max: 2000, step: 50 },   // Punkte je einzelner Wette
  maxWetten: 8,
};

export const DEFAULT_SAISON = { enabled: false, gewicht: 1, wetten: [] };

export function sanitizeSaison(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const L = SAISON_LIMITS;
  const roh = Array.isArray(p.wetten) ? p.wetten : [];
  const gesehen = new Set();
  const wetten = [];
  for (const w of roh) {
    const typ = WETT_TYP[w?.key];
    if (!typ) continue;                       // unbekannter Typ fliegt raus
    const id = `${w.key}|${(w.ausser ?? []).slice().sort().join(",")}`;
    if (gesehen.has(id)) continue;            // dieselbe Wette nicht doppelt
    gesehen.add(id);
    const eintrag = {
      key: typ.key,
      punkte: clamp(Math.round(num(w.punkte, typ.standardPunkte) / L.punkte.step) * L.punkte.step, L.punkte.min, L.punkte.max),
    };
    if (typ.parameter.includes("ausser")) {
      const ausser = Array.isArray(w.ausser)
        ? [...new Set(w.ausser.filter((t) => typeof t === "string" && t.trim()))].slice(0, 5)
        : [];
      if (ausser.length) eintrag.ausser = ausser;
    }
    wetten.push(eintrag);
    if (wetten.length >= L.maxWetten) break;
  }
  return {
    enabled: p.enabled === true,
    gewicht: clamp(num(p.gewicht, DEFAULT_SAISON.gewicht), L.gewicht.min, L.gewicht.max),
    wetten,
  };
}

// Lesbarer Name einer konkreten Wette (inkl. „außer"-Zusatz).
export function wettenLabel(wette) {
  const typ = WETT_TYP[wette?.key];
  if (!typ) return "Unbekannte Wette";
  if (wette.ausser?.length) return `${typ.label} (außer ${wette.ausser.join(", ")})`;
  return typ.label;
}

// ── Auswertung ──────────────────────────────────────────────
// `tipps` = { [wettenId]: "getippter Wert" }; die Id ist `wettenId(wette)`.
export function wettenId(wette) {
  return wette.ausser?.length ? `${wette.key}:${wette.ausser.slice().sort().join("+")}` : wette.key;
}

// Wertet ALLE Saison-Wetten eines Nutzers aus.
// Rückgabe: { gesamt, treffer, zeilen: [{ id, label, getippt, richtig, punkte, gewinner, auswertbar }] }
export function scoreSaison({ matches = [], tipps = {}, saison = DEFAULT_SAISON }) {
  const s = sanitizeSaison(saison);
  if (!s.enabled) return { gesamt: 0, treffer: 0, zeilen: [] };

  const zeilen = s.wetten.map((wette) => {
    const typ = WETT_TYP[wette.key];
    const id = wettenId(wette);
    const auswertbar = istAuswertbar(wette.key);
    const gewinner = auswertbar ? typ.ermitteln(matches, wette) : [];
    const getippt = tipps[id] ?? null;
    const richtig = Boolean(getippt) && gewinner.includes(getippt);
    const punkte = richtig ? Math.round(wette.punkte * s.gewicht) : 0;
    return { id, key: wette.key, label: wettenLabel(wette), getippt, richtig, punkte, gewinner, auswertbar };
  });

  return {
    gesamt: zeilen.reduce((sum, z) => sum + z.punkte, 0),
    treffer: zeilen.filter((z) => z.richtig).length,
    zeilen,
  };
}

// ── Empfehlungen (Presets) ──────────────────────────────────
// Fertige Zusammenstellungen, damit ein Admin nicht bei null anfängt.
export const SAISON_PRESETS = [
  {
    key: "klassisch", label: "Klassisch",
    desc: "Die drei Fragen, die jeder im Freundeskreis sowieso diskutiert.",
    saison: {
      enabled: true, gewicht: 1,
      wetten: [
        { key: "meister", punkte: 300 },
        { key: "torschuetzenkoenig", punkte: 400 },
        { key: "letzter", punkte: 300 },
      ],
    },
  },
  {
    key: "kenner", label: "Für Kenner",
    desc: "Weniger offensichtlich — hier gewinnt, wer die Liga wirklich verfolgt.",
    saison: {
      enabled: true, gewicht: 1.2,
      wetten: [
        { key: "beste-defensive", punkte: 350 },
        { key: "remis-koenig", punkte: 450 },
        { key: "team-des-torschuetzenkoenigs", punkte: 300 },
        { key: "beste-offensive", punkte: 250 },
      ],
    },
  },
  {
    key: "ohne-favorit", label: "Ohne den Titelfavoriten",
    desc: "Die spannenden Varianten: Wer ist der Beste, wenn man den Serienmeister herausrechnet?",
    saison: {
      enabled: true, gewicht: 1,
      wetten: [
        { key: "meister", punkte: 200 },
        { key: "torschuetzenkoenig", punkte: 400, ausser: ["FC Bayern München"] },
        { key: "team-des-torschuetzenkoenigs", punkte: 350, ausser: ["FC Bayern München"] },
        { key: "beste-offensive", punkte: 300, ausser: ["FC Bayern München"] },
      ],
    },
  },
  {
    key: "nebenbei", label: "Nur nebenbei",
    desc: "Zwei Wetten, gering gewichtet — Würze, ohne die Spieltage zu überlagern.",
    saison: {
      enabled: true, gewicht: 0.5,
      wetten: [
        { key: "meister", punkte: 300 },
        { key: "torschuetzenkoenig", punkte: 400 },
      ],
    },
  },
];
