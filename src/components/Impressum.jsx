"use client";

import Link from "next/link";
import BackLink from "@/components/BackLink";
import { LEGAL } from "@/lib/legal";
import { C, MONO, SCHRIFT, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";

// Impressum (§ 5 DDG). Angaben kommen aus legal.js — vor Launch dort ausfüllen.
export default function Impressum() {
  return (
    <div style={{
      minHeight: "100vh", background: C.ink, color: C.text,
      fontFamily: SCHRIFT,
      padding: "28px 16px", display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <BackLink href="/menu" label="Menü" />
      <div style={{
        width: "100%", maxWidth: 460, borderRadius: RUND.schirm,
        background: C.ink2, border: `1px solid ${C.line}`, padding: "26px 22px", lineHeight: 1.6,
      }}>
        <span style={{ fontFamily: MONO, fontSize: "0.75rem", letterSpacing: 2, color: C.muted, textTransform: "uppercase" }}>
          Impressum
        </span>
        <h1 style={{ fontSize: "1.375rem", fontWeight: 800, margin: "6px 0 10px" }}>Impressum</h1>

        <p style={{ fontSize: "0.75rem", color: C.muted, margin: "0 0 8px" }}>Angaben gemäß § 5 DDG</p>
        <p style={{ fontSize: "0.9375rem", color: "#D5D8EA", margin: "6px 0" }}>
          {LEGAL.betreiber}<br />
          {LEGAL.anschrift}
        </p>

        <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: "16px 0 2px" }}>Kontakt</h2>
        <p style={{ fontSize: "0.9375rem", color: "#D5D8EA", margin: "6px 0" }}>E-Mail: {LEGAL.email}</p>

        <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: "16px 0 2px" }}>Haftung & Inhalt</h2>
        <p style={{ fontSize: "0.8125rem", color: C.muted, margin: "6px 0" }}>
          {LEGAL.appName} ist ein privates Tippspiel unter Freunden ohne Echtgeld-
          oder Glücksspielcharakter. Für Inhalte externer Links wird keine Haftung
          übernommen; verantwortlich sind deren jeweilige Betreiber.
        </p>

        <div style={{ height: 1, background: C.line, margin: "18px 0" }} />
        <p style={{ fontSize: "0.75rem", color: C.muted }}>
          <Link href="/datenschutz" style={{ ...TAPZIEL, display: "inline-flex", alignItems: "center", color: C.muted, textDecoration: "underline" }}>Datenschutzerklärung</Link>
        </p>
      </div>
    </div>
  );
}
