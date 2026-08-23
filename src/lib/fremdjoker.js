// ============================================================
//  FREMDJOKER — die Familie, ihre EINE Auskunft und die zwei neuen Arten
//
//  🔴 Vier Joker greifen in den Tipp eines ANDEREN: **Block · Klau ·
//  Trittbrettfahrer · Gegenwette**. Andi hat der Familie am 22.08.2026 den
//  Namen gegeben (`vokabular.md`), und ihre vier offenen Punkte stehen in
//  `design/auftraege.md` als JK4–JK7:
//
//    JK4  Eingriffe in fremde Tipps: blocken · mitprofitieren · dagegen wetten
//    JK5  Sperrfrist je Ziel — damit nicht immer dieselben getroffen werden
//    JK6  Eingriffe müssen VOR der Frist sichtbar und zurücknehmbar sein
//    JK7  Die ganze Familie in EINEM Griff schaltbar
//
//  ── 🔴 Warum diese Datei existiert: die EINE Auskunft ──
//  Klau und Block wohnen in `rules.duell`, Trittbrettfahrer und Gegenwette in
//  `rules.eingriffe`. Das ist eine Asymmetrie, und sie ist Absicht: die beiden
//  alten Arten ein zweites Mal unter `eingriffe` zu führen hieße, dass eine
//  Runde ZWEI Antworten auf „ist der Block an?" hätte. Genau diese Fehlerklasse
//  hat das Projekt am meisten Zeit gekostet (siehe die Runden-Schicht in
//  CLAUDE.md: von 17 Fehlern an einem Tag war keiner ein Rechenfehler).
//
//  Der Preis der Asymmetrie ist, dass „welche Fremdjoker laufen gerade?" nicht
//  mehr an einem Feld abzulesen ist. Deshalb steht hier `aktiveArten(rules)` —
//  **die einzige Stelle, an der diese Frage beantwortet wird.** Wer sie
//  irgendwo nachbaut, baut die zweite Wahrheit.
//
//  ── Wer wen importiert ──
//    eingriffe.js   → nichts                     (Kataloge, Grenzen, Formel)
//    duellJoker.js  → eingriffe.js               (die Wertung, alle vier Arten)
//    fremdjoker.js  → beide + ergebnisMatrix     (diese Datei)
//  Umgekehrt importiert NIEMAND diese Datei aus der Engine-Kette heraus —
//  sonst entstünde über `ergebnisMatrix → engine → duellJoker` ein Zyklus.
//  Die Stores und die Oberflächen dürfen und sollen sie lesen.
//
//  ── ⚠️ Was hier NICHT entschieden wird ──
//  Die WERTUNG steht in `duellJoker.js` (`applyDuellJoker`), auch für die
//  beiden neuen Arten. Diese Datei bereitet Einsätze auf und beantwortet
//  Fragen über die Familie — sie rechnet keine Punkte nach. Eine zweite
//  Fassung des Transfers würde unweigerlich auseinanderlaufen.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import {
  sanitizeEingriffe, gegenquote, FREMDJOKER_ARTEN, DEFAULT_EINGRIFFE, jokerArtVon,
  sperreFuer, sichtFuer, losFuer, sanitizeSchutz, wartezeit,
} from "./eingriffe";
import {
  sanitizeDuellJoker, einsaetzeAusTipps, zulaessigeZiele as zulaessigeZieleDuell,
  konflikte as duellKonflikte,
} from "./duellJoker";
import { wahrscheinlichkeiten } from "./ergebnisMatrix";
import { sanitizeTippfenster, tippStatus } from "./tippfenster";
// 🔴 Die Rücknahme (JK6) kommt aus der GRUNDFORM, nicht aus einem eigenen
// Feld: `jokerBasis.widerruf` beantwortet „bis wann darf ich zurücknehmen?"
// je Art, und die Tippabgabe setzt genau das beim Speichern durch. Ein
// zweites Feld daneben hätte anzeigen können, was das Speichern verweigert —
// die Begründung steht bei `jokerArtVon` in `eingriffe.js`.
import { basisFuer, darfWiderrufen } from "./jokerBasis";
// ⚠️ DIESELBE Zufallsquelle wie Joker-Plan, Ersatz-Tipp und Ereignis-Auswahl.
// Sie ist Spielstand, kein Hilfsmittel: ändert sich ihr Ergebnis, verschieben
// sich rückwirkend die Lose jeder laufenden Runde (siehe Kopf von `seeded.js`).
import { seeded } from "./seeded";

// ── 1) Die EINE Auskunft über die Familie ───────────────────

// Welche Fremdjoker laufen in diesem Regelwerk wirklich? Rückgabe sind
// Schlüssel aus `FREMDJOKER_ARTEN`, in der Reihenfolge des Katalogs.
//
// 🔴 Das Dach (`eingriffe.enabled`, JK7) nimmt nur weg: steht es auf `false`,
// ist die Liste leer, ganz gleich was `duell` sagt. Es kann nichts
// einschalten, was für sich aus ist — deshalb ändert seine Vorgabe `true`
// an keinem bestehenden Regelwerk etwas.
export function aktiveArten(rules) {
  const eg = sanitizeEingriffe(rules?.eingriffe);
  if (!eg.enabled) return [];
  const d = sanitizeDuellJoker(rules?.duell);
  const an = {
    block: d.enabled && d.typen.includes("block"),
    klau: d.enabled && d.typen.includes("klau"),
    trittbrett: eg.trittbrett.enabled,
    gegenwette: eg.gegenwette.enabled,
  };
  return FREMDJOKER_ARTEN.map((a) => a.key).filter((k) => an[k]);
}

