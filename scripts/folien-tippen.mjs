// ============================================================
//  FOLIEN — TIPPEN und RUNDEN-ÜBERSICHT
//
//  Aufruf:  npx vite-node scripts/folien-tippen.mjs
//
//  🔴 Andi am 21.08.2026: „woran ich evtl. selbst schonmal arbeiten kann mit
//  deiner dann erstellten PowerPoint-Vorlage … ist die Tippeingabeoberfläche
//  samt der Übersicht, wenn man in einer Tipprunde drin ist."
//
//  Seine genaue Vorstellung, wörtlich: die ERGEBNIS-MATRIX mit direkter Anzeige
//  der erzielten Punkte (falls Volltreffer), dazu eine VORSCHAU, welches (nahe)
//  Ergebnis wie viel auszahlt — und darin nochmal die Unterscheidung, welche
//  TORSCHÜTZEN treffen.
//
//  ⚠️ Das ist eine VORLAGE zum Weiterbauen, kein fertiger Entwurf. Andi hat
//  hier eine genaue Vorstellung; ich stelle das Gerüst und markiere orange, wo
//  seine Entscheidung fehlt.
//
//  ⚠️ Was schon GEBAUT ist, steht dabei — sonst zeichnet er etwas, das es gibt.
//  Die Ergebnis-Matrix liegt als `snapshot.correctScore` vor, die Nähe-Wertung
//  in `nearResults.js`, die Aufschlüsselung in `breakdown.js`, und die
//  Tipp-Vorschau kennt bereits die Zahl OHNE getroffene Torschützen.
// ============================================================
import { leseZip, schreibeZip, haengeFolienAn, kasten, text, pfeil, CM } from "./schreib-pptx.mjs";

const QUELLE = "C:/Users/andit/OneDrive/Dokumente/Quotentippen.pptx";
const ZIEL = "C:/Users/andit/OneDrive/Dokumente/Quotentippen-Tippen.pptx";

const L_X = 0.5 * CM;
const L_W = 9.4 * CM;
const R_X = 11.6 * CM;
const R_W = 7.0 * CM;

function setzer(startY = 0.5 * CM) {
  return { y: startY, nimm(h, abstand = 0.25 * CM) { const y = this.y; this.y += h + abstand; return y; } };
}
let id = 500;
const nId = () => ++id;
const K = (s, x, w, zeilen, h, ton, groesse) =>
  kasten({ id: nId(), x, y: s.nimm(h), w, h, zeilen, ton, groesse });
const T = (s, x, w, zeilen, h, groesse) =>
  text({ id: nId(), x, y: s.nimm(h), w, h, zeilen, groesse });

