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

// Wie viele Spiele tragen ECHTE Marktquoten? Anders als beim Spielplan lässt
// sich das direkt am Spiel ablesen: der Snapshot ist eine DB-Spalte und kommt
// durch den Store durch, `snapshot.quelle` also auch.
export function quotenHerkunft(matches = []) {
  let echt = 0, mitRaster = 0;
  for (const m of matches) {
    if (m?.snapshot?.quelle !== "api") continue;
    echt++;
    if (m.snapshot.rasterQuelle === "markt") mitRaster++;
  }
  return { echt, mitRaster, alles: matches.length > 0 && echt === matches.length };
}

// ── Wie alt sind die Quoten? ────────────────────────────────
// Eine abgelegte Quoten-Datei altert lautlos. Quoten bewegen sich mit
// Verletzungen und Aufstellungen; eine Woche alte Zahlen sehen genauso echt aus
// wie frische, sind aber falsch — und wer darauf tippt, tippt gegen ein Bild,
// das es nicht mehr gibt. Für uns ist das kein Geldproblem, aber ein
// Fairness-Problem: der Snapshot friert beim Öffnen ein, und was einfriert,
// sollte wenigstens aktuell gewesen sein.
//
// Kein automatischer Neu-Abruf: der kostet Credits und gehört in eine bewusste
// Entscheidung, nicht in einen Seiteneffekt beim Rendern.
export const QUOTEN_FRISCH_STUNDEN = 24;

export function quotenAlter(geholt, jetzt = Date.now()) {
  const t = new Date(geholt ?? "").getTime();
  if (!Number.isFinite(t)) return { bekannt: false, stunden: null, frisch: false };
  const stunden = (jetzt - t) / 3600000;
  return {
    bekannt: true,
    stunden: Math.max(0, Math.round(stunden)),
    frisch: stunden <= QUOTEN_FRISCH_STUNDEN,
  };
}

// Der Satz, den die Oberfläche zeigt. Er steht hier und nicht im Screen, damit
// alle Stellen dasselbe sagen — beim Spielplan ist eine zweite Formulierung
// schnell eine zweite Wahrheit.
//
// ⚠️ Spielplan und QUOTEN sind zwei getrennte Wahrheiten und werden auch
// getrennt genannt. Ein Katalog kann echte Termine und erfundene Quoten tragen
// (die europäischen Ligen) oder beides echt (MLS) — und für die Wertung ist
// die zweite Hälfte die wichtigere.
export function herkunftLabel(matches = [], echteWettbewerbe = new Set(), saison = "2026/27") {
  const h = spielplanHerkunft(matches, echteWettbewerbe);
  const q = quotenHerkunft(matches);
  const plan = h.nichts ? `Simulierter Spielplan ${saison}`
    : h.alles ? `Spielplan ${saison}`
      : `Spielplan ${saison} teilweise echt (${h.echt} von ${matches.length})`;
  const quoten = q.echt === 0 ? "Quoten und Ergebnisse simuliert"
    : q.alles ? "echte Marktquoten"
      : `echte Marktquoten für ${q.echt} Spiele`;
  return `${plan} · ${quoten}`;
}

