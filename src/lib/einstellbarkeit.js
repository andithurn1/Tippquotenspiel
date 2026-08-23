// ============================================================
//  EINSTELLBARKEIT — lässt sich JEDE Einstellung überhaupt setzen?
//
//  🔴 Andi am 23.08.2026: „mach die demo runde bzw tests so dass sie alle
//  Einstellbarkeiten abdeckt … um sie zu prüfen."
//
//  Die vorhandenen Durchgänge fragen alle etwas anderes, und keiner fragt
//  DIESE Frage:
//
//    `greift`  bewegt der BLOCK etwas?          — Block-Ebene, Liste von Hand
//    `stufen`  kommt ein Admin an das FELD?     — Erreichbarkeit, nicht Wirkung
//    `anzeige` steht überall dieselbe Zahl?     — Anzeige-Wege
//    `tot`     ruft die Funktion jemand auf?    — Exporte
//
//  Hier geht es um jedes einzelne BLATT des Regelwerks, und um zwei Dinge,
//  die man leicht für selbstverständlich hält:
//
//    1. **Nimmt das Feld überhaupt einen anderen Wert an?** Ein Tippfehler im
//       Namen, ein vergessener Zweig in `sanitize*`, ein Wert außerhalb der
//       eigenen Grenzen — in allen drei Fällen fällt die Einstellung stumm auf
//       die Vorgabe zurück. Sie sieht dann exakt aus wie eine, die greift.
//       Genau davor warnt `greift` in seinem Kopf („EINSTELLUNG VERWORFEN"),
//       aber nur für die Handvoll Messfälle, die dort von Hand stehen.
//    2. **Überlebt der Wert das TEILEN?** Ein Creator-Code, der ein Feld
//       verliert, ergibt beim Empfänger eine andere Runde als beim Absender —
//       und beide Seiten sehen für sich richtig aus.
//
//  ── Warum das ohne gepflegte Liste auskommt ──
//  Die Kandidatenwerte werden aus dem Projekt GEERNTET: aus den Presets, den
//  Charakteren, den Regler-Stufen und dem Schaufenster. Wo irgendeine dieser
//  Quellen ein Feld anders setzt, ist der Kandidat da. Erst wenn keine es
//  tut, greifen generische Kandidaten (Zahl ±1, Boolean umgedreht).
//
//  Das ist Absicht: eine von Hand gepflegte Liste wäre beim nächsten neuen
//  Feld schon veraltet — dieselbe Schwäche, die `greift` Teil 3 bei
//  `tabellenBonus` und `duell.proSpieltag` durchgelassen hat.
//
//  ⚠️ ARRAYS bleiben draußen. `ereignisse.aktive`, `saison.wetten`,
//  `drehrad.felder` und `limitKlassen` sind in der Vorgabe LEER; was in ihren
//  Einträgen steckt, hat mit `LISTEN_FELDER` in `stufenAbdeckung.js` seine
//  eigene Messung. Ein Array hier zu füllen hieße, seine Einträge zu erfinden.
//
//  Reine Funktionen, UI-frei, kein `node:fs`.
// ============================================================

import { DEFAULT_RULES, sanitizeRules, encodePreset, decodePreset } from "./engine";
import { PRESETS } from "./presets";
import { CHARAKTERE } from "./charaktere";
import { REGLER } from "./einfachRegler";
import { schaufensterRegeln } from "./schaufenster";

// ── Felder, die sich NICHT allein umlegen lassen ────────────
//
// Ein Eintrag hier ist eine ENTSCHEIDUNG, keine Ausnahmeliste zum Vollmachen —
// dieselbe Hausregel wie bei `NUR_PROFI` (stufenAbdeckung.js) und `GEDULDET`
// (tot-durchgang.mjs). Wer ein Feld hier einträgt, statt es zu reparieren,
// muss den Satz vertreten können.
//
// Beide unten sind beim ersten Lauf am 23.08.2026 aufgefallen, und beide sind
// richtig so: sie verhindern eine Einstellung, die folgenlos wäre.
export const GEKOPPELT = {
  "ereignisse.enabled":
    "Lässt sich nur einschalten, wenn mindestens ein Ereignis in der Liste "
    + "steht (`aktive.length > 0`). Absicht: „der Admin soll nichts "
    + "einschalten können, das folgenlos bleibt“ — ein Schalter, hinter dem "
    + "nichts liegt, sieht aus wie eine kaputte Mechanik.",
  "wettbewerbe.enabled":
    "Dito: nur zusammen mit mindestens einem Aufschlag oder einer Phasen-Stufe. "
    + "Ein eingeschaltetes Wettbewerbs-Gewicht ohne Gewicht wäre eine Zeile in "
    + "der Übersicht, die nichts bedeutet.",
};

// ── Blätter und Zugriff ─────────────────────────────────────

