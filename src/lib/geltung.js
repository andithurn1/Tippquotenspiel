// ============================================================
//  WIE LANGE GILT ES? — die Geltungs-Achse der Regel-Grammatik
//
//  Die vier Satzglieder sind WANN (`ausloeser.js`) → WEN (`auswahl.js`) →
//  WAS (`wirkung.js`) → WIE LANGE (diese Datei). Damit ist die letzte der vier
//  herausgelöst.
//
//  ── 🔴 Warum das eine ERLAUBNIS ist und keine Punkte ──
//  Die drei Achsen davor beantworten „ob", „wer" und „was". Diese hier
//  beantwortet als einzige eine Frage über die ZEIT: an welchen Spieltagen
//  wirkt das, was gerade zugesprochen wurde? Sie erzeugt selbst nichts — sie
//  verschiebt und streckt, was `wirkung.js` liefert.
//
//  Das ist der Unterschied, an dem die Grammatik hängt. Ohne diese Achse gilt
//  jede Wirkung genau am Spieltag, an dem sie entstanden ist, und drei der
//  sechs Wünsche aus der Roadmap sind unbaubar: der Pechvogel-Bonus („+20 %
//  am NÄCHSTEN Spieltag"), die Jokerjagd („ein Sonderspiel über DREI
//  Spieltage") und alles, was einen Zustand über mehrere Spieltage hält.
//
//  ── ⚠️ Die Vorgabe ändert nichts ──
//  `{ typ: "sofort" }` ist genau das heutige Verhalten. Jedes bestehende
//  Regelwerk und jeder geteilte Creator-Code verhält sich unverändert —
//  dieselbe Regel wie bei `{ typ: "immer" }` (WANN) und `{ typ: "joker" }`
//  (WAS).
//
//  ── 🔴 Der Vertrag mit `wirkung.js`: EINMALIG oder DURCHGEHEND ──
//  Ein Fenster über drei Spieltage heißt bei einem AUFSCHLAG etwas anderes als
//  bei einer festen GUTSCHRIFT:
//
//  | Wirkung | über ein Fenster von n Spieltagen |
//  |---|---|
//  | `bonus` / `malus` (Faktor) | wirkt an JEDEM der n Spieltage |
//  | `punkte` / `umverteilung` | wird EINMAL gezahlt, am Beginn des Fensters |
//  | `joker` | darf innerhalb der n Spieltage eingesetzt werden |
//
//  Das ist keine Feinheit, sondern die Grenze, die `wirkung.js` im
//  Kopfkommentar zieht: **keine Wirkung macht einen neuen Punkte-Kanal auf.**
//  Eine feste Gutschrift n-mal auszuzahlen wäre genau das — der Admin stellt
//  ein Fenster ein und bekommt eine Multiplikation. Ein FAKTOR dagegen ist von
//  Natur aus begrenzt (`WIRKUNG_LIMITS.prozent`) und darf deshalb über die
//  Zeit laufen. Wer diese Zeile umdreht, baut den einen Kanal, den die
//  Wirkungs-Achse ausschließt.
//
//  ── ⚠️ `jackpot` ist der einzige Typ mit einer PFLICHT-Obergrenze ──
//  „Holt es niemand, wächst es und wandert weiter" ist die Mechanik, die einen
//  einzelnen Spieltag über die Saison entscheiden lässt — steht so schon als
//  Warnung in der Roadmap. Deshalb hat `maxFaktor` KEINEN Aus-Wert: die
//  Untergrenze ist 1,5, nicht 0. Bei `wirkung.punkte.maxProSaison` ist 0 („kein
//  Deckel") erlaubt und `konflikte()` warnt davor; hier wäre dieselbe Freiheit
//  sinnlos, weil der Topf bauartbedingt unbegrenzt wächst und nicht erst durch
//  eine ungünstige Einstellung.
//
//  ── Nicht zu verwechseln mit `jokerBasis.verfall` ──
//  `jokerBasis.verfall` (`periode`/`saison`/`wandert`) ist die GRUNDFORM aller
//  Joker einer Runde — eine Eigenschaft des Jokers. `geltung` gehört zu EINER
//  Regel und sagt, wie lange das gilt, was DIESE Regel zugesprochen hat. Zwei
//  Runden können denselben Joker-Verfall haben und trotzdem verschiedene
//  Geltungen je Ereignis. Wer beides vermischt, hat zwei Wahrheiten über
//  dieselbe Frage — und die Runden-Schicht warnt genau davor.
//
//  Reine Funktionen, UI-frei. Dieses Modul WERTET NICHT: es sagt, WANN etwas
//  gilt, nicht was es zahlt.
// ============================================================

