// ============================================================
//  SCHAUFENSTER — eine Demo-Runde, in der ALLES an ist
//
//  🔴 Andi am 23.08.2026: „mach die demo runde bzw tests so dass sie alle
//  Einstellbarkeiten abdeckt … um sie zu prüfen."
//
//  Die Demo-Runde „Freundeskreis" fährt `DEFAULT_RULES` — und die haben fast
//  alles AUS. Das ist richtig so (eine frische Runde soll nicht mit zwölf
//  Mechaniken zugleich anfangen), es macht die App aber unprüfbar: wer
//  nachsehen will, ob das Schild in der Tippabgabe erscheint oder das Los
//  angezeigt wird, sieht schlicht nichts. Genau daran ist der Browser-Durchgang
//  zu JK14 am 23.08.2026 gescheitert.
//
//  Deshalb eine ZWEITE Runde neben der ersten, Beitritts-Code `ALLES`.
//
//  ── ⛔ Die Zahlen hier sind DEMO-Werte, keine Empfehlung ──
//  Sie sind so gewählt, dass jede Mechanik SICHTBAR wird, nicht dass sie sich
//  gut anfühlt. Balancing ist Endphase (CLAUDE.md), und diese Datei ist
//  ausdrücklich kein Vorgriff darauf.
//
//  ⚠️ **Nichts hiervon gehört in `presets.js` oder `charaktere.js`.** Ein
//  Charakter behauptet eine Empfehlung; dieses Regelwerk behauptet nur, dass
//  sich alles einschalten LÄSST. Wer die Werte kopiert, macht aus einer
//  Prüfhilfe eine Aussage über das Spiel.
//
//  ── Warum ausgerechnet diese Abweichungen von der Vorgabe ──
//  Jede unten hat einen Grund, und der steht daneben. Alles, was nicht
//  kommentiert ist, bleibt bei der Vorgabe des jeweiligen Moduls — je weniger
//  hier steht, desto weniger läuft auseinander.
// ============================================================

import { DEFAULT_RULES, sanitizeRules } from "./engine";

export const SCHAU_ROUND_ID = "00000000-0000-0000-0000-000000000002";
export const SCHAU_JOIN_CODE = "ALLES";
export const SCHAU_NAME = "Schaufenster (alles an)";

// 🔴 Die Fremdjoker verlangen einen ZWEI-PHASEN-SPIELTAG (JK18) — ohne ihn
// meldet `fremdjoker.konflikte()` sofort. Also gehört er zum Schaufenster
// dazu, sonst zeigt es einen kaputten Zustand statt einer Runde.
const TIPPFENSTER = { vorlaufStunden: 240, anker: "spieltag", schlussStunden: 24 };

