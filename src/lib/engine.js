// ============================================================
//  TIPPSPIEL – ENGINE ("das Gehirn")  ·  v2
//  Reine Logik, kein UI. Eine Quelle für Tippabgabe,
//  Abrechnung und Auszahlungs-Explorer.
// ============================================================

import { applyCatchup, BETRIFFT, betrifftWert } from "./catchup";
import { applySaisonform, sanitizeSaisonform, DEFAULT_SAISONFORM } from "./saisonform";
import { mitTippEinfluss, sanitizeTippEinfluss, DEFAULT_TIPPEINFLUSS } from "./tippEinfluss";
import { applyDuellJoker, sanitizeDuellJoker, DEFAULT_DUELL } from "./duellJoker";
import { sanitizeBudget, DEFAULT_BUDGET } from "./jokerBudget";
import { sanitizeLimitKlassen, DEFAULT_LIMIT_KLASSEN } from "./limitKlassen";
import { sanitizeJokerBasisKarte, DEFAULT_BASIS } from "./jokerBasis";
import { sanitizeDrehrad, DEFAULT_DREHRAD } from "./drehrad";


// ── 1) QUOTEN-QUELLE (austauschbar: Mock → später echte API) ─
import { sanitizeSaison } from "./saisonwetten";
import { sanitizeVerteilung, DEFAULT_VERTEILUNG } from "./jokerPlan";
import { sanitizeBigGame, DEFAULT_BIGGAME, bigGameAufschlag } from "./bigGame";
import { sanitizeSpiele, DEFAULT_SPIELE } from "./spielauswahl";
import { sanitizeEreignisse, DEFAULT_EREIGNISSE } from "./ereignisse";
import { sanitizeWettbewerbe, DEFAULT_WETTBEWERBE, wettbewerbAufschlag, maxWettbewerbAufschlag } from "./wettbewerbGewicht";
import { sanitizeTippfenster, DEFAULT_TIPPFENSTER } from "./tippfenster";
import { sanitizeZeitachse, DEFAULT_ZEITACHSE } from "./zeitachse";
// Spieltags-Identität liegt in einem eigenen, importfreien Modul — sonst gäbe
// es einen Kreis über `ereignisse.js`, das dieselben Helfer braucht. Die Engine
// reicht sie weiter, damit bestehende Importe aus "./engine" gültig bleiben.
import { spieltagKey, spieltageChronologisch } from "./spieltag";
export { spieltagKey, gleicherSpieltag, spieltageChronologisch } from "./spieltag";

export function createMockOddsSource() {
  const snap = {
    matchId: "JOR-ESP", home: "Jordanien", away: "Spanien",
    kickoff: "2026-06-20T18:45:00Z",             // Anpfiff (UTC)
    frozenAt: "2026-06-20T18:00:00Z",            // Snapshot: gilt bis Anpfiff
    winner: { home: 9.0, draw: 6.5, away: 1.28 },
    margin: { home: [0, 7, 14, 28, 70, 180], away: [0, 2.6, 4.0, 7, 15, 38] },
    correctScore: [
      [ 11,  6.5,  6.0,  8.0,  15,  34],
      [  9,  7.5,  8.5,   13,  26,  60],
      [ 15,   12,   16,   26,  55, 130],
      [ 30,   21,   34,   60, 140, 320],
      [ 70,   41,   80,  150, 340, 700],
      [160,   96,  180,  340, 750,1500],
    ],
    teamGoals: { home: [2.1, 3.0, 6.0, 11, 24, 55], away: [4.5, 3.0, 3.4, 5.5, 10, 22] },
    players: {
      home: { "Al-Naimat": { anytime: 3.2, double: 11 }, "Olwan": { anytime: 4.1, double: 15 },
        "Al-Tamari": { anytime: 3.6, double: 13 }, "Al-Rashdan": { anytime: 5.5, double: 21 }, "Haddad": { anytime: 7.0, double: 30 } },
      away: { "Yamal": { anytime: 1.9, double: 5.5 }, "Oyarzabal": { anytime: 2.6, double: 8.0 },
        "Merino": { anytime: 3.4, double: 12 }, "Williams": { anytime: 3.0, double: 10 }, "Olmo": { anytime: 3.8, double: 14 } },
    },
    startingXI: ["Al-Naimat", "Olwan", "Yamal", "Oyarzabal", "Merino", "Williams"],
  };
  return {
    getSnapshot: (id) => (id === "JOR-ESP" ? snap : null),
    getResult: (id) => (id === "JOR-ESP"
      ? { home: 5, away: 1, playerGoals: { "Al-Naimat": 2, "Yamal": 1 } } : null),
  };
}


