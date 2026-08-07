// ============================================================
//  WEN TRIFFT ES? — die Auswahl-Achse der Regel-Grammatik
//
//  Jede Mechanik dieses Spiels beantwortet vier Fragen: WANN (Auslöser),
//  WEN (Auswahl), WAS (Wirkung), WIE LANGE (Geltung). Dieses Modul ist das
//  WEN — und sonst nichts.
//
//  Warum als eigenes Modul: die Auswahl lag bisher in jeder Mechanik einzeln
//  und war deshalb fast überall „alle gleich" oder „jeder für sich". Eine
//  rang-abhängige Auswahl gab es genau einmal (`catchup.js`) — und genau die
//  bricht bei großen Runden, weil sie am Rückstand zur SPITZE hängt. Dieselbe
//  Lehre wie bei der Zeitachse: vier lokale Zählungen wurden erst brauchbar,
//  als `rundenSchluessel()` daraus eine machte.
//
//  ⚠️ **Reine Auswahl, KEINE Wertung.** Dieses Modul liefert eine Liste von
//  Nutzer-Ids, sonst nichts. Was mit den Ausgewählten passiert, entscheidet die
//  Wirkung — und die läuft weiter durch `modCap` bzw. das Joker-Kontingent.
//  Genau diese Trennung hat die Zeitachse sauber gehalten.
//
//  ⚠️ **Deterministisch aus Runden-Id und Spieltag.** Alles Zufällige kommt aus
//  `seeded.js`: alle sehen dasselbe, es ist von Hand nachrechenbar, und der
//  Creator-Code bleibt kurz, weil die REGEL gespeichert wird und nicht die
//  ausgerollte Liste. Bei tausend Teilnehmern ist Nachprüfbarkeit wichtiger als
//  bei zwölf — der Verdacht der Bevorzugung entsteht sonst von selbst und lässt
//  sich nicht widerlegen.
//
//  ❌ **`wettlauf` („die ersten fünf, die zugreifen") fehlt bewusst.** Es ist
//  die einzige Auswahl, die sich nicht aus einem Startwert ableiten lässt: sie
//  braucht eine echte Reihenfolge und damit Serverzustand. Damit verlöre sie
//  genau die Eigenschaft, auf der alle anderen beruhen. Kommt zuletzt, wenn
//  überhaupt.
// ============================================================

import { seeded } from "./seeded";

export const MODI = [
  { key: "alle",             label: "Alle",                 text: "Trifft jeden gleich." },
  { key: "selbst",           label: "Jeder für sich",       text: "Jeder entscheidet selbst." },
  { key: "betroffener",      label: "Wen es erwischt hat",  text: "Nur die Person, die den Auslöser ausgelöst hat." },
  { key: "koenig",           label: "Der Führende",         text: "Wer gerade an der Spitze steht." },
  { key: "verfolger",        label: "Die Verfolger",        text: "Die Plätze 2 bis n+1." },
  { key: "rang",             label: "Die besten/letzten n", text: "Eine feste Anzahl von oben oder unten." },
  { key: "perzentil",        label: "Oberes/unteres X %",   text: "Wächst mit der Rundengröße mit." },
  { key: "mitte",            label: "Das Mittelfeld",       text: "Wer weder vorn noch hinten steht." },
  { key: "los",              label: "Ausgeloste",           text: "n Ausgeloste — nachprüfbar, nicht heimlich." },
  { key: "paarung",          label: "Paarweise",            text: "Zwei werden gegeneinander gesetzt." },
  { key: "aufsteiger",       label: "Die Kletterer",        text: "Wer die meisten Plätze gutgemacht hat." },
  { key: "absteiger",        label: "Die Absacker",         text: "Wer am meisten verloren hat." },
  { key: "titelverteidiger", label: "Der Letzte Sieger",    text: "Wer den vorigen Spieltag gewonnen hat." },
  { key: "nachbarn",         label: "Deine Nachbarn",       text: "Die direkt über und unter dir." },
  { key: "gruppe",           label: "Eine Gruppe",          text: "Eine Division oder ein Grüppchen." },
  { key: "neu",              label: "Neulinge",             text: "Wer erst seit n Spieltagen dabei ist." },
  { key: "inaktiv",          label: "Eingeschlafene",       text: "Wer n Spieltage nicht getippt hat." },
  { key: "freiwillig",       label: "Freiwillige",          text: "Wer sich meldet." },
];

