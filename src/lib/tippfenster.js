// ============================================================
//  TIPP-FENSTER — wann ein Spiel überhaupt tippbar ist
//
//  Die Spielwahl zeigte bisher den ganzen Spielplan. Mit zwei Wettbewerben
//  sind das über 450 Spiele — der Spieler soll aber sehen, was ANSTEHT und
//  jetzt tippbar ist, nicht die komplette Saison.
//
//  ── Warum der Vorlauf einstellbar ist ──
//  Quoten werden nicht für die ganze Saison veröffentlicht, sondern erst
//  einige Tage vor Anpfiff. Wie weit im Voraus eine Runde tippt, ist deshalb
//  eine Admin-Entscheidung: manche wollen den ganzen Spieltag am Montag
//  freigeben, andere erst 48 Stunden vorher, wenn Aufstellungen absehbar sind.
//
//  ── Zwei Kanten, die zusammengehören ──
//  Das Fenster ÖFFNET `vorlaufStunden` vor Anpfiff und SCHLIESST beim Anpfiff.
//  Die schließende Kante gab es schon (`gesperrt` in der Tippabgabe, gleiche
//  Regel wie beim Quoten-Snapshot); hier kommt die öffnende dazu. Beide
//  zusammen sind das Fenster, in dem ein Tipp abgegeben werden kann — und in
//  dem die Quote gilt, die zum Öffnen eingefroren wurde.
//
//  ── 🔴 Die DRITTE Kante: gemeinsamer Tippschluss (23.08.2026) ──
//  Andi: „erstmal tippt jeder, und dann einen Tag später, wo jeder getippt
//  hat, werden die Joker auf die anderen gewählt."
//
//  Dafür genügen zwei Kanten nicht. Solange bis zum Anpfiff getippt werden
//  darf, gibt es keinen Moment, an dem die Tipps aller feststehen — und ohne
//  den kann niemand einen Fremdjoker auf einen fremden Tipp setzen.
//  `schlussStunden` zieht deshalb einen GEMEINSAMEN Schluss vor den ersten
//  Anpfiff des Spieltags. Was danach bis zum Anpfiff liegt, ist die zweite
//  Phase (`design/joker-sondermenue.md`, „Zwei-Phasen-Spieltag").
//
//  ⚠️ `schlussStunden: 0` ist die Vorgabe und heißt: alles wie bisher,
//  geschlossen wird beim eigenen Anpfiff. Kein vorhandener Creator-Code
//  ändert dadurch sein Verhalten.
//
//  ⚠️ Ein früher Schluss ist auch OHNE Fremdjoker sinnvoll („bei uns ist
//  Freitagmittag Schluss, dann kann keiner mehr die Aufstellungen abwarten").
//  Er läuft also nicht ins Leere, bis die Joker gebaut sind.
//
//  ── Im Zweifel zu ──
//  Ein Spiel ohne verwertbaren Anpfiff gilt als NICHT tippbar. Ein
//  versehentlich offenes Spiel lässt sich nicht zurücknehmen, ein
//  versehentlich gesperrtes schon — dieselbe Vorsichtsregel wie bei den
//  Freischalt-Fenstern der Saison-Wetten.
//
//  Reine Funktionen, UI-frei. `jetzt` ist immer ein Parameter, damit die
//  Logik testbar bleibt und nicht heimlich von der Systemuhr abhängt.
// ============================================================

export const TIPPFENSTER_LIMITS = {
  // 1 Stunde bis 30 Tage. Der Standard von 7 Tagen deckt einen ganzen
  // Spieltag ab, ohne die halbe Saison auf einmal zu öffnen.
  vorlaufStunden: { min: 1, max: 720, step: 1 },
  // 0 = kein gemeinsamer Schluss (Vorgabe). Nach oben eine Woche: mehr wäre
  // ein Tippschluss VOR dem Öffnen des Fensters — also gar keine Runde.
  schlussStunden: { min: 0, max: 168, step: 1 },
};

