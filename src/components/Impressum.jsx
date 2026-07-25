"use client";

import Link from "next/link";
import BackLink from "@/components/BackLink";
import { LEGAL } from "@/lib/legal";
import { C, MONO } from "@/lib/theme";

// Impressum (§ 5 DDG). Angaben kommen aus legal.js — vor Launch dort ausfüllen.
export default function Impressum() {
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
          Impressum
        </span>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 10px" }}>Impressum</h1>

        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 8px" }}>Angaben gemäß § 5 DDG</p>
        <p style={{ fontSize: 14, color: "#D5D8EA", margin: "6px 0" }}>
          {LEGAL.betreiber}<br />
          {LEGAL.anschrift}
        </p>

        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 2px" }}>Kontakt</h2>
        <p style={{ fontSize: 14, color: "#D5D8EA", margin: "6px 0" }}>E-Mail: {LEGAL.email}</p>

        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 2px" }}>Haftung & Inhalt</h2>
        <p style={{ fontSize: 13, color: C.muted, margin: "6px 0" }}>
          {LEGAL.appName} ist ein privates Tippspiel unter Freunden ohne Echtgeld-
          oder Glücksspielcharakter. Für Inhalte externer Links wird keine Haftung
          übernommen; verantwortlich sind deren jeweilige Betreiber.
        </p>

        <div style={{ height: 1, background: C.line, margin: "18px 0" }} />
        <p style={{ fontSize: 12, color: C.muted }}>
          <Link href="/datenschutz" style={{ color: C.muted, textDecoration: "underline" }}>Datenschutzerklärung</Link>
        </p>
      </div>
    </div>
  );
}
