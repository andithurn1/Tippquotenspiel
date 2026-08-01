// ============================================================
//  LIMITIERUNGSKLASSEN — Unterkontingente, die ineinandergreifen
//
//  Bisher hat jede Joker-Art ihren eigenen Deckel (`duell.maxProSaison`,
//  `ereignisse.maxErspielt`, …) — eine Insel mit eigenem Zaun. Eine
//  Limitierungsklasse ist stattdessen eine benannte GRUPPE von Joker-Arten
//  mit einem gemeinsamen Kontingent, einem Zeitfenster und einer
//  Aktivierungs-Bedingung (design/joker-oekonomie.md, Baustein 2).
//
//  ── Punkt 1: ein Einsatz zählt gegen JEDE passende Klasse ──
//  Nicht „die erste passende Klasse gewinnt". Eine Joker-Art kann Mitglied in
//  mehreren Klassen gleichzeitig sein — „höchstens 3 Angriffe pro Saison" UND
//  „davon höchstens einer pro 5 Spieltage" UND „höchstens 6 Joker jeder Art
//  pro Saison" greifen alle DREI gleichzeitig auf denselben Klau-Einsatz
//  (Abschnitt 2.1). Deshalb läuft `pruefeEinsatz` über ALLE Klassen, deren
//  `mitglieder` die eingesetzte Joker-Art enthalten — nicht nur die erste.
//
//  ── Punkt 2: ALLE Klassen müssen zustimmen, jede Ablehnung wird genannt ──
//  Eine Sammelmeldung „nicht erlaubt" ist in einem Baukasten unbrauchbar — der
//  Admin muss sehen, WELCHE seiner Regeln greift. Deshalb sammelt
//  `pruefeEinsatz` jede verletzte Klasse einzeln in `gruende`, statt beim
//  ersten Treffer abzubrechen.
//
//  ── Aktivierung vs. Kontingent ──
//  `aktivierung` entscheidet, ob eine Klasse gerade OFFEN ist (Abschnitt 2.2).
//  Ist sie es nicht, greift ihr Kontingent gar nicht — weder zählend noch
//  blockierend. Das ist auch der Sinn von `offeneKlassen`: der UI zeigen,
//  welche Klassen gerade überhaupt scharf sind.
//
//  ── Saison-Fenster: `fensterVon` aus `duellJoker.js`, nicht neu gebaut ──
//  `aktivierung.typ: "fenster"` trägt ein rohes Spieltags-Intervall
//  `{ von, bis }`. Statt Clamping/Vertauschen hier zu wiederholen, wird
//  `fensterVon({ phase: "manuell", abSpieltag: von, bisSpieltag: bis }, n)`
//  aufgerufen — dieselbe Quelle, die auch `jokerBudget.js` für `takt: "phase"`
//  nutzt. `proZeitraum: "phase"` (das Gegenstück zu `budget.takt: "phase"")
//  verwendet für die ZÄHLUNG genau dasselbe Fenster, wenn die Klasse mit
//  `aktivierung.typ: "fenster"` kombiniert ist — sonst (keine Fenster-
//  Aktivierung vorhanden) fällt die Zählperiode auf die ganze Saison zurück,
//  denn die Spec nennt für diesen Fall keine eigene Fensterquelle.
//  ⚠️ Das ist eine Auslegung, keine Messung — im Beispiel aus Abschnitt 2.0
//  trägt die Klasse selbst kein eigenes `fenster`-Feld.
//
//  ── ⚠️ Annahmen, wo die Spec offenlässt (Kontext-Formen) ──
//  `kontext.board` = Schnappschuss der aktuellen Tabelle zum Zeitpunkt des
//  Einsatzes, `[{ userId, total, … }]` — dieselbe Form wie in `duellJoker.js`
//  und `jokerBudget.js`. `kontext.budgetStand` = `{ [userId]: kontostand }`,
//  ein Schnappschuss, kein Verlauf. `kontext.ausgeloesteEreignisse` =
//  `[{ userId, ereignisKey, spieltag }]` — welcher Spieler welchen
//  Ereignis-Key aus `ereignisse.js` bis wann ausgelöst hat. Für
//  `offeneKlassen` (kein einzelner Einsatz, also kein bekannter „jetzt"-
//  Spieltag) darf `kontext` zusätzlich ein optionales `aktuellerSpieltag`
//  tragen; fehlt es, gilt eine zeitliche Bedingung als offen, wenn sie
//  GRUNDSÄTZLICH noch innerhalb der Saison eintreten kann.
//
//  ── Reine Prüffunktion, kein Zustand ──
//  `historie` kommt herein, wird nicht gehalten — dieselbe Bauart wie
//  `invalidJokerMatchdays` in der Engine und wie `bisherigeEinsaetze` in
//  `duellJoker.js`s `zulaessigeZiele`.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { fensterVon } from "./duellJoker";

