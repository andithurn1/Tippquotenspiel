// ============================================================
//  FAVORITEN-SPERRE — „immer Harry Kane nehmen, boring"
//
//  🔴 Andi, 26.08.2026, wörtlich: „dass der admin einstellen kann, dass bspw.
//  die wahrscheinlichsten quoten bei Torschützen und Spielstand nicht
//  ausgewählt werden können (in abhängigkeit der betippten Mannschaften und
//  pro Wettbewerb) sobald sie einen Schwellenwert nicht erreichen … find halt
//  immer harry kane nehmen boringo"
//
//  ── EBENE 5 (AUSWAHL), und darauf steht oder fällt sie ──
//  Es wird nichts umgewertet und nichts vergeben — es wird etwas WEGGENOMMEN.
//  Damit ist es keine Balance-Frage und darf gebaut werden, bevor Balancing
//  drankommt. ⚠️ Die ZAHLEN darin (wie viele gesperrt, ab welcher Quote) sind
//  dagegen Balance und stehen deshalb auf AUS bzw. auf einem Platzhalter.
//
//  ── 🔴 Warum ZWEI Bauarten und nicht eine ──
//  Andis Klammer („in Abhängigkeit der betippten Mannschaften und pro
//  Wettbewerb") beschreibt ein echtes Problem, das die Bauart entscheidet:
//
//    `quote` — „alles unter Quote 2,0 gesperrt". Einfach zu erklären, aber in
//              einer schwachen Liga sperrt es NICHTS und bei Bayern gegen
//              einen Aufsteiger fast alles. Braucht dann wirklich einen Wert
//              je Wettbewerb (`jeWettbewerb`).
//    `rang`  — „die 2 wahrscheinlichsten gesperrt". Gilt immer relativ zu
//              DIESEM Spiel und löst Andis Klammer damit von selbst auf: ein
//              Wert genügt für alle Wettbewerbe.
//
//  Statt die Frage zu raten, kann der Admin sie beantworten. Das ist der
//  Baukasten-Grundsatz (CLAUDE.md): will er das eine, soll er es haben.
//
//  ── ⚠️ Es bleibt IMMER etwas übrig ──
//  Bei Bayern gegen einen Aufsteiger könnte eine strenge Sperre den halben
//  sinnvollen Raum wegnehmen. `mindestensOffen` ist deshalb kein Beiwerk,
//  sondern die Sicherung: gesperrt wird nur so weit, wie danach noch genug
//  Auswahl bleibt. Eine Sperre, die einen Tipp unmöglich macht, ist ein
//  Fehler und keine Einstellung.
//
//  ── Jede Sperre trägt ihren GRUND ──
//  🔴 Andi, 26.08.2026: „mach dann auch bei der Tippabgabe einsehbar für die
//  nutzer, dass halt bspw. kane wegen der einstellung gesperrt ist mit
//  knapper begründung." Deshalb gibt keine Funktion hier ein nacktes `true`
//  zurück, sondern immer `{ gesperrt, grund }`. Ein ausgegrauter Knopf ohne
//  Erklärung ist die Sorte Oberfläche, bei der man zweimal tippt und dann
//  glaubt, die App sei kaputt.
//
//  Reine Funktionen, UI-frei.
// ============================================================

export const SPERRE_MODI = ["rang", "quote"];

export const SPERRE_LIMITS = {
  schuetzen: { min: 0, max: 6, step: 1 },
  ergebnisse: { min: 0, max: 8, step: 1 },
  mindestQuote: { min: 1, max: 15, step: 0.1 },
  mindestensOffen: { min: 1, max: 20, step: 1 },
  freischaltungen: { min: 0, max: 5, step: 1 },
};

