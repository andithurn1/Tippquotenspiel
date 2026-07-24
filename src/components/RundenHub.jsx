"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import { computeMatchStatus, countTippedByUser, filterMatchesByTeams } from "@/lib/roundStatus";
import { C, MONO } from "@/lib/theme";


// Landing-Karten der aktiven Runde: Tipp abgeben / Ranking / Ranking-Verlauf.
const CARDS = [
  { href: "/tippen", title: "Tipp abgeben", desc: "Spiel wählen, Ergebnis + Torschützen tippen.", tone: C.gold },
  { href: "/ranking", title: "Ranking", desc: "Wer in dieser Runde gerade vorne liegt.", tone: C.mint },
  { href: "/historie", title: "Historie & Rekorde", desc: "Verlauf, Auszeichnungen und „was wäre mit anderem Preset gewesen?“.", tone: C.sky },
];

// Geparkte Premium-Features (siehe CLAUDE.md-Roadmap) — nur als sichtbare,
// nicht klickbare Ankündigung, noch keine eigenen Screens.
const SOON = [
  { title: "Elfmeterschießen-Duell", desc: "1-gegen-1-Zusatzspiel gegen einen Mitspieler." },
  { title: "GIF an Mitspieler senden", desc: "Spott-GIFs nach der Abrechnung verschicken." },
];

// Das Runden-Hub: Startbildschirm der AKTIVEN Runde (Tipp abgeben, Ranking,
// Ranking-Verlauf, Premium-Ausblick). Von hier geht es über die Fußzeile ins
// allgemeine Menü (andere Runden, erstellen/beitreten, Einstellungen).
export default function RundenHub() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [roundName, setRoundName] = useState(null);
  const [status, setStatus] = useState(null); // { total, open, tippedByMe }
  const [abstimmung, setAbstimmung] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([getStore().getRound(roundId), getStore().listMatches(), getStore().listTips({ roundId })])
      .then(([round, matches, tips]) => {
        if (!live) return;
        setRoundName(round?.name ?? null);
        setAbstimmung(round?.rules?.joker?.enabled === true && round?.rules?.joker?.abstimmung === true);
        const relevant = filterMatchesByTeams(matches, round?.team_filter);
        const { total, open } = computeMatchStatus(relevant);
        setStatus({ total, open, tippedByMe: countTippedByUser(tips, user?.id) });
      }).catch(() => {});
    return () => { live = false; };
  }, [roundId, user]);

  return (
    <main style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "48px 16px", display: "flex", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
            Tippquotenspiel
          </span>
          <Link href="/menu" style={{ fontFamily: MONO, fontSize: 11.5, color: C.mint, textDecoration: "none" }}>
            Alle Tippspiele →
          </Link>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "8px 0 6px" }}>{roundName ?? "…"}</h1>

        <div style={{ fontFamily: MONO, fontSize: 11.5, color: C.muted, marginBottom: 20 }}>
          {status
            ? `${status.total} Spiele · ${status.open} offen · ${status.tippedByMe} von dir getippt`
            : "Status lädt …"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {abstimmung && (
            <Link href="/abstimmung" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.gold}44`, borderRadius: 18, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: C.gold, boxShadow: `0 0 12px ${C.gold}` }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>🃏 Joker-Abstimmung</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Stimmt ab, an welchen Spieltagen es einen Joker gibt.
              </div>
            </Link>
          )}
          {CARDS.map((s) => (
            <Link key={s.href} href={s.href} style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: s.tone, boxShadow: `0 0 12px ${s.tone}` }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{s.desc}</div>
            </Link>
          ))}

          {SOON.map((s) => (
            <div key={s.title} style={{
              color: C.muted, background: C.ink2, border: `1px solid ${C.line}`,
              borderRadius: 18, padding: "16px 18px", opacity: 0.6,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</span>
                <span style={{
                  marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: C.muted,
                  border: `1px solid ${C.line}`, borderRadius: 999, padding: "2px 8px",
                  textTransform: "uppercase", letterSpacing: 1,
                }}>bald verfügbar</span>
              </div>
              <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <Link href="/menu" style={{
          marginTop: 16, display: "block", textDecoration: "none", textAlign: "center",
          color: C.text, background: C.surface2, border: `1px solid ${C.line}`,
          borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 600,
        }}>
          Alle Tippspiele, erstellen, Einstellungen →
        </Link>
      </div>
    </main>
  );
}
