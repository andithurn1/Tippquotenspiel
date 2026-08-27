// ============================================================
//  WAS IN DIESER RUNDE GAR NICHT GREIFT
//
//  🔴 Vorschlag Nr. 4 aus `design/baukasten-ideen.md`, von Andi am 27.08.2026
//  freigegeben. Der Anlass ist kein Komfortwunsch, sondern eine Fehlerklasse,
//  die dieses Projekt schon zweimal getroffen hat:
//
//    Andi, 24.08.2026, im Browser gemessen: „+Premier League" ändert die
//    Spielzahl nicht (174 bleibt 174). Logisch richtig — es steht kein
//    Premier-League-Verein in der Vereinsliste. **Nur sagt die Oberfläche es
//    nicht.** Wer eine Liga dazunimmt und nichts passieren sieht, hält es für
//    kaputt.
//
//  Dasselbe passiert eine Ebene höher beim REGELWERK, und beim Laden eines
//  fremden Creator-Codes passiert es fast zwangsläufig: der Code bringt
//  Wettbewerbs-Gewichte für Ligen mit, die diese Runde nicht spielt; einen
//  Torschützen-Filter, obwohl hier gar keine Torschützen getippt werden;
//  Fremdjoker für eine Runde mit zwei Leuten.
//
//  ── 🔴 Der Unterschied zu `reglerWarnung.js`, und er ist der ganze Punkt ──
//  `reglerWarnung` prüft ein Regelwerk **gegen sich selbst**: unstimmige
//  Kombinationen, Werte außerhalb der Empfehlungsbänder. Sie braucht keine
//  Runde und läuft schon beim Anlegen.
//
//  Diese Datei prüft dasselbe Regelwerk **gegen eine konkrete Runde** — deren
//  Spiele, deren Wettbewerbe, deren Mitspieler. Dieselbe Einstellung kann in
//  Runde A tragen und in Runde B vollkommen wirkungslos sein; das ist keine
//  Eigenschaft der Einstellung, sondern der Paarung.
//
//  ── ⚠️ GEMESSEN, nicht nachgebaut ──
//  Jede Prüfung fragt die ECHTE Mechanik über die ECHTEN Spiele der Runde:
//  greift `wettbewerbAufschlag` an irgendeinem Spiel? sperrt `schuetzenSperre`
//  irgendwo irgendwen? Keine einzige Regel wird hier nachgebaut.
//
//  Das ist nicht nur sauberer, es ist der einzige Weg, der nicht ausläuft:
//  eine nachgebaute Bedingung stimmt am Tag des Baus und driftet danach still
//  — genau die zweite Wahrheit, aus der die 17 Funde vom 05.08.2026 kamen.
//
//  ⚠️ **Ein Befund heißt „wirkungslos", nicht „falsch".** Es kann gute Gründe
//  geben, eine Einstellung mitzuschleppen: die Runde wächst noch, oder der
//  Code soll unverändert weitergegeben werden. Deshalb ein BERICHT und keine
//  Korrektur — und deshalb sagt jeder Befund, was ihn beheben WÜRDE.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { wettbewerbAufschlag } from "./wettbewerbGewicht";
import { schuetzenSperre, sanitizeSperre } from "./favoritenSperre";
import { bigGameAufschlag, sanitizeBigGame } from "./bigGame";
import { sanitizeTabellenBonus } from "./tabellenBonus";
import { sanitizeDuellJoker } from "./duellJoker";
import { familieAn } from "./fremdjoker";
import { sanitizeSaison } from "./saisonwetten";
import { nochOhneWirkung } from "./rechte";

const zahl = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

// Der Spieltags-Bereich, den die Runde wirklich hat — aus ihren Spielen, nicht
// aus dem Regelwerk. ⚠️ Das ist der LIGA-Spieltag: `tabellenBonus.abSpieltag`
// vergleicht sich ebenfalls damit (`greift()` bekommt `spieltag` aus dem
// Match), und ein Vergleich über zwei Skalen wäre wieder der Zeitachsen-Fehler.
function spieltagsSpanne(matches) {
  const tage = matches.map((m) => zahl(m?.matchday)).filter((n) => n !== null);
  if (!tage.length) return null;
  return { von: Math.min(...tage), bis: Math.max(...tage) };
}

