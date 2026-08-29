// ============================================================
//  ABZEICHEN — der Trophäenschrank
//
//  Andi, 29.08.2026: „evtl. iwelche Abzeichen, die man erhält bspw. für ne
//  krasse Scorestreak, oder riskant aufgegangene Tipps … um sie im
//  Trophäenschrank auszuhängen."
//
//  Und die Einordnung, die den Bau leicht macht:
//    „die abzeichen haben rein kosmetischen Wert bzw als belohnugssystem zum
//     angeben in seinem Profil"
//
//  ── 🔴 Was „kosmetisch“ bedeutet — und was nicht ──
//  Es bedeutet: **kein Abzeichen zahlt Punkte, verschiebt eine Wertung oder
//  greift in die Balance.** Nichts hier taucht in `scoreTip` auf, nichts fällt
//  unter `modCap`, nichts gehört ins Balancing.
//
//  Es bedeutet NICHT, dass die Zahlen egal sind. Ein Abzeichen ist zum
//  ANGEBEN da — und wer damit angibt, wird darauf angesprochen. Steht im
//  Profil „10 exakte Treffer“ und die Rundenstatistik zeigt 9, weil das
//  Abzeichen Ersatz-Tipps mitgezählt hat, ist das Angeben peinlich statt
//  schön. Die Bedingungen lesen deshalb DIESELBEN Signale wie der Rest der
//  App und zählen nichts eigenständig nach.
//
//  ── ⚠️ Der Zuschnitt: je KONTO, mit der Runde beschriftet ──
//  „Baumeister“ ist eine Konto-Sache, „Scharfschütze“ eher eine Runden-Sache
//  — sonst zählte eine Runde mit 1000 Leuten wie eine mit fünf. Gesammelt
//  wird je Konto, und jedes Abzeichen trägt die Runde, in der es erspielt
//  wurde. Das ist beides und lügt bei keinem.
//
//  ── 🔴 ALLE Zahlen sind PLATZHALTER ──
//  Ab wann eine Serie „krass“ ist, ist Balance und damit Endphase (CLAUDE.md).
//  Sie stehen in `LEITERN` an EINER Stelle, damit die Endphase sie an einer
//  Stelle festzurrt statt an dreißig.
//
//  Reine Funktionen, UI-frei.
// ============================================================

// ============================================================
//  🔴 DIE STUFEN — der Schein hinter dem runden Logo
//
//  Andi, 29.08.2026:
//    „die verschiedenen Stufen, Holz, Bronze, Kupfer, Silber, Gold, Platin,
//     diamant … und diese Stufen sind dann eben der Schein bzw leuchtender
//     Hintergund der von mir erzeugten runden Logos“
//
//  ⚠️ **Das ist die Arbeitsteilung, die 180 Bilder spart.** Andi liefert EIN
//  rundes Logo je Abzeichen — 30 Stück. Die Stufe wird NICHT ins Bild gemalt,
//  sondern von der App dahintergelegt. Sonst wären es 30 × 7 = 210 Bilder, die
//  alle zueinander passen müssten.
//
//  ⚠️ Deshalb sind die Logos RUND: ein Kreis lässt sich hinterleuchten, ohne
//  dass der Schein an einer Ecke ausfranst.
//
//  ── Die Reihenfolge ist ANDIS ──
//  Holz · Bronze · Kupfer · Silber · Gold · Platin · Diamant. ⚠️ Üblicher wäre
//  Kupfer VOR Bronze (Bronze ist die Legierung, also das Verarbeitete). Seine
//  Leiter bleibt trotzdem stehen: eine Rangfolge still umzusortieren, weil sie
//  metallurgisch anders hergeht, wäre die Sorte Eigenmächtigkeit, die einen
//  später ratlos vor der eigenen App stehen lässt.
//
//  `schein` ist die Leuchtfarbe, `rand` die Kante. Beides sind Farbwerte und
//  kein CSS — wie daraus ein Verlauf wird, entscheidet die Oberfläche.
// ============================================================
export const STUFEN = [
  { key: "holz",    label: "Holz",    rang: 0, schein: "#8A6A45", rand: "#6B5133" },
  { key: "bronze",  label: "Bronze",  rang: 1, schein: "#B87333", rand: "#8C5522" },
  { key: "kupfer",  label: "Kupfer",  rang: 2, schein: "#D97742", rand: "#A6552C" },
  { key: "silber",  label: "Silber",  rang: 3, schein: "#C8CDD4", rand: "#959BA3" },
  { key: "gold",    label: "Gold",    rang: 4, schein: "#E8B325", rand: "#B4881A" },
  { key: "platin",  label: "Platin",  rang: 5, schein: "#DCE6EA", rand: "#A9BFC7" },
  { key: "diamant", label: "Diamant", rang: 6, schein: "#8FE3F0", rand: "#4FB8CC" },
];

