// ============================================================
//  BIBLIOTHEK — alles Fertige an einem Ort, durchsuchbar
//  (Andis PP1/PP2 von Folie 1: „Suche, Filter nach Relevanz und
//  Beliebtheit, je Eintrag Kurzbeschreibung, von wem, Popularität und
//  Bewertung durch Admins mit Icons")
//
//  🔴 Bis heute lagen die fertigen Sachen an DREI Orten, die nichts
//  voneinander wussten: die Runden-Charaktere in der Auswahl ganz oben, die
//  Presets in „Empfehlungen verwalten", die Bausteine (Teil-Codes) nur im
//  Abstimmungs-Screen. Wer „irgendwas mit weniger Glück" suchte, musste alle
//  drei kennen — und in zweien davon gab es keine Suche.
//
//  ── ⚠️ Die zwei Zahlen, die Andi verlangt, wären das Leichteste zum
//     Erfinden. Beide sind hier GEMESSEN: ──
//
//  **Verbreitung** („Popularität"): wie viele der kuratierten Runden-Ideen
//  diesen Baustein tatsächlich benutzen. Kein Klickzähler — den gäbe es ohne
//  Server nicht, und eine ausgedachte Zahl unter einem Eintrag ist schlimmer
//  als gar keine. Was hier steht, ist nachrechenbar: `2 von 5 Runden-Ideen`.
//
//  **Bewertung**: keine Meinung, sondern die Wirkung. Jeder Eintrag wird auf
//  das Standard-Regelwerk angewendet und über die echte Engine auf vier
//  Achsen vermessen — Schärfe, Boden, Überraschung, Torschützen-Anteil. Ein
//  Icon sagt, was der Eintrag TUT, nicht ob wir ihn mögen. Und es steht nur
//  da, wo die Messung wirklich etwas sieht; das Warum unten bei `bewerte`.
//
//  Der dritte Wert, **Aufwand**, zählt schlicht die Einstellwerte, die ein
//  Eintrag anfasst. Das ist die ehrlichste Antwort auf „wie viel muss ich
//  erklären?".
//
//  ⚠️ Reine Daten und Rechnung, UI-frei — die Bibliothek malt `Bibliothek.jsx`.
// ============================================================

import { DEFAULT_RULES, sanitizeRules, projectTip } from "./engine";
import { PRESETS } from "./presets";
import { CHARAKTERE } from "./charaktere";
import { TEILBIBLIOTHEKEN } from "./teilbibliothek";
import { ASPEKTE } from "./presetMerge";
import { ratePreset } from "./presetRating";
import { previewArchetypes, archetypeSnapshots } from "./rulePreview";

// ── Die drei Arten ──────────────────────────────────────────
// Die Reihenfolge ist die Antwort auf „womit fange ich an?": eine ganze
// Runden-Idee ist immer die schnellere Wahl als ein einzelner Baustein.
export const ARTEN = [
  { key: "charakter", label: "Runden-Idee", icon: "🎯", desc: "ein fertiges Spiel — Wertung, Wetten und Joker in einem" },
  { key: "preset", label: "Regelwerk", icon: "📐", desc: "die Wertung allein, ohne Drumherum" },
  { key: "baustein", label: "Baustein", icon: "🧩", desc: "ein einzelner Bereich, zum Dazumischen" },
];

const ASPEKT_LABEL = Object.fromEntries(ASPEKTE.map((a) => [a.key, a.label ?? a.key]));

