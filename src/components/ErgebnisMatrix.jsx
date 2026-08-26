"use client";

import { useMemo, useState } from "react";
import {
  MATRIX_STUFEN, DEFAULT_MATRIX_STUFE, matrixMasse, matrixFelder, beschreibeMatrix,
  nutzbareStufen,
} from "@/lib/ergebnisMatrix";
import { ergebnisSperre } from "@/lib/favoritenSperre";
import { C, MONO, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import { usePrefs } from "@/components/PrefsProvider";

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
// ⚠️ `weite` überschreibt die persönliche Einstellung — gebraucht von der
// Vorschau in den Anzeige-Einstellungen, die JEDE Stufe zeigen muss, nicht
// die gerade gewählte. Ohne den Ausweg ließe sich eine Stufe nur vorführen,
// indem man sie einschaltet.
export default function ErgebnisMatrix({ snap, rules, tip, onWahl, gesperrt = false, weite = null }) {
  const [stufe, setStufe] = useState(DEFAULT_MATRIX_STUFE);
  // 🔴 Wie weit das Raster reicht, ist eine PERSÖNLICHE Anzeige-Einstellung
  // (Andi, 25.08.2026) — nicht eine Regel der Runde. Sie steht bei „Meine
  // Anzeige", erreichbar über den Account.
  const { prefs } = usePrefs();
  const bisTipp = (weite ?? prefs?.rasterWeite) === "voll";

  const masse = useMemo(() => matrixMasse(snap, stufe, { bisTipp }), [snap, stufe, bisTipp]);
  const felder = useMemo(() => matrixFelder(snap, rules, masse, tip), [snap, rules, masse, tip]);
  const info = useMemo(() => beschreibeMatrix(snap, stufe, { bisTipp }), [snap, stufe, bisTipp]);
  // ⚠️ Nur Stufen anbieten, die für DIESES Spiel etwas anderes zeigen. Sonst
  // stehen bei einem 6×6-Raster „6", „8" und „9" nebeneinander und tun alle
  // dasselbe — die „Dekoration", wegen der TI2 lange ausgesetzt hat.
  const stufen = useMemo(() => nutzbareStufen(snap, { bisTipp }), [snap, bisTipp]);

  // 🔴 Die Favoriten-Sperre (Andi, 26.08.2026: „mach dann auch bei der
  // Tippabgabe einsehbar für die nutzer, dass halt bspw. kane wegen der
  // einstellung gesperrt ist mit knapper begründung").
  //
  // ⚠️ Gefragt, nicht nachgerechnet: `ergebnisSperre` ist dieselbe Funktion,
  // die auch das Speichern prüft. Ein Raster, das andere Felder ausgraut als
  // die Prüfung ablehnt, wäre die zweite Wahrheit aus der Runden-Schicht —
  // und das ist in diesem Projekt schon 17-mal an einem Tag passiert.
  const sperren = useMemo(() => {
    const m = new Map();
    for (const o of ergebnisSperre(snap, rules)) if (o.gesperrt) m.set(o.id, o.grund);
    return m;
  }, [snap, rules]);

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
          fontFamily: MONO, fontSize: "0.6875rem", letterSpacing: 1, color: C.muted, textTransform: "uppercase",
        }}>Jedes Ergebnis, jede Punktzahl</span>
        <span style={{ fontSize: "0.6875rem", color: C.muted }}>{info.text}</span>
      </div>

      {/* Größe (TI2). Die automatischen Stufen stehen vorn: sie sind die
          bessere Antwort, das feste Quadrat die verlässlichere. */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {stufen.map((s) => {
          const an = stufe === s.key;
          return (
            <button key={s.key} title={s.desc} onClick={() => setStufe(s.key)} style={{
              ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem",
              padding: "6px 11px", borderRadius: RUND.pille,
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
              textAlign: "center", fontFamily: MONO, fontSize: "0.6875rem", color: C.muted, paddingBottom: 2,
            }}>{a}</div>
          ))}

          {Array.from({ length: masse.maxHeim + 1 }, (_, h) => (
            <FeldZeile key={`z${h}`} h={h} spalten={spalten} feldVon={feldVon}
              maxPunkte={maxPunkte} tip={tip} onWahl={onWahl} gesperrt={gesperrt}
              sperren={sperren} />
          ))}
        </div>
      </div>

      {/* 🔴 Der Satz zur Sperre steht DIREKT unter dem Raster und nicht in
          einem Hinweis weiter oben: ein ausgegrautes Feld ohne Erklärung ist
          die Sorte Oberfläche, bei der man zweimal tippt und dann glaubt, die
          App sei kaputt. */}
      {sperren.size > 0 && (
        <p style={{
          fontSize: "0.75rem", color: C.muted, marginTop: 8, lineHeight: 1.45,
          padding: "8px 10px", borderRadius: RUND.karte,
          background: C.surface, border: `1px solid ${C.line}`,
        }}>
          🔒 <strong style={{ color: C.text }}>
            {sperren.size} {sperren.size === 1 ? "Ergebnis ist" : "Ergebnisse sind"} nicht wählbar
          </strong>{" "}
          ({[...sperren.keys()].join(", ")}) — {[...sperren.values()][0].replace(/^gesperrt: /, "")}.
          So hat der Admin die Runde eingestellt.
        </p>
      )}

      <p style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
        Zeilen = Tore {snap?.home ?? "Heim"}, Spalten = Tore {snap?.away ?? "Gast"}.
        Die Zahl im Feld ist die Auszahlung <strong>für das Ergebnis allein</strong> —
        deine Torschützen kommen oben drauf.
      </p>
    </div>
  );
}

