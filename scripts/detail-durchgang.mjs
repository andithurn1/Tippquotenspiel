// ============================================================
//  DETAIL-DURCHGANG — hält jede Einstell-Oberfläche Andis Regel ein?
//
//  Aufruf:  npm run detail
//
//  🔴 Andis Regel vom 24.08.2026, ausdrücklich als DAUERREGEL gesetzt:
//
//    „erstmal die gängigsten sachen einstellbar und mit einem Detailfenster
//     sogar noch Feinheiten bzw. maximales Detail einstellbar, was du so
//     bitte auch wirklich auf alle anderen Einstellbarkeiten anwendest"
//
//  ⚠️ **Warum eine Messung und nicht nur die Regel:** am 24.08.2026
//  nachgesehen war sie an mehreren Stellen befolgt — und **jede Stelle hatte
//  ihre eigene Fassung gebaut**. Anderer Pfeil, andere Farbe, andere
//  Schriftgröße, mal mit Zusammenfassung, mal ohne, mal mit `aria-expanded`,
//  mal ohne. Genau der Verlauf, den die Eckenradien schon genommen haben
//  (`rund.test.js`): niemand macht etwas falsch, jede Stelle ist für sich
//  plausibel, und am Ende sind es acht Varianten.
//
//  Diese Messung fragt zwei Dinge je Einstell-Oberfläche:
//
//    1. Gibt es überhaupt einen Weg ins Detail?
//    2. Läuft er über das GEMEINSAME Bauteil (`Feinheiten`) — oder über eine
//       selbstgebaute Aufklapp-Mechanik?
//
//  ⚠️ „Kein Detail" ist ein BEFUND, kein Fehler — dieselbe Haltung wie bei
//  `greift` und `tot`. Eine Oberfläche mit genau EINER Einstellung braucht
//  keine zweite Ebene. Deshalb dieselbe Regel wie bei `stufen`: entweder ein
//  Detailweg, oder ein Begründungssatz in `OHNE_DETAIL`.
//
//  ⚠️ Textsuche, keine Typanalyse — wie bei `tot`. Ein Verdacht, den man in
//  zehn Sekunden prüft, ist mehr wert als eine perfekte Analyse, die niemand
//  startet.
// ============================================================
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Welche Oberfläche darf ohne zweite Ebene dastehen — mit Satz, warum.
const OHNE_DETAIL = {
  "Feinheiten.jsx":
    "IST das Bauteil. Eine Feinheit in einer Feinheit wäre eine dritte Ebene.",
  "VariantenWahl.jsx":
    "Eine einzige Frage mit wenigen Antworten — dahinter liegt nichts Feineres.",
  "PresetRating.jsx":
    "Zeigt eine Bewertung an, stellt nichts ein.",
  "BalanceAmpel.jsx":
    "Anzeige, keine Einstellung. Und Balance wird ohnehin nicht angefasst (CLAUDE.md).",
  "RegelVorschau.jsx":
    "Vorschau auf ein Regelwerk, kein Regler darin.",
  "ProfiWarnungen.jsx":
    "Liste von Hinweisen zu ANDEREN Einstellungen — die Tiefe liegt dort.",
  "Schichtung.jsx":
    "Zeigt die Reihe der aufgesetzten Codes. Verstellt wird an den Codes selbst.",
  "Bausteine.jsx":
    "Auswahlliste aus der Bibliothek; die Tiefe steckt im gewählten Baustein.",
  "PresetMischen.jsx":
    "Mischt zwei fertige Regelwerke — der Vorgang hat genau einen Regler.",
  "Alleinstellung.jsx":
    "Ein einziger Schalter mit Erklärtext.",
  "TeilCodeFeld.jsx":
    "Ein Textfeld und ein Knopf. Dahinter liegt kein feineres Verhalten.",
  "Begriff.jsx":
    "Glossar-Blase im Fließtext, keine Einstellung.",
  "WettbewerbGewichte.jsx":
    "Eine Zahl je Wettbewerb — die Liste IST schon die feinste Ebene.",
  "EinfacheRegler.jsx":
    "IST die gängige Ebene. Vier Fragen statt zwanzig Regler; das Detail dazu "
    + "ist die ganze übrige Spielerstellung. Eine Klappe darin wäre eine "
    + "dritte Ebene in der Ebene, die es einfach machen soll.",
  "SpielauswahlWettbewerbe.jsx":
    "Die zweite Ebene sitzt in `KoRunden`, das dieser Screen einhängt — dort "
    + "liegt die Vereins-Bedingung hinter einer `Feinheiten`-Klappe. Eigene "
    + "Regler hat er keine: Chips, Zahlen und der Engpass-Satz.",
  "SpielauswahlListe.jsx":
    "Eine Liste einzelner Begegnungen zum An- und Abwählen. Dahinter liegt "
    + "nichts Feineres — ein Spiel ist dabei oder nicht.",
};

