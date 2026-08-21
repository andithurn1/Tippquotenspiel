// ============================================================
//  TABELLEN-BONUS — Außenseiter nach TABELLE statt nach Quote
//
//  🔴 Andis Wunsch vom 21.08.2026: „Underdog-Bonus mit Tabellenplatz bzw.
//  Punkteabstand." Der bestehende `underdogBoost` misst am MARKT; dieser hier
//  misst an der Tabelle. Das ist nicht dasselbe: ein Aufsteiger auf Platz 4
//  ist für den Markt oft weiter Außenseiter, für die Tabelle nicht mehr.
//
//  ── Woher die Tabelle kommt ──
//  `rangliste()` aus `saisonwetten.js` rechnet sie aus unseren EIGENEN
//  Ergebnissen; `spieltagOeffnen.js` friert die Plätze beim Öffnen eines
//  Spieltags auf dem Snapshot ein (`snap.tabellenPlatz`). Beides gab es schon
//  — dieser Modifikator benutzt es nur.
//
//  ⚠️ EINGEFROREN, nicht live gerechnet, und das ist Absicht: wer Freitag
//  tippt, muss dieselbe Runde sehen wie wer Sonntag tippt. Ein Platz, der sich
//  zwischen zwei Spielen desselben Spieltags ändert, wäre eine andere Regel
//  für dieselbe Runde.
//
//  ── Warum an den ERFOLG gekoppelt ──
//  ⚠️ Wie beim Mut-Bonus (engine.js). Eine Fassung, die für JEDEN Tipp auf den
//  Außenseiter zahlt, belohnt nicht Mut, sondern Dauerzocken: wer immer den
//  Schlechteren tippt, kassiert garantiert. Deshalb greift der Aufschlag nur
//  bei eingelöstem Tipp — es sei denn, der Admin schaltet `nurWennRichtig`
//  ausdrücklich aus und macht daraus ein Spielgewicht.
//
//  Reine Funktionen, UI-frei.
// ============================================================

export const DEFAULT_TABELLENBONUS = {
  enabled: false,
  // Andis Größenordnung für Empfehlungen: bis etwa +20 %.
  aufschlag: 0.2,
  nurWennRichtig: true,
  // "platz" = Rangabstand · "punkte" = Punktabstand
  bezug: "platz",
  abAbstand: 8,
  // Vor dem 5. Spieltag ist eine Tabelle kaum aussagekräftig — drei Siege
  // führen die Liga an.
  abSpieltag: 5,
  // "nurAussenseiter" · "auchFavorit" (dann gibt es einen Dämpfer für den
  // erwartbaren Sieg des Tabellenführers)
  richtung: "nurAussenseiter",
  // 🔴 PFLICHT, kein Komfort: was gilt, solange keine Tabelle vorliegt.
  // "quote" fällt auf die Marktquote zurück, "aus" lässt den Modifikator
  // stumm. Ohne diese Wahl wäre er an den ersten Spieltagen still wirkungslos
  // — und niemand merkt es.
  fallback: "quote",
  // Ab welchem Quotenverhältnis der Fallback jemanden als Außenseiter ansieht.
  fallbackQuote: 2.5,
};

const zahl = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const grenze = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function sanitizeTabellenBonus(teil = {}) {
  const d = DEFAULT_TABELLENBONUS;
  const src = teil && typeof teil === "object" ? teil : {};
  return {
    enabled: Boolean(src.enabled),
    aufschlag: grenze(zahl(src.aufschlag, d.aufschlag), 0, 1.5),
    nurWennRichtig: src.nurWennRichtig === undefined ? d.nurWennRichtig : Boolean(src.nurWennRichtig),
    bezug: src.bezug === "punkte" ? "punkte" : "platz",
    // Die Spannen unterscheiden sich je Bezug: 18 Plätze sind viel, 18 Punkte
    // sind es im Frühjahr nicht.
    abAbstand: src.bezug === "punkte"
      ? grenze(Math.round(zahl(src.abAbstand, 15)), 3, 60)
      : grenze(Math.round(zahl(src.abAbstand, d.abAbstand)), 1, 25),
    abSpieltag: grenze(Math.round(zahl(src.abSpieltag, d.abSpieltag)), 1, 20),
    richtung: src.richtung === "auchFavorit" ? "auchFavorit" : "nurAussenseiter",
    fallback: src.fallback === "aus" ? "aus" : "quote",
    fallbackQuote: grenze(zahl(src.fallbackQuote, d.fallbackQuote), 1.2, 20),
  };
}

