// ============================================================
//  WANN GEHT ES LOS? — die Auslöser-Achse der Regel-Grammatik
//
//  Die vier Satzglieder sind WANN (diese Datei) → WEN (`auswahl.js`) →
//  WAS (`wirkung.js`) → WIE LANGE (Geltung). Damit ist die dritte von vier
//  herausgelöst.
//
//  ── 🔴 Warum das ein GATTER ist und kein Ersatz ──
//  Die Ereignis-Typen in `ereignisse.js` SIND heute schon Auslöser: „Serie",
//  „erster exakter Treffer", „Außenseiter getroffen". Diese Datei ersetzt sie
//  nicht, sondern legt eine zweite Frage davor: „und passt der Zeitpunkt?"
//
//  Das ist die billigere Hälfte und trotzdem die nützlichere. Aus
//  „Trost-Joker" wird „Trost-Joker, aber nur jeden vierten Spieltag" oder
//  „nur, solange die Tabelle eng ist" — ohne eine Zeile neuen
//  Auswertungs-Code, genau wie die WEN-Achse aus dem Trost-Joker die
//  Spieltags-Krone gemacht hat. Ein Ersatz der bestehenden Typen wäre
//  dagegen ein Umbau der funktionierenden Ebene, und der gehört nicht in
//  denselben Schritt.
//
//  ── ⚠️ Ein Gatter, das immer offen ist, ist die Vorgabe ──
//  `{ typ: "immer" }` ändert nichts. Jedes bestehende Regelwerk und jeder
//  geteilte Creator-Code verhält sich unverändert — dieselbe Regel wie bei
//  der WAS-Achse, wo `joker` die Vorgabe blieb.
//
//  ── Deterministisch, nachprüfbar, ohne Serverzustand ──
//  `zufall` zieht aus `seeded.js` über Runden-Id und Spieltag: alle sehen
//  dasselbe, es ist von Hand nachrechenbar, und der Creator-Code bleibt kurz,
//  weil die REGEL gespeichert wird und nicht die ausgerollte Liste. Wörtlich
//  die Bauart von `jokerPlan.js` und `auswahl.js`.
//
//  ⚠️ **Und die Falle, die dieses Projekt schon einmal behoben hat:** reiner
//  Zufall BÜNDELT. `jokerPlan.js` hat es dokumentiert — „sonst bündelt reiner
//  Zufall vier Joker in fünf Spieltagen; formal fair, gefühlt kaputt" — und
//  löst es blockweise. `zufall` hier nimmt dieselbe Lösung: je Block von
//  `frequenz` Spieltagen feuert GENAU EINER, welcher ist gelost. Ohne das
//  baut man einen Fehler ein, den das Projekt schon kennt.
//
//  ── Jeder Auslöser deklariert seine Daten (`braucht`) ──
//  Gleiches Muster wie bei Ereignissen, Saison-Wetten und Wirkungen. Was ohne
//  Grundlage ist (`abstimmung`, `adminAusloesung`, `kaskade`, `lotterie`),
//  steht im Katalog und lässt sich nicht einstellen.
//
//  Reine Funktionen, UI-frei. Dieses Modul entscheidet NUR „ja/nein" für einen
//  Spieltag — wen es trifft und was passiert, sagen die anderen beiden Achsen.
// ============================================================

import { seeded } from "./seeded";

// Was ein Auslöser an Daten voraussetzt. Alles darüber hinaus existiert nicht.
export const VERFUEGBARE_DATEN = ["spieltag", "stand", "ergebnisse", "quoten", "tipps"];