// Was eine Datei zu einer REGEL-OBERFLÄCHE macht — und zwar an der
// SIGNATUR abgelesen, nicht am Rumpf.
//
// ⚠️ **Zwei Fehlversuche davor, beide lehrreich:**
//   1. `onChange(` im Rumpf → 34 Treffer, darunter `Tippabgabe`, `Spielwahl`
//      und `Tutorial`. Jedes Eingabefeld der App hat ein `onChange`.
//   2. `patch(`/`setRules(` im Rumpf → die ECHTEN Regel-Oberflächen fielen
//      heraus (`Fremdjoker`, `Ereignisse`, `LigaSonderregeln`), weil sie ihre
//      Änderung nicht selbst patchen, sondern nach oben reichen.
//
// Das tragfähige Kennzeichen ist die Bauform, die alle Regel-Bausteine
// dieses Projekts teilen: sie bekommen einen Ausschnitt des Regelwerks UND
// einen Rückkanal.
//
//     export default function X({ rules, onChange })
//     export default function X({ spiele, onChange })
//
// Wer das ändert, ändert diese Zeile mit — und merkt es, weil die Messung
// dann plötzlich niemanden mehr findet.
const SIGNATUR = /export default function \s*\w+\s*\(\s*\{([^}]*)\}/;
const REGEL_PROP = /\b(rules|regeln|spiele|cfg|karte)\b/;
const RUECKKANAL = /\b(onChange|onPatch|onRules|patch)\b/;

function istRegelOberflaeche(quelle) {
  const t = SIGNATUR.exec(quelle);
  if (!t) return false;
  const props = t[1];
  return REGEL_PROP.test(props) && RUECKKANAL.test(props);
}

// 🔴 **ZWEI gemeinsame Bauteile, nicht eines** — nachgetragen am 25.08.2026,
// nachdem die Liste 15 Oberflächen als „ohne zweite Ebene" meldete, die
// nachweislich eine hatten.
//
// `GrosseZeile` (in `Eingaben.jsx`) IST Andis Regel, nur auf einer gröberen
// Ebene: Titel, Untertitel und der AKTUELLE WERT stehen offen da, die Regler
// liegen hinter dem Klick. Genau „gängigstes oben, Feinheiten dahinter" —
// eine ganze Karte statt einer einzelnen Einstellung.
//
//     <GrosseZeile titel="…" unter="…" wert="an · 3 Arten">  ← Abschnitt
//       <Feinheiten titel="…" zusammenfassung="…">            ← darin
//
// ⚠️ Beide werden getrennt gezählt und nicht in einen Topf geworfen: eine
// Datei, die NUR `GrosseZeile` benutzt, hat ihre Abschnitte gefaltet, aber
// innerhalb eines Abschnitts womöglich zwanzig Regler nebeneinander. Das ist
// besser als nichts und schlechter als beides.
//
// ⚠️ Eine Messung, die das Problem größer macht, als es ist, ist genauso
// falsch wie eine, die es kleiner macht. Sie kostet Vertrauen, und beim
// nächsten Mal glaubt ihr niemand mehr.
const NUTZT_FEINHEITEN = /from "@\/components\/Feinheiten"/;
const NUTZT_GROSSEZEILE = /\bGrosseZeile\b/;

