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
  saisonsBeendet: "Es gibt noch keine einzige abgeschlossene Saison, an der man es ablesen könnte.",
  spottEmpfangen: "SP1 ist nicht gebaut.",
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
  verlauf = null,
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


  // ── 🔴 Was die Wertung mitliefert, seit sie es durchreicht ──
  //
  // ⚠️ NICHTS hiervon wird hier nachgerechnet. `dist`, `underdogMult` und die
  // Schützen-Liste kommen aus `scoreTip` — dieselbe Rechnung, die die Punkte
  // vergeben hat. Ein zweiter Weg zu „war das ein Außenseiter" wäre genau die
  // Sorte Doppelrechnung, an der dieses Projekt schon Fehler hatte.

  // Ein Außenseiter-Tipp, der aufging. 🔴 `underdogMult > 1` heißt beides
  // zugleich: der REALE Ausgang war ein Außenseiter-Sieg UND der Tipp hat
  // gezahlt — die Engine setzt den Faktor nur, wenn `resultPart > 0`.
  bilanz.aussenseiterTreffer = echte.filter((b) => (b.underdogMult ?? 1) > 1).length;

  // ⚠️ Und derselbe Treffer MIT Joker darauf — das ist der Kaltschnäuzige.
  // Der Joker steckt im Tipp selbst: entweder als Markierung (`joker`) oder
  // als Gewicht über 1 (Ranglisten- und Einsatz-Modus). Beide Formen fragen,
  // weil eine Runde die eine oder die andere fährt — nur `joker` zu prüfen
  // hieße, den halben Bestand zu übersehen.
  const mitJoker = (t) => t?.joker === true || (Number.isFinite(t?.gewicht) && t.gewicht > 1);
  bilanz.jokerAussenseiter = echte.filter(
    (b) => (b.underdogMult ?? 1) > 1 && mitJoker(b.e?.tip)).length;

  // ⚠️ „Ein Tor daneben" ist `dist === 1`: `dist` ist die Summe BEIDER
  // Abweichungen, ein einzelnes Tor Unterschied ergibt also genau 1. Mit
  // richtigem Sieger — sonst ist es kein knappes Danebenliegen, sondern ein
  // falscher Tipp, der zufällig nah lag.
  bilanz.knappDaneben = echte.filter((b) => b.winnerRight === true && b.dist === 1).length;

  // ── Torschützen ────────────────────────────────────────
  let schuetzen = 0, doppel = 0, hellseher = 0;
  for (const b of echte) {
    const liste = Array.isArray(b.schuetzen) ? b.schuetzen : [];
    if (!liste.length) continue;
    const getroffen = liste.filter((d) => (d.scored ?? 0) >= 1);
    schuetzen += getroffen.length;
    doppel += liste.filter((d) => d.type === "double" && (d.scored ?? 0) >= 2).length;
    // 🔴 Hellseher: exaktes Ergebnis UND jeder getippte Schütze hat getroffen.
    // ⚠️ `every` auf einer leeren Liste wäre `true` — deshalb steht die
    // Längenprüfung oben. Ein Tipp ohne Schützen ist kein Hellsehen.
    if (b.ebene === "exakt" && getroffen.length === liste.length) hellseher += 1;
  }
  bilanz.schuetzenTreffer = schuetzen;
  bilanz.doppelpacks = doppel;
  bilanz.hellseher = hellseher;

  // ── Der Sichere: Tipps in Folge auf den Favoriten ───────
  //
  // ⚠️ Der Favorit kommt aus dem SCHNAPPSCHUSS des Tipps (`winner`), nicht aus
  // einer eigenen Einschätzung: was zum Zeitpunkt der Abgabe der Favorit war,
  // steht dort eingefroren. Nachträglich zu bestimmen, wer Favorit „war",
  // wäre eine Aussage über die Vergangenheit mit heutigen Zahlen.
  const aufFavorit = new Set();
  for (const b of echte) {
    const w = b.e?.snapshot?.winner;
    const t = b.e?.tip;
    if (!w || !t || !Number.isFinite(t.home) || !Number.isFinite(t.away)) continue;
    // Wen hat der Tipp als Sieger gesehen, und wen der Markt?
    const getippt = Math.sign(t.home - t.away);
    const favorit = w.home === w.away ? 0 : (w.home < w.away ? 1 : -1);
    if (getippt !== 0 && getippt === favorit) aufFavorit.add(keyVon(b.e));
  }
  bilanz.favoritenSerie = laengsteFolge(reihenfolge, (s) => aufFavorit.has(s.key));


  // ── 🔴 Der Rang-Verlauf ─────────────────────────────────
  //
  // ⚠️ Er kommt als Parameter herein und wird hier NICHT gerechnet:
  // `scoreLeaderboardHistory` ist die eine Stelle, die weiß, wie ein
  // Zwischenstand zustande kommt (Saisonform, Aufholhilfe, Ereignis-Wirkungen,
  // Duelle). Ihn nachzubauen hieße, an all dem vorbeizurechnen.
  //
  // Form: `[{ wettbewerb, matchday, board: [{ userId, total }] }]`.
  const stationen = (Array.isArray(verlauf) ? verlauf : [])
    .filter((v) => Array.isArray(v?.board) && v.board.length);

  if (stationen.length) {
    // Position je Station: 0 ist Erster. Sortiert wird nach Punkten, nicht auf
    // eine mitgelieferte Reihenfolge vertraut — ein Verlauf darf anders
    // sortiert ankommen, ohne dass die Abzeichen still falsch werden.
    //
    // ⚠️ Der Schlüssel wird mit DERSELBEN Funktion gebaut wie bei den Tipps
    // (`keyVon`). Ihn hier von Hand zusammenzusetzen war der erste Versuch —
    // `"BL|2"` gegen `"BL#2"`, und „Letzter Held" wurde nie vergeben.
    const platz = stationen.map((v) => {
      const sortiert = [...v.board].sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
      const i = sortiert.findIndex((z) => z.userId === userId);
      return { i, n: sortiert.length, key: keyVon(v) };
    });

    // 🔴 Aufholjagd — und hier steckte ein Denkfehler in der ersten Fassung.
    //
    // „War in der unteren Hälfte, ist später in der oberen" klingt richtig und
    // ist wertlos: wer je unten war und irgendwann oben landet, erfüllt es
    // IMMER, egal wie lange er gebraucht hat. Es gibt dann stets eine Station
    // fünf Spieltage vor dem Überholen, an der er noch unten stand.
    //
    // ⚠️ Gemessen wird deshalb der SPRUNG selbst: mindestens das halbe Feld
    // an Plätzen gutgemacht, innerhalb von fünf Stationen, und am Ende in der
    // oberen Hälfte. Das ist eine Jagd; das andere war nur Ausdauer.
    //
    // ⏳ Die Schwelle war zuerst ein Drittel — nachgemessen war das zu weich:
    // wer sich in einem Zwölferfeld Platz um Platz hocharbeitet, kam damit
    // durch. Die Zahl selbst gehört ins Balancing und damit in die Endphase.
    const FENSTER = 5, MIN_LEUTE = 4;
    let sprung = false;
    for (let i = 0; i < platz.length && !sprung; i += 1) {
      const a = platz[i];
      if (a.i < 0 || a.n < MIN_LEUTE) continue;
      const noetig = Math.ceil(a.n / 2);
      for (let j = i + 1; j <= i + FENSTER && j < platz.length; j += 1) {
        const b = platz[j];
        if (b.i < 0 || b.n < MIN_LEUTE) continue;
        if (a.i - b.i >= noetig && b.i < b.n / 2) { sprung = true; break; }
      }
    }
    bilanz.aufholsprung = sprung;

    // Letzter Held: Spieltags-Letzter — und beim nächsten Mal wieder dabei.
    // ⚠️ Auch hier eine Mindestgröße: zu zweit ist „Letzter" nur das andere
    // Wort für „verloren".
    let held = false;
    for (let i = 0; i < platz.length - 1 && !held; i += 1) {
      const a = platz[i];
      if (a.i < 0 || a.n < 3 || a.i !== a.n - 1) continue;
      // Hat er am NÄCHSTEN Spieltag wieder getippt? Das ist der Punkt des
      // Abzeichens — nicht das Letztsein, sondern das Weitermachen.
      if (getipptAn.has(platz[i + 1].key)) held = true;
    }
    bilanz.letzterUndWeiter = held;
  }

  return bilanz;
}

