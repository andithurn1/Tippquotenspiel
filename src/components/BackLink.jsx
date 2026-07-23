"use client";

import Link from "next/link";

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

// Schmaler „Zurück"-Link, sitzt über der Karte jedes Screens. Zeigt standardmäßig
// auf die Übersicht (/); einzelne Screens können ein näherliegendes Ziel angeben
// (z.B. die Spielwahl statt gleich der ganz Übersicht).
export default function BackLink({ href = "/", label = "Übersicht" }) {
  return (
    <div style={{ width: "100%", maxWidth: 400, marginBottom: 12 }}>
      <Link href={href} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: MONO, fontSize: 12, color: "#8A90B4", textDecoration: "none",
      }}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>←</span> {label}
      </Link>
    </div>
  );
}
