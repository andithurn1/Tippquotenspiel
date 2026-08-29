// ============================================================
//  ABZEICHEN-BILANZ — woher die Zahlen kommen
//
//  `abzeichen.js` sagt, WELCHE Abzeichen es gibt und ab wann. Diese Datei
//  sagt, WORAUS die Zahlen stammen. Die Trennung ist Absicht: der Katalog ist
//  eine Design-Entscheidung, die Bilanz eine Messung.
//
//  ── 🔴 Die Regel, an der alles hängt ──
//  **Es wird nichts nachgezählt, was die Wertung schon zählt.** Deshalb läuft
//  hier `bewerteEintraege()` aus `engine.js` — dieselbe Funktion, mit der das
//  Ranking rechnet. Ein Abzeichen mit eigener Bewertung behauptet im Profil
//  irgendwann etwas anderes als die Tabelle daneben, und dann ist das Angeben
//  peinlich statt schön.
//
//  ── ⚠️ Was hier NICHT steht, und warum das so bleiben soll ──
//  `LEERE_BILANZ` beschreibt 27 Felder. Diese Datei füllt die, für die es
//  heute ein Signal gibt. Alles andere bleibt bei `0` — und damit wird das
//  Abzeichen schlicht nicht vergeben.
//
//  🔴 **Das ist besser als eine Schätzung.** Ein Feld, das „ungefähr" gefüllt
//  wird, produziert Abzeichen, die niemand nachvollziehen kann; ein Feld, das
//  leer bleibt, produziert nur ein Abzeichen, das noch niemand hat. `LUECKEN`
//  unten zählt sie auf, damit die Lücke sichtbar ist statt vergessen.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { DEFAULT_RULES, bewerteEintraege } from "./engine";
import { spieltageChronologisch, spieltagKey } from "./spieltag";

// ⚠️ Was heute NICHT gefüllt werden kann, mit dem Grund. Ein Test hält die
// Liste ehrlich: steht ein Feld hier, darf `bilanzAus` es nicht setzen — und
// umgekehrt.
export const LUECKEN = {
  hellseher: "Braucht Ergebnis- UND Schützen-Treffer je Spiel; `bewerteEintraege` liefert nur die Ebene.",
  doppelpacks: "Steckt in `scoreGoals().detail`, das die Wertung nicht durchreicht.",
  schuetzenTreffer: "Dito — die Trefferliste je Schütze wird nicht aufbewahrt.",
  aussenseiterTreffer: "`underdogMult` steckt in `scoreResult` und kommt nicht mit heraus.",
  jokerAussenseiter: "Setzt `aussenseiterTreffer` voraus, das aus demselben Grund fehlt.",
  knappDaneben: "Braucht `dist` je Tipp; die Wertung reicht nur `ebene` durch.",
  saisonsBeendet: "Es gibt noch keine einzige abgeschlossene Saison, an der man es ablesen könnte.",
  eigeneRunden: "Steht in der Runden-Tabelle, nicht in den Tipps.",
  rundenGroesse: "Dito — kommt aus `listMembers`.",
  uebernahmen: "Wird an den Presets gezählt, nicht an den Tipps.",
  abstimmungen: "Steht in `votes`/`antraege`.",
  mitgespielteRunden: "Kommt aus `listRoundsForUser`.",
  spottEmpfangen: "SP1 ist nicht gebaut.",
  favoritenSerie: "Braucht den Favoriten je Spiel aus dem Schnappschuss.",
  aufholsprung: "Braucht den Rang-Verlauf (`scoreLeaderboardHistory`).",
  letzterUndWeiter: "Braucht den Spieltags-Letzten UND den Tipp danach — der Rang-Verlauf liegt nicht in den Einträgen.",
};

// Längste Folge, in der `gilt` für aufeinanderfolgende Spieltage wahr ist.
//
// ⚠️ Über die CHRONOLOGISCHE Reihenfolge aller Spieltage der Runde, nicht über
// die eigenen Tipps: „drei in Folge" heißt drei Spieltage hintereinander, nicht
// drei Tipps hintereinander. Wer zwei Spieltage auslässt und dann wieder
// trifft, hat keine Serie — dieselbe Rechnung wie bei den Ereignissen.
function laengsteFolge(reihenfolge, gilt) {
  let best = 0, lauf = 0;
  for (const s of reihenfolge) {
    if (gilt(s)) { lauf += 1; best = Math.max(best, lauf); }
    else lauf = 0;
  }
  return best;
}

