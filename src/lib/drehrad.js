// ============================================================
//  DREHRAD — Zufalls-Ereignisse aus einer vom Admin geschriebenen Tabelle
//
//  Der Baukasten kennt bisher zwei Auslöser für eine Belohnung: `jokerPlan`
//  (ein ZEITPUNKT) und `ereignisse` (eine LEISTUNG). Das Drehrad ist der
//  dritte: reiner ZUFALL aus einer Tabelle, die der Admin selbst schreibt —
//  Beschriftung, Feldgröße (`gewicht`), Belohnung. Weder Zeitpunkt noch
//  Leistung bestimmen WAS herauskommt, nur DASS gedreht wird
//  (design/drehrad.md Abschnitt 1).
//
//  ⚠️ Keine Balance-Vorgaben, keine Empfehlungen in diesem Modul. Was ein
//  Feld auszahlt und wie groß es ist, entscheidet der Admin. Dieses Modul
//  stellt nur sicher, dass die Einstellungen tatsächlich greifen.
//
//  ── 🔴 Punkt 1 (Abschnitt 2.5): deterministisch gezogen, nie beim Klicken ──
//  `ziehe` ist eine REINE Funktion über `(rundenId, userId, spieltag,
//  bisherige)` — dieselben Eingaben liefern immer dasselbe Feld, über
//  `seeded()` aus `seeded.js` (dieselbe Quelle wie `jokerPlan.js` und
//  `autoTip.js` — nicht neu gebaut). Ein Neuladen ändert nichts, die
//  Animation in der UI zeigt nur, was ohnehin feststeht. Wer wartet, hat
//  dadurch keinen Informationsvorteil.
//
//  ── 🔴 Sperrfrist (Abschnitt 2.2b): Drehungen dieses Spielers, nicht Spieltage ──
//  Gezählt wird in DREHUNGEN DIESES SPIELERS — ein Rad, das alle fünf
//  Spieltage kommt, sperrt sonst faktisch die halbe Saison. Je Spieler, nicht
//  rundenweit: was ein anderer gezogen hat, geht mich nichts an. Am Feld
//  gesetzt schlägt die Rad-Vorgabe — deshalb wird der effektive Wert schon in
//  `pruefeFelder`/`sanitizeDrehrad` je Feld AUFGELÖST und dort abgelegt, damit
//  `ziehe` nicht zweimal zwischen Feld- und Rad-Vorgabe abwägen muss.
//  `bisherige` = die zuletzt gezogenen Feld-Ids DIESES Spielers, neueste
//  zuerst; die Vorgeschichte ist selbst deterministisch, also bleibt es auch
//  das Ergebnis.
//
//  ── 🔴 Der Randfall, an dem es sonst still bricht ──
//  Sind durch die Sperrfristen ALLE Felder (mit Gewicht > 0) blockiert, wird
//  die Sperre für DIESE EINE Drehung ignoriert und über das volle Rad
//  gezogen. Die Alternative — eine Drehung ohne Ergebnis — ist der schlechtere
//  Fehler und fiele erst im Spielbetrieb auf. Zusätzlich warnt `pruefeFelder`
//  schon beim Einstellen, wenn die Sperrfristen rechnerisch nicht aufgehen
//  können (Summe der Sperren ≥ Anzahl der Felder mit Gewicht > 0).
//
//  ── `gewicht: 0` ──
//  Liegt auf dem Rad, kann aber nicht fallen (praktisch zum Vorbereiten).
//  Mindestens ZWEI Felder mit Gewicht über 0, sonst ist es kein Rad —
//  `pruefeFelder` sagt das (`gueltig`/`grund`), statt still ein kaputtes Rad
//  durchzureichen.
//
//  ── `punkte` als Belohnung (Abschnitt 2.5, Punkt 2) ──
//  `ereignisse.js` schließt einen direkten Punkte-Kanal für sich aus. Hier
//  lassen wir ihn zu, weil der Admin entscheidet — aber er bekommt einen
//  eigenen Saison-Deckel (`maxPunkteProSaison`), sonst hebelt ein Rad die
//  ganze Wertung aus, ohne dass irgendwo eine Grenze greift. Der Deckel darf
//  hoch stehen. Er darf nur nicht FEHLEN — deshalb ist er in
//  `DEFAULT_DREHRAD`/`sanitizeDrehrad` ein Pflichtfeld mit Vorgabe, kein
//  optionaler Wert. Das AUSWERTEN der Summe gegen den Deckel (wie
//  `ereignisse.js`s `auswerten` es für `maxErspielt` tut) ist nicht Teil
//  dieses Moduls (design/drehrad.md Abschnitt 3 nennt dafür keine Funktion) —
//  hier wird nur sichergestellt, dass die Einstellung existiert und greifbar
//  ist.
//
//  ── Wann gedreht wird & wer darf (Abschnitte 2.3/2.4) ──
//  Übernommen, NICHT neu gebaut: `frequenz`/`modus` laufen über `jokerPlan`
//  aus `jokerPlan.js` (`drehradPlan` RUFT es auf), das Saison-Fenster über
//  `fensterVon`/`PHASEN` aus `duellJoker.js`. Wer drehen darf (`wer`/`werWert`
//  bei `abPlatz`/`abRueckstand`) ist dieselbe Grundform wie bei den Jokern —
//  `jokerBasis.darfEinsetzen` wertet das aus, kein zweiter Mechanismus. Dieses
//  Modul speichert `wer`/`werWert` nur als Einstellung; das Auswerten bleibt
//  bei `jokerBasis`.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { jokerPlan } from "./jokerPlan";
import { fensterVon, PHASEN } from "./duellJoker";
import { seeded } from "./seeded";
import { JOKER_ARTEN } from "./jokerBudget";
import { WER } from "./jokerBasis";