// ⛔ AUS als Vorgabe, und die Zahlen darin sind Platzhalter. Was eine gute
// Sperre ist, wird am Ende festgelegt (CLAUDE.md, Balancing ist Endphase) —
// hier steht nur, was der Mechanismus kann.
export const DEFAULT_SPERRE = {
  enabled: false,
  modus: "rang",
  schuetzen: 1,        // im Modus `rang`: wie viele der wahrscheinlichsten
  ergebnisse: 1,
  mindestQuote: 2,     // im Modus `quote`: alles darunter ist gesperrt
  mindestensOffen: 4,  // so viele Optionen bleiben IMMER wählbar
  // 🔴 Der JOKER dazu (Andi, 26.08.2026: „mach generell solche mechaniken auch
  // als Ereignis verfügbar und als Joker"). 0 = es gibt ihn nicht.
  //
  // Er steht HIER und nicht bei den Fremdjokern, und das ist die Antwort auf
  // Andis Rückfrage nach den Bedenken: ein Joker, der MIR eine Sperre nimmt,
  // geht immer auf — er erweitert nur meine eigene Auswahl, vor meinem
  // eigenen Tipp. Ein Joker, der DIR eine Sperre auflegt, ginge es nicht so
  // ohne Weiteres: du hast womöglich längst getippt, und eine Sperre, die
  // einen abgegebenen Tipp nachträglich ungültig macht, ist dieselbe Falle
  // wie ein nachträglich geänderter Quoten-Schnappschuss. Die Richtung steht
  // deshalb als offene Frage in `design/ideen.md` — hier steht die, die trägt.
  //
  // ⚠️ Die Anzahl stellt der ADMIN, die Auswahl trifft der SPIELER bei der
  // Tippabgabe — wörtlich dieselbe Bauart wie `eingriffe.schutz` (JK14).
  freischaltungen: 0,
};

const zahl = (v, { min, max }, ersatz) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : ersatz;
};

export function sanitizeSperre(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const L = SPERRE_LIMITS;
  const modus = SPERRE_MODI.includes(p.modus) ? p.modus : DEFAULT_SPERRE.modus;
  const schuetzen = Math.round(zahl(p.schuetzen, L.schuetzen, DEFAULT_SPERRE.schuetzen));
  const ergebnisse = Math.round(zahl(p.ergebnisse, L.ergebnisse, DEFAULT_SPERRE.ergebnisse));
  const mindestQuote = +zahl(p.mindestQuote, L.mindestQuote, DEFAULT_SPERRE.mindestQuote).toFixed(1);
  const mindestensOffen = Math.round(zahl(p.mindestensOffen, L.mindestensOffen, DEFAULT_SPERRE.mindestensOffen));
  const freischaltungen = Math.round(zahl(p.freischaltungen, L.freischaltungen, DEFAULT_SPERRE.freischaltungen));
  return {
    // ⚠️ Dieselbe Bauart wie `sanitizeWettbewerbe`: eingeschaltet ist sie nur,
    // wenn sie auch etwas TUT. Im Rang-Modus mit 0 und 0 gesperrten Optionen
    // wäre `enabled: true` eine Einstellung, die nichts bewirkt — und die
    // Oberfläche zeigte einen aktiven Schalter ohne Wirkung.
    enabled: p.enabled === true
      && (modus === "quote" ? mindestQuote > 1 : schuetzen > 0 || ergebnisse > 0),
    modus, schuetzen, ergebnisse, mindestQuote, mindestensOffen, freischaltungen,
  };
}

