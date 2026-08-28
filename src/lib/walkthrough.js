// ============================================================
//  WALKTHROUGH — der geführte Rundgang durch die Spielerstellung (RF5)
//
//  🔴 Andis Zuschnitt, wörtlich (29.08.2026):
//
//    „Walkthrough halt egtl sehr interaktiv gehalten mit Pfeilen und
//     erklärung, die halt wie in nem klassichen Handyspiel bzw aufbauspiel
//     Tutorial gezeigt werden … und dann vom nutzer durchgeklickt werden, aber
//     auch mit überspringen möglichkeit der einzelnen Teile bzw muss man das
//     Tutorial auch nicht machen wenn man ne guten Creatorcode hat bzw gute
//     Teilcodes also direkt am Anfang wird man darüber aufgeklärt … Dass man
//     sich im besten fall von iwelchen infleuencern die ihre codes vorstellen
//     übrnehmen kann ohne selber zu viele gedanken reinstecken zu müssen was
//     wie balanced ist"
//
//  Vier Sachen stehen da drin, und alle vier sind gebaut:
//   1. **Pfeil auf ein echtes Bedienelement**, nicht ein Text über die App.
//      Deshalb trägt fast jeder Schritt ein `ziel` — die id eines Elements,
//      das auf dem Screen wirklich steht.
//   2. **Durchklicken**, ein Schritt nach dem anderen.
//   3. **Kapitelweise überspringen** — nicht nur „alles abbrechen". Deshalb
//      sind die Schritte in KAPITEL gruppiert und nicht eine lange Liste.
//   4. 🔴 **Der Ausweg steht GANZ VORN**, nicht am Ende: wer einen guten Code
//      hat, braucht den Rundgang nicht. Das ist Andis eigentlicher Punkt —
//      ein Code von jemandem, der sich das überlegt hat, ist der schnellere
//      Weg zu einer guten Runde als jeder Regler.
//
//  ── ⚠️ Was dieses Modul NICHT tut ──
//  Es rendert nichts und kennt kein DOM. Es hält die INHALTE und die
//  Navigation; die Pfeile, das Scheinwerferloch und die Knöpfe stehen in
//  `src/components/Walkthrough.jsx`. Architektur-Regel 1.
//
//  ── 🔴 Die Drehrad-Texte lesen aus `drehrad.js`, sie schreiben nicht ab ──
//  Andi ausdrücklich: „grade das Drehrad mit allen funktionen muss gut erklärt
//  werden." Eine abgeschriebene Liste von Feld-Typen wäre am Tag des Schreibens
//  richtig und ein halbes Jahr später eine Lüge — genau der Verlauf, den dieses
//  Projekt bei jeder zweiten Wahrheit hatte. Die Belohnungs-Typen, die
//  Häufigkeits-Wege und die Ausschluss-Reichweiten kommen deshalb aus dem
//  Modul selbst.
//
//  ⚠️ **Und die Sperrklinke dazu musste zweimal gebaut werden.** Die erste
//  Fassung von `walkthrough.test.js` fragte „kommt jedes Feld irgendwo im
//  Kapitel vor?" — ein Test, der NIE rot werden konnte, weil die Liste ja aus
//  demselben Katalog gebaut wird. Die Gegenprobe (ein erfundener Typ in
//  `drehrad.js`) ließ ihn grün. Geprüft wird jetzt die ABLEITUNG selbst:
//  schreibt jemand die Liste von Hand ab, schlägt der Test an.
// ============================================================

import { BELOHNUNGS_TYPEN, HAEUFIGKEITEN, AUSSCHLUSS_REICHWEITEN, EREIGNIS_TRIFFT } from "./drehrad";

