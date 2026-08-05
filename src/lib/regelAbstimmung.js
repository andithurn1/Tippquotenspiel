// ============================================================
//  REGEL-ABSTIMMUNG & VERFASSUNG — die Runde entscheidet mit
//
//  design/abstimmung-verfassung.md. Die Mitglieder einer Runde beschließen
//  gemeinsam Änderungen AM REGELWERK; der Admin legt darüber eine VERFASSUNG,
//  die den Rahmen des Änderbaren festlegt und von keiner Mehrheit gebrochen
//  werden kann.
//
//  ── 🔴 Zuerst die harte Kante ──
//  **Eine Regeländerung wirkt nie rückwirkend.** Kein Beschluss darf einen
//  bereits abgegebenen Tipp anders bewerten, als er beim Abgeben bewertet
//  worden wäre — auch keine EINSTIMMIGE Runde. Das ist keine Einstellung und
//  kein Schutz vor der Mehrheit, sondern Schutz vor der Unmöglichkeit: der
//  Quoten-Snapshot trägt die alte Welt, eine rückwirkend geänderte Wertung
//  ließe sich gar nicht mehr nachrechnen. Dieselbe Kante wie „Tipp ändern
//  nach Anpfiff". Durchgesetzt wird sie in `wirktAb` über `zuletztGeoeffnet`.
//
//  ── ⚠️ Nicht zu verwechseln mit der Joker-Abstimmung ──
//  `voting.js` (`rules.joker.abstimmung`) entscheidet, an WELCHEN Spieltagen
//  es einen Joker gibt — eine wiederkehrende Ja/Nein-Frage im laufenden
//  Betrieb. Hier geht es um Änderungen am Regelwerk selbst. Zwei verschiedene
//  Fragen, deshalb zwei Module und zwei Regel-Blöcke: `rules.regelAbstimmung`
//  heißt bewusst NICHT `rules.abstimmung`, weil `rules.joker.abstimmung` schon
//  existiert und zwei fast gleich heißende Felder für unvereinbare Fragen
//  genau die Verwechslung wären, vor der die Spec ganz oben warnt.
//
//  ── ⚠️ Diese Datei importiert NICHTS ──
//  Sie wird von `engine.js` gebraucht (`sanitizeRules`), und alles, was sie
//  von außen bräuchte, liegt hinter `engine.js`: `RULE_LIMITS` dort selbst,
//  die ASPEKTE in `presetMerge.js`, das seinerseits `engine.js` importiert.
//  Jeder dieser Wege wäre ein Import-Kreis — dieselbe Falle, wegen der
//  `spieltag.js` als importfreies Modul aus `engine.js` herausgelöst wurde
//  (dort steht die Geschichte). Deshalb kommen beide von AUSSEN herein:
//   • die harten Grenzen als Parameter `harteGrenzen` (der Aufrufer reicht
//     `RULE_LIMITS` durch),
//   • die Aspekt-Schlüssel dort, wo sie gebraucht werden (`konflikte`).
//  `sanitizeVerfassung` normalisiert deshalb nur die FORM. Die Zusicherung
//  „eine Verfassung kann nur VERENGEN, nie erweitern" (Spec Abschnitt 2)
//  hängt damit nicht am Speichern, sondern am Lesen: JEDER Zugriff läuft über
//  `effektiveGrenzen`, und das schneidet immer gegen die harte Grenze. Das ist
//  die robustere Stelle — ein Band, das irgendwie in die Daten gelangt ist,
//  kann so gar nichts erweitern.
//
//  Reine Funktionen, UI-frei, kein I/O, keine Uhr.
// ============================================================

// Über die Verfassung und die Abstimmungsregeln selbst wird NICHT abgestimmt
// (Spec Abschnitt 6: „Dann ist sie keine"). Der Aspekt trägt beide Blöcke und
// ist deshalb immer gesperrt — auch wenn ihn jemand in `aenderbar` schreibt.
// ⚠️ Der Aspekt selbst entsteht in `presetMerge.js` (eigener Schritt); hier
// steht nur sein Schlüssel, damit diese Datei importfrei bleibt.
export const MITBESTIMMUNG_ASPEKT = "mitbestimmung";

// ── Kataloge ────────────────────────────────────────────────
// Sichtbare Texte: Alltagsdeutsch, keine Bezeichner, keine Dateinamen.