// ============================================================
//  Die Bilanz EINER Runde
//
//  ⚠️ Je Runde, nicht je Konto. Zusammengefasst wird in `bilanzZusammen`
//  weiter unten — sonst wäre „Serie über drei Spieltage" eine Serie über zwei
//  verschiedene Runden hinweg, und das ist keine.
// ============================================================
export function bilanzAus({
  eintraege = [], userId, rules = DEFAULT_RULES, regelnFuer = null, schluessel = null,
} = {}) {
  const bilanz = {};
  if (!userId) return bilanz;

  const keyVon = typeof schluessel === "function" ? schluessel : spieltagKey;
  // ⚠️ Kaputte Einträge fliegen raus, BEVOR gerechnet wird. Ein `null` in der
  // Liste hat die erste Fassung zum Absturz gebracht — und der
  // Trophäenschrank ist der dümmste Ort für einen Absturz. Die Wertung selbst
  // muss damit nicht umgehen können; hier ist die Stelle dafür.
  const sauber = (eintraege ?? []).filter((e) => e && typeof e === "object" && e.userId);
  const { bewertet, boni } = bewerteEintraege(sauber, rules, regelnFuer);
  const reihenfolge = spieltageChronologisch(sauber, keyVon);

  const meine = bewertet.filter((b) => b.e?.userId === userId);
  const echte = meine.filter((b) => b.e?.ersatz !== true);

  bilanz.tipps = echte.length;
  bilanz.exakteTreffer = echte.filter((b) => b.ebene === "exakt").length;

  // ── Serien ──────────────────────────────────────────────
  const exaktAn = new Set(echte.filter((b) => b.ebene === "exakt").map((b) => keyVon(b.e)));
  const getipptAn = new Set(echte.map((b) => keyVon(b.e)));
  bilanz.exaktSerie = laengsteFolge(reihenfolge, (s) => exaktAn.has(s.key));
  bilanz.tippSerie = laengsteFolge(reihenfolge, (s) => getipptAn.has(s.key));
  // ⚠️ Nur über Spieltage, an denen überhaupt getippt wurde. Sonst wäre der
  // Pechvogel ein Abzeichen für Nichtstun — und das ist ein anderes Gefühl
  // als „ich tippe und treffe nichts".
  bilanz.ohneExaktSerie = laengsteFolge(reihenfolge,
    (s) => getipptAn.has(s.key) && !exaktAn.has(s.key));

  // ── Punkte je Spieltag: meine und die der Runde ─────────
  const meinePunkte = new Map(), rundePunkte = new Map();
  for (const b of bewertet) {
    if (b.wert == null) continue;
    const k = keyVon(b.e);
    const mitBonus = b.wert + (boni.get(b.key)?.zuschlag ?? 0);
    if (!rundePunkte.has(k)) rundePunkte.set(k, []);
    rundePunkte.get(k).push({ userId: b.e.userId, wert: mitBonus });
    if (b.e.userId === userId) meinePunkte.set(k, (meinePunkte.get(k) ?? 0) + mitBonus);
  }

  // Summe je Spieler und Spieltag — für Schnitt und Führung.
  const jeSpieltag = new Map();
  for (const [k, liste] of rundePunkte) {
    const proSpieler = new Map();
    for (const x of liste) proSpieler.set(x.userId, (proSpieler.get(x.userId) ?? 0) + x.wert);
    jeSpieltag.set(k, proSpieler);
  }

  const ueberSchnitt = new Set();
  for (const [k, proSpieler] of jeSpieltag) {
    const werte = [...proSpieler.values()];
    if (!werte.length || !proSpieler.has(userId)) continue;
    const schnitt = werte.reduce((a, b) => a + b, 0) / werte.length;
    if (proSpieler.get(userId) > schnitt) ueberSchnitt.add(k);
  }
  bilanz.ueberSchnittSerie = laengsteFolge(reihenfolge, (s) => ueberSchnitt.has(s.key));

  // ⚠️ „Kein einziger Punkt" nur an Spieltagen, an denen getippt wurde.
  bilanz.nullSpieltage = [...getipptAn].filter((k) => (meinePunkte.get(k) ?? 0) <= 0).length;

  // Wie oft an der Spitze? Nur EIN Spieltag zählt, nicht der Gesamtstand —
  // „Platzhirsch" ist eine Spieltags-Auszeichnung.
  let fuehrung = 0;
  for (const proSpieler of jeSpieltag.values()) {
    if (!proSpieler.has(userId)) continue;
    const max = Math.max(...proSpieler.values());
    if (proSpieler.get(userId) >= max) fuehrung += 1;
  }
  bilanz.fuehrungSpieltage = fuehrung;

  // ── Der erste exakte Treffer ────────────────────────────
  const pos = new Map(reihenfolge.map((s, i) => [s.key, i + 1]));
  const ersteTreffer = echte.filter((b) => b.ebene === "exakt")
    .map((b) => pos.get(keyVon(b.e)) ?? Infinity);
  bilanz.ersterTrefferSpieltag = ersteTreffer.length ? Math.min(...ersteTreffer) : 0;

  // ── Alleingänge: die Boni, die die Wertung schon vergibt ──
  // 🔴 NICHT selbst nachgeschaut, wer sonst noch richtig lag. `alleinstellung.js`
  // beantwortet das, `bewerteEintraege` reicht das Ergebnis als `boni` durch.
  let allein = 0;
  for (const b of meine) if (boni.get(b.key)) allein += 1;
  bilanz.alleingaenge = allein;

  // ── Das beste Einzelspiel, gemessen am eigenen Schnitt ──
  const meineSpieltagsSummen = [...meinePunkte.values()].filter((v) => v > 0);
  const bestesSpiel = Math.max(0, ...meine.map((b) => b.wert ?? 0));
  const schnittSpieltag = meineSpieltagsSummen.length
    ? meineSpieltagsSummen.reduce((a, b) => a + b, 0) / meineSpieltagsSummen.length
    : 0;
  bilanz.bestesSpielFaktor = schnittSpieltag > 0 ? bestesSpiel / schnittSpieltag : 0;

  return bilanz;
}