// ── Kataloge ────────────────────────────────────────────────

export const BELOHNUNGS_TYPEN = [
  {
    key: "nichts", label: "Niete",
    desc: "Keine Belohnung. Muss es geben, sonst ist Drehen risikolos.",
  },
  {
    key: "joker", label: "Joker",
    desc: "Schreibt dem Spieler einen Joker der gewählten Art gut.",
  },
  {
    key: "budget", label: "Narren",
    desc: "Zahlt Narren auf das Konto des Spielers ein.",
  },
  {
    key: "modifikator", label: "Modifikator",
    desc: "Aufschlag auf die eigene Wertung für einige Spieltage. Fällt in denselben Topf wie Derby und Topspiel — der gemeinsame Deckel greift weiter.",
  },
  {
    key: "punkte", label: "Punkte",
    desc: "Direkte Punkte. Braucht einen Deckel für die Saison.",
  },
];

// `wer` (Abschnitt 2.4) — K1 (Abnahme 31.07., design/drehrad.md Abschnitt 3b
// (a)): EIN Katalog statt zwei. `drehrad.js` führte hier früher einen eigenen
// `wer`-Katalog, der von `jokerBasis.WER` abwich (kein `adminFreigabe`, dafür
// `nurGetippte`) — zwei Listen für dieselbe Frage laufen auseinander, sobald
// jemand eine ergänzt. Jetzt wird `WER` direkt aus `jokerBasis` importiert;
// `adminFreigabe` gilt hier mit, das ist kein Schaden. Die Auswertung bleibt
// `jokerBasis.darfEinsetzen`, dieses Modul erfindet keinen zweiten Weg.

// Nur zwei Modi ergeben für ein Drehrad Sinn (Abschnitt 2.3) — `frei` (jeder
// setzt selbst) passt zu Jokern, nicht zu einem Ereignis, das GEZOGEN wird.
const MODI = ["gleich", "kontingent"];

// ── Grenzen & Vorgabe ───────────────────────────────────────

