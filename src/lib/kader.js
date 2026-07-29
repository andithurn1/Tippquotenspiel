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

// Aus Beobachtungen eine Zuordnung bauen.
//
// Rückgabe:
//   zuordnung — { Spieler: Verein } für alles Eindeutige
//   offen     — [{ spieler, moeglich: [Verein, …] }] für den Rest, damit
//               sichtbar ist, WORAN es noch fehlt (meist: nur ein Spiel gesehen)
export function zuordne(beobachtungen = []) {
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
    if (vereine.size === 1) zuordnung[spieler] = [...vereine][0];
    else offen.push({ spieler, moeglich: [...vereine].sort() });
  }
  return { zuordnung, offen };
}

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
