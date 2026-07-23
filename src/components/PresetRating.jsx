"use client";

import { useMemo } from "react";
import { ratePreset } from "@/lib/presetRating";
import { archetypeDistribution, OUTCOME_SPLIT, AVG_GOALS } from "@/lib/bundesligaStats";

const C = {
  ink2: "#12172E", surface: "#1A2040", surface2: "#232A50", line: "rgba(255,255,255,0.09)",
  text: "#EDEEF6", muted: "#8A90B4", gold: "#F5C451", coral: "#FF5470", mint: "#54E0A0",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const DIST = archetypeDistribution();
const MAX_FREQ = Math.max(...DIST.map((d) => d.freq));

// Farbe der Underdog-Neigung: favoritenfreundlich (kühl) → underdog-lastig (heiß).
function leanColor(lean) {
  return lean >= 66 ? C.coral : lean >= 45 ? C.gold : lean >= 25 ? C.mint : "#8B9BFF";
}

// Panel: reale Verteilung der Spielarten + wie „underdog-freundlich" das aktuelle
// Regelwerk damit wäre. Rechnet bei jeder Regeländerung neu (ratePreset → Engine).
export default function PresetRating({ rules }) {
  const rating = useMemo(() => ratePreset(rules), [rules]);
  const lc = leanColor(rating.underdogLean);
  const premium = rating.surprisePremium === Infinity ? "∞" : rating.surprisePremium + "×";

  return (
    <div style={{
      marginTop: 12, background: C.ink2, border: `1px solid ${C.line}`,
      borderRadius: 14, padding: "14px 16px",
    }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        So wirkt dein Regelwerk über eine Saison
      </div>

      {/* Underdog-Neigung */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Underdog-Neigung</span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: lc }}>{rating.underdogLean}/100 · {rating.label}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: C.surface, marginTop: 6, overflow: "hidden" }}>
        <div style={{ width: `${rating.underdogLean}%`, height: "100%", background: lc, transition: "width .25s" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Stat label="Überraschungs-Prämie" value={premium} hint="Außenseiter-Sieg vs. Favoritensieg" tone={C.gold} />
        <Stat label="Favoriten-Risiko" value={rating.favFlopEffect > 0 ? "−" + rating.favFlopEffect + "%" : "keins"}
          hint="Einbruch, wenn der Favorit patzt" tone={rating.favFlopEffect > 0 ? C.coral : C.muted} />
      </div>

      {/* Reale Verteilung */}
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, margin: "16px 0 8px" }}>
        So oft kommt jede Spielart real vor
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {DIST.map((d) => (
          <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, width: 128, flexShrink: 0 }}>{d.label}</span>
            <div style={{ flex: 1, height: 7, borderRadius: 999, background: C.surface, overflow: "hidden" }}>
              <div style={{ width: `${(d.freq / MAX_FREQ) * 100}%`, height: "100%", background: d.key === "aussenseiter" ? C.coral : "#4a5488" }} />
            </div>
            <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, width: 34, textAlign: "right" }}>
              {Math.round(d.freq * 100)}%
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 10.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
        Gerundete Richtwerte an realen Bundesliga-Saisons (Heim {Math.round(OUTCOME_SPLIT.heimsieg * 100)}% ·
        Remis {Math.round(OUTCOME_SPLIT.remis * 100)}% · Auswärts {Math.round(OUTCOME_SPLIT.auswaertssieg * 100)}%,
        ~{AVG_GOALS.toString().replace(".", ",")} Tore/Spiel) — kein exakter Datensatz.
        Außenseiter-Siege sind selten (~{Math.round(DIST.find((d) => d.key === "aussenseiter").freq * 100)}%),
        zahlen mit deinen Reglern aber {premium}.
      </p>
    </div>
  );
}

function Stat({ label, value, hint, tone }) {
  return (
    <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: tone, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2, lineHeight: 1.3 }}>{hint}</div>
    </div>
  );
}
