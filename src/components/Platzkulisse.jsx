"use client";

import { C } from "@/lib/theme";

// ============================================================
//  PLATZKULISSE — Fußball-Andeutung am RAND, nicht auf der Fläche
//
//  🔴 Der Auftrag (Andi, 07.08.2026): „dezente Akzente und Ornamente in die
//  Fußball-Richtung — Rasen, Ball, Schuhe, Tor, Tornetz — aber minimalistisch
//  und eher am Rand."
//
//  ⚠️ Die Regel, an der so etwas kippt: **das Ornament darf nie mit einem
//  Signal verwechselt werden.** Die App benutzt Farbe als Bedeutung (gold =
//  dein Wert, mint = positiv, coral = Verlust). Ein grüner Rasen mitten im
//  Bild wäre ein Farbfleck, den man liest, bevor man die Zahlen liest.
//  Deshalb:
//   - eigene, sehr blasse Tokens (`rasen`, `rasenLinie`, `netz`) — nie die
//     Signalfarben;
//   - `position: fixed` GANZ HINTEN und `pointerEvents: none`, damit nichts
//     davon anklickbar ist oder den Inhalt verschiebt;
//   - nur oben und unten am Rand, die Mitte bleibt leer.
//
//  ⚠️ `aria-hidden`: reine Dekoration. Ein Screenreader, der „Tornetz" vorliest,
//  erzählt von etwas, das keine Information trägt.
//
//  Reines SVG, keine Bilddatei — dadurch skaliert es auf jedem Gerät, kostet
//  keinen zusätzlichen Abruf und färbt sich über die Tokens mit.
// ============================================================
export default function Platzkulisse() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        overflow: "hidden",
      }}>
      {/* ── Oben: die Andeutung eines Tornetzes ────────────── */}
      <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="none"
        style={{ position: "absolute", top: 0, left: 0, opacity: 0.9 }}>
        <defs>
          <pattern id="tornetz" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M0 0 L14 14 M14 0 L0 14" stroke={C.netz} strokeWidth="1" fill="none" />
          </pattern>
          {/* Nach unten auslaufen lassen — eine harte Kante sähe aus wie ein
              Fehler im Layout, nicht wie eine Andeutung. */}
          <linearGradient id="netzVerlauf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="netzMaske">
            <rect width="400" height="120" fill="url(#netzVerlauf)" />
          </mask>
        </defs>
        <rect width="400" height="120" fill="url(#tornetz)" mask="url(#netzMaske)" />
      </svg>

      {/* ── Unten: Rasenstreifen mit einer Kreidelinie ─────── */}
      <svg width="100%" height="150" viewBox="0 0 400 150" preserveAspectRatio="none"
        style={{ position: "absolute", bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="rasenVerlauf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.rasen} stopOpacity="0" />
            <stop offset="100%" stopColor={C.rasen} stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect width="400" height="150" fill="url(#rasenVerlauf)" />
        {/* Die Mittelkreis-Andeutung: nur der obere Bogen, der Rest liegt
            ausserhalb. Ein ganzer Kreis wäre ein Objekt; ein Bogen ist eine
            Andeutung. */}
        <circle cx="200" cy="215" r="86" fill="none" stroke={C.rasenLinie} strokeWidth="1.5" />
        <line x1="0" y1="129" x2="400" y2="129" stroke={C.rasenLinie} strokeWidth="1.5" />
      </svg>
    </div>
  );
}
