// ── Rechtliche Eckdaten an EINER Stelle ─────────────────────
// Impressum (§ 5 DDG/TMG) und Datenschutzerklärung (Art. 13 DSGVO) ziehen
// ihre Betreiber-/Kontaktangaben aus diesem Objekt, damit sie konsistent
// bleiben und du sie NUR HIER pflegen musst.
// Ausgefüllt am 27.07.2026 — diese Angaben sind gesetzlich verpflichtend und
// erscheinen öffentlich in Impressum und Datenschutzerklärung.
export const LEGAL = {
  appName: "Tippquotenspiel",
  betreiber: "Andreas Thurn",
  anschrift: "Regina-Ullmann-Straße 10, 85622 Feldkirchen",
  email: "andi.thurn@yahoo.de",
  // Auftragsverarbeiter (Hosting / Auth / DB). Anpassen, falls du wechselst.
  hoster: "Vercel Inc. (Frontend-Hosting)",
  datenbank: "Supabase (Auth + Datenbank, EU-Region)",
  // Stand der Datenschutzerklärung — bei inhaltlichen Änderungen hochzählen.
  stand: "Juli 2026",
};

// Die personenbezogenen Daten, die die App tatsächlich verarbeitet — bewusst
// minimal (Datenminimierung, Art. 5 Abs. 1 lit. c DSGVO). Diese Liste ist die
// „Single Source of Truth" für die Datenschutzerklärung UND den Datenexport.
export const DATA_POINTS = [
  { key: "email", label: "E-Mail-Adresse", zweck: "Login per Magic-Link (kein Passwort) und Kontaktmöglichkeit." },
  { key: "display_name", label: "Anzeigename", zweck: "Darstellung im Leaderboard deiner Runden." },
  { key: "tips", label: "Deine Tipps", zweck: "Kern der App — Grundlage für Punkte und Rangliste." },
  { key: "rounds", label: "Runden-Mitgliedschaften", zweck: "Zuordnung, in welchen Freundes-Runden du mitspielst." },
];
