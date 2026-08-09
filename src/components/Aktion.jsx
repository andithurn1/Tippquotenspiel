"use client";

// ============================================================
//  AKTION — ein Link, der leuchtet, bis die nächste Seite da ist
//
//  Andis Wunsch vom 09.08.2026, wörtlich: „wenn was geklickt wird, dass dann
//  das Feld mehr leuchtet, bis neues Fenster lädt."
//
//  🔴 Warum das kein Timer ist. Der naheliegende Weg wäre: beim Klick
//  leuchten lassen und nach 400 ms aufhören. Das ist bei schneller Verbindung
//  zu lang und bei langsamer zu kurz — also immer falsch, nur unterschiedlich
//  auffällig. Next 15.3 hat dafür `useLinkStatus`: der Link weiß SELBST, dass
//  sein Ziel noch lädt. Das Leuchten hört auf, wenn die Seite da ist, nicht
//  wenn eine geratene Zahl abgelaufen ist.
//
//  ⚠️ `useLinkStatus` funktioniert nur INNERHALB eines `<Link>`. Deshalb die
//  Aufteilung in zwei Komponenten — der Zustand ist im Kind abrufbar, nicht
//  im Elternteil, das den Link rendert.
//
//  ── Was die Klassen tun (siehe `globals.css`) ──
//    `tqs-aktion`  Druck, Zeigegerät, Tastatur-Fokus — die Antwort auf eine
//                  Berührung. Beachtet „Bewegung reduzieren".
//    `tqs-laedt`   das Leuchten während des Ladens.
// ============================================================

import Link from "next/link";
import { useLinkStatus } from "next/link";

function Inhalt({ children }) {
  const { pending } = useLinkStatus();
  return (
    <span className={pending ? "tqs-laedt" : undefined}
      style={{ display: "contents" }}>{children}</span>
  );
}

// `als` erlaubt es, dasselbe Verhalten auf eine ganze Karte zu legen statt
// nur auf einen Textlink — die anklickbare Fläche ist bei uns fast immer eine
// Zeile oder Kachel, kein Wort.
export default function Aktion({ href, children, style, className = "", ...rest }) {
  return (
    <Link href={href} prefetch
      className={`tqs-aktion ${className}`.trim()}
      style={{ display: "block", textDecoration: "none", color: "inherit", ...style }}
      {...rest}>
      <Inhalt>{children}</Inhalt>
    </Link>
  );
}
