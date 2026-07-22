"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEMO_ROUND_ID } from "@/lib/constants";

// ── Aktive Runde (pro Browser) ───────────────────────────────
// Getrennt vom Regelwerk und vom Login: DEMO_ROUND_ID ist der Standard-
// Einstieg (Freundeskreis-Demo). Wer eine eigene Runde erstellt oder per
// Code beitritt, wechselt hierüber die AKTIVE Runde für Tippen/Abrechnung —
// ohne dass sich Login oder Regelwerk ändern.
const KEY = "tqs.currentRound.v1";
const Ctx = createContext({ roundId: DEMO_ROUND_ID, setRoundId: () => {}, ready: false });

export const useCurrentRound = () => useContext(Ctx);

export default function RoundProvider({ children }) {
  const [roundId, setRoundIdState] = useState(DEMO_ROUND_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setRoundIdState(stored);
    } catch { /* localStorage nicht verfügbar → Standard-Runde */ }
    setReady(true);
  }, []);

  const setRoundId = (id) => {
    setRoundIdState(id);
    try { localStorage.setItem(KEY, id); } catch { /* ignorieren */ }
  };

  return <Ctx.Provider value={{ roundId, setRoundId, ready }}>{children}</Ctx.Provider>;
}
