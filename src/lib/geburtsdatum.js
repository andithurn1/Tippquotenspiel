// ============================================================
//  GEBURTSDATUM (Andi, KT9, 25.08.2026)
//
//  Wörtlich: „Alters auswahl beginnt bei 1995… sodass man nich von heutigem
//  datum runterscrollen muss".
//
//  🔴 Seine Begründung IST die Anforderung, nicht das Jahr. Ein Datumsfeld,
//  das bei HEUTE anfängt, zwingt jeden Erwachsenen durch dreißig Jahre
//  Scrollen, bevor er überhaupt in seinem Jahrzehnt ankommt. 1995 ist der
//  Startpunkt, an dem die Liste aufschlägt — NICHT die Grenze. Wer 1974 oder
//  2009 geboren ist, muss genauso hinkommen, nur mit einer Bewegung mehr.
//
//  ── Wofür es da ist, und wofür ausdrücklich nicht ──
//  ✅ Der Namens-Zusatz aus KT10 („Andi95") — das ist Andis eigener erster
//     Vorschlag und der einzige Zweck, der heute wirklich gebraucht wird.
//  ✅ Später: die Alterseinstufung der App-Stores, falls Werbung dazukommt
//     (M4 im Auftragsbuch).
//  ⛔ KEIN Pflichtfeld. Wer es nicht angibt, verliert genau eine Sorte
//     Namensvorschlag und sonst nichts — `namensVorschlaege` fällt auf
//     Trikotnummern und die laufende Zahl zurück. Ein Tippspiel unter
//     Freunden, das nach dem Geburtsdatum verlangt, bevor man mitspielen
//     darf, verliert Mitspieler an einer Stelle, an der nichts davon abhängt.
//
//  Reine Funktionen, UI-frei — kein `new Date()` ohne Vorgabe, damit die
//  Tests nicht am Kalender hängen.
// ============================================================

// Andis Startpunkt. ⚠️ Der Wert steht hier EINMAL: die Auswahl schlägt hier
// auf, und `namensVorschlaege` bekommt das Jahr aus dem gespeicherten Datum —
// nicht aus dieser Konstante.
export const START_JAHR = 1995;

// Wie weit die Liste reicht. ⚠️ Das ist eine PLAUSIBILITÄTS-Grenze, keine
// Altersprüfung — sie soll Tippfehler abfangen („1895"), nicht entscheiden,
// wer mitspielen darf.
//
// 🔴 Der erste Bau setzte die Obergrenze auf 2020, und die Tests haben es
// sofort gefunden: eine feste Obergrenze VERROTTET. 2020 heißt, dass sich ab
// 2038 kein 17-Jähriger mehr eintragen kann — und der Fehler sähe dann aus
// wie ein kaputtes Datumsfeld, nicht wie eine abgelaufene Konstante. Deshalb
// großzügig und mit Ablaufdatum im Kommentar: **vor 2045 nachziehen.**
export const JAHR_GRENZEN = { min: 1930, max: 2030 };

const zweiStellig = (n) => String(n).padStart(2, "0");

// „1995-08-27" — ISO, weil die Datenbank eine `date`-Spalte hat und jede
// andere Schreibweise beim Speichern noch einmal geraten werden müsste.
export function bildeDatum(jahr, monat, tag) {
  const j = Number(jahr), m = Number(monat), t = Number(tag);
  if (!Number.isInteger(j) || !Number.isInteger(m) || !Number.isInteger(t)) return null;
  if (j < JAHR_GRENZEN.min || j > JAHR_GRENZEN.max) return null;
  if (m < 1 || m > 12) return null;
  if (t < 1 || t > tageImMonat(j, m)) return null;
  return `${j}-${zweiStellig(m)}-${zweiStellig(t)}`;
}

// ⚠️ Schaltjahre gehören hierher und nicht in den Screen: der 29. Februar ist
// die Stelle, an der Datumsfelder reihenweise falsch sind.
export function tageImMonat(jahr, monat) {
  const m = Number(monat);
  if (m < 1 || m > 12) return 0;
  return new Date(Date.UTC(Number(jahr), m, 0)).getUTCDate();
}