// ── Die Folien ──────────────────────────────────────────────
const FOLIEN = [
  // 1 · Spieltag-Übersicht
  () => {
    const l = setzer(); const teile = [];
    teile.push(K(l, L_X, L_W, ["Tippen — Spieltag 14"], 0.8 * CM, "normal", 1400));
    teile.push(T(l, L_X, L_W, ["Oben der Spieltag, darunter die Spiele dieser Runde."], 0.9 * CM));
    teile.push(K(l, L_X, L_W, ["Spieltag wählen", "‹ 13 · 14 · 15 ›  ·  Frist: Fr 20:30"], 1.3 * CM));
    teile.push(K(l, L_X, L_W, ["Köln – Bayern", "getippt 2:1 · voraussichtlich 340 Pkt"], 1.5 * CM));
    teile.push(K(l, L_X, L_W, ["Bremen – Leipzig", "noch nicht getippt"], 1.3 * CM));
    teile.push(K(l, L_X, L_W, ["… wie davor"], 0.9 * CM));
    teile.push(K(l, L_X, L_W, ["Was du noch zu vergeben hast", "Joker · Münzen · Saison-Wetten"], 1.5 * CM));
    teile.push(K(l, L_X, L_W, [
      "AUFTRAG: Was steht in der Spielzeile?",
      "Vorschlag: Tipp, voraussichtliche Punkte, ob ein Joker daraufliegt. Reicht das, oder soll die Quote mit?",
    ], 2.4 * CM, "auftrag", 1100));
    return teile;
  },

  // 2 · DIE ERGEBNIS-MATRIX — Andis Kernstück
  () => {
    const l = setzer(); const r = setzer(); const teile = [];
    teile.push(K(l, L_X, L_W, ["Ein Spiel: Köln – Bayern"], 0.8 * CM, "normal", 1400));
    teile.push(T(l, L_X, L_W, [
      "Andis Kernstück: die Ergebnis-Matrix zeigt zu JEDEM Ergebnis direkt die Punkte, "
      + "die es einbrächte — nicht erst nach dem Abpfiff.",
    ], 1.4 * CM));
    teile.push(K(l, L_X, L_W, [
      "Ergebnis-Matrix",
      "0:0  1:0  2:0  3:0 …   ·  jedes Feld mit seiner Punktzahl",
    ], 1.6 * CM));
    teile.push(K(l, L_X, L_W, ["Dein Tipp", "2:1 — hervorgehoben in der Matrix"], 1.3 * CM));
    teile.push(K(l, L_X, L_W, [
      "Volltreffer-Anzeige",
      "was genau dieses Ergebnis zahlt, groß und ohne Rechnen",
    ], 1.5 * CM));
    teile.push(K(l, L_X, L_W, [
      "Größe der Matrix — umschaltbar",
      "automatisch · automatisch+ · bis 3 · 4 · 5 · 6 · 8 · 10 Tore",
    ], 1.6 * CM));
    // 🔴 Gemessen am 21.08.2026, statt geschätzt: ein festes 0–5-Quadrat (36
    // Felder) deckt beim extremen Favoriten nur 87 % ab — die automatische
    // Anpassung je Seite schafft 99 % mit 27 Feldern. Ein Quadrat ist der
    // schlechteste Zuschnitt, weil die Torerwartung beider Seiten auseinander
    // liegt.
    teile.push(T(l, L_X, L_W, [
      "Automatisch heißt: je Seite so weit, wie das SPIEL es hergibt. Ein festes "
      + "0–5-Quadrat (36 Felder) deckt beim extremen Favoriten nur 87 % ab, die "
      + "automatische Anpassung 99 % mit 27 Feldern.",
    ], 1.8 * CM));
    teile.push(K(l, L_X, L_W, [
      "Sammelzeile für den Rest",
      "„7 weitere Ergebnisse“ — sonst sieht ein fehlendes Feld wie ein Fehler aus",
    ], 1.6 * CM));
    teile.push(K(l, L_X, L_W, [
      "AUFTRAG: Was zeigt ein Feld?",
      "Nur die Punktzahl — oder auch die Wahrscheinlichkeit? Beides ist vorhanden.",
    ], 2.2 * CM, "auftrag", 1100));

    teile.push(K(r, R_X, R_W, ["Vorschau: was zahlt was"], 0.8 * CM, "normal", 1400));
    teile.push(T(r, R_X, R_W, [
      "Auch NAHE Ergebnisse zahlen — je nach Einstellung der Runde.",
    ], 1.0 * CM));
    teile.push(K(r, R_X, R_W, ["2:1  genau richtig", "340 Pkt"], 1.3 * CM));
    teile.push(K(r, R_X, R_W, ["3:2  Abstand stimmt", "210 Pkt"], 1.3 * CM));
    teile.push(K(r, R_X, R_W, ["1:0  Tendenz stimmt", "150 Pkt"], 1.3 * CM));
    teile.push(K(r, R_X, R_W, ["0:2  daneben", "0 Pkt"], 1.3 * CM));
    teile.push(K(r, R_X, R_W, [
      "Mit / ohne Torschützen",
      "zwei Zahlen: was du sicher bekommst, und was mit getroffenen Schützen",
    ], 1.8 * CM));
    teile.push(K(r, R_X, R_W, [
      "AUFTRAG: Wie viele Zeilen?",
      "Alle 36 Ergebnisse wären eine Wand. Vorschlag: dein Tipp plus die vier nächstliegenden.",
    ], 2.2 * CM, "auftrag", 1100));
    teile.push(pfeil({ id: nId(), x: L_X + L_W, y: 6.5 * CM, y2: 0.9 * CM, w: R_X - (L_X + L_W) }));
    return teile;
  },

  // 3 · Torschützen
  () => {
    const l = setzer(); const teile = [];
    teile.push(K(l, L_X, L_W, ["Torschützen"], 0.8 * CM, "normal", 1400));
    teile.push(T(l, L_X, L_W, [
      "Andis Punkt: einsehbar, wie viel es ändert, WENN ein bestimmter Schütze trifft.",
    ], 1.1 * CM));
    teile.push(K(l, L_X, L_W, ["Heim — bis 2 Namen", "Kader nach Quote sortiert"], 1.3 * CM));
    teile.push(K(l, L_X, L_W, ["Gast — bis 2 Namen", "… wie davor"], 1.3 * CM));
    teile.push(K(l, L_X, L_W, [
      "Was jeder Name bringt",
      "je Schütze: +x Punkte, wenn er trifft — vor dem Anpfiff sichtbar",
    ], 1.6 * CM));
    teile.push(K(l, L_X, L_W, [
      "Zwei Summen nebeneinander",
      "ohne Schützen: 340 Pkt  ·  mit allen: 520 Pkt",
    ], 1.6 * CM));
    // 🔴 Andis Idee vom 21.08.2026: ein KOMBI-Bonus, wenn Ergebnis UND
    // Torschütze aufgehen. Heute addieren sich beide Teile nur — das
    // Zusammentreffen selbst wird nicht belohnt, obwohl es das Seltenere ist.
    teile.push(K(l, L_X, L_W, [
      "Kombi-Bonus",
      "extra, wenn Ergebnis UND Torschütze stimmen — nicht nur die Summe beider",
    ], 1.6 * CM));
    teile.push(K(l, L_X, L_W, [
      "AUFTRAG: Wie stark ist der Kombi-Bonus?",
      "Und zählt er je getroffenem Schützen oder einmal? Zwei Schützen plus Ergebnis wären sonst schnell das Vielfache eines normalen Treffers.",
    ], 2.6 * CM, "auftrag", 1100));
    teile.push(K(l, L_X, L_W, [
      "AUFTRAG: Welche Zahl steht groß?",
      "Die sichere oder die mögliche? Bisher stand die mögliche allein da — 62 % davon hingen an getroffenen Schützen, ohne dass es jemand sah.",
    ], 2.6 * CM, "auftrag", 1100));
    return teile;
  },

  // 4 · Runden-Übersicht
  () => {
    const l = setzer(); const r = setzer(); const teile = [];
    teile.push(K(l, L_X, L_W, ["In der Tipprunde"], 0.8 * CM, "normal", 1400));
    teile.push(T(l, L_X, L_W, ["Was man sieht, wenn man in einer Runde drin ist."], 0.9 * CM));
    teile.push(K(l, L_X, L_W, ["Ranking", "Platz · Punkte · Abstand nach vorn"], 1.3 * CM));
    teile.push(K(l, L_X, L_W, ["Letzter Spieltag", "wer wie viel geholt hat, und woraus"], 1.4 * CM));
    teile.push(K(l, L_X, L_W, ["Abstimmung", "laufende Anträge · deine Stimme fehlt noch"], 1.4 * CM));
    teile.push(K(l, L_X, L_W, ["Regelwerk nachlesen", "in Klartext, nicht als Zahlen"], 1.3 * CM));
    teile.push(K(l, L_X, L_W, ["Joker & Münzen", "Bestand · was verfällt wann"], 1.3 * CM));
    teile.push(K(l, L_X, L_W, ["Drehrad / Ereignisse", "was zuletzt passiert ist"], 1.3 * CM));
    teile.push(K(l, L_X, L_W, [
      "AUFTRAG: Was steht ganz oben?",
      "Der eigene Platz, der nächste Spieltag oder was seit dem letzten Besuch passiert ist?",
    ], 2.4 * CM, "auftrag", 1100));

    teile.push(K(r, R_X, R_W, ["Ranking — aufgeklappt"], 0.8 * CM, "normal", 1400));
    teile.push(K(r, R_X, R_W, ["1. Lena", "1 240 Pkt"], 1.1 * CM));
    teile.push(K(r, R_X, R_W, ["2. Du", "1 180 Pkt · −60"], 1.1 * CM));
    teile.push(K(r, R_X, R_W, ["… wie davor"], 0.9 * CM));
    teile.push(K(r, R_X, R_W, [
      "Aufschlüsselung je Spieler",
      "woher die Punkte kamen: Quote · Joker · Modifikatoren · Boni",
    ], 1.8 * CM));
    teile.push(pfeil({ id: nId(), x: L_X + L_W, y: 2.0 * CM, y2: 0.9 * CM, w: R_X - (L_X + L_W) }));
    return teile;
  },

  // 5 · Abstimmung
  () => {
    const l = setzer(); const teile = [];
    teile.push(K(l, L_X, L_W, ["Abstimmung"], 0.8 * CM, "normal", 1400));
    teile.push(T(l, L_X, L_W, [
      "Nur sichtbar, wenn der Admin die Mitbestimmung eingeschaltet hat.",
    ], 1.0 * CM));
    teile.push(K(l, L_X, L_W, ["Laufender Antrag", "„Joker-Faktor auf 2,0\" · noch 2 Tage"], 1.5 * CM));
    teile.push(K(l, L_X, L_W, ["Dafür / Dagegen", "Stand: 3 zu 1 · Quorum 5"], 1.4 * CM));
    teile.push(K(l, L_X, L_W, ["Wirkung ab", "nächster Spieltag"], 1.1 * CM));
    teile.push(K(l, L_X, L_W, ["Eigenen Antrag stellen", "was änderbar ist, sagt die Verfassung"], 1.4 * CM));
    teile.push(K(l, L_X, L_W, [
      "AUFTRAG: Sieht man Zwischenstände?",
      "Offen ab der ersten Stimme, oder erst am Ende? Offen beeinflusst, wer später abstimmt.",
    ], 2.4 * CM, "auftrag", 1100));
    return teile;
  },

  // 6 · Reserve
  () => {
    const l = setzer(); const teile = [];
    teile.push(K(l, L_X, L_W, ["Weitere Fenster — Platz für dich"], 0.8 * CM, "normal", 1400));
    teile.push(T(l, L_X, L_W, [
      "Leer gelassen: Historie, Saison-Wetten, Spott, Auszahlungs-Explorer. "
      + "Alles gebaut, aber ohne festgelegten Aufbau.",
    ], 1.6 * CM));
    teile.push(K(l, L_X, L_W, [
      "AUFTRAG: Welche davon gehören in die Runden-Übersicht?",
      "Und welche sind eigene Fenster, die man selten öffnet?",
    ], 2.4 * CM, "auftrag", 1100));
    return teile;
  },
];

