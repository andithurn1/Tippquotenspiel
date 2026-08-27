// ============================================================
//  DAS AUSGEÜBTE RECHT — Weg B, von Andi entschieden (27.08.2026)
//
//  🔴 Andi zur Frage „wo landet eine ausgeübte Wahl?" (design/rundenmenue.md
//  Teil 1, drei Wege mit Preis): **„ja b"** — eigene Tabelle, eine Zeile je
//  Ausübung.
//
//  ── Warum das die richtige Entscheidung war ──
//  Weg C (ins Regelwerk der Runde schreiben) wäre am billigsten gewesen und
//  hätte in Woche drei zugeschlagen: **das Regelwerk hat kein Gedächtnis.**
//  Schreibt Spieltag 6 das Topspiel hinein, steht es an Spieltag 7 immer noch
//  da — und rückwirkend würde ein Tipp aus Spieltag 5 unter einem Regelwerk
//  gewertet, das es damals nicht gab. Dieselbe Falle wie eine nachträglich
//  veränderte Quote.
//
//  ⚠️ Und deshalb steht der SPIELTAG in jeder Zeile. Ein ausgeübtes Recht ist
//  eine Aussage über GENAU EINEN Spieltag, nie über die Runde.
//
//  ── Zwei Arten, zwei völlig verschiedene Wege ──
//  Das ist der Teil, den man beim Bauen leicht übersieht:
//
//  | Art | Was die Wahl ist | Wohin sie greift |
//  |---|---|---|
//  | `bigGame` | eine Match-Id | ins REGELWERK dieses Spieltags (`bigGame.festesSpiel`) |
//  | `wirkung` | ein Angebots-Key | in die WERTUNG, als Vorgang wie ein Ereignis |
//
//  🔴 Das Zweite ist Andis eigene Einordnung: *„ist quasi als Ereignis was
//  alle trifft und nicht Fremdjoker"*. Eine ausgeübte Wirkung ist deshalb
//  KEINE Regeländerung, sondern genau das, was ein Ereignis auch erzeugt —
//  und läuft durch `wendeAn`, dieselbe Funktion. Eine zweite Wirkungs-Maschine
//  wäre die doppelte Wahrheit.
//
//  ⚠️ Ein Abzug trifft den Sieger MIT. Das ist kein Versehen, sondern der
//  Grund, warum ein Recht keine Waffe ist (siehe Kopf von `rechte.js`).
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { angeboteFuer } from "./rechte";
import { wendeAn } from "./wirkung";

// ── Eine Zeile aus `rechte_ausgeuebt` ───────────────────────
// `{ spieltag, userId, angebotKey, wert }`
//   spieltag    — der RUNDEN-Spieltag, für den die Wahl gilt (nicht der, an
//                 dem sie getroffen wurde)
//   userId      — wer sie getroffen hat
//   angebotKey  — welches Angebot aus `rules.rechte.angebote`
//   wert        — bei `bigGame` die Match-Id, sonst null
//
// ⚠️ Alles andere fliegt raus, statt halb durchzurutschen: eine Ausübung ohne
// Spieltag ist nicht einordenbar, und eine ohne Angebots-Key zeigt auf nichts.
export function sanitizeAusuebung(roh) {
  const p = roh && typeof roh === "object" ? roh : {};
  // 🔴 `null`-Prüfung VOR dem `Number()` — `Number(null)` ist 0 und endlich,
  // und ein Spieltag 0 wäre hier besonders bösartig: die Wahl griffe auf
  // einem Spieltag, den es nicht gibt, und niemand fände sie wieder.
  // Steht als mechanische Regel in `docs/werkzeug-fallen.md`, nachdem der
  // Griff an EINEM Tag dreimal zugeschlagen hat.
  const roheZahl = p.spieltag ?? p.matchday;
  const spieltag = (roheZahl === null || roheZahl === undefined || roheZahl === "")
    ? NaN : Number(roheZahl);
  const key = typeof (p.angebotKey ?? p.angebot_key) === "string" ? (p.angebotKey ?? p.angebot_key) : "";
  const userId = p.userId ?? p.user_id ?? null;
  if (!Number.isFinite(spieltag) || spieltag < 1 || !key || userId == null) return null;
  const wert = p.wert === undefined ? null : p.wert;
  return { spieltag: Math.floor(spieltag), userId, angebotKey: key, wert };
}

