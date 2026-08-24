// ============================================================
//  DUELL-JOKER — Klau-Joker & Block-Joker
//
//  Der dritte Joker-Topf. Die bisherigen zwei zielen auf ein SPIEL
//  (`rules.joker`) oder auf eine Aufgabe (`rules.ereignisse`). Dieser zielt
//  auf eine PERSON: der Klau-Joker verdient an der Ausbeute eines Mitspielers
//  mit, der Block-Joker dämpft sie. Beides ist dieselbe Mechanik mit
//  umgekehrtem Vorzeichen — deshalb EIN Modul, EIN Regelblock, ein
//  gemeinsames Kontingent. Zwei getrennte Module würden zwangsläufig
//  auseinanderlaufen (dieselbe Lehre wie bei `saisonBoard.js`).
//
//  ── Warum das keine Wertungsregel ist ──
//  `scoreTip` bleibt unberührt. Der Duell-Joker greift nicht in die Wertung
//  eines Tipps ein, sondern auf die FERTIGEN Spieltagspunkte — dieselbe
//  Bauart wie `catchup.js` und `saisonform.js`, aus demselben Grund: ein
//  abgegebener Tipp bleibt für sich allein bewertbar. Was sich ändert, ist
//  eine ÜBERWEISUNG obendrauf, und die ist als solche sichtbar.
//
//  ── Kein neuer Punkte-Kanal ──
//  Übernommen aus `ereignisse.js`: was ein Spieler durch den Duell-Joker
//  gewinnt, muss ein anderer verlieren (`klau.modus: "nullsumme"`) ODER es
//  gilt ein Deckel (`maxProSaison`). Sonst entsteht eine zweite
//  Leistungsachse, an der `modCap` vorbeigreift. `konflikte()` meldet die
//  Kombination, die genau das umgeht: `mitverdienen` ohne Deckel.
//
//  ── ⚠️ Die Falle beim Block-Joker ──
//  Ein Block auf einen Spieler, der an diesem Spieltag ins Minus tippt, ist
//  ein Geschenk: Spieltagspunkte können negativ sein (`wrongPenalty`), und
//  wer stumpf „× restanteil" rechnet, halbiert auch den Verlust. Deshalb ist
//  `block.nurGewinn: true` die Vorgabe — gedämpft wird nur eine positive
//  Spieltagswertung. Nur ein ausdrückliches `false` schaltet das ab (dieselbe
//  Bauart wie `nurGetippte` in `saisonform.js`). Aus demselben Grund wirkt
//  `klau.anteil` nur auf positive Zielpunkte: aus einem Minus lässt sich
//  nichts klauen.
//
//  ── Reihenfolge in der Verlaufskette ──
//  `applyCatchup(applySaisonform(applyDuellJoker(roh, rules, einsaetze), rules), rules)`
//  Duell zuerst, weil die Überweisung INNERHALB eines Spieltags passiert.
//  Saisonform danach, weil sie ganze Spieltage gewichtet und streicht — sie
//  muss den Wert wiegen, der wirklich zählt. Catchup zuletzt, unverändert.
//
//  ── Sichtbarkeit liegt in jokerBasis.sicht ──
//  `duell.ansage`/`duell.oeffentlich` gibt es nicht mehr — zwei Wahrheiten über
//  dieselbe Frage (WANN ein Einsatz für andere sichtbar wird) bleiben nicht
//  stehen. Die Grundform aus `jokerBasis.js` deckt das über `sicht`
//  (`sofort` · `nachAnpfiff` · `nachAuswertung`) ab, geschlüsselt je nach
//  Joker-Art (`duell.klau`, `duell.block`) über `basisFuer()`. `sichtbarkeit`
//  bleibt hier unverändert — das ist eine andere Frage: WIE ein Einsatz
//  ausgewählt wird (offen vs. verdeckt), nicht WANN er sichtbar wird.
//
//  ── Umfang und Abklingzeit liegen jetzt in jokerBasis ──
//  `umfang`/`spieleProEinsatz`/`wahl` (design/joker-grundform.md Abschnitt 5.4)
//  und `abstand` (Abschnitt 5.5, jetzt `abklingzeit`) standen bis hierher noch
//  einmal in `DEFAULT_DUELL`/`DUELL_LIMITS`/`sanitizeDuellJoker` — dieselbe
//  Frage wie bei jedem anderen Joker, also gehört sie in die Grundform statt
//  ein zweites Mal hier zu stehen (dieselbe Behandlung wie `ansage`/
//  `oeffentlich` oben). `waehleSpiele` bekommt das fertig gemergte
//  `basis`-Objekt (`basisFuer("duell.klau"|"duell.block", rules)`) als
//  Parameter, `duellPlan` liest `basis.abklingzeit` für den Mindestabstand.
//  ⚠️ `jokerBasis.js` importiert `fensterVon` aus DIESER Datei (über
//  `jokerBudget.js`) — ein Import von `jokerBasis` hier ERZEUGT DESHALB EINEN
//  ZYKLUS. Die Werte werden deshalb nur als Strings verglichen
//  (`basis.umfang === "einSpiel"`), ohne den Katalog zu importieren.
//  ⚠️ `proSpieltag` bleibt HIER in `duell` — das ist eine andere Frage („wie
//  viele Duell-Joker an einem Spieltag", nicht „wie viele Spiele trifft ein
//  Einsatz") und wandert nicht mit.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { jokerPlan, SICHTBARKEIT } from "./jokerPlan";
// 🔴 Die FREMDJOKER-Familie (JK4–JK7, 23.08.2026). `eingriffe.js` importiert
// selbst NICHTS — deshalb ist dieser Import zyklusfrei, anders als ein Import
// von `fremdjoker.js` (das umgekehrt diese Datei liest). Siehe den
// Kopfkommentar dort; die Aufteilung existiert genau aus diesem Grund.
import { sanitizeEingriffe, gegenwetteErtrag, wartezeit } from "./eingriffe";

// ── Kataloge ────────────────────────────────────────────────

export const DUELL_TYPEN = [
  {
    key: "klau", label: "Klau-Joker",
    desc: "Du verdienst an der Ausbeute eines Mitspielers mit.",
  },
  {
    key: "block", label: "Block-Joker",
    desc: "Du dämpfst die Wertung eines Mitspielers für ein Spiel.",
  },
];

// Welche `tip.duell.typ`-Werte einen gültigen Einsatz ergeben. Seit dem
// 23.08.2026 sind das VIER: die beiden Duell-Arten oben plus die beiden neuen
// Fremdjoker aus `eingriffe.js` (JK4). Bewusst als Schlüssel-Menge und nicht
// als Import von `FREMDJOKER_ARTEN` — dort stehen alle vier, also auch `klau`
// und `block`, und eine zweite Liste derselben Schlüssel wäre genau die
// doppelte Wahrheit, die dieses Projekt Zeit gekostet hat.
const EINSATZ_TYPEN = new Set([
  ...DUELL_TYPEN.map((t) => t.key), "trittbrett", "gegenwette",
]);

export const PHASEN = [
  {
    key: "ganze", label: "Ganze Saison",
    desc: "Duell-Joker gibt es über die komplette Saison verteilt.",
  },
  {
    key: "rueckrunde", label: "Rückrunde",
    desc: "Erst ab der zweiten Saisonhälfte.",
  },
  {
    key: "letztesDrittel", label: "Letztes Drittel",
    desc: "Nur im letzten Saisondrittel — unsere Empfehlung.",
  },
  {
    key: "schlussspurt", label: "Schlussspurt",
    desc: "Nur in den letzten Spieltagen vor Saisonende.",
  },
  {
    key: "manuell", label: "Manuell",
    desc: "Ein fest eingestelltes Spieltags-Fenster von … bis.",
  },
];

