// ============================================================
//  EBENEN-DOKUMENT — welcher Parameter gehört in welche Ansicht?
//
//  Aufruf:  npx vite-node scripts/ebenen-dokument.mjs
//  Ergebnis: design/entwuerfe/Ebenen-Parameter.docx
//
//  🔴 Andi am 21.08.2026: „arbeite in nem separatem word mal sehr umfangreich
//  aus, welche parameter bei den jeweiligen ebenen überhaupt geändert werden
//  sollen, bzw welche bei der einfachen variante weggelassen werden, bei profi
//  soll ja egtl jede denkbare Kombination und Art wie bzw für wann dies
//  bestimmt wird, anpassbar sein."
//
//  ⚠️ ERZEUGT, nicht getippt. Der Bestand kommt aus `DEFAULT_RULES`,
//  `CHARAKTERE` und `REGLER` — 38 Blöcke, 180 Blattfelder. Von Hand geschrieben
//  wäre er am Tag der Fertigstellung veraltet und an drei Stellen falsch.
//  Wer Regeln ändert, lässt das Skript neu laufen.
//
//  ⚠️ Was das Skript NICHT kann: entscheiden. Es trägt zusammen, was IST, und
//  markiert mit ❓, wo eine Entscheidung fehlt. Erfundene Vorschläge in einem
//  Dokument, das nach Bestandsaufnahme aussieht, wären genau der Wildwuchs,
//  gegen den `design/vokabular.md` angelegt wurde.
// ============================================================
import { mkdirSync } from "node:fs";
import { DEFAULT_RULES, sanitizeRules } from "../src/lib/engine";
import { CHARAKTERE } from "../src/lib/charaktere";
import { REGLER } from "../src/lib/einfachRegler";
import { NUR_PROFI } from "../src/lib/stufenAbdeckung";
import { schreibeDocx, h1, h2, h3, p, punkt, tabelle } from "./schreib-docx.mjs";

const basis = sanitizeRules(DEFAULT_RULES);
const BLOECKE = Object.keys(basis).filter((k) => k !== "name");