// ── Vierter Weg: openfootball ───────────────────────────────
// Freie Spielpläne für Premier League, La Liga und Serie A — ohne Schlüssel,
// ohne Anmeldung, ohne Kontingent (09.08.2026 geprüft: alle drei Ligen liegen
// für 2026/27 vor). Damit fällt der letzte Grund weg, diese drei Kalender
// erzeugt zu lassen.
//
// ⚠️ Gegen `football-data.org` entschieden, obwohl es dieselben Ligen hat: es
// verlangt eine Registrierung mit E-Mail und einen Schlüssel je Abruf. Für
// einen Kalender, der sich einmal im Jahr ändert, ist das ein Konto zu viel.
//
// ── Das Format ──
//   ▪ Matchday 1
//     Fri Aug 21 2026          ← Datum; das Jahr steht nur beim ersten
//       20:00  Arsenal FC              v Coventry City FC
//     Sat Aug 22               ← Jahr fehlt: vom vorigen Datum übernehmen
//       15:00  Ipswich Town FC         v Sunderland AFC
//              Everton FC              v Crystal Palace FC   ← Zeit übernehmen
//
// 🔴 Zwei Fallen stecken darin, und beide erzeugen KEINEN Fehler, sondern
// falsche Daten:
//
// 1. **Die Zeiten sind ORTSZEIT der Liga**, nicht UTC. England im August ist
//    UTC+1, im November UTC+0; Spanien und Italien +2 bzw. +1. Wer stumpf
//    „Z" anhängt, verschiebt die halbe Saison um eine Stunde und die andere
//    Hälfte um zwei — und ein Tippfenster, das am Anpfiff schließt, schließt
//    dann zur falschen Minute. Umgerechnet wird deshalb über die echte
//    Zeitzone (`Intl`), nicht über einen festen Versatz.
// 2. **Der Jahreswechsel.** Ab Januar fehlt die Jahreszahl weiterhin; springt
//    der Monat zurück (Dez → Jan), gehört das Jahr erhöht. Ohne das läge die
//    Rückrunde ein Jahr in der Vergangenheit.
const MONATE = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Welchen Versatz zu UTC hat diese Zeitzone in diesem Moment? Der Standardweg
// ohne Fremdbibliothek: den Zeitpunkt in der Zone formatieren und die
// Differenz zurückrechnen.
function zonenVersatz(ms, zone) {
  const teile = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ms));
  const p = Object.fromEntries(teile.map((t) => [t.type, t.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
}

// Ortszeit in der Liga-Zone → UTC-Zeitstempel.
function ortszeitZuUTC(jahr, monat, tag, stunde, minute, zone) {
  const alsWaereEsUTC = Date.UTC(jahr, monat, tag, stunde, minute);
  // Zweimal rechnen: der Versatz kann sich genau an der Umstellungsgrenze
  // ändern, und der erste Wert liegt dann eine Stunde daneben.
  const grob = alsWaereEsUTC - zonenVersatz(alsWaereEsUTC, zone);
  return new Date(alsWaereEsUTC - zonenVersatz(grob, zone)).toISOString();
}

export function parseOpenfootball(text, zone) {
  const spiele = [];
  let matchday = null;
  let jahr = null;
  let monat = null;
  let tag = null;
  let letzteZeit = null;

  for (const roh of text.split("\n")) {
    const zeile = roh.replace(/\s+$/, "");
    if (!zeile.trim()) continue;

    const md = zeile.match(/^▪\s*Matchday\s+(\d+)/i);
    if (md) { matchday = +md[1]; continue; }

    // Datumszeile: „Fri Aug 21 2026" oder „Sat Aug 22"
    const dat = zeile.match(/^\s{0,4}[A-Z][a-z]{2}\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?\s*$/);
    if (dat) {
      const m = MONATE.indexOf(dat[1]);
      if (m === -1) continue;
      if (dat[3]) jahr = +dat[3];
      // Jahreswechsel: der Monat springt zurück (Dez → Jan).
      else if (monat !== null && m < monat) jahr += 1;
      monat = m;
      tag = +dat[2];
      letzteZeit = null;
      continue;
    }

    // Spielzeile: optionale Zeit, dann „Heim v Gast".
    const sp = zeile.match(/^\s+(?:(\d{1,2}):(\d{2}))?\s+(.+?)\s+v\s+(.+?)\s*$/);
    if (!sp || matchday === null || jahr === null) continue;
    if (sp[1] != null) letzteZeit = { h: +sp[1], m: +sp[2] };
    // Ohne jede Zeitangabe im Block ist der Anpfiff unbekannt. Lieber ohne
    // Uhrzeit ablegen als eine erfundene setzen — `pruefeSpielplan` meldet es.
    const z = letzteZeit ?? { h: 0, m: 0 };
    spiele.push({
      matchday,
      home: sp[3].trim(),
      away: sp[4].trim(),
      kickoff: ortszeitZuUTC(jahr, monat, tag, z.h, z.m, zone),
    });
  }
  return spiele;
}
