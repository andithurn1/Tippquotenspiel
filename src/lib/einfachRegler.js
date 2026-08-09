// ============================================================
//  STUFE 2 „ANPASSEN" — wenige große Regler statt vieler kleiner
//
//  Die Profi-Ebene hat ~20 Regler. Die meisten Admins wollen aber nur vier
//  Fragen beantworten: Wie mutig? Wie wichtig sind Torschützen? Gibt es
//  Joker? Läuft nebenbei eine Saison-Wette?
//
//  Jeder Regler hier hat 2–3 STUFEN, die ein Bündel echter Regelwerte setzen.
//  Das ist der Unterschied zu einem einzelnen Schieberegler: `k` allein
//  verstellen ergibt ein Regelwerk, das niemand vermessen hat — die Stufen
//  verschieben zusammengehörige Werte gemeinsam (dieselbe Idee wie die
//  ASPEKTE beim Preset-Mischen).
//
//  Dazu `beispiele()`: statt „k = 0,45" steht dort, was ein konkreter Tipp
//  tatsächlich bringt. Zahlen kommen aus der Engine, nicht aus Schätzungen.
//
//  Reine Funktionen, UI-frei.
// ============================================================

import { scoreTip, sanitizeRules, DEFAULT_RULES } from "./engine";
import { createMockOddsSource } from "./engine";
import { SAISON_PRESETS } from "./saisonwetten";
import { PRESETS } from "./presets";
import { EREIGNIS_PRESETS } from "./ereignisse";
import { DEFAULT_DUELL } from "./duellJoker";
import { DEFAULT_DREHRAD } from "./drehrad";

const saisonVon = (key) =>
  SAISON_PRESETS.find((p) => p.key === key)?.saison ?? { enabled: false, gewicht: 1, wetten: [] };
const ereignisseVon = (key) =>
  EREIGNIS_PRESETS.find((p) => p.key === key)?.ereignisse ?? { enabled: false, maxErspielt: 5, aktive: [] };
// Ein ausgeschaltetes Rad — nicht `{ enabled: false }` allein, sondern die
// ganze Vorgabe: `erkenneStufe` vergleicht das FELD, und ein halb gesetztes
// Rad wäre danach eine „eigene Mischung", die keine Stufe mehr trifft.
const LEERES_RAD = { ...DEFAULT_DREHRAD };

// ⚠️ Die Naehe-Werte werden NICHT erfunden, sondern aus den bereits
// vermessenen Presets uebernommen. Ein selbst gewaehltes `k` ergibt schnell
// ein Regelwerk, das niemand geprueft hat — ein erster Entwurf hier benutzte
// die DEFAULT_RULES-Werte (k 0,7 / minPayout 1) und liess im Simulator sofort
// den Zocker mit 97 % gewinnen. Die Presets tragen die ausbalancierten Werte
// (Standard: k 1,3 / minPayout 3,5), also kommen sie von dort.
const presetVon = (key) => PRESETS.find((p) => p.key === key)?.rules ?? PRESETS[0].rules;
const naeheFelder = (key) => {
  const r = presetVon(key);
  return {
    k: r.k, m: r.m, minPayout: r.minPayout, wrongPenalty: r.wrongPenalty,
    underdogBoost: r.underdogBoost,
    underdogRampStart: r.underdogRampStart,
    underdogRampEnd: r.underdogRampEnd,
  };
};

