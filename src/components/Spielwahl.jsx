"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { filterMatchesByTeams } from "@/lib/roundStatus";
import { DEFAULT_RULES, weightUsageForMatchday } from "@/lib/engine";
import { jokerGiltFuerSpieltag } from "@/lib/voting";
import { C, MONO } from "@/lib/theme";


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
  const [teamFilter, setTeamFilter] = useState(null);
  const [tippedIds, setTippedIds] = useState(new Set());
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [meineTips, setMeineTips] = useState([]);   // { match_id, matchday, gewicht }
  const [votes, setVotes] = useState([]);           // Joker-Abstimmung der Runde

  useEffect(() => {
    let live = true;
    Promise.all([getStore().getRound(roundId), getStore().listMatches(), getStore().listVotes({ roundId })]).then(([round, ms, vs]) => {
      if (!live) return;
      setTeamFilter(round?.team_filter ?? null);
      setRules(round?.rules ?? DEFAULT_RULES);
      setVotes(vs);
      const relevant = filterMatchesByTeams(ms, round?.team_filter);
      setMatches([...relevant].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)));
    });
    return () => { live = false; };
  }, [roundId]);

  useEffect(() => {
    let live = true;
    Promise.all([getStore().listTips({ roundId }), getStore().listMatches()]).then(([tips, ms]) => {
      if (!live || !user) return;
      const eigene = tips.filter((t) => t.user_id === user.id);
      setTippedIds(new Set(eigene.map((t) => t.match_id)));
      const mdOf = new Map(ms.map((m) => [m.id, m.matchday ?? null]));
      setMeineTips(eigene.map((t) => ({ match_id: t.match_id, matchday: mdOf.get(t.match_id) ?? null, gewicht: t.tip?.gewicht })));
    });
    return () => { live = false; };
  }, [roundId, user]);

  const rankingModus = rules.joker?.enabled === true && rules.joker?.modus === "ranking";

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
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 10px" }}>Auf welches Spiel willst du tippen?</h1>
        {teamFilter?.length > 0 && (
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12 }}>
            Diese Runde ist beschränkt auf: {teamFilter.join(", ")}
          </div>
        )}

        {matches == null && (
          <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted }}>Spiele laden …</div>
        )}

        {matchdays.map((md) => {
          // Ranking-Leiste nur zeigen, wenn der Joker an diesem Spieltag gilt
          // (bei aktiver Abstimmung also nur an beschlossenen Spieltagen).
          const belegung = rankingModus && jokerGiltFuerSpieltag(rules, md, votes)
            ? weightUsageForMatchday(meineTips, md, rules) : null;
          const gewichtVon = (id) => meineTips.find((t) => t.match_id === id)?.gewicht;
          return (
            <div key={md} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                {md ? `Spieltag ${md}` : "Sonstige"}
              </div>
              {belegung && (
                <div style={{
                  display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
                  background: `${C.gold}0E`, border: `1px solid ${C.gold}2E`,
                  borderRadius: 10, padding: "7px 10px", marginBottom: 8,
                }}>
                  <span style={{ fontSize: 10.5, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Gewichte:</span>
                  {belegung.belegt.filter((b) => b.gewicht !== 1).map((b) => (
                    <span key={b.gewicht} style={{
                      fontFamily: MONO, fontSize: 11, padding: "2px 7px", borderRadius: 999,
                      background: b.matchId ? "transparent" : `${C.gold}22`,
                      color: b.matchId ? "rgba(138,144,180,0.5)" : C.gold,
                      border: `1px solid ${b.matchId ? C.line : C.gold + "66"}`,
                      textDecoration: b.matchId ? "line-through" : "none",
                    }}>×{b.gewicht.toFixed(1)}</span>
                  ))}
                  <span style={{ fontSize: 10.5, color: C.muted, marginLeft: "auto" }}>
                    {belegung.alleVergeben ? "alle vergeben" : `${belegung.frei.length} frei`}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groups.get(md).map((m) => (
                  <MatchRow key={m.id} match={m} open={new Date(m.kickoff) > now}
                    tipped={tippedIds.has(m.id)} gewicht={gewichtVon(m.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchRow({ match, open, tipped, gewicht }) {
  const gewichtet = Number.isFinite(gewicht) && gewicht > 1;
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
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {gewichtet && <Tag tone={C.gold}>×{gewicht.toFixed(1)}</Tag>}
        {open ? (
          tipped
            ? <Tag tone={C.mint}>✓ getippt</Tag>
            : <Tag tone={C.gold}>offen</Tag>
        ) : (
          <Tag tone={C.muted}>Anpfiff war</Tag>
        )}
      </div>
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