// ── Alle Einträge in EINER Form ─────────────────────────────
//
// `geladen` sind Creator- und Teil-Codes, die jemand in diesem Browser
// eingelesen hat. Sie stehen gleichberechtigt in der Liste, tragen aber einen
// anderen Urheber — genau darum fragt Andis „von wem".
export function eintraege(geladen = [], geteilte = []) {
  const liste = [];

  for (const c of CHARAKTERE) {
    liste.push({
      id: `charakter:${c.key}`, art: "charakter", key: c.key,
      label: c.label, desc: c.desc, kurz: c.tagline ?? null, emoji: c.emoji ?? "🎯",
      fuer: c.fuer ?? null, aspekt: null, urheber: "haus", rules: c.rules,
    });
  }

  for (const p of PRESETS) {
    liste.push({
      id: `preset:${p.key}`, art: "preset", key: p.key,
      label: p.label, desc: p.desc, kurz: null, emoji: "📐",
      fuer: null, aspekt: null, urheber: "haus",
      rules: sanitizeRules({ ...DEFAULT_RULES, ...p.rules }),
    });
  }

  for (const b of TEILBIBLIOTHEKEN) {
    for (const e of b.eintraege) {
      liste.push({
        id: `baustein:${b.aspekt}:${e.key}`, art: "baustein", key: e.key,
        label: e.label, desc: e.desc, kurz: null, emoji: "🧩",
        fuer: null, aspekt: b.aspekt, urheber: "haus",
        werte: e.werte,
        rules: sanitizeRules({ ...DEFAULT_RULES, ...e.werte }),
      });
    }
  }

  for (const g of geladen) {
    liste.push({
      id: `geladen:${g.id ?? g.code ?? g.label}`, art: g.aspekt ? "baustein" : "preset",
      key: g.id ?? g.code, label: g.label ?? "Geladener Code", desc: g.desc ?? "",
      kurz: null, emoji: "📥", fuer: null, aspekt: g.aspekt ?? null,
      // 🔴 Der ehrliche Teil: wir wissen bei einem eingelesenen Code NICHT, wer
      // ihn gebaut hat — der Code trägt Regeln, keinen Namen. „Von euch
      // geladen" ist alles, was stimmt.
      urheber: "geladen",
      werte: g.werte ?? null,
      rules: g.rules ? sanitizeRules(g.rules) : null,
    });
  }

  // ── Geteilte Regelwerke aus dem Store ─────────────────
  //
  // Kommen aus `getStore().listPresets()` — anders als `geladen` hat sie
  // niemand hier eingetippt, sie liegen veröffentlicht in der Datenbank.
  // Genau das macht „beliebteste Auswahl" überhaupt möglich: `uebernahmen`
  // ist gezählt, nicht geschätzt.
  //
  // ⚠️ Getrennt von `geladen` gehalten, obwohl beide „nicht vom Haus" sind:
  // ein geladener Code ist EINEM Browser bekannt, ein geteiltes Preset allen.
  // Ein gemeinsamer Topf würde die Herkunft verwischen — und die Herkunft ist
  // genau das, wonach Andis „von wem" fragt.
  for (const g of geteilte) {
    liste.push({
      id: `geteilt:${g.code}`, art: g.aspekt ? "baustein" : "preset",
      key: g.code, label: g.name ?? "Geteiltes Regelwerk",
      desc: g.beschreibung ?? "", kurz: null, emoji: "🌐",
      fuer: null, aspekt: g.aspekt ?? null,
      urheber: "geteilt", code: g.code,
      uebernahmen: g.uebernahmen ?? 0,
      werte: null,
      rules: g.rules ? sanitizeRules(g.rules) : null,
    });
  }

  return liste;
}