// ── Die Prüfungen ───────────────────────────────────────────
// Jede gibt `null` (alles gut) oder einen Befund. Reihenfolge = Reihenfolge
// im Bericht: erst was der Spieler MERKT, dann was nur der Admin sieht.
const PRUEFUNGEN = [
  // 1) Favoriten-Regel ohne Torschützen-Markt. Strukturell sicher, kein
  //    Messfall nötig: die Regel betrifft ausschließlich Torschützen
  //    (Andi, 26.08.2026 — Endstände sind ausdrücklich ausgenommen).
  {
    key: "sperre-ohne-schuetzen",
    pruef({ rules }) {
      const cfg = sanitizeSperre(rules?.sperre);
      if (!cfg.enabled) return null;
      if (rules?.markets?.goals?.enabled !== false) return null;
      return {
        titel: "Favoriten-Regel läuft ins Leere",
        text: "Sie betrifft nur Torschützen — und in dieser Runde werden gar keine getippt.",
        beheben: "Entweder den Torschützen-Markt einschalten oder die Favoriten-Regel aus.",
      };
    },
  },

  // 2) Favoriten-Regel, die an KEINEM Spiel der Runde etwas trifft.
  //    Gemessen, nicht geraten: über alle Spiele gefragt, ob irgendwo etwas
  //    gesperrt oder abgewertet wird.
  {
    key: "sperre-trifft-nichts",
    pruef({ rules, matches }) {
      const cfg = sanitizeSperre(rules?.sperre);
      if (!cfg.enabled || rules?.markets?.goals?.enabled === false) return null;
      if (!matches.length) return null;
      const trifft = matches.some((m) =>
        m?.snapshot && schuetzenSperre(m.snapshot, rules).some((o) => o.gesperrt || o.malus));
      if (trifft) return null;
      return {
        titel: "Favoriten-Regel trifft an keinem Spiel",
        text: cfg.modus === "quote"
          ? `Kein Torschütze dieser Runde liegt unter Quote ${String(cfg.mindestQuote).replace(".", ",")}.`
          : "An keinem Spiel bleibt nach der Mindestauswahl genug Spielraum.",
        beheben: cfg.modus === "quote"
          ? "Die Schwelle höher setzen — oder auf „die wahrscheinlichsten“ umstellen."
          : "„Mindestens wählbar“ kleiner setzen.",
      };
    },
  },

  // 3) Wettbewerbs-Gewichte für Ligen, die hier gar nicht gespielt werden.
  //    ⚠️ Über `wettbewerbAufschlag` gemessen und nicht über einen Vergleich
  //    der Schlüssel: der Aufschlag setzt sich aus Wettbewerb UND K.-o.-Runde
  //    zusammen, ein Schlüssel-Vergleich übersähe die Phasen-Stufe.
  {
    key: "wettbewerbe-ohne-wirkung",
    pruef({ rules, matches }) {
      if (!rules?.wettbewerbe?.enabled) return null;
      if (!matches.length) return null;
      if (matches.some((m) => wettbewerbAufschlag(m, rules) !== 0)) return null;
      return {
        titel: "Wettbewerbs-Gewichte greifen nirgends",
        text: "Kein Spiel dieser Runde gehört zu einem der aufgewerteten Wettbewerbe — "
          + "und K.-o.-Runden gibt es hier auch keine.",
        beheben: "Den Aufschlag auf einen Wettbewerb legen, den diese Runde wirklich spielt.",
      };
    },
  },

  // 4) Das große Spiel, dessen Schwelle kein Spiel der Runde erreicht.
  {
    key: "biggame-zu-hoch",
    pruef({ rules, matches }) {
      const cfg = sanitizeBigGame(rules?.bigGame);
      if (!cfg.enabled || !matches.length) return null;
      const mitWert = matches.filter((m) => Number.isFinite(m?.snapshot?.bigGameWert));
      if (!mitWert.length) return null;
      if (mitWert.some((m) => bigGameAufschlag(m.snapshot, rules) !== 0)) return null;
      return {
        titel: "Das große Spiel gibt es hier nie",
        text: `Kein Spiel dieser Runde erreicht die eingestellte Spannung von ${cfg.minSpannung}.`,
        beheben: "Die Schwelle senken — sonst bleibt der Aufschlag die ganze Saison stumm.",
      };
    },
  },

  // 5) Tabellen-Bonus, der erst nach dem letzten Spieltag der Runde anspringt.
  {
    key: "tabellenbonus-zu-spaet",
    pruef({ rules, matches }) {
      const cfg = sanitizeTabellenBonus(rules?.tabellenBonus);
      if (!cfg.enabled) return null;
      const spanne = spieltagsSpanne(matches);
      if (!spanne || cfg.abSpieltag <= spanne.bis) return null;
      return {
        titel: "Tabellen-Bonus springt nie an",
        text: `Er gilt ab Spieltag ${cfg.abSpieltag}, aber diese Runde endet mit Spieltag ${spanne.bis}.`,
        beheben: `„Ab Spieltag“ auf höchstens ${spanne.bis} setzen.`,
      };
    },
  },

  // 6) Duell-Joker ohne Gegner. Strukturell: ein Duell braucht ein ZIEL, und
  //    das eigene Ich ist keins.
  {
    key: "duell-ohne-gegner",
    pruef({ rules, mitglieder }) {
      if (!sanitizeDuellJoker(rules?.duell).enabled) return null;
      if (mitglieder === null || mitglieder >= 2) return null;
      return {
        titel: "Duell-Joker ohne Gegner",
        text: `Ihr seid ${mitglieder} — ein Duell braucht jemanden, auf den es geht.`,
        beheben: "Mitspieler einladen, oder den Duell-Joker vorerst aus.",
      };
    },
  },

  // 7) Dieselbe Frage für die ganze Fremdjoker-Familie.
  {
    key: "fremdjoker-ohne-gegner",
    pruef({ rules, mitglieder }) {
      if (!familieAn(rules)) return null;
      if (mitglieder === null || mitglieder >= 2) return null;
      return {
        titel: "Fremdjoker ohne Mitspieler",
        text: `Ihr seid ${mitglieder} — in fremde Tipps eingreifen geht erst zu zweit.`,
        beheben: "Mitspieler einladen, oder die Fremdjoker vorerst aus.",
      };
    },
  },

  // 8) Ein Recht, dessen Weg von der Wahl bis in die Wertung noch nicht steht.
  //    🔴 Die ehrlichste Prüfung dieses Berichts: der Admin kann mehr
  //    einstellen, als heute ankommt. Er soll das SEHEN, statt es daran zu
  //    merken, dass nichts passiert.
  {
    key: "recht-ohne-weg",
    pruef({ rules }) {
      const offen = nochOhneWirkung(rules);
      if (!offen.length) return null;
      return {
        titel: offen.length === 1 ? "Ein Recht wirkt noch nicht" : `${offen.length} Rechte wirken noch nicht`,
        text: `Eingestellt, aber der Weg von der Wahl bis in die Wertung fehlt noch: ${offen.join(", ")}.`,
        beheben: "Solange eine Art nehmen, deren Weg steht — heute greifen alle.",
      };
    },
  },

  // 9) Saison-Wetten eingeschaltet, aber keine einzige ausgewählt.
  //    ⚠️ `sanitizeSaison` lässt `enabled` mit leerer Liste durch — die
  //    Einstellung ist also gültig und trotzdem folgenlos.
  {
    key: "saison-ohne-wetten",
    pruef({ rules }) {
      const cfg = sanitizeSaison(rules?.saison);
      if (!cfg.enabled || cfg.wetten.length) return null;
      return {
        titel: "Saison-Wetten ohne Wetten",
        text: "Die Ebene ist an, aber es ist keine einzige Wette ausgewählt.",
        beheben: "Mindestens eine Wette wählen — oder die Saison-Wetten aus.",
      };
    },
  },
];