export function schaufensterRegeln() {
  return sanitizeRules({
    ...DEFAULT_RULES,
    name: SCHAU_NAME,

    // Nur Bundesliga: eine Runde über sechs Wettbewerbe hat sechsmal
    // „Spieltag 1", und dann ist beim Nachsehen nie klar, welcher gemeint ist.
    spiele: { ...DEFAULT_RULES.spiele, modus: "alle", wettbewerbe: ["bl"] },

    // ── Favoriten-Sperre ──
    // 🔴 Bewusst im Modus `quote` und nicht `rang`: die Regler-Stufen von
    // Stufe 2 führen den Rang-Modus schon vor. Was hier zu sehen sein soll,
    // ist die ANDERE Bauart — sonst bliebe eine von zweien in der
    // Schaufenster-Runde ungezeigt, und genau dafür gibt es sie.
    //
    // ⚠️ 2,5 ist ein Vorführ-Wert und keine Empfehlung. Was eine gute Schwelle
    // ist, wird am Ende festgelegt (CLAUDE.md, Balancing ist Endphase).
    sperre: { enabled: true, modus: "quote", mindestQuote: 2.5, mindestensOffen: 5 },

    tippfenster: TIPPFENSTER,

    // ── Die FREMDJOKER-Familie, vollständig ──
    duell: {
      ...DEFAULT_RULES.duell,
      enabled: true,
      typen: ["klau", "block"],
      // 🔴 `manuell` mit einem Fenster, das bei Spieltag 1 ANFÄNGT, und
      // `anzahl` = Fensterbreite: nur so ist der erste Spieltag garantiert ein
      // Einsatz-Spieltag. Mit der Vorgabe („letztes Drittel", zufällig
      // verteilt) sähe man beim Nachsehen mit hoher Wahrscheinlichkeit nichts
      // — und hielte die Mechanik für kaputt.
      phase: "manuell",
      abSpieltag: 1,
      bisSpieltag: 6,
      anzahl: 6,
      // Zwei Fremdjoker am selben Spieltag, auf verschiedenen Spielen — der
      // Fall, den „max. je Spieltag" seit dem 23.08.2026 überhaupt erst
      // möglich macht.
      proSpieltag: 2,
      // Freie Zielwahl, damit die Zielliste mehr als einen Namen zeigt. Das
      // LOS (JK12) hat seine eigene Schaufenster-Runde nicht — es würde die
      // Liste auf genau einen Namen kürzen und damit alles andere verdecken.
      zielWahl: "frei",
      maxProZiel: 3,
      // Erholung nach einem Treffer: zwei Spieltage statt einem. Auf dem
      // ERSTEN Spieltag hat noch niemand einen Treffer kassiert, die Zahl
      // schneidet hier also nichts weg — sie steht da, damit es sie gibt.
      immun: 2,
      maxProSaison: 150,
      // Die Stärke-Regler stehen bewusst nicht auf der Vorgabe — sonst zeigt
      // das Schaufenster nicht, dass sie verstellbar sind.
      // ⚠️ `mitverdienen` OHNE Deckel ist die Kombination, vor der
      // `duell.konflikte()` warnt — deshalb steht `maxProSaison: 150` darüber
      // und nicht 0. Beides gehört zusammen gelesen.
      klau: { anteil: 0.5, modus: "mitverdienen" },
      // `nurGewinn: false` heißt: der Block greift auch, wenn beim Ziel gar
      // nichts zu holen war. Das ist die weitere der beiden Auslegungen.
      // 🔴 `wirkung` seit 25.08.2026 einstellbar. Das Schaufenster fährt die
      // VORGABE ("punkte") — und zwar mit Absicht, obwohl es sonst überall
      // abweicht: bei "gesperrt" wären die drei Zahlen darunter wirkungslos,
      // und drei Regler ohne Wirkung vorzuführen ist das Gegenteil des Zwecks.
      // `verfaellt` weicht dafür ab, damit auch dieses Feld einen zweiten Wert
      // gesehen hat.
      block: { wirkung: "punkte", verfaellt: false, restanteil: 0.4, nurGewinn: false, beute: 0.1 },
      sichtbarkeit: "verdeckt",
      konter: true,
      // ⚠️ `kosten: "frei"` bleibt: „stattJoker" verbraucht einen Joker aus
      // demselben Vorrat, und dann setzt im Schaufenster niemand mehr etwas —
      // die Runde hat keine Joker-Verteilung, die das trägt.
      schlussLaenge: 5,
    },

    eingriffe: {
      ...DEFAULT_RULES.eingriffe,
      enabled: true,
      // Alle vier Arten laufen — das ist der ganze Zweck dieser Runde.
      // ⚠️ Anteil und Einsatz weichen bewusst von der Vorgabe ab: sonst zeigt
      // das Schaufenster zwar die Mechanik, aber nicht, DASS sie einstellbar
      // ist. Es sind Demo-Werte, keine Empfehlung.
      trittbrett: { enabled: true, anteil: 0.4, kopierterBekommt: 0.25 },
      gegenwette: { enabled: true, einsatz: 30, stufe: "abstand", modus: "nullsumme" },
      // JK5 in allen drei Ebenen sichtbar: ein Standard, eine Abweichung je
      // Art, und der wachsende Cooldown aus Andis Beispiel.
      sperrfrist: {
        standard: { spieltage: 1, aufschlag: 2, hoechstens: 6 },
        block: { spieltage: 3, aufschlag: 0 },
      },
      // JK6: der Block liegt offen (darüber soll geredet werden), die
      // Gegenwette nicht (sie soll überraschen).
      sichtbar: { standard: true, gegenwette: false },
      // JK14: zwei Schilde je Spieltag, und der Einsatz VERFÄLLT — die
      // schärfere der beiden Varianten, damit sie überhaupt einmal vorkommt.
      // ⚠️ Zusammen mit `sichtbar: true` ist das die unauffällige Kombination;
      // verdeckt PLUS Rückgabe wäre die, die `konflikte()` meldet.
      // ⚠️ VERDECKT plus VERFÄLLT: das Schild liegt still, und ein Einsatz auf
      // ein Spiel, das keiner angreift, ist weg. Die zu meldende Kombination
      // ist eine andere — verdeckt plus RÜCKGABE, weil dann niemand merkt,
      // dass er nichts riskiert hat. `konflikte()` prüft genau die.
      schutz: { proSpieltag: 2, sichtbar: false, verfall: "verfaellt" },
      // JK12: die Auslosung ist in DIESER Runde nicht scharf (`zielWahl:
      // "frei"`, siehe oben) — ihre Einstellungen stehen trotzdem auf einem
      // anderen Wert als der Vorgabe, damit sichtbar ist, dass es sie gibt.
      los: {
        jeArt: true,
        // ⚠️ `paare` steht bewusst auf „gegenseitig“: „einseitig“ IST die
        // Vorgabe, und ein Wert, der die Vorgabe wiederholt, führt nichts vor.
        standard: { takt: "saison", paare: "gegenseitig", sichtbar: "alle" },
      },
      // JK6 andersherum als zuerst gebaut: der STANDARD liegt verdeckt (das
      // ist die Abweichung von der Vorgabe), und der Block liegt offen. So
      // führt die Runde beide Ebenen vor — Standard UND Ausnahme je Art.
      sichtbar: { standard: false, block: true },
    },

    // ══════════════════════════════════════════════════════════════════
    //  AB HIER: alles Übrige, damit das Schaufenster seinen Namen verdient
    //
    //  🔴 Andi am 23.08.2026: „mach die demo runde bzw tests so dass sie alle
    //  Einstellbarkeiten abdeckt … um sie zu prüfen.“ Gemessen mit
    //  `npm run einstellbar` waren es 78 von 199 Blattfeldern — 121
    //  Einstellungen wurden im ganzen Projekt NIRGENDS anders gesetzt als in
    //  der Vorgabe. Wer eine davon im Browser sehen wollte, musste sie von
    //  Hand einstellen und wusste vorher nicht, ob sie überhaupt ankommt.
    //
    //  ⛔ **Und noch einmal: Demo-Werte, keine Empfehlung.** Jede Zahl unten
    //  ist danach gewählt, dass sie ANDERS ist als die Vorgabe — nicht danach,
    //  dass sie gut wäre. Balancing ist Endphase (CLAUDE.md).
    //
    //  Was hier NICHT steht, steht in `SCHAU_AUSGENOMMEN` mit Begründung.
    // ══════════════════════════════════════════════════════════════════

    // ── Die Wertungs-Schrauben ──
    m: 0.6,
    winnerFloor: false,
    displayScale: 20,
    perGameCap: 60,
    underdogRampStart: 4,
    underdogRampEnd: 9,
    favFlopPenalty: 0.5,
    modCap: 3,
    modFloor: 0.2,
    reglerFeinheit: 0.025,

    // ── Märkte ──
    // `markets.result` bleibt AN — siehe `SCHAU_AUSGENOMMEN`.
    markets: {
      ...DEFAULT_RULES.markets,
      goals: {
        ...DEFAULT_RULES.markets.goals,
        // `proSpiel` statt `proTeam`: erst damit bedeutet `picksProSpiel`
        // überhaupt etwas — in `proTeam` zählt `picksPerTeam`.
        modus: "proSpiel",
        picksProSpiel: 4,
        allowDouble: false,
        allowBackups: false,
      },
    },

    // ── Die Zeitachse der Runde ──
    // ⚠️ `modus` bleibt „anker“ — siehe `SCHAU_AUSGENOMMEN`. Der Anker ist die
    // Bundesliga, weil die Runde nur aus Bundesliga-Spielen besteht.
    zeitachse: {
      ...DEFAULT_RULES.zeitachse,
      anker: "bl",
      buendeln: 2,
      pause: "anhaengen",
      pauseAbTagen: 14,
    },

    // ── Die Spielauswahl ──
    // `modus`/`teamModus` bleiben — siehe `SCHAU_AUSGENOMMEN`. Das Fenster
    // 1–6 deckt sich mit dem Duell-Fenster darüber, sonst zeigte die eine
    // Einstellung auf Spieltage, die die andere gar nicht hergibt.
    spiele: {
      ...DEFAULT_RULES.spiele,
      modus: "alle",
      wettbewerbe: ["bl"],
      spieltagVon: 1,
      spieltagBis: 6,
    },

    // ── Wettbewerbs-Gewichte ──
    // ⚠️ In einer reinen Bundesliga-Runde gibt es keine K.-o.-Phase; die Stufe
    // ist hier also ohne Wirkung und trotzdem gesetzt — sie soll VORKOMMEN,
    // damit sichtbar ist, dass es sie gibt. `enabled` verlangt entweder einen
    // Aufschlag oder eine Phasenstufe > 0, deshalb beides zusammen.
    wettbewerbe: { enabled: true, aufschlaege: { cl: 0.3 }, phasenStufe: 0.1 },

    tippfenster: TIPPFENSTER,

    // ── Der Tipper-Einfluss auf die Quote ──
    // `minTipper: 3` bei fünf Mitspielern: nur so greift die Ebene in dieser
    // Runde überhaupt. Mit der Vorgabe (8) bliebe sie stumm.
    tippEinfluss: { staerke: 0.3, marktTiefe: 250, minTipper: 3 },

    // ── Saisonform ──
    saisonform: { ...DEFAULT_RULES.saisonform, kurve: "endspurt", staerke: 2.5, nurGetippte: false },

    // ── Das große Spiel ──
    bigGame: { ...DEFAULT_RULES.bigGame, enabled: true, aufschlag: 0.8 },

    // ── Aufhol-Hilfe und Versäumnis ──
    aufholen: { ...DEFAULT_RULES.aufholen, enabled: true, betrifft: "unter-schnitt" },
    versaeumnis: { ...DEFAULT_RULES.versaeumnis, enabled: true, strategie: "schnitt" },

    // ── Tabellen-Bonus ──
    // ⚠️ `bezug: "punkte"` verschiebt die Spanne von `abAbstand`: als PLÄTZE
    // sind 1–25 erlaubt, als PUNKTE 3–60. Ein Wert aus der falschen Spanne
    // käme geklemmt an und stünde dann anders da, als er hier steht.
    tabellenBonus: {
      ...DEFAULT_RULES.tabellenBonus,
      enabled: true,
      aufschlag: 0.4,
      nurWennRichtig: false,
      bezug: "punkte",
      abAbstand: 12,
      abSpieltag: 2,
      richtung: "auchFavorit",
      fallback: "aus",
      fallbackQuote: 3.5,
    },

    // ── Kombi-Bonus ──
    kombi: { enabled: true, stufe: "abstand", staerke: 0.8, maxAufschlag: 2, mindestSchuetzen: 2 },

    // ── Alleinstellung ──
    alleinstellung: {
      ...DEFAULT_RULES.alleinstellung,
      enabled: true,
      modus: "wenige",
      maxTipper: 3,
      maxAnteil: 0.5,
      art: "punkte",
      punkte: 250,
      ersatzZaehlt: true,
      maxProSaison: 3,
    },

    // ── Der Joker-Vorrat ──
    // ⚠️ `minAnteilProSpiel` steht bewusst NICHT auf 1: das hieße, der ganze
    // Einsatz muss auf ein Spiel: eine Demo-Runde, in der man nur eine einzige
    // Wahl hat, führt weniger vor, nicht mehr.
    joker: {
      ...DEFAULT_RULES.joker,
      enabled: true,
      abstimmung: true,
      einsatzProSpieltag: 120,
      maxAnteilProSpiel: 0.8,
      minAnteilProSpiel: 0.1,
      skippenErlaubt: false,
      heimat: { enabled: true, faktor: 1.4 },
      mut: { enabled: true, faktor: 1.3 },
      einsatzTaktN: 5,
      // Dasselbe Fenster wie beim Duell — siehe dort, warum „manuell“ ab
      // Spieltag 1: sonst sieht man beim Nachsehen mit hoher
      // Wahrscheinlichkeit nichts.
      einsatzFenster: { phase: "manuell", schlussLaenge: 5, abSpieltag: 1, bisSpieltag: 6 },
      verteilung: { modus: "gleich", frequenz: 5, sichtbarkeit: "offen" },
    },

    // ── Die Joker-GRUNDLAGE (gilt für alle Arten, auch die Fremdjoker) ──
    // ⚠️ `wer: "abPlatz"` mit `werWert: 1` heißt „ab Platz 1 abwärts“ — also
    // alle. Das ist Absicht: nur mit `abPlatz`/`abRueckstand` bedeutet
    // `werWert` überhaupt etwas, und jede engere Zahl schlösse in einer
    // Fünf-Personen-Runde genau die Mitspieler aus, die etwas vorführen sollen.
    jokerBasis: {
      standard: {
        ...DEFAULT_RULES.jokerBasis.standard,
        wer: "abPlatz",
        werWert: 1,
        sicht: "sofort",
        verfall: "wandert",
        bedingung: {
          ...DEFAULT_RULES.jokerBasis.standard.bedingung,
          minQuote: 1.5,
          maxQuote: 12,
        },
        widerruf: "bisStunden",
        widerrufStunden: 12,
        stapeln: 2,
        symmetrie: "nurGewinn",
        bestand: 1,
        kasseSichtbar: false,
        abklingzeit: 1,
        umfang: "nSpiele",
        spieleProEinsatz: 2,
        wahl: "bestes",
      },
    },

    // ── Die Joker-Kasse ──
    // ⚠️ `preise: {}` bleibt leer: sobald eine Art einen Preis trägt, kostet
    // sie Guthaben — und in einer Runde ohne Verteilung setzt danach niemand
    // mehr etwas ein. Die Kasse soll hier EINSTELLBAR sein, nicht bindend.
    budget: {
      ...DEFAULT_RULES.budget,
      enabled: true,
      takt: "saison",
      n: 5,
      fenster: { phase: "manuell", schlussLaenge: 5, abSpieltag: 1, bisSpieltag: 6 },
      verfall: "periode",
      maxAnsparen: 40,
      preisModus: "steigend",
      steigerung: 2,
    },

    // ── Das Drehrad ──
    // `felder` ist eine LISTE und zählt im einstellbar-Durchgang nicht mit
    // (Arrays bleiben dort draußen) — es steht hier trotzdem, weil das Rad
    // ohne Felder gar nicht erst angeht und dann auch nichts zu sehen ist.
    drehrad: {
      ...DEFAULT_RULES.drehrad,
      enabled: true,
      // ⚠️ Die eigene `sperrfrist` am Feld schlägt die Rad-Vorgabe. Zwei der
      // drei stehen deshalb auf 0: mit dreimal 2 wäre die Summe der Sperren
      // so groß wie das Rad selbst, und `pruefeFelder` meldet das zu Recht.
      felder: [
        { id: "punkte", label: "30 Punkte", gewicht: 40, sperrfrist: 0, belohnung: { typ: "punkte", betrag: 30 } },
        { id: "joker", label: "Ein Joker", gewicht: 30, sperrfrist: 0, belohnung: { typ: "joker", art: "joker.einzel", anzahl: 1 } },
        { id: "niete", label: "Niete", gewicht: 30, belohnung: { typ: "nichts" } },
      ],
      sperrfrist: 2,
      modus: "kontingent",
      wer: "abPlatz",
      werWert: 1,
      schlussLaenge: 5,
      abSpieltag: 1,
      bisSpieltag: 6,
      maxPunkteProSaison: 60,
    },

    // ── Die Regel-Abstimmung ──
    regelAbstimmung: {
      ...DEFAULT_RULES.regelAbstimmung,
      enabled: true,
      dauer: 4,
      wirkungVorlauf: 3,
      vetoAdmin: true,
      antragsrecht: "nurAktive",
      sichtbarkeit: "verdeckt",
      aktivSpieltage: 3,
    },
  });
}

