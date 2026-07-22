"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

const C = {
  ink2: "#12172E", surface: "#1A2040", surface2: "#232A50",
  line: "rgba(255,255,255,0.09)", text: "#EDEEF6", muted: "#8A90B4",
  gold: "#F5C451", coral: "#FF5470", mint: "#54E0A0",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

// Kopfzeile mit Login-Status. Im Mock-Betrieb nur ein dezenter Demo-Hinweis;
// im Live-Betrieb E-Mail-Login (Magic-Link) bzw. Abmelden.
export default function AuthBar() {
  const { user, loading, isMock, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending"); setErr("");
    try { await signInWithEmail(email.trim()); setState("sent"); }
    catch (ex) { setState("error"); setErr(ex?.message || "Login fehlgeschlagen"); }
  };

  if (isMock) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 18,
        fontFamily: MONO, fontSize: 11, color: C.muted,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: C.gold }} />
        Demo-Modus — ohne Login, Daten nur lokal. Login erscheint, sobald Supabase verbunden ist.
      </div>
    );
  }

  if (loading) {
    return <div style={{ fontFamily: MONO, fontSize: 12, color: C.muted, marginBottom: 18 }}>lädt …</div>;
  }

  if (user) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        marginBottom: 18, background: C.surface, border: `1px solid ${C.line}`,
        borderRadius: 12, padding: "8px 12px",
      }}>
        <span style={{ fontSize: 13, color: C.text }}>
          <span style={{ color: C.muted }}>Angemeldet: </span>{user.name}
        </span>
        <button onClick={signOut} style={{
          fontFamily: MONO, fontSize: 11, color: C.muted, cursor: "pointer",
          background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 10px",
        }}>abmelden</button>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div style={{
        marginBottom: 18, background: `${C.mint}12`, border: `1px solid ${C.mint}44`,
        borderRadius: 12, padding: "12px 14px", fontSize: 13, color: C.text, lineHeight: 1.5,
      }}>
        <b style={{ color: C.mint }}>✓ Mail unterwegs.</b> Öffne den Link in deiner E-Mail
        ({email}) auf demselben Gerät — danach bist du eingeloggt.
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
        Mit E-Mail anmelden (Magic-Link, kein Passwort):
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="du@example.com" style={{
            flex: 1, minWidth: 0, background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
            borderRadius: 12, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none",
          }} />
        <button type="submit" disabled={state === "sending"} style={{
          cursor: state === "sending" ? "default" : "pointer", background: C.gold, color: "#0B0E1F",
          fontWeight: 700, fontSize: 14, border: "none", borderRadius: 12, padding: "0 16px",
        }}>{state === "sending" ? "…" : "Link senden"}</button>
      </div>
      {state === "error" && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{err}</div>}
    </form>
  );
}
