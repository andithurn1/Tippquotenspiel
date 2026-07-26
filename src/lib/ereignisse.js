// ============================================================
//  EREIGNISSE — Joker ERSPIELEN statt nur zugeteilt bekommen
//
//  Bisher kommt ein Joker nur vom Admin (`joker.verteilung`). Hier kommt der
//  zweite Topf dazu: Joker, die man sich verdient.
//
//  ── Zwei Töpfe, einer davon gedeckelt ──
//  `zugeteilt` (aus dem Regelwerk) und `erspielt` (aus Ereignissen) fließen in
//  DASSELBE Joker-Kontingent — es gibt bewusst keinen neuen Punkte-Kanal,
//  damit die bestehende Deckelung (`modCap`) weiter greift. Der erspielte Topf
//  hat zusätzlich eine eigene Obergrenze (`maxErspielt`): ohne sie gewönne das
//  Tippspiel, wer im Minispiel gut ist. Das wäre eine zweite Leistungsachse
//  und damit ein Fairness-Bruch.
//
//  ── Warum Meilensteine der richtige Anfang sind ──
//  Sie brauchen KEINE neuen Daten und kein Minispiel: „drei Spieltage in Folge
//  getippt" steckt schon in den Tipps. Und sie belohnen Dranbleiben statt
//  Geschicklichkeit — das ist automatisch balance-freundlich, weil es niemanden
//  bevorzugt, der besser tippt, sondern jemanden, der überhaupt tippt.
//
//  ── Jeder Typ deklariert seine Daten (`braucht`) ──
//  Gleiches Muster wie bei den Saison-Wetten: Herausforderungen (Quiz, Duell)
//  stehen im Katalog, sind aber als NICHT auswertbar markiert, solange es kein
//  Minispiel gibt. So bleibt der Katalog die eine Quelle und niemand aktiviert
//  ein Ereignis, das nie auslöst.
//
//  ⚠️ Fußball-Tic-Tac-Toe („Spieler, der für beide Vereine spielte") ist mit
//  unseren Daten NICHT möglich — unsere Kader sind generiert und fiktiv. Das
//  ginge erst mit einer echten Spieler-Datenquelle. Ein Quiz über die
//  TIPP-Statistiken der eigenen Runde ginge dagegen sofort.
//
//  Reine Funktionen, UI-frei.
// ============================================================

// Direkt aus `spieltag.js`, NICHT aus `engine.js` — die Engine importiert aus
// dieser Datei hier, das wäre ein Kreis.
import { spieltagKey, spieltageChronologisch } from "./spieltag";

// Welche Daten haben wir heute? Alles andere ist im Katalog vorbereitet, aber
// nicht auswertbar — genau wie Karten/Fouls bei den Saison-Wetten.
export const VERFUEGBARE_DATEN = ["tipps", "ergebnisse", "spieltagspunkte"];