// Vorzeichen einer Begegnung: 1 = Heimsieg, -1 = Auswärtssieg, 0 = Remis.
const seite = (h, a) => (h > a ? 1 : h < a ? -1 : 0);

// Wer ist nach der TABELLE der Außenseiter? Rückgabe wie `seite`:
// 1 = Heim ist Außenseiter, -1 = Gast, 0 = kein klarer Abstand.
// `null` heißt: keine Tabelle vorhanden (nicht dasselbe wie „kein Abstand").
export function aussenseiterNachTabelle(snap, cfg) {
  const platz = snap?.tabellenPlatz;
  const punkte = snap?.tabellenPunkte;
  const quelle = cfg.bezug === "punkte" ? punkte : platz;
  if (!quelle || !Number.isFinite(quelle.home) || !Number.isFinite(quelle.away)) return null;

  // Beim PLATZ ist die größere Zahl schlechter, bei PUNKTEN die kleinere.
  // Ein einziges Vorzeichen falsch, und der Bonus ginge an den Favoriten.
  const abstand = Math.abs(quelle.home - quelle.away);
  if (abstand < cfg.abAbstand) return 0;
  const heimSchlechter = cfg.bezug === "punkte"
    ? quelle.home < quelle.away
    : quelle.home > quelle.away;
  return heimSchlechter ? 1 : -1;
}

// Ersatzweg über die Marktquote, wenn keine Tabelle vorliegt.
function aussenseiterNachQuote(snap, cfg) {
  const h = snap?.winner?.home, a = snap?.winner?.away;
  if (!Number.isFinite(h) || !Number.isFinite(a) || h <= 0 || a <= 0) return 0;
  if (h / a >= cfg.fallbackQuote) return 1;   // Heim ist teurer = Außenseiter
  if (a / h >= cfg.fallbackQuote) return -1;
  return 0;
}

// ── Der Aufschlag ───────────────────────────────────────────
// `spieltag` kommt aus dem Snapshot, wenn er dort steht — sonst aus dem
// Aufruf. Ohne Spieltag greift `abSpieltag` nicht, und das wäre stillschweigend
// falsch, deshalb gilt dann der Fallback.
export function tabellenBonusAufschlag(tip, snap, rules, actual = null) {
  const cfg = sanitizeTabellenBonus(rules?.tabellenBonus);
  if (!cfg.enabled) return 0;

  const spieltag = Number.isFinite(snap?.matchday) ? snap.matchday : null;
  const zuFrueh = spieltag !== null && spieltag < cfg.abSpieltag;

  let aussen = zuFrueh ? null : aussenseiterNachTabelle(snap, cfg);
  if (aussen === null) {
    if (cfg.fallback === "aus") return 0;
    aussen = aussenseiterNachQuote(snap, cfg);
  }
  if (aussen === 0) return 0;

  const getippt = seite(tip?.home, tip?.away);
  // Ein Remis-Tipp ist kein Tipp auf den Außenseiter, sondern die dritte Option.
  if (getippt === 0) return 0;

  const aufAussenseiter = getippt === aussen;
  if (!aufAussenseiter) {
    // Dämpfer für den erwartbaren Sieg — nur wenn ausdrücklich gewünscht.
    return cfg.richtung === "auchFavorit" ? -cfg.aufschlag : 0;
  }

  if (!cfg.nurWennRichtig) return cfg.aufschlag;
  if (!actual) return 0;
  return seite(actual.home, actual.away) === getippt ? cfg.aufschlag : 0;
}

// Klartext für Aufschlüsselung und Oberfläche.
export function beschreibeTabellenBonus(rules) {
  const cfg = sanitizeTabellenBonus(rules?.tabellenBonus);
  if (!cfg.enabled) return "aus";
  const mass = cfg.bezug === "punkte" ? "Punkte" : "Plätze";
  const teile = [
    `ab ${cfg.abAbstand} ${mass} Abstand`,
    `+${Math.round(cfg.aufschlag * 100)} %`,
    cfg.nurWennRichtig ? "nur bei richtigem Tipp" : "als Spielgewicht",
    `ab Spieltag ${cfg.abSpieltag}`,
  ];
  if (cfg.richtung === "auchFavorit") teile.push("Dämpfer für den Favoriten");
  if (cfg.fallback === "aus") teile.push("ohne Tabelle: aus");
  return teile.join(" · ");
}
