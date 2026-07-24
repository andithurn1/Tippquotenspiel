// ── Premium-Berechtigung ────────────────────────────────────
// EINE Stelle, die entscheidet, was Premium freischaltet — analog zu
// Quoten-Quelle und Daten-Store. Reine Logik, kein UI, kein I/O.
//
// Geschäftsmodell: Es reicht, wenn der ADMIN einer Runde Premium hat — die
// ganze Runde profitiert. Einer zahlt, alle haben was davon; das ist deutlich
// leichter zu verkaufen, als jeden Einzelnen zur Kasse zu bitten.
//
// Wichtig: Die UI darf Premium-Regler ausgrauen, aber sie ist NICHT die
// Durchsetzung — ein manipulierter Client könnte sie umgehen. Durchgesetzt
// wird beim Anlegen/Ändern einer Runde über applyEntitlements(), das der
// Store aufruft. Deshalb ist das hier eine reine Funktion ohne Seiteneffekte.

// Zeitpunkt, bis zu dem Premium gilt (null/abgelaufen = kein Premium).
// Ein Datum statt eines Boolean, damit Abos später ohne Schema-Umbau passen —
// bis dahin setzt man das Feld einfach von Hand in der Datenbank.
export function isPremium(profile, jetzt = Date.now()) {
  const bis = profile?.premium_until;
  if (!bis) return false;
  const ts = typeof bis === "number" ? bis : Date.parse(bis);
  return Number.isFinite(ts) && ts > jetzt;
}

// Was Premium freischaltet. Erweitern statt verstreuen: neue Premium-Features
// bekommen hier einen Eintrag und werden unten in applyEntitlements behandelt.
export const PREMIUM_FEATURES = [
  {
    key: "joker",
    label: "Joker & Gewichtung",
    desc: "Einzelne Spiele höher gewichten — als einzelner Joker oder als Rangliste über alle Spiele.",
  },
];

// Regelwerk auf die Berechtigung zurechtstutzen: ohne Premium werden
// Premium-Bestandteile neutralisiert, NICHT entfernt. Der Admin verliert also
// seine Einstellungen nicht — sie greifen nur nicht, und sobald Premium da ist,
// wirken sie wieder. Gibt bei fehlender Berechtigung ein neues Objekt zurück,
// sonst unverändert dasselbe (kein unnötiges Kopieren).
export function applyEntitlements(rules, { premium = false } = {}) {
  if (premium || !rules) return rules;
  if (!rules.joker?.enabled) return rules;
  return { ...rules, joker: { ...rules.joker, enabled: false } };
}

// Sperrt eine konkrete Funktion? Kleiner Helfer für die UI, damit dort keine
// eigene Logik entsteht.
export function isLocked(featureKey, { premium = false } = {}) {
  if (premium) return false;
  return PREMIUM_FEATURES.some((f) => f.key === featureKey);
}