export const DREHRAD_LIMITS = {
  gewicht: { min: 0, max: 100, step: 1 },
  // Gezählt in Drehungen dieses Spielers (Abschnitt 2.2b) — dieselbe
  // Größenordnung wie `abklingzeit` in jokerBasis.js.
  sperrfrist: { min: 0, max: 20, step: 1 },
  // „etwa jeder N-te Spieltag" — identische Spanne wie
  // `VERTEILUNG_LIMITS.frequenz` in jokerPlan.js.
  frequenz: { min: 1, max: 8, step: 1 },
  // Saison-Fenster, identische Spannen wie `DUELL_LIMITS` in duellJoker.js —
  // dieselbe Quelle (`fensterVon`), dieselben Grenzen.
  schlussLaenge: { min: 2, max: 8, step: 1 },
  abSpieltag: { min: 1, max: 38, step: 1 },
  bisSpieltag: { min: 1, max: 38, step: 1 },
  // `wer`-Bereiche, identische Spannen wie `BASIS_LIMITS` in jokerBasis.js —
  // dieselbe Auswertung (`darfEinsetzen`), dieselbe Bedienbarkeit.
  abPlatz: { min: 1, max: 50, step: 1 },
  abRueckstand: { min: 0, max: 500, step: 1 },
  // Belohnungs-Felder — reine Bedienbarkeits-Grenzen, keine Balance-Vorgabe.
  jokerAnzahl: { min: 1, max: 10, step: 1 },
  budgetBetrag: { min: 0, max: 500, step: 1 },   // identisch zu BUDGET_LIMITS.betrag
  modFaktor: { min: 0.1, max: 5, step: 0.05 },
  modSpieltage: { min: 1, max: 10, step: 1 },
  punkteBetrag: { min: 0, max: 100, step: 1 },
  // ⚠️ `min: 0`, und 0 heißt KEIN Deckel.
  // Eine frühere Fassung stand auf `min: 1`, begründet mit „der Deckel darf nie
  // fehlen". Das war ein Denkfehler — verwechselt wurden:
  //   „die EINSTELLUNG darf nicht fehlen"  → Baukasten, stimmt
  //   „die GRENZE muss greifen"            → Balance, entscheidet der Admin
  // Das Feld bleibt Pflicht und steht immer im Regelwerk, damit der Admin die
  // Entscheidung überhaupt sieht. Aber „unbegrenzt" muss ausdrückbar sein,
  // sonst ist es eine TOTE Kontaktstelle: Admin stellt „kein Deckel" ein und
  // bekommt einen Deckel von 1. Nebenbei war `min: 1` auch praktisch absurd —
  // ein Punkt pro Saison ist dasselbe wie gar keine Punkte.
  maxPunkteProSaison: { min: 0, max: 2000, step: 1 },
};

export const DEFAULT_DREHRAD = {
  // ⚠️ Nachgetragen bei der Abnahme am 31.07.: In der ersten Fassung fehlte
  // `enabled` — als einzige optionale Ebene im ganzen Regelwerk hatte das Rad
  // keinen Aus-Schalter (`duell`, `budget`, `joker`, `ereignisse`, `saison`,
  // `bigGame` haben alle einen). Abschalten hätte geheißen, die Felder zu
  // leeren, worauf `pruefeFelder` „kein gültiges Rad" meldet — ein
  // FEHLERZUSTAND als Aus-Schalter. Standard aus, wie bei allen anderen.
  enabled: false,
  felder: [],
  sperrfrist: 0,
  frequenz: 4,
  modus: "gleich",
  phase: "letztesDrittel",
  schlussLaenge: 4,
  abSpieltag: null,
  bisSpieltag: null,
  wer: "alle",
  werWert: null,
  maxPunkteProSaison: 20,
};

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// ── Belohnung ────────────────────────────────────────────────
// `null` bei unbekanntem `typ` ODER — bei `typ: "joker"` — unbekannter `art`:
// eine Gutschrift auf eine nicht existierende Joker-Art ist genauso
// unbedienbar wie ein unbekannter Belohnungs-Typ, deshalb fliegt das ganze
// Feld über denselben Weg raus (siehe `pruefeFelder`).
function sanitizeBelohnung(b) {
  const o = b && typeof b === "object" ? b : {};
  if (!BELOHNUNGS_TYPEN.some((t) => t.key === o.typ)) return null;

  switch (o.typ) {
    case "nichts":
      return { typ: "nichts" };
    case "joker": {
      if (!JOKER_ARTEN.some((a) => a.key === o.art)) return null;
      return {
        typ: "joker",
        art: o.art,
        anzahl: Math.round(clamp(o.anzahl, DREHRAD_LIMITS.jokerAnzahl, 1)),
      };
    }
    case "budget":
      return { typ: "budget", betrag: Math.round(clamp(o.betrag, DREHRAD_LIMITS.budgetBetrag, 0)) };
    case "modifikator":
      return {
        typ: "modifikator",
        faktor: +clamp(o.faktor, DREHRAD_LIMITS.modFaktor, 1).toFixed(2),
        spieltage: Math.round(clamp(o.spieltage, DREHRAD_LIMITS.modSpieltage, 1)),
      };
    case "punkte":
      return { typ: "punkte", betrag: Math.round(clamp(o.betrag, DREHRAD_LIMITS.punkteBetrag, 0)) };
    default:
      return null;
  }
}