export const AUSLOESER_TYPEN = [
  {
    key: "immer", label: "Immer", braucht: [], parameter: [],
    standard: {},
    text: "Kein zusätzlicher Zeitpunkt — das Ereignis entscheidet allein.",
  },
  {
    key: "rhythmus", label: "Jeder n-te Spieltag", braucht: ["spieltag"], parameter: ["n"],
    standard: { n: 4 },
    text: "Nur an jedem n-ten Spieltag. Macht aus einer wöchentlichen Regel ein Ereignis.",
  },
  {
    key: "termin", label: "Ein fester Spieltag", braucht: ["spieltag"], parameter: ["spieltag"],
    standard: { spieltag: 17 },
    text: "Genau einmal, an einem vorher bekannten Spieltag.",
  },
  {
    key: "saisonende", label: "Zum Saisonende", braucht: ["spieltag"], parameter: ["letzte"],
    standard: { letzte: 3 },
    text: "Nur in den letzten Spieltagen — wenn es ohnehin um alles geht.",
  },
  {
    key: "zufall", label: "Unangekündigt", braucht: ["spieltag"], parameter: ["frequenz"],
    standard: { frequenz: 6 },
    text: "Etwa alle n Spieltage, welcher genau weiß vorher niemand. Blockweise, damit es sich nicht bündelt.",
  },
  {
    key: "enge", label: "Solange es eng ist", braucht: ["stand"], parameter: ["prozent"],
    standard: { prozent: 15 },
    text: "Nur, wenn der Abstand zwischen Erstem und Letztem klein ist.",
  },
  {
    key: "abstand", label: "Wenn jemand davonzieht", braucht: ["stand"], parameter: ["prozent"],
    standard: { prozent: 30 },
    text: "Das Gegenteil: erst, wenn sich die Tabelle auseinanderzieht.",
  },
  {
    // 🔴 Der beste Kandidat der ganzen Liste (Roadmap): braucht keine neuen
    // Daten, erzeugt ein Gemeinschaftsgefühl, das keine individuelle Regel
    // hinbekommt, und ist automatisch balancefair, weil es alle gleich trifft.
    key: "gruppenereignis", label: "Niemand hat es getroffen",
    braucht: ["tipps", "ergebnisse"], parameter: [],
    standard: {},
    text: "Nur, wenn an diesem Spieltag kein einziger in der Runde ein Spiel exakt getroffen hat.",
  },
  {
    key: "quotenereignis", label: "Ein Außenseiter hat gewonnen",
    braucht: ["ergebnisse", "quoten"], parameter: ["abQuote"],
    standard: { abQuote: 6 },
    text: "Nur, wenn an diesem Spieltag ein Außenseiter über der eingestellten Quote gewonnen hat.",
  },
  {
    key: "torlos", label: "Ein Spiel endete 0:0", braucht: ["ergebnisse"], parameter: [],
    standard: {},
    text: "Nur, wenn an diesem Spieltag mindestens ein Spiel torlos blieb.",
  },
  // ── Vorbereitet, aber ohne Grundlage ──
  {
    key: "lotterie", label: "Gelost aus einer Tabelle", braucht: ["lotterie"], parameter: [],
    standard: {},
    text: "Eine Ziehung über mehrere Ereignisse mit Gewichten — braucht eine eigene Tabelle.",
  },
  {
    key: "abstimmung", label: "Die Runde entscheidet", braucht: ["abstimmung"], parameter: [],
    standard: {},
    text: "Erst, wenn die Runde dafür gestimmt hat.",
  },
  {
    key: "adminAusloesung", label: "Der Admin drückt", braucht: ["adminKnopf"], parameter: [],
    standard: {},
    text: "Wie beim Big Game: ein Mensch entscheidet den Moment.",
  },
  {
    key: "kaskade", label: "Ein anderes Ereignis", braucht: ["kaskade"], parameter: [],
    standard: {},
    text: "Ein Ereignis löst das nächste aus — braucht eine Zyklus-Erkennung.",
  },
];

export const AUSLOESER = Object.fromEntries(AUSLOESER_TYPEN.map((a) => [a.key, a]));

export function istAuswertbar(key) {
  const a = AUSLOESER[key];
  return !!a && a.braucht.every((b) => VERFUEGBARE_DATEN.includes(b));
}

export const AUSWERTBARE_AUSLOESER = AUSLOESER_TYPEN.filter((a) => istAuswertbar(a.key));

export const AUSLOESER_LIMITS = {
  n: { min: 2, max: 12, step: 1 },
  spieltag: { min: 1, max: 38, step: 1 },
  letzte: { min: 1, max: 10, step: 1 },
  frequenz: { min: 2, max: 12, step: 1 },
  prozent: { min: 5, max: 60, step: 5 },
  abQuote: { min: 2, max: 15, step: 0.5 },
};

