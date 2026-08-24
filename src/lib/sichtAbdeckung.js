// ============================================================
//  SICHT-ABDECKUNG — sieht der SPIELER die Mechanik jemals?
//
//  🔴 Die Lücke zwischen den bestehenden Abnahmen, und sie ist keine kleine:
//
//    `npm run greift`  — bewegt die Einstellung die Wertung?
//    `npm run stufen`  — kann der ADMIN sie erreichen?
//    `npm run tot`     — ruft überhaupt jemand den Code auf?
//    `npm run anzeige` — erklärt das Ranking seine eigene Summe?
//
//  Keine davon fragt: **begegnet einem MITSPIELER das Ergebnis jemals?** Eine
//  Regel kann greifen, erreichbar sein, aufgerufen werden und die Summe
//  erklären — und trotzdem für den, der sie abbekommt, unsichtbar bleiben.
//
//  Genau dort saßen zwei der teuersten Funde dieses Projekts: der Trost-Joker
//  war einstellbar und lieferte null Gutschriften, und die Duell-Schutzregeln
//  standen nur im Screen. Beide sind erst aufgefallen, als jemand eine Messung
//  dafür gebaut hat. Das hier ist die Messung für die verbleibende Frage.
//
//  ── Was ein „Spieler-Screen" ist, wird ABGELEITET ──
//  🔴 Nicht von Hand aufgezählt. Ein Screen gilt als ADMIN-Screen, wenn ihn
//  die Spielerstellung (direkt oder über einen ihrer Bausteine) einbindet —
//  dort wird das Regelwerk EINGESTELLT. Alles andere ist das, was ein
//  Mitspieler während der Runde zu sehen bekommt.
//
//  ⚠️ Ohne diese Trennung meldet die Messung Ruhe: jede Einstellung kommt in
//  der Spielerstellung vor, sonst wäre sie nicht einstellbar. Über ALLE
//  Komponenten gesucht wäre die Antwort immer „ja" — und die Zeile stünde
//  grün da, ohne etwas geprüft zu haben. Dieselbe Falle wie bei `stufen`
//  Teil 2, das über den BLOCK statt über das Blatt suchte.
//
//  ── Textsuche, kein Render-Beweis ──
//  Wie `stufen` und `tot`: sie kann ein Feld übersehen, das nur über eine
//  Variable angesprochen wird, und sie kann einen toten Import für eine
//  Anzeige halten. Dafür kostet sie nichts. Ein Verdacht, den man in zehn
//  Sekunden prüft, ist mehr wert als eine perfekte Analyse, die niemand
//  startet.
//
//  Der Aufrufer reicht die Quelltexte herein (Skript und Test lesen sie je
//  selbst) — so bleibt diese Datei frei von `node:fs` und damit bundlebar.
// ============================================================

import { regelFelder } from "./stufenAbdeckung";

// ── Womit taucht ein Regel-Block in einer ANZEIGE auf? ──────
// Der Feldname allein genügt nicht: ein Spieler-Screen zeigt nicht
// `rules.ereignisse`, sondern ruft `erspielteJoker()`. Hier stehen deshalb je
// Block die Spuren, an denen man ihn in einer Anzeige erkennt.
//
// ⚠️ Wer eine Mechanik ergänzt, trägt ihre Spur hier ein. Ohne Eintrag zählt
// der Feldname — das ist die schwächere, aber nie falsche Vorgabe.
// ── Anzeige-Logik, die NICHT in einer Komponente steht ──────
// 🔴 Der zweite Anlauf-Fehler dieser Messung: die Aufschlüsselung der Wertung
// liegt in `src/lib/breakdown.js`, nicht im Screen — die Komponente rendert
// nur, was von dort kommt. Über die Komponenten allein gesucht galten
// `winnerFloor`, `underdogBoost` und die Nähe-Werte als unsichtbar, obwohl der
// Spieler sie in der Abrechnung als „Sieger-Boden" und „Außenseiter" vor sich
// hat.
//
// ⚠️ Diese Liste ist von Hand gepflegt — und sie ist KEINE Ausnahmeliste zum
// Vollmachen. Hier gehört nur hinein, was tatsächlich Anzeige-Texte für den
// Spieler erzeugt. Wer eine Wertungs-Datei einträgt, um eine Zeile grün zu
// bekommen, hat die Messung abgeschaltet statt einen Befund behoben.
export const ANZEIGE_LIBS = ["breakdown.js"];

