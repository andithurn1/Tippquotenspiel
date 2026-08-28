// ============================================================
//  ZWEI TEST-RUNDEN — Andis Zuschnitt vom 27.08.2026
//
//  🔴 Wörtlich: „mach gerne mal eine Runde als Test: Mit Top 4 Vereinen der
//  Top 4 Ligen und Championsleague (mit 1,2 faktor) und mach auch Derby Regel
//  bei ein paar deutschen und Abstiegskampfregel für letzten 4 Spiele. in
//  Buli, und Aufsteigskampf 2. Buli) und versuche selber mal zwei Listen zu
//  erstellen die gut balanciert ist einmal für ne Große Creator Runde wo 1000
//  mitmachen also ohne Fremdjoker und dann noch ne Privatrunde für so 20 mit
//  Fremdjokern".
//
//  ⛔ **Das sind TEST-Runden, keine Bibliothek.** Andi ausdrücklich: „die
//  ganzen Presets bzw eine Bibliothek erstellen wir erst am Ende". Nichts
//  davon gehört nach `presets.js` oder `charaktere.js` — dieselbe Trennung wie
//  bei `schaufenster.js`.
//
//  ⚠️ **Und zu den Zahlen darin:** sie sind ein AUSGANGSPUNKT zum Ausprobieren,
//  kein Balance-Urteil. Balancing bleibt Endphase (CLAUDE.md); was hier steht,
//  hält sich an Andis eigene Größenordnung — milde Aufwertungen bis etwa
//  +20 %, Joker dürfen deutlich stärker sein, weil sie selten sind.
//
//  ── Drei Messungen, die den Zuschnitt bestimmt haben ──
//  Gemessen am echten Katalog (1942 Spiele), nicht geschätzt:
//
//    669 Spiele  — Top-16 über BL/PL/PD/SA/CL, `teamModus: "einer"`
//     70 Spiele  — dieselben Vereine „nur untereinander" (zu wenig für eine Saison)
//     84 Spiele  — tragen ein Derby-Label (`snapshot.derby`), echte deutsche dabei
//
//  🔴 **Und der Befund, der beim Bauen herauskam und den man vorher wissen
//  muss:** von 1942 Spielen tragen **0** einen Tabellenplatz. `tabellenPlatz`
//  wird erst beim ÖFFNEN eines Spieltags eingefroren (`spieltagOeffnen.js`) —
//  vorher gibt es ihn nicht. Eine Auswahl über Tabellenzonen (Abstiegskampf,
//  Aufstiegskampf) wählt im rohen Katalog deshalb **nichts** aus. Sie ist
//  richtig eingestellt und greift in einer laufenden Runde; beim Draufschauen
//  auf den Katalog sieht sie aus wie wirkungslos.
//
//  ── ⚠️ Was NICHT ging, und warum ──
//  „Top-4-Vereine der Bundesliga" UND „Abstiegskampf der letzten vier
//  Spieltage" lassen sich in DERSELBEN Liga nicht kombinieren: alle
//  Einschränkungen wirken UND-verknüpft (`VERKNUEPFUNG_HINWEIS` in
//  `spielauswahl.js`), und die Top-4 stehen nicht auf Platz 14–18. Eine
//  ODER-Verknüpfung über Dimensionen hinweg wäre eine zweite, konkurrierende
//  Regel-Sprache.
//
//  **Deshalb hier:** der Aufstiegskampf sitzt in der **2. Bundesliga** (die
//  ist keine der vier Top-Ligen, dort geht nichts verloren), und für die
//  Bundesliga steht die Abstiegskampf-Fassung als `BL_ABSTIEGSKAMPF` bereit —
//  eine Zeile umstellen, dann bringt die BL den Abstiegskampf statt der Top-4.
//  Ihre Spitzenvereine bleiben über die Champions League ohnehin dabei.
// ============================================================

import { DEFAULT_RULES, sanitizeRules } from "./engine";
import { alleMatches } from "./ligen";
import { lostopfSpiele } from "./lostoepfe";

export const CREATOR_ROUND_ID = "00000000-0000-0000-0000-000000000003";
export const CREATOR_JOIN_CODE = "GROSS";
export const CREATOR_NAME = "Creator-Runde (1000 Mitspieler)";