export const ZIELWAHL = [
  {
    key: "frei", label: "Frei",
    desc: "Jeder darf jeden treffen.",
  },
  {
    key: "nurVorne", label: "Nur nach vorne",
    desc: "Nur Spieler, die vor dir stehen, sind ein erlaubtes Ziel — die direkte Antwort auf das Rudelbilden gegen den Letzten.",
  },
  {
    key: "nurTop3", label: "Nur Top 3",
    desc: "Nur die drei Erstplatzierten sind ein erlaubtes Ziel.",
  },
  {
    key: "nichtLetzter", label: "Nicht den Letzten",
    desc: "Jeder außer dem Tabellenletzten ist ein erlaubtes Ziel.",
  },
  // 🔴 JK12 (Andi, 22.08.2026): die fünfte Stufe. Sie ist eine andere Sorte
  // Antwort als die vier darüber — die schränken die WAHL ein, diese nimmt sie
  // weg und ersetzt sie durch ein Los. Drei Dinge löst sie damit von allein,
  // für die es sonst eigene Regler bräuchte: kein Rudelbilden gegen den
  // Führenden, kein Dauer-Opfer, und der Zeitpunkt der Tippabgabe bleibt egal.
  // WIE gelost wird, steht in `eingriffe.los` (eingriffe.js).
  {
    key: "ausgelost", label: "Ausgelost",
    desc: "Du bekommst dein Ziel zugelost und entscheidest nur noch, bei WELCHEM Spiel du zuschlägst.",
  },
];

// ── Grenzen & Vorgabe ───────────────────────────────────────

export const DUELL_LIMITS = {
  schlussLaenge: { min: 2, max: 8, step: 1 },
  abSpieltag: { min: 1, max: 38, step: 1 },
  bisSpieltag: { min: 1, max: 38, step: 1 },
  anzahl: { min: 1, max: 6, step: 1 },
  proSpieltag: { min: 1, max: 3, step: 1 },
  klauAnteil: { min: 0.1, max: 1.0, step: 0.05 },
  blockRestanteil: { min: 0.0, max: 0.9, step: 0.05 },
  blockBeute: { min: 0.0, max: 0.5, step: 0.05 },
  maxProSaison: { min: 0, max: 200, step: 1 },
  maxProZiel: { min: 1, max: 6, step: 1 },
  immun: { min: 0, max: 4, step: 1 },
};

export const DEFAULT_DUELL = {
  enabled: false,
  typen: ["klau"],
  phase: "letztesDrittel",
  schlussLaenge: 4,
  abSpieltag: null,
  bisSpieltag: null,
  anzahl: 2,
  proSpieltag: 1,
  sichtbarkeit: "offen",   // anders als beim normalen Joker bewusst OFFEN,
                           // siehe Kopfkommentar in duell-joker.md Abschnitt 5.B
  klau: { anteil: 0.35, modus: "nullsumme" },
  block: { restanteil: 0.5, nurGewinn: true, beute: 0 },
  maxProSaison: 60,
  zielWahl: "nurVorne",
  maxProZiel: 2,
  immun: 1,
  konter: false,
  kosten: "frei",
};

// Fest verdrahtete Empfehlungsbänder (Abschnitt 6 des Plans). `reglerWarnung.js`
// liest diese Konstante — Bänder verengen nie `DUELL_LIMITS`, sie liegen
// innerhalb davon.
export const EMPFEHLUNG = {
  phase: ["letztesDrittel", "schlussspurt"],
  anzahl: { min: 1, max: 3 },
  klauAnteil: { min: 0.2, max: 0.5 },
  blockRestanteil: { min: 0.4, max: 0.8 },
  maxProZiel: { max: 3 },
  // Kombinationsregel: viele freie Einsätze = alle auf den Führenden.
  zielWahlBeiVielenEinsaetzen: { abAnzahl: 3, verboten: "frei" },
};

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const clampInt = (v, min, max) => Math.min(max, Math.max(min, Math.round(v)));

// Bereinigt `rules.duell`. Unbekannte Werte fallen auf die Vorgabe, Zahlen
// werden auf `DUELL_LIMITS` beschnitten — dasselbe Muster wie
// `sanitizeVerteilung` in `jokerPlan.js`.
export function sanitizeDuellJoker(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const pk = p.klau && typeof p.klau === "object" ? p.klau : {};
  const pb = p.block && typeof p.block === "object" ? p.block : {};

  const typenRoh = Array.isArray(p.typen)
    ? [...new Set(p.typen.filter((t) => DUELL_TYPEN.some((d) => d.key === t)))]
    : [];
  const typen = typenRoh.length ? typenRoh : [...DEFAULT_DUELL.typen];

  // `null` UND `undefined` gelten beide als „keine Vorgabe" und bleiben
  // `null` — nicht über `Number()` jagen, denn `Number(null) === 0` und
  // `Number.isFinite(0)` ist wahr, was `null` fälschlich zu `1` machen würde
  // (Abschnitt 8b (a) des Plans). `0` bleibt weiterhin ein ungültiger Wert
  // (Spieltag 0 gibt es nicht) und fällt ebenfalls auf `null`.
  const leerWert = (v) => v === null || v === undefined;
  const abSpieltagRoh = leerWert(p.abSpieltag) ? NaN : Number(p.abSpieltag);
  const bisSpieltagRoh = leerWert(p.bisSpieltag) ? NaN : Number(p.bisSpieltag);

  return {
    enabled: p.enabled === true,
    typen,
    phase: PHASEN.some((ph) => ph.key === p.phase) ? p.phase : DEFAULT_DUELL.phase,
    schlussLaenge: Math.round(clamp(p.schlussLaenge, DUELL_LIMITS.schlussLaenge, DEFAULT_DUELL.schlussLaenge)),
    // Nur bei `manuell` gesetzt — sonst bleibt es `null`, damit `fensterVon`
    // weiß, dass keine Vorgabe existiert.
    abSpieltag: Number.isFinite(abSpieltagRoh) && abSpieltagRoh !== 0
      ? Math.round(clamp(abSpieltagRoh, DUELL_LIMITS.abSpieltag, DUELL_LIMITS.abSpieltag.min))
      : null,
    bisSpieltag: Number.isFinite(bisSpieltagRoh) && bisSpieltagRoh !== 0
      ? Math.round(clamp(bisSpieltagRoh, DUELL_LIMITS.bisSpieltag, DUELL_LIMITS.bisSpieltag.max))
      : null,
    anzahl: Math.round(clamp(p.anzahl, DUELL_LIMITS.anzahl, DEFAULT_DUELL.anzahl)),
    proSpieltag: Math.round(clamp(p.proSpieltag, DUELL_LIMITS.proSpieltag, DEFAULT_DUELL.proSpieltag)),
    // `sichtbarkeit` kommt aus `jokerPlan.js` — eine Quelle für den Katalog.
    sichtbarkeit: SICHTBARKEIT.some((s) => s.key === p.sichtbarkeit) ? p.sichtbarkeit : DEFAULT_DUELL.sichtbarkeit,
    klau: {
      anteil: +clamp(pk.anteil, DUELL_LIMITS.klauAnteil, DEFAULT_DUELL.klau.anteil).toFixed(2),
      modus: pk.modus === "mitverdienen" ? "mitverdienen" : "nullsumme",
    },
    block: {
      restanteil: +clamp(pb.restanteil, DUELL_LIMITS.blockRestanteil, DEFAULT_DUELL.block.restanteil).toFixed(2),
      // Nur ein ausdrückliches `false` schaltet ab — siehe Kopfkommentar.
      nurGewinn: pb.nurGewinn !== false,
      beute: +clamp(pb.beute, DUELL_LIMITS.blockBeute, DEFAULT_DUELL.block.beute).toFixed(2),
    },
    maxProSaison: Math.round(clamp(p.maxProSaison, DUELL_LIMITS.maxProSaison, DEFAULT_DUELL.maxProSaison)),
    zielWahl: ZIELWAHL.some((z) => z.key === p.zielWahl) ? p.zielWahl : DEFAULT_DUELL.zielWahl,
    maxProZiel: Math.round(clamp(p.maxProZiel, DUELL_LIMITS.maxProZiel, DEFAULT_DUELL.maxProZiel)),
    immun: Math.round(clamp(p.immun, DUELL_LIMITS.immun, DEFAULT_DUELL.immun)),
    konter: p.konter === true,
    kosten: p.kosten === "stattJoker" ? "stattJoker" : DEFAULT_DUELL.kosten,
  };
}

