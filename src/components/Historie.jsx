"use client";

import { useEffect, useMemo, useState } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { DEFAULT_RULES, scoreLeaderboardHistory, scoreTip } from "@/lib/engine";
import { computeRecords, matchdayDeltas } from "@/lib/records";
import { PRESETS } from "@/lib/presets";
import { C, MONO, SERIES } from "@/lib/theme";


// Serien-Farben (bewusst gut unterscheidbare Farbtöne, hell auf dunklem Grund).
const SERIE = ["#F5C451", "#54E0A0", "#FF5470", "#4FD1E8", "#A78BFA", "#FF9F43", "#F368E0", "#B4E04F"];

// Die umstellbaren Kriterien für den Plot.
const KRITERIEN = [
  { key: "punkte", label: "Punkte", invert: false, help: "Kumulierte Punkte über die Spieltage." },
  { key: "rang", label: "Rang", invert: true, help: "Platzierung je Spieltag (oben = besser)." },
  { key: "spieltag", label: "Punkte/Spieltag", invert: false, help: "Nur die Punkte des jeweiligen Spieltags." },
];

// Baut aus dem Verlauf die Serien für ein Kriterium.
function buildSeries(history, kriterium) {
  const letzte = history[history.length - 1]?.board ?? [];
  const players = [...letzte].sort((a, b) => a.name.localeCompare(b.name))
    .map((b, i) => ({ userId: b.userId, name: b.name, color: SERIES[i % SERIES.length] }));
  const deltas = kriterium === "spieltag" ? matchdayDeltas(history) : null;

  const mds = history.map((h) => h.matchday);
  const data = new Map(players.map((p) => [p.userId, []]));
  history.forEach((h, i) => {
    for (const p of players) {
      const row = h.board.find((b) => b.userId === p.userId);
      let y = null;
      if (row) {
        if (kriterium === "punkte") y = row.total;
        else if (kriterium === "rang") y = row.rank;
        else y = deltas[i].perUser.get(p.userId)?.delta ?? 0;
      }
      if (y != null) data.get(p.userId).push({ md: h.matchday, y });
    }
  });
  const alle = [...data.values()].flat().map((d) => d.y);
  return { players, mds, data, yMin: Math.min(...alle, 0), yMax: Math.max(...alle, 1) };
}

