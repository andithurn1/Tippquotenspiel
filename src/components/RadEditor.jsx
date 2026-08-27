"use client";

import { useMemo, useRef, useState } from "react";
import { C, SERIES, RUND, MONO } from "@/lib/theme";
import { segmente as segmenteVon, winkelVon, naechsteGrenze, ziehGrenze, sehne } from "@/lib/radGeometrie";
import { wahrscheinlichkeiten, AUSSCHLUSS_REICHWEITEN, DREHRAD_LIMITS } from "@/lib/drehrad";

// ============================================================
//  DAS RAD ALS EDITOR — Andis Frage vom 27.08.2026
//
//  🔴 Wörtlich: „glaubst du man kann so ein glücksrad so designen dass admin
//  selber die felder größe also die wahrscheinlichkeit, und dazu noch die
//  weiteren sinnvollen optionen wie cooldown, gegenseitige ausschlüsse und
//  nicht kombinierbarkeit etc. optisch an dem Rad einstellen kann mit den
//  ganzen Regelbeziehungen."
//
//  ── Die Antwort ist ja, aber nicht für alles ──
//  Es gibt zwei Sorten Einstellung, und nur eine davon hat am Rad einen Ort:
//
//  ✅ **Was eine FLÄCHE ist**, gehört ans Rad. Die Wahrscheinlichkeit ist die
//     Fläche — das ist keine Metapher, sondern dieselbe Zahl (`gewicht`), mit
//     der auch gezogen wird. Sie am Rad zu ziehen ist genauer als sie zu
//     tippen, weil man dabei sieht, was man den Nachbarn wegnimmt.
//
//  ✅ **Was eine BEZIEHUNG ist**, gehört ans Rad. Ein Ausschluss zwischen zwei
//     Feldern ist eine Linie zwischen zwei Stellen — in einer Tabelle wäre er
//     eine Zeile, die man mit zwei Namen im Kopf lesen muss.
//
//  ⛔ **Was eine ZAHL ohne Ort ist, gehört NICHT ans Rad.** „Cooldown 3
//     Drehungen" hat keine Fläche und keine zwei Enden. Ein Ring ums Segment
//     kann sagen, DASS es einen gibt — aber die 3 einstellen kann er nicht
//     ehrlich. Sie steht deshalb weiter im Zahlenfeld, und das Rad zeigt nur
//     an, wo eine sitzt. **Ein Regler, den man nur ungefähr treffen kann, ist
//     schlechter als ein Eingabefeld** — auch wenn er hübscher aussieht.
//
//  ── Der Zug, und warum er eine GRENZE bewegt und kein Feld ──
//  Ein Rad ist ein Ganzes: zieht man ein Feld größer, muss die Fläche irgendwo
//  herkommen. Die naive Umsetzung („alle anderen anteilig kleiner") fühlt sich
//  beim ersten Zug richtig an und ist beim dritten unbrauchbar — jedes Feld
//  wandert, während man ein anderes zieht. Hier wandert die Fläche zwischen
//  genau ZWEI Nachbarn; alle übrigen bleiben stehen. Die Rechnung dazu steht
//  in `radGeometrie.js` und ist dort geprüft.
//
//  ⚠️ Und die Tastatur kann alles, was die Maus kann: jedes Segment ist ein
//  Knopf, die Pfeiltasten verschieben die Grenze rechts davon. Ein Editor, den
//  man nur ziehen kann, ist für einen Teil der Leute gar kein Editor.
// ============================================================

const GROESSE = 260;
const NABE = 0.12;