// Eingabe säubern: ISO-Datum rein, ISO-Datum oder null raus. Alles, was kein
// gültiger Kalendertag ist, ergibt null statt eines zurechtgebogenen Werts —
// „2027-02-31" darf nicht still zum 3. März werden.
export function sanitizeGeburtsdatum(raw) {
  if (typeof raw !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  return bildeDatum(Number(m[1]), Number(m[2]), Number(m[3]));
}

export function jahrVon(datum) {
  const d = sanitizeGeburtsdatum(datum);
  return d ? Number(d.slice(0, 4)) : null;
}

// Alter in Jahren, gemessen an einem Stichtag. ⚠️ `heute` ist ein PARAMETER
// und hat keine Vorgabe aus `Date.now()`: ein Test, der am 31.12. anders
// ausgeht als am 01.01., ist kein Test.
export function alterAm(datum, heute) {
  const d = sanitizeGeburtsdatum(datum);
  if (!d || !heute) return null;
  const stichtag = heute instanceof Date ? heute : new Date(heute);
  if (Number.isNaN(stichtag.getTime())) return null;
  const [j, m, t] = d.split("-").map(Number);
  let alter = stichtag.getUTCFullYear() - j;
  const vorGeburtstag =
    stichtag.getUTCMonth() + 1 < m ||
    (stichtag.getUTCMonth() + 1 === m && stichtag.getUTCDate() < t);
  if (vorGeburtstag) alter -= 1;
  return alter >= 0 ? alter : null;
}

// 🔴 Die Jahresliste, und hier steckt Andis eigentliche Anforderung drin:
// sie BEGINNT bei 1995 und läuft von dort in BEIDE Richtungen abwechselnd
// nach außen — 1995, 1994, 1996, 1993, 1997 … So steht der wahrscheinlichste
// Jahrgang oben, und trotzdem ist jeder andere zwei Wischer entfernt, statt
// dreißig.
//
// ⚠️ Eine Liste, die einfach bei 1995 anfängt und abwärts läuft, wäre die
// naheliegende Lesart — sie macht aber jeden JÜNGEREN Jahrgang unerreichbar,
// und die sind es, die dazukommen sollen.
export function jahresListe({ start = START_JAHR, grenzen = JAHR_GRENZEN } = {}) {
  const out = [];
  const mittig = Math.min(Math.max(start, grenzen.min), grenzen.max);
  out.push(mittig);
  for (let d = 1; out.length < grenzen.max - grenzen.min + 1; d++) {
    const runter = mittig - d;
    const hoch = mittig + d;
    if (runter >= grenzen.min) out.push(runter);
    if (hoch <= grenzen.max) out.push(hoch);
    if (runter < grenzen.min && hoch > grenzen.max) break;
  }
  return out;
}

// Dieselbe Liste, aber in Kalender-Reihenfolge — für eine Darstellung, die
// scrollt statt zu blättern. `startIndex` sagt, wo sie aufschlagen soll.
export function jahresListeSortiert({ start = START_JAHR, grenzen = JAHR_GRENZEN } = {}) {
  const jahre = [];
  for (let j = grenzen.max; j >= grenzen.min; j--) jahre.push(j);
  return { jahre, startIndex: Math.max(0, jahre.indexOf(start)) };
}

export const MONATE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

// Ein Satz für die Oberfläche — eine Fassung, nicht drei.
export function beschreibeGeburtsdatum(datum, heute = null) {
  const d = sanitizeGeburtsdatum(datum);
  if (!d) return "Nicht angegeben";
  const [j, m, t] = d.split("-").map(Number);
  const text = `${t}. ${MONATE[m - 1]} ${j}`;
  const alter = heute ? alterAm(d, heute) : null;
  return alter == null ? text : `${text} · ${alter} Jahre`;
}