// Läuft überhaupt ein Fremdjoker? Die Kurzform, die `brauchtVerlauf` und die
// Oberflächen brauchen.
export function familieAn(rules) {
  return aktiveArten(rules).length > 0;
}

// 🔴 JK7 — „die ganze Familie in EINEM Griff aus- und einschaltbar".
//
// Das Feld `eingriffe.enabled` allein ist nur der AUS-Griff (siehe den
// Kopfkommentar von `eingriffe.js`: es nimmt weg, es gibt nichts dazu). Andi
// will beide Richtungen: „Büro-Runde nein, Freundesrunde ja." Diese Funktion
// ist der EIN-Griff dazu.
//
// `an: false` → Dach zu. Alles andere bleibt stehen, wie es eingestellt war;
//               wer die Familie später wieder anschaltet, bekommt seine
//               Einstellungen zurück statt einer zurückgesetzten Runde.
// `an: true`  → Dach auf UND, falls dann immer noch keine Art liefe, die
//               Grundausstattung: Block und Klau an. Ohne diesen zweiten
//               Schritt wäre „ein Klick zu" ein Klick, der nichts tut.
//
// ⚠️ Bewusst NICHT alle vier: Trittbrettfahrer und Gegenwette sind eigene
// Spielarten mit eigenem Preis (Einsatz, Kopier-Anteil). Sie einfach
// mitzuschalten hieße, einem Admin vier Mechaniken unterzuschieben, von denen
// er zwei nicht bestellt hat — genau der Wildwuchs, vor dem `design/ideen.md`
// warnt. Sie stehen einen Klick daneben.
export function familieSchalten(rules, an) {
  const eg = sanitizeEingriffe(rules?.eingriffe);
  const basis = { ...(rules ?? {}), eingriffe: { ...eg, enabled: an === true } };
  if (an !== true) return basis;
  const d = sanitizeDuellJoker(rules?.duell);
  if (aktiveArten(basis).length) return basis;
  return { ...basis, duell: { ...d, enabled: true, typen: ["klau", "block"] } };
}

// Ein Satz für die Oberfläche, Muster `beschreibeDuell`.
export function beschreibeFremdjoker(rules) {
  const arten = aktiveArten(rules);
  if (!arten.length) {
    return sanitizeEingriffe(rules?.eingriffe).enabled
      ? "Keine Fremdjoker: niemand greift in den Tipp eines anderen ein."
      : "Fremdjoker sind für diese Runde ganz abgeschaltet.";
  }
  const namen = arten.map((k) => FREMDJOKER_ARTEN.find((a) => a.key === k).label);
  const liste = namen.length === 1
    ? namen[0]
    : `${namen.slice(0, -1).join(", ")} und ${namen[namen.length - 1]}`;
  return `${liste}: ihr greift euch gegenseitig in einzelne Tipps.`;
}

// ── 2) JK5 — die Zielwahl mit Sperrfrist ────────────────────

// 🔴 DER Weg, auf dem eine Oberfläche nach erlaubten Zielen fragt.
//
// `duellJoker.zulaessigeZiele` nimmt die Sperrfrist nur als Kontext entgegen —
// wer sie dort vergisst, verliert JK5 still, und eine tote Einstellung sieht
// exakt aus wie eine, die greift (`npm run greift`, Teil 4). Diese Funktion
// reicht sie aus dem Regelwerk durch, damit es keine zweite Aufrufform gibt.
export function zulaessigeZiele(board, userId, rules, kontext = {}) {
  const art = kontext.art ?? null;
  // 🔴 Das Los wird HIER gezogen, nicht in `duellJoker.js`: die Auslosung
  // braucht Rundennummer, Spieltag und die Los-Einstellungen, und keins davon
  // kennt die Wertungs-Datei. `undefined` heißt dort „nicht ausgelost".
  const los = sanitizeDuellJoker(rules?.duell).zielWahl === "ausgelost"
    ? meinLos(rules, {
        userId, userIds: (board ?? []).map((b) => b.userId),
        spieltag: kontext.aktuellerSpieltag, seed: kontext.seed ?? "", art,
        einsaetzeJeSpieler: kontext.einsaetzeJeSpieler ?? null,
      })?.ziel ?? null
    : undefined;
  return zulaessigeZieleDuell(board, userId, rules?.duell, {
    ...kontext, art, sperre: sperreFuer(art, rules?.eingriffe), losZiel: los,
  });
}

// Welche Ziele sind für WELCHE Art erlaubt? Seit die Sperre je Fremdjoker
// steht, ist „darf ich Kemal treffen?" ohne die Art nicht mehr beantwortbar:
// der Block kann gesperrt sein, während der Trittbrettfahrer frei ist.
//
// Rückgabe: `{ block: ["u-lena"], klau: [...], … }` — nur für die laufenden
// Arten. Die Oberfläche zeigt die Vereinigung als Zielliste und sperrt dann
// die Art-Knöpfe, die dieses Ziel nicht hergeben.
export function zieleJeArt(board, userId, rules, kontext = {}) {
  const out = {};
  for (const art of aktiveArten(rules)) {
    out[art] = zulaessigeZiele(board, userId, rules, { ...kontext, art });
  }
  return out;
}

