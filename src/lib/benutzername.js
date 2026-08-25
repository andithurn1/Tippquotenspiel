// ============================================================
//  EINZIGARTIGE BENUTZERNAMEN (Andi, KT10, 25.08.2026)
//
//  Wörtlich: „es gibt einzigartige Benutzernamen und wenn einer schon
//  vergeben ist, wird eben vorgeschlagen welche Zahl vom Geburtsdatum oder
//  sonstiger Nachcode noch frei ist."
//
//  ── 🔴 Warum das kein Kleinkram ist ──
//  Bis heute prüfte `sanitizeDisplayName` nur die LÄNGE (2–24). Zwei „Andi"
//  waren möglich, und in der Rangliste standen sie untereinander, ohne
//  Unterschied. Bei einem Tippspiel unter Freunden ist das nicht kosmetisch:
//  wer gewonnen hat, ist dann eine Frage der Zeile, nicht des Namens.
//
//  ── ⚠️ Die Kante, an der es beim ERSTEN Freundes-Test geknallt hätte ──
//  Der Trigger `handle_new_user` in `schema.sql` legt das Profil beim
//  Registrieren an und leitet den Namen aus der Mailadresse ab
//  (`split_part(email, '@', 1)`). Zwei Freunde mit `andi@gmail.com` und
//  `andi@web.de` bekommen daraus BEIDE „andi". Mit einer Eindeutigkeits-
//  Sperre auf der Spalte wäre der zweite `insert` gescheitert — und weil der
//  Trigger am `insert on auth.users` hängt, wäre damit die ganze
//  REGISTRIERUNG fehlgeschlagen. Ein Freund, der sich nicht anmelden kann und
//  keinen Grund sieht.
//
//  Deshalb gehören Sperre und Ausweichname IMMER zusammen — in der Datenbank
//  (Trigger, siehe `schema.sql`) und hier für die Oberfläche. Diese Datei ist
//  die eine Stelle, an der steht, was „schon vergeben" heißt und welcher
//  Zusatz als Nächstes probiert wird.
//
//  Reine Funktionen, UI-frei, ohne Store-Abhängigkeit: wer die belegten Namen
//  liefert, entscheidet der Aufrufer (Store live, Liste im Test).
// ============================================================

import { NAME_LIMITS, sanitizeDisplayName } from "./avatars";

