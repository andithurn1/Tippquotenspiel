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

// ============================================================
//  FANFARBEN — Vereinsfarben auf die Akzent-Rollen legen
//
//  Idee (siehe docs/THEMING.md): Der Nutzer wählt 2–3 Vereinsfarben. Das
//  Layout bleibt überall gleich, nur die AKZENT-Rollen tragen die Farben —
//  systematisch dieselbe Rolle in jedem Modul. Umgesetzt OHNE Screen-Umbau:
//  wir überschreiben die Akzent-Tokens direkt auf dem gemeinsamen COLORS-
//  Objekt (dieselbe Referenz wie `C`), der ThemeProvider löst danach ein
//  Remount aus, damit die Screens die neuen Werte lesen.
//
//  UNANGETASTET bleiben: das neutrale Gerüst (ink/surface/text/muted/line)
//  und die WERTUNGSFARBEN mint (Erfolg) & coral (Warnung) — deren Bedeutung
//  darf nicht durch eine Vereinsfarbe verfälscht werden. Auch die Plot-Reihen
//  (SERIES) bleiben fix, weil sie oben als feste Werte kopiert wurden.
// ============================================================

// Die drei Rollen aus THEMING.md → auf diese Tokens abgebildet:
//   Farbe 1 (Primär)  → gold   (CTAs, „dein Wert", Hervorhebung)
//   Farbe 2 (Sekundär)→ indigo (Admin-/Sekundär-Akzente, Ränder)
//   Farbe 3 (Signal)  → violet (persönliche Akzente, Badges)
const ACCENT_KEYS = ["gold", "indigo", "violet"];
const BASE_ACCENTS = Object.fromEntries(ACCENT_KEYS.map((k) => [k, COLORS[k]]));

const HEX_RE = /^#([0-9a-f]{6})$/i;

// Nur gültige #rrggbb-Farben, höchstens drei — der Rest wird verworfen.
export function sanitizeFanColors(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((c) => typeof c === "string" && HEX_RE.test(c.trim()))
    .map((c) => c.trim().toLowerCase())
    .slice(0, 3);
}

function toRgb(hex) {
  const m = HEX_RE.exec(hex);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]) {
  const h = (v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Relative Luminanz (WCAG 2.1) — Grundlage für Kontrast & Lesbarkeit.
export function relativeLuminance(hex) {
  const lin = toRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

// Kontrastverhältnis zweier Farben (1 … 21).
export function contrastRatio(a, b) {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Lesbare Textfarbe (dunkel/hell) AUF einer Akzentfläche — für on-Tokens.
export function readableInk(hex) {
  return contrastRatio(hex, "#0B0E1F") >= contrastRatio(hex, "#EDEEF6")
    ? "#0B0E1F" : "#EDEEF6";
}

// Farbe schrittweise Richtung Weiß mischen (0 = original, 1 = weiß).
function lighten(hex, t) {
  const [r, g, b] = toRgb(hex);
  return toHex([r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t]);
}

// Sichert MINDESTKONTRAST gegen den dunklen Grund/Text (#0B0E1F): sehr dunkle
// Vereinsfarben werden nur so weit aufgehellt, dass Flächen (mit dunklem Text)
// bzw. Akzentpunkte (auf dunklem Grund) lesbar bleiben. Helle Farben bleiben
// unverändert.
function ensureReadable(hex, min) {
  if (contrastRatio(hex, "#0B0E1F") >= min) return hex;
  for (let t = 0.08; t <= 1; t += 0.08) {
    const lit = lighten(hex, t);
    if (contrastRatio(lit, "#0B0E1F") >= min) return lit;
  }
  return lighten(hex, 1);
}

// Aus 1–3 Vereinsfarben die drei Rollen ableiten. Fehlt eine Farbe, fällt sie
// laut Spec auf Farbe 1 zurück. gold ist Primärfüllung (dunkler Text → höherer
// Mindestkontrast), indigo/violet sind Akzentpunkte auf dunklem Grund.
export function deriveRoles(fanColors) {
  const [c1, c2, c3] = sanitizeFanColors(fanColors);
  if (!c1) return { ...BASE_ACCENTS };
  return {
    gold: ensureReadable(c1, 3.2),
    indigo: ensureReadable(c2 || c1, 2.4),
    violet: ensureReadable(c3 || c1, 2.4),
  };
}

// Wendet die Vereinsfarben auf das gemeinsame COLORS/`C`-Objekt an (in place).
// Leere/ungültige Auswahl → Grundwerte. Gibt die gesetzten Rollen zurück.
export function applyFanColors(fanColors) {
  const roles = deriveRoles(fanColors);
  Object.assign(COLORS, roles);
  return roles;
}

// Zurück auf die Standard-Akzente.
export function resetTheme() {
  Object.assign(COLORS, BASE_ACCENTS);
  return { ...BASE_ACCENTS };
}

// Vereins-Presets: NUR Farben, KEINE Wappen/Namen echter Vereine (rechtlich
// sauber, siehe THEMING.md). Bewusst generisch benannt, frei nachjustierbar.
export const CLUB_PRESETS = [
  { id: "gelb-schwarz", label: "Gelb-Schwarz", colors: ["#FFCE00", "#111111", "#F5C451"] },
  { id: "rot-weiss", label: "Rot-Weiß", colors: ["#E30613", "#FFFFFF", "#B4001B"] },
  { id: "blau-weiss", label: "Blau-Weiß", colors: ["#1B4E9B", "#FFFFFF", "#5B8DEF"] },
  { id: "gruen-weiss", label: "Grün-Weiß", colors: ["#14804A", "#FFFFFF", "#4FD18B"] },
  { id: "rot-schwarz", label: "Rot-Schwarz", colors: ["#D2001E", "#151515", "#FF5470"] },
  { id: "himmelblau", label: "Himmelblau", colors: ["#3AA3E3", "#0B2A4A", "#7FD1F2"] },
];