// ── Die vier Fragen ─────────────────────────────────────────
export const REGLER = [
  {
    key: "mut",
    label: "Wie mutig soll es sein?",
    hint: "Wie viel ein knapper Tipp noch bringt — und wie stark Außenseiter-Siege zahlen.",
    stufen: [
      {
        key: "zahm", label: "Zahm",
        beschreibung: "Fast nur der exakte Treffer zählt. Ruhig, streng, berechenbar.",
        werte: naeheFelder("hardcore"),
      },
      {
        key: "normal", label: "Ausgewogen",
        beschreibung: "Nähe wird belohnt, Überraschungen zahlen über die Quote.",
        werte: naeheFelder("standard"),
      },
      {
        key: "wild", label: "Wild",
        beschreibung: "Außenseiter-Siege bringen zusätzlich Aufschlag — große Ausschläge.",
        werte: naeheFelder("underdog-party"),
      },
    ],
  },
  {
    key: "tore",
    label: "Wie wichtig sind Torschützen?",
    hint: "Ob und wie stark richtig getippte Torschützen ins Gewicht fallen.",
    stufen: [
      {
        key: "aus", label: "Gar nicht",
        beschreibung: "Nur das Ergebnis zählt. Am schnellsten getippt.",
        werte: { markets: { result: true, goals: { enabled: false, picksPerTeam: 2, allowDouble: true, allowBackups: true } } },
      },
      {
        key: "normal", label: "Dabei",
        beschreibung: "Zwei Schützen pro Team, Kombi verstärkt sie bei richtiger Tendenz.",
        werte: {
          markets: { result: true, goals: { enabled: true, picksPerTeam: 2, allowDouble: true, allowBackups: true } },
          combo: { tendenz: 1.15, abstand: 1.5, exakt: 2.3 },
        },
      },
      {
        key: "stark", label: "Entscheidend",
        beschreibung: "Torschützen sind die halbe Miete — wer sie trifft, zieht davon.",
        werte: {
          markets: { result: true, goals: { enabled: true, picksPerTeam: 3, allowDouble: true, allowBackups: true } },
          combo: { tendenz: 1.3, abstand: 1.8, exakt: 2.8 },
        },
      },
    ],
  },
  {
    // 🔴 Der Wettmodus (`joker.modus: "einsatz"`) war bis hierher NUR in der
    // Profi-Ansicht erreichbar — kein Charakter und keine Stufe-2-Stufe hat ihn
    // je gesetzt. Nach dem Baukasten-Grundsatz („eine Einstellung, die nur in
    // Stufe 3 existiert, ist nicht fertig") gehört er hierher, und zwar unter
    // dieselbe Klartext-Frage: es ist dieselbe Frage — zählt jedes Spiel gleich
    // viel, und wenn nicht, wer entscheidet das? Deshalb kein eigener Regler,
    // sondern zwei weitere Stufen an diesem.
    key: "joker",
    label: "Zählt jedes Spiel gleich viel?",
    hint: "Ob ihr einzelne Spiele hervorheben könnt — vom einen Joker bis zum eigenen Münz-Einsatz.",
    stufen: [
      {
        key: "aus", label: "Kein Joker",
        beschreibung: "Alle Spiele zählen gleich. Am einfachsten zu verstehen.",
        werte: { joker: { enabled: false } },
      },
      {
        key: "mild", label: "Ein Joker",
        beschreibung: "Ein Spiel pro Spieltag zählt anderthalbfach.",
        werte: { joker: { enabled: true, modus: "einzel", faktor: 1.5, abstimmung: false } },
      },
      {
        key: "ranking", label: "Gewichte verteilen",
        beschreibung: "Du verteilst Gewichte über den Spieltag — jeder Wert nur einmal.",
        werte: { joker: { enabled: true, modus: "ranking", faktoren: [2, 1.5, 1.2, 1], abstimmung: false } },
      },
      {
        // Der Wettmodus mit dem empfohlenen Takt: jeden Spieltag frische
        // Münzen (design/wettmodus.md 1 — Münzen sind ein Spieltags-Werkzeug,
        // kein Vermögen). Der Takt wird hier bewusst MITGESETZT und nicht
        // gezeigt: „nach oben verdeckt", wer ihn anders will, findet ihn in
        // der Profi-Ansicht oder nimmt die Stufe darunter.
        key: "wetten", label: "Münzen setzen",
        beschreibung: "Jeden Spieltag 100 Münzen, die du frei auf die Spiele verteilst — höchstens 40 auf eines. Gewonnen werden Punkte, nie neue Münzen.",
        werte: {
          joker: {
            enabled: true, modus: "einsatz", abstimmung: false,
            einsatzProSpieltag: 100, maxAnteilProSpiel: 0.4, minAnteilProSpiel: 0,
            skippenErlaubt: true, einsatzTakt: "spieltag",
          },
        },
      },
      {
        // Dieselbe Ebene, anderer Takt — damit der Münz-Takt auch in Stufe 2
        // als KLARTEXT-Wahl vorkommt und nicht nur als Profi-Regler.
        key: "wetten-vorrat", label: "Münzen auf Vorrat",
        beschreibung: "Alle vier Spieltage 100 Münzen. Sie müssen für vier Spieltage reichen — wer früh alles setzt, tippt den Rest ohne Einsatz.",
        werte: {
          joker: {
            enabled: true, modus: "einsatz", abstimmung: false,
            einsatzProSpieltag: 100, maxAnteilProSpiel: 0.4, minAnteilProSpiel: 0,
            skippenErlaubt: true, einsatzTakt: "alleNSpieltage", einsatzTaktN: 4,
          },
        },
      },
    ],
  },
  {
    // Stufe 2 fürs Big Game. In der Profi-Ansicht sind das ZWEI Zahlenregler
    // (Aufschlag und Schwelle), und die Schwelle ist die unintuitivere von
    // beiden — sie entscheidet, wie OFT es überhaupt ein Topspiel gibt. Hier
    // wandern beide gemeinsam, damit keine unvermessene Kombination entsteht.
    // Die Stufen folgen dem Balance-Durchgang (`npm run balance`): über die
    // ganze Spanne bleibt der Kenner vorn, aber eine Schwelle von 0 macht aus
    // der Auszeichnung eine Dauer-Zugabe. Deshalb geht die stärkste Stufe hier
    // NICHT auf 0 — die Freiheit dazu bleibt der Profi-Ansicht.
    key: "topspiel",
    label: "Zählen manche Spiele mehr als andere?",
    hint: "Das jeweils brisanteste Spiel und die Traditionsduelle — wer es ist, steht vor dem Tippen fest.",
    // 🔴 `teamMods` (Derby) gehört unter DIESE Frage und nicht unter eine
    // eigene: „Spiel des Spieltags" und „Derby" sind für einen Spieler
    // dasselbe Thema, und beide zahlen in DENSELBEN additiven Topf
    // (`teamModFactor`). Getrennt gestellt könnte ein Admin beide
    // hochdrehen und wüsste nicht, dass sie sich addieren.
    stufen: [
      {
        key: "aus", label: "Nein",
        beschreibung: "Alle Spiele sind gleich viel wert.",
        werte: {
          bigGame: { enabled: false },
          teamMods: { derbyFaktor: 1, teams: {} },
        },
      },
      {
        key: "derby", label: "Nur die Traditionsduelle",
        beschreibung: "Derbys zählen ein Viertel mehr. Welche das sind, steht fest — es hängt nicht an der Tabelle.",
        // Ohne Big Game: ein Derby steht VORHER fest, das Topspiel entsteht
        // erst aus dem Tabellenstand. Wer nur das Berechenbare will, nimmt das.
        werte: {
          bigGame: { enabled: false },
          teamMods: { derbyFaktor: 1.25, teams: {} },
        },
      },
      {
        key: "selten", label: "Nur die echten Kracher",
        beschreibung: "Ein paar Mal pro Saison ein Topspiel — dafür fällt es dann auf. Derbys zählen leicht mehr.",
        werte: {
          bigGame: { enabled: true, aufschlag: 0.5, minSpannung: 0.5 },
          teamMods: { derbyFaktor: 1.25, teams: {} },
        },
      },
      {
        key: "normal", label: "Fast jeden Spieltag",
        beschreibung: "Meistens gibt es ein Topspiel, das anderthalbfach zählt — Derbys ein Viertel mehr.",
        // ⚠️ GEMESSEN, nicht geschätzt: bei `derbyFaktor: 1,5` meldet
        // `reglerWarnung.js` „Derbys zählen so viel mehr, dass die übrigen
        // Spiele nebensächlich werden" — 1,25 ist der höchste Wert, der im
        // Empfehlungsband bleibt. Beide Aufschläge landen ADDITIV in einem
        // Topf und werden von `modCap` gedeckelt.
        werte: {
          bigGame: { enabled: true, aufschlag: 0.5, minSpannung: 0.35 },
          teamMods: { derbyFaktor: 1.25, teams: {} },
        },
      },
    ],
  },
  {
    // Stufe 2 für die Mitbestimmung (`design/abstimmung-verfassung.md`). Die
    // Profi-Ebene hat dort ein ganzes Gehäuse — Verfassung, Quorum, Mehrheit,
    // Fristen. Die Frage, die ein Spieler wirklich stellt, ist aber eine
    // einzige, und die steht hier. Die drei Stufen setzen jeweils ein ganzes
    // stimmiges Bündel, keinen Einzelwert.
    // ⚠️ Keine Stufe setzt `sperrfrist: 0` — ohne Sperrfrist wird derselbe
    // Antrag zur Dauerschleife (siehe `konflikte` in regelAbstimmung.js).
    key: "mitbestimmung",
    label: "Wer darf die Regeln ändern?",
    hint: "Ob die Runde gemeinsam über Regeländerungen entscheidet — und wie hoch die Hürde dafür liegt.",
    stufen: [
      {
        key: "admin", label: "Der Admin",
        beschreibung: "Die Regeln stehen fest, wie sie angelegt wurden. Am einfachsten — und niemand muss sich um Anträge kümmern.",
        werte: {
          regelAbstimmung: { enabled: false },
          verfassung: { enabled: false },
        },
      },
      {
        key: "runde", label: "Die Runde stimmt ab",
        beschreibung: "Jeder darf eine Änderung vorschlagen, die einfache Mehrheit entscheidet — mindestens die Hälfte muss sich beteiligen. Sie gilt ab dem nächsten Spieltag, nie rückwirkend.",
        werte: {
          regelAbstimmung: {
            enabled: true, wer: "alle", mehrheit: "einfach", quorum: 0.5,
            antragsrecht: "alle", sperrfrist: 4, wirkungAb: "naechsterSpieltag",
          },
          verfassung: { enabled: false },
        },
      },
      {
        key: "grosseMehrheit", label: "Nur mit großer Mehrheit",
        beschreibung: "Zwei Drittel müssen dafür sein, drei Viertel sich beteiligen — und die Wertung selbst bleibt unantastbar. Hier ändert sich selten etwas, dafür trägt es dann alle.",
        werte: {
          regelAbstimmung: {
            enabled: true, wer: "nurAktive", mehrheit: "zweidrittel", quorum: 0.75,
            antragsrecht: "alle", sperrfrist: 6, wirkungAb: "vorlauf", wirkungVorlauf: 2,
          },
          verfassung: { enabled: true, gesperrt: ["naehe", "kombi", "underdog"] },
        },
      },
    ],
  },
  {
    key: "saison",
    label: "Laufen Saison-Wetten nebenbei?",
    hint: "Langzeit-Tipps wie Meister oder Torschützenkönig, einmal vor der Saison.",
    stufen: [
      {
        key: "aus", label: "Nein",
        beschreibung: "Nur Spieltage, sonst nichts.",
        werte: { saison: { enabled: false, gewicht: 1, wetten: [] } },
      },
      {
        key: "wuerze", label: "Als Würze",
        beschreibung: "Zwei Wetten mit kleinem Gewicht — nett, aber nicht entscheidend.",
        werte: { saison: saisonVon("nebenbei") },
      },
      {
        key: "spuerbar", label: "Spürbar",
        beschreibung: "Drei Wetten in voller Gewichtung. Ein guter Saison-Tipp zählt.",
        werte: { saison: saisonVon("klassisch") },
      },
    ],
  },
  {
    // 🔴 Zweite Lücke desselben Durchgangs: `aufholen` und `saisonform` waren
    // beide nur in der Profi-Ansicht erreichbar — und das sind die zwei
    // Stellschrauben hinter dem Satz, der in die Oberfläche gehört: „der
    // Kenner gewinnt, aber niemand ist nach zehn Spieltagen raus."
    //
    // Sie gehören unter EINE Frage, weil ein Spieler sie auch als eine stellt.
    // Getrennt gäbe es zwei Regler, deren Zusammenspiel niemand überblickt —
    // und genau daran hängt hier die Balance: doppelter Ausgleich presst das
    // Feld zusammen, bis das Ranking beliebig wird.
    key: "dranbleiben",
    label: "Wie leicht bleibt man dran?",
    hint: "Ob ein schlechter Spieltag verziehen wird und ob Zurückliegende Anschluss bekommen.",
    stufen: [
      {
        key: "nein", label: "Gar nicht",
        beschreibung: "Jeder Spieltag zählt voll. Wer patzt, hat gepatzt.",
        werte: {
          aufholen: { enabled: false, staerke: 0.2, schwelle: 0.2, betrifft: "unteres-drittel" },
          saisonform: { kurve: "flach", staerke: 1.5, streich: 0, nurGetippte: true },
        },
      },
      {
        key: "ausrutscher", label: "Ein Ausrutscher wird verziehen",
        // Von den beiden Mitteln das einzige, das im Balance-Durchgang tut,
        // was es soll: 6 Streicher senken den Vorsprung von 3,66 auf 3,45 %
        // bei nur 1,5 Punkten weniger Können-Ausdruck (siehe saisonform.js).
        // Kein Aufhol-Bonus — der käme oben drauf.
        beschreibung: "Die zwei schlechtesten Spieltage werden gestrichen. Sonst ändert sich nichts.",
        werte: {
          aufholen: { enabled: false, staerke: 0.2, schwelle: 0.2, betrifft: "unteres-drittel" },
          saisonform: { kurve: "flach", staerke: 1.5, streich: 2, nurGetippte: true },
        },
      },
      {
        key: "anschluss", label: "Zurückliegende holen auf",
        beschreibung: "Wer weit hinten liegt, bekommt einen Anschluss-Bonus — und ein Streichresultat gibt es auch.",
        werte: {
          aufholen: { enabled: true, staerke: 0.10, schwelle: 0.30, betrifft: "unteres-drittel" },
          saisonform: { kurve: "flach", staerke: 1.5, streich: 1, nurGetippte: true },
        },
      },
      {
        key: "stark", label: "Niemand fällt raus",
        // ⚠️ Bewusst „mittel" und nicht „stark": ein zu starker Ausgleich
        // entwertet gutes Tippen — das `punkteVerhaeltnis` kippt Richtung 1,0,
        // und darunter wird das Ranking beliebig. Das Ziel ist ein KORRIDOR,
        // kein Extrem.
        beschreibung: "Kräftiger Anschluss-Bonus und drei Streichresultate. Bis zum Schluss offen.",
        werte: {
          aufholen: { enabled: true, staerke: 0.20, schwelle: 0.20, betrifft: "unteres-drittel" },
          saisonform: { kurve: "flach", staerke: 1.5, streich: 3, nurGetippte: true },
        },
      },
    ],
  },
  {
    // 🔴 Andis Stadt-Land-Fluss-Mechanik (09.08.2026). Die Frage steht in
    // KLARTEXT und nicht nach dem Feldnamen — ein Admin denkt nicht in
    // „Alleinstellung", sondern in „lohnt es sich, mutig anders zu tippen".
    //
    // ⚠️ Jede Stufe setzt `minTipper` MIT, nicht nur die Stärke. Ohne diese
    // Schutzregel ist in einer Runde zu zweit jeder Treffer ein Alleingang,
    // und der Bonus wäre die Normalzahlung statt der Ausnahme — eine
    // Einstellung, die genau dann kippt, wenn die Runde klein ist.
    key: "alleingang",
    label: "Lohnt sich ein Alleingang?",
    hint: "Ob es extra Punkte gibt, wenn man als Einziger richtig lag.",
    stufen: [
      {
        key: "nein", label: "Nein",
        beschreibung: "Ein einsamer Treffer zählt wie jeder andere.",
        werte: { alleinstellung: { enabled: false } },
      },
      {
        key: "klein", label: "Ein bisschen",
        beschreibung: "Wer als Einziger den Abstand trifft, bekommt die halbe Punktzahl obendrauf.",
        werte: {
          alleinstellung: {
            enabled: true, ebene: "abstand", modus: "alleine",
            art: "anteil", anteil: 0.5, maxZuschlag: 500, minTipper: 3,
          },
        },
      },
      {
        key: "deutlich", label: "Deutlich",
        beschreibung: "Als Einziger richtig heißt: die Punkte dieses Spiels noch einmal.",
        werte: {
          alleinstellung: {
            enabled: true, ebene: "abstand", modus: "alleine",
            art: "anteil", anteil: 1, maxZuschlag: 1000, minTipper: 3,
          },
        },
      },
      {
        key: "sladefluss", label: "Stadt-Land-Fluss",
        // Die großzügige Lesart: schon „unter den wenigen" reicht, und es
        // genügt der richtige Sieger. Dadurch kommt der Bonus oft genug vor,
        // dass er das Tippverhalten überhaupt beeinflusst — ein Bonus, den
        // niemand je bekommt, ändert nichts.
        beschreibung: "Schon wer zu den wenigen Richtigen gehört, bekommt kräftig dazu.",
        werte: {
          alleinstellung: {
            enabled: true, ebene: "tendenz", modus: "anteil", maxAnteil: 0.25,
            art: "anteil", anteil: 1.5, maxZuschlag: 1500, minTipper: 4,
          },
        },
      },
    ],
  },
  {
    // 🔴 Der Regler, den `rules.ereignisse` bis 06.08.2026 nicht hatte: die
    // ganze Ebene kam nur in der Profi-Ansicht vor. Die Frage ist bewusst in
    // KLARTEXT gestellt und nicht nach dem Feldnamen benannt — ein Regler in
    // Stufe 2 fasst mehrere Profi-Werte zusammen, und der Admin denkt nicht in
    // „Ereignissen", sondern in „was passiert bei uns so nebenbei".
    key: "nebenbei",
    label: "Wie viel soll nebenbei passieren?",
    hint: "Joker, die man sich verdient — durch Dranbleiben, Mut oder als Trost für einen schlechten Spieltag.",
    stufen: [
      {
        key: "nichts", label: "Nichts",
        beschreibung: "Joker gibt es nur vom Admin. Ruhig und übersichtlich.",
        werte: {
          ereignisse: ereignisseVon("aus"),
          // Ausdrücklich aus: sonst bliebe ein in der Profi-Ansicht
          // eingeschaltetes Rad beim Zurückschalten stehen, und die Stufe
          // hielte nicht, was ihre Beschreibung verspricht.
          drehrad: { ...LEERES_RAD },
        },
      },
      {
        key: "dranbleiben", label: "Dranbleiben lohnt sich",
        beschreibung: "Wer regelmäßig tippt, verdient sich Joker — unabhängig davon, wie gut.",
        werte: {
          ereignisse: ereignisseVon("dranbleiben"),
          // Ausdrücklich aus: sonst bliebe ein in der Profi-Ansicht
          // eingeschaltetes Rad beim Zurückschalten stehen, und die Stufe
          // hielte nicht, was ihre Beschreibung verspricht.
          drehrad: { ...LEERES_RAD },
        },
      },
      {
        key: "ausgleich", label: "Trost für den Letzten",
        beschreibung: "Wer einen Spieltag verpatzt, bekommt einen Joker zurück.",
        werte: {
          ereignisse: ereignisseVon("ausgleich"),
          // Ausdrücklich aus: sonst bliebe ein in der Profi-Ansicht
          // eingeschaltetes Rad beim Zurückschalten stehen, und die Stufe
          // hielte nicht, was ihre Beschreibung verspricht.
          drehrad: { ...LEERES_RAD },
        },
      },
      {
        key: "krone", label: "Der Beste bekommt etwas",
        // Die Gegenrichtung zu „Trost für den Letzten" — und derselbe
        // Ereignis-Eintrag, nur mit `ende: "oben"`. Ausdrücklich als eigene
        // Stufe, weil es das Gegenteil bewirkt: Auszeichnung statt Ausgleich.
        beschreibung: "Wer einen Spieltag gewinnt, bekommt einen Joker. Verstärkt gutes Tippen.",
        werte: {
          ereignisse: ereignisseVon("krone"),
          drehrad: { ...LEERES_RAD },
        },
      },
      {
        key: "viel", label: "Ständig etwas los",
        beschreibung: "Alle Ereignisse an — dazu ein Glücksrad, das ab und zu etwas ausschüttet.",
        // 🔴 Das Drehrad gehört unter DIESE Frage: der Baukasten kennt drei
        // Auslöser für eine Belohnung — ein ZEITPUNKT (`jokerPlan`), eine
        // LEISTUNG (`ereignisse`) und reiner ZUFALL (das Rad). Alle drei
        // beantworten „wie viel passiert bei uns nebenbei", und nur der
        // Zufall hat bisher gefehlt.
        //
        // ⚠️ Bewusst mit `maxPunkteProSaison` und nur zwei Feldern, davon
        // eines „nichts": ohne ein ausdrückliches Nichts passiert immer etwas,
        // und dann ist es kein Ereignis mehr, sondern der Normalzustand.
        werte: {
          ereignisse: ereignisseVon("alles"),
          drehrad: {
            enabled: true, frequenz: 5, modus: "gleich", phase: "ganze",
            schlussLaenge: 4, abSpieltag: null, bisSpieltag: null,
            wer: "alle", werWert: null, sperrfrist: 0, maxPunkteProSaison: 20,
            felder: [
              { id: "nichts", label: "Diesmal nichts", gewicht: 3, belohnung: { typ: "nichts" } },
              { id: "joker", label: "Ein Joker", gewicht: 1, belohnung: { typ: "joker", anzahl: 1 } },
            ],
          },
        },
      },
    ],
  },
  {
    // 🔴 Der Duell-Joker war nur in der Profi-Ansicht erreichbar — obwohl er
    // die einzige Mechanik ist, bei der ein Spieler einem ANDEREN etwas
    // wegnimmt. Das ist keine Feineinstellung, sondern die Frage, ob eine
    // Runde überhaupt konfrontativ sein soll; sie gehört gestellt.
    key: "angriff",
    label: "Dürft ihr euch gegenseitig etwas wegnehmen?",
    hint: "Der Duell-Joker: einem Mitspieler Punkte abnehmen (Klau) oder seinen Joker blocken.",
    stufen: [
      {
        key: "nein", label: "Nein",
        beschreibung: "Jeder spielt für sich. Niemand kann dir etwas wegnehmen.",
        werte: { duell: { ...DEFAULT_DUELL, enabled: false } },
      },
      {
        key: "block", label: "Nur blocken",
        // Die zahmere Hälfte: ein Block nimmt keine Punkte weg, er verhindert
        // nur eine Verstärkung. Wer Konfrontation will, aber keinen Verlust,
        // nimmt das — und Verlust wiegt schwerer als entgangener Gewinn.
        beschreibung: "Du kannst den Joker eines anderen entschärfen, aber ihm nichts abnehmen.",
        werte: {
          duell: { ...DEFAULT_DUELL, enabled: true, typen: ["block"], anzahl: 2, maxProSaison: 150 },
        },
      },
      {
        key: "klau", label: "Auch klauen",
        beschreibung: "Zweimal pro Saison darfst du jemandem vor dir einen Teil seiner Spieltagspunkte abnehmen.",
        // ⚠️ `zielWahl: "nurVorne"` ist kein Detail: nach unten getreten wird
        // aus einer Aufholmechanik eine Abwärtsspirale.
        //
        // 🔴 `maxProSaison: 150` statt der Vorgabe 60 — und das ist ein
        // BEFUND, kein Geschmack: bei 60 meldet die eigene Regler-Warnung
        // „der Deckel greift schon beim ersten Duell, ob 10 % oder 100 %
        // geklaut werden, ändert am Ergebnis nichts mehr". Die Vorgabe von
        // `DEFAULT_DUELL` liegt also unter dem Erprobten; sie fällt nur nicht
        // auf, weil das Duell standardmäßig aus ist.
        werte: {
          duell: { ...DEFAULT_DUELL, enabled: true, typen: ["klau"], anzahl: 2, zielWahl: "nurVorne", maxProSaison: 150 },
        },
      },
      {
        key: "beides", label: "Klauen und blocken",
        beschreibung: "Beide Angriffsarten, dreimal pro Saison. Eine Runde, in der man aufpassen muss.",
        werte: {
          duell: { ...DEFAULT_DUELL, enabled: true, typen: ["klau", "block"], anzahl: 3, zielWahl: "nurVorne", maxProSaison: 150 },
        },
      },
    ],
  },
];