// ── WOVON wird der Vorlauf gerechnet? ───────────────────────
// Das ist die Frage, die der reine Stunden-Regler offen ließ. Ein Spieltag
// zieht sich über Tage; zählt der Vorlauf je Spiel, geht das Sonntagsspiel
// zwei Tage später auf als das Freitagsspiel. Für viele Runden ist genau das
// falsch — sie wollen den Spieltag als BLOCK freigeben.
//
//  `spiel`    — jedes Spiel öffnet einzeln, `vorlaufStunden` vor SEINEM Anpfiff.
//               Die Quoten sind dann überall gleich frisch.
//  `spieltag` — der ganze Spieltag öffnet gemeinsam, `vorlaufStunden` vor dem
//               ERSTEN Anpfiff des Spieltags. Alle Spiele sind ab demselben
//               Moment tippbar, auch die vom Sonntag.
//
// Geschlossen wird IN BEIDEN FÄLLEN beim eigenen Anpfiff — daran ändert der
// Anker nichts. Sonst könnte man ein bereits laufendes Spiel noch tippen.
export const ANKER = [
  {
    key: "spiel", label: "Vor jedem einzelnen Spiel",
    erklaerung: "Jedes Spiel wird für sich freigegeben. Das Sonntagsspiel geht später auf als das Freitagsspiel — dafür sind die Quoten überall gleich frisch.",
  },
  {
    key: "spieltag", label: "Vor dem Beginn des Spieltags",
    erklaerung: "Der ganze Spieltag geht auf einmal auf, gerechnet ab dem ersten Anpfiff. Auch das Sonntagsspiel ist dann schon tippbar, obwohl es noch weit weg ist.",
  },
];

export const DEFAULT_TIPPFENSTER = { vorlaufStunden: 168, anker: "spiel", schlussStunden: 0 };

// Gängige Tippschlüsse. Die 24 Stunden stehen als Vorauswahl vorn, weil das
// Andis Beispiel ist („einen Tag später") — und weil ein Tag der kürzeste
// Abstand ist, in dem eine Runde die zweite Phase realistisch schafft.
export const SCHLUSS_STUFEN = [
  { stunden: 0, label: "beim Anpfiff", hint: "Wie bisher: jedes Spiel schließt, wenn es angepfiffen wird." },
  { stunden: 12, label: "12 Std. vorher", hint: "Knapp. Für Runden, die abends noch schnell zusammenkommen." },
  { stunden: 24, label: "1 Tag vorher", hint: "Andis Vorschlag für die Fremdjoker: einen Tag Zeit, um zu reagieren." },
  { stunden: 48, label: "2 Tage vorher", hint: "Entspannt — aber die Aufstellungen sind dann noch weit weg." },
];

// Gängige Vorläufe als Vorauswahl — Stunden sind ein unhandliches Maß, wenn
// man eigentlich „ein Spieltag" oder „zwei Tage" meint.
export const VORLAUF_STUFEN = [
  { stunden: 24, label: "1 Tag", hint: "Kurzfristig: Aufstellungen sind fast durch." },
  { stunden: 48, label: "2 Tage", hint: "Genug Zeit zum Nachdenken, ohne dass es abstrakt wird." },
  { stunden: 168, label: "1 Woche", hint: "Der ganze Spieltag steht offen. Standard." },
  { stunden: 336, label: "2 Wochen", hint: "Sehr früh — Quoten sind dann oft noch grob." },
];

export function sanitizeTippfenster(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const L = TIPPFENSTER_LIMITS.vorlaufStunden;
  const n = Number(p.vorlaufStunden);
  return {
    vorlaufStunden: Number.isFinite(n)
      ? Math.min(L.max, Math.max(L.min, Math.round(n)))
      : DEFAULT_TIPPFENSTER.vorlaufStunden,
    // Ein unbekannter Anker fiele sonst still auf „Spieltag" zurück und würde
    // die halbe Saison öffnen. Im Zweifel das engere Verhalten.
    anker: ANKER.some((a) => a.key === p.anker) ? p.anker : DEFAULT_TIPPFENSTER.anker,
    schlussStunden: schlussWert(p.schlussStunden),
  };
}

function schlussWert(v) {
  const L = TIPPFENSTER_LIMITS.schlussStunden;
  const n = Number(v);
  if (!Number.isFinite(n)) return DEFAULT_TIPPFENSTER.schlussStunden;
  return Math.min(L.max, Math.max(L.min, Math.round(n)));
}