export const STUFE = Object.fromEntries(STUFEN.map((s) => [s.key, s]));

// ⚠️ `null` und keine Ersatzstufe: eine erfundene Stufe hinter einem Abzeichen
// behauptet eine Seltenheit, die niemand vergeben hat.
export function stufeVon(key) {
  return STUFE[String(key ?? "")] ?? null;
}

// ============================================================
//  🔴 DIE LEITERN — Andis Frage: „welche Voraussetzungen du für Erreichung
//  der Stufen vorschlägst“
//
//  Zwei Bauarten, und die Unterscheidung ist nicht kosmetisch:
//
//  **① Zählbare Abzeichen** tragen eine LEITER: dasselbe Maß, sieben
//  Schwellen. Man behält das Abzeichen, und der Schein dahinter wird besser.
//  Genau dafür ist Andis Bauweise gemacht — ein Logo, sieben Hintergründe.
//
//  **② Einmalige Abzeichen** sind ja/nein („eine Runde erstellt“). Sie
//  bekommen EINE feste Stufe, die ihre Seltenheit ausdrückt.
//
//  ⚠️ **Warum nicht alles zählbar?** Weil „Baumeister Diamant“ nichts heißt.
//  Sieben Stufen auf einer Ja/Nein-Frage sind sechs erfundene Stufen — und
//  eine erfundene Stufe ist genau das, was diese Datei sonst überall vermeidet.
//
//  ── Die Form der Leitern: grob verdoppelnd, nicht linear ──
//  Von Holz nach Diamant soll ein WEG liegen, keine Fleißaufgabe. Linear
//  (1·2·3·4·5·6·7) wäre nach zwei Wochen durchgespielt, und Diamant hieße
//  danach nichts mehr.
//
//  ⏳ ALLE Zahlen sind Platzhalter (Balancing = Endphase).
// ============================================================
export const LEITERN = {
  // Zählungen über die ganze Saison — der lange Weg.
  menge:  [1, 3, 6, 12, 25, 45, 75],
  // Serien über Spieltage — kürzer, weil eine Serie ungleich härter ist.
  serie:  [2, 3, 5, 8, 12, 17, 25],
  // Seltene Einzelereignisse (Außenseiter, Alleingänge) — sehr flach.
  selten: [1, 2, 4, 7, 12, 20, 30],
  // Menschen: Mitspieler, Übernahmen. Wächst anders als eigenes Zutun.
  leute:  [1, 3, 5, 10, 25, 50, 100],
  // Tippfleiß — die einzige Leiter, die fast jeder weit hochkommt.
  fleiss: [1, 25, 75, 150, 300, 600, 1000],
};