// 🔴 Warum ist dieses Ziel gerade gesperrt — und bis wann? Ein „geht nicht"
// ohne Grund liest sich wie ein Fehler; genau deshalb steht diese Funktion
// hier und nicht als Nachrechnung im Screen.
//
// `null`, wenn die Sperre dieses Ziel gar nicht betrifft.
export function sperrGrund(rules, { art, aufUserId, vonUserId, bisherigeEinsaetze = [], aktuellerSpieltag = null }) {
  const sperre = sperreFuer(art, rules?.eingriffe);
  if (aktuellerSpieltag == null) return null;
  const meine = (Array.isArray(bisherigeEinsaetze) ? bisherigeEinsaetze : [])
    .filter((e) => e.vonUserId === vonUserId && e.aufUserId === aufUserId
      && (art == null || e.typ === art));
  if (!meine.length) return null;
  const letzt = Math.max(...meine.map((e) => Number(e.spieltag) || 0));
  const dauer = wartezeit(sperre, meine.length);
  if (dauer <= 0 || aktuellerSpieltag - letzt >= dauer) return null;
  const name = FREMDJOKER_ARTEN.find((a) => a.key === art)?.label ?? "Fremdjoker";
  return {
    art, dauer, frei: letzt + dauer, treffer: meine.length,
    text: sperre.aufschlag > 0
      ? `${name}: schon ${meine.length}× bei dieser Person — die Wartezeit ist dadurch auf `
        + `${dauer} ${dauer === 1 ? "Spieltag" : "Spieltage"} gewachsen. Wieder frei ab Spieltag ${letzt + dauer}.`
      // ⚠️ DATIV: „von 3 SpieltagEN". Im Browser-Durchgang vom 23.08.2026
      // stand „von 3 Spieltage läuft noch" — die Zahl war richtig, der Satz
      // falsch. Der andere Zweig darüber ist Akkusativ („auf 2 Spieltage
      // gewachsen") und bleibt, wie er ist.
      : `${name}: Sperrfrist von ${dauer} ${dauer === 1 ? "Spieltag" : "Spieltagen"} läuft noch. `
        + `Wieder frei ab Spieltag ${letzt + dauer}.`,
  };
}

// ── 3) JK4 — das umgekehrte Modell braucht eine Wahrscheinlichkeit ──

const sgn = (h, a) => (h > a ? 1 : h < a ? -1 : 0);

// Passt ein Endstand zum Tipp — auf der eingestellten Genauigkeit?
// Dieselbe Frage für die Wahrscheinlichkeit VORHER und den Treffer NACHHER,
// deshalb eine Funktion. Zwei Fassungen davon wären zwei Definitionen von
// „der Tipp ist aufgegangen".
function passt(tipH, tipA, h, a, stufe) {
  if (stufe === "exakt") return h === tipH && a === tipA;
  if (stufe === "abstand") return h - a === tipH - tipA;
  return sgn(h, a) === sgn(tipH, tipA);
}

// Mit welcher Wahrscheinlichkeit geht dieser Tipp auf der Stufe `stufe` auf?
//
// ⚠️ Die Quelle ist `wahrscheinlichkeiten()` aus `ergebnisMatrix.js` — die
// EINE Stelle, an der aus Quoten Wahrscheinlichkeiten werden (1/q, auf Summe 1
// normiert, weil das Raster eine Marge trägt). Hier eigene Kehrwerte zu
// bilden hieße, dass die Gegenquote eine andere Welt beschreibt als die
// Ergebnis-Matrix, die derselbe Spieler zwei Bildschirme vorher gesehen hat.
export function trefferWahrscheinlichkeit(tip, snap, stufe = DEFAULT_EINGRIFFE.gegenwette.stufe) {
  const tipH = Number(tip?.home);
  const tipA = Number(tip?.away);
  if (!Number.isFinite(tipH) || !Number.isFinite(tipA)) return null;
  const grid = wahrscheinlichkeiten(snap);
  if (!Array.isArray(grid) || !grid.length) return null;
  let p = 0;
  let summe = 0;
  for (let h = 0; h < grid.length; h++) {
    const zeile = grid[h];
    if (!Array.isArray(zeile)) continue;
    for (let a = 0; a < zeile.length; a++) {
      const q = Number(zeile[a]);
      if (!Number.isFinite(q) || q <= 0) continue;
      summe += q;
      if (passt(tipH, tipA, h, a, stufe)) p += q;
    }
  }
  // Ein leeres Raster hat keine Aussage — `null` statt einer 0, die wie
  // „unmöglich" aussähe und die Gegenquote auf 1,0 zöge.
  if (summe <= 0) return null;
  return p / summe;
}

// Ist der Tipp aufgegangen? Dieselbe Stufe, dasselbe `passt` — nur gegen das
// echte Ergebnis statt gegen das Raster.
export function tippGetroffen(tip, result, stufe = DEFAULT_EINGRIFFE.gegenwette.stufe) {
  const tipH = Number(tip?.home);
  const tipA = Number(tip?.away);
  const h = Number(result?.home);
  const a = Number(result?.away);
  if (![tipH, tipA, h, a].every(Number.isFinite)) return null;
  return passt(tipH, tipA, h, a, stufe);
}

