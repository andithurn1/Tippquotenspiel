"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthBar from "@/components/AuthBar";
import { useAuth } from "@/components/AuthProvider";
import { useCurrentRound } from "@/components/RoundProvider";
import { getStore } from "@/lib/store";
import { computeMatchStatus, countTippedByUser, filterMatchesByTeams } from "@/lib/roundStatus";

const C = {
  ink: "#0B0E1F", ink2: "#12172E", surface: "#1A2040", surface2: "#232A50",
  line: "rgba(255,255,255,0.09)", text: "#EDEEF6", muted: "#8A90B4",
  gold: "#F5C451", coral: "#FF5470", mint: "#54E0A0",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const SCREENS = [
  { href: "/erstellen", title: "Spiel erstellen", desc: "Regelwerk einstellen, Runde anlegen und per Code teilen.", tone: "#8B9BFF", tag: "Admin" },
  { href: "/beitreten", title: "Runde beitreten", desc: "Mit Beitritts-Code einer Runde beitreten oder wechseln.", tone: "#4FD1E8" },
  { href: "/einstellungen", title: "Meine Anzeige", desc: "Wie viel Mathematik & Vorschau du sehen willst.", tone: "#B98BFF", tag: "persönlich" },
  { href: "/abrechnung", title: "Abrechnung (Demo)", desc: "Spieltag-Abrechnung mit animiertem Punkte-Zähler.", tone: C.coral },
  { href: "/explorer", title: "Auszahlungs-Explorer", desc: "Heat-Grid: was jeder mögliche Endstand zahlen würde.", tone: C.mint },
];

// Allgemeines Menü: eigene Tippspiele wechseln/anlegen/beitreten + Einstellungen.
// Von hier aus springt man ins Runden-Hub der jeweils aktiven Runde.
export default function Hauptmenu() {
  const router = useRouter();
  const { user } = useAuth();
  const { roundId, setRoundId } = useCurrentRound();
  const [rounds, setRounds] = useState(null); // [{ ...round, status }]

  useEffect(() => {
    let live = true;
    if (!user) { setRounds([]); return; }
    Promise.all([getStore().listRoundsForUser(user.id), getStore().listMatches()]).then(async ([myRounds, matches]) => {
      if (!live) return;
      const withStatus = await Promise.all(myRounds.map(async (r) => {
        const relevant = filterMatchesByTeams(matches, r.team_filter);
        const { total, open } = computeMatchStatus(relevant);
        const tips = await getStore().listTips({ roundId: r.id });
        return { ...r, status: { total, open, tippedByMe: countTippedByUser(tips, user.id) } };
      }));
      if (live) setRounds(withStatus);
    });
    return () => { live = false; };
  }, [user]);

  const switchTo = (id) => {
    if (id !== roundId) setRoundId(id);
    router.push("/hub");
  };

  return (
    <main style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "48px 16px", display: "flex", justifyContent: "center",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Tippquotenspiel
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "8px 0 6px" }}>Mut zahlt sich aus.</h1>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 0, marginBottom: 24 }}>
          Quoten-gewichtetes Tippspiel unter Freunden. Kein Echtgeld — Ehre und
          ein Wichtelgeschenk.
        </p>

        <AuthBar />

        <Section title="Meine Tippspiele">
          {rounds == null && <Hint>Tippspiele laden …</Hint>}
          {rounds?.length === 0 && <Hint>Noch keine Tippspiele — leg eins an oder tritt einem bei.</Hint>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rounds?.map((r) => {
              const active = r.id === roundId;
              return (
                <button key={r.id} onClick={() => switchTo(r.id)} style={{
                  textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                  background: active ? `${C.gold}14` : C.surface,
                  border: `1px solid ${active ? C.gold + "55" : C.line}`,
                  borderRadius: 16, padding: "14px 16px", color: C.text,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</span>
                    {active && (
                      <span style={{
                        fontFamily: MONO, fontSize: 10, color: C.gold, border: `1px solid ${C.gold}55`,
                        borderRadius: 999, padding: "2px 8px", textTransform: "uppercase", letterSpacing: 1,
                      }}>aktiv</span>
                    )}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 5 }}>
                    {r.status.total} Spiele · {r.status.open} offen · {r.status.tippedByMe} von dir getippt
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Verwalten">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SCREENS.map((s) => (
              <Link key={s.href} href={s.href} style={{
                textDecoration: "none", color: C.text,
                background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
                border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: s.tone, boxShadow: `0 0 12px ${s.tone}` }} />
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</span>
                  {s.tag && (
                    <span style={{
                      marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: s.tone,
                      border: `1px solid ${s.tone}55`, borderRadius: 999, padding: "2px 8px",
                      textTransform: "uppercase", letterSpacing: 1,
                    }}>{s.tag}</span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>{s.desc}</div>
              </Link>
            ))}

            <Link href="/tutorial" style={{
              textDecoration: "none", color: C.text,
              background: `radial-gradient(120% 120% at 50% -20%, ${C.ink2} 0%, ${C.surface} 100%)`,
              border: `1px solid ${C.line}`, borderRadius: 18, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: C.gold, boxShadow: `0 0 12px ${C.gold}` }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Tutorial</span>
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>Quoten, Punkte & das Admin-System — mit Beispielen erklärt.</div>
            </Link>
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 8, marginBottom: 24 }}>
      <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Hint({ children }) {
  return <div style={{ fontSize: 12.5, color: C.muted, fontFamily: MONO, padding: "4px 0 10px" }}>{children}</div>;
}
