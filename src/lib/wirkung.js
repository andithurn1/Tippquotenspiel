// ============================================================
//  WAS PASSIERT DANN? — die Wirkungs-Achse der Regel-Grammatik
//
//  Die vier Satzglieder sind WANN (Auslöser) → WEN (`auswahl.js`) → WAS
//  (diese Datei) → WIE LANGE (Geltung). Nach der WEN-Achse ist das die
//  zweite, die aus ihren Mechaniken herausgelöst wird.
//
//  ── Warum die Achse „Wirkung" heißt und nicht „Belohnung" ──
//  Weil sie negativ sein darf. „Der Führende gibt beim nächsten Mal etwas ab"
//  ist derselbe Satzbau wie „der Letzte bekommt einen Joker" — nur mit
//  umgekehrtem Vorzeichen. Zwei getrennte Achsen dafür wären zwei Kataloge,
//  zwei Sanitize-Wege und zwei Deckelungen; dieselbe Lehre wie bei Klau- und
//  Block-Joker, die aus genau diesem Grund EIN Modul sind.
//
//  ── 🔴 Die Regel, die nicht gebrochen werden darf ──
//  **KEINE Wirkung macht einen neuen Punkte-Kanal auf.** Jede läuft in einen
//  Topf, der schon einen Deckel hat:
//
//  | Wirkung | Topf | Deckel |
//  |---|---|---|
//  | `joker` / `jokerEntzug` | Joker-Kontingent (`jokerKontingent.js`) | `ereignisse.maxErspielt` |
//  | `bonus` / `malus` | Gewichtung eines SPIELTAGS im Verlauf, wie die Saisonform-Kurve | `WIRKUNG_LIMITS.prozent` (± 50 %) |
//  | `punkte` | direkte Gutschrift | eigener Saison-Deckel, Bauart `drehrad.maxPunkteProSaison` |
//  | `umverteilung` | **keiner — summenneutral** | braucht keinen |
//  | `nichts` | keiner | kostet null Balance |
//
//  Der Grund gilt hier verstärkt: mit einer Grammatik kann ein Admin zwanzig
//  Regeln gleichzeitig scharf schalten. Ohne gemeinsamen Deckel addieren die
//  sich zu einem Spiel, das niemand mehr vermessen hat.
//
//  ⚠️ **`bonus`/`malus` fallen NICHT unter `modCap`, und das ist wichtig zu
//  wissen.** `modCap` deckelt die Modifikatoren EINES TIPPS (Joker, Derby,
//  Big Game, Wettbewerbs-Gewicht) und greift in `scoreTip`. Diese Wirkung
//  liegt eine Ebene darüber: sie wiegt einen ganzen SPIELTAG im Verlauf,
//  genau wie `saisonform.kurve`. Ihre Grenze ist deshalb die eigene
//  (`prozent` max. 50), nicht `modCap` — wer das verwechselt, hält den
//  Faktor für gedeckelt, obwohl ihn dort niemand sieht.
//
//  ── ⚠️ Warum `punkte` einen EIGENEN Deckel braucht ──
//  Ein Faktor ist von Natur aus begrenzt: mehr als `prozent` kommt nicht
//  heraus. Eine feste Gutschrift ist ein SUMMAND und wächst mit jedem
//  Auslösen weiter. Das ist keine Feinheit: `drehrad.js` hat dafür schon
//  `maxPunkteProSaison`, und diese Wirkung nimmt dieselbe Bauart. Wer den
//  Deckel wegdenkt, hat den einen Kanal gebaut, den der Absatz darüber
//  ausschließt.
//
//  ── 🔴 `umverteilung` ist die einzige summenneutrale Wirkung ──
//  Punkte werden VERSCHOBEN statt erzeugt. Sie kann das Modifikator-Budget
//  deshalb gar nicht aufblähen und ist die billigste Art, den Vorsprung an
//  der Spitze zu begrenzen — **vor `malus` bevorzugen.**
//
//  ⚠️ Bonus für den Letzten und Malus für den Ersten sind NICHT dasselbe,
//  obwohl sie sich gleich anfühlen: der Bonus hebt das Punkteniveau (die
//  Anzeige-Skalierung wandert mit), der Malus senkt es, und beides zusammen
//  presst das Feld doppelt. `umverteilung` macht beide Seiten in einem Zug
//  und lässt die Summe in Ruhe.
//
//  ── Jede Wirkung deklariert, was sie braucht (`braucht`) ──
//  Gleiches Muster wie bei den Saison-Wetten und den Ereignissen: was keine
//  Grundlage hat, steht im Katalog, ist aber als nicht auswertbar markiert
//  und lässt sich gar nicht erst einstellen. Fünf Wirkungen greifen in die
//  Tippabgabe oder in `scoreTip` ein (`sperre`, `handicap`, `pflicht`) oder
//  brauchen Bestandsverwaltung (`rolle`, `sonderspiel`, `tausch`) — die
//  stehen bereit, wirken aber noch nicht.
//
//  ⚠️ **Aus einem Minus lässt sich nichts nehmen.** `umverteilung` und `malus`
//  greifen nur auf POSITIVE Spieltagspunkte zu — sonst wäre ein Abzug für
//  jemanden mit schlechtem Spieltag ein Geschenk. Wörtlich dieselbe Falle wie
//  `block.nurGewinn` in `duellJoker.js`, und dort hat sie schon einmal
//  zugeschlagen.
//
//  Reine Funktionen, UI-frei. Dieses Modul WERTET NICHT — es sagt, was einer
//  Person zusteht; verrechnet wird in der Wertung.
// ============================================================

