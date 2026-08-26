// ============================================================
//  PREMIUM ALS BELOHNUNG (Andi, M8, 25.08.2026)
//
//  Wörtlich: „bspw. gibts auch immer Premium-Account für 6 Monate, wenn man
//  selbst ne Tipprunde erstellt und 10 Leute dazu bringt, für ne gewisse Zeit
//  aktiv zu spielen".
//
//  Die Daten dafür liegen vollständig vor — nachgesehen, nicht geraten:
//  `createRound` hält den Admin fest, `round_members` trägt ein `joined_at`,
//  `listTips` liefert je Runde alle Tipps mit Nutzer. Kein neues Feld nötig.
//
//  ── 🔴 „für ne gewisse Zeit aktiv" ist keine Zahl, also wird es eine ──
//  Ohne Zahl lässt sich die Belohnung weder rechnen noch ERKLÄREN, und
//  erklären muss man sie: wer sich zehn Freunde in die Runde holt und dann
//  nichts bekommt, will wissen, woran es lag. Die Schwellen stehen deshalb
//  als Vorgabe hier und sind einstellbar — Andis Zahl ersetzt sie, sobald er
//  eine nennt. ⚠️ Die Vorgabe ist ein VORSCHLAG, keine Entscheidung.
//
//  ── ⚠️ Die Missbrauchskante, und sie ist der eigentliche Grund für die
//     zweite Schwelle ──
//  Eine Belohnung für geworbene Nutzer ist die Mechanik, die zuerst mit
//  Scheinkonten bespielt wird. Solange Premium nichts kostet (M1: keine
//  Funktion hinter einer Bezahlschranke), ist das billig zu ertragen —
//  **sobald Premium „keine Werbung" heißt, kostet jedes Scheinkonto echtes
//  Geld.** Deshalb zählt nicht „ist beigetreten", sondern „hat an mehreren
//  verschiedenen SPIELTAGEN getippt": ein Scheinkonto anzulegen kostet eine
//  Minute, es über Wochen mitspielen zu lassen kostet Aufwand.
//
//  🔴 Und deshalb zählt der SPIELTAG, nicht die Anzahl der Tipps. Wer an
//  einem Nachmittag neun Bundesligaspiele durchklickt, hat einmal getippt,
//  nicht neunmal. Gezählt wird `wettbewerb|matchday` — „Spieltag 3" gibt es
//  in jeder Liga einmal, und ohne den Wettbewerb im Schlüssel fielen sieben
//  Spieltage zu einem zusammen (derselbe Fehler wie beim Joker und bei den
//  Benachrichtigungen).
//
//  Reine Funktionen, UI-frei, store-frei.
// ============================================================

export const EMPFEHLUNG_LIMITS = {
  mitspieler: { min: 3, max: 50, step: 1 },
  spieltage: { min: 1, max: 20, step: 1 },
  praemieMonate: { min: 1, max: 24, step: 1 },
};

// 🔴 GESTAFFELT, nicht eine Schwelle (Andi, 26.08.2026):
// „will das ja eh staffeln, wenn man ne runde mit 20 aktiven aufmacht gibts
//  eben 12 monate, aber wie genau legen wir noch nicht fest nur der
//  mechanismus".
//
// ⛔ DIE ZAHLEN SIND AUSDRÜCKLICH NICHT ENTSCHIEDEN. Andi wörtlich: „die zahl
// ab wann aktiv, machen wir erst sehr als letztes, muss eh in nem business
// kontext besprochen werden sobald das durchgerechnet ist." Was hier steht,
// ist ein lauffähiger PLATZHALTER, damit der Mechanismus geprüft werden kann
// — keine Empfehlung und kein Vorschlag zur Übernahme.
//
// ⚠️ Die Staffel ist ABSTEIGEND zu lesen: es gilt die höchste Stufe, deren
// Bedingung erfüllt ist. Wer 25 aktive Mitspieler hat, bekommt die 20er-Stufe
// — nicht die Summe aller Stufen. Eine Belohnung, die sich addiert, ist mit
// Scheinkonten beliebig hoch zu treiben.
export const DEFAULT_STAFFEL = [
  { mitspieler: 10, praemieMonate: 6 },   // Andis Beispiel
  { mitspieler: 20, praemieMonate: 12 },  // Andis Beispiel
];

