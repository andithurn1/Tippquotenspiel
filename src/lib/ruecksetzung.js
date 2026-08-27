// ============================================================
//  RÜCKSETZUNG — die Wirkung, die es im ganzen Katalog nicht gab
//
//  🔴 Andi, 27.08.2026, zum Runden-Menü: „einen Eintrag für die Auslösung
//  (mittels Glücksrad) für die Ereignisse (bspw. auch ein Ereignis dass dann
//  **Joker cooldowns geresettet** werden oder eben **Budget rückgesetzt**
//  wird)".
//
//  ── Warum das eine neue Sorte Wirkung ist ──
//  Der Wirkungs-Katalog kennt bisher nur ZUGABEN und ABZÜGE: Punkte, Narren,
//  Joker, Faktoren. Jede davon rechnet auf einem Wert. Eine Rücksetzung
//  rechnet auf einem ZUSTAND — „was bisher war, zählt nicht mehr". Das kam im
//  ganzen Regelwerk nicht vor.
//
//  ⚠️ Und es ist genau die Sorte, an der dieses Projekt seine teuersten Fehler
//  hatte: ein Zustand, der irgendwo gespeichert wird, ist eine zweite Wahrheit
//  in dem Moment, in dem ihn zwei Stellen lesen. Deshalb wird hier NICHTS
//  gespeichert.
//
//  ── Die Form, und sie ist der ganze Trick ──
//  Eine Rücksetzung ist ein SCHNITT auf der Zeitachse: `{ userId, ziel,
//  abSpieltag }`. Wer danach fragt, was ein Spieler „bisher" getan hat, lässt
//  alles vor dem Schnitt weg. Aus einem Zustand wird ein Filter — und ein
//  Filter ist aus der Historie jederzeit neu ableitbar.
//
//  Damit gilt weiter, was für alles andere hier gilt: die Wahrheit ist die
//  Historie, nicht ein Feld in einer Tabelle.
//
//  Reine Funktionen, UI-frei.
// ============================================================

// ── Was lässt sich zurücksetzen? ────────────────────────────
// ⚠️ Bewusst KURZ. Jeder weitere Eintrag hier braucht eine Stelle, die den
// Schnitt auch anwendet — sonst steht im Admin-Menü eine Belohnung, die nichts
// tut (`npm run tot`, der Befund vom 06.08.: sechs Mechaniken an einem Tag,
// fertig gerechnet und von niemandem gefragt).
export const RUECKSETZ_ZIELE = [
  {
    key: "cooldown",
    label: "Abklingzeiten",
    desc: "Alle Joker-Arten sind sofort wieder frei — die Wartezeit nach dem letzten Einsatz fällt weg.",
    // WO der Schnitt greift, damit die Kontaktstelle nachweisbar ist:
    stelle: "jokerBasis.darfEinsetzen (letzteEinsaetze)",
  },
  {
    key: "budget",
    label: "Narren-Konto",
    desc: "Die bisherigen Käufe zählen nicht mehr gegen das Konto — der Zufluss beginnt von vorn.",
    stelle: "jokerBudget.kontoVerlauf (Käufe)",
  },
];

const ZIEL_KEYS = new Set(RUECKSETZ_ZIELE.map((z) => z.key));

export const istRuecksetzZiel = (key) => ZIEL_KEYS.has(key);