// ── Das Fenster ─────────────────────────────────────────────
// Übersetzt `phase` in ein Spieltags-Intervall `{ von, bis }` (1-basiert,
// beide Grenzen eingeschlossen). `manuell` nimmt `abSpieltag`/`bisSpieltag`,
// sonst wird errechnet.
export function fensterVon(duell, spieltage = 34) {
  const cfg = sanitizeDuellJoker(duell);
  const n = Number.isFinite(spieltage) && spieltage > 0 ? Math.floor(spieltage) : 34;

  if (cfg.phase === "manuell") {
    // Ohne gesetzte Grenzen fällt `manuell` auf das letzte Drittel zurück,
    // nicht auf die ganze Saison — die Vorgabe des Moduls ist die Empfehlung,
    // und ein Fenster über die ganze Saison wäre die aggressivste Einstellung
    // als Nebenwirkung eines bloßen Modus-Wechsels (Abschnitt 8b (a)).
    if (cfg.abSpieltag == null && cfg.bisSpieltag == null) {
      return fensterVon({ ...cfg, phase: "letztesDrittel" }, n);
    }
    const von = clampInt(cfg.abSpieltag ?? 1, 1, n);
    const bis = clampInt(cfg.bisSpieltag ?? n, 1, n);
    return von <= bis ? { von, bis } : { von: bis, bis: von };
  }
  if (cfg.phase === "rueckrunde") {
    return { von: Math.floor(n / 2) + 1, bis: n };
  }
  if (cfg.phase === "schlussspurt") {
    return { von: Math.max(1, n - cfg.schlussLaenge + 1), bis: n };
  }
  if (cfg.phase === "letztesDrittel") {
    return { von: Math.floor((n * 2) / 3) + 1, bis: n };
  }
  return { von: 1, bis: n }; // "ganze"
}

// Mindestabstand zwischen zwei eigenen Einsätzen, dazu höchstens
// `proSpieltag` je Tag — Randfall, wenn das Fenster kleiner ist als `anzahl`.
function abstandUndProSpieltagAnwenden(tage, abstand, proSpieltag) {
  const sortiert = [...tage].sort((a, b) => a - b);
  const jeTag = new Map();
  const out = [];
  let letzter = null;
  for (const t of sortiert) {
    if (letzter != null && t - letzter < abstand) continue;
    const bisher = jeTag.get(t) ?? 0;
    if (bisher >= proSpieltag) continue;
    jeTag.set(t, bisher + 1);
    out.push(t);
    letzter = t;
  }
  return out;
}

// ── Der Plan ────────────────────────────────────────────────
// Ruft `jokerPlan` aus `jokerPlan.js` für das Fenster auf und filtert
// anschließend nach Mindestabstand und `proSpieltag`. Die blockweise,
// deterministische Verteilung INNERHALB des Fensters übernimmt `jokerPlan` —
// nicht nachbauen.
//
// `basis` ist das fertig gemergte Grundform-Objekt einer Duell-Art
// (`basisFuer("duell.klau"|"duell.block", rules)`, siehe Kopfkommentar) —
// `basis.abklingzeit` liefert den Mindestabstand zwischen zwei eigenen
// Einsätzen (Abschnitt 5.5), nicht mehr `duell.abstand`. Fehlt `basis` ganz,
// gilt Abstand 0 (kein Abstand) statt eines geratenen Werts.
export function duellPlan({ spieltage = 34, duell = DEFAULT_DUELL, basis, seed = "", userIds = [] } = {}) {
  const cfg = sanitizeDuellJoker(duell);
  const fenster = fensterVon(cfg, spieltage);
  const breite = fenster.bis - fenster.von + 1;

  if (!cfg.enabled || breite < 1 || !userIds.length) {
    return { von: fenster.von, bis: fenster.bis, proSpieler: Object.fromEntries(userIds.map((id) => [id, []])) };
  }

  // `frequenz` (1–8, `jokerPlan`s eigene Grenze) so gewählt, dass das
  // Kontingent möglichst nah an `anzahl` liegt.
  const frequenz = clampInt(Math.round(breite / cfg.anzahl) || 1, 1, 8);
  const plan = jokerPlan({
    spieltage: breite,
    verteilung: { modus: "kontingent", frequenz, sichtbarkeit: cfg.sichtbarkeit },
    seed,
    userIds,
  });

  const abstand = Number(basis?.abklingzeit) || 0;

  const proSpieler = {};
  for (const id of userIds) {
    const relativ = plan.proSpieler?.[id] ?? [];
    const absolut = relativ.map((t) => t + fenster.von - 1);
    proSpieler[id] = abstandUndProSpieltagAnwenden(absolut, abstand, cfg.proSpieltag);
  }

  return { von: fenster.von, bis: fenster.bis, proSpieler };
}