export const SPUREN = {
  ereignisse: ["ereignisse", "erspielteJoker", "erspielteLage"],
  joker: ["joker", "kontingent", "jokerFaktor"],
  duell: ["duell", "duellPlan", "zulaessigeZiele"],
  // Fremdjoker: der Spieler sieht nicht den Regel-Block, sondern WER bei ihm
  // eingegriffen hat — und ob er es noch herausnehmen kann (JK6). Genau das
  // ist die Anzeige, nach der hier gesucht wird.
  eingriffe: ["eingriffe", "Fremdjoker", "offeneEingriffe", "aktiveArten"],
  drehrad: ["drehrad", "drehradZiehungen"],
  saison: ["saison", "saisonwetten", "scoreSaison"],
  aufholen: ["aufholen", "catchup", "applyCatchup", "anschluss"],
  // Alleinstellung: der Spieler sieht den Zuschlag als eigene Marke im
  // Ranking (`alleinPunkte`). Ein Bonus, der nur im Total steckt, ist für den
  // Empfänger nicht von einem Rechenfehler zu unterscheiden — dieselbe
  // Begründung wie bei Anschluss-Bonus, Saison-Wetten und Rad.
  alleinstellung: ["alleinstellung", "alleinPunkte", "Alleingang"],
  // Der Spieler sieht nicht den SCHALTER, sondern seine Wirkung in der
  // Aufschlüsselung — das ist die Anzeige, nach der hier gesucht wird.
  winnerFloor: ["winnerFloor", "Sieger-Boden", "tendBoden"],
  underdogBoost: ["underdogBoost", "underdogMult", "Außenseiter"],
  saisonform: ["saisonform", "gestrichen"],
  versaeumnis: ["versaeumnis", "ersatz"],
  bigGame: ["bigGame", "bigGameAufschlag"],
  tabellenBonus: ["tabellenBonus", "mod-tabelle", "Außenseiter nach Tabelle"],
  wettbewerbe: ["wettbewerbe", "wettbewerbGewicht", "anteile"],
  teamMods: ["teamMods", "derby", "findDerby"],
  tippfenster: ["tippfenster", "tippStatus"],
  spiele: ["spiele", "spielauswahl"],
  zeitachse: ["zeitachse", "rundenSpieltag"],
  limitKlassen: ["limitKlassen", "pruefeEinsatz"],
  budget: ["budget", "narren", "preisFuer"],
  jokerBasis: ["jokerBasis", "basisFuer", "darfEinsetzen"],
  regelAbstimmung: ["regelAbstimmung", "antrag", "beschluss"],
  verfassung: ["verfassung", "antragsrecht"],
  tippEinfluss: ["tippEinfluss", "marktTiefe"],
};

// ── Blöcke, die BEWUSST keine eigene Spieler-Anzeige haben ──
// Ein Eintrag hier ist eine Entscheidung, keine Ausnahme zum Vollmachen. Wer
// einen Block einträgt, statt ihn anzuzeigen, muss den Satz vertreten können.
export const OHNE_ANZEIGE = {
  // ⚠️ `displayScale` stand hier als „hat keine eigene Anzeige" — und die
  // Gegenprobe (`ueberholteBegruendungen`) hat es beim ersten Lauf widerlegt:
  // die Spieler-Screens sprechen es an. Eintrag entfernt statt die Prüfung
  // aufgeweicht. Genau dafür gibt es die Gegenprobe.
  reglerFeinheit:
    "Eine Einstellung der Profi-Ansicht selbst (wie fein die Regler rasten). "
    + "Sie hat mit dem Spiel nichts zu tun.",
  oddsMode:
    "Woher die Quoten kommen — Betrieb, nicht Spiel. Der Spieler sieht die "
    + "Quoten, nicht ihre Herkunft.",
  modFloor:
    "Untere Leitplanke des Modifikator-Topfs. Sie greift nur, wenn etwas nach "
    + "unten zieht, und ist dann im Faktor enthalten (Aufschlüsselung).",
  modCap:
    "Obere Leitplanke, dito — der gedeckelte Faktor steht in der "
    + "Aufschlüsselung, der Deckel selbst wäre eine Zahl ohne Ort.",
  name: "Der Runden-Name, keine Mechanik.",
  underdogRampStart:
    "Formt den Außenseiter-Faktor, den der Spieler als EINE Zahl in der "
    + "Aufschlüsselung sieht. Die Rampe selbst wäre die Kurve hinter der Zahl — "
    + "dieselbe Begründung wie bei `modCap`.",
  underdogRampEnd: "Dito — zweiter Punkt derselben Rampe.",
};