// ── Aus Gutschriften werden Schnitte ────────────────────────
// `gutschriften` ist die Liste aus `drehrad.auswerten()`; jede trägt
// `{ userId, spieltag, belohnung }`. Nur die Rücksetzungs-Belohnungen
// interessieren hier.
//
// ⚠️ `spieltag` ist der RUNDEN-Spieltag (Frage 2 der Runden-Schicht,
// CLAUDE.md) — das Rad zieht bereits in dieser Einheit. Ein Liga-Spieltag
// wäre über mehrere Wettbewerbe mehrfach vergeben, und der Schnitt läge dann
// an fünf Stellen gleichzeitig.
export function schnitteAus(gutschriften = []) {
  const out = [];
  for (const g of Array.isArray(gutschriften) ? gutschriften : []) {
    const ziel = g?.belohnung?.ziel;
    if (g?.belohnung?.typ !== "ruecksetzung" || !ZIEL_KEYS.has(ziel)) continue;
    const st = Number(g.spieltag);
    // ⚠️ `Number(null)` ist 0 und endlich — ohne diese Prüfung entstünde ein
    // Schnitt bei Spieltag 0, der die ganze Historie wegwirft. Derselbe Griff
    // hat an einem Tag zweimal zugeschlagen (`docs/werkzeug-fallen.md`).
    if (g.spieltag === null || g.spieltag === undefined || !Number.isFinite(st)) continue;
    out.push({ userId: g.userId, ziel, abSpieltag: st });
  }
  return out;
}

// ── Ab wann zählt es wieder von vorn? ───────────────────────
// Die JÜNGSTE Rücksetzung gewinnt: zweimal zurückgesetzt heißt, dass der
// spätere Schnitt gilt. `null` = nie zurückgesetzt, also alles zählt.
export function schnittFuer(schnitte = [], userId, ziel) {
  let max = null;
  for (const s of Array.isArray(schnitte) ? schnitte : []) {
    if (!s || s.userId !== userId || s.ziel !== ziel) continue;
    if (max === null || s.abSpieltag > max) max = s.abSpieltag;
  }
  return max;
}

// ── Der Filter selbst ───────────────────────────────────────
// Alles VOR dem Schnitt fällt weg; was AM Spieltag des Schnitts passiert ist,
// bleibt.
//
// ⚠️ Warum „>=" und nicht „>": das Rad wird an einem Spieltag gedreht, an dem
// auch getippt wird. Ein Spieler, der am selben Spieltag die Rücksetzung
// zieht, soll seinen an diesem Tag gesetzten Joker nicht geschenkt bekommen —
// er soll nur das Frühere los sein.
export function abSchnitt(liste = [], abSpieltag, feld = "spieltag") {
  if (abSpieltag === null || abSpieltag === undefined) return Array.isArray(liste) ? liste : [];
  return (Array.isArray(liste) ? liste : []).filter((e) => {
    const roh = e?.[feld];
    // ⚠️ ZUM DRITTEN MAL derselbe Griff, und diesmal in einer Datei, deren
    // Kopfkommentar davor warnt: `Number(null)` ist 0 und `Number.isFinite(0)`
    // ist wahr. Ohne die ausdrückliche Prüfung fiele ein Eintrag ohne Spieltag
    // als „Spieltag 0" unter jeden Schnitt und verschwände lautlos.
    const fehlt = roh === null || roh === undefined || roh === "";
    const st = fehlt ? NaN : Number(roh);
    // Ein Eintrag ohne Spieltag lässt sich nicht einordnen — er BLEIBT.
    // Wegwerfen wäre die stille Variante, und still verschwundene Einträge
    // sind genau die Sorte Fehler, die niemandem auffällt.
    if (!Number.isFinite(st)) return true;
    return st >= abSpieltag;
  });
}

// Beides in einem Griff — die Form, in der ein Screen es braucht.
export function ohneZurueckgesetztes(liste, schnitte, userId, ziel, feld = "spieltag") {
  return abSchnitt(liste, schnittFuer(schnitte, userId, ziel), feld);
}

// ── Ein Satz für die Oberfläche ─────────────────────────────
export function beschreibeSchnitt(schnitt) {
  if (!schnitt) return "";
  const z = RUECKSETZ_ZIELE.find((e) => e.key === schnitt.ziel);
  return `${z?.label ?? schnitt.ziel} zurückgesetzt ab Spieltag ${schnitt.abSpieltag}`;
}