export const RICHTUNGEN = ["positiv", "neutral", "negativ"];

// Was eine Wirkung an Infrastruktur voraussetzt. Alles, was hier über
// `spieltagspunkte` hinausgeht, existiert noch nicht.
// 🔴 „auswahl" ist seit dem 26.08.2026 dabei, und zwar erst seit die
// Favoriten-Sperre (`favoritenSperre.js`) wirklich in der Tippabgabe steht.
// Vorher war das Mittel genau das, wovor der Absatz „Jede Wirkung deklariert,
// was sie braucht" warnt: ein Schalter für etwas, das es nicht gibt.
//
// ⚠️ Es heißt „auswahl" und NICHT „tippabgabe", obwohl beides in demselben
// Screen landet. Der Unterschied ist der Grund, warum `pflicht` („du musst
// gegen den Favoriten tippen") weiter nicht auswertbar ist: die Sperre nimmt
// etwas aus der AUSWAHL — das kann sie, seit es `rules.sperre` gibt. Eine
// Pflicht prüft beim ABSENDEN, ob der abgegebene Tipp eine Bedingung erfüllt,
// und dafür gibt es bis heute nichts. Ein gemeinsames Mittel für beide hätte
// `pflicht` stillschweigend mit scharf geschaltet.
export const VERFUEGBARE_MITTEL = ["joker", "punkte", "faktor", "spieltagspunkte", "auswahl"];

// ⚠️ Hier stand bis zum 26.08.2026 ein Katalog `SPERR_ZIELE` (Favoriten ·
// Torschützen · Endstände). Er ist weg: die Sperre gilt nur noch für
// TORSCHÜTZEN (Andi, „ich will keinen block ermöglichen bei ergebnissen").
// Ein Katalog mit einem einzigen Eintrag ist kein Katalog, sondern eine
// Einstellung, die nichts einstellt.

