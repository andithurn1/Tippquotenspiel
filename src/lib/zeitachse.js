// ============================================================
//  ZEITACHSE — der SPIELTAG DER RUNDE, quer über alle Wettbewerbe
//
//  Bisher gab es nur Liga-Spieltage: alles im Code schlüsselt auf
//  `wettbewerb + matchday`. Bei einer Runde über mehrere Ligen laufen damit
//  vier Zählungen nebeneinander her — und keine davon ist „der Spieltag der
//  Runde". Genau den braucht man aber, sobald etwas RUNDENWEIT passiert:
//  ein Joker je Spieltag, der Anschluss-Bonus je Spieltag, ein Zwischenstand.
//
//  ── Das Problem, das diese Datei löst ──
//  Die Ligen starten versetzt (La Liga 14.08., Premier League 15.08., Serie A
//  22.08., Bundesliga 28.08.) und haben eigene Rhythmen. „Spieltag 5" bedeutet
//  in jeder Liga etwas anderes. Es braucht also eine ÜBERSETZUNG.
//
//  ── Der Entwurf: ein ANKER gibt den Takt vor ──
//  Eine Liga ist der Taktgeber (Standard: die früheste). Jeder ihrer Spieltage
//  eröffnet einen Runden-Spieltag; alles, was bis zum nächsten Ankerpunkt
//  angepfiffen wird, gehört dazu — egal aus welcher Liga. Das ist in EINEM Satz
//  erklärbar, und genau daran hängt, ob ein Spieler dem Ding traut.
//
//  Zugeordnet wird immer ein GANZER Liga-Spieltag, nie ein einzelnes Spiel —
//  ein Bundesliga-Spieltag läuft Freitag bis Sonntag und läge sonst links und
//  rechts eines Ankerpunkts. Ein halber Spieltag ist der Punkt, an dem aus
//  einer Anzeige-Frage eine Fairness-Frage wird.
//
//  Drei Kanten, die der naive Entwurf verliert:
//   • **Vor dem ersten Ankerpunkt.** Startet der Anker später als die anderen,
//     hängen deren erste Spieltage in der Luft. Sie fallen hier in Runden-
//     Spieltag 1 — lieber ein voller erster Spieltag als verschwundene Spiele.
//   • **Lücken im Anker** (Winterpause, Länderspielpause). Pausiert der Anker
//     drei Wochen, während andere Ligen weiterspielen, wird ein Runden-Spieltag
//     riesig. Das ist nicht falsch, aber überraschend — `warnungen()` benennt
//     es, und der Modus `woche` ist die Alternative.
//   • **Der Wochen-Modus fasst trotzdem Spieltage zusammen.** Er teilt nach
//     festen Fenstern, aber die Einheit bleibt der Liga-Spieltag: ein Fenster
//     von drei Tagen zerschneidet sonst jedes Wochenende.
//
//  ── Skalierung ──
//  `buendeln: N` fasst N Ankerspieltage zu EINEM Runden-Spieltag zusammen —
//  für Runden, die nicht jede Woche abrechnen wollen.
//
//  Reine Funktionen, UI-frei. Kennt keine Ligennamen: der Anker ist ein Key,
//  die Labels kommen aus `wettbewerbe.js` (Architektur-Regel 3).
// ============================================================

import { wettbewerbVon, wettbewerbLabel, istEchterWettbewerb, WETTBEWERBE } from "./wettbewerbe";
import { spieltagKey } from "./spieltag";

export const ZEITACHSE_MODI = ["anker", "woche"];

// Was passiert, wenn der Taktgeber pausiert (Winterpause, Länderspielpause),
// die anderen Ligen aber weiterspielen? Ohne Antwort wird EIN Runden-Spieltag
// riesig — im Extremfall drei Wochen lang.
export const PAUSEN_MODI = [
  {
    key: "auffuellen",
    label: "Auffüllen",
    hint: "Jede Woche der Pause wird ein eigener Runden-Spieltag — der Rhythmus bleibt.",
  },
  {
    key: "anhaengen",
    label: "Anhängen",
    hint: "Alles in der Pause fällt in den vorherigen Spieltag — ein dicker statt mehrerer dünner.",
  },
];