export function sanitizeAusuebungen(liste = []) {
  const out = [];
  const gesehen = new Set();
  for (const roh of Array.isArray(liste) ? liste : []) {
    const a = sanitizeAusuebung(roh);
    if (!a) continue;
    // ⚠️ Eine Wahl je Spieltag und Angebot. Zwei Zeilen für denselben
    // Spieltag wären zwei Topspiele — die spätere gewinnt, weil die Ablage
    // chronologisch liefert und ein Widerruf sonst nicht möglich wäre.
    const k = `${a.spieltag}|${a.angebotKey}`;
    if (gesehen.has(k)) {
      const i = out.findIndex((x) => `${x.spieltag}|${x.angebotKey}` === k);
      out[i] = a;
      continue;
    }
    gesehen.add(k);
    out.push(a);
  }
  return out;
}

// ── Wer hält das Recht? ─────────────────────────────────────
// Der Sieger des Spieltags — und zwar des VORIGEN: man gewinnt an Spieltag n
// und bestimmt für n+1.
//
// ⚠️ `spieltagsPunkte` ist die Liste aus `getSpieltagsPunkte` (Frage 4 der
// Runden-Schicht) und wird NICHT nachgerechnet. Sie ist bereits auf dem
// fertigen Verlauf gerechnet — der Sieger muss derselbe sein, den die Tabelle
// daneben zeigt.
//
// Gleichstand: `null`. **Kein Losentscheid**, und das ist Absicht — wer bei
// Gleichstand würfelt, verschenkt eine Bühne an den Zufall, und niemand kann
// hinterher erklären, warum. Andi entscheidet, was dann passieren soll
// (❓ steht in `design/ideen.md`).
export function inhaberFuer(spieltagsPunkte = [], spieltag) {
  const roh = (spieltag === null || spieltag === undefined || spieltag === "")
    ? NaN : Number(spieltag);
  if (!Number.isFinite(roh)) return null;
  const amTag = (Array.isArray(spieltagsPunkte) ? spieltagsPunkte : [])
    .filter((p) => Number(p?.matchday ?? p?.spieltag) === roh);
  if (!amTag.length) return null;
  const best = Math.max(...amTag.map((p) => Number(p.punkte) || 0));
  const sieger = amTag.filter((p) => (Number(p.punkte) || 0) === best);
  return sieger.length === 1 ? sieger[0].userId : null;
}

// ── Was wurde für DIESEN Spieltag gewählt? ──────────────────
export function ausuebungenFuer(ausuebungen = [], spieltag) {
  const roh = (spieltag === null || spieltag === undefined || spieltag === "")
    ? NaN : Number(spieltag);
  if (!Number.isFinite(roh)) return [];
  return sanitizeAusuebungen(ausuebungen).filter((a) => a.spieltag === roh);
}

// ── Weg 1: ins Regelwerk (nur `bigGame`) ────────────────────
// 🔴 Gibt das Regelwerk UNVERÄNDERT zurück, wenn nichts zu ändern ist —
// dieselbe Objekt-Identität. `regelnFuerSpieltag` merkt sich seine Ergebnisse
// je Spieltag; ein frisches Objekt bei jedem Aufruf machte diesen Speicher
// wertlos und jede Vergleichsprüfung falsch-positiv.
export function regelnMitRechten(rules, ausuebungen = [], spieltag) {
  const fuer = ausuebungenFuer(ausuebungen, spieltag);
  if (!fuer.length) return rules;
  const angebote = angeboteFuer(rules);
  let out = rules;
  for (const a of fuer) {
    const angebot = angebote.find((g) => g.key === a.angebotKey);
    if (angebot?.art !== "bigGame" || !a.wert) continue;
    // ⚠️ `bigGame` muss überhaupt an sein. Ein festes Spiel in einem
    // ausgeschalteten Topspiel wäre eine Einstellung ohne Wirkung — und der
    // Sieger hätte gewählt und nichts davon gehabt.
    if (!rules?.bigGame?.enabled) continue;
    out = { ...out, bigGame: { ...out.bigGame, festesSpiel: a.wert } };
  }
  return out;
}

