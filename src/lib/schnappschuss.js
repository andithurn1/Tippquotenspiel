// ============================================================
//  DER SCHNAPPSCHUSS — was darin steht und wer welchen Teil braucht
//
//  Ein Schnappschuss ist das Quoten-Bild eines Spiels zum Zeitpunkt X:
//  Siegquoten, Ergebnis-Raster, Kader mit Torschützenquoten, Derby-Kennung,
//  Tabellenplätze. Er ist die Grundlage der ganzen Wertung — und mit Abstand
//  das Schwerste, was dieses Projekt über die Leitung schickt.
//
//  ── Die Messung, die diese Datei nötig macht ──
//  Ein Katalog wiegt **0,49 MB** (design/roadmap.md, Abschnitt Performance).
//  Davon sind, an einem Schnappschuss gemessen:
//
//    43 %  `players`       — die Kader mit ihren Torschützenquoten
//    14 %  `correctScore`  — das Ergebnis-Raster
//
//  🔴 Beides braucht in voller Länge **die Tippabgabe, für EIN Spiel**.
//  Gezählt am 27.08.2026: von 18 Screens, die Spiele laden, fassen **14 den
//  Schnappschuss überhaupt nicht an**. Sie zahlen ihn trotzdem bei jedem
//  Öffnen — und zwar bei JEDEM, nicht einmalig wie das Bundle.
//
//  ── Warum das Weglassen gefahrlos ist, und warum nur DESHALB ──
//  🔴 Die WERTUNG liest den Schnappschuss NIE aus dem Katalog. Sie nimmt den,
//  der am TIPP hängt (`snapshot: t.snapshot` in `eintragVon`, beide Stores) —
//  eingefroren zum Zeitpunkt der Abgabe. Das ist keine Optimierung, sondern
//  eine Fairness-Regel: eine nachträglich veränderte Quote wäre genau die
//  Falle, vor der CLAUDE.md warnt.
//
//  ⚠️ **Wer den Katalog schlank lädt, darf also alles — außer den
//  Schnappschuss lesen.** Und das ist die gefährliche Stelle: ein fehlendes
//  Feld stürzt nicht ab, es zeigt still etwas Falsches (Roadmap, wörtlich).
//  Dagegen zwei Sperren:
//    1. `ohneSchnappschuss` LÖSCHT das Feld, statt es auf `null` zu setzen.
//       Ein `null` sieht aus wie „kein Schnappschuss vorhanden" und rechnet
//       weiter; ein fehlendes Feld fällt beim ersten Zugriff auf.
//    2. `npm run schlank` misst, ob ein Screen, der schlank lädt, irgendwo
//       doch an den Schnappschuss greift.
//
//  Reine Funktionen, UI-frei.
// ============================================================

// ── Wer liest WELCHEN Teil? ─────────────────────────────────
// 🔴 Die Liste, nach der die Roadmap gefragt hat („die sieben Leser des
// Schnappschusses einzeln durchgehen und fragen, WELCHEN Teil sie brauchen").
// Gemessen über `grep`, nicht geschätzt.
//
// ⚠️ Sie ist DOKUMENTATION, kein Schalter: geschnitten wird heute nur ganz
// oder gar nicht. Wer feiner schneiden will, fängt hier an — und sieht sofort,
// dass `players` an vier ganz verschiedenen Stellen gebraucht wird und ein
// Teilschnitt deshalb vier Zusagen bräuchte statt einer.
export const SCHNAPPSCHUSS_LESER = [
  { feld: "winner", anteil: "klein", wer: "Wertung, Auslöser, Fremdjoker, Big Game" },
  { feld: "correctScore", anteil: "14 %", wer: "Tippabgabe (Raster), Nähe-Belohnung, Vorbelegung" },
  { feld: "players", anteil: "43 %", wer: "Tippabgabe (Torschützen), Favoriten-Sperre, Saison-Wetten, Ersatz-Tipp" },
  { feld: "derby", anteil: "klein", wer: "Modifikatoren" },
  { feld: "tabellenPlatz", anteil: "klein", wer: "Tabellen-Bonus, Big Game" },
  { feld: "home / away", anteil: "klein", wer: "Anzeige, Zuordnung Spieler → Verein" },
];

// Ein Spiel ohne Schnappschuss. Das Feld wird WEGGELASSEN, nicht geleert —
// siehe Sperre 1 im Kopf.
export function ohneSchnappschuss(match) {
  if (!match || typeof match !== "object") return match;
  if (!("snapshot" in match)) return match;
  // eslint-disable-next-line no-unused-vars
  const { snapshot, ...rest } = match;
  return rest;
}

// Trägt diese Liste Schnappschüsse? Für Prüfungen und für einen Screen, der
// beides bekommen kann.
export const hatSchnappschuesse = (matches = []) =>
  (Array.isArray(matches) ? matches : []).some((m) => m && "snapshot" in m);