export const EREIGNIS_TYPEN = [
  // ── 1. Meilensteine (passiv, aus dem Tippen selbst) ──
  {
    key: "serie",
    label: "Serie: mehrere Spieltage in Folge getippt",
    kategorie: "meilenstein",
    braucht: ["tipps"],
    parameter: ["anzahl"],
    standard: { anzahl: 3, belohnung: 1 },
    hint: "Belohnt Dranbleiben. Löst jedes Mal aus, wenn die Serie erneut voll ist.",
  },
  {
    key: "erster-exakter",
    label: "Erster exakter Treffer",
    kategorie: "meilenstein",
    braucht: ["tipps", "ergebnisse"],
    parameter: [],
    standard: { belohnung: 1 },
    hint: "Einmal pro Saison — der Moment, in dem es zum ersten Mal genau aufgeht.",
  },
  {
    key: "aussenseiter",
    label: "Außenseiter-Sieg vorhergesagt",
    kategorie: "meilenstein",
    braucht: ["tipps", "ergebnisse"],
    parameter: ["abQuote"],
    standard: { abQuote: 5, belohnung: 1 },
    hint: "Wer den Mut hatte und recht behielt. Ab der eingestellten Sieger-Quote.",
  },
  {
    key: "spieltag-komplett",
    label: "Alle Spiele eines Spieltags getippt",
    kategorie: "meilenstein",
    braucht: ["tipps"],
    parameter: [],
    standard: { belohnung: 1 },
    hint: "Für die, die keinen Spieltag auslassen — unabhängig davon, wie gut getippt wurde.",
  },

  // ── 2. Widerfahrnisse (passiv, sozialer Ausgleich) ──
  {
    key: "letzter-am-spieltag",
    label: "Trost-Joker für den Letzten eines Spieltags",
    kategorie: "widerfahrnis",
    braucht: ["spieltagspunkte"],
    parameter: [],
    standard: { belohnung: 1 },
    // ⚠️ Der Aufhol-Mechanismus belohnt Zurückliegen bereits. Beides zusammen
    // belohnt es DOPPELT — deshalb meldet `konflikte()` diese Kombination.
    doppeltMit: "aufholen",
    hint: "Wer einen Spieltag verpatzt, bekommt etwas zurück. Nicht zusammen mit dem Anschluss-Bonus.",
  },

  // ── 3. Herausforderungen (aktiv, Minispiel) — vorbereitet ──
  // Stehen im Katalog, damit die Struktur steht und der Admin sieht, was
  // kommt. Auswertbar erst mit einem Minispiel; `istAuswertbar` blendet sie
  // solange aus, statt sie stillschweigend nie auslösen zu lassen.
  {
    key: "quiz",
    label: "Quiz über die eigene Runde",
    kategorie: "herausforderung",
    braucht: ["minispiel"],
    parameter: [],
    standard: { belohnung: 1 },
    hint: "„Wer tippt am häufigsten Unentschieden?“ — ginge mit unseren Daten sofort, braucht aber ein Minispiel drumherum.",
  },
  {
    key: "duell",
    label: "Joker-Duell gegen einen Mitspieler",
    kategorie: "herausforderung",
    braucht: ["minispiel"],
    parameter: [],
    standard: { belohnung: 1 },
    hint: "Muss ASYNCHRON funktionieren — ein Freundeskreis spielt nie gleichzeitig.",
  },
];

export const EREIGNIS = Object.fromEntries(EREIGNIS_TYPEN.map((e) => [e.key, e]));

export const EREIGNIS_LIMITS = {
  belohnung: { min: 1, max: 3, step: 1 },
  maxErspielt: { min: 1, max: 15, step: 1 },
  anzahl: { min: 2, max: 10, step: 1 },      // Serie
  abQuote: { min: 2, max: 15, step: 0.5 },   // Außenseiter
};

export const DEFAULT_EREIGNISSE = { enabled: false, maxErspielt: 5, aktive: [] };

export function istAuswertbar(key) {
  const typ = EREIGNIS[key];
  return Boolean(typ) && typ.braucht.every((d) => VERFUEGBARE_DATEN.includes(d));
}

export const AUSWERTBARE_TYPEN = EREIGNIS_TYPEN.filter((e) => istAuswertbar(e.key));

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function sanitizeEreignisse(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const roh = Array.isArray(p.aktive) ? p.aktive : [];
  const gesehen = new Set();
  const aktive = [];

  for (const a of roh) {
    const typ = EREIGNIS[a?.key];
    // Nicht auswertbare Typen fliegen raus statt still nie auszulösen — der
    // Admin soll nichts einschalten können, das folgenlos bleibt.
    if (!typ || !istAuswertbar(typ.key) || gesehen.has(typ.key)) continue;
    gesehen.add(typ.key);

    const eintrag = {
      key: typ.key,
      belohnung: Math.round(clamp(a.belohnung, EREIGNIS_LIMITS.belohnung, typ.standard.belohnung)),
    };
    if (typ.parameter.includes("anzahl")) {
      eintrag.anzahl = Math.round(clamp(a.anzahl, EREIGNIS_LIMITS.anzahl, typ.standard.anzahl));
    }
    if (typ.parameter.includes("abQuote")) {
      eintrag.abQuote = +clamp(a.abQuote, EREIGNIS_LIMITS.abQuote, typ.standard.abQuote).toFixed(1);
    }
    aktive.push(eintrag);
  }

  return {
    enabled: p.enabled === true && aktive.length > 0,
    maxErspielt: Math.round(clamp(p.maxErspielt, EREIGNIS_LIMITS.maxErspielt, DEFAULT_EREIGNISSE.maxErspielt)),
    aktive,
  };
}

// ── Auswertung ──────────────────────────────────────────────

// ⚠️ Ein Spieltag ist erst mit dem WETTBEWERB eindeutig. Über die nackte Zahl
// gruppiert verschmolzen Bundesliga-, Premier-League- und CL-Spieltag 1 zu
// EINEM Spieltag — mit zwei sichtbaren Folgen: „alle Spiele des Spieltags
// getippt" verlangte plötzlich ~35 statt 9 Spiele und löste nie mehr aus, und
// der Trost-Joker suchte den Letzten über fünf Wettbewerbe hinweg.
// Geordnet wird chronologisch über `spieltageChronologisch` (eine Quelle,
// dieselbe wie im Ranking-Verlauf).