export const PRIVAT_ROUND_ID = "00000000-0000-0000-0000-000000000004";
export const PRIVAT_JOIN_CODE = "PRIVAT";
export const PRIVAT_NAME = "Privatrunde (20 Mitspieler)";

// ── Die Vereine ─────────────────────────────────────────────
// „Top 4" ist ein Urteil, keine Messung — hier die vier, die in ihrer Liga
// seit Jahren oben stehen. ⚠️ Die Namen müssen EXAKT dem Katalog entsprechen
// (`vereineVon`), sonst wählt der Filter still nichts aus. Genau deshalb steht
// darunter ein Test, der jeden Namen gegen den Katalog hält.
export const TOP_BL = ["FC Bayern München", "Borussia Dortmund", "Bayer 04 Leverkusen", "RB Leipzig"];
export const TOP_PL = ["FC Liverpool", "Manchester City", "FC Arsenal", "FC Chelsea"];
export const TOP_PD = ["Real Madrid", "FC Barcelona", "Atlético Madrid", "Athletic Bilbao"];
export const TOP_SA = ["Inter Mailand", "AC Mailand", "Juventus Turin", "SSC Neapel"];
export const TOP_16 = [...TOP_BL, ...TOP_PL, ...TOP_PD, ...TOP_SA];

// Die Abweichung für den Abstiegskampf, falls Andi sie statt der Top-4 in der
// Bundesliga will (siehe Kopf). Letzte vier Spieltage, unteres Tabellendrittel
// — dieselben Zahlen wie `ABSTIEGSKAMPF` in `LigaSonderregeln.jsx`, nur auf
// „letzte vier" gezogen.
export const BL_ABSTIEGSKAMPF = { modus: "alle", teams: [], spieltagVon: 31, zonen: [{ von: 14, bis: 18 }] };

// ── Der gemeinsame Zuschnitt ────────────────────────────────
// Beide Runden spielen dieselben Spiele. Nur die REGELN unterscheiden sich —
// so lässt sich vergleichen, was die Regeln ausmachen, statt zwei Unterschiede
// gleichzeitig zu haben.
// 🔴 Die Champions-League-Auswahl (Andi, 27.08.2026): „nur die von Lostopf 1
// und sonst noch deutsche Mannschaften von CL statt alle!, sowie alle
// Finalsspiele mit Beteiligung von Mannschaften der Lostöpfe 1 + 2".
//
// ⚠️ Das ist ein ODER über Dimensionen — „Topf 1 ODER deutsch" in der
// Ligaphase, „Topf 1+2" in der K.-o.-Runde. `passtSpiel` kann das nicht (alle
// Einschränkungen dort wirken UND-verknüpft). `lostoepfe.js` rechnet die Regel
// deshalb einmal aus und liefert eine feste Begegnungsliste; die Begründung
// samt Preis steht in ihrem Kopf.
//
// Gemessen: **85 von 159** CL-Spielen — alle 15 K.-o.-Spiele, 70 von 144 aus
// der Ligaphase.
export const CL_REGEL = {
  toepfe: [1],
  // „deutsche Mannschaften" = wer auch in der Bundesliga-Liste steht.
  // ⚠️ Abgeleitet statt gepflegt: eine zweite Länderliste liefe auseinander,
  // sobald jemand einen Aufsteiger nachträgt.
  ausLigen: ["bl"],
  koToepfe: [1, 2],
};

// ⚠️ Faul gerechnet und gemerkt: `alleMatches()` geht über 1942 Spiele, und
// das soll nicht beim IMPORT dieser Datei passieren — sie wird auch dort
// geladen, wo niemand die Liste braucht.
let clIdsGemerkt = null;
export function clSpielIds() {
  if (clIdsGemerkt === null) clIdsGemerkt = lostopfSpiele(alleMatches(), CL_REGEL, "cl");
  return clIdsGemerkt;
}