// ── 2) REGELWERK (Admin bei Spielerstellung · per Code teilbar) ─
export const DEFAULT_RULES = {
  name: "Standard",
  k: 0.7,              // Steilheit Ergebnis-Nähe (Underdog-Regler)
  m: 0.5,              // Steilheit Team-Tore-Nähe
  minPayout: 1.0,      // Cutoff: Nähe-Boni darunter zählen nicht
  winnerFloor: true,
  wrongPenalty: 0,     // Minus bei komplett falsch (opt-in, z.B. -1)
  combo: { tendenz: 1.15, abstand: 1.5, exakt: 2.3 },
  displayScale: 15,    // roh × 15 → schöne hohe Zahlen (Fairness/Rang unberührt)
  perGameCap: null,    // optionaler harter Deckel pro Spiel (z.B. 1000), null = offen
  // `goals.modus` entscheidet, WIE Torschützen getippt werden:
  //   proTeam  — je Mannschaft `picksPerTeam` Namen (bisheriges Verhalten)
  //   proSpiel — `picksProSpiel` Namen aus dem ganzen Spiel, ohne Trennung
  // Der zweite Modus ist nicht nur Geschmack: die echten Torschützen-Quoten
  // kommen OHNE Vereinszuordnung herein (`kader.js` leitet sie ab, braucht dafür
  // aber zwei Spiele je Verein). Solange ein Spieler noch offen ist, lässt er
  // sich in `proSpiel` trotzdem anbieten — in `proTeam` nicht.
  markets: {
    result: true,
    goals: {
      enabled: true, modus: "proTeam",
      picksPerTeam: 2, picksProSpiel: 3,
      allowDouble: true, allowBackups: true,
    },
  },
  oddsMode: "snapshot",
  // Underdog-Boost: zusätzlicher Multiplikator auf den Ergebnis-Teil, wenn das
  // REALE Ergebnis ein Außenseiter-Sieg war (Sieger-Quote als Maßstab). Boost=1
  // ist ein neutrales No-op (Standard) — die Quote selbst belohnt Außenseiter
  // schon von sich aus, das hier ist ein zusätzlicher, expliziter Admin-Regler.
  // Fließender Übergang zwischen Ramp-Start/-Ende statt hartem Cutoff.
  underdogBoost: 1,
  underdogRampStart: 3,
  underdogRampEnd: 8,
  // Favoriten-Reinfall-Malus (Zwilling zum Underdog-Boost): Abzug, wenn du den
  // FAVORITEN als Sieger getippt hast und der REAL verloren hat. Skaliert über
  // dieselbe Underdog-Ramp (je krasser der Sieger ein Außenseiter war, desto
  // härter). 0 = aus. Wird vom Gesamt-Ergebnis abgezogen, aber bei 0 gedeckelt
  // (kein tiefes Minus) — richtig getippte Underdog-Tore federn also ab.
  favFlopPenalty: 0,
  // Joker: der Tipper markiert EIN Spiel pro Spieltag (`tip.joker === true`),
  // dessen Gesamtwertung mit `faktor` multipliziert wird — Ergebnis UND Tore,
  // weil der Faktor erst nach der Kombi auf die Endsumme wirkt (sonst würde er
  // sich mit Kombi/Underdog multiplikativ aufschaukeln). enabled=false ist ein
  // neutrales No-op. Der Faktor wirkt SYMMETRISCH, also auch auf ein Minus aus
  // wrongPenalty/favFlopPenalty — der Joker bleibt damit eine echte Wette statt
  // eines Gratis-Aufschlags. Wer ihn einschalten DARF (Premium-Admin), ist keine
  // Engine-Frage, sondern eine Berechtigung in Store/UI.
  // Zwei Modi:
  //  "einzel"  — der Tipper markiert EIN Spiel (`tip.joker === true`) → `faktor`.
  //  "ranking" — jedes Spiel bekommt ein Gewicht (`tip.gewicht`) aus `faktoren`.
  //              Jeder Pool-Wert darf pro Spieltag nur EINMAL vergeben werden,
  //              dadurch ist die Gewichtung ein echtes Ranking: alle haben
  //              denselben Pool, die Kunst ist die Verteilung. Ohne diese Regel
  //              würde jeder überall das Maximum setzen und der Modus wäre wertlos.
  // abstimmung: die Runde stimmt gemeinsam ab, an WELCHEN Spieltagen es einen
  // Joker gibt (statt an jedem). Premium-Funktion; die Auszählung liegt in
  // voting.js, die Durchsetzung greift in Tippabgabe/Spielwahl.
  // Der AKTIVE Joker (modus/faktor/faktoren) verlangt eine Entscheidung des
  // Tippers. Daneben gibt es PASSIVE Joker-TYPEN, die von allein greifen:
  //  heimat — die Spiele des eigenen Vereins (`tip.verein`) zaehlen mehr
  //  mut    — greift NUR, wenn gegen den Favoriten getippt wurde
  // Alle Typen liefern einen AUFSCHLAG; die Aufschlaege werden addiert und
  // von `modCap` gedeckelt (siehe totalModifier) — nie multipliziert.
  joker: {
    enabled: false, modus: "einzel", faktor: 1.5, faktoren: [2, 1.5, 1.2, 1], abstimmung: false,
    heimat: { enabled: false, faktor: 1.2 },
    mut: { enabled: false, faktor: 1.1 },
    // verteilung — an welchen Spieltagen es einen Joker gibt (jokerPlan.js).
    // Standard "frei": jeder setzt an jedem Spieltag selbst.
    verteilung: { ...DEFAULT_VERTEILUNG },
  },

  // Team-/Derby-Modifikatoren: gelten für ALLE in der Runde (anders als der
  // Joker, den jeder Tipper selbst setzt). Der Admin vereinbart sie einmal.
  //  derbyFaktor — Traditionsduelle zählen mehr. Braucht `snap.derby` (setzt
  //                die Daten-Schicht, siehe bundesligaData.js) — die Engine
  //                kennt selbst keine Vereinsnamen-Paarungen.
  //  teams       — { Vereinsname → Faktor } für einzelne Klubs.
  // Beide 1 bzw. leer = neutrales No-op.
  teamMods: { derbyFaktor: 1, teams: {} },

  // Big Game: das je Spieltag DYNAMISCH bestimmte Topspiel zählt mehr — für
  // alle gleich, also derselbe additive Topf wie Derby und Team-Faktoren, kein
  // eigener Multiplikator. Die Auswahl steckt in bigGame.js; die Engine liest
  // nur `snap.bigGame`, das die Daten-Schicht beim Öffnen des Spieltags setzt
  // (eingefroren, wie der Quoten-Snapshot). Standard aus.
  bigGame: { ...DEFAULT_BIGGAME },

  // Deckel für ALLE Modifikatoren zusammen. Wichtig, weil es drei Ebenen gibt
  // (Joker pro Nutzer · Abstimmung pro Spieltag · Team-Mods pro Begegnung).
  // Sie werden ADDITIV zusammengefasst statt multipliziert — 2× und 1,5×
  // ergeben 1 + 1,0 + 0,5 = 2,5× statt 3,0×. Multiplikativ würde sich das
  // aufschaukeln und die Balance sprengen; additiv bleibt es vorhersagbar.
  modCap: 2.5,

  // Das Gegenstück: der Boden, unter den gestapelte DÄMPFER (Team-/Wettbewerbs-
  // Faktoren unter 1) ein Spiel nicht drücken können. Vorgabe 0,25 — sie
  // bindet heute nie, weil ohne Dämpfer jeder Faktor bei mindestens 1 liegt.
  // 0 wäre erlaubt und hieße „dieses Spiel kann komplett wertlos werden";
  // negativ ist ausgeschlossen, sonst drehte sich das Vorzeichen einer
  // richtigen Wertung um.
  modFloor: 0.25,

  // Regler-Feinheit: rundenweite Übersteuerung der Schrittweite für ALLE
  // Regler der Multiplikator-Familie (Standardraster 0,05, siehe RULE_LIMITS).
  // Erlaubt: 0.05 (Vorgabe) · 0.025 · 0.01 — Katalog samt Begründung bei
  // `REGLER_FEINHEITEN`. Ganzzahlige Regler bleiben davon unberührt, siehe
  // `reglerSchritt`.
  reglerFeinheit: 0.05,

  // Aufhol-Mechanismus („Anschluss halten"): Zurückliegende bekommen je
  // Spieltag einen Teil ihres Rückstands gutgeschrieben, damit Mitspielen
  // lohnt. Greift NICHT in scoreTip (das kennt nur ein Spiel), sondern im
  // Spieltag-Verlauf — Berechnung in catchup.js.
  //  staerke  — welcher ANTEIL des Rückstands je Spieltag aufgeholt wird
  //  schwelle — ab welchem Rückstand (Anteil an der Spitze) es überhaupt greift
  //  betrifft — "letzter" | "unteres-drittel" | "unter-schnitt"
  aufholen: { enabled: false, staerke: 0.2, schwelle: 0.2, betrifft: "unteres-drittel" },

  // ── Saisonform: Gewichtung der Spieltage + Streichresultate ──
  // Greift NICHT in scoreTip, sondern auf die fertigen Spieltagspunkte im
  // Verlauf — wie der Aufhol-Bonus, und aus demselben Grund. Standard ist ein
  // No-op (flache Kurve, keine Streicher).
  // ⚠️ Die GEWICHTUNG ist gemessen KEIN Ausgleichsregler, sondern ein
  // Dramaturgie-Regler — sie vergrößert den Vorsprung des Ersten. Details im
  // Kopf von `saisonform.js`.
  saisonform: { ...DEFAULT_SAISONFORM },

  // ── Tipp-Einfluss: die Runde bewegt die Quote mit (Totalisator) ──
  // Standard AUS. Verschiebt nur das ERGEBNIS-Raster, nie die 1X2 — die
  // bleiben der äußere Marktanker. `marktTiefe` ist der eigentliche Regler:
  // gegen wie viele „virtuelle Mitspieler" die Runde antritt. Details und die
  // drei Fairness-Regeln im Kopf von `tippEinfluss.js`.
  tippEinfluss: { ...DEFAULT_TIPPEINFLUSS },

  // ── Versäumnis: was passiert, wenn jemand einen Spieltag vergisst ──
  //  strategie    — "wahrscheinlich" | "schnitt" | "zufall" (siehe autoTip.js)
  //  malusProzent — Abzug auf die Wertung des Auto-Tipps (100 = wertlos)
  //  maxProSaison — wie oft die Kulanz je Spieler greift (0 = unbegrenzt)
  // Standard aus: ohne Zutun des Admins gibt es für Nichtstun nichts.
  versaeumnis: { enabled: false, strategie: "wahrscheinlich", malusProzent: 30, maxProSaison: 3 },

  // ── Saison-Wetten: die nebenbei laufende Langzeit-Ebene ──
  //  gewicht — wie stark die Saison-Ebene gegenueber den Spieltagen zaehlt
  //  wetten  — [{ key, punkte, ausser? }]; Katalog + Auswertung in saisonwetten.js
  // Standard aus. Wird beim Bereinigen an sanitizeSaison delegiert, damit
  // Katalog und Regelwerk nicht auseinanderlaufen.
  saison: { enabled: false, gewicht: 1, wetten: [] },

  // ── Spielauswahl: welche Spiele gehören zur Runde ──
  // Reist mit dem Creator-Code mit, damit ein Creator nicht nur seine Wertung
  // teilt, sondern seine ganze Runden-Idee. Katalog + Filter in
  // spielauswahl.js. Standard „alle" = neutrales No-op.
  spiele: { ...DEFAULT_SPIELE },

  // ── Ereignisse: Joker ERSPIELEN statt nur zugeteilt bekommen ──
  // Zweiter Joker-Topf neben `joker.verteilung`, mit eigener Obergrenze.
  // Katalog + Auswertung in ereignisse.js. Standard aus.
  ereignisse: { ...DEFAULT_EREIGNISSE },

  // ── Wettbewerbs-Gewichte: ein CL-Halbfinale zählt mehr als ein Ligaspiel ──
  // Fällt in DENSELBEN additiven Topf wie Derby und Big Game — „dieses Spiel
  // ist wichtiger, für alle gleich". Katalog + Anteils-Rechnung in
  // wettbewerbGewicht.js. Standard aus.
  wettbewerbe: { ...DEFAULT_WETTBEWERBE },

  // ── Tipp-Fenster: wie lange vor Anpfiff ein Spiel tippbar wird ──
  // Quoten erscheinen erst einige Tage vorher; wie früh eine Runde tippt, ist
  // eine Admin-Entscheidung. Das Fenster schliesst beim Anpfiff (dieselbe
  // Kante wie der eingefrorene Quoten-Snapshot). Details in tippfenster.js.
  tippfenster: { ...DEFAULT_TIPPFENSTER },

  // ── Zeitachse: was „Spieltag 5" in einer Runde über MEHRERE Ligen heißt ──
  // Die Ligen starten versetzt und haben eigene Zählungen. Ein Taktgeber gibt
  // den Rhythmus vor, alles andere ordnet sich ein. Reine Struktur- und
  // Anzeige-Frage, keine Wertung — Details in zeitachse.js.
  zeitachse: { ...DEFAULT_ZEITACHSE },

  // ── Duell-Joker: Klau- & Block-Joker, der dritte Joker-Topf ──
  // Zielt auf eine PERSON statt auf ein Spiel oder eine Aufgabe — Überweisung
  // zwischen Mitspielern auf den fertigen Spieltagspunkten, nicht in scoreTip.
  // Katalog + Auswertung in duellJoker.js. Standard aus.
  duell: { ...DEFAULT_DUELL },

  // ── Budget: die gemeinsame Währung über alle Joker-Arten ──
  // Ersetzt viele eigene Kontingente durch EINEN Kontostand, aus dem jede
  // Joker-Art bezahlt wird. Katalog + Verlaufsrechnung in jokerBudget.js.
  // Standard aus.
  budget: { ...DEFAULT_BUDGET },

  // ── Drehrad: der dritte Auslöser, reiner Zufall aus einer Admin-Tabelle ──
  // `jokerPlan` liefert einen ZEITPUNKT, `ereignisse` eine LEISTUNG — das
  // Drehrad zieht aus einer Tabelle, die der Admin selbst schreibt. Katalog +
  // Ziehung in drehrad.js. Standard aus.
  drehrad: { ...DEFAULT_DREHRAD },

  // ── Limitierungsklassen: benannte Kontingente über mehrere Joker-Arten ──
  // Eine Klasse fasst Joker-Arten zu einem gemeinsamen Deckel zusammen, mit
  // eigenem Zeitfenster und eigener Aktivierungs-Bedingung. Katalog + Prüfung
  // in limitKlassen.js. Standard leer (keine Klassen).
  limitKlassen: [...DEFAULT_LIMIT_KLASSEN],

  // ── Joker-Grundform: die sechs Dimensionen, die jeder Joker teilt ──
  // Wer darf, wer sieht es, wann verfällt er, worauf gilt er, bis wann
  // änderbar, wie viele auf ein Spiel — EINE Karte, geschlüsselt nach
  // Joker-Art, mit einem `standard`-Eintrag als Vorgabe für alle Arten ohne
  // eigene Abweichung. Details in jokerBasis.js. Standard = DEFAULT_BASIS
  // für alle Arten.
  jokerBasis: { standard: { ...DEFAULT_BASIS } },
};

