"use client";
// Das Profil eines Mitspielers, erreichbar aus der Rangliste.
// Andi, 29.08.2026: „in den einzelnen Ranglisten je Tipprunde soll das Profil
// des anderen angezeigt werden, wo man eben auch Trophäenschrank plus
// Beschreibung einsehen kann".
//
// ⚠️ `useSearchParams` verlangt eine Suspense-Grenze — sonst verweigert der
// Build das statische Rendern der Seite. Dieselbe Konstruktion wie `/tippen`.
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Spielerkarte from "@/components/Spielerkarte";

function Auswahl() {
  const params = useSearchParams();
  return <Spielerkarte userId={params.get("id")} />;
}

export default function SpielerPage() {
  return (
    <Suspense fallback={null}>
      <Auswahl />
    </Suspense>
  );
}
