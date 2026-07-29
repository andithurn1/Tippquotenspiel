// ============================================================
//  JOKER-VERTEILUNG ÜBER DIE SAISON
//
//  Der Admin soll nicht 34 Spieltage einzeln anklicken müssen. Er stellt eine
//  FREQUENZ ein („etwa jeder 4. Spieltag hat einen Joker") — verteilt wird
//  deterministisch aus der Runden-Id. Das hat drei Vorteile auf einmal:
//  alle sehen dasselbe, es ist nachprüfbar, und der Creator-Code bleibt kurz,
//  weil nur die REGEL gespeichert wird, nicht die ausgerollte Liste.
//
//  Drei Modi:
//    frei        — jeder setzt selbst (bisheriges Verhalten, Standard)
//    gleich      — alle haben am selben Spieltag einen Joker
//    kontingent  — jeder bekommt über die Saison GLEICH VIELE Joker, nur an
//                  verschiedenen Spieltagen. Mehr Abwechslung bei identischer
//                  Fairness — und genau das sichert ein Test ab.
//
//  Verteilt wird BLOCKWEISE: die Saison wird in so viele gleich große Blöcke
//  geteilt, wie es Joker gibt, und je Block fällt genau einer. Ohne diese
//  Schichtung könnte reiner Zufall vier Joker in den ersten fünf Spieltagen
//  bündeln und danach zwanzig Spieltage leer lassen — formal fair, gefühlt
//  kaputt. Im Modus `kontingent` unterscheidet sich nur die Position INNERHALB
//  des Blocks je Spieler; die Anzahl bleibt dadurch zwangsläufig gleich.
//
//  ── Sichtbarkeit (Nutzerentscheidung) ──
//  Empfehlung: REIHENFOLGE VERDECKT, KONTINGENT OFFEN. Welche Spieltage einen
//  Joker tragen, bleibt Spannung; wie viele jeder bekommt und hatte, ist offen
//  — sonst entsteht bei verdeckter Reihenfolge der Verdacht der Bevorzugung.
//  Deshalb liefert `fortschritt` bewusst „3 von 8" und nie eine nackte Zahl:
//  im Modus `kontingent` haben Spieler MITTEN in der Saison zwangsläufig
//  unterschiedlich viele Joker gehabt, und ein Zwischenstand ohne Bezugsgröße
//  sieht aus wie Ungleichbehandlung.
//
//  Reine Funktionen, UI-frei. Das Regelwerk liefert die Regel, diese Datei
//  rollt sie aus — durchgesetzt (Speichern/Einfrieren) wird in Store/UI.
// ============================================================

export const VERTEIL_MODI = [
  {
    key: "frei", label: "Frei",
    desc: "Jeder setzt seinen Joker selbst, an jedem Spieltag.",
  },
  {
    key: "gleich", label: "Gleich für alle",
    desc: "Nur an bestimmten Spieltagen gibt es einen Joker — für alle an denselben.",
  },
  {
    key: "kontingent", label: "Gleich viele, verteilt",
    desc: "Jeder bekommt über die Saison gleich viele Joker, aber an verschiedenen Spieltagen.",
  },
];

export const SICHTBARKEIT = [
  {
    key: "verdeckt", label: "Reihenfolge verdeckt",
    desc: "Du siehst dein Kontingent und deinen Fortschritt, aber nicht, welcher Spieltag als Nächstes einen Joker trägt.",
  },
  {
    key: "offen", label: "Spieltage vorab bekannt",
    desc: "Der ganze Kalender liegt offen — planbar statt spannend.",
  },
];

import { seeded } from "./seeded";

export const VERTEILUNG_LIMITS = {
  frequenz: { min: 1, max: 8, step: 1 },   // „jeder N-te Spieltag"
};

export const DEFAULT_VERTEILUNG = {
  modus: "frei",
  frequenz: 4,
  sichtbarkeit: "verdeckt",
};

// Bereinigt den Verteilungs-Teil des Joker-Blocks. Eigene Funktion, damit
// `sanitizeRules` daran delegieren kann und der Katalog hier die eine Quelle
// bleibt (wie bei sanitizeSaison).
export function sanitizeVerteilung(partial = {}) {
  const p = partial && typeof partial === "object" ? partial : {};
  const L = VERTEILUNG_LIMITS.frequenz;
  const n = Number(p.frequenz);
  return {
    modus: VERTEIL_MODI.some((m) => m.key === p.modus) ? p.modus : DEFAULT_VERTEILUNG.modus,
    frequenz: Number.isFinite(n)
      ? Math.min(L.max, Math.max(L.min, Math.round(n)))
      : DEFAULT_VERTEILUNG.frequenz,
    sichtbarkeit: SICHTBARKEIT.some((s) => s.key === p.sichtbarkeit)
      ? p.sichtbarkeit
      : DEFAULT_VERTEILUNG.sichtbarkeit,
  };
}

// Deterministischer Zufall: liegt in `seeded.js`, weil dieselbe Funktion auch
// `autoTip.js` und `auswahl.js` tragen — und an ihr hängt, dass eine Runde auf
// jedem Gerät dieselben Joker-Spieltage sieht.

