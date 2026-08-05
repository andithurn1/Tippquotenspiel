// ── Drehrad-Punkte aufs Leaderboard ─────────────────────────
// EINE Quelle für beide Stores, Geschwister von `saisonBoard.js` — derselbe
// Zweck: statt die Ziehung zweimal (Mock/Supabase) leicht unterschiedlich zu
// verkabeln, gibt es genau eine Stelle, die beide Stores aufrufen.
//
// 🔴 Festlegung (1): Es wird NICHTS gespeichert — es wird gerechnet.
// `design/drehrad.md` Abschnitt 2.5 Punkt 1 verlangt: „beim Öffnen des
// Spieltags gezogen, nicht beim Klicken … deterministisch aus (rundenId,
// userId, spieltag) … ein Neuladen ändert nichts." Weil `ziehe` bereits rein
// deterministisch über genau diese drei Werte (plus die eigene Vorgeschichte)
// ist, erfüllt eine reine Berechnung diese Forderung vollständig: wer später
// nachschaut, bekommt dasselbe Ergebnis, ganz ohne Ablage. Eine Speicherung in
// `spieltagOeffnen`/`openMatchday` wäre hier sogar FALSCH — `matches` ist dort
// global über alle Runden (Big-Game-Begründung, siehe CLAUDE.md), eine
// Drehrad-Ziehung ist aber je RUNDE UND SPIELER. Dieses Modul rechnet die
// Ziehung deshalb bei jedem Aufruf neu, genau wie `withSaisonPunkte` die
// Saison-Punkte bei jedem Aufruf neu rechnet.
//
// 🔴 Festlegung (2): Dieser Schritt zahlt NUR `belohnung.typ === "punkte"`
// aus. Felder mit Joker-, Narren- oder Modifikator-Belohnung werden gezogen
// und tauchen in `auswerten()`s `gutschriften` auf, wirken sich hier aber
// NICHT aus — sie gehören in andere Töpfe (`jokerKontingent`, `jokerBudget`,
// `modCap`), die dieser Schritt nicht anfasst (design/kontaktstellen.md
// Abschnitt 5 Punkt 3). Das ist ausdrücklich Teil des Auftrags, nicht
// vergessen — siehe der datierte Absatz in kontaktstellen.md.
//
// ── Nachtrag (2026-08-04): `wer`/`werWert` entscheiden jetzt WIRKLICH, wer
// dreht ──
// `design/drehrad.md` Abschnitt 3b(a) legt fest: „Die Auswertung bleibt
// `jokerBasis.darfEinsetzen` — kein zweiter Mechanismus." Ohne `kontext`
// zog bisher jeder im Board, unabhängig von `wer`/`werWert` — eine tote
// Einstellung trotz Admin-Oberfläche in `Drehrad.jsx`. Jetzt gilt: OHNE
// `kontext` bleibt das Verhalten UNVERÄNDERT (kein stiller Regelwechsel für
// bestehende Aufrufer); WIRD `kontext` mitgegeben, prüft `drehradZiehungen`
// vor jeder Ziehung `darfEinsetzen` — inklusive der 5.0-Invariante „kein Rad
// ohne Tipp" (`ctx.hatGetippt`), die für JEDES `wer` gilt, nicht nur für
// `abPlatz`/`abRueckstand`.
import { drehradPlan, ziehe, auswerten, sanitizeDrehrad } from "./drehrad";
import { darfEinsetzen, basisFuer } from "./jokerBasis";

// „drehrad" ist KEINE Art aus `JOKER_ARTEN` (jokerBudget.js) — das Rad ist ein
// eigener Auslöser-Typ, keine Joker-Art (design/drehrad.md Abschnitt 1).
// `basisFuer("drehrad", rules)` findet deshalb in `rules.jokerBasis` keine
// Art-Abweichung und liefert den `standard`-Eintrag zurück — genau das ist
// gewollt (kein Art-Schlüssel für „drehrad" erfinden). Von dort kommen die
// Felder, die das Rad NICHT selbst führt (`sicht`, `verfall`, `bedingung`,
// `widerruf`, `stapeln`, `symmetrie`, `bestand`, `abklingzeit`, `umfang`,
// `spieleProEinsatz`).
//
// `wer`/`werWert` dagegen kommen NICHT von dort, sondern von `rules.drehrad`
// selbst: das Rad führt diese beiden Felder als EIGENE Einstellung (eigener
// Regler-Block in `Drehrad.jsx`, eigene Vorgabe in `DEFAULT_DREHRAD`) — genau
// wie es der Kopfkommentar von `drehrad.js` sagt: „Dieses Modul speichert
// `wer`/`werWert` NUR als Einstellung; das AUSWERTEN bleibt bei jokerBasis."
// Das heißt: die LOGIK (`pruefeWer` in jokerBasis.js) wird wiederverwendet
// („kein zweiter Mechanismus"), aber der WERT stammt von der Rad-eigenen
// Einstellung — nähme man stattdessen `rules.jokerBasis.standard.wer`, liefe
// der `wer`-Regler in `Drehrad.jsx` ins Leere, und genau DAS ist die
// Fehlerklasse, die dieser Nachtrag beheben soll, nicht neu einführen.
const DREHRAD_JOKER_ART = "drehrad";

