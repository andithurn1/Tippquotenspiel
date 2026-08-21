"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { C, MONO } from "@/lib/theme";
import { leseAnmeldung } from "@/lib/anmeldung";
import { TAPZIEL } from "@/lib/tapziel";


// Kopfzeile mit Login-Status. Im Mock-Betrieb nur ein dezenter Demo-Hinweis;
// im Live-Betrieb E-Mail-Login (Magic-Link) bzw. Abmelden.
export default function AuthBar() {
  const { user, loading, isMock, signInWithEmail, verifyCode, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [err, setErr] = useState("");
  // Der Code aus der Mail — der Weg, der auf dem Handy als einziger trägt.
  const [code, setCode] = useState("");
  const [pruefe, setPruefe] = useState(false);
  const [codeFehler, setCodeFehler] = useState("");

  // Der Knopf wird erst scharf, wenn die Eingabe überhaupt etwas Verwertbares
  // ist — dieselbe Prüfung wie beim Absenden, damit sie nicht auseinanderläuft.
  const bereit = leseAnmeldung(code).art === "code" || leseAnmeldung(code).art === "link";

  const pruefeCode = async () => {
    setPruefe(true); setCodeFehler("");
    try { await verifyCode(email.trim(), code); }
    catch (ex) {
      setCodeFehler(ex?.message || "Code oder Link stimmen nicht — oder sie sind abgelaufen.");
    } finally { setPruefe(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !consent) return;
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
        <span style={{ width: 7, height: 7, borderRadius: 999, background: C.akzent }} />
        Demo-Modus — ohne Login, Daten nur lokal. Login erscheint, sobald Supabase verbunden ist.
      </div>
    );
  }

  if (loading) {
    return <div style={{ fontFamily: MONO, fontSize: 12, color: C.muted, marginBottom: 18 }}>lädt …</div>;
  }

  // Nach dem allerersten Login: einmalig einen Anzeigenamen wählen lassen
  // (statt des aus der E-Mail abgeleiteten Platzhalters).
  if (user && !user.nameSet) {
    return <NameOnboarding />;
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
        <span style={{ display: "flex", gap: 6 }}>
          <Link href="/konto" style={{
            fontFamily: MONO, fontSize: 11, color: C.muted, textDecoration: "none",
            background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 10px",
          }}>Konto</Link>
          <button onClick={signOut} style={{
            fontFamily: MONO, fontSize: 11, color: C.muted, cursor: "pointer",
            background: C.surface2, border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 10px",
          }}>abmelden</button>
        </span>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div style={{
        marginBottom: 18, background: `${C.mint}12`, border: `1px solid ${C.mint}44`,
        borderRadius: 12, padding: "12px 14px", fontSize: 13, color: C.text, lineHeight: 1.5,
      }}>
        <b style={{ color: C.mint }}>✓ Mail unterwegs</b> an {email}.

        {/* 🔴 ZWEI Wege, und der zweite ist auf dem Handy der EINZIGE, der
            trägt: eine zum Home-Bildschirm hinzugefügte Web-App hat unter iOS
            einen eigenen Speicher. Der Link aus der Mail öffnet Safari — man
            ist dann im Browser angemeldet und in der App-Kachel weiterhin
            nicht. Mit kopiertem Link verlässt man die App nie.
            Deshalb steht der LINK oben — siehe den Kommentar darunter, der
            erklärt, warum die ursprüngliche Reihenfolge falsch war. */}
        <div style={{ marginTop: 10 }}>
          <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 5 }}>
            Link aus der Mail hier einsetzen
          </label>
          {/* 🔴 UMGEDREHT am 20.08.2026. Andi auf dem Handy: „fragt nach wie
              vor nach Code in der App, wo ich Link angefordert habe, und
              Supabase schickt dann kein Code nur Link.“

              Er hat recht, und der Fehler war die REIHENFOLGE, nicht die
              Technik: `leseAnmeldung` nimmt den Link längst entgegen. Aber
              beschriftet war das Feld mit „Code oder Link“, und ein Code kann
              auf dem Gratis-Tarif gar nicht kommen — die Mail-Vorlagen sind
              dort nicht bearbeitbar, also lässt sich `{{ .Token }}` nicht
              hineinholen. Wer zuerst „Code“ liest, sucht etwas, das es nicht
              gibt, und hört beim Suchen auf.

              Deshalb steht jetzt der LINK oben und mit Schritten, und der Code
              nur noch als Nebensatz für später (mit eigenem Mailversand über
              Brevo werden die Vorlagen bearbeitbar, dann gibt es beides). */}
          <ol style={{
            margin: "0 0 10px 0", paddingLeft: 20, fontSize: 12.5,
            color: C.text, lineHeight: 1.6,
          }}>
            <li>Mail öffnen (Absender: Supabase)</li>
            <li>Auf den Link <b>tippen und halten</b> → „Link kopieren“</li>
            <li>Hier unten einsetzen → <b>Los</b></li>
          </ol>
          <div style={{ fontSize: 11.5, color: C.coral, marginBottom: 8, lineHeight: 1.5 }}>
            ⚠️ Den Link <b>nicht antippen</b>. Er gilt nur einmal, und er öffnet
            Safari — dort wärst du angemeldet, in dieser App weiterhin nicht.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              placeholder="Link einfügen"
              style={{
                flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: 10,
                border: `1px solid ${C.line}`, background: C.ink, color: C.text,
                fontSize: 15, fontFamily: MONO, outline: "none",
              }} />
            <button type="button" onClick={pruefeCode}
              disabled={!bereit || pruefe}
              style={{
                ...TAPZIEL,
                padding: "12px 18px", borderRadius: 10, border: "none",
                background: bereit ? C.mint : C.surface,
                color: bereit ? C.ink : C.muted,
                fontWeight: 700, fontSize: 15,
                cursor: bereit ? "pointer" : "default",
              }}>{pruefe ? "…" : "Los"}</button>
          </div>
          {codeFehler && (
            <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{codeFehler}</div>
          )}
          {/* 🔴 Steht hier, weil die Mail auf dem Gratis-Tarif von Supabase
              KEINEN Zahlencode enthalten kann (die Vorlagen sind dort nicht
              bearbeitbar). Der Link ist also nicht die Ausweichlösung, sondern
              der Normalfall — deshalb die Anleitung zum Kopieren, und nicht
              nur der Hinweis, dass es auch ginge. */}
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            <b style={{ color: C.text }}>Steht ein sechsstelliger Code in der Mail?</b> Dann
            tut der es hier genauso. Aktuell verschickt Supabase keinen — das ändert
            sich, sobald der eigene Mailversand steht.
          </div>
        </div>
      </div>
    );
  }

  const canSend = Boolean(email.trim()) && consent && state !== "sending";

  return (
    <form onSubmit={submit} style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
        Mit E-Mail anmelden (Magic-Link, kein Passwort — du bleibst danach angemeldet):
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="du@example.com" style={{
            flex: 1, minWidth: 0, background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
            borderRadius: 12, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none",
          }} />
        <button type="submit" disabled={!canSend} style={{
          cursor: canSend ? "pointer" : "default", background: canSend ? C.akzent : C.surface,
          color: canSend ? C.ink : C.muted, fontWeight: 700, fontSize: 14,
          border: `1px solid ${canSend ? C.akzent : C.line}`, borderRadius: 12, padding: "0 16px",
        }}>{state === "sending" ? "…" : "Link senden"}</button>
      </div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
          style={{ marginTop: 2, accentColor: C.akzent }} />
        <span style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
          Ich habe die <Link href="/datenschutz" style={{ color: C.akzent }}>Datenschutzerklärung</Link> gelesen
          und bin mit der Verarbeitung meiner Daten für dieses Tippspiel einverstanden.
        </span>
      </label>
      {state === "error" && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{err}</div>}
    </form>
  );
}