// Was zahlt eine Gegenwette gegen DIESEN Tipp, wenn sie aufgeht? Nur Anzeige
// (die Wertung rechnet in `applyDuellJoker`), aber aus derselben Formel —
// eine Vorschau, die eine andere Zahl nennt als die Abrechnung, ist schlimmer
// als gar keine.
export function gegenwetteVorschau(tip, snap, rules) {
  const eg = sanitizeEingriffe(rules?.eingriffe);
  const p = trefferWahrscheinlichkeit(tip, snap, eg.gegenwette.stufe);
  const q = gegenquote(p);
  if (q == null) return null;
  return {
    p,
    quote: +q.toFixed(2),
    einsatz: eg.gegenwette.einsatz,
    gewinn: Math.round(eg.gegenwette.einsatz * (q - 1)),
    verlust: eg.gegenwette.einsatz,
    stufe: eg.gegenwette.stufe,
  };
}

// ── 3b) JK12: das ausgeloste Ziel ───────────────────────────
//
// 🔴 Andi, 22.08.2026: „dass man eine fest ausgeloste Person bekommt … man
// kann sich also sein Opfer nicht genau aussuchen, aber muss eben bei seiner
// Tippabgabe schauen, bei welchem Einzelspiel man den jeweiligen Joker
// einsetzt."
//
// ── Warum ein RING und nicht „jeder zieht unabhängig" ──
// Bei unabhängigen Ziehungen können drei Spieler denselben ziehen — und genau
// das Rudelbilden, das das Los verhindern soll, wäre wieder da, nur mit
// Zufall statt Absicht. Deshalb eine Permutation: jeder zieht GENAU EINEN und
// wird GENAU EINMAL gezogen. Dieselbe Bauform wie beim Wichteln, und aus
// demselben Grund.
//
// `paare: "gegenseitig"` bricht den Ring in Paare auf. Bei ungerader
// Teilnehmerzahl bleibt einer übrig; der bildet mit dem letzten Paar einen
// Dreier-Ring, statt ein zweites Mal gezogen zu werden. Auch das hält die
// Regel „jeder wird genau einmal gezogen" ein — und die ist wichtiger als die
// Gegenseitigkeit, denn sie ist der ganze Zweck der Auslosung.

// Deterministisch mischen. Fisher-Yates mit `seeded`, damit dieselbe Runde bei
// jedem Aufruf dieselbe Reihenfolge bekommt — auf jedem Gerät, zu jeder Zeit.
function mischen(liste, salz) {
  const out = [...liste];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(seeded(`${salz}|${i}`) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Wer zieht wen? Rückgabe: Map(zieherId → zielId).
//
// `einsaetzeJeSpieler` wird nur bei `takt: "einsatz"` gebraucht — dann hängt
// das Salz daran, wie oft jemand schon zugeschlagen hat, und das Los wechselt
// genau dann.
export function losZiele({ userIds = [], spieltag = null, seed = "", los, art = null, einsaetzeJeSpieler = null } = {}) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : []).filter((x) => x != null))].sort();
  const out = new Map();
  if (ids.length < 2 || !los) return out;

  // Das Salz bestimmt, WANN neu gelost wird — die einzige Stelle, an der
  // `takt` etwas bewirkt.
  const taktSalz = los.takt === "saison" ? "saison"
    : los.takt === "einsatz" ? "einsatz"
    : `st${spieltag ?? 0}`;
  const artSalz = los.jeArt && art ? `|${art}` : "";
  const basisSalz = `${seed}|los|${taktSalz}${artSalz}`;

  if (los.takt === "einsatz") {
    // Jeder zieht für sich neu, sobald er eingesetzt hat — ein gemeinsamer
    // Ring ginge hier nicht, weil die Zähler auseinanderlaufen. Deshalb der
    // eine Fall, in dem sich zwei Spieler dasselbe Ziel teilen können; das
    // ist der Preis dafür, dass „nach jedem Einsatz" überhaupt geht, und er
    // steht auch so in der Beschreibung der Einstellung.
    for (const id of ids) {
      const n = einsaetzeJeSpieler?.get?.(id) ?? 0;
      const andere = ids.filter((x) => x !== id);
      const i = Math.floor(seeded(`${basisSalz}|${id}|${n}`) * andere.length);
      out.set(id, andere[Math.min(andere.length - 1, i)]);
    }
    return out;
  }

  const ring = mischen(ids, basisSalz);
  if (los.paare === "gegenseitig") {
    let i = 0;
    // Paare, solange mindestens zwei übrig sind — und wenn am Ende drei
    // übrig bleiben, ein Dreier-Ring statt einer doppelten Ziehung.
    while (ring.length - i >= 2) {
      if (ring.length - i === 3) {
        out.set(ring[i], ring[i + 1]);
        out.set(ring[i + 1], ring[i + 2]);
        out.set(ring[i + 2], ring[i]);
        i += 3;
        break;
      }
      out.set(ring[i], ring[i + 1]);
      out.set(ring[i + 1], ring[i]);
      i += 2;
    }
    return out;
  }

  for (let i = 0; i < ring.length; i++) out.set(ring[i], ring[(i + 1) % ring.length]);
  return out;
}

