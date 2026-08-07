// ── Persönliche Anzeige-Einstellungen (pro Nutzer/Browser) ──
// UNABHÄNGIG vom Regelwerk der Runde: das Regelwerk bestimmt die Fairness/
// Punkte (Admin), DIESE Einstellung nur, wie viel vom „Hintergrund" jeder
// selbst sehen will. Drei Stufen je Anzeige.

export const LEVELS = ["voll", "dezent", "aus"];
export const LEVEL_LABEL = { voll: "Voll", dezent: "Dezent", aus: "Aus" };

// App-Start: Standard ist das Hauptmenü (Runde wählen, erstellen, beitreten, …);
// wer will, kann optional direkt in die aktive Tipprunde springen.
export const START_SCREENS = ["menu", "hub"];
export const START_SCREEN_LABEL = { menu: "Hauptmenü", hub: "Aktive Tipprunde" };

// ── Vergleichs-Mitspieler ("Freunde") ───────────────────────
// 🔴 Bewusst eine PERSÖNLICHE Einstellung und keine Regel der Runde: mit wem
// ich mich vergleichen will, geht den Admin nichts an, und zwei Spieler
// derselben Runde dürfen verschiedene Leute im Blick haben. Sie liegt deshalb
// hier bei den Anzeige-Stufen und nicht in `rules`.
//
// ⚠️ Je RUNDE getrennt (`{ [roundId]: [userId, …] }`). Wer in drei Runden
// spielt, hat dort verschiedene Mitspieler — eine flache Liste träfe in der
// zweiten Runde niemanden und stünde stumm da.
//
// Die Obergrenze ist kein Geschmack: vier Spalten nebeneinander sind auf einem
// Telefon nicht mehr lesbar, und die Einblendung nach Spielende soll man in
// zwei Sekunden erfassen.
export const MAX_VERGLEICH = 3;

export const DEFAULT_PREFS = {
  abrechnung: "voll", vorschau: "voll", zwischenabrechnung: "voll",
  startScreen: "menu", vergleich: {},
};

// Nur intern: `sanitizePrefs`, `toggleVergleich` und `vergleichFuer` benutzen
// sie: von außen geht der Weg über die drei.
function sanitizeVergleich(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out = {};
  for (const [roundId, liste] of Object.entries(v)) {
    if (!roundId || !Array.isArray(liste)) continue;
    const ids = [...new Set(liste.filter((x) => typeof x === "string" && x))].slice(0, MAX_VERGLEICH);
    if (ids.length) out[roundId] = ids;
  }
  return out;
}

// An- und Abwählen. Ist die Grenze erreicht, passiert NICHTS — der Aufrufer
// zeigt die Grenze an, statt still den ältesten Eintrag zu verdrängen. Ein
// Häkchen, das ein anderes wegnimmt, ohne es zu sagen, ist die Sorte
// Oberfläche, bei der man zweimal klickt und beim dritten Mal aufgibt.
export function toggleVergleich(vergleich, roundId, userId) {
  const alle = sanitizeVergleich(vergleich);
  const jetzt = alle[roundId] ?? [];
  const drin = jetzt.includes(userId);
  if (!drin && jetzt.length >= MAX_VERGLEICH) return alle;
  const naechste = drin ? jetzt.filter((x) => x !== userId) : [...jetzt, userId];
  const out = { ...alle };
  if (naechste.length) out[roundId] = naechste;
  else delete out[roundId];
  return out;
}

// Die gewählten Mitspieler EINER Runde — immer ein Array, nie `undefined`.
export const vergleichFuer = (prefs, roundId) =>
  (sanitizeVergleich(prefs?.vergleich)[roundId] ?? []);

// Texte für den Einstellungs-Screen.
export const PREF_META = {
  abrechnung: {
    title: "Abrechnung — Punkte-Mathematik",
    hint: "Wie viel von der Berechnung du nach dem Spiel siehst (Sieger-Boden, Nähebonus, Kombi, Distanz-Leiter).",
    levels: {
      voll: "Volle Aufschlüsselung: alle Bausteine, Distanz-Leiter, Kombi.",
      dezent: "Nur Gesamtpunkte, Rang und ein kurzer Grund.",
      aus: "Maximale Spannung: nur Endpunkte und dein Rang.",
    },
  },
  // 🔴 „aus" ist hier keine Sparversion, sondern die eigentliche Zusage: eine
  // Einblendung, die sich beim Öffnen der App vor alles legt, MUSS abstellbar
  // sein. Wer sie nicht will, soll sie nie wieder sehen — und trotzdem
  // jederzeit selbst in die Abrechnung gehen können.
  zwischenabrechnung: {
    title: "Nach dem Spiel — was passiert ist, während du weg warst",
    hint: "Ob sich die App beim Öffnen meldet, sobald Spiele fertig geworden sind, auf die du getippt hast.",
    levels: {
      voll: "Einblendung mit allen Spielen seit deinem letzten Besuch, samt Punkten.",
      dezent: "Einblendung nur mit der Summe — wie viele Spiele, wie viele Punkte.",
      aus: "Keine Einblendung. Die Abrechnung bleibt über das Menü erreichbar.",
    },
  },
  vorschau: {
    title: "Tippen — Vorschau & Aussicht",
    hint: "Ob dir beim Tippen gezeigt wird, was dein Tipp bringen könnte.",
    levels: {
      voll: "Mögliche Punkte + Aufschlüsselung + Risiko-Einstufung.",
      dezent: "Nur mögliche Punkte und Risiko-Label.",
      aus: "Nichts — blind tippen, volle Überraschung.",
    },
  },
};

export function sanitizePrefs(p = {}) {
  const pick = (v, d) => (LEVELS.includes(v) ? v : d);
  const src = p && typeof p === "object" ? p : {};
  return {
    abrechnung: pick(src.abrechnung, DEFAULT_PREFS.abrechnung),
    vorschau: pick(src.vorschau, DEFAULT_PREFS.vorschau),
    zwischenabrechnung: pick(src.zwischenabrechnung, DEFAULT_PREFS.zwischenabrechnung),
    vergleich: sanitizeVergleich(src.vergleich),
    startScreen: START_SCREENS.includes(src.startScreen) ? src.startScreen : DEFAULT_PREFS.startScreen,
  };
}
