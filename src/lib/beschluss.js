// ============================================================
//  BESCHLÜSSE ANWENDEN — welches Regelwerk gilt an Spieltag N?
//
//  design/abstimmung-verfassung.md, Schritt 5 der Reihenfolge. Die Anträge
//  liegen (Schritt 2), sie werden gestellt und ausgezählt (Schritt 4) — hier
//  wird aus einem angenommenen Antrag eine WIRKUNG.
//
//  ── 🔴 Die Form ist die halbe Sicherung ──
//  Diese Datei liefert bewusst KEIN `wendeBeschluesseAn(rules)`, das ein
//  Regelwerk „aktualisiert". Sie beantwortet stattdessen die Frage
//  **„welches Regelwerk gilt an Spieltag N?"** — und macht damit die
//  Rückwirkung STRUKTURELL unmöglich statt nur verboten: wer einen
//  vergangenen Spieltag nachrechnet, fragt nach genau diesem Spieltag und
//  bekommt das Regelwerk, das damals galt. Ein „aktuelles" Regelwerk, das man
//  versehentlich auf alte Tipps anwendet, gibt es hier gar nicht.
//  Das ist dieselbe Idee wie beim eingefrorenen Quoten-Snapshot: nicht darauf
//  vertrauen, dass niemand die alte Welt überschreibt, sondern die alte Welt
//  weiter beantwortbar halten.
//
//  ── Reihenfolge ist nicht egal ──
//  Zwei angenommene Anträge auf DENSELBEN Bereich überschreiben einander. Sie
//  werden deshalb chronologisch angewandt (Wirkungs-Spieltag, dann Zeitpunkt
//  des Antrags, dann Id als letzte Entscheidung) — sonst hinge das Ergebnis an
//  der Reihenfolge, in der die Datenbank die Zeilen zurückgibt, und zwei
//  Spieler sähen verschiedene Regelwerke.
//
//  ── Angewandt wird über `mergePresets` ──
//  Kein zweiter Weg, ein Regelwerk zu verändern (Spec Abschnitt 4). Ein Antrag
//  trägt die Felder genau EINES Aspekts, ist also technisch dasselbe wie ein
//  Teilbibliotheks-Eintrag — und wird auch genauso angewandt.
//
//  Reine Funktionen, UI-frei, kein I/O.
// ============================================================

import { sanitizeRules } from "./engine";
import { mergePresets, defaultAuswahl, ASPEKTE } from "./presetMerge";
import { zaehleAus, wirktAb, aspektAenderbar, MITBESTIMMUNG_ASPEKT } from "./regelAbstimmung";

const ASPEKT_VORHANDEN = new Set(ASPEKTE.map((a) => a.key));

// Felder EINES Aspekts auf ein Regelwerk legen. Genau der Weg von
// `wendeTeilCodeAn` (teilbibliothek.js), nur ohne den Umweg über einen Code:
// alle Aspekte von „A" (dem bisherigen Regelwerk), der eine vom Antrag.
// Der Name bleibt erhalten — sonst benennte jeder Beschluss die Runde um.
function legeAspektAuf(rules, aspekt, werte) {
  const auswahl = { ...defaultAuswahl("a"), [aspekt]: "b" };
  return mergePresets(rules, werte ?? {}, auswahl, sanitizeRules(rules).name);
}

// Ein Antrag in der Form, die Store UND Screen liefern — die Store-Zeile
// trägt `gestellt_am`/`laeuft_bis`, ein frisch gebautes Objekt `gestelltAm`/
// `laeuftBis`. Beides hier EINMAL zusammenführen, statt an jeder Fundstelle
// erneut zwei Schreibweisen abzufragen.
function lies(antrag) {
  return {
    id: antrag?.id ?? null,
    aspekt: antrag?.aspekt ?? null,
    werte: antrag?.werte ?? {},
    stimmen: antrag?.stimmen ?? [],
    veto: antrag?.veto === true,
    gestelltAm: Number(antrag?.gestellt_am ?? antrag?.gestelltAm),
    laeuftBis: Number(antrag?.laeuft_bis ?? antrag?.laeuftBis),
  };
}