// ── Wer darf getroffen werden ───────────────────────────────
// `board` = [{ userId, name, total, … }], nicht zwingend sortiert.
// `bisherigeEinsaetze` = bereits GESETZTE Duell-Joker dieses Spielers dieser
// Saison, dieselbe Form wie das dritte Argument von `applyDuellJoker`:
// `[{ spieltag, vonUserId, aufUserId, typ, spielIds }]` — daraus ergeben sich
// `maxProZiel` (wie oft ein Ziel schon getroffen wurde) und `immun`
// (Schonfrist seit dem letzten Treffer, bezogen auf `aktuellerSpieltag`).
export function zulaessigeZiele(board = [], userId, duell, { bisherigeEinsaetze = [], aktuellerSpieltag = null, sperre = null, art = null, losZiel = undefined } = {}) {
  const cfg = sanitizeDuellJoker(duell);
  // JK5 (Andi, 22.08.2026): „Option zu Cooldowns, dass einzelne nicht von
  // allen und immer regelmäßig getroffen werden können."
  //
  // 🔴 Die Sperre kommt FERTIG AUFGELÖST herein (`sperreFuer(art, eingriffe)`
  // in `eingriffe.js`), nicht als Regelwerk: sie steht seit dem 23.08.2026 je
  // Fremdjoker einzeln, und WELCHE gilt, hängt an der Art, die der Aufrufer
  // gerade setzen will. `art` sagt zusätzlich, welche früheren Treffer
  // mitzählen — der Block hat seine eigene Sperre, also zählt er auch nur
  // seine eigenen Treffer.
  //
  // ⚠️ Wer diese Funktion aufruft, ohne `sperre` mitzugeben, verliert JK5
  // still. Deshalb ist `fremdjoker.zulaessigeZiele` der Weg, den die
  // Oberflächen nehmen — er löst beides aus `rules` heraus auf.
  const liste = Array.isArray(board) ? board : [];
  const sortiert = [...liste].sort((a, b) => b.total - a.total);
  const mich = sortiert.find((b) => b.userId === userId);

  // 🔴 KONTER — bis 06.08.2026 stand `konter` im Regelwerk, wurde gesäubert,
  // reiste im Creator-Code mit, und KEINE Zeile im Projekt fragte es ab
  // (gefunden über `npm run stufen` Teil 2 und `npm run greift`).
  //
  // Bedeutung: wer an DIESEM Spieltag getroffen wurde, darf zurückschlagen —
  // und zwar auch dann, wenn der Angreifer nach `zielWahl` eigentlich kein
  // erlaubtes Ziel wäre. Genau darin liegt der Sinn: bei „nur nach vorne"
  // kann der Getroffene sonst NIE antworten, weil sein Angreifer per
  // Definition hinter ihm steht. Ohne diese Ausnahme wäre `konter` in der
  // häufigsten Zielwahl folgenlos.
  //
  // ⚠️ Nur derselbe Spieltag, und nur der ANGREIFER. Ein Konter, der eine
  // Woche später oder gegen jemand Drittes gilt, wäre ein zweiter freier
  // Einsatz — und die Schutzregeln darunter (`maxProZiel`, `immun`) gelten
  // für ihn weiter.
  const konterZiele = new Set();
  if (cfg.konter && aktuellerSpieltag != null) {
    for (const e of Array.isArray(bisherigeEinsaetze) ? bisherigeEinsaetze : []) {
      if (e.aufUserId === userId && e.spieltag === aktuellerSpieltag) konterZiele.add(e.vonUserId);
    }
  }

  let kandidaten = sortiert.filter((b) => b.userId !== userId);

  // Der Konter ist eine AUSNAHME von der Zielwahl, nicht von den
  // Schutzregeln — deshalb steht `konterZiele` nur in diesen drei Filtern.
  const darf = (b) => konterZiele.has(b.userId);
  if (cfg.zielWahl === "nurVorne") {
    const meinTotal = mich?.total ?? -Infinity;
    kandidaten = kandidaten.filter((b) => b.total > meinTotal || darf(b));
  } else if (cfg.zielWahl === "nurTop3") {
    const top3 = new Set(sortiert.slice(0, 3).map((b) => b.userId));
    kandidaten = kandidaten.filter((b) => top3.has(b.userId) || darf(b));
  } else if (cfg.zielWahl === "nichtLetzter") {
    const letzterId = sortiert[sortiert.length - 1]?.userId;
    kandidaten = kandidaten.filter((b) => b.userId !== letzterId || darf(b));
  } else if (cfg.zielWahl === "ausgelost") {
    // 🔴 JK12 — das Los ersetzt die Wahl. Es kommt FERTIG herein
    // (`meinLos()` in fremdjoker.js), weil die Auslosung Rundennummer,
    // Spieltag und Los-Einstellungen braucht, die diese Funktion nicht kennt.
    //
    // ⚠️ `losZiel === undefined` heißt „nicht ausgelost" und ergibt eine LEERE
    // Liste, nicht die volle. Fehlende Daten heißen NEIN — dieselbe Regel wie
    // beim Tipp-Fenster und bei den Auslösern. Andernfalls fiele eine Runde
    // mit Los stillschweigend auf freie Wahl zurück, sobald ein Aufrufer das
    // Los vergisst, und niemand würde es merken.
    //
    // Der KONTER bleibt die Ausnahme, die er überall ist: wer an diesem
    // Spieltag getroffen wurde, darf zurückschlagen, auch wenn das Los jemand
    // anderen nennt.
    kandidaten = kandidaten.filter((b) => b.userId === losZiel || darf(b));
  }
  // "frei": keine weitere Einschränkung.

  // 🔴 DREI Zähler, und die Unterscheidung ist der ganze Inhalt von JK5.
  //
  // ⚠️ **Befund vom 23.08.2026, gemessen beim Bau der Sperrfrist:** bis dahin
  // zählten `maxProZiel` und `immun` NUR die eigenen Einsätze — die Schleife
  // begann mit `if (e.vonUserId !== userId) continue;`. Beide versprechen aber
  // etwas anderes, und zwar wörtlich in ihrer eigenen Oberfläche: die Karte
  // heißt „Schutz der Getroffenen" und der Hinweis darunter lautet „verhindert,
  // dass sich eine RUNDE auf eine Person einschießt". Pro Angreifer gerechnet
  // verhindert er genau das nicht: fünf Spieler durften denselben fünfmal
  // treffen, jeder einmal, und keine Schranke sprach an.
  //
  // Seither:
  //   `maxProZiel`        — wie oft ein Ziel INSGESAMT getroffen wurde (alle)
  //   `immun`             — Erholung nach EINEM Treffer, egal von wem (alle)
  //   `sperrfristJeZiel`  — wie lange DERSELBE nicht wieder darf (Paar)   ← JK5
  //
  // Damit sagt jede der drei genau das, was auf ihr steht, und keine ist die
  // Kopie einer anderen. Vorher waren `maxProZiel` und `immun` beide
  // paar-bezogen und JK5 wäre ein drittes Mal dasselbe geworden.
  const treffer = new Map();        // zielId -> Treffer von ALLEN
  const letzterTreffer = new Map(); // zielId -> letzter Treffer von ALLEN
  const eigeneTreffer = new Map();  // zielId -> meine Treffer MIT DIESER ART
  const letzterEigener = new Map(); // zielId -> mein letzter Treffer, diese Art
  for (const e of Array.isArray(bisherigeEinsaetze) ? bisherigeEinsaetze : []) {
    if (e.aufUserId == null) continue;
    treffer.set(e.aufUserId, (treffer.get(e.aufUserId) ?? 0) + 1);
    const bis = letzterTreffer.get(e.aufUserId);
    if (bis == null || e.spieltag > bis) letzterTreffer.set(e.aufUserId, e.spieltag);
    if (e.vonUserId !== userId) continue;
    // Ohne benannte Art zählen alle eigenen Treffer — das ist der
    // Übergangsfall für Aufrufer, die noch keine Art kennen.
    if (art != null && e.typ !== art) continue;
    eigeneTreffer.set(e.aufUserId, (eigeneTreffer.get(e.aufUserId) ?? 0) + 1);
    const meins = letzterEigener.get(e.aufUserId);
    if (meins == null || e.spieltag > meins) letzterEigener.set(e.aufUserId, e.spieltag);
  }

  const frisch = (karte, dauer, zielId) => {
    if (dauer <= 0 || aktuellerSpieltag == null) return false;
    const letzt = karte.get(zielId);
    return letzt != null && aktuellerSpieltag - letzt < dauer;
  };

  // 🔴 Die Wartezeit hängt daran, wie OFT ich diese Person schon getroffen
  // habe — nicht nur daran, dass ich es getan habe. Gerechnet wird sie in
  // `wartezeit()` (eingriffe.js), damit Prüfung und Anzeige dieselbe Zahl
  // nennen.
  const gesperrt = (zielId) => {
    if (!sperre || aktuellerSpieltag == null) return false;
    const dauer = wartezeit(sperre, eigeneTreffer.get(zielId) ?? 0);
    return frisch(letzterEigener, dauer, zielId);
  };

  return kandidaten
    .filter((b) => (treffer.get(b.userId) ?? 0) < cfg.maxProZiel)
    .filter((b) => !frisch(letzterTreffer, cfg.immun, b.userId))
    .filter((b) => !gesperrt(b.userId))
    .map((b) => b.userId);
}