// Domain-Grenzen der Regler — EINE Quelle für die UI-Slider (Spielerstellung)
// und die Import-Sanitisierung. UI liest min/max/step hieraus, statt sie zu duplizieren.
export const RULE_LIMITS = {
  k:            { min: 0.2, max: 1.6,  step: 0.05 },
  m:            { min: 0.2, max: 1.6,  step: 0.05 },
  minPayout:    { min: 0,   max: 5,    step: 0.5  },
  wrongPenalty: { min: -5,  max: 0,    step: 0.5  },
  displayScale: { min: 1,   max: 50,   step: 1    },
  perGameCap:   { min: 50,  max: 5000, step: 50   },
  combo: {
    tendenz: { min: 1, max: 2, step: 0.05 },
    abstand: { min: 1, max: 3, step: 0.05 },
    exakt:   { min: 1, max: 4, step: 0.05 },
  },
  picksPerTeam: { min: 1, max: 3, step: 1 },
  // Mehr Spielraum als je Mannschaft: hier verteilen sich die Namen auf beide
  // Seiten, drei je Team entsprechen also sechs im Spiel.
  picksProSpiel: { min: 1, max: 6, step: 1 },
  // Gehört zur Multiplikator-Familie (Raster 0,05, siehe reglerRaster.test.js):
  // der Boost multipliziert den Ergebnis-Teil und läuft damit in dieselbe
  // Endauszahlung wie Joker, Derby und Big Game. Ihn als einzigen auf 0,1 zu
  // lassen, wäre eine willkürliche Ausnahme.
  underdogBoost:     { min: 1,   max: 3,  step: 0.05 },
  underdogRampStart: { min: 1.2, max: 15, step: 0.1 },
  underdogRampEnd:   { min: 2,   max: 30, step: 0.5 },
  favFlopPenalty:    { min: 0,   max: 20, step: 1   },
  // ⚠️ Was hier steht, ist die Grenze des ERLAUBTEN — nicht die des Erprobten.
  // Wo es unrund wird, sagt das Empfehlungsband in reglerWarnung.js, samt
  // Messwerten und Beispielrechnung. Ein Admin darf darueber hinaus, er soll
  // es nur nie VERSEHENTLICH tun. Deshalb wird hier nicht nachgezogen, wenn
  // eine Messung eine Unwucht zeigt — sonst waere jede Messung ein Verbot.
  //
  // Genau das war beim `mutFaktor` passiert: die Messung („ab ×1,15 schmilzt
  // der Vorsprung des Koenners") war als engere Grenze 1.2 hier gelandet und
  // stehen geblieben, obwohl das Band in reglerWarnung.js laengst existiert.
  // Der Regler endete damit kurz hinter der Empfehlung — man konnte gar nicht
  // ausprobieren, wie sich ein wilder Wert anfuehlt. Jetzt dieselbe Spanne wie
  // der gesetzte Joker; die feinere Schrittweite bleibt, weil der Mut-Bonus
  // genau die hoechsten Auszahlungen verstaerkt und deshalb sensibler reagiert.
  joker: {
    faktor: { min: 1, max: 2, step: 0.05 },
    mutFaktor: { min: 1, max: 2, step: 0.05 },
    anzahlFaktoren: { min: 2, max: 6, step: 1 },
  },
  // ⚠️ `min: 0.25`, nicht 1 — Werte UNTER 1 sind Dämpfer („dieses Spiel zählt
  // weniger"). Vorher ging es nur nach oben, wodurch der Admin Wichtiges
  // hervorheben, aber Unwichtiges nicht zurücknehmen konnte. Nach unten fängt
  // `modFloor` ab.
  teamMods: { derbyFaktor: { min: 0.25, max: 2, step: 0.05 }, teamFaktor: { min: 0.25, max: 2, step: 0.05 } },
  modCap: { min: 1, max: 4, step: 0.05 },
  modFloor: { min: 0, max: 1, step: 0.05 },
  aufholen: { staerke: { min: 0.05, max: 0.5, step: 0.05 }, schwelle: { min: 0, max: 0.5, step: 0.05 } },
  versaeumnis: { malusProzent: { min: 0, max: 100, step: 5 }, maxProSaison: { min: 0, max: 10, step: 1 } },
};

// ── Regler-Feinheit: wie fein der Admin die Multiplikator-Regler stellen darf ──
// Das Standardraster der Multiplikator-Familie ist 0,05 (siehe RULE_LIMITS und
// die Erklärung dort). Diese drei Werte sind NICHT beliebig gewählt:
//  - 0,025 und 0,01 teilen 0,05 glatt — jeder Wert des Standardrasters bleibt
//    damit erreichbar. Ein Raster von 0,02 täte das NICHT (es trifft 1,02 /
//    1,04 / 1,06, aber nicht 1,05 oder 1,15) und machte die gemessene
//    Mut-Bonus-Grenze bei 1,15 unerreichbar (siehe reglerRaster.test.js).
//  - 0,01 ist die Untergrenze, weil `sanitizeRules` Multiplikatoren mit
//    `.toFixed(2)` ablegt. Alles Feinere würde beim Speichern still
//    weggerundet — der Admin bekäme einen Wert zurück, den er nicht
//    eingestellt hat.
export const REGLER_FEINHEITEN = [
  { key: "normal", wert: 0.05, label: "Normal", desc: "Das übliche Raster: Schritte von 0,05." },
  { key: "fein", wert: 0.025, label: "Fein", desc: "Halb so grob wie das übliche Raster: Schritte von 0,025." },
  { key: "sehrFein", wert: 0.01, label: "Sehr fein", desc: "Das feinste erlaubte Raster: Schritte von 0,01." },
];

// Effektive Schrittweite eines einzelnen Reglers. Gehört `limits` zur
// Multiplikator-Familie (erkennbar an `step === 0.05` — siehe reglerRaster.test.js
// für die vollständige Familie), gilt die vom Admin gewählte Feinheit. Sonst
// bleibt `limits.step` unverändert.
// ⚠️ Ganzzahlige Regler (Spieltags-Anzahl, Kontingente, …) dürfen NIE feiner
// werden — eine „Feinheit" von 0,01 auf so einem Feld wäre Unsinn. Deshalb die
// Bindung an `step === 0.05` und nicht an „ist eine Kommazahl".
export function reglerSchritt(rules, limits) {
  if (limits?.step === 0.05) {
    return rules?.reglerFeinheit ?? DEFAULT_RULES.reglerFeinheit;
  }
  return limits?.step;
}

// Joker-Block eigenständig säubern: Modus, Einzelfaktor und Ranking-Pool.
// Der Pool wird entdoppelt, auf die Faktor-Grenzen beschnitten und absteigend
// sortiert; bleibt zu wenig übrig, gilt der Default-Pool.
function sanitizeJoker(jk, num, clamp) {
  const D = DEFAULT_RULES.joker, L = RULE_LIMITS.joker;
  const roh = Array.isArray(jk.faktoren) ? jk.faktoren : D.faktoren;
  const faktoren = [...new Set(roh
    .map((v) => num(v, NaN))
    .filter((v) => Number.isFinite(v))
    .map((v) => +clamp(v, L.faktor.min, L.faktor.max).toFixed(2)))]
    .sort((a, b) => b - a)
    .slice(0, L.anzahlFaktoren.max);
  return {
    enabled: jk.enabled === true,
    modus: jk.modus === "ranking" ? "ranking" : "einzel",
    faktor: clamp(num(jk.faktor, D.faktor), L.faktor.min, L.faktor.max),
    faktoren: faktoren.length >= L.anzahlFaktoren.min ? faktoren : [...D.faktoren],
    abstimmung: jk.abstimmung === true,
    // Passive Typen — gleiche Grenzen wie der aktive Joker, damit kein Typ
    // heimlich staerker sein kann als der, den man bewusst setzt.
    heimat: {
      enabled: jk.heimat?.enabled === true,
      faktor: clamp(num(jk.heimat?.faktor, D.heimat.faktor), L.faktor.min, L.faktor.max),
    },
    mut: {
      enabled: jk.mut?.enabled === true,
      faktor: clamp(num(jk.mut?.faktor, D.mut.faktor), L.mutFaktor.min, L.mutFaktor.max),
    },
    // WANN es überhaupt einen Joker gibt — delegiert an jokerPlan.js, damit
    // der Katalog der Modi dort die eine Quelle bleibt (wie sanitizeSaison).
    verteilung: sanitizeVerteilung(jk.verteilung),
  };
}

