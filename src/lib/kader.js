// ============================================================
//  KADER — wer gehört zu welchem Verein, abgeleitet aus den Quoten selbst
//
//  ── Das Problem ──
//  Die Torschützen-Quoten nennen Spieler ohne Verein:
//      { name: "Yes", description: "Talles Magno", price: 2.15 }
//  21 Namen je Spiel, und nirgends steht, wer zu welcher Mannschaft gehört.
//  Unser Tippmodell braucht das getrennt (`picks.home` / `picks.away`).
//
//  ── Warum KEINE Kaderquelle ──
//  Eine externe Kaderliste wäre eine zweite Abhängigkeit, die gepflegt werden
//  muss: Transfers, Leihen, Verletzte, Sperren. Das Projekt hat sich bewusst
//  gegen echte Kader entschieden, weil sie nach jedem Transferfenster falsch
//  sind — genau derselbe Grund gilt hier weiter.
//
//  **Die Quoten SIND der Kader.** Ein Buchmacher bepreist keinen Spieler, der
//  nicht spielen kann. Wer verletzt oder gesperrt ist, taucht gar nicht erst
//  auf; wer den Verein wechselt, erscheint automatisch beim neuen. Es fehlt
//  also nur die Zuordnung — und die steckt in den Daten, wenn man mehrere
//  Spiele nebeneinanderlegt:
//
//      Spiel A: NYC vs Toronto  → Talles Magno kommt vor  → {NYC, Toronto}
//      Spiel B: NYC vs Montreal → Talles Magno kommt vor  → {NYC, Montreal}
//      Schnittmenge                                       → {NYC} ✓
//
//  Zwei Spiele mit verschiedenen Gegnern genügen. Bis dahin bleibt ein Spieler
//  „offen" und wird schlicht nicht angeboten — lieber ein Spieler zu wenig als
//  einer bei der falschen Mannschaft.
//
//  ⚠️ Die Zuordnung ist eine SCHNITTMENGE, kein Mehrheitsentscheid. Ein
//  Wechsel mitten in der Saison würde die Schnittmenge leeren; deshalb gewinnt
//  bei einem Widerspruch die NEUERE Beobachtung (siehe `verschmelze`), statt
//  den Spieler für immer als unauflösbar zu führen.
//
//  Reine Funktionen, UI-frei, kennt keine Vereinsnamen (Architektur-Regel 3).
// ============================================================

// Eine BEOBACHTUNG ist ein Spiel mit den Spielern, die der Markt dafür geführt
// hat: { home, away, spieler: ["Talles Magno", …] }.

// ── Die Sicherheits-Eigenschaft, auf der alles ruht ─────────
// Ein Spieler taucht NUR in Spielen seines eigenen Vereins auf. Sein Verein
// steht deshalb in JEDEM beobachteten Paar — und damit immer auch in der
// Schnittmenge. Bleibt am Ende genau einer übrig, ist es zwangsläufig der
// richtige. **Das Verfahren kann sich nicht vertun, es kann nur unentschieden
// bleiben.** Ein falsch zugeordneter Spieler wäre der teure Fehler (auffallen
// würde er erst bei der Abrechnung); ein unentschiedener kostet nur Komfort.
//
// Die eine Ausnahme sind NAMENSGLEICHE Spieler in zwei Vereinen. Dann leert
// sich die Schnittmenge, und die Regel „die neuere Beobachtung gewinnt" (die
// für Transfers da ist) würde hin- und herspringen. Dafür gibt es `UEBERSTEUERT`
// unten — die einzige Stelle, an der von Hand eingegriffen wird.

