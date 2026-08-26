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

// ⚠️ VORSCHLAG, keine Entscheidung. Andis Satz nennt nur zwei der drei Zahlen
// („10 Leute", „6 Monate"); die dritte — was „aktiv" heißt — fehlt noch.
export const DEFAULT_EMPFEHLUNG = {
  mitspieler: 10,     // Andis Zahl
  spieltage: 3,       // ⏳ offen: Andi hat keine genannt
  praemieMonate: 6,   // Andis Zahl
};

export function sanitizeEmpfehlung(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const zahl = (wert, vorgabe, grenzen) => {
    const n = Math.round(Number(wert));
    if (!Number.isFinite(n)) return vorgabe;
    return Math.min(grenzen.max, Math.max(grenzen.min, n));
  };
  return {
    mitspieler: zahl(p.mitspieler, DEFAULT_EMPFEHLUNG.mitspieler, EMPFEHLUNG_LIMITS.mitspieler),
    spieltage: zahl(p.spieltage, DEFAULT_EMPFEHLUNG.spieltage, EMPFEHLUNG_LIMITS.spieltage),
    praemieMonate: zahl(p.praemieMonate, DEFAULT_EMPFEHLUNG.praemieMonate, EMPFEHLUNG_LIMITS.praemieMonate),
  };
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
  return {
    schwellen: s,
    geworben: zeilen.length,
    aktive,
    fehlen: Math.max(0, s.mitspieler - aktive),
    erfuellt: aktive >= s.mitspieler,
    zeilen,
  };
}

// Ein Satz für die Oberfläche — eine Fassung, nicht drei.
export function beschreibeEmpfehlung(stand) {
  if (!stand) return "";
  const { aktive, fehlen, erfuellt, schwellen, geworben } = stand;
  if (erfuellt) {
    return `Geschafft: ${aktive} aktive Mitspieler — ${schwellen.praemieMonate} Monate Premium.`;
  }
  if (geworben === 0) return "Noch niemand in deiner Runde außer dir.";
  // ⚠️ Einzahl: „an 1 verschiedenen Spieltagen" stand hier kurz und liest
  // sich wie ein Platzhalter, den jemand vergessen hat.
  const tage = schwellen.spieltage === 1
    ? "an einem Spieltag"
    : `an ${schwellen.spieltage} verschiedenen Spieltagen`;
  return `${aktive} von ${schwellen.mitspieler} aktiv · noch ${fehlen}. `
    + `Aktiv heißt: ${tage} getippt.`;
}