export const DEFAULT_AUSLOESER = { typ: "immer" };

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// ── Sanitize ────────────────────────────────────────────────
// Muster `sanitizeWirkung`: unbekannter oder unfertiger Typ fällt auf „immer"
// zurück, Zahlen werden beschnitten, und gesetzt werden NUR die Parameter des
// jeweiligen Typs — ein Feld, das nichts tut, wird beim nächsten Lesen für
// eine Einstellung gehalten.
export function sanitizeAusloeser(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const typ = istAuswertbar(p.typ) ? p.typ : DEFAULT_AUSLOESER.typ;
  const a = AUSLOESER[typ];
  const out = { typ };
  for (const feld of a.parameter) {
    const grenze = AUSLOESER_LIMITS[feld];
    const roh = clamp(p[feld], grenze, a.standard[feld]);
    out[feld] = grenze.step < 1 ? +roh.toFixed(1) : Math.round(roh);
  }
  return out;
}

// ── Feuert der Auslöser an diesem Spieltag? ─────────────────
// 🔴 Fehlende Daten heißen NEIN, nicht ja. Ein Gatter, das ohne seine
// Grundlage aufgeht, ist keines — und der Admin sähe ein Ereignis feuern,
// das er auf „nur wenn es eng ist" gestellt hat. Dieselbe Regel wie bei
// `tippStatus` (ohne verwertbaren Anpfiff gilt ZU) und bei den Saison-Wetten
// (unbekannter Stand hält die Wette zu).
//
// `position` ist die 1-basierte Stelle des Spieltags im Verlauf DER RUNDE —
// nicht der Liga-Spieltag. Über den Liga-Spieltag gerechnet feuerte „jeder
// vierte Spieltag" in einer Runde über fünf Wettbewerbe fünfmal pro Block;
// dieselbe Falle wie beim Joker-Plan, und sie ist hier schon einmal teuer
// gewesen.
export function feuert({
  ausloeser,
  position = null,          // 1-basierte Stelle im Runden-Verlauf
  spieltageGesamt = null,   // wie viele es insgesamt gibt (für `saisonende`)
  stand = [],               // Tabellenstand VOR diesem Spieltag
  spiele = [],              // die Spiele dieses Spieltags: { result, snapshot }
  eintraege = [],           // alle Tipps dieses Spieltags (alle Spieler)
  rundenId = "",
} = {}) {
  const cfg = sanitizeAusloeser(ausloeser);
  if (cfg.typ === "immer") return true;

  // ⚠️ `null` UND `undefined` gelten als „keine Angabe" und werden NICHT
  // durch `Number()` gejagt: `Number(null) === 0`, und `Number.isFinite(0)`
  // ist wahr. Ohne diese Zeile hielt `rhythmus` eine fehlende Position für
  // Spieltag 0 — und `0 % 4 === 0` heißt: das Gatter geht ohne jede Grundlage
  // auf. Genau der Fehler, den `sanitizeDuellJoker` bei `abSpieltag` schon
  // einmal hatte; hier hat ihn der Test gefunden, bevor er in die Wertung kam.
  const pos = (position === null || position === undefined) ? NaN : Number(position);
  const brauchtPosition = ["rhythmus", "termin", "saisonende", "zufall"].includes(cfg.typ);
  if (brauchtPosition && (!Number.isFinite(pos) || pos < 1)) return false;

  switch (cfg.typ) {
    case "rhythmus":
      return pos % cfg.n === 0;

    case "termin":
      return pos === cfg.spieltag;

    case "saisonende": {
      const n = Number(spieltageGesamt);
      if (!Number.isFinite(n) || n < 1) return false;
      return pos > n - cfg.letzte;
    }

    // Blockweise: je `frequenz` Spieltage feuert genau einer, gelost aus der
    // Runden-Id. Siehe Kopfkommentar — reiner Zufall bündelt.
    case "zufall": {
      const block = Math.floor((pos - 1) / cfg.frequenz);
      const gewaehlt = Math.floor(seeded(`${rundenId}|zufall|${block}`) * cfg.frequenz);
      return (pos - 1) % cfg.frequenz === gewaehlt;
    }

    // Eng oder weit: gemessen als Abstand zwischen Erstem und Letztem,
    // RELATIV zur Spitze. Eine absolute Punktzahl wäre bei unserer
    // Quoten-Wertung sinnlos — 200 Punkte sind am 3. Spieltag alles und am
    // 30. nichts. Dieselbe Begründung wie bei `catchup.schwelle`.
    case "enge":
    case "abstand": {
      const werte = stand.map((z) => Number(z.total) || 0);
      if (werte.length < 2) return false;
      const oben = Math.max(...werte);
      const unten = Math.min(...werte);
      if (!(oben > 0)) return false;
      const spanne = (oben - unten) / oben;
      return cfg.typ === "enge" ? spanne <= cfg.prozent / 100 : spanne >= cfg.prozent / 100;
    }

    case "gruppenereignis": {
      // Kein einziger exakter Treffer in der ganzen Runde. Ohne Tipps mit
      // Ergebnis lässt sich das nicht feststellen — dann NEIN.
      const auswertbar = eintraege.filter((e) => e?.result && e?.tip);
      if (!auswertbar.length) return false;
      return !auswertbar.some((e) => e.tip.home === e.result.home && e.tip.away === e.result.away);
    }

    case "quotenereignis":
      return spiele.some((m) => {
        if (!m?.result) return false;
        const heim = m.result.home > m.result.away;
        const gast = m.result.away > m.result.home;
        if (!heim && !gast) return false;
        const quote = heim ? m.snapshot?.winner?.home : m.snapshot?.winner?.away;
        return Number.isFinite(quote) && quote >= cfg.abQuote;
      });

    case "torlos":
      return spiele.some((m) => m?.result && m.result.home === 0 && m.result.away === 0);

    default:
      return false;
  }
}