// ── Blattfelder eines Teilbaums ─────────────────────────────
function blaetter(obj, pfad = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj ?? {})) {
    const pf = pfad ? `${pfad}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...blaetter(v, pf));
    else out.push([pf, v]);
  }
  return out;
}

const wert = (v) => {
  if (Array.isArray(v)) return v.length ? `[${v.join(", ")}]` : "leer";
  if (typeof v === "boolean") return v ? "an" : "aus";
  return String(v);
};

// Wert an einem Pfad holen, ohne bei fehlendem Zwischenstück zu stolpern.
const hole = (obj, pfad) => pfad.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

// ── Wer setzt dieses Blatt in der EINFACHEN Ansicht? ────────
// Zwei Quellen, seit dem 20.08.2026 beide in „Einfach“:
//   Voreinstellungen (CHARAKTERE) und die Klartext-Regler (REGLER).
// Gezählt wird nur, was von der Vorgabe ABWEICHT — eine Voreinstellung, die
// überall die Vorgabe stehen lässt, hat zu dem Feld nichts gesagt.
function einfachQuellen(pfad) {
  const vorgabe = JSON.stringify(hole(basis, pfad));
  const namen = [];
  for (const c of CHARAKTERE) {
    const v = hole(c.rules ?? {}, pfad);
    if (v !== undefined && JSON.stringify(v) !== vorgabe) namen.push(c.label);
  }
  for (const r of REGLER) {
    const trifft = r.stufen.some((s) => {
      const v = hole(s.werte ?? {}, pfad);
      return v !== undefined && JSON.stringify(v) !== vorgabe;
    });
    if (trifft) namen.push(`Regler „${r.label}“`);
  }
  return namen;
}

// ── Achsen: WIE und WANN wird ein Wert bestimmt? ────────────
// 🔴 Andis eigentliche Frage. Heute gilt für fast alles: der Admin stellt es
// beim Anlegen EINMAL fest, und dann steht es. Die Ausnahmen sind zählbar, und
// genau sie sind das Muster für alles Weitere — deshalb stehen sie hier
// namentlich statt als Behauptung „das meiste ist fest“.
const ZEIT_WOERTER = [
  "zeitraum", "ausloeser", "geltung", "abSpieltag", "bisSpieltag", "dauer",
  "wirkungAb", "wirkungVorlauf", "aktivSpieltage", "vorlaufStunden", "anker",
  "proZeitraum", "abklingzeit", "verfall", "sperrfrist", "maxProSaison",
  "einsatzTakt", "takt", "fenster", "spieltagVon", "spieltagBis",
];
const zeitlich = (pfad) => ZEIT_WOERTER.some((w) => pfad.toLowerCase().includes(w.toLowerCase()));

const koerper = [];
const T = (...z) => koerper.push(...z);

// ═══ Titel ═══
T(h1("Ebenen und Parameter — Einfach gegen Profi"));
// ⚠️ `name` ist der Runden-NAME, keine Einstellung — er fliegt hier genauso
// raus wie bei `BLOECKE`. Sonst steht oben im Dokument eine andere Zahl als in
// der Auszählung am Ende, und ein Dokument über Zahlen widerspricht sich selbst.
const ALLE_BLAETTER = blaetter(basis).filter(([pf]) => pf !== "name");

T(p(`**Erzeugt am 21.08.2026** aus dem laufenden Regelwerk: **${BLOECKE.length} Blöcke**, `
  + `**${ALLE_BLAETTER.length} einzelne Parameter**. Kein Gedächtnisprotokoll — wer Regeln `
  + `ändert, lässt das Skript neu laufen und bekommt diese Datei aktualisiert.`));
T(p("Andis Auftrag, wörtlich: „welche parameter bei den jeweiligen ebenen überhaupt geändert "
  + "werden sollen, bzw welche bei der einfachen variante weggelassen werden, bei profi soll ja "
  + "egtl jede denkbare Kombination und Art wie bzw für wann dies bestimmt wird, anpassbar sein.“"));
T(p("Dieses Dokument gehört Andi. Hineinschreiben, streichen, umstellen — erwünscht. "
  + "Wo ❓ steht, fehlt eine Entscheidung, die ich nicht für ihn treffe."));

// ═══ 1 Die Regel ═══
T(h1("1 · Die Regel für die zwei Ansichten"));
T(p("**Bestätigt am 20.08.2026:** Profi zeigt **dieselben Abschnitte in derselben Folge**, "
  + "nur mit mehr Reglern je Abschnitt. Kein Abschnitt existiert nur in einer Ansicht, "
  + "keiner sitzt woanders."));
T(p("Daraus folgt, was „weglassen“ überhaupt heißen darf:"));
T(punkt("**Weglassen heißt verbergen, nie ignorieren.** Ein Parameter, den Einfach nicht zeigt, "
  + "wird trotzdem gesetzt — durch die Voreinstellung. Es gibt keinen unbestimmten Wert."));
T(punkt("**Weglassen heißt nicht sperren.** Wer in Einfach beginnt und nach Profi wechselt, "
  + "findet dort seine Einstellungen unverändert wieder."));
T(punkt("**Ein Parameter, den KEINE Voreinstellung je anfasst, ist verdächtig.** Entweder gehört "
  + "er in eine Voreinstellung — oder er ist überflüssig. Genau das misst `npm run stufen`."));

// ═══ 2 Achsen ═══
T(h1("2 · Auf welchen Achsen ein Parameter bestimmt wird"));
T(p("Andis Anspruch an Profi — „jede denkbare Kombination und Art wie bzw. für wann dies bestimmt "
  + "wird“ — sind vier Fragen an JEDEN Parameter. Heute ist bei fast allen dieselbe Antwort "
  + "eingebaut, und das ist die eigentliche Lücke:"));
T(tabelle([
  ["Achse", "Frage", "Heute", "Was es dafür schon gibt"],
  ["WER", "Wer legt den Wert fest?", "der Admin, allein",
    "`regelAbstimmung` (die Runde stimmt ab), `verfassung` (was überhaupt änderbar ist), `vetoAdmin`"],
  ["WANN", "Wann wird er festgelegt?", "einmal beim Anlegen",
    "`wirkungAb`, `wirkungVorlauf`, `aktivSpieltage`, `sperrfrist` — die Abstimmung kennt Zeit bereits"],
  ["WIE", "Wodurch entsteht der Wert?", "fest eingetippt",
    "`drehrad` (Zufall), `ereignisse.ausloeser` (Bedingung), `aufholen` (aus dem Spielstand)"],
  ["WOFÜR", "Für wen/was gilt er?", "für die ganze Runde",
    "`wettbewerbe` (Gewicht je Liga), `spiele.jeWettbewerb` (Auswahl je Liga), `limitKlassen` (je Klasse)"],
], [900, 2100, 1900, 4000]));
T(p("❓ **Entscheidung, die alles Weitere trägt:** sollen diese vier Achsen für JEDEN Parameter "
  + "offenstehen — oder nur für eine benannte Auswahl? Die erste Antwort ist die konsequente und "
  + "sprengt jede Oberfläche; die zweite verlangt eine Liste. **Ohne diese Entscheidung ist "
  + "„jede denkbare Kombination“ nicht baubar.**"));
T(p("⚠️ Eine Warnung dazu, die ich vorher sagen will statt hinterher: **die Achsen multiplizieren "
  + "sich.** 180 Parameter × 4 Achsen sind über 700 Entscheidungen, wenn jede frei kombinierbar "
  + "ist. Das ist nicht unmöglich, aber es ist eine andere Größenordnung als die heutige "
  + "Oberfläche — und es trifft nicht nur die Anzeige, sondern auch Speicherung und Creator-Code."));

// ═══ 3 Einfach ═══
T(h1("3 · Was die einfache Ansicht zeigt"));
T(p(`Einfach besteht aus zwei Werkzeugen: **${CHARAKTERE.length} Voreinstellungen** `
  + `(ganze Runden-Ideen) und **${REGLER.length} Klartext-Regler**. Beides setzt Parameter, `
  + `ohne sie einzeln zu benennen.`));
T(h3("Die Voreinstellungen"));
T(tabelle([["Voreinstellung", "Kurz", "Für wen"],
  ...CHARAKTERE.map((c) => [c.label, c.tagline ?? "", c.fuer ?? ""])], [2400, 3900, 2600]));
T(h3("Die Klartext-Regler"));
T(tabelle([["Regler", "Stufen", "Was er in Worten fragt"],
  ...REGLER.map((r) => [r.label, String(r.stufen.length), r.hint ?? ""])], [2200, 1000, 5700]));

// ═══ 4 Der vollständige Bestand ═══
T(h1("4 · Alle Parameter, Block für Block"));
T(p("**Spalte „Einfach“:** wer den Wert dort setzt, ohne ihn zu zeigen. Steht **„—“**, dann fasst "
  + "ihn keine Voreinstellung und kein Regler an: er steht immer auf der Vorgabe, solange niemand "
  + "in die Profi-Ansicht geht. **Das sind die Kandidaten zum Streichen.**"));
T(p("**Spalte „Achse“:** ⏱ markiert Parameter, die schon heute etwas über ZEIT oder GELTUNG "
  + "sagen — sie sind die Vorlage für Andis „wann“."));

let ohneEinfach = 0;
let gesamt = 0;

for (const block of BLOECKE) {
  const inhalt = basis[block];
  const felder = (inhalt && typeof inhalt === "object" && !Array.isArray(inhalt))
    ? blaetter(inhalt, block)
    : [[block, inhalt]];

  T(h2(`${block}  (${felder.length} Parameter)`));

  if (NUR_PROFI[block]) {
    T(p(`**Ausdrücklich nur Profi.** Begründung im Code: ${NUR_PROFI[block]}`));
  }

  const zeilen = [["Parameter", "Vorgabe", "Einfach setzt es über", "Achse"]];
  for (const [pfad, v] of felder) {
    gesamt++;
    const q = einfachQuellen(pfad);
    if (!q.length) ohneEinfach++;
    zeilen.push([
      pfad.startsWith(`${block}.`) ? pfad.slice(block.length + 1) : pfad,
      wert(v),
      q.length ? q.join(", ") : "—",
      zeitlich(pfad) ? "⏱" : "",
    ]);
  }
  T(tabelle(zeilen, [2700, 1500, 3800, 900]));
}

// ═══ 5 Offene Entscheidungen ═══
T(h1("5 · Offene Entscheidungen"));
T(p(`Gezählt beim Erzeugen: **${ohneEinfach} von ${gesamt} Parametern** werden von keiner `
  + `Voreinstellung und keinem Regler angefasst. Sie stehen ausschließlich in der Profi-Ansicht `
  + `zur Wahl und behalten sonst ewig ihre Vorgabe.`));
T(punkt("❓ **Streichen oder anbinden?** Für jeden dieser Parameter gilt die Frage aus "
  + "`design/vokabular.md`: Welche Ebene füllt er? Wer hat ihn gewünscht? Wenn beides unklar "
  + "ist, gehört er weg — das ist Andis Befund vom „vielen Müll“ in Zahlen."));
T(punkt("❓ **Reichen zwei Ansichten für 180 Parameter?** Profi ist heute eine sehr lange Seite. "
  + "Wenn Profi zusätzlich vier Achsen je Parameter bekommt, ist die Frage nicht mehr, wie viele "
  + "Ansichten es gibt, sondern wie man in EINER Ansicht sucht."));
T(punkt("❓ **Gilt „gleiche Reihenfolge“ auch für die Achsen?** Also: sitzt das „wann“ eines "
  + "Parameters direkt bei ihm — oder gibt es einen eigenen Abschnitt für Zeitfragen? Bei ihm "
  + "wird es unübersichtlich, getrennt wird es zur zweiten Wahrheit."));

mkdirSync("design/entwuerfe", { recursive: true });
const ziel = "design/entwuerfe/Ebenen-Parameter.docx";
schreibeDocx(ziel, koerper);
console.log(`geschrieben: ${ziel}`);
console.log(`  ${BLOECKE.length} Blöcke · ${gesamt} Parameter · ${ohneEinfach} davon nur in Profi erreichbar`);