export const REGLER_KEY = Object.fromEntries(REGLER.map((r) => [r.key, r]));

// Eine Stufe auf ein Regelwerk anwenden.
export function anwenden(rules, reglerKey, stufeKey) {
  const regler = REGLER_KEY[reglerKey];
  const stufe = regler?.stufen.find((s) => s.key === stufeKey);
  if (!stufe) return sanitizeRules(rules);
  return sanitizeRules({ ...rules, ...stufe.werte });
}

// Welche Stufe entspricht dem aktuellen Regelwerk? Vergleicht nur die Felder,
// die die Stufe überhaupt setzt — so wird eine Stufe auch dann erkannt, wenn
// der Admin danach etwas ganz anderes verändert hat.
export function erkenneStufe(rules, reglerKey) {
  const regler = REGLER_KEY[reglerKey];
  if (!regler || !rules) return null;
  const r = sanitizeRules(rules);
  for (const stufe of regler.stufen) {
    const soll = sanitizeRules({ ...DEFAULT_RULES, ...stufe.werte });
    const passt = Object.keys(stufe.werte).every(
      (feld) => JSON.stringify(r[feld]) === JSON.stringify(soll[feld])
    );
    if (passt) return stufe.key;
  }
  return null;   // eigene Mischung — in der Profi-Ebene entstanden
}

