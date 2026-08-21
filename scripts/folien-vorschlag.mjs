// ============================================================
//  FOLIEN-VORSCHLAG — die adminseitige Spielerstellung zu Ende gezeichnet
//
//  Aufruf:  npx vite-node scripts/folien-vorschlag.mjs
//
//  🔴 Andi am 21.08.2026: „mach du dann mal die Admin-Spielerstellung zu Ende
//  und ich korrigier dann und passe an."
//
//  Gefüllt werden seine LEEREN Folien 3–11; Folie 1 und 2 bleiben unberührt.
//  Geschrieben wird in eine neue Datei — sein Original zu überschreiben wäre
//  unumkehrbar.
//
//  ⚠️ Das hier ist ein VORSCHLAG, kein Befund. Die Reihenfolge folgt dem, was
//  heute in `Spielerstellung.jsx` steht, plus den Bibliotheken, die Andi auf
//  Folie 1 angelegt hat. Wo ich etwas erfunden habe, steht es in einem orangen
//  Kasten — dann ist es als Frage erkennbar und nicht als gesetzter Aufbau.
//
//  ⚠️ Die orangen Kästen sind hier ABSICHTLICH auch meine Rückfragen. Andis
//  Verabredung ist „orange heißt umzusetzen"; solange die Datei von mir kommt,
//  heißt sie „hierüber musst du entscheiden". Beim Zurückspielen wird daraus
//  wieder sein Auftrag.
// ============================================================
import { leseZip, schreibeZip, kasten, text, pfeil, CM } from "./schreib-pptx.mjs";

const QUELLE = "C:/Users/andit/OneDrive/Dokumente/Quotentippen.pptx";
const ZIEL = "C:/Users/andit/OneDrive/Dokumente/Quotentippen-Vorschlag.pptx";

// Maße aus Andis Datei: 19,1 × 33,9 cm, Trennstrich bei 11,06 cm.
const L_X = 0.5 * CM;
const L_W = 9.4 * CM;
const R_X = 11.6 * CM;
const R_W = 7.0 * CM;

// ── Ein kleiner Setzer, damit ich Höhen nicht von Hand addiere ──
// Jede Spalte führt ihren eigenen Stand; `sprung` setzt Abstand dazwischen.
function setzer(startY = 0.5 * CM) {
  return { y: startY, nimm(h, abstand = 0.25 * CM) { const y = this.y; this.y += h + abstand; return y; } };
}

let id = 100;
const naechsteId = () => ++id;

// Bequemlichkeiten
const K = (s, x, w, zeilen, h, ton, groesse) =>
  kasten({ id: naechsteId(), x, y: s.nimm(h), w, h, zeilen, ton, groesse });
const T = (s, x, w, zeilen, h, groesse) =>
  text({ id: naechsteId(), x, y: s.nimm(h), w, h, zeilen, groesse });

// ── Die Folien ──────────────────────────────────────────────
function folie3() {
  const l = setzer(); const r = setzer();
  const teile = [];
  teile.push(K(l, L_X, L_W, ["Sonderregeln je Wettbewerb"], 0.8 * CM, "normal", 1400));
  teile.push(T(l, L_X, L_W, [
    "Was hier steht, gilt NUR für diese Liga. Alles Übrige bleibt bei der Einstellung der Runde.",
  ], 1.0 * CM));
  teile.push(K(l, L_X, L_W, ["Bundesliga", "Tabellenzonen · Spieltage · Begegnungen"], 1.3 * CM));
  teile.push(K(l, L_X, L_W, ["Tabellenzonen", "Spitze 1–4 · Europa 1–7 · Mitte 8–13 · Abstieg 14–18"], 1.3 * CM));
  teile.push(T(l, L_X, L_W, [
    "Mehrere Zonen gleichzeitig möglich. Getippt wird, wer in EINER der Zonen steht.",
  ], 0.9 * CM));
  teile.push(K(l, L_X, L_W, ["Nur bestimmte Spieltage", "ab Spieltag … bis Spieltag …"], 1.1 * CM));
  teile.push(K(l, L_X, L_W, ["Feste Begegnungsliste", "z. B. nur die Traditionsduelle"], 1.1 * CM));
  // Höhe merken, damit der Pfeil GENAU von hier zum Fenstertitel läuft.
  const yLaden = l.y + 0.45 * CM;
  teile.push(K(l, L_X, L_W, ["Betippungsauswahl aus Bibliothek laden"], 0.9 * CM));
  teile.push(K(l, L_X, L_W, [
    "AUFTRAG: Gewichtung gehört hierher",
    "Liga- und Mannschafts-Aufschläge sind gebaut, liegen aber woanders. Sie sollen bei den Sonderregeln je Wettbewerb stehen.",
  ], 2.2 * CM, "auftrag", 1100));

  teile.push(K(r, R_X, R_W, ["Bibliothek: Betippungsauswahl"], 0.8 * CM, "normal", 1400));
  teile.push(K(r, R_X, R_W, ["Suche", "Filter: Relevanz · Beliebtheit"], 1.1 * CM));
  teile.push(K(r, R_X, R_W, [
    "Variante 1 — „Nur die Spitze\"",
    "Kurzbeschreibung · von wem · Beliebtheit · Bewertung",
  ], 1.8 * CM));
  teile.push(K(r, R_X, R_W, [
    "Variante 2 — „Abstiegskampf im Endspurt\"",
    "… wie davor",
  ], 1.8 * CM));
  teile.push(K(r, R_X, R_W, ["Variante 3 … wie davor"], 1.2 * CM));
  teile.push(K(r, R_X, R_W, [
    "AUFTRAG: Was steht in der Kurzbeschreibung?",
    "Vorschlag: Was ausgewählt wird · wie viele Spiele je Spieltag daraus folgen · wofür es sich eignet.",
  ], 2.2 * CM, "auftrag", 1100));
  teile.push(pfeil({ id: naechsteId(), x: L_X + L_W, y: yLaden, y2: 0.9 * CM, w: R_X - (L_X + L_W) }));
  return teile;
}