// Ein Wort, WARUM eine Belohnung verworfen wurde — für `pruefeFelder`.
function belohnungsGrund(b) {
  const typ = b && typeof b === "object" ? b.typ : b;
  if (!BELOHNUNGS_TYPEN.some((t) => t.key === typ)) {
    return `unbekannter Belohnungs-Typ „${typ}“`;
  }
  // typ ist bekannt, also (bei "joker") eine unbekannte Joker-Art.
  return `unbekannte Joker-Art „${b.art}“`;
}

// ── Felder: bereinigen UND sagen, was rausgeflogen ist ───────
// Muster `pruefeKlassen`/`sanitizeLimitKlassen` in limitKlassen.js: EINE
// Funktion liefert beides, die stumme Variante (`sanitizeDrehrad`) ruft sie
// nur auf und nimmt `felder`. `sperrfristVorgabe` ist der Rad-weite
// Standardwert (Abschnitt 2.2b) — am Feld gesetzt schlägt er ihn.
export function pruefeFelder(felder = [], sperrfristVorgabe = 0) {
  const arr = Array.isArray(felder) ? felder : [];
  const vorgabe = Math.round(clamp(sperrfristVorgabe, DREHRAD_LIMITS.sperrfrist, 0));

  const out = [];
  const verworfen = [];

  arr.forEach((f, index) => {
    const o = f && typeof f === "object" ? f : {};
    const id = o.id != null && String(o.id).trim() !== "" ? String(o.id) : null;
    if (!id) {
      verworfen.push({ index, id: null, grund: `Zeile ${index + 1}: fehlende oder leere „id“.` });
      return;
    }

    const label = typeof o.label === "string" && o.label.trim() !== "" ? o.label : null;
    if (!label) {
      verworfen.push({ index, id, grund: `„${id}“: fehlendes oder leeres „label“.` });
      return;
    }

    const belohnung = sanitizeBelohnung(o.belohnung);
    if (!belohnung) {
      verworfen.push({ index, id, grund: `„${id}“: ${belohnungsGrund(o.belohnung)}.` });
      return;
    }

    // Am Feld gesetzt schlägt die Rad-Vorgabe (Abschnitt 2.2b) — nur eine
    // tatsächlich gesetzte Zahl gilt als eigener Wert, sonst die Vorgabe.
    const eigeneSperrfrist = typeof o.sperrfrist === "number" && Number.isFinite(o.sperrfrist);
    out.push({
      id,
      label,
      gewicht: Math.round(clamp(o.gewicht, DREHRAD_LIMITS.gewicht, 0)),
      sperrfrist: eigeneSperrfrist
        ? Math.round(clamp(o.sperrfrist, DREHRAD_LIMITS.sperrfrist, vorgabe))
        : vorgabe,
      belohnung,
    });
  });

  const positive = out.filter((f) => f.gewicht > 0);
  const gueltig = positive.length >= 2;
  const grund = gueltig ? null : "Weniger als zwei Felder mit Gewicht über 0 — das ist kein Rad.";

  // 🔴 Vorab-Warnung (Abschnitt 2.2b): rechnerisch können die Sperrfristen so
  // hoch liegen, dass irgendwann ALLE Felder gleichzeitig gesperrt sind. Das
  // ist ein Hinweis, keine Verwerfung — `ziehe` fängt den Randfall selbst ab.
  const summeSperren = positive.reduce((s, f) => s + f.sperrfrist, 0);
  const warnung = gueltig && summeSperren >= positive.length
    ? "Die Sperrfristen sind zusammen so hoch, dass rechnerisch alle Felder gleichzeitig gesperrt sein können — eine Drehung zieht dann ausnahmsweise über das volle Rad."
    : null;

  return { felder: out, verworfen, gueltig, grund, warnung };
}