// ── ⚠️ Dass `reglerWarnung.pruefe()` hier anschlägt, ist RICHTIG ──
//
// Gemessen am 23.08.2026: acht Meldungen (fünf Warnungen, drei Hinweise). Das
// ist kein Fehler in dieser Datei, sondern ihre Folge — ein Regelwerk, in dem
// jede Einstellung von der Vorgabe abweicht, verlässt zwangsläufig die
// Empfehlungsbänder. Genau dafür gibt es die Bänder.
//
// ⛔ **Nicht „glattziehen".** Wer die Werte hier so lange verschiebt, bis die
// Warnungen still sind, tut zweierlei Verbotenes: er macht aus einer Prüfhilfe
// eine Balance-Aussage (Balancing ist Endphase, CLAUDE.md), und er nimmt der
// Runde genau das, wofür sie da ist — das Vorführen der Randwerte.
//
// ✅ Richtig ist umgekehrt: dass die Meldungen kommen, BELEGT, dass die
// Warnungen greifen. Ein Schaufenster mit allem am Anschlag und einer stummen
// Ampel wäre der eigentliche Fund.

// ── Was das Schaufenster ABSICHTLICH auf der Vorgabe lässt ───
//
// 🔴 Der ehrliche Rest zu Andis Auftrag. Eine einzelne Runde kann nicht jede
// Einstellung vorführen, weil manche einander AUSSCHLIESSEN: `spiele.modus`
// hat genau einen Wert, und „teams“ zeigt eine andere Runde als „alle“. Wer
// das trotzdem alles in ein Regelwerk schriebe, bekäme kein Schaufenster,
// sondern eine Runde, die nichts mehr zeigt.
//
// ⚠️ Diese Liste ist deshalb KEIN Rest-Posten, sondern die Aussage: „hier ist
// die Grenze, und sie hat einen Grund“. Jede Zeile trägt ihn. Eine Zeile ohne
// Grund ist ein vergessenes Feld — `npm run einstellbar` sagt es an.
export const SCHAU_AUSGENOMMEN = {
  "markets.result": "Die Schaufenster-Tipps SIND Ergebnis-Tipps. Aus heißt: leere Runde.",
  "spiele.modus": "„alle“ ist, was die Runde überhaupt füllt; „teams“/„liste“ kürzen sie auf eine Handvoll Spiele.",
  "spiele.teamModus": "Wirkt nur bei `spiele.modus: \"teams\"` — folgt der Zeile darüber.",
  oddsMode: "Eine Aussage über die QUOTEN-QUELLE, keine Spielregel. Die Demo-Daten sind Snapshots.",
  "zeitachse.modus": "„woche“ ersetzt die ganze Anker-Einteilung, auf die hier Duell-Fenster, Joker-Fenster und Spieltagsgrenzen abgestimmt sind.",
  "zeitachse.tage": "Nur im Wochen-Modus wirksam — folgt der Zeile darüber.",
  "duell.kosten": "„stattJoker“ verbraucht einen Joker aus demselben Vorrat; dann setzt im Schaufenster niemand mehr einen Fremdjoker ein.",
  "duell.block.wirkung": "„gesperrt“ macht die drei Zahlen darunter (restanteil · nurGewinn · beute) wirkungslos — und drei Regler ohne Wirkung vorzuführen ist das Gegenteil des Zwecks. Das Schaufenster zeigt deshalb „punkte“ samt Zahlen; die Sperre selbst deckt `greift` ab.",
};