// ⚠️ VORSCHLAG, keine Entscheidung: was „für ne gewisse Zeit aktiv" heißt,
// ist die Zahl, die Andi zuletzt festlegt.
export const DEFAULT_EMPFEHLUNG = {
  spieltage: 3,                  // ⏳ offen, Platzhalter
  staffel: DEFAULT_STAFFEL,
};

const zahl = (wert, vorgabe, grenzen) => {
  const n = Math.round(Number(wert));
  if (!Number.isFinite(n)) return vorgabe;
  return Math.min(grenzen.max, Math.max(grenzen.min, n));
};

// 🔴 Die Staffel säubern: Stufen aufsteigend nach Mitspielerzahl, jede Zahl in
// ihren Grenzen, Dubletten weg.
//
// ⚠️ Und eine Regel, die keine Kosmetik ist: die Prämie muss mit der
// Mitspielerzahl STEIGEN. Eine Staffel, bei der 20 Mitspieler weniger bringen
// als 10, ist kein Tippfehler mit Folgen für die Optik — sie bestraft den
// Erfolgreicheren, und niemand würde den Fehler in einer Tabelle bemerken.
// Sinkt eine Stufe, wird sie auf die vorige angehoben.
export function sanitizeStaffel(roh) {
  const liste = Array.isArray(roh) ? roh : DEFAULT_STAFFEL;
  const sauber = liste
    .filter((st) => st && typeof st === "object")
    .map((st) => ({
      mitspieler: zahl(st.mitspieler, DEFAULT_STAFFEL[0].mitspieler, EMPFEHLUNG_LIMITS.mitspieler),
      praemieMonate: zahl(st.praemieMonate, DEFAULT_STAFFEL[0].praemieMonate, EMPFEHLUNG_LIMITS.praemieMonate),
    }))
    .sort((a, b) => a.mitspieler - b.mitspieler);

  const out = [];
  for (const st of sauber) {
    const vorige = out[out.length - 1];
    if (vorige && vorige.mitspieler === st.mitspieler) continue;   // Dublette
    if (vorige && st.praemieMonate < vorige.praemieMonate) {
      out.push({ ...st, praemieMonate: vorige.praemieMonate });
      continue;
    }
    out.push(st);
  }
  return out.length ? out : [...DEFAULT_STAFFEL];
}

export function sanitizeEmpfehlung(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  return {
    spieltage: zahl(p.spieltage, DEFAULT_EMPFEHLUNG.spieltage, EMPFEHLUNG_LIMITS.spieltage),
    staffel: sanitizeStaffel(p.staffel),
  };
}

// Welche Stufe ist mit `aktive` Mitspielern erreicht? Die HÖCHSTE, deren
// Bedingung erfüllt ist — nie die Summe.
export function stufeFuer(aktive, staffel = DEFAULT_STAFFEL) {
  const s = sanitizeStaffel(staffel);
  let treffer = null;
  for (const st of s) if (aktive >= st.mitspieler) treffer = st;
  return treffer;
}

// Und die nächste, die noch zu holen ist — für „noch 4 bis 12 Monate".
export function naechsteStufe(aktive, staffel = DEFAULT_STAFFEL) {
  return sanitizeStaffel(staffel).find((st) => aktive < st.mitspieler) ?? null;
}

