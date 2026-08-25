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

// 🔴 Die Vorschlagsliste. Reihenfolge ist Andis: erst das Geburtsjahr, dann
// ein Nachcode. Zurück kommen nur Namen, die in `belegt` FREI sind — ein
// Vorschlag, der schon vergeben ist, ist schlimmer als keiner.
//
// ⚠️ Der Rückfall auf die laufende Zahl ist Pflicht, nicht Zierde: das
// Geburtsdatum (KT9) gibt es noch nicht, und selbst wenn — jemand darf es
// nicht angeben wollen. Ohne Rückfall hinge die Anmeldung an einem Feld,
// das niemand ausfüllen muss.
export function namensVorschlaege(wunsch, belegt = [], { geburtsjahr = null, anzahl = 3 } = {}) {
  const sauber = sanitizeDisplayName(wunsch);
  if (!sauber) return [];
  const menge = belegt instanceof Set ? belegt : new Set([...belegt].map(namensSchluessel));
  const frei = (n) => n && !menge.has(namensSchluessel(n));

  const out = [];
  const nimm = (n) => {
    if (!frei(n) || out.some((x) => gleicherName(x, n))) return;
    out.push(n);
  };

  const jahr = jahresZusatz(geburtsjahr);
  if (jahr) nimm(mitZusatz(sauber, jahr));

  // Laufende Zahl — der Rückfall, der immer geht.
  for (let i = 2; i <= 99 && out.length < anzahl; i++) nimm(mitZusatz(sauber, String(i)));

  // Falls die Zahlen ausgehen (99 Namensvettern): ein kurzer Nachcode.
  for (let i = 0; i < 200 && out.length < anzahl; i++) {
    nimm(mitZusatz(sauber, "-" + Math.random().toString(36).slice(2, 6)));
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