// ── Verbreitung: die einzige Popularität, die wir wirklich kennen ──
//
// Wie viele der kuratierten Runden-Ideen benutzen genau diese Werte? Das ist
// kein Beliebtheitswettbewerb unter Spielern, sondern eine Aussage über das
// Haus — und sie stimmt, weil sie nachgerechnet und nicht gezählt wird.
export function verbreitung(eintrag, charaktere = CHARAKTERE) {
  if (!eintrag) return null;
  if (eintrag.art === "charakter") return null;      // eine Idee ist die oberste Ebene
  if (eintrag.urheber === "geladen") return null;    // über fremde Codes wissen wir nichts
  if (eintrag.urheber === "geteilt") return null;    // dito — dafür tragen sie `uebernahmen`

  if (eintrag.art === "preset") {
    // Ein Charakter baut auf einem Preset auf: der Name steht in seinen Regeln
    // nicht drin, wohl aber die Werte. Verglichen wird über die Wertungsfelder.
    const treffer = charaktere.filter((c) => passtZu(c.rules, eintrag.rules, WERTUNGS_FELDER));
    return { von: treffer.length, gesamt: charaktere.length };
  }

  const felder = Object.keys(eintrag.werte ?? {});
  if (!felder.length) return null;
  const treffer = charaktere.filter((c) => passtZu(c.rules, eintrag.werte, felder));
  return { von: treffer.length, gesamt: charaktere.length };
}

// Die Felder, an denen ein Preset erkennbar ist. Bewusst eine kurze Liste:
// ein Charakter ändert Joker und Wetten obendrauf, das Preset erkennt man an
// der WERTUNG.
const WERTUNGS_FELDER = ["k", "m", "minPayout", "wrongPenalty", "winnerFloor", "underdogBonus"];

function passtZu(rules, werte, felder) {
  if (!rules || !werte) return false;
  return felder.every((f) => gleich(rules[f], werte[f]));
}

function gleich(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => gleich(a[k], b[k]));
}

// ── Bewertung: was der Eintrag TUT ──────────────────────────
//
// ⚠️ Gemessen wird gegen das STANDARD-Regelwerk, nicht gegen das gerade
// eingestellte. Sonst änderte sich die Bewertung eines Eintrags, während man
// die Bibliothek durchsieht — und zwei Einträge wären nicht mehr vergleichbar.
//
// 🔴 Die erste Fassung maß nur die Underdog-Neigung aus `ratePreset` — und
// nachgemessen zeigten **64 von 69** Einträgen dasselbe Icon. Sogar „Mild"
// und „Streng" kamen auf denselben Wert. Der Grund war kein Fehler in den
// Einträgen, sondern in der Messung: `underdogLean` ist ein VERHÄLTNIS
// (Außenseiter-Punkte zu Favoriten-Punkten), und `k`/`m` skalieren beide
// Seiten gleich. Ein Icon, das fast alle gleich beschreibt, ist Deko.
//
// Deshalb vier Achsen, jede an den Bibliothekseinträgen nachgemessen, dass
// sie WIRKLICH unterscheidet (die Zahlen stehen in `design/bibliothek.md`):
//
//   Schärfe        56 · 64 · 93 · 73   (Mild → Ohne Sicherheitsnetz)
//   Boden          58 · 41 · −75 · 25  (was ein Fehltipp kostet)
//   Überraschung    0 · +19 · +5 · +42 (die Underdog-Einträge)
//   Schützenanteil 18 · 64 · 79 · 59 % (die vier Kombi-Einträge)
//
// ⚠️ Ein Eintrag bekommt ein Icon NUR für Achsen, die er wirklich bewegt.
// Kein „ändert kaum etwas"-Icon: die meisten Bausteine wirken auf Joker,
// Ereignisse oder Anzeige, und über die sagt eine Wertungs-Messung nichts —
// sie hätte dann eine Aussage vorgetäuscht, die sie nicht treffen kann.
//
// 🔴 Und noch eine Korrektur nach dem Nachmessen: verglichen wird ein Eintrag
// mit seinen GESCHWISTERN, nicht mit dem Standard-Regelwerk. Gegen den
// Standard gemessen zeigten „Mild" und „Gemütlich" nichts an — beide liegen
// nah genug an der Vorgabe. Das ist richtig gerechnet und trotzdem die
// falsche Frage: wer in der Bibliothek steht, entscheidet nicht „strenger als
// die Vorgabe?", sondern „welcher von DIESEN vieren ist der strengste?".
// Innerhalb der Gruppe ist Mild der nachsichtigste — und genau das steht
// jetzt dran.
// Die Vergleichszahlen des Standard-Regelwerks. Nicht mehr die Grundlage der
// Icons (siehe oben), aber die Zeile, an der man einen Einzelwert einordnet:
// „Schärfe 93" heißt nichts, „93 gegen 59 im Standard" schon.
export const STANDARD_KENNZAHLEN = kennzahlen(DEFAULT_RULES);