// Was eine Geltung an Infrastruktur voraussetzt. Alles darüber hinaus gibt es
// noch nicht — gleiches Muster wie `VERFUEGBARE_DATEN` (Auslöser) und
// `VERFUEGBARE_MITTEL` (Wirkung).
export const VERFUEGBARE_MITTEL = ["spieltag", "verlauf"];

export const GELTUNG_TYPEN = [
  {
    key: "sofort", label: "Sofort", braucht: [], parameter: [],
    standard: {}, einmalig: true,
    text: "Gilt an dem Spieltag, an dem es entstanden ist. Das heutige Verhalten.",
  },
  {
    key: "naechsterSpieltag", label: "Nächster Spieltag",
    braucht: ["spieltag"], parameter: [],
    standard: {}, einmalig: true,
    text: "Wirkt erst am folgenden Spieltag — für alles, was eine Ansage vorher ist.",
  },
  {
    key: "fenster", label: "Über mehrere Spieltage",
    braucht: ["spieltag"], parameter: ["n"],
    standard: { n: 3 }, einmalig: false,
    text: "Ein Zustand, der n Spieltage anhält. Der Fall Miniwettspiel.",
  },
  {
    key: "rest", label: "Bis Saisonende",
    braucht: ["spieltag"], parameter: [], standard: {}, einmalig: false,
    text: "Bleibt bis zum letzten Spieltag bestehen.",
  },
  {
    key: "bisAusgeloest", label: "Bis eingelöst",
    braucht: ["spieltag"], parameter: [], standard: {}, einmalig: true,
    text: "Kein Ablaufdatum, aber nur EINMAL — man hebt es sich auf.",
  },
  {
    key: "jackpot", label: "Jackpot",
    braucht: ["spieltag", "verlauf"], parameter: ["zuwachs", "maxFaktor"],
    standard: { zuwachs: 25, maxFaktor: 3 }, einmalig: true,
    text: "Holt es niemand, wächst es und wandert weiter — bis zur Obergrenze.",
  },
  // ── Vorbereitet, aber ohne Grundlage ──
  // Beide brauchen dasselbe wie ihre Geschwister in den anderen Achsen:
  // Bestandsverwaltung (wie `tausch` in `wirkung.js`) bzw. eine Abstimmung
  // (wie `abstimmung` in `ausloeser.js`). Sie stehen im Katalog, damit die
  // Struktur sichtbar ist, und lassen sich nicht einstellen.
  {
    key: "handelbar", label: "Weitergebbar",
    braucht: ["bestand"], parameter: [], standard: {}, einmalig: true,
    text: "Gilt, bis es jemand einlöst — und darf vorher weitergegeben werden.",
  },
  {
    key: "bisWiderruf", label: "Bis die Runde es abwählt",
    braucht: ["abstimmung"], parameter: [], standard: {}, einmalig: false,
    text: "Gilt, bis die Runde per Abstimmung etwas anderes beschließt.",
  },
];

export const GELTUNG = Object.fromEntries(GELTUNG_TYPEN.map((g) => [g.key, g]));

export function istAuswertbar(key) {
  const g = GELTUNG[key];
  return !!g && g.braucht.every((b) => VERFUEGBARE_MITTEL.includes(b));
}

export const AUSWERTBARE_GELTUNGEN = GELTUNG_TYPEN.filter((g) => istAuswertbar(g.key));

export const GELTUNG_LIMITS = {
  n: { min: 2, max: 10, step: 1 },
  // Zuwachs je Spieltag, an dem NIEMAND es geholt hat.
  zuwachs: { min: 5, max: 100, step: 5 },
  // 🔴 Die Pflicht-Obergrenze. `min` ist bewusst 1,5 und nicht 0 — siehe
  // Kopfkommentar. Ein Jackpot ohne Deckel ist kein eingestellter Extremwert,
  // sondern eine offene Multiplikation.
  maxFaktor: { min: 1.5, max: 5, step: 0.5 },
};

