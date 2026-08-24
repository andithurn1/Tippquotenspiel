"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { C, MONO, RUND } from "@/lib/theme";
import { TAPZIEL } from "@/lib/tapziel";
import { schonDagewesen, merkeBesuch, ERSTKONTAKT_WEGE } from "@/lib/erstkontakt";

// ============================================================
//  ERSTKONTAKT — die Begrüßung beim allerersten Start (G5)
//
//  🔴 Andis fünfte Gestaltungs-Ansage vom 09.08.2026. Bis zum 24.08. sah jeder
//  Start gleich aus: eine Liste mit einer Demo-Runde darin, und wer zum ersten
//  Mal öffnet, muss selbst herausfinden, ob das seine Runde ist.
//
//  ⚠️ **Kein Tutorial.** Andi am 24.08.2026: „das Tutorial machen wir erst,
//  wenn das User Interface steht." Das hier beantwortet EINE Frage — „was mache
//  ich jetzt?" — mit drei Wegen und verschwindet danach für immer.
//
//  ── 🔴 Warum eine Karte OBEN und kein Fenster davor ──
//  Ein Fenster über dem Screen müsste weggeklickt werden, bevor man überhaupt
//  sieht, was dahinter liegt — und der häufigste Fall ist trotzdem, dass jemand
//  einen Code bekommen hat und einfach loslegen will. Die Karte steht deshalb
//  ÜBER der Liste, nicht DAVOR: sie erklärt, ohne den Weg zu versperren.
//
//  ── ⚠️ Der Wackler beim ersten Bild ──
//  `schonDagewesen()` liest `localStorage`, und das gibt es beim Rendern auf
//  dem Server nicht. Würde die Karte sofort gezeichnet, spränge sie beim ersten
//  Bild sichtbar weg (dieselbe Falle wie beim Runden-Provider). Deshalb `null`,
//  bis der Browser geantwortet hat — lieber einen Wimpernschlag nichts als ein
//  Aufblitzen.
// ============================================================

export default function Erstkontakt() {
  // `null` = noch nicht entschieden, siehe Kopfkommentar.
  const [zeigen, setZeigen] = useState(null);

  useEffect(() => {
    const neu = !schonDagewesen();
    setZeigen(neu);
    // 🔴 Beim ANSEHEN merken, nicht beim Wegklicken. Sonst käme die Begrüßung
    // bei jedem Start wieder, bis jemand den richtigen Knopf trifft.
    if (neu) merkeBesuch();
  }, []);

  if (!zeigen) return null;

  return (
    <div className="tqs-auf" style={{
      width: "100%", maxWidth: "var(--tqs-schirm-breite)", marginBottom: 14,
      background: `radial-gradient(120% 120% at 50% -20%, ${C.akzent}18 0%, ${C.surface} 100%)`,
      border: `1px solid ${C.akzent}55`, borderRadius: RUND.karte, padding: "16px 16px 14px",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.6875rem", letterSpacing: 1.4, color: C.akzent,
        textTransform: "uppercase", marginBottom: 6,
      }}>Willkommen</div>

      <div style={{ fontSize: "1.25rem", fontWeight: 800, lineHeight: 1.25 }}>
        Quoten-Tippspiel unter Freunden
      </div>
      <p style={{ fontSize: "0.9375rem", color: C.muted, margin: "6px 0 14px", lineHeight: 1.5 }}>
        Wer aus einer unwahrscheinlichen Lage richtig liegt, bekommt mehr.
        Kein Echtgeld — Ehre und ein Wichtelgeschenk.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ERSTKONTAKT_WEGE.map((w) => (
          <Link key={w.key} href={w.ziel} className="tqs-aktion" style={{
            display: "block", textDecoration: "none", color: C.text,
            background: C.ink2, border: `1px solid ${C.line}`, borderRadius: RUND.karte,
            padding: "12px 14px", ...TAPZIEL,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{w.icon}</span>
              <span style={{ fontSize: "0.9375rem", fontWeight: 700, flex: 1 }}>{w.titel}</span>
              <span style={{ color: C.sky, fontSize: "0.9375rem" }}>›</span>
            </div>
            <div style={{ fontSize: "0.8125rem", color: C.muted, marginTop: 4, lineHeight: 1.45 }}>
              {w.text}
            </div>
          </Link>
        ))}
      </div>

      {/* ⚠️ Kein „Schließen"-Knopf: die Karte ist schon gemerkt und kommt beim
          nächsten Start ohnehin nicht wieder. Ein Knopf, der nur das
          wiederholt, was von selbst passiert, ist eine Entscheidung, die
          niemand treffen muss. */}
      <div style={{ fontSize: "0.6875rem", color: C.muted, marginTop: 10, opacity: 0.8 }}>
        Diese Begrüßung siehst du nur einmal.
      </div>
    </div>
  );
}
