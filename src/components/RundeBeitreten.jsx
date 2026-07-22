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

export default function RundeBeitreten() {
  const { user } = useAuth();
  const { roundId, setRoundId } = useCurrentRound();
  const [code, setCode] = useState("");
  const [state, setState] = useState("idle"); // idle | joining | joined | notfound | error
  const [joinedName, setJoinedName] = useState("");
  const [currentRoundName, setCurrentRoundName] = useState(null);

  useEffect(() => {
    let live = true;
    getStore().getRound(roundId).then((r) => { if (live) setCurrentRoundName(r?.name ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [roundId]);

  const submit = async (e) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    if (!user) { setState("error"); return; }
    setState("joining");
    try {
      const round = await getStore().getRoundByCode(clean);
      if (!round) { setState("notfound"); return; }
      await getStore().joinRound({ roundId: round.id, userId: user.id, name: user.name });
      setRoundId(round.id);
      setJoinedName(round.name);
      setState("joined");
    } catch {
      setState("error");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink />
      <div style={{
        width: "100%", maxWidth: 400, position: "relative",
        borderRadius: 26, overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
      }}>
        <div style={{ position: "relative", padding: "26px 22px 24px" }}>
          <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
            Runde beitreten
          </span>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>Beitritts-Code eingeben</div>
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 4, marginBottom: 20, lineHeight: 1.5 }}>
            Von einem Freund bekommen, oder zurück zur Demo-Runde? Der Code{" "}
            <span style={{ fontFamily: MONO, color: C.gold }}>DEMO</span>{" "}
            führt immer zur „Freundeskreis"-Runde.
          </p>

          {state !== "joined" ? (
            <form onSubmit={submit}>
              <input value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="z. B. AB3XQ9" maxLength={12} autoCapitalize="characters" style={{
                  width: "100%", boxSizing: "border-box", background: C.surface, color: C.text,
                  border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px",
                  fontSize: 20, fontFamily: MONO, letterSpacing: 3, textAlign: "center",
                  textTransform: "uppercase", outline: "none",
                }} />
              <button type="submit" disabled={state === "joining" || !code.trim()} style={{
                marginTop: 14, width: "100%", cursor: state === "joining" || !code.trim() ? "default" : "pointer",
                background: C.gold, color: C.ink, fontWeight: 700, fontSize: 15,
                border: "none", borderRadius: 14, padding: "14px 0",
                opacity: state === "joining" || !code.trim() ? 0.6 : 1,
              }}>
                {state === "joining" ? "wird geprüft …" : "Beitreten"}
              </button>
              {state === "notfound" && (
                <div style={{ fontSize: 12, color: C.coral, marginTop: 8 }}>Keine Runde mit diesem Code gefunden.</div>
              )}
              {state === "error" && !user && (
                <div style={{ fontSize: 12, color: C.gold, marginTop: 8 }}>Bitte zuerst auf der Startseite einloggen.</div>
              )}
              {state === "error" && user && (
                <div style={{ fontSize: 12, color: C.coral, marginTop: 8 }}>Beitritt fehlgeschlagen — später erneut versuchen.</div>
              )}
              <div style={{ fontSize: 11, color: C.muted, marginTop: 12 }}>
                Aktive Runde gerade: <span style={{ color: C.text }}>{currentRoundName ?? "…"}</span>
              </div>
            </form>
          ) : (
            <div style={{ background: `${C.mint}12`, border: `1px solid ${C.mint}44`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.mint }}>✓ Beigetreten: „{joinedName}"</div>
              <p style={{ fontSize: 12.5, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Das ist jetzt deine aktive Runde für Tippen und Abrechnung.
              </p>
              <Link href="/tippen" style={{
                marginTop: 14, display: "block", textAlign: "center", textDecoration: "none",
                color: C.ink, background: C.gold, fontWeight: 700, fontSize: 14,
                borderRadius: 14, padding: "12px 0",
              }}>
                Jetzt tippen →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