// Eine Zeile — ausgelagert, damit die Zeilenbeschriftung (Heim-Tore) und die
// Felder dieselbe Höhe teilen, ohne dass die Grid-Definition zerfällt.
function FeldZeile({ h, spalten, feldVon, maxPunkte, tip, onWahl, gesperrt, sperren }) {
  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        paddingRight: 6, fontFamily: MONO, fontSize: "0.6875rem", color: C.muted,
      }}>{h}</div>
      {Array.from({ length: spalten }, (_, a) => {
        const f = feldVon(h, a);
        if (!f) return <div key={`f${h}-${a}`} />;
        const gewaehlt = tip && Number(tip.home) === h && Number(tip.away) === a;
        // Favoriten-Sperre: das Feld bleibt SICHTBAR (samt Punktzahl), ist aber
        // nicht anklickbar. Wegblenden wäre falsch — dann fehlte im Raster ein
        // Loch, das niemand erklärt, und der Spieler suchte den Endstand.
        const sperrGrund = sperren?.get(`${h}:${a}`) ?? null;
        const zu = gesperrt || !!sperrGrund;
        // Die Färbung trägt die Aussage: je mehr Punkte, desto kräftiger.
        // Bewusst über die WURZEL — linear wäre unten alles gleich blass,
        // und gerade die Unterschiede zwischen den plausiblen Ergebnissen
        // sind die, auf die es beim Tippen ankommt.
        const staerke = Math.sqrt(Math.min(1, f.punkte / maxPunkte));
        return (
          <button key={`f${h}-${a}`} disabled={zu}
            onClick={() => onWahl?.(h, a)}
            title={sperrGrund
              ? `${h}:${a} — ${sperrGrund}`
              : f.quote
                ? `Quote ${f.quote.toFixed(1)}${f.geschaetzt ? " (geschätzt)" : ""} · ${Math.round(f.wahrscheinlichkeit * 100)} %`
                : undefined}
            style={{
              minHeight: 44, boxSizing: "border-box", cursor: zu ? "default" : "pointer",
              fontFamily: "inherit", padding: "5px 3px", borderRadius: RUND.karte,
              background: sperrGrund
                ? C.ink2
                : gewaehlt ? `${C.akzent}33` : `${C.akzent}${Math.round(staerke * 26).toString(16).padStart(2, "0")}`,
              border: `1px solid ${sperrGrund ? C.line : gewaehlt ? C.akzent : C.line}`,
              color: C.text, opacity: sperrGrund ? 0.5 : gesperrt ? 0.55 : 1,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
            }}>
            <span style={{ fontFamily: MONO, fontSize: "0.6875rem", color: gewaehlt ? C.akzent : C.muted }}>
              {sperrGrund ? "🔒 " : ""}{h}:{a}
            </span>
            <span style={{
              fontFamily: MONO, fontSize: "0.8125rem", fontWeight: 700,
              color: gewaehlt ? C.akzent : C.text,
            }}>{f.punkte}</span>
          </button>
        );
      })}
    </>
  );
}
