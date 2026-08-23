"use client";

import { useEffect, useMemo, useState } from "react";
import { C, MONO, RUND } from "@/lib/theme";
import { getStore } from "@/lib/store";
import { PHASEN, wettbewerbeIn, wettbewerbVon, phaseVon } from "@/lib/wettbewerbe";
import { filterSpiele, VERKNUEPFUNG_HINWEIS } from "@/lib/spielauswahl";

// ── „Nur das Interessanteste" ───────────────────────────────
// Welche Wettbewerbe und welche Phasen gehören zur Runde. Der Reiz daran ist
// nicht das Filtern selbst, sondern was übrig bleibt: „nur Champions League ab
// Achtelfinale" sind 29 Spiele statt 465 — eine ganz andere Runde. Deshalb
// steht unter jeder Auswahl sofort die Zahl.
// `onZahl` meldet die übrig bleibende Spielzahl nach oben. 🔴 Seit die
// Spielauswahl in der Runde WIRKLICH greift (09.08.2026), ist das kein
// Anzeige-Detail mehr: eine Auswahl, die nichts übrig lässt, erzeugt eine
// Runde ohne ein einziges Spiel. Die Zahl steht hier ohnehin — sie nach oben
// zu reichen ist billiger, als sie in der Spielerstellung ein zweites Mal zu
// rechnen (das wäre die zweite Wahrheit).
export default function SpielauswahlWettbewerbe({ spiele, onChange, onZahl }) {
  const [matches, setMatches] = useState(null);

  useEffect(() => {
    let live = true;
    getStore().listMatches()
      .then((ms) => { if (live) setMatches(ms); })
      .catch(() => { if (live) setMatches([]); });
    return () => { live = false; };
  }, []);

  const alle = matches ?? [];
  const wettbewerbe = useMemo(() => wettbewerbeIn(alle), [alle]);
  // Nur Phasen anbieten, die im Spielplan wirklich vorkommen — „Achtelfinale"
  // in einer reinen Bundesliga-Runde wäre eine Auswahl ins Leere.
  const phasen = useMemo(() => {
    const da = new Set(alle.map(phaseVon));
    return PHASEN.filter((p) => da.has(p.key));
  }, [alle]);

  const gewaehltW = spiele?.wettbewerbe ?? [];
  const gewaehltP = spiele?.phasen ?? [];
  const uebrig = useMemo(() => filterSpiele(alle, spiele ?? {}), [alle, spiele]);

  // ⚠️ Der Hook steht VOR dem frühen `return` weiter unten (CLAUDE.md: „Hooks
  // stehen VOR jedem frühen return"). Genau so lag `Tippabgabe.jsx` einmal
  // still kaputt.
  useEffect(() => {
    if (matches === null) return;   // noch nicht geladen — keine Aussage
    onZahl?.({ uebrig: uebrig.length, gesamt: alle.length });
  }, [matches, uebrig.length, alle.length, onZahl]);

  const umschalten = (feld, key, liste) => onChange({
    [feld]: liste.includes(key) ? liste.filter((k) => k !== key) : [...liste, key],
  });

  // Anzahl je Option — damit man vor dem Klicken sieht, was es kostet.
  const zaehle = (pruef) => alle.filter(pruef).length;

  if (wettbewerbe.length < 2 && phasen.length < 2) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {/* Keine eigene Überschrift mehr: seit 08.08.2026 steht dieser Block in
          der aufgeklappten Zeile „Wettbewerbe" der Spielerstellung, die
          Überschrift stand dadurch zweimal übereinander. */}
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 8px", lineHeight: 1.45 }}>
        Nichts ausgewählt = alles dabei. Eingrenzen für „nur aus dem Besten“ —
        etwa nur die Champions League ab dem Achtelfinale.
      </p>

      {wettbewerbe.length > 1 && (
        <Gruppe titel="Wettbewerbe">
          {wettbewerbe.map((w) => (
            <Chip key={w.key} an={gewaehltW.includes(w.key)}
              label={w.kurz} zusatz={zaehle((m) => wettbewerbVon(m) === w.key)}
              onClick={() => umschalten("wettbewerbe", w.key, gewaehltW)} />
          ))}
        </Gruppe>
      )}

      {phasen.length > 1 && (
        <Gruppe titel="Phasen">
          {phasen.map((p) => (
            <Chip key={p.key} an={gewaehltP.includes(p.key)}
              label={p.kurz} zusatz={zaehle((m) => phaseVon(m) === p.key)}
              onClick={() => umschalten("phasen", p.key, gewaehltP)} />
          ))}
        </Gruppe>
      )}

      {/* Die Zahl ist der eigentliche Punkt */}
      <div style={{
        marginTop: 9, background: C.ink2, border: `1px solid ${C.line}`,
        borderRadius: RUND.karte, padding: "9px 11px",
      }}>
        <div style={{ fontSize: 13, color: uebrig.length === 0 ? C.coral : C.text }}>
          <strong style={{ fontFamily: MONO }}>{uebrig.length}</strong> von {alle.length} Spielen
          {uebrig.length === 0 && " — diese Auswahl lässt nichts übrig"}
        </div>
        {(gewaehltW.length > 0 || gewaehltP.length > 0) && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
            {VERKNUEPFUNG_HINWEIS}
          </div>
        )}
      </div>
    </div>
  );
}

function Gruppe({ titel, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontFamily: MONO, fontSize: 11, letterSpacing: 1.2, color: C.muted,
        textTransform: "uppercase", marginBottom: 5,
      }}>{titel}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{children}</div>
    </div>
  );
}

// ⚠️ `minHeight: 44` ist eine Vorgabe, kein Geschmack: Apple verlangt 44 pt,
// Google 48 dp. Diese Chips waren 29 px hoch und stellten allein dreizehn der
// 18 zu kleinen Tippziele auf dem Erstellungs-Screen (gemessen 07.08.2026 bei
// 390 px Breite).
function Chip({ an, label, zusatz, onClick }) {
  return (
    <button onClick={onClick} style={{
      cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: "6px 13px",
      minHeight: 44, boxSizing: "border-box",
      borderRadius: RUND.pille, display: "flex", alignItems: "center", gap: 5,
      background: an ? `${C.mint}22` : C.surface,
      color: an ? C.mint : C.muted,
      border: `1px solid ${an ? C.mint + "66" : C.line}`,
    }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 11, opacity: 0.75 }}>{zusatz}</span>
    </button>
  );
}
