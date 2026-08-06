// ============================================================
//  RUNDEN-CHARAKTERE — die einfachste Art, eine Runde zu starten
//
//  Ein Preset ist ein REGELWERK. Ein Charakter ist eine ganze RUNDEN-IDEE:
//  Wertung + Saison-Wetten + Joker in einem stimmigen Paket. Wer auf der
//  einfachsten Stufe eine Runde anlegt, wählt genau einmal — und ist fertig.
//
//  Warum nicht einfach die Presets zeigen? Weil ein Preset nur die halbe
//  Antwort ist: „Hardcore" sagt nichts darüber, ob es Saison-Wetten gibt oder
//  wie oft ein Joker kommt. Genau diese Kombinationen sind es aber, die eine
//  Runde ausmachen — und die man einzeln nur mit Vorwissen richtig trifft.
//
//  Jeder Charakter baut auf einem geprüften Preset auf und ergänzt die
//  übrigen Ebenen. Alles läuft durch `sanitizeRules`, ist also garantiert ein
//  gültiges Regelwerk — und wandert damit auch vollständig in die
//  Creator-Codes.
//
//  Reine Daten + Funktionen, UI-frei.
// ============================================================

import { sanitizeRules } from "./engine";
import { PRESETS } from "./presets";
import { SAISON_PRESETS } from "./saisonwetten";
import { EREIGNIS_PRESETS } from "./ereignisse";

const preset = (key) => PRESETS.find((p) => p.key === key)?.rules ?? PRESETS[0].rules;
const saison = (key) => SAISON_PRESETS.find((p) => p.key === key)?.saison ?? { enabled: false, gewicht: 1, wetten: [] };
// 🔴 Bis 06.08.2026 sagte KEIN Charakter etwas zu den Ereignissen — die ganze
// Ebene kam nur in der Profi-Ansicht vor. Das ist Frage 1 des
// Baukasten-Grundsatzes: „Kommt sie in Stufe 1 überhaupt vor? Meist nein —
// dann muss ein Runden-Charakter sie sinnvoll mitsetzen, ohne sie zu zeigen."
// Genau das passiert hier: jeder Charakter wählt ein Bündel aus der
// Ereignis-Bibliothek, das zu seiner Idee passt. In der Beschreibung steht ein
// Satz darüber, kein Regelname.
const ereignisse = (key) =>
  EREIGNIS_PRESETS.find((p) => p.key === key)?.ereignisse ?? { enabled: false, maxErspielt: 5, aktive: [] };