// ── Was der gemeinsame Schluss verlangt ─────────────────────
// 🔴 Andi: „Das muss halt vom Admin klar so eingestellt werden, weil sonst
// geht's nicht auf." Genau das prüft diese Funktion — und sie KORRIGIERT
// nicht still, sondern meldet: eine stille Korrektur wäre eine dritte
// Wahrheit über das Fenster, und der Admin wüsste nicht, dass seine Runde
// anders läuft, als er sie eingestellt hat.
//
// Der Konflikt ist nicht theoretisch: mit Anker `spiel` und einem Vorlauf,
// der kürzer ist als der Abstand zwischen erstem und letztem Anpfiff, geht
// das Sonntagsspiel erst auf, NACHDEM der gemeinsame Schluss schon vorbei
// ist. Es wäre nie tippbar — und niemand sähe warum.
export function fensterKonflikte(rules) {
  const f = sanitizeTippfenster(rules?.tippfenster);
  const raus = [];
  if (f.schlussStunden > 0 && f.anker !== "spieltag") {
    raus.push({
      key: "ankerFehlt",
      text: "Ein gemeinsamer Tippschluss braucht den Anker „vor dem Beginn des Spieltags“. "
        + "Sonst geht ein spätes Spiel erst auf, wenn der Schluss längst vorbei ist — es wäre nie tippbar.",
    });
  }
  if (f.schlussStunden > 0 && f.schlussStunden >= f.vorlaufStunden) {
    raus.push({
      key: "schlussVorOeffnung",
      text: `Der Tippschluss (${f.schlussStunden} Std. vorher) liegt vor der Öffnung `
        + `(${f.vorlaufStunden} Std. vorher). So bleibt kein Moment übrig, in dem getippt werden kann.`,
    });
  }
  return raus;
}

// Der erste Anpfiff JE SPIELTAG — die Bezugsgröße für den Anker `spieltag`.
// Rückgabe: Map spieltagKey → Zeitstempel. Einmal je Liste rechnen und
// durchreichen, statt sie für jedes Spiel neu zu ermitteln.
export function spieltagStarts(matches = []) {
  const starts = new Map();
  for (const m of matches) {
    const t = anpfiff(m);
    if (t === null) continue;
    const key = spieltagKey(m);
    if (!starts.has(key) || t < starts.get(key)) starts.set(key, t);
  }
  return starts;
}

import { spieltagKey } from "./spieltag";

const anpfiff = (match) => {
  const t = new Date(match?.kickoff ?? match?.snapshot?.kickoff ?? NaN).getTime();
  return Number.isFinite(t) ? t : null;
};

// Wann öffnet das Fenster dieses Spiels? null, wenn kein Anpfiff bekannt ist.
// `starts` ist die Map aus `spieltagStarts()` — nur für den Anker `spieltag`
// nötig. Fehlt sie, wird je Spiel gerechnet; dadurch bleiben Altaufrufer und
// Tests ohne Spielplan-Kontext gültig.
export function oeffnetAm(match, rules, starts = null) {
  const start = anpfiff(match);
  if (start === null) return null;
  const { vorlaufStunden, anker } = sanitizeTippfenster(rules?.tippfenster);
  const bezug = (anker === "spieltag" && starts)
    ? (starts.get(spieltagKey(match)) ?? start)
    : start;
  return bezug - vorlaufStunden * 3600_000;
}

// Wann schließt das Fenster dieses Spiels? Ohne gemeinsamen Schluss ist das
// der eigene Anpfiff — die Regel, die es immer gab.
//
// ⚠️ `Math.min` mit dem eigenen Anpfiff ist keine Vorsicht, sondern die
// unverrückbare Grenze: ein Freitagsspiel darf nicht bis zum gemeinsamen
// Schluss offen bleiben, wenn dieser NACH seinem Anpfiff läge.
export function schliesstAm(match, rules, starts = null) {
  const start = anpfiff(match);
  if (start === null) return null;
  const { schlussStunden } = sanitizeTippfenster(rules?.tippfenster);
  if (schlussStunden <= 0) return start;
  const spieltagStart = starts ? (starts.get(spieltagKey(match)) ?? start) : start;
  return Math.min(start, spieltagStart - schlussStunden * 3600_000);
}