export const DEFAULT_GELTUNG = { typ: "sofort" };

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// ── Sanitize ────────────────────────────────────────────────
// Muster `sanitizeAusloeser`: unbekannter oder unfertiger Typ fällt auf
// „sofort" zurück, Zahlen werden beschnitten, und gesetzt werden NUR die
// Parameter des jeweiligen Typs — ein Feld, das nichts tut, wird beim nächsten
// Lesen für eine Einstellung gehalten.
export function sanitizeGeltung(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const typ = istAuswertbar(p.typ) ? p.typ : DEFAULT_GELTUNG.typ;
  const g = GELTUNG[typ];
  const out = { typ };
  for (const feld of g.parameter) {
    const grenze = GELTUNG_LIMITS[feld];
    const roh = clamp(p[feld], grenze, g.standard[feld]);
    out[feld] = grenze.step < 1 ? +roh.toFixed(1) : Math.round(roh);
  }
  return out;
}

// ── Das Fenster, in dem etwas gilt ──────────────────────────
// `position` ist die 1-basierte Stelle des Spieltags im Verlauf DER RUNDE —
// nicht der Liga-Spieltag. Dieselbe Größe wie bei `feuert()`, aus demselben
// Grund: über den Liga-Spieltag gerechnet läge „nächster Spieltag" in einer
// Runde über fünf Wettbewerbe fünfmal parallel.
//
// 🔴 Ohne verwertbare Position gibt es KEIN Fenster (`null`), nicht ein
// Fenster ab 0. Dieselbe Regel wie „fehlende Daten heißen NEIN" bei den
// Auslösern — und dieselbe Falle, die dort schon einmal zugeschlagen hat:
// `Number(null) === 0`, und ein Fenster ab Spieltag 0 sähe aus wie eines, das
// von Anfang an gilt.
//
// `spieltageGesamt` begrenzt nach hinten. Fehlt es, bleibt das Fenster offen
// (`bis: null`) statt an einer geratenen Saisonlänge zu enden.
export function geltungsfenster({ geltung, position = null, spieltageGesamt = null } = {}) {
  const g = sanitizeGeltung(geltung);
  const pos = (position === null || position === undefined) ? NaN : Number(position);
  if (!Number.isFinite(pos) || pos < 1) return null;

  const gesamt = Number(spieltageGesamt);
  const ende = Number.isFinite(gesamt) && gesamt >= 1 ? Math.floor(gesamt) : null;
  const p = Math.floor(pos);
  const deckeln = (x) => (ende == null ? x : Math.min(x, ende));

  switch (g.typ) {
    case "naechsterSpieltag": {
      const von = p + 1;
      // ⚠️ Der letzte Spieltag hat keinen nächsten. Das Fenster ist dann LEER
      // und nicht etwa der letzte Spieltag selbst — sonst bekäme ein
      // Pechvogel-Bonus am Saisonende stillschweigend die Wirkung von
      // „sofort", und der Admin sähe eine Regel, die am Ende die Seite
      // wechselt.
      if (ende != null && von > ende) return { von: null, bis: null, dauer: 0, offen: false };
      return { von, bis: von, dauer: 1, offen: false };
    }
    case "fenster": {
      const bis = deckeln(p + g.n - 1);
      return { von: p, bis, dauer: bis - p + 1, offen: false };
    }
    case "rest": {
      if (ende == null) return { von: p, bis: null, dauer: null, offen: true };
      return { von: p, bis: ende, dauer: ende - p + 1, offen: false };
    }
    // Kein Ablaufdatum: das Fenster reicht bis zum Saisonende, und was es
    // beendet, ist die Einlösung — die kennt nur der Store (dieselbe
    // Arbeitsteilung wie beim Einfrieren ab Anpfiff).
    case "bisAusgeloest": {
      if (ende == null) return { von: p, bis: null, dauer: null, offen: true };
      return { von: p, bis: ende, dauer: ende - p + 1, offen: true };
    }
    // Der Jackpot zahlt an dem Spieltag, an dem er fällt — größer, nicht
    // länger. Seine Zeitachse steckt in `jackpotFaktor`.
    case "jackpot":
      return { von: p, bis: p, dauer: 1, offen: false };
    case "sofort":
    default:
      return { von: p, bis: p, dauer: 1, offen: false };
  }
}

// Gilt etwas, das an `erworbenAn` entstanden ist, an `position`?
export function giltAn({ geltung, erworbenAn, position, spieltageGesamt = null } = {}) {
  const f = geltungsfenster({ geltung, position: erworbenAn, spieltageGesamt });
  if (!f || f.von == null) return false;
  const p = Number(position);
  if (!Number.isFinite(p)) return false;
  if (p < f.von) return false;
  return f.bis == null || p <= f.bis;
}

