"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { C, MONO, RUND } from "@/lib/theme";
import { leseAnmeldung } from "@/lib/anmeldung";
import { pruefePasswort, passwortStaerke, passwortFehlerText } from "@/lib/passwort";
import { TAPZIEL } from "@/lib/tapziel";


// Kopfzeile mit Login-Status. Im Mock-Betrieb nur ein dezenter Demo-Hinweis;
// im Live-Betrieb E-Mail-Login (Magic-Link) bzw. Abmelden.
export default function AuthBar() {
  const {
    user, loading, isMock, signInWithEmail, verifyCode, signOut,
    anmeldenMitPasswort, registrierenMitPasswort, passwortVergessen,
  } = useAuth();
  // Welcher Weg gerade gewaehlt ist. Vorgabe: Passwort (Andi, 29.08.2026).
  const [weg, setWeg] = useState("passwort");
  const [passwort, setPasswort] = useState("");
  const [neuesKonto, setNeuesKonto] = useState(false);
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
        fontFamily: MONO, fontSize: "0.6875rem", color: C.muted,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: RUND.pille, background: C.akzent }} />
        Demo-Modus — ohne Login, Daten nur lokal. Login erscheint, sobald Supabase verbunden ist.
      </div>
    );
  }

  if (loading) {
    return <div style={{ fontFamily: MONO, fontSize: "0.75rem", color: C.muted, marginBottom: 18 }}>lädt …</div>;
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
        borderRadius: RUND.karte, padding: "8px 12px",
      }}>
        <span style={{ fontSize: "0.8125rem", color: C.text }}>
          <span style={{ color: C.muted }}>Angemeldet: </span>{user.name}
        </span>
        <span style={{ display: "flex", gap: 6 }}>
          <Link href="/konto" style={{
            fontFamily: MONO, fontSize: "0.6875rem", color: C.muted, textDecoration: "none",
            background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RUND.pille, padding: "4px 10px",
          }}>Konto</Link>
          <button onClick={signOut} style={{
            fontFamily: MONO, fontSize: "0.6875rem", color: C.muted, cursor: "pointer",
            background: C.surface2, border: `1px solid ${C.line}`, borderRadius: RUND.pille, padding: "4px 10px",
          }}>abmelden</button>
        </span>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div style={{
        marginBottom: 18, background: `${C.mint}12`, border: `1px solid ${C.mint}44`,
        borderRadius: RUND.karte, padding: "12px 14px", fontSize: "0.8125rem", color: C.text, lineHeight: 1.5,
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
          <label style={{ fontSize: "0.75rem", color: C.muted, display: "block", marginBottom: 5 }}>
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
            margin: "0 0 10px 0", paddingLeft: 20, fontSize: "0.8125rem",
            color: C.text, lineHeight: 1.6,
          }}>
            <li>Mail öffnen (Absender: Supabase)</li>
            <li>Auf den Link <b>tippen und halten</b> → „Link kopieren“</li>
            <li>Hier unten einsetzen → <b>Los</b></li>
          </ol>
          <div style={{ fontSize: "0.75rem", color: C.coral, marginBottom: 8, lineHeight: 1.5 }}>
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
                flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: RUND.karte,
                border: `1px solid ${C.line}`, background: C.ink, color: C.text,
                fontSize: "0.9375rem", fontFamily: MONO, outline: "none",
              }} />
            <button type="button" onClick={pruefeCode}
              disabled={!bereit || pruefe}
              style={{
                ...TAPZIEL,
                padding: "12px 18px", borderRadius: RUND.karte, border: "none",
                background: bereit ? C.mint : C.surface,
                color: bereit ? C.ink : C.muted,
                fontWeight: 700, fontSize: "0.9375rem",
                cursor: bereit ? "pointer" : "default",
              }}>{pruefe ? "…" : "Los"}</button>
          </div>
          {codeFehler && (
            <div style={{ fontSize: "0.75rem", color: C.coral, marginTop: 6 }}>{codeFehler}</div>
          )}
          {/* 🔴 Steht hier, weil die Mail auf dem Gratis-Tarif von Supabase
              KEINEN Zahlencode enthalten kann (die Vorlagen sind dort nicht
              bearbeitbar). Der Link ist also nicht die Ausweichlösung, sondern
              der Normalfall — deshalb die Anleitung zum Kopieren, und nicht
              nur der Hinweis, dass es auch ginge. */}
          <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            <b style={{ color: C.text }}>Steht ein sechsstelliger Code in der Mail?</b> Dann
            tut der es hier genauso. Aktuell verschickt Supabase keinen — das ändert
            sich, sobald der eigene Mailversand steht.
          </div>
        </div>
      </div>
    );
  }

  const canSend = Boolean(email.trim()) && consent && state !== "sending";

  // ── 🔴 ZWEI WEGE HINEIN (Andi, 29.08.2026) ────────────────
  //
  // Wörtlich: *„finde das mit den Emails manchmal umständlich und
  // benutzerunfreundlich immer die App schliessen zu müssen wenn man das Handy
  // auch das Passwort und Benutzernamen merken lassen kann."*
  //
  // 🔴 **Der Passwort-Weg steht deshalb VORNE und ist die Vorgabe.** Der
  // Magic-Link kostet jedes Mal einen App-Wechsel; ein Passwort merkt sich das
  // Gerät. Für den Alltag — und ein Tippspiel macht man zweimal pro Spieltag
  // auf — ist das der Unterschied zwischen „kurz reinschauen" und „erst mal
  // ins Postfach".
  //
  // ⚠️ **Die `autoComplete`-Angaben sind hier keine Kosmetik, sondern der
  // ganze Punkt.** Ohne `username` und `current-password` bietet weder iOS noch
  // Android an, die Anmeldung zu speichern — und dann wäre der Passwort-Weg
  // genauso lästig wie der Link. `new-password` beim Anlegen sorgt dafür, dass
  // der Passwortmanager eines VORSCHLÄGT statt das alte einzusetzen.
  //
  // ⚠️ Der Magic-Link bleibt daneben: für die erste Anmeldung (man hat ja noch
  // kein Passwort) und für „vergessen".
  const passwortRegelFehler = weg === "passwort" && neuesKonto
    ? pruefePasswort(passwort, email)
    : null;
  const staerke = passwortStaerke(passwort);
  const kannPasswort = Boolean(email.trim()) && Boolean(passwort)
    && !passwortRegelFehler && state !== "sending"
    && (!neuesKonto || consent);

  const passwortAbsenden = async (e) => {
    e.preventDefault();
    if (!kannPasswort) return;
    setState("sending"); setErr("");
    try {
      if (neuesKonto) {
        const { sofortDrin } = await registrierenMitPasswort(email.trim(), passwort);
        // ⚠️ Nicht „fertig" behaupten, wenn Supabase noch eine Bestätigung
        // verlangt — sonst steht der Nutzer ausgeloggt vor einer Erfolgsmeldung.
        setState(sofortDrin ? "idle" : "bestaetigen");
      } else {
        await anmeldenMitPasswort(email.trim(), passwort);
        setState("idle");
      }
    } catch (ex) {
      setState("error");
      setErr(passwortFehlerText(ex));
    }
  };

  const vergessen = async () => {
    if (!email.trim()) { setErr("Bitte zuerst deine Mailadresse eintragen."); setState("error"); return; }
    setState("sending"); setErr("");
    try { await passwortVergessen(email.trim()); setState("zuruecksetzen"); }
    catch (ex) { setState("error"); setErr(passwortFehlerText(ex)); }
  };

  if (state === "bestaetigen" || state === "zuruecksetzen") {
    return (
      <div style={{
        marginBottom: 18, background: `${C.mint}10`, border: `1px solid ${C.mint}44`,
        borderRadius: RUND.karte, padding: "12px 14px", fontSize: "0.8125rem", lineHeight: 1.55,
      }}>
        <b style={{ color: C.mint }}>✓ Mail unterwegs</b> an {email}.{" "}
        {state === "bestaetigen"
          ? "Bestätige darin deine Adresse, danach meldest du dich mit deinem Passwort an."
          : "Darin steht der Link, mit dem du ein neues Passwort setzt."}
        <button type="button" onClick={() => setState("idle")} style={{
          ...TAPZIEL, display: "block", marginTop: 8, cursor: "pointer", fontFamily: "inherit",
          background: "none", border: "none", color: C.akzent, fontSize: "0.75rem", padding: 0,
        }}>zurück</button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Die Wahl des Wegs. Zwei Knöpfe statt eines Reiters: auf 375 px ist
          ein Reiter mit zwei Einträgen dasselbe, nur schlechter zu treffen. */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[["passwort", "Mit Passwort"], ["link", "Mit Mail-Link"]].map(([k, t]) => {
          const an = weg === k;
          return (
            <button key={k} type="button" onClick={() => { setWeg(k); setState("idle"); setErr(""); }}
              style={{
                ...TAPZIEL, flex: 1, cursor: "pointer", fontFamily: "inherit",
                borderRadius: RUND.karte, padding: "8px 6px", fontSize: "0.8125rem", fontWeight: 700,
                background: an ? `${C.akzent}22` : C.surface, color: an ? C.akzent : C.muted,
                border: `1px solid ${an ? C.akzent + "66" : C.line}`,
              }}>{t}</button>
          );
        })}
      </div>

      {weg === "passwort" ? (
        <form onSubmit={passwortAbsenden}>
          <div style={{ fontSize: "0.75rem", color: C.muted, marginBottom: 8 }}>
            {neuesKonto
              ? "Konto anlegen — danach meldest du dich damit auf jedem Gerät an."
              : "Anmelden. Dein Gerät darf sich das merken."}
          </div>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            autoComplete="username" placeholder="du@example.com"
            style={{
              width: "100%", boxSizing: "border-box", background: C.ink2, color: C.text,
              border: `1px solid ${C.line}`, borderRadius: RUND.karte, padding: "10px 12px",
              fontSize: "0.9375rem", fontFamily: "inherit", outline: "none",
            }} />
          <input
            type="password" required value={passwort} onChange={(e) => setPasswort(e.target.value)}
            autoComplete={neuesKonto ? "new-password" : "current-password"}
            placeholder={neuesKonto ? "Neues Passwort" : "Passwort"}
            style={{
              width: "100%", boxSizing: "border-box", marginTop: 8, background: C.ink2, color: C.text,
              border: `1px solid ${passwortRegelFehler ? C.coral : C.line}`, borderRadius: RUND.karte,
              padding: "10px 12px", fontSize: "0.9375rem", fontFamily: "inherit", outline: "none",
            }} />

          {neuesKonto && passwort && (
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 3, background: C.line, borderRadius: RUND.pille }}>
                <div style={{
                  width: `${staerke.stufe * 25}%`, height: "100%", borderRadius: RUND.pille,
                  background: staerke.stufe >= 3 ? C.mint : staerke.stufe === 2 ? C.akzent : C.coral,
                }} />
              </div>
              <div style={{ fontSize: "0.6875rem", color: passwortRegelFehler ? C.coral : C.muted, marginTop: 3, lineHeight: 1.45 }}>
                {passwortRegelFehler ?? staerke.wort}
              </div>
            </div>
          )}

          {neuesKonto && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                style={{ marginTop: 2, accentColor: C.akzent }} />
              <span style={{ fontSize: "0.75rem", color: C.muted, lineHeight: 1.5 }}>
                Ich habe die <Link href="/datenschutz" style={{ color: C.akzent }}>Datenschutzerklärung</Link> gelesen
                und bin mit der Verarbeitung meiner Daten für dieses Tippspiel einverstanden.
              </span>
            </label>
          )}

          <button type="submit" disabled={!kannPasswort} style={{
            ...TAPZIEL, width: "100%", marginTop: 10,
            cursor: kannPasswort ? "pointer" : "default",
            background: kannPasswort ? C.akzent : C.surface,
            color: kannPasswort ? C.ink : C.muted, fontWeight: 700, fontSize: "0.9375rem",
            border: `1px solid ${kannPasswort ? C.akzent : C.line}`, borderRadius: RUND.karte,
          }}>
            {state === "sending" ? "…" : neuesKonto ? "Konto anlegen" : "Anmelden"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, gap: 8 }}>
            <button type="button" onClick={() => { setNeuesKonto((v) => !v); setErr(""); setState("idle"); }}
              style={{
                ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", background: "none",
                border: "none", color: C.akzent, fontSize: "0.75rem", padding: 0, textAlign: "left",
              }}>
              {neuesKonto ? "Ich habe schon ein Konto" : "Noch kein Konto? Anlegen"}
            </button>
            {!neuesKonto && (
              <button type="button" onClick={vergessen} style={{
                ...TAPZIEL, cursor: "pointer", fontFamily: "inherit", background: "none",
                border: "none", color: C.muted, fontSize: "0.75rem", padding: 0, textAlign: "right",
              }}>Passwort vergessen?</button>
            )}
          </div>
          {state === "error" && <div style={{ fontSize: "0.75rem", color: C.coral, marginTop: 6 }}>{err}</div>}
        </form>
      ) : (
        <form onSubmit={submit}>
          <div style={{ fontSize: "0.75rem", color: C.muted, marginBottom: 8 }}>
            Wir schicken dir einen Link — ohne Passwort. Gut für die erste Anmeldung.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="username" placeholder="du@example.com" style={{
                flex: 1, minWidth: 0, background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
                borderRadius: RUND.karte, padding: "10px 12px", fontSize: "0.9375rem", fontFamily: "inherit", outline: "none",
              }} />
            <button type="submit" disabled={!canSend} style={{
              cursor: canSend ? "pointer" : "default", background: canSend ? C.akzent : C.surface,
              color: canSend ? C.ink : C.muted, fontWeight: 700, fontSize: "0.9375rem",
              border: `1px solid ${canSend ? C.akzent : C.line}`, borderRadius: RUND.karte, padding: "0 16px",
            }}>{state === "sending" ? "…" : "Link senden"}</button>
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
              style={{ marginTop: 2, accentColor: C.akzent }} />
            <span style={{ fontSize: "0.75rem", color: C.muted, lineHeight: 1.5 }}>
              Ich habe die <Link href="/datenschutz" style={{ color: C.akzent }}>Datenschutzerklärung</Link> gelesen
              und bin mit der Verarbeitung meiner Daten für dieses Tippspiel einverstanden.
            </span>
          </label>
          {state === "error" && <div style={{ fontSize: "0.75rem", color: C.coral, marginTop: 6 }}>{err}</div>}
        </form>
      )}
    </div>
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
      borderRadius: RUND.karte, padding: "12px 14px",
    }}>
      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: C.text }}>Willkommen! 👋 Wie sollen wir dich nennen?</div>
      <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
        Dein Name im Leaderboard — jederzeit unter „Konto“ änderbar.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)}
          placeholder="Dein Name" style={{
            flex: 1, minWidth: 0, background: C.ink2, color: C.text, border: `1px solid ${C.line}`,
            borderRadius: RUND.karte, padding: "10px 12px", fontSize: "0.9375rem", fontFamily: "inherit", outline: "none",
          }} />
        <button type="submit" disabled={!name.trim() || state === "saving"} style={{
          cursor: name.trim() && state !== "saving" ? "pointer" : "default", background: C.akzent, color: "#FFFFFF",
          fontWeight: 700, fontSize: "0.9375rem", border: "none", borderRadius: RUND.karte, padding: "0 16px",
        }}>{state === "saving" ? "…" : "Los"}</button>
      </div>
      {state === "error" && <div style={{ fontSize: "0.75rem", color: C.coral, marginTop: 6 }}>{err}</div>}
    </form>
  );
}