// Ein selbstgebauter Aufklapp-Weg: ein Zustand, der eine Fläche auf- und
// zuklappt. Absichtlich großzügig — lieber ein Verdacht zu viel als eine
// Drift-Stelle übersehen.
const EIGENBAU = /\b(setDetailOffen|setOffen|setAufgeklappt|setDetail|setMehr|setExpanded)\b/;

const dateien = readdirSync("src/components")
  .filter((n) => n.endsWith(".jsx"))
  .sort();

const mitBeidem = [];
const nurZeile = [];
const eigenbau = [];
const ohne = [];
const begruendet = [];
const keineEinstellung = [];

for (const name of dateien) {
  const quelle = readFileSync(join("src/components", name), "utf8");
  if (OHNE_DETAIL[name]) { begruendet.push(name); continue; }
  if (!istRegelOberflaeche(quelle)) { keineEinstellung.push(name); continue; }

  if (NUTZT_FEINHEITEN.test(quelle)) mitBeidem.push(name);
  else if (NUTZT_GROSSEZEILE.test(quelle)) nurZeile.push(name);
  else if (EIGENBAU.test(quelle)) eigenbau.push(name);
  else ohne.push(name);
}

const linie = "=".repeat(88);
const strich = "-".repeat(88);
console.log(`\n${linie}`);
console.log("  DETAIL-DURCHGANG — gängigstes oben, Feinheiten hinter einem Klick");
console.log(`  ${dateien.length} Dateien · ${keineEinstellung.length} sind keine Regel-Oberfläche · ${begruendet.length} ausdrücklich begründet`);
console.log(linie);

console.log(`\n  ✅ MIT \`Feinheiten\` — die feine Ebene innerhalb einer Karte  (${mitBeidem.length})`);
for (const n of mitBeidem) console.log(`     ${n}`);

console.log(`\n  ◐ NUR \`GrosseZeile\` — Abschnitte gefaltet, darin flach  (${nurZeile.length})`);
for (const n of nurZeile) console.log(`     ${n}`);

console.log(`\n  ⚠️ EIGENE AUFKLAPP-MECHANIK — funktioniert, driftet aber  (${eigenbau.length})`);
for (const n of eigenbau) console.log(`     ${n}`);

console.log(`\n  🔴 KEIN WEG INS DETAIL  (${ohne.length})`);
for (const n of ohne) console.log(`     ${n}`);

console.log(`\n${strich}`);
if (ohne.length === 0) {
  console.log("  ✅ Jede Einstell-Oberfläche hat eine zweite Ebene oder einen Grund.");
} else {
  console.log(`  Ergebnis: ${ohne.length} ohne jede zweite Ebene · ${nurZeile.length} nur grob gefaltet · ${eigenbau.length} mit eigener Mechanik`);
  console.log("\n  🔴 Für jeden Eintrag der letzten Gruppe gilt: eine Feinheit ergänzen,");
  console.log("     oder mit einem Begründungssatz in `OHNE_DETAIL` eintragen.");
  console.log("  ⚠️ Die mittlere Gruppe ist KEIN Fehler — sie ist die Drift-Liste.");
  console.log("     Sie soll schrumpfen, nicht sofort leer sein.");
}
console.log("");

// ── Die Schlusszeile für den Sammel-Lauf ────────────────────
// ⚠️ Der Import steht hier unten und nicht oben: ESM hebt ihn ohnehin, und
// ein Einfügen weiter oben zerreißt mehrzeilige Import-Blöcke.
import { melde } from "./abnahme.mjs";
melde("detail", ohne.length);
