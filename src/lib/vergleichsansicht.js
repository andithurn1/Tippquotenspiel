// ============================================================
//  „WAS WÄRE OHNE …" — dieselbe Runde, eine Ebene weniger
//
//  🔴 Andi, 27.08.2026: „auch mit dem bereits genannten Anzeigemodus was wäre,
//  wenn alle Tipps bspw. auch komplett ohne joker oder ereignisse, oder ohne
//  grund-andersbewertung verschiedener Wettbewerbe".
//
//  ── Was es schon gab, und warum es nicht dasselbe ist ──
//  `Historie.jsx` kann seit Längerem „was wäre gewesen" — aber nur, indem es
//  ein GANZ ANDERES Regelwerk unterlegt (ein Preset). Das beantwortet die
//  Frage „wie liefe es unter Hardcore-Regeln", nicht Andis Frage.
//
//  Seine ist eine ANDERE: nimm GENAU DIESES Regelwerk und schalte EINE Ebene
//  ab. Der Unterschied ist der zwischen „ein anderes Spiel" und „unser Spiel,
//  aber ohne die Joker". Nur die zweite beantwortet, was die Runde wirklich
//  wissen will: **wie viel von meinem Vorsprung kommt aus dem Tippen — und
//  wie viel aus dem Drumherum?**
//
//  ── 🔴 Warum das keine zweite Wertung ist ──
//  Es wird NICHTS nachgerechnet. Diese Datei liefert nur ein verändertes
//  Regelwerk; gewertet wird danach mit derselben `scoreLeaderboard` wie
//  immer. Eine eigene „Vergleichs-Wertung" wäre die zweite Wahrheit, an der
//  dieses Projekt schon 17 Fehler an einem Tag hatte.
//
//  ⚠️ Und es ändert nichts an der Runde. Der echte Stand bleibt der echte
//  Stand — das hier ist eine ANSICHT.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { sanitizeRules, DEFAULT_RULES } from "./engine";

// ── Die abschaltbaren Ebenen ────────────────────────────────
//
// ⚠️ Jede Ebene nennt ALLE Regel-Blöcke, die zu ihr gehören — und das ist der
// Punkt, an dem so eine Ansicht sonst lügt: „ohne Joker" muss auch die
// Fremdjoker und die Duelle abschalten, sonst steht in der Tabelle weiter ein
// Abzug, den ein Joker verursacht hat, und die Zeile heißt trotzdem „ohne
// Joker".
//
// 🔴 Die Zuordnung ist deshalb bewusst GROSSZÜGIG: im Zweifel gehört ein Block
// zur Ebene. Eine Ansicht, die zu viel abschaltet, ist erklärbar; eine, die zu
// wenig abschaltet, ist falsch.
export const EBENEN = [
  {
    key: "joker",
    label: "ohne Joker",
    text: "Alle Joker-Familien aus: der eigene Joker, die Duelle, die Fremdjoker und das Budget.",
    bloecke: ["joker", "duell", "eingriffe", "budget", "limitKlassen"],
  },
  {
    key: "ereignisse",
    label: "ohne Ereignisse",
    text: "Erspielte Belohnungen, Auszeichnungen und das Glücksrad zählen nicht mit.",
    bloecke: ["ereignisse", "drehrad"],
  },
  {
    key: "wettbewerbe",
    label: "ohne Wettbewerbs-Gewichte",
    text: "Ein Champions-League-Abend zählt wieder so viel wie ein Ligaspiel.",
    bloecke: ["wettbewerbe"],
  },
  {
    key: "modifikatoren",
    label: "ohne Modifikatoren",
    text: "Derby, Topspiel, Vereins-Faktoren und der Tabellen-Bonus fallen weg.",
    bloecke: ["teamMods", "bigGame", "tabellenBonus"],
  },
  {
    key: "verlauf",
    label: "ohne Verlaufs-Regeln",
    text: "Aufhol-Hilfe, Saisonform und die Versäumnis-Regel greifen nicht.",
    bloecke: ["aufholen", "saisonform", "versaeumnis"],
  },
];
const EBENEN_KEYS = new Set(EBENEN.map((e) => e.key));

