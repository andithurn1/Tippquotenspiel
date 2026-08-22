"use client";

import { useMemo, useState } from "react";
import {
  MATRIX_STUFEN, DEFAULT_MATRIX_STUFE, matrixMasse, matrixFelder, beschreibeMatrix,
} from "@/lib/ergebnisMatrix";
import { C, MONO } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";

// ── Die Ergebnis-Matrix: jedes Feld sagt, was es bringt ──────
//
// Andis Ansage aus der Masterdatei (TI1–TI3). Der Unterschied zur
// Zahleneingabe daneben ist nicht die Bequemlichkeit, sondern die
// INFORMATION: beim Steppen sieht man die Punkte erst, wenn man den Endstand
// schon gewählt hat — hier sieht man sie VORHER, für alle Endstände
// nebeneinander. Das ist die Entscheidungshilfe, die das Spiel ausmacht.
//
// ⚠️ Gerechnet wird nichts hier (`ergebnisMatrix.js` fragt die Engine). Diese
// Datei malt nur — Runden-Schicht, CLAUDE.md.
//
// ⚠️ Die Zahlen sind die Punkte OHNE Torschützen. Warum, steht im Kopf von
// `ergebnisMatrix.js`; hier steht es als Satz unter der Matrix, weil ein
// Spieler sonst zwei verschiedene Zahlen für dasselbe Spiel sieht (die große
// oben rechnet die Schützen mit) und keine Erklärung dafür hat.
export default function ErgebnisMatrix({ snap, rules, tip, onWahl, gesperrt = false }) {
  const [stufe, setStufe] = useState(DEFAULT_MATRIX_STUFE);

  const masse = useMemo(() => matrixMasse(snap, stufe), [snap, stufe]);
  const felder = useMemo(() => matrixFelder(snap, rules, masse, tip), [snap, rules, masse, tip]);
  const info = useMemo(() => beschreibeMatrix(snap, stufe), [snap, stufe]);

  if (!felder.length) return null;

  const maxPunkte = Math.max(...felder.map((f) => f.punkte), 1);
  const feldVon = (h, a) => felder.find((f) => f.home === h && f.away === a);
  const spalten = masse.maxGast + 1;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        gap: 10, flexWrap: "wrap", marginBottom: 8,
      }}>
        <span style={{
          fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: C.muted, textTransform: "uppercase",
        }}>Jedes Ergebnis, jede Punktzahl</span>
        <span style={{ fontSize: 11, color: C.muted }}>{info.text}</span>
      </div>

      {/* Größe (TI2). Die automatischen Stufen stehen vorn: sie sind die
          bessere Antwort, das feste Quadrat die verlässlichere. */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {MATRIX_STUFEN.map((s) => {
          const an = stufe === s.key;
          return (
            <button key={s.key} title={s.desc} onClick={() => setStufe(s.key)} style={{
              ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", fontSize: 12,
              padding: "6px 11px", borderRadius: 999,
              background: an ? `${C.akzent}22` : C.surface,
              color: an ? C.akzent : C.muted,
              border: `1px solid ${an ? C.akzent + "66" : C.line}`,
            }}>{s.label}</button>
          );
        })}
      </div>

      {/* ⚠️ Eigener Scroll-Bereich: bei „5" sind es sechs Spalten, und auf
          375 px darf die SEITE nicht waagerecht laufen — nur die Matrix. */}
      <div style={{ overflowX: "auto", paddingBottom: 2 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `auto repeat(${spalten}, minmax(56px, 1fr))`,
          gap: 4, minWidth: `${56 * spalten + 40}px`,
        }}>
          {/* Kopfzeile: die Tore der Gastmannschaft */}
          <div />
          {Array.from({ length: spalten }, (_, a) => (
            <div key={`k${a}`} style={{
              textAlign: "center", fontFamily: MONO, fontSize: 11, color: C.muted, paddingBottom: 2,
            }}>{a}</div>
          ))}

          {Array.from({ length: masse.maxHeim + 1 }, (_, h) => (
            <FeldZeile key={`z${h}`} h={h} spalten={spalten} feldVon={feldVon}
              maxPunkte={maxPunkte} tip={tip} onWahl={onWahl} gesperrt={gesperrt} />
          ))}
        </div>
      </div>

      <p style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
        Zeilen = Tore {snap?.home ?? "Heim"}, Spalten = Tore {snap?.away ?? "Gast"}.
        Die Zahl im Feld ist die Auszahlung <strong>für das Ergebnis allein</strong> —
        deine Torschützen kommen oben drauf.
      </p>
    </div>
  );
}

// Eine Zeile — ausgelagert, damit die Zeilenbeschriftung (Heim-Tore) und die
// Felder dieselbe Höhe teilen, ohne dass die Grid-Definition zerfällt.
function FeldZeile({ h, spalten, feldVon, maxPunkte, tip, onWahl, gesperrt }) {
  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        paddingRight: 6, fontFamily: MONO, fontSize: 11, color: C.muted,
      }}>{h}</div>
      {Array.from({ length: spalten }, (_, a) => {
        const f = feldVon(h, a);
        if (!f) return <div key={`f${h}-${a}`} />;
        const gewaehlt = tip && Number(tip.home) === h && Number(tip.away) === a;
        // Die Färbung trägt die Aussage: je mehr Punkte, desto kräftiger.
        // Bewusst über die WURZEL — linear wäre unten alles gleich blass,
        // und gerade die Unterschiede zwischen den plausiblen Ergebnissen
        // sind die, auf die es beim Tippen ankommt.
        const staerke = Math.sqrt(Math.min(1, f.punkte / maxPunkte));
        return (
          <button key={`f${h}-${a}`} disabled={gesperrt}
            onClick={() => onWahl?.(h, a)}
            title={f.quote ? `Quote ${f.quote.toFixed(1)} · ${Math.round(f.wahrscheinlichkeit * 100)} %` : undefined}
            style={{
              minHeight: 44, boxSizing: "border-box", cursor: gesperrt ? "default" : "pointer",
              fontFamily: "inherit", padding: "5px 3px", borderRadius: 10,
              background: gewaehlt ? `${C.akzent}33` : `${C.akzent}${Math.round(staerke * 26).toString(16).padStart(2, "0")}`,
              border: `1px solid ${gewaehlt ? C.akzent : C.line}`,
              color: C.text, opacity: gesperrt ? 0.55 : 1,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
            }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: gewaehlt ? C.akzent : C.muted }}>
              {h}:{a}
            </span>
            <span style={{
              fontFamily: MONO, fontSize: 13, fontWeight: 700,
              color: gewaehlt ? C.akzent : C.text,
            }}>{f.punkte}</span>
          </button>
        );
      })}
    </>
  );
}