// Ab wann die Spannweite einer Gruppe groß genug ist, dass „am strengsten"
// etwas heißt. Je Achse eigen, weil die Skalen es sind: 8 Punkte Neigung sind
// viel, 8 Punkte Boden sind nichts.
const SCHWELLEN = { schaerfe: 6, boden: 25, ueberraschung: 8, schuetzen: 8 };

// Die vier Messwerte eines Regelwerks. Alles über die echte Engine — dieselbe
// Vorschau, die auch der Erstellen-Screen zeigt.
export function kennzahlen(rules) {
  const rows = previewArchetypes(rules);
  let exakt = 0, daneben = 0, n = 0, boden = Infinity;
  for (const r of rows) {
    for (const t of r.tips) {
      if (t.kind === "exakt") exakt += t.points;
      else { daneben += t.points; n++; }
      boden = Math.min(boden, t.points);
    }
  }
  const mittelExakt = exakt / (rows.length || 1);
  const mittelDaneben = n ? daneben / n : 0;

  // Schützenanteil: wie viel der angezeigten Summe an den Torschützen hängt.
  // `projectTip` liefert beide Zahlen selbst — die zweite nachzurechnen wäre
  // die zweite Wahrheit, vor der die Runden-Schicht warnt.
  let mit = 0, ohne = 0;
  for (const a of archetypeSnapshots()) {
    const tip = {
      home: a.real.home, away: a.real.away,
      goals: {
        home: Object.keys(a.snap.players?.home ?? {}).slice(0, 1),
        away: Object.keys(a.snap.players?.away ?? {}).slice(0, 1),
      },
    };
    const p = projectTip(tip, a.snap, rules);
    mit += p.points; ohne += p.pointsOhneSchuetzen;
  }

  return {
    schaerfe: Math.round(100 * (1 - mittelDaneben / (mittelExakt || 1))),
    boden: Math.round(boden),
    ueberraschung: ratePreset(rules).underdogLean,
    schuetzen: mit > 0 ? Math.round(100 * (1 - ohne / mit)) : 0,
  };
}

// Je Achse: welches Icon steht für „mehr" und welches für „weniger". Der Text
// sagt immer, was der Spieler MERKT — nicht, welche Stellschraube sich bewegt.
const ACHSEN = [
  {
    key: "schaerfe", label: "Schärfe",
    hoch: { icon: "🎯", label: "am strengsten", desc: "Knapp daneben bringt hier am wenigsten." },
    tief: { icon: "🫧", label: "am nachsichtigsten", desc: "Auch ein knapp verfehlter Tipp zahlt noch ordentlich." },
  },
  {
    key: "boden", label: "Boden",
    hoch: { icon: "🪶", label: "verzeiht am meisten", desc: "Selbst der schlechteste Tipp bleibt im Plus." },
    tief: { icon: "⚠️", label: "Fehltipps kosten", desc: "Ein danebenliegender Tipp kann hier ins Minus führen." },
  },
  {
    key: "ueberraschung", label: "Überraschung",
    hoch: { icon: "🎲", label: "meiste Überraschung", desc: "Außenseiter-Tipps zahlen hier am deutlichsten." },
    tief: { icon: "🛡️", label: "am planbarsten", desc: "Favoriten-Tipps setzen sich hier am klarsten durch." },
  },
  {
    key: "schuetzen", label: "Torschützen",
    hoch: { icon: "⚽", label: "Torschützen entscheiden", desc: "Hier hängt der größte Teil der Punkte an den getippten Schützen." },
    tief: { icon: "🥅", label: "Ergebnis zählt", desc: "Hier fallen die Torschützen am wenigsten ins Gewicht." },
  },
];