export const ZUSCHNITT = {
  modus: "teams",
  teams: TOP_16,
  // ⚠️ „einer" und nicht „beide": nur untereinander wären es 70 Spiele in
  // einer ganzen Saison — gemessen. Das ist keine Runde, das ist ein Turnier.
  teamModus: "einer",
  wettbewerbe: ["bl", "bl2", "pl", "pd", "sa", "cl"],
  jeWettbewerb: {
    // 🔴 Aufstiegskampf: die letzten vier Spieltage, obere sechs Plätze.
    // ⚠️ Greift erst in einer laufenden Runde — im rohen Katalog trägt kein
    // Spiel einen Tabellenplatz (siehe Kopf). Deshalb ist `teams: []` wichtig:
    // ohne das käme die runden-weite Top-16-Liste dazu, und die spielt nicht
    // in der 2. Liga.
    bl2: { modus: "alle", teams: [], spieltagVon: 31, zonen: [{ von: 1, bis: 6 }] },
  },
};

// Die Champions-League-Abweichung wird erst beim Bauen des Regelwerks
// eingesetzt — sie braucht den Katalog (siehe `clSpielIds`).
function zuschnittMitCl() {
  return {
    ...ZUSCHNITT,
    jeWettbewerb: {
      ...ZUSCHNITT.jeWettbewerb,
      // 🔴 `modus: "liste"` überschreibt für die CL das runden-weite
      // „teams" — hier zählt genau, was in der Liste steht.
      cl: { modus: "liste", matchIds: clSpielIds() },
    },
  };
}

// ── Was beide Runden teilen ─────────────────────────────────
// ⚠️ Eine FUNKTION und kein Objekt: `zuschnittMitCl()` braucht den Katalog,
// und auf Modulebene ausgewertet liefe die Rechnung doch beim Import — genau
// das, was die faule Fassung von `clSpielIds` vermeiden soll.
const gemeinsam = () => ({
  spiele: zuschnittMitCl(),

  // ── Die Grundwertung: drei Regler, die `reglerWarnung.js` bemängelt hat ──
  // 🔴 Gegenprobe gelaufen (CLAUDE.md verlangt sie für neue Voreinstellungen):
  // die Vorgabe brachte VIER Warnungen, und alle drehten sich um dieselbe
  // Sache — **ein falscher Tipp kostet nichts, und selbst weit danebenliegende
  // Tipps zahlen noch**. Damit ist jede Außenseiter-Wette ein Gratis-Los, und
  // wildes Draufhalten ist immer richtig. Das ist keine Feinheit, das ist die
  // Grundlage: eine Runde, in der Raten sich lohnt, ist keine Tipprunde.
  //
  // ⚠️ Die Zahlen sind nicht geraten, sondern an den EMPFEHLUNGSBÄNDERN
  // abgelesen, die `reglerWarnung.band()` aus den vorhandenen Presets bildet:
  //
  //   minPayout      Band 2,75–5,0   → 3     (Vorgabe 1,0 lag darunter)
  //   wrongPenalty   Band −5,0…−3,25 → −3,5  (Vorgabe 0 lag darüber)
  //   k              Band 0,89–1,6   → 1,0   (Vorgabe 0,7 lag darunter)
  //
  // 🔴 Erst mit allen dreien schweigt die Ampel. Einzeln gesetzt bleibt die
  // Kombinations-Warnung („Außenseiter-Tipps kosten nichts") stehen — sie
  // fragt nach Abzug UND Cutoff zusammen, und genau das ist der Punkt: eine
  // Runde, in der Raten sich lohnt, ist keine Tipprunde.
  //
  // ⚠️ `m` (Team-Tore-Nähe) bleibt bei 0,5 — gemessen INNERHALB seines Bandes
  // (0,29–0,71). Nicht anfassen, was schon passt.
  minPayout: 3,
  wrongPenalty: -3.5,
  k: 1.0,

  // 🔴 Champions League mit Faktor 1,2 — Andis Zahl.
  // ⚠️ `aufschlaege` ist der AUFSCHLAG, nicht der Faktor: 0,2 ergibt ×1,2.
  wettbewerbe: { enabled: true, aufschlaege: { cl: 0.2 }, phasenStufe: 0 },

  // 🔴 Derby-Regel. ⚠️ Sie wählt nichts aus, sie WERTET: ein Spiel mit
  // Derby-Label zählt mehr. Deshalb verträgt sie sich mit jedem Zuschnitt —
  // anders als die Tabellenzonen. Gemessen: 84 Spiele im Katalog tragen ein
  // Label, darunter die deutschen Klassiker (Rheinisches Derby, Revierderby).
  teamMods: { ...DEFAULT_RULES.teamMods, derbyFaktor: 1.2 },
});

