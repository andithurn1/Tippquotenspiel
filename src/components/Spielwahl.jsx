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

const timeFmt = new Intl.DateTimeFormat("de-DE", {
  weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  timeZone: "Europe/Berlin",
});

// Match-Auswahl: alle Spiele aus dem Store, nach Spieltag gruppiert. Offene
// (Kickoff in der Zukunft) sind klickbar → Tippabgabe, bereits angepfiffene
// sind gesperrt. Zeigt außerdem an, wenn schon ein Tipp abgegeben wurde.
export default function Spielwahl() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [matches, setMatches] = useState(null);
  const [tippedIds, setTippedIds] = useState(new Set());

  useEffect(() => {
    let live = true;
    getStore().listMatches().then((ms) => {
      if (live) setMatches([...ms].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)));
    });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    getStore().listTips({ roundId }).then((tips) => {
      if (!live || !user) return;
      setTippedIds(new Set(tips.filter((t) => t.user_id === user.id).map((t) => t.match_id)));
    });
    return () => { live = false; };
  }, [roundId, user]);

  const now = Date.now();
  const groups = new Map();
  for (const m of matches ?? []) {
    const key = m.matchday ?? 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }
  const matchdays = [...groups.keys()].sort((a, b) => a - b);

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/hub" label="Tippspiel" />
      <div style={{ width: "100%", maxWidth: 400 }}>
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Spielwahl
        </span>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 18px" }}>Auf welches Spiel willst du tippen?</h1>

        {matches == null && (
          <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted }}>Spiele laden …</div>
        )}

        {matchdays.map((md) => (
          <div key={md} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              {md ? `Spieltag ${md}` : "Sonstige"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups.get(md).map((m) => (
                <MatchRow key={m.id} match={m} open={new Date(m.kickoff) > now} tipped={tippedIds.has(m.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchRow({ match, open, tipped }) {
  const content = (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: open ? C.surface : C.ink2, border: `1px solid ${C.line}`, borderRadius: 14,
      padding: "12px 14px", opacity: open ? 1 : 0.55,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{match.home} <span style={{ color: C.muted, fontWeight: 400 }}>vs</span> {match.away}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 3 }}>{timeFmt.format(new Date(match.kickoff))}</div>
      </div>
      {open ? (
        tipped
          ? <Tag tone={C.mint}>✓ getippt</Tag>
          : <Tag tone={C.gold}>offen</Tag>
      ) : (
        <Tag tone={C.muted}>Anpfiff war</Tag>
      )}
    </div>
  );
  return open
    ? <Link href={`/tippen/${match.id}`} style={{ textDecoration: "none", color: "inherit" }}>{content}</Link>
    : <div>{content}</div>;
}

function Tag({ children, tone }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 11, color: tone, border: `1px solid ${tone}55`,
      borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}