// ── Kataloge ────────────────────────────────────────────────

export const AKTIVIERUNG_TYPEN = [
  {
    key: "immer", label: "Immer",
    desc: "Klasse ist offen. Vorgabe.",
  },
  {
    key: "abSpieltag", label: "Ab Spieltag",
    desc: "Erst ab Spieltag N.",
  },
  {
    key: "fenster", label: "Saison-Fenster",
    desc: "Nur in einem festen Spieltags-Bereich.",
  },
  {
    key: "abRueckstand", label: "Ab Rückstand",
    desc: "Nur wer mindestens N Punkte hinter Platz 1 liegt.",
  },
  {
    key: "abVorsprung", label: "Ab Vorsprung",
    desc: "Nur wer mindestens N Punkte vorne liegt.",
  },
  {
    key: "nachEreignis", label: "Nach Ereignis",
    desc: "Ein Ereignis aus ereignisse.js muss ausgelöst haben.",
  },
  {
    key: "abBudget", label: "Ab Budget",
    desc: "Erst ab N Budget.",
  },
  {
    key: "nurGegenFuehrende", label: "Nur gegen Führende",
    desc: "Nur Einsätze gegen die ersten N Plätze sind erlaubt.",
  },
];

export const PRO_ZEITRAUM = [
  {
    key: "saison", label: "Pro Saison",
    desc: "Ein einziger Zeitraum über die komplette Saison.",
  },
  {
    key: "spieltag", label: "Pro Spieltag",
    desc: "Jeder Spieltag ist ein eigener Zeitraum.",
  },
  {
    key: "nSpieltage", label: "Alle N Spieltage",
    desc: "Ein Zeitraum je N Spieltage.",
  },
  {
    key: "phase", label: "Saison-Fenster",
    desc: "Ein einziger Zeitraum, begrenzt auf das Aktivierungs-Fenster.",
  },
];

// ── Grenzen & Vorgabe ───────────────────────────────────────

export const LIMIT_KLASSEN_LIMITS = {
  max: { min: 0, max: 500, step: 1 },
  n: { min: 1, max: 38, step: 1 },
  abSpieltag: { min: 1, max: 38, step: 1 },
  fensterSpieltag: { min: 1, max: 38, step: 1 },
  abRueckstand: { min: 0, max: 500, step: 1 },
  abVorsprung: { min: 0, max: 500, step: 1 },
  abBudget: { min: 0, max: 500, step: 1 },
  plaetze: { min: 1, max: 50, step: 1 },
};

export const DEFAULT_LIMIT_KLASSEN = [];

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// ── Sanitize ────────────────────────────────────────────────