const MODUS_KEYS = new Set(MODI.map((m) => m.key));

// ── Die Ordnung, nach der ausgewählt wird ───────────────────
// ⚠️ Sie MUSS der sichtbaren Tabelle entsprechen. Sortierte dieses Modul
// anders als das Leaderboard, träfe „die letzten fünf" andere Leute als die,
// die der Spieler unten in der Tabelle stehen sieht — und niemand könnte
// erklären, warum. Deshalb dieselbe Reihenfolge wie `scoreLeaderboard`:
// Punkte absteigend, dann Name. Die Nutzer-Id kommt als LETZTER Schlüssel
// dazu, damit zwei Gleichnamige nicht je nach Eingabereihenfolge tauschen —
// eine Auswahl, die sich bei gleicher Eingabe ändert, ist keine.
function geordnet(stand) {
  return [...(stand || [])]
    .filter((z) => z && z.userId != null)
    .sort((a, b) =>
      (b.total ?? 0) - (a.total ?? 0)
      || String(a.name ?? "").localeCompare(String(b.name ?? ""))
      || String(a.userId).localeCompare(String(b.userId))
    );
}

// Welcher Stand gilt? „Der Beste DES SPIELTAGS" und „der TABELLENFÜHRER" sind
// gegensätzliche Anreize: der eine ist ein rotierender Preis, der auch von
// hinten erreichbar ist, der andere verstärkt einen bestehenden Vorsprung.
// Deshalb ist `bezug` ein Pflichtfeld und kein Beiwerk.
//
// 🔴 `zeitraum` ist die dritte Antwort und war bis 07.08.2026 die Lücke, an der
// die „Dreier-Wertung" aus der Roadmap hängen blieb („der Beste ÜBER DIE DREI
// Spieltage"). Sie ist weder das eine noch das andere: über einen Block
// gerechnet bleibt der Preis rotierend genug, um von hinten erreichbar zu
// sein, verlangt aber Konstanz statt eines Glückstags.
//
// ⚠️ Ohne eigenen Wert ginge es nicht. Als `spieltag` durchgereicht wäre am
// Aufrufer nicht mehr erkennbar, ob der Stand einen Tag oder drei umfasst —
// und beide Male stünde „am Spieltag" in der Oberfläche. Der Unterschied ist
// ein anderer Anreiz, nicht eine andere Zahl.
function standFuer(bezug, { stand = [], spieltagStand = [], zeitraumStand = [] } = {}) {
  if (bezug === "spieltag") return spieltagStand;
  if (bezug === "zeitraum") return zeitraumStand;
  return stand;
}

// Wie viele Plätze bei einem Prozentsatz? Mindestens einer, sobald überhaupt
// ein Anteil eingestellt ist: „das untere Fünftel" darf in einer Runde mit
// sieben Leuten nicht auf null Personen zusammenfallen. Eine Regel, die
// niemanden trifft, sieht für den Admin genauso aus wie eine, die wirkt —
// das ist die Leerlauf-Falle.
function ausProzent(prozent, anzahl) {
  const p = Number(prozent);
  if (!(p > 0) || anzahl < 1) return 0;
  return Math.min(anzahl, Math.max(1, Math.round((p / 100) * anzahl)));
}

function ids(liste) {
  return liste.map((z) => z.userId);
}

// Deterministisch mischen: jeder Eintrag bekommt einen Wert aus `seeded`, dann
// wird danach sortiert. Gleiche Runde + gleicher Spieltag = gleiche Reihenfolge.
function gemischt(liste, seed) {
  return [...liste]
    .map((z) => ({ z, r: seeded(`${seed}|${z.userId}`) }))
    .sort((a, b) => a.r - b.r || String(a.z.userId).localeCompare(String(b.z.userId)))
    .map((x) => x.z);
}

