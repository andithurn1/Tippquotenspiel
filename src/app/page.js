"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AuthBar from "@/components/AuthBar";
import { useCurrentRound } from "@/components/RoundProvider";
import { getStore } from "@/lib/store";

const C = {
  ink: "#0B0E1F", ink2: "#12172E", surface: "#1A2040",
  line: "rgba(255,255,255,0.09)", text: "#EDEEF6", muted: "#8A90B4",
  gold: "#F5C451", coral: "#FF5470", mint: "#54E0A0",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

const SCREENS = [
  { href: "/tippen", title: "Tipp abgeben", desc: "Ergebnis + Torschützen tippen, Snapshot-Quote einfrieren.", tone: C.gold },
  { href: "/abrechnung", title: "Abrechnung", desc: "Spieltag-Abrechnung mit animiertem Punkte-Zähler.", tone: C.coral },
  { href: "/explorer", title: "Auszahlungs-Explorer", desc: "Heat-Grid: was jeder mögliche Endstand zahlen würde.", tone: C.mint },
  { href: "/erstellen", title: "Spiel erstellen", desc: "Regelwerk einstellen, Runde anlegen und per Code teilen.", tone: "#8B9BFF", tag: "Admin" },
  { href: "/beitreten", title: "Runde beitreten", desc: "Mit Beitritts-Code einer Runde beitreten oder wechseln.", tone: "#4FD1E8" },
  { href: "/einstellungen", title: "Meine Anzeige", desc: "Wie viel Mathematik & Vorschau du sehen willst.", tone: "#B98BFF", tag: "persönlich" },
];

export default function Home() {
  const { roundId } = useCurrentRound();
  const [roundName, setRoundName] = useState(null);

  useEffect(() => {
    let live = true;
    getStore().getRound(roundId).then((r) => { if (live) setRoundName(r?.name ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [roundId]);

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
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "8px 0 6px" }}>
          Mut zahlt sich aus.
        </h1>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginTop: 0, marginBottom: 24 }}>
          Quoten-gewichtetes Tippspiel unter Freunden. Kein Echtgeld — Ehre und
          ein Wichtelgeschenk.
        </p>

        <AuthBar />

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16, fontFamily: MONO, fontSize: 11.5, color: C.muted,
        }}>
          <span>Aktive Runde: <span style={{ color: C.text }}>{roundName ?? "…"}</span></span>
        </div>

        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 12 }}>
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
        </div>

        <p style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 28, lineHeight: 1.6 }}>
          Demo-Spiel: Jordanien vs Spanien · Mock-Quoten · alle Screens rechnen
          über eine gemeinsame Engine.
        </p>
      </div>
    </main>
  );
}