// Aus Beobachtungen eine Zuordnung bauen.
//
// `vorher` sind die BISHER bekannten Zuordnungen. Sie einzubeziehen ist kein
// Beiwerk, sondern behebt den Fall, der sonst erst nach Markteintritt auffliegt:
//
//   Ein Spieler ist zwei Monate verletzt. Der Buchmacher führt ihn nicht, also
//   verschwindet er aus den Beobachtungen. Ohne Gedächtnis wäre er nach seinem
//   Comeback wieder unbekannt und müsste ZWEI Spieltage lang neu aufgelöst
//   werden — ausgerechnet der zurückkehrende Star ist dann nicht tippbar.
//
// Mit Gedächtnis behält er seine Zuordnung über die ganze Verletzung und ist am
// ersten Tag zurück wieder wählbar. Widerspricht eine neue Beobachtung (er ist
// gewechselt), wird die alte Zuordnung verworfen — Sicherheit geht vor Komfort.
//
// Rückgabe:
//   zuordnung — { Spieler: Verein } für alles Eindeutige
//   offen     — [{ spieler, moeglich: [Verein, …] }] für den Rest, damit
//               sichtbar ist, WORAN es noch fehlt (meist: nur ein Spiel gesehen)
export function zuordne(beobachtungen = [], vorher = {}) {
  const kandidaten = new Map();   // Spieler → Set möglicher Vereine
  for (const b of beobachtungen) {
    if (!b?.home || !b?.away) continue;
    const paar = [b.home, b.away];
    for (const spieler of b.spieler ?? []) {
      const name = String(spieler ?? "").trim();
      if (!name) continue;
      const bisher = kandidaten.get(name);
      if (!bisher) { kandidaten.set(name, new Set(paar)); continue; }
      const schnitt = new Set(paar.filter((v) => bisher.has(v)));
      // Leere Schnittmenge = Widerspruch (Vereinswechsel oder Datenfehler).
      // Die neuere Beobachtung gewinnt, sonst bliebe der Spieler für immer
      // unauflösbar — und ein Transfer ist der Normalfall, kein Fehler.
      kandidaten.set(name, schnitt.size ? schnitt : new Set(paar));
    }
  }

  const zuordnung = {};
  const offen = [];
  for (const [spieler, vereine] of [...kandidaten].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (vereine.size === 1) { zuordnung[spieler] = [...vereine][0]; continue; }
    // Noch nicht eindeutig — aber vielleicht wissen wir es schon von früher.
    // Übernommen wird die alte Zuordnung nur, wenn sie zu dem passt, was wir
    // GERADE sehen. Ist sie nicht mehr unter den Kandidaten, ist der Spieler
    // gewechselt und die alte Antwort wäre falsch.
    const alt = vorher[spieler];
    if (alt && vereine.has(alt)) zuordnung[spieler] = alt;
    else offen.push({ spieler, moeglich: [...vereine].sort() });
  }

  // Wer gerade GAR NICHT beobachtet wurde (verletzt, gesperrt, nicht im Kader),
  // behält seine Zuordnung. Genau das macht das Comeback nahtlos.
  for (const [spieler, verein] of Object.entries(vorher)) {
    if (!kandidaten.has(spieler)) zuordnung[spieler] = verein;
  }

  // Handarbeit schlägt alles — aber nur hier, an einer benannten Stelle.
  for (const [spieler, verein] of Object.entries(UEBERSTEUERT)) {
    zuordnung[spieler] = verein;
  }
  return { zuordnung, offen: offen.filter((o) => !(o.spieler in UEBERSTEUERT)) };
}

// ── Die Notbremse ───────────────────────────────────────────
// Für die Fälle, die das Verfahren nicht lösen KANN: zwei Spieler mit
// identischem Namen in verschiedenen Vereinen. Bewusst eine winzige, von Hand
// gepflegte Liste — wächst sie über eine Handvoll Einträge, stimmt etwas
// anderes nicht, und dann gehört das untersucht statt zugepflastert.
export const UEBERSTEUERT = {
  // "Vorname Nachname": "Vereinsname aus unserem Katalog",
};

// Beobachtungen zusammenführen und dabei alte begrenzen. Ohne Obergrenze
// wüchse die Datei über eine Saison ins Unbrauchbare; mit ihr bleibt die
// Zuordnung aktuell, weil alte Beobachtungen hinausfallen — und genau das ist
// bei Transfers erwünscht.
export const MAX_BEOBACHTUNGEN = 400;

export function verschmelze(alt = [], neu = []) {
  const zusammen = [...alt, ...neu];
  // Dieselbe Begegnung nicht doppelt: der Abruf läuft mehrmals, und ein Spiel
  // zweimal zu zählen ändert an der Schnittmenge nichts, bläht die Datei aber.
  const gesehen = new Set();
  const eindeutig = [];
  for (let i = zusammen.length - 1; i >= 0; i--) {
    const b = zusammen[i];
    const key = `${b.home}|${b.away}|${b.kickoff ?? ""}`;
    if (gesehen.has(key)) continue;
    gesehen.add(key);
    eindeutig.unshift(b);
  }
  return eindeutig.slice(-MAX_BEOBACHTUNGEN);
}

// Die Spieler EINES Spiels auf die beiden Mannschaften aufteilen — das, was
// der Snapshot am Ende braucht.
//
// Unzugeordnete Spieler landen bewusst NIRGENDS: ein Spieler bei der falschen
// Mannschaft wäre ein stiller Fehler, der erst bei der Abrechnung auffällt,
// und dann hat jemand auf ihn getippt.
export function teileAuf({ home, away, spieler = [], zuordnung = {} }) {
  const heim = [], gast = [], unbekannt = [];
  for (const s of spieler) {
    const verein = zuordnung[s];
    if (verein === home) heim.push(s);
    else if (verein === away) gast.push(s);
    else unbekannt.push(s);
  }
  return { home: heim, away: gast, unbekannt };
}

// Wie weit ist die Zuordnung? Speist die Anzeige im Abruf-Skript: solange hier
// viel offen ist, lohnt ein weiterer Abruf mehr als jede Handarbeit.
export function fortschritt({ zuordnung = {}, offen = [] }) {
  const zugeordnet = Object.keys(zuordnung).length;
  const gesamt = zugeordnet + offen.length;
  return {
    zugeordnet,
    offen: offen.length,
    gesamt,
    anteil: gesamt ? zugeordnet / gesamt : 0,
  };
}