// ⚠️ Zur MITBESTIMMUNG (`design/abstimmung-verfassung.md`) sagt hier bewusst
// kein Charakter etwas: alle fünf lassen die Regel-Abstimmung aus, und das ist
// die kuratierte Wahl, nicht eine Lücke. Ein Charakter ist eine Runden-IDEE
// („wie fühlt sich das Spiel an"), und wie eine Gruppe ihre Regeln beschließt,
// ist keine Frage des Spielgefühls — sie kommt erst auf, wenn eine Runde schon
// läuft. Erreichbar ist sie über Stufe 2 („Wer darf die Regeln ändern?").
// Das ist die Antwort auf Frage 1 des Baukasten-Grundsatzes, ausdrücklich
// begründet statt stillschweigend ausgelassen.
export const CHARAKTERE = [
  {
    key: "klassisch",
    label: "Klassisch & fair",
    tagline: "Wenn ihr euch nicht sicher seid: das hier.",
    desc: "Ausgewogene Wertung, ein Joker pro Spieltag, die drei Saison-Fragen, über die sowieso jeder redet. Nichts, was man erklären muss.",
    emoji: "⚖️",
    fuer: "Freundeskreise, die einfach loslegen wollen",
    rules: sanitizeRules({
      ...preset("standard"),
      name: "Klassisch & fair",
      joker: { enabled: true, modus: "einzel", faktor: 1.5, abstimmung: false },
      saison: saison("klassisch"),
      // Die harmloseste Sorte: sie belohnt Teilnahme, nicht Können, und
      // bevorzugt damit niemanden, der ohnehin vorn liegt. Passt zu „nichts,
      // was man erklären muss".
      ereignisse: ereignisse("dranbleiben"),
    }),
  },
  {
    key: "mutig",
    label: "Mutig & wild",
    tagline: "Außenseiter-Tipps sollen sich richtig lohnen.",
    desc: "Überraschungen zahlen zusätzlich, der Mut-Bonus belohnt eingelöste Wagnisse, ein Heimatbonus für den eigenen Verein — und das Spiel des Spieltags zählt extra. Große Ausschläge, viel Drama.",
    emoji: "🎲",
    fuer: "Runden, die lieber zocken als rechnen",
    rules: sanitizeRules({
      ...preset("underdog-party"),
      name: "Mutig & wild",
      joker: {
        enabled: true, modus: "einzel", faktor: 1.5, abstimmung: false,
        heimat: { enabled: true, faktor: 1.2 },
        mut: { enabled: true, faktor: 1.1 },
      },
      // Das Topspiel gehört zum Drama — und ist hier belegbar unbedenklich:
      // im Balance-Durchgang (`npm run balance`) hält gerade dieses Paket die
      // Ebene am besten aus, der Kenner gewinnt mit Big Game sogar minimal
      // MEHR (50,0 → 51,7 %). Grund: der Aufschlag verstärkt auch die
      // Fehlgriffe des Zockers, nicht nur seine Treffer — dieselbe Mechanik
      // wie beim Heimatbonus. Bewusst die mittlere Schwelle, nicht 0.
      bigGame: { enabled: true, aufschlag: 0.5, minSpannung: 0.35 },
      saison: saison("ohne-favorit"),
      // ⚠️ Das einzige Paket mit einem VERSTÄRKENDEN Bündel — und das ist hier
      // die Ansage („große Ausschläge, viel Drama"), nicht ein Versehen.
      // Anderswo hat es nichts zu suchen.
      ereignisse: ereignisse("mut"),
    }),
  },
  {
    key: "kenner",
    label: "Kenner-Runde",
    tagline: "Hier gewinnt, wer die Liga wirklich verfolgt.",
    desc: "Strenge Wertung mit wenig Trost für knappe Tipps, Gewichte statt Einzel-Joker, und Saison-Wetten, die man nicht mal eben rät.",
    emoji: "🧠",
    fuer: "wenn ihr euch gegenseitig ernst nehmt",
    rules: sanitizeRules({
      ...preset("hardcore"),
      name: "Kenner-Runde",
      joker: { enabled: true, modus: "ranking", faktoren: [2, 1.5, 1.2, 1], abstimmung: false },
      saison: saison("kenner"),
      // Bewusst AUS. „Hier gewinnt, wer die Liga verfolgt" verträgt keine
      // Nebengutschriften: jede davon verschiebt einen Teil der Entscheidung
      // weg vom Tippen. Ausdrücklich begründet statt stillschweigend
      // ausgelassen — dieselbe Regel wie bei der Mitbestimmung oben.
      ereignisse: ereignisse("aus"),
    }),
  },
  {
    // 🔴 Der Wettmodus (`joker.modus: "einsatz"`) kam in Stufe 1 bisher gar
    // nicht vor — er war nur über die Profi-Ansicht erreichbar. Genau der
    // Zustand, den der Baukasten-Grundsatz ausschließt: wer die einfachste
    // Stufe benutzt, hat von einer ganzen Spielart nie erfahren.
    key: "wettbuero",
    label: "Wettbüro",
    tagline: "Du entscheidest, welches Spiel dir wie viel wert ist.",
    desc: "Jeden Spieltag bekommt jeder denselben Vorrat an Münzen und verteilt ihn auf die Spiele — auf ein sicheres Gefühl mehr, auf ein Rätselspiel wenig oder gar nichts. Gewonnen werden Punkte, nie neue Münzen: der Vorrat ist jede Woche derselbe, damit niemand durch einen guten Start uneinholbar wird.",
    emoji: "🪙",
    fuer: "Runden, die lieber abwägen als raten",
    rules: sanitizeRules({
      ...preset("standard"),
      name: "Wettbüro",
      joker: {
        enabled: true, modus: "einsatz", abstimmung: false,
        einsatzProSpieltag: 100, maxAnteilProSpiel: 0.4, minAnteilProSpiel: 0,
        skippenErlaubt: true,
        // Der empfohlene Takt, ohne ihn zu zeigen: jede Woche frische Münzen
        // (design/wettmodus.md 1 — Münzen sind ein Spieltags-Werkzeug, kein
        // Vermögen). Genau das meint „ein Charakter setzt sie sinnvoll mit".
        einsatzTakt: "spieltag",
      },
      saison: saison("klassisch"),
      ereignisse: ereignisse("dranbleiben"),
    }),
  },
  {
    key: "nebenbei",
    label: "Nur nebenbei",
    tagline: "Mitspielen, ohne dass es Arbeit wird.",
    desc: "Keine Joker, milde Wertung, zwei Saison-Wetten mit kleinem Gewicht — und Kulanz, wenn mal jemand einen Spieltag vergisst.",
    emoji: "🌤️",
    fuer: "Runden, die nicht jede Woche reinschauen",
    rules: sanitizeRules({
      ...preset("standard"),
      name: "Nur nebenbei",
      joker: { enabled: false },
      saison: saison("nebenbei"),
      versaeumnis: { enabled: true, strategie: "wahrscheinlich", malusProzent: 25, maxProSaison: 5 },
      // ⚠️ NICHT „ausgleich": der Trost-Joker und der Versäumnis-Ersatztipp
      // fangen beide den verpatzten Spieltag ab, und zusammen wäre das eine
      // Doppelbelohnung für dasselbe. Dieselbe Überlegung, die `konflikte()`
      // für Trost-Joker + Anschluss-Bonus meldet.
      ereignisse: ereignisse("dranbleiben"),
    }),
  },
];

