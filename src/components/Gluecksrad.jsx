"use client";

import { useEffect, useRef, useState } from "react";
import { C, SERIES, MONO } from "@/lib/theme";
import { segmente as segmenteVon, zielWinkel } from "@/lib/radGeometrie";

// ── Das Glücksrad als SVG (design/drehrad.md 3c) ────────────
//
// 🔴 Prozedural, keine vorgerenderten Clips. Die Begründung steht in der Spec
// und ist keine Geschmacksfrage: der Admin schreibt die Feldtabelle selbst —
// Anzahl, Beschriftung, Gewicht sind frei. Es bräuchte also einen Clip je
// (Rad-Konfiguration × Ausgang), und ein Clip backt den Text ein. Eine
// geänderte Beschriftung machte jeden Clip dieses Rades veraltet, und man
// merkte es erst, wenn ein Spieler ein Rad sieht, das es so nicht mehr gibt.
//
// 🔴 **Die Fläche IST die Wahrscheinlichkeit.** Der Segmentwinkel ist
// `anteil × 360°` — und `anteil` kommt aus `wahrscheinlichkeiten()`
// (drehrad.js), also aus derselben Zahl, mit der auch gezogen wird. Keine
// zweite Wahrheit über die Feldgrößen. Gleich große Segmente bei ungleichen
// Gewichten wären eine falsche Anzeige, und eine Prozentangabe daneben heilt
// das nicht — die liest nur, wer ohnehin misstraut.
//
// 🔴 **Die Animation ist nie die Wahrheit.** Der Ausgang steht vor der
// Drehung fest (drehrad.md 2.5: gezogen beim Öffnen des Spieltags,
// deterministisch). Ein Neuladen mitten in der Drehung zeigt dasselbe
// Ergebnis, wer sie überspringt, verliert nichts — und
// `prefers-reduced-motion` schaltet sie ganz ab, dann steht das Ergebnis
// einfach da.
//
// ⚠️ Felder mit Anteil 0 werden NICHT gezeichnet. Ein Feld mit Gewicht 0
// fällt nie (drehrad.md 4.1); als hauchdünner Strich im Rad zu erscheinen
// wäre die Behauptung, es könnte doch drankommen.

// ⚠️ Die WINKEL rechnet `src/lib/radGeometrie.js`, nicht diese Datei
// (Architektur-Regel 1: Logik gehört nicht in die Haut). Dort ist auch
// nachgeprüft, dass unter dem Zeiger wirklich das gezogene Feld landet und
// nicht der Nachbar — hier steht nur, wie es aussieht.
const DAUER_MS = 3200;

// Punkt auf dem Kreis. 0° zeigt nach OBEN (dort steht der Zeiger), im
// Uhrzeigersinn wachsend — sonst müsste jeder Aufrufer im Kopf um 90° drehen.
function punkt(cx, cy, r, grad) {
  const rad = ((grad - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function segmentPfad(cx, cy, r, vonGrad, bisGrad) {
  // Ein Segment über (fast) 360° lässt sich als Kreisbogen nicht zeichnen —
  // Start- und Endpunkt fielen zusammen und der Pfad bliebe leer. Bei einem
  // einzigen Feld ist der volle Kreis gemeint, also zwei Halbbögen.
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

export default function Gluecksrad({ felder = [], anteile = [], ergebnisId = null, groesse = 240 }) {
  const [winkel, setWinkel] = useState(0);
  const [dreht, setDreht] = useState(false);
  const letztesErgebnis = useRef(null);

  // Segmente (inkl. „Felder ohne Größe fallen heraus") kommen aus dem
  // geprüften Modul; hier kommt nur die Farbe dazu.
  const segmente = segmenteVon(felder, anteile)
    .map((s, i) => ({ ...s, farbe: SERIES[i % SERIES.length] }));

  const ziel = segmente.find((s) => s.id === ergebnisId) ?? null;
  const ohneGroesse = felder.length - segmente.length;

  useEffect(() => {
    if (!ziel || letztesErgebnis.current === ergebnisId) return;
    letztesErgebnis.current = ergebnisId;

    // Wer weniger Bewegung will, bekommt das Ergebnis sofort — ohne Drehung,
    // ohne Verzögerung. Die Animation trägt keine Information.
    const reduziert = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    setDreht(!reduziert);
    setWinkel(zielWinkel(ziel, { reduziert }));
    if (reduziert) return;
    const t = setTimeout(() => setDreht(false), DAUER_MS);
    return () => clearTimeout(t);
  }, [ergebnisId, ziel]);

  if (!segmente.length) {
    return (
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.45, padding: "10px 0" }}>
        Noch kein Feld mit einer Größe über null — ein Rad braucht mindestens zwei,
        auf die es überhaupt fallen kann.
      </div>
    );
  }

  const r = groesse / 2;
  const beschriftungsRadius = r * 0.66;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: groesse, height: groesse + 12 }}>
        {/* Der Zeiger steht FEST oben und dreht sich nicht mit — sonst wüsste
            niemand, wo abgelesen wird. */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0, zIndex: 2,
          borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
          borderTop: `14px solid ${C.text}`,
        }} />
        <svg
          width={groesse} height={groesse} viewBox={`0 0 ${groesse} ${groesse}`}
          style={{
            position: "absolute", top: 12, left: 0,
            transform: `rotate(${winkel}deg)`,
            transformOrigin: "50% 50%",
            transition: dreht ? `transform ${DAUER_MS}ms cubic-bezier(0.17, 0.67, 0.2, 1)` : "none",
          }}
        >
          {segmente.map((s) => {
            const [tx, ty] = punkt(r, r, beschriftungsRadius, s.mitte);
            // Schmale Segmente bekommen keine Beschriftung ins Rad — sie wäre
            // unlesbar und überlappte die Nachbarn. Die Liste darunter nennt
            // sie ohnehin vollständig.
            const beschriften = s.bis - s.von >= 24;
            return (
              <g key={s.id}>
                <path d={segmentPfad(r, r, r - 1, s.von, s.bis)}
                  fill={s.farbe} fillOpacity={0.82} stroke={C.ink} strokeWidth="1.5" />
                {beschriften && (
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${s.mitte} ${tx} ${ty})`}
                    style={{ fontSize: 11, fontWeight: 700, fill: C.ink, pointerEvents: "none" }}>
                    {(s.label || "—").slice(0, 14)}
                  </text>
                )}
              </g>
            );
          })}
          <circle cx={r} cy={r} r={r * 0.12} fill={C.ink} stroke={C.line} />
        </svg>
      </div>

      {ziel && (
        <div style={{ fontFamily: MONO, fontSize: 13, color: C.akzent, fontWeight: 700 }}>
          {ziel.label || "—"}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.45, maxWidth: 260 }}>
        Die Fläche eines Feldes ist seine Wahrscheinlichkeit.
        {ohneGroesse > 0 && (ohneGroesse === 1
          ? " Ein Feld ohne Größe fehlt hier — darauf kann das Rad nicht fallen."
          : ` ${ohneGroesse} Felder ohne Größe fehlen hier — darauf kann das Rad nicht fallen.`)}
      </div>
    </div>
  );
}