// ── Welche Spiele ein Einsatz trifft ────────────────────────
// Reine Auswahl-Logik (Abschnitt 8b (b) des Plans). Die Spiel-Ebene selbst
// bleibt draußen aus `applyDuellJoker` (der Verlauf trägt nur Spieltags-
// Summen) — aber WELCHE Spiele ein Einsatz trifft, ist reine Logik und
// gehört hierher. Der daraus resultierende BETRAG (`basis`) wird woanders
// berechnet, dort wo die Einzeltipps liegen (`scoreLeaderboardHistory`).
//
// `spieleDesZiels` = `[{ spielId, punkte }]` des Ziels an diesem Spieltag.
// `basis` ist das fertig gemergte Grundform-Objekt einer Duell-Art
// (`basisFuer("duell.klau"|"duell.block", rules)`, siehe Kopfkommentar) —
// `umfang`/`spieleProEinsatz`/`wahl` kommen jetzt von dort, nicht mehr aus
// `duell`. `jokerBasis.js` wird hier bewusst NICHT importiert (Importzyklus,
// siehe Kopfkommentar) — die Werte werden nur als Strings verglichen.
// `gewaehlteIds` = vom Angreifer gewählte Spiel-Ids, nur bei `wahl: "selbst"`
// relevant.
export function waehleSpiele(spieleDesZiels = [], basis, gewaehlteIds = []) {
  const b = basis && typeof basis === "object" ? basis : {};
  const spiele = Array.isArray(spieleDesZiels) ? spieleDesZiels : [];

  if (b.umfang === "spieltag") {
    return spiele.map((s) => s.spielId);
  }

  const anzahl = b.umfang === "nSpiele" ? (Number(b.spieleProEinsatz) || 1) : 1;

  if (b.wahl === "bestes") {
    // Bei Gleichstand entscheidet die kleinere `spielId`, damit das Ergebnis
    // nicht an der Eingabereihenfolge hängt (dieselbe Regel wie
    // `streichIndizes` in `saisonform.js`).
    const sortiert = [...spiele].sort((a, b) => {
      if (b.punkte !== a.punkte) return b.punkte - a.punkte;
      return a.spielId < b.spielId ? -1 : a.spielId > b.spielId ? 1 : 0;
    });
    return sortiert.slice(0, anzahl).map((s) => s.spielId);
  }

  // `wahl: "selbst"` → die ersten gültigen Ids aus `gewaehlteIds`, in der
  // gegebenen Reihenfolge. Ids, die das Ziel gar nicht getippt hat, werden
  // verworfen — ein Einsatz auf ein Spiel, das das Ziel nicht getippt hat,
  // ist kein Treffer.
  const bekannt = new Set(spiele.map((s) => s.spielId));
  const gewaehlt = Array.isArray(gewaehlteIds) ? gewaehlteIds : [];
  const gueltig = [];
  for (const id of gewaehlt) {
    if (!bekannt.has(id) || gueltig.includes(id)) continue;
    gueltig.push(id);
    if (gueltig.length >= anzahl) break;
  }
  return gueltig;
}

// ── Einsätze aus rohen Tipps ableiten ───────────────────────
// Übersetzt die roh gespeicherten Tipps (`tip.duell`, gesetzt in
// `Tippabgabe.jsx`) in die Form, die `applyDuellJoker` als drittes Argument
// erwartet. Baut hier NUR die vier Basisfelder (`spieltag`, `vonUserId`,
// `aufUserId`, `typ`) — `spielIds`/`basis` sind die SPÄTERE Verfeinerung auf
// Spiel-Ebene (Abschnitt 8b (b) des Plans); fehlt `basis`, behandelt
// `applyDuellJoker` das bereits korrekt als „ganzer Spieltag zählt".
//
// `tipps` = Roh-Einträge mit `userId`, `matchday`, `kickoff` und `tip` (dem
// `jsonb`-Feld) — dieselbe Form wie `eintragVon(...)` in den Stores. Für den
// Gleichstand-Fall unten (siehe dort) sollten die Einträge zusätzlich um
// `matchId` ergänzt sein, wie es `eintragVon` in `getRoundEntries` bereits
// tut. Ein gültiger Einsatz braucht `tip.duell.auf` (das Ziel), einen
// `tip.duell.typ` aus `DUELL_TYPEN` und `auf !== userId` (kein Selbstziel).
//
// `spieltagVon` ist reserviert: ist er gesetzt, zählen nur Einsätze mit
// `spieltag >= spieltagVon` — frühere Tipps werden ignoriert. `null` (Vorgabe)
// schränkt nichts ein.
export function einsaetzeAusTipps(tipps = [], { spieltagVon = null, proSpieltag = 1, rundenSpieltag = null } = {}) {
  const liste = Array.isArray(tipps) ? tipps : [];

  // 🔴 **Der Fund vom 23.08.2026, und er ist der teuerste Fehlertyp dieses
  // Projekts** (CLAUDE.md, Runden-Schicht, Frage 2): bis hierher stand als
  // Spieltag der LIGA-Spieltag (`t.matchday`). Der Verlauf ist aber nach dem
  // RUNDEN-Spieltag geordnet — der chronologischen Position über ALLE
  // Wettbewerbe. In einer Runde mit mehreren Wettbewerben liefen die zwei
  // auseinander.
  //
  // Gemessen an vier echten Spielen (bl#1 · bl#2 · cl#1 · cl#2): ein Klau,
  // gesetzt am CL-Spieltag 2, wirkte auf den BUNDESLIGA-Spieltag 2 — er nahm
  // Punkte von einem ganz anderen Tag. Fehlgeschlagen ist dabei nichts.
  //
  // ⚠️ Dieselbe Zahl entscheidet über `maxProZiel`, `immun` und die
  // Sperrfrist (JK5): die Tippabgabe vergleicht sie gegen den RUNDEN-Spieltag,
  // die Wertung rechnete mit dem Liga-Spieltag. Zwei Skalen, ein Vergleich.
  //
  // `rundenSpieltag(eintrag)` ist die Umrechnung (`rundenSpieltagVon(achse, …)`
  // in `zeitachse.js`). Fehlt sie, bleibt es beim Liga-Spieltag — für eine
  // Runde mit EINEM Wettbewerb ist das dasselbe, und ein stiller Wurf mitten
  // in der Wertung wäre schlimmer als der benannte Rückfall.
  const spieltagVonEintrag = (t) => {
    if (typeof rundenSpieltag === "function") {
      const n = rundenSpieltag(t);
      if (Number.isFinite(n)) return n;
    }
    return t.matchday;
  };

  const gueltig = liste.filter((t) => {
    const d = t?.tip?.duell;
    if (!d || d.auf == null) return false;
    if (!EINSATZ_TYPEN.has(d.typ)) return false;
    if (d.auf === t.userId) return false;
    if (spieltagVon != null && Number(spieltagVonEintrag(t)) < spieltagVon) return false;
    return true;
  });

  // 🔴 Je Spieler und Spieltag höchstens `proSpieltag` Einsätze — und zwar auf
  // VERSCHIEDENE Spiele (Andis Entscheidung vom 23.08.2026).
  //
  // ⚠️ **Der Befund, der dazu geführt hat:** bis dahin stand hier hart „höchstens
  // EIN Einsatz je Spieler und Spieltag". Der Regler `duell.proSpieltag` (1–3)
  // stand im Regelwerk, wurde gesäubert, reiste im Creator-Code mit — und war
  // wirkungslos: gemessen im engstmöglichen Fenster ergaben 1, 2 und 3 dreimal
  // dasselbe Ergebnis. Ein zweiter Einsatz wurde hier stillschweigend
  // verworfen, ohne dass irgendwo etwas fehlschlug.
  //
  // „Verschiedene Spiele" braucht keine eigene Prüfung: ein Fremdjoker wird
  // BEIM TIPPEN eines Spiels gesetzt, und je Spieler und Spiel gibt es genau
  // einen Tipp. Die Gruppierung nach Spieltag genügt.
  //
  // Die Reihenfolge INNERHALB eines Spieltags ist bedeutungstragend, nicht
  // kosmetisch: bei `proSpieltag: 1` entscheidet sie, WELCHER der beiden
  // Einsätze zählt. Es gewinnt der mit dem frühesten Anpfiff, bei Gleichstand
  // die kleinere Spiel-Id. Bewusst NICHT „der erste Eintrag in der Liste" —
  // sonst hinge das Ergebnis daran, in welcher Reihenfolge die Tipps aus der
  // Datenbank kommen. Dieselbe Regel wie beim Gleichstand in `streichIndizes`
  // (saisonform.js) und `waehleSpiele` (oben in dieser Datei).
  const grenze = Math.max(1, Math.round(Number(proSpieltag) || 1));
  const jeSpielerUndTag = new Map(); // `${userId}|${matchday}` -> Kandidaten
  for (const t of gueltig) {
    const key = `${t.userId}|${spieltagVonEintrag(t)}`;
    if (!jeSpielerUndTag.has(key)) jeSpielerUndTag.set(key, []);
    jeSpielerUndTag.get(key).push(t);
  }
  const zeit = (t) => {
    const ms = new Date(t.kickoff ?? NaN).getTime();
    return Number.isFinite(ms) ? ms : Infinity;
  };
  const gewaehlt = [];
  for (const kandidaten of jeSpielerUndTag.values()) {
    kandidaten.sort((a, b) => {
      const d = zeit(a) - zeit(b);
      if (d !== 0) return d;
      if (a.matchId == null || b.matchId == null) return 0;
      return a.matchId < b.matchId ? -1 : a.matchId > b.matchId ? 1 : 0;
    });
    gewaehlt.push(...kandidaten.slice(0, grenze));
  }

  const einsaetze = gewaehlt.map((t) => ({
    spieltag: spieltagVonEintrag(t),
    vonUserId: t.userId,
    aufUserId: t.tip.duell.auf,
    typ: t.tip.duell.typ,
    // 🔴 JK15 (Andi, 22.08.2026): „also alle Fremdjoker nur für einzelne
    // Spiele." Bis zum 23.08.2026 fiel `matchId` hier heraus — der Einsatz kam
    // ohne Spiel bei `applyDuellJoker` an und rechnete deshalb auf den ganzen
    // SPIELTAG. Der Übergangszustand war im Code sauber benannt, nur hatte
    // niemand die eine Zeile nachgetragen, die ihn beendet.
    //
    // ⚠️ Welches Spiel es ist, steht nicht zur Wahl: der Eingriff wird BEIM
    // TIPPEN eines bestimmten Spiels gesetzt, also ist es genau dieses. Alle
    // Spieler einer Runde tippen dieselben Spiele — der Schlüssel
    // `${aufUserId}#${matchId}` findet damit den Tipp des Ziels auf demselben
    // Spiel, und das ist Andis Modell: „muss eben bei seiner Tippabgabe
    // schauen, bei welchem Einzelspiel man den jeweiligen Joker einsetzt."
    matchId: t.matchId ?? null,
  }));

  // Chronologisch nach `spieltag` sortiert: `applyDuellJoker` deckelt
  // `maxProSaison` chronologisch (siehe dortiger Kommentar „damit
  // `maxProSaison` die SPÄTEREN Einsätze deckelt") — die Reihenfolge der
  // Rückgabe ist also bedeutungstragend, nicht nur kosmetisch.
  return einsaetze.sort((a, b) => (a.spieltag ?? 0) - (b.spieltag ?? 0));
}