// Der Zustand eines Spiels — die eine Funktion, aus der die Oberfläche alles
// ableitet. `zustand` ist bewusst mehrwertig statt eines Booleans: „noch
// nicht", „Schluss" und „vorbei" sind für den Spieler drei völlig
// verschiedene Nachrichten.
export function tippStatus(match, rules, jetzt = Date.now(), starts = null) {
  const start = anpfiff(match);
  if (start === null) {
    return { offen: false, zustand: "unbekannt", oeffnetAm: null, schliesstAm: null, anpfiff: null, text: "Termin offen" };
  }
  const oeffnet = oeffnetAm(match, rules, starts);
  const schliesst = schliesstAm(match, rules, starts);
  if (jetzt >= start) {
    return { offen: false, zustand: "vorbei", oeffnetAm: oeffnet, schliesstAm: schliesst, anpfiff: start, text: "angepfiffen" };
  }
  if (jetzt < oeffnet) {
    return {
      offen: false, zustand: "zu", oeffnetAm: oeffnet, schliesstAm: schliesst, anpfiff: start,
      text: `tippbar ab ${formatZeitpunkt(oeffnet)}`,
    };
  }
  // 🔴 Der neue Zustand: Tippschluss vorbei, Anpfiff noch nicht. Das ist die
  // zweite Phase — in ihr stehen die Tipps fest, das Spiel läuft aber noch
  // nicht. Ein eigener Zustand und kein „vorbei", weil der Spieler hier etwas
  // ganz anderes erfährt: nicht „zu spät", sondern „jetzt sind die anderen
  // dran".
  if (jetzt >= schliesst) {
    return {
      offen: false, zustand: "frist", oeffnetAm: oeffnet, schliesstAm: schliesst, anpfiff: start,
      text: `Tippschluss vorbei · Anpfiff in ${formatDauer(start - jetzt)}`,
    };
  }
  return {
    offen: true, zustand: "offen", oeffnetAm: oeffnet, schliesstAm: schliesst, anpfiff: start,
    text: `noch ${formatDauer(schliesst - jetzt)}`,
  };
}

export function istTippbar(match, rules, jetzt = Date.now(), starts = null) {
  return tippStatus(match, rules, jetzt, starts).offen;
}

// Die Spiele, die JETZT tippbar sind — nach Anpfiff sortiert, das dringendste
// zuerst. Genau die Liste, die ein Spieler beim Öffnen der App sehen will.
export function tippbareSpiele(matches = [], rules, jetzt = Date.now()) {
  const starts = spieltagStarts(matches);
  return matches
    .filter((m) => istTippbar(m, rules, jetzt, starts))
    .sort((a, b) => (anpfiff(a) ?? 0) - (anpfiff(b) ?? 0));
}

// Was als Nächstes aufgeht — damit die Oberfläche bei leerer Liste nicht
// stumm bleibt, sondern sagen kann, wann es weitergeht.
export function naechsteOeffnung(matches = [], rules, jetzt = Date.now()) {
  const starts = spieltagStarts(matches);
  let bestes = null;
  for (const m of matches) {
    const s = tippStatus(m, rules, jetzt, starts);
    if (s.zustand !== "zu" || s.oeffnetAm === null) continue;
    if (!bestes || s.oeffnetAm < bestes.oeffnetAm) bestes = { match: m, oeffnetAm: s.oeffnetAm };
  }
  return bestes;
}

// Zählt die Spiele nach Zustand — für eine ehrliche Übersicht („12 tippbar,
// 438 kommen noch"), statt den Rest wortlos wegzulassen.
export function uebersicht(matches = [], rules, jetzt = Date.now()) {
  const starts = spieltagStarts(matches);
  // ⚠️ `frist` MUSS hier stehen. Ohne den Schlüssel wäre `zaehler[...] += 1`
  // ein NaN, und die Übersicht zeigte für eine Runde mit gemeinsamem
  // Tippschluss lautlos Unsinn.
  const zaehler = { offen: 0, zu: 0, frist: 0, vorbei: 0, unbekannt: 0 };
  for (const m of matches) zaehler[tippStatus(m, rules, jetzt, starts).zustand] += 1;
  return zaehler;
}