// Bereinigt die GANZE Drehrad-Einstellung. Ungültige Felder fliegen still
// raus (WARUM steht in `pruefeFelder`, für die UI).
export function sanitizeDrehrad(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};

  const sperrfrist = Math.round(clamp(p.sperrfrist, DREHRAD_LIMITS.sperrfrist, DEFAULT_DREHRAD.sperrfrist));
  const modus = MODI.includes(p.modus) ? p.modus : DEFAULT_DREHRAD.modus;
  const wer = WER.some((w) => w.key === p.wer) ? p.wer : DEFAULT_DREHRAD.wer;
  const werWertLimits = wer === "abPlatz" ? DREHRAD_LIMITS.abPlatz
    : wer === "abRueckstand" ? DREHRAD_LIMITS.abRueckstand
    : null;

  // `null`/`undefined` UND `0` gelten als „keine Vorgabe" — dieselbe Regel
  // wie bei `abSpieltag`/`bisSpieltag` in duellJoker.js (Spieltag 0 gibt es
  // nicht).
  const leerWert = (v) => v === null || v === undefined;
  const abSpieltagRoh = leerWert(p.abSpieltag) ? NaN : Number(p.abSpieltag);
  const bisSpieltagRoh = leerWert(p.bisSpieltag) ? NaN : Number(p.bisSpieltag);

  return {
    // Nur ein ausdrückliches `true` schaltet ein — dieselbe Bauart wie bei
    // allen anderen optionalen Ebenen.
    enabled: p.enabled === true,
    felder: pruefeFelder(p.felder, sperrfrist).felder,
    sperrfrist,
    frequenz: Math.round(clamp(p.frequenz, DREHRAD_LIMITS.frequenz, DEFAULT_DREHRAD.frequenz)),
    modus,
    phase: PHASEN.some((ph) => ph.key === p.phase) ? p.phase : DEFAULT_DREHRAD.phase,
    schlussLaenge: Math.round(clamp(p.schlussLaenge, DREHRAD_LIMITS.schlussLaenge, DEFAULT_DREHRAD.schlussLaenge)),
    abSpieltag: Number.isFinite(abSpieltagRoh) && abSpieltagRoh !== 0
      ? Math.round(clamp(abSpieltagRoh, DREHRAD_LIMITS.abSpieltag, DREHRAD_LIMITS.abSpieltag.min))
      : null,
    bisSpieltag: Number.isFinite(bisSpieltagRoh) && bisSpieltagRoh !== 0
      ? Math.round(clamp(bisSpieltagRoh, DREHRAD_LIMITS.bisSpieltag, DREHRAD_LIMITS.bisSpieltag.max))
      : null,
    wer,
    werWert: werWertLimits ? Math.round(clamp(p.werWert, werWertLimits, werWertLimits.min)) : null,
    // Pflichtfeld mit Vorgabe (Abschnitt 2.5, Punkt 2) — darf hoch stehen,
    // darf nie fehlen.
    maxPunkteProSaison: Math.round(clamp(p.maxPunkteProSaison, DREHRAD_LIMITS.maxPunkteProSaison, DEFAULT_DREHRAD.maxPunkteProSaison)),
  };
}

// ── Wahrscheinlichkeiten ─────────────────────────────────────
// Je Feld der Anteil (`gewicht` / Summe aller Gewichte) — für die Anzeige,
// damit der Admin sieht, was seine Gewichte bedeuten. Läuft über ALLE Felder,
// auch die mit `gewicht: 0` (Anteil 0), sonst fehlt in der Übersicht genau
// das Feld, das der Admin gerade vorbereitet.
export function wahrscheinlichkeiten(felder = []) {
  const arr = Array.isArray(felder) ? felder : [];
  const gesamt = arr.reduce((s, f) => s + (Number(f.gewicht) || 0), 0);
  return arr.map((f) => ({
    id: f.id,
    label: f.label,
    anteil: gesamt > 0 ? (Number(f.gewicht) || 0) / gesamt : 0,
  }));
}