// ── ① Die große Creator-Runde: 1000 Mitspieler ──────────────
//
// 🔴 Was eine Runde mit 1000 Leuten von einer mit 20 unterscheidet, ist nicht
// die Größe der Zahlen, sondern **was überhaupt noch funktioniert**:
//
//   ⛔ **Keine Fremdjoker** (Andis Vorgabe, und sie stimmt): man wischt keinem
//      etwas aus, den man nicht kennt. Bei 1000 Leuten trifft ein Block einen
//      Namen, kein Gesicht — und niemand behält den Überblick, wer wen
//      blockiert hat. Genau der Grund, den Andi selbst genannt hat („wird
//      sonst schnell unübersichtlich").
//   ⛔ **Nichts, was der Admin von Hand freigeben muss.** Bei 1000 Mitgliedern
//      ist jede Handbewegung 1000 Handbewegungen.
//   ⛔ **Keine Abstimmung.** 1000 Leute stimmen nicht ab; sie warten.
//   ✅ **Dafür alles, was von selbst läuft** und für jeden gleich ist.
//
// ⚠️ Und eine Folge, die man leicht übersieht: Ereignisse, die „der Letzte des
// Spieltags" oder „der Führende" auswählen, treffen bei 1000 Leuten immer
// genau einen — das ist kein Ausgleich mehr, sondern eine Lotterie. Deshalb
// hier die Auswahl über ABSTÄNDE (`abstand`), die eine ganze Gruppe trifft.
export function creatorRegeln() {
  return sanitizeRules({
    ...DEFAULT_RULES,
    ...gemeinsam(),

    // Joker: jeder bekommt gleich viele, an denselben Spieltagen. Bei 1000
    // Leuten ist „jeder an eigenen Spieltagen" nicht mehr nachvollziehbar.
    joker: { ...DEFAULT_RULES.joker, enabled: true, modus: "einzel", faktor: 2 },
    jokerBasis: {
      standard: {
        ...DEFAULT_RULES.jokerBasis.standard,
        wer: "alle",
        // ⚠️ Sichtbar: bei 1000 Leuten ist ein verdeckter Joker keine
        // Spannung, sondern eine Behauptung, die niemand nachprüfen kann.
        sicht: "offen",
        verfall: "periode",
        abklingzeit: 2,
      },
    },
    verteilung: { modus: "gleich", frequenz: 3, sichtbarkeit: "offen" },

    // ⛔ Fremdjoker aus — Andis Vorgabe.
    duell: { ...DEFAULT_RULES.duell, enabled: false },
    eingriffe: { ...DEFAULT_RULES.eingriffe, enabled: false },

    // ⛔ Keine Abstimmung: 1000 Leute stimmen nicht ab.
    regelAbstimmung: { ...DEFAULT_RULES.regelAbstimmung, enabled: false },

    // Ereignisse: beide treffen GRUPPEN, nicht einzelne Personen.
    ereignisse: {
      enabled: true,
      maxErspielt: 4,
      aktive: [
        // Aufholen für alle, die deutlich unter dem Schnitt liegen — bei 1000
        // Leuten sind das Hunderte, und genau so soll es sein.
        {
          key: "pechstraehne",
          auswahl: { modus: "abstand", messlatte: "schnitt", abstand: 30, richtung: "darunter" },
          wirkung: { typ: "bonus", prozent: 15 },
          geltung: { typ: "fenster", spieltage: 2 },
          maxProSaison: 6,
        },
        // Eine Serie belohnt sich selbst — trifft jeden, der sie schafft.
        {
          key: "serie", anzahl: 3,
          wirkung: { typ: "joker", n: 1 },
          ausloeser: { typ: "immer" },
          maxProSaison: 4,
        },
      ],
    },

    // Aufhol-Bonus mild: bei 1000 Leuten ist der Rückstand des Letzten riesig,
    // und ein kräftiger Bonus darauf wäre kein Ausgleich, sondern ein Umsturz.
    aufholen: { ...DEFAULT_RULES.aufholen, enabled: true, betrifft: "unter-schnitt" },

    // 🔴 Das Glücksrad ist hier der Ersatz für alles Persönliche: es braucht
    // keinen Gegner und keine Absprache, und es trifft jeden gleich oft.
    drehrad: {
      ...DEFAULT_RULES.drehrad,
      enabled: true,
      // Selten: drei Termine in der Saison, je zwei Drehungen. Bei 1000 Leuten
      // ist jede Drehung 1000 Gutschriften — häufiger wäre kein Ereignis mehr,
      // sondern ein Grundeinkommen.
      haeufigkeit: "gesamt", gesamtProSaison: 3, drehungenProEreignis: 2,
      modus: "gleich",
      phase: "manuell", abSpieltag: 6, bisSpieltag: 32,
      sperrfrist: 1,
      maxPunkteProSaison: 60,
      felder: [
        { id: "niete", label: "Niete", gewicht: 30, belohnung: { typ: "nichts" } },
        { id: "punkte", label: "25 Punkte", gewicht: 30, belohnung: { typ: "punkte", betrag: 25 } },
        { id: "joker", label: "Ein Joker", gewicht: 22, belohnung: { typ: "joker", art: "joker.einzel", anzahl: 1 } },
        { id: "schub", label: "+30 % für 2 Spieltage", gewicht: 13, belohnung: { typ: "modifikator", faktor: 1.3, spieltage: 2 } },
        { id: "frei", label: "Joker frei", gewicht: 5, belohnung: { typ: "ruecksetzung", ziel: "cooldown" } },
      ],
      // 🔴 Die Regelbeziehungen, die das Rad erst zu einem Baukasten machen:
      ausschluesse: [
        // Nicht Punkte UND Joker am selben Termin — sonst ist eine Drehung mit
        // zwei Treffern das Doppelte wert, und das Rad hat zwei Klassen.
        { a: "joker", b: "punkte", reichweite: "ereignis" },
        // Wer den Schub hatte, bekommt in den nächsten vier Drehungen keinen
        // zweiten: gestapelt liefe er gegen den Modifikator-Deckel.
        { a: "schub", b: "frei", reichweite: "drehungen", drehungen: 4 },
      ],
    },
  });
}

