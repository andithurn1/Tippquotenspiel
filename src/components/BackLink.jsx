"use client";

import Link from "next/link";

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

// Schmaler „Zurück zur Übersicht"-Link, sitzt über der Karte jedes Screens.
// Von der Übersicht (/) sind dann alle anderen Screens erreichbar.
export default function BackLink() {
  return (
    <div style={{ width: "100%", maxWidth: 400, marginBottom: 12 }}>
      <Link href="/" style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontFamily: MONO, fontSize: 12, color: "#8A90B4", textDecoration: "none",
      }}>
        <span style={{ fontSize: 15, lineHeight: 1 }}>←</span> Übersicht
      </Link>
    </div>
  );
}