export const WIRKUNG_TYPEN = [
  // ── Positiv ──
  {
    key: "joker", label: "Joker", richtung: "positiv",
    braucht: ["joker"], parameter: ["n"],
    standard: { n: 1 },
    text: "n Joker — fließen in dasselbe Kontingent wie die zugeteilten.",
    topf: "Joker-Kontingent, gedeckelt durch `maxErspielt`.",
  },
  {
    key: "punkte", label: "Punkte", richtung: "positiv",
    braucht: ["punkte"], parameter: ["betrag"],
    standard: { betrag: 50 },
    text: "Eine feste Gutschrift.",
    topf: "Direkte Gutschrift — braucht einen eigenen Saison-Deckel.",
  },
  {
    key: "bonus", label: "Aufschlag", richtung: "positiv",
    braucht: ["faktor"], parameter: ["prozent"],
    standard: { prozent: 20 },
    text: "Ein Aufschlag auf deine Punkte dieses Spieltags.",
    topf: "Wiegt einen ganzen Spieltag im Verlauf, wie `saisonform.kurve` — nicht `modCap`.",
  },
  // ── Neutral ──
  {
    key: "nichts", label: "Nur eine Auszeichnung", richtung: "neutral",
    braucht: [], parameter: [],
    standard: {},
    text: "Wird genannt, aber nicht verrechnet — die Auszeichnung ohne Punkte.",
    topf: "Keiner.",
  },
  {
    key: "umverteilung", label: "Umverteilung", richtung: "neutral",
    braucht: ["spieltagspunkte"], parameter: ["prozent"],
    standard: { prozent: 15 },
    text: "Die Betroffenen geben ab, alle anderen bekommen — die Summe bleibt gleich.",
    topf: "Keiner nötig: summenneutral.",
  },
  // ── Negativ ──
  {
    key: "malus", label: "Abzug", richtung: "negativ",
    braucht: ["faktor"], parameter: ["prozent"],
    standard: { prozent: 20 },
    text: "Abzug auf deine Punkte dieses Spieltags.",
    topf: "Dieselbe Ebene wie `bonus`, nach unten durch `prozent` begrenzt.",
  },
  {
    key: "jokerEntzug", label: "Joker verfällt", richtung: "negativ",
    braucht: ["joker"], parameter: ["n"],
    standard: { n: 1 },
    text: "n Joker aus dem erspielten Vorrat verfallen.",
    topf: "Joker-Kontingent — nie unter null.",
  },
  // ── Vorbereitet, aber ohne Grundlage ──
  {
    key: "rolle", label: "Ein Recht", richtung: "neutral",
    braucht: ["rollen"], parameter: ["welche"],
    standard: { welche: "bigGame" },
    text: "Ein Recht statt Punkten — z. B. diese Woche das Big Game bestimmen.",
    topf: "Keiner — der billigste Weg, eine Runde lebendig zu machen.",
  },
  {
    key: "sonderspiel", label: "Sonderspiel", richtung: "positiv",
    braucht: ["sonderspiele"], parameter: ["id"],
    standard: { id: "" },
    text: "Startet ein Miniwettspiel über mehrere Spieltage.",
    topf: "Offen — hängt am Sonderspiel.",
  },
  {
    // 🔴 Diese Wirkung stand hier seit dem 07.08.2026 als VORBEREITUNG, mit
    // `standard: { was: "joker" }` und dem Satz „Diesen Spieltag kein Joker —
    // oder nur Tendenz statt Ergebnis". Auswertbar war sie nie, weil es nichts
    // gab, worauf sie hätte greifen können.
    //
    // Seit dem 26.08.2026 gibt es die Favoriten-Sperre, und damit ist die
    // Wirkung an DER Stelle scharf, an der sie eine Grundlage hat. Der
    // Joker-Entzug für einen Spieltag ist NICHT stillschweigend mitgewandert:
    // er ist eine andere Mechanik (Kontingent statt Auswahl) und steht als
    // offene Frage in `design/ideen.md`. Ein Parameterwert, der nichts tut,
    // wäre genau der Schalter, den der Kopf dieser Datei ausschließt.
    key: "sperre", label: "Sperre", richtung: "negativ",
    braucht: ["auswahl"], parameter: ["n"],
    standard: { n: 1 },
    text: "Die wahrscheinlichsten Torschützen sind für dich diesen Spieltag nicht wählbar.",
    topf: "Keiner — greift VOR der Wertung, in der Auswahl.",
  },
  {
    key: "handicap", label: "Handicap", richtung: "negativ",
    braucht: ["wertung"], parameter: ["art"],
    standard: { art: "favoritenMalus" },
    text: "Eine Wertungsregel zählt für dich doppelt.",
    topf: "Greift in `scoreTip` ein.",
  },
  {
    key: "pflicht", label: "Pflicht", richtung: "negativ",
    braucht: ["tippabgabe"], parameter: ["was"],
    standard: { was: "gegenFavorit" },
    text: "Du musst gegen den Favoriten tippen.",
    topf: "Keiner — greift vor der Wertung.",
  },
  {
    key: "tausch", label: "Tausch", richtung: "neutral",
    braucht: ["jokerBestand"], parameter: [],
    standard: {},
    text: "Zwei tauschen ihren Joker.",
    topf: "Keiner — summenneutral, aber braucht Bestandsverwaltung.",
  },
];

