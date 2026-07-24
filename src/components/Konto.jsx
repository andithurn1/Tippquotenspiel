"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import BackLink from "@/components/BackLink";
import { LEGAL, DATA_POINTS } from "@/lib/legal";

const C = {
  ink: "#0B0E1F", ink2: "#12172E", surface: "#1A2040", surface2: "#232A50",
  line: "rgba(255,255,255,0.09)", text: "#EDEEF6", muted: "#8A90B4",
  gold: "#F5C451", coral: "#FF5470", mint: "#54E0A0",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

export default function Konto() {
  const { user, isMock, updateName, exportMyData, deleteAccount } = useAuth();

  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div style={{
        width: "100%", maxWidth: 400, borderRadius: 26, overflow: "hidden",
        background: `radial-gradient(120% 80% at 50% -10%, ${C.ink2} 0%, ${C.ink} 60%)`,
        border: `1px solid ${C.line}`, boxShadow: "0 30px 80px -30px rgba(0,0,0,0.8)",
        padding: "26px 22px 24px",
      }}>
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Mein Konto
        </span>
        <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700 }}>Konto & Daten</div>

        {isMock ? (
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
            Demo-Modus — ohne echtes Konto. Sobald Supabase verbunden ist, kannst du
            hier deinen Namen ändern, deine Daten exportieren oder dein Konto löschen.
          </p>
        ) : !user ? (
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
            Nicht angemeldet. Melde dich zuerst über die Übersicht an.
          </p>
        ) : (
          <>
            <NameCard user={user} updateName={updateName} />
            <Divider />
            <ExportCard exportMyData={exportMyData} />
            <Divider />
            <DeleteCard email={user.email} deleteAccount={deleteAccount} />
          </>
        )}

        <Divider />
        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.7 }}>
          <Link href="/datenschutz" style={{ color: C.muted, textDecoration: "underline" }}>Datenschutz</Link>
          {"  ·  "}
          <Link href="/impressum" style={{ color: C.muted, textDecoration: "underline" }}>Impressum</Link>
          <div style={{ marginTop: 6 }}>Stand: {LEGAL.stand}. Wir speichern bewusst nur das Nötigste.</div>
        </div>
      </div>
    </div>
  );
}

function NameCard({ user, updateName }) {
  const [name, setName] = useState(user.name || "");
  const [state, setState] = useState("idle"); // idle | saving | saved | error
  const [err, setErr] = useState("");

  const save = async (e) => {
    e.preventDefault();
    setState("saving"); setErr("");
    try { await updateName(name); setState("saved"); }
    catch (ex) { setState("error"); setErr(ex?.message || "Speichern fehlgeschlagen"); }
  };

  return (
    <form onSubmit={save} style={{ marginTop: 18 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Anzeigename</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
        So erscheinst du im Leaderboard deiner Runden.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={name} maxLength={40} onChange={(e) => { setName(e.target.value); setState("idle"); }}
          placeholder="Dein Name" style={{
            flex: 1, minWidth: 0, background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
            borderRadius: 12, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none",
          }} />
        <button type="submit" disabled={state === "saving"} style={{
          cursor: state === "saving" ? "default" : "pointer", background: C.gold, color: C.ink,
          fontWeight: 700, fontSize: 14, border: "none", borderRadius: 12, padding: "0 16px",
        }}>{state === "saving" ? "…" : "Speichern"}</button>
      </div>
      {state === "saved" && <div style={{ fontSize: 12, color: C.mint, marginTop: 6 }}>✓ Gespeichert.</div>}
      {state === "error" && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{err}</div>}
    </form>
  );
}

function ExportCard({ exportMyData }) {
  const [state, setState] = useState("idle"); // idle | working | error
  const [err, setErr] = useState("");

  const run = async () => {
    setState("working"); setErr("");
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tippquotenspiel-daten-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch (ex) { setState("error"); setErr(ex?.message || "Export fehlgeschlagen"); }
  };

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Meine Daten exportieren</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
        Lädt alles, was wir über dich gespeichert haben, als JSON-Datei herunter
        (Auskunftsrecht, Art. 15 DSGVO).
      </div>
      <button onClick={run} disabled={state === "working"} style={{
        marginTop: 10, cursor: state === "working" ? "default" : "pointer",
        background: C.surface2, color: C.text, fontWeight: 700, fontSize: 13,
        border: `1px solid ${C.line}`, borderRadius: 12, padding: "9px 16px", fontFamily: "inherit",
      }}>{state === "working" ? "…" : "Als JSON herunterladen"}</button>
      {state === "error" && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{err}</div>}
    </div>
  );
}

function DeleteCard({ email, deleteAccount }) {
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState("idle"); // idle | working | error
  const [err, setErr] = useState("");
  const armed = confirm.trim().toUpperCase() === "LÖSCHEN";

  const run = async () => {
    if (!armed) return;
    setState("working"); setErr("");
    try { await deleteAccount(); /* danach abgemeldet → Auth-UI erscheint wieder */ }
    catch (ex) { setState("error"); setErr(ex?.message || "Löschen fehlgeschlagen"); }
  };

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.coral }}>Konto löschen</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
        Entfernt dein Konto ({email}) mit allen Tipps und Mitgliedschaften
        unwiderruflich (Recht auf Löschung, Art. 17 DSGVO). Tippe zur Bestätigung
        <b style={{ color: C.text }}> LÖSCHEN</b> ins Feld.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
          placeholder="LÖSCHEN" style={{
            flex: 1, minWidth: 0, background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
            borderRadius: 12, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none",
          }} />
        <button onClick={run} disabled={!armed || state === "working"} style={{
          cursor: armed && state !== "working" ? "pointer" : "default",
          background: armed ? C.coral : C.surface, color: armed ? "#fff" : C.muted,
          fontWeight: 700, fontSize: 14, border: `1px solid ${armed ? C.coral : C.line}`,
          borderRadius: 12, padding: "0 16px", fontFamily: "inherit",
        }}>{state === "working" ? "…" : "Löschen"}</button>
      </div>
      {state === "error" && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{err}</div>}
      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
        Wir speichern nur: {DATA_POINTS.map((d) => d.label).join(", ")}.
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: C.line, margin: "20px 0" }} />;
}