// Ist diese Komponente ein ADMIN-Screen? Alles, was die Spielerstellung
// einbindet, stellt das Regelwerk EIN — dort taucht jede Einstellung auf, und
// genau deshalb darf sie dort nicht als „Anzeige" zählen.
//
// `quellen` = { dateiname: quelltext } über alle Komponenten.
// 🔴 Über IMPORT-Zeilen, nicht über das Vorkommen des Namens. Der erste Anlauf
// suchte den nackten Namen im Quelltext — und zog damit `Tippabgabe`,
// `Ranking`, `Einstellungen` und `AuthProvider` in die Admin-Liste, nur weil
// sie in KOMMENTAREN der Spielerstellung erwähnt werden. Ausgerechnet die
// größten Spieler-Screens fielen so aus der Messung, und die Liste der
// „fehlenden" Blöcke war um vier zu lang.
//
// ⚠️ Dieselbe Fehlerklasse, vor der `stufen` und `tot` in ihren Köpfen warnen:
// eine Textsuche, die zu weit greift, meldet nicht zu wenig, sondern zu viel —
// und ein Befund, der sich beim Nachsehen auflöst, kostet Vertrauen in alle
// anderen Zeilen.
const IMPORT_ZEILE = /^\s*import\s+.*?from\s+["'][^"']*\/([A-Za-z0-9_]+)["']/gm;

// ⚠️ TRANSITIV, nicht eine Ebene tief. Der Kopf dieser Datei sagt seit jeher
// „direkt oder über einen ihrer Bausteine" — bis zum 22.08.2026 folgte der Code
// aber nur den Importen der Spielerstellung selbst. Solange dort alles direkt
// eingebunden war, fiel der Unterschied nicht auf. Mit dem Joker-Sondermenü
// (das seine sieben Bausteine selbst importiert) fiel `Ereignisse.jsx` aus der
// Admin-Liste und wäre als Spieler-ANZEIGE durchgegangen — ein Einstell-Screen,
// der als Beleg dafür zählt, dass der Spieler die Einstellung zu sehen bekommt.
// Der Test „die Bausteine MÜSSEN drin sein" hat es gemeldet.
export function adminScreens(quellen = {}, wurzel = "Spielerstellung.jsx") {
  const out = new Set([wurzel]);
  const vorhanden = new Set(Object.keys(quellen).map((d) => d.replace(/\.jsx?$/, "")));
  const offen = [wurzel];
  while (offen.length) {
    const datei = offen.pop();
    for (const treffer of (quellen[datei] ?? "").matchAll(IMPORT_ZEILE)) {
      const name = treffer[1];
      if (!vorhanden.has(name)) continue;
      const alsDatei = `${name}.jsx`;
      if (out.has(alsDatei)) continue;
      out.add(alsDatei);
      offen.push(alsDatei);
    }
  }
  return out;
}

// Welche Regel-Blöcke kommen in KEINEM Spieler-Screen vor?
// `quellen` = { dateiname: quelltext }.
export function ohneSpielerAnzeige(quellen = {}) {
  const admin = adminScreens(quellen);
  // Spieler-Screens PLUS die Anzeige-Libs (siehe `ANZEIGE_LIBS`): die
  // Aufschlüsselung entsteht dort, die Komponente rendert sie nur.
  const spielerText = Object.entries(quellen)
    .filter(([datei]) => !admin.has(datei))
    .map(([, text]) => text)
    .join("\n");

  return regelFelder().filter((feld) => {
    if (OHNE_ANZEIGE[feld]) return false;
    const spuren = SPUREN[feld] ?? [feld];
    return !spuren.some((s) => new RegExp(`\\b${s}\\b`, "i").test(spielerText));
  });
}

// Die Blöcke ohne Anzeige UND ohne Begründung — die eigentliche Lücke.
export function luecken(quellen = {}) {
  return ohneSpielerAnzeige(quellen);
}

// ⚠️ Der umgekehrte Fehler, der genauso zählt: eine Begründung, die nicht mehr
// stimmt. Wer einen Block nachträglich anzeigt und den Eintrag stehen lässt,
// hinterlässt eine Behauptung, die das Gegenteil beschreibt — und beim
// nächsten Durchgang glaubt ihr jemand. Dieselbe Klammer wie
// `ueberholteBegruendungen()` in `stufenAbdeckung.js`.
export function ueberholteBegruendungen(quellen = {}) {
  const admin = adminScreens(quellen);
  // Spieler-Screens PLUS die Anzeige-Libs (siehe `ANZEIGE_LIBS`): die
  // Aufschlüsselung entsteht dort, die Komponente rendert sie nur.
  const spielerText = Object.entries(quellen)
    .filter(([datei]) => !admin.has(datei))
    .map(([, text]) => text)
    .join("\n");
  return Object.keys(OHNE_ANZEIGE)
    .filter((feld) => regelFelder().includes(feld))
    .filter((feld) => (SPUREN[feld] ?? [feld]).some((s) => new RegExp(`\\b${s}\\b`, "i").test(spielerText)));
}