// ── Ein Satz für die Oberfläche ─────────────────────────────
// Muster `beschreibeWirkung`/`beschreibeAuswahl`: nicht der Feldname, sondern
// die Bedingung im Klartext.
export function beschreibeAusloeser(ausloeser) {
  const a = sanitizeAusloeser(ausloeser);
  switch (a.typ) {
    case "immer": return "zu jedem Zeitpunkt";
    case "rhythmus": return `nur an jedem ${a.n}. Spieltag`;
    case "termin": return `nur an Spieltag ${a.spieltag}`;
    case "saisonende": return `nur in den letzten ${a.letzte} Spieltagen`;
    case "zufall": return `unangekündigt, etwa alle ${a.frequenz} Spieltage`;
    case "enge": return `nur solange höchstens ${a.prozent} % zwischen Erstem und Letztem liegen`;
    case "abstand": return `nur wenn mindestens ${a.prozent} % zwischen Erstem und Letztem liegen`;
    case "gruppenereignis": return "nur wenn niemand in der Runde exakt getroffen hat";
    case "quotenereignis": return `nur wenn ein Außenseiter ab Quote ${a.abQuote} gewonnen hat`;
    case "torlos": return "nur wenn ein Spiel 0:0 endete";
    default: return AUSLOESER[a.typ]?.label ?? "";
  }
}

// Wie oft feuert das voraussichtlich? Speist die Live-Vorschau — „jeder
// 4. Spieltag" klingt nach wenig und sind über eine Saison neun Auslösungen.
// Dieselbe Rolle wie `trefferAnteil()` bei der WEN-Achse und `anteile()` bei
// den Wettbewerbs-Gewichten.
//
// `null` für alles, was an Daten hängt, die beim Einstellen niemand hat —
// lieber nichts sagen als raten (wörtlich die Regel aus `trefferAnteil`).
export function haeufigkeit(ausloeser, spieltage = 34) {
  const a = sanitizeAusloeser(ausloeser);
  const n = Math.max(1, Math.floor(Number(spieltage) || 34));
  switch (a.typ) {
    case "immer": return n;
    case "rhythmus": return Math.floor(n / a.n);
    case "termin": return a.spieltag <= n ? 1 : 0;
    case "saisonende": return Math.min(a.letzte, n);
    case "zufall": return Math.ceil(n / a.frequenz);
    default: return null;
  }
}
