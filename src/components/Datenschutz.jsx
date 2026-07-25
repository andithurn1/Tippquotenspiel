"use client";

import Link from "next/link";
import BackLink from "@/components/BackLink";
import { LEGAL, DATA_POINTS } from "@/lib/legal";
import { C, MONO } from "@/lib/theme";

// Datenschutzerklärung (Art. 13/14 DSGVO). Bewusst schlank gehalten, weil die
// App bewusst wenig verarbeitet. Kontakt-/Betreiberangaben kommen aus legal.js.
export default function Datenschutz() {
  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div style={{
        width: "100%", maxWidth: 460, borderRadius: 20,
        background: C.ink2, border: `1px solid ${C.line}`, padding: "26px 22px", lineHeight: 1.6,
      }}>
        <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Datenschutz
        </span>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 4px" }}>Datenschutzerklärung</h1>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 0 }}>Stand: {LEGAL.stand}</p>

        <P>
          Uns ist der Schutz deiner Daten wichtig. {LEGAL.appName} ist ein Tippspiel
          unter Freunden <b>ohne Echtgeld</b>. Wir verarbeiten bewusst so wenige
          personenbezogene Daten wie möglich und nutzen sie <b>ausschließlich</b>,
          um die App bereitzustellen — <b>kein Tracking, keine Werbung, kein Verkauf
          von Daten</b>.
        </P>

        <H>1. Verantwortlicher</H>
        <P>
          {LEGAL.betreiber}<br />{LEGAL.anschrift}<br />
          E-Mail: {LEGAL.email}
        </P>

        <H>2. Welche Daten wir verarbeiten</H>
        <ul style={{ margin: "6px 0", paddingLeft: 18 }}>
          {DATA_POINTS.map((d) => (
            <li key={d.key} style={{ fontSize: 13.5, marginBottom: 6 }}>
              <b>{d.label}:</b> <span style={{ color: C.muted }}>{d.zweck}</span>
            </li>
          ))}
        </ul>

        <H>3. Rechtsgrundlage</H>
        <P>
          Die Verarbeitung erfolgt zur Erfüllung des Nutzungsvertrags
          (Art. 6 Abs. 1 lit. b DSGVO) — ohne diese Daten kann die App ihren
          Zweck (Login, Tipps, Rangliste) nicht erfüllen.
        </P>

        <H>4. Hosting & Auftragsverarbeiter</H>
        <P>
          Zur Bereitstellung setzen wir Dienstleister ein, die Daten in unserem
          Auftrag verarbeiten: <b>{LEGAL.hoster}</b> und <b>{LEGAL.datenbank}</b>.
          Mit diesen bestehen Verträge zur Auftragsverarbeitung; die Speicherung
          der Konto- und Spieldaten erfolgt in der EU-Region.
        </P>

        <H>5. Speicherung im Browser</H>
        <P>
          Wir verwenden <b>keine Werbe- oder Tracking-Cookies</b>. Für den Betrieb
          nötig ist lediglich lokale Speicherung (localStorage): deine
          Login-Sitzung (damit du <b>dauerhaft eingeloggt</b> bleibst) sowie deine
          persönlichen Anzeige-Einstellungen und die zuletzt gewählte Runde.
          Diese Daten verlassen dein Gerät nicht zu Werbezwecken.
        </P>

        <H>6. Speicherdauer</H>
        <P>
          Wir speichern deine Daten, solange dein Konto besteht. Löschst du dein
          Konto, werden Profil, Tipps und Mitgliedschaften unwiderruflich entfernt.
        </P>

        <H>7. Deine Rechte</H>
        <P>
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung,
          Datenübertragbarkeit und Widerspruch sowie das Recht, dich bei einer
          Aufsichtsbehörde zu beschweren. Auskunft (Export) und Löschung kannst du
          jederzeit selbst unter <Link href="/konto" style={{ color: C.gold }}>Mein Konto</Link> auslösen.
        </P>

        <div style={{ height: 1, background: C.line, margin: "18px 0" }} />
        <p style={{ fontSize: 12, color: C.muted }}>
          <Link href="/impressum" style={{ color: C.muted, textDecoration: "underline" }}>Impressum</Link>
        </p>
      </div>
    </div>
  );
}

function H({ children }) {
  return <h2 style={{ fontSize: 15, fontWeight: 700, margin: "18px 0 2px" }}>{children}</h2>;
}
function P({ children }) {
  return <p style={{ fontSize: 13.5, color: "#D5D8EA", margin: "6px 0" }}>{children}</p>;
}