// Die Gruppe, innerhalb derer verglichen wird: die Einträge desselben Aspekts
// bzw. derselben Art. „Streng" konkurriert mit den anderen Nähe-Einträgen,
// nicht mit einem Joker-Baustein — der misst etwas ganz anderes.
function gruppeVon(eintrag) {
  return eintrag.aspekt ? `baustein:${eintrag.aspekt}` : eintrag.art;
}

// ⚠️ Bewertet wird die LISTE, nicht der einzelne Eintrag: „am strengsten"
// lässt sich ohne die Geschwister nicht sagen. Rückgabe ist eine Map id →
// Bewertung. Gemessen 23 ms für 69 Einträge — billig genug, um sie im Screen
// bei jedem Öffnen neu zu rechnen, statt sie irgendwo zwischenzulagern.
export function bewerteAlle(liste) {
  const kennzahlenJe = new Map();
  for (const e of liste) if (e.rules) kennzahlenJe.set(e.id, kennzahlen(e.rules));

  // Je Gruppe und Achse: wer liegt oben, wer unten, und ist die Spannweite
  // überhaupt groß genug für eine Aussage?
  const gruppen = new Map();
  for (const e of liste) {
    const k = kennzahlenJe.get(e.id);
    if (!k) continue;
    const g = gruppeVon(e);
    if (!gruppen.has(g)) gruppen.set(g, []);
    gruppen.get(g).push([e.id, k]);
  }

  const spitzen = new Map();   // `${gruppe}|${achse}` → { hoch: id, tief: id }
  for (const [g, mitglieder] of gruppen) {
    if (mitglieder.length < 2) continue;   // allein ist niemand „der strengste"
    for (const a of ACHSEN) {
      const werte = mitglieder.map(([, k]) => k[a.key]);
      const spanne = Math.max(...werte) - Math.min(...werte);
      if (spanne < SCHWELLEN[a.key]) continue;
      const hoch = mitglieder.reduce((b, m) => (m[1][a.key] > b[1][a.key] ? m : b));
      const tief = mitglieder.reduce((b, m) => (m[1][a.key] < b[1][a.key] ? m : b));
      spitzen.set(`${g}|${a.key}`, { hoch: hoch[0], tief: tief[0], spanne });
    }
  }

  const map = new Map();
  for (const e of liste) map.set(e.id, bewerteEinen(e, kennzahlenJe.get(e.id), spitzen));
  return map;
}

function bewerteEinen(eintrag, k, spitzen) {
  const wirkungen = [];
  if (k) {
    const g = gruppeVon(eintrag);
    for (const a of ACHSEN) {
      const s = spitzen.get(`${g}|${a.key}`);
      if (!s) continue;
      if (s.hoch === eintrag.id) wirkungen.push({ ...a.hoch, achse: a.key, wert: k[a.key] });
      else if (s.tief === eintrag.id) wirkungen.push({ ...a.tief, achse: a.key, wert: k[a.key] });
    }
  }

  const felder = eintrag.werte ? zaehleFelder(eintrag.werte) : null;
  const aufwand = felder == null ? null
    : felder <= 3 ? { key: "leicht", icon: "🟢", label: "schnell erklärt", desc: `${felder} Einstellwerte` }
    : felder <= 8 ? { key: "mittel", icon: "🟡", label: "mittlerer Umfang", desc: `${felder} Einstellwerte` }
    : { key: "schwer", icon: "🔴", label: "viel zu erklären", desc: `${felder} Einstellwerte` };

  return { wirkungen, aufwand, kennzahlen: k };
}