// ── Weg 2: in die Wertung (`wirkung`) ───────────────────────
// Erzeugt dieselben Vorgänge wie ein Ereignis — über `wendeAn`, nicht über
// eine eigene Rechnung.
//
// ⚠️ `betroffene` = ALLE Mitglieder. Andis Einordnung: „ist quasi als Ereignis
// was alle trifft und nicht Fremdjoker". Der Sieger ist mit dabei.
export function vorgaengeAusRechten({
  ausuebungen = [], rules, mitglieder = [], reihenfolge = [], spieltagsPunkte = null,
} = {}) {
  const alle = sanitizeAusuebungen(ausuebungen);
  if (!alle.length || !mitglieder.length) return [];
  const angebote = angeboteFuer(rules);
  if (!angebote.length) return [];

  const out = [];
  for (const a of alle) {
    const angebot = angebote.find((g) => g.key === a.angebotKey);
    if (angebot?.art !== "wirkung" || !angebot.wirkung) continue;
    // 🔴 Die Übersetzung, ohne die nichts ankommt: eine Ausübung trägt den
    // RUNDEN-Spieltag, `applyEreignisWirkungen` sucht über
    // `wettbewerb|matchday`. Über die nackte Zahl gesucht träfe „Spieltag 1"
    // fünf Wettbewerbe auf einmal — derselbe Grund, aus dem
    // `wirkungsVorgaenge` seine `reihenfolge` mitführt.
    const tag = reihenfolge[a.spieltag - 1];
    if (!tag) continue;   // Spieltag liegt (noch) nicht im Verlauf
    for (const v of wendeAn({
      wirkung: angebot.wirkung,
      betroffene: mitglieder,
      mitglieder,
      spieltagsPunkte,
    })) {
      out.push({
        ...v,
        wettbewerb: tag.wettbewerb, matchday: tag.matchday,
        key: `recht:${a.angebotKey}`, vonUserId: a.userId,
      });
    }
  }
  return out;
}

// ── Was steht noch offen? ───────────────────────────────────
// Wer hält ein Recht, das er noch nicht ausgeübt hat? Genau die Auskunft, die
// eine Oberfläche braucht, um überhaupt einen Knopf zu zeigen.
//
// ⚠️ Gibt `null` statt eines leeren Objekts, wenn niemand dran ist — „nie halb
// gesetzt", dieselbe Regel wie in `limitKlassen.js`.
export function offenesRecht({ rules, ausuebungen = [], spieltagsPunkte = [], spieltag } = {}) {
  const roh = (spieltag === null || spieltag === undefined || spieltag === "")
    ? NaN : Number(spieltag);
  if (!Number.isFinite(roh) || roh < 2) return null;
  const angebote = angeboteFuer(rules);
  if (!angebote.length) return null;
  // Gewonnen wird am VORIGEN Spieltag, gewählt wird für diesen.
  const inhaber = inhaberFuer(spieltagsPunkte, roh - 1);
  if (inhaber == null) return null;
  const schon = new Set(ausuebungenFuer(ausuebungen, roh).map((a) => a.angebotKey));
  const offen = angebote.filter((g) => !schon.has(g.key));
  if (!offen.length) return null;
  return { userId: inhaber, spieltag: roh, gewonnenAm: roh - 1, angebote: offen };
}

// ── Ein Satz für die Oberfläche ─────────────────────────────
export function beschreibeAusuebung(ausuebung, rules, nameVon = (id) => id) {
  if (!ausuebung) return "";
  const angebot = angeboteFuer(rules).find((g) => g.key === ausuebung.angebotKey);
  const wer = nameVon(ausuebung.userId);
  if (angebot?.art === "bigGame") {
    return `${wer} hat das Topspiel für Spieltag ${ausuebung.spieltag} bestimmt.`;
  }
  return `${wer} hat für Spieltag ${ausuebung.spieltag} etwas ausgelöst, das alle trifft.`;
}