// Mein Los — die Form, die eine Oberfläche braucht. `null`, wenn diese Runde
// gar nicht auslost.
export function meinLos(rules, { userId, userIds, spieltag, seed = "", art = null, einsaetzeJeSpieler = null } = {}) {
  if (sanitizeDuellJoker(rules?.duell).zielWahl !== "ausgelost") return null;
  const los = losFuer(art, rules?.eingriffe);
  const ziele = losZiele({ userIds, spieltag, seed, los, art, einsaetzeJeSpieler });
  const ziel = ziele.get(userId) ?? null;
  return {
    ziel,
    // Wer hat MICH gezogen? Nur wenn alle Lose offen liegen — sonst wäre es
    // die Antwort auf eine Frage, die die Einstellung ausdrücklich verschließt.
    gezogenVon: los.sichtbar === "alle"
      ? [...ziele.entries()].find(([, z]) => z === userId)?.[0] ?? null
      : null,
    sichtbar: los.sichtbar !== "keines",
    takt: los.takt,
    alle: los.sichtbar === "alle" ? ziele : null,
  };
}

// ── 3c) JK14: geschützte Spiele ─────────────────────────────
//
// 🔴 Die einzige Schutzregel, die dem SPIELER gehört. Er markiert beim Tippen
// die Spiele, an denen sein Abend hängt (`tip.schutz === true`); der Admin
// stellt nur die ANZAHL ein.
//
// ⚠️ Das Kontingent wird HIER durchgesetzt und nicht erst beim Speichern: die
// Wertung muss dieselbe Antwort geben wie der Screen, auch wenn ein Tipp auf
// einem anderen Weg in die Datenbank gekommen ist. Bei mehr Markierungen als
// erlaubt gewinnen die mit dem frühesten Anpfiff, bei Gleichstand die kleinere
// Spiel-Id — dieselbe Regel wie überall sonst, wo hier ein Gleichstand
// aufzulösen ist.
//
// Rückgabe: Set aus `${userId}#${matchId}`.
export function geschuetzteSpiele(tipps = [], rules = {}) {
  const schutz = sanitizeSchutz(rules?.eingriffe?.schutz);
  const out = new Set();
  if (schutz.proSpieltag <= 0) return out;

  const jeSpielerUndTag = new Map();
  for (const t of Array.isArray(tipps) ? tipps : []) {
    if (t?.tip?.schutz !== true || t.userId == null || t.matchId == null) continue;
    const key = `${t.userId}|${t.matchday}`;
    if (!jeSpielerUndTag.has(key)) jeSpielerUndTag.set(key, []);
    jeSpielerUndTag.get(key).push(t);
  }
  const zeit = (t) => {
    const ms = new Date(t.kickoff ?? NaN).getTime();
    return Number.isFinite(ms) ? ms : Infinity;
  };
  for (const kandidaten of jeSpielerUndTag.values()) {
    kandidaten.sort((a, b) => {
      const d = zeit(a) - zeit(b);
      if (d !== 0) return d;
      if (a.matchId == null || b.matchId == null) return 0;
      return a.matchId < b.matchId ? -1 : a.matchId > b.matchId ? 1 : 0;
    });
    for (const t of kandidaten.slice(0, schutz.proSpieltag)) out.add(`${t.userId}#${t.matchId}`);
  }
  return out;
}

// Wie viele Spiele darf ich an DIESEM Spieltag noch schützen? Für die
// Tippabgabe — sie muss sagen können „du hast dein eines schon vergeben",
// statt eine Markierung stumm zu schlucken.
export function schutzStand(tipps = [], rules = {}, { userId, spieltag } = {}) {
  const schutz = sanitizeSchutz(rules?.eingriffe?.schutz);
  const meine = (Array.isArray(tipps) ? tipps : []).filter(
    (t) => t?.userId === userId && t?.matchday === spieltag && t?.tip?.schutz === true);
  return {
    erlaubt: schutz.proSpieltag,
    vergeben: meine.length,
    frei: Math.max(0, schutz.proSpieltag - meine.length),
    spiele: meine.map((t) => t.matchId),
  };
}

// ── 4) Einsätze: bauen und anreichern ───────────────────────