// ── Der eine Sperr-Entscheider ──────────────────────────────
// Bekommt eine Liste `[{ id, quote }]` und gibt sie mit `gesperrt`/`grund`
// zurück. Beide Märkte (Torschützen, Ergebnisse) laufen hier durch — sonst
// entstünden zwei Fassungen derselben Regel.
//
// ⚠️ Sortiert wird nach Quote AUFSTEIGEND: die niedrigste Quote ist der
// wahrscheinlichste Ausgang. Wer hier absteigend sortiert, sperrt genau die
// Außenseiter, die das Spiel interessant machen — der Fehler wäre in der
// Oberfläche nicht zu sehen, weil gesperrt ja gesperrt aussieht.
function entscheide(optionen, { anzahl, modus, mindestQuote, mindestensOffen, grundText = null }) {
  const gueltig = optionen.filter((o) => Number.isFinite(o.quote) && o.quote > 0);
  const sortiert = [...gueltig].sort((a, b) => a.quote - b.quote);

  // Wie viele DÜRFEN höchstens gesperrt werden, damit genug offen bleibt?
  const spielraum = Math.max(0, sortiert.length - mindestensOffen);

  let gesperrteIds;
  if (modus === "quote") {
    const kandidaten = sortiert.filter((o) => o.quote < mindestQuote);
    gesperrteIds = new Set(kandidaten.slice(0, spielraum).map((o) => o.id));
  } else {
    gesperrteIds = new Set(sortiert.slice(0, Math.min(anzahl, spielraum)).map((o) => o.id));
  }

  return optionen.map((o) => {
    if (!gesperrteIds.has(o.id)) return { ...o, gesperrt: false, grund: null };
    return {
      ...o,
      gesperrt: true,
      grund: grundText ?? (modus === "quote"
        ? `gesperrt: Quote unter ${String(mindestQuote).replace(".", ",")}`
        : `gesperrt: zu wahrscheinlich`),
    };
  });
}

// ── Der persönliche Eingriff — ZWEITER Durchgang ────────────
// 🔴 Andi, 26.08.2026: „mach generell solche mechaniken auch als Ereignis
// verfügbar und als Joker". Ein Ereignis kann EINEN Spieler für EINEN Spieltag
// zusätzlich sperren (`wirkung.js`, Typ `sperre`).
//
// ⚠️ Warum ein zweiter Durchgang und kein größerer erster: die Runde kann im
// Modus `quote` laufen, der Eingriff zählt aber immer im Rang („die nächsten
// zwei"). In EINEM Durchgang ließen sich beide Bauarten nicht sauber
// verrechnen — und eine Zahl, die zwei Regeln zugleich meint, ist genau die
// zweite Wahrheit, vor der die Runden-Schicht warnt.
//
// ⚠️ Der zweite Durchgang läuft über die noch OFFENEN Optionen. Dadurch
// verschärft der Eingriff immer und lockert nie, und `mindestensOffen` gilt
// weiter für das Gesamtergebnis: was der Runden-Durchgang schon gesperrt hat,
// zählt nicht mehr als Spielraum.
// ⚠️ `eingriff.frei` (die Freischaltung, oben) hebt BEIDE Richtungen auf — die
// Sperre der Runde UND eine persönliche aus einem Ereignis. Alles andere wäre
// nicht erklärbar: „aufgehoben, aber nicht ganz" ist keine Aussage, die auf
// einen Knopf passt.
function persoenlich(eintraege, cfg, anzahl) {
  if (!anzahl) return eintraege;
  const offen = eintraege.filter((o) => !o.gesperrt);
  const zweite = entscheide(offen, {
    anzahl, modus: "rang",
    mindestQuote: cfg.mindestQuote, mindestensOffen: cfg.mindestensOffen,
    grundText: "gesperrt: für dich, wegen eines Ereignisses",
  });
  const nach = new Map(zweite.map((o) => [o.id, o]));
  return eintraege.map((o) => nach.get(o.id) ?? o);
}