// ── Die Kapitel ─────────────────────────────────────────────
//
// `ziel` ist die id eines Elements auf `/erstellen`. Steht dort `null`, zeigt
// der Schritt eine Karte in der Mitte statt eines Pfeils — für alles, was man
// erklären muss, bevor es etwas zu zeigen gibt.
//
// ⚠️ Die ids sind ein VERTRAG mit `Spielerstellung.jsx`. Verschwindet eine,
// zeigt der Pfeil ins Leere — `walkthrough.test.js` prüft deshalb, dass jedes
// `ziel` dort auch wirklich vorkommt.
export const WALKTHROUGH_KAPITEL = [
  {
    key: "codes",
    titel: "Du musst das hier nicht machen",
    kurz: "Der Ausweg",
    schritte: [
      {
        key: "codes-intro",
        ziel: null,
        titel: "Kurz vorweg: der schnellste Weg geht ohne mich",
        text: "Eine gute Runde musst du dir nicht selbst ausdenken. Wenn dir "
          + "jemand einen Code gibt — ein Creator, ein Kumpel, irgendwer, der "
          + "sich das überlegt hat — dann setzt du den ein und bist fertig. "
          + "Keine Regler, kein Nachdenken darüber, was ausgewogen ist.",
      },
      {
        key: "codes-feld",
        ziel: "gamecode-einsetzen",
        titel: "Hier kommt der Code rein",
        text: "Ein GameCode bringt das ganze Regelwerk mit: Wertung, Joker, "
          + "Ereignisse, alles. Einsetzen, fertig. Du kannst hinterher trotzdem "
          + "an jedem Regler drehen — der Code ist ein Startpunkt, kein Vertrag.",
      },
      {
        key: "codes-teil",
        ziel: "abs-bausteine",
        titel: "Und es geht auch stückweise",
        text: "Teil-Codes bringen nur EINEN Bereich mit — nur das Drehrad, nur "
          + "die Joker, nur die Spielauswahl. Damit baust du dir was zusammen: "
          + "die Wertung von einem, das Rad von jemand anderem. Sie stapeln sich, "
          + "jeder ändert nur seinen Teil.",
      },
      {
        key: "codes-raus",
        ziel: null,
        titel: "Alles klar? Dann kannst du hier raus",
        text: "Ab hier gehen wir die Einstellungen durch. Wenn du einen Code "
          + "hast, brauchst du das nicht — unten rechts ist der Ausgang. Jedes "
          + "Kapitel lässt sich auch einzeln überspringen.",
      },
    ],
  },

  {
    key: "variante",
    titel: "Zwei Varianten, eine Entscheidung",
    kurz: "Variante",
    schritte: [
      {
        key: "variante-wahl",
        ziel: "gamemode",
        titel: "Quotentippen oder Budget",
        text: "Beim Quotentippen entstehen Punkte aus der Wahrscheinlichkeit: "
          + "wer aus einer unwahrscheinlichen Lage richtig liegt, bekommt mehr. "
          + "Beim Budget verteilst du einen festen Vorrat selbst. Das ist die "
          + "erste Frage — alles andere hängt nicht daran.",
      },
    ],
  },

  {
    key: "vorauswahl",
    titel: "Die Abkürzung: eine Voreinstellung nehmen",
    kurz: "Vorauswahl",
    schritte: [
      {
        key: "vorauswahl-karten",
        ziel: "gamemode",
        titel: "Drei fertige Runden, ein Klick",
        text: "Kenner-Runde, Klassisch & fair, Mutig & wild. Jede stellt das "
          + "ganze Regelwerk stimmig ein. Nimm eine, die in die Richtung geht, "
          + "und ändere danach nur, was dich stört.",
      },
      {
        key: "vorauswahl-ampel",
        ziel: null,
        titel: "Das Thermometer sagt dir, was dabei rauskommt",
        text: "Direkt unter der Auswahl steht eine Einschätzung: bleibt das "
          + "noch ein Tippspiel, oder entscheidet Glück allein? Sie rechnet "
          + "40 Saisons durch — ein guter Tipper gegen einen, der stur auf "
          + "Außenseiter setzt. Sie bleibt beim Scrollen oben stehen, damit du "
          + "beim Schrauben siehst, was sich ändert.",
      },
    ],
  },

  {
    key: "spiele",
    titel: "Welche Spiele gehören dazu",
    kurz: "Spiele",
    schritte: [
      {
        key: "spiele-wettbewerbe",
        ziel: "abs-spiele",
        titel: "Erst die Wettbewerbe, dann die Vereine",
        text: "Hier legst du fest, worauf überhaupt getippt wird. Alle "
          + "Einschränkungen wirken zusammen: wählst du Bundesliga UND vier "
          + "Vereine, bleiben nur deren Bundesliga-Spiele. Die Zahl darunter "
          + "sagt dir sofort, wie viele Spiele übrig sind.",
      },
      {
        key: "spiele-zeit",
        ziel: "abs-saison",
        titel: "Und wann ein Spieltag vorbei ist",
        text: "Über mehrere Ligen zählt jede für sich — „Spieltag 5“ gibt es "
          + "dann fünfmal. Hier legst du fest, was ein Spieltag EURER Runde "
          + "umfasst. Vorgabe: Donnerstag 23:59 ist Schluss, damit der "
          + "Europapokal am Ende steht und die Liga ab Freitag den nächsten "
          + "eröffnet.",
      },
    ],
  },

  {
    key: "fragen",
    titel: "Die vier Fragen, die den Charakter machen",
    kurz: "Die 4 Fragen",
    schritte: [
      {
        key: "fragen-vier",
        ziel: "abs-fragen",
        titel: "Wenn du nur vier Sachen einstellst, dann diese",
        text: "Wie hart eine knappe Fehlprognose bestraft wird, wie viel "
          + "Außenseiter extra bringen, ob Joker mitlaufen und ob es "
          + "Saison-Wetten gibt. Alles darunter ist Feinschliff.",
      },
      {
        key: "fragen-wertung",
        ziel: "abs-wertung",
        titel: "Darunter liegt die Wertung im Detail",
        text: "Hier stehen die Rohregler: Nähe-Belohnung, Abzug für Fehltipps, "
          + "Deckel. Musst du nicht anfassen — aber wenn du willst, kommst du "
          + "überall ran.",
      },
    ],
  },

  {
    key: "joker",
    titel: "Joker und was daran hängt",
    kurz: "Joker",
    schritte: [
      {
        key: "joker-grund",
        ziel: "abs-joker",
        titel: "Ein Joker verdoppelt, was ein Spiel wert ist",
        text: "Wie viele es gibt, woher sie kommen und was sie kosten, stellst "
          + "du hier ein. Dahinter liegt auch alles, was Spieler gegeneinander "
          + "einsetzen können — und das Drehrad.",
      },
      {
        key: "joker-mods",
        ziel: "abs-mods",
        titel: "Modifikatoren schrauben an einzelnen Spielen",
        text: "Derby, Topspiel, Wettbewerbs-Aufschlag. Sie werden ADDIERT, nicht "
          + "multipliziert, und ein gemeinsamer Deckel begrenzt sie. Sonst "
          + "türmen sich drei kleine Aufschläge zu einem Spiel, das die halbe "
          + "Runde entscheidet.",
      },
    ],
  },

  // ── 🔴 Das Drehrad, ausführlich ─────────────────────────────
  // Andi ausdrücklich: „grade das Drehrad mit allen funktionen muss gut
  // erklärt werden."
  //
  // ⚠️ Nur der erste Schritt trägt ein `ziel`. Die Rad-Einstellungen liegen im
  // Joker-Sondermenü (`JokerSondermenue.jsx` → `Drehrad.jsx`), also hinter
  // einem Klick — ein Pfeil auf ein Element, das gerade gar nicht offen ist,
  // zeigt ins Leere. Deshalb: einmal zeigen, WO es liegt, und den Rest als
  // Karten erklären.
  {
    key: "drehrad",
    titel: "Das Drehrad — Glück, aber eingestelltes",
    kurz: "Drehrad",
    schritte: [
      {
        key: "rad-wo",
        ziel: "abs-joker",
        titel: "Hier liegt es: im Joker-Bereich",
        text: "Das Rad ist die Ebene, die nicht rechnet, sondern verteilt. Es "
          + "dreht sich zu festen Terminen, und was dabei rauskommt, hast du "
          + "vorher festgelegt. Standardmäßig ist es aus — es kommt nur rein, "
          + "wenn du es willst.",
      },
      {
        key: "rad-felder",
        ziel: null,
        titel: "Ein Rad besteht aus Feldern — und das kann drauf stehen",
        text: "Jedes Feld trägt eine Belohnung. Das sind alle, die es gibt:",
        liste: BELOHNUNGS_TYPEN.map((t) => ({ label: t.label, desc: t.desc })),
      },
      {
        key: "rad-niete",
        ziel: null,
        titel: "Die Niete ist kein Schönheitsfehler",
        text: "Ohne ein Feld, auf dem nichts passiert, ist Drehen risikolos — "
          + "und was nichts kosten kann, ist auch nichts wert. Wie breit ein "
          + "Feld ist, bestimmt seine Wahrscheinlichkeit: ein doppelt so breites "
          + "Feld kommt doppelt so oft. Du siehst die Prozente direkt am Rad.",
      },
      {
        key: "rad-haeufigkeit",
        ziel: null,
        titel: "Wie oft es sich dreht — zwei Wege zum selben Ziel",
        text: "Du sagst entweder den Abstand oder die Gesamtzahl. Der andere "
          + "Wert ergibt sich:",
        liste: HAEUFIGKEITEN.map((h) => ({ label: h.label, desc: h.desc })),
      },
      {
        key: "rad-phase",
        ziel: null,
        titel: "Und WANN in der Saison",
        text: "Über die ganze Saison, nur im letzten Drittel, nur auf den "
          + "letzten Spieltagen oder in einem Fenster, das du selbst setzt. "
          + "Ein Rad, das erst spät anläuft, ist ein Aufholmittel; eins, das "
          + "durchläuft, ist Würze. ⚠️ Ein Termin ohne Spiele wird "
          + "übersprungen — eine Drehung, die niemand nutzen kann, wäre "
          + "verschenkt.",
      },
      {
        key: "rad-wer",
        ziel: null,
        titel: "Wer drehen darf",
        text: "Alle gleich, oder nach Kontingent — dann hat jeder eine "
          + "begrenzte Zahl Drehungen und entscheidet selbst, wann. Du kannst "
          + "auch einschränken, wer überhaupt drankommt, zum Beispiel nur wer "
          + "abgegeben hat. Und ob es je Termin eine Drehung gibt oder mehrere.",
      },
      {
        key: "rad-ereignis",
        ziel: null,
        titel: "Das Rad kann auch Ereignisse auslösen",
        text: "Ein Feld „Ereignis“ zieht eines von denen, die du eingestellt "
          + "hast. Die Wirkung kommt von dort — das Rad ist nur der Auslöser. "
          + "Du legst am Feld fest, wen es trifft:",
        liste: EREIGNIS_TRIFFT.map((e) => ({ label: e.label, desc: e.desc })),
      },
      {
        key: "rad-sperren",
        ziel: null,
        titel: "Damit nicht dreimal dasselbe kommt",
        text: "Zwei Bremsen. Eine Sperrfrist lässt ein Feld nach einem Treffer "
          + "eine Weile aussetzen. Und Ausschlüsse verbieten, dass zwei Felder "
          + "zusammen kommen — wie weit das gilt, stellst du ein:",
        liste: AUSSCHLUSS_REICHWEITEN.map((a) => ({ label: a.label, desc: a.desc })),
      },
      {
        key: "rad-deckel",
        ziel: null,
        titel: "Der Deckel, den du nicht vergessen solltest",
        text: "Punkte-Felder brauchen eine Obergrenze für die Saison, sonst "
          + "entscheidet das Rad die Tabelle statt der Tipps. Steht vorgegeben "
          + "auf 20. Modifikatoren aus dem Rad fallen in denselben Topf wie "
          + "Derby und Topspiel — der gemeinsame Deckel greift also weiter.",
      },
    ],
  },

  {
    key: "abschluss",
    titel: "Runde anlegen und teilen",
    kurz: "Abschluss",
    schritte: [
      {
        key: "abschluss-erstellen",
        ziel: "abs-erstellen",
        titel: "Runde erstellen",
        text: "Name rein, anlegen. Du bist automatisch Admin und drin. Die "
          + "Einstellungen kannst du danach weiter ändern — solange noch "
          + "niemand getippt hat, ohne dass jemand etwas davon merkt.",
      },
      {
        key: "abschluss-code",
        ziel: "abs-code",
        titel: "Und jetzt gib deinen Code weiter",
        text: "Dein Regelwerk wird zu einem Code. Wer ihn einsetzt, bekommt "
          + "genau deine Runde — das ist die andere Seite von dem, womit wir "
          + "angefangen haben. Wenn deine Runde gut läuft, spart dein Code dem "
          + "Nächsten den ganzen Rundgang hier.",
      },
    ],
  },
];