// ============================================================
//  Mehrere Runden zu EINER Kontobilanz
//
//  🔴 Andis Zuschnitt ist „je Konto, mit der Runde beschriftet". Beim
//  Zusammenfassen gilt deshalb je Feld eine andere Regel, und das ist keine
//  Spitzfindigkeit:
//
//   · **Mengen addieren.** 12 Treffer hier plus 8 dort sind 20 Treffer.
//   · **Serien nehmen das MAXIMUM.** Eine Serie über zwei Runden hinweg gibt
//     es nicht — wer in zwei Runden je drei Spieltage in Folge traf, hat eine
//     Dreier-Serie, keine Sechser.
//   · **Verhältnisse nehmen das Maximum.** Das beste Einzelspiel ist das
//     beste, nicht die Summe der besten.
//
//  ⚠️ Wer alles addiert, verschenkt hohe Stufen an Vielrundenspieler — und
//  „Diamant" hieße dann nur noch „ist in vielen Runden".
// ============================================================
const SERIEN_FELDER = new Set([
  "exaktSerie", "tippSerie", "ohneExaktSerie", "ueberSchnittSerie",
]);
const MAXIMUM_FELDER = new Set(["bestesSpielFaktor", "rundenGroesse"]);
const KLEINSTES_FELD = new Set(["ersterTrefferSpieltag"]);

export function bilanzZusammen(bilanzen = []) {
  const out = {};
  for (const b of bilanzen) {
    if (!b || typeof b !== "object") continue;
    for (const [k, v] of Object.entries(b)) {
      if (typeof v === "boolean") { out[k] = out[k] === true || v === true; continue; }
      if (!Number.isFinite(v)) continue;
      if (SERIEN_FELDER.has(k) || MAXIMUM_FELDER.has(k)) out[k] = Math.max(out[k] ?? 0, v);
      // ⚠️ Der erste Treffer ist der FRÜHESTE über alle Runden — und eine 0
      // heißt „gab es nicht" und darf das Minimum nicht kapern.
      else if (KLEINSTES_FELD.has(k)) out[k] = v > 0 ? Math.min(out[k] || Infinity, v) : (out[k] ?? 0);
      else out[k] = (out[k] ?? 0) + v;
    }
  }
  if (out.ersterTrefferSpieltag === Infinity) out.ersterTrefferSpieltag = 0;
  return out;
}