// Zählt Blätter, nicht Schlüssel: `combo: { tendenz, abstand, exakt }` sind
// DREI Einstellwerte, nicht einer. Genau diese Zahl beantwortet „wie viel muss
// ich erklären?".
function zaehleFelder(werte, tiefe = 0) {
  if (tiefe > 4 || werte == null) return 0;
  if (typeof werte !== "object") return 1;
  if (Array.isArray(werte)) return werte.length;
  return Object.values(werte).reduce((s, v) => s + zaehleFelder(v, tiefe + 1), 0);
}

// ── Suche ───────────────────────────────────────────────────
// Ohne Diakritika und ohne Groß-/Kleinschreibung: wer „gemutlich" tippt, meint
// „Gemütlich" — auf dem Handy ist das die Regel, nicht die Ausnahme.
function normalisiere(text) {
  return String(text ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function suche(liste, text) {
  const q = normalisiere(text).trim();
  if (!q) return liste;
  const worte = q.split(/\s+/);
  return liste.filter((e) => {
    const heu = normalisiere([e.label, e.desc, e.kurz, e.fuer, e.code, ASPEKT_LABEL[e.aspekt] ?? e.aspekt].filter(Boolean).join(" "));
    // ALLE Wörter müssen vorkommen: „joker streng" soll die Schnittmenge
    // liefern, nicht alles mit „joker" ODER „streng".
    return worte.every((w) => heu.includes(w));
  });
}

// ── Sortierung ──────────────────────────────────────────────
export const SORTIERUNGEN = [
  { key: "relevanz", label: "Relevanz", desc: "Fertige Runden-Ideen zuerst, dann Regelwerke, dann Bausteine" },
  { key: "verbreitung", label: "Verbreitung", desc: "Was in den meisten kuratierten Runden-Ideen steckt" },
  // 🔴 Andis „beliebteste Auswahl". Zählt nur, was der Store zählen kann:
  // Übernahmen geteilter Codes. Haus-Einträge tragen keine — sie stehen
  // deshalb hinten, nicht auf 0. Ein Haus-Regelwerk als „unbeliebt" zu
  // zeigen, wäre eine erfundene Zahl.
  { key: "beliebt", label: "Beliebt", desc: "Geteilte Codes nach Übernahmen — Haus-Einträge dahinter" },
  { key: "name", label: "Name", desc: "alphabetisch" },
];

const ART_RANG = Object.fromEntries(ARTEN.map((a, i) => [a.key, i]));

export function sortiere(liste, modus = "relevanz") {
  const kopie = [...liste];
  if (modus === "name") {
    return kopie.sort((a, b) => a.label.localeCompare(b.label, "de"));
  }
  if (modus === "beliebt") {
    // -1 statt 0 für alles ohne Zählung: „nicht gemessen" ist nicht „null mal
    // übernommen", und die beiden dürfen nicht auf demselben Platz landen.
    const wie_oft = (e) => (e.urheber === "geteilt" ? (e.uebernahmen ?? 0) : -1);
    return kopie.sort((a, b) => wie_oft(b) - wie_oft(a) || a.label.localeCompare(b.label, "de"));
  }
  if (modus === "verbreitung") {
    const anteil = (e) => {
      const v = verbreitung(e);
      return v ? v.von / v.gesamt : -1;    // ohne Messwert nach hinten
    };
    return kopie.sort((a, b) => anteil(b) - anteil(a) || a.label.localeCompare(b.label, "de"));
  }
  return kopie.sort((a, b) =>
    (ART_RANG[a.art] ?? 9) - (ART_RANG[b.art] ?? 9) || a.label.localeCompare(b.label, "de"));
}

// Der Text unter der Liste. Steht hier und nicht im Screen, damit Zählung und
// Anzeige dieselbe Quelle haben.
export function beschreibeTreffer(gefunden, gesamt, text) {
  if (!text?.trim()) return `${gesamt} Einträge`;
  if (gefunden === 0) return `Nichts gefunden für „${text.trim()}"`;
  return `${gefunden} von ${gesamt} Einträgen`;
}

export { ASPEKT_LABEL };