// An wie vielen verschiedenen Spieltagen hat jemand getippt?
// `tips`: [{ user_id | userId, match_id | matchId, ... }]
// `spielInfo`: Map matchId → { wettbewerb, matchday }
export function spieltageJeSpieler(tips = [], spielInfo = new Map()) {
  const out = new Map();
  for (const t of tips ?? []) {
    // ⚠️ `t` kann null sein — der Test hat es gefunden, bevor es eine Liste
    // aus der Datenbank getan hat.
    if (!t || typeof t !== "object") continue;
    const uid = t.user_id ?? t.userId ?? null;
    const mid = t.match_id ?? t.matchId ?? null;
    if (uid == null || mid == null) continue;
    const info = spielInfo.get(mid);
    if (!info || info.matchday == null) continue;
    // 🔴 Wettbewerb IMMER mit im Schlüssel.
    const key = `${info.wettbewerb ?? "?"}|${info.matchday}`;
    if (!out.has(uid)) out.set(uid, new Set());
    out.get(uid).add(key);
  }
  return out;
}

// Der Stand für EINE Runde: wie viele der geworbenen Mitspieler sind aktiv?
//
// `mitglieder`: [{ user_id | userId, name }]  — aus `listMembers`
// `adminId`   : wer die Runde erstellt hat    — aus `round.admin_id`
//
// ⚠️ Der Admin zählt NICHT als geworbener Mitspieler. Wer sich selbst
// mitzählt, braucht nur neun Freunde — und die Zahl in Andis Satz wäre eine
// andere als die in der Rechnung.
export function empfehlungsStand({
  mitglieder = [], tips = [], spielInfo = new Map(), adminId = null,
  schwellen = DEFAULT_EMPFEHLUNG,
} = {}) {
  const s = sanitizeEmpfehlung(schwellen);
  const proSpieler = spieltageJeSpieler(tips, spielInfo);

  const geworben = (mitglieder ?? [])
    .map((m) => ({ userId: m.user_id ?? m.userId ?? null, name: m.name ?? null }))
    .filter((m) => m.userId != null && m.userId !== adminId);

  const zeilen = geworben.map((m) => {
    const spieltage = proSpieler.get(m.userId)?.size ?? 0;
    return { ...m, spieltage, aktiv: spieltage >= s.spieltage };
  }).sort((a, b) => b.spieltage - a.spieltage);

  const aktive = zeilen.filter((z) => z.aktiv).length;
  const erreicht = stufeFuer(aktive, s.staffel);
  const naechste = naechsteStufe(aktive, s.staffel);
  return {
    schwellen: s,
    geworben: zeilen.length,
    aktive,
    // Die höchste erreichte Stufe (oder null) und die nächste, die noch geht.
    erreicht,
    naechste,
    fehlen: naechste ? Math.max(0, naechste.mitspieler - aktive) : 0,
    erfuellt: erreicht != null,
    praemieMonate: erreicht?.praemieMonate ?? 0,
    zeilen,
  };
}

// Ein Satz für die Oberfläche — eine Fassung, nicht drei.
export function beschreibeEmpfehlung(stand) {
  if (!stand) return "";
  const { aktive, fehlen, erreicht, naechste, schwellen, geworben } = stand;
  // ⚠️ Einzahl: „an 1 verschiedenen Spieltagen" stand hier kurz und liest
  // sich wie ein Platzhalter, den jemand vergessen hat.
  const tage = schwellen.spieltage === 1
    ? "an einem Spieltag"
    : `an ${schwellen.spieltage} verschiedenen Spieltagen`;

  if (erreicht) {
    const jetzt = `Geschafft: ${aktive} aktive Mitspieler — ${erreicht.praemieMonate} Monate Premium.`;
    // 🔴 Die nächste Stufe gehört DAZU, sonst hört die Staffel nach der
    // ersten Stufe auf zu wirken: wer sie erreicht hat, sieht nicht, dass es
    // weitergeht, und hört auf zu werben.
    return naechste
      ? `${jetzt} Noch ${fehlen} bis ${naechste.praemieMonate} Monate.`
      : jetzt;
  }
  if (geworben === 0) return "Noch niemand in deiner Runde außer dir.";
  const ziel = naechste ?? schwellen.staffel[0];
  return `${aktive} von ${ziel.mitspieler} aktiv · noch ${fehlen} für `
    + `${ziel.praemieMonate} Monate Premium. Aktiv heißt: ${tage} getippt.`;
}
