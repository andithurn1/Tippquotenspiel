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
    // Noch zu kuratieren (design/teilbibliotheken.md Abschnitt 7, Schritt 3).
    eintraege: [],
  },
  {
    aspekt: "kombi",
    // Noch zu kuratieren.
    eintraege: [],
  },
  {
    aspekt: "underdog",
    // Noch zu kuratieren.
    eintraege: [],
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
    // Noch zu kuratieren.
    eintraege: [],
  },
  {
    aspekt: "fairness",
    // Noch zu kuratieren.
    eintraege: [],
  },
  {
    aspekt: "saison",
    // Noch zu kuratieren.
    eintraege: [],
  },
  {
    aspekt: "maerkte",
    // Noch zu kuratieren.
    eintraege: [],
  },
  {
    aspekt: "anzeige",
    // Noch zu kuratieren.
    eintraege: [],
  },
];