// ── Wann gedreht wird ─────────────────────────────────────────
// Ruft `jokerPlan` auf, baut die Blockverteilung nicht nach (Abschnitt 2.3).
// Muster `duellPlan` in duellJoker.js: erst das Saison-Fenster über
// `fensterVon`, dann `jokerPlan` NUR auf die Breite dieses Fensters, danach
// die relativen Spieltage zurück in absolute umrechnen.
// `bespielt` (optional): nur diese Runden-Spieltage tragen ein Spiel. Ohne die
// Einschränkung fällt eine Drehung auf einen Spieltag, an dem niemand tippt —
// und „kein Rad ohne Tipp" (5.0-Invariante) verwirft sie dann stillschweigend.
// Der Spieler verliert eine Drehung, ohne dass irgendwo etwas fehlschlägt.
export function drehradPlan({
  spieltage = 34, drehrad = DEFAULT_DREHRAD, seed = "", userIds = [], bespielt = null,
} = {}) {
  const cfg = sanitizeDrehrad(drehrad);
  const fenster = fensterVon(cfg, spieltage);
  const breite = fenster.bis - fenster.von + 1;

  // Ausgeschaltet heißt: keine Drehungen. Das Fenster wird trotzdem gemeldet,
  // damit die Vorschau in der Oberfläche zeigen kann, WO gedreht WÜRDE.
  if (!cfg.enabled || breite < 1 || !userIds.length) {
    return { von: fenster.von, bis: fenster.bis, proSpieler: Object.fromEntries(userIds.map((id) => [id, []])) };
  }

  // Innerhalb des Fensters wird RELATIV gezählt (1…breite), deshalb müssen die
  // bespielten Tage denselben Bezug bekommen — und danach zurückgerechnet.
  const bespieltRelativ = Array.isArray(bespielt)
    ? bespielt.filter((t) => t >= fenster.von && t <= fenster.bis).map((t) => t - fenster.von + 1)
    : null;
  const plan = jokerPlan({
    spieltage: breite,
    verteilung: { modus: cfg.modus, frequenz: cfg.frequenz },
    seed,
    userIds,
    bespielt: bespieltRelativ,
  });

  const proSpieler = {};
  for (const id of userIds) {
    const relativ = plan.proSpieler?.[id] ?? plan.alle ?? [];
    proSpieler[id] = relativ.map((t) => t + fenster.von - 1);
  }
  return { von: fenster.von, bis: fenster.bis, proSpieler };
}

// ── Die Ziehung ───────────────────────────────────────────────
// 🔴 Deterministisch über `(rundenId, userId, spieltag, bisherige)` —
// dieselben Eingaben liefern immer dasselbe Feld (Abschnitt 2.5, Punkt 1).
// `bisherige` = zuletzt gezogene Feld-Ids DIESES Spielers, neueste zuerst.
export function ziehe(drehrad, { rundenId, userId, spieltag, bisherige = [] } = {}) {
  const cfg = sanitizeDrehrad(drehrad);
  const historie = Array.isArray(bisherige) ? bisherige : [];

  // „Volles Rad" heißt: alle Felder mit Gewicht > 0 — ein Feld mit
  // `gewicht: 0` fällt NIE, auch nicht im Randfall (Abschnitt 2.5-Katalog).
  const felder = cfg.felder.filter((f) => f.gewicht > 0);
  if (!felder.length) return null;

  // Gesperrt, solange die letzte Ziehung dieses Feldes weniger als
  // `sperrfrist` Drehungen zurückliegt. `indexOf` findet das JÜNGSTE
  // Vorkommen zuerst, weil `historie` neueste-zuerst sortiert ist.
  const gesperrt = (feld) => {
    if (!feld.sperrfrist) return false;
    const idx = historie.indexOf(feld.id);
    return idx !== -1 && idx < feld.sperrfrist;
  };

  let verfuegbar = felder.filter((f) => !gesperrt(f));
  // 🔴 Randfall (Abschnitt 2.2b): sind ALLE Felder gesperrt, wird die Sperre
  // für DIESE Drehung ignoriert — eine Drehung ohne Ergebnis wäre der
  // schlechtere Fehler.
  if (!verfuegbar.length) verfuegbar = felder;

  const gesamtgewicht = verfuegbar.reduce((s, f) => s + f.gewicht, 0);
  const r = seeded(`${rundenId}|${userId}|${spieltag}`);
  let schwelle = r * gesamtgewicht;
  for (const f of verfuegbar) {
    schwelle -= f.gewicht;
    if (schwelle < 0) return f;
  }
  return verfuegbar[verfuegbar.length - 1]; // Rundungsschutz
}

// ── Ein Satz für die UI ──────────────────────────────────────
export function beschreibeDrehrad(drehrad, spieltage = 34) {
  const cfg = sanitizeDrehrad(drehrad);
  const positive = cfg.felder.filter((f) => f.gewicht > 0);
  if (positive.length < 2) {
    return "Kein gültiges Rad — mindestens zwei Felder mit Gewicht über 0 nötig.";
  }
  const fenster = fensterVon(cfg, spieltage);
  const wo = cfg.modus === "gleich" ? "für alle am selben Spieltag" : "jeder an eigenen Spieltagen";
  return `${positive.length} Felder auf dem Rad, etwa jeder ${cfg.frequenz}. Spieltag zwischen Spieltag ${fenster.von} und ${fenster.bis}, ${wo}.`;
}

