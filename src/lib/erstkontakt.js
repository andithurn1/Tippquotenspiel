// ============================================================
//  ERSTKONTAKT — erster Start oder Wiederkehrer? (G5)
//
//  🔴 Andis fünfte Gestaltungs-Ansage vom 09.08.2026: „Erstkontakt-Ablauf:
//  erster Start vs. Wiederkehrer."
//
//  Bis zum 24.08.2026 gab es diese Unterscheidung nicht — jeder Start sah
//  gleich aus. Für jemanden, der die App zum ersten Mal öffnet, ist das die
//  schlechtere Hälfte: er sieht eine Liste mit einer Demo-Runde darin und muss
//  selbst herausfinden, ob das seine Runde ist, ob er beitreten oder erstellen
//  soll.
//
//  ── ⚠️ Was das hier NICHT ist ──
//  Kein Tutorial. Andi am 24.08.2026: „das Tutorial machen wir erst, wenn das
//  User Interface steht." Der Erstkontakt beantwortet EINE Frage — „was mache
//  ich jetzt?" — und verschwindet danach. Wer ihn zu einem Rundgang ausbaut,
//  baut das, was ausdrücklich später kommt.
//
//  ── 🔴 Die Marke wird beim ANSEHEN gesetzt, nicht beim Wegklicken ──
//  Sonst kommt der Erstkontakt bei jedem Start wieder, bis jemand den richtigen
//  Knopf trifft — und ein Hinweis, den man nicht loswird, ist keine Begrüßung,
//  sondern eine Sperre.
//
//  ⚠️ `localStorage` kann fehlen (privates Fenster, gesperrte Seitendaten) und
//  wirft dort beim Zugriff. Jeder Zugriff steht deshalb in `try` — und im
//  Zweifel gilt „schon mal da", nicht „neu". Ein Wiederkehrer, der versehentlich
//  begrüßt wird, ist ärgerlicher als ein Neuer, der es nicht wird: die Begrüßung
//  steht dann VOR seiner Runde, jedes Mal.
// ============================================================

const KEY = "tqs.erstkontakt.v1";

// Hat dieser Browser die App schon einmal gesehen?
export function schonDagewesen() {
  try {
    return localStorage.getItem(KEY) != null;
  } catch {
    // Kein Speicher → keine Begrüßung. Siehe Kopfkommentar: im Zweifel „da
    // gewesen", damit niemand sie bei jedem Start erneut bekommt.
    return true;
  }
}

// Merken, dass der Erstkontakt gezeigt wurde. Idempotent.
export function merkeBesuch() {
  try {
    if (localStorage.getItem(KEY) == null) {
      localStorage.setItem(KEY, String(Date.now()));
    }
  } catch { /* ohne Speicher nicht zu merken — siehe oben */ }
}

// Nur für die Entwicklung und die Musterseite: wieder auf „neu" stellen.
// ⚠️ Bewusst NICHT an einen Knopf in der App gehängt — „Begrüßung nochmal
// zeigen" ist eine Einstellung, die niemand sucht und die den Screen belastet.
export function vergissBesuch() {
  try { localStorage.removeItem(KEY); } catch { /* egal */ }
}

// ── Was der Erstkontakt anbietet ────────────────────────────
//
// 🔴 Genau DREI Wege, und sie stehen in der Reihenfolge ihrer Häufigkeit:
// die meisten bekommen einen Code geschickt, manche gründen selbst, und wer
// beides nicht will, sieht sich erst einmal um.
//
// ⚠️ Die Reihenfolge ist eine Behauptung über Andis Freundeskreis, keine
// Messung — sie steht hier, damit sie widersprochen werden kann, statt
// unsichtbar in einem JSX-Block zu stecken.
export const ERSTKONTAKT_WEGE = [
  {
    key: "beitreten",
    icon: "🔑",
    titel: "Ich habe einen Code",
    text: "Jemand hat dir eine Runde geschickt? Code eingeben, fertig.",
    ziel: "/beitreten",
  },
  {
    key: "erstellen",
    icon: "⚙️",
    titel: "Ich mache die Runde",
    text: "Regeln festlegen, Runde anlegen und den Code an eure Gruppe schicken.",
    ziel: "/erstellen",
  },
  {
    key: "umsehen",
    icon: "👀",
    titel: "Erst mal ansehen",
    text: "Die Demo-Runde läuft mit echten Spielplänen — tippen, ohne dass es zählt.",
    ziel: "/tippen",
  },
];