// ============================================================
//  DIE BILANZ — worauf die Bedingungen schauen
//
//  🔴 Ein flaches Objekt, und jedes Feld kommt aus einer Rechnung, die es
//  ohnehin schon gibt. Die Bedingungen lesen NUR daraus — keine Schleife über
//  Roh-Tipps, kein eigenes Nachzählen.
//
//  ⚠️ Fehlt ein Feld, ist es `0`/`false`, und das Abzeichen wird einfach nicht
//  vergeben. Es darf NIE abstürzen: der Trophäenschrank ist der harmloseste
//  Screen der App und wäre der dümmste Ort für einen Absturz.
// ============================================================
export const LEERE_BILANZ = {
  // ── Treffsicherheit ──
  exakteTreffer: 0,         // Ebene `exakt` je Tipp (scoreTip)
  exaktSerie: 0,            // längste Folge von Spieltagen mit exaktem Treffer
  hellseher: 0,             // exakt + alle getippten Schützen, im selben Spiel
  doppelpacks: 0,           // ein getippter Schütze trifft zweimal
  schuetzenTreffer: 0,      // richtig getippte Torschützen insgesamt
  ueberSchnittSerie: 0,     // Spieltage in Folge über dem Rundenschnitt
  // ── Mut ──
  aussenseiterTreffer: 0,   // aufgegangene Außenseiter-Tipps
  alleingaenge: 0,          // als Einziger richtig (alleinstellung.js)
  jokerAussenseiter: 0,     // Joker auf einen Außenseiter, der aufging
  bestesSpielFaktor: 0,     // bestes Einzelspiel / üblicher Spieltagsertrag
  // ── Ausdauer ──
  tipps: 0,                 // abgegebene Tipps OHNE Ersatz (autoTip)
  tippSerie: 0,             // längste Folge abgegebener Spieltage
  fuehrungSpieltage: 0,     // Spieltage als Tabellenführer der Runde
  saisonsBeendet: 0,        // durchgespielte Saisons
  aufholsprung: false,      // untere → obere Hälfte in wenigen Spieltagen
  // ── Runde und Rolle ──
  eigeneRunden: 0,          // selbst erstellte Runden
  rundenGroesse: 0,         // Mitspieler der größten eigenen Runde
  uebernahmen: 0,           // Übernahmen des eigenen Codes (presets)
  abstimmungen: 0,          // Teilnahmen an Regel-Abstimmungen
  mitgespielteRunden: 0,    // Runden, in denen man Mitglied war
  // ── Selbstironie ──
  ohneExaktSerie: 0,        // längste Folge OHNE exakten Treffer
  favoritenSerie: 0,        // längste Folge von Tipps auf den Favoriten
  knappDaneben: 0,          // richtiger Sieger, genau ein Tor daneben
  nullSpieltage: 0,         // Spieltage ohne einen einzigen Punkt
  spottEmpfangen: 0,        // eingegangene Spott-Nachrichten (SP1)
  ersterTrefferSpieltag: 0, // an welchem Spieltag der erste exakte Treffer kam
  letzterUndWeiter: false,  // Spieltags-Letzter und danach wieder dabei
};

// Damit eine unvollständige Bilanz nie zum Absturz führt.
export function sanitizeBilanz(b = {}) {
  const q = b && typeof b === "object" ? b : {};
  const out = { ...LEERE_BILANZ };
  for (const k of Object.keys(LEERE_BILANZ)) {
    const v = q[k];
    if (typeof LEERE_BILANZ[k] === "boolean") out[k] = v === true;
    else out[k] = Number.isFinite(v) ? v : 0;
  }
  return out;
}

export const GRUPPEN = [
  { key: "treffsicherheit", label: "Treffsicherheit", text: "Für die, die es können." },
  { key: "mut", label: "Mut", text: "Nicht Richtigliegen — gegen die Quote Richtigliegen." },
  { key: "ausdauer", label: "Ausdauer", text: "Dranbleiben, Woche für Woche." },
  { key: "rolle", label: "Runde und Rolle", text: "Für alle, die etwas beitragen." },
  { key: "selbstironie", label: "Selbstironie", text: "Die Abzeichen, über die gelacht wird." },
];