export const WAEHLER = [
  { key: "alle", label: "Alle Mitglieder", desc: "Jeder in der Runde hat eine Stimme." },
  { key: "nurAktive", label: "Nur wer mitspielt", desc: "Wer seit mehreren Spieltagen nicht getippt hat, stimmt nicht mit — und blockiert damit auch nicht die Beteiligung." },
  { key: "adminPlusAlle", label: "Alle, Admin mit Veto", desc: "Alle stimmen ab, der Admin kann einen Beschluss zusätzlich kippen." },
];

export const MEHRHEITEN = [
  { key: "einfach", label: "Einfache Mehrheit", desc: "Mehr Ja als Nein genügt." },
  { key: "zweidrittel", label: "Zwei Drittel", desc: "Zwei von drei abgegebenen Stimmen müssen dafür sein." },
  { key: "einstimmig", label: "Einstimmig", desc: "Keine einzige Gegenstimme. Nur sinnvoll, wenn wirklich alle abstimmen müssen." },
];

export const ANTRAGSRECHT = [
  { key: "alle", label: "Jeder darf vorschlagen", desc: "Jedes Mitglied kann eine Änderung zur Abstimmung stellen." },
  { key: "nurAktive", label: "Nur wer mitspielt", desc: "Vorschlagen darf, wer zuletzt auch getippt hat." },
  { key: "nurAdmin", label: "Nur der Admin", desc: "Der Admin schlägt vor, die Runde entscheidet." },
];

export const WIRKUNG_AB = [
  { key: "naechsterSpieltag", label: "Nächster Spieltag", desc: "Wirkt ab dem ersten Spieltag nach dem Ende der Abstimmung — der frühestmögliche Zeitpunkt." },
  { key: "vorlauf", label: "Mit Vorlauf", desc: "Wirkt erst einige Spieltage später, damit sich alle darauf einstellen können." },
];

// ⚠️ Die Spec nennt das „dieselbe Frage wie die Joker-Sichtbarkeit". Der
// Katalog dort (`SICHT` in `jokerBasis.js`) führt „sofort / nach Anpfiff /
// nach Auswertung" und hängt am ANPFIFF eines Spiels — eine Abstimmung hat
// keinen Anpfiff. Deshalb ein eigener, zweiwertiger Katalog. Bitte nicht
// später zusammenführen: die beiden messen an verschiedenen Ereignissen.
export const STIMM_SICHT = [
  { key: "offen", label: "Offen", desc: "Der Zwischenstand ist jederzeit sichtbar." },
  { key: "verdeckt", label: "Verdeckt", desc: "Die Stimmen werden erst am Ende gezeigt — niemand richtet sich nach der Mehrheit." },
];

// ── Grenzen & Vorgaben ──────────────────────────────────────

export const ABSTIMMUNG_LIMITS = {
  // ⚠️ `quorum` hat den Schritt 0,05, gehört aber NICHT in die
  // Multiplikator-Familie aus `reglerRaster.test.js` — es ist ein ANTEIL, kein
  // Modifikator, und fließt in keinen additiven Topf. Die Familie ist dort
  // eine benannte Liste, dieses Feld landet also nicht versehentlich darin.
  // Aber `reglerSchritt` in `engine.js` erkennt die Familie generisch an
  // `step === 0.05`: die Oberfläche darf dieses Feld deshalb NICHT über
  // `reglerSchritt` führen — gleiche Lage und gleiche Behandlung wie
  // `maxAnteilProSpiel` (dort steht dieselbe Anmerkung im Regler).
  quorum: { min: 0, max: 1, step: 0.05 },
  dauer: { min: 1, max: 10, step: 1 },            // Runden-Spieltage
  sperrfrist: { min: 0, max: 20, step: 1 },       // Runden-Spieltage
  wirkungVorlauf: { min: 1, max: 10, step: 1 },   // Runden-Spieltage
  aktivSpieltage: { min: 1, max: 10, step: 1 },   // „aktiv" = getippt in den letzten N
};

