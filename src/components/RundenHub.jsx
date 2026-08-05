"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getStore } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import { computeMatchStatus, countTippedByUser, filterMatchesByTeams } from "@/lib/roundStatus";
import { muenzStand } from "@/lib/muenzstand";
import { narrenStand } from "@/lib/narrenstand";
import Waehrungen from "@/components/Waehrungen";
import { C, MONO } from "@/lib/theme";


// Landing-Karten der aktiven Runde: Tipp abgeben / Ranking / Ranking-Verlauf.
const CARDS = [
  { href: "/tippen", title: "Tipp abgeben", desc: "Spiel wählen, Ergebnis + Torschützen tippen.", tone: C.gold },
  { href: "/ranking", title: "Ranking", desc: "Wer in dieser Runde gerade vorne liegt.", tone: C.mint },
  { href: "/historie", title: "Historie & Rekorde", desc: "Verlauf, Auszeichnungen und „was wäre mit anderem Preset gewesen?“.", tone: C.sky },
  { href: "/spott", title: "Spott verschicken", desc: "Spruch + Clip an einen Mitspieler — über deinen normalen Chat.", tone: C.coral },
];

// Geparkte Premium-Features (siehe design/roadmap.md) — nur als sichtbare,
// nicht klickbare Ankündigung, noch keine eigenen Screens.
//
// Leer, und das ist Absicht: das Elfmeterschießen-Duell ist am 29.07. aus der
// Planung genommen worden. Eine Ankündigung, die niemand mehr baut, ist
// schlimmer als keine — sie wird zur Schuld, die man beim Nutzer stehen lässt.
// Kommt hier etwas Neues rein, bitte erst wenn es auch gebaut wird.
const SOON = [];

// Das Runden-Hub: Startbildschirm der AKTIVEN Runde (Tipp abgeben, Ranking,
// Ranking-Verlauf, Premium-Ausblick). Von hier geht es über die Fußzeile ins
// allgemeine Menü (andere Runden, erstellen/beitreten, Einstellungen).
export default function RundenHub() {
  const { user } = useAuth();
  const { roundId } = useCurrentRound();
  const [roundName, setRoundName] = useState(null);
  const [status, setStatus] = useState(null); // { total, open, tippedByMe }
  const [abstimmung, setAbstimmung] = useState(false);
  // ⚠️ Zwei verschiedene Abstimmungen: `abstimmung` sind die Joker-Spieltage
  // (voting.js), `regelWahl` sind Änderungen AM REGELWERK
  // (design/abstimmung-verfassung.md). Getrennte Zustände, getrennte Karten.
  const [regelWahl, setRegelWahl] = useState(false);
  const [rad, setRad] = useState(false);   // Glücksrad dieser Runde (drehrad.js)
  const [saison, setSaison] = useState(false);
  const [stand, setStand] = useState(null); // Münzstand dieser Runde, siehe muenzstand.js
  const [narren, setNarren] = useState(null); // Narren-Kontostand dieser Runde, siehe narrenstand.js

  useEffect(() => {
    let live = true;
    Promise.all([
      getStore().getRound(roundId), getStore().listMatches(), getStore().listTips({ roundId }),
      getStore().getLeaderboardHistory(roundId),
    ])
      .then(([round, matches, tips, history]) => {
        if (!live) return;
        setRoundName(round?.name ?? null);
        setAbstimmung(round?.rules?.joker?.enabled === true && round?.rules?.joker?.abstimmung === true);
        setRegelWahl(round?.rules?.regelAbstimmung?.enabled === true);
        setRad(round?.rules?.drehrad?.enabled === true);
        setSaison(round?.rules?.saison?.enabled === true);
        const relevant = filterMatchesByTeams(matches, round?.team_filter);
        const { total, open } = computeMatchStatus(relevant);
        setStatus({ total, open, tippedByMe: countTippedByUser(tips, user?.id) });
        setStand(muenzStand({ rules: round?.rules, matches: relevant, tips, userId: user?.id }));
        setNarren(narrenStand({ rules: round?.rules, matches: relevant, tips, userId: user?.id, stand: history }));
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

        {(stand || narren != null) && (
          <div style={{
            background: C.surface, border: `1px solid ${C.line}`, borderRadius: 16,
            padding: "14px 16px", marginBottom: 16,
          }}>
            <Waehrungen stand={stand} narren={narren?.kontostand ?? null} />
          </div>
        )}

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
          {regelWahl && (
            <Link href="/regeln" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.gold}44`, borderRadius: 18, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: C.gold, boxShadow: `0 0 12px ${C.gold}` }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>⚖️ Regeländerungen</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Änderungen am Regelwerk vorschlagen und darüber abstimmen.
              </div>
            </Link>
          )}
          {rad && (
            <Link href="/rad" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: C.sky, boxShadow: `0 0 12px ${C.sky}` }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>🎡 Dein Glücksrad</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Was für dich gefallen ist — und wann sich das Rad das nächste Mal dreht.
              </div>
            </Link>
          )}
          {saison && (
            <Link href="/saison" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: C.violet, boxShadow: `0 0 12px ${C.violet}` }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>🏆 Saison-Wetten</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Langzeit-Tipps: Meister, Torschützenkönig & Co.
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
