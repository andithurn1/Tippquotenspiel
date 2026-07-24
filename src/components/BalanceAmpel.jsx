"use client";

import { useMemo } from "react";
import { simulateBalance } from "@/lib/balanceSim";
import { C, MONO, AMPEL } from "@/lib/theme";


const FARBE = { gruen: C.mint, gelb: C.gold, rot: C.coral };
const SYMBOL = { gruen: "●", gelb: "●", rot: "●" };

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
      borderRadius: 14, padding: "13px 15px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: farbe, fontSize: 14 }}>{SYMBOL[sim.ampel.stufe]}</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: farbe }}>{sim.ampel.titel}</span>
      </div>
      <p style={{ fontSize: 11.5, color: C.muted, margin: "6px 0 0", lineHeight: 1.5 }}>
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
        <Kennzahl label="bestes Einzelspiel"
          wert={String(sim.maximalfall)}
          hint="Höchste realistisch erreichbare Punktzahl in einem Spiel, mit vollem Modifikator." />
      </div>

      <p style={{ fontSize: 10, color: C.muted, margin: "9px 0 0", lineHeight: 1.4, opacity: 0.8 }}>
        Simuliert {LIVE.seasons} Saisons: ein guter Tipper (tippt den wahrscheinlichsten Ausgang)
        gegen einen, der stur auf Außenseiter setzt.
      </p>
    </div>
  );
}

function Kennzahl({ label, wert, hint }) {
  return (
    <div title={hint} style={{ minWidth: 92 }}>
      <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: C.text }}>{wert}</div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 1, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}
