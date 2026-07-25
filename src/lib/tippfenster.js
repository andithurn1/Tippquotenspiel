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

export const DEFAULT_TIPPFENSTER = { vorlaufStunden: 168 };

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
  };
}

const anpfiff = (match) => {
  const t = new Date(match?.kickoff ?? match?.snapshot?.kickoff ?? NaN).getTime();
  return Number.isFinite(t) ? t : null;
};

// Wann öffnet das Fenster dieses Spiels? null, wenn kein Anpfiff bekannt ist.
export function oeffnetAm(match, rules) {
  const start = anpfiff(match);
  if (start === null) return null;
  const { vorlaufStunden } = sanitizeTippfenster(rules?.tippfenster);
  return start - vorlaufStunden * 3600_000;
}

// Der Zustand eines Spiels — die eine Funktion, aus der die Oberfläche alles
// ableitet. `zustand` ist bewusst dreiwertig statt eines Booleans: „noch nicht"
// und „vorbei" sind für den Spieler zwei völlig verschiedene Nachrichten.
export function tippStatus(match, rules, jetzt = Date.now()) {
  const start = anpfiff(match);
  if (start === null) {
    return { offen: false, zustand: "unbekannt", oeffnetAm: null, anpfiff: null, text: "Termin offen" };
  }
  const oeffnet = oeffnetAm(match, rules);
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

export function istTippbar(match, rules, jetzt = Date.now()) {
  return tippStatus(match, rules, jetzt).offen;
}

// Die Spiele, die JETZT tippbar sind — nach Anpfiff sortiert, das dringendste
// zuerst. Genau die Liste, die ein Spieler beim Öffnen der App sehen will.
export function tippbareSpiele(matches = [], rules, jetzt = Date.now()) {
  return matches
    .filter((m) => istTippbar(m, rules, jetzt))
    .sort((a, b) => (anpfiff(a) ?? 0) - (anpfiff(b) ?? 0));
}

// Was als Nächstes aufgeht — damit die Oberfläche bei leerer Liste nicht
// stumm bleibt, sondern sagen kann, wann es weitergeht.
export function naechsteOeffnung(matches = [], rules, jetzt = Date.now()) {
  let bestes = null;
  for (const m of matches) {
    const s = tippStatus(m, rules, jetzt);
    if (s.zustand !== "zu" || s.oeffnetAm === null) continue;
    if (!bestes || s.oeffnetAm < bestes.oeffnetAm) bestes = { match: m, oeffnetAm: s.oeffnetAm };
  }
  return bestes;
}

// Zählt die Spiele nach Zustand — für eine ehrliche Übersicht („12 tippbar,
// 438 kommen noch"), statt den Rest wortlos wegzulassen.
export function uebersicht(matches = [], rules, jetzt = Date.now()) {
  const zaehler = { offen: 0, zu: 0, vorbei: 0, unbekannt: 0 };
  for (const m of matches) zaehler[tippStatus(m, rules, jetzt).zustand] += 1;
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

export function beschreibeTippfenster(rules) {
  const { vorlaufStunden } = sanitizeTippfenster(rules?.tippfenster);
  const stufe = VORLAUF_STUFEN.find((s) => s.stunden === vorlaufStunden);
  const dauer = stufe ? stufe.label : formatDauer(vorlaufStunden * 3600_000);
  return `Spiele werden ${dauer} vor Anpfiff tippbar und schließen beim Anpfiff.`;
}