// Reiner SVG-Liniengraph (keine Fremd-Bibliothek, passt zum Inline-Style-Ansatz).
function Plot({ series, invert, meId }) {
  const W = 320, H = 200, padL = 30, padR = 8, padT = 12, padB = 22;
  const { players, mds, data, yMin, yMax } = series;
  if (!mds.length) return null;
  const xOf = (md) => {
    const i = mds.indexOf(md);
    return mds.length === 1 ? padL + (W - padL - padR) / 2 : padL + (i / (mds.length - 1)) * (W - padL - padR);
  };
  const span = (yMax - yMin) || 1;
  const yOf = (v) => {
    const t = (v - yMin) / span;                    // 0..1
    const tt = invert ? t : 1 - t;                  // Rang: kleiner Wert = oben
    return padT + tt * (H - padT - padB);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
      aria-label="Verlauf je Spieltag">
      {/* Achsen */}
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke={C.line} strokeWidth="1" />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke={C.line} strokeWidth="1" />
      {/* Y-Endwerte */}
      <text x={padL - 4} y={padT + 4} textAnchor="end" fontSize="8" fill={C.muted} fontFamily={MONO}>
        {invert ? Math.round(yMin) : Math.round(yMax)}
      </text>
      <text x={padL - 4} y={H - padB} textAnchor="end" fontSize="8" fill={C.muted} fontFamily={MONO}>
        {invert ? Math.round(yMax) : Math.round(yMin)}
      </text>
      {/* X-Beschriftung */}
      {mds.map((md) => (
        <text key={md} x={xOf(md)} y={H - padB + 12} textAnchor="middle" fontSize="8" fill={C.muted} fontFamily={MONO}>{md}</text>
      ))}
      {/* Serien */}
      {players.map((p) => {
        const pts = data.get(p.userId);
        if (!pts.length) return null;
        const d = pts.map((pt, i) => `${i === 0 ? "M" : "L"} ${xOf(pt.md).toFixed(1)} ${yOf(pt.y).toFixed(1)}`).join(" ");
        const ich = p.userId === meId;
        return (
          <g key={p.userId}>
            <path d={d} fill="none" stroke={p.color} strokeWidth={ich ? 3 : 1.5}
              opacity={ich ? 1 : 0.85} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((pt) => (
              <circle key={pt.md} cx={xOf(pt.md)} cy={yOf(pt.y)} r={ich ? 3 : 2} fill={p.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default function Historie() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const meId = user?.id ?? null;
  const [entries, setEntries] = useState(null);
  const [roundRules, setRoundRules] = useState(DEFAULT_RULES);
  const [presetKey, setPresetKey] = useState("aktuell");
  const [kriterium, setKriterium] = useState("punkte");

  useEffect(() => {
    let live = true;
    Promise.all([getStore().getRoundEntries(roundId), getStore().getRound(roundId)]).then(([es, round]) => {
      if (!live) return;
      setEntries(es);
      setRoundRules(round?.rules ?? DEFAULT_RULES);
    }).catch(() => { if (live) setEntries([]); });
    return () => { live = false; };
  }, [roundId]);

  // Preset-Optionen: die echte Runde + die benannten Presets (zum Durchrechnen).
  const optionen = useMemo(() => [
    { key: "aktuell", label: "Diese Runde", rules: roundRules },
    ...PRESETS.map((p) => ({ key: p.key, label: p.label, rules: p.rules })),
  ], [roundRules]);
  const gewaehlt = optionen.find((o) => o.key === presetKey) ?? optionen[0];

  // Alles unter dem gewählten Regelwerk neu berechnen — die Runde selbst bleibt
  // unberührt, das hier ist reine „was wäre gewesen"-Ansicht.
  const { history, records } = useMemo(() => {
    if (!entries?.length) return { history: [], records: [] };
    const rules = gewaehlt.rules;
    const history = scoreLeaderboardHistory(entries, rules);
    const scored = entries.filter((e) => e.result).map((e) => {
      const s = scoreTip(e.tip, e.result, e.snapshot, rules);
      return { userId: e.userId, name: e.name, matchday: e.matchday, total: s.total, ebene: s.ebene };
    });
    return { history, records: computeRecords(history, scored) };
  }, [entries, gewaehlt]);

  const series = useMemo(() => buildSeries(history, kriterium), [history, kriterium]);
  const kritInfo = KRITERIEN.find((k) => k.key === kriterium);
  const wasWaere = presetKey !== "aktuell";

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <BackLink href="/hub" label="Tippspiel" />
        <h1 style={{ fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase", margin: "18px 0 14px" }}>
          Historie &amp; Rekorde
        </h1>

        {entries == null && <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted }}>lädt …</div>}
        {entries?.length === 0 && (
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
            Noch keine gewerteten Spieltage — sobald Ergebnisse feststehen, erscheinen hier
            Rekorde und Verlauf.
          </div>
        )}

        {history.length > 0 && (
          <>
            {/* Rekorde */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              {records.map((r) => (
                <div key={r.key} style={{
                  background: C.ink2, border: `1px solid ${r.holder.userId === meId ? C.gold + "55" : C.line}`,
                  borderRadius: 14, padding: "11px 13px",
                }}>
                  <div style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                    {r.emoji} {r.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: r.holder.userId === meId ? C.gold : C.text }}>
                    {r.holder.name}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginTop: 1 }}>
                    {r.value} {r.einheit}
                  </div>
                </div>
              ))}
            </div>

            {/* Preset-Vergleich */}
            <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 }}>
              Wertung nach Regelwerk
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {optionen.map((o) => {
                const on = o.key === presetKey;
                return (
                  <button key={o.key} onClick={() => setPresetKey(o.key)} style={{
                    cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                    padding: "7px 12px", borderRadius: 999,
                    background: on ? `${C.gold}22` : C.surface, color: on ? C.gold : C.muted,
                    border: `1px solid ${on ? C.gold + "77" : C.line}`,
                  }}>{o.label}</button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: wasWaere ? C.gold : C.muted, margin: "0 0 16px", lineHeight: 1.4 }}>
              {wasWaere
                ? `„Was wäre gewesen" mit Preset „${gewaehlt.label}" — nur zur Inspiration, die Runde bleibt unverändert gewertet.`
                : "Die echte Wertung dieser Runde. Wähle ein Preset, um zu sehen, was mit anderen Regeln herausgekommen wäre."}
            </p>

            {/* Kriterien-Umschalter */}
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              {KRITERIEN.map((k) => {
                const on = k.key === kriterium;
                return (
                  <button key={k.key} onClick={() => setKriterium(k.key)} style={{
                    flex: 1, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                    padding: "8px 0", borderRadius: 10,
                    background: on ? `${C.mint}22` : C.surface, color: on ? C.mint : C.muted,
                    border: `1px solid ${on ? C.mint + "66" : C.line}`,
                  }}>{k.label}</button>
                );
              })}
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 8 }}>{kritInfo.help}</div>

            {/* Plot */}
            <div style={{ background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 16, padding: "12px 12px 8px" }}>
              <Plot series={series} invert={kritInfo.invert} meId={meId} />
              {/* Legende */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: 8 }}>
                {series.players.map((p) => (
                  <span key={p.userId} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: p.userId === meId ? C.text : C.muted }}>
                    <span style={{ width: 10, height: 3, borderRadius: 2, background: p.color, display: "inline-block" }} />
                    {p.name}{p.userId === meId ? " (du)" : ""}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
