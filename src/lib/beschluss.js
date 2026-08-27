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
import { rundenSpieltagVon } from "./zeitachse";
import { regelnMitRechten } from "./rechteAusuebung";

const ASPEKT_VORHANDEN = new Set(ASPEKTE.map((a) => a.key));

// 🔴 Regeln, die den GANZEN Saisonverlauf formen — und deshalb nicht mitten in
// der Saison beschlossen werden können.
//
// Das ist keine technische Lücke, sondern Abschnitt 1 der Spec: die Saisonform
// (Kurve, Streichresultate) und die Duell-Verrechnung sind Aussagen über die
// gesamte Saison. „Ab Spieltag 20 werden die zwei schlechtesten Spieltage
// gestrichen" lässt sich gar nicht anders lesen als rückwirkend — gestrichen
// würde aus allen Spieltagen, auch aus den längst gespielten. Ein Beschluss,
// der das täte, änderte die Wertung bereits abgegebener Tipps.
//
// Deshalb werden solche Anträge VERWORFEN und nicht halb angewandt. Ein Effekt,
// der nur zur Hälfte landet, ist schlimmer als einer, der gar nicht landet:
// er sieht verkabelt aus. `scoreLeaderboardHistory` reicht `regelnFuer` aus
// demselben Grund nur an `applyCatchup` weiter — der Anschluss-Bonus entsteht
// je Spieltag und kann deshalb ab einem Spieltag anders sein.
const VERLAUFS_FELDER = ["saisonform", "duell"];

const VERLAUFS_GRUND =
  "Diese Regel formt die ganze Saison (Streichresultate, Saison-Kurve, "
  + "Duell-Verrechnung). Sie mitten in der Saison zu ändern würde auch längst "
  + "gespielte Spieltage neu bewerten — und rückwirkend gilt kein Beschluss, "
  + "auch kein einstimmiger. Wer sie ändern will, tut das vor dem Saisonstart.";

// Rührt ein Antrag an eine dieser Regeln? Geprüft wird an den FELDERN, nicht
// am Aspekt: „Fairness" enthält auch `aufholen`, und das darf sehr wohl
// beschlossen werden.
function ruehrtAnVerlauf(werte) {
  return werte && typeof werte === "object"
    && VERLAUFS_FELDER.some((f) => Object.prototype.hasOwnProperty.call(werte, f));
}

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
    // Regeln, die die ganze Saison formen — siehe `VERLAUFS_FELDER` oben.
    if (ruehrtAnVerlauf(k.werte)) {
      verworfen.push({ id: k.id, aspekt: k.aspekt, grund: VERLAUFS_GRUND });
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

// ── Der Vorbau für die Wertung ──────────────────────────────
// Liefert die Funktion, die `scoreLeaderboard`/`scoreLeaderboardHistory` als
// `regelnFuer` erwarten: aus einem Eintrag oder Verlaufs-Schritt (beide tragen
// `wettbewerb` + `matchday`) wird der RUNDEN-Spieltag und daraus das
// Regelwerk, das dort galt.
//
// Gemerkt wird je Runden-Spieltag — nicht aus Geschwindigkeit, sondern damit
// alle Einträge desselben Spieltags DASSELBE Regelwerks-Objekt bekommen. Zwei
// gleich aussehende Objekte wären eine Einladung für spätere
// Identitäts-Vergleiche, die dann mal stimmen und mal nicht.
//
// 🔴 `amEnde` ist der zweite Rückgabewert und der wichtigere Fallstrick:
// `brauchtVerlauf` in `engine.js` entscheidet, ob das Leaderboard überhaupt
// über den Verlauf gerechnet wird — und es fragt das ANGELEGTE Regelwerk.
// Beschließt eine Runde den Anschluss-Bonus erst an Spieltag 20, ist er in
// `round.rules` aus, der Verlauf würde gar nicht erst gebaut, und der Bonus
// fiele still aus. Deshalb muss der Aufrufer BEIDE fragen. Genau die Sorte
// halbe Verkabelung, die `design/kontaktstellen.md` auflistet.
export function regelnFuerSpieltag({
  rules, antraege = [], mitglieder = [], achse = [], ausuebungen = [],
} = {}) {
  const basis = sanitizeRules(rules);
  const spieltage = achse.length || 34;
  const gemerkt = new Map();

  const fuerRundenSpieltag = (nummer) => {
    if (nummer == null) return basis;
    if (gemerkt.has(nummer)) return gemerkt.get(nummer);
    const { rules: r } = regelwerkAmSpieltag({ rules: basis, antraege, mitglieder, spieltag: nummer, spieltage });
    // 🔴 Das ausgeübte Recht kommt NACH den Beschlüssen, und zwar in dieser
    // Reihenfolge: ein Beschluss ändert das Regelwerk der Runde, ein Recht
    // legt für EINEN Spieltag etwas darauf. Umgekehrt gerechnet würde ein
    // Beschluss die Wahl des Siegers überschreiben — und der hätte gewählt,
    // ohne dass es etwas geändert hätte (`rechteAusuebung.js`, Weg B).
    const mitRecht = regelnMitRechten(r, ausuebungen, nummer);
    gemerkt.set(nummer, mitRecht);
    return mitRecht;
  };

  const regelnFuer = (x) => fuerRundenSpieltag(rundenSpieltagVon(achse, {
    wettbewerb: x?.wettbewerb, matchday: x?.matchday ?? null,
  }));

  return { regelnFuer, amEnde: fuerRundenSpieltag(spieltage) };
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