// 🔴 Zwei Namen sind DERSELBE, wenn sie sich nur in Groß-/Kleinschreibung
// oder Leerraum unterscheiden. „Andi", „andi" und „ANDI" nebeneinander in
// einer Rangliste sind genau die Verwechslung, die KT10 verhindern soll.
// ⚠️ Diese Funktion muss zu dem Index in `schema.sql` passen — dort steht
// `lower(display_name)`. Läuft eine Seite anders, sagt die App „frei" und die
// Datenbank „belegt".
export function namensSchluessel(name) {
  return String(name ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function gleicherName(a, b) {
  const ka = namensSchluessel(a);
  return ka.length > 0 && ka === namensSchluessel(b);
}

// Ist der Name in dieser Menge frei? `belegt` darf Array oder Set sein.
export function istFrei(name, belegt = []) {
  const k = namensSchluessel(name);
  if (!k) return false;
  const menge = belegt instanceof Set ? belegt : new Set([...belegt].map(namensSchluessel));
  return !menge.has(k);
}

// Zusatz anhängen, ohne die Längengrenze zu reißen: der STAMM wird gekürzt,
// nicht der Zusatz — ein abgeschnittenes „Andi9" statt „Andi95" wäre ein
// anderer Vorschlag als der angezeigte.
function mitZusatz(stamm, zusatz) {
  const z = String(zusatz);
  const platz = Math.max(1, NAME_LIMITS.max - z.length);
  return (stamm.slice(0, platz).trim() + z).slice(0, NAME_LIMITS.max);
}

// Aus einem Geburtsjahr die zwei Ziffern, die Andi meint („Zahl vom
// Geburtsdatum") — 1995 → „95". Alles andere ergibt null statt eines
// geratenen Zusatzes.
export function jahresZusatz(geburtsjahr) {
  const n = Number(geburtsjahr);
  if (!Number.isInteger(n) || n < 1900 || n > 2100) return null;
  return String(n % 100).padStart(2, "0");
}

// ── Die Spielarten, aus denen ein Vorschlag entsteht ────────
// 🔴 Andi, 25.08.2026: „werden noch paar mehr Zahlen oder Abwandlungen
// brauchen". Der erste Bau kannte nur die laufende Zahl — bei drei Freunden
// namens Andi kam „Andi2, Andi3, Andi4" heraus, und das liest sich wie eine
// Fehlermeldung, nicht wie ein Name.
//
// 🔴 STUFEN, nicht eine Liste. Beim ersten Anlauf standen alle Spielarten
// gleichberechtigt nebeneinander und wurden reihum abgefragt — mit dem
// Ergebnis, dass der Zufalls-Nachcode („Andi-rder") schon als dritter
// Vorschlag kam, obwohl `Andi7` und `Andi95` noch frei waren. Gemessen, nicht
// vermutet: die erste Ausgabe war `Andi_10 · DerAndi · Andi-rder`.
//
// Deshalb: eine Stufe wird ERST DANN angefasst, wenn die darüber nichts mehr
// hergibt. Innerhalb einer Stufe geht es reihum — sonst käme bei `anzahl: 3`
// dreimal dieselbe Sorte, und wer keine Nummer will, hätte keine Wahl.
//
// ⚠️ Jede Spielart ist ein Generator und liefert BELIEBIG VIELE Kandidaten.
// Sonst wäre „Andi10 ist auch schon weg" das Ende der Fahnenstange.
const STUFEN = [
  // ── Stufe 1: Zusätze, die etwas BEDEUTEN ──
  [
    // Geburtsjahr, zweistellig — Andis eigener Vorschlag.
    function* jahrKurz(stamm, { jahr }) {
      if (jahr) yield mitZusatz(stamm, jahr);
    },
    // Trikotnummern. Kurz, passt zum Spiel, und niemand liest darin eine
    // laufende Nummerierung: „Andi10" klingt gewollt, „Andi2" nach Ersatz.
    function* trikot(stamm) {
      for (const n of [10, 7, 9, 11, 8, 4, 6, 1, 13, 17, 21, 23, 99]) {
        yield mitZusatz(stamm, String(n));
      }
    },
    // Verein, falls bekannt — die Fanfarben-Auswahl kennt ihn.
    function* verein(stamm, { kuerzel }) {
      if (!kuerzel) return;
      yield mitZusatz(stamm, kuerzel);
      yield mitZusatz(stamm, "_" + kuerzel);
    },
    // Geburtsjahr, vierstellig.
    function* jahrLang(stamm, { jahrVoll }) {
      if (jahrVoll) yield mitZusatz(stamm, jahrVoll);
    },
  ],

  // ── Stufe 2: dieselbe Bedeutung, andere Optik ──
  [
    function* getrennt(stamm, { jahr }) {
      for (const t of ["_", ".", "-"]) {
        if (jahr) yield mitZusatz(stamm, t + jahr);
        for (const n of [10, 7, 9]) yield mitZusatz(stamm, t + n);
      }
    },
    // Artikel davor — im Fußball die geläufigste Abwandlung überhaupt.
    // ⚠️ Leerzeichen fallen weg, damit „Der Kaiser" nicht zu „DerDer Kaiser"
    // wird; und nur, wenn der Name dadurch nicht über die Grenze läuft.
    function* artikel(stamm) {
      const kern = stamm.replace(/\s+/g, "");
      for (const v of ["Der", "King", "Kaiser", "Boss"]) {
        const n = v + kern;
        if (n.length <= NAME_LIMITS.max) yield n;
      }
    },
  ],

  // ── Stufe 3: der Rückfall, der IMMER geht ──
  // ⚠️ Muss bleiben: das Geburtsdatum (KT9) gibt es noch nicht, und niemand
  // muss es angeben wollen. Er sagt nichts aus, er zählt nur — deshalb steht
  // er hinter allem, was etwas aussagt.
  [
    function* laufend(stamm) {
      for (let i = 2; i <= 999; i++) yield mitZusatz(stamm, String(i));
    },
  ],

  // ── Stufe 4: Notnagel ──
  // Greift erst, wenn 999 Namensvettern da sind. Hässlich, aber eindeutig.
  [
    function* nachcode(stamm) {
      for (let i = 0; i < 500; i++) {
        yield mitZusatz(stamm, "-" + Math.random().toString(36).slice(2, 6));
      }
    },
  ],
];

// Aus einem Vereinsnamen ein kurzes Kürzel: „1. FC Köln" → „FCK",
// „Bayern München" → „BM". Bestehende Großbuchstaben-Blöcke bleiben ganz
// (FC, VfL zählt als Wort), reine Zahlenteile fallen weg.
export function vereinsKuerzel(verein) {
  const woerter = String(verein ?? "")
    .split(/[\s.]+/)
    .map((w) => w.trim())
    .filter((w) => w && !/^\d+$/.test(w));
  if (!woerter.length) return null;
  const k = woerter.map((w) => (/^[A-ZÄÖÜ]{2,4}$/.test(w) ? w : w[0].toUpperCase())).join("");
  return k.slice(0, 5) || null;
}

// 🔴 Die Vorschlagsliste. Zurück kommen nur Namen, die FREI sind — ein
// Vorschlag, der schon vergeben ist, ist schlimmer als keiner.
export function namensVorschlaege(wunsch, belegt = [], optionen = {}) {
  const { geburtsjahr = null, verein = null, anzahl = 3 } = optionen;
  const sauber = sanitizeDisplayName(wunsch);
  if (!sauber) return [];
  const menge = belegt instanceof Set ? belegt : new Set([...belegt].map(namensSchluessel));

  const jahr = jahresZusatz(geburtsjahr);
  const kontext = {
    jahr,
    jahrVoll: jahr ? String(Number(geburtsjahr)) : null,
    kuerzel: vereinsKuerzel(verein),
  };

  const out = [];
  const gesehen = new Set();
  const nimm = (n) => {
    const k = namensSchluessel(n);
    if (!k || k === namensSchluessel(sauber) || menge.has(k) || gesehen.has(k)) return;
    gesehen.add(k);
    out.push(n);
  };

  for (const stufe of STUFEN) {
    if (out.length >= anzahl) break;
    const laeufe = stufe.map((f) => f(sauber, kontext));
    let aktiv = true;
    while (aktiv && out.length < anzahl) {
      aktiv = false;
      for (const lauf of laeufe) {
        if (out.length >= anzahl) break;
        const { value, done } = lauf.next();
        if (done) continue;
        aktiv = true;
        nimm(value);
      }
    }
  }
  return out.slice(0, anzahl);
}

// Ein Satz für die Oberfläche — eine Fassung, nicht drei.
export function namensHinweis(wunsch, belegt = [], optionen = {}) {
  const sauber = sanitizeDisplayName(wunsch);
  if (!sauber) {
    return { frei: false, ton: "fehler",
      text: `Mindestens ${NAME_LIMITS.min} Zeichen.`, vorschlaege: [] };
  }
  if (istFrei(sauber, belegt)) {
    return { frei: true, ton: "gut", text: `„${sauber}" ist frei.`, vorschlaege: [] };
  }
  const vorschlaege = namensVorschlaege(sauber, belegt, optionen);
  return {
    frei: false, ton: "hinweis",
    text: vorschlaege.length
      ? `„${sauber}" ist vergeben. Frei wäre: ${vorschlaege.join(", ")}.`
      : `„${sauber}" ist vergeben.`,
    vorschlaege,
  };
}