// ── Anbindung an den Verlauf ────────────────────────────────
// `verlauf` = [{ wettbewerb, matchday, board }] (kumulativ, chronologisch),
// exakt wie `applySaisonform`. `einsaetze` = die tatsächlich gesetzten
// Duell-Joker: `[{ spieltag, vonUserId, aufUserId, typ, spielIds, basis }]`,
// wobei `spieltag` die Position im Verlauf ist (1-basiert). `basis` ist
// optional: ist sie eine endliche Zahl, ersetzt sie die Spieltagspunkte des
// Ziels als RECHENGRUNDLAGE (Abschnitt 8b (b) des Plans) — `nurGewinn` und
// „aus einem Minus lässt sich nichts klauen" gelten dann für `basis`, nicht
// für die Spieltagssumme. Fehlt `basis` (oder ist sie `undefined`), gilt der
// ganze Spieltag — das bisherige Verhalten. Der ABZUG beim Ziel wirkt in
// jedem Fall auf dessen volle Spieltagspunkte; `basis` bestimmt nur, WORAUF
// gerechnet wird, nicht WO abgezogen wird.
//
// Ohne aktive Regel oder ohne Einsätze wird der Verlauf UNVERÄNDERT
// zurückgegeben (`return verlauf`) — wie bei `applyCatchup` und
// `applySaisonform`.
// `sammeln` ist eine optionale Liste, in die die Einzel-Vorgänge geschrieben
// werden (siehe `duellVorgaenge`). Ohne sie verhält sich die Funktion exakt
// wie bisher — die Wertung bleibt unberührt.
export function applyDuellJoker(verlauf = [], rules = {}, einsaetze = [], sammeln = null, spielPunkte = null) {
  const cfg = sanitizeDuellJoker(rules?.duell);
  // 🔴 JK7 — das Familien-Dach. `eingriffe.enabled: false` schaltet ALLE vier
  // Fremdjoker aus, ohne dass an `duell` etwas verstellt werden muss (Andi:
  // „Büro-Runde nein, Freundesrunde ja"). Das Dach nimmt nur weg: es kann eine
  // Art nie einschalten, die für sich aus ist.
  const eg = sanitizeEingriffe(rules?.eingriffe);
  // Welche Art rechnet überhaupt? Vier Antworten, EINE Stelle.
  // ⚠️ `cfg.typen` gehört dazu: eine Runde mit `typen: ["block"]` hat den
  // Klau-Joker nicht — vor dem 23.08.2026 hätte ein Klau-Einsatz trotzdem
  // gerechnet, weil hier nur `cfg.enabled` gefragt wurde.
  const an = {
    klau: eg.enabled && cfg.enabled && cfg.typen.includes("klau"),
    block: eg.enabled && cfg.enabled && cfg.typen.includes("block"),
    trittbrett: eg.enabled && eg.trittbrett.enabled,
    gegenwette: eg.enabled && eg.gegenwette.enabled,
  };
  const liste = Array.isArray(einsaetze) ? einsaetze : [];
  if (!Object.values(an).some(Boolean)
    || !Array.isArray(verlauf) || verlauf.length === 0 || liste.length === 0) {
    return verlauf;
  }

  // Je Nutzer die Punkte JEDES Spieltags aus den kumulativen Ständen holen —
  // dieselbe Technik wie in `saisonform.js`, aus demselben Grund: der
  // Verlauf hält Summen, aber die Überweisung passiert INNERHALB eines
  // Spieltags.
  const proNutzer = new Map(); // userId -> [Punkte je Spieltag, chronologisch]
  verlauf.forEach((stufe, i) => {
    const vorher = i > 0 ? verlauf[i - 1].board : [];
    const vorSumme = new Map(vorher.map((z) => [z.userId, z.total]));
    for (const z of stufe.board) {
      if (!proNutzer.has(z.userId)) proNutzer.set(z.userId, []);
      proNutzer.get(z.userId).push(z.total - (vorSumme.get(z.userId) ?? 0));
    }
  });

  // 🔴 FREMDJOKER treffen EINZELNE SPIELE (Andi, 22.08.2026) — und rechnen
  // auf dem GRUNDWERT des getroffenen Tipps: der nackten Quoten-Wertung ohne
  // Joker, Derby, Big Game, Liga-Gewicht und Tabellen-Bonus (`punkteJeSpiel`
  // in engine.js erklärt, warum das EINE Regel statt einer Ausschlussliste
  // ist). Ohne diese Normierung wäre das schwerste Spiel des Spieltags immer
  // das lohnendste Ziel — und die Zielwahl keine Entscheidung mehr.
  //
  // ⚠️ Ein Einsatz OHNE `matchId` rechnet weiterhin auf den ganzen Spieltag.
  // Das ist der Übergangszustand, solange die Store-Anbindung fehlt; sobald
  // sie steht, erzeugt sie nur noch Einsätze MIT Spiel (design/
  // joker-sondermenue.md, JK15). Ein stiller Wechsel der Rechengrundlage wäre
  // schlimmer als der benannte Übergang.
  const grundwertVon = new Map();   // `${userId}#${matchId}` -> Grundwert
  for (const sp of Array.isArray(spielPunkte) ? spielPunkte : []) {
    if (sp && sp.matchId != null) grundwertVon.set(`${sp.userId}#${sp.matchId}`, sp.grundwert);
  }

  // Chronologisch anwenden, damit `maxProSaison` die SPÄTEREN Einsätze
  // deckelt — dieselbe Regel wie der Deckel in `ereignisse.js`.
  const geordnet = [...liste].sort((a, b) => (a.spieltag ?? 0) - (b.spieltag ?? 0));
  const gewonnenVon = new Map();          // vonUserId -> bereits gewonnene Punkte (Deckel)
  const deltaJeSpieltag = new Map();      // Verlaufsindex -> Map(userId -> Delta)
  const deckel = cfg.maxProSaison;        // 0 = kein Deckel

  for (const e of geordnet) {
    const idx = (Number(e.spieltag) || 0) - 1; // 1-basiert -> Index im Verlauf
    if (idx < 0 || idx >= verlauf.length) continue;
    if (!e.vonUserId || !e.aufUserId || e.vonUserId === e.aufUserId) continue;
    const vonTage = proNutzer.get(e.vonUserId);
    const aufTage = proNutzer.get(e.aufUserId);
    if (!vonTage || !aufTage) continue;
    const zielVoll = aufTage[idx] ?? 0;
    // `basis` (Abschnitt 8b (b)) ersetzt die Spieltagspunkte des Ziels als
    // RECHENGRUNDLAGE, wenn sie eine endliche Zahl ist. Der spätere ABZUG
    // wirkt trotzdem auf `zielVoll` (die vollen Spieltagspunkte) — `basis`
    // bestimmt nur, WORAUF gerechnet wird, nicht WO abgezogen wird.
    // Reihenfolge der Rechengrundlage:
    //   1. ein ausdrücklich mitgegebenes `basis` (Abschnitt 8b (b)),
    //   2. der GRUNDWERT des getroffenen Einzelspiels (der Normalfall, s.o.),
    //   3. die Spieltagspunkte (Übergang, solange kein Spiel benannt ist).
    // Der spätere ABZUG wirkt in allen drei Fällen auf `zielVoll` — die
    // Grundlage bestimmt, WORAUF gerechnet wird, nicht WO abgezogen wird.
    const ausSpiel = e.matchId != null
      ? grundwertVon.get(`${e.aufUserId}#${e.matchId}`)
      : undefined;
    const zielPunkte = Number.isFinite(e.basis) ? e.basis
      : Number.isFinite(ausSpiel) ? ausSpiel
      : zielVoll;

    if (!an[e.typ]) continue;
    // 🔴 JK14: ein geschütztes Spiel ist unantastbar. Die Marke setzt
    // `fremdEinsaetze` (fremdjoker.js) — hier wird sie nur befolgt. Ein
    // Einsatz mit dieser Marke bleibt in der Liste (er zählt gegen das
    // Kontingent), wirkt aber nicht.
    if (e.geschuetzt) continue;

    let transfer = 0; // was der Von-Nutzer bekommt (vor dem Deckel)
    let abzug = 0;     // was der Ziel-Nutzer verliert — UNABHÄNGIG vom Deckel

    if (e.typ === "klau") {
      // Aus einem Minus lässt sich nichts klauen.
      if (zielPunkte <= 0) continue;
      transfer = zielPunkte * cfg.klau.anteil;
    } else if (e.typ === "block") {
      // Die Falle aus dem Kopfkommentar: ohne `nurGewinn` würde ein Block auf
      // einen Spieltag im Minus den Verlust halbieren statt ihn zu treffen.
      const wirkt = cfg.block.nurGewinn ? zielPunkte > 0 : true;
      if (!wirkt) continue;
      abzug = zielPunkte * (1 - cfg.block.restanteil);
      transfer = abzug * cfg.block.beute;
    } else if (e.typ === "trittbrett") {
      // 🔴 TRITTBRETTFAHRER (J4, „Andis Wunsch"): man hängt sich an einen
      // fremden Tipp und bekommt einen Anteil dessen, was er bringt.
      //
      // ⚠️ Dieselbe Kante wie beim Klau, aus demselben Grund: aus einem Minus
      // lässt sich nichts mitnehmen. Ohne diese Zeile wäre der Trittbrettfahrer
      // auf einen schlechten Tipp ein GEWINN für den Kopierer — er bekäme
      // einen Anteil an einem negativen Wert, also ein Plus.
      if (zielPunkte <= 0) continue;
      transfer = zielPunkte * eg.trittbrett.anteil;
      // 🔴 „Es muss wehtun" (J4). Der Preis steckt im Anteil unter 100 % —
      // und `kopierterBekommt` dreht die Richtung um: der KOPIERTE bekommt
      // einen Aufschlag dafür, dass jemand auf ihn setzt. Ein negativer
      // `abzug` ist ein Plus für das Ziel; die Rechnung darunter ist dieselbe.
      abzug = -transfer * eg.trittbrett.kopierterBekommt;
    } else if (e.typ === "gegenwette") {
      // 🔴 GEGENWETTE (Teil E): das umgekehrte Modell. Sie rechnet als
      // EINZIGE nicht auf den Punkten des Ziels, sondern auf einem EINSATZ und
      // der Gegenquote `1/(1−p)`. `p` und `getroffen` kommen fertig am Einsatz
      // an — berechnet wird beides in `fremdjoker.js`, wo Tipp und Quoten-
      // Schnappschuss zusammenliegen (diese Datei kennt beide nicht).
      //
      // ⚠️ Fehlt `p` (ein Einsatz aus einer Zeit ohne Anreicherung, ein Spiel
      // ohne brauchbares Raster), ist der Ertrag 0 und der Einsatz verpufft —
      // ausdrücklich KEIN stiller Rückfall auf die Spieltagspunkte. Eine
      // Gegenwette, die plötzlich wie ein Klau rechnete, wäre die schlimmere
      // Sorte Fehler: sie fiele niemandem auf.
      transfer = gegenwetteErtrag({ einsatz: eg.gegenwette.einsatz, p: e.p, getroffen: e.getroffen });
      if (transfer === 0) continue;
      // Nullsumme: was der eine gewinnt, fehlt dem anderen — und andersherum.
      // Bei `topf` (Vorgabe) bleibt der Getippte unberührt, die Wette läuft
      // gegen die Runde statt gegen ihn.
      if (eg.gegenwette.modus === "nullsumme") abzug = transfer;
    } else {
      continue;
    }

    // Deckel wirkt nur auf das GEWINNEN, nicht auf die Wirkung beim Ziel.
    if (deckel > 0 && transfer > 0) {
      const bisher = gewonnenVon.get(e.vonUserId) ?? 0;
      const frei = Math.max(0, deckel - bisher);
      if (transfer > frei) transfer = frei;
    }
    if (transfer > 0) gewonnenVon.set(e.vonUserId, (gewonnenVon.get(e.vonUserId) ?? 0) + transfer);

    // Nullsumme (Klau): das Ziel verliert genau das, was NACH dem Deckel
    // tatsächlich beim Klauer ankommt — nicht den rohen, ungedeckelten Betrag.
    if (e.typ === "klau" && cfg.klau.modus === "nullsumme") abzug = transfer;

    if (transfer === 0 && abzug === 0) continue;

    // 🔴 Was genau passiert ist, für die ANZEIGE. Bis 06.08.2026 zeigte das
    // Ranking nur die Nettosumme („−340 Duell") — bei einer Mechanik, deren
    // ganzer Sinn ist, dass ein ANDERER es war, ist das die halbe Nachricht.
    // Der Screen darf es nicht selbst nachrechnen (Runden-Schicht, Frage 4),
    // also fällt es hier ab, wo es ohnehin entsteht.
    if (Array.isArray(sammeln)) sammeln.push({
      spieltag: e.spieltag ?? idx + 1,
      typ: e.typ,
      vonUserId: e.vonUserId,
      aufUserId: e.aufUserId,
      // `gewinn` ist das, was NACH dem Deckel beim Angreifer ankommt,
      // `verlust` was das Ziel wirklich abgibt. Bei Nullsumme sind beide
      // gleich, bei einem Block ohne Beute ist `gewinn` 0 — und genau dieser
      // Unterschied ist die Aussage: „er hat dir etwas weggenommen" ist
      // etwas anderes als „er hat dich gedämpft".
      //
      // 🔴 UNGERUNDET. Eine erste Fassung rundete hier jeden Einzelposten —
      // und dann ergab die Summe der Vorgänge eines Spielers 1123, während im
      // Ranking 1122 stand. Genau die Fehlerklasse, für die es in
      // `breakdown.js` die Zeile „Rundung" gibt: die Wertung addiert die
      // rohen Werte und rundet EINMAL am Ende. Wer die Liste zeigt, rundet
      // jede Zeile für sich, bildet die SUMME aber aus den rohen Werten.
      gewinn: transfer,
      verlust: abzug,
    });

    if (!deltaJeSpieltag.has(idx)) deltaJeSpieltag.set(idx, new Map());
    const tag = deltaJeSpieltag.get(idx);
    tag.set(e.aufUserId, (tag.get(e.aufUserId) ?? 0) - abzug);
    if (transfer !== 0) tag.set(e.vonUserId, (tag.get(e.vonUserId) ?? 0) + transfer);
  }

  if (deltaJeSpieltag.size === 0) return verlauf;

  // Deltas in die Spieltagspunkte einrechnen, dann neu aufsummieren.
  for (const [idx, tag] of deltaJeSpieltag) {
    for (const [userId, delta] of tag) {
      const tage = proNutzer.get(userId);
      if (tage) tage[idx] = (tage[idx] ?? 0) + delta;
    }
  }

  return verlauf.map((stufe, i) => ({
    ...stufe,
    board: stufe.board
      .map((z) => {
        const tage = proNutzer.get(z.userId) ?? [];
        const total = tage.slice(0, i + 1).reduce((s, p) => s + p, 0);
        // 🔴 GERUNDET, wie in `applySaisonform`. Der Klau-Anteil ist ein Bruch
        // (0,35 von 954 Punkten), und der Wert landet direkt im Ranking —
        // gemessen am 06.08.2026 stand dort „3339.6" in einer Tabelle, in der
        // jede andere Zahl ganzzahlig ist. Dieselbe Stelle wie dort: hier und
        // nicht in der Anzeige, sonst rechnete der Abstand zum Nächsten mit
        // einem anderen Wert als der angezeigte.
        const gerundet = Math.round(total);
        return {
          ...z, total: gerundet,
          // Was das Duell an dieser Zeile verändert hat — die Marke, ohne die
          // ein Spieler eine Summe sieht, zu der seine Tipps nicht führen.
          // Dieselbe Begründung wie bei `form`/`bonus`/`gestrichenPunkte`.
          duell: gerundet - Math.round(z.total),
        };
      })
      .sort((a, b) => b.total - a.total || String(a.name ?? "").localeCompare(String(b.name ?? ""))),
  }));
}

