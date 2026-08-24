"use client";

import { useMemo } from "react";
import { simulateBalance } from "@/lib/balanceSim";
import { C, MONO, AMPEL, RUND } from "@/lib/theme";


const FARBE = { gruen: C.mint, gelb: C.akzent, rot: C.coral };
// „unbekannt" bekommt bewusst KEINEN gefüllten Punkt: eine Ampel, die nicht
// alles gesehen hat, leuchtet nicht — sie hält sich zurück.
const SYMBOL = { gruen: "●", gelb: "●", rot: "●", unbekannt: "○" };

// Etwas kleiner als der Default, damit es beim Schieben der Regler flüssig
// bleibt — die Aussage ändert sich dadurch nicht.
const LIVE = { seasons: 40, matchdays: 17, perMatchday: 9, seed: 12345 };

// Balance-Ampel: verdichtet die Simulation zu EINER Aussage. Details darunter
// klein, damit der Admin nicht in Kennzahlen ertrinkt.
export default function BalanceAmpel({ rules }) {
  const sim = useMemo(() => simulateBalance(rules, LIVE), [rules]);
  const farbe = AMPEL[sim.ampel.stufe];
  const v = sim.punkteVerhaeltnis;

  return (
    <div style={{
      marginTop: 14, background: `${farbe}10`, border: `1px solid ${farbe}44`,
      borderRadius: RUND.karte, padding: "13px 15px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: farbe, fontSize: "0.9375rem" }}>{SYMBOL[sim.ampel.stufe]}</span>
        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: farbe }}>{sim.ampel.titel}</span>
      </div>
      <p style={{ fontSize: "0.75rem", color: C.muted, margin: "6px 0 0", lineHeight: 1.5 }}>
        {sim.ampel.text}
      </p>

      <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        <Kennzahl label="Außenseiter-Setzen bringt"
          wert={`${v.toFixed(2)}×`}
          hint="Punkte eines Dauer-Außenseiter-Tippers im Vergleich zu einem guten Tipper. 1,0 = gleichauf." />
        {sim.modifikatorAnteil > 0 && (
          <Kennzahl label="aus Modifikatoren"
            wert={`${Math.round(sim.modifikatorAnteil * 100)} %`}
            hint="Anteil der Punkte, der aus Jokern/Gewichten statt aus guten Tipps kommt." />
        )}
        {sim.aufholFlipQuote > 0 && (
          <Kennzahl label="Aufholen dreht Sieg"
            wert={`${Math.round(sim.aufholFlipQuote * 100)} %`}
            hint="Anteil der Saisons, in denen der Anschluss-Bonus den Sieg vom besten Tipper wegnimmt. Etwas Bewegung ist gewollt, zu viel entwertet gutes Tippen." />
        )}
        <Kennzahl label="bestes Einzelspiel"
          wert={String(sim.maximalfall)}
          hint="Höchste realistisch erreichbare Punktzahl in einem Spiel, mit vollem Modifikator." />
      </div>

      {/* 🔴 Was die Simulation NICHT gerechnet hat, steht bei ihr — nicht in
          einer Datei, die niemand liest. Ohne diesen Block sagte die Ampel
          „Ausgewogen", während ein Jackpot auf dem Dreifachen stand und
          Duelle liefen; sie hatte davon nur nichts gesehen. Ein grünes Licht,
          das nichts bedeutet, ist schlimmer als gar keins.
          Verschwindet von selbst, sobald eine Ebene angeschlossen wird —
          die Liste steht in `NICHT_SIMULIERT` (balanceSim.js). */}
      {sim.unvermessen.length > 0 && (
        <div style={{
          marginTop: 10, paddingTop: 9, borderTop: `1px solid ${C.line}`,
          fontSize: "0.6875rem", color: C.muted, lineHeight: 1.5,
        }}>
          <strong style={{ color: C.text }}>Nicht mitgerechnet:</strong>{" "}
          {sim.unvermessen.map((e, i) => (
            <span key={e.feld}>
              {i > 0 && " · "}
              <span style={{ color: C.text }}>{e.label}</span> ({e.was})
            </span>
          ))}
          . Diese Ebenen vergeben Punkte neben der Tipp-Wertung; der Simulator
          kennt sie noch nicht. Für sie gilt hier keine Aussage.
        </div>
      )}

      <p style={{ fontSize: "0.6875rem", color: C.muted, margin: "9px 0 0", lineHeight: 1.4, opacity: 0.8 }}>
        Simuliert {LIVE.seasons} Saisons: ein guter Tipper (tippt den wahrscheinlichsten Ausgang)
        gegen einen, der stur auf Außenseiter setzt.
      </p>
    </div>
  );
}

function Kennzahl({ label, wert, hint }) {
  return (
    <div title={hint} style={{ minWidth: 92 }}>
      <div style={{ fontFamily: MONO, fontSize: "0.9375rem", fontWeight: 700, color: C.text }}>{wert}</div>
      <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 1, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}