// Wie viele Joker gibt es über die Saison? Mindestens einer, sobald der Modus
// überhaupt verteilt — eine Saison ganz ohne Joker wäre eine stumme Regel.
export function kontingent(spieltage, frequenz) {
  if (!Number.isFinite(spieltage) || spieltage < 1) return 0;
  const f = Math.max(1, Math.round(frequenz || 1));
  return Math.max(1, Math.round(spieltage / f));
}

// Blockgrenzen: `anzahl` möglichst gleich große Abschnitte über `spieltage`.
function bloecke(spieltage, anzahl) {
  const out = [];
  for (let i = 0; i < anzahl; i++) {
    const von = Math.floor((i * spieltage) / anzahl) + 1;
    const bis = Math.floor(((i + 1) * spieltage) / anzahl);
    out.push([von, Math.max(von, bis)]);
  }
  return out;
}

// Die Joker-Spieltage EINES Spielers (oder der ganzen Runde im Modus
// `gleich`). `salz` unterscheidet die Spieler voneinander.
function spieltageFuer(spieltage, anzahl, seed, salz) {
  return bloecke(spieltage, anzahl).map(([von, bis], i) => {
    const breite = bis - von + 1;
    const r = seeded(`${seed}|${salz}|${i}`);
    return von + Math.floor(r * breite);
  });
}

// ── Der Plan ────────────────────────────────────────────────
// Gibt für jeden Spieler die Spieltage zurück, an denen er einen Joker setzen
// darf. Im Modus `frei` ist der Plan leer — dort gilt „an jedem Spieltag".
export function jokerPlan({
  spieltage = 34, verteilung = DEFAULT_VERTEILUNG, seed = "", userIds = [],
} = {}) {
  const v = sanitizeVerteilung(verteilung);
  const anzahl = kontingent(spieltage, v.frequenz);

  if (v.modus === "frei") {
    return { modus: "frei", spieltage, anzahl: spieltage, proSpieler: {}, alle: null };
  }
  if (v.modus === "gleich") {
    const tage = spieltageFuer(spieltage, anzahl, seed, "runde");
    return {
      modus: "gleich", spieltage, anzahl, alle: tage,
      proSpieler: Object.fromEntries(userIds.map((id) => [id, tage])),
    };
  }
  return {
    modus: "kontingent", spieltage, anzahl, alle: null,
    proSpieler: Object.fromEntries(
      userIds.map((id) => [id, spieltageFuer(spieltage, anzahl, seed, id)])),
  };
}

// Darf dieser Spieler an diesem Spieltag einen Joker setzen?
export function hatJoker(plan, userId, spieltag) {
  if (!plan || plan.modus === "frei") return true;
  const tage = plan.proSpieler?.[userId] ?? plan.alle ?? [];
  return tage.includes(spieltag);
}

// „3 von 8" — Fortschritt statt nackter Zahl. Siehe Kopf: im Modus
// `kontingent` ist ein ungleicher Zwischenstand systembedingt, und nur der
// Bezug auf das Gesamt-Kontingent macht das sichtbar.
export function fortschritt(plan, userId, bisSpieltag) {
  if (!plan) return { gehabt: 0, gesamt: 0, text: "" };
  if (plan.modus === "frei") {
    const gehabt = Math.max(0, Math.min(plan.spieltage, bisSpieltag));
    return { gehabt, gesamt: plan.spieltage, text: "an jedem Spieltag" };
  }
  const tage = plan.proSpieler?.[userId] ?? plan.alle ?? [];
  const gehabt = tage.filter((t) => t <= bisSpieltag).length;
  return { gehabt, gesamt: plan.anzahl, text: `${gehabt} von ${plan.anzahl}` };
}

// Was hatten die MITSPIELER bisher? Genau die Ansicht, die verhindert, dass
// bei verdeckter Reihenfolge der Verdacht der Bevorzugung aufkommt.
export function uebersicht(plan, bisSpieltag, userIds = []) {
  return userIds.map((id) => ({ userId: id, ...fortschritt(plan, id, bisSpieltag) }));
}

// Welche Joker-Spieltage darf man SEHEN? Bei verdeckter Reihenfolge nur die
// bereits gespielten — der nächste bleibt Überraschung.
export function sichtbareSpieltage(plan, userId, verteilung, aktuellerSpieltag) {
  const v = sanitizeVerteilung(verteilung);
  if (!plan || plan.modus === "frei") return null;   // null = alle Spieltage
  const tage = plan.proSpieler?.[userId] ?? plan.alle ?? [];
  if (v.sichtbarkeit === "offen") return [...tage];
  return tage.filter((t) => t <= aktuellerSpieltag);
}

// Ein Satz für die UI: was der Admin gerade eingestellt hat.
export function beschreibeVerteilung(verteilung, spieltage = 34) {
  const v = sanitizeVerteilung(verteilung);
  if (v.modus === "frei") return "Jeder setzt an jedem Spieltag selbst einen Joker.";
  const n = kontingent(spieltage, v.frequenz);
  const wo = v.modus === "gleich"
    ? "für alle an denselben Spieltagen"
    : "jeder an eigenen Spieltagen";
  const sicht = v.sichtbarkeit === "offen"
    ? "Die Spieltage stehen vorab fest und sind einsehbar."
    : "Welcher Spieltag als Nächstes dran ist, bleibt verdeckt — das Kontingent sieht jeder.";
  return `Etwa ${n} Joker über ${spieltage} Spieltage, ${wo}. ${sicht}`;
}
