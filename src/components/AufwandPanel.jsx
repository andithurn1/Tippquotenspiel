"use client";

import { useMemo } from "react";
import { aufwand, AUFWAND_STUFEN } from "@/lib/aufwand";
import { C, MONO } from "@/lib/theme";

// Farbe je Aufwands-Stufe — reine Kennzeichnung, keine Bewertung. Auch
// „zuviel" ist erlaubt, es ist eine Auskunft (design/gehaeuse-ui.md, Kopf-
// Warnung: keine Balance-Aussagen in der UI).
const STUFEN_FARBE = {
  entspannt: C.mint,
  normal: C.sky,
  viel: C.akzent,
  zuviel: C.coral,
};

// Panel: wie viele Entscheidungen ein Spieltag verlangt. ZEITSCHUTZ, keine
// Balance (aufwand.js Kopfkommentar) — deshalb in ALLEN drei Stufen sichtbar,
// nicht nur bei „anpassen"/„profi": es ist eine Auskunft, kein Regler.
// Muster `PresetRating.jsx`.
export default function AufwandPanel({ rules, kontext }) {
  const a = useMemo(() => aufwand(rules, kontext), [rules, kontext]);
  const stufe = AUFWAND_STUFEN.find((s) => s.key === a.stufe);
  const farbe = STUFEN_FARBE[a.stufe] ?? C.muted;
  const kommaZahl = (n) => String(n ?? 0).replace(".", ",");

  return (
    <div style={{
      marginTop: 12, background: C.ink2, border: `1px solid ${C.line}`,
      borderRadius: 14, padding: "14px 16px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
          Aufwand pro Spieltag
        </span>
        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: farbe }}>
          {stufe?.label ?? "—"}
        </span>
      </div>

      {/* Tatsachen zuerst — aus dem Regelwerk gerechnet, nicht geschätzt. */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <Stat label="Spiele je Spieltag" value={kommaZahl(a.spieleProSpieltag)} />
        <Stat label="Spieltage" value={String(a.spieltage)} />
        <Stat label="Entscheidungen je Spieltag" value={kommaZahl(a.gesamtProSpieltag)} tone={farbe} />
      </div>

      {/* Erst danach die Schätzung — ausdrücklich als solche markiert, nicht
          im Kleingedruckten. */}
      <p style={{ fontSize: 12, color: C.text, marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
        Etwa <strong style={{ color: farbe }}>{a.sekundenJeSpiel}</strong> Sekunden je Spiel
        <span style={{ color: C.muted }}> — geschätzt, nicht gemessen.</span>
      </p>

      {stufe?.desc && (
        <p style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>{stufe.desc}</p>
      )}

      {a.hinweise.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {a.hinweise.map((h, i) => (
            <div key={i} style={{
              background: `${farbe}12`, border: `1px solid ${farbe}33`, borderRadius: 10,
              padding: "8px 10px", fontSize: 11, color: C.muted, lineHeight: 1.5,
            }}>{h}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 1.3 }}>
        {label}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: tone ?? C.text, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