// Rangveränderung gegenüber dem Stand VOR diesem Spieltag. Positiv = Plätze
// gutgemacht. Wer vorher nicht dabei war, hat keine Veränderung — sonst wäre
// jeder Neuling automatisch der größte Kletterer.
function rangwechsel(stand, vorstand) {
  const vorher = new Map(geordnet(vorstand).map((z, i) => [z.userId, i]));
  return geordnet(stand)
    .map((z, i) => ({ userId: z.userId, delta: vorher.has(z.userId) ? vorher.get(z.userId) - i : null }))
    .filter((x) => x.delta != null);
}

// ── Die Auswahl ─────────────────────────────────────────────
// Gibt die Nutzer-Ids zurück, die eine Regel an diesem Spieltag trifft.
// Unbekannter Modus oder fehlende Daten → leere Liste. Bewusst still: eine
// Regel, deren Daten fehlen, darf nicht raten, wen sie meint.
export function waehleBetroffene({
  modus,
  bezug = "gesamt",
  n = 1,
  prozent = 20,
  ende = "unten",          // "oben" | "unten" — für rang/perzentil
  seit = 3,                // für neu/inaktiv
  gruppe = null,
  fuer = null,             // für nachbarn: aus wessen Sicht
  mitglieder = [],
  stand = [],
  spieltagStand = [],
  // Der Stand über einen BLOCK von Spieltagen — für `bezug: "zeitraum"`.
  // Der Aufrufer summiert ihn, weil nur er weiß, welche Spieltage zum Block
  // gehören (Runden-Spieltage, nicht Liga-Spieltage).
  zeitraumStand = [],
  vorstand = [],
  betroffener = null,
  freiwillige = [],
  gruppen = {},            // { userId: gruppenId }
  beitritt = {},           // { userId: rundenSpieltag }
  letzterTipp = {},        // { userId: rundenSpieltag }
  rundenSpieltag = 1,
  rundenId = "",
} = {}) {
  if (!MODUS_KEYS.has(modus)) return [];
  const tabelle = geordnet(standFuer(bezug, { stand, spieltagStand, zeitraumStand }));
  const alle = mitglieder.length ? mitglieder.map((m) => (m?.userId ?? m)) : ids(tabelle);
  const anzahl = Math.max(0, Math.floor(Number(n) || 0));
  const seed = `${rundenId}|${rundenSpieltag}|${modus}`;

  switch (modus) {
    // `selbst` liefert dieselbe Liste wie `alle`. Der Unterschied liegt in der
    // WIRKUNG („jeder entscheidet selbst"), nicht in der Auswahl — die beiden
    // trotzdem getrennt zu führen, hält die Oberfläche verständlich.
    case "alle":
    case "selbst":
      return [...alle];

    case "betroffener":
      return betroffener ? [betroffener] : [];

    case "koenig":
      return tabelle.length ? [tabelle[0].userId] : [];

    case "verfolger":
      return ids(tabelle.slice(1, 1 + anzahl));

    case "rang":
      return ende === "oben"
        ? ids(tabelle.slice(0, anzahl))
        : ids(tabelle.slice(Math.max(0, tabelle.length - anzahl)));

    case "perzentil": {
      const k = ausProzent(prozent, tabelle.length);
      return ende === "oben" ? ids(tabelle.slice(0, k)) : ids(tabelle.slice(tabelle.length - k));
    }

    // Das Mittelfeld ist definiert als „weder im oberen noch im unteren
    // Anteil" — nicht als eigener Prozentsatz. Sonst könnten sich die drei
    // Bereiche überlappen oder eine Lücke lassen.
    case "mitte": {
      const k = ausProzent(prozent, tabelle.length);
      return ids(tabelle.slice(k, Math.max(k, tabelle.length - k)));
    }

    case "los":
      return ids(gemischt(tabelle.length ? tabelle : alle.map((userId) => ({ userId })), seed)
        .slice(0, Math.min(anzahl, alle.length)));

    // Wer keinen Partner abbekommt, fällt heraus statt allein dazustehen. Die
    // Paare selbst liefert `paarungen()` — diese Funktion hält ihren Vertrag
    // „Liste von Ids" ein, statt für einen Modus eine andere Form zu liefern.
    case "paarung":
      return paarungen({ mitglieder: alle, rundenSpieltag, rundenId }).flat();

    case "aufsteiger":
      return rangwechsel(stand, vorstand)
        .filter((x) => x.delta > 0)
        .sort((a, b) => b.delta - a.delta || String(a.userId).localeCompare(String(b.userId)))
        .slice(0, anzahl).map((x) => x.userId);

    case "absteiger":
      return rangwechsel(stand, vorstand)
        .filter((x) => x.delta < 0)
        .sort((a, b) => a.delta - b.delta || String(a.userId).localeCompare(String(b.userId)))
        .slice(0, anzahl).map((x) => x.userId);

    // Der Sieger des VORIGEN Spieltags — deshalb `spieltagStand`, nicht die
    // Tabelle. Mit `bezug: gesamt` wäre es schlicht der Führende, und dafür
    // gibt es `koenig`.
    case "titelverteidiger": {
      const t = geordnet(spieltagStand);
      return t.length ? [t[0].userId] : [];
    }

    // Persönlich: jeder sieht andere Nachbarn. Ohne `fuer` gibt es niemanden,
    // aus dessen Sicht gerechnet werden könnte.
    case "nachbarn": {
      if (!fuer) return [];
      const i = tabelle.findIndex((z) => z.userId === fuer);
      if (i < 0) return [];
      return ids([tabelle[i - 1], tabelle[i + 1]].filter(Boolean));
    }

    case "gruppe":
      return gruppe == null ? [] : alle.filter((id) => gruppen[id] === gruppe);

    // „Seit n Spieltagen dabei" — ohne Beitritts-Eintrag gilt jemand als von
    // Anfang an dabei, nicht als neu. Ein fehlender Wert darf niemanden
    // versehentlich begünstigen.
    case "neu":
      return alle.filter((id) => beitritt[id] != null && rundenSpieltag - beitritt[id] < seit);

    case "inaktiv":
      return alle.filter((id) => (rundenSpieltag - (letzterTipp[id] ?? 0)) >= seit);

    case "freiwillig":
      return alle.filter((id) => freiwillige.includes(id));

    default:
      return [];
  }
}