// ── Beispielzahlen statt abstrakter Regler ──────────────────
// Immer dasselbe Demo-Spiel (Außenseiter Jordanien gegen Favorit Spanien),
// damit die Zahlen zwischen zwei Einstellungen vergleichbar bleiben.
const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const REAL = { home: 3, away: 1, playerGoals: { "Al-Naimat": 2, "Yamal": 1 } };

const tipp = (home, away, goals = { home: [], away: [] }) => ({ home, away, goals });

// Was bringen typische Tipps unter DIESEM Regelwerk? Gibt Sätze zurück,
// die man ohne Regelkenntnis versteht.
export function beispiele(rules) {
  const r = sanitizeRules(rules);
  const punkte = (t) => scoreTip(t, REAL, SNAP, r).total;

  const exakt = punkte(tipp(3, 1));
  const knapp = punkte(tipp(2, 1));           // ein Tor daneben, Sieger richtig
  const nurSieger = punkte(tipp(1, 0));       // Tendenz richtig, Ergebnis weit weg
  const daneben = punkte(tipp(0, 3));         // falscher Sieger
  const mitSchuetze = punkte(tipp(3, 1, { home: ["Al-Naimat", "Al-Naimat"], away: [] }));

  const zeilen = [
    { key: "exakt", text: "Außenseiter-Sieg exakt getippt (3:1)", wert: exakt },
    { key: "knapp", text: "Ein Tor daneben (2:1)", wert: knapp },
    { key: "sieger", text: "Nur den Sieger richtig (1:0)", wert: nurSieger },
    { key: "daneben", text: "Falscher Sieger (0:3)", wert: daneben },
  ];
  if (r.markets?.goals?.enabled) {
    zeilen.splice(1, 0, { key: "schuetze", text: "…mit Doppelpack-Schützen", wert: mitSchuetze });
  }
  return zeilen;
}

// Ein Satz, der das Verhältnis beschreibt — das ist die Zahl, auf die es
// ankommt: wie viel ist ein knapper Tipp im Vergleich zum Volltreffer wert?
export function naeheSatz(rules) {
  const r = sanitizeRules(rules);
  const exakt = scoreTip(tipp(3, 1), REAL, SNAP, r).total;
  const knapp = scoreTip(tipp(2, 1), REAL, SNAP, r).total;
  if (exakt <= 0) return "Keine sinnvollen Punkte — Regelwerk prüfen.";
  const anteil = Math.round((knapp / exakt) * 100);
  if (anteil >= 70) return `Ein Tor daneben bringt noch ${anteil} % des Volltreffers — Nähe zählt viel.`;
  if (anteil >= 35) return `Ein Tor daneben bringt ${anteil} % des Volltreffers.`;
  return `Ein Tor daneben bringt nur ${anteil} % — hier zählt fast nur der exakte Treffer.`;
}
