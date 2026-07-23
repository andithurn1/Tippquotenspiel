"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";

const C = {
  ink: "#0B0E1F", ink2: "#12172E", surface: "#1A2040", surface2: "#232A50",
  line: "rgba(255,255,255,0.09)", text: "#EDEEF6", muted: "#8A90B4",
  gold: "#F5C451", coral: "#FF5470", mint: "#54E0A0",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

// Schlankes, echtes Ranking für die aktive Runde — im Unterschied zu
// Abrechnung.jsx (feste JOR-ESP-Demo-Choreographie) funktioniert das hier für
// jede Runde und jedes Match, weil es nur getLeaderboard(roundId) anzeigt.
export default function Ranking() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [board, setBoard] = useState(null);
  const [roundName, setRoundName] = useState(null);

  useEffect(() => {
    let live = true;
    getStore().getLeaderboard(roundId).then((b) => { if (live) setBoard(b); }).catch(() => { if (live) setBoard([]); });
    getStore().getRound(roundId).then((r) => { if (live) setRoundName(r?.name ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [roundId]);

  const meId = user?.id ?? null;

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/hub" label="Tippspiel" />
      <div style={{
        width: "100%", maxWidth: 400, position: "relative",
        borderRadius: 26, overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
      }}>
        <div style={{ position: "relative", padding: "26px 22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
              Ranking
            </span>
            <Link href="/ranking/verlauf" style={{ fontFamily: MONO, fontSize: 12, color: C.mint, textDecoration: "none" }}>
              Verlauf →
            </Link>
          </div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>{roundName ?? "…"}</div>

          <div style={{ marginTop: 20 }}>
            {board == null ? (
              <div style={{ fontSize: 12.5, color: C.muted, fontFamily: MONO, padding: "8px 0" }}>Tabelle lädt …</div>
            ) : board.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.muted, padding: "8px 0" }}>Noch keine gewerteten Tipps in dieser Runde.</div>
            ) : board.map((b, i) => (
              <div key={b.userId} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
                borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
              }}>
                <span style={{ fontFamily: MONO, fontSize: 13, color: C.muted, width: 20 }}>{b.rank}</span>
                <span style={{ flex: 1, fontSize: 15, color: b.userId === meId ? C.gold : C.text, fontWeight: b.userId === meId ? 700 : 400 }}>
                  {b.name}
                  {b.userId === meId && <span style={{ color: C.coral, fontSize: 11, marginLeft: 6 }}>● du</span>}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>{b.gewertet}/{b.tips}</span>
                <span style={{
                  fontFamily: MONO, fontSize: 15, fontVariantNumeric: "tabular-nums", minWidth: 44, textAlign: "right",
                  color: b.total < 0 ? C.coral : C.text,
                }}>{b.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