// Bereinigt `aktivierung`. Fehlt das Feld ganz oder ist es kein Objekt, gilt
// die Vorgabe `{ typ: "immer" }` (design/joker-oekonomie.md, 5d Festlegung a)
// — *fehlend* ist nicht dasselbe wie *unbekannt*. Nur ein tatsächlich
// UNBEKANNTER `typ` liefert weiterhin `null`, und der Aufrufer verwirft dann
// die GANZE Klasse (unbedienbare Regel statt geratener Regel).
function sanitizeAktivierung(a) {
  const o = a && typeof a === "object" ? a : { typ: "immer" };
  if (!AKTIVIERUNG_TYPEN.some((t) => t.key === o.typ)) return null;

  switch (o.typ) {
    case "immer":
      return { typ: "immer" };
    case "abSpieltag":
      return {
        typ: "abSpieltag",
        wert: Math.round(clamp(o.wert, LIMIT_KLASSEN_LIMITS.abSpieltag, LIMIT_KLASSEN_LIMITS.abSpieltag.min)),
      };
    case "fenster": {
      const von = Math.round(clamp(o.von, LIMIT_KLASSEN_LIMITS.fensterSpieltag, LIMIT_KLASSEN_LIMITS.fensterSpieltag.min));
      const bis = Math.round(clamp(o.bis, LIMIT_KLASSEN_LIMITS.fensterSpieltag, LIMIT_KLASSEN_LIMITS.fensterSpieltag.max));
      return { typ: "fenster", von: Math.min(von, bis), bis: Math.max(von, bis) };
    }
    case "abRueckstand":
      return { typ: "abRueckstand", wert: clamp(o.wert, LIMIT_KLASSEN_LIMITS.abRueckstand, 0) };
    case "abVorsprung":
      return { typ: "abVorsprung", wert: clamp(o.wert, LIMIT_KLASSEN_LIMITS.abVorsprung, 0) };
    case "nachEreignis":
      return { typ: "nachEreignis", ereignisKey: typeof o.ereignisKey === "string" ? o.ereignisKey : "" };
    case "abBudget":
      return { typ: "abBudget", wert: clamp(o.wert, LIMIT_KLASSEN_LIMITS.abBudget, 0) };
    case "nurGegenFuehrende":
      return {
        typ: "nurGegenFuehrende",
        plaetze: Math.round(clamp(o.plaetze, LIMIT_KLASSEN_LIMITS.plaetze, 1)),
      };
    default:
      return null;
  }
}

// Bereinigt EINE Klasse. `null` bei fehlender `id`, leeren `mitglieder` oder
// unbekanntem `aktivierung.typ` — diese drei fliegen aus der Liste, statt mit
// geratenen Werten durchgereicht zu werden (anders als `sanitizeDuellJoker`,
// das je Feld auf eine Vorgabe zurückfällt: eine unbedienbare Klasse lässt
// sich nicht sinnvoll auf Vorgaben zurückstutzen).
function sanitizeKlasse(k) {
  const o = k && typeof k === "object" ? k : {};
  if (o.id == null || String(o.id).trim() === "") return null;

  const mitglieder = Array.isArray(o.mitglieder)
    ? [...new Set(o.mitglieder.filter((m) => typeof m === "string" && m.trim() !== ""))]
    : [];
  if (!mitglieder.length) return null;

  const aktivierung = sanitizeAktivierung(o.aktivierung);
  if (!aktivierung) return null;

  const proZeitraum = PRO_ZEITRAUM.some((p) => p.key === o.proZeitraum) ? o.proZeitraum : "saison";

  return {
    id: String(o.id),
    label: typeof o.label === "string" && o.label.trim() !== "" ? o.label : String(o.id),
    mitglieder,
    max: Math.round(clamp(o.max, LIMIT_KLASSEN_LIMITS.max, 1)),
    proZeitraum,
    // Nur bei `nSpieltage` gesetzt, sonst `null` — dieselbe Bauart wie
    // `abSpieltag`/`bisSpieltag` in `sanitizeDuellJoker`.
    n: proZeitraum === "nSpieltage" ? Math.round(clamp(o.n, LIMIT_KLASSEN_LIMITS.n, 5)) : null,
    aktivierung,
  };
}

// Bereinigt die ganze Liste. Immer ein Array — ungültige Einträge fliegen
// raus statt durchgereicht zu werden.
export function sanitizeLimitKlassen(liste) {
  return Array.isArray(liste) ? liste.map(sanitizeKlasse).filter(Boolean) : [];
}