// ── Formatierung ────────────────────────────────────────────
// Absichtlich hier und nicht in der Komponente: die Texte gehören zur Aussage
// („noch 3 Std."), und so sind sie mitgetestet.

export function formatDauer(ms) {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} Min.`;
  const std = Math.round(min / 60);
  if (std < 48) return `${std} Std.`;
  return `${Math.round(std / 24)} Tage`;
}

export function formatZeitpunkt(ts) {
  const d = new Date(ts);
  const tag = d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
  const zeit = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${tag}, ${zeit}`;
}

// Die Dauer in Klartext — eine freie Stundenzahl soll nicht als „72 Std."
// dastehen, wenn „3 Tage" gemeint ist.
export function dauerText(stunden) {
  const stufe = VORLAUF_STUFEN.find((s) => s.stunden === stunden);
  if (stufe) return stufe.label;
  if (stunden % 24 === 0) {
    const tage = stunden / 24;
    return tage === 1 ? "1 Tag" : `${tage} Tage`;
  }
  return stunden === 1 ? "1 Stunde" : `${stunden} Stunden`;
}

export function beschreibeTippfenster(rules) {
  const { vorlaufStunden, anker, schlussStunden } = sanitizeTippfenster(rules?.tippfenster);
  const dauer = dauerText(vorlaufStunden);
  const auf = anker === "spieltag"
    ? `Der ganze Spieltag wird ${dauer} vor dem ersten Anpfiff tippbar.`
    : `Jedes Spiel wird ${dauer} vor seinem Anpfiff tippbar`;
  if (schlussStunden > 0) {
    return `${anker === "spieltag" ? auf : auf + "."} Getippt wird bis ${dauerText(schlussStunden)} `
      + "vor dem ersten Anpfiff — für alle gleichzeitig. Danach stehen die Tipps fest.";
  }
  return anker === "spieltag"
    ? `${auf} Jedes Spiel schließt bei seinem eigenen Anpfiff.`
    : `${auf} und schließt beim Anpfiff.`;
}

// Die AUSFÜHRLICHE Erklärung — drei Zeilen, jede beantwortet genau eine Frage.
// Bewusst als Liste statt als Fließtext: der Unterschied zwischen „öffnet" und
// „schließt" ist genau der Punkt, an dem der Regler bisher missverstanden wurde.
// Rückgabe: [{ frage, antwort }]
export function erklaereTippfenster(rules) {
  const { vorlaufStunden, anker, schlussStunden } = sanitizeTippfenster(rules?.tippfenster);
  const dauer = dauerText(vorlaufStunden);
  const proSpiel = anker === "spiel";

  return [
    {
      frage: "Ab wann kann getippt werden?",
      antwort: proSpiel
        ? `${dauer} vor dem Anpfiff des jeweiligen Spiels.`
        : `${dauer} vor dem ERSTEN Anpfiff des Spieltags — für alle Spiele des Spieltags gleichzeitig.`,
    },
    {
      frage: "Bis wann kann getippt werden?",
      antwort: schlussStunden > 0
        ? `Bis ${dauerText(schlussStunden)} vor dem ersten Anpfiff des Spieltags — für alle Spiele gleichzeitig, auch für die vom Sonntag.`
        : "Bis zum Anpfiff des jeweiligen Spiels. Danach ist es gesperrt, auch wenn andere Spiele des Spieltags noch laufen.",
    },
    ...(schlussStunden > 0 ? [{
      frage: "Was passiert zwischen Tippschluss und Anpfiff?",
      antwort: "Die Tipps aller stehen fest und sind sichtbar. Diese Zeit ist die zweite Phase "
        + "des Spieltags — dort greifen später die Fremdjoker. Wer nicht getippt hat, bekommt "
        + "seinen Auto-Tipp.",
    }] : []),
    {
      frage: proSpiel
        ? "Kann ich das Sonntagsspiel schon am Freitag tippen?"
        : "Kann ich das Sonntagsspiel schon am Freitag tippen?",
      antwort: proSpiel
        ? `Nur, wenn der Anpfiff weniger als ${dauer} entfernt ist. Bei kurzem Vorlauf geht das Sonntagsspiel später auf als das Freitagsspiel.`
        : "Ja. Der Spieltag geht als Block auf, also sind alle Partien ab demselben Moment tippbar.",
    },
  ];
}
