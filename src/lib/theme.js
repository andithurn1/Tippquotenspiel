// ============================================================
//  DESIGN-EBENE — die EINE Quelle für Farben, Schrift und Form.
//
//  Vorher lag in jedem Screen ein eigenes `const C = {…}` (22 Kopien). Eine
//  Farbe zu ändern hieß, 22 Dateien anzufassen — und die Kopien liefen bereits
//  auseinander. Ab hier gilt: KEINE Hex-Werte mehr in Komponenten, alles über
//  diese Tokens.
//
//  Aufbau bewusst nach Bedeutung („surface", „muted") statt nach Aussehen
//  („dunkelblau"). Dadurch lässt sich später eine echte Theme-Umschaltung
//  (z. B. Vereinsfarbe des Nutzers, helles Design) einbauen, ohne einen
//  einzigen Screen anzufassen — es tauscht nur dieses Modul die Werte.
//
//  Reine Daten, kein React, kein I/O — damit auch aus lib/ nutzbar.
// ============================================================

// ── Grundpalette ────────────────────────────────────────────
export const COLORS = {
  // Flächen, von hinten nach vorn
  ink: "#0B0E1F",        // Seitenhintergrund
  ink2: "#12172E",       // abgesetzte Karte
  surface: "#1A2040",    // Bedienelement (Knopf, Feld)
  surface2: "#232A50",   // Bedienelement, hervorgehoben

  // Linien
  line: "rgba(255,255,255,0.09)",        // Standard-Trennlinie
  lineStrong: "rgba(255,255,255,0.14)",  // deutlichere Kante (z. B. Popover)

  // Schrift
  text: "#EDEEF6",       // Fließtext
  muted: "#8A90B4",      // Nebeninfo, Beschriftung
  ghost: "rgba(255,255,255,0.15)",  // kaum sichtbar (ausgeblendete Werte)

  // Signalfarben — tragen im Spiel feste Bedeutung
  gold: "#F5C451",       // Hervorhebung, Joker, „dein Wert"
  mint: "#54E0A0",       // positiv, bestätigt, Erfolg
  coral: "#FF5470",      // negativ, Warnung, Verlust

  // Neutrale Akzente — reine Unterscheidung, ohne Wertung
  sky: "#4FD1E8",        // Verlauf, Historie
  indigo: "#8B9BFF",     // Admin-Bereiche, Tendenz-Ebene
  violet: "#B98BFF",     // persönliche Einstellungen
  bar: "#4A5488",        // neutraler Balken im Diagramm
};

// Kurzname `C` — so heißen die Objekte in den Screens bisher schon, dadurch
// bleibt der Umbau minimal und der Code liest sich unverändert.
export const C = COLORS;

// ── Schrift ─────────────────────────────────────────────────
export const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
export const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";

// ── Datenreihen-Farben (Plots) ──────────────────────────────
// Bewusst gut unterscheidbare Farbtöne, hell auf dunklem Grund. Reihenfolge
// ist die Vergabereihenfolge — die ersten sind am besten unterscheidbar.
export const SERIES = [
  COLORS.gold, COLORS.mint, COLORS.coral, COLORS.sky,
  "#A78BFA", "#FF9F43", "#F368E0", "#B4E04F",
];

// ── Ampel-Stufen ────────────────────────────────────────────
// Eine Stelle für „grün/gelb/rot", damit Balance-Ampel und spätere Warnungen
// dieselbe Sprache sprechen.
export const AMPEL = {
  gruen: COLORS.mint,
  gelb: COLORS.gold,
  rot: COLORS.coral,
};