// ── Torschützen ─────────────────────────────────────────────
// `snap.players` liegt als `{ home: {...}, away: {...} }` vor. Gesperrt wird
// über BEIDE Mannschaften hinweg, nicht je Team: der wahrscheinlichste
// Torschütze des Spiels ist einer, nicht zwei.
export function schuetzenSperre(snap, rules, eingriff = null) {
  const cfg = sanitizeSperre(rules?.sperre);
  const alle = [
    ...Object.entries(snap?.players?.home ?? {}).map(([name, q]) => ({ id: name, seite: "home", quote: q?.anytime })),
    ...Object.entries(snap?.players?.away ?? {}).map(([name, q]) => ({ id: name, seite: "away", quote: q?.anytime })),
  ];
  if (eingriff?.frei) return alle.map((o) => ({ ...o, gesperrt: false, grund: null }));
  const runde = (!cfg.enabled || !cfg.schuetzen)
    ? alle.map((o) => ({ ...o, gesperrt: false, grund: null }))
    : entscheide(alle, {
      anzahl: cfg.schuetzen, modus: cfg.modus,
      mindestQuote: cfg.mindestQuote, mindestensOffen: cfg.mindestensOffen,
    });
  return persoenlich(runde, cfg, eingriff?.schuetzen);
}

// ── Ergebnisse (Spielstand) ─────────────────────────────────
// `snap.correctScore` ist ein Raster [heim][auswärts]. Die Id ist „h:a" —
// dieselbe Schreibweise, die die Oberfläche ohnehin benutzt.
export function ergebnisSperre(snap, rules, eingriff = null) {
  const cfg = sanitizeSperre(rules?.sperre);
  const raster = Array.isArray(snap?.correctScore) ? snap.correctScore : [];
  const alle = [];
  for (let h = 0; h < raster.length; h++) {
    const zeile = Array.isArray(raster[h]) ? raster[h] : [];
    for (let a = 0; a < zeile.length; a++) alle.push({ id: `${h}:${a}`, home: h, away: a, quote: zeile[a] });
  }
  if (eingriff?.frei) return alle.map((o) => ({ ...o, gesperrt: false, grund: null }));
  const runde = (!cfg.enabled || !cfg.ergebnisse)
    ? alle.map((o) => ({ ...o, gesperrt: false, grund: null }))
    : entscheide(alle, {
      anzahl: cfg.ergebnisse, modus: cfg.modus,
      mindestQuote: cfg.mindestQuote, mindestensOffen: cfg.mindestensOffen,
    });
  return persoenlich(runde, cfg, eingriff?.ergebnisse);
}

// ── Zwei Nachschlage-Helfer für die Oberfläche ──────────────
// Damit ein Screen nicht selbst über die Liste laufen muss (und dabei eine
// zweite Fassung der Regel baut — die Runden-Schicht in CLAUDE.md).
export function istSchuetzeGesperrt(snap, rules, name, eingriff = null) {
  return schuetzenSperre(snap, rules, eingriff).find((o) => o.id === name)
    ?? { gesperrt: false, grund: null };
}
export function istErgebnisGesperrt(snap, rules, home, away, eingriff = null) {
  return ergebnisSperre(snap, rules, eingriff).find((o) => o.id === `${home}:${away}`)
    ?? { gesperrt: false, grund: null };
}

// Ein Satz für den Admin: was bewirkt die Einstellung an DIESEM Spiel?
export function beschreibeSperre(snap, rules) {
  const cfg = sanitizeSperre(rules?.sperre);
  if (!cfg.enabled) return "Alle Torschützen und Ergebnisse sind wählbar.";
  const s = schuetzenSperre(snap, rules).filter((o) => o.gesperrt);
  const e = ergebnisSperre(snap, rules).filter((o) => o.gesperrt);
  const teile = [];
  if (s.length) teile.push(`${s.length} Torschütze${s.length === 1 ? "" : "n"} (${s.map((o) => o.id).join(", ")})`);
  if (e.length) teile.push(`${e.length} Ergebnis${e.length === 1 ? "" : "se"} (${e.map((o) => o.id).join(", ")})`);
  if (!teile.length) return "An diesem Spiel greift die Sperre nicht — es bleibt zu wenig Auswahl übrig.";
  return `Gesperrt: ${teile.join(" und ")}.`;
}
