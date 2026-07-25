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

const preset = (key) => PRESETS.find((p) => p.key === key)?.rules ?? PRESETS[0].rules;
const saison = (key) => SAISON_PRESETS.find((p) => p.key === key)?.saison ?? { enabled: false, gewicht: 1, wetten: [] };

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
    }),
  },
  {
    key: "mutig",
    label: "Mutig & wild",
    tagline: "Außenseiter-Tipps sollen sich richtig lohnen.",
    desc: "Überraschungen zahlen zusätzlich, der Mut-Bonus belohnt eingelöste Wagnisse, und ein Heimatbonus für den eigenen Verein. Große Ausschläge, viel Drama.",
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
      saison: saison("ohne-favorit"),
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
    m.push(r.joker.modus === "ranking" ? "Gewichte verteilen" : "1 Joker pro Spieltag");
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

  return m;
}
