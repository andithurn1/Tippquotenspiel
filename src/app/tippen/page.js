"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Spielwahl from "@/components/Spielwahl";
import Tippabgabe from "@/components/Tippabgabe";
import { useCurrentRound } from "@/components/RoundProvider";

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
  // 🔴 `runde` kommt aus dem Mehrfach-Tipp: „In ‚Büro' anpassen" springt zu
  // DIESEM Spiel in EINER ANDEREN Runde (Andi, 29.08.2026, „sodass man
  // maximal wenig wiederholen muss").
  //
  // ⚠️ Das wechselt die aktive Runde für die ganze App, nicht nur für diesen
  // Screen — `setRoundId` merkt sie sich. Das ist gewollt: wer dort anpasst,
  // ist danach in dieser Runde, und ein Screen, der heimlich eine andere Runde
  // zeigt als das Menü, wäre schlimmer als der Wechsel.
  const runde = params.get("runde");
  const { roundId, setRoundId } = useCurrentRound();
  useEffect(() => {
    if (runde && runde !== roundId) setRoundId(runde);
  }, [runde, roundId, setRoundId]);

  // ⚠️ Solange die Runde noch nicht gewechselt ist, wird NICHT gerendert:
  // sonst lädt die Tippabgabe einen Wimpernschlag lang die alte Runde und
  // zeigt deren Regelwerk — genau die Verwechslung, die der Mehrfach-Tipp
  // vermeiden soll.
  if (runde && runde !== roundId) return null;
  return spiel ? <Tippabgabe matchId={spiel} /> : <Spielwahl />;
}

export default function TippenPage() {
  return (
    <Suspense fallback={null}>
      <Auswahl />
    </Suspense>
  );
}
