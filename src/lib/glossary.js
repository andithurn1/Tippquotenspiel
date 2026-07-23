// ============================================================
//  GLOSSAR — kurze Erklärungen zu den Fachbegriffen, an EINER
//  Stelle. Wird vom <Begriff>-Baustein (Inline-Erklärung) und
//  vom Tutorial genutzt. Reiner Text/Daten, kein UI.
// ============================================================

export const GLOSSARY = {
  quote: {
    term: "Quote",
    text: "Wie unwahrscheinlich ein Ausgang ist. Je höher die Quote, desto mutiger der Tipp — und desto mehr Punkte, wenn er aufgeht.",
  },
  snapshot: {
    term: "Snapshot-Quote",
    text: "Beim Tippen wird die Quote eingefroren. Alle Mitspieler bekommen dieselbe, egal wann sie tippen — sie gilt bis zum Anpfiff.",
  },
  ebene: {
    term: "Ebene",
    text: "Wie gut dein Tipp war: exakt (Endstand genau), Abstand (Tordifferenz stimmt), Tendenz (nur der Sieger stimmt) oder daneben.",
  },
  "sieger-boden": {
    term: "Sieger-Boden",
    text: "Hast du wenigstens den richtigen Sieger, gibt es mindestens dessen Quote als Grundpunktzahl.",
  },
  naehebonus: {
    term: "Nähebonus",
    text: "Auch wenn der Endstand nicht exakt stimmt, zählt die Nähe zum echten Ergebnis — je näher dran, desto mehr Punkte.",
  },
  "team-tore": {
    term: "Team-Tore-Nähe",
    text: "Unabhängig vom Sieger: Wie nah du an der Toranzahl je Mannschaft warst. Bringt auch Punkte, wenn der Sieger daneben ging.",
  },
  torschuetzen: {
    term: "Torschützen-Tipp",
    text: "Zusätzlich zum Endstand tippst du, wer trifft. Richtig getippte Schützen geben Extrapunkte (Doppelpack zählt mehr).",
  },
  kombi: {
    term: "Kombi",
    text: "Richtig getippte Torschützen verstärken deine Ergebnis-Punkte — umso mehr, je besser deine Ergebnis-Ebene war.",
  },
  "underdog-boost": {
    term: "Underdog-Boost",
    text: "Ein Admin-Regler: belohnt korrekt vorhergesagte Außenseiter-Siege zusätzlich, oben drauf auf die ohnehin hohe Quote.",
  },
  "favoriten-malus": {
    term: "Favoriten-Malus",
    text: "Ein Admin-Regler: Abzug, wenn du den Favoriten als Sieger getippt hast und der überraschend verliert. Gedeckelt bei null.",
  },
  ramp: {
    term: "Quoten-Ramp",
    text: "Ab welcher Sieger-Quote jemand als Außenseiter gilt. Legt fest, ab wann Underdog-Boost und Favoriten-Malus greifen.",
  },
  "creator-code": {
    term: "Creator-Code",
    text: "Ein Textcode, der ein komplettes Regelwerk enthält. Teilst du ihn, spielen alle mit exakt denselben Regeln.",
  },
  "beitritts-code": {
    term: "Beitritts-Code",
    text: "Kurzer Code, mit dem Freunde deiner Tipprunde beitreten.",
  },
  skalierung: {
    term: "Punkte-Skalierung",
    text: "Nur Optik: macht die angezeigten Zahlen größer oder kleiner. Ändert nichts an Fairness oder Rangfolge.",
  },
  "team-filter": {
    term: "Team-Auswahl",
    text: "Der Admin kann eine Runde auf bestimmte Teams beschränken — dann zählen nur Spiele, an denen eines dieser Teams beteiligt ist.",
  },
};

export function getGlossary(key) {
  return GLOSSARY[key] ?? null;
}