function folie4() {
  const l = setzer();
  const teile = [];
  teile.push(K(l, L_X, L_W, ["Zusätze"], 0.8 * CM, "normal", 1400));
  teile.push(T(l, L_X, L_W, [
    "Das Quotentippen steht schon. Alles hier ist freiwillig und lässt sich einzeln zuschalten.",
  ], 1.0 * CM));
  teile.push(K(l, L_X, L_W, ["Joker", "aus · an"], 1.1 * CM));
  teile.push(K(l, L_X, L_W, ["Ereignisse & Drehrad", "aus · an"], 1.1 * CM));
  teile.push(K(l, L_X, L_W, ["Modifikatoren", "aus · an"], 1.1 * CM));
  teile.push(K(l, L_X, L_W, ["Fairness", "aus · an"], 1.1 * CM));
  teile.push(K(l, L_X, L_W, ["Saison-Wetten", "aus · an"], 1.1 * CM));
  teile.push(K(l, L_X, L_W, ["Mitbestimmung", "aus · an"], 1.1 * CM));
  teile.push(K(l, L_X, L_W, [
    "AUFTRAG: Braucht es diese Übersicht?",
    "Sie kostet einen Schritt, gibt aber einen Überblick, bevor es ins Detail geht. Alternative: die Abschnitte stehen einfach untereinander.",
  ], 2.4 * CM, "auftrag", 1100));
  return teile;
}

function folieMitBibliothek(titel, links, bibTitel, bibEintraege, auftrag) {
  const l = setzer(); const r = setzer();
  const teile = [];
  teile.push(K(l, L_X, L_W, [titel], 0.8 * CM, "normal", 1400));
  let yLaden = null;
  for (const z of links) {
    if (Array.isArray(z) && /Bibliothek laden/.test(z[0])) yLaden = l.y + 0.45 * CM;
    teile.push(Array.isArray(z)
      ? K(l, L_X, L_W, z, z.length > 1 ? 1.3 * CM : 0.9 * CM)
      : T(l, L_X, L_W, [z], 1.0 * CM));
  }
  if (auftrag) teile.push(K(l, L_X, L_W, auftrag, 2.2 * CM, "auftrag", 1100));

  if (bibTitel) {
    teile.push(K(r, R_X, R_W, [bibTitel], 0.8 * CM, "normal", 1400));
    teile.push(K(r, R_X, R_W, ["Suche", "Filter: Relevanz · Beliebtheit"], 1.1 * CM));
    for (const e of bibEintraege) teile.push(K(r, R_X, R_W, e, 1.8 * CM));
    teile.push(K(r, R_X, R_W, ["… wie davor"], 0.9 * CM));
    teile.push(pfeil({ id: naechsteId(), x: L_X + L_W, y: yLaden ?? 2.0 * CM, y2: 0.9 * CM, w: R_X - (L_X + L_W) }));
  }
  return teile;
}