export const WIRKUNG = Object.fromEntries(WIRKUNG_TYPEN.map((w) => [w.key, w]));

// Auswertbar ist, was NUR Mittel braucht, die es schon gibt — dieselbe
// Formulierung wie `istAuswertbar` in `ereignisse.js` und `saisonwetten.js`.
// Eine Wirkung, die nicht auswertbar ist, lässt sich gar nicht erst
// einstellen: sie stünde sonst als Schalter da, der nichts tut.
export function istAuswertbar(key) {
  const w = WIRKUNG[key];
  return !!w && w.braucht.every((b) => VERFUEGBARE_MITTEL.includes(b));
}

export const AUSWERTBARE_WIRKUNGEN = WIRKUNG_TYPEN.filter((w) => istAuswertbar(w.key));

export const WIRKUNG_LIMITS = {
  n: { min: 1, max: 3, step: 1 },
  betrag: { min: 5, max: 500, step: 5 },
  prozent: { min: 5, max: 50, step: 5 },
  // Der eigene Deckel für `punkte` (siehe Kopfkommentar). 0 = kein Deckel,
  // und das ist bewusst NICHT die Vorgabe.
  maxPunkteProSaison: { min: 0, max: 2000, step: 50 },
};

export const DEFAULT_WIRKUNG = { typ: "joker", n: 1 };

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

// ── Sanitize ────────────────────────────────────────────────
// Muster `sanitizeAuswahl`: unbekannter Typ fällt auf `standard` zurück,
// Zahlen werden auf `WIRKUNG_LIMITS` beschnitten. Nur die Parameter des
// jeweiligen Typs werden gesetzt — ein `prozent` an einer Joker-Wirkung wäre
// ein Feld, das nichts tut und beim nächsten Lesen für eine Einstellung
// gehalten wird.
export function sanitizeWirkung(partial = {}, standard = DEFAULT_WIRKUNG) {
  const p = partial && typeof partial === "object" ? partial : {};
  const vorgabe = WIRKUNG[standard?.typ] ? standard : DEFAULT_WIRKUNG;
  const typ = istAuswertbar(p.typ) ? p.typ : vorgabe.typ;
  const w = WIRKUNG[typ];
  const std = { ...w.standard, ...(typ === vorgabe.typ ? vorgabe : {}) };

  const out = { typ };
  if (w.parameter.includes("n")) {
    out.n = Math.round(clamp(p.n, WIRKUNG_LIMITS.n, std.n));
  }
  if (w.parameter.includes("betrag")) {
    out.betrag = Math.round(clamp(p.betrag, WIRKUNG_LIMITS.betrag, std.betrag));
  }
  if (w.parameter.includes("prozent")) {
    out.prozent = Math.round(clamp(p.prozent, WIRKUNG_LIMITS.prozent, std.prozent));
  }
  // Nur bei `punkte` — der eigene Deckel gehört zur Wirkung, nicht zum
  // Ereignis: dieselbe Wirkung in zwei Regeln soll nicht zwei Deckel haben.
  if (typ === "punkte") {
    out.maxProSaison = Math.round(
      clamp(p.maxProSaison, WIRKUNG_LIMITS.maxPunkteProSaison, std.maxProSaison ?? 500));
  }
  return out;
}

