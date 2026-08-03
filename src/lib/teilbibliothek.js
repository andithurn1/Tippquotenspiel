// ============================================================
//  TEILBIBLIOTHEKEN — Baukasten-Elemente je Aspekt
//
//  design/teilbibliotheken.md. Der Kern (Abschnitt 1 dort): eine Teil-
//  bibliothek ist nichts anderes als kuratierte Einträge für EINEN Aspekt aus
//  `presetMerge.ASPEKTE` — der Zuschnitt liegt dort bereits fest, samt
//  Begründungen je Aspekt (Kommentare in presetMerge.js). Wir bauen kein
//  neues Zuschnitt-Konzept, nur einen Code, der genau einen Aspekt trägt.
//
//  ⚠️ Ein Teil-Code trägt IMMER einen ganzen Aspekt, nie einzelne Felder
//  daraus. Wer „nur den Joker-Faktor" teilen könnte, teilt einen halben Satz
//  — genau davor schützen die Aspekte.
//
//  Codeformat, parallel zu encodePreset/decodePreset (engine.js):
//    TS2-…              ganzes Regelwerk        (engine.js, unverändert)
//    TS2A-<aspekt>-…     ein einzelner Aspekt     (hier)
//
//  Kodiert wird wie beim Vollformat: nur die Abweichungen von
//  sanitizeRules(DEFAULT_RULES), hier beschränkt auf die Felder des Aspekts.
//  Angewendet wird über `mergePresets` aus presetMerge.js — die Funktion, die
//  im Plan als „mische()" bezeichnet ist (es gibt keine gleichnamige
//  Exportfunktion; `mergePresets` ist die gemeinte Mischfunktion, siehe
//  Bericht) — nicht selbst gemergt.
//
//  Reine Funktionen, UI-frei.
// ============================================================

// ⚠️ `ruleDelta`, `toBase64` und `fromBase64` werden aus `engine.js`
// IMPORTIERT, nicht nachgebaut. Eine erste Fassung dieses Moduls hatte sie
// dupliziert (sie waren dort nicht exportiert) — das wäre die zuverlässigste
// Art gewesen, das Codeformat auseinanderlaufen zu lassen: ein Teil-Code, der
// anders differenziert als der Vollcode, fiele erst auf, wenn jemand einen
// geteilten Code nicht mehr laden kann. Deshalb sind sie jetzt exportiert.
import { DEFAULT_RULES, sanitizeRules, ruleDelta, toBase64, fromBase64 } from "./engine";
import { ASPEKTE, mergePresets, defaultAuswahl } from "./presetMerge";
import { KOMBINATIONEN } from "./jokerBibliothek";
import { SAISON_PRESETS } from "./saisonwetten";

const feldDelta = ruleDelta;

const TEIL_CODE_PRAEFIX = "TS2A-";

function findAspekt(key) {
  return ASPEKTE.find((a) => a.key === key);
}

// ── Kodieren ─────────────────────────────────────────────────
// Nur die Abweichungen der Felder DIESES Aspekts von
// sanitizeRules(DEFAULT_RULES) — dadurch wird ein Teil-Code kurz. Unbekannter
// Aspekt wirft, statt einen halben (falschen) Code zu erzeugen.
export function bildeTeilCode(rules, aspekt) {
  const aspektDef = findAspekt(aspekt);
  if (!aspektDef) throw new Error(`Unbekannter Aspekt: „${aspekt}“.`);
  const clean = sanitizeRules(rules);
  const base = sanitizeRules(DEFAULT_RULES);
  const delta = {};
  for (const k of aspektDef.keys) {
    const d = feldDelta(clean[k], base[k]);
    if (d !== undefined) delta[k] = d;
  }
  const j = JSON.stringify(delta);
  return `${TEIL_CODE_PRAEFIX}${aspekt}-${toBase64(j).replace(/=+$/, "")}`;
}

// ── Erkennen ─────────────────────────────────────────────────
// Muss zu istCreatorCode (engine.js) passen: TS2A- ist mit KEINEM der dort
// bekannten Präfixe (TS2-, TS1-) identisch, die beiden Codearten schließen
// sich also gegenseitig aus, ohne dass istCreatorCode angefasst werden muss.
export function istTeilCode(text) {
  return typeof text === "string" && text.startsWith(TEIL_CODE_PRAEFIX);
}