// 🔴 DIE Stelle, an der aus rohen Tipps Fremdjoker-Einsätze werden.
//
// `einsaetzeAusTipps` (duellJoker.js) baut die Grundform — wer, gegen wen, an
// welchem Spieltag, auf welchem Spiel. Was dort NICHT entstehen kann, ist die
// Gegenwette: sie braucht die Wahrscheinlichkeit des getroffenen Tipps und
// sein Ergebnis, also den Quoten-Schnappschuss. `duellJoker.js` darf
// `ergebnisMatrix.js` nicht importieren (Zyklus über `engine.js`) — deshalb
// hier, eine Ebene darüber.
//
// `tipps` = dieselbe Liste wie für `einsaetzeAusTipps`, also die Einträge aus
// `eintragVon(...)` der Stores: `{ userId, matchday, matchId, kickoff, tip,
// snapshot, result }`.
//
// ⚠️ Die Anreicherung nimmt den Tipp des ZIELS auf demselben Spiel, nicht den
// des Angreifers. Ein Angreifer, der auf ein Spiel setzt, das sein Ziel gar
// nicht getippt hat, bekommt kein `p` — der Einsatz verpufft, statt still auf
// irgendetwas anderes zu rechnen.
export function fremdEinsaetze(tipps = [], rules = {}, { spieltagVon = null } = {}) {
  // 🔴 `proSpieltag` gehört HIERHER und nicht in die Aufrufer: es ist die
  // Antwort auf „wie viele Fremdjoker darf einer an EINEM Spieltag setzen"
  // (Andi, 23.08.2026: mehrere ja, aber auf verschiedene Spiele). Wer
  // `einsaetzeAusTipps` direkt ruft und den Wert vergisst, bekommt stumm
  // wieder nur einen — genau so war der Regler ein Jahr lang wirkungslos.
  const rohAlle = einsaetzeAusTipps(tipps, {
    spieltagVon, proSpieltag: sanitizeDuellJoker(rules?.duell).proSpieltag,
  });
  const eg = sanitizeEingriffe(rules?.eingriffe);

  // 🔴 JK14 — ein geschütztes Spiel ist für Fremdjoker unantastbar. Der
  // Einsatz wird hier ENTWERTET, nicht in der Wertung übersprungen: sonst
  // müsste jede Stelle, die Einsätze zählt (Deckel, `maxProZiel`, Kontingent),
  // den Schutz noch einmal kennen — und eine davon würde ihn vergessen.
  //
  // Die zwei Varianten aus Andis offener Frage, jetzt als Einstellung:
  //   `zurueck`    der Einsatz zählt gar nicht → er fällt aus der Liste
  //   `verfaellt`  er zählt, wirkt aber nicht  → er bleibt, mit Marke
  const geschuetzt = geschuetzteSpiele(tipps, rules);
  const roh = rohAlle
    .map((e) => (e.matchId != null && geschuetzt.has(`${e.aufUserId}#${e.matchId}`)
      ? { ...e, geschuetzt: true } : e))
    .filter((e) => !(e.geschuetzt && eg.schutz.verfall === "zurueck"));
  if (!roh.some((e) => e.typ === "gegenwette")) return roh;

  // Tipp + Schnappschuss + Ergebnis je (Spieler, Spiel) — einmal aufbauen.
  const jeTipp = new Map();
  for (const t of Array.isArray(tipps) ? tipps : []) {
    if (t?.userId == null || t.matchId == null) continue;
    jeTipp.set(`${t.userId}#${t.matchId}`, t);
  }

  return roh.map((e) => {
    if (e.typ !== "gegenwette") return e;
    const ziel = jeTipp.get(`${e.aufUserId}#${e.matchId}`);
    if (!ziel) return e;
    const p = trefferWahrscheinlichkeit(ziel.tip, ziel.snapshot, eg.gegenwette.stufe);
    const getroffen = ziel.result ? tippGetroffen(ziel.tip, ziel.result, eg.gegenwette.stufe) : null;
    // Ohne Ergebnis ist die Wette noch nicht entschieden — dann trägt der
    // Einsatz kein `getroffen`, und `applyDuellJoker` lässt ihn liegen.
    if (p == null || getroffen == null) return e;
    return { ...e, p, getroffen };
  });
}

// ── 5) JK6 — sichtbar und zurücknehmbar, VOR der Frist ──────
//
// 🔴 Andis eigentliche Anforderung, wörtlich: „hey du Arschloch, nimm den
// Block bei mir fürs Bayern-Spiel raus, ich habe da ein zu gutes Gefühl."
// Damit dieses Gespräch stattfinden kann, müssen DREI Dinge gelten — und alle
// drei sind hier beantwortet, nicht in der Oberfläche:
//
//   1. Der Eingriff ist sichtbar, BEVOR die Frist läuft  → `eingriffe.sichtbar`
//   2. Er ist zurücknehmbar                              → `jokerBasis.widerruf`
//   3. Man sieht, WER es war                             → `offeneEingriffe`
//
// ⚠️ Das ist keine Feinheit, sondern der ganze Zweck der Familie. Ein
// Eingriff, der erst bei der Abrechnung auftaucht, ist keine Einladung zum
// Gespräch, sondern eine Punkteverschiebung.

// In welchem Abschnitt eines Spiels stehen wir — und was ist darin erlaubt?
//
// Die drei Abschnitte kommen aus `tippStatus` (tippfenster.js), das seit
// `tippfenster.schlussStunden` den Zustand `frist` kennt: Tippschluss vorbei,
// Anpfiff noch nicht. Genau das ist Andis zweite Phase („erstmal tippt jeder,
// und dann einen Tag später … werden die Joker auf die anderen gewählt").
//
// ⚠️ **Der Übergangsfall, benannt statt versteckt:** ohne gemeinsamen
// Tippschluss (`schlussStunden: 0`, die Vorgabe) gibt es gar keine zweite
// Phase. Dann bleibt es beim heutigen Verhalten — der Eingriff wird beim
// Tippen gesetzt, also im offenen Fenster. Das ist nicht die Zielform, aber
// es ist ehrlicher als ein Fenster, das nie aufgeht: eine Runde ohne
// Tippschluss könnte sonst überhaupt keinen Fremdjoker mehr setzen, ohne dass
// irgendwo stünde warum. `konflikte()` meldet die fehlende Einstellung.
// `art` (optional) ist der Fremdjoker, um den es geht — er entscheidet über die
// Rücknahme, denn die Grundform steht JE ART. Ohne `art` gilt die STRENGSTE
// unter den laufenden Arten: unter-versprechen ist die harmlose Richtung,
// über-versprechen wäre eine Zusage, die das Speichern gleich wieder kassiert
// (dieselbe Wahl wie `duellBasis` bei der Abklingzeit).
export function eingriffFenster(match, rules, jetzt = Date.now(), starts = null, art = null) {
  const eg = sanitizeEingriffe(rules?.eingriffe);
  const st = tippStatus(match, rules, jetzt, starts);
  const zweiPhasen = sanitizeTippfenster(rules?.tippfenster).schlussStunden > 0;

  const phase = st.zustand === "frist" ? "eingriffe"
    : st.zustand === "offen" ? "tippen"
    : st.zustand === "zu" ? "zu"
    : "vorbei";

  const setzbar = familieAn(rules)
    && (zweiPhasen ? phase === "eingriffe" : phase === "tippen");

  // 🔴 DIESELBE Funktion, die auch die Tippabgabe beim Speichern fragt
  // (`darfWiderrufen`). Hier eine eigene Frist zu rechnen hieße, dass die
  // Anzeige „noch zurücknehmbar" sagt und das Speichern es verweigert.
  const arten = art ? [art] : aktiveArten(rules);
  const ruecknehmbar = familieAn(rules) && arten.length > 0 && arten.every((k) => {
    const schluessel = jokerArtVon(k);
    return schluessel
      ? darfWiderrufen(basisFuer(schluessel, rules), jetzt, st.anpfiff)
      : false;
  });

  return {
    phase,
    zweiPhasen,
    setzbar,
    ruecknehmbar,
    // JK6.1: „sichtbar, BEVOR die Frist läuft". Ohne zweite Phase gibt es
    // dieses Vorher nicht — dann ist der Eingriff ab Anpfiff sichtbar, wie
    // jeder Joker auch.
    // ⚠️ Die Sichtbarkeit steht JE ART. Ohne benannte Art gilt die
    // VERSCHWIEGENSTE der laufenden — unter-versprechen ist die harmlose
    // Richtung, dieselbe Wahl wie bei der Rücknahme darüber.
    sichtbar: (art ? sichtFuer(art, rules?.eingriffe)
      : aktiveArten(rules).every((k) => sichtFuer(k, rules?.eingriffe)))
      ? phase !== "zu" : phase === "vorbei",
  };
}