export const ZEITACHSE_LIMITS = {
  buendeln: { min: 1, max: 5 },     // wie viele Ankerspieltage ein Runden-Spieltag umfasst
  tage: { min: 3, max: 21 },        // Fensterlänge im Wochen-Modus
  pauseAbTagen: { min: 8, max: 28 }, // ab welcher Lücke im Taktgeber von „Pause" die Rede ist
  // ⚠️ Überfüllung wird RELATIV gemessen, nicht an einer festen Zahl. Eine feste
  // Schwelle hängt an der Zahl der Wettbewerbe: über vier Ligen sind 39 Spiele
  // eine ganz normale Woche, mit Champions League 57. Eine Schwelle von 40
  // hätte dort JEDE CL-Woche als Pause im Taktgeber gemeldet — ein Fehlalarm
  // auf der Standard-Einstellung, und noch dazu mit falscher Begründung.
  ueberfuellungsFaktor: 2,          // ab dem Wievielfachen des üblichen Spieltags
  warnAbSpielen: 12,                // Untergrenze: darunter ist „doppelt so viel" belanglos
};

export const DEFAULT_ZEITACHSE = {
  modus: "anker",
  anker: null,          // null = automatisch die früheste Liga
  buendeln: 1,
  tage: 7,
  pause: "auffuellen",  // Standard: der Rhythmus bleibt auch in der Winterpause
  pauseAbTagen: 10,     // 10 Tage — ein normaler Wochenrhythmus löst das nie aus
};