export const DEFAULT_VERFASSUNG = {
  enabled: false,
  // Aspekt-Schlüssel aus `presetMerge.ASPEKTE`. LEER heißt „alles außer
  // `gesperrt`" — eine Verfassung einzuschalten darf nicht als Nebenwirkung
  // alles sperren. Dasselbe Muster wie `fensterVon` in `duellJoker.js`, das
  // bei `manuell` ohne Grenzen bewusst NICHT auf die schärfste Einstellung
  // fällt. Ist die Liste nicht leer, wirkt sie als Positivliste.
  aenderbar: [],
  // Hat immer Vorrang vor `aenderbar`.
  gesperrt: [],
  // { "feldpfad": { min, max } } — verengt die harten Grenzen, nie mehr.
  grenzen: {},
};

export const DEFAULT_REGEL_ABSTIMMUNG = {
  enabled: false,
  wer: "alle",
  mehrheit: "einfach",
  quorum: 0.5,
  dauer: 3,
  wirkungAb: "naechsterSpieltag",
  wirkungVorlauf: 2,
  vetoAdmin: false,
  antragsrecht: "alle",
  sperrfrist: 4,
  sichtbarkeit: "offen",
  aktivSpieltage: 5,
};

const clamp = (v, { min, max }, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const ausKatalog = (katalog, wert, fallback) =>
  katalog.some((e) => e.key === wert) ? wert : fallback;

// Aspekt-Schlüssel aus einer beliebigen Eingabe: nur nicht-leere Zeichenketten,
// entdoppelt, Reihenfolge erhalten.
// ⚠️ Hier wird NICHT gegen den Aspekt-Katalog geprüft — der liegt in
// `presetMerge.js` und wäre ein Import-Kreis (siehe Kopfkommentar). Ein
// unbekannter Schlüssel ist harmlos: er trifft in `aspektAenderbar` einfach
// nie zu. Geprüft wird dort, wo der Katalog ohnehin vorliegt (`konflikte`).
function aspektListe(x) {
  if (!Array.isArray(x)) return [];
  const out = [];
  for (const k of x) {
    if (typeof k !== "string") continue;
    const s = k.trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

// ── Sanitize ────────────────────────────────────────────────

export function sanitizeVerfassung(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};

  const grenzenRoh = p.grenzen && typeof p.grenzen === "object" ? p.grenzen : {};
  const grenzen = {};
  for (const [pfad, band] of Object.entries(grenzenRoh)) {
    if (!band || typeof band !== "object") continue;
    const min = Number(band.min);
    const max = Number(band.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
    // Verdrehte Eingabe wird getauscht statt verworfen — der Admin meinte
    // erkennbar ein Band, nur andersherum aufgeschrieben.
    grenzen[pfad] = min <= max ? { min, max } : { min: max, max: min };
  }

  return {
    enabled: p.enabled === true,
    aenderbar: aspektListe(p.aenderbar),
    gesperrt: aspektListe(p.gesperrt),
    grenzen,
  };
}

export function sanitizeRegelAbstimmung(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const D = DEFAULT_REGEL_ABSTIMMUNG, L = ABSTIMMUNG_LIMITS;
  return {
    enabled: p.enabled === true,
    wer: ausKatalog(WAEHLER, p.wer, D.wer),
    mehrheit: ausKatalog(MEHRHEITEN, p.mehrheit, D.mehrheit),
    quorum: +clamp(p.quorum, L.quorum, D.quorum).toFixed(2),
    dauer: Math.round(clamp(p.dauer, L.dauer, D.dauer)),
    wirkungAb: ausKatalog(WIRKUNG_AB, p.wirkungAb, D.wirkungAb),
    wirkungVorlauf: Math.round(clamp(p.wirkungVorlauf, L.wirkungVorlauf, D.wirkungVorlauf)),
    vetoAdmin: p.vetoAdmin === true,
    antragsrecht: ausKatalog(ANTRAGSRECHT, p.antragsrecht, D.antragsrecht),
    sperrfrist: Math.round(clamp(p.sperrfrist, L.sperrfrist, D.sperrfrist)),
    sichtbarkeit: ausKatalog(STIMM_SICHT, p.sichtbarkeit, D.sichtbarkeit),
    aktivSpieltage: Math.round(clamp(p.aktivSpieltage, L.aktivSpieltage, D.aktivSpieltage)),
  };
}

// ── Grenzen ─────────────────────────────────────────────────

// Einen Punkt-Pfad („joker.faktor", „modCap") in einem verschachtelten Objekt
// nachschlagen. Liefert `undefined`, wenn der Pfad nicht existiert.
function pfadWert(objekt, pfad) {
  let cur = objekt;
  for (const teil of String(pfad).split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[teil];
  }
  return cur;
}

// Das WIRKSAME Band eines Feldes: der Schnitt aus harter Grenze und
// Verfassungs-Band. `harteGrenzen` ist `RULE_LIMITS` (kommt von außen, siehe
// Kopfkommentar). `null`, wenn der Pfad dort unbekannt ist — ein Band auf ein
// Feld ohne harte Grenze wäre nicht prüfbar, und geraten wird hier nichts.
export function effektiveGrenzen(feldPfad, verfassung, harteGrenzen = null) {
  const hart = harteGrenzen ? pfadWert(harteGrenzen, feldPfad) : null;
  if (!hart || !Number.isFinite(hart.min) || !Number.isFinite(hart.max)) return null;

  const v = sanitizeVerfassung(verfassung);
  const band = v.grenzen[feldPfad];
  if (!band) return { min: hart.min, max: hart.max };

  // Nur VERENGEN, nie erweitern (Spec Abschnitt 2). Deshalb hier und nicht
  // beim Speichern: so kann auch ein Band, das auf anderem Weg in die Daten
  // gelangt ist, nichts aufmachen.
  const min = Math.max(hart.min, band.min);
  const max = Math.min(hart.max, band.max);
  // Schließt sich das Band zu, bleibt wenigstens ein Punkt übrig statt eines
  // leeren Intervalls, das nichts mehr zulässt.
  return min <= max ? { min, max } : { min: hart.min, max: hart.min };
}

// ── Was überhaupt zur Wahl steht ────────────────────────────

export function aspektAenderbar(aspekt, verfassung) {
  // Über die Mitbestimmung selbst wird nie abgestimmt — vor allem anderen,
  // auch bevor gefragt wird, ob es überhaupt eine Verfassung gibt.
  if (aspekt === MITBESTIMMUNG_ASPEKT) {
    return { erlaubt: false, grund: "Über die Abstimmungsregeln und die Verfassung selbst wird nicht abgestimmt — die ändert nur der Admin, sichtbar für alle." };
  }
  const v = sanitizeVerfassung(verfassung);
  if (!v.enabled) return { erlaubt: true, grund: null };
  if (v.gesperrt.includes(aspekt)) {
    return { erlaubt: false, grund: "Dieser Bereich ist in der Verfassung dieser Runde festgeschrieben und lässt sich auch per Mehrheit nicht ändern." };
  }
  if (v.aenderbar.length && !v.aenderbar.includes(aspekt)) {
    return { erlaubt: false, grund: "Die Verfassung dieser Runde gibt nur bestimmte Bereiche zur Abstimmung frei — dieser gehört nicht dazu." };
  }
  return { erlaubt: true, grund: null };
}

// ── Wer darf was ────────────────────────────────────────────

export function darfStimmen(userId, rules, kontext = {}) {
  const a = sanitizeRegelAbstimmung(rules?.regelAbstimmung);
  if (!a.enabled) {
    return { erlaubt: false, grund: "In dieser Runde wird nicht über Regeln abgestimmt." };
  }
  const aktiv = kontext.aktiv !== false;
  // ⚠️ „Alle, Admin mit Veto" schließt niemanden aus — das Sonderrecht des
  // Admins ist das Veto, nicht der Ausschluss der anderen. Wer hier „nur der
  // Admin" hineinliest, dreht die Einstellung um.
  if (a.wer === "nurAktive" && !aktiv) {
    return { erlaubt: false, grund: "Mitstimmen darf, wer zuletzt auch getippt hat." };
  }
  return { erlaubt: true, grund: null };
}

export function darfBeantragen(aspekt, rules, userId, kontext = {}) {
  const a = sanitizeRegelAbstimmung(rules?.regelAbstimmung);
  if (!a.enabled) {
    return { erlaubt: false, grund: "In dieser Runde wird nicht über Regeln abgestimmt." };
  }
  if (typeof aspekt !== "string" || !aspekt.trim()) {
    return { erlaubt: false, grund: "Ein Antrag braucht einen Bereich, über den abgestimmt wird." };
  }

  const rahmen = aspektAenderbar(aspekt, rules?.verfassung);
  if (!rahmen.erlaubt) return rahmen;

  const istAdmin = kontext.istAdmin === true;
  const aktiv = kontext.aktiv !== false;
  if (a.antragsrecht === "nurAdmin" && !istAdmin) {
    return { erlaubt: false, grund: "In dieser Runde schlägt nur der Admin Regeländerungen vor — abstimmen dürfen alle." };
  }
  if (a.antragsrecht === "nurAktive" && !aktiv) {
    return { erlaubt: false, grund: "Vorschlagen darf, wer zuletzt auch getippt hat." };
  }

  // Sperrfrist. ⚠️ Ohne bekannten Stand wird sie NICHT geraten — dieselbe
  // Zurückhaltung wie bei `einsatzKonflikte` in `engine.js`, das eine
  // unbekannte Größe lieber ungeprüft lässt, als eine Zahl zu erfinden.
  const jetzt = Number(kontext.aktuellerSpieltag);
  if (a.sperrfrist > 0 && Number.isFinite(jetzt)) {
    const frueher = (Array.isArray(kontext.letzteEntscheidungen) ? kontext.letzteEntscheidungen : [])
      .filter((e) => e?.aspekt === aspekt && Number.isFinite(Number(e.entschiedenAm)))
      .map((e) => Number(e.entschiedenAm));
    if (frueher.length) {
      const frei = Math.max(...frueher) + a.sperrfrist;
      if (jetzt < frei) {
        const rest = frei - jetzt;
        return {
          erlaubt: false,
          grund: `Über diesen Bereich wurde gerade erst entschieden — er ist noch ${rest} ${rest === 1 ? "Spieltag" : "Spieltage"} lang gesperrt.`,
        };
      }
    }
  }

  return { erlaubt: true, grund: null };
}

// ── Auszählen ───────────────────────────────────────────────
// Form nach `tallyVotes` in `voting.js`: je Nutzer zählt die LETZTE Stimme.
// `mitglieder`: [{ userId, aktiv, istAdmin }] — daraus ergeben sich die
// Berechtigten über `darfStimmen`, damit es nur EINE Regel dafür gibt.
//
// ⚠️ Stimmen von Nicht-Berechtigten und von Unbekannten zählen NICHT mit.
// Sonst hebelte eine einzige Fremdstimme das Quorum aus, das sich ja auf die
// Zahl der Berechtigten bezieht.
export function zaehleAus(antrag, mitglieder = [], abstimmung = DEFAULT_REGEL_ABSTIMMUNG) {
  const a = sanitizeRegelAbstimmung(abstimmung);
  const rules = { regelAbstimmung: a };

  const berechtigteIds = new Set();
  for (const m of Array.isArray(mitglieder) ? mitglieder : []) {
    if (m?.userId == null) continue;
    if (darfStimmen(m.userId, rules, { aktiv: m.aktiv !== false, istAdmin: m.istAdmin === true }).erlaubt) {
      berechtigteIds.add(m.userId);
    }
  }

  // Letzte Stimme je Nutzer gewinnt — dieselbe Regel wie beim Joker-Votum.
  const letzte = new Map();
  for (const s of Array.isArray(antrag?.stimmen) ? antrag.stimmen : []) {
    if (s?.userId == null || !berechtigteIds.has(s.userId)) continue;
    if (s.ja === true || s.ja === false) letzte.set(s.userId, s.ja);
  }

  let ja = 0, nein = 0;
  for (const wert of letzte.values()) { if (wert) ja += 1; else nein += 1; }
  const abgegeben = ja + nein;
  const berechtigte = berechtigteIds.size;
  const beteiligung = berechtigte > 0 ? abgegeben / berechtigte : 0;

  // ⚠️ Toleranz beim Quorum-Vergleich. Ohne sie scheitert „genau ein Drittel"
  // an 0.3333333333333333 < 1/3 — der Spieler sieht eine erfüllte Bedingung
  // und bekommt gesagt, sie sei verfehlt. Dieselbe Fehlerklasse wie bei den
  // Einsatz-Gewichten in `engine.js` (dort steht die ausführliche Messung).
  const quorumErreicht = beteiligung >= a.quorum - 1e-9;

  const mehrheitErreicht = a.mehrheit === "einstimmig"
    ? abgegeben > 0 && nein === 0
    : a.mehrheit === "zweidrittel"
      ? abgegeben > 0 && ja >= (2 / 3) * abgegeben - 1e-9
      : ja > nein;

  const veto = a.vetoAdmin === true && antrag?.veto === true;
  const angenommen = quorumErreicht && mehrheitErreicht && !veto;

  // Der ERSTE Grund, mit den konkreten Zahlen — „abgelehnt" allein sagt
  // niemandem, was fehlte.
  let grund = null;
  if (veto) {
    grund = "Der Admin hat sein Veto eingelegt.";
  } else if (!quorumErreicht) {
    grund = `Zu wenige haben abgestimmt: ${abgegeben} von ${berechtigte}, gefordert sind ${Math.round(a.quorum * 100)} %.`;
  } else if (!mehrheitErreicht) {
    grund = a.mehrheit === "einstimmig"
      ? `Nicht einstimmig: ${nein} ${nein === 1 ? "Gegenstimme" : "Gegenstimmen"} bei ${abgegeben} abgegebenen.`
      : a.mehrheit === "zweidrittel"
        ? `Zwei Drittel nicht erreicht: ${ja} von ${abgegeben} abgegebenen Stimmen dafür.`
        : `Keine Mehrheit: ${ja} dafür, ${nein} dagegen.`;
  }

  return { ja, nein, abgegeben, berechtigte, beteiligung, quorumErreicht, mehrheitErreicht, veto, angenommen, grund };
}

// ── Ab wann ein Beschluss wirkt ─────────────────────────────
// ⚠️ Alles in RUNDEN-Spieltagen, auch `antrag.gestelltAm`. Das hält das Modul
// uhrenfrei (wie `voting.js`) und misst Frist, Dauer und Sperrfrist in
// derselben Einheit. Wer hier ein Datum hineinlegt, bekommt Unsinn — der
// Runden-Spieltag kommt aus `rundenSchluessel`/`zeitachse.js`, weil eine
// Regeländerung rundenweit gilt und nicht je Liga.
export function wirktAb(antrag, abstimmung = DEFAULT_REGEL_ABSTIMMUNG, { spieltage = 34, zuletztGeoeffnet = null } = {}) {
  const a = sanitizeRegelAbstimmung(abstimmung);
  const start = Number(antrag?.gestelltAm);
  if (!Number.isFinite(start)) {
    return { rundenSpieltag: null, grund: "Ohne Zeitpunkt des Antrags lässt sich nicht sagen, ab wann die Änderung gilt." };
  }

  // 🔴 Die Frist wird beim Stellen EINGEFROREN, nicht laufend nachgerechnet.
  // Ändert der Admin `dauer`, während eine Abstimmung läuft, verschöbe sich
  // sonst deren Ende mitten im Verfahren — dieselbe Kante wie beim
  // Quoten-Snapshot und bei der eingefrorenen Gewichtung. `laeuftBis` legt der
  // Store beim Anlegen ab; fehlt es (Altdaten, Vorschau vor dem Anlegen),
  // wird es aus der aktuellen Dauer errechnet.
  const gefroren = Number(antrag?.laeuftBis);
  const ende = Number.isFinite(gefroren) ? Math.round(gefroren) : Math.round(start) + a.dauer;
  let ziel = a.wirkungAb === "vorlauf" ? ende + a.wirkungVorlauf : ende + 1;

  // 🔴 Die harte Kante (Spec Abschnitt 1): ein bereits GEÖFFNETER Spieltag
  // darf nie betroffen sein. Keine Einstellung, keine Mehrheit hebt das auf.
  const offen = Number(zuletztGeoeffnet);
  if (Number.isFinite(offen)) ziel = Math.max(ziel, Math.round(offen) + 1);

  const N = Number.isFinite(spieltage) && spieltage > 0 ? Math.floor(spieltage) : 34;
  if (ziel > N) {
    // Ehrliches Ergebnis, kein Fehler — und es muss VOR der Abstimmung
    // sagbar sein, sonst stimmt eine Runde über etwas ab, das nie greift.
    return { rundenSpieltag: null, grund: "Diese Änderung würde erst nach dem letzten Spieltag greifen — in dieser Saison wirkt sie nicht mehr." };
  }
  return { rundenSpieltag: ziel, grund: null };
}

// ── Verstößt ein Antrag gegen die Verfassung? ───────────────
// `werte` ist ein Teil-Regelwerk: die Felder EINES Aspekts, dieselbe Form wie
// ein Teilbibliotheks-Eintrag.
//
// ⚠️ Bewusst werden NICHT alle Felder gegen die harten Grenzen geprüft — das
// ist die Aufgabe von `sanitizeRules`, und zwei Stellen mit derselben Prüfung
// laufen früher oder später auseinander. Hier wird nur geprüft, was die
// VERFASSUNG zusätzlich verengt hat.
//
// Gemeldet werden die FELDER, nicht bloß „nein" — sonst weiß der
// Antragsteller nicht, was er ändern muss (Spec Abschnitt 5).
export function verstoesstGegenVerfassung(werte, verfassung, aspekt = null, harteGrenzen = null) {
  const out = [];
  const rahmen = aspekt != null ? aspektAenderbar(aspekt, verfassung) : { erlaubt: true, grund: null };
  if (!rahmen.erlaubt) {
    out.push({ feld: null, wert: null, erlaubt: null, grund: rahmen.grund });
    return out;
  }

  const v = sanitizeVerfassung(verfassung);
  for (const pfad of Object.keys(v.grenzen)) {
    const wert = pfadWert(werte, pfad);
    if (!Number.isFinite(wert)) continue;   // Feld kommt im Antrag gar nicht vor
    const band = effektiveGrenzen(pfad, v, harteGrenzen);
    if (!band) continue;                    // ohne harte Grenze nicht prüfbar
    if (wert < band.min || wert > band.max) {
      // ⚠️ Wer die Grenze setzt, muss im Satz stehen. Ein zu weit gefasstes
      // Verfassungs-Band wird auf die harte Grenze beschnitten — dann kommt
      // die Schranke NICHT von der Verfassung, und wer dort danach sucht,
      // sucht vergebens. Beim Nachmessen aufgefallen: die erste Fassung
      // schrieb jede Grenze der Verfassung zu.
      const hart = effektiveGrenzen(pfad, DEFAULT_VERFASSUNG, harteGrenzen);
      const vonVerfassung = !hart || band.min !== hart.min || band.max !== hart.max;
      const quelle = vonVerfassung ? "Die Verfassung dieser Runde" : "Das Regelwerk";
      out.push({
        feld: pfad,
        wert,
        erlaubt: band,
        grund: `${quelle} lässt für diesen Wert nur ${band.min} bis ${band.max} zu — beantragt sind ${wert}.`,
      });
    }
  }
  return out;
}

// ── Die Live-Vorschau ────────────────────────────────────────
// Ein bis zwei Sätze in Alltagsdeutsch, mit AUSGERECHNETEN Zahlen statt
// Vokabeln: „Quorum 0,75" sagt niemandem etwas, „von 12 Mitgliedern müssen 9
// abstimmen" schon. Vorbild: `beschreibeBudget` (jokerBudget.js) und
// `anteilHinweis` (wettbewerbGewicht.js) — dort steht auch, warum die
// Betreuung durch konkrete Zahlen kein Komfort ist, sondern der Punkt.
//
// `mitglieder` ist die ZAHL der Mitglieder (optional). Ohne sie bleibt es bei
// Prozenten — geraten wird nichts.
export function beschreibeMitbestimmung(rules, { mitglieder = null, aspektKeys = [] } = {}) {
  const a = sanitizeRegelAbstimmung(rules?.regelAbstimmung);
  const v = sanitizeVerfassung(rules?.verfassung);

  if (!a.enabled) {
    return "Über die Regeln wird nicht abgestimmt — sie bleiben, wie der Admin sie angelegt hat.";
  }

  const mehrheitText = a.mehrheit === "einstimmig"
    ? "ohne eine einzige Gegenstimme"
    : a.mehrheit === "zweidrittel" ? "mit zwei Dritteln der abgegebenen Stimmen"
      : "mit einfacher Mehrheit";

  const n = Number(mitglieder);
  const quorumText = Number.isFinite(n) && n > 0
    // Aufgerundet: 0,5 von 11 sind 5,5 — abstimmen müssen dann 6, nicht 5.
    ? `mindestens ${Math.ceil(a.quorum * n)} von ${n} müssen abstimmen`
    : `mindestens ${Math.round(a.quorum * 100)} % müssen abstimmen`;

  const wirkung = a.wirkungAb === "vorlauf"
    ? `${a.wirkungVorlauf} Spieltage nach dem Ende der Abstimmung`
    : "am Spieltag nach dem Ende der Abstimmung";

  let text = `Ein Antrag läuft ${a.dauer} ${a.dauer === 1 ? "Spieltag" : "Spieltage"} und geht durch, `
    + `wenn er ${mehrheitText} angenommen wird — ${quorumText}. Wirksam wird er ${wirkung}, `
    + "nie rückwirkend.";

  if (v.enabled) {
    const alle = (Array.isArray(aspektKeys) ? aspektKeys : []).filter((k) => k !== MITBESTIMMUNG_ASPEKT);
    const offen = alle.filter((k) => aspektAenderbar(k, v).erlaubt).length;
    text += alle.length
      ? ` Die Verfassung gibt ${offen} von ${alle.length} Bereichen zur Abstimmung frei.`
      : " Dazu setzt die Verfassung einen festen Rahmen.";
  }
  if (a.vetoAdmin) text += " Der Admin kann jeden Beschluss kippen.";
  return text;
}

// ── Konflikte ───────────────────────────────────────────────
// Form wie `einsatzKonflikte` in `engine.js`: `{ key, text }`, die Korrektur
// steht als Satz IM Text. `aspektKeys` kommt von außen (`ASPEKT_KEYS` aus
// `presetMerge.js`) — siehe Kopfkommentar, warum es hier keinen Import gibt.
export function konflikte(rules, aspektKeys = []) {
  const a = sanitizeRegelAbstimmung(rules?.regelAbstimmung);
  const v = sanitizeVerfassung(rules?.verfassung);
  const out = [];
  if (!a.enabled) return out;

  // 1. „Einstimmig" ohne volles Quorum sagt etwas anderes, als es tut.
  if (a.mehrheit === "einstimmig" && a.quorum < 1) {
    out.push({
      key: "einstimmig-ohne-quorum",
      text: `„Einstimmig“ zählt nur die abgegebenen Stimmen — bei einem Quorum von ${Math.round(a.quorum * 100)} % hieße das „einstimmig unter denen, die zufällig abgestimmt haben“. Wer wirklich Einstimmigkeit will, setzt das Quorum auf 100 %.`,
    });
  }

  // 2. Ein Bereich steht in beiden Listen.
  const doppelt = v.aenderbar.filter((k) => v.gesperrt.includes(k));
  if (v.enabled && doppelt.length) {
    out.push({
      key: "aspekt-doppelt-gelistet",
      text: `${doppelt.length === 1 ? "Ein Bereich steht" : `${doppelt.length} Bereiche stehen`} gleichzeitig als änderbar und als festgeschrieben in der Verfassung. Festgeschrieben gewinnt — nimm sie aus einer der beiden Listen heraus, damit klar ist, was gilt.`,
    });
  }

  // 3. Es gibt nichts zu beschließen.
  const kandidaten = (Array.isArray(aspektKeys) ? aspektKeys : []).filter((k) => k !== MITBESTIMMUNG_ASPEKT);
  if (v.enabled && kandidaten.length && kandidaten.every((k) => !aspektAenderbar(k, v).erlaubt)) {
    out.push({
      key: "nichts-abstimmbar",
      text: "Die Verfassung schreibt jeden Bereich fest — es gibt nichts, worüber die Runde abstimmen könnte. Gib mindestens einen Bereich frei oder schalte die Abstimmung ab.",
    });
  }

  // 4. Vorschlagsrecht und Veto in einer Hand.
  if (a.antragsrecht === "nurAdmin" && a.vetoAdmin) {
    out.push({
      key: "admin-schlaegt-vor-und-kippt",
      text: "Nur der Admin darf vorschlagen, und er kann jeden Beschluss kippen — zulässig, aber dann entscheidet er allein und die Abstimmung ist eine Empfehlung. Gib entweder das Vorschlagsrecht frei oder verzichte auf das Veto.",
    });
  }

  // 5. Ohne Sperrfrist wird derselbe Antrag zur Dauerschleife.
  if (a.sperrfrist === 0) {
    out.push({
      key: "keine-sperrfrist",
      text: "Ohne Sperrfrist lässt sich derselbe Antrag nach einer Ablehnung sofort wieder stellen — so lange, bis er einmal durchgeht. Ein paar Spieltage Abstand genügen.",
    });
  }

  return out;
}
