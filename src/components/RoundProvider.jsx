"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { DEMO_ROUND_ID } from "@/lib/constants";
import { getStore } from "@/lib/store";

// ── Aktive Runde (pro Browser) ───────────────────────────────
// Getrennt vom Regelwerk und vom Login: DEMO_ROUND_ID ist der Standard-
// Einstieg (Freundeskreis-Demo). Wer eine eigene Runde erstellt oder per
// Code beitritt, wechselt hierüber die AKTIVE Runde für Tippen/Abrechnung —
// ohne dass sich Login oder Regelwerk ändern.
//
// 🔴 **Die gespeicherte Runde wird GEPRÜFT, bevor sie gilt** (24.08.2026).
// Gefunden beim Gerüst-Durchgang: eine Runde anlegen, Seite neu laden — und
// die App stand auf einer Runde, die es nicht mehr gab. Sichtbar wurde das als
// „Runde: …" in der Abrechnung, als leere Spielliste beim Tippen und als
// Ranking ohne Zeilen. **Nirgends stand, was los ist**, und nichts führte
// zurück; der Weg hinaus war, im Menü von Hand eine andere Runde zu wählen.
//
// ⚠️ Im Demo-Betrieb passiert das bei jedem vollen Seitenwechsel, weil der
// Mock-Store im Arbeitsspeicher lebt (docs/werkzeug-fallen.md). **Live ist es
// seltener, aber nicht ausgeschlossen:** eine gelöschte Runde, ein Gerät ohne
// Zugriff, ein Beitritt, der zurückgenommen wurde. Der Fall gehört also
// behandelt, nicht wegdiskutiert.
//
// ⚠️ `verwaist` wird MITGEGEBEN statt still geschluckt: ein Screen, der
// kommentarlos auf die Demo-Runde springt, sieht aus wie ein verlorener
// Klick. Wer die Auskunft zeigen will, liest das Flag.
const KEY = "tqs.currentRound.v1";
const Ctx = createContext({
  roundId: DEMO_ROUND_ID, setRoundId: () => {}, ready: false, verwaist: null,
});

export const useCurrentRound = () => useContext(Ctx);

export default function RoundProvider({ children }) {
  const [roundId, setRoundIdState] = useState(DEMO_ROUND_ID);
  const [ready, setReady] = useState(false);
  // Die Id, die gespeichert war und nicht mehr aufzulösen ist — `null`, solange
  // alles in Ordnung ist.
  const [verwaist, setVerwaist] = useState(null);

  useEffect(() => {
    let live = true;
    let stored = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch { /* localStorage nicht verfügbar → Standard-Runde */ }

    if (!stored || stored === DEMO_ROUND_ID) { setReady(true); return; }

    // ⚠️ Erst NACH der Prüfung gilt sie. Sie vorab zu setzen und bei einem
    // Fehlschlag zurückzunehmen, ließe die Screens einmal mit der toten Id
    // laden — genau die leeren Listen, um die es hier geht.
    getStore().getRound(stored)
      .then((r) => {
        if (!live) return;
        if (r) { setRoundIdState(stored); }
        else {
          setVerwaist(stored);
          // Die tote Id auch WEGRÄUMEN, sonst wiederholt sich der Hinweis bei
          // jedem Start, ohne dass jemand etwas dagegen tun kann.
          try { localStorage.removeItem(KEY); } catch { /* ignorieren */ }
        }
      })
      // Ein Netzfehler ist etwas anderes als eine gelöschte Runde: hier NICHT
      // aufräumen, sonst verliert ein kurzer Aussetzer die Rundenwahl.
      .catch(() => { if (live) setRoundIdState(stored); })
      .finally(() => { if (live) setReady(true); });

    return () => { live = false; };
  }, []);

  const setRoundId = (id) => {
    setRoundIdState(id);
    setVerwaist(null);
    try { localStorage.setItem(KEY, id); } catch { /* ignorieren */ }
  };

  return (
    <Ctx.Provider value={{ roundId, setRoundId, ready, verwaist }}>
      {children}
    </Ctx.Provider>
  );
}