// Wie viele Spiele hatte ein Spieltag? Aus den Tipps ALLER Mitspieler
// abgeleitet — die Einträge eines einzelnen Nutzers wissen nicht, was er
// ausgelassen hat. Das ist eine Untergrenze: ein Spiel, das niemand getippt
// hat, taucht nicht auf. Für „hat alles getippt" ist das die faire Lesart.
function spieleJeSpieltag(alleEintraege) {
  const map = new Map();
  for (const e of alleEintraege) {
    if (!Number.isFinite(e.matchday)) continue;
    const key = spieltagKey(e);
    if (!map.has(key)) map.set(key, { wettbewerb: e.wettbewerb ?? null, matchday: e.matchday, ids: new Set() });
    map.get(key).ids.add(e.matchId ?? `${e.snapshot?.matchId}`);
  }
  return map;
}

const istExakt = (e) =>
  e?.result && e?.tip && e.tip.home === e.result.home && e.tip.away === e.result.away;

// Hat der Tipp den Sieger richtig — und war der ein Außenseiter?
function aussenseiterTreffer(e, abQuote) {
  if (!e?.result || !e?.tip) return false;
  const realHeim = e.result.home > e.result.away;
  const realGast = e.result.away > e.result.home;
  if (!realHeim && !realGast) return false;             // Remis zählt nicht
  const getipptHeim = e.tip.home > e.tip.away;
  const getipptGast = e.tip.away > e.tip.home;
  if (realHeim !== getipptHeim || realGast !== getipptGast) return false;
  const quote = realHeim ? e.snapshot?.winner?.home : e.snapshot?.winner?.away;
  return Number.isFinite(quote) && quote >= abQuote;
}