// Team-/Derby-Modifikatoren säubern: Faktoren auf die Grenzen beschneiden,
// Vereinsnamen nur als Zeichenketten übernehmen, neutrale Einträge (Faktor 1)
// verwerfen — so bleibt ein importiertes Regelwerk klein und harmlos.
function sanitizeTeamMods(tm, num, clamp) {
  const D = DEFAULT_RULES.teamMods, L = RULE_LIMITS.teamMods;
  const teams = {};
  const roh = tm.teams && typeof tm.teams === "object" ? tm.teams : {};
  for (const [name, wert] of Object.entries(roh)) {
    if (typeof name !== "string" || !name.trim()) continue;
    const f = +clamp(num(wert, 1), L.teamFaktor.min, L.teamFaktor.max).toFixed(2);
    // ⚠️ `!== 1` statt `> 1`: seit es DÄMPFER gibt (Faktor unter 1) muss auch
    // ein Wert darunter erhalten bleiben. Genau 1 fliegt weiter raus — das ist
    // „kein Modifikator" und hält das Regelwerk klein.
    if (f !== 1) teams[name.trim().slice(0, 60)] = f;
  }
  return {
    derbyFaktor: clamp(num(tm.derbyFaktor, D.derbyFaktor), L.derbyFaktor.min, L.derbyFaktor.max),
    teams,
  };
}

// Nimmt ein (evtl. aus einem Creator-Code importiertes) Teil-Regelwerk und macht
// daraus ein vollständiges, gültiges Regelwerk: fehlende Felder aus DEFAULT_RULES,
// Zahlen auf die RULE_LIMITS beschnitten, Fremdschlüssel verworfen.
export function sanitizeRules(partial = {}) {
  const L = RULE_LIMITS;
  const src = partial && typeof partial === "object" ? partial : {};
  const c = src.combo || {};
  const mk = src.markets || {};
  const g = mk.goals || {};
  const jk = src.joker || {};
  const num = (v, d) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : d;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(+v)) return +v;
    return d;   // null, undefined, "", Booleans, Unsinn → Default
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const D = DEFAULT_RULES;
  return {
    name: (typeof src.name === "string" && src.name.trim()) ? src.name.trim().slice(0, 40) : D.name,
    k: clamp(num(src.k, D.k), L.k.min, L.k.max),
    m: clamp(num(src.m, D.m), L.m.min, L.m.max),
    minPayout: clamp(num(src.minPayout, D.minPayout), L.minPayout.min, L.minPayout.max),
    winnerFloor: src.winnerFloor !== false,
    wrongPenalty: clamp(num(src.wrongPenalty, D.wrongPenalty), L.wrongPenalty.min, L.wrongPenalty.max),
    combo: {
      tendenz: clamp(num(c.tendenz, D.combo.tendenz), L.combo.tendenz.min, L.combo.tendenz.max),
      abstand: clamp(num(c.abstand, D.combo.abstand), L.combo.abstand.min, L.combo.abstand.max),
      exakt:   clamp(num(c.exakt,   D.combo.exakt),   L.combo.exakt.min,   L.combo.exakt.max),
    },
    displayScale: clamp(num(src.displayScale, D.displayScale), L.displayScale.min, L.displayScale.max),
    perGameCap: src.perGameCap == null ? null : clamp(num(src.perGameCap, 0), L.perGameCap.min, L.perGameCap.max),
    markets: {
      result: mk.result !== false,
      goals: {
        enabled: g.enabled !== false,
        modus: g.modus === "proSpiel" ? "proSpiel" : "proTeam",
        picksPerTeam: clamp(Math.round(num(g.picksPerTeam, D.markets.goals.picksPerTeam)), L.picksPerTeam.min, L.picksPerTeam.max),
        picksProSpiel: clamp(Math.round(num(g.picksProSpiel, D.markets.goals.picksProSpiel)), L.picksProSpiel.min, L.picksProSpiel.max),
        allowDouble: g.allowDouble !== false,
        allowBackups: g.allowBackups !== false,
      },
    },
    oddsMode: src.oddsMode === "average" ? "average" : "snapshot",
    underdogBoost: clamp(num(src.underdogBoost, D.underdogBoost), L.underdogBoost.min, L.underdogBoost.max),
    underdogRampStart: clamp(num(src.underdogRampStart, D.underdogRampStart), L.underdogRampStart.min, L.underdogRampStart.max),
    underdogRampEnd: clamp(num(src.underdogRampEnd, D.underdogRampEnd), L.underdogRampEnd.min, L.underdogRampEnd.max),
    favFlopPenalty: clamp(num(src.favFlopPenalty, D.favFlopPenalty), L.favFlopPenalty.min, L.favFlopPenalty.max),
    joker: sanitizeJoker(jk, num, clamp),
    teamMods: sanitizeTeamMods(src.teamMods && typeof src.teamMods === "object" ? src.teamMods : {}, num, clamp),
    modCap: clamp(num(src.modCap, D.modCap), L.modCap.min, L.modCap.max),
    modFloor: clamp(num(src.modFloor, D.modFloor), L.modFloor.min, L.modFloor.max),
    // Unbekannte Werte fallen auf den Standard (0,05) zurück — derselbe
    // Katalog-Fallback wie bei Saisonform, Versäumnis-Strategie usw.
    reglerFeinheit: (() => {
      const roh = num(src.reglerFeinheit, D.reglerFeinheit);
      const treffer = REGLER_FEINHEITEN.find((f) => f.wert === roh);
      return treffer ? treffer.wert : D.reglerFeinheit;
    })(),
    aufholen: (() => {
      const a = src.aufholen && typeof src.aufholen === "object" ? src.aufholen : {};
      // Der Katalog ist die EINE Quelle — sonst müsste eine neue Stufe an zwei
      // Stellen eingetragen werden und fiele hier still durch.
      const betrifft = BETRIFFT[a.betrifft] ? a.betrifft : D.aufholen.betrifft;
      return {
        enabled: a.enabled === true,
        staerke: clamp(num(a.staerke, D.aufholen.staerke), L.aufholen.staerke.min, L.aufholen.staerke.max),
        schwelle: clamp(num(a.schwelle, D.aufholen.schwelle), L.aufholen.schwelle.min, L.aufholen.schwelle.max),
        betrifft,
        // Nur die parametrierten Stufen tragen eine Zahl; sonst bleibt sie weg,
        // damit im Creator-Code kein toter Wert mitreist.
        ...(BETRIFFT[betrifft].parameter
          ? { betrifftWert: betrifftWert(betrifft, a.betrifftWert) } : {}),
      };
    })(),
    // Der Katalog der Kurven ist die EINE Quelle — deshalb delegiert, wie bei
    // Saison-Wetten und Joker-Verteilung auch.
    saisonform: sanitizeSaisonform(src.saisonform),
    tippEinfluss: sanitizeTippEinfluss(src.tippEinfluss),
    versaeumnis: (() => {
      const v = src.versaeumnis && typeof src.versaeumnis === "object" ? src.versaeumnis : {};
      const erlaubt = ["wahrscheinlich", "schnitt", "zufall"];
      return {
        enabled: v.enabled === true,
        strategie: erlaubt.includes(v.strategie) ? v.strategie : D.versaeumnis.strategie,
        malusProzent: clamp(Math.round(num(v.malusProzent, D.versaeumnis.malusProzent)), L.versaeumnis.malusProzent.min, L.versaeumnis.malusProzent.max),
        maxProSaison: clamp(Math.round(num(v.maxProSaison, D.versaeumnis.maxProSaison)), L.versaeumnis.maxProSaison.min, L.versaeumnis.maxProSaison.max),
      };
    })(),
    // Saison-Wetten pruefen sich selbst (Katalog liegt in saisonwetten.js) —
    // so bleibt der Wett-Katalog die eine Quelle, auch fuer Creator-Codes.
    saison: sanitizeSaison(src.saison),
    // Big Game ebenso — der Katalog der Signale bleibt in bigGame.js.
    bigGame: sanitizeBigGame(src.bigGame),
    spiele: sanitizeSpiele(src.spiele),
    ereignisse: sanitizeEreignisse(src.ereignisse),
    wettbewerbe: sanitizeWettbewerbe(src.wettbewerbe),
    tippfenster: sanitizeTippfenster(src.tippfenster),
    zeitachse: sanitizeZeitachse(src.zeitachse),
    // Duell-Joker, Budget, Limitierungsklassen, Joker-Grundform und Drehrad
    // prüfen sich selbst — dieselbe Delegation wie bei Saisonform und
    // Saison-Wetten, damit die jeweiligen Kataloge die eine Quelle bleiben.
    duell: sanitizeDuellJoker(src.duell),
    budget: sanitizeBudget(src.budget),
    limitKlassen: sanitizeLimitKlassen(src.limitKlassen),
    jokerBasis: sanitizeJokerBasisKarte(src.jokerBasis),
    drehrad: sanitizeDrehrad(src.drehrad),
  };
}