function drehradBasis(rules) {
  const cfg = sanitizeDrehrad(rules?.drehrad);
  return { ...basisFuer(DREHRAD_JOKER_ART, rules), wer: cfg.wer, werWert: cfg.werWert };
}

// Wie viele (unterschiedliche) Spiele hatte ein Spieltag laut den Tipps ALLER
// Spieler? Dieselbe Idee wie `spieleJeSpieltag` in `ereignisse.js`, aber über
// die NACKTE `matchday`-Zahl gruppiert statt über `spieltagKey` — das Rad
// zieht selbst schon über eine nackte Spieltags-Zahl (`drehradPlan`/
// `jokerPlan` kennen keinen Wettbewerb, dieselbe Vereinfachung wie im
// Joker-Kontingent, das `t.matchday` ebenfalls direkt vergleicht statt über
// `spieltagKey`). Bei mehreren Wettbewerben mit kollidierenden
// Spieltags-Nummern kann das Spieltage vermischen — dieselbe, bereits
// dokumentierte Einschränkung wie bei `budgetVerlauf`s `stand`
// (design/kontaktstellen.md, Schritt 2).
function spieleJeMatchday(tipps) {
  const map = new Map();
  for (const t of tipps) {
    if (!t || !Number.isFinite(t.matchday)) continue;
    if (!map.has(t.matchday)) map.set(t.matchday, new Set());
    map.get(t.matchday).add(t.matchId ?? `${t.snapshot?.matchId ?? ""}`);
  }
  return map;
}

// Baut aus dem rohen, ALLE Spieler umfassenden `kontext` den PER-(Spieler,
// Spieltag)-Kontext, den `jokerBasis.darfEinsetzen` erwartet. `letzteEinsaetze`
// muss laut Kopfkommentar in `jokerBasis.js` bereits auf DIESEN Spieler
// eingegrenzt ankommen — das übernimmt diese Funktion; `board`/`adminFreigaben`
// bleiben roh, weil `darfEinsetzen` sie selbst nach `userId` filtert
// (dieselbe Aufgabenteilung wie dort dokumentiert).
function kontextFuer(kontext, userId, spieltag, proSpieltag) {
  const tipps = Array.isArray(kontext.tipps) ? kontext.tipps : [];
  const meine = tipps.filter((t) => t?.userId === userId);
  const hatGetippt = meine.some((t) => t.matchday === spieltag);

  const gesamt = proSpieltag.get(spieltag)?.size ?? 0;
  const meinsAmTag = new Set(
    meine.filter((t) => t.matchday === spieltag).map((t) => t.matchId ?? `${t.snapshot?.matchId ?? ""}`)
  );
  const alleGetippt = gesamt > 0 && meinsAmTag.size >= gesamt;

  return {
    board: kontext.board,
    aktuellerSpieltag: spieltag,
    adminFreigaben: kontext.adminFreigaben,
    hatGetippt,
    alleGetippt,
    letzteEinsaetze: (Array.isArray(kontext.letzteEinsaetze) ? kontext.letzteEinsaetze : [])
      .filter((e) => e?.userId === userId),
  };
}