// ── Welches Regelwerk gilt an einem bestimmten Runden-Spieltag? ──
//
// `rules`     — das Regelwerk, mit dem die Runde ANGELEGT wurde.
// `antraege`  — alle Anträge der Runde (offen wie entschieden).
// `mitglieder`— [{ userId, aktiv, istAdmin }], wie bei `zaehleAus`.
// `spieltag`  — der RUNDEN-Spieltag, für den gefragt wird.
//
// Rückgabe: `{ rules, angewandt, verworfen }`.
// `angewandt` und `verworfen` sind der Grund, warum diese Funktion nicht nur
// ein Regelwerk zurückgibt: ein Beschluss, der still verschwindet, ist
// schlimmer als einer, der nicht greift — niemand würde es merken.
export function regelwerkAmSpieltag({
  rules, antraege = [], mitglieder = [], spieltag, spieltage = 34,
} = {}) {
  const basis = sanitizeRules(rules);
  const bis = Number(spieltag);
  const angewandt = [];
  const verworfen = [];

  if (!Number.isFinite(bis)) {
    // Ohne Spieltag wird nichts angewandt — geraten wird hier nichts,
    // dieselbe Zurückhaltung wie bei `darfBeantragen` ohne bekannten Stand.
    return { rules: basis, angewandt, verworfen };
  }

  const kandidaten = [];
  for (const roh of antraege) {
    const a = lies(roh);
    if (!a.aspekt || !ASPEKT_VORHANDEN.has(a.aspekt)) continue;

    // Solange die Frist läuft, ist nichts entschieden. Ohne Frist ebenfalls
    // nicht — ein Antrag ohne Zeitpunkt lässt sich nicht einordnen.
    if (!Number.isFinite(a.laeuftBis) || bis <= a.laeuftBis) continue;

    const aus = zaehleAus({ stimmen: a.stimmen, veto: a.veto }, mitglieder, basis.regelAbstimmung);
    if (!aus.angenommen) continue;

    const wirkung = wirktAb(
      { gestelltAm: a.gestelltAm, laeuftBis: a.laeuftBis },
      basis.regelAbstimmung,
      { spieltage },
    );
    if (wirkung.rundenSpieltag == null) {
      verworfen.push({ id: a.id, aspekt: a.aspekt, grund: wirkung.grund });
      continue;
    }
    if (wirkung.rundenSpieltag > bis) continue;   // greift erst später

    kandidaten.push({ ...a, abSpieltag: wirkung.rundenSpieltag });
  }

  // Chronologisch — siehe Kopfkommentar. `id` ganz zuletzt, damit die
  // Reihenfolge auch bei gleichem Zeitpunkt eindeutig bleibt.
  kandidaten.sort((x, y) =>
    x.abSpieltag - y.abSpieltag
    || (x.gestelltAm || 0) - (y.gestelltAm || 0)
    || String(x.id).localeCompare(String(y.id)));

  let aktuell = basis;
  for (const k of kandidaten) {
    // ⚠️ Die Verfassung wird beim ANWENDEN erneut geprüft, nicht nur beim
    // Stellen: sie ist der Rahmen, den auch eine Mehrheit nicht bricht, und
    // der Admin kann sie zwischenzeitlich geändert haben. Ein so verworfener
    // Beschluss verschwindet aber NICHT still — er steht in `verworfen`, mit
    // Grund. Sonst hätte die Runde abgestimmt und nie erfahren, warum nichts
    // passiert ist.
    const rahmen = aspektAenderbar(k.aspekt, aktuell.verfassung);
    if (!rahmen.erlaubt) {
      verworfen.push({ id: k.id, aspekt: k.aspekt, grund: rahmen.grund });
      continue;
    }
    // Doppelte Sicherung: über die Mitbestimmung selbst wird nie abgestimmt.
    if (k.aspekt === MITBESTIMMUNG_ASPEKT) {
      verworfen.push({
        id: k.id, aspekt: k.aspekt,
        grund: "Über die Abstimmungsregeln und die Verfassung selbst wird nicht abgestimmt.",
      });
      continue;
    }
    aktuell = legeAspektAuf(aktuell, k.aspekt, k.werte);
    angewandt.push({ id: k.id, aspekt: k.aspekt, abSpieltag: k.abSpieltag });
  }

  return { rules: aktuell, angewandt, verworfen };
}

// Ein Satz für die Oberfläche: was hat sich bis zu diesem Spieltag geändert?
// Wieder mit AUSGERECHNETEN Zahlen statt einer Vokabel — „2 Beschlüsse" sagt
// mehr als „geändert".
export function beschreibeBeschluesse({ angewandt = [], verworfen = [] } = {}) {
  if (!angewandt.length && !verworfen.length) {
    return "Bisher wurde keine Regeländerung wirksam.";
  }
  const teile = [];
  if (angewandt.length) {
    const namen = angewandt
      .map((x) => ASPEKTE.find((a) => a.key === x.aspekt)?.label ?? x.aspekt)
      .join(", ");
    teile.push(`${angewandt.length} ${angewandt.length === 1 ? "Beschluss ist" : "Beschlüsse sind"} wirksam: ${namen}.`);
  }
  if (verworfen.length) {
    teile.push(`${verworfen.length} ${verworfen.length === 1 ? "Beschluss greift" : "Beschlüsse greifen"} nicht — der Grund steht beim Antrag.`);
  }
  return teile.join(" ");
}