// ── Eigene Datei bauen ──────────────────────────────────────
// 🔴 Andi am 21.08.2026: „mach ne separate PowerPoint, wir trennen die Ebenen
// Tippfeld und Admin-Spielerstellung."
//
// Ausgangspunkt bleibt trotzdem SEIN Original — nur so stimmen Thema, Layouts,
// Folienmaß und der senkrechte Trennstrich. Alle Folien werden vorher geleert;
// sein Original wird dabei nicht angefasst, geschrieben wird in eine neue Datei.
//
// ⚠️ Geleert heißt: Formen raus, TRENNSTRICH BLEIBT. Ohne ihn wüsste weder der
// Leser noch Andi, wo die zweite Spalte anfängt.
function leere(xml) {
  const anfang = xml.indexOf("</p:grpSpPr>") + "</p:grpSpPr>".length;
  const ende = xml.indexOf("</p:spTree>");
  const strich = xml.slice(anfang, ende).match(/<p:cxnSp>[\s\S]*?<\/p:cxnSp>/);
  return xml.slice(0, anfang) + (strich ? strich[0] : "") + xml.slice(ende);
}

const dateien = leseZip(QUELLE);
const folienNamen = dateien
  .map((d) => d.name.match(/^ppt\/slides\/slide(\d+)\.xml$/))
  .filter(Boolean).map((m) => Number(m[1])).sort((a, b) => a - b);

for (const nr of folienNamen) {
  const eintrag = dateien.find((d) => d.name === `ppt/slides/slide${nr}.xml`);
  eintrag.daten = Buffer.from(leere(eintrag.daten.toString("utf8")), "utf8");
}

// Reichen die vorhandenen Folien? Sonst anhängen.
if (folienNamen.length < FOLIEN.length) {
  haengeFolienAn(dateien, FOLIEN.length - folienNamen.length, folienNamen[0]);
}

FOLIEN.forEach((bauen, i) => {
  const nr = folienNamen[i] ?? (Math.max(...folienNamen) + 1 + (i - folienNamen.length));
  const eintrag = dateien.find((d) => d.name === `ppt/slides/slide${nr}.xml`);
  if (!eintrag) return;
  const xml = eintrag.daten.toString("utf8");
  eintrag.daten = Buffer.from(xml.replace("</p:spTree>", bauen().join("") + "</p:spTree>"), "utf8");
});

schreibeZip(ZIEL, dateien);
console.log(`${FOLIEN.length} Folien gefüllt, ${folienNamen.length - FOLIEN.length} leer für Andi → ${ZIEL}`);
