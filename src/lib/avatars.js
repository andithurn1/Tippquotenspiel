// ── Vorgefertigte Avatare ───────────────────────────────────
// Bewusst OHNE Bilddateien: jeder Avatar ist ein Emoji auf einem Farbkreis.
// Vorteile — sofort einsatzbereit (kein Upload, kein Speicher, keine
// Moderation), winzige Datenmenge (nur die id wandert in die DB), und die
// Farben sind dieselben Familien wie im QT-Farbsystem (design/reaktions-clips.md).
//
// Hochgeladene Fotos sind eine EIGENE Baustelle (Moderation, Marken-/
// Persoenlichkeitsrechte, App-Store-Auflagen fuer nutzergenerierte Inhalte).
// Das Datenmodell ist dafuer offen: `avatar` ist ein String — beginnt er mit
// "url:", zeigt die UI ein Bild, sonst diesen Katalog. So kommt Upload spaeter
// dazu, ohne dass irgendetwas umgebaut werden muss.

export const AVATAR_COLORS = {
  rot:          "#E10600",
  gelb:         "#FDE100",
  koenigsblau:  "#004D9D",
  gruen:        "#009036",
  violett:      "#7C4DFF",
  orange:       "#FF7A1A",
  mint:         "#54E0A0",
  grau:         "#5A6180",
};

// Die Auswahl: Fan-Motive rund ums Stadion — passt zum QT-Universum.
export const AVATARS = [
  { id: "fan-schal",    emoji: "🧣", label: "Schal",     color: "rot" },
  { id: "fan-wurst",    emoji: "🌭", label: "Bratwurst", color: "orange" },
  { id: "fan-bier",     emoji: "🍺", label: "Bier",      color: "gelb" },
  { id: "fan-ball",     emoji: "⚽", label: "Ball",      color: "gruen" },
  { id: "fan-pokal",    emoji: "🏆", label: "Pokal",     color: "gelb" },
  { id: "fan-trommel",  emoji: "🥁", label: "Trommel",   color: "koenigsblau" },
  { id: "fan-megafon",  emoji: "📣", label: "Megafon",   color: "rot" },
  { id: "fan-glocke",   emoji: "🔔", label: "Glocke",    color: "violett" },
  { id: "fan-rakete",   emoji: "🚀", label: "Rakete",    color: "violett" },
  { id: "fan-feuer",    emoji: "🔥", label: "Feuer",     color: "orange" },
  { id: "fan-eis",      emoji: "🧊", label: "Eiskalt",   color: "koenigsblau" },
  { id: "fan-krone",    emoji: "👑", label: "Krone",     color: "gelb" },
  { id: "fan-clown",    emoji: "🤡", label: "Pechvogel", color: "grau" },
  { id: "fan-geist",    emoji: "👻", label: "Geist",     color: "grau" },
  { id: "fan-herz",     emoji: "💚", label: "Herzblut",  color: "mint" },
  { id: "fan-blitz",    emoji: "⚡", label: "Blitz",     color: "gelb" },
];

export const DEFAULT_AVATAR = AVATARS[0].id;

// Ein Upload wird als "url:<adresse>" gespeichert — noch nicht aktiv, aber die
// Unterscheidung steht schon, damit die UI spaeter nichts raten muss.
export const UPLOAD_PREFIX = "url:";
export const isUploadedAvatar = (v) => typeof v === "string" && v.startsWith(UPLOAD_PREFIX);
export const uploadedAvatarUrl = (v) => (isUploadedAvatar(v) ? v.slice(UPLOAD_PREFIX.length) : null);

// Avatar-Definition zu einer id. Unbekannte/leere Werte fallen auf den
// Standard zurueck, damit nie eine kaputte Anzeige entsteht.
export function getAvatar(id) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS.find((a) => a.id === DEFAULT_AVATAR);
}

// Farbwert eines Avatars (fuer Kreis-Hintergrund/Rahmen).
export function avatarColor(id) {
  return AVATAR_COLORS[getAvatar(id).color] ?? AVATAR_COLORS.grau;
}

// Anzeigenamen saeubern: Steuerzeichen raus, Mehrfach-Leerzeichen zusammen-
// ziehen, getrimmt, auf sinnvolle Laenge begrenzt. Buchstaben, Ziffern,
// Leerzeichen und Bindestriche bleiben erhalten. Zu kurz → null, damit der
// Aufrufer entscheiden kann (z. B. auf den E-Mail-Teil zurueckfallen).
// Steuerzeichen als Zeichenkette aufgebaut - so geraten keine echten
// Steuerzeichen in die Quelldatei.
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001F\\u007F]", "g");

export const NAME_LIMITS = { min: 2, max: 24 };
export function sanitizeDisplayName(raw) {
  if (typeof raw !== "string") return null;
  const clean = raw
    .replace(CONTROL_CHARS, "")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length < NAME_LIMITS.min) return null;
  return clean.slice(0, NAME_LIMITS.max);
}

// Avatar-Wert saeubern: bekannte id, sonst Standard. Uploads werden (solange
// nicht freigeschaltet) NICHT durchgelassen — bewusst, damit keine ungepruefte
// fremde Adresse ins Profil wandert.
export function sanitizeAvatar(raw, { allowUploads = false } = {}) {
  if (allowUploads && isUploadedAvatar(raw)) return raw;
  return AVATARS.some((a) => a.id === raw) ? raw : DEFAULT_AVATAR;
}
