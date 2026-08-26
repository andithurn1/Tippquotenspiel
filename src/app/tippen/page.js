"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Spielwahl from "@/components/Spielwahl";
import Tippabgabe from "@/components/Tippabgabe";

// ============================================================
//  EINE Seite für Spielwahl UND Tippabgabe (26.08.2026)
//
//  🔴 Warum: die native App (Capacitor) braucht einen STATISCHEN Export, und
//  der verträgt keine dynamische Route ohne Vorab-Liste. `/tippen/[matchId]`
//  war die einzige im ganzen Projekt.
//
//  ⚠️ Die naheliegende Lösung wäre `generateStaticParams` gewesen — und die
//  wäre falsch: der Katalog trägt **1 943 Spiele**, es entstünden 1 943
//  HTML-Dateien, und bei jedem neuen Spielplan wieder. Gemessen, nicht
//  geschätzt.
//
//  Stattdessen ein Suchparameter: `/tippen?spiel=bl26-md1-fcb-vfb`. Eine
//  Seite, kein Vorab-Rendern, und für den Nutzer ändert sich nichts außer der
//  Adresse. Das Blättern aus KT5 schiebt ohnehin nur die Adresse um.
//
//  ⚠️ Alte Adressen (`/tippen/<id>`) leitet `netlify.toml` um — die Route
//  selbst darf es nicht mehr geben, sonst blockiert sie den Export weiter.
//
//  ⚠️ `useSearchParams` verlangt eine Suspense-Grenze, sonst verweigert der
//  Build das statische Rendern der Seite. Der Lade-Zweig ist deshalb keine
//  Höflichkeit, sondern Bedingung.
// ============================================================

function Auswahl() {
  const params = useSearchParams();
  const spiel = params.get("spiel");
  return spiel ? <Tippabgabe matchId={spiel} /> : <Spielwahl />;
}

export default function TippenPage() {
  return (
    <Suspense fallback={null}>
      <Auswahl />
    </Suspense>
  );
}
