// ============================================================
//  SPIELPLAN — echte Termine übernehmen statt sie zu erzeugen
//
//  Der Launch am 28.08.2026 hängt an dieser Datei. Alle 1605 Spiele im Katalog
//  sind heute erzeugt (Circle-Methode in `ligaGenerator.js`); für den Betrieb
//  müssen die vier Ligen ihre ECHTEN Kalender bekommen, sonst tippen Spieler
//  auf Begegnungen, die es nie gibt.
//
//  ── Warum das eine eigene Datei ist ──
//  Ein echter Spielplan kommt von außen: abgetippt, kopiert, konvertiert. Genau
//  dort passieren Fehler, die man erst im Dezember merkt — ein Verein doppelt
//  an einem Spieltag, ein fehlender Spieltag, ein Klubname mit anderer
//  Schreibweise als in den Ratings. Der Generator kann das nicht falsch machen,
//  ein Import schon. Deshalb wird jeder echte Plan GEPRÜFT, bevor er eine
//  Saison wird, und der Import bricht bei einem Fehler ab, statt still eine
//  halbe Saison zu bauen.
//
//  ── Die Trennung, auf die es ankommt ──
//  ECHT ist nur, was hier hereinkommt: Paarungen, Spieltage, Anstoßzeiten.
//  Quoten, Ergebnisse und Torschützen bleiben erzeugt, solange keine Quoten-API
//  angebunden ist. Deshalb trägt jedes Match seine Herkunft (`echterSpielplan`)
//  und die Oberfläche liest sie ab — simulierte Daten dürfen nie wie echte
//  aussehen, und ein Spielplan, der halb echt ist, ist die gefährlichste Form
//  davon.
//
//  Reine Funktionen, UI-frei, kennt keine Ligennamen (Architektur-Regel 3).
// ============================================================

const zeit = (v) => {
  const t = new Date(v ?? "").getTime();
  return Number.isFinite(t) ? t : null;
};

// Ein Eintrag des Rohplans auf die Form bringen, die `baueLiga` erwartet.
// Namen werden getrimmt, aber NICHT umgeschrieben: eine automatische Korrektur
// („Bayern" → „FC Bayern München") würde raten, und ein falsch geratener Klub
// fällt nirgends mehr auf. Unbekannte Namen sollen als Fehler auffallen.
export function normalisiereSpielplan(roh = []) {
  return roh
    .map((e) => ({
      matchday: Number(e?.matchday),
      home: String(e?.home ?? "").trim(),
      away: String(e?.away ?? "").trim(),
      kickoff: e?.kickoff ?? null,
    }))
    .sort((a, b) => (zeit(a.kickoff) ?? 0) - (zeit(b.kickoff) ?? 0));
}