// Alle Gutschriften eines Nutzers — chronologisch, damit der Deckel die
// SPÄTEREN abschneidet und nicht willkürlich mittendrin.
export function auswerten({
  eintraege = [], alleEintraege = null, ereignisse = DEFAULT_EREIGNISSE,
  spieltagsPunkte = null,
} = {}) {
  const cfg = sanitizeEreignisse(ereignisse);
  if (!cfg.enabled) return { gutschriften: [], gesamt: 0, gedeckelt: false, verworfen: 0 };

  const alle = alleEintraege ?? eintraege;
  const meine = eintraege;
  const roh = [];
  const aktiv = (key) => cfg.aktive.find((a) => a.key === key);

  // Serie: Spieltage in Folge. Zählt bei jedem Erreichen erneut, damit eine
  // lange Serie nicht nach dem ersten Mal wertlos wird.
  // Reihenfolge und Position aller Spieltage — eine Quelle für alles unten.
  const reihenfolge = spieltageChronologisch(alle);
  const posVon = new Map(reihenfolge.map((s, i) => [s.key, i]));
  const pos = (e) => posVon.get(spieltagKey(e)) ?? -1;

  const serie = aktiv("serie");
  if (serie) {
    const getippt = new Set(meine.filter((e) => Number.isFinite(e.matchday)).map(spieltagKey));
    let lauf = 0;
    // Chronologisch, wettbewerbsübergreifend: „dranbleiben" heißt, keinen
    // Spieltag auszulassen, der in der Runde überhaupt anstand — auch keinen
    // aus einem zweiten Wettbewerb.
    for (const s of reihenfolge) {
      if (!getippt.has(s.key)) { lauf = 0; continue; }
      lauf++;
      if (lauf % serie.anzahl === 0) {
        roh.push({ key: "serie", wettbewerb: s.wettbewerb, matchday: s.matchday, belohnung: serie.belohnung,
          text: `${serie.anzahl} Spieltage in Folge getippt` });
      }
    }
  }

  // Erster exakter Treffer — genau einmal.
  const exakt = aktiv("erster-exakter");
  if (exakt) {
    const treffer = meine.filter(istExakt).sort((a, b) => pos(a) - pos(b))[0];
    if (treffer) {
      roh.push({ key: "erster-exakter", wettbewerb: treffer.wettbewerb ?? null, matchday: treffer.matchday,
        belohnung: exakt.belohnung, text: "erster exakter Treffer" });
    }
  }

  // Außenseiter-Sieg richtig getippt.
  const aus = aktiv("aussenseiter");
  if (aus) {
    for (const e of meine) {
      if (!aussenseiterTreffer(e, aus.abQuote)) continue;
      roh.push({ key: "aussenseiter", wettbewerb: e.wettbewerb ?? null, matchday: e.matchday,
        belohnung: aus.belohnung, text: `Außenseiter-Sieg ab Quote ${aus.abQuote} vorhergesagt` });
    }
  }

  // Spieltag vollständig getippt.
  const komplett = aktiv("spieltag-komplett");
  if (komplett) {
    const proSpieltag = spieleJeSpieltag(alle);
    const meineProSpieltag = spieleJeSpieltag(meine);
    for (const [key, s] of proSpieltag) {
      const meins = meineProSpieltag.get(key);
      if (meins && meins.ids.size >= s.ids.size) {
        roh.push({ key: "spieltag-komplett", wettbewerb: s.wettbewerb, matchday: s.matchday,
          belohnung: komplett.belohnung, text: "alle Spiele des Spieltags getippt" });
      }
    }
  }

  // Trost-Joker: braucht die Spieltagspunkte, die nur die Wertung kennt —
  // deshalb reicht der Aufrufer sie herein, statt dass diese Datei scort.
  const trost = aktiv("letzter-am-spieltag");
  if (trost && Array.isArray(spieltagsPunkte) && spieltagsPunkte.length) {
    const meineId = meine[0]?.userId;
    const jeSpieltag = new Map();
    for (const p of spieltagsPunkte) {
      const key = spieltagKey(p);
      if (!jeSpieltag.has(key)) jeSpieltag.set(key, { wettbewerb: p.wettbewerb ?? null, matchday: p.matchday, liste: [] });
      jeSpieltag.get(key).liste.push(p);
    }
    for (const s of jeSpieltag.values()) {
      if (s.liste.length < 2) continue;   // allein ist man nicht Letzter
      const min = Math.min(...s.liste.map((p) => p.punkte));
      const letzte = s.liste.filter((p) => p.punkte === min);
      // Nur bei EINEM Letzten — bei Gleichstand ist es kein Missgeschick,
      // sondern ein gemeinsamer schwacher Spieltag.
      if (letzte.length === 1 && letzte[0].userId === meineId) {
        roh.push({ key: "letzter-am-spieltag", wettbewerb: s.wettbewerb, matchday: s.matchday,
          belohnung: trost.belohnung, text: "Trost-Joker für den letzten Platz am Spieltag" });
      }
    }
  }

  // Chronologisch, damit der Deckel die SPÄTEREN abschneidet. Spieltage, die in
  // `alle` nicht vorkommen, landen über pos = -1 vorn — das betrifft nur
  // konstruierte Fälle und bleibt deterministisch.
  roh.sort((a, b) => pos(a) - pos(b) || a.key.localeCompare(b.key));

  const gutschriften = [];
  let gesamt = 0;
  let verworfen = 0;
  for (const g of roh) {
    if (gesamt + g.belohnung > cfg.maxErspielt) { verworfen++; continue; }
    gutschriften.push(g);
    gesamt += g.belohnung;
  }
  return { gutschriften, gesamt, gedeckelt: verworfen > 0, verworfen };
}

// ── Konflikte mit anderen Regeln ────────────────────────────
// Ein Ereignis kann für sich harmlos sein und trotzdem eine bestehende Regel
// verdoppeln. Der Trost-Joker ist genau so ein Fall: der Aufhol-Mechanismus
// belohnt Zurückliegen bereits.
export function konflikte(rules) {
  const cfg = sanitizeEreignisse(rules?.ereignisse);
  const out = [];
  if (!cfg.enabled) return out;
  for (const a of cfg.aktive) {
    const typ = EREIGNIS[a.key];
    if (typ?.doppeltMit === "aufholen" && rules?.aufholen?.enabled) {
      out.push({
        key: a.key,
        text: "Trost-Joker und Anschluss-Bonus belohnen beide das Zurückliegen — zusammen wird es doppelt belohnt. Eines von beiden genügt.",
      });
    }
  }
  return out;
}

export function beschreibeEreignisse(ereignisse) {
  const cfg = sanitizeEreignisse(ereignisse);
  if (!cfg.enabled) return "Joker gibt es nur vom Admin.";
  const namen = cfg.aktive.map((a) => EREIGNIS[a.key]?.label).filter(Boolean);
  return `${namen.length} Ereignis${namen.length === 1 ? "" : "se"}, höchstens ${cfg.maxErspielt} erspielte Joker pro Saison.`;
}
