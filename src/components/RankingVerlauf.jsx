"use client";

import { useState, useEffect } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";

// Ranking-Verlauf: kumulativer Zwischenstand je Spieltag (getLeaderboardHistory
// in der Engine/Store). Keine gespeicherte Historie — wird aus den vorhandenen
// Tipps + Match-Spieltagen live nachgerechnet, ist also immer konsistent mit
// dem aktuellen Ranking.
export default function RankingVerlauf() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [history, setHistory] = useState(null);

  useEffect(() => {
    let live = true;
    getStore().getLeaderboardHistory(roundId).then((h) => { if (live) setHistory(h); }).catch(() => { if (live) setHistory([]); });
    return () => { live = false; };
  }, [roundId]);

  const meId = user?.id ?? null;

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/hub" label="Tippspiel" />
      <div style={{ width: "100%", maxWidth: "var(--tqs-schirm-breite)" }}>
        <span style={{ fontFamily: MONO, fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Ranking-Verlauf
        </span>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "8px 0 18px" }}>Dein Rang über die Spieltage</h1>

        {history == null && <div style={{ fontFamily: MONO, fontSize: "0.8125rem", color: C.muted }}>Verlauf lädt …</div>}
        {history?.length === 0 && (
          <div style={{ fontSize: "0.8125rem", color: C.muted }}>
            Noch keine gewerteten Spieltage — sobald Ergebnisse feststehen, erscheint hier der Rang-Verlauf.
          </div>
        )}

        {history?.map(({ matchday, board }) => {
          const mine = board.find((b) => b.userId === meId);
          return (
            <div key={matchday} style={{
              marginBottom: 14, background: C.surface, border: `1px solid ${C.line}`,
              borderRadius: RUND.karte, padding: "14px 16px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>Spieltag {matchday}</span>
                {mine && (
                  <span style={{ fontFamily: MONO, fontSize: "0.8125rem", color: C.mint }}>
                    Rang #{mine.rank} · {mine.total} Pkt.
                  </span>
                )}
              </div>
              <div style={{ marginTop: 8 }}>
                {board.map((b, i) => (
                  <div key={b.userId} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
                    borderTop: i === 0 ? "none" : `1px solid ${C.line}`,
                  }}>
                    <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: C.muted, width: 16 }}>{b.rank}</span>
                    <span style={{ flex: 1, fontSize: "0.8125rem", color: b.userId === meId ? C.akzent : C.text }}>{b.name}</span>
                    {/* Anschluss-Bonus (Aufhol-Mechanismus), falls angefallen */}
                    {b.bonus > 0 && (
                      <span title="Anschluss-Bonus für Zurückliegende" style={{ fontFamily: MONO, fontSize: "0.6875rem", color: C.sky }}>
                        +{b.bonus}
                      </span>
                    )}
                    <span style={{ fontFamily: MONO, fontSize: "0.8125rem" }}>{b.total}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