// ── 3) SCORING ──────────────────────────────────────────────
const sgn = (h, a) => (h > a ? 1 : h < a ? -1 : 0);

// Anteil auf der Underdog-Ramp (0 unterhalb rampStart … 1 ab rampEnd) für eine
// gegebene Sieger-Quote. Von Boost UND Favoriten-Malus geteilt: der Admin legt
// „ab welcher Quote gilt jemand als Außenseiter" nur einmal fest. Ungültige Ramp
// oder fehlende Quote → 0 (kein Effekt), also sicher.
function rampFactor(winnerQuote, rules) {
  const start = rules.underdogRampStart ?? Infinity;
  const end = rules.underdogRampEnd ?? Infinity;
  if (winnerQuote == null || !(end > start)) return 0;
  return Math.min(1, Math.max(0, (winnerQuote - start) / (end - start)));
}

// Underdog-Boost: Multiplikator auf den Ergebnis-Teil, wenn das REALE Ergebnis
// (nicht der Tipp!) ein Außenseiter-Ausgang war — gemessen an dessen Sieger-
// Quote (fließend über die Ramp). boost=1 ist ein reines No-op.
function underdogMultiplier(actual, snap, rules) {
  const boost = rules.underdogBoost ?? 1;
  if (boost === 1) return 1;
  const winnerQuote = sgn(actual.home, actual.away) === 1 ? snap.winner.home
    : sgn(actual.home, actual.away) === -1 ? snap.winner.away : snap.winner.draw;
  return 1 + (boost - 1) * rampFactor(winnerQuote, rules);
}

// Favoriten-Reinfall-Malus: roher Abzug, wenn der Tipp den FAVORITEN als Sieger
// hatte und der real verloren hat. Skaliert mit der Außenseiter-Quote des echten
// Siegers (via rampFactor) × Admin-Stärke. 0, wenn nicht anwendbar (Remis-Tipp,
// Remis-Ausgang, Außenseiter richtig getippt, Malus aus).
function favoriteFlopPenalty(tip, actual, snap, rules) {
  const strength = rules.favFlopPenalty ?? 0;
  if (strength <= 0) return 0;
  const actualWinner = sgn(actual.home, actual.away);
  const tipWinner = sgn(tip.home, tip.away);
  if (actualWinner === 0 || tipWinner === 0) return 0;         // kein klarer Sieger/Tipp
  const favIsHome = snap.winner.home <= snap.winner.away;      // Favorit = niedrigere Quote
  const backedFavorite = favIsHome ? tipWinner === 1 : tipWinner === -1;
  const favoriteLost = actualWinner === (favIsHome ? -1 : 1);  // die andere Seite hat gewonnen
  if (!(backedFavorite && favoriteLost)) return 0;
  const winnerQuote = actualWinner === 1 ? snap.winner.home : snap.winner.away;
  return strength * rampFactor(winnerQuote, rules);
}

// Ergebnis-Tipp → Ebenen, Maximum gewinnt. Team-Tore-Nähe ist siegerunabhängig.
export function scoreResult(tip, actual, snap, rules = DEFAULT_RULES) {
  const dist = Math.abs(tip.home - actual.home) + Math.abs(tip.away - actual.away);
  const winnerRight = sgn(tip.home, tip.away) === sgn(actual.home, actual.away);
  const marginRight = winnerRight && Math.abs(tip.home - tip.away) === Math.abs(actual.home - actual.away);

  const tendBoden = winnerRight && rules.winnerFloor
    ? (sgn(actual.home, actual.away) === 1 ? snap.winner.home
      : sgn(actual.home, actual.away) === -1 ? snap.winner.away : snap.winner.draw) - 1 : 0;
  // Alle Quoten-Zugriffe gegen Ergebnisse außerhalb des Rasters (z. B. 6+ Tore,
  // seltene Endstände) absichern — fehlt eine Quote, zahlt der Teil 0.
  const marginArr = sgn(actual.home, actual.away) === 1 ? snap.margin.home : snap.margin.away;
  const marginRaw = marginArr[Math.abs(actual.home - actual.away)];
  const abstand = marginRight && marginRaw != null ? marginRaw - 1 : 0;
  const csRaw = snap.correctScore?.[actual.home]?.[actual.away];
  const ergNaehe = csRaw != null ? Math.exp(-rules.k * dist) * csRaw : 0;
  const teamTore =
      Math.exp(-rules.m * Math.abs(tip.home - actual.home)) * (snap.teamGoals.home[actual.home] ?? 0)
    + Math.exp(-rules.m * Math.abs(tip.away - actual.away)) * (snap.teamGoals.away[actual.away] ?? 0);

  let nearParts = Math.max(ergNaehe, teamTore);
  if (nearParts < rules.minPayout) nearParts = 0;

  let resultPart = Math.max(tendBoden, abstand, nearParts);
  let underdogMult = 1;
  if (!winnerRight && resultPart === 0) {
    resultPart = rules.wrongPenalty;
  } else if (resultPart > 0) {
    underdogMult = underdogMultiplier(actual, snap, rules);
    resultPart *= underdogMult;
  }

  const ebene = dist === 0 ? "exakt" : marginRight ? "abstand" : winnerRight ? "tendenz" : "keiner";
  return { resultPart, ebene, dist, winnerRight, underdogMult, parts: { tendBoden, abstand, ergNaehe, teamTore } };
}

// Tore: gleicher Spieler 2× = Doppelpack. 2 Tore → double, 1 Tor → anytime (Floor), 0 → nichts.
export function scoreGoals(picks, snap, rules = DEFAULT_RULES, playerGoals = null) {
  let net = 0; const detail = [];
  // Im Modus `proSpiel` gibt es keine Trennung nach Mannschaft: die Namen
  // stehen alle in EINEM Topf, und nachgeschlagen wird auf beiden Seiten. Die
  // Tipp-Form bleibt trotzdem `{ home, away }` — schon abgegebene Tipps und die
  // Datenbank ändern sich dadurch nicht, und ein Wechsel des Modus mitten in
  // der Saison wertet Altes weiter richtig aus.
  const proSpiel = rules?.markets?.goals?.modus === "proSpiel";
  const seiten = proSpiel ? ["spiel"] : ["home", "away"];
  for (const side of seiten) {
    const counts = {};
    const quelle = proSpiel ? [...(picks.home || []), ...(picks.away || [])] : (picks[side] || []);
    for (const p of quelle) if (p) counts[p] = (counts[p] || 0) + 1;
    for (const [p, c] of Object.entries(counts)) {
      const P = proSpiel
        ? (snap.players.home?.[p] ?? snap.players.away?.[p])
        : snap.players[side][p];
      if (!P) continue;
      const scored = playerGoals ? (playerGoals[p] || 0) : null;   // null = "angenommen es trifft"
      if (c >= 2) {
        const goals2 = scored == null ? 2 : scored;                // Auswertung: echte Toranzahl
        const q = goals2 >= 2 ? P.double : goals2 === 1 ? P.anytime : 1;
        if (goals2 >= 1) net += q - 1;
        detail.push({ side, player: p, type: "double", single: P.anytime, double: P.double, scored });
      } else {
        const hit = scored == null ? true : scored >= 1;
        if (hit) net += P.anytime - 1;
        detail.push({ side, player: p, type: "single", anytime: P.anytime, scored });
      }
    }
  }
  return { net, detail };
}

// Anzeige-Skalierung: intern wird roh gerechnet, erst hier hochskaliert.
export function toDisplay(raw, rules = DEFAULT_RULES) {
  let v = raw * (rules.displayScale ?? 1);
  if (rules.perGameCap != null) v = Math.min(v, rules.perGameCap);
  return Math.round(v);
}

// Kombi-Regel: Tor-Gewinne verstärken das Ergebnis nur bei richtiger Tendenz.
export function applyCombo(resultPart, ebene, goalsNet, rules = DEFAULT_RULES) {
  if (goalsNet <= 0) return resultPart;
  return ebene === "keiner" ? resultPart + goalsNet : (resultPart + goalsNet) * rules.combo[ebene];
}

// Joker-Faktor eines Tipps: 1 (No-op), wenn der Joker im Regelwerk aus ist oder
// der Tipp nicht markiert wurde. Greift auf die GESAMTWERTUNG (Ergebnis + Tore
// nach Kombi), nicht auf Einzelteile — deshalb deckt ein Joker automatisch auch
// die Torschützen mit ab, ohne zweiten Regler.
// Wer ist laut Quoten der Favorit? (niedrigere Sieger-Quote). Nur aus `snap` —
// die Engine kennt keine Vereinsnamen, nur Zahlen.
function favoritSeite(snap) {
  const w = snap?.winner;
  if (!w) return 0;
  return w.home <= w.away ? 1 : -1;
}

