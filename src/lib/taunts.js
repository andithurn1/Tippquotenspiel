// ============================================================
//  SPOTT-SCHICHT — „GIF an Mitspieler senden" nach der Abrechnung
//
//  Bewusst OHNE eigene Datenbank-Tabelle: der Spott wird zusammengestellt
//  und über die Teilen-Funktion des Geräts verschickt (WhatsApp & Co.),
//  wo der Freundeskreis ohnehin schon redet. Das spart Postfach, Push,
//  Moderation und Löschfristen — und funktioniert sofort.
//
//  Zwei Zutaten: eine SPRUCH-VORLAGE (hier) und ein Reaktions-Clip
//  (`reactions.js`). Die Auswahl richtet sich nach der Konstellation im
//  Spieltags-Ranking, damit der Spruch immer passt: den Führenden ärgert
//  man anders als den Letzten.
//
//  Reine Funktionen, UI-frei, kein I/O. Vereinsnamen kennt dieses Modul
//  nicht (Architektur-Regel 3).
// ============================================================

import { spieltagKey } from "./spieltag";

// Konstellation zwischen Absender und Ziel — bestimmt, welche Sprüche passen.
// "ueberholt"  : Absender steht VOR dem Ziel
// "hinterher"  : Absender steht HINTER dem Ziel (Spott nach oben = frech)
// "gleichauf"  : gleiche Punktzahl
export const RELATIONS = ["ueberholt", "hinterher", "gleichauf"];

// Vorlagen. {ich}/{du} werden ersetzt. `reaction` verweist auf einen Clip-Key
// aus reactions.js, damit Spruch und Bild zusammenpassen.
export const TAUNTS = [
  // — Absender liegt vorn: klassischer Spott nach unten
  { key: "staubwolke", relation: "ueberholt", emoji: "🏎️", reaction: "sieger",
    label: "Staubwolke", text: "{du}, du siehst mich nur noch von hinten. Gruß aus der Staubwolke 🏎️" },
  { key: "tabellenblick", relation: "ueberholt", emoji: "🔭", reaction: "sieger",
    label: "Fernrohr", text: "Brauchst du ein Fernrohr, um zu mir hochzuschauen, {du}? 🔭" },
  { key: "trostpflaster", relation: "ueberholt", emoji: "🩹", reaction: "mittelfeld",
    label: "Trostpflaster", text: "Kopf hoch {du} — irgendwer muss ja auch die Plätze hinter mir füllen. 🩹" },
  { key: "quotenkoenig", relation: "ueberholt", emoji: "👑", reaction: "sieger",
    label: "Quotenkönig", text: "Mut zahlt sich aus, {du}. Sagt der, der oben steht. 👑" },

  // — Absender liegt hinten: frech nach oben, mit Selbstironie
  { key: "aufholjagd", relation: "hinterher", emoji: "🚀", reaction: "mittelfeld",
    label: "Aufholjagd", text: "Genieß die Aussicht, {du} — ich komme. 🚀" },
  { key: "glueckspilz", relation: "hinterher", emoji: "🍀", reaction: "mittelfeld",
    label: "Glückspilz", text: "Schöne Quoten, {du}. Können oder Glück? Wir wissen es beide. 🍀" },
  { key: "warmgelaufen", relation: "hinterher", emoji: "🔥", reaction: "mittelfeld",
    label: "Warmgelaufen", text: "Ich hab mich nur warmgelaufen, {du}. Nächster Spieltag gehört mir. 🔥" },

  // — Gleichstand: Duell-Ton
  { key: "kopfankopf", relation: "gleichauf", emoji: "⚔️", reaction: "mittelfeld",
    label: "Kopf an Kopf", text: "Punktgleich, {du}. Einer von uns knickt ein — und ich bin es nicht. ⚔️" },
  { key: "fotofinish", relation: "gleichauf", emoji: "📸", reaction: "mittelfeld",
    label: "Fotofinish", text: "Fotofinish, {du}. Nächste Woche entscheidet's. 📸" },
];

// Wie steht der Absender zum Ziel? Erwartet Leaderboard-Einträge mit `total`.
export function relationBetween(me, other) {
  if (!me || !other) return null;
  if (me.total > other.total) return "ueberholt";
  if (me.total < other.total) return "hinterher";
  return "gleichauf";
}

// Die passenden Sprüche für diese Konstellation.
export function tauntsFor(relation) {
  return TAUNTS.filter((t) => t.relation === relation);
}

// Fertigen Spott bauen: Vorlage + Namen → versandfertiger Text.
// `roundName` wird angehängt, damit der Empfänger den Zusammenhang sieht.
export function buildTaunt({ taunt, fromName, toName, roundName }) {
  if (!taunt) return null;
  const text = taunt.text
    .replaceAll("{du}", toName || "Mitspieler")
    .replaceAll("{ich}", fromName || "Ich");
  const signatur = roundName ? `\n— ${fromName || "Ich"}, ${roundName}` : `\n— ${fromName || "Ich"}`;
  return {
    key: taunt.key,
    emoji: taunt.emoji,
    label: taunt.label,
    reaction: taunt.reaction,
    text,
    shareText: `${text}${signatur}`,
  };
}

// Wen kann ich überhaupt anstänkern? Alle außer mir selbst.
// Sortiert nach Rang, damit die Liste wie das Leaderboard aussieht.
export function tauntTargets(board = [], meId) {
  return board.filter((b) => b.userId !== meId).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}

// Fairness-Bremse: Spott ist Würze, kein Dauerfeuer. Pro Spieltag und Ziel
// höchstens einer — verhindert, dass jemand zugespammt wird.
export const MAX_PRO_ZIEL_UND_SPIELTAG = 1;

// Der Spieltag zählt MIT Wettbewerb: über die nackte Zahl verglichen hätte ein
// Spott am Bundesliga-Spieltag 1 auch den am CL-Spieltag 1 blockiert — das sind
// zwei verschiedene Spieltage und damit zwei Anlässe.
export function darfSenden(verlauf = [], { toId, matchday, wettbewerb = null }) {
  const ziel = spieltagKey({ matchday, wettbewerb });
  const schon = verlauf.filter((v) => v.toId === toId && spieltagKey(v) === ziel).length;
  return schon < MAX_PRO_ZIEL_UND_SPIELTAG;
}