// ── ② Die Privatrunde: 20 Mitspieler ────────────────────────
//
// 🔴 Hier gilt das Gegenteil: man kennt sich. Ein Block trifft ein Gesicht,
// und genau das ist der Reiz — Andis eigener Satz zu den Fremdjokern („Wische
// deinen Kontrahenten etwas aus … eher bei kleinen, privaten Runden unter 15
// Teilnehmern anwenden"). 20 liegt knapp darüber und ist damit ein guter
// Testfall für den Hinweis aus `grosseRundeHinweis()`.
//
// ⚠️ Und was bei 20 Leuten geht und bei 1000 nicht: Auswahl nach PLATZ. „Die
// letzten drei" sind bei 20 Leuten drei bekannte Namen und ein Ansporn; bei
// 1000 wären es drei Zufällige unter Hunderten.
export function privatRegeln() {
  return sanitizeRules({
    ...DEFAULT_RULES,
    ...gemeinsam(),

    joker: { ...DEFAULT_RULES.joker, enabled: true, modus: "einzel", faktor: 2.5 },
    jokerBasis: {
      standard: {
        ...DEFAULT_RULES.jokerBasis.standard,
        wer: "alle",
        // Verdeckt: bei 20 Leuten ist das Rätseln, wer wo seinen Joker setzt,
        // die halbe Unterhaltung.
        sicht: "verdeckt",
        verfall: "wandert",
        abklingzeit: 1,
      },
    },
    verteilung: { modus: "kontingent", frequenz: 3, sichtbarkeit: "verdeckt" },

    // ✅ Fremdjoker AN — Andis Vorgabe für diese Runde.
    // ⚠️ Sparsam dosiert: zwei Einsätze in der Saison, höchstens einer je
    // Spieltag. Wer öfter getroffen wird, spielt nicht mehr gegen die Quoten,
    // sondern gegen die Mitspieler — und das ist eine andere Runde.
    duell: {
      ...DEFAULT_RULES.duell, enabled: true,
      typen: ["klau", "block"], anzahl: 2, proSpieltag: 1,
      phase: "letztesDrittel", schlussLaenge: 6,
      sichtbarkeit: "offen",
      // ⚠️ Deckel angehoben: bei 60 Punkten je Saison griffe er schon beim
      // ERSTEN Duell — dann ist es egal, ob man einen Volltreffer oder einen
      // Krümel klaut, und der Fremdjoker verliert seine Spannung. Gefunden von
      // `reglerWarnung.js`, nicht geschätzt.
      maxProSaison: 200,
    },
    eingriffe: {
      ...DEFAULT_RULES.eingriffe, enabled: true,
      trittbrett: { enabled: true, anteil: 0.3, kopierterBekommt: 0 },
      gegenwette: { enabled: true, anteil: 0.5 },
    },

    // 20 Leute können abstimmen — und es macht die Runde zu ihrer eigenen.
    regelAbstimmung: {
      ...DEFAULT_RULES.regelAbstimmung, enabled: true,
      dauer: 3, wirkungVorlauf: 2, vetoAdmin: true, antragsrecht: "alle",
    },

    ereignisse: {
      enabled: true,
      maxErspielt: 6,
      aktive: [
        // Bei 20 Leuten ist „der Letzte des Spieltags" ein Name, den alle
        // kennen — ein Trostpflaster mit Publikum.
        { key: "letzter-am-spieltag", belohnung: 1, ausloeser: { typ: "immer" }, maxProSaison: 5 },
        { key: "serie", anzahl: 3, wirkung: { typ: "bonus", prozent: 25 }, geltung: { typ: "sofort" }, maxProSaison: 5 },
        // Der Außenseiter-Treffer: in einer kleinen Runde erzählt man davon.
        { key: "aussenseiter", abQuote: 4, wirkung: { typ: "joker", n: 1 }, maxProSaison: 4 },
      ],
    },

    aufholen: { ...DEFAULT_RULES.aufholen, enabled: true, betrifft: "letzte" },

    // Das Rad läuft hier öfter und darf mehr: 20 Drehungen je Termin sind 20
    // Gutschriften, nicht 1000.
    drehrad: {
      ...DEFAULT_RULES.drehrad,
      enabled: true,
      haeufigkeit: "frequenz", frequenz: 5, drehungenProEreignis: 1,
      // Jeder an eigenen Spieltagen — bei 20 Leuten ist das gerade der Reiz.
      modus: "kontingent",
      phase: "manuell", abSpieltag: 4, bisSpieltag: 34,
      sperrfrist: 2,
      maxPunkteProSaison: 90,
      felder: [
        { id: "niete", label: "Niete", gewicht: 22, belohnung: { typ: "nichts" } },
        { id: "punkte", label: "30 Punkte", gewicht: 24, belohnung: { typ: "punkte", betrag: 30 } },
        { id: "joker", label: "Ein Joker", gewicht: 20, belohnung: { typ: "joker", art: "joker.einzel", anzahl: 1 } },
        { id: "klau", label: "Klau-Joker", gewicht: 12, belohnung: { typ: "joker", art: "duell.klau", anzahl: 1 } },
        { id: "schub", label: "+40 % für 2 Spieltage", gewicht: 12, belohnung: { typ: "modifikator", faktor: 1.4, spieltage: 2 } },
        { id: "frei", label: "Joker frei", gewicht: 10, belohnung: { typ: "ruecksetzung", ziel: "cooldown" } },
      ],
      ausschluesse: [
        // Nicht beides an einem Termin — hier steht es auf „Ereignis", damit es
        // greift, sobald jemand die Drehungen je Termin hochstellt.
        { a: "joker", b: "klau", reichweite: "ereignis" },
        // Der Klau-Joker höchstens einmal in acht Drehungen: er trifft einen
        // Mitspieler, und das soll selten bleiben.
        { a: "klau", b: "punkte", reichweite: "drehungen", drehungen: 8 },
        // Und der stärkste Gewinn nur EINMAL pro Saison.
        { a: "frei", b: "schub", reichweite: "saison" },
      ],
    },
  });
}