function blaetter(obj, pfad = "", out = []) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const p = pfad ? `${pfad}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) blaetter(v, p, out);
    else out.push(p);
  }
  return out;
}

const lies = (obj, pfad) => pfad.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

function setze(obj, pfad, wert) {
  const teile = pfad.split(".");
  const kopf = teile.slice(0, -1);
  const letzt = teile[teile.length - 1];
  const kopie = JSON.parse(JSON.stringify(obj));
  let ziel = kopie;
  for (const k of kopf) {
    if (ziel[k] == null || typeof ziel[k] !== "object") ziel[k] = {};
    ziel = ziel[k];
  }
  ziel[letzt] = wert;
  return kopie;
}

// ── Kandidaten ──────────────────────────────────────────────

// Alles, was im Projekt an Regelwerken herumliegt — jede dieser Quellen ist
// ein echter Beleg dafür, dass jemand dieses Feld schon einmal anders wollte.
function quellRegelwerke() {
  const aus = [schaufensterRegeln()];
  for (const p of PRESETS) if (p?.rules) aus.push(p.rules);
  for (const c of CHARAKTERE) if (c?.rules) aus.push(c.rules);
  for (const r of REGLER) for (const st of r.stufen ?? []) if (st?.werte) aus.push(st.werte);
  return aus;
}

// 🔴 Der Wortschatz des Regelwerks: jeder String, der irgendwo an einem Blatt
// steht — in der Vorgabe, in einem Preset, in einem Charakter, in einer
// Regler-Stufe oder im Schaufenster.
//
// Warum das reicht, um Katalog-Felder zu prüfen: die Kataloge teilen sich ihre
// Wörter („spieltag", „saison", „alle", „offen", „nie"). Ein Feld, für das
// KEIN Wort aus diesem Topf durchkommt, ist deshalb kein Beweis für einen
// Fehler — es heißt nur, dass sein Wortschatz sonst nirgends vorkommt. Genau
// so wird es unten auch berichtet: als Abdeckungs-Lücke, nicht als Fund.
//
// ⚠️ Bewusst KEINE Liste importierter Kataloge. Die wäre beim nächsten neuen
// Feld veraltet — dieselbe Schwäche, die `greift` Teil 3 bei `tabellenBonus`
// und `duell.proSpieltag` jahrelang durchgelassen hat.
function wortschatz(quellen, basis) {
  const woerter = new Set();
  for (const r of [basis, ...quellen]) {
    for (const p of blaetter(r)) {
      const v = lies(r, p);
      if (typeof v === "string" && v) woerter.add(v);
    }
  }
  return [...woerter];
}

// Generische Kandidaten, wenn keine Quelle das Feld anders setzt.
function generisch(wert, woerter) {
  if (typeof wert === "boolean") return [!wert];
  if (typeof wert === "number") {
    return [wert + 1, wert - 1, wert * 2, wert / 2, 1, 2, 0, 0.5, 10, 100, 3];
  }
  // `null` heißt fast überall „keine Vorgabe" — eine Zahl ist der einzige
  // Kandidat, der dort etwas bedeutet.
  if (wert === null) return [1, 2, 10];
  if (typeof wert === "string") return woerter.filter((w) => w !== wert);
  return [];
}

// ── Die Messung ─────────────────────────────────────────────

// Für jedes Blatt: gibt es einen Wert, der `sanitizeRules` überlebt — und
// überlebt er auch den Creator-Code?
//
// Rückgabe je Blatt:
//   `{ pfad, vorgabe, kandidat, setzbar, teilbar, quelle }`
//   `setzbar: false` → das Feld nimmt keinen der geprüften Werte an
//   `teilbar: false` → es lässt sich setzen, geht beim Teilen aber verloren
export function pruefeEinstellbarkeit() {
  const basis = sanitizeRules(DEFAULT_RULES);
  const quellen = quellRegelwerke().map((r) => sanitizeRules(r));
  const woerter = wortschatz(quellen, basis);
  // ⚠️ ARRAYS bleiben draußen — siehe Kopfkommentar. Ein Array hier zu füllen
  // hieße, seine Einträge zu erfinden; für sie gibt es `LISTEN_FELDER` in
  // `stufenAbdeckung.js`.
  const pfade = blaetter(basis)
    .filter((p) => p !== "name")
    .filter((p) => !Array.isArray(lies(basis, p)));
  const out = [];

  for (const pfad of pfade) {
    const vorgabe = lies(basis, pfad);
    // Kandidaten: erst die belegten aus dem Projekt, dann die generischen.
    const ausQuellen = [];
    for (const q of quellen) {
      const v = lies(q, pfad);
      if (v !== undefined && JSON.stringify(v) !== JSON.stringify(vorgabe)
        && (v === null || typeof v !== "object")) ausQuellen.push(v);
    }
    const kandidaten = [...new Set([...ausQuellen, ...generisch(vorgabe, woerter)])];

    let treffer = null;
    for (const k of kandidaten) {
      const gesetzt = sanitizeRules(setze(basis, pfad, k));
      if (JSON.stringify(lies(gesetzt, pfad)) === JSON.stringify(k)) {
        treffer = { wert: k, rules: gesetzt, quelle: ausQuellen.includes(k) ? "projekt" : "generisch" };
        break;
      }
    }

    if (!treffer) {
      // 🔴 Hier entscheidet sich, ob das ein FUND ist oder nur eine Lücke im
      // Wortschatz. Drei Fälle, und sie sind nicht gleich viel wert:
      //
      //   BOOLEAN  `!wert` abgelehnt → immer ein Fund. Ein Ja/Nein-Feld, das
      //            nur Ja kennt, ist kein Feld.
      //   ZAHL     keine von ±1, ×2, 0, 1, 2, 10, 100 überlebt → Fund. Eine
      //            Zahl, die nur eine Zahl annimmt, ist eine Konstante.
      //   STRING   nur der geerntete Wortschatz war da → KEIN Fund. Die
      //            Kataloge teilen ihre Wörter nicht vollständig; „nichts
      //            gefunden" heißt hier „nichts bekannt", nicht „kaputt".
      //   `null`   dito — `null` heißt meist „gilt hier nicht" (`werWert`),
      //            und dann ist die Ablehnung genau richtig.
      //
      // ⚠️ Ein Kandidat aus einer PROJEKT-Quelle, der abgelehnt wird, ist in
      // jedem Fall ein Fund: dort hat jemand dieses Feld wirklich so gesetzt,
      // und die Bereinigung wirft es weg. Genau der Fall „EINSTELLUNG
      // VERWORFEN", vor dem `greift` warnt.
      const hart = typeof vorgabe === "boolean" || typeof vorgabe === "number";
      const ausProjektAbgelehnt = ausQuellen.length > 0;
      out.push({
        pfad, vorgabe, kandidat: null, teilbar: null, quelle: null,
        setzbar: (hart || ausProjektAbgelehnt) ? false : null,
        geprueft: kandidaten.length,
        grund: ausProjektAbgelehnt ? "im Projekt so gesetzt und trotzdem verworfen"
          : hart ? "nimmt keinen anderen Wert an"
          : "kein Wert aus dem Wortschatz passt — Katalog unbekannt",
      });
      continue;
    }

    // 🔴 Und überlebt der Wert das TEILEN? `encodePreset` speichert nur die
    // ABWEICHUNG von der Vorgabe — ein Feld, das die Delta-Bildung nicht
    // kennt, verschwindet hier und nirgends sonst.
    const zurueck = decodePreset(encodePreset(treffer.rules));
    const teilbar = zurueck != null
      && JSON.stringify(lies(sanitizeRules(zurueck), pfad)) === JSON.stringify(treffer.wert);

    out.push({ pfad, vorgabe, kandidat: treffer.wert, setzbar: true, teilbar, quelle: treffer.quelle });
  }
  return out;
}

// 🔴 Die FUNDE: ein Feld, für das ein Kandidat da war und das ihn trotzdem
// verwirft — oder das ihn nimmt und beim Teilen verliert. `setzbar: null`
// zählt NICHT dazu: dort war nur kein Kandidat bekannt.
export function funde() {
  return pruefeEinstellbarkeit()
    .filter((e) => e.setzbar === false || e.teilbar === false)
    .filter((e) => !GEKOPPELT[e.pfad]);
}

// Die Gegenprobe zur Ausnahmeliste, dasselbe Muster wie
// `ueberholteBegruendungen` in `stufenAbdeckung.js`: eine Begründung, die
// nicht mehr stimmt, ist schlimmer als keine — beim nächsten Durchgang glaubt
// ihr jemand.
export function ueberholteKopplungen() {
  const alle = pruefeEinstellbarkeit();
  return Object.keys(GEKOPPELT).filter((pfad) => {
    const e = alle.find((x) => x.pfad === pfad);
    return !e || e.setzbar === true;
  });
}

// Wie viele Blätter setzt das PROJEKT selbst irgendwo anders als die Vorgabe?
// Das ist die Abdeckungs-Zahl, nach der Andi gefragt hat: „deckt alle
// Einstellbarkeiten ab".
//
// ⚠️ Sie ist eine Aussage über die Presets, Charaktere, Regler-Stufen und das
// Schaufenster — NICHT über die Tests. Ein Feld, das nur ein Test anfasst,
// zählt hier nicht mit, und das ist richtig so: ein Test beweist, dass es
// rechnet, nicht dass es je jemand eingestellt hat.
export function abdeckung() {
  const alle = pruefeEinstellbarkeit();
  const belegt = alle.filter((e) => e.quelle === "projekt");
  return {
    blaetter: alle.length,
    ausProjekt: belegt.length,
    nurGenerisch: alle.filter((e) => e.quelle === "generisch").map((e) => e.pfad),
    ohneKandidat: alle.filter((e) => e.setzbar === null).map((e) => e.pfad),
    funde: alle.filter((e) => (e.setzbar === false || e.teilbar === false) && !GEKOPPELT[e.pfad]),
    gekoppelt: alle.filter((e) => GEKOPPELT[e.pfad]).map((e) => e.pfad),
  };
}