// ── Joker-TYPEN ──────────────────────────────────────────────
// Jeder Typ liefert einen AUFSCHLAG (0 = greift nicht). Die Aufschläge werden
// in `jokerFactor` addiert — nie multipliziert, sonst schaukeln sich mehrere
// Typen auf. Neue Ideen kommen als weiterer Eintrag hierher, NICHT als neue
// Modifikator-Ebene: der Deckel (`modCap`) gilt dann automatisch mit.
//
// `aufschlag(tip, snap, j)` → Zahl ≥ 0
export const JOKER_TYPEN = [
  {
    key: "aktiv",
    label: "Gesetzter Joker",
    hint: "Du markierst selbst ein Spiel (bzw. verteilst Gewichte).",
    aufschlag: (tip, snap, j) => {
      if (j.modus === "ranking") {
        // Nur Gewichte aus dem Pool zählen — alles andere ist neutral. Damit
        // kann ein manipulierter Tipp keinen Fantasie-Faktor einschleusen.
        const w = tip?.gewicht;
        const gueltig = Number.isFinite(w) && (j.faktoren || []).includes(w);
        return gueltig ? Math.max(0, w - 1) : 0;
      }
      if (tip?.joker !== true) return 0;
      const f = j.faktor;
      return Number.isFinite(f) && f > 0 ? Math.max(0, f - 1) : 0;
    },
  },
  {
    key: "heimat",
    label: "Heimatbonus",
    hint: "Die Spiele deines Vereins zählen mehr — passiv, ohne Entscheidung.",
    aufschlag: (tip, snap, j) => {
      const h = j.heimat;
      if (!h?.enabled) return 0;
      const verein = tip?.verein;
      if (!verein) return 0;
      const dabei = snap?.home === verein || snap?.away === verein;
      if (!dabei) return 0;
      return Number.isFinite(h.faktor) ? Math.max(0, h.faktor - 1) : 0;
    },
  },
  {
    key: "mut",
    label: "Mut-Bonus",
    hint: "Greift, wenn du gegen den Favoriten getippt hast — UND recht behältst.",
    // ⚠️ Bewusst an den ERFOLG gekoppelt. Eine frühere Fassung zahlte für JEDEN
    // Tipp gegen den Favoriten — der Balance-Simulator zeigte sofort, dass damit
    // der Zocker gewinnt (73 % statt 7 %): wer immer gegen den Favoriten tippt,
    // kassierte den Aufschlag garantiert. Belohnt wird also nicht das Wagnis,
    // sondern der eingelöste Mut.
    aufschlag: (tip, snap, j, actual) => {
      const m = j.mut;
      if (!m?.enabled) return 0;
      const fav = favoritSeite(snap);
      const getippt = sgn(tip?.home, tip?.away);
      // Remis-Tipp ist kein Mut gegen den Favoriten, sondern eine dritte Option.
      if (fav === 0 || getippt === 0) return 0;
      if (getippt === fav) return 0;              // auf den Favoriten gesetzt
      if (!actual) return 0;                      // ohne Ergebnis kein Erfolg
      if (sgn(actual.home, actual.away) !== getippt) return 0;   // Mut ging daneben
      return Number.isFinite(m.faktor) ? Math.max(0, m.faktor - 1) : 0;
    },
  },
];

// Welche Joker-Typen greifen bei DIESEM Tipp? Für die Aufschlüsselung.
// Rückgabe: [{ key, label, aufschlag, faktor }] — nur die, die wirklich greifen.
export function jokerAufschlaege(tip, snap, rules = DEFAULT_RULES, actual = null) {
  const j = rules?.joker;
  if (!j?.enabled) return [];
  const out = [];
  for (const typ of JOKER_TYPEN) {
    const a = typ.aufschlag(tip, snap, j, actual);
    if (a > 0) out.push({ key: typ.key, label: typ.label, aufschlag: +a.toFixed(3), faktor: +(1 + a).toFixed(3) });
  }
  return out;
}

// Gesamt-Joker-Faktor: 1 + Summe aller Typ-Aufschläge (additiv, siehe oben).
// 1 = neutrales No-op. `snap` ist optional, damit alte Aufrufer weiter laufen —
// ohne Snapshot greifen die snapshot-abhängigen Typen einfach nicht.
export function jokerFactor(tip, rules = DEFAULT_RULES, snap = null, actual = null) {
  const summe = jokerAufschlaege(tip, snap, rules, actual).reduce((s, t) => s + t.aufschlag, 0);
  return +(1 + summe).toFixed(3);
}

// Team-/Derby-Faktor einer Begegnung. Rein aus `snap` + `rules`:
//  • Derby — erkannt an `snap.derby` (die Daten-Schicht setzt das Label; die
//    Engine kennt keine Vereins-Paarungen und bleibt dadurch sportart-neutral).
//  • Verein — Faktor für Heim und/oder Gast aus `teamMods.teams`.
// Mehrere Treffer werden ADDITIV zusammengefasst (siehe modCap).
export function teamModFactor(snap, rules = DEFAULT_RULES) {
  const tm = rules?.teamMods;
  if (!tm) return 1;
  // ⚠️ Auch NEGATIVE Beiträge zählen (Faktor unter 1 = Dämpfer). Vorher stand
  // hier `> 1`, wodurch Modifikatoren nur nach oben konnten: der Admin konnte
  // Wichtiges hervorheben, aber Unwichtiges nicht zurücknehmen. Nach unten
  // begrenzt `modFloor` in `totalModifier`.
  let aufschlag = 0;
  if (snap?.derby && Number.isFinite(tm.derbyFaktor)) aufschlag += tm.derbyFaktor - 1;
  const teams = tm.teams || {};
  for (const seite of [snap?.home, snap?.away]) {
    const f = seite ? teams[seite] : undefined;
    if (Number.isFinite(f)) aufschlag += f - 1;
  }
  // Das Big Game sagt dasselbe wie ein Derby („dieses Spiel zählt mehr, für
  // alle gleich") und gehört deshalb in denselben Aufschlag — nicht daneben.
  aufschlag += bigGameAufschlag(snap, rules);
  // Wettbewerb und K.-o.-Runde sagen wieder dasselbe — also derselbe Topf.
  // Ein vierter Multiplikator daneben würde sich mit den übrigen aufschaukeln.
  aufschlag += wettbewerbAufschlag(snap, rules);
  return 1 + aufschlag;
}

// ALLE Modifikatoren eines Spiels zu EINEM Faktor — additiv, dann gedeckelt.
//
// Warum additiv: Es gibt drei Ebenen (Joker pro Nutzer, Abstimmung pro
// Spieltag, Team-Mods pro Begegnung). Multiplikativ ergäbe 2 × 1,5 × 1,2 = 3,6×
// — ein Ausreißer, der die Balance sprengt. Additiv sind es 1 + 1,0 + 0,5 + 0,2
// = 2,7×: vorhersagbar, und der Admin kann im Kopf nachrechnen.
//
// Gibt die Einzelteile mit zurück, damit die UI erklären kann, WOHER der Faktor
// kommt („×2,3 — Joker + Revierderby") statt nur eine Zahl zu zeigen.
export function totalModifier(tip, snap, rules = DEFAULT_RULES, actual = null) {
  const joker = jokerFactor(tip, rules, snap, actual);
  const team = teamModFactor(snap, rules);
  // Der Joker bleibt nach unten bei 0 gekappt — ein Joker, der SCHADET, ist
  // eine eigene Entscheidung (`jokerBasis.symmetrie`) und nicht Sache dieser
  // Stelle. Die Team-Ebene darf dagegen negativ beitragen: das ist der Dämpfer.
  const aufschlag = Math.max(0, joker - 1) + (team - 1);
  const roh = 1 + aufschlag;
  const cap = Number.isFinite(rules?.modCap) ? rules.modCap : Infinity;
  // ⚠️ `modFloor` ist das Gegenstück zu `modCap`. Ohne ihn könnte ein Spiel
  // durch gestapelte Dämpfer auf 0 oder darunter fallen — ein RICHTIGER Tipp
  // würde dann bestraft. Der Boden ist nie negativ, damit sich das Vorzeichen
  // einer Wertung nie umdreht (gleiche Familie wie `block.nurGewinn`).
  const floor = Number.isFinite(rules?.modFloor) ? Math.max(0, rules.modFloor) : 0;
  const faktor = Math.min(Math.max(roh, floor), cap);
  return {
    faktor: +faktor.toFixed(3),
    joker: +joker.toFixed(3),
    team: +team.toFixed(3),
    gedeckelt: roh > cap,
    gedaempft: roh < floor,
  };
}

// Höchster Joker-Faktor allein (1 = Joker aus).
export function maxJokerFactor(rules = DEFAULT_RULES) {
  const j = rules?.joker;
  if (!j?.enabled) return 1;
  if (j.modus === "ranking") return Math.max(1, ...(j.faktoren || [1]));
  return Number.isFinite(j.faktor) ? j.faktor : 1;
}

// Höchster Faktor, den ein einzelnes Spiel überhaupt erreichen kann — Joker UND
// Team-/Derby-Modifikatoren zusammen, additiv und gedeckelt. Das ist der Wert,
// an dem sich die Skalierungs-Empfehlung und der „Maximalfall" orientieren
// müssen; sonst laufen die Punktzahlen davon, sobald Team-Mods dazukommen.
export function maxTotalModifier(rules = DEFAULT_RULES) {
  const joker = maxJokerFactor(rules);
  const tm = rules?.teamMods || {};
  // Ungünstigster Fall: Derby UND beide Vereine mit Faktor belegt.
  const teamWerte = Object.values(tm.teams || {}).filter((f) => Number.isFinite(f) && f > 1)
    .sort((a, b) => b - a).slice(0, 2);
  let aufschlag = Math.max(0, joker - 1);
  if (rules?.bigGame?.enabled) aufschlag += sanitizeBigGame(rules.bigGame).aufschlag;
  aufschlag += maxWettbewerbAufschlag(rules);
  if (tm.derbyFaktor > 1) aufschlag += tm.derbyFaktor - 1;
  for (const f of teamWerte) aufschlag += f - 1;
  const cap = Number.isFinite(rules?.modCap) ? rules.modCap : Infinity;
  return +Math.min(1 + aufschlag, cap).toFixed(3);
}