// An WELCHEN Spieltagen wirkt es? Für Faktor-Wirkungen sind das alle Spieltage
// des Fensters, für einmalige nur der erste — der Vertrag aus dem
// Kopfkommentar, an EINER Stelle ausgerechnet statt an jedem Aufrufer.
//
// `istFaktor` sagt, ob die Wirkung ein Faktor ist (bonus/malus). Die
// Entscheidung liegt bewusst beim Aufrufer und nicht in dieser Datei: die
// Wirkungs-Typen kennt `wirkung.js`, und ein zweiter Katalog hier wäre die
// zweite Wahrheit.
export function wirkSpieltage({ geltung, position, spieltageGesamt = null, istFaktor = false } = {}) {
  const f = geltungsfenster({ geltung, position, spieltageGesamt });
  if (!f || f.von == null) return [];
  const g = sanitizeGeltung(geltung);
  if (!istFaktor || GELTUNG[g.typ].einmalig) return [f.von];
  // Ohne bekanntes Ende lässt sich ein durchgehendes Fenster nicht auflösen —
  // dann lieber nur der Startpunkt als eine geratene Liste.
  if (f.bis == null) return [f.von];
  const out = [];
  for (let p = f.von; p <= f.bis; p++) out.push(p);
  return out;
}

// ── Der Jackpot ─────────────────────────────────────────────
// Wächst um `zuwachs` Prozent je Spieltag, an dem er NICHT ausgeschüttet
// wurde, und ist bei `maxFaktor` zu Ende. `luecke` ist die Zahl dieser
// Spieltage — 0 heißt „letzte Woche ist er schon gefallen", der Faktor ist
// dann 1.
export function jackpotFaktor(geltung, luecke = 0) {
  const g = sanitizeGeltung(geltung);
  if (g.typ !== "jackpot") return 1;
  const n = Math.max(0, Math.floor(Number(luecke) || 0));
  return Math.min(g.maxFaktor, 1 + (g.zuwachs / 100) * n);
}

// Der ganze Verlauf: zu jeder Ausschüttung der Faktor, mit dem sie fällt.
//
// 🔴 Die Lücke zählt ab der letzten AUSSCHÜTTUNG, nicht ab Saisonstart. Sonst
// wüchse der Topf auch dann weiter, wenn er gerade geleert wurde — und die
// zweite Ausschüttung wäre größer als die erste, ohne dass etwas liegen
// geblieben wäre. Vor der ersten Ausschüttung zählt der Saisonanfang als
// letzter Stand (Position 0), damit ein Jackpot, der erst spät fällt, das
// Liegenbleiben davor tatsächlich mitnimmt.
export function jackpotVerlauf(geltung, positionen = []) {
  const g = sanitizeGeltung(geltung);
  const sortiert = [...new Set(positionen.map(Number).filter((p) => Number.isFinite(p) && p >= 1))]
    .sort((a, b) => a - b);
  if (g.typ !== "jackpot") return sortiert.map((position) => ({ position, luecke: 0, faktor: 1 }));

  let vorher = 0;
  return sortiert.map((position) => {
    const luecke = Math.max(0, position - vorher - 1);
    vorher = position;
    return { position, luecke, faktor: jackpotFaktor(g, luecke) };
  });
}

// Nach wie vielen leeren Spieltagen ist der Deckel erreicht? Speist die
// Vorschau: „ab dem 8. Spieltag ohne Ausschüttung wächst nichts mehr" ist eine
// Aussage, die ein Admin nachrechnen kann — „maxFaktor 3" nicht.
export function jackpotDeckelNach(geltung) {
  const g = sanitizeGeltung(geltung);
  if (g.typ !== "jackpot") return null;
  return Math.ceil((g.maxFaktor - 1) / (g.zuwachs / 100));
}

// ── Ein Satz für die Oberfläche ─────────────────────────────
// Muster `beschreibeAusloeser`/`beschreibeWirkung`: nicht der Feldname,
// sondern das, was gilt.
export function beschreibeGeltung(geltung) {
  const g = sanitizeGeltung(geltung);
  switch (g.typ) {
    case "sofort": return "an dem Spieltag, an dem es entsteht";
    case "naechsterSpieltag": return "erst am nächsten Spieltag";
    case "fenster": return `${g.n} Spieltage lang`;
    case "rest": return "bis zum Saisonende";
    case "bisAusgeloest": return "ohne Ablaufdatum, aber nur einmal";
    case "jackpot":
      return `wächst um ${g.zuwachs} % je Spieltag ohne Ausschüttung, höchstens auf das `
        + `${String(g.maxFaktor).replace(".", ",")}-Fache`;
    default: return GELTUNG[g.typ]?.label ?? "";
  }
}