// ── Ein Satz für die Oberfläche ─────────────────────────────
// Muster `beschreibeAuswahl`/`beschreibeVerteilung`: kein Feldname, sondern
// das, was ein Spieler bekommt.
export function beschreibeWirkung(wirkung) {
  const w = sanitizeWirkung(wirkung);
  switch (w.typ) {
    case "joker":
      return w.n === 1 ? "ein Joker" : `${w.n} Joker`;
    case "punkte":
      return `${w.betrag} Punkte`;
    case "bonus":
      return `+${w.prozent} % auf die Punkte des Spieltags`;
    case "malus":
      return `−${w.prozent} % auf die Punkte des Spieltags`;
    case "jokerEntzug":
      return w.n === 1 ? "ein Joker verfällt" : `${w.n} Joker verfallen`;
    case "umverteilung":
      return `${w.prozent} % der Spieltagspunkte gehen an die übrigen Mitspieler`;
    case "sperre":
      return w.n === 1
        ? "gesperrt: der wahrscheinlichste Torschütze"
        : `gesperrt: die ${w.n} wahrscheinlichsten Torschützen`;
    case "nichts":
      return "nur eine Auszeichnung";
    default:
      return WIRKUNG[w.typ]?.label ?? "";
  }
}

// ── Anwenden ────────────────────────────────────────────────
// 🔴 Diese Funktion WERTET NICHT. Sie sagt, was jeder Person zusteht, in einer
// Form, die der Aufrufer in den richtigen Topf legt:
//
//   { userId, joker, punkte, faktor, text }
//
// `joker` geht ins Kontingent, `punkte` in die Gutschriften, `faktor` in den
// additiven Modifikator-Topf. Ein Vorgang trägt IMMER alle drei Felder (mit
// den neutralen Werten 0/0/1), damit ein Aufrufer nicht raten muss, welches
// gemeint war — dieselbe „nie halb gesetzt"-Regel wie in `limitKlassen.js`.
//
// ⚠️ Der Deckel für `punkte` wird HIER angewandt, nicht beim Aufrufer:
// `bisherPunkte` ist die Summe, die dieser Wirkung in dieser Saison schon
// gutgeschrieben wurde. Ohne das Feld gälte der Deckel je Aufruf statt je
// Saison und wäre damit keiner. Chronologisch gedeckelt, wie in
// `ereignisse.js`.
//
// `spieltagsPunkte` = `{ [userId]: Punkte DIESES Spieltags }` — nur für
// `bonus`/`malus`/`umverteilung` nötig. Fehlt es, liefern die drei nichts,
// statt mit 0 zu rechnen: eine Umverteilung von null Punkten sähe aus wie
// eine, die gegriffen hat.
export function wendeAn({
  wirkung,
  betroffene = [],
  mitglieder = [],
  spieltagsPunkte = null,
  bisherPunkte = 0,
} = {}) {
  const w = sanitizeWirkung(wirkung);
  const wer = [...new Set(betroffene.filter((id) => id != null))];
  // ⚠️ `sperre: null` gehört zu den neutralen Feldern wie `joker: 0` und
  // `faktor: 1` — dieselbe „nie halb gesetzt"-Regel: ein Aufrufer soll nicht
  // raten müssen, ob das Feld fehlt oder leer ist.
  const neutral = (userId, extra) => ({ userId, joker: 0, punkte: 0, faktor: 1, sperre: null, ...extra });
  if (!wer.length) return [];

  switch (w.typ) {
    case "joker":
      return wer.map((id) => neutral(id, { joker: w.n, text: beschreibeWirkung(w) }));

    // Nie unter null: ein Entzug aus einem leeren Vorrat wäre eine Schuld,
    // und ein Schuldenmodell gibt es hier so wenig wie beim Budget.
    case "jokerEntzug":
      return wer.map((id) => neutral(id, { joker: -w.n, text: beschreibeWirkung(w) }));

    case "punkte": {
      const deckel = w.maxProSaison;
      const out = [];
      let vergeben = Math.max(0, Number(bisherPunkte) || 0);
      for (const id of wer) {
        let betrag = w.betrag;
        if (deckel > 0) {
          const frei = Math.max(0, deckel - vergeben);
          betrag = Math.min(betrag, frei);
        }
        if (betrag <= 0) continue;
        vergeben += betrag;
        out.push(neutral(id, { punkte: betrag, text: `${betrag} Punkte` }));
      }
      return out;
    }

    case "bonus":
      return wer.map((id) => neutral(id, { faktor: 1 + w.prozent / 100, text: beschreibeWirkung(w) }));

    case "malus":
      return wer.map((id) => neutral(id, { faktor: 1 - w.prozent / 100, text: beschreibeWirkung(w) }));

    // 🔴 Summenneutral, und das ist prüfbar: was die Geber abgeben, bekommen
    // die Empfänger auf den Punkt genau. Ungerundet weitergereicht — die
    // Wertung addiert die rohen Werte und rundet EINMAL am Ende (dieselbe
    // Regel wie bei den Duell-Vorgängen; eine erste Fassung dort rundete je
    // Posten, und die Summe stand um 1 daneben).
    case "umverteilung": {
      if (!spieltagsPunkte) return [];
      const alle = mitglieder.length ? mitglieder : Object.keys(spieltagsPunkte);
      const empfaenger = alle.filter((id) => !wer.includes(id));
      if (!empfaenger.length) return [];

      let topf = 0;
      const geber = [];
      for (const id of wer) {
        // Aus einem Minus lässt sich nichts nehmen (siehe Kopfkommentar).
        const p = Number(spieltagsPunkte[id]) || 0;
        if (p <= 0) continue;
        const ab = p * (w.prozent / 100);
        topf += ab;
        geber.push(neutral(id, { punkte: -ab, text: `${w.prozent} % abgegeben` }));
      }
      if (topf <= 0) return [];
      const jeder = topf / empfaenger.length;
      return [
        ...geber,
        ...empfaenger.map((id) => neutral(id, { punkte: jeder, text: "Anteil aus der Umverteilung" })),
      ];
    }

    // 🔴 Die Sperre erzeugt KEINE Punkte und keinen Faktor — sie reicht einen
    // Bauplan durch, den die Tippabgabe auf das Regelwerk legt
    // (`sperrEingriff.js`). Deshalb bleibt der Vorgang in allen drei
    // Zahlfeldern neutral: er darf in der Wertung nichts bewegen.
    case "sperre":
      return wer.map((id) => neutral(id, {
        sperre: { schuetzen: w.n }, text: beschreibeWirkung(w),
      }));

    case "nichts":
      return wer.map((id) => neutral(id, { text: "Auszeichnung" }));

    default:
      return [];
  }
}