// Wie `sanitizeLimitKlassen`, macht aber sichtbar, WARUM ein Eintrag
// verworfen wurde — Muster `pruefeSpielplan` in `spielplan.js`: FEHLER
// (hier: Verwerfungsgründe) werden benannt statt stumm zu verschwinden
// (design/joker-oekonomie.md, 5d Festlegung b). `sanitizeLimitKlassen`
// bleibt unverändert rein und liefert weiterhin nur das Array — die
// Oberfläche ruft stattdessen `pruefeKlassen`, um das Verworfene zu zeigen.
// Reine Prüffunktion, kein Zustand.
export function pruefeKlassen(liste) {
  const arr = Array.isArray(liste) ? liste : [];
  const klassen = [];
  const verworfen = [];

  arr.forEach((k, index) => {
    const o = k && typeof k === "object" ? k : {};
    const id = o.id != null && String(o.id).trim() !== "" ? String(o.id) : null;

    if (!id) {
      verworfen.push({ index, id: null, grund: `Zeile ${index + 1}: fehlende oder leere „id".` });
      return;
    }

    const mitglieder = Array.isArray(o.mitglieder)
      ? [...new Set(o.mitglieder.filter((m) => typeof m === "string" && m.trim() !== ""))]
      : [];
    if (!mitglieder.length) {
      verworfen.push({ index, id, grund: `„${id}": leere oder ungültige „mitglieder"-Liste.` });
      return;
    }

    const aktivierung = sanitizeAktivierung(o.aktivierung);
    if (!aktivierung) {
      const typ = o.aktivierung && typeof o.aktivierung === "object" ? o.aktivierung.typ : o.aktivierung;
      verworfen.push({ index, id, grund: `„${id}": unbekannter aktivierung.typ „${typ}".` });
      return;
    }

    klassen.push(sanitizeKlasse(o));
  });

  return { klassen, verworfen };
}

// ── Rückstand & Vorsprung ───────────────────────────────────
// Dieselbe Rechnung wie `rueckstandBetrag` in `jokerBudget.js`: ohne Board
// oder ohne Treffer wird nicht geraten, sondern mit 0 gerechnet — kein
// `null`, damit die Aktivierungs-Prüfung ohne Sonderfall bleibt.
function rueckstandVon(board, userId) {
  const liste = Array.isArray(board) ? board : [];
  if (!liste.length) return 0;
  const fuehrend = Math.max(...liste.map((b) => Number(b.total) || 0));
  const eigen = liste.find((b) => b.userId === userId);
  const eigenTotal = eigen ? Number(eigen.total) || 0 : 0;
  return Math.max(0, fuehrend - eigenTotal);
}

// Kehrseite von `rueckstandVon`: Vorsprung auf den besten ANDEREN Spieler.
// Positiv, wenn `userId` führt; sonst 0 oder negativ.
function vorsprungVon(board, userId) {
  const liste = Array.isArray(board) ? board : [];
  if (!liste.length) return 0;
  const eigen = liste.find((b) => b.userId === userId);
  const eigenTotal = eigen ? Number(eigen.total) || 0 : 0;
  const andere = liste.filter((b) => b.userId !== userId).map((b) => Number(b.total) || 0);
  const besterAndere = andere.length ? Math.max(...andere) : eigenTotal;
  return eigenTotal - besterAndere;
}