// ── Navigation ──────────────────────────────────────────────
// Der Zustand ist EINE Zahl: der Index in der flachen Schrittliste. Ein Paar
// aus Kapitel- und Schritt-Index wäre zwei Zahlen, die man synchron halten
// muss — und genau daraus entstehen die Fehler, bei denen ein „Zurück" im
// falschen Kapitel landet.
export const SCHRITTE = WALKTHROUGH_KAPITEL.flatMap((k, ki) =>
  k.schritte.map((s, si) => ({
    ...s,
    kapitel: k.key,
    kapitelTitel: k.titel,
    kapitelKurz: k.kurz,
    kapitelNr: ki + 1,
    imKapitel: si + 1,
    kapitelLaenge: k.schritte.length,
  })),
);

export const KAPITEL_ANZAHL = WALKTHROUGH_KAPITEL.length;

export function schrittAn(index) {
  return SCHRITTE[index] ?? null;
}

// `null` heißt „fertig" — der Aufrufer schließt dann. Bewusst kein Umlauf auf
// 0: ein Rundgang, der von vorn anfängt, wenn man einmal zu oft klickt, wirkt
// kaputt.
export function weiter(index) {
  return index + 1 < SCHRITTE.length ? index + 1 : null;
}

export function zurueck(index) {
  return index > 0 ? index - 1 : 0;
}

