"use client";

import { useEffect, useState } from "react";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import BackLink from "@/components/BackLink";
import { DEFAULT_RULES } from "@/lib/engine";
import { tallyVotes, eigeneStimme } from "@/lib/voting";

const C = {
  ink: "#0B0E1F", ink2: "#12172E", surface: "#1A2040", surface2: "#232A50",
  line: "rgba(255,255,255,0.09)", text: "#EDEEF6", muted: "#8A90B4",
  gold: "#F5C451", coral: "#FF5470", mint: "#54E0A0",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const tag = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });

export default function Abstimmung() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [matches, setMatches] = useState(null);
  const [votes, setVotes] = useState([]);
  const [busy, setBusy] = useState(null);   // matchday, das gerade speichert

  const laden = async () => {
    const [round, ms, vs] = await Promise.all([
      getStore().getRound(roundId), getStore().listMatches(), getStore().listVotes({ roundId }),
    ]);
    setRules(round?.rules ?? DEFAULT_RULES);
    setMatches(ms);
    setVotes(vs);
  };

  useEffect(() => { laden().catch(() => {}); /* eslint-disable-next-line */ }, [roundId]);

  const aktiv = rules.joker?.enabled === true && rules.joker?.abstimmung === true;

  // Erster Anpfiff je Spieltag = Abstimmungs-Frist. Danach ist der Spieltag zu.
  const now = Date.now();
  const perDay = new Map();   // matchday → { firstKickoff }
  for (const m of matches ?? []) {
    const md = m.matchday ?? null;
    if (md == null) continue;
    const k = new Date(m.kickoff).getTime();
    const cur = perDay.get(md);
    if (!cur || k < cur.firstKickoff) perDay.set(md, { firstKickoff: k });
  }
  const matchdays = [...perDay.keys()].sort((a, b) => a - b);
  const tally = new Map(tallyVotes(votes).map((d) => [d.matchday, d]));

  const abstimmen = async (matchday, ja) => {
    if (!user) return;
    setBusy(matchday);
    try {
      await getStore().saveVote({ roundId, matchday, userId: user.id, ja });
      await laden();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <BackLink href="/hub" label="Tippspiel" />
        <h1 style={{ fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase", margin: "18px 0 6px" }}>
          Joker-Abstimmung
        </h1>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 16px", lineHeight: 1.5 }}>
          Stimmt gemeinsam ab, an welchen Spieltagen es einen Joker gibt. Mehrheit der
          abgegebenen Stimmen entscheidet; die Abstimmung schließt mit dem ersten Anpfiff.
        </p>

        {matches == null && <div style={{ fontFamily: MONO, fontSize: 13, color: C.muted }}>lädt …</div>}

        {matches != null && !aktiv && (
          <div style={{ background: C.ink2, border: `1px solid ${C.line}`, borderRadius: 14, padding: "14px 16px", fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
            Diese Runde stimmt nicht über Joker-Spieltage ab. Der Admin kann das in der
            Spielerstellung unter „Joker &amp; Gewichtung" einschalten.
          </div>
        )}

        {matches != null && aktiv && !user && (
          <div style={{ fontSize: 13, color: C.gold }}>Bitte zuerst einloggen, um abzustimmen.</div>
        )}

        {matches != null && aktiv && user && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {matchdays.map((md) => {
              const t = tally.get(md) ?? { ja: 0, nein: 0, total: 0, beschlossen: false };
              const zu = now >= perDay.get(md).firstKickoff;
              const meine = eigeneStimme(votes, user.id, md);
              return (
                <div key={md} style={{
                  background: C.ink2, border: `1px solid ${t.beschlossen ? C.gold + "55" : C.line}`,
                  borderRadius: 16, padding: "13px 15px", opacity: zu ? 0.6 : 1,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Spieltag {md}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted }}>
                      Frist: Anpfiff {tag.format(new Date(perDay.get(md).firstKickoff))}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                      color: t.beschlossen ? C.gold : C.muted,
                      background: t.beschlossen ? `${C.gold}18` : C.surface,
                      border: `1px solid ${t.beschlossen ? C.gold + "55" : C.line}`,
                    }}>
                      {t.beschlossen ? "🃏 Joker-Spieltag" : "kein Joker"}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted }}>
                      {t.ja} Ja · {t.nein} Nein
                    </span>
                  </div>

                  {!zu ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                      {[{ ja: true, label: "Joker", tone: C.mint }, { ja: false, label: "Kein Joker", tone: C.coral }].map((opt) => {
                        const on = meine === opt.ja;
                        return (
                          <button key={opt.label} disabled={busy === md}
                            onClick={() => abstimmen(md, opt.ja)} style={{
                              flex: 1, cursor: busy === md ? "default" : "pointer", fontFamily: "inherit",
                              fontSize: 13, fontWeight: 700, padding: "10px 0", borderRadius: 12,
                              background: on ? `${opt.tone}22` : C.surface,
                              color: on ? opt.tone : C.muted,
                              border: `1px solid ${on ? opt.tone + "77" : C.line}`,
                            }}>
                            {on ? "✓ " : ""}{opt.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10 }}>
                      Abstimmung geschlossen (angepfiffen).
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