const zahl = (v, { min, max }, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function sanitizeZeitachse(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const modus = ZEITACHSE_MODI.includes(p.modus) ? p.modus : DEFAULT_ZEITACHSE.modus;
  // Ein unbekannter Anker fällt auf „automatisch" zurück statt die Achse zu
  // sprengen — dieselbe Richtung wie bei der Spielauswahl: fehlende Daten
  // dürfen nie stillschweigend alles wegfiltern.
  const anker = WETTBEWERBE.some((w) => w.key === p.anker) ? p.anker : null;
  return {
    modus,
    anker,
    buendeln: zahl(p.buendeln, ZEITACHSE_LIMITS.buendeln, DEFAULT_ZEITACHSE.buendeln),
    tage: zahl(p.tage, ZEITACHSE_LIMITS.tage, DEFAULT_ZEITACHSE.tage),
    pause: PAUSEN_MODI.some((m) => m.key === p.pause) ? p.pause : DEFAULT_ZEITACHSE.pause,
    pauseAbTagen: zahl(p.pauseAbTagen, ZEITACHSE_LIMITS.pauseAbTagen, DEFAULT_ZEITACHSE.pauseAbTagen),
  };
}

const TAG = 24 * 3600 * 1000;
const WOCHE = 7 * TAG;

const zeit = (m) => new Date(m.kickoff).getTime();

// Welche Liga gibt den Takt vor? Ohne Vorgabe die, die zuerst anfängt — das ist
// die Erwartung („die Saison beginnt, wenn irgendwo angepfiffen wird").
// Wettbewerbe ohne echte Saison (Demo-Spiel) kommen dafür nicht in Frage.
export function ankerWettbewerb(matches = [], gewuenscht = null) {
  const echte = matches.filter((m) => istEchterWettbewerb(wettbewerbVon(m)) && Number.isFinite(zeit(m)));
  if (!echte.length) return null;
  if (gewuenscht && echte.some((m) => wettbewerbVon(m) === gewuenscht)) return gewuenscht;
  const start = new Map();
  for (const m of echte) {
    const w = wettbewerbVon(m);
    const t = zeit(m);
    if (!start.has(w) || t < start.get(w)) start.set(w, t);
  }
  return [...start.entries()].sort((a, b) => a[1] - b[1])[0][0];
}

// Die Ankerpunkte: je Spieltag des Anker-Wettbewerbs sein frühester Anpfiff.
function ankerPunkte(matches, anker, buendeln) {
  const proSpieltag = new Map();
  for (const m of matches) {
    if (wettbewerbVon(m) !== anker) continue;
    const md = m.matchday ?? 0;
    const t = zeit(m);
    if (!Number.isFinite(t)) continue;
    if (!proSpieltag.has(md) || t < proSpieltag.get(md)) proSpieltag.set(md, t);
  }
  const punkte = [...proSpieltag.entries()]
    .map(([matchday, ab]) => ({ matchday, ab }))
    .sort((a, b) => a.ab - b.ab);
  if (buendeln <= 1) return punkte;
  // Bündeln: nur jeder N-te Punkt eröffnet einen Runden-Spieltag.
  return punkte.filter((_, i) => i % buendeln === 0);
}

// Die fertige Achse: Runden-Spieltage mit ihren Spielen und der Übersetzung in
// die Liga-Spieltage. Das ist der eigentliche Zweck — „Spieltag 5 der Runde ist
// Bundesliga-Spieltag 3" muss man ablesen können, sonst weiß niemand, wo er ist.
export function zeitachse(matches = [], cfg = DEFAULT_ZEITACHSE) {
  const c = sanitizeZeitachse(cfg);
  // Wettbewerbe ohne eigene Saison (Demo-Länderspiel) bleiben DRAUSSEN. Sie
  // haben keinen Spieltag im Sinne der Runde, und ihr Anpfiff liegt irgendwo —
  // eingerechnet würden sie den ersten Runden-Spieltag verwässern und mit
  // „Demo 14" in der Übersetzung auftauchen.
  const gueltig = matches.filter((m) => Number.isFinite(zeit(m)) && istEchterWettbewerb(wettbewerbVon(m)));
  if (!gueltig.length) return [];

  // Der Taktgeber wandert MIT in die Achse. Sonst müsste jeder Aufrufer, der
  // ihn braucht (`warnungen`), ihn aus `cfg` neu bestimmen — und bei
  // `anker: null` raten, welche Liga die Automatik genommen hat.
  const taktgeber = c.modus === "anker" ? ankerWettbewerb(gueltig, c.anker) : null;

  const grenzen = c.modus === "woche"
    ? wochenGrenzen(gueltig, c.tage)
    : mitPausen(ankerPunkte(gueltig, taktgeber, c.buendeln), c);

  if (!grenzen.length) return [];

  const eintraege = grenzen.map((ab, i) => ({
    nummer: i + 1,
    // Der erste Runden-Spieltag beginnt bewusst im Unendlichen: was VOR dem
    // ersten Ankerpunkt angepfiffen wird (frühere Ligen!), gehört zu ihm.
    von: i === 0 ? -Infinity : ab,
    bis: grenzen[i + 1] ?? Infinity,
    spiele: [],
  }));

  // ⚠️ Zugeordnet wird der LIGA-SPIELTAG, nicht das einzelne Spiel. Ein
  // Bundesliga-Spieltag läuft von Freitag bis Sonntag und kann links und rechts
  // eines Ankerpunkts liegen — spielweise zugeordnet zerfiele er auf zwei
  // Runden-Spieltage. Solange die Achse nur anzeigt, wäre das kosmetisch;
  // sobald etwas daran hängt, ist es ein Fairness-Bruch: ein Joker auf einem
  // halben Spieltag ist etwas anderes als auf einem ganzen, und „alle Spiele
  // des Spieltags getippt" (`ereignisse.js`) ginge nie wieder auf.
  //
  // Maßgeblich ist das ERSTE Spiel des Liga-Spieltags. Dadurch fällt jeder
  // Spieltag des Taktgebers exakt auf seinen eigenen Ankerpunkt — die Grenzen
  // sind ja genau aus diesen frühesten Anpfiffen gebaut.
  for (const gruppe of ligaSpieltagGruppen(gueltig)) {
    const start = Math.min(...gruppe.map(zeit));
    let idx = 0;
    // Rückwärts suchen: der letzte Ankerpunkt, der nicht nach dem Start liegt.
    for (let i = eintraege.length - 1; i >= 0; i--) {
      if (start >= eintraege[i].von) { idx = i; break; }
    }
    for (const m of gruppe) eintraege[idx].spiele.push(m);
  }

  return eintraege.map((e) => ({
    ...e,
    taktgeber,
    spiele: e.spiele.sort((a, b) => zeit(a) - zeit(b)),
    ligen: ligaSpieltage(e.spiele),
  }));
}

// Die Spiele nach ihrem Liga-Spieltag bündeln — die Einheit, die nicht
// zerrissen werden darf. `spieltagKey` ist dafür die eine Quelle im Projekt
// (Wettbewerb + Zahl, nie die Zahl allein). Ein Spiel OHNE `matchday` gehört zu
// keinem Spieltag und bleibt für sich: sonst klumpten alle solchen Spiele eines
// Wettbewerbs zu einer Gruppe über die halbe Saison zusammen.
function ligaSpieltagGruppen(matches = []) {
  const gruppen = new Map();
  for (const m of matches) {
    const key = m.matchday == null
      ? `einzeln#${m.id ?? gruppen.size}`
      : spieltagKey({ wettbewerb: wettbewerbVon(m), matchday: m.matchday });
    if (!gruppen.has(key)) gruppen.set(key, []);
    gruppen.get(key).push(m);
  }
  return [...gruppen.values()];
}

// Pausen im Taktgeber. Spielt er drei Wochen nicht, während die anderen Ligen
// weiterlaufen, entstünde sonst EIN Runden-Spieltag über die ganze Pause —
// formal richtig, aber niemand rechnet damit, und ein Joker in so einem
// Spieltag wäre etwas völlig anderes wert als in einem normalen.
//
// `auffuellen` setzt deshalb je Woche der Lücke eine zusätzliche Grenze; der
// Rhythmus bleibt, und die Übersetzung zeigt dann eben nur die Ligen, die
// gerade spielen. `anhaengen` lässt die Lücke, wo sie ist — sinnvoll bei
// kurzen Länderspielpausen, wo ein dicker Spieltag angenehmer ist als zwei
// dünne.
function mitPausen(punkte, c) {
  const grenzen = [];
  // ⚠️ Die Schwelle muss mit `buendeln` mitwachsen. Wer zwei Anker-Spieltage
  // bündelt, WILL Blöcke von zwei Wochen — ohne diese Anpassung sähe die
  // Zeitachse darin eine Pause und würde das Bündeln sofort wieder auflösen.
  const takt = Math.max(1, c.buendeln) * WOCHE;
  const luecke = Math.max(c.pauseAbTagen * TAG, takt + 3 * TAG);
  for (let i = 0; i < punkte.length; i++) {
    grenzen.push(punkte[i].ab);
    const naechster = punkte[i + 1]?.ab;
    if (c.pause !== "auffuellen" || naechster == null) continue;
    if (naechster - punkte[i].ab <= luecke) continue;
    // Aufgefüllt wird im gewählten Takt, nicht stur wöchentlich.
    for (let t = punkte[i].ab + takt; t < naechster; t += takt) grenzen.push(t);
  }
  return grenzen;
}

function wochenGrenzen(matches, tage) {
  const start = Math.min(...matches.map(zeit));
  const ende = Math.max(...matches.map(zeit));
  const fenster = tage * 24 * 3600 * 1000;
  const grenzen = [];
  for (let t = start; t <= ende; t += fenster) grenzen.push(t);
  return grenzen;
}

// Je Wettbewerb die Spieltage, die in diesem Runden-Spieltag vorkommen.
// Mehrere sind möglich (eine Liga kann in einem langen Fenster zweimal spielen)
// — deshalb eine Liste und keine Zahl.
function ligaSpieltage(spiele = []) {
  const proWettbewerb = new Map();
  for (const m of spiele) {
    const w = wettbewerbVon(m);
    if (!proWettbewerb.has(w)) proWettbewerb.set(w, new Set());
    if (m.matchday != null) proWettbewerb.get(w).add(m.matchday);
  }
  const out = {};
  // Reihenfolge des Katalogs, damit die Anzeige stabil bleibt.
  for (const w of WETTBEWERBE) {
    if (proWettbewerb.has(w.key)) out[w.key] = [...proWettbewerb.get(w.key)].sort((a, b) => a - b);
  }
  return out;
}

// In welchen Runden-Spieltag fällt dieses Spiel? `null` für alles, was nicht
// zur Achse gehört (Demo-Spiel) — der Aufrufer zeigt dann einfach nichts an.
//
// Nachgeschlagen wird in der fertigen Achse, NICHT über die Anstoßzeit neu
// gerechnet: seit ein Liga-Spieltag als Ganzes einsortiert wird, kann ein
// einzelnes Spiel zeitlich hinter dem nächsten Ankerpunkt liegen und trotzdem
// zum vorigen Runden-Spieltag gehören. Eine zweite Rechnung wäre eine zweite
// Wahrheit — genau die Sorte Abweichung, die niemand bemerkt.
export function rundenSpieltagVon(achse = [], match) {
  if (!match) return null;
  // Zuerst über den LIGA-SPIELTAG nachschlagen und nicht über die Anstoßzeit.
  // Damit funktioniert die Frage auch für einen TIPP — der trägt Wettbewerb und
  // Spieltag, aber keinen Anpfiff. Genau das braucht die Joker-Prüfung.
  const key = match.matchday == null
    ? null
    : spieltagKey({ wettbewerb: wettbewerbVon(match), matchday: match.matchday });
  const id = match.id ?? match.matchId ?? match.match_id ?? null;
  for (const e of achse) {
    if (e.spiele.some((m) => (id != null && (m.id ?? m.matchId) === id)
      || (key != null && spieltagKey({ wettbewerb: wettbewerbVon(m), matchday: m.matchday }) === key))) {
      return e.nummer;
    }
  }
  // Nicht in dieser Achse enthalten (fremdes oder Demo-Spiel): auf die Zeit
  // zurückfallen, soweit es überhaupt eine gibt.
  const t = zeit(match);
  if (!Number.isFinite(t) || !istEchterWettbewerb(wettbewerbVon(match))) return null;
  for (let i = achse.length - 1; i >= 0; i--) if (t >= achse[i].von) return achse[i].nummer;
  return achse.length ? achse[0].nummer : null;
}

// Der Spieltags-SCHLÜSSEL der Runde — als Ersatz für `spieltagKey` überall dort,
// wo „einmal pro Spieltag" gemeint ist: ein Joker, ein Gewicht aus dem Pool.
//
// ⚠️ Das ist der Punkt, an dem die Zeitachse von einer Anzeige zu einer
// FAIRNESS-Frage wird. Über den Liga-Spieltag geschlüsselt bekommt ein Tipper in
// einer Runde mit fünf Wettbewerben fünf Joker pro Woche statt einem, und der
// Ranglisten-Pool ließe sich fünfmal ausgeben. Über den Runden-Spieltag ist es
// einer — was die Regel immer gemeint hat.
//
// Bei nur EINEM Wettbewerb ist der Runden-Spieltag derselbe wie der
// Liga-Spieltag; die Umstellung ändert dort also nichts. Ohne Achse gibt es
// `null` zurück, und der Aufrufer bleibt bei `spieltagKey` — kein stiller
// Wechsel der Regel, wenn die Daten fehlen.
export function rundenSchluessel(achse = []) {
  if (!achse.length) return null;
  const gemerkt = new Map();
  return (x) => {
    const key = spieltagKey({ wettbewerb: wettbewerbVon(x), matchday: x?.matchday ?? null });
    if (gemerkt.has(key)) return gemerkt.get(key);
    const nummer = rundenSpieltagVon(achse, x);
    // Was nicht zur Achse gehört (Demo-Spiel), behält seinen eigenen Schlüssel —
    // sonst fielen alle solchen Spiele in einen gemeinsamen Topf.
    const wert = nummer == null ? key : `runde#${nummer}`;
    gemerkt.set(key, wert);
    return wert;
  };
}

// Die Übersetzung in Worten: „Spieltag 5 · Bundesliga 3 · Premier League 5".
// Genau das, was ohne Achse niemand im Kopf hat.
export function achsenLabel(eintrag, { kurz = false } = {}) {
  if (!eintrag) return "";
  const teile = Object.entries(eintrag.ligen).map(([key, tage]) => {
    const name = kurz ? (WETTBEWERBE.find((w) => w.key === key)?.kurz ?? key) : wettbewerbLabel(key);
    return `${name} ${tage.join("+")}`;
  });
  return `Spieltag ${eintrag.nummer}${teile.length ? " · " + teile.join(" · ") : ""}`;
}

// Wie viele Tage umfasst dieser Runden-Spieltag? Der erste beginnt im
// Unendlichen und der letzte endet dort — beide Ränder fallen dann auf den
// frühesten bzw. spätesten Anpfiff zurück, sonst käme Unendlich heraus.
function fensterTage(e) {
  const t = (e.spiele ?? []).map(zeit).filter(Number.isFinite);
  const von = Number.isFinite(e.von) ? e.von : (t.length ? Math.min(...t) : 0);
  const bis = Number.isFinite(e.bis) ? e.bis : (t.length ? Math.max(...t) : von);
  return Math.max(0, (bis - von) / TAG);
}

// Median statt Mittelwert: ein paar sehr dicke Spieltage sind genau das, wonach
// gesucht wird — sie dürfen den Vergleichswert nicht selbst hochziehen.
function median(zahlen = []) {
  if (!zahlen.length) return 0;
  const s = [...zahlen].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// Was an dieser Achse unangenehm werden könnte — VOR dem Anlegen der Runde.
// Eine Zeitachse, die man erst im Dezember als unpassend erkennt, ist wertlos:
// der Spielplan steht dann längst.
export function warnungen(achse = [], cfg = DEFAULT_ZEITACHSE) {
  const c = sanitizeZeitachse(cfg);
  const out = [];
  if (!achse.length) return out;

  // Gemessen wird gegen den ÜBLICHEN Spieltag dieser Achse (Median), nicht
  // gegen eine feste Zahl — siehe `ueberfuellungsFaktor`. Der Vergleichswert
  // lässt den ERSTEN Eintrag außen vor: dass der den Vorlauf der früheren Ligen
  // aufsammelt, ist gewollt und würde den Maßstab verschieben. Geprüft wird er
  // trotzdem — eine Pause kann auch gleich am Anfang liegen.
  const ueblich = median((achse.length > 1 ? achse.slice(1) : achse).map((e) => e.spiele.length));
  const grenze = Math.max(ueblich * ZEITACHSE_LIMITS.ueberfuellungsFaktor, ZEITACHSE_LIMITS.warnAbSpielen);
  const dick = achse.filter((e) => e.spiele.length >= grenze);
  if (dick.length) {
    // Die Ursache steht in den Daten, sie muss nicht geraten werden — und die
    // beiden möglichen Ursachen brauchen verschiedene Ratschläge. Unterscheiden
    // lassen sie sich am ZEITFENSTER: pausiert der Taktgeber, zieht sich der
    // Spieltag über Wochen. Fallen dagegen nur mehrere Wettbewerbe in dieselbe
    // Woche (Champions League neben vier Ligen), bleibt das Fenster normal —
    // dort wäre „Pause im Taktgeber" eine falsche Fährte.
    const anker = c.modus === "anker" ? (achse[0]?.taktgeber ?? null) : null;
    const ueblichesFenster = median(achse.map(fensterTage));
    const pausiert = anker != null && dick.every((e) => fensterTage(e) > ueblichesFenster * 1.5);
    out.push({
      art: "ueberfuellt",
      text: `${dick.length} Runden-Spieltag${dick.length > 1 ? "e umfassen" : " umfasst"} `
        + `${Math.max(...dick.map((e) => e.spiele.length))} Spiele — üblich sind ${ueblich}. `
        + (pausiert
          ? `Der Taktgeber pausiert dort, während die anderen Ligen weiterspielen.`
          : `Dort fallen mehrere Wettbewerbe zusammen.`),
      hilfe: c.modus !== "anker"
        ? "Ein kürzeres Fenster verteilt das gleichmäßiger."
        : pausiert && c.pause === "anhaengen"
          ? "Der Pausen-Modus Auffüllen macht daraus mehrere normale Spieltage."
          : "Ein anderer Taktgeber oder der Wochen-Modus verteilt das gleichmäßiger.",
    });
  }

  const erste = achse[0];
  const fremdeVorher = Object.keys(erste.ligen).length;
  if (c.modus === "anker" && fremdeVorher > 1 && erste.spiele.length > (achse[1]?.spiele.length ?? 0) * 1.5) {
    out.push({
      art: "vorlauf",
      text: `Spieltag 1 ist größer als die folgenden: andere Ligen starten früher als der Taktgeber, `
        + `ihre ersten Spieltage sammeln sich davor.`,
      hilfe: "Die früheste Liga als Taktgeber wählen, dann verteilt es sich gleichmäßig.",
    });
  }

  return out;
}