// Wer an welchen Spieltagen dreht (`drehradPlan`) und was dabei herauskommt
// (`ziehe`, je Spieltag chronologisch, mit der eigenen Vorgeschichte). Ohne
// das Durchreichen von `bisherige` (neueste zuerst, wie im Kopfkommentar von
// `ziehe` verlangt) wirkt die Sperrfrist aus drehrad.md 2.2b nicht.
//
// `kontext` ist OPTIONAL. Fehlt er (Vorgabe `null`), zieht jeder übergebene
// `userId` unverändert wie bisher — reiner Regressionsschutz für bestehende
// Aufrufer. Wird er mitgegeben (`{ board, tipps, adminFreigaben,
// letzteEinsaetze }`, jeweils ALLE Spieler roh), prüft diese Funktion vor
// JEDER Ziehung `darfEinsetzen(drehradBasis(rules), userId, ctx, "drehrad")`
// — lehnt sie ab, wird an diesem Spieltag für diesen Spieler NICHT gezogen
// (kein Eintrag in `ziehungen`, `bisherige` bleibt unverändert, weil nichts
// gezogen wurde).
export function drehradZiehungen({ rules, rundenId, userIds = [], spieltage = 34, kontext = null } = {}) {
  if (!rules?.drehrad?.enabled || !userIds.length) return [];

  const plan = drehradPlan({ spieltage, drehrad: rules.drehrad, seed: rundenId, userIds });
  const basis = kontext ? drehradBasis(rules) : null;
  const proSpieltag = kontext ? spieleJeMatchday(kontext.tipps ?? []) : null;

  const ziehungen = [];
  for (const userId of userIds) {
    // Chronologisch durchgehen — die Sperrfrist zählt in Drehungen DIESES
    // Spielers, die Reihenfolge muss deshalb stimmen.
    const eigeneSpieltage = [...(plan.proSpieler?.[userId] ?? [])].sort((a, b) => a - b);
    const bisherige = []; // Feld-Ids dieses Spielers, neueste zuerst
    // 🔴 Die eigene Dreh-Historie IST die Abklingzeit-Historie des Rads
    // (design/kontaktstellen.md, vierte Teil-Wirkung). Sie wurde bisher von
    // außen erwartet und war überall leer — ein am `jokerBasis.standard`
    // gesetzter `abklingzeit`-Wert blieb fürs Rad damit wirkungslos, obwohl er
    // für echte Joker längst greift.
    //
    // Bauen muss man sie nicht: dieser Loop erzeugt sie gerade. Die Drehungen
    // laufen chronologisch (`sort` oben), also steht beim Prüfen von Spieltag N
    // genau das drin, was davor gefallen ist — und nichts aus der Zukunft.
    //
    // ⚠️ Ein von außen mitgegebener `letzteEinsaetze`-Eintrag wird NICHT
    // verworfen, sondern ergänzt: der Aufrufer kann eine Historie aus einer
    // anderen Quelle beisteuern (etwa aus einer echten Ablage), und beide
    // zusammen sind die Wahrheit.
    const eigeneDrehungen = []; // [{ jokerArt, spieltag }], für die Abklingzeit
    for (const spieltag of eigeneSpieltage) {
      if (kontext) {
        const ctx = kontextFuer(
          { ...kontext, letzteEinsaetze: [...(kontext.letzteEinsaetze ?? []), ...eigeneDrehungen] },
          userId, spieltag, proSpieltag,
        );
        const erlaubnis = darfEinsetzen(basis, userId, ctx, DREHRAD_JOKER_ART);
        if (!erlaubnis.erlaubt) continue; // wer/hatGetippt/Abklingzeit lehnt ab
      }
      const feld = ziehe(rules.drehrad, { rundenId, userId, spieltag, bisherige });
      if (!feld) continue; // kein gültiges Rad — nichts zu ziehen
      ziehungen.push({ userId, spieltag, feldId: feld.id });
      bisherige.unshift(feld.id);
      // Diese Drehung zählt ab jetzt für die Abklingzeit der nächsten.
      eigeneDrehungen.push({ userId, jokerArt: DREHRAD_JOKER_ART, spieltag });
    }
  }
  return ziehungen;
}