// ── Konflikte ───────────────────────────────────────────────
// Was in keinem Einzelwert steckt, sondern in der Kombination — Muster
// `konflikte()` in `ereignisse.js` und `duellJoker.js`. Jede Meldung kennt
// ihre Korrektur.
export function konflikte(wirkung) {
  const w = sanitizeWirkung(wirkung);
  const out = [];

  if (w.typ === "punkte" && w.maxProSaison === 0) {
    out.push({
      key: "punkte-ohne-deckel",
      korrigieren: true,
      text: "Eine feste Punkte-Gutschrift ohne Saison-Deckel ist der eine Kanal, den `modCap` "
        + "nicht sieht: `modCap` deckelt FAKTOREN, und eine Gutschrift ist ein Summand. "
        + "Entweder einen `maxProSaison` setzen oder auf „Aufschlag“ umstellen — der fällt "
        + "von selbst unter den Deckel.",
    });
  }
  if (w.typ === "malus") {
    out.push({
      key: "malus-statt-umverteilung",
      korrigieren: false,
      text: "Verlust wiegt schwerer als entgangener Gewinn — ein Abzug ist die Mechanik mit dem "
        + "höchsten Absprung-Risiko. „Umverteilung“ erreicht dasselbe, ist summenneutral und "
        + "liest sich als „die Verfolger holen auf“ statt als Strafe.",
    });
  }
  return out;
}
