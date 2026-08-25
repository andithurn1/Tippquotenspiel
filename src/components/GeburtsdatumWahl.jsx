"use client";

import { useMemo, useState } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import {
  START_JAHR, MONATE, tageImMonat, bildeDatum, sanitizeGeburtsdatum,
  jahresListeSortiert,
} from "@/lib/geburtsdatum";

// ============================================================
//  GEBURTSDATUM WÄHLEN (Andi, KT9)
//
//  🔴 „Alters auswahl beginnt bei 1995… sodass man nich von heutigem datum
//  runterscrollen muss." Die Liste ROLLT nicht von heute — sie steht beim
//  Öffnen auf 1995, und von dort sind beide Richtungen gleich weit.
//
//  ⚠️ Kein `<input type="date">`. Das sieht auf jedem Gerät anders aus, öffnet
//  auf iOS ein Rad, das beim HEUTIGEN Datum steht, und lässt sich nicht dazu
//  bringen, woanders aufzuschlagen — also genau das, worüber Andi sich
//  beschwert hat. Drei eigene Felder sind mehr Code und weniger Ärger.
//
//  ⛔ Kein Pflichtfeld. „Keine Angabe" ist ein Knopf, kein versteckter
//  Zustand — wer nichts angeben will, muss das TUN können, nicht raten.
// ============================================================

const Feld = ({ children, breit = false }) => (
  <div style={{ flex: breit ? 2 : 1, minWidth: 0 }}>{children}</div>
);

export default function GeburtsdatumWahl({ wert, onChange, gespeichert = false }) {
  const start = sanitizeGeburtsdatum(wert);
  const [jahr, setJahr] = useState(start ? Number(start.slice(0, 4)) : START_JAHR);
  const [monat, setMonat] = useState(start ? Number(start.slice(5, 7)) : 1);
  const [tag, setTag] = useState(start ? Number(start.slice(8, 10)) : 1);

  const { jahre } = useMemo(() => jahresListeSortiert(), []);
  const maxTag = tageImMonat(jahr, monat);
  // ⚠️ Wer vom 31. Januar auf den Februar wechselt, hätte sonst einen
  // 31. Februar stehen. Der Tag wandert mit, statt ungültig zu werden.
  const sicherenTag = Math.min(tag, maxTag);
  const datum = bildeDatum(jahr, monat, sicherenTag);

  const setze = (j, m, t) => {
    const tSicher = Math.min(t, tageImMonat(j, m));
    setJahr(j); setMonat(m); setTag(tSicher);
    onChange?.(bildeDatum(j, m, tSicher));
  };

  const auswahlStil = {
    ...TAPZIEL, width: "100%", background: C.surface, color: C.text,
    border: `1px solid ${C.line}`, borderRadius: RUND.karte,
    padding: "10px 12px", fontSize: "1rem", fontFamily: "inherit",
    appearance: "none", cursor: "pointer",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <Feld>
          <label style={{ fontSize: "0.6875rem", color: C.muted, fontFamily: MONO, letterSpacing: 1 }}>TAG</label>
          <select className="tqs-aktion" style={auswahlStil} value={sicherenTag}
            onChange={(e) => setze(jahr, monat, Number(e.target.value))}>
            {Array.from({ length: maxTag }, (_, i) => i + 1).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Feld>
        <Feld breit>
          <label style={{ fontSize: "0.6875rem", color: C.muted, fontFamily: MONO, letterSpacing: 1 }}>MONAT</label>
          <select className="tqs-aktion" style={auswahlStil} value={monat}
            onChange={(e) => setze(jahr, Number(e.target.value), tag)}>
            {MONATE.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>
        </Feld>
        <Feld>
          <label style={{ fontSize: "0.6875rem", color: C.muted, fontFamily: MONO, letterSpacing: 1 }}>JAHR</label>
          {/* 🔴 Hier sitzt Andis Anforderung: die Liste steht auf 1995, nicht
              auf heute. `defaultValue` reicht nicht — der Browser scrollt zum
              GEWÄHLTEN Eintrag, deshalb ist 1995 der Anfangswert. */}
          <select className="tqs-aktion" style={auswahlStil} value={jahr}
            onChange={(e) => setze(Number(e.target.value), monat, tag)}>
            {jahre.map((j) => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </Feld>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <button className="tqs-aktion" onClick={() => onChange?.(datum)} style={{
          ...TAPZIEL, background: C.akzent, color: C.ink, border: "none",
          borderRadius: RUND.pille, padding: "9px 18px", fontWeight: 700,
          fontSize: "0.875rem", fontFamily: "inherit", cursor: "pointer",
        }}>
          Übernehmen
        </button>
        {/* ⛔ Kein Pflichtfeld — und das muss man TUN können, nicht raten. */}
        <button className="tqs-aktion" onClick={() => onChange?.(null)} style={{
          ...TAPZIEL, background: "transparent", color: C.muted,
          border: `1px solid ${C.line}`, borderRadius: RUND.pille,
          padding: "9px 16px", fontSize: "0.8125rem", fontFamily: "inherit", cursor: "pointer",
        }}>
          Keine Angabe
        </button>
        {gespeichert && (
          <span className="tqs-haken" style={{ fontSize: "0.75rem", color: C.mint, fontFamily: MONO }}>
            gespeichert
          </span>
        )}
      </div>

      <p style={{ fontSize: "0.75rem", color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
        Freiwillig. Genutzt nur für Namensvorschläge wie <b style={{ color: C.text }}>
          Andi{String(jahr).slice(2)}</b>, wenn dein Wunschname schon vergeben ist.
      </p>
    </div>
  );
}