// ============================================================
//  DER KATALOG — 30 Stück
//
//  ── ⚠️ Wie die Bilder dazukommen (Andis Weg, 29.08.2026) ──
//    „erstelle mir 30 logos mit fussball motiven, und von denen schneide ich
//     dann die besten raus und geb sie dir mit zuordnung“
//
//  🔴 Das dreht die Rolle von `motiv` um, und das ist gut so: es ist KEIN
//  Auftrag an die Bild-Erzeugung mehr, sondern nur noch ein Vorschlag, welches
//  Motiv gut passen würde. Verbindlich ist allein der `key` — Andi liefert
//  eine Liste „Logo 7 → hasardeur“, und die Datei heißt danach `hasardeur.png`.
//  Mehr Zuordnung braucht es nicht, und deshalb darf sich ein `motiv` jederzeit
//  ändern, ohne dass irgendetwas nachgezogen werden muss.
//
//  `key`     — stabil, für immer. Dateiname des Bildes UND Wert in der
//              Datenbank. Wer ihn ändert, wirft erspielte Abzeichen weg.
//  `was`     — was dransteht, in der Sprache der Runde.
//  `motiv`   — Bildvorschlag, unverbindlich (siehe oben).
//  `mass`    — Feld der Bilanz (zählbare Abzeichen) …
//  `leiter`  — … samt der Leiter, an der die sieben Stufen hängen.
//  `stufe`   — ODER eine feste Stufe (einmalige Abzeichen).
//  `gilt(b)` — nur bei einmaligen: die Ja/Nein-Frage.
//  `nurWenn` — Zusatzbedingung, unabhängig von der Zählung.
// ============================================================
export const ABZEICHEN = [
  // ── Treffsicherheit ──
  {
    key: "treffsicher", label: "Treffsicher", gruppe: "treffsicherheit",
    mass: "exakteTreffer", leiter: "menge",
    was: "exakt getroffene Endstände",
    motiv: "Ein Ball, der gerade die Torlinie überquert",
  },
  {
    key: "scharfschuetze", label: "Scharfschütze", gruppe: "treffsicherheit",
    mass: "exaktSerie", leiter: "serie",
    was: "Spieltage in Folge mit mindestens einem exakten Treffer",
    motiv: "Zielscheibe aus konzentrischen Ringen, ein Ball in der Mitte",
  },
  {
    key: "kennerblick", label: "Kennerblick", gruppe: "treffsicherheit",
    mass: "schuetzenTreffer", leiter: "menge",
    was: "richtig getippte Torschützen",
    motiv: "Ein Auge, dessen Pupille ein Ball ist",
  },
  {
    key: "hellseher", label: "Hellseher", gruppe: "treffsicherheit",
    mass: "hellseher", leiter: "selten",
    was: "Spiele mit exaktem Ergebnis UND allen Torschützen",
    motiv: "Eine Kristallkugel mit einem Ball darin",
  },
  {
    key: "doppelpack", label: "Doppelpack", gruppe: "treffsicherheit",
    mass: "doppelpacks", leiter: "selten",
    was: "getippte Schützen, die zweimal im selben Spiel trafen",
    motiv: "Zwei Bälle im Netz, einer noch in der Luft",
  },
  {
    key: "uhrwerk", label: "Uhrwerk", gruppe: "treffsicherheit",
    mass: "ueberSchnittSerie", leiter: "serie",
    was: "Spieltage in Folge über dem Rundenschnitt",
    motiv: "Ein Zifferblatt, dessen Zeiger Ballspitzen sind",
  },

  // ── Mut ──
  {
    key: "aussenseiter", label: "Außenseiter-Freund", gruppe: "mut",
    mass: "aussenseiterTreffer", leiter: "selten",
    was: "aufgegangene Tipps auf einen Außenseiter",
    motiv: "Ein kleiner Ball, der einen großen umwirft",
  },
  {
    key: "hasardeur", label: "Hasardeur", gruppe: "mut",
    mass: "jokerAussenseiter", leiter: "selten",
    was: "Joker auf einen Außenseiter — und er ging auf",
    motiv: "Ein Würfel, dessen Augen Bälle sind",
  },
  {
    key: "alleingang", label: "Alleingang", gruppe: "mut",
    mass: "alleingaenge", leiter: "selten",
    was: "Ausgänge, auf die du als Einziger getippt hast — und sie kamen",
    motiv: "Ein Trikot mit der Nummer 1 auf leerem Rasen",
    // ⚠️ In einer Runde zu zweit ist man fast immer allein, sobald der andere
    // danebenliegt. Ohne Mindestgröße wäre das Abzeichen geschenkt.
    nurWenn: (b) => b.rundenGroesse >= 5,
  },
  {
    key: "wahnsinn-mit-methode", label: "Wahnsinn mit Methode", gruppe: "mut",
    stufe: "diamant",
    was: "Ein einzelnes Spiel bringt mehr als das Doppelte eines üblichen Spieltags",
    motiv: "Ein Blitz, der in ein Tornetz einschlägt",
    gilt: (b) => b.bestesSpielFaktor >= 2,
  },
  {
    key: "kaltschnaeuzig", label: "Kaltschnäuzig", gruppe: "mut",
    stufe: "gold",
    was: "Ein Joker auf einen Außenseiter ging auf — und du hast schon drei davon getroffen",
    motiv: "Ein Spielkarten-Joker mit Fußball statt Narrenkappe",
    gilt: (b) => b.jokerAussenseiter >= 1 && b.aussenseiterTreffer >= 3,
  },

  // ── Ausdauer ──
  {
    key: "immer-dabei", label: "Immer dabei", gruppe: "ausdauer",
    mass: "tippSerie", leiter: "serie",
    was: "Spieltage in Folge abgegeben, ohne Ersatz-Tipp",
    motiv: "Ein Kalenderblatt mit einer Reihe Häkchen",
  },
  {
    key: "vielspieler", label: "Vielspieler", gruppe: "ausdauer",
    mass: "tipps", leiter: "fleiss",
    was: "abgegebene Tipps",
    motiv: "Ein Stapel Spielscheine, oben ein Ball",
  },
  {
    key: "platzhirsch", label: "Platzhirsch", gruppe: "ausdauer",
    mass: "fuehrungSpieltage", leiter: "menge",
    was: "Spieltage als Tabellenführer deiner Runde",
    motiv: "Ein Geweih, dessen Enden Eckfahnen sind",
  },
  {
    key: "veteran", label: "Veteran", gruppe: "ausdauer",
    mass: "saisonsBeendet", leiter: "selten",
    was: "durchgespielte Saisons",
    motiv: "Ein abgelaufener Fußballschuh mit Lorbeerzweig",
  },
  {
    key: "aufholjagd", label: "Aufholjagd", gruppe: "ausdauer",
    stufe: "silber",
    was: "Von der unteren in die obere Hälfte, innerhalb weniger Spieltage",
    motiv: "Ein Pfeil, der sich um einen Ball nach oben windet",
    gilt: (b) => b.aufholsprung === true,
  },
  {
    key: "eiserner", label: "Eiserner", gruppe: "ausdauer",
    stufe: "gold",
    was: "Eine ganze Hinrunde ohne einen einzigen verpassten Spieltag",
    motiv: "Ein Anker, dessen Schaft ein Torpfosten ist",
    gilt: (b) => b.tippSerie >= 17,
  },

  // ── Runde und Rolle ──
  {
    key: "baumeister", label: "Baumeister", gruppe: "rolle",
    mass: "eigeneRunden", leiter: "selten",
    was: "selbst erstellte Runden",
    motiv: "Ein Reißbrett mit Spielfeldlinien",
  },
  {
    key: "gastgeber", label: "Gastgeber", gruppe: "rolle",
    mass: "rundenGroesse", leiter: "leute",
    was: "Mitspieler in deiner größten eigenen Runde",
    motiv: "Ein Wimpel-Tausch vor dem Anstoß",
    nurWenn: (b) => b.eigeneRunden >= 1,
  },
  {
    key: "wegbereiter", label: "Wegbereiter", gruppe: "rolle",
    mass: "uebernahmen", leiter: "leute",
    was: "Übernahmen deines Codes durch andere",
    motiv: "Ein Schlüssel, dessen Bart ein Spielfeld ist",
  },
  {
    key: "schiedsrichter", label: "Schiedsrichter", gruppe: "rolle",
    mass: "abstimmungen", leiter: "menge",
    was: "Teilnahmen an Regel-Abstimmungen deiner Runde",
    motiv: "Eine Pfeife, deren Kugel ein Ball ist",
  },
  {
    key: "weltenbummler", label: "Weltenbummler", gruppe: "rolle",
    mass: "mitgespielteRunden", leiter: "selten",
    was: "Runden, in denen du mitgespielt hast",
    motiv: "Ein Koffer mit Aufklebern in Vereinsfarben",
  },
  {
    key: "neuling", label: "Neuling", gruppe: "rolle",
    stufe: "holz",
    was: "Dein erster abgegebener Tipp",
    motiv: "Ein nagelneuer Ball, noch mit Aufkleber",
    // ⚠️ Das einzige Abzeichen, das jeder bekommt — und deshalb kein Füllsel:
    // ein leerer Schrank beim ersten Blick sagt „hier gibt es nichts zu
    // holen“. Eines drin sagt „hier gibt es 29 weitere“.
    gilt: (b) => b.tipps >= 1,
  },

  // ── Selbstironie ──
  // 🔴 Nicht weglassen. Eine Sammlung, in der man nur glänzen kann, wird
  // langweilig; über diese hier wird gelacht, und sie werden am häufigsten
  // hergezeigt. Der Ton zieht auf, er lacht nicht aus (docs/tonfall.md).
  {
    key: "pechvogel", label: "Pechvogel", gruppe: "selbstironie",
    mass: "ohneExaktSerie", leiter: "serie",
    was: "Spieltage in Folge ohne einen exakten Treffer",
    motiv: "Eine Taube auf der Latte, der Ball fliegt vorbei",
  },
  {
    key: "der-sichere", label: "Der Sichere", gruppe: "selbstironie",
    mass: "favoritenSerie", leiter: "serie",
    was: "Tipps in Folge auf den Favoriten, ohne einen Außenseiter",
    motiv: "Ein aufgespannter Regenschirm auf dem Rasen",
  },
  {
    key: "knapp-daneben", label: "Knapp daneben", gruppe: "selbstironie",
    mass: "knappDaneben", leiter: "menge",
    was: "Tipps mit richtigem Sieger und genau einem Tor daneben",
    motiv: "Ein Ball am Pfosten, der Abdruck noch sichtbar",
  },
  {
    key: "nullnummer", label: "Nullnummer", gruppe: "selbstironie",
    mass: "nullSpieltage", leiter: "selten",
    was: "Spieltage ohne einen einzigen Punkt",
    motiv: "Eine große Null aus Torpfosten gebaut",
  },
  {
    key: "zielscheibe", label: "Zielscheibe", gruppe: "selbstironie",
    mass: "spottEmpfangen", leiter: "menge",
    was: "empfangene Spott-Nachrichten deiner Mitspieler",
    motiv: "Ein Ball mit aufgemalter Zielscheibe und Sonnenbrille",
  },
  {
    key: "spaetzuender", label: "Spätzünder", gruppe: "selbstironie",
    stufe: "bronze",
    was: "Dein erster exakter Treffer kam erst nach dem 20. Spieltag",
    motiv: "Ein Streichholz, das erst beim letzten Versuch zündet",
    gilt: (b) => b.ersterTrefferSpieltag > 20,
  },
  {
    key: "letzter-held", label: "Letzter Held", gruppe: "selbstironie",
    stufe: "bronze",
    was: "Spieltags-Letzter — und trotzdem am nächsten Spieltag wieder dabei",
    motiv: "Ein Wischmop im leeren Stadion",
    gilt: (b) => b.letzterUndWeiter === true,
  },
];