// ── Paare ───────────────────────────────────────────────────
// Eigene Funktion, weil eine Paarung mehr Information trägt als eine Liste:
// WER gegen WEN. Deterministisch gemischt, dann benachbart gepaart. Bei
// ungerader Anzahl bleibt eine Person übrig und wird NICHT gepaart — lieber
// jemand ohne Duell als ein Duell gegen sich selbst.
export function paarungen({ mitglieder = [], rundenSpieltag = 1, rundenId = "" } = {}) {
  const liste = gemischt(mitglieder.map((m) => ({ userId: m?.userId ?? m })),
    `${rundenId}|${rundenSpieltag}|paarung`).map((z) => z.userId);
  const out = [];
  for (let i = 0; i + 1 < liste.length; i += 2) out.push([liste[i], liste[i + 1]]);
  return out;
}

// Wie viele trifft es voraussichtlich? Speist die Live-Vorschau der
// Spielerstellung — „die besten 5" klingt nach einer Kleinigkeit und ist in
// einer Runde mit zwölf Leuten fast die halbe Gruppe. Ohne diese Zahl stellt
// ein Admin etwas ein und bekommt etwas anderes; dieselbe Falle wie bei den
// Wettbewerbs-Gewichten, wo `anteile()` genau deshalb eingebaut wurde.
export function trefferAnteil({ modus, n = 1, prozent = 20, seit = 3, mitglieder = 12 } = {}) {
  const g = Math.max(1, mitglieder);
  const anteil = {
    alle: 1, selbst: 1,
    betroffener: 1 / g,
    koenig: 1 / g,
    titelverteidiger: 1 / g,
    verfolger: Math.min(g, n) / g,
    rang: Math.min(g, n) / g,
    perzentil: ausProzent(prozent, g) / g,
    mitte: Math.max(0, g - 2 * ausProzent(prozent, g)) / g,
    los: Math.min(g, n) / g,
    paarung: (g - (g % 2)) / g,
    aufsteiger: Math.min(g, n) / g,
    absteiger: Math.min(g, n) / g,
    nachbarn: Math.min(2, g - 1) / g,
  }[modus];
  // Für `gruppe`, `neu`, `inaktiv` und `freiwillig` hängt es an Daten, die
  // beim Einstellen noch niemand hat. Dann lieber nichts sagen als raten.
  return anteil == null ? null : +anteil.toFixed(4);
}
