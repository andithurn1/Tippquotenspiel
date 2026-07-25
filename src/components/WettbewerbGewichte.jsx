"use client";

import { useEffect, useState, useMemo } from "react";
import { C, MONO } from "@/lib/theme";
import { getStore } from "@/lib/store";
import { WETTBEWERBE, wettbewerbeIn } from "@/lib/wettbewerbe";
import {
  WETTBEWERB_LIMITS, sanitizeWettbewerbe, anteile, anteilHinweis, beschreibeWettbewerbe,
} from "@/lib/wettbewerbGewicht";

// ── Wettbewerbs-Gewichte ────────────────────────────────────
// Der Regler allein wäre irreführend: „CL ×1,5" klingt nach doppelt so
// wichtig, ist bei 144 gegen 306 Spielen aber weiterhin die kleinere Hälfte.
// Deshalb steht unter jedem Regler der RESULTIERENDE Anteil — und daneben,
// wie er ohne Gewichte aussähe.
export default function WettbewerbGewichte({ rules, onChange }) {
  const cfg = sanitizeWettbewerbe(rules?.wettbewerbe);
  const [matches, setMatches] = useState(null);

  useEffect(() => {
    let live = true;
    getStore().listMatches()
      .then((ms) => { if (live) setMatches(ms); })
      .catch(() => { if (live) setMatches([]); });
    return () => { live = false; };
  }, []);

  const vorhanden = useMemo(() => wettbewerbeIn(matches ?? []), [matches]);
  const liste = useMemo(
    () => anteile(matches ?? [], { ...rules, wettbewerbe: cfg }),
    [matches, rules, cfg]);
  const hinweis = anteilHinweis(liste);

  const setze = (naechste) => onChange(sanitizeWettbewerbe(naechste));
  const setzeAufschlag = (key, v) =>
    setze({ ...cfg, enabled: true, aufschlaege: { ...cfg.aufschlaege, [key]: v } });

  // Nur Wettbewerbe anbieten, die es in dieser Runde überhaupt gibt — sonst
  // stellt jemand die Premier League ein, die gar nicht gespielt wird.
  const waehlbar = vorhanden.length ? vorhanden : WETTBEWERBE.filter((w) => w.key !== "demo");

  return (
    <div>
      <p style={{ fontSize: 11.5, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
        Ein Champions-League-Halbfinale darf mehr zählen als ein Ligaspiel. Der
        Aufschlag fließt in <strong>denselben Topf</strong> wie Derby und Big Game —
        addiert, nicht multipliziert, und vom Deckel begrenzt.
      </p>

      {waehlbar.length < 2 && (
        <p style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          In dieser Runde läuft nur ein Wettbewerb — Gewichte lohnen sich erst,
          wenn mehrere zusammenkommen.
        </p>
      )}

      {waehlbar.map((w) => {
        const auf = cfg.aufschlaege[w.key] ?? 0;
        const a = liste.find((x) => x.key === w.key);
        return (
          <div key={w.key} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{w.label}</span>
              <span style={{ fontFamily: MONO, fontSize: 13, color: auf > 0 ? C.gold : C.muted }}>
                ×{(1 + auf).toFixed(2)}
              </span>
            </div>
            <input type="range" value={auf}
              min={WETTBEWERB_LIMITS.aufschlag.min} max={WETTBEWERB_LIMITS.aufschlag.max}
              step={WETTBEWERB_LIMITS.aufschlag.step}
              onChange={(e) => setzeAufschlag(w.key, +e.target.value)}
              style={{ width: "100%", accentColor: C.gold, cursor: "pointer" }} />

            {/* Das Entscheidende: was am Ende herauskommt. */}
            {a && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 999, background: C.surface2, overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.round(a.anteil * 100)}%`, height: "100%",
                    background: auf > 0 ? C.gold : C.sky, borderRadius: 999,
                  }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.text, minWidth: 92, textAlign: "right" }}>
                  {Math.round(a.anteil * 100)} % der Wertung
                </span>
              </div>
            )}
            {a && (
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>
                {a.spiele} {a.spiele === 1 ? "Spiel" : "Spiele"} · ohne Gewichte wären es {Math.round(a.anteilRoh * 100)} %
              </div>
            )}
          </div>
        );
      })}

      {/* Eine Stufe statt vier Reglern — steigt mit PHASE[...].rang */}
      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12, marginTop: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Je K.-o.-Runde zusätzlich</span>
          <span style={{ fontFamily: MONO, fontSize: 13, color: cfg.phasenStufe > 0 ? C.gold : C.muted }}>
            +{cfg.phasenStufe.toFixed(2)}
          </span>
        </div>
        <input type="range" value={cfg.phasenStufe}
          min={WETTBEWERB_LIMITS.phasenStufe.min} max={WETTBEWERB_LIMITS.phasenStufe.max}
          step={WETTBEWERB_LIMITS.phasenStufe.step}
          onChange={(e) => setze({ ...cfg, enabled: true, phasenStufe: +e.target.value })}
          style={{ width: "100%", accentColor: C.gold, cursor: "pointer" }} />
        <p style={{ fontSize: 10.5, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>
          Achtelfinale +{cfg.phasenStufe.toFixed(2)}, Viertelfinale +{(cfg.phasenStufe * 2).toFixed(2)},
          Halbfinale +{(cfg.phasenStufe * 3).toFixed(2)}, Finale +{(cfg.phasenStufe * 4).toFixed(2)} —
          ein Regler statt vier.
        </p>
      </div>

      {hinweis && (
        <div style={{
          background: `${C.gold}12`, border: `1px solid ${C.gold}55`, borderRadius: 12,
          padding: "10px 12px", marginTop: 12, fontSize: 11.5, color: C.text, lineHeight: 1.5,
        }}>
          {hinweis}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.45 }}>
        {beschreibeWettbewerbe({ ...rules, wettbewerbe: cfg })}
      </div>
    </div>
  );
}