// ── Zerlegen ─────────────────────────────────────────────────
// ⚠️ Der Aspekt-Schlüssel kann (Zukunftssicherheit) Bindestriche enthalten —
// deshalb erst das Präfix abschneiden, dann am LETZTEN Bindestrich vor dem
// Base64-Teil trennen (gleiches Muster wie `zerlegeCode` in
// jokerBibliothek.js für Preset-/Kombi-Schlüssel). Unbekannter Aspekt oder
// kaputtes Base64/JSON → null, nie geraten.
export function zerlegeTeilCode(code) {
  if (!istTeilCode(code)) return null;
  const rest = code.slice(TEIL_CODE_PRAEFIX.length);
  const idx = rest.lastIndexOf("-");
  if (idx < 0) return null;
  const aspekt = rest.slice(0, idx);
  const payload = rest.slice(idx + 1);
  if (!aspekt || !payload) return null;
  if (!findAspekt(aspekt)) return null;
  let werte;
  try {
    werte = JSON.parse(fromBase64(payload));
  } catch {
    return null;
  }
  if (!werte || typeof werte !== "object" || Array.isArray(werte)) return null;
  return { aspekt, werte };
}

// ── Anwenden ─────────────────────────────────────────────────
// Läuft über `mergePresets` (presetMerge.js) — nicht selbst mergen. Der
// Teil-Code liefert nur die Felder SEINES Aspekts als „Seite B"; alle
// anderen Aspekte bleiben exakt bei `rules` („Seite A"). Der Name bleibt
// erhalten (kein Aspekt trägt `name`) — sonst würde jede Anwendung eines
// Teil-Codes das Regelwerk stillschweigend umbenennen (mergePresets würde
// ohne expliziten Namen sonst „<Name> × Standard" daraus machen).
export function wendeTeilCodeAn(rules, code) {
  const zerlegt = zerlegeTeilCode(code);
  if (!zerlegt) {
    throw new Error(`Ungültiger Teil-Code: „${code}“ lässt sich nicht als Teilbibliotheks-Code lesen.`);
  }
  const auswahl = { ...defaultAuswahl("a"), [zerlegt.aspekt]: "b" };
  const eigenerName = sanitizeRules(rules).name;
  return mergePresets(rules, zerlegt.werte, auswahl, eigenerName);
}

// ── Beschreibung für die UI ──────────────────────────────────
export function beschreibeTeilCode(code) {
  const zerlegt = zerlegeTeilCode(code);
  if (!zerlegt) return "Ungültiger Teil-Code.";
  const aspektDef = findAspekt(zerlegt.aspekt);
  const anzahl = Object.keys(zerlegt.werte).length;
  const feldWort = anzahl === 1 ? "abweichendes Feld" : "abweichende Felder";
  return `${aspektDef.label}, ${anzahl} ${feldWort}`;
}

