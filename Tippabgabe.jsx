import { useState } from "react";

// ── Design-Tokens (gleich wie das Abrechnungsfenster) ───────
const C = {
  ink: "#0B0E1F", ink2: "#12172E", surface: "#1A2040",
  surface2: "#232A50", line: "rgba(255,255,255,0.09)",
  text: "#EDEEF6", muted: "#8A90B4",
  gold: "#F5C451", coral: "#FF5470", mint: "#54E0A0",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

// ── Regelwerk (käme vom Admin bei Spielerstellung) ──────────
// Der Screen RENDERT aus diesem Objekt: schaltet man scorer.enabled
// aus oder picksPerTeam auf 1, ändert sich die Oberfläche mit.
const RULES = {
  markets: { result: true, scorer: { enabled: true, picksPerTeam: 2, allowBackups: true } },
  oddsMode: "snapshot",
};

// ── Snapshot-Quoten (Mock – später echter API-Call) ─────────
const MATCH = {
  home: "Jordanien", away: "Spanien", kickoff: "Sa 20:45",
  correctScore: {
    "1:0":5.5,"2:0":9,"2:1":12,"3:1":21,"4:1":41,"5:1":96,
    "1:1":7.5,"0:0":11,"3:0":15,"3:2":34,"4:2":80,"5:2":180,
  },
  players: {
    Jordanien: { "Al-Naimat":3.2, "Olwan":4.1, "Al-Tamari":3.6, "Al-Rashdan":5.5, "Haddad":7.0 },
    Spanien:   { "Yamal":1.9, "Oyarzabal":2.6, "Merino":3.4, "Williams":3.0, "Olmo":3.8 },
  },
};

const risk = (q) =>
  q == null ? { label: "—", col: C.muted }
  : q < 10 ? { label: "Solide", col: C.mint }
  : q < 40 ? { label: "Mutig", col: C.gold }
  : q < 100 ? { label: "Zocker", col: C.coral }
  : { label: "Wahnsinn", col: C.coral };

export default function Tippabgabe() {
  const [h, setH] = useState(2);
  const [a, setA] = useState(1);
  const teams = [MATCH.home, MATCH.away];
  const [picks, setPicks] = useState(
    teams.map((t) => Array.from({ length: RULES.markets.scorer.picksPerTeam }, () => ({
      main: Object.keys(MATCH.players[t])[0], backup: "",
    })))
  );
  const [done, setDone] = useState(false);

  const csKey = `${h}:${a}`;
  const csQuote = MATCH.correctScore[csKey] ?? null;
  const winner = h > a ? MATCH.home : h < a ? MATCH.away : "Unentschieden";
  const r = risk(csQuote);

  const setPick = (ti, pi, field, val) =>
    setPicks((prev) => prev.map((team, i) =>
      i !== ti ? team : team.map((p, j) => (j !== pi ? p : { ...p, [field]: val }))));

  const step = (setter, val, d) => setter(Math.max(0, Math.min(9, val + d)));

  return (
    <div style={{
      minHeight: "100%", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: 400, position: "relative",
        borderRadius: 26, overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
      }}>
        <div style={{
          position: "absolute", top: -90, left: "50%", transform: "translateX(-50%)",
          width: 320, height: 200, pointerEvents: "none",
          background: `radial-gradient(circle, ${C.gold}22 0%, transparent 70%)`,
        }} />

        {!done ? (
          <div style={{ position: "relative", padding: "26px 22px 22px" }}>
            {/* Kopf */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
                Tipp abgeben
              </span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted }}>Anpfiff {MATCH.kickoff}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>
              {MATCH.home} <span style={{ color: C.muted, fontWeight: 400 }}>vs</span> {MATCH.away}
            </div>

            {/* Ergebnis-Eingabe */}
            {RULES.markets.result && (
              <Section title="Endstand">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
                  <Stepper value={h} onStep={(d) => step(setH, h, d)} />
                  <div style={{ fontFamily: MONO, fontSize: 28, color: C.muted }}>:</div>
                  <Stepper value={a} onStep={(d) => step(setA, a, d)} />
                </div>
                <div style={{
                  marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 14px",
                }}>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: C.muted }}>Sieger: </span>
                    <span style={{ fontWeight: 600 }}>{winner}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: C.gold }}>
                      {csQuote ? `Exakt ${csQuote.toFixed(1)}` : "seltenes Ergebnis"}
                    </span>
                    <span style={{
                      fontSize: 11, color: r.col, border: `1px solid ${r.col}55`,
                      borderRadius: 999, padding: "2px 8px",
                    }}>{r.label}</span>
                  </div>
                </div>
              </Section>
            )}

            {/* Torschützen aus dem Regelwerk */}
            {RULES.markets.scorer.enabled && (
              <Section title={`Torschützen — je ${RULES.markets.scorer.picksPerTeam} pro Team`}>
                {teams.map((team, ti) => (
                  <div key={team} style={{ marginBottom: ti === 0 ? 14 : 0 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontFamily: MONO, letterSpacing: 1 }}>
                      {team.toUpperCase()}
                    </div>
                    {picks[ti].map((p, pi) => (
                      <div key={pi} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <PlayerSelect
                          flex={1.4} label={`Wahl ${pi + 1}`} value={p.main}
                          quote={MATCH.players[team][p.main]}
                          players={MATCH.players[team]}
                          onChange={(v) => setPick(ti, pi, "main", v)}
                        />
                        {RULES.markets.scorer.allowBackups && (
                          <PlayerSelect
                            flex={1} label="Backup" value={p.backup} dim
                            quote={p.backup ? MATCH.players[team][p.backup] : null}
                            players={MATCH.players[team]} allowEmpty
                            onChange={(v) => setPick(ti, pi, "backup", v)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                <p style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                  Steht deine Erstwahl ~1 h vor Anpfiff nicht in der Aufstellung, rückt der Backup automatisch nach.
                </p>
              </Section>
            )}

            {/* Snapshot-Hinweis + Absenden */}
            <div style={{
              marginTop: 20, display: "flex", gap: 8, alignItems: "flex-start",
              fontSize: 11.5, color: C.muted, lineHeight: 1.5,
            }}>
              <span style={{ color: C.gold }}>◆</span>
              <span>Snapshot-Quote: alle Mitspieler bekommen dieselbe Quote, egal wann sie tippen. Gilt bis Anpfiff.</span>
            </div>
            <button onClick={() => setDone(true)} style={{
              marginTop: 14, width: "100%", cursor: "pointer",
              background: C.gold, color: C.ink, fontWeight: 700, fontSize: 15,
              border: "none", borderRadius: 14, padding: "14px 0",
            }}>
              Tipp abgeben & Quote einfrieren
            </button>
          </div>
        ) : (
          <Confirmation
            match={MATCH} h={h} a={a} winner={winner} csQuote={csQuote}
            picks={picks} teams={teams} onEdit={() => setDone(false)}
          />
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Stepper({ value, onStep }) {
  const btn = {
    width: 34, height: 34, borderRadius: 10, cursor: "pointer",
    background: C.surface2, color: C.text, border: `1px solid ${C.line}`,
    fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <button onClick={() => onStep(1)} style={btn}>+</button>
      <div style={{
        fontFamily: MONO, fontWeight: 700, fontSize: 44, color: C.gold, width: 54, textAlign: "center",
        fontVariantNumeric: "tabular-nums", textShadow: `0 0 24px ${C.gold}44`,
      }}>{value}</div>
      <button onClick={() => onStep(-1)} style={btn}>−</button>
    </div>
  );
}

function PlayerSelect({ label, value, quote, players, onChange, allowEmpty, dim, flex }) {
  return (
    <div style={{ flex }}>
      <div style={{
        background: dim ? C.ink2 : C.surface, border: `1px solid ${C.line}`,
        borderRadius: 12, padding: "8px 10px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
          {quote != null && <span style={{ fontFamily: MONO, fontSize: 11, color: C.gold }}>{quote.toFixed(1)}</span>}
        </div>
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{
          width: "100%", background: "transparent", color: value ? C.text : C.muted,
          border: "none", fontSize: 14, outline: "none", fontFamily: "inherit",
        }}>
          {allowEmpty && <option value="" style={{ color: "#000" }}>– keiner –</option>}
          {Object.keys(players).map((p) => (
            <option key={p} value={p} style={{ color: "#000" }}>{p}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Confirmation({ match, h, a, winner, csQuote, picks, teams, onEdit }) {
  return (
    <div style={{ position: "relative", padding: "30px 22px 24px" }}>
      <div style={{
        width: 52, height: 52, borderRadius: 999, margin: "0 auto",
        background: `${C.mint}22`, border: `1px solid ${C.mint}66`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: C.mint, fontSize: 26,
      }}>✓</div>
      <div style={{ textAlign: "center", marginTop: 14, fontSize: 18, fontWeight: 700 }}>Tipp eingefroren</div>
      <div style={{ textAlign: "center", fontSize: 12.5, color: C.muted, marginTop: 4 }}>
        Quote gesichert · gilt bis Anpfiff {match.kickoff}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginTop: 20 }}>
        <Row label="Endstand" value={`${h}:${a}`} accent={C.gold} mono />
        <Row label="Sieger" value={winner} />
        <Row label="Exakt-Quote" value={csQuote ? csQuote.toFixed(1) : "seltenes Ergebnis"} mono />
        <div style={{ height: 1, background: C.line, margin: "10px 0" }} />
        {teams.map((team, ti) => (
          <div key={team} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10.5, color: C.muted, fontFamily: MONO, letterSpacing: 1, marginBottom: 4 }}>
              {team.toUpperCase()}
            </div>
            {picks[ti].map((p, pi) => (
              <div key={pi} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
                <span>{p.main}{p.backup && <span style={{ color: C.muted }}> · Backup {p.backup}</span>}</span>
                <span style={{ fontFamily: MONO, color: C.gold }}>{match.players[team][p.main].toFixed(1)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button onClick={onEdit} style={{
        marginTop: 16, width: "100%", cursor: "pointer",
        background: "transparent", color: C.text, fontWeight: 600, fontSize: 14,
        border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 0",
      }}>
        Vor Anpfiff noch bearbeiten
      </button>
    </div>
  );
}

function Row({ label, value, accent, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0" }}>
      <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
      <span style={{
        fontSize: 15, fontWeight: 600, color: accent || C.text,
        fontFamily: mono ? MONO : "inherit",
      }}>{value}</span>
    </div>
  );
}