function punkt(cx, cy, r, grad) {
  const rad = ((grad - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function segmentPfad(cx, cy, r, vonGrad, bisGrad) {
  if (bisGrad - vonGrad >= 359.999) {
    const [ax, ay] = punkt(cx, cy, r, 0);
    const [bx, by] = punkt(cx, cy, r, 180);
    return `M ${ax} ${ay} A ${r} ${r} 0 1 1 ${bx} ${by} A ${r} ${r} 0 1 1 ${ax} ${ay} Z`;
  }
  const [x1, y1] = punkt(cx, cy, r, vonGrad);
  const [x2, y2] = punkt(cx, cy, r, bisGrad);
  const gross = bisGrad - vonGrad > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${gross} 1 ${x2} ${y2} Z`;
}

export default function RadEditor({
  felder = [],
  ausschluesse = [],
  gewaehlt = null,
  onWaehlen,
  onGewichte,          // ({ [id]: gewicht }) => void
  onAusschluss,        // (a, b) => void  — anlegen oder entfernen
}) {
  const [modus, setModus] = useState("groesse");   // "groesse" | "beziehung"
  const [zieht, setZieht] = useState(null);        // { index } während des Ziehens
  const svgRef = useRef(null);

  const anteile = useMemo(() => wahrscheinlichkeiten(felder), [felder]);
  const segmente = useMemo(
    () => segmenteVon(felder, anteile).map((s, i) => ({ ...s, farbe: SERIES[i % SERIES.length] })),
    [felder, anteile]);
  const gesamt = useMemo(
    () => felder.reduce((sum, f) => sum + (Number(f.gewicht) || 0), 0), [felder]);

  const r = GROESSE / 2;
  const mitteVon = new Map(segmente.map((s) => [s.id, s.mitte]));

  // Zeigerposition → Winkel. ⚠️ Über die tatsächliche Bildschirmgröße des SVG,
  // nicht über `GROESSE`: die Seite skaliert auf schmalen Geräten, und mit der
  // Nennbreite gerechnet läge der Griff um den Skalierungsfaktor daneben.
  const gradVon = (e) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return null;
    const x = ((e.clientX - box.left) / box.width) * GROESSE;
    const y = ((e.clientY - box.top) / box.height) * GROESSE;
    return winkelVon(r, r, x, y);
  };

  const beginn = (e) => {
    if (modus !== "groesse" || !onGewichte) return;
    const grad = gradVon(e);
    if (grad == null) return;
    const treffer = naechsteGrenze(segmente, grad);
    if (!treffer) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setZieht({ index: treffer.index });
  };

  const bewegen = (e) => {
    if (!zieht) return;
    const grad = gradVon(e);
    if (grad == null) return;
    const neu = ziehGrenze(segmente, zieht.index, grad, gesamt);
    if (neu) onGewichte(neu);
  };

  const ende = () => setZieht(null);

  // Pfeiltasten: dieselbe Rechnung, nur in 2°-Schritten.
  const taste = (e, index) => {
    if (modus !== "groesse" || !onGewichte) return;
    const richtung = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!richtung || index >= segmente.length - 1) return;
    e.preventDefault();
    const neu = ziehGrenze(segmente, index, segmente[index].bis + richtung * 2, gesamt);
    if (neu) onGewichte(neu);
  };

  const tippe = (id) => {
    if (modus === "beziehung" && gewaehlt && gewaehlt !== id) {
      onAusschluss?.(gewaehlt, id);
      return;
    }
    onWaehlen?.(id === gewaehlt ? null : id);
  };

  if (segmente.length < 2) {
    return (
      <div style={{ fontSize: "0.75rem", color: C.muted, lineHeight: 1.5, padding: "12px 0" }}>
        Noch kein Rad zum Anfassen — es braucht mindestens zwei Felder mit einer Größe
        über null. Leg sie unten an, dann lässt sich hier ziehen.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {/* Zwei Betriebsarten, sichtbar getrennt. ⚠️ Nicht als versteckter
          Doppelklick oder Modifiertaste: was das Antippen eines Feldes tut,
          muss man sehen können, bevor man tippt. */}
      <div style={{ display: "flex", gap: 6 }}>
        {[
          { key: "groesse", label: "Größen ziehen" },
          { key: "beziehung", label: "Beziehungen" },
        ].map((m) => {
          const an = modus === m.key;
          return (
            <button key={m.key} onClick={() => setModus(m.key)} style={{
              cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 700,
              padding: "7px 13px", borderRadius: RUND.pille,
              background: an ? `${C.indigo}22` : C.surface2, color: an ? C.indigo : C.muted,
              border: `1px solid ${an ? C.indigo + "66" : C.line}`,
            }}>{m.label}</button>
          );
        })}
      </div>

      <svg
        ref={svgRef}
        width={GROESSE} height={GROESSE} viewBox={`0 0 ${GROESSE} ${GROESSE}`}
        onPointerDown={beginn} onPointerMove={bewegen}
        onPointerUp={ende} onPointerCancel={ende}
        style={{ touchAction: "none", maxWidth: "100%", height: "auto" }}
      >
        {segmente.map((s, i) => {
          const [tx, ty] = punkt(r, r, r * 0.66, s.mitte);
          const beschriften = s.bis - s.von >= 24;
          const aktiv = s.id === gewaehlt;
          const feld = felder.find((f) => f.id === s.id);
          return (
            <g key={s.id}>
              <path
                d={segmentPfad(r, r, r - 1, s.von, s.bis)}
                fill={s.farbe} fillOpacity={aktiv ? 1 : 0.72}
                stroke={aktiv ? C.text : C.ink} strokeWidth={aktiv ? 2.5 : 1.5}
                tabIndex={0} role="button"
                aria-label={`${s.label || "Feld"}, ${Math.round(s.anteil * 100)} Prozent`}
                onClick={() => tippe(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tippe(s.id); }
                  else taste(e, i);
                }}
                style={{ cursor: modus === "beziehung" ? "crosshair" : "pointer" }}
              />
              {beschriften && (
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${s.mitte} ${tx} ${ty})`}
                  style={{ fontSize: "0.6875rem", fontWeight: 700, fill: C.ink, pointerEvents: "none" }}>
                  {(s.label || "—").slice(0, 12)}
                </text>
              )}
              {/* 🔴 Der Cooldown bekommt eine MARKE, keinen Regler. Er sagt
                  „hier sitzt eine Sperrfrist" — die Zahl steht im Feld
                  darunter, weil man sie am Rad nicht genau treffen kann. */}
              {feld?.sperrfrist > 0 && (() => {
                const [mx, my] = punkt(r, r, r * 0.88, s.mitte);
                return (
                  <g pointerEvents="none">
                    <circle cx={mx} cy={my} r={8} fill={C.ink} stroke={C.sky} strokeWidth="1.5" />
                    <text x={mx} y={my} textAnchor="middle" dominantBaseline="central"
                      style={{ fontSize: "0.5625rem", fontWeight: 700, fill: C.sky }}>
                      {feld.sperrfrist}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* Griffe an den Grenzen — nur im Größen-Modus, und nur dort, wo es
            wirklich eine Grenze gibt (die 360°-Naht ist der Radanfang). */}
        {modus === "groesse" && segmente.slice(0, -1).map((s, i) => {
          const [gx, gy] = punkt(r, r, r - 1, s.bis);
          const [ix, iy] = punkt(r, r, r * NABE, s.bis);
          return (
            <g key={`grenze-${s.id}`} pointerEvents="none">
              <line x1={ix} y1={iy} x2={gx} y2={gy}
                stroke={zieht?.index === i ? C.akzent : C.text} strokeWidth={zieht?.index === i ? 3 : 1.5}
                strokeOpacity={zieht?.index === i ? 1 : 0.5} />
              <circle cx={gx} cy={gy} r={zieht?.index === i ? 7 : 5}
                fill={C.ink} stroke={zieht?.index === i ? C.akzent : C.text} strokeWidth="2" />
            </g>
          );
        })}

        {/* Beziehungen als Sehnen. ⚠️ Linien, keine Pfeile: ein Ausschluss
            gilt gegenseitig, ein Pfeil behauptete eine Richtung. */}
        {modus === "beziehung" && ausschluesse.map((x) => {
          const a = mitteVon.get(x.a);
          const b = mitteVon.get(x.b);
          if (a == null || b == null) return null;
          const ton = x.reichweite === "saison" ? C.coral
            : x.reichweite === "drehungen" ? C.bernstein : C.sky;
          return (
            <path key={`${x.a}|${x.b}`} d={sehne(r, r, r * 0.72, a, b)}
              fill="none" stroke={ton} strokeWidth="2.5" strokeOpacity={0.85}
              strokeDasharray={x.reichweite === "ereignis" ? "5 4" : undefined}
              pointerEvents="none" />
          );
        })}

        <circle cx={r} cy={r} r={r * NABE} fill={C.ink} stroke={C.line} />
      </svg>

      <div style={{ fontSize: "0.6875rem", color: C.muted, textAlign: "center", lineHeight: 1.5, maxWidth: 300 }}>
        {modus === "groesse" ? (
          <>
            Zieh eine <strong>Grenze</strong>, nicht ein Feld — die Fläche wandert zwischen
            den zwei Nachbarn, alle anderen bleiben stehen. Mit der Tastatur: Feld
            anwählen, dann ←/→.
          </>
        ) : gewaehlt ? (
          <>Tipp ein zweites Feld an, um den Ausschluss zu setzen oder wieder wegzunehmen.</>
        ) : (
          <>Erst ein Feld antippen, dann ein zweites — das ist der Ausschluss.</>
        )}
      </div>

      {modus === "beziehung" && ausschluesse.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", justifyContent: "center" }}>
          {AUSSCHLUSS_REICHWEITEN.map((rw) => {
            const n = ausschluesse.filter((x) => x.reichweite === rw.key).length;
            if (!n) return null;
            const ton = rw.key === "saison" ? C.coral : rw.key === "drehungen" ? C.bernstein : C.sky;
            return (
              <span key={rw.key} style={{ fontSize: "0.6875rem", color: C.muted, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 14, height: 2.5, background: ton, display: "inline-block" }} />
                {rw.label} ({n})
              </span>
            );
          })}
        </div>
      )}

      <div style={{ fontFamily: MONO, fontSize: "0.625rem", color: C.muted }}>
        Summe der Größen: {gesamt} · höchstens {DREHRAD_LIMITS.gewicht.max} je Feld
      </div>
    </div>
  );
}