// Wie viele Spieltage deckt eine einzelne Zusprechung ab? Speist die
// Live-Vorschau — dieselbe Rolle wie `haeufigkeit()` bei der WANN-Achse und
// `trefferAnteil()` bei der WEN-Achse.
//
// ⚠️ Bei `rest` und `bisAusgeloest` hängt die Antwort daran, WANN es entsteht.
// Deshalb ein ausdrücklich genannter Beispiel-Spieltag (Mitte der Saison)
// statt einer erfundenen Zahl — dieselbe Ehrlichkeit wie `BEISPIEL_RUNDE` bei
// der Auswahl-Vorschau. Der Aufrufer nennt die Annahme im Text.
export function reichweite(geltung, spieltage = 34, position = null) {
  const g = sanitizeGeltung(geltung);
  const n = Math.max(1, Math.floor(Number(spieltage) || 34));
  // ⚠️ `null` und `undefined` ausdrücklich prüfen, NICHT über `Number()`:
  // `Number(null) === 0` und `Number.isFinite(0)` ist wahr — der Vorgabewert
  // wäre damit Spieltag 0, und `geltungsfenster` gäbe für JEDE Geltung `null`
  // zurück. Genau die Falle, die diese Datei bei `geltungsfenster` schon
  // benennt; hier stand sie zwei Funktionen später noch einmal drin.
  const roh = (position === null || position === undefined) ? NaN : Number(position);
  const p = Number.isFinite(roh) ? Math.floor(roh) : Math.ceil(n / 2);
  const f = geltungsfenster({ geltung: g, position: p, spieltageGesamt: n });
  return f ? f.dauer : null;
}

// ── Konflikte ───────────────────────────────────────────────
// Was in keinem Einzelwert steckt, sondern in der Kombination — Muster
// `konflikte()` in `wirkung.js` und `ereignisse.js`. Jede Meldung kennt ihre
// Korrektur.
//
// `wirkung` ist optional: ohne sie werden nur die Meldungen geprüft, die allein
// an der Geltung hängen.
export function konflikte(geltung, wirkung = null) {
  const g = sanitizeGeltung(geltung);
  const typ = wirkung?.typ ?? null;
  const istFaktor = typ === "bonus" || typ === "malus";
  const out = [];

  // 🔴 Der teuerste Fall der ganzen Achse: ein Aufschlag, der bis Saisonende
  // gilt, ist kein Ereignis mehr, sondern eine zweite Wertungsregel — und zwar
  // eine, die sich selbst verstärkt, weil sie an dem hängt, der sie bekommen
  // hat.
  if (istFaktor && (g.typ === "rest" || g.typ === "bisAusgeloest")) {
    out.push({
      key: "faktor-ohne-ende",
      korrigieren: true,
      text: "Ein Auf- oder Abschlag ohne Ende wirkt an JEDEM verbleibenden Spieltag — das ist "
        + "keine Auszeichnung mehr, sondern eine dauerhafte zweite Wertungsregel. Entweder ein "
        + "Fenster von wenigen Spieltagen wählen oder auf eine feste Gutschrift umstellen.",
    });
  }

  // Ein Fenster über eine einmalige Wirkung sieht aus wie „n-mal", ist aber
  // „einmal". Lieber sagen als stillschweigend anders rechnen — das ist der
  // Vertrag aus dem Kopfkommentar, und ein Admin liest ihn nicht.
  if (!istFaktor && typ && !GELTUNG[g.typ].einmalig) {
    out.push({
      key: "fenster-ohne-faktor",
      korrigieren: false,
      text: "Eine feste Gutschrift wird EINMAL gezahlt, auch über ein längeres Fenster — sonst "
        + "wäre das Fenster eine Multiplikation und damit der eine Punkte-Kanal, den die "
        + "Wirkungs-Achse ausschließt. Über die Zeit läuft nur ein Auf- oder Abschlag.",
    });
  }

  if (g.typ === "jackpot" && typ === "joker") {
    out.push({
      key: "jackpot-joker",
      korrigieren: false,
      text: "Beim Jackpot wächst der BETRAG. Bei Jokern heißt das ganze Joker — der Sprung von "
        + "einem auf drei ist größer, als er sich einstellt. Der Gesamtdeckel („höchstens "
        + "erspielbar“) fängt es ab, aber die Runde sieht davon nichts.",
    });
  }

  return out;
}