// ── Einen Block abschalten ──────────────────────────────────
// ⚠️ Über `enabled: false` und NICHT durch Löschen des Blocks: `sanitizeRules`
// setzt einen fehlenden Block auf die Vorgabe zurück — ein gelöschter Joker
// wäre danach wieder der Vorgabe-Joker. Genau die Sorte Rückschlag, die man
// erst in der Tabelle sieht.
//
// ⚠️ Nicht jeder Block hat ein `enabled` (`teamMods` etwa ist eine Karte).
// Dann gilt die VORGABE als „aus" — sie ist per Definition der neutrale Stand.
function ausschalten(rules, block) {
  const wert = rules?.[block];
  if (wert && typeof wert === "object" && "enabled" in wert) {
    return { ...wert, enabled: false };
  }
  return DEFAULT_RULES[block];
}

// Das Regelwerk mit den genannten Ebenen abgeschaltet.
// `keys` = Liste von Ebenen-Schlüsseln. Unbekannte werden still übergangen —
// eine Ansicht darf an einem Tippfehler nicht die ganze Tabelle verlieren.
export function ohneEbenen(rules, keys = []) {
  const basis = sanitizeRules(rules ?? DEFAULT_RULES);
  const gewaehlt = (Array.isArray(keys) ? keys : []).filter((k) => EBENEN_KEYS.has(k));
  if (!gewaehlt.length) return basis;

  const out = { ...basis };
  for (const key of gewaehlt) {
    for (const block of EBENEN.find((e) => e.key === key).bloecke) {
      out[block] = ausschalten(basis, block);
    }
  }
  // 🔴 Wieder durch `sanitizeRules`: die Bereinigung hält Abhängigkeiten
  // gerade (ein Kontingent ohne Joker etwa). Ohne sie entstünde ein
  // Regelwerk, das es über die Oberfläche gar nicht geben könnte — und die
  // Vergleichszahl käme aus einem Zustand, den niemand vermessen hat.
  return sanitizeRules(out);
}

// ── Ein Satz über die gewählte Ansicht ──────────────────────
export function beschreibeAnsicht(keys = []) {
  const gewaehlt = (Array.isArray(keys) ? keys : []).filter((k) => EBENEN_KEYS.has(k));
  if (!gewaehlt.length) return "Der echte Stand — alles zählt mit.";
  const namen = gewaehlt.map((k) => EBENEN.find((e) => e.key === k).label.replace(/^ohne /, ""));
  return `Ohne ${namen.join(", ")} — nur zum Ansehen, gewertet bleibt der echte Stand.`;
}

// ── Was der Vergleich ZEIGT ─────────────────────────────────
// Zwei Tabellen nebeneinander sind schwer zu lesen. Diese Funktion macht
// daraus die eine Zahl, die interessiert: wie viele Plätze hat sich jemand
// durch das Drumherum bewegt — und wie viele Punkte.
//
// ⚠️ Der Rang wird aus der REIHENFOLGE der übergebenen Listen genommen, nicht
// neu sortiert. `scoreLeaderboard` liefert sie bereits geordnet, und ein
// zweites Sortieren hier könnte bei Gleichstand anders auflösen als dort —
// dann stünde in der Vergleichsspalte ein Rang, den die echte Tabelle nie
// vergibt.
export function unterschiedeZumStand(echt = [], ohne = []) {
  const rangEcht = new Map(echt.map((z, i) => [z.userId, i + 1]));
  const punkteEcht = new Map(echt.map((z) => [z.userId, Number(z.total) || 0]));
  return ohne.map((z, i) => {
    const rEcht = rangEcht.get(z.userId) ?? null;
    return {
      userId: z.userId,
      name: z.name ?? null,
      rangOhne: i + 1,
      rangEcht: rEcht,
      // Positiv = im echten Stand BESSER platziert, also hat das Drumherum
      // geholfen. `null`, wenn jemand in einer der beiden Listen fehlt.
      plaetze: rEcht === null ? null : rEcht - (i + 1),
      punkteOhne: Number(z.total) || 0,
      punkteEcht: punkteEcht.get(z.userId) ?? null,
    };
  });
}