// ── Wer hat wen getroffen, und was hat es gekostet? ─────────
// 🔴 Dieselbe Rechnung wie `applyDuellJoker`, nur die andere Hälfte des
// Ergebnisses. Bewusst KEIN zweiter Durchlauf mit eigener Logik: die Beträge
// hängen am Deckel, an der Reihenfolge und am Nullsummen-Modus, und eine
// zweite Fassung davon liefe unweigerlich auseinander — genau die Klasse
// Fehler, aus der die 17 Funde vom 05.08. kamen.
//
// Gibt eine flache, chronologische Liste zurück; wer sie je Spieler bündeln
// will, tut das beim Anzeigen.
export function duellVorgaenge(verlauf = [], rules = {}, einsaetze = []) {
  const gesammelt = [];
  applyDuellJoker(verlauf, rules, einsaetze, gesammelt);
  return gesammelt;
}

// ── Konflikte mit anderen Regeln ────────────────────────────
// `klau.modus: "mitverdienen"` und `maxProSaison: 0` zusammen sind der neue
// Punkte-Kanal, den der Kopfkommentar ausschließt — Kombinationsregel aus
// Abschnitt 6 des Plans.
export function konflikte(rules) {
  const cfg = sanitizeDuellJoker(rules?.duell);
  const eg = sanitizeEingriffe(rules?.eingriffe);
  const out = [];

  // 🔴 Der Trittbrettfahrer ist derselbe Fall in neuem Gewand: er nimmt dem
  // Kopierten NICHTS weg (die Vorgabe `kopierterBekommt: 0` gibt ihm sogar
  // noch etwas dazu) und schreibt dem Kopierer trotzdem Punkte gut. Ohne
  // Deckel ist das der zweite Punkte-Kanal, den der Kopfkommentar dieser
  // Datei ausschließt — nur ohne den Umweg über `klau.modus`. Ein Kanal, der
  // an `modCap` vorbeigreift, bleibt einer, egal welche Art ihn öffnet.
  if (eg.enabled && eg.trittbrett.enabled && cfg.maxProSaison === 0) {
    out.push({
      key: "trittbrett-ohne-deckel",
      korrigieren: true,
      text: "Der Trittbrettfahrer schreibt Punkte gut, ohne dass sie jemandem fehlen — ohne "
        + "Saison-Deckel ist das ein ungedeckelter zweiter Punkte-Kanal. Ein `maxProSaison` "
        + "größer 0 setzen (er gilt für die ganze Fremdjoker-Familie).",
    });
  }

  // ⚠️ Die Gegenwette braucht diese Bremse NICHT, und das ist kein Versehen:
  // sie kostet einen EINSATZ (JK10) und zahlt nach der Gegenquote `1/(1−p)`
  // (JK9). Wer das Sichere abgrast, gewinnt ein Prozent und riskiert alles —
  // das Modell reguliert sich selbst, siehe `gegenquote` in `eingriffe.js`.

  if (!cfg.enabled || !eg.enabled) return out;
  if (cfg.klau.modus === "mitverdienen" && cfg.maxProSaison === 0) {
    out.push({
      key: "duell-mitverdienen-ohne-deckel",
      korrigieren: true,
      text: "„Mitverdienen“ ohne Saison-Deckel ist ein neuer Punkte-Kanal: das Ziel behält seine Punkte, der Klauer bekommt trotzdem welche dazu — ungedeckelt. Entweder `klau.modus: \"nullsumme\"` oder ein `maxProSaison` größer 0 setzen.",
    });
  }
  return out;
}

// Ein Satz für die UI, Muster `beschreibeVerteilung`.
export function beschreibeDuell(duell, spieltage = 34) {
  const cfg = sanitizeDuellJoker(duell);
  if (!cfg.enabled) return "Keine Duell-Joker in dieser Runde.";
  const fenster = fensterVon(cfg, spieltage);
  const typenText = cfg.typen.length === 2
    ? "Klau- und Block-Joker"
    : (cfg.typen[0] === "block" ? "Block-Joker" : "Klau-Joker");
  return `${typenText}: jeder bekommt ${cfg.anzahl} zwischen Spieltag ${fenster.von} und ${fenster.bis}.`;
}
