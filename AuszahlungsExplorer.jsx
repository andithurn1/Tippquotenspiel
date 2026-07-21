import { useState, useMemo } from "react";

const C = {
  ink: "#0B0E1F", ink2: "#12172E", surface: "#1A2040", surface2: "#232A50",
  line: "rgba(255,255,255,0.09)", text: "#EDEEF6", muted: "#8A90B4",
  gold: "#F5C451", coral: "#FF5470", mint: "#54E0A0",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const CS = [
  [ 11,  6.5,  6.0,  8.0,  15,  34],
  [  9,  7.5,  8.5,   13,  26,  60],
  [ 15,   12,   16,   26,  55, 130],
  [ 30,   21,   34,   60, 140, 320],
  [ 70,   41,   80,  150, 340, 700],
  [160,   96,  180,  340, 750,1500],
];
const TEAM_GOALS = { Jordanien: [2.1, 3.0, 6.0, 11, 24, 55], Spanien: [4.5, 3.0, 3.4, 5.5, 10, 22] };
const WIN = { home: 9.0, draw: 6.5, away: 1.28 };
const MARGIN = { home: [0, 7, 14, 28, 70, 180], away: [0, 2.6, 4.0, 7, 15, 38] };

// Torschützen-Quoten: anytime (1 Tor) und double (Doppelpack, 2 Tore)
const PLAYERS = {
  Jordanien: {
    "Al-Naimat": { anytime: 3.2, double: 11 }, "Olwan": { anytime: 4.1, double: 15 },
    "Al-Tamari": { anytime: 3.6, double: 13 }, "Al-Rashdan": { anytime: 5.5, double: 21 },
    "Haddad": { anytime: 7.0, double: 30 },
  },
  Spanien: {
    "Yamal": { anytime: 1.9, double: 5.5 }, "Oyarzabal": { anytime: 2.6, double: 8.0 },
    "Merino": { anytime: 3.4, double: 12 }, "Williams": { anytime: 3.0, double: 10 },
    "Olmo": { anytime: 3.8, double: 14 },
  },
};

const R = { k: 0.7, m: 0.5, minPayout: 1.0, picksPerTeam: 2, combo: { tendenz: 1.15, abstand: 1.5, exakt: 2.3 } };
const sgn = (h, a) => (h > a ? 1 : h < a ? -1 : 0);
const braceBtn = (on) => ({ fontFamily: MONO, fontSize: 11, cursor: "pointer", padding: "4px 9px", borderRadius: 999,
  background: on ? `${C.gold}22` : C.surface2, color: on ? C.gold : C.muted, border: `1px solid ${on ? C.gold + "66" : C.line}` });

function scoreOutcome(tip, r, withScorer, scorerNet) {
  const dist = Math.abs(tip.h - r.h) + Math.abs(tip.a - r.a);
  const winnerRight = sgn(tip.h, tip.a) === sgn(r.h, r.a);
  const marginRight = winnerRight && Math.abs(tip.h - tip.a) === Math.abs(r.h - r.a);
  const tendBoden = winnerRight
    ? (sgn(r.h, r.a) === 1 ? WIN.home : sgn(r.h, r.a) === -1 ? WIN.away : WIN.draw) - 1 : 0;
  const abstand = marginRight ? (sgn(r.h, r.a) === 1 ? MARGIN.home : MARGIN.away)[Math.abs(r.h - r.a)] - 1 : 0;
  const ergNaehe = Math.exp(-R.k * dist) * CS[r.h][r.a];
  const jN = Math.exp(-R.m * Math.abs(tip.h - r.h)) * TEAM_GOALS.Jordanien[r.h];
  const sN = Math.exp(-R.m * Math.abs(tip.a - r.a)) * TEAM_GOALS.Spanien[r.a];
  const teamTore = jN + sN;
  let nearParts = Math.max(ergNaehe, teamTore);
  if (nearParts < R.minPayout) nearParts = 0;
  const resultPart = Math.max(tendBoden, abstand, nearParts);
  const ebene = dist === 0 ? "exakt" : marginRight ? "abstand" : winnerRight ? "tendenz" : "keiner";
  let total = resultPart;
  if (withScorer) total = ebene === "keiner" ? resultPart + scorerNet : (resultPart + scorerNet) * R.combo[ebene];
  return { total, dist, winnerRight, ebene, parts: { tendBoden, abstand, ergNaehe, teamTore, resultPart } };
}

export default function AuszahlungsExplorer() {
  const [tip, setTip] = useState({ h: 4, a: 1 });
  const [withScorer, setWithScorer] = useState(true);
  const [aroundOnly, setAroundOnly] = useState(false);
  const [dec, setDec] = useState(false);
  const [sel, setSel] = useState({ h: 5, a: 1 });
  const [goals, setGoals] = useState({ Jordanien: ["Al-Naimat", ""], Spanien: ["Yamal", "Yamal"] });
  const [braceGoals, setBraceGoals] = useState(2); // Annahme bei Doppel-Pick: 1 oder 2 Tore

  const fmt = (q) => q == null ? "—" : q.toFixed(dec ? 2 : 1);

  // Tore auswerten: gleicher Spieler 2× = Doppelpack (double-Quote statt 2× anytime)
  const sc = useMemo(() => {
    let net = 0; const braces = [];
    for (const team of ["Jordanien", "Spanien"]) {
      const counts = {};
      for (const p of goals[team]) if (p) counts[p] = (counts[p] || 0) + 1;
      for (const [p, c] of Object.entries(counts)) {
        const P = PLAYERS[team][p];
        if (c >= 2) {
          // Beide Tipps auf einen Spieler: 2 Tore = Doppelpack-Quote, 1 Tor = Einzelquote (Floor)
          net += (braceGoals === 2 ? P.double : P.anytime) - 1;
          braces.push({ team, p, single: P.anytime, double: P.double });
        } else net += P.anytime - 1;
      }
    }
    return { net, braces };
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
  const setGoal = (team, i, v) => setGoals((prev) => ({ ...prev, [team]: prev[team].map((p, j) => (j === i ? v : p)) }));

  const heat = (v, visible) => {
    if (!visible) return { bg: C.ink2, fg: "rgba(255,255,255,0.15)", glow: "none" };
    const t = grid.max > 0 ? v / grid.max : 0; const a = 0.06 + t * 0.9;
    return { bg: `rgba(245,196,81,${a})`, fg: t > 0.45 ? C.ink : C.text, glow: t > 0.7 ? `0 0 14px rgba(245,196,81,0.5)` : "none" };
  };

  return (
    <div style={{ minHeight: "100%", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", padding: "26px 14px", display: "flex", justifyContent: "center" }}>
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
          Jordanien <span style={{ color: C.muted, fontWeight: 400 }}>vs</span> Spanien
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
            <span style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Tore (je {R.picksPerTeam} pro Team)</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: C.coral }}>Wert +{fmt(sc.net)}</span>
          </div>
          {["Jordanien", "Spanien"].map((team) => (
            <div key={team} style={{ display: "flex", gap: 6, marginBottom: team === "Jordanien" ? 8 : 0, alignItems: "center" }}>
              <span style={{ width: 34, fontSize: 10.5, color: C.muted, fontFamily: MONO }}>{team === "Jordanien" ? "JOR" : "ESP"}</span>
              {goals[team].map((p, i) => (
                <Sel key={i} team={team} value={p} fmt={fmt} onChange={(v) => setGoal(team, i, v)} />
              ))}
            </div>
          ))}
          {sc.braces.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {sc.braces.map((b, i) => (
                  <span key={i} style={{ fontFamily: MONO, fontSize: 11, color: C.gold,
                    background: `${C.gold}18`, border: `1px solid ${C.gold}55`, borderRadius: 999, padding: "3px 9px" }}>
                    ⚽ {b.p} · 1 Tor {fmt(b.single)} / 2 Tore {fmt(b.double)}
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
            <span>Zeile = Jordanien · Spalte = Spanien</span>
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
                ? `${selScore.parts.resultPart.toFixed(1)}+${sc.net.toFixed(1)}`
                : `(${selScore.parts.resultPart.toFixed(1)}+${sc.net.toFixed(1)})×${R.combo[selScore.ebene]}`)
                : selScore.parts.resultPart.toFixed(1)}
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

function Sel({ team, value, onChange, fmt }) {
  const players = PLAYERS[team];
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