// Prüft einen echten Spielplan gegen die Klubliste der Liga.
//
// FEHLER blockieren den Import — mit ihnen wäre die Saison nachweislich falsch.
// WARNUNGEN nicht: ein unvollständiger Plan ist während der Vorbereitung normal
// (die Rückrunde steht oft noch nicht), und eine Warnung, die den Import
// verhindert, führt nur dazu, dass jemand die Prüfung ganz abschaltet.
export function pruefeSpielplan(spielplan = [], teams = []) {
  const fehler = [];
  const warnungen = [];
  const bekannt = new Set(teams);
  const proSpieltag = new Map();
  const paarungen = new Map();

  if (!spielplan.length) {
    return { ok: false, fehler: ["Der Spielplan ist leer."], warnungen };
  }

  for (const [i, s] of spielplan.entries()) {
    const wo = `Zeile ${i + 1} (${s.home || "?"} – ${s.away || "?"})`;
    if (!Number.isInteger(s.matchday) || s.matchday < 1) fehler.push(`${wo}: kein gültiger Spieltag.`);
    if (zeit(s.kickoff) == null) fehler.push(`${wo}: Anstoßzeit nicht lesbar (${s.kickoff ?? "fehlt"}).`);
    if (s.home && s.home === s.away) fehler.push(`${wo}: ein Verein spielt gegen sich selbst.`);
    for (const name of [s.home, s.away]) {
      // Der häufigste Importfehler und der teuerste: eine abweichende
      // Schreibweise erzeugt still einen Verein, den es in den Ratings nicht
      // gibt — die Spiele wären da, aber ohne Stärke, Kader und Derby-Bezug.
      if (!bekannt.has(name)) fehler.push(`${wo}: „${name}" steht nicht in der Klubliste dieser Liga.`);
    }

    if (!proSpieltag.has(s.matchday)) proSpieltag.set(s.matchday, new Map());
    const tag = proSpieltag.get(s.matchday);
    for (const name of [s.home, s.away]) {
      if (tag.has(name)) fehler.push(`Spieltag ${s.matchday}: „${name}" ist zweimal angesetzt.`);
      tag.set(name, true);
    }

    const key = `${s.home}|${s.away}`;
    paarungen.set(key, (paarungen.get(key) ?? 0) + 1);
  }

  // Ab hier nur noch Vollständigkeit — das sind Warnungen.
  const proRunde = teams.length / 2;
  for (const [md, tag] of [...proSpieltag.entries()].sort((a, b) => a[0] - b[0])) {
    const spiele = tag.size / 2;
    if (spiele !== proRunde) {
      warnungen.push(`Spieltag ${md} hat ${spiele} statt ${proRunde} Begegnungen.`);
    }
  }
  const hoechster = Math.max(...proSpieltag.keys());
  const fehlende = [];
  for (let md = 1; md <= hoechster; md++) if (!proSpieltag.has(md)) fehlende.push(md);
  if (fehlende.length) warnungen.push(`Es fehlen die Spieltage ${fehlende.join(", ")}.`);

  for (const [key, anzahl] of paarungen) {
    if (anzahl > 1) warnungen.push(`„${key.replace("|", " – ")}" kommt ${anzahl}-mal mit gleichem Heimrecht vor.`);
  }

  // Die Spieltage müssen zeitlich aufeinander folgen. Ein Nachholspiel, das
  // mitten in einem späteren Spieltag liegt, ist im Fußball normal — aber es
  // verschiebt den Runden-Spieltag der Zeitachse und damit den Joker.
  const enden = [...proSpieltag.keys()].sort((a, b) => a - b).map((md) => {
    const zeiten = spielplan.filter((s) => s.matchday === md).map((s) => zeit(s.kickoff)).filter((t) => t != null);
    return { md, von: Math.min(...zeiten), bis: Math.max(...zeiten) };
  });
  for (let i = 1; i < enden.length; i++) {
    if (enden[i].von < enden[i - 1].bis) {
      warnungen.push(`Spieltag ${enden[i].md} beginnt, bevor Spieltag ${enden[i - 1].md} zu Ende ist.`);
    }
  }

  return { ok: fehler.length === 0, fehler, warnungen };
}

// Wie viele Spiele eines Katalogs stehen auf einem ECHTEN Spielplan? Speist die
// Herkunfts-Anzeige. Bewusst eine Zählung und kein Ja/Nein: solange die
// Champions League noch ausgelost wird (Ende August), ist der Katalog gemischt
// — und „echte Saison" wäre dann für die CL schlicht gelogen.
//
// ⚠️ Gezählt wird über den WETTBEWERB, nicht über ein Feld am Spiel. Der Store
// reicht nur DB-Spalten durch (`store.mock.js` zählt sie einzeln auf), ein
// `echterSpielplan` am Match käme in der Oberfläche also nie an — und eine
// eigene Spalte dafür wäre eine Schema-Änderung für etwas, das ohnehin für
// eine ganze Liga gilt und nicht je Begegnung wechselt.
export function spielplanHerkunft(matches = [], echteWettbewerbe = new Set()) {
  let echt = 0;
  for (const m of matches) {
    const w = m?.wettbewerb ?? null;
    if (m?.echterSpielplan || (w != null && echteWettbewerbe.has(w))) echt++;
  }
  return {
    echt,
    erzeugt: matches.length - echt,
    alles: matches.length > 0 && echt === matches.length,
    nichts: echt === 0,
  };
}

// Der Satz, den die Oberfläche zeigt. Er steht hier und nicht im Screen, damit
// alle Stellen dasselbe sagen — beim Spielplan ist eine zweite Formulierung
// schnell eine zweite Wahrheit.
export function herkunftLabel(matches = [], echteWettbewerbe = new Set(), saison = "2026/27") {
  const h = spielplanHerkunft(matches, echteWettbewerbe);
  if (h.nichts) return `Simulierte Saison ${saison}`;
  if (h.alles) return `Spielplan ${saison} — Quoten und Ergebnisse simuliert`;
  return `Spielplan ${saison} teilweise echt (${h.echt} von ${matches.length} Spielen)`;
}