// Zum ersten Schritt des NÄCHSTEN Kapitels — Andis „überspringen möglichkeit
// der einzelnen Teile". `null`, wenn danach keins mehr kommt.
export function kapitelUeberspringen(index) {
  const jetzt = schrittAn(index);
  if (!jetzt) return null;
  const naechster = SCHRITTE.findIndex((s, i) => i > index && s.kapitel !== jetzt.kapitel);
  return naechster === -1 ? null : naechster;
}

// Zum Anfang eines Kapitels springen — für die Übersicht, in der man sich
// eins aussuchen kann.
export function kapitelAnfang(kapitelKey) {
  const i = SCHRITTE.findIndex((s) => s.kapitel === kapitelKey);
  return i === -1 ? null : i;
}

export function fortschritt(index) {
  const s = schrittAn(index);
  if (!s) return null;
  return {
    schritt: index + 1,
    schritte: SCHRITTE.length,
    kapitelNr: s.kapitelNr,
    kapitelAnzahl: KAPITEL_ANZAHL,
    imKapitel: s.imKapitel,
    kapitelLaenge: s.kapitelLaenge,
    anteil: (index + 1) / SCHRITTE.length,
  };
}

// ── Gesehen-Marke ───────────────────────────────────────────
// Dieselbe Bauart wie `erstkontakt.js`, aus demselben Grund: `localStorage`
// fehlt in privaten Fenstern und bei gesperrten Seitendaten und WIRFT dort
// beim Zugriff.
//
// ⚠️ Die Voreinstellung ist hier aber die ANDERE als beim Erstkontakt: ohne
// Speicher gilt „noch nicht gesehen". Der Erstkontakt steht ungefragt vor der
// Rundenliste, ein Rundgang wird angeboten — ein Angebot, das zu oft kommt,
// klickt man weg; eine Begrüßung, die zu oft kommt, ist eine Sperre.
const KEY = "tqs.walkthrough.v1";

export function walkthroughGesehen() {
  try {
    return localStorage.getItem(KEY) != null;
  } catch {
    return false;
  }
}

export function merkeWalkthrough() {
  try {
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    // Kein Speicher: der Rundgang wird beim nächsten Mal wieder angeboten.
    // Ärgerlich, aber harmlos — er startet nicht von selbst.
  }
}

export function vergissWalkthrough() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nichts zu tun */
  }
}