// ── Auswertung: der Punkte-Deckel wird durchgesetzt ──────────
// K2 (Abnahme 31.07., design/drehrad.md Abschnitt 3b (b)): `maxPunkteProSaison`
// wurde bisher gespeichert, aber nie durchgesetzt — ein Deckel, der nicht
// deckelt. Stilvorlage `auswerten()` in `ereignisse.js`: dort setzt sie den
// `maxErspielt`-Deckel CHRONOLOGISCH durch, hier ist es derselbe Gedanke für
// `maxPunkteProSaison`.
//
// `ziehungen` = `[{ userId, spieltag, feldId }]`, CHRONOLOGISCH — der
// Aufrufer garantiert die Reihenfolge, diese Funktion sortiert nicht selbst
// um (dieselbe Aufgabenteilung wie bei `ereignisse.js`, das seine `eintraege`
// ebenfalls in der übergebenen Reihenfolge liest, bevor es intern nach
// `pos()` neu ordnet — hier gibt es keine unabhängige Positionsquelle wie
// `spieltageChronologisch`, deshalb zählt schlicht die Eingabereihenfolge).
//
// Nur `belohnung.typ === "punkte"` wird gedeckelt, CHRONOLOGISCH JE NUTZER —
// Joker-, Narren- und Modifikator-Felder sind unberührt, sie haben ihre eigenen
// Deckel an anderer Stelle (jokerBudget.js, modCap). `gedeckelt` listet, wem
// wie viel gekürzt wurde — ohne diese Liste sieht ein Spieler eine
// Auszahlung, die nicht zu seinem Rad passt, und kann sich das nicht
// erklären (dieselbe Regel wie `gestrichen` in saisonform.js).
//
// 🔴 `maxPunkteProSaison: 0` heißt KEIN Deckel, nicht „keine Punkte".
// Das geht seit der Korrektur an `DREHRAD_LIMITS` auch durch `sanitizeDrehrad`
// hindurch (dort steht die Begründung, warum `min` jetzt 0 ist). Vorher musste
// diese Funktion den Rohwert an der Bereinigung vorbei lesen, weil ein
// ausdrückliches 0 sonst auf 1 hochgezogen worden wäre — das waren zwei Wege
// zum selben Wert, und der schlechtere hätte irgendwann gewonnen.
// Jetzt gilt EIN Weg: bereinigen, dann rechnen.
export function auswerten(drehrad, ziehungen = []) {
  const d = drehrad && typeof drehrad === "object" ? drehrad : {};
  const felder = pruefeFelder(d.felder, d.sperrfrist).felder;
  const feldVon = new Map(felder.map((f) => [f.id, f]));

  const maxPunkte = sanitizeDrehrad(d).maxPunkteProSaison;
  const keinDeckel = maxPunkte === 0;

  const arr = Array.isArray(ziehungen) ? ziehungen : [];
  const punkteSumme = new Map(); // userId -> bereits gutgeschriebene Punkte
  const gutschriften = [];
  const gedeckelt = [];

  for (const z of arr) {
    if (!z || typeof z !== "object") continue;
    const feld = feldVon.get(z.feldId);
    if (!feld) continue; // unbekanntes Feld: keine Gutschrift, kein Fehler
    const belohnung = feld.belohnung;

    if (belohnung.typ !== "punkte" || keinDeckel) {
      gutschriften.push({ userId: z.userId, spieltag: z.spieltag, feldId: z.feldId, belohnung });
      continue;
    }

    const bisher = punkteSumme.get(z.userId) ?? 0;
    const verbleibend = Math.max(0, maxPunkte - bisher);
    const ausgezahlt = Math.min(belohnung.betrag, verbleibend);
    punkteSumme.set(z.userId, bisher + ausgezahlt);

    if (ausgezahlt < belohnung.betrag) {
      gedeckelt.push({
        userId: z.userId,
        spieltag: z.spieltag,
        feldId: z.feldId,
        angefragt: belohnung.betrag,
        ausgezahlt,
        gekuerzt: belohnung.betrag - ausgezahlt,
      });
    }
    gutschriften.push({
      userId: z.userId, spieltag: z.spieltag, feldId: z.feldId,
      belohnung: { ...belohnung, betrag: ausgezahlt },
    });
  }

  return { gutschriften, gedeckelt };
}