// ── Kataloge: Teilbibliotheken je Aspekt ─────────────────────
// Datenform (design/teilbibliotheken.md Abschnitt 3):
//   { aspekt, eintraege: [{ key, label, desc, werte }] }
// `werte` enthält NUR Felder des jeweiligen Aspekts (erzwungen durch einen
// Test in teilbibliothek.test.js).
//
// Vorhandene Kataloge werden REFERENZIERT, nicht dupliziert
// (design/teilbibliotheken.md Abschnitt 3, letzter Punkt). Für den Aspekt
// „modifikatoren" deckt `KOMBINATIONEN` (jokerBibliothek.js) bereits
// budget/limitKlassen/duell ab — alles Felder dieses Aspekts (siehe
// presetMerge.ASPEKTE). Die übrigen Aspekte sind hier zunächst leer; ihre
// Kataloge (Drehrad, Auslöser, Saisonform/Aufholen, Spielauswahl, …) sind
// laut Plan Schritt 3 (design/teilbibliotheken.md Abschnitt 7) noch zu
// kuratieren.
export const TEILBIBLIOTHEKEN = [
  {
    aspekt: "naehe",
    // ⚠️ `m` wandert mit `k` mit — nachgemessen, nicht geschätzt.
    // Eine erste Fassung ließ `m` bei allen Einträgen auf der Vorgabe 0,5 und
    // bewegte nur `k`. Ergebnis: „Ausgewogen" und „Streng" zahlten an JEDEM
    // Tipp exakt dasselbe (36,4 · 23,2 · 14,1 · 10,4 · 5,6 roh). Grund:
    // `scoreResult` nimmt das `max()` seiner Teile, und die siegerunabhängige
    // Team-Tore-Nähe hängt an `m`, nicht an `k`. Bei gleichem `m` überdeckt
    // sie den ganzen Unterschied, den `k` in der Ergebnis-Nähe erzeugt.
    // Zwei Einträge, die verschieden heißen und gleich schmecken, sind kein
    // Baukasten — genau davor warnt `presetMerge.js` im Kopf, wenn es sagt,
    // dass zusammengehörige Werte gemeinsam wandern müssen.
    eintraege: [
      {
        key: "mild", label: "Mild",
        desc: "Knapp daneben zahlt noch gut, und ein Fehltipp kostet wenig.",
        werte: { k: 0.7, m: 0.35, minPayout: 2, wrongPenalty: -2, winnerFloor: true },
      },
      {
        key: "ausgewogen", label: "Ausgewogen",
        desc: "Die Werte des Standard-Regelwerks: Nähe zählt spürbar, ein Fehltipp kostet.",
        werte: { k: 1.3, m: 0.5, minPayout: 3.5, wrongPenalty: -5, winnerFloor: true },
      },
      {
        key: "streng", label: "Streng",
        desc: "Nur wer nah dran liegt, bekommt etwas. Knapp vorbei ist auch daneben.",
        werte: { k: 1.6, m: 0.9, minPayout: 5, wrongPenalty: -5, winnerFloor: true },
      },
      {
        key: "ohneNetz", label: "Ohne Sicherheitsnetz",
        desc: "Kein Mindestbetrag, und der bloß richtige Sieger bringt für sich nichts mehr.",
        werte: { k: 1.6, m: 1.2, minPayout: 0, wrongPenalty: -5, winnerFloor: false },
      },
    ],
  },
  {
    aspekt: "kombi",
    eintraege: [
      {
        key: "flach", label: "Flach",
        desc: "Die Torschützen zählen für sich — unabhängig davon, wie gut das Ergebnis getroffen war.",
        werte: { combo: { tendenz: 1, abstand: 1, exakt: 1 } },
      },
      {
        key: "gestuft", label: "Gestuft",
        desc: "Die übliche Staffelung: jede erreichte Ebene zahlt etwas mehr.",
        werte: { combo: { tendenz: 1.15, abstand: 1.5, exakt: 2.3 } },
      },
      {
        key: "exaktEntscheidet", label: "Der exakte Tipp entscheidet",
        desc: "Zwischen richtigem Abstand und Volltreffer liegt eine große Lücke.",
        werte: { combo: { tendenz: 1.1, abstand: 1.35, exakt: 4 } },
      },
      {
        key: "gleichmaessig", label: "Gleichmäßig",
        desc: "Die Stufen liegen dicht beieinander; schon die richtige Tendenz trägt.",
        werte: { combo: { tendenz: 1.3, abstand: 1.65, exakt: 2 } },
      },
    ],
  },
  {
    aspekt: "underdog",
    eintraege: [
      {
        key: "gleich", label: "Alle Spiele gleich",
        desc: "Kein Aufschlag auf Überraschungen, kein Abzug für einen Reinfall.",
        werte: { underdogBoost: 1, underdogRampStart: 3, underdogRampEnd: 8, favFlopPenalty: 0 },
      },
      {
        key: "ueberraschung", label: "Überraschungen zahlen",
        desc: "Ab Quote 3 wächst der Aufschlag, bei Quote 8 ist er voll da.",
        werte: { underdogBoost: 1.6, underdogRampStart: 3, underdogRampEnd: 8, favFlopPenalty: 0 },
      },
      {
        key: "nurDieGrossen", label: "Nur die ganz großen",
        desc: "Der Aufschlag setzt erst spät ein, ist dann aber deutlich.",
        werte: { underdogBoost: 2, underdogRampStart: 6, underdogRampEnd: 15, favFlopPenalty: 0 },
      },
      {
        key: "beideRichtungen", label: "In beide Richtungen",
        desc: "Außenseiter zahlen mehr — und wer auf den Favoriten setzt und danebenliegt, zahlt drauf.",
        werte: { underdogBoost: 1.4, underdogRampStart: 3, underdogRampEnd: 8, favFlopPenalty: 8 },
      },
    ],
  },
  {
    aspekt: "modifikatoren",
    // Referenziert KOMBINATIONEN (jokerBibliothek.js) statt sie zu kopieren.
    eintraege: KOMBINATIONEN.map((k) => ({
      key: k.key,
      label: k.label,
      desc: k.desc,
      werte: { budget: k.budget, limitKlassen: k.limitKlassen, duell: k.duell },
    })),
  },
  {
    aspekt: "spiele",
    // Jeder Eintrag setzt alle drei Felder (spiele, tippfenster, zeitachse)
    // vollständig — ein Aspekt wandert als Ganzes (siehe Kopf dieser Datei),
    // ein halb gesetzter Eintrag würde die übrigen Felder beim Anwenden
    // stillschweigend auf den Standard zurücksetzen.
    eintraege: [
      {
        key: "eineWoche", label: "Eine Woche Vorlauf",
        desc: "Jedes Spiel öffnet eine Woche vor seinem Anpfiff.",
        werte: {
          spiele: { ...DEFAULT_RULES.spiele },
          tippfenster: { vorlaufStunden: 168, anker: "spiel" },
          zeitachse: { ...DEFAULT_RULES.zeitachse },
        },
      },
      {
        key: "kurzfristig", label: "Kurz vor knapp",
        desc: "Zwei Tage vorher — die Aufstellungen sind fast durch, die Quoten stehen.",
        werte: {
          spiele: { ...DEFAULT_RULES.spiele },
          tippfenster: { vorlaufStunden: 48, anker: "spiel" },
          zeitachse: { ...DEFAULT_RULES.zeitachse },
        },
      },
      {
        key: "spieltagAmStueck", label: "Der Spieltag am Stück",
        desc: "Alle Spiele eines Spieltags öffnen und schließen gemeinsam.",
        werte: {
          spiele: { ...DEFAULT_RULES.spiele },
          tippfenster: { vorlaufStunden: 168, anker: "spieltag" },
          zeitachse: { ...DEFAULT_RULES.zeitachse },
        },
      },
      {
        key: "festerWochentakt", label: "Fester Wochentakt",
        desc: "Ein Spieltag der Runde ist eine Kalenderwoche, unabhängig davon, wie die Ligen zählen.",
        werte: {
          spiele: { ...DEFAULT_RULES.spiele },
          tippfenster: { ...DEFAULT_RULES.tippfenster },
          zeitachse: { ...DEFAULT_RULES.zeitachse, modus: "woche" },
        },
      },
    ],
  },
  {
    aspekt: "fairness",
    // Auch hier alle drei Felder (aufholen, versaeumnis, saisonform) je
    // Eintrag vollständig setzen — aus demselben Grund wie bei „spiele".
    eintraege: [
      {
        key: "jederFuerSich", label: "Jeder für sich",
        desc: "Kein Anschluss-Bonus, kein Ersatz-Tipp, und alle Spieltage zählen gleich viel.",
        werte: {
          aufholen: { ...DEFAULT_RULES.aufholen },
          versaeumnis: { ...DEFAULT_RULES.versaeumnis },
          saisonform: { ...DEFAULT_RULES.saisonform },
        },
      },
      {
        key: "kulanz", label: "Kulanz bei Versäumnis",
        desc: "Wer einen Spieltag vergisst, bekommt einen Ersatz-Tipp statt null Punkte.",
        werte: {
          aufholen: { ...DEFAULT_RULES.aufholen },
          versaeumnis: { enabled: true, strategie: "wahrscheinlich", malusProzent: 30, maxProSaison: 3 },
          saisonform: { ...DEFAULT_RULES.saisonform },
        },
      },
      {
        key: "anschluss", label: "Anschluss halten",
        desc: "Das untere Drittel holt ein Fünftel des Rückstands auf, ab zwanzig Prozent Abstand.",
        werte: {
          aufholen: { enabled: true, staerke: 0.2, schwelle: 0.2, betrifft: "unteres-drittel" },
          versaeumnis: { ...DEFAULT_RULES.versaeumnis },
          saisonform: { ...DEFAULT_RULES.saisonform },
        },
      },
      {
        key: "zweiAusrutscher", label: "Zwei Ausrutscher erlaubt",
        desc: "Die zwei schlechtesten getippten Spieltage fallen aus der Wertung.",
        werte: {
          aufholen: { ...DEFAULT_RULES.aufholen },
          versaeumnis: { ...DEFAULT_RULES.versaeumnis },
          saisonform: { kurve: "flach", staerke: 1.5, streich: 2, nurGetippte: true },
        },
      },
      {
        key: "endspurt", label: "Der Endspurt entscheidet",
        desc: "Späte Spieltage wiegen schwerer als frühe.",
        werte: {
          aufholen: { ...DEFAULT_RULES.aufholen },
          versaeumnis: { ...DEFAULT_RULES.versaeumnis },
          saisonform: { kurve: "endspurt", staerke: 2, streich: 0, nurGetippte: true },
        },
      },
    ],
  },
  {
    aspekt: "saison",
    // Referenziert SAISON_PRESETS (saisonwetten.js) statt sie zu kopieren —
    // dieselbe Überführung wie bei „modifikatoren"/KOMBINATIONEN.
    eintraege: SAISON_PRESETS.map((p) => ({
      key: p.key, label: p.label, desc: p.desc, werte: { saison: p.saison },
    })),
  },
  {
    aspekt: "maerkte",
    // Alle drei Felder (markets, oddsMode, tippEinfluss) je Eintrag
    // vollständig setzen — aus demselben Grund wie bei „spiele"/„fairness".
    eintraege: [
      {
        key: "nurErgebnis", label: "Nur das Ergebnis",
        desc: "Kein Torschützen-Tipp — am schnellsten abgegeben.",
        werte: {
          markets: {
            result: true,
            goals: { enabled: false, modus: "proTeam", picksPerTeam: 2, picksProSpiel: 3, allowDouble: true, allowBackups: true },
          },
          oddsMode: "snapshot",
          tippEinfluss: { ...DEFAULT_RULES.tippEinfluss },
        },
      },
      {
        key: "mitSchuetzen", label: "Ergebnis und Torschützen",
        desc: "Zwei Namen je Mannschaft, dazu das Ergebnis.",
        werte: {
          markets: {
            result: true,
            goals: { enabled: true, modus: "proTeam", picksPerTeam: 2, picksProSpiel: 3, allowDouble: true, allowBackups: true },
          },
          oddsMode: "snapshot",
          tippEinfluss: { ...DEFAULT_RULES.tippEinfluss },
        },
      },
      {
        key: "schuetzenImMittelpunkt", label: "Torschützen im Mittelpunkt",
        // ⚠️ Drei, nicht vier: `RULE_LIMITS.picksPerTeam` endet bei 3. Eine
        // erste Fassung dieses Eintrags stand auf 4 und wäre beim Anwenden
        // stillschweigend auf 3 gekappt worden — ein Katalog-Eintrag, der
        // etwas anderes liefert, als er verspricht. Der Rundlauf-Test unten
        // hat es gefangen.
        desc: "Drei Namen je Mannschaft — mehr geht nicht. Hier zählt, wer die Kader kennt.",
        werte: {
          markets: {
            result: true,
            goals: { enabled: true, modus: "proTeam", picksPerTeam: 3, picksProSpiel: 3, allowDouble: true, allowBackups: true },
          },
          oddsMode: "snapshot",
          tippEinfluss: { ...DEFAULT_RULES.tippEinfluss },
        },
      },
      {
        key: "ausEinemTopf", label: "Torschützen aus einem Topf",
        desc: "Drei Namen für das ganze Spiel, ohne Zuordnung zur Mannschaft. Spielbar auch dann, wenn die Kader noch offen sind.",
        werte: {
          markets: {
            result: true,
            goals: { enabled: true, modus: "proSpiel", picksPerTeam: 2, picksProSpiel: 3, allowDouble: true, allowBackups: true },
          },
          oddsMode: "snapshot",
          tippEinfluss: { ...DEFAULT_RULES.tippEinfluss },
        },
      },
    ],
  },
  {
    aspekt: "anzeige",
    eintraege: [
      {
        key: "uebliche", label: "Übliche Anzeige",
        desc: "Spieltagspunkte im gewohnten Bereich.",
        werte: { displayScale: 15, perGameCap: null, reglerFeinheit: 0.05 },
      },
      {
        key: "kleineZahlen", label: "Kleine Zahlen",
        desc: "Punkte fast in Rohform — niedrige Zahlen, dafür feine Unterschiede.",
        werte: { displayScale: 1, perGameCap: null, reglerFeinheit: 0.05 },
      },
      {
        key: "grosseZahlen", label: "Große Zahlen",
        desc: "Dreistellige Spieltagspunkte. Reine Optik, an der Wertung ändert das nichts.",
        werte: { displayScale: 50, perGameCap: null, reglerFeinheit: 0.05 },
      },
      {
        key: "feineRegler", label: "Feine Regler",
        desc: "Die Regler greifen in Schritten von 0,01 statt 0,05. Kein Wert ändert sich, nur die Auswahl im Editor.",
        werte: { displayScale: 15, perGameCap: null, reglerFeinheit: 0.01 },
      },
    ],
  },
];