export const CHARAKTER = Object.fromEntries(CHARAKTERE.map((c) => [c.key, c]));

// Kurzbeschreibung dessen, was ein Charakter mitbringt — für die Karte.
// Bewusst in Alltagssprache, keine Regelnamen.
export function merkmale(charakter) {
  const r = charakter?.rules;
  if (!r) return [];
  const m = [];

  if (r.joker?.enabled) {
    // ⚠️ Drei Modi, nicht zwei. Solange hier eine Ternary stand, hätte der
    // Wettmodus „1 Joker pro Spieltag" auf die Karte geschrieben — eine
    // Beschreibung, die dem Spieler das Falsche verspricht.
    m.push(r.joker.modus === "ranking" ? "Gewichte verteilen"
      : r.joker.modus === "einsatz" ? "Münzen verteilen"
      : "1 Joker pro Spieltag");
    if (r.joker.heimat?.enabled) m.push("Heimatbonus");
    if (r.joker.mut?.enabled) m.push("Mut-Bonus");
  } else {
    m.push("ohne Joker");
  }

  if (r.saison?.enabled) {
    const n = r.saison.wetten?.length ?? 0;
    m.push(`${n} Saison-Wette${n === 1 ? "" : "n"}`);
  }
  if (r.versaeumnis?.enabled) m.push("Kulanz bei Versäumnis");
  if (r.underdogBoost > 1) m.push("Außenseiter zahlen extra");
  // In Alltagssprache, nach dem, WAS der Spieler merkt — nicht nach dem, was
  // eingeschaltet ist. „2 Ereignisse aktiv" wäre ein Regelname; „Joker zum
  // Verdienen" ist die Sache selbst.
  if (r.ereignisse?.enabled) {
    const keys = new Set((r.ereignisse.aktive ?? []).map((a) => a.key));
    if (keys.has("letzter-am-spieltag")) m.push("Trost-Joker für schlechte Spieltage");
    else if (keys.has("aussenseiter") || keys.has("erster-exakter")) m.push("Joker für gute Treffer");
    else m.push("Joker fürs Dranbleiben");
  }

  return m;
}