// Prüfregel „ein Joker pro Spieltag": gibt die Spieltage zurück, an denen ein
// Nutzer mehr als einen Joker gesetzt hat (leeres Array = gültig). Reine
// Prüfung — das Durchsetzen (Speichern verweigern) und vor allem das EINFRIEREN
// ab Anpfiff sind Sache von Store/UI, analog zur Snapshot-Quote.
// Der zusammengesetzte Spieltags-Schlüssel steckt in `spieltag.js`: ohne ihn
// dürfte ein Tipper sein „×2" über zwei Wettbewerbe hinweg nur EINMAL
// vergeben — oder bekäme es doppelt.

// Prüfregel „ein Joker pro Spieltag". Gibt die beanstandeten Spieltage als
// { wettbewerb, matchday } zurück — eine nackte Zahl wäre mit mehreren
// Wettbewerben nicht mehr eindeutig.
// `schluessel` entscheidet, was „ein Spieltag" ist. Vorgabe bleibt der
// LIGA-Spieltag (`spieltagKey`) — damit ändert sich ohne Zutun nichts. Eine
// Runde über mehrere Wettbewerbe reicht stattdessen `rundenSchluessel(achse)`
// aus `zeitachse.js` herein: sonst gäbe es fünf Joker pro Woche statt einem.
// Die Engine kennt dabei weiterhin keine Ligennamen — sie bekommt eine
// Funktion, keine Wettbewerbs-Liste (Architektur-Regel 3).
export function invalidJokerMatchdays(tips = [], schluessel = spieltagKey) {
  const counts = new Map();
  for (const t of tips) {
    if (t?.joker !== true) continue;
    const key = schluessel(t);
    const eintrag = counts.get(key) || { wettbewerb: t.wettbewerb ?? null, matchday: t.matchday ?? null, n: 0 };
    eintrag.n++;
    counts.set(key, eintrag);
  }
  return [...counts.values()].filter((e) => e.n > 1).map(({ wettbewerb, matchday }) => ({ wettbewerb, matchday }));
}

// Prüfregel für den Ranking-Modus: jeder Pool-Faktor darf pro Spieltag nur
// EINMAL vergeben werden, und nur Werte aus dem Pool sind zulässig. Das neutrale
// Gewicht 1 ist ausgenommen — es ist der Rest für alle übrigen Spiele.
// Gibt die beanstandeten Spieltage zurück (leeres Array = gültig).
export function invalidWeightMatchdays(tips = [], rules = DEFAULT_RULES, schluessel = spieltagKey) {
  const pool = rules?.joker?.faktoren || [];
  const belegt = new Map();      // Spieltag-Schlüssel → Set vergebener Faktoren
  const fehler = new Map();      // Spieltag-Schlüssel → { wettbewerb, matchday }
  for (const t of tips) {
    const w = t?.gewicht;
    if (!Number.isFinite(w) || w === 1) continue;
    const key = schluessel(t);
    const bezeichnung = { wettbewerb: t.wettbewerb ?? null, matchday: t.matchday ?? null };
    if (!pool.includes(w)) { fehler.set(key, bezeichnung); continue; }
    const used = belegt.get(key) || new Set();
    if (used.has(w)) fehler.set(key, bezeichnung);
    used.add(w);
    belegt.set(key, used);
  }
  return [...fehler.values()];
}

// Belegung der Ranking-Gewichte für EINEN Spieltag — speist direkt die UI.
// tips = die Tipps eines Nutzers (beliebige Spieltage, wird hier gefiltert).
// Rückgabe: pro Pool-Gewicht, ob und auf welchem Match es liegt, plus die noch
// freien Gewichte. `exceptMatchId` blendet den gerade bearbeiteten Tipp aus,
// damit sein eigenes Gewicht beim Umstellen nicht als „belegt" gilt.
// `spieltag` ist entweder ein Objekt { wettbewerb, matchday } oder — für
// Altaufrufe — eine nackte Zahl. Die Zahl allein bleibt erlaubt, solange eine
// Runde nur EINEN Wettbewerb hat; sobald mehrere im Spiel sind, muss der
// Aufrufer das Objekt reichen, sonst zählt er über Wettbewerbe hinweg.
export function weightUsageForMatchday(tips = [], spieltag, rules = DEFAULT_RULES, exceptMatchId = null, schluessel = spieltagKey) {
  const ziel = (spieltag && typeof spieltag === "object")
    ? schluessel(spieltag)
    : schluessel({ matchday: spieltag });
  const pool = rules?.joker?.faktoren || [];
  const belegtVon = new Map();   // gewicht → matchId
  for (const t of tips) {
    if (schluessel(t) !== ziel) continue;
    if (t.match_id === exceptMatchId || t.matchId === exceptMatchId) continue;
    const w = t?.gewicht;
    if (Number.isFinite(w) && w !== 1 && pool.includes(w) && !belegtVon.has(w)) {
      belegtVon.set(w, t.match_id ?? t.matchId ?? null);
    }
  }
  const belegt = pool.map((gewicht) => ({ gewicht, matchId: belegtVon.get(gewicht) ?? null }));
  const frei = pool.filter((g) => g !== 1 && !belegtVon.has(g));
  return { pool, belegt, frei, alleVergeben: frei.length === 0 };
}

// Gesamtwertung eines Tipps inkl. Kombi-Multiplikator, Favoriten-Malus und Joker.
export function scoreTip(tip, actual, snap, rules = DEFAULT_RULES) {
  const res = scoreResult(tip, actual, snap, rules);
  const goals = scoreGoals(tip.goals || { home: [], away: [] }, snap, rules, actual.playerGoals);
  const combined = applyCombo(res.resultPart, res.ebene, goals.net, rules);
  // Favoriten-Reinfall: Abzug vom Gesamt-Roh-Wert, aber nicht unter 0
  // (kein tiefes Minus — die richtig getippten Underdog-Tore federn ab).
  const favFlop = favoriteFlopPenalty(tip, actual, snap, rules);
  const afterFlop = favFlop > 0 ? Math.max(0, combined - favFlop) : combined;
  // Modifikatoren ganz zuletzt: skalieren das fertige Ergebnis dieses Spiels.
  const mod = totalModifier(tip, snap, rules, actual);
  const raw = afterFlop * mod.faktor;
  return {
    total: toDisplay(raw, rules), raw: +raw.toFixed(1), favFlop: +favFlop.toFixed(1),
    jokerMult: mod.faktor, modifier: mod,
    ...res, goals,
  };
}


// Vorschau beim Tippen: was BRINGT der Tipp, wenn er exakt so eintrifft?
// Anker ist hier bewusst das GETIPPTE Ergebnis — reine Aussicht, nicht die
// echte Wertung (die ankert immer am realen Ergebnis). playerGoals=null heißt
// „angenommen, die getippten Schützen treffen". Nur Anzeige, nie Fairness.
export function projectTip(tip, snap, rules = DEFAULT_RULES) {
  const actual = { home: tip.home, away: tip.away, playerGoals: null };
  const s = scoreTip(tip, actual, snap, rules);
  return {
    points: s.total,                                        // mögliche Punkte (Display-Skala)
    exaktQuote: snap.correctScore?.[tip.home]?.[tip.away] ?? null,
    goalsNet: s.goals.net,                                  // roher Tor-Beitrag
    ergNaehe: s.parts.ergNaehe,                             // roher Ergebnis-Nähe-Anteil
    combo: rules.combo.exakt,
  };
}