// Welche Eingriffe muss ein Spieler JETZT sehen — und von wem?
//
// 🔴 „Man sieht, WER es war." Anonym gibt es niemanden, den man ansprechen
// kann; ein verdeckter Eingriff erfüllt Andis Zweck nicht. Deshalb trägt jede
// Zeile `vonUserId` — und der ausdrückliche Gegenfall (Sichtbarkeit `false`
// für diese Art) blendet den Eintrag bis zum Anpfiff ganz aus.
//
// ⚠️ Bewusst KEIN Mittelding („jemand blockt eines deiner Spiele"). Ob das die
// bessere Form wäre, ist in `joker-sondermenue.md` Teil D eine ausdrücklich
// OFFENE Frage von Andi — sie hier auf Verdacht zu bauen hieße, einen dritten
// Zustand zu erfinden, den niemand bestellt hat.
//
// ⚠️ Ohne `fensterFuer` gilt allein die Sichtbarkeit der Art: diese Funktion kennt
// die Spiele nicht und kann die Phase nicht selbst bestimmen. Wer die
// zeitliche Kante braucht, reicht die Rückfrage herein.
//
// `einsaetze` = die Liste aus `fremdEinsaetze`. `fensterFuer(einsatz)` liefert
// je Einsatz das Ergebnis von `eingriffFenster` — der Aufrufer kennt die
// Spiele, diese Funktion nicht.
export function offeneEingriffe(einsaetze = [], rules = {}, { userId = null, fensterFuer = null } = {}) {
  const eg = sanitizeEingriffe(rules?.eingriffe);
  const arten = new Set(aktiveArten(rules));
  const liste = Array.isArray(einsaetze) ? einsaetze : [];

  return liste
    .filter((e) => arten.has(e.typ))
    .filter((e) => userId == null || e.aufUserId === userId || e.vonUserId === userId)
    .map((e) => {
      const f = fensterFuer ? fensterFuer(e) : null;
      // Der eigene Einsatz ist einem selbst immer offen — man hat ihn gesetzt.
      const eigener = e.vonUserId === userId;
      const sichtbar = eigener || (f ? f.sichtbar : sichtFuer(e.typ, rules?.eingriffe));
      return {
        ...e,
        sichtbar,
        eigener,
        // Ohne Fenster keine Zusage: `ruecknehmbar` hängt an Anpfiff und
        // Grundform, und beide kennt nur der Aufrufer über `fensterFuer`.
        ruecknehmbar: eigener && f != null && f.ruecknehmbar,
        art: FREMDJOKER_ARTEN.find((a) => a.key === e.typ) ?? null,
      };
    })
    .filter((e) => e.sichtbar);
}

// ── 6) Konflikte: was eine Runde einstellen MUSS ────────────

