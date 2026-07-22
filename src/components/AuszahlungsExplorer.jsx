"use client";

import { useState, useMemo } from "react";
import { createMockOddsSource, scoreResult, scoreGoals, applyCombo, DEFAULT_RULES } from "@/lib/engine";
import BackLink from "@/components/BackLink";

const C = {
  ink: "#0B0E1F", ink2: "#12172E", surface: "#1A2040", surface2: "#232A50",
  line: "rgba(255,255,255,0.09)", text: "#EDEEF6", muted: "#8A90B4",
  gold: "#F5C451", coral: "#FF5470", mint: "#54E0A0",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

// ── Eine Quelle: Engine liefert Quoten, Regeln und Scoring ──
const RULES = DEFAULT_RULES;
const odds = createMockOddsSource();
const SNAP = odds.getSnapshot("JOR-ESP");
const SIDES = ["home", "away"];
const short = (side) => (side === "home" ? SNAP.home : SNAP.away).slice(0, 3).toUpperCase();

const braceBtn = (on) => ({ fontFamily: MONO, fontSize: 11, cursor: "pointer", padding: "4px 9px", borderRadius: 999,
  background: on ? `${C.gold}22` : C.surface2, color: on ? C.gold : C.muted, border: `1px solid ${on ? C.gold + "66" : C.line}` });

// Ein hypothetischer Endstand {h,a}: Engine wertet, Kombi-Regel obendrauf.
function scoreOutcome(tip, r, withScorer, scorerNet) {
  const res = scoreResult({ home: tip.h, away: tip.a }, { home: r.h, away: r.a }, SNAP, RULES);
  const total = withScorer ? applyCombo(res.resultPart, res.ebene, scorerNet, RULES) : res.resultPart;
  return { total, ...res };
}

export default function AuszahlungsExplorer() {
  const [tip, setTip] = useState({ h: 4, a: 1 });
  const [withScorer, setWithScorer] = useState(true);
  const [aroundOnly, setAroundOnly] = useState(false);
  const [dec, setDec] = useState(false);
  const [sel, setSel] = useState({ h: 5, a: 1 });
  const [goals, setGoals] = useState({ home: ["Al-Naimat", ""], away: ["Yamal", "Yamal"] });
  const [braceGoals, setBraceGoals] = useState(2); // Annahme bei Doppel-Pick: 1 oder 2 Tore

  const fmt = (q) => q == null ? "—" : q.toFixed(dec ? 2 : 1);

  // Tore über die Engine auswerten. braceGoals=1 simuliert "trifft nur einmal"
  // über hypothetische Torschützen-Daten (jeder Pick trifft genau 1×).
  const sc = useMemo(() => {
    const assumed = braceGoals === 1
      ? Object.fromEntries(SIDES.flatMap((s) => goals[s].filter(Boolean).map((p) => [p, 1])))
      : null; // null = Engine nimmt an: jeder trifft, Doppel-Pick trifft 2×
    const { net, detail } = scoreGoals(goals, SNAP, RULES, assumed);
    return { net, braces: detail.filter((d) => d.type === "double") };
  }, [goals, braceGoals]);

  const grid = useMemo(() => {
    const cells = []; let max = 0;
    for (let h = 0; h <= 5; h++) for (let a = 0; a <= 5; a++) {
      const s = scoreOutcome(tip, { h, a }, withScorer, sc.net);
      const near = Math.abs(tip.h - h) + Math.abs(tip.a - a) <= 2;
      if (!aroundOnly || near) max = Math.max(max, s.total);
      cells.push({ h, a, s, near });
    }
    return { cells, max };
  }, [tip, withScorer, aroundOnly, sc.net]);

  const selScore = scoreOutcome(tip, sel, withScorer, sc.net);
  const step = (key, d) => setTip((t) => ({ ...t, [key]: Math.max(0, Math.min(5, t[key] + d)) }));
  const setGoal = (side, i, v) => setGoals((prev) => ({ ...prev, [side]: prev[side].map((p, j) => (j === i ? v : p)) }));

  const heat = (v, visible) => {
    if (!visible) return { bg: C.ink2, fg: "rgba(255,255,255,0.15)", glow: "none" };
    const t = grid.max > 0 ? v / grid.max : 0; const a = 0.06 + t * 0.9;
    return { bg: `rgba(245,196,81,${a})`, fg: t > 0.45 ? C.ink : C.text, glow: t > 0.7 ? `0 0 14px rgba(245,196,81,0.5)` : "none" };
  };

  return (
    <div style={{ minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", padding: "26px 14px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <BackLink />
      <div style={{ width: "100%", maxWidth: 400, borderRadius: 24, position: "relative", overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)", padding: "22px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>Ergebnis-Auszahlung</span>
          <button onClick={() => setDec((v) => !v)} style={{ fontFamily: MONO, fontSize: 11, cursor: "pointer",
            color: dec ? C.gold : C.muted, background: C.surface, border: `1px solid ${dec ? C.gold + "66" : C.line}`, borderRadius: 999, padding: "4px 10px" }}>
            Quoten {dec ? "1.xx" : "1.x"}
          </button>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>
          {SNAP.home} <span style={{ color: C.muted, fontWeight: 400 }}>vs</span> {SNAP.away}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Mein Tipp</span>
          <Mini value={tip.h} onStep={(d) => step("h", d)} />
          <span style={{ fontFamily: MONO, color: C.muted }}>:</span>
          <Mini value={tip.a} onStep={(d) => step("a", d)} />
        </div>

        {/* Tore (gleicher Spieler 2× = Doppelpack) */}
        <div style={{ marginTop: 14, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Tore (je {RULES.markets.goals.picksPerTeam} pro Team)</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.coral }}>Wert +{fmt(sc.net)}</span>
          </div>
          {SIDES.map((side) => (
            <div key={side} style={{ display: "flex", gap: 6, marginBottom: side === "home" ? 8 : 0, alignItems: "center" }}>
              <span style={{ width: 34, fontSize: 10.5, color: C.muted, fontFamily: MONO }}>{short(side)}</span>
              {goals[side].map((p, i) => (
                <Sel key={i} side={side} value={p} fmt={fmt} onChange={(v) => setGoal(side, i, v)} />
              ))}
            </div>
          ))}
          {sc.braces.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {sc.braces.map((b, i) => (
                  <span key={i} style={{ fontFamily: MONO, fontSize: 11, color: C.gold,
                    background: `${C.gold}18`, border: `1px solid ${C.gold}55`, borderRadius: 999, padding: "3px 9px" }}>
                    ⚽ {b.player} · 1 Tor {fmt(b.single)} / 2 Tore {fmt(b.double)}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: C.muted }}>angenommen:</span>
                <button onClick={() => setBraceGoals(1)} style={braceBtn(braceGoals === 1)}>1 Tor</button>
                <button onClick={() => setBraceGoals(2)} style={braceBtn(braceGoals === 2)}>2 Tore</button>
              </div>
            </div>
          )}
          <p style={{ fontSize: 10.5, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
            Denselben Spieler zweimal = beide Tipps auf ihn. Trifft er zweifach, zählt die Doppelpack-Quote; trifft er nur einmal, immer noch die Einzelquote.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Toggle on={withScorer} onClick={() => setWithScorer((v) => !v)} label={withScorer ? "mit Toren" : "ohne Tore"} tone={C.coral} />
          <Toggle on={aroundOnly} onClick={() => setAroundOnly((v) => !v)} label={aroundOnly ? "nur rund um Tipp" : "alle Ergebnisse"} tone={C.mint} />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 4, marginLeft: 22, marginBottom: 4 }}>
            {[0,1,2,3,4,5].map((a) => (<div key={a} style={{ flex: 1, textAlign: "center", fontSize: 10, color: C.muted, fontFamily: MONO }}>{a}</div>))}
          </div>
          {[0,1,2,3,4,5].map((h) => (
            <div key={h} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
              <div style={{ width: 18, textAlign: "center", fontSize: 10, color: C.muted, fontFamily: MONO }}>{h}</div>
              {[0,1,2,3,4,5].map((a) => {
                const cell = grid.cells[h * 6 + a];
                const visible = !aroundOnly || cell.near;
                const isTip = tip.h === h && tip.a === a; const isSel = sel.h === h && sel.a === a;
                const hz = heat(cell.s.total, visible);
                return (
                  <button key={a} onClick={() => setSel({ h, a })} style={{
                    flex: 1, aspectRatio: "1", minWidth: 0, cursor: "pointer", borderRadius: 8,
                    background: hz.bg, color: hz.fg, boxShadow: hz.glow,
                    border: isSel ? `2px solid ${C.mint}` : isTip ? `2px solid ${C.text}` : `1px solid ${C.line}`,
                    fontFamily: MONO, fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                    {visible ? Math.round(cell.s.total) : ""}
                  </button>
                );
              })}
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10.5, color: C.muted }}>
            <span><span style={{ color: C.text }}>▢</span> dein Tipp</span>
            <span>Zeile = {SNAP.home} · Spalte = {SNAP.away}</span>
          </div>
        </div>

        <div style={{ marginTop: 16, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 13, color: C.muted }}>
              Wenn es <b style={{ color: C.text, fontFamily: MONO }}>{sel.h}:{sel.a}</b> würde
              {!selScore.winnerRight && <span style={{ color: C.coral }}> · Sieger falsch</span>}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 700, color: C.gold, textShadow: `0 0 20px ${C.gold}44` }}>{Math.round(selScore.total)}</div>
          </div>
          <div style={{ height: 1, background: C.line, margin: "12px 0" }} />
          <BreakLine label="Tendenz (Sieger)" v={selScore.parts.tendBoden} won={selScore.ebene === "tendenz"} />
          <BreakLine label="Abstand / Handicap" v={selScore.parts.abstand} won={selScore.ebene === "abstand"} />
          <BreakLine label="Ergebnis-Nähe" v={selScore.parts.ergNaehe} won={selScore.ebene === "exakt"} />
          <BreakLine label="Team-Tore-Nähe (siegerunabh.)" v={selScore.parts.teamTore} won={!selScore.winnerRight} />
          <div style={{ height: 1, background: C.line, margin: "10px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span style={{ color: C.muted }}>gewertet{withScorer ? " + Tore × Kombi" : ""}</span>
            <span style={{ fontFamily: MONO, color: C.text }}>
              {withScorer ? (selScore.ebene === "keiner"
                ? `${selScore.resultPart.toFixed(1)}+${sc.net.toFixed(1)}`
                : `(${selScore.resultPart.toFixed(1)}+${sc.net.toFixed(1)})×${RULES.combo[selScore.ebene]}`)
                : selScore.resultPart.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({ value, onStep }) {
  const b = { width: 26, height: 26, borderRadius: 7, cursor: "pointer", background: C.surface2, color: C.text, border: `1px solid ${C.line}`, fontSize: 16, lineHeight: 1 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={() => onStep(-1)} style={b}>−</button>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 20, color: C.gold, width: 20, textAlign: "center" }}>{value}</div>
      <button onClick={() => onStep(1)} style={b}>+</button>
    </div>
  );
}

function Sel({ side, value, onChange, fmt }) {
  const players = SNAP.players[side];
  return (
    <div style={{ flex: 1, background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 10, padding: "6px 8px", minWidth: 0 }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        width: "100%", background: "transparent", color: value ? C.text : C.muted, border: "none", fontSize: 12.5, outline: "none", fontFamily: "inherit" }}>
        <option value="" style={{ color: "#000" }}>– keiner –</option>
        {Object.keys(players).map((p) => (<option key={p} value={p} style={{ color: "#000" }}>{p} ({fmt(players[p].anytime)})</option>))}
      </select>
    </div>
  );
}

function Toggle({ on, onClick, label, tone }) {
  return (
    <button onClick={onClick} style={{ flex: 1, cursor: "pointer", fontSize: 12, fontFamily: MONO, padding: "9px 0", borderRadius: 999,
      background: on ? `${tone}22` : C.surface, color: on ? tone : C.muted, border: `1px solid ${on ? tone + "66" : C.line}` }}>{label}</button>
  );
}

function BreakLine({ label, v, won }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12.5 }}>
      <span style={{ color: won ? C.gold : C.muted }}>{won ? "→ " : ""}{label}</span>
      <span style={{ fontFamily: MONO, color: won ? C.gold : C.muted, fontVariantNumeric: "tabular-nums" }}>{v >= 0.05 ? "+" + v.toFixed(1) : "—"}</span>
    </div>
  );
}
