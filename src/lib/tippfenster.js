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

export const DEFAULT_TIPPFENSTER = { vorlaufStunden: 168, anker: "spiel" };

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
  };
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

// Der Zustand eines Spiels — die eine Funktion, aus der die Oberfläche alles
// ableitet. `zustand` ist bewusst dreiwertig statt eines Booleans: „noch nicht"
// und „vorbei" sind für den Spieler zwei völlig verschiedene Nachrichten.
export function tippStatus(match, rules, jetzt = Date.now(), starts = null) {
  const start = anpfiff(match);
  if (start === null) {
    return { offen: false, zustand: "unbekannt", oeffnetAm: null, anpfiff: null, text: "Termin offen" };
  }
  // ⚠️ Geschlossen wird IMMER beim eigenen Anpfiff, egal welcher Anker gilt —
  // sonst ließe sich ein bereits laufendes Spiel noch tippen.
  const oeffnet = oeffnetAm(match, rules, starts);
  if (jetzt >= start) {
    return { offen: false, zustand: "vorbei", oeffnetAm: oeffnet, anpfiff: start, text: "angepfiffen" };
  }
  if (jetzt < oeffnet) {
    return {
      offen: false, zustand: "zu", oeffnetAm: oeffnet, anpfiff: start,
      text: `tippbar ab ${formatZeitpunkt(oeffnet)}`,
    };
  }
  return {
    offen: true, zustand: "offen", oeffnetAm: oeffnet, anpfiff: start,
    text: `noch ${formatDauer(start - jetzt)}`,
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
  const zaehler = { offen: 0, zu: 0, vorbei: 0, unbekannt: 0 };
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
  const { vorlaufStunden, anker } = sanitizeTippfenster(rules?.tippfenster);
  const dauer = dauerText(vorlaufStunden);
  return anker === "spieltag"
    ? `Der ganze Spieltag wird ${dauer} vor dem ersten Anpfiff tippbar. Jedes Spiel schließt bei seinem eigenen Anpfiff.`
    : `Jedes Spiel wird ${dauer} vor seinem Anpfiff tippbar und schließt beim Anpfiff.`;
}

// Die AUSFÜHRLICHE Erklärung — drei Zeilen, jede beantwortet genau eine Frage.
// Bewusst als Liste statt als Fließtext: der Unterschied zwischen „öffnet" und
// „schließt" ist genau der Punkt, an dem der Regler bisher missverstanden wurde.
// Rückgabe: [{ frage, antwort }]
export function erklaereTippfenster(rules) {
  const { vorlaufStunden, anker } = sanitizeTippfenster(rules?.tippfenster);
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
      antwort: "Bis zum Anpfiff des jeweiligen Spiels. Danach ist es gesperrt, auch wenn andere Spiele des Spieltags noch laufen.",
    },
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