// Leaderboard: aggregiert die angezeigten Punkte je Nutzer über mehrere Tipps.
// entries: [{ userId, name, tip, snapshot, result, rules? }]. Tipps ohne Ergebnis
// (Match noch nicht ausgewertet) zählen 0. Rückgabe absteigend sortiert mit Rang.
export function scoreLeaderboard(entries = [], rules = DEFAULT_RULES) {
  const byUser = new Map();
  // Tipp-Einfluss: die Runde bewegt das Ergebnis-Raster mit. Ist die Regel aus
  // (Vorgabe), kommen die Einträge unverändert zurück — dieselben Objekte, kein
  // Kopieren. Hier und nicht beim Speichern des Tipps, weil die Mischung erst
  // feststehen darf, wenn ALLE Tipps da sind (siehe tippEinfluss.js).
  // ⚠️ Der Verlauf ruft diese Funktion je Spieltag erneut auf und mischt damit
  // jeweils nur mit den bis dahin sichtbaren Tipps — das ist richtig so: ein
  // Zwischenstand soll aus sich heraus stimmen.
  for (const e of mitTippEinfluss(entries, rules)) {
    const cur = byUser.get(e.userId) || { userId: e.userId, name: e.name, total: 0, tips: 0, gewertet: 0 };
    cur.tips += 1;
    if (e.result) {
      cur.total += scoreTip(e.tip, e.result, e.snapshot, e.rules || rules).total;
      cur.gewertet += 1;
    }
    byUser.set(e.userId, cur);
  }
  return [...byUser.values()]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

// Ranking-Verlauf: wie scoreLeaderboard, aber je Spieltag ein kumulatives
// Zwischenstand-Ranking. entries brauchen zusätzlich `matchday`, idealerweise
// auch `wettbewerb` und `kickoff`. Kein neuer Scoring-Code — ruft
// scoreLeaderboard je Cutoff wieder auf.
//
// ⚠️ Ein Spieltag ist erst mit dem WETTBEWERB eindeutig (siehe `spieltagKey`).
// Über die nackte Zahl zu gruppieren, ließ Bundesliga-, Premier-League- und
// CL-Spieltag 1 zu EINEM Verlaufspunkt verschmelzen — und der kumulative
// Schnitt `matchday <= N` zählte CL-Tipps in den Bundesliga-Zwischenstand.
// Das ist nicht nur Anzeige: `applyCatchup` hängt an diesem Verlauf, der
// Anschluss-Bonus wäre also aus erfundenen Zwischenständen entstanden.
//
// Geordnet wird CHRONOLOGISCH, nicht nach der Spieltags-Zahl — siehe
// `spieltageChronologisch`. Nach Zahl sortiert würde der Verlauf springen und
// der Aufhol-Bonus zum falschen Zeitpunkt greifen, weil er am Stand VOR dem
// Spieltag hängt.
// Braucht dieses Regelwerk den VERLAUF, um einen Endstand zu berechnen?
//
// `scoreLeaderboard` summiert nur — das genügt, solange keine Regel auf die
// Abfolge der Spieltage schaut. Sobald eine es tut, muss der Endstand aus
// `scoreLeaderboardHistory` kommen, sonst fehlt ihr Beitrag stillschweigend.
//
// ⚠️ **Diese Frage gehört an EINE Stelle.** Sie stand als
// `rules.aufholen?.enabled` in beiden Store-Dateien — und als die Saisonform
// dazukam, waren beide falsch, ohne dass irgendetwas fehlschlug: Streicher und
// Gewichtung wurden im Leaderboard schlicht nicht angewandt, außer der
// Aufhol-Bonus war zufällig auch an. Wer hier eine dritte verlaufsabhängige
// Regel ergänzt, ändert nur diese Funktion.
export function brauchtVerlauf(rules = DEFAULT_RULES) {
  if (rules?.aufholen?.enabled === true) return true;
  if (sanitizeDuellJoker(rules?.duell).enabled) return true;
  const sf = sanitizeSaisonform(rules?.saisonform);
  return sf.kurve !== "flach" || sf.streich > 0;
}

export function scoreLeaderboardHistory(entries = [], rules = DEFAULT_RULES, einsaetze = []) {
  const geordnet = spieltageChronologisch(entries);

  // Position eines Spieltags im Verlauf — der kumulative Schnitt läuft über
  // diese Reihenfolge, nicht mehr über einen Zahlenvergleich.
  const rang = new Map(geordnet.map((s, i) => [s.key, i]));
  const roh = geordnet.map((s, i) => ({
    wettbewerb: s.wettbewerb,
    matchday: s.matchday,
    board: scoreLeaderboard(entries.filter((e) => {
      const r = rang.get(spieltagKey(e));
      return r != null && r <= i;
    }), rules),
  }));
  // Reihenfolge der drei Nachbearbeitungen ist NICHT beliebig:
  //
  // 1. Duell-Joker (Klau/Block), weil die Überweisung INNERHALB eines
  //    Spieltags passiert.
  // 2. Saisonform (Gewichtung + Streichresultate) formt die Spieltagspunkte
  //    um — sie muss den Wert wiegen, der nach der Überweisung wirklich zählt.
  // 3. Aufhol-Boni reagieren auf den Rückstand — und der soll die Gewichtung
  //    und die Streicher schon enthalten, sonst gleicht der Bonus einen
  //    Abstand aus, den es nach den Regeln der Runde gar nicht gibt.
  //
  // Alle drei geben den Verlauf unverändert zurück, wenn ihre Regel aus ist
  // (oder — beim Duell-Joker — wenn keine Einsätze vorliegen, siehe
  // duellJoker.js). `einsaetze` ist heute immer leer (Store-Anbindung folgt),
  // `applyDuellJoker` bleibt bis dahin ein No-op.
  return applyCatchup(applySaisonform(applyDuellJoker(roh, rules, einsaetze), rules), rules);
}


// ── 4) CREATOR-CODES (Modi teilen & anpassen) ───────────────
// Nur die ABWEICHUNG von sanitizeRules(DEFAULT_RULES) speichern — sonst landen
// alle Regelblöcke (auch ungenutzte) in jedem Code. Siehe
// design/creator-code-delta.md. Objekte werden rekursiv verglichen, ein
// Teilobjekt ohne Abweichung entfällt ganz. Arrays werden als GANZES
// verglichen (JSON.stringify-Gleichheit) und im Abweichungsfall vollständig
// gespeichert — kein Element-Diff, eine Liste ist eine Einheit.
// ⚠️ EXPORTIERT, damit `teilbibliothek.js` dieselbe Kodierung benutzt statt
// einer Kopie. Eine zweite Fassung dieser drei Funktionen wäre die
// zuverlässigste Art, das Codeformat auseinanderlaufen zu lassen: ein
// Teil-Code, der anders differenziert als der Vollcode, fiele erst auf, wenn
// jemand einen geteilten Code nicht mehr laden kann.
export function ruleDelta(value, base) {
  if (Array.isArray(value) || Array.isArray(base)) {
    return JSON.stringify(value) === JSON.stringify(base) ? undefined : value;
  }
  if (value && base && typeof value === "object" && typeof base === "object") {
    const out = {};
    for (const key of Object.keys(value)) {
      const d = ruleDelta(value[key], base[key]);
      if (d !== undefined) out[key] = d;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return value === base ? undefined : value;
}

export const toBase64 = (j) => (typeof btoa !== "undefined" ? btoa(unescape(encodeURIComponent(j))) : Buffer.from(j, "utf8").toString("base64"));
export const fromBase64 = (b) => (typeof atob !== "undefined" ? decodeURIComponent(escape(atob(b))) : Buffer.from(b, "base64").toString("utf8"));

// ⚠️ Die Präfixe sind AUSSCHLIESSLICH hier bekannt. Die Oberfläche muss einen
// eingefügten Text von einem Server-Kurzcode unterscheiden können — tut sie das
// über ein selbst hingeschriebenes „TS1-", bricht sie beim nächsten
// Formatwechsel still. Genau das ist beim Umstieg auf das Delta-Format (TS2-)
// passiert: `Spielerstellung.jsx` prüfte auf TS1- und hätte jeden neuen Code
// als Kurzcode beim Store gesucht. Deshalb fragt die UI ab jetzt `istCreatorCode`.
export const CREATOR_CODE_PRAEFIXE = ["TS2-", "TS1-"];

export function istCreatorCode(text) {
  return typeof text === "string" && CREATOR_CODE_PRAEFIXE.some((p) => text.startsWith(p));
}

export function encodePreset(rules) {
  const clean = sanitizeRules(rules);
  const base = sanitizeRules(DEFAULT_RULES);
  const delta = ruleDelta(clean, base) || {};
  const j = JSON.stringify(delta);
  return "TS2-" + toBase64(j).replace(/=+$/, "");
}
export function decodePreset(code) {
  if (code?.startsWith("TS2-")) {
    const delta = JSON.parse(fromBase64(code.slice(4)));
    return sanitizeRules(delta);
  }
  if (code?.startsWith("TS1-")) {
    return JSON.parse(fromBase64(code.slice(4)));
  }
  throw new Error("Ungültiger Creator-Code");
}


// ── 5) DEMO ─────────────────────────────────────────────────
export function demo() {
  const odds = createMockOddsSource();
  const snap = odds.getSnapshot("JOR-ESP");
  const result = odds.getResult("JOR-ESP");   // real 5:1, Al-Naimat 2, Yamal 1
  const S = DEFAULT_RULES.displayScale;

  const tipp = { home: 4, away: 1, goals: { home: ["Al-Naimat", "Al-Naimat"], away: ["Yamal", ""] } };
  const r = scoreTip(tipp, result, snap);
  console.log("Voll-Tipp 4:1 + Al-Naimat-Doppelpack + Yamal → real 5:1:");
  console.log(`  roh ${r.raw}  →  angezeigt ${r.total} Punkte  (Ebene: ${r.ebene})`);
  console.log("  Aufschlüsselung (skaliert):",
    `Nähebonus ${Math.round(r.parts.ergNaehe * S)} · Tore +${Math.round(r.goals.net * S)} · Kombi ×${DEFAULT_RULES.combo[r.ebene]}`);

  console.log("\nSkalen-Gefühl (angezeigte Punkte):");
  for (const [h, a] of [[2, 1], [4, 1], [5, 1]]) {
    const t = scoreTip({ home: h, away: a, goals: { home: [], away: [] } }, result, snap);
    console.log(`  Tipp ${h}:${a} (nur Ergebnis) → ${t.total}`);
  }

  const code = encodePreset({ ...DEFAULT_RULES, name: "Hardcore", k: 1.1 });
  console.log("\nCreator-Code:", code.slice(0, 24) + "…", "→", decodePreset(code).name);
}