// ── Die Tipps, ohne die das Schaufenster leer bleibt ─────────
//
// 🔴 **Der Befund, der diese Funktion nötig gemacht hat:** eine Runde ohne
// Tipps hat eine LEERE Tabelle — und `zulaessigeZiele` filtert die Tabelle.
// Also gab es kein Ziel, also war `istDuellSpieltag` falsch, also fehlte der
// ganze Fremdjoker-Block in der Tippabgabe. Gemessen am 23.08.2026 im
// Browser: Schild da, Fremdjoker weg.
//
// ⚠️ Im Betrieb löst sich das von selbst — der ZWEI-PHASEN-Spieltag (JK18)
// sorgt dafür, dass in Phase 2 alle Tipps vorliegen. Es ist trotzdem der
// Grund, warum ein Schaufenster ohne Tipps nichts zeigt.
//
// Jede der fünf Zeilen unten steht für eine Mechanik, die man sehen soll:
//
//   Du     Block auf Lena (Spiel 1) + Gegenwette gegen Kemal (Spiel 2)
//          → zwei Fremdjoker an EINEM Spieltag, auf verschiedenen Spielen
//   Lena   Schild auf Spiel 3 → JK14
//   Kemal  Trittbrettfahrer auf Du (Spiel 1)
//   Max    Klau bei Jonas (Spiel 2)
//   Jonas  tippt nur — jemand muss auch mal nichts tun
export const SCHAU_SPIELER = ["u-du", "u-lena", "u-kemal", "u-max", "u-jonas"];

