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
export function zulaessigeZiele(board = [], userId, duell, { bisherigeEinsaetze = [], aktuellerSpieltag = null } = {}) {
  const cfg = sanitizeDuellJoker(duell);
  const liste = Array.isArray(board) ? board : [];
  const sortiert = [...liste].sort((a, b) => b.total - a.total);
  const mich = sortiert.find((b) => b.userId === userId);

  let kandidaten = sortiert.filter((b) => b.userId !== userId);

  if (cfg.zielWahl === "nurVorne") {
    const meinTotal = mich?.total ?? -Infinity;
    kandidaten = kandidaten.filter((b) => b.total > meinTotal);
  } else if (cfg.zielWahl === "nurTop3") {
    const top3 = new Set(sortiert.slice(0, 3).map((b) => b.userId));
    kandidaten = kandidaten.filter((b) => top3.has(b.userId));
  } else if (cfg.zielWahl === "nichtLetzter") {
    const letzterId = sortiert[sortiert.length - 1]?.userId;
    kandidaten = kandidaten.filter((b) => b.userId !== letzterId);
  }
  // "frei": keine weitere Einschränkung.

  const treffer = new Map();        // zielId -> Anzahl bisheriger Treffer
  const letzterTreffer = new Map(); // zielId -> Spieltag des letzten Treffers
  for (const e of Array.isArray(bisherigeEinsaetze) ? bisherigeEinsaetze : []) {
    if (e.vonUserId !== userId) continue;
    treffer.set(e.aufUserId, (treffer.get(e.aufUserId) ?? 0) + 1);
    const bis = letzterTreffer.get(e.aufUserId);
    if (bis == null || e.spieltag > bis) letzterTreffer.set(e.aufUserId, e.spieltag);
  }

  return kandidaten
    .filter((b) => (treffer.get(b.userId) ?? 0) < cfg.maxProZiel)
    .filter((b) => {
      if (cfg.immun <= 0 || aktuellerSpieltag == null) return true;
      const letzt = letzterTreffer.get(b.userId);
      return letzt == null || aktuellerSpieltag - letzt >= cfg.immun;
    })
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
export function einsaetzeAusTipps(tipps = [], { spieltagVon = null } = {}) {
  const liste = Array.isArray(tipps) ? tipps : [];

  const gueltig = liste.filter((t) => {
    const d = t?.tip?.duell;
    if (!d || d.auf == null) return false;
    if (!DUELL_TYPEN.some((x) => x.key === d.typ)) return false;
    if (d.auf === t.userId) return false;
    if (spieltagVon != null && Number(t.matchday) < spieltagVon) return false;
    return true;
  });

  // Je Spieler (`userId`) UND Spieltag (`matchday`) höchstens EIN Einsatz.
  // Bei mehreren Kandidaten gewinnt der mit dem frühesten `kickoff`; bei
  // Gleichstand die kleinere `matchId`. Bewusst NICHT „der erste Eintrag in
  // der Liste gewinnt" — sonst hinge das Ergebnis an der Reihenfolge, in der
  // die Tipps aus der Datenbank kommen, statt an ihren eigenen Daten.
  // Dieselbe Regel wie beim Gleichstand in `streichIndizes` (saisonform.js)
  // und `waehleSpiele` (oben in dieser Datei).
  const jeSpielerUndTag = new Map(); // `${userId}|${matchday}` -> bester Kandidat
  for (const t of gueltig) {
    const key = `${t.userId}|${t.matchday}`;
    const bisher = jeSpielerUndTag.get(key);
    if (!bisher) {
      jeSpielerUndTag.set(key, t);
      continue;
    }
    const kickoffNeu = new Date(t.kickoff ?? NaN).getTime();
    const kickoffAlt = new Date(bisher.kickoff ?? NaN).getTime();
    if (kickoffNeu < kickoffAlt) {
      jeSpielerUndTag.set(key, t);
    } else if (kickoffNeu === kickoffAlt
      && t.matchId != null && bisher.matchId != null && t.matchId < bisher.matchId) {
      jeSpielerUndTag.set(key, t);
    }
  }

  const einsaetze = [...jeSpielerUndTag.values()].map((t) => ({
    spieltag: t.matchday,
    vonUserId: t.userId,
    aufUserId: t.tip.duell.auf,
    typ: t.tip.duell.typ,
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
export function applyDuellJoker(verlauf = [], rules = {}, einsaetze = []) {
  const cfg = sanitizeDuellJoker(rules?.duell);
  const liste = Array.isArray(einsaetze) ? einsaetze : [];
  if (!cfg.enabled || !Array.isArray(verlauf) || verlauf.length === 0 || liste.length === 0) {
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
    const zielPunkte = Number.isFinite(e.basis) ? e.basis : zielVoll;

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
        return { ...z, total: +total.toFixed(2) };
      })
      .sort((a, b) => b.total - a.total || String(a.name ?? "").localeCompare(String(b.name ?? ""))),
  }));
}

// ── Konflikte mit anderen Regeln ────────────────────────────
// `klau.modus: "mitverdienen"` und `maxProSaison: 0` zusammen sind der neue
// Punkte-Kanal, den der Kopfkommentar ausschließt — Kombinationsregel aus
// Abschnitt 6 des Plans.
export function konflikte(rules) {
  const cfg = sanitizeDuellJoker(rules?.duell);
  const out = [];
  if (!cfg.enabled) return out;
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