// 🔴 Andi, 23.08.2026: „Das muss halt vom Admin klar so eingestellt werden,
// weil sonst geht's nicht auf." Gemeint ist der Zwei-Phasen-Spieltag — ohne
// ihn werden Joker gesetzt, während andere noch tippen.
//
// ⚠️ Gemeldet, nicht still korrigiert — dieselbe Bauart wie
// `fensterKonflikte` in `tippfenster.js`. Eine stille Korrektur würde eine
// Runde umschreiben, die der Admin so gewollt haben könnte; eine Meldung
// lässt ihm die Entscheidung und nimmt ihm die Überraschung.
export function konflikte(rules) {
  // 🔴 BEFUND vom 23.08.2026: `duellJoker.konflikte()` war seit seiner
  // Einführung von KEINER Oberfläche aufgerufen — nur von seinem eigenen
  // Test. Die Meldung „mitverdienen ohne Deckel ist ein neuer Punkte-Kanal"
  // stand gebaut, geprüft und begründet da, und kein Admin hat sie je gesehen.
  // Genau die Fehlerklasse, für die es `npm run tot` gibt; dort fiel sie nicht
  // auf, weil `konflikte` ein Name ist, den ein halbes Dutzend Module trägt.
  //
  // Seither kommen ALLE Konflikte der Familie aus DIESEM einen Aufruf. Ein
  // zweiter Aufrufer für dieselbe Frage wäre der nächste Kandidat fürs
  // Vergessenwerden.
  const out = [...duellKonflikte(rules)];
  if (!familieAn(rules)) return out;
  const f = sanitizeTippfenster(rules?.tippfenster);

  if (f.schlussStunden <= 0) {
    out.push({
      key: "fremdjoker-ohne-tippschluss",
      korrigieren: true,
      text: "Fremdjoker brauchen einen gemeinsamen Tippschluss: erst tippen alle, danach werden "
        + "die Joker auf die anderen gesetzt. Ohne ihn setzt jemand seinen Block, während andere "
        + "noch tippen — und wer zuletzt tippt, weiß bereits, was ihn erwartet.",
    });
  } else if (f.anker !== "spieltag") {
    out.push({
      key: "fremdjoker-ohne-anker",
      korrigieren: true,
      text: "Ein gemeinsamer Tippschluss braucht den Anker „vor dem Beginn des Spieltags“. "
        + "Sonst geht ein spätes Spiel erst auf, wenn der Schluss längst vorbei ist.",
    });
  }

  // 🔴 JK6, zweite Hälfte — geprüft auf der GRUNDFORM, wo die Rücknahme
  // wohnt. `sofortVerbindlich` ist für einen normalen Joker eine legitime
  // Härte; für einen FREMDJOKER hebt sie den Zweck der Familie auf.
  const starr = aktiveArten(rules).filter((k) => {
    const schluessel = jokerArtVon(k);
    return schluessel && basisFuer(schluessel, rules).widerruf === "sofortVerbindlich";
  });
  if (starr.length) {
    const namen = starr.map((k) => FREMDJOKER_ARTEN.find((a) => a.key === k).label).join(", ");
    out.push({
      key: "fremdjoker-ohne-ruecknahme",
      korrigieren: true,
      text: `„Sofort verbindlich“ bei ${namen}: niemand kann einen gesetzten Eingriff wieder `
        + "herausnehmen — und genau darum geht es bei den Fremdjokern („nimm den Block bei mir "
        + "fürs Bayern-Spiel raus“). Gesetzt ist sonst gesetzt, und aus dem Austausch wird eine "
        + "stille Punkteverschiebung. Der Widerruf steht in der Joker-Grundform.",
    });
  }

  // 🔴 JK14, Andis zweite offene Frage — jetzt als Kombinationsregel statt als
  // Vorabentscheidung: ein VERDECKTER Schutz, der den Einsatz zurückgibt,
  // verrät sich selbst. Wer seinen Joker unverbraucht wiederfindet, weiß
  // genau, dass das Spiel geschützt war — und damit auch, welches Spiel dem
  // anderen wichtig ist. Gemeldet, nicht still korrigiert: ein Admin darf das
  // wollen (es ist milder als „verfällt"), er soll es nur wissen.
  const schutz = sanitizeSchutz(rules?.eingriffe?.schutz);
  if (schutz.proSpieltag > 0 && !schutz.sichtbar && schutz.verfall === "zurueck") {
    out.push({
      key: "schutz-verdeckt-verraet-sich",
      korrigieren: true,
      text: "Verdeckter Schutz und Rückgabe des Einsatzes passen nicht zusammen: wer seinen "
        + "Fremdjoker unverbraucht wiederfindet, weiß, dass das Spiel geschützt war — und damit, "
        + "welches Spiel dem anderen wichtig ist. Entweder den Schutz offen zeigen oder den "
        + "Einsatz verfallen lassen.",
    });
  }

  return out;
}

// 🔴 JK19 — der ehrliche Hinweis beim Einschalten (Andi, 23.08.2026): „da muss
// eigentlich jeder genug Hingabe für aufbringen bzw. regelmäßig genug
// reinschauen bei dieser Option."
//
// Gehört in die Oberfläche, in SEINER Sprache — nicht „aktiviert erweiterte
// Zeitsteuerung", sondern was es für die Runde bedeutet. `null`, wenn kein
// Fremdjoker läuft: dann gibt es nichts zu warnen.
export function zweiPhasenHinweis(rules) {
  if (!familieAn(rules)) return null;
  const f = sanitizeTippfenster(rules?.tippfenster);
  const stunden = f.schlussStunden;
  const wann = stunden >= 24 && stunden % 24 === 0
    ? `${stunden / 24} ${stunden === 24 ? "Tag" : "Tage"}`
    : `${stunden} Std.`;
  return stunden > 0
    ? `Eure Runde muss zweimal pro Spieltag reinschauen: erst tippen alle, ${wann} später `
      + "werden die Joker auf die anderen gesetzt. Für eine Büro-Runde ist das zu viel — dort "
      + "die Fremdjoker lieber ganz ausschalten."
    : "Eure Runde muss zweimal pro Spieltag reinschauen: erst tippen alle, danach werden die "
      + "Joker auf die anderen gesetzt. Dafür fehlt noch der gemeinsame Tippschluss.";
}