export const ABZEICHEN_NACH_KEY = Object.fromEntries(ABZEICHEN.map((a) => [a.key, a]));

// ============================================================
//  Vergabe
// ============================================================

// Welche Stufe hat dieser Spieler bei DIESEM Abzeichen erreicht?
// `null` = noch gar keine.
//
// ⚠️ Zählbare Abzeichen laufen ihre Leiter hoch, einmalige haben ihre feste
// Stufe oder nichts. Beides beantwortet dieselbe Frage, deshalb steht es in
// EINER Funktion — zwei Wege hierhin wären zwei Wahrheiten über „was habe ich
// erreicht".
export function erreichteStufe(abzeichen, bilanz) {
  if (!abzeichen) return null;
  const b = sanitizeBilanz(bilanz);
  try {
    // Zusatzbedingung, die unabhängig von der Zählung gelten muss.
    if (typeof abzeichen.nurWenn === "function" && !abzeichen.nurWenn(b)) return null;

    if (abzeichen.mass) {
      const wert = b[abzeichen.mass] ?? 0;
      const leiter = LEITERN[abzeichen.leiter];
      if (!Array.isArray(leiter)) return null;
      let erreicht = null;
      for (let i = 0; i < leiter.length && i < STUFEN.length; i += 1) {
        if (wert >= leiter[i]) erreicht = STUFEN[i];
      }
      return erreicht;
    }

    if (typeof abzeichen.gilt === "function") {
      return abzeichen.gilt(b) === true ? stufeVon(abzeichen.stufe) : null;
    }
  } catch {
    // 🔴 Der Trophäenschrank ist der harmloseste Screen der App und wäre der
    // dümmste Ort für einen Absturz.
    return null;
  }
  return null;
}