// `matches` = die Spiele der Runde (nur Bundesliga). Genommen werden die
// ersten drei des ersten Spieltags, chronologisch — damit die Zuordnung
// „Spiel 1/2/3" nicht an der Reihenfolge im Katalog hängt.
export function schaufensterTipps(matches = []) {
  const ersteDrei = matches
    .filter((m) => m.matchday === 1)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)
      || String(a.id ?? a.matchId).localeCompare(String(b.id ?? b.matchId)))
    .slice(0, 3);
  if (ersteDrei.length < 3) return [];

  const [s1, s2, s3] = ersteDrei.map((m) => m.id ?? m.matchId);
  const extra = {
    "u-du": {
      [s1]: { duell: { auf: "u-lena", typ: "block" } },
      [s2]: { duell: { auf: "u-kemal", typ: "gegenwette" } },
    },
    "u-lena": { [s3]: { schutz: true } },
    "u-kemal": { [s1]: { duell: { auf: "u-du", typ: "trittbrett" } } },
    "u-max": { [s2]: { duell: { auf: "u-jonas", typ: "klau" } } },
  };

  const zeilen = [];
  for (const [i, m] of ersteDrei.entries()) {
    const mid = m.id ?? m.matchId;
    for (const [j, userId] of SCHAU_SPIELER.entries()) {
      // Bewusst verschiedene Tipps, damit die Tabelle nicht fünfmal denselben
      // Stand zeigt — und damit die Alleinstellung überhaupt etwas zu tun hat.
      zeilen.push({
        id: `schau-${mid}-${userId}`,
        round_id: SCHAU_ROUND_ID,
        match_id: mid,
        user_id: userId,
        tip: {
          home: (i + j) % 4,
          away: (i * 2 + j) % 3,
          goals: { home: [], away: [] },
          ...(extra[userId]?.[mid] ?? {}),
        },
        snapshot: m.snapshot,
      });
    }
  }
  return zeilen;
}