// ── Was das Rad AUSSER Punkten auszahlt ─────────────────────
// 🔴 `withDrehradPunkte` zahlt nur `belohnung.typ === "punkte"` aus — das war
// als Einschränkung in `design/kontaktstellen.md` benannt: ein Rad-Feld mit
// Joker-, Narren- oder Modifikator-Belohnung wurde gezogen, tauchte in
// `auswerten()`s `gutschriften` auf und wirkte sich im Spiel nicht aus.
//
// Nach dem Baukasten-Grundsatz ist genau das nicht erlaubt: „eine Einstellung,
// die ins Leere läuft, ist kein Baukastenteil." Diese Funktion übersetzt die
// Ziehungen deshalb in die Formen, die die BESTEHENDEN Töpfe erwarten — kein
// neuer Kanal, keine zweite Buchführung:
//
//   `joker`        → dieselbe Gutschrift-Form wie `ereignisse.auswerten()`,
//                    also `{ userId, matchday, belohnung: <anzahl> }`. Damit
//                    landet ein erspielter Rad-Joker im selben Vorrat wie ein
//                    erspieltes Ereignis (`kontingent` in jokerKontingent.js)
//                    und unterliegt denselben Regeln — insbesondere „wirkt ab
//                    dem Spieltag, an dem er verdient wurde, nie rückwirkend".
//   `budget`       → `{ userId, spieltag, betrag }` für `kontoVerlauf`.
//                    ⚠️ NICHT als `leistung`-Quelle: die multipliziert eine
//                    ANZAHL mit `proEreignis`. Ein Rad-Feld nennt aber einen
//                    festen Betrag — durch `proEreignis` geschickt käme eine
//                    andere Zahl heraus, als auf dem Feld steht.
//   `modifikator`  → wird hier nur GEMELDET, nicht verrechnet. Er müsste in
//                    `totalModifier` je Spieltag einfließen, und das ist der
//                    Wertungs-Pfad; das gehört einzeln gebaut und geprüft.
//                    Bis dahin ist er ausgewiesen statt still verschluckt.
//
// ⚠️ Gerechnet wird auf `auswerten()`s `gutschriften`, nicht auf den rohen
// Ziehungen: nur die tragen den bereits gedeckelten Betrag.
export function drehradBelohnungen({ rules, rundenId, userIds = [], spieltage = 34, kontext = null } = {}) {
  const leer = { joker: [], narren: [], modifikatoren: [] };
  if (!rules?.drehrad?.enabled || !userIds.length) return leer;

  const ziehungen = drehradZiehungen({ rules, rundenId, userIds, spieltage, kontext });
  const { gutschriften } = auswerten(rules.drehrad, ziehungen);

  const out = { joker: [], narren: [], modifikatoren: [] };
  for (const g of gutschriften) {
    const b = g.belohnung;
    if (!b) continue;
    if (b.typ === "joker") {
      out.joker.push({ userId: g.userId, matchday: g.spieltag, belohnung: b.anzahl, art: b.art });
    } else if (b.typ === "budget") {
      out.narren.push({ userId: g.userId, spieltag: g.spieltag, betrag: b.betrag });
    } else if (b.typ === "modifikator") {
      out.modifikatoren.push({
        userId: g.userId, spieltag: g.spieltag, faktor: b.faktor, spieltage: b.spieltage,
      });
    }
  }
  return out;
}

export function withDrehradPunkte({ board = [], rules, rundenId, spieltage = 34, nameOf, kontext = null } = {}) {
  if (!rules?.drehrad?.enabled) return board;

  // Anders als bei den Saison-Wetten (`withSaisonPunkte`) werden hier KEINE
  // zusätzlichen Spieler ins Board ergänzt: wer nicht im Board steht, hat
  // nicht mitgespielt (kein Match-Tipp, keine Saison-Wette) und dreht folglich
  // auch nicht am Rad. `nameOf` wird deshalb — anders als bei
  // `withSaisonPunkte` — hier nicht gebraucht: es entstehen keine neuen
  // Einträge, für die ein Name aufgelöst werden müsste. Es steht trotzdem in
  // der Signatur, damit beide Stores diese Funktion genauso aufrufen wie
  // `withSaisonPunkte` (dieselben bereits vorliegenden Werte, an derselben
  // Stelle).
  const userIds = board.map((e) => e.userId);
  const ziehungen = drehradZiehungen({ rules, rundenId, userIds, spieltage, kontext });
  const { gutschriften } = auswerten(rules.drehrad, ziehungen);

  // Nur Punkte-Belohnungen zählen hier (Festlegung 2 oben) — je Spieler
  // aufsummiert, `auswerten` hat den Saison-Deckel schon durchgesetzt.
  const punkteVon = new Map();
  for (const g of gutschriften) {
    if (g.belohnung?.typ !== "punkte") continue;
    punkteVon.set(g.userId, (punkteVon.get(g.userId) ?? 0) + g.belohnung.betrag);
  }

  return board
    .map((e) => {
      const punkte = punkteVon.get(e.userId) ?? 0;
      return { ...e, drehrad: punkte, total: e.total + punkte };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .map((e, i) => ({ ...e, rank: i + 1 }));
}