// Was fehlt bis zur nächsten Stufe? Für den Schrank, der auch zeigen soll, was
// noch zu holen ist. `null` = nichts mehr (Diamant) oder nicht zählbar.
export function naechsteStufe(abzeichen, bilanz) {
  const leiter = LEITERN[abzeichen?.leiter];
  if (!abzeichen?.mass || !Array.isArray(leiter)) return null;
  const b = sanitizeBilanz(bilanz);
  const wert = b[abzeichen.mass] ?? 0;
  for (let i = 0; i < leiter.length && i < STUFEN.length; i += 1) {
    if (wert < leiter[i]) {
      return { stufe: STUFEN[i], braucht: leiter[i], fehlt: leiter[i] - wert };
    }
  }
  return null;
}

// Alle erspielten Abzeichen samt erreichter Stufe.
export function erspielte(bilanz) {
  const b = sanitizeBilanz(bilanz);
  return ABZEICHEN
    .map((a) => ({ abzeichen: a, stufe: erreichteStufe(a, b) }))
    .filter((e) => e.stufe !== null);
}

// Der ganze Schrank: erspielt UND offen, denn ein Schrank, der nur zeigt was
// man hat, gibt keinen Grund weiterzuspielen.
export function schrank(bilanz, erworbenAm = {}) {
  const b = sanitizeBilanz(bilanz);
  return ABZEICHEN.map((a) => {
    const stufe = erreichteStufe(a, b);
    return {
      ...a,
      stufe,
      erspielt: stufe !== null,
      naechste: naechsteStufe(a, b),
      // `erworbenAm[key] = { am, rundenId, rundenName }` — wann und wo. Kommt
      // aus der Datenbank, nicht aus dieser Rechnung.
      ...(erworbenAm?.[a.key] ?? {}),
    };
  });
}

export function nachGruppen(bilanz, erworbenAm = {}) {
  const alle = schrank(bilanz, erworbenAm);
  return GRUPPEN
    .map((g) => ({ ...g, abzeichen: alle.filter((a) => a.gruppe === g.key) }))
    .filter((g) => g.abzeichen.length);
}

// ⚠️ EINE Stelle für den Bildpfad. Andi liefert die PNGs als Satz nach; bis
// dahin gibt es das Bild nicht, und die Oberfläche zeigt die Grundform.
// Wer den Pfad an zwei Stellen zusammenbaut, hat beim Nachliefern zwei Stellen
// zu ändern.
export const BILD_ORDNER = "/abzeichen";
export function bildPfad(key) {
  return ABZEICHEN_NACH_KEY[key] ? `${BILD_ORDNER}/${key}.png` : null;
}