const PLAN = {
  3: folie3,
  4: folie4,
  5: () => folieMitBibliothek(
    "Joker",
    [
      "Ein Joker hebt einzelne Spiele hervor. Wer ihn setzt, entscheidet der Tipper — der Admin legt fest, welche Art es gibt.",
      ["Art", "Ein Joker · Wichtigkeit verteilen"],
      ["Stärke", "Faktor bzw. Stufen"],
      ["Passive Joker", "Heimspiele · Mut gegen den Favoriten"],
      ["Joker-Ökonomie", "woher sie kommen, was sie kosten"],
      ["Joker aus Bibliothek laden"],
    ],
    "Teilbibliothek: Joker",
    [
      ["Joker-Satz 1 — „Klassisch\"", "Kurzbeschreibung · von wem · Beliebtheit · Bewertung"],
      ["Joker-Satz 2 — „Viel Auswahl\"", "… wie davor"],
    ],
    [
      "AUFTRAG: Name für „Wichtigkeit verteilen\"",
      "„Ranking\" ist raus — es meint im Code die Reihenfolge DEINER SPIELE, wird aber als Rangliste der Spieler gelesen.",
    ],
  ),
  6: () => folieMitBibliothek(
    "Ereignisse & Drehrad",
    [
      "Ereignisse greifen von allein, wenn eine Bedingung eintritt. Das Drehrad lost sie aus.",
      ["Ereignisse", "welche · wie stark · wie oft"],
      ["Auslöser", "Bedingung · Zeitraum · Höchstzahl je Saison"],
      ["Drehrad", "Felder · Gewichte · wann gedreht wird"],
      ["Ereignisse aus Bibliothek laden"],
    ],
    "Teilbibliothek: Ereignisse",
    [
      ["Ereignis-Satz 1 — „Ruhig\"", "Kurzbeschreibung · von wem · Beliebtheit · Bewertung"],
      ["Ereignis-Satz 2 — „Viel los\"", "… wie davor"],
    ],
    [
      "AUFTRAG: Eigener Ereignis-Code?",
      "Heute trägt ein Teil-Code Joker UND Ereignisse UND Drehrad zusammen. Sollen sie einzeln teilbar sein?",
    ],
  ),
  7: () => folieMitBibliothek(
    "Modifikatoren",
    [
      "Sie verändern, wie viel ein einzelnes Spiel zählt. Alle Aufschläge werden addiert und gemeinsam gedeckelt.",
      ["Außenseiter nach Quote", "ab Quotenschwelle"],
      ["Außenseiter nach Tabelle", "Plätze oder Punkte · ab Spieltag · Ersatzweg"],
      ["Spitzenspiel", "nach Quoten-Spannung"],
      ["Derby und Team-Faktoren", "je Verein einstellbar"],
      ["Torarm / torreich", "nach erwarteter Torzahl"],
      ["Deckel", "wie viel ein Spiel höchstens zählen darf"],
    ],
    null, [],
    [
      "AUFTRAG: Welche aus dem Katalog?",
      "17 weitere sind ohne neue Datenquelle baubar (design/modifikatoren-katalog.md). Welche sollen rein?",
    ],
  ),
  8: () => folieMitBibliothek(
    "Fairness",
    [
      "Damit eine Runde nicht nach fünf Spieltagen entschieden ist.",
      ["Aufholmechanik", "Stärke · Schwelle · wen sie betrifft"],
      ["Versäumnis", "was passiert, wenn jemand nicht tippt"],
      ["Saisonform", "Streichergebnisse · Gewichtung über die Zeit"],
    ],
    null, [],
    null,
  ),
  9: () => folieMitBibliothek(
    "Saison-Wetten & Märkte",
    [
      "Tipps, die über den einzelnen Spieltag hinausgehen.",
      ["Saison-Wetten", "Meister · Absteiger · Torschützenkönig"],
      ["Wann abgegeben", "ab Spieltag … bis Spieltag …"],
      ["Märkte je Spiel", "Ergebnis · Torschützen"],
    ],
    null, [],
    null,
  ),
  10: () => folieMitBibliothek(
    "Mitbestimmung & Freigaben",
    [
      "Wer darf die Regeln ändern, nachdem die Runde läuft?",
      ["Regel-Abstimmung", "wer · Mehrheit · Quorum · Dauer"],
      ["Wirkung ab", "nächster Spieltag · Vorlauf"],
      ["Verfassung", "was gar nicht änderbar ist"],
      ["Freigaben", "was Mitspieler dürfen"],
    ],
    null, [],
    [
      "AUFTRAG: Gehört das in die Erstellung?",
      "Es betrifft die laufende Runde. Vielleicht besser im Runden-Hub, mit einem Hinweis hier.",
    ],
  ),
  11: () => folieMitBibliothek(
    "Prüfen & Anlegen",
    [
      "Der letzte Schritt: nachsehen, was eingestellt ist, und die Runde anlegen.",
      ["Zusammenfassung", "alles in Klartext, nicht als Zahlen"],
      ["Thermometer", "wie ausgewogen die Auswahl ist"],
      ["Aufwand je Spieltag", "wie viele Entscheidungen ein Mitspieler hat"],
      ["Als Vorlage in die Bibliothek legen"],
      ["Runde anlegen"],
    ],
    null, [],
    [
      "AUFTRAG: Eigene Vorlage veröffentlichen",
      "Auf Folie 1 steht „von wem\" und eine Bewertung. Also muss man eine eigene Zusammenstellung teilen können — hier wäre der Ort.",
    ],
  ),
};

// ── Einsetzen ───────────────────────────────────────────────
const dateien = leseZip(QUELLE);
let gefuellt = 0;
for (const [nr, bauen] of Object.entries(PLAN)) {
  const name = `ppt/slides/slide${nr}.xml`;
  const eintrag = dateien.find((d) => d.name === name);
  if (!eintrag) { console.log(`FEHLT: ${name}`); continue; }
  const xml = eintrag.daten.toString("utf8");
  if (!xml.includes("</p:spTree>")) { console.log(`kein spTree in ${name}`); continue; }
  const formen = bauen().join("");
  eintrag.daten = Buffer.from(xml.replace("</p:spTree>", `${formen}</p:spTree>`), "utf8");
  gefuellt++;
}

schreibeZip(ZIEL, dateien);
console.log(`${gefuellt} Folien gefüllt → ${ZIEL}`);