// ── Aktivierung ─────────────────────────────────────────────
// Ist die Klasse gerade offen? `spieltag` ist entweder der konkrete Spieltag
// des geprüften Einsatzes (`pruefeEinsatz`) oder `null` (`offeneKlassen` ohne
// bekanntes „jetzt" — siehe Kopfkommentar). Bei zeitlichen Bedingungen ohne
// bekannten Spieltag gilt: offen, wenn die Bedingung innerhalb der Saison
// GRUNDSÄTZLICH noch erreichbar ist, statt sie exakt auszuwerten.
function klasseAktiv(akt, { userId, aufUserId = null, spieltag = null }, kontext, spieltageGesamt) {
  const ctx = kontext && typeof kontext === "object" ? kontext : {};

  switch (akt.typ) {
    case "immer":
      return true;

    case "abSpieltag":
      return spieltag != null ? spieltag >= akt.wert : akt.wert <= spieltageGesamt;

    case "fenster": {
      const f = fensterVon({ phase: "manuell", abSpieltag: akt.von, bisSpieltag: akt.bis }, spieltageGesamt);
      return spieltag != null ? spieltag >= f.von && spieltag <= f.bis : f.bis >= f.von;
    }

    case "abRueckstand":
      return rueckstandVon(ctx.board, userId) >= akt.wert;

    case "abVorsprung":
      return vorsprungVon(ctx.board, userId) >= akt.wert;

    case "nachEreignis": {
      const liste = Array.isArray(ctx.ausgeloesteEreignisse) ? ctx.ausgeloesteEreignisse : [];
      return liste.some((e) => e && e.userId === userId && e.ereignisKey === akt.ereignisKey
        && (spieltag == null || !Number.isFinite(Number(e.spieltag)) || Number(e.spieltag) <= spieltag));
    }

    case "abBudget": {
      const stand = ctx.budgetStand && typeof ctx.budgetStand === "object" ? Number(ctx.budgetStand[userId]) : NaN;
      return Number.isFinite(stand) && stand >= akt.wert;
    }

    case "nurGegenFuehrende": {
      // Kein bekanntes Ziel (z. B. bei `offeneKlassen`) schränkt nicht ein —
      // die Klasse gilt insoweit als offen, die Ziel-Prüfung greift erst,
      // sobald ein konkreter Einsatz mit `aufUserId` geprüft wird.
      if (aufUserId == null) return true;
      const board = Array.isArray(ctx.board) ? ctx.board : [];
      const sortiert = [...board].sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
      return sortiert.slice(0, akt.plaetze).some((b) => b.userId === aufUserId);
    }

    default:
      return false;
  }
}

// ── Zeitraum für die Zählung ────────────────────────────────
function periodeVon(klasse, spieltag, spieltageGesamt) {
  if (klasse.proZeitraum === "spieltag") {
    return { von: spieltag, bis: spieltag };
  }
  if (klasse.proZeitraum === "nSpieltage") {
    const n = klasse.n || 1;
    const block = Math.floor((spieltag - 1) / n);
    return { von: block * n + 1, bis: block * n + n };
  }
  if (klasse.proZeitraum === "phase" && klasse.aktivierung.typ === "fenster") {
    return fensterVon(
      { phase: "manuell", abSpieltag: klasse.aktivierung.von, bisSpieltag: klasse.aktivierung.bis },
      spieltageGesamt,
    );
  }
  // "saison" — und "phase" ohne Fenster-Aktivierung (siehe Kopfkommentar).
  return { von: 1, bis: spieltageGesamt };
}

// Wie oft hat `vonUserId` bereits eine Joker-Art aus `klasse.mitglieder` im
// selben Zeitraum gesetzt?
function zaehleBisherige(klasse, vonUserId, spieltag, historie, spieltageGesamt) {
  const periode = periodeVon(klasse, spieltag, spieltageGesamt);
  return historie.filter((h) => h && h.vonUserId === vonUserId
    && klasse.mitglieder.includes(h.jokerArt)
    && Number.isFinite(Number(h.spieltag))
    && Number(h.spieltag) >= periode.von && Number(h.spieltag) <= periode.bis).length;
}

