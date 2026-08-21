"use client";

import Link from "next/link";
import { C, MONO } from "@/lib/theme";

// „Zurück"-Link über der Karte jedes Screens. Zeigt standardmäßig auf die
// Übersicht (/); einzelne Screens geben ein näherliegendes Ziel an.
//
// 🔴 GEMESSEN am 07.08.2026 auf dem iPhone: der Knopf war 12 px hoch und mit
// dem Daumen kaum zu treffen — Andis erster Befund beim Anlegen einer Runde
// („oben links auf Menü drücken funktioniert nicht"). Jetzt **48 px**, wie
// Google es verlangt; Apple fordert 44 pt.
//
// ⚠️ Die Größe steckt in der FLÄCHE (`minHeight` + Polsterung), nicht in der
// Schrift. Ein größerer Text allein vergrößert das Tippziel nicht — das ist
// der Fehler, den man beim Nachbessern zuerst macht. Der negative Rand links
// zieht die sichtbare Kante wieder an den Seitenrand, damit die Polsterung
// den Aufbau nicht verschiebt.
//
// ⚠️ Diese Datei sitzt über JEDEM Screen — die Korrektur wirkt überall.
// Deshalb hier und nicht in der Spielerstellung.
export default function BackLink({ href = "/", label = "Übersicht" }) {
  return (
    <div style={{ width: "100%", maxWidth: 400, marginBottom: 6 }}>
      <Link href={href} style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        minHeight: 48, padding: "0 14px", marginLeft: -14, borderRadius: 12,
        fontFamily: MONO, fontSize: 15, color: C.text, textDecoration: "none",
        WebkitTapHighlightColor: "transparent",
      }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>←</span> {label}
      </Link>
    </div>
  );
}