// Einmaliges Namens-Onboarding direkt nach dem ersten Login.
function NameOnboarding() {
  const { user, updateName } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [state, setState] = useState("idle"); // idle | saving | error
  const [err, setErr] = useState("");

  const save = async (e) => {
    e.preventDefault();
    setState("saving"); setErr("");
    try { await updateName(name); }
    catch (ex) { setState("error"); setErr(ex?.message || "Speichern fehlgeschlagen"); }
  };

  return (
    <form onSubmit={save} style={{
      marginBottom: 18, background: `${C.akzent}10`, border: `1px solid ${C.akzent}44`,
      borderRadius: 12, padding: "12px 14px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Willkommen! 👋 Wie sollen wir dich nennen?</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
        Dein Name im Leaderboard — jederzeit unter „Konto“ änderbar.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)}
          placeholder="Dein Name" style={{
            flex: 1, minWidth: 0, background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
            borderRadius: 12, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", outline: "none",
          }} />
        <button type="submit" disabled={!name.trim() || state === "saving"} style={{
          cursor: name.trim() && state !== "saving" ? "pointer" : "default", background: C.akzent, color: "#FFFFFF",
          fontWeight: 700, fontSize: 14, border: "none", borderRadius: 12, padding: "0 16px",
        }}>{state === "saving" ? "…" : "Los"}</button>
      </div>
      {state === "error" && <div style={{ fontSize: 12, color: C.coral, marginTop: 6 }}>{err}</div>}
    </form>
  );
}