// ── Die Prüfung ─────────────────────────────────────────────
// `einsatz` = { spieltag, jokerArt, vonUserId, aufUserId }. `historie` =
// bereits gesetzte Einsätze derselben Saison, gleiche Form. `kontext` =
// { spieltage, board, budgetStand, ausgeloesteEreignisse } (siehe
// Kopfkommentar für die Form der einzelnen Felder).
export function pruefeEinsatz(einsatz = {}, klassen = [], historie = [], kontext = {}) {
  const e = einsatz && typeof einsatz === "object" ? einsatz : {};
  const spieltag = Number(e.spieltag);
  const liste = sanitizeLimitKlassen(klassen);
  const hist = Array.isArray(historie) ? historie : [];
  const ctx = kontext && typeof kontext === "object" ? kontext : {};
  const spieltageGesamt = Number.isFinite(Number(ctx.spieltage)) && Number(ctx.spieltage) > 0
    ? Math.floor(Number(ctx.spieltage))
    : 34;

  const gruende = [];
  for (const klasse of liste) {
    // Betrifft diese Klasse die eingesetzte Joker-Art überhaupt?
    if (!klasse.mitglieder.includes(e.jokerArt)) continue;
    // Ist die Klasse gerade offen? Wenn nicht, greift ihr Kontingent nicht —
    // weder zählend noch blockierend.
    if (!klasseAktiv(klasse.aktivierung, { userId: e.vonUserId, aufUserId: e.aufUserId, spieltag }, ctx, spieltageGesamt)) {
      continue;
    }

    const bisherige = zaehleBisherige(klasse, e.vonUserId, spieltag, hist, spieltageGesamt);
    if (bisherige + 1 > klasse.max) {
      gruende.push({
        klasseId: klasse.id,
        grund: `„${klasse.label}“: Kontingent von ${klasse.max} bereits ausgeschöpft (${bisherige} bereits gesetzt).`,
      });
    }
  }
  return { erlaubt: gruende.length === 0, gruende };
}

// ── Für die UI: welche Klassen sind gerade aktiv? ───────────
// Ohne konkreten Einsatz gibt es kein `aufUserId` — `nurGegenFuehrende`
// schränkt deshalb hier nicht ein (siehe `klasseAktiv`). `kontext` darf
// zusätzlich `aktuellerSpieltag` tragen (siehe Kopfkommentar); fehlt es,
// gelten zeitliche Bedingungen als offen, wenn sie diese Saison grundsätzlich
// noch eintreten können.
export function offeneKlassen(klassen = [], userId, kontext = {}) {
  const liste = sanitizeLimitKlassen(klassen);
  const ctx = kontext && typeof kontext === "object" ? kontext : {};
  const spieltageGesamt = Number.isFinite(Number(ctx.spieltage)) && Number(ctx.spieltage) > 0
    ? Math.floor(Number(ctx.spieltage))
    : 34;
  const jetzt = Number.isFinite(Number(ctx.aktuellerSpieltag)) ? Number(ctx.aktuellerSpieltag) : null;

  return liste.filter((klasse) =>
    klasseAktiv(klasse.aktivierung, { userId, aufUserId: null, spieltag: jetzt }, ctx, spieltageGesamt));
}

// ── Ein Satz für die UI ──────────────────────────────────────
function beschreibeAktivierung(akt, spieltage) {
  switch (akt.typ) {
    case "abSpieltag":
      return `ab Spieltag ${akt.wert}`;
    case "fenster": {
      const f = fensterVon({ phase: "manuell", abSpieltag: akt.von, bisSpieltag: akt.bis }, spieltage);
      return `zwischen Spieltag ${f.von} und ${f.bis}`;
    }
    case "abRueckstand":
      return `nur bei mindestens ${akt.wert} Punkten Rückstand`;
    case "abVorsprung":
      return `nur bei mindestens ${akt.wert} Punkten Vorsprung`;
    case "nachEreignis":
      return `erst nach dem Ereignis „${akt.ereignisKey}“`;
    case "abBudget":
      return `erst ab ${akt.wert} Budget`;
    case "nurGegenFuehrende":
      return `nur gegen die ersten ${akt.plaetze}`;
    default:
      return "";
  }
}

export function beschreibeKlasse(klasse, spieltage = 34) {
  const k = sanitizeKlasse(klasse);
  if (!k) return "";
  const zeitraumText = k.proZeitraum === "spieltag" ? "pro Spieltag"
    : k.proZeitraum === "nSpieltage" ? `pro ${k.n} Spieltage`
    : k.proZeitraum === "phase" ? "im Aktivierungs-Fenster"
    : "pro Saison";
  const aktText = beschreibeAktivierung(k.aktivierung, spieltage);
  return `„${k.label}“: höchstens ${k.max} ${zeitraumText}${aktText ? `, ${aktText}` : ""}.`;
}
