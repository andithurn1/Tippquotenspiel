"use client";

import { C } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";

// ============================================================
//  VARIANTENWAHL — Quotentippen ⇄ Budget
//
//  🔴 Andis Aufbau vom 20.08.2026: **die erste Frage der Spielerstellung**,
//  noch vor den Voreinstellungen. Begründung aus seinem Entwurf: es ist die
//  einzige Frage, die alles Nachfolgende verändert. Vorher steckte sie als
//  eine Kachel unter fünf („Wettbüro") und als Regler tief im Joker-Abschnitt
//  — an beiden Stellen leicht zu übersehen.
//
//  ⚠️ KEIN eigener Zustand. Die Variante wird aus `joker.modus` ABGELEITET:
//  `einsatz` heißt Budget, alles andere Quotentippen. Ein zweites Feld wäre
//  eine zweite Wahrheit über dieselbe Frage — und die Profi-Ansicht stellt
//  denselben Wert weiter unten ebenfalls, dort mit drei Möglichkeiten.
//
//  ⚠️ Quotentippen steht LINKS, obwohl Andis Skizze das Budget zuerst zeigt.
//  Grund ist seine spätere Ansage: „Quoten-Auswertung ist der Standard bzw.
//  meine Idee", und zum Budget „finde ich blöder" — es soll nicht nach vorn.
//  Wenn er die Skizze wörtlich will, ist es ein Tausch der beiden Einträge.
// ============================================================

// Rückkehr aus dem Budget: `einzel` ist der Ausgangszustand des Regelwerks.
// Welcher Modus vorher galt, merkt sich die Spielerstellung (`letzterModus`) —
// wer von „Rangliste" ins Budget und zurück wechselt, soll nicht stillschweigend
// bei „Ein Joker" landen.
const VARIANTEN = [
  {
    key: "quoten",
    titel: "Quotentippen",
    kurz: "Punkte entstehen aus der Wahrscheinlichkeit",
    lang: "Abgeleitet aus echten Wettquoten der Buchmacher: Wer aus einer "
      + "unwahrscheinlichen Lage richtig liegt, bekommt mehr.",
  },
  {
    key: "budget",
    titel: "Budget",
    kurz: "Fester Münz-Vorrat, den du selbst verteilst",
    lang: "Zu Beginn jedes Spieltags bekommt jeder denselben Vorrat und teilt "
      + "ihn auf die Spiele auf. Gewonnen werden Punkte, nie neue Münzen.",
  },
];

export default function VariantenWahl({ rules, onWaehlen }) {
  const aktuell = rules?.joker?.modus === "einsatz" ? "budget" : "quoten";

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
        Welche Variante willst du spielen?
      </div>
      <p style={{ fontSize: 12.5, color: C.muted, marginTop: 0, marginBottom: 10, lineHeight: 1.5 }}>
        Alles Weitere — Joker, Ereignisse, Regeln je Wettbewerb — kommt danach und
        gilt für beide.
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        {VARIANTEN.map((v) => {
          const an = aktuell === v.key;
          return (
            <button
              key={v.key}
              type="button"
              aria-pressed={an}
              onClick={() => onWaehlen(v.key)}
              style={{
                ...TAPZIEL,
                flex: 1, minWidth: 0, cursor: "pointer", fontFamily: "inherit",
                textAlign: "left", padding: "12px 14px",
                // R2 — Andis bevorzugter Radius.
                borderRadius: 12,
                background: an ? `${C.akzent}1A` : C.surface,
                color: an ? C.text : C.muted,
                border: `1px solid ${an ? C.akzent : C.line}`,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: an ? C.akzent : C.text }}>
                {v.titel}
              </div>
              <div style={{ fontSize: 11.5, marginTop: 3, lineHeight: 1.4 }}>{v.kurz}</div>
            </button>
          );
        })}
      </div>

      {/* Der lange Satz nur zur GEWÄHLTEN Variante. Beide gleichzeitig zu
          erklären kostet auf dem Handy sechs Zeilen und wird überlesen —
          erklärt wird, was gerade gilt. */}
      <p style={{ fontSize: 11.5, color: C.muted, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
        {VARIANTEN.find((v) => v.key === aktuell)?.lang}
      </p>
    </div>
  );
}