// ── Der Bericht ─────────────────────────────────────────────
//
// `lage`:
//   matches     — die Spiele DIESER Runde (`listRoundMatches`), nicht der
//                 Katalog. Über den Katalog gerechnet fände man Wirkungen,
//                 die es in der Runde nicht gibt.
//   mitglieder  — Anzahl, oder `null` wenn unbekannt (beim ANLEGEN).
//
// ⚠️ `null` bei `mitglieder` schaltet die personenbezogenen Prüfungen ab,
// statt sie mit 0 zu rechnen. Sonst meldete die Spielerstellung „ihr seid 0"
// über eine Runde, die es noch gar nicht gibt.
export function greiftNicht(rules, { matches = [], mitglieder = null } = {}) {
  const lage = {
    rules,
    matches: Array.isArray(matches) ? matches : [],
    // ⚠️ `Number(null)` ist 0 und damit `Number.isFinite` — die erste Fassung
    // machte aus „unbekannt" deshalb „null Mitglieder" und meldete prompt
    // „ihr seid 0" über eine Runde, die es noch gar nicht gibt. Zwei Tests
    // haben es sofort gefunden; ohne sie hätte es die Spielerstellung
    // getroffen, wo `mitglieder` IMMER unbekannt ist.
    mitglieder: (mitglieder === null || mitglieder === undefined || mitglieder === "")
      ? null
      : (Number.isFinite(Number(mitglieder)) ? Number(mitglieder) : null),
  };
  const out = [];
  for (const p of PRUEFUNGEN) {
    const fund = p.pruef(lage);
    if (fund) out.push({ key: p.key, ...fund });
  }
  return out;
}

// Ein Satz für die Oberfläche — die Zahl vorn, weil sie die Frage beantwortet,
// die man beim Aufklappen stellt.
export function beschreibeGreiftNicht(funde = []) {
  if (!funde.length) return "Alles, was eingestellt ist, greift in dieser Runde auch.";
  const n = funde.length;
  return `${n} Einstellung${n === 1 ? "" : "en"} ${n === 1 ? "greift" : "greifen"} in dieser Runde nicht.`;
}