// ============================================================
//  🔴 DAS UMFELD — was NICHT in den Tipps steht
//
//  Fünf Abzeichen hängen an Dingen, die kein einziger Tipp verrät: wie viele
//  Runden man erstellt hat, wie groß sie sind, wie oft der eigene Code
//  übernommen wurde, ob man abgestimmt hat, in wie vielen Runden man mitspielt.
//
//  ⚠️ Diese Funktion LÄDT NICHTS. Sie bekommt, was der Screen ohnehin schon
//  geholt hat, und rechnet daraus. Ein Ladevorgang in einer Bibliothek wäre
//  nicht prüfbar und stünde an einer Stelle, die sonst rein ist.
//
//  ⚠️ Alles ist optional. Fehlt eine Liste, bleibt ihr Feld weg — und das
//  Abzeichen wird eben nicht vergeben. Kein Feld wird geraten.
// ============================================================
export function bilanzAusUmfeld({
  userId, runden = [], mitgliederJeRunde = {}, presets = [], stimmen = [],
} = {}) {
  const out = {};
  if (!userId) return out;

  const meineRunden = (runden ?? []).filter(Boolean);
  out.mitgespielteRunden = meineRunden.length;

  // 🔴 `admin_id`, nicht „hat die erste Runde erstellt". Wer eine Runde
  // übernimmt, ist ihr Admin — und wer seine abgibt, hat sie trotzdem gebaut.
  // Die Datenbank kennt nur den JETZIGEN Admin; mehr behaupten wir hier nicht.
  const eigene = meineRunden.filter((r) => r?.admin_id === userId);
  out.eigeneRunden = eigene.length;

  // Die GRÖSSTE eigene Runde. ⚠️ Nicht die Summe: „Gastgeber Gold" soll
  // heißen, dass einmal 25 Leute zusammenkamen — nicht, dass fünfmal fünf
  // Leute an fünf verschiedenen Tischen saßen.
  let groesste = 0;
  for (const r of eigene) {
    const liste = mitgliederJeRunde?.[r.id];
    if (Array.isArray(liste)) groesste = Math.max(groesste, liste.length);
  }
  if (eigene.length) out.rundenGroesse = groesste;

  // ⚠️ Über ALLE eigenen Codes summiert: wer drei Codes veröffentlicht hat,
  // hat drei Wege, gefunden zu werden, und die zählen zusammen.
  const meineCodes = (presets ?? []).filter((p) => p?.creator_id === userId);
  if (meineCodes.length) {
    out.uebernahmen = meineCodes.reduce((n, p) => n + (Number(p.uebernahmen) || 0), 0);
  }

  // ⚠️ Eine Stimme je Abstimmung, nicht je Stimmabgabe. Wer seine Meinung
  // ändert, hat trotzdem an EINER Abstimmung teilgenommen.
  const meineStimmen = (stimmen ?? []).filter((s) => s?.user_id === userId || s?.userId === userId);
  if (meineStimmen.length) {
    const schluessel = new Set(meineStimmen.map(
      (s) => `${s.round_id ?? s.roundId ?? ""}|${s.matchday ?? ""}|${s.wettbewerb ?? ""}`));
    out.abstimmungen = schluessel.size;
  }

  return out;
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
